/**
 * VPET Prep — server.
 *
 * Hai khu vực:
 * 1. Trang học viên (/prep/…): HTML tĩnh; danh mục đọc từ /api/catalog, tài khoản
 *    có API thật ở /api/auth/… và /api/me (giao diện đang nối dần).
 * 2. Khu quản trị (/admin/… + /api/admin/…): backend thật trên SQLite, có đăng nhập,
 *    phiên, CSRF, chống dò mật khẩu và nhật ký thao tác.
 *
 * - HTML luôn đi qua serveHtmlWithNonce(): chèn nonce vào <script>/<style> và đặt CSP
 *   nghiêm ngặt cho từng response (không CDN, không eval, không inline lậu).
 * - Routing non-strict: '/prep/x/' cũng khớp '/prep/x' → guard exact-path redirect
 *   MỘT lần sang bản có dấu '/' (bản có '/' không vào nhánh redirect nên không lặp vòng).
 *
 * 3. Khu tự học (/prep/hoc/…): tra cứu và luyện từ vựng, ngữ pháp, phát âm bằng TTS.
 */
const express = require('express');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');

const api = require('./server/api');
const userApi = require('./server/user-api');
const examApi = require('./server/exam-api');
const googleAuth = require('./server/google-auth');
const A = require('./server/auth');
const security = require('./server/security');
const { entitlementOf } = require('./server/entitlements');

const app = express();
app.disable('x-powered-by');
/* Never `true` here — see the note on resolveTrustProxy in server/security.js.
   req.ip is what the sign-in lockout and the write limit are keyed on, so
   trusting any X-Forwarded-For turns both of them off. */
app.set('trust proxy', security.TRUST_PROXY);

/* Security first, before anything can answer. Both of these are deliberately
   global: a header set per handler is a header the next handler forgets, and a
   rate limit attached per route is a rate limit the next route does without.
   See server/security.js and docs/SECURITY.md. */
app.use(security.baseHeaders);
app.use(security.writeLimit);

const PUB = path.join(__dirname, 'public');
const PORT = process.env.PORT || 3000;

function cspFor(nonce) {
  return [
    "default-src 'self'",
    "base-uri 'self'",
    "object-src 'none'",
    "frame-ancestors 'self'",
    `script-src 'self' 'nonce-${nonce}'`,
    // Font self-host trong public/fonts → không cần ngoại lệ Google Fonts
    `style-src 'self' 'nonce-${nonce}'`,
    "font-src 'self'",
    "img-src 'self' data:",
    "connect-src 'self'",
    "form-action 'self'",
  ].join('; ');
}

/** Phục vụ 1 file HTML với nonce mới cho mỗi request. */
function serveHtmlWithNonce(relFile) {
  const absFile = path.join(PUB, relFile);
  return (req, res) => {
    // Guard exact-path: bản không dấu '/' (vd /prep/thu-vien) redirect 1 lần
    // sang bản chuẩn có '/' — tránh vòng lặp tự-redirect của non-strict routing.
    if (!req.path.endsWith('/')) {
      const qs = req.originalUrl.slice(req.path.length);
      return res.redirect(301, req.path + '/' + qs);
    }
    fs.readFile(absFile, 'utf8', (err, html) => {
      if (err) return res.status(500).send('Internal error');
      const nonce = crypto.randomBytes(16).toString('base64');
      const out = html
        .replace(/<script\b/g, `<script nonce="${nonce}"`)
        .replace(/<style\b/g, `<style nonce="${nonce}"`);
      /* Anyone holding a page can submit a form from it, so anyone holding a
         page needs a CSRF token — signed in or not. Minted here rather than at
         sign-in, which is what lets csrfGuard cover the sign-in itself. */
      A.ensureCsrfCookie(req, res);
      /* The document CSP carries this request's nonce, so it is set here rather
         than in the global middleware. Everything else a response needs —
         nosniff, referrer policy, permissions policy, framing — is already on
         by then; see server/security.js. */
      res.setHeader('Content-Security-Policy', cspFor(nonce));
      res.setHeader('Cache-Control', 'no-store');
      res.type('html').send(out);
    });
  };
}

/* ---------------- API (đăng ký trước static) ---------------- */
app.use(googleAuth.router);      // đăng nhập Google: /auth/google, /auth/google/callback
app.use('/api', userApi);        // tài khoản học viên: /api/auth/…, /api/me
app.use('/api', examApi);        // engine làm bài: /api/attempts/…
app.use('/api', api);            // danh mục công khai + /api/admin/…

/* ---------------- Khu quản trị ----------------
   Guard phía server: chưa đăng nhập thì đá về /admin/dang-nhap/ ngay từ HTTP,
   không để lộ khung trang quản trị rồi mới kiểm ở client. */
function adminPage(file) {
  const serve = serveHtmlWithNonce(file);
  return (req, res) => {
    if (!A.currentAdmin(req)) {
      if (!req.path.endsWith('/')) return res.redirect(301, req.path + '/');
      const next = encodeURIComponent(req.originalUrl);
      return res.redirect(302, '/admin/dang-nhap/?next=' + next);
    }
    serve(req, res);
  };
}

app.get('/admin/dang-nhap/', serveHtmlWithNonce('admin/dang-nhap.html'));
app.get('/admin/', adminPage('admin/index.html'));
app.get('/admin/de-thi/', adminPage('admin/tests.html'));
app.get('/admin/format/', adminPage('admin/formats.html'));
app.get('/admin/de-thi/:id/', adminPage('admin/builder.html'));
app.get('/admin/ngan-hang/', adminPage('admin/bank.html'));
app.get('/admin/hoc-vien/', adminPage('admin/users.html'));
app.get('/admin/code/', adminPage('admin/codes.html'));
app.get('/admin/quan-tri/', adminPage('admin/settings.html'));

/* ---------------- Trang công khai ----------------
   Đã đăng nhập rồi thì vào thẳng khu học viên, không bắt đăng nhập lại. */
function guestPage(file) {
  const serve = serveHtmlWithNonce(file);
  return (req, res) => {
    if (A.currentUser(req)) {
      if (!req.path.endsWith('/')) return res.redirect(301, req.path + '/');
      const next = new URLSearchParams(req.originalUrl.split('?')[1] || '').get('next');
      return res.redirect(302, next && next.startsWith('/prep/') ? next : '/prep/');
    }
    serve(req, res);
  };
}

app.get('/', (req, res) => res.redirect('/prep/landing/'));
app.get('/prep/landing/', serveHtmlWithNonce('prep/landing/index.html'));
/* Shown by the service worker when a navigation cannot reach the network.
   Public: the point of it is to work with no session and no radio. */
app.get('/prep/offline/', serveHtmlWithNonce('prep/offline.html'));
app.get('/prep/dang-ky/', guestPage('prep/auth/dang-ky.html'));
app.get('/prep/dang-nhap/', guestPage('prep/auth/dang-nhap.html'));
app.get('/prep/quen-mat-khau/', guestPage('prep/auth/quen-mat-khau.html'));
// Hai màn dưới mở cho cả khách lẫn người đã đăng nhập: liên kết trong email có
// thể được mở ở trình duyệt bất kỳ.
app.get('/prep/xac-thuc-email/', serveHtmlWithNonce('prep/auth/xac-thuc-email.html'));
app.get('/prep/dat-lai-mat-khau/', serveHtmlWithNonce('prep/auth/dat-lai-mat-khau.html'));

/* ------------- Trang cần đăng nhập -------------
   Guard ở server: chưa có phiên thì đá về màn đăng nhập ngay từ HTTP, không
   để lộ khung trang rồi mới kiểm ở client. */
function studentPage(file) {
  const serve = serveHtmlWithNonce(file);
  return (req, res) => {
    if (!A.currentUser(req)) {
      if (!req.path.endsWith('/')) return res.redirect(301, req.path + '/');
      return res.redirect(302, '/prep/dang-nhap/?next=' + encodeURIComponent(req.originalUrl));
    }
    serve(req, res);
  };
}

app.get('/prep/', studentPage('prep/index.html'));
app.get('/prep/thu-vien/', studentPage('prep/library/index.html'));
app.get('/prep/mua-code/', studentPage('prep/codes/mua-code.html'));
app.get('/prep/nhap-code/', studentPage('prep/codes/nhap-code.html'));
app.get('/prep/code-cua-toi/', studentPage('prep/codes/code-cua-toi.html'));
app.get('/prep/bai-thi/:id/', studentPage('prep/test/index.html'));
/* Màn làm bài. Guard đăng nhập ở đây; quyền (còn gói, còn lượt) do
   /api/attempts quyết định, và trang hiện đúng lý do máy chủ trả về. */
app.get('/prep/lam-bai/', studentPage('prep/exam/index.html'));
/* Kết quả một lượt thi. Mã lượt nằm trên đường dẫn; quyền xem do
   /api/attempts/:id/result quyết định — lượt của người khác trả 404. */
app.get('/prep/ket-qua/:id/', studentPage('prep/exam/ket-qua.html'));
app.get('/prep/tai-khoan/', studentPage('prep/account/index.html'));

/* ------------- Khu tự học: cần gói có quyền -------------
   Từ vựng, ngữ pháp và phát âm chỉ mở từ gói Plus trở lên. Chặn ngay ở HTTP
   chứ không chỉ làm mờ ở giao diện: làm mờ là chuyện trình bày, ai xem mã
   nguồn trang cũng gỡ được. Ai chưa có quyền thì đá về trang bảng giá, kèm
   lý do để màn đó nói đúng chuyện vừa xảy ra. */
function studyPage(file) {
  const serve = serveHtmlWithNonce(file);
  return (req, res) => {
    const user = A.currentUser(req);
    if (!user) {
      if (!req.path.endsWith('/')) return res.redirect(301, req.path + '/');
      return res.redirect(302, '/prep/dang-nhap/?next=' + encodeURIComponent(req.originalUrl));
    }
    const ent = entitlementOf(user.id);
    if (!ent || !ent.features.selfStudy) {
      if (!req.path.endsWith('/')) return res.redirect(301, req.path + '/');
      return res.redirect(302, '/prep/mua-code/?locked=self-study&from=' + encodeURIComponent(req.path));
    }
    serve(req, res);
  };
}

/* Khu tự học */
app.get('/prep/hoc/dong-tu-bat-quy-tac/', studyPage('prep/learn/dong-tu-bat-quy-tac.html'));
app.get('/prep/hoc/tu-noi/', studyPage('prep/learn/tu-noi.html'));
app.get('/prep/hoc/thi/', studyPage('prep/learn/thi.html'));
app.get('/prep/hoc/danh-tu/', studyPage('prep/learn/danh-tu.html'));
app.get('/prep/hoc/tinh-tu/', studyPage('prep/learn/tinh-tu.html'));
app.get('/prep/hoc/khuyet-thieu/', studyPage('prep/learn/khuyet-thieu.html'));
app.get('/prep/hoc/dieu-kien/', studyPage('prep/learn/dieu-kien.html'));
app.get('/prep/hoc/bi-dong/', studyPage('prep/learn/bi-dong.html'));
app.get('/prep/hoc/menh-de/', studyPage('prep/learn/menh-de.html'));
app.get('/prep/hoc/nhan-manh/', studyPage('prep/learn/nhan-manh.html'));
app.get('/prep/hoc/sac-thai/', studyPage('prep/learn/sac-thai.html'));

/* ---------------- PWA ----------------
   The worker is served from the root so its scope covers the whole site, and
   with no-cache so a deploy is picked up on the next visit rather than being
   pinned for a day by HTTP caching. */
app.get('/sw.js', (req, res) => {
  res.setHeader('Content-Type', 'application/javascript; charset=utf-8');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Service-Worker-Allowed', '/');
  res.sendFile(path.join(PUB, 'sw.js'));
});

app.get('/manifest.webmanifest', (req, res) => {
  res.setHeader('Content-Type', 'application/manifest+json; charset=utf-8');
  res.setHeader('Cache-Control', 'public, max-age=3600');
  res.sendFile(path.join(PUB, 'manifest.webmanifest'));
});

/* ---------------- Static (CSS/JS/SVG/ảnh) ----------------
   Chặn *.html tĩnh để HTML không bao giờ thoát khỏi vòng chèn nonce. */
app.use((req, res, next) => {
  if (req.path.endsWith('.html')) return res.status(404).send('Not found');
  next();
});
app.use(express.static(PUB, { index: false }));

app.use((req, res) =>
  res.status(404).type('text').send('404 - không tìm thấy. Về trang chủ: /prep/landing/')
);

/* Tài khoản quản trị khởi tạo + dọn phiên hết hạn định kỳ */
A.ensureSeedAdmin();
A.ensureDemoStudent();
setInterval(A.purgeSessions, 30 * 60e3).unref();

app.listen(PORT, () => {
  console.log(`VPET Prep chạy tại http://localhost:${PORT}`);
  console.log(`  · Học viên:  http://localhost:${PORT}/prep/landing/`);
  console.log(`  · Quản trị:  http://localhost:${PORT}/admin/`);
  A.reportAdminAccounts();
});
