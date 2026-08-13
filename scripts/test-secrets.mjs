/**
 * AWS Secrets Manager: the fetch, the merge, and the rule the merge depends on.
 *
 * Run: node scripts/test-secrets.mjs   (needs no server, no browser, no database)
 *
 * Two halves, and the second is the one that would actually have caught a
 * deployment failure.
 *
 *  · **A fake Secrets Manager over HTTP** that verifies the SigV4 signature
 *    from the bytes that arrived — including `x-amz-target`, which chooses the
 *    action and is signed rather than merely sent. It then checks what lands in
 *    `process.env`, what is refused, and what a failure does in production
 *    versus anywhere else.
 *
 *  · **A static read of the server source**, asserting that no module captures
 *    a secret-bearing environment variable into a constant at import time.
 *    That is the whole load-bearing assumption of this design: `load()` runs
 *    inside the boot function, which is *after* every `require` at the top of
 *    server.js. A constant captured at import holds the value from before the
 *    secret arrived — the empty string — and nothing throws. The symptoms are
 *    a sign-in page that says Google is not configured on a deployment where it
 *    is, and mail that authenticates as nobody and never arrives. Neither shows
 *    up in a test that drives the API, and neither shows up locally, where the
 *    value was in the environment all along.
 */
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';

const require_ = createRequire(import.meta.url);
const secrets = require_('../server/secrets.js');
const aws = require_('../server/aws-sigv4.js');

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');

let pass = 0, fail = 0;
const ok = (c, name, detail) => {
  if (c) { pass++; console.log('✓ ' + name); return; }
  fail++;
  console.log('✗ ' + name + (detail === undefined ? '' : '  → ' + detail));
};
const head = t => console.log('\n\x1b[1m== ' + t + ' ==\x1b[0m');

const KEY_ID = 'AKIAIOSFODNN7EXAMPLE';
const SECRET = 'wJalrXUtnFEMI/K7MDENG+bPxRfiCYEXAMPLEKEY';

const NO_ENV = {
  AWS_SECRETS_ID: undefined, SECRETS_ENDPOINT: undefined,
  AWS_ACCESS_KEY_ID: undefined, AWS_SECRET_ACCESS_KEY: undefined, AWS_SESSION_TOKEN: undefined,
  AWS_REGION: undefined, AWS_DEFAULT_REGION: undefined,
  AWS_CONTAINER_CREDENTIALS_RELATIVE_URI: undefined, AWS_CONTAINER_CREDENTIALS_FULL_URI: undefined,
  AWS_EC2_METADATA_SERVICE_ENDPOINT: undefined, AWS_EXECUTION_ENV: undefined,
  NODE_ENV: undefined,
  /* The names the fixtures below deliver, cleared so a value on this machine
     cannot make a test pass that would fail on a clean one. */
  ADMIN_PASSWORD: undefined, VNPAY_HASH_SECRET: undefined, SMTP_PASS: undefined,
  GOOGLE_CLIENT_SECRET: undefined, SUPABASE_SERVICE_KEY: undefined
};
const env = extra => Object.assign({}, NO_ENV, extra || {});

async function withEnv(vars, fn) {
  const before = new Map(Object.keys(vars).map(k => [k, process.env[k]]));
  for (const [k, v] of Object.entries(vars)) {
    if (v === undefined) delete process.env[k]; else process.env[k] = v;
  }
  aws.resetCache();
  try { return await fn(); }
  finally {
    for (const [k, v] of before) {
      if (v === undefined) delete process.env[k]; else process.env[k] = v;
    }
    aws.resetCache();
  }
}

/** Swallow console output and hand it back, so a warning can be asserted on
    and a secret value can be proved absent from it. */
async function captured(fn) {
  const lines = [];
  const realLog = console.log, realWarn = console.warn, realError = console.error;
  const grab = (...a) => lines.push(a.join(' '));
  console.log = grab; console.warn = grab; console.error = grab;
  try { return { value: await fn(), lines }; }
  finally { console.log = realLog; console.warn = realWarn; console.error = realError; }
}

async function listen(handler) {
  const server = http.createServer(handler);
  await new Promise(r => server.listen(0, '127.0.0.1', r));
  return { url: `http://127.0.0.1:${server.address().port}`, close: () => new Promise(r => server.close(r)) };
}

const readBody = req => new Promise(resolve => {
  const chunks = [];
  req.on('data', c => chunks.push(c));
  req.on('end', () => resolve(Buffer.concat(chunks)));
});

/** The signature, recomputed here from what arrived rather than imported. */
function verifySignature(req, body) {
  const auth = req.headers.authorization || '';
  const m = auth.match(/^AWS4-HMAC-SHA256 Credential=([^/]+)\/(\d{8})\/([^/]+)\/([^/]+)\/aws4_request, SignedHeaders=([^,]+), Signature=([0-9a-f]{64})$/);
  if (!m) return 'no usable Authorization header';
  const [, keyId, dateStamp, region, service, signedHeaders, signature] = m;
  if (keyId !== KEY_ID) return 'unknown access key';
  if (service !== 'secretsmanager') return `signed for the wrong service: ${service}`;
  if (!signedHeaders.split(';').includes('x-amz-target')) return 'x-amz-target was not signed';

  const hex = d => crypto.createHash('sha256').update(d).digest('hex');
  const H = (k, d) => crypto.createHmac('sha256', k).update(d, 'utf8').digest();
  const headerLines = signedHeaders.split(';')
    .map(h => `${h}:${String(req.headers[h] || '').trim()}`).join('\n');
  const canonical = [req.method, '/', '', headerLines + '\n', signedHeaders, hex(body)].join('\n');
  const stringToSign = ['AWS4-HMAC-SHA256', req.headers['x-amz-date'],
    `${dateStamp}/${region}/${service}/aws4_request`, hex(canonical)].join('\n');
  let k = H('AWS4' + SECRET, dateStamp);
  for (const part of [region, service, 'aws4_request']) k = H(k, part);
  if (H(k, stringToSign).toString('hex') !== signature) return 'signature mismatch';
  return null;
}

/* ============ 1. Not configured is silent, not broken ============ */
head('With no secret configured');

await withEnv(env(), async () => {
  ok(secrets.configured() === false, 'configured() is false with nothing set');
  const { value, lines } = await captured(() => secrets.load());
  ok(value.loaded === false && value.applied.length === 0, 'load() is a no-op', JSON.stringify(value));
  ok(lines.length === 0, 'and says nothing at all — silence is the default', lines.join(' / '));
});

await withEnv(env({ AWS_SECRETS_ID: 'vpet/prod' }), async () => {
  const { lines } = await captured(() => secrets.load());
  ok(lines.some(l => /AWS_REGION/.test(l)),
    'A secret id with no region warns and carries on outside production', lines.join(' / '));
});

await withEnv(env({ AWS_SECRETS_ID: 'vpet/prod', NODE_ENV: 'production' }), async () => {
  let threw = null;
  try { await secrets.load(); } catch (e) { threw = e; }
  ok(threw && /AWS_REGION/.test(threw.message),
    'In production it refuses to start rather than run with no secrets',
    threw && threw.message);
});

/* ============ 2. The fetch, against a fake that checks the signature ============ */
head('Fetching the secret');

{
  const calls = [];
  let payload = {
    ADMIN_PASSWORD: 'from-the-secret-store',
    VNPAY_HASH_SECRET: 'vnp-secret',
    SMTP_PASS: 'smtp-secret',
    GOOGLE_CLIENT_SECRET: 'google-secret'
  };
  let mode = 'ok';

  const fake = await listen(async (req, res) => {
    const body = await readBody(req);
    const bad = verifySignature(req, body);
    calls.push({
      target: req.headers['x-amz-target'],
      type: req.headers['content-type'],
      id: JSON.parse(body.toString() || '{}').SecretId,
      bad
    });
    if (bad) { res.writeHead(403); return res.end(JSON.stringify({ __type: 'InvalidSignatureException' })); }
    if (mode === 'denied') {
      res.writeHead(400, { 'Content-Type': 'application/x-amz-json-1.1' });
      return res.end(JSON.stringify({ __type: 'com.amazon.coral#AccessDeniedException', Message: 'arn:aws:secretsmanager:ap-southeast-1:123456789012:secret:vpet/prod' }));
    }
    if (mode === 'plain') {
      res.writeHead(200); return res.end(JSON.stringify({ SecretString: 'just-a-password' }));
    }
    res.writeHead(200, { 'Content-Type': 'application/x-amz-json-1.1' });
    res.end(JSON.stringify({ Name: 'vpet/prod', SecretString: JSON.stringify(payload) }));
  });

  const base = {
    AWS_SECRETS_ID: 'vpet/prod', SECRETS_ENDPOINT: fake.url, AWS_REGION: 'ap-southeast-1',
    AWS_ACCESS_KEY_ID: KEY_ID, AWS_SECRET_ACCESS_KEY: SECRET
  };

  try {
    await withEnv(env(base), async () => {
      ok(secrets.configured() === true, 'configured() is true with an id, a region and a credential');
      const { value, lines } = await captured(() => secrets.load());
      ok(calls[0] && calls[0].bad === null, 'The request is signed correctly', calls[0] && calls[0].bad);
      ok(calls[0].target === 'secretsmanager.GetSecretValue',
        'with the GetSecretValue action in x-amz-target', calls[0].target);
      ok(calls[0].type === 'application/x-amz-json-1.1', 'and the AWS JSON 1.1 content type', calls[0].type);
      ok(calls[0].id === 'vpet/prod', 'asking for the configured secret', calls[0].id);

      ok(value.loaded === true && value.applied.length === 4, 'Four values are applied', JSON.stringify(value.applied));
      ok(process.env.ADMIN_PASSWORD === 'from-the-secret-store', 'and land in the environment');
      ok(process.env.SMTP_PASS === 'smtp-secret', 'including the ones read by modules loaded earlier');
      ok(!lines.join(' ').includes('from-the-secret-store'),
        'No value is logged — only how many and which names', lines.join(' / '));
    });

    /* The rule that makes rotation work. */
    await withEnv(env(Object.assign({}, base, { ADMIN_PASSWORD: 'stale-value-in-the-task-definition' })), async () => {
      const { value, lines } = await captured(() => secrets.load());
      ok(process.env.ADMIN_PASSWORD === 'from-the-secret-store',
        'A value also present in the environment is OVERRIDDEN by the secret',
        process.env.ADMIN_PASSWORD);
      ok(value.overrode.includes('ADMIN_PASSWORD'), 'and the shadowing is reported');
      ok(lines.some(l => l.includes('ADMIN_PASSWORD') && !l.includes('stale-value-in-the-task-definition')),
        'by name, without either value', lines.join(' / '));
    });

    /* A secret that could rewrite where secrets come from is a secret that can
       point the next boot at an attacker's endpoint. */
    payload = {
      SECRETS_ENDPOINT: 'http://evil.example', AWS_ACCESS_KEY_ID: 'AKIAEVIL',
      AWS_REGION: 'us-east-1', NODE_ENV: 'production',
      'not a name': 'x', NESTED: { a: 1 }, LONG: 'x'.repeat(secrets.MAX_VALUE + 1),
      SUPABASE_SERVICE_KEY: 'kept'
    };
    await withEnv(env(base), async () => {
      const { value } = await captured(() => secrets.load());
      ok(process.env.SECRETS_ENDPOINT === fake.url,
        'A secret cannot rewrite the endpoint it was fetched from', process.env.SECRETS_ENDPOINT);
      ok(process.env.AWS_ACCESS_KEY_ID === KEY_ID, 'nor the credential used to fetch it');
      ok(process.env.NODE_ENV === undefined, 'nor NODE_ENV, which decides how strict everything else is');
      ok(value.refused.some(r => r.startsWith('SECRETS_ENDPOINT')), 'and each refusal is named',
        JSON.stringify(value.refused));
      ok(value.refused.some(r => /not an environment variable name/.test(r)),
        'A malformed name is refused rather than put into the environment');
      ok(value.refused.some(r => r.startsWith('NESTED')), 'A nested object is refused — env values are strings');
      ok(value.refused.some(r => r.startsWith('LONG')), 'and an absurdly long value is refused');
      ok(process.env.SUPABASE_SERVICE_KEY === 'kept', 'while the sound entries around them still apply');
    });

    mode = 'plain';
    await withEnv(env(base), async () => {
      const { lines } = await captured(() => secrets.load());
      ok(lines.some(l => /JSON object/.test(l)),
        'A plain-string secret is refused with an explanation, not guessed at', lines.join(' / '));
    });

    mode = 'denied';
    await withEnv(env(base), async () => {
      const { lines } = await captured(() => secrets.load());
      ok(lines.some(l => /AccessDeniedException/.test(l)),
        'A refusal reports the AWS error code', lines.join(' / '));
      ok(!lines.join(' ').includes('123456789012'),
        'but not the response body, which echoes the ARN and the account number', lines.join(' / '));
    });

    await withEnv(env(Object.assign({}, base, { NODE_ENV: 'production' })), async () => {
      let threw = null;
      try { await captured(() => secrets.load()); } catch (e) { threw = e; }
      ok(threw && /AccessDenied/.test(threw.message),
        'and in production a refusal stops the boot', threw && threw.message);
    });
  } finally { await fake.close(); }
}

/* ============ 3. The rule the whole design rests on ============ */
head('No secret is captured at import time');

{
  /* Anything that names a credential. Deliberately broad: the failure this
     catches is silent, so a false positive costing one lazy accessor is a
     better trade than a miss. */
  const SECRETISH = /(PASSWORD|SECRET|_KEY|APIKEY|API_KEY|TOKEN|CREDENTIAL|SMTP_|_PASS)\b/;
  /* Read to reach the secret store, so they cannot come from it and are read
     at import by design. */
  const ALLOWED = new Set([
    'AWS_ACCESS_KEY_ID', 'AWS_SECRET_ACCESS_KEY', 'AWS_SESSION_TOKEN', 'AWS_SECRETS_ID',
    'AWS_CONTAINER_AUTHORIZATION_TOKEN'
  ]);

  const files = fs.readdirSync(path.join(ROOT, 'server'))
    .filter(f => f.endsWith('.js')).map(f => 'server/' + f).concat(['server.js']);

  const captures = [];
  for (const file of files) {
    const src = fs.readFileSync(path.join(ROOT, file), 'utf8');
    src.split('\n').forEach((line, i) => {
      /* A top-level `const X = … process.env.Y …`: no indentation means module
         scope, which is what runs at require() time. An accessor — `const x =
         () => process.env.Y` — is the fix rather than the fault, so a line
         whose right-hand side is a function is exactly what this wants to see. */
      const m = line.match(/^(?:const|let|var)\s+[A-Za-z0-9_$]+\s*=(.*?)process\.env\.([A-Za-z0-9_]+)/);
      if (!m) return;
      if (/=>|\bfunction\b/.test(m[1])) return;
      if (!SECRETISH.test(m[2]) || ALLOWED.has(m[2])) return;
      captures.push(`${file}:${i + 1} ${line.trim().slice(0, 80)}`);
    });
  }

  ok(captures.length === 0,
    `${files.length} server files, none captures a secret into a module constant`,
    captures.join('\n     '));

  /* And the ordering that makes the rule necessary in the first place. */
  const boot = fs.readFileSync(path.join(ROOT, 'server.js'), 'utf8');
  const loadAt = boot.indexOf('await secrets.load()');
  ok(loadAt > 0, 'server.js loads the secret during boot');
  ok(loadAt < boot.indexOf('await A.ensureSeedAdmin()'),
    'before the administrator account is seeded from ADMIN_PASSWORD');
  ok(loadAt < boot.indexOf('app.listen('), 'and before anything is listening');
}

console.log(`\n${fail === 0 ? '\x1b[32m✔' : '\x1b[31m✗'} ${pass} passed, ${fail} failed\x1b[0m`);
process.exit(fail === 0 ? 0 : 1);
