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
 *   node scripts/accounts.js doctor
 *       "Why can nobody sign in?" — compares the database THIS command would
 *       change against the one the running server actually has open, which is
 *       the mistake that looks like a wrong password, and then checks the two
 *       settings that break a sign-in after the password is already correct.
 *       Start here.
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
 *   node scripts/accounts.js set-level <username> <owner|manager|teacher>
 *       Set an administrator's level, and switch the account back on.
 *
 *       This is the way back from the one state the admin screens cannot fix
 *       themselves: no active owner. The screens refuse to create that state —
 *       an owner cannot demote or deactivate themselves, and a change that
 *       would leave no owner is rolled back — but a restored backup, a hand
 *       edit or a bug can still produce it, and once it exists nobody has
 *       `admins.manage` and nobody can grant it. This command answers to
 *       whoever holds the server rather than to whoever holds a session.
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

const fs = require('fs');

/* ---------------------------------------------------------------------------
 * Which database, decided BEFORE server/db.js is loaded.
 *
 * This block has to run first, and that is the whole point of it. Requiring
 * server/db.js opens a database and SEEDS it — so running this tool from the
 * wrong directory used to create a brand new database there, reset a password
 * inside it, and report success. The live site kept the old password, nothing
 * said anything was wrong, and the symptom was a 401 with the password you had
 * just set. `doctor` reported the mismatch, but only after db.js had already
 * been loaded, so `doctor` itself left a stray database behind.
 *
 * The rule now:
 *   · PREP_DB set explicitly  -> honoured, never second-guessed.
 *   · one server running on a different database -> use THAT one, and say so.
 *   · several, disagreeing    -> refuse, and list them.
 * ------------------------------------------------------------------------- */
if (!process.env.PREP_DB) {
  const live = liveServers();
  const open = [...new Set(live.flatMap(p => p.dbFiles))];
  if (open.length === 1) {
    const path_ = require('path');
    const wouldUse = path_.join(process.cwd(), 'data', 'prep.sqlite');
    if (open[0] !== wouldUse) {
      console.log('Using the database the running server has open:');
      console.log('  ' + open[0]);
      console.log('  (this command would otherwise have used ' + wouldUse + ',');
      console.log('   created it, and changed a password nobody is signing in against)\n');
      process.env.PREP_DB = open[0];
    }
  } else if (open.length > 1) {
    console.error('More than one server is running here, on different databases:');
    open.forEach(f => console.error('  ' + f));
    console.error('\nPick one deliberately:  PREP_DB=<file> node scripts/accounts.js ' +
      (process.argv[2] || 'doctor'));
    process.exit(1);
  }
}

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

async function listAccounts() {
  const admins = await q.all('SELECT username, name, role, active, created_at, last_login_at FROM admins ORDER BY id');
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

  const s = await q.get("SELECT username, email, verified, status, pass_hash FROM users WHERE username='student'");
  console.log('\nDemo student account:');
  if (!s) {
    console.log('  · No "student" account in the database.');
  } else {
    console.log('  · ' + s.username + ' (' + s.email + ')' +
      '  ' + (s.verified ? 'verified' : 'NOT verified') +
      ', status ' + s.status +
      ', ' + (s.pass_hash ? 'has a password' : 'NO password set'));
  }

  const lockedCount = await q.val("SELECT COUNT(*) c FROM users WHERE status='locked'");
  console.log('\nStudents currently locked: ' + lockedCount);
  console.log('\nThe database stores only hashes, so no password can be read back.');
  console.log('Locked out? Run:  node scripts/accounts.js reset-admin');
}

async function resetAdmin() {
  /* No default. This file used to carry one, which in a repository anybody can
     read is a published administrator login for every install whose operator
     never changed it. Given nothing, one is generated and printed once. */
  const newPassword = positional[0] || process.env.ADMIN_PASSWORD || A.generatedPassword();
  if (newPassword.length < 10) {
    console.error('The password must be at least 10 characters.');
    process.exit(1);
  }

  const wantedUser = optValue('user');
  const admins = await q.all('SELECT id, username FROM admins ORDER BY id');
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

  await q.run('UPDATE admins SET pass_hash=?, active=1 WHERE id=?', A.hashPassword(newPassword), chosen.id);
  A.dropSessions ? A.dropSessions(chosen.id) : await q.run('DELETE FROM sessions WHERE admin_id=?', chosen.id);
  await q.run('INSERT INTO audit (admin_id,admin_name,action,target,meta_json,ip,at) VALUES (?,?,?,?,?,?,?)',
    null, 'cli', 'admin.password.reset', 'admins/' + chosen.username, '{"source":"scripts/accounts.js"}', null, nowISO());

  console.log('Administrator password reset.');
  console.log('  Username : ' + chosen.username);
  console.log('  Password : ' + newPassword);
  console.log('\nEvery previous session for this account has been revoked.');
  console.log('Restart the server, sign in at /admin/ and change the password under Administration.');
}

/**
 * Set an administrator's level, and switch the account on.
 *
 * Deliberately blunt: it does not ask who is running it, because the answer is
 * "somebody with a shell on the server", and that is already more authority
 * than any level in the product. What it does do is refuse to leave the
 * platform with no owner, the same invariant the API holds — a repair tool that
 * can produce the state it exists to repair is not a repair tool.
 */
async function setLevel() {
  const roles = require('../server/roles.js');
  const username = positional[0];
  const role = positional[1];

  if (!username || !role) {
    console.error('Usage: node scripts/accounts.js set-level <username> <' + roles.ROLE_NAMES.join('|') + '>');
    process.exit(1);
  }
  if (!roles.isRole(role)) {
    console.error('Unknown level "' + role + '". Use one of: ' + roles.ROLE_NAMES.join(', '));
    process.exit(1);
  }
  const admin = await q.get('SELECT id, username, role, active FROM admins WHERE username=?', username);
  if (!admin) {
    const all = await q.all('SELECT username FROM admins ORDER BY id');
    console.error('No administrator named "' + username + '". Present: ' + all.map(a => a.username).join(', '));
    process.exit(1);
  }

  await q.run('UPDATE admins SET role=?, active=1 WHERE id=?', role, admin.id);

  /* The same post-condition the API enforces. Demoting the only owner from here
     would leave nobody able to grant the level back through the product. */
  const owners = await q.val("SELECT COUNT(*) c FROM admins WHERE role='owner' AND active=1");
  if (!owners) {
    await q.run('UPDATE admins SET role=?, active=? WHERE id=?', admin.role, admin.active, admin.id);
    console.error('Refused: that would leave no active administrator at the top level.');
    console.error('Promote somebody else to owner first, then run this again.');
    process.exit(1);
  }

  await q.run('DELETE FROM sessions WHERE admin_id=?', admin.id);
  await q.run('INSERT INTO audit (admin_id,admin_name,action,target,meta_json,ip,at) VALUES (?,?,?,?,?,?,?)',
    null, 'cli', 'admin.set_level', 'admins/' + admin.username,
    JSON.stringify({ source: 'scripts/accounts.js', from: admin.role, to: role }), null, nowISO());

  console.log('@' + admin.username + ' is now ' + roles.roleOf(role).label.en
    + ' (' + role + ')' + (admin.active ? '' : ', and the account was switched back on') + '.');
  console.log('Any session it had has been revoked; it signs in again at /admin/.');
}

/**
 * Set the demo student's password.
 *
 * Takes it as an argument, or from DEMO_STUDENT_PASSWORD. There is no default
 * any more: this file used to carry the password as a constant, which — in a
 * repository anybody can read — is a published login rather than a default.
 */
async function resetStudent() {
  const newPassword = positional[0] || process.env.DEMO_STUDENT_PASSWORD || '';
  if (newPassword.length < 10) {
    console.error('Give the demo student a password of at least 10 characters:');
    console.error('  node scripts/accounts.js reset-student <new-password>');
    console.error('…or set DEMO_STUDENT_PASSWORD. There is no built-in default: one written');
    console.error('into this file would be a login published to everyone who can read it.');
    process.exit(1);
  }
  const u = await q.get('SELECT id FROM users WHERE username=?', A.DEMO_STUDENT_USER);
  if (!u) {
    console.error('No "' + A.DEMO_STUDENT_USER + '" account found. This database may never have been seeded.');
    process.exit(1);
  }
  await q.run("UPDATE users SET pass_hash=?, verified=1, status='active' WHERE id=?",
    A.hashPassword(newPassword), u.id);
  await q.run('DELETE FROM user_sessions WHERE user_id=?', u.id);
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
async function unlockAll() {
  const disabled = await q.val("SELECT COUNT(*) c FROM users WHERE status='locked'");
  await q.run("UPDATE users SET status='active' WHERE status='locked'");
  const throttled = await A.clearAllLocks();
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

async function adminByName(name) {
  const admins = await q.all('SELECT * FROM admins ORDER BY id');
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

async function totpStatus() {
  for (const a of await q.all('SELECT * FROM admins ORDER BY id')) {
    const left = await A.recoveryCodesLeft(a.id);
    console.log('  · ' + a.username.padEnd(16) +
      (A.totpEnabled(a)
        ? 'two-factor ON since ' + a.totp_enabled_at.slice(0, 16).replace('T', ' ') + '  ·  ' + left + ' recovery code(s) left'
        : 'two-factor off'));
  }
}

async function totpEnable() {
  const admin = await adminByName(optValue('user'));
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

  const codes = await A.issueRecoveryCodes(admin.id);
  await q.run('UPDATE admins SET totp_secret=?, totp_enabled_at=?, totp_last_counter=NULL WHERE id=?',
    useSecret, nowISO(), admin.id);
  await q.run('DELETE FROM sessions WHERE admin_id=?', admin.id);

  console.log('Two-factor is ON for ' + admin.username + '.');
  console.log('Every existing session for this account has been signed out.\n');
  console.log('RECOVERY CODES — write these down now. They are shown once and stored only as hashes,');
  console.log('so nobody, including this tool, can print them again. Each one works once.\n');
  codes.forEach(c => console.log('    ' + c));
  console.log('\nWithout them, losing the phone means losing the admin area.');
}

async function totpDisable() {
  const admin = await adminByName(optValue('user'));
  if (!A.totpEnabled(admin)) {
    console.log('Two-factor is already off for ' + admin.username + '.');
    return;
  }
  await q.run('UPDATE admins SET totp_secret=NULL, totp_enabled_at=NULL, totp_last_counter=NULL WHERE id=?', admin.id);
  await q.run('DELETE FROM admin_recovery_codes WHERE admin_id=?', admin.id);
  await q.run('INSERT INTO audit (admin_id,admin_name,action,target,meta_json,ip,at) VALUES (?,?,?,?,?,?,?)',
    null, 'cli', 'admin.totp.disabled', 'admins/' + admin.username, '{"source":"scripts/accounts.js"}', null, nowISO());
  console.log('Two-factor is OFF for ' + admin.username + ', and its recovery codes are gone.');
  console.log('This is the way back in when the phone is lost and the recovery codes are spent —');
  console.log('which is why it needs the database, not a browser.');
}

/**
 * Why can nobody sign in?
 *
 * Written after an afternoon spent on exactly one cause: the password was
 * reset against a DIFFERENT database from the one the running server had
 * open. Nothing reports that. `list` prints the path it is using, but a path
 * on its own looks right — you have to compare it with the one the live
 * process holds, and to do that you have to know to look in /proc.
 *
 * So this command does the comparison, and then checks the two settings that
 * break a sign-in *after* the password is correct, both of which fail
 * silently:
 *
 *   · Secure cookies over plain HTTP. In production the session cookie sets
 *     Secure, so a browser on http:// never sends it back — the symptom is
 *     signing in successfully and landing back on the sign-in page.
 *   · TRUST_PROXY behind a load balancer. Wrong, and req.ip is the balancer
 *     for everybody, so five wrong passwords from one person lock out all of
 *     them at once.
 */
async function doctor() {
  const running = liveServers();

  console.log('This command is using:  ' + DB_FILE);
  if (running.length > 1) {
    console.log('\n! ' + running.length + ' servers are running on this machine. Two processes on one');
    console.log('  database is survivable; two on two databases means half the sign-ins go to the');
    console.log('  wrong one, and which half depends on the load balancer.');
  }
  if (!running.length) {
    console.log('No `node server.js` process is running on this machine.');
    console.log('If the platform is answering anyway it is being served from somewhere else —');
    console.log('another host, or a container. Run this INSIDE that container.\n');
  } else {
    for (const p of running) {
      console.log('\nRunning server, pid ' + p.pid + ':');
      console.log('  working directory   ' + (p.cwd || 'unreadable — try sudo'));
      console.log('  PREP_DB             ' + (p.env.PREP_DB || '(unset, so <cwd>/data/prep.sqlite)'));
      console.log('  NODE_ENV            ' + (p.env.NODE_ENV || '(unset)'));
      console.log('  TRUST_PROXY         ' + (p.env.TRUST_PROXY || '(unset, so 0)'));
      if (p.dbFiles.length) {
        console.log('  database files open ' + p.dbFiles.join(', '));
        const match = p.dbFiles.some(f => f === DB_FILE);
        console.log(match
          ? '  ✓ same database this command is about to change'
          : '  ✗ DIFFERENT database. Resetting a password here would change the wrong file.\n' +
            '     Re-run from ' + (p.cwd || 'that process\'s directory') +
            ', or with PREP_DB=' + p.dbFiles[0]);
      } else {
        console.log('  database files open (unreadable — try sudo, or run inside the container)');
      }

      if ((p.env.NODE_ENV || '') === 'production') {
        console.log('  ! Cookies carry Secure in production, so a browser on http:// will not send');
        console.log('    them back. The symptom is a successful sign-in that bounces straight back');
        console.log('    to the sign-in page. Serve over HTTPS, or set FORCE_SECURE_COOKIE=0 knowingly.');
      }
      if (!p.env.TRUST_PROXY && (p.env.NODE_ENV || '') === 'production') {
        console.log('  ! TRUST_PROXY is unset. Behind a load balancer that makes req.ip the balancer');
        console.log('    for every visitor, so one person\'s five wrong passwords lock out everyone.');
      }
    }
    console.log('');
  }

  const admins = await q.all('SELECT id, username, active, totp_enabled_at FROM admins ORDER BY id');
  if (!admins.length) {
    console.log('This database has NO administrator. The first boot creates one and prints its');
    console.log('generated password ONCE to the log — look for "Seed administrator account created"');
    console.log('in the boot output. Set ADMIN_PASSWORD before the first run to choose it instead.');
  }
  for (const a of admins) {
    const bits = [a.active ? 'active' : 'DISABLED'];
    if (a.totp_enabled_at) bits.push('two-factor ON — a password alone will not get in');
    console.log('Administrator: ' + a.username + '  [' + bits.join(', ') + ']');
  }

  const locks = await q.all(
    'SELECT bucket, fails, locked_until FROM throttle_locks WHERE locked_until IS NOT NULL AND locked_until > ?',
    nowISO());
  console.log(locks.length
    ? '\n' + locks.length + ' active lockout(s): ' + locks.map(l => l.bucket).join(', ') +
      '\n  Clear them with:  node scripts/accounts.js unlock'
    : '\nNo active lockouts.');
}

/** Every `node server.js` on this machine, with what /proc will tell us. */
function liveServers() {
  const out = [];
  let pids;
  try { pids = fs.readdirSync('/proc').filter(n => /^\d+$/.test(n)); }
  catch (e) { return out; }                       // not Linux; nothing to read

  for (const pid of pids) {
    let argv = [];
    try { argv = fs.readFileSync('/proc/' + pid + '/cmdline', 'utf8').split('\0').filter(Boolean); }
    catch (e) { continue; }
    /* argv[0] has to BE node. Matching the whole command line instead catches
       the shell that launched it — its -c argument contains "server.js" too —
       and reports a wrapper as a second server. */
    if (!argv.length || !/^node(js)?$/.test(argv[0].split('/').pop())) continue;
    if (!argv.slice(1).some(a => /(^|\/)server\.js$/.test(a))) continue;

    const env = {};
    try {
      for (const pair of fs.readFileSync('/proc/' + pid + '/environ', 'utf8').split('\0')) {
        const i = pair.indexOf('=');
        if (i > 0) env[pair.slice(0, i)] = pair.slice(i + 1);
      }
    } catch (e) { /* another user's process; needs sudo */ }

    let cwd = '';
    try { cwd = fs.readlinkSync('/proc/' + pid + '/cwd'); } catch (e) { /* same */ }

    /* The open file descriptors are the part that cannot be argued with: this
       is the file the process is really writing to, whatever the configuration
       appears to say. */
    const dbFiles = [];
    try {
      for (const fd of fs.readdirSync('/proc/' + pid + '/fd')) {
        let target = '';
        try { target = fs.readlinkSync('/proc/' + pid + '/fd/' + fd); } catch (e) { continue; }
        if (/\.sqlite$/.test(target) && !dbFiles.includes(target)) dbFiles.push(target);
      }
    } catch (e) { /* same */ }

    out.push({ pid, cwd, env, dbFiles });
  }
  return out;
}

const COMMANDS = {
  'doctor': doctor,
  'list': listAccounts,
  'reset-admin': resetAdmin,
  'set-level': setLevel,
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
/* The commands talk to the database, which answers with promises now, so the
   entry point has to wait for one — and turn a rejection into a non-zero exit
   rather than an unhandled-rejection warning after "done". */
COMMANDS[verb]().catch(e => {
  console.error(String((e && e.message) || e));
  process.exit(1);
});
