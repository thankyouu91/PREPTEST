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
import { postWithCsrf } from './_csrf.mjs';

const BASE = process.env.BASE_URL || 'http://localhost:3000';
const OUT = path.resolve('docs/screenshots');
fs.mkdirSync(OUT, { recursive: true });

const only = (process.argv.find(a => a.startsWith('--only=')) || '').split('=')[1];

/* Tài khoản demo (phiên thật qua cookie) + lớp phủ cục bộ để ảnh có trạng thái phong phú.
   Lớp phủ chính là phần code kích hoạt phía client — đúng thứ người dùng thật sẽ có,
   không cần chèn dữ liệu giả vào CSDL. */
const DEMO = { id: 'student', pw: 'Goodmorning01' };

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
  // Đăng nhập thật bằng tài khoản demo student rồi chụp dashboard
  { slug: 'dashboard-student', url: '/prep/', login: { id: 'student', pw: 'Goodmorning01' }, full: true },
  { slug: 'dashboard',       url: '/prep/',                      auth: true, full: true },
  { slug: 'dashboard-empty', url: '/prep/',                      auth: 'fresh' },
  { slug: 'thu-vien',        url: '/prep/thu-vien/',             auth: true, full: true },
  { slug: 'thu-vien-empty',  url: '/prep/thu-vien/?family=vept', auth: true },
  { slug: 'mua-code',        url: '/prep/mua-code/',             auth: true, full: true },
  { slug: 'nhap-code',       url: '/prep/nhap-code/',            auth: true },
  { slug: 'code-cua-toi',    url: '/prep/code-cua-toi/',         auth: true },
  { slug: 'bai-thi',         url: '/prep/bai-thi/vpet-b1-01/',   auth: true, full: true },
  { slug: 'bai-thi-khoa',    url: '/prep/bai-thi/pte-ac-01/',    auth: true },
  { slug: 'tai-khoan',       url: '/prep/tai-khoan/',            auth: true },
  { slug: 'lam-bai',         url: '/prep/lam-bai/',              auth: true, full: true },
  { slug: 'ket-qua',         url: '/prep/ket-qua/:done/',        auth: true, full: true },
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

/** Đăng nhập qua API — cookie phiên đi thẳng vào cookie jar của context */
const apiLogin = async (ctx, username, password) => {
  const r = await postWithCsrf(ctx, BASE, '/api/auth/login', { username, password });
  if (!r.ok()) throw new Error('Không đăng nhập được ' + username + ': HTTP ' + r.status());
};

/** Tài khoản mới tinh cho ảnh "dashboard trống" — đăng ký một lần mỗi lượt chạy */
const makeFreshAccount = async (browser) => {
  const ctx = await browser.newContext({ ignoreHTTPSErrors: true });
  const account = {
    email: `anh-chup.${String(process.hrtime.bigint()).slice(-9)}@thu-nghiem.vn`,
    password: 'Matkhau123'
  };
  const r = await postWithCsrf(ctx, BASE, '/api/auth/register',
    { name: 'Tân Sinh Viên', email: account.email, password: account.password, interests: [] });
  await ctx.close();
  if (!r.ok()) throw new Error('Không tạo được tài khoản trống: HTTP ' + r.status());
  return account;
};

const run = async () => {
  const launchOpts = { executablePath: '/opt/pw-browsers/chromium' };
  // Môi trường CI/remote: đi qua agent proxy để tải được Google Fonts
  if (process.env.HTTPS_PROXY) {
    launchOpts.proxy = { server: process.env.HTTPS_PROXY, bypass: 'localhost,127.0.0.1' };
  }
  const browser = await chromium.launch(launchOpts);
  const problems = [];
  const freshAccount = await makeFreshAccount(browser);

  /* Màn kết quả cần một lượt thi có thật của tài khoản demo — gắn cứng một id
     thì ảnh nghiệm thu sẽ chụp đúng cái màn "không tìm thấy". Hỏi máy chủ. */
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
  if (!doneAttempt) console.log('   (bỏ qua ảnh màn kết quả: chưa có lượt thi nào đã nộp)');

  for (const p of pages.filter(x => !only || x.slug === only)) {
    for (const [dev, vp] of [['desktop', { width: 1440, height: 900 }], ['mobile', { width: 390, height: 844 }]]) {
      // ignoreHTTPSErrors: CA của agent-proxy không nằm trong NSS store của Chromium
      // (chỉ ảnh hưởng harness chụp ảnh cục bộ, không liên quan sản phẩm)
      const ctx = await browser.newContext({ viewport: vp, deviceScaleFactor: 1.5, locale: 'vi-VN', ignoreHTTPSErrors: true });
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

      /* Phiên thật: đăng nhập qua API để cookie nằm sẵn trong context */
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
