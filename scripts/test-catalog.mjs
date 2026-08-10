/**
 * Kiểm thử lớp danh mục phía học viên: trang đọc thật GET /api/catalog,
 * và khi API hỏng thì rơi về dữ liệu dự phòng kèm dải cảnh báo (không trắng trang).
 *
 * Chạy khi server đã bật: node scripts/test-catalog.mjs
 */
import { chromium } from 'playwright-core';

const BASE = process.env.BASE || 'http://127.0.0.1:3000';
const EXEC = process.env.CHROMIUM || '/opt/pw-browsers/chromium';

let pass = 0, fail = 0;
const ok = (c, name) => { c ? (pass++, console.log('✓ ' + name)) : (fail++, console.log('✗ ' + name)); };

/** Đăng nhập tài khoản demo rồi trả về page đã vào được khu học viên */
async function login(ctx) {
  const page = await ctx.newPage();
  await page.goto(BASE + '/prep/dang-nhap/', { waitUntil: 'networkidle' });
  await page.fill('#email', 'student');
  await page.fill('#password', 'Goodmorning01');
  await page.click('#submit');
  await page.waitForURL(u => !u.pathname.includes('dang-nhap'), { timeout: 10000 });
  return page;
}

const browser = await chromium.launch({ executablePath: EXEC, args: ['--no-sandbox'] });

try {
  console.log('\n\x1b[1m== Danh mục học viên đọc từ /api/catalog ==\x1b[0m');

  /* --- 1. API trả gì thì trang hiện đúng thế --- */
  const api = await (await fetch(BASE + '/api/catalog')).json();
  const published = api.tests.length;
  ok(Array.isArray(api.families) && api.families.length === 6, 'API trả đủ 6 nhóm kỳ thi');
  ok(published > 0, 'API có ít nhất một đề đã phát hành (' + published + ')');

  const ctx = await browser.newContext();
  const errs = [];
  ctx.on('weberror', e => errs.push(String(e.error())));

  let page = await login(ctx);
  await page.goto(BASE + '/prep/thu-vien/', { waitUntil: 'networkidle' });
  await page.waitForTimeout(600);

  const cards = await page.locator('#lib-grid article').count();
  ok(cards === published, 'Thư viện hiện đúng ' + published + ' đề đã phát hành (thấy ' + cards + ')');
  ok(await page.locator('#lib-skeleton.hidden').count() === 1, 'Skeleton đã nhường chỗ cho nội dung');
  ok(await page.locator('#catalog-warning').count() === 0, 'Không có cảnh báo khi API chạy tốt');

  const src = await page.evaluate(() => PREP.catalogSource);
  ok(src === 'api', 'PREP.catalogSource = "api"');

  /* Đề chưa nhập câu hỏi: không được hiện "0 câu" */
  const zeroText = await page.locator('#lib-grid').innerText();
  ok(!/\b0 câu\b/.test(zeroText), 'Không hiện "0 câu" cho đề chưa nhập câu hỏi');

  /* Bài draft (pte-ac-01) không được lọt xuống học viên */
  const hasDraft = await page.evaluate(() => PREP.tests.some(t => t.id === 'pte-ac-01'));
  ok(!hasDraft, 'Đề trạng thái draft không xuất hiện trong danh mục học viên');

  /* --- 2. Trang chi tiết đọc đúng bài từ danh mục --- */
  const firstId = api.tests[0].id;
  await page.goto(BASE + '/prep/bai-thi/' + firstId + '/', { waitUntil: 'networkidle' });
  await page.waitForTimeout(500);
  ok(await page.locator('#page:not([hidden])').count() === 1, 'Trang chi tiết mở được bài ' + firstId);
  ok((await page.locator('#t-title').innerText()).trim() === api.tests[0].title, 'Tiêu đề khớp dữ liệu API');
  ok(await page.locator('#t-loading.hidden').count() === 1, 'Skeleton chi tiết đã tắt');

  /* Bài không tồn tại → trạng thái không tìm thấy, không phải trang trắng */
  await page.goto(BASE + '/prep/bai-thi/khong-co-that/', { waitUntil: 'networkidle' });
  await page.waitForTimeout(400);
  ok(await page.locator('#nf:not([hidden])').count() === 1, 'Bài không tồn tại hiện trạng thái "không tìm thấy"');

  ok(errs.length === 0, 'Không có lỗi console khi API chạy tốt');
  await ctx.close();

  /* --- 3. API hỏng: dữ liệu dự phòng + dải cảnh báo --- */
  console.log('\n\x1b[1m== API danh mục hỏng: rơi về dữ liệu dự phòng ==\x1b[0m');
  const ctx2 = await browser.newContext();
  const errs2 = [];
  ctx2.on('weberror', e => errs2.push(String(e.error())));

  page = await login(ctx2);
  await ctx2.route('**/api/catalog', r => r.abort());   // chặn sau khi đã đăng nhập
  await page.goto(BASE + '/prep/thu-vien/', { waitUntil: 'networkidle' });
  await page.waitForTimeout(700);

  ok(await page.locator('#catalog-warning').count() === 1, 'Hiện dải cảnh báo khi không gọi được API');
  ok(await page.locator('#lib-grid article').count() > 0, 'Vẫn render đề từ dữ liệu dự phòng');
  ok(await page.evaluate(() => PREP.catalogSource) === 'fallback', 'PREP.catalogSource = "fallback"');
  ok(errs2.length === 0, 'Lỗi mạng không làm vỡ trang (không có lỗi JS)');

  await ctx2.close();
} finally {
  await browser.close();
}

console.log('\n' + (pass + fail ? pass + '/' + (pass + fail) + ' kiểm thử đạt' : 'không có kiểm thử nào'));
if (fail) process.exit(1);
