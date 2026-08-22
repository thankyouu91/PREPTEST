/**
 * What this learner can actually do — one estimate, from every graded thing.
 *
 * ## The problem this exists to prevent
 *
 * The dashboard used to show a ring reading "5/8 tests unlocked" under the
 * heading "Your progress", and four skill bars measuring *how many unlocked
 * papers happen to contain that skill*. Somebody who bought five tests and sat
 * none of them saw a healthy dashboard. That is not progress; it is inventory.
 *
 * The deeper version of the same mistake is coming, and it is worth naming
 * before it arrives: five features that each keep their own score. The exam has
 * `attempt_scores`, the drills would have a table, vocabulary would have its
 * SRS counters, writing would have rubric marks, speaking another. Five numbers
 * for one person, none agreeing, and the progress panel picking one to believe.
 *
 * So: **one table of graded events, one estimator, many readers.** Everything
 * that is marked anywhere writes a `skill_events` row. The progress ring, the
 * post-test report, the revision roadmap, the drill picker and the band display
 * all read the estimate this file produces. Nothing keeps a second opinion.
 *
 * ## The estimator, and why this one
 *
 * A Beta-Binomial posterior with time decay. Three properties, each solving a
 * real complaint about naive "percentage correct":
 *
 *   **Decay (half-life 30 days).** Somebody strong at Part C in March who then
 *   stopped for three months is not strong at Part C. An unweighted average
 *   says they are, for ever. Each event's weight halves every 30 days, so the
 *   estimate describes the learner now rather than the learner's history.
 *
 *   **A prior of 2/2.** Three correct answers out of three is not 100%. Under
 *   this prior it is 5/7 - about 71% - with a wide interval. Small samples are
 *   where confident-looking numbers do the most damage, and a learner told they
 *   are C1 after five questions finds out otherwise on exam day.
 *
 *   **`sd` is a speaking limit, not decoration.** Below the confidence
 *   threshold the honest output is not a lower number, it is *no band at all*
 *   plus "we need about N more items here". `bandOf()` returns `null` for the
 *   band in that case, deliberately, so a caller cannot render a number the
 *   data does not support without noticing it is doing so.
 *
 * ## Shape
 *
 * `estimate()` and everything above it are pure functions over plain event
 * objects: no database, no clock of their own. That is what lets the maths be
 * tested against hand-computed values rather than against itself. The reading
 * and writing lives at the bottom of the file, in three thin functions.
 */
'use strict';

const { q, nowISO } = require('./db');

/** Weight halves every 30 days. Long enough that a fortnight off does not erase
    a month of work, short enough that a term-old result stops dominating. */
const HALF_LIFE_DAYS = 30;

/** A "don't know" prior worth two right and two wrong. Small enough that thirty
    real items overwhelm it, large enough that three do not. */
const PRIOR_A = 2;
const PRIOR_B = 2;

/**
 * The posterior standard deviation at which a band may be stated.
 *
 * 0.06 is not arbitrary. At p near 0.5, where the posterior is widest and the
 * requirement therefore strictest, sd ≈ sqrt(0.25 / (A+B+1)); setting that to
 * 0.06 needs about 70 weighted observations - roughly one full VPET sitting
 * plus a little, or two or three focused drill sets. That is about the point at
 * which a half-band claim is defensible rather than flattering.
 */
const CONFIDENT_SD = 0.06;

/** How much of an event still counts, given how long ago it was. */
function decay(atISO, nowMs) {
  const t = Date.parse(atISO);
  if (!Number.isFinite(t)) return 1;              // undated: treat as current
  const days = Math.max(0, (nowMs - t) / 86400000);
  return Math.pow(0.5, days / HALF_LIFE_DAYS);
}

/**
 * The posterior for one bucket of events.
 *
 * `events` are `{ earned, max_score, weight, at }`. Anything with a
 * non-positive `max_score` is skipped rather than counted as a failure: an item
 * worth nothing tells you nothing, and dividing by it is how a single bad row
 * drags a whole skill to zero.
 */
function estimate(events, now) {
  const nowMs = now === undefined ? Date.now() : now;
  let A = PRIOR_A, B = PRIOR_B, n = 0, weighted = 0, newest = 0;

  for (const e of events || []) {
    const max = Number(e.max_score);
    if (!(max > 0)) continue;
    const earned = Math.min(Math.max(Number(e.earned) || 0, 0), max);
    const w = decay(e.at, nowMs) * (Number(e.weight) || 1);
    if (!(w > 0)) continue;
    /* Normalised to one "observation" per item regardless of how many marks the
       item carries. Without this a 10-mark essay would count ten times as hard
       as a 1-mark gap-fill towards CONFIDENCE, not merely towards the score -
       and confidence is about how many independent things you have seen. */
    A += w * (earned / max);
    B += w * (1 - earned / max);
    n += 1;
    weighted += w;
    const t = Date.parse(e.at);
    if (Number.isFinite(t) && t > newest) newest = t;
  }

  const total = A + B;
  const p = A / total;
  const sd = Math.sqrt((A * B) / (total * total * (total + 1)));
  return {
    p, sd, n, weighted,
    lastAt: newest ? new Date(newest).toISOString() : null,
    confident: sd <= CONFIDENT_SD,
    /* Roughly how many more items of this kind before a band can be stated.
       Derived from the same relation as CONFIDENT_SD, floored at 0 and rounded
       up, so "5 more" never displays as "4.3 more". */
    needed: sd <= CONFIDENT_SD ? 0
      : Math.max(1, Math.ceil((A * B) / (total * total * CONFIDENT_SD * CONFIDENT_SD) - total - 1))
  };
}

/** The 95% interval, clamped to [0,1] — a proportion cannot be 1.05. */
function interval(est) {
  const half = 1.96 * est.sd;
  return [Math.max(0, est.p - half), Math.min(1, est.p + half)];
}

/** VPET's own scale: 0-10 in steps of 0.5, the same rounding as `linearScale`
    in server/marking.js. Kept as one line here rather than imported, because
    importing marking.js from ability.js and ability.js from marking.js is a
    cycle, and this is the whole of the shared arithmetic. */
const toTen = p => Math.round(Math.max(0, Math.min(1, p)) * 10 * 2) / 2;

/**
 * What to show a learner: a band, or an honest refusal to name one.
 *
 * `band` is `null` whenever the data does not support a claim. That is a
 * deliberate shape: a caller that renders `band` without checking gets an
 * obvious blank rather than a confident wrong number, and a caller that does
 * check has `needed` to tell the learner what would fix it.
 */
function bandOf(est) {
  const [lo, hi] = interval(est);
  return {
    score: toTen(est.p),
    low: toTen(lo),
    high: toTen(hi),
    confident: est.confident,
    needed: est.needed,
    band: est.confident ? vstepBand(toTen(est.p)) : null
  };
}

/** The 6-level Vietnamese framework, as `docs/SCORING.md` §1.1 states it.
    Below 3.5 no certificate is issued, so there is no band to name. */
function vstepBand(ten) {
  if (ten >= 8.5) return 'C1';
  if (ten >= 5.5) return 'B2';
  if (ten >= 3.5) return 'B1';
  return null;
}

/* ============================ Reading and writing ============================ */

/** The four exam skills, plus the two the revision area grades on its own. */
const SKILLS = ['listening', 'reading', 'writing', 'speaking', 'grammar', 'vocabulary'];

/**
 * Record graded work. One row per item, from wherever it was graded.
 *
 * Idempotent by `(source, ref_id, item_key)`: marking a paper is safe to run
 * more than once — `markAttempt` says so in as many words — and a re-mark that
 * appended a second set of events would double every score it touched.
 */
async function record(events) {
  const at = nowISO();
  let written = 0;
  for (const e of events) {
    /* Skipped rather than stored: an event worth nothing out of nothing moves no
       estimate and would only dilute the count. */
    if (!(Number(e.max_score) > 0)) continue;
    written++;
    await q.run(
      `INSERT INTO skill_events
         (user_id, source, ref_id, item_key, skill, part, topic, level, earned, max_score, weight, at)
       VALUES (?,?,?,?,?,?,?,?,?,?,?,?)
       ON CONFLICT(source, ref_id, item_key) DO UPDATE SET
         earned=excluded.earned, max_score=excluded.max_score,
         weight=excluded.weight, skill=excluded.skill, part=excluded.part,
         topic=excluded.topic, level=excluded.level, at=excluded.at`,
      e.user_id, e.source, String(e.ref_id), String(e.item_key), e.skill,
      e.part || null, e.topic || null, e.level || null,
      Number(e.earned) || 0, Number(e.max_score), Number(e.weight) || 1,
      e.at || at);
  }
  /* What was WRITTEN, not what was offered.
     This returned `events.length` and that made a real bug silent. A caller
     building events with the wrong field names — `max` instead of `max_score`,
     say — has every one of them skipped by the guard above, and was then told
     the full number had been recorded. It cost an afternoon on the placement
     test, whose whole purpose is to put events here; the ability model stayed
     empty while the code that filled it reported eighteen. A count that cannot
     disagree with reality is not a count. */
  return written;
}

/**
 * Everything known about one learner, grouped the three ways the product asks.
 *
 * One query, grouped in JavaScript, rather than three queries with three
 * GROUP BYs. The rows are already the smallest thing they can be, the estimator
 * has to see individual events to decay them, and a per-part SQL aggregate
 * could not apply the decay at all — SUM(earned) has already thrown away when.
 */
async function abilityOf(userId, now) {
  const rows = await q.all(
    `SELECT skill, part, level, topic, earned, max_score, weight, at
       FROM skill_events WHERE user_id = ? ORDER BY at DESC LIMIT 20000`, userId);

  const bucket = (map, key, row) => {
    if (!key) return;
    if (!map.has(key)) map.set(key, []);
    map.get(key).push(row);
  };
  const bySkill = new Map(), byPart = new Map(), byTopic = new Map();
  for (const r of rows) {
    bucket(bySkill, r.skill, r);
    bucket(byPart, r.part, r);
    bucket(byTopic, r.topic, r);
  }

  const out = (map) => {
    const o = {};
    for (const [k, evs] of map) {
      const est = estimate(evs, now);
      o[k] = { ...bandOf(est), n: est.n, lastAt: est.lastAt, sd: est.sd };
    }
    return o;
  };

  /* Overall is computed from the four exam skills only. Grammar and vocabulary
     are diagnostic dimensions of the revision area, not things VPET scores, and
     folding them into an overall band would produce a number that does not
     correspond to any exam anybody sits. */
  const examEvents = rows.filter(r => ['listening', 'reading', 'writing', 'speaking'].includes(r.skill));
  const overall = estimate(examEvents, now);

  return {
    overall: { ...bandOf(overall), n: overall.n, lastAt: overall.lastAt, sd: overall.sd },
    skills: out(bySkill),
    parts: out(byPart),
    topics: out(byTopic),
    events: rows.length
  };
}

/**
 * What to revise next, worst first.
 *
 * Three factors, and each one earns its place:
 *
 *   `target − p` — how far short this is. Nothing else matters if it is zero.
 *   `share`      — how much of the real paper this part is worth. Being weak at
 *                  a 3-item part and a 12-item part are not the same problem,
 *                  and a list that treats them alike sends people to the wrong
 *                  one.
 *   `1 + sd`     — pushes the parts we know LEAST about upwards. The first
 *                  thing to do about an unknown is to go and measure it, and
 *                  without this term a part with no data sits at p=0.5 for ever
 *                  and never gets recommended strongly enough to change that.
 *
 * `limit` is 3 by default on purpose. A ten-item plan is a list people close.
 */
function roadmap(ability, weights, target, limit) {
  const goal = target === undefined ? 0.8 : target;
  const cap = limit === undefined ? 3 : limit;
  const rows = [];
  for (const [part, est] of Object.entries(ability.parts || {})) {
    const share = (weights && weights[part]) || 1;
    const gap = Math.max(0, goal - est.score / 10);
    rows.push({
      part,
      score: est.score,
      confident: est.confident,
      needed: est.needed,
      priority: gap * share * (1 + est.sd)
    });
  }
  rows.sort((a, b) => b.priority - a.priority);
  return rows.slice(0, cap);
}

module.exports = {
  estimate, interval, bandOf, vstepBand, decay, toTen, roadmap,
  record, abilityOf,
  SKILLS, HALF_LIFE_DAYS, PRIOR_A, PRIOR_B, CONFIDENT_SD
};
