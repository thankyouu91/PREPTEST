/**
 * Spaced repetition — the schedule, and nothing else.
 *
 * `docs/LEARNING.md` §6 asks for "SM-2 rút gọn": every item carries an `ease`,
 * an `interval` and a `due_at`, and a learner only sees what is due. It does not
 * fix the numbers, so they are fixed here, and this file is the only place they
 * live. Everything in it is a pure function of (previous state, grade, now) —
 * no database, no request, no clock of its own — because a scheduler you cannot
 * run on paper is a scheduler nobody can check.
 *
 * ## What is reduced about it
 *
 * Classic SM-2 (Wozniak, 1987) takes a grade from 0 to 5 and runs the
 * quality-to-ease polynomial `ease += 0.1 - (5-g)(0.08 + (5-g)0.02)`. Six
 * buttons is more than a learner can tell apart honestly, and the polynomial's
 * middle grades are indistinguishable in practice. This keeps SM-2's shape —
 * an ease factor per item, multiplied into a growing interval, with a floor —
 * and reduces the grades to the four a person can actually judge:
 *
 *   again  the answer would not come                → relearn from the start
 *   hard   it came, slowly, and it was a struggle   → grow the interval barely
 *   good   it came                                  → the normal SM-2 step
 *   easy   it came instantly and felt trivial       → step, then a bonus
 *
 * ## The rules
 *
 *   · ease starts at 2.5 and never drops below 1.3. The floor is SM-2's own and
 *     it matters: without it a card failed enough times reaches an ease of zero
 *     and can never leave the queue again.
 *   · The first two successful intervals are FIXED at 1 day and 6 days. This is
 *     SM-2 as published, and the reason is that `interval × ease` from a
 *     standing start would send a brand-new card out to two and a half days
 *     before it has been recalled twice.
 *   · From the third success, `interval = round(interval × ease)`, with `hard`
 *     using a flat ×1.2 instead and `easy` adding a ×1.3 bonus on top.
 *   · `again` does not shrink the interval, it DISCARDS it: the card returns to
 *     learning, is due in ten minutes, and starts again at one day. A card you
 *     could not recall is not a card you half-know.
 *   · Intervals are capped at a year. Past that the schedule is fiction — the
 *     word is either in the language you use or it is gone.
 *
 * Grading is deliberately self-reported. There is no automatic marking here,
 * because these are recall cards, not exam items: only the learner knows
 * whether the answer arrived or was reconstructed.
 */
'use strict';

/** The four buttons, worst to best. Order matters: the UI renders it. */
const GRADES = ['again', 'hard', 'good', 'easy'];

const EASE_START = 2.5;
const EASE_FLOOR = 1.3;
/* What each grade does to the ease factor. `good` is neutral by design: the
   normal case must not drift, or every card slowly becomes either trivial or
   impossible depending on which way the rounding leans. */
const EASE_DELTA = { again: -0.20, hard: -0.15, good: 0, easy: +0.15 };

const FIRST_INTERVAL = 1;         // days, after the first success
const SECOND_INTERVAL = 6;        // days, after the second
const HARD_FACTOR = 1.2;
const EASY_BONUS = 1.3;
const MAX_INTERVAL = 365;         // days
const RELEARN_MINUTES = 10;       // how soon a failed card comes back

/** A card nobody has answered yet. */
function fresh() {
  return { ease: EASE_START, interval: 0, reps: 0, lapses: 0, state: 'new' };
}

const round2 = n => Math.round(n * 100) / 100;
const clampEase = e => Math.max(EASE_FLOOR, round2(e));

/**
 * The next schedule for one card.
 *
 * @param {object} prev  { ease, interval, reps, lapses, state } — or null for a new card
 * @param {string} grade one of GRADES
 * @param {Date} now     the server's clock, passed in so this stays testable
 * @returns {object} the whole next state, including `dueAt` as an ISO string
 */
function schedule(prev, grade, now) {
  if (!GRADES.includes(grade)) throw new Error(`Unknown grade: ${grade}`);
  const at = now instanceof Date ? now : new Date();
  const p = Object.assign(fresh(), prev || {});
  const ease = clampEase(p.ease + EASE_DELTA[grade]);

  if (grade === 'again') {
    /* Back to learning. The interval is discarded rather than reduced, and the
       lapse is counted — a card with many lapses is a card whose EXAMPLE is
       wrong or whose meaning is too close to another, and the count is what
       makes that visible later. */
    return {
      ease,
      interval: 0,
      reps: 0,
      lapses: p.lapses + 1,
      state: 'learning',
      dueAt: new Date(at.getTime() + RELEARN_MINUTES * 60000).toISOString()
    };
  }

  const reps = p.reps + 1;
  let days;
  if (reps === 1) days = FIRST_INTERVAL;
  else if (reps === 2) days = SECOND_INTERVAL;
  else if (grade === 'hard') days = Math.max(p.interval + 1, Math.round(p.interval * HARD_FACTOR));
  else days = Math.round(p.interval * ease);

  if (grade === 'easy' && reps > 2) days = Math.round(days * EASY_BONUS);
  days = Math.max(1, Math.min(MAX_INTERVAL, days));

  return {
    ease,
    interval: days,
    reps,
    lapses: p.lapses,
    /* "review" once it has survived the two fixed steps; until then it is still
       being learned, and the screen says so rather than implying it is filed away. */
    state: reps >= 2 ? 'review' : 'learning',
    dueAt: new Date(at.getTime() + days * 86400000).toISOString()
  };
}

/** Days until a card is due — negative when it is overdue. Whole days, rounded. */
function daysUntil(dueAtISO, now) {
  const at = now instanceof Date ? now : new Date();
  return Math.round((new Date(dueAtISO) - at) / 86400000);
}

/** How the next interval would read on a button, before it is pressed. */
function previewLabel(prev, grade, now) {
  const next = schedule(prev, grade, now);
  if (!next.interval) return `${RELEARN_MINUTES} min`;
  if (next.interval === 1) return '1 day';
  if (next.interval < 30) return `${next.interval} days`;
  if (next.interval < 365) return `${Math.round(next.interval / 30)} mo`;
  return `${Math.round(next.interval / 365)} yr`;
}

module.exports = {
  GRADES, EASE_START, EASE_FLOOR, MAX_INTERVAL, RELEARN_MINUTES,
  fresh, schedule, daysUntil, previewLabel
};
