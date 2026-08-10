/**
 * Audit nghiệm thu: tràn ngang, tương phản nút, chiều cao nav, lỗi console/CSP.
 * Chạy: node scripts/audit.mjs   (cần server đang chạy)
 */
import { chromium } from 'playwright-core';

const BASE = process.env.BASE_URL || 'http://localhost:3000';
/* Phiên thật (cookie) bằng tài khoản demo + lớp phủ cục bộ cho code kích hoạt client */
const DEMO = { id: 'student', pw: 'Goodmorning01' };
const LOCAL_OVERLAY = {
  student: {
    seenTestIds: [], generatedCodes: {},
    extraCodes: [{ code: 'IELT-AC12-96HD', unlocks: { familyId: 'ielts' }, redeemedAt: '2026-08-05T14:00:00Z', expiresAt: '2026-10-15', status: 'active' }],
    extraTestIds: [], extraFamilyIds: ['ielts'],
    extraOrders: [{ id: 'DH26080101', packageId: 'pk-vpet', name: 'Gói VPET', amount: 129000, at: '2026-08-01T09:28:00Z', status: 'demo', code: 'ABCD-EFGH-JKLM' }],
    notif: { newTests: true, reminder: true, promo: false }
  }
};

/* Trang khách (không đăng nhập) — server sẽ đá trang này về /prep/ nếu có phiên,
   nên phải duyệt chúng bằng context KHÔNG đăng nhập. */
const GUEST_URLS = ['/prep/landing/', '/prep/dang-ky/', '/prep/dang-nhap/', '/prep/quen-mat-khau/',
  '/prep/xac-thuc-email/', '/prep/dat-lai-mat-khau/'];

const URLS = GUEST_URLS.concat([
  '/prep/', '/prep/thu-vien/', '/prep/thu-vien/?family=vept', '/prep/mua-code/', '/prep/nhap-code/',
  '/prep/code-cua-toi/', '/prep/bai-thi/vpet-b1-01/', '/prep/bai-thi/pte-ac-01/', '/prep/tai-khoan/',
  '/prep/hoc/dong-tu-bat-quy-tac/', '/prep/hoc/tu-noi/', '/prep/hoc/thi/', '/prep/hoc/danh-tu/', '/prep/hoc/khuyet-thieu/', '/prep/hoc/dieu-kien/', '/prep/hoc/bi-dong/', '/prep/hoc/menh-de/', '/prep/hoc/nhan-manh/'
]);
const WIDTHS = [360, 390, 768, 1024, 1440];

/* Tương phản WCAG */
const lum = ([r, g, b]) => {
  const f = v => { v /= 255; return v <= .03928 ? v / 12.92 : Math.pow((v + .055) / 1.055, 2.4); };
  return .2126 * f(r) + .7152 * f(g) + .0722 * f(b);
};
const ratio = (a, b) => { const [x, y] = [lum(a), lum(b)].sort((m, n) => n - m); return (x + .05) / (y + .05); };

/* Chromium trả 'rgb(r g b / a)' HOẶC 'color(srgb 0..1 0..1 0..1 / a)' (kết quả color-mix).
   Chuẩn hoá về [r,g,b,a] với r,g,b thang 0-255. */
const parse = s => {
  const n = (s.match(/[\d.]+(?=%?)/g) || []).map(Number);
  if (!n.length) return [0, 0, 0, 1];
  const srgb = /^color\(\s*srgb/i.test(s);
  const [r, g, b] = srgb ? n.slice(0, 3).map(v => v * 255) : n.slice(0, 3);
  const a = n.length > 3 ? n[3] : 1;
  return [r, g, b, a];
};
/* Chồng màu nền có alpha lên nền dưới */
const over = (fg, bg) => {
  const a = fg[3];
  return [0, 1, 2].map(i => fg[i] * a + bg[i] * (1 - a)).concat(1);
};

const run = async () => {
  const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
  const issues = [];

  for (const dark of [false, true]) {
    for (const url of URLS) {
      for (const w of WIDTHS) {
        const ctx = await browser.newContext({ viewport: { width: w, height: 900 }, locale: 'vi-VN' });
        const page = await ctx.newPage();
        const errs = [];
        page.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
        page.on('pageerror', e => errs.push('PAGEERROR ' + e.message));
        const guest = GUEST_URLS.includes(url.split('?')[0]);
        await page.addInitScript(({ o, d, g }) => {
          localStorage.clear();
          if (!g) localStorage.setItem('prep.local.v1', JSON.stringify(o));
          localStorage.setItem('prep.theme', d ? 'dark' : 'light');
        }, { o: LOCAL_OVERLAY, d: dark, g: guest });
        if (!guest) {
          const r = await ctx.request.post(BASE + '/api/auth/login', { data: { username: DEMO.id, password: DEMO.pw } });
          if (!r.ok()) issues.push(`[đăng nhập] ${url}: HTTP ${r.status()}`);
        }
        await page.goto(BASE + url, { waitUntil: 'networkidle' });
        await page.waitForTimeout(1100);

        const tag = `${url} @${w}${dark ? ' dark' : ''}`;
        if (errs.length) issues.push(`[console] ${tag}: ${errs[0].slice(0, 140)}`);

        const overflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 1);
        if (overflow) issues.push(`[tràn ngang] ${tag}`);

        // Nút/chip: tương phản chữ vs nền + nhãn xuống dòng ở desktop
        const bad = await page.evaluate(() => {
          const out = [];
          document.querySelectorAll('.btn, .chip, .badge').forEach(el => {
            const r = el.getBoundingClientRect();
            if (!r.width || el.closest('[hidden]') || getComputedStyle(el).visibility === 'hidden') return;
            const cs = getComputedStyle(el);
            // Chuỗi nền từ phần tử lên tới body (để chồng alpha đúng thứ tự)
            const stack = [];
            for (let node = el; node; node = node.parentElement) {
              stack.push(getComputedStyle(node).backgroundColor);
            }
            stack.push(getComputedStyle(document.body).backgroundColor);
            out.push({
              text: (el.textContent || '').trim().slice(0, 34),
              fg: cs.color, bgStack: stack,
              size: parseFloat(cs.fontSize), weight: cs.fontWeight,
              lines: Math.round(r.height / (parseFloat(cs.lineHeight) || parseFloat(cs.fontSize) * 1.4))
            });
          });
          return out;
        });
        bad.forEach(b => {
          // Nền hiệu dụng: chồng ngược từ dưới lên (bỏ lớp trong suốt hoàn toàn)
          let bg = [255, 255, 255, 1];
          for (const c of b.bgStack.slice().reverse()) {
            const p = parse(c);
            if (p[3] > 0) bg = over(p, bg);
          }
          const fg = over(parse(b.fg), bg);
          const cr = ratio(fg, bg);
          const large = b.size >= 18 || (b.size >= 14 && +b.weight >= 700);
          const min = large ? 3 : 4.5;
          if (cr < min) issues.push(`[tương phản ${cr.toFixed(2)}<${min}] ${tag} "${b.text}" ${b.fg} trên ${b.bgStack[0]}`);
        });

        if (w >= 1024) {
          const wrapped = await page.evaluate(() => {
            const bad = [];
            document.querySelectorAll('.btn').forEach(el => {
              const cs = getComputedStyle(el);
              const lh = parseFloat(cs.lineHeight) || parseFloat(cs.fontSize) * 1.4;
              const inner = el.getBoundingClientRect().height - parseFloat(cs.paddingTop) - parseFloat(cs.paddingBottom);
              if (inner > lh * 1.7) bad.push((el.textContent || '').trim().slice(0, 32));
            });
            return bad;
          });
          wrapped.forEach(t => issues.push(`[nút xuống dòng] ${tag} "${t}"`));
          const navH = await page.evaluate(() => {
            const h = document.querySelector('header');
            return h ? Math.round(h.getBoundingClientRect().height) : 0;
          });
          if (navH > 80) issues.push(`[nav cao ${navH}px] ${tag}`);
        }
        await ctx.close();
      }
    }
  }
  await browser.close();

  const uniq = [...new Set(issues)];
  if (uniq.length) { console.log('⚠ ' + uniq.length + ' vấn đề:'); uniq.forEach(i => console.log(' - ' + i)); process.exitCode = 1; }
  else console.log('✔ Audit sạch: 0 tràn ngang, 0 lỗi tương phản, 0 lỗi console/CSP.');
};

run().catch(e => { console.error(e); process.exit(1); });
