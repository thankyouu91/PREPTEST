#!/usr/bin/env node
/**
 * Running on more than one process. No server needed — this one boots its own.
 *
 * Block 7. Everything here exists because a cluster fails in ways a single
 * process cannot, and none of them announce themselves:
 *
 *   · a default that quietly quadruples a running box
 *   · four sweepers marking the same paper and billing four times
 *   · workers booting against a database nobody has finished seeding
 *   · a supervisor that restarts a crashing worker for ever, burying the reason
 *   · a fork that loses the secrets the primary just fetched
 *
 * The first half is arithmetic on `workerCount()` and costs nothing. The second
 * half boots a real three-worker cluster on a scratch database and reads its
 * log, because the interesting failures are all in the wiring, and wiring is
 * not something a unit test can see.
 */
import { createRequire } from 'node:module';
import { spawn } from 'node:child_process';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { createServer } from 'node:net';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
const ROOT = fileURLToPath(new URL('..', import.meta.url));

let pass = 0, fail = 0;
const ok = (c, name, detail) => {
  if (c) { pass++; console.log('✓ ' + name); return; }
  fail++; console.log('✗ ' + name + (detail === undefined ? '' : '  → ' + detail));
};
const head = t => console.log('\n\x1b[1m== ' + t + ' ==\x1b[0m');

/* workerCount() reads the environment at call time, so each case sets it,
   re-reads the module and puts the variable back. */
const C = require('../server/cluster.js');
function count(value) {
  const had = Object.prototype.hasOwnProperty.call(process.env, 'WEB_CONCURRENCY');
  const old = process.env.WEB_CONCURRENCY;
  if (value === undefined) delete process.env.WEB_CONCURRENCY;
  else process.env.WEB_CONCURRENCY = value;
  try { return C.workerCount(); } finally {
    if (had) process.env.WEB_CONCURRENCY = old; else delete process.env.WEB_CONCURRENCY;
  }
}

head('How many workers');

/* The one that matters most. A box already runs this platform; installing a
   version that forks four processes because it found four cores is a change
   nobody asked for, made to a machine nobody measured. Unset means unchanged. */
ok(count(undefined) === 1, 'unset means one process, i.e. no change to anything', count(undefined));
ok(count('') === 1, 'empty means one process', count(''));
ok(count('   ') === 1, 'whitespace means one process', count('   '));

ok(count('4') === 4, 'a number is taken at its word', count('4'));
ok(count('1') === 1, 'one is one', count('1'));
ok(count('16') === 16, 'sixteen is allowed', count('16'));
ok(count('99') === 16, 'a big number is capped at 16, not obeyed', count('99'));

/* A typo must fall back to the behaviour that already works, never to a guess. */
ok(count('two') === 1, 'a word that is not "auto" means one process', count('two'));
ok(count('0') === 1, 'zero means one process, not zero servers', count('0'));
ok(count('-3') === 1, 'a negative number means one process', count('-3'));

const auto = count('auto');
ok(auto >= 1 && auto <= 8, 'auto sizes to the box and is capped at 8', auto);
ok(count('AUTO') === auto, 'auto is case-insensitive, because env vars are shouted', count('AUTO'));

head('Forking is a decision, not a side effect');

/* start() must be inert in the process that has not asked for a cluster.
   Everything that runs the platform today — the gate, the screenshot run,
   loadprobe, a developer with a breakpoint — goes down this path. */
const wasSet = process.env.WEB_CONCURRENCY;
delete process.env.WEB_CONCURRENCY;
ok(C.start({ log: () => {} }) === false, 'with no WEB_CONCURRENCY, start() forks nothing and says so');
process.env.WEB_CONCURRENCY = '1';
ok(C.start({ log: () => {} }) === false, 'WEB_CONCURRENCY=1 is one process, not a supervisor plus one worker');
if (wasSet === undefined) delete process.env.WEB_CONCURRENCY; else process.env.WEB_CONCURRENCY = wasSet;

ok(C.isPrimary() === true, 'a process nobody forked is the primary');
ok(C.CRASH_LIMIT >= 2 && C.CRASH_WINDOW_MS >= 1000, 'the crash loop has a limit and a window',
  C.CRASH_LIMIT + ' in ' + C.CRASH_WINDOW_MS + 'ms');

/* ------------------------------------------------------------------ *
 * A real cluster.
 * ------------------------------------------------------------------ */

head('Three workers, one database, one sweeper');

/* Before the big one, the small assumption the big one rests on.
 *
 * server.js calls secrets.load() in the primary and nowhere else, which is only
 * correct if a worker inherits the environment as the primary left it — not as
 * it was when the primary itself started. That is documented Node behaviour and
 * it is also load-bearing enough that "documented" is not good enough: if it
 * ever changed, every worker would come up without the credentials and the
 * failure would look like an expired secret, not like a fork. Ten lines and a
 * child process settle it. */
async function forkCarriesEnv() {
  const fixture = join(dir, 'fork-env.cjs');
  writeFileSync(fixture, [
    "const cluster = require('node:cluster');",
    'if (cluster.isPrimary) {',
    /* Set AFTER boot, exactly as secrets.load() does. */
    "  process.env.SET_AFTER_BOOT = 'yes';",
    '  cluster.fork();',
    '} else {',
    "  console.log('worker sees: ' + String(process.env.SET_AFTER_BOOT));",
    '  process.exit(0);',
    '}',
  ].join('\n'));
  return await new Promise(resolve => {
    let seen = '';
    const p = spawn(process.execPath, [fixture], { stdio: ['ignore', 'pipe', 'inherit'] });
    p.stdout.on('data', d => { seen += d; });
    p.on('exit', () => resolve(seen.trim()));
  });
}

/* Ask the kernel for a free one rather than picking a number and hoping. This
   suite runs inside scripts/verify.sh, which already has a server on 3000, and
   a hard-coded port is how a test starts failing on somebody else's machine for
   a reason that has nothing to do with what it tests. */
function freePort() {
  return new Promise((resolve, reject) => {
    const s = createServer();
    s.on('error', reject);
    s.listen(0, '127.0.0.1', () => {
      const { port } = s.address();
      s.close(() => resolve(port));
    });
  });
}

const dir = mkdtempSync(join(tmpdir(), 'vpet-cluster-'));
const DB = join(dir, 'cluster.sqlite');
const PORT = await freePort();
const BASE = 'http://127.0.0.1:' + PORT;

ok((await forkCarriesEnv()) === 'worker sees: yes',
  'a worker inherits the environment as the primary left it, so secrets.load() runs once');

let out = '';
const child = spawn(process.execPath, ['server.js'], {
  cwd: ROOT,
  env: {
    ...process.env,
    WEB_CONCURRENCY: '3',
    PORT: String(PORT),
    PREP_DB: DB,
    NODE_ENV: 'test',
  },
  stdio: ['ignore', 'pipe', 'pipe'],
});
child.stdout.on('data', d => { out += d; });
child.stderr.on('data', d => { out += d; });

const sleep = ms => new Promise(r => setTimeout(r, ms));

async function waitForListening(ms) {
  const until = Date.now() + ms;
  while (Date.now() < until) {
    try {
      const r = await fetch(BASE + '/healthz');
      if (r.ok) return true;
    } catch (e) { /* not up yet */ }
    await sleep(150);
  }
  return false;
}

let up = false;
try {
  up = await waitForListening(30_000);
  ok(up, 'a three-worker cluster comes up and answers /healthz', out.slice(-600));

  if (up) {
    /* Enough requests that a round-robin dispatcher has to touch every worker.
       Sequential on purpose: parallel requests could be served by one worker
       reading three sockets, and that would prove nothing. */
    for (let i = 0; i < 45; i++) {
      const r = await fetch(BASE + '/healthz');
      if (!r.ok) { ok(false, 'every request during the spread check succeeded', 'status ' + r.status); break; }
      await r.json();
    }
    await sleep(300);

    const serving = [...new Set((out.match(/\[cluster\] worker (\d+) serving/g) || []))];
    const listening = [...new Set((out.match(/\[cluster\] worker (\d+) listening/g) || []))];

    ok(listening.length === 3, 'all three workers listen', listening.length + ': ' + listening.join(', '));
    ok(serving.length >= 2, 'the work is spread across workers, not pinned to one',
      serving.length + ' of 3 served: ' + serving.join(', '));

    /* The expensive mistake, and the reason this whole file exists. Four of
       these lines is four sweepers finding the same unmarked paper, marking it
       four times, and sending four bills. */
    const jobs = out.match(/\[jobs\] background jobs armed in pid (\d+)/g) || [];
    ok(jobs.length === 1, 'the background jobs arm in ONE process, not once per worker',
      jobs.length + ': ' + jobs.join(' | '));

    /* And in the supervisor, not in one of the workers — a worker can be
       replaced after a crash, and the sweeper would go with it. */
    const jobPid = (jobs[0] || '').match(/pid (\d+)/);
    const workerPids = (out.match(/\[cluster\] worker (\d+) listening/g) || [])
      .map(s => s.match(/(\d+)/)[1]);
    ok(jobPid && !workerPids.includes(jobPid[1]),
      'the jobs live in the supervisor, which nothing restarts out from under them',
      jobPid ? jobPid[1] + ' vs workers ' + workerPids.join(',') : 'no pid');

    /* The banner is the boot, and there is one boot. */
    const banners = (out.match(/VPET Prep chạy tại/g) || []).length;
    ok(banners === 1, 'the boot banner is printed once, not once per worker', banners);

    /* A worker serving real data proves it reached a database that somebody
       else migrated and seeded. It did not do that work itself. */
    const r = await fetch(BASE + '/api/catalog');
    ok(r.ok, 'a worker reads a database the primary prepared', 'status ' + r.status);
  }
} finally {
  child.kill('SIGTERM');
  /* SIGTERM must drain and exit 0. A supervisor that has to be SIGKILLed is a
     deploy that stalls, so the wait here is a real assertion. */
  const code = await Promise.race([
    new Promise(r => child.on('exit', c => r(c))),
    sleep(20_000).then(() => 'timeout'),
  ]);
  ok(code === 0, 'SIGTERM drains the workers and the supervisor leaves with 0', String(code));
  try { child.kill('SIGKILL'); } catch (e) { /* already gone */ }
  try { rmSync(dir, { recursive: true, force: true }); } catch (e) { /* tmp */ }
}

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
