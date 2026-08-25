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
const paymentApi = require('./server/payment-api');
const A = require('./server/auth');
const placement = require('./server/placement');
const security = require('./server/security');
const lifecycle = require('./server/lifecycle');
const clustering = require('./server/cluster');
const analytics = require('./server/analytics');
const { q, attachBankAudio } = require('./server/db');
const { entitlementOf } = require('./server/entitlements');
const { asyncRoutes } = require('./server/async-route');
const secrets = require('./server/secrets');

/* Every handler registered on this app is wrapped so a rejected promise
   becomes next(err) instead of a request that hangs. See server/async-route.js. */
const app = asyncRoutes(express());
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
app.use(security.readLimit);

/* One line, once, the first time a worker is given anything to do.
   It answers the question that decides whether a cluster is worth its memory:
   is the work actually spread, or is one process taking all of it while the
   others sit warm and idle? Nothing else reports that — `ps` shows four
   processes either way, and the load average shows the total. Registered only
   in a worker, so a single-process run's log is exactly as it was, and gated on
   a boolean so the cost after the first request is one `if`. */
if (!clustering.isPrimary()) {
  let served = false;
  app.use((req, res, next) => {
    if (!served) { served = true; console.log(`[cluster] worker ${process.pid} serving`); }
    next();
  });
}

const PUB = path.join(__dirname, 'public');
const PORT = process.env.PORT || 3000;

/* ---------------- Health ----------------
   Registered before everything else, because a health check that depends on the
   rest of the application is measuring the wrong thing.

   It does a real database round-trip on purpose. A handler that answers 200
   from memory reports "the process is up", which the platform already knows —
   what it cannot see is a process that is listening while its database has gone
   away, and that is precisely the state worth restarting.

   It says nothing else. No version, no path, no error text: an unauthenticated
   endpoint is an unauthenticated endpoint, and every detail it volunteers is a
   detail somebody gets for free. The reason a check failed goes to the log,
   where the operator is, not to the caller. */
app.get('/healthz', async (req, res) => {
  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('X-Robots-Tag', 'noindex, nofollow');
  try {
    if (await q.val('SELECT 1 AS one') !== 1) throw new Error('the database answered, but not with 1');
    res.json({ ok: true });
  } catch (e) {
    console.error('[healthz] database check failed: ' + (e && e.message));
    res.status(503).json({ ok: false });
  }
});

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

/* ---------------- Pages, cut once instead of rewritten per request ----------------
 *
 * Every page view used to do the same three things from scratch: read the file
 * off disk, then run two global regular expressions across the whole document
 * to put a nonce on each <script and <style. The file does not change between
 * requests; only the nonce does. So the cutting is done once and the result
 * kept.
 *
 * A document is stored as the list of fragments BETWEEN the injection points,
 * each ending exactly where the attribute has to go. Rendering is then a single
 * join — no scanning, no allocation per match:
 *
 *     ['…<script', '…<style', '…'].join(' nonce="abc"')
 *
 * which is byte-for-byte what the two replaces produced.
 *
 * Freshness is handled by NOT being clever. In production the process is
 * restarted by every deploy, so a cached page can never be stale and the cache
 * is permanent. Outside production the file's mtime is checked per request —
 * a `stat` instead of a full read and two regex passes — because a page you
 * edited must appear on reload, and a caching layer you have to remember to
 * flush during development is a caching layer that will waste an afternoon.
 */
const IMMUTABLE_PAGES = process.env.NODE_ENV === 'production';
const pageCache = new Map();

/** The fragments between nonce injection points, ready to be joined. */
function cutForNonce(html) {
  const out = [];
  const re = /<(?:script|style)\b/g;
  let last = 0, m;
  while ((m = re.exec(html)) !== null) {
    const end = m.index + m[0].length;
    out.push(html.slice(last, end));
    last = end;
  }
  out.push(html.slice(last));
  return out;
}

/** The cut page, from memory when it is safe to trust what is there. */
function loadPage(absFile, done) {
  const hit = pageCache.get(absFile);
  if (hit && IMMUTABLE_PAGES) return done(null, hit.parts);
  if (!hit) {
    return fs.readFile(absFile, 'utf8', (err, html) => {
      if (err) return done(err);
      const parts = cutForNonce(html);
      fs.stat(absFile, (e, st) => {
        pageCache.set(absFile, { parts, mtime: e ? 0 : st.mtimeMs });
        done(null, parts);
      });
    });
  }
  fs.stat(absFile, (err, st) => {
    if (err) return done(null, hit.parts);          // gone missing: serve what we have
    if (st.mtimeMs === hit.mtime) return done(null, hit.parts);
    fs.readFile(absFile, 'utf8', (e, html) => {
      if (e) return done(null, hit.parts);
      const parts = cutForNonce(html);
      pageCache.set(absFile, { parts, mtime: st.mtimeMs });
      done(null, parts);
    });
  });
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
    loadPage(absFile, (err, parts) => {
      if (err) return res.status(500).send('Internal error');
      const nonce = crypto.randomBytes(16).toString('base64');
      const out = parts.join(` nonce="${nonce}"`);
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
      /* Counted once the response has really been delivered, and only for
         learner pages — see server/analytics.js. A no-op without the keys. */
      analytics.pageView(req, res);
      res.type('html').send(out);
    });
  };
}

/* ---------------- API (đăng ký trước static) ---------------- */
app.use(googleAuth.router);      // đăng nhập Google: /auth/google, /auth/google/callback
app.use(paymentApi);             // thanh toán: /api/checkout, /payments/:provider/…
app.use('/api', userApi);        // tài khoản học viên: /api/auth/…, /api/me
app.use('/api', examApi);        // engine làm bài: /api/attempts/…
app.use('/api', api);            // danh mục công khai + /api/admin/…

/* ---------------- Khu quản trị ----------------
   Guard phía server: chưa đăng nhập thì đá về /admin/dang-nhap/ ngay từ HTTP,
   không để lộ khung trang quản trị rồi mới kiểm ở client. */
function adminPage(file) {
  const serve = serveHtmlWithNonce(file);
  return async (req, res) => {
    if (!await A.currentAdmin(req)) {
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
  return async (req, res) => {
    if (await A.currentUser(req)) {
      if (!req.path.endsWith('/')) return res.redirect(301, req.path + '/');
      const next = new URLSearchParams(req.originalUrl.split('?')[1] || '').get('next');
      return res.redirect(302, next && next.startsWith('/prep/') ? next : '/prep/');
    }
    serve(req, res);
  };
}

app.get('/', (req, res) => res.redirect('/prep/landing/'));
app.get('/prep/landing/', serveHtmlWithNonce('prep/landing/index.html'));
/* Bộ tài liệu VPET, đọc trực tiếp trên web. Công khai có chủ đích: trang đích
   hứa "tải miễn phí, không cần tài khoản", nên bắt đăng nhập ở đây là nuốt lời. */
app.get('/prep/tai-lieu/', serveHtmlWithNonce('prep/tai-lieu/index.html'));
/* Chính sách quyền riêng tư. Công khai, và phải công khai: nó nói bài viết cùng
   bản ghi âm được gửi ra ngoài để chấm, mà người cần biết điều đó nhất là người
   đang cân nhắc có đăng ký hay không — tức là người chưa có tài khoản. */
app.get('/prep/rieng-tu/', serveHtmlWithNonce('prep/rieng-tu/index.html'));
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
/**
 * Pages a learner may reach before they have been placed.
 *
 * The placement test is compulsory, and "compulsory" enforced in browser
 * JavaScript is a suggestion — anybody who types a URL walks past it. So the
 * guard is here, on the server, in the one function every learner page goes
 * through.
 *
 * These three are the exceptions, and each is a way OUT rather than a way in.
 * A gate with no exits is a trap: somebody who cannot finish the test — a
 * broken microphone, a bank with no items at their level, simply changing their
 * mind — must still be able to reach their account, sign out, or read what the
 * platform is. Trapping them would turn a first bad five minutes into a support
 * ticket and a refund.
 */
const OPEN_BEFORE_PLACEMENT = [
  /* The gate cannot gate itself, or it redirects for ever. */
  '/prep/xep-lop/',
  /* Somewhere to go: change a detail, sign out, ask for help. */
  '/prep/tai-khoan/',
  '/prep/offline/',
  /* And buying. This one is a product decision rather than a technicality: the
     gate exists to make teaching effective, not to stand between somebody and
     paying. A new learner who has just registered and wants a plan must be able
     to buy one; making them sit a test first is a self-inflicted wound at
     exactly the moment they were most willing. */
  '/prep/mua-code/', '/prep/nhap-code/', '/prep/code-cua-toi/'
];

function studentPage(file) {
  const serve = serveHtmlWithNonce(file);
  return async (req, res) => {
    const user = await A.currentUser(req);
    if (!user) {
      if (!req.path.endsWith('/')) return res.redirect(301, req.path + '/');
      return res.redirect(302, '/prep/dang-nhap/?next=' + encodeURIComponent(req.originalUrl));
    }
    /* One indexed read on a table with one row per learner. It runs on every
       learner page view, so if it ever stops being cheap it belongs in the
       session rather than here. */
    if (!OPEN_BEFORE_PLACEMENT.includes(req.path) && await placement.needed(user.id)) {
      if (!req.path.endsWith('/')) return res.redirect(301, req.path + '/');
      /* Carrying `next` so the test hands them back to whatever they were
         actually trying to open, rather than dumping everyone on the dashboard. */
      return res.redirect(302, '/prep/xep-lop/?next=' + encodeURIComponent(req.originalUrl));
    }
    serve(req, res);
  };
}

app.get('/prep/', studentPage('prep/index.html'));
/* The library page is gone: it was a filtered catalogue for six exam
   families and the platform ships one paper, so the papers are listed on
   the home page instead. Redirected rather than removed, because a dead
   bookmark is not the learner's fault. */
app.get('/prep/thu-vien/', (req, res) => res.redirect(301, '/prep/'));
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
/* The placement screen itself. studentPage still requires a session — it is
   only the placement CHECK that this path is exempt from, or the gate would
   redirect the gate. */
app.get('/prep/xep-lop/', studentPage('prep/placement/index.html'));
app.get('/prep/luyen/', studentPage('prep/practise/index.html'));
app.get('/prep/on-tap/', studentPage('prep/revision/index.html'));

/* ------------- Khu tự học: cần gói có quyền -------------
   Từ vựng, ngữ pháp và phát âm chỉ mở từ gói Plus trở lên. Chặn ngay ở HTTP
   chứ không chỉ làm mờ ở giao diện: làm mờ là chuyện trình bày, ai xem mã
   nguồn trang cũng gỡ được. Ai chưa có quyền thì đá về trang bảng giá, kèm
   lý do để màn đó nói đúng chuyện vừa xảy ra. */
function studyPage(file) {
  const serve = serveHtmlWithNonce(file);
  return async (req, res) => {
    const user = await A.currentUser(req);
    if (!user) {
      if (!req.path.endsWith('/')) return res.redirect(301, req.path + '/');
      return res.redirect(302, '/prep/dang-nhap/?next=' + encodeURIComponent(req.originalUrl));
    }
    const ent = await entitlementOf(user.id);
    if (!ent || !ent.features.selfStudy) {
      if (!req.path.endsWith('/')) return res.redirect(301, req.path + '/');
      return res.redirect(302, '/prep/mua-code/?locked=self-study&from=' + encodeURIComponent(req.path));
    }
    serve(req, res);
  };
}

/* Khu tự học */
app.get('/prep/hoc/on-tap/', studyPage('prep/learn/on-tap.html'));
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

/* The end of the chain, and the reason server/async-route.js has somewhere to
   send a rejected handler. Four arguments on purpose: that is how Express tells
   an error handler from ordinary middleware.

   The caller is told nothing beyond "it failed". The reason goes to the log,
   where the operator is — an error message volunteered to an unauthenticated
   request is a free description of the inside of the process. */
app.use((err, req, res, next) => {
  console.error(`[500] ${req.method} ${req.originalUrl}`, (err && err.stack) || err);
  if (res.headersSent) return next(err);
  const wantsJson = req.path.startsWith('/api/') ||
    String(req.headers.accept || '').includes('application/json');
  res.status(500);
  if (wantsJson) res.json({ error: 'Something went wrong. Please try again.' });
  else res.type('text').send('500 - something went wrong');
});

/* Seed the admin account and the demo student BEFORE anything is listening.
   Both are database work and both are asynchronous now, so a listen() that did
   not wait for them would answer its first request against a half-seeded
   database — and the first request in a test run is a sign-in. */
/**
 * Work that must happen in exactly one process, however many are serving.
 *
 * Both of these keep state in memory, and that is the whole reason they are
 * fenced off here. Four copies of the sweeper would each find the same unmarked
 * paper, each mark it, and produce four sets of scores and four bills from the
 * model provider. Four copies of the purge would do the same delete four times,
 * which is merely wasteful — but the sweeper alone is enough to make this the
 * single most important line in Block 7.
 */
function startBackgroundJobs() {
  /* Which process owns them, said out loud once. An operator staring at four
     pids needs to know where the marking is happening before they can read
     anything else in the log, and counting these lines is how
     scripts/test-cluster.mjs proves there is exactly one of it. */
  console.log('[jobs] background jobs armed in pid ' + process.pid);

  /* setInterval does not await, so the sweep has to carry its own catch or a
     failed sweep becomes an unhandled rejection that takes the process down. */
  setInterval(() => {
    A.purgeSessions().catch(e => console.error('[purge] ' + (e && e.message)));
  }, 30 * 60e3).unref();

  /* Look for papers whose writing and speaking are still unmarked, and mark
     them. This is what makes the marking pass survive a restart: the queue is
     memory, every deploy empties it, and without something that comes back and
     asks again, a paper caught mid-pass keeps a null band for ever. Also clears
     the backlog of sittings finished before anyone pasted a key. Does nothing
     at all when there is no key. */
  require('./server/ai-marking-run').startSweeper();
}

(async () => {
  /* The boot work below runs in the primary and nowhere else. A worker is
     forked only after all of it has finished, so it inherits a database that is
     already migrated and seeded rather than racing three siblings to seed it.
     With WEB_CONCURRENCY unset there are no workers and this process is simply
     the process; see server/cluster.js. */
  if (clustering.isPrimary()) {
    /* First, before anything reads a key. With no AWS_SECRETS_ID this does
       nothing at all; with one it merges the secret into process.env, so every
       reader downstream keeps working unchanged. See server/secrets.js — and note
       the rule it depends on: a secret must be read at call time, never captured
       into a module constant at import, because modules are required above this
       line. scripts/test-secrets.mjs enforces that by reading the source.

       Once per boot, not once per process: cluster.fork() copies the primary's
       environment as it stands at fork time, so a worker starts with whatever
       this merged in. That is Node's documented behaviour and it is also what
       scripts/test-cluster.mjs checks, because the alternative — every worker
       calling out to Secrets Manager on boot — is N times the latency and N
       times the API calls for an answer that cannot differ. */
    await secrets.load();
    /* The bank's own recordings, into whatever store this install uses. After
       secrets, because S3 and GCS need their credentials; before listen(), because
       an audio item served without its audio is a question nobody was asked.

       Its own catch, and this is not decoration. The first version was a bare
       await in front of the two lines below, so an unreachable bucket did not just
       leave Part E silent - it stopped ensureSeedAdmin() and ensureDemoStudent()
       from ever running, and the whole platform came up with nobody able to sign
       in. Nothing about a recording should be able to do that. */
    try {
      await attachBankAudio();
    } catch (e) {
      console.error('[audio] the bank recordings could not be stored this boot: ' + (e && e.message));
      console.error('        Parts E, F, G, H and J may play nothing until this is fixed.');
    }

    await A.ensureSeedAdmin();
    await A.ensureDemoStudent();
  }

  /* The banner and the admin report belong to the boot, not to a socket. They
     used to live in the listen() callback, which was the same thing while there
     was one process and became four copies of both the moment there were four
     — including four passes over the admin table to print the same warning. */
  async function announce() {
    console.log(`VPET Prep chạy tại http://localhost:${PORT}`);
    console.log(`  · Học viên:  http://localhost:${PORT}/prep/landing/`);
    console.log(`  · Quản trị:  http://localhost:${PORT}/admin/`);
    try { await A.reportAdminAccounts(); } catch (e) { console.error(e && e.message); }
  }

  /* Fork, if asked to. Returns true only in a supervisor, which from here on
     serves nothing: it holds the listening socket for the workers, restarts one
     that dies, and runs the jobs that must not be run four times. */
  if (clustering.start({ log: console.log })) {
    startBackgroundJobs();
    await announce();
    return;
  }

  /* A worker, or a single-process run. The single process is its own primary,
     so it keeps the jobs; a worker must not touch them. */
  if (clustering.isPrimary()) startBackgroundJobs();

  const server = app.listen(PORT, async () => {
    if (!clustering.isPrimary()) return console.log(`[cluster] worker ${process.pid} listening`);
    await announce();
  });

  /* A crash exits non-zero so a supervisor restarts it; SIGTERM drains and exits 0.
     See the note at the top of server/lifecycle.js. */
  lifecycle.install(server);
})().catch(e => {
  console.error('The server could not start: ' + ((e && e.message) || e));
  process.exit(1);
});
