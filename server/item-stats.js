/**
 * Item statistics over the live response table.
 *
 * `server/item-analysis.js` holds the maths and touches no database.
 * This file is the other half: it reads `item_responses`, feeds the maths,
 * and writes the answers into `item_stats` and `section_stats`.
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
 * Grouping for internal consistency is by skill and level, not by part.
 * Cronbach's alpha asks whether a set of items measures one thing; the thing
 * VPET claims to measure is listening, not part F. Parts E, F and G together
 * are twenty-two listening items and give alpha something to work with, while
 * part I on its own is two items and would produce a number that looks like
 * evidence and is not.
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

const sectionKey = (skill, level) => `${skill}-L${level == null ? '?' : level}`;

/**
 * Every response, arranged the way the maths needs it.
 *
 * One pass over the table rather than a query per item: with 55 items and a
 * few hundred attempts this is a small read, and doing it once means every
 * statistic below is computed from the same snapshot. Two queries a second
 * apart during an exam window would otherwise disagree with each other.
 *
 * @param {object} opts
 * @param {string} [opts.source]  restrict to one source, e.g. 'exam'
 * @param {string} [opts.since]   ISO date; only responses at or after it
 */
function snapshot({ source, since } = {}) {
  const where = [];
  const args = [];
  if (source) { where.push('r.source = ?'); args.push(source); }
  if (since) { where.push('r.created_at >= ?'); args.push(since); }

  const rows = q.all(
    `SELECT r.attempt_ref, r.question_id, r.chosen, r.correct, r.score, r.max_score,
            qq.skill, qq.part, qq.type, qq.options_json, qq.answer, qq.tags_json, qq.prompt
       FROM item_responses r
       JOIN questions qq ON qq.id = r.question_id
      ${where.length ? 'WHERE ' + where.join(' AND ') : ''}
      ORDER BY r.attempt_ref, r.question_id`, ...args);

  /* value() is what goes in the matrix. A rubric-marked response carries a
     score out of a maximum; a multiple-choice one carries 1 or 0. Normalising
     the rubric score to its maximum would flatten the variance that alpha is
     built on, so the raw score is kept and the maximum recorded beside it. */
  const items = new Map();     // question_id → { meta, byAttempt: Map }
  const attempts = new Set();

  for (const r of rows) {
    attempts.add(r.attempt_ref);
    if (!items.has(r.question_id)) {
      items.set(r.question_id, {
        id: r.question_id,
        part: r.part,
        skill: r.skill,
        type: r.type,
        level: vpetLevel(r),
        prompt: r.prompt,
        options: jparse(r.options_json, []),
        answer: r.answer,
        rubricMarked: r.score != null,
        byAttempt: new Map()
      });
    }
    const it = items.get(r.question_id);
    it.byAttempt.set(r.attempt_ref, {
      value: r.score != null ? r.score : (r.correct ? 1 : 0),
      correct: r.correct ? 1 : 0,
      chosen: r.chosen,
      max: r.max_score
    });
  }

  return { items, attempts: [...attempts].sort() };
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
function computeAll({ source, since, dryRun = false } = {}) {
  const { items, attempts } = snapshot({ source, since });
  const at = nowISO();

  if (!items.size) {
    return { at, attempts: 0, items: [], sections: [], summary: emptySummary() };
  }

  /* Group items into sections first: an item cannot be analysed until the
     section it sits in has told us who is stronger. */
  const sections = new Map();
  for (const it of items.values()) {
    const key = sectionKey(it.skill, it.level);
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
            COUNT(DISTINCT attempt_ref) AS attempts,
            COUNT(DISTINCT question_id) AS items,
            MIN(created_at) AS first_at, MAX(created_at) AS last_at
       FROM item_responses`);
  const need = stats.MIN_N.discrimination;
  const thin = q.all(
    `SELECT question_id, COUNT(*) AS n FROM item_responses
      GROUP BY question_id HAVING n < ? ORDER BY n`, need).length;
  return { ...row, needPerItem: need, itemsBelowThreshold: thin };
}

module.exports = { snapshot, computeAll, stored, coverage, sectionKey, vpetLevel };
