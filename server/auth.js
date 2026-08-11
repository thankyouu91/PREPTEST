/**
 * Xác thực và bảo vệ khu vực quản trị.
 *
 * - Mật khẩu: scrypt (có trong Node, không cần bcrypt native) + salt ngẫu nhiên,
 *   so khớp bằng timingSafeEqual.
 * - Phiên: token ngẫu nhiên 32 byte gửi qua cookie HttpOnly; DB chỉ lưu BẢN BĂM
 *   của token, nên rò rỉ DB không tái tạo được cookie.
 * - CSRF: double-submit. Cookie prep_csrf (JS đọc được) phải trùng header
 *   X-CSRF-Token ở mọi request thay đổi dữ liệu.
 * - Chống dò mật khẩu: đếm số lần sai theo IP và theo tài khoản, khoá tạm 15 phút.
 */
'use strict';
const crypto = require('crypto');
const { q, nowISO, audit } = require('./db');

const SESSION_HOURS = 8;
const SCRYPT = { N: 16384, r: 8, p: 1, keylen: 64 };

/* ----------------------------- Mật khẩu ----------------------------- */
function hashPassword(pw) {
  const salt = crypto.randomBytes(16);
  const key = crypto.scryptSync(pw, salt, SCRYPT.keylen, { N: SCRYPT.N, r: SCRYPT.r, p: SCRYPT.p });
  return ['scrypt', SCRYPT.N, SCRYPT.r, SCRYPT.p, salt.toString('base64'), key.toString('base64')].join('$');
}

function verifyPassword(pw, stored) {
  if (!stored) return false;
  const [alg, N, r, p, saltB64, keyB64] = String(stored).split('$');
  if (alg !== 'scrypt') return false;
  const salt = Buffer.from(saltB64, 'base64');
  const expected = Buffer.from(keyB64, 'base64');
  let actual;
  try {
    actual = crypto.scryptSync(pw, salt, expected.length, { N: +N, r: +r, p: +p });
  } catch (e) { return false; }
  return actual.length === expected.length && crypto.timingSafeEqual(actual, expected);
}

/* ------------------------------ Cookie ------------------------------ */
function parseCookies(req) {
  const out = {};
  const raw = req.headers.cookie;
  if (!raw) return out;
  for (const part of raw.split(';')) {
    const i = part.indexOf('=');
    if (i < 0) continue;
    out[part.slice(0, i).trim()] = decodeURIComponent(part.slice(i + 1).trim());
  }
  return out;
}

function setCookie(res, name, value, opts) {
  opts = opts || {};
  const bits = [`${name}=${encodeURIComponent(value)}`, 'Path=/', 'SameSite=Strict'];
  if (opts.httpOnly !== false) bits.push('HttpOnly');
  if (opts.maxAge != null) bits.push('Max-Age=' + opts.maxAge);
  if (process.env.FORCE_SECURE_COOKIE === '1') bits.push('Secure');
  const prev = res.getHeader('Set-Cookie');
  const list = prev ? (Array.isArray(prev) ? prev.slice() : [prev]) : [];
  list.push(bits.join('; '));
  res.setHeader('Set-Cookie', list);
}

/* ------------------------------ Phiên ------------------------------ */
const sha256 = s => crypto.createHash('sha256').update(s).digest('hex');

function createSession(adminId, req, res) {
  const token = crypto.randomBytes(32).toString('base64url');
  const expires = new Date(Date.now() + SESSION_HOURS * 3600e3).toISOString();
  q.run('INSERT INTO sessions (token_hash, admin_id, created_at, expires_at, ip, ua) VALUES (?,?,?,?,?,?)',
    sha256(token), adminId, nowISO(), expires, req.ip || null, (req.headers['user-agent'] || '').slice(0, 200));
  setCookie(res, 'prep_admin', token, { maxAge: SESSION_HOURS * 3600 });
  setCookie(res, 'prep_csrf', crypto.randomBytes(24).toString('base64url'),
    { httpOnly: false, maxAge: SESSION_HOURS * 3600 });
  return token;
}

function destroySession(req, res) {
  const token = parseCookies(req).prep_admin;
  if (token) q.run('DELETE FROM sessions WHERE token_hash=?', sha256(token));
  setCookie(res, 'prep_admin', '', { maxAge: 0 });
  setCookie(res, 'prep_csrf', '', { httpOnly: false, maxAge: 0 });
}

function currentAdmin(req) {
  const token = parseCookies(req).prep_admin;
  if (!token) return null;
  const row = q.get(
    `SELECT a.id, a.username, a.name, a.role, s.expires_at
       FROM sessions s JOIN admins a ON a.id = s.admin_id
      WHERE s.token_hash = ? AND a.active = 1`, sha256(token));
  if (!row) return null;
  if (row.expires_at <= nowISO()) {                 // phiên hết hạn thì dọn luôn
    q.run('DELETE FROM sessions WHERE token_hash=?', sha256(token));
    return null;
  }
  return { id: row.id, username: row.username, name: row.name, role: row.role };
}

/** Dọn phiên hết hạn (gọi định kỳ) */
function purgeSessions() {
  q.run('DELETE FROM sessions WHERE expires_at <= ?', nowISO());
  q.run('DELETE FROM user_sessions WHERE expires_at <= ?', nowISO());
  q.run('DELETE FROM user_tokens WHERE expires_at <= ?', nowISO());
}

/* --------------------------- Phiên học viên ---------------------------
   Cookie riêng (prep_user) và bảng riêng (user_sessions) để khu học viên và
   khu quản trị không bao giờ dùng nhầm phiên của nhau. Cùng cơ chế: token 32
   byte, DB chỉ giữ bản băm, cookie HttpOnly + SameSite=Strict.            */
const USER_SESSION_DAYS = 14;

function createUserSession(userId, req, res) {
  const token = crypto.randomBytes(32).toString('base64url');
  const maxAge = USER_SESSION_DAYS * 86400;
  const expires = new Date(Date.now() + maxAge * 1000).toISOString();
  q.run('INSERT INTO user_sessions (token_hash, user_id, created_at, expires_at, ip, ua) VALUES (?,?,?,?,?,?)',
    sha256(token), userId, nowISO(), expires, req.ip || null, (req.headers['user-agent'] || '').slice(0, 200));
  setCookie(res, 'prep_user', token, { maxAge });
  setCookie(res, 'prep_csrf', crypto.randomBytes(24).toString('base64url'), { httpOnly: false, maxAge });
  return token;
}

function destroyUserSession(req, res) {
  const token = parseCookies(req).prep_user;
  if (token) q.run('DELETE FROM user_sessions WHERE token_hash=?', sha256(token));
  setCookie(res, 'prep_user', '', { maxAge: 0 });
  setCookie(res, 'prep_csrf', '', { httpOnly: false, maxAge: 0 });
}

/** Đăng xuất mọi thiết bị — dùng sau khi đổi hoặc đặt lại mật khẩu */
function dropUserSessions(userId) {
  q.run('DELETE FROM user_sessions WHERE user_id=?', userId);
}

function currentUser(req) {
  const token = parseCookies(req).prep_user;
  if (!token) return null;
  const row = q.get(
    `SELECT u.id, u.username, u.email, u.name, u.verified, u.status, u.interests_json, s.expires_at
       FROM user_sessions s JOIN users u ON u.id = s.user_id
      WHERE s.token_hash = ?`, sha256(token));
  if (!row) return null;
  if (row.expires_at <= nowISO()) {
    q.run('DELETE FROM user_sessions WHERE token_hash=?', sha256(token));
    return null;
  }
  if (row.status !== 'active') return null;        // tài khoản bị khoá thì phiên hết giá trị
  return {
    id: row.id, username: row.username, email: row.email, name: row.name,
    verified: !!row.verified, interests: JSON.parse(row.interests_json || '[]')
  };
}

function requireUser(req, res, next) {
  const user = currentUser(req);
  if (!user) return res.status(401).json({ error: 'Chưa đăng nhập hoặc phiên đã hết hạn.' });
  req.user = user;
  next();
}

/* --------------------------- Chống dò mã --------------------------- */
const attempts = new Map();          // key → { n, until }
const MAX_ATTEMPTS = 5;
const LOCK_MS = 15 * 60e3;

function throttleKey(req, username) {
  return (req.ip || '?') + '|' + String(username || '').toLowerCase();
}
function isLocked(key) {
  const a = attempts.get(key);
  if (!a) return 0;
  if (a.until && a.until > Date.now()) return Math.ceil((a.until - Date.now()) / 1000);
  if (a.until && a.until <= Date.now()) attempts.delete(key);
  return 0;
}
function noteFailure(key) {
  const a = attempts.get(key) || { n: 0, until: 0 };
  a.n++;
  if (a.n >= MAX_ATTEMPTS) { a.until = Date.now() + LOCK_MS; a.n = 0; }
  attempts.set(key, a);
}
function clearFailures(key) { attempts.delete(key); }

/* --------------------- Giới hạn tần suất chung ---------------------
   Bộ đếm cửa sổ trượt trong bộ nhớ tiến trình: đủ cho một tiến trình đơn.
   // TODO(scale): chuyển sang kho dùng chung nếu chạy nhiều tiến trình. */
const buckets = new Map();           // key → { hits: [timestamp…] }

/** Trả 0 nếu còn lượt, hoặc số giây phải chờ nếu đã chạm trần. Có trừ lượt. */
function rateLimit(key, max, windowMs) {
  const wait = rateLimitPeek(key, max, windowMs);
  if (!wait) rateLimitNote(key);
  return wait;
}

/** Như rateLimit nhưng KHÔNG trừ lượt — dùng khi chỉ muốn trừ lúc thao tác thành công. */
function rateLimitPeek(key, max, windowMs) {
  const now = Date.now();
  const b = buckets.get(key) || { hits: [], windowMs };
  b.windowMs = windowMs;
  b.hits = b.hits.filter(t => now - t < windowMs);
  buckets.set(key, b);
  return b.hits.length >= max ? Math.ceil((windowMs - (now - b.hits[0])) / 1000) : 0;
}

/** Trừ một lượt của khoá. */
function rateLimitNote(key) {
  const b = buckets.get(key) || { hits: [] };
  b.hits.push(Date.now());
  buckets.set(key, b);
}

/* ------------------ Token dùng một lần gửi qua email ------------------ */
const TOKEN_HOURS = { verify: 48, reset: 2 };

/** Sinh token cho user; trả chuỗi thô (chỉ lần này), DB giữ bản băm. */
function issueToken(userId, kind) {
  const hours = TOKEN_HOURS[kind] || 2;
  const token = crypto.randomBytes(32).toString('base64url');
  q.run('DELETE FROM user_tokens WHERE user_id=? AND kind=? AND used_at IS NULL', userId, kind);
  q.run('INSERT INTO user_tokens (token_hash, user_id, kind, created_at, expires_at) VALUES (?,?,?,?,?)',
    sha256(token), userId, kind, nowISO(), new Date(Date.now() + hours * 3600e3).toISOString());
  return token;
}

/** Đổi token lấy user_id và đánh dấu đã dùng. Trả null nếu sai/hết hạn/đã dùng. */
function consumeToken(token, kind) {
  if (!token) return null;
  const hash = sha256(String(token));
  const row = q.get('SELECT * FROM user_tokens WHERE token_hash=? AND kind=?', hash, kind);
  if (!row || row.used_at || row.expires_at <= nowISO()) return null;
  q.run('UPDATE user_tokens SET used_at=? WHERE token_hash=?', nowISO(), hash);
  return row.user_id;
}

/* ------------------------------ Middleware ------------------------------ */
function requireAdmin(req, res, next) {
  const admin = currentAdmin(req);
  if (!admin) return res.status(401).json({ error: 'Chưa đăng nhập hoặc phiên đã hết hạn.' });
  req.admin = admin;
  next();
}

function requireOwner(req, res, next) {
  if (!req.admin || req.admin.role !== 'owner') {
    return res.status(403).json({ error: 'Chỉ chủ tài khoản quản trị mới làm được việc này.' });
  }
  next();
}

/** Kiểm CSRF cho mọi phương thức thay đổi dữ liệu */
function csrfGuard(req, res, next) {
  if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) return next();
  const cookie = parseCookies(req).prep_csrf;
  const header = req.headers['x-csrf-token'];
  if (!cookie || !header || cookie !== header) {
    return res.status(403).json({ error: 'Token CSRF không hợp lệ. Tải lại trang rồi thử lại.' });
  }
  next();
}

/* --------------------- Tài khoản quản trị khởi tạo --------------------- */
const DEV_DEFAULT_PASSWORD = 'Goodmorning01';

function ensureSeedAdmin() {
  if (q.val('SELECT COUNT(*) c FROM admins')) return null;

  const envPw = process.env.ADMIN_PASSWORD;
  const isProd = process.env.NODE_ENV === 'production';
  if (isProd && !envPw) {
    throw new Error(
      'Chưa có tài khoản quản trị. Ở môi trường production phải đặt biến ADMIN_PASSWORD trước khi chạy lần đầu.'
    );
  }
  const username = process.env.ADMIN_USERNAME || 'admin';
  const password = envPw || DEV_DEFAULT_PASSWORD;

  q.run('INSERT INTO admins (username,name,pass_hash,role,active,created_at) VALUES (?,?,?,?,1,?)',
    username, process.env.ADMIN_NAME || 'Quản trị viên', hashPassword(password), 'owner', nowISO());
  audit(null, 'admin.seed', 'admins/' + username, { source: envPw ? 'env' : 'default-dev' });

  if (!envPw) {
    console.warn(
      '\n⚠  Tài khoản quản trị khởi tạo: ' + username + ' / ' + password +
      '\n   Mật khẩu mặc định này CHỈ dùng để chạy thử. Đặt ADMIN_PASSWORD (và đổi mật khẩu' +
      '\n   trong mục Quản trị) trước khi đưa lên môi trường thật.\n'
    );
  }
  return { username, password: envPw ? null : password };
}

/* ------------- Mật khẩu cho tài khoản học viên demo -------------
   Bản seed tạo user 'student' không có mật khẩu. Ngoài production, đặt sẵn
   mật khẩu demo để thử luồng đăng nhập; ở production để trống nên không ai
   đăng nhập được vào tài khoản mẫu.

   Trước đây hàm này chỉ đặt mật khẩu khi ô pass_hash còn trống, nên hễ mật khẩu
   bị đổi một lần (đổi tay, hoặc một lần chạy thử cũ) là nó lệch khỏi README
   vĩnh viễn mà không báo gì — người dùng đọc README rồi đăng nhập không được.
   Nay ngoài production thì mỗi lần khởi động đều kéo tài khoản demo về đúng
   trạng thái tài liệu ghi, và in ra một dòng khi thật sự có sửa. */
const DEMO_STUDENT_PASSWORD = 'Goodmorning01';

function ensureDemoStudentPassword() {
  if (process.env.NODE_ENV === 'production') return false;
  const u = q.get("SELECT id, pass_hash, verified, status FROM users WHERE username='student'");
  if (!u) return false;

  const dungMatKhau = u.pass_hash && verifyPassword(DEMO_STUDENT_PASSWORD, u.pass_hash);
  const dungTrangThai = u.verified === 1 && u.status === 'active';
  if (dungMatKhau && dungTrangThai) return false;

  q.run("UPDATE users SET pass_hash=?, verified=1, status='active' WHERE id=?",
    hashPassword(DEMO_STUDENT_PASSWORD), u.id);
  console.warn(
    '\n⚠  Tài khoản học viên demo đã lệch khỏi tài liệu, đã đặt lại:' +
    '\n   student / ' + DEMO_STUDENT_PASSWORD +
    '\n   (chỉ chạy ngoài production; đặt NODE_ENV=production để tắt hẳn tài khoản demo)\n'
  );
  return true;
}

/** Nhắc lại tài khoản quản trị đang có, để người dùng không mò trong bóng tối.
    Chỉ in TÊN, không in mật khẩu — CSDL chỉ lưu bản băm nên cũng không đọc được. */
function reportAdminAccounts() {
  if (process.env.NODE_ENV === 'production') return;
  const admins = q.all('SELECT username FROM admins WHERE active=1 ORDER BY id');
  if (!admins.length) return;
  console.log('   · Quản trị:  ' + admins.map(a => a.username).join(', ') +
    '  (quên mật khẩu? chạy: node scripts/tai-khoan.js dat-lai-admin)');
}

module.exports = {
  hashPassword, verifyPassword,
  parseCookies, setCookie,
  createSession, destroySession, currentAdmin, purgeSessions,
  createUserSession, destroyUserSession, dropUserSessions, currentUser, requireUser,
  throttleKey, isLocked, noteFailure, clearFailures,
  rateLimit, rateLimitPeek, rateLimitNote,
  issueToken, consumeToken,
  requireAdmin, requireOwner, csrfGuard,
  ensureSeedAdmin, ensureDemoStudentPassword, reportAdminAccounts,
  DEV_DEFAULT_PASSWORD, DEMO_STUDENT_PASSWORD
};
