/**
 * Tests for the account rescue path.
 *
 * Background: the bootstrap only creates an admin when the database has none, and
 * it used to set the demo student's password only when pass_hash was empty. So once
 * the password in the database drifted from the README it stayed drifted, silently,
 * with no way back in. This suite pins two things down:
 *   1. The demo account repairs itself to match the documentation on every boot.
 *   2. scripts/accounts.js can reset a lost administrator password.
 *
 * Runs standalone, no server needed: node scripts/test-accounts.js
 */
'use strict';

const { execFileSync } = require('child_process');
const fs = require('fs');
const os = require('os');
const path = require('path');

let pass = 0, fail = 0;
const ok = (c, name, detail) => {
  if (c) { pass++; console.log('✓ ' + name); }
  else { fail++; console.log('✗ ' + name + (detail ? ' — ' + detail : '')); }
};

const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'vpet-accounts-'));
const DB = path.join(tmpDir, 'probe.sqlite');
const ROOT = path.join(__dirname, '..');

/** Run a snippet in a child process against its own database, returning stdout */
function runNode(code, extraEnv) {
  return execFileSync(process.execPath, ['-e', code], {
    cwd: ROOT, encoding: 'utf8',
    env: { ...process.env, PREP_DB: DB, NODE_ENV: 'test', ...(extraEnv || {}) },
    stdio: ['ignore', 'pipe', 'pipe']
  });
}

function cli(...args) {
  return execFileSync(process.execPath, [path.join('scripts', 'accounts.js'), ...args], {
    cwd: ROOT, encoding: 'utf8',
    env: { ...process.env, PREP_DB: DB, NODE_ENV: 'test' },
    stdio: ['ignore', 'pipe', 'pipe']
  });
}

try {
  console.log('\n\x1b[1m== Account rescue ==\x1b[0m');
  console.log('Throwaway database: ' + DB + '\n');

  /* 1. Bootstrap a clean database */
  runNode("require('./server/auth').ensureSeedAdmin();");
  const adminCount = runNode("const{q}=require('./server/db');console.log(q.val('SELECT COUNT(*) c FROM admins'))").trim();
  ok(adminCount === '1', 'A fresh database creates one administrator', 'saw ' + adminCount);

  /* The demo password is no longer a constant anywhere, so this test brings its
     own and hands it to the children through the environment — which is also
     the arrangement being tested. */
  const DEMO_PW = 'Kiemthu-' + require('crypto').randomBytes(6).toString('hex');
  process.env.DEMO_STUDENT_PASSWORD = DEMO_PW;

  /* 2. ensureDemoStudent() applies DEMO_STUDENT_PASSWORD on first boot */
  runNode("require('./server/auth').ensureDemoStudent();");
  const rightFirstTime = runNode(
    "const A=require('./server/auth'),{q}=require('./server/db');" +
    "const u=q.get(\"SELECT pass_hash FROM users WHERE username='student'\");" +
    "console.log(A.verifyPassword(process.env.DEMO_STUDENT_PASSWORD, u.pass_hash))").trim();
  ok(rightFirstTime === 'true', 'The demo student signs in with the password the environment names');

  /* 3. Demo password changed → the next boot must pull it back */
  runNode("const A=require('./server/auth'),{q}=require('./server/db');" +
    "q.run('UPDATE users SET pass_hash=? WHERE username=?', A.hashPassword('HasDrifted123'), 'student');");
  const hasDrifted = runNode(
    "const A=require('./server/auth'),{q}=require('./server/db');" +
    "const u=q.get(\"SELECT pass_hash FROM users WHERE username='student'\");" +
    "console.log(A.verifyPassword(process.env.DEMO_STUDENT_PASSWORD, u.pass_hash))").trim();
  ok(hasDrifted === 'false', 'Set up the case where the demo password has drifted');

  const repaired = runNode("console.log(require('./server/auth').ensureDemoStudent())").trim();
  ok(repaired.includes('true'), 'The next boot spots the drift and resets it');

  const backInLine = runNode(
    "const A=require('./server/auth'),{q}=require('./server/db');" +
    "const u=q.get(\"SELECT pass_hash FROM users WHERE username='student'\");" +
    "console.log(A.verifyPassword(process.env.DEMO_STUDENT_PASSWORD, u.pass_hash))").trim();
  ok(backInLine === 'true', 'The demo password is back to what the environment names');

  /* 4. Change nothing when it is already right — no needless write, no warning each run */
  const secondRun = runNode("console.log(require('./server/auth').ensureDemoStudent())").trim();
  ok(secondRun.includes('false'), 'Already correct means leave it alone');

  /* 5. A locked or unverified demo account is pulled back too */
  runNode("const{q}=require('./server/db');q.run(\"UPDATE users SET status='locked', verified=0 WHERE username='student'\");");
  runNode("require('./server/auth').ensureDemoStudent();");
  const state = runNode(
    "const{q}=require('./server/db');" +
    "const u=q.get(\"SELECT verified, status FROM users WHERE username='student'\");" +
    "console.log(u.verified + '/' + u.status)").trim();
  ok(state === '1/active', 'A locked demo account is reopened', state);

  /* 5b. The display name is pulled back as well. The name comes from a seed that runs
     once, so an existing database keeps the old value whatever the seed says — and that
     name appears in the greeting on every signed-in screen. */
  runNode("const{q}=require('./server/db');q.run(\"UPDATE users SET name='Old Name' WHERE username='student'\");");
  const nameRepaired = runNode("console.log(require('./server/auth').ensureDemoStudent())").trim();
  ok(nameRepaired.includes('true'), 'A drifted display name is spotted too');
  const displayName = runNode(
    "const{q}=require('./server/db');" +
    "console.log(q.val(\"SELECT name FROM users WHERE username='student'\"))").trim();
  ok(displayName === 'Demo Student', 'The display name is pulled back to the documented one', displayName);

  /* 6. In production, never touch the demo account */
  const inProduction = execFileSync(process.execPath,
    ['-e', "console.log(require('./server/auth').ensureDemoStudent())"],
    { cwd: ROOT, encoding: 'utf8', env: { ...process.env, PREP_DB: DB, NODE_ENV: 'production' } }).trim();
  ok(inProduction.includes('false'), 'Production does not reset the demo account');

  /* 7. The command line tool: listing breaks nothing and lists correctly */
  const listOutput = cli('list');
  ok(/Admin accounts \(1\)/.test(listOutput), 'The "list" command lists administrators');
  ok(!listOutput.includes(DEMO_PW), 'The "list" command does NOT print a password');

  /* 8. Administrator password lost → it can be reset */
  runNode("const A=require('./server/auth'),{q}=require('./server/db');" +
    "q.run('UPDATE admins SET pass_hash=? WHERE username=?', A.hashPassword('NobodyKnows999'), 'admin');");
  /* No argument: a password is generated and printed once. There is no default
     to compare against any more — the check is that the tool tells you what it
     chose, and that what it printed is what now works. */
  const generatedOut = cli('reset-admin');
  const generated = (generatedOut.match(/Password\s*:\s*(\S+)/) || [])[1] || '';
  ok(generated.length >= 10, 'reset-admin with no argument generates a password and prints it', generated);
  const adminOk = runNode(
    "const A=require('./server/auth'),{q}=require('./server/db');" +
    "const a=q.get(\"SELECT pass_hash FROM admins WHERE username='admin'\");" +
    "console.log(A.verifyPassword(process.env.CHECK_PW, a.pass_hash))", { CHECK_PW: generated }).trim();
  ok(adminOk === 'true', 'and the password it printed is the one that now works');

  /* 9. A chosen password works, and one that is too short is refused */
  cli('reset-admin', 'AVeryLongPassword123');
  const chosenPassword = runNode(
    "const A=require('./server/auth'),{q}=require('./server/db');" +
    "const a=q.get(\"SELECT pass_hash FROM admins WHERE username='admin'\");" +
    "console.log(A.verifyPassword('AVeryLongPassword123', a.pass_hash))").trim();
  ok(chosenPassword === 'true', 'A chosen administrator password is accepted');

  let refusedShort = false;
  try { cli('reset-admin', 'short'); } catch (e) { refusedShort = true; }
  ok(refusedShort, 'A password that is too short is refused');

  /* 10. Resetting an administrator password must revoke every old session */
  const sessionsBefore = runNode(
    "const{q}=require('./server/db');" +
    "q.run('INSERT INTO sessions (token_hash,admin_id,created_at,expires_at) VALUES (?,?,?,?)'," +
    "  'fake-token', q.val(\"SELECT id FROM admins WHERE username='admin'\"), '2026-01-01T00:00:00Z', '2099-01-01T00:00:00Z');" +
    "console.log(q.val('SELECT COUNT(*) c FROM sessions'))").trim();
  ok(sessionsBefore === '1', 'Set up one existing session');
  cli('reset-admin');
  const sessionsAfter = runNode("const{q}=require('./server/db');console.log(q.val('SELECT COUNT(*) c FROM sessions'))").trim();
  ok(sessionsAfter === '0', 'Resetting the password revokes every old session');

  /* 11. Unlocking students */
  runNode("const{q}=require('./server/db');q.run(\"UPDATE users SET status='locked' WHERE username='student'\");");
  cli('unlock');
  const stillLocked = runNode("const{q}=require('./server/db');console.log(q.val(\"SELECT COUNT(*) c FROM users WHERE status='locked'\"))").trim();
  ok(stillLocked === '0', 'The "unlock" command unlocks every locked account');

  /* 12. A bad command fails loudly rather than silently doing something */
  let refusedUnknown = false;
  try { cli('delete-everything'); } catch (e) { refusedUnknown = true; }
  ok(refusedUnknown, 'An unknown command is refused');

  /* 13. An exam family that is not ready must have nothing on sale.
     This is a rule applied at boot, so test it the way it really happens: push a
     test of a parked family to 'published' with SQL, restart, and see whether it
     gets pulled back to draft. */
  const parkedFamily = runNode(
    "const{q}=require('./server/db');" +
    "console.log(q.val(\"SELECT f.id FROM families f WHERE f.status='coming_soon' " +
    "AND EXISTS (SELECT 1 FROM tests t WHERE t.family_id=f.id) ORDER BY f.sort LIMIT 1\") || '')"
  ).trim();
  ok(!!parkedFamily, 'There is a parked family that still has tests in the database', parkedFamily);

  const pushedLive = runNode(
    "const{q}=require('./server/db');" +
    "const id=q.val(\"SELECT id FROM tests WHERE family_id=? LIMIT 1\", '" + parkedFamily + "');" +
    "if(id){q.run(\"UPDATE tests SET status='published' WHERE id=?\", id);console.log(id)}else{console.log('')}"
  ).trim();
  ok(!!pushedLive, 'Set up a published test belonging to a parked family', pushedLive);

  const stillOnSale = runNode(
    "const{q}=require('./server/db');" +
    "console.log(q.val(\"SELECT COUNT(*) c FROM tests t JOIN families f ON f.id=t.family_id " +
    "WHERE t.status='published' AND f.status='coming_soon'\"))"
  ).trim();
  ok(stillOnSale === '0', 'A restart pulls a parked family\'s tests back to draft', stillOnSale + ' still on sale');

  const openFamilyIntact = runNode(
    "const{q}=require('./server/db');" +
    "console.log(q.val(\"SELECT COUNT(*) c FROM tests t JOIN families f ON f.id=t.family_id " +
    "WHERE t.status='published' AND f.status='ready'\"))"
  ).trim();
  ok(Number(openFamilyIntact) > 0, 'Tests of an open family are left alone', openFamilyIntact);

  /* 14. A brand-new database must be usable on its FIRST boot.

     The demo codes' plans are reconciled by a loop in seed(), and that loop used
     to run before the INSERT that creates the codes. On a fresh database it
     therefore found nothing, the INSERT named no plan_id column, and sixteen
     codes came out attached to no plan. Only the SECOND boot repaired them, so
     a brand-new install answered "This code has no plan attached. Ask your
     centre to issue a replacement" to the first person who tried one.

     This check has to run the seed EXACTLY ONCE, in its own database, and read
     the answer in the same process. Requiring server/db.js runs the seed, so
     querying from a second process would be a second boot — which is precisely
     the thing that used to hide the bug, and it hid it from me too while I was
     chasing it. One process, one seed, one answer. */
  const firstBootDir = fs.mkdtempSync(path.join(os.tmpdir(), 'vpet-firstboot-'));
  try {
    const unattached = execFileSync(process.execPath, ['-e',
      "const{q}=require('./server/db');" +
      "console.log(q.val(\"SELECT COUNT(*) c FROM codes WHERE plan_id IS NULL AND code IN (" +
      "'VPET-B1MK-24TR','IELT-AC12-96HD','TOEC-LR20-26CB','PREP-HHAN-2025','PREP-DUNG-ROI1')\"))"
    ], {
      cwd: ROOT, encoding: 'utf8',
      env: { ...process.env, PREP_DB: path.join(firstBootDir, 'first.sqlite'), NODE_ENV: 'test' },
      stdio: ['ignore', 'pipe', 'ignore']
    }).trim().split('\n').pop();
    ok(unattached === '0',
      'On the first boot of a fresh database every demo code already has its plan',
      unattached + ' code(s) came out with no plan, so redeeming one would 409');
  } finally {
    fs.rmSync(firstBootDir, { recursive: true, force: true });
  }

} finally {
  fs.rmSync(tmpDir, { recursive: true, force: true });
}

console.log(`\n${pass}/${pass + fail} checks passed`);
process.exit(fail ? 1 : 0);
