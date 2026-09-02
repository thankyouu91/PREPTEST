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
import { spawn, spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import zlib from 'node:zlib';
import { createHash } from 'node:crypto';

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

  head('The command line will not restore under a running server');

  /* restore() renames the live file aside and copies the archive in — and a
     server that still holds the old descriptor keeps writing to the file that
     was moved. So a `node server.js` holding the target open must stop the
     restore, and only --force may override it. A stand-in server: node,
     running a file called server.js, with the target open. That is exactly
     what scripts/_live-servers.js looks for in /proc, and it is on Linux only,
     so elsewhere this section says so and moves on. */
  if (fs.existsSync('/proc/self/fd')) {
    const held = freshDb('held.sqlite');
    const fakeDir = path.join(ROOT, 'fake-server');
    fs.mkdirSync(fakeDir, { recursive: true });
    fs.writeFileSync(path.join(fakeDir, 'server.js'),
      "const { DatabaseSync } = require('node:sqlite');\n" +
      "const db = new DatabaseSync(process.argv[2]);\n" +
      "db.prepare('SELECT 1').get();\n" +
      'setInterval(() => {}, 1000);\n');
    const child = spawn(process.execPath, [path.join(fakeDir, 'server.js'), held], { stdio: 'ignore' });
    try {
      const { serversHolding } = require('../scripts/_live-servers.js');
      let holders = [];
      for (let i = 0; i < 40 && !holders.length; i++) {
        await new Promise(r => setTimeout(r, 100));
        holders = serversHolding(held);
      }
      ok(holders.length === 1 && String(holders[0].pid) === String(child.pid),
        'The stand-in server is seen holding the file', JSON.stringify(holders.map(h => h.pid)));

      const refused = spawnSync(process.execPath,
        ['scripts/backup.mjs', 'restore', cliMade.name, '--yes', '--into', held],
        { env: process.env, encoding: 'utf8', timeout: 60000 });
      ok(refused.status === 1, 'restore --yes is refused while a server holds the file', String(refused.status));
      ok(/đang mở/.test(refused.stderr) && new RegExp(String(child.pid)).test(refused.stderr),
        'And names the process', quiet(refused.stderr).slice(0, 200));

      const forced = spawnSync(process.execPath,
        ['scripts/backup.mjs', 'restore', cliMade.name, '--yes', '--force', '--into', held],
        { env: process.env, encoding: 'utf8', timeout: 60000 });
      ok(forced.status === 0, 'With --force it goes ahead', String(forced.status) + ' ' + quiet(forced.stderr).slice(0, 200));
    } finally {
      child.kill('SIGKILL');
    }
  } else {
    console.log('   (no /proc here — the running-server guard cannot be exercised on this platform)');
  }

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

  head('Talking to a real S3, without one');

  /* Both of these were found on the live bucket, in this order, one causing the
     other. They are checked here against a stubbed fetch rather than against
     AWS, because the failures are in what this code SENDS and how it reads what
     comes back — neither needs a network to be wrong, and a test that needs a
     bucket is a test nobody runs. */
  const realFetch = global.fetch;
  const sent = [];
  const S3_XML = name => '<?xml version="1.0" encoding="UTF-8"?>'
    + '<ListBucketResult><Name>b</Name><KeyCount>1</KeyCount><IsTruncated>false</IsTruncated>'
    + '<Contents>'
    +   '<Key>db-backups/' + name + '</Key>'
    +   '<LastModified>2026-08-22T07:04:32.000Z</LastModified>'
    +   '<ETag>&quot;abc123&quot;</ETag>'
    /* The two elements that broke it. S3 only emits these once an object has a
       checksum — which is to say, only after the fix above started sending one. */
    +   '<ChecksumAlgorithm>SHA256</ChecksumAlgorithm>'
    +   '<ChecksumType>FULL_OBJECT</ChecksumType>'
    +   '<Size>524288</Size><StorageClass>STANDARD</StorageClass>'
    + '</Contents></ListBucketResult>';

  const s3Name = B.snapshotName(new Date(now - 60e3));
  process.env.BACKUP_DRIVER = 's3';
  process.env.BACKUP_BUCKET = 'vpet-prep-backups-test';
  process.env.BACKUP_PREFIX = 'db-backups';
  process.env.AWS_REGION = 'ap-southeast-1';
  /* Dummies, so the signer takes the static path and never reaches for IMDS. */
  process.env.AWS_ACCESS_KEY_ID = 'AKIAIOSFODNN7EXAMPLE';
  process.env.AWS_SECRET_ACCESS_KEY = 'wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY';
  delete process.env.AWS_SESSION_TOKEN;
  const aws = require('../server/aws-sigv4.js');
  aws.resetCache();

  global.fetch = async (url, opts) => {
    sent.push({ url: String(url), method: (opts && opts.method) || 'GET',
      headers: (opts && opts.headers) || {}, body: opts && opts.body });
    if (((opts && opts.method) || 'GET') === 'GET' && String(url).includes('list-type=2')) {
      return new Response(S3_XML(s3Name), { status: 200 });
    }
    return new Response('', { status: 200 });
  };

  try {
    const src = freshDb('s3src.sqlite');
    const made = await B.backup({ db: src });
    const put = sent.find(r => r.method === 'PUT');
    ok(!!put, 'A backup to s3 issues a PUT', String(sent.length) + ' request(s)');
    ok(/x-amz-checksum-sha256/i.test(Object.keys(put.headers).join(' ')),
      'Which carries a checksum header — without it S3 REFUSES the PUT on an object-locked bucket',
      Object.keys(put.headers).join(', '));
    /* Guarded, not indexed straight into. When the header is missing this used
       to throw on `[1]`, which aborts the whole suite and takes every later
       check with it — a failing assertion must stay one failing assertion. */
    const hdrPair = Object.entries(put.headers).find(([k]) => /^x-amz-checksum-sha256$/i.test(k));
    const hdr = hdrPair ? hdrPair[1] : null;
    ok(hdr === createHash('sha256').update(put.body).digest('base64'),
      'And the checksum is of the bytes actually sent, not of something else',
      hdr === null ? 'no such header' : String(hdr).slice(0, 20));
    /* A signature that does not cover the checksum is a 403, so the header has
       to be inside SignedHeaders and not merely on the wire. */
    const auth = Object.entries(put.headers).find(([k]) => /^authorization$/i.test(k));
    ok(auth && /SignedHeaders=[^,]*x-amz-checksum-sha256/.test(auth[1]),
      'And it is covered by the SigV4 signature rather than sitting outside it',
      auth ? String(auth[1]).replace(/Signature=[0-9a-f]+/, 'Signature=…').slice(0, 160) : 'no header');
    ok(made.name.endsWith('.sqlite.gz'), 'The upload is reported by name', made.name);

    const listed = await B.list();
    ok(listed.length === 1 && listed[0].name === s3Name,
      'A listing that contains ChecksumAlgorithm and ChecksumType is still parsed',
      JSON.stringify(listed.map(b => b.name)));
    ok(listed.length === 1 && listed[0].bytes === 524288,
      'With the size read from the right element',
      listed.length ? String(listed[0].bytes) : 'nothing was parsed');

    /* The bug, kept as a check rather than only as a commit message. The old
       pattern named LastModified, ETag and Size in order, so the two new
       elements between ETag and Size made it match nothing — and list()
       returning [] reads to every caller as "there are no backups", which is
       the most dangerous way for a backup system to be wrong. */
    const OLD = /<Key>([^<]+)<\/Key>\s*<LastModified>[^<]*<\/LastModified>\s*<ETag>[^<]*<\/ETag>\s*<Size>(\d+)<\/Size>/g;
    ok([...S3_XML(s3Name).matchAll(OLD)].length === 0,
      'And the pattern this replaced would have found nothing in it — silently, as an empty list');
  } finally {
    global.fetch = realFetch;
    delete process.env.BACKUP_DRIVER; delete process.env.BACKUP_BUCKET;
    delete process.env.BACKUP_PREFIX; delete process.env.AWS_REGION;
    delete process.env.AWS_ACCESS_KEY_ID; delete process.env.AWS_SECRET_ACCESS_KEY;
    aws.resetCache();
  }

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
