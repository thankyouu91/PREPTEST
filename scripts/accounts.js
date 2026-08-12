/**
 * Account rescue tool — runs straight against the database, no sign-in needed.
 *
 * Why it exists: the bootstrap only creates an administrator when the database has
 * NO admin at all. From the second run on it is silent. If the password in the
 * database has drifted from the one written in the README — changed by hand, by an
 * older run, or forgotten — there used to be no way back in.
 *
 * Usage (from the project root, with the server STOPPED):
 *
 *   node scripts/accounts.js list
 *       List the administrator accounts and the demo student's state.
 *       Prints no password: the database stores only hashes, which cannot be undone.
 *
 *   node scripts/accounts.js reset-admin [new-password]
 *       Reset an administrator password. Leave it out to reuse the default from the
 *       README. Add --user=<name> when there is more than one administrator.
 *
 *   node scripts/accounts.js reset-student
 *       Put the demo student's password back to the value the README states.
 *
 *   node scripts/accounts.js unlock
 *       Clear the locked flag on every student account.
 *
 * Note: the brute-force lockout (5 failures, 15 minutes) lives in process memory,
 * so stopping and restarting the server clears it.
 */
'use strict';

const A = require('../server/auth');
const { q, nowISO, DB_FILE } = require('../server/db');

const DEFAULT_ADMIN_PASSWORD = 'Admin@123456';
const DEMO_STUDENT_PASSWORD = 'Goodmorning01';

const args = process.argv.slice(2);
const verb = args[0] || 'list';
const positional = args.slice(1).filter(a => !a.startsWith('--'));
const optValue = key => {
  const m = args.find(a => a.startsWith('--' + key + '='));
  return m ? m.slice(key.length + 3) : '';
};

console.log('Database: ' + DB_FILE + '\n');

function listAccounts() {
  const admins = q.all('SELECT username, name, role, active, created_at, last_login_at FROM admins ORDER BY id');
  if (!admins.length) {
    console.log('No administrator account yet. Running the server once creates one.');
  } else {
    console.log('Admin accounts (' + admins.length + '):');
    admins.forEach(a => console.log(
      '  · ' + a.username + '  —  ' + a.name +
      '  [' + a.role + (a.active ? '' : ', DISABLED') + ']' +
      (a.last_login_at ? '  last signed in ' + a.last_login_at.slice(0, 16).replace('T', ' ') : '  never signed in')
    ));
  }

  const s = q.get("SELECT username, email, verified, status, pass_hash FROM users WHERE username='student'");
  console.log('\nDemo student account:');
  if (!s) {
    console.log('  · No "student" account in the database.');
  } else {
    console.log('  · ' + s.username + ' (' + s.email + ')' +
      '  ' + (s.verified ? 'verified' : 'NOT verified') +
      ', status ' + s.status +
      ', ' + (s.pass_hash ? 'has a password' : 'NO password set'));
  }

  const lockedCount = q.val("SELECT COUNT(*) c FROM users WHERE status='locked'");
  console.log('\nStudents currently locked: ' + lockedCount);
  console.log('\nThe database stores only hashes, so no password can be read back.');
  console.log('Locked out? Run:  node scripts/accounts.js reset-admin');
}

function resetAdmin() {
  const newPassword = positional[0] || DEFAULT_ADMIN_PASSWORD;
  if (newPassword.length < 10) {
    console.error('The password must be at least 10 characters.');
    process.exit(1);
  }

  const wantedUser = optValue('user');
  const admins = q.all('SELECT id, username FROM admins ORDER BY id');
  if (!admins.length) {
    console.error('No administrator in the database. Start the server once to create one, then run this again.');
    process.exit(1);
  }
  let chosen = wantedUser ? admins.find(a => a.username === wantedUser) : admins[0];
  if (!chosen) {
    console.error('No administrator named "' + wantedUser + '". Present: ' +
      admins.map(a => a.username).join(', '));
    process.exit(1);
  }
  if (!wantedUser && admins.length > 1) {
    console.log('There are ' + admins.length + ' administrators; taking the first.');
    console.log('Add --user=<username> to pick another.\n');
  }

  q.run('UPDATE admins SET pass_hash=?, active=1 WHERE id=?', A.hashPassword(newPassword), chosen.id);
  A.dropSessions ? A.dropSessions(chosen.id) : q.run('DELETE FROM sessions WHERE admin_id=?', chosen.id);
  q.run('INSERT INTO audit (admin_id,admin_name,action,target,meta_json,ip,at) VALUES (?,?,?,?,?,?,?)',
    null, 'cli', 'admin.password.reset', 'admins/' + chosen.username, '{"source":"scripts/accounts.js"}', null, nowISO());

  console.log('Administrator password reset.');
  console.log('  Username : ' + chosen.username);
  console.log('  Password : ' + newPassword);
  console.log('\nEvery previous session for this account has been revoked.');
  console.log('Restart the server, sign in at /admin/ and change the password under Administration.');
}

function resetStudent() {
  const u = q.get("SELECT id FROM users WHERE username='student'");
  if (!u) {
    console.error('No "student" account found. This database may never have been seeded.');
    process.exit(1);
  }
  q.run("UPDATE users SET pass_hash=?, verified=1, status='active' WHERE id=?",
    A.hashPassword(DEMO_STUDENT_PASSWORD), u.id);
  q.run('DELETE FROM user_sessions WHERE user_id=?', u.id);
  console.log('Demo student password put back to the value in the README.');
  console.log('  Username : student  (or student@vpetprep.vn)');
  console.log('  Password : ' + DEMO_STUDENT_PASSWORD);
}

function unlockAll() {
  const n = q.val("SELECT COUNT(*) c FROM users WHERE status='locked'");
  q.run("UPDATE users SET status='active' WHERE status='locked'");
  console.log('Unlocked ' + n + ' student account(s).');
  console.log('If sign-in is blocked after too many wrong attempts, just restart the server:');
  console.log('that counter lives in process memory and is never written to the database.');
}

const COMMANDS = {
  'list': listAccounts,
  'reset-admin': resetAdmin,
  'reset-student': resetStudent,
  'unlock': unlockAll
};

if (!COMMANDS[verb]) {
  console.error('Unknown command: ' + verb);
  console.error('Use one of: ' + Object.keys(COMMANDS).join(', '));
  process.exit(1);
}
COMMANDS[verb]();
