/**
 * scripts/setup-mail.sh — the script that edits /etc/vpet-prep.env on the server.
 *
 * Run standalone, no server needed: node scripts/test-setup-mail.mjs
 *
 * What is actually at stake here is not the mail settings; it is the file they
 * go into. That file is sourced by a shell, so one unquoted `<` makes it a
 * syntax error, and a syntax error stops the source at that line: every
 * variable below it is then unset, TOKEN_ENCRYPTION_KEY included — the one
 * secret the database backups deliberately do not carry. So the checks below
 * spend most of their effort on the things that must NOT happen: an unrelated
 * value moving, a duplicate line left behind, a refusal that still wrote, a
 * secret appearing in output. Each case runs the real script against a throwaway
 * file in a temporary directory; nothing here touches a real environment file.
 */
import { execFileSync, spawnSync } from 'node:child_process';
import { mkdtempSync, writeFileSync, readFileSync, statSync, readdirSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SCRIPT = path.join(ROOT, 'scripts/setup-mail.sh');

let pass = 0, fail = 0;
const ok = (c, name, detail) => {
  if (c) { pass++; console.log('✓ ' + name); return; }
  fail++;
  console.log('✗ ' + name + (detail === undefined ? '' : '  → ' + detail));
};
const head = t => console.log('\n\x1b[1m== ' + t + ' ==\x1b[0m');

/* 44 characters, the shape `openssl rand -base64 32` produces — the length the
   script checks for, because a truncated TOKEN_ENCRYPTION_KEY decrypts nothing
   and says nothing. */
const TOKEN = 'c2l4dGVlbmJ5dGVzc2l4dGVlbmJ5dGVzMzJieXRlcyE=';
const APPPW = 'abcdefghijklmnop';

const dir = mkdtempSync(path.join(tmpdir(), 'vpet-mail-'));
const envPath = (name = 'x.env') => path.join(dir, name);

/**
 * Run the script; never throws, so a non-zero exit can be asserted on.
 * spawnSync rather than execFileSync because the warnings this script exists to
 * give go to stderr, and execFileSync hands back stderr only when the command
 * FAILED — so every warning on a successful run would be invisible here.
 */
function run(args, { stdin = '' } = {}) {
  const r = spawnSync('bash', [SCRIPT, ...args], { input: stdin, encoding: 'utf8', timeout: 60000 });
  return { code: r.status === null ? -1 : r.status, out: String(r.stdout || ''), err: String(r.stderr || '') };
}

/** Source the file the way the server does, and report what a shell would see. */
function sourced(file) {
  const script =
    'set -a; . "$1" >/dev/null 2>&1; set +a; ' +
    'node -e \'process.stdout.write(JSON.stringify(process.env))\'';
  try {
    return JSON.parse(execFileSync('bash', ['-c', script, 'sh', file], { encoding: 'utf8' }));
  } catch { return {}; }
}

const parses = file => {
  try { execFileSync('bash', ['-n', file], { stdio: 'pipe' }); return true; } catch { return false; }
};
const countAssignments = (file, key) =>
  readFileSync(file, 'utf8').split('\n').filter(l => new RegExp('^\\s*(export\\s+)?' + key + '\\s*=').test(l)).length;

const seed = (file, body) => writeFileSync(file, body, { mode: 0o600 });
const NORMAL = `# VPET Prep\nNODE_ENV=production\nPORT=3000\nTOKEN_ENCRYPTION_KEY=${TOKEN}\nAWS_REGION=ap-southeast-1\n`;

const BASE = ['--user', 'vpetprep@gmail.com', '--base-url', 'https://d1tjeiogootdxv.cloudfront.net',
  '--password-stdin', '--yes'];

try {
  head('A file that already holds the server\'s secrets survives the edit');
  {
    const f = envPath('normal.env');
    seed(f, NORMAL);
    const r = run(['--env-file', f, ...BASE], { stdin: APPPW + '\n' });
    ok(r.code === 0, 'The script succeeds on a healthy file', r.err.trim());
    ok(parses(f), 'The file still parses as a shell script');

    const env = sourced(f);
    ok(env.TOKEN_ENCRYPTION_KEY === TOKEN, 'TOKEN_ENCRYPTION_KEY is byte-for-byte what it was');
    ok(env.NODE_ENV === 'production' && env.PORT === '3000' && env.AWS_REGION === 'ap-southeast-1',
      'And so is every other variable that was already there');
    ok(env.MAIL_DRIVER === 'smtp', 'MAIL_DRIVER is now smtp');
    ok(env.SMTP_HOST === 'smtp.gmail.com' && env.SMTP_PORT === '587', 'Host and port are Gmail\'s');
    ok(env.SMTP_USER === 'vpetprep@gmail.com', 'SMTP_USER is the account given');
    ok(env.SMTP_PASS === APPPW, 'SMTP_PASS reads back exactly as typed');
    ok(env.PUBLIC_BASE_URL === 'https://d1tjeiogootdxv.cloudfront.net',
      'PUBLIC_BASE_URL is set, so reset links do not point at the origin over plain HTTP');

    // The trap this whole script exists for: `<` is a redirection to the shell.
    ok(env.MAIL_FROM === 'VPET Prep <vpetprep@gmail.com>',
      'MAIL_FROM keeps its display name AND its angle brackets, quoted so the shell reads them back',
      env.MAIL_FROM);
    ok(/^MAIL_FROM='VPET Prep <vpetprep@gmail\.com>'$/m.test(readFileSync(f, 'utf8')),
      'The line on disk is quoted, not bare');

    ok(statSync(f).mode & 0o777 ? (statSync(f).mode & 0o777) === 0o600 : false,
      'The file is still chmod 600', (statSync(f).mode & 0o777).toString(8));
    const backups = readdirSync(dir).filter(n => n.startsWith('normal.env.bak-'));
    ok(backups.length === 1, 'The previous file was kept beside it', backups.join(','));
    ok(backups.length === 1 && readFileSync(path.join(dir, backups[0]), 'utf8') === NORMAL,
      'And the backup is the file exactly as it was');
    ok(backups.length === 1 && (statSync(path.join(dir, backups[0])).mode & 0o777) === 0o600,
      'The backup is 600 too — a world-readable copy of the secrets would be the same leak');
    ok(readdirSync(dir).every(n => !/\.tmp\.|\.new\./.test(n)), 'No temporary file is left behind');
  }

  head('Running it twice does the same thing as running it once');
  {
    const f = envPath('twice.env');
    seed(f, NORMAL);
    run(['--env-file', f, ...BASE], { stdin: APPPW + '\n' });
    const first = readFileSync(f, 'utf8');
    const r = run(['--env-file', f, '--password-stdin', '--yes'], { stdin: APPPW + '\n' });
    ok(r.code === 0, 'The second run succeeds, taking the address and URL from the file');
    ok(readFileSync(f, 'utf8') === first, 'And leaves the file identical');
    for (const k of ['MAIL_DRIVER', 'SMTP_HOST', 'SMTP_USER', 'SMTP_PASS', 'MAIL_FROM', 'PUBLIC_BASE_URL']) {
      ok(countAssignments(f, k) === 1, `Exactly one ${k}= line`, String(countAssignments(f, k)));
    }
  }

  head('A duplicate line already in the file is not left to win');
  {
    // Last assignment wins when a file is sourced, so replacing only the first
    // would look like a successful edit and change nothing.
    const f = envPath('dupe.env');
    seed(f, NORMAL + 'MAIL_DRIVER=console\nSMTP_USER=old@example.com\nMAIL_DRIVER=console\n');
    const r = run(['--env-file', f, ...BASE], { stdin: APPPW + '\n' });
    ok(r.code === 0, 'The script succeeds', r.err.trim());
    ok(countAssignments(f, 'MAIL_DRIVER') === 1, 'Both MAIL_DRIVER lines became one',
      String(countAssignments(f, 'MAIL_DRIVER')));
    ok(sourced(f).MAIL_DRIVER === 'smtp', 'And what the shell reads is smtp');
    ok(sourced(f).SMTP_USER === 'vpetprep@gmail.com', 'The old address was replaced, not appended after');
  }

  head('A file somebody has already broken by hand gets repaired');
  {
    // The exact damage the documentation warns about: an unquoted MAIL_FROM,
    // with the token below it, so the token is currently unset.
    const f = envPath('broken.env');
    seed(f, `NODE_ENV=production\nMAIL_FROM=VPET Prep <a@gmail.com>\nTOKEN_ENCRYPTION_KEY=${TOKEN}\n`);
    ok(!parses(f), 'The seeded file does not parse (the premise of this case)');
    ok(sourced(f).TOKEN_ENCRYPTION_KEY === undefined,
      'And a shell sourcing it gets no TOKEN_ENCRYPTION_KEY at all — this is the outage');

    const r = run(['--env-file', f, ...BASE], { stdin: APPPW + '\n' });
    ok(r.code === 0, 'The script still succeeds', r.err.trim());
    ok(parses(f), 'The file parses again');
    ok(sourced(f).TOKEN_ENCRYPTION_KEY === TOKEN, 'And the token below the break is readable again');
    ok(/sống lại/.test(r.out + r.err), 'It says which variables came back rather than doing it silently');
  }

  head('It refuses rather than half-writing');
  {
    const f = envPath('refuse.env');
    seed(f, NORMAL);
    const before = readFileSync(f, 'utf8');

    let r = run(['--env-file', f, ...BASE], { stdin: 'abc\n' });
    ok(r.code !== 0, 'A password that is not 16 characters is refused');
    ok(/535|App Password/.test(r.err + r.out), 'Saying what a Google App Password looks like');
    ok(readFileSync(f, 'utf8') === before, 'And the file was not touched');

    r = run(['--env-file', f, '--password=' + APPPW, '--yes']);
    ok(r.code !== 0, 'A password passed as a command-line argument is refused');
    ok(/ps/.test(r.err + r.out), 'Because arguments are readable by every user on the machine');
    ok(readFileSync(f, 'utf8') === before, 'Still untouched');

    r = run(['--env-file', f, '--user', 'not-an-address', '--base-url', 'https://x.example',
      '--password-stdin', '--yes'], { stdin: APPPW + '\n' });
    ok(r.code !== 0, 'An SMTP_USER that is not an address is refused');
    ok(readFileSync(f, 'utf8') === before, 'Still untouched');

    r = run(['--env-file', f, '--user', 'vpetprep@gmail.com', '--base-url', 'd1tjeiogootdxv.cloudfront.net',
      '--password-stdin', '--yes'], { stdin: APPPW + '\n' });
    ok(r.code !== 0, 'A PUBLIC_BASE_URL without a scheme is refused');

    r = run(['--env-file', path.join(dir, 'no-such-dir', 'x.env'), ...BASE], { stdin: APPPW + '\n' });
    ok(r.code !== 0, 'A path whose directory does not exist is refused');
  }

  head('Creating the file is treated as the unusual event it is');
  {
    const f = envPath('fresh.env');
    const r = run(['--env-file', f, ...BASE], { stdin: APPPW + '\n' });
    ok(r.code === 0, 'With --yes it is created', r.err.trim());
    ok(/BẤT THƯỜNG|bất thường/.test(r.err + r.out),
      'But it says so first — on a live server a missing env file means the secrets are gone');
    ok((statSync(f).mode & 0o777) === 0o600, 'Created at 600, not at whatever the umask says');
    ok(readdirSync(dir).filter(n => n.startsWith('fresh.env.bak-')).length === 0,
      'Nothing to back up, so no backup is made');

    // An empty file left behind would be believed by the next run, which would
    // then stop saying the secrets are missing.
    const g = envPath('aborted.env');
    const r2 = run(['--env-file', g, ...BASE], { stdin: 'too-short\n' });
    ok(r2.code !== 0, 'A refusal on a file that did not exist still fails');
    ok(!readdirSync(dir).includes('aborted.env'), 'And leaves no empty file behind pretending to be the real one');
  }

  head('Nothing prints the secret');
  {
    const f = envPath('quiet.env');
    seed(f, NORMAL);
    const w = run(['--env-file', f, ...BASE], { stdin: 'abcd efgh ijkl mnop\n' });
    const said = w.out + w.err;
    ok(!said.includes(APPPW), 'The write says nothing that contains the App Password');
    ok(!said.includes(TOKEN), 'Nor the encryption key');
    ok(/16 ký tự/.test(said), 'It reports the length instead');
    // Google shows the password as four groups of four; the spaces are display.
    ok(sourced(f).SMTP_PASS === APPPW, 'A password pasted with Google\'s spaces is stored without them');

    const c = run(['--env-file', f, '--check']);
    const shown = c.out + c.err;
    ok(c.code === 0, '--check exits clean');
    ok(!shown.includes(APPPW) && !shown.includes(TOKEN), 'And prints neither secret');
    ok(/SMTP_PASS\s+= 16 ký tự/.test(shown), 'Only how long they are');
    ok(/TOKEN_ENCRYPTION_KEY\s+= 44 ký tự/.test(shown), 'Which is the check worth doing on the token');
  }

  head('--check reads, and warns about the two silent traps');
  {
    const f = envPath('warn.env');
    seed(f, NORMAL);
    run(['--env-file', f, '--user', 'vpetprep@gmail.com', '--from', 'VPET Prep <no-reply@vpetprep.vn>',
      '--base-url', 'https://d1tjeiogootdxv.cloudfront.net', '--password-stdin', '--yes'],
    { stdin: APPPW + '\n' });
    const c = run(['--env-file', f, '--check']);
    ok(/MAIL_FROM gửi từ no-reply@vpetprep\.vn nhưng đăng nhập bằng vpetprep@gmail\.com/.test(c.out + c.err),
      'It notices MAIL_FROM sending as an address the account cannot send as');
    ok(/Gmail/.test(c.out + c.err), 'And names Gmail as the one that will refuse it');

    const g = envPath('nourl.env');
    seed(g, NORMAL + "MAIL_DRIVER='smtp'\nSMTP_USER='vpetprep@gmail.com'\n");
    const c2 = run(['--env-file', g, '--check']);
    ok(/PUBLIC_BASE_URL chưa đặt/.test(c2.out + c2.err),
      'A missing PUBLIC_BASE_URL is called out, because the link in the mail is the damage');
    ok(!/^\s*✗/m.test(c2.out), '--check on a parseable file reports no syntax error');

    const h = envPath('badsyntax.env');
    seed(h, 'NODE_ENV=production\nMAIL_FROM=VPET Prep <a@b.com>\n');
    const c3 = run(['--env-file', h, '--check']);
    ok(/cú pháp SAI/.test(c3.out + c3.err), 'A broken file is reported as broken');
    ok(/syntax error/.test(c3.out + c3.err), 'With the shell\'s own message and the line number');
  }

  head('It can explain itself');
  {
    const h = run(['--help']);
    ok(h.code === 0 && /--check/.test(h.out) && /--test/.test(h.out),
      '--help prints the manual, which is the header comment, so the two cannot drift apart');
    ok(!/^set -uo/m.test(h.out), 'And stops where the code starts');
    const u = run(['--nonsense']);
    ok(u.code !== 0 && /Không hiểu tham số/.test(u.err), 'An argument it does not know is refused, not ignored');

    // What actually happened on the first real run: the leading `--` did not
    // survive the paste, so bash handed over `user` and the script only said
    // it did not understand it.
    for (const bare of ['user', 'restart', 'check']) {
      const b = run([bare]);
      ok(b.code !== 0 && new RegExp('ý bạn là `--' + bare + '`').test(b.err),
        `A bare \`${bare}\` is answered with "did you mean --${bare}"`, b.err.trim());
    }
  }

  head('--test says the useful thing when there is nothing to test yet');
  {
    const f = envPath('untouched.env');
    seed(f, NORMAL);   // MAIL_DRIVER is not set at all, so the driver is console
    const r = run(['--env-file', f, '--test', 'somebody@example.com']);
    ok(r.code === 3, 'It stops instead of pretending to send', String(r.code));
    ok(/MAIL_DRIVER=console/.test(r.err + r.out), 'Naming the reason');
    ok(!/535|EAUTH/.test(r.err + r.out),
      'And without the SMTP error hints, which would be noise: nothing was attempted');
    ok(/--user .* --base-url .* --restart/.test(r.err + r.out),
      'It prints the write command to run first, on one line');
  }

  head('The reminder that the restart is not optional');
  {
    const f = envPath('restart.env');
    seed(f, NORMAL);
    const r = run(['--env-file', f, ...BASE], { stdin: APPPW + '\n' });
    ok(/--update-env GỘP môi trường/.test(r.out),
      'Writing the file ends by saying pm2 merges the environment and does not re-read the file');
    ok(/set -a; \. .*set \+a/.test(r.out), 'And prints the source-then-restart line to copy');
  }
} catch (e) {
  fail++;
  console.log('✗ Failed while running: ' + (e && e.stack ? e.stack : e));
} finally {
  rmSync(dir, { recursive: true, force: true });
}

console.log('\n' + (fail ? '\x1b[31m' : '\x1b[32m') + pass + '/' + (pass + fail) + ' checks passed\x1b[0m');
process.exit(fail ? 1 : 0);
