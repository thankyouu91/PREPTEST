/**
 * Signature Version 4, and the credential it is signed with.
 *
 * S3 is the first caller; Secrets Manager wants exactly the same thing, which
 * is why this is its own file rather than a private corner of
 * server/storage.js — the same reasoning as server/google-token.js, and
 * deliberately the same shape, so whoever has read one has read both.
 *
 * ## No SDK
 *
 * `@aws-sdk/client-s3` is around 90 packages to make three HTTP calls, and the
 * signing it does is the 120 lines below. `node:crypto` has SHA-256 and HMAC,
 * and `fetch` has the rest. The standing constraint is "no new runtime
 * dependency unless genuinely unavoidable"; this one is avoidable, and the
 * proof is that the signature this file produces is checked against AWS's own
 * published test vector in scripts/test-s3.mjs.
 *
 * ## Where the credential comes from
 *
 * Three sources, checked in this order, the same order and the same places the
 * AWS tools look:
 *
 *  1. **Static keys** — `AWS_ACCESS_KEY_ID` + `AWS_SECRET_ACCESS_KEY`, plus
 *     `AWS_SESSION_TOKEN` when they are temporary. Simple, and the worst of the
 *     three: a long-lived key in an environment variable is a key that can leak.
 *  2. **The container credential provider** — ECS, Fargate and App Runner set
 *     `AWS_CONTAINER_CREDENTIALS_RELATIVE_URI`, and the task role's temporary
 *     keys come from a link-local address reachable only from inside the task.
 *  3. **The instance metadata service** — EC2, IMDSv2 only: a token is taken
 *     with a PUT first, and every read carries it. IMDSv1 is a plain GET that
 *     any server-side request forgery on the box can also make, which is how
 *     instance credentials get stolen; it is not implemented here at all.
 *
 * 2 and 3 are the ones worth deploying with. A credential that does not exist
 * as a stored secret cannot leak from one, and both rotate on their own.
 *
 * Nothing here invents a credential. No credential configured means not
 * configured, and the caller decides what to do about that.
 *
 * ## Two things this file must never do
 *
 *  · Log a secret access key, a session token or an Authorization header.
 *    Errors carry the HTTP status and a truncated body, never the request.
 *  · Fetch temporary credentials per request. They last hours; they are cached
 *    until shortly before expiry, and concurrent callers share one refresh.
 */
'use strict';

const crypto = require('node:crypto');

const ALGORITHM = 'AWS4-HMAC-SHA256';
const TERMINATOR = 'aws4_request';
/** Refresh this long before expiry, so a request never carries a credential
    that dies in flight. */
const SKEW_MS = 5 * 60 * 1000;

const sha256hex = data => crypto.createHash('sha256').update(data).digest('hex');
const hmac = (key, data) => crypto.createHmac('sha256', key).update(data, 'utf8').digest();

/** 20130524T000000Z — ISO 8601 basic, which is the only form SigV4 accepts. */
function amzDate(when) {
  return new Date(when === undefined ? Date.now() : when)
    .toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
}

/**
 * Percent-encode for SigV4.
 *
 * Not `encodeURIComponent`: that leaves `!'()*` alone and AWS does not, so a
 * key containing one would be signed differently from the way it is sent and
 * every request carrying it would come back 403 — with a message that names
 * neither the character nor the header. Encoding runs over UTF-8 BYTES, so a
 * non-ASCII character becomes several percent-escapes rather than one broken
 * one.
 */
function uriEncode(value, encodeSlash) {
  let out = '';
  for (const byte of Buffer.from(String(value), 'utf8')) {
    const ch = String.fromCharCode(byte);
    if ((byte >= 0x41 && byte <= 0x5A) || (byte >= 0x61 && byte <= 0x7A) ||
        (byte >= 0x30 && byte <= 0x39) || ch === '-' || ch === '_' || ch === '.' || ch === '~') {
      out += ch;
    } else if (ch === '/') {
      out += encodeSlash ? '%2F' : '/';
    } else {
      out += '%' + byte.toString(16).toUpperCase().padStart(2, '0');
    }
  }
  return out;
}

/** A URL path with each segment encoded and the separators left as separators. */
function canonicalPath(pathname) {
  const p = String(pathname || '/');
  if (!p || p === '/') return '/';
  return '/' + p.replace(/^\//, '').split('/').map(seg => uriEncode(seg, true)).join('/');
}

/** Query parameters sorted by encoded name, then by encoded value. */
function canonicalQuery(search) {
  const params = [];
  for (const [k, v] of new URLSearchParams(search || '')) params.push([uriEncode(k, true), uriEncode(v, true)]);
  params.sort((a, b) => (a[0] < b[0] ? -1 : a[0] > b[0] ? 1 : a[1] < b[1] ? -1 : a[1] > b[1] ? 1 : 0));
  return params.map(([k, v]) => `${k}=${v}`).join('&');
}

/**
 * The canonical request — the exact bytes both sides hash.
 *
 * Exported because it is the piece worth being able to print when a 403 comes
 * back saying only "The request signature we calculated does not match":
 * AWS returns its own canonical request in that error, and the difference
 * between the two is always the answer.
 */
function canonicalRequest({ method, path, query, headers, payloadHash }) {
  const lower = Object.entries(headers).map(([k, v]) => [k.toLowerCase(), String(v).trim().replace(/\s+/g, ' ')]);
  lower.sort((a, b) => (a[0] < b[0] ? -1 : a[0] > b[0] ? 1 : 0));
  const signedHeaders = lower.map(([k]) => k).join(';');
  return {
    text: [
      String(method).toUpperCase(),
      canonicalPath(path),
      canonicalQuery(query),
      lower.map(([k, v]) => `${k}:${v}`).join('\n') + '\n',
      signedHeaders,
      payloadHash
    ].join('\n'),
    signedHeaders
  };
}

/** kSecret → kDate → kRegion → kService → kSigning, per the specification. */
function signingKey(secretKey, dateStamp, region, service) {
  return hmac(hmac(hmac(hmac('AWS4' + secretKey, dateStamp), region), service), TERMINATOR);
}

/**
 * Sign one request and hand back the headers it must be sent with.
 *
 * The payload is always hashed — never `UNSIGNED-PAYLOAD`. S3 accepts that
 * token over HTTPS, but it means the signature says nothing about the bytes,
 * so anything able to modify the body in flight can, and the request still
 * verifies. Hashing an audio file capped at 10 MB costs a few milliseconds.
 *
 * @returns {{headers: object, signature: string, canonical: string, scope: string}}
 */
function signRequest({ method, url, headers, body, credentials, region, service, when }) {
  const target = new URL(url);
  const stamp = amzDate(when);
  const dateStamp = stamp.slice(0, 8);
  const payload = body === undefined || body === null ? Buffer.alloc(0) : body;
  const payloadHash = sha256hex(payload);

  /* Host is signed and is not ours to leave out: it is what stops a signature
     for one bucket being replayed against another. x-amz-content-sha256 is
     required by S3 on every request, signed or not. */
  const all = Object.assign({}, headers, {
    host: target.host,
    'x-amz-content-sha256': payloadHash,
    'x-amz-date': stamp
  });
  if (credentials.sessionToken) all['x-amz-security-token'] = credentials.sessionToken;

  const { text, signedHeaders } = canonicalRequest({
    method, path: target.pathname, query: target.search.replace(/^\?/, ''), headers: all, payloadHash
  });

  const scope = `${dateStamp}/${region}/${service}/${TERMINATOR}`;
  const stringToSign = [ALGORITHM, stamp, scope, sha256hex(text)].join('\n');
  const signature = hmac(signingKey(credentials.secretAccessKey, dateStamp, region, service), stringToSign)
    .toString('hex');

  all.authorization = `${ALGORITHM} Credential=${credentials.accessKeyId}/${scope}, `
    + `SignedHeaders=${signedHeaders}, Signature=${signature}`;

  return { headers: all, signature, canonical: text, stringToSign, scope };
}

/* ------------------------- Where the keys come from ------------------------- */

const containerUri = () => {
  const full = process.env.AWS_CONTAINER_CREDENTIALS_FULL_URI;
  if (full) return full;
  const rel = process.env.AWS_CONTAINER_CREDENTIALS_RELATIVE_URI;
  /* 169.254.170.2 is the fixed address the ECS agent serves on. AWS's own
     override name is used so a fake drops in without a knob of our own. */
  return rel ? (process.env.ECS_CONTAINER_METADATA_HOST || 'http://169.254.170.2') + rel : '';
};

const imdsHost = () => process.env.AWS_EC2_METADATA_SERVICE_ENDPOINT ||
  (process.env.AWS_EC2_METADATA_DISABLED === 'true' ? '' : 'http://169.254.169.254');

/** 'static', 'container', 'imds' or null. */
function credentialSource() {
  if (process.env.AWS_ACCESS_KEY_ID && process.env.AWS_SECRET_ACCESS_KEY) return 'static';
  if (containerUri()) return 'container';
  /* Probing IMDS costs a timeout on every machine that is not an EC2 instance,
     so it is only claimed when something says so — the same reasoning as
     K_SERVICE for the Google metadata server. */
  if (process.env.AWS_EC2_METADATA_SERVICE_ENDPOINT || process.env.AWS_EXECUTION_ENV) return 'imds';
  return null;
}

function configured() { return credentialSource() !== null; }

/** The region a request is signed for. No default: a wrong one is a 403 or,
    worse, a redirect to the right one that a signature does not survive. */
function region() {
  return process.env.AWS_REGION || process.env.AWS_DEFAULT_REGION || '';
}

/** The body of a failed response, short enough to log and never the request. */
async function reason(res) {
  const text = await res.text().catch(() => '');
  return `${res.status} ${text.slice(0, 200)}`;
}

async function fromContainer() {
  const uri = containerUri();
  const headers = {};
  /* Only sent when set, and only to the link-local address: the token is a
     bearer credential and this is the one place it belongs. */
  const token = process.env.AWS_CONTAINER_AUTHORIZATION_TOKEN;
  if (token) headers.Authorization = token;
  const res = await fetch(uri, { headers });
  if (!res.ok) throw new Error(`The container credential provider refused: ${await reason(res)}`);
  const body = await res.json().catch(() => null);
  if (!body || !body.AccessKeyId || !body.SecretAccessKey) {
    throw new Error('The container credential provider returned no keys');
  }
  return {
    accessKeyId: body.AccessKeyId,
    secretAccessKey: body.SecretAccessKey,
    sessionToken: body.Token || '',
    expiresAt: body.Expiration ? Date.parse(body.Expiration) : Date.now() + 3600e3
  };
}

async function fromImds() {
  const host = imdsHost();
  if (!host) throw new Error('The instance metadata service is disabled');

  /* IMDSv2 only. The PUT is the whole point: a server-side request forgery can
     make a GET on behalf of the process, but not a PUT carrying this header,
     so the token cannot be obtained by tricking the application into fetching
     a URL. IMDSv1 has no such step, which is how instance credentials get
     stolen, so it is not implemented as a fallback. */
  const tokenRes = await fetch(`${host}/latest/api/token`, {
    method: 'PUT',
    headers: { 'x-aws-ec2-metadata-token-ttl-seconds': '21600' }
  });
  if (!tokenRes.ok) throw new Error(`IMDSv2 refused a token: ${await reason(tokenRes)}`);
  const token = (await tokenRes.text()).trim();
  const headers = { 'x-aws-ec2-metadata-token': token };

  const roleRes = await fetch(`${host}/latest/meta-data/iam/security-credentials/`, { headers });
  if (!roleRes.ok) throw new Error(`No instance role is attached: ${await reason(roleRes)}`);
  const role = (await roleRes.text()).trim().split('\n')[0];
  if (!role) throw new Error('No instance role is attached');

  const credRes = await fetch(
    `${host}/latest/meta-data/iam/security-credentials/${encodeURIComponent(role)}`, { headers });
  if (!credRes.ok) throw new Error(`The instance role gave no keys: ${await reason(credRes)}`);
  const body = await credRes.json().catch(() => null);
  if (!body || !body.AccessKeyId || !body.SecretAccessKey) {
    throw new Error('The instance metadata service returned no keys');
  }
  return {
    accessKeyId: body.AccessKeyId,
    secretAccessKey: body.SecretAccessKey,
    sessionToken: body.Token || '',
    expiresAt: body.Expiration ? Date.parse(body.Expiration) : Date.now() + 3600e3
  };
}

/* { value, expiresAt, pending } — `pending` is what stops four parallel
   uploads from fetching four sets of credentials. */
let cache = null;

/** Throw away the cached credential. For tests, and for a rotation. */
function resetCache() { cache = null; }

/** The credential to sign with, cached until shortly before it expires. */
async function credentials() {
  const source = credentialSource();
  if (!source) throw new Error('No AWS credential is configured');

  if (source === 'static') {
    return {
      accessKeyId: process.env.AWS_ACCESS_KEY_ID,
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
      sessionToken: process.env.AWS_SESSION_TOKEN || ''
    };
  }

  const now = Date.now();
  if (cache && cache.value && now < cache.expiresAt - SKEW_MS) return cache.value;
  if (cache && cache.pending) return cache.pending;

  const pending = (async () => {
    const got = source === 'container' ? await fromContainer() : await fromImds();
    cache = { value: got, expiresAt: got.expiresAt };
    return got;
  })().catch(e => {
    /* A failed fetch must not leave a rejected promise in the cache that every
       later caller then awaits and re-throws for the rest of the process's life. */
    cache = null;
    throw e;
  });

  cache = { pending };
  return pending;
}

/** Sign with whatever credential is configured. The everyday entry point. */
async function sign({ method, url, headers, body, service, region: forced, when }) {
  const creds = await credentials();
  const r = forced || region();
  if (!r) throw new Error('No AWS region is configured (set AWS_REGION)');
  return signRequest({ method, url, headers: headers || {}, body, credentials: creds, region: r, service, when });
}

module.exports = {
  sign, signRequest, credentials, credentialSource, configured, resetCache, region,
  canonicalRequest, canonicalPath, canonicalQuery, uriEncode, signingKey, amzDate,
  ALGORITHM, SKEW_MS
};
