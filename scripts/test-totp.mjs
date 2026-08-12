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
