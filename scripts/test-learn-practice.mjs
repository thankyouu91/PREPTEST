#!/usr/bin/env node
/**
 * Active recall on the two reference pages. Run with the server up.
 *
 * The verb table and the linking-word table were lookup tables: everything else
 * in the self-study area has something to do, and those two had nothing.
 *
 * Most of what is checked here is one property, because it is the one that
 * decides whether any of this can be recorded at all: THE BROWSER DOES NOT GET
 * TO SAY WHETHER IT WAS RIGHT.
 */
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const L = require('../server/learn-practice.js');
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
  head('Marking is fair about the things that are not being tested');

  ok(L.norm('  Went ') === 'went', 'Case and spacing are not the exercise', L.norm('  Went '));
  ok(L.accepts({ v2: 'went' }, 'v2', 'WENT'), 'So an answer in capitals is right');
  ok(!L.accepts({ v2: 'went' }, 'v2', 'goed'), 'And a wrong form is still wrong');
  /* A verb row may name a second accepted form in its own note. Refusing what
     the table itself offered is the kind of small unfairness that makes
     somebody stop trusting the marking altogether. */
  ok(L.accepts({ v2: 'bet', note: 'Cũng dùng betted (hiếm)' }, 'v2', 'betted'),
    'A form the table itself offers in its note is accepted');
  ok(!L.accepts({ v2: 'bet', note: 'Cũng dùng betted (hiếm)' }, 'v2', 'cũng'),
    'But a Vietnamese word out of that note is not an English answer');

  head('A round comes back answerable, and without its answers');

  const who = 'lrn' + Date.now().toString(36).slice(-7);
  const PW = 'Learning-' + Math.random().toString(36).slice(2, 10) + 'A1';
  const reg = await me.req('POST', '/api/auth/register', {
    username: who, email: who + '@example.test', name: 'Learn probe',
    phone: '09' + String(Date.now()).slice(-8), password: PW
  });
  ok(reg.status === 200 || reg.status === 201, 'A new account is registered', String(reg.status));
  const uid = await q.val('SELECT id FROM users WHERE lower(email)=?', who + '@example.test');
  if (!uid) throw new Error('registration failed; nothing below can run');
  if ((await me.req('GET', '/api/me')).status !== 200) {
    await me.req('POST', '/api/auth/login', { username: who, password: PW });
  }

  for (const kind of ['verb', 'link']) {
    const r = await me.req('GET', '/api/learn/practice?kind=' + kind);
    ok(r.status === 200 && r.data.items.length > 0,
      kind + ': a round is drawn', r.status + ' / ' + (r.data.items || []).length);
    const it = r.data.items[0];
    ok(it.prompt && it.id && it.field, kind + ': each question has a prompt, an id and a field',
      JSON.stringify({ id: it.id, field: it.field }));
    /* The answer must not travel with the question. */
    const blob = JSON.stringify(r.data.items).toLowerCase();
    const row = await q.get(
      'SELECT * FROM ' + L.KINDS[kind].table + ' WHERE id = ?', it.id);
    ok(!blob.includes('"answer"'), kind + ': and no answer field is sent with it');
    if (kind === 'link') {
      ok(String(it.prompt).includes('_____'),
        'A linking-word question is a gapped sentence, not the word itself', it.prompt);
      /* Only the FIRST half for a split linker: `both … and` is gapped in two
         places, so the whole string is never in the prompt, but each half has
         to be gone. */
      const firstHalf = String(row.word).split(/\s*(?:…|\.\.\.)\s*/)[0];
      ok(!new RegExp('\\b' + firstHalf.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '\\b', 'i').test(it.prompt),
        'And the word it is asking for has really been taken out', it.prompt);
    }
  }

  head('The browser does not get to say whether it was right');

  /* This is the check the whole design rests on. Mark in the browser and post
     the score, and anybody can post ten correct answers without typing one. */
  const r = await me.req('GET', '/api/learn/practice?kind=verb');
  const items = r.data.items.slice(0, 3);
  const rows = new Map();
  for (const it of items) {
    rows.set(it.id, await q.get('SELECT * FROM irregular_verbs WHERE id = ?', it.id));
  }

  const lying = await me.req('POST', '/api/learn/practice', {
    kind: 'verb', roundId: 'lie1',
    answers: items.map(it => ({ id: it.id, field: it.field, answer: 'zzzz', right: true, correct: true, score: 10 }))
  });
  ok(lying.status === 200, 'A round of nonsense is accepted for marking', String(lying.status));
  ok(lying.data.right === 0,
    'And scored zero, whatever the browser claimed alongside it',
    JSON.stringify({ right: lying.data.right, asked: lying.data.asked }));
  const earned = await q.val(
    "SELECT COALESCE(SUM(earned),0) e FROM skill_events WHERE user_id=? AND source='learn'", uid);
  ok(earned === 0, 'Nothing was banked from it', String(earned));

  const honest = await me.req('POST', '/api/learn/practice', {
    kind: 'verb', roundId: 'true1',
    answers: items.map(it => ({ id: it.id, field: it.field, answer: rows.get(it.id)[it.field] }))
  });
  ok(honest.data.right === items.length,
    'Real answers score full marks', honest.data.right + '/' + items.length);
  ok(honest.data.detail.every(d => d.answer),
    'And the round hands the answers back afterwards, which is the point of practising');

  head('It counts, but only where it should');

  const ab = await me.req('GET', '/api/me/ability');
  ok(ab.data.skills.vocabulary && ab.data.skills.vocabulary.n > 0,
    'Verb recall shows up under vocabulary',
    JSON.stringify(ab.data.skills.vocabulary));
  /* The invariant the whole platform rests on: grammar and vocabulary are
     diagnostic and must not reach the band. */
  ok(ab.data.overall.n === 0,
    'And NOT in the overall band, which is built from the four exam skills only',
    String(ab.data.overall.n));

  const before = await q.val(
    "SELECT COUNT(*) c FROM skill_events WHERE user_id=? AND source='learn'", uid);
  await me.req('POST', '/api/learn/practice', {
    kind: 'verb', roundId: 'true1',
    answers: items.map(it => ({ id: it.id, field: it.field, answer: rows.get(it.id)[it.field] }))
  });
  const after = await q.val(
    "SELECT COUNT(*) c FROM skill_events WHERE user_id=? AND source='learn'", uid);
  ok(before === after,
    'Re-posting the same round does not bank it twice', before + ' -> ' + after);

  head('It refuses what it should');

  ok((await me.req('GET', '/api/learn/practice?kind=nonsense')).status === 400,
    'An unknown kind of practice is refused');
  ok((await me.req('POST', '/api/learn/practice', { kind: 'verb', answers: [] })).status === 400,
    'And an empty round is refused rather than recorded as nothing');
  const anon = client();
  ok((await anon.req('GET', '/api/learn/practice?kind=verb')).status === 401, 'No session, no round');
  ok((await anon.req('POST', '/api/learn/practice', { kind: 'verb', answers: [{ id: 1 }] })).status === 401,
    'And no marking');

} catch (e) {
  fail++;
  console.log('\n✗ The suite threw: ' + (e && e.stack ? e.stack : e));
}

head('Every row can actually be made into a question');

/* The whole table, not whichever ten a shuffle handed back.
 *
 * This is here because the random draw let a broken row through and then failed
 * on CI rather than locally. Two of the 123 linking words are SPLIT — `both …
 * and`, `not only … but also` — and a single-token replace cannot gap them, so
 * the example sentence went out whole and the learner was shown "She is both
 * fluent and accurate." with instructions to type the missing word. There is no
 * missing word, and the marker wanted "both … and". About one round in seven
 * carried one; this machine drew a clean round four times out of four.
 *
 * A check that depends on a shuffle reports the shuffle. This one reads every
 * row, so a data row added next month either gaps or goes red the same day. */
{
  const rows = await q.all('SELECT id, word, ex_en FROM linking_words');
  ok(rows.length > 100, 'the linking-word table really was read', rows.length + ' rows');

  const ungappable = rows.filter(r => !L.gapExample(r.word, r.ex_en));
  ok(ungappable.length === 0,
    'every linking word can be taken out of its own example sentence',
    ungappable.map(r => JSON.stringify(r.word) + ' in ' + JSON.stringify(r.ex_en)).join(' | '));

  /* And a split one is gapped in BOTH places, which is the point of a
     correlative pair — one blank would still be unanswerable. */
  const split = rows.filter(r => /…|\.\.\./.test(r.word));
  ok(split.length >= 2, 'there are split linking words to check', split.length);
  const halfGapped = split.filter(r => (L.gapExample(r.word, r.ex_en).match(/_____/g) || []).length < 2);
  ok(halfGapped.length === 0,
    'a split linking word is gapped in both places, not just the first',
    halfGapped.map(r => L.gapExample(r.word, r.ex_en)).join(' | '));
}

console.log(`\n${fail ? '\x1b[31m' : '\x1b[32m'}${pass} passed, ${fail} failed\x1b[0m`);
process.exit(fail ? 1 : 0);
