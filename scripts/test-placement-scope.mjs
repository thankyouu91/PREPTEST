/**
 * The placement test must only mark the items it dealt.
 *
 * `placement.answer()` took whatever `{questionId, answer}` pairs the browser
 * sent and looked every one of them up in `questions` — no check that the item
 * had ever been part of this learner's draw. Three things fell out of that:
 *
 *  1. **An answer-key oracle over the whole bank.** The reply carries
 *     `rungRight`, the number of posted items that marked correct. Post one
 *     unknown item with a guessed answer and the count says whether the guess
 *     was right. The bank is shared with the real papers.
 *  2. **A placed level you can choose.** `right` drives `nextLevel()` and
 *     `settle()`, so posting items you already know the answers to places you
 *     wherever you like.
 *  3. **Ability evidence for work never done.** Every marked item is written to
 *     `skill_events` at weight 1 — the same weight as a real timed paper.
 *
 * server/drills.js and server/revision.js both guard this ("Only the items this
 * drill actually served"). Placement was the one answer path that did not.
 *
 * Runs against the model rather than over HTTP: the defect is in what
 * answer() agrees to mark, and a route test would be testing the route.
 *
 * Run: node scripts/test-placement-scope.mjs
 */
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const { q } = require('../server/db.js');
const placement = require('../server/placement.js');

const out = [];
const check = (n, ok, extra) => out.push({ n, ok: !!ok, extra });
const jlen = s => { try { return JSON.parse(s).length; } catch { return -1; } };

const stamp = String(process.hrtime.bigint()).slice(-9);
const name = 'scope-probe-' + stamp;
let userId = 0;

try {
  await q.run(
    `INSERT INTO users (username, email, name, pass_hash, verified, status, created_at)
     VALUES (?,?,?,?,1,'active',?)`,
    name, name + '@example.invalid', 'Scope probe', 'x', new Date().toISOString());
  userId = await q.val('SELECT id FROM users WHERE username=?', name);

  const dealt = await placement.start(userId);
  if (dealt.error || !(dealt.items || []).length) {
    console.log('· no placement items in the bank at ' + (dealt.level || '?') + ' — skipping.');
    process.exit(0);
  }
  const mine = new Set(dealt.items.map(i => i.questionId));
  check('The placement deals a rung', mine.size > 0, mine.size + ' items');

  /* Reloading the page must hand back the SAME six. drawRung() excludes
     everything already in asked_json, so before rung_json existed a reload dealt
     six brand new items and orphaned the ones on screen — which, once answer()
     marks only the current rung, would throw away a rung the learner had already
     worked through. */
  const again = await placement.start(userId);
  check('Resuming hands back the same rung',
    JSON.stringify((again.items || []).map(i => i.questionId)) === JSON.stringify([...mine]),
    JSON.stringify((again.items || []).map(i => i.questionId)));
  check('and does not grow the asked list',
    jlen(await q.val('SELECT asked_json FROM placements WHERE user_id=?', userId)) === mine.size,
    await q.val('SELECT asked_json FROM placements WHERE user_id=?', userId));

  /* An item that is real, markable, and NOT in this learner's draw — which is
     exactly what an attacker posts. Its own answer key is used, so if the
     server marks it at all it marks it CORRECT: this test cannot pass by
     accident on a wrong guess. */
  const stranger = await q.get(
    `SELECT id, answer FROM questions
      WHERE type='mcq' AND answer IS NOT NULL AND answer <> ''
        AND id NOT IN (${[...mine].map(() => '?').join(',')})
      LIMIT 1`, ...mine);
  if (!stranger) {
    console.log('· the bank holds no markable item outside the draw — skipping.');
    process.exit(0);
  }

  const before = await q.val('SELECT COUNT(*) c FROM skill_events WHERE user_id=?', userId);
  const reply = await placement.answer(userId, [
    { questionId: stranger.id, answer: stranger.answer }
  ]);

  check('An item outside my own draw is not marked',
    !reply.rungRight, 'rungRight ' + JSON.stringify(reply.rungRight));

  const after = await q.val('SELECT COUNT(*) c FROM skill_events WHERE user_id=?', userId);
  check('and records no ability evidence', after === before,
    before + ' → ' + after + ' skill_events');

  const leaked = await q.val(
    'SELECT COUNT(*) c FROM skill_events WHERE user_id=? AND item_key=?', userId, 'q' + stranger.id);
  check('and nothing lands under that question id', leaked === 0, leaked + ' row(s)');

  /* The guard must not break the test itself: a real answer to a real dealt
     item still marks and still counts. */
  const own = await q.get('SELECT id, answer FROM questions WHERE id=?', dealt.items[0].questionId);
  const second = await placement.answer(userId, [{ questionId: own.id, answer: own.answer }]);
  check('A dealt item still marks', second.rungRight === 1,
    'rungRight ' + JSON.stringify(second.rungRight));
  check('and is recorded',
    (await q.val('SELECT COUNT(*) c FROM skill_events WHERE user_id=? AND item_key=?',
      userId, 'q' + own.id)) === 1);

  /* And a rung cannot be answered with a previous rung's items: replaying six
     known-correct answers into rung 3 is the same inflation by another road. */
  if (!second.done && (second.items || []).length) {
    const replay = await placement.answer(userId, [{ questionId: own.id, answer: own.answer }]);
    check('A previous rung\'s item cannot be replayed into this one',
      !replay.rungRight, 'rungRight ' + JSON.stringify(replay.rungRight));
  }
} finally {
  if (userId) await q.run('DELETE FROM users WHERE id=?', userId);   // cascades
}

let bad = 0;
for (const r of out) {
  console.log((r.ok ? '✓ ' : '✗ ') + r.n + (r.ok || !r.extra ? '' : '  — ' + r.extra));
  if (!r.ok) bad++;
}
console.log('\n' + (out.length - bad) + '/' + out.length + ' checks passed');
process.exit(bad ? 1 : 0);
