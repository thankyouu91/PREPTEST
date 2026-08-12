/**
 * Tests for the account rescue path.
 *
 * Background: the bootstrap only creates an admin when the database has none, and
 * it used to set the demo student's password only when pass_hash was empty. So once
 * the password in the database drifted from the README it stayed drifted, silently,
 * with no way back in. This suite pins two things down:
 *   1. The demo account repairs itself to match the documentation on every boot.
 *   2. scripts/tai-khoan.js can reset a lost administrator password.
 *
 * Runs standalone, no server needed: node scripts/test-taikhoan.js
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

const thuMuc = fs.mkdtempSync(path.join(os.tmpdir(), 'vpet-taikhoan-'));
const DB = path.join(thuMuc, 'thu.sqlite');
const GOC = path.join(__dirname, '..');

/** Run a snippet in a child process against its own database, returning stdout */
function chay(ma) {
  return execFileSync(process.execPath, ['-e', ma], {
    cwd: GOC, encoding: 'utf8',
    env: { ...process.env, PREP_DB: DB, NODE_ENV: 'test' },
    stdio: ['ignore', 'pipe', 'pipe']
  });
}

function cli(...args) {
  return execFileSync(process.execPath, [path.join('scripts', 'tai-khoan.js'), ...args], {
    cwd: GOC, encoding: 'utf8',
    env: { ...process.env, PREP_DB: DB, NODE_ENV: 'test' },
    stdio: ['ignore', 'pipe', 'pipe']
  });
}

try {
  console.log('\n\x1b[1m== Account rescue ==\x1b[0m');
  console.log('Throwaway database: ' + DB + '\n');

  /* 1. Bootstrap a clean database */
  chay("require('./server/auth').ensureSeedAdmin();");
  const soAdmin = chay("const{q}=require('./server/db');console.log(q.val('SELECT COUNT(*) c FROM admins'))").trim();
  ok(soAdmin === '1', 'A fresh database creates one administrator', 'saw ' + soAdmin);

  /* 2. The demo account matches the documentation on first boot */
  chay("require('./server/auth').ensureDemoStudent();");
  const dungNgay = chay(
    "const A=require('./server/auth'),{q}=require('./server/db');" +
    "const u=q.get(\"SELECT pass_hash FROM users WHERE username='student'\");" +
    "console.log(A.verifyPassword('Goodmorning01', u.pass_hash))").trim();
  ok(dungNgay === 'true', 'The demo student signs in with the password the README states');

  /* 3. Demo password changed → the next boot must pull it back */
  chay("const A=require('./server/auth'),{q}=require('./server/db');" +
    "q.run('UPDATE users SET pass_hash=? WHERE username=?', A.hashPassword('DaBiDoi123'), 'student');");
  const daLech = chay(
    "const A=require('./server/auth'),{q}=require('./server/db');" +
    "const u=q.get(\"SELECT pass_hash FROM users WHERE username='student'\");" +
    "console.log(A.verifyPassword('Goodmorning01', u.pass_hash))").trim();
  ok(daLech === 'false', 'Set up the case where the demo password has drifted');

  const daSua = chay("console.log(require('./server/auth').ensureDemoStudent())").trim();
  ok(daSua.includes('true'), 'The next boot spots the drift and resets it');

  const hetLech = chay(
    "const A=require('./server/auth'),{q}=require('./server/db');" +
    "const u=q.get(\"SELECT pass_hash FROM users WHERE username='student'\");" +
    "console.log(A.verifyPassword('Goodmorning01', u.pass_hash))").trim();
  ok(hetLech === 'true', 'The demo password is back to what the documentation says');

  /* 4. Change nothing when it is already right — no needless write, no warning each run */
  const lanHai = chay("console.log(require('./server/auth').ensureDemoStudent())").trim();
  ok(lanHai.includes('false'), 'Already correct means leave it alone');

  /* 5. A locked or unverified demo account is pulled back too */
  chay("const{q}=require('./server/db');q.run(\"UPDATE users SET status='locked', verified=0 WHERE username='student'\");");
  chay("require('./server/auth').ensureDemoStudent();");
  const trangThai = chay(
    "const{q}=require('./server/db');" +
    "const u=q.get(\"SELECT verified, status FROM users WHERE username='student'\");" +
    "console.log(u.verified + '/' + u.status)").trim();
  ok(trangThai === '1/active', 'A locked demo account is reopened', trangThai);

  /* 5b. The display name is pulled back as well. The name comes from a seed that runs
     once, so an existing database keeps the old value whatever the seed says — and that
     name appears in the greeting on every signed-in screen. */
  chay("const{q}=require('./server/db');q.run(\"UPDATE users SET name='Old Name' WHERE username='student'\");");
  const daSuaTen = chay("console.log(require('./server/auth').ensureDemoStudent())").trim();
  ok(daSuaTen.includes('true'), 'A drifted display name is spotted too');
  const ten = chay(
    "const{q}=require('./server/db');" +
    "console.log(q.val(\"SELECT name FROM users WHERE username='student'\"))").trim();
  ok(ten === 'Demo Student', 'The display name is pulled back to the documented one', ten);

  /* 6. In production, never touch the demo account */
  const oProd = execFileSync(process.execPath,
    ['-e', "console.log(require('./server/auth').ensureDemoStudent())"],
    { cwd: GOC, encoding: 'utf8', env: { ...process.env, PREP_DB: DB, NODE_ENV: 'production' } }).trim();
  ok(oProd.includes('false'), 'Production does not reset the demo account');

  /* 7. The command line tool: listing breaks nothing and lists correctly */
  const raXem = cli('xem');
  ok(/Admin accounts \(1\)/.test(raXem), 'The "xem" command lists administrators');
  ok(!/Goodmorning01|Admin@123456/.test(raXem), 'The "xem" command does NOT print a password');

  /* 8. Administrator password lost → it can be reset */
  chay("const A=require('./server/auth'),{q}=require('./server/db');" +
    "q.run('UPDATE admins SET pass_hash=? WHERE username=?', A.hashPassword('KhongAiBiet999'), 'admin');");
  cli('dat-lai-admin');
  const adminOk = chay(
    "const A=require('./server/auth'),{q}=require('./server/db');" +
    "const a=q.get(\"SELECT pass_hash FROM admins WHERE username='admin'\");" +
    "console.log(A.verifyPassword('Admin@123456', a.pass_hash))").trim();
  ok(adminOk === 'true', 'An administrator password can be reset to the default');

  /* 9. A chosen password works, and one that is too short is refused */
  cli('dat-lai-admin', 'MatKhauRatDai123');
  const tuyChon = chay(
    "const A=require('./server/auth'),{q}=require('./server/db');" +
    "const a=q.get(\"SELECT pass_hash FROM admins WHERE username='admin'\");" +
    "console.log(A.verifyPassword('MatKhauRatDai123', a.pass_hash))").trim();
  ok(tuyChon === 'true', 'A chosen administrator password is accepted');

  let choiNgan = false;
  try { cli('dat-lai-admin', 'ngan'); } catch (e) { choiNgan = true; }
  ok(choiNgan, 'A password that is too short is refused');

  /* 10. Resetting an administrator password must revoke every old session */
  const conPhien = chay(
    "const{q}=require('./server/db');" +
    "q.run('INSERT INTO sessions (token_hash,admin_id,created_at,expires_at) VALUES (?,?,?,?)'," +
    "  'gia-lap', q.val(\"SELECT id FROM admins WHERE username='admin'\"), '2026-01-01T00:00:00Z', '2099-01-01T00:00:00Z');" +
    "console.log(q.val('SELECT COUNT(*) c FROM sessions'))").trim();
  ok(conPhien === '1', 'Set up one existing session');
  cli('dat-lai-admin');
  const saoPhien = chay("const{q}=require('./server/db');console.log(q.val('SELECT COUNT(*) c FROM sessions'))").trim();
  ok(saoPhien === '0', 'Resetting the password revokes every old session');

  /* 11. Unlocking students */
  chay("const{q}=require('./server/db');q.run(\"UPDATE users SET status='locked' WHERE username='student'\");");
  cli('mo-khoa');
  const conKhoa = chay("const{q}=require('./server/db');console.log(q.val(\"SELECT COUNT(*) c FROM users WHERE status='locked'\"))").trim();
  ok(conKhoa === '0', 'The "mo-khoa" command unlocks every locked account');

  /* 12. A bad command fails loudly rather than silently doing something */
  let choiLenhLa = false;
  try { cli('xoa-het-du-lieu'); } catch (e) { choiLenhLa = true; }
  ok(choiLenhLa, 'An unknown command is refused');

  /* 13. An exam family that is not ready must have nothing on sale.
     This is a rule applied at boot, so test it the way it really happens: push a
     test of a parked family to 'published' with SQL, restart, and see whether it
     gets pulled back to draft. */
  const kyThiPark = chay(
    "const{q}=require('./server/db');" +
    "console.log(q.val(\"SELECT f.id FROM families f WHERE f.status='coming_soon' " +
    "AND EXISTS (SELECT 1 FROM tests t WHERE t.family_id=f.id) ORDER BY f.sort LIMIT 1\") || '')"
  ).trim();
  ok(!!kyThiPark, 'There is a parked family that still has tests in the database', kyThiPark);

  const daDay = chay(
    "const{q}=require('./server/db');" +
    "const id=q.val(\"SELECT id FROM tests WHERE family_id=? LIMIT 1\", '" + kyThiPark + "');" +
    "if(id){q.run(\"UPDATE tests SET status='published' WHERE id=?\", id);console.log(id)}else{console.log('')}"
  ).trim();
  ok(!!daDay, 'Set up a published test belonging to a parked family', daDay);

  const conBan = chay(
    "const{q}=require('./server/db');" +
    "console.log(q.val(\"SELECT COUNT(*) c FROM tests t JOIN families f ON f.id=t.family_id " +
    "WHERE t.status='published' AND f.status='coming_soon'\"))"
  ).trim();
  ok(conBan === '0', 'A restart pulls a parked family\'s tests back to draft', conBan + ' still on sale');

  const vpetConNguyen = chay(
    "const{q}=require('./server/db');" +
    "console.log(q.val(\"SELECT COUNT(*) c FROM tests t JOIN families f ON f.id=t.family_id " +
    "WHERE t.status='published' AND f.status='ready'\"))"
  ).trim();
  ok(Number(vpetConNguyen) > 0, 'Tests of an open family are left alone', vpetConNguyen);

} finally {
  fs.rmSync(thuMuc, { recursive: true, force: true });
}

console.log(`\n${pass}/${pass + fail} checks passed`);
process.exit(fail ? 1 : 0);
