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
 *   15-minute temporary lock. Both the count and the lock live in the database,
 *   not in process memory, so a restart does not clear them and a second instance
 *   shares them.
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

/* Secure on in production, without needing a second switch.
   It used to be `FORCE_SECURE_COOKIE === '1'` alone, so NODE_ENV=production by
   itself shipped session cookies that a browser would send over plain HTTP —
   two switches for one intention, which is how a deployment goes out unprotected
   while looking configured. Production now opts in by itself; the env var stays
   as an explicit override in both directions, '1' to force it on for a dev box
   behind a TLS proxy, '0' to force it off if a production run ever has to serve
   plain HTTP on purpose. */
function cookieIsSecure(env) {
  const forced = (env || {}).FORCE_SECURE_COOKIE;
  if (forced === '1') return true;
  if (forced === '0') return false;
  return (env || {}).NODE_ENV === 'production';
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
  if (cookieIsSecure(process.env)) bits.push('Secure');
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

/** Sweep out expired sessions and spent throttle rows (called periodically) */
function purgeSessions() {
  q.run('DELETE FROM sessions WHERE expires_at <= ?', nowISO());
  q.run('DELETE FROM user_sessions WHERE expires_at <= ?', nowISO());
  q.run('DELETE FROM user_tokens WHERE expires_at <= ?', nowISO());
  /* Throttle rows are the only table here that grows with ordinary traffic
     rather than with people, so it is the one that needs sweeping rather than
     merely tidying. The longest window any caller asks for is an hour, so two
     hours is well clear of anything still being counted. */
  q.run('DELETE FROM throttle_hits WHERE at <= ?', new Date(Date.now() - 2 * 3600e3).toISOString());
  q.run('DELETE FROM throttle_locks WHERE locked_until IS NOT NULL AND locked_until <= ?', nowISO());
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

/* --------------------------- Against guessing ---------------------------
   Both the lockout and the sliding window live in the database. They used to be
   two Maps in this process's memory, which was wrong twice over: a restart wiped
   every lockout — and a counter that forgets is a counter that helps whoever is
   guessing — and across more than one instance the lockout silently became five
   attempts PER INSTANCE.

   Reading and writing on every failed sign-in and every write request is the
   cost. It is a handful of indexed statements against a local database, which
   is the same order of cost as the scrypt verification standing next to it. */
const MAX_ATTEMPTS = 5;
const LOCK_MS = 15 * 60e3;

function throttleKey(req, username) {
  return (req.ip || '?') + '|' + String(username || '').toLowerCase();
}

/** Seconds still to wait, or 0 when not locked. Clears a lock that has run out. */
function isLocked(key) {
  const row = q.get('SELECT locked_until FROM throttle_locks WHERE bucket=?', key);
  if (!row || !row.locked_until) return 0;
  const left = Date.parse(row.locked_until) - Date.now();
  if (left > 0) return Math.ceil(left / 1000);
  q.run('DELETE FROM throttle_locks WHERE bucket=?', key);
  return 0;
}

function noteFailure(key) {
  /* One statement so two processes cannot both read 4 and both write 5. */
  q.run(`INSERT INTO throttle_locks (bucket, fails) VALUES (?, 1)
         ON CONFLICT(bucket) DO UPDATE SET fails = throttle_locks.fails + 1`, key);
  const fails = q.val('SELECT fails FROM throttle_locks WHERE bucket=?', key);
  if (fails >= MAX_ATTEMPTS) {
    q.run('UPDATE throttle_locks SET fails=0, locked_until=? WHERE bucket=?',
      new Date(Date.now() + LOCK_MS).toISOString(), key);
  }
}

function clearFailures(key) { q.run('DELETE FROM throttle_locks WHERE bucket=?', key); }

/** Every lockout, cleared. The escape hatch for an administrator locked out. */
function clearAllLocks() {
  const n = q.val('SELECT COUNT(*) c FROM throttle_locks');
  q.run('DELETE FROM throttle_locks');
  return n;
}

/* --------------------- Shared rate limiting ---------------------
   A sliding window over one row per hit. A counter column would be cheaper and
   wrong: the window has to know WHEN each hit landed, and COUNT(*) over a time
   range is race-free between processes in a way that read-modify-write on a
   shared row is not. */

/** Returns 0 while there is room, or the seconds to wait once the cap is hit. Spends one. */
function rateLimit(key, max, windowMs) {
  const wait = rateLimitPeek(key, max, windowMs);
  if (!wait) rateLimitNote(key);
  return wait;
}

/** Like rateLimit but spends NOTHING — for when only a successful action should count. */
function rateLimitPeek(key, max, windowMs) {
  const now = Date.now();
  const cutoff = new Date(now - windowMs).toISOString();
  const hits = q.val('SELECT COUNT(*) c FROM throttle_hits WHERE bucket=? AND at > ?', key, cutoff);
  if (hits < max) return 0;
  const oldest = q.val('SELECT MIN(at) m FROM throttle_hits WHERE bucket=? AND at > ?', key, cutoff);
  /* Never 0 while the cap is reached: the caller reads 0 as "go ahead", so a
     window expiring within the current second must still answer "wait 1". */
  return Math.max(1, Math.ceil((windowMs - (now - Date.parse(oldest))) / 1000));
}

/** Spend one allowance against a key. */
function rateLimitNote(key) {
  q.run('INSERT INTO throttle_hits (bucket, at) VALUES (?,?)', key, nowISO());
}

/* ---------------------- Second factor, admin side ----------------------
   The engine is in server/totp.js, checked against the RFC 6238 vectors. What
   lives here is the part that touches accounts: whether one is enrolled, and
   the recovery codes that stop enrolment from being a way to lock yourself out
   of your own platform for ever. */
const totp = require('./totp');

const totpEnabled = admin => !!(admin && admin.totp_secret && admin.totp_enabled_at);

/**
 * Check a submitted second factor against an administrator row.
 *
 * Returns 'totp', 'recovery', or null. A successful TOTP burns its counter so
 * the same code cannot be presented twice within its 30-second life; a
 * successful recovery code is spent outright.
 */
function verifySecondFactor(admin, submitted) {
  const code = String(submitted || '').replace(/[\s-]/g, '');
  if (!code) return null;

  const counter = totp.verify(admin.totp_secret, code, { lastCounter: admin.totp_last_counter });
  if (counter !== null) {
    q.run('UPDATE admins SET totp_last_counter=? WHERE id=?', counter, admin.id);
    return 'totp';
  }

  /* Recovery codes are longer than six digits, so a TOTP attempt never
     accidentally consumes one and the two never collide. */
  const row = q.get(
    'SELECT code_hash FROM admin_recovery_codes WHERE admin_id=? AND code_hash=? AND used_at IS NULL',
    admin.id, sha256(code.toUpperCase()));
  if (row) {
    q.run('UPDATE admin_recovery_codes SET used_at=? WHERE code_hash=?', nowISO(), row.code_hash);
    return 'recovery';
  }
  return null;
}

/** Mint a fresh set of recovery codes, replacing any that are left. Returns them once. */
function issueRecoveryCodes(adminId, howMany = 10) {
  q.run('DELETE FROM admin_recovery_codes WHERE admin_id=?', adminId);
  const codes = [];
  for (let i = 0; i < howMany; i++) {
    /* Base32 alphabet, so nothing reads as both a letter and a digit when it is
       copied off a screen by hand at the worst possible moment. */
    const raw = totp.base32Encode(crypto.randomBytes(10)).slice(0, 16);
    const shown = raw.slice(0, 4) + '-' + raw.slice(4, 8) + '-' + raw.slice(8, 12) + '-' + raw.slice(12, 16);
    codes.push(shown);
    q.run('INSERT INTO admin_recovery_codes (code_hash, admin_id, created_at) VALUES (?,?,?)',
      sha256(raw), adminId, nowISO());
  }
  return codes;
}

const recoveryCodesLeft = adminId =>
  q.val('SELECT COUNT(*) c FROM admin_recovery_codes WHERE admin_id=? AND used_at IS NULL', adminId);

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
const DEV_DEFAULT_PASSWORD = 'Admin@123456';

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
    '  (forgotten the password? run: node scripts/accounts.js reset-admin)');
}

module.exports = {
  hashPassword, verifyPassword,
  parseCookies, setCookie, cookieIsSecure,
  createSession, destroySession, currentAdmin, purgeSessions,
  createUserSession, destroyUserSession, dropUserSessions, currentUser, requireUser,
  ensureCsrfCookie,
  throttleKey, isLocked, noteFailure, clearFailures, clearAllLocks,
  totpEnabled, verifySecondFactor, issueRecoveryCodes, recoveryCodesLeft,
  rateLimit, rateLimitPeek, rateLimitNote,
  issueToken, consumeToken,
  requireAdmin, requireOwner, csrfGuard,
  ensureSeedAdmin, ensureDemoStudent, reportAdminAccounts,
  DEV_DEFAULT_PASSWORD, DEMO_STUDENT_PASSWORD
};
