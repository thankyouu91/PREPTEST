/**
 * Process lifecycle and the health endpoint.
 *
 * Run with the server up: node scripts/test-health.mjs
 *
 * The lifecycle half runs in child processes, and it has to. An exit code is
 * the entire contract with the supervisor — restart on non-zero, leave alone on
 * zero — and the only way to observe an exit code honestly is to let a process
 * exit. Asserting on a mocked `process.exit` would test the mock.
 */
import { spawn } from 'node:child_process';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const require_ = createRequire(import.meta.url);
const lifecycle = require_('../server/lifecycle.js');
const ROOT = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const BASE = process.env.BASE || 'http://127.0.0.1:3000';

let pass = 0, fail = 0;
const ok = (c, name, detail) => {
  if (c) { pass++; console.log('✓ ' + name); return; }
  fail++;
  console.log('✗ ' + name + (detail === undefined ? '' : '  → ' + detail));
};
const head = t => console.log('\n\x1b[1m== ' + t + ' ==\x1b[0m');

/**
 * Run a snippet in a child process with the lifecycle module loaded, and report
 * how it died. `fakeServer` stands in for the http.Server: what matters here is
 * the exit code and the log, not the socket.
 */
function runChild(body, env) {
  const prelude = `
    const lifecycle = require('./server/lifecycle.js');
    const fakeServer = {
      closed: false,
      close(cb) { this.closed = true; if (process.env.HANG_ON_CLOSE !== '1') cb(); },
      closeIdleConnections() {}
    };
  `;
  return new Promise(resolve => {
    const child = spawn(process.execPath, ['-e', prelude + body], {
      cwd: ROOT, env: { ...process.env, ...(env || {}) }
    });
    let out = '', err = '';
    child.stdout.on('data', d => { out += d; });
    child.stderr.on('data', d => { err += d; });
    child.on('close', code => resolve({ code, out, err, all: out + err }));
  });
}

try {
  head('What a fatal error prints');

  /* Fixed shape on purpose: whoever is reading this at 3am wants the kind, the
     message and the stack, in that order, on lines they can grep. */
  const described = lifecycle.describeFatal('uncaughtException', new Error('kaboom'));
  ok(described.includes('FATAL uncaughtException'), 'Names the kind of failure');
  ok(described.includes('kaboom'), 'Carries the message');
  ok(/at .*test-health/.test(described) || described.includes('Error: kaboom'),
    'And the stack, so the line is findable');
  ok(lifecycle.describeFatal('unhandledRejection', 'a bare string').includes('a bare string'),
    'A rejection with a non-Error reason is still reported, not swallowed');
  ok(lifecycle.describeFatal('unhandledRejection', undefined).includes('undefined'),
    'Even `reject()` with nothing at all');

  head('A crash exits non-zero');

  /* This is the whole contract with the supervisor. A process that crashes and
     exits 0 is a process nothing will restart; a process that crashes and stays
     up is worse, because it keeps answering the health check. */
  const rejected = await runChild(`
    lifecycle.install(fakeServer);
    Promise.reject(new Error('unhandled promise'));
  `);
  ok(rejected.code === 1, 'An unhandled rejection exits 1', 'exit ' + rejected.code);
  ok(rejected.all.includes('FATAL unhandledRejection'), 'And says so', rejected.all.slice(0, 160));
  ok(rejected.all.includes('unhandled promise'), 'With the original message');

  const threw = await runChild(`
    lifecycle.install(fakeServer);
    setTimeout(() => { throw new Error('thrown from a timer'); }, 1);
  `);
  ok(threw.code === 1, 'An uncaught exception exits 1', 'exit ' + threw.code);
  ok(threw.all.includes('FATAL uncaughtException'), 'And says so');
  /* A throw inside a timer is the case Express cannot catch for you: it is off
     the request stack entirely, so without this handler it is a silent death. */
  ok(threw.all.includes('thrown from a timer'), 'Including one thrown outside any request');

  ok(rejected.all.includes('shutting down'), 'A crash still drains before exiting');

  head('A requested shutdown exits zero');

  /* SIGTERM is Cloud Run asking politely before a deploy. Exiting non-zero here
     would have a supervisor treat every routine deploy as a crash. */
  const term = await runChild(`
    lifecycle.install(fakeServer);
    setTimeout(() => process.kill(process.pid, 'SIGTERM'), 20);
    setTimeout(() => { console.log('STILL-ALIVE'); process.exit(99); }, 4000);
  `);
  ok(term.code === 0, 'SIGTERM exits 0 — a deploy is not a failure', 'exit ' + term.code);
  ok(term.all.includes('shutting down (SIGTERM)'), 'And names the signal');
  ok(term.all.includes('all connections closed'), 'After closing the server');
  ok(!term.all.includes('STILL-ALIVE'), 'And does not linger');

  const int = await runChild(`
    lifecycle.install(fakeServer);
    setTimeout(() => process.kill(process.pid, 'SIGINT'), 20);
    setTimeout(() => process.exit(99), 4000);
  `);
  ok(int.code === 0, 'Ctrl-C does the same', 'exit ' + int.code);

  head('Shutdown is bounded');

  /* server.close() waits for open connections, and an idle keep-alive will wait
     for ever. A shutdown that hangs is a process the platform kills later,
     having already stopped serving — so the timer is the real guarantee. */
  const hung = await runChild(`
    lifecycle.install(fakeServer);
    setTimeout(() => process.kill(process.pid, 'SIGTERM'), 20);
    setTimeout(() => { console.log('STILL-ALIVE'); process.exit(99); }, 5000);
  `, { HANG_ON_CLOSE: '1', SHUTDOWN_GRACE_MS: '300' });
  ok(hung.code === 0, 'A close() that never returns still exits', 'exit ' + hung.code);
  ok(hung.all.includes('grace expired'), 'Saying the grace period ran out', hung.all.slice(0, 200));
  ok(!hung.all.includes('STILL-ALIVE'), 'Rather than hanging until something kills it');

  /* Two signals in a row, or a signal arriving while a crash is already
     unwinding, must not start two shutdowns racing each other to exit. */
  const twice = await runChild(`
    lifecycle.install(fakeServer);
    setTimeout(() => {
      process.kill(process.pid, 'SIGTERM');
      process.kill(process.pid, 'SIGTERM');
    }, 20);
    setTimeout(() => process.exit(99), 4000);
  `);
  ok(twice.code === 0, 'A second signal changes nothing', 'exit ' + twice.code);
  ok((twice.all.match(/shutting down/g) || []).length === 1,
    'And only one shutdown is started',
    String((twice.all.match(/shutting down/g) || []).length));

  head('/healthz');

  const r = await fetch(BASE + '/healthz');
  const body = await r.json().catch(() => ({}));
  ok(r.status === 200, 'Answers 200 while the database is reachable', 'status ' + r.status);
  ok(body.ok === true, 'With ok: true', JSON.stringify(body));

  /* A cached health check is a health check reporting the past. */
  ok((r.headers.get('cache-control') || '').includes('no-store'), 'Never cached',
    String(r.headers.get('cache-control')));
  ok((r.headers.get('x-robots-tag') || '').includes('noindex'), 'Never indexed');
  ok(r.headers.get('x-content-type-options') === 'nosniff',
    'And still carries the global security headers');

  /* An unauthenticated endpoint volunteers nothing. Every extra field is a
     detail an attacker gets for free — a version to look up, a path to probe. */
  ok(Object.keys(body).length === 1,
    'Says nothing beyond ok — no version, no path, no timing', JSON.stringify(body));
  const raw = JSON.stringify(body);
  ok(!/sqlite|prep\.db|\/home\/|node_modules|v?\d+\.\d+\.\d+/i.test(raw),
    'No file path, database name or version number leaks', raw);

  /* Cloud Run's checker arrives with no cookie and follows no redirect. */
  const bare = await fetch(BASE + '/healthz', { redirect: 'manual', headers: { cookie: '' } });
  ok(bare.status === 200, 'Reachable with no session and no redirect', 'status ' + bare.status);

  /* It has to be cheap: a checker hits it every few seconds forever. */
  const t0 = Date.now();
  for (let i = 0; i < 20; i++) await fetch(BASE + '/healthz');
  const per = (Date.now() - t0) / 20;
  ok(per < 50, 'Cheap enough to poll — ' + per.toFixed(1) + 'ms per call', per.toFixed(1) + 'ms');
} catch (e) {
  fail++;
  console.log('✗ Failed while running: ' + (e && e.stack ? e.stack : e));
}

console.log('\n' + (fail ? '\x1b[31m' : '\x1b[32m') + pass + '/' + (pass + fail) + ' checks passed\x1b[0m');
process.exit(fail ? 1 : 0);
