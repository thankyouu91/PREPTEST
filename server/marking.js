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
 *   · "Chấm được phần nào trả phần đó" — multiple choice and gap-fill are marked
 *     the moment the paper is handed in; writing and speaking are left pending
 *     for the AI/reviewer pass and the skill is flagged rather than scored as
 *     zero. Scoring an unmarked essay as zero would be a lie that looks like a
 *     result.
 *   · "Luôn giải thích được" — every item keeps earned, max and a note, so a
 *     disputed score can be traced back to the item that caused it.
 *
 * Marking is re-runnable on purpose. It reads the stored answers and overwrites
 * the stored scores, so fixing a marker means re-running it over old sittings
 * rather than asking anyone to sit the test again.
 */
'use strict';

const { q, tx, nowISO } = require('./db');

/** Dạng câu máy chấm được ngay. Còn lại chờ rubric (AI hoặc người). */
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

/** Bậc tương ứng với điểm tổng; null nghĩa là chưa đạt mức cấp chứng chỉ. */
function toBand(score) {
  if (score == null) return null;
  const hit = BANDS.find(b => score >= b.min);
  return hit ? { band: hit.band, cefr: hit.cefr } : { band: null, cefr: null };
}

/* ------------------------------------------------------------------ *
 * Tier 1 — one item
 * ------------------------------------------------------------------ */

/**
 * Chuẩn hoá chuỗi trước khi so: bỏ khoảng trắng thừa, không phân biệt hoa
 * thường, bỏ dấu câu ở hai đầu. Người gõ thêm một dấu chấm không phải là người
 * trả lời sai.
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
 * that as "chưa chấm", never as zero.
 */
function markItem(question, answerText) {
  if (!AUTO_TYPES.includes(question.type)) return null;

  const given = norm(answerText);
  if (!given) return { earned: 0, max: 1, note: 'Bỏ trống' };

  if (question.type === 'mcq') {
    const ok = given === norm(question.answer);
    return { earned: ok ? 1 : 0, max: 1, note: ok ? 'Đúng' : 'Sai' };
  }

  /* gap: đáp án có thể khai nhiều biến thể cách nhau bằng '|' (color|colour).
     Một biến thể khớp là đúng — đây là chính tả khác nhau của cùng một câu trả
     lời, không phải hai câu trả lời khác nhau. */
  const variants = String(question.answer || '').split('|').map(norm).filter(Boolean);
  if (!variants.length) return { earned: 0, max: 1, note: 'Câu hỏi chưa có đáp án' };
  const ok = variants.includes(given);
  return { earned: ok ? 1 : 0, max: 1, note: ok ? 'Đúng' : 'Sai' };
}

/* ------------------------------------------------------------------ *
 * Tier 3 — raw score to the published scale
 * ------------------------------------------------------------------ */

/**
 * VPET dùng quy đổi `linear` (docs/SCORING.md §2.2): raw/max × 10, làm tròn tới
 * 0,5. Không có câu nào thì không có điểm — trả null chứ không trả 0, vì 0 là
 * một kết quả còn "chưa có gì để chấm" thì không.
 */
function linearScale(earned, max) {
  if (!max) return null;
  return Math.round((earned / max) * 10 * 2) / 2;
}

/** Trung bình cộng các kỹ năng, làm tròn 0,5 (docs/SCORING.md §1.1). */
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

  /* Mọi câu của đề, kèm câu trả lời đã lưu (nếu có). LEFT JOIN chứ không JOIN:
     câu bỏ trống vẫn phải được tính vào mẫu số, nếu không thì bỏ trống càng
     nhiều điểm càng cao. */
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
        /* Viết và Nói: chờ rubric. Đếm riêng để biết kỹ năng này chưa xong. */
        bucket.pending += 1;
        continue;
      }
      bucket.earned += mark.earned;
      bucket.max += mark.max;
      bucket.marked += 1;

      /* Chỉ ghi dấu vết cho câu đã có dòng trả lời. Câu bỏ trống hoàn toàn
         không có dòng nào; nó vẫn vào mẫu số ở trên, và không cần tạo ra một
         dòng rỗng chỉ để ghi "0 điểm". */
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

    /* Điểm tổng chỉ có nghĩa khi cả bốn kỹ năng đã chấm xong. Trung bình của
       hai kỹ năng rồi gọi nó là "điểm tổng" là một con số sai đội lốt kết quả. */
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
 * what the buyer's plan allows: Starter bought "report bình thường thang điểm",
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
    /* Nói rõ đây là điểm tham chiếu khi luyện, không phải điểm thi thật
       (docs/SCORING.md §2.1 nguyên tắc 5). */
    disclaimer: 'Điểm tham chiếu khi luyện tập, không phải điểm thi thật.',
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
      /* Điểm tối đa suy ra từ DẠNG CÂU, không phải từ dòng đã lưu. Câu bỏ trống
         hoàn toàn thì không có dòng attempt_answers nào, nên lấy theo dòng đã
         lưu sẽ làm nó biến mất khỏi mẫu số: phần hiện "1/1" trong khi kỹ năng
         chấm 5,0 — bỏ trống càng nhiều thì phần trông càng hoàn hảo. */
      const marked = items.map(i => {
        const auto = AUTO_TYPES.includes(i.type);
        return {
          questionId: i.question_id,
          type: i.type,
          prompt: i.prompt,
          /* Câu trả lời của chính học viên trả lại được; đáp án đúng thì KHÔNG:
             đề còn dùng lại cho lượt sau và cho người khác. */
          given: i.given || '',
          hasRecording: !!i.audio_key,
          earned: auto ? (i.earned == null ? 0 : i.earned) : null,
          max: auto ? 1 : null,
          note: i.mark_note || (auto ? 'Bỏ trống' : 'Chờ chấm')
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
