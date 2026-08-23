/**
 * Student-side catalogue layer: the pages really read GET /api/catalog, and when
 * the API fails they fall back to bundled data with a warning strip (never a blank page).
 *
 * Run with the server up: node scripts/test-catalog.mjs
 */
import { launchChromium } from './_browser.mjs';
import { DEMO_PASSWORD } from './_demo.mjs';

const BASE = process.env.BASE || 'http://127.0.0.1:3000';

let pass = 0, fail = 0;
/* detail prints only on red: one line is enough to see what happened without a re-run */
const ok = (c, name, detail) => {
  if (c) { pass++; console.log('✓ ' + name); return; }
  fail++;
  console.log('✗ ' + name + (detail === undefined ? '' : '  → ' + detail));
};

/** Sign in as the demo account and return a page already inside the student area */
async function login(ctx) {
  const page = await ctx.newPage();
  await page.goto(BASE + '/prep/dang-nhap/', { waitUntil: 'networkidle' });
  await page.fill('#email', 'student');
  await page.fill('#password', DEMO_PASSWORD);
  await page.click('#submit');
  await page.waitForURL(u => !u.pathname.includes('dang-nhap'), { timeout: 10000 });
  return page;
}

const browser = await launchChromium({ args: ['--no-sandbox'] });

try {
  console.log('\n\x1b[1m== The student catalogue reads /api/catalog ==\x1b[0m');

  /* --- 1. Whatever the API returns is what the page shows --- */
  const api = await (await fetch(BASE + '/api/catalog')).json();
  const published = api.tests.length;
  /* Owner's decision, 2026-08-13: while the platform is VPET-only, a student is
     shown VPET and nothing else. The five parked families are not "coming
     soon" cards any more, they are absent. */
  ok(Array.isArray(api.families) && api.families.length === 1 && api.families[0].id === 'vpet',
    'A student sees only VPET', JSON.stringify((api.families || []).map(f => f.id)));
  ok(api.families.every(f => f.status !== 'coming_soon'),
    'and nothing in the list is a family that cannot be opened');
  ok(api.tests.every(t => t.familyId === 'vpet'),
    'No paper belonging to a hidden family comes through either',
    JSON.stringify([...new Set(api.tests.map(t => t.familyId))]));
  ok(published > 0, 'The API has at least one published test (' + published + ')');

  const ctx = await browser.newContext();
  const errs = [];
  ctx.on('weberror', e => errs.push(String(e.error())));

  let page = await login(ctx);
  await page.goto(BASE + '/prep/', { waitUntil: 'networkidle' });
  await page.waitForTimeout(600);

  const cards = await page.locator('#mytests-grid article').count();
  ok(cards === published, 'The home page shows exactly ' + published + ' published tests (saw ' + cards + ')');
  ok(await page.locator('#mytests-loading.hidden').count() === 1, 'The skeleton has given way to content');
  ok(await page.locator('#catalog-warning').count() === 0, 'No warning while the API is healthy');

  const src = await page.evaluate(() => PREP.catalogSource);
  ok(src === 'api', 'PREP.catalogSource = "api"');

  /* A test with no questions yet must not show "0 items" */
  const zeroText = await page.locator('#mytests-grid').innerText();
  ok(!/\b0 items\b/.test(zeroText), 'No "0 items" line for a test with no questions');

  /* A draft test (pte-ac-01) must not reach students */
  const hasDraft = await page.evaluate(() => PREP.tests.some(t => t.id === 'pte-ac-01'));
  ok(!hasDraft, 'A draft test never appears in the student catalogue');

  /* --- 2. The detail page reads the right test out of the catalogue --- */
  const firstId = api.tests[0].id;
  await page.goto(BASE + '/prep/bai-thi/' + firstId + '/', { waitUntil: 'networkidle' });
  await page.waitForTimeout(500);
  ok(await page.locator('#page:not([hidden])').count() === 1, 'The detail page opens test ' + firstId);
  ok((await page.locator('#t-title').innerText()).trim() === api.tests[0].title, 'The title matches the API data');
  ok(await page.locator('#t-loading.hidden').count() === 1, 'The detail skeleton is gone');

  /* A test that does not exist → a not-found state, not a blank page */
  await page.goto(BASE + '/prep/bai-thi/no-such-test/', { waitUntil: 'networkidle' });
  await page.waitForTimeout(400);
  ok(await page.locator('#nf:not([hidden])').count() === 1, 'A missing test shows the "not found" state');

  /* --- 2b. The landing price table reads from the server ---
     The landing page is the shop front: type the prices in by hand and the next
     price change leaves one page lying. Compare every card against the price list
     the server publishes, so changing plans.js and forgetting this page goes red. */
  const me = await (await fetch(BASE + '/api/me')).json();
  const apiPlans = me.plans || [];
  ok(apiPlans.length > 0, 'The API publishes a price list (' + apiPlans.length + ' plans)');

  await page.goto(BASE + '/prep/landing/', { waitUntil: 'networkidle' });
  await page.waitForTimeout(600);
  const shownPlans = await page.$$eval('.plan:not([hidden])', els => els.map(e => ({
    id: e.getAttribute('data-plan'),
    price: e.querySelector('[data-plan-price]').textContent.trim(),
    months: e.querySelector('[data-plan-months]').textContent.trim()
  })));
  const vnd = n => n.toLocaleString('vi-VN') + 'đ';
  ok(shownPlans.length === apiPlans.length,
    'The landing page shows the right number of plans on sale (' + shownPlans.length + '/' + apiPlans.length + ')');
  const mismatch = shownPlans.filter(c => {
    const p = apiPlans.find(x => x.id === c.id);
    return !p || c.price !== vnd(p.price) || c.months !== String(p.months);
  });
  ok(mismatch.length === 0, 'Every plan price and duration matches the server price list',
    JSON.stringify(mismatch));

  /* The note under the button must state the price of the card actually selected,
     not a hand-typed copy that never moves. */
  await page.click('.plan[data-plan="' + apiPlans[0].id + '"]');
  await page.waitForTimeout(200);
  const note = (await page.locator('#plan-cta-note').innerText()).trim();
  ok(note.startsWith(vnd(apiPlans[0].price)),
    'The note under the button follows the selected plan', note);

  /* Comparing the page with the API proves nothing on its own: the numbers typed
     into the HTML happen to equal the real prices, so the page still "matches" even
     if it reads nothing at all. Change the price in the server's own answer and see
     whether the page follows — that is the check that cannot pass by coincidence. */
  await page.route('**/api/me', async route => {
    const res = await route.fetch();
    const body = await res.json();
    (body.plans || []).forEach(p => { p.price += 7000; p.months += 1; });
    await route.fulfill({ response: res, body: JSON.stringify(body) });
  });
  await page.goto(BASE + '/prep/landing/', { waitUntil: 'networkidle' });
  await page.waitForTimeout(600);
  const doctored = await page.$$eval('.plan:not([hidden])', els => els.map(e => ({
    id: e.getAttribute('data-plan'),
    price: e.querySelector('[data-plan-price]').textContent.trim(),
    months: e.querySelector('[data-plan-months]').textContent.trim()
  })));
  const followed = doctored.filter(c => {
    const p = apiPlans.find(x => x.id === c.id);
    return p && c.price === vnd(p.price + 7000) && c.months === String(p.months + 1);
  });
  ok(followed.length === apiPlans.length,
    'Change the price on the server and the landing page follows (nothing hand-typed)',
    JSON.stringify(doctored));

  /* With the server silent there must still be a price on screen: an old price beats
     an empty box in the very place someone came to read one. */
  await page.unroute('**/api/me');
  await page.route('**/api/me', r => r.abort());
  await page.goto(BASE + '/prep/landing/', { waitUntil: 'networkidle' });
  await page.waitForTimeout(600);
  const offline = await page.$$eval('.plan:not([hidden])', els => els.map(e =>
    e.querySelector('[data-plan-price]').textContent.trim()));
  ok(offline.length === 3 && offline.every(t => /\d/.test(t)),
    'With the API silent the price table falls back to bundled numbers rather than blanks', JSON.stringify(offline));
  await page.unroute('**/api/me');

  ok(errs.length === 0, 'No console errors while the API is healthy');
  await ctx.close();

  /* --- 3. A broken API: bundled data + a warning strip --- */
  console.log('\n\x1b[1m== Catalogue API broken: falling back to bundled data ==\x1b[0m');
  const ctx2 = await browser.newContext();
  const errs2 = [];
  ctx2.on('weberror', e => errs2.push(String(e.error())));

  page = await login(ctx2);
  await ctx2.route('**/api/catalog', r => r.abort());   // block it only after signing in
  await page.goto(BASE + '/prep/', { waitUntil: 'networkidle' });
  await page.waitForTimeout(700);

  ok(await page.locator('#catalog-warning').count() === 1, 'A warning strip appears when the API cannot be reached');
  ok(await page.locator('#mytests-grid article').count() > 0, 'Tests still render from the bundled data');
  ok(await page.evaluate(() => PREP.catalogSource) === 'fallback', 'PREP.catalogSource = "fallback"');
  ok(errs2.length === 0, 'A network failure does not break the page (no JS errors)');

  await ctx2.close();
} finally {
  await browser.close();
}

console.log('\n' + (pass + fail ? pass + '/' + (pass + fail) + ' checks passed' : 'no checks ran'));
if (fail) process.exit(1);
