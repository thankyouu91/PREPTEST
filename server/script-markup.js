/**
 * Audio script markup — turning an author's plain text into timed speech.
 *
 * An author writes an exam script the way they would write anything else, and
 * three characters control the pacing:
 *
 *     ,  ;  :  "     short pause   (default 300 ms)
 *     .  !  ?        long pause    (default 800 ms)
 *     _              segment gap   (default 1500 ms, 1-2 s as specified)
 *
 * Every script also opens with one second of silence before the first word,
 * and is rendered fast — 1.25x through Kokoro, clamped to 1.2x if the hosted
 * ElevenLabs path is used instead. Both are owner decisions from 2026-08-12
 * and both are explained at DEFAULTS below.
 *
 * The punctuation stays in the text. Removing it would strip the model of the
 * prosody cues it reads best, so the marks are kept AND an explicit break is
 * emitted after them — the sentence still sounds like a sentence, and the gap
 * is the same length on every render. That determinism is the whole point:
 * two candidates sitting the same form must hear identical audio, and pauses
 * left to the model's discretion are not identical.
 *
 * `_` is different: it is not natural punctuation, so it is removed from the
 * spoken text entirely and replaced by a gap. It is what separates a dictation
 * sentence from the next one, or a story from its question.
 *
 * Explicit durations are available where an author needs one: `_2s`, `_800ms`.
 *
 * ---------------------------------------------------------------------------
 * Why the apostrophe is NOT a pause character
 *
 * The brief asked for `,` and `'`. An apostrophe and a single closing quote are
 * the same character, and English contractions are full of them: treating `'`
 * as a break turns "don't" into "don" — pause — "t", on every contraction in
 * the bank. Double quotes are safe and are handled; single quotes are left
 * alone deliberately. Authors who want a pause at a quote can type a comma.
 * ---------------------------------------------------------------------------
 *
 * TWO RENDERERS, TWO WAYS OF SPENDING `segments`
 *
 * `text` carries `<break time="0.3s" />` tags for ElevenLabs, whose v2 models
 * honour them: one request per script, no splicing.
 *
 * `segments` carries the same thing as data — an ordered list of speech runs
 * and pauses — and that is what the Kokoro path uses
 * (scripts/dung-audio-kokoro.mjs). Kokoro is not an SSML engine and will read
 * a break tag out loud, so it gets the list and the silence is spliced in
 * locally. That turns out to be the better half of the two: a spliced pause is
 * exactly the requested length on every render, while a tag is a request the
 * model interprets.
 *
 * Both consume the same parse. Neither knows about the other.
 * See docs/VOICE.md section 4 and tools/kokoro/README.md.
 */
'use strict';

/* Defaults in milliseconds. Overridable per call so a dictation part can run
   slower than a conversation without a second copy of this file. */
const DEFAULTS = {
  /* One second of silence before the first word (owner, 2026-08-12).
     ---------------------------------------------------------------------
     This is not padding. A candidate hits play and their attention arrives a
     beat later; without a lead-in the first two or three words land while
     they are still settling, and in part E — where the whole item is one
     dictated sentence — those words are the item. Everyone who missed them
     spends a replay, which is a scored resource.

     It lives here rather than in the player because the silence has to be
     inside the MP3: a delay added at playback would not survive the file
     being downloaded, cached, or played by anything but our own page. */
  leadIn: 1000,

  /* Raised from 250/600 (owner, 2026-08-12): the pause after a comma and a
     full stop has to be clearly audible. Two reasons it matters more here
     than in ordinary narration — the voice now runs at 1.2x, so the words
     around a pause are shorter and a brief silence reads as a stumble
     rather than a boundary; and in a listening exam the pause is what tells
     a candidate a clause has ended, which is information they are being
     tested on. Silence does not stretch with the speed setting, so keeping
     the rhythm meant lengthening it by hand. */
  short: 300,
  long: 800,
  segment: 1500,
  /* ElevenLabs rejects breaks longer than 3 s, and stacking many long ones
     makes some models drift. Cap here rather than discovering it in a 502. */
  maxBreakMs: 3000,
  /* Above this many breaks the model starts to wander. Past the limit we keep
     the punctuation and drop the explicit tags — the audio is still correct,
     just paced by the model instead of by us. */
  maxBreaks: 60,

  /* Delivery speed the audio will be rendered at, used only to keep the
     duration estimate honest — the request itself carries it in voice_settings
     (server/providers/elevenlabs.js). At 1.2x a passage is a sixth shorter,
     and an author fitting part G into a six-minute section needs the estimate
     to know that. Kept in step with the provider's DEFAULT_SPEED. */
  speed: 1.2
};

/* Speaking rate used for duration estimates, at speed 1.0.
   ---------------------------------------------------------------------------
   Measured, not assumed. This was 14 — 140 words a minute at six characters a
   word — which is a reasonable figure for a person and turned out to be 21%
   slow for the voice actually used. Every part's estimate ran long by about a
   fifth, which is the direction that hides a problem rather than raising a
   false alarm: a part whose audio really does overrun its clock would have
   looked fine.

   17.0 comes from 70 rendered items: total characters over total speaking
   time, with the lead-in and every spliced pause subtracted so only speech is
   counted, then divided by the 1.25 rate they were rendered at.

   Recalibrate when the voice changes. `npm run soat-de` prefers the measured
   duration from tts_renders wherever a render exists, so this figure only
   matters for scripts nobody has built yet — which is exactly when an author
   needs it. */
const CHARS_PER_SECOND = 17;

/* The rate the MP3s in the bank are actually built at.
   ---------------------------------------------------------------------------
   Not the same number as DEFAULTS.speed above, and the difference is not a
   mistake in either. 1.2 is ElevenLabs' hard ceiling — `clampSpeed()` will not
   send more, and a test pins the preview to it. Kokoro has no such ceiling, so
   `scripts/dung-audio-kokoro.mjs` renders at the 1.25 the owner asked for, and
   the 17 above was itself derived by dividing out that 1.25.

   It lives here so the auditor and the renderer read one figure. They were
   reading two, four per cent apart: `soat-de-vpet.mjs` estimated at 1.2 while
   the files were built at 1.25. That only shows on scripts nobody has rendered
   yet — the auditor prefers a measured duration wherever one exists — which is
   exactly the moment an author is deciding whether a new part G passage fits
   its clock, and the moment a wrong figure costs the most. */
const BUILD_SPEED = 1.25;

const SHORT_MARKS = new Set([',', ';', ':', '"', '”']);   // incl. curly close quote
const LONG_MARKS = new Set(['.', '!', '?', '…']);         // incl. ellipsis

/**
 * Is this `.` the end of a sentence, or part of something else?
 *
 * Three cases that must not trigger a long pause: a decimal (3.5), an
 * abbreviation (Mr. Nguyen, i.e.), and an initial (J. K. Rowling). The test is
 * deliberately conservative — a missed pause is a small prosody loss, while a
 * spurious one chops a number in half.
 */
const ABBREVIATIONS = new Set([
  'mr', 'mrs', 'ms', 'dr', 'prof', 'st', 'vs', 'etc', 'eg', 'ie', 'no', 'approx',
  'jan', 'feb', 'mar', 'apr', 'jun', 'jul', 'aug', 'sep', 'sept', 'oct', 'nov', 'dec'
]);

function isSentenceEnd(text, i) {
  if (text[i] !== '.') return true;                       // ! ? … always end

  const next = text[i + 1];
  const prev = text[i - 1];

  /* 3.5 — a digit either side means a decimal, never a sentence. */
  if (/\d/.test(prev || '') && /\d/.test(next || '')) return false;

  /* A full stop with no space after it is inside something: a URL, a decimal,
     an ellipsis we have not reached the end of. */
  if (next && !/\s/.test(next)) return false;

  /* Walk back over the word before the stop. One letter is an initial;
     a known abbreviation is an abbreviation. */
  let j = i - 1, word = '';
  while (j >= 0 && /[A-Za-z]/.test(text[j])) { word = text[j] + word; j--; }
  if (word.length === 1) return false;
  if (ABBREVIATIONS.has(word.toLowerCase())) return false;

  return true;
}

/** `_2s`, `_800ms`, `_1.5s` → milliseconds. Returns null when there is no suffix. */
function readExplicitDuration(text, i) {
  const m = /^_(\d+(?:\.\d+)?)(ms|s)\b/.exec(text.slice(i));
  if (!m) return null;
  const value = parseFloat(m[1]);
  return { ms: m[2] === 'ms' ? value : value * 1000, length: m[0].length };
}

function breakTag(ms) {
  /* ElevenLabs takes seconds with one decimal. 250 ms → "0.3s" is close enough
     and avoids a tag the API might reject for over-precision. */
  return `<break time="${(Math.round(ms / 100) / 10).toFixed(1)}s" />`;
}

/**
 * Parse an authored script.
 *
 * @param {string} raw       what the author typed
 * @param {object} [opts]    pause overrides, see DEFAULTS
 * @returns {{
 *   text: string,           to send to the TTS provider, with break tags
 *   plain: string,          the words alone — reference answers, transcripts, diffs
 *   segments: Array,        [{ kind: 'speech'|'pause', text?, ms? }] for the editor
 *   stats: object           chars, billedChars, breaks, estimatedMs, capped
 * }}
 */
function parseScript(raw, opts) {
  const cfg = Object.assign({}, DEFAULTS, opts || {});
  const src = String(raw == null ? '' : raw);

  const segments = [];
  let out = '';           // provider text, break tags included
  let plain = '';         // words only
  let buffer = '';        // speech accumulating since the last pause
  let breaks = 0;

  /* One pause at a time. "end._" or ". _" must not fire twice — the larger
     gap wins, because an author who typed both wanted the bigger one. */
  let pendingMs = 0;

  const flushSpeech = () => {
    if (!buffer) return;
    segments.push({ kind: 'speech', text: buffer });
    buffer = '';
  };

  const flushPause = () => {
    if (!pendingMs) return;
    const ms = Math.min(pendingMs, cfg.maxBreakMs);
    flushSpeech();
    segments.push({ kind: 'pause', ms });
    breaks++;
    pendingMs = 0;
    return ms;
  };

  /* The lead-in, emitted before anything is read. Counted as a break like any
     other so the estimate, the billed-character figure and the segment list
     shown in the preview all include it — an author looking at "18 seconds"
     should be looking at the length of the file they will actually get.

     Skipped for an empty script: a break tag alone is a billable request that
     returns one second of silence. */
  if (cfg.leadIn > 0 && src.trim()) {
    const ms = Math.min(cfg.leadIn, cfg.maxBreakMs);
    segments.push({ kind: 'pause', ms, leadIn: true });
    breaks++;
    out += breakTag(ms) + ' ';
  }

  for (let i = 0; i < src.length; i++) {
    const ch = src[i];

    if (ch === '_') {
      const explicit = readExplicitDuration(src, i);
      const ms = explicit ? explicit.ms : cfg.segment;
      /* Run of underscores: one gap, not one per character. */
      let skip = explicit ? explicit.length - 1 : 0;
      while (!explicit && src[i + 1 + skip] === '_') skip++;
      i += skip;

      pendingMs = Math.max(pendingMs, ms);
      /* A segment gap swallows the whitespace either side so the words do not
         end up glued together when the tag is removed. */
      buffer = buffer.replace(/\s+$/, '');
      while (/\s/.test(src[i + 1] || '')) i++;

      const emitted = flushPause();
      out += (out.endsWith(' ') || !out ? '' : ' ') + breakTag(emitted) + ' ';
      plain = plain.replace(/\s+$/, '') + ' ';
      continue;
    }

    buffer += ch;
    out += ch;
    plain += ch;

    if (SHORT_MARKS.has(ch) || (LONG_MARKS.has(ch) && isSentenceEnd(src, i))) {
      const ms = SHORT_MARKS.has(ch) ? cfg.short : cfg.long;
      /* Look ahead: if a segment gap is coming, let it win rather than
         emitting a small break immediately followed by a large one. */
      const rest = src.slice(i + 1);
      if (/^\s*_/.test(rest)) continue;

      pendingMs = Math.max(pendingMs, ms);
      const emitted = flushPause();
      out += ' ' + breakTag(emitted);
    }
  }

  flushSpeech();

  const text = out.replace(/\s+/g, ' ').trim();
  const plainText = plain.replace(/\s+/g, ' ').trim();

  /* Too many tags: keep the punctuation, drop the tags. The audio is still
     right, it is just paced by the model. Surfaced in stats so the admin
     screen can say so rather than silently changing the author's intent. */
  const capped = breaks > cfg.maxBreaks;
  const providerText = capped ? plainText : text;

  const pauseMs = segments.reduce((n, s) => n + (s.kind === 'pause' ? s.ms : 0), 0);
  /* Speech scales with the speed setting; silence does not. A break tag asks
     for a fixed number of seconds and gets them whatever the voice is doing,
     so the two are estimated separately and only the words are divided. */
  const speed = cfg.speed > 0 ? cfg.speed : 1;
  const speechMs = Math.round((plainText.length / CHARS_PER_SECOND / speed) * 1000);

  return {
    text: providerText,
    plain: plainText,
    segments,
    stats: {
      chars: plainText.length,
      /* ElevenLabs bills the string it receives, tags included — an author
         watching the monthly cap needs the number that is actually charged. */
      billedChars: providerText.length,
      breaks: capped ? 0 : breaks,
      estimatedMs: speechMs + (capped ? 0 : pauseMs),
      capped
    }
  };
}

/**
 * Split a multi-voice script into per-turn parts.
 *
 * `[S1] Is this seat taken?` / `[S2] No, go ahead.`
 *
 * Returns a single unlabelled turn when the script has no speaker tags, so a
 * caller can treat every script the same way.
 */
function splitTurns(raw) {
  const src = String(raw == null ? '' : raw);
  const re = /\[([A-Za-z][\w-]{0,15})\]/g;
  const marks = [...src.matchAll(re)];
  if (!marks.length) return [{ speaker: null, script: src.trim() }];

  const turns = [];
  /* Text before the first tag belongs to nobody; keep it so an author does not
     lose a line to a typo in their first tag. */
  const lead = src.slice(0, marks[0].index).trim();
  if (lead) turns.push({ speaker: null, script: lead });

  marks.forEach((m, n) => {
    const from = m.index + m[0].length;
    const to = n + 1 < marks.length ? marks[n + 1].index : src.length;
    const script = src.slice(from, to).trim();
    if (script) turns.push({ speaker: m[1], script });
  });
  return turns;
}

module.exports = { parseScript, splitTurns, DEFAULTS, CHARS_PER_SECOND, BUILD_SPEED };
