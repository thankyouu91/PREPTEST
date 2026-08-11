/**
 * API tài khoản học viên — /api/auth/… và /api/me.
 *
 * Nguyên tắc bảo mật:
 * - Mật khẩu băm bằng scrypt như khu quản trị, không bao giờ trả về client.
 * - Phiên qua cookie prep_user HttpOnly + SameSite=Strict; DB chỉ giữ bản băm token.
 * - Mọi route thay đổi dữ liệu trên phiên đã đăng nhập đều qua csrfGuard.
 *   Riêng register/login/forgot/reset chưa có phiên nên không kiểm CSRF (giống
 *   /api/admin/login): cookie SameSite=Strict cộng với việc bắt buộc thân JSON
 *   khiến biểu mẫu chéo site không dựng được request hợp lệ.
 * - Không tiết lộ email nào đã đăng ký: quên mật khẩu luôn trả cùng một câu trả lời.
 * - Chống dò: đăng nhập khoá tạm theo IP + tài khoản; đăng ký và gửi lại email
 *   giới hạn theo IP.
 *
 * Gửi email: hệ thống chưa nối dịch vụ mail. Liên kết xác thực / đặt lại được
 * ghi ra console máy chủ, và CHỈ ngoài production mới trả kèm trong response để
 * chạy thử được luồng.
 * // TODO(backend/mail): nối SMTP hoặc dịch vụ gửi mail, bỏ devLink khỏi response.
 */
'use strict';
const express = require('express');
const { q, nowISO, jparse, audit } = require('./db');
const A = require('./auth');
const googleAuth = require('./google-auth');
const PLANS = require('./data/plans');
const { entitlementOf } = require('./entitlements');

const router = express.Router();
router.use(express.json({ limit: '256kb' }));

/* ============================ Trợ giúp ============================ */
const bad = (res, msg) => res.status(400).json({ error: msg });
const str = (v, max) => (typeof v === 'string' ? v.trim().slice(0, max || 200) : '');
const isProd = () => process.env.NODE_ENV === 'production';

/** Số tài khoản mở được mỗi giờ từ một địa chỉ. Xem chú thích ở /auth/register. */
const REGISTER_PER_HOUR = Math.max(1, parseInt(process.env.REGISTER_PER_HOUR, 10) || 5);

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

/** Ghi nhật ký cho hành động của học viên (không phải quản trị viên nào cả) */
function logUser(req, action, username, meta) {
  audit({ ip: req.ip, admin: { id: null, username: 'học viên' } }, action, 'users/' + username, meta || {});
}

/** Quy tắc mật khẩu: tối thiểu 8 ký tự, có cả chữ và số. */
function passwordProblem(pw) {
  if (typeof pw !== 'string' || pw.length < 8) return 'Password needs at least 8 characters.';
  if (pw.length > 200) return 'That password is too long.';
  if (!/[A-Za-z]/.test(pw) || !/\d/.test(pw)) return 'Password needs both letters and numbers.';
  return null;
}

/** Lọc danh sách kỳ thi quan tâm về đúng các id có thật */
function cleanInterests(v) {
  if (!Array.isArray(v)) return [];
  const valid = new Set(q.all('SELECT id FROM families').map(f => f.id));
  return [...new Set(v.filter(x => typeof x === 'string' && valid.has(x)))].slice(0, 10);
}

/** Ghi liên kết ra log; ngoài production trả về để client tự mở được. */
function deliverLink(kind, user, token) {
  const path = kind === 'verify' ? '/prep/xac-thuc-email/?token=' : '/prep/dat-lai-mat-khau/?token=';
  const link = path + encodeURIComponent(token);
  const label = kind === 'verify' ? 'xác thực email' : 'đặt lại mật khẩu';
  console.log(`[mail] Liên kết ${label} cho ${user.email}: ${link}`);
  return isProd() ? undefined : link;
}

/** Hồ sơ trả về client — không bao giờ kèm pass_hash */
function profileOf(userId) {
  const u = q.get('SELECT * FROM users WHERE id=?', userId);
  if (!u) return null;
  return {
    username: u.username, email: u.email, name: u.name,
    verified: !!u.verified, interests: jparse(u.interests_json, []),
    createdAt: u.created_at
  };
}

/** Quyền mở khoá của học viên, suy ra từ các code đã kích hoạt */
function accessOf(userId) {
  const rows = q.all(
    "SELECT * FROM codes WHERE user_id=? AND status='redeemed' ORDER BY redeemed_at DESC", userId);
  const testIds = new Set(), familyIds = new Set();
  const now = nowISO();
  const codes = rows.map(c => {
    const refs = String(c.unlock_ref).split(',').filter(Boolean);
    if (c.unlock_type === 'test') refs.forEach(r => testIds.add(r));
    else refs.forEach(r => familyIds.add(r));
    /* Cái quyết định một mã còn dùng được hay không là hạn TRUY CẬP
       (access_expires_at, đếm từ lúc kích hoạt), không phải hạn kích hoạt
       (expires_at, hạn chót phải nhập mã trước ngày đó). Trước đây chỉ có cái
       thứ hai nên mã đã kích hoạt trông như hết hạn sai thời điểm. */
    const until = c.access_expires_at || c.expires_at;
    const plan = PLANS.byId(c.plan_id);
    return {
      code: c.code,
      /* Mã mang một GÓI. unlocks giữ lại cho dữ liệu cũ và cho màn hình nào
         còn đọc nó, nhưng plan mới là thứ nên hiện ra. */
      plan: plan ? { id: plan.id, name: plan.name, months: plan.months } : null,
      unlocks: c.unlock_type === 'test' ? { testId: refs[0] }
             : c.unlock_type === 'family' ? { familyId: refs[0] }
             : { bundle: refs },
      redeemedAt: c.redeemed_at,
      expiresAt: until,
      status: until && until <= now ? 'expired' : 'active'
    };
  });
  return { unlockedTestIds: [...testIds], unlockedFamilyIds: [...familyIds], myCodes: codes };
}

function ordersOf(userId) {
  return q.all('SELECT * FROM orders WHERE user_id=? ORDER BY created_at DESC LIMIT 50', userId)
    .map(o => ({ id: 'DH' + o.id, packageId: o.package_id, name: o.name, amount: o.amount, at: o.created_at, status: o.status }));
}

/* ============================ Đăng ký ============================ */
router.post('/auth/register', (req, res) => {
  // Chỉ trừ lượt khi TẠO ĐƯỢC tài khoản: dữ liệu sai hay email trùng không tiêu tốn hạn mức
  const rlKey = 'register|' + (req.ip || '?');
  /* Năm tài khoản mỗi giờ mỗi địa chỉ. Mặc định này áp dụng ở mọi nơi, kể cả
     máy chạy thử — không có nhánh "ngoài production thì nới ra", vì một ngưỡng
     chỉ tồn tại trên giấy khi chạy thật là ngưỡng không ai kiểm được.
     REGISTER_PER_HOUR chỉ dành cho bộ kiểm thử: cả suite lẫn ảnh nghiệm thu đăng
     ký từ đúng một địa chỉ 127.0.0.1, nên scripts/verify.sh đặt biến này lên cao
     để bước sau không bị bước trước chặn. Production không đặt biến ⇒ vẫn là 5. */
  const wait = A.rateLimitPeek(rlKey, REGISTER_PER_HOUR, 3600e3);
  if (wait) return res.status(429).json({ error: 'You have created several accounts in a row. Try again in ' + Math.ceil(wait / 60) + ' minutes.' });

  const b = req.body || {};
  const name = str(b.name, 80);
  const email = str(b.email, 160).toLowerCase();
  const password = typeof b.password === 'string' ? b.password : '';

  if (!name) return bad(res, 'Please enter your full name.');
  if (!EMAIL_RE.test(email)) return bad(res, 'That email address is not valid.');
  const pwErr = passwordProblem(password);
  if (pwErr) return bad(res, pwErr);

  if (q.get('SELECT id FROM users WHERE email=? OR username=?', email, email)) {
    return res.status(409).json({ error: 'That email is already registered. Try signing in, or use another address.' });
  }

  q.run(`INSERT INTO users (username,email,name,pass_hash,verified,status,interests_json,created_at)
         VALUES (?,?,?,?,0,'active',?,?)`,
    email, email, name, A.hashPassword(password), JSON.stringify(cleanInterests(b.interests)), nowISO());

  A.rateLimitNote(rlKey);
  const user = q.get('SELECT * FROM users WHERE email=?', email);
  const devLink = deliverLink('verify', user, A.issueToken(user.id, 'verify'));
  A.createUserSession(user.id, req, res);
  q.run('UPDATE users SET last_login_at=? WHERE id=?', nowISO(), user.id);
  logUser(req, 'user.register', email);

  res.status(201).json({ ok: true, user: profileOf(user.id), verifyLink: devLink });
});

/* =========================== Đăng nhập =========================== */
router.post('/auth/login', (req, res) => {
  const b = req.body || {};
  const identifier = str(b.username, 160).toLowerCase();
  const password = typeof b.password === 'string' ? b.password : '';
  if (!identifier || !password) return bad(res, 'Enter your username and password.');

  const key = A.throttleKey(req, 'user:' + identifier);
  const lockedFor = A.isLocked(key);
  if (lockedFor) {
    return res.status(429).json({ error: 'Too many failed attempts. Try again in ' + Math.ceil(lockedFor / 60) + ' minutes.' });
  }

  const user = q.get('SELECT * FROM users WHERE lower(username)=? OR lower(email)=?', identifier, identifier);

  /* An account created through Google has no password. Saying so is not a
     disclosure worth worrying about — the person is already holding that email
     address — and the alternative is a login that fails with no way forward. */
  if (user && !user.pass_hash) {
    logUser(req, 'user.login.google_only', user.username);
    return res.status(409).json({
      error: 'This account signs in with Google. Use "Continue with Google", or set a password of your own through "Forgot password".',
      useGoogle: true
    });
  }

  // Vẫn băm một lần khi không có tài khoản để thời gian phản hồi không lộ thông tin
  const ok = user ? A.verifyPassword(password, user.pass_hash)
                  : A.verifyPassword(password, A.hashPassword('không-tồn-tại'));
  if (!user || !ok) {
    A.noteFailure(key);
    logUser(req, 'user.login.failed', identifier);
    return res.status(401).json({ error: 'That username or password is not right. Please check and try again.' });
  }
  if (user.status !== 'active') {
    logUser(req, 'user.login.locked', user.username);
    return res.status(403).json({ error: 'This account is locked. Contact your centre to reopen it.' });
  }

  A.clearFailures(key);
  A.createUserSession(user.id, req, res);
  q.run('UPDATE users SET last_login_at=? WHERE id=?', nowISO(), user.id);
  logUser(req, 'user.login', user.username);
  res.json({ ok: true, user: profileOf(user.id) });
});

/* ======================= Kích hoạt code =======================
   Chuyển hẳn về máy chủ. Luật "một code chỉ dùng cho một tài khoản" không thể
   ép ở trình duyệt: mã nằm trong localStorage thì ai cũng sửa được, và hai
   máy khác nhau không nhìn thấy nhau. */
router.post('/redeem', A.requireUser, A.csrfGuard, (req, res) => {
  const raw = str(req.body && req.body.code, 40).toUpperCase().trim();
  if (!raw) return bad(res, 'Nhập mã kích hoạt của bạn.');

  /* Mã là chuỗi ngắn nên đoán mò là có thật. Giới hạn theo IP + tài khoản,
     đếm cả lần sai lẫn lần đúng để không ai quét được cả dải mã. */
  const wait = A.rateLimit('redeem:' + A.throttleKey(req, 'u' + req.user.id), 12, 10 * 60 * 1000);
  if (wait) {
    return res.status(429).json({ error: 'Thử quá nhiều lần. Chờ ' + Math.ceil(wait / 60) + ' phút rồi nhập lại.' });
  }

  const code = q.get('SELECT * FROM codes WHERE code=?', raw);
  /* Cùng một câu trả lời cho "không có mã này" và "mã của người khác": nói
     khác nhau là để lộ mã nào có thật cho người đang dò. */
  if (!code || code.status === 'revoked') {
    logUser(req, 'user.redeem.unknown', req.user.username, { code: raw });
    return res.status(404).json({ error: 'Mã không tồn tại hoặc đã bị thu hồi. Kiểm tra lại từng ký tự nhé.' });
  }
  if (code.status === 'redeemed') {
    /* Mã của người khác thì dừng ở đây: một mã một tài khoản. */
    if (code.user_id !== req.user.id) {
      logUser(req, 'user.redeem.taken', req.user.username, { code: raw });
      return res.status(409).json({
        error: 'Mã này đã được kích hoạt ở một tài khoản khác. Mỗi mã chỉ dùng cho một tài khoản.'
      });
    }
    /* Mã của chính mình thì không phải lỗi — nhập lại mã đã dùng là chuyện
       thường (đổi máy, quên là đã kích hoạt). Trả về đúng quyền đang có và
       KHÔNG gia hạn: nếu cộng thêm tháng thì nhập lại mãi là dùng vĩnh viễn. */
    const own = PLANS.byId(code.plan_id);
    logUser(req, 'user.redeem.again', req.user.username, { code: raw });
    return res.json({
      ok: true,
      already: true,
      plan: own ? { id: own.id, name: own.name, months: own.months } : null,
      entitlement: entitlementOf(req.user.id)
    });
  }
  if (code.expires_at && code.expires_at <= nowISO()) {
    return res.status(410).json({ error: 'Mã đã quá hạn kích hoạt.' });
  }

  const plan = PLANS.byId(code.plan_id);
  if (!plan) {
    logUser(req, 'user.redeem.noplan', req.user.username, { code: raw });
    return res.status(409).json({ error: 'Mã này chưa gắn gói nào. Liên hệ trung tâm của bạn để được cấp lại.' });
  }

  /* Thời hạn tính từ LÚC KÍCH HOẠT, không phải lúc bán: mua tháng Giêng mà
     tháng Ba mới dùng thì tháng Ba mới bắt đầu đếm. */
  const start = new Date();
  const until = new Date(start);
  until.setMonth(until.getMonth() + plan.months);

  const r = q.run(
    `UPDATE codes SET status='redeemed', user_id=?, redeemed_at=?, access_expires_at=?
      WHERE id=? AND status='unused'`,
    req.user.id, start.toISOString(), until.toISOString(), code.id);
  /* Ràng buộc status='unused' ngay trong câu UPDATE: hai người bấm cùng lúc
     thì chỉ một người thắng, người kia thấy 0 dòng đổi. */
  if (!r.changes) {
    return res.status(409).json({ error: 'Mã vừa được kích hoạt ở tài khoản khác.' });
  }

  logUser(req, 'user.redeem', req.user.username, { code: raw, plan: plan.id });
  res.json({
    ok: true,
    plan: { id: plan.id, name: plan.name, months: plan.months },
    entitlement: entitlementOf(req.user.id)
  });
});

router.post('/auth/logout', A.csrfGuard, (req, res) => {
  const user = A.currentUser(req);
  if (user) logUser(req, 'user.logout', user.username);
  A.destroyUserSession(req, res);
  res.json({ ok: true });
});

/* ======================= Xác thực email ======================= */
router.post('/auth/verify/send', A.requireUser, A.csrfGuard, (req, res) => {
  if (req.user.verified) return res.json({ ok: true, alreadyVerified: true });
  const wait = A.rateLimit('verify-send|' + req.user.id, 3, 3600e3);
  if (wait) return res.status(429).json({ error: 'That has been sent a few times already. Try again in ' + Math.ceil(wait / 60) + ' minutes.' });

  const link = deliverLink('verify', req.user, A.issueToken(req.user.id, 'verify'));
  logUser(req, 'user.verify.send', req.user.username);
  res.json({ ok: true, verifyLink: link });
});

/* Không cần đăng nhập: người dùng có thể mở liên kết ở trình duyệt khác. */
router.post('/auth/verify', (req, res) => {
  const userId = A.consumeToken(str((req.body || {}).token, 400), 'verify');
  if (!userId) return bad(res, 'That verification link is invalid or has expired. Please request a new one.');
  q.run('UPDATE users SET verified=1 WHERE id=?', userId);
  const u = q.get('SELECT username FROM users WHERE id=?', userId);
  logUser(req, 'user.verify.done', u ? u.username : userId);
  res.json({ ok: true, user: profileOf(userId) });
});

/* ===================== Quên / đặt lại mật khẩu ===================== */
router.post('/auth/forgot', (req, res) => {
  const email = str((req.body || {}).email, 160).toLowerCase();
  if (!EMAIL_RE.test(email)) return bad(res, 'That email address is not valid.');

  const wait = A.rateLimit('forgot|' + (req.ip || '?'), 5, 3600e3);
  if (wait) return res.status(429).json({ error: 'You have asked for that several times. Try again in ' + Math.ceil(wait / 60) + ' minutes.' });

  const user = q.get('SELECT * FROM users WHERE lower(email)=?', email);
  let link;
  if (user && user.status === 'active') {
    link = deliverLink('reset', user, A.issueToken(user.id, 'reset'));
    logUser(req, 'user.reset.request', user.username);
  }
  // Luôn cùng một câu trả lời: không tiết lộ email nào có trong hệ thống
  res.json({ ok: true, resetLink: link });
});

router.post('/auth/reset', (req, res) => {
  const b = req.body || {};
  const password = typeof b.password === 'string' ? b.password : '';
  const pwErr = passwordProblem(password);
  if (pwErr) return bad(res, pwErr);

  const userId = A.consumeToken(str(b.token, 400), 'reset');
  if (!userId) return bad(res, 'That reset link is invalid or has expired. Please request a new one.');

  q.run('UPDATE users SET pass_hash=? WHERE id=?', A.hashPassword(password), userId);
  A.dropUserSessions(userId);                       // mọi thiết bị cũ phải đăng nhập lại
  const u = q.get('SELECT username FROM users WHERE id=?', userId);
  logUser(req, 'user.reset.done', u ? u.username : userId);
  res.json({ ok: true });
});

/* ========================= Hồ sơ học viên ========================= */
/* Thăm dò phiên: mọi trang đều gọi khi khởi động, kể cả trang công khai.
   Chưa đăng nhập trả 200 kèm user: null — không phải lỗi, và tránh việc trình
   duyệt ghi một dòng lỗi 401 ở mọi trang khách. Các route cần quyền vẫn trả 401. */
router.get('/me', (req, res) => {
  const user = A.currentUser(req);
  /* providers rides along on the boot request the pages already make, so the
     login screen knows whether to show the Google button without a second
     round trip. Returned when signed out too — that is when it is needed. */
  const providers = { google: googleAuth.enabled() };
  /* The plan catalogue rides along so the shop and every locked panel can be
     rendered from one boot request instead of a second round trip. */
  const plans = PLANS.PLANS.map(p => ({
    id: p.id, name: p.name, price: p.price, months: p.months,
    attempts: p.attempts || null, features: p.features,
    tagline: p.tagline, perks: p.perks, limits: p.limits
  }));
  if (!user) return res.set('Cache-Control', 'no-store').json({ user: null, providers, plans });
  const access = accessOf(user.id);
  res.set('Cache-Control', 'no-store').json({
    user: profileOf(user.id),
    providers,
    plans,
    entitlement: entitlementOf(user.id),
    unlockedTestIds: access.unlockedTestIds,
    unlockedFamilyIds: access.unlockedFamilyIds,
    myCodes: access.myCodes,
    orders: ordersOf(user.id)
  });
});

router.patch('/me', A.requireUser, A.csrfGuard, (req, res) => {
  const b = req.body || {};
  const name = str(b.name, 80);
  const email = str(b.email, 160).toLowerCase();
  if (!name) return bad(res, 'Please enter your full name.');
  if (!EMAIL_RE.test(email)) return bad(res, 'That email address is not valid.');

  const taken = q.get('SELECT id FROM users WHERE lower(email)=? AND id<>?', email, req.user.id);
  if (taken) return res.status(409).json({ error: 'Email này đã thuộc về tài khoản khác.' });

  // Đổi email thì phải xác thực lại địa chỉ mới
  const changedEmail = email !== req.user.email.toLowerCase();
  q.run('UPDATE users SET name=?, email=?, interests_json=?, verified=? WHERE id=?',
    name, email, JSON.stringify(cleanInterests(b.interests)),
    changedEmail ? 0 : (req.user.verified ? 1 : 0), req.user.id);

  let link;
  if (changedEmail) {
    link = deliverLink('verify', { email }, A.issueToken(req.user.id, 'verify'));
  }
  logUser(req, 'user.profile.update', req.user.username, { changedEmail });
  res.json({ ok: true, user: profileOf(req.user.id), verifyLink: link });
});

router.post('/me/password', A.requireUser, A.csrfGuard, (req, res) => {
  const b = req.body || {};
  const current = typeof b.current === 'string' ? b.current : '';
  const next = typeof b.next === 'string' ? b.next : '';
  const pwErr = passwordProblem(next);
  if (pwErr) return bad(res, pwErr);

  const key = A.throttleKey(req, 'pw:' + req.user.username);
  const lockedFor = A.isLocked(key);
  if (lockedFor) {
    return res.status(429).json({ error: 'Too many failed attempts. Try again in ' + Math.ceil(lockedFor / 60) + ' minutes.' });
  }

  const row = q.get('SELECT pass_hash FROM users WHERE id=?', req.user.id);
  if (!A.verifyPassword(current, row && row.pass_hash)) {
    A.noteFailure(key);
    return res.status(401).json({ error: 'Mật khẩu hiện tại không đúng.' });
  }

  A.clearFailures(key);
  q.run('UPDATE users SET pass_hash=? WHERE id=?', A.hashPassword(next), req.user.id);
  A.dropUserSessions(req.user.id);
  A.createUserSession(req.user.id, req, res);       // giữ thiết bị hiện tại đăng nhập
  logUser(req, 'user.password.change', req.user.username);
  res.json({ ok: true });
});

module.exports = router;
