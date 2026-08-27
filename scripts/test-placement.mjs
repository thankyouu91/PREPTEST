#!/usr/bin/env node
/**
 * The placement test. Run with the server up.
 *
 * Two things are being checked, and they fail in very different ways.
 *
 * **The gate.** "Compulsory" is a claim about what a URL does, not about what a
 * button does, so it is checked by asking for URLs. A learner who has not been
 * placed must be sent to the test from anywhere in the app; the test itself must
 * NOT be sent to the test, or the redirect loops; and the way out — the account
 * page — must stay open, because a gate with no exits is a trap and a trapped
 * learner is a refund.
 *
 * **The measurement.** A placement that does not reach `skill_events` is a
 * questionnaire: the learner answers eighteen questions, feels measured, and
 * every screen afterwards still says "chưa đủ dữ liệu". That happened during
 * development — the events were built with the wrong field names, `record()`
 * skipped all eighteen and reported eighteen written — so the assertion here is
 * on the ROW COUNT in the database, never on what the API said it did.
 */
import { createRequire } from 'node:module';


const require = createRequire(import.meta.url);
const P = require('../server/placement.js');
const BASE = process.env.BASE_URL || process.env.BASE || 'http://127.0.0.1:3000';

let pass = 0, fail = 0;
const ok = (c, name, detail) => {
  if (c) { pass++; console.log('✓ ' + name); return; }
  fail++; console.log('✗ ' + name + (detail === undefined ? '' : '  → ' + detail));
};
const head = t => console.log('\n\x1b[1m== ' + t + ' ==\x1b[0m');

function client() {
  const jar = new Map();
  const eat = r => {
    const all = typeof r.headers.getSetCookie === 'function' ? r.headers.getSetCookie() : [];
    for (const c of all) {
      const [p] = c.split(';');
      const i = p.indexOf('=');
      if (i < 0) continue;
      const k = p.slice(0, i).trim(), v = decodeURIComponent(p.slice(i + 1).trim());
      if (v === '') jar.delete(k); else jar.set(k, v);
    }
  };
  return {
    async req(method, path, body) {
      if (method !== 'GET' && !jar.has('prep_csrf')) await this.req('GET', '/prep/landing/');
      const headers = { Accept: 'application/json' };
      if (jar.size) headers.Cookie = [...jar].map(([k, v]) => k + '=' + encodeURIComponent(v)).join('; ');
      if (method !== 'GET' && jar.get('prep_csrf')) headers['X-CSRF-Token'] = jar.get('prep_csrf');
      let payload;
      if (body !== undefined) { headers['Content-Type'] = 'application/json'; payload = JSON.stringify(body); }
      const r = await fetch(BASE + path, { method, headers, body: payload, redirect: 'manual' });
      eat(r);
      const ct = r.headers.get('content-type') || '';
      return {
        status: r.status, location: r.headers.get('location'),
        data: ct.includes('json') ? await r.json().catch(() => null) : null
      };
    }
  };
}

const { q } = await import('../server/db.js').then(m => m.default || m);
const me = client();

try {
  head('The ladder, as arithmetic');

  ok(P.nextLevel('B1', 6) === 'B2', 'Six right moves up');
  ok(P.nextLevel('B1', 5) === 'B2', 'Five right moves up');
  ok(P.nextLevel('B1', 4) === 'B1', 'Four right stays');
  ok(P.nextLevel('B1', 3) === 'B1', 'Three right stays');
  ok(P.nextLevel('B1', 2) === 'A2', 'Two right moves down');
  ok(P.nextLevel('C1', 6) === 'C1', 'The top of the ladder does not go higher');
  ok(P.nextLevel('A2', 0) === 'A2', 'And the bottom does not go lower');

  head('Where somebody is placed');

  /* The case the whole function exists for. Held B1, was pushed to B2, found it
     hard, came back to B1. The LAST level is B1; the hardest level they actually
     held up at is B1 too — but the version that reports `lastLevel` would give
     the same answer here by luck, so the discriminating case is the next one. */
  const climbed = P.settle([6, 6, 3], 'C1');
  ok(climbed.level === 'B2',
    'Held B1, then B2, then found C1 hard → placed B2, the hardest level held',
    climbed.level);
  const fell = P.settle([2, 5, 4], 'B1');
  ok(fell.level === 'A2',
    'Struggled at B1, then held A2 → placed A2', fell.level);
  ok(P.settle([6, 6, 6], 'C1').level === 'C1', 'Held every rung → the top one');
  const tried = P.settle([6, 2, 5], 'B1');
  ok(tried.level === 'B1',
    'Trying a harder rung and finding it hard must NEVER lower the placement below what was held',
    tried.level + ' (rungs B1✓ B2✗ B1✓)');
  ok(P.settle([6, 6, 3], 'C1').provisional === true,
    'Every result says it is provisional, in the payload and not only in the copy');
  ok(P.settle([3, 3, 3], 'B1').score === 5,
    'Nine of eighteen is 5.0 out of ten', String(P.settle([3, 3, 3], 'B1').score));

  head('A brand-new account, which is the only state this can be tested from');

  /* NOT the demo student. That account is deliberately full of history — the
     gate's own setup marks it placed, and it carries hundreds of skill_events
     from every other suite — so both things this file checks would be masked:
     the guard exempts anyone who has already sat a paper, and the ability model
     would be confident off other people's work rather than off these eighteen
     answers.
     Registering a throwaway account is the only way to observe what a real new
     learner meets. verify.sh raises REGISTER_PER_HOUR for exactly this kind of
     thing. */
  const who = 'place' + Date.now().toString(36).slice(-7);
  const PW = 'Placement-' + Math.random().toString(36).slice(2, 10) + 'A1';
  const reg = await me.req('POST', '/api/auth/register',
    { username: who, email: who + '@example.test', name: 'Placement probe',
      phone: '09' + String(Date.now()).slice(-8), password: PW });
  ok(reg.status === 200 || reg.status === 201, 'A new account is registered',
    reg.status + ' ' + JSON.stringify(reg.data).slice(0, 160));

/* By EMAIL, not by the username sent. Registration derives a free username
     rather than taking the one offered — see freeUsername in server/auth.js —
     so looking it up by what was sent finds nothing. */
  const uid = await q.val('SELECT id FROM users WHERE lower(email)=?', who + '@example.test');
  ok(!!uid, 'And it exists', String(uid));
  if (!uid) throw new Error('registration did not create an account; nothing below can be checked');

  /* Registration may or may not sign the browser in depending on verification
     rules, so sign in explicitly rather than assuming. */
  if ((await me.req('GET', '/api/me')).status !== 200) {
    ok((await me.req('POST', '/api/auth/login', { username: who, password: PW })).status === 200,
      'The new account signs in');
  } else {
    ok(true, 'Registration signed the new account in');
  }

  const blocked = await me.req('GET', '/prep/');
  ok(blocked.status === 302 && /\/prep\/xep-lop\//.test(blocked.location || ''),
    'An unplaced learner asking for the dashboard is sent to the placement test',
    blocked.status + ' ' + blocked.location);
  ok(/next=/.test(blocked.location || ''),
    'And where they were going is carried, so the test hands them back there');

  const lib = await me.req('GET', '/prep/luyen/');
  ok(lib.status === 302 && /xep-lop/.test(lib.location || ''),
    'The practise screen too — the gate is on every learner page, not just the dashboard',
    lib.status + ' ' + lib.location);

  const onTest = await me.req('GET', '/prep/xep-lop/');
  ok(onTest.status === 200,
    'The placement page itself is NOT redirected — otherwise the gate redirects to the gate',
    String(onTest.status));

  const account = await me.req('GET', '/prep/tai-khoan/');
  ok(account.status === 200,
    'And the account page stays open, so nobody is trapped behind a test they cannot finish',
    String(account.status));

  const buy = await me.req('GET', '/prep/mua-code/');
  ok(buy.status === 200,
    'And so does the price list — the gate must not stand between somebody and paying',
    String(buy.status));

  head('Sitting it');

  let r = await me.req('POST', '/api/placement/start');
  ok(r.status === 200 && Array.isArray(r.data.items) && r.data.items.length > 0,
    'Starting hands back a rung of items', r.status + ' ' + JSON.stringify(r.data).slice(0, 120));
  ok(r.data.items.length === P.PER_RUNG, 'Six of them', String(r.data.items.length));
  ok(r.data.level === P.START_LEVEL, 'The first rung is at the starting level', r.data.level);

  /* No rung may be one part wearing six hats.
   *
   * takeAtLevel() spreads within a level, so this only ever went wrong through
   * the level FALLBACK, which starts a fresh pass at each substitute level and
   * hands every one of them to whichever part has items everywhere. A2 holds
   * four items and all four are Part A, which is gap-fill, so a learner who did
   * badly on rung 1 was dropped to A2 and met A A A A A E — five text boxes in a
   * row with nothing to choose on any of them. Reported as "không nhấn chọn được
   * kết quả", which is what a screen with no options looks like from outside.
   *
   * Asserted on the wire rather than on drawRung(), because what the learner
   * meets is the payload. */
  const mix = {};
  for (const it of r.data.items) mix[it.part] = (mix[it.part] || 0) + 1;
  const worst = Math.max(...Object.values(mix));
  ok(worst <= 2, 'No single part fills more than a third of a rung', JSON.stringify(mix));
  ok(Object.keys(mix).length >= 3, 'A rung draws on at least three parts', JSON.stringify(mix));

  /* The one that matters most on this route. A browser that can see the key can
     pass the test, and a placement anybody can pass measures nothing. */
  const wire = JSON.stringify(r.data);
  ok(!/"answer"/.test(wire), 'No answer key anywhere in what the browser is sent');
  ok(!/"explanation"/.test(wire), 'And no explanation either — same reason');

  /* Resuming, not restarting. Somebody who closed the tab must not be made to
     start again; that is the difference between an interruption and a lost user. */
  const again = await me.req('POST', '/api/placement/start');
  ok(again.status === 200 && again.data.rung === r.data.rung,
    'Asking again resumes the same rung rather than starting a new test',
    'rung ' + again.data.rung + ' vs ' + r.data.rung);

  const seen = new Set(r.data.items.map(i => i.questionId));
  let rungs = 1, repeats = 0, result = null;
  for (let n = 0; n < P.RUNGS + 1; n++) {
    const answers = r.data.items.map(i => ({
      questionId: i.questionId, answer: (i.options && i.options[0]) || 'x'
    }));
    r = await me.req('POST', '/api/placement/answers', { answers });
    if (r.data && r.data.done) { result = r.data.result; break; }
    rungs++;
    for (const i of r.data.items) { if (seen.has(i.questionId)) repeats++; seen.add(i.questionId); }
  }
  ok(result !== null, 'It finishes', JSON.stringify(r.data).slice(0, 140));
  ok(rungs === P.RUNGS, 'After exactly three rungs', String(rungs));
  ok(repeats === 0, 'And no question is asked twice', repeats + ' repeat(s)');
  ok(result && result.level && result.provisional === true,
    'The result carries a level and says it is provisional', JSON.stringify(result));

  head('It actually measured something');

  /* Counted in the DATABASE, not taken from the API's word for it. The API said
     it had recorded eighteen events while recording none — the field names were
     wrong and record() skipped every one — and only a row count caught it. */
  const rows = await q.val(
    "SELECT COUNT(*) c FROM skill_events WHERE user_id=? AND source='placement'", uid);
  ok(rows === P.RUNGS * P.PER_RUNG,
    'Eighteen answers become eighteen rows in skill_events', String(rows));

  const distinct = await q.val(
    "SELECT COUNT(DISTINCT item_key) c FROM skill_events WHERE user_id=? AND source='placement'", uid);
  ok(distinct === rows,
    'Each with its own item_key — without one they collide and eighteen become one',
    distinct + ' distinct of ' + rows);

  const skills = await q.all(
    "SELECT DISTINCT skill FROM skill_events WHERE user_id=? AND source='placement'", uid);
  ok(skills.length > 0 && skills.every(s => s.skill),
    'Every row carries a skill', JSON.stringify(skills.map(s => s.skill)));

  const ability = await me.req('GET', '/api/me/ability');
  ok(ability.data.events >= P.RUNGS * P.PER_RUNG,
    'And the ability model can see them', String(ability.data.events));
  ok(Object.keys(ability.data.parts || {}).length > 0,
    'It now knows something about specific parts',
    Object.keys(ability.data.parts || {}).join(','));
  ok(Array.isArray(ability.data.roadmap) && ability.data.roadmap.length > 0,
    'So a plan can be built from it', JSON.stringify((ability.data.roadmap || []).map(x => x.part)));

  /* Eighteen items is a starting point, not a band, and the model must keep
     saying so. A placement that produced a confident band off eighteen answers
     would be the platform lying on day one. */
  ok(ability.data.overall && ability.data.overall.confident === false,
    'But it does NOT claim a confident band off eighteen items',
    JSON.stringify(ability.data.overall));
  ok(ability.data.overall.band === null,
    'And names no band at all yet', String(ability.data.overall.band));

  head('Afterwards');

  const open = await me.req('GET', '/prep/');
  ok(open.status === 200, 'The dashboard opens now', String(open.status));

  const redo = await me.req('POST', '/api/placement/start');
  ok(redo.data && redo.data.done === true,
    'And the test cannot be re-sat — it hands back the result instead',
    JSON.stringify(redo.data).slice(0, 120));

  const state = await me.req('GET', '/api/placement');
  ok(state.data.status === 'done' && state.data.result,
    'The state route says done and carries the result', JSON.stringify(state.data).slice(0, 120));

  head('It refuses what it should');

  const anon = client();
  const noSession = await anon.req('GET', '/api/placement');
  ok(noSession.status === 401 || noSession.status === 403,
    'No session, no placement state', String(noSession.status));

  /* Checked against an OPEN placement, which is the only state where it means
     anything. On a finished one the route correctly answers 200 with the result
     — the first version of this check asserted 400 there and was wrong about the
     product rather than finding a fault in it. */
  await q.run('DELETE FROM placements WHERE user_id=?', uid);
  await me.req('POST', '/api/placement/start');
  const empty = await me.req('POST', '/api/placement/answers', { answers: [] });
  ok(empty.status === 400, 'An empty answer list is refused', String(empty.status));

  /* This asked for 200 with rungRight 0 until answer() started refusing items it
     never dealt (scripts/test-placement-scope.mjs says why it had to). Scoring
     an item outside the draw as WRONG is not the harmless reading it looks like:
     the rung then advances on a score the learner did not earn, and six junk ids
     would drop them a level. Refusing is the honest answer, and the 409 names the
     one innocent cause — a second tab posting an earlier rung. */
  const junk = await me.req('POST', '/api/placement/answers',
    { answers: [{ questionId: 999999999, answer: 'made up' }] });
  ok(junk.status === 409 && junk.data && junk.data.reload === true,
    'An answer to a question that was never dealt is refused, not scored',
    JSON.stringify(junk.data).slice(0, 120));

  await q.run('DELETE FROM placements WHERE user_id=?', uid);
  const early = await me.req('POST', '/api/placement/answers',
    { answers: [{ questionId: 1, answer: 'x' }] });
  ok(early.status === 400, 'Answering before starting is refused', String(early.status));

} catch (e) {
  fail++;
  console.log('\n✗ The suite threw: ' + (e && e.stack ? e.stack : e));
}

console.log(`\n${fail ? '\x1b[31m' : '\x1b[32m'}${pass} passed, ${fail} failed\x1b[0m`);
process.exit(fail ? 1 : 0);
