#!/usr/bin/env node
/**
 * Three levels of administrator. Server up: node scripts/test-roles.mjs
 *
 * There were two levels before this: the owner, and everybody else. Going to
 * three is not "one more if statement" — it is the point at which a permission
 * model starts failing in a way nobody notices, so this file is mostly about
 * the ways that happens:
 *
 *   · a route added later with no capability, which is not broken — it works,
 *     for everyone, silently
 *   · a role name nobody recognises resolving to the HIGHEST level
 *   · the interface hiding a button while the route behind it stays open
 *   · the last owner demoting themselves and locking the platform
 *   · a level removed that keeps working for eight hours, because that is when
 *     the cookie expires
 *
 * The coverage check in the middle is the load-bearing one. It reads the LIVE
 * Express stack rather than the source, so it sees what actually runs.
 */
import { createRequire } from 'node:module';
import { ADMIN_PASSWORD } from './_demo.mjs';

const require = createRequire(import.meta.url);
const R = require('../server/roles.js');
const BASE = process.env.BASE_URL || process.env.BASE || 'http://localhost:3000';
const OWNER_USER = process.env.ADMIN_USERNAME || 'admin';

let pass = 0, fail = 0;
const ok = (c, name, detail) => {
  if (c) { pass++; console.log('✓ ' + name); return; }
  fail++; console.log('✗ ' + name + (detail === undefined ? '' : '  → ' + detail));
};
const head = t => console.log('\n\x1b[1m== ' + t + ' ==\x1b[0m');

/* ------------------------------------------------------------------ *
 * The table itself
 * ------------------------------------------------------------------ */

head('What each level may do');

ok(R.ROLE_NAMES.length === 3, 'there are exactly three levels', R.ROLE_NAMES.join(', '));
ok(R.roleOf('owner').rank > R.roleOf('manager').rank
  && R.roleOf('manager').rank > R.roleOf('teacher').rank,
  'owner outranks manager outranks teacher');

ok(R.CAPS.every(c => R.can('owner', c)), 'the owner has every capability, by construction');

/* The four that decide whether this model is worth having. */
for (const cap of ['settings.write', 'admins.manage', 'secrets.manage']) {
  ok(!R.can('manager', cap) && !R.can('teacher', cap),
    'neither a manager nor a teacher has ' + cap);
}
ok(R.can('manager', 'codes.write') && !R.can('teacher', 'codes.write'),
  'a manager may issue activation codes and a teacher may not — that one is money');
ok(R.can('manager', 'users.write') && !R.can('teacher', 'users.write'),
  'a manager may change a learner account and a teacher may not');
ok(R.can('teacher', 'bank.write') && !R.can('teacher', 'bank.publish'),
  'a teacher WRITES questions but cannot publish them into a live exam');
ok(R.can('manager', 'bank.publish'), 'a manager can publish them');
ok(['owner', 'manager', 'teacher'].every(r => R.can(r, 'reports.read')),
  'all three levels can read reports — otherwise a teacher has no screen at all');

/* An unknown role must LOSE power, not gain it. A row whose role was mistyped,
   or written by a version that was then rolled back, is the one case where
   guessing generously is unrecoverable. */
head('An unrecognised level');
const unknown = R.capsOf('superuser');
ok(!unknown.includes('admins.manage') && !unknown.includes('secrets.manage'),
  'an unknown role gets none of the dangerous capabilities', unknown.join(','));
ok(JSON.stringify(unknown) === JSON.stringify(R.capsOf('teacher')),
  'it resolves to the LOWEST level, not the highest');
ok(!R.isRole('superuser') && R.isRole('manager'),
  'and isRole() still refuses to store it');

/* A typo in a capability name must not produce a guard nobody satisfies. */
let threw = false;
try { R.requireCap('codes.writeee'); } catch (e) { threw = true; }
ok(threw, 'requireCap refuses an unknown capability at boot rather than at request time');

/* ------------------------------------------------------------------ *
 * Coverage: no admin route without a declared capability
 * ------------------------------------------------------------------ */

head('Every admin route declares a capability');

/* Signing in, signing out, and an administrator's own name, password and second
   factor. Every level manages its own account, so these carry no capability by
   design — and the list is written out here so that ADDING to it is a visible
   decision in a diff rather than an omission nobody sees. */
const SELF_SERVICE = new Set([
  'POST /api/admin/login',
  'POST /api/admin/logout',
  'GET /api/admin/me',
  'POST /api/admin/me',
  'POST /api/admin/password',
  'GET /api/admin/totp',
  'POST /api/admin/totp/start',
  'POST /api/admin/totp/enable',
  'POST /api/admin/totp/disable'
]);

const { routeTable } = await import('./security-map.mjs');
const admin = routeTable().filter(r => r.path.startsWith('/api/admin'));
const uncovered = admin.filter(r =>
  !SELF_SERVICE.has(r.method + ' ' + r.path) &&
  !r.guards.some(g => g.startsWith('requireCap')));

ok(admin.length > 50, 'the stack really was read', admin.length + ' admin routes');
ok(uncovered.length === 0,
  'no /api/admin route is left open to any signed-in administrator',
  uncovered.map(r => r.method + ' ' + r.path).join(', '));

/* And the reverse: nothing on the self-service list quietly grew a capability,
   or was deleted, leaving a stale exemption behind to cover a future route. */
const seen = new Set(admin.map(r => r.method + ' ' + r.path));
const stale = [...SELF_SERVICE].filter(k => !seen.has(k));
ok(stale.length === 0, 'no stale exemption is left on the self-service list', stale.join(', '));

/* Every capability named by a route must be one server/roles.js knows, and
   every capability roles.js declares should be used by something — an unused
   one is either a missing guard or a line to delete. */
const used = new Set();
admin.forEach(r => r.guards.forEach(g => {
  const m = g.match(/^requireCap\((.+)\)$/);
  if (m) used.add(m[1]);
}));
ok([...used].every(c => R.CAPS.includes(c)),
  'every capability a route asks for is one roles.js defines',
  [...used].filter(c => !R.CAPS.includes(c)).join(', '));
ok(R.CAPS.every(c => used.has(c)),
  'every capability roles.js defines is actually used by a route',
  R.CAPS.filter(c => !used.has(c)).join(', '));

/* ------------------------------------------------------------------ *
 * The real thing, over HTTP
 * ------------------------------------------------------------------ */

head('Three accounts, three sets of doors');

function client() {
  const jar = new Map();
  const absorb = res => {
    const raw = res.headers.getSetCookie ? res.headers.getSetCookie() : [];
    for (const c of raw) {
      const [pair] = c.split(';');
      const i = pair.indexOf('=');
      const k = pair.slice(0, i).trim(), v = pair.slice(i + 1).trim();
      if (v === '') jar.delete(k); else jar.set(k, v);
    }
  };
  return {
    async call(method, path, body) {
      if (method !== 'GET' && !jar.has('prep_csrf')) await this.call('GET', '/admin/dang-nhap/');
      const headers = { Accept: 'application/json' };
      if (jar.size) headers.Cookie = [...jar].map(([k, v]) => k + '=' + v).join('; ');
      if (body !== undefined) headers['Content-Type'] = 'application/json';
      if (method !== 'GET' && jar.get('prep_csrf')) {
        headers['X-CSRF-Token'] = decodeURIComponent(jar.get('prep_csrf'));
      }
      const res = await fetch(BASE + path, {
        method, headers, redirect: 'manual',
        body: body === undefined ? undefined : JSON.stringify(body)
      });
      absorb(res);
      const ct = res.headers.get('content-type') || '';
      const data = ct.includes('json') ? await res.json().catch(() => null) : await res.text();
      return { status: res.status, data };
    },
    async signIn(username, password) {
      const r = await this.call('POST', '/api/admin/login', { username, password });
      return r.status === 200;
    }
  };
}

const owner = client();
ok(await owner.signIn(OWNER_USER, ADMIN_PASSWORD), 'the owner signs in');

const stamp = Date.now().toString(36).slice(-6);
const MPASS = 'Manager' + stamp + '99';
const TPASS = 'Teacher' + stamp + '99';
const mUser = 'mgr' + stamp;
const tUser = 'tch' + stamp;

let r = await owner.call('POST', '/api/admin/admins',
  { username: mUser, name: 'Test Manager', role: 'manager', password: MPASS });
ok(r.status === 200, 'the owner creates a manager', r.status + ' ' + JSON.stringify(r.data));
r = await owner.call('POST', '/api/admin/admins',
  { username: tUser, name: 'Test Teacher', role: 'teacher', password: TPASS });
ok(r.status === 200, 'and a teacher', r.status + ' ' + JSON.stringify(r.data));

/* The password must not come back out. */
ok(!JSON.stringify(r.data).includes(TPASS),
  'the response does not echo the password back');

const manager = client();
const teacher = client();
ok(await manager.signIn(mUser, MPASS), 'the manager can sign in');
ok(await teacher.signIn(tUser, TPASS), 'the teacher can sign in');

const me = await teacher.call('GET', '/api/admin/me');
ok(me.data && me.data.admin && me.data.admin.role === 'teacher',
  'and is told which level they are', me.data && me.data.admin && me.data.admin.role);
ok(me.data.admin.caps && me.data.admin.caps.includes('bank.write')
  && !me.data.admin.caps.includes('codes.write'),
  'with the capability list the interface gates on');

/* The actual doors. Each row: who, what, and what the server must answer. */
const DOORS = [
  ['manager', manager, 'GET', '/api/admin/reports', 200],
  ['manager', manager, 'GET', '/api/admin/codes', 200],
  ['manager', manager, 'GET', '/api/admin/users', 200],
  ['manager', manager, 'GET', '/api/admin/ai', 403],
  ['manager', manager, 'GET', '/api/admin/backup', 403],
  ['manager', manager, 'GET', '/api/admin/admins', 403],
  ['manager', manager, 'PUT', '/api/admin/settings', 403],
  ['teacher', teacher, 'GET', '/api/admin/reports', 200],
  ['teacher', teacher, 'GET', '/api/admin/questions', 200],
  ['teacher', teacher, 'GET', '/api/admin/users', 200],
  ['teacher', teacher, 'GET', '/api/admin/codes', 403],
  ['teacher', teacher, 'GET', '/api/admin/audit', 403],
  ['teacher', teacher, 'GET', '/api/admin/ai', 403],
  ['teacher', teacher, 'GET', '/api/admin/admins', 403],
  ['owner', owner, 'GET', '/api/admin/ai', 200],
  ['owner', owner, 'GET', '/api/admin/admins', 200]
];
for (const [who, c, method, path, want] of DOORS) {
  const got = await c.call(method, path);
  ok(got.status === want, `${who}: ${method} ${path} → ${want}`, 'got ' + got.status);
}

/* A write, not just a read: the teacher must be refused at the point of doing
   damage, not merely shown fewer links. */
const issue = await teacher.call('POST', '/api/admin/codes', { familyId: 'vpet', count: 1 });
ok(issue.status === 403, 'a teacher cannot issue an activation code', issue.status);
ok(issue.data && issue.data.need === 'codes.write',
  'and is told which capability was missing, not just "no"', issue.data && issue.data.need);

const promote = await manager.call('POST', '/api/admin/admins',
  { username: 'sneak' + stamp, name: 'Sneak', role: 'owner', password: 'Sneaky' + stamp + '11' });
ok(promote.status === 403, 'a manager cannot make themselves an owner by making an owner', promote.status);

/* The leak that moved. This route is readable by every level. */
const settings = await teacher.call('GET', '/api/admin/settings');
ok(settings.status === 200, 'a teacher can still open the Administration screen', settings.status);
ok(!('admins' in (settings.data || {})),
  'and it no longer hands them the roster of every administrator');

/* ------------------------------------------------------------------ *
 * The rules that stop somebody locking the platform
 * ------------------------------------------------------------------ */

head('You cannot lock yourself out');

const all = (await owner.call('GET', '/api/admin/admins')).data;
const meRow = all.admins.find(a => a.username === OWNER_USER);
const mRow = all.admins.find(a => a.username === mUser);

r = await owner.call('PUT', '/api/admin/admins/' + meRow.id, { role: 'teacher' });
ok(r.status === 400, 'an owner cannot demote themselves', r.status + ' ' + JSON.stringify(r.data));
r = await owner.call('PUT', '/api/admin/admins/' + meRow.id, { active: false });
ok(r.status === 400, 'nor deactivate themselves', r.status);

/* Still an owner after both refusals — a refusal that half-applied would be
   worse than either outcome. */
const after = (await owner.call('GET', '/api/admin/admins')).data;
const stillOwner = after.admins.find(a => a.username === OWNER_USER);
ok(stillOwner.role === 'owner' && stillOwner.active === 1,
  'and nothing was half-applied on the way to being refused',
  stillOwner.role + '/' + stillOwner.active);

/* Promote the manager, then the last-owner rule is testable from the other side. */
r = await owner.call('PUT', '/api/admin/admins/' + mRow.id, { role: 'owner' });
ok(r.status === 200, 'the owner can promote the manager to owner', r.status);

/* Changing a level must end that account's sessions on the spot. The manager
   was signed in a moment ago; a permission change that waits eight hours for a
   cookie to expire is a permission change that did not happen. */
const afterPromote = await manager.call('GET', '/api/admin/reports');
ok(afterPromote.status === 401,
  'changing a level signs that account out immediately', afterPromote.status);

/* ------------------------------------------------------------------ *
 * Two owners, at the same moment.
 *
 * This is the case the obvious guard misses, and it is worth spelling out why
 * the obvious guard misses it. "Refuse if there is no OTHER active owner"
 * cannot fire through a single request at all: only an owner may manage
 * administrators, so the actor is always another owner and the count is never
 * zero. It reads like a safety net and catches nothing.
 *
 * Two owners deactivating each other at the same moment is different. Each
 * request sees the other as the survivor, both are allowed, both writes land,
 * and the platform has no owner left. So the check moved to AFTER the write and
 * INSIDE the transaction. Whichever way these two interleave — one wins and the
 * other is rolled back, or one wins and the other's session is already gone —
 * an owner must remain.
 * ------------------------------------------------------------------ */
const mgrOwner = client();
ok(await mgrOwner.signIn(mUser, MPASS), 'the promoted manager signs in as an owner');

const [a, b] = await Promise.all([
  owner.call('PUT', '/api/admin/admins/' + mRow.id, { active: false }),
  mgrOwner.call('PUT', '/api/admin/admins/' + meRow.id, { active: false })
]);
ok(true, 'two owners deactivate each other at the same moment → ' + a.status + ' / ' + b.status);

/* Said plainly, because the alternative is a test that reads as more than it
   is: this pair does NOT reliably force the interleaving. Node serves the two
   requests on one thread, so most runs resolve as 200 then 401 — the second
   request's session is already gone before it reaches the guard. The assertion
   below is therefore about the INVARIANT, which must hold however the two land,
   and not proof that the post-condition fired. That the post-condition works
   was checked separately by forcing it to trigger: the transaction rolls back
   and the change is refused with a 400. */

/* The assertion that matters, and it is deliberately made through the front
   door rather than by counting rows. "An owner row is still active" is what the
   code believes; "somebody can actually sign in" is what the school needs at
   nine on a Monday, and those are only the same thing while every other guard
   is also right. */
const probe = client();
const whoGotIn = (await probe.signIn(OWNER_USER, ADMIN_PASSWORD)) ? OWNER_USER
  : (await probe.signIn(mUser, MPASS)) ? mUser : null;
ok(whoGotIn !== null, 'an owner can still sign in afterwards — the platform is not locked out');
ok(!(a.status === 200 && b.status === 200), 'and the two did not both succeed', a.status + '/' + b.status);

/* Put it back, from inside, using whichever account survived. */
if (whoGotIn) {
  const rows = (await probe.call('GET', '/api/admin/admins')).data.admins;
  for (const u of [OWNER_USER, mUser]) {
    const row = rows.find(x => x.username === u);
    if (row && !row.active) await probe.call('PUT', '/api/admin/admins/' + row.id, { active: true });
  }
  const back = ((await probe.call('GET', '/api/admin/admins')).data || {}).admins || [];
  const restored = back.find(x => x.username === OWNER_USER);
  ok(restored && restored.active === 1,
    'and the account that lost the race can be switched back on from inside');
  const m2 = back.find(x => x.username === mUser);
  if (m2 && m2.role === 'owner' && m2.id !== (await probe.call('GET', '/api/admin/me')).data.admin.id) {
    await probe.call('PUT', '/api/admin/admins/' + m2.id, { role: 'manager' });
  }
}

head('Tidying up');

/* A FRESH sign-in, not the `owner` client from the top of the file.
 *
 * This is a real flake I shipped and CI caught on the first run. The race above
 * deactivates one of the two owners, and deactivating an account deletes its
 * sessions — so if `admin` is the one that loses, the `owner` client is holding
 * a dead cookie even though the account has since been switched back on. Every
 * call it makes then answers 401, `data.admins` is undefined, and the suite
 * dies with a TypeError instead of failing an assertion.
 *
 * It passed locally because the race went the other way there. That is the
 * definition of a flaky test, and a flaky gate is worse than no gate: it
 * teaches everybody to press re-run. Which account won is not knowable, so the
 * tidy-up stops assuming and signs in again. */
const cleaner = client();
const cleanerIs = (await cleaner.signIn(OWNER_USER, ADMIN_PASSWORD)) ? OWNER_USER
  : (await cleaner.signIn(mUser, MPASS)) ? mUser : null;
ok(cleanerIs !== null, 'an owner session is available to tidy up with');

if (cleanerIs) {
  const meId = ((await cleaner.call('GET', '/api/admin/me')).data || {}).admin?.id;
  for (const u of [mUser, tUser]) {
    const rows = ((await cleaner.call('GET', '/api/admin/admins')).data || {}).admins || [];
    const row = rows.find(a => a.username === u);
    /* Never the account doing the tidying: the server refuses it, correctly. */
    if (row && row.active && row.id !== meId) {
      await cleaner.call('PUT', '/api/admin/admins/' + row.id, { active: false });
    }
  }
  const left = (((await cleaner.call('GET', '/api/admin/admins')).data || {}).admins || [])
    .filter(a => (a.username === mUser || a.username === tUser) && a.active && a.id !== meId);
  ok(left.length === 0, 'the two test accounts are deactivated again', left.length);
}

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
