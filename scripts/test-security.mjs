/**
 * Security sweep: headers, the write limit, and the per-endpoint guard table.
 *
 * Run with the server up: node scripts/test-security.mjs
 *
 * Three halves, and the third is the one that keeps paying:
 *
 * - Headers: read over real HTTP, on an HTML page, on an API response and on a
 *   static file, because those three take three different paths through the server.
 * - Write limit: call the middleware directly with a fake req/res. Firing 300
 *   real requests just to see a 429 costs time and proves less.
 * - The guard table: read the Express stack, assert that EVERY mutating route has
 *   csrfGuard and an auth guard, except the eight declared in PUBLIC_WRITES. Then
 *   regenerate the table in docs/SECURITY.md and compare — one line adrift is red.
 *   Add an endpoint without a guard and it breaks here, not at the next sweep.
 */
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const BASE = process.env.BASE || 'http://127.0.0.1:3000';
let pass = 0, fail = 0;
const ok = (c, name, detail) => {
  if (c) { pass++; console.log('✓ ' + name); return; }
  fail++;
  console.log('✗ ' + name + (detail === undefined ? '' : '  → ' + detail));
};
const head = t => console.log('\n\x1b[1m== ' + t + ' ==\x1b[0m');

let tmp = '';
try {
  head('Headers on every response');

  const html = await fetch(BASE + '/prep/landing/');
  const api = await fetch(BASE + '/api/catalog');
  const asset = await fetch(BASE + '/prep/learn/_tts.js');

  /* The base headers have to be on all three branches. Before this sweep only the
     HTML pages got them; API responses and static files went out bare. */
  for (const [label, r] of [['an HTML page', html], ['an API response', api], ['a static file', asset]]) {
    ok(r.status === 200, 'Can read ' + label, 'status ' + r.status);
    ok(r.headers.get('x-content-type-options') === 'nosniff',
      'nosniff on ' + label, String(r.headers.get('x-content-type-options')));
    ok(r.headers.get('referrer-policy') === 'strict-origin-when-cross-origin',
      'Referrer-Policy on ' + label, String(r.headers.get('referrer-policy')));
    ok(r.headers.get('x-frame-options') === 'SAMEORIGIN',
      'X-Frame-Options on ' + label, String(r.headers.get('x-frame-options')));
    ok(r.headers.get('cross-origin-opener-policy') === 'same-origin',
      'COOP on ' + label);
    ok(r.headers.get('cross-origin-resource-policy') === 'same-origin',
      'CORP on ' + label);
    ok((r.headers.get('permissions-policy') || '').includes('camera=()'),
      'Permissions-Policy on ' + label);
  }

  /* The microphone is the one capability the platform really uses — the speaking
     parts record through MediaRecorder. Deny it by mistake and they break silently. */
  const pp = html.headers.get('permissions-policy') || '';
  ok(pp.includes('microphone=(self)'),
    'Permissions-Policy still allows the microphone — speaking needs MediaRecorder', pp.slice(0, 120));
  ok(pp.includes('camera=()') && pp.includes('geolocation=()'),
    'Camera and geolocation are off');

  ok(!html.headers.get('strict-transport-security'),
    'No HSTS over plain HTTP — sending it in dev would pin localhost to HTTPS',
    String(html.headers.get('strict-transport-security')));

  const csp = html.headers.get('content-security-policy') || '';
  ok(/script-src 'self' 'nonce-/.test(csp), 'HTML pages keep their per-request nonce CSP');
  ok(csp.includes("default-src 'self'"), 'The HTML CSP is still default-src self');

  const apiCsp = api.headers.get('content-security-policy') || '';
  ok(apiCsp.includes("default-src 'none'") && apiCsp.includes("frame-ancestors 'none'"),
    'An API response carries the locked-down CSP, not the document one', apiCsp);
  ok((api.headers.get('x-robots-tag') || '').includes('noindex'),
    'API responses are not indexable');
  ok(!(asset.headers.get('content-security-policy') || '').includes("default-src 'none'"),
    'A static file does not pick up the API CSP');

  head('Write limit');

  tmp = mkdtempSync(join(tmpdir(), 'prep-sec-'));
  process.env.PREP_DB = join(tmp, 'probe.sqlite');
  const require_ = createRequire(import.meta.url);
  const security = require_('../server/security.js');

  const fakeRes = () => {
    const r = { headers: {}, code: 0, body: null };
    r.setHeader = (k, v) => { r.headers[k.toLowerCase()] = v; };
    r.status = c => { r.code = c; return r; };
    r.json = b => { r.body = b; return r; };
    return r;
  };
  const fakeReq = (method, cookie, ip) => ({
    method, ip: ip || '203.0.113.7', path: '/api/admin/tests',
    headers: cookie ? { cookie } : {}
  });

  /* Reads are never counted: reloading a list several times is ordinary, and
     putting it in the same bucket as writes would lock the wrong person out. */
  let called = 0;
  security.writeLimit(fakeReq('GET'), fakeRes(), () => called++);
  security.writeLimit(fakeReq('HEAD'), fakeRes(), () => called++);
  ok(called === 2, 'GET and HEAD pass straight through, spending no write allowance', String(called));

  /* Two sessions need separate buckets, or one busy user locks out another — and
     one session shares a bucket whatever the address, because that is the unit a
     stolen session is spent in. */
  const keyA = security.writeKey(fakeReq('POST', 'prep_user=aaaa'));
  const keyB = security.writeKey(fakeReq('POST', 'prep_user=bbbb'));
  const keyA2 = security.writeKey(fakeReq('POST', 'prep_user=aaaa'));
  ok(keyA !== keyB, 'Two sessions are counted separately');
  ok(keyA === keyA2, 'One session means one bucket');
  ok(!keyA.includes('aaaa'), 'The session token is hashed, not put in the key raw', keyA);
  ok(security.writeKey(fakeReq('POST', '', '198.51.100.1')) !==
     security.writeKey(fakeReq('POST', '', '198.51.100.2')),
    'Signed out, counting falls back to the address');

  /* Hitting the ceiling must be a 429 with Retry-After, not a 500 and not silence. */
  const cookie = 'prep_user=' + 'z'.repeat(20);
  let last = null, passed = 0;
  for (let i = 0; i < security.WRITE_PER_MIN + 2; i++) {
    const res = fakeRes();
    security.writeLimit(fakeReq('POST', cookie, '198.51.100.9'), res, () => passed++);
    last = res;
  }
  ok(passed === security.WRITE_PER_MIN,
    'Exactly ' + security.WRITE_PER_MIN + ' writes pass before the block', String(passed));
  ok(last.code === 429, 'The ceiling answers 429', String(last.code));
  ok(Number(last.headers['retry-after']) > 0, 'With Retry-After in seconds',
    String(last.headers['retry-after']));

  head('Per-endpoint guard table');

  const map = await import('./security-map.mjs');
  const rows = map.routeTable(require_);
  ok(rows.length >= 70, 'The route table reads out of the Express stack', String(rows.length));

  const mutating = rows.filter(r => r.mutating);
  ok(mutating.length >= 40, 'Enough mutating routes for the table to mean anything', String(mutating.length));

  /* The point of the whole sweep: every mutating route has an auth guard and
     csrfGuard, except the ones declared. "Except" checked in both directions. */
  const declared = new Set(Object.keys(map.PUBLIC_WRITES));
  const naked = mutating.filter(r =>
    !r.guards.includes('requireAdmin') && !r.guards.includes('requireUser'));
  const undeclared = naked.filter(r => !declared.has(r.method + ' ' + r.path));
  ok(undeclared.length === 0,
    'No mutating route lacks an auth guard without being declared in PUBLIC_WRITES',
    undeclared.map(r => r.method + ' ' + r.path).join(', '));

  const stale = [...declared].filter(k =>
    !naked.some(r => (r.method + ' ' + r.path) === k));
  ok(stale.length === 0,
    'PUBLIC_WRITES carries no stale row — a guarded endpoint must leave the list',
    stale.join(', '));
  ok(Object.values(map.PUBLIC_WRITES).every(v => v && v.length > 15),
    'Every exception names what stands in for a guard');

  /* No longer split by whether there is an auth guard: since 2026-08-12 the
     prep_csrf cookie is minted the moment an HTML page is served, so a signed-out
     visitor holds a token too and EVERY mutating route must carry csrfGuard. Before
     that, six public endpoints stood outside it — the one hole the previous sweep
     found and did not close. */
  ok(mutating.every(r => r.guards.includes('csrfGuard')),
    'Every mutating route has csrfGuard, including those that need no sign-in',
    mutating.filter(r => !r.guards.includes('csrfGuard')).map(r => r.method + ' ' + r.path).join(', '));

  ok(mutating.every(r => r.writeLimited),
    'Every mutating route sits under the global write limit');

  /* Three admin routes are registered BEFORE router.use('/admin', …) and so are not
     wrapped by it. That is deliberate — you cannot demand a sign-in at the place
     you sign in — but it needs checking, because a fourth route added in that spot
     would slip the guard while still reading as "inside /admin" in the source. */
  const adminUnguarded = rows.filter(r =>
    r.path.startsWith('/api/admin/') && !r.guards.includes('requireAdmin'));
  ok(adminUnguarded.length === 3 &&
     adminUnguarded.every(r => ['/api/admin/login', '/api/admin/logout', '/api/admin/me'].includes(r.path)),
    'Exactly three /admin routes sit outside requireAdmin, and exactly those three',
    adminUnguarded.map(r => r.method + ' ' + r.path).join(', '));

  head('docs/SECURITY.md still matches');

  const doc = readFileSync(new URL('../docs/SECURITY.md', import.meta.url), 'utf8');
  const marker = doc.indexOf('| Method | Endpoint | Guards | Write limit |');
  ok(marker > 0, 'The file has the generated table');
  ok(doc.slice(marker).trim() === map.markdownTable(rows).trim(),
    'The table in docs/SECURITY.md matches the current stack — re-run the script to update it');
} catch (e) {
  fail++;
  console.log('✗ Failed while running: ' + (e && e.stack ? e.stack : e));
} finally {
  if (tmp) rmSync(tmp, { recursive: true, force: true });
}

console.log('\n' + (fail ? '\x1b[31m' : '\x1b[32m') + pass + '/' + (pass + fail) + ' checks passed\x1b[0m');
process.exit(fail ? 1 : 0);
