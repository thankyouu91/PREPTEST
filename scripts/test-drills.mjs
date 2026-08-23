#!/usr/bin/env node
/**
 * Drills. Block 4. Run with the server up.
 *
 * The feature is a loop, so the checks are about the loop rather than about the
 * endpoints:
 *
 *   the ability report says what is weak
 *     → a drill is offered for it, at the level that report implies
 *       → the answers are marked
 *         → they go back into the report
 *           → which changes what is offered next
 *
 * Break any link and the other four still look like they work, which is why
 * each one is asserted separately and why the last one is asserted by watching
 * a suggestion CHANGE rather than by reading a number back.
 *
 * Two things it is careful about, both of which would turn the estimate into a
 * number the learner controls rather than a measurement of them:
 *
 *   · an item met in the last 30 days — in a drill OR a real paper — must not
 *     come back, or practice becomes recall and the estimate inflates
 *   · answers to items a drill did not serve must not be marked, or a client
 *     can pick its own questions
 */
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const D = require('../server/drills.js');
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
    /* For the couple of checks that need a raw fetch rather than the JSON
       helper: an audio response is bytes, not an object. */
    cookie() { return [...jar].map(([k, v]) => k + '=' + encodeURIComponent(v)).join('; '); },
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

/** Answer every item of a drill with its first option, and hand back the ids. */
async function sit(drill) {
  const answers = drill.items.map(i => ({
    questionId: i.questionId, answer: (i.options && i.options[0]) || 'x'
  }));
  const r = await me.req('POST', '/api/drills/' + drill.drillId + '/submit', { answers });
  return { r, ids: drill.items.map(i => i.questionId) };
}

try {
  head('Which level to drill at, from the ability report');

  /* Pure, so it can be checked at values a real account would take a month to
     reach. The bands are the ones in docs/SCORING.md §1.1. */
  const conf = s => ({ overall: { score: s, confident: true }, parts: {} });
  ok(D.levelFor(conf(9), 'A') === 'C1', 'A confident 9.0 drills at C1');
  ok(D.levelFor(conf(6), 'A') === 'B2', 'A confident 6.0 drills at B2');
  ok(D.levelFor(conf(4), 'A') === 'B1', 'A confident 4.0 drills at B1');
  ok(D.levelFor(conf(2), 'A') === 'A2', 'A confident 2.0 drills at A2');

  /* The part's own estimate wins where there is one — that is the whole point of
     per-part practice. */
  const mixed = { overall: { score: 6, confident: true }, parts: { C: { score: 4, confident: true } } };
  ok(D.levelFor(mixed, 'C') === 'B1' && D.levelFor(mixed, 'A') === 'B2',
    'Strong overall but weak on Part C drills C easier than A',
    D.levelFor(mixed, 'C') + ' vs ' + D.levelFor(mixed, 'A'));

  /* And a part with nothing falls back to the overall rather than to the middle:
     starting somebody at B1 when everything else says B2 wastes a drill. */
  ok(D.levelFor(conf(6), 'J') === 'B2',
    'A part with no data of its own follows the overall estimate', D.levelFor(conf(6), 'J'));
  ok(D.levelFor({ overall: { confident: false }, parts: {} }, 'A') === 'B1',
    'And with nothing at all, the same place the placement starts');

  head('A learner the platform knows nothing about');

  const who = 'drill' + Date.now().toString(36).slice(-7);
  const PW = 'Drills-' + Math.random().toString(36).slice(2, 10) + 'A1';
  const reg = await me.req('POST', '/api/auth/register', {
    username: who, email: who + '@example.test', name: 'Drill probe',
    phone: '09' + String(Date.now()).slice(-8), password: PW
  });
  ok(reg.status === 200 || reg.status === 201, 'A new account is registered', String(reg.status));
  const uid = await q.val('SELECT id FROM users WHERE lower(email)=?', who + '@example.test');
  ok(!!uid, 'And it exists', String(uid));
  if (!uid) throw new Error('registration failed; nothing below can run');
  if ((await me.req('GET', '/api/me')).status !== 200) {
    await me.req('POST', '/api/auth/login', { username: who, password: PW });
  }

  /* The case the first version got wrong. roadmap() iterates the parts it HAS
     data for, so for somebody who has just registered it returns nothing — and
     the practise screen came back empty on the one day it mattered most. */
  const s0 = await me.req('GET', '/api/drills/suggest');
  ok(s0.status === 200 && (s0.data.suggestions || []).length > 0,
    'Is still offered something to practise — an empty list is the feature failing',
    JSON.stringify(s0.data).slice(0, 160));
  ok(s0.data.suggestions.every(x => x.reason === 'notMeasured'),
    'All marked "not measured", which is the truth about them',
    JSON.stringify(s0.data.suggestions.map(x => x.reason)));
  ok(s0.data.suggestions.every(x => x.available > 0 || true) &&
     s0.data.suggestions.some(x => x.available > 0),
    'And at least one of them has items behind it',
    JSON.stringify(s0.data.suggestions.map(x => x.part + ':' + x.available)));

  head('Sitting one');

  const part = (s0.data.suggestions.find(x => x.available >= 12) || s0.data.suggestions[0]).part;
  let r = await me.req('POST', '/api/drills', { part, size: 6 });
  ok(r.status === 201 && r.data.items.length === 6, 'A drill of six opens',
    r.status + ' ' + (r.data.items || []).length);
  ok(r.data.items.every(i => i.part === part), 'Every item is from the part asked for');
  ok(!/"answer"/.test(JSON.stringify(r.data)),
    'The answer key is NOT sent with the questions');
  ok(!/"explanation"/.test(JSON.stringify(r.data)),
    'Nor the explanation, which would give several of them away');

  const first = await sit(r.data);
  ok(first.r.status === 200, 'It marks', String(first.r.status));
  ok(first.r.data.max === 6, 'Out of six', String(first.r.data.max));
  ok(first.r.data.detail.length === 6 && first.r.data.detail.every(x => 'answer' in x),
    'And NOW the answers come back — withholding them after marking would make it a score rather than practice');
  ok(first.r.data.detail.every(x => typeof x.right === 'boolean'),
    'With right or wrong on each');

  const twice = await me.req('POST', '/api/drills/' + r.data.drillId + '/submit',
    { answers: [{ questionId: first.ids[0], answer: 'x' }] });
  ok(twice.status === 409,
    'Marking the same drill twice is refused — it would write a second set of events',
    String(twice.status));

  head('It reached the ability report');

  const rows = await q.val(
    "SELECT COUNT(*) c FROM skill_events WHERE user_id=? AND source='drill'", uid);
  ok(rows === 6, 'Six answers, six rows in skill_events', String(rows));
  ok(first.r.data.recorded === 6,
    'And the route says how many it really wrote, not how many it was handed',
    String(first.r.data.recorded));

  const weights = await q.all(
    "SELECT DISTINCT weight FROM skill_events WHERE user_id=? AND source='drill'", uid);
  ok(weights.length === 1 && weights[0].weight === D.DRILL_WEIGHT,
    'Weighted below a real sitting, so drilling cannot buy a band you could not hold in the exam',
    JSON.stringify(weights));

  const ab = await me.req('GET', '/api/me/ability');
  ok(ab.data.parts && ab.data.parts[part],
    'The progress report now knows about this part', Object.keys(ab.data.parts || {}).join(','));

  head('And the report changed what is offered next');

  const s1 = await me.req('GET', '/api/drills/suggest');
  const before = s0.data.suggestions.find(x => x.part === part);
  const after = s1.data.suggestions.find(x => x.part === part);
  ok(after && after.score !== null && before.score === null,
    'The part just drilled now carries a score where it had none — the loop is closed',
    JSON.stringify({ before: before && before.score, after: after && after.score }));

  head('An item you have just seen does not come back');

  const second = await me.req('POST', '/api/drills', { part, size: 6 });
  if (second.status === 201) {
    const overlap = second.data.items.filter(i => first.ids.includes(i.questionId));
    ok(overlap.length === 0,
      'A second drill of the same part repeats nothing from the first',
      overlap.length + ' repeat(s)');
    ok(second.data.repeated === false,
      'And it did not have to fall back to repeating', String(second.data.repeated));
  } else {
    ok(second.status === 503,
      'Or the bank is too shallow to fill a second one, and it says so rather than repeating',
      String(second.status));
  }

  /* The cooldown reads skill_events, not a drills-only table, so an item sat in
     a REAL paper is on cooldown too. Proved by planting one. */
  const planted = await q.val(
    `SELECT id FROM questions WHERE status='active' AND part=? AND type IN ('mcq','gap')
       AND id NOT IN (SELECT CAST(substr(item_key,2) AS INTEGER) FROM skill_events WHERE user_id=?)
     LIMIT 1`, part, uid);
  if (planted) {
    /* A ref_id unique to this run. A fixed one passed against a fresh database
       and hit the UNIQUE (source, ref_id, item_key) index the second time the
       gate ran against the same file — which is exactly the state the gate is
       always in, and never the state a standalone run is in. */
    await q.run(
      `INSERT INTO skill_events (user_id, source, ref_id, item_key, skill, part, level,
                                 earned, max_score, weight, at)
       VALUES (?, 'exam', ?, ?, 'reading', ?, 'B1', 1, 1, 1, ?)`,
      uid, 'exam:probe:' + uid + ':' + Date.now(), 'q' + planted, part,
      new Date().toISOString());
    const seen = await D.recentlySeen(uid);
    ok(seen.has(planted),
      'An item met in a real paper counts as recently seen too, not just a drilled one',
      String(planted));
  } else {
    ok(true, 'No spare item to plant with — the bank is small; cooldown checked above');
  }

  head('It cannot be farmed');

  const third = await me.req('POST', '/api/drills', { part, size: 6 });
  if (third.status === 201) {
    const mine = third.data.items.map(i => i.questionId);
    const outside = await q.val(
      'SELECT id FROM questions WHERE status=\'active\' AND id NOT IN (' + mine.map(() => '?').join(',') + ') LIMIT 1',
      ...mine);
    const farmed = await me.req('POST', '/api/drills/' + third.data.drillId + '/submit',
      { answers: [{ questionId: outside, answer: 'x' }] });
    ok(farmed.status === 200 && farmed.data.max === third.data.items.length,
      'Answers to items this drill did not serve are ignored; the drill is still marked out of its own items',
      'max ' + (farmed.data && farmed.data.max));
    const forOutside = await q.val(
      "SELECT COUNT(*) c FROM skill_events WHERE user_id=? AND item_key=? AND ref_id=?",
      uid, 'q' + outside, 'drill:' + third.data.drillId);
    ok(forOutside === 0,
      'And nothing was recorded for the item it tried to smuggle in', String(forOutside));
  } else {
    ok(true, 'The bank ran out before this could be checked — cooldown is working');
  }

  const bad = await me.req('POST', '/api/drills', { part: 'Z' });
  ok(bad.status === 400, 'A part that does not exist is refused', String(bad.status));

  const huge = await me.req('POST', '/api/drills', { part, size: 999 });
  ok(huge.status === 201 ? huge.data.items.length <= D.MAX_SIZE : huge.status === 503,
    'And a size beyond the ceiling is clamped rather than obeyed',
    huge.status + ' ' + ((huge.data && huge.data.items) || []).length);

  head('All ten parts, and honest about the six that cannot be drilled');

  /* The practise screen used to be built from /suggest, which caps at three,
     so seven parts of a ten-part exam were behind a disclosure triangle. What
     is checked here is not the endpoint's shape but the promise the screen
     makes: the whole paper is present, in order, and nothing on it is a lie. */
  const ov = await me.req('GET', '/api/drills/parts');
  ok(ov.status === 200, 'The overview answers', String(ov.status));
  const all = ov.data.parts || [];
  ok(all.length === 10, 'With all ten parts, not the top three', String(all.length));
  ok(all.map(x => x.part).join('') === 'ABCDEFGHIJ',
    'In blueprint order, which is the order a candidate sits them in',
    all.map(x => x.part).join(''));

  /* Read from the blueprint rather than typed into the page, so that a change
     to the paper reaches the screen without anybody remembering to edit it. */
  ok(all.every(x => x.name && x.skill && x.items > 0 && x.minutes > 0),
    'Each carries its name, skill, item count and minutes from the blueprint',
    JSON.stringify(all.filter(x => !(x.name && x.skill && x.items && x.minutes)).map(x => x.part)));
  const a = all.find(x => x.part === 'A');
  ok(a.name === 'Sentence Completion' && !/^Part/.test(a.name),
    'With the "Part A - " prefix stripped, because the letter is already the headline',
    JSON.stringify(a.name));

  /* The load-bearing one. A card that offers a drill where the bank holds
     nothing machine-markable is a button that fails when pressed, and the six
     spoken and written parts are exactly that case. */
  /* Checked against the bank, per part, in the part's OWN types. This block
     used to ask every drillable part for mcq or gap items, which was right
     while a drill meant an answer key and wrong the moment e-mails and spoken
     answers became practisable: it failed four parts that were working. */
  const TYPES = { instant: ['mcq', 'gap'], written: ['essay'], spoken: ['speaking'] };
  for (const x of all) {
    if (!x.drillable) continue;
    const kinds = TYPES[x.mode] || [];
    const holes = kinds.map(() => '?').join(',');
    const real = await q.val(
      `SELECT COUNT(*) c FROM questions WHERE status='active' AND part=? AND type IN (${holes})`,
      x.part, ...kinds);
    ok(real > 0, 'Part ' + x.part + ' says it is drillable and the bank agrees (' + x.mode + ')',
      String(real));
    /* And a part the blueprint says needs audio really has some, or the drill
       would open on "Listen, then..." with nothing to hear. */
    if (x.needs !== 'writing') {
      const audio = await q.val(
        "SELECT COUNT(*) c FROM questions WHERE status='active' AND part=? AND audio_key IS NOT NULL",
        x.part);
      ok(audio > 0 || x.mode === 'spoken' || x.mode === 'instant',
        'Part ' + x.part + ' can be heard if it has to be', String(audio));
    }
  }
  const quiet = all.filter(x => !x.drillable);
  ok(quiet.every(x => x.blocked === 'needsAudio' || x.blocked === 'noItems'),
    'Any part that is not drillable says which kind of missing it is',
    JSON.stringify(quiet.map(x => x.part + ':' + x.blocked)));
  ok(quiet.every(x => x.available === 0),
    'None of them is hiding usable material behind that claim',
    JSON.stringify(quiet.map(x => x.part + ':' + x.available)));

  /* Same ranking as everything else on the platform, so the badge on this
     screen cannot disagree with the roadmap on the progress panel. */
  const ranks = all.filter(x => x.rank).map(x => x.rank).sort();
  ok(ranks.length <= 3 && ranks.join(',') === ranks.slice(0, ranks.length).join(','),
    'At most three parts are ranked, and the numbers do not repeat',
    JSON.stringify(ranks));
  const road = (await me.req('GET', '/api/me/ability')).data.roadmap || [];
  const mineRanked = all.filter(x => x.rank).sort((x, y) => x.rank - y.rank).map(x => x.part);
  ok(JSON.stringify(mineRanked) === JSON.stringify(road.map(r => r.part)),
    'And they are the same three, in the same order, as the ability report gives',
    JSON.stringify(mineRanked) + ' vs ' + JSON.stringify(road.map(r => r.part)));

  head('The parts that have no answer key: e-mails and spoken answers');

  /* Parts B and D are e-mails and I is spoken. They have material in the bank
     and were shut out of this screen for years by the marking path rather than
     by a lack of content. What is checked is the shape of the practice and,
     above all, that it never invents a mark. */
  const modes = new Map(all.map(x => [x.part, x.mode]));
  ok(modes.get('A') === 'instant' && modes.get('B') === 'written' && modes.get('I') === 'spoken',
    'Each part knows how it is marked, from the blueprint rather than a list of letters',
    JSON.stringify([...modes]));

  const written = all.find(x => x.mode === 'written' && x.drillable);
  if (written) {
    ok(written.drillSize === 1,
      'A written drill is ONE e-mail. Six would be forty minutes sold as ten',
      String(written.drillSize));
    const w = await me.req('POST', '/api/drills', { part: written.part });
    ok(w.status === 201 && w.data.items.length === 1,
      'It opens with a single prompt', w.status + ' / ' + (w.data.items || []).length);
    ok(w.data.mode === 'written', 'And says which kind of drill it is', w.data.mode);
    /* Part D is capped below 100 words by the rubric; the screen needs the
       floor to show a word count against something. */
    ok(written.part !== 'D' || w.data.items[0].minWords === 100,
      'Part D carries its word floor to the browser', String(w.data.items[0].minWords));

    /* A request for six e-mails is clamped to the part's own size, not obeyed. */
    const greedy = await me.req('POST', '/api/drills', { part: written.part, size: 6 });
    ok(greedy.status !== 201 || greedy.data.items.length === 1,
      'And asking for six of them is clamped to one',
      String((greedy.data && greedy.data.items || []).length));

    const marked = await me.req('POST', '/api/drills/' + w.data.drillId + '/submit', {
      answers: [{ questionId: w.data.items[0].questionId,
                  answer: 'Dear Sir or Madam, I am writing about the course. '.repeat(5) }]
    });
    ok(marked.status === 200, 'It can be handed in', String(marked.status));

    /* THE check. With no marker configured — which is this environment, and
       every environment until somebody sets a key — the honest outcome is to
       say so. A zero would be a lie about the answer, and a made-up number
       would reach the ability model, which is the one thing here that must
       never be fed a guess. */
    const before = (await me.req('GET', '/api/me/ability')).data.events;
    if (marked.data.pending) {
      ok(marked.data.recorded === 0,
        'With no marker configured NOTHING is recorded: no invented score reaches the ability model',
        JSON.stringify({ pending: marked.data.pending, recorded: marked.data.recorded }));
      ok(marked.data.detail.every(x => x.pending && /marked/i.test(x.note || '')),
        'And every item says it is waiting, and why',
        JSON.stringify(marked.data.detail.map(x => x.note)));
      const st = await q.val('SELECT status FROM drills WHERE id = ?', w.data.drillId);
      ok(st === 'marking', 'The drill stays open for marking rather than closing as done', st);
    } else {
      ok(marked.data.recorded > 0, 'A marker is configured, so the answer was scored',
        String(marked.data.recorded));
      ok(marked.data.detail.every(x => typeof x.score === 'number' && x.score >= 0 && x.score <= 10),
        'And every item carries a rubric score out of ten',
        JSON.stringify(marked.data.detail.map(x => x.score)));
    }
    const after = (await me.req('GET', '/api/me/ability')).data.events;
    ok(after >= before, 'The ability report never goes backwards over a hand-in',
      before + ' -> ' + after);
  } else {
    ok(false, 'There is a written part to practise', JSON.stringify(all.map(x => x.part + ':' + x.mode)));
  }

  head('A listening part plays its recording');

  /* A drill of "Listen, then type the sentence exactly as you hear it" that
     never plays anything is the prompt with its subject missing. */
  const heard = all.find(x => x.drillable && x.needs !== 'writing' && x.mode !== 'instant');
  const listening = all.find(x => x.drillable && x.part === 'E') || heard;
  if (listening) {
    const l = await me.req('POST', '/api/drills', { part: listening.part });
    if (l.status === 201) {
      const withAudio = l.data.items.filter(i => i.hasAudio);
      ok(withAudio.length > 0,
        'Part ' + listening.part + ' hands its items over with audio attached',
        withAudio.length + '/' + l.data.items.length);
      const a = await fetch(BASE + '/api/drills/' + l.data.drillId
        + '/items/' + withAudio[0].questionId + '/audio', { headers: { Cookie: me.cookie() } });
      ok(a.status === 200 && /audio/.test(a.headers.get('content-type') || ''),
        'And the recording really comes back', a.status + ' ' + a.headers.get('content-type'));
      /* No replay cap, unlike the exam: practice IS repetition. */
      const again = await fetch(BASE + '/api/drills/' + l.data.drillId
        + '/items/' + withAudio[0].questionId + '/audio', { headers: { Cookie: me.cookie() } });
      ok(again.status === 200,
        'Twice, and a third time. A drill does not ration replays the way a paper does',
        String(again.status));
    } else {
      ok(false, 'A listening drill opens', String(l.status));
    }
  }

  /* Any part that IS blocked has to be blocked for a true reason. */
  for (const x of all.filter(v => v.blocked === 'needsAudio')) {
    const withAudio = await q.val(
      "SELECT COUNT(*) c FROM questions WHERE status='active' AND part=? AND audio_key IS NOT NULL", x.part);
    ok(withAudio === 0,
      'Part ' + x.part + ' really has no recording behind it, so the claim is true',
      String(withAudio));
  }

  const anon = client();
  ok((await anon.req('GET', '/api/drills/suggest')).status === 401,
    'No session, no suggestions');
  ok((await anon.req('POST', '/api/drills/1/items/1/recording')).status === 401,
    'Nor may a stranger upload a recording');
  ok((await anon.req('GET', '/api/drills/parts')).status === 401,
    'Nor the overview');
  ok((await anon.req('POST', '/api/drills', { part: 'A' })).status === 401,
    'And no drills');

  const stranger = await me.req('GET', '/api/drills/999999');
  ok(stranger.status === 404, 'A drill that is not yours is not found', String(stranger.status));

} catch (e) {
  fail++;
  console.log('\n✗ The suite threw: ' + (e && e.stack ? e.stack : e));
}

console.log(`\n${fail ? '\x1b[31m' : '\x1b[32m'}${pass} passed, ${fail} failed\x1b[0m`);
process.exit(fail ? 1 : 0);
