/**
 * Student account API: /api/auth/… and /api/me.
 *
 * Run with the server up: node scripts/test-user-api.mjs
 * No browser — plain fetch, keeping cookies per "session" of its own.
 */
import { DEMO_PASSWORD } from './_demo.mjs';

const BASE = process.env.BASE || 'http://127.0.0.1:3000';

let pass = 0, fail = 0;
const ok = (c, name) => { c ? (pass++, console.log('✓ ' + name)) : (fail++, console.log('✗ ' + name)); };

/** A small "browser": remembers cookies and attaches X-CSRF-Token itself */
function client() {
  const jar = new Map();
  const readSetCookie = r => {
    const all = typeof r.headers.getSetCookie === 'function'
      ? r.headers.getSetCookie()
      : (r.headers.get('set-cookie') ? [r.headers.get('set-cookie')] : []);
    for (const c of all) {
      const [pair] = c.split(';');
      const i = pair.indexOf('=');
      if (i < 0) continue;
      const k = pair.slice(0, i).trim(), v = decodeURIComponent(pair.slice(i + 1).trim());
      if (v === '') jar.delete(k); else jar.set(k, v);
    }
  };
  return {
    jar,
    async req(method, path, body, extraHeaders) {
      /* No prep_csrf yet, so ask for one: the server mints that cookie whenever it
         serves an HTML page, guests included. Done here rather than making every
         call site remember — forget one and you get a baffling 403. It is also
         exactly what a browser does: load a page before you can submit a form.
         The landing page is used because it carries no redirect guard. */
      if (method !== 'GET' && !jar.has('prep_csrf')) await this.get('/prep/landing/');
      const headers = Object.assign({ Accept: 'application/json' }, extraHeaders || {});
      if (jar.size) headers.Cookie = [...jar].map(([k, v]) => k + '=' + encodeURIComponent(v)).join('; ');
      if (jar.has('prep_csrf') && !('X-CSRF-Token' in headers)) headers['X-CSRF-Token'] = jar.get('prep_csrf');
      if (body !== undefined) headers['Content-Type'] = 'application/json';
      const r = await fetch(BASE + path, {
        method, headers, body: body === undefined ? undefined : JSON.stringify(body), redirect: 'manual'
      });
      readSetCookie(r);
      let data = null;
      try { data = await r.json(); } catch (e) { /* not JSON */ }
      return { status: r.status, data };
    },
    get(p, h) { return this.req('GET', p, undefined, h); },
    post(p, b, h) { return this.req('POST', p, b === undefined ? {} : b, h); },
    patch(p, b, h) { return this.req('PATCH', p, b, h); }
  };
}

/* A unique email per run, so re-running never collides with old data */
const stamp = process.env.TEST_STAMP || String(process.hrtime.bigint()).slice(-9);
const NEW_EMAIL = `hocvien.${stamp}@thu-nghiem.vn`;

console.log('\n\x1b[1m== Registration ==\x1b[0m');
const c = client();

let r = await c.post('/api/auth/register', { name: 'Test Person', email: 'not-an-email', password: 'Matkhau123' });
ok(r.status === 400, 'Refuses a malformed email');

r = await c.post('/api/auth/register', { name: 'Test Person', email: NEW_EMAIL, password: 'short1' });
ok(r.status === 400, 'Refuses a password under 8 characters');

r = await c.post('/api/auth/register', { name: 'Test Person', email: NEW_EMAIL, password: 'nodigitshere' });
ok(r.status === 400, 'Refuses a password with no digit');

r = await c.post('/api/auth/register', {
  name: 'Test Person', email: NEW_EMAIL, password: 'Matkhau123',
  interests: ['ielts', 'no-such-family', 'ielts']
});
ok(r.status === 201, 'Registration succeeds');
ok(r.data && r.data.user && r.data.user.email === NEW_EMAIL, 'Returns a profile with the right email');
ok(r.data && r.data.user && r.data.user.verified === false, 'A new account starts unverified');
ok(JSON.stringify(r.data.user.interests) === JSON.stringify(['ielts']), 'Drops unknown exam families and duplicates');
ok(!JSON.stringify(r.data).includes('pass_hash'), 'The response never exposes the password hash');
ok(c.jar.has('prep_user') && c.jar.has('prep_csrf'), 'Sets the session cookie and the CSRF cookie');
const verifyToken = new URL('http://x' + (r.data.verifyLink || '/?')).searchParams.get('token');
ok(!!verifyToken, 'A verification link is returned (outside production only)');

r = await c.post('/api/auth/register', { name: 'Duplicate', email: NEW_EMAIL, password: 'Matkhau123' });
ok(r.status === 409, 'Refuses an email that is already registered');
ok(r.status !== 429, 'A rejected request does not spend the registration allowance');

console.log('\n\x1b[1m== Profile and session ==\x1b[0m');
r = await c.get('/api/me');
ok(r.status === 200 && r.data.user.email === NEW_EMAIL, 'GET /api/me returns the signed-in profile');
ok(Array.isArray(r.data.myCodes) && r.data.myCodes.length === 0, 'A new account holds no codes');

const anon = client();
r = await anon.get('/api/me');
ok(r.status === 200 && r.data.user === null, 'Signed out, /api/me answers 200 with user null');

r = await anon.patch('/api/me', { name: 'X', email: 'x@vidu.vn' });
ok(r.status === 401, 'A route needing rights still answers 401 when signed out');

r = await c.patch('/api/me', { name: 'Edited Name', email: NEW_EMAIL, interests: ['toeic'] });
ok(r.status === 200 && r.data.user.name === 'Edited Name', 'The profile can be edited');
ok(JSON.stringify(r.data.user.interests) === JSON.stringify(['toeic']), 'Stores the chosen exam families');

/* CSRF: a wrong header must be refused */
r = await c.patch('/api/me', { name: 'Not allowed', email: NEW_EMAIL }, { 'X-CSRF-Token': 'wrong-token' });
ok(r.status === 403, 'Refuses a request with a wrong CSRF token');

console.log('\n\x1b[1m== Email verification ==\x1b[0m');
r = await c.post('/api/auth/verify', { token: 'token-bia' });
ok(r.status === 400, 'Refuses an invalid verification token');

r = await anon.post('/api/auth/verify', { token: verifyToken });
ok(r.status === 200 && r.data.user.verified === true, 'Verifies from another browser, with no session');

r = await anon.post('/api/auth/verify', { token: verifyToken });
ok(r.status === 400, 'A verification token works only once');

console.log('\n\x1b[1m== Sign-in ==\x1b[0m');
const c2 = client();
r = await c2.post('/api/auth/login', { username: NEW_EMAIL, password: 'wrong-password' });
ok(r.status === 401, 'A wrong password is refused');
/* This check used to grep the message for Vietnamese phrases meaning "no such
   account". Translating server/user-api.js took those phrases away, so it had
   been passing on an empty search ever since — green, and testing nothing.
   Comparing the two messages is the property that was meant all along, and it
   cannot rot the same way: whatever the wording, the two must be identical. */
const wrongPassMsg = r.data.error || '';
ok(wrongPassMsg.length > 0, 'A refused sign-in explains itself');

r = await c2.post('/api/auth/login', { username: 'nobody-at-all@example.vn', password: 'Matkhau123' });
ok(r.status === 401 && (r.data.error || '') === wrongPassMsg,
  'An account that does not exist gets the identical 401 and the identical message',
  JSON.stringify({ wrongPass: wrongPassMsg, noSuchUser: r.data.error }));

r = await c2.post('/api/auth/login', { username: NEW_EMAIL, password: 'Matkhau123' });
ok(r.status === 200 && r.data.user.email === NEW_EMAIL, 'Sign-in succeeds');
ok(r.data.user.verified === true, 'The verified state is kept');

console.log('\n\x1b[1m== Change password ==\x1b[0m');
r = await c2.post('/api/me/password', { current: 'wrong-one', next: 'Matkhaumoi456' });
ok(r.status === 401, 'Refused when the current password is wrong');

r = await c2.post('/api/me/password', { current: 'Matkhau123', next: 'ngan' });
ok(r.status === 400, 'Refuses a new password that fails the rules');

const oldSessionCookie = c.jar.get('prep_user');
r = await c2.post('/api/me/password', { current: 'Matkhau123', next: 'Matkhaumoi456' });
ok(r.status === 200, 'The password change succeeds');
ok(c2.jar.get('prep_user') !== oldSessionCookie, 'The device in use is given a fresh session');

r = await c.get('/api/me');
ok(r.data.user === null, 'Changing the password ends the session on other devices');

const c3 = client();
r = await c3.post('/api/auth/login', { username: NEW_EMAIL, password: 'Matkhau123' });
ok(r.status === 401, 'The old password no longer signs in');
r = await c3.post('/api/auth/login', { username: NEW_EMAIL, password: 'Matkhaumoi456' });
ok(r.status === 200, 'The new password signs in');

console.log('\n\x1b[1m== Forgotten and reset password ==\x1b[0m');
const c4 = client();
r = await c4.post('/api/auth/forgot', { email: 'no-such-address-' + stamp + '@example.vn' });
ok(r.status === 200 && !r.data.resetLink, 'An unknown email still answers 200, with no link');

r = await c4.post('/api/auth/forgot', { email: NEW_EMAIL });
ok(r.status === 200, 'The reset request answers 200');
const resetToken = new URL('http://x' + (r.data.resetLink || '/?')).searchParams.get('token');
ok(!!resetToken, 'A reset link comes back for an email that exists');

r = await c4.post('/api/auth/reset', { token: resetToken, password: 'yeu' });
ok(r.status === 400, 'Refuses a reset password that is too weak');

r = await c4.post('/api/auth/reset', { token: 'token-bia', password: 'Datlai789' });
ok(r.status === 400, 'Refuses an invalid reset token');

r = await c4.post('/api/auth/reset', { token: resetToken, password: 'Datlai789' });
ok(r.status === 200, 'The password reset succeeds');

r = await c3.get('/api/me');
ok(r.data.user === null, 'Resetting the password signs out every device');

r = await c4.post('/api/auth/reset', { token: resetToken, password: 'Datlai789' });
ok(r.status === 400, 'A reset token works only once');

const c5 = client();
r = await c5.post('/api/auth/login', { username: NEW_EMAIL, password: 'Datlai789' });
ok(r.status === 200, 'Sign-in works with the password just set');

console.log('\n\x1b[1m== Demo account and sign-out ==\x1b[0m');
const demo = client();
r = await demo.post('/api/auth/login', { username: 'student', password: DEMO_PASSWORD });
ok(r.status === 200, 'The demo student signs in by username');
r = await demo.get('/api/me');
ok(r.status === 200 && r.data.unlockedTestIds.includes('vpet-b1-01'), 'Unlocked rights follow from a redeemed code');
ok(r.data.myCodes.some(x => x.code === 'VPET-B1MK-24TR'), 'Lists the codes the student has redeemed');

const demo2 = client();
r = await demo2.post('/api/auth/login', { username: 'student@vpetprep.vn', password: DEMO_PASSWORD });
ok(r.status === 200, 'Sign-in works by email');

r = await demo.post('/api/auth/logout');
ok(r.status === 200, 'Sign-out answers 200');
r = await demo.get('/api/me');
ok(r.data.user === null, 'The session is dead after signing out');

console.log('\n\x1b[1m== Brute-force protection ==\x1b[0m');
const brute = client();
const bruteEmail = `dodoan.${stamp}@thu-nghiem.vn`;
await brute.post('/api/auth/register', { name: 'Target', email: bruteEmail, password: 'Matkhau123' });
let lastStatus = 0;
for (let i = 0; i < 6; i++) {
  const rr = await brute.post('/api/auth/login', { username: bruteEmail, password: 'wrong-' + i });
  lastStatus = rr.status;
}
ok(lastStatus === 429, 'Locks temporarily after repeated failures');
r = await brute.post('/api/auth/login', { username: bruteEmail, password: 'Matkhau123' });
ok(r.status === 429, 'Even the right password waits out the lockout');

/* ---------------- Google sign-in ----------------
   The test environment has no GOOGLE_CLIENT_ID, so the checks here cover two
   things: an unconfigured feature must be OFF safely, and the open-redirect
   guard must be right — the most dangerous part of an OAuth flow. */

r = await fetch(BASE + '/api/me').then(x => x.json());
ok(r && r.providers && r.providers.google === false,
  'Unconfigured, /api/me reports Google as off');

let g = await fetch(BASE + '/auth/google', { redirect: 'manual' });
ok(g.status === 302 && String(g.headers.get('location')).includes('oauth=disabled'),
  'Unconfigured, /auth/google returns to the sign-in screen rather than a 500');

g = await fetch(BASE + '/auth/google/callback?code=x&state=gia-mao', { redirect: 'manual' });
ok(g.status === 302 && String(g.headers.get('location')).startsWith('/prep/dang-nhap/'),
  'A callback with a forged state creates no session, only a return to sign-in');
ok(!(g.headers.getSetCookie ? g.headers.getSetCookie() : []).some(c => c.startsWith('prep_user=') && !c.includes('Max-Age=0')),
  'A broken callback issues no session cookie');

const loginPage = await fetch(BASE + '/prep/dang-nhap/').then(x => x.text());
ok(loginPage.includes('id="oauth-block"') && loginPage.includes('hidden'),
  'The Google button is in the page but hidden while unconfigured');
ok(!/accounts\.google\.com\/gsi/.test(loginPage),
  'The page embeds no external Google script — the CSP is untouched');

/* Pure function: load the module with an in-memory database so the running DB is untouched */
process.env.PREP_DB = ':memory:';
const { safeNext, freeUsername } = await import('../server/google-auth.js');
const REDIRECT_CASES = [
  ['/prep/thu-vien/', '/prep/thu-vien/', 'keeps an internal path as it is'],
  ['//evil.example/x', '/prep/', 'blocks a protocol-relative //evil URL'],
  ['/\\evil.example', '/prep/', 'blocks a backslash'],
  ['https://evil.example', '/prep/', 'blocks an absolute URL'],
  ['/prep/\u0000x', '/prep/', 'blocks a control character'],
  ['', '/prep/', 'no next at all falls back to the default page']
];
let redirOk = true;
for (const [input, want, why] of REDIRECT_CASES) {
  if (safeNext(input) !== want) { redirOk = false; console.log('   → broken: ' + why + ' (' + JSON.stringify(input) + ')'); }
}
ok(redirOk, 'Redirects only to internal paths, blocking every kind of open redirect');
ok(typeof freeUsername('Nguyen.Van-A@gmail.com') === 'string' && /^[a-z0-9._-]+$/.test(freeUsername('Nguyen.Van-A@gmail.com')),
  'A username derived from an email contains only safe characters');

console.log('\n' + pass + '/' + (pass + fail) + ' checks passed');
if (fail) process.exit(1);
