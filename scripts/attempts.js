#!/usr/bin/env node
/**
 * Clearing out sittings, so a real cohort starts on an empty page.
 *
 * The platform ships with eight seeded learner accounts and the sittings that
 * belong to them. They exist so that a fresh install has a dashboard with
 * something on it rather than five empty states — and the day the first real
 * class arrives, they are in the way: the marking queue says "56 answers
 * waiting" and every one of them is fiction.
 *
 *   node scripts/attempts.js list
 *       Every sitting, grouped by account, marked demo or real. Start here:
 *       it is your data, and you can see it and I cannot.
 *
 *   node scripts/attempts.js pending
 *       How many submitted sittings still have no overall band, and which
 *       skills are waiting. The number to check either side of pasting a key.
 *
 * ## Stop the server first
 *
 * None of these commands is read-only, including `list`, and the docstring here
 * used to say it was. Requiring `server/db` runs the schema migration and the
 * seed at module scope — that is what makes a fresh install work — so merely
 * loading this tool rewrites the seeded papers' sections. Measured: three runs
 * of `list` against one database produced three different file hashes.
 *
 * Two consequences. It takes a write lock on a database PM2's server is holding
 * open, and cross-process that is SQLite's own locking with a 5-second
 * busy_timeout, so a long purge can make the running server throw SQLITE_BUSY
 * at whoever is on the site. And `list` is not the safe look-before-you-leap it
 * was described as. Run these with `pm2 stop preptest`, or knowingly accept
 * both.
 *
 *   node scripts/attempts.js purge                 (the eight seeded accounts)
 *   node scripts/attempts.js purge --user=<name>   (one account)
 *   node scripts/attempts.js purge --all           (every sitting, whoever owns it)
 *
 *       Says what it WOULD remove and stops. Add --yes to actually do it.
 *
 * ## Three things this is careful about
 *
 * **It defaults to the narrow scope.** `purge` with no scope touches only the
 * accounts the seed created. `--all` exists because a clean slate is a real
 * thing to want, but it has to be typed.
 *
 * **It is a dry run until told otherwise.** Every destructive tool that reads
 * "are you sure? [y/N]" gets a reflexive y within a week. Printing the damage
 * and exiting means the confirmation is a separate, deliberate command with the
 * numbers already on screen.
 *
 * **It takes the ability events with it.** Deleting a sitting cascades to its
 * parts, answers, scores, rubric marks and marking backlog — the foreign keys
 * do that. `skill_events` is NOT among them: it is keyed on
 * (source='exam', ref_id=<attempt id>) with no foreign key, because the ability
 * model is fed by five different sources and cannot hang off one table. Leave
 * those rows behind and the learner's estimated band still reflects work that
 * no longer exists — a dashboard confidently reporting a number with nothing
 * underneath it, which is the exact failure server/ability.js was written to
 * avoid.
 *
 * What it deliberately does NOT delete: `ai_calls`. That is the spend ledger
 * behind the daily ceilings, not learner work. Erasing it would reset a limit
 * that exists to bound a bill.
 */
'use strict';

const { db, q, tx, nowISO, DEMO_USERNAMES } = require('../server/db');
const storage = require('../server/storage');

const argv = process.argv.slice(2);
const verb = argv[0] || 'list';
const has = f => argv.includes('--' + f);
const opt = f => {
  const hit = argv.find(a => a.startsWith('--' + f + '='));
  return hit ? hit.slice(f.length + 3) : null;
};

const plural = (n, one, many) => n + ' ' + (n === 1 ? one : (many || one + 's'));

/* ------------------------------------------------------------------ *
 * What is there
 * ------------------------------------------------------------------ */

function rows() {
  return db.prepare(`
    SELECT a.id, a.status, a.started_at, a.submitted_at,
           u.id AS user_id, u.username, u.name,
           (SELECT COUNT(*) FROM attempt_answers x WHERE x.attempt_id = a.id) AS answers,
           (SELECT COUNT(*) FROM attempt_answers x
             WHERE x.attempt_id = a.id AND x.earned IS NULL) AS unmarked
      FROM attempts a
      LEFT JOIN users u ON u.id = a.user_id
     ORDER BY u.username, a.started_at`).all();
}

/* Two kinds of not-real, and the second one was missing.
 *
 * `DEMO_USERNAMES` is the eight accounts the seed creates. But the seed creates
 * no SITTINGS, so on a box that has been tested rather than freshly installed,
 * most of the fiction is not under those names at all: every suite in scripts/
 * signs up throwaway accounts on `@thu-nghiem.vn` — thử nghiệm, trial — and
 * their papers are what fills the marking queue.
 *
 * With only the first list, `purge` cleared the seeded accounts, left the rest,
 * and printed them as "⚠ NOT seeded … That is real work. There is no undo."
 * They are not real work, and the warning pushed the operator to `--all`, which
 * is the one flag that also takes a genuine cohort's papers with it. */
const TEST_DOMAIN = /@thu-nghiem\.vn$/i;
const isDemo = r => DEMO_USERNAMES.includes(r.username) || TEST_DOMAIN.test(r.username || '');
const kindOf = r => (DEMO_USERNAMES.includes(r.username) ? 'demo' : TEST_DOMAIN.test(r.username || '') ? 'test' : 'REAL');

function summarise(list) {
  const byUser = new Map();
  for (const r of list) {
    const k = r.username || '(deleted account)';
    if (!byUser.has(k)) byUser.set(k, { username: k, demo: isDemo(r), kind: kindOf(r), n: 0, unmarked: 0, submitted: 0 });
    const g = byUser.get(k);
    g.n++;
    g.unmarked += r.unmarked;
    if (r.status === 'submitted') g.submitted++;
  }
  return [...byUser.values()].sort((a, b) => Number(a.demo) - Number(b.demo) || a.username.localeCompare(b.username));
}

function printTable(groups) {
  if (!groups.length) { console.log('  (none)'); return; }
  const w = Math.max(12, ...groups.map(g => g.username.length));
  console.log('  ' + 'ACCOUNT'.padEnd(w) + '  KIND   SITTINGS  SUBMITTED  UNMARKED');
  for (const g of groups) {
    console.log('  ' + g.username.padEnd(w) + '  ' +
      g.kind.padEnd(6) + ' ' +
      String(g.n).padStart(8) + String(g.submitted).padStart(11) + String(g.unmarked).padStart(10));
  }
}

/* ------------------------------------------------------------------ *
 * Commands
 * ------------------------------------------------------------------ */

/* async, like purge(), so the dispatcher at the bottom can `.catch` both the
   same way. It was sync, which made COMMANDS[verb]() return undefined and the
   catch throw a TypeError AFTER printing a perfectly good table — a tool that
   works and then reports a crash is a tool nobody trusts. */
async function list() {
  const all = rows();
  const groups = summarise(all);
  console.log('\nSittings in ' + require('../server/db').DB_FILE + '\n');
  printTable(groups);
  const demo = all.filter(isDemo).length;
  console.log('\n  ' + plural(all.length, 'sitting') + ' in total: ' +
    demo + ' from seeded or test accounts, ' + (all.length - demo) + ' from real ones.');
  console.log('  ' + plural(all.reduce((n, r) => n + r.unmarked, 0), 'answer') + ' still unmarked.\n');
  if (all.length - demo > 0) {
    console.log('  Accounts marked REAL are not in the seed list. `purge` leaves them alone');
    console.log('  unless you pass --all.\n');
  }
}

/**
 * How much is still waiting for the marker — the number to watch either side of
 * pasting a key.
 *
 * This existed in docs/VAN-HANH.md as two `sqlite3` queries, and the `sqlite3`
 * CLI is not installed by deploy/ec2-bootstrap.sh, is not in the Dockerfile,
 * and is not something Ubuntu server ships: the platform talks to SQLite
 * through node:sqlite and never needed it. So the one command the operator runs
 * to check the marking is working exited `command not found`. Same queries,
 * through the connection the platform already has.
 */
async function pending() {
  const owed = db.prepare(`
    SELECT COUNT(*) AS n FROM attempts a
     WHERE a.status='submitted'
       AND NOT EXISTS (SELECT 1 FROM attempt_scores s
                        WHERE s.attempt_id=a.id AND s.skill='overall' AND s.pending=0)`).get();
  const bySkill = db.prepare(
    'SELECT skill, COUNT(*) AS n FROM attempt_scores WHERE pending=1 GROUP BY skill ORDER BY skill').all();

  console.log('\n  ' + plural(owed.n, 'submitted sitting') + ' with no overall band yet.\n');
  if (bySkill.length) {
    console.log('  Still pending, by skill:');
    for (const r of bySkill) console.log('    ' + r.skill.padEnd(10) + String(r.n).padStart(5));
    const skills = bySkill.map(r => r.skill);
    if (skills.includes('speaking') && !skills.includes('writing')) {
      console.log('\n  Only speaking is left, which means the transcription endpoint is not');
      console.log('  configured. That is the design, not a fault — see docs/VAN-HANH.md §1 step 3.');
    }
  } else {
    console.log('  Nothing is pending.');
  }
  console.log('');
}

async function purge() {
  const all = rows();
  const user = opt('user');
  let scope, chosen;

  if (has('all')) {
    scope = 'every sitting on this server';
    chosen = all;
  } else if (user) {
    scope = 'the sittings belonging to @' + user;
    chosen = all.filter(r => r.username === user);
    if (!chosen.length && !all.some(r => r.username === user)) {
      const known = [...new Set(all.map(r => r.username))].filter(Boolean);
      console.error('No sittings for "' + user + '". Accounts with sittings: ' + (known.join(', ') || '(none)'));
      process.exit(1);
    }
  } else {
    scope = 'the sittings belonging to the ' + DEMO_USERNAMES.length
      + ' seeded accounts and to any @thu-nghiem.vn test account';
    chosen = all.filter(isDemo);
  }

  if (!chosen.length) {
    console.log('\nNothing to remove: ' + scope + ' is already empty.\n');
    return;
  }

  const groups = summarise(chosen);
  const real = groups.filter(g => !g.demo);

  console.log('\nAbout to remove ' + scope + ':\n');
  printTable(groups);
  /* Collected before the delete, because after it the rows are gone and these
     objects are unreachable — storage.remove() is only ever called when a
     recording is REPLACED, so nothing else would have cleaned them up. 56
     sittings can carry over a thousand of them. */
  const audio = chosen.length
    ? db.prepare(`SELECT audio_key FROM attempt_answers
                   WHERE audio_key IS NOT NULL AND audio_key <> ''
                     AND attempt_id IN (${chosen.map(() => '?').join(',')})`)
        .all(...chosen.map(r => r.id)).map(r => r.audio_key)
    : [];

  console.log('\n  ' + plural(chosen.length, 'sitting') + ', with their answers, scores, rubric');
  console.log('  marks, marking backlog and the ability events that came from them');
  console.log('  — and ' + plural(audio.length, 'recording') + ' from storage.');
  console.log('  The accounts themselves stay. The AI spend ledger stays.');

  if (real.length) {
    console.log('\n  ⚠ ' + plural(real.length, 'account') + ' in this list ' +
      (real.length === 1 ? 'is' : 'are') + ' NOT seeded: ' +
      real.map(g => '@' + g.username).join(', '));
    console.log('    That is real work. There is no undo.');
  }

  if (!has('yes')) {
    console.log('\n  This was a dry run. Nothing has changed.');
    console.log('  Run it again with --yes to do it:\n');
    console.log('      node scripts/attempts.js ' + argv.filter(a => a !== '--yes').join(' ') + ' --yes\n');
    return;
  }

  /* One transaction: a purge that half-applies leaves answers pointing at a
     sitting that is gone, which reads on screen as a paper with no questions. */
  const ids = chosen.map(r => r.id);
  let events = 0;
  await tx(async () => {
    for (const id of ids) {
      /* Before the cascade, or the id is gone and these cannot be found.
         `ref_id` is TEXT and the id is an integer, so it is compared as text. */
      const r = await q.run("DELETE FROM skill_events WHERE source='exam' AND ref_id=?", String(id));
      events += (r && r.changes) || 0;
      await q.run('DELETE FROM attempts WHERE id=?', id);
    }
    await q.run(
      'INSERT INTO audit (admin_id,admin_name,action,target,meta_json,ip,at) VALUES (?,?,?,?,?,?,?)',
      null, 'cli', 'attempts.purge', 'attempts',
      JSON.stringify({ source: 'scripts/attempts.js', scope, sittings: ids.length,
        skillEvents: events, recordings: audio.length }),
      null, nowISO());
  });

  /* After the commit, and best-effort. An object store cannot be rolled back,
     so removing the recordings inside the transaction would mean a late failure
     deleted somebody's audio and then put the rows back that pointed at it. In
     this order the worst case is an orphan, which is what we started with. */
  let gone = 0, kept = 0;
  for (const key of audio) {
    try { await storage.remove(key); gone++; } catch (e) { kept++; }
  }

  console.log('\n  Removed ' + plural(ids.length, 'sitting') + ' and ' +
    plural(events, 'ability event') + '.');
  if (audio.length) {
    console.log('  ' + plural(gone, 'recording') + ' deleted from storage'
      + (kept ? ', ' + kept + ' could not be reached and are now orphaned.' : '.'));
  }
  const left = rows();
  console.log('  ' + plural(left.length, 'sitting') + ' left, ' +
    plural(left.reduce((n, r) => n + r.unmarked, 0), 'answer') + ' unmarked.\n');
}

const COMMANDS = { list, pending, purge };
if (!COMMANDS[verb]) {
  console.error('Unknown command: ' + verb);
  console.error('Use one of: ' + Object.keys(COMMANDS).join(', '));
  process.exit(1);
}
COMMANDS[verb]().catch(e => {
  console.error(String((e && e.message) || e));
  process.exit(1);
});
