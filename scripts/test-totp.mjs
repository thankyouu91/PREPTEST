/**
 * Second factor on the administrator sign-in.
 *
 * Run with the server up: node scripts/test-totp.mjs
 *
 * The first section runs the six published RFC 6238 test vectors. That is the
 * whole reason to trust a hand-written TOTP implementation: "the HMAC looks
 * right" is an opinion, whereas agreeing with the standard on known inputs is
 * the same agreement every authenticator app is built on. The rest checks the
 * properties a correct code generator does NOT give you for free — a spent code
 * refused, a wrong code counted against the lockout, recovery codes that work
 * once — and then drives a real sign-in over HTTP against a throwaway database.
 */
import { createRequire } from 'node:module';
import { execFileSync } from 'node:child_process';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const require_ = createRequire(import.meta.url);
const totp = require_('../server/totp.js');
const ROOT = dirname(dirname(fileURLToPath(import.meta.url)));
const BASE = process.env.BASE || 'http://127.0.0.1:3000';

let pass = 0, fail = 0;
const ok = (c, name, detail) => {
  if (c) { pass++; console.log('✓ ' + name); return; }
  fail++;
  console.log('✗ ' + name + (detail === undefined ? '' : '  → ' + detail));
};
const head = t => console.log('\n\x1b[1m== ' + t + ' ==\x1b[0m');

let tmp = '';
try {
  head('RFC 6238 test vectors');

  /* Appendix B, the SHA-1 rows. The secret is the ASCII string
     "12345678901234567890"; the codes are 8 digits so every digit is compared
     rather than the low six. */
  const rfcSecret = totp.base32Encode(Buffer.from('12345678901234567890', 'ascii'));
  const VECTORS = [
    [59, '94287082'],
    [1111111109, '07081804'],
    [1111111111, '14050471'],
    [1234567890, '89005924'],
    [2000000000, '69279037'],
    /* Past 2^32 seconds. A counter written with a single writeUInt32BE silently
       loses the top bits and this row is the one that catches it. */
    [20000000000, '65353130']
  ];
  for (const [seconds, expected] of VECTORS) {
    const got = totp.hotp(totp.base32Decode(rfcSecret), totp.counterAt(seconds), 8);
    ok(got === expected, 'T=' + seconds + ' gives ' + expected, 'got ' + got);
  }

  head('base32 round trip');

  /* An authenticator is fed base32, and a secret typed in by hand arrives
     spaced, lower case, or both. All three have to mean the same key. */
  const raw = Buffer.from('a secret worth 20 by', 'ascii');
  ok(totp.base32Decode(totp.base32Encode(raw)).equals(raw), 'Encode then decode returns the same bytes');
  const s = totp.newSecret();
  ok(/^[A-Z2-7]{32}$/.test(s), 'A new secret is 32 base32 characters — 20 bytes', s.length + ' chars');
  ok(totp.totp(s, 1000) === totp.totp(s.toLowerCase(), 1000), 'Lower case is the same secret');
  ok(totp.totp(s, 1000) === totp.totp(s.replace(/(.{4})/g, '$1 '), 1000),
    'And so is one typed in with spaces');
  let threw = null;
  try { totp.base32Decode('not-base32-!!'); } catch (e) { threw = e; }
  ok(threw && threw.code === 'BAD_SECRET', 'Something that is not base32 is refused, not silently decoded');

  head('The window, and codes that are spent');

  const secret = totp.newSecret();
  const NOW = 1_800_000_000;                       // a fixed moment, so no test is clock-dependent
  const centre = totp.counterAt(NOW);
  const at = c => totp.hotp(totp.base32Decode(secret), c);

  ok(totp.verify(secret, at(centre), { atSeconds: NOW }) === centre, 'The current code is accepted');
  ok(totp.verify(secret, at(centre - 1), { atSeconds: NOW }) === centre - 1,
    'So is the one before it — a phone clock is never exact');
  ok(totp.verify(secret, at(centre + 1), { atSeconds: NOW }) === centre + 1, 'And the one after');
  /* Wider is friendlier to a wrong clock and equally friendlier to guessing. */
  ok(totp.verify(secret, at(centre - 2), { atSeconds: NOW }) === null, 'Two steps back is too far');
  ok(totp.verify(secret, at(centre + 2), { atSeconds: NOW }) === null, 'And two steps forward');

  ok(totp.verify(secret, '000000', { atSeconds: NOW }) === null || at(centre) === '000000',
    'A wrong code is refused');
  ok(totp.verify(secret, '12345', { atSeconds: NOW }) === null, 'So is one of the wrong length');
  ok(totp.verify(secret, 'abcdef', { atSeconds: NOW }) === null, 'And one that is not digits at all');

  /* A code lives for a whole 30-second step, so one glimpsed over a shoulder or
     caught in a screenshot is usable seconds later unless the step is burned. */
  ok(totp.verify(secret, at(centre), { atSeconds: NOW, lastCounter: centre }) === null,
    'A code from a step already spent is refused — no replay inside its 30 seconds');
  ok(totp.verify(secret, at(centre + 1), { atSeconds: NOW, lastCounter: centre }) === centre + 1,
    'But the next step still works, so burning one does not lock the account out');

  head('The otpauth URI an authenticator reads');

  const uri = totp.otpauthUri('ABCDEFGHIJKLMNOP', 'admin');
  ok(uri.startsWith('otpauth://totp/'), 'Right scheme');
  ok(uri.includes('secret=ABCDEFGHIJKLMNOP'), 'Carries the secret');
  ok(uri.includes('issuer=VPET+Prep') || uri.includes('issuer=VPET%20Prep'), 'Names the issuer');
  ok(uri.includes('period=30') && uri.includes('digits=6') && uri.includes('algorithm=SHA1'),
    'And states the parameters rather than relying on defaults');

  head('Enrolling and signing in, against a throwaway database');

  tmp = mkdtempSync(join(tmpdir(), 'prep-totp-'));
  const DB = join(tmp, 'probe.sqlite');
  const runNode = code => execFileSync(process.execPath, ['-e', code], {
    cwd: ROOT, encoding: 'utf8',
    env: { ...process.env, PREP_DB: DB, NODE_ENV: 'test' },
    stdio: ['ignore', 'pipe', 'ignore']
  });
  const cli = (...args) => execFileSync(process.execPath, [join('scripts', 'accounts.js'), ...args], {
    cwd: ROOT, encoding: 'utf8',
    env: { ...process.env, PREP_DB: DB, NODE_ENV: 'test' },
    stdio: ['ignore', 'pipe', 'ignore']
  });

  runNode("require('./server/auth').ensureSeedAdmin();");
  ok(/two-factor off/.test(cli('totp-status')), 'A fresh administrator has no second factor');

  /* Step one prints a secret and switches nothing on. Enabling in one step would
     happily turn on a factor whose codes nobody can produce. */
  const offered = cli('totp-enable');
  const shown = (offered.match(/Secret\s+:\s+([A-Z2-7 ]+)/) || [])[1];
  ok(!!shown, 'Step one offers a secret', offered.slice(0, 120));
  ok(/Nothing has been switched on yet/.test(offered), 'And says plainly that nothing is on yet');
  ok(/two-factor off/.test(cli('totp-status')), 'Which is true — status still says off');

  const enrolSecret = shown.replace(/\s/g, '');
  let refused = '';
  try { cli('totp-enable', '000000', '--secret=' + enrolSecret); }
  catch (e) { refused = String(e.stdout || '') + String(e.message || ''); }
  ok(/two-factor off/.test(cli('totp-status')), 'A wrong code at step two switches nothing on');

  const enabled = cli('totp-enable', totp.totp(enrolSecret), '--secret=' + enrolSecret);
  ok(/Two-factor is ON/.test(enabled), 'The right code switches it on', enabled.slice(0, 120));
  const recovery = (enabled.match(/^\s{4}([A-Z2-7]{4}-[A-Z2-7]{4}-[A-Z2-7]{4}-[A-Z2-7]{4})$/gm) || [])
    .map(x => x.trim());
  ok(recovery.length === 10, 'And prints ten recovery codes', String(recovery.length));
  /* Enrolling without recovery codes would make turning this on a way to lose
     the platform permanently, which is the same as advising nobody turn it on. */
  ok(/shown once/.test(enabled), 'Warning that they are shown once');
  ok(/10 recovery code\(s\) left/.test(cli('totp-status')), 'Status counts them');

  /* Now the part that matters: does the sign-in actually demand it. Driven
     against a server of this suite's own, so the shared one keeps its state. */
  const port = 3210;
  const server = (await import('node:child_process')).spawn(
    process.execPath, ['server.js'],
    { cwd: ROOT, env: { ...process.env, PREP_DB: DB, PORT: String(port), NODE_ENV: 'test' },
      stdio: 'ignore', detached: false });
  try {
    const B = 'http://127.0.0.1:' + port;
    for (let i = 0; i < 60; i++) {
      try { await fetch(B + '/healthz'); break; } catch { await new Promise(r => setTimeout(r, 250)); }
    }
    const login = async body => {
      const page = await fetch(B + '/admin/dang-nhap/');
      const csrf = (page.headers.getSetCookie() || [])
        .map(c => (c.match(/prep_csrf=([^;]+)/) || [])[1]).filter(Boolean)[0];
      const r = await fetch(B + '/api/admin/login', {
        method: 'POST', redirect: 'manual',
        headers: {
          'Content-Type': 'application/json',
          'X-CSRF-Token': csrf,
          cookie: 'prep_csrf=' + csrf
        },
        body: JSON.stringify(body)
      });
      return { status: r.status, data: await r.json().catch(() => ({})) };
    };

    let r = await login({ username: 'admin', password: 'Admin@123456' });
    ok(r.status === 401 && r.data.needCode === true,
      'The right password alone is no longer enough', 'status ' + r.status + ' ' + JSON.stringify(r.data));

    r = await login({ username: 'admin', password: 'Admin@123456', code: '000000' });
    ok(r.status === 401, 'Nor is the right password with a wrong code', 'status ' + r.status);

    r = await login({ username: 'admin', password: 'wrong-password', code: totp.totp(enrolSecret) });
    ok(r.status === 401 && !r.data.needCode,
      'A right code with a wrong password fails at the password, as it should');

    const code = totp.totp(enrolSecret);
    r = await login({ username: 'admin', password: 'Admin@123456', code });
    ok(r.status === 200 && r.data.ok, 'Password plus code signs in', 'status ' + r.status);

    /* The same code again, seconds later, is the shoulder-surfing case. */
    r = await login({ username: 'admin', password: 'Admin@123456', code });
    ok(r.status === 401, 'The same code cannot be used twice', 'status ' + r.status);

    r = await login({ username: 'admin', password: 'Admin@123456', code: recovery[0] });
    ok(r.status === 200 && r.data.ok, 'A recovery code signs in', 'status ' + r.status);
    r = await login({ username: 'admin', password: 'Admin@123456', code: recovery[0] });
    ok(r.status === 401, 'And is spent — the same one never works twice', 'status ' + r.status);
    ok(/9 recovery code\(s\) left/.test(cli('totp-status')), 'Leaving nine');

    cli('totp-disable');
    ok(/two-factor off/.test(cli('totp-status')), 'Disabling turns it off');
    r = await login({ username: 'admin', password: 'Admin@123456' });
    ok(r.status === 200 && r.data.ok, 'After which the password alone works again');

    head('Enrolling from the browser, through the API');

    /* The admin screen runs the same two steps as the CLI. These checks are on
       the endpoints behind it, because that is where the rules live — the panel
       can only be as careful as what it calls. */
    const jar = [];
    const page = await fetch(B + '/admin/dang-nhap/');
    const csrf = (page.headers.getSetCookie() || [])
      .map(c => (c.match(/prep_csrf=([^;]+)/) || [])[1]).filter(Boolean)[0];
    const signIn = await fetch(B + '/api/admin/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-CSRF-Token': csrf, cookie: 'prep_csrf=' + csrf },
      body: JSON.stringify({ username: 'admin', password: 'Admin@123456' })
    });
    for (const c of signIn.headers.getSetCookie() || []) jar.push(c.split(';')[0]);
    const cookie = ['prep_csrf=' + csrf, ...jar.filter(c => !c.startsWith('prep_csrf'))].join('; ');
    const adminCsrf = (jar.find(c => c.startsWith('prep_csrf=')) || ('prep_csrf=' + csrf)).split('=')[1];
    const cookieHeader = jar.concat('prep_csrf=' + adminCsrf).join('; ');
    const call = async (path, body) => {
      const res = await fetch(B + '/api' + path, {
        method: body === undefined ? 'GET' : 'POST',
        headers: Object.assign({ cookie: cookieHeader, 'X-CSRF-Token': adminCsrf },
          body === undefined ? {} : { 'Content-Type': 'application/json' }),
        body: body === undefined ? undefined : JSON.stringify(body)
      });
      return { status: res.status, data: await res.json().catch(() => ({})) };
    };

    let a = await call('/admin/totp');
    ok(a.status === 200 && a.data.enabled === false, 'The panel reads "off" for an unenrolled account',
      JSON.stringify(a.data));

    a = await call('/admin/totp/start', {});
    ok(a.status === 200 && /^[A-Z2-7]{32}$/.test(a.data.secret || ''), 'Step one hands over a secret');
    ok((a.data.uri || '').startsWith('otpauth://totp/'), 'And the otpauth URI for the app');
    const webSecret = a.data.secret;

    /* The whole reason for two steps: step one must change nothing. */
    ok((await call('/admin/totp')).data.enabled === false,
      'Step one switches nothing on — asking for a secret is not enrolling');

    a = await call('/admin/totp/enable', { secret: webSecret, code: '000000' });
    ok(a.status === 403, 'A wrong code at step two is refused', 'status ' + a.status);
    ok((await call('/admin/totp')).data.enabled === false, 'And still nothing is on');

    a = await call('/admin/totp/enable', { secret: webSecret, code: totp.totp(webSecret) });
    ok(a.status === 200 && a.data.ok, 'The right code turns it on', JSON.stringify(a.data).slice(0, 120));
    ok(Array.isArray(a.data.recoveryCodes) && a.data.recoveryCodes.length === 10,
      'And returns ten recovery codes, once');
    const webRecovery = a.data.recoveryCodes;

    a = await call('/admin/totp');
    ok(a.status === 200 && a.data.enabled === true && a.data.recoveryLeft === 10,
      'The panel now reads "on" with ten codes left', JSON.stringify(a.data));
    ok(!('secret' in a.data) && !('recoveryCodes' in a.data),
      'And never hands the secret or the codes back on a later read', JSON.stringify(a.data));

    a = await call('/admin/totp/start', {});
    ok(a.status === 409, 'Starting again while it is on is refused rather than quietly re-keying');

    /* Turning it OFF is a downgrade, so it costs the password again. A borrowed
       session should not be able to remove the thing standing in its way. */
    a = await call('/admin/totp/disable', {});
    ok(a.status === 403, 'Turning it off with no password is refused', 'status ' + a.status);
    a = await call('/admin/totp/disable', { password: 'not-the-password' });
    ok(a.status === 403, 'And with the wrong one');
    ok((await call('/admin/totp')).data.enabled === true, 'It is still on after both attempts');

    /* The enrolment really took: the sign-in demands it. */
    r = await login({ username: 'admin', password: 'Admin@123456' });
    ok(r.status === 401 && r.data.needCode === true, 'The sign-in now asks for a code');
    r = await login({ username: 'admin', password: 'Admin@123456', code: webRecovery[0] });
    ok(r.status === 200, 'A recovery code from the browser flow works too');

    a = await call('/admin/totp/disable', { password: 'Admin@123456' });
    ok(a.status === 200 && a.data.ok, 'With the right password it turns off');
    ok((await call('/admin/totp')).data.enabled === false, 'And reads as off');

    head('The sign-in screen asks for the code only when told to');

    /* The field is hidden until the server answers needCode. Asking everybody
       for a code they mostly do not have trains people to ignore the field. */
    const loginHtml = await (await fetch(B + '/admin/dang-nhap/')).text();
    ok(/id="code-row"[^>]*\shidden/.test(loginHtml), 'It ships hidden');
    ok(/id="code"/.test(loginHtml) && /autocomplete="one-time-code"/.test(loginHtml),
      'With the autocomplete hint a phone needs to offer the code');
    ok(/needCode/.test(loginHtml), 'And the page reacts to the flag the API sends');
    ok(!/ style="/.test(loginHtml), 'No inline style attribute — the CSP forbids it');

    head('The panel actually renders');

    /* The card sits behind a tab, and shot-admin.mjs shoots the settings page on
       its default tab — so nothing in the gate had ever drawn this markup. Markup
       nothing renders is markup nothing has checked: a mistyped component class
       shows up as unstyled text and a broken template shows up as nothing at all,
       and neither makes a test fail. So open it in a real browser and look. */
    const { launchChromium } = await import('./_browser.mjs');
    const browser = await launchChromium();
    try {
      const ctx = await browser.newContext();
      const errors = [];
      ctx.on('weberror', e => errors.push(String(e.error())));
      const p = await ctx.newPage();
      p.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });

      await p.goto(B + '/admin/dang-nhap/', { waitUntil: 'networkidle' });
      await p.fill('#username', 'admin');
      await p.fill('#password', 'Admin@123456');
      await p.click('#submit');
      await p.waitForURL(u => !u.pathname.includes('dang-nhap'), { timeout: 10000 });

      await p.goto(B + '/admin/quan-tri/', { waitUntil: 'networkidle' });
      await p.click('#tab-account');
      await p.waitForSelector('#tf-card', { timeout: 10000 });
      ok(await p.locator('#tf-card').isVisible(), 'The two-factor card is on the Admin account tab');
      await p.waitForSelector('#tf-start', { timeout: 10000 });
      ok((await p.locator('#tf-state').textContent()).trim() === 'Off',
        'It reads its state from the server rather than guessing');

      /* Step one in the browser, for real: the secret has to appear and the state
         must NOT flip to on, which is the property the two steps exist for. */
      await p.click('#tf-start');
      await p.waitForSelector('#tf-secret', { timeout: 10000 });
      const shownSecret = (await p.locator('#tf-secret').textContent()).replace(/\s/g, '');
      ok(/^[A-Z2-7]{32}$/.test(shownSecret), 'Pressing "Set up" shows a secret to type in', shownSecret);
      ok((await p.locator('#tf-state').textContent()).trim() === 'Off',
        'And the badge still says Off, because nothing has been switched on yet');

      await p.fill('#tf-code', totp.totp(shownSecret));
      await p.click('#tf-confirm');
      await p.waitForSelector('#tf-done', { timeout: 10000 });
      const codeItems = await p.locator('#tf-body li').count();
      ok(codeItems === 10, 'Confirming shows the ten recovery codes', String(codeItems));
      ok((await p.locator('#tf-state').textContent()).trim() === 'On', 'And the badge flips to On');

      await p.click('#tf-done');
      await p.waitForSelector('#tf-off', { timeout: 10000 });
      ok(/10 recovery codes left/.test(await p.locator('#tf-body').innerText()),
        'Afterwards the card reports how many are left');

      ok(errors.length === 0, 'No console or CSP errors anywhere in that flow',
        errors.slice(0, 2).join(' | '));
      await ctx.close();
    } finally {
      await browser.close();
    }
    /* Left enabled on this throwaway database on purpose — the next line proves the
       sign-in respects what the panel just did, end to end. */
    r = await login({ username: 'admin', password: 'Admin@123456' });
    ok(r.status === 401 && r.data.needCode === true,
      'And the sign-in screen now demands a code, enrolled entirely from the browser');
  } finally {
    server.kill('SIGTERM');
  }
} catch (e) {
  fail++;
  console.log('✗ Failed while running: ' + (e && e.stack ? e.stack : e));
} finally {
  if (tmp) rmSync(tmp, { recursive: true, force: true });
}

console.log('\n' + (fail ? '\x1b[31m' : '\x1b[32m') + pass + '/' + (pass + fail) + ' checks passed\x1b[0m');
process.exit(fail ? 1 : 0);
