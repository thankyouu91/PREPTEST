/**
 * Whole-server security middleware: the headers every response carries, and the
 * rate limit every write passes through.
 *
 * Both are here rather than sprinkled through the routers for the same reason:
 * a protection that has to be remembered at each call site is a protection that
 * will be missing from the next endpoint somebody adds. `scripts/test-security.mjs`
 * walks the router stacks and fails if a mutating route slips out from under
 * either of them, and `docs/SECURITY.md` carries the table it generates.
 */
'use strict';
const crypto = require('crypto');
const A = require('./auth');

/* ------------------------------ Headers ------------------------------ */

/* microphone=(self) is the one capability the platform actually uses: the
   speaking parts record through MediaRecorder. Everything else is switched off,
   because a policy that allows what nobody asked for is not a policy. */
const PERMISSIONS_POLICY = [
  'accelerometer=()', 'autoplay=(self)', 'camera=()', 'display-capture=()',
  'encrypted-media=()', 'fullscreen=(self)', 'geolocation=()', 'gyroscope=()',
  'magnetometer=()', 'microphone=(self)', 'midi=()', 'payment=()',
  'picture-in-picture=()', 'usb=()', 'xr-spatial-tracking=()'
].join(', ');

/* An API response is data, never a document. Nothing in it should ever be
   allowed to load or run anything, and no page should be able to frame it. */
const API_CSP = "default-src 'none'; frame-ancestors 'none'; base-uri 'none'; sandbox";

const HSTS = 'max-age=31536000; includeSubDomains';

/* ------------------------- How far to trust a proxy -------------------------
   How many reverse proxies sit in front of this process. Express turns this into
   how much of X-Forwarded-For it believes, and req.ip is what the sign-in lockout
   (auth.js throttleKey) and the write limit below are both keyed on.

   This was `true` — trust any X-Forwarded-For a client cares to send — which made
   both of those decorative. Five wrong passwords lock an account; rotate the header
   and the lock never engages, so `admin` could be guessed at without limit. Proved
   against a running server, and now pinned by test-security.mjs.

   0 is the safe default: req.ip is then the socket address, which a client cannot
   forge. Behind a real proxy that makes every request look like it came from the
   proxy, so the limit over-blocks rather than under-blocks — the right way to fail.
   Set TRUST_PROXY to the number of proxies in front (Cloud Run or one load
   balancer: 1). Anything that is not a finite number, including the string "true",
   resolves to 0 rather than being guessed at. */
function resolveTrustProxy(env) {
  const raw = (env || {}).TRUST_PROXY;
  const n = Number(raw);
  return raw !== undefined && raw !== '' && Number.isInteger(n) && n >= 0 ? n : 0;
}
const TRUST_PROXY = resolveTrustProxy(process.env);

/* -------------------- Two misconfigurations that stay silent --------------------
 *
 * Both of these were found on a real deployment, and neither announced itself.
 * They are checked here rather than at boot because neither is visible from the
 * environment alone — you have to see a request to know a proxy is in front, and
 * to know what scheme the visitor really used.
 *
 * Warned once each, on the first request that shows the problem. Once, because a
 * line per request is a line nobody reads; on a request, because that is the
 * first moment the truth is knowable.
 */
const warnedAbout = new Set();
function warnOnce(topic, ...lines) {
  if (warnedAbout.has(topic)) return;
  warnedAbout.add(topic);
  lines.forEach(l => console.warn('[config] ' + l));
}

/** For the tests: forget what has been said, so each case can be observed. */
function resetWarnings() { warnedAbout.clear(); }

function checkDeployment(req) {
  /* 1. A proxy in front, and TRUST_PROXY says there is none.
     req.ip is then the proxy's address for EVERY visitor, so the sign-in
     lockout and the write limit are keyed on one value shared by all of them:
     five wrong passwords from one person lock out everybody at once. The
     failure is a support ticket that says "nobody can sign in", fifteen
     minutes after one person mistyped. */
  if (TRUST_PROXY === 0 && (req.headers['x-forwarded-for'] || req.headers['x-forwarded-proto'])) {
    warnOnce('trust-proxy',
      'a reverse proxy is forwarding to this process (X-Forwarded-* is present) but TRUST_PROXY is 0.',
      'req.ip is therefore the proxy for every visitor, and the sign-in lockout and write',
      'limit are keyed on it — one person\'s five wrong passwords lock out everyone.',
      'Set TRUST_PROXY to the NUMBER of proxies in front (one load balancer or nginx: 1).');
  }

  /* 2. Secure cookies over plain HTTP.
     In production the session cookie carries Secure, so a browser on http://
     accepts it and never sends it back. The symptom is a sign-in that succeeds
     and lands straight back on the sign-in page, with nothing in any log. */
  const proto = String(req.headers['x-forwarded-proto'] || '').split(',')[0].trim() ||
    (req.secure ? 'https' : 'http');
  if (proto === 'http' && A.cookieIsSecure(process.env)) {
    warnOnce('secure-cookie',
      'cookies are being issued with Secure, but this request arrived over plain HTTP.',
      'The browser will accept the session cookie and never send it back: signing in',
      'appears to work and lands straight back on the sign-in page.',
      'Terminate TLS in front of this and forward X-Forwarded-Proto: https — or, knowing',
      'what it costs, set FORCE_SECURE_COOKIE=0 until there is a certificate.');
  }
}

/** The headers every response carries, whatever it is serving. */
function baseHeaders(req, res, next) {
  checkDeployment(req);
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('Permissions-Policy', PERMISSIONS_POLICY);
  /* CSP frame-ancestors already says this to anything modern; X-Frame-Options is
     for the browsers that do not read it. Keep both in step. */
  res.setHeader('X-Frame-Options', 'SAMEORIGIN');
  res.setHeader('Cross-Origin-Opener-Policy', 'same-origin');
  res.setHeader('Cross-Origin-Resource-Policy', 'same-origin');
  res.setHeader('X-Permitted-Cross-Domain-Policies', 'none');

  /* HSTS only over a connection that is already HTTPS. Sent over plain HTTP it
     is ignored by browsers, and sending it in development would pin localhost
     to HTTPS in the developer's own browser for a year. req.secure follows
     X-Forwarded-Proto only as far as TRUST_PROXY allows, so behind a correctly
     configured proxy this is the real scheme rather than whatever was claimed. */
  if (req.secure) res.setHeader('Strict-Transport-Security', HSTS);

  if (req.path.startsWith('/api')) {
    res.setHeader('Content-Security-Policy', API_CSP);
    /* A JSON body that a browser is willing to treat as a document is the whole
       basis of the old JSON-hijacking trick. Say what it is, once, centrally. */
    res.setHeader('X-Robots-Tag', 'noindex, nofollow');
  }
  next();
}

/* ---------------------------- Write throttle ---------------------------- */

/* A ceiling, not a quota: an administrator working quickly, or an exam runner
   autosaving on a debounce, must never meet it. What it stops is a script — a
   credential-stuffing loop, a code-guessing sweep, a bulk-delete run against a
   stolen session. Endpoints that need a tighter limit still set their own
   inside the handler; this is the floor underneath all of them. */
const WRITE_PER_MIN = Math.max(1, parseInt(process.env.WRITE_PER_MIN, 10) || 300);
const WINDOW_MS = 60e3;
const SAFE = ['GET', 'HEAD', 'OPTIONS'];

/* Keyed on the session cookie rather than the resolved account, so the limiter
   costs no database lookup: whoever holds the cookie is who is being counted,
   which is exactly the unit a stolen session is spent in. Hashed because a
   session token should not sit in an in-process map key. Signed out, the key
   falls back to the address. */
function writeKey(req) {
  const c = A.parseCookies(req);
  const session = c.prep_admin || c.prep_user || '';
  const who = session
    ? crypto.createHash('sha256').update(session).digest('hex').slice(0, 16)
    : 'anon';
  return 'write|' + (req.ip || '?') + '|' + who;
}

async function writeLimit(req, res, next) {
  if (SAFE.includes(req.method)) return next();
  const wait = await A.rateLimit(writeKey(req), WRITE_PER_MIN, WINDOW_MS);
  if (wait) {
    res.setHeader('Retry-After', String(wait));
    return res.status(429).json({
      error: 'Too many requests. Wait ' + wait + ' second' + (wait === 1 ? '' : 's') + ' and try again.'
    });
  }
  next();
}

module.exports = {
  baseHeaders, writeLimit, writeKey,
  checkDeployment, resetWarnings,
  resolveTrustProxy, TRUST_PROXY,
  PERMISSIONS_POLICY, API_CSP, HSTS, WRITE_PER_MIN, WINDOW_MS
};
