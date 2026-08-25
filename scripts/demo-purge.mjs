#!/usr/bin/env node
/**
 * Removing the seeded fixture accounts, so a real cohort is the only cohort.
 *
 *   node scripts/demo-purge.mjs           says what it WOULD remove and stops
 *   node scripts/demo-purge.mjs --yes     does it
 *
 * `scripts/attempts.js purge` clears the fixture SITTINGS and deliberately
 * leaves the accounts standing, because on a development box the eight seeded
 * learners are the reason the dashboard has anything on it. This tool is the
 * other half, and it exists for one moment: the migration onto a real database,
 * where those eight accounts stop being scaffolding and become eight fake
 * students in the owner's user list.
 *
 * ## Why this is not just `DELETE FROM users`
 *
 * The seed does not only create accounts. It creates a paid order for six of
 * them. On the box this was written against, EVERY order in the database was a
 * fixture — six rows marked `paid`, adding up to revenue that never happened.
 * Carry those across and the admin revenue report opens on a number that is
 * entirely invented, which is worse than an empty report: an empty report is
 * obviously empty.
 *
 * So the fixtures come out in the right order and by the right route:
 *
 *   · **Sittings first.** `attempts.user_id` is ON DELETE NO ACTION, on purpose
 *     — the database refuses to drop an account that has sat a paper, rather
 *     than quietly taking the sittings with it. So they are deleted explicitly,
 *     and the ability events that came from them go first, because they are
 *     keyed on (source, ref_id) with no foreign key to follow.
 *   · **Orders are deleted.** They are fiction, and `orders.user_id` is
 *     ON DELETE SET NULL, so leaving them to the cascade would turn six fake
 *     sales into six fake ANONYMOUS sales — still in the revenue total, now
 *     with nothing to trace them to.
 *   · **Codes are returned to the batch, not deleted.** A redeemed fixture code
 *     is a real code with a fictional redemption. The batch is inventory the
 *     owner counts and may still sell; deleting rows out of it would shrink it
 *     silently. The redemption is cleared and the code goes back to `unused`.
 *   · **Everything else rides the cascade.** Sessions, tokens, learn progress,
 *     placements, drills, revision sets and the remaining ability events are
 *     all ON DELETE CASCADE from `users`, and the schema is the right place for
 *     that list to live — a second copy here is how one eventually gets missed.
 *
 * ## Three things it is careful about
 *
 * **It cannot touch a real account.** The set of accounts is computed from
 * `DEMO_USERNAMES` — the same list the seed creates from and `attempts.js`
 * classifies with — plus the @thu-nghiem.vn test domain. Anything else is
 * refused, loudly, before a single statement runs.
 *
 * **It is a dry run until told otherwise.** The numbers go on screen and the
 * tool exits. Confirming is a separate command typed by somebody who has read
 * them.
 *
 * **It stops if there is nothing real left.** Deleting the fixtures out of a
 * database that has no real users produces an empty platform, and on the day
 * that happens by accident it will be because somebody ran this against the
 * wrong file. If no account survives the purge, it refuses.
 *
 * ## Stop the server first
 *
 * Requiring `server/db` runs the schema migration and the seed at module scope,
 * so this takes a write lock on a database a running server is holding open.
 * Same caveat as `scripts/attempts.js`, same fix: stop the service, or knowingly
 * accept that a long purge can hand SQLITE_BUSY to whoever is on the site.
 */
import { createRequire } from 'node:module';

const require_ = createRequire(import.meta.url);

const { db, q, tx, nowISO, DEMO_USERNAMES, engine } = require_('../server/db.js');
const storage = require_('../server/storage.js');

const argv = process.argv.slice(2);
const WRITE = argv.includes('--yes');
const TEST_DOMAIN = /@thu-nghiem\.vn$/i;

const plural = (n, w) => n + ' ' + w + (n === 1 ? '' : 's');
const bold = m => console.log('\n\x1b[1m' + m + '\x1b[0m');

/** The fixture accounts: the seeded eight, plus anything on the test domain. */
async function fixtureUsers() {
  const all = await q.all('SELECT id, username, email, name FROM users ORDER BY id');
  const isFixture = u =>
    DEMO_USERNAMES.includes(u.username) ||
    TEST_DOMAIN.test(u.username || '') ||
    TEST_DOMAIN.test(u.email || '');
  return { all, fixtures: all.filter(isFixture), real: all.filter(u => !isFixture(u)) };
}

async function main() {
  const { all, fixtures, real } = await fixtureUsers();

  bold('Accounts');
  console.log('  ' + plural(all.length, 'account') + ' in this database: '
    + fixtures.length + ' seeded fixture' + (fixtures.length === 1 ? '' : 's')
    + ', ' + plural(real.length, 'real account') + '.');

  if (!fixtures.length) {
    console.log('\n  Nothing to remove — this database has no fixture accounts.\n');
    return 0;
  }

  /* The guard that matters. A purge that empties the platform is not a purge,
     it is an outage, and the only way it happens is by being pointed at the
     wrong file. */
  if (!real.length) {
    console.error('\n  REFUSING: every account in this database is a fixture.');
    console.error('  Removing them all leaves a platform with no users at all, which');
    console.error('  is not something this tool will do unasked. If that is genuinely');
    console.error('  what you want, it is a fresh install — do not migrate at all.\n');
    return 1;
  }

  const ids = fixtures.map(u => u.id);
  const ph = ids.map(() => '?').join(',');

  /* Counted before anything is deleted, and read back afterwards, so the
     summary is measured rather than predicted. */
  const attempts = await q.all(`SELECT id FROM attempts WHERE user_id IN (${ph})`, ...ids);
  const attemptIds = attempts.map(r => r.id);
  const orders = await q.all(
    `SELECT id, amount, status FROM orders WHERE user_id IN (${ph})`, ...ids);
  const codes = await q.all(
    `SELECT id, code FROM codes WHERE user_id IN (${ph})`, ...ids);
  const paid = orders.filter(o => o.status === 'paid');
  const revenue = paid.reduce((n, o) => n + Number(o.amount || 0), 0);

  const audio = attemptIds.length
    ? (await q.all(
        `SELECT audio_key FROM attempt_answers
          WHERE audio_key IS NOT NULL AND audio_key <> ''
            AND attempt_id IN (${attemptIds.map(() => '?').join(',')})`, ...attemptIds))
        .map(r => r.audio_key)
    : [];

  bold('What comes out');
  for (const u of fixtures) console.log('  @' + u.username + (u.name ? '  — ' + u.name : ''));
  console.log('');
  console.log('  ' + plural(attemptIds.length, 'sitting') + ', with their parts, answers,');
  console.log('  scores, rubric marks, marking backlog and ability events');
  console.log('  ' + plural(orders.length, 'order') + ', of which ' + paid.length
    + ' marked paid, totalling ' + revenue.toLocaleString('vi-VN') + ' đ of revenue');
  console.log('  ' + plural(audio.length, 'recording') + ' from storage');
  console.log('  sessions, tokens, learn progress, placements, drills and revision sets');
  console.log('    (all ON DELETE CASCADE from users — the schema decides that list)');
  console.log('');
  console.log('  ' + plural(codes.length, 'redeemed code') + ' returned to the batch as unused,');
  console.log('  NOT deleted: the code is real inventory, only the redemption is fiction.');

  bold('What stays');
  for (const u of real) console.log('  @' + u.username + (u.name ? '  — ' + u.name : ''));

  if (!WRITE) {
    console.log('\n  This was a dry run on ' + engine + '. Nothing has changed.');
    console.log('  Run it again with --yes to do it:\n');
    console.log('      node scripts/demo-purge.mjs --yes\n');
    return 0;
  }

  /* One transaction. A purge that half-applies leaves orders pointing at an
     account that is gone and answers pointing at a sitting that is not there. */
  let events = 0;
  await tx(async () => {
    for (const id of attemptIds) {
      /* `ref_id` is TEXT and the id is an integer, so it is compared as text.
         These have no foreign key to follow — the ability model is fed by five
         sources and cannot hang off one table — so they go by hand, and they
         go BEFORE the attempt, or the id is gone and they cannot be found. */
      const r = await q.run("DELETE FROM skill_events WHERE source='exam' AND ref_id=?", String(id));
      events += (r && r.changes) || 0;
      await q.run('DELETE FROM attempts WHERE id=?', id);
    }
    await q.run(`DELETE FROM orders WHERE user_id IN (${ph})`, ...ids);
    await q.run(
      `UPDATE codes SET status='unused', user_id=NULL, redeemed_at=NULL, attempts_used=0
        WHERE user_id IN (${ph})`, ...ids);
    await q.run(`DELETE FROM users WHERE id IN (${ph})`, ...ids);
    await q.run(
      'INSERT INTO audit (admin_id,admin_name,action,target,meta_json,ip,at) VALUES (?,?,?,?,?,?,?)',
      null, 'cli', 'demo.purge', 'users',
      JSON.stringify({
        source: 'scripts/demo-purge.mjs',
        accounts: fixtures.map(u => u.username),
        sittings: attemptIds.length, orders: orders.length,
        codesReturned: codes.length, skillEvents: events
      }),
      null, nowISO());
  });

  /* After the commit, and best-effort. An object store cannot be rolled back,
     so removing recordings inside the transaction would mean a late failure
     deleted somebody's audio and then put back the rows that pointed at it. */
  let gone = 0, kept = 0;
  for (const key of audio) {
    try { await storage.remove(key); gone++; } catch { kept++; }
  }

  const after = await fixtureUsers();
  bold('Done');
  console.log('  ' + plural(fixtures.length, 'fixture account') + ' removed, '
    + plural(attemptIds.length, 'sitting') + ', ' + plural(orders.length, 'order')
    + ' and ' + plural(events, 'ability event') + ' with them.');
  console.log('  ' + plural(codes.length, 'code') + ' returned to the batch.');
  if (audio.length) {
    console.log('  ' + plural(gone, 'recording') + ' deleted from storage'
      + (kept ? ', ' + kept + ' could not be reached and are now orphaned.' : '.'));
  }
  console.log('  ' + plural(after.all.length, 'account') + ' left, '
    + after.fixtures.length + ' of them fixtures.\n');
  return after.fixtures.length ? 1 : 0;
}

main()
  .then(code => { db.close(); process.exit(code); })
  .catch(e => { console.error('\n' + (e && e.stack || e) + '\n'); process.exit(1); });
