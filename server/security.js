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

/** The headers every response carries, whatever it is serving. */
function baseHeaders(req, res, next) {
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

function writeLimit(req, res, next) {
  if (SAFE.includes(req.method)) return next();
  const wait = A.rateLimit(writeKey(req), WRITE_PER_MIN, WINDOW_MS);
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
  resolveTrustProxy, TRUST_PROXY,
  PERMISSIONS_POLICY, API_CSP, HSTS, WRITE_PER_MIN, WINDOW_MS
};
