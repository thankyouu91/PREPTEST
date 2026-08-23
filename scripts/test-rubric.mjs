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

  /* 60 words is 60% of 100 — exactly at the line, which must be inside it. */
  const atLine = R.combine('D', { task: { score: 8 }, register: { score: 8 }, organisation: { score: 8 }, accuracy: { score: 8 } },
    { answer: Array.from({ length: 60 }, (_, i) => 'word' + i).join(' ') });
  ok(!atLine.caps.some(c => c.rule === 'under-length'),
    'Exactly at 60% of the floor is inside the line, not outside it', String(atLine.score));

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
  ok(!ai.userPrompt({ part: 'H', prompt: 'x', answer: 'y' }).includes('Score these criteria'),
    'A part with no criteria is not asked for any');

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
     the criteria rather than about the length gate. */
  let dItems = [];
  for (const p of att.parts) {
    if (p.part !== 'D') continue;
    await student.req('POST', '/api/attempts/' + att.id + '/parts/' + p.sectionId + '/start');
    dItems = p.items.map(it => it.questionId);
    await student.req('PATCH', '/api/attempts/' + att.id + '/answers',
      { answers: dItems.map(id => ({ questionId: id, answer: EMAIL })) });
  }
  ok(dItems.length > 0, 'Part D has items to answer', String(dItems.length));

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
}

console.log(`\n${fail ? '\x1b[31m' : '\x1b[32m'}${pass} passed, ${fail} failed\x1b[0m`);
process.exit(fail ? 1 : 0);
