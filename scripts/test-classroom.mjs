/**
 * Google Classroom: the sealed grant, the token it renews, and the two reads.
 *
 * Run: node scripts/test-classroom.mjs   (needs no server and no browser)
 *
 * Classroom is the one Google integration on this platform that acts as a
 * PERSON rather than as the server, so it is the one that has to hold a
 * long-lived credential belonging to somebody else. Three things follow, and
 * they are what this file is about:
 *
 *  · **The refresh token is sealed.** AES-256-GCM, so a row lifted out of a
 *    backup is inert, and a row edited in place fails to open rather than
 *    decrypting to something. Proved by tampering with each of the three
 *    segments in turn, not by reading the code and agreeing with it.
 *
 *  · **With no key, the feature is off.** Not "on, storing the token in the
 *    clear" — that would make the least secure deployment the one that took no
 *    action.
 *
 *  · **A grant belongs to one administrator.** Two admins, two grants, and
 *    neither can spend the other's; asserted rather than assumed, because the
 *    id is threaded through a token cache and a callback.
 *
 * A fake Google stands in for the token endpoint and the Classroom API, and
 * asserts on what arrives: the grant type, the bearer token, the page walk.
 */
import http from 'node:http';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import crypto from 'node:crypto';
import { createRequire } from 'node:module';

const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'prep-classroom-'));
process.env.PREP_DB = path.join(tmp, 'probe.sqlite');

const require_ = createRequire(import.meta.url);

let pass = 0, fail = 0;
const ok = (c, name, detail) => {
  if (c) { pass++; console.log('✓ ' + name); return; }
  fail++;
  console.log('✗ ' + name + (detail === undefined ? '' : '  → ' + detail));
};
const head = t => console.log('\n\x1b[1m== ' + t + ' ==\x1b[0m');

const KEY = crypto.randomBytes(32).toString('base64');

/* Set before the modules load, so the first read of any of them is the
   configured one. */
Object.assign(process.env, {
  GOOGLE_CLIENT_ID: 'test-client.apps.googleusercontent.com',
  GOOGLE_CLIENT_SECRET: 'test-secret',
  TOKEN_ENCRYPTION_KEY: KEY,
  NODE_ENV: 'test'
});

const { q } = require_('../server/db.js');
const classroom = require_('../server/classroom.js');

async function withEnv(vars, fn) {
  const before = new Map(Object.keys(vars).map(k => [k, process.env[k]]));
  for (const [k, v] of Object.entries(vars)) {
    if (v === undefined) delete process.env[k]; else process.env[k] = v;
  }
  classroom.resetCache();
  try { return await fn(); }
  finally {
    for (const [k, v] of before) {
      if (v === undefined) delete process.env[k]; else process.env[k] = v;
    }
    classroom.resetCache();
  }
}

async function listen(handler) {
  const server = http.createServer(handler);
  await new Promise(r => server.listen(0, '127.0.0.1', r));
  return { url: `http://127.0.0.1:${server.address().port}`, close: () => new Promise(r => server.close(r)) };
}

const readBody = req => new Promise(resolve => {
  const chunks = [];
  req.on('data', c => chunks.push(c));
  req.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')));
});

/* Two administrators to prove one cannot spend the other's grant. */
const ADMIN_A = await (async () => {
  await q.run(`INSERT INTO admins (username,name,pass_hash,role,active,created_at)
               VALUES ('teacher-a','Teacher A','x','owner',1,?)`, new Date().toISOString());
  return q.val("SELECT id FROM admins WHERE username='teacher-a'");
})();
const ADMIN_B = await (async () => {
  await q.run(`INSERT INTO admins (username,name,pass_hash,role,active,created_at)
               VALUES ('teacher-b','Teacher B','x','editor',1,?)`, new Date().toISOString());
  return q.val("SELECT id FROM admins WHERE username='teacher-b'");
})();

/* ============ 1. Sealing the refresh token ============ */
head('The refresh token at rest');

{
  const secretToken = '1//0gRefreshTokenFromGoogle-abcdefghijklmnop';
  const sealed = classroom.seal(secretToken);

  ok(!sealed.includes(secretToken), 'The sealed value does not contain the token', sealed.slice(0, 24) + '…');
  ok(sealed.split('.').length === 3, 'and is iv.ciphertext.tag', sealed.split('.').length + ' parts');
  ok(classroom.open(sealed) === secretToken, 'and opens back to exactly what went in');
  ok(classroom.seal(secretToken) !== sealed,
    'Sealing twice gives different bytes — the nonce is not reused');

  /* GCM, so every part is authenticated. Checked one segment at a time,
     because a mode that only protected the ciphertext would still pass a test
     that flipped a byte in the middle. */
  const parts = sealed.split('.');
  ['iv', 'ciphertext', 'tag'].forEach((label, i) => {
    const bytes = Buffer.from(parts[i], 'base64url');
    bytes[0] ^= 0x01;
    const bent = parts.slice();
    bent[i] = bytes.toString('base64url');
    let threw = null;
    try { classroom.open(bent.join('.')); } catch (e) { threw = e; }
    ok(threw, `A tampered ${label} fails to open rather than decrypting to something`);
  });

  await withEnv({ TOKEN_ENCRYPTION_KEY: crypto.randomBytes(32).toString('base64') }, () => {
    let threw = null;
    try { classroom.open(sealed); } catch (e) { threw = e; }
    ok(threw, 'and another key cannot open it either');
  });

  await withEnv({ TOKEN_ENCRYPTION_KEY: Buffer.from('too short').toString('base64') }, () => {
    let threw = null;
    try { classroom.seal('x'); } catch (e) { threw = e; }
    ok(threw && /32 bytes/.test(threw.message),
      'A key of the wrong length is refused, not stretched into shape', threw && threw.message);
  });
}

/* ============ 2. Off is off ============ */
head('What happens without the configuration');

await withEnv({ TOKEN_ENCRYPTION_KEY: undefined }, async () => {
  ok(classroom.enabled() === false, 'With no encryption key the feature is off');
  ok(classroom.missing().includes('TOKEN_ENCRYPTION_KEY'), 'and says which piece is missing',
    JSON.stringify(classroom.missing()));
  const st = await classroom.status(ADMIN_A);
  ok(st.enabled === false && st.linked === false, 'status() reports it off rather than half-on');
  let threw = null;
  try { await classroom.saveGrant(ADMIN_A, { refreshToken: 'x' }); } catch (e) { threw = e; }
  ok(threw, 'and a token cannot be stored at all — never in the clear');
});

await withEnv({ GOOGLE_CLIENT_ID: undefined }, () => {
  ok(classroom.enabled() === false, 'With no OAuth client it is off too');
  ok(classroom.missing().join(' ').includes('GOOGLE_CLIENT_ID'), 'and names that as well');
});

ok(classroom.enabled() === true, 'With both, it is on');

/* ============ 3. The consent URL ============ */
head('The consent screen');

{
  const url = new URL(classroom.consentUrl({ redirectUri: 'https://vpet.example/auth/google/classroom/callback', state: 'st-123' }));
  const p = url.searchParams;
  ok(p.get('access_type') === 'offline', 'access_type=offline, or Google returns no refresh token at all');
  ok(p.get('prompt') === 'consent',
    'prompt=consent, or a RE-link comes back with no refresh token and the grant cannot renew');
  ok(p.get('include_granted_scopes') === 'true',
    'and previously granted scopes are kept rather than replaced');
  ok(p.get('state') === 'st-123' && p.get('response_type') === 'code', 'state and response_type are set');

  const scopes = (p.get('scope') || '').split(' ');
  ok(scopes.includes('https://www.googleapis.com/auth/classroom.courses.readonly') &&
     scopes.includes('https://www.googleapis.com/auth/classroom.rosters.readonly'),
    'The read scopes are requested');
  ok(!scopes.some(s => /coursework|announcements|\.push/.test(s)),
    'and nothing is requested that this slice does not use — coursework comes with the feature that needs it',
    scopes.join(' '));
}

/* ============ 4. The grant, the token, and the two reads ============ */
head('Talking to Classroom');

{
  const seen = [];
  let tokenCalls = 0;
  let tokenMode = 'ok';

  const fake = await listen(async (req, res) => {
    const url = new URL(req.url, 'http://x');
    const body = await readBody(req);
    seen.push(`${req.method} ${url.pathname}`);

    if (url.pathname === '/token') {
      tokenCalls++;
      const form = new URLSearchParams(body);
      if (form.get('grant_type') !== 'refresh_token') {
        res.writeHead(400); return res.end(JSON.stringify({ error: 'unsupported_grant_type' }));
      }
      if (tokenMode === 'revoked') {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        return res.end(JSON.stringify({ error: 'invalid_grant', error_description: 'Token has been expired or revoked.' }));
      }
      if (form.get('refresh_token') !== 'refresh-A') {
        res.writeHead(400); return res.end(JSON.stringify({ error: 'invalid_grant' }));
      }
      res.writeHead(200, { 'Content-Type': 'application/json' });
      return res.end(JSON.stringify({ access_token: 'access-A', expires_in: 3600, token_type: 'Bearer' }));
    }

    if (req.headers.authorization !== 'Bearer access-A') {
      res.writeHead(401); return res.end(JSON.stringify({ error: { message: 'no' } }));
    }

    if (url.pathname === '/v1/courses') {
      /* Two pages, so the walk is exercised rather than assumed. */
      const page = url.searchParams.get('pageToken');
      res.writeHead(200, { 'Content-Type': 'application/json' });
      if (!page) {
        return res.end(JSON.stringify({
          courses: [{ id: '101', name: 'VPET B1 — morning', section: 'K62', enrollmentCode: 'abc123',
            alternateLink: 'https://classroom.google.com/c/101', courseState: 'ACTIVE' }],
          nextPageToken: 'p2'
        }));
      }
      return res.end(JSON.stringify({
        courses: [{ id: '102', name: 'VPET B2 — evening', courseState: 'ACTIVE' }]
      }));
    }

    if (url.pathname === '/v1/courses/101/students') {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      return res.end(JSON.stringify({
        students: [
          { userId: 'g-1', profile: { id: 'g-1', name: { fullName: 'Nguyen Thu Hang' }, emailAddress: 'PROBE.Student@vidu.vn', photoUrl: 'https://…' } },
          { userId: 'g-2', profile: { id: 'g-2', name: { fullName: 'Someone Else' }, emailAddress: 'nobody@vidu.vn' } },
          { userId: 'g-3', profile: { id: 'g-3', name: { fullName: 'No Email Granted' } } }
        ]
      }));
    }

    if (url.pathname === '/revoke') { res.writeHead(200); return res.end('{}'); }
    res.writeHead(404); res.end(JSON.stringify({ error: { message: 'not found' } }));
  });

  const fakeGoogle = {
    GOOGLE_TOKEN_ENDPOINT: fake.url + '/token',
    CLASSROOM_API: fake.url,
    GOOGLE_REVOKE_ENDPOINT: fake.url + '/revoke'
  };

  try {
    /* A local account with the same email as one of the students, so the
       matching can be checked rather than described. */
    /* A name the seed does not already use — this runs against a freshly
       seeded throwaway database, which has eight demo students in it. */
    await q.run(`INSERT INTO users (username,email,name,verified,status,interests_json,created_at)
                 VALUES ('classroom.probe','probe.student@vidu.vn','Classroom Probe',1,'active','[]',?)`,
      new Date().toISOString());

    await withEnv(fakeGoogle, async () => {
      await classroom.saveGrant(ADMIN_A, {
        refreshToken: 'refresh-A', email: 'teacher.a@vidu.vn',
        scope: classroom.SCOPES.join(' ')
      });

      const row = await q.get('SELECT * FROM google_grants WHERE admin_id=?', ADMIN_A);
      ok(!!row, 'The grant is stored');
      ok(!row.token_enc.includes('refresh-A'), 'with the token sealed, not in the column',
        row.token_enc.slice(0, 20) + '…');

      const st = await classroom.status(ADMIN_A);
      ok(st.linked === true && st.email === 'teacher.a@vidu.vn', 'status() reports it linked');
      ok(!JSON.stringify(st).includes('refresh-A'),
        'and status() carries no part of the token — the screen never needs it');

      const one = await classroom.accessTokenFor(ADMIN_A);
      ok(one === 'access-A', 'The refresh token buys an access token', one);
      await classroom.accessTokenFor(ADMIN_A);
      await classroom.accessTokenFor(ADMIN_A);
      ok(tokenCalls === 1, 'which is cached, not minted per call', String(tokenCalls));

      const list = await classroom.courses(ADMIN_A);
      ok(list.courses.length === 2, 'Both pages of courses are walked', String(list.courses.length));
      ok(list.courses[0].name === 'VPET B1 — morning' && list.courses[0].enrolmentCode === 'abc123',
        'and mapped onto this platform\'s own field names');

      const r = await classroom.roster(ADMIN_A, '101');
      ok(r.students.length === 3, 'The roster comes back', String(r.students.length));
      const hang = r.students.find(s => s.userId === 'g-1');
      ok(hang.localUserId !== null,
        'A student whose Google email matches a local account is linked to it, case-insensitively',
        JSON.stringify(hang));
      ok(r.students.find(s => s.userId === 'g-2').localUserId === null,
        'and one with no local account is reported as unmatched rather than invented');
      ok(r.students.find(s => s.userId === 'g-3').email === null,
        'A student whose email the teacher did not grant is null, not an empty string');
      ok(r.students.every(s => s.photo === null),
        'No photo URL is passed on — it is personal data this platform has no use for');
    });

    /* One administrator must not be able to spend another's permission. */
    await withEnv(fakeGoogle, async () => {
      let threw = null;
      try { await classroom.accessTokenFor(ADMIN_B); } catch (e) { threw = e; }
      ok(threw && /has not connected/.test(threw.message),
        'A second administrator has no grant and cannot borrow the first one', threw && threw.message);
      const st = await classroom.status(ADMIN_B);
      ok(st.linked === false, 'and their status says so');
    });

    /* The failure that actually happens in production: the teacher revokes. */
    await withEnv(fakeGoogle, async () => {
      tokenMode = 'revoked';
      let threw = null;
      try { await classroom.accessTokenFor(ADMIN_A); } catch (e) { threw = e; }
      ok(threw && /reconnect/i.test(threw.message),
        'A revoked grant says to reconnect rather than reporting a bare invalid_grant',
        threw && threw.message);
      let second = null;
      try { await classroom.accessTokenFor(ADMIN_A); } catch (e) { second = e; }
      ok(second, 'and the failure is not cached as a rejected promise for the life of the process');
      tokenMode = 'ok';
    });

    await withEnv(fakeGoogle, async () => {
      const gone = await classroom.unlink(ADMIN_A);
      ok(gone === true, 'Unlinking reports that there was something to unlink');
      ok(seen.includes('POST /revoke'), 'and tells Google to forget it too', seen.join(', '));
      ok(!(await q.get('SELECT 1 FROM google_grants WHERE admin_id=?', ADMIN_A)), 'The row is gone');
      ok((await classroom.unlink(ADMIN_A)) === false, 'and unlinking twice is not an error');
    });
  } finally { await fake.close(); }
}

/* ============ 5. The routes exist and are guarded ============ */
head('Where it is reachable from');

{
  const map = await import('./security-map.mjs');
  const rows = map.routeTable(require_);
  const find = (method, p) => rows.find(r => r.method === method && r.path === p);

  for (const [method, p] of [
    ['GET', '/api/admin/classroom'],
    ['GET', '/api/admin/classroom/courses'],
    ['GET', '/api/admin/classroom/courses/:courseId/roster'],
    ['POST', '/api/admin/classroom/unlink']
  ]) {
    const row = find(method, p);
    ok(row && row.guards.includes('requireAdmin'), `${method} ${p} is behind requireAdmin`);
  }

  ok(find('POST', '/api/admin/classroom/unlink').guards.includes('csrfGuard'),
    'and the one write also carries csrfGuard');

  /* The consent round trip is two browser navigations, so it cannot carry a
     CSRF header — but it must still be an administrator making it. */
  for (const p of ['/auth/google/classroom', '/auth/google/classroom/callback']) {
    const row = find('GET', p);
    ok(row && row.guards.includes('requireAdmin'), `GET ${p} is behind requireAdmin`);
  }
}

fs.rmSync(tmp, { recursive: true, force: true });
console.log(`\n${fail === 0 ? '\x1b[32m✔' : '\x1b[31m✗'} ${pass} passed, ${fail} failed\x1b[0m`);
process.exit(fail === 0 ? 0 : 1);
