/**
 * Acceptance screenshots (desktop + mobile) for every page.
 * Also catches console errors, CSP ones especially — the requirement is zero.
 *
 * Run:  node scripts/screenshot.mjs [--only=slug]
 * Needs the server up on PORT (3000 by default).
 */
import fs from 'node:fs';
import path from 'node:path';
import { postWithCsrf } from './_csrf.mjs';
import { pool, isFailure, JOBS } from './_pool.mjs';
import { launchChromium } from './_browser.mjs';
import { DEMO_PASSWORD } from './_demo.mjs';

const BASE = process.env.BASE_URL || 'http://localhost:3000';
const OUT = path.resolve('docs/screenshots');
fs.mkdirSync(OUT, { recursive: true });

const only = (process.argv.find(a => a.startsWith('--only=')) || '').split('=')[1];

/* The demo account (a real cookie session) + a local overlay so the images show rich state.
   The overlay is the client-side redeemed-code state — exactly what a real user would
   have, with no need to plant fake rows in the database. */
const DEMO = { id: 'student', pw: DEMO_PASSWORD };

const LOCAL_OVERLAY = {
  student: {
    seenTestIds: [],
    generatedCodes: {},
    extraCodes: [
      { code: 'IELT-AC12-96HD', unlocks: { familyId: 'ielts' }, redeemedAt: '2026-08-05T14:00:00Z', expiresAt: '2026-10-15', status: 'active' }
    ],
    extraTestIds: [],
    extraFamilyIds: ['ielts'],
    extraOrders: [
      { id: 'DH26080101', packageId: 'pk-vpet', name: 'VPET bundle', amount: 129000, at: '2026-08-01T09:28:00Z', status: 'demo' }
    ],
    notif: { newTests: true, reminder: true, promo: false }
  }
};

const PAGES = [
  { slug: 'landing',        url: '/prep/landing/',              auth: false, full: true },
  { slug: 'dang-ky',        url: '/prep/dang-ky/',              auth: false },
  { slug: 'dang-nhap',      url: '/prep/dang-nhap/',            auth: false },
  { slug: 'quen-mat-khau',  url: '/prep/quen-mat-khau/',        auth: false },
  { slug: 'dat-lai-mat-khau', url: '/prep/dat-lai-mat-khau/?token=vi-du', auth: false },
  { slug: 'xac-thuc-email', url: '/prep/xac-thuc-email/?email=ngocanh.study%40gmail.com', auth: false },
  // Sign in for real as the demo student, then shoot the dashboard
  { slug: 'dashboard-student', url: '/prep/', login: { id: 'student', pw: DEMO_PASSWORD }, full: true },
  { slug: 'dashboard',       url: '/prep/',                      auth: true, full: true },
  { slug: 'dashboard-empty', url: '/prep/',                      auth: 'fresh' },
  { slug: 'thu-vien',        url: '/prep/thu-vien/',             auth: true, full: true },
  { slug: 'thu-vien-empty',  url: '/prep/thu-vien/?family=vept', auth: true },
  { slug: 'mua-code',        url: '/prep/mua-code/',             auth: true, full: true },
  { slug: 'nhap-code',       url: '/prep/nhap-code/',            auth: true },
  { slug: 'code-cua-toi',    url: '/prep/code-cua-toi/',         auth: true },
  { slug: 'bai-thi',         url: '/prep/bai-thi/vpet-b1-01/',   auth: true, full: true },
  /* The locked state used to be shot on a PTE paper, which a student can no
     longer see at all now the platform is VPET-only. A fresh account on the
     real VPET paper is the same screen and a truer one: locked because the
     person has no plan, not because the exam does not exist. */
  { slug: 'bai-thi-khoa',    url: '/prep/bai-thi/vpet-b1-01/',   auth: 'fresh' },
  { slug: 'tai-khoan',       url: '/prep/tai-khoan/',            auth: true },
  { slug: 'lam-bai',         url: '/prep/lam-bai/',              auth: true, full: true },
  { slug: 'ket-qua',         url: '/prep/ket-qua/:done/',        auth: true, full: true },
  { slug: 'hoc-on-tap',      url: '/prep/hoc/on-tap/',            auth: true },
  { slug: 'hoc-dong-tu',     url: '/prep/hoc/dong-tu-bat-quy-tac/', auth: true },
  { slug: 'hoc-tu-noi',      url: '/prep/hoc/tu-noi/',            auth: true },
  { slug: 'hoc-thi',         url: '/prep/hoc/thi/',               auth: true },
  { slug: 'hoc-danh-tu',     url: '/prep/hoc/danh-tu/',           auth: true },
  { slug: 'hoc-tinh-tu',     url: '/prep/hoc/tinh-tu/',           auth: true },
  { slug: 'hoc-khuyet-thieu',url: '/prep/hoc/khuyet-thieu/',      auth: true },
  { slug: 'hoc-dieu-kien',   url: '/prep/hoc/dieu-kien/',         auth: true },
  { slug: 'hoc-bi-dong',     url: '/prep/hoc/bi-dong/',           auth: true },
  { slug: 'hoc-menh-de',     url: '/prep/hoc/menh-de/',           auth: true },
  { slug: 'hoc-nhan-manh',   url: '/prep/hoc/nhan-manh/',         auth: true },
  { slug: 'hoc-sac-thai',    url: '/prep/hoc/sac-thai/',          auth: true },
  { slug: 'dashboard-dark',  url: '/prep/',                      auth: true, dark: true },
  { slug: 'landing-dark',    url: '/prep/landing/',              auth: false, dark: true },
  { slug: 'landing-tenant',  url: '/prep/landing/',              auth: false, tenant: 'evergreen' }
];

/** Sign in through the API — the session cookie lands in the context's own jar */
const apiLogin = async (ctx, username, password) => {
  const r = await postWithCsrf(ctx, BASE, '/api/auth/login', { username, password });
  if (!r.ok()) throw new Error('Could not sign in as ' + username + ': HTTP ' + r.status());
};

/** A brand-new account for the "empty dashboard" shot — registered once per run */
const makeFreshAccount = async (browser) => {
  const ctx = await browser.newContext({ ignoreHTTPSErrors: true });
  const account = {
    email: `anh-chup.${String(process.hrtime.bigint()).slice(-9)}@thu-nghiem.vn`,
    password: 'Matkhau123'
  };
  const r = await postWithCsrf(ctx, BASE, '/api/auth/register',
    { name: 'New Student', email: account.email, phone: '0912345678', password: account.password, interests: [] });
  await ctx.close();
  if (!r.ok()) throw new Error('Could not create the empty account: HTTP ' + r.status());
  return account;
};

const run = async () => {
  const launchOpts = {};
  // CI/remote: go through the agent proxy so Google Fonts can be fetched
  if (process.env.HTTPS_PROXY) {
    launchOpts.proxy = { server: process.env.HTTPS_PROXY, bypass: 'localhost,127.0.0.1' };
  }
  const browser = await launchChromium(launchOpts);
  const problems = [];
  const freshAccount = await makeFreshAccount(browser);

  /* The result screen needs a sitting that really exists for the demo account —
     hardcode an id and the acceptance shot captures the "not found" screen. Ask the server. */
  let doneAttempt = null;
  {
    const probe = await browser.newContext();
    await apiLogin(probe, DEMO.id, DEMO.pw);
    const list = await probe.request.get(BASE + '/api/attempts');
    if (list.ok()) {
      const hit = ((await list.json()).items || []).find(a => a.status === 'submitted');
      if (hit) doneAttempt = hit.id;
    }
    await probe.close();
  }

  const pages = PAGES
    .map(x => (x.url.includes(':done')
      ? (doneAttempt ? Object.assign({}, x, { url: x.url.replace(':done', doneAttempt) }) : null)
      : x))
    .filter(Boolean);
  if (!doneAttempt) console.log('   (skipping the result screenshot: no sitting has been submitted)');

  /* Each page is shot at two sizes, and all 88 are independent — own context, own
     file. Running them one at a time was the main reason `npm run verify` took over
     fifteen minutes. They queue across PW_JOBS workers, then ✓ is printed in
     declaration order: completion order is arbitrary, and a log that reorders itself
     on every run can no longer be compared with the last one. */
  const wanted = pages.filter(x => !only || x.slug === only);
  const VIEWPORTS = [['desktop', { width: 1440, height: 900 }], ['mobile', { width: 390, height: 844 }]];
  const shots = [];
  for (const p of wanted) for (const [dev, vp] of VIEWPORTS) shots.push({ p, dev, vp });

  const nameOf = ({ p, dev }) => `${p.slug}-${dev}`;
  const taken = await pool(shots, JOBS, async ({ p, dev, vp }) => {
    // ignoreHTTPSErrors: the agent proxy CA is not in Chromium's NSS store
    // (affects only this local screenshot harness, nothing in the product)
    const ctx = await browser.newContext({ viewport: vp, deviceScaleFactor: 1.5, locale: 'vi-VN', ignoreHTTPSErrors: true });
    try {
      const page = await ctx.newPage();
      const errors = [];
      page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
      page.on('pageerror', e => errors.push('PAGEERROR ' + e.message));

      await page.addInitScript(({ auth, dark, tenant, overlay }) => {
        localStorage.clear();
        if (auth === true) localStorage.setItem('prep.local.v1', JSON.stringify(overlay));
        localStorage.setItem('prep.theme', dark ? 'dark' : 'light');
        if (tenant) localStorage.setItem('prep.tenant', tenant);
      }, { auth: p.auth, dark: !!p.dark, tenant: p.tenant || null, overlay: LOCAL_OVERLAY });

      /* A real session: sign in through the API so the cookie is already in the context */
      if (p.auth === true) await apiLogin(ctx, DEMO.id, DEMO.pw);
      if (p.auth === 'fresh') await apiLogin(ctx, freshAccount.email, freshAccount.password);

      if (p.login) {
        await page.goto(BASE + '/prep/dang-nhap/', { waitUntil: 'networkidle' });
        await page.fill('#email', p.login.id);
        await page.fill('#password', p.login.pw);
        await page.click('#submit');
        await page.waitForURL('**' + p.url, { timeout: 10000 });
      } else {
        await page.goto(BASE + p.url, { waitUntil: 'networkidle' });
      }
      await page.waitForTimeout(1300); // let skeletons give way to content, and fonts load
      await page.screenshot({ path: path.join(OUT, `${p.slug}-${dev}.png`), fullPage: !!p.full });

      const cspErrors = errors.filter(e => /Content Security Policy|CSP/i.test(e));
      const otherErrors = errors.filter(e => !/Content Security Policy|CSP/i.test(e));
      return errors.length ? { page: `${p.slug}-${dev}`, cspErrors, otherErrors } : null;
    } finally {
      await ctx.close();
    }
  }, { describe: nameOf });

  /* A shot that threw is reported as that shot rather than as the whole run,
     and its slug loses its ✓ — the file on disk is missing or stale, and a tick
     next to it would be the log lying about what was produced. */
  const crashed = new Set();
  taken.forEach((r, i) => {
    if (!isFailure(r)) { if (r) problems.push(r); return; }
    crashed.add(shots[i].p.slug);
    problems.push({ page: r.where, cspErrors: [], otherErrors: ['did not complete: ' + r.message] });
  });
  wanted.forEach(p => console.log(crashed.has(p.slug) ? '✗' : '✓', p.slug));

  await browser.close();
  if (problems.length) {
    console.log('\n⚠ CONSOLE ERRORS:');
    for (const pr of problems) {
      console.log(' -', pr.page);
      pr.cspErrors.forEach(e => console.log('   [CSP]', e.slice(0, 220)));
      pr.otherErrors.forEach(e => console.log('   [JS ]', e.slice(0, 220)));
    }
    process.exitCode = 1;
  } else {
    console.log('\n✔ 0 console / CSP errors on any page shot.');
  }
};

run().catch(e => { console.error(e); process.exit(1); });
