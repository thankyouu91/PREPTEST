/**
 * API quản trị — tất cả nằm dưới /api/admin (trừ /api/catalog công khai).
 *
 * Nguyên tắc:
 * - Mọi route thay đổi dữ liệu: requireAdmin + csrfGuard + ghi audit.
 * - Mọi truy vấn dùng tham số ràng buộc, không nối chuỗi giá trị người dùng.
 * - Trả lỗi dạng { error } kèm HTTP status hợp lý.
 */
'use strict';
const express = require('express');
const { q, tx, nowISO, jparse, makeCode, audit } = require('./db');
const A = require('./auth');
const EXAM_FORMATS = require('./data/exam-formats');
const storage = require('./storage');
const PLANS = require('./data/plans');
const LINKING = require('./data/linking-words');

const router = express.Router();
router.use(express.json({ limit: '1mb' }));

/* ============================ Trợ giúp ============================ */
const SKILLS = ['listening', 'reading', 'writing', 'speaking'];
const LEVELS = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2'];
const QTYPES = ['mcq', 'gap', 'essay', 'speaking'];
const STATUSES = ['draft', 'published', 'archived'];

const bad = (res, msg) => res.status(400).json({ error: msg });
const str = (v, max) => (typeof v === 'string' ? v.trim().slice(0, max || 400) : '');
const int = (v, dflt) => (Number.isFinite(+v) ? Math.trunc(+v) : dflt);
const clamp = (n, lo, hi) => Math.min(hi, Math.max(lo, n));
const slug = s => str(s, 60).toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')
  .replace(/đ/g, 'd').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
const daysAgoISO = n => new Date(Date.now() - n * 86400000).toISOString();

function familyExists(id) { return !!q.val('SELECT 1 FROM families WHERE id=?', id); }

/** Mô tả quyền mở khoá của một code thành chữ */
function unlockLabel(type, ref) {
  if (type === 'test') {
    const t = q.get('SELECT title FROM tests WHERE id=?', ref);
    return t ? t.title : 'Bài ' + ref;
  }
  if (type === 'family') {
    const f = q.get('SELECT name FROM families WHERE id=?', ref);
    return 'Trọn bộ ' + (f ? f.name : ref);
  }
  const names = String(ref).split(',').map(id => {
    const f = q.get('SELECT name FROM families WHERE id=?', id);
    return f ? f.name : id;
  });
  return 'Combo ' + names.join(' + ');
}

/* ======================= Đăng nhập quản trị ======================= */
router.post('/admin/login', (req, res) => {
  const username = str(req.body && req.body.username, 60);
  const password = typeof (req.body && req.body.password) === 'string' ? req.body.password : '';
  if (!username || !password) return bad(res, 'Nhập tên đăng nhập và mật khẩu.');

  const key = A.throttleKey(req, username);
  const lockedFor = A.isLocked(key);
  if (lockedFor) {
    return res.status(429).json({
      error: 'Sai quá nhiều lần. Thử lại sau ' + Math.ceil(lockedFor / 60) + ' phút.'
    });
  }

  const admin = q.get('SELECT * FROM admins WHERE username=? AND active=1', username);
  // Vẫn băm một lần khi không tìm thấy tài khoản để thời gian phản hồi không lộ thông tin
  const ok = admin ? A.verifyPassword(password, admin.pass_hash)
                   : A.verifyPassword(password, A.hashPassword('không-tồn-tại'));
  if (!admin || !ok) {
    A.noteFailure(key);
    audit({ ip: req.ip }, 'admin.login.failed', 'admins/' + username, {});
    return res.status(401).json({ error: 'Tên đăng nhập hoặc mật khẩu không đúng.' });
  }

  A.clearFailures(key);
  A.createSession(admin.id, req, res);
  q.run('UPDATE admins SET last_login_at=? WHERE id=?', nowISO(), admin.id);
  audit({ admin, ip: req.ip }, 'admin.login', 'admins/' + admin.username, {});
  res.json({ ok: true, admin: { username: admin.username, name: admin.name, role: admin.role } });
});

router.post('/admin/logout', A.csrfGuard, (req, res) => {
  const admin = A.currentAdmin(req);
  if (admin) audit({ admin, ip: req.ip }, 'admin.logout', 'admins/' + admin.username, {});
  A.destroySession(req, res);
  res.json({ ok: true });
});

router.get('/admin/me', (req, res) => {
  const admin = A.currentAdmin(req);
  if (!admin) return res.status(401).json({ error: 'Chưa đăng nhập.' });
  res.json({ admin });
});

/* Từ đây trở xuống đều cần đăng nhập + CSRF */
router.use('/admin', A.requireAdmin, A.csrfGuard);

/* ============================ BÁO CÁO ============================
   Dashboard quản lý tổng. Ngoài số liệu thô còn trả về ba thứ mà người quản lý
   thật sự cần để ra quyết định:
   - kpi:    số của kỳ này ĐẶT CẠNH kỳ trước cùng độ dài, kèm % thay đổi. Một
             con số đứng một mình không nói lên điều gì.
   - funnel: đăng ký → xác thực → kích hoạt code → còn hoạt động, để thấy rơi
             rụng ở khâu nào.
   - todo:   danh sách việc cần làm, xếp theo mức khẩn. Đây là phần biến trang
             báo cáo thành trang điều hành.                                    */
router.get('/admin/reports', (req, res) => {
  // Cửa sổ thời gian: chỉ nhận 7, 30, 90 để không ai gõ ?days=100000 làm nặng DB
  const days = [7, 30, 90].includes(int(req.query.days, 30)) ? int(req.query.days, 30) : 30;
  const from = daysAgoISO(days);
  const prevFrom = daysAgoISO(days * 2);
  const hnay = nowISO().slice(0, 10);
  const sau7ngay = new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 10);

  /* Một chỉ số = giá trị kỳ này + kỳ trước + phần trăm thay đổi.
     delta = null khi kỳ trước bằng 0, vì "tăng vô hạn" không phải thông tin. */
  const kpiOf = (sql, ...args) => {
    const value = q.val(sql, from, nowISO(), ...args) || 0;
    const prev = q.val(sql, prevFrom, from, ...args) || 0;
    return { value, prev, delta: prev ? Math.round(((value - prev) / prev) * 100) : null };
  };

  const kpi = {
    users: kpiOf('SELECT COUNT(*) c FROM users WHERE created_at >= ? AND created_at < ?'),
    redeems: kpiOf('SELECT COUNT(*) c FROM codes WHERE redeemed_at >= ? AND redeemed_at < ?'),
    revenue: kpiOf("SELECT COALESCE(SUM(amount),0) s FROM orders WHERE status='paid' AND created_at >= ? AND created_at < ?"),
    orders: kpiOf("SELECT COUNT(*) c FROM orders WHERE status='paid' AND created_at >= ? AND created_at < ?")
  };

  /* Phễu học viên — trạng thái tích luỹ, không giới hạn theo kỳ. Tỷ lệ tính
     trên bước đầu tiên để thấy tổng hao hụt, không phải trên bước liền trước.

     Mỗi bước phải là TẬP CON của bước trước, nếu không thì cái cột lại phình ra
     và hình phễu mất nghĩa. Vì thế bước cuối là "đã kích hoạt code VÀ còn đăng
     nhập gần đây" chứ không phải mọi người còn đăng nhập — người chưa có code
     vẫn đăng nhập được nên con số đó không nằm dưới bước ba. */
  const fTong = q.val('SELECT COUNT(*) c FROM users');
  const fXacThuc = q.val('SELECT COUNT(*) c FROM users WHERE verified=1');
  const fKichHoat = q.val(
    "SELECT COUNT(DISTINCT c.user_id) c FROM codes c JOIN users u ON u.id = c.user_id" +
    " WHERE c.status='redeemed' AND u.verified=1");
  const fHoatDong = q.val(
    "SELECT COUNT(DISTINCT c.user_id) c FROM codes c JOIN users u ON u.id = c.user_id" +
    " WHERE c.status='redeemed' AND u.verified=1 AND u.last_login_at >= ?", daysAgoISO(30));
  const funnel = [
    { key: 'registered', label: 'Đã đăng ký', value: fTong },
    { key: 'verified', label: 'Đã xác thực email', value: fXacThuc },
    { key: 'redeemed', label: 'Đã kích hoạt code', value: fKichHoat },
    { key: 'active', label: 'Còn học trong 30 ngày', value: fHoatDong }
  ].map(s => ({ ...s, rate: fTong ? Math.round((s.value / fTong) * 100) : 0 }));

  const d7 = daysAgoISO(7), d30 = daysAgoISO(30);

  const users = {
    total: q.val('SELECT COUNT(*) c FROM users'),
    new7: q.val('SELECT COUNT(*) c FROM users WHERE created_at >= ?', d7),
    new30: q.val('SELECT COUNT(*) c FROM users WHERE created_at >= ?', d30),
    verified: q.val('SELECT COUNT(*) c FROM users WHERE verified=1'),
    locked: q.val("SELECT COUNT(*) c FROM users WHERE status='locked'")
  };
  const codes = {
    total: q.val('SELECT COUNT(*) c FROM codes'),
    unused: q.val("SELECT COUNT(*) c FROM codes WHERE status='unused'"),
    redeemed: q.val("SELECT COUNT(*) c FROM codes WHERE status='redeemed'"),
    revoked: q.val("SELECT COUNT(*) c FROM codes WHERE status='revoked'"),
    expired: q.val("SELECT COUNT(*) c FROM codes WHERE status='unused' AND expires_at IS NOT NULL AND expires_at < ?", nowISO().slice(0, 10)),
    redeemed7: q.val("SELECT COUNT(*) c FROM codes WHERE redeemed_at >= ?", d7)
  };
  const content = {
    tests: q.val('SELECT COUNT(*) c FROM tests'),
    published: q.val("SELECT COUNT(*) c FROM tests WHERE status='published'"),
    draft: q.val("SELECT COUNT(*) c FROM tests WHERE status='draft'"),
    questions: q.val("SELECT COUNT(*) c FROM questions WHERE status='active'"),
    families: q.val('SELECT COUNT(*) c FROM families')
  };
  const revenue = {
    total: q.val("SELECT COALESCE(SUM(amount),0) s FROM orders WHERE status='paid'"),
    d30: q.val("SELECT COALESCE(SUM(amount),0) s FROM orders WHERE status='paid' AND created_at >= ?", d30),
    orders30: q.val("SELECT COUNT(*) c FROM orders WHERE created_at >= ?", d30)
  };

  // Chuỗi theo ngày trong cửa sổ đang chọn: user mới, code kích hoạt, doanh thu
  const series = [];
  for (let i = days - 1; i >= 0; i--) {
    const day = new Date(Date.now() - i * 86400000).toISOString().slice(0, 10);
    series.push({
      day,
      users: q.val('SELECT COUNT(*) c FROM users WHERE substr(created_at,1,10)=?', day),
      redeems: q.val('SELECT COUNT(*) c FROM codes WHERE substr(redeemed_at,1,10)=?', day),
      revenue: q.val("SELECT COALESCE(SUM(amount),0) s FROM orders WHERE status='paid' AND substr(created_at,1,10)=?", day)
    });
  }

  const byFamily = q.all(`
    SELECT f.id, f.name, f.status,
           (SELECT COUNT(*) FROM tests t WHERE t.family_id=f.id) tests,
           (SELECT COUNT(*) FROM tests t WHERE t.family_id=f.id AND t.status='published') published,
           (SELECT COUNT(*) FROM questions qq WHERE qq.family_id=f.id AND qq.status='active') questions,
           (SELECT COUNT(*) FROM codes c WHERE c.unlock_type='family' AND c.unlock_ref=f.id AND c.status='redeemed') unlocks,
           (SELECT COUNT(*) FROM users u WHERE u.interests_json LIKE '%"' || f.id || '"%') interested
      FROM families f ORDER BY f.sort`);

  const bankGaps = q.all(`
    SELECT f.name family, s.skill, s.level, s.need, COALESCE(b.have,0) have
      FROM (SELECT DISTINCT t.family_id fid, se.skill skill, t.level level,
                   CASE se.skill WHEN 'writing' THEN 2 WHEN 'speaking' THEN 3 ELSE 20 END need
              FROM sections se JOIN tests t ON t.id = se.test_id) s
      JOIN families f ON f.id = s.fid
      LEFT JOIN (SELECT family_id, skill, level, COUNT(*) have FROM questions
                  WHERE status='active' GROUP BY family_id, skill, level) b
        ON b.family_id = s.fid AND b.skill = s.skill AND b.level = s.level
     WHERE COALESCE(b.have,0) < s.need
     ORDER BY (s.need - COALESCE(b.have,0)) DESC LIMIT 8`);

  const recent = q.all(
    'SELECT admin_name, action, target, at FROM audit ORDER BY id DESC LIMIT 8');

  /* Doanh thu theo gói bán trong kỳ. Gộp theo package_id; đơn không gắn gói
     (cấp tay) thì gộp theo tên đơn để vẫn nhìn thấy được. */
  const revenueByPackage = q.all(`
    SELECT COALESCE(p.name, o.name) name,
           COUNT(*) orders,
           COALESCE(SUM(o.amount),0) amount
      FROM orders o LEFT JOIN packages p ON p.id = o.package_id
     WHERE o.status='paid' AND o.created_at >= ?
     GROUP BY COALESCE(o.package_id, o.name)
     ORDER BY amount DESC LIMIT 8`, from);

  /* ---- Việc cần làm ----
     Xếp theo mức khẩn: cao là chuyện đang mất tiền hoặc mất học viên ngay,
     vừa là chuyện sẽ thành vấn đề nếu để lâu, thấp là dọn dẹp. Mỗi mục kèm
     đường dẫn tới đúng màn xử lý để không phải tự đi tìm. */
  const todo = [];

  /* Only families that are actually open for business. A parked one having no
     published test is the intended state, not a problem to chase. */
  const thieuDe = byFamily.filter(f => f.status !== 'coming_soon' && f.interested > 0 && f.published === 0);
  if (thieuDe.length) {
    todo.push({
      sev: 'cao',
      title: 'Có người quan tâm nhưng chưa có đề để bán',
      detail: thieuDe.map(f => f.name + ' (' + f.interested + ' quan tâm)').join(' · '),
      href: '/admin/format/', cta: 'Sinh đề', count: thieuDe.length
    });
  }

  const hetHan = q.val(
    "SELECT COUNT(*) c FROM codes WHERE status='unused' AND expires_at IS NOT NULL AND expires_at >= ? AND expires_at <= ?",
    hnay, sau7ngay);
  if (hetHan) {
    todo.push({
      sev: 'cao',
      title: 'Code sắp hết hạn trong 7 ngày',
      detail: hetHan + ' code chưa ai dùng sẽ hết hạn, nên gia hạn hoặc cấp lại.',
      href: '/admin/code/', cta: 'Xem code', count: hetHan
    });
  }

  if (content.draft) {
    todo.push({
      sev: 'vua',
      title: 'Đề nháp chưa phát hành',
      detail: content.draft + ' đề đã dựng nhưng học viên chưa thấy được.',
      href: '/admin/de-thi/', cta: 'Xem đề', count: content.draft
    });
  }

  if (bankGaps.length) {
    const thieuTong = bankGaps.reduce((a, g) => a + (g.need - g.have), 0);
    todo.push({
      sev: 'vua',
      title: 'Ngân hàng câu hỏi chưa đủ',
      detail: bankGaps.length + ' chỗ còn thiếu, tổng ' + thieuTong + ' câu.',
      href: '/admin/ngan-hang/', cta: 'Bổ sung', count: bankGaps.length
    });
  }

  const treoXacThuc = q.val(
    'SELECT COUNT(*) c FROM users WHERE verified=0 AND created_at < ?', d7);
  if (treoXacThuc) {
    todo.push({
      sev: 'thap',
      title: 'Học viên đăng ký nhưng chưa xác thực email',
      detail: treoXacThuc + ' tài khoản quá 7 ngày vẫn chưa xác thực.',
      href: '/admin/hoc-vien/', cta: 'Xem học viên', count: treoXacThuc
    });
  }

  if (users.locked) {
    todo.push({
      sev: 'thap',
      title: 'Tài khoản đang bị khoá',
      detail: users.locked + ' tài khoản không đăng nhập được.',
      href: '/admin/hoc-vien/', cta: 'Xem học viên', count: users.locked
    });
  }

  res.json({
    period: { days, from, prevFrom },
    kpi, funnel, todo, revenueByPackage,
    users, codes, content, revenue, series, byFamily, bankGaps, recent
  });
});

/* ====================== NGÂN HÀNG CÂU HỎI ====================== */
router.get('/admin/questions', (req, res) => {
  const where = ["status != 'deleted'"];
  const args = [];
  const add = (cond, v) => { where.push(cond); args.push(v); };

  if (req.query.family) add('family_id = ?', str(req.query.family, 20));
  if (req.query.skill) add('skill = ?', str(req.query.skill, 20));
  if (req.query.level) add('level = ?', str(req.query.level, 5));
  if (req.query.type) add('type = ?', str(req.query.type, 20));
  if (req.query.status) add('status = ?', str(req.query.status, 20));
  if (req.query.q) add('prompt LIKE ?', '%' + str(req.query.q, 80) + '%');
  /* part=none finds the items that still have no letter — the pile an admin has
     to work through before a VPET test can be generated at all. */
  if (req.query.part === 'none') where.push('part IS NULL');
  else if (req.query.part) add('part = ?', str(req.query.part, 2).toUpperCase());

  const limit = clamp(int(req.query.limit, 30), 1, 200);
  const offset = clamp(int(req.query.offset, 0), 0, 1e6);
  const sql = 'FROM questions WHERE ' + where.join(' AND ');
  const total = q.val('SELECT COUNT(*) c ' + sql, ...args);
  const rows = q.all(
    `SELECT id, family_id, skill, level, type, part, prompt, options_json, answer, explanation, tags_json, status, created_at,
            audio_key, audio_bytes, audio_at
       ${sql} ORDER BY id DESC LIMIT ? OFFSET ?`, ...args, limit, offset);

  res.json({
    total, limit, offset,
    items: rows.map(r => ({
      id: r.id, familyId: r.family_id, skill: r.skill, level: r.level, type: r.type,
      part: r.part || null,
      prompt: r.prompt, options: jparse(r.options_json, []), answer: r.answer,
      explanation: r.explanation, tags: jparse(r.tags_json, []), status: r.status, createdAt: r.created_at,
      /* The key itself never leaves the server - the browser only needs to know
         whether a file is attached, and how big it is. */
      hasAudio: !!r.audio_key, audioBytes: r.audio_bytes || 0, audioAt: r.audio_at || null
    }))
  });
});

function readQuestion(body) {
  const familyId = str(body.familyId, 20);
  const skill = str(body.skill, 20);
  const level = str(body.level, 5).toUpperCase();
  const type = str(body.type, 20);
  const prompt = str(body.prompt, 4000);
  if (!familyExists(familyId)) return { err: 'Kỳ thi không hợp lệ.' };
  if (!SKILLS.includes(skill)) return { err: 'Kỹ năng không hợp lệ.' };
  if (!LEVELS.includes(level)) return { err: 'Độ khó không hợp lệ.' };
  if (!QTYPES.includes(type)) return { err: 'Dạng câu không hợp lệ.' };
  if (prompt.length < 5) return { err: 'Nội dung câu hỏi quá ngắn.' };

  const options = Array.isArray(body.options) ? body.options.map(o => str(o, 500)).filter(Boolean) : [];
  const answer = str(body.answer, 500);
  if (type === 'mcq') {
    if (options.length < 2) return { err: 'Câu trắc nghiệm cần ít nhất 2 phương án.' };
    if (!options.includes(answer)) return { err: 'Đáp án phải là một trong các phương án đã nhập.' };
  }
  const tags = Array.isArray(body.tags) ? body.tags.map(t => str(t, 30)).filter(Boolean).slice(0, 10) : [];

  /* The lettered part, for families whose format has a part table. Validated
     against the blueprint rather than a hardcoded A-J, and cross-checked
     against the skill the part actually tests: a speaking item filed under
     Part C would sit in the pool for a reading part and never be spotted until
     a candidate met it mid-exam. */
  const partsAllowed = EXAM_FORMATS.partsOf(familyId);
  const part = str(body.part, 2).toUpperCase();
  if (part) {
    if (!partsAllowed.length) {
      return { err: 'Kỳ thi này chưa có bảng phần thi để gắn nhãn.' };
    }
    if (!partsAllowed.includes(part)) {
      return { err: 'Phần không hợp lệ. Kỳ thi này có các phần: ' + partsAllowed.join(', ') + '.' };
    }
    const sec = EXAM_FORMATS.sectionOfPart(familyId, part);
    if (sec && sec.skill !== skill) {
      return { err: 'Phần ' + part + ' thuộc kỹ năng ' + sec.skill + ', không phải ' + skill + '.' };
    }
    if (sec && Array.isArray(sec.types) && sec.types.length && !sec.types.includes(type)) {
      return { err: 'Phần ' + part + ' chỉ nhận dạng câu: ' + sec.types.join(', ') + '.' };
    }
  }

  return {
    familyId, skill, level, type, prompt, options, answer,
    part: part || null,
    explanation: str(body.explanation, 2000), tags
  };
}

router.post('/admin/questions', (req, res) => {
  const d = readQuestion(req.body || {});
  if (d.err) return bad(res, d.err);
  const r = q.run(
    `INSERT INTO questions (family_id,skill,level,type,part,prompt,options_json,answer,explanation,tags_json,status,created_at,created_by)
     VALUES (?,?,?,?,?,?,?,?,?,?,'active',?,?)`,
    d.familyId, d.skill, d.level, d.type, d.part, d.prompt, JSON.stringify(d.options), d.answer,
    d.explanation, JSON.stringify(d.tags), nowISO(), req.admin.id);
  audit(req, 'question.create', 'questions/' + r.lastInsertRowid, { family: d.familyId, skill: d.skill, part: d.part });
  res.status(201).json({ id: Number(r.lastInsertRowid) });
});

router.put('/admin/questions/:id', (req, res) => {
  const id = int(req.params.id, 0);
  if (!q.val('SELECT 1 FROM questions WHERE id=?', id)) return res.status(404).json({ error: 'Không tìm thấy câu hỏi.' });
  const d = readQuestion(req.body || {});
  if (d.err) return bad(res, d.err);
  q.run(`UPDATE questions SET family_id=?, skill=?, level=?, type=?, part=?, prompt=?, options_json=?, answer=?, explanation=?, tags_json=?
          WHERE id=?`,
    d.familyId, d.skill, d.level, d.type, d.part, d.prompt, JSON.stringify(d.options), d.answer,
    d.explanation, JSON.stringify(d.tags), id);
  audit(req, 'question.update', 'questions/' + id, {});
  res.json({ ok: true });
});

/** Ngưng dùng / dùng lại câu hỏi (không xoá cứng để đề cũ không mất nội dung) */
router.post('/admin/questions/:id/status', (req, res) => {
  const id = int(req.params.id, 0);
  const status = str(req.body && req.body.status, 20);
  if (!['active', 'retired'].includes(status)) return bad(res, 'Trạng thái không hợp lệ.');
  const r = q.run('UPDATE questions SET status=? WHERE id=?', status, id);
  if (!r.changes) return res.status(404).json({ error: 'Không tìm thấy câu hỏi.' });
  audit(req, 'question.status', 'questions/' + id, { status });
  res.json({ ok: true });
});

/* ==================== Question audio (VPET parts E, F, G, H, J) ====================
   The body arrives as raw bytes rather than multipart: the browser can send a
   File straight through fetch, which means no multipart parser and therefore
   no new dependency. express.json above ignores audio content types, so the
   raw parser here is the first thing to touch the body.

   Both routes sit under the router-wide requireAdmin + csrfGuard. */
const audioBody = express.raw({ type: storage.ACCEPTED_MIME, limit: storage.MAX_BYTES });

router.post('/admin/questions/:id/audio', audioBody, async (req, res) => {
  const id = int(req.params.id, 0);
  const row = q.get('SELECT id, audio_key FROM questions WHERE id=?', id);
  if (!row) return res.status(404).json({ error: 'Không tìm thấy câu hỏi.' });

  const buf = Buffer.isBuffer(req.body) ? req.body : null;
  const why = storage.validate(buf, req.get('content-type'));
  if (why) return bad(res, why);

  try {
    const saved = await storage.put(buf, req.get('content-type'));
    /* Replacing an existing file: write the new key first, then drop the old
       one. If the delete fails the row still points at a file that exists. */
    const old = row.audio_key;
    q.run('UPDATE questions SET audio_key=?, audio_bytes=?, audio_at=? WHERE id=?',
      saved.key, saved.bytes, nowISO(), id);
    if (old && old !== saved.key) await storage.remove(old).catch(() => {});
    audit(req, 'question.audio.upload', 'questions/' + id, { bytes: saved.bytes, driver: saved.driver });
    res.status(201).json({ ok: true, bytes: saved.bytes, driver: saved.driver });
  } catch (e) {
    if (e.code === 'INVALID_AUDIO') return bad(res, e.message);
    console.error('[audio] upload failed', e);
    res.status(502).json({ error: 'Không lưu được tệp âm thanh. Kiểm tra cấu hình lưu trữ.' });
  }
});

router.get('/admin/questions/:id/audio', async (req, res) => {
  const row = q.get('SELECT audio_key, audio_bytes FROM questions WHERE id=?', int(req.params.id, 0));
  if (!row || !row.audio_key) return res.status(404).json({ error: 'Câu hỏi chưa có tệp âm thanh.' });
  try {
    const file = await storage.get(row.audio_key);
    res.set('Content-Type', 'audio/mpeg')
      .set('Content-Length', String(file.body.length))
      /* Exam audio must not sit in a shared cache: it is answer material. */
      .set('Cache-Control', 'private, no-store')
      .send(file.body);
  } catch (e) {
    console.error('[audio] read failed', e);
    res.status(502).json({ error: 'Không đọc được tệp âm thanh.' });
  }
});

router.delete('/admin/questions/:id/audio', async (req, res) => {
  const id = int(req.params.id, 0);
  const row = q.get('SELECT audio_key FROM questions WHERE id=?', id);
  if (!row) return res.status(404).json({ error: 'Không tìm thấy câu hỏi.' });
  if (!row.audio_key) return res.json({ ok: true });
  q.run('UPDATE questions SET audio_key=NULL, audio_bytes=NULL, audio_at=NULL WHERE id=?', id);
  await storage.remove(row.audio_key).catch(() => {});
  audit(req, 'question.audio.delete', 'questions/' + id, {});
  res.json({ ok: true });
});

/** Nhập hàng loạt câu hỏi (dán JSON hoặc CSV đã tách sẵn ở client) */
router.post('/admin/questions/bulk', (req, res) => {
  const items = Array.isArray(req.body && req.body.items) ? req.body.items : null;
  if (!items || !items.length) return bad(res, 'Không có câu hỏi nào để nhập.');
  if (items.length > 500) return bad(res, 'Mỗi lần nhập tối đa 500 câu.');

  const errors = [];
  const ok = [];
  items.forEach((raw, i) => {
    const d = readQuestion(raw || {});
    if (d.err) errors.push({ row: i + 1, error: d.err }); else ok.push(d);
  });
  if (!ok.length) return res.status(400).json({ error: 'Không dòng nào hợp lệ.', errors });

  tx(() => {
    const ins = require('./db').db.prepare(
      `INSERT INTO questions (family_id,skill,level,type,part,prompt,options_json,answer,explanation,tags_json,status,created_at,created_by)
       VALUES (?,?,?,?,?,?,?,?,?,?,'active',?,?)`);
    const at = nowISO();
    for (const d of ok) {
      ins.run(d.familyId, d.skill, d.level, d.type, d.part, d.prompt, JSON.stringify(d.options),
        d.answer, d.explanation, JSON.stringify(d.tags), at, req.admin.id);
    }
  });
  audit(req, 'question.bulk', 'questions', { inserted: ok.length, failed: errors.length });
  res.status(201).json({ inserted: ok.length, failed: errors.length, errors: errors.slice(0, 20) });
});

/** Tệp CSV mẫu để nhập câu hỏi hàng loạt.
 *  Phục vụ từ server (không dựng blob ở client) để CSP giữ nguyên mức nghiêm ngặt. */
router.get('/admin/questions/template.csv', (req, res) => {
  const fam = q.get('SELECT id FROM families ORDER BY sort LIMIT 1');
  const famId = fam ? fam.id : 'ielts';
  /* Cột phan_thi để trống với kỳ thi không có bảng phần; với VPET thì bắt buộc,
     vì câu không có chữ cái sẽ không nằm trong pool của phần nào cả. */
  const rows = [
    'ky_thi,ky_nang,do_kho,dang_cau,phan_thi,noi_dung,phuong_an_1,phuong_an_2,phuong_an_3,phuong_an_4,dap_an,giai_thich',
    `${famId},reading,B1,mcq,,"Chọn từ đồng nghĩa với ""rapid"".",quick,slow,heavy,quiet,quick,"Rapid nghĩa là nhanh."`,
    `${famId},listening,B2,gap,,"Nghe và điền số còn thiếu: The train leaves at ____.",,,,,,`,
    'vpet,reading,B1,mcq,C,"Đọc đoạn văn rồi chọn ý đúng.",A,B,C,D,A,"Câu VPET phải ghi rõ phần: C là Reading Comprehension."',
    'vpet,writing,B1,gap,A,"Điền một từ còn thiếu: She has lived here ____ 2019.",,,,,since,"Phần A là Sentence Completion."'
  ];
  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', 'attachment; filename="mau-cau-hoi.csv"');
  res.send('﻿' + rows.join('\r\n'));   // BOM để Excel mở đúng tiếng Việt
});

/** Đếm số câu khả dụng theo tiêu chí — trình sinh đề tự động dùng để báo thiếu */
router.get('/admin/questions/availability', (req, res) => {
  const family = str(req.query.family, 20);
  const level = str(req.query.level, 5).toUpperCase();
  if (!familyExists(family)) return bad(res, 'Kỳ thi không hợp lệ.');
  const rows = q.all(
    `SELECT skill, COUNT(*) exact FROM questions
      WHERE family_id=? AND level=? AND status='active' GROUP BY skill`, family, level);
  const any = q.all(
    `SELECT skill, COUNT(*) total FROM questions
      WHERE family_id=? AND status='active' GROUP BY skill`, family);
  const out = {};
  for (const s of SKILLS) {
    out[s] = {
      exact: (rows.find(r => r.skill === s) || {}).exact || 0,
      total: (any.find(r => r.skill === s) || {}).total || 0
    };
  }
  /* Với kỳ thi có bảng phần thi, tổng theo kỹ năng không nói lên điều gì: 20
     câu Nói có thể toàn của phần H mà phần I và J trắng. Trả về từng phần một,
     kèm số câu format cần, để màn hình chỉ đúng chỗ đang thiếu. */
  const parts = EXAM_FORMATS.partsOf(family).map(letter => {
    const sec = EXAM_FORMATS.sectionOfPart(family, letter) || {};
    const bank = bankCount(family, sec.skill, sec.types, level, letter);
    return {
      part: letter, name: sec.name || letter, skill: sec.skill || '',
      need: sec.items || 0, needsAudio: !!sec.needsAudio,
      exact: bank.exact, total: bank.total,
      short: Math.max(0, (sec.items || 0) - bank.total)
    };
  });
  /* Câu chưa gắn phần: không thuộc pool nào, nên phải đếm riêng chứ không im
     lặng biến mất khỏi báo cáo. */
  const untagged = EXAM_FORMATS.partsOf(family).length
    ? q.val("SELECT COUNT(*) c FROM questions WHERE family_id=? AND status='active' AND part IS NULL", family)
    : 0;
  res.json({ family, level, availability: out, parts, untagged });
});

/* ======================= FORMAT ĐỀ CHUẨN =======================
   Bộ format đề của từng kỳ thi + phân tích ngân hàng câu hỏi có đủ để
   sinh đề theo format đó chưa. Admin chọn format thay vì gõ tay blueprint. */

/* One pool definition, used by the counters and by the generator, so what the
   readiness report promises is exactly what the generator can draw from. A
   section that names a lettered part draws only from items carrying that
   letter: skill and type cannot separate parts B and D (both writing essays),
   F and G (both listening multiple choice) or H and J (both spoken answers to
   audio), so without the letter those parts share one pool and an exam gets
   built that looks right and asks the wrong things. */
function poolWhere(familyId, skill, types, part) {
  const t = Array.isArray(types) && types.length ? types.filter(x => QTYPES.includes(x)) : QTYPES;
  const holes = t.map(() => '?').join(',');
  let sql = `family_id=? AND skill=? AND type IN (${holes}) AND status='active'`;
  const args = [familyId, skill, ...t];
  if (part) { sql += ' AND part=?'; args.push(part); }
  return { sql, args };
}

/** Đếm câu dùng được cho một khối: đúng kỳ thi, kỹ năng, dạng câu, phần thi */
function bankCount(familyId, skill, types, level, part) {
  const { sql, args } = poolWhere(familyId, skill, types, part);
  const base = 'SELECT COUNT(*) c FROM questions WHERE ' + sql;
  return {
    total: q.val(base, ...args),
    exact: level ? q.val(base + ' AND level=?', ...args, level) : 0
  };
}

/** Same pool as bankCount, but only the items that already have an MP3.
    A VPET audio part cannot be generated from items that have no sound. */
function audioReadyCount(familyId, skill, types, level, part) {
  const { sql, args } = poolWhere(familyId, skill, types, part);
  const base = 'SELECT COUNT(*) c FROM questions WHERE ' + sql + ' AND audio_key IS NOT NULL';
  return {
    total: q.val(base, ...args),
    exact: level ? q.val(base + ' AND level=?', ...args, level) : 0
  };
}

router.get('/admin/exam-formats', (req, res) => {
  const familyId = str(req.query.familyId, 20);
  const level = LEVELS.includes(str(req.query.level, 5).toUpperCase())
    ? str(req.query.level, 5).toUpperCase() : '';
  const strict = req.query.strict === '1';

  const list = EXAM_FORMATS.FORMATS
    .filter(f => !familyId || f.familyId === familyId)
    .map(f => {
      const fam = q.get('SELECT name, status FROM families WHERE id=?', f.familyId);
      const sections = f.sections.map(s => {
        const bank = bankCount(f.familyId, s.skill, s.types, level, s.part);
        const have = strict ? bank.exact : bank.total;
        /* Audio parts are only buildable from items that carry an MP3, so they
           get their own shortfall alongside the plain bank count. */
        const withAudio = s.needsAudio ? audioReadyCount(f.familyId, s.skill, s.types, level, s.part) : null;
        const haveAudio = withAudio ? (strict ? withAudio.exact : withAudio.total) : 0;
        return {
          name: s.name, part: s.part || null,
          skill: s.skill, type: s.type, items: s.items, minutes: s.minutes,
          types: s.types || [], parts: s.parts || [], needsAudio: !!s.needsAudio,
          bank: { have, exact: bank.exact, total: bank.total, need: s.items, short: Math.max(0, s.items - have) },
          audio: s.needsAudio
            ? { have: haveAudio, need: s.items, short: Math.max(0, s.items - haveAudio) }
            : null
        };
      });
      const short = sections.reduce((a, s) => a + s.bank.short, 0);
      const audioShort = sections.reduce((a, s) => a + (s.audio ? s.audio.short : 0), 0);
      return {
        id: f.id, familyId: f.familyId, familyName: fam ? fam.name : f.familyId,
        familyStatus: fam ? (fam.status || 'ready') : 'ready',
        name: f.name, kind: f.kind, levels: f.levels,
        scoring: f.scoring, guide: f.guide, notes: f.notes,
        totalItems: EXAM_FORMATS.totalItems(f), totalMinutes: EXAM_FORMATS.totalMinutes(f),
        sections,
        /* Ready means the bank can fill every part AND every audio part has
           enough items with sound attached. */
        ready: short === 0 && audioShort === 0,
        shortBy: short,                   // còn thiếu bao nhiêu câu
        audioShortBy: audioShort          // còn thiếu bao nhiêu câu có MP3
      };
    });

  res.set('Cache-Control', 'no-store').json({ level, strict, formats: list });
});

/* ============================ ĐỀ THI ============================ */
function testDetail(id) {
  const t = q.get('SELECT * FROM tests WHERE id=?', id);
  if (!t) return null;
  const sections = q.all('SELECT * FROM sections WHERE test_id=? ORDER BY sort, id', id).map(s => {
    const items = q.all(
      `SELECT si.id item_id, si.sort, qs.id, qs.prompt, qs.type, qs.level, qs.skill, qs.status, qs.part
         FROM section_items si JOIN questions qs ON qs.id = si.question_id
        WHERE si.section_id=? ORDER BY si.sort, si.id`, s.id);
    return {
      id: s.id, name: s.name, part: s.part || null,
      skill: s.skill, type: s.type, minutes: s.minutes, sort: s.sort,
      items: items.map(i => ({
        itemId: i.item_id, questionId: i.id, prompt: i.prompt,
        type: i.type, level: i.level, skill: i.skill, status: i.status, part: i.part || null
      }))
    };
  });
  return {
    id: t.id, familyId: t.family_id, title: t.title, level: t.level,
    durationMin: t.duration_min, scoring: t.scoring, guide: jparse(t.guide_json, []),
    status: t.status, buildMode: t.build_mode, createdAt: t.created_at, updatedAt: t.updated_at,
    sections,
    totalItems: sections.reduce((a, s) => a + s.items.length, 0)
  };
}

router.get('/admin/tests', (req, res) => {
  const where = [];
  const args = [];
  if (req.query.family) { where.push('t.family_id = ?'); args.push(str(req.query.family, 20)); }
  if (req.query.status) { where.push('t.status = ?'); args.push(str(req.query.status, 20)); }
  if (req.query.q) { where.push('t.title LIKE ?'); args.push('%' + str(req.query.q, 80) + '%'); }
  const w = where.length ? 'WHERE ' + where.join(' AND ') : '';
  const rows = q.all(`
    SELECT t.*, f.name family_name,
           (SELECT COUNT(*) FROM sections s WHERE s.test_id=t.id) sections,
           (SELECT COUNT(*) FROM section_items si JOIN sections s ON s.id=si.section_id WHERE s.test_id=t.id) items
      FROM tests t JOIN families f ON f.id=t.family_id
      ${w} ORDER BY t.updated_at DESC`, ...args);
  res.json({
    items: rows.map(r => ({
      id: r.id, familyId: r.family_id, familyName: r.family_name, title: r.title, level: r.level,
      durationMin: r.duration_min, status: r.status, buildMode: r.build_mode,
      sections: r.sections, items: r.items, updatedAt: r.updated_at
    }))
  });
});

router.get('/admin/tests/:id', (req, res) => {
  const t = testDetail(str(req.params.id, 60));
  if (!t) return res.status(404).json({ error: 'Không tìm thấy đề.' });
  res.json(t);
});

/** Tạo đề rỗng (chế độ thủ công) */
router.post('/admin/tests', (req, res) => {
  const b = req.body || {};
  const familyId = str(b.familyId, 20);
  const title = str(b.title, 200);
  const level = str(b.level, 5).toUpperCase();
  if (!familyExists(familyId)) return bad(res, 'Kỳ thi không hợp lệ.');
  if (title.length < 3) return bad(res, 'Tên đề quá ngắn.');
  if (!LEVELS.includes(level)) return bad(res, 'Độ khó không hợp lệ.');

  let id = slug(b.id || (familyId + '-' + level + '-' + title)).slice(0, 50) || (familyId + '-' + Date.now());
  let i = 1;
  while (q.val('SELECT 1 FROM tests WHERE id=?', id)) id = id.replace(/-\d+$/, '') + '-' + (++i);

  const at = nowISO();
  q.run(`INSERT INTO tests (id,family_id,title,level,duration_min,scoring,guide_json,status,build_mode,created_at,updated_at,created_by)
         VALUES (?,?,?,?,?,?,?,'draft',?,?,?,?)`,
    id, familyId, title, level, int(b.durationMin, 0), str(b.scoring, 300),
    JSON.stringify(Array.isArray(b.guide) ? b.guide.map(g => str(g, 300)).filter(Boolean) : []),
    str(b.buildMode, 10) === 'auto' ? 'auto' : 'manual', at, at, req.admin.id);
  audit(req, 'test.create', 'tests/' + id, { title, familyId });
  res.status(201).json(testDetail(id));
});

router.put('/admin/tests/:id', (req, res) => {
  const id = str(req.params.id, 60);
  if (!q.val('SELECT 1 FROM tests WHERE id=?', id)) return res.status(404).json({ error: 'Không tìm thấy đề.' });
  const b = req.body || {};
  const title = str(b.title, 200);
  const level = str(b.level, 5).toUpperCase();
  if (title.length < 3) return bad(res, 'Tên đề quá ngắn.');
  if (!LEVELS.includes(level)) return bad(res, 'Độ khó không hợp lệ.');
  q.run(`UPDATE tests SET title=?, level=?, duration_min=?, scoring=?, guide_json=?, updated_at=? WHERE id=?`,
    title, level, int(b.durationMin, 0), str(b.scoring, 300),
    JSON.stringify(Array.isArray(b.guide) ? b.guide.map(g => str(g, 300)).filter(Boolean) : []),
    nowISO(), id);
  audit(req, 'test.update', 'tests/' + id, {});
  res.json(testDetail(id));
});

/** Đổi trạng thái: chỉ cho phát hành khi mọi phần đều đã có câu hỏi */
router.post('/admin/tests/:id/status', (req, res) => {
  const id = str(req.params.id, 60);
  const status = str(req.body && req.body.status, 20);
  if (!STATUSES.includes(status)) return bad(res, 'Trạng thái không hợp lệ.');
  const t = testDetail(id);
  if (!t) return res.status(404).json({ error: 'Không tìm thấy đề.' });

  if (status === 'published') {
    /* The platform is only selling VPET right now. Letting a parked family's
       test go live would put it in the catalogue and on sale, which is the
       one thing parking it was meant to prevent. */
    const fam = q.get('SELECT name, status FROM families WHERE id=?', t.familyId);
    if (fam && fam.status === 'coming_soon') {
      return bad(res, fam.name + ' đang ở trạng thái chưa sẵn sàng nên không phát hành đề được. '
        + 'Mở kỳ thi này trong server/db.js (FAMILIES) trước đã.');
    }
    if (!t.sections.length) return bad(res, 'Đề chưa có phần nào, không phát hành được.');
    const empty = t.sections.filter(s => !s.items.length).map(s => s.name);
    if (empty.length) return bad(res, 'Các phần sau chưa có câu hỏi: ' + empty.join(', '));
  }
  q.run('UPDATE tests SET status=?, updated_at=? WHERE id=?', status, nowISO(), id);
  audit(req, 'test.status', 'tests/' + id, { status });
  res.json({ ok: true, status });
});

router.delete('/admin/tests/:id', (req, res) => {
  const id = str(req.params.id, 60);
  const used = q.val("SELECT COUNT(*) c FROM codes WHERE unlock_type='test' AND unlock_ref=?", id);
  if (used) return bad(res, 'Đã có ' + used + ' code gắn với đề này. Hãy chuyển đề sang lưu trữ thay vì xoá.');
  const r = q.run('DELETE FROM tests WHERE id=?', id);
  if (!r.changes) return res.status(404).json({ error: 'Không tìm thấy đề.' });
  audit(req, 'test.delete', 'tests/' + id, {});
  res.json({ ok: true });
});

/* ---- Phần thi (sections) ---- */
router.post('/admin/tests/:id/sections', (req, res) => {
  const id = str(req.params.id, 60);
  if (!q.val('SELECT 1 FROM tests WHERE id=?', id)) return res.status(404).json({ error: 'Không tìm thấy đề.' });
  const b = req.body || {};
  const name = str(b.name, 100);
  const skill = str(b.skill, 20);
  if (name.length < 2) return bad(res, 'Tên phần quá ngắn.');
  if (!SKILLS.includes(skill)) return bad(res, 'Kỹ năng không hợp lệ.');
  /* Gắn chữ cái phần thi nếu kỳ thi này có bảng phần — để lần bốc lại sau còn
     biết bốc trong đúng phần nào. */
  const fam = q.val('SELECT family_id FROM tests WHERE id=?', id);
  const allowed = EXAM_FORMATS.partsOf(fam);
  const part = str(b.part, 2).toUpperCase();
  if (part && !allowed.includes(part)) {
    return bad(res, 'Phần không hợp lệ. Kỳ thi này có các phần: ' + (allowed.join(', ') || 'không có') + '.');
  }
  const sort = (q.val('SELECT COALESCE(MAX(sort),-1) s FROM sections WHERE test_id=?', id)) + 1;
  const r = q.run('INSERT INTO sections (test_id,name,skill,type,minutes,sort,part) VALUES (?,?,?,?,?,?,?)',
    id, name, skill, str(b.type, 100) || 'Trắc nghiệm', clamp(int(b.minutes, 0), 0, 600), sort, part || null);
  q.run('UPDATE tests SET updated_at=? WHERE id=?', nowISO(), id);
  audit(req, 'section.create', 'tests/' + id, { section: name, part: part || null });
  res.status(201).json({ id: Number(r.lastInsertRowid) });
});

router.put('/admin/sections/:sid', (req, res) => {
  const sid = int(req.params.sid, 0);
  const s = q.get('SELECT * FROM sections WHERE id=?', sid);
  if (!s) return res.status(404).json({ error: 'Không tìm thấy phần thi.' });
  const b = req.body || {};
  q.run('UPDATE sections SET name=?, type=?, minutes=? WHERE id=?',
    str(b.name, 100) || s.name, str(b.type, 100) || s.type, clamp(int(b.minutes, s.minutes), 0, 600), sid);
  q.run('UPDATE tests SET updated_at=? WHERE id=?', nowISO(), s.test_id);
  audit(req, 'section.update', 'sections/' + sid, {});
  res.json({ ok: true });
});

router.delete('/admin/sections/:sid', (req, res) => {
  const sid = int(req.params.sid, 0);
  const s = q.get('SELECT test_id FROM sections WHERE id=?', sid);
  if (!s) return res.status(404).json({ error: 'Không tìm thấy phần thi.' });
  q.run('DELETE FROM sections WHERE id=?', sid);
  q.run('UPDATE tests SET updated_at=? WHERE id=?', nowISO(), s.test_id);
  audit(req, 'section.delete', 'sections/' + sid, {});
  res.json({ ok: true });
});

/** Gắn câu hỏi vào phần (thủ công, chọn từ ngân hàng) */
router.post('/admin/sections/:sid/items', (req, res) => {
  const sid = int(req.params.sid, 0);
  const s = q.get('SELECT * FROM sections WHERE id=?', sid);
  if (!s) return res.status(404).json({ error: 'Không tìm thấy phần thi.' });
  const ids = Array.isArray(req.body && req.body.questionIds)
    ? req.body.questionIds.map(x => int(x, 0)).filter(Boolean) : [];
  if (!ids.length) return bad(res, 'Chưa chọn câu hỏi nào.');

  const test = q.get('SELECT family_id FROM tests WHERE id=?', s.test_id);
  let added = 0, skipped = 0;
  tx(() => {
    let sort = (q.val('SELECT COALESCE(MAX(sort),-1) s FROM section_items WHERE section_id=?', sid)) + 1;
    for (const qid of ids) {
      const row = q.get("SELECT family_id, skill FROM questions WHERE id=? AND status='active'", qid);
      // Chỉ nhận câu cùng kỳ thi và cùng kỹ năng với phần thi
      if (!row || row.family_id !== test.family_id || row.skill !== s.skill) { skipped++; continue; }
      const r = q.run('INSERT OR IGNORE INTO section_items (section_id,question_id,sort) VALUES (?,?,?)', sid, qid, sort++);
      if (r.changes) added++; else skipped++;
    }
    q.run('UPDATE tests SET updated_at=? WHERE id=?', nowISO(), s.test_id);
  });
  audit(req, 'section.items.add', 'sections/' + sid, { added, skipped });
  res.json({ added, skipped });
});

router.delete('/admin/items/:itemId', (req, res) => {
  const itemId = int(req.params.itemId, 0);
  const row = q.get(`SELECT si.id, s.test_id FROM section_items si
                       JOIN sections s ON s.id = si.section_id WHERE si.id=?`, itemId);
  if (!row) return res.status(404).json({ error: 'Không tìm thấy câu trong phần thi.' });
  q.run('DELETE FROM section_items WHERE id=?', itemId);
  q.run('UPDATE tests SET updated_at=? WHERE id=?', nowISO(), row.test_id);
  audit(req, 'section.items.remove', 'items/' + itemId, {});
  res.json({ ok: true });
});

/** Sinh đề TỰ ĐỘNG theo blueprint: bốc ngẫu nhiên từ ngân hàng câu hỏi.
 *  body: { familyId, level, title?, blueprint:[{name,skill,type,items,minutes}], strictLevel? }
 *  - strictLevel=true: chỉ lấy câu đúng độ khó; mặc định ưu tiên đúng độ khó rồi mới lấy độ khó khác.
 *  - Trả lỗi rõ ràng khi ngân hàng không đủ câu.
 */
router.post('/admin/tests/generate', (req, res) => {
  const b = req.body || {};
  const familyId = str(b.familyId, 20);
  const level = str(b.level, 5).toUpperCase();
  const strict = !!b.strictLevel;
  if (!familyExists(familyId)) return bad(res, 'Kỳ thi không hợp lệ.');
  if (!LEVELS.includes(level)) return bad(res, 'Độ khó không hợp lệ.');
  const bp = Array.isArray(b.blueprint) ? b.blueprint : [];
  if (!bp.length) return bad(res, 'Chưa khai báo phần nào cho đề.');

  // Kiểm tra đủ câu trước khi tạo, gom hết thiếu hụt để báo một lần
  const picked = [];
  const shortages = [];
  const usedIds = new Set();
  for (const sec of bp) {
    const skill = str(sec.skill, 20);
    const want = clamp(int(sec.items, 0), 1, 200);
    if (!SKILLS.includes(skill)) return bad(res, 'Kỹ năng không hợp lệ: ' + skill);

    /* Format chuẩn khai báo dạng câu cho phép (vd TOEIC Part 5 chỉ nhận mcq);
       không khai thì nhận mọi dạng như trước. Khai cả chữ cái phần thi thì chỉ
       bốc trong đúng phần đó — cùng một pool cho hai phần khác nhau là cách
       chắc chắn nhất để dựng ra một đề trông đúng mà hỏi sai. */
    const part = EXAM_FORMATS.partsOf(familyId).includes(str(sec.part, 2).toUpperCase())
      ? str(sec.part, 2).toUpperCase() : '';
    const { sql: poolSql, args: poolArgs } = poolWhere(familyId, skill, sec.types, part);
    const pool = strict
      ? q.all(`SELECT id FROM questions WHERE ${poolSql} AND level=?`, ...poolArgs, level)
      : q.all(`SELECT id, (level=?) exact FROM questions WHERE ${poolSql} ORDER BY exact DESC`,
              level, ...poolArgs);

    const avail = pool.filter(r => !usedIds.has(r.id));
    if (avail.length < want) {
      shortages.push({
        section: str(sec.name, 100) || skill, skill, part: part || null,
        need: want, have: avail.length
      });
      continue;
    }
    // Xáo trong nhóm ưu tiên: giữ thứ tự exact trước, trộn ngẫu nhiên trong từng nhóm
    const exact = avail.filter(r => strict || r.exact);
    const other = avail.filter(r => !strict && !r.exact);
    const shuffle = arr => arr.map(v => [Math.random(), v]).sort((a, c) => a[0] - c[0]).map(v => v[1]);
    const chosen = shuffle(exact).concat(shuffle(other)).slice(0, want);
    chosen.forEach(r => usedIds.add(r.id));
    picked.push({ sec, part, ids: chosen.map(r => r.id) });
  }

  if (shortages.length) {
    return res.status(409).json({
      error: 'Ngân hàng câu hỏi chưa đủ để sinh đề.',
      shortages
    });
  }

  const title = str(b.title, 200) || (q.get('SELECT name FROM families WHERE id=?', familyId).name +
    ' tự động ' + level + ' ' + new Date().toISOString().slice(0, 10));
  let id = slug(familyId + '-auto-' + level + '-' + Date.now().toString(36));
  const at = nowISO();

  tx(() => {
    q.run(`INSERT INTO tests (id,family_id,title,level,duration_min,scoring,guide_json,status,build_mode,created_at,updated_at,created_by)
           VALUES (?,?,?,?,?,?,?,'draft','auto',?,?,?)`,
      id, familyId, title, level,
      bp.reduce((a, s) => a + clamp(int(s.minutes, 0), 0, 600), 0),
      str(b.scoring, 300), JSON.stringify(Array.isArray(b.guide) ? b.guide.map(g => str(g, 300)) : []),
      at, at, req.admin.id);

    picked.forEach((p, i) => {
      q.run('INSERT INTO sections (test_id,name,skill,type,minutes,sort,part) VALUES (?,?,?,?,?,?,?)',
        id, str(p.sec.name, 100) || p.sec.skill, str(p.sec.skill, 20),
        str(p.sec.type, 100) || 'Trắc nghiệm', clamp(int(p.sec.minutes, 0), 0, 600), i, p.part || null);
      const sid = q.val('SELECT id FROM sections WHERE test_id=? ORDER BY id DESC LIMIT 1', id);
      p.ids.forEach((qid, j) =>
        q.run('INSERT OR IGNORE INTO section_items (section_id,question_id,sort) VALUES (?,?,?)', sid, qid, j));
    });
  });

  audit(req, 'test.generate', 'tests/' + id, { familyId, level, sections: bp.length, items: usedIds.size });
  res.status(201).json(testDetail(id));
});

/** Bốc lại toàn bộ câu của một phần (giữ số lượng) */
router.post('/admin/sections/:sid/reshuffle', (req, res) => {
  const sid = int(req.params.sid, 0);
  const s = q.get('SELECT * FROM sections WHERE id=?', sid);
  if (!s) return res.status(404).json({ error: 'Không tìm thấy phần thi.' });
  const t = q.get('SELECT family_id, level FROM tests WHERE id=?', s.test_id);
  const want = q.val('SELECT COUNT(*) c FROM section_items WHERE section_id=?', sid);
  if (!want) return bad(res, 'Phần này chưa có câu nào để bốc lại.');

  /* Bốc lại phải bốc trong đúng cái pool mà trình sinh đề đã dùng. Trước đây
     chỗ này chỉ lọc theo kỹ năng: bốc lại một phần Nói của VPET có thể kéo câu
     của phần Nói khác vào, và một phần Đọc trắc nghiệm có thể nhận câu điền
     từ. Chữ cái phần thi lưu trên section cho biết phải bốc ở đâu, và blueprint
     cho biết phần đó nhận dạng câu nào. */
  const blueprint = s.part ? EXAM_FORMATS.sectionOfPart(t.family_id, s.part) : null;
  const { sql: poolSql, args: poolArgs } = poolWhere(
    t.family_id, s.skill, blueprint ? blueprint.types : null, s.part || '');
  const pool = q.all(
    `SELECT id, (level=?) exact FROM questions WHERE ${poolSql} ORDER BY exact DESC`,
    t.level, ...poolArgs);
  if (pool.length < want) {
    return bad(res, 'Ngân hàng' + (s.part ? ' phần ' + s.part : '') + ' chỉ còn ' + pool.length +
      ' câu, không đủ ' + want + ' câu.');
  }

  const shuffle = arr => arr.map(v => [Math.random(), v]).sort((a, c) => a[0] - c[0]).map(v => v[1]);
  const chosen = shuffle(pool.filter(r => r.exact)).concat(shuffle(pool.filter(r => !r.exact))).slice(0, want);
  tx(() => {
    q.run('DELETE FROM section_items WHERE section_id=?', sid);
    chosen.forEach((r, i) => q.run('INSERT INTO section_items (section_id,question_id,sort) VALUES (?,?,?)', sid, r.id, i));
    q.run('UPDATE tests SET updated_at=? WHERE id=?', nowISO(), s.test_id);
  });
  audit(req, 'section.reshuffle', 'sections/' + sid, { count: want });
  res.json({ ok: true, count: want });
});

/* ============================= USER ============================= */
router.get('/admin/users', (req, res) => {
  const where = [];
  const args = [];
  if (req.query.status) { where.push('status = ?'); args.push(str(req.query.status, 20)); }
  if (req.query.verified === '1') where.push('verified = 1');
  if (req.query.verified === '0') where.push('verified = 0');
  if (req.query.q) {
    where.push('(name LIKE ? OR email LIKE ? OR username LIKE ?)');
    const like = '%' + str(req.query.q, 80) + '%';
    args.push(like, like, like);
  }
  const w = where.length ? 'WHERE ' + where.join(' AND ') : '';
  const limit = clamp(int(req.query.limit, 25), 1, 200);
  const offset = clamp(int(req.query.offset, 0), 0, 1e6);
  const total = q.val('SELECT COUNT(*) c FROM users ' + w, ...args);
  const rows = q.all(`
    SELECT u.*,
           (SELECT COUNT(*) FROM codes c WHERE c.user_id=u.id AND c.status='redeemed') codes,
           (SELECT COALESCE(SUM(o.amount),0) FROM orders o WHERE o.user_id=u.id AND o.status='paid') spent
      FROM users u ${w} ORDER BY u.created_at DESC LIMIT ? OFFSET ?`, ...args, limit, offset);
  res.json({
    total, limit, offset,
    items: rows.map(u => ({
      id: u.id, username: u.username, email: u.email, name: u.name,
      verified: !!u.verified, status: u.status, interests: jparse(u.interests_json, []),
      codes: u.codes, spent: u.spent, note: u.note, createdAt: u.created_at, lastLoginAt: u.last_login_at
    }))
  });
});

router.get('/admin/users/:id', (req, res) => {
  const id = int(req.params.id, 0);
  const u = q.get('SELECT * FROM users WHERE id=?', id);
  if (!u) return res.status(404).json({ error: 'Không tìm thấy học viên.' });
  const codes = q.all('SELECT * FROM codes WHERE user_id=? ORDER BY redeemed_at DESC', id);
  const orders = q.all('SELECT * FROM orders WHERE user_id=? ORDER BY created_at DESC', id);
  res.json({
    user: {
      id: u.id, username: u.username, email: u.email, name: u.name, verified: !!u.verified,
      status: u.status, interests: jparse(u.interests_json, []), note: u.note,
      createdAt: u.created_at, lastLoginAt: u.last_login_at
    },
    codes: codes.map(c => ({
      id: c.id, code: c.code, unlockType: c.unlock_type, unlockRef: c.unlock_ref,
      label: unlockLabel(c.unlock_type, c.unlock_ref), status: c.status,
      redeemedAt: c.redeemed_at, expiresAt: c.expires_at
    })),
    orders: orders.map(o => ({ id: o.id, name: o.name, amount: o.amount, status: o.status, createdAt: o.created_at }))
  });
});

router.post('/admin/users/:id/status', (req, res) => {
  const id = int(req.params.id, 0);
  const status = str(req.body && req.body.status, 20);
  if (!['active', 'locked'].includes(status)) return bad(res, 'Trạng thái không hợp lệ.');
  const r = q.run('UPDATE users SET status=? WHERE id=?', status, id);
  if (!r.changes) return res.status(404).json({ error: 'Không tìm thấy học viên.' });
  audit(req, 'user.status', 'users/' + id, { status });
  res.json({ ok: true });
});

router.post('/admin/users/:id/verify', (req, res) => {
  const id = int(req.params.id, 0);
  const r = q.run('UPDATE users SET verified=1 WHERE id=?', id);
  if (!r.changes) return res.status(404).json({ error: 'Không tìm thấy học viên.' });
  audit(req, 'user.verify', 'users/' + id, {});
  res.json({ ok: true });
});

router.put('/admin/users/:id', (req, res) => {
  const id = int(req.params.id, 0);
  const u = q.get('SELECT * FROM users WHERE id=?', id);
  if (!u) return res.status(404).json({ error: 'Không tìm thấy học viên.' });
  const b = req.body || {};
  const name = str(b.name, 120) || u.name;
  const note = str(b.note, 500);
  const interests = Array.isArray(b.interests)
    ? b.interests.map(x => str(x, 20)).filter(familyExists) : jparse(u.interests_json, []);
  q.run('UPDATE users SET name=?, note=?, interests_json=? WHERE id=?', name, note, JSON.stringify(interests), id);
  audit(req, 'user.update', 'users/' + id, {});
  res.json({ ok: true });
});

/* ============================= CODE ============================= */
function validUnlock(type, ref) {
  if (type === 'test') return !!q.val('SELECT 1 FROM tests WHERE id=?', ref);
  if (type === 'family') return familyExists(ref);
  if (type === 'bundle') {
    const ids = String(ref).split(',').map(s => s.trim()).filter(Boolean);
    return ids.length >= 2 && ids.every(familyExists);
  }
  return false;
}

router.get('/admin/codes', (req, res) => {
  const where = [];
  const args = [];
  if (req.query.status) { where.push('c.status = ?'); args.push(str(req.query.status, 20)); }
  if (req.query.type) { where.push('c.unlock_type = ?'); args.push(str(req.query.type, 20)); }
  if (req.query.batch) { where.push('c.batch_id = ?'); args.push(int(req.query.batch, 0)); }
  if (req.query.q) { where.push('c.code LIKE ?'); args.push('%' + str(req.query.q, 40).toUpperCase() + '%'); }
  const w = where.length ? 'WHERE ' + where.join(' AND ') : '';
  const limit = clamp(int(req.query.limit, 30), 1, 500);
  const offset = clamp(int(req.query.offset, 0), 0, 1e6);
  const total = q.val('SELECT COUNT(*) c FROM codes c ' + w, ...args);
  const rows = q.all(`
    SELECT c.*, u.name user_name, u.email user_email, b.name batch_name
      FROM codes c LEFT JOIN users u ON u.id=c.user_id LEFT JOIN batches b ON b.id=c.batch_id
      ${w} ORDER BY c.id DESC LIMIT ? OFFSET ?`, ...args, limit, offset);
  res.json({
    total, limit, offset,
    items: rows.map(c => {
      const plan = PLANS.byId(c.plan_id);
      return {
        id: c.id, code: c.code, unlockType: c.unlock_type, unlockRef: c.unlock_ref,
        planId: c.plan_id || null,
        /* Nhãn hiện ở bảng quản trị là tên gói khi có; mã cũ chưa gắn gói thì
           rơi về nhãn theo kỳ thi, và nói thẳng là chưa có gói. */
        label: plan ? 'Gói ' + plan.name + ' · ' + plan.months + ' tháng'
                    : unlockLabel(c.unlock_type, c.unlock_ref) + ' (chưa gắn gói)',
        status: c.status,
        expiresAt: c.expires_at, accessExpiresAt: c.access_expires_at,
        redeemedAt: c.redeemed_at, note: c.note,
        batchId: c.batch_id, batchName: c.batch_name,
        user: c.user_id ? { id: c.user_id, name: c.user_name, email: c.user_email } : null,
        createdAt: c.created_at
      };
    })
  });
});

router.get('/admin/batches', (req, res) => {
  const rows = q.all(`
    SELECT b.*, (SELECT COUNT(*) FROM codes c WHERE c.batch_id=b.id) total,
           (SELECT COUNT(*) FROM codes c WHERE c.batch_id=b.id AND c.status='redeemed') used
      FROM batches b ORDER BY b.id DESC LIMIT 50`);
  res.json({
    items: rows.map(b => ({
      id: b.id, name: b.name, unlockType: b.unlock_type, unlockRef: b.unlock_ref,
      label: unlockLabel(b.unlock_type, b.unlock_ref), qty: b.qty, total: b.total, used: b.used,
      expiresAt: b.expires_at, createdAt: b.created_at
    }))
  });
});

/** Cấp code: một lô nhiều mã, hoặc cấp thẳng cho một học viên */
router.post('/admin/codes', (req, res) => {
  const b = req.body || {};
  const type = str(b.unlockType, 20);
  const ref = str(b.unlockRef, 200);
  const qty = clamp(int(b.qty, 1), 1, 500);
  const note = str(b.note, 200);
  const expiresAt = str(b.expiresAt, 10) || null;
  const assignTo = int(b.userId, 0) || null;
  /* Cái mà một mã thực sự cấp là GÓI. Bắt buộc phải chọn, không đặt mặc định:
     mã không có gói thì kích hoạt xong người dùng vẫn không vào được gì, mà
     lỗi ấy chỉ lộ ra khi họ đã cầm mã trong tay. */
  const plan = PLANS.byId(str(b.planId, 40));

  if (!plan) {
    return bad(res, 'Chọn gói cho mã: ' + PLANS.PLANS.map(p => p.id).join(', ') + '.');
  }
  if (!validUnlock(type, ref)) return bad(res, 'Quyền mở khoá không hợp lệ.');
  if (expiresAt && !/^\d{4}-\d{2}-\d{2}$/.test(expiresAt)) return bad(res, 'Hạn dùng phải theo dạng YYYY-MM-DD.');
  if (assignTo && !q.val('SELECT 1 FROM users WHERE id=?', assignTo)) return bad(res, 'Học viên không tồn tại.');
  if (assignTo && qty !== 1) return bad(res, 'Cấp trực tiếp cho học viên thì mỗi lần một mã.');

  const at = nowISO();
  /* Cấp thẳng cho học viên là kích hoạt luôn, nên thời hạn truy cập phải bắt
     đầu đếm từ bây giờ. Để trống thì entitlementOf() hiểu là không bao giờ hết
     hạn — cho không một gói vĩnh viễn. */
  const accessUntil = (() => {
    if (!assignTo) return null;
    const d = new Date(at);
    d.setMonth(d.getMonth() + plan.months);
    return d.toISOString();
  })();
  let batchId = null;
  const created = [];

  tx(() => {
    if (qty > 1) {
      q.run('INSERT INTO batches (name,unlock_type,unlock_ref,qty,expires_at,created_at,created_by) VALUES (?,?,?,?,?,?,?)',
        str(b.batchName, 120) || ('Lô ' + plan.name + ' ' + at.slice(0, 10)),
        type, ref, qty, expiresAt, at, req.admin.id);
      batchId = q.val('SELECT id FROM batches ORDER BY id DESC LIMIT 1');
    }
    for (let i = 0; i < qty; i++) {
      let code = makeCode();
      while (q.val('SELECT 1 FROM codes WHERE code=?', code)) code = makeCode();
      q.run(`INSERT INTO codes (code,batch_id,unlock_type,unlock_ref,plan_id,status,expires_at,access_expires_at,user_id,redeemed_at,note,created_at,created_by)
             VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)`,
        code, batchId, type, ref, plan.id, assignTo ? 'redeemed' : 'unused', expiresAt,
        accessUntil, assignTo, assignTo ? at : null, note || null, at, req.admin.id);
      created.push(code);
    }
  });

  audit(req, 'code.issue', batchId ? 'batches/' + batchId : 'codes', { qty, plan: plan.id, type, ref, assignTo });
  res.status(201).json({ created, batchId, qty, plan: { id: plan.id, name: plan.name, months: plan.months } });
});

router.post('/admin/codes/:id/revoke', (req, res) => {
  const id = int(req.params.id, 0);
  const c = q.get('SELECT * FROM codes WHERE id=?', id);
  if (!c) return res.status(404).json({ error: 'Không tìm thấy mã.' });
  if (c.status === 'revoked') return bad(res, 'Mã đã bị thu hồi trước đó.');
  q.run("UPDATE codes SET status='revoked' WHERE id=?", id);
  audit(req, 'code.revoke', 'codes/' + id, { code: c.code, wasStatus: c.status });
  res.json({ ok: true });
});

/** Xuất CSV danh sách mã (theo lô hoặc theo bộ lọc trạng thái) */
router.get('/admin/codes/export', (req, res) => {
  const where = [];
  const args = [];
  if (req.query.batch) { where.push('c.batch_id = ?'); args.push(int(req.query.batch, 0)); }
  if (req.query.status) { where.push('c.status = ?'); args.push(str(req.query.status, 20)); }
  const w = where.length ? 'WHERE ' + where.join(' AND ') : '';
  const rows = q.all(`SELECT c.code, c.plan_id, c.unlock_type, c.unlock_ref, c.status,
                             c.expires_at, c.access_expires_at, c.redeemed_at,
                             u.email user_email
                        FROM codes c LEFT JOIN users u ON u.id=c.user_id ${w}
                       ORDER BY c.id DESC LIMIT 5000`, ...args);
  const esc = v => '"' + String(v == null ? '' : v).replace(/"/g, '""') + '"';
  /* Tệp này được đem đi phát cho lớp, nên phải nói đúng mã cấp GÓI gì. Trước
     đây chỉ có cột quyền mở khoá theo kỳ thi — với mô hình mới, đó là thông
     tin sai đưa thẳng tới tay người mua. */
  const csv = ['ma,goi,so_thang,quyen_mo_khoa,doi_tuong,trang_thai,han_kich_hoat,han_truy_cap,ngay_kich_hoat,email_hoc_vien']
    .concat(rows.map(r => {
      const plan = PLANS.byId(r.plan_id);
      return [r.code, plan ? plan.name : '', plan ? plan.months : '',
        r.unlock_type, r.unlock_ref, r.status,
        r.expires_at, r.access_expires_at, r.redeemed_at, r.user_email].map(esc).join(',');
    }))
    .join('\r\n');
  audit(req, 'code.export', 'codes', { rows: rows.length });
  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', 'attachment; filename="codes.csv"');
  res.send('﻿' + csv);            // BOM để Excel đọc đúng tiếng Việt
});

/* ======================= CÀI ĐẶT · NHẬT KÝ ======================= */
router.get('/admin/settings', (req, res) => {
  const rows = q.all('SELECT key, value FROM settings');
  const settings = {};
  rows.forEach(r => { settings[r.key] = r.value; });
  res.json({
    settings,
    packages: q.all('SELECT * FROM packages ORDER BY sort').map(p => ({
      id: p.id, name: p.name, price: p.price, familyId: p.family_id,
      description: p.description, perks: jparse(p.perks_json, []),
      featured: !!p.featured, active: !!p.active
    })),
    families: q.all('SELECT * FROM families ORDER BY sort').map(f => ({
      id: f.id, name: f.name, sub: f.sub, format: f.format, skills: jparse(f.skills_json, [])
    })),
    admins: q.all('SELECT id, username, name, role, active, created_at, last_login_at FROM admins ORDER BY id')
  });
});

router.put('/admin/settings', (req, res) => {
  const b = (req.body && req.body.settings) || {};
  const allowed = ['brand.name', 'brand.tenant', 'platform.notice'];
  const ins = require('./db').db.prepare(
    'INSERT INTO settings (key,value) VALUES (?,?) ON CONFLICT(key) DO UPDATE SET value=excluded.value');
  for (const k of allowed) if (k in b) ins.run(k, str(b[k], 300));
  audit(req, 'settings.update', 'settings', { keys: Object.keys(b) });
  res.json({ ok: true });
});

router.put('/admin/packages/:id', (req, res) => {
  const id = str(req.params.id, 40);
  const p = q.get('SELECT * FROM packages WHERE id=?', id);
  if (!p) return res.status(404).json({ error: 'Không tìm thấy gói.' });
  const b = req.body || {};
  const price = clamp(int(b.price, p.price), 0, 100000000);
  q.run('UPDATE packages SET name=?, price=?, description=?, active=? WHERE id=?',
    str(b.name, 120) || p.name, price, str(b.description, 400) || p.description,
    b.active === false ? 0 : 1, id);
  audit(req, 'package.update', 'packages/' + id, { price });
  res.json({ ok: true });
});

/** Đổi mật khẩu quản trị của chính mình */
router.post('/admin/password', (req, res) => {
  const b = req.body || {};
  const cur = typeof b.current === 'string' ? b.current : '';
  const next = typeof b.next === 'string' ? b.next : '';
  const me = q.get('SELECT * FROM admins WHERE id=?', req.admin.id);
  if (!A.verifyPassword(cur, me.pass_hash)) return res.status(403).json({ error: 'Mật khẩu hiện tại không đúng.' });
  if (next.length < 10) return bad(res, 'Mật khẩu mới cần ít nhất 10 ký tự.');
  if (!/[A-Za-z]/.test(next) || !/\d/.test(next)) return bad(res, 'Mật khẩu mới cần có cả chữ và số.');
  q.run('UPDATE admins SET pass_hash=? WHERE id=?', A.hashPassword(next), req.admin.id);
  q.run('DELETE FROM sessions WHERE admin_id=?', req.admin.id);   // buộc đăng nhập lại mọi thiết bị
  audit(req, 'admin.password', 'admins/' + req.admin.username, {});
  res.json({ ok: true, reauth: true });
});

router.get('/admin/audit', (req, res) => {
  const limit = clamp(int(req.query.limit, 60), 1, 300);
  const rows = q.all('SELECT * FROM audit ORDER BY id DESC LIMIT ?', limit);
  res.json({
    items: rows.map(r => ({
      id: r.id, admin: r.admin_name, action: r.action, target: r.target,
      meta: jparse(r.meta_json, {}), ip: r.ip, at: r.at
    }))
  });
});

/* =================== CATALOG CÔNG KHAI (đọc) ===================
   Shape trùng với mock phía học viên để frontend chuyển sang API mà
   không phải sửa markup. // TODO(frontend): thay _mock.js bằng endpoint này */
router.get('/catalog', (req, res) => {
  const families = q.all('SELECT * FROM families ORDER BY sort').map(f => ({
    id: f.id, name: f.name, sub: f.sub, format: f.format, skills: jparse(f.skills_json, []),
    /* 'ready' means the family has a working blueprint and can hold tests;
       'coming_soon' families are listed but cannot be bought or opened. */
    status: f.status || 'ready',
    /* Lettered parts this family's items are filed under, empty for a format
       with no part table. The bank screen builds its part picker from this
       rather than carrying its own copy of the VPET table. */
    parts: EXAM_FORMATS.partsOf(f.id).map(letter => {
      const sec = EXAM_FORMATS.sectionOfPart(f.id, letter) || {};
      return { part: letter, name: sec.name || letter, skill: sec.skill || '', types: sec.types || [] };
    })
  }));
  const tests = q.all("SELECT * FROM tests WHERE status='published' ORDER BY family_id, id").map(t => {
    const sections = q.all('SELECT * FROM sections WHERE test_id=? ORDER BY sort, id', t.id).map(s => ({
      name: s.name, type: s.type, minutes: s.minutes,
      items: q.val('SELECT COUNT(*) c FROM section_items WHERE section_id=?', s.id)
    }));
    return {
      id: t.id, familyId: t.family_id, title: t.title, level: t.level,
      durationMin: t.duration_min, scoring: t.scoring, guide: jparse(t.guide_json, []),
      skills: [...new Set(q.all('SELECT skill FROM sections WHERE test_id=?', t.id).map(r => r.skill))],
      sections,
      comingSoon: sections.some(s => !s.items)
    };
  });
  const packages = q.all('SELECT * FROM packages WHERE active=1 ORDER BY sort').map(p => ({
    id: p.id, name: p.name, price: p.price, familyId: p.family_id,
    desc: p.description, perks: jparse(p.perks_json, []), featured: !!p.featured
  }));
  /* Bảng giá là thông tin công khai và cần ở cả hai phía: màn bán hàng của học
     viên và màn cấp code của quản trị. Đi kèm danh mục thì cả hai chỉ cần một
     lượt gọi, và không nơi nào phải chép lại giá. */
  const plans = PLANS.PLANS.map(p => ({
    id: p.id, name: p.name, price: p.price, months: p.months,
    attempts: p.attempts || null, features: p.features,
    tagline: p.tagline, perks: p.perks, limits: p.limits
  }));
  res.set('Cache-Control', 'no-store').json({ families, tests, packages, plans });
});

/* ==================== Khu tự học (công khai) ==================== */

/** Bảng động từ bất quy tắc. Tra được theo V1, V2, V3 hoặc nghĩa tiếng Việt. */
router.get('/learn/irregular-verbs', (req, res) => {
  const level = LEVELS.includes(str(req.query.level, 2)) ? str(req.query.level, 2) : '';
  const grp = ['aaa', 'aba', 'abb', 'abc'].includes(str(req.query.group, 3)) ? str(req.query.group, 3) : '';
  const kw = str(req.query.q, 60).toLowerCase();

  const where = [];
  const args = [];
  if (level) { where.push('level = ?'); args.push(level); }
  if (grp) { where.push('grp = ?'); args.push(grp); }
  if (kw) {
    where.push('(lower(v1) LIKE ? OR lower(v2) LIKE ? OR lower(v3) LIKE ? OR lower(vi) LIKE ?)');
    const like = '%' + kw + '%';
    args.push(like, like, like, like);
  }
  const sql = 'SELECT * FROM irregular_verbs' +
    (where.length ? ' WHERE ' + where.join(' AND ') : '') + ' ORDER BY sort, v1';

  const verbs = q.all(sql, ...args).map(v => ({
    v1: v.v1, v2: v.v2, v3: v.v3, ving: v.ving,
    ipaUk: v.ipa_uk, ipaUs: v.ipa_us, vi: v.vi,
    group: v.grp, level: v.level, note: v.note,
    exEn: v.ex_en, exVi: v.ex_vi
  }));

  res.set('Cache-Control', 'public, max-age=300').json({
    total: q.val('SELECT COUNT(*) c FROM irregular_verbs'),
    count: verbs.length,
    verbs
  });
});

/** Từ nối — lọc theo chức năng, độ trang trọng, bậc, hoặc từ khoá */
router.get('/learn/linking-words', (req, res) => {
  const fns = new Set(LINKING.FUNCTIONS.map(f => f[0]));
  const regs = new Set(LINKING.REGISTERS.map(r => r[0]));
  const fn = fns.has(str(req.query.fn, 20)) ? str(req.query.fn, 20) : '';
  const reg = regs.has(str(req.query.register, 20)) ? str(req.query.register, 20) : '';
  const level = LEVELS.includes(str(req.query.level, 2).toUpperCase())
    ? str(req.query.level, 2).toUpperCase() : '';
  const kw = str(req.query.q, 60).toLowerCase();

  const where = [];
  const args = [];
  if (fn) { where.push('fn = ?'); args.push(fn); }
  if (reg) { where.push('register = ?'); args.push(reg); }
  if (level) { where.push('level = ?'); args.push(level); }
  if (kw) {
    where.push('(lower(word) LIKE ? OR lower(vi) LIKE ? OR lower(ex_en) LIKE ?)');
    const like = '%' + kw + '%';
    args.push(like, like, like);
  }
  const sql = 'SELECT * FROM linking_words' +
    (where.length ? ' WHERE ' + where.join(' AND ') : '') + ' ORDER BY sort, word';

  const words = q.all(sql, ...args).map(w => ({
    word: w.word, fn: w.fn, register: w.register, pos: w.pos, punct: w.punct,
    vi: w.vi, level: w.level, exEn: w.ex_en, exVi: w.ex_vi, warn: w.warn
  }));

  res.set('Cache-Control', 'public, max-age=300').json({
    total: q.val('SELECT COUNT(*) c FROM linking_words'),
    count: words.length,
    functions: LINKING.FUNCTIONS.map(([id, label]) => ({ id, label })),
    registers: LINKING.REGISTERS.map(([id, label]) => ({ id, label })),
    words
  });
});

/* Điểm ngữ pháp — danh sách gọn, không kèm câu ví dụ cho nhẹ payload */
router.get('/learn/grammar', (req, res) => {
  const grp = str(req.query.grp, 20);
  const level = LEVELS.includes(str(req.query.level, 2).toUpperCase())
    ? str(req.query.level, 2).toUpperCase() : '';

  const where = [];
  const args = [];
  if (grp) { where.push('grp = ?'); args.push(grp); }
  if (level) { where.push('level = ?'); args.push(level); }
  const sql = 'SELECT * FROM grammar_points' +
    (where.length ? ' WHERE ' + where.join(' AND ') : '') + ' ORDER BY sort, id';

  const points = q.all(sql, ...args).map(p => ({
    slug: p.slug, nameEn: p.name_en, nameVi: p.name_vi,
    grp: p.grp, level: p.level, summary: p.summary,
    formula: jparse(p.formula_json), signals: jparse(p.signals_json),
    counts: {
      example: q.val('SELECT COUNT(*) c FROM grammar_examples WHERE point_id=? AND kind=?', p.id, 'example'),
      practice: q.val('SELECT COUNT(*) c FROM grammar_examples WHERE point_id=? AND kind=?', p.id, 'practice')
    }
  }));

  res.set('Cache-Control', 'public, max-age=300').json({
    total: q.val('SELECT COUNT(*) c FROM grammar_points'),
    count: points.length,
    groups: q.all('SELECT grp, COUNT(*) c FROM grammar_points GROUP BY grp ORDER BY grp')
      .map(g => ({ id: g.grp, count: g.c })),
    points
  });
});

/* Một điểm ngữ pháp kèm toàn bộ ví dụ và câu luyện tập */
router.get('/learn/grammar/:slug', (req, res) => {
  const p = q.get('SELECT * FROM grammar_points WHERE slug = ?', str(req.params.slug, 60));
  if (!p) return res.status(404).json({ error: 'Không tìm thấy điểm ngữ pháp' });

  const rows = q.all(
    'SELECT * FROM grammar_examples WHERE point_id = ? ORDER BY kind, sort, id', p.id);

  res.set('Cache-Control', 'public, max-age=300').json({
    point: {
      slug: p.slug, nameEn: p.name_en, nameVi: p.name_vi,
      grp: p.grp, level: p.level, summary: p.summary,
      formula: jparse(p.formula_json), signals: jparse(p.signals_json),
      useWhen: jparse(p.use_when_json), useNot: jparse(p.use_not_json),
      confuse: jparse(p.confuse_json), errors: jparse(p.errors_json)
    },
    examples: rows.filter(r => r.kind === 'example')
      .map(r => ({ en: r.en, vi: r.vi, ok: r.ok === 1, note: r.note })),
    practice: rows.filter(r => r.kind === 'practice')
      .map(r => ({ en: r.en, vi: r.vi, answer: r.answer }))
  });
});

module.exports = router;
