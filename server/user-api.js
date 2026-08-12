/**
 * The student account API — /api/auth/… and /api/me.
 *
 * Security rules:
 * - Passwords are hashed with scrypt as on the admin side, and never sent to the client.
 * - Sessions ride a prep_user HttpOnly + SameSite=Strict cookie; the database keeps only the token hash.
 * - Every state-changing route on a signed-in session goes through csrfGuard.
 *   register/login/forgot/reset have no session yet, so they skip the CSRF check
 *   (as /api/admin/login does): a SameSite=Strict cookie plus a required JSON body
 *   means a cross-site form cannot build a valid request.
 * - Never reveal which emails are registered: forgot-password always answers the same way.
 * - Against guessing: sign-in locks temporarily per IP + account; registration and
 *   resends are rate-limited per IP.
 *
 * Email: no mail service is wired in yet. Verification / reset links are written to
 * the server console, and ONLY outside production are they returned in the response
 * so the flow can be exercised.
 * // TODO(backend/mail): wire up SMTP or a mail service, and drop devLink from the response.
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

/* ============================ Helpers ============================ */
const bad = (res, msg) => res.status(400).json({ error: msg });
const str = (v, max) => (typeof v === 'string' ? v.trim().slice(0, max || 200) : '');
const isProd = () => process.env.NODE_ENV === 'production';

/** Accounts creatable per hour from one address. See the note at /auth/register. */
const REGISTER_PER_HOUR = Math.max(1, parseInt(process.env.REGISTER_PER_HOUR, 10) || 5);
/* Same escape hatch, same reason: every full run of the interface suite asks for
   one password-reset link, and five an hour means the suite cannot be run six
   times in an hour — which is exactly what anybody chasing a flaky test does.
   The default is unchanged; only scripts/verify.sh raises it. */
const FORGOT_PER_HOUR = Math.max(1, parseInt(process.env.FORGOT_PER_HOUR, 10) || 5);
/* And the third of the same kind. Twelve redemptions per ten minutes is right
   for a real account; the interface suite spends one per run against the demo
   student, so a dozen runs in ten minutes exhausts it. Default unchanged. */
const REDEEM_PER_10MIN = Math.max(1, parseInt(process.env.REDEEM_PER_10MIN, 10) || 12);

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

/** Log a student's action (no administrator is involved) */
function logUser(req, action, username, meta) {
  audit({ ip: req.ip, admin: { id: null, username: 'student' } }, action, 'users/' + username, meta || {});
}

/** Password rule: at least 8 characters, with both letters and digits. */
function passwordProblem(pw) {
  if (typeof pw !== 'string' || pw.length < 8) return 'Password needs at least 8 characters.';
  if (pw.length > 200) return 'That password is too long.';
  if (!/[A-Za-z]/.test(pw) || !/\d/.test(pw)) return 'Password needs both letters and numbers.';
  return null;
}

/** Narrow the followed-exams list down to ids that actually exist */
function cleanInterests(v) {
  if (!Array.isArray(v)) return [];
  const valid = new Set(q.all('SELECT id FROM families').map(f => f.id));
  return [...new Set(v.filter(x => typeof x === 'string' && valid.has(x)))].slice(0, 10);
}

/** Write the link to the log; outside production return it so the client can open it. */
function deliverLink(kind, user, token) {
  const path = kind === 'verify' ? '/prep/xac-thuc-email/?token=' : '/prep/dat-lai-mat-khau/?token=';
  const link = path + encodeURIComponent(token);
  const label = kind === 'verify' ? 'email verification' : 'password reset';
  console.log(`[mail] ${label} link for ${user.email}: ${link}`);
  return isProd() ? undefined : link;
}

/** The profile sent to the client — never carries pass_hash */
function profileOf(userId) {
  const u = q.get('SELECT * FROM users WHERE id=?', userId);
  if (!u) return null;
  return {
    username: u.username, email: u.email, name: u.name,
    verified: !!u.verified, interests: jparse(u.interests_json, []),
    createdAt: u.created_at
  };
}

/** What a student may open, derived from the codes they have activated */
function accessOf(userId) {
  const rows = q.all(
    "SELECT * FROM codes WHERE user_id=? AND status='redeemed' ORDER BY redeemed_at DESC", userId);
  const testIds = new Set(), familyIds = new Set();
  const now = nowISO();
  const codes = rows.map(c => {
    const refs = String(c.unlock_ref).split(',').filter(Boolean);
    if (c.unlock_type === 'test') refs.forEach(r => testIds.add(r));
    else refs.forEach(r => familyIds.add(r));
    /* What decides whether a code is still usable is the ACCESS expiry
       (access_expires_at, counted from activation), not the activation deadline
       (expires_at, the date by which it must be entered). Only the second used to
       exist, so an activated code appeared to expire at the wrong moment. */
    const until = c.access_expires_at || c.expires_at;
    const plan = PLANS.byId(c.plan_id);
    return {
      code: c.code,
      /* A code carries a PLAN. `unlocks` is kept for older data and for any screen
         still reading it, but the plan is what should be shown. */
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

/* ============================ Registration ============================ */
router.post('/auth/register', A.csrfGuard, (req, res) => {
  // Only spend an allowance when an account is actually CREATED: bad input or a duplicate email costs nothing
  const rlKey = 'register|' + (req.ip || '?');
  /* Five accounts per hour per address. This default applies everywhere, test
     machines included — there is no "loosen it outside production" branch, because
     a threshold that only exists on paper when it runs for real is a threshold
     nobody can check. REGISTER_PER_HOUR exists for the test suite alone: the suite
     and the screenshot pass both register from the single address 127.0.0.1, so
     scripts/verify.sh raises it to stop one step blocking the next. Production sets
     no variable ⇒ it stays 5. */
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

/* =========================== Sign-in =========================== */
router.post('/auth/login', A.csrfGuard, (req, res) => {
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

  // Still hash once when there is no account, so response time gives nothing away
  const ok = user ? A.verifyPassword(password, user.pass_hash)
                  : A.verifyPassword(password, A.hashPassword('does-not-exist'));
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

/* ======================= Activating a code =======================
   Moved wholly to the server. The rule "one code, one account" cannot be enforced
   in the browser: a code in localStorage is editable by anyone, and two machines
   cannot see each other. */
router.post('/redeem', A.requireUser, A.csrfGuard, (req, res) => {
  const raw = str(req.body && req.body.code, 40).toUpperCase().trim();
  if (!raw) return bad(res, 'Enter your activation code.');

  /* Codes are short strings, so guessing is a real risk. Rate-limit per IP +
     account, counting hits as well as misses so nobody can sweep the range. */
  const wait = A.rateLimit('redeem:' + A.throttleKey(req, 'u' + req.user.id), REDEEM_PER_10MIN, 10 * 60 * 1000);
  if (wait) {
    return res.status(429).json({ error: 'Too many attempts. Wait ' + Math.ceil(wait / 60) + ' minutes and try again.' });
  }

  const code = q.get('SELECT * FROM codes WHERE code=?', raw);
  /* The same answer for "no such code" and "somebody else's code": answering
  differently tells whoever is probing which codes are real. */
  if (!code || code.status === 'revoked') {
    logUser(req, 'user.redeem.unknown', req.user.username, { code: raw });
    return res.status(404).json({ error: 'No such code, or it has been withdrawn. Check it character by character.' });
  }
  if (code.status === 'redeemed') {
    /* Somebody else's code stops here: one code, one account. */
    if (code.user_id !== req.user.id) {
      logUser(req, 'user.redeem.taken', req.user.username, { code: raw });
      return res.status(409).json({
        error: 'This code has already been activated on another account. Each code works for one account only.'
      });
    }
    /* Your own code is not an error — re-entering one you already used is ordinary
       (a new machine, or forgetting you activated it). Return the entitlement as it
       stands and do NOT extend it: adding months each time would make re-entering
       it forever a permanent subscription. */
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
    return res.status(410).json({ error: 'This code is past its activation deadline.' });
  }

  const plan = PLANS.byId(code.plan_id);
  if (!plan) {
    logUser(req, 'user.redeem.noplan', req.user.username, { code: raw });
    return res.status(409).json({ error: 'This code has no plan attached. Ask your centre to issue a replacement.' });
  }

  /* The term runs from ACTIVATION, not from sale: bought in January and first used
  in March means the clock starts in March. */
  const start = new Date();
  const until = new Date(start);
  until.setMonth(until.getMonth() + plan.months);

  const r = q.run(
    `UPDATE codes SET status='redeemed', user_id=?, redeemed_at=?, access_expires_at=?
      WHERE id=? AND status='unused'`,
    req.user.id, start.toISOString(), until.toISOString(), code.id);
  /* The status='unused' condition sits inside the UPDATE itself: with two
  simultaneous presses only one wins, and the other sees 0 rows changed. */
  if (!r.changes) {
    return res.status(409).json({ error: 'That code was just activated on another account.' });
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

/* ======================= Email verification ======================= */
router.post('/auth/verify/send', A.requireUser, A.csrfGuard, (req, res) => {
  if (req.user.verified) return res.json({ ok: true, alreadyVerified: true });
  const wait = A.rateLimit('verify-send|' + req.user.id, 3, 3600e3);
  if (wait) return res.status(429).json({ error: 'That has been sent a few times already. Try again in ' + Math.ceil(wait / 60) + ' minutes.' });

  const link = deliverLink('verify', req.user, A.issueToken(req.user.id, 'verify'));
  logUser(req, 'user.verify.send', req.user.username);
  res.json({ ok: true, verifyLink: link });
});

/* No sign-in required: the link may be opened in a different browser. */
router.post('/auth/verify', A.csrfGuard, (req, res) => {
  const userId = A.consumeToken(str((req.body || {}).token, 400), 'verify');
  if (!userId) return bad(res, 'That verification link is invalid or has expired. Please request a new one.');
  q.run('UPDATE users SET verified=1 WHERE id=?', userId);
  const u = q.get('SELECT username FROM users WHERE id=?', userId);
  logUser(req, 'user.verify.done', u ? u.username : userId);
  res.json({ ok: true, user: profileOf(userId) });
});

/* ===================== Forgotten / reset password ===================== */
router.post('/auth/forgot', A.csrfGuard, (req, res) => {
  const email = str((req.body || {}).email, 160).toLowerCase();
  if (!EMAIL_RE.test(email)) return bad(res, 'That email address is not valid.');

  const wait = A.rateLimit('forgot|' + (req.ip || '?'), FORGOT_PER_HOUR, 3600e3);
  if (wait) return res.status(429).json({ error: 'You have asked for that several times. Try again in ' + Math.ceil(wait / 60) + ' minutes.' });

  const user = q.get('SELECT * FROM users WHERE lower(email)=?', email);
  let link;
  if (user && user.status === 'active') {
    link = deliverLink('reset', user, A.issueToken(user.id, 'reset'));
    logUser(req, 'user.reset.request', user.username);
  }
  // Always the same answer: never reveal which emails exist
  res.json({ ok: true, resetLink: link });
});

router.post('/auth/reset', A.csrfGuard, (req, res) => {
  const b = req.body || {};
  const password = typeof b.password === 'string' ? b.password : '';
  const pwErr = passwordProblem(password);
  if (pwErr) return bad(res, pwErr);

  const userId = A.consumeToken(str(b.token, 400), 'reset');
  if (!userId) return bad(res, 'That reset link is invalid or has expired. Please request a new one.');

  q.run('UPDATE users SET pass_hash=? WHERE id=?', A.hashPassword(password), userId);
  A.dropUserSessions(userId);                       // every old device must sign in again
  const u = q.get('SELECT username FROM users WHERE id=?', userId);
  logUser(req, 'user.reset.done', u ? u.username : userId);
  res.json({ ok: true });
});

/* ========================= Student profile ========================= */
/* Session probe: every page calls this on boot, public pages included.
   Signed out returns 200 with user: null — not an error, and it avoids the browser
   logging a 401 on every guest page. Routes that need authorisation still return 401. */
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
  if (taken) return res.status(409).json({ error: 'That email already belongs to another account.' });

  // Changing the email means verifying the new address
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
    return res.status(401).json({ error: 'That is not your current password.' });
  }

  A.clearFailures(key);
  q.run('UPDATE users SET pass_hash=? WHERE id=?', A.hashPassword(next), req.user.id);
  A.dropUserSessions(req.user.id);
  A.createUserSession(req.user.id, req, res);       // keep the current device signed in
  logUser(req, 'user.password.change', req.user.username);
  res.json({ ok: true });
});

module.exports = router;
