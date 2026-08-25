/**
 * Which of the two VPET papers a learner should sit, and why.
 *
 * VPET is two instruments. Level 1 measures A1 to B1+; Level 2 measures B1+ to
 * C2. Neither can see outside its range, so choosing the wrong one wastes an
 * hour and returns a number that means less than it appears to:
 *
 *   Too easy   Everything correct, and the report says B1+ — which is the top
 *              of the paper, not the top of the candidate. They learn that they
 *              beat the test and nothing about themselves.
 *   Too hard   Almost nothing correct, and the report can only say "at most
 *              B1+". Their actual level might be A2 or B1; this paper cannot
 *              tell those apart, because everything on it is pitched above them.
 *
 * Both failures look like a result. That is what makes this worth a module
 * rather than a sentence on a page.
 *
 * ## What it reads
 *
 * In order of how much it is worth trusting:
 *
 *   1. A finished sitting. The strongest evidence there is — a whole paper
 *      under exam conditions, marked by the same engine that will mark the next
 *      one. If they hit the ceiling of Level 1, the next paper is Level 2; if
 *      they hit the floor of Level 2, it is Level 1.
 *   2. The ability estimate. server/ability.js is the only thing on this
 *      platform with an opinion about how good somebody is, and this does not
 *      start a second one — it reads that estimate together with the DIFFICULTY
 *      of the material the estimate came from, which is the part that decides
 *      what the number means.
 *   3. Nothing at all. Level 1, and the reason is asymmetric: Level 1 measures
 *      down to A1, so a strong candidate who sits it learns they have outgrown
 *      it in one sitting. A weak candidate who sits Level 2 learns nothing at
 *      all. When in doubt the cheaper mistake is the easier paper.
 */
'use strict';

const { q } = require('./db');
const bands = require('./bands');
const ability = require('./ability');

/** The paper each level is sat on. */
const PAPER = { 1: 'vpet-b1-01', 2: 'vpet-c1-01' };

/**
 * Scoring at or above this on Level 1 means the paper has stopped measuring.
 *
 * Level 1 runs to GSE 58 and B1+ starts at 51, so 9.0 out of 10 is where the
 * report can no longer distinguish one strong candidate from another — every
 * mark from here up returns the same band. That is the definition of a ceiling,
 * and it is read off server/bands.js rather than picked, so the two cannot
 * drift apart.
 */
const LEVEL1_CEILING = (() => {
  for (let s = 10; s >= 0; s -= 0.5) {
    if (!bands.bandFor(s, { family: 'vpet', level: 'B1' }).atCeiling) return s + 0.5;
  }
  return 9;
})();

/**
 * Below this on Level 2, the paper has bottomed out.
 *
 * Same derivation from the other end: the marks that land in Level 2's lowest
 * band, where it can only report "at most B1+".
 */
const LEVEL2_FLOOR = (() => {
  for (let s = 0; s <= 10; s += 0.5) {
    if (!bands.bandFor(s, { family: 'vpet', level: 'B2' }).atFloor) return s;
  }
  return 2.5;
})();

/** The most recent finished VPET sitting, with its paper's level and its mark. */
async function lastSitting(userId) {
  return q.get(
    `SELECT a.id, t.id AS testId, t.level, s.scaled, s.pending
       FROM attempts a
       JOIN tests t ON t.id = a.test_id
       JOIN attempt_scores s ON s.attempt_id = a.id AND s.skill = 'overall'
      WHERE a.user_id = ? AND a.status = 'submitted' AND t.family_id = 'vpet'
        AND s.pending = 0 AND s.scaled IS NOT NULL
      ORDER BY a.submitted_at DESC LIMIT 1`, userId);
}

/**
 * How hard the material behind the ability estimate was.
 *
 * A 7/10 built entirely from B1 drills and a 7/10 built from C1 drills are not
 * the same claim about a person, and the estimate alone cannot tell them apart.
 * `skill_events` carries the level of every item, so the answer is already in
 * the data — this only has to look.
 */
async function materialLevel(userId) {
  const rows = await q.all(
    `SELECT level, COUNT(*) n FROM skill_events
      WHERE user_id = ? AND level IS NOT NULL GROUP BY level`, userId);
  if (!rows.length) return null;
  /* The same scale server/ability.js labels its own estimates with. Imported
     rather than copied: two rankings of the CEFR levels is how two parts of a
     platform come to disagree about what B2 is. */
  let total = 0, weighted = 0;
  for (const r of rows) {
    const v = ability.LEVEL_RANK[String(r.level).toUpperCase()];
    if (!v) continue;
    total += r.n; weighted += v * r.n;
  }
  return total ? weighted / total : null;
}

/**
 * Which paper to sit next.
 *
 * Returns `{ level, testId, why, confident, evidence }`. `why` is a key rather
 * than a sentence so the interface can say it in either language; every one of
 * them is a claim about evidence this function actually saw.
 */
async function recommendLevel(userId) {
  const at = { level: 1, testId: PAPER[1], confident: false, evidence: {} };

  const last = await lastSitting(userId);
  if (last) {
    const lvl = bands.vpetLevelOf(last.level);
    at.evidence = { from: 'sitting', paperLevel: lvl, score: last.scaled, testId: last.testId };

    if (lvl === 1 && last.scaled >= LEVEL1_CEILING) {
      return { ...at, level: 2, testId: PAPER[2], confident: true, why: 'toppedOutLevel1' };
    }
    if (lvl === 2 && last.scaled < LEVEL2_FLOOR) {
      return { ...at, level: 1, testId: PAPER[1], confident: true, why: 'bottomedOutLevel2' };
    }
    /* Neither end. The paper they sat is measuring them, so it is the right
       one to sit again — a recommendation to switch would throw away the only
       comparable number they have. */
    return { ...at, level: lvl, testId: PAPER[lvl], confident: true, why: 'paperFits' };
  }

  /* No sitting. Fall back to the estimate, and read it against the difficulty
     of what produced it. */
  const ab = await ability.abilityOf(userId);
  const overall = (ab && ab.skills) ? Object.values(ab.skills) : [];
  const measured = overall.filter(s => s && s.n > 0);
  if (!measured.length) {
    return { ...at, why: 'noData', evidence: { from: 'none' } };
  }

  const mean = measured.reduce((t, s) => t + (s.score || 0), 0) / measured.length;
  const hardness = await materialLevel(userId);
  at.evidence = { from: 'ability', score: Math.round(mean * 10) / 10, materialLevel: hardness };

  /* Strong on material that was already B2 or above is the case for the harder
     paper. Strong on B1 material is not: it says they have mastered Level 1
     content, which Level 1 is built to measure. */
  if (hardness !== null && hardness >= 4 && mean >= 7) {
    return { ...at, level: 2, testId: PAPER[2], confident: measured.every(s => s.confident), why: 'strongOnHardMaterial' };
  }
  return { ...at, why: 'startAtLevel1', confident: false };
}

module.exports = { recommendLevel, materialLevel, lastSitting, PAPER, LEVEL1_CEILING, LEVEL2_FLOOR };
