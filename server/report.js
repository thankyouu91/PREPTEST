/**
 * The learner's own report: what they have done, when, and how well.
 *
 * `server/ability.js` answers "how good are you" and is the only thing on this
 * platform allowed an opinion about that. This file answers the questions
 * sitting next to it, which are about the WORK rather than the ability:
 *
 *   how much have I actually studied, and when
 *   what kind of study was it
 *   are my marks moving
 *   how accurate am I, and is that better than it was
 *
 * None of it is a second estimate. Every number here is a count or a sum of
 * things that happened, which is why they can be shown plainly next to an
 * estimate without the two competing. The moment this file starts inferring
 * ability it becomes a second model and the platform starts contradicting
 * itself on one screen.
 *
 * ## Time is measured, not guessed
 *
 * Every activity table carries `started_at` and `done_at`, so time on task is
 * subtraction rather than an assumption about how long a drill "should" take.
 * That is worth having: a learner who spends forty minutes on a six-item drill
 * is telling you something a count of items cannot.
 *
 * It does need a ceiling. A tab left open overnight would otherwise report
 * eight hours of study, and a chart that does that once is a chart nobody
 * believes again. `SESSION_CAP_MIN` is that ceiling, applied per session, and
 * the honest reading of a capped session is "at least this long".
 *
 * ## Days are Vietnamese days
 *
 * Timestamps are stored in UTC, and grouping them by UTC day would put the
 * first seven hours of every Vietnamese day into the previous bar. Someone
 * studying at 9pm would see it land on "yesterday". So days are cut at
 * midnight Asia/Ho_Chi_Minh.
 *
 * A fixed +07:00 is exact here rather than approximate: Vietnam has not
 * observed daylight saving since 1975, so there is no transition for a fixed
 * offset to get wrong, and no timezone database is needed to be correct.
 */
'use strict';

const { q } = require('./db');

/** How far back the charts look. Eight weeks fits a study run and a phone. */
const WINDOW_DAYS = 56;

/** Asia/Ho_Chi_Minh. Fixed, not an approximation - see the module note. */
const TZ_MINUTES = 7 * 60;

/**
 * The longest a single sitting may count for.
 *
 * The full paper is about an hour and every other activity is far shorter, so
 * 90 minutes is generous for real work and still catches the abandoned tab.
 * Capping is preferred to discarding: the session did happen, and throwing it
 * away would under-report somebody who genuinely did sit a long paper.
 */
const SESSION_CAP_MIN = 90;

/** A session shorter than this is a mis-click, not study. */
const SESSION_FLOOR_SEC = 5;

/** How many sittings the trajectory plots. A chart of a hairline helps nobody. */
const MAX_SITTINGS = 20;

/** 'YYYY-MM-DD' for the Vietnamese day an instant falls in. */
function localDay(iso) {
  const t = Date.parse(iso);
  if (!Number.isFinite(t)) return null;
  return new Date(t + TZ_MINUTES * 60000).toISOString().slice(0, 10);
}

/** Minutes between two instants, floored, capped, and never negative. */
function span(startISO, endISO) {
  const a = Date.parse(startISO), b = Date.parse(endISO);
  if (!Number.isFinite(a) || !Number.isFinite(b)) return 0;
  const sec = (b - a) / 1000;
  if (!(sec >= SESSION_FLOOR_SEC)) return 0;
  return Math.min(SESSION_CAP_MIN, Math.round(sec / 60 * 10) / 10);
}

/** The ISO instant `days` days before now, for the SQL window. */
function since(days) {
  return new Date(Date.now() - days * 86400e3).toISOString();
}

/* ------------------------------ What happened ------------------------------ */

/**
 * Every finished piece of work in the window, from all four places that make
 * one, flattened to the same shape.
 *
 * Four queries rather than a UNION so each keeps the column names of its own
 * table; they are small, indexed on user_id, and bounded by date.
 */
async function sessionsOf(userId, days) {
  const from = since(days === undefined ? WINDOW_DAYS : days);
  const out = [];
  const add = (rows, kind) => {
    for (const r of rows) {
      const minutes = span(r.started_at, r.done_at);
      const day = localDay(r.done_at);
      if (!day) continue;
      out.push({ kind, day, minutes, at: r.done_at });
    }
  };

  add(await q.all(
    `SELECT started_at, submitted_at AS done_at FROM attempts
      WHERE user_id = ? AND status = 'submitted' AND submitted_at > ?`, userId, from), 'exam');
  add(await q.all(
    `SELECT started_at, done_at FROM drills
      WHERE user_id = ? AND status = 'done' AND done_at > ?`, userId, from), 'drill');
  add(await q.all(
    `SELECT started_at, done_at FROM revision_sets
      WHERE user_id = ? AND status = 'done' AND done_at > ?`, userId, from), 'revision');
  add(await q.all(
    `SELECT started_at, done_at FROM placements
      WHERE user_id = ? AND status = 'done' AND done_at > ?`, userId, from), 'placement');

  return out.sort((a, b) => (a.at < b.at ? -1 : 1));
}

/**
 * One row per day for the whole window, including the empty ones.
 *
 * The empty days are the point. A series that only carries the days something
 * happened draws a tidy line over a fortnight off, and the gap is exactly what
 * a learner needs to see.
 */
async function activity(userId, days) {
  const n = days === undefined ? WINDOW_DAYS : days;
  const sess = await sessionsOf(userId, n);

  /* Marks attempted and earned per day, from the one table every source writes
     to, so the accuracy line cannot drift from the ability report's evidence. */
  const from = since(n);
  const evs = await q.all(
    `SELECT at, earned, max_score FROM skill_events
      WHERE user_id = ? AND at > ?`, userId, from);

  const byDay = new Map();
  const today = localDay(new Date().toISOString());
  for (let i = n - 1; i >= 0; i--) {
    const d = localDay(new Date(Date.parse(today + 'T00:00:00Z') - i * 86400e3).toISOString());
    byDay.set(d, { day: d, exam: 0, drill: 0, revision: 0, placement: 0, minutes: 0, earned: 0, max: 0 });
  }
  for (const s of sess) {
    const row = byDay.get(s.day);
    if (!row) continue;                      // fell outside the window
    row[s.kind] += s.minutes;
    row.minutes += s.minutes;
  }
  for (const e of evs) {
    const row = byDay.get(localDay(e.at));
    if (!row) continue;
    row.earned += Number(e.earned) || 0;
    row.max += Number(e.max_score) || 0;
  }
  const rows = [...byDay.values()].map(r => ({
    ...r,
    exam: Math.round(r.exam * 10) / 10,
    drill: Math.round(r.drill * 10) / 10,
    revision: Math.round(r.revision * 10) / 10,
    placement: Math.round(r.placement * 10) / 10,
    minutes: Math.round(r.minutes * 10) / 10
  }));

  /* Consecutive days ending today or yesterday. Yesterday counts because a
     streak that breaks at midnight before the learner has had a chance to
     study is a streak that punishes them for the clock. */
  let streak = 0;
  for (let i = rows.length - 1; i >= 0; i--) {
    if (rows[i].minutes > 0) streak++;
    else if (i < rows.length - 1) break;     // a gap that is not today ends it
  }

  return { days: rows, streak };
}

/* -------------------------------- How well -------------------------------- */

/**
 * Every submitted paper, with the four skill scores it produced.
 *
 * The trajectory a learner actually cares about. Unlike the ability estimate
 * this does not decay or smooth: it is what was scored on the day, which is
 * the right thing to plot against time and the wrong thing to plan from.
 */
async function sittings(userId) {
  /* Bounded, and the caller is told the real total separately. A trajectory
     needs enough points to have a shape and stops gaining anything past a
     screenful; more than that is a chart of a hairline. The cap is on the
     MOST RECENT, because the question this chart answers is "am I improving",
     which is about the near end of the line. */
  const total = await q.val(
    "SELECT COUNT(*) c FROM attempts WHERE user_id = ? AND status = 'submitted'", userId);
  const rows = (await q.all(
    `SELECT a.id, a.test_id, a.submitted_at, t.title
       FROM attempts a LEFT JOIN tests t ON t.id = a.test_id
      WHERE a.user_id = ? AND a.status = 'submitted'
      ORDER BY a.submitted_at DESC LIMIT ?`, userId, MAX_SITTINGS)).reverse();
  rows.total = total;
  if (!rows.length) { const e = []; e.total = 0; return e; }

  const scores = await q.all(
    `SELECT s.attempt_id, s.skill, s.scaled, s.pending
       FROM attempt_scores s JOIN attempts a ON a.id = s.attempt_id
      WHERE a.user_id = ?`, userId);
  const byAttempt = new Map();
  for (const s of scores) {
    if (!byAttempt.has(s.attempt_id)) byAttempt.set(s.attempt_id, {});
    byAttempt.get(s.attempt_id)[s.skill] = s.pending ? null : s.scaled;
  }

  const out = rows.map(r => {
    const sk = byAttempt.get(r.id) || {};
    const got = Object.values(sk).filter(v => v !== null && v !== undefined);
    return {
      attemptId: r.id,
      testId: r.test_id,
      title: r.title || r.test_id,
      at: r.submitted_at,
      day: localDay(r.submitted_at),
      skills: sk,
      /* The mean of the skills that came back. Left null rather than averaged
         over three when the fourth is still with the marker: a paper whose
         speaking is pending is not a lower-scoring paper. */
      overall: got.length ? Math.round(got.reduce((a, b) => a + b, 0) / got.length * 10) / 10 : null,
      pending: Object.values(sk).some(v => v === null)
    };
  });
  out.total = total;
  return out;
}

/**
 * Accuracy per source, and whether it is going the right way.
 *
 * "How well am I doing" asked of the work rather than of the estimate. Split
 * by source because the four are not comparable: a drill is untimed and
 * retryable, a paper is neither, and one number over both hides which.
 */
async function quality(userId) {
  const rows = await q.all(
    `SELECT source,
            SUM(earned) AS earned, SUM(max_score) AS max, COUNT(*) AS items,
            MAX(at) AS last
       FROM skill_events WHERE user_id = ? GROUP BY source`, userId);

  const half = since(28);
  const recent = await q.all(
    `SELECT source, SUM(earned) AS earned, SUM(max_score) AS max
       FROM skill_events WHERE user_id = ? AND at > ? GROUP BY source`, userId, half);
  const before = await q.all(
    `SELECT source, SUM(earned) AS earned, SUM(max_score) AS max
       FROM skill_events WHERE user_id = ? AND at <= ? GROUP BY source`, userId, half);
  const pct = r => (r && r.max > 0 ? Math.round(r.earned / r.max * 1000) / 10 : null);
  const mapOf = list => new Map(list.map(r => [r.source, r]));
  const R = mapOf(recent), B = mapOf(before);

  return rows.map(r => {
    const now = pct(R.get(r.source)), was = pct(B.get(r.source));
    return {
      source: r.source,
      items: r.items,
      earned: Math.round(r.earned * 10) / 10,
      max: Math.round(r.max * 10) / 10,
      pct: pct(r),
      /* Only claimed when there is something on both sides of the line. A
         "+12 points" on a first week of data is noise presented as progress. */
      trend: now !== null && was !== null ? Math.round((now - was) * 10) / 10 : null,
      last: r.last
    };
  }).sort((a, b) => b.items - a.items);
}

/* -------------------------------- The lot -------------------------------- */

async function reportOf(userId, days) {
  const [act, sits, qual] = await Promise.all([
    activity(userId, days), sittings(userId), quality(userId)
  ]);

  const windowMin = act.days.reduce((a, d) => a + d.minutes, 0);

  /* Totals are ALL-TIME, and the window governs only the charts.
     They were briefly mixed - an all-time item count printed beside a
     windowed accuracy - which invites exactly the wrong reading, that the one
     percentage describes the one count. Two numbers side by side have to be
     about the same thing. */
  const allMarks = qual.reduce((a, r) => ({ earned: a.earned + r.earned, max: a.max + r.max }),
    { earned: 0, max: 0 });

  return {
    days: act.days,
    streak: act.streak,
    sittings: sits,
    sittingsTotal: sits.total === undefined ? sits.length : sits.total,
    sittingsShown: sits.length,
    quality: qual,
    windowDays: days === undefined ? WINDOW_DAYS : days,
    /* Kept apart from `totals` by name, because these two ARE windowed and
       putting them in the same bag is the mistake described above. */
    window: {
      minutes: Math.round(windowMin),
      hours: Math.round(windowMin / 6) / 10,
      activeDays: act.days.filter(d => d.minutes > 0).length
    },
    totals: {
      papers: sits.total === undefined ? sits.length : sits.total,
      items: qual.reduce((a, r) => a + r.items, 0),
      accuracy: allMarks.max > 0 ? Math.round(allMarks.earned / allMarks.max * 1000) / 10 : null
    }
  };
}

module.exports = {
  reportOf, activity, sittings, quality, sessionsOf,
  localDay, span,
  WINDOW_DAYS, TZ_MINUTES, SESSION_CAP_MIN, SESSION_FLOOR_SEC, MAX_SITTINGS
};
