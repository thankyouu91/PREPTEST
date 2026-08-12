/**
 * Chụp phòng thi VPET — mỗi part một ảnh, desktop và mobile.
 *
 * `screenshot.mjs` chụp các trang tĩnh. Phòng thi thì không chụp kiểu đó được:
 * nó chỉ tồn tại khi có một lượt thi đang mở, mỗi part chỉ hiện sau khi part
 * trước đã bấm vào, và đồng hồ bắt đầu chạy ngay lúc đó. Nên lệnh này mở một
 * lượt thi thật qua API, đi qua từng part, chụp, rồi nộp bài để không bỏ lại
 * một lượt dở dang chiếm hạn mức của tài khoản.
 *
 *   node scripts/chup-phong-thi.mjs             chụp tất cả
 *   node scripts/chup-phong-thi.mjs --part=G    chỉ một part
 *   node scripts/chup-phong-thi.mjs --giu       giữ lại lượt thi để xem tay
 *
 * Ảnh vào docs/screenshots/phong-thi/.
 *
 * Lỗi console và lỗi CSP được bắt như mọi lệnh chụp khác: một phòng thi có lỗi
 * CSP là một phòng thi có thể hỏng giữa chừng, và thí sinh không làm lại được.
 */
import { chromium } from 'playwright-core';
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const FORMATS = require('../server/data/exam-formats.js');

const BASE = process.env.BASE_URL || 'http://localhost:3000';
const OUT = path.resolve('docs/screenshots/phong-thi');
const STUDENT = { id: 'student', pw: process.env.DEMO_PASSWORD || 'Goodmorning01' };
const ADMIN = { id: process.env.ADMIN_USERNAME || 'admin', pw: process.env.ADMIN_PASSWORD || 'Goodmorning01' };

const args = process.argv.slice(2);
const CHI = (args.find(a => a.startsWith('--part=')) || '').slice(7).toUpperCase();
const GIU = args.includes('--giu');

const DESKTOP = { width: 1440, height: 900 };
const MOBILE = { width: 390, height: 844 };

fs.mkdirSync(OUT, { recursive: true });

const loi = [];
const shots = [];

async function login(ctx) {
  const r = await ctx.request.post(BASE + '/api/auth/login', {
    data: { username: STUDENT.id, password: STUDENT.pw }
  });
  if (!r.ok()) throw new Error(`Không đăng nhập được ${STUDENT.id}: HTTP ${r.status()}`);
}

/** Cookie CSRF là kiểu double-submit, nên phải đọc ra và gắn vào header. */
async function csrf(ctx) {
  const all = await ctx.cookies();
  const c = all.find(x => x.name === 'prep_csrf');
  return c ? c.value : '';
}

const api = async (ctx, method, url, data) => {
  const token = await csrf(ctx);
  const res = await ctx.request.fetch(BASE + url, {
    method, data,
    headers: { 'x-csrf-token': token, 'content-type': 'application/json' }
  });
  let body = null;
  try { body = await res.json(); } catch (e) { /* nộp bài trả về rỗng */ }
  return { status: res.status(), body };
};

async function shoot(page, name, label) {
  const file = path.join(OUT, name + '.png');
  await page.screenshot({ path: file, fullPage: false });
  shots.push({ file, label });
  console.log(`  ✓ ${label.padEnd(42)} ${path.basename(file)}`);
}

/* ------------------------------------------------------------------ */

/* Cùng đường dẫn mà audit.mjs và screenshot.mjs dùng: bản Chromium cài sẵn
   trong ảnh máy, không phải bản headless-shell mà Playwright tự tìm. */
const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });


/**
 * Dựng (hoặc tìm lại) một đề VPET đủ mười part và phát hành nó.
 *
 * Đi qua đúng API mà màn Quản trị → Tạo đề dùng, chứ không ghi thẳng vào CSDL:
 * nếu bộ sinh đề không rút nổi mười part thì lệnh chụp phải hỏng ở đây, chứ
 * không phải chụp một phòng thi dựng bằng đường vòng mà thí sinh không bao giờ
 * đi tới được.
 */
async function duDeMuoiPart() {
  const actx = await browser.newContext();
  try {
    const lg = await actx.request.post(BASE + '/api/admin/login', {
      data: { username: ADMIN.id, password: ADMIN.pw }
    });
    if (!lg.ok()) throw new Error(`Không đăng nhập được quản trị: HTTP ${lg.status()}`);

    const token = (await actx.cookies()).find(c => c.name === 'prep_csrf');
    const call = async (method, url, data) => {
      const r = await actx.request.fetch(BASE + url, {
        method, data,
        headers: { 'x-csrf-token': token ? token.value : '', 'content-type': 'application/json' }
      });
      let body = null;
      try { body = await r.json(); } catch (e) { /* trống */ }
      return { status: r.status(), body };
    };

    const fmt = FORMATS.FORMATS.find(f => f.id === 'vpet-full');
    const blueprint = fmt.sections
      .filter(s => /^Part [A-J]\b/.test(s.name))
      .map(s => ({
        name: s.name, skill: s.skill, items: s.items,
        minutes: s.minutes, types: s.types || [],
        part: /^Part ([A-J])\b/.exec(s.name)[1]
      }));

    const gen = await call('POST', '/api/admin/tests/generate', {
      familyId: 'vpet', level: 'B2', blueprint,
      title: 'VPET đủ 10 part — ảnh nghiệm thu'
    });
    if (gen.status === 409) {
      const thieu = (gen.body.shortages || [])
        .map(x => `${x.part || x.skill}: cần ${x.need}, có ${x.have}`).join('; ');
      throw new Error('Ngân hàng chưa đủ để dựng đề mười part — ' + thieu);
    }
    if (gen.status !== 201 && gen.status !== 200) {
      throw new Error(`Dựng đề hỏng: HTTP ${gen.status} ${JSON.stringify(gen.body)}`);
    }

    const id = gen.body.id || (gen.body.test && gen.body.test.id);
    const pub = await call('POST', `/api/admin/tests/${id}/status`, { status: 'published' });
    if (pub.status !== 200) throw new Error(`Không phát hành được đề: HTTP ${pub.status}`);
    console.log(`  \x1b[2m(đã dựng và phát hành đề ${id})\x1b[0m`);
    return id;
  } finally {
    await actx.close();
  }
}

try {
  const ctx = await browser.newContext({ viewport: DESKTOP });
  await login(ctx);

  /* Một lượt dở dang từ lần chạy trước sẽ chặn việc mở lượt mới. Nộp nó đi
     chứ không xoá: engine coi "đang làm dở" là trạng thái có thật của tài
     khoản, và xoá thẳng trong CSDL sẽ giấu mất một lỗi nếu có. */
  const cur = await api(ctx, 'GET', '/api/attempts/current');
  if (cur.body && cur.body.attempt) {
    await api(ctx, 'POST', `/api/attempts/${cur.body.attempt.id}/submit`);
    console.log(`  ${'\x1b[2m'}(đã nộp một lượt còn dở từ lần trước)${'\x1b[0m'}`);
  }

  /* Đề để chụp phải đủ mười part. Đề seed sẵn vẫn là dạng bốn kỹ năng cũ
     (part = NULL), nên dựng mới từ đúng blueprint vpet-full — cũng là việc một
     quản trị viên sẽ làm, và chụp đúng thứ họ sẽ thấy. */
  const testId = await duDeMuoiPart();
  const made = await api(ctx, 'POST', '/api/attempts', { testId });
  const vpet = { id: testId, title: 'VPET đủ 10 part' };
  if (made.status !== 201 && made.status !== 200) {
    throw new Error(`Không mở được lượt thi: HTTP ${made.status} ${JSON.stringify(made.body)}`);
  }
  const attempt = made.body.attempt || made.body;
  const attemptId = attempt.id;
  console.log(`\n\x1b[1mPhòng thi\x1b[0m  \x1b[2m${vpet.title || vpet.id} · lượt #${attemptId}\x1b[0m\n`);

  const detail = await api(ctx, 'GET', `/api/attempts/${attemptId}`);
  const state = (detail.body && detail.body.attempt) || attempt;
  const parts = (state.parts || [])
    .filter(p => !CHI || (p.part || '').toUpperCase() === CHI);

  if (!parts.length) throw new Error(CHI ? `Đề này không có part ${CHI}.` : 'Lượt thi không có part nào.');

  for (const viewport of [DESKTOP, MOBILE]) {
    const kind = viewport === DESKTOP ? 'desktop' : 'mobile';
    const page = await ctx.newPage();
    await page.setViewportSize(viewport);

    page.on('console', m => {
      if (m.type() === 'error') loi.push(`[${kind}] ${m.text()}`);
    });
    page.on('pageerror', e => loi.push(`[${kind}] ${e.message}`));

    await page.goto(BASE + '/prep/lam-bai/', { waitUntil: 'networkidle' });
    await page.waitForTimeout(700);
    await shoot(page, `00-mo-bai-${kind}`, `Màn mở bài (${kind})`);

    for (const p of parts) {
      const letter = (p.part || '?').toUpperCase();
      const sid = p.sectionId || p.section_id || p.id;

      /* Phải BẤM đúng tab, không chỉ gọi API. Gọi `start` mở đồng hồ của part
         ở phía server, nhưng phần đang hiện trên màn là trạng thái client và
         nó vẫn nằm ở part đầu tiên — lần chụp trước ra mười ảnh Part A mang
         tên mười part khác nhau, đúng loại lỗi mà ảnh nghiệm thu sinh ra để
         bắt và suýt thì tự nó mắc phải. */
      await api(ctx, 'POST', `/api/attempts/${attemptId}/parts/${sid}/start`);
      await page.click(`[data-sec="${sid}"]`);
      await page.waitForFunction(
        sel => document.querySelector(sel)?.getAttribute('aria-pressed') === 'true',
        `[data-sec="${sid}"]`, { timeout: 5000 });
      await page.waitForTimeout(400);

      /* Bấm "Start this part" nếu part còn ở màn chờ. Ảnh cần cho thấy câu hỏi
         thật — màn chờ thì mười part trông giống hệt nhau và không nói được gì
         về phần thi. */
      const startBtn = page.locator('#ex-part button:has-text("Start")');
      if (await startBtn.count()) {
        await startBtn.first().click();
        await page.waitForTimeout(700);
      }

      /* Kiểm lại bằng chính chữ trên màn: nếu tiêu đề không phải part này thì
         dừng, chứ không ghi ra một ảnh mang tên sai. */
      const heading = (await page.textContent('#ex-part h2, #ex-part h3') || '').trim();
      if (letter !== '?' && !heading.includes('Part ' + letter)) {
        throw new Error(`Bấm Part ${letter} nhưng màn hình đang hiện "${heading.slice(0, 40)}"`);
      }

      await shoot(page, `${letter.toLowerCase()}-part-${letter}-${kind}`,
        `Part ${letter} · ${(p.name || '').replace(/^Part [A-J]\s*-\s*/, '').slice(0, 26)} (${kind})`);
    }

    await page.close();
  }

  if (!GIU) {
    await api(ctx, 'POST', `/api/attempts/${attemptId}/submit`);
    const page = await ctx.newPage();
    await page.setViewportSize(DESKTOP);
    await page.goto(BASE + `/prep/ket-qua/${attemptId}/`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(900);
    await shoot(page, 'zz-ket-qua-desktop', 'Màn kết quả (desktop)');
    await page.close();
  }

  await ctx.close();
} finally {
  await browser.close();
}

console.log('\n' + '─'.repeat(70));
console.log(`  ${shots.length} ảnh trong ${path.relative(process.cwd(), OUT)}/`);
if (loi.length) {
  console.log(`  \x1b[31m${loi.length} lỗi console/CSP:\x1b[0m`);
  [...new Set(loi)].slice(0, 10).forEach(l => console.log('    · ' + l));
} else {
  console.log('  \x1b[32m0 lỗi console/CSP\x1b[0m');
}
console.log('─'.repeat(70) + '\n');

process.exit(loi.length ? 1 : 0);
