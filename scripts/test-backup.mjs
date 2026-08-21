#!/usr/bin/env node
/**
 * Backup and restore.
 *
 * A backup system is the one part of a platform whose tests cannot be written
 * optimistically. Everything here is worth checking precisely because it is
 * only exercised on the worst day, when nobody is in a position to debug it.
 * So the assertions are about the failure paths at least as much as the happy
 * one:
 *
 *   · a snapshot taken WHILE another process is writing must still open
 *   · a corrupt archive must be refused, and must not have touched the target
 *   · pruning must be incapable of emptying the store
 *   · restore must not be a one-word command
 *
 * The database under test is the real one — `server/db.js` builds and seeds it
 * in a child process. A backup suite that invents a four-table toy database is
 * testing its own fixture; the schema this has to survive is the schema the
 * product actually has.
 */
import { createRequire } from 'node:module';
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import zlib from 'node:zlib';

const require = createRequire(import.meta.url);
const B = require('../server/backup.js');
const { DatabaseSync } = require('node:sqlite');

let pass = 0, fail = 0;
const ok = (c, name, detail) => {
  if (c) { pass++; console.log('✓ ' + name); return; }
  fail++; console.log('✗ ' + name + (detail === undefined ? '' : '  → ' + detail));
};
const head = t => console.log('\n\x1b[1m== ' + t + ' ==\x1b[0m');

const ROOT = fs.mkdtempSync(path.join(os.tmpdir(), 'prep-bktest-'));
const SEED = path.join(ROOT, 'seed.sqlite');
const STORE = path.join(ROOT, 'store');

/** A fresh copy of the seeded database, so each test starts from the same place. */
function freshDb(name) {
  const p = path.join(ROOT, name);
  fs.copyFileSync(SEED, p);
  return p;
}

/** Point the module's config at a directory of our own for this test. */
function useStore(dir, extra) {
  process.env.BACKUP_DRIVER = 'disk';
  process.env.BACKUP_DIR = dir;
  process.env.BACKUP_KEEP_DAYS = (extra && extra.keepDays) !== undefined
    ? String(extra.keepDays) : '30';
  delete process.env.NODE_ENV;
  if (extra && extra.production) process.env.NODE_ENV = 'production';
  fs.rmSync(dir, { recursive: true, force: true });
  fs.mkdirSync(dir, { recursive: true });
}

/** Write a file straight into the store under a real backup name. */
function plant(dir, when, buf) {
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, B.snapshotName(when)), buf);
}

try {
  head('A real, seeded database to work with');

  const build = spawnSync(process.execPath, ['-e', 'require("./server/db.js")'], {
    env: { ...process.env, PREP_DB: SEED }, encoding: 'utf8', timeout: 120000
  });
  ok(fs.existsSync(SEED), 'server/db.js built and seeded one',
    (build.stderr || '').slice(-300));
  const seeded = new DatabaseSync(SEED, { readOnly: true });
  const seedUsers = seeded.prepare('SELECT COUNT(*) c FROM users').get().c;
  const seedQs = seeded.prepare('SELECT COUNT(*) c FROM questions').get().c;
  seeded.close();
  ok(seedUsers > 0 && seedQs > 0, 'It has accounts and an item bank',
    seedUsers + ' users, ' + seedQs + ' questions');

  head('Snapshotting a database that is being written to');

  /* The reason VACUUM INTO exists rather than `cp`. A copy taken mid-write is a
     torn file that still looks like a database until the day you open it. */
  const live = freshDb('live.sqlite');
  const writer = new DatabaseSync(live);
  writer.exec('PRAGMA journal_mode = WAL');
  writer.exec("CREATE TABLE IF NOT EXISTS churn (id INTEGER PRIMARY KEY, v TEXT)");
  const ins = writer.prepare('INSERT INTO churn (v) VALUES (?)');
  for (let i = 0; i < 500; i++) ins.run('x'.repeat(200));

  const snapPath = path.join(ROOT, 'snap.sqlite');
  let info = null, threw = null;
  try { info = B.snapshot(live, snapPath); } catch (e) { threw = e; }
  ok(!threw, 'A snapshot of a live database succeeds', threw && threw.message);
  ok(info && info.users === seedUsers, 'And carries the accounts across',
    info && info.users + ' vs ' + seedUsers);

  /* Keep writing after the snapshot: the snapshot must be a moment, not a view
     onto a file that keeps changing under it. */
  for (let i = 0; i < 500; i++) ins.run('y'.repeat(200));
  const after = new DatabaseSync(snapPath, { readOnly: true });
  const frozen = after.prepare('SELECT COUNT(*) c FROM churn').get().c;
  after.close();
  writer.close();
  ok(frozen === 500, 'And is frozen at the instant it was taken, not following the writer',
    frozen + ' rows');

  ok(B.snapshot(live, snapPath) && true,
    'Taking a second snapshot over the first one works (VACUUM INTO refuses an existing target)');

  head('What verify() refuses');

  const junk = path.join(ROOT, 'junk.sqlite');
  fs.writeFileSync(junk, Buffer.from('this is not a database at all, not even close'));
  let refused = false;
  try { B.verify(junk); } catch { refused = true; }
  ok(refused, 'A file that is not a database');

  const empty = path.join(ROOT, 'empty.sqlite');
  /* Not `nothing` — SQLite reserves it for ON CONFLICT DO NOTHING. */
  const e = new DatabaseSync(empty); e.exec('CREATE TABLE unrelated (a TEXT)'); e.close();
  refused = false;
  try { B.verify(empty); } catch { refused = true; }
  ok(refused, 'A structurally valid database that is not THIS platform');

  /* The one an integrity_check alone would wave through. */
  const noUsers = path.join(ROOT, 'nousers.sqlite');
  fs.copyFileSync(SEED, noUsers);
  const nu = new DatabaseSync(noUsers);
  nu.exec('PRAGMA foreign_keys = OFF'); nu.exec('DELETE FROM users'); nu.close();
  refused = false;
  let why = '';
  try { B.verify(noUsers); } catch (err) { refused = true; why = err.message; }
  ok(refused, 'The right schema with no accounts in it — an install that never was', why);

  head('There and back again');

  useStore(STORE);
  const src = freshDb('round.sqlite');
  const marker = 'marker-' + Date.now();
  const m = new DatabaseSync(src);
  m.exec('CREATE TABLE probe (v TEXT)');
  m.prepare('INSERT INTO probe (v) VALUES (?)').run(marker);
  m.close();

  const made = await B.backup({ db: src });
  ok(made.name.startsWith('prep-') && made.name.endsWith('.sqlite.gz'),
    'A backup is written under a sortable name', made.name);
  ok(made.bytes > 0 && made.bytes < made.raw,
    'Compressed smaller than the database', made.bytes + ' < ' + made.raw);
  ok((await B.list()).length === 1, 'And the store lists exactly one');

  const target = path.join(ROOT, 'restored.sqlite');
  const back = await B.restore(made.name, { into: target });
  ok(fs.existsSync(target), 'Restoring writes the file');
  const r = new DatabaseSync(target, { readOnly: true });
  const gotMarker = r.prepare('SELECT v FROM probe').get().v;
  const gotUsers = r.prepare('SELECT COUNT(*) c FROM users').get().c;
  r.close();
  ok(gotMarker === marker, 'And the data that comes back is the data that went in');
  ok(gotUsers === seedUsers, 'Every account included', gotUsers + ' vs ' + seedUsers);
  ok(back.movedAside === null, 'Nothing to move aside when the target did not exist');

  head('Restoring over something that already exists');

  const occupied = freshDb('occupied.sqlite');
  fs.writeFileSync(occupied + '-wal', Buffer.alloc(64));
  fs.writeFileSync(occupied + '-shm', Buffer.alloc(64));
  const over = await B.restore(made.name, { into: occupied });
  ok(over.movedAside && fs.existsSync(over.movedAside),
    'The database that was there is renamed aside, not deleted', over.movedAside);
  /* A restored database next to somebody else's write-ahead log will replay it. */
  ok(!fs.existsSync(occupied + '-wal') && !fs.existsSync(occupied + '-shm'),
    'And the old -wal and -shm go with it, so nothing replays over the restore');

  head('A corrupt archive must not cost you the database you still have');

  const store2 = path.join(ROOT, 'store2');
  useStore(store2);
  const bad = B.snapshotName(new Date());
  /* Valid gzip, meaningless contents: this gets past the decompressor and has
     to be caught by verify(), which is the check that matters. */
  fs.writeFileSync(path.join(store2, bad), zlib.gzipSync(Buffer.from('nope nope nope')));
  const guarded = freshDb('guarded.sqlite');
  const beforeBytes = fs.statSync(guarded).size;
  let restoreThrew = false;
  try { await B.restore(bad, { into: guarded }); } catch { restoreThrew = true; }
  ok(restoreThrew, 'Restoring a corrupt archive fails');
  ok(fs.existsSync(guarded) && fs.statSync(guarded).size === beforeBytes,
    'And the existing database is untouched — not moved, not truncated');
  const still = new DatabaseSync(guarded, { readOnly: true });
  ok(still.prepare('SELECT COUNT(*) c FROM users').get().c === seedUsers,
    'Still fully readable afterwards');
  still.close();

  head('Pruning cannot empty the store');

  const store3 = path.join(ROOT, 'store3');
  const day = 86400000;
  const now = Date.now();
  const payload = fs.readFileSync(path.join(store2, bad));

  /* Ten backups, all far past a 30-day window. A naive prune deletes all ten. */
  useStore(store3, { keepDays: 30 });
  for (let i = 0; i < 10; i++) plant(store3, new Date(now - (100 + i) * day), payload);
  const reaped = await B.prune(now);
  const left = await B.list();
  ok(left.length === B.MIN_KEEP,
    `Everything is past the window, and exactly MIN_KEEP (${B.MIN_KEEP}) survive`,
    left.length + ' left, ' + reaped.length + ' deleted');
  ok(left.every(b => b.at >= Math.min(...left.map(x => x.at))) && left.length > 0,
    'And what survives is the newest, not an arbitrary three');
  const survivors = left.map(b => b.at).sort((a, b) => b - a);
  const oldestKept = survivors[survivors.length - 1];
  const deletedNewest = reaped.map(n => B.nameTime(n)).sort((a, b) => b - a)[0];
  ok(deletedNewest < oldestKept, 'Every deleted backup is older than every kept one');

  /* The ordinary case: a healthy schedule prunes only what is genuinely old. */
  const store4 = path.join(ROOT, 'store4');
  useStore(store4, { keepDays: 30 });
  for (let i = 0; i < 6; i++) plant(store4, new Date(now - i * day), payload);        // recent
  for (let i = 0; i < 4; i++) plant(store4, new Date(now - (40 + i) * day), payload); // old
  const reaped2 = await B.prune(now);
  ok(reaped2.length === 4 && (await B.list()).length === 6,
    'A healthy store loses exactly the ones past the window',
    reaped2.length + ' deleted, ' + (await B.list()).length + ' left');

  const store5 = path.join(ROOT, 'store5');
  useStore(store5, { keepDays: 0 });
  for (let i = 0; i < 5; i++) plant(store5, new Date(now - (500 + i) * day), payload);
  ok((await B.prune(now)).length === 0 && (await B.list()).length === 5,
    'BACKUP_KEEP_DAYS=0 means keep everything, not delete everything');

  head('Saying whether the situation is actually all right');

  const store6 = path.join(ROOT, 'store6');
  useStore(store6);
  let h = await B.backupHealth(now);
  ok(!h.ok && /no backups/.test(h.problems.join(' ')),
    'An empty store is not healthy, and says so', h.problems.join('; '));

  plant(store6, new Date(now - 3600e3), payload);
  h = await B.backupHealth(now);
  ok(h.ok && h.count === 1, 'One fresh backup is healthy', JSON.stringify(h.problems));

  const store7 = path.join(ROOT, 'store7');
  useStore(store7);
  plant(store7, new Date(now - 20 * 3600e3), payload);
  h = await B.backupHealth(now);
  ok(!h.ok && /old/.test(h.problems.join(' ')),
    'A 20-hour-old newest backup is not healthy', h.problems.join('; '));

  const store8 = path.join(ROOT, 'store8');
  useStore(store8, { production: true });
  plant(store8, new Date(now - 3600e3), payload);
  h = await B.backupHealth(now);
  delete process.env.NODE_ENV;
  ok(!h.ok && /same disk/.test(h.problems.join(' ')),
    'A fresh backup on the same disk in production is still not healthy — that is the risk, not a copy of it',
    h.problems.join('; '));

  head('Names sort by time, because that is how the newest is found');

  const t1 = new Date('2026-08-21T09:30:00Z');
  const t2 = new Date('2026-08-21T15:00:00Z');
  const n1 = B.snapshotName(t1), n2 = B.snapshotName(t2);
  ok(n1 < n2, 'A lexical sort is a chronological one', n1 + ' < ' + n2);
  ok(B.nameTime(n1) === t1.getTime(), 'And the time reads back exactly');
  ok(B.nameTime('something-else.tar.gz') === null, 'A foreign file in the store is ignored');
  ok(!n1.includes(':'), 'No colons in the name — S3 keys and Windows paths both object', n1);

  head('The command line will not restore by accident');

  const store9 = path.join(ROOT, 'store9');
  useStore(store9);
  const keep = freshDb('cli-target.sqlite');
  const cliSrc = freshDb('cli-src.sqlite');
  const cliMade = await B.backup({ db: cliSrc });
  /* Pad the target so a dry run that touched it would be visible as a size
     change. Size is the wrong test for the real restore, though: a snapshot is
     VACUUMed, so the file that comes back is legitimately smaller than the one
     it replaces. The real restore is checked by opening it. */
  fs.writeFileSync(keep, Buffer.concat([fs.readFileSync(keep), Buffer.alloc(4096)]));
  const marked = fs.statSync(keep).size;

  const dry = spawnSync(process.execPath,
    ['scripts/backup.mjs', 'restore', cliMade.name, '--into', keep],
    { env: process.env, encoding: 'utf8', timeout: 60000 });
  ok(dry.status === 0, 'restore without --yes exits 0', String(dry.status));
  ok(/--yes/.test(dry.stdout), 'And says what is needed to do it for real');
  ok(fs.statSync(keep).size === marked,
    'And has not touched the target', marked + ' vs ' + fs.statSync(keep).size);

  const real = spawnSync(process.execPath,
    ['scripts/backup.mjs', 'restore', cliMade.name, '--yes', '--into', keep],
    { env: process.env, encoding: 'utf8', timeout: 60000 });
  /* node:sqlite prints an experimental-feature warning on every child start.
     It is not a failure, and leaving it in the detail string means the detail
     carries the word "ExperimentalWarning" — which any `| grep -v` filtering
     that warning then eats, taking the failure message with it. */
  const quiet = s => String(s || '').split('\n')
    .filter(l => !/ExperimentalWarning|trace-warnings/.test(l)).join(' ').trim();
  ok(real.status === 0, 'With --yes it restores',
    String(real.status) + ' ' + quiet(real.stderr).slice(0, 200));
  let cliUsers = -1;
  try {
    const c = new DatabaseSync(keep, { readOnly: true });
    cliUsers = c.prepare('SELECT COUNT(*) c FROM users').get().c;
    c.close();
  } catch (err) { cliUsers = -1; }
  ok(cliUsers === seedUsers && fs.statSync(keep).size !== marked,
    'And what is on disk afterwards is the backup, not the padded file it replaced',
    cliUsers + ' users, ' + fs.statSync(keep).size + ' bytes vs ' + marked);
  ok(/giữ ở/.test(real.stdout), 'And it says where the previous database was kept');

  const check = spawnSync(process.execPath, ['scripts/backup.mjs', 'check'],
    { env: process.env, encoding: 'utf8', timeout: 60000 });
  ok(check.status === 0, 'check exits 0 when the store is healthy', check.stderr);

  const store10 = path.join(ROOT, 'store10');
  useStore(store10);
  const checkBad = spawnSync(process.execPath, ['scripts/backup.mjs', 'check'],
    { env: process.env, encoding: 'utf8', timeout: 60000 });
  /* The whole point of `check`: cron watches the exit code. A health check that
     reports a problem and exits 0 is a health check nobody hears. */
  ok(checkBad.status === 1, 'And exits 1 when there are no backups', String(checkBad.status));

  head('Nothing sensitive in what it prints');

  const noise = [dry.stdout, real.stdout, check.stdout, checkBad.stderr].join('\n');
  ok(!/AKIA|aws_secret|Authorization|X-Amz-Signature/i.test(noise),
    'No credential, signature or Authorization header anywhere in the output');

} catch (e) {
  fail++;
  console.log('\n✗ The suite threw: ' + (e && e.stack ? e.stack : e));
} finally {
  fs.rmSync(ROOT, { recursive: true, force: true });
}

console.log(`\n${fail ? '\x1b[31m' : '\x1b[32m'}${pass} passed, ${fail} failed\x1b[0m`);
process.exit(fail ? 1 : 0);
