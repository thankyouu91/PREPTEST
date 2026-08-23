#!/usr/bin/env node
/**
 * Revision. Block 5. Run with the server up.
 *
 * Most of this file is about `matches()`, and that is the right proportion.
 * Everything else here is plumbing of a shape already proved by the drills
 * suite; the marker is the part that decides whether a learner trusts the
 * platform. Somebody who writes `do not live` where the key says `don't live`
 * has written correct English, and telling them twice that it is wrong teaches
 * them to distrust the marker rather than to write better.
 *
 * The other thing worth its own section: grammar and vocabulary must NOT reach
 * the overall band. VPET awards no grammar score, so folding one in would
 * produce a number corresponding to no exam anybody sits — and it would be a
 * number a learner could raise by drilling gap-fills, which is exactly the
 * thing the estimate is supposed to be immune to.
 */
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const R = require('../server/revision.js');
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
  head('Marking a gap fairly — what must be accepted');

  const yes = (g, k, why) => ok(R.matches(g, k), why, JSON.stringify(g) + ' vs ' + JSON.stringify(k));
  const no = (g, k, why) => ok(!R.matches(g, k), why, JSON.stringify(g) + ' vs ' + JSON.stringify(k));

  yes('works', 'works', 'The exact answer');
  yes('Works', 'works', 'Capitalised — a phone does this on its own');
  yes('  works  ', 'works', 'With stray spaces');
  yes('works.', 'works', 'With a full stop they added out of habit');
  yes('do not live', "don't live", 'The contraction written out');
  yes("don't live", 'do not live', 'And the other way round');
  yes("doesn't like", 'does not like', 'Third person too');
  yes('it’s ready', 'it is ready', 'A curly apostrophe, which no learner can see the difference of');
  yes('colour', 'color|colour', 'Either spelling where the key offers both');
  yes('has been considering', 'has been considering', 'A multi-word form');

  head('And what must NOT be');

  no('work', 'works', 'The bare form when the key wants the -s');
  no('', 'works', 'Nothing at all');
  no('worked', 'works', 'The wrong tense');
  no('is working', 'works', 'A different structure that happens to be grammatical');

  head('A key that names two gaps');

  /* `Does … like` is one key describing TWO gaps in the sentence, so what is
     required is both fragments, in order, and nothing about the rest. */
  yes('Does your sister like', 'Does … like', 'Both fragments, in order, with their own words between');
  yes('does she like it', 'Does … like', 'Same, lower case');
  no('like does', 'Does … like', 'The fragments in the wrong order');
  no('does your sister', 'Does … like', 'Only the first fragment');
  yes('Did he ... finish', 'Did ... finish', 'Three dots as well as the ellipsis character');

  ok(R.cueOf('My father ___ (work) in a hospital.') === 'work',
    'The bracketed cue is pulled out for the placeholder', String(R.cueOf('My father ___ (work) in a hospital.')));
  ok(R.cueOf('No cue here.') === null, 'And is null when there is not one');

  head('Which level, from the ability report');

  const g = (score, confident) => ({ skills: { grammar: { score, confident } }, overall: {} });
  ok(R.levelFor(g(9, true)) === 'C1', 'A confident 9.0 revises at C1');
  ok(R.levelFor(g(7, true)) === 'B2', 'A confident 7.0 at B2');
  ok(R.levelFor(g(4, true)) === 'B1', 'A confident 4.0 at B1');
  ok(R.levelFor(g(2, true)) === 'A2', 'A confident 2.0 at A2');
  ok(R.levelFor({ skills: {}, overall: {} }) === 'B1', 'And nothing known starts at B1');
  ok(R.levelFor({ skills: { grammar: { score: 9, confident: false } }, overall: { score: 4, confident: true } }) === 'B1',
    'An unconfident grammar estimate defers to the overall rather than being believed');

  head('A real set, end to end');

  const who = 'rev' + Date.now().toString(36).slice(-7);
  const PW = 'Revision-' + Math.random().toString(36).slice(2, 10) + 'A1';
  const reg = await me.req('POST', '/api/auth/register', {
    username: who, email: who + '@example.test', name: 'Revision probe',
    phone: '09' + String(Date.now()).slice(-8), password: PW
  });
  ok(reg.status === 200 || reg.status === 201, 'A new account is registered', String(reg.status));
  const uid = await q.val('SELECT id FROM users WHERE lower(email)=?', who + '@example.test');
  if (!uid) throw new Error('registration failed; nothing below can run');
  if ((await me.req('GET', '/api/me')).status !== 200) {
    await me.req('POST', '/api/auth/login', { username: who, password: PW });
  }

  const topics = await me.req('GET', '/api/revision/topics');
  ok(topics.status === 200 && topics.data.topics.length > 0,
    'Topics are offered', JSON.stringify(topics.data).slice(0, 140));
  ok(topics.data.topics.every(t => t.items > 0),
    'And every one of them has sentences behind it');
  ok(topics.data.topics.every(t => t.score === null),
    'All unmeasured for a new account, which is the truth about them');
  ok(topics.data.levels.join(',') === 'B1,B2,C1,C2',
    'The level chooser offers B1 to C2, as asked', topics.data.levels.join(','));

  const started = await me.req('POST', '/api/revision', {});
  ok(started.status === 201, 'A set opens', String(started.status));
  const applies = started.data.items.filter(i => i.type === 'apply');
  const builds = started.data.items.filter(i => i.type === 'build');
  ok(applies.length >= 3, 'With several gap sentences', String(applies.length));
  ok(builds.length === 1, 'And exactly one sentence to write yourself', String(builds.length));
  ok(started.data.items[started.data.items.length - 1].type === 'build',
    'Which comes last — it is the one people skip, so it is met after some easy wins');
  ok(!/"answer"/.test(JSON.stringify(started.data)),
    'No answer key reaches the browser');
  ok(applies.every(i => i.sentence && i.sentence.includes('_')),
    'Every gap sentence actually has a gap in it');

  /* Answer them all correctly, by reading the keys from the database — the
     point of this pass is the plumbing, and the marker itself is checked above
     on cases chosen to be interesting rather than on whatever came out. */
  const keys = new Map();
  for (const row of await q.all(
    `SELECT id, answer FROM grammar_examples WHERE id IN (${applies.map(() => '?').join(',')})`,
    ...applies.map(i => i.exampleId))) keys.set(row.id, row.answer);

  const answers = applies.map(i => ({ exampleId: i.exampleId, answer: keys.get(i.exampleId) }));
  answers.push({ type: 'build', answer: 'Our supplier has been promising a delivery date since March.' });

  const r = await me.req('POST', '/api/revision/' + started.data.setId + '/submit', { answers });
  ok(r.status === 200, 'It marks', String(r.status));
  ok(r.data.earned === applies.length,
    'Every correct answer is accepted', r.data.earned + '/' + r.data.max);
  ok(r.data.detail.length === applies.length && r.data.detail.every(x => 'answer' in x),
    'And the keys come back afterwards, which is what makes it practice');

  /* The bug this caught during development: `IN (…)` returns rows in index
     order while the set was drawn at random, so "question 3, you put X" pointed
     at a different sentence. Nothing was mismarked, but from the learner's seat
     that is indistinguishable from a marking bug. */
  ok(r.data.detail.map(x => x.exampleId).join(',') === applies.map(i => i.exampleId).join(','),
    'The feedback is in the order the questions were answered, not in id order',
    r.data.detail.map(x => x.exampleId).join(',') + ' vs ' + applies.map(i => i.exampleId).join(','));

  head('The sentence they wrote is measured, never scored');

  ok(r.data.build && r.data.build.marked === false,
    'It comes back explicitly NOT marked', JSON.stringify(r.data.build && r.data.build.marked));
  ok(r.data.build.diagnostics && r.data.build.diagnostics.words > 0,
    'With the tier-1 measurements on it', JSON.stringify(r.data.build.diagnostics).slice(0, 120));
  ok(!('score' in r.data.build) && !('band' in r.data.build),
    'And no score or band anywhere on it — tier 1 is diagnostic, and inventing a mark is what docs/SCORING.md forbids',
    Object.keys(r.data.build).join(','));
  const stored = await q.val('SELECT built FROM revision_sets WHERE id=?', started.data.setId);
  ok(stored && stored.includes('supplier'),
    'The text is kept, because tier-3 marking happens later and needs it', String(stored).slice(0, 60));

  head('It reached the ability report — as grammar, not as a band');

  const rows = await q.val(
    "SELECT COUNT(*) c FROM skill_events WHERE user_id=? AND source='revision'", uid);
  ok(rows === applies.length * 2,
    'Each sentence records TWO events — it is evidence about grammar AND about knowing the word',
    rows + ' for ' + applies.length + ' sentences');
  ok(r.data.recorded === rows,
    'And the route reports what was really written', r.data.recorded + ' vs ' + rows);

  const skills = (await q.all(
    "SELECT DISTINCT skill FROM skill_events WHERE user_id=? AND source='revision'", uid))
    .map(x => x.skill).sort();
  ok(skills.join(',') === 'grammar,vocabulary', 'Under those two skills', skills.join(','));

  const topicRows = await q.val(
    "SELECT COUNT(DISTINCT topic) c FROM skill_events WHERE user_id=? AND source='revision'", uid);
  ok(topicRows === 1, 'Tagged with the grammar topic, so the roadmap can rank topics too', String(topicRows));

  const w = await q.all("SELECT DISTINCT weight FROM skill_events WHERE user_id=? AND source='revision'", uid);
  ok(w.length === 1 && w[0].weight === R.REVISION_WEIGHT,
    'Weighted below a real sitting', JSON.stringify(w));

  const ab = await me.req('GET', '/api/me/ability');
  ok(ab.data.skills.grammar && ab.data.skills.grammar.score !== undefined,
    'Grammar now has an estimate', JSON.stringify(ab.data.skills.grammar));
  /* The one that matters. A learner must not be able to raise their VPET band
     by filling in gap-fills. */
  ok(ab.data.overall.n === 0,
    'And the OVERALL band has seen none of it — VPET awards no grammar score, and a band you can drill up is not a band',
    'overall n=' + ab.data.overall.n);

  /* Where the loop closes is the ability model, so that is where it is checked.
     NOT in the topic list: a topic that has just been measured correctly drops
     BELOW the ones never measured — "we know nothing about this" outranks "we
     know this is weak" — so looking for it near the top would be asserting the
     opposite of the ranking the product wants. */
  ok(ab.data.topics && ab.data.topics[started.data.topic],
    'The topic just revised now has an estimate of its own — the loop is closed',
    Object.keys(ab.data.topics || {}).join(','));
  ok((ab.data.topics[started.data.topic] || {}).score !== undefined,
    'With a score on it', JSON.stringify(ab.data.topics[started.data.topic]));

  const t2 = await me.req('GET', '/api/revision/topics');
  const measured = t2.data.topics.filter(x => x.score !== null);
  const unmeasured = t2.data.topics.filter(x => x.score === null);
  ok(unmeasured.length === 0 || measured.length === 0 ||
     t2.data.topics.findIndex(x => x.score === null) < t2.data.topics.findIndex(x => x.score !== null),
    'And the next list still puts never-measured topics first, which is the ranking the roadmap runs on',
    t2.data.topics.map(x => x.slug + ':' + x.score).slice(0, 4).join(' '));

  head('It refuses what it should');

  ok((await me.req('POST', '/api/revision/' + started.data.setId + '/submit', { answers })).status === 409,
    'Marking the same set twice');

  const second = await me.req('POST', '/api/revision', { topic: started.data.topic });
  if (second.status === 201) {
    const before = new Set(applies.map(i => i.exampleId));
    const overlap = second.data.items.filter(i => i.type === 'apply' && before.has(i.exampleId));
    ok(overlap.length === 0 || second.data.repeated === true,
      'A second set of the same topic repeats nothing, or says that it had to',
      overlap.length + ' repeat(s), repeated=' + second.data.repeated);
  } else {
    ok(second.status === 503, 'Or says there is nothing left', String(second.status));
  }

  const nonsense = await me.req('POST', '/api/revision', { topic: 'no-such-topic-at-all' });
  ok(nonsense.status === 503, 'A topic that does not exist', String(nonsense.status));

  const anon = client();
  ok((await anon.req('GET', '/api/revision/topics')).status === 401, 'No session, no topics');
  ok((await me.req('POST', '/api/revision/999999/submit', { answers: [] })).status === 404,
    'A set that is not yours');

} catch (e) {
  fail++;
  console.log('\n✗ The suite threw: ' + (e && e.stack ? e.stack : e));
}

console.log(`\n${fail ? '\x1b[31m' : '\x1b[32m'}${pass} passed, ${fail} failed\x1b[0m`);
process.exit(fail ? 1 : 0);
