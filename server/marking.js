/**
 * Marking — turning a finished sitting into a score.
 *
 * Three separate tiers, exactly as docs/SCORING.md §2.2 lays out, because
 * mixing them is how a scoring engine ends up impossible to change:
 *
 *   1. Mark each item      → { earned, max, note }
 *   2. Add up per skill    → raw earned / raw max
 *   3. Convert to the scale the exam publishes
 *
 * Only tier 3 knows what a VPET band is. Only tier 1 knows what a gap-fill
 * answer looks like. That separation is what lets the band table change without
 * touching the marker, and a new item type arrive without touching the bands.
 *
 * Two rules from that document shape everything here:
 *
 *   · "Return whatever can be marked" — multiple choice and gap-fill are marked
 *     the moment the paper is handed in; writing and speaking are left pending
 *     for the AI/reviewer pass and the skill is flagged rather than scored as
 *     zero. Scoring an unmarked essay as zero would be a lie that looks like a
 *     result.
 *   · "Always explicable" — every item keeps earned, max and a note, so a
 *     disputed score can be traced back to the item that caused it.
 *
 * Marking is re-runnable on purpose. It reads the stored answers and overwrites
 * the stored scores, so fixing a marker means re-running it over old sittings
 * rather than asking anyone to sit the test again.
 */
'use strict';

const { q, tx, nowISO } = require('./db');

/** Item types a machine can mark outright. The rest wait for a rubric (AI or human). */
const AUTO_TYPES = ['mcq', 'gap'];

/**
 * VPET/VSTEP band table, per docs/SCORING.md §1.1.
 *
 * Defined once, here. It is a claim about a real exam, so it must never be
 * copied into a second place where the two can drift apart.
 *
 * NOTE: `VSTEP_GUIDE` in server/data/exam-formats.js currently states different
 * cut-offs (4.0-5.5 → B1, 6.0-8.0 → B2). docs/SCORING.md is the scoring
 * authority so the engine follows it; the contradiction is recorded in
 * docs/ROADMAP.md for the owner to settle, because which one is right is a
 * question about the real exam, not about this code.
 */
const BANDS = [
  { min: 8.5, band: 'Bậc 5', cefr: 'C1' },
  { min: 5.5, band: 'Bậc 4', cefr: 'B2' },
  { min: 3.5, band: 'Bậc 3', cefr: 'B1' }
];

/** The band for an overall mark; null means below the level a certificate is issued at. */
function toBand(score) {
  if (score == null) return null;
  const hit = BANDS.find(b => score >= b.min);
  return hit ? { band: hit.band, cefr: hit.cefr } : { band: null, cefr: null };
}

/* ------------------------------------------------------------------ *
 * Tier 1 — one item
 * ------------------------------------------------------------------ */

/**
 * Normalise a string before comparing: collapse whitespace, ignore case, strip
 * punctuation from both ends. Someone who typed an extra full stop has not given a
 * wrong answer.
 */
function norm(s) {
  return String(s == null ? '' : s)
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase()
    .replace(/^[.,;:!?'"()\[\]]+|[.,;:!?'"()\[\]]+$/g, '');
}

/**
 * Mark one item.
 *
 * Returns null when the type is not machine-markable — the caller must treat
 * that as "not yet marked", never as zero.
 */
function markItem(question, answerText) {
  if (!AUTO_TYPES.includes(question.type)) return null;

  const given = norm(answerText);
  if (!given) return { earned: 0, max: 1, note: 'Left blank' };

  if (question.type === 'mcq') {
    const ok = given === norm(question.answer);
    return { earned: ok ? 1 : 0, max: 1, note: ok ? 'Correct' : 'Wrong' };
  }

  /* gap: an answer key may list variants separated by '|' (color|colour).
     Matching any one of them is correct — these are spellings of the same answer,
     not two different answers. */
  const variants = String(question.answer || '').split('|').map(norm).filter(Boolean);
  if (!variants.length) return { earned: 0, max: 1, note: 'This item has no answer key' };
  const ok = variants.includes(given);
  return { earned: ok ? 1 : 0, max: 1, note: ok ? 'Correct' : 'Wrong' };
}

/* ------------------------------------------------------------------ *
 * Tier 3 — raw score to the published scale
 * ------------------------------------------------------------------ */

/**
 * VPET uses the `linear` conversion (docs/SCORING.md §2.2): raw/max × 10, rounded to
 * 0.5. No items means no mark — this returns null rather than 0, because 0 is a
 * result and "there was nothing to mark" is not.
 */
function linearScale(earned, max) {
  if (!max) return null;
  return Math.round((earned / max) * 10 * 2) / 2;
}

/** The mean of the skill marks, rounded to 0.5 (docs/SCORING.md §1.1). */
function meanHalf(values) {
  const list = values.filter(v => typeof v === 'number');
  if (!list.length) return null;
  return Math.round((list.reduce((a, b) => a + b, 0) / list.length) * 2) / 2;
}

/* ------------------------------------------------------------------ *
 * Tier 2 + orchestration
 * ------------------------------------------------------------------ */

/**
 * Mark everything markable in a sitting and store the result.
 *
 * Safe to call more than once: the per-item trace and the per-skill rows are
 * overwritten, never appended to.
 */
function markAttempt(attemptId) {
  const att = q.get('SELECT * FROM attempts WHERE id=?', attemptId);
  if (!att) return null;

  /* Every item in the paper, with its stored answer if there is one. LEFT JOIN, not
     JOIN: a blank item still belongs in the denominator, or leaving more blank would
     raise the mark. */
  const rows = q.all(
    `SELECT si.question_id, ap.section_id, s.skill,
            qs.type, qs.answer,
            aa.id answer_id, aa.answer given, aa.audio_key
       FROM attempt_parts ap
       JOIN sections s ON s.id = ap.section_id
       JOIN section_items si ON si.section_id = ap.section_id
       JOIN questions qs ON qs.id = si.question_id
       LEFT JOIN attempt_answers aa ON aa.attempt_id = ap.attempt_id AND aa.question_id = si.question_id
      WHERE ap.attempt_id = ?`, attemptId);

  const bySkill = new Map();
  const at = nowISO();

  tx(() => {
    for (const r of rows) {
      const bucket = bySkill.get(r.skill) ||
        { earned: 0, max: 0, pending: 0, marked: 0 };
      bySkill.set(r.skill, bucket);

      const mark = markItem({ type: r.type, answer: r.answer }, r.given);
      if (!mark) {
        /* Writing and Speaking: waiting on a rubric. Counted separately so we know the skill is unfinished. */
        bucket.pending += 1;
        continue;
      }
      bucket.earned += mark.earned;
      bucket.max += mark.max;
      bucket.marked += 1;

      /* Only leave a trail for items that already have an answer row. A wholly blank
         item has no row at all; it still counts in the denominator above, and there
         is no reason to create an empty row just to record "0". */
      if (r.answer_id) {
        q.run('UPDATE attempt_answers SET earned=?, max_score=?, mark_note=?, marked_at=? WHERE id=?',
          mark.earned, mark.max, mark.note, at, r.answer_id);
      }
    }

    const scaled = [];
    for (const [skill, b] of bySkill) {
      const value = b.pending ? null : linearScale(b.earned, b.max);
      if (value != null) scaled.push(value);
      q.run(
        `INSERT INTO attempt_scores (attempt_id,skill,raw_earned,raw_max,scaled,method,pending,at)
         VALUES (?,?,?,?,?,?,?,?)
         ON CONFLICT(attempt_id,skill) DO UPDATE SET
           raw_earned=excluded.raw_earned, raw_max=excluded.raw_max, scaled=excluded.scaled,
           method=excluded.method, pending=excluded.pending, at=excluded.at`,
        attemptId, skill, b.earned, b.max, value, 'linear', b.pending, at);
    }

    /* An overall mark only means anything once all four skills are marked. Averaging
    two of them and calling it the total is a wrong number in the costume of a result. */
    const allSkills = [...bySkill.values()];
    const complete = allSkills.length > 0 && allSkills.every(b => !b.pending);
    q.run(
      `INSERT INTO attempt_scores (attempt_id,skill,raw_earned,raw_max,scaled,method,pending,at)
       VALUES (?,'overall',0,0,?,?,?,?)
       ON CONFLICT(attempt_id,skill) DO UPDATE SET
         scaled=excluded.scaled, method=excluded.method, pending=excluded.pending, at=excluded.at`,
      attemptId, complete ? meanHalf(scaled) : null, 'mean_round_half', complete ? 0 : 1, at);
  });

  return resultOf(attemptId);
}

/**
 * The report for one sitting.
 *
 * `detailed` decides how much comes back, and it is the caller's job to pass
 * what the buyer's plan allows: Starter bought the ordinary mark-and-band report,
 * so it gets the score and the band; from Plus up the per-part breakdown and
 * the per-item trace come with it.
 */
function resultOf(attemptId, detailed) {
  const att = q.get('SELECT * FROM attempts WHERE id=?', attemptId);
  if (!att) return null;
  const rows = q.all('SELECT * FROM attempt_scores WHERE attempt_id=?', attemptId);
  const overall = rows.find(r => r.skill === 'overall');
  const skills = rows.filter(r => r.skill !== 'overall');

  const out = {
    attemptId,
    testId: att.test_id,
    status: att.status,
    submittedAt: att.submitted_at,
    /* Say plainly that this is a practice reference mark, not a real exam result
       (docs/SCORING.md §2.1, principle 5). */
    disclaimer: 'A reference mark for practice, not a real exam result.',
    overall: overall ? overall.scaled : null,
    pending: !overall || !!overall.pending,
    band: overall ? toBand(overall.scaled) : null,
    detailed: !!detailed
  };
  if (!detailed) return out;

  out.skills = skills.map(r => ({
    skill: r.skill,
    rawEarned: r.raw_earned,
    rawMax: r.raw_max,
    score: r.scaled,
    pending: !!r.pending,
    method: r.method
  }));
  out.parts = q.all(
    `SELECT ap.section_id, ap.part, s.name, s.skill
       FROM attempt_parts ap JOIN sections s ON s.id = ap.section_id
      WHERE ap.attempt_id=? ORDER BY s.sort, s.id`, attemptId)
    .map(p => {
      const items = q.all(
        `SELECT si.question_id, qs.type, qs.prompt,
                aa.answer given, aa.earned, aa.max_score, aa.mark_note, aa.audio_key
           FROM section_items si
           JOIN questions qs ON qs.id = si.question_id
           LEFT JOIN attempt_answers aa ON aa.attempt_id=? AND aa.question_id=si.question_id
          WHERE si.section_id=? ORDER BY si.sort, si.id`, attemptId, p.section_id);
      /* The maximum comes from the ITEM TYPE, not from the stored row. A wholly blank
         item has no attempt_answers row, so reading the maximum off the row makes it
         vanish from the denominator: the part reads "1/1" while the skill scores 5.0
         — the more you leave blank, the more perfect the part looks. */
      const marked = items.map(i => {
        const auto = AUTO_TYPES.includes(i.type);
        return {
          questionId: i.question_id,
          type: i.type,
          prompt: i.prompt,
          /* The candidate's own answer can go back out; the answer key must NOT:
          the paper is reused for later sittings and for other people. */
          given: i.given || '',
          hasRecording: !!i.audio_key,
          earned: auto ? (i.earned == null ? 0 : i.earned) : null,
          max: auto ? 1 : null,
          note: i.mark_note || (auto ? 'Left blank' : 'Awaiting marking')
        };
      });
      return {
        sectionId: p.section_id, part: p.part || null, name: p.name, skill: p.skill,
        earned: marked.reduce((a, i) => a + (i.earned || 0), 0),
        max: marked.reduce((a, i) => a + (i.max || 0), 0),
        items: marked
      };
    });
  return out;
}

module.exports = { markAttempt, resultOf, markItem, toBand, linearScale, meanHalf, BANDS, AUTO_TYPES };
