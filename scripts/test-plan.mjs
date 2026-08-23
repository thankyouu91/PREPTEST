#!/usr/bin/env node
/**
 * The weekly plan. Block 6. Run with the server up.
 *
 * This is the block that makes the other five a course rather than five tools
 * on a shelf, so what is checked is not "does the endpoint answer" but the four
 * properties that decide whether anybody follows it:
 *
 *   · it never sends somebody to a button that does nothing
 *   · it is short enough to finish, and never repeats itself
 *   · it changes when the learner does
 *   · it ranks from the SAME model the progress panel shows, so the two cannot
 *     tell a learner different things on the same screen
 */
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const P = require('../server/plan.js');
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
      return { status: r.status, data: ct.includes('json') ? await r.json().catch(() => null) : null };
    }
  };
}

const { q } = await import('../server/db.js').then(m => m.default || m);
const me = client();

try {
  head('The tips are usable advice, not filler');

  const all = Object.entries(P.TIPS);
  ok(all.length > 0, 'There are tips', String(all.length));
  ok(all.every(([, list]) => list.every(t => t.en && t.vi)),
    'Every one has both languages — a Vietnamese learner must not meet an English-only tip');
  ok(all.every(([, list]) => list.every(t => t.en.length > 80)),
    'And none is a one-liner like "read carefully", which is what somebody already thought they were doing');
  ok(P.tipsFor('skill:writing+speaking').length >= 2,
    'A merged skill key still gets the tips of both skills it covers',
    String(P.tipsFor('skill:writing+speaking').length));
  ok(P.tipsFor('part:ZZZ').length === 0,
    'And an unknown key gets none rather than something generic');

  head('A learner the platform has never seen');

  const who = 'plan' + Date.now().toString(36).slice(-7);
  const PW = 'Planning-' + Math.random().toString(36).slice(2, 10) + 'A1';
  const reg = await me.req('POST', '/api/auth/register', {
    username: who, email: who + '@example.test', name: 'Plan probe',
    phone: '09' + String(Date.now()).slice(-8), password: PW
  });
  ok(reg.status === 200 || reg.status === 201, 'A new account is registered', String(reg.status));
  const uid = await q.val('SELECT id FROM users WHERE lower(email)=?', who + '@example.test');
  if (!uid) throw new Error('registration failed; nothing below can run');
  if ((await me.req('GET', '/api/me')).status !== 200) {
    await me.req('POST', '/api/auth/login', { username: who, password: PW });
  }

  const p1 = await me.req('GET', '/api/plan');
  ok(p1.status === 200, 'A plan comes back', String(p1.status));
  ok(p1.data.plan.length > 0 && p1.data.plan.length <= P.PLAN_SIZE,
    'With between one and three items — a ten-item plan is a list people close',
    String(p1.data.plan.length));
  ok(p1.data.measured === 0, 'For an account with nothing measured', String(p1.data.measured));

  /* The property that decides whether the second plan gets read: nothing in the
     first one may be a dead end. */
  ok(p1.data.plan.every(x => /^\/prep\/[a-z-]+\/$/.test(x.href)),
    'Every item points at a real route',
    JSON.stringify(p1.data.plan.map(x => x.href)));
  ok(new Set(p1.data.plan.map(x => x.key)).size === p1.data.plan.length,
    'No item repeats another', JSON.stringify(p1.data.plan.map(x => x.key)));

  /* Checked against the BANK, not against the plan's own claim. "Points at a
     real route" is not the same promise as "there is something behind it": a
     plan that says Practise Part H when the bank holds no Part H items is worse
     than a shorter plan, because the learner presses it, nothing happens, and
     the next plan does not get read. */
  for (const item of p1.data.plan.filter(x => x.kind === 'drill')) {
    const have = await q.val(
      "SELECT COUNT(*) c FROM questions WHERE status='active' AND part=? AND type IN ('mcq','gap')",
      item.part);
    ok(have > 0, 'Part ' + item.part + ' has material behind it, so the button does something',
      have + ' item(s)');
  }
  for (const item of p1.data.plan.filter(x => x.kind === 'revision')) {
    const have = await q.val(
      `SELECT COUNT(*) c FROM grammar_examples ge JOIN grammar_points gp ON gp.id = ge.point_id
        WHERE gp.slug = ? AND ge.kind = 'practice' AND ge.answer IS NOT NULL AND ge.answer <> ''`,
      item.topic);
    ok(have > 0, 'Topic ' + item.topic + ' has sentences behind it', have + ' sentence(s)');
  }

  /* Two rows both saying "sit a paper" spend two of three slots on one button.
     The first version did exactly that. */
  const sittings = p1.data.plan.filter(x => x.kind === 'sitting');
  ok(sittings.length <= 1,
    'Unmeasured skills are ONE item, not one per skill — they are answered by the same action',
    JSON.stringify(sittings.map(x => x.titleEn)));
  if (sittings.length) {
    ok(/Writing and Speaking/i.test(sittings[0].titleEn),
      'And it names both of them', sittings[0].titleEn);
    ok(sittings[0].tips.length >= 2, 'Carrying the tips for both', String(sittings[0].tips.length));
  } else {
    ok(true, 'No unmeasured skills on this account');
  }

  ok(p1.data.plan.every(x => x.titleEn && x.titleVi && x.whyEn && x.whyVi),
    'Every item is written in both languages');
  ok(p1.data.plan.every(x => x.reason === 'notMeasured'),
    'And all of them say "not measured", which is the truth about a new account',
    JSON.stringify(p1.data.plan.map(x => x.reason)));

  head('It moves when the learner does');

  const before = JSON.stringify(p1.data.plan.map(x => x.key + ':' + x.score));
  const drillItem = p1.data.plan.find(x => x.kind === 'drill');
  const part = drillItem ? drillItem.part
    : (await me.req('GET', '/api/drills/suggest')).data.suggestions[0].part;

  const d = await me.req('POST', '/api/drills', { part, size: 6 });
  ok(d.status === 201, 'A drill from the plan opens', String(d.status));
  await me.req('POST', '/api/drills/' + d.data.drillId + '/submit', {
    answers: d.data.items.map(i => ({ questionId: i.questionId, answer: (i.options && i.options[0]) || 'x' }))
  });

  const p2 = await me.req('GET', '/api/plan');
  ok(p2.data.measured > 0, 'The plan now knows work has happened', String(p2.data.measured));
  const after = JSON.stringify(p2.data.plan.map(x => x.key + ':' + x.score));
  ok(after !== before, 'And it is not the same plan it was', before + ' → ' + after);
  const drilled = p2.data.plan.find(x => x.part === part);
  ok(!drilled || drilled.score !== null,
    'The part just drilled now carries a score rather than a blank',
    JSON.stringify(drilled && drilled.score));

  head('It agrees with the progress panel');

  /* Two numbers for the same thing on one screen is the fastest way to lose
     somebody's trust in both. */
  const ab = await me.req('GET', '/api/me/ability');
  for (const item of p2.data.plan.filter(x => x.kind === 'drill' && x.score !== null)) {
    const est = (ab.data.parts || {})[item.part];
    ok(est && est.score === item.score,
      'Part ' + item.part + ' reads the same in the plan and in the ability report',
      (est && est.score) + ' vs ' + item.score);
  }
  ok(p2.data.overall && p2.data.overall.score === ab.data.overall.score,
    'And so does the overall estimate',
    p2.data.overall.score + ' vs ' + ab.data.overall.score);

  head('It refuses what it should');

  const anon = client();
  ok((await anon.req('GET', '/api/plan')).status === 401, 'No session, no plan');

} catch (e) {
  fail++;
  console.log('\n✗ The suite threw: ' + (e && e.stack ? e.stack : e));
}

console.log(`\n${fail ? '\x1b[31m' : '\x1b[32m'}${pass} passed, ${fail} failed\x1b[0m`);
process.exit(fail ? 1 : 0);
