/**
 * Acceptance audit: horizontal overflow, button contrast, nav height, console/CSP errors.
 * Run: node scripts/audit.mjs   (needs the server up)
 */
import { postWithCsrf } from './_csrf.mjs';
import { pool, isFailure, JOBS } from './_pool.mjs';
import { launchChromium } from './_browser.mjs';
import { DEMO_PASSWORD, ADMIN_USER, ADMIN_PASSWORD } from './_demo.mjs';

const BASE = process.env.BASE_URL || 'http://localhost:3000';
/* A real cookie session as the demo account + a local overlay for client-side codes */
const DEMO = { id: 'student', pw: DEMO_PASSWORD };
const LOCAL_OVERLAY = {
  student: {
    seenTestIds: [], generatedCodes: {},
    extraCodes: [{ code: 'IELT-AC12-96HD', unlocks: { familyId: 'ielts' }, redeemedAt: '2026-08-05T14:00:00Z', expiresAt: '2026-10-15', status: 'active' }],
    extraTestIds: [], extraFamilyIds: ['ielts'],
    extraOrders: [{ id: 'DH26080101', packageId: 'pk-vpet', name: 'VPET bundle', amount: 129000, at: '2026-08-01T09:28:00Z', status: 'demo', code: 'ABCD-EFGH-JKLM' }],
    notif: { newTests: true, reminder: true, promo: false }
  }
};

/* Guest pages (signed out) — the server bounces these to /prep/ when a session
   exists, so they have to be visited from a SIGNED-OUT context. */
const GUEST_URLS = ['/prep/landing/', '/prep/tai-lieu/', '/prep/tai-lieu/?level=2',
  '/prep/rieng-tu/', '/prep/dieu-khoan/', '/prep/hoan-tien/',
  '/prep/dang-ky/', '/prep/dang-nhap/', '/prep/quen-mat-khau/',
  '/prep/xac-thuc-email/', '/prep/dat-lai-mat-khau/'];

/* The admin area, and it had NEVER been audited.
 *
 * The screenshot step opens these pages and watches the console, so a page that
 * threw was caught. Nothing ever measured whether they FIT. Every overflow and
 * contrast check this file makes stopped at the student side, so the interface
 * an owner uses all day was the one part of the platform with no layout check
 * at all — and it is the part with the widest tables and the longest
 * Vietnamese labels, which is where a layout breaks first.
 *
 * Signed in as an administrator rather than a learner; see ADMIN_URLS below. */
const ADMIN_URLS = [
  '/admin/', '/admin/de-thi/', '/admin/format/', '/admin/ngan-hang/',
  '/admin/hoc-vien/', '/admin/code/', '/admin/quan-tri/'
];

const URLS = GUEST_URLS.concat([
  '/prep/', '/prep/mua-code/', '/prep/nhap-code/',
  '/prep/code-cua-toi/', '/prep/bai-thi/vpet-b1-01/', '/prep/bai-thi/khong-co-that/', '/prep/tai-khoan/',
  '/prep/lam-bai/', '/prep/ket-qua/:done/',
  /* Blocks 3.5 to 6. These were in neither this list nor the screenshot list,
     which is how four pages shipped with their static headings rendering blank
     and nothing went red: no audit ever opened them. Note /prep/on-tap/ is the
     revision area and is a different page from /prep/hoc/on-tap/ below. */
  '/prep/luyen/', '/prep/xep-lop/', '/prep/on-tap/',
  '/prep/hoc/on-tap/', '/prep/hoc/dong-tu-bat-quy-tac/', '/prep/hoc/tu-noi/', '/prep/hoc/thi/', '/prep/hoc/danh-tu/', '/prep/hoc/tinh-tu/', '/prep/hoc/khuyet-thieu/', '/prep/hoc/dieu-kien/', '/prep/hoc/bi-dong/', '/prep/hoc/menh-de/', '/prep/hoc/nhan-manh/', '/prep/hoc/sac-thai/'
]).concat(ADMIN_URLS);
const WIDTHS = [360, 390, 768, 1024, 1440];

/* WCAG contrast */
const lum = ([r, g, b]) => {
  const f = v => { v /= 255; return v <= .03928 ? v / 12.92 : Math.pow((v + .055) / 1.055, 2.4); };
  return .2126 * f(r) + .7152 * f(g) + .0722 * f(b);
};
const ratio = (a, b) => { const [x, y] = [lum(a), lum(b)].sort((m, n) => n - m); return (x + .05) / (y + .05); };

/* Chromium returns 'rgb(r g b / a)' OR 'color(srgb 0..1 0..1 0..1 / a)' (from color-mix).
   Normalise to [r,g,b,a] with r,g,b on a 0-255 scale. */
const parse = s => {
  const n = (s.match(/[\d.]+(?=%?)/g) || []).map(Number);
  if (!n.length) return [0, 0, 0, 1];
  const srgb = /^color\(\s*srgb/i.test(s);
  const [r, g, b] = srgb ? n.slice(0, 3).map(v => v * 255) : n.slice(0, 3);
  const a = n.length > 3 ? n[3] : 1;
  return [r, g, b, a];
};
/* Composite a background with alpha over the one beneath it */
const over = (fg, bg) => {
  const a = fg[3];
  return [0, 1, 2].map(i => fg[i] * a + bg[i] * (1 - a)).concat(1);
};

const run = async () => {
  const browser = await launchChromium();
  const issues = [];

  /* The result screen needs a sitting that REALLY exists for the demo account.
     Hardcode an id and it may not exist or may belong to someone else, the API
     answers 404, and the audit goes red over data rather than over the interface. */
  let doneAttempt = null;
  {
    const probe = await browser.newContext();
    await postWithCsrf(probe, BASE, '/api/auth/login', { username: DEMO.id, password: DEMO.pw });
    const list = await probe.request.get(BASE + '/api/attempts');
    if (list.ok()) {
      const items = (await list.json()).items || [];
      const hit = items.find(a => a.status === 'submitted');
      if (hit) doneAttempt = hit.id;
    }
    await probe.close();
  }
  const urls = URLS
    .map(u => (u.includes(':done') ? (doneAttempt ? u.replace(':done', doneAttempt) : null) : u))
    .filter(Boolean);
  if (!doneAttempt) console.log('   (skipping the result screen: the demo account has submitted no sitting)');

  /* 230 page loads — 2 colour modes × 23 paths × 5 widths — run one at a time was
     the slowest part of `npm run verify`. They are entirely independent: a context
     each, no shared state, so they queue up in parallel. Results are collected in
     input order and printed afterwards, because the COMPLETION order is arbitrary
     and a report that reorders itself on every run cannot be diffed against the
     last one. */
  const jobs = [];
  for (const dark of [false, true]) {
    for (const url of urls) {
      for (const w of WIDTHS) jobs.push({ dark, url, w });
    }
  }

  const tagOf = ({ dark, url, w }) => `${url} @${w}${dark ? ' dark' : ''}`;
  const perJob = await pool(jobs, JOBS, async (job) => {
    const { dark, url, w } = job;
    const mine = [];
    const ctx = await browser.newContext({ viewport: { width: w, height: 900 }, locale: 'vi-VN' });
    try {
      const page = await ctx.newPage();
      const errs = [];
      page.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
      page.on('pageerror', e => errs.push('PAGEERROR ' + e.message));
      const guest = GUEST_URLS.includes(url.split('?')[0]);
      const isAdmin = url.startsWith('/admin/');
      await page.addInitScript(({ o, d, g }) => {
        localStorage.clear();
        if (!g) localStorage.setItem('prep.local.v1', JSON.stringify(o));
        localStorage.setItem('prep.theme', d ? 'dark' : 'light');
      }, { o: LOCAL_OVERLAY, d: dark, g: guest });
      if (isAdmin) {
        /* A different cookie and a different table: prep_admin, not prep_user.
           Signing in as the learner and then asking for /admin/ answers a
           redirect, and an audit that measures the sign-in page thirty times
           over is an audit that reports nothing. */
        const r = await postWithCsrf(ctx, BASE, '/api/admin/login',
          { username: ADMIN_USER, password: ADMIN_PASSWORD });
        if (!r.ok()) mine.push(`[sign-in] ${url}: HTTP ${r.status()}`);
      } else if (!guest) {
        const r = await postWithCsrf(ctx, BASE, '/api/auth/login', { username: DEMO.id, password: DEMO.pw });
        if (!r.ok()) mine.push(`[sign-in] ${url}: HTTP ${r.status()}`);
      }
      await page.goto(BASE + url, { waitUntil: 'networkidle' });
      await page.waitForTimeout(1100);

      const tag = tagOf(job);
      if (errs.length) mine.push(`[console] ${tag}: ${errs[0].slice(0, 140)}`);

      /* "Can a person actually slide this page sideways?" — asked by trying it,
         not by reading documentElement.scrollWidth.
         That was the old test and it is wrong on any page holding a horizontal
         scroller. Chromium folds a clipped descendant's scrollable width into
         the ROOT element's scrollWidth, so `/admin/code/` reported 482 against
         a 390 viewport while `body.scrollWidth` was 390 and the page did not
         move a pixel: the wide table was inside its `overflow-x-auto` wrapper,
         behaving exactly as designed. Adding the admin pages to this audit
         turned that into six false failures at once, which is the sort of
         result that gets an audit switched off.
         Two things are genuine breakage and both are kept: the page really
         slides, or the body is wider than the window (content cut off at the
         edge with no way to reach it). */
      const overflow = await page.evaluate(() => {
        window.scrollTo({ left: 99999, behavior: 'instant' });
        const slid = Math.round(window.scrollX);
        window.scrollTo({ left: 0, behavior: 'instant' });
        return slid > 1 || document.body.scrollWidth > window.innerWidth + 1;
      });
      if (overflow) mine.push(`[overflow] ${tag}`);

      /* A heading or a control that takes up space and says nothing.
         Four pages went out with every static label blank, because they were
         authored with data-en / data-vi attributes that no code on this
         platform reads. Every check in this file passed: an empty <h2> does not
         overflow, and it has no text to fail a contrast ratio. Nothing was
         looking for the one symptom a person would have spotted instantly.
         Hidden and aria-hidden elements are skipped, and so is anything holding
         an icon, an image or an aria-label, which is a legitimately wordless
         control. */
      const blanks = await page.evaluate(() => {
        const out = [];
        document.querySelectorAll('h1, h2, h3, button, a.btn, summary, label').forEach(el => {
          if (el.closest('[hidden]') || el.closest('[aria-hidden="true"]')) return;
          /* Height is deliberately NOT part of this test. The first version
             required a non-zero one and found nothing, because an empty
             heading collapses to exactly zero height. That is the same reason
             the bug survived in the first place: a blank <h2> does not leave a
             gap where a reader would notice something missing, it leaves no
             trace at all. Display and visibility are what "on the page" means
             here. */
          const cs = getComputedStyle(el);
          if (cs.visibility === 'hidden' || cs.display === 'none') return;
          if ((el.textContent || '').trim()) return;
          if (el.querySelector('svg, img, canvas')) return;
          if (el.getAttribute('aria-label') || el.getAttribute('title')) return;
          out.push(el.tagName.toLowerCase()
            + (el.id ? '#' + el.id : '')
            + (el.className && typeof el.className === 'string'
                ? '.' + el.className.trim().split(/\s+/).slice(0, 2).join('.') : ''));
        });
        return out;
      });
      for (const b of blanks.slice(0, 3)) mine.push(`[blank] ${tag}: <${b}> renders no text`);

      // Buttons and chips: text vs background contrast + labels wrapping on desktop
      const bad = await page.evaluate(() => {
        const out = [];
        document.querySelectorAll('.btn, .chip, .badge').forEach(el => {
          const r = el.getBoundingClientRect();
          if (!r.width || el.closest('[hidden]') || getComputedStyle(el).visibility === 'hidden') return;
          const cs = getComputedStyle(el);
          // The background chain from the element up to body (to composite alpha in order)
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
          // Effective background: composite from the bottom up (skipping fully transparent layers)
        let bg = [255, 255, 255, 1];
        for (const c of b.bgStack.slice().reverse()) {
          const p = parse(c);
          if (p[3] > 0) bg = over(p, bg);
        }
        const fg = over(parse(b.fg), bg);
        const cr = ratio(fg, bg);
        const large = b.size >= 18 || (b.size >= 14 && +b.weight >= 700);
        const min = large ? 3 : 4.5;
        if (cr < min) mine.push(`[contrast ${cr.toFixed(2)}<${min}] ${tag} "${b.text}" ${b.fg} on ${b.bgStack[0]}`);
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
        wrapped.forEach(t => mine.push(`[button wraps] ${tag} "${t}"`));
        const navH = await page.evaluate(() => {
          const h = document.querySelector('header');
          return h ? Math.round(h.getBoundingClientRect().height) : 0;
        });
        if (navH > 80) mine.push(`[nav cao ${navH}px] ${tag}`);
      }
    } finally {
      await ctx.close();
    }
    return mine;
  }, { describe: tagOf });

  /* A job that threw becomes one more line in the report, naming the page and
     the width, instead of a stack trace standing in for all 230 of them. */
  for (const result of perJob) {
    if (isFailure(result)) issues.push(`[crashed] ${result.where}: ${result.message}`);
    else issues.push(...result);
  }

  await browser.close();

  const uniq = [...new Set(issues)];
  if (uniq.length) { console.log('⚠ ' + uniq.length + ' problem(s):'); uniq.forEach(i => console.log(' - ' + i)); process.exitCode = 1; }
  else console.log('✔ Audit clean: 0 overflow, 0 contrast failures, 0 blank labels, 0 console/CSP errors.');
};

run().catch(e => { console.error(e); process.exit(1); });
