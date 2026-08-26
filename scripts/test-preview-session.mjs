/**
 * An administrator's "view as student" preview must not outlive the preview.
 *
 * `POST /api/admin/preview-student` signs the browser into the demo `student`
 * account for real — that is what makes it a useful preview — and it did so for
 * the full fortnight a normal sign-in gets, with the "you are previewing" banner
 * raised beside it and cleared only on sign-OUT. Two things followed, and the
 * platform is demonstrated from one machine, so both were reachable in one
 * afternoon:
 *
 *  · **The preview outlives the look.** Close the tab, come back next week, open
 *    the student site: still signed in as `student`. Any paper sat then is
 *    recorded against `student` and is CORRECT to be — the session said student.
 *    Nothing in the database looks wrong, which is why this cannot be found by
 *    reading the data.
 *  · **The banner outlives the preview.** Signing in as somebody else replaced
 *    prep_user and left prep_preview standing, so a brand new account read
 *    "you are previewing as a student" across its own dashboard.
 *
 * Both are now decided in one place: createUserSession() sets the flag with the
 * session, and an ordinary sign-in sets it to false.
 *
 * Run: node scripts/test-preview-session.mjs   (needs the server up)
 */
import { launchChromium } from './_browser.mjs';
import { DEMO_PASSWORD } from './_demo.mjs';

const BASE = process.env.BASE_URL || 'http://localhost:3000';
const out = [];
const check = (n, ok, extra) => out.push({ n, ok: !!ok, extra });

const browser = await launchChromium();
const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
const page = await ctx.newPage();

const cookie = async name =>
  (await ctx.cookies()).find(c => c.name === name) || null;

try {
  await page.goto(BASE + '/prep/dang-nhap/?lang=en', { waitUntil: 'networkidle' });
  await page.fill('#email', 'student');
  await page.fill('#password', DEMO_PASSWORD);
  await page.click('#submit');
  await page.waitForURL(u => !u.pathname.includes('dang-nhap'), { timeout: 10000 });

  const session = await cookie('prep_user');
  const flag = await cookie('prep_preview');
  check('An ordinary sign-in creates a session', !!session);

  /* The banner cookie is either absent or explicitly empty — never left at '1'
     by a previous preview in the same browser. */
  check('and does not leave a preview banner behind', !flag || flag.value !== '1',
    flag ? 'prep_preview=' + JSON.stringify(flag.value) : 'absent');

  /* A fortnight, in seconds, with a day of slack either side. A preview session
     must be nowhere near this. */
  const life = session ? session.expires - Date.now() / 1000 : 0;
  check('and lasts the full session length', life > 13 * 86400,
    Math.round(life / 86400) + ' days');

  /* Now the preview, in a browser of its own so the two cannot be confused. */
  const admCtx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  const adm = await admCtx.newPage();
  await adm.goto(BASE + '/admin/', { waitUntil: 'networkidle' });
  const user = process.env.ADMIN_USER || 'admin';
  const pass = process.env.ADMIN_PASSWORD || '';
  if (!pass) {
    console.log('· ADMIN_PASSWORD is not set, so the preview half is skipped.');
  } else {
    await adm.fill('#username', user);
    await adm.fill('#password', pass);
    await adm.click('button[type=submit]');
    await adm.waitForTimeout(1500);

    const started = await adm.evaluate(async () => {
      const csrf = decodeURIComponent((document.cookie.match(/(?:^|;\s*)prep_csrf=([^;]*)/) || [])[1] || '');
      const r = await fetch('/api/admin/preview-student', {
        method: 'POST', credentials: 'same-origin', headers: { 'X-CSRF-Token': csrf }
      });
      return r.status;
    });
    check('The preview starts', started === 200, 'status ' + started);

    const cookies = await admCtx.cookies();
    const pv = cookies.find(c => c.name === 'prep_preview');
    const ps = cookies.find(c => c.name === 'prep_user');
    check('and raises the banner', pv && pv.value === '1', pv ? pv.value : 'absent');

    /* Hours, not weeks. This is the check that matters: it is what stops a
       preview from quietly becoming the browser's signed-in account. */
    const pvLife = ps ? ps.expires - Date.now() / 1000 : 0;
    check('and the preview session is short', pvLife > 0 && pvLife < 6 * 3600,
      Math.round(pvLife / 60) + ' minutes');
    check('and the banner expires with it',
      pv && ps && Math.abs(pv.expires - ps.expires) < 120,
      pv && ps ? Math.round(Math.abs(pv.expires - ps.expires)) + 's apart' : 'missing');

    /* And signing in as an ordinary learner in that same browser takes the
       banner down — the second half of the bug. Posted rather than typed: the
       sign-in PAGE redirects away when a session is already present, which is
       exactly the state this half is about. */
    const signedIn = await adm.evaluate(async pw => {
      const csrf = decodeURIComponent((document.cookie.match(/(?:^|;\s*)prep_csrf=([^;]*)/) || [])[1] || '');
      const r = await fetch('/api/auth/login', {
        method: 'POST', credentials: 'same-origin',
        headers: { 'Content-Type': 'application/json', 'X-CSRF-Token': csrf },
        body: JSON.stringify({ username: 'student', password: pw })
      });
      return r.status;
    }, DEMO_PASSWORD);
    check('An ordinary sign-in succeeds in that browser', signedIn === 200, 'status ' + signedIn);
    const after = (await admCtx.cookies()).find(c => c.name === 'prep_preview');
    check('Signing in afterwards takes the banner down',
      !after || after.value !== '1', after ? after.value : 'absent');
  }
  await admCtx.close();
} finally {
  await browser.close();
}

let bad = 0;
for (const r of out) {
  console.log((r.ok ? '✓ ' : '✗ ') + r.n + (r.ok || !r.extra ? '' : '  — ' + r.extra));
  if (!r.ok) bad++;
}
console.log('\n' + (out.length - bad) + '/' + out.length + ' checks passed');
process.exitCode = bad ? 1 : 0;
