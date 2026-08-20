/**
 * Marking writing and speaking: the key, the rubric pass, and what a candidate
 * ends up seeing.
 *
 * Run with the server up: node scripts/test-ai-marking.mjs
 *
 * The model is a stub HTTP server started here, speaking the same Messages API
 * shape. That is the only way to test this at all without a real key, and it is
 * also the better test: a stub can be made to time out, to answer with prose, to
 * answer with a score of 47 - the failures that decide whether a candidate is
 * marked wrongly or simply left unmarked.
 *
 * What this is really guarding: before it existed, `overall` was null on every
 * paper anybody had ever submitted, because nothing cleared the pending state on
 * Writing and Speaking. The last section of this file is the check that a paper
 * comes out the other side with a band on it.
 */
import http from 'node:http';
import { DEMO_PASSWORD, ADMIN_PASSWORD } from './_demo.mjs';

const BASE = process.env.BASE || 'http://127.0.0.1:3000';
let pass = 0, fail = 0;
const ok = (c, name, detail) => {
  if (c) { pass++; console.log('✓ ' + name); return; }
  fail++;
  console.log('✗ ' + name + (detail === undefined ? '' : '  → ' + detail));
};
const head = t => console.log('\n\x1b[1m== ' + t + ' ==\x1b[0m');

function client() {
  const jar = new Map();
  const rs = r => {
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
      if (method !== 'GET') {
        const t = jar.get('prep_csrf') || jar.get('admin_csrf');
        if (t) headers['X-CSRF-Token'] = t;
      }
      let payload;
      if (body !== undefined) { headers['Content-Type'] = 'application/json'; payload = JSON.stringify(body); }
      const r = await fetch(BASE + path, { method, headers, body: payload, redirect: 'manual' });
      rs(r);
      const ct = r.headers.get('content-type') || '';
      return { status: r.status, data: ct.includes('json') ? await r.json().catch(() => null) : null, headers: r.headers };
    }
  };
}

/* ------------------------------------------------------------------ *
 * A stub model
 * ------------------------------------------------------------------ */

let mode = 'good';                 // good | prose | outOfRange | slow | error
const seen = [];                   // every request the stub received

const stub = http.createServer((req, res) => {
  let body = '';
  req.on('data', c => { body += c; });
  req.on('end', () => {
    seen.push({ url: req.url, headers: req.headers, body });
    const reply = (code, obj) => {
      res.writeHead(code, { 'content-type': 'application/json' });
      res.end(JSON.stringify(obj));
    };
    if (mode === 'error') return reply(429, { error: { message: 'rate limited' } });
    if (mode === 'slow') return;                       // never answers
    const text =
      mode === 'prose' ? 'I think this is a pretty good answer overall.'
      : mode === 'outOfRange' ? '{"score": 47, "note": "impossible"}'
      : '{"score": 7.5, "note": "Cover the third point the situation asks for; the tone is right."}';
    reply(200, { content: [{ type: 'text', text }] });
  });
});
await new Promise(r => stub.listen(0, '127.0.0.1', r));
const STUB = 'http://127.0.0.1:' + stub.address().port;

const admin = client();
const student = client();

/* The database directly, for the assertions about where a mark actually landed:
   the result route's per-skill breakdown is a paid feature and would tie these
   checks to a plan. */
const { q } = await import('../server/db.js').then(m => m.default || m);

try {
  head('Signing in');
  ok((await admin.req('POST', '/api/admin/login', { username: 'admin', password: ADMIN_PASSWORD })).status === 200,
    'Administrator sign-in');
  ok((await student.req('POST', '/api/auth/login', { username: 'student', password: DEMO_PASSWORD })).status === 200,
    'Student sign-in');

  /* ---------------------------------------------------------------- *
   * The key
   * ---------------------------------------------------------------- */
  head('The key');

  let r = await admin.req('GET', '/api/admin/ai');
  ok(r.status === 200, 'The marking settings can be read');
  ok(r.data.ai.canStore === true,
    'This server can store a key (TOKEN_ENCRYPTION_KEY is set)', 'canStore=' + r.data.ai.canStore);

  /* http would put the key on the wire in clear. */
  r = await admin.req('PUT', '/api/admin/ai', { baseUrl: 'http://example.com', model: 'x' });
  ok(r.status === 400, 'An http endpoint is refused', 'status ' + r.status);

  r = await admin.req('PUT', '/api/admin/ai', { apiKey: 'short' });
  ok(r.status === 400, 'A key too short to be one is refused', 'status ' + r.status);

  const KEY = 'sk-ant-testkey-8899aabbccddeeff';
  r = await admin.req('PUT', '/api/admin/ai', { baseUrl: STUB, model: 'stub-model', apiKey: KEY });
  ok(r.status === 200 && r.data.ai.hasKey, 'The key is accepted', JSON.stringify(r.data));
  ok(r.data.ai.keyHint === 'eeff', 'Only the last four characters come back', r.data.ai.keyHint);

  const asText = JSON.stringify(r.data);
  ok(!asText.includes(KEY), 'The key itself is never in a response body');

  /* The settings screen reads a different route; it must not pick the key up. */
  r = await admin.req('GET', '/api/admin/settings');
  ok(!JSON.stringify(r.data).includes(KEY) && !JSON.stringify(r.data).includes('sealed'),
    'The settings endpoint returns nothing from the ai.* rows',
    Object.keys((r.data && r.data.settings) || {}).join(', '));

  /* Saving a model name must not wipe the key that is already there. */
  r = await admin.req('PUT', '/api/admin/ai', { baseUrl: STUB, model: 'stub-model-2' });
  ok(r.data.ai.hasKey && r.data.ai.model === 'stub-model-2',
    'Changing the model leaves the stored key alone', JSON.stringify(r.data.ai));

  head('The connection test');
  mode = 'good';
  r = await admin.req('POST', '/api/admin/ai/test', {});
  ok(r.status === 200 && r.data.ok, 'A working model reports working', JSON.stringify(r.data));
  ok(seen.length > 0 && seen[seen.length - 1].headers['x-api-key'] === KEY,
    'The key is sent to the model as a header, and only there');

  mode = 'error';
  r = await admin.req('POST', '/api/admin/ai/test', {});
  ok(r.status === 502 && !r.data.ok, 'A refusing model reports the failure', JSON.stringify(r.data));
  r = await admin.req('GET', '/api/admin/ai');
  ok(!!r.data.ai.lastError, 'The failure is remembered for the screen', r.data.ai.lastError);
  ok(!String(r.data.ai.lastError).includes(KEY), 'The remembered failure carries no key');

  /* ---------------------------------------------------------------- *
   * What the marker believes
   * ---------------------------------------------------------------- */
  head('A model answer is not trusted');

  const ai = await import('../server/ai-marking.js').then(m => m.default || m);
  ok(ai.readVerdict('{"score": 7, "note": "fine"}').score === 7, 'A well-formed verdict is read');
  ok(ai.readVerdict('{"score": 7.3, "note": "fine"}').score === 7.5, 'A score is rounded to the half');
  ok(ai.readVerdict('I think it was good') === null, 'Prose is not a verdict');
  ok(ai.readVerdict('{"score": 47, "note": "x"}') === null, 'A score out of range is not a verdict');
  ok(ai.readVerdict('{"score": -1, "note": "x"}') === null, 'A negative score is not a verdict');
  ok(ai.readVerdict('{"score": 5}') === null, 'A verdict with no note is not a verdict');
  ok(ai.readVerdict('') === null, 'Nothing is not a verdict');

  ok(ai.scrub('failed with x-api-key: sk-ant-abcdefghij').includes('***'), 'A key in an error is scrubbed');
  ok(!ai.scrub('x-api-key: ' + KEY).includes(KEY), 'The real key would be scrubbed too');

  /* ---------------------------------------------------------------- *
   * A whole paper
   * ---------------------------------------------------------------- */
  head('A paper, from submit to band');

  const cur = await student.req('GET', '/api/attempts/current');
  if (cur.data && cur.data.attempt) await student.req('POST', '/api/attempts/' + cur.data.attempt.id + '/submit');

  r = await student.req('POST', '/api/attempts', { testId: 'vpet-b1-01' });
  ok(r.status === 201, 'A sitting opens', 'status ' + r.status);
  const att = r.data.attempt;

  /* Answer the writing parts, and only those - the point is what happens to the
     items a string comparison cannot mark. */
  let written = 0;
  for (const p of att.parts) {
    if (!['B', 'D'].includes(p.part)) continue;
    await student.req('POST', '/api/attempts/' + att.id + '/parts/' + p.sectionId + '/start');
    const answers = p.items.map(it => ({
      questionId: it.questionId,
      answer: 'The supplier wrote to say the delivery would be late. I have told the team, moved the '
            + 'installation to Thursday and asked for a discount on the next order. Nobody needs to do '
            + 'anything today.'
    }));
    if (answers.length) {
      await student.req('PATCH', '/api/attempts/' + att.id + '/answers', { answers });
      written += answers.length;
    }
  }
  ok(written === 5, 'Five writing answers are in (part B has 3, part D has 2)', String(written));

  mode = 'good';
  r = await student.req('POST', '/api/attempts/' + att.id + '/submit');
  ok(r.status === 200, 'The paper is handed in', 'status ' + r.status);

  /* The pass runs after the response. Ask the admin route to do it now so the
     test does not have to guess how long to wait. */
  r = await admin.req('POST', '/api/admin/attempts/' + att.id + '/mark', {});
  ok(r.status === 200, 'The marking pass runs', JSON.stringify(r.data));
  ok(r.data.marked >= 5, 'Every writing answer came back marked', JSON.stringify(r.data));

  /* The per-skill breakdown on the result route is a paid feature, so it is not
     the place to check that marking happened - a plan change would break this
     test for a reason that has nothing to do with marking. attempt_scores is
     where the marks actually land. */
  const scoreOf = async (id, skill) =>
    q.get('SELECT scaled, pending, raw_earned, raw_max FROM attempt_scores WHERE attempt_id=? AND skill=?', id, skill);

  const writing = await scoreOf(att.id, 'writing');
  ok(writing && writing.scaled != null,
    'Writing has a mark now, where it used to be permanently null',
    writing ? `scaled=${writing.scaled}, pending=${writing.pending}` : 'no row');
  ok(writing && writing.raw_max > 0 && writing.raw_earned > 0,
    'And the mark is a real fraction of the paper, not a placeholder',
    writing ? `${writing.raw_earned}/${writing.raw_max}` : '-');

  /* Nothing was recorded on this paper, so every speaking item is a zero with a
     reason - the same treatment a blank essay gets. The state that stays OPEN is
     a recording that exists and cannot be transcribed; that is the next check. */
  const speaking = await scoreOf(att.id, 'speaking');
  ok(speaking && speaking.pending === 0,
    'Speaking with nothing recorded is scored, not left pending for ever',
    speaking ? `scaled=${speaking.scaled}, pending=${speaking.pending}` : 'no row');

  const spokenNotes = await q.all(
    `SELECT aa.mark_note FROM attempt_answers aa JOIN questions qs ON qs.id=aa.question_id
      WHERE aa.attempt_id=? AND qs.type='speaking' LIMIT 3`, att.id);
  ok(spokenNotes.length > 0 && spokenNotes.every(n => /recorded/i.test(n.mark_note || '')),
    'And each one says why it scored nothing',
    JSON.stringify(spokenNotes.map(n => n.mark_note)).slice(0, 160));

  r = await student.req('GET', '/api/attempts/' + att.id + '/result');
  ok(r.status === 200, 'The candidate can read their result', 'status ' + r.status);
  /* The line this whole feature was built for. Before it, `overall` was null on
     every paper anybody had ever submitted, permanently. */
  ok(r.data.overall != null && r.data.pending === false,
    'The paper has an overall mark',
    JSON.stringify({ overall: r.data.overall, pending: r.data.pending }));

  head('Failure never becomes a zero');

  /* A second paper, marked by a model that answers with prose. */
  r = await student.req('POST', '/api/attempts', { testId: 'vpet-b1-01' });
  const att2 = r.data.attempt;
  const pD = att2.parts.find(p => p.part === 'D');
  await student.req('POST', '/api/attempts/' + att2.id + '/parts/' + pD.sectionId + '/start');
  await student.req('PATCH', '/api/attempts/' + att2.id + '/answers',
    { answers: pD.items.map(it => ({ questionId: it.questionId, answer: 'A serious answer about the delivery.' })) });
  await student.req('POST', '/api/attempts/' + att2.id + '/submit');

  mode = 'prose';
  r = await admin.req('POST', '/api/admin/attempts/' + att2.id + '/mark', {});
  /* The blank items ARE marked, and without a model call: a blank essay earns
     zero and needs no opinion. What must not happen is the two answered items
     getting a score out of a reply that carried none. */
  ok(r.status === 200 && r.data.failed >= 2,
    'A model that answers with prose scores nothing it was asked to judge', JSON.stringify(r.data));

  const proseMarks = await q.all(
    `SELECT aa.earned, aa.answer FROM attempt_answers aa
       JOIN questions qs ON qs.id = aa.question_id
      WHERE aa.attempt_id = ? AND qs.type = 'essay' AND aa.answer <> ''`, att2.id);
  ok(proseMarks.length > 0 && proseMarks.every(m => m.earned == null),
    'The answered essays are left unmarked, not scored from prose',
    JSON.stringify(proseMarks.map(m => m.earned)));

  const left = await admin.req('GET', '/api/admin/ai');
  ok(left.data.waiting > 0, 'Those items are still waiting, not scored zero', String(left.data.waiting));

  mode = 'good';
  r = await admin.req('POST', '/api/admin/attempts/' + att2.id + '/mark', {});
  ok(r.data.marked > 0, 'And a working model picks them up on the next pass', JSON.stringify(r.data));

  head('An untouched item still gets a mark');

  /* The blocker this whole feature exists to end: one item nobody answered used
     to have no row at all, so it could never be marked, so its skill stayed
     pending, so the band never appeared. */
  r = await student.req('POST', '/api/attempts', { testId: 'vpet-b1-01' });
  const att3 = r.data.attempt;
  const pB = att3.parts.find(p => p.part === 'B');
  await student.req('POST', '/api/attempts/' + att3.id + '/parts/' + pB.sectionId + '/start');
  await student.req('POST', '/api/attempts/' + att3.id + '/submit');

  mode = 'good';
  /* The submit hook has almost certainly finished this already - which is the
     point - so what matters is the state afterwards, not who did it. */
  r = await admin.req('POST', '/api/admin/attempts/' + att3.id + '/mark', {});
  ok(r.status === 200 && !r.data.failed,
    'The pass runs over a paper where nothing was written', JSON.stringify(r.data));

  const blanks = await q.all(
    `SELECT aa.earned, aa.mark_note FROM attempt_answers aa
       JOIN questions qs ON qs.id = aa.question_id
      WHERE aa.attempt_id=? AND qs.type IN ('essay','speaking')`, att3.id);
  ok(blanks.length > 0 && blanks.every(b => b.earned === 0),
    'Every untouched rubric item is scored zero, not left pending',
    JSON.stringify(blanks.map(b => b.earned)).slice(0, 120));

  const wr = await q.get("SELECT scaled, pending FROM attempt_scores WHERE attempt_id=? AND skill='writing'", att3.id);
  ok(wr && wr.pending === 0, 'Writing is finished rather than pending', JSON.stringify(wr));
  const sp = await q.get("SELECT scaled, pending FROM attempt_scores WHERE attempt_id=? AND skill='speaking'", att3.id);
  ok(sp && sp.pending === 0, 'Speaking is finished too, because nothing was recorded', JSON.stringify(sp));
  const ov = await q.get("SELECT scaled, pending FROM attempt_scores WHERE attempt_id=? AND skill='overall'", att3.id);
  ok(ov && ov.pending === 0 && ov.scaled != null,
    'And the paper finally has an overall mark - the thing that was null on every paper ever submitted',
    JSON.stringify(ov));

  head('A mark can be made again');

  const before = await q.get(
    `SELECT aa.earned FROM attempt_answers aa JOIN questions qs ON qs.id=aa.question_id
      WHERE aa.attempt_id=? AND qs.type='essay' LIMIT 1`, att.id);
  r = await admin.req('POST', '/api/admin/attempts/' + att.id + '/mark', {});
  ok(r.data.marked === 0, 'An ordinary re-run spends nothing on items already marked', JSON.stringify(r.data));
  r = await admin.req('POST', '/api/admin/attempts/' + att.id + '/mark?force=1', {});
  ok(r.data.marked > 0, 'A forced re-mark does the paper again', JSON.stringify(r.data));
  const after = await q.get(
    `SELECT aa.earned FROM attempt_answers aa JOIN questions qs ON qs.id=aa.question_id
      WHERE aa.attempt_id=? AND qs.type='essay' LIMIT 1`, att.id);
  ok(before && after && after.earned != null, 'And the paper still has its marks afterwards',
    JSON.stringify({ before: before && before.earned, after: after && after.earned }));

  /* ---------------------------------------------------------------- *
   * It comes back for what it could not finish
   * ---------------------------------------------------------------- */
  head('Nothing is left unmarked for ever');

  /* The queue is process memory and every deploy empties it. What has to survive
     a restart is the INTENTION to mark, and that lives in ai_marking_backlog.
     These checks are on the table and on due(), not on a timer - a test that
     waits ten minutes for a sweep is a test nobody runs. */
  const aiRun = await import('../server/ai-marking-run.js').then(m => m.default || m);

  r = await student.req('POST', '/api/attempts', { testId: 'vpet-b1-01' });
  const att4 = r.data.attempt;
  const pD4 = att4.parts.find(p => p.part === 'D');
  await student.req('POST', '/api/attempts/' + att4.id + '/parts/' + pD4.sectionId + '/start');
  await student.req('PATCH', '/api/attempts/' + att4.id + '/answers',
    { answers: pD4.items.map(it => ({ questionId: it.questionId, answer: 'An answer the marker will fail on.' })) });
  await student.req('POST', '/api/attempts/' + att4.id + '/submit');

  mode = 'error';
  r = await admin.req('POST', '/api/admin/attempts/' + att4.id + '/mark', {});
  ok(r.data.failed >= 2, 'A paper the model refused to mark comes back failed', JSON.stringify(r.data));

  let bl = await q.get('SELECT tries, next_try, last_note FROM ai_marking_backlog WHERE attempt_id=?', att4.id);
  ok(!!bl, 'A paper that could not be finished is written down, so a restart cannot lose it',
    JSON.stringify(bl));
  /* `>= 1` rather than `=== 1`: the sweeper is live in this server and may have
     had its own go at the paper. What matters is that failures are counted, not
     that this test was the only one counting. */
  ok(bl && bl.tries >= 1, 'With the failure counted against it', bl && String(bl.tries));
  ok(bl && Date.parse(bl.next_try) > Date.now(),
    'And a time to try again, in the future rather than at once', bl && bl.next_try);

  /* The backoff is the difference between retrying a broken key and hammering
     it. A paper not yet due must not be picked up. */
  let dueIds = (await aiRun.due(500)).map(x => x.id);
  ok(!dueIds.includes(att4.id), 'It is not swept again immediately - the backoff holds it',
    JSON.stringify(dueIds).slice(0, 80));

  /* Wind the clock back rather than wait for it. */
  await q.run('UPDATE ai_marking_backlog SET next_try=? WHERE attempt_id=?',
    new Date(Date.now() - 60e3).toISOString(), att4.id);
  dueIds = (await aiRun.due(500)).map(x => x.id);
  ok(dueIds.includes(att4.id), 'Once the wait is over it is due again', JSON.stringify(dueIds).slice(0, 80));

  ok(aiRun.BACKOFF_MIN.length > 1
    && aiRun.BACKOFF_MIN.every((v, i, a) => i === 0 || v >= a[i - 1]),
    'The wait grows with each failure rather than staying flat', JSON.stringify(aiRun.BACKOFF_MIN));

  mode = 'good';
  r = await admin.req('POST', '/api/admin/ai/sweep', {});
  ok(r.status === 200 && r.data.queued >= 1, 'The sweep queues what is due', JSON.stringify(r.data));

  /* sweep() queues and returns; the pass itself is behind it. Ask for this one
     paper directly, which joins the pass already in flight rather than starting
     a second - the same guarantee the submit hook relies on. */
  await admin.req('POST', '/api/admin/attempts/' + att4.id + '/mark', {});
  bl = await q.get('SELECT tries FROM ai_marking_backlog WHERE attempt_id=?', att4.id);
  ok(!bl, 'A paper that finishes is taken off the list', JSON.stringify(bl));

  const done4 = await q.get(
    "SELECT scaled, pending FROM attempt_scores WHERE attempt_id=? AND skill='overall'", att4.id);
  ok(done4 && done4.pending === 0 && done4.scaled != null,
    'And it ends up with a band, having failed on the way', JSON.stringify(done4));

  /* The backlog nobody could clear: papers finished BEFORE a key was ever
     pasted in. Their submit hook found no key and returned; no later submit will
     ever fire for them again. The sweep is the only thing that can reach them. */
  head('The papers finished before there was a key');

  await admin.req('PUT', '/api/admin/ai', { apiKey: '' });
  r = await student.req('POST', '/api/attempts', { testId: 'vpet-b1-01' });
  const att5 = r.data.attempt;
  const pD5 = att5.parts.find(p => p.part === 'D');
  await student.req('POST', '/api/attempts/' + att5.id + '/parts/' + pD5.sectionId + '/start');
  await student.req('PATCH', '/api/attempts/' + att5.id + '/answers',
    { answers: pD5.items.map(it => ({ questionId: it.questionId, answer: 'Written while nobody was marking.' })) });
  await student.req('POST', '/api/attempts/' + att5.id + '/submit');

  const noKey = await q.get(
    "SELECT pending FROM attempt_scores WHERE attempt_id=? AND skill='overall'", att5.id);
  ok(!noKey || noKey.pending === 1, 'With no key the paper is submitted unmarked, as before',
    JSON.stringify(noKey));
  ok((await aiRun.sweep()).skipped === 'no-key', 'And a sweep with no key does nothing at all');

  await admin.req('PUT', '/api/admin/ai', { baseUrl: STUB, model: 'stub-model', apiKey: KEY });
  dueIds = (await aiRun.due(500)).map(x => x.id);
  ok(dueIds.includes(att5.id),
    'The moment a key exists, the paper is due a pass without anyone touching it',
    JSON.stringify(dueIds).slice(0, 80));

  r = await admin.req('POST', '/api/admin/attempts/' + att5.id + '/mark', {});
  const done5 = await q.get(
    "SELECT scaled, pending FROM attempt_scores WHERE attempt_id=? AND skill='overall'", att5.id);
  ok(done5 && done5.pending === 0 && done5.scaled != null,
    'And it is marked - the historical backlog clears itself', JSON.stringify(done5));

  head('Only the owner touches the key');
  /* The demo student is not an administrator at all; the sharper case is an
     administrator who is not the owner, which the admin suite covers for other
     routes. Here: an unauthenticated caller must get nowhere. */
  const stranger = client();
  r = await stranger.req('PUT', '/api/admin/ai', { apiKey: 'sk-somebody-elses-key-here' });
  ok(r.status === 401 || r.status === 403, 'A caller with no admin session is refused', 'status ' + r.status);
  /* The sweep spends against the credential too, so it is not a route a stranger
     may start - twenty papers is twenty papers' worth of somebody's account. */
  r = await stranger.req('POST', '/api/admin/ai/sweep', {});
  ok(r.status === 401 || r.status === 403, 'Nor may a stranger start a sweep', 'status ' + r.status);

} catch (e) {
  fail++;
  console.log('\n✗ The suite threw: ' + (e && e.stack ? e.stack : e));
} finally {
  /* Leave no key behind: the next run of any other suite would otherwise start
     marking against a stub that is no longer listening. */
  try { await admin.req('PUT', '/api/admin/ai', { apiKey: '', sttApiKey: '', baseUrl: 'https://api.anthropic.com', model: 'claude-sonnet-5' }); } catch (e) {}
  stub.close();
}

console.log(`\n${fail ? '\x1b[31m' : '\x1b[32m'}${pass} passed, ${fail} failed\x1b[0m`);
process.exit(fail ? 1 : 0);
