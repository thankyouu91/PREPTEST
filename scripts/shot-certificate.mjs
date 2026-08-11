/**
 * Render the certificate mockup in docs/mockups/certificate.html to PNG.
 *
 * Three states, because each one settles a different question in
 * docs/VOICE.md section 8.4:
 *
 *   certificate-issued        what a candidate receives once branding is uploaded
 *   certificate-blank-logo    the template as it ships, logo slot empty
 *   certificate-level1-ceiling  a Level 1 result at the ceiling of what that form
 *                               can measure, carrying the recommendation instead
 *                               of a level the form cannot support
 *
 * No server needed — the page is opened from disk.
 *
 * Run:  node scripts/shot-certificate.mjs
 */
import { chromium } from 'playwright-core';
import fs from 'node:fs';
import path from 'node:path';

const SRC = 'file://' + path.resolve('docs/mockups/certificate.html');
const OUT = path.resolve('docs/screenshots');
fs.mkdirSync(OUT, { recursive: true });

/* A4 landscape at 96 dpi. Fixed so the screenshot and the print path agree. */
const VIEWPORT = { width: 1123, height: 794 };

/* Level 1 sat at the ceiling: every skill clamps to the top of what the form can
   measure, and the notice carries the recommendation. Applied in the page. */
function applyLevel1Ceiling() {
  const set = (sel, text) => { const el = document.querySelector(sel); if (el) el.textContent = text; };

  document.body.classList.add('has-notice');
  set('.level-tag', 'LEVEL 1');
  set('.exam-note', 'Level 1 measures B1 and below. Level 2 measures B2 and above.');

  document.querySelectorAll('.exam .sep').forEach(() => {});
  const exam = document.querySelector('.exam');
  exam.innerHTML = exam.innerHTML
    .replace('Form VPET-L2-014', 'Form VPET-L1-006')
    .replace('Taken 8 August 2026', 'Taken 8 August 2026');

  document.querySelector('.overall-gse').innerHTML = '<span>GSE</span>50';
  set('.overall-cefr', 'CEFR B1');

  const skills = [['50', 'B1'], ['50', 'B1'], ['47', 'B1'], ['49', 'B1']];
  document.querySelectorAll('.skill').forEach((el, i) => {
    el.querySelector('.skill-gse').innerHTML = `<span>GSE</span>${skills[i][0]}`;
    el.querySelector('.skill-cefr').textContent = skills[i][1];
  });

  set('.scale-note',
    'Global Scale of English 10–90 · A1 22–29 · A2 30–35 · A2+ 36–42 · B1 43–50 · Level 1 measures to GSE 50');

  set('.codebox-code', 'R-4RT9-8B2K-LM7W');
}

const STATES = [
  { slug: 'certificate-issued',
    apply: () => { document.body.classList.add('has-logo'); document.body.classList.remove('has-notice'); } },
  { slug: 'certificate-blank-logo',
    apply: () => { document.body.classList.remove('has-logo'); document.body.classList.remove('has-notice'); } },
  { slug: 'certificate-level1-ceiling', apply: applyLevel1Ceiling }
];

const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
try {
  for (const state of STATES) {
    const ctx = await browser.newContext({ viewport: VIEWPORT, deviceScaleFactor: 2, locale: 'vi-VN' });
    const page = await ctx.newPage();
    await page.goto(SRC, { waitUntil: 'load' });
    await page.evaluate(() => document.fonts.ready);
    await page.evaluate(state.apply);
    await page.waitForTimeout(150);

    /* A certificate is a fixed-size sheet, so overflow is a layout bug, not a
       scroll. The longest state (Level 1 with the ceiling notice) breaks first and
       is easy to miss by eye — so assert it.

       Measure against .inner, whose bottom edge is the sheet's padding edge. The
       frame sits 4mm outside that, and checking against the frame instead lets
       content quietly eat the margin and collide with the rule while still
       reporting clearance. */
    const fit = await page.evaluate(() => {
      const foot = document.querySelector('.foot').getBoundingClientRect();
      const inner = document.querySelector('.inner').getBoundingClientRect();
      return { slack: Math.round(inner.bottom - foot.bottom) };
    });
    if (fit.slack < 0) {
      throw new Error(`${state.slug}: content overflows the margin by ${-fit.slack}px`);
    }
    console.log(`  ${state.slug}: ${fit.slack}px inside the margin`);

    const file = path.join(OUT, `${state.slug}.png`);
    await page.locator('.sheet').screenshot({ path: file });
    console.log('✓', path.relative(process.cwd(), file));
    await ctx.close();
  }
} finally {
  await browser.close();
}
