/**
 * Kiểm thử luồng tài khoản học viên TRÊN GIAO DIỆN (đã nối API thật).
 * Chạy: node scripts/test-auth.mjs   (cần server đang chạy)
 *
 * Quy tắc: KHÔNG đổi mật khẩu tài khoản demo `student` — ảnh nghiệm thu và
 * các bộ test khác đều đăng nhập bằng nó. Mọi phép thử đổi/đặt lại mật khẩu
 * chạy trên tài khoản dùng một lần, đăng ký ngay trong bài test.
 */
import { chromium } from 'playwright-core';

const BASE = process.env.BASE_URL || 'http://localhost:3000';
const results = [];
const check = (name, ok, extra) => { results.push({ name, ok, extra }); };

const stamp = String(process.hrtime.bigint()).slice(-9);
const TMP_EMAIL = `giaodien.${stamp}@thu-nghiem.vn`;
const TMP_PASS = 'Matkhau123';

const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 }, locale: 'vi-VN' });
const page = await ctx.newPage();
/* Bài test cố tình đăng nhập sai vài lần; 401/403/429 từ chính các endpoint auth là
   kết quả mong đợi, không phải lỗi trang. Chỉ bắt lỗi JS và vi phạm CSP. */
const EXPECTED = /Failed to load resource.*\b(401|403|429)\b/i;
const errors = [];
page.on('console', m => { if (m.type() === 'error' && !EXPECTED.test(m.text())) errors.push(m.text()); });
page.on('pageerror', e => errors.push('PAGEERROR ' + e.message));

const login = async (id, pw) => {
  await page.goto(BASE + '/prep/dang-nhap/', { waitUntil: 'networkidle' });
  await page.fill('#email', id);
  await page.fill('#password', pw);
  await page.click('#submit');
  await page.waitForTimeout(1200);
};
/* Đăng xuất bằng cách xoá cookie phiên — nhanh và chắc hơn bấm nút */
const logout = () => ctx.clearCookies();

/* ---------- 1. Đăng nhập sai ---------- */
await login('student', 'sai-mat-khau');
check('Sai mật khẩu bị chặn', page.url().includes('/dang-nhap/'), page.url());
check('Hiện banner lỗi', await page.locator('#form-banner.show').isVisible());

const msgWrongPass = (await page.locator('#form-banner-text').textContent()).trim();
await login('khongtontai', 'Goodmorning01');
const msgWrongUser = (await page.locator('#form-banner-text').textContent()).trim();
check('Thông báo lỗi không tiết lộ tài khoản tồn tại', msgWrongUser === msgWrongPass, msgWrongUser);

/* ---------- 2. Guard phía server ---------- */
await logout();
const guarded = await page.goto(BASE + '/prep/thu-vien/', { waitUntil: 'networkidle' });
check('Trang cần đăng nhập bị đá về màn đăng nhập', page.url().includes('/prep/dang-nhap/'), page.url());
check('Giữ lại đích đến trong tham số next', page.url().includes('next='), page.url());
check('Không trả 200 cho trang bị chặn', guarded.status() === 200 && page.url().includes('dang-nhap'), String(guarded.status()));

/* ---------- 3. Đăng nhập đúng ---------- */
await login('student', 'Goodmorning01');
check('Đăng nhập thành công vào dashboard', page.url().endsWith('/prep/'), page.url());
const name = (await page.locator('#greet-name').textContent()).trim();
check('Hiện đúng tên học viên', name === 'Học viên Demo', name);
await page.waitForTimeout(700);
const unlocked = await page.locator('#mytests-grid article').count();
check('Có 1 bài đã mở khoá sẵn (từ code trong CSDL)', unlocked === 1, 'đếm được ' + unlocked);

/* Đã đăng nhập thì màn đăng nhập chuyển thẳng vào trong */
await page.goto(BASE + '/prep/dang-nhap/', { waitUntil: 'networkidle' });
check('Đã đăng nhập thì không xem màn đăng nhập nữa', page.url().endsWith('/prep/'), page.url());

/* ---------- 4. Đăng nhập bằng email ---------- */
await logout();
await login('student@vpetprep.vn', 'Goodmorning01');
check('Đăng nhập được bằng email', page.url().endsWith('/prep/'), page.url());

/* ---------- 5. Kích hoạt code còn hiệu lực qua đăng nhập lại ---------- */
await page.goto(BASE + '/prep/nhap-code/', { waitUntil: 'networkidle' });
await page.fill('#code', 'IELT-AC12-96HD');
await page.click('#submit');
await page.waitForTimeout(1300);
check('Kích hoạt code thành công', await page.locator('#success-box').isVisible());

await logout();
await login('student', 'Goodmorning01');
await page.waitForTimeout(700);
const afterRelogin = await page.locator('#mytests-grid article').count();
check('Bài mở khoá còn sau khi đăng nhập lại', afterRelogin === 3, 'đếm được ' + afterRelogin);

/* ---------- 6. Đăng xuất bằng nút trên màn Tài khoản ---------- */
await page.goto(BASE + '/prep/tai-khoan/', { waitUntil: 'networkidle' });
await page.click('#logout-btn');
await page.waitForURL('**/prep/landing/', { timeout: 8000 }).catch(() => {});
check('Nút đăng xuất đưa về trang giới thiệu', page.url().includes('/prep/landing/'), page.url());
await page.goto(BASE + '/prep/', { waitUntil: 'networkidle' });
check('Sau đăng xuất không vào được khu học viên', page.url().includes('/dang-nhap/'), page.url());

/* ---------- 7. Đăng ký tài khoản mới qua giao diện ---------- */
await page.goto(BASE + '/prep/dang-ky/', { waitUntil: 'networkidle' });
await page.fill('#name', 'Người Thử Giao Diện');
await page.fill('#email', TMP_EMAIL);
await page.fill('#password', 'yeu');
await page.check('#terms');
await page.click('#submit');
await page.waitForTimeout(400);
check('Chặn mật khẩu không đạt yêu cầu ngay ở client', await page.locator('#err-password.show').isVisible());

await page.fill('#password', TMP_PASS);
await page.click('#submit');
await page.waitForURL('**/prep/xac-thuc-email/**', { timeout: 8000 }).catch(() => {});
check('Đăng ký xong sang màn xác thực email', page.url().includes('/xac-thuc-email/'), page.url());
await page.waitForTimeout(600);
check('Bản chạy thử hiện liên kết xác thực', await page.locator('#dev-link').isVisible());

/* Bấm liên kết xác thực → trạng thái đã xác thực */
await page.click('#dev-link-a');
await page.waitForTimeout(1200);
check('Xác thực email thành công', await page.locator('#verify-result').isVisible());

/* ---------- 8. Đổi mật khẩu trên tài khoản dùng một lần ---------- */
await page.goto(BASE + '/prep/tai-khoan/', { waitUntil: 'networkidle' });
await page.waitForTimeout(500);
await page.click('#tab-security');
await page.fill('#cur-pass', 'sai-roi');
await page.fill('#new-pass', 'Matkhaumoi456');
await page.fill('#re-pass', 'Matkhaumoi456');
await page.click('#pass-save');
await page.waitForTimeout(900);
check('Đổi mật khẩu: chặn khi mật khẩu hiện tại sai', await page.locator('#pass-err.show').isVisible());

await page.fill('#cur-pass', TMP_PASS);
await page.fill('#new-pass', 'Matkhaumoi456');
await page.fill('#re-pass', 'Matkhaumoi456');
await page.click('#pass-save');
await page.waitForTimeout(1200);
check('Đổi mật khẩu thành công', await page.locator('#pass-ok.show').isVisible());

await logout();
await login(TMP_EMAIL, TMP_PASS);
check('Mật khẩu cũ hết hiệu lực', page.url().includes('/dang-nhap/'), page.url());
await login(TMP_EMAIL, 'Matkhaumoi456');
check('Mật khẩu mới đăng nhập được', page.url().endsWith('/prep/'), page.url());

/* ---------- 9. Quên và đặt lại mật khẩu ---------- */
await logout();
await page.goto(BASE + '/prep/quen-mat-khau/', { waitUntil: 'networkidle' });
await page.fill('#email', TMP_EMAIL);
await page.click('#submit');
await page.waitForTimeout(1200);
check('Gửi yêu cầu đặt lại thành công', await page.locator('#step-done').isVisible());
check('Bản chạy thử hiện liên kết đặt lại', await page.locator('#dev-link').isVisible());

await page.click('#dev-link-a');
await page.waitForURL('**/prep/dat-lai-mat-khau/**', { timeout: 8000 }).catch(() => {});
check('Mở được màn đặt lại mật khẩu', page.url().includes('/dat-lai-mat-khau/'), page.url());
await page.fill('#password', 'Datlai789');
await page.fill('#repass', 'Datlai78x');
await page.click('#submit');
await page.waitForTimeout(400);
check('Chặn khi hai mật khẩu chưa khớp', await page.locator('#err-repass.show').isVisible());

await page.fill('#repass', 'Datlai789');
await page.click('#submit');
await page.waitForTimeout(1200);
check('Đặt lại mật khẩu thành công', await page.locator('#step-done').isVisible());

await login(TMP_EMAIL, 'Datlai789');
check('Đăng nhập bằng mật khẩu vừa đặt lại', page.url().endsWith('/prep/'), page.url());

/* Thiếu token thì báo liên kết không hợp lệ, không hiện form */
await page.goto(BASE + '/prep/dat-lai-mat-khau/', { waitUntil: 'networkidle' });
check('Liên kết đặt lại thiếu mã thì báo không hợp lệ', await page.locator('#step-invalid').isVisible());

/* ---------- 10. Nút điền sẵn tài khoản demo ---------- */
await logout();
await page.goto(BASE + '/prep/dang-nhap/', { waitUntil: 'networkidle' });
await page.click('#fill-demo');
check('Nút điền sẵn hoạt động',
  (await page.inputValue('#email')) === 'student' && (await page.inputValue('#password')) === 'Goodmorning01');
await page.click('#submit');
await page.waitForTimeout(1200);
check('Tài khoản demo vẫn đăng nhập được sau toàn bộ bài test', page.url().endsWith('/prep/'), page.url());

await browser.close();

check('Không có lỗi console / CSP', errors.length === 0, errors[0] || '');
let failed = 0;
for (const r of results) {
  console.log((r.ok ? '✓ ' : '✗ ') + r.name + (r.ok || !r.extra ? '' : '  → ' + r.extra));
  if (!r.ok) failed++;
}
console.log(failed ? `\n${failed}/${results.length} kiểm thử THẤT BẠI` : `\n${results.length}/${results.length} kiểm thử đạt`);
process.exitCode = failed ? 1 : 0;
