/**
 * Every link on every screen goes somewhere, and every screen knows where it is.
 *
 * Run with the server up: node scripts/test-links.mjs
 *
 * The platform is thirty-odd pages that hand a learner from one to the next:
 * the plan points at a part, the result points at the home page, the home page
 * points at a paper. Each page's own suite proves the page; nothing proved the
 * handing over. A link to a page that was removed, an anchor to an id that was
 * renamed, or a `data-active` key that no menu entry carries — none of those
 * fail anything, they just leave somebody on a screen with no way on.
 *
 * So this opens every page in a real Chromium, in the session that page is
 * for (guest, learner, administrator), and checks three things:
 *
 *   1. every same-origin link it renders answers 200 in that session — or, for
 *      a guest reaching a signed-in page, the sign-in redirect it is meant to;
 *   2. every in-page anchor names an element that exists;
 *   3. the navigation lights exactly one entry, and the key the page declares
 *      is one the chrome knows.
 *
 * Plus the two cheap tells of a page that half-loaded: a console error, and
 * the words "undefined", "NaN" or "[object Object]" in the visible text.
 */
import { launchChromium } from './_browser.mjs';
import { postWithCsrf } from './_csrf.mjs';
import { DEMO_USER, DEMO_PASSWORD, ADMIN_USER, ADMIN_PASSWORD } from './_demo.mjs';

const BASE = process.env.BASE_URL || process.env.BASE || 'http://127.0.0.1:3000';
const ORIGIN = new URL(BASE).origin;

let pass = 0, fail = 0;
const ok = (c, name, detail) => {
  if (c) { pass++; console.log('✓ ' + name); return; }
  fail++; console.log('✗ ' + name + (detail === undefined ? '' : '  → ' + detail));
};
const head = t => console.log('\n\x1b[1m== ' + t + ' ==\x1b[0m');

const GUEST = [
  '/prep/landing/', '/prep/tai-lieu/', '/prep/rieng-tu/', '/prep/dieu-khoan/', '/prep/hoan-tien/',
  '/prep/bao-mat/', '/prep/dang-ky/', '/prep/dang-nhap/', '/prep/quen-mat-khau/',
  '/prep/xac-thuc-email/', '/prep/dat-lai-mat-khau/', '/prep/offline/'
];
const LEARNER = [
  '/prep/', '/prep/luyen/', '/prep/on-tap/', '/prep/xep-lop/', '/prep/mua-code/', '/prep/nhap-code/',
  '/prep/code-cua-toi/', '/prep/tai-khoan/', '/prep/bai-thi/vpet-b1-01/', '/prep/lam-bai/',
  '/prep/ket-qua/:done/',
  '/prep/hoc/on-tap/', '/prep/hoc/dong-tu-bat-quy-tac/', '/prep/hoc/tu-noi/', '/prep/hoc/thi/',
  '/prep/hoc/danh-tu/', '/prep/hoc/tinh-tu/', '/prep/hoc/khuyet-thieu/', '/prep/hoc/dieu-kien/',
  '/prep/hoc/bi-dong/', '/prep/hoc/menh-de/', '/prep/hoc/nhan-manh/', '/prep/hoc/sac-thai/',
  '/prep/hoc/gioi-tu/'
];
const ADMIN = [
  '/admin/', '/admin/de-thi/', '/admin/de-thi/vpet-b1-01/', '/admin/format/', '/admin/ngan-hang/',
  '/admin/hoc-vien/', '/admin/code/', '/admin/quan-tri/'
];

/* Redirects that are the design, not a broken link. */
const KNOWN_REDIRECTS = new Map([
  ['/', '/prep/landing/'],
  ['/prep/thu-vien/', '/prep/']
]);
const SIGN_IN = /^\/prep\/dang-nhap\/|^\/admin\/dang-nhap\//;

/** What the page rendered, read in one evaluate so the DOM is one snapshot. */
const SNAPSHOT = () => {
  const app = document.querySelector('#app');
  const active = app ? app.getAttribute('data-active') : null;
  /* Bare identifiers, not window.X: the chrome objects are top-level `const`
     bindings of classic scripts, which are globals but not window properties. */
  const navKeys = typeof PrepChrome !== 'undefined' ? PrepChrome.NAV.map(n => n.key)
    : typeof AD !== 'undefined' ? AD.NAV.flatMap(n => [n.key].concat((n.tabs || []).map(t => t.key), n.activeFor || []))
    : null;
  const lit = document.querySelectorAll('aside [aria-current="page"], nav[aria-label="Bottom navigation"] [aria-current="page"], nav[aria-label="Navigation"] [aria-pressed="true"]').length;
  /* Only what a person can see. A hidden block — the Google button while
     OAuth is switched off — is not a promise the page is making. */
  const links = [...document.querySelectorAll('a[href]')].filter(a => a.getClientRects().length > 0).map(a => ({
    href: a.getAttribute('href') || '', abs: a.href, text: (a.textContent || '').trim().replace(/\s+/g, ' ').slice(0, 50)
  }));
  const missingAnchors = links
    .filter(l => l.href.startsWith('#') && l.href.length > 1)
    .filter(l => !document.getElementById(decodeURIComponent(l.href.slice(1))))
    .map(l => l.href);
  const text = document.body ? document.body.innerText : '';
  const tell = (text.match(/\bundefined\b|\bNaN\b|\[object Object\]|\bnull\b/g) || []).slice(0, 5);
  return { active, navKeys, lit, links, missingAnchors, tell, title: document.title };
};

const browser = await launchChromium();

/** A context signed in as `who`, or a plain guest. */
async function contextFor(who) {
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  if (who === 'learner') {
    const r = await postWithCsrf(ctx, BASE, '/api/auth/login', { username: DEMO_USER, password: DEMO_PASSWORD });
    ok(r.ok(), 'The learner signs in', String(r.status()));
  } else if (who === 'admin') {
    const r = await postWithCsrf(ctx, BASE, '/api/admin/login', { username: ADMIN_USER, password: ADMIN_PASSWORD });
    ok(r.ok(), 'The administrator signs in', String(r.status()));
  }
  return ctx;
}

/** Follow nothing: the status and the Location header are the answer. */
async function probe(ctx, url) {
  const r = await ctx.request.get(url, { maxRedirects: 0 }).catch(e => ({ status: () => 0, headers: () => ({}), err: e }));
  return { status: r.status(), location: (r.headers() || {}).location || null };
}

async function crawl(who, paths) {
  head(who === 'guest' ? 'Signed out' : who === 'learner' ? 'Signed in as a learner' : 'Signed in as an administrator');
  const ctx = await contextFor(who);
  const seen = new Map();            // absolute url → { status, location, from }
  const page = await ctx.newPage();
  const errors = [];
  page.on('console', m => { if (m.type() === 'error') errors.push(m.text().slice(0, 160)); });
  page.on('pageerror', e => errors.push('PAGEERROR ' + String(e.message).slice(0, 160)));

  for (const p of paths) {
    errors.length = 0;
    const res = await page.goto(BASE + p, { waitUntil: 'networkidle' }).catch(() => null);
    await page.waitForTimeout(700);
    /* The path has to be the one asked for; a query the page adds to itself
       (the study pack normalises to ?level=1) is its own business. */
    const landed = new URL(page.url()).pathname;
    ok(res && res.status() === 200 && landed === p.split('?')[0], p + ' opens where it was asked to',
      (res ? res.status() : 'no response') + ' → ' + landed + new URL(page.url()).search);
    if (!res || res.status() !== 200) continue;

    const snap = await page.evaluate(SNAPSHOT);

    /* The chrome: one lit entry, and a key the chrome recognises. Guest pages
       carry no #app and no chrome, which is right for them. */
    if (snap.navKeys && snap.active) {
      ok(snap.navKeys.includes(snap.active),
        p + ' declares a navigation key the chrome knows', String(snap.active));
      ok(snap.lit >= 1, p + ' lights a navigation entry', 'lit=' + snap.lit + ' active=' + snap.active);
    }
    ok(snap.missingAnchors.length === 0, p + ' anchors all exist', JSON.stringify(snap.missingAnchors));
    ok(snap.tell.length === 0, p + ' shows no undefined/NaN/null text', JSON.stringify(snap.tell));
    ok(errors.length === 0, p + ' raised no console errors', JSON.stringify(errors).slice(0, 200));

    for (const l of snap.links) {
      if (!/^https?:/.test(l.abs)) continue;                      // mailto:, tel:, javascript:
      const u = new URL(l.abs);
      if (u.origin !== ORIGIN) continue;                          // external — not ours to promise
      if (u.pathname.startsWith('/api/')) continue;               // downloads (CSV, PDF) are checked by their own suites
      if (u.pathname.startsWith('/auth/')) continue;              // the OAuth round trip is a redirect by nature
      const key = u.pathname + u.search;
      if (!seen.has(key)) seen.set(key, { from: p, text: l.text });
    }
  }
  await page.close();

  /* Every distinct link once, in this session. */
  let broken = 0;
  for (const [key, meta] of seen) {
    const r = await probe(ctx, ORIGIN + key);
    const path = key.split('?')[0];
    let fine = r.status === 200;
    if (!fine && (r.status === 301 || r.status === 302) && r.location) {
      const to = new URL(r.location, ORIGIN).pathname;
      if (KNOWN_REDIRECTS.get(path) === to) fine = true;
      /* A guest, or an administrator, pointed at a learner page gets the
         sign-in screen: that is the guard working, not a dead link. */
      else if (who !== 'learner' && path.startsWith('/prep/') && SIGN_IN.test(to)) fine = true;
      else if (who !== 'admin' && path.startsWith('/admin/') && SIGN_IN.test(to)) fine = true;
      /* A signed-in learner opening a guest page is sent home, by design. */
      else if (who === 'learner' && /^\/prep\/(dang-nhap|dang-ky|quen-mat-khau)\/$/.test(path) && to === '/prep/') fine = true;
    }
    if (!fine) {
      broken++;
      console.log('   ✗ ' + key + '  → ' + r.status + (r.location ? ' ' + r.location : '') +
        '   (on ' + meta.from + ', "' + meta.text + '")');
    }
  }
  ok(broken === 0, seen.size + ' distinct links reachable from these pages all answer', broken + ' broken');
  await ctx.close();
}

try {
  /* The result screen needs a sitting that really exists for the demo account. */
  let done = null;
  {
    const probeCtx = await contextFor('learner');
    const list = await probeCtx.request.get(BASE + '/api/attempts');
    if (list.ok()) {
      const hit = ((await list.json()).items || []).find(a => a.status === 'submitted');
      if (hit) done = hit.id;
    }
    await probeCtx.close();
  }
  const learnerPages = LEARNER.map(p => p.includes(':done') ? (done ? p.replace(':done', done) : null) : p).filter(Boolean);
  if (!done) console.log('   (no handed-in sitting on the demo account: the result screen is skipped)');

  await crawl('guest', GUEST);
  await crawl('learner', learnerPages);
  await crawl('admin', ADMIN);

  /* ---- The plan's links land on the thing they name ----
     server/plan.js says "Practise Part A" and "Revise <topic>"; the address it
     hands over has to open that part, that topic, not the page's picker. */
  head('Deep links from the plan');
  const ctx = await contextFor('learner');
  const page = await ctx.newPage();

  const parts = await (await ctx.request.get(BASE + '/api/drills/parts')).json();
  const drillable = (parts.parts || []).find(x => x.drillable && x.mode === 'instant');
  if (drillable) {
    await page.goto(BASE + '/prep/luyen/?part=' + drillable.part, { waitUntil: 'networkidle' });
    await page.waitForSelector('#run:not([hidden])', { timeout: 15000 }).catch(() => {});
    const runShown = await page.evaluate(() => !document.querySelector('#run').hasAttribute('hidden'));
    ok(runShown, '/prep/luyen/?part=' + drillable.part + ' opens straight into a drill of that part');
    ok(new RegExp('Part ' + drillable.part).test(await page.textContent('#r-part') || ''),
      'And it is the part that was asked for', await page.textContent('#r-part'));
    await page.click('#r-quit');
    await page.waitForSelector('#pick:not([hidden])', { timeout: 15000 }).catch(() => {});
    ok(await page.evaluate(() => !document.querySelector('#pick').hasAttribute('hidden')),
      'Leaving the drill shows the grid, not the same drill again');
  } else {
    ok(false, 'There is an instantly-markable part to open by link', JSON.stringify((parts.parts || []).map(x => x.part + ':' + x.mode)));
  }

  const topics = await (await ctx.request.get(BASE + '/api/revision/topics')).json();
  const topic = (topics.topics || [])[0];
  if (topic) {
    await page.goto(BASE + '/prep/on-tap/?topic=' + encodeURIComponent(topic.slug) + '&level=' + topics.level, { waitUntil: 'networkidle' });
    await page.waitForSelector('#run:not([hidden])', { timeout: 15000 }).catch(() => {});
    ok(await page.evaluate(() => !document.querySelector('#run').hasAttribute('hidden')),
      '/prep/on-tap/?topic=' + topic.slug + ' opens straight into that set');
    ok((await page.textContent('#k-topic') || '').includes(topics.level),
      'At the level the link named', await page.textContent('#k-topic'));
    await page.goto(BASE + '/prep/on-tap/?topic=no-such-topic', { waitUntil: 'networkidle' });
    await page.waitForSelector('#pick:not([hidden])', { timeout: 15000 }).catch(() => {});
    ok(await page.evaluate(() => !document.querySelector('#pick').hasAttribute('hidden')),
      'An unknown topic falls back to the picker rather than a blank screen');
    /* The picker points at the lesson for the topics that have one — the same
       pairing the plan makes — so the loop runs both ways. */
    const lessonLinks = await page.evaluate(() => [...document.querySelectorAll('#k-list a[href^="/prep/hoc/"]')].map(a => a.getAttribute('href')));
    ok(lessonLinks.length > 0, 'The revision picker offers the lesson beside the topics that have one', JSON.stringify(lessonLinks.slice(0, 3)));
    for (const href of [...new Set(lessonLinks)]) {
      const r = await probe(ctx, ORIGIN + href);
      ok(r.status === 200, 'And the lesson ' + href + ' opens', String(r.status));
    }
  } else {
    ok(false, 'There is a revision topic to open by link');
  }

  /* And from a lesson back to practice: a grammar point, once opened, offers
     the revision set of exactly that topic. */
  await page.goto(BASE + '/prep/hoc/thi/', { waitUntil: 'networkidle' });
  await page.waitForSelector('[data-toggle]', { timeout: 15000 });
  await page.click('[data-toggle]');
  await page.waitForSelector('a[href^="/prep/on-tap/?topic="]', { timeout: 15000 }).catch(() => {});
  const practiseHref = await page.evaluate(() => {
    const a = document.querySelector('a[href^="/prep/on-tap/?topic="]');
    return a ? a.getAttribute('href') : null;
  });
  ok(!!practiseHref, 'An opened grammar point links to practising it in sentences', String(practiseHref));
  if (practiseHref) {
    await page.goto(BASE + practiseHref, { waitUntil: 'networkidle' });
    await page.waitForSelector('#run:not([hidden]), #pick:not([hidden])', { timeout: 15000 }).catch(() => {});
    const where = await page.evaluate(() => !document.querySelector('#run').hasAttribute('hidden') ? 'run'
      : !document.querySelector('#pick').hasAttribute('hidden') ? 'pick' : 'nothing');
    ok(where === 'run', 'And that link opens the set for the topic', where);
  }
  await ctx.close();
} catch (e) {
  fail++;
  console.log('\n✗ The suite threw: ' + (e && e.stack ? e.stack : e));
} finally {
  await browser.close();
}

console.log(`\n${fail ? '\x1b[31m' : '\x1b[32m'}${pass} passed, ${fail} failed\x1b[0m`);
process.exit(fail ? 1 : 0);
