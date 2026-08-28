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

/* 3. Test papers left behind by a suite that threw before its own cleanup.
      scripts/test-admin.mjs creates "Automated test paper" and archives it at
      the end; when it dies in the middle, the row stays PUBLISHED with a
      section called Reading and no blueprint part letter, and every later run
      of test-items.mjs fails on it. That is a run failing because of what the
      PREVIOUS run left behind, which is the whole reason this file exists.
      Archived rather than deleted: DELETE trips a foreign key once anything has
      been sat against the paper, and archiving is enough to take it out of the
      catalogue and out of the blueprint checks. */
const strays = await q.all(
  "SELECT id FROM tests WHERE status = 'published' AND id LIKE '%automated-test-paper%'");
for (const t of strays) {
  await q.run("UPDATE tests SET status = 'archived' WHERE id = ?", t.id);
}
say(strays.length ? 'archived ' + strays.length + ' stray test paper(s)' : 'no stray test papers');

/* 3b. Questions left behind by earlier runs.
      The suites create questions — to attach audio to, to test the editor, to
      fill a draft paper — and most of them are never removed. They accumulate:
      by the time this was written the gate database held 284 seeded bank items
      and 274 leftovers, nearly twice the intended size.

      That is not merely untidy, and it caused a real false alarm. The admin
      question listing is capped at 200 rows a page, so once the bank plus the
      residue passed 200 the Part G items — which are old, and the listing is
      newest-first — fell off the end, and test-admin.mjs reported "this group
      has 0 recordings" about a bank that was perfectly intact. A gate failing
      because of what previous runs left behind is exactly what this file is
      for. (The truncation guard in that suite was also wrong and has been
      fixed; both had to be, because either one alone still fails eventually.)

      Only rows with no `ext_key` — nothing the seed authored — and only those
      no paper points at, so a question that has been sat against is left alone
      and the foreign key cannot trip. */
const leftover = await q.all(
  `SELECT id FROM questions
    WHERE ext_key IS NULL
      AND id NOT IN (SELECT question_id FROM section_items)`);
for (const row of leftover) {
  await q.run('DELETE FROM questions WHERE id = ?', row.id);
}
say(leftover.length
  ? 'removed ' + leftover.length + ' question(s) left by earlier runs'
  : 'no leftover questions');

/* 4. The day's AI marking budget, spent by earlier runs on the demo accounts.
      server/ai-budget.js allows 240 calls per account per rolling 24 hours, and
      the marking suites drive a real paper through a stubbed marker every time
      they run. Six or seven runs in a day and the demo student is at exactly
      240; the next run is refused with `stopped: "account"`, and what the gate
      prints is nine red checks in test-rubric.mjs about criteria not being
      stored, a cap not firing and a mark coming back null — none of which is
      what went wrong. The ceiling worked. The ledger was simply full.

      Only the accounts the gate itself drives are cleared, and only their own
      rows: `ai_calls` is the cost trail, so a real learner's marking history is
      not something a setup script may quietly delete. The demo student and the
      administrator are seeded by this repository, and `@thu-nghiem.vn` is the
      throwaway domain the suites register under (scripts/attempts.js knows the
      same convention). Nothing else is touched — including the platform-wide
      6000 the rows still count toward, which no run has ever come near. */
const ledger = await q.all(
  `SELECT id FROM users
    WHERE username IN ('student', 'admin') OR email LIKE '%@thu-nghiem.vn'`);
let spent = 0;
for (const u of ledger) {
  const r = await q.run('DELETE FROM ai_calls WHERE user_id = ?', u.id);
  spent += (r && r.changes) || 0;
}
say(spent ? 'cleared ' + spent + ' AI call(s) from the demo accounts\' daily budget'
          : 'no AI budget carried over');
