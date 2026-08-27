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

/** Everything usable at one level, one item per part per pass, spread wide.
    `cap` is the most this rung may take from any single part, counted across
    every level already swept — see MAX_PER_PART. */
async function takeAtLevel(level, skip, picked, want, cap) {
  const parts = await q.all(
    `SELECT DISTINCT part FROM questions
      WHERE status = 'active' AND level = ? AND type IN (${TYPE_HOLES})
        AND part IS NOT NULL
      ORDER BY part`, level, ...INSTANT_TYPES);

  /* One pass takes a single item from each part, then it goes round again. That
     is what spreads them: six items sorted by RANDOM() over the whole pool
     cluster into whichever part happens to be deepest. */
  const ceiling = cap > 0 ? cap : want;
  const from = part => picked.filter(p => p.part === part).length;

  for (let round = 0; round < 6 && picked.length < want; round++) {
    let took = 0;
    for (const { part } of parts) {
      if (picked.length >= want) break;
      /* Counted over `picked`, which is the whole rung so far rather than this
         level's share of it — the cap has to hold across the level fallback,
         because that is where the imbalance came from. */
      if (from(part) >= ceiling) continue;
      const rows = await q.all(
        `SELECT id, part, type, prompt, options_json, level, audio_key
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
/**
 * At most this many items from any one part in a single rung.
 *
 * takeAtLevel() already takes one item per part per pass, so a rung drawn wholly
 * from one level is balanced by construction. The imbalance came from the level
 * FALLBACK below, which starts a fresh pass sequence at each substitute level —
 * and the part with items everywhere wins every one of them.
 *
 * What that did to a real sitting: A2 holds four items and all four are Part A,
 * which is gap-fill. A learner who does badly on rung 1 is dropped to A2, and
 * rung 2 came back A A A A A E — five text boxes in a row, nothing to choose on
 * any of them. It was reported as "không nhấn chọn được kết quả", and it is a
 * fair description of a screen with no options on it.
 *
 * Two of six leaves room for at least three parts in every rung. The cap is
 * relaxed rather than enforced to the point of a short rung — see below.
 */
const MAX_PER_PART = 2;

async function drawRung(level, exclude) {
  const skip = new Set((exclude || []).map(Number));
  const picked = [];

  /* Nearest first, alternating below then above: an item one level easier is a
     closer substitute than one two levels harder. */
  const i = Math.max(0, LADDER.indexOf(level));
  const order = [level];
  for (let d = 1; d < LADDER.length; d++) {
    if (LADDER[i - d]) order.push(LADDER[i - d]);
    if (LADDER[i + d]) order.push(LADDER[i + d]);
  }

  /* Two sweeps of the same ladder. The first holds the per-part cap, so a thin
     level cannot fill a rung with its one part; the second drops the cap and
     takes whatever is left. A rung of six mixed items beats a balanced rung of
     four, and a bank deep enough never reaches the second sweep. */
  for (const cap of [MAX_PER_PART, PER_RUNG]) {
    for (const alt of order) {
      if (picked.length >= PER_RUNG) break;
      await takeAtLevel(alt, skip, picked, PER_RUNG, cap);
    }
    if (picked.length >= PER_RUNG) break;
  }
  return picked;
}

/**
 * What the browser is allowed to see. Never the answer key.
 *
 * `hasAudio` was missing, and its absence was not cosmetic. The draw takes an
 * item from every part that has one — A and C, which are read, and E and F,
 * which are HEARD — so about half of an eighteen-item test was Part E asking a
 * learner to "type the sentence exactly as you hear it" above an empty text box,
 * and Part F asking them to "choose the best reply" to nothing. There was no
 * player, because this object never said there was anything to play.
 *
 * The recording itself is not named here. The key stays on the server and the
 * bytes come from the route below, so a placement item cannot be used to read an
 * arbitrary file out of the bank.
 */
function forClient(row) {
  return {
    questionId: row.id,
    part: row.part,
    type: row.type,
    prompt: row.prompt,
    options: jparse(row.options_json, null),
    hasAudio: !!row.audio_key
  };
}

/**
 * May this learner hear this item — is it one of the ones they were actually
 * asked? `asked_json` is the list the draw recorded, so an item that was never
 * put in front of them is refused, and so is every item once the test is done.
 */
async function mayHear(userId, questionId) {
  const row = await rowOf(userId);
  if (!row || row.status === 'done') return false;
  return jparse(row.asked_json, []).map(Number).includes(Number(questionId));
}

/* ------------------------------- The lifecycle ------------------------------- */

/** The learner's placement row, or null. */
function rowOf(userId) {
  return q.get('SELECT * FROM placements WHERE user_id = ?', userId);
}

/**
 * Does this account still owe a placement?
 *
 * Used by the page guard, so it has to be cheap and it has to be certain.
 *
 * The second half is not an optimisation, it is the migration. This test arrived
 * long after the platform had real accounts on it, and a learner who has already
 * sat a full paper has been measured by fifty-eight items under a clock —
 * strictly more evidence than eighteen. Sending them back to a placement would
 * be the platform asking a question it already knows the answer to, on the day
 * the feature shipped, to everybody at once.
 *
 * So: a finished placement means done for ever, and so does a submitted paper.
 * Only somebody the platform genuinely knows nothing about is stopped.
 */
async function needed(userId) {
  const row = await rowOf(userId);
  if (row) return row.status !== 'done';
  const sat = await q.val(
    "SELECT COUNT(*) c FROM attempts WHERE user_id = ? AND status = 'submitted'", userId);
  return !sat;
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

  /* A rung already on screen comes back as ITSELF.
     This is the resume the docblock above promises, and until rung_json existed
     the code did the opposite of it: drawRung() excludes everything in
     asked_json, so every reload dealt six BRAND NEW items, appended them, and
     left whatever the learner had been working on unreachable — a sitting could
     accumulate twenty-four "asked" items inside one six-item rung. Harmless
     while answer() marked anything it was sent; not harmless now that answer()
     marks only this rung, which is what makes this a fix and not a tidy-up. */
  const open = jparse(row.rung_json, []).map(Number);
  let items = [];
  if (open.length) {
    const rows = await q.all(
      `SELECT id, part, type, prompt, options_json, level, audio_key
         FROM questions WHERE id IN (${open.map(() => '?').join(',')})`, ...open);
    /* Back into the order they were dealt in: `IN (…)` returns them by id. */
    const byId = new Map(rows.map(r => [r.id, r]));
    items = open.map(id => byId.get(id)).filter(Boolean);
  }

  const asked = jparse(row.asked_json, []);
  if (!items.length) {
    items = await drawRung(row.level, asked);
    if (!items.length) {
      /* An empty bank at this level is a content problem, not a learner problem.
         Saying so beats handing back an empty test that cannot be finished. */
      return { error: 'no-items', level: row.level };
    }
    /* Recorded before they are answered, so a reload cannot draw a different six
       and quietly discard the ones already thought about. `rung_json` is the same
       list narrowed to THIS rung, which is what answer() will agree to mark. */
    await q.run('UPDATE placements SET asked_json = ?, rung_json = ? WHERE user_id = ?',
      JSON.stringify(asked.concat(items.map(i => i.id))),
      JSON.stringify(items.map(i => i.id)), userId);
  }

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

  /* Only the six items THIS rung served.
     Without the check the browser chooses what gets marked, and all three of
     these follow. The reply carries `rungRight`, the number of posted items that
     came back correct, so posting one unknown item with a guessed answer says
     whether the guess was right — an answer-key oracle over a bank shared with
     the real papers. `right` drives nextLevel() and settle(), so posting items
     whose answers are already known picks the placed level. And every marked
     item is written to skill_events at weight 1, the same weight as a timed
     paper, for work nobody did. server/drills.js and server/revision.js have
     always guarded this; this path was the one that did not.
     Scoped to the RUNG, not to asked_json: asked_json is the whole sitting, and
     matching against it would still let rung 1's six known-correct answers be
     replayed into rung 3. The fallback is for a sitting that was already in
     flight when rung_json arrived — one replay for those few beats marking their
     current rung zero and dropping them a level for it. */
  const scope = new Set(jparse(row.rung_json, []).map(Number));
  const dealt = scope.size ? scope : new Set(jparse(row.asked_json, []).map(Number));

  const list = Array.isArray(answers) ? answers : [];
  const given = new Map();
  for (const a of list) {
    const id = Number(a && a.questionId);
    if (Number.isFinite(id) && dealt.has(id)) given.set(id, String((a && a.answer) || ''));
  }
  /* Sent nothing, and sent nothing THIS RUNG CAN USE, are different situations
     and get different answers. The second one has an innocent cause worth naming:
     a second tab left open on rung 1 posts rung 1's ids while the account has
     moved on to rung 2. Marking those would score the wrong rung; scoring them
     zero would drop the learner a level for having two tabs open. Saying "reload"
     is the only one of the three that is true. */
  if (!given.size) return { error: list.length ? 'stale-rung' : 'no-answers' };

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
              placed_level = ?, placed_score = ?, rung_json = '[]' WHERE user_id = ?`,
      JSON.stringify(rights), nowISO(), placed.level, placed.score, userId);
    return { done: true, result: placed, rungRight: right, rungOf: PER_RUNG };
  }

  const level = nextLevel(row.level, right);
  await q.run('UPDATE placements SET rung = ?, level = ?, right_json = ? WHERE user_id = ?',
    row.rung + 1, level, JSON.stringify(rights), userId);

  const asked = jparse(row.asked_json, []);
  const items = await drawRung(level, asked);
  await q.run('UPDATE placements SET asked_json = ?, rung_json = ? WHERE user_id = ?',
    JSON.stringify(asked.concat(items.map(i => i.id))),
    JSON.stringify(items.map(i => i.id)), userId);

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
 * Read from the published blueprint rather than hardcoded here, so a change to
 * the exam does not leave this file quietly disagreeing with it.
 *
 * It disagreed with it anyway, for the whole life of the function. The walk was
 * `Object.values(formats)` looking for `f.parts`, and neither half was right:
 * the module exports `{FORMATS, partsOf, totalItems, …}`, so the values being
 * walked were a format LIST and a handful of functions, and a format carries
 * `sections`, not `parts`. Nothing ever matched, PART_SKILL stayed `{}`, and
 * every part fell through the old `|| 'reading'`.
 *
 * That default is what made it invisible. Part C really is reading, so the
 * mapping looked right wherever anybody spot-checked it. But A, B and D are
 * WRITING, E, F and G are LISTENING, and H, I and J are SPEAKING — the
 * blueprint says so — and all of them were being recorded as reading evidence.
 * Both callers are affected: the placement below, and the three drill paths in
 * server/drills.js. A learner who sat the placement and answered twelve
 * listening items was then shown "Nghe: chưa có" beside a reading band carrying
 * all eighteen.
 *
 * So the fallback is gone. A part with no entry is a question this cannot
 * answer, and answering it with a guess is what cost every learner their
 * listening and writing evidence. Callers get null; ability.record() drops an
 * event with no skill rather than filing it under the wrong one.
 */
let PART_SKILL = null;
function partSkillMap() {
  if (PART_SKILL) return PART_SKILL;
  PART_SKILL = {};
  try {
    const { FORMATS } = require('./data/exam-formats');
    for (const f of FORMATS || []) {
      for (const s of (f && f.sections) || []) {
        if (s.part && s.skill) PART_SKILL[s.part] = s.skill;
      }
    }
  } catch (e) {
    console.error('[placement] could not read the blueprint for part→skill', e);
  }
  /* Said out loud, because the silent version of this ran for the life of the
     function. An empty map means every event this file and server/drills.js
     produce is about to be filed under the wrong skill. */
  if (!Object.keys(PART_SKILL).length) {
    console.error('[placement] part→skill map is EMPTY — placement and drill events cannot be filed by skill');
  }
  return PART_SKILL;
}

function skillOfPart(part) {
  return partSkillMap()[part] || null;
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
  needed, start, answer, stateOf, resultOf, settle, nextLevel, drawRung, skillOfPart, mayHear,
  PER_RUNG, RUNGS, LADDER, START_LEVEL, UP_AT, DOWN_AT, INSTANT_TYPES
};
