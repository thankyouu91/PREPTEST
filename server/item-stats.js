/**
 * Item statistics over the responses the exam engine already records.
 *
 * `server/item-analysis.js` holds the maths and touches no database.
 * This file is the other half: it reads `attempt_answers`, feeds the maths,
 * and writes the answers into `item_stats` and `section_stats`.
 *
 * ---------------------------------------------------------------------------
 * WHY IT READS attempt_answers RATHER THAN A TABLE OF ITS OWN
 *
 * Because the exam engine already writes one row per candidate per item, with
 * the answer given and the marks earned. A second table holding the same
 * responses would be two records of one event, and two records of one event
 * disagree eventually — at which point the item statistics and the candidate's
 * score report are both defensible and one of them is wrong.
 *
 * The cost of reading the engine's table is a join and a dependency on its
 * column names. The cost of not doing so is a bank retired on numbers that no
 * longer match the marks anybody was given.
 * ---------------------------------------------------------------------------
 *
 * ---------------------------------------------------------------------------
 * WHY THE RESULT IS STORED RATHER THAN COMPUTED ON REQUEST
 *
 * Not for speed. Because a recommendation to retire an item needs a date and a
 * sample size attached to it, so that an author looking at the bank six months
 * later can see the verdict was reached on 140 responses in March rather than
 * on whatever happens to be in the table today. A number computed fresh on
 * every page load has no history and cannot be argued with.
 * ---------------------------------------------------------------------------
 *
 * Grouping for internal consistency is by skill, not by part. Cronbach's alpha
 * asks whether a set of items measures one thing; the thing VPET claims to
 * measure is listening, not part F. Parts E, F and G together give alpha
 * something to work with, while part I on its own is two items and would
 * produce a number that looks like evidence and is not.
 */
'use strict';

const { q, nowISO, jparse } = require('./db');
const stats = require('./item-analysis');

/* Which VPET level an item belongs to. The `level` column on `questions`
   holds a CEFR label, so the exam level lives in the tags — see
   scripts/nhap-kich-ban.js, which writes `level-1` / `level-2`. */
function vpetLevel(row) {
  const tags = jparse(row.tags_json, []);
  const tag = tags.find(t => /^level-\d$/.test(t));
  return tag ? Number(tag.slice(6)) : null;
}

/**
 * Which set of items an alpha is computed over.
 *
 * The skill, not the part and not the CEFR tag. Alpha asks whether a set of
 * items measures one thing, and the one thing being claimed is the number on
 * the report — `attempt_scores.skill`. Grouping any finer would compute a
 * reliability for a total nobody is ever given.
 *
 * When `tests.level` lands (ROADMAP, two exam levels) this becomes skill and
 * level together, because a Level 1 and a Level 2 paper are then two different
 * measurements and pooling them would flatter both.
 */
const sectionKey = skill => skill || 'unknown';

/**
 * Every marked response, arranged the way the maths needs it.
 *
 * One pass over the table rather than a query per item: doing it once means
 * every statistic below is computed from the same snapshot. Two queries a
 * second apart during an exam window would otherwise disagree with each other.
 *
 * Only submitted attempts. A sitting still in progress has blanks that are not
 * wrong answers — they are unreached ones — and counting them as wrong makes
 * every item at the end of a paper look harder than it is.
 *
 * Only marked responses. An unmarked rubric item is waiting for a human, and
 * treating "not yet judged" as zero would retire every speaking item in the
 * bank on the strength of a queue.
 *
 * @param {object} opts
 * @param {string} [opts.since]  ISO date; only attempts submitted at or after it
 */
function snapshot({ since } = {}) {
  const where = ["a.status = 'submitted'", 'r.marked_at IS NOT NULL'];
  const args = [];
  if (since) { where.push('a.submitted_at >= ?'); args.push(since); }

  const rows = q.all(
    `SELECT r.attempt_id, r.question_id, r.answer AS chosen, r.earned, r.max_score,
            qq.skill, qq.part, qq.type, qq.options_json, qq.answer AS key_answer,
            qq.tags_json, qq.prompt
       FROM attempt_answers r
       JOIN attempts  a  ON a.id = r.attempt_id
       JOIN questions qq ON qq.id = r.question_id
      WHERE ${where.join(' AND ')}
      ORDER BY r.attempt_id, r.question_id`, ...args);

  /* `value` is what goes in the matrix: the mark earned, whatever the scale.
     Normalising a rubric score to its maximum would flatten the variance alpha
     is built on, so the raw mark is kept and the maximum recorded beside it. */
  const items = new Map();     // question_id → { meta, byAttempt: Map }
  const attempts = new Set();

  for (const r of rows) {
    const max = r.max_score > 0 ? r.max_score : 1;
    attempts.add(r.attempt_id);

    if (!items.has(r.question_id)) {
      items.set(r.question_id, {
        id: r.question_id,
        part: r.part,
        skill: r.skill,
        type: r.type,
        level: vpetLevel(r),
        prompt: r.prompt,
        options: jparse(r.options_json, []),
        answer: r.key_answer,
        /* A response is rubric-marked when its scale has more than two points.
           Facility then has to be a mean over the maximum rather than a pass
           rate — see item-analysis.facility. */
        rubricMarked: max > 1,
        byAttempt: new Map()
      });
    }
    const it = items.get(r.question_id);
    it.byAttempt.set(r.attempt_id, {
      value: r.earned || 0,
      /* Full marks is the only thing that means "right" across both scales.
         For a 0/1 item it is the item; for a rubric item it is a top band,
         and the distractor analysis below is the only consumer either way. */
      correct: r.earned >= max ? 1 : 0,
      chosen: r.chosen,
      max
    });
  }

  return { items, attempts: [...attempts].sort((a, b) => a - b) };
}

/**
 * Per-candidate totals within one section.
 *
 * Discrimination correlates an item against the rest of *its own* section, not
 * against the whole exam. Correlating a listening item against a total that
 * includes the writing marks would mostly measure whether the two skills move
 * together in this population, which is a different and much larger question.
 */
function sectionTotals(itemList, attempts) {
  const totals = new Map(attempts.map(a => [a, 0]));
  for (const it of itemList) {
    for (const a of attempts) {
      const cell = it.byAttempt.get(a);
      if (cell) totals.set(a, totals.get(a) + cell.value);
    }
  }
  return totals;
}

/**
 * Compute everything and, unless `dryRun`, write it down.
 *
 * Returns the full report either way, so the command-line tool and the admin
 * endpoint show the same numbers and there is no second implementation to
 * drift.
 */
function computeAll({ since, dryRun = false } = {}) {
  const { items, attempts } = snapshot({ since });
  const at = nowISO();

  if (!items.size) {
    return { at, attempts: 0, items: [], sections: [], summary: emptySummary() };
  }

  /* Group items into sections first: an item cannot be analysed until the
     section it sits in has told us who is stronger. */
  const sections = new Map();
  for (const it of items.values()) {
    const key = sectionKey(it.skill);
    if (!sections.has(key)) sections.set(key, []);
    sections.get(key).push(it);
  }

  const itemReports = [];
  const sectionReports = [];

  for (const [key, list] of [...sections].sort((a, b) => a[0].localeCompare(b[0]))) {
    /* Only attempts that answered something in this section. A candidate who
       sat listening only must not count as 22 missing writing responses. */
    const seen = attempts.filter(a => list.some(it => it.byAttempt.has(a)));

    /* Alpha needs a rectangular matrix, so it uses the attempts that answered
       every item in the section. A partial attempt is fine for one item's
       facility and destroys a covariance. */
    const complete = seen.filter(a => list.every(it => it.byAttempt.has(a)));
    const matrix = complete.map(a => list.map(it => it.byAttempt.get(a).value));

    const sec = stats.analyseSection({ section: key, matrix });
    sec.items = list.length;
    sec.attemptsSeen = seen.length;
    sec.attemptsComplete = complete.length;
    /* Worth saying out loud: alpha computed on a third of the attempts is a
       different claim from alpha on all of them, and the gap is the thing a
       reader should notice first. */
    sec.partial = seen.length - complete.length;
    sectionReports.push(sec);

    const totals = sectionTotals(list, seen);

    for (const it of list) {
      const answered = seen.filter(a => it.byAttempt.has(a));
      /* The mark itself, not a pass/fail derived from it. Dichotomising a
         rubric score at some cut would throw away four fifths of what the
         marker said and make a mid-scoring essay look like a failed one. */
      const itemScores = answered.map(a => it.byAttempt.get(a).value);
      const totalScores = answered.map(a => totals.get(a));
      const max = Math.max(1, ...answered.map(a => it.byAttempt.get(a).max || 0));

      /* Distractor analysis needs options, a key and what people actually
         picked. A gap-fill has a key but no options, and an essay has
         neither, so both correctly skip it rather than inventing one. */
      const usable = it.type === 'mcq' && it.options.length >= 2 && it.answer;
      const chosen = usable ? answered.map(a => it.byAttempt.get(a).chosen) : null;

      const report = stats.analyseItem({
        id: it.id,
        part: it.part,
        itemScores,
        totalScores,
        max,
        chosen: chosen && chosen.every(c => c != null) ? chosen : null,
        options: usable ? it.options : null,
        key: usable ? it.answer : null
      });

      report.section = key;
      report.skill = it.skill;
      report.level = it.level;
      report.type = it.type;
      report.rubricMarked = it.rubricMarked;
      report.prompt = (it.prompt || '').slice(0, 120);
      itemReports.push(report);
    }
  }

  if (!dryRun) persist(itemReports, sectionReports, at);

  return {
    at,
    attempts: attempts.length,
    items: itemReports,
    sections: sectionReports,
    summary: summarise(itemReports, sectionReports)
  };
}

function persist(itemReports, sectionReports, at) {
  for (const r of itemReports) {
    q.run(
      `INSERT INTO item_stats (question_id, n, facility, discrimination, reliable,
                               recommend, why, detail_json, computed_at)
       VALUES (?,?,?,?,?,?,?,?,?)
       ON CONFLICT(question_id) DO UPDATE SET
         n=excluded.n, facility=excluded.facility, discrimination=excluded.discrimination,
         reliable=excluded.reliable, recommend=excluded.recommend, why=excluded.why,
         detail_json=excluded.detail_json, computed_at=excluded.computed_at`,
      r.id, r.facility.n, r.facility.p, r.discrimination.r,
      r.facility.reliable && r.discrimination.reliable ? 1 : 0,
      r.recommend, r.why,
      JSON.stringify({
        section: r.section, part: r.part, skill: r.skill, level: r.level,
        facility: r.facility, discrimination: r.discrimination, distractors: r.distractors
      }), at);
  }

  for (const s of sectionReports) {
    q.run(
      `INSERT INTO section_stats (section, n, k, alpha, sem, reliable, verdict, computed_at)
       VALUES (?,?,?,?,?,?,?,?)
       ON CONFLICT(section) DO UPDATE SET
         n=excluded.n, k=excluded.k, alpha=excluded.alpha, sem=excluded.sem,
         reliable=excluded.reliable, verdict=excluded.verdict, computed_at=excluded.computed_at`,
      s.section, s.n, s.k, s.alpha, s.sem, s.reliable ? 1 : 0, s.verdict, at);
  }
}

const emptySummary = () => ({
  total: 0, keep: 0, wait: 0, review: 0, retire: 0, 'fix-key': 0,
  reliable: 0, sectionsReliable: 0, sections: 0, actionable: 0, ready: false
});

function summarise(itemReports, sectionReports) {
  const s = emptySummary();
  s.total = itemReports.length;
  for (const r of itemReports) {
    s[r.recommend] = (s[r.recommend] || 0) + 1;
    if (r.facility.reliable) s.reliable++;
  }
  s.sections = sectionReports.length;
  s.sectionsReliable = sectionReports.filter(x => x.reliable).length;
  /* Items whose verdict asks somebody to do something. `wait` is not one:
     nothing is wrong, there is simply not enough data yet. */
  s.actionable = s.review + s.retire + s['fix-key'];
  /* The gate that lets the report start showing a confidence interval. Until
     one section has a trustworthy alpha there is no standard error to show,
     and docs/ACADEMIC.md §9 step 4 has not been reached. */
  s.ready = s.sectionsReliable > 0;
  return s;
}

/** What was last written, for the admin screens. Never recomputes. */
function stored({ recommend } = {}) {
  const where = recommend ? 'WHERE s.recommend = ?' : '';
  const args = recommend ? [recommend] : [];
  const items = q.all(
    `SELECT s.*, qq.part, qq.skill, qq.type, qq.prompt
       FROM item_stats s JOIN questions qq ON qq.id = s.question_id
       ${where}
       ORDER BY CASE s.recommend
                  WHEN 'fix-key' THEN 0 WHEN 'retire' THEN 1
                  WHEN 'review'  THEN 2 WHEN 'wait'   THEN 3 ELSE 4 END,
                s.discrimination ASC`, ...args)
    .map(r => ({ ...r, detail: jparse(r.detail_json, {}), detail_json: undefined }));

  const sections = q.all('SELECT * FROM section_stats ORDER BY section');
  const computedAt = items.length ? items[0].computed_at : null;
  return { computedAt, items, sections };
}

/** How much data there is, without computing anything from it. */
function coverage() {
  const row = q.get(
    `SELECT COUNT(*) AS responses,
            COUNT(DISTINCT r.attempt_id) AS attempts,
            COUNT(DISTINCT r.question_id) AS items,
            MIN(a.submitted_at) AS first_at, MAX(a.submitted_at) AS last_at
       FROM attempt_answers r
       JOIN attempts a ON a.id = r.attempt_id
      WHERE a.status = 'submitted' AND r.marked_at IS NOT NULL`);

  /* Counted separately rather than as part of the row above, because it is a
     different question: not "how much data is there" but "how much of it is
     still queued behind a marker". A bank can look starved when it is only
     waiting. */
  const pending = q.val(
    `SELECT COUNT(*) FROM attempt_answers r JOIN attempts a ON a.id = r.attempt_id
      WHERE a.status = 'submitted' AND r.marked_at IS NULL`) || 0;

  const need = stats.MIN_N.discrimination;
  const thin = q.all(
    `SELECT r.question_id, COUNT(*) AS n
       FROM attempt_answers r JOIN attempts a ON a.id = r.attempt_id
      WHERE a.status = 'submitted' AND r.marked_at IS NOT NULL
      GROUP BY r.question_id HAVING n < ?`, need).length;

  return { ...row, unmarked: pending, needPerItem: need, itemsBelowThreshold: thin };
}

module.exports = { snapshot, computeAll, stored, coverage, sectionKey, vpetLevel };
