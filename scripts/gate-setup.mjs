#!/usr/bin/env node
/**
 * Put the test database into the state the gate expects, before the server starts.
 *
 * This used to be a `node -e "…"` inside scripts/verify.sh and it should never
 * have been. The script is shell-quoted with double quotes, so the moment the
 * JavaScript inside it needed a double quote or a backtick, the shell ate them:
 * a template literal became command substitution and the whole block failed. It
 * was also suffixed `2>/dev/null || true`, so it failed SILENTLY, and the first
 * anybody knew was ten browser suites going red for a reason that had nothing to
 * do with what they test.
 *
 * A file has no quoting problem and its exit code is honest. Every step here is
 * printed, so "it did not run" and "it ran and did nothing" stop looking the same.
 *
 * Everything below touches the TEST database only, and none of it is something
 * the product does to itself.
 */
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const { q } = require('../server/db.js');

const say = m => console.log('   ' + m);

/* 1. Sign-in lockouts and rate-limit hits carried over from an earlier run.
      The suite signs in wrongly on purpose — that is how it proves a refused
      sign-in says the same thing whether or not the account exists — and since
      those counters moved into the database they survive between runs. Two runs
      inside a quarter of an hour then turn a 401 into a 429 and the gate goes
      red for a reason that is not in the code. */
const locks = await q.val('SELECT COUNT(*) c FROM throttle_locks');
await q.run('DELETE FROM throttle_locks');
await q.run('DELETE FROM throttle_hits');
say(locks ? 'cleared ' + locks + ' carried-over sign-in lockout(s)' : 'no carried-over lockouts');

/* 2. The demo student is marked as placed.
      Since block 3.5 an unplaced learner is redirected off every learner page to
      /prep/xep-lop/ — deliberately; it is what makes the placement compulsory.
      The suites that drive the library, the exam runner and the self-study area
      are not testing that, and left unplaced they all fail on the same redirect,
      which reads as ten broken features instead of one guard doing its job.
      scripts/test-placement.mjs registers its own account and proves the guard
      from the state a real new learner is in. */
const uid = await q.val("SELECT id FROM users WHERE username = 'student'");
if (!uid) {
  say('no demo student in this database yet — nothing to place');
} else {
  const now = new Date().toISOString();
  await q.run(
    'INSERT INTO placements (user_id, status, rung, level, asked_json, right_json,' +
    ' started_at, done_at, placed_level, placed_score)' +
    " VALUES (?, 'done', 3, 'B1', '[]', '[6,4,4]', ?, ?, 'B1', 7)" +
    " ON CONFLICT(user_id) DO UPDATE SET status = 'done'",
    uid, now, now);
  /* Read back rather than assumed. The point of this file is that a setup step
     which quietly does nothing is worse than one that fails. */
  const status = await q.val('SELECT status FROM placements WHERE user_id = ?', uid);
  if (status !== 'done') throw new Error('the demo student is still ' + status);
  say('demo student marked as placed');
}
