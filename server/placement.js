/**
 * The placement test: fifteen minutes to work out where somebody should start.
 *
 * Every new account sits this before anything else. Not to grade anybody — to
 * stop the platform from guessing. Without it a learner's first hour is spent on
 * material chosen at random, and `server/ability.js` correctly refuses to name a
 * band until it has seen enough work, so the progress panel would say "chưa đủ
 * dữ liệu" to somebody who has just signed up and is looking for a reason to
 * stay.
 *
 * ## It is a measuring instrument, not a small exam
 *
 * A VPET paper is 58 items and an hour. Nobody sits one to find out where to
 * begin, and a test people abandon measures nothing. So this is deliberately
 * different in three ways:
 *
 * **Short, and it says so.** Three rungs of six items, about twelve minutes.
 *
 * **It moves.** Rung 1 is always B1 — the middle of what VPET assesses. Rung 2
 * is chosen by how rung 1 went, and rung 3 by rung 2. Six items at the right
 * level tell you far more than eighteen at the wrong one: a B2 learner answering
 * A2 items gets six ticks and you have learnt nothing except that they are above
 * A2. This is a ladder, not IRT — honest about what it is, and it needs no item
 * calibration the bank does not have.
 *
 * **Machine-marked only.** `mcq` and `gap`, so the result appears the moment the
 * last answer goes in. Writing and Speaking are deliberately NOT sampled here:
 * marking them needs a model call, and a new account staring at a spinner — or
 * worse, at a band with two skills missing — is a bad first five minutes. What
 * happens instead is better. Those two skills end up with no data, `ability.js`
 * gives them a wide interval, and `roadmap()` pushes them to the top of the
 * plan on their own. The first thing the platform asks a new learner to do is
 * the thing it knows least about them, which is exactly right.
 *
 * ## What comes out
 *
 * A CEFR level and a mark out of ten, both marked PROVISIONAL, plus the events
 * written into `skill_events` so every other screen — progress, the roadmap, the
 * drill picker — reads the same estimate as everything else. There is one
 * ability model in this platform and this feeds it; it does not keep a second
 * score of its own.
 */
'use strict';

const { q, nowISO } = require('./db');
const ability = require('./ability');

/** Items per rung, and rungs per test. 3 × 6 is about twelve minutes. */
const PER_RUNG = 6;
const RUNGS = 3;

/**
 * The ladder. VPET assesses B1–C1, so the rungs stay inside a band either side
 * of that: placing somebody at A2 is useful (start lower, work up), placing them
 * at C2 is not, because there is no C2 material to send them to.
 */
const LADDER = ['A2', 'B1', 'B2', 'C1'];

/** Move up on 5 or 6 right, down on 2 or fewer, stay otherwise. */
const UP_AT = 5;
const DOWN_AT = 2;

/** Where everybody starts: the middle of what the exam actually measures. */
const START_LEVEL = 'B1';

/** Only these can be marked the instant the answer arrives. */
const INSTANT_TYPES = ['mcq', 'gap'];

const jparse = (s, fallback) => {
  try { const v = JSON.parse(s); return v == null ? fallback : v; } catch { return fallback; }
};

function nextLevel(level, right) {
  const i = Math.max(0, LADDER.indexOf(level));
  if (right >= UP_AT) return LADDER[Math.min(LADDER.length - 1, i + 1)];
  if (right <= DOWN_AT) return LADDER[Math.max(0, i - 1)];
  return level;
}

/* --------------------------------- Drawing --------------------------------- */

const TYPE_HOLES = INSTANT_TYPES.map(() => '?').join(',');

/** Everything usable at one level, one item per part per pass, spread wide. */
async function takeAtLevel(level, skip, picked, want) {
  const parts = await q.all(
    `SELECT DISTINCT part FROM questions
      WHERE status = 'active' AND level = ? AND type IN (${TYPE_HOLES})
        AND part IS NOT NULL
      ORDER BY part`, level, ...INSTANT_TYPES);

  /* One pass takes a single item from each part, then it goes round again. That
     is what spreads them: six items sorted by RANDOM() over the whole pool
     cluster into whichever part happens to be deepest. */
  for (let round = 0; round < 6 && picked.length < want; round++) {
    let took = 0;
    for (const { part } of parts) {
      if (picked.length >= want) break;
      const rows = await q.all(
        `SELECT id, part, type, prompt, options_json, level
           FROM questions
          WHERE status = 'active' AND level = ? AND part = ?
            AND type IN (${TYPE_HOLES})
          ORDER BY RANDOM() LIMIT 8`, level, part, ...INSTANT_TYPES);
      const row = rows.find(r => !skip.has(r.id) && !picked.some(p => p.id === r.id));
      if (row) { picked.push(row); took++; }
    }
    if (!took) break;             // this level is exhausted; going round again cannot help
  }
}

/**
 * Six items for one rung, spread across as many parts as possible.
 *
 * The level asked for is a preference, not a promise, and that is deliberate:
 * the bank is uneven and will stay uneven while it is being written. Today it
 * holds 18 machine-markable items at B1, 42 at B2, 4 at A2 and none at C1 — so
 * a rung that insisted on C1 would hand back nothing and the test would simply
 * stop for the strongest learners, which is the worst group to lose.
 *
 * So it fills from the asked level first and then widens outwards, nearest
 * first, and reports what it actually used. Two consequences worth being awake
 * to: a rung padded from an easier level flatters slightly, and one padded from
 * a harder level is harsh. Both are better than no rung, both shrink to nothing
 * as the bank fills, and `usedLevels` is on the response so a screen or a test
 * can see it happened rather than having to infer it.
 *
 * `exclude` is everything already served this sitting, so rung two cannot repeat
 * rung one — which at the same level it otherwise would, often, on a shallow part.
 */
async function drawRung(level, exclude) {
  const skip = new Set((exclude || []).map(Number));
  const picked = [];

  await takeAtLevel(level, skip, picked, PER_RUNG);

  if (picked.length < PER_RUNG) {
    const i = Math.max(0, LADDER.indexOf(level));
    /* Nearest first, alternating below then above: an item one level easier is a
       closer substitute than one two levels harder. */
    const order = [];
    for (let d = 1; d < LADDER.length; d++) {
      if (LADDER[i - d]) order.push(LADDER[i - d]);
      if (LADDER[i + d]) order.push(LADDER[i + d]);
    }
    for (const alt of order) {
      if (picked.length >= PER_RUNG) break;
      await takeAtLevel(alt, skip, picked, PER_RUNG);
    }
  }
  return picked;
}

/** What the browser is allowed to see. Never the answer key. */
function forClient(row) {
  return {
    questionId: row.id,
    part: row.part,
    type: row.type,
    prompt: row.prompt,
    options: jparse(row.options_json, null)
  };
}

/* ------------------------------- The lifecycle ------------------------------- */

/** The learner's placement row, or null. */
function rowOf(userId) {
  return q.get('SELECT * FROM placements WHERE user_id = ?', userId);
}

/**
 * Does this account still owe a placement?
 *
 * Used by the page guard, so it has to be cheap and it has to be certain. A row
 * with status 'done' is finished for ever; anything else, including no row at
 * all, means not yet.
 */
async function needed(userId) {
  const row = await rowOf(userId);
  return !row || row.status !== 'done';
}

/**
 * Start, or resume.
 *
 * Resuming rather than restarting is deliberate: somebody who closed the tab at
 * item eleven should not be made to answer eleven questions again, and a test
 * that punishes an interruption is a test people give up on. The rung they were
 * on is stored, so this hands back that rung's items.
 */
async function start(userId) {
  let row = await rowOf(userId);
  if (row && row.status === 'done') return { done: true, result: resultOf(row) };

  if (!row) {
    await q.run(
      `INSERT INTO placements (user_id, status, rung, level, asked_json, right_json, started_at)
       VALUES (?, 'open', 1, ?, '[]', '[]', ?)`, userId, START_LEVEL, nowISO());
    row = await rowOf(userId);
  }

  const asked = jparse(row.asked_json, []);
  const items = await drawRung(row.level, asked);
  if (!items.length) {
    /* An empty bank at this level is a content problem, not a learner problem.
       Saying so beats handing back an empty test that cannot be finished. */
    return { error: 'no-items', level: row.level };
  }
  /* Recorded before they are answered, so a reload cannot draw a different six
     and quietly discard the ones already thought about. */
  await q.run('UPDATE placements SET asked_json = ? WHERE user_id = ?',
    JSON.stringify(asked.concat(items.map(i => i.id))), userId);

  return {
    rung: row.rung, rungs: RUNGS, level: row.level,
    usedLevels: [...new Set(items.map(i => i.level))],
    items: items.map(forClient)
  };
}

/**
 * Mark one rung, and either hand back the next or finish.
 *
 * Marking happens here and only here. The browser sends answers; it is never
 * told which were right until the rung is over, and it never decides.
 */
async function answer(userId, answers) {
  const row = await rowOf(userId);
  if (!row) return { error: 'not-started' };
  if (row.status === 'done') return { done: true, result: resultOf(row) };

  const given = new Map();
  for (const a of Array.isArray(answers) ? answers : []) {
    const id = Number(a && a.questionId);
    if (Number.isFinite(id)) given.set(id, String((a && a.answer) || ''));
  }
  if (!given.size) return { error: 'no-answers' };

  const keys = await q.all(
    `SELECT id, part, type, answer, level FROM questions WHERE id IN (${[...given.keys()].map(() => '?').join(',')})`,
    ...given.keys());

  const marking = require('./marking');
  let right = 0;
  const events = [];
  for (const k of keys) {
    const mark = marking.markItem({ type: k.type, answer: k.answer }, given.get(k.id));
    if (!mark) continue;
    if (mark.earned > 0) right++;
    events.push({
      user_id: userId,
      source: 'placement',
      ref_id: 'placement:' + row.id,
      /* Part of the idempotency key, with source and ref_id. Without it every
         item of a sitting collides on the same triple and ON CONFLICT keeps
         exactly one — eighteen answers would be recorded as one. */
      item_key: 'q' + k.id,
      skill: skillOfPart(k.part), part: k.part, level: k.level,
      earned: mark.earned, max_score: mark.max,
      /* Weighted at 1: it is a real, timed, unaided answer, the same as an item
         in a paper. Nothing about a placement makes it worth less evidence. */
      weight: 1, at: nowISO()
    });
  }
  if (events.length) await ability.record(events);

  const rights = jparse(row.right_json, []).concat(right);

  if (row.rung >= RUNGS) {
    const placed = settle(rights, row.level);
    await q.run(
      `UPDATE placements SET status = 'done', right_json = ?, done_at = ?,
              placed_level = ?, placed_score = ? WHERE user_id = ?`,
      JSON.stringify(rights), nowISO(), placed.level, placed.score, userId);
    return { done: true, result: placed, rungRight: right, rungOf: PER_RUNG };
  }

  const level = nextLevel(row.level, right);
  await q.run('UPDATE placements SET rung = ?, level = ?, right_json = ? WHERE user_id = ?',
    row.rung + 1, level, JSON.stringify(rights), userId);

  const asked = jparse(row.asked_json, []);
  const items = await drawRung(level, asked);
  await q.run('UPDATE placements SET asked_json = ? WHERE user_id = ?',
    JSON.stringify(asked.concat(items.map(i => i.id))), userId);

  return {
    rung: row.rung + 1, rungs: RUNGS, level,
    rungRight: right, rungOf: PER_RUNG,
    usedLevels: [...new Set(items.map(i => i.level))],
    items: items.map(forClient)
  };
}

/**
 * Which of the four skills a VPET part belongs to.
 *
 * Read from the published part tables rather than hardcoded here, so a change to
 * the blueprint does not leave this file quietly disagreeing with the exam.
 */
let PART_SKILL = null;
function skillOfPart(part) {
  if (!PART_SKILL) {
    PART_SKILL = {};
    try {
      const formats = require('./data/exam-formats');
      for (const f of Object.values(formats)) {
        for (const p of (f && f.parts) || []) if (p.part && p.skill) PART_SKILL[p.part] = p.skill;
      }
    } catch { /* fall through to the default below */ }
  }
  return PART_SKILL[part] || 'reading';
}

/**
 * The level and the mark, from the three rung scores.
 *
 * The level is the HARDEST rung they held up at — five or six right — rather
 * than the last rung they happened to be on. Those differ exactly when somebody
 * is pushed up, struggles, and comes back down: the last rung is then the easier
 * one, and reporting it would place a B2 learner at B1 for having tried a C1
 * rung and found it hard. Trying something hard must not lower a placement.
 */
function settle(rights, lastLevel) {
  const total = rights.reduce((a, b) => a + b, 0);
  const max = RUNGS * PER_RUNG;
  /* Rung levels are recoverable: rung 1 is START_LEVEL and each next is derived
     from the one before, which is the same arithmetic the test itself ran. */
  let level = START_LEVEL;
  let best = null;
  for (let i = 0; i < rights.length; i++) {
    if (rights[i] >= UP_AT) best = level;
    else if (rights[i] > DOWN_AT && best === null) best = level;
    level = nextLevel(level, rights[i]);
  }
  return {
    level: best || LADDER[0],
    score: Math.round((total / max) * 10 * 2) / 2,
    right: total, of: max,
    lastLevel,
    /* Said in the payload, not only in the copy, so no screen can forget it. */
    provisional: true
  };
}

function resultOf(row) {
  const rights = jparse(row.right_json, []);
  return {
    level: row.placed_level, score: row.placed_score,
    right: rights.reduce((a, b) => a + b, 0), of: RUNGS * PER_RUNG,
    provisional: true, doneAt: row.done_at
  };
}

/** The whole state, for the screen and for the guard. */
async function stateOf(userId) {
  const row = await rowOf(userId);
  if (!row) return { status: 'needed', rungs: RUNGS, perRung: PER_RUNG };
  if (row.status === 'done') return { status: 'done', result: resultOf(row) };
  return { status: 'open', rung: row.rung, rungs: RUNGS, perRung: PER_RUNG, level: row.level };
}

module.exports = {
  needed, start, answer, stateOf, resultOf, settle, nextLevel, drawRung, skillOfPart,
  PER_RUNG, RUNGS, LADDER, START_LEVEL, UP_AT, DOWN_AT, INSTANT_TYPES
};
