/**
 * From "you are weak at this" to "here is the page that teaches it".
 *
 * The platform could already say a learner was weak. server/ability.js gives a
 * score per exam part, server/revision.js gives one per grammar point, and
 * server/plan.js ranks them. What none of them could do was finish the
 * sentence. The plan's grammar row linked to /prep/on-tap/ — the revision
 * screen — and its part rows to /prep/luyen/, so a learner told their e-mails
 * lose marks on grammar arrived at a generic practice list and had to work out
 * for themselves which of eleven lessons was the one meant for them.
 *
 * Eleven lessons already exist and are already written. The only thing missing
 * was a table saying which is which, and that table only existed as hand-typed
 * chips repeated across all eleven pages — where nothing on the server could
 * read it and nothing could tell when a route was renamed out from under it.
 *
 * ## Two kinds of "what to study", and the difference matters
 *
 *   A GRAMMAR GAP has a lesson. "Your conditionals are weak" is answered by the
 *   conditionals page: the material is there, it is levelled, and reading it is
 *   the right next move.
 *
 *   A TECHNIQUE GAP does not, and pretending otherwise is worse than saying
 *   nothing. "You leave out points the e-mail asked for" is not fixed by any
 *   page on this platform; it is fixed by writing more e-mails and reading the
 *   marks. A study list that invented a lesson link for it would send the
 *   learner somewhere useless and cost them the trust they need to follow the
 *   links that are real.
 *
 * So every criterion below either names lessons or explicitly names none, and
 * the interface is expected to say which. There is no third state and no
 * default: an unmapped criterion is a bug, and scripts/test-plan.mjs fails on
 * one rather than letting it quietly render as "nothing to study".
 */
'use strict';

const { q } = require('./db');
const rubric = require('./rubric');

/**
 * The grammar groups the bank uses (grammar_points.grp), each with the lesson
 * that teaches it.
 *
 * The English is the wording already on the chip rail, so a learner following a
 * link from the plan lands on a page whose own navigation calls it what the
 * plan just called it. The hrefs are the routes registered in server.js, and
 * scripts/test-plan.mjs fetches every one of them: a lesson renamed without
 * this table renamed with it is a 404 the gate catches, not a dead link a
 * learner finds.
 */
const BY_GROUP = {
  tense:       { group: 'tense',       href: '/prep/hoc/thi/',
                 en: 'Tenses', vi: 'Thì và phối thì' },
  noun:        { group: 'noun',        href: '/prep/hoc/danh-tu/',
                 en: 'Nouns and articles', vi: 'Danh từ và mạo từ' },
  adjadv:      { group: 'adjadv',      href: '/prep/hoc/tinh-tu/',
                 en: 'Adjectives and adverbs', vi: 'Tính từ và trạng từ' },
  modal:       { group: 'modal',       href: '/prep/hoc/khuyet-thieu/',
                 en: 'Modal verbs', vi: 'Động từ khuyết thiếu' },
  conditional: { group: 'conditional', href: '/prep/hoc/dieu-kien/',
                 en: 'Conditionals', vi: 'Câu điều kiện' },
  passive:     { group: 'passive',     href: '/prep/hoc/bi-dong/',
                 en: 'Passive and reported speech', vi: 'Câu bị động và câu tường thuật' },
  clause:      { group: 'clause',      href: '/prep/hoc/menh-de/',
                 en: 'Clauses', vi: 'Mệnh đề' },
  emphasis:    { group: 'emphasis',    href: '/prep/hoc/nhan-manh/',
                 en: 'Inversion and emphasis', vi: 'Đảo ngữ và nhấn mạnh' },
  register:    { group: 'register',    href: '/prep/hoc/sac-thai/',
                 en: 'Register and hedging', vi: 'Sắc thái và mức trang trọng' },
  preposition: { group: 'preposition', href: '/prep/hoc/gioi-tu/',
                 en: 'Prepositions', vi: 'Giới từ' }
};

/** Two lessons that are not grammar groups, and are what some criteria need. */
const LINKING_WORDS =
  { group: null, href: '/prep/hoc/tu-noi/', en: 'Linking words', vi: 'Từ nối' };
const IRREGULAR_VERBS =
  { group: null, href: '/prep/hoc/dong-tu-bat-quy-tac/', en: 'Irregular verbs', vi: 'Động từ bất quy tắc' };

/** Every lesson this module can point at, for the gate to fetch. */
const ALL_LESSONS = Object.values(BY_GROUP).concat([LINKING_WORDS, IRREGULAR_VERBS]);

/**
 * What a low mark on each criterion means there is to study.
 *
 * `lessons` is the fixed list. `fromOwnGaps` means the answer depends on the
 * learner rather than the criterion — grammar accuracy is not one topic, it is
 * whichever topics THIS person keeps getting wrong — so the lessons are filled
 * in per learner from their own grammar record, and the fixed list is what to
 * fall back on when there is no record yet.
 *
 * Every key in server/rubric.js's CRITERIA appears here exactly once. The empty
 * ones are deliberate and are the honest answer: no page on this platform
 * teaches "cover every point the task asked for".
 */
const FOR_CRITERION = {
  /* Grammar and spelling, wherever it is marked. The one criterion where the
     platform can be specific, because it keeps a per-topic record. */
  /* The fixed list is what a learner sees when there is no per-topic record to
     be specific from, so it is chosen for BREADTH rather than precision — the
     four places a Vietnamese learner most often loses accuracy marks.
     Prepositions earns its place on this list more than anything else on it:
     the errors come from Vietnamese using one word where English uses three,
     so they appear at A1 and never stop. */
  accuracy:     { fromOwnGaps: true,
                  lessons: [BY_GROUP.preposition, BY_GROUP.tense, BY_GROUP.clause, IRREGULAR_VERBS],
                  en: 'the grammar you keep losing marks on',
                  vi: 'những điểm ngữ pháp đang mất điểm nhiều nhất' },

  /* Tone and formality. Its own lesson, near enough word for word. */
  register:     { fromOwnGaps: false, lessons: [BY_GROUP.register],
                  en: 'choosing the right level of formality',
                  vi: 'chọn đúng mức trang trọng' },

  /* The criterion text is "opening, body, closing; one idea per paragraph;
     linking that helps rather than decorates" — which is the linking-words
     lesson, plus clauses for joining two ideas into one sentence. */
  organisation: { fromOwnGaps: false, lessons: [LINKING_WORDS, BY_GROUP.clause],
                  en: 'holding a piece of writing together',
                  vi: 'liên kết bài viết' },

  /* Range is built by meeting more language, not by reading one page about it.
     The two lessons that genuinely widen what a candidate can reach for are
     the ones that offer alternatives to the safest possible sentence. */
  range:        { fromOwnGaps: false, lessons: [BY_GROUP.emphasis, BY_GROUP.passive],
                  en: 'reaching past the safest sentence',
                  vi: 'dùng cấu trúc phong phú hơn' },

  /* Everything below is exam technique or comprehension. No lesson here
     teaches it, and saying so is the point. */
  task:         { fromOwnGaps: false, lessons: [],
                  en: 'answering everything the task asked for',
                  vi: 'trả lời đủ mọi yêu cầu của đề' },
  meaning:      { fromOwnGaps: false, lessons: [],
                  en: 'keeping the meaning of what you read',
                  vi: 'giữ đúng ý của đoạn văn' },
  correct:      { fromOwnGaps: false, lessons: [],
                  en: 'answering the question that was asked',
                  vi: 'trả lời đúng câu hỏi' },
  content:      { fromOwnGaps: false, lessons: [],
                  en: 'holding a whole sentence in your head',
                  vi: 'nhớ trọn câu' },
  structure:    { fromOwnGaps: false, lessons: [],
                  en: 'keeping a sentence\'s shape when you repeat it',
                  vi: 'giữ cấu trúc khi nhắc lại' },
  events:       { fromOwnGaps: false, lessons: [],
                  en: 'remembering what happened in the story',
                  vi: 'nhớ các sự việc trong câu chuyện' },
  sequence:     { fromOwnGaps: false, lessons: [],
                  en: 'telling it in the order it happened',
                  vi: 'kể đúng trình tự' },
  point:        { fromOwnGaps: false, lessons: [],
                  en: 'getting across what the story was about',
                  vi: 'nêu được ý chính' }
};

/**
 * How many marked pieces before a criterion is called a weakness.
 *
 * One badly-marked e-mail is an e-mail, not a pattern, and telling somebody
 * their organisation is weak on the strength of a single piece is how a
 * diagnosis stops being believed. Two is a low bar and deliberately so — these
 * are expensive items and a learner may only ever produce a handful — so the
 * count travels with every row and the interface says it.
 */
const MIN_MARKS = 2;

/** At or above this out of ten, there is nothing to fix. */
const FINE = 7;

/**
 * Every criterion this learner has been marked on, weakest first.
 *
 * Straight from `rubric_scores`, which is what the marker actually wrote — not
 * a second estimate of the same thing. The part comes from the question rather
 * than the criterion, because the same criterion means different work in
 * different parts: `accuracy` in Part D is a written e-mail and in Part I is a
 * transcript of speech.
 */
async function partCriteria(userId) {
  const rows = await q.all(
    `SELECT qu.part AS part, rs.criterion AS criterion,
            AVG(rs.score) AS score, COUNT(*) AS n, MAX(rs.at) AS lastAt
       FROM rubric_scores rs
       JOIN attempts a  ON a.id  = rs.attempt_id
       JOIN questions qu ON qu.id = rs.question_id
      WHERE a.user_id = ? AND qu.part IS NOT NULL
      GROUP BY qu.part, rs.criterion
      ORDER BY score ASC`, userId);

  return rows.map(r => {
    /* The criterion's own published name, from the rubric that produced the
       number. Looked up rather than stored so a renamed criterion cannot show
       a learner one name on the report and another on the study list. */
    const def = rubric.CRITERIA[r.part] || [];
    const meta = def.find(c => c.key === r.criterion) || null;
    return {
      part: r.part,
      criterion: r.criterion,
      score: Math.round(r.score * 10) / 10,
      n: r.n,
      lastAt: r.lastAt,
      enough: r.n >= MIN_MARKS,
      nameEn: meta ? meta.en : r.criterion,
      nameVi: meta ? meta.vi : r.criterion,
      about: meta ? meta.about : null
    };
  });
}

/**
 * The grammar groups this learner is actually getting wrong, worst first.
 *
 * By GROUP rather than by point: a study list is a list of pages to read, and
 * there is one page per group. Ten separate rows for ten conditional points
 * would be ten links to the same lesson.
 *
 * WEAK, not merely weakest. Sorting by score and taking the bottom two returns
 * two rows whatever the learner is like, so somebody at ten out of ten on
 * modals — the only grammar they have been measured on — was handed the modal
 * verbs lesson under the heading "the grammar you keep losing marks on". The
 * same FINE threshold the criteria use decides it, so a learner with no grammar
 * gap gets an empty list here and the caller falls back to the general one.
 */
async function weakGroups(userId, limit) {
  const cap = limit === undefined ? 2 : limit;
  const rows = await q.all(
    `SELECT gp.grp AS grp, SUM(se.earned) AS earned, SUM(se.max_score) AS max, COUNT(*) AS n
       FROM skill_events se
       JOIN grammar_points gp ON gp.slug = se.topic
      WHERE se.user_id = ? AND se.skill = 'grammar' AND se.max_score > 0
      GROUP BY gp.grp
      HAVING n >= ?
      ORDER BY (earned * 1.0 / max) ASC`, userId, MIN_MARKS);

  return rows
    .map(r => {
      const lesson = BY_GROUP[r.grp];
      if (!lesson) return null;                   // a group with no lesson yet
      const score = Math.round((r.earned / r.max) * 100) / 10;
      return score < FINE ? { ...lesson, score, n: r.n } : null;
    })
    .filter(Boolean)
    .slice(0, cap);
}

/**
 * What to shore up, weakest first, with somewhere to go for each.
 *
 * Returns `[{ part, criterion, score, n, nameEn, nameVi, adviceEn, adviceVi,
 * lessons }]`. `lessons` may legitimately be empty — see the header — and a
 * caller that treats empty as "nothing to show" rather than "technique, not a
 * lesson" is misreading it.
 */
async function whatToStudy(userId, limit) {
  const cap = limit === undefined ? 3 : limit;
  const all = await partCriteria(userId);
  const weak = all.filter(c => c.enough && c.score < FINE).slice(0, cap);
  if (!weak.length) return [];

  /* Asked once, however many rows want it. Two criteria both mapping to the
     learner's own gaps is common — accuracy is marked in three parts — and
     three identical queries to build three identical lists is waste the plan
     endpoint pays for on every dashboard load. */
  const own = weak.some(c => (FOR_CRITERION[c.criterion] || {}).fromOwnGaps)
    ? await weakGroups(userId) : [];

  return weak.map(c => {
    const map = FOR_CRITERION[c.criterion];
    /* An unmapped criterion is a bug in this file, not a learner with nothing
       to study, so it is loud rather than empty. */
    if (!map) {
      return { ...c, adviceEn: null, adviceVi: null, lessons: [], unmapped: true };
    }
    const lessons = map.fromOwnGaps && own.length ? own : map.lessons;
    return {
      ...c,
      adviceEn: map.en,
      adviceVi: map.vi,
      /* Copied, not shared: the caller serialises these into an API response
         and a caller that mutated one would edit the table for every learner
         until the process restarted. */
      lessons: lessons.map(l => ({ href: l.href, en: l.en, vi: l.vi, group: l.group || null })),
      technique: lessons.length === 0
    };
  });
}

module.exports = {
  whatToStudy, partCriteria, weakGroups,
  BY_GROUP, FOR_CRITERION, ALL_LESSONS, LINKING_WORDS, IRREGULAR_VERBS,
  MIN_MARKS, FINE
};
