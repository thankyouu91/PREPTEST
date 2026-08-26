/**
 * One learner's work must never be recorded against another learner's name.
 *
 * skill_events was UNIQUE (source, ref_id, item_key) and ability.record()
 * upserted on that same triple — neither included user_id. It held only because
 * most producers build ref_id from a global surrogate (an attempt id, a drills
 * row id). server/learn-practice.js does not: its ref_id is
 * 'learn:<kind>:<roundId>' where roundId comes from the BROWSER, so two accounts
 * practising the same kind on the same round number produced the same triple.
 *
 * The ON CONFLICT then updated the existing row's score and left user_id alone,
 * because user_id was not in the SET either. One learner's answers, stored under
 * another learner's name, moving an estimate for work they never did.
 *
 * This runs against the database directly rather than over HTTP: the collision
 * is a property of the schema and the upsert, and going through the API would
 * test the route instead.
 *
 * Run: node scripts/test-ability-isolation.mjs
 */
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const { q } = require('../server/db.js');
const ability = require('../server/ability.js');

const out = [];
const check = (n, ok, extra) => out.push({ n, ok: !!ok, extra });

/* Two real accounts, whoever they are — the point is that they are two. */
const users = await q.all('SELECT id FROM users ORDER BY id LIMIT 2');
if (users.length < 2) {
  console.log('· needs two accounts in the database; skipping.');
  process.exit(0);
}
const [A, B] = users.map(u => u.id);

/* The exact shape learn-practice produces, with the round id two learners would
   both plausibly send: 1. */
const stamp = String(process.hrtime.bigint()).slice(-9);
const REF = 'learn:isolation-' + stamp + ':1';
const ITEM = 'vocab1:meaning';
const ev = (userId, earned) => ({
  user_id: userId, source: 'learn', ref_id: REF, item_key: ITEM,
  skill: 'vocabulary', level: 'B1', earned, max_score: 1, weight: 1,
  at: new Date().toISOString()
});

try {
  await ability.record([ev(A, 1)]);
  await ability.record([ev(B, 0)]);

  const rows = await q.all(
    'SELECT user_id, earned FROM skill_events WHERE source=? AND ref_id=? AND item_key=? ORDER BY user_id',
    'learn', REF, ITEM);

  check('Both learners get their own row', rows.length === 2,
    rows.length + ' row(s): ' + JSON.stringify(rows));
  check('and each row belongs to the learner who did the work',
    rows.length === 2 && rows[0].user_id === A && rows[1].user_id === B,
    JSON.stringify(rows.map(r => r.user_id)));
  check('with each learner\'s own score, not the other\'s',
    rows.length === 2 && rows[0].earned === 1 && rows[1].earned === 0,
    JSON.stringify(rows.map(r => r.earned)));

  /* And the idempotency the ref_id exists for still works WITHIN one account. */
  await ability.record([ev(A, 0)]);
  const again = await q.all(
    'SELECT user_id, earned FROM skill_events WHERE source=? AND ref_id=? AND item_key=? AND user_id=?',
    'learn', REF, ITEM, A);
  check('Re-posting the same round updates in place rather than appending',
    again.length === 1 && again[0].earned === 0, JSON.stringify(again));
} finally {
  await q.run('DELETE FROM skill_events WHERE source=? AND ref_id=? ', 'learn', REF);
}

let bad = 0;
for (const r of out) {
  console.log((r.ok ? '✓ ' : '✗ ') + r.n + (r.ok || !r.extra ? '' : '  — ' + r.extra));
  if (!r.ok) bad++;
}
console.log('\n' + (out.length - bad) + '/' + out.length + ' checks passed');
process.exit(bad ? 1 : 0);
