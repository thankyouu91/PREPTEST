/**
 * Practice for the two reference pages: irregular verbs and linking words.
 *
 * Those two pages were lookup tables. Everything else in the self-study area
 * has something to DO — the nine grammar pages carry practice sentences — and
 * these two carried nothing, so the only way to use them was to read a table
 * and hope. Reading a conjugation table feels like learning and mostly is not;
 * producing the form is the thing being practised, which is the same argument
 * server/revision.js makes for its own exercises.
 *
 * ## The browser never says whether it was right
 *
 * The obvious shape is to mark in the browser and post the score. That is an
 * invitation to post `{correct: true}` forty times and walk away with a
 * vocabulary estimate nobody earned. So the browser posts the ANSWER and this
 * module marks it, exactly as the drill and revision paths do.
 *
 * ## What it is worth
 *
 * Recorded as `skill_events` at a low weight, under `grammar` and
 * `vocabulary`. Both are diagnostic dimensions: `ability.abilityOf()` builds
 * the overall band from the four exam skills only, so twenty minutes of verb
 * recall moves the self-study picture and cannot move the band. That is the
 * same rule block 5 runs on, and it is the reason this can be recorded at all
 * without inflating anything that matters.
 */
'use strict';

const { q } = require('./db');
const ability = require('./ability');

/**
 * What one of these answers is worth against a real exam item.
 *
 * Below the drill weight, deliberately. A drill is exam-shaped: a real prompt,
 * a real distractor set. This is recall of a single form with the question in
 * front of you, which is a genuinely easier thing, and weighting the two alike
 * would let somebody grind the verb table into a flattering picture.
 */
const LEARN_WEIGHT = 0.35;

/** How many items one round holds. Short enough to finish standing up. */
const ROUND = 10;

const KINDS = {
  verb: {
    table: 'irregular_verbs',
    skill: 'vocabulary',
    /* Which column is being asked for. The page picks one per question so a
       round is not ten repetitions of the same move. */
    fields: ['v2', 'v3', 'ving']
  },
  link: {
    table: 'linking_words',
    skill: 'grammar',
    fields: ['word']
  }
};

/** Case, spacing and surrounding punctuation are not what is being tested. */
function norm(s) {
  return String(s == null ? '' : s)
    .toLowerCase()
    .normalize('NFC')
    .replace(/[’‘]/g, "'")
    .replace(/[^a-z' ]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Is this answer right?
 *
 * A verb row may name a second accepted form in its note - "Cũng dùng betted
 * (hiếm)" - and refusing `betted` after the table itself offered it is the kind
 * of small unfairness that makes somebody stop trusting the marking. Any
 * English word inside the note counts as an alternative.
 */
function accepts(row, field, given) {
  const want = norm(row[field]);
  const got = norm(given);
  if (!want) return false;
  if (got === want) return true;
  const note = String(row.note || '');
  for (const alt of note.match(/[A-Za-z][A-Za-z']{2,}/g) || []) {
    if (norm(alt) === got) return true;
  }
  return false;
}

/** `ROUND` rows to ask about, at or below the learner's level where possible. */
/**
 * The example sentence with the linking word taken out of it.
 *
 * Returns null when the word cannot be removed, and the caller must then drop
 * the item rather than serve it. That is not defensive padding — it is the bug
 * this function was written for. A single `\bword\b` replace cannot touch a
 * SPLIT linker, and two of the 123 rows are split: `both … and`,
 * `not only … but also`. The replace found nothing, the sentence went out
 * whole, and the learner was shown
 *
 *     She is both fluent and accurate.
 *
 * and asked to type the missing linking word. There is no missing word. The
 * marker meanwhile wanted "both … and", which nothing on the screen could have
 * suggested. Roughly one round in seven contained one.
 *
 * So a split word is gapped in BOTH places — "She is _____ fluent _____
 * accurate." — which is a better question than the single-gap ones, because
 * the two halves are the whole point of the construction. And if any part is
 * missing from the sentence, the item is refused rather than guessed at: an
 * unanswerable question is worse than a shorter round.
 */
function gapExample(word, sentence) {
  const text = String(sentence || '').trim();
  if (!text) return null;
  /* An ellipsis, typed as one character or as three dots. */
  const parts = String(word || '').split(/\s*(?:…|\.\.\.)\s*/).map(w => w.trim()).filter(Boolean);
  if (!parts.length) return null;

  let out = text;
  for (const part of parts) {
    const re = new RegExp('\\b' + part.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '\\b', 'i');
    if (!re.test(out)) return null;          // this part is not in the sentence
    out = out.replace(re, '_____');
  }
  return out;
}

async function draw(kind, level, size) {
  const spec = KINDS[kind];
  if (!spec) return [];
  const n = Math.min(ROUND, Math.max(1, parseInt(size, 10) || ROUND));
  const rows = await q.all(
    `SELECT * FROM ${spec.table} ORDER BY RANDOM() LIMIT ?`, n * 3);
  /* Prefer the learner's level, then fill from anywhere rather than hand back a
     short round: a thin level should slow nobody down. */
  /* Anything that cannot be turned into a question is dropped BEFORE the round
     is cut to size, so a bad row costs the learner nothing — the round is still
     ten items, drawn from the three times as many fetched above. */
  const usable = kind === 'verb' ? rows : rows.filter(r => gapExample(r.word, r.ex_en));
  const at = usable.filter(r => !level || r.level === level);
  const out = at.concat(usable.filter(r => !at.includes(r))).slice(0, n);
  return out.map((r, i) => {
    const field = spec.fields[i % spec.fields.length];
    return {
      id: r.id, kind, field,
      /* Everything the question needs and nothing the answer needs. */
      prompt: kind === 'verb' ? r.v1 : gapExample(r.word, r.ex_en),
      vi: r.vi || null,
      level: r.level || null,
      hint: kind === 'verb' ? field.toUpperCase() : (r.fn || null)
    };
  });
}

/**
 * Mark a round and record it.
 *
 * Idempotent through `ability.record()`, which is keyed on
 * (source, ref_id, item_key): re-posting the same round cannot double it.
 */
async function submit(userId, kind, roundId, answers) {
  const spec = KINDS[kind];
  if (!spec) return { error: 'bad-kind' };
  const list = Array.isArray(answers) ? answers.slice(0, ROUND) : [];
  if (!list.length) return { error: 'no-answers' };

  const ids = [...new Set(list.map(a => Number(a && a.id)).filter(Boolean))];
  if (!ids.length) return { error: 'no-answers' };
  const rows = await q.all(
    `SELECT * FROM ${spec.table} WHERE id IN (${ids.map(() => '?').join(',')})`, ...ids);
  const byId = new Map(rows.map(r => [r.id, r]));

  const at = new Date().toISOString();
  const events = [];
  const detail = [];
  let right = 0;

  for (const a of list) {
    const row = byId.get(Number(a && a.id));
    if (!row) continue;
    const field = spec.fields.includes(a.field) ? a.field : spec.fields[0];
    const ok = accepts(row, field, a && a.answer);
    if (ok) right++;
    events.push({
      user_id: userId, source: 'learn',
      /* The round id makes a re-post of the SAME round idempotent while a new
         round still counts. Supplied by the browser and namespaced by kind, so
         two kinds cannot collide on one number.
         Two LEARNERS could, though, and that is not this line's job to prevent:
         the round id is a small number the browser picks, so any two accounts
         practising the same kind collide constantly. What stops it is that
         skill_events is now unique on (user_id, source, ref_id, item_key), so
         this ref_id only ever has to be unique within one account — which is
         exactly the idempotency it was written for. */
      ref_id: 'learn:' + kind + ':' + String(roundId || '0').slice(0, 40),
      item_key: kind + row.id + ':' + field,
      skill: spec.skill, level: row.level || null,
      earned: ok ? 1 : 0, max_score: 1, weight: LEARN_WEIGHT, at
    });
    detail.push({
      id: row.id, field, right: ok,
      given: String((a && a.answer) || ''),
      answer: row[field],
      note: row.note || null
    });
  }

  const recorded = await ability.record(events);
  return { right, asked: detail.length, recorded, detail };
}

module.exports = {
  gapExample, draw, submit, accepts, norm, KINDS, ROUND, LEARN_WEIGHT };
