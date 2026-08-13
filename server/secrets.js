/**
 * Secrets from AWS Secrets Manager, merged into the environment at boot.
 *
 * ## Why this exists
 *
 * Everything on this platform already reads its keys from environment
 * variables, which is right — but on ECS an environment variable is written
 * into the task definition, and a task definition is readable by anyone with
 * console access, printed by `describe-task-definition`, and kept forever in
 * every previous revision. So the database password ends up in a place nobody
 * thinks of as a secret store, and rotating it means editing and redeploying.
 *
 * Secrets Manager holds one JSON secret; the task gets permission to read it
 * and nothing else. Nothing sensitive is in the task definition, rotation is a
 * change in one place, and access is audited by AWS rather than by us.
 *
 * ## How it is wired in
 *
 * `load()` fetches the secret and merges it into `process.env` before anything
 * else boots. That is deliberately unglamorous: every reader keeps working
 * unchanged, there is no new configuration object to thread through the code,
 * and a module that gains a key tomorrow needs no change here.
 *
 * The one rule it imposes is that a secret must be read at CALL time, not
 * captured into a constant at import time — a module loaded before `load()`
 * runs would hold the value from before the secret arrived, which for a
 * password means "empty" and for SMTP means mail that silently fails to
 * authenticate. scripts/test-secrets.mjs enforces that by reading the source,
 * because it is the kind of mistake that only shows up in a deployment.
 *
 * ## The secret wins, and says so
 *
 * Where a name is in both the secret and the environment, the SECRET wins and
 * the name is logged. The other way round looks more conventional, and it is
 * wrong here: a stale `ADMIN_PASSWORD` left in a task definition would silently
 * shadow the rotated one, so the rotation appears to work and changes nothing.
 * A shadowed value that is announced is a configuration mistake somebody can
 * see; a shadowed value that wins quietly is an incident three months later.
 *
 * The variables needed to REACH Secrets Manager — AWS_REGION, the credential,
 * AWS_SECRETS_ID itself — can only come from the environment, and are refused
 * if a secret tries to set them. A secret that could rewrite the address it was
 * fetched from is a secret that can point the next boot somewhere else.
 *
 * ## Never
 *
 * Log a secret value, or the response body. Errors carry the AWS error code and
 * the status, never the payload — a failed GetSecretValue can echo the request.
 */
'use strict';

const aws = require('./aws-sigv4');

/** AWS JSON 1.1, one action. No SDK, for the reasons in server/aws-sigv4.js. */
const TARGET = 'secretsmanager.GetSecretValue';

/* Names that decide WHERE the secret comes from, so they cannot come FROM it. */
const BOOTSTRAP = new Set([
  'AWS_SECRETS_ID', 'AWS_REGION', 'AWS_DEFAULT_REGION', 'SECRETS_ENDPOINT',
  'AWS_ACCESS_KEY_ID', 'AWS_SECRET_ACCESS_KEY', 'AWS_SESSION_TOKEN',
  'AWS_CONTAINER_CREDENTIALS_RELATIVE_URI', 'AWS_CONTAINER_CREDENTIALS_FULL_URI',
  'AWS_CONTAINER_AUTHORIZATION_TOKEN', 'AWS_EC2_METADATA_SERVICE_ENDPOINT',
  'ECS_CONTAINER_METADATA_HOST', 'NODE_ENV'
]);

/* A conservative shape for an environment variable name. A secret is trusted
   less than the code that reads it: it is edited by people and by rotation
   tooling, and one malformed entry should be refused by name rather than
   quietly put into the environment. */
const NAME = /^[A-Za-z_][A-Za-z0-9_]{0,63}$/;
const MAX_VALUE = 8192;

const secretId = () => process.env.AWS_SECRETS_ID || '';

/** True when a secret is configured AND reachable — both are needed. */
function configured() {
  return !!secretId() && aws.configured() && !!aws.region();
}

function endpoint() {
  const override = (process.env.SECRETS_ENDPOINT || '').replace(/\/+$/, '');
  return override || `https://secretsmanager.${aws.region()}.amazonaws.com`;
}

/**
 * The AWS error code for a failed call, without the body.
 *
 * GetSecretValue echoes the SecretId in its error, and a mistyped id is often
 * an ARN with an account number in it. The code alone says what went wrong —
 * AccessDeniedException, ResourceNotFoundException — and says nothing else.
 */
function errorCode(text, status) {
  try {
    const body = JSON.parse(text);
    const type = String(body.__type || body.code || '').split('#').pop();
    if (type) return `${type} (HTTP ${status})`;
  } catch (e) { /* not JSON, fall through */ }
  return `HTTP ${status}`;
}

/** Fetch and parse the secret. Exported so a test can drive it on its own. */
async function fetchSecret(id) {
  const url = endpoint() + '/';
  const body = Buffer.from(JSON.stringify({ SecretId: id }), 'utf8');
  const signed = await aws.sign({
    method: 'POST',
    url,
    /* Both are signed, not merely sent: x-amz-target chooses the action, and an
       unsigned action header is an action an intermediary could change. */
    headers: { 'content-type': 'application/x-amz-json-1.1', 'x-amz-target': TARGET },
    body,
    service: 'secretsmanager'
  });

  const res = await fetch(url, { method: 'POST', headers: signed.headers, body });
  const text = await res.text();
  if (!res.ok) throw new Error(`Secrets Manager refused: ${errorCode(text, res.status)}`);

  let payload;
  try { payload = JSON.parse(text); } catch (e) { throw new Error('Secrets Manager returned no JSON'); }

  const raw = typeof payload.SecretString === 'string'
    ? payload.SecretString
    : (payload.SecretBinary ? Buffer.from(payload.SecretBinary, 'base64').toString('utf8') : '');
  if (!raw) throw new Error(`Secret ${id} is empty`);

  let values;
  try { values = JSON.parse(raw); } catch (e) {
    /* A plain-string secret cannot be merged: nothing in it says which variable
       it is, and guessing would put a password under the wrong name. */
    throw new Error(`Secret ${id} is a plain string; it must be a JSON object of NAME: value pairs`);
  }
  if (!values || typeof values !== 'object' || Array.isArray(values)) {
    throw new Error(`Secret ${id} is not a JSON object`);
  }
  return values;
}

/**
 * Merge a bag of values into the environment, refusing what it should.
 * Returns what happened, for the boot log and for the tests. No value is
 * included in the result — only names.
 */
function apply(values) {
  const applied = [], overrode = [], refused = [];
  for (const [name, value] of Object.entries(values)) {
    if (BOOTSTRAP.has(name)) { refused.push(`${name} (decides where secrets come from)`); continue; }
    if (!NAME.test(name)) { refused.push(`${JSON.stringify(name).slice(0, 40)} (not an environment variable name)`); continue; }
    if (value === null || typeof value === 'object') { refused.push(`${name} (not a scalar)`); continue; }
    const text = String(value);
    if (text.length > MAX_VALUE) { refused.push(`${name} (longer than ${MAX_VALUE} characters)`); continue; }
    if (process.env[name] !== undefined && process.env[name] !== text) overrode.push(name);
    process.env[name] = text;
    applied.push(name);
  }
  return { applied, overrode, refused };
}

/**
 * Load the secret into the environment. Safe and silent when none is set.
 *
 * A failure is fatal in production and a warning anywhere else, the same rule
 * the storage drivers follow: a production process that starts without its
 * secrets does not fail, it runs with an empty password and a payment gateway
 * that is quietly off, which is worse than not starting.
 *
 * @returns {Promise<{loaded: boolean, applied: string[], overrode: string[], refused: string[]}>}
 */
async function load() {
  const empty = { loaded: false, applied: [], overrode: [], refused: [] };
  const id = secretId();
  if (!id) return empty;

  if (!aws.configured() || !aws.region()) {
    const missing = !aws.region() ? 'AWS_REGION' : 'an AWS credential';
    const message = `AWS_SECRETS_ID is set but ${missing} is not, so no secret can be fetched`;
    if (process.env.NODE_ENV === 'production') throw new Error(message);
    console.warn(`[secrets] ${message} — carrying on with the environment as it is.`);
    return empty;
  }

  let values;
  try {
    values = await fetchSecret(id);
  } catch (e) {
    if (process.env.NODE_ENV === 'production') throw e;
    console.warn(`[secrets] ${(e && e.message) || e} — carrying on with the environment as it is.`);
    return empty;
  }

  const result = apply(values);
  /* Names only, never values, and the count rather than the list for the
     ordinary case: a boot log that prints every key is a boot log that gets
     pasted into a support thread. */
  console.log(`[secrets] ${result.applied.length} value(s) loaded from ${id}`);
  if (result.overrode.length) {
    console.warn(`[secrets] these were also set in the environment and the secret won: ${result.overrode.join(', ')}. `
      + 'Remove them from the task definition — a value left there is a rotation that appears to work and changes nothing.');
  }
  if (result.refused.length) {
    console.warn(`[secrets] refused: ${result.refused.join(', ')}`);
  }
  return Object.assign({ loaded: true }, result);
}

module.exports = { load, apply, fetchSecret, configured, endpoint, secretId, BOOTSTRAP, NAME, MAX_VALUE };
