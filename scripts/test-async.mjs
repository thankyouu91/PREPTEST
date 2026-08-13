/**
 * The request path is asynchronous now. This is the check that keeps it honest.
 *
 * Run without a server: node scripts/test-async.mjs
 *
 * Every `q.all/get/run/val` returns a promise, so every function that touches
 * the database is `async`, and so is every function that calls one. The failure
 * mode of getting that wrong is not a crash — it is silence:
 *
 *   · `if (!currentUser(req))` against an un-awaited call tests a Promise,
 *     which is always truthy, so the guard stops refusing anybody.
 *   · `rows.map(async r => …)` hands back an array of promises, and
 *     `JSON.stringify` renders each one as `{}`.
 *   · `list.forEach(async …)` returns before the first row has been read, so
 *     the array it was filling is still empty on the next line.
 *
 * None of the three throws. A test that drives the API catches some of them by
 * accident; this one catches all of them on purpose, by reading the source.
 *
 * Deliberate exceptions are declared below rather than left as holes, in the
 * same spirit as PUBLIC_WRITES in scripts/security-map.mjs: an exception that
 * has to be written down and given a reason is an exception somebody reviewed.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { inLiteral, matchParen } from './_scan.mjs';

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');

/* Every file on the request path. server/db.js is not here: its seed runs once
   at require() time, before anything is listening, and stays synchronous. */
const FILES = [
  'server.js',
  'server/api.js', 'server/user-api.js', 'server/exam-api.js', 'server/payment-api.js',
  'server/google-auth.js', 'server/auth.js', 'server/entitlements.js', 'server/marking.js',
  'server/security.js', 'server/analytics.js', 'server/secrets.js'
];

/* The scripts reach into the same modules, and four of them broke on exactly
   this during the migration — `A2.rateLimit(…) === 0` compared a Promise to a
   number and reported a rate limit that was not working. A test that lies about
   a rate limit is worse than no test, so they are checked too. */
const SCRIPTS = [
  'scripts/accounts.js', 'scripts/test-accounts.js', 'scripts/test-security.mjs',
  'scripts/test-analytics.mjs', 'scripts/test-payments.mjs', 'scripts/test-vocab.mjs',
  'scripts/test-user-api.mjs'
];

/** Calls that are asynchronous and deliberately not awaited, with the reason. */
const NOT_AWAITED = {
  'analytics.track':
    'fire-and-forget by contract — the promise exists for the tests, and a page ' +
    'view must never hold up the response it is counting. It cannot reject: ' +
    'server/analytics.js catches everything inside post().'
};

const ARRAY_METHODS = 'map|forEach|filter|some|every|find|findIndex|findLast|reduce|sort|flatMap';

let pass = 0, fail = 0;
const ok = (c, name, detail) => {
  if (c) { pass++; console.log('✓ ' + name); return; }
  fail++;
  console.log('✗ ' + name + (detail === undefined ? '' : '  → ' + detail));
};
const head = t => console.log('\n\x1b[1m== ' + t + ' ==\x1b[0m');

const read = f => fs.readFileSync(path.join(ROOT, f), 'utf8');
const lineAt = (src, at) => src.slice(0, at).split('\n').length;

/** Every async function a file declares, by name. */
function asyncNames(src) {
  const out = new Set();
  for (const m of src.matchAll(/^\s*async function ([A-Za-z0-9_$]+)/gm)) out.add(m[1]);
  for (const m of src.matchAll(/^\s*(?:const|let) ([A-Za-z0-9_$]+) = async\b/gm)) out.add(m[1]);
  return out;
}

const sources = new Map([...FILES, ...SCRIPTS].map(f => [f, read(f)]));

/* What each server module exports that is asynchronous, keyed by file. */
const ASYNC_OF = new Map(FILES.map(f => [f, asyncNames(sources.get(f))]));

/**
 * The async names visible in one file, qualified the way that file writes them.
 *
 * Read out of the imports rather than from a table, because the same module is
 * `A` in one file, `A2` and `A_` inside two blocks of scripts/test-security.mjs,
 * and destructured in a third. A hand-kept table of aliases is a table that
 * misses the next one, and a name it misses is a call it never checks.
 */
function visibleIn(file, src) {
  const out = new Set(asyncNames(src));                     // its own declarations
  const IMPORT = /(?:const|let)\s+(?:([A-Za-z0-9_$]+)|\{([^}]*)\})\s*=\s*(?:await\s+import|require_?)\s*\(\s*['"](?:\.\.?\/)+(server\/[A-Za-z0-9_.-]+?)(?:\.js)?['"]/g;
  for (const m of src.matchAll(IMPORT)) {
    const target = m[3].endsWith('.js') ? m[3] : m[3] + '.js';
    const exported = ASYNC_OF.get(target);
    if (!exported) continue;
    if (m[1]) for (const n of exported) out.add(m[1] + '.' + n);          // const A = require(…)
    if (m[2]) {
      for (const piece of m[2].split(',')) {
        const name = piece.split(':').pop().trim();
        if (exported.has(name)) out.add(name);                            // const { x } = require(…)
      }
    }
  }
  return out;
}

const VISIBLE = new Map([...sources].map(([f, src]) => [f, visibleIn(f, src)]));
const NAMES = new Set([...VISIBLE.values()].flatMap(s2 => [...s2]));

/* ============ 1. Nothing calls an async function without waiting ============ */
head('Every asynchronous call is awaited');

{
  const missed = [];
  for (const [file, src] of sources) {
    for (const name of VISIBLE.get(file)) {
      if (NOT_AWAITED[name]) continue;
      const re = new RegExp('(?<![\\w.$])' + name.replace('.', '\\.') + '\\s*\\(', 'g');
      for (let m; (m = re.exec(src));) {
        const start = m.index;
        if (inLiteral(src, start)) continue;
        const before = src.slice(Math.max(0, start - 200), start);
        if (/\bawait\s+$/.test(before)) continue;             // awaited here
        if (/\breturn\s+$/.test(before)) continue;            // handed to the caller
        if (/\b(function|async)\s+$/.test(before)) continue;  // the declaration itself
        if (/Promise\.all\([^;]*$/.test(before)) continue;    // collected, awaited together
        const close = matchParen(src, m.index + m[0].length - 1);
        if (close > 0 && /^\s*\.(then|catch)\b/.test(src.slice(close + 1, close + 12))) continue;
        missed.push(`${file}:${lineAt(src, start)} ${src.split('\n')[lineAt(src, start) - 1].trim().slice(0, 90)}`);
      }
    }
  }
  ok(missed.length === 0,
    `${NAMES.size} async functions, every call awaited`,
    missed.slice(0, 12).join('\n     '));
}

/* ============ 2. No async callback handed to an array method ============ */
head('Array methods and async callbacks');

{
  const awaitsButNotAsync = [];
  const asyncNotGathered = [];
  const asyncOnWrongMethod = [];

  for (const [file, src] of sources) {
    const re = new RegExp('\\.(' + ARRAY_METHODS + ')\\(', 'g');
    for (let m; (m = re.exec(src));) {
      if (inLiteral(src, m.index)) continue;
      const open = m.index + m[0].length - 1;
      const close = matchParen(src, open);
      if (close < 0) continue;
      const body = src.slice(open, close);
      const where = `${file}:${lineAt(src, m.index)} .${m[1]}(`;
      const isAsync = /^\(\s*async[\s(]/.test(body);

      if (!isAsync && /\bawait\b/.test(body)) awaitsButNotAsync.push(where);
      if (isAsync && m[1] !== 'map') asyncOnWrongMethod.push(where);
      if (isAsync && m[1] === 'map' &&
          !/Promise\.all\(\s*\(?[^;]*$/.test(src.slice(Math.max(0, m.index - 400), m.index))) {
        asyncNotGathered.push(where);
      }
    }
  }

  ok(awaitsButNotAsync.length === 0,
    'no callback awaits without being async', awaitsButNotAsync.join('\n     '));
  ok(asyncNotGathered.length === 0,
    'every async .map() is inside Promise.all', asyncNotGathered.join('\n     '));
  ok(asyncOnWrongMethod.length === 0,
    'no async callback on forEach/filter/some/… — those cannot wait for one',
    asyncOnWrongMethod.join('\n     '));
}

/* ============ 3. The declared exceptions are still real ============ */
head('Declared exceptions');

for (const [name, reason] of Object.entries(NOT_AWAITED)) {
  const used = [...sources.values()].some(src =>
    new RegExp('(?<![\\w.$])' + name.replace('.', '\\.') + '\\s*\\(').test(src));
  ok(used, `${name} is still called — otherwise the exception is dead wood`);
  ok(reason.length > 40, `${name} says why`);
}

/* ============ 4. Every router is wrapped for async handlers ============ */
head('Express 4 cannot catch a rejected handler by itself');

{
  const unwrapped = [];
  for (const file of FILES) {
    const src = sources.get(file);
    if (/express\.Router\(\)/.test(src) && !/asyncRoutes\(express\.Router\(\)\)/.test(src)) unwrapped.push(file);
  }
  ok(unwrapped.length === 0, 'every router goes through asyncRoutes()', unwrapped.join(', '));
  ok(/asyncRoutes\(express\(\)\)/.test(sources.get('server.js')),
    'and so does the app itself, for the page routes registered straight on it');
  ok(/app\.use\(\(err, req, res, next\)/.test(sources.get('server.js')),
    'with an error handler at the end of the chain to receive what they forward');
}

console.log(`\n${fail === 0 ? '\x1b[32m✔' : '\x1b[31m✗'} ${pass} passed, ${fail} failed\x1b[0m`);
process.exit(fail === 0 ? 0 : 1);
