/**
 * The exam screen, driven by a real browser.
 *
 * Run with the server up: node scripts/test-exam-ui.mjs
 *
 * Everything else that tests the exam tests the API: a sitting opens, an answer
 * saves, a clock expires. None of that can see the thing this file is about -
 * what a candidate is looking at, and when. Part B is the case that made this
 * necessary. The API is identical whether the passage is on the screen or gone;
 * the difference between a memory task and a copying task lives entirely in the
 * browser, and only a browser can tell them apart.
 *
 * Kept separate from scripts/audit.mjs, which sweeps every page for overflow and
 * contrast. This one drives one screen through a sequence and asserts what it
 * shows at each step.
 */
import { launchChromium } from './_browser.mjs';
import { DEMO_USER, DEMO_PASSWORD } from './_demo.mjs';

const BASE = process.env.BASE_URL || 'http://localhost:3000';
let pass = 0, fail = 0;
const ok = (c, name, detail) => {
  if (c) { pass++; console.log('✓ ' + name); return; }
  fail++; console.log('✗ ' + name + (detail === undefined ? '' : '  → ' + detail));
};
const head = t => console.log('\n\x1b[1m== ' + t + ' ==\x1b[0m');

const browser = await launchChromium();
const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
const page = await ctx.newPage();
const errs = [];
page.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
page.on('pageerror', e => errs.push('PAGEERROR ' + e.message));

try {
  head('Part B: the passage goes away');

  await page.goto(BASE + '/prep/dang-nhap/', { waitUntil: 'networkidle' });
  await page.fill('#email', DEMO_USER);
  await page.fill('#password', DEMO_PASSWORD);
  await page.click('button[type="submit"]');
  await page.waitForURL(/\/prep\/(\?|$)/, { timeout: 15000 }).catch(() => {});

  /* A sitting of its own, through the same API the page uses. Reusing whatever
     sitting happens to be open would make this test depend on how the suite
     before it left the database. */
  const made = await page.evaluate(async () => {
    const csrf = decodeURIComponent((document.cookie.match(/prep_csrf=([^;]+)/) || [])[1] || '');
    const cur = await fetch('/api/attempts/current', { headers: { Accept: 'application/json' } })
      .then(r => r.json()).catch(() => null);
    if (cur && cur.attempt) {
      await fetch('/api/attempts/' + cur.attempt.id + '/submit',
        { method: 'POST', headers: { 'X-CSRF-Token': csrf } });
    }
    const r = await fetch('/api/attempts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-CSRF-Token': csrf },
      body: JSON.stringify({ testId: 'vpet-b1-01' })
    });
    return r.json();
  });
  ok(!!(made && made.attempt), 'A sitting opens', JSON.stringify(made).slice(0, 140));

  await page.goto(BASE + '/prep/lam-bai/', { waitUntil: 'networkidle' });
  await page.locator('button', { hasText: /Part B/ }).first().click();
  await page.waitForTimeout(400);

  /* The rule has to be stated BEFORE the clock starts. By the time a candidate
     could discover that the passage disappears, it has disappeared. */
  const startText = await page.textContent('#ex-part');
  ok(/seconds to read it/.test(startText || ''),
    'The start screen says the passage disappears', (startText || '').slice(0, 180));

  await page.click('#ex-enter');
  await page.waitForTimeout(800);

  ok(await page.locator('[data-pace-left]').count() === 1,
    'The item has a clock of its own, not just the part');
  ok(/Read and remember/.test(await page.textContent('#ex-part') || ''),
    'It opens in the reading phase');

  const passage = (await page.textContent('#ex-part') || '')
    .replace(/[\s\S]*Read and remember/, '')
    .replace(/The passage disappears[\s\S]*/, '').trim();
  ok(passage.length > 40, 'The passage is on screen while reading', passage.slice(0, 80));
  ok(await page.locator('#ex-part textarea').count() === 0,
    'And there is nowhere to write yet - reading is reading');

  /* Wind the item clock rather than wait thirty real seconds. The transition is
     what is under test, not setTimeout. */
  await page.evaluate(() => { PrepRunner.pace.endsAt = Date.now(); });
  await page.waitForTimeout(700);

  const after = await page.textContent('#ex-part') || '';
  ok(/own words/.test(after), 'It moves on to the writing phase', after.slice(0, 140));
  ok(await page.locator('#ex-part textarea').count() === 1, 'And now there is somewhere to write');

  /* The check the whole change exists for. Long words only: "the" and "a" occur
     in the surrounding furniture and would match no matter what. */
  const words = passage.split(/\s+/).filter(w => w.length > 5).slice(0, 6);
  ok(words.length >= 3, 'The passage has enough distinctive words to look for', words.join(' '));
  ok(words.filter(w => after.includes(w)).length === 0,
    'The passage is gone from the screen',
    'still there: ' + JSON.stringify(words.filter(w => after.includes(w))));
  /* Removed, not hidden. A class that hides it leaves it in the page for anyone
     who opens the inspector, which is most of the way to not having done this. */
  const html = await page.innerHTML('#ex-part');
  ok(words.filter(w => html.includes(w)).length === 0,
    'And gone from the markup, not merely hidden by a class');

  /* One passage at a time: the other two must not be reachable either. */
  ok(await page.locator('#ex-part article').count() === 1,
    'Only one passage is on the page at all',
    String(await page.locator('#ex-part article').count()));
  ok(errs.length === 0, 'Part B raised no console errors', JSON.stringify(errs).slice(0, 240));

  head('Part H: one sentence, one clock, one open microphone');

  /* The spoken parts are paced for a different reason from Part B - not to take
     a stimulus away, but because "You have 15 seconds to answer" is invisible on
     a clock that only counts the whole part. */
  await page.goto(BASE + '/prep/lam-bai/', { waitUntil: 'networkidle' });
  await page.locator('button', { hasText: /Part H/ }).first().click();
  await page.waitForTimeout(400);

  const hStart = await page.textContent('#ex-part') || '';
  ok(/One item at a time/.test(hStart), 'The start screen says items come one at a time', hStart.slice(0, 200));
  ok(/Start speaking within/.test(hStart),
    'And states the rule about starting to speak', hStart.slice(0, 240));
  ok(!/seconds to read it/.test(hStart),
    "And does NOT show Part B's reading rule, which is not this part's");

  await page.click('#ex-enter');
  await page.waitForTimeout(600);

  /* The recording is played, not offered. Chromium has no audio device here, so
     play() rejects and the phase moves straight on - which is the behaviour that
     matters: a missing recording must not strand a candidate on a dead screen
     with the part clock running. */
  await page.waitForFunction(() => PrepRunner.pace && PrepRunner.pace.phase === 'answer',
    null, { timeout: 10000 }).catch(() => {});
  const hAnswer = await page.textContent('#ex-part') || '';
  ok(/Speak now/.test(hAnswer), 'It reaches the speaking phase by itself, with no button to press',
    hAnswer.slice(0, 200));
  ok(await page.locator('[data-pace-left]').count() === 1, 'The spoken answer has a clock of its own');
  ok(/Start speaking within/.test(hAnswer), 'The rule is repeated where it applies');
  ok(await page.locator('#ex-part article').count() === 1, 'Only one item is on the page');

  /* No microphone in this browser, so the state line says so rather than
     claiming to be recording. Either message is fine; a crash is not. */
  ok(errs.filter(e => !/microphone|getUserMedia|NotFoundError|play\(\)/i.test(e)).length === 0,
    'Nothing broke on a machine with no microphone',
    JSON.stringify(errs).slice(0, 240));
} catch (e) {
  fail++;
  console.log('\n✗ The suite threw: ' + (e && e.stack ? e.stack : e));
} finally {
  await browser.close();
}

console.log(`\n${fail ? '\x1b[31m' : '\x1b[32m'}${pass} passed, ${fail} failed\x1b[0m`);
process.exit(fail ? 1 : 0);
