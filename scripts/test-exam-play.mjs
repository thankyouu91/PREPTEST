/**
 * The Listen button, under the real Content-Security-Policy, in a real browser.
 *
 * Run with the server up: node scripts/test-exam-play.mjs
 *
 * Every lettered VPET part is paced and plays its recording straight from a
 * same-origin URL. A part WITHOUT a letter — the builder offers "- no part -",
 * and every family that is not VPET has no letters at all — goes through
 * PrepRunner.play(): fetch the file (so a 429 can be read), then play the bytes
 * through URL.createObjectURL. That second step is a policy decision the server
 * makes with one header, and no other test could see it: test-exam counts
 * replays over the API, test-exam-audio-queue uses a fake Audio. The document
 * CSP once had no media-src, CSP3's 'self' does not match blob:, and Chromium
 * refused every such play after the replay had been spent.
 *
 * So this builds a paper with one unlettered listening part, sits it in
 * Chromium, presses Listen, and waits for the `playing` event on the element the
 * runner created. Not "the request went out" — that was always true.
 */
import { readFile } from 'node:fs/promises';
import { launchChromium } from './_browser.mjs';
import { DEMO_USER, DEMO_PASSWORD, ADMIN_PASSWORD } from './_demo.mjs';

const BASE = process.env.BASE_URL || process.env.BASE || 'http://127.0.0.1:3000';
let pass = 0, fail = 0;
const ok = (c, name, detail) => {
  if (c) { pass++; console.log('✓ ' + name); return; }
  fail++; console.log('✗ ' + name + (detail === undefined ? '' : '  → ' + detail));
};
const head = t => console.log('\n\x1b[1m== ' + t + ' ==\x1b[0m');

/** A small cookie-keeping client for the administrator's side of the fixture. */
function client() {
  const jar = new Map();
  const eat = r => {
    const all = typeof r.headers.getSetCookie === 'function' ? r.headers.getSetCookie() : [];
    for (const c of all) {
      const [pair] = c.split(';');
      const i = pair.indexOf('=');
      if (i < 0) continue;
      const k = pair.slice(0, i).trim(), v = decodeURIComponent(pair.slice(i + 1).trim());
      if (v === '') jar.delete(k); else jar.set(k, v);
    }
  };
  return {
    async req(method, path, body, extra) {
      if (method !== 'GET' && !jar.has('prep_csrf')) await this.req('GET', '/prep/landing/');
      const headers = Object.assign({ Accept: 'application/json' }, extra || {});
      if (jar.size) headers.Cookie = [...jar].map(([k, v]) => k + '=' + encodeURIComponent(v)).join('; ');
      if (method !== 'GET' && jar.get('prep_csrf')) headers['X-CSRF-Token'] = jar.get('prep_csrf');
      let payload;
      if (body instanceof Uint8Array) payload = body;
      else if (body !== undefined) { headers['Content-Type'] = 'application/json'; payload = JSON.stringify(body); }
      const r = await fetch(BASE + path, { method, headers, body: payload, redirect: 'manual' });
      eat(r);
      const ct = r.headers.get('content-type') || '';
      return { status: r.status, data: ct.includes('json') ? await r.json().catch(() => null) : null };
    }
  };
}

const admin = client();
let questionId = null;
let testId = null;
let browser = null;

try {
  head('A paper with a listening part that has no letter');

  let r = await admin.req('POST', '/api/admin/login', { username: 'admin', password: ADMIN_PASSWORD });
  ok(r.status === 200, 'Administrator sign-in', 'status ' + r.status);

  /* A real, short recording, so the element has something it can decode. */
  const mp3 = await readFile(new URL('../server/data/audio/vpet-e-01.mp3', import.meta.url));

  r = await admin.req('POST', '/api/admin/questions', {
    familyId: 'vpet', skill: 'listening', level: 'B1', type: 'mcq',
    prompt: 'Play test: listen, then choose what you heard.',
    options: ['A sentence.', 'A song.', 'Silence.'], answer: 'A sentence.'
  });
  ok(r.status === 201, 'A listening item with no part letter is created', JSON.stringify(r.data));
  questionId = r.data && r.data.id;
  const up = await admin.req('POST', '/api/admin/questions/' + questionId + '/audio', new Uint8Array(mp3),
    { 'Content-Type': 'audio/mpeg' });
  ok(up.status === 201 || up.status === 200, 'With a real MP3 attached', 'status ' + up.status);

  r = await admin.req('POST', '/api/admin/tests', {
    familyId: 'vpet', title: 'Play test paper', level: 'B1', durationMin: 5
  });
  testId = r.data && r.data.id;
  ok(!!testId, 'The paper exists', String(testId));
  r = await admin.req('POST', '/api/admin/tests/' + testId + '/sections', {
    name: 'Listening without a letter', skill: 'listening', type: 'Multiple choice', minutes: 3
  });
  ok(r.status === 201, 'With one section carrying no blueprint part', JSON.stringify(r.data));
  const sectionId = r.data && r.data.id;
  r = await admin.req('POST', '/api/admin/sections/' + sectionId + '/items', { questionIds: [questionId] });
  ok(r.status === 200 && r.data.added === 1, 'Holding the item', JSON.stringify(r.data));
  r = await admin.req('POST', '/api/admin/tests/' + testId + '/status', { status: 'published' });
  ok(r.status === 200, 'Published', JSON.stringify(r.data));

  head('Listen, in Chromium, under the document CSP');

  browser = await launchChromium();
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  const page = await ctx.newPage();
  const violations = [];
  page.on('console', m => {
    if (/Content Security Policy|Refused to load/i.test(m.text())) violations.push(m.text().slice(0, 200));
  });

  /* Watch every Audio element the page makes. The runner keeps no handle to
     the one it plays, so the constructor is wrapped before any page script
     runs and each element reports its own events. */
  await ctx.addInitScript(() => {
    const Orig = window.Audio;
    window.__plays = [];
    window.Audio = function (src) {
      const el = new Orig(src);
      const rec = { src: String(src || ''), events: [], error: null };
      window.__plays.push(rec);
      for (const ev of ['playing', 'ended', 'canplay']) el.addEventListener(ev, () => rec.events.push(ev));
      el.addEventListener('error', () => { rec.events.push('error'); rec.error = el.error && el.error.code; });
      return el;
    };
  });

  await page.goto(BASE + '/prep/dang-nhap/', { waitUntil: 'networkidle' });
  await page.fill('#email', DEMO_USER);
  await page.fill('#password', DEMO_PASSWORD);
  await page.click('button[type="submit"]');
  await page.waitForURL(/\/prep\/(\?|$)/, { timeout: 15000 }).catch(() => {});

  /* A sitting of this paper, opened through the same API the page uses, after
     handing in whatever sitting the suite before this one left open. */
  const made = await page.evaluate(async id => {
    const csrf = decodeURIComponent((document.cookie.match(/prep_csrf=([^;]+)/) || [])[1] || '');
    const cur = await fetch('/api/attempts/current', { headers: { Accept: 'application/json' } })
      .then(x => x.json()).catch(() => null);
    if (cur && cur.attempt) {
      await fetch('/api/attempts/' + cur.attempt.id + '/submit', { method: 'POST', headers: { 'X-CSRF-Token': csrf } });
    }
    const x = await fetch('/api/attempts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-CSRF-Token': csrf },
      body: JSON.stringify({ testId: id })
    });
    return x.json();
  }, testId);
  ok(!!(made && made.attempt), 'The student opens a sitting of it', JSON.stringify(made).slice(0, 160));

  await page.goto(BASE + '/prep/lam-bai/', { waitUntil: 'networkidle' });
  await page.locator('button', { hasText: /Listening without a letter/ }).first().click();
  await page.waitForTimeout(300);
  await page.click('#ex-enter');
  await page.waitForSelector('[data-play]', { timeout: 10000 });
  ok(await page.locator('[data-play]').count() === 1, 'The part shows a Listen button, not the paced screen');
  ok(/Listen/.test(await page.textContent('[data-play]') || ''),
    'And the button says Listen', await page.textContent('[data-play]'));

  await page.click('[data-play]');
  const played = await page.waitForFunction(
    () => window.__plays.some(p => p.events.includes('playing')), null, { timeout: 12000 })
    .then(() => true).catch(() => false);
  const plays = await page.evaluate(() => window.__plays);
  ok(played, 'The fetched recording actually plays — the playing event fires', JSON.stringify(plays));
  ok(plays.length >= 1 && /^blob:/.test(plays[0].src), 'Through a blob URL, which is the path under test',
    JSON.stringify(plays.map(p => p.src)));
  ok(!plays.some(p => p.events.includes('error')), 'No media error on the element', JSON.stringify(plays));
  ok(violations.length === 0, 'And the console reports no policy violation', JSON.stringify(violations));

  const caption = await page.textContent('[data-plays]') || '';
  ok(!/Cannot play|blocked/i.test(caption), 'The caption reports the replay state, not a failure', caption);
} catch (e) {
  fail++;
  console.log('\n✗ The suite threw: ' + (e && e.stack ? e.stack : e));
} finally {
  if (browser) await browser.close().catch(() => {});
  /* Archived first — the paper has a sitting against it now — then deleted if
     nothing stops it, and the item retired either way. */
  if (testId) {
    await admin.req('POST', '/api/admin/tests/' + testId + '/status', { status: 'archived' });
    await admin.req('DELETE', '/api/admin/tests/' + testId);
  }
  if (questionId) await admin.req('POST', '/api/admin/questions/' + questionId + '/status', { status: 'retired' });
}

console.log(`\n${fail ? '\x1b[31m' : '\x1b[32m'}${pass} passed, ${fail} failed\x1b[0m`);
process.exit(fail ? 1 : 0);
