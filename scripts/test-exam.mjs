/**
 * Exam engine: the life cycle of one sitting.
 *
 * Run with the server up: node scripts/test-exam.mjs
 * No browser — plain fetch, keeping its own cookies.
 *
 * The focus is everything that must NOT be trusted to a browser: the per-part
 * clock, the replay count, the sitting quota, and answers never going out.
 */
import { launchChromium } from './_browser.mjs';
import { DEMO_PASSWORD, ADMIN_PASSWORD } from './_demo.mjs';

const BASE = process.env.BASE || 'http://127.0.0.1:3000';

let pass = 0, fail = 0;
const ok = (c, name, detail) => {
  if (c) { pass++; console.log('✓ ' + name); return; }
  fail++;
  console.log('✗ ' + name + (detail === undefined ? '' : '  → ' + detail));
};
const head = t => console.log('\n\x1b[1m== ' + t + ' ==\x1b[0m');

/** A small "browser": remembers cookies, attaches CSRF itself */
function client() {
  const jar = new Map();
  const readSetCookie = r => {
    const all = typeof r.headers.getSetCookie === 'function' ? r.headers.getSetCookie() : [];
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
    async req(method, path, body, extra) {
      /* No prep_csrf yet, so ask for one: the server mints that cookie whenever it
         serves an HTML page, guests included. Done here rather than making every
         call site remember — forget one and you get a baffling 403. It is also
         exactly what a browser does: load a page before you can submit a form.
         The landing page is used because it carries no redirect guard. */
      if (method !== 'GET' && !jar.has('prep_csrf')) await this.req('GET', '/prep/landing/');
      const headers = Object.assign({ Accept: 'application/json' }, extra || {});
      if (jar.size) headers.Cookie = [...jar].map(([k, v]) => k + '=' + encodeURIComponent(v)).join('; ');
      if (method !== 'GET') {
        const t = jar.get('prep_csrf') || jar.get('admin_csrf');
        if (t) headers['X-CSRF-Token'] = t;
      }
      let payload;
      if (body instanceof Uint8Array) { payload = body; }
      else if (body !== undefined) { headers['Content-Type'] = 'application/json'; payload = JSON.stringify(body); }
      const r = await fetch(BASE + path, { method, headers, body: payload, redirect: 'manual' });
      readSetCookie(r);
      const ct = r.headers.get('content-type') || '';
      let data = null;
      if (ct.includes('json')) data = await r.json().catch(() => null);
      else data = Buffer.from(await r.arrayBuffer());
      return { status: r.status, data, headers: r.headers };
    }
  };
}

/* A minimal valid MP3: an ID3 tag then a frame header. Enough to pass storage's
   sniff without committing a binary file to the repository. */
function fakeMp3() {
  const buf = Buffer.alloc(2048);
  buf.write('ID3', 0, 'latin1');
  buf[3] = 3;
  buf[10] = 0xFF; buf[11] = 0xFB;
  return new Uint8Array(buf);
}
/* WebM: the four opening EBML bytes — exactly what a browser's MediaRecorder emits */
function fakeWebm() {
  const buf = Buffer.alloc(1024);
  buf[0] = 0x1A; buf[1] = 0x45; buf[2] = 0xDF; buf[3] = 0xA3;
  return new Uint8Array(buf);
}

const admin = client();
const student = client();

/* Hoisted so the `finally` at the bottom can clean them up even when an
   assertion throws halfway down. */
let made = [];
let speakQ = null;
let testId = null;

try {
  /* ---------- Build a real paper to sit ---------- */
  head('Preparing the test paper');
  await admin.req('GET', '/api/me');
  let r = await admin.req('POST', '/api/admin/login', { username: 'admin', password: ADMIN_PASSWORD });
  ok(r.status === 200, 'Administrator sign-in', 'status ' + r.status);

  /* Two Listening items with audio + one Writing item: enough for the clock, replays and recording */
  for (let i = 0; i < 2; i++) {
    r = await admin.req('POST', '/api/admin/questions', {
      familyId: 'vpet', skill: 'listening', level: 'B1', type: 'mcq', part: 'F',
      prompt: 'Engine test listening item ' + i + ' — pick the natural reply.',
      options: ['Yes, of course.', 'It is blue.', 'At six.', 'By bus.'],
      answer: 'Yes, of course.'
    });
    ok(r.status === 201, 'Creates listening item ' + (i + 1), 'status ' + r.status);
    made.push(r.data.id);
    const up = await admin.req('POST', '/api/admin/questions/' + r.data.id + '/audio', fakeMp3(),
      { 'Content-Type': 'audio/mpeg' });
    ok(up.status === 201 || up.status === 200, 'Attaches an MP3 to listening item ' + (i + 1), 'status ' + up.status);
  }
  r = await admin.req('POST', '/api/admin/questions', {
    familyId: 'vpet', skill: 'speaking', level: 'B1', type: 'speaking', part: 'I',
    prompt: 'Engine test speaking item — respond to the situation.'
  });
  ok(r.status === 201, 'Creates the speaking item', 'status ' + r.status);
  speakQ = r.data.id;

  r = await admin.req('POST', '/api/admin/tests', {
    familyId: 'vpet', title: 'Engine test paper', level: 'B1', durationMin: 10
  });
  testId = r.data.id;
  ok(!!testId, 'Creates the test paper', String(testId));

  /* The Listening part has a 1-minute clock; the Speaking part is 0 minutes = untimed */
  r = await admin.req('POST', '/api/admin/tests/' + testId + '/sections', {
    name: 'Part F - Response Selection', skill: 'listening', type: 'Multiple choice', minutes: 1, part: 'F'
  });
  const secListen = r.data.id;
  r = await admin.req('POST', '/api/admin/tests/' + testId + '/sections', {
    name: 'Part I - Speaking Situations', skill: 'speaking', type: 'Recording', minutes: 0, part: 'I'
  });
  const secSpeak = r.data.id;
  await admin.req('POST', '/api/admin/sections/' + secListen + '/items', { questionIds: made });
  await admin.req('POST', '/api/admin/sections/' + secSpeak + '/items', { questionIds: [speakQ] });
  r = await admin.req('POST', '/api/admin/tests/' + testId + '/status', { status: 'published' });
  ok(r.status === 200, 'Publishes the test paper', JSON.stringify(r.data));

  /* ---------- Starting a sitting ---------- */
  head('Starting a sitting');
  await student.req('GET', '/api/me');
  r = await student.req('POST', '/api/auth/login', { username: 'student', password: DEMO_PASSWORD });
  ok(r.status === 200, 'Student sign-in', 'status ' + r.status);

  /* The database is not rebuilt between runs: an abandoned sitting from last time
     blocks this one. Clear it first, so the test measures the engine, not leftovers. */
  const leftover = await student.req('GET', '/api/attempts/current');
  if (leftover.data && leftover.data.attempt) {
    await student.req('POST', '/api/attempts/' + leftover.data.attempt.id + '/submit');
  }

  r = await student.req('POST', '/api/attempts', { testId });
  ok(r.status === 201 && r.data.attempt, 'A new sitting opens', JSON.stringify(r.data).slice(0, 120));
  const att = r.data.attempt;
  const attemptId = att.id;

  ok(att.parts.length === 2, 'The sitting has both parts', 'saw ' + att.parts.length);
  const pF = att.parts.find(p => p.part === 'F');
  const pI = att.parts.find(p => p.part === 'I');
  ok(!!pF && !!pI, 'Both parts carry their own letter');
  ok(pF.items.length === 2, 'Part F holds its 2 items', String(pF.items.length));

  /* Answers must never go out — the easiest thing to leak and the most damaging
     if it does. */
  const raw = JSON.stringify(att);
  ok(!/"answer":"Yes, of course\."/.test(raw), 'The correct answer is NOT in what the browser receives');
  ok(!/explanation/.test(raw), 'Nor is the explanation');
  ok(pF.items.every(i => Array.isArray(i.options) && i.options.length === 4),
    'The options are still sent (they have to be rendered)');

  /* Opening another paper while one is unfinished must be blocked, or the one in progress vanishes */
  r = await student.req('POST', '/api/attempts', { testId: 'vpet-b1-01' });
  ok(r.status === 409, 'Cannot open another paper while one is unsubmitted', 'status ' + r.status);

  r = await student.req('POST', '/api/attempts', { testId });
  ok(r.status === 200 && r.data.resumed === true, 'Reopening the unfinished one resumes it rather than starting a new sitting');

  /* ---------- The per-part clock ---------- */
  head('The per-part clock');
  r = await student.req('PATCH', '/api/attempts/' + attemptId + '/answers',
    { answers: [{ questionId: made[0], answer: 'Yes, of course.' }] });
  ok(r.data.rejected.length === 1 && r.data.rejected[0].reason === 'part-closed',
    'No answer can be saved before entering the part', JSON.stringify(r.data));

  r = await student.req('POST', '/api/attempts/' + attemptId + '/parts/' + secListen + '/start');
  ok(r.status === 200 && r.data.secondsLeft > 0 && r.data.secondsLeft <= 60,
    'Entering part F starts a clock of exactly the declared minutes', JSON.stringify(r.data));
  const firstEnds = r.data.endsAt;

  r = await student.req('POST', '/api/attempts/' + attemptId + '/parts/' + secListen + '/start');
  ok(r.data.endsAt === firstEnds, 'Re-entering an open part does NOT grant a fresh clock', r.data.endsAt);

  r = await student.req('PATCH', '/api/attempts/' + attemptId + '/answers',
    { answers: [{ questionId: made[0], answer: 'Yes, of course.' }] });
  ok(r.data.saved.length === 1 && !r.data.rejected.length, 'An open part accepts answers',
    JSON.stringify(r.data));

  r = await student.req('PATCH', '/api/attempts/' + attemptId + '/answers',
    { answers: [{ questionId: speakQ, answer: 'writing into a part not yet entered' }] });
  ok(r.data.rejected.length === 1, 'Nothing can be written into a part not yet entered', JSON.stringify(r.data));

  r = await student.req('PATCH', '/api/attempts/' + attemptId + '/answers',
    { answers: [{ questionId: 999999, answer: 'an item outside this sitting' }] });
  ok(r.data.rejected.length === 1 && r.data.rejected[0].reason === 'not-in-attempt',
    'Nothing can be written for an item outside the sitting', JSON.stringify(r.data));

  /* ---------- Replays: counted on the server ---------- */
  head('Replay count');
  const listenOnce = () => student.req('GET', '/api/attempts/' + attemptId + '/items/' + made[0] + '/audio');
  r = await listenOnce();
  ok(r.status === 200 && r.data.length > 0, 'The first listen returns the file', 'status ' + r.status);
  ok(r.headers.get('x-replays-left') === '1', 'One replay left after the first', r.headers.get('x-replays-left'));
  ok((r.headers.get('cache-control') || '').includes('no-store'),
    'Exam audio is never cached', r.headers.get('cache-control'));

  r = await listenOnce();
  ok(r.status === 200 && r.headers.get('x-replays-left') === '0', 'The second listen is the last',
    r.headers.get('x-replays-left'));

  r = await listenOnce();
  ok(r.status === 429, 'Out of replays the server refuses, independent of the browser', 'status ' + r.status);

  r = await student.req('GET', '/api/attempts/' + attemptId);
  const itemAfter = r.data.attempt.parts.find(p => p.part === 'F').items.find(i => i.questionId === made[0]);
  ok(itemAfter.replaysLeft === 0, 'The returned state reports the right number of replays left', String(itemAfter.replaysLeft));

  /* Closing a part early: the same partOpen() guards the out-of-time case too, so
     this exercises that path directly without waiting out a real minute on every
     CI run. */
  r = await student.req('POST', '/api/attempts/' + attemptId + '/parts/' + secListen + '/close');
  ok(r.status === 200 && r.data.closedAt, 'Part F closes early', JSON.stringify(r.data));
  r = await student.req('PATCH', '/api/attempts/' + attemptId + '/answers',
    { answers: [{ questionId: made[1], answer: 'written after the part closed' }] });
  ok(r.data.rejected.length === 1 && r.data.rejected[0].reason === 'part-closed',
    'A closed part accepts no further answers', JSON.stringify(r.data));
  r = await student.req('GET', '/api/attempts/' + attemptId + '/items/' + made[1] + '/audio');
  ok(r.status === 403, 'A closed part cannot be listened to any more', 'status ' + r.status);
  r = await student.req('POST', '/api/attempts/' + attemptId + '/parts/' + secListen + '/start');
  ok(r.status === 400, 'A closed part cannot be reopened', 'status ' + r.status);

  /* ---------- Recording an answer ---------- */
  head('Recording an answer');
  r = await student.req('POST', '/api/attempts/' + attemptId + '/items/' + speakQ + '/recording',
    fakeWebm(), { 'Content-Type': 'audio/webm' });
  ok(r.status === 403, 'No recording before entering the Speaking part', 'status ' + r.status);

  await student.req('POST', '/api/attempts/' + attemptId + '/parts/' + secSpeak + '/start');
  r = await student.req('POST', '/api/attempts/' + attemptId + '/items/' + speakQ + '/recording',
    fakeWebm(), { 'Content-Type': 'audio/webm' });
  ok(r.status === 201, 'A browser WebM recording is stored', JSON.stringify(r.data));

  r = await student.req('POST', '/api/attempts/' + attemptId + '/items/' + speakQ + '/recording',
    new Uint8Array(Buffer.from('MZ\x90\x00 not audio at all')), { 'Content-Type': 'audio/webm' });
  ok(r.status === 400, 'A file merely claiming to be audio is refused on content, not on its claim', 'status ' + r.status);

  r = await student.req('GET', '/api/attempts/' + attemptId);
  const spoken = r.data.attempt.parts.find(p => p.part === 'I').items[0];
  ok(spoken.hasRecording === true, 'The state records that a recording exists');

  /* ---------- Handing in ---------- */
  head('Handing in');
  r = await student.req('POST', '/api/attempts/' + attemptId + '/submit');
  ok(r.status === 200 && r.data.ok, 'The paper is handed in', JSON.stringify(r.data));
  ok(r.data.total === 3, 'The total item count is right', String(r.data.total));
  ok(r.data.answered === 2, 'The answered count is right', String(r.data.answered));

  r = await student.req('PATCH', '/api/attempts/' + attemptId + '/answers',
    { answers: [{ questionId: made[1], answer: 'edited after handing in' }] });
  ok(r.status === 400, 'Once handed in, answers cannot be edited', 'status ' + r.status);

  r = await student.req('POST', '/api/attempts/' + attemptId + '/submit');
  ok(r.status === 200 && r.data.alreadySubmitted, 'Handing in twice creates no broken sitting', JSON.stringify(r.data));

  r = await student.req('GET', '/api/attempts/current');
  ok(r.data.attempt === null, 'Once handed in there is no paper in progress');

  /* ---------- Somebody else's sitting ---------- */
  head('Sitting permissions');
  const other = client();
  await other.req('GET', '/api/me');
  const email = 'engine.' + Date.now() + '@thu-nghiem.vn';
  await other.req('POST', '/api/auth/register',
    { name: 'Engine Test Person', email, password: 'Matkhau12345', phone: '0912345678', interests: [] });
  r = await other.req('GET', '/api/attempts/' + attemptId);
  ok(r.status === 404, 'Another person\'s sitting is not visible (404, not 403)', 'status ' + r.status);

  r = await other.req('POST', '/api/attempts', { testId });
  ok(r.status === 403 && r.data.need === 'plan',
    'With no plan no sitting can be opened', JSON.stringify(r.data));

  /* ---------- Marking ---------- */
  head('Marking');
  r = await student.req('GET', '/api/attempts/' + attemptId + '/result');
  ok(r.status === 200, 'A result exists as soon as the paper is handed in', 'status ' + r.status);
  const result = r.data;

  /* The demo account holds a Plus plan, so it sees the detailed table. */
  ok(result.detailed === true, 'A Plus plan sees the detailed report', JSON.stringify(result.detailed));
  ok(/reference mark/.test(result.disclaimer || ''),
    'The result says plainly that this is a practice score, not a real exam score', result.disclaimer);

  const listen = (result.skills || []).find(x => x.skill === 'listening');
  /* The test paper: 2 Listening multiple-choice items, 1 answered correctly above. */
  ok(listen && listen.rawMax === 2, 'The Listening item total is right', JSON.stringify(listen));
  ok(listen && listen.rawEarned === 1, 'Marks 1 of 2 Listening items', JSON.stringify(listen));
  ok(listen && listen.score === 5, 'Linear conversion 1/2 → 5.0 on a scale of 10', String(listen && listen.score));

  const speak = (result.skills || []).find(x => x.skill === 'speaking');
  ok(speak && speak.pending === true, 'Speaking is left pending rather than scored zero',
    JSON.stringify(speak));
  ok(result.pending === true && result.overall === null,
    'With fewer than four skills marked there is no overall score', JSON.stringify({ pending: result.pending, overall: result.overall }));

  /* A blank item still counts in the denominator: many blanks and a high score is a serious fault. */
  const fPart = (result.parts || []).find(x => x.part === 'F');
  ok(fPart && fPart.max === 2, 'A blank item still counts in the denominator', JSON.stringify(fPart && { earned: fPart.earned, max: fPart.max }));

  /* The correct answer stays hidden even on the result screen — the paper gets reused. */
  ok(!/"answer"/.test(JSON.stringify(result)), 'The report carries no correct answers');
  ok((fPart.items || []).every(i => typeof i.given === 'string'),
    'The report does carry the student\'s own answer, for comparison');

  /* Re-marking must not double the score or create new rows. */
  r = await student.req('GET', '/api/attempts/' + attemptId + '/result');
  const again = (r.data.skills || []).find(x => x.skill === 'listening');
  ok(again && again.rawEarned === 1 && again.rawMax === 2,
    'Reading the result again gives the same numbers', JSON.stringify(again));

  r = await student.req('GET', '/api/attempts/999999/result');
  ok(r.status === 404, 'The result of a sitting that does not exist is not readable', 'status ' + r.status);

  /* ---------- The Starter plan's sitting quota ---------- */
  head('Sitting quota');
  /* The demo account's Plus plan is uncapped, so testing the 10-sitting cap needs
     an account of its own holding a Starter plan. */
  const capped = client();
  await capped.req('GET', '/api/me');
  const cappedEmail = 'han-muc.' + Date.now() + '@thu-nghiem.vn';
  await capped.req('POST', '/api/auth/register',
    { name: 'Quota Test Person', email: cappedEmail, password: 'Matkhau12345', phone: '0912345678', interests: [] });
  r = await admin.req('GET', '/api/admin/users?q=' + encodeURIComponent(cappedEmail));
  const cappedId = r.data.items[0] && r.data.items[0].id;
  ok(!!cappedId, 'Finds the account just registered', String(cappedId));

  r = await admin.req('POST', '/api/admin/codes', {
    planId: 'starter-3m', unlockType: 'family', unlockRef: 'vpet', qty: 1, userId: cappedId
  });
  ok(r.status === 201, 'Issues a Starter code straight to that account', 'status ' + r.status);

  r = await capped.req('GET', '/api/me');
  ok(r.data.entitlement && r.data.entitlement.attemptsLeft === 10,
    'A Starter plan begins with all 10 sittings', JSON.stringify(r.data.entitlement));

  let used = 0;
  for (let i = 0; i < 10; i++) {
    const s1 = await capped.req('POST', '/api/attempts', { testId });
    if (s1.status !== 201) break;
    used++;
    await capped.req('POST', '/api/attempts/' + s1.data.attempt.id + '/submit');
  }
  ok(used === 10, 'Exactly 10 sittings are allowed', 'saw ' + used);

  r = await capped.req('GET', '/api/me');
  ok(r.data.entitlement.attemptsUsed === 10 && r.data.entitlement.attemptsLeft === 0,
    'The used count matches how many papers were really opened', JSON.stringify(r.data.entitlement));

  r = await capped.req('POST', '/api/attempts', { testId });
  ok(r.status === 403 && r.data.need === 'attempts',
    'Out of sittings the server refuses to open an eleventh', JSON.stringify(r.data));

  /* Starter buys "a normal banded report": a score and a band, no breakdown table.
     That boundary has to live on the server, not in the interface. */
  r = await capped.req('GET', '/api/attempts');
  const cappedAttempt = r.data.items[0];
  r = await capped.req('GET', '/api/attempts/' + cappedAttempt.id + '/result');
  ok(r.status === 200 && r.data.detailed === false,
    'A Starter plan receives only the short report', JSON.stringify(r.data.detailed));
  ok(r.data.skills === undefined && r.data.parts === undefined,
    'Breakdown data never leaves the server for a Starter plan',
    JSON.stringify(Object.keys(r.data)));
  ok(typeof r.data.upgradeHint === 'string', 'It says why the report is short', r.data.upgradeHint);

  /* An uncapped plan has nothing to decrement — reopening a paper must cost
     nothing at all. */
  const beforeUnlimited = (await student.req('GET', '/api/me')).data.entitlement.attemptsUsed;
  r = await student.req('POST', '/api/attempts', { testId });
  const unlimitedAttempt = r.data.attempt && r.data.attempt.id;
  const afterUnlimited = (await student.req('GET', '/api/me')).data.entitlement.attemptsUsed;
  ok(afterUnlimited === beforeUnlimited,
    'An uncapped plan: opening a paper decrements nothing', beforeUnlimited + ' → ' + afterUnlimited);
  if (unlimitedAttempt) await student.req('POST', '/api/attempts/' + unlimitedAttempt + '/submit');

  /* ---------- A reserved code belongs to one account ---------- */
  head('Reserved codes');
  /* An administrator can bind a code to a named account at issue time. Reserved
     this way it stays unused until that account activates it — and no one else
     can, which is the whole point of "one code, one account" decided up front. */
  const alice = client(), bob = client();
  await alice.req('GET', '/api/me'); await bob.req('GET', '/api/me');
  const aliceEmail = 'alice.' + Date.now() + '@thu-nghiem.vn';
  const bobEmail = 'bob.' + Date.now() + '@thu-nghiem.vn';
  await alice.req('POST', '/api/auth/register',
    { name: 'Alice Reserved', email: aliceEmail, password: 'Matkhau12345', phone: '0912345678', interests: [] });
  await bob.req('POST', '/api/auth/register',
    { name: 'Bob Other', email: bobEmail, password: 'Matkhau12345', phone: '0987654321', interests: [] });
  r = await admin.req('GET', '/api/admin/users?q=' + encodeURIComponent(aliceEmail));
  const aliceId = r.data.items[0] && r.data.items[0].id;
  r = await admin.req('POST', '/api/admin/codes',
    { planId: 'plus-6m', unlockType: 'family', unlockRef: 'vpet', qty: 1, userId: aliceId, reserve: true });
  ok(r.status === 201 && r.data.reserved === true, 'Reserves a code to Alice at issue', 'status ' + r.status);
  const reservedCode = r.data.created[0];

  r = await bob.req('POST', '/api/redeem', { code: reservedCode });
  ok(r.status === 409, 'Another account cannot activate a code reserved for someone else', 'status ' + r.status);
  r = await bob.req('GET', '/api/me');
  ok(!r.data.entitlement || r.data.entitlement.planId !== 'plus-6m',
    'and gains nothing from the attempt', JSON.stringify(r.data.entitlement));

  r = await alice.req('POST', '/api/redeem', { code: reservedCode });
  ok(r.status === 200, 'The account it was reserved to activates it', 'status ' + r.status);
  r = await alice.req('GET', '/api/me');
  ok(r.data.entitlement && r.data.entitlement.planId === 'plus-6m',
    'and receives the plan the code carried', JSON.stringify(r.data.entitlement));

  /* ---------- The exam runner really drives the engine ---------- */
  head('The exam runner');
  /* The backend is thoroughly checked above; this part asks one question: does the
     screen really drive that engine, or only draw something that looks like it. */
  const browser = await launchChromium({ args: ['--no-sandbox'] });
  try {
    const ctx = await browser.newContext();
    const uiErrors = [];
    ctx.on('weberror', e => uiErrors.push(String(e.error())));
    const page = await ctx.newPage();
    await page.goto(BASE + '/prep/dang-nhap/', { waitUntil: 'networkidle' });
    await page.fill('#email', 'student');
    await page.fill('#password', DEMO_PASSWORD);
    await page.click('#submit');
    await page.waitForTimeout(1200);

    await page.goto(BASE + '/prep/lam-bai/?test=' + encodeURIComponent(testId), { waitUntil: 'networkidle' });
    await page.waitForTimeout(900);
    ok(await page.locator('#runner').isVisible(), 'The Start button opens the runner');
    ok((await page.locator('#ex-parts button').count()) === 2,
      'Both parts are shown', String(await page.locator('#ex-parts button').count()));

    /* Before entering a part there are no items — exactly as the server dictates */
    ok((await page.locator('[data-item]').count()) === 0, 'No items before entering a part');
    await page.click('#ex-enter');
    await page.waitForTimeout(900);
    ok((await page.locator('[data-item]').count()) === 2, 'Entering part F shows both items',
      String(await page.locator('[data-item]').count()));
    const clock = (await page.locator('#ex-clock-text').textContent()).trim();
    ok(/^\d+:\d\d$/.test(clock), 'The clock is running on screen', clock);

    /* Answer one item and wait for autosave — there is no Save button, so if this
       stays silent the candidate cannot tell whether their work was kept. */
    await page.locator('[data-answer]').first().check();
    await page.waitForTimeout(1900);
    ok((await page.locator('#ex-saved').textContent()).trim() === 'Saved',
      'Autosaves and says so', (await page.locator('#ex-saved').textContent()).trim());

    /* Listening: one click must drop the remaining count, following the server */
    const playBtn = page.locator('[data-play]').first();
    const before = (await page.locator('[data-plays]').first().textContent()).trim();
    await playBtn.click();
    await page.waitForTimeout(1200);
    const after = (await page.locator('[data-plays]').first().textContent()).trim();
    ok(before !== after, 'Clicking Listen changes the remaining count, following the server', before + ' → ' + after);

    /* Reload the page: the paper in progress must come back intact */
    await page.reload({ waitUntil: 'networkidle' });
    await page.waitForTimeout(900);
    ok(await page.locator('#runner').isVisible(), 'Reloading returns to the paper in progress');
    ok(await page.locator('[data-answer]').first().isChecked(), 'A saved answer survives the reload');

    /* Hand in through the interface */
    await page.click('#ex-submit');
    await page.waitForTimeout(400);
    ok(await page.locator('#submit-modal.show').count() === 1, 'It asks before handing in');
    await page.click('#sm-go');
    await page.waitForTimeout(1200);
    ok(await page.locator('#done').isVisible(), 'Handing in shows the submitted screen');

    ok(uiErrors.length === 0, 'No JavaScript errors on the runner', uiErrors.join(' | '));

    /* ---- The result screen ---- */
    head('The result screen');
    const uiAttempt = (await (await page.request.get(BASE + '/api/attempts')).json())
      .items.find(a => a.status === 'submitted');
    await page.goto(BASE + '/prep/ket-qua/' + uiAttempt.id + '/', { waitUntil: 'networkidle' });
    await page.waitForTimeout(800);
    ok(await page.locator('#report').isVisible(), 'The result screen opens');
    ok(await page.locator('#r-skills article').count() > 0, 'Per-skill scores are shown');
    ok(await page.locator('#r-parts article').count() > 0, 'The per-part breakdown is shown');
    /* With fewer than four skills marked the overall must be a dash, not a
       half-computed number that reads as a final result. */
    ok((await page.locator('#r-overall').textContent()).trim() === '–',
      'Unfinished marking leaves the overall blank rather than inventing a number',
      (await page.locator('#r-overall').textContent()).trim());
    ok(await page.locator('#r-pending').isVisible(), 'It says Writing and Speaking are still to be marked');
    ok(!(await page.locator('#r-upgrade').isVisible()), 'A Plus plan sees no upgrade panel');
    const body = await page.locator('#r-parts').innerText();
    ok(/Correct|Wrong|Left blank/.test(body), 'Every item is marked correct / wrong / blank');

    /* An unsubmitted sitting is not an error but unfinished work — it must lead back in. */
    const running = await page.request.post(BASE + '/api/attempts', {
      data: { testId }, headers: { 'X-CSRF-Token': await page.evaluate(() => PrepApi.csrf()) }
    });
    const runningId = (await running.json()).attempt.id;
    await page.goto(BASE + '/prep/ket-qua/' + runningId + '/', { waitUntil: 'networkidle' });
    await page.waitForTimeout(700);
    ok(await page.locator('#none').isVisible(), 'An unsubmitted sitting has no result yet');
    ok((await page.locator('#none-cta').getAttribute('href')) === '/prep/lam-bai/',
      'And it leads straight back to where the work continues', await page.locator('#none-cta').getAttribute('href'));
    await page.request.post(BASE + '/api/attempts/' + runningId + '/submit', {
      headers: { 'X-CSRF-Token': await page.evaluate(() => PrepApi.csrf()) }
    });

    ok(uiErrors.length === 0, 'No JavaScript errors on the result screen', uiErrors.join(' | '));
    await ctx.close();

    /* Starter: a short result screen, with the reason. This is where plan policy
       becomes visible to a user, so it has to be checked on the screen itself. */
    const ctx2 = await browser.newContext();
    const page2 = await ctx2.newPage();
    await page2.goto(BASE + '/prep/dang-nhap/', { waitUntil: 'networkidle' });
    await page2.fill('#email', cappedEmail);
    await page2.fill('#password', 'Matkhau12345');
    await page2.click('#submit');
    await page2.waitForTimeout(1200);
    const cappedDone = (await (await page2.request.get(BASE + '/api/attempts')).json())
      .items.find(a => a.status === 'submitted');
    await page2.goto(BASE + '/prep/ket-qua/' + cappedDone.id + '/', { waitUntil: 'networkidle' });
    await page2.waitForTimeout(800);
    ok(await page2.locator('#report').isVisible(), 'A Starter plan still sees a result');
    ok(await page2.locator('#r-upgrade').isVisible(), 'A Starter plan sees the panel explaining why the report is short');
    ok(!(await page2.locator('#r-parts-box').isVisible()), 'A Starter plan gets no per-item breakdown');
    await ctx2.close();
  } finally {
    await browser.close();
  }

} catch (e) {
  fail++;
  console.log('✗ Unexpected error: ' + (e && e.stack ? e.stack : e));
} finally {
  /* ---------- Cleaning up ----------
     In `finally`, because it used to sit at the end of the `try`: one failed
     assertion anywhere above and the fixture stayed behind. And archived rather
     than deleted, because by now the paper has attempts against it — DELETE
     trips the foreign key and leaves a published "Engine test paper" sitting in
     the student catalogue next to the real one, which is exactly what was found
     there. Archiving takes it out of the catalogue and keeps the sittings it
     already owns. */
  if (testId) {
    const r = await admin.req('POST', '/api/admin/tests/' + testId + '/status', { status: 'archived' });
    ok(r.status === 200, 'The fixture paper leaves the catalogue when the suite ends', 'status ' + r.status);
    await admin.req('DELETE', '/api/admin/tests/' + testId);   // succeeds only if nothing sat it
  }
  for (const id of made.concat(speakQ ? [speakQ] : [])) {
    await admin.req('POST', '/api/admin/questions/' + id + '/status', { status: 'retired' });
  }
}

console.log('\n' + (pass + fail ? pass + '/' + (pass + fail) + ' checks passed' : 'no checks ran'));
if (fail) process.exit(1);
