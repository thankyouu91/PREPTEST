/**
 * The service worker: a deploy must reach the browser, and the shell must
 * still open offline.
 *
 * The first of those is here because it was not true. The worker served every
 * static asset cache-first and refreshed behind it — "picks up the new file
 * next load", as its own comment said. A worker is only reinstalled when sw.js
 * ITSELF changes, and shipping a fix to _chrome.js does not change sw.js, so
 * nothing re-precached and every returning visitor ran the previous version of
 * the CSS and JS exactly once per deploy.
 *
 * That is indistinguishable from "the fix did not work", and it cost an
 * afternoon: a sidebar layout fix went out, was verified on the server, and the
 * person who reported it still saw the broken layout.
 *
 * Run: node scripts/test-sw.mjs   (needs the server up)
 */
import { launchChromium } from './_browser.mjs';
import fs from 'node:fs';

const BASE = process.env.BASE_URL || 'http://localhost:3000';
const results = [];
const check = (name, ok, extra) => results.push({ name, ok: !!ok, extra });

/* Poked and put back. A precached script the landing page really loads, so the
   check watches the executed file rather than a fetch() — a fetch takes a
   different path through the worker and would pass either way. */
const FILE = 'public/prep/_mock.js';
const original = fs.readFileSync(FILE, 'utf8');
const marker = 'v' + process.hrtime.bigint();

const browser = await launchChromium();
const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 }, locale: 'vi-VN' });
const page = await ctx.newPage();

try {
  await page.goto(BASE + '/prep/landing/', { waitUntil: 'networkidle' });
  await page.waitForFunction(() => navigator.serviceWorker.controller !== null, { timeout: 20000 });
  await page.reload({ waitUntil: 'networkidle' });          // the worker is now in charge
  await page.waitForTimeout(600);
  check('The service worker installs and takes control', true);

  fs.writeFileSync(FILE, original + '\nwindow.__SWFRESH=' + JSON.stringify(marker) + ';\n');
  await page.reload({ waitUntil: 'networkidle' });
  const first = await page.evaluate(() => window.__SWFRESH || null);
  check('A deployed script runs on the FIRST load after the deploy',
    first === marker, first === null ? 'the previous version ran' : String(first));

  fs.writeFileSync(FILE, original);
  await page.reload({ waitUntil: 'networkidle' });
  const reverted = await page.evaluate(() => window.__SWFRESH || null);
  check('and a rolled-back one is gone just as quickly', reverted === null, String(reverted));

  /* Freshness must not have cost the reason the worker exists. */
  await ctx.setOffline(true);
  const css = await page.evaluate(async () => {
    const r = await fetch('/tailwind-built.css'); return { ok: r.ok, len: (await r.text()).length };
  });
  const js = await page.evaluate(async () => {
    const r = await fetch('/prep/_chrome.js'); return { ok: r.ok, len: (await r.text()).length };
  });
  await ctx.setOffline(false);
  check('Offline, the stylesheet still comes from the cache', css.ok && css.len > 1000, css.len + ' bytes');
  check('Offline, the shell script still comes from the cache', js.ok && js.len > 1000, js.len + ' bytes');
} finally {
  fs.writeFileSync(FILE, original);
  await browser.close();
}

let bad = 0;
for (const r of results) {
  console.log((r.ok ? '✓ ' : '✗ ') + r.name + (r.ok || !r.extra ? '' : '  — ' + r.extra));
  if (!r.ok) bad++;
}
console.log('\n' + (results.length - bad) + '/' + results.length + ' checks passed');
process.exitCode = bad ? 1 : 0;
