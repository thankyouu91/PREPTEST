/**
 * VPET Prep — server.
 *
 * Hai khu vực:
 * 1. Trang học viên (/prep/…): HTML tĩnh, state còn là mock phía client (giai đoạn 1).
 * 2. Khu quản trị (/admin/… + /api/admin/…): backend thật trên SQLite, có đăng nhập,
 *    phiên, CSRF, chống dò mật khẩu và nhật ký thao tác.
 *
 * - HTML luôn đi qua serveHtmlWithNonce(): chèn nonce vào <script>/<style> và đặt CSP
 *   nghiêm ngặt cho từng response (không CDN, không eval, không inline lậu).
 * - Routing non-strict: '/prep/x/' cũng khớp '/prep/x' → guard exact-path redirect
 *   MỘT lần sang bản có dấu '/' (bản có '/' không vào nhánh redirect nên không lặp vòng).
 *
 * TODO(frontend): chuyển trang học viên từ public/prep/_mock.js sang GET /api/catalog.
 */
const express = require('express');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');

const api = require('./server/api');
const A = require('./server/auth');

const app = express();
app.disable('x-powered-by');
app.set('trust proxy', true);

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
      res.setHeader('Content-Security-Policy', cspFor(nonce));
      res.setHeader('X-Content-Type-Options', 'nosniff');
      res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
      res.setHeader('Cache-Control', 'no-store');
      res.type('html').send(out);
    });
  };
}

/* ---------------- API (đăng ký trước static) ---------------- */
app.use('/api', api);

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
app.get('/admin/de-thi/:id/', adminPage('admin/builder.html'));
app.get('/admin/ngan-hang/', adminPage('admin/bank.html'));
app.get('/admin/hoc-vien/', adminPage('admin/users.html'));
app.get('/admin/code/', adminPage('admin/codes.html'));
app.get('/admin/quan-tri/', adminPage('admin/settings.html'));

/* ---------------- Trang công khai ---------------- */
app.get('/', (req, res) => res.redirect('/prep/landing/'));
app.get('/prep/landing/', serveHtmlWithNonce('prep/landing/index.html'));
app.get('/prep/dang-ky/', serveHtmlWithNonce('prep/auth/dang-ky.html'));
app.get('/prep/dang-nhap/', serveHtmlWithNonce('prep/auth/dang-nhap.html'));
app.get('/prep/quen-mat-khau/', serveHtmlWithNonce('prep/auth/quen-mat-khau.html'));
app.get('/prep/xac-thuc-email/', serveHtmlWithNonce('prep/auth/xac-thuc-email.html'));

/* ------------- Trang cần đăng nhập (mock guard ở client) ------------- */
app.get('/prep/', serveHtmlWithNonce('prep/index.html'));
app.get('/prep/thu-vien/', serveHtmlWithNonce('prep/library/index.html'));
app.get('/prep/mua-code/', serveHtmlWithNonce('prep/codes/mua-code.html'));
app.get('/prep/nhap-code/', serveHtmlWithNonce('prep/codes/nhap-code.html'));
app.get('/prep/code-cua-toi/', serveHtmlWithNonce('prep/codes/code-cua-toi.html'));
app.get('/prep/bai-thi/:id/', serveHtmlWithNonce('prep/test/index.html'));
app.get('/prep/tai-khoan/', serveHtmlWithNonce('prep/account/index.html'));

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
setInterval(A.purgeSessions, 30 * 60e3).unref();

app.listen(PORT, () => {
  console.log(`VPET Prep chạy tại http://localhost:${PORT}`);
  console.log(`  · Học viên:  http://localhost:${PORT}/prep/landing/`);
  console.log(`  · Quản trị:  http://localhost:${PORT}/admin/`);
});
