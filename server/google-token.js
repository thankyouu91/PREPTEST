/**
 * An OAuth2 access token for a Google API, minted without a client library.
 *
 * Cloud Storage is the first caller; Gemini, Cloud SQL and Secret Manager all
 * want the same thing, which is why this is its own file rather than a private
 * corner of server/storage.js.
 *
 * ## Where the credential comes from
 *
 * Two sources, checked in that order, both of them the way Google's own tools
 * do it:
 *
 *  1. **A service-account key.** `GOOGLE_SERVICE_ACCOUNT_JSON` holds the JSON
 *     itself (raw, or base64 for an environment that dislikes newlines), or
 *     `GOOGLE_APPLICATION_CREDENTIALS` points at the file. The key signs a JWT
 *     which is exchanged for an access token — RFC 7523, and `node:crypto`
 *     signs RS256 without help.
 *  2. **The metadata server.** On Cloud Run and GCE there is no key at all:
 *     the platform hands out tokens for the attached service account over an
 *     unauthenticated link only reachable from inside the instance. This is the
 *     better deployment — a key that does not exist cannot leak — and it is
 *     what the Cloud Run item in the roadmap will use.
 *
 * Neither present means not configured, and callers decide what to do about
 * that. Nothing here invents a credential or half-works without one.
 *
 * ## Two things this file must never do
 *
 *  · Log a token, an assertion or a private key. Errors carry the HTTP status
 *    and a truncated response body, never the request.
 *  · Mint a token per request. Tokens last an hour; they are cached until a
 *    minute before expiry, and concurrent callers share one refresh rather than
 *    starting four.
 */
'use strict';

const fs = require('node:fs');
const crypto = require('node:crypto');

const TOKEN_URI = 'https://oauth2.googleapis.com/token';
const JWT_GRANT = 'urn:ietf:params:oauth:grant-type:jwt-bearer';
/** Refresh this long before expiry, so a request never carries a token that
    dies in flight. */
const SKEW_MS = 60 * 1000;

const b64url = buf => Buffer.from(buf).toString('base64url');

/**
 * The metadata server's address. `GCE_METADATA_HOST` is Google's own override
 * and is what an emulator or a test points somewhere else.
 */
function metadataHost() {
  return process.env.GCE_METADATA_HOST || 'metadata.google.internal';
}

/** Cloud Run sets K_SERVICE. Used as the signal rather than probing the
    metadata server on every boot, which costs a timeout everywhere else. */
function metadataAvailable() {
  return !!(process.env.GCE_METADATA_HOST || process.env.K_SERVICE);
}

/**
 * Read and check the service-account key.
 *
 * Returns null when none is configured; throws when one is configured but
 * unusable, because a malformed key is a deployment mistake worth stopping for
 * rather than quietly falling through to "not configured".
 */
function serviceAccount() {
  const inline = process.env.GOOGLE_SERVICE_ACCOUNT_JSON || '';
  const file = process.env.GOOGLE_APPLICATION_CREDENTIALS || '';
  let text = '';

  if (inline) {
    /* Base64 is allowed because a PEM inside an env var is a fight in most
       deployment UIs. Detected by shape, not by a second switch to get wrong. */
    text = /^[A-Za-z0-9+/=\s]+$/.test(inline) && !inline.trim().startsWith('{')
      ? Buffer.from(inline, 'base64').toString('utf8')
      : inline;
  } else if (file) {
    try { text = fs.readFileSync(file, 'utf8'); }
    catch (e) { throw new Error(`GOOGLE_APPLICATION_CREDENTIALS is set but ${file} could not be read`); }
  } else {
    return null;
  }

  let cred;
  try { cred = JSON.parse(text); }
  catch (e) { throw new Error('The Google service-account credential is not valid JSON'); }

  /* Named individually: "invalid credential" sends somebody hunting through a
     file they cannot paste into a chat window. */
  if (!cred.client_email) throw new Error('The service-account credential has no client_email');
  if (!cred.private_key) throw new Error('The service-account credential has no private_key');
  if (!/-----BEGIN [A-Z ]*PRIVATE KEY-----/.test(cred.private_key)) {
    throw new Error('The service-account private_key is not a PEM block');
  }
  return cred;
}

/** Which of the two sources is in play: 'service-account', 'metadata' or null. */
function credentialSource() {
  if (process.env.GOOGLE_SERVICE_ACCOUNT_JSON || process.env.GOOGLE_APPLICATION_CREDENTIALS) {
    return 'service-account';
  }
  return metadataAvailable() ? 'metadata' : null;
}

/** True when a token could be obtained at all. */
function configured() {
  return credentialSource() !== null;
}

/**
 * The signed JWT that is traded for an access token (RFC 7523 §2.1).
 * Exported because it is the one piece here that can be checked exactly: a test
 * verifies the signature against the public half of a key it generated itself.
 */
function signAssertion(cred, scope, nowMs) {
  const iat = Math.floor((nowMs === undefined ? Date.now() : nowMs) / 1000);
  const header = { alg: 'RS256', typ: 'JWT' };
  if (cred.private_key_id) header.kid = cred.private_key_id;
  const claims = {
    iss: cred.client_email,
    scope,
    aud: cred.token_uri || TOKEN_URI,
    /* An hour is the maximum Google accepts, and the assertion is used once
       and immediately — its lifetime is not the access token's. */
    exp: iat + 3600,
    iat
  };
  const body = `${b64url(JSON.stringify(header))}.${b64url(JSON.stringify(claims))}`;
  const signature = crypto.createSign('RSA-SHA256').update(body).sign(cred.private_key);
  return `${body}.${b64url(signature)}`;
}

/** Trade the assertion for an access token. */
async function fromServiceAccount(cred, scope) {
  const uri = cred.token_uri || TOKEN_URI;
  const res = await fetch(uri, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ grant_type: JWT_GRANT, assertion: signAssertion(cred, scope) }).toString()
  });
  const text = await res.text();
  if (!res.ok) throw new Error(`Google token request failed: ${res.status} ${text.slice(0, 200)}`);
  let body;
  try { body = JSON.parse(text); } catch (e) { throw new Error('Google token response was not JSON'); }
  if (!body.access_token) throw new Error('Google token response carried no access_token');
  return { token: body.access_token, expiresInSeconds: Number(body.expires_in) || 3600 };
}

/**
 * Ask the platform for the attached service account's token.
 *
 * The scope is decided by what was attached to the instance, not by the caller,
 * so it is not sent — asking for a scope the instance does not have would fail
 * where the instance's own scope would have worked.
 */
async function fromMetadata() {
  const url = `http://${metadataHost()}/computeMetadata/v1/instance/service-accounts/default/token`;
  const res = await fetch(url, { headers: { 'Metadata-Flavor': 'Google' } });
  if (!res.ok) throw new Error(`Metadata server refused a token: ${res.status}`);
  const body = await res.json().catch(() => null);
  if (!body || !body.access_token) throw new Error('Metadata server returned no access_token');
  return { token: body.access_token, expiresInSeconds: Number(body.expires_in) || 3600 };
}

/* One entry per scope: { token, expiresAt, pending }. `pending` is what stops
   four parallel uploads from minting four tokens. */
const cache = new Map();

/** Throw away every cached token. For tests, and for a credential rotation. */
function resetCache() { cache.clear(); }

/**
 * An access token for `scope`, cached until shortly before it expires.
 * @returns {Promise<string>}
 */
async function accessToken(scope) {
  const source = credentialSource();
  if (!source) throw new Error('No Google credential is configured');

  const key = `${source}:${scope}`;
  const hit = cache.get(key);
  const now = Date.now();
  if (hit && hit.token && now < hit.expiresAt - SKEW_MS) return hit.token;
  if (hit && hit.pending) return hit.pending;

  const pending = (async () => {
    const got = source === 'service-account'
      ? await fromServiceAccount(serviceAccount(), scope)
      : await fromMetadata();
    cache.set(key, { token: got.token, expiresAt: Date.now() + got.expiresInSeconds * 1000 });
    return got.token;
  })().catch(e => {
    /* A failed mint must not leave a promise in the cache that every later
       caller then awaits and re-throws for the rest of the process's life. */
    cache.delete(key);
    throw e;
  });

  cache.set(key, { pending });
  return pending;
}

module.exports = {
  accessToken, configured, credentialSource, resetCache,
  serviceAccount, signAssertion, metadataHost, TOKEN_URI, SKEW_MS
};
