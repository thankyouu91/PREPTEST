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
const ability = require('./ability');
const rubric = require('./rubric');
const bands = require('./bands');

/**
 * The 123 linking words the platform already teaches, for the tier-1 diagnostic
 * that counts them.
 *
 * Read once and kept: a report is built per request and this list changes only
 * when somebody edits the self-study content, which restarts the process.
 * Copying the words into rubric.js instead would have made a second list to keep
 * in step with the one learners are actually taught from.
 */
let LINKING = null;
async function linkingWords() {
  if (LINKING) return LINKING;
  const rows = await q.all('SELECT word FROM linking_words').catch(() => []);
  LINKING = rows.map(r => r.word).filter(Boolean);
  return LINKING;
}

/** Item types a machine can mark outright. The rest wait for a rubric (AI or human). */
const AUTO_TYPES = ['mcq', 'gap'];

/**
 * The four skills an overall band is the mean of.
 *
 * Named here rather than derived from whatever the paper contains, because
 * "the four" is what the band table means. `sections.skill` is constrained to
 * these in the schema, so a section can never introduce a fifth — but a paper
 * can easily contain fewer, and one that does cannot yield a band.
 */
const EXAM_SKILLS = ['listening', 'reading', 'writing', 'speaking'];

/**
 * The VSTEP band table, kept here as the re-export it always was.
 *
 * What a mark MEANS now lives in server/bands.js, because it stopped being one
 * table: this one is right for VEPT, which follows the VSTEP framework, and was
 * wrong for VPET, which is Pearson's and comes in two levels measuring
 * different stretches of the scale. Applying it to every paper told a candidate
 * who aced a Level 1 paper that they were C1 — two bands above anything that
 * paper can measure.
 *
 * NOTE: `VSTEP_GUIDE` in server/data/exam-formats.js currently states different
 * cut-offs (4.0-5.5 → B1, 6.0-8.0 → B2). docs/SCORING.md is the scoring
 * authority so the engine follows it; the contradiction is recorded in
 * docs/ROADMAP.md for the owner to settle, because which one is right is a
 * question about the real exam, not about this code.
 */
const BANDS = bands.VSTEP_BANDS;

/**
 * The level for an overall mark.
 *
 * `opts` carries which exam and which paper — `{ family, level }` — because the
 * same 8.0 is B2 on a VEPT paper, B1+ on VPET Level 1 (its ceiling), and C1 on
 * VPET Level 2. Called with no opts it still answers on the VSTEP table, which
 * is what every existing caller expects.
 */
function toBand(score, opts) {
  return bands.bandFor(score, opts);
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
async function markAttempt(attemptId) {
  const att = await q.get('SELECT * FROM attempts WHERE id=?', attemptId);
  if (!att) return null;

  /* Every item in the paper, with its stored answer if there is one. LEFT JOIN, not
     JOIN: a blank item still belongs in the denominator, or leaving more blank would
     raise the mark. */
  const rows = await q.all(
    `SELECT si.question_id, ap.section_id, s.skill,
            qs.type, qs.answer, qs.part, qs.level,
            aa.id answer_id, aa.answer given, aa.audio_key, aa.earned, aa.max_score
       FROM attempt_parts ap
       JOIN sections s ON s.id = ap.section_id
       JOIN section_items si ON si.section_id = ap.section_id
       JOIN questions qs ON qs.id = si.question_id
       LEFT JOIN attempt_answers aa ON aa.attempt_id = ap.attempt_id AND aa.question_id = si.question_id
      WHERE ap.attempt_id = ?`, attemptId);

  const bySkill = new Map();
  /* Collected as the items are marked and written once at the end, so the
     ability model sees the same marks the report does. See server/ability.js. */
  const events = [];
  const at = nowISO();

  await tx(async () => {
    for (const r of rows) {
      const bucket = bySkill.get(r.skill) ||
        { earned: 0, max: 0, pending: 0, marked: 0 };
      bySkill.set(r.skill, bucket);

      let mark = markItem({ type: r.type, answer: r.answer }, r.given);

      /* Not machine-markable, but somebody - or something - has already marked it
         against a rubric and written the result on the row. Rubric marks are on
         the same 0-1 scale per item as everything else, so they join the same
         bucket and the skill can finish. Before server/ai-marking.js existed
         nothing ever wrote these, which is why `overall` was null on every paper
         ever submitted. */
      if (!mark && r.earned != null && r.max_score) {
        mark = { earned: r.earned, max: r.max_score, note: null, alreadyStored: true };
      }

      if (!mark) {
        /* Writing and Speaking: waiting on a rubric. Counted separately so we know the skill is unfinished. */
        bucket.pending += 1;
        continue;
      }
      bucket.earned += mark.earned;
      bucket.max += mark.max;
      bucket.marked += 1;

      /* One event per marked item. Only marked ones: a pending essay has no
         result yet, and recording it as 0 out of 1 would tell the ability model
         the learner cannot write — which is exactly the lie this file refuses
         to tell in attempt_scores two paragraphs down.

         weight 1 because this is exam conditions. Drills will file the same
         shape at 0.6: answering under a clock is not the same evidence as
         answering at leisure, and the model should know which it saw. */
      events.push({
        user_id: att.user_id,
        source: 'exam',
        ref_id: attemptId,
        item_key: r.question_id,
        skill: r.skill,
        part: r.part || null,
        level: r.level || null,
        earned: mark.earned,
        max_score: mark.max,
        weight: 1,
        at
      });

      /* Only leave a trail for items that already have an answer row. A wholly blank
         item has no row at all; it still counts in the denominator above, and there
         is no reason to create an empty row just to record "0". */
      if (r.answer_id && !mark.alreadyStored) {
        await q.run('UPDATE attempt_answers SET earned=?, max_score=?, mark_note=?, marked_at=? WHERE id=?',
          mark.earned, mark.max, mark.note, at, r.answer_id);
      }
    }

    const scaled = [];
    for (const [skill, b] of bySkill) {
      const value = b.pending ? null : linearScale(b.earned, b.max);
      if (value != null) scaled.push(value);
      await q.run(
        `INSERT INTO attempt_scores (attempt_id,skill,raw_earned,raw_max,scaled,method,pending,at)
         VALUES (?,?,?,?,?,?,?,?)
         ON CONFLICT(attempt_id,skill) DO UPDATE SET
           raw_earned=excluded.raw_earned, raw_max=excluded.raw_max, scaled=excluded.scaled,
           method=excluded.method, pending=excluded.pending, at=excluded.at`,
        attemptId, skill, b.earned, b.max, value, 'linear', b.pending, at);
    }

    /* An overall mark only means anything once everything markable is marked.
    Averaging half a paper and calling it the total is a wrong number in the
    costume of a result.

    Note what this is NOT: it is not a check that the paper has all four skills.
    The mean of what a paper contains is arithmetic and is always true of that
    paper. What cannot be read off part of a paper is the BAND — that is a claim
    about a whole VPET sitting, and it is withheld in toBand() instead. */
    const allSkills = [...bySkill.values()];
    const complete = allSkills.length > 0 && allSkills.every(b => !b.pending);
    await q.run(
      `INSERT INTO attempt_scores (attempt_id,skill,raw_earned,raw_max,scaled,method,pending,at)
       VALUES (?,'overall',0,0,?,?,?,?)
       ON CONFLICT(attempt_id,skill) DO UPDATE SET
         scaled=excluded.scaled, method=excluded.method, pending=excluded.pending, at=excluded.at`,
      attemptId, complete ? meanHalf(scaled) : null, 'mean_round_half', complete ? 0 : 1, at);

    /* Inside the same transaction as the scores it is derived from. An ability
       panel that can disagree with the report sitting next to it is worse than
       no ability panel, and a crash between two separate writes is exactly how
       they come to disagree. */
    if (events.length) await ability.record(events);
  });

  return await resultOf(attemptId);
}

/**
 * The report for one sitting.
 *
 * `detailed` decides how much comes back, and it is the caller's job to pass
 * what the buyer's plan allows: Starter bought the ordinary mark-and-band report,
 * so it gets the score and the band; from Plus up the per-part breakdown and
 * the per-item trace come with it.
 */
async function resultOf(attemptId, detailed) {
  const att = await q.get('SELECT * FROM attempts WHERE id=?', attemptId);
  if (!att) return null;
  /* Which exam and which level, because a mark does not mean the same thing on
     both VPET papers: Level 1 measures A1 to B1+, Level 2 B1+ to C2. Read here
     rather than assumed, and see server/bands.js for what it decides. */
  const test = await q.get('SELECT family_id, level FROM tests WHERE id=?', att.test_id);
  const rows = await q.all('SELECT * FROM attempt_scores WHERE attempt_id=?', attemptId);
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
    /* The band needs all four skills, which the overall mean does not.
     *
     * The mean of what a paper contains is arithmetic and is honest about that
     * paper. A band is a claim about a whole VPET sitting, and it was being
     * read off whatever the paper happened to hold: a reading-only paper
     * scoring 10 came back `Bậc 5 / C1`, a full certificate band off one
     * section. The comment beside the completeness check promised "all four
     * skills" and nothing anywhere checked for them. */
    band: overall && EXAM_SKILLS.every(s => skills.some(r => r.skill === s))
      ? toBand(overall.scaled, { family: test && test.family_id, level: test && test.level })
      : null,
    /* What this paper is, so the screen can say what it could and could not
       have found. A candidate who answers everything on a Level 1 paper is B1+
       and has ALSO run out of paper — those are different facts and both are
       worth telling them. */
    paperLevel: test ? test.level : null,
    vpetLevel: test && String(test.family_id) === 'vpet' ? bands.vpetLevelOf(test.level) : null,
    /* How the speaking mark was arrived at, on every result screen rather than
       only the paid one.
     *
     * The per-item version of this note is real and well written, but it lives
     * on `parts`, and `parts` is returned only when `detailed` — the
     * detailedReport entitlement. So a candidate on the free plan saw a
     * speaking band and a CEFR level with nothing anywhere telling them that
     * nobody had listened to their voice. That is not a premium detail; it is
     * the basis of the number. It belongs with the disclaimer. */
    spokenFrom: skills.some(r => r.skill === 'speaking' && !r.pending)
      ? 'Speaking is marked from a written transcript of your recording: the words and the '
        + 'grammar, not pronunciation or fluency.'
      : null,
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
  /* Promise.all rather than a bare map: the callback reads each part's items,
     so mapping it alone would leave an array of promises on the response. */
  /* The working behind every rubric mark on this paper, in one query rather than
     one per item: a Writing paper has two items and a Speaking paper has fifteen,
     and fifteen round trips to draw one screen is how a report gets slow. */
  const rubricRows = await q.all(
    `SELECT question_id, criterion, score, evidence, comment, version, marked_by
       FROM rubric_scores WHERE attempt_id=? ORDER BY id`, attemptId);
  const rubricBy = new Map();
  for (const r of rubricRows) {
    if (!rubricBy.has(r.question_id)) rubricBy.set(r.question_id, []);
    rubricBy.get(r.question_id).push(r);
  }
  const linking = await linkingWords();

  out.parts = await Promise.all((await q.all(
    `SELECT ap.section_id, ap.part, s.name, s.skill
       FROM attempt_parts ap JOIN sections s ON s.id = ap.section_id
      WHERE ap.attempt_id=? ORDER BY s.sort, s.id`, attemptId))
    .map(async p => {
      const items = await q.all(
        `SELECT si.question_id, qs.type, qs.prompt,
                aa.answer given, aa.earned, aa.max_score, aa.mark_note, aa.mark_caps, aa.audio_key
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
        /* A rubric mark counts here too. This used to read the number off the
           item TYPE alone, so an essay the marker had already scored still came
           back as `earned: null` with "Awaiting marking" under it - the mark
           existed in the skill total and was invisible on the item. */
        const byRubric = !auto && i.earned != null && i.max_score;
        const crit = rubricBy.get(i.question_id) || [];
        const defs = rubric.criteriaFor(p.part);
        const nameOf = k => defs.find(d => d.key === k) || { en: k, vi: k, about: '' };

        return {
          questionId: i.question_id,
          type: i.type,
          prompt: i.prompt,
          /* The candidate's own answer can go back out; the answer key must NOT:
          the paper is reused for later sittings and for other people. */
          given: i.given || '',
          hasRecording: !!i.audio_key,
          earned: auto ? (i.earned == null ? 0 : i.earned) : (byRubric ? i.earned : null),
          max: auto ? 1 : (byRubric ? i.max_score : null),
          note: i.mark_note || (auto ? 'Left blank' : 'Awaiting marking'),
          /* The working, so a mark can be argued with. Empty for machine-marked
             items, which have nothing to argue about. */
          criteria: crit.map(c => {
            const d = nameOf(c.criterion);
            return {
              key: c.criterion, en: d.en, vi: d.vi, about: d.about,
              score: c.score, evidence: c.evidence, comment: c.comment,
              version: c.version, markedBy: c.marked_by
            };
          }),
          /* Which caps held this mark down, each in both languages. The note
             above already carries the English sentence — this is the same
             information in a shape the screen can render in Vietnamese, which
             the note cannot be. Older marks have no column value and get an
             empty list rather than a broken parse. */
          caps: (() => {
            try {
              const parsed = JSON.parse(i.mark_caps || '[]');
              return Array.isArray(parsed) ? parsed : [];
            } catch { return []; }
          })(),
          /* Measured, not judged, and labelled as such wherever it is shown.
             Only for the written parts: the spoken ones are marked from a
             transcript, and counting a transcript's sentence length would be
             measuring the transcriber. */
          diagnostics: (!auto && !!i.given && ['B', 'D'].includes(p.part))
            ? rubric.diagnostics(i.given, { linking })
            : null,
          requiredWords: rubric.MIN_WORDS[p.part] || null
        };
      });
      return {
        sectionId: p.section_id, part: p.part || null, name: p.name, skill: p.skill,
        earned: marked.reduce((a, i) => a + (i.earned || 0), 0),
        max: marked.reduce((a, i) => a + (i.max || 0), 0),
        items: marked
      };
    }));
  return out;
}

module.exports = { markAttempt, resultOf, markItem, toBand, linearScale, meanHalf, BANDS, AUTO_TYPES };
