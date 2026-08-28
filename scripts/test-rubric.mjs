#!/usr/bin/env node
/**
 * The rubric. Block 3.
 *
 * Run with the server up: node scripts/test-rubric.mjs
 *
 * Two halves. The first is pure arithmetic and needs nothing running — the caps,
 * the evidence check, the tier-1 measurements. The second points the platform at
 * a stub model that answers with criteria, marks a real paper through the real
 * route, and looks at what a candidate actually ends up seeing.
 *
 * ## The assertion this file exists for
 *
 * A marking service is a language model, and a language model asked to quote the
 * candidate will sometimes produce a plausible sentence the candidate never
 * wrote. **A fabricated quotation is worse than no quotation, because it looks
 * exactly like proof.** So the evidence is checked against the real text before
 * it is stored, and the checks below prove that a paraphrase, an invention and
 * a too-short fragment are all refused while a genuine quotation survives
 * differences of case, spacing and punctuation.
 *
 * ## And the one that keeps the marks honest
 *
 * "Strict" has to mean accurate, not stingy. A rubric that subtracts a band from
 * everybody is as uninformative as one that flatters and worse for the learner.
 * So what is checked is that the caps fire for the RIGHT reason: the weakest
 * criterion holds the whole down, and a piece well under the required length is
 * capped whatever its sentences look like.
 */
import http from 'node:http';
import { createRequire } from 'node:module';
import { DEMO_PASSWORD, ADMIN_PASSWORD } from './_demo.mjs';

const require = createRequire(import.meta.url);
const R = require('../server/rubric.js');
const BASE = process.env.BASE_URL || process.env.BASE || 'http://127.0.0.1:3000';

let pass = 0, fail = 0;
const ok = (c, name, detail) => {
  if (c) { pass++; console.log('✓ ' + name); return; }
  fail++; console.log('✗ ' + name + (detail === undefined ? '' : '  → ' + detail));
};
const head = t => console.log('\n\x1b[1m== ' + t + ' ==\x1b[0m');

/* The e-mail used throughout: long enough to clear Part D's 100-word floor, so
   that the length cap can be tested by its absence as well as its presence. */
const EMAIL = [
  'Dear Ms Tran,',
  'I am writing about the delivery that was due on Monday. The supplier called this morning',
  'to say the shipment has been held at customs and will not arrive before Thursday.',
  'I have moved the installation to Friday and told the site team, so nobody will travel',
  'for nothing. I have also asked the supplier for a discount on the next order, and they',
  'have agreed to reply by Wednesday. Please let me know if you would rather I cancelled',
  'the order instead. I am sorry for the change of plan and I will keep you informed.',
  'Kind regards, Linh'
].join(' ');

/* ------------------------------------------------------------------ *
 * A stub model that answers with criteria
 * ------------------------------------------------------------------ */
let reply = null;                    // what the stub says next
const seen = [];
const stub = http.createServer((req, res) => {
  const chunks = [];
  req.on('data', c => chunks.push(c));
  req.on('end', () => {
    seen.push({ url: req.url, body: Buffer.concat(chunks).toString('utf8') });
    res.writeHead(200, { 'content-type': 'application/json' });
    if (/\/audio\/transcriptions/.test(req.url || '')) return res.end(JSON.stringify({ text: 'nothing' }));
    res.end(JSON.stringify({ content: [{ type: 'text', text: reply }] }));
  });
});
await new Promise(r => stub.listen(0, '127.0.0.1', r));
const STUB = 'http://127.0.0.1:' + stub.address().port;

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
    jar,
    async req(method, path, body) {
      if (method !== 'GET' && !jar.has('prep_csrf') && !jar.has('admin_csrf')) {
        await this.req('GET', '/prep/landing/');
      }
      const headers = { Accept: 'application/json' };
      if (jar.size) headers.Cookie = [...jar].map(([k, v]) => k + '=' + encodeURIComponent(v)).join('; ');
      if (method !== 'GET') {
        const t = jar.get('prep_csrf') || jar.get('admin_csrf');
        if (t) headers['X-CSRF-Token'] = t;
      }
      let payload;
      if (body !== undefined) { headers['Content-Type'] = 'application/json'; payload = JSON.stringify(body); }
      const r = await fetch(BASE + path, { method, headers, body: payload, redirect: 'manual' });
      eat(r);
      const ct = r.headers.get('content-type') || '';
      return { status: r.status, data: ct.includes('json') ? await r.json().catch(() => null) : null };
    }
  };
}

const admin = client();
const student = client();
const { q } = await import('../server/db.js').then(m => m.default || m);

try {
  head('The weakest criterion holds the whole thing down');

  const wide = R.combine('D', {
    task: { score: 8 }, register: { score: 8 }, organisation: { score: 7 }, accuracy: { score: 4 }
  }, { answer: EMAIL });
  ok(wide.beforeCaps === 7, 'Four criteria averaging 6.75 round to 7', String(wide.beforeCaps));
  ok(wide.score === 4.5, 'But the mark is 4.5 — half a band above the weakest', String(wide.score));
  ok(wide.caps.some(c => c.rule === 'weakest-criterion'), 'And the reason is named');
  ok(/Grammar and spelling/.test(wide.caps[0].en), 'Naming which criterion did it', wide.caps[0].en);

  const tight = R.combine('D', {
    task: { score: 7 }, register: { score: 7 }, organisation: { score: 7.5 }, accuracy: { score: 6.5 }
  }, { answer: EMAIL });
  ok(tight.score === tight.beforeCaps,
    'An even profile is not capped — the rule is about a real weak point, not a tax on everyone',
    tight.score + ' vs ' + tight.beforeCaps);
  ok(tight.caps.length === 0, 'And nothing is claimed to have fired');

  /* A single-criterion part cannot be more than half a band above itself. */
  const single = R.combine('H', {}, { answer: 'some words here', fallbackScore: 8 });
  ok(single.score === 8, 'A part with one dimension is left alone', String(single.score));
  ok(single.criteria.length === 0, 'And claims no criteria it does not have');

  head('Length is a gate, and it is measured rather than judged');

  const short = R.combine('D', {
    task: { score: 9 }, register: { score: 9 }, organisation: { score: 9 }, accuracy: { score: 9 }
  }, { answer: 'Thanks. See you Thursday. Linh' });
  ok(short.score === 4, 'Nine across the board, 5 words against 100 required, capped at 4', String(short.score));
  ok(short.caps.some(c => c.rule === 'under-length'), 'For the stated reason');
  ok(/5 words against a required 100/.test(short.caps.find(c => c.rule === 'under-length').en),
    'Which quotes the actual count', short.caps.find(c => c.rule === 'under-length').en);

  const enough = R.combine('D', {
    task: { score: 7 }, register: { score: 7 }, organisation: { score: 7 }, accuracy: { score: 7 }
  }, { answer: EMAIL });
  ok(!enough.caps.some(c => c.rule === 'under-length'),
    'A full-length answer is not capped', String(R.words(EMAIL).length) + ' words');

  /* No word is worth six marks.
   *
   * This used to assert that 60 words — exactly 60% of the floor — was not
   * capped at all, and it passed. Read together with the line above it, that
   * was the bug written down as a requirement: 59 words capped at 4, 60 words
   * uncapped at 8. One word, four marks, and then nothing between there and
   * the full 100 either, so three fifths of the task could score full marks.
   *
   * What the check was really after is that the boundary is not a cliff, and
   * that is what it tests now: neighbouring lengths score within half a mark of
   * each other, all the way up. */
  const eights = { task: { score: 8 }, register: { score: 8 }, organisation: { score: 8 }, accuracy: { score: 8 } };
  const scoreAt = n => R.combine('D', eights,
    { answer: Array.from({ length: n }, (_, i) => 'word' + i).join(' ') }).score;
  const jumps = [];
  for (let n = 55; n < 110; n++) {
    const step = Math.abs(scoreAt(n + 1) - scoreAt(n));
    if (step > 0.5) jumps.push(n + '→' + (n + 1) + ' (' + scoreAt(n) + '→' + scoreAt(n + 1) + ')');
  }
  ok(jumps.length === 0, 'no single word is worth more than half a mark anywhere along the length rule',
    jumps.join(', '));

  head('A quotation is not believed until it is found');

  ok(R.verifyEvidence('held at customs and will not arrive before Thursday', EMAIL) !== null,
    'A genuine quotation survives');
  ok(R.verifyEvidence('HELD AT CUSTOMS, and will not arrive  before Thursday!', EMAIL) !== null,
    'Case, spacing and punctuation may differ — a marker retypes');
  ok(R.verifyEvidence('I look forward to hearing from you at your earliest convenience', EMAIL) === null,
    'An invented sentence is refused, however plausible it reads');
  ok(R.verifyEvidence('the delivery has been delayed by customs', EMAIL) === null,
    'And so is a paraphrase of something that IS there — evidence means the words');
  ok(R.verifyEvidence('the supplier', EMAIL) === null,
    'Two words are not evidence: a short run matches almost anything');
  ok(R.verifyEvidence('', EMAIL) === null, 'Nothing is not evidence');
  ok(R.verifyEvidence('anything at all', '') === null, 'And nothing to check against is not a match');

  const withFake = R.combine('D', {
    task: { score: 7, evidence: 'I have moved the installation to Friday' },
    register: { score: 7, evidence: 'Yours faithfully, a valued colleague' },
    organisation: { score: 7 }, accuracy: { score: 7 }
  }, { answer: EMAIL });
  ok(withFake.criteria[0].evidence !== null, 'The real quotation is kept');
  ok(withFake.criteria[1].evidence === null, 'The invented one is dropped');
  ok(withFake.criteria[1].evidenceRejected === true,
    'And the fact that it was dropped is recorded rather than hidden');
  ok(withFake.criteria[2].evidenceRejected === false,
    'A criterion that offered no quotation is not marked as having had one rejected');

  head('Missing is not zero');

  const partial = R.combine('D', { task: { score: 8 }, accuracy: { score: 8 } }, { answer: EMAIL });
  ok(partial.criteria.length === 2 && partial.score === 8,
    'Two of four criteria produce a mark from two, not two eighths',
    partial.criteria.length + ' → ' + partial.score);
  const bogus = R.combine('D', { task: { score: 47 }, accuracy: { score: -3 }, register: { score: 6 } },
    { answer: EMAIL });
  ok(bogus.criteria.length === 1, 'Out-of-range criterion scores are dropped', String(bogus.criteria.length));
  ok(R.combine('D', {}, { answer: EMAIL }) === null,
    'Nothing usable at all returns null — which means "not marked", never zero');

  head('Measured, and honest about what it measured');

  const d = R.diagnostics(EMAIL, { linking: ['and', 'so', 'also', 'instead', 'if'] });
  ok(d.words > 100 && d.words < 140, 'Words counted', String(d.words));
  ok(d.sentences >= 6, 'Sentences counted', String(d.sentences));
  ok(d.meanSentenceWords > 5, 'Mean sentence length', String(d.meanSentenceWords));
  ok(d.linkingPer100 > 0, 'Linking words counted against the list it was given', String(d.linkingPer100));
  ok(d.typeTokenRatio !== null && d.typeTokenRatio < 1, 'Word variety reported', String(d.typeTokenRatio));

  const tiny = R.diagnostics('Short note. Very short.', { linking: [] });
  ok(tiny.typeTokenRatio === null,
    'Under 30 words the variety ratio is WITHHELD, not reported as a flattering 0.95',
    String(tiny.typeTokenRatio));

  const repetitive = R.diagnostics(
    'The report is late. The report was due. I sent the report. The report matters. ' +
    'Please read the report and tell me what you think of the report today.', { linking: [] });
  ok(repetitive.mostRepeatedWord === 'report',
    'The word being leaned on is found', String(repetitive.mostRepeatedWord));
  const stopwordy = R.diagnostics(
    'It is the one. It is the other. It is the same. It is the thing.', { linking: [] });
  ok(stopwordy.mostRepeatedWord !== 'the' && stopwordy.mostRepeatedWord !== 'is',
    'And it is never "the" — function words are excluded or the answer is always the same',
    String(stopwordy.mostRepeatedWord));

  head('Reading criteria out of a model reply');

  const ai = await import('../server/ai-marking.js').then(m => m.default || m);
  const v = ai.readVerdict('{"score":7,"note":"Cover the third point.","criteria":'
    + '{"task":{"score":6,"evidence":"I have moved the installation","comment":"No date"},'
    + '"accuracy":{"score":8}}}');
  ok(v && v.criteria && v.criteria.task.score === 6, 'Criteria come through');
  ok(v.criteria.task.evidence === 'I have moved the installation', 'With their evidence');
  ok(v.criteria.accuracy.evidence === null, 'And an absent quotation is null, not the string "undefined"');
  const old = ai.readVerdict('{"score":5,"note":"Too short."}');
  ok(old && old.criteria === null,
    'A model answering in the old two-field shape still produces a usable mark');
  const junk = ai.readVerdict('{"score":6,"note":"x","criteria":{"task":{"score":99},"register":"nonsense"}}');
  ok(junk.criteria === null, 'Criteria that are all unusable come back as none, not as noise');

  const prompt = ai.userPrompt({ part: 'D', level: 'B2', prompt: 'Write to your manager.', answer: EMAIL });
  for (const key of ['task', 'register', 'organisation', 'accuracy']) {
    ok(prompt.includes('"' + key + '"'), 'The prompt names the "' + key + '" criterion');
  }
  /* The instruction that makes the evidence worth checking lives in the system
     prompt, so it is asserted there rather than inferred. */
  ok(/COPIED, NOT WRITTEN/.test(ai.SYSTEM), 'The marker is told evidence must be copied, not composed');
  ok(/thrown\s*\n?\s*away if it is not found/.test(ai.SYSTEM),
    'And told that an invented quotation simply loses the evidence');
  ok(/at least three words/.test(ai.SYSTEM), 'With the three-word floor stated');
  ok(prompt.includes('at least 100 words'), 'And states the length floor');
  ok(/do not\s+also deduct for shortness/i.test(prompt),
    'While telling the marker not to deduct for it twice — the gate is enforced without them');
  /* Part H used to have no criteria and this asserted the prompt asked for
     none — true, and the reason 10 of the 15 Speaking items were marked by an
     unexplained headline number with nothing stored to show a candidate why.
     It has two now, and the rule worth pinning is the general one: a part is
     asked for criteria exactly when the rubric defines them. */
  ok(ai.userPrompt({ part: 'H', prompt: 'x', answer: 'y' }).includes('Score these criteria'),
    'Part H is asked for the criteria it now has');
  ok(!ai.userPrompt({ part: 'Z', prompt: 'x', answer: 'y' }).includes('Score these criteria'),
    'and a part with no criteria is still asked for none');

  /* ------------------------------------------------------------------ *
   * Through the real route
   * ------------------------------------------------------------------ */
  head('A real paper, marked by a model that answers with criteria');

  ok((await admin.req('POST', '/api/admin/login', { username: 'admin', password: ADMIN_PASSWORD })).status === 200,
    'Administrator sign-in');
  ok((await student.req('POST', '/api/auth/login', { username: 'student', password: DEMO_PASSWORD })).status === 200,
    'Student sign-in');

  const KEY = 'sk-ant-rubrictest-1122334455667788';
  let r = await admin.req('PUT', '/api/admin/ai', { baseUrl: STUB, model: 'stub-model', apiKey: KEY });
  ok(r.status === 200 && r.data.ai.hasKey, 'The stub is installed as the marker', JSON.stringify(r.data));

  const cur = await student.req('GET', '/api/attempts/current');
  if (cur.data && cur.data.attempt) await student.req('POST', '/api/attempts/' + cur.data.attempt.id + '/submit');

  r = await student.req('POST', '/api/attempts', { testId: 'vpet-b1-01' });
  ok(r.status === 201, 'A sitting opens', 'status ' + r.status);
  const att = r.data.attempt;

  /* Only Part D, and answered properly, so the mark that comes back is about
     the criteria rather than about the length gate.

     Part B is answered too, with its OWN passage pasted straight back — the
     thing that was reported from the product. It is marked further down, after
     the Part D assertions have had the stub to themselves. */
  let dItems = [], bItem = null;
  for (const p of att.parts) {
    if (p.part === 'B' && p.items.length) {
      await student.req('POST', '/api/attempts/' + att.id + '/parts/' + p.sectionId + '/start');
      const it = p.items[0];
      /* What a candidate can actually select on screen is the passage, not the
         instruction line above it. Taking only that is the harder case for the
         rule and the honest one to test. */
      const passage = String(it.prompt || '').split(/\n{2,}/).slice(1).join('\n\n').trim()
        || String(it.prompt || '');
      bItem = { questionId: it.questionId, passage };
      await student.req('PATCH', '/api/attempts/' + att.id + '/answers',
        { answers: [{ questionId: it.questionId, answer: passage }] });
    }
    if (p.part !== 'D') continue;
    await student.req('POST', '/api/attempts/' + att.id + '/parts/' + p.sectionId + '/start');
    dItems = p.items.map(it => it.questionId);
    await student.req('PATCH', '/api/attempts/' + att.id + '/answers',
      { answers: dItems.map(id => ({ questionId: id, answer: EMAIL })) });
  }
  ok(dItems.length > 0, 'Part D has items to answer', String(dItems.length));
  ok(bItem && bItem.passage.split(/\s+/).length > 20,
    'and Part B has a passage long enough to paste back',
    bItem ? bItem.passage.split(/\s+/).length + ' words' : 'no Part B item');

  /* One weak criterion, so the cap has something to bite on, and one genuine
     quotation plus one invention, so both paths are exercised end to end. */
  reply = JSON.stringify({
    score: 8,
    note: 'Say what you want the reader to do.',
    criteria: {
      task: { score: 8, evidence: 'I have moved the installation to Friday', comment: 'Every point is covered' },
      register: { score: 8, evidence: 'Kind regards, Linh' },
      organisation: { score: 7.5 },
      accuracy: { score: 4, evidence: 'I look forward to your kind consideration', comment: 'Verb forms slip' }
    }
  });

  await student.req('POST', '/api/attempts/' + att.id + '/submit');
  r = await admin.req('POST', '/api/admin/attempts/' + att.id + '/mark', {});
  ok(r.status === 200 && r.data.marked > 0, 'The marking pass runs', JSON.stringify(r.data));

  const stored = await q.all(
    'SELECT criterion, score, evidence, comment, version, marked_by FROM rubric_scores WHERE attempt_id=? AND question_id=? ORDER BY criterion',
    att.id, dItems[0]);
  ok(stored.length === 4, 'Four criteria are stored for the item', String(stored.length));
  ok(stored.every(s => s.version === R.RUBRIC_VERSION),
    'Each carries the rubric version it was made under', stored[0] && stored[0].version);
  ok(stored.every(s => s.marked_by === 'ai'), 'And who made it');

  const acc = stored.find(s => s.criterion === 'accuracy');
  ok(acc && acc.score === 4, 'The weak criterion is stored as it was given', acc && String(acc.score));
  ok(acc && acc.evidence === null,
    'And its invented quotation did NOT reach the database', acc && String(acc.evidence));
  const task = stored.find(s => s.criterion === 'task');
  ok(task && task.evidence && /moved the installation/.test(task.evidence),
    'While the real one did', task && task.evidence);

  const earned = await q.val('SELECT earned FROM attempt_answers WHERE attempt_id=? AND question_id=?',
    att.id, dItems[0]);
  /* The model said 8. The criteria average 6.875, and accuracy at 4 caps it at
     4.5. The stored mark is a fraction of one item. */
  ok(Math.abs(earned - 0.45) < 1e-6,
    'The stored mark is the CAPPED one, not the number the model volunteered',
    'earned=' + earned + ' (expected 0.45)');

  const note = await q.val('SELECT mark_note FROM attempt_answers WHERE attempt_id=? AND question_id=?',
    att.id, dItems[0]);
  ok(/weakest|Held down/i.test(note || ''),
    'And the candidate is told a cap fired, rather than left to wonder', String(note).slice(0, 160));

  head('Marking again corrects the record instead of growing it');

  reply = JSON.stringify({
    score: 6, note: 'Better.',
    criteria: {
      task: { score: 7 }, register: { score: 7 }, organisation: { score: 7 }, accuracy: { score: 6.5 }
    }
  });
  await q.run('UPDATE attempt_answers SET earned=NULL, max_score=NULL WHERE attempt_id=? AND question_id=?',
    att.id, dItems[0]);
  r = await admin.req('POST', '/api/admin/attempts/' + att.id + '/mark', {});
  const again = await q.all('SELECT criterion, score FROM rubric_scores WHERE attempt_id=? AND question_id=?',
    att.id, dItems[0]);
  ok(again.length === 4, 'Still four rows, not eight', String(again.length));
  ok(again.find(s => s.criterion === 'accuracy').score === 6.5,
    'And the corrected score replaced the old one', String(again.find(s => s.criterion === 'accuracy').score));

  /* ------------------------------------------------------------------ *
   * The reported bug, end to end
   * ------------------------------------------------------------------ *
   *
   * Everything above about copying is arithmetic on a fixture. This is the
   * actual reported failure on the actual paper: the seeded Part B passage,
   * pasted back through the real answer endpoint, marked by the real pass,
   * read back out of the real column a report is built from.
   *
   * It is here rather than in the fixture section because the fault was never
   * only in rubric.js — the rule cannot fire unless the marking pass hands it
   * the passage, and the fixture tests would all still pass with that wiring
   * missing. This is the check that would go red.
   */
  head('The reported bug: the Part B passage, pasted back');

  if (!bItem) {
    ok(false, 'A Part B item was found on the paper');
  } else {
    /* Ten on every criterion, exactly as the product reported it. The marker is
       not wrong here — nothing was lost, the grammar is the passage's own, the
       order is the passage's order — which is precisely why the rule cannot be
       left to the marker. */
    reply = JSON.stringify({
      score: 10, note: 'Everything is here.',
      criteria: {
        meaning: { score: 10 }, accuracy: { score: 10 }, organisation: { score: 10 }
      }
    });
    await q.run('UPDATE attempt_answers SET earned=NULL, max_score=NULL, mark_note=NULL '
      + 'WHERE attempt_id=? AND question_id=?', att.id, bItem.questionId);
    r = await admin.req('POST', '/api/admin/attempts/' + att.id + '/mark', {});
    ok(r.status === 200, 'The marking pass runs over it', JSON.stringify(r.data));

    const bStored = await q.all(
      'SELECT criterion, score FROM rubric_scores WHERE attempt_id=? AND question_id=? ORDER BY criterion',
      att.id, bItem.questionId);
    ok(bStored.length === 3 && bStored.every(s => s.score === 10),
      'The marker still scores all three criteria at ten, and that is recorded',
      JSON.stringify(bStored.map(s => s.criterion + '=' + s.score)));

    const bEarned = await q.val('SELECT earned FROM attempt_answers WHERE attempt_id=? AND question_id=?',
      att.id, bItem.questionId);
    ok(Math.abs(bEarned - R.COPY_CAP / 10) < 1e-6,
      'but the item is worth ' + R.COPY_CAP + '/10, not 10/10 — which is the bug, fixed',
      'earned=' + bEarned + ' (expected ' + (R.COPY_CAP / 10) + ')');

    const bNote = await q.val('SELECT mark_note FROM attempt_answers WHERE attempt_id=? AND question_id=?',
      att.id, bItem.questionId);
    ok(/word for word/i.test(bNote || ''),
      'and the candidate is told what was measured and why it capped the mark',
      String(bNote).slice(0, 200));

    /* And told it in a language they have.
       Every cap in rubric.js has carried a Vietnamese sentence since it was
       written, and not one of them had ever reached a screen: the note is one
       English string and it was the only channel. That is worst for this cap,
       which tells somebody their answer was copied — an accusation nobody can
       read is punishment with the teaching removed. */
    const bCaps = JSON.parse(await q.val(
      'SELECT mark_caps FROM attempt_answers WHERE attempt_id=? AND question_id=?',
      att.id, bItem.questionId) || 'null');
    ok(Array.isArray(bCaps) && bCaps.some(c => c.rule === 'copied-source'),
      'The cap is stored beside the note as data, not only as English prose',
      JSON.stringify(bCaps && bCaps.map(c => c.rule)));
    ok(bCaps && bCaps.every(c => c.en && c.vi),
      'with both languages on every one of them');
    ok(bCaps && /nguyên văn/.test(bCaps.find(c => c.rule === 'copied-source').vi),
      'and the Vietnamese really is Vietnamese',
      bCaps && (bCaps.find(c => c.rule === 'copied-source') || {}).vi);

    /* And it survives the trip to the browser. Checked HERE, while a cap
       actually exists on this item, rather than in the report section further
       down: by then this item has been re-marked with an honest answer and
       correctly has no caps at all, so an assertion there would either be
       vacuous or wrong. */
    const seen = await student.req('GET', '/api/attempts/' + att.id + '/result?detailed=1');
    const bPart = seen.status === 200 && (seen.data.parts || []).find(p => p.part === 'B');
    if (!bPart) {
      ok(true, 'The detailed report is gated by plan on this account — checked in the database above');
    } else {
      const shown = bPart.items.find(i => i.questionId === bItem.questionId);
      const shownCap = ((shown && shown.caps) || []).find(c => c.rule === 'copied-source');
      ok(!!shownCap, 'The cap reaches the browser as data, not buried in the English note',
        JSON.stringify((shown && shown.caps) || []));
      ok(shownCap && shownCap.en && shownCap.vi,
        'with both languages, so the page can render the reader\'s');
    }

    /* The other half of the same wiring: a real answer to the same item, marked
       by the same stub giving the same tens, is NOT capped. Without this the
       check above would pass just as well if the rule capped every Part B. */
    const own = 'The library started a small workshop where people can bring things that are '
      + 'broken. It happens twice a month and helpers show visitors how to fix them rather '
      + 'than doing it for them, so they learn something and less gets thrown away.';
    /* Written straight to the column rather than through the answers endpoint:
       the paper is submitted, and the endpoint refuses to change a submitted
       answer — correctly, and the first half above already went through it. */
    await q.run('UPDATE attempt_answers SET answer=?, earned=NULL, max_score=NULL, mark_note=NULL '
      + 'WHERE attempt_id=? AND question_id=?', own, att.id, bItem.questionId);
    await admin.req('POST', '/api/admin/attempts/' + att.id + '/mark', {});
    const ownEarned = await q.val('SELECT earned FROM attempt_answers WHERE attempt_id=? AND question_id=?',
      att.id, bItem.questionId);
    ok(Math.abs(ownEarned - 1) < 1e-6,
      'while an answer in the candidate\'s own words keeps all ten',
      'earned=' + ownEarned);
  }

  head('What the candidate is actually shown');

  r = await student.req('GET', '/api/attempts/' + att.id + '/result?detailed=1');
  const partD = r.status === 200 && (r.data.parts || []).find(p => p.part === 'D');
  if (!partD) {
    /* The per-item breakdown is a paid feature; on a plan without it the report
       carries no parts and there is nothing to look at. Say so rather than
       failing, and check the shape through the database instead. */
    ok(true, 'The detailed report is gated by plan on this account — checked in the database above');
  } else {
    const item = partD.items.find(i => i.questionId === dItems[0]);
    ok(item && item.criteria && item.criteria.length === 4,
      'The report carries the criteria', item ? String((item.criteria || []).length) : 'no item');
    ok(item.criteria.every(c => c.en && c.vi),
      'Each named in both languages, so the page needs no second table');
    ok(item.diagnostics && item.diagnostics.words > 100,
      'And the measured facts about the answer', JSON.stringify(item.diagnostics));
    ok(item.requiredWords === 100, 'With the length the task asked for', String(item.requiredWords));
    ok(!JSON.stringify(r.data).includes('I look forward to your kind consideration'),
      'The invented quotation is nowhere in what is sent to the browser');
    /* Always a list, even when nothing capped this item — the page iterates it,
       and `undefined` there is a blank screen rather than a missing sentence.
       That a cap really arrives with both languages is checked on the Part B
       item above, where one exists. */
    ok(Array.isArray(item.caps), 'The item carries its caps as a list', typeof item.caps);
  }

} catch (e) {
  fail++;
  console.log('\n✗ The suite threw: ' + (e && e.stack ? e.stack : e));
} finally {
  stub.close();
}


head('Nothing handed in is nothing, not four out of ten');

/* Reported from the product: a blank answer came back as 4/10.
   The under-length rule caps a short answer at UNDER_LENGTH_CAP and its own
   wording says "well under the length is not an attempt at the task" — and
   then awarded 4 for it. A cap was standing where a floor of zero belongs. */
{
  const blank = R.combine('D', null, { answer: '', fallbackScore: 8 });
  ok(blank.score === 0, 'A blank e-mail with a generous model score is 0, not 4',
    JSON.stringify(blank.score));
  ok(blank.caps.some(c => c.rule === 'no-answer'),
    'And it says why, in its own words rather than the length rule\'s',
    JSON.stringify(blank.caps.map(c => c.rule)));

  ok(R.combine('D', null, { answer: '   \n\t  ', fallbackScore: 10 }).score === 0,
    'Whitespace is not an answer either');

  /* Every part, not just the ones with a word floor. No words is no words
     whether or not a minimum was ever set for that part. */
  for (const part of ['B', 'D', 'G', 'H', 'I', 'J']) {
    ok(R.combine(part, null, { answer: '', fallbackScore: 9 }).score === 0,
      'Part ' + part + ': a blank scores zero even with no word floor to fail');
  }

  /* Full criteria, all excellent, but nothing written: still zero. A model
     that hallucinates criteria for an empty answer must not be able to pay
     out on them. */
  const invented = R.combine('D',
    { task: { score: 10 }, tone: { score: 10 }, accuracy: { score: 10 }, range: { score: 10 } },
    { answer: '' });
  ok(invented.score === 0,
    'Even ten out of ten on every criterion cannot mark an empty answer',
    JSON.stringify(invented.score));

  /* And the rule it replaced still works: a REAL but short attempt is capped,
     not zeroed. The difference between "did not try" and "tried briefly" is
     the whole point of having two rules. */
  const short = R.combine('D', null, { answer: 'word '.repeat(20), fallbackScore: 8 });
  ok(short.score === 4, 'A genuine 20-word attempt is still capped at 4, not zeroed',
    JSON.stringify(short.score));
  ok(short.caps.some(c => c.rule === 'under-length'),
    'And that one is the length rule, which is a different thing',
    JSON.stringify(short.caps.map(c => c.rule)));
  ok(R.combine('D', null, { answer: 'word '.repeat(120), fallbackScore: 8 }).score === 8,
    'A full-length answer keeps its mark');

  /* ------------------------------------------------------------------ *
   * Pasting the passage back is not a reconstruction
   * ------------------------------------------------------------------ *
   *
   * Reported from the product, with a screenshot: on Part B the candidate
   * selected the passage during the 30-second reading window, pasted it into
   * the answer box, and got 10 on all three criteria. Every one of those tens
   * was defensible on its own terms — no meaning was lost, the grammar was the
   * passage's own, the ideas came in the passage's order. Three right answers
   * to three wrong questions.
   *
   * A second screenshot of the same trick showed 1/10. That is the half that
   * makes it a rule rather than a prompt change: judgement about the same text
   * twice is two judgements, and a mark that depends on which run you got is
   * not a mark. So the overlap is measured, and these checks are about the
   * measurement being right in BOTH directions — a copy is caught, and an
   * honest reconstruction, which legitimately reuses the passage's vocabulary,
   * is not.
   */
  head('Pasting the passage back is not a reconstruction');

  const PASSAGE = 'The city council has agreed to extend the bus route into the new '
    + 'industrial park from the first of March. Drivers will run every twenty minutes '
    + 'during the morning and evening peaks, and once an hour at other times. The council '
    + 'expects about four hundred workers to use the service in its first year, and says '
    + 'it will review the timetable in September.';
  /* Full marks on every criterion, exactly as the product reported them. If the
     cap only fired on answers a marker had already marked down, it would be
     doing nothing: the whole point is that it holds when the marker is happy. */
  const FULL_B = { meaning: { score: 10 }, accuracy: { score: 10 }, organisation: { score: 10 } };
  const markB = answer => R.combine('B', FULL_B, { answer, stimulus: PASSAGE });

  const pasted = markB(PASSAGE);
  ok(pasted.score === R.COPY_CAP,
    'The exact passage, pasted back, scores ' + R.COPY_CAP + ' — not 10',
    JSON.stringify(pasted.score));
  ok(pasted.caps.some(c => c.rule === 'copied-source'),
    'And the candidate is told which rule did it');
  ok(/word for word/.test((pasted.caps.find(c => c.rule === 'copied-source') || {}).en || ''),
    'in words that say what was measured, not just that a cap fired');
  ok(/\d+ từ/.test((pasted.caps.find(c => c.rule === 'copied-source') || {}).vi || ''),
    'and in Vietnamese too, with the copied run counted');

  /* Trivial edits are how somebody gets round a rule they have been told about.
     Five-word runs survive a changed first word and a changed full stop. */
  const tweaked = PASSAGE.replace('The city council', 'City council').replace('September.', 'September!');
  ok(markB(tweaked).score === R.COPY_CAP,
    'Changing the first words and the last punctuation does not undo it',
    JSON.stringify(markB(tweaked).score));

  /* The other direction, and the one that matters more: this rule must not
     punish somebody who did the task. A reconstruction of a passage read
     moments ago REUSES its nouns — that is not copying, that is remembering. */
  const honest = 'From March the first, the council will run buses to the new industrial '
    + 'park. They come every 20 minutes at busy times in the morning and evening, and '
    + 'hourly the rest of the day. Around 400 workers are expected to use it in year one, '
    + 'and the timetable will be looked at again in September.';
  ok(markB(honest).score === 10,
    'A real reconstruction in the candidate\'s own words is untouched',
    JSON.stringify(markB(honest).score) + ' ' + JSON.stringify(markB(honest).caps.map(c => c.rule)));
  ok(R.copiedFrom(honest, PASSAGE).fraction < R.COPY_FREE,
    'because its overlap is measured below the free threshold',
    (R.copiedFrom(honest, PASSAGE).fraction * 100).toFixed(0) + '%');

  /* A faithful retelling that quotes one clause verbatim is normal, and stays
     normal. 14 words in a row from a 60-word passage is a candidate who
     remembered a sentence, not one who pasted a passage. */
  const quoting = 'The council has agreed to extend the bus route into the new industrial '
    + 'park from March. Buses run every twenty minutes at peak and hourly otherwise. They '
    + 'think 400 workers will use it and will review it later in the year.';
  ok(markB(quoting).score === 10,
    'and so is one remembered clause inside an answer that is otherwise its own',
    JSON.stringify(markB(quoting).score));

  /* Continuous, like the length gate, and for the same reason: a step would
     make one word either side of a threshold worth seven marks. */
  const mostly = 'The city council has agreed to extend the bus route into the new '
    + 'industrial park from the first of March. Drivers will run every twenty minutes '
    + 'during the morning and evening peaks, and once an hour at other times. About 400 '
    + 'workers may use it and it gets reviewed in September.';
  const part = markB(mostly);
  ok(part.score > R.COPY_CAP && part.score < 10,
    'Half copied lands between the floor and no cap at all, not on one of them',
    JSON.stringify(part.score));
  let last = -1, monotone = true;
  for (let f = 0; f <= 1.0001; f += 0.05) {
    const c = R.copyCeiling(f);
    const v = c === null ? 10 : c;
    if (last >= 0 && v > last + 1e-9) monotone = false;
    last = v;
  }
  ok(monotone, 'and more copying never raises the ceiling');

  /* Which parts this applies to is a judgement, and getting it wrong is a
     false accusation. Part G tells candidates to answer "using a short
     phrase" — and the right phrase is usually the passage's own words. Part H
     IS repetition. Part J's story was only ever heard, so there was nothing on
     screen to copy and close recall is the skill. */
  for (const p of ['G', 'H', 'J', 'I']) {
    const r = R.combine(p, null, { answer: PASSAGE, stimulus: PASSAGE, fallbackScore: 10 });
    ok(r.score === 10 && !r.caps.some(c => c.rule === 'copied-source'),
      'Part ' + p + ' is not copy-checked — its answer is meant to echo the source',
      JSON.stringify(r.score));
  }
  ok(R.COPY_PARTS.has('B') && R.COPY_PARTS.has('D'),
    'while B and D, whose stimulus is text on the screen, are');

  /* An email that pastes the situation back has not written an email. */
  const FULL_D = { task: { score: 10 }, register: { score: 10 }, organisation: { score: 10 }, accuracy: { score: 10 } };
  ok(R.combine('D', FULL_D, { answer: PASSAGE, stimulus: PASSAGE }).score === R.COPY_CAP,
    'Part D: handing the prompt back is capped the same way');

  /* Nothing to compare against must never become an accusation. Older marking
     paths, and any caller that does not know about `stimulus`, pass none. */
  ok(R.combine('B', FULL_B, { answer: PASSAGE }).score === 10,
    'With no stimulus to compare against, nothing is capped');
  ok(R.copiedFrom('short answer here', PASSAGE) === null,
    'and an answer too short to measure is not measured');
  ok(R.copiedFrom(PASSAGE, '') === null,
    'nor is one with no source to measure it against');

  /* The floor still wins: a copy is capped, a blank is zero, and the two are
     different findings about different papers. */
  ok(R.combine('B', FULL_B, { answer: '', stimulus: PASSAGE }).score === 0,
    'A blank is still zero, not the copy cap');
  ok(R.COPY_CAP < R.UNDER_LENGTH_CAP,
    'and a copy is worth less than a short genuine attempt, which is the point',
    R.COPY_CAP + ' < ' + R.UNDER_LENGTH_CAP);

  /* ------------------------------------------------------------------ *
   * The written standard says what the code does
   * ------------------------------------------------------------------ *
   *
   * docs/CHAM-DIEM-CHUAN.md is the document somebody reaches for when a mark
   * looks wrong — an administrator explaining a score to a candidate, or a
   * reader working out whether the platform is doing what it claims. A marking
   * standard that has drifted from the marker is worse than none, because it
   * is consulted with confidence and answers wrongly.
   *
   * So the numbers are read back out of the file. This does not check that the
   * PROSE is right — nothing can — but it catches the failure that actually
   * happens: a constant is tuned in rubric.js and the table in the document
   * still shows the old one.
   */
  head('The written standard still describes the code');

  const fs = await import('node:fs');
  const path = await import('node:path');
  const url = await import('node:url');
  const DOC = path.join(path.dirname(url.fileURLToPath(import.meta.url)), '..',
    'docs', 'CHAM-DIEM-CHUAN.md');
  const doc = fs.existsSync(DOC) ? fs.readFileSync(DOC, 'utf8') : '';
  ok(doc.length > 2000, 'docs/CHAM-DIEM-CHUAN.md exists and is not a stub', doc.length + ' bytes');

  ok(doc.includes(R.RUBRIC_VERSION),
    'It names the rubric version in force — a mark stores this, so a reader can '
    + 'tell whether the document applies to the mark in front of them',
    R.RUBRIC_VERSION);

  /* The keys are what is stored in rubric_scores and what the model is asked
     for. A renamed key that the document still calls by its old name sends
     somebody looking for a column that is not there. */
  const missingKeys = [];
  for (const [part, defs] of Object.entries(R.CRITERIA)) {
    for (const d of defs) if (!doc.includes('`' + d.key + '`')) missingKeys.push(part + '.' + d.key);
  }
  ok(missingKeys.length === 0, 'and every criterion key the code scores',
    missingKeys.join(', '));

  /* Written the way the document writes numbers: Vietnamese decimals use a
     comma, so 0.35 is "0,35". Both spellings are accepted rather than the
     document being forced into English punctuation to suit a test. */
  const says = n => {
    const s = String(n);
    return doc.includes(s) || doc.includes(s.replace('.', ','));
  };
  const constants = [
    ['the weakest-link headroom', R.WEAKEST_LINK_HEADROOM],
    ['the length floor for Part D', R.MIN_WORDS.D],
    ['the length cap', R.UNDER_LENGTH_CAP],
    ['the fraction of the floor the hard cap starts at', R.MIN_WORDS.D * R.UNDER_LENGTH_FRACTION],
    ['the copy-free threshold', R.COPY_FREE],
    ['the full-copy threshold', R.COPY_TOTAL],
    ['the copy cap', R.COPY_CAP],
    ['the shortest answer that is measured for copying', R.COPY_MIN_WORDS],
    ['the run length compared', R.COPY_SHINGLE],
    ['the evidence floor', R.MIN_EVIDENCE_WORDS]
  ];
  const stale = constants.filter(([, v]) => !says(v)).map(([n]) => n);
  ok(stale.length === 0, 'and every constant a reader would check a mark against',
    stale.join('; '));

  /* Six rungs on the scale, and the document has to carry all six or a marker
     reading it is anchoring on a different ladder from the one in the prompt. */
  const missingBands = R.BANDS.filter(b => !doc.includes('**' + b.at + '**')).map(b => b.at);
  ok(missingBands.length === 0, 'and all six rungs of the ten-point scale',
    missingBands.join(', '));

  /* The parts the copy rule does and does not touch is the judgement most
     likely to be misread, and the one that would be a false accusation if the
     document said the wrong thing. */
  ok([...R.COPY_PARTS].every(p => doc.includes('**' + p + '** | ✅')),
    'and marks the parts the copy rule applies to as applying',
    [...R.COPY_PARTS].join(','));
  const notCopyChecked = Object.keys(R.CRITERIA).filter(p => !R.COPY_PARTS.has(p));
  ok(notCopyChecked.every(p => doc.includes('| ' + p + ' | ❌')),
    'and the ones it does not as not',
    notCopyChecked.join(','));

  /* ------------------------------------------------------------------ *
   * The rubric and the marking engine describe the SAME paper
   * ------------------------------------------------------------------ *
   *
   * Everything above checks that a rule works. This checks that the rules
   * cover the paper — that no item falls between the two marking paths, and
   * that what the model is asked for is what the combiner will accept.
   *
   * It is a structural check on the real seeded VPET paper rather than on a
   * fixture, because the failure it guards against is drift: someone adds a
   * part, or changes an item's type, or renames a criterion in one of the two
   * places it appears, and nothing else in the suite would notice. Part D once
   * carried a length rule in the prompt AND a contradictory one two lines
   * later; parts G and H were AI-marked with no criteria at all, so for 16 of
   * the 58 items the model's own headline number was the mark and nothing was
   * stored to show a candidate why.
   */
  head('The rubric and the engine describe the same paper');

  /* Its own import: the one above lives inside the stub-server try block. */
  const ai = await import('../server/ai-marking.js').then(m => m.default || m);
  const AI_TYPES = ['essay', 'speaking'];
  const parts = await q.all(
    `SELECT qs.part, s.skill, qs.type, COUNT(*) n
       FROM sections s
       JOIN section_items si ON si.section_id = s.id
       JOIN questions qs ON qs.id = si.question_id
      WHERE s.test_id = 'vpet-b1-01'
      GROUP BY qs.part, s.skill, qs.type
      ORDER BY qs.part`);

  ok(parts.length === 10, 'the paper still has ten lettered parts', parts.length);
  ok(parts.reduce((t, p) => t + p.n, 0) === 58, 'and 58 items',
    parts.reduce((t, p) => t + p.n, 0));

  /* One part, one marking path. A part split across both would mark half its
     items by answer key and leave the other half to a rubric. */
  const perPart = new Map();
  for (const p of parts) perPart.set(p.part, (perPart.get(p.part) || 0) + 1);
  ok([...perPart.values()].every(n => n === 1),
    'each part takes exactly one marking path, not a mix',
    [...perPart].filter(([, n]) => n > 1).map(([k]) => k).join(',') || 'ok');

  for (const p of parts) {
    if (!AI_TYPES.includes(p.type)) {
      /* The answer-key path. markItem() returns null for anything it cannot
         mark, and null means "not marked" — so an item of a machine-markable
         type with no key would sit pending for ever with nobody to mark it. */
      const keyless = await q.val(
        `SELECT COUNT(*) FROM section_items si
           JOIN sections s ON s.id = si.section_id
           JOIN questions qs ON qs.id = si.question_id
          WHERE s.test_id='vpet-b1-01' AND qs.part=?
            AND (qs.answer IS NULL OR TRIM(qs.answer)='')`, p.part);
      ok(keyless === 0, 'part ' + p.part + ' is answer-key marked and every item has a key',
        keyless + ' of ' + p.n + ' without one');
      continue;
    }

    /* The AI path: rubric.js, the prompt and combine() must name the same
       criteria. userPrompt() builds its list from criteriaFor(), so this is
       really checking that nothing has grown a second hard-coded copy. */
    const keys = R.CRITERIA[p.part] ? R.CRITERIA[p.part].map(c => c.key) : [];
    ok(keys.length > 0, 'part ' + p.part + ' is AI-marked and has criteria of its own',
      keys.join(',') || 'none — the headline number would be the mark');

    const prompt = ai.userPrompt({ part: p.part, level: 'B1', prompt: 'x', answer: 'y' });
    const missing = keys.filter(k => !prompt.includes(k));
    ok(missing.length === 0, 'and the marker is asked for every one of them',
      'missing from the prompt: ' + missing.join(','));

    /* combine() takes what the prompt asked for, and nothing it did not. */
    const all = {};
    keys.forEach(k => { all[k] = { score: 7 }; });
    const got = R.combine(p.part, all, { answer: 'word '.repeat(150) });
    ok(got && got.criteria.length === keys.length,
      'and combine() uses all ' + keys.length + ' of them for part ' + p.part,
      got ? got.criteria.length + ' used' : 'null');

    const bogus = R.combine(p.part, { madeUp: { score: 10 } }, { answer: 'word '.repeat(150) });
    ok(!bogus || bogus.criteria.length === 0,
      'a criterion nobody defined is ignored rather than scored',
      bogus ? JSON.stringify(bogus.criteria.map(c => c.key)) : 'null');
  }

  /* Every part the prompt builder knows about is a part the paper has, and the
     other way round. A rubric for a part that no longer exists is dead text
     that reads as current. */
  const onPaper = parts.map(p => p.part).sort();
  const withCriteria = Object.keys(R.CRITERIA).sort();
  const orphans = withCriteria.filter(k => !onPaper.includes(k));
  ok(orphans.length === 0, 'no criteria are defined for a part the paper does not have',
    orphans.join(','));

  /* The length rule has no cliff in it. This is the 40-word hole: the gate
     fired below 60 words on a 100-word requirement and nothing at all applied
     between 60 and 99, so a three-fifths answer could score full marks. */
  const w = n => Array.from({ length: n }, (_, i) => 'w' + i).join(' ');
  const nines = { task: { score: 9 }, register: { score: 9 }, organisation: { score: 9 }, accuracy: { score: 9 } };
  const at = n => R.combine('D', nines, { answer: w(n) }).score;
  ok(at(60) === 4, 'at three fifths of the required length the cap is still 4', at(60));
  ok(at(70) > at(60) && at(90) > at(70),
    'and it rises with the length instead of jumping', [at(60), at(70), at(80), at(90)].join(' → '));
  ok(at(80) < 9, 'a four-fifths answer cannot score as if the task were finished', at(80));
  ok(at(120) === 9, 'a full-length answer is not capped at all', at(120));

  /* And the arithmetic that turns a rubric score into a mark on the paper.
     combine() works out of ten; attempt_answers stores a fraction of one. */
  ok(R.combine('B', { meaning: { score: 10 }, accuracy: { score: 10 }, organisation: { score: 10 } },
    { answer: w(80) }).score === 10, 'ten out of ten on every criterion is ten');
  ok(R.combine('B', { meaning: { score: 0 }, accuracy: { score: 0 }, organisation: { score: 0 } },
    { answer: w(80) }).score === 0, 'and zero on every criterion is zero, not pending');

  /* ------------------------------------------------------------------ *
   * A band is a claim about a whole sitting
   * ------------------------------------------------------------------ *
   *
   * The mean of what a paper contains is arithmetic and is true of that paper.
   * A CEFR band is not: it is a statement about a complete VPET sitting, and it
   * was being read off whatever skills the paper happened to hold. A
   * reading-only paper scoring 10 came back `Bậc 5 / C1` — a full certificate
   * band off one section — while the comment beside the completeness check
   * promised "all four skills" and nothing checked for them.
   */
  head('A band needs the whole paper');

  const M = await import('../server/marking.js').then(m => m.default || m);
  const { nowISO } = await import('../server/db.js').then(m => m.default || m);
  const uid = await q.val('SELECT id FROM users LIMIT 1');

  async function bandFor(skills) {
    const now = nowISO();
    const r = await q.run(
      'INSERT INTO attempts (user_id,test_id,status,started_at,submitted_at,updated_at) VALUES (?,?,?,?,?,?)',
      uid, 'vpet-b1-01', 'submitted', now, now, now);
    const id = r.lastInsertRowid;
    for (const s of skills) {
      await q.run('INSERT INTO attempt_scores (attempt_id,skill,raw_earned,raw_max,scaled,method,pending,at)'
        + ' VALUES (?,?,8,10,8,?,0,?)', id, s, 'linear', now);
    }
    await q.run('INSERT INTO attempt_scores (attempt_id,skill,raw_earned,raw_max,scaled,method,pending,at)'
      + " VALUES (?,'overall',0,0,8,?,0,?)", id, 'mean_round_half', now);
    const res = await M.resultOf(id, { detailed: true });
    await q.run('DELETE FROM attempts WHERE id=?', id);
    return res;
  }

  const one = await bandFor(['reading']);
  ok(one.band === null, 'a reading-only paper scoring 8.0 gets no certificate band',
    JSON.stringify(one.band));
  ok(one.overall === 8, 'but it keeps its honest mean — the arithmetic is still true of that paper',
    String(one.overall));
  const three = await bandFor(['reading', 'writing', 'speaking']);
  ok(three.band === null, 'nor does a paper missing one of the four', JSON.stringify(three.band));
  /* 8.0 on `vpet-b1-01`, which is a Level 1 paper. This asserted `B2` and
     passed, which is the corrected bug written down as a requirement: Level 1
     measures A1 to B1+, so B2 was never a level it could report. 8.0 places at
     GSE 48.4, which the published alignment puts in B1. */
  const four = await bandFor(['listening', 'reading', 'writing', 'speaking']);
  ok(four.band && four.band.cefr === 'B1',
    'a complete Level 1 sitting at 8.0 is B1 — B2 is above what that paper measures',
    JSON.stringify(four.band));
  ok(four.vpetLevel === 1, 'and the result says which paper it was', String(four.vpetLevel));

  /* ------------------------------------------------------------------ *
   * Part H is measured, not judged
   * ------------------------------------------------------------------ *
   *
   * "Say this sentence back" is the one spoken part with a right answer, and
   * the answer is on the bank item. Ten of the paper's 26 model calls were
   * spent asking a model's opinion about a question that has one.
   */
  head('Part H is compared, not sent to a model');

  const RP = await import('../server/repeat.js').then(m => m.default || m);
  const say = RP.sentenceFor('vpet-h-03');
  ok(typeof say === 'string' && say.length > 10,
    'the bank carries the exact sentence a Part H item asks for', JSON.stringify(say));
  ok(RP.sentenceFor('vpet-g-01') === null,
    'and refuses to hand one back for a part that is not H — G answers are free-form');

  const rp = (heard, want) => {
    const v = RP.score(say, heard);
    ok(v.score === want, 'repeating "' + heard.slice(0, 34) + '…" scores ' + want,
      'got ' + v.score);
    return v;
  };
  const perfect = rp(say, 10);
  rp('I will call you back as soon as the meeting finishes', 10);   // punctuation only
  rp('Ill call you back as soon as the meeting finishes', 8);       // transcriber dropped the apostrophe
  rp('I will call you back', 4.5);                                  // half of it
  ok(RP.score(say, '').score === 0, 'and silence scores zero, not a cap');

  /* The two criteria are the ones rubric.js already names for H, so combine()
     treats this exactly as it treats a model's answer — including the caps. */
  ok(Object.keys(perfect.criteria).sort().join(',') === 'content,structure',
    'the criteria are the two the rubric already defines for Part H',
    Object.keys(perfect.criteria).join(','));
  const scrambled = RP.score('She works in the office next to ours.',
    'ours to next office the in works she');
  const capped = R.combine('H', scrambled.criteria, { answer: 'ours to next office the in works she' });
  ok(capped.score <= 2.5,
    'every word in the wrong order is held down by the weakest-link cap, like any other item',
    capped.score + ' caps=' + capped.caps.map(c => c.rule).join(','));

  /* The note has to show its working, because this marker cannot tell a
     candidate's slip from the transcription service's. */
  const slip = RP.score(say, 'I will call you back as soon as the meeting ends');
  ok(slip.note.includes(say) && slip.note.includes('meeting ends'),
    'the note quotes both what was said and what the sentence was', slip.note);

  /* ------------------------------------------------------------------ *
   * A paper cannot report a level it cannot measure
   * ------------------------------------------------------------------ *
   *
   * VPET comes in two papers: Level 1 measures A1 to B1+ (GSE 10-58), Level 2
   * B1+ to C2 (GSE 51-90). Every paper used to get the VSTEP band table
   * regardless, so a candidate who answered EVERYTHING on a Level 1 paper was
   * told Bậc 5 / C1 — two bands above the highest thing that paper is capable
   * of finding. A test that stops at B1+ cannot discover a C1 speaker.
   */
  head('A paper cannot report a level it cannot measure');

  const BD = await import('../server/bands.js').then(m => m.default || m);
  const lvl1 = s => BD.bandFor(s, { family: 'vpet', level: 'B1' });
  const lvl2 = s => BD.bandFor(s, { family: 'vpet', level: 'B2' });

  ok(lvl1(10).cefr === 'B1+', 'ten out of ten on a Level 1 paper is B1+, not C1', lvl1(10).cefr);
  ok(lvl1(10).atCeiling === true, 'and it says the paper ran out rather than the candidate');
  ok(lvl1(10).gse === 58, 'which is GSE 58 — the top of the range the guide gives Level 1',
    String(lvl1(10).gse));
  ok(['C1', 'C2', 'B2', 'B2+'].every(c => lvl1(10).cefr !== c),
    'no mark on a Level 1 paper can reach B2 or above');
  ok(lvl1(0).cefr === 'dưới A1', 'and the bottom is below A1, which Level 1 can genuinely see',
    lvl1(0).cefr);

  ok(lvl2(10).cefr === 'C2', 'ten out of ten on a Level 2 paper is C2', lvl2(10).cefr);
  ok(lvl2(10).gse === 90, 'GSE 90, the top of the scale', String(lvl2(10).gse));
  ok(lvl2(1).atFloor === true && lvl2(1).cefr === null,
    'a mark at the floor of Level 2 reports a ceiling, not a level',
    JSON.stringify(lvl2(1).cefr));
  ok(String(lvl2(1).note || '').includes('Cấp 1'),
    'and names the easier paper, because Level 2 cannot tell them apart down there');
  ok(lvl2(5).cefr === 'B2+', 'the middle of Level 2 is B2+', lvl2(5).cefr);

  /* Monotonic: a better paper never reports a lower level. */
  for (const at of [lvl1, lvl2]) {
    let last = -1, broken = null;
    for (let s = 0; s <= 10; s += 0.5) {
      const g = at(s).gse;
      if (g < last) broken = s;
      last = g;
    }
    ok(broken === null, 'a higher mark never maps to a lower point on the scale', 'broke at ' + broken);
  }

  /* VEPT is a different exam on the VSTEP framework and keeps its own bands. */
  const vept = BD.bandFor(8.5, { family: 'vept', level: 'B2' });
  ok(vept.band === 'Bậc 5' && vept.cefr === 'C1',
    'VEPT still reports a VSTEP Bậc, which is correct for that exam', JSON.stringify(vept));

  /* And the paper real candidates sit does have all four, so this rule never
     silently withholds a band somebody earned. */
  const onPaperSkills = [...new Set(parts.map(p => p.skill))].sort();
  ok(['listening', 'reading', 'speaking', 'writing'].every(s => onPaperSkills.includes(s)),
    'the VPET paper carries all four skills, so a real sitting still gets its band',
    onPaperSkills.join(','));
}

console.log(`\n${fail ? '\x1b[31m' : '\x1b[32m'}${pass} passed, ${fail} failed\x1b[0m`);
process.exit(fail ? 1 : 0);
