/**
 * Chụp màn hình nghiệm thu (desktop + mobile) cho mọi trang.
 * Đồng thời bắt lỗi console (đặc biệt lỗi CSP) — yêu cầu: 0 lỗi.
 *
 * Cách chạy:  node scripts/screenshot.mjs [--only=slug]
 * Yêu cầu server đang chạy ở PORT (mặc định 3000).
 */
import { chromium } from 'playwright-core';
import fs from 'node:fs';
import path from 'node:path';

const BASE = process.env.BASE_URL || 'http://localhost:3000';
const OUT = path.resolve('docs/screenshots');
fs.mkdirSync(OUT, { recursive: true });

const only = (process.argv.find(a => a.startsWith('--only=')) || '').split('=')[1];

/* Phiên đăng nhập mock + dữ liệu demo phong phú để screenshot có trạng thái thật */
const SESSION = {
  account: 'ngocanh.study@gmail.com',
  user: { name: 'Ngọc Ánh', email: 'ngocanh.study@gmail.com', verified: true, interests: ['ielts', 'toeic'] },
  unlockedTestIds: ['vpet-b1-01'],
  unlockedFamilyIds: ['ielts'],
  myCodes: [
    { code: 'VPET-B1MK-24TR', unlocks: { testId: 'vpet-b1-01' }, redeemedAt: '2026-08-01T09:30:00Z', expiresAt: '2026-12-31', status: 'active' },
    { code: 'IELT-AC12-96HD', unlocks: { familyId: 'ielts' }, redeemedAt: '2026-08-05T14:00:00Z', expiresAt: '2026-10-15', status: 'active' }
  ],
  orders: [
    { id: 'DH26080101', packageId: 'pk-vpet', name: 'Gói VPET', amount: 129000, at: '2026-08-01T09:28:00Z', status: 'demo' }
  ],
  notif: { newTests: true, reminder: true, promo: false }
};

const PAGES = [
  { slug: 'landing',        url: '/prep/landing/',              auth: false, full: true },
  { slug: 'dang-ky',        url: '/prep/dang-ky/',              auth: false },
  { slug: 'dang-nhap',      url: '/prep/dang-nhap/',            auth: false },
  { slug: 'quen-mat-khau',  url: '/prep/quen-mat-khau/',        auth: false },
  { slug: 'xac-thuc-email', url: '/prep/xac-thuc-email/?email=ngocanh.study%40gmail.com', auth: false },
  { slug: 'dashboard',       url: '/prep/',                      auth: true },
  { slug: 'dashboard-empty', url: '/prep/',                      auth: 'fresh' },
  { slug: 'thu-vien',        url: '/prep/thu-vien/',             auth: true, full: true },
  { slug: 'thu-vien-empty',  url: '/prep/thu-vien/?family=vept', auth: true },
  { slug: 'mua-code',        url: '/prep/mua-code/',             auth: true, full: true },
  { slug: 'nhap-code',       url: '/prep/nhap-code/',            auth: true },
  { slug: 'code-cua-toi',    url: '/prep/code-cua-toi/',         auth: true },
  { slug: 'bai-thi',         url: '/prep/bai-thi/vpet-b1-01/',   auth: true, full: true },
  { slug: 'bai-thi-khoa',    url: '/prep/bai-thi/pte-ac-01/',    auth: true },
  { slug: 'tai-khoan',       url: '/prep/tai-khoan/',            auth: true },
  { slug: 'dashboard-dark',  url: '/prep/',                      auth: true, dark: true },
  { slug: 'landing-dark',    url: '/prep/landing/',              auth: false, dark: true },
  { slug: 'landing-tenant',  url: '/prep/landing/',              auth: false, tenant: 'evergreen' }
];

const run = async () => {
  const launchOpts = { executablePath: '/opt/pw-browsers/chromium' };
  // Môi trường CI/remote: đi qua agent proxy để tải được Google Fonts
  if (process.env.HTTPS_PROXY) {
    launchOpts.proxy = { server: process.env.HTTPS_PROXY, bypass: 'localhost,127.0.0.1' };
  }
  const browser = await chromium.launch(launchOpts);
  const problems = [];

  for (const p of PAGES.filter(x => !only || x.slug === only)) {
    for (const [dev, vp] of [['desktop', { width: 1440, height: 900 }], ['mobile', { width: 390, height: 844 }]]) {
      // ignoreHTTPSErrors: CA của agent-proxy không nằm trong NSS store của Chromium
      // (chỉ ảnh hưởng harness chụp ảnh cục bộ, không liên quan sản phẩm)
      const ctx = await browser.newContext({ viewport: vp, deviceScaleFactor: 1.5, locale: 'vi-VN', ignoreHTTPSErrors: true });
      const page = await ctx.newPage();
      const errors = [];
      page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
      page.on('pageerror', e => errors.push('PAGEERROR ' + e.message));

      await page.addInitScript(({ auth, dark, tenant, session }) => {
        localStorage.clear();
        if (auth === true) localStorage.setItem('prep.session.v1', JSON.stringify(session));
        if (auth === 'fresh') localStorage.setItem('prep.session.v1', JSON.stringify({
          user: { name: 'Tân Sinh Viên', email: 'tan.sv@gmail.com', verified: true, interests: [] },
          unlockedTestIds: [], unlockedFamilyIds: [], myCodes: [], orders: [],
          notif: { newTests: true, reminder: true, promo: false }
        }));
        localStorage.setItem('prep.theme', dark ? 'dark' : 'light');
        if (tenant) localStorage.setItem('prep.tenant', tenant);
      }, { auth: p.auth, dark: !!p.dark, tenant: p.tenant || null, session: SESSION });

      await page.goto(BASE + p.url, { waitUntil: 'networkidle' });
      await page.waitForTimeout(1300); // đợi skeleton nhường chỗ cho nội dung + font
      await page.screenshot({ path: path.join(OUT, `${p.slug}-${dev}.png`), fullPage: !!p.full });

      const cspErrors = errors.filter(e => /Content Security Policy|CSP/i.test(e));
      const otherErrors = errors.filter(e => !/Content Security Policy|CSP/i.test(e));
      if (errors.length) problems.push({ page: `${p.slug}-${dev}`, cspErrors, otherErrors });
      await ctx.close();
    }
    console.log('✓', p.slug);
  }

  await browser.close();
  if (problems.length) {
    console.log('\n⚠ LỖI CONSOLE:');
    for (const pr of problems) {
      console.log(' -', pr.page);
      pr.cspErrors.forEach(e => console.log('   [CSP]', e.slice(0, 220)));
      pr.otherErrors.forEach(e => console.log('   [JS ]', e.slice(0, 220)));
    }
    process.exitCode = 1;
  } else {
    console.log('\n✔ 0 lỗi console / CSP trên tất cả trang đã chụp.');
  }
};

run().catch(e => { console.error(e); process.exit(1); });
