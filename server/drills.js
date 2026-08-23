/**
 * Drills: a short paper for one part, drawn to fit the learner.
 *
 * Block 4. A full VPET paper is 58 items and an hour, which is the right thing
 * to sit occasionally and the wrong thing to do on a Tuesday evening. A drill is
 * six to ten items from ONE part, ten minutes, and it exists so that "Part C is
 * your weakest" can be followed by a button rather than by advice.
 *
 * ## It is chosen FROM the ability report, and it feeds back INTO it
 *
 * This is the connection the owner asked for, and it runs in both directions:
 *
 *   `suggest()` reads `server/ability.js` — the same estimate the progress panel
 *   shows — and offers the parts the roadmap already ranks worst first, at the
 *   level that estimate implies. Nothing here keeps its own opinion of how good
 *   somebody is; there is one ability model in this platform.
 *
 *   Every marked answer goes back through `ability.record()` as a `skill_event`,
 *   so ten minutes of drilling moves the progress panel, the roadmap and the next
 *   drill's level. A learner can watch the thing they were told to fix change.
 *
 * ## Three rules that make a drill worth sitting
 *
 * **Nothing you have just seen.** An item answered in the last 30 days — in a
 * drill OR in a real paper — is not offered again. Practising recall of an
 * answer you remember is practising nothing, and it inflates the estimate at the
 * same time, which is worse than wasting the time.
 *
 * **At the level you are, not the level of the paper.** The level comes from the
 * per-part estimate, so somebody at B2 on Part A and B1 on Part C gets different
 * material for each. Falls back the same way the placement does when the bank is
 * thin at a level, and says which levels it actually used.
 *
 * **Weighted below a real paper.** A drill is untimed by section, retryable and
 * sat at the learner's convenience; a sitting is not. Recording both at weight 1
 * would let somebody drill their way to a band they could not hold under exam
 * conditions — the estimate would be true about drills and false about the exam,
 * which is the only thing it is for.
 */
'use strict';

const { q, nowISO } = require('./db');
const ability = require('./ability');
const marking = require('./marking');
const placement = require('./placement');
const formats = require('./data/exam-formats');

/** How many items a drill holds. Ten minutes' worth, and the ceiling a request may ask for. */
const DEFAULT_SIZE = 6;
const MAX_SIZE = 10;

/** How long an item stays "just seen". */
const COOLDOWN_DAYS = 30;

/**
 * What a drill answer is worth against a real sitting.
 *
 * Not a guess dressed as one: 0.6 says a drill is worth rather more than half a
 * paper item and rather less than one. The exact number matters less than that
 * it is BELOW 1 and written down in one place — see the module note.
 */
const DRILL_WEIGHT = 0.6;

/** Machine-marked only, so a drill gives its feedback on the spot. */
const INSTANT_TYPES = ['mcq', 'gap'];

const jparse = (s, f) => { try { const v = JSON.parse(s); return v == null ? f : v; } catch { return f; } };
const clampInt = (v, lo, hi, dflt) => {
  const n = parseInt(v, 10);
  return Number.isFinite(n) ? Math.min(hi, Math.max(lo, n)) : dflt;
};

/**
 * Why this part is on the list, in one word the interface can label.
 *
 * Four cases, not three. "Not measured" used to cover both "there is no data"
 * and "there is data but not enough to be sure", which put the words
 * `Not measured yet - 6.5/10` on one line: a claim and its own contradiction,
 * side by side. Anybody reading that stops trusting both halves.
 */
function reasonFor(est) {
  if (!est || !est.n) return 'notMeasured';     // nothing at all
  if (!est.confident) return 'provisional';     // something, but not enough
  return est.score < 5 ? 'weakest' : 'belowTarget';
}

/* ------------------------------ Choosing what ------------------------------ */

/**
 * The level to drill this part at, from the ability model.
 *
 * A part with no data does NOT default to the middle. It defaults to whatever
 * the learner's overall placement said, because that is the best evidence there
 * is — and starting somebody at B1 on a part when everything else about them
 * says B2 wastes the first drill proving something already known.
 */
function levelFor(abilityData, part, fallback) {
  const est = (abilityData.parts || {})[part];
  const overall = abilityData.overall || {};
  const score = est && est.confident ? est.score
    : (overall.confident ? overall.score : null);
  if (score == null) return fallback || placement.START_LEVEL;
  /* The same three cut-offs the band table uses (docs/SCORING.md §1.1), one step
     coarser: what is wanted here is which shelf to take material from, not a
     certificate. */
  if (score >= 8.5) return 'C1';
  if (score >= 5.5) return 'B2';
  if (score >= 3.5) return 'B1';
  return 'A2';
}

/** Question ids this learner has met recently, whatever they met them in. */
async function recentlySeen(userId, days) {
  const since = new Date(Date.now() - (days || COOLDOWN_DAYS) * 86400e3).toISOString();
  /* From skill_events rather than from a drills-only table, deliberately: an
     item sat in a real paper last week is just as remembered as one drilled last
     week, and a cooldown that only knows about drills would serve it straight
     back. item_key is 'q<id>' by convention across every source. */
  const rows = await q.all(
    "SELECT DISTINCT item_key FROM skill_events WHERE user_id = ? AND at > ?", userId, since);
  const out = new Set();
  for (const r of rows) {
    const m = /^q(\d+)$/.exec(r.item_key || '');
    if (m) out.add(Number(m[1]));
  }
  return out;
}

/**
 * `size` items from one part, at `level`, avoiding `skip`.
 *
 * Widens to neighbouring levels when the bank is thin, exactly as the placement
 * does, and for the same reason — the alternative is a button that does nothing
 * for whoever is furthest ahead. If it still cannot fill after widening it
 * relaxes the cooldown as a LAST resort, because a repeated item is worse than
 * no drill only until there is no drill at all.
 */
async function drawItems(part, level, size, skip) {
  const picked = [];
  const holes = INSTANT_TYPES.map(() => '?').join(',');

  const take = async (lv, ignoreSkip) => {
    if (picked.length >= size) return;
    const rows = await q.all(
      `SELECT id, part, type, prompt, options_json, level, explanation
         FROM questions
        WHERE status = 'active' AND part = ? AND level = ? AND type IN (${holes})
        ORDER BY RANDOM() LIMIT 60`, part, lv, ...INSTANT_TYPES);
    for (const r of rows) {
      if (picked.length >= size) break;
      if (picked.some(p => p.id === r.id)) continue;
      if (!ignoreSkip && skip.has(r.id)) continue;
      picked.push(r);
    }
  };

  await take(level, false);

  if (picked.length < size) {
    const L = placement.LADDER;
    const i = Math.max(0, L.indexOf(level));
    for (let d = 1; d < L.length && picked.length < size; d++) {
      if (L[i - d]) await take(L[i - d], false);
      if (L[i + d]) await take(L[i + d], false);
    }
  }
  /* Only now, and it is recorded on the drill so the screen can be honest about
     it rather than quietly handing back last week's questions. */
  let repeated = false;
  if (!picked.length) {
    await take(level, true);
    repeated = picked.length > 0;
  }
  return { items: picked, repeated };
}

/**
 * What to drill next, worst first, ready to be turned into buttons.
 *
 * Straight from `ability.roadmap()` — the same ranking the progress panel and
 * the placement result screen show. Three lists that disagree about what is
 * weakest would be three lists nobody trusts.
 */
async function suggest(userId, weights, limit) {
  const cap = limit === undefined ? 3 : limit;
  const ab = await ability.abilityOf(userId);

  const counts = await q.all(
    `SELECT part, COUNT(*) c FROM questions
      WHERE status = 'active' AND part IS NOT NULL AND type IN (${INSTANT_TYPES.map(() => '?').join(',')})
      GROUP BY part`, ...INSTANT_TYPES);
  const have = new Map(counts.map(r => [r.part, r.c]));

  const row = (part, est) => ({
    part,
    level: levelFor(ab, part),
    score: est ? est.score : null,
    confident: est ? est.confident : false,
    needed: est ? est.needed : null,
    /* Why this one, in the words the learner will read. A ranked list with no
       reason beside it is a list people ignore. */
    reason: reasonFor(est),
    /* Said out loud rather than discovered by pressing a button that fails. */
    available: have.get(part) || 0
  });

  const out = ability.roadmap(ab, weights, 0.8, cap)
    .map(r => row(r.part, (ab.parts || {})[r.part]));

  /* Parts the model has never seen do not appear in `roadmap()` at all — it
     iterates over what it HAS data for. For a learner who has only just been
     placed that is most of the paper, and on the day they most need pointing
     somewhere the list came back empty. That was the whole feature failing at
     the one moment it mattered.
     So the shortfall is filled with the unmeasured parts, heaviest in the real
     paper first. It is the same principle the roadmap already runs on — the
     first thing to do about an unknown is go and measure it — applied to the
     parts that are not merely uncertain but absent. */
  if (out.length < cap) {
    const already = new Set(out.map(r => r.part));
    const unmeasured = [...have.keys()]
      .filter(p => !already.has(p) && !(ab.parts || {})[p])
      .sort((a, b) => ((weights && weights[b]) || 1) - ((weights && weights[a]) || 1));
    for (const p of unmeasured) {
      if (out.length >= cap) break;
      out.push(row(p, null));
    }
  }
  return out;
}

/**
 * All ten parts of the paper, whether or not any of them can be drilled.
 *
 * `suggest()` answers "what next" and caps at three. This answers a different
 * question: "what IS the exam, and where am I on each of it." The practise
 * screen showed three cards and hid the other seven parts behind a disclosure
 * triangle, which made a ten-part exam look like a three-item to-do list. A
 * candidate has to hold A to J in their head on the day; the screen should be
 * the same shape as the thing they are sitting.
 *
 * ## Honest about the six that cannot be drilled
 *
 * Only `INSTANT_TYPES` can be marked on the spot, which today is Parts A, C, E
 * and F. B and D are e-mails and G, H, I and J are spoken: they need the
 * writing and speaking markers, which need a full sitting. Rather than hide
 * them, or worse offer a button that fails, each is returned with
 * `drillable: false` and the reason, so the screen can say what it actually
 * takes to get a score there. A part the learner cannot see is a part they will
 * not prepare for.
 *
 * The blueprint is read from `server/data/exam-formats.js` rather than typed
 * out again here, so a change to the paper reaches this screen on its own.
 */
async function overview(userId, weights) {
  const ab = await ability.abilityOf(userId);

  const counts = await q.all(
    `SELECT part, COUNT(*) c FROM questions
      WHERE status = 'active' AND part IS NOT NULL AND type IN (${INSTANT_TYPES.map(() => '?').join(',')})
      GROUP BY part`, ...INSTANT_TYPES);
  const have = new Map(counts.map(r => [r.part, r.c]));

  /* Position in the recommendation, so the screen can promote two or three
     without inventing a second ranking. Same call the plan and the progress
     panel make, so all three agree about what is worst. */
  const ranked = ability.roadmap(ab, weights, 0.8, 3).map(r => r.part);

  const letters = formats.partsOf('vpet');
  return letters.map(part => {
    const sec = formats.sectionOfPart('vpet', part) || {};
    const est = (ab.parts || {})[part];
    const available = have.get(part) || 0;
    /* What the part is marked by, which is what decides whether a six-item
       drill is even possible. Taken from the blueprint's own type list. */
    const types = sec.types || [];
    const needs = types.includes('speaking') ? 'speaking'
      : types.includes('essay') ? 'writing' : null;
    return {
      part,
      /* The blueprint stores "Part A - Sentence Completion"; the letter is
         already the card's headline, so it would read twice. */
      name: String(sec.name || '').replace(/^Part\s+\w+\s*-\s*/, ''),
      asks: sec.type || null,
      skill: sec.skill || null,
      items: sec.items || null,
      minutes: sec.minutes || null,
      drillable: available > 0,
      available,
      needs,
      level: levelFor(ab, part),
      score: est ? est.score : null,
      confident: est ? est.confident : false,
      n: est ? est.n : 0,
      reason: reasonFor(est),
      /* 1-based so the screen can print it, null when not recommended. */
      rank: ranked.indexOf(part) >= 0 ? ranked.indexOf(part) + 1 : null
    };
  });
}

/* -------------------------------- Sitting one -------------------------------- */

function forClient(row) {
  return {
    questionId: row.id, part: row.part, type: row.type,
    prompt: row.prompt, options: jparse(row.options_json, null)
  };
}

async function start(userId, opts) {
  const o = opts || {};
  const part = String(o.part || '').trim().toUpperCase();
  if (!/^[A-J]$/.test(part)) return { error: 'bad-part' };
  const size = clampInt(o.size, 3, MAX_SIZE, DEFAULT_SIZE);

  const ab = await ability.abilityOf(userId);
  const level = /^(A2|B1|B2|C1)$/.test(String(o.level || '')) ? o.level : levelFor(ab, part);

  const skip = await recentlySeen(userId);
  const { items, repeated } = await drawItems(part, level, size, skip);
  if (!items.length) return { error: 'no-items', part, level };

  const res = await q.run(
    `INSERT INTO drills (user_id, part, level, size, item_ids_json, status, started_at)
     VALUES (?,?,?,?,?, 'open', ?)`,
    userId, part, level, items.length, JSON.stringify(items.map(i => i.id)), nowISO());

  return {
    drillId: Number(res.lastInsertRowid),
    part, level, repeated,
    usedLevels: [...new Set(items.map(i => i.level))],
    items: items.map(forClient)
  };
}

/**
 * Mark a finished drill and write it into the ability model.
 *
 * The whole drill is marked in one call rather than item by item. That is not
 * only fewer round trips: a drill is a unit of practice, and showing the answer
 * to item three before item four is answered turns it into a quiz where the
 * later items are informed by the earlier ones.
 */
async function submit(userId, drillId, answers) {
  const d = await q.get('SELECT * FROM drills WHERE id = ? AND user_id = ?', drillId, userId);
  if (!d) return { error: 'not-found' };
  if (d.status === 'done') return { error: 'already-done' };

  const ids = jparse(d.item_ids_json, []);
  const given = new Map();
  for (const a of Array.isArray(answers) ? answers : []) {
    const id = Number(a && a.questionId);
    /* Only the items this drill actually served. Without the check, a client can
       post answers to anything in the bank and farm skill_events for items it
       chose itself. */
    if (ids.includes(id)) given.set(id, String((a && a.answer) || ''));
  }

  const rows = ids.length
    ? await q.all(
        `SELECT id, part, type, level, answer, prompt, explanation
           FROM questions WHERE id IN (${ids.map(() => '?').join(',')})`, ...ids)
    : [];

  const at = nowISO();
  const events = [];
  const detail = [];
  let earned = 0, max = 0;

  for (const row of rows) {
    const mine = given.has(row.id) ? given.get(row.id) : '';
    const mark = marking.markItem({ type: row.type, answer: row.answer }, mine);
    if (!mark) continue;
    earned += mark.earned; max += mark.max;
    await q.run(
      `INSERT INTO drill_answers (drill_id, question_id, answer, earned, max_score, note)
       VALUES (?,?,?,?,?,?)
       ON CONFLICT(drill_id, question_id) DO UPDATE SET
         answer=excluded.answer, earned=excluded.earned,
         max_score=excluded.max_score, note=excluded.note`,
      drillId, row.id, mine, mark.earned, mark.max, mark.note);
    events.push({
      user_id: userId, source: 'drill', ref_id: 'drill:' + drillId, item_key: 'q' + row.id,
      skill: placement.skillOfPart(row.part), part: row.part, level: row.level,
      earned: mark.earned, max_score: mark.max, weight: DRILL_WEIGHT, at
    });
    detail.push({
      questionId: row.id, prompt: row.prompt, given: mine,
      right: mark.earned > 0,
      /* The answer key IS returned here, and only here. Before submitting it
         would be cheating; afterwards, withholding it is the difference between
         practice and a score. The item is on cooldown for 30 days anyway. */
      answer: row.answer,
      explanation: row.explanation || null
    });
  }

  const wrote = await ability.record(events);

  await q.run(
    "UPDATE drills SET status='done', done_at=?, earned=?, max_score=? WHERE id=?",
    at, earned, max, drillId);

  return {
    drillId, part: d.part, level: d.level,
    earned, max,
    score: max ? Math.round((earned / max) * 10 * 2) / 2 : null,
    /* Returned so a caller — and the test — can see that the ability model
       really took them, rather than trusting that it did. */
    recorded: wrote,
    detail
  };
}

/** One drill, for a screen that reloads. */
async function get(userId, drillId) {
  const d = await q.get('SELECT * FROM drills WHERE id = ? AND user_id = ?', drillId, userId);
  if (!d) return null;
  const ids = jparse(d.item_ids_json, []);
  const rows = ids.length
    ? await q.all(`SELECT id, part, type, prompt, options_json FROM questions WHERE id IN (${ids.map(() => '?').join(',')})`, ...ids)
    : [];
  return {
    drillId: d.id, part: d.part, level: d.level, status: d.status,
    earned: d.earned, max: d.max_score,
    items: d.status === 'done' ? [] : rows.map(forClient)
  };
}

/** The last few, for a screen that wants to show progress rather than a number. */
function history(userId, limit) {
  return q.all(
    `SELECT id drillId, part, level, earned, max_score max, done_at doneAt
       FROM drills WHERE user_id = ? AND status = 'done'
      ORDER BY done_at DESC LIMIT ?`, userId, clampInt(limit, 1, 50, 10));
}

module.exports = {
  suggest, overview, start, submit, get, history,
  levelFor, recentlySeen, drawItems,
  DEFAULT_SIZE, MAX_SIZE, COOLDOWN_DAYS, DRILL_WEIGHT, INSTANT_TYPES
};
