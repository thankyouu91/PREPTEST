/**
 * Authentication, and the guards around the admin area.
 *
 * - Passwords: scrypt (in Node already, so no native bcrypt) plus a random salt,
 *   compared with timingSafeEqual.
 * - Sessions: a random 32-byte token in an HttpOnly cookie; the database keeps only
 *   the token's HASH, so a leaked database cannot reconstruct a cookie.
 * - CSRF: double-submit. The prep_csrf cookie (readable by JS) must match the
 *   X-CSRF-Token header on every state-changing request.
 * - Against password guessing: failures are counted per IP and per account, with a
 *   15-minute temporary lock.
 */
'use strict';
const crypto = require('crypto');
const { q, nowISO, audit } = require('./db');

const SESSION_HOURS = 8;
const SCRYPT = { N: 16384, r: 8, p: 1, keylen: 64 };

/* ----------------------------- Passwords ----------------------------- */
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

/**
 * Should session cookies carry Secure?
 *
 * Yes in production, without anyone having to remember an environment variable
 * — a session cookie that can travel over plain HTTP is the kind of mistake
 * that is invisible until it matters. Cloud Run terminates TLS in front of the
 * container, so every real request arrives over HTTPS anyway.
 *
 * FORCE_SECURE_COOKIE stays as the explicit override in both directions: '1'
 * turns it on outside production, '0' turns it off for the rare case of running
 * a production build behind plain HTTP on a private network.
 */
function secureCookies() {
  const flag = process.env.FORCE_SECURE_COOKIE;
  if (flag === '1') return true;
  if (flag === '0') return false;
  return process.env.NODE_ENV === 'production';
}

function setCookie(res, name, value, opts) {
  opts = opts || {};
  /* Strict by default. The one caller that overrides it is the OAuth state
     cookie: a Strict cookie is withheld when the browser comes back from
     Google, which is a cross-site navigation, so that flow needs Lax. */
  const sameSite = opts.sameSite === 'Lax' ? 'Lax' : 'Strict';
  const bits = [`${name}=${encodeURIComponent(value)}`, 'Path=/', `SameSite=${sameSite}`];
  if (opts.httpOnly !== false) bits.push('HttpOnly');
  if (opts.maxAge != null) bits.push('Max-Age=' + opts.maxAge);
  if (secureCookies()) bits.push('Secure');
  const prev = res.getHeader('Set-Cookie');
  const list = prev ? (Array.isArray(prev) ? prev.slice() : [prev]) : [];
  list.push(bits.join('; '));
  res.setHeader('Set-Cookie', list);
}

/* ------------------------------ Sessions ------------------------------ */
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
  if (row.expires_at <= nowISO()) {                 // an expired session is cleared out on sight
    q.run('DELETE FROM sessions WHERE token_hash=?', sha256(token));
    return null;
  }
  return { id: row.id, username: row.username, name: row.name, role: row.role };
}

/** Sweep out expired sessions (called periodically) */
function purgeSessions() {
  q.run('DELETE FROM sessions WHERE expires_at <= ?', nowISO());
  q.run('DELETE FROM user_sessions WHERE expires_at <= ?', nowISO());
  q.run('DELETE FROM user_tokens WHERE expires_at <= ?', nowISO());
}

/* --------------------------- Student sessions ---------------------------
   A cookie of its own (prep_user) and a table of its own (user_sessions), so the
   student area and the admin area can never pick up each other's session. Same
   mechanism: a 32-byte token, only its hash stored, HttpOnly + SameSite=Strict. */
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

/* Every HTML page carries a CSRF token, whether or not anybody is signed in.

   It used to be minted only on a successful sign-in, which left a guest with
   nothing to double-submit — so register, both sign-ins, forgot, reset and
   verify all had to sit outside csrfGuard and be declared as exceptions. Those
   endpoints were not actually reachable cross-site (express.json() refuses a
   form body, and a JSON body needs a CORS preflight this server never answers),
   but that is an accident of two unrelated choices rather than a guard. Adding
   express.urlencoded() one day, or a CORS header for a mobile client, would
   quietly turn the accident into a hole.

   The token is not an authenticator, so a long life costs nothing; it matches
   the user session so a tab left open overnight still submits. Signing in
   rotates it, which is what stops a token planted before sign-in from being
   carried into the session. */
function ensureCsrfCookie(req, res) {
  if (parseCookies(req).prep_csrf) return false;
  setCookie(res, 'prep_csrf', crypto.randomBytes(24).toString('base64url'),
    { httpOnly: false, maxAge: USER_SESSION_DAYS * 86400 });
  return true;
}

function destroyUserSession(req, res) {
  const token = parseCookies(req).prep_user;
  if (token) q.run('DELETE FROM user_sessions WHERE token_hash=?', sha256(token));
  setCookie(res, 'prep_user', '', { maxAge: 0 });
  setCookie(res, 'prep_csrf', '', { httpOnly: false, maxAge: 0 });
}

/** Sign out every device — used after a password change or reset */
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
  if (row.status !== 'active') return null;        // a locked account voids the session
  return {
    id: row.id, username: row.username, email: row.email, name: row.name,
    verified: !!row.verified, interests: JSON.parse(row.interests_json || '[]')
  };
}

function requireUser(req, res, next) {
  const user = currentUser(req);
  if (!user) return res.status(401).json({ error: 'Not signed in, or the session has expired.' });
  req.user = user;
  next();
}

/* --------------------------- Against guessing --------------------------- */
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

/* --------------------- Shared rate limiting ---------------------
   A sliding-window counter in process memory: enough for a single process.
   // TODO(scale): move to a shared store if this ever runs as several processes. */
const buckets = new Map();           // key → { hits: [timestamp…] }

/** Returns 0 while there is room, or the seconds to wait once the cap is hit. Spends one. */
function rateLimit(key, max, windowMs) {
  const wait = rateLimitPeek(key, max, windowMs);
  if (!wait) rateLimitNote(key);
  return wait;
}

/** Like rateLimit but spends NOTHING — for when only a successful action should count. */
function rateLimitPeek(key, max, windowMs) {
  const now = Date.now();
  const b = buckets.get(key) || { hits: [], windowMs };
  b.windowMs = windowMs;
  b.hits = b.hits.filter(t => now - t < windowMs);
  buckets.set(key, b);
  return b.hits.length >= max ? Math.ceil((windowMs - (now - b.hits[0])) / 1000) : 0;
}

/** Spend one allowance against a key. */
function rateLimitNote(key) {
  const b = buckets.get(key) || { hits: [] };
  b.hits.push(Date.now());
  buckets.set(key, b);
}

/* ------------------ Single-use tokens sent by email ------------------ */
const TOKEN_HOURS = { verify: 48, reset: 2 };

/** Mint a token for a user; returns the raw string (this once), the database keeps its hash. */
function issueToken(userId, kind) {
  const hours = TOKEN_HOURS[kind] || 2;
  const token = crypto.randomBytes(32).toString('base64url');
  q.run('DELETE FROM user_tokens WHERE user_id=? AND kind=? AND used_at IS NULL', userId, kind);
  q.run('INSERT INTO user_tokens (token_hash, user_id, kind, created_at, expires_at) VALUES (?,?,?,?,?)',
    sha256(token), userId, kind, nowISO(), new Date(Date.now() + hours * 3600e3).toISOString());
  return token;
}

/** Exchange a token for a user_id and mark it used. Returns null if wrong, expired or spent. */
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
  if (!admin) return res.status(401).json({ error: 'Not signed in, or the session has expired.' });
  req.admin = admin;
  next();
}

function requireOwner(req, res, next) {
  if (!req.admin || req.admin.role !== 'owner') {
    return res.status(403).json({ error: 'Only the owner account can do that.' });
  }
  next();
}

/** Check CSRF on every state-changing method */
function csrfGuard(req, res, next) {
  if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) return next();
  const cookie = parseCookies(req).prep_csrf;
  const header = req.headers['x-csrf-token'];
  if (!cookie || !header || cookie !== header) {
    return res.status(403).json({ error: 'Invalid CSRF token. Reload the page and try again.' });
  }
  next();
}

/* --------------------- The seed administrator account --------------------- */
/* Set by the owner. README, deploy/README.md and this constant must agree:
   whenever they do not, somebody types the documented password and is refused,
   which is the bug ensureDevAdminPassword() below exists to prevent. */
const DEV_DEFAULT_PASSWORD = 'Goodmorning01';

function ensureSeedAdmin() {
  if (q.val('SELECT COUNT(*) c FROM admins')) return null;

  const envPw = process.env.ADMIN_PASSWORD;
  const isProd = process.env.NODE_ENV === 'production';
  if (isProd && !envPw) {
    throw new Error(
      'No administrator account exists. In production, ADMIN_PASSWORD must be set before the first run.'
    );
  }
  const username = process.env.ADMIN_USERNAME || 'admin';
  const password = envPw || DEV_DEFAULT_PASSWORD;

  q.run('INSERT INTO admins (username,name,pass_hash,role,active,created_at) VALUES (?,?,?,?,1,?)',
    username, process.env.ADMIN_NAME || 'Administrator', hashPassword(password), 'owner', nowISO());
  audit(null, 'admin.seed', 'admins/' + username, { source: envPw ? 'env' : 'default-dev' });

  if (!envPw) {
    console.warn(
      '\n⚠  Seed administrator account: ' + username + ' / ' + password +
      '\n   This default password is for local runs ONLY. Set ADMIN_PASSWORD (and change the' +
      '\n   password under Administration) before this goes anywhere real.\n'
    );
  }
  return { username, password: envPw ? null : password };
}

/* ------------- The seed administrator's password in development -------------
   ensureSeedAdmin() above only runs while the admins table is empty. That means
   editing DEV_DEFAULT_PASSWORD cannot reach a database that already exists: a
   user pulls the new code, reads the README, types the password written there,
   and is refused — while both the code and the documentation say the password
   is the one they just typed.

   This is exactly the fault the demo student account had, and which is fixed
   immediately below. The administrator account was missed, so it is handled
   here the same way: outside production, every boot pulls the seed
   administrator back to the state the documentation describes, and prints a
   line when it actually had to.

   Three things this deliberately does not touch:
   - production: the password there is ADMIN_PASSWORD's, never the default
   - an explicitly set ADMIN_PASSWORD: the operator has already decided
   - any other administrator account: only the seeded username is pulled back

   The trade-off is real. Change this account's password in the dashboard
   during development and the next boot puts it back. For an account whose
   password is printed in the README, drifting from the documentation is the
   worse fault — and anyone wanting their own password sets ADMIN_PASSWORD,
   which takes this function out of the loop entirely. */
function ensureDevAdminPassword() {
  if (process.env.NODE_ENV === 'production') return false;
  if (process.env.ADMIN_PASSWORD) return false;

  const username = process.env.ADMIN_USERNAME || 'admin';
  const a = q.get('SELECT id, pass_hash, active FROM admins WHERE username=?', username);
  if (!a) return false;

  const matches = a.pass_hash && verifyPassword(DEV_DEFAULT_PASSWORD, a.pass_hash);
  if (matches && a.active === 1) return false;

  q.run('UPDATE admins SET pass_hash=?, active=1 WHERE id=?',
    hashPassword(DEV_DEFAULT_PASSWORD), a.id);
  /* Existing sessions were issued under the old password; revoke them so this
     matches what `node scripts/tai-khoan.js dat-lai-admin` does. */
  q.run('DELETE FROM sessions WHERE admin_id=?', a.id);

  console.warn(
    '\n⚠  The administrator account had drifted from the documentation; reset to:' +
    '\n   ' + username + ' / ' + DEV_DEFAULT_PASSWORD +
    '\n   (development only; set ADMIN_PASSWORD for your own password)\n'
  );
  return true;
}

/* ------------- The demo student account -------------
   The seed creates user 'student' with no password. Outside production a demo
   password is set so the sign-in flow can be exercised; in production it stays
   empty, so nobody can sign in to the sample account.

   This function once only set the password when pass_hash was empty, so the
   moment the password drifted from the README — changed by hand, or by an old
   test run — it stayed wrong forever and said nothing, and someone following
   the README simply could not sign in. Now, outside production, every boot
   pulls the demo account back to what the documentation says and prints a line
   only when something actually changed.

   The display name is reconciled for the same reason, not for tidiness: it is
   seeded once, it shows in the chrome greeting on every signed-in screen, and
   an existing data/prep.sqlite would otherwise keep the old value forever no
   matter what the seed says. */
const DEMO_STUDENT_PASSWORD = 'Goodmorning01';
const DEMO_STUDENT_NAME = 'Demo Student';

function ensureDemoStudent() {
  if (process.env.NODE_ENV === 'production') return false;
  const u = q.get("SELECT id, pass_hash, verified, status, name FROM users WHERE username='student'");
  if (!u) return false;

  const passwordOk = u.pass_hash && verifyPassword(DEMO_STUDENT_PASSWORD, u.pass_hash);
  const stateOk = u.verified === 1 && u.status === 'active';
  const nameOk = u.name === DEMO_STUDENT_NAME;
  if (passwordOk && stateOk && nameOk) return false;

  q.run("UPDATE users SET pass_hash=?, verified=1, status='active', name=? WHERE id=?",
    hashPassword(DEMO_STUDENT_PASSWORD), DEMO_STUDENT_NAME, u.id);
  console.warn(
    '\n⚠  The demo student account had drifted from the documentation and was reset:' +
    '\n   student / ' + DEMO_STUDENT_PASSWORD +
    '\n   (outside production only; set NODE_ENV=production to disable the demo account entirely)\n'
  );
  return true;
}

/** Remind the operator which administrator accounts exist, so nobody is left guessing.
    Prints NAMES only, never passwords — the database holds hashes, so it could not anyway. */
function reportAdminAccounts() {
  if (process.env.NODE_ENV === 'production') return;
  const admins = q.all('SELECT username FROM admins WHERE active=1 ORDER BY id');
  if (!admins.length) return;
  console.log('   · Admin:  ' + admins.map(a => a.username).join(', ') +
    '  (forgotten the password? run: node scripts/tai-khoan.js dat-lai-admin)');
}

module.exports = {
  hashPassword, verifyPassword,
  parseCookies, setCookie,
  createSession, destroySession, currentAdmin, purgeSessions,
  createUserSession, destroyUserSession, dropUserSessions, currentUser, requireUser,
  ensureCsrfCookie,
  throttleKey, isLocked, noteFailure, clearFailures,
  rateLimit, rateLimitPeek, rateLimitNote,
  issueToken, consumeToken,
  requireAdmin, requireOwner, csrfGuard,
  ensureSeedAdmin, ensureDevAdminPassword, ensureDemoStudent, reportAdminAccounts,
  DEV_DEFAULT_PASSWORD, DEMO_STUDENT_PASSWORD
};
