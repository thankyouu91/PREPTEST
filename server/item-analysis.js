/**
 * Item analysis — the statistics that turn a written item bank into a measured one.
 *
 * docs/ACADEMIC.md §7 says plainly that no reliability can be claimed because
 * there is no candidate data. This module is what gets run the moment there is:
 * facility, discrimination, distractor behaviour, internal consistency, and the
 * standard error that lets a report say "55, give or take 3" instead of "55".
 *
 * ---------------------------------------------------------------------------
 * THE GUARD THAT MATTERS MOST
 *
 * Every function returns `reliable: false` below a minimum sample, and the
 * caller is expected to refuse to act on the number rather than round it and
 * move on. A facility of 0.62 computed from nine candidates is noise wearing
 * the clothes of data, and it is more dangerous than no statistic at all —
 * because somebody will retire a good item on the strength of it.
 *
 * The thresholds come from docs/ACADEMIC.md §9 and are deliberately not
 * configurable per call. A caller who could lower the bar would lower it.
 * ---------------------------------------------------------------------------
 *
 * Everything here is a pure function over arrays. No database, no I/O — so the
 * maths can be tested against hand-worked examples, which is the only way to
 * be sure a statistics module is right.
 */
'use strict';

/* Minimum sample before a statistic is worth reporting (docs/ACADEMIC.md §9).
   Below these, the value is still computed — hiding it would make debugging
   impossible — but flagged so nothing downstream treats it as evidence. */
const MIN_N = {
  facility: 100,
  discrimination: 100,
  distractor: 100,
  alpha: 200
};

/* Interpretation bands. These are conventional in classical test theory rather
   than derived, and they exist here so that two people reading the same report
   reach the same conclusion about an item. */
const DISCRIMINATION_BANDS = [
  { min: 0.40, verdict: 'excellent', action: 'keep' },
  { min: 0.30, verdict: 'good', action: 'keep' },
  { min: 0.20, verdict: 'acceptable', action: 'keep' },
  { min: 0.15, verdict: 'marginal', action: 'review' },
  { min: 0.00, verdict: 'poor', action: 'retire' },
  { min: -Infinity, verdict: 'negative', action: 'fix-key' }
];

const mean = xs => xs.reduce((a, b) => a + b, 0) / xs.length;

/** Population standard deviation. Population, not sample: these are all the
    candidates who sat it, not a sample drawn from them. */
function sd(xs) {
  if (xs.length < 2) return 0;
  const m = mean(xs);
  return Math.sqrt(xs.reduce((a, x) => a + (x - m) ** 2, 0) / xs.length);
}

function variance(xs) {
  if (xs.length < 2) return 0;
  const m = mean(xs);
  return xs.reduce((a, x) => a + (x - m) ** 2, 0) / xs.length;
}

/* ------------------------------------------------------------------ */

/**
 * Facility — how much of the available credit the group earned.
 *
 * Often called the difficulty index, which is backwards: a high p-value means
 * an easy item. Named `facility` here for exactly that reason.
 *
 * `max` is what makes this work for a rubric-marked item as well as a
 * right/wrong one. Scoring an essay out of 6 and then asking "what proportion
 * passed?" would need a cut score, and every cut score is a decision nobody
 * made: set it at 4 and a part where the group averages 3.6 reads as *too hard
 * — separates nobody*, which is false and would retire a perfectly good item.
 * Mean over maximum keeps the whole distribution.
 *
 * @param {number[]} scores per candidate: 1/0, or a rubric mark
 * @param {number}   max    highest mark available (1 for right/wrong)
 */
function facility(scores, max = 1) {
  const n = scores.length;
  if (!n) return { p: null, n: 0, reliable: false, verdict: 'no data' };
  if (!(max > 0)) throw new Error('max score must be positive');

  const m = mean(scores);
  const p = m / max;
  /* An item everybody gets right and an item nobody gets right both separate
     nobody from anybody. They are not "easy" and "hard" — they are silent. */
  const verdict =
    p >= 0.95 ? 'too easy — separates nobody' :
    p <= 0.15 ? 'too hard — separates nobody' :
    p >= 0.85 ? 'easy' :
    p <= 0.30 ? 'hard' : 'well targeted';

  return { p, n, meanScore: m, max, reliable: n >= MIN_N.facility, verdict };
}

/**
 * Discrimination — the corrected item-rest correlation.
 *
 * Does this item agree with the rest of the section about who is stronger? The
 * correction matters: correlating an item against a total that includes it
 * guarantees a positive result, which is the most common way this statistic is
 * computed wrongly and the reason a broken item can look fine.
 *
 * Pearson rather than the (M₁−M₀)/S·√pq point-biserial shortcut. For a
 * right/wrong item the two are algebraically the same number — but the
 * shortcut is only defined when the item is right/wrong, and half of VPET is
 * marked 0–6 against a rubric. One formula that covers both beats two that
 * have to be dispatched between, and the dispatch is where the bug would be.
 *
 * @param {number[]} itemScores   this item's mark per candidate
 * @param {number[]} totalScores  each candidate's total across the section
 */
function discrimination(itemScores, totalScores) {
  const n = itemScores.length;
  if (n !== totalScores.length) throw new Error('itemScores and totalScores differ in length');
  if (n < 3) return { r: null, n, reliable: false, verdict: 'no data', action: 'wait' };

  /* Subtract the item from the total so it is not correlated with itself. */
  const rest = totalScores.map((t, i) => t - itemScores[i]);

  /* Everybody scored the same on this item: it told us nothing about anybody,
     and the correlation is undefined rather than zero. Saying so beats
     returning 0 and letting a reader think it was measured. */
  const si = sd(itemScores);
  if (si === 0) return { r: null, n, reliable: false, verdict: 'no variance', action: 'retire' };

  const sr = sd(rest);
  if (sr === 0) return { r: null, n, reliable: false, verdict: 'no variance in total', action: 'wait' };

  const mi = mean(itemScores), mr = mean(rest);
  const cov = itemScores.reduce((a, x, i) => a + (x - mi) * (rest[i] - mr), 0) / n;
  const r = cov / (si * sr);

  const band = DISCRIMINATION_BANDS.find(b => r >= b.min);
  return { r, n, reliable: n >= MIN_N.discrimination, verdict: band.verdict, action: band.action };
}

/**
 * Distractor analysis — how each option behaved.
 *
 * Two findings are worth acting on and neither is visible from facility alone:
 * an option nobody chose is a wasted line that makes the item easier than it
 * looks, and an option chosen by candidates who score well overall is a sign
 * the key is wrong or the option is defensible.
 *
 * @param {string[]} chosen  the option each candidate picked
 * @param {string[]} options every option, in order
 * @param {string}   key     the correct option
 * @param {number[]} totals  each candidate's total score
 */
function distractorAnalysis(chosen, options, key, totals) {
  const n = chosen.length;
  if (!n) return { n: 0, reliable: false, options: [] };

  const keyMean = (() => {
    const picked = totals.filter((_, i) => chosen[i] === key);
    return picked.length ? mean(picked) : null;
  })();

  const rows = options.map(opt => {
    const idx = chosen.map((c, i) => (c === opt ? i : -1)).filter(i => i >= 0);
    const share = idx.length / n;
    const avg = idx.length ? mean(idx.map(i => totals[i])) : null;
    const isKey = opt === key;

    let verdict = 'working';
    if (isKey) {
      verdict = share >= 0.95 ? 'chosen by almost everyone' :
                share <= 0.15 ? 'chosen by almost nobody' : 'working';
    } else if (share === 0) {
      verdict = 'dead — nobody chose it';
    } else if (share < 0.05) {
      verdict = 'weak — rarely chosen';
    } else if (keyMean != null && avg != null && avg > keyMean) {
      /* The strongest candidates preferred a distractor. Nearly always a
         flawed key or a second defensible answer, and almost never a hard
         item — which is why the verdict says so rather than hedging. */
      verdict = 'attracts stronger candidates than the key — check the key';
    }

    return { option: opt, isKey, share, meanTotal: avg, verdict };
  });

  return { n, reliable: n >= MIN_N.distractor, keyMeanTotal: keyMean, options: rows };
}

/**
 * Cronbach's alpha — do the items in a section measure one thing?
 *
 * @param {number[][]} matrix one row per candidate, one column per item
 */
function cronbachAlpha(matrix) {
  const n = matrix.length;
  if (n < 2) return { alpha: null, k: 0, n, reliable: false, verdict: 'no data' };

  const k = matrix[0].length;
  if (k < 2) return { alpha: null, k, n, reliable: false, verdict: 'needs at least two items' };
  if (matrix.some(row => row.length !== k)) throw new Error('ragged response matrix');

  const itemVarSum = Array.from({ length: k }, (_, j) =>
    variance(matrix.map(row => row[j]))).reduce((a, b) => a + b, 0);

  const totals = matrix.map(row => row.reduce((a, b) => a + b, 0));
  const totalVar = variance(totals);

  /* Every candidate scored the same overall: there is nothing to be consistent
     about, and the formula would divide by zero. */
  if (totalVar === 0) return { alpha: null, k, n, reliable: false, verdict: 'no variance in totals' };

  const alpha = (k / (k - 1)) * (1 - itemVarSum / totalVar);

  const verdict =
    alpha >= 0.90 ? 'excellent' :
    alpha >= 0.80 ? 'good' :
    alpha >= 0.70 ? 'acceptable' :
    alpha >= 0.60 ? 'questionable' : 'unacceptable';

  return { alpha, k, n, reliable: n >= MIN_N.alpha, verdict, totalSd: sd(totals) };
}

/**
 * Standard error of measurement.
 *
 * The number that makes an honest report possible. A score of 55 with an SEM
 * of 3 means B2 — which starts at 59 — is a bit over one standard error away
 * and cannot be ruled out. A learner deciding whether to sit the real exam
 * deserves that, and reporting a bare 55 withholds it.
 */
function standardError(alpha, totalSd) {
  if (alpha == null || totalSd == null || alpha >= 1) return null;
  return totalSd * Math.sqrt(1 - alpha);
}

/**
 * A confidence interval around a reported score.
 *
 * 68% at one SEM, 95% at roughly two. Defaults to 68% because a 95% interval
 * on a test this length is wide enough that learners stop reading it, and an
 * interval nobody reads protects nobody.
 */
function confidenceInterval(score, sem, level = 68) {
  if (sem == null) return null;
  const z = level >= 95 ? 1.96 : 1;
  return { low: score - z * sem, high: score + z * sem, level, sem };
}

/**
 * Everything for one item, and the single recommendation that follows.
 *
 * The recommendation is deliberately one string rather than a list of caveats.
 * An author looking at three hundred items needs to know which pile this one
 * goes in.
 */
function analyseItem({ id, part, itemScores, totalScores, chosen, options, key, max = 1 }) {
  const f = facility(itemScores, max);
  const d = discrimination(itemScores, totalScores);
  const dist = (chosen && options && key)
    ? distractorAnalysis(chosen, options, key, totalScores) : null;

  let recommend = 'keep';
  let why = 'Behaving normally.';

  /* Gate on the sample size rather than on `reliable`. An item that every one
     of five hundred candidates answered the same way has plenty of data and a
     discrimination that is undefined rather than unmeasured — saying "needs
     more responses" there would be false, and would keep a dead item in the
     bank forever waiting for a number that is never coming. */
  if (f.n < MIN_N.discrimination) {
    recommend = 'wait';
    why = `Only ${f.n} response(s). Needs ${MIN_N.discrimination} before the numbers mean anything.`;
  } else if (d.verdict === 'no variance') {
    recommend = 'retire';
    why = `Every candidate answered this the same way (facility ${f.p.toFixed(2)}) — it separates nobody.`;
  } else if (d.verdict === 'no variance in total') {
    /* The rest of the test placed everybody equal, so there is no ranking for
       this item to agree or disagree with. The fault is the section's, not the
       item's, and blaming the item would retire a good one. */
    recommend = 'wait';
    why = 'Every candidate scored the same on the rest of the section, so there is nothing to correlate against.';
  } else if (d.action === 'fix-key') {
    /* Negative discrimination is nearly always a mis-keyed item rather than a
       hard one, and it is the most damaging fault in a bank: it takes marks
       from the candidates who understood. */
    recommend = 'fix-key';
    why = 'Stronger candidates get this wrong more often than weaker ones. Check the key first.';
  } else if (d.action === 'retire') {
    recommend = 'retire';
    why = `Discrimination ${d.r.toFixed(2)} — this item does not separate stronger candidates from weaker ones.`;
  } else if (f.p >= 0.95 || f.p <= 0.15) {
    /* An extreme facility is a problem because it normally destroys
       discrimination — not in its own right. When the item is discriminating
       well anyway, it is separating candidates at one end of the range, and
       retiring it would throw away the only item that tells the strongest
       from the very strongest. What it needs is the level it was authored
       for checked (docs/ACADEMIC.md §9 step 3), which is re-tagging rather
       than rewriting. */
    if (d.r >= 0.30) {
      recommend = 'review';
      why = `Facility ${f.p.toFixed(2)} but discrimination ${d.r.toFixed(2)} — ` +
        `it works, at one end of the range. Check it is tagged to the right level.`;
    } else {
      recommend = 'retire';
      why = `Facility ${f.p.toFixed(2)} — ${f.verdict}.`;
    }
  } else if (d.action === 'review') {
    recommend = 'review';
    why = `Discrimination ${d.r.toFixed(2)} is marginal. Look at the distractors before deciding.`;
  } else if (dist && dist.reliable) {
    const bad = dist.options.find(o => o.verdict.startsWith('attracts stronger'));
    const dead = dist.options.filter(o => o.verdict.startsWith('dead'));
    if (bad) { recommend = 'review'; why = `Option "${bad.option}" ${bad.verdict}.`; }
    else if (dead.length) {
      recommend = 'review';
      why = `${dead.length} option(s) chosen by nobody — the item is easier than it looks.`;
    }
  }

  return { id, part, facility: f, discrimination: d, distractors: dist, recommend, why };
}

/** Section-level reliability and the error bar that follows from it. */
function analyseSection({ section, matrix }) {
  const a = cronbachAlpha(matrix);
  const sem = a.alpha != null ? standardError(a.alpha, a.totalSd) : null;
  return { section, ...a, sem };
}

module.exports = {
  MIN_N, DISCRIMINATION_BANDS,
  mean, sd, variance,
  facility, discrimination, distractorAnalysis,
  cronbachAlpha, standardError, confidenceInterval,
  analyseItem, analyseSection
};
