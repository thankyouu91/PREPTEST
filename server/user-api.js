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
 * Email: server/mail.js. MAIL_DRIVER=console (default) sends nothing and returns
 * the link to the caller outside production so the flow can be exercised;
 * MAIL_DRIVER=smtp sends a real message. The token is never written to a log.
 */
'use strict';
const express = require('express');
const { asyncRoutes } = require('./async-route');
const { q, nowISO, jparse, audit } = require('./db');
const A = require('./auth');
const analytics = require('./analytics');
const googleAuth = require('./google-auth');
const mail = require('./mail');
const PLANS = require('./data/plans');
const { entitlementOf } = require('./entitlements');
const abilityModel = require('./ability');
const placement = require('./placement');
const storage = require('./storage');
const drills = require('./drills');
const revision = require('./revision');
const plan = require('./plan');
const report = require('./report');
const EXAM_FORMATS = require('./data/exam-formats');

/* How much each lettered part is worth in a real VPET paper, read from the
   published blueprint rather than written down again. A second copy of these
   numbers is a second thing to update when the exam changes, and the copy that
   goes stale is always the one nobody is looking at. */
const PART_WEIGHTS = (() => {
  const fmt = EXAM_FORMATS.FORMATS.find(f => f.id === 'vpet-full');
  const out = {};
  for (const s of (fmt ? fmt.sections : [])) if (s.part) out[s.part] = s.items;
  return out;
})();

const router = asyncRoutes(express.Router());
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

/* Both live in server/auth.js: an administrator can now create an account too,
   and one rule in two files is two rules within a month. */
const { EMAIL_RE, passwordProblem, phoneProblem, normalizePhone } = A;

/** Log a student's action (no administrator is involved) */
async function logUser(req, action, username, meta) {
  await audit({ ip: req.ip, admin: { id: null, username: 'student' } }, action, 'users/' + username, meta || {});
}

/** Narrow the followed-exams list down to ids that actually exist */
async function cleanInterests(v) {
  if (!Array.isArray(v)) return [];
  const valid = new Set((await q.all('SELECT id FROM families')).map(f => f.id));
  return [...new Set(v.filter(x => typeof x === 'string' && valid.has(x)))].slice(0, 10);
}

/* The two links this platform ever sends. Both carry a single-use token that is
   a bearer credential for one account until it is spent, which is why the token
   never reaches a log — see the note at the top of server/mail.js. */
const LINKS = {
  verify: {
    path: '/prep/xac-thuc-email/?token=',
    subject: 'Xác thực địa chỉ email — VPET Prep',
    body: link => 'Chào bạn,\n\n' +
      'Bấm vào liên kết dưới đây để xác thực địa chỉ email của bạn:\n\n' + link +
      '\n\nLiên kết có hiệu lực trong 48 giờ và chỉ dùng được một lần.\n' +
      'Nếu bạn không tạo tài khoản nào ở VPET Prep, bỏ qua thư này là được.\n'
  },
  reset: {
    path: '/prep/dat-lai-mat-khau/?token=',
    subject: 'Đặt lại mật khẩu — VPET Prep',
    body: link => 'Chào bạn,\n\n' +
      'Bấm vào liên kết dưới đây để đặt mật khẩu mới:\n\n' + link +
      '\n\nLiên kết có hiệu lực trong 2 giờ và chỉ dùng được một lần.\n' +
      'Nếu bạn không yêu cầu đổi mật khẩu, bỏ qua thư này — mật khẩu hiện tại vẫn giữ nguyên.\n'
  }
};

/**
 * Issue one link and get it to the person.
 *
 * The link is returned to the caller only when no real transport is configured
 * AND this is not production — that is the development path, where the sign-up
 * screen shows the link because there is nowhere else for it to go. With SMTP
 * configured, or in production, the response carries nothing: a token in an API
 * response is a token in a browser history, a proxy log and a screenshot.
 *
 * Sending is deliberately not awaited. A mail server having a slow afternoon
 * must not hold a registration request open, and the send path already reports
 * its own failures; the person can ask for another link.
 */
function deliverLink(kind, user, token, req) {
  const spec = LINKS[kind];
  const link = spec.path + encodeURIComponent(token);
  if (user.email) {
    mail.send({ to: user.email, subject: spec.subject, text: spec.body(mail.baseUrl(req) + link) })
      .catch(e => console.error('[mail] delivery failed: ' + (e && e.message)));
  }
  return (isProd() || mail.enabled()) ? undefined : link;
}

/* The three emails a learner can turn on or off, and the column each one lives
   in. One list, used by the reader, the writer and the validator alike, so a
   fourth preference cannot be added to two of the three and forgotten in the
   last. */
const NOTIFY = [
  ['newTests', 'notify_new_tests'],
  ['reminder', 'notify_reminder'],
  ['promo', 'notify_promo']
];

function notifyOf(u) {
  const out = { setAt: u.notify_set_at || null };
  for (const [key, col] of NOTIFY) out[key] = !!u[col];
  return out;
}

/** The profile sent to the client — never carries pass_hash */
async function profileOf(userId) {
  const u = await q.get('SELECT * FROM users WHERE id=?', userId);
  if (!u) return null;
  return {
    username: u.username, email: u.email, name: u.name,
    verified: !!u.verified, interests: jparse(u.interests_json, []),
    createdAt: u.created_at,
    notify: notifyOf(u)
  };
}

/** What a student may open, derived from the codes they have activated */
async function accessOf(userId) {
  const rows = await q.all(
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

/* A buyer's own order history.
 *
 * The code is joined in rather than looked up per row: an order that settled
 * IS a code, and a receipt that cannot show which one sends the buyer to
 * support to ask. It is the whole code — this is the person who paid for it,
 * reading their own history behind their own sign-in; the account screen masks
 * it on the way to the screen so a shoulder or a screenshot does not carry it.
 *
 * `demo` marks the six seeded fixture orders, which are the ones with no
 * provider: nothing sent them to a gateway, so they must not be shown as if
 * money moved. A real order always names the provider that took it.
 *
 * LIMIT 50 is the screen's limit, not a paging cursor — nobody has more, and if
 * anybody ever does the older rows are still in the table. */
async function ordersOf(userId) {
  const rows = await q.all(
    `SELECT o.*, c.code AS code FROM orders o
       LEFT JOIN codes c ON c.id = o.code_id
      WHERE o.user_id=? ORDER BY o.created_at DESC LIMIT 50`, userId);
  return rows.map(o => ({
    id: 'DH' + o.id,
    packageId: o.package_id,
    name: o.name,
    amount: o.amount,
    at: o.created_at,
    status: o.status,
    paidAt: o.paid_at || null,
    code: o.code || null,
    demo: !o.provider
  }));
}

/* ============================ Registration ============================ */
router.post('/auth/register', A.csrfGuard, async (req, res) => {
  // Only spend an allowance when an account is actually CREATED: bad input or a duplicate email costs nothing
  const rlKey = 'register|' + (req.ip || '?');
  /* Five accounts per hour per address. This default applies everywhere, test
     machines included — there is no "loosen it outside production" branch, because
     a threshold that only exists on paper when it runs for real is a threshold
     nobody can check. REGISTER_PER_HOUR exists for the test suite alone: the suite
     and the screenshot pass both register from the single address 127.0.0.1, so
     scripts/verify.sh raises it to stop one step blocking the next. Production sets
     no variable ⇒ it stays 5. */
  const wait = await A.rateLimitPeek(rlKey, REGISTER_PER_HOUR, 3600e3);
  if (wait) return res.status(429).json({ error: 'You have created several accounts in a row. Try again in ' + Math.ceil(wait / 60) + ' minutes.' });

  const b = req.body || {};
  const name = str(b.name, 80);
  const email = str(b.email, 160).toLowerCase();
  const phone = str(b.phone, 24);
  const password = typeof b.password === 'string' ? b.password : '';

  if (!name) return bad(res, 'Please enter your full name.');
  if (!EMAIL_RE.test(email)) return bad(res, 'That email address is not valid.');
  const phErr = phoneProblem(phone);
  if (phErr) return bad(res, phErr);
  const pwErr = passwordProblem(password);
  if (pwErr) return bad(res, pwErr);

  if (await q.get('SELECT id FROM users WHERE email=? OR username=?', email, email)) {
    return res.status(409).json({ error: 'That email is already registered. Try signing in, or use another address.' });
  }

  await q.run(`INSERT INTO users (username,email,name,phone,pass_hash,verified,status,interests_json,created_at)
         VALUES (?,?,?,?,?,0,'active',?,?)`,
    email, email, name, normalizePhone(phone), A.hashPassword(password), JSON.stringify(await cleanInterests(b.interests)), nowISO());

  await A.rateLimitNote(rlKey);
  const user = await q.get('SELECT * FROM users WHERE email=?', email);
  const devLink = deliverLink('verify', user, await A.issueToken(user.id, 'verify'), req);
  await A.createUserSession(user.id, req, res);
  await q.run('UPDATE users SET last_login_at=? WHERE id=?', nowISO(), user.id);
  await logUser(req, 'user.register', email);
  analytics.track(req, 'sign_up', { method: 'password' });

  res.status(201).json({ ok: true, user: await profileOf(user.id), verifyLink: devLink });
});

/* =========================== Sign-in =========================== */
router.post('/auth/login', A.csrfGuard, async (req, res) => {
  const b = req.body || {};
  const identifier = str(b.username, 160).toLowerCase();
  const password = typeof b.password === 'string' ? b.password : '';
  if (!identifier || !password) return bad(res, 'Enter your username and password.');

  const key = A.throttleKey(req, 'user:' + identifier);
  const lockedFor = await A.isLocked(key);
  if (lockedFor) {
    return res.status(429).json({ error: 'Too many failed attempts. Try again in ' + Math.ceil(lockedFor / 60) + ' minutes.' });
  }

  const user = await q.get('SELECT * FROM users WHERE lower(username)=? OR lower(email)=?', identifier, identifier);

  /* An account created through Google has no password. Saying so is not a
     disclosure worth worrying about — the person is already holding that email
     address — and the alternative is a login that fails with no way forward. */
  if (user && !user.pass_hash) {
    await logUser(req, 'user.login.google_only', user.username);
    return res.status(409).json({
      error: 'This account signs in with Google. Use "Continue with Google", or set a password of your own through "Forgot password".',
      useGoogle: true
    });
  }

  // Still hash once when there is no account, so response time gives nothing away
  const ok = user ? A.verifyPassword(password, user.pass_hash)
                  : A.verifyPassword(password, A.hashPassword('does-not-exist'));
  if (!user || !ok) {
    await A.noteFailure(key);
    await logUser(req, 'user.login.failed', identifier);
    return res.status(401).json({ error: 'That username or password is not right. Please check and try again.' });
  }
  if (user.status !== 'active') {
    await logUser(req, 'user.login.locked', user.username);
    return res.status(403).json({ error: 'This account is locked. Contact your centre to reopen it.' });
  }

  await A.clearFailures(key);
  await A.createUserSession(user.id, req, res);
  await q.run('UPDATE users SET last_login_at=? WHERE id=?', nowISO(), user.id);
  await logUser(req, 'user.login', user.username);
  analytics.track(req, 'login', { method: 'password' });
  res.json({ ok: true, user: await profileOf(user.id) });
});

/* ======================= Activating a code =======================
   Moved wholly to the server. The rule "one code, one account" cannot be enforced
   in the browser: a code in localStorage is editable by anyone, and two machines
   cannot see each other. */
router.post('/redeem', A.requireUser, A.csrfGuard, async (req, res) => {
  const raw = str(req.body && req.body.code, 40).toUpperCase().trim();
  if (!raw) return bad(res, 'Enter your activation code.');

  /* Codes are short strings, so guessing is a real risk. Rate-limit per IP +
     account, counting hits as well as misses so nobody can sweep the range. */
  const wait = await A.rateLimit('redeem:' + A.throttleKey(req, 'u' + req.user.id), REDEEM_PER_10MIN, 10 * 60 * 1000);
  if (wait) {
    return res.status(429).json({ error: 'Too many attempts. Wait ' + Math.ceil(wait / 60) + ' minutes and try again.' });
  }

  const code = await q.get('SELECT * FROM codes WHERE code=?', raw);
  /* The same answer for "no such code" and "somebody else's code": answering
  differently tells whoever is probing which codes are real. */
  if (!code || code.status === 'revoked') {
    await logUser(req, 'user.redeem.unknown', req.user.username, { code: raw });
    return res.status(404).json({ error: 'No such code, or it has been withdrawn. Check it character by character.' });
  }
  if (code.status === 'redeemed') {
    /* Somebody else's code stops here: one code, one account. */
    if (code.user_id !== req.user.id) {
      await logUser(req, 'user.redeem.taken', req.user.username, { code: raw });
      return res.status(409).json({
        error: 'This code has already been activated on another account. Each code works for one account only.'
      });
    }
    /* Your own code is not an error — re-entering one you already used is ordinary
       (a new machine, or forgetting you activated it). Return the entitlement as it
       stands and do NOT extend it: adding months each time would make re-entering
       it forever a permanent subscription. */
    const own = PLANS.byId(code.plan_id);
    await logUser(req, 'user.redeem.again', req.user.username, { code: raw });
    return res.json({
      ok: true,
      already: true,
      plan: own ? { id: own.id, name: own.name, months: own.months } : null,
      entitlement: await entitlementOf(req.user.id)
    });
  }
  /* A reserved code is bound to one account while still unused: an administrator
     issued it straight to a named student. Anyone else is told the same thing they
     would hear about a code already activated elsewhere — one code, one account —
     without revealing whose it is. */
  if (code.user_id && code.user_id !== req.user.id) {
    await logUser(req, 'user.redeem.reserved', req.user.username, { code: raw });
    return res.status(409).json({
      error: 'This code is reserved for a different account. Each code works for one account only.'
    });
  }
  if (code.expires_at && code.expires_at <= nowISO()) {
    return res.status(410).json({ error: 'This code is past its activation deadline.' });
  }

  const plan = PLANS.byId(code.plan_id);
  if (!plan) {
    await logUser(req, 'user.redeem.noplan', req.user.username, { code: raw });
    return res.status(409).json({ error: 'This code has no plan attached. Ask your centre to issue a replacement.' });
  }

  /* The term runs from ACTIVATION, not from sale: bought in January and first used
  in March means the clock starts in March. */
  const start = new Date();
  const until = new Date(start);
  until.setMonth(until.getMonth() + plan.months);

  const r = await q.run(
    `UPDATE codes SET status='redeemed', user_id=?, redeemed_at=?, access_expires_at=?
      WHERE id=? AND status='unused' AND (user_id IS NULL OR user_id=?)`,
    req.user.id, start.toISOString(), until.toISOString(), code.id, req.user.id);
  /* The status='unused' condition sits inside the UPDATE itself: with two
  simultaneous presses only one wins, and the other sees 0 rows changed. The
  user_id guard closes the same race for a code reserved between our read and
  write — it can still only fall to the account it was reserved to. */
  if (!r.changes) {
    return res.status(409).json({ error: 'That code was just activated on another account.' });
  }

  await logUser(req, 'user.redeem', req.user.username, { code: raw, plan: plan.id });
  /* The plan id, never the code: a code is a bearer credential. */
  analytics.track(req, 'unlock_code', { plan_id: plan.id, months: plan.months });
  res.json({
    ok: true,
    plan: { id: plan.id, name: plan.name, months: plan.months },
    entitlement: await entitlementOf(req.user.id)
  });
});

router.post('/auth/logout', A.csrfGuard, async (req, res) => {
  const user = await A.currentUser(req);
  if (user) await logUser(req, 'user.logout', user.username);
  await A.destroyUserSession(req, res);
  res.json({ ok: true });
});

/* ======================= Email verification ======================= */
router.post('/auth/verify/send', A.requireUser, A.csrfGuard, async (req, res) => {
  if (req.user.verified) return res.json({ ok: true, alreadyVerified: true });
  const wait = await A.rateLimit('verify-send|' + req.user.id, 3, 3600e3);
  if (wait) return res.status(429).json({ error: 'That has been sent a few times already. Try again in ' + Math.ceil(wait / 60) + ' minutes.' });

  const link = deliverLink('verify', req.user, await A.issueToken(req.user.id, 'verify'), req);
  await logUser(req, 'user.verify.send', req.user.username);
  res.json({ ok: true, verifyLink: link });
});

/* No sign-in required: the link may be opened in a different browser. */
router.post('/auth/verify', A.csrfGuard, async (req, res) => {
  const userId = await A.consumeToken(str((req.body || {}).token, 400), 'verify');
  if (!userId) return bad(res, 'That verification link is invalid or has expired. Please request a new one.');
  await q.run('UPDATE users SET verified=1 WHERE id=?', userId);
  const u = await q.get('SELECT username FROM users WHERE id=?', userId);
  await logUser(req, 'user.verify.done', u ? u.username : userId);
  res.json({ ok: true, user: await profileOf(userId) });
});

/* ===================== Forgotten / reset password ===================== */
router.post('/auth/forgot', A.csrfGuard, async (req, res) => {
  const email = str((req.body || {}).email, 160).toLowerCase();
  if (!EMAIL_RE.test(email)) return bad(res, 'That email address is not valid.');

  const wait = await A.rateLimit('forgot|' + (req.ip || '?'), FORGOT_PER_HOUR, 3600e3);
  if (wait) return res.status(429).json({ error: 'You have asked for that several times. Try again in ' + Math.ceil(wait / 60) + ' minutes.' });

  const user = await q.get('SELECT * FROM users WHERE lower(email)=?', email);
  let link;
  if (user && user.status === 'active') {
    link = deliverLink('reset', user, await A.issueToken(user.id, 'reset'), req);
    await logUser(req, 'user.reset.request', user.username);
  }
  // Always the same answer: never reveal which emails exist
  res.json({ ok: true, resetLink: link });
});

router.post('/auth/reset', A.csrfGuard, async (req, res) => {
  const b = req.body || {};
  const password = typeof b.password === 'string' ? b.password : '';
  const pwErr = passwordProblem(password);
  if (pwErr) return bad(res, pwErr);

  const userId = await A.consumeToken(str(b.token, 400), 'reset');
  if (!userId) return bad(res, 'That reset link is invalid or has expired. Please request a new one.');

  await q.run('UPDATE users SET pass_hash=? WHERE id=?', A.hashPassword(password), userId);
  await A.dropUserSessions(userId);                       // every old device must sign in again
  const u = await q.get('SELECT username FROM users WHERE id=?', userId);
  await logUser(req, 'user.reset.done', u ? u.username : userId);
  res.json({ ok: true });
});

/* ========================= Student profile ========================= */
/* Session probe: every page calls this on boot, public pages included.
   Signed out returns 200 with user: null — not an error, and it avoids the browser
   logging a 401 on every guest page. Routes that need authorisation still return 401. */
router.get('/me', async (req, res) => {
  const user = await A.currentUser(req);
  /* providers rides along on the boot request the pages already make, so the
     login screen knows whether to show the Google button without a second
     round trip. Returned when signed out too — that is when it is needed. */
  const providers = { google: googleAuth.enabled() };
  /* The plan catalogue rides along so the shop and every locked panel can be
     rendered from one boot request instead of a second round trip. */
  const plans = PLANS.PLANS.map(p => ({
    id: p.id, name: p.name, price: p.price, listPrice: p.listPrice || null, months: p.months,
    attempts: p.attempts || null, features: p.features,
    tagline: p.tagline, perks: p.perks, limits: p.limits
  }));
  if (!user) return res.set('Cache-Control', 'no-store').json({ user: null, providers, plans });
  const access = await accessOf(user.id);
  res.set('Cache-Control', 'no-store').json({
    user: await profileOf(user.id),
    providers,
    plans,
    entitlement: await entitlementOf(user.id),
    unlockedTestIds: access.unlockedTestIds,
    unlockedFamilyIds: access.unlockedFamilyIds,
    myCodes: access.myCodes,
    orders: await ordersOf(user.id)
  });
});

/* ---------------------------- What they can do ----------------------------
 *
 * The dashboard ring used to read "5 of 8 tests unlocked" under the heading
 * "Your progress", and the four skill bars counted how many unlocked papers
 * happened to contain each skill. Both are facts about a shopping basket. This
 * is the endpoint that replaces them with a fact about the learner.
 *
 * Behind the sign-in, and scoped to the caller — an ability estimate is a
 * judgement about a person, and there is no reason for anyone else to read it.
 *
 * `parts` is keyed 'A'..'J' and each entry may carry `band: null`, which is not
 * an error: it is the model declining to name a band it cannot support yet.
 * The page renders `needed` in that case. See server/ability.js. */
/* The work, as opposed to the ability: how much study, when, what kind, and
   how accurate. server/report.js carries the reasoning, including why it is
   careful never to produce a second opinion about how good somebody is. */
router.get('/me/report', A.requireUser, async (req, res) => {
  const days = Math.min(180, Math.max(7, parseInt(req.query.days, 10) || report.WINDOW_DAYS));
  res.set('Cache-Control', 'no-store').json(await report.reportOf(req.user.id, days));
});

router.get('/me/ability', A.requireUser, async (req, res) => {
  const ability = await abilityModel.abilityOf(req.user.id);
  res.set('Cache-Control', 'no-store').json({
    ...ability,
    /* Weighted by how many marks the part is worth in the real paper, straight
       from the published blueprint rather than typed in here — being weak at a
       2-item part and a 10-item part are not the same problem. */
    roadmap: abilityModel.roadmap(ability, PART_WEIGHTS),
    confidentAt: abilityModel.CONFIDENT_SD,
    halfLifeDays: abilityModel.HALF_LIFE_DAYS
  });
});

/* ======================= PLACEMENT =======================
   Fifteen minutes, once, before anything else — so the platform stops guessing
   what to teach. Everything about how it works and why is in server/placement.js.

   Marking happens on the server and nowhere else. The browser is handed prompts
   and options and never an answer key, and it is not told which answers were
   right until the rung is over. */

router.get('/placement', A.requireUser, async (req, res) => {
  res.set('Cache-Control', 'no-store').json(await placement.stateOf(req.user.id));
});

/* POST rather than GET even though it reads like one: it CREATES the sitting on
   first call, and a GET that creates a row is a GET a browser prefetch can
   start. Resuming is the same call — see start(). */
router.post('/placement/start', A.requireUser, A.csrfGuard, async (req, res) => {
  const out = await placement.start(req.user.id);
  if (out.error === 'no-items') {
    /* A content problem, not the learner's. Saying which level is empty is what
       lets somebody fix it; handing back an unfinishable test is not. */
    return res.status(503).json({
      error: 'There are no placement items at this level yet. Please tell your centre.',
      level: out.level
    });
  }
  res.json(out);
});

/**
 * The recording for one placement item.
 *
 * Parts E and F are listening items and roughly half of every draw, so without
 * this the placement test asked a new learner to type what they heard with
 * nothing to hear. It is a GET and it plays as often as they need: this is a
 * twelve-minute screener, not the exam, and there is no replay budget to spend.
 *
 * Authorised against the learner's OWN draw, not merely against having a
 * session. `asked_json` is the list recorded when the rung was dealt, so this
 * cannot be walked through the question bank id by id, and it closes as soon as
 * the placement is done.
 */
router.get('/placement/items/:questionId/audio', A.requireUser, async (req, res) => {
  const questionId = Number.parseInt(req.params.questionId, 10) || 0;
  if (!await placement.mayHear(req.user.id, questionId)) {
    return res.status(404).json({ error: 'That item is not part of your placement test.' });
  }
  const row = await q.get('SELECT audio_key FROM questions WHERE id=?', questionId);
  if (!row || !row.audio_key) return res.status(404).json({ error: 'This item has no audio file.' });

  let file;
  try {
    file = await storage.get(row.audio_key);
  } catch (e) {
    console.error('[placement] audio read failed', e);
    return res.status(502).json({ error: 'The audio file could not be read.' });
  }
  res.set('Content-Type', 'audio/mpeg')
     .set('Content-Length', String(file.body.length))
     /* Private, because it is bank content behind a session — but cacheable for
        the sitting, so replaying a dictation does not re-download it. */
     .set('Cache-Control', 'private, max-age=600')
     .send(file.body);
});

router.post('/placement/answers', A.requireUser, A.csrfGuard, async (req, res) => {
  const out = await placement.answer(req.user.id, (req.body || {}).answers);
  if (out.error === 'not-started') return bad(res, 'Start the placement test first.');
  if (out.error === 'no-answers') return bad(res, 'No answers were sent.');
  if (out.error === 'stale-rung') {
    return res.status(409).json({
      error: 'This page is showing an earlier set of questions. Reload to carry on where you left off.',
      reload: true
    });
  }
  if (out.done) {
    await audit(req, 'placement.done', 'users/' + req.user.id,
      { level: out.result.level, score: out.result.score });
  }
  res.json(out);
});

/* ======================= DRILLS =======================
   Block 4. Short papers for one part, chosen from the ability report and fed
   straight back into it. server/drills.js carries the reasoning.

   Everything here needs a session, and the answer key never leaves the server
   until a drill has been submitted — before that it would be the answers, after
   it is the feedback. */

router.get('/drills/suggest', A.requireUser, async (req, res) => {
  res.set('Cache-Control', 'no-store')
     .json({ suggestions: await drills.suggest(req.user.id, PART_WEIGHTS) });
});

/* All ten parts, drillable or not. The practise screen is built from this
   rather than from /suggest, because a ten-part exam shown as three cards
   teaches the wrong shape. See drills.overview() for why the six that cannot
   be drilled are returned rather than filtered out. */
router.get('/drills/parts', A.requireUser, async (req, res) => {
  res.set('Cache-Control', 'no-store')
     .json({ parts: await drills.overview(req.user.id, PART_WEIGHTS) });
});

router.get('/drills', A.requireUser, async (req, res) => {
  res.set('Cache-Control', 'no-store')
     .json({ drills: await drills.history(req.user.id, req.query.limit) });
});

router.get('/drills/:id', A.requireUser, async (req, res) => {
  const d = await drills.get(req.user.id, parseInt(req.params.id, 10) || 0);
  if (!d) return res.status(404).json({ error: 'No such drill.' });
  res.set('Cache-Control', 'no-store').json(d);
});

router.post('/drills', A.requireUser, A.csrfGuard, async (req, res) => {
  const out = await drills.start(req.user.id, req.body || {});
  if (out.error === 'bad-part') return bad(res, 'Choose a part from A to J.');
  if (out.error === 'no-items') {
    /* A content problem, and naming the part and level is what lets somebody
       fix it. Handing back an empty drill would look like a broken button. */
    return res.status(503).json({
      error: 'There is nothing to practise in this part yet. Please tell your centre.',
      part: out.part, level: out.level
    });
  }
  res.status(201).json(out);
});

/* The recording a listening or repeat-after-me item plays. No replay limit:
   see drills.itemAudio() for why a drill must not inherit the exam's. */
router.get('/drills/:id/items/:questionId/audio', A.requireUser, async (req, res) => {
  const out = await drills.itemAudio(req.user.id,
    parseInt(req.params.id, 10) || 0, parseInt(req.params.questionId, 10) || 0);
  if (out.error === 'not-found') return res.status(404).json({ error: 'No such drill.' });
  if (out.error === 'not-in-drill') {
    return res.status(404).json({ error: 'That question is not part of this drill.' });
  }
  if (out.error === 'no-audio') return res.status(404).json({ error: 'This item has no audio file.' });
  if (out.error) return res.status(502).json({ error: 'The audio file could not be read.' });
  res.set('Content-Type', 'audio/mpeg')
     .set('Content-Length', String(out.body.length))
     .set('Cache-Control', 'private, max-age=300')
     .send(out.body);
});

/* One spoken answer, uploaded before the drill is handed in. The same shape as
   the exam runner's recording route (server/exam-api.js) and for the same
   reason: MediaRecorder produces a blob, and a blob posted as JSON would be
   base64 and a third bigger. */
const drillAudioBody = express.raw({ type: ['audio/*', 'application/octet-stream'], limit: '10mb' });
router.post('/drills/:id/items/:questionId/recording',
  A.requireUser, A.csrfGuard, drillAudioBody, async (req, res) => {
    const out = await drills.saveRecording(
      req.user.id, parseInt(req.params.id, 10) || 0,
      parseInt(req.params.questionId, 10) || 0,
      req.body, req.headers['content-type']);
    if (out.error === 'not-found') return res.status(404).json({ error: 'No such drill.' });
    if (out.error === 'already-done') return res.status(409).json({ error: 'This drill has been handed in.' });
    if (out.error === 'not-in-drill') {
      return res.status(404).json({ error: 'That question is not part of this drill.' });
    }
    if (out.error === 'no-audio') return bad(res, 'No recording data was received.');
    if (out.error === 'bad-audio') return bad(res, out.message || 'That recording could not be read.');
    if (out.error) return res.status(502).json({ error: 'The recording could not be saved.' });
    res.status(201).json(out);
  });

router.post('/drills/:id/submit', A.requireUser, A.csrfGuard, async (req, res) => {
  const out = await drills.submit(req.user.id, parseInt(req.params.id, 10) || 0,
    (req.body || {}).answers);
  if (out.error === 'not-found') return res.status(404).json({ error: 'No such drill.' });
  /* 409, not 400: the request is well formed and the drill is real — it is the
     state that refuses. Marking twice would write a second set of events. */
  if (out.error === 'already-done') {
    return res.status(409).json({ error: 'This drill has already been marked.' });
  }
  res.json(out);
});

/* ======================= REVISION =======================
   Block 5. Grammar and vocabulary practised by USING them — filling the right
   form into a real sentence, then writing one of your own. No multiple choice
   anywhere: recognising a form and producing it are different skills and the
   exam tests the second. server/revision.js carries the reasoning. */

router.get('/revision/topics', A.requireUser, async (req, res) => {
  res.set('Cache-Control', 'no-store')
     .json(await revision.topics(req.user.id, req.query.level));
});

router.get('/revision', A.requireUser, async (req, res) => {
  res.set('Cache-Control', 'no-store')
     .json({ sets: await revision.history(req.user.id, req.query.limit) });
});

router.post('/revision', A.requireUser, A.csrfGuard, async (req, res) => {
  const out = await revision.start(req.user.id, req.body || {});
  if (out.error === 'no-topic' || out.error === 'no-items') {
    return res.status(503).json({
      error: 'There is nothing to revise at this level yet. Please tell your centre.',
      level: out.level
    });
  }
  res.status(201).json(out);
});

router.post('/revision/:id/submit', A.requireUser, A.csrfGuard, async (req, res) => {
  const out = await revision.submit(req.user.id, parseInt(req.params.id, 10) || 0,
    (req.body || {}).answers);
  if (out.error === 'not-found') return res.status(404).json({ error: 'No such revision set.' });
  if (out.error === 'already-done') {
    return res.status(409).json({ error: 'This set has already been marked.' });
  }
  res.json(out);
});

/* ======================= THE WEEKLY PLAN =======================
   Block 6. Three things to do next, each a link to a feature that exists and
   has material behind it, ranked by the one ability model this platform has.
   server/plan.js carries the reasoning, including why it is three. */

router.get('/plan', A.requireUser, async (req, res) => {
  res.set('Cache-Control', 'no-store')
     .json(await plan.weekly(req.user.id, PART_WEIGHTS));
});

router.patch('/me', A.requireUser, A.csrfGuard, async (req, res) => {
  const b = req.body || {};
  const name = str(b.name, 80);
  const email = str(b.email, 160).toLowerCase();
  if (!name) return bad(res, 'Please enter your full name.');
  if (!EMAIL_RE.test(email)) return bad(res, 'That email address is not valid.');

  const taken = await q.get('SELECT id FROM users WHERE lower(email)=? AND id<>?', email, req.user.id);
  if (taken) return res.status(409).json({ error: 'That email already belongs to another account.' });

  // Changing the email means verifying the new address
  const changedEmail = email !== req.user.email.toLowerCase();
  await q.run('UPDATE users SET name=?, email=?, interests_json=?, verified=? WHERE id=?',
    name, email, JSON.stringify(await cleanInterests(b.interests)),
    changedEmail ? 0 : (req.user.verified ? 1 : 0), req.user.id);

  let link;
  if (changedEmail) {
    link = deliverLink('verify', { email }, await A.issueToken(req.user.id, 'verify'), req);
  }
  await logUser(req, 'user.profile.update', req.user.username, { changedEmail });
  res.json({ ok: true, user: await profileOf(req.user.id), verifyLink: link });
});

/* Which emails this account agrees to receive.
 *
 * A partial patch: the account screen sends one switch at a time, because that
 * is how a person flips them, and a whole-object PUT from a screen that loaded
 * a minute ago would quietly undo whatever another tab changed since.
 *
 * Written down rather than kept in the browser because a preference in
 * localStorage is not a record of anything: it is gone with the cache, absent
 * on the person's phone, and unreadable by whatever eventually sends the mail.
 * Marketing consent especially — the only version of "they agreed" that is
 * worth having is one the server can produce later, with a date on it.
 *
 * Logged for the same reason, and the log carries what changed rather than the
 * whole set, so the audit trail reads as a sequence of decisions. */
router.patch('/me/notifications', A.requireUser, A.csrfGuard, async (req, res) => {
  const b = req.body || {};
  const sets = [], vals = [], changed = {};
  for (const [key, col] of NOTIFY) {
    if (!(key in b)) continue;
    if (typeof b[key] !== 'boolean') return bad(res, 'Each notification setting must be true or false.');
    sets.push(col + '=?');
    vals.push(b[key] ? 1 : 0);
    changed[key] = b[key];
  }
  /* An empty patch is a mistake on the caller's side, not a no-op worth
     stamping notify_set_at for — the date has to mean "they decided". */
  if (!sets.length) return bad(res, 'Nothing to change.');

  await q.run(`UPDATE users SET ${sets.join(', ')}, notify_set_at=? WHERE id=?`,
    ...vals, nowISO(), req.user.id);
  await logUser(req, 'user.notify.update', req.user.username, changed);
  const u = await q.get('SELECT * FROM users WHERE id=?', req.user.id);
  res.set('Cache-Control', 'no-store').json({ ok: true, notify: notifyOf(u) });
});

router.post('/me/password', A.requireUser, A.csrfGuard, async (req, res) => {
  const b = req.body || {};
  const current = typeof b.current === 'string' ? b.current : '';
  const next = typeof b.next === 'string' ? b.next : '';
  const pwErr = passwordProblem(next);
  if (pwErr) return bad(res, pwErr);

  const key = A.throttleKey(req, 'pw:' + req.user.username);
  const lockedFor = await A.isLocked(key);
  if (lockedFor) {
    return res.status(429).json({ error: 'Too many failed attempts. Try again in ' + Math.ceil(lockedFor / 60) + ' minutes.' });
  }

  const row = await q.get('SELECT pass_hash FROM users WHERE id=?', req.user.id);
  if (!A.verifyPassword(current, row && row.pass_hash)) {
    await A.noteFailure(key);
    return res.status(401).json({ error: 'That is not your current password.' });
  }

  await A.clearFailures(key);
  await q.run('UPDATE users SET pass_hash=? WHERE id=?', A.hashPassword(next), req.user.id);
  await A.dropUserSessions(req.user.id);
  await A.createUserSession(req.user.id, req, res);       // keep the current device signed in
  await logUser(req, 'user.password.change', req.user.username);
  res.json({ ok: true });
});

module.exports = router;
