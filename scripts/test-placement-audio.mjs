/**
 * The placement test's listening items must be audible.
 *
 * Parts E and F are heard, not read, and the draw takes one item from every
 * part that has one — so about half of an eighteen-item placement is listening.
 * The screen had no player at all: "Listen, then type the sentence exactly as
 * you hear it" above an empty box, on the first screen a new learner ever sees,
 * because forClient() never said the item had a recording and no route served
 * one.
 *
 * The last check is the one to keep: the route must answer for items in the
 * caller's OWN draw and refuse everything else, or it is a way to read the
 * question bank's audio one id at a time.
 *
 * Run: node scripts/test-placement-audio.mjs   (needs the server up)
 */
import { launchChromium } from './_browser.mjs';
import { DEMO_PASSWORD } from './_demo.mjs';

const BASE = process.env.BASE_URL || 'http://localhost:3000';
const out = [];
const check = (n, ok, extra) => out.push({ n, ok: !!ok, extra });

const browser = await launchChromium();
const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 }, locale: 'vi-VN' });
const page = await ctx.newPage();
const errs = [];
page.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
page.on('pageerror', e => errs.push('PAGEERROR ' + e.message));

try {
  await page.goto(BASE + '/prep/dang-nhap/?lang=en', { waitUntil: 'networkidle' });
  await page.fill('#email', 'student');
  await page.fill('#password', DEMO_PASSWORD);
  await page.click('#submit');
  await page.waitForURL(u => !u.pathname.includes('dang-nhap'), { timeout: 10000 });

  const state = await page.evaluate(async () => {
    const csrf = decodeURIComponent((document.cookie.match(/(?:^|;\s*)prep_csrf=([^;]*)/) || [])[1] || '');
    const r = await fetch('/api/placement/start', {
      method: 'POST', credentials: 'same-origin',
      headers: { 'Content-Type': 'application/json', 'X-CSRF-Token': csrf }, body: '{}'
    });
    return r.json();
  });

  /* gate-setup.mjs marks the demo account placed, so a suite run finds it done
     and deals nothing. That is not a failure of this feature — say so and stop,
     rather than reporting red for a fixture. */
  if (state.done || !(state.items || []).length) {
    console.log('· the demo account is already placed, so no rung was dealt — skipping.');
    console.log('  (to exercise this: DELETE FROM placements WHERE user_id=<demo>, then re-run)');
    await browser.close();
    process.exit(0);
  }

  const items = state.items;
  const heard = items.filter(i => ['E', 'F'].includes(i.part));
  check('The placement deals a rung', items.length > 0, items.length + ' items');
  check('Listening parts are in the draw', heard.length > 0,
    items.map(i => i.part).join(' '));
  check('and every listening item reports its recording',
    heard.length > 0 && heard.every(i => i.hasAudio),
    items.map(i => i.part + ':' + !!i.hasAudio).join(' '));

  const withAudio = items.filter(i => i.hasAudio);
  if (withAudio.length) {
    const got = await page.evaluate(async id => {
      const r = await fetch('/api/placement/items/' + id + '/audio', { credentials: 'same-origin' });
      const buf = await r.arrayBuffer();
      return { status: r.status, type: r.headers.get('content-type'), bytes: buf.byteLength };
    }, withAudio[0].questionId);
    check('The recording downloads', got.status === 200 && got.bytes > 1000, JSON.stringify(got));
    check('and is served as audio', String(got.type || '').includes('audio/mpeg'), got.type);
  }

  const mine = new Set(items.map(i => i.questionId));
  let stranger = 0;
  for (let i = 1; i < 500 && !stranger; i++) if (!mine.has(i)) stranger = i;
  const refused = await page.evaluate(async id =>
    (await fetch('/api/placement/items/' + id + '/audio', { credentials: 'same-origin' })).status, stranger);
  check('An item outside my own draw is refused', refused === 404,
    'status ' + refused + ' for question ' + stranger);

  /* And it is on the screen, not merely in the payload.
     Console errors are counted from here on: the refusal check above asks for an
     item that is deliberately not in the draw, and the 404 it is testing for
     lands in the console. Counting it would be the test failing on the thing it
     just proved works. */
  errs.length = 0;
  await page.goto(BASE + '/prep/xep-lop/?lang=en', { waitUntil: 'networkidle' });
  await page.waitForTimeout(1200);
  const go = page.locator('#go');
  if (await go.count() && await go.isVisible().catch(() => false)) {
    await go.click().catch(() => {});
    await page.waitForTimeout(1200);
  }
  let seen = null;
  for (let i = 0; i < 10 && !seen; i++) {
    const part = (await page.locator('#q-part').textContent().catch(() => '')) || '';
    const players = await page.locator('#q-audio audio').count();
    if (/Part (E|F)/.test(part)) seen = { part: part.trim(), players };
    else {
      const skip = page.locator('#skip');
      if (!(await skip.count())) break;
      await skip.click({ timeout: 3000 }).catch(() => {});
      await page.waitForTimeout(700);
    }
  }
  check('A listening question shows a player', seen && seen.players === 1, JSON.stringify(seen));
  check('No console errors', errs.length === 0, errs.slice(0, 2).join(' | '));
} finally {
  await browser.close();
}

let bad = 0;
for (const r of out) {
  console.log((r.ok ? '✓ ' : '✗ ') + r.n + (r.ok || !r.extra ? '' : '  — ' + r.extra));
  if (!r.ok) bad++;
}
console.log('\n' + (out.length - bad) + '/' + out.length + ' checks passed');
process.exitCode = bad ? 1 : 0;
