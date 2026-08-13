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
 *       Reset an administrator password. Leave it out and one is generated and
 *       printed once — there is no built-in default, because a default written
 *       into this file is a login published to everyone who can read the repo.
 *       Add --user=<name> when there is more than one administrator.
 *
 *   node scripts/accounts.js reset-student <new-password>
 *       Set the demo student's password. No default: a password written into
 *       this file would be a login published to everyone who can read the repo.
 *
 *   node scripts/accounts.js totp-status
 *       Show which administrators have a second factor, and how many recovery
 *       codes each has left.
 *
 *   node scripts/accounts.js totp-enable [code] [--secret=…] [--user=<name>]
 *       Two steps: run it once to get a secret, add that to an authenticator,
 *       then run it again with the 6-digit code to switch it on. Prints the
 *       recovery codes once and never again.
 *
 *   node scripts/accounts.js totp-disable [--user=<name>]
 *       Turn it off. The way back in when the phone is lost and the recovery
 *       codes are spent — which is why it needs the database, not a browser.
 *
 *   node scripts/accounts.js unlock
 *       Clear both kinds of lock: accounts an administrator disabled, and the
 *       15-minute lockouts from too many wrong passwords.
 *
 * Note: the brute-force lockout (5 failures, 15 minutes) lives in the DATABASE,
 * so restarting the server no longer clears it — this command is the way out.
 * It used to be held in process memory, which made "restart the server" the
 * documented fix and, incidentally, the fix for whoever was guessing too.
 */
'use strict';

const A = require('../server/auth');
const { q, nowISO, DB_FILE } = require('../server/db');
const totp = require('../server/totp');




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
  /* No default. This file used to carry one, which in a repository anybody can
     read is a published administrator login for every install whose operator
     never changed it. Given nothing, one is generated and printed once. */
  const newPassword = positional[0] || process.env.ADMIN_PASSWORD || A.generatedPassword();
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

/**
 * Set the demo student's password.
 *
 * Takes it as an argument, or from DEMO_STUDENT_PASSWORD. There is no default
 * any more: this file used to carry the password as a constant, which — in a
 * repository anybody can read — is a published login rather than a default.
 */
function resetStudent() {
  const newPassword = positional[0] || process.env.DEMO_STUDENT_PASSWORD || '';
  if (newPassword.length < 10) {
    console.error('Give the demo student a password of at least 10 characters:');
    console.error('  node scripts/accounts.js reset-student <new-password>');
    console.error('…or set DEMO_STUDENT_PASSWORD. There is no built-in default: one written');
    console.error('into this file would be a login published to everyone who can read it.');
    process.exit(1);
  }
  const u = q.get('SELECT id FROM users WHERE username=?', A.DEMO_STUDENT_USER);
  if (!u) {
    console.error('No "' + A.DEMO_STUDENT_USER + '" account found. This database may never have been seeded.');
    process.exit(1);
  }
  q.run("UPDATE users SET pass_hash=?, verified=1, status='active' WHERE id=?",
    A.hashPassword(newPassword), u.id);
  q.run('DELETE FROM user_sessions WHERE user_id=?', u.id);
  console.log('Demo student password set.');
  console.log('  Username : ' + A.DEMO_STUDENT_USER + '  (or student@vpetprep.vn)');
  console.log('  Password : ' + newPassword);
  console.log('\nEvery previous session for this account has been revoked.');
}

/* Two different things called "locked", and both have to go, or somebody clears
   one and is still shut out by the other.

   `users.status = 'locked'` is an administrator disabling an account.
   `throttle_locks` is the 15-minute wall after five wrong passwords.

   The second used to live in process memory, so the answer to being locked out
   was "restart the server" — which was also the answer for whoever was doing
   the guessing. It is in the database now, which means it survives a restart,
   which means this command is the way out rather than a footnote. */
function unlockAll() {
  const disabled = q.val("SELECT COUNT(*) c FROM users WHERE status='locked'");
  q.run("UPDATE users SET status='active' WHERE status='locked'");
  const throttled = A.clearAllLocks();
  console.log('Unlocked ' + disabled + ' student account(s) that an administrator had disabled.');
  console.log('Cleared ' + throttled + ' sign-in lockout(s) from too many wrong passwords.');
  console.log('\nBoth survive a restart, so this command is the way out of either.');
}

/* ---------------------- Second factor ----------------------
   Enrolment lives here rather than in the admin interface, and that is a choice
   rather than a shortcut. Turning on a second factor is the one operation where
   getting it half-done locks you out of the place you would go to fix it — so
   it happens with the server stopped, at a prompt, where the secret and the
   recovery codes can be written down before anything is switched on. */

function adminByName(name) {
  const admins = q.all('SELECT * FROM admins ORDER BY id');
  if (!admins.length) {
    console.error('No administrator in the database. Start the server once, then run this again.');
    process.exit(1);
  }
  const chosen = name ? admins.find(a => a.username === name) : admins[0];
  if (!chosen) {
    console.error('No administrator named "' + name + '". Present: ' + admins.map(a => a.username).join(', '));
    process.exit(1);
  }
  if (!name && admins.length > 1) {
    console.log('There are ' + admins.length + ' administrators; taking the first.');
    console.log('Add --user=<username> to pick another.\n');
  }
  return chosen;
}

function totpStatus() {
  for (const a of q.all('SELECT * FROM admins ORDER BY id')) {
    const left = A.recoveryCodesLeft(a.id);
    console.log('  · ' + a.username.padEnd(16) +
      (A.totpEnabled(a)
        ? 'two-factor ON since ' + a.totp_enabled_at.slice(0, 16).replace('T', ' ') + '  ·  ' + left + ' recovery code(s) left'
        : 'two-factor off'));
  }
}

function totpEnable() {
  const admin = adminByName(optValue('user'));
  if (A.totpEnabled(admin)) {
    console.error('Two-factor is already on for ' + admin.username + '. Turn it off first to re-enrol.');
    process.exit(1);
  }

  const secret = totp.newSecret();
  const code = positional[0];
  if (!code) {
    /* Two steps on purpose. The first prints the secret; the second proves the
       authenticator actually has it. Enabling in one step would happily switch
       on a factor nobody can produce. */
    console.log('Add this to your authenticator app, then run the command again with the 6-digit code.\n');
    console.log('  Account : ' + admin.username + ' @ VPET Prep');
    console.log('  Secret  : ' + secret.replace(/(.{4})/g, '$1 ').trim());
    console.log('  URI     : ' + totp.otpauthUri(secret, admin.username));
    console.log('\n  node scripts/accounts.js totp-enable <code> --secret=' + secret +
      (optValue('user') ? ' --user=' + optValue('user') : ''));
    console.log('\nNothing has been switched on yet.');
    return;
  }

  const useSecret = optValue('secret') || secret;
  if (totp.verify(useSecret, code) === null) {
    console.error('That code does not match the secret. Check the clock on your phone, then try again.');
    console.error('Nothing has been switched on.');
    process.exit(1);
  }

  const codes = A.issueRecoveryCodes(admin.id);
  q.run('UPDATE admins SET totp_secret=?, totp_enabled_at=?, totp_last_counter=NULL WHERE id=?',
    useSecret, nowISO(), admin.id);
  q.run('DELETE FROM sessions WHERE admin_id=?', admin.id);

  console.log('Two-factor is ON for ' + admin.username + '.');
  console.log('Every existing session for this account has been signed out.\n');
  console.log('RECOVERY CODES — write these down now. They are shown once and stored only as hashes,');
  console.log('so nobody, including this tool, can print them again. Each one works once.\n');
  codes.forEach(c => console.log('    ' + c));
  console.log('\nWithout them, losing the phone means losing the admin area.');
}

function totpDisable() {
  const admin = adminByName(optValue('user'));
  if (!A.totpEnabled(admin)) {
    console.log('Two-factor is already off for ' + admin.username + '.');
    return;
  }
  q.run('UPDATE admins SET totp_secret=NULL, totp_enabled_at=NULL, totp_last_counter=NULL WHERE id=?', admin.id);
  q.run('DELETE FROM admin_recovery_codes WHERE admin_id=?', admin.id);
  q.run('INSERT INTO audit (admin_id,admin_name,action,target,meta_json,ip,at) VALUES (?,?,?,?,?,?,?)',
    null, 'cli', 'admin.totp.disabled', 'admins/' + admin.username, '{"source":"scripts/accounts.js"}', null, nowISO());
  console.log('Two-factor is OFF for ' + admin.username + ', and its recovery codes are gone.');
  console.log('This is the way back in when the phone is lost and the recovery codes are spent —');
  console.log('which is why it needs the database, not a browser.');
}

const COMMANDS = {
  'list': listAccounts,
  'reset-admin': resetAdmin,
  'reset-student': resetStudent,
  'unlock': unlockAll,
  'totp-status': totpStatus,
  'totp-enable': totpEnable,
  'totp-disable': totpDisable
};

if (!COMMANDS[verb]) {
  console.error('Unknown command: ' + verb);
  console.error('Use one of: ' + Object.keys(COMMANDS).join(', '));
  process.exit(1);
}
COMMANDS[verb]();
