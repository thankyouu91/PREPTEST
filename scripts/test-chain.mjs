#!/usr/bin/env node
/**
 * One learner, the whole way through. Run with the server up.
 *
 * Blocks 2 to 6 each have a suite, and each of those suites proves its own
 * half: the placement writes events, the drill writes events, the revision
 * marker is fair, the plan ranks. What none of them can prove is the property
 * the whole design rests on —
 *
 *   **every graded thing on this platform arrives at ONE report, and that
 *   report is the only thing with an opinion about how good somebody is.**
 *
 * That is a claim about the SEAMS, and seams are exactly where four green
 * suites go on being green while the product quietly tells a learner two
 * different things. So this file registers one account and walks it: placement
 * → drill → revision → plan → the report, checking after every step that what
 * just happened is visible in the report, arrived with the right weight, and
 * did not disturb anything it had no business disturbing.
 *
 * ## The invariant that matters most
 *
 * Grammar and vocabulary must NOT reach the overall band. They are diagnostic
 * dimensions of the revision area; VPET does not score them, and folding them
 * in produces a number that corresponds to no exam anybody sits. It is a
 * one-line filter in `abilityOf()` and it would be an easy line to lose —
 * losing it moves every learner's headline band the first time they revise,
 * which looks like progress and is not. Checked here in the only way that
 * settles it: revise, then read the band back.
 *
 * ## What this file deliberately does not do
 *
 * It does not re-test any block's own behaviour. Whether the gap marker
 * accepts `don't` for `do not` is scripts/test-revision.mjs's question. This
 * one only asks whether the answer got to the report.
 */
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
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

/** Register a learner and return a signed-in client plus their id. */
async function learner(tag) {
  const me = client();
  const who = tag + Date.now().toString(36).slice(-6) + Math.floor(Math.random() * 900 + 100);
  const PW = 'Chain-' + Math.random().toString(36).slice(2, 10) + 'A1';
  const reg = await me.req('POST', '/api/auth/register', {
    username: who, email: who + '@example.test', name: 'Chain probe',
    phone: '09' + String(Date.now()).slice(-6) + Math.floor(Math.random() * 90 + 10),
    password: PW
  });
  if (reg.status !== 200 && reg.status !== 201) {
    throw new Error('registration failed (' + reg.status + '): ' + JSON.stringify(reg.data));
  }
  const uid = await q.val('SELECT id FROM users WHERE lower(email)=?', who + '@example.test');
  if (!uid) throw new Error('registered but no row — nothing below can run');
  if ((await me.req('GET', '/api/me')).status !== 200) {
    await me.req('POST', '/api/auth/login', { username: who, password: PW });
  }
  return { me, uid, who };
}

const report = me => me.req('GET', '/api/me/ability').then(r => r.data);
const rowsFor = uid => q.all(
  'SELECT source, skill, part, topic, weight, earned, max_score FROM skill_events WHERE user_id = ?', uid);

try {
  const { me, uid } = await learner('chain');

  head('Before anything: a report that admits it knows nothing');

  /* The failure mode here is not a crash, it is a plausible number. An
     estimator with a 2/2 prior will happily report 5.0 for an account that has
     done nothing at all, and 5.0 looks like a measurement. */
  const r0 = await report(me);
  ok(r0.events === 0, 'No events yet', String(r0.events));
  ok(r0.overall.band === null,
    'And no band is named — a prior is not a measurement, and 5.0 looks like one',
    JSON.stringify(r0.overall.band));
  ok(r0.overall.confident === false, 'The report says so itself rather than leaving it to be inferred');
  ok(Object.keys(r0.parts).length === 0 && Object.keys(r0.topics).length === 0,
    'Nothing invented in parts or topics');

  head('Placement → the report');

  const start = await me.req('POST', '/api/placement/start');
  ok(start.status === 200, 'The placement opens', String(start.status));
  let guard = 0;
  let st = start.data;
  while (st && st.items && st.items.length && guard++ < 6) {
    const ans = await me.req('POST', '/api/placement/answers', {
      answers: st.items.map(i => ({
        questionId: i.questionId,
        answer: (i.options && i.options[0]) || 'x'
      }))
    });
    st = ans.data;
    if (!st || st.done) break;
  }
  ok(st && st.done, 'And it finishes', JSON.stringify(st && st.result));

  const placeRows = (await rowsFor(uid)).filter(r => r.source === 'placement');
  ok(placeRows.length > 0, 'The placement left events behind', String(placeRows.length));
  /* The bug this catches by name: record() once reported eighteen written and
     wrote nothing, because the caller used camelCase field names and every row
     was skipped by the max_score guard. A count is not evidence; a row is. */
  ok(placeRows.every(r => r.max_score > 0),
    'Every one of them carries a max_score — the guard that silently skipped 18 of these once');
  ok(placeRows.every(r => Number(r.weight) === 1),
    'At full weight: a placement is a real measurement, not practice',
    JSON.stringify([...new Set(placeRows.map(r => r.weight))]));

  const r1 = await report(me);
  ok(r1.events === placeRows.length, 'The report sees exactly those and no others',
    r1.events + ' vs ' + placeRows.length);
  ok(Object.keys(r1.parts).length > 0, 'Parts have appeared', JSON.stringify(Object.keys(r1.parts)));
  ok(r1.roadmap && r1.roadmap.length > 0, 'And there is something to do about them');

  head('A drill → the same report, at practice weight');

  const sug = await me.req('GET', '/api/drills/suggest');
  ok(sug.status === 200 && sug.data.suggestions.length > 0,
    'The drill suggestion comes from the report rather than from a list somewhere',
    JSON.stringify(sug.status));
  const part = sug.data.suggestions.find(s => s.available).part;
  const before = (await report(me)).parts[part];

  const d = await me.req('POST', '/api/drills', { part, size: 6 });
  ok(d.status === 201, 'A drill on Part ' + part + ' opens', String(d.status));
  const sub = await me.req('POST', '/api/drills/' + d.data.drillId + '/submit', {
    answers: d.data.items.map(i => ({ questionId: i.questionId, answer: (i.options && i.options[0]) || 'x' }))
  });
  ok(sub.status === 200, 'And is marked', String(sub.status));

  const drillRows = (await rowsFor(uid)).filter(r => r.source === 'drill');
  ok(drillRows.length > 0, 'It left events behind too', String(drillRows.length));
  ok(drillRows.every(r => Number(r.weight) === 0.6),
    'At 0.6 — practice counts, and counts for less than the real thing',
    JSON.stringify([...new Set(drillRows.map(r => r.weight))]));

  const r2 = await report(me);
  const after = r2.parts[part];
  ok(after && after.n > (before ? before.n : 0),
    'Part ' + part + ' now rests on more evidence than it did',
    (before && before.n) + ' → ' + (after && after.n));

  head('Revision → the report, but NOT the band');

  /* The load-bearing check in this file. */
  const bandBefore = {
    score: r2.overall.score, band: r2.overall.band,
    confident: r2.overall.confident, n: r2.overall.n
  };
  const sdBefore = r2.overall.sd;
  const topics = await me.req('GET', '/api/revision/topics');
  ok(topics.status === 200 && (topics.data.topics || []).length > 0,
    'There are topics to revise', String(topics.status));

  const set = await me.req('POST', '/api/revision', { topic: (topics.data.topics[0] || {}).slug });
  ok(set.status === 201, 'A revision set opens', String(set.status));
  const marked = await me.req('POST', '/api/revision/' + set.data.setId + '/submit', {
    answers: set.data.items.map(i => ({ exampleId: i.exampleId, answer: 'x' }))
  });
  ok(marked.status === 200, 'And is marked', String(marked.status));

  const revRows = (await rowsFor(uid)).filter(r => r.source === 'revision');
  ok(revRows.length > 0, 'Revision reaches skill_events like everything else', String(revRows.length));
  const dims = new Set(revRows.map(r => r.skill));
  ok(dims.has('grammar') && dims.has('vocabulary'),
    'And writes BOTH dimensions — one sentence is evidence about the form and about the word',
    JSON.stringify([...dims]));

  const r3 = await report(me);
  ok(r3.skills.grammar && r3.skills.grammar.n > 0,
    'Grammar shows in the report, where a learner can see it');
  ok(r3.skills.vocabulary && r3.skills.vocabulary.n > 0, 'So does vocabulary');

  /* Compared field by field rather than as JSON, and the reason is worth
     writing down because it looks like dodging the check and is not.
     `estimate()` decays every event against the wall clock, so two reads of the
     same report a second apart differ in `sd` around the tenth decimal. The
     first version of this line compared whole objects and went red on exactly
     that — a fact about the half-life, not about grammar leaking into the band.
     What a learner sees is score, band and confidence; `n` is the decisive one,
     because a grammar event reaching the overall would show up there first. */
  ok(r3.overall.score === bandBefore.score
    && r3.overall.band === bandBefore.band
    && r3.overall.confident === bandBefore.confident
    && r3.overall.n === bandBefore.n,
    'And the overall band has NOT moved — VPET does not score grammar, so neither does the band',
    JSON.stringify(bandBefore) + ' → ' + JSON.stringify(
      { score: r3.overall.score, band: r3.overall.band, confident: r3.overall.confident, n: r3.overall.n }));

  /* And `sd` is not simply ignored. Bounding the drift is what keeps the check
     above honest: clock decay over a couple of seconds moves it by around
     1e-10, whereas 24 exam events joined by a dozen grammar ones would move it
     by orders of magnitude more. So this line is the one that would actually
     fire if the filter in abilityOf() were ever lost. */
  ok(Math.abs(r3.overall.sd - sdBefore) < 1e-6,
    'Its spread drifts only by the clock, not by the dozen events that just arrived',
    sdBefore + ' → ' + r3.overall.sd);
  ok(Object.keys(r3.topics).length > 0,
    'The topic is tracked separately, which is what makes "revise this next" possible');

  head('The plan reads that report and no other');

  const p = await me.req('GET', '/api/plan');
  ok(p.status === 200, 'A plan comes back', String(p.status));
  ok(p.data.measured === r3.events,
    'Counting the same events the report counts', p.data.measured + ' vs ' + r3.events);
  ok(p.data.overall.score === r3.overall.score && p.data.overall.band === r3.overall.band,
    'And naming the same overall — two numbers for one thing on one screen is how trust in both goes',
    JSON.stringify([p.data.overall.score, r3.overall.score]));
  for (const item of p.data.plan.filter(x => x.kind === 'drill' && x.score !== null)) {
    ok(r3.parts[item.part] && r3.parts[item.part].score === item.score,
      'Part ' + item.part + ' reads the same in both',
      (r3.parts[item.part] || {}).score + ' vs ' + item.score);
  }

  head('Marking twice does not count twice');

  /* Idempotence is a property of record(), and it is checked in the ability
     suite against record() directly. What is checked HERE is that the callers
     hold the (source, ref_id, item_key) convention: a re-submit that changed
     ref_id would slip past the unique index and double a learner's score
     without anything throwing. */
  const eventsBefore = (await report(me)).events;
  const replay = await me.req('POST', '/api/drills/' + d.data.drillId + '/submit', {
    answers: d.data.items.map(i => ({ questionId: i.questionId, answer: (i.options && i.options[0]) || 'x' }))
  });
  ok(replay.status === 409 || replay.status === 200,
    'A replayed submit is answered rather than crashing', String(replay.status));
  ok((await report(me)).events === eventsBefore,
    'And the report is unchanged — the same work cannot be banked twice',
    eventsBefore + ' → ' + (await report(me)).events);

  head('One report per learner');

  /* Cheap to check and expensive to get wrong: a missing WHERE user_id turns
     the whole platform into one shared score. */
  const second = await learner('chn2');
  const other = await report(second.me);
  ok(other.events === 0,
    'A second account sees none of the first account\'s work', String(other.events));
  ok(other.overall.band === null, 'And has no band of its own yet');

  const mine = await report(me);
  ok(mine.events === eventsBefore,
    'While the first account is untouched by the second existing',
    eventsBefore + ' vs ' + mine.events);

  head('Every source this platform grades from is accounted for');

  /* If a seventh source appears and nobody adds it here, this line is what
     asks the question. */
  const sources = [...new Set((await rowsFor(uid)).map(r => r.source))].sort();
  ok(JSON.stringify(sources) === JSON.stringify(['drill', 'placement', 'revision']),
    'This learner\'s evidence comes from exactly the three places they visited',
    JSON.stringify(sources));
  /* Across every learner in the database, not just this one — the question is
     what writes into the report at all, and this account only visited three of
     the four places. The list below is `grep -n "source: '" server/*.js`:
     marking.js, placement.js, drills.js, revision.js. It was wrong the first
     time this ran — I had written `attempt` where the code says `exam` — which
     is the check earning its place on its first execution. */
  const known = ['exam', 'placement', 'drill', 'revision'];
  const all = await q.all('SELECT DISTINCT source FROM skill_events');
  const unknown = all.map(r => r.source).filter(s => !known.includes(s));
  ok(unknown.length === 0,
    'And no source is writing into the report that this file does not know about',
    JSON.stringify(unknown));

} catch (e) {
  fail++;
  console.log('\n✗ The suite threw: ' + (e && e.stack ? e.stack : e));
}

console.log(`\n${fail ? '\x1b[31m' : '\x1b[32m'}${pass} passed, ${fail} failed\x1b[0m`);
process.exit(fail ? 1 : 0);
