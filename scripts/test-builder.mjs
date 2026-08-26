/**
 * The test builder's question composer, driven in a real browser.
 *
 * The API half of this feature is covered in test-admin.mjs; what is here can
 * only be seen in a browser — that a part fixes which item types are offered,
 * that changing the part under a half-typed row keeps the text, that a bad row
 * is named before anything is sent, and that pressing the submit twice sends
 * one request. The last two are here because both were wrong first: the count
 * listener bound to the whole dialog re-armed the submit as the click bubbled
 * up through it, and a slow save went out twice.
 *
 * Run: node scripts/test-builder.mjs   (needs the server up)
 */
import { launchChromium } from './_browser.mjs';
import { ADMIN_PASSWORD } from './_demo.mjs';
const BASE = process.env.BASE_URL || 'http://localhost:3000';
const PASS = ADMIN_PASSWORD;
const out = [];
const check = (name, ok, extra) => out.push({ name, ok: !!ok, extra });

const b = await launchChromium();
const c = await b.newContext({ viewport: { width: 1440, height: 1000 }, locale: 'vi-VN' });
const p = await c.newPage();
const errs = [];
p.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
p.on('pageerror', e => errs.push('PAGEERROR ' + e.message));

await p.goto(BASE + '/admin/dang-nhap/?lang=en', { waitUntil: 'networkidle' });
await p.fill('#username', process.env.ADMIN_USERNAME || 'admin');
await p.fill('#password', PASS);
await p.click('#submit');
await p.waitForURL(u => !u.pathname.includes('dang-nhap'), { timeout: 10000 });

/* A throwaway paper, so nothing existing is touched. */
const csrf = await p.evaluate(() => decodeURIComponent(
  (document.cookie.match(/(?:^|;\s*)prep_csrf=([^;]*)/) || [])[1] || ''));
const testId = await p.evaluate(async (t) => {
  const r = await fetch('/api/admin/tests', {
    method: 'POST', credentials: 'same-origin',
    headers: { 'Content-Type': 'application/json', 'X-CSRF-Token': t },
    body: JSON.stringify({ familyId: 'vpet', title: 'Composer probe paper', level: 'B1', durationMin: 30 })
  });
  return (await r.json()).id;
}, csrf);

await p.goto(BASE + '/admin/de-thi/' + testId + '/?lang=en', { waitUntil: 'networkidle' });
await p.waitForSelector('#btn-add-section');

/* ---- 1. Add a part, typing two items in the same dialog ---- */
await p.click('#btn-add-section');
await p.waitForSelector('#c-add');
check('The composer is in the add-a-part dialog', await p.isVisible('#c-add'));
check('It starts with no rows, so the old flow is unchanged',
  (await p.locator('[data-row]').count()) === 0);
check('The part description is no longer asked for by hand',
  (await p.locator('#s-type').count()) === 0);

await p.selectOption('#s-part', 'C');                       // reading / mcq
await p.waitForTimeout(150);
check('Choosing a part fills the name from the blueprint',
  (await p.inputValue('#s-name')).includes('Part C'), await p.inputValue('#s-name'));
check('and pulls the skill with it',
  (await p.inputValue('#s-skill')) === 'reading', await p.inputValue('#s-skill'));

await p.click('#c-add');
await p.waitForSelector('[data-row]');
const typeOpts = await p.locator('[data-row] [data-type] option').allTextContents();
check('A VPET part offers only the item type it takes',
  typeOpts.length === 1 && typeOpts[0] === 'Multiple choice', JSON.stringify(typeOpts));
check('The mcq option boxes appear', (await p.locator('[data-row] [data-opt]').count()) === 4);

const fill = async (i, prompt, correct) => {
  const row = p.locator('[data-row]').nth(i);
  await row.locator('[data-prompt]').fill(prompt);
  for (let k = 0; k < 4; k++) await row.locator('[data-opt]').nth(k).fill('Option ' + (k + 1));
  await row.locator('[data-ans]').nth(correct).check();
};
await fill(0, 'Probe item one: what does the writer mean?', 1);

/* Changing the part under a row that is already typed must not wipe it. The
   first version redrew the answer box on every context change. */
await p.selectOption('#s-part', 'F');                       // listening / mcq, same type
await p.waitForTimeout(150);
check('Switching to a part of the same type keeps what was typed',
  (await p.locator('[data-row]').first().locator('[data-opt]').nth(0).inputValue()) === 'Option 1' &&
  (await p.locator('[data-row]').first().locator('[data-prompt]').inputValue()).includes('Probe item one'),
  await p.locator('[data-row]').first().locator('[data-opt]').nth(0).inputValue());
check('and a listening part turns the MP3 control on for a row already there',
  await p.locator('[data-row]').first().locator('[data-audio-row]').isVisible());
await p.selectOption('#s-part', 'C');                       // back to reading / mcq
await p.waitForTimeout(150);

await p.click('#c-add');
await fill(1, 'Probe item two: what happens next?', 2);
check('The count is carried by the button, the only place it is now shown',
  (await p.textContent('#s-save')).trim() === 'Add part with 2 questions', await p.textContent('#s-save'));

/* A deliberate mistake first: clear one prompt and check the row is flagged. */
await p.locator('[data-row]').nth(1).locator('[data-prompt]').fill('no');
await p.click('#s-save');
await p.waitForTimeout(250);
check('A bad row is named and ringed, without a round trip',
  (await p.textContent('#s-err-text')).includes('Question 2') &&
  (await p.locator('[data-row]').nth(1).getAttribute('class')).includes('ring-danger'),
  await p.textContent('#s-err-text'));
check('and nothing was created', (await p.locator('[data-section]').count()) === 0);

await fill(1, 'Probe item two: what happens next?', 2);
/* The submit must not be re-armed by its own click bubbling to the dialog's
   count listener — that is a second POST and a duplicate part. Hold the response
   open so there is an "in flight" to look at, and count what actually goes out. */
let posts = 0;
await p.route('**/api/admin/tests/**/sections', async route => {
  posts++;
  await new Promise(r => setTimeout(r, 1200));
  await route.continue();
});
await p.click('#s-save');
await p.waitForTimeout(400);
check('The submit stays disabled while the save is in flight',
  await p.locator('#s-save').isDisabled());
await p.locator('#s-save').click({ force: true, timeout: 2000 }).catch(() => {});
await p.waitForSelector('[data-section]', { timeout: 10000 });
await p.unroute('**/api/admin/tests/**/sections');
check('and a second press sends nothing', posts === 1, posts + ' requests');
await p.waitForTimeout(400);
check('The part is created with its items in one press',
  (await p.locator('[data-section] li [data-del-item]').count()) === 2,
  String(await p.locator('[data-section] li [data-del-item]').count()));
check('The first item reads back as typed',
  (await p.textContent('[data-section] li')).includes('Probe item one'));

/* ---- 2. Write more items into the part that now exists ---- */
await p.click('[data-write]');
await p.waitForSelector('#w-save');
check('The write dialog opens with one row ready to type',
  (await p.locator('[data-row]').count()) === 1);
check('It names the part context it will file under',
  (await p.textContent('.modal-panel p')).includes('Part C'), await p.textContent('.modal-panel p'));
await fill(0, 'Probe item three: which is closest in meaning?', 0);
/* This is the dialog where the count listener also toggles `disabled`, so a
   double press here would write the item into the part twice. */
let writes = 0;
await p.route('**/api/admin/sections/**/questions', async route => {
  writes++;
  await new Promise(r => setTimeout(r, 1200));
  await route.continue();
});
await p.click('#w-save');
await p.waitForTimeout(400);
check('The write button stays disabled while its save is in flight',
  await p.locator('#w-save').isDisabled());
await p.locator('#w-save').click({ force: true, timeout: 2000 }).catch(() => {});
await p.waitForTimeout(1600);
await p.unroute('**/api/admin/sections/**/questions');
check('so the item is written once, not twice', writes === 1, writes + ' requests');
check('A third item is written straight into the part',
  (await p.locator('[data-section] li [data-del-item]').count()) === 3,
  String(await p.locator('[data-section] li [data-del-item]').count()));

/* ---- 3. A listening part offers the MP3 row ---- */
await p.click('#btn-add-section');
await p.waitForSelector('#c-add');
await p.selectOption('#s-part', 'E');                       // listening / gap, needs audio
await p.waitForTimeout(150);
await p.click('#c-add');
check('A listening part puts an MP3 control on the row',
  await p.locator('[data-row] [data-audio-row]').isVisible());
check('A gap part asks for an answer key, not options',
  (await p.locator('[data-row] [data-key]').count()) === 1 &&
  (await p.locator('[data-row] [data-opt]').count()) === 0);
await p.locator('[data-row] [data-prompt]').fill('Probe dictation: write what you hear.');
await p.click('#s-save');
await p.waitForTimeout(250);
check('A gap with no key is caught before it is sent',
  (await p.textContent('#s-err-text')).includes('answer key'), await p.textContent('#s-err-text'));

/* Give it a key and let it through, to see what the part calls itself. Part E's
   blueprint says "Type what you hear" — nobody typed that, and it is not the
   "Multiple choice" the removed free-text box used to default to. */
await p.locator('[data-row] [data-key]').fill('the train leaves at nine');
await p.click('#s-save');
await p.waitForTimeout(1500);
const partELine = await p.locator('[data-section]').last().locator('.text-muted').first().textContent();
check('A part describes itself from the blueprint, with nothing typed by hand',
  partELine.includes('Type what you hear'), partELine.trim());

/* Clean up the throwaway paper and the items it created. */
await p.evaluate(async ([t, id]) => {
  const g = await (await fetch('/api/admin/tests/' + id, { credentials: 'same-origin' })).json();
  for (const s of g.sections || []) for (const it of s.items || []) {
    await fetch('/api/admin/questions/' + it.questionId + '/status', {
      method: 'POST', credentials: 'same-origin',
      headers: { 'Content-Type': 'application/json', 'X-CSRF-Token': t },
      body: JSON.stringify({ status: 'retired' })
    });
  }
  await fetch('/api/admin/tests/' + id, {
    method: 'DELETE', credentials: 'same-origin', headers: { 'X-CSRF-Token': t }
  });
}, [csrf, testId]);

await b.close();
check('No console or CSP errors on the builder', errs.length === 0, errs.slice(0, 3).join(' | '));

let bad = 0;
for (const r of out) {
  console.log((r.ok ? '✓ ' : '✗ ') + r.name + (r.ok || !r.extra ? '' : '  — ' + r.extra));
  if (!r.ok) bad++;
}
console.log('\n' + (out.length - bad) + '/' + out.length + ' checks passed');
process.exitCode = bad ? 1 : 0;
