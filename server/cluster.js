/**
 * Running the platform on more than one process.
 *
 * Block 7, and the second rung of the scaling ladder in `docs/KE-HOACH-XAY.md`
 * §4. The measurement that started it is blunt: on a four-core box the platform
 * pinned one core and left three idle, because Node runs one thread and this
 * server is one process. Everything below is about using the other three
 * without changing a single thing a learner sees.
 *
 * ## What forking is allowed to change, and what it is not
 *
 * Nothing about correctness. Four processes must behave exactly as one did, and
 * the two places that is NOT automatic are the ones this file is mostly about:
 *
 * **Work that must happen once must happen once.** Migrations, the seed, the
 * bundled audio upload. Four workers racing `ensureSeedAdmin()` on boot is four
 * writers on one table with nothing deciding who wins. So the PRIMARY does all
 * of it, alone, and only forks once it is finished. A worker never boots the
 * database; it inherits a database somebody else has already prepared.
 *
 * **Background jobs must run in one place.** The AI marking sweeper keeps its
 * queue in memory (`server/ai-marking-run.js`), so four copies of it would each
 * find the same unmarked paper and each mark it: four passes, four sets of
 * scores, four bills from the model provider. The primary runs the jobs and the
 * workers do not. That is one line of code and it is the whole difference
 * between a cluster that works and one that quietly charges four times.
 *
 * ## What was already done for this
 *
 * The sign-in lockout and the rate-limit counters moved out of process memory
 * and into the database months ago, precisely so this rung would be possible:
 * four processes each allowing five wrong passwords is twenty, which would have
 * silently removed the password-guessing defence at the busiest moment. The
 * sessions were already in the database. `busy_timeout` was set in block 1.
 *
 * ## The trap, restated because it has not gone away
 *
 * `node:sqlite` is SYNCHRONOUS. A worker waiting on the write lock blocks its
 * WHOLE event loop for the wait, serving nobody. So more processes buy read
 * throughput and they do not buy write throughput; if write contention shows up
 * in the measurements, the answer is rung 3 (Postgres), not more workers. The
 * loadprobe row in `docs/BLOCKS.md` is where that gets decided, on numbers.
 */
'use strict';

const cluster = require('node:cluster');
const os = require('node:os');
const lifecycle = require('./lifecycle');

/**
 * How many workers.
 *
 * **Unset means one, which means no change to anything.** That default is
 * deliberate and it is the opposite of what this file's first draft did. A box
 * is already running this platform under PM2; silently turning one process into
 * four multiplies its memory, multiplies its SQLite handles and changes the
 * shape of its logs, and it does all of that on a machine nobody has measured.
 * The rule this project has followed all the way through is that a change gets
 * turned on by the number that justifies it, not by a default that arrived with
 * the code. So the switch is explicit:
 *
 *     WEB_CONCURRENCY unset   1 process. Exactly today's behaviour.
 *     WEB_CONCURRENCY=auto    one per core, capped at 8.
 *     WEB_CONCURRENCY=4       four, whatever the box has. Capped at 16.
 *
 * The cap on `auto` is not timidity: past the core count the processes take
 * turns anyway, and each one costs a database handle and its own copy of every
 * cache. The cap on the explicit number is higher because someone who typed a
 * number has a reason, and 16 is where a mistyped one stops being survivable.
 *
 * Anything unparseable is one process. A typo in an environment variable must
 * fail towards the behaviour that already works.
 */
function workerCount() {
  const raw = String(process.env.WEB_CONCURRENCY || '').trim().toLowerCase();
  if (!raw) return 1;
  if (raw === 'auto') {
    const cores = typeof os.availableParallelism === 'function'
      ? os.availableParallelism() : (os.cpus() || []).length || 1;
    return Math.max(1, Math.min(cores, 8));
  }
  const asked = parseInt(raw, 10);
  if (!Number.isFinite(asked) || asked < 1) return 1;
  return Math.min(asked, 16);
}

/** Is this process the one that should run migrations, seeds and cron work? */
function isPrimary() {
  return !cluster.isWorker;
}

/**
 * A worker that dies is replaced, but a worker that dies INSTANTLY and
 * repeatedly is a bug being restarted in a loop, and a loop that spins as fast
 * as fork() allows will bury the reason under its own log.
 */
const CRASH_WINDOW_MS = 10_000;
const CRASH_LIMIT = 5;

/**
 * Fork and supervise.
 *
 * Returns false when this process should just get on and serve, which is the
 * case for a worker and for a single-process run. Returns true when it has
 * become a supervisor and the caller must not listen on anything.
 */
function start(opts) {
  const o = opts || {};
  const n = workerCount();

  /* One worker means no cluster at all, not a cluster of one: a supervisor
     plus a worker is two processes and two SQLite handles to do what one did. */
  if (n === 1 || cluster.isWorker) return false;

  const log = o.log || console.log;
  log('[cluster] primary ' + process.pid + ' starting ' + n + ' workers');

  let recent = [];
  let stopping = false;
  let exitCode = 0;

  for (let i = 0; i < n; i++) cluster.fork();

  cluster.on('exit', (worker, code, signal) => {
    if (stopping) return;
    const why = signal ? 'signal ' + signal : 'code ' + code;
    console.error('[cluster] worker ' + worker.process.pid + ' died (' + why + ')');

    const now = Date.now();
    recent = recent.filter(t => now - t < CRASH_WINDOW_MS).concat(now);
    if (recent.length >= CRASH_LIMIT) {
      console.error('[cluster] ' + recent.length + ' workers died within '
        + (CRASH_WINDOW_MS / 1000) + 's. This is a crash loop, not bad luck.');
      console.error('[cluster] stopping so the reason stays readable in the log above.');
      process.exit(1);
    }
    cluster.fork();
  });

  /* Drain rather than kill. The supervisor holds no connections itself, so all
     it has to do is pass the signal on and wait; each worker already knows how
     to finish what it is serving (server/lifecycle.js). */
  const passOn = (sig, code) => {
    if (stopping) return;
    stopping = true;
    exitCode = code;
    log('[cluster] ' + sig + ': asking ' + Object.keys(cluster.workers).length + ' workers to finish');
    for (const id of Object.keys(cluster.workers)) {
      try { cluster.workers[id].process.kill(sig); } catch (e) { /* already gone */ }
    }
    /* A worker stuck mid-request must not hold the deploy open for ever. */
    setTimeout(() => process.exit(code), (o.drainMs || 15_000)).unref();
  };
  process.on('SIGTERM', () => passOn('SIGTERM', 0));
  process.on('SIGINT', () => passOn('SIGINT', 0));

  cluster.on('exit', () => {
    if (stopping && !Object.keys(cluster.workers).length) process.exit(exitCode);
  });

  /* The supervisor's own crashes.
     `lifecycle.install()` is not used here, and the reason is the SIGTERM
     handler it also registers: Node runs signal handlers in the order they were
     added, so lifecycle's would fire straight after `passOn` above and call
     process.exit(0) on the spot — killing the supervisor mid-drain and leaving
     the workers alive with nothing dispatching to them. The fatal handlers are
     wanted, the signal handlers are not, so only the fatal ones are taken.
     `describeFatal` is borrowed so the log line has the same shape here as it
     does in a worker; whoever is grepping at 3am should not have to know which
     process wrote it. */
  const die = (kind, err) => {
    console.error(lifecycle.describeFatal(kind, err));
    /* Non-zero, and only after the workers have gone: this process holds the
       listening socket, so exiting while they serve would leave four processes
       up and unreachable. PM2 or systemd restarts the whole tree. */
    passOn('SIGTERM', 1);
  };
  process.on('unhandledRejection', reason => die('unhandledRejection', reason));
  process.on('uncaughtException', err => die('uncaughtException', err));

  return true;
}

module.exports = { start, workerCount, isPrimary, CRASH_LIMIT, CRASH_WINDOW_MS };
