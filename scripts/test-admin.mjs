/**
 * Admin API: sign-in, CSRF, permissions, test CRUD, the question bank,
 * auto-generation, code issuing, CSV export, the audit log.
 *
 * Run: node scripts/test-admin.mjs   (needs the server up)
 */
import { ADMIN_PASSWORD } from './_demo.mjs';
import { launchChromium } from './_browser.mjs';
const BASE = process.env.BASE_URL || 'http://localhost:3000';
const USER = process.env.ADMIN_USERNAME || 'admin';
const PASS = ADMIN_PASSWORD;

const results = [];
const check = (name, ok, extra) => results.push({ name, ok: !!ok, extra });

/* A client that keeps cookies between requests (no browser) */
const jar = new Map();
const cookieHeader = () => [...jar].map(([k, v]) => k + '=' + v).join('; ');
function absorb(res) {
  const raw = res.headers.getSetCookie ? res.headers.getSetCookie() : [];
  for (const c of raw) {
    const [pair] = c.split(';');
    const i = pair.indexOf('=');
    const k = pair.slice(0, i).trim();
    const v = pair.slice(i + 1).trim();
    if (v === '') jar.delete(k); else jar.set(k, v);
  }
}

async function call(method, path, body, opts) {
  opts = opts || {};
  /* No prep_csrf yet, so ask for one: the server mints that cookie whenever it
     serves an HTML page, guests included. Done here rather than making every call
     site remember — forget one and you get a baffling 403. It is also exactly what
     a browser does: load a page before you can submit a form.
     The page used to ask must carry NO redirect guard, or once signed in it
     answers 302 and hands out no cookie at all. */
  if (method !== 'GET' && !opts.noCsrf && !jar.has('prep_csrf')) {
    await call('GET', '/admin/dang-nhap/');
  }
  const headers = { 'Accept': 'application/json' };
  if (jar.size) headers.Cookie = cookieHeader();
  if (body !== undefined) headers['Content-Type'] = 'application/json';
  if (method !== 'GET' && !opts.noCsrf) {
    const t = jar.get('prep_csrf');
    if (t) headers['X-CSRF-Token'] = opts.badCsrf ? 'wrong-token' : decodeURIComponent(t);
  }
  const res = await fetch(BASE + path, {
    method, headers, redirect: 'manual',
    body: body === undefined ? undefined : JSON.stringify(body)
  });
  absorb(res);
  const ct = res.headers.get('content-type') || '';
  const data = ct.includes('json') ? await res.json().catch(() => null) : await res.text();
  return { status: res.status, data, headers: res.headers };
}

const run = async () => {
  /* 1. Signed out, both the API and the admin pages are blocked */
  let r = await call('GET', '/api/admin/reports');
  check('The reports API is blocked when signed out', r.status === 401, 'status ' + r.status);

  r = await call('GET', '/admin/');
  check('/admin/ redirects to sign-in with no session',
    r.status === 302 && String(r.headers.get('location')).includes('/admin/dang-nhap/'),
    'status ' + r.status);

  /* 2. A wrong password is refused */
  r = await call('POST', '/api/admin/login', { username: USER, password: 'wrong-password' });
  check('Refuses a wrong password', r.status === 401, 'status ' + r.status);

  /* 3. Signing in properly.
     The CSRF cookie now exists before sign-in — the server mints it when serving
     the page, and without it the sign-in request above would not have got past
     csrfGuard. So "a CSRF cookie exists" says nothing any more; what is worth
     checking is that signing in ROTATES it. A token planted by an attacker before
     sign-in that survived into the session would defeat double-submit entirely. */
  const csrfBefore = jar.get('prep_csrf');
  check('A CSRF cookie exists before sign-in', !!csrfBefore);
  r = await call('POST', '/api/admin/login', { username: USER, password: PASS });
  check('Administrator sign-in succeeds', r.status === 200 && r.data && r.data.ok, JSON.stringify(r.data));
  check('Sets an HttpOnly session cookie and a CSRF cookie', jar.has('prep_admin') && jar.has('prep_csrf'));
  check('Signing in rotates the CSRF token',
    jar.get('prep_csrf') !== csrfBefore, 'before ' + csrfBefore + ' after ' + jar.get('prep_csrf'));

  /* 4. CSRF: a missing or wrong token is blocked */
  r = await call('POST', '/api/admin/questions', { familyId: 'ielts' }, { noCsrf: true });
  check('Blocks a request with no CSRF token', r.status === 403, 'status ' + r.status);
  r = await call('POST', '/api/admin/questions', { familyId: 'ielts' }, { badCsrf: true });
  check('Blocks a request with a wrong CSRF token', r.status === 403, 'status ' + r.status);

  /* 5. The report returns every block of data */
  r = await call('GET', '/api/admin/reports');
  const rep = r.data;
  check('The report returns every group of figures',
    rep && rep.users && rep.codes && rep.content && rep.revenue &&
    Array.isArray(rep.series) && Array.isArray(rep.byFamily));
  check('The report counts students', rep.users.total > 0, 'total ' + (rep.users && rep.users.total));

  /* 5b. Management dashboard: time window, period comparison, funnel, to-do list */
  check('The default period is 30 days',
    rep.period && rep.period.days === 30 && rep.series.length === 30,
    'days ' + (rep.period && rep.period.days) + ', series ' + rep.series.length);

  for (const d of [7, 30, 90]) {
    r = await call('GET', '/api/admin/reports?days=' + d);
    check('A ' + d + '-day period returns exactly ' + d + ' data points',
      r.data.period.days === d && r.data.series.length === d,
      'series ' + r.data.series.length);
  }

  /* Only 7, 30 and 90 are accepted — an odd parameter must fall back to the
     default rather than build a 100,000-day series and choke the query */
  r = await call('GET', '/api/admin/reports?days=100000');
  check('An odd time window falls back to 30 days',
    r.data.period.days === 30 && r.data.series.length === 30, 'days ' + r.data.period.days);
  r = await call('GET', '/api/admin/reports?days=abc');
  check('A non-numeric time window falls back too', r.data.period.days === 30);

  const rep30 = (await call('GET', '/api/admin/reports?days=30')).data;

  const kpiKeys = ['users', 'redeems', 'revenue', 'orders'];
  check('Every metric carries this period, the previous one, and the change',
    kpiKeys.every(k => rep30.kpi[k] && typeof rep30.kpi[k].value === 'number' &&
      typeof rep30.kpi[k].prev === 'number' &&
      (rep30.kpi[k].delta === null || typeof rep30.kpi[k].delta === 'number')),
    JSON.stringify(rep30.kpi));
  check('A previous period of zero invents no percentage rise',
    kpiKeys.every(k => rep30.kpi[k].prev !== 0 || rep30.kpi[k].delta === null));

  /* A funnel only means something when each step is a subset of the one above.
     A step wider than its parent is a wrong definition, not odd data. */
  check('The funnel has four steps, each with a label',
    Array.isArray(rep30.funnel) && rep30.funnel.length === 4 &&
    rep30.funnel.every(s => s.label && typeof s.value === 'number' && typeof s.rate === 'number'));
  check('The funnel narrows, with no step widening',
    rep30.funnel.every((s, i) => i === 0 || s.value <= rep30.funnel[i - 1].value),
    rep30.funnel.map(s => s.label + '=' + s.value).join(' > '));
  check('Funnel rates are measured against the first step',
    rep30.funnel[0].rate === 100 || rep30.funnel[0].value === 0);

  check('The to-do list is an array, each item with severity, title and path',
    Array.isArray(rep30.todo) &&
    rep30.todo.every(t => ['cao', 'vua', 'thap'].includes(t.sev) && t.title && t.detail &&
      String(t.href).startsWith('/admin/') && t.cta),
    JSON.stringify(rep30.todo.map(t => t.sev)));
  check('The to-do list puts the urgent first',
    (() => {
      const sevRank = { cao: 0, vua: 1, thap: 2 };
      return rep30.todo.every((t, i) => i === 0 || sevRank[t.sev] >= sevRank[rep30.todo[i - 1].sev]);
    })(),
    rep30.todo.map(t => t.sev).join(','));

  check('The per-family table separates published tests',
    rep30.byFamily.every(f => typeof f.published === 'number' && f.published <= f.tests),
    rep30.byFamily.map(f => f.id + ' ' + f.published + '/' + f.tests).join(', '));

  check('Revenue by package returns an array with names and amounts',
    Array.isArray(rep30.revenueByPackage) &&
    rep30.revenueByPackage.every(g => g.name && typeof g.amount === 'number' && g.orders > 0));

  /* 6. Question bank: create, edit, filter, validate input */
  r = await call('POST', '/api/admin/questions', {
    familyId: 'ielts', skill: 'reading', level: 'B2', type: 'mcq',
    prompt: 'Automated test question: pick the synonym of "rapid".',
    options: ['quick', 'slow', 'heavy', 'quiet'], answer: 'quick'
  });
  const qid = r.data && r.data.id;
  check('Creates a new question', r.status === 201 && qid > 0, JSON.stringify(r.data));

  r = await call('POST', '/api/admin/questions', {
    familyId: 'ielts', skill: 'reading', level: 'B2', type: 'mcq',
    prompt: 'A bad item: the answer is not among the options.',
    options: ['a', 'b'], answer: 'z'
  });
  check('Refuses an mcq whose answer is not among its options', r.status === 400, 'status ' + r.status);

  r = await call('POST', '/api/admin/questions', {
    familyId: 'no-such-family', skill: 'reading', level: 'B2', type: 'mcq',
    prompt: 'An item belonging to a family that does not exist', options: ['a', 'b'], answer: 'a'
  });
  check('Refuses an item in a family that does not exist', r.status === 400, 'status ' + r.status);

  r = await call('PUT', '/api/admin/questions/' + qid, {
    familyId: 'ielts', skill: 'reading', level: 'C1', type: 'mcq',
    prompt: 'Automated test question, edited: pick the synonym of "rapid".',
    options: ['quick', 'slow'], answer: 'quick'
  });
  check('Edits a question', r.status === 200);

  r = await call('GET', '/api/admin/questions?family=ielts&skill=reading&level=C1&q=' + encodeURIComponent('edited'));
  check('Filters questions by family, skill, level and keyword',
    r.data && r.data.items.some(i => i.id === qid), 'total ' + (r.data && r.data.total));

  r = await call('POST', '/api/admin/questions/' + qid + '/status', { status: 'retired' });
  check('Retires a question', r.status === 200);

  /* 7. Bulk import: valid rows go in, bad rows are reported */
  r = await call('POST', '/api/admin/questions/bulk', {
    items: [
      { familyId: 'vpet', skill: 'writing', level: 'B1', type: 'essay', prompt: 'Test writing task one, describe the chart.' },
      { familyId: 'vpet', skill: 'writing', level: 'B1', type: 'essay', prompt: 'Test writing task two, give your view.' },
      { familyId: 'vpet', skill: 'writing', level: 'ZZ', type: 'essay', prompt: 'A bad row: the level is not valid.' }
    ]
  });
  check('Bulk import takes the good rows and reports the bad one',
    r.status === 201 && r.data.inserted === 2 && r.data.failed === 1, JSON.stringify(r.data));


  /* 7b. The sample CSV for bulk import */
  r = await call('GET', '/api/admin/questions/template.csv');
  const csvLines = String(r.data).replace(/^\ufeff/, '').split('\r\n');
  check('The sample CSV downloads with the right header',
    r.status === 200 && csvLines[0].startsWith('ky_thi,ky_nang,do_kho,dang_cau,phan_thi,noi_dung'),
    csvLines[0] && csvLines[0].slice(0, 60));
  check('The sample CSV has example rows', csvLines.length >= 4, 'rows ' + csvLines.length);
  /* The sample has to show how to fill the part column, or a user knows only that
     the column exists and not what to write in it. */
  check('The sample CSV has a VPET example with a part letter',
    csvLines.some(l => /^vpet,/.test(l) && /,[A-J],/.test(l)),
    csvLines.find(l => /^vpet,/.test(l)) || 'no vpet row');

  /* 8. Tests: create by hand → add a section → attach items → publish */
  r = await call('POST', '/api/admin/tests', {
    familyId: 'vpet', title: 'Automated test paper', level: 'B1', durationMin: 60
  });
  const testId = r.data && r.data.id;
  check('Creates a test by hand', r.status === 201 && !!testId, JSON.stringify(r.data && r.data.id));

  r = await call('POST', '/api/admin/tests/' + testId + '/status', { status: 'published' });
  check('Will not publish a test with no sections', r.status === 400, 'status ' + r.status);

  r = await call('POST', '/api/admin/tests/' + testId + '/sections', {
    name: 'Reading', skill: 'reading', type: 'Multiple choice', minutes: 30
  });
  const secId = r.data && r.data.id;
  check('Adds a section', r.status === 201 && secId > 0);

  r = await call('POST', '/api/admin/tests/' + testId + '/status', { status: 'published' });
  check('Will not publish while a section has no questions', r.status === 400, 'status ' + r.status);

  const bank = (await call('GET', '/api/admin/questions?family=vpet&skill=reading&status=active&limit=5')).data;
  r = await call('POST', '/api/admin/sections/' + secId + '/items', {
    questionIds: bank.items.map(i => i.id)
  });
  check('Attaches questions to a section', r.status === 200 && r.data.added === bank.items.length, JSON.stringify(r.data));

  // An item of the wrong skill must be skipped, not attached to the section
  const wrongSkill = (await call('GET', '/api/admin/questions?family=vpet&skill=speaking&status=active&limit=2')).data;
  r = await call('POST', '/api/admin/sections/' + secId + '/items', {
    questionIds: wrongSkill.items.map(i => i.id)
  });
  check('Skips an item whose skill differs from the section',
    r.status === 200 && r.data.added === 0 && r.data.skipped === wrongSkill.items.length, JSON.stringify(r.data));

  r = await call('POST', '/api/admin/tests/' + testId + '/status', { status: 'published' });
  check('Publishes once every section has questions', r.status === 200, JSON.stringify(r.data));

  r = await call('GET', '/api/catalog');
  check('A published test appears in the public catalogue',
    r.data.tests.some(t => t.id === testId));

  /* 9. Auto-generating a paper */
  r = await call('POST', '/api/admin/tests/generate', {
    familyId: 'vpet', level: 'B1',
    title: 'VPET auto-generated (test)',
    blueprint: [
      { name: 'Listening', skill: 'listening', type: 'Multiple choice', items: 10, minutes: 20 },
      { name: 'Reading', skill: 'reading', type: 'Multiple choice', items: 10, minutes: 25 }
    ]
  });
  const autoTest = r.data;
  check('Generates a paper from the bank',
    r.status === 201 && autoTest.sections.length === 2 && autoTest.totalItems === 20,
    'items ' + (autoTest && autoTest.totalItems));
  check('A generated paper starts as a draft', autoTest && autoTest.status === 'draft');

  const dup = new Set(autoTest.sections.flatMap(s => s.items.map(i => i.questionId)));
  check('No item is drawn twice into the same paper', dup.size === autoTest.totalItems);

  r = await call('POST', '/api/admin/tests/generate', {
    familyId: 'vpet', level: 'B1',
    blueprint: [{ name: 'Listening', skill: 'listening', type: 'Multiple choice', items: 9999, minutes: 20 }]
  });
  check('Reports a shortage when the bank does not hold enough',
    r.status === 409 && Array.isArray(r.data.shortages) && r.data.shortages.length === 1,
    'status ' + r.status);

  const firstIds = autoTest.sections[0].items.map(i => i.questionId).join(',');
  r = await call('POST', '/api/admin/sections/' + autoTest.sections[0].id + '/reshuffle');
  check('Redraws the items of one section', r.status === 200 && r.data.count === 10);
  const after = await call('GET', '/api/admin/tests/' + autoTest.id);
  check('A redraw keeps the item count', after.data.sections[0].items.length === 10);

  /* ---- The part letter is enforced when attaching, and a redraw keeps groups whole ---- */
  {
    r = await call('POST', '/api/admin/tests', {
      familyId: 'vpet', title: 'Part letter test paper', level: 'B1', durationMin: 10
    });
    const letterTest = r.data && r.data.id;
    r = await call('POST', '/api/admin/tests/' + letterTest + '/sections', {
      name: 'Part J - Story Retellings', skill: 'speaking', type: 'Recording', minutes: 3, part: 'J'
    });
    const secJ = r.data && r.data.id;
    const bankH = (await call('GET', '/api/admin/questions?family=vpet&part=H&status=active&limit=1')).data;
    const bankJ = (await call('GET', '/api/admin/questions?family=vpet&part=J&status=active&limit=1')).data;
    r = await call('POST', '/api/admin/sections/' + secJ + '/items', { questionIds: bankH.items.map(i => i.id) });
    check('A Part H item is not attached to a Part J section — same skill, wrong letter',
      r.status === 200 && r.data.added === 0 && r.data.skipped === 1, JSON.stringify(r.data));
    r = await call('POST', '/api/admin/sections/' + secJ + '/items', { questionIds: bankJ.items.map(i => i.id) });
    check('While a Part J item is', r.status === 200 && r.data.added === 1, JSON.stringify(r.data));

    /* Part G is three questions about ONE recording. A redraw that takes any
       three G items asks about passages that were never played. */
    r = await call('POST', '/api/admin/tests/' + letterTest + '/sections', {
      name: 'Part G - Passage Comprehension', skill: 'listening', type: 'Multiple choice', minutes: 4, part: 'G'
    });
    const secG = r.data && r.data.id;
    const bankG = (await call('GET', '/api/admin/questions?family=vpet&part=G&status=active&limit=200')).data;
    const groupOf = new Map(bankG.items.map(i => [i.id, i.groupKey]));
    const byGroup = new Map();
    for (const i of bankG.items) {
      if (!i.groupKey) continue;
      if (!byGroup.has(i.groupKey)) byGroup.set(i.groupKey, []);
      byGroup.get(i.groupKey).push(i.id);
    }
    const whole = [...byGroup.values()].find(ids => ids.length === 3) || [];
    check('The bank holds at least one whole Part G group to test with', whole.length === 3
      && byGroup.size >= 2, byGroup.size + ' groups');
    r = await call('POST', '/api/admin/sections/' + secG + '/items', { questionIds: whole });
    check('A whole group attaches', r.status === 200 && r.data.added === 3, JSON.stringify(r.data));
    let allWhole = true;
    for (let round = 0; round < 4 && allWhole; round++) {
      r = await call('POST', '/api/admin/sections/' + secG + '/reshuffle');
      const drawn = (await call('GET', '/api/admin/tests/' + letterTest)).data.sections
        .find(s => s.id === secG).items.map(i => groupOf.get(i.questionId));
      if (r.status !== 200 || drawn.length !== 3 || new Set(drawn).size !== 1 || drawn.some(g => !g)) {
        allWhole = false;
        console.log('   redraw ' + round + ' → ' + JSON.stringify(drawn) + ' status ' + r.status);
      }
    }
    check('Redrawing a Part G section keeps its three questions on ONE recording, every time', allWhole);
    await call('DELETE', '/api/admin/tests/' + letterTest);
  }

  /* 10. Issue a batch of codes + revoke + export CSV */
  r = await call('POST', '/api/admin/codes', {
    planId: 'plus-6m', unlockType: 'family', unlockRef: 'toeic', qty: 5,
    expiresAt: '2027-06-30', batchName: 'Automated test batch'
  });
  check('Issues a batch of 5 codes', r.status === 201 && r.data.created.length === 5 && r.data.batchId > 0);
  check('Issued codes carry the chosen plan', r.data.plan && r.data.plan.id === 'plus-6m',
    JSON.stringify(r.data.plan));
  const batchId = r.data.batchId;
  check('Codes match the XXXX-XXXX-XXXX format',
    r.data.created.every(c => /^[A-Z0-9]{4}-[A-Z0-9]{4}-[A-Z0-9]{4}$/.test(c)), r.data.created[0]);
  check('No two codes in a batch are the same', new Set(r.data.created).size === 5);

  r = await call('POST', '/api/admin/codes', { planId: 'plus-6m', unlockType: 'family', unlockRef: 'no-such-family', qty: 2 });
  check('Refuses codes for a family that does not exist', r.status === 400, 'status ' + r.status);

  r = await call('POST', '/api/admin/codes', { planId: 'plus-6m', unlockType: 'bundle', unlockRef: 'ielts', qty: 1 });
  check('Refuses a combo naming only one family', r.status === 400, 'status ' + r.status);
  /* `every(familyExists)` with an async predicate let this one through: a
     Promise is truthy, so any two words made a valid combo. */
  r = await call('POST', '/api/admin/codes', { planId: 'plus-6m', unlockType: 'bundle', unlockRef: 'ielts,no-such-family', qty: 1 });
  check('Refuses a combo naming a family that does not exist', r.status === 400, 'status ' + r.status);
  r = await call('POST', '/api/admin/codes', { planId: 'plus-6m', unlockType: 'bundle', unlockRef: 'ielts,toeic', qty: 1 });
  check('While a combo of two real families is issued', r.status === 201, 'status ' + r.status);

  /* A code with no plan unlocks nothing once redeemed, so it has to be refused at
     issue time — let one through and the mistake surfaces with a buyer holding it. */
  r = await call('POST', '/api/admin/codes', { unlockType: 'family', unlockRef: 'vpet', qty: 1 });
  check('Refuses a code issued with no plan', r.status === 400, 'status ' + r.status);
  r = await call('POST', '/api/admin/codes', { planId: 'no-such-plan', unlockType: 'family', unlockRef: 'vpet', qty: 1 });
  check('Refuses a plan that does not exist', r.status === 400, 'status ' + r.status);

  /* ---- VPET part letters (A-J) ---- */
  console.log('\n\x1b[1m== VPET part letters ==\x1b[0m');

  /* Skill cannot tell the parts apart: B and D are both Writing essays, F and G
     both Listening multiple choice, H and J both spoken. Without the letter, two
     different parts share one pool. */
  r = await call('POST', '/api/admin/questions', {
    familyId: 'vpet', skill: 'writing', level: 'B1', type: 'gap', part: 'A',
    prompt: 'Part A test: She has lived here ____ 2019.', answer: 'since'
  });
  check('Creates a VPET item tagged part A', r.status === 201, 'status ' + r.status);
  const partAId = r.data.id;

  /* What the recording says travels with the item. The bank screen had no
     field for it, so every Part H item written there was marked with nothing
     to compare the transcript against. */
  const stamp = 'Script test ' + Date.now().toString(36);
  r = await call('POST', '/api/admin/questions', {
    familyId: 'vpet', skill: 'speaking', level: 'B1', type: 'speaking', part: 'H',
    prompt: stamp + ': listen, then say the sentence back exactly.',
    script: 'The train leaves at six tomorrow morning.'
  });
  check('Creates a Part H item carrying its transcript', r.status === 201, 'status ' + r.status);
  const scriptId = r.data.id;
  let found = (await call('GET', '/api/admin/questions?q=' + encodeURIComponent(stamp))).data.items.find(i => i.id === scriptId);
  check('The transcript comes back on the bank list', found && found.script === 'The train leaves at six tomorrow morning.',
    JSON.stringify(found && found.script));
  r = await call('PUT', '/api/admin/questions/' + scriptId, {
    familyId: 'vpet', skill: 'speaking', level: 'B1', type: 'speaking', part: 'H',
    prompt: stamp + ': listen, then say the sentence back exactly.',
    script: 'The train leaves at seven.', modelAnswer: 'ignored on H, kept on G'
  });
  found = (await call('GET', '/api/admin/questions?q=' + encodeURIComponent(stamp))).data.items.find(i => i.id === scriptId);
  check('And an edit replaces it', r.status === 200 && found && found.script === 'The train leaves at seven.',
    JSON.stringify(found && found.script));
  r = await call('POST', '/api/admin/questions', {
    familyId: 'vpet', skill: 'reading', level: 'B1', type: 'mcq', part: 'C',
    prompt: stamp + ' reading: which statement is true?', options: ['A', 'B', 'C', 'D'], answer: 'A',
    script: 'A reading item is not heard'
  });
  const readId = r.data.id;
  found = (await call('GET', '/api/admin/questions?q=' + encodeURIComponent(stamp))).data.items.find(i => i.id === readId);
  check('A transcript sent for a part that is read, not heard, is dropped', found && !found.script,
    JSON.stringify(found && found.script));
  await call('POST', '/api/admin/questions/' + scriptId + '/status', { status: 'retired' });
  await call('POST', '/api/admin/questions/' + readId + '/status', { status: 'retired' });

  r = await call('POST', '/api/admin/questions', {
    familyId: 'vpet', skill: 'writing', level: 'B1', type: 'essay', part: 'D',
    prompt: 'Part D test: write a reply to a meeting invitation.'
  });
  check('Creates a VPET part D item (same Writing skill, different part)', r.status === 201, 'status ' + r.status);
  const partDId = r.data.id;

  r = await call('GET', '/api/admin/questions?family=vpet&part=A');
  check('Filtering by part returns only that part',
    r.data.items.length > 0 && r.data.items.every(x => x.part === 'A'),
    JSON.stringify(r.data.items.map(x => x.part)));
  check('A part D item does not appear in the part A list',
    !r.data.items.some(x => x.id === partDId));

  r = await call('GET', '/api/admin/questions?family=vpet&part=none');
  check('The "not tagged yet" filter finds items still missing a letter',
    r.data.items.every(x => x.part === null),
    JSON.stringify(r.data.items.slice(0, 3).map(x => x.part)));

  /* The letter must exist, and must match that part's skill and item type — get it
     wrong and the item sits in the wrong pool, surfacing only mid-exam. */
  r = await call('POST', '/api/admin/questions', {
    familyId: 'vpet', skill: 'writing', level: 'B1', type: 'gap', part: 'Z',
    prompt: 'A test item for a part that does not exist.'
  });
  check('Refuses a part letter that is not in the blueprint', r.status === 400, 'status ' + r.status);

  r = await call('POST', '/api/admin/questions', {
    familyId: 'vpet', skill: 'speaking', level: 'B1', type: 'speaking', part: 'C',
    prompt: 'Part C test item declared as Speaking.'
  });
  check('Refuses a part whose skill is wrong (C is Reading)', r.status === 400, 'status ' + r.status);

  r = await call('POST', '/api/admin/questions', {
    familyId: 'vpet', skill: 'writing', level: 'B1', type: 'essay', part: 'A',
    prompt: 'Part A test item declared as an essay.'
  });
  check('Refuses a part whose item type is wrong (A takes gap-fill only)', r.status === 400, 'status ' + r.status);

  r = await call('POST', '/api/admin/questions', {
    familyId: 'ielts', skill: 'reading', level: 'B1', type: 'mcq', part: 'A',
    options: ['a', 'b'], answer: 'a',
    prompt: 'Test item tagging a part for a family with no part table.'
  });
  check('Refuses a part letter for a family with no part table', r.status === 400, 'status ' + r.status);

  /* The coverage report has to break down per part: a skill-wide total hides one
     part being overfull while another is empty. */
  r = await call('GET', '/api/admin/questions/availability?family=vpet&level=B1');
  const parts = r.data.parts || [];
  check('The availability report breaks down into 10 VPET parts', parts.length === 10, 'saw ' + parts.length);
  const pa = parts.find(x => x.part === 'A');
  check('Part A counts both what it needs and what it holds',
    pa && pa.need === 10 && pa.total >= 1, JSON.stringify(pa));
  check('The report counts untagged items separately', typeof r.data.untagged === 'number',
    String(r.data.untagged));

  /* Format readiness has to go through the per-part pool too, or it promises items
     the generator cannot draw. */
  r = await call('GET', '/api/admin/exam-formats?familyId=vpet');
  const vf = r.data.formats.find(f => f.familyId === 'vpet');
  const secA = vf.sections.find(x => x.part === 'A');
  const secB = vf.sections.find(x => x.part === 'B');
  check('Every section in the format report carries its letter',
    vf.sections.filter(x => x.part).length === 10, String(vf.sections.filter(x => x.part).length));
  check('Part A counts against part A own pool', secA && secA.bank.total >= 1, JSON.stringify(secA && secA.bank));

  /* A and B share the Writing skill but not the pool. This check used to lean on
     part B being empty — an indirect proof, and one that broke the moment the bank
     held real part B items. Count the B-tagged items directly and compare with what
     the format report says: if B borrows from A, the two numbers disagree. */
  const bTagged = (await call('GET', '/api/admin/questions?family=vpet&part=B')).data.total;
  const aTagged = (await call('GET', '/api/admin/questions?family=vpet&part=A')).data.total;
  check('The part B pool equals the number of B-tagged items',
    secB && secB.bank.total === bTagged, JSON.stringify({ pool: secB && secB.bank.total, tagged: bTagged }));
  check('Part B does not borrow part A items despite sharing the Writing skill',
    secB && secB.bank.total !== bTagged + aTagged && aTagged > 0,
    JSON.stringify({ b: bTagged, a: aTagged, pool: secB && secB.bank.total }));

  /* Generating part B may only draw B-tagged items */
  r = await call('POST', '/api/admin/tests/generate', {
    familyId: 'vpet', level: 'B1',
    blueprint: [{ name: 'Part B - Passage Reconstruction', part: 'B', skill: 'writing', type: 'Reconstruction', items: 3, minutes: 9, types: ['essay'] }]
  });
  const genB = (r.data.sections || [])[0];
  check('Generating part B draws only part B items',
    r.status === 201 && genB && genB.items.length === 3 && genB.items.every(i => i.part === 'B'),
    JSON.stringify({ status: r.status, parts: genB && genB.items.map(i => i.part) }));

  /* Depth per level, checked through the generator itself rather than inferred from
     counts. The generator puts exact-level items first, so a part holding only just
     enough at the paper's level returns exactly those every time — a "new" paper
     identical to the old one. Part A holds 20 B2 items for a part needing 10, so two
     draws must not coincide exactly; coinciding 10/10 out of 20 has probability
     1/184,756, which means if it happens the bank is wrong, not the luck. */
  const drawA = async () => {
    const g = await call('POST', '/api/admin/tests/generate', {
      familyId: 'vpet', level: 'B2',
      blueprint: [{ name: 'Part A - Sentence Completion', part: 'A', skill: 'writing', type: 'Gap fill', items: 10, minutes: 10, types: ['gap'] }]
    });
    return ((g.data.sections || [])[0] || {}).items || [];
  };
  const draw1 = await drawA();
  const draw2 = await drawA();
  const sameLevel = draw1.every(i => i.level === 'B2') && draw2.every(i => i.level === 'B2');
  const overlap = draw1.filter(i => draw2.some(j => j.questionId === i.questionId)).length;
  check('A B2 paper draws only B2 items rather than padding from other levels',
    draw1.length === 10 && draw2.length === 10 && sameLevel,
    JSON.stringify({ n1: draw1.length, n2: draw2.length, levels: [...new Set(draw1.concat(draw2).map(i => i.level))] }));
  check('Two draws of part A at B2 do not coincide exactly',
    overlap < 10, 'overlap ' + overlap + '/10');

  /* A shortage must be reported per part, not per skill. Part E is still the
     sharpest place to check even now the bank can fill it: part A holds thirty
     items of the same `gap` type, so a generator pooling by type rather than by
     part letter would happily make up the difference. Asking for more Part E
     items than exist is what forces the question.

     This assertion used to read the other way round - it expected a 409 because
     part E was empty - which made "the audio parts have no items" a thing the
     suite required. It went red the day they were written, which is the right
     way for that kind of assertion to fail. */
  r = await call('POST', '/api/admin/tests/generate', {
    familyId: 'vpet', level: 'B1',
    blueprint: [{ name: 'Part E - Dictation', part: 'E', skill: 'listening', type: 'Dictation', items: 40, minutes: 6, types: ['gap'] }]
  });
  check('A shortage is reported against part E, not filled from another part',
    r.status === 409 && (r.data.shortages || []).length === 1
      && r.data.shortages[0].part === 'E' && r.data.shortages[0].need === 40
      && r.data.shortages[0].have < 40,
    JSON.stringify(r.data.shortages || r.data));

  /* And the part it CAN fill, it fills - from its own pool only. */
  r = await call('POST', '/api/admin/tests/generate', {
    familyId: 'vpet', level: 'B1',
    blueprint: [{ name: 'Part E - Dictation', part: 'E', skill: 'listening', type: 'Dictation', items: 8, minutes: 4, types: ['gap'] }]
  });
  {
    const items = (((r.data.sections || [])[0]) || {}).items || [];
    check('Part E builds eight items, every one of them a part E item',
      r.status === 201 && items.length === 8 && items.every(i => i.part === 'E'),
      JSON.stringify({ status: r.status, n: items.length, parts: [...new Set(items.map(i => i.part))] }));
  }

  /* A section remembers its letter, or a later redraw searches the whole skill and
     pulls in items belonging to another part. */
  r = await call('POST', '/api/admin/tests', {
    familyId: 'vpet', title: 'Part-letter test paper', level: 'B1', durationMin: 30
  });
  const partTestId = r.data.id;
  r = await call('POST', '/api/admin/tests/' + partTestId + '/sections', {
    name: 'Part A - Sentence Completion', skill: 'writing', type: 'Gap fill', minutes: 10, part: 'A'
  });
  check('Adds a section carrying a part letter', r.status === 201, 'status ' + r.status);
  r = await call('GET', '/api/admin/tests/' + partTestId);
  check('The test returns the section letter', r.data.sections[0].part === 'A', String(r.data.sections[0].part));

  r = await call('POST', '/api/admin/tests/' + partTestId + '/sections', {
    name: 'Bad section', skill: 'writing', type: 'Gap fill', minutes: 10, part: 'Z'
  });
  check('Refuses a part letter that does not exist when adding a section', r.status === 400, 'status ' + r.status);

  /* ---- Writing items in the same call as the part ----
     The builder can type items where the part is being built, instead of writing
     them on the bank screen and coming back to pick them out again. Every one is
     still an ordinary bank row: the checks below are as much about that as about
     the route working. */
  const written = [];
  const mcq = (n) => ({
    type: 'mcq', prompt: 'Inline item ' + n + ': which word fits the gap?',
    options: ['alpha', 'beta', 'gamma', 'delta'], answer: 'beta'
  });

  r = await call('POST', '/api/admin/tests/' + partTestId + '/sections', {
    name: 'Part C - typed in place', skill: 'reading', type: 'Multiple choice', minutes: 20, part: 'C',
    questions: [mcq(1), mcq(2)]
  });
  const inlineSid = r.data && r.data.id;
  check('Adds a part and writes its items in one call',
    r.status === 201 && (r.data.questionIds || []).length === 2, JSON.stringify(r.data));
  written.push(...((r.data && r.data.questionIds) || []));

  r = await call('GET', '/api/admin/tests/' + partTestId);
  const inlineSec = (r.data.sections || []).find(s => s.id === inlineSid);
  check('The typed items are attached to the part, in order',
    !!inlineSec && inlineSec.items.length === 2 && /Inline item 1/.test(inlineSec.items[0].prompt),
    inlineSec ? inlineSec.items.length + ' items' : 'section missing');

  r = await call('GET', '/api/admin/questions?family=vpet&skill=reading&part=C&q=Inline%20item%201');
  const banked = ((r.data && r.data.items) || []).find(i => /Inline item 1/.test(i.prompt));
  check('A typed item is an ordinary bank row, filed under the part',
    !!banked && banked.part === 'C' && banked.skill === 'reading' && banked.status === 'active',
    JSON.stringify(banked && { part: banked.part, skill: banked.skill, status: banked.status }));

  /* A batch is all-or-nothing. Somebody who mistyped the seventh of eight items
     must get the seventh back, not a part holding six and no way to tell. */
  const partsBefore = (await call('GET', '/api/admin/tests/' + partTestId)).data.sections.length;
  r = await call('POST', '/api/admin/tests/' + partTestId + '/sections', {
    name: 'Part C - rejected batch', skill: 'reading', type: 'Multiple choice', minutes: 20, part: 'C',
    questions: [mcq(3), { type: 'mcq', prompt: 'Only one option here', options: ['just this'], answer: 'just this' }]
  });
  check('Refuses the whole batch and names the item that is wrong',
    r.status === 400 && r.data.index === 1 && /Item 2/.test(r.data.error || ''), JSON.stringify(r.data));
  const partsAfter = (await call('GET', '/api/admin/tests/' + partTestId)).data.sections.length;
  check('A rejected batch leaves no half-built part behind',
    partsAfter === partsBefore, partsBefore + ' -> ' + partsAfter);
  r = await call('GET', '/api/admin/questions?family=vpet&skill=reading&q=Inline%20item%203');
  check('A rejected batch writes nothing to the bank either',
    !((r.data && r.data.items) || []).some(i => /Inline item 3/.test(i.prompt)));

  /* An item type the blueprint does not allow for that part */
  r = await call('POST', '/api/admin/sections/' + inlineSid + '/questions', {
    questions: [{ type: 'essay', prompt: 'An essay filed under a multiple-choice part' }]
  });
  check('Refuses an item type the part does not take', r.status === 400, JSON.stringify(r.data));

  /* Writing into a part that already exists */
  r = await call('POST', '/api/admin/sections/' + inlineSid + '/questions', {
    questions: [mcq(4)]
  });
  check('Writes new items into a part that already exists',
    r.status === 201 && r.data.added === 1, JSON.stringify(r.data));
  written.push(...((r.data && r.data.questionIds) || []));
  r = await call('GET', '/api/admin/tests/' + partTestId);
  check('The part now holds three items',
    ((r.data.sections || []).find(s => s.id === inlineSid) || {}).items.length === 3);

  r = await call('POST', '/api/admin/sections/' + inlineSid + '/questions', { questions: [] });
  check('Refuses a write with no items in it', r.status === 400, 'status ' + r.status);

  /* A gap fill is marked against its key, so one without a key scores zero for
     everybody and says so nowhere a person would look. */
  r = await call('POST', '/api/admin/tests/' + partTestId + '/sections', {
    name: 'Part A - no key', skill: 'writing', type: 'Gap fill', minutes: 10, part: 'A',
    questions: [{ type: 'gap', prompt: 'The meeting has been ____ until Friday.', answer: '' }]
  });
  check('Refuses a gap fill with no answer key',
    r.status === 400 && /answer key/i.test(r.data.error || ''), JSON.stringify(r.data));

  r = await call('POST', '/api/admin/tests/' + partTestId + '/sections', {
    name: 'Part A - with key', skill: 'writing', type: 'Gap fill', minutes: 10, part: 'A',
    questions: [{ type: 'gap', prompt: 'The meeting has been ____ until Friday.', answer: 'postponed|put off' }]
  });
  check('Accepts a gap fill whose key lists accepted variants', r.status === 201, JSON.stringify(r.data));
  written.push(...((r.data && r.data.questionIds) || []));

  /* Put the bank back the way it was found */
  for (const id of written) await call('POST', '/api/admin/questions/' + id + '/status', { status: 'retired' });

  await call('DELETE', '/api/admin/tests/' + partTestId);

  await call('POST', '/api/admin/questions/' + partAId + '/status', { status: 'retired' });
  await call('POST', '/api/admin/questions/' + partDId + '/status', { status: 'retired' });

  r = await call('GET', '/api/admin/codes?batch=' + batchId);
  check('Lists the codes of a batch', r.data.total === 5, 'total ' + r.data.total);
  const codeId = r.data.items[0].id;

  r = await call('POST', '/api/admin/codes/' + codeId + '/revoke');
  check('Revokes a code', r.status === 200);
  r = await call('POST', '/api/admin/codes/' + codeId + '/revoke');
  check('Will not revoke the same code twice', r.status === 400, 'status ' + r.status);

  /* Refund: revoking withdraws the code, refunding also writes the money back
     down against the order. The distinction matters because `orders.status` is
     what the revenue figure counts — a code handed back while the order still
     reads 'paid' is a sale on the books that was returned in real life. */
  {
    const list = await call('GET', '/api/admin/codes?batch=' + batchId);
    const spare = list.data.items.find(c => c.id !== codeId);

    let x = await call('POST', '/api/admin/codes/' + spare.id + '/refund', { reason: 'test' });
    check('Refuses to refund a code that was never bought online',
      x.status === 400 && /not bought online/i.test(x.data.error || ''), 'status ' + x.status);

    x = await call('POST', '/api/admin/codes/' + spare.id + '/refund', {});
    check('Refuses a refund with no reason — it has to reach the audit log',
      x.status === 400, 'status ' + x.status);

    x = await call('POST', '/api/admin/codes/999999/refund', { reason: 'test' });
    check('Refunding a code that does not exist is a 404', x.status === 404, 'status ' + x.status);
  }

  r = await call('GET', '/api/admin/codes/export?batch=' + batchId);
  check('Exports the code list as CSV',
    typeof r.data === 'string' && r.data.split('\r\n').length === 6, 'rows ' + String(r.data).split('\r\n').length);
  /* This file gets handed round a class: naming the wrong plan misleads the buyer. */
  check('The CSV has a plan column and names the plan correctly',
    /(^|,)goi(,|$)/.test(String(r.data).split('\r\n')[0].replace(/^\uFEFF/, '')) &&
    String(r.data).split('\r\n')[1].includes('Plus'),
    String(r.data).split('\r\n')[1]);

  /* 11. Binding a code to one account.
     A code bound to an account needs a real account behind it — one that registered
     with an email AND a phone. Make one with a phone to bind to, and one without to
     prove the requirement is enforced. */
  const bindStamp = String(process.hrtime.bigint()).slice(-9);
  r = await call('POST', '/api/admin/users', {
    name: 'Bound Student', email: 'bound.' + bindStamp + '@thu-nghiem.vn', phone: '0912345678'
  });
  const uid = r.data.user && r.data.user.id;
  check('Made an account with a phone to bind a code to', r.status === 201 && uid > 0, 'status ' + r.status);

  /* Activate now (the default when binding to an account): the term starts today,
     so the access deadline is set and in the future. */
  r = await call('POST', '/api/admin/codes', { planId: 'starter-3m', unlockType: 'family', unlockRef: 'pte', qty: 1, userId: uid });
  check('Activates a code on an account now by default', r.status === 201 && r.data.created.length === 1 && r.data.reserved === false,
    'status ' + r.status + ', reserved ' + (r.data && r.data.reserved));
  const grantedCode = r.data.created[0];
  const detail = (await call('GET', '/api/admin/users/' + uid)).data;
  check('The activated code shows in the student profile', detail.codes.some(c => c.code === grantedCode));
  r = await call('GET', '/api/admin/codes?q=' + encodeURIComponent(grantedCode));
  const granted = r.data.items.find(c => c.code === grantedCode);
  check('An activated code has an access deadline counted from now',
    !!(granted && granted.accessExpiresAt) && new Date(granted.accessExpiresAt) > new Date(),
    granted && granted.accessExpiresAt);
  check('The admin table shows the plan name of a code', granted && /Starter/.test(granted.label),
    granted && granted.label);

  /* Reserve: bound to the account but left for them to activate — unused, no term
     yet, and marked reserved in the list because it already carries an owner. */
  r = await call('POST', '/api/admin/codes', { planId: 'plus-6m', unlockType: 'family', unlockRef: 'vpet', qty: 1, userId: uid, reserve: true });
  check('Reserves a code to an account when asked', r.status === 201 && r.data.reserved === true && !!r.data.boundTo,
    'status ' + r.status + ', reserved ' + (r.data && r.data.reserved));
  const reservedCode = r.data.created[0];
  r = await call('GET', '/api/admin/codes?q=' + encodeURIComponent(reservedCode));
  const reserved = r.data.items.find(c => c.code === reservedCode);
  check('A reserved code is unused, carries its account, and has no term yet',
    reserved && reserved.status === 'unused' && reserved.user && reserved.user.id === uid && !reserved.accessExpiresAt,
    reserved && JSON.stringify({ status: reserved.status, user: !!reserved.user, exp: reserved.accessExpiresAt }));

  /* An account with no phone cannot be bound to — the code would go to something
     only half-reachable. */
  r = await call('POST', '/api/admin/users', { name: 'No Phone', email: 'nophone.' + bindStamp + '@thu-nghiem.vn' });
  const noPhoneId = r.data.user && r.data.user.id;
  r = await call('POST', '/api/admin/codes', { planId: 'plus-6m', unlockType: 'family', unlockRef: 'vpet', qty: 1, userId: noPhoneId });
  check('Refuses to bind a code to an account with no phone', r.status === 400, 'status ' + r.status);

  /* 12. Managing students */
  r = await call('POST', '/api/admin/users/' + uid + '/status', { status: 'locked' });
  check('Locks a student account', r.status === 200);
  r = await call('POST', '/api/admin/users/' + uid + '/status', { status: 'active' });
  check('Unlocks a student account', r.status === 200);
  r = await call('POST', '/api/admin/users/' + uid + '/status', { status: 'xoa-het' });
  check('Refuses an invalid student status', r.status === 400, 'status ' + r.status);

  /* 12b. Making an account from this side, and looking after it.
     A centre needs the opposite of self-registration: somebody pays at a desk,
     or a class of thirty arrives at once. */
  const newEmail = 'hocvien.tao.' + String(process.hrtime.bigint()).slice(-9) + '@thu-nghiem.vn';
  r = await call('POST', '/api/admin/users', {
    name: 'Nguyen Van Tao', email: newEmail, planId: 'plus-6m', note: 'made by the test'
  });
  check('An administrator can create a student account', r.status === 201, 'status ' + r.status);
  const madeId = r.data.user && r.data.user.id;
  const madePw = r.data.password;
  check('and is shown the generated password exactly once',
    typeof madePw === 'string' && madePw.length >= 10, JSON.stringify(madePw));
  check('The term asked for is granted with the account',
    r.data.grant && r.data.grant.plan === 'plus-6m' && r.data.grant.months === 3,
    JSON.stringify(r.data.grant));

  /* The account has to be usable, which is the only thing that matters. Created
     verified on purpose: an unverified account made by an administrator would
     lock the person out of the thing just made for them. */
  const madeIn = await fetch(BASE + '/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Cookie: cookieHeader(), 'X-CSRF-Token': decodeURIComponent(jar.get('prep_csrf')) },
    body: JSON.stringify({ username: newEmail, password: madePw })
  });
  check('The student can sign in with that password straight away', madeIn.status === 200,
    'status ' + madeIn.status);

  const madeDetail = (await call('GET', '/api/admin/users/' + madeId)).data;
  check('The new account shows as verified and active',
    madeDetail.user.verified === true && madeDetail.user.status === 'active',
    JSON.stringify({ v: madeDetail.user.verified, s: madeDetail.user.status }));
  check('and holds the code the term was granted through', madeDetail.codes.length === 1,
    'codes ' + madeDetail.codes.length);

  /* Editing an account: a phone can be added or fixed from the admin side, which
     is what lets an older account be brought up to the standard a bound code needs. */
  check('An admin-made account starts with no phone on file', !madeDetail.user.phone,
    JSON.stringify(madeDetail.user.phone));
  r = await call('PUT', '/api/admin/users/' + madeId, { phone: '098 765 4321' });
  check('An administrator can set the phone on an account', r.status === 200, 'status ' + r.status);
  const withPhone = (await call('GET', '/api/admin/users/' + madeId)).data;
  check('The phone comes back normalised', withPhone.user.phone === '0987654321', withPhone.user.phone);
  /* Interests are exam families. `.filter(familyExists)` with an async predicate
     kept everything it was given, so a made-up family landed in the profile. */
  r = await call('PUT', '/api/admin/users/' + madeId, { interests: ['vpet', 'no-such-family', 'vpet'] });
  const withInterests = (await call('GET', '/api/admin/users/' + madeId)).data;
  check('Only real exam families are kept as interests, once each',
    r.status === 200 && JSON.stringify(withInterests.user.interests) === JSON.stringify(['vpet']),
    JSON.stringify(withInterests.user.interests));

  r = await call('PUT', '/api/admin/users/' + madeId, { phone: '12' });
  check('A malformed phone is refused on edit', r.status === 400, 'status ' + r.status);
  r = await call('POST', '/api/admin/codes', { planId: 'plus-6m', unlockType: 'family', unlockRef: 'vpet', qty: 1, userId: madeId, reserve: true });
  check('With a phone on file the account can now have a code reserved to it', r.status === 201,
    'status ' + r.status);

  r = await call('POST', '/api/admin/users', { name: 'Trung lap', email: newEmail });
  check('The same email twice is refused', r.status === 409, 'status ' + r.status);
  r = await call('POST', '/api/admin/users', { name: 'Sai', email: 'khong-phai-email' });
  check('A malformed email is refused', r.status === 400);
  r = await call('POST', '/api/admin/users', { name: 'Yeu', email: 'y.' + newEmail, password: 'short' });
  check('A password that a student could not use is refused here too', r.status === 400,
    'the rule lives in server/auth.js so both paths cannot drift');
  r = await call('POST', '/api/admin/users', { name: 'Goi la', email: 'g.' + newEmail, planId: 'khong-co' });
  check('A plan that does not exist is refused rather than silently skipped', r.status === 400);

  /* Bulk create — a class or a company intake at once, sent as rows the browser
     has already split from a pasted list or a CSV. Bad rows are skipped, not fatal. */
  const bulkStamp = String(process.hrtime.bigint()).slice(-9);
  r = await call('POST', '/api/admin/users/bulk', {
    planId: 'plus-6m',
    rows: [
      { line: 1, email: 'bulk1.' + bulkStamp + '@thu-nghiem.vn', name: 'Bulk One', phone: '0912345678' },
      { line: 2, email: 'bulk2.' + bulkStamp + '@thu-nghiem.vn', name: 'Bulk Two', phone: '0987654321' },
      { line: 3, email: 'not-an-email', name: 'No Email', phone: '0912345678' },
      { line: 4, email: 'bulk4.' + bulkStamp + '@thu-nghiem.vn', name: 'No Phone', phone: '' }
    ]
  });
  check('Bulk create makes the valid rows and skips the rest',
    r.status === 201 && r.data.created.length === 2 && r.data.errors.length === 2,
    'created ' + (r.data.created && r.data.created.length) + ', errors ' + (r.data.errors && r.data.errors.length));
  check('Each created account comes back with a one-time password',
    r.data.created.every(c => typeof c.password === 'string' && c.password.length >= 10));
  check('The chosen term is applied to the batch', r.data.plan && r.data.plan.id === 'plus-6m',
    JSON.stringify(r.data.plan));
  {
    const bulkLogin = await fetch(BASE + '/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Cookie: cookieHeader(), 'X-CSRF-Token': decodeURIComponent(jar.get('prep_csrf')) },
      body: JSON.stringify({ username: r.data.created[0].email, password: r.data.created[0].password })
    });
    check('A bulk-created account can sign in straight away', bulkLogin.status === 200, 'status ' + bulkLogin.status);
  }

  /* Granting a second term: entitlementOf() takes the furthest expiry and adds
     the attempts up, so this must extend reach rather than replace it. */
  const beforeGrant = (await call('GET', '/api/admin/users/' + madeId)).data;
  r = await call('POST', '/api/admin/users/' + madeId + '/grant', { planId: 'starter-3m' });
  check('A term can be granted on its own', r.status === 201, 'status ' + r.status);
  check('and comes back with the date access now runs to',
    typeof r.data.accessUntil === 'string' && new Date(r.data.accessUntil) > new Date(),
    r.data.accessUntil);
  const afterGrant = (await call('GET', '/api/admin/users/' + madeId)).data;
  check('The account holds one more code than before',
    afterGrant.codes.length === beforeGrant.codes.length + 1,
    beforeGrant.codes.length + ' → ' + afterGrant.codes.length);
  check('The stronger plan still decides what is unlocked, not the newer one',
    r.data.entitlement && r.data.entitlement.planId === 'plus-6m',
    r.data.entitlement && r.data.entitlement.planId);

  r = await call('POST', '/api/admin/users/999999/grant', { planId: 'starter-3m' });
  check('Granting to a student who does not exist is a 404', r.status === 404, 'status ' + r.status);
  r = await call('POST', '/api/admin/users/' + madeId + '/grant', { planId: 'nothing' });
  check('and an unknown term is refused', r.status === 400);

  /* Resetting a password must also end every session that account holds —
     the reason for resetting is usually that somebody should not still be in. */
  const beforeReset = await fetch(BASE + '/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Cookie: cookieHeader(), 'X-CSRF-Token': decodeURIComponent(jar.get('prep_csrf')) },
    body: JSON.stringify({ username: newEmail, password: madePw })
  });
  check('The old password works before the reset', beforeReset.status === 200);
  r = await call('POST', '/api/admin/users/' + madeId + '/password');
  check('The password can be reset from the admin side', r.status === 200);
  const freshPw = r.data.password;
  check('and a new one is generated and shown once',
    typeof freshPw === 'string' && freshPw.length >= 10 && freshPw !== madePw);
  const oldTry = await fetch(BASE + '/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Cookie: cookieHeader(), 'X-CSRF-Token': decodeURIComponent(jar.get('prep_csrf')) },
    body: JSON.stringify({ username: newEmail, password: madePw })
  });
  check('The old password stops working', oldTry.status === 401, 'status ' + oldTry.status);
  const newTry = await fetch(BASE + '/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Cookie: cookieHeader(), 'X-CSRF-Token': decodeURIComponent(jar.get('prep_csrf')) },
    body: JSON.stringify({ username: newEmail, password: freshPw })
  });
  check('and the new one works', newTry.status === 200, 'status ' + newTry.status);

  r = await call('POST', '/api/admin/users/' + madeId + '/password', { password: 'AChosenOne123' });
  check('A password can also be chosen rather than generated', r.status === 200);
  check('and then nothing is echoed back, because the caller already knows it',
    r.data.password === null, JSON.stringify(r.data.password));

  /* 12c. The same three things, in a real browser.
     Every control added above lives behind a modal, and a modal is exactly what
     a screenshot pass never opens — the second-factor card sat unrendered by
     the gate for a whole turn for that reason. So the buttons are clicked. */
  {
    const browser = await launchChromium({ args: ['--no-sandbox'] });
    try {
      const ctx = await browser.newContext({ viewport: { width: 1440, height: 950 } });
      const page = await ctx.newPage();
      const uiErrors = [];
      page.on('pageerror', e => uiErrors.push(String(e.message)));

      await page.goto(BASE + '/admin/dang-nhap/', { waitUntil: 'networkidle' });
      await page.fill('#username', USER);
      await page.fill('#password', PASS);
      await page.click('#submit');
      /* Wait to LEAVE the sign-in page, not to arrive somewhere under /admin/.
         This used to wait on a glob matching any path under the admin area, and
         /admin/dang-nhap/ is a path under the admin area — so the wait was
         satisfied by the page the browser was already sitting on and returned
         without waiting for anything at all. The next line then raced the
         sign-in POST. When the goto won, the browser was sent back to the
         sign-in screen and the suite threw "the admin session was not accepted"
         with an EMPTY error banner, because there had been no error — only a
         request that had not finished. When the sign-in won, the goto came back
         ERR_ABORTED and a retry papered over it. Neither is the session
         failing, and both read exactly like it.

         The predicate form every other browser suite here uses (test-catalog,
         test-learn, test-totp, shot-admin) waits for what this actually wants. */
      await page.waitForURL(u => !u.pathname.includes('dang-nhap'), { timeout: 15000 });
      await page.goto(BASE + '/admin/hoc-vien/', { waitUntil: 'networkidle' });
      await page.waitForTimeout(1000);

      /* Say where we actually are before clicking anything on it.
         `#new-student` is static markup in users.html, so a click that waits
         thirty seconds for it is not a slow render — it is a different page,
         and the likeliest different page is the sign-in screen, because the
         session did not survive. That failure used to surface as a bare
         TimeoutError naming a locator, which says nothing about why. */
      const landedOn = new URL(page.url()).pathname;
      if (landedOn !== '/admin/hoc-vien/') {
        const banner = await page.locator('#error, .banner-error, [role=alert]').first()
          .innerText().catch(() => '');
        throw new Error(
          `expected /admin/hoc-vien/ but the browser is on ${landedOn}` +
          (landedOn.includes('dang-nhap') ? ' — the admin session was not accepted' : '') +
          (banner ? `; the page says: ${banner.trim().slice(0, 120)}` : ''));
      }

      check('The students screen offers to create one', await page.locator('#new-student').count() === 1);
      await page.click('#new-student', { timeout: 5000 });
      await page.waitForTimeout(300);
      const terms = await page.locator('#ns-plan option').allInnerTexts();
      /* Built from the price list rather than typed in, so a fourth plan would
         appear here by itself and a renamed one cannot go stale. */
      check('and the term list is the three plans, read from the server',
        terms.length === 4 && terms.join(' ').includes('1 month') &&
        terms.join(' ').includes('3 months') && terms.join(' ').includes('6 months'),
        terms.join(' | '));

      const uiEmail = 'giao.dien.' + String(process.hrtime.bigint()).slice(-9) + '@thu-nghiem.vn';
      await page.fill('#ns-name', 'Tran Thi Giao Dien');
      await page.fill('#ns-email', uiEmail);
      await page.selectOption('#ns-plan', 'pro-12m');
      await page.click('#ns-save');
      await page.waitForTimeout(1400);

      check('Creating one from the screen shows the password exactly once',
        await page.locator('#once-pw').count() === 1);
      const uiPw = (await page.locator('#once-pw').innerText()).trim();
      check('and it is a password, not an empty box', uiPw.length >= 10, uiPw.slice(0, 4) + '…');
      await page.click('#once-done');
      await page.waitForTimeout(500);

      await page.fill('#q', uiEmail);
      await page.waitForTimeout(900);
      await page.click('[data-open]');
      await page.waitForTimeout(900);
      const grants = await page.locator('#u-grants button').allInnerTexts();
      check('An existing account can be given a term from its own panel',
        grants.length === 3, grants.join(' | '));
      check('and its password reset from there', await page.locator('#u-pass').count() === 1);
      check('No page error anywhere in that flow', uiErrors.length === 0, uiErrors.join(' | '));
    } finally {
      await browser.close();
    }
  }

  /* 13. Settings + packages on sale */
  r = await call('PUT', '/api/admin/settings', { settings: { 'platform.notice': 'Automated test' } });
  check('Saves the platform settings', r.status === 200);
  r = await call('GET', '/api/admin/settings');
  check('The setting is stored correctly', r.data.settings['platform.notice'] === 'Automated test');
  r = await call('PUT', '/api/admin/settings', { settings: { 'brand.name': 'X', 'hack.key': 'y' } });
  const after2 = (await call('GET', '/api/admin/settings')).data;
  check('Ignores a settings key outside the allow list', !('hack.key' in after2.settings));
  await call('PUT', '/api/admin/settings', { settings: { 'brand.name': 'VPET Prep', 'platform.notice': '' } });

  r = await call('PUT', '/api/admin/packages/pk-single', { price: 59000, active: true });
  check('Edits the price of a package', r.status === 200);
  const pkg = (await call('GET', '/api/admin/settings')).data.packages.find(p => p.id === 'pk-single');
  check('The package price is stored', pkg.price === 59000, 'price ' + pkg.price);
  await call('PUT', '/api/admin/packages/pk-single', { price: 49000, active: true });

  /* 14. Password change: refuse a weak one, refuse a wrong current one */
  r = await call('POST', '/api/admin/password', { current: PASS, next: 'ngan' });
  check('Refuses a new password that is too short', r.status === 400, 'status ' + r.status);
  r = await call('POST', '/api/admin/password', { current: 'wrong-one', next: 'MatKhauMoi123' });
  check('Refuses a wrong current password', r.status === 403, 'status ' + r.status);

  /* 14b. Editing your own profile — the name behind the popover in the chrome.
     Renamed, then put back so the acceptance screenshots show the usual name. */
  const origAdminName = (await call('GET', '/api/admin/me')).data.admin.name;
  r = await call('POST', '/api/admin/me', { name: 'Renamed Admin' });
  check('An administrator can rename their own profile', r.status === 200 && r.data.name === 'Renamed Admin',
    JSON.stringify(r.data));
  check('The rename is reflected in /admin/me',
    (await call('GET', '/api/admin/me')).data.admin.name === 'Renamed Admin');
  r = await call('POST', '/api/admin/me', { name: '   ' });
  check('An empty name is refused', r.status === 400, 'status ' + r.status);
  await call('POST', '/api/admin/me', { name: origAdminName });

  /* 15. The audit log records what happened */
  r = await call('GET', '/api/admin/audit?limit=50');
  const actions = r.data.items.map(a => a.action);
  check('The audit log records test creation, generation and code issuing',
    ['test.create', 'test.generate', 'code.issue', 'code.revoke'].every(a => actions.includes(a)),
    actions.slice(0, 6).join(', '));

  /* 16. Clean up the test data.
     Archive BEFORE deleting. DELETE refuses a test that codes point at, and
     trips a foreign key once anything has been sat against it - and the suite
     ignored the result, so "Automated test paper" stayed PUBLISHED in the
     student catalogue with a section called Reading and no part letter. Archiving
     first means the catalogue is clean whether or not the row can go. */
  await call('POST', '/api/admin/tests/' + testId + '/status', { status: 'archived' });
  await call('POST', '/api/admin/tests/' + autoTest.id + '/status', { status: 'archived' });
  await call('DELETE', '/api/admin/tests/' + testId);
  await call('DELETE', '/api/admin/tests/' + autoTest.id);

  const left = await call('GET', '/api/admin/tests/' + testId);
  check('The test paper is gone, or at least out of the catalogue',
    left.status === 404 || (left.data && left.data.status === 'archived'),
    'status ' + left.status + ' ' + JSON.stringify(left.data && left.data.status));

  /* 16b. Audio on a question (VPET parts E, F, G, H, J)
     Raw bytes rather than multipart — the server reads the body whole. */
  async function sendAudio(id, buf, o) {
    o = o || {};
    const headers = { 'Accept': 'application/json', 'Content-Type': o.type || 'audio/mpeg' };
    if (jar.size) headers.Cookie = cookieHeader();
    if (!o.noCsrf) {
      const t = jar.get('prep_csrf');
      if (t) headers['X-CSRF-Token'] = decodeURIComponent(t);
    }
    const res = await fetch(BASE + '/api/admin/questions/' + id + '/audio', { method: 'POST', headers, body: buf });
    absorb(res);
    const ct = res.headers.get('content-type') || '';
    return { status: res.status, data: ct.includes('json') ? await res.json().catch(() => null) : null };
  }

  /* Enough to pass the format check: a real MP3 opens with "ID3" or with an 11-bit
     frame sync. The check looks at those bytes rather than trusting content-type. */
  const mp3 = Buffer.concat([Buffer.from('ID3\x03\x00\x00\x00\x00\x00\x00', 'binary'), Buffer.alloc(2048, 7)]);
  const notAudio = Buffer.from('MZ\x90\x00 this is an executable, not a song', 'binary');

  r = await call('POST', '/api/admin/questions', {
    familyId: 'vpet', skill: 'listening', level: 'B1', type: 'mcq',
    prompt: 'Audio fixture question', options: ['a', 'b', 'c', 'd'], answer: 'a'
  });
  const audioQid = r.data && r.data.id;
  check('Creates a question to attach audio to', !!audioQid, 'status ' + r.status);

  r = await sendAudio(audioQid, mp3);
  check('Uploads a valid MP3', r.status === 201 && r.data && r.data.bytes === mp3.length,
    'status ' + r.status + ' ' + JSON.stringify(r.data));

  r = await sendAudio(audioQid, notAudio);
  check('Refuses a file merely claiming to be audio/mpeg', r.status === 400, 'status ' + r.status);

  r = await sendAudio(audioQid, mp3, { noCsrf: true });
  check('An upload with no CSRF is blocked', r.status === 403, 'status ' + r.status);

  r = await sendAudio(audioQid, mp3, { type: 'application/pdf' });
  check('Refuses a content-type that is not audio', r.status === 400 || r.status === 415, 'status ' + r.status);

  {
    const res = await fetch(BASE + '/api/admin/questions/' + audioQid + '/audio', { headers: { Cookie: cookieHeader() } });
    const buf = Buffer.from(await res.arrayBuffer());
    check('Downloads exactly the bytes that were stored',
      res.status === 200 && res.headers.get('content-type') === 'audio/mpeg' && buf.equals(mp3),
      'status ' + res.status + ' len ' + buf.length);
    check('Exam audio is never shared-cached', /no-store/.test(res.headers.get('cache-control') || ''),
      res.headers.get('cache-control'));
  }

  r = await call('GET', '/api/admin/questions?family=vpet&skill=listening&limit=200');
  check('The question list reports audio without exposing the storage key',
    (r.data.items || []).some(x => x.id === audioQid && x.hasAudio && x.audioBytes === mp3.length) &&
    !JSON.stringify(r.data).includes('audio_key'),
    'no hasAudio flag');

  /* Everything the blueprint says needs sound, so the format's own count can be
     checked against a second, independent path to the same fact. */
  const audioLetters = ['E', 'F', 'G', 'H', 'J'];
  /* The whole bank, paged.
   *
   * The group checks below are meaningless against a partial list: the item
   * carrying a passage falls off the end and the group reads as "0 recordings",
   * which looks exactly like a real fault. This has now caused that false alarm
   * twice.
   *
   * The second time is the instructive one. A guard was already here for it,
   * and it could not fire: it asked for `limit=500` on the belief that 500 was
   * "the API's own cap" and passed when fewer than 500 came back — but the API
   * clamps limit to 200. So it requested 500, received 200 of 402, compared 200
   * against 500, and reported the list complete. A truncation guard that
   * measures the request instead of the answer cannot detect truncation.
   *
   * So it is paged against `total`, which the endpoint returns, and the check
   * is that everything claimed was actually collected. That is correct at any
   * bank size and does not need a constant kept in step with the server. */
  const wholeBank = [];
  let bankTotal = 0;
  for (let offset = 0; ; offset += 200) {
    const page = await call('GET', '/api/admin/questions?family=vpet&limit=200&offset=' + offset);
    const got = (page.data && page.data.items) || [];
    bankTotal = (page.data && page.data.total) || 0;
    wholeBank.push(...got);
    if (!got.length || wholeBank.length >= bankTotal || offset > 5000) break;
  }
  const r2 = { data: { items: wholeBank, total: bankTotal } };
  check('The whole VPET bank was collected, so the checks below see all of it',
    wholeBank.length === bankTotal && bankTotal > 0,
    wholeBank.length + ' of ' + bankTotal + ' collected');
  r2.data.items = (r2.data.items || []).filter(x => audioLetters.includes(x.part) && x.status === 'active');

  r = await call('GET', '/api/admin/exam-formats?familyId=vpet');
  {
    const list = Array.isArray(r.data) ? r.data : (r.data.items || r.data.formats || []);
    const vpet = list.find(f => f.id === 'vpet-full');
    check('The VPET format has exactly 58 items across 10 parts', !!vpet && vpet.totalItems === 58 && vpet.sections.length === 10,
      vpet ? vpet.totalItems + ' items / ' + vpet.sections.length + ' parts' : 'format not found');
    const audioParts = vpet ? vpet.sections.filter(s => s.needsAudio) : [];
    check('The five audio parts are marked', audioParts.length === 5, audioParts.length + ' parts');
    /* `audioShortBy` counts items in an audio part with no recording attached, and
       `ready` is false while any part is short of either items or sound. Both used
       to be asserted in their unhappy state, because the bank had no recordings at
       all; now that it has, the same two fields have to agree the other way. The
       cross-check keeps them honest - a hardcoded zero would pass the first line
       and fail the second. */
    check('The format reports itself ready, with no audio missing',
      !!vpet && vpet.audioShortBy === 0 && vpet.shortBy === 0 && vpet.ready === true,
      vpet ? JSON.stringify({ shortBy: vpet.shortBy, audioShortBy: vpet.audioShortBy, ready: vpet.ready }) : '-');

    /* Counted per GROUP where there is one. Part G is a passage and three
       questions about it: the passage plays once, so exactly one of the three
       carries a recording and the other two are correctly silent. Asserting
       sound on every item would demand the passage be played three times.
       Ungrouped items still each need their own. */
    const audioItems = r2.data.items || [];
    const mute = audioItems.filter(x => !x.hasAudio && !x.groupKey);
    check('And the question list agrees: every ungrouped audio item has sound',
      mute.length === 0, mute.map(x => x.id).join(', '));

    const groups = {};
    for (const x of audioItems) if (x.groupKey) (groups[x.groupKey] = groups[x.groupKey] || []).push(x);
    const groupKeys = Object.keys(groups);
    check('Grouped items exist and are reported with their group',
      groupKeys.length > 0, groupKeys.length + ' group(s)');
    const wrongCount = groupKeys.filter(g => groups[g].filter(x => x.hasAudio).length !== 1);
    /* Say WHICH items and what each one reported. "g-b1-3 has 0" is true and
       useless: it does not distinguish a recording that was never attached from
       one something detached mid-run, and it does not name the item to go and
       look at. This failed once in a gate run and left nothing to diagnose it
       from, which is how a real fault gets written off as flakiness. */
    check('And each group carries exactly one recording, not three',
      wrongCount.length === 0,
      wrongCount.map(g => g + ' [' + groups[g]
        .map(x => (x.extKey || x.id) + (x.hasAudio ? '=' + x.audioBytes + 'b' : '=none'))
        .join(' ') + ']').join('; '));
  }

  r = await call('DELETE', '/api/admin/questions/' + audioQid + '/audio');
  check('Audio can be removed', r.status === 200, 'status ' + r.status);
  {
    const res = await fetch(BASE + '/api/admin/questions/' + audioQid + '/audio', { headers: { Cookie: cookieHeader() } });
    check('Once removed it can no longer be downloaded', res.status === 404, 'status ' + res.status);
  }

  /* 16c. A family that is not ready: the API refuses to publish its tests */
  r = await call('GET', '/api/admin/exam-formats');
  {
    const list = Array.isArray(r.data) ? r.data : (r.data.items || r.data.formats || []);
    const parked = list.find(f => f.familyStatus === 'coming_soon');
    check('The format screen reports which family is not ready', !!parked,
      list.map(f => f.familyId + ':' + f.familyStatus).join(', '));
  }

  /* No parked-family test is seeded any more — the platform is VPET-only — so
     make one for a coming_soon family and prove the publish guard still refuses it. */
  {
    r = await call('POST', '/api/admin/tests',
      { familyId: 'toeic', title: 'Parked-family draft', level: 'B1', durationMin: 60 });
    const parkedTestId = r.data && r.data.id;
    check('A draft test can be created for a parked family', !!parkedTestId && r.data.status !== 'published',
      'status ' + r.status + ' ' + JSON.stringify(r.data));

    if (parkedTestId) {
      r = await call('POST', '/api/admin/tests/' + parkedTestId + '/status', { status: 'published' });
      check('A test of a parked family cannot be published',
        r.status === 400 && /is not ready yet/.test(String(r.data && r.data.error)),
        'status ' + r.status + ' ' + JSON.stringify(r.data));

      const after = await call('GET', '/api/admin/tests/' + parkedTestId);
      check('It stays in draft after being refused',
        after.data && after.data.status === 'draft', after.data && after.data.status);
    }
  }

  /* Deliberately a bare fetch, with no session: this is the STUDENT's view of
     the catalogue, and since 2026-08-13 that is VPET and nothing else. */
  r = await fetch(BASE + '/api/catalog').then(x => x.json());
  {
    const readyIds = new Set(r.families.filter(f => f.status !== 'coming_soon').map(f => f.id));
    check('The student catalogue holds only tests of open families',
      r.tests.every(t => readyIds.has(t.familyId)),
      r.tests.filter(t => !readyIds.has(t.familyId)).map(t => t.id).join(', '));
    check('A signed-out visitor is shown only the open families',
      r.families.length === 1 && r.families[0].id === 'vpet',
      r.families.map(f => f.id + ':' + f.status).join(', '));
  }
  {
    /* …but an administrator still gets all six. They are the person who has to
       manage a parked family, and a screen that cannot see one cannot reopen
       it. Same endpoint, different answer, decided by the session. */
    const asAdmin = await call('GET', '/api/catalog');
    check('An administrator still sees all 6 families, with their status',
      asAdmin.data.families.length === 6 && asAdmin.data.families.every(f => f.status),
      asAdmin.data.families.map(f => f.id + ':' + f.status).join(', '));
    check('and the parked ones are exactly the five that are not VPET',
      asAdmin.data.families.filter(f => f.status === 'coming_soon').length === 5,
      asAdmin.data.families.filter(f => f.status === 'coming_soon').map(f => f.id).join(', '));
  }

  /* 16c. View as a student — preview the student site on the demo account without
     leaving the admin session, and raise the flag the "back to admin" banner reads. */
  r = await call('POST', '/api/admin/preview-student');
  check('An administrator can start a student preview', r.status === 200, 'status ' + r.status);
  check('The preview raises the banner flag', jar.get('prep_preview') === '1', String(jar.get('prep_preview')));
  const asStudent = await call('GET', '/api/me');
  check('The preview browser is now the demo student',
    asStudent.data.user && asStudent.data.user.username === 'student',
    JSON.stringify(asStudent.data.user && asStudent.data.user.username));
  r = await call('GET', '/api/admin/reports');
  check('The admin session survives the preview — both cookies coexist', r.status === 200, 'status ' + r.status);

  /* 16b. The backup panel.
     Read-only checks plus one real backup, because the point of putting this on
     a screen is that somebody can confirm the copy exists without a shell — and
     a panel that reports health it never verified is worse than no panel. */
  r = await call('GET', '/api/admin/backup');
  check('The backup state can be read', r.status === 200, 'status ' + r.status);
  check('It says which destination is in use',
    r.data && r.data.health && typeof r.data.health.driver === 'string',
    JSON.stringify(r.data && r.data.health));
  check('And never claims to be healthy without saying why not',
    r.data.health.ok === (r.data.health.problems.length === 0),
    JSON.stringify(r.data.health.problems));
  const before = r.data.count;

  r = await call('POST', '/api/admin/backup');
  check('A backup can be taken from the screen', r.status === 200 && r.data.ok,
    JSON.stringify(r.data).slice(0, 200));
  check('And it carries a real count of what it copied', r.data.users > 0,
    'users=' + (r.data && r.data.users));

  r = await call('GET', '/api/admin/backup');
  check('Which then shows up in the list', r.data.count === before + 1,
    before + ' → ' + r.data.count);
  check('Newest first, so the top row is the one just taken',
    r.data.recent.length > 0 && r.data.recent[0].at >= (r.data.recent[1] ? r.data.recent[1].at : 0),
    JSON.stringify(r.data.recent.slice(0, 2).map(b => b.name)));
  /* An unauthenticated caller must not learn the bucket name or the file names,
     which together are a map of where the data lives. */
  const anon = await fetch(BASE + '/api/admin/backup', { redirect: 'manual' });
  check('An unauthenticated request is refused', anon.status === 401 || anon.status === 403,
    'status ' + anon.status);

  /* 17. Signing out kills the session */
  r = await call('POST', '/api/admin/logout');
  check('Signs out', r.status === 200);
  r = await call('GET', '/api/admin/reports');
  check('The session is dead after signing out', r.status === 401, 'status ' + r.status);

  /* Results */
  let failed = 0;
  for (const x of results) {
    console.log((x.ok ? '✓ ' : '✗ ') + x.name + (x.ok || !x.extra ? '' : '  → ' + x.extra));
    if (!x.ok) failed++;
  }
  console.log(failed ? `\n${failed}/${results.length} checks FAILED` : `\n${results.length}/${results.length} checks passed`);
  process.exitCode = failed ? 1 : 0;
};

run().catch(e => { console.error(e); process.exit(1); });
