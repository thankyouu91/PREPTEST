/**
 * Student account journey THROUGH THE INTERFACE (wired to the real API).
 * Run: node scripts/test-auth.mjs   (needs the server up)
 *
 * Rule: NEVER change the demo `student` password — the acceptance screenshots and
 * the other suites all sign in with it. Every change-password and reset-password
 * check runs on a throwaway account registered inside the test itself.
 */
import { launchChromium } from './_browser.mjs';
import { DEMO_PASSWORD } from './_demo.mjs';

const BASE = process.env.BASE_URL || 'http://localhost:3000';
const results = [];
const check = (name, ok, extra) => { results.push({ name, ok, extra }); };

const stamp = String(process.hrtime.bigint()).slice(-9);
const TMP_EMAIL = `interface.${stamp}@example-test.vn`;
const TMP_PASS = 'Matkhau123';

const browser = await launchChromium();
const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 }, locale: 'vi-VN' });
const page = await ctx.newPage();
/* The test signs in wrongly on purpose; 401/403/429 from the auth endpoints are the
   expected result, not a page fault. Catch only JS errors and CSP violations. */
const EXPECTED = /Failed to load resource.*\b(401|403|429)\b/i;
const errors = [];
page.on('console', m => { if (m.type() === 'error' && !EXPECTED.test(m.text())) errors.push(m.text()); });
page.on('pageerror', e => errors.push('PAGEERROR ' + e.message));

/* Wait for the OUTCOME, never for the clock.
   This suite went red twice on 2026-08-12 with code that had passed minutes
   earlier. The cause was always a waitForTimeout guessed in advance: under load
   the request had not landed, the test read stale state and carried on, then broke
   a few lines later somewhere unrelated. The password change was the clearest
   case — 1200 ms was not enough, the OLD password still signed in, the page went
   inside, and the next visit to the sign-in screen was bounced by the guard while
   Playwright sat out 30 seconds waiting for an #email that could not exist.

   The replacement rule: wait until the operation has SETTLED — done or failed —
   and only then assert which way it went. Waiting for exactly the thing you are
   about to assert makes the assertion vacuous; waiting for "settled" does not. */
const OUTCOME_MS = 15000;

/** Wait for one of the outcome markers to appear. On timeout return null so the
    check just after reports the real problem instead of throwing mid-suite. */
const settle = (...selectors) => page
  .waitForSelector(selectors.join(', '), { timeout: OUTCOME_MS, state: 'visible' })
  .catch(() => null);

/** Wait for the request an action causes (skipping GET, which every page makes). */
const posted = urlPart => page
  .waitForResponse(r => r.url().includes(urlPart) && r.request().method() !== 'GET',
    { timeout: OUTCOME_MS })
  .catch(() => null);

/** Wait to leave a path — for actions that end in a navigation. */
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
  /* Right, and the page navigates away; wrong, and a banner appears. Wait until one
     of the two happens, so the caller always reads a settled state. */
  await Promise.race([leaves('/dang-nhap/'), settle('#form-banner.show')]);
};
/* Sign out by clearing the session cookie — faster and surer than clicking */
const logout = () => ctx.clearCookies();

/* ---------- 1. Signing in wrongly ---------- */
await login('student', 'wrong-password');
check('A wrong password is blocked', page.url().includes('/dang-nhap/'), page.url());
check('An error banner appears', await page.locator('#form-banner.show').isVisible());

/* The nonexistent username must DIFFER on every run. The brute-force lockout counts
   per IP × username: reuse one name and after five runs it locks, the message turns
   into "locked for 15 minutes", and the comparison below goes red because the test
   broke its own precondition. The `student` account escapes this because each run
   signs in correctly once, and a correct sign-in clears the counter. */
const msgWrongPass = (await page.locator('#form-banner-text').textContent()).trim();
await login('nobody' + stamp, DEMO_PASSWORD);
const msgWrongUser = (await page.locator('#form-banner-text').textContent()).trim();
check('The error message does not reveal whether the account exists', msgWrongUser === msgWrongPass, msgWrongUser);

/* ---------- 2. The server-side guard ---------- */
await logout();
/* A page that needs a session but is NOT behind the placement gate.
   /prep/thu-vien/ used to stand here; when the library was removed I put
   /prep/luyen/ in its place and it is the wrong shape: the practise screen is
   placement-gated, so a signed-out visit redirects twice, sign-in then
   placement, and the second hop was still in flight when a later step
   navigated away. The account page is guarded and placement-exempt
   (OPEN_BEFORE_PLACEMENT in server.js), which is the single hop this check
   is about. */
const guarded = await page.goto(BASE + '/prep/tai-khoan/', { waitUntil: 'networkidle' });
check('A page needing sign-in bounces to the sign-in screen', page.url().includes('/prep/dang-nhap/'), page.url());
check('The destination is kept in the next parameter', page.url().includes('next='), page.url());
check('A blocked page never answers 200', guarded.status() === 200 && page.url().includes('dang-nhap'), String(guarded.status()));

/* ---------- 3. Signing in properly ---------- */
await login('student', DEMO_PASSWORD);
check('Signing in reaches the dashboard', page.url().endsWith('/prep/'), page.url());
/* Wait for the dashboard to finish drawing BEFORE reading anything on it. The
   tests grid stays hidden until it has cards, and with no tests #mytests-empty
   appears, so one of the two showing means the page is built.
   The name box especially: the HTML ships with the literal "Student" as a
   placeholder, overwritten only once /api/me answers. Read too early and you read
   the placeholder — red because the test was quick, not the product wrong. */
await settle('#mytests-grid', '#mytests-empty');
const name = (await page.locator('#greet-name').textContent()).trim();
check('The student name is right', name === 'Demo Student', name);
/* Unlocked, not "on the page". The grid lists every published paper and locks
   the ones this account cannot open, so `article` counts the catalogue rather
   than the entitlement — which happened to be the same number while VPET
   published exactly one paper, and stopped being the same number the day Level 2
   was added. A locked card carries `card-locked` (see testCard() in
   public/prep/index.html); an unlocked one does not. */
const unlocked = await page.locator('#mytests-grid article:not(.card-locked)').count();
check('One test is already unlocked (from a code in the database)', unlocked === 1, 'counted ' + unlocked);

/* Signed in, the sign-in screen goes straight inside */
await page.goto(BASE + '/prep/dang-nhap/', { waitUntil: 'networkidle' });
check('Signed in, the sign-in screen is not shown again', page.url().endsWith('/prep/'), page.url());

/* ---------- 4. Signing in by email ---------- */
await logout();
await login('student@vpetprep.vn', DEMO_PASSWORD);
check('Signing in by email works', page.url().endsWith('/prep/'), page.url());

/* ---------- 5. Redeeming a live code, then signing in again ---------- */
await page.goto(BASE + '/prep/nhap-code/', { waitUntil: 'networkidle' });
await page.fill('#code', 'IELT-AC12-96HD');
const redeemed = posted('/api/redeem');
await page.click('#submit');
await redeemed;
await settle('#success-box', '#code-err.show');
check('Redeeming a code: the screen reaches the success state',
  await page.locator('#success-box').isVisible());
/* The database is not rebuilt between runs, so the first run is "just unlocked" and
   later ones are "you have already redeemed this code". Both are correct and both
   must reach the success screen — the only wrong outcome is reporting one as the
   other, so check the actual wording rather than just that the box appeared. */
const okTitle = (await page.locator('#ok-title').textContent()).trim();
check('It says the right thing: newly unlocked, or already active',
  okTitle === 'Unlocked.' || okTitle === 'This code is already active', okTitle);
check('No error is shown on a successful redemption',
  !(await page.locator('#code-err').evaluate(el => el.classList.contains('show'))));

await logout();
await login('student', DEMO_PASSWORD);
await settle('#mytests-grid', '#mytests-empty');
const afterRelogin = await page.locator('#mytests-grid article:not(.card-locked)').count();
/* This code unlocks the whole IELTS family, and IELTS is parked so it has no
   published tests. The right is still recorded — someone who paid does not lose it
   — but nothing appears yet. The day IELTS opens, they show up. */
check('Redeeming a parked family: the right is kept but no test appears yet',
  afterRelogin === 1, 'counted ' + afterRelogin);
const codeStillThere = await page.evaluate(() =>
  (PrepState.load().myCodes || []).some(c => String(c.code).startsWith('IELT-')));
check('A redeemed code stays on the account rather than vanishing', codeStillThere === true);

/* ---------- 6. Signing out from the sidebar ----------
   This used to click #logout-btn, a Sign out card on the Account screen. The
   card is gone: it duplicated the icon beside the account name, which is on
   every learner page rather than only that one. Same action, and now the check
   covers the control every learner actually reaches for. */
await page.goto(BASE + '/prep/tai-khoan/', { waitUntil: 'networkidle' });
await page.click('[data-logout]');
await page.waitForURL('**/prep/landing/', { timeout: 8000 }).catch(() => {});
check('Signing out returns to the landing page', page.url().includes('/prep/landing/'), page.url());
await page.goto(BASE + '/prep/', { waitUntil: 'networkidle' });
check('After signing out the student area is closed', page.url().includes('/dang-nhap/'), page.url());

/* ---------- 7. Registering a new account through the interface ---------- */
await page.goto(BASE + '/prep/dang-ky/', { waitUntil: 'networkidle' });

/* The tick-box says "I agree to the Privacy policy", so that document has to be
   something the person ticking it can actually open. It was a <b> for months:
   the consent was collected and there was nothing to consent TO. Checked as a
   real fetch rather than "is there an href", because a link to a route nobody
   registered is the same failure wearing a link's clothes. */
const privacyHref = await page.locator('label[for="terms"] a, #terms ~ span a').first()
  .getAttribute('href').catch(() => null);
check('The sign-up consent links to the privacy policy', !!privacyHref, String(privacyHref));
if (privacyHref) {
  const priv = await page.request.get(BASE + privacyHref);
  check('And that policy is a page this server serves', priv.status() === 200, String(priv.status()));
}

await page.fill('#name', 'Interface Test Person');
await page.fill('#email', TMP_EMAIL);
await page.fill('#phone', '0912345678');
await page.fill('#password', 'yeu');
await page.check('#terms');
const leaked = posted('/api/auth/register');
await page.click('#submit');
await Promise.race([settle('#err-password.show'), leaked]);
check('A password failing the rules is blocked client-side', await page.locator('#err-password.show').isVisible());

await page.fill('#password', TMP_PASS);
await page.click('#submit');
await page.waitForURL('**/prep/xac-thuc-email/**', { timeout: 8000 }).catch(() => {});
check('Registration moves on to the email verification screen', page.url().includes('/xac-thuc-email/'), page.url());
await settle('#dev-link');
check('The development build shows the verification link', await page.locator('#dev-link').isVisible());

/* Click the verification link → verified state */
await page.click('#dev-link-a');
await settle('#verify-result');
check('Email verification succeeds', await page.locator('#verify-result').isVisible());

/* ---------- 7b. Permissions: an account with no plan ----------
   A freshly registered account has redeemed no code, so it holds no rights. This is
   the only "blank" account in the suite, and therefore the only place the locked
   state can be checked. Check both layers: does the server really block it, and
   does the interface dim the right things. */
await page.goto(BASE + '/prep/hoc/tu-noi/', { waitUntil: 'networkidle' });
check('With no plan the server blocks self-study and redirects to the price list',
  page.url().includes('/prep/mua-code/') && page.url().includes('locked=self-study'), page.url());
await settle('#locked-note', '#pkg-grid article');
check('The price list says why you were just sent here',
  await page.locator('#locked-note').isVisible());
check('The price list shows all three plans',
  await page.locator('#pkg-grid article').count() === 3,
  'counted ' + (await page.locator('#pkg-grid article').count()));
check('The Self-study nav item is dimmed and does not lead straight in',
  await page.locator('.nav-item.is-locked[href*="locked=self-study"]').count() === 1);

/* The demo account holds a Plus plan and must NOT be locked — dimming things for
   someone who has paid is a fault that stays silent and is very hard to spot. */
await logout();
await login('student', DEMO_PASSWORD);
await page.goto(BASE + '/prep/hoc/tu-noi/', { waitUntil: 'networkidle' });
check('With a Plus plan self-study opens directly', page.url().includes('/prep/hoc/tu-noi/'), page.url());
await settle('.nav-item');
check('With the right, nothing is dimmed',
  await page.locator('.nav-item.is-locked').count() === 0);
await logout();
await login(TMP_EMAIL, TMP_PASS);

/* ---------- 8. Changing the password on the throwaway account ---------- */
await page.goto(BASE + '/prep/tai-khoan/', { waitUntil: 'networkidle' });
await page.click('#tab-security');
await page.fill('#cur-pass', 'wrong-one');
await page.fill('#new-pass', 'Matkhaumoi456');
await page.fill('#re-pass', 'Matkhaumoi456');
let passCall = posted('/api/me/password');
await page.click('#pass-save');
await passCall;
await settle('#pass-err.show', '#pass-ok.show');
check('Password change: blocked when the current password is wrong', await page.locator('#pass-err.show').isVisible());

await page.fill('#cur-pass', TMP_PASS);
await page.fill('#new-pass', 'Matkhaumoi456');
await page.fill('#re-pass', 'Matkhaumoi456');
/* Wait for the server's own answer. This is what caused both false reds: carry on
   before the change has landed and the old password just below still signs in, and
   the suite breaks somewhere else entirely. */
passCall = posted('/api/me/password');
await page.click('#pass-save');
await passCall;
await settle('#pass-ok.show', '#pass-err.show');
check('The password change succeeds', await page.locator('#pass-ok.show').isVisible());

await logout();
await login(TMP_EMAIL, TMP_PASS);
check('The old password stops working', page.url().includes('/dang-nhap/'), page.url());
await login(TMP_EMAIL, 'Matkhaumoi456');
/* A throwaway account created by this suite has never been placed, so signing
     in lands on the placement test rather than the dashboard — deliberately, and
     server.js carries the reasoning. What is being checked here is that the new
     password WORKS, so the assertion is "signed in and inside /prep/", not
     "arrived at one exact page". */
  const signedIn = u => /\/prep\//.test(u) && !/\/dang-nhap\//.test(u);
  check('The new password signs in', signedIn(page.url()), page.url());

/* ---------- 9. Forgotten and reset password ---------- */
await logout();
await page.goto(BASE + '/prep/quen-mat-khau/', { waitUntil: 'networkidle' });
await page.fill('#email', TMP_EMAIL);
const forgot = posted('/api/auth/forgot');
await page.click('#submit');
await forgot;
await settle('#step-done', '#form-banner.show');
check('The reset request succeeds', await page.locator('#step-done').isVisible());
/* #dev-link appears a beat after #step-done, so it needs its own wait. Waiting for
   the outcome of an action and assuming everything else on the page is done too is
   how you drop a fixed wait and keep the race — the mistake the first fix here made. */
await settle('#dev-link');
check('The development build shows the reset link', await page.locator('#dev-link').isVisible());

await page.click('#dev-link-a');
await page.waitForURL('**/prep/dat-lai-mat-khau/**', { timeout: 8000 }).catch(() => {});
check('The reset screen opens', page.url().includes('/dat-lai-mat-khau/'), page.url());
await page.fill('#password', 'Datlai789');
await page.fill('#repass', 'Datlai78x');
const leakedReset = posted('/api/auth/reset');
await page.click('#submit');
await Promise.race([settle('#err-repass.show'), leakedReset]);
check('Blocked while the two passwords differ', await page.locator('#err-repass.show').isVisible());

await page.fill('#repass', 'Datlai789');
const reset = posted('/api/auth/reset');
await page.click('#submit');
await reset;
await settle('#step-done', '#form-banner.show');
check('The password reset succeeds', await page.locator('#step-done').isVisible());

await login(TMP_EMAIL, 'Datlai789');
check('Signing in with the freshly reset password', signedIn(page.url()), page.url());

/* With no token, report an invalid link rather than showing the form */
await page.goto(BASE + '/prep/dat-lai-mat-khau/', { waitUntil: 'networkidle' });
check('A reset link with no token reports itself invalid', await page.locator('#step-invalid').isVisible());

/* ---------- 10. The sign-in page gives nothing away ----------
   There used to be a card here printing the demo username and password with a
   button to fill them in. It was removed on 2026-08-13: a working login on a
   public sign-in page is a working login for everybody who loads it. The check
   is now that it is GONE and stays gone — a convenience like that comes back
   very easily. */
await logout();
await page.goto(BASE + '/prep/dang-nhap/', { waitUntil: 'networkidle' });
check('The sign-in page no longer offers to fill in a demo account',
  await page.locator('#fill-demo').count() === 0);
const shown = await page.content();
check('and the password appears nowhere in what it serves',
  !shown.includes(DEMO_PASSWORD),
  'the demo password is still somewhere in the sign-in page');

await page.fill('#email', 'student');
await page.fill('#password', DEMO_PASSWORD);
const demoCall = posted('/api/auth/login');
await page.click('#submit');
await demoCall;
await Promise.race([leaves('/dang-nhap/'), settle('#form-banner.show')]);
check('The demo account still signs in after the whole suite', page.url().endsWith('/prep/'), page.url());

/* ---------------- PWA ----------------
   Three questions: can it be installed, does the service worker run, and — most
   important — does it cache anything it must not. A cache on a shared machine is
   where exam answers leak out. */
{
  const mres = await fetch(BASE + '/manifest.webmanifest');
  const mtype = mres.headers.get('content-type') || '';
  const man = await mres.json().catch(() => null);
  check('The manifest is served with the right content type', mres.status === 200 && mtype.includes('manifest+json'), mtype);
  check('The manifest has the fields Chrome needs to offer installation',
    !!man && man.name && man.start_url && man.display === 'standalone' &&
    (man.icons || []).some(i => /(^|\s)512x512(\s|$)/.test(i.sizes)) &&
    (man.icons || []).some(i => String(i.purpose).includes('maskable')),
    JSON.stringify(man && man.icons));

  const swres = await fetch(BASE + '/sw.js');
  check('The service worker is served at the root with site-wide scope',
    swres.status === 200 && swres.headers.get('service-worker-allowed') === '/',
    'status ' + swres.status);

  for (const icon of ['icon-192', 'icon-512', 'maskable-512']) {
    const r = await fetch(BASE + '/icons/' + icon + '.png');
    check('Icon ' + icon + ' loads', r.status === 200 && (r.headers.get('content-type') || '').includes('image/png'));
  }

  const off = await fetch(BASE + '/prep/offline/');
  check('The offline page opens while signed out', off.status === 200, 'status ' + off.status);

  /* In a context of its own: register the service worker, then inspect exactly what
     it has cached. */
  const swCtx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  const swPage = await swCtx.newPage();
  await swPage.goto(BASE + '/prep/landing/', { waitUntil: 'load' });
  const ready = await swPage.evaluate(() =>
    navigator.serviceWorker.ready.then(r => !!r.active).catch(() => false));
  check('The service worker registers and activates', ready === true, String(ready));

  await swPage.goto(BASE + '/prep/landing/', { waitUntil: 'load' });
  /* Wait for the service worker to fill its cache. This is setup, not a check: the
     two checks worth having just below are "nothing under /api is cached" and
     "no HTML page but the offline one is cached". */
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
  check('An app shell is cached for offline use', cached.length > 0, String(cached.length));
  check('Nothing under /api is cached — exam answers never sit in the cache',
    !cached.some(u => new URL(u).pathname.startsWith('/api/')),
    cached.filter(u => u.includes('/api/'))[0] || '');
  check('No HTML page but the offline one is cached',
    cached.every(u => {
      const p = new URL(u).pathname;
      return p === '/prep/offline/' || /\.[a-z0-9]+$/i.test(p);
    }),
    cached.filter(u => { const p = new URL(u).pathname; return p !== '/prep/offline/' && !/\.[a-z0-9]+$/i.test(p); })[0] || '');
  await swCtx.close();
}

await browser.close();

check('No console / CSP errors', errors.length === 0, errors[0] || '');
let failed = 0;
for (const r of results) {
  console.log((r.ok ? '✓ ' : '✗ ') + r.name + (r.ok || !r.extra ? '' : '  → ' + r.extra));
  if (!r.ok) failed++;
}
console.log(failed ? `\n${failed}/${results.length} checks FAILED` : `\n${results.length}/${results.length} checks passed`);
process.exitCode = failed ? 1 : 0;
