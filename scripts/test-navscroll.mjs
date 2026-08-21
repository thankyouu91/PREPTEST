/**
 * The self-study chip rail, driven by a real pointer.
 *
 * Everything here is about one conflict: the rail is made of LINKS, and the
 * gesture that scrolls it starts exactly like the gesture that follows one.
 * A drag that opens a lesson is worse than no drag at all, so the interesting
 * assertion is not "dragging scrolls" - it is "dragging does not navigate, and
 * clicking still does".
 *
 * A browser is not optional here. Every one of these behaviours lives in
 * pointer events and layout; the server returns the same bytes whether the rail
 * can be dragged or not.
 */
import { launchChromium } from './_browser.mjs';
import { DEMO_USER, DEMO_PASSWORD } from './_demo.mjs';

const BASE = process.env.BASE_URL || 'http://localhost:3000';
const PAGE = '/prep/hoc/dong-tu-bat-quy-tac/';
let pass = 0, fail = 0;
const ok = (c, name, detail) => {
  if (c) { pass++; console.log('✓ ' + name); return; }
  fail++; console.log('✗ ' + name + (detail === undefined ? '' : '  → ' + detail));
};
const head = t => console.log('\n\x1b[1m== ' + t + ' ==\x1b[0m');

const browser = await launchChromium();
const ctx = await browser.newContext({ viewport: { width: 1100, height: 900 } });
const page = await ctx.newPage();
const errs = [];
page.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
page.on('pageerror', e => errs.push('PAGEERROR ' + e.message));

const RAIL = 'nav[aria-label="Self-study topics"]';
const left = () => page.evaluate(s => document.querySelector(s).scrollLeft, RAIL);

try {
  head('The rail scrolls, and says so');

  await page.goto(BASE + '/prep/dang-nhap/', { waitUntil: 'networkidle' });
  await page.fill('#email', DEMO_USER);
  await page.fill('#password', DEMO_PASSWORD);
  await page.click('button[type="submit"]');
  await page.waitForTimeout(1500);
  await page.goto(BASE + PAGE, { waitUntil: 'networkidle' });
  await page.waitForTimeout(600);

  ok(await page.locator(RAIL).count() === 1, 'The rail is on the page', page.url());
  const over = await page.evaluate(s => {
    const n = document.querySelector(s); return n.scrollWidth - n.clientWidth;
  }, RAIL);
  ok(over > 50, 'It is wider than its container, so there is something to reach', 'overflow ' + over);
  ok(await page.locator('.navscroll').count() === 1, 'It has been enhanced');

  /* An arrow is the affordance somebody looking for a control will find. */
  const next = page.locator('.navscroll-next');
  ok(await next.count() === 1 && await next.isVisible(),
    'A forward arrow is visible while there is more to the right');
  const before = await left();
  await next.click();
  await page.waitForTimeout(700);
  const afterArrow = await left();
  ok(afterArrow > before, 'Pressing it moves the rail', before + ' → ' + afterArrow);

  head('Dragging it with a mouse');

  await page.evaluate(s => { document.querySelector(s).scrollLeft = 0; }, RAIL);
  await page.waitForTimeout(200);
  const box = await page.locator(RAIL).boundingBox();
  const y = box.y + box.height / 2;

  /* Right to left, in steps, the way a hand moves. */
  await page.mouse.move(box.x + box.width - 120, y);
  await page.mouse.down();
  for (let i = 1; i <= 6; i++) await page.mouse.move(box.x + box.width - 120 - i * 40, y);
  await page.mouse.up();
  await page.waitForTimeout(300);
  const afterDrag = await left();
  ok(afterDrag > 100, 'Grabbing the rail and pulling scrolls it', 'scrollLeft ' + afterDrag);

  /* The one that matters. That drag ended on top of a chip. */
  ok(page.url().endsWith(PAGE), 'And letting go over a lesson does NOT open it', page.url());

  head('A click is still a click');

  const target = page.locator(RAIL + ' a[href="/prep/hoc/tu-noi/"]');
  await target.scrollIntoViewIfNeeded();
  await page.waitForTimeout(200);
  await target.click();
  await page.waitForURL(/\/prep\/hoc\/tu-noi\//, { timeout: 8000 }).catch(() => {});
  ok(/\/prep\/hoc\/tu-noi\//.test(page.url()), 'Clicking a chip opens that lesson', page.url());

  head('And it remembers where you are');

  ok(await page.locator(RAIL + ' [aria-current="page"]').count() === 1,
    'The open lesson is marked on the rail');
  const vis = await page.evaluate(s => {
    const n = document.querySelector(s), c = n.querySelector('[aria-current="page"]');
    if (!c) return false;
    const a = n.getBoundingClientRect(), b = c.getBoundingClientRect();
    return b.left >= a.left - 2 && b.right <= a.right + 2;
  }, RAIL);
  ok(vis, 'And is scrolled into view rather than left off screen');

  ok(errs.length === 0, 'No console errors', JSON.stringify(errs).slice(0, 240));
} catch (e) {
  fail++;
  console.log('\n✗ The suite threw: ' + (e && e.stack ? e.stack : e));
} finally {
  await browser.close();
}

console.log(`\n${fail ? '\x1b[31m' : '\x1b[32m'}${pass} passed, ${fail} failed\x1b[0m`);
process.exit(fail ? 1 : 0);
