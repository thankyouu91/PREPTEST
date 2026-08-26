/**
 * One learner's row must never be reachable by another learner's key.
 *
 * This exists because that invariant was broken once and held everywhere else by
 * luck rather than by rule. `skill_events` was UNIQUE (source, ref_id, item_key)
 * and `ability.record()` upserted on the same triple — no user_id in either.
 * Most producers happened to build ref_id from a global surrogate, so nothing
 * collided; server/learn-practice.js built it from a number the BROWSER chose,
 * so two accounts practising the same kind on the same round number wrote to one
 * row, and the ON CONFLICT kept the first owner while taking the second's score.
 *
 * Finding that by reading meant reading every table and every upsert. Doing that
 * a second time is not a plan, so both halves are checked here instead:
 *
 *   1. **Every UNIQUE key on a table that has a user_id must contain user_id**
 *      — or be named below with a reason. A key that leaves the owner out is a
 *      key one learner can aim at another learner's row.
 *   2. **Every ON CONFLICT in the server that targets such a table must contain
 *      user_id too.** A constraint that includes the owner and an upsert that
 *      does not is the same bug with an extra step: the write lands on whatever
 *      row the shorter target finds.
 *
 * Run: node scripts/test-tenancy.mjs
 */
import { createRequire } from 'node:module';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const require = createRequire(import.meta.url);
const { q } = require('../server/db.js');

const HERE = path.dirname(fileURLToPath(import.meta.url));
const SERVER = path.join(HERE, '..', 'server');

const out = [];
const check = (n, ok, extra) => out.push({ n, ok: !!ok, extra });

/**
 * Keys that are global ON PURPOSE, each with the reason it has to be.
 *
 * The point of naming them is that adding to this list is a decision somebody
 * makes and can be argued with, rather than a check that quietly passes.
 */
const GLOBAL_BY_DESIGN = {
  'codes.code': 'An activation code is a bearer credential. Two accounts holding'
    + ' the same code is exactly what "one code, one account" forbids.',
  'orders.ref': 'The payment reference is what the gateway calls this order in'
    + ' its own books. It has to mean one order platform-wide.',
  'user_sessions.token_hash': 'The token IS the identity — it is looked up before'
    + ' any user is known, so scoping it to a user would be circular.',
  'user_tokens.token_hash': 'Same: a reset or verification token is presented by'
    + ' somebody not yet signed in.',
  'placements.user_id': 'One sitting per account, which is the scoping.',
  'users.username': 'Account identity, not learner-owned data.',
  'users.email': 'Account identity, not learner-owned data.',
  'users.google_sub': 'Account identity: one Google account, one platform account.'
};

/* ---- 1. The schema ---- */

const tables = (await q.all(
  "SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' ORDER BY name"))
  .map(r => r.name);

const owned = [];
for (const t of tables) {
  const cols = (await q.all(`PRAGMA table_info(${t})`)).map(c => c.name);
  if (cols.includes('user_id')) owned.push(t);
}
check('The database has learner-owned tables to check', owned.length > 0,
  owned.length + ': ' + owned.join(' '));

const unscoped = [];
for (const t of owned) {
  for (const idx of await q.all(`PRAGMA index_list(${t})`)) {
    if (!idx.unique) continue;
    const cols = (await q.all(`PRAGMA index_info(${idx.name})`)).map(c => c.name);
    if (cols.includes('user_id')) continue;
    /* A single-column key is named by its column, so the reason can be specific
       about which one is deliberately global. */
    const label = t + '.' + cols.join('+');
    if (GLOBAL_BY_DESIGN[label]) continue;
    unscoped.push(label);
  }
}
check('Every unique key on a learner-owned table includes the learner',
  unscoped.length === 0,
  unscoped.length ? unscoped.join(', ') + '  — scope it to user_id, or add it to'
    + ' GLOBAL_BY_DESIGN in this file WITH the reason it must be global'
    : '');

/* ---- 2. The upserts ---- */

/* An INSERT and the ON CONFLICT that belongs to it. [\s\S] rather than `.`
   because these are written across several lines — and TEMPERED, so the gap
   cannot run past the next INSERT into a later statement's ON CONFLICT. The
   untempered version reported `drills ON CONFLICT(drill_id, question_id)`:
   a plain INSERT INTO drills, paired with the upsert on drill_answers forty
   lines below it. Two false alarms out of two findings, which is how a check
   like this gets switched off. */
const UPSERT = /INSERT\s+(?:OR\s+\w+\s+)?INTO\s+([a-z_][a-z0-9_]*)((?:(?!INSERT\s+INTO)[\s\S])*?)ON\s+CONFLICT\s*\(([^)]*)\)/gi;

const mismatched = [];
let upserts = 0;
for (const file of fs.readdirSync(SERVER).filter(f => f.endsWith('.js'))) {
  const src = fs.readFileSync(path.join(SERVER, file), 'utf8');
  for (const m of src.matchAll(UPSERT)) {
    const table = m[1];
    if (!owned.includes(table)) continue;
    upserts++;
    const target = m[3].split(',').map(s => s.trim().replace(/["'`]/g, ''));
    if (!target.includes('user_id')) mismatched.push(file + ': ' + table + ' ON CONFLICT(' + m[3].trim() + ')');
  }
}
check('There are upserts on learner-owned tables to check', upserts > 0, upserts + ' found');
check('and every one of them conflicts on the learner too',
  mismatched.length === 0,
  mismatched.length ? mismatched.join(' | ') : '');

/* Child tables reached THROUGH an owned row (attempt_answers, drill_answers)
   carry no user_id of their own and are correctly absent from `owned` — their
   scoping is the parent's, checked where the parent is loaded. Naming that here
   so the gap is a decision on the record rather than something this file missed. */

let bad = 0;
for (const r of out) {
  console.log((r.ok ? '✓ ' : '✗ ') + r.n + (r.ok || !r.extra ? '' : '\n    ' + r.extra));
  if (!r.ok) bad++;
}
console.log('\n' + (out.length - bad) + '/' + out.length + ' checks passed');
process.exit(bad ? 1 : 0);
