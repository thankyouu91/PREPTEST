/**
 * ElevenLabs text to speech.
 *
 * The one place in the platform that talks to ElevenLabs. Swapping provider is
 * a new file beside this one implementing `synthesize()` — nothing upstream
 * knows which service produced the bytes.
 *
 * Two decisions worth keeping in view, both from docs/VOICE.md:
 *
 *   · The output format is mp3_44100_128, which is exactly what
 *     server/storage.js already accepts. The bytes go straight into the
 *     existing storage adapter with no conversion step anywhere.
 *
 *   · This is never called while a candidate is sitting an exam. Audio is
 *     rendered when an item is authored and played from storage during the
 *     exam, so a slow or unavailable ElevenLabs delays an admin, never a
 *     candidate.
 *
 * `fetch` is used directly rather than the vendor SDK: this project has one
 * dependency and the REST surface needed here is three endpoints.
 */
'use strict';

const API = 'https://api.elevenlabs.io/v1';

/* Requests are small (a few kB of text) but the render itself takes seconds for
   a long passage. Long enough not to abandon real work, short enough that a
   hung connection does not pin an admin request forever. */
const TIMEOUT_MS = 120000;

/* Pinned so a change to the provider's default model cannot silently re-voice
   the whole item bank. Overridable per deployment; see docs/VOICE.md 4.4. */
const DEFAULT_MODEL = process.env.ELEVENLABS_MODEL || 'eleven_multilingual_v2';

/* 44.1 kHz / 128 kbps MP3 — matches storage.ACCEPTED_MIME and looksLikeMp3. */
const OUTPUT_FORMAT = 'mp3_44100_128';

/* Delivery speed (owner, 2026-08-12: "nhanh tầm 1.25 so với bình thường").
   ---------------------------------------------------------------------------
   1.25 is not available. ElevenLabs accepts `speed` between 0.7 and 1.2 and
   rejects anything outside it, so the fastest the API will go is 1.2 — which
   is what DEFAULT_SPEED asks for, and clampSpeed() is what stops a request
   being built that the provider will refuse. The difference between 1.2 and
   1.25 is about four per cent, roughly one word in a twenty-five-word
   sentence, and it is not audible next to the pause changes shipped with it.

   Going faster than the API allows would mean re-timing the MP3 after the
   fact, which needs a resampling dependency and degrades the audio. Not worth
   four per cent on an exam recording. */
const SPEED_MIN = 0.7;
const SPEED_MAX = 1.2;
const DEFAULT_SPEED = 1.2;

/** Bring a requested speed inside what the provider accepts. */
function clampSpeed(v) {
  const n = Number(v);
  if (!Number.isFinite(n)) return DEFAULT_SPEED;
  return Math.min(SPEED_MAX, Math.max(SPEED_MIN, n));
}

class ProviderError extends Error {
  constructor(message, { status = 0, retryable = false, code = 'PROVIDER' } = {}) {
    super(message);
    this.name = 'ProviderError';
    this.status = status;
    this.retryable = retryable;
    this.code = code;
  }
}

/**
 * Turn a failed response into an error an administrator can act on.
 *
 * The provider's own message is often a JSON blob about a field name, which
 * helps nobody looking at the question bank. What they need to know is whether
 * to fix the key, wait, top up the account, or shorten the script.
 */
async function explain(res) {
  let detail = '';
  try {
    const body = await res.text();
    const parsed = JSON.parse(body);
    detail = parsed?.detail?.message || parsed?.detail?.status || parsed?.message || body.slice(0, 300);
  } catch (e) { /* non-JSON body; the status alone will have to do */ }

  if (res.status === 401) {
    return new ProviderError('ElevenLabs rejected the API key. Check it in Settings → Integrations.',
      { status: 401, code: 'AUTH' });
  }
  if (res.status === 402 || /quota|credit/i.test(detail)) {
    return new ProviderError('ElevenLabs character quota is exhausted for this billing period.',
      { status: res.status, code: 'QUOTA' });
  }
  if (res.status === 422) {
    return new ProviderError(`ElevenLabs could not read the script: ${detail}`,
      { status: 422, code: 'SCRIPT' });
  }
  if (res.status === 429) {
    return new ProviderError('ElevenLabs is rate limiting. The job will be retried.',
      { status: 429, retryable: true, code: 'RATE' });
  }
  if (res.status >= 500) {
    return new ProviderError('ElevenLabs is having trouble. The job will be retried.',
      { status: res.status, retryable: true, code: 'UPSTREAM' });
  }
  return new ProviderError(`ElevenLabs returned ${res.status}: ${detail}`, { status: res.status });
}

async function call(path, { apiKey, method = 'GET', body, accept = 'application/json' }) {
  if (!apiKey) {
    throw new ProviderError('No ElevenLabs API key is configured. Add one in Settings → Integrations.',
      { code: 'NOKEY' });
  }

  const ctl = new AbortController();
  const timer = setTimeout(() => ctl.abort(), TIMEOUT_MS);
  let res;
  try {
    res = await fetch(API + path, {
      method,
      signal: ctl.signal,
      headers: {
        'xi-api-key': apiKey,
        accept,
        ...(body ? { 'content-type': 'application/json' } : {})
      },
      body: body ? JSON.stringify(body) : undefined
    });
  } catch (e) {
    /* An abort here is our own timeout, not a provider decision — worth saying
       so, because "timed out" and "refused" lead to different fixes. */
    if (e.name === 'AbortError') {
      throw new ProviderError('ElevenLabs did not respond in time. The job will be retried.',
        { retryable: true, code: 'TIMEOUT' });
    }
    throw new ProviderError(`Could not reach ElevenLabs: ${e.message}`, { retryable: true, code: 'NETWORK' });
  } finally {
    clearTimeout(timer);
  }

  if (!res.ok) throw await explain(res);
  return res;
}

/**
 * Render one script to MP3.
 *
 * @param {object} input
 * @param {string} input.apiKey
 * @param {string} input.text      break tags included, from script-markup.parseScript
 * @param {string} input.voiceId
 * @param {string} [input.modelId]
 * @param {object} [input.settings] stability / similarity_boost / style /
 *                                   use_speaker_boost / speed (0.7-1.2)
 * @param {number} [input.seed]     pin for a reproducible render
 * @returns {Promise<{mp3: Buffer, chars: number, ms: number, modelId: string, seed: number|null}>}
 */
async function synthesize(input) {
  const { apiKey, text, voiceId } = input;
  if (!text || !text.trim()) throw new ProviderError('The script is empty.', { code: 'SCRIPT' });
  if (!voiceId) throw new ProviderError('No voice was selected for this item.', { code: 'VOICE' });

  const modelId = input.modelId || DEFAULT_MODEL;
  const started = Date.now();

  const res = await call(
    `/text-to-speech/${encodeURIComponent(voiceId)}?output_format=${OUTPUT_FORMAT}`,
    {
      apiKey,
      method: 'POST',
      accept: 'audio/mpeg',
      body: {
        text,
        model_id: modelId,
        voice_settings: Object.assign(
          { stability: 0.5, similarity_boost: 0.75, style: 0, use_speaker_boost: true },
          input.settings || {},
          /* Clamped last so it overrides whatever the caller sent. A speed the
             API rejects fails the whole render, and an author who typed 1.5
             wanted "as fast as this goes" rather than an error. */
          { speed: clampSpeed(input.settings && input.settings.speed) }),
        ...(Number.isInteger(input.seed) ? { seed: input.seed } : {})
      }
    });

  const mp3 = Buffer.from(await res.arrayBuffer());

  /* The provider answered 200 but sent something that is not an MP3. Catch it
     here rather than letting storage reject it later with a message about
     magic bytes that means nothing to the person who pressed Render. */
  if (mp3.length < 512) {
    throw new ProviderError('ElevenLabs returned an empty audio file.', { retryable: true, code: 'EMPTY' });
  }

  return {
    mp3,
    chars: text.length,
    ms: Date.now() - started,
    modelId,
    seed: Number.isInteger(input.seed) ? input.seed : null
  };
}

/** The account's voices, trimmed to what the casting screen needs. */
async function listVoices(apiKey) {
  const res = await call('/voices', { apiKey });
  const data = await res.json();
  return (data.voices || []).map(v => ({
    voiceId: v.voice_id,
    name: v.name,
    /* Labels are free-form on ElevenLabs' side; accent and gender are the two
       that matter for casting an exam (docs/VOICE.md 4.3). */
    accent: (v.labels && v.labels.accent) || '',
    gender: (v.labels && v.labels.gender) || '',
    category: v.category || ''
  }));
}

/**
 * Characters remaining this period.
 *
 * Surfaced in the admin screen so a batch render can be stopped before it eats
 * the month's quota rather than after.
 */
async function quota(apiKey) {
  const res = await call('/user/subscription', { apiKey });
  const d = await res.json();
  const used = Number(d.character_count || 0);
  const limit = Number(d.character_limit || 0);
  return {
    used,
    limit,
    remaining: Math.max(0, limit - used),
    tier: d.tier || '',
    resetsAt: d.next_character_count_reset_unix
      ? new Date(d.next_character_count_reset_unix * 1000).toISOString() : null
  };
}

/** Cheap round trip for the "Test connection" button. */
async function ping(apiKey) {
  const info = await quota(apiKey);
  return { ok: true, detail: `${info.remaining.toLocaleString('en-US')} characters left`, quota: info };
}

module.exports = {
  synthesize, listVoices, quota, ping, ProviderError,
  DEFAULT_MODEL, OUTPUT_FORMAT,
  clampSpeed, SPEED_MIN, SPEED_MAX, DEFAULT_SPEED
};
