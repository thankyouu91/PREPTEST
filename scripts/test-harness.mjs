/**
 * The gate's own machinery: the retry, the worker pool, the CSRF warm-up.
 *
 * Run: node scripts/test-harness.mjs   (needs no server, no browser)
 *
 * These three files are the only ones in `scripts/` that every other test runs
 * through, and until now nothing tested them. That showed: twice in one day the
 * suite went red for a dropped connection and green on an identical re-run —
 * once on the CSRF warm-up, once on a navigation — and both times the report
 * named neither the page nor the reason. A gate you re-run on red is a gate you
 * have stopped reading, so the machinery that decides red now has to earn it.
 *
 * The retry is checked against a REAL socket that is really dropped, not only
 * against handwritten error strings. That distinction paid for itself while
 * this was being written: `fetch` reports a dropped connection as
 * `TypeError: fetch failed` and hides `SocketError: other side closed` in
 * `cause`, so the first version of the pattern list — written from memory —
 * matched none of it.
 */
import http from 'node:http';
import { setTimeout as sleep } from 'node:timers/promises';
import { retry, isTransient, firstLine } from './_retry.mjs';
import { pool, isFailure, PoolFailure } from './_pool.mjs';
import { hardenPage, hardenContext, hardenBrowser } from './_browser.mjs';
import { postWithCsrf } from './_csrf.mjs';

let pass = 0, fail = 0;
const ok = (c, name, detail) => {
  if (c) { pass++; console.log('✓ ' + name); return; }
  fail++;
  console.log('✗ ' + name + (detail === undefined ? '' : '  → ' + detail));
};
const head = t => console.log('\n\x1b[1m== ' + t + ' ==\x1b[0m');

/** Collect what a block printed, so "the retry is loud" can be asserted. */
async function captureLog(fn) {
  const lines = [];
  const real = console.log;
  console.log = (...a) => lines.push(a.join(' '));
  try { return { value: await fn(), lines }; }
  finally { console.log = real; }
}

const err = (message, extra) => Object.assign(new Error(message), extra || {});

try {
  /* ============ 1. What counts as worth trying again ============ */
  head('Which failures are transient');

  ok(isTransient(err('apiRequestContext.get: read ECONNRESET')), 'ECONNRESET is transient');
  ok(isTransient(err('page.goto: net::ERR_ABORTED at http://localhost:3000/prep/')),
    'A Chromium aborted navigation is transient');
  ok(isTransient(err('socket hang up', { code: 'ECONNRESET' })), 'A hung-up socket is transient');
  ok(isTransient(err('fetch failed', { cause: err('other side closed', { code: 'UND_ERR_SOCKET' }) })),
    'Reads through `cause`, which is where fetch hides the reason');
  ok(isTransient(err('boom', { code: 'ECONNRESET' })), 'Matches on `code` as well as on the message');

  ok(!isTransient(err('Expected 3 items, found 2')), 'A failed assertion is not transient');
  ok(!isTransient(err('page.goto: Timeout 30000ms exceeded', { name: 'TimeoutError' })),
    'A timeout is not transient — a second wait spends the same 30 seconds');
  ok(!isTransient(err('waiting for selector "#submit" failed', { name: 'TimeoutError', cause: err('read ECONNRESET') })),
    'A timeout stays non-transient even with a socket error underneath it');
  ok(!isTransient(err('fetch failed', { cause: err('getaddrinfo ENOTFOUND nowhere.invalid') })),
    'A name that does not resolve is not transient, though fetch words it the same');
  ok(!isTransient(err('HTTP 500')), 'A server error is not transient');
  ok(!isTransient(null) && !isTransient(undefined), 'Nothing thrown is not transient');
  ok(!isTransient(err('Target page, context or browser has been closed')),
    'A closed target is not retried: the page it would retry on is gone');

  /* A cause chain that points at itself must not spin */
  const loop = err('outer');
  loop.cause = loop;
  ok(isTransient(loop) === false, 'A self-referencing cause chain terminates');

  ok(firstLine(err('fetch failed', { cause: err('other side closed') })) === 'fetch failed (other side closed)',
    'The one-line description carries the cause, which is the informative half');
  ok(firstLine(err('read ECONNRESET\n    at Socket.onError')) === 'read ECONNRESET',
    'The one-line description is one line');

  /* ============ 2. The retry itself ============ */
  head('The retry');

  {
    let calls = 0;
    const { value, lines } = await captureLog(() => retry('flaky', async () => {
      calls++;
      if (calls === 1) throw err('read ECONNRESET');
      return 'worked';
    }, { backoffMs: 5 }));
    ok(value === 'worked', 'A transient failure is tried again and the result comes back');
    ok(calls === 2, 'Tried exactly twice, not more', `calls=${calls}`);
    ok(lines.length === 1 && /↻ flaky/.test(lines[0]) && /ECONNRESET/.test(lines[0]),
      'The retry is printed, naming the step and the reason', JSON.stringify(lines));
  }

  {
    let calls = 0;
    let thrown = null;
    try {
      await retry('broken', async () => { calls++; throw err('Expected 3 items, found 2'); }, { backoffMs: 5 });
    } catch (e) { thrown = e; }
    ok(calls === 1, 'A failure that is not transient is not tried again', `calls=${calls}`);
    ok(thrown && /Expected 3 items/.test(thrown.message), 'and is thrown on, unchanged');
  }

  {
    let calls = 0;
    let thrown = null;
    const { lines } = await captureLog(async () => {
      try {
        await retry('never clears', async () => { calls++; throw err(`read ECONNRESET #${calls}`); }, { backoffMs: 5 });
      } catch (e) { thrown = e; }
    });
    ok(calls === 2, 'A transient failure that never clears stops at the bound', `calls=${calls}`);
    ok(thrown && /#2/.test(thrown.message), 'and the LAST error is what surfaces');
    ok(lines.length === 1, 'One retry, one line — no line for the final give-up', JSON.stringify(lines));
  }

  {
    let calls = 0;
    const t0 = Date.now();
    await retry('slow', async () => { calls++; if (calls < 3) throw err('read ECONNRESET'); return 1; },
      { attempts: 3, backoffMs: 40 });
    const spent = Date.now() - t0;
    ok(calls === 3, 'The bound is raisable per call site', `calls=${calls}`);
    ok(spent >= 100, 'The backoff really waits, and lengthens between tries', `${spent}ms of an expected 120`);
  }

  ok(await retry('fine', async () => 'straight through') === 'straight through',
    'A step that works is passed through untouched');

  /* ============ 3. Against a socket that is really dropped ============ */
  head('A real dropped connection');

  {
    let hits = 0;
    const server = http.createServer((req, res) => {
      hits++;
      if (hits === 1) { req.socket.destroy(); return; }  // the failure being reproduced
      res.writeHead(200, { 'content-type': 'text/plain' });
      res.end('second time lucky');
    });
    await new Promise(r => server.listen(0, '127.0.0.1', r));
    const url = `http://127.0.0.1:${server.address().port}/`;

    const { value: body } = await captureLog(() =>
      retry('real socket', () => fetch(url).then(r => r.text()), { backoffMs: 10 }));
    ok(body === 'second time lucky', 'A connection dropped by a real server is retried and succeeds');
    ok(hits === 2, 'The server saw exactly two requests', `hits=${hits}`);

    /* And when it never recovers, it gives up rather than hammering */
    let alwaysHits = 0;
    const dead = http.createServer(req => { alwaysHits++; req.socket.destroy(); });
    await new Promise(r => dead.listen(0, '127.0.0.1', r));
    const deadUrl = `http://127.0.0.1:${dead.address().port}/`;
    let deadErr = null;
    await captureLog(async () => {
      try { await retry('dead socket', () => fetch(deadUrl), { backoffMs: 10 }); }
      catch (e) { deadErr = e; }
    });
    ok(deadErr !== null, 'A server that never recovers still fails the run');
    ok(alwaysHits === 2, 'after exactly two tries', `hits=${alwaysHits}`);
    ok(deadErr && /other side closed|ECONNRESET|socket hang up/.test(firstLine(deadErr)),
      'and the reason survives into the report', deadErr && firstLine(deadErr));

    await new Promise(r => server.close(r));
    await new Promise(r => dead.close(r));
  }

  /* ============ 4. The worker pool ============ */
  head('The worker pool');

  {
    /* Later items finish first, so a pool that returned completion order would
       be caught here rather than by a report that quietly reshuffles itself. */
    const items = [1, 2, 3, 4, 5];
    const out = await pool(items, 3, async n => { await sleep((6 - n) * 12); return n * 10; });
    ok(JSON.stringify(out) === '[10,20,30,40,50]', 'Results come back in input order, not completion order',
      JSON.stringify(out));
  }

  {
    let live = 0, peak = 0;
    await pool(Array.from({ length: 12 }, (_, i) => i), 3, async () => {
      live++; peak = Math.max(peak, live);
      await sleep(8);
      live--;
    });
    ok(peak === 3, 'No more than `limit` jobs run at once', `peak=${peak}`);
  }

  {
    const items = ['a', 'b', 'c', 'd', 'e'];
    const { value: out, lines } = await captureLog(() => pool(items, 2, async s => {
      if (s === 'c') throw err('read ECONNRESET');
      return s.toUpperCase();
    }, { describe: s => `page ${s}` }));

    ok(out.length === 5, 'One job throwing no longer ends the run', `length=${out.length}`);
    ok(out[0] === 'A' && out[4] === 'E', 'The jobs either side of it still report their result');
    ok(isFailure(out[2]) && out[2] instanceof PoolFailure, 'The failure sits in that job own slot');
    ok(out[2].where === 'page c', 'named by the caller describe(), so the report says WHICH job',
      out[2] && out[2].where);
    ok(/ECONNRESET/.test(out[2].message), 'and carries the reason');
    ok(out[2].index === 2 && out[2].item === 'c', 'and keeps the job itself for the caller');
    ok(lines.some(l => /✗ page c threw/.test(l)),
      'The failure is printed as it happens, so a caller that ignores the slot cannot hide it',
      JSON.stringify(lines));
  }

  {
    /* The fail-fast property the old code had by accident, kept on purpose:
       many failures in one run is the server being gone, not a flake. */
    let started = 0;
    let thrown = null;
    await captureLog(async () => {
      try {
        await pool(Array.from({ length: 40 }, (_, i) => i), 2, async () => {
          started++;
          throw err('read ECONNRESET');
        }, { abortAfter: 3, describe: i => `job ${i}` });
      } catch (e) { thrown = e; }
    });
    ok(thrown !== null, 'Enough failures and the pool gives up rather than grinding on');
    ok(started < 12, 'without starting the rest of the queue', `started=${started} of 40`);
    ok(thrown && /not started/.test(thrown.message) && /job 0/.test(thrown.message),
      'and the error lists what failed and how much never ran', thrown && thrown.message.split('\n')[0]);
  }

  {
    const out = await pool([], 4, async () => 1);
    ok(Array.isArray(out) && out.length === 0, 'An empty job list is not an error');
  }

  /* ============ 5. page.goto, hardened once for every call site ============ */
  head('The hardened navigation');

  const fakePage = script => {
    const calls = [];
    return {
      calls,
      goto: async (url, opts) => {
        calls.push({ url, opts });
        const next = script[calls.length - 1];
        if (next instanceof Error) throw next;
        return next;
      }
    };
  };

  {
    const page = fakePage([err('page.goto: net::ERR_ABORTED at http://x/'), { status: () => 200 }]);
    const same = hardenPage(page);
    ok(same === page, 'Hardening returns the same page object, not a wrapper to remember');
    const { value: res, lines } = await captureLog(() =>
      page.goto('http://x/prep/landing/', { waitUntil: 'networkidle' }));
    ok(page.calls.length === 2, 'An aborted navigation is retried', `calls=${page.calls.length}`);
    ok(res && res.status() === 200, 'and the Response is passed back, which test-auth.mjs reads');
    ok(page.calls[1].opts.waitUntil === 'networkidle', 'with the same options as the first try');
    ok(lines.some(l => /goto http:\/\/x\/prep\/landing\//.test(l)), 'and the retry names the URL',
      JSON.stringify(lines));
  }

  {
    const page = hardenPage(fakePage([err('net::ERR_NAME_NOT_RESOLVED')]));
    let thrown = null;
    try { await page.goto('http://nope/'); } catch (e) { thrown = e; }
    ok(page.calls.length === 1 && thrown, 'A navigation that failed for a real reason is not retried',
      `calls=${page.calls.length}`);
  }

  {
    /* The wiring that matters: nobody calls hardenPage by hand, so a page has to
       arrive hardened from the browser the scripts already launch. */
    const page = fakePage([err('read ECONNRESET'), null]);
    const browser = hardenBrowser({
      newContext: async () => ({ newPage: async () => page }),
      newPage: async () => page
    });
    const ctx = await browser.newContext();
    const fromCtx = await ctx.newPage();
    await captureLog(() => fromCtx.goto('http://x/'));
    ok(page.calls.length === 2, 'A page opened from a context of a hardened browser retries too',
      `calls=${page.calls.length}`);

    const bare = fakePage([err('read ECONNRESET'), null]);
    const c2 = hardenContext({ newPage: async () => bare });
    await captureLog(() => (async () => (await c2.newPage()).goto('http://x/'))());
    ok(bare.calls.length === 2, 'and so does one from a context hardened on its own');
  }

  /* ============ 6. The CSRF warm-up ============ */
  head('The CSRF warm-up');

  /** Enough of a BrowserContext for _csrf.mjs: a cookie jar and a request object. */
  const fakeCtx = failFirst => {
    const state = { gets: 0, cookie: null, posted: null };
    return {
      state,
      cookies: async () => (state.cookie ? [{ name: 'prep_csrf', value: state.cookie }] : []),
      request: {
        get: async () => {
          state.gets++;
          if (state.gets <= failFirst) throw err('apiRequestContext.get: read ECONNRESET');
          state.cookie = 'token-' + state.gets;
          return { ok: () => true };
        },
        post: async (url, opts) => { state.posted = { url, opts }; return { ok: () => true }; }
      }
    };
  };

  {
    const ctx = fakeCtx(1);
    const { lines } = await captureLog(() =>
      postWithCsrf(ctx, 'http://x', '/api/auth/login', { username: 'student' }));
    ok(ctx.state.gets === 2, 'A dropped warm-up is asked a second time', `gets=${ctx.state.gets}`);
    ok(ctx.state.posted.opts.headers['X-CSRF-Token'] === 'token-2',
      'and the write still goes out with the token from that second try',
      ctx.state.posted && ctx.state.posted.opts.headers['X-CSRF-Token']);
    ok(ctx.state.posted.url === 'http://x/api/auth/login', 'to the path the caller asked for');
    ok(ctx.state.posted.opts.data.username === 'student', 'carrying the caller body');
    ok(lines.some(l => /CSRF warm-up/.test(l)), 'and the retry says so in the log', JSON.stringify(lines));
  }

  {
    const ctx = fakeCtx(0);
    await postWithCsrf(ctx, 'http://x', '/api/auth/login', {});
    ok(ctx.state.gets === 1, 'A warm-up that works first time is not repeated', `gets=${ctx.state.gets}`);
  }

  {
    /* The context already holds the cookie: no warm-up at all. 220 audit jobs
       share nothing, but each one signs in twice, and the second must not
       re-fetch a page to learn what it already knows. */
    const ctx = fakeCtx(0);
    ctx.state.cookie = 'already-here';
    await postWithCsrf(ctx, 'http://x', '/api/auth/login', {});
    ok(ctx.state.gets === 0, 'A context that already has the cookie skips the warm-up');
    ok(ctx.state.posted.opts.headers['X-CSRF-Token'] === 'already-here', 'and uses the cookie it holds');
  }

  {
    const ctx = fakeCtx(9);   // never recovers
    let thrown = null;
    await captureLog(async () => {
      try { await postWithCsrf(ctx, 'http://x', '/api/auth/login', {}); } catch (e) { thrown = e; }
    });
    ok(thrown !== null && ctx.state.gets === 2,
      'A warm-up that never recovers fails the job — bounded, not a loop', `gets=${ctx.state.gets}`);
  }
} catch (e) {
  fail++;
  console.log('\n✗ The harness tests themselves threw:\n', e);
}

console.log(`\n${fail === 0 ? '\x1b[32m✔' : '\x1b[31m✗'} ${pass} passed, ${fail} failed\x1b[0m`);
process.exit(fail === 0 ? 0 : 1);
