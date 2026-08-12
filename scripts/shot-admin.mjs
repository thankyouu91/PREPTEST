/** Screenshots of the admin screens (a real sign-in) + console/CSP errors. */
import fs from 'node:fs';
import { launchChromium } from './_browser.mjs';
const BASE = process.env.BASE_URL || 'http://localhost:3000';
const OUT = 'docs/screenshots';
fs.mkdirSync(OUT, { recursive: true });
const PAGES = [
  ['admin-login', '/admin/dang-nhap/', false],
  ['admin-reports', '/admin/', true],
  ['admin-tests', '/admin/de-thi/', true],
  ['admin-formats', '/admin/format/', true],
  ['admin-builder', '/admin/de-thi/vpet-b1-01/', true],
  ['admin-bank', '/admin/ngan-hang/', true],
  ['admin-users', '/admin/hoc-vien/', true],
  ['admin-codes', '/admin/code/', true],
  ['admin-settings', '/admin/quan-tri/', true]
];
const b = await launchChromium();
const problems = [];
for (const [slug, url, needAuth] of PAGES) {
  for (const [dev, vp] of [['desktop', { width: 1440, height: 950 }], ['mobile', { width: 390, height: 844 }]]) {
    const c = await b.newContext({ viewport: vp, deviceScaleFactor: 1.5, locale: 'vi-VN' });
    const p = await c.newPage();
    const errs = [];
    p.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
    p.on('pageerror', e => errs.push('PAGEERROR ' + e.message));
    if (needAuth) {
      await p.goto(BASE + '/admin/dang-nhap/', { waitUntil: 'networkidle' });
      await p.fill('#username', process.env.ADMIN_USERNAME || 'admin');
      await p.fill('#password', process.env.ADMIN_PASSWORD || 'Admin@123456');
      await p.click('#submit');
      // Wait until the sign-in page is really gone, so goto does not race the redirect
      await p.waitForURL(u => !u.pathname.includes('dang-nhap'), { timeout: 10000 });
      await p.waitForLoadState('networkidle');
    }
    if (new URL(p.url()).pathname !== url) {
      await p.goto(BASE + url, { waitUntil: 'networkidle' });
    }
    await p.waitForTimeout(1500);
    await p.screenshot({ path: `${OUT}/${slug}-${dev}.png`, fullPage: dev === 'desktop' });
    if (errs.length) problems.push(`${slug}-${dev}: ${errs[0].slice(0, 200)}`);
    await c.close();
  }
  console.log('✓', slug);
}
await b.close();
if (problems.length) { console.log('\n⚠ Console errors:'); problems.forEach(x => console.log(' -', x)); process.exitCode = 1; }
else console.log('\n✔ 0 console/CSP errors on any admin screen.');
