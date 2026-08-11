/**
 * Exam engine — the sitting itself.
 *
 * This is the half of the engine that has to be right, because none of it can
 * be trusted to the browser:
 *
 *   · Timing is stamped and checked here. A client clock can be wound back,
 *     a tab can be frozen and resumed, a request can be replayed. The deadline
 *     for a part is written when the candidate enters it and every later write
 *     is measured against it.
 *   · Replays are counted here. A play counter in JavaScript is a suggestion;
 *     a candidate who opens the console has infinite listens to a dictation.
 *   · Items go out with the answer key stripped. Nothing on this router ever
 *     serialises `answer` or `explanation` — the mark comes later, server side.
 *   · A sitting is charged against the buyer's plan here, once, at the start.
 *
 * What is deliberately NOT here: marking. Scoring lives in its own pass
 * (docs/SCORING.md, tầng 1-3) and runs over the saved answers after submit, so
 * a marking change never needs the candidate to sit the test again.
 */
'use strict';

const express = require('express');
const { q, tx, nowISO } = require('./db');
const A = require('./auth');
const storage = require('./storage');
const { entitlementOf } = require('./entitlements');
const PLANS = require('./data/plans');
const marking = require('./marking');

const router = express.Router();

const str = (v, max) => (typeof v === 'string' ? v.trim().slice(0, max || 400) : '');
const int = (v, dflt) => (Number.isFinite(+v) ? Math.trunc(+v) : dflt);
const bad = (res, msg) => res.status(400).json({ error: msg });

/** How many times an audio item may be played when the blueprint says nothing.
    A platform default like the per-part minutes, not a published exam rule —
    the owner sets the real numbers per part once they are confirmed. */
const DEFAULT_REPLAYS = 2;

/* Spoken answers are recorded in the browser and uploaded as bytes. Same
   ceiling and same raw-body approach as the admin MP3 upload: no multipart
   parser, so no new dependency. */
const answerAudioBody = express.raw({ type: ['audio/*', 'application/octet-stream'], limit: '10mb' });

/* ------------------------------------------------------------------ *
 * Helpers
 * ------------------------------------------------------------------ */

/** The attempt, only if it belongs to the caller. Anything else is a 404: an
    attempt id that exists must not be distinguishable from one that does not. */
function ownAttempt(req) {
  const id = int(req.params.id, 0);
  if (!id) return null;
  return q.get('SELECT * FROM attempts WHERE id=? AND user_id=?', id, req.user.id) || null;
}

/** Minutes allowed for a section, from the test as built. */
function partWindow(sectionId) {
  const s = q.get('SELECT minutes FROM sections WHERE id=?', sectionId);
  return Math.max(0, (s && s.minutes) || 0);
}

/** Seconds left in a part; null when it has no timer or has not started. */
function secondsLeft(row) {
  if (!row || !row.ends_at) return null;
  return Math.max(0, Math.round((new Date(row.ends_at) - new Date()) / 1000));
}

/** True when the part is open for writing right now. */
function partOpen(row) {
  if (!row || !row.started_at || row.closed_at) return false;
  if (!row.ends_at) return true;                        // no timer declared
  return new Date(row.ends_at) > new Date();
}

/**
 * The state a runner needs, with nothing it must not have.
 *
 * Items carry the prompt and the options but never the answer: the options of
 * a multiple-choice item are on screen anyway, the answer is what marks it.
 */
function attemptState(att) {
  const test = q.get('SELECT * FROM tests WHERE id=?', att.test_id);
  const parts = q.all(
    `SELECT ap.*, s.name, s.skill, s.type, s.minutes, s.sort
       FROM attempt_parts ap JOIN sections s ON s.id = ap.section_id
      WHERE ap.attempt_id=? ORDER BY s.sort, s.id`, att.id);

  const answers = q.all('SELECT * FROM attempt_answers WHERE attempt_id=?', att.id);
  const byQuestion = new Map(answers.map(a => [a.question_id, a]));

  return {
    id: att.id,
    testId: att.test_id,
    testTitle: test ? test.title : att.test_id,
    familyId: test ? test.family_id : null,
    status: att.status,
    startedAt: att.started_at,
    submittedAt: att.submitted_at,
    parts: parts.map(p => {
      const items = q.all(
        `SELECT si.sort, qs.id, qs.prompt, qs.type, qs.options_json, qs.audio_key
           FROM section_items si JOIN questions qs ON qs.id = si.question_id
          WHERE si.section_id=? ORDER BY si.sort, si.id`, p.section_id);
      const open = partOpen(p);
      return {
        sectionId: p.section_id,
        part: p.part || null,
        name: p.name,
        skill: p.skill,
        type: p.type,
        minutes: p.minutes,
        startedAt: p.started_at,
        endsAt: p.ends_at,
        closedAt: p.closed_at,
        secondsLeft: secondsLeft(p),
        open,
        items: items.map(it => {
          const saved = byQuestion.get(it.id);
          const used = saved ? saved.replays_used : 0;
          return {
            questionId: it.id,
            prompt: it.prompt,
            type: it.type,
            options: JSON.parse(it.options_json || '[]'),
            hasAudio: !!it.audio_key,
            replaysLeft: it.audio_key ? Math.max(0, DEFAULT_REPLAYS - used) : null,
            answer: saved ? saved.answer : '',
            hasRecording: !!(saved && saved.audio_key)
          };
        })
      };
    })
  };
}

/* ------------------------------------------------------------------ *
 * Start / resume
 * ------------------------------------------------------------------ */

/**
 * Start a sitting, or hand back the one already running.
 *
 * A sitting is charged when it starts, not when it is submitted. Charging on
 * submit would make abandoning free and unlimited, which empties the meaning of
 * "ten sittings". Resuming never charges twice — the running attempt is
 * returned as it stands.
 */
router.post('/attempts', A.requireUser, A.csrfGuard, (req, res) => {
  const testId = str(req.body && req.body.testId, 60);

  const running = q.get(
    "SELECT * FROM attempts WHERE user_id=? AND status='in_progress' ORDER BY id DESC LIMIT 1",
    req.user.id);
  if (running) {
    /* Một lúc chỉ một bài đang làm: mở bài khác trong khi bài cũ còn dở là cách
       chắc chắn để mất bài đang làm mà không ai biết. */
    if (testId && running.test_id !== testId) {
      return res.status(409).json({
        error: 'Bạn đang có một bài thi chưa nộp. Nộp hoặc kết thúc bài đó trước khi mở bài mới.',
        attemptId: running.id, testId: running.test_id
      });
    }
    return res.json({ resumed: true, attempt: attemptState(running) });
  }

  const test = q.get("SELECT * FROM tests WHERE id=? AND status='published'", testId);
  if (!test) return res.status(404).json({ error: 'Không tìm thấy bài thi đang mở.' });
  const fam = q.get('SELECT status FROM families WHERE id=?', test.family_id);
  if (fam && fam.status === 'coming_soon') {
    return bad(res, 'Kỳ thi này chưa mở.');
  }

  const ent = entitlementOf(req.user.id);
  if (!ent) {
    return res.status(403).json({ error: 'Bạn chưa có gói còn hiệu lực. Nhập code để bắt đầu luyện.', need: 'plan' });
  }
  if (ent.attemptsLeft !== null && ent.attemptsLeft <= 0) {
    return res.status(403).json({
      error: 'Bạn đã dùng hết ' + ent.attemptsLimit + ' lượt thi của gói. Nâng gói để luyện không giới hạn.',
      need: 'attempts'
    });
  }

  const sections = q.all('SELECT * FROM sections WHERE test_id=? ORDER BY sort, id', test.id);
  if (!sections.length) return bad(res, 'Đề này chưa có phần nào.');
  const itemCount = q.val(
    `SELECT COUNT(*) c FROM section_items si JOIN sections s ON s.id=si.section_id WHERE s.test_id=?`, test.id);
  if (!itemCount) return bad(res, 'Đề này chưa có câu hỏi nào.');

  /* Tính vào đúng mã đã trả tiền cho lượt này: hạn mức thuộc về lần mua, không
     thuộc về tài khoản. Ai cầm hai mã có hạn mức thì trừ vào mã còn chỗ, chứ
     không dồn hết vào mã đầu tiên — tổng vẫn đúng nhưng con số trên từng mã sẽ
     vô nghĩa, và đó chính là con số hiện ra ở màn "Code của tôi". */
  const liveCodes = q.all(
    `SELECT * FROM codes
      WHERE user_id=? AND status='redeemed' AND plan_id IS NOT NULL
        AND (access_expires_at IS NULL OR access_expires_at > ?)
      ORDER BY id ASC`, req.user.id, nowISO())
    .map(c => ({ row: c, plan: PLANS.byId(c.plan_id) }))
    .filter(x => x.plan);
  const capped = liveCodes.filter(x => x.plan.attempts !== PLANS.UNLIMITED);
  const chargeable = capped.find(x => (x.row.attempts_used || 0) < x.plan.attempts) || null;
  /* Mã ghi lên lượt thi là mã đã trả tiền cho nó — với gói không giới hạn thì
     không có gì để trừ, nhưng vẫn cần biết lượt này thuộc lần mua nào. */
  const chargeCode = (chargeable && chargeable.row) || (liveCodes[0] && liveCodes[0].row) || null;

  const at = nowISO();
  let attemptId = 0;
  tx(() => {
    const r = q.run(
      `INSERT INTO attempts (user_id,test_id,code_id,status,started_at,updated_at)
       VALUES (?,?,?,'in_progress',?,?)`,
      req.user.id, test.id, chargeCode ? chargeCode.id : null, at, at);
    attemptId = Number(r.lastInsertRowid);
    for (const s of sections) {
      q.run('INSERT INTO attempt_parts (attempt_id,section_id,part) VALUES (?,?,?)',
        attemptId, s.id, s.part || null);
    }
    /* Chỉ trừ lượt khi gói có giới hạn. Gói không giới hạn vẫn ghi nhận số lượt
       đã dùng để báo cáo, nhưng không có gì để hết. */
    if (ent.attemptsLimit !== null && chargeable) {
      q.run('UPDATE codes SET attempts_used = attempts_used + 1 WHERE id=?', chargeable.row.id);
    }
  });

  const att = q.get('SELECT * FROM attempts WHERE id=?', attemptId);
  res.status(201).json({ resumed: false, attempt: attemptState(att) });
});

/** Bài đang làm dở, nếu có — dùng để mở lại sau khi đóng trình duyệt. */
router.get('/attempts/current', A.requireUser, (req, res) => {
  const att = q.get(
    "SELECT * FROM attempts WHERE user_id=? AND status='in_progress' ORDER BY id DESC LIMIT 1",
    req.user.id);
  if (!att) return res.json({ attempt: null });
  res.set('Cache-Control', 'no-store').json({ attempt: attemptState(att) });
});

router.get('/attempts/:id', A.requireUser, (req, res) => {
  const att = ownAttempt(req);
  if (!att) return res.status(404).json({ error: 'Không tìm thấy lượt thi.' });
  res.set('Cache-Control', 'no-store').json({ attempt: attemptState(att) });
});

/* ------------------------------------------------------------------ *
 * Per-part timer
 * ------------------------------------------------------------------ */

/**
 * Enter a part and start its clock.
 *
 * The deadline is computed and stored here rather than sent by the client, and
 * entering a part that has already run is not a way to get a fresh clock.
 */
router.post('/attempts/:id/parts/:sectionId/start', A.requireUser, A.csrfGuard, (req, res) => {
  const att = ownAttempt(req);
  if (!att) return res.status(404).json({ error: 'Không tìm thấy lượt thi.' });
  if (att.status !== 'in_progress') return bad(res, 'Lượt thi này đã nộp.');

  const sectionId = int(req.params.sectionId, 0);
  const row = q.get('SELECT * FROM attempt_parts WHERE attempt_id=? AND section_id=?', att.id, sectionId);
  if (!row) return res.status(404).json({ error: 'Không tìm thấy phần thi trong lượt này.' });
  if (row.closed_at) return bad(res, 'Phần này đã kết thúc.');
  if (row.started_at) {
    /* Vào lại phần đang mở là chuyện bình thường (tải lại trang, mất mạng);
       nhưng không được cấp đồng hồ mới. */
    return res.json({ sectionId, startedAt: row.started_at, endsAt: row.ends_at, secondsLeft: secondsLeft(row) });
  }

  const at = new Date();
  const minutes = partWindow(sectionId);
  const ends = minutes ? new Date(at.getTime() + minutes * 60000).toISOString() : null;
  q.run('UPDATE attempt_parts SET started_at=?, ends_at=? WHERE id=?', at.toISOString(), ends, row.id);
  q.run('UPDATE attempts SET updated_at=? WHERE id=?', at.toISOString(), att.id);
  res.json({ sectionId, startedAt: at.toISOString(), endsAt: ends, secondsLeft: minutes ? minutes * 60 : null });
});

/** Kết thúc sớm một phần — không quay lại được, đúng như phòng thi thật. */
router.post('/attempts/:id/parts/:sectionId/close', A.requireUser, A.csrfGuard, (req, res) => {
  const att = ownAttempt(req);
  if (!att) return res.status(404).json({ error: 'Không tìm thấy lượt thi.' });
  if (att.status !== 'in_progress') return bad(res, 'Lượt thi này đã nộp.');
  const sectionId = int(req.params.sectionId, 0);
  const row = q.get('SELECT * FROM attempt_parts WHERE attempt_id=? AND section_id=?', att.id, sectionId);
  if (!row) return res.status(404).json({ error: 'Không tìm thấy phần thi trong lượt này.' });
  if (row.closed_at) return res.json({ ok: true, closedAt: row.closed_at });
  const at = nowISO();
  q.run('UPDATE attempt_parts SET closed_at=? WHERE id=?', at, row.id);
  q.run('UPDATE attempts SET updated_at=? WHERE id=?', at, att.id);
  res.json({ ok: true, closedAt: at });
});

/* ------------------------------------------------------------------ *
 * Autosave
 * ------------------------------------------------------------------ */

/** Câu hỏi có thật trong lượt này không, và đang ở phần nào */
function itemOf(attemptId, questionId) {
  return q.get(
    `SELECT si.section_id, ap.* FROM section_items si
       JOIN attempt_parts ap ON ap.section_id = si.section_id AND ap.attempt_id=?
      WHERE si.question_id=?`, attemptId, questionId);
}

/**
 * Save answers as they are typed.
 *
 * Accepts a batch so a runner can flush several fields at once. Every answer is
 * checked against its own part's clock: a batch that arrives after the part
 * closed is refused item by item, and the response says which ones were kept,
 * so the runner can show the candidate the truth instead of a silent loss.
 */
router.patch('/attempts/:id/answers', A.requireUser, A.csrfGuard, (req, res) => {
  const att = ownAttempt(req);
  if (!att) return res.status(404).json({ error: 'Không tìm thấy lượt thi.' });
  if (att.status !== 'in_progress') return bad(res, 'Lượt thi này đã nộp, không sửa được nữa.');

  const list = Array.isArray(req.body && req.body.answers) ? req.body.answers.slice(0, 200) : null;
  if (!list || !list.length) return bad(res, 'Không có đáp án nào để lưu.');

  const saved = [];
  const rejected = [];
  const at = nowISO();
  tx(() => {
    for (const raw of list) {
      const questionId = int(raw && raw.questionId, 0);
      const answer = str(raw && raw.answer, 20000);
      const item = itemOf(att.id, questionId);
      if (!item) { rejected.push({ questionId, reason: 'not-in-attempt' }); continue; }
      if (!partOpen(item)) { rejected.push({ questionId, reason: 'part-closed' }); continue; }
      q.run(
        `INSERT INTO attempt_answers (attempt_id,question_id,section_id,answer,updated_at)
         VALUES (?,?,?,?,?)
         ON CONFLICT(attempt_id,question_id) DO UPDATE SET answer=excluded.answer, updated_at=excluded.updated_at`,
        att.id, questionId, item.section_id, answer, at);
      saved.push(questionId);
    }
    q.run('UPDATE attempts SET updated_at=? WHERE id=?', at, att.id);
  });

  res.json({ saved, rejected, savedAt: at });
});

/* ------------------------------------------------------------------ *
 * Audio: prompt playback and spoken answers
 * ------------------------------------------------------------------ */

/**
 * Play the prompt audio for one item, and spend one replay doing it.
 *
 * The count is decided and stored here. Anything the browser tracks is a
 * courtesy display; a candidate with the network tab open would otherwise have
 * a dictation on loop.
 */
router.get('/attempts/:id/items/:questionId/audio', A.requireUser, async (req, res) => {
  const att = ownAttempt(req);
  if (!att) return res.status(404).json({ error: 'Không tìm thấy lượt thi.' });
  if (att.status !== 'in_progress') return res.status(403).json({ error: 'Lượt thi này đã nộp.' });

  const questionId = int(req.params.questionId, 0);
  const item = itemOf(att.id, questionId);
  if (!item) return res.status(404).json({ error: 'Câu hỏi không thuộc lượt thi này.' });
  if (!partOpen(item)) return res.status(403).json({ error: 'Phần này đã hết giờ.' });

  const qs = q.get('SELECT audio_key FROM questions WHERE id=?', questionId);
  if (!qs || !qs.audio_key) return res.status(404).json({ error: 'Câu này không có tệp âm thanh.' });

  const row = q.get('SELECT * FROM attempt_answers WHERE attempt_id=? AND question_id=?', att.id, questionId);
  const used = row ? row.replays_used : 0;
  if (used >= DEFAULT_REPLAYS) {
    return res.status(429).json({ error: 'Bạn đã nghe đủ số lần cho câu này.', replaysLeft: 0 });
  }

  let file;
  try {
    file = await storage.get(qs.audio_key);
  } catch (e) {
    console.error('[exam] audio read failed', e);
    return res.status(502).json({ error: 'Không đọc được tệp âm thanh.' });
  }

  /* Chỉ trừ lượt nghe khi đã chắc chắn đọc được tệp: hỏng ổ đĩa mà vẫn trừ thì
     thí sinh mất lượt vì lỗi của hệ thống. */
  const at = nowISO();
  q.run(
    `INSERT INTO attempt_answers (attempt_id,question_id,section_id,replays_used,updated_at)
     VALUES (?,?,?,1,?)
     ON CONFLICT(attempt_id,question_id) DO UPDATE SET replays_used = replays_used + 1, updated_at=excluded.updated_at`,
    att.id, questionId, item.section_id, at);

  res.set('Content-Type', 'audio/mpeg')
    .set('Content-Length', String(file.body.length))
    /* Đề thi là tài liệu có đáp án: không được nằm trong cache dùng chung, và
       cache riêng cũng không, vì cache lại là một lần nghe không bị đếm. */
    .set('Cache-Control', 'private, no-store')
    .set('X-Replays-Left', String(Math.max(0, DEFAULT_REPLAYS - used - 1)))
    .send(file.body);
});

/** Ghi âm câu trả lời (phần H, I, J). Bytes đi thẳng, không qua multipart. */
router.post('/attempts/:id/items/:questionId/recording',
  A.requireUser, A.csrfGuard, answerAudioBody, async (req, res) => {
    const att = ownAttempt(req);
    if (!att) return res.status(404).json({ error: 'Không tìm thấy lượt thi.' });
    if (att.status !== 'in_progress') return bad(res, 'Lượt thi này đã nộp.');

    const questionId = int(req.params.questionId, 0);
    const item = itemOf(att.id, questionId);
    if (!item) return res.status(404).json({ error: 'Câu hỏi không thuộc lượt thi này.' });
    if (!partOpen(item)) return res.status(403).json({ error: 'Phần này đã hết giờ.' });

    const body = req.body;
    if (!body || !body.length) return bad(res, 'Không nhận được dữ liệu ghi âm.');

    let stored;
    try {
      stored = await storage.putRecording(body, req.headers['content-type']);
    } catch (e) {
      if (e && e.code === 'INVALID_AUDIO') return bad(res, e.message);
      console.error('[exam] recording save failed', e);
      return res.status(502).json({ error: 'Không lưu được bản ghi âm.' });
    }

    const at = nowISO();
    const prev = q.get('SELECT audio_key FROM attempt_answers WHERE attempt_id=? AND question_id=?',
      att.id, questionId);
    q.run(
      `INSERT INTO attempt_answers (attempt_id,question_id,section_id,audio_key,updated_at)
       VALUES (?,?,?,?,?)
       ON CONFLICT(attempt_id,question_id) DO UPDATE SET audio_key=excluded.audio_key, updated_at=excluded.updated_at`,
      att.id, questionId, item.section_id, stored.key, at);
    /* Thu lại thì bản cũ không còn ai trỏ tới — xoá để không tích rác trong kho. */
    if (prev && prev.audio_key) await storage.remove(prev.audio_key).catch(() => {});

    res.status(201).json({ ok: true, bytes: body.length, savedAt: at });
  });

/* ------------------------------------------------------------------ *
 * Submit
 * ------------------------------------------------------------------ */

/**
 * Hand the paper in.
 *
 * Marking does not happen here. The sitting closes, every part closes with it,
 * and the answers sit waiting for the scoring pass — which means a fix to the
 * marker can be re-run over old sittings without asking anyone to sit again.
 */
router.post('/attempts/:id/submit', A.requireUser, A.csrfGuard, (req, res) => {
  const att = ownAttempt(req);
  if (!att) return res.status(404).json({ error: 'Không tìm thấy lượt thi.' });
  if (att.status === 'submitted') {
    return res.json({ ok: true, alreadySubmitted: true, submittedAt: att.submitted_at });
  }

  const at = nowISO();
  tx(() => {
    q.run('UPDATE attempt_parts SET closed_at=? WHERE attempt_id=? AND closed_at IS NULL', at, att.id);
    q.run("UPDATE attempts SET status='submitted', submitted_at=?, updated_at=? WHERE id=?", at, at, att.id);
  });
  /* Chấm ngay phần máy chấm được (trắc nghiệm, điền từ). Viết và Nói để lại
     trạng thái chờ — chấm chúng thành 0 điểm là một lời nói dối trông giống
     kết quả. Chấm chạy lại được nên sửa bộ chấm không cần thi lại. */
  marking.markAttempt(att.id);

  const answered = q.val(
    "SELECT COUNT(*) c FROM attempt_answers WHERE attempt_id=? AND (answer <> '' OR audio_key IS NOT NULL)", att.id);
  const total = q.val(
    `SELECT COUNT(*) c FROM section_items si
       JOIN attempt_parts ap ON ap.section_id = si.section_id
      WHERE ap.attempt_id=?`, att.id);

  res.json({ ok: true, submittedAt: at, answered, total });
});

/**
 * Kết quả một lượt thi.
 *
 * Mức chi tiết theo gói đã mua, và quyết định đó nằm ở máy chủ: gói Starter mua
 * "report bình thường thang điểm" nên nhận điểm và bậc; từ Plus trở lên mới có
 * bảng bóc tách từng phần và từng câu. Ẩn ở giao diện thì ai xem mã nguồn cũng
 * gỡ được, nên phần dữ liệu ấy không được rời khỏi đây.
 */
router.get('/attempts/:id/result', A.requireUser, (req, res) => {
  const att = ownAttempt(req);
  if (!att) return res.status(404).json({ error: 'Không tìm thấy lượt thi.' });
  if (att.status !== 'submitted') {
    return res.status(409).json({ error: 'Lượt thi này chưa nộp nên chưa có kết quả.' });
  }
  const ent = entitlementOf(req.user.id);
  const detailed = !!(ent && ent.features && ent.features.detailedReport);
  const out = marking.resultOf(att.id, detailed);
  if (!out) return res.status(404).json({ error: 'Không tìm thấy lượt thi.' });
  /* Nói thẳng vì sao báo cáo ngắn, thay vì để người dùng tưởng hệ thống hỏng. */
  if (!detailed) out.upgradeHint = 'Bảng phân tích từng phần có ở gói Plus trở lên.';
  res.set('Cache-Control', 'no-store').json(out);
});

/** Lịch sử các lượt đã làm — màn tiến độ đọc cái này. */
router.get('/attempts', A.requireUser, (req, res) => {
  const rows = q.all(
    `SELECT a.*, t.title FROM attempts a LEFT JOIN tests t ON t.id = a.test_id
      WHERE a.user_id=? ORDER BY a.id DESC LIMIT 50`, req.user.id);
  res.set('Cache-Control', 'no-store').json({
    items: rows.map(r => ({
      id: r.id, testId: r.test_id, testTitle: r.title || r.test_id, status: r.status,
      startedAt: r.started_at, submittedAt: r.submitted_at
    }))
  });
});

module.exports = router;
