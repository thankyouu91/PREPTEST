#!/usr/bin/env node
/**
 * The ability model. Block 2.
 *
 * This is the piece the whole revision area is built on: one estimate of what a
 * learner can do, fed by every graded thing anywhere on the platform, read by
 * the progress panel, the post-test report, the drill picker and the roadmap.
 * If it is wrong, five features are wrong in the same direction and nothing on
 * the screen contradicts it.
 *
 * So the maths is checked against numbers worked out by hand rather than
 * against itself, and the properties that make it honest each get their own
 * assertion:
 *
 *   · three right out of three is NOT 100%
 *   · a month-old result counts half
 *   · no band is stated until there is enough evidence to state one
 *   · re-marking a paper does not double the learner's score
 *
 * That last one is the bug that would be hardest to notice and worst to have:
 * `markAttempt` is re-runnable by design, the AI marker calls it again when a
 * pending essay comes back, and an append-instead-of-replace would inflate
 * every learner who ever had an essay marked.
 */
import { createRequire } from 'node:module';
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { DEMO_USER, DEMO_PASSWORD } from './_demo.mjs';

const require = createRequire(import.meta.url);
const A = require('../server/ability.js');
const BASE = process.env.BASE_URL || 'http://localhost:3000';

let pass = 0, fail = 0;
const ok = (c, name, detail) => {
  if (c) { pass++; console.log('✓ ' + name); return; }
  fail++; console.log('✗ ' + name + (detail === undefined ? '' : '  → ' + detail));
};
const near = (a, b, eps) => Math.abs(a - b) < (eps === undefined ? 1e-9 : eps);
const head = t => console.log('\n\x1b[1m== ' + t + ' ==\x1b[0m');

const TMP = fs.mkdtempSync(path.join(os.tmpdir(), 'prep-ability-'));
const NOW = Date.parse('2026-08-21T12:00:00Z');
const iso = ms => new Date(ms).toISOString();
const day = 86400000;
const ev = (earned, max, atMs) => ({ earned, max_score: max, at: iso(atMs === undefined ? NOW : atMs) });

/** Run a snippet in a fresh process against a throwaway database. */
function inDb(code) {
  const r = spawnSync(process.execPath, ['-e', code], {
    env: { ...process.env, PREP_DB: path.join(TMP, 'db-' + Math.random().toString(36).slice(2) + '.sqlite') },
    encoding: 'utf8', timeout: 180000
  });
  const line = (r.stdout || '').trim().split('\n').filter(l => l.startsWith('{')).pop();
  return { ok: r.status === 0, out: line ? JSON.parse(line) : null, err: r.stderr || '', raw: r.stdout || '' };
}

/** A browser-shaped client: keeps cookies, attaches CSRF. */
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
    async req(method, p, body) {
      if (method !== 'GET' && !jar.has('prep_csrf')) await this.req('GET', '/prep/landing/');
      const headers = { Accept: 'application/json' };
      if (jar.size) headers.Cookie = [...jar].map(([k, v]) => k + '=' + encodeURIComponent(v)).join('; ');
      if (method !== 'GET' && jar.get('prep_csrf')) headers['X-CSRF-Token'] = jar.get('prep_csrf');
      if (body !== undefined) headers['Content-Type'] = 'application/json';
      const r = await fetch(BASE + p, {
        method, headers, redirect: 'manual',
        body: body === undefined ? undefined : JSON.stringify(body)
      });
      eat(r);
      const ct = r.headers.get('content-type') || '';
      return { status: r.status, data: ct.includes('json') ? await r.json().catch(() => null) : null };
    }
  };
}

try {
  head('The maths, against numbers worked out by hand');

  /* Nothing at all: the prior alone. A = B = 2, so p = 1/2 and
     sd = sqrt(A·B / ((A+B)²(A+B+1))) = sqrt(4 / (16·5)) = sqrt(0.05). */
  const empty = A.estimate([], NOW);
  ok(near(empty.p, 0.5), 'With no evidence the estimate is 0.5', String(empty.p));
  ok(near(empty.sd, Math.sqrt(4 / (16 * 5))), 'And the spread is the prior\'s', String(empty.sd));
  ok(!empty.confident, 'Which is nowhere near confident enough to name a band');
  ok(A.bandOf(empty).band === null, 'So bandOf refuses to name one');

  /* Three right out of three. A = 2+3 = 5, B = 2+0 = 2, so p = 5/7, not 1.
     This is the whole reason for the prior: 100% off three items is the number
     that makes a platform look confident and be wrong. */
  const three = A.estimate([ev(1, 1), ev(1, 1), ev(1, 1)], NOW);
  ok(near(three.p, 5 / 7), 'Three right out of three is 5/7, not 100%', three.p.toFixed(6));
  ok(!three.confident, 'And still not enough to state a band', 'sd ' + three.sd.toFixed(4));
  ok(A.bandOf(three).band === null, 'bandOf says so too');
  ok(three.needed > 20, 'It says how much more it wants', String(three.needed));

  /* Enough evidence: 80 of 100 today. A = 82, B = 22, p = 82/104. */
  const many = Array.from({ length: 100 }, (_, i) => ev(i < 80 ? 1 : 0, 1));
  const lots = A.estimate(many, NOW);
  ok(near(lots.p, 82 / 104), '80 out of 100 lands at 82/104, pulled slightly by the prior', lots.p.toFixed(6));
  ok(lots.confident, 'That is enough to name a band', 'sd ' + lots.sd.toFixed(4));
  ok(lots.needed === 0, 'And it stops asking for more');
  /* The same estimate, labelled twice.
   *
   * bandOf() now takes the difficulty of the material behind the estimate,
   * because 80 out of 100 on Level 1 material and 80 out of 100 on Level 2
   * material are different claims about a person and the score alone cannot
   * tell them apart. This used to answer "B2" to both, which is the ability
   * panel's version of the bug that had a Level 1 paper reporting C1.
   *
   * `materialLevel` is on the server/ability.js LEVEL_RANK scale: 3 is B1
   * (Level 1 material), 5 is C1 (Level 2 material). */
  ok(A.bandOf(lots, { materialLevel: 3 }).band === 'B1',
    'Eight out of ten on Level 1 material is B1 — that paper measures no higher than B1+',
    JSON.stringify(A.bandOf(lots, { materialLevel: 3 })));
  ok(A.bandOf(lots, { materialLevel: 5 }).band === 'C1',
    'The same estimate on Level 2 material is C1',
    JSON.stringify(A.bandOf(lots, { materialLevel: 5 })));
  ok(A.bandOf(lots).band === null,
    'and with no idea how hard the material was, it declines to name a level at all',
    JSON.stringify(A.bandOf(lots)));

  /* Decay. The same 100 items, 30 days old, must weigh exactly half — that is
     what a 30-day half-life means, and it is the property that stops a strong
     March from making a silent June look strong. */
  const old = A.estimate(many.map(e => ({ ...e, at: iso(NOW - 30 * day) })), NOW);
  ok(near(old.weighted, 50, 1e-6), 'The same work 30 days ago weighs exactly half', old.weighted.toFixed(4));
  ok(near(A.decay(iso(NOW - 60 * day), NOW), 0.25), 'And a quarter after 60 days');
  ok(near(A.decay(iso(NOW), NOW), 1), 'Today counts in full');
  ok(old.sd > lots.sd, 'Older evidence therefore leaves a wider spread',
    old.sd.toFixed(4) + ' vs ' + lots.sd.toFixed(4));
  ok(near(old.p, lots.p, 0.03), 'While the estimate itself barely moves — decay is about certainty, not score',
    old.p.toFixed(4) + ' vs ' + lots.p.toFixed(4));

  /* An item worth nothing tells you nothing. Counting it as a failure is how
     one malformed row drags a whole skill to zero. */
  const withZero = A.estimate([ev(1, 1), ev(0, 0), ev(1, 1)], NOW);
  ok(withZero.n === 2, 'An item worth 0 marks is skipped, not counted as wrong', String(withZero.n));

  /* A 10-mark essay is ONE observation, not ten. Confidence is about how many
     independent things you have seen. */
  const oneBig = A.estimate([{ earned: 8, max_score: 10, at: iso(NOW) }], NOW);
  const tenSmall = A.estimate(Array.from({ length: 10 }, (_, i) => ev(i < 8 ? 1 : 0, 1)), NOW);
  ok(oneBig.sd > tenSmall.sd,
    'One 10-mark item leaves more uncertainty than ten 1-mark items at the same rate',
    oneBig.sd.toFixed(4) + ' vs ' + tenSmall.sd.toFixed(4));
  ok(near(oneBig.p, 2.8 / 5), 'And scores it on its proportion: (2 + 0.8) / 5', oneBig.p.toFixed(6));

  /* Interval and band edges. */
  const b = A.bandOf(lots);
  ok(b.low <= b.score && b.score <= b.high, 'The interval brackets the estimate',
    b.low + ' ≤ ' + b.score + ' ≤ ' + b.high);
  ok(A.vstepBand(8.5) === 'C1' && A.vstepBand(8.4) === 'B2', 'C1 starts at 8.5');
  ok(A.vstepBand(5.5) === 'B2' && A.vstepBand(5.4) === 'B1', 'B2 starts at 5.5');
  ok(A.vstepBand(3.4) === null, 'Below 3.5 there is no band to name — no certificate is issued');

  head('The roadmap puts the right part first');

  /* Two parts equally weak; the one worth more marks in the real paper wins. */
  const weights = { A: 10, B: 3, C: 6 };
  const model = {
    parts: {
      A: { score: 5, sd: 0.04, confident: true, needed: 0 },
      B: { score: 5, sd: 0.04, confident: true, needed: 0 },
      C: { score: 9, sd: 0.04, confident: true, needed: 0 }
    }
  };
  const plan = A.roadmap(model, weights);
  ok(plan[0].part === 'A', 'Equally weak, the part worth more marks comes first', JSON.stringify(plan.map(p => p.part)));
  ok(plan[plan.length - 1].part === 'C' || !plan.some(p => p.part === 'C'),
    'And a strong part is not at the top', JSON.stringify(plan.map(p => p.part)));
  ok(A.roadmap(model, weights).length === 3, 'Three items by default — a ten-item plan is a list people close');

  /* Uncertainty lifts a part up: the first thing to do about an unknown is
     measure it. Same score, wider spread, higher priority. */
  const unsure = {
    parts: {
      A: { score: 6, sd: 0.02, confident: true, needed: 0 },
      B: { score: 6, sd: 0.20, confident: false, needed: 40 }
    }
  };
  ok(A.roadmap(unsure, { A: 5, B: 5 })[0].part === 'B',
    'Between two equal scores, the one we know least about comes first');

  head('Recording, and not double-counting a re-mark');

  const rec = inDb(`
    (async () => {
      const A = require('./server/ability.js');
      const { q } = require('./server/db.js');
      const uid = (await q.get("SELECT id FROM users WHERE username='student'")).id;
      const evs = [
        { user_id: uid, source: 'exam', ref_id: 77, item_key: 1, skill: 'reading', part: 'C', level: 'B1', earned: 1, max_score: 1, weight: 1 },
        { user_id: uid, source: 'exam', ref_id: 77, item_key: 2, skill: 'reading', part: 'C', level: 'B1', earned: 0, max_score: 1, weight: 1 },
        { user_id: uid, source: 'exam', ref_id: 77, item_key: 3, skill: 'listening', part: 'E', level: 'B1', earned: 1, max_score: 1, weight: 1 }
      ];
      await A.record(evs);
      const first = await q.val('SELECT COUNT(*) FROM skill_events WHERE user_id=?', uid);
      // Mark it again, with one answer now corrected — exactly what the AI marker does.
      evs[1].earned = 1;
      await A.record(evs);
      const second = await q.val('SELECT COUNT(*) FROM skill_events WHERE user_id=?', uid);
      const corrected = await q.val("SELECT earned FROM skill_events WHERE ref_id='77' AND item_key='2'");
      const ab = await A.abilityOf(uid);
      console.log(JSON.stringify({ first, second, corrected,
        parts: Object.keys(ab.parts).sort(), skills: Object.keys(ab.skills).sort(), events: ab.events }));
    })();
  `);
  ok(rec.ok && rec.out, 'Recording works against a real database', rec.err.slice(-300));
  if (rec.out) {
    ok(rec.out.first === 3, 'Three items in, three rows', String(rec.out.first));
    ok(rec.out.second === 3, 'Re-marking the same paper leaves three rows, not six', String(rec.out.second));
    ok(rec.out.corrected === 1, 'And the corrected mark replaced the old one', String(rec.out.corrected));
    ok(JSON.stringify(rec.out.parts) === '["C","E"]', 'Grouped by part', JSON.stringify(rec.out.parts));
    ok(JSON.stringify(rec.out.skills) === '["listening","reading"]', 'And by skill', JSON.stringify(rec.out.skills));
  }

  head('Marking a paper feeds the model by itself');

  /* The integration that matters: nobody should have to remember to call
     ability.record(). Marking a sitting must do it, or the model quietly stays
     empty while the report next to it fills up. */
  const hook = inDb(`
    (async () => {
      const { q, nowISO } = require('./server/db.js');
      const marking = require('./server/marking.js');
      const A = require('./server/ability.js');
      const at = nowISO();
      const uid = (await q.get("SELECT id FROM users WHERE username='student'")).id;
      const fam = (await q.get('SELECT id FROM families LIMIT 1')).id;

      const mk = async (ans, part, level) => (await q.run(
        \`INSERT INTO questions (family_id,skill,level,type,prompt,options_json,answer,explanation,tags_json,status,created_at,part)
         VALUES (?,?,?,'gap','Fill it in','[]',?,'','[]','published',?,?)\`,
        fam, part === 'C' ? 'reading' : 'listening', level, ans, at, part)).lastInsertRowid;

      const q1 = await mk('alpha', 'C', 'B1');
      const q2 = await mk('beta', 'C', 'B1');
      const q3 = await mk('gamma', 'E', 'B2');

      await q.run(\`INSERT INTO tests (id,family_id,title,level,duration_min,scoring,guide_json,status,build_mode,created_at,updated_at)
                   VALUES ('t-hook',?,'Hook','B1',10,'linear','[]','published','manual',?,?)\`, fam, at, at);
      const secR = (await q.run("INSERT INTO sections (test_id,name,skill,type,minutes,sort,part) VALUES ('t-hook','Part C','reading','gap',5,1,'C')")).lastInsertRowid;
      const secL = (await q.run("INSERT INTO sections (test_id,name,skill,type,minutes,sort,part) VALUES ('t-hook','Part E','listening','gap',5,2,'E')")).lastInsertRowid;
      await q.run('INSERT INTO section_items (section_id,question_id,sort) VALUES (?,?,1)', secR, q1);
      await q.run('INSERT INTO section_items (section_id,question_id,sort) VALUES (?,?,2)', secR, q2);
      await q.run('INSERT INTO section_items (section_id,question_id,sort) VALUES (?,?,1)', secL, q3);

      const aid = (await q.run(
        "INSERT INTO attempts (user_id,test_id,status,started_at,updated_at) VALUES (?,'t-hook','submitted',?,?)",
        uid, at, at)).lastInsertRowid;
      await q.run('INSERT INTO attempt_parts (attempt_id,section_id,part,started_at) VALUES (?,?,?,?)', aid, secR, 'C', at);
      await q.run('INSERT INTO attempt_parts (attempt_id,section_id,part,started_at) VALUES (?,?,?,?)', aid, secL, 'E', at);
      // One right, one wrong, one unanswered.
      await q.run('INSERT INTO attempt_answers (attempt_id,question_id,section_id,answer,updated_at) VALUES (?,?,?,?,?)', aid, q1, secR, 'alpha', at);
      await q.run('INSERT INTO attempt_answers (attempt_id,question_id,section_id,answer,updated_at) VALUES (?,?,?,?,?)', aid, q2, secR, 'wrong', at);

      await marking.markAttempt(aid);
      const rows = await q.all('SELECT part, skill, level, earned, max_score, weight, source FROM skill_events WHERE user_id=? ORDER BY part', uid);
      const ab = await A.abilityOf(uid);
      // Re-mark: the score must not move.
      const before = ab.overall.score;
      await marking.markAttempt(aid);
      const after = (await A.abilityOf(uid)).overall.score;
      const n = await q.val('SELECT COUNT(*) FROM skill_events WHERE user_id=?', uid);
      console.log(JSON.stringify({ rows, n, before, after, parts: Object.keys(ab.parts).sort() }));
    })();
  `);
  ok(hook.ok && hook.out, 'Marking a sitting runs end to end', hook.err.slice(-400));
  if (hook.out) {
    ok(hook.out.rows.length === 3,
      'Three items marked, three events — including the one left blank, which is still a 0',
      String(hook.out.rows.length));
    ok(hook.out.rows.every(r => r.source === 'exam'), 'Filed as exam work');
    ok(hook.out.rows.every(r => r.weight === 1), 'At full weight: this was under exam conditions');
    ok(JSON.stringify(hook.out.parts) === '["C","E"]',
      'The letters came from the questions, so ability is known per part', JSON.stringify(hook.out.parts));
    const c = hook.out.rows.filter(r => r.part === 'C');
    ok(c.length === 2 && c.some(r => r.earned === 1) && c.some(r => r.earned === 0),
      'One right and one wrong in Part C, recorded as such', JSON.stringify(c));
    ok(hook.out.rows.some(r => r.level === 'B2'),
      'And the level came across too, so the drill picker can use it');
    ok(hook.out.n === 3 && hook.out.before === hook.out.after,
      'Marking the same paper twice does not move the score — the bug that would inflate every learner',
      hook.out.n + ' rows, ' + hook.out.before + ' → ' + hook.out.after);
  }

  head('The endpoint is behind the sign-in and scoped to the caller');

  const anon = await fetch(BASE + '/api/me/ability', { redirect: 'manual' });
  ok(anon.status === 401, 'Signed out gets 401, not an empty model', String(anon.status));

  const me = client();
  const login = await me.req('POST', '/api/auth/login', { username: DEMO_USER, password: DEMO_PASSWORD });
  ok(login.status === 200, 'The demo student can sign in', 'status ' + login.status);

  const mine = await me.req('GET', '/api/me/ability');
  ok(mine.status === 200 && mine.data, 'And read their own ability', 'status ' + mine.status);
  if (mine.data) {
    for (const k of ['overall', 'skills', 'parts', 'topics', 'roadmap', 'events', 'halfLifeDays']) {
      ok(k in mine.data, 'The answer carries ' + k);
    }
    ok(typeof mine.data.overall.confident === 'boolean',
      'overall says whether it is confident, so the page cannot render a band by accident');
    ok(mine.data.overall.confident || mine.data.overall.band === null,
      'And a band is present only when it is', JSON.stringify(mine.data.overall));
    ok(mine.data.halfLifeDays === A.HALF_LIFE_DAYS,
      'The page is told the half-life rather than guessing it');
    ok(Array.isArray(mine.data.roadmap) && mine.data.roadmap.length <= 3,
      'The roadmap is at most three items', JSON.stringify(mine.data.roadmap));
  }

  const nocache = await me.req('GET', '/api/me/ability');
  ok(nocache.status === 200, 'It answers repeatedly');

  head('And the dashboard shows ability rather than inventory');

  /* A browser is not optional for this. The panel is built by JavaScript from a
     second request, so the server returns the same bytes whether the ring reads
     "your ability" or "tests you have bought" — which is exactly the bug this
     block exists to remove, and it survived a screenshot pass for months. */
  const { launchChromium } = await import('./_browser.mjs');
  const browser = await launchChromium();
  try {
    const ctx = await browser.newContext({ viewport: { width: 1280, height: 1000 } });
    const page = await ctx.newPage();
    const errs = [];
    page.on('pageerror', e => errs.push('PAGEERROR ' + e.message));
    page.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });

    await page.goto(BASE + '/prep/dang-nhap/', { waitUntil: 'networkidle' });
    await page.fill('#email', DEMO_USER);
    await page.fill('#password', DEMO_PASSWORD);
    await page.click('button[type="submit"]');
    await page.waitForTimeout(1500);
    await page.goto(BASE + '/prep/', { waitUntil: 'networkidle' });
    await page.waitForTimeout(1200);

    /* The two "this is not a shopping basket" checks stay pinned to #tien-do,
       because that panel specifically must never go back to counting what has
       been bought. */
    const panel = await page.locator('#tien-do').innerText();
    ok(!/tests unlocked|bài đã mở/i.test(panel),
      'The ring no longer counts tests bought', panel.slice(0, 160).replace(/\n/g, ' | '));
    ok(!/Skills with practice available|kỹ năng có bài/i.test(panel),
      'Nor do the bars count which papers happen to contain a skill');

    /* The skill bars are asked of the whole page rather than of #tien-do.
       They used to live inside that card; when the Progress tab was folded
       into the home page they moved to a panel of their own, and this check
       went red for a change of address rather than a change of behaviour. The
       property it is defending is that the bars are about ABILITY, and where
       on the page they sit is not part of that. */
    const whole = await page.locator('#main').innerText();
    ok(/Ability by skill|Năng lực theo kỹ năng|Năng lực từng kỹ năng/i.test(whole),
      'The bars are about ability now', whole.slice(0, 200).replace(/\n/g, ' | '));

    const cap = (await page.locator('#ring-cap').innerText()).trim();
    const num = (await page.locator('#ring-num').innerText()).trim();
    /* Either an honest refusal or a real number — never "5/8". Both dash
       characters are allowed: the placeholder was an em dash and is now a
       hyphen, since the em dash is gone from the interface copy. */
    ok(/^([-—]|\d+(\.\d)?)$/.test(num), 'The ring shows a score or a dash, never a fraction', num);
    /* The allow-list is the full CEFR set now, not the three VSTEP bands it
       was written for. A Level 1 learner can legitimately be told A1, A2, A2+
       or "dưới A1" — those are real results on a paper that measures from A1,
       and the old list treated everything below B1 as a single "below B1". */
    ok(/not measured|chưa đo|provisional|tạm tính|A1|A2|B1|B2|C1|C2|below|dưới/i.test(cap),
      'And the caption says what that number is', cap);

    const note = (await page.locator('#progress-note').innerText()).trim();
    ok(note.length > 20 && !/tests available|bài thi hiện có/i.test(note),
      'The note explains the estimate rather than the basket', note.slice(0, 140));

    ok(errs.length === 0, 'No console errors on the dashboard', JSON.stringify(errs).slice(0, 300));
  } finally {
    await browser.close();
  }

} catch (e) {
  fail++;
  console.log('\n✗ The suite threw: ' + (e && e.stack ? e.stack : e));
} finally {
  fs.rmSync(TMP, { recursive: true, force: true });
}

console.log(`\n${fail ? '\x1b[31m' : '\x1b[32m'}${pass} passed, ${fail} failed\x1b[0m`);
process.exit(fail ? 1 : 0);
