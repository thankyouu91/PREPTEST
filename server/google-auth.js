/**
 * Google Sign-In, done as a server-side OAuth 2.0 redirect.
 *
 * Why not the drop-in button: the usual "Sign in with Google" widget loads
 * accounts.google.com/gsi/client, and this platform runs a strict CSP with no
 * external scripts. Rather than punch a hole in the CSP for a third-party
 * script, the whole exchange happens on the server:
 *
 *   /auth/google            -> 302 to Google with state + nonce
 *   /auth/google/callback   <- Google returns code + state
 *                              server swaps code for an id_token, reads it,
 *                              finds or creates the account, starts a session
 *
 * The browser never runs a line of Google code and never sees a token.
 *
 * Configuration. Nothing here needs a key at build time: with no
 * GOOGLE_CLIENT_ID / GOOGLE_CLIENT_SECRET the routes report the feature as off
 * and the platform keeps working on email + password.
 *
 *   GOOGLE_CLIENT_ID       OAuth client id (Web application)
 *   GOOGLE_CLIENT_SECRET   OAuth client secret
 *   GOOGLE_REDIRECT_URI    optional; defaults to <this origin>/auth/google/callback
 *
 * On verifying the id_token: it is read straight from Google's token endpoint
 * over TLS, on the server, in response to a request the server itself made.
 * Google documents that a token obtained that way does not need its signature
 * checked, because the transport already authenticates the issuer. What does
 * still get checked here is everything that binds the token to THIS login
 * attempt: issuer, audience, expiry, and the nonce this server generated.
 */
'use strict';

const crypto = require('node:crypto');
const express = require('express');
const { q, nowISO } = require('./db');
const A = require('./auth');

const router = express.Router();

const CLIENT_ID = process.env.GOOGLE_CLIENT_ID || '';
const CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET || '';
const AUTH_ENDPOINT = 'https://accounts.google.com/o/oauth2/v2/auth';
const TOKEN_ENDPOINT = 'https://oauth2.googleapis.com/token';
const ISSUERS = ['accounts.google.com', 'https://accounts.google.com'];
const STATE_COOKIE = 'prep_oauth';
const STATE_TTL_SECONDS = 600;
const LOGIN_PAGE = '/prep/dang-nhap/';

/** Configured and therefore offerable. Checked at request time, not import
    time, so a restart with new environment variables is all it takes. */
function enabled() {
  return !!(CLIENT_ID && CLIENT_SECRET);
}

function redirectUri(req) {
  if (process.env.GOOGLE_REDIRECT_URI) return process.env.GOOGLE_REDIRECT_URI;
  const proto = (req.headers['x-forwarded-proto'] || req.protocol || 'http').split(',')[0].trim();
  return `${proto}://${req.get('host')}/auth/google/callback`;
}

/**
 * Only ever redirect to a path on this site.
 *
 * A bare "starts with /" test is not enough: "//evil.example" is a
 * protocol-relative URL and browsers treat it as another origin, which is how
 * open redirects get built. Backslashes are normalised to slashes by some
 * browsers, so they are refused too.
 */
function safeNext(value) {
  const v = typeof value === 'string' ? value : '';
  if (!v.startsWith('/') || v.startsWith('//') || v.startsWith('/\\')) return '/prep/';
  if (/[\x00-\x1f\\]/.test(v)) return '/prep/';
  return v.slice(0, 300);
}

const b64url = buf => Buffer.from(buf).toString('base64url');

/** Compare in constant time, and without throwing on length mismatch. */
function sameSecret(a, b) {
  const x = Buffer.from(String(a || ''));
  const y = Buffer.from(String(b || ''));
  if (!x.length || x.length !== y.length) return false;
  return crypto.timingSafeEqual(x, y);
}

/* The state cookie must be SameSite=Lax, not Strict: it has to survive the
   top-level redirect back from Google, and a Strict cookie is withheld on a
   cross-site navigation. Lax is exactly the case it was designed for — sent on
   top-level GET navigations, withheld everywhere else. */
function stashState(res, payload) {
  A.setCookie(res, STATE_COOKIE, b64url(JSON.stringify(payload)), {
    maxAge: STATE_TTL_SECONDS, sameSite: 'Lax'
  });
}

function readState(req) {
  const raw = A.parseCookies(req)[STATE_COOKIE];
  if (!raw) return null;
  try { return JSON.parse(Buffer.from(raw, 'base64url').toString('utf8')); } catch (e) { return null; }
}

function clearState(res) {
  A.setCookie(res, STATE_COOKIE, '', { maxAge: 0, sameSite: 'Lax' });
}

/**
 * Hand the browser back to the app after a successful sign-in.
 *
 * Not a plain 302: the session cookie is SameSite=Strict, and a redirect that
 * is still part of the navigation Google started counts as cross-site, so the
 * very first page load would arrive without the cookie and bounce the student
 * straight back to the login screen. A meta refresh starts a fresh navigation
 * from a document on this origin, which is same-site, so the cookie goes with
 * it. It also needs no script, so the CSP stays untouched.
 */
function handOff(res, to) {
  const url = to.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;');
  res.set('Content-Type', 'text/html; charset=utf-8').set('Cache-Control', 'no-store').send(
    `<!doctype html><html lang="en"><head><meta charset="utf-8">` +
    `<meta http-equiv="refresh" content="0;url=${url}">` +
    `<title>Signing you in…</title></head>` +
    `<body><p>Signing you in… <a href="${url}">Continue</a></p></body></html>`
  );
}

function failed(res, reason) {
  clearState(res);
  res.redirect(302, `${LOGIN_PAGE}?oauth=${encodeURIComponent(reason)}`);
}

/* ---------------------------------------------------------------- *
 * Account lookup, linking and creation
 * ---------------------------------------------------------------- */

/**
 * Turn an email address into a free username.
 *
 * Google accounts have no username, but the rest of the platform is built
 * around one, so derive it from the local part and add a counter when taken.
 */
/* In server/auth.js since an administrator creating an account needs it too. */
const freeUsername = A.freeUsername;

/**
 * Find the account this Google identity belongs to, creating one if needed.
 *
 * Three cases, in order:
 *   1. Already linked  — matched on the Google subject id, which never changes
 *      even if the person renames their email.
 *   2. Same email      — an existing password account. Link it, so nobody ends
 *      up with two accounts and half their purchases in each. Only done when
 *      Google says the address is verified; otherwise anyone who could create
 *      a Google account on someone else's address could take over theirs.
 *   3. Brand new       — create it, already verified, with no password. Such an
 *      account signs in with Google only until the owner sets a password
 *      through the normal reset flow.
 */
function findOrCreateUser(claims) {
  const email = String(claims.email || '').toLowerCase();
  const sub = String(claims.sub || '');
  const name = String(claims.name || email.split('@')[0] || 'Student').slice(0, 80);

  const linked = q.get('SELECT * FROM users WHERE google_sub=?', sub);
  if (linked) return { user: linked, created: false, linked: false };

  const byEmail = q.get('SELECT * FROM users WHERE lower(email)=?', email);
  if (byEmail) {
    q.run('UPDATE users SET google_sub=?, verified=1 WHERE id=?', sub, byEmail.id);
    return { user: q.get('SELECT * FROM users WHERE id=?', byEmail.id), created: false, linked: true };
  }

  const username = freeUsername(email);
  const r = q.run(
    `INSERT INTO users (username, email, name, pass_hash, verified, status, interests_json, created_at, google_sub)
     VALUES (?,?,?,NULL,1,'active','[]',?,?)`,
    username, email, name, nowISO(), sub);
  return { user: q.get('SELECT * FROM users WHERE id=?', Number(r.lastInsertRowid)), created: true, linked: false };
}

/* ---------------------------------------------------------------- *
 * Routes
 * ---------------------------------------------------------------- */

router.get('/auth/google', (req, res) => {
  if (!enabled()) return failed(res, 'disabled');

  /* state defends the callback against a forged request; nonce binds the
     id_token to this particular attempt. Both are random per sign-in. */
  const state = crypto.randomBytes(24).toString('base64url');
  const nonce = crypto.randomBytes(24).toString('base64url');
  stashState(res, { s: state, n: nonce, next: safeNext(req.query.next) });

  const params = new URLSearchParams({
    client_id: CLIENT_ID,
    redirect_uri: redirectUri(req),
    response_type: 'code',
    scope: 'openid email profile',
    state, nonce,
    /* Always show the chooser: on a shared machine, silently reusing the last
       Google session is how one student ends up inside another's account. */
    prompt: 'select_account'
  });
  res.redirect(302, `${AUTH_ENDPOINT}?${params}`);
});

router.get('/auth/google/callback', async (req, res) => {
  if (!enabled()) return failed(res, 'disabled');

  const stash = readState(req);
  clearState(res);

  if (req.query.error) return failed(res, 'cancelled');
  if (!stash || !sameSecret(req.query.state, stash.s)) return failed(res, 'state');
  const code = typeof req.query.code === 'string' ? req.query.code : '';
  if (!code) return failed(res, 'code');

  try {
    const tokenRes = await fetch(TOKEN_ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code,
        client_id: CLIENT_ID,
        client_secret: CLIENT_SECRET,
        redirect_uri: redirectUri(req),
        grant_type: 'authorization_code'
      })
    });
    if (!tokenRes.ok) {
      console.error('[google] token exchange failed', tokenRes.status, await tokenRes.text());
      return failed(res, 'exchange');
    }
    const token = await tokenRes.json();
    const claims = readIdToken(token.id_token);
    if (!claims) return failed(res, 'token');

    const now = Math.floor(Date.now() / 1000);
    if (!ISSUERS.includes(claims.iss)) return failed(res, 'issuer');
    if (claims.aud !== CLIENT_ID) return failed(res, 'audience');
    if (!(Number(claims.exp) > now - 60)) return failed(res, 'expired');
    if (!sameSecret(claims.nonce, stash.n)) return failed(res, 'nonce');
    /* An unverified address proves nothing about who owns it. */
    if (claims.email_verified !== true && claims.email_verified !== 'true') return failed(res, 'unverified');
    if (!claims.email || !claims.sub) return failed(res, 'claims');

    const { user, created, linked } = findOrCreateUser(claims);
    if (user.status !== 'active') return failed(res, 'locked');

    A.createUserSession(user.id, req, res);
    q.run('UPDATE users SET last_login_at=? WHERE id=?', nowISO(), user.id);
    logSignIn(req, user, created ? 'user.login.google.created' : linked ? 'user.login.google.linked' : 'user.login.google');
    handOff(res, safeNext(stash.next));
  } catch (e) {
    console.error('[google] callback failed', e);
    failed(res, 'server');
  }
});

/** Read the payload of a JWT without verifying its signature — see the note at
    the top of this file for why that is the correct call here. */
function readIdToken(idToken) {
  if (typeof idToken !== 'string') return null;
  const parts = idToken.split('.');
  if (parts.length !== 3) return null;
  try { return JSON.parse(Buffer.from(parts[1], 'base64url').toString('utf8')); } catch (e) { return null; }
}

function logSignIn(req, user, action) {
  try {
    q.run('INSERT INTO audit (admin_id, admin_name, action, target, meta_json, ip, at) VALUES (NULL,?,?,?,?,?,?)',
      user.username, action, 'users/' + user.id, '{}', req.ip || null, nowISO());
  } catch (e) { /* auditing must never break a login */ }
}

module.exports = { router, enabled, safeNext, freeUsername };
