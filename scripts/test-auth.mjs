/**
 * Kiểm thử luồng đăng nhập tài khoản demo (client-side mock).
 * Chạy: node scripts/test-auth.mjs   (cần server đang chạy)
 */
import { chromium } from 'playwright-core';

const BASE = process.env.BASE_URL || 'http://localhost:3000';
const results = [];
const check = (name, ok, extra) => { results.push({ name, ok, extra }); };

const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 }, locale: 'vi-VN' });
const page = await ctx.newPage();
const errors = [];
page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
page.on('pageerror', e => errors.push('PAGEERROR ' + e.message));

const login = async (id, pw) => {
  await page.goto(BASE + '/prep/dang-nhap/', { waitUntil: 'networkidle' });
  await page.fill('#email', id);
  await page.fill('#password', pw);
  await page.click('#submit');
  await page.waitForTimeout(1400);
};

/* 1. Sai mật khẩu → banner lỗi, vẫn ở trang đăng nhập */
await login('student', 'sai-mat-khau');
check('Sai mật khẩu bị chặn', page.url().includes('/dang-nhap/'), page.url());
check('Hiện banner lỗi', await page.locator('#form-banner.show').isVisible());

/* 2. Sai tên đăng nhập → cùng thông báo chung (không lộ tài khoản nào tồn tại) */
const msgWrongUser = await (async () => {
  await login('khongtontai', 'Goodmorning01');
  return (await page.locator('#form-banner-text').textContent()).trim();
})();
await login('student', 'sai-mat-khau');
const msgWrongPass = (await page.locator('#form-banner-text').textContent()).trim();
check('Thông báo lỗi không tiết lộ tài khoản tồn tại', msgWrongUser === msgWrongPass, msgWrongUser);

/* 3. Đúng thông tin → vào dashboard đúng danh tính */
await login('student', 'Goodmorning01');
check('Đăng nhập thành công vào dashboard', page.url().endsWith('/prep/'), page.url());
const name = (await page.locator('#greet-name').textContent()).trim();
check('Hiện đúng tên học viên', name === 'Học viên Demo', name);
await page.waitForTimeout(900);
const unlocked = await page.locator('#mytests-grid article').count();
check('Có 1 bài đã mở khoá sẵn', unlocked === 1, 'đếm được ' + unlocked);

/* 4. Đăng nhập bằng email của cùng tài khoản */
await page.evaluate(() => localStorage.removeItem('prep.session.v1'));
await login('student@vpetprep.vn', 'Goodmorning01');
check('Đăng nhập được bằng email', page.url().endsWith('/prep/'), page.url());

/* 5. Tiến độ theo tài khoản: kích hoạt code rồi đăng xuất, đăng nhập lại vẫn còn */
await page.goto(BASE + '/prep/nhap-code/', { waitUntil: 'networkidle' });
await page.fill('#code', 'IELT-AC12-96HD');
await page.click('#submit');
await page.waitForTimeout(1300);
check('Kích hoạt code thành công', await page.locator('#success-box').isVisible());

await page.evaluate(() => localStorage.removeItem('prep.session.v1'));
await login('student', 'Goodmorning01');
await page.waitForTimeout(900);
const afterRelogin = await page.locator('#mytests-grid article').count();
check('Bài mở khoá còn sau khi đăng nhập lại', afterRelogin === 3, 'đếm được ' + afterRelogin);

/* 6. Đổi mật khẩu: sai mật khẩu hiện tại bị chặn, đúng thì mật khẩu mới có hiệu lực */
await page.goto(BASE + '/prep/tai-khoan/', { waitUntil: 'networkidle' });
await page.click('#tab-security');
await page.fill('#cur-pass', 'sai-roi');
await page.fill('#new-pass', 'Newpassword01');
await page.fill('#re-pass', 'Newpassword01');
await page.click('#pass-save');
await page.waitForTimeout(1000);
check('Đổi mật khẩu: chặn khi mật khẩu hiện tại sai', await page.locator('#pass-err.show').isVisible());

await page.fill('#cur-pass', 'Goodmorning01');
await page.fill('#new-pass', 'Newpassword01');
await page.fill('#re-pass', 'Newpassword01');
await page.click('#pass-save');
await page.waitForTimeout(1000);
check('Đổi mật khẩu thành công', await page.locator('#pass-ok.show').isVisible());

await page.evaluate(() => localStorage.removeItem('prep.session.v1'));
await login('student', 'Goodmorning01');
check('Mật khẩu cũ hết hiệu lực', page.url().includes('/dang-nhap/'), page.url());
await login('student', 'Newpassword01');
check('Mật khẩu mới đăng nhập được', page.url().endsWith('/prep/'), page.url());

/* 7. Nút điền sẵn tài khoản demo */
await page.evaluate(() => localStorage.clear());
await page.goto(BASE + '/prep/dang-nhap/', { waitUntil: 'networkidle' });
await page.click('#fill-demo');
check('Nút điền sẵn hoạt động',
  (await page.inputValue('#email')) === 'student' && (await page.inputValue('#password')) === 'Goodmorning01');
await page.click('#submit');
await page.waitForTimeout(1400);
check('Đăng nhập sau khi xoá localStorage (tài khoản seed)', page.url().endsWith('/prep/'), page.url());

await browser.close();

check('Không có lỗi console / CSP', errors.length === 0, errors[0] || '');
let failed = 0;
for (const r of results) {
  console.log((r.ok ? '✓ ' : '✗ ') + r.name + (r.ok || !r.extra ? '' : '  → ' + r.extra));
  if (!r.ok) failed++;
}
console.log(failed ? `\n${failed}/${results.length} kiểm thử THẤT BẠI` : `\n${results.length}/${results.length} kiểm thử đạt`);
process.exitCode = failed ? 1 : 0;
