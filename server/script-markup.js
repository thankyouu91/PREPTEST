/**
 * Audio script markup — turning an author's plain text into timed speech.
 *
 * An author writes an exam script the way they would write anything else, and
 * three characters control the pacing:
 *
 *     ,  ;  :  "     short pause   (default 250 ms)
 *     .  !  ?        long pause    (default 600 ms)
 *     _              segment gap   (default 1500 ms, 1-2 s as specified)
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
 * Output goes to ElevenLabs as `<break time="0.25s" />` tags, which the v2
 * models honour. One request per script, no audio splicing — see
 * docs/VOICE.md section 4.
 */
'use strict';

/* Defaults in milliseconds. Overridable per call so a dictation part can run
   slower than a conversation without a second copy of this file. */
const DEFAULTS = {
  short: 250,
  long: 600,
  segment: 1500,
  /* ElevenLabs rejects breaks longer than 3 s, and stacking many long ones
     makes some models drift. Cap here rather than discovering it in a 502. */
  maxBreakMs: 3000,
  /* Above this many breaks the model starts to wander. Past the limit we keep
     the punctuation and drop the explicit tags — the audio is still correct,
     just paced by the model instead of by us. */
  maxBreaks: 60
};

/* Speaking rate used for duration estimates: 140 words per minute at roughly
   6 characters per word including the space. Only an estimate — the real
   length comes back from the render — but good enough to warn an author that
   a part will not fit its timer before they spend the characters. */
const CHARS_PER_SECOND = 14;

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
  const speechMs = Math.round((plainText.length / CHARS_PER_SECOND) * 1000);

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

module.exports = { parseScript, splitTurns, DEFAULTS, CHARS_PER_SECOND };
