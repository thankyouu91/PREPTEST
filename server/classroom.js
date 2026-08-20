/**
 * Google Classroom, on behalf of a teacher.
 *
 * The other Google integrations on this platform speak as the *server*: Cloud
 * Storage and Gemini use a service account, which is a machine identity with
 * its own permissions. Classroom cannot work that way — a course belongs to a
 * teacher, and there is no machine that is a member of it. So this is the one
 * integration where an administrator has to grant the platform standing
 * permission to act as them, and the shape of the file follows from that.
 *
 * ## The flow
 *
 *   /auth/google/classroom            (requireAdmin) -> Google's consent screen
 *   /auth/google/classroom/callback   <- code, swapped for a REFRESH token
 *
 * `access_type=offline` is what makes Google return a refresh token, and
 * `prompt=consent` is what makes it return one *again* on a re-link — Google
 * issues a refresh token only on the first consent, so without it a re-link
 * silently produces a grant with no way to renew itself.
 *
 * ## Least privilege, and why the scopes are short
 *
 * Only read scopes are asked for here: courses and rosters. Publishing
 * coursework and pushing grades need `classroom.coursework.students`, and that
 * is asked for when that feature exists — Google's incremental authorisation
 * is designed for exactly this, and a scope requested before it is used is a
 * permission the teacher granted for nothing.
 *
 * ## The refresh token is encrypted at rest
 *
 * A refresh token is not like the TOTP secret this database already holds. A
 * TOTP secret is useless without the password; a refresh token is, on its own,
 * a way into somebody's Google account until they revoke it — and this row is
 * in every database export and every backup. So it is sealed with AES-256-GCM
 * under TOKEN_ENCRYPTION_KEY, and **with no key the feature reports itself off
 * rather than storing the token in the clear.** That is the one place this
 * module refuses to degrade gracefully, deliberately: a fallback here would
 * mean the least secure deployment is the one that took no action.
 *
 * ## Configuration
 *
 *   GOOGLE_CLIENT_ID / GOOGLE_CLIENT_SECRET   shared with Sign-In
 *   TOKEN_ENCRYPTION_KEY                      32 bytes, base64
 *   GOOGLE_CLASSROOM_REDIRECT_URI             optional; defaults to this origin
 *
 * With any of them missing the platform runs exactly as it does today and the
 * admin screen offers to connect rather than pretending to be connected.
 */
'use strict';

const crypto = require('node:crypto');
const { q, nowISO } = require('./db');

const TOKEN_ENDPOINT = 'https://oauth2.googleapis.com/token';
const REVOKE_ENDPOINT = 'https://oauth2.google.com/revoke';
const API = () => (process.env.CLASSROOM_API || 'https://classroom.googleapis.com').replace(/\/+$/, '');

/** Read-only for now. See "Least privilege" above before adding to this. */
const SCOPES = [
  'https://www.googleapis.com/auth/classroom.courses.readonly',
  'https://www.googleapis.com/auth/classroom.rosters.readonly',
  'https://www.googleapis.com/auth/classroom.profile.emails'
];

/* Read at call time, never captured at import — server/secrets.js merges
   Secrets Manager values into the environment after this module is required.
   scripts/test-secrets.mjs fails the build if this becomes a constant. */
const clientId = () => process.env.GOOGLE_CLIENT_ID || '';
const clientSecret = () => process.env.GOOGLE_CLIENT_SECRET || '';
const tokenEndpoint = () => process.env.GOOGLE_TOKEN_ENDPOINT || TOKEN_ENDPOINT;

/* ------------------------------ Sealing ------------------------------ */

/* Sealing moved to server/sealed.js the day a second caller appeared - the AI
   marking key needs the same envelope, and two implementations of it is how a
   database ends up with rows only one of them can open. The three names below
   are kept so the rest of this file reads as it did. */
const sealed = require('./sealed');
const encryptionKey = sealed.encryptionKey;
const seal = t => sealed.seal(t, 'a refresh token');
const open = t => sealed.open(t, 'a stored refresh token');

/* ------------------------------ State ------------------------------ */

/** Everything needed before an administrator can be offered the button. */
function missing() {
  const gaps = [];
  if (!clientId() || !clientSecret()) gaps.push('GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET');
  try {
    if (!encryptionKey()) gaps.push('TOKEN_ENCRYPTION_KEY');
  } catch (e) {
    gaps.push(e.message);
  }
  return gaps;
}

function enabled() { return missing().length === 0; }

function redirectUri(req) {
  if (process.env.GOOGLE_CLASSROOM_REDIRECT_URI) return process.env.GOOGLE_CLASSROOM_REDIRECT_URI;
  const proto = (req.headers['x-forwarded-proto'] || req.protocol || 'http').split(',')[0].trim();
  return `${proto}://${req.get('host')}/auth/google/classroom/callback`;
}

/** The consent URL for one administrator. */
function consentUrl({ redirectUri: uri, state }) {
  const params = new URLSearchParams({
    client_id: clientId(),
    redirect_uri: uri,
    response_type: 'code',
    scope: SCOPES.join(' '),
    state,
    /* offline is what returns a refresh token at all; consent is what returns
       one AGAIN on a re-link, because Google issues it only on first consent.
       Without the second, re-linking produces a grant that cannot renew. */
    access_type: 'offline',
    prompt: 'consent',
    /* Keeps whatever the teacher has already granted instead of replacing it,
       so adding the coursework scope later does not revoke these. */
    include_granted_scopes: 'true'
  });
  return `https://accounts.google.com/o/oauth2/v2/auth?${params}`;
}

/* --------------------------- The grant row --------------------------- */

async function grantFor(adminId) {
  return q.get('SELECT * FROM google_grants WHERE admin_id=?', adminId);
}

/** What the admin screen may know: never the token, not even its length. */
async function status(adminId) {
  const gaps = missing();
  if (gaps.length) return { enabled: false, linked: false, missing: gaps, scopes: SCOPES };
  const grant = await grantFor(adminId);
  return {
    enabled: true,
    linked: !!grant,
    email: grant ? grant.email : null,
    scopes: grant ? String(grant.scopes).split(' ').filter(Boolean) : SCOPES,
    linkedAt: grant ? grant.updated_at : null
  };
}

/** Store or replace one administrator's grant. */
async function saveGrant(adminId, { refreshToken, email, scope }) {
  if (!refreshToken) throw new Error('Google returned no refresh token');
  const at = nowISO();
  await q.run(
    `INSERT INTO google_grants (admin_id, email, scopes, token_enc, created_at, updated_at)
     VALUES (?,?,?,?,?,?)
     ON CONFLICT(admin_id) DO UPDATE SET
       email=excluded.email, scopes=excluded.scopes,
       token_enc=excluded.token_enc, updated_at=excluded.updated_at`,
    adminId, email || null, scope || SCOPES.join(' '), seal(refreshToken), at, at);
  cache.delete(adminId);
}

/** Forget the grant. Best-effort revoke at Google first, then drop the row. */
async function unlink(adminId) {
  const grant = await grantFor(adminId);
  if (!grant) return false;
  try {
    const token = open(grant.token_enc);
    await fetch(`${process.env.GOOGLE_REVOKE_ENDPOINT || REVOKE_ENDPOINT}?token=${encodeURIComponent(token)}`,
      { method: 'POST' });
  } catch (e) {
    /* A revoke that fails must not leave the row behind: the administrator
       asked to disconnect, and keeping a token we could not revoke is the
       worst of both. Logged without the reason, which can echo the token. */
    console.warn('[classroom] could not revoke at Google; dropping the stored grant anyway');
  }
  await q.run('DELETE FROM google_grants WHERE admin_id=?', adminId);
  cache.delete(adminId);
  return true;
}

/* --------------------------- Access tokens --------------------------- */

/** adminId -> { token, expiresAt, pending }. One refresh, not four. */
const cache = new Map();
const SKEW_MS = 60 * 1000;

function resetCache() { cache.clear(); }

/**
 * Swap the stored refresh token for a short-lived access token.
 *
 * Google's error body echoes the request, so only the status and the
 * `error` field travel out of here — never the response text.
 */
async function newAccessToken(refreshToken) {
  const res = await fetch(tokenEndpoint(), {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: clientId(),
      client_secret: clientSecret(),
      refresh_token: refreshToken,
      grant_type: 'refresh_token'
    }).toString()
  });
  const body = await res.json().catch(() => null);
  if (!res.ok || !body || !body.access_token) {
    const code = (body && body.error) || `HTTP ${res.status}`;
    /* invalid_grant means the teacher revoked it, or changed their password,
       or it simply expired. It will never work again, so say what to do. */
    if (code === 'invalid_grant') {
      throw new Error('Google no longer accepts this connection — reconnect the Classroom account');
    }
    throw new Error(`Google refused to renew the Classroom token: ${code}`);
  }
  return { token: body.access_token, expiresInSeconds: Number(body.expires_in) || 3600 };
}

async function accessTokenFor(adminId) {
  const hit = cache.get(adminId);
  const now = Date.now();
  if (hit && hit.token && now < hit.expiresAt - SKEW_MS) return hit.token;
  if (hit && hit.pending) return hit.pending;

  const pending = (async () => {
    const grant = await grantFor(adminId);
    if (!grant) throw new Error('This administrator has not connected a Google Classroom account');
    const got = await newAccessToken(open(grant.token_enc));
    cache.set(adminId, { token: got.token, expiresAt: Date.now() + got.expiresInSeconds * 1000 });
    return got.token;
  })().catch(e => {
    /* A failed refresh must not leave a rejected promise in the cache that
       every later caller awaits and re-throws for the life of the process. */
    cache.delete(adminId);
    throw e;
  });

  cache.set(adminId, { pending });
  return pending;
}

/* ----------------------------- The API ----------------------------- */

async function call(adminId, path, params) {
  const token = await accessTokenFor(adminId);
  const url = new URL(API() + path);
  for (const [k, v] of Object.entries(params || {})) if (v !== undefined) url.searchParams.set(k, v);
  const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
  if (!res.ok) {
    const body = await res.json().catch(() => null);
    const reason = (body && body.error && body.error.message) || `HTTP ${res.status}`;
    if (res.status === 403) throw new Error(`Google Classroom refused the request: ${reason}`);
    throw new Error(`Google Classroom request failed: ${reason}`);
  }
  return res.json();
}

/**
 * Every page of a list endpoint, to a bound.
 *
 * The bound is not decoration: a teacher with a mistyped filter, or an account
 * on a large domain, would otherwise walk pages until the request times out
 * with nothing to show for it. What was dropped is reported rather than
 * silently truncated.
 */
async function pages(adminId, path, key, params, max = 500) {
  const out = [];
  let pageToken;
  let more = false;
  for (let i = 0; i < 20; i++) {
    const body = await call(adminId, path, Object.assign({ pageSize: 100, pageToken }, params));
    out.push(...(body[key] || []));
    pageToken = body.nextPageToken;
    if (!pageToken) break;
    if (out.length >= max) { more = true; break; }
  }
  return { items: out.slice(0, max), more: more || out.length > max };
}

/** The teacher's active courses. */
async function courses(adminId) {
  const { items, more } = await pages(adminId, '/v1/courses', 'courses',
    { courseStates: 'ACTIVE', teacherId: 'me' });
  return {
    more,
    courses: items.map(c => ({
      id: c.id,
      name: c.name,
      section: c.section || null,
      room: c.room || null,
      enrolmentCode: c.enrollmentCode || null,
      link: c.alternateLink || null,
      state: c.courseState || null
    }))
  };
}

/**
 * One course's students.
 *
 * The email address is the only field worth having — it is what links a
 * Classroom student to an account here — and it is only present when the
 * teacher granted `classroom.profile.emails`, so a missing one is reported as
 * missing rather than as an empty string.
 */
async function roster(adminId, courseId) {
  const { items, more } = await pages(adminId, `/v1/courses/${encodeURIComponent(courseId)}/students`, 'students');
  const students = items.map(s => {
    const p = s.profile || {};
    return {
      userId: s.userId || (p.id || null),
      name: (p.name && (p.name.fullName || p.name.givenName)) || null,
      email: p.emailAddress || null,
      photo: null                       // deliberately not passed on: not needed, and it is personal data
    };
  });
  /* Matched against local accounts here rather than in the browser: the
     browser would have to be handed every student's email to do it. */
  const emails = students.map(s => s.email).filter(Boolean);
  const known = new Map();
  if (emails.length) {
    const holes = emails.map(() => '?').join(',');
    for (const row of await q.all(
      `SELECT id, email, name FROM users WHERE lower(email) IN (${holes})`,
      ...emails.map(e => e.toLowerCase()))) {
      known.set(String(row.email).toLowerCase(), row);
    }
  }
  return {
    more,
    students: students.map(s => {
      const match = s.email ? known.get(s.email.toLowerCase()) : null;
      return Object.assign({}, s, {
        localUserId: match ? match.id : null,
        localName: match ? match.name : null
      });
    })
  };
}

module.exports = {
  SCOPES, enabled, missing, status, consentUrl, redirectUri,
  saveGrant, grantFor, unlink, accessTokenFor, resetCache,
  courses, roster,
  /* Exported for the tests: sealing is the part that must be provably
     reversible and provably tamper-evident. */
  seal, open, encryptionKey
};
