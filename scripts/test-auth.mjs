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

/* Chờ theo KẾT CỤC, không chờ theo đồng hồ.
   Bài test này từng đỏ oan hai lần trong ngày 2026-08-12 với đúng đoạn mã vừa
   xanh vài phút trước. Nguyên nhân luôn là một câu waitForTimeout đoán trước:
   máy tải nặng thì request chưa về, bài test đọc trạng thái cũ rồi đi tiếp, và
   vỡ ở một chỗ cách đó vài dòng, chẳng liên quan gì. Lần đổi mật khẩu là ví dụ
   rõ nhất — chờ 1200 ms không đủ, mật khẩu CŨ vẫn đăng nhập được, trang nhảy
   vào trong, rồi lượt vào màn đăng nhập kế tiếp bị guard đá ra và Playwright
   ngồi đợi hết 30 giây một ô #email không bao giờ tồn tại.

   Nguyên tắc thay thế: chờ tới khi thao tác NGÃ NGŨ — xong hoặc lỗi — rồi mới
   khẳng định nó ngã về bên nào. Chờ đúng cái mình sắp khẳng định thì phép kiểm
   thành vô nghĩa; chờ "đã ngã ngũ" thì vẫn còn nguyên ý nghĩa mà hết chỗ đua. */
const OUTCOME_MS = 15000;

/** Chờ một trong các mốc kết cục hiện ra. Quá hạn thì trả null để phép kiểm
    ngay sau đó báo đúng cái sai, thay vì ném TimeoutError ở giữa bài. */
const settle = (...selectors) => page
  .waitForSelector(selectors.join(', '), { timeout: OUTCOME_MS, state: 'visible' })
  .catch(() => null);

/** Chờ đúng request mà một thao tác gây ra (bỏ qua GET, vì trang nào cũng có). */
const posted = urlPart => page
  .waitForResponse(r => r.url().includes(urlPart) && r.request().method() !== 'GET',
    { timeout: OUTCOME_MS })
  .catch(() => null);

/** Chờ rời khỏi một đường dẫn — dùng cho thao tác kết thúc bằng điều hướng. */
const leaves = part => page
  .waitForURL(u => !String(u).includes(part), { timeout: OUTCOME_MS })
  .catch(() => null);

const login = async (id, pw) => {
  await page.goto(BASE + '/prep/dang-nhap/', { waitUntil: 'networkidle' });
  await page.fill('#email', id);
  await page.fill('#password', pw);
  const call = posted('/api/auth/login');
  await page.click('#submit');
  await call;
  /* Đúng thì trang tự chuyển đi, sai thì hiện banner. Chờ tới khi một trong hai
     xảy ra rồi mới trả về, nên người gọi luôn đọc được trạng thái đã xong. */
  await Promise.race([leaves('/dang-nhap/'), settle('#form-banner.show')]);
};
/* Đăng xuất bằng cách xoá cookie phiên — nhanh và chắc hơn bấm nút */
const logout = () => ctx.clearCookies();

/* ---------- 1. Đăng nhập sai ---------- */
await login('student', 'sai-mat-khau');
check('Sai mật khẩu bị chặn', page.url().includes('/dang-nhap/'), page.url());
check('Hiện banner lỗi', await page.locator('#form-banner.show').isVisible());

/* Tên không tồn tại phải KHÁC NHAU mỗi lượt chạy. Khoá chống dò mật khẩu đếm
   theo cặp IP × tên đăng nhập: dùng mãi một tên thì sau năm lượt chạy nó bị
   khoá, thông báo đổi thành "khoá 15 phút", và phép so bên dưới báo đỏ vì
   chính bài test đã tự làm hỏng điều kiện của mình. Tài khoản `student` không
   dính vì mỗi lượt nó đăng nhập đúng một lần, và đăng nhập đúng thì xoá bộ đếm. */
const msgWrongPass = (await page.locator('#form-banner-text').textContent()).trim();
await login('khongaico' + stamp, 'Goodmorning01');
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
/* Chờ dashboard vẽ xong TRƯỚC khi đọc bất cứ thứ gì trên nó. Lưới bài để hidden
   cho tới khi có thẻ, không có bài nào thì hiện #mytests-empty, nên một trong
   hai lộ ra nghĩa là dữ liệu đã về và trang đã dựng.
   Riêng ô tên phải chờ vì trong HTML nó có sẵn chữ "Student" làm chỗ giữ chỗ,
   và tên thật chỉ ghi đè sau khi /api/me trả lời. Đọc sớm thì đọc trúng chỗ
   giữ chỗ — phép kiểm đỏ vì bài test nhanh tay, không vì sản phẩm sai. */
await settle('#mytests-grid', '#mytests-empty');
const name = (await page.locator('#greet-name').textContent()).trim();
check('Hiện đúng tên học viên', name === 'Demo Student', name);
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
const redeemed = posted('/api/redeem');
await page.click('#submit');
await redeemed;
await settle('#success-box', '#code-err.show');
check('Kích hoạt code: màn hình đi tới trạng thái thành công',
  await page.locator('#success-box').isVisible());
/* CSDL không được dựng lại giữa các lần chạy, nên lần chạy đầu là "vừa mở
   khoá" còn những lần sau là "mã này bạn đã kích hoạt rồi". Cả hai đều đúng và
   đều phải dẫn tới màn thành công — cái sai duy nhất là báo nhầm giữa hai
   trạng thái, nên kiểm chính chữ hiện ra chứ không chỉ kiểm hộp có hiện. */
const okTitle = (await page.locator('#ok-title').textContent()).trim();
check('Nói đúng việc vừa xảy ra: mở khoá mới, hoặc mã đã có hiệu lực từ trước',
  okTitle === 'Unlocked.' || okTitle === 'This code is already active', okTitle);
check('Không hiện lỗi khi kích hoạt thành công',
  !(await page.locator('#code-err').evaluate(el => el.classList.contains('show'))));

await logout();
await login('student', 'Goodmorning01');
await settle('#mytests-grid', '#mytests-empty');
const afterRelogin = await page.locator('#mytests-grid article').count();
/* Code này mở khoá cả kỳ IELTS, mà IELTS đang ở trạng thái chưa sẵn sàng nên
   không có đề nào đã phát hành. Quyền vẫn được ghi nhận — người đã mua không
   bị mất — nhưng chưa có bài nào hiện ra. Ngày mở IELTS thì chúng xuất hiện. */
check('Kích hoạt code kỳ thi đang park: quyền được giữ nhưng chưa có bài nào hiện ra',
  afterRelogin === 1, 'đếm được ' + afterRelogin);
const codeStillThere = await page.evaluate(() =>
  (PrepState.load().myCodes || []).some(c => String(c.code).startsWith('IELT-')));
check('Code đã kích hoạt vẫn nằm trong tài khoản, không bị mất', codeStillThere === true);

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
const leaked = posted('/api/auth/register');
await page.click('#submit');
await Promise.race([settle('#err-password.show'), leaked]);
check('Chặn mật khẩu không đạt yêu cầu ngay ở client', await page.locator('#err-password.show').isVisible());

await page.fill('#password', TMP_PASS);
await page.click('#submit');
await page.waitForURL('**/prep/xac-thuc-email/**', { timeout: 8000 }).catch(() => {});
check('Đăng ký xong sang màn xác thực email', page.url().includes('/xac-thuc-email/'), page.url());
await settle('#dev-link');
check('Bản chạy thử hiện liên kết xác thực', await page.locator('#dev-link').isVisible());

/* Bấm liên kết xác thực → trạng thái đã xác thực */
await page.click('#dev-link-a');
await settle('#verify-result');
check('Xác thực email thành công', await page.locator('#verify-result').isVisible());

/* ---------- 7b. Phân quyền: tài khoản chưa có gói nào ----------
   Tài khoản vừa đăng ký chưa nhập code nào nên không có quyền gì. Đây là chỗ
   duy nhất trong bộ test có một tài khoản "trắng", nên cũng là chỗ duy nhất
   kiểm được phần bị khoá. Kiểm cả hai lớp: máy chủ có chặn thật không, và
   giao diện có làm mờ đúng chỗ không. */
await page.goto(BASE + '/prep/hoc/tu-noi/', { waitUntil: 'networkidle' });
check('Chưa có gói thì khu tự học bị máy chủ chặn, đá sang bảng giá',
  page.url().includes('/prep/mua-code/') && page.url().includes('locked=self-study'), page.url());
await settle('#locked-note', '#pkg-grid article');
check('Bảng giá nói rõ vì sao vừa bị đá sang đây',
  await page.locator('#locked-note').isVisible());
check('Bảng giá liệt kê đủ ba gói',
  await page.locator('#pkg-grid article').count() === 3,
  'đếm được ' + (await page.locator('#pkg-grid article').count()));
check('Mục Tự học trên thanh điều hướng bị làm mờ, không dẫn thẳng vào khu tự học',
  await page.locator('.nav-item.is-locked[href*="locked=self-study"]').count() === 1);

/* Tài khoản demo có gói Plus nên KHÔNG được khoá — nếu làm mờ cả người đã trả
   tiền thì lỗi này im lặng và rất khó thấy. */
await logout();
await login('student', 'Goodmorning01');
await page.goto(BASE + '/prep/hoc/tu-noi/', { waitUntil: 'networkidle' });
check('Có gói Plus thì vào thẳng khu tự học', page.url().includes('/prep/hoc/tu-noi/'), page.url());
await settle('.nav-item');
check('Có quyền thì không mục nào bị làm mờ',
  await page.locator('.nav-item.is-locked').count() === 0);
await logout();
await login(TMP_EMAIL, TMP_PASS);

/* ---------- 8. Đổi mật khẩu trên tài khoản dùng một lần ---------- */
await page.goto(BASE + '/prep/tai-khoan/', { waitUntil: 'networkidle' });
await page.click('#tab-security');
await page.fill('#cur-pass', 'sai-roi');
await page.fill('#new-pass', 'Matkhaumoi456');
await page.fill('#re-pass', 'Matkhaumoi456');
let passCall = posted('/api/me/password');
await page.click('#pass-save');
await passCall;
await settle('#pass-err.show', '#pass-ok.show');
check('Đổi mật khẩu: chặn khi mật khẩu hiện tại sai', await page.locator('#pass-err.show').isVisible());

await page.fill('#cur-pass', TMP_PASS);
await page.fill('#new-pass', 'Matkhaumoi456');
await page.fill('#re-pass', 'Matkhaumoi456');
/* Chờ chính lời đáp của máy chủ. Đây là chỗ đã gây ra cả hai lần đỏ oan: đi
   tiếp trước khi mật khẩu đổi xong thì mật khẩu cũ ngay dưới đây vẫn đăng nhập
   được, và bài test vỡ ở một chỗ khác hẳn. */
passCall = posted('/api/me/password');
await page.click('#pass-save');
await passCall;
await settle('#pass-ok.show', '#pass-err.show');
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
const forgot = posted('/api/auth/forgot');
await page.click('#submit');
await forgot;
await settle('#step-done', '#form-banner.show');
check('Gửi yêu cầu đặt lại thành công', await page.locator('#step-done').isVisible());
/* #dev-link hiện sau #step-done một nhịp, nên phải chờ riêng nó. Chờ kết cục
   của thao tác rồi tưởng mọi thứ trên trang đã xong là cách bỏ chờ cứng mà vẫn
   giữ nguyên chỗ đua — đúng lỗi bản sửa đầu tiên của mục này mắc phải. */
await settle('#dev-link');
check('Bản chạy thử hiện liên kết đặt lại', await page.locator('#dev-link').isVisible());

await page.click('#dev-link-a');
await page.waitForURL('**/prep/dat-lai-mat-khau/**', { timeout: 8000 }).catch(() => {});
check('Mở được màn đặt lại mật khẩu', page.url().includes('/dat-lai-mat-khau/'), page.url());
await page.fill('#password', 'Datlai789');
await page.fill('#repass', 'Datlai78x');
const leakedReset = posted('/api/auth/reset');
await page.click('#submit');
await Promise.race([settle('#err-repass.show'), leakedReset]);
check('Chặn khi hai mật khẩu chưa khớp', await page.locator('#err-repass.show').isVisible());

await page.fill('#repass', 'Datlai789');
const reset = posted('/api/auth/reset');
await page.click('#submit');
await reset;
await settle('#step-done', '#form-banner.show');
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
const demoCall = posted('/api/auth/login');
await page.click('#submit');
await demoCall;
await Promise.race([leaves('/dang-nhap/'), settle('#form-banner.show')]);
check('Tài khoản demo vẫn đăng nhập được sau toàn bộ bài test', page.url().endsWith('/prep/'), page.url());

/* ---------------- PWA ----------------
   Ba câu hỏi: cài đặt được không, service worker có chạy không, và — quan
   trọng nhất — nó có cache nhầm thứ không được cache không. Bộ nhớ đệm trên
   máy dùng chung là chỗ đáp án đề thi rò ra. */
{
  const mres = await fetch(BASE + '/manifest.webmanifest');
  const mtype = mres.headers.get('content-type') || '';
  const man = await mres.json().catch(() => null);
  check('Manifest phục vụ đúng kiểu nội dung', mres.status === 200 && mtype.includes('manifest+json'), mtype);
  check('Manifest đủ trường để Chrome cho cài',
    !!man && man.name && man.start_url && man.display === 'standalone' &&
    (man.icons || []).some(i => /(^|\s)512x512(\s|$)/.test(i.sizes)) &&
    (man.icons || []).some(i => String(i.purpose).includes('maskable')),
    JSON.stringify(man && man.icons));

  const swres = await fetch(BASE + '/sw.js');
  check('Service worker phục vụ ở gốc với phạm vi toàn site',
    swres.status === 200 && swres.headers.get('service-worker-allowed') === '/',
    'status ' + swres.status);

  for (const icon of ['icon-192', 'icon-512', 'maskable-512']) {
    const r = await fetch(BASE + '/icons/' + icon + '.png');
    check('Icon ' + icon + ' tải được', r.status === 200 && (r.headers.get('content-type') || '').includes('image/png'));
  }

  const off = await fetch(BASE + '/prep/offline/');
  check('Trang offline mở được khi chưa đăng nhập', off.status === 200, 'status ' + off.status);

  /* Chạy trong ngữ cảnh riêng: đăng ký service worker rồi soi đúng những gì
     nó đã cache. */
  const swCtx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  const swPage = await swCtx.newPage();
  await swPage.goto(BASE + '/prep/landing/', { waitUntil: 'load' });
  const ready = await swPage.evaluate(() =>
    navigator.serviceWorker.ready.then(r => !!r.active).catch(() => false));
  check('Service worker đăng ký và hoạt động', ready === true, String(ready));

  await swPage.goto(BASE + '/prep/landing/', { waitUntil: 'load' });
  /* Chờ service worker nạp xong bộ nhớ đệm. Đây là bước chuẩn bị, không phải
     phép kiểm: hai phép kiểm đáng giá ngay dưới là "không cache /api" và
     "không cache trang HTML nào ngoài trang offline". */
  await swPage.waitForFunction(async () => (await caches.keys()).length > 0,
    null, { timeout: 15000 }).catch(() => {});
  const cached = await swPage.evaluate(async () => {
    const names = await caches.keys();
    const urls = [];
    for (const n of names) {
      const keys = await (await caches.open(n)).keys();
      keys.forEach(r => urls.push(r.url));
    }
    return urls;
  });
  check('Có cache vỏ ứng dụng để dùng offline', cached.length > 0, String(cached.length));
  check('Không cache bất cứ thứ gì dưới /api — đáp án đề thi không nằm trong bộ nhớ đệm',
    !cached.some(u => new URL(u).pathname.startsWith('/api/')),
    cached.filter(u => u.includes('/api/'))[0] || '');
  check('Không cache trang HTML nào ngoài trang offline',
    cached.every(u => {
      const p = new URL(u).pathname;
      return p === '/prep/offline/' || /\.[a-z0-9]+$/i.test(p);
    }),
    cached.filter(u => { const p = new URL(u).pathname; return p !== '/prep/offline/' && !/\.[a-z0-9]+$/i.test(p); })[0] || '');
  await swCtx.close();
}

await browser.close();

check('Không có lỗi console / CSP', errors.length === 0, errors[0] || '');
let failed = 0;
for (const r of results) {
  console.log((r.ok ? '✓ ' : '✗ ') + r.name + (r.ok || !r.extra ? '' : '  → ' + r.extra));
  if (!r.ok) failed++;
}
console.log(failed ? `\n${failed}/${results.length} kiểm thử THẤT BẠI` : `\n${results.length}/${results.length} kiểm thử đạt`);
process.exitCode = failed ? 1 : 0;
