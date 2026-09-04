#!/usr/bin/env node
/**
 * The new learner's journey, in a real browser: register → the first test →
 * what it says about them → practising the thing it named.
 *
 * Every other suite checks one screen or one endpoint. This one checks the
 * HAND-OVERS between them, which is where a platform stops telling somebody
 * what to do next — and no single-screen check can see that, because each
 * screen is fine on its own. It is deliberately written the way a person moves:
 * it presses what the page offers rather than navigating to URLs it knows.
 *
 * What it would have caught, and did: the placement result named three parts to
 * practise and none of them was a link, so a learner who had just been told
 * "start with Part A" had to go to the dashboard, find Practise, and find Part A
 * again. Three screens between being told and being able.
 *
 * Run: node scripts/test-journey.mjs   (needs the server up)
 */
import { launchChromium } from './_browser.mjs';

const BASE = process.env.BASE_URL || 'http://127.0.0.1:3000';
let pass = 0, fail = 0;
const ok = (c, name, detail) => {
  if (c) { pass++; console.log('✓ ' + name); return; }
  fail++; console.log('✗ ' + name + (detail === undefined ? '' : '  → ' + detail));
};
const head = t => console.log('\n\x1b[1m== ' + t + ' ==\x1b[0m');

const b = await launchChromium();
const c = await b.newContext({ viewport: { width: 1280, height: 900 }, locale: 'vi-VN' });
const p = await c.newPage();
const errs = [];
p.on('console', m => { if (m.type() === 'error') errs.push(m.text().slice(0, 160)); });
p.on('pageerror', e => errs.push('PAGEERROR ' + e.message.slice(0, 160)));

try {
  head('Arriving, and signing up');

  await p.goto(BASE + '/prep/landing/?lang=en', { waitUntil: 'networkidle' });
  const signUp = await p.$('a[href^="/prep/dang-ky/"]');
  ok(!!signUp, 'The landing page offers a way to sign up');

  const who = 'jrny' + Date.now().toString(36).slice(-6) + Math.random().toString(36).slice(2, 4);
  const PW = 'Journey-' + Math.random().toString(36).slice(2, 8) + 'A1';
  await p.goto(BASE + '/prep/dang-ky/?lang=en', { waitUntil: 'networkidle' });
  for (const [sel, val] of [['#name', 'Journey probe'], ['#email', who + '@example.test'],
    ['#phone', '09' + String(Date.now()).slice(-8)], ['#password', PW]]) {
    const el = await p.$(sel);
    ok(!!el, 'The form asks for ' + sel.slice(1));
    if (el) await el.fill(val);
  }
  const terms = await p.$('#terms');
  if (terms) await terms.check().catch(() => {});
  await p.click('#submit');

  head('The first thing the platform asks for is the placement');

  /* Compulsory, and enforced on the server: any learner page redirects into it
     until it is done. So "go to the dashboard" has to arrive at the placement. */
  await p.waitForTimeout(1500);
  await p.goto(BASE + '/prep/?lang=en', { waitUntil: 'networkidle' }).catch(() => {});
  await p.waitForTimeout(500);
  ok(/\/prep\/xep-lop\//.test(p.url()),
    'A brand-new learner asking for the dashboard is sent to the placement instead', p.url());

  const go = await p.$('#go');
  ok(!!go, 'and the placement screen opens with one button to start');
  await go.click();
  await p.waitForSelector('#quiz:not([hidden])', { timeout: 15000 });

  /* Answer everything — badly is fine, the point is to reach the end. */
  let asked = 0;
  for (let i = 0; i < 60 && await p.$('#quiz:not([hidden])'); i++) {
    asked++;
    const radio = await p.$('#q-answer input[type=radio]');
    const text = await p.$('#q-answer input[type=text], #q-answer textarea');
    if (radio) await radio.click().catch(() => {});
    else if (text) await text.fill('probably').catch(() => {});
    await p.waitForTimeout(100);
    const next = await p.$('#next:not([disabled])');
    if (next) await next.click().catch(() => {});
    else await p.click('#skip').catch(() => {});
    await p.waitForTimeout(300);
  }
  ok(asked >= 5 && asked <= 40, 'It asks a sitting\'s worth of questions and then stops', String(asked));

  head('What it says, and whether that can be acted on');

  await p.waitForSelector('#done:not([hidden])', { timeout: 15000 });
  const level = (await p.textContent('#d-level')).trim();
  ok(/^(A1|A2|B1|B2|C1|C2|below A1)/.test(level), 'It names a level', level);
  ok(((await p.textContent('#d-score')) || '').trim().length > 0,
    'and says how sure it is, rather than presenting a guess as a measurement');

  const planRows = await p.$$('#d-plan li');
  ok(planRows.length > 0, 'It lists what to do first', String(planRows.length));

  /* The hand-over this suite exists for. */
  const planLinks = await p.$$eval('#d-plan a', as => as.map(a => a.getAttribute('href')));
  ok(planLinks.length === planRows.length && planLinks.every(h => /^\/prep\/luyen\/\?part=[A-J]$/.test(h)),
    'and every line of it is the way into that part, not a description of it',
    JSON.stringify(planLinks));

  const cta = await p.$('#d-cta');
  const ctaHref = cta && await cta.getAttribute('href');
  ok(/^\/prep\/luyen\//.test(ctaHref || ''),
    'The big button goes to practice, named after the first thing on the list', ctaHref);
  ok(!!(await p.$('#d-home')), 'and the dashboard is still one click away');

  head('And the practice it named actually opens');

  await p.click('#d-cta');
  await p.waitForLoadState('networkidle');
  await p.waitForTimeout(1200);
  ok(/\/prep\/luyen\//.test(p.url()), 'The button lands on the practice screen', p.url());
  /* The deep link opens that part rather than the picker — the loop built for
     the weekly plan, reused here. */
  const running = await p.$('#run:not([hidden])');
  const picker = await p.$('#pick:not([hidden])');
  ok(!!running || !!picker, 'which is showing something rather than an empty page');
  ok(!!running, 'and it has opened the part it was asked for rather than the picker',
    running ? 'running' : 'fell back to the picker');

  const q = await p.textContent('#r-prompt').catch(() => '');
  ok((q || '').trim().length > 0, 'with a real question on it', (q || '').slice(0, 60));

  head('And it says how the part is scored, where the practice is');

  /* A learner can practise Part D for a month and never be told that half the
     mark is register. That is not something more questions teach — it is one
     paragraph, and it belongs beside the questions rather than in a study pack
     read once. server/data/exam-tactics.js is the single source; this checks
     both that it covers the paper and that the screen actually shows it. */
  const tactics = await p.evaluate(async () =>
    (await fetch('/api/tactics', { headers: { Accept: 'application/json' } })).json());
  const letters = 'ABCDEFGHIJ'.split('');
  ok(letters.every(l => tactics.parts && tactics.parts[l]),
    'Every part of the paper has scoring advice, not just the ones somebody got to',
    Object.keys(tactics.parts || {}).join(''));
  ok(letters.every(l => {
    const t = tactics.parts[l];
    return t && t.earn && t.earn.en && t.earn.vi && t.lose && t.lose.en && t.lose.vi
      && Array.isArray(t.frames) && t.frames.length > 0
      && t.frames.every(f => f.use && f.use.en && f.use.vi && Array.isArray(f.say) && f.say.length);
  }), 'and each one says what earns the mark, what loses it, and the English to have ready — in both languages');
  ok((tactics.ceiling || []).length === 2
    && tactics.ceiling.every(t => t.groups && t.groups.length && t.groups.every(g => g.words.length)),
    'The ceiling vocabulary covers both boundaries this platform reports',
    (tactics.ceiling || []).map(t => t.tier).join(' '));

  const how = await p.$('#r-how:not([hidden])');
  ok(!!how, 'The practice screen carries it for the part being practised');
  if (how) {
    const text = await p.textContent('#r-how-body');
    ok(/\S/.test(text || ''), 'with the advice filled in rather than an empty panel',
      (text || '').slice(0, 60));
  }

  head('Nothing broke on the way');
  ok(errs.length === 0, 'No console errors across the whole journey',
    [...new Set(errs)].join(' | ').slice(0, 200));

} catch (e) {
  fail++;
  console.log('\n✗ The journey threw: ' + (e && e.stack ? e.stack : e));
} finally {
  await b.close();
}

console.log('\n' + (fail ? '\x1b[31m' : '\x1b[32m') + pass + ' passed, ' + fail + ' failed\x1b[0m');
process.exit(fail ? 1 : 0);
