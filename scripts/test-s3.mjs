/**
 * Amazon S3: the signature, the credential behind it, and the driver that
 * spends both.
 *
 * Run: node scripts/test-s3.mjs   (needs no server, no browser, no database)
 *
 * Nothing here talks to AWS. Three things stand in for it:
 *
 *  · **AWS's own published worked example.** The canonical request for
 *    `GET /test.txt` on `examplebucket` is reproduced byte for byte, and its
 *    SHA-256 is compared against the value AWS prints for it in the S3 API
 *    reference: 7344ae5b7ee6c3e7e6b0fe0640412a37625d1fbfff95c48bbb2dc43964946972.
 *    That single hash pins the hard 90% of SigV4 — the URI encoding, the header
 *    canonicalisation, the signed-header list, the payload hash and the exact
 *    line structure. Every one of those is a thing that reads fine and returns
 *    403 in production.
 *
 *    What is deliberately NOT pinned here is the final signature constant. It
 *    could only have been written down from memory, and a remembered constant
 *    is worse than none: the temptation when it fails is to "fix" the signer
 *    until it matches, which is how a wrong implementation gets a green test.
 *    Everything after the canonical hash — one HMAC chain over a string this
 *    test prints in full — is pinned by the round trip below instead.
 *
 *  · **A fake S3 that verifies the signature from the wire.** It rebuilds the
 *    canonical request out of the method, path, headers and body it actually
 *    received, recomputes the signature with an implementation written here
 *    rather than imported, and refuses anything that does not match. That is
 *    what catches the real bug in this kind of code: signing one thing and
 *    sending another. It is proved to be a real check by tampering — a body
 *    altered after signing is rejected.
 *
 *  · **A fake credential provider**, for both of the ways a deployed container
 *    gets keys without any being stored: the ECS task-role endpoint and IMDSv2.
 */
import http from 'node:http';
import crypto from 'node:crypto';
import { createRequire } from 'node:module';

const require_ = createRequire(import.meta.url);
const aws = require_('../server/aws-sigv4.js');
const storage = require_('../server/storage.js');

let pass = 0, fail = 0;
const ok = (c, name, detail) => {
  if (c) { pass++; console.log('✓ ' + name); return; }
  fail++;
  console.log('✗ ' + name + (detail === undefined ? '' : '  → ' + detail));
};
const head = t => console.log('\n\x1b[1m== ' + t + ' ==\x1b[0m');

/** Set some environment variables, run, put everything back. */
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

/* Every AWS variable off, so a key that happens to be on this machine cannot
   make a test pass that would fail on a clean one. */
const NO_CREDENTIAL = {
  AWS_ACCESS_KEY_ID: undefined,
  AWS_SECRET_ACCESS_KEY: undefined,
  AWS_SESSION_TOKEN: undefined,
  AWS_REGION: undefined,
  AWS_DEFAULT_REGION: undefined,
  AWS_CONTAINER_CREDENTIALS_RELATIVE_URI: undefined,
  AWS_CONTAINER_CREDENTIALS_FULL_URI: undefined,
  AWS_CONTAINER_AUTHORIZATION_TOKEN: undefined,
  ECS_CONTAINER_METADATA_HOST: undefined,
  AWS_EC2_METADATA_SERVICE_ENDPOINT: undefined,
  AWS_EC2_METADATA_DISABLED: undefined,
  AWS_EXECUTION_ENV: undefined,
  AUDIO_STORAGE: undefined,
  S3_BUCKET: undefined,
  S3_ENDPOINT: undefined,
  NODE_ENV: undefined
};
const env = extra => Object.assign({}, NO_CREDENTIAL, extra || {});

const KEY_ID = 'AKIAIOSFODNN7EXAMPLE';
const SECRET = 'wJalrXUtnFEMI/K7MDENG+bPxRfiCYEXAMPLEKEY';

/** A tiny valid MP3: an ID3v2 header is enough for the sniffer, and this test
    is about the transport, not about the format check. */
const MP3 = Buffer.concat([Buffer.from('ID3'), Buffer.alloc(64, 0x11)]);

async function listen(handler) {
  const server = http.createServer(handler);
  await new Promise(r => server.listen(0, '127.0.0.1', r));
  const { port } = server.address();
  return { url: `http://127.0.0.1:${port}`, close: () => new Promise(r => server.close(r)) };
}

const readBody = req => new Promise(resolve => {
  const chunks = [];
  req.on('data', c => chunks.push(c));
  req.on('end', () => resolve(Buffer.concat(chunks)));
});

/* ============ 1. The signature, against AWS's published example ============ */
head('Signature Version 4');

const T0 = Date.parse('2013-05-24T00:00:00Z');
const EXAMPLE_CREDS = { accessKeyId: KEY_ID, secretAccessKey: SECRET, sessionToken: '' };

{
  const signed = aws.signRequest({
    method: 'GET',
    url: 'https://examplebucket.s3.amazonaws.com/test.txt',
    headers: { Range: 'bytes=0-9' },
    credentials: EXAMPLE_CREDS,
    region: 'us-east-1',
    service: 's3',
    when: T0
  });

  /* The example verbatim from the S3 API reference. Indentation would change
     the bytes, so it is built from an array rather than a template literal. */
  const EXPECTED = [
    'GET',
    '/test.txt',
    '',
    'host:examplebucket.s3.amazonaws.com',
    'range:bytes=0-9',
    'x-amz-content-sha256:e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
    'x-amz-date:20130524T000000Z',
    '',
    'host;range;x-amz-content-sha256;x-amz-date',
    'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855'
  ].join('\n');

  ok(signed.canonical === EXPECTED, 'The canonical request matches AWS\'s worked example byte for byte',
    JSON.stringify(signed.canonical));

  const hash = crypto.createHash('sha256').update(signed.canonical).digest('hex');
  ok(hash === '7344ae5b7ee6c3e7e6b0fe0640412a37625d1fbfff95c48bbb2dc43964946972',
    'and hashes to the value AWS publishes for it', hash);

  ok(signed.stringToSign === [
    'AWS4-HMAC-SHA256',
    '20130524T000000Z',
    '20130524/us-east-1/s3/aws4_request',
    '7344ae5b7ee6c3e7e6b0fe0640412a37625d1fbfff95c48bbb2dc43964946972'
  ].join('\n'), 'The string to sign is the four documented lines', JSON.stringify(signed.stringToSign));

  ok(/^AWS4-HMAC-SHA256 Credential=AKIAIOSFODNN7EXAMPLE\/20130524\/us-east-1\/s3\/aws4_request, SignedHeaders=host;range;x-amz-content-sha256;x-amz-date, Signature=[0-9a-f]{64}$/
    .test(signed.headers.authorization), 'and the Authorization header has the documented shape',
    signed.headers.authorization);

  /* The payload is hashed, never sent as UNSIGNED-PAYLOAD: S3 accepts that
     token, but then the signature says nothing about the bytes. */
  const put = aws.signRequest({
    method: 'PUT', url: 'https://examplebucket.s3.amazonaws.com/x.mp3',
    headers: {}, body: MP3, credentials: EXAMPLE_CREDS, region: 'us-east-1', service: 's3', when: T0
  });
  ok(put.headers['x-amz-content-sha256'] === crypto.createHash('sha256').update(MP3).digest('hex'),
    'A body is hashed into x-amz-content-sha256, not declared unsigned',
    put.headers['x-amz-content-sha256']);

  const other = aws.signRequest({
    method: 'PUT', url: 'https://examplebucket.s3.amazonaws.com/x.mp3',
    headers: {}, body: Buffer.concat([MP3, Buffer.from('!')]),
    credentials: EXAMPLE_CREDS, region: 'us-east-1', service: 's3', when: T0
  });
  ok(other.signature !== put.signature, 'so one byte of difference in the body is a different signature');

  const elsewhere = aws.signRequest({
    method: 'GET', url: 'https://otherbucket.s3.amazonaws.com/test.txt',
    headers: { Range: 'bytes=0-9' }, credentials: EXAMPLE_CREDS,
    region: 'us-east-1', service: 's3', when: T0
  });
  ok(elsewhere.signature !== signed.signature,
    'and host is signed, so a signature for one bucket cannot be replayed at another');

  const later = aws.signRequest({
    method: 'GET', url: 'https://examplebucket.s3.amazonaws.com/test.txt',
    headers: { Range: 'bytes=0-9' }, credentials: EXAMPLE_CREDS,
    region: 'us-east-1', service: 's3', when: T0 + 86400000
  });
  ok(later.signature !== signed.signature, 'A different day is a different signing key');

  const session = aws.signRequest({
    method: 'GET', url: 'https://examplebucket.s3.amazonaws.com/test.txt',
    headers: {}, credentials: { ...EXAMPLE_CREDS, sessionToken: 'FQoGZXIvYXdzEBY' },
    region: 'us-east-1', service: 's3', when: T0
  });
  ok(session.headers['x-amz-security-token'] === 'FQoGZXIvYXdzEBY' &&
     /x-amz-security-token/.test(session.headers.authorization),
    'Temporary credentials sign their session token rather than merely sending it');
}

/* ============ 2. Percent-encoding, which is where SigV4 usually breaks ============ */
head('URI encoding');

{
  ok(aws.uriEncode("-_.~azAZ09", false) === '-_.~azAZ09', 'Unreserved characters are left alone');
  /* encodeURIComponent leaves these five alone and AWS does not. A key holding
     one would be signed differently from the way it is sent, and the 403 that
     follows names neither the character nor the header. */
  ok(aws.uriEncode("!'()*", false) === '%21%27%28%29%2A',
    "!'()* are encoded — encodeURIComponent would not have", aws.uriEncode("!'()*", false));
  ok(aws.uriEncode('a b', false) === 'a%20b', 'A space is %20, never +', aws.uriEncode('a b', false));
  ok(aws.uriEncode('a/b', false) === 'a/b' && aws.uriEncode('a/b', true) === 'a%2Fb',
    'A slash survives in a path and is escaped in a query value');
  ok(aws.uriEncode('é', false) === '%C3%A9',
    'Encoding runs over UTF-8 bytes, so one character can become several escapes',
    aws.uriEncode('é', false));
  ok(aws.canonicalPath('/ab/cdef.mp3') === '/ab/cdef.mp3',
    'An audio key keeps its separator: ab/cdef.mp3 is a path, not one escaped name');
  ok(aws.canonicalPath('/') === '/' && aws.canonicalPath('') === '/', 'An empty path canonicalises to /');
  ok(aws.canonicalQuery('b=2&a=1&a=0') === 'a=0&a=1&b=2',
    'Query parameters sort by name then value', aws.canonicalQuery('b=2&a=1&a=0'));
}

/* ============ 3. Where the credential comes from ============ */
head('Credentials, without storing a key');

await withEnv(env(), async () => {
  ok(aws.credentialSource() === null, 'Nothing set means no credential', String(aws.credentialSource()));
  ok(aws.configured() === false, 'and configured() says so');
  let threw = null;
  try { await aws.credentials(); } catch (e) { threw = e; }
  ok(threw && /No AWS credential/.test(threw.message), 'Asking anyway throws rather than inventing one');
});

await withEnv(env({ AWS_ACCESS_KEY_ID: KEY_ID, AWS_SECRET_ACCESS_KEY: SECRET }), async () => {
  ok(aws.credentialSource() === 'static', 'Two environment variables are the static source');
  const c = await aws.credentials();
  ok(c.accessKeyId === KEY_ID && c.secretAccessKey === SECRET, 'and they are used as given');
});

{
  /* The ECS / Fargate / App Runner task role: keys from a link-local endpoint,
     rotated by the platform, never stored anywhere. */
  let hits = 0, sawAuth = null, path = null;
  const fake = await listen(async (req, res) => {
    hits++; path = req.url; sawAuth = req.headers.authorization || null;
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
      AccessKeyId: 'ASIACONTAINER', SecretAccessKey: 'container-secret', Token: 'container-token',
      Expiration: new Date(Date.now() + 3600e3).toISOString()
    }));
  });
  try {
    await withEnv(env({
      ECS_CONTAINER_METADATA_HOST: fake.url,
      AWS_CONTAINER_CREDENTIALS_RELATIVE_URI: '/v2/credentials/abc',
      AWS_CONTAINER_AUTHORIZATION_TOKEN: 'task-token'
    }), async () => {
      ok(aws.credentialSource() === 'container', 'A relative URI means the container provider');
      const c = await aws.credentials();
      ok(c.accessKeyId === 'ASIACONTAINER' && c.sessionToken === 'container-token',
        'which hands back temporary keys and a session token');
      ok(path === '/v2/credentials/abc', 'from the exact path the platform gave', String(path));
      ok(sawAuth === 'task-token', 'carrying the task token when there is one', String(sawAuth));
      await aws.credentials();
      await aws.credentials();
      ok(hits === 1, 'and it is fetched once, not once per request', String(hits));
    });
  } finally { await fake.close(); }
}

{
  /* IMDSv2 on EC2. The PUT for a token is the whole security property: a
     server-side request forgery can make the process issue a GET, but not a
     PUT carrying this header, so instance credentials cannot be lifted by
     tricking the application into fetching a URL. */
  const seen = [];
  const fake = await listen(async (req, res) => {
    seen.push(`${req.method} ${req.url}`);
    if (req.method === 'PUT' && req.url === '/latest/api/token') {
      if (!req.headers['x-aws-ec2-metadata-token-ttl-seconds']) { res.writeHead(400); return res.end(); }
      res.writeHead(200); return res.end('imds-token');
    }
    if (req.headers['x-aws-ec2-metadata-token'] !== 'imds-token') { res.writeHead(401); return res.end(); }
    if (req.url === '/latest/meta-data/iam/security-credentials/') {
      res.writeHead(200); return res.end('vpet-task-role');
    }
    if (req.url === '/latest/meta-data/iam/security-credentials/vpet-task-role') {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      return res.end(JSON.stringify({
        AccessKeyId: 'ASIAIMDS', SecretAccessKey: 'imds-secret', Token: 'imds-session',
        Expiration: new Date(Date.now() + 3600e3).toISOString()
      }));
    }
    res.writeHead(404); res.end();
  });
  try {
    await withEnv(env({ AWS_EC2_METADATA_SERVICE_ENDPOINT: fake.url }), async () => {
      ok(aws.credentialSource() === 'imds', 'An instance endpoint means the metadata service');
      const c = await aws.credentials();
      ok(c.accessKeyId === 'ASIAIMDS' && c.sessionToken === 'imds-session',
        'which returns the instance role\'s temporary keys');
      ok(seen[0] === 'PUT /latest/api/token',
        'IMDSv2: the token is taken with a PUT before anything is read', seen[0]);
      ok(seen.every(s => !/^GET \/latest\/api\/token/.test(s)),
        'and there is no IMDSv1 fallback to a plain GET, which is how instance keys get stolen');
    });
  } finally { await fake.close(); }
}

await withEnv(env({ AWS_EC2_METADATA_SERVICE_ENDPOINT: 'http://127.0.0.1:1' }), async () => {
  let threw = null;
  try { await aws.credentials(); } catch (e) { threw = e; }
  ok(threw, 'A metadata service that cannot be reached throws');
  let second = null;
  try { await aws.credentials(); } catch (e) { second = e; }
  ok(second, 'and the failure is not cached as a rejected promise every later caller re-throws');
});

/* ============ 4. The driver, against an S3 that checks the signature ============ */
head('The driver, against a fake S3 that verifies what arrives');

{
  const objects = new Map();
  const log = [];

  /* Rebuilt from the bytes that ARRIVED, with an implementation written here
     rather than imported — so signing one thing and sending another is caught
     rather than agreed with. */
  function verify(req, body) {
    const auth = req.headers.authorization || '';
    const m = auth.match(/^AWS4-HMAC-SHA256 Credential=([^/]+)\/(\d{8})\/([^/]+)\/([^/]+)\/aws4_request, SignedHeaders=([^,]+), Signature=([0-9a-f]{64})$/);
    if (!m) return 'no usable Authorization header';
    const [, keyId, dateStamp, region, service, signedHeaders, signature] = m;
    if (keyId !== KEY_ID) return 'unknown access key';

    const hex = d => crypto.createHash('sha256').update(d).digest('hex');
    const H = (k, d) => crypto.createHmac('sha256', k).update(d, 'utf8').digest();
    const enc = str => encodeURIComponent(str).replace(/[!'()*]/g, c =>
      '%' + c.charCodeAt(0).toString(16).toUpperCase());

    const url = new URL(req.url, 'http://' + req.headers.host);
    const canonicalPath = '/' + url.pathname.replace(/^\//, '').split('/')
      .map(seg => enc(decodeURIComponent(seg))).join('/');
    const headerLines = signedHeaders.split(';')
      .map(h => `${h}:${String(req.headers[h] || '').trim()}`).join('\n');
    const canonical = [
      req.method, canonicalPath, '', headerLines + '\n', signedHeaders, hex(body)
    ].join('\n');
    const stringToSign = ['AWS4-HMAC-SHA256', req.headers['x-amz-date'],
      `${dateStamp}/${region}/${service}/aws4_request`, hex(canonical)].join('\n');
    let k = H('AWS4' + SECRET, dateStamp);
    for (const part of [region, service, 'aws4_request']) k = H(k, part);
    if (H(k, stringToSign).toString('hex') !== signature) return 'signature mismatch';
    if (req.headers['x-amz-content-sha256'] !== hex(body)) return 'body does not match its declared hash';
    return null;
  }

  const fake = await listen(async (req, res) => {
    const body = await readBody(req);
    const bad = verify(req, body);
    log.push(`${req.method} ${req.url} ${bad || 'ok'}`);
    if (bad) { res.writeHead(403, { 'Content-Type': 'text/plain' }); return res.end(bad); }
    const name = req.url.replace(/^\/vpet-audio\//, '');
    if (req.method === 'PUT') { objects.set(name, body); res.writeHead(200); return res.end(); }
    if (req.method === 'GET') {
      const held = objects.get(name);
      if (!held) { res.writeHead(404); return res.end('NoSuchKey'); }
      res.writeHead(200, { 'Content-Type': 'audio/mpeg' }); return res.end(held);
    }
    if (req.method === 'DELETE') { objects.delete(name); res.writeHead(204); return res.end(); }
    res.writeHead(405); res.end();
  });

  try {
    await withEnv(env({
      AUDIO_STORAGE: 's3', S3_BUCKET: 'vpet-audio', S3_ENDPOINT: fake.url,
      AWS_REGION: 'ap-southeast-1', AWS_ACCESS_KEY_ID: KEY_ID, AWS_SECRET_ACCESS_KEY: SECRET
    }), async () => {
      ok(storage.driverName() === 's3', 'With a bucket, a region and keys, the driver is s3',
        storage.driverName());

      const put = await storage.put(MP3, 'audio/mpeg');
      ok(put.driver === 's3' && put.bytes === MP3.length, 'An MP3 uploads', JSON.stringify(put));
      ok(log[0] && log[0].endsWith('ok'), 'and the signature verified against what arrived', log[0]);
      ok(/^\/vpet-audio\/[0-9a-f]{2}\/[0-9a-f]{32}\.mp3$/.test(log[0].split(' ')[1]),
        'at bucket/two-hex/key.mp3, with the slash left as a path separator', log[0]);

      const got = await storage.get(put.key);
      ok(Buffer.compare(got.body, MP3) === 0, 'and reads back byte for byte');

      await storage.remove(put.key);
      const gone = await storage.get(put.key).then(() => null, e => e);
      ok(gone && /404/.test(gone.message), 'A removed object is gone', gone && gone.message);

      await storage.remove(put.key);
      ok(true, 'and removing it twice is not an error');

      /* Proof the fake is actually checking rather than nodding along. */
      const tampered = await fetch(`${fake.url}/vpet-audio/aa/${'0'.repeat(32)}.mp3`, {
        method: 'PUT',
        headers: (await aws.sign({
          method: 'PUT', url: `${fake.url}/vpet-audio/aa/${'0'.repeat(32)}.mp3`,
          body: MP3, service: 's3'
        })).headers,
        body: Buffer.concat([MP3, Buffer.from('tampered')])
      });
      ok(tampered.status === 403, 'A body changed after signing is refused', String(tampered.status));
    });
  } finally { await fake.close(); }
}

/* ============ 5. Named but not configured ============ */
head('What happens without the credential');

await withEnv(env(), () => {
  ok(storage.driverName() === 'disk', 'Nothing configured means disk');
});

await withEnv(env({ AUDIO_STORAGE: 's3' }), () => {
  ok(storage.driverName() === 'disk',
    'AUDIO_STORAGE=s3 with nothing else falls back to disk outside production');
});

await withEnv(env({ AUDIO_STORAGE: 's3', S3_BUCKET: 'b', AWS_REGION: 'ap-southeast-1', NODE_ENV: 'production' }), () => {
  let threw = null;
  try { storage.driverName(); } catch (e) { threw = e; }
  ok(threw && /AWS credential/.test(threw.message),
    'In production a bucket with no credential refuses to start', threw && threw.message);
});

await withEnv(env({
  AUDIO_STORAGE: 's3', AWS_REGION: 'ap-southeast-1',
  AWS_ACCESS_KEY_ID: KEY_ID, AWS_SECRET_ACCESS_KEY: SECRET, NODE_ENV: 'production'
}), () => {
  let threw = null;
  try { storage.driverName(); } catch (e) { threw = e; }
  ok(threw && /S3_BUCKET/.test(threw.message),
    'and a credential with no bucket refuses too', threw && threw.message);
});

await withEnv(env({
  AUDIO_STORAGE: 's3', S3_BUCKET: 'b',
  AWS_ACCESS_KEY_ID: KEY_ID, AWS_SECRET_ACCESS_KEY: SECRET, NODE_ENV: 'production'
}), () => {
  let threw = null;
  try { storage.driverName(); } catch (e) { threw = e; }
  /* No default region on purpose: us-east-1 is the default everywhere else in
     the AWS world and it is wrong for almost every bucket. What it buys is a
     redirect the signature does not survive, reported as a 403. */
  ok(threw && /AWS_REGION/.test(threw.message),
    'A missing region is named rather than defaulted to us-east-1', threw && threw.message);
});

await withEnv(env({
  AUDIO_STORAGE: 's3', S3_BUCKET: 'b', AWS_REGION: 'ap-southeast-1',
  AWS_ACCESS_KEY_ID: KEY_ID, AWS_SECRET_ACCESS_KEY: SECRET, NODE_ENV: 'production'
}), () => {
  ok(storage.driverName() === 's3', 'With all three, production is happy');
});

await withEnv(env({
  AUDIO_STORAGE: 'S3', S3_BUCKET: 'b', AWS_REGION: 'ap-southeast-1',
  AWS_ACCESS_KEY_ID: KEY_ID, AWS_SECRET_ACCESS_KEY: SECRET
}), () => {
  ok(storage.driverName() === 's3', 'The driver name is read case-insensitively');
});

await withEnv(env({
  AUDIO_STORAGE: 's3', S3_BUCKET: 'b', AWS_REGION: 'ap-southeast-1',
  AWS_CONTAINER_CREDENTIALS_RELATIVE_URI: '/v2/credentials/x', NODE_ENV: 'production'
}), () => {
  ok(storage.driverName() === 's3',
    'A task role counts as a credential — nothing has to be stored for production to start');
});

console.log(`\n${fail === 0 ? '\x1b[32m✔' : '\x1b[31m✗'} ${pass} passed, ${fail} failed\x1b[0m`);
process.exit(fail === 0 ? 0 : 1);
