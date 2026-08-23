#!/usr/bin/env node
/**
 * The learner's report: time on task, marks over time, accuracy. Server up.
 *
 * `server/report.js` is the one module on this platform that counts rather than
 * estimates, and the whole reason it is allowed to sit beside the ability panel
 * is that it never produces a second opinion about how good somebody is. Most
 * of what is checked here is that separation holding, plus the two things a
 * report of this kind always gets wrong:
 *
 *   · days that are not the learner's days, because the server is on UTC
 *   · a session that ran overnight counted as a study session
 */
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const R = require('../server/report.js');
const BASE = process.env.BASE_URL || process.env.BASE || 'http://127.0.0.1:3000';

let pass = 0, fail = 0;
const ok = (c, name, detail) => {
  if (c) { pass++; console.log('✓ ' + name); return; }
  fail++; console.log('✗ ' + name + (detail === undefined ? '' : '  → ' + detail));
};
const head = t => console.log('\n\x1b[1m== ' + t + ' ==\x1b[0m');

function client() {
  const jar = new Map();
  const eat = r => {
    const all = typeof r.headers.getSetCookie === 'function' ? r.headers.getSetCookie() : [];
    for (const c of all) {
      const [p] = c.split(';');
      const i = p.indexOf('=');
      if (i < 0) continue;
      const k = p.slice(0, i).trim(), v = decodeURIComponent(p.slice(i + 1).trim());
      if (v === '') jar.delete(k); else jar.set(k, v);
    }
  };
  return {
    async req(method, path, body) {
      if (method !== 'GET' && !jar.has('prep_csrf')) await this.req('GET', '/prep/landing/');
      const headers = { Accept: 'application/json' };
      if (jar.size) headers.Cookie = [...jar].map(([k, v]) => k + '=' + encodeURIComponent(v)).join('; ');
      if (method !== 'GET' && jar.get('prep_csrf')) headers['X-CSRF-Token'] = jar.get('prep_csrf');
      let payload;
      if (body !== undefined) { headers['Content-Type'] = 'application/json'; payload = JSON.stringify(body); }
      const r = await fetch(BASE + path, { method, headers, body: payload, redirect: 'manual' });
      eat(r);
      const ct = r.headers.get('content-type') || '';
      return { status: r.status, data: ct.includes('json') ? await r.json().catch(() => null) : null };
    }
  };
}

const { q } = await import('../server/db.js').then(m => m.default || m);
const me = client();

try {
  head('Days are the learner\'s days, not the server\'s');

  /* The failure this prevents: someone studies at 9pm in Hanoi, the server
     stores 14:00Z, and a UTC grouping files it under a day that has not
     started yet where they live. Seven hours of every day land on the wrong
     bar, which is a quarter of the chart. */
  ok(R.localDay('2026-08-23T16:30:00.000Z') === '2026-08-23',
    'An afternoon in UTC is the same Vietnamese day', R.localDay('2026-08-23T16:30:00.000Z'));
  ok(R.localDay('2026-08-23T18:00:00.000Z') === '2026-08-24',
    'And 18:00Z is already tomorrow in Hanoi, because +07:00 crosses midnight at 17:00Z',
    R.localDay('2026-08-23T18:00:00.000Z'));
  ok(R.localDay('2026-08-23T16:59:59.000Z') === '2026-08-23'
    && R.localDay('2026-08-23T17:00:00.000Z') === '2026-08-24',
    'The cut is exactly at 17:00Z, one second either side');
  ok(R.TZ_MINUTES === 420, 'The offset is +07:00', String(R.TZ_MINUTES));
  ok(R.localDay('not a date') === null, 'A junk timestamp is null, not "NaN-NaN-NaN"');

  head('A session that ran overnight is not a study session');

  const t0 = '2026-08-23T08:00:00.000Z';
  const plus = m => new Date(Date.parse(t0) + m * 60000).toISOString();
  ok(R.span(t0, plus(12)) === 12, 'Twelve minutes is twelve minutes', String(R.span(t0, plus(12))));
  ok(R.span(t0, plus(600)) === R.SESSION_CAP_MIN,
    'Ten hours is capped, not believed', String(R.span(t0, plus(600))));
  ok(R.span(t0, plus(0.05)) === 0,
    'A three-second session is a mis-click and counts for nothing', String(R.span(t0, plus(0.05))));
  ok(R.span(plus(30), t0) === 0, 'And an end before its start is zero, never negative');
  ok(R.span(t0, null) === 0, 'A session still running contributes nothing yet');

  head('The window has every day in it, including the empty ones');

  const who = 'rep' + Date.now().toString(36).slice(-7);
  const PW = 'Report-' + Math.random().toString(36).slice(2, 10) + 'A1';
  const reg = await me.req('POST', '/api/auth/register', {
    username: who, email: who + '@example.test', name: 'Report probe',
    phone: '09' + String(Date.now()).slice(-8), password: PW
  });
  ok(reg.status === 200 || reg.status === 201, 'A new account is registered', String(reg.status));
  const uid = await q.val('SELECT id FROM users WHERE lower(email)=?', who + '@example.test');
  if (!uid) throw new Error('registration failed; nothing below can run');
  if ((await me.req('GET', '/api/me')).status !== 200) {
    await me.req('POST', '/api/auth/login', { username: who, password: PW });
  }

  const r0 = await me.req('GET', '/api/me/report');
  ok(r0.status === 200, 'The report answers', String(r0.status));
  ok(r0.data.days.length === r0.data.windowDays,
    'With one row per day of the window',
    r0.data.days.length + ' vs ' + r0.data.windowDays);
  /* A series carrying only the days something happened draws a tidy line over
     a fortnight off, and the gap is the thing worth seeing. */
  ok(r0.data.days.every(d => d.minutes === 0),
    'All of them empty for an account that has done nothing');
  ok(r0.data.days[r0.data.days.length - 1].day === R.localDay(new Date().toISOString()),
    'The last row is today',
    r0.data.days[r0.data.days.length - 1].day + ' vs ' + R.localDay(new Date().toISOString()));
  const ordered = r0.data.days.every((d, i, a) => i === 0 || a[i - 1].day < d.day);
  ok(ordered, 'And they are in order, oldest first');
  ok(r0.data.streak === 0, 'No streak yet', String(r0.data.streak));
  ok(r0.data.totals.accuracy === null,
    'And accuracy is null rather than 0%, which would read as "you got everything wrong"',
    JSON.stringify(r0.data.totals.accuracy));

  head('Real work reaches the report');

  const sug = await me.req('GET', '/api/drills/suggest');
  const part = (sug.data.suggestions || []).find(x => x.available > 0).part;
  const d = await me.req('POST', '/api/drills', { part, size: 6 });
  ok(d.status === 201, 'A drill opens', String(d.status));
  await me.req('POST', '/api/drills/' + d.data.drillId + '/submit', {
    answers: d.data.items.map(i => ({ questionId: i.questionId, answer: (i.options && i.options[0]) || 'x' }))
  });

  /* Answered in well under a second, because a test suite does not sit and
     think. That is below SESSION_FLOOR_SEC, so it should contribute no time at
     all: checked here rather than worked around, because the floor is the
     thing standing between this chart and a stream of accidental clicks. */
  const rFast = await me.req('GET', '/api/me/report');
  const dayFast = rFast.data.days[rFast.data.days.length - 1];
  ok(dayFast.drill === 0,
    'A drill answered in under five seconds adds no time, which is what the floor is for',
    String(dayFast.drill));
  ok(dayFast.max > 0,
    'Though the marks still count: the answers were real even if the clock was not',
    String(dayFast.max));

  /* Now give it a plausible duration. The suite cannot spend eight minutes
     answering, so the two stored timestamps are moved apart instead; every
     line below reads the same path a real drill goes through. */
  await q.run(
    "UPDATE drills SET started_at = ? WHERE id = ? AND user_id = ?",
    new Date(Date.now() - 8 * 60000).toISOString(), d.data.drillId, uid);

  const r1 = await me.req('GET', '/api/me/report');
  const today = r1.data.days[r1.data.days.length - 1];
  ok(today.drill >= 7 && today.drill <= 9,
    'Eight minutes between opening and finishing is eight minutes of study',
    String(today.drill));
  ok(today.minutes === Math.round((today.exam + today.drill + today.revision + today.placement) * 10) / 10,
    'And the total is the sum of its parts, not a separate number that can drift',
    today.minutes + ' vs ' + (today.exam + today.drill + today.revision + today.placement));
  ok(today.max > 0, 'The marks attempted are recorded too', String(today.max));
  ok(r1.data.streak === 1, 'The streak is one day', String(r1.data.streak));
  ok(r1.data.window.activeDays === 1 && r1.data.window.minutes >= 7,
    'And the window summary agrees with the day it is summarising',
    JSON.stringify(r1.data.window));

  /* The same events the ability model is built from, so the two panels on the
     dashboard cannot disagree about how much work there has been. */
  const evCount = await q.val('SELECT COUNT(*) c FROM skill_events WHERE user_id = ?', uid);
  ok(r1.data.totals.items === evCount,
    'The item count is the ability model\'s own evidence, counted the same way',
    r1.data.totals.items + ' vs ' + evCount);

  head('Totals are all-time and the window is the window');

  /* These were briefly mixed: an all-time item count printed beside a windowed
     accuracy, which invites the reading that the one describes the other. */
  ok(r1.data.window && r1.data.totals, 'The two are separate objects, not one bag');
  ok(typeof r1.data.window.minutes === 'number' && typeof r1.data.window.activeDays === 'number',
    'The window carries the time figures');
  ok(r1.data.totals.items !== undefined && r1.data.totals.accuracy !== undefined
    && r1.data.window.minutes !== undefined && r1.data.window.hours !== undefined,
    'And neither borrows a field from the other');
  const short = await me.req('GET', '/api/me/report?days=7');
  ok(short.data.days.length === 7, 'A shorter window is honoured', String(short.data.days.length));
  ok(short.data.totals.items === r1.data.totals.items,
    'And it does not change the all-time totals, which is the point of keeping them apart',
    short.data.totals.items + ' vs ' + r1.data.totals.items);
  const silly = await me.req('GET', '/api/me/report?days=99999');
  ok(silly.data.days.length <= 180, 'An absurd window is clamped', String(silly.data.days.length));

  head('Accuracy, split by the kind of work');

  const qual = r1.data.quality || [];
  ok(qual.length > 0 && qual.every(x => x.source && x.items > 0), 'Every row has a source and a count',
    JSON.stringify(qual.map(x => x.source + ':' + x.items)));
  ok(qual.every(x => x.pct === null || (x.pct >= 0 && x.pct <= 100)),
    'And a percentage that is a percentage', JSON.stringify(qual.map(x => x.pct)));
  /* A "+12 points" claimed off a first week of data is noise dressed as
     progress, so the trend is null until there is something on both sides. */
  ok(qual.every(x => x.trend === null),
    'No trend is claimed on a brand new account, where there is nothing to compare with',
    JSON.stringify(qual.map(x => x.trend)));

  head('It never says "not measured" next to a number');

  /* The contradiction this prevents was on screen: `Chưa đo được · 6.5/10`,
     a claim and its own refutation on one line. notMeasured now means no data
     at all; anything with data but not enough of it is provisional. */
  const plan = await me.req('GET', '/api/plan');
  const wrong = (plan.data.plan || []).filter(x => x.reason === 'notMeasured' && x.score !== null);
  ok(wrong.length === 0,
    'Nothing in the plan is labelled not-measured while showing a score',
    JSON.stringify(wrong.map(x => x.key + ':' + x.score)));
  const parts = await me.req('GET', '/api/drills/parts');
  const wrong2 = (parts.data.parts || []).filter(x => x.reason === 'notMeasured' && x.n > 0);
  ok(wrong2.length === 0,
    'Nor is any part on the practise screen',
    JSON.stringify(wrong2.map(x => x.part + ':n=' + x.n)));
  const prov = (parts.data.parts || []).filter(x => x.n > 0 && !x.confident);
  ok(prov.every(x => x.reason === 'provisional'),
    'A part with some evidence but not enough reads as provisional',
    JSON.stringify(prov.map(x => x.part + ':' + x.reason)));

  head('It refuses what it should');

  const anon = client();
  ok((await anon.req('GET', '/api/me/report')).status === 401, 'No session, no report');

} catch (e) {
  fail++;
  console.log('\n✗ The suite threw: ' + (e && e.stack ? e.stack : e));
}

console.log(`\n${fail ? '\x1b[31m' : '\x1b[32m'}${pass} passed, ${fail} failed\x1b[0m`);
process.exit(fail ? 1 : 0);
