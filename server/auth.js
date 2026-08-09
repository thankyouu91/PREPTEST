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
const DEV_DEFAULT_PASSWORD = 'Admin@123456';

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

module.exports = {
  hashPassword, verifyPassword,
  parseCookies, setCookie,
  createSession, destroySession, currentAdmin, purgeSessions,
  throttleKey, isLocked, noteFailure, clearFailures,
  requireAdmin, requireOwner, csrfGuard,
  ensureSeedAdmin, DEV_DEFAULT_PASSWORD
};
