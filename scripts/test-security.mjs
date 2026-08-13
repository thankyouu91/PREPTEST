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
import { execFileSync } from 'node:child_process';
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
  const DB_ = require_('../server/db.js');

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

  head('The throttle is shared, not per-process');

  /* The lockout and the sliding window used to be two Maps in one process's
     memory. A restart wiped every lockout — so the answer to being locked out
     was "restart the server", which is also the answer for whoever is guessing —
     and a second instance meant five attempts PER INSTANCE. Both now live in
     the database. These checks are what stops either from creeping back. */
  const A2 = require_('../server/auth.js');
  const KEY = '198.51.100.44|probe-account';
  A2.clearFailures(KEY);

  for (let i = 0; i < 4; i++) A2.noteFailure(KEY);
  ok(A2.isLocked(KEY) === 0, 'Four wrong passwords do not lock the account', String(A2.isLocked(KEY)));
  A2.noteFailure(KEY);
  const lockedFor = A2.isLocked(KEY);
  ok(lockedFor > 0 && lockedFor <= 900, 'The fifth does, for about fifteen minutes', String(lockedFor));

  /* The point of the whole change: another process, same database, same lock.
     Checked by actually running one, because "it is in a table now" is a claim
     about storage and this is a claim about behaviour. */
  const seen = execFileSync(process.execPath, ['-e',
    "console.log(require('./server/auth.js').isLocked(process.argv[1]))", KEY], {
    cwd: new URL('..', import.meta.url).pathname,
    env: { ...process.env, PREP_DB: process.env.PREP_DB },
    encoding: 'utf8',
    /* The child seeds a database on boot and Node warns about node:sqlite being
       experimental. Neither belongs in this suite's output. */
    stdio: ['ignore', 'pipe', 'ignore']
  }).trim().split('\n').pop();
  ok(Number(seen) > 0, 'A separate process sees the same lockout', 'child reported ' + seen);

  ok(A2.isLocked('198.51.100.44|somebody-else') === 0,
    'And it is that account that is locked, not everyone from that address');

  const cleared = A2.clearAllLocks();
  ok(cleared >= 1 && A2.isLocked(KEY) === 0,
    'clearAllLocks is the way out, now that a restart is not', String(cleared));

  /* The sliding window, same story. rateLimitPeek must spend nothing, or the
     act of asking "may I?" would itself use up the allowance. */
  const RL = 'probe-window|' + Date.now();
  ok(A2.rateLimitPeek(RL, 3, 60e3) === 0, 'An untouched key has its full allowance');
  ok(A2.rateLimitPeek(RL, 3, 60e3) === 0, 'And asking twice does not spend any of it');
  A2.rateLimit(RL, 3, 60e3);
  A2.rateLimit(RL, 3, 60e3);
  ok(A2.rateLimit(RL, 3, 60e3) === 0, 'Three go through');
  const wait = A2.rateLimit(RL, 3, 60e3);
  ok(wait > 0, 'The fourth is refused', String(wait));
  /* 0 means "go ahead" to every caller, so a window with under a second left
     must still answer 1 rather than rounding down into an open door. */
  ok(wait >= 1 && wait <= 60, 'With a wait in seconds, never rounded down to zero', String(wait));

  /* A window is a window: an old hit must stop counting. Written directly at a
     past timestamp rather than by sleeping for a minute. */
  const OLD = 'probe-expiry|' + Date.now();
  const dbNow = Date.now();
  for (let i = 0; i < 5; i++) {
    DB_.q.run('INSERT INTO throttle_hits (bucket, at) VALUES (?,?)',
      OLD, new Date(dbNow - 90e3).toISOString());
  }
  ok(A2.rateLimitPeek(OLD, 3, 60e3) === 0,
    'Hits older than the window no longer count against it');
  ok(A2.rateLimitPeek(OLD, 3, 120e3) > 0,
    'But the same hits still count for a caller asking about a longer window');

  head('How far a proxy is trusted');

  /* req.ip is what the sign-in lockout and the write limit are both keyed on, so
     `trust proxy: true` — believe any X-Forwarded-For — silently switches both off.
     It was set that way, and five rotating header values walked straight past a
     lockout that engages on the fifth wrong password. These checks pin the fix:
     the safe default, the deliberate opt-in, and a refusal to guess. */
  ok(security.resolveTrustProxy({}) === 0,
    'With TRUST_PROXY unset, no proxy is trusted and req.ip is the socket address',
    String(security.resolveTrustProxy({})));
  ok(security.resolveTrustProxy({ TRUST_PROXY: '1' }) === 1,
    'TRUST_PROXY=1 trusts exactly one proxy — Cloud Run, or a single load balancer');
  ok(security.resolveTrustProxy({ TRUST_PROXY: '2' }) === 2, 'A deeper chain can be declared');
  ok(security.resolveTrustProxy({ TRUST_PROXY: 'true' }) === 0,
    'TRUST_PROXY=true resolves to 0 — the dangerous spelling is refused, not guessed at',
    String(security.resolveTrustProxy({ TRUST_PROXY: 'true' })));
  ok(security.resolveTrustProxy({ TRUST_PROXY: '-1' }) === 0, 'A negative value falls back to 0');
  ok(security.resolveTrustProxy({ TRUST_PROXY: 'yes' }) === 0, 'Nonsense falls back to 0');

  /* The unit checks above prove the helper. This one proves the wiring, because a
     correct helper nobody calls protects nothing. */
  const serverSrc = readFileSync(new URL('../server.js', import.meta.url), 'utf8');
  ok(/app\.set\('trust proxy', security\.TRUST_PROXY\)/.test(serverSrc),
    'server.js takes its trust-proxy setting from that helper');
  ok(!/trust proxy',\s*true/.test(serverSrc),
    'server.js never passes `true` to trust proxy');

  head('Secure cookies');

  /* NODE_ENV=production used to leave Secure off unless FORCE_SECURE_COOKIE=1 was
     also set. Two switches for one intention is how a deployment ships with session
     cookies a browser will send over plain HTTP. */
  const A_ = require_('../server/auth.js');
  ok(A_.cookieIsSecure({ NODE_ENV: 'production' }) === true,
    'Production sets Secure on its own, with no second switch to remember');
  ok(A_.cookieIsSecure({}) === false,
    'A local run does not, so http://localhost still receives its cookies');
  ok(A_.cookieIsSecure({ FORCE_SECURE_COOKIE: '1' }) === true,
    'FORCE_SECURE_COOKIE=1 forces it on for a dev box behind a TLS proxy');
  ok(A_.cookieIsSecure({ NODE_ENV: 'production', FORCE_SECURE_COOKIE: '0' }) === false,
    'FORCE_SECURE_COOKIE=0 is the deliberate way out, and has to be deliberate');

  head('Per-endpoint guard table');

  const map = await import('./security-map.mjs');
  const rows = map.routeTable(require_);
  ok(rows.length >= 70, 'The route table reads out of the Express stack', String(rows.length));

  const mutating = rows.filter(r => r.mutating);
  ok(mutating.length >= 40, 'Enough mutating routes for the table to mean anything', String(mutating.length));

  /* The point of the whole sweep: every mutating route has an auth guard and
     csrfGuard, except the ones declared. "Except" checked in both directions. */
  const key = r => r.method + ' ' + r.path;
  const signedWebhook = new Set(Object.keys(map.SIGNED_WEBHOOKS));
  const declared = new Set(Object.keys(map.PUBLIC_WRITES));
  const naked = mutating.filter(r =>
    !r.guards.includes('requireAdmin') && !r.guards.includes('requireUser')
    && !signedWebhook.has(key(r)));
  const undeclared = naked.filter(r => !declared.has(key(r)));
  ok(undeclared.length === 0,
    'No mutating route lacks an auth guard without being declared in PUBLIC_WRITES',
    undeclared.map(r => r.method + ' ' + r.path).join(', '));

  const stale = [...declared].filter(k => !naked.some(r => key(r) === k));
  ok(stale.length === 0,
    'PUBLIC_WRITES carries no stale row — a guarded endpoint must leave the list',
    stale.join(', '));
  ok(Object.values(map.PUBLIC_WRITES).every(v => v && v.length > 15),
    'Every exception names what stands in for a guard');

  /* A payment gateway cannot hold a cookie, so an IPN can have neither an auth
     guard nor csrfGuard. What it has instead is an HMAC it must match, and that
     substitution is declared rather than quietly allowed. */
  const signedRows = rows.filter(r => r.guards.includes('gatewaySigned'));
  ok(signedRows.length > 0 && signedRows.every(r => signedWebhook.has(key(r))),
    'Every route carrying gatewaySigned is declared in SIGNED_WEBHOOKS',
    signedRows.filter(r => !signedWebhook.has(key(r))).map(key).join(', '));
  ok([...signedWebhook].every(k => signedRows.some(r => key(r) === k)),
    'and every declared webhook really still carries it — the entry cannot outlive the guard',
    [...signedWebhook].filter(k => !signedRows.some(r => key(r) === k)).join(', '));
  ok(Object.values(map.SIGNED_WEBHOOKS).every(v => v && v.length > 25),
    'Each names the signature that stands in for the guard');

  /* The sweep calls GET safe, which is what lets it claim every mutating route
     is guarded — so a GET that writes is invisible to it AND outside the global
     write limit. One exists, because VNPay specifies its IPN that way. It is
     listed, and the list is checked in both directions. */
  const mutatingGets = new Set(Object.keys(map.MUTATING_GETS));
  ok([...mutatingGets].every(k => rows.some(r => key(r) === k)),
    'Every declared state-changing GET is a route that exists',
    [...mutatingGets].filter(k => !rows.some(r => key(r) === k)).join(', '));
  ok([...mutatingGets].every(k => {
    const row = rows.find(r => key(r) === k);
    return row && row.guards.length > 0;
  }), 'and each one is guarded, since the global write limit does not cover it');
  ok(Object.values(map.MUTATING_GETS).every(v => /rate limit/i.test(v)),
    'and each says how it is rate limited instead');

  /* No longer split by whether there is an auth guard: since 2026-08-12 the
     prep_csrf cookie is minted the moment an HTML page is served, so a signed-out
     visitor holds a token too and EVERY mutating route must carry csrfGuard. Before
     that, six public endpoints stood outside it — the one hole the previous sweep
     found and did not close. */
  ok(mutating.every(r => r.guards.includes('csrfGuard') || signedWebhook.has(key(r))),
    'Every mutating route has csrfGuard, or a declared HMAC in its place',
    mutating.filter(r => !r.guards.includes('csrfGuard') && !signedWebhook.has(key(r)))
      .map(key).join(', '));

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
