/**
 * Server-side GA4: who a visitor is, what gets posted, and what never does.
 *
 * Run: node scripts/test-analytics.mjs   (needs no server and no browser)
 *
 * The collector is a fake HTTP server on localhost, so the request shape is
 * checked for real: the query string carrying the two keys, the JSON body, the
 * status handling. What it cannot check is whether Google likes the payload —
 * GA4 answers 2xx to a payload it will silently throw away, and only the
 * /debug endpoint says otherwise. So the rules that decide that (event-name
 * grammar, the parameter ceilings, session_id and engagement_time_msec being
 * present at all) are asserted here against the documented limits rather than
 * discovered in production three weeks later when a report is empty.
 *
 * The other half of this file is about what must NOT be in the payload. An
 * analytics module is the easiest place in a codebase to leak a name or an
 * email address by accident, so there is an explicit sweep for them.
 */
import http from 'node:http';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { EventEmitter } from 'node:events';
import { createRequire } from 'node:module';

/* Set before anything is imported: analytics reaches auth, which reaches the
   database, and a test must never touch data/. */
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'ga4-test-'));
process.env.PREP_DB = path.join(tmp, 'throwaway.sqlite');

const require_ = createRequire(import.meta.url);
const analytics = require_('../server/analytics.js');
const A = require_('../server/auth.js');

let pass = 0, fail = 0;
const ok = (c, name, detail) => {
  if (c) { pass++; console.log('✓ ' + name); return; }
  fail++;
  console.log('✗ ' + name + (detail === undefined ? '' : '  → ' + detail));
};
const head = t => console.log('\n\x1b[1m== ' + t + ' ==\x1b[0m');

const KEYS = { GA4_MEASUREMENT_ID: 'G-TEST12345', GA4_API_SECRET: 'sekrit-api-secret' };

async function withEnv(vars, fn) {
  const before = new Map(Object.keys(vars).map(k => [k, process.env[k]]));
  for (const [k, v] of Object.entries(vars)) {
    if (v === undefined) delete process.env[k]; else process.env[k] = v;
  }
  analytics.resetStats();
  try { return await fn(); }
  finally {
    for (const [k, v] of before) {
      if (v === undefined) delete process.env[k]; else process.env[k] = v;
    }
    analytics.resetStats();
  }
}

/** A request as far as this module is concerned. */
const reqOf = extra => Object.assign({
  path: '/prep/', ip: '203.0.113.7', headers: { 'user-agent': 'Mozilla/5.0 (probe)' }
}, extra || {});

/** A response object that can be told the request finished. */
function resOf(statusCode) {
  const res = new EventEmitter();
  res.statusCode = statusCode === undefined ? 200 : statusCode;
  return res;
}

/** A fake collector. `hold` keeps requests open so in-flight limits can be seen. */
async function collector(opts) {
  const o = opts || {};
  const seen = [];
  const open = [];
  const server = http.createServer((req, res) => {
    const chunks = [];
    req.on('data', c => chunks.push(c));
    req.on('end', () => {
      const raw = Buffer.concat(chunks).toString('utf8');
      let body = null;
      try { body = JSON.parse(raw); } catch (e) { /* recorded as null */ }
      seen.push({ url: req.url, method: req.method, headers: req.headers, raw, body });
      if (o.hold) { open.push(res); return; }
      res.writeHead(o.status || 204);
      res.end();
    });
  });
  await new Promise(r => server.listen(0, '127.0.0.1', r));
  const { port } = server.address();
  return {
    seen,
    url: `http://127.0.0.1:${port}/mp/collect`,
    release: () => { while (open.length) { const r = open.pop(); r.writeHead(204); r.end(); } },
    close: () => new Promise(r => { server.closeAllConnections?.(); server.close(r); })
  };
}

const T0 = new Date('2026-08-12T10:20:00.000Z');

try {
  /* ============ 1. Off unless both keys are set ============ */
  head('Disabled without the keys');

  {
    const c = await collector();
    await withEnv({ GA4_MEASUREMENT_ID: undefined, GA4_API_SECRET: undefined, GA4_ENDPOINT: c.url }, async () => {
      ok(analytics.enabled() === false, 'With neither key, analytics is off');
      ok(await analytics.track(reqOf(), 'login') === null, 'track() does nothing and returns nothing');
      const res = resOf();
      analytics.pageView(reqOf(), res);
      res.emit('finish');
      await new Promise(r => setTimeout(r, 40));
      ok(c.seen.length === 0, 'and not one request leaves the process', String(c.seen.length));
    });

    await withEnv({ GA4_MEASUREMENT_ID: 'G-ONLY-ID', GA4_API_SECRET: undefined, GA4_ENDPOINT: c.url }, () => {
      ok(analytics.enabled() === false, 'One key alone is still off — a half-configured collector is off');
    });
    await c.close();
  }

  /* ============ 2. Who a visitor is ============ */
  head('Identity without a tracking cookie');

  await withEnv(KEYS, async () => {
    const signedIn = reqOf({ user: { id: 42, email: 'hocvien@vidu.vn', name: 'Nguyen Van A' } });
    const a = await analytics.identify(signedIn, T0);
    const b = await analytics.identify(
      reqOf({ user: { id: 42 }, ip: '198.51.100.9', headers: { 'user-agent': 'another browser' } }), T0);
    ok(a.userId === '42', 'A signed-in learner is identified by their user id', a.userId);
    ok(a.clientId === b.clientId,
      'and the client id follows the person, not the machine — same on another device');

    const tomorrow = new Date(T0.getTime() + 26 * 3600 * 1000);
    ok((await analytics.identify(reqOf({ user: { id: 42 } }), tomorrow)).clientId === a.clientId,
      'and it does not change overnight');
    ok(!a.clientId.includes('42'), 'The id is hashed, not the user id in the clear', a.clientId);
    ok(/^[0-9a-f]{32}$/.test(a.clientId), 'and is a plain hex string GA4 will accept', a.clientId);

    const guest = await analytics.identify(reqOf(), T0);
    ok(guest.userId === null, 'A guest has no user id');
    ok(guest.clientId !== a.clientId, 'and a different client id');
    ok((await analytics.identify(reqOf(), T0)).clientId === guest.clientId,
      'Two page views from the same guest, the same day, are the same visitor');
    ok((await analytics.identify(reqOf({ ip: '198.51.100.9' }), T0)).clientId !== guest.clientId,
      'A different address is a different visitor');
    ok((await analytics.identify(reqOf({ headers: { 'user-agent': 'other' } }), T0)).clientId !== guest.clientId,
      'so is a different browser');
    /* The whole point of the daily bucket: a guest is not trackable across days. */
    ok((await analytics.identify(reqOf(), new Date(T0.getTime() + 26 * 3600 * 1000))).clientId !== guest.clientId,
      'and tomorrow the same guest is somebody new, which is the trade for not setting a cookie');
  });

  await withEnv(Object.assign({}, KEYS, { ANALYTICS_SALT: 'a-different-salt' }), async () => {
    const withSalt = (await analytics.identify(reqOf({ user: { id: 42 } }), T0)).clientId;
    /* ANALYTICS_SALT has to be cleared explicitly here: withEnv only restores
       the keys it was given, so leaving it out would compare the salt with
       itself and pass for the wrong reason. */
    return withEnv(Object.assign({}, KEYS, { ANALYTICS_SALT: undefined }), async () => {
      ok((await analytics.identify(reqOf({ user: { id: 42 } }), T0)).clientId !== withSalt,
        'Changing the salt changes every identity, so the hash is really keyed');
    });
  });

  await withEnv(KEYS, async () => {
    /* req.user is only set behind requireUser; a page view is served by a
       handler that never looks a session up. Without the fallback every
       signed-in page view would be filed as a guest. */
    const real = A.currentUser;
    let lookups = 0;
    A.currentUser = () => { lookups++; return { id: 7, username: 'student' }; };
    try {
      const req = reqOf();
      const first = await analytics.identify(req, T0);
      const second = await analytics.identify(req, T0);
      ok(first.userId === '7', 'A request with only a cookie is still recognised as the learner', first.userId);
      ok(lookups === 1, 'and the session is looked up once per request, not once per event',
        String(lookups));
      ok(second.clientId === first.clientId, 'with the same identity the second time');

      A.currentUser = () => { throw new Error('database is gone'); };
      const broken = await analytics.identify(reqOf(), T0);
      ok(broken.userId === null,
        'A lookup that throws degrades to a guest rather than failing the request');
    } finally {
      A.currentUser = real;
    }
  });

  /* ============ 3. What GA4 will and will not accept ============ */
  head('The rules GA4 enforces silently');

  ok(analytics.validEventName('page_view'), 'A normal event name passes');
  ok(!analytics.validEventName('1st_view'), 'A name starting with a digit is refused');
  ok(!analytics.validEventName('page view'), 'A name with a space is refused');
  ok(!analytics.validEventName('page-view'), 'A name with a hyphen is refused');
  ok(!analytics.validEventName('x'.repeat(41)), 'A name over 40 characters is refused');
  ok(analytics.validEventName('x'.repeat(40)), 'and exactly 40 is fine');
  ok(!analytics.validEventName(''), 'An empty name is refused');
  ok(!analytics.validEventName(undefined), 'and so is nothing at all');

  {
    const clean = analytics.cleanParams({
      good: 'value',
      long: 'y'.repeat(200),
      number: 12,
      zero: 0,
      'bad name': 'dropped',
      '2bad': 'dropped',
      nothing: null,
      missing: undefined
    });
    ok(clean.good === 'value', 'A normal parameter survives');
    ok(clean.long.length === analytics.MAX_PARAM_VALUE,
      'An over-long value is clamped rather than posted and rejected', String(clean.long.length));
    ok(clean.number === 12 && clean.zero === 0, 'Numbers stay numbers, including zero');
    ok(!('bad name' in clean) && !('2bad' in clean), 'Names GA4 would refuse are dropped');
    ok(!('nothing' in clean) && !('missing' in clean), 'and empty values are left out');

    const many = {};
    for (let i = 0; i < 40; i++) many['p' + i] = i;
    ok(Object.keys(analytics.cleanParams(many)).length === analytics.MAX_PARAMS,
      'No more parameters than GA4 accepts', String(Object.keys(analytics.cleanParams(many)).length));
  }

  await withEnv(KEYS, async () => {
    const body = await analytics.buildPayload(reqOf({ user: { id: 42 } }), 'exam_start', { test_id: 'vpet-b1-01' }, T0);
    ok(body.events.length === 1 && body.events[0].name === 'exam_start', 'The payload carries the one event');
    ok(body.events[0].params.test_id === 'vpet-b1-01', 'with its parameters');
    ok(!!body.events[0].params.session_id,
      'and a session_id — without it the event lands and appears in almost no report');
    ok(body.events[0].params.engagement_time_msec >= 1, 'and an engagement time, for the same reason');
    ok(body.non_personalized_ads === true, 'Ads personalisation is off: this is a school, not ad tech');
    ok(body.timestamp_micros === T0.getTime() * 1000, 'The timestamp is in microseconds, as the protocol wants',
      String(body.timestamp_micros));
    ok(body.user_id === '42', 'A signed-in payload carries the user id');
    ok((await analytics.buildPayload(reqOf(), 'page_view', {}, T0)).user_id === undefined,
      'and a guest payload has no user_id field at all');

    const s1 = analytics.sessionId('client-a', T0);
    ok(s1 === analytics.sessionId('client-a', new Date(T0.getTime() + 60000)),
      'A session id holds still inside GA4\'s 30-minute window');
    ok(s1 !== analytics.sessionId('client-a', new Date(T0.getTime() + analytics.SESSION_WINDOW_MS * 2)),
      'and moves on after it');
    ok(s1 !== analytics.sessionId('client-b', T0), 'Two visitors in the same half hour are two sessions');
  });

  /* ============ 4. Nothing personal leaves the building ============ */
  head('What is deliberately not in the payload');

  await withEnv(KEYS, async () => {
    const req = reqOf({
      user: { id: 42, email: 'hocvien@vidu.vn', name: 'Nguyen Van A', username: 'hocvien' },
      ip: '203.0.113.7',
      headers: { 'user-agent': 'Mozilla/5.0 (probe)', referer: 'https://vidu.vn/from' }
    });
    const text = JSON.stringify(await analytics.buildPayload(req, 'page_view', {
      page_path: '/prep/tai-khoan/'
    }, T0));
    for (const secret of ['hocvien@vidu.vn', 'Nguyen Van A', 'hocvien', '203.0.113.7', 'Mozilla']) {
      ok(!text.includes(secret), `The payload does not contain ${JSON.stringify(secret)}`, text.slice(0, 160));
    }
    ok(text.includes('/prep/tai-khoan/'), 'It does carry the page path, which is the thing being measured');
  });

  /* ============ 5. Actually sending it ============ */
  head('The request that goes out');

  {
    const c = await collector();
    await withEnv(Object.assign({}, KEYS, { GA4_ENDPOINT: c.url }), async () => {
      await analytics.track(reqOf({ user: { id: 42 } }), 'login', { method: 'password' }, T0);
      ok(c.seen.length === 1, 'One event, one request', String(c.seen.length));
      const hit = c.seen[0];
      ok(hit.method === 'POST', 'posted');
      ok(hit.headers['content-type'] === 'application/json', 'as JSON', hit.headers['content-type']);
      const query = new URL('http://x' + hit.url).searchParams;
      ok(query.get('measurement_id') === KEYS.GA4_MEASUREMENT_ID,
        'with the measurement id in the query string', query.get('measurement_id'));
      ok(query.get('api_secret') === KEYS.GA4_API_SECRET, 'and the API secret, which is how GA4 takes it');
      ok(hit.body && hit.body.events[0].name === 'login', 'and the event inside the body');
      ok(analytics.snapshot().sent === 1, 'The send is counted', JSON.stringify(analytics.snapshot()));

      analytics.resetStats();
      await analytics.track(reqOf(), 'not a valid name', {}, T0);
      ok(c.seen.length === 1, 'An event GA4 would reject is not sent at all', String(c.seen.length));
      ok(analytics.snapshot().invalid === 1, 'and is counted as invalid rather than lost quietly');
    });
    await c.close();
  }

  {
    const c = await collector({ status: 500 });
    await withEnv(Object.assign({}, KEYS, { GA4_ENDPOINT: c.url }), async () => {
      let threw = null;
      try { await analytics.track(reqOf(), 'login', {}, T0); } catch (e) { threw = e; }
      ok(threw === null, 'A collector answering 500 does not throw into the request that caused it');
      ok(analytics.snapshot().failed === 1, 'It is counted as failed', JSON.stringify(analytics.snapshot()));
    });
    await c.close();
  }

  await withEnv(Object.assign({}, KEYS, { GA4_ENDPOINT: 'http://127.0.0.1:1/mp/collect' }), async () => {
    let threw = null;
    try { await analytics.track(reqOf(), 'login', {}, T0); } catch (e) { threw = e; }
    ok(threw === null, 'Nor does a collector that is not there at all');
    ok(analytics.snapshot().failed === 1, 'and that is counted too');
  });

  {
    /* Hold every response open so the sends pile up, and check the ceiling
       holds: a traffic spike must not turn into unbounded outbound sockets. */
    const c = await collector({ hold: true });
    await withEnv(Object.assign({}, KEYS, { GA4_ENDPOINT: c.url }), async () => {
      const limit = analytics.MAX_IN_FLIGHT;
      const sends = [];
      for (let i = 0; i < limit + 8; i++) sends.push(analytics.track(reqOf(), 'login', { i }, T0));
      await new Promise(r => setTimeout(r, 120));
      const snap = analytics.snapshot();
      ok(snap.inFlight <= limit, `Never more than ${limit} sends are in flight at once`, String(snap.inFlight));
      ok(snap.dropped === 8, 'and the ones over the ceiling are dropped, not queued for ever',
        String(snap.dropped));
      c.release();
      await Promise.all(sends);
    });
    await c.close();
  }

  /* ============ 6. Page views ============ */
  head('Page views');

  {
    const c = await collector();
    await withEnv(Object.assign({}, KEYS, { GA4_ENDPOINT: c.url }), async () => {
      const res = resOf();
      analytics.pageView(reqOf({ path: '/prep/thu-vien/' }), res);
      ok(c.seen.length === 0, 'Nothing is sent while the response is still being written');
      res.emit('finish');
      await new Promise(r => setTimeout(r, 60));
      ok(c.seen.length === 1, 'It goes out once the page has really been delivered', String(c.seen.length));
      ok(c.seen[0].body.events[0].name === 'page_view', 'as a page_view');
      ok(c.seen[0].body.events[0].params.page_path === '/prep/thu-vien/', 'carrying the path');

      const admin = resOf();
      analytics.pageView(reqOf({ path: '/admin/quan-tri/' }), admin);
      admin.emit('finish');
      await new Promise(r => setTimeout(r, 60));
      ok(c.seen.length === 1,
        'An admin screen is not counted: staff traffic in the same property makes every funnel wrong');

      const missing = resOf(404);
      analytics.pageView(reqOf({ path: '/prep/khong-co/' }), missing);
      missing.emit('finish');
      await new Promise(r => setTimeout(r, 60));
      ok(c.seen.length === 1, 'and neither is a page that answered 404');
    });
    await c.close();
  }
} catch (e) {
  fail++;
  console.log('\n✗ The test itself threw:\n', e);
} finally {
  fs.rmSync(tmp, { recursive: true, force: true });
}

console.log(`\n${fail === 0 ? '\x1b[32m✔' : '\x1b[31m✗'} ${pass} passed, ${fail} failed\x1b[0m`);
process.exit(fail === 0 ? 0 : 1);
