/**
 * OpenAI — drafting audio scripts and the items that go with them.
 *
 * The one place in the platform that talks to OpenAI. Two jobs today:
 *
 *   draftScript()  a spoken script for a VPET audio part, written in the
 *                  platform's pause markup so it renders with the same timing
 *                  discipline as a hand-written one
 *   draftItems()   the questions that accompany a script, in the exact shape
 *                  the question bank stores
 *
 * Both use structured outputs with `strict: true`, so the response either
 * matches the schema or the request fails. Nothing here parses free text
 * hoping for the best — a malformed draft would otherwise reach the bank as a
 * half-populated row and be discovered by a candidate.
 *
 * Everything produced here is a **draft**. It lands as `status='draft'` and an
 * author reviews it before it can enter a form. A model that writes a plausible
 * question with two defensible answers is a normal Tuesday, and the reviewer is
 * what stands between that and an exam.
 */
'use strict';

const API = 'https://api.openai.com/v1';
const TIMEOUT_MS = 120000;

/* Pin the model. An unpinned default means an upstream change silently alters
   the difficulty of everything drafted after it — set the exact dated name in
   production, the same argument as docs/VOICE.md 6.5 makes for marking. */
const DEFAULT_MODEL = process.env.OPENAI_ITEM_MODEL || 'gpt-4o';

class ProviderError extends Error {
  constructor(message, { status = 0, retryable = false, code = 'PROVIDER' } = {}) {
    super(message);
    this.name = 'ProviderError';
    this.status = status;
    this.retryable = retryable;
    this.code = code;
  }
}

async function explain(res) {
  let detail = '';
  try {
    const body = await res.text();
    detail = JSON.parse(body)?.error?.message || body.slice(0, 300);
  } catch (e) { /* status only */ }

  if (res.status === 401) {
    return new ProviderError('OpenAI rejected the API key. Check it in Settings → Integrations.',
      { status: 401, code: 'AUTH' });
  }
  if (res.status === 429) {
    return new ProviderError(/quota|billing/i.test(detail)
      ? 'The OpenAI account has no credit left.'
      : 'OpenAI is rate limiting. The job will be retried.',
    { status: 429, retryable: !/quota|billing/i.test(detail), code: 'RATE' });
  }
  if (res.status >= 500) {
    return new ProviderError('OpenAI is having trouble. The job will be retried.',
      { status: res.status, retryable: true, code: 'UPSTREAM' });
  }
  return new ProviderError(`OpenAI returned ${res.status}: ${detail}`, { status: res.status });
}

async function chat({ apiKey, model, system, user, schema, schemaName, maxTokens = 4000 }) {
  if (!apiKey) {
    throw new ProviderError('No OpenAI API key is configured. Add one in Settings → Integrations.',
      { code: 'NOKEY' });
  }

  const ctl = new AbortController();
  const timer = setTimeout(() => ctl.abort(), TIMEOUT_MS);
  let res;
  try {
    res = await fetch(API + '/chat/completions', {
      method: 'POST',
      signal: ctl.signal,
      headers: { authorization: `Bearer ${apiKey}`, 'content-type': 'application/json' },
      body: JSON.stringify({
        model: model || DEFAULT_MODEL,
        /* Authoring wants consistency, not variety: the same brief should give
           the same difficulty twice running, so a reviewer comparing two
           batches is comparing the brief and not the weather. */
        temperature: 0.3,
        max_tokens: maxTokens,
        messages: [
          { role: 'system', content: system },
          { role: 'user', content: user }
        ],
        response_format: {
          type: 'json_schema',
          json_schema: { name: schemaName, strict: true, schema }
        }
      })
    });
  } catch (e) {
    if (e.name === 'AbortError') {
      throw new ProviderError('OpenAI did not respond in time. The job will be retried.',
        { retryable: true, code: 'TIMEOUT' });
    }
    throw new ProviderError(`Could not reach OpenAI: ${e.message}`, { retryable: true, code: 'NETWORK' });
  } finally {
    clearTimeout(timer);
  }

  if (!res.ok) throw await explain(res);

  const data = await res.json();
  const choice = data.choices && data.choices[0];

  /* A truncated response is still valid JSON often enough to be dangerous —
     it can parse into a short list that looks like a small batch rather than a
     failed one. Check the finish reason before trusting the content. */
  if (choice && choice.finish_reason === 'length') {
    throw new ProviderError('The draft was cut off before it finished. Ask for fewer items at a time.',
      { code: 'TRUNCATED' });
  }
  if (choice && choice.message && choice.message.refusal) {
    throw new ProviderError(`OpenAI declined the request: ${choice.message.refusal}`, { code: 'REFUSED' });
  }

  let parsed;
  try {
    parsed = JSON.parse(choice.message.content);
  } catch (e) {
    throw new ProviderError('OpenAI returned something that was not valid JSON.', { retryable: true, code: 'PARSE' });
  }

  return {
    data: parsed,
    usage: data.usage || {},
    model: data.model || model || DEFAULT_MODEL
  };
}

/* ------------------------------------------------------------------ */
/* Shared prompt material                                              */
/* ------------------------------------------------------------------ */

/* The markup rules are repeated to the model verbatim because they are the one
   thing a general-purpose model has no way to guess. Everything else in the
   prompt is ordinary exam-writing knowledge; this is house convention. */
const MARKUP_RULES = `
Pause markup used by this platform, and the only markup allowed:
  ,  ;  :   a short pause
  .  !  ?   a long pause, at the end of a sentence
  _         a gap of about 1.5 seconds between segments; write it on its own,
            surrounded by spaces

Write ordinary punctuation as you normally would — the platform converts it to
timed pauses. Use _ only where a real silence belongs: between two dictation
sentences, or between a story and the question that follows it.
Never use SSML, never use <break>, never use markdown.`.trim();

const LEVEL_GUIDE = `
VPET is sat at one of two levels:
  Level 1 measures B1 and below  (GSE 10-50)
  Level 2 measures B2 and above  (GSE 59-90)
Write to the level you are given. A Level 1 item that only a B2 candidate can
answer measures nothing, because no Level 1 candidate will get it right.`.trim();

/* ------------------------------------------------------------------ */
/* Drafting a spoken script                                            */
/* ------------------------------------------------------------------ */

const SCRIPT_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: ['script', 'summary', 'key_points'],
  properties: {
    script: { type: 'string', description: 'The spoken script, using the pause markup' },
    summary: { type: 'string', description: 'One sentence on what the audio contains' },
    key_points: {
      type: 'array',
      description: 'The facts a candidate should retain. Used to mark part J retellings.',
      items: { type: 'string' }
    }
  }
};

/**
 * Draft the spoken script for one audio item.
 *
 * @param {object} input apiKey, part (A-J), partName, level (1|2), brief, words, model
 */
async function draftScript(input) {
  const words = Math.max(10, Math.min(400, input.words || 150));
  const out = await chat({
    apiKey: input.apiKey,
    model: input.model,
    schemaName: 'audio_script',
    schema: SCRIPT_SCHEMA,
    system: [
      'You write listening material for the VPET English examination.',
      LEVEL_GUIDE,
      MARKUP_RULES,
      'Write natural spoken English. Avoid culture-specific references a Vietnamese',
      'candidate would not have met, and avoid names that are hard to say aloud.'
    ].join('\n\n'),
    user: [
      `Part ${input.part} — ${input.partName || ''}`,
      `Level ${input.level === 2 ? '2 (B2 and above)' : '1 (B1 and below)'}`,
      `Target length: about ${words} words.`,
      input.brief ? `Brief: ${input.brief}` : 'Brief: choose an everyday topic suitable for the part.',
      '',
      'Return the script, a one-sentence summary, and the key points a candidate',
      'should retain. For a dictation part, separate each sentence with _ .'
    ].join('\n')
  });

  return {
    script: String(out.data.script || '').trim(),
    summary: String(out.data.summary || '').trim(),
    keyPoints: Array.isArray(out.data.key_points) ? out.data.key_points.map(String) : [],
    usage: out.usage,
    model: out.model
  };
}

/* ------------------------------------------------------------------ */
/* Drafting the items                                                  */
/* ------------------------------------------------------------------ */

/* The schema mirrors the `questions` table, so a validated response maps to a
   row without a translation layer in between — one shape, one place to change
   it. `options` and `answer` carry different meanings per type, which the
   descriptions spell out for the model. */
const ITEMS_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: ['items'],
  properties: {
    items: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['type', 'prompt', 'options', 'answer', 'explanation'],
        properties: {
          type: { type: 'string', enum: ['mcq', 'gap', 'essay', 'speaking'] },
          prompt: { type: 'string', description: 'Shown on screen to the candidate' },
          options: {
            type: 'array',
            description: 'Four options for mcq. Empty for every other type.',
            items: { type: 'string' }
          },
          answer: {
            type: 'string',
            description: 'mcq: the exact text of the correct option. ' +
              'gap: the accepted word, with variants separated by | . ' +
              'essay and speaking: empty, they are marked against a rubric.'
          },
          explanation: { type: 'string', description: 'Why the answer is right. Shown after marking.' }
        }
      }
    }
  }
};

/**
 * Draft the items for one part, optionally against an audio script.
 *
 * @param {object} input apiKey, part, partName, level, count, types, script, brief, model
 */
async function draftItems(input) {
  const count = Math.max(1, Math.min(20, input.count || 5));
  const types = (input.types && input.types.length) ? input.types : ['mcq'];

  const out = await chat({
    apiKey: input.apiKey,
    model: input.model,
    schemaName: 'exam_items',
    schema: ITEMS_SCHEMA,
    maxTokens: 6000,
    system: [
      'You write items for the VPET English examination.',
      LEVEL_GUIDE,
      'Rules that make an item usable:',
      '- Exactly one option can be defended as correct. If two could be argued, rewrite it.',
      '- Distractors must be plausible to someone who half-understood, not obviously wrong.',
      '- Never make the correct option the longest or the most detailed one.',
      '- For a listening part, the answer must come from the audio, not from general knowledge.',
      '- Ask about what the passage says, not about what a candidate might assume.'
    ].join('\n'),
    user: [
      `Part ${input.part} — ${input.partName || ''}`,
      `Level ${input.level === 2 ? '2 (B2 and above)' : '1 (B1 and below)'}`,
      `Write exactly ${count} items.`,
      `Allowed item types: ${types.join(', ')}.`,
      input.script
        ? `\nThe candidate hears this audio:\n"""\n${input.script}\n"""\n` +
          'Every answer must be verifiable from that audio alone.'
        : (input.brief ? `Brief: ${input.brief}` : ''),
      '',
      'For mcq give exactly four options and set answer to the exact text of the',
      'correct one. For gap set answer to the accepted word, with acceptable',
      'variants separated by | . For essay and speaking leave options empty and',
      'answer empty.'
    ].filter(Boolean).join('\n')
  });

  const items = Array.isArray(out.data.items) ? out.data.items : [];

  /* The schema guarantees the shape but not the sense. These two checks catch
     the failures that actually happen: an mcq whose answer is not among its
     own options, and a set of options with a duplicate. Both produce an item
     that is unmarkable rather than merely weak, so they are rejected here
     instead of reaching a reviewer as something that looks fine. */
  const clean = [];
  const rejected = [];
  for (const it of items) {
    const options = Array.isArray(it.options) ? it.options.map(o => String(o).trim()).filter(Boolean) : [];
    const answer = String(it.answer || '').trim();

    if (it.type === 'mcq') {
      if (options.length < 2) { rejected.push({ prompt: it.prompt, why: 'fewer than two options' }); continue; }
      if (new Set(options.map(o => o.toLowerCase())).size !== options.length) {
        rejected.push({ prompt: it.prompt, why: 'duplicate options' }); continue;
      }
      if (!options.some(o => o.toLowerCase() === answer.toLowerCase())) {
        rejected.push({ prompt: it.prompt, why: 'answer is not one of the options' }); continue;
      }
    }
    if (it.type === 'gap' && !answer) {
      rejected.push({ prompt: it.prompt, why: 'no accepted answer' }); continue;
    }

    clean.push({
      type: it.type,
      prompt: String(it.prompt || '').trim(),
      options,
      answer,
      explanation: String(it.explanation || '').trim()
    });
  }

  return { items: clean, rejected, usage: out.usage, model: out.model };
}

/** Cheap round trip for the "Test connection" button. */
async function ping(apiKey) {
  if (!apiKey) {
    throw new ProviderError('No OpenAI API key is configured.', { code: 'NOKEY' });
  }
  const ctl = new AbortController();
  const timer = setTimeout(() => ctl.abort(), 20000);
  let res;
  try {
    res = await fetch(API + '/models', {
      signal: ctl.signal,
      headers: { authorization: `Bearer ${apiKey}` }
    });
  } catch (e) {
    throw new ProviderError(`Could not reach OpenAI: ${e.message}`, { retryable: true, code: 'NETWORK' });
  } finally {
    clearTimeout(timer);
  }
  if (!res.ok) throw await explain(res);
  const data = await res.json();
  const n = Array.isArray(data.data) ? data.data.length : 0;
  return { ok: true, detail: `key accepted, ${n} models available` };
}

module.exports = { draftScript, draftItems, ping, ProviderError, DEFAULT_MODEL };
