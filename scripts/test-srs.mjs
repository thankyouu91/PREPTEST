/**
 * Spaced repetition: the schedule, and the queue built on top of it.
 *
 * Run with the server up: node scripts/test-srs.mjs
 *
 * Two halves, and the split is the point. server/srs.js is pure — state in,
 * state out, with the clock passed as an argument — so the intervals can be
 * checked exactly rather than approximately, and a test never has to wait a day
 * to find out what the next one would be. The API half then only has to prove
 * that it stores what the scheduler said, keeps two learners apart, and refuses
 * what it should.
 *
 * The API half signs up a FRESH account each run. Reusing the demo student
 * would mean the second run of the day starts with yesterday's review history,
 * and "this card is new" would be true once and never again — the same trap the
 * sign-in lockout fell into when it moved into the database.
 */
import { createRequire } from 'node:module';

const require_ = createRequire(import.meta.url);
const srs = require_('../server/srs.js');

const BASE = process.env.BASE || 'http://127.0.0.1:3000';

let pass = 0, fail = 0;
const ok = (c, name, detail) => {
  if (c) { pass++; console.log('✓ ' + name); return; }
  fail++;
  console.log('✗ ' + name + (detail === undefined ? '' : '  → ' + detail));
};
const head = t => console.log('\n\x1b[1m== ' + t + ' ==\x1b[0m');

/* A fixed clock. Every interval below is exact because of it. */
const T0 = new Date('2026-08-12T09:00:00.000Z');
const state = s => (s ? { ease: s.ease, interval: s.interval, reps: s.reps, lapses: s.lapses, state: s.state } : null);
/** Walk a card through a run of grades and hand back where it ended up. */
const walk = (grades, from) => grades.reduce((s, g) => srs.schedule(state(s), g, T0), from || null);
const daysBetween = (iso, from) => Math.round((new Date(iso) - from) / 86400000);

/* ============ 1. The schedule ============ */
head('The reduced SM-2');

{
  const a = srs.schedule(null, 'good', T0);
  ok(a.interval === 1 && a.reps === 1, 'The first success is one day', `interval=${a.interval}`);
  ok(a.state === 'learning', 'and the card is still being learned, not filed away');
  ok(a.ease === 2.5, 'A plain "good" leaves the ease alone', String(a.ease));
  ok(daysBetween(a.dueAt, T0) === 1, 'due_at is one day past the clock it was given');

  const b = srs.schedule(state(a), 'good', T0);
  ok(b.interval === 6 && b.reps === 2, 'The second success is six days', `interval=${b.interval}`);
  ok(b.state === 'review', 'and now it counts as in review');

  const c = srs.schedule(state(b), 'good', T0);
  ok(c.interval === 15, 'From the third, interval × ease: 6 × 2.5 = 15', String(c.interval));
}

{
  /* The two fixed steps are SM-2 as published, and they matter: interval × ease
     from a standing start would send a brand-new card out to 2.5 days. */
  const first = srs.schedule(null, 'easy', T0);
  ok(first.interval === 1, 'Even "easy" cannot skip the first step', String(first.interval));
  ok(first.ease === 2.65, 'though it does raise the ease straight away', String(first.ease));
}

{
  const three = walk(['good', 'good', 'good']);          // interval 15, ease 2.5
  const hard = srs.schedule(state(three), 'hard', T0);
  ok(hard.interval === 18, '"Hard" grows the interval by 1.2, not by the ease', String(hard.interval));
  ok(hard.ease === 2.35, 'and takes 0.15 off the ease', String(hard.ease));

  const easy = srs.schedule(state(three), 'easy', T0);
  /* The RAISED ease is what multiplies, then the bonus: 15 × 2.65 × 1.3 = 51.7. */
  ok(easy.interval === 52, '"Easy" steps on the raised ease and then adds the 1.3 bonus',
    String(easy.interval));
  ok(easy.ease === 2.65, 'and adds 0.15 to the ease', String(easy.ease));

  const good = srs.schedule(state(three), 'good', T0);
  ok(good.interval === 38, '"Good" is interval × ease and nothing else', String(good.interval));
}

{
  const three = walk(['good', 'good', 'good']);
  const again = srs.schedule(state(three), 'again', T0);
  ok(again.interval === 0, '"Again" discards the interval rather than shrinking it', String(again.interval));
  ok(again.reps === 0, 'and puts the card back at the start of the two fixed steps');
  ok(again.lapses === 1, 'The lapse is counted', String(again.lapses));
  ok(again.state === 'learning', 'and the card is being learned again');
  ok(Math.round((new Date(again.dueAt) - T0) / 60000) === 10,
    'It comes back in ten minutes, not tomorrow', again.dueAt);
  ok(again.ease === 2.3, 'and the ease drops by 0.20', String(again.ease));

  const recovered = srs.schedule(state(again), 'good', T0);
  ok(recovered.interval === 1 && recovered.lapses === 1,
    'Recovering starts the ladder again but keeps the lapse count', JSON.stringify(recovered));
}

{
  /* Without SM-2's floor, a card failed enough times reaches ease 0 and can
     never leave the queue again. */
  let s = null;
  for (let i = 0; i < 20; i++) s = srs.schedule(state(s), 'again', T0);
  ok(s.ease === srs.EASE_FLOOR, 'The ease has a floor of 1.3 however often a card is failed', String(s.ease));
  ok(s.lapses === 20, 'Lapses keep counting past the floor', String(s.lapses));
}

{
  let s = walk(['good', 'good']);
  for (let i = 0; i < 12; i++) s = srs.schedule(state(s), 'easy', T0);
  ok(s.interval === srs.MAX_INTERVAL, 'The interval is capped at a year', String(s.interval));
  ok(daysBetween(s.dueAt, T0) === 365, 'and due_at agrees with the cap');
}

{
  const before = walk(['good', 'good']);
  const snapshot = JSON.stringify(state(before));
  srs.schedule(state(before), 'again', T0);
  ok(JSON.stringify(state(before)) === snapshot, 'Scheduling does not mutate the state it was handed');
}

{
  let threw = null;
  try { srs.schedule(null, 'brilliant', T0); } catch (e) { threw = e; }
  ok(threw !== null, 'An unknown grade is refused rather than guessed at');
  ok(srs.GRADES.join(',') === 'again,hard,good,easy', 'The grades are ordered worst to best', srs.GRADES.join(','));
}

{
  const two = walk(['good', 'good']);
  ok(srs.previewLabel(null, 'again', T0) === '10 min', 'Preview: a failed new card reads as minutes');
  ok(srs.previewLabel(null, 'good', T0) === '1 day', 'Preview: singular for one day');
  ok(srs.previewLabel(state(two), 'good', T0) === '15 days', 'Preview: days up to a month');
  ok(srs.previewLabel(state(walk(['good', 'good', 'good'])), 'easy', T0) === '2 mo',
    'Preview: months past thirty days', srs.previewLabel(state(walk(['good', 'good', 'good'])), 'easy', T0));
  ok(srs.daysUntil(new Date(T0.getTime() + 3 * 86400000).toISOString(), T0) === 3, 'daysUntil counts forward');
  ok(srs.daysUntil(new Date(T0.getTime() - 2 * 86400000).toISOString(), T0) === -2,
    'and counts overdue cards as negative');
}

/* ============ 2. The queue ============ */

/** A small browser: keeps cookies, attaches the CSRF header. */
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
    post(p, b, h) { return this.req('POST', p, b === undefined ? {} : b, h); }
  };
}

const stamp = String(process.hrtime.bigint()).slice(-9);
async function freshLearner(tag) {
  const c = client();
  const r = await c.post('/api/auth/register', {
    name: 'Review Tester', email: `srs.${tag}.${stamp}@thu-nghiem.vn`, password: 'Ontap12345'
  });
  if (r.status !== 201) throw new Error(`could not register a test learner: HTTP ${r.status}`);
  return c;
}

head('Who may ask');

{
  const anon = client();
  let r = await anon.get('/api/learn/review');
  ok(r.status === 401, 'Signed out, the queue answers 401 rather than a queue', String(r.status));
  r = await anon.post('/api/learn/review', { deck: 'irregular_verb', itemId: 1, grade: 'good' });
  ok(r.status === 401, 'and a grade from nobody is refused', String(r.status));
}

const learner = await freshLearner('a');

{
  const r = await learner.post('/api/learn/review',
    { deck: 'irregular_verb', itemId: 1, grade: 'good' }, { 'X-CSRF-Token': 'wrong-token' });
  ok(r.status === 403, 'A grade with a wrong CSRF token is refused', String(r.status));
}

head('The first session');

let first = null;
{
  const r = await learner.get('/api/learn/review');
  ok(r.status === 200, 'The queue loads', String(r.status));
  const d = r.data || {};
  ok(Array.isArray(d.decks) && d.decks.length === 3, 'Three decks are offered',
    JSON.stringify((d.decks || []).map(x => x.id)));
  ok(d.decks.every(x => x.total > 0), 'and each one has material in it',
    JSON.stringify((d.decks || []).map(x => `${x.id}:${x.total}`)));
  ok(d.decks.every(x => x.seen === 0 && x.due === 0), 'A brand-new learner has started nothing');
  ok(JSON.stringify(d.grades) === JSON.stringify(srs.GRADES), 'The four grades come from the scheduler');
  ok(Array.isArray(d.cards) && d.cards.length === 20, 'A session is a batch, not the whole word list',
    String((d.cards || []).length));
  ok(d.cards.every(c => c.isNew), 'and every card in it is new to this learner');
  ok(d.newLeftToday === d.newPerDay, 'None of today\'s new-card allowance is spent yet',
    `${d.newLeftToday}/${d.newPerDay}`);

  first = d.cards[0];
  ok(!!first.prompt && !!first.ask, 'A card carries a prompt and what is being asked',
    JSON.stringify({ prompt: first.prompt, ask: first.ask }));
  /* Deliberately unlike the exam router, which strips every answer it serialises:
     the back of a recall card IS the study material. */
  ok(!!first.answer, 'and the answer travels with it, because there is nothing to cheat at');
  ok(srs.GRADES.every(g => typeof first.preview[g] === 'string' && first.preview[g]),
    'Each button knows what it would schedule', JSON.stringify(first.preview));
  ok(first.preview.good === '1 day', 'and for a new card "good" reads as one day', first.preview.good);
}

head('Grading a card');

{
  const r = await learner.post('/api/learn/review',
    { deck: first.deck, itemId: first.itemId, grade: 'good' });
  ok(r.status === 200, 'A grade is accepted', String(r.status));
  ok(r.data.interval === 1 && r.data.reps === 1, 'and stores what the scheduler said',
    JSON.stringify(r.data));
  ok(r.data.state === 'learning', 'The card is in learning after one success');
  const days = Math.round((new Date(r.data.dueAt) - Date.now()) / 86400000);
  ok(days === 1, 'It is due a day from the SERVER clock, not from anything the caller sent', String(days));

  const after = await learner.get('/api/learn/review');
  const deck = after.data.decks.find(d => d.id === first.deck);
  ok(deck.seen === 1, 'The deck now shows one card started', String(deck.seen));
  ok(deck.due === 0, 'and nothing due, because tomorrow is not now', String(deck.due));
  ok(!after.data.cards.some(c => c.deck === first.deck && c.itemId === first.itemId),
    'The graded card has left the queue');
  ok(after.data.newLeftToday === after.data.newPerDay - 1,
    'and one of today\'s new-card allowance is spent', String(after.data.newLeftToday));
}

{
  /* Grading the same card twice must update the row, not add a second one. */
  await learner.post('/api/learn/review', { deck: first.deck, itemId: first.itemId, grade: 'good' });
  const r = await learner.get('/api/learn/review');
  const deck = r.data.decks.find(d => d.id === first.deck);
  ok(deck.seen === 1, 'Grading the same card again updates one row rather than adding another',
    String(deck.seen));
  ok(deck.review === 1, 'and after the second success it counts as in review', String(deck.review));
}

{
  const target = (await learner.get('/api/learn/review')).data.cards[0];
  const r = await learner.post('/api/learn/review',
    { deck: target.deck, itemId: target.itemId, grade: 'again' });
  ok(r.status === 200 && r.data.interval === 0, '"Again" stores a zero interval', JSON.stringify(r.data));
  const mins = Math.round((new Date(r.data.dueAt) - Date.now()) / 60000);
  ok(mins === 10, 'due ten minutes out', String(mins));
  ok(r.data.lapses === 1, 'and the lapse is recorded', String(r.data.lapses));

  const after = await learner.get('/api/learn/review');
  ok(!after.data.cards.some(c => c.deck === target.deck && c.itemId === target.itemId),
    'A failed card is not immediately due again — ten minutes means ten minutes');
}

head('What the queue refuses');

{
  let r = await learner.post('/api/learn/review', { deck: 'no_such_deck', itemId: 1, grade: 'good' });
  ok(r.status === 400, 'An unknown deck is refused', String(r.status));

  r = await learner.post('/api/learn/review', { deck: 'irregular_verb', itemId: 1, grade: 'brilliant' });
  ok(r.status === 400, 'An unknown grade is refused', String(r.status));

  r = await learner.post('/api/learn/review', { deck: 'irregular_verb', itemId: 0, grade: 'good' });
  ok(r.status === 400, 'A missing item id is refused', String(r.status));

  /* Without this a caller could file progress against any integer at all and
     grow the table a row at a time. */
  r = await learner.post('/api/learn/review', { deck: 'irregular_verb', itemId: 999999, grade: 'good' });
  ok(r.status === 404, 'An item that is not in that deck is refused', String(r.status));

  r = await learner.post('/api/learn/review', { deck: 'linking_word', itemId: 999999, grade: 'good' });
  ok(r.status === 404, 'including one that exists in a DIFFERENT deck', String(r.status));
}

head('One deck at a time');

{
  const r = await learner.get('/api/learn/review?deck=linking_word');
  ok(r.status === 200, 'A single deck can be asked for on its own');
  ok(r.data.cards.every(c => c.deck === 'linking_word'), 'and only that deck comes back',
    JSON.stringify([...new Set(r.data.cards.map(c => c.deck))]));
  ok(r.data.decks.length === 1 && r.data.decks[0].id === 'linking_word',
    'with the summary narrowed to match');

  const junk = await learner.get('/api/learn/review?deck=../../etc/passwd');
  ok(junk.status === 200 && junk.data.decks.length === 3,
    'An unknown deck name falls back to everything rather than erroring or leaking',
    String(junk.status));
}

head('Two learners');

{
  const other = await freshLearner('b');
  const mine = await learner.get('/api/learn/review');
  const theirs = await other.get('/api/learn/review');
  ok(theirs.data.decks.every(d => d.seen === 0),
    'A second learner starts clean, whatever the first one has done',
    JSON.stringify(theirs.data.decks.map(d => d.seen)));
  ok(mine.data.decks.some(d => d.seen > 0), 'while the first learner keeps their progress');

  const card = theirs.data.cards[0];
  await other.post('/api/learn/review', { deck: card.deck, itemId: card.itemId, grade: 'easy' });
  const back = await learner.get('/api/learn/review');
  const stillNew = back.data.cards.find(c => c.deck === card.deck && c.itemId === card.itemId);
  ok(!stillNew || stillNew.isNew,
    'and grading a card as one learner does not mark it seen for the other');
}

console.log(`\n${fail === 0 ? '\x1b[32m✔' : '\x1b[31m✗'} ${pass} passed, ${fail} failed\x1b[0m`);
process.exit(fail === 0 ? 0 : 1);
