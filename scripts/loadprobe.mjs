/**
 * How many people can actually be on this server at once?
 *
 * The question was asked as a target — "1000 học viên vào cùng lúc" — and a
 * target is not answerable by reading the code. One process, one synchronous
 * SQLite handle and one 2-core box has a number, and the only honest way to
 * learn it is to send traffic at it and watch where the latency curve bends.
 *
 * So this is a measuring instrument, not a test. It never fails a build:
 * `npm run verify` must mean "the product is correct", and a throughput figure
 * on a shared CI runner is a fact about the runner. Run it deliberately, on the
 * machine whose capacity you actually care about.
 *
 *   node scripts/loadprobe.mjs                       # against localhost:3000
 *   BASE_URL=https://... node scripts/loadprobe.mjs  # against a real deploy
 *   PROBE_LEVELS=1,25,100 node scripts/loadprobe.mjs # pick the ramp
 *
 * ## What it measures, and why these four routes
 *
 * A single average request/second number hides the thing that decides whether a
 * platform survives a class of 40 arriving together. These four routes have
 * genuinely different costs, and they fail in different ways:
 *
 *   /healthz          one indexed SELECT. The floor: pure process overhead.
 *   the built CSS     a static file. Should be nearly free, and if it is not,
 *                     the fault is the event loop, not the database.
 *   a self-study page a real HTML render off disk.
 *   /api/catalog      the read every signed-in learner does on arrival, and the
 *                     one that touches the most rows.
 *
 * ## The number that matters is p95, not the mean
 *
 * A mean hides the tail, and the tail is what people feel. `node:sqlite` is
 * SYNCHRONOUS: every query blocks the event loop for its whole duration, so a
 * slow query does not queue behind itself, it queues behind EVERY other request
 * in flight. That is exactly the shape that looks fine at 20 users and falls
 * over at 200, and a mean will not show it. p95 and p99 will.
 */
import { performance } from 'node:perf_hooks';

const BASE = process.env.BASE_URL || 'http://localhost:3000';
const LEVELS = (process.env.PROBE_LEVELS || '1,10,25,50,100,200')
  .split(',').map(s => parseInt(s.trim(), 10)).filter(n => n > 0);
/* Long enough for the numbers to settle, short enough that the whole ramp is a
   couple of minutes. Below about three seconds a level is measuring warm-up. */
const SECONDS = Number(process.env.PROBE_SECONDS || 5);

const ROUTES = [
  { name: '/healthz            (1 indexed SELECT)', path: '/healthz' },
  { name: 'tailwind-built.css   (static file)', path: '/tailwind-built.css' },
  { name: '/prep/hoc/…          (HTML page)', path: '/prep/hoc/dong-tu-bat-quy-tac/' },
  { name: '/api/catalog         (the arrival read)', path: '/api/catalog' }
];

/** Nearest-rank percentile. No interpolation: with a few thousand samples the
    difference is noise, and the exact rank is the one a real request had. */
function pct(sorted, p) {
  if (!sorted.length) return 0;
  const i = Math.min(sorted.length - 1, Math.ceil(p / 100 * sorted.length) - 1);
  return sorted[i];
}

/** Drive one route at one concurrency for SECONDS, and describe what happened.

    Workers are closed loops, not a fixed request count: each finishes a request
    and immediately starts the next. That is how a browser behaves and how a
    queue actually builds. Firing N requests and waiting measures a burst, which
    is a different — and much kinder — question. */
async function level(path, conc) {
  const deadline = performance.now() + SECONDS * 1000;
  const lat = [];
  let ok = 0, bad = 0, threw = 0;
  const codes = new Map();

  async function worker() {
    for (;;) {
      if (performance.now() >= deadline) return;
      const t0 = performance.now();
      try {
        const r = await fetch(BASE + path, { redirect: 'manual' });
        /* The body must be drained or the socket is not free for the next
           request, and the run measures connection starvation instead of the
           server. This cost the first version of this file an afternoon. */
        await r.arrayBuffer();
        lat.push(performance.now() - t0);
        codes.set(r.status, (codes.get(r.status) || 0) + 1);
        /* 401 and 302 are correct answers from a route behind a sign-in; they
           are still a completed round trip and still cost the server the work.
           Only 5xx is a failure to serve. */
        if (r.status >= 500) bad++; else ok++;
      } catch (e) {
        threw++;
        codes.set(String(e && e.cause && e.cause.code || 'ERR'),
          (codes.get(String(e && e.cause && e.cause.code || 'ERR')) || 0) + 1);
      }
    }
  }

  await Promise.all(Array.from({ length: conc }, worker));
  lat.sort((a, b) => a - b);
  const total = ok + bad + threw;
  return {
    conc, total, ok, bad, threw,
    rps: total / SECONDS,
    p50: pct(lat, 50), p95: pct(lat, 95), p99: pct(lat, 99),
    max: lat.length ? lat[lat.length - 1] : 0,
    codes: [...codes.entries()].sort((a, b) => b[1] - a[1])
      .map(([c, n]) => c + '×' + n).join(' ')
  };
}

const ms = n => (n < 10 ? n.toFixed(1) : Math.round(n) + '').padStart(6);

console.log('Load probe → ' + BASE);
console.log(`${SECONDS}s per level, closed-loop workers, concurrency ${LEVELS.join(' → ')}\n`);

/* Fail early and clearly rather than reporting a ramp of connection errors. */
try {
  const r = await fetch(BASE + '/healthz');
  if (!r.ok) throw new Error('/healthz answered ' + r.status);
  await r.arrayBuffer();
} catch (e) {
  console.error('Nothing is answering at ' + BASE + ' — ' + (e && e.message));
  console.error('Start one first:  node server.js');
  process.exit(1);
}

const summary = [];
for (const route of ROUTES) {
  console.log('\x1b[1m' + route.name + '\x1b[0m');
  console.log('  conc     req/s     p50     p95     p99     max   status');
  for (const conc of LEVELS) {
    const r = await level(route.path, conc);
    const hurt = r.bad || r.threw ? '\x1b[31m' : '';
    console.log(
      `  ${String(conc).padStart(4)}  ${r.rps.toFixed(0).padStart(8)}` +
      `  ${ms(r.p50)}  ${hurt}${ms(r.p95)}\x1b[0m  ${ms(r.p99)}  ${ms(r.max)}   ${r.codes}`);
    summary.push({ route: route.path, ...r });
    /* Let the event loop and any lockout window breathe between levels, so the
       next level starts from idle rather than from the last one's backlog. */
    await new Promise(res => setTimeout(res, 400));
  }
  console.log('');
}

/* The headline: at what concurrency does a page stop feeling instant?
   250ms p95 is the usual line for "the click responded"; past 1s people retry,
   and a retry storm is how a slow server becomes a down server. */
console.log('\x1b[1m== Where it bends ==\x1b[0m');
for (const route of ROUTES) {
  const rows = summary.filter(s => s.route === route.path);
  const last250 = [...rows].reverse().find(r => r.p95 <= 250);
  const peak = rows.reduce((a, b) => (b.rps > a.rps ? b : a), rows[0]);
  console.log(`  ${route.path}`);
  console.log(`      p95 stays under 250ms up to ${last250 ? last250.conc + ' concurrent' : 'no level tested'}`);
  console.log(`      best throughput ${peak.rps.toFixed(0)} req/s at ${peak.conc} concurrent`);
}
console.log('\nA browser opens up to 6 connections per host, and a learner sitting');
console.log('on a page is not a concurrent request. Treat the concurrency column');
console.log('as requests in flight, and divide by roughly 10–20 for people.');
