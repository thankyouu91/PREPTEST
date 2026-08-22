/**
 * Backing the database up, and getting it back.
 *
 * The largest risk this platform carries is not load and it is not an attacker.
 * It is that `data/prep.sqlite` is one file, on one machine, and until this
 * module existed there was no copy of it anywhere. A failed disk, a mistyped
 * path in a deploy script, or one `rm` is the end of every account, every code
 * sold and every paper anybody has ever sat, with no way back.
 *
 * So this is Block 0 in `docs/KE-HOACH-XAY.md`: nothing else in the plan is
 * worth building on top of a database that can vanish.
 *
 * ## Four things that are easy to get wrong, and are the whole point
 *
 * **1. `VACUUM INTO`, never `cp`.** A running server writes continuously, and
 * copying a SQLite file mid-write gives you a torn file — pages from two
 * different moments, plus a `-wal` you did not copy. It looks like a backup. It
 * is a corrupt database, and the day you find that out is the day you needed it.
 * `VACUUM INTO` runs inside a read transaction and writes a *consistent* new
 * database, safe against a live writer, and it compacts as it goes.
 *
 * **2. Verify before it counts as a backup.** Every snapshot is opened,
 * `PRAGMA integrity_check`ed and counted before it is allowed to be uploaded.
 * An unverified copy is not a backup, it is a file.
 *
 * **3. Verify again before restoring, and never overwrite blindly.** A restore
 * that puts a corrupt archive over a working database has destroyed the last
 * good copy — the failure mode is worse than not restoring at all. So restore
 * unpacks, opens and checks the candidate first, and moves the existing file
 * aside rather than deleting it.
 *
 * **4. Pruning must never be able to delete everything.** The catastrophic bug
 * in a backup system is not "it did not run", it is "it ran and reaped the lot".
 * `prune()` refuses to act at all unless what remains is at least MIN_KEEP, and
 * that guard is checked before a single delete is issued rather than per object.
 *
 * ## Where backups go
 *
 * Two destinations behind one interface, the same shape as `server/storage.js`
 * so whoever has read that has read this:
 *
 *   `disk` (default) — a directory. Fine for a laptop, and NOT a backup on the
 *     production box: a copy on the disk that dies with the original protects
 *     against a mistake, not against a failure. `backupHealth()` says so.
 *   `s3` — signed with `server/aws-sigv4.js`, so no SDK and no new dependency.
 *     Point it at a bucket with **versioning and object lock** on: a backup an
 *     intruder with the server's credentials can delete is not a backup either.
 *
 * Nothing here logs a credential, a bucket policy or a signed URL.
 */
'use strict';

const fs = require('node:fs');
const path = require('node:path');
const zlib = require('node:zlib');
const os = require('node:os');
const { DatabaseSync } = require('node:sqlite');
const crypto = require('node:crypto');
const aws = require('./aws-sigv4');

/* Snapshots are named so that a plain lexical sort is also a chronological one,
   which is what makes "the newest" answerable without parsing anything. */
const PREFIX = 'prep-';
const SUFFIX = '.sqlite.gz';

/** Never prune below this many, whatever the retention window says. */
const MIN_KEEP = 3;

/** How old the newest backup may be before the platform is in trouble. */
const STALE_MS = 12 * 60 * 60 * 1000;

const env = k => (process.env[k] || '').trim();

function config() {
  return {
    driver: env('BACKUP_DRIVER') || 'disk',
    dir: env('BACKUP_DIR') || path.join(__dirname, '..', 'data', 'backups'),
    /* Its own bucket if there is one, else the uploads bucket. Backups and
       recordings in one bucket is workable; a lifecycle rule written for one
       and applied to the other is not, so BACKUP_BUCKET is the better answer. */
    bucket: env('BACKUP_BUCKET') || env('S3_BUCKET'),
    prefix: env('BACKUP_PREFIX') || 'db-backups',
    region: env('AWS_REGION') || env('S3_REGION'),
    endpoint: env('S3_ENDPOINT'),
    keepDays: Number(env('BACKUP_KEEP_DAYS') || 30)
  };
}

/** `prep-2026-08-21T09-30-00Z.sqlite.gz` — sortable, and legible in a bucket
    listing at three in the morning, which is when it will be read. */
function snapshotName(when) {
  const iso = (when || new Date()).toISOString().replace(/\.\d+Z$/, 'Z');
  return PREFIX + iso.replace(/:/g, '-') + SUFFIX;
}

/** The instant a snapshot name encodes, or null if the name is not one of ours. */
function nameTime(name) {
  if (!String(name).startsWith(PREFIX) || !String(name).endsWith(SUFFIX)) return null;
  const core = name.slice(PREFIX.length, -SUFFIX.length);
  /* Undo the colon substitution: 2026-08-21T09-30-00Z → 2026-08-21T09:30:00Z */
  const iso = core.replace(/T(\d{2})-(\d{2})-(\d{2})Z$/, 'T$1:$2:$3Z');
  const t = Date.parse(iso);
  return Number.isFinite(t) ? t : null;
}

/* ------------------------- Making one, and checking it ------------------------- */

/**
 * A consistent copy of `dbPath` at `outPath`, verified.
 *
 * Throws rather than returning a bad snapshot: a caller that has to remember to
 * check a return value is a caller that will one day forget, and the thing it
 * forgets to check is whether the backup is real.
 */
function snapshot(dbPath, outPath) {
  if (!fs.existsSync(dbPath)) throw new Error('no database at ' + dbPath);
  /* VACUUM INTO refuses a target that exists, and it is right to — silently
     overwriting a previous snapshot is how you lose the good one. */
  fs.rmSync(outPath, { force: true });
  fs.mkdirSync(path.dirname(outPath), { recursive: true });

  /* Read-only: this runs against a live server's database and must not be able
     to change it, not even by SQLite's own recovery paths. */
  const src = new DatabaseSync(dbPath, { readOnly: true });
  try {
    src.exec(`VACUUM INTO '${outPath.replace(/'/g, "''")}'`);
  } finally {
    src.close();
  }
  return verify(outPath);
}

/**
 * Open a candidate database and decide whether it is worth keeping.
 *
 * `integrity_check` alone is not enough. A file can be structurally perfect and
 * still be the wrong thing — an empty database passes every page check there
 * is. So this also insists the tables that make this THIS platform are present
 * and that `users` is not empty: the seed creates the admin account, so a
 * snapshot with no users is a snapshot of something that was never a real
 * install.
 */
function verify(file) {
  const db = new DatabaseSync(file, { readOnly: true });
  try {
    const chk = db.prepare('PRAGMA integrity_check').get();
    const verdict = chk && (chk.integrity_check || Object.values(chk)[0]);
    if (verdict !== 'ok') throw new Error('integrity_check said: ' + verdict);

    const names = db.prepare(
      "SELECT name FROM sqlite_master WHERE type = 'table'").all().map(r => r.name);
    /* Named explicitly rather than counted, and these five rather than any
       five: an install missing `codes` has lost what customers paid for, one
       missing `attempts` has lost what they did. A count would pass a database
       with forty tables and the wrong forty. */
    for (const need of ['users', 'attempts', 'attempt_answers', 'questions', 'codes']) {
      if (!names.includes(need)) throw new Error('table ' + need + ' is missing');
    }
    const users = db.prepare('SELECT COUNT(*) c FROM users').get().c;
    if (!users) throw new Error('no users — this is not a real install');

    return {
      file,
      bytes: fs.statSync(file).size,
      tables: names.length,
      users,
      attempts: db.prepare('SELECT COUNT(*) c FROM attempts').get().c
    };
  } finally {
    db.close();
  }
}

/* ------------------------------- Destinations ------------------------------- */

const diskDest = {
  name: 'disk',
  async put(name, buf) {
    const { dir } = config();
    fs.mkdirSync(dir, { recursive: true });
    /* Write beside then rename: a reader that lists the directory mid-write
       must never see a half-written file under a real backup's name. */
    const tmp = path.join(dir, '.' + name + '.part');
    fs.writeFileSync(tmp, buf);
    fs.renameSync(tmp, path.join(dir, name));
  },
  async list() {
    const { dir } = config();
    if (!fs.existsSync(dir)) return [];
    return fs.readdirSync(dir)
      .filter(n => nameTime(n) !== null)
      .map(n => ({ name: n, bytes: fs.statSync(path.join(dir, n)).size, at: nameTime(n) }));
  },
  async get(name) {
    return fs.readFileSync(path.join(config().dir, name));
  },
  async remove(name) {
    fs.rmSync(path.join(config().dir, name), { force: true });
  }
};

function s3Url(key) {
  const { bucket, region, endpoint } = config();
  const p = String(key).split('/').map(encodeURIComponent).join('/');
  return endpoint
    ? `${endpoint}/${encodeURIComponent(bucket)}/${p}`
    : `https://${bucket}.s3.${region}.amazonaws.com/${p}`;
}

/** Status and a short body. Never the request, which carries the signature. */
async function reason(res) {
  const text = await res.text().catch(() => '');
  return `${res.status} ${text.slice(0, 200)}`;
}

async function s3Fetch(method, url, body, headers) {
  const signed = await aws.sign({ method, url, headers: headers || {}, body, service: 's3' });
  return fetch(url, { method, headers: signed.headers, body });
}

const s3Dest = {
  name: 's3',
  async put(name, buf) {
    /* The checksum header is not belt and braces — S3 REFUSES a PUT into a
       bucket with Object Lock unless the request carries Content-MD5 or one of
       the x-amz-checksum-* headers. Found on the real bucket: every upload came
       back 400 while the same code worked against a bucket without the lock.
       SHA-256 rather than MD5 because it is the modern one and there is no
       reason to reach for MD5 in new code. It goes through the signer with the
       other headers, so it is covered by the signature. */
    const res = await s3Fetch('PUT', s3Url(config().prefix + '/' + name), buf,
      { 'content-type': 'application/gzip',
        'x-amz-checksum-sha256': crypto.createHash('sha256').update(buf).digest('base64') });
    if (!res.ok) throw new Error('backup upload failed: ' + await reason(res));
  },
  async list() {
    const { bucket, region, endpoint, prefix } = config();
    const base = endpoint
      ? `${endpoint}/${encodeURIComponent(bucket)}`
      : `https://${bucket}.s3.${region}.amazonaws.com`;
    const out = [];
    let token = '';
    /* Paginated on purpose. A year of six-hourly snapshots is over 1400 objects
       and a single unpaginated LIST silently stops at 1000 — which would make
       prune() believe the oldest backups do not exist. */
    for (let page = 0; page < 20; page++) {
      const url = base + '/?list-type=2&prefix=' + encodeURIComponent(prefix + '/')
        + (token ? '&continuation-token=' + encodeURIComponent(token) : '');
      const res = await s3Fetch('GET', url);
      if (!res.ok) throw new Error('backup list failed: ' + await reason(res));
      const xml = await res.text();
      /* Key, then anything, then Size — rather than naming every element in
         between.
         The first version spelled out LastModified, ETag and Size in order and
         broke the moment the uploads above started carrying a checksum: S3 then
         adds <ChecksumAlgorithm> and <ChecksumType> between ETag and Size, and
         the pattern stopped matching anything at all. `list()` returned an empty
         array, which every caller reads as "there are no backups" — the most
         dangerous possible way for a backup system to be wrong, and it would
         have taken `prune()`'s floor with it.
         It was a latent bug, not a new one; it only surfaced because no object
         had a checksum before. The lazy quantifier is safe here because every
         <Contents> block carries exactly one Key before its own Size, so the
         match cannot run past the end of its own block. */
      for (const m of xml.matchAll(/<Key>([^<]+)<\/Key>[\s\S]*?<Size>(\d+)<\/Size>/g)) {
        const name = m[1].slice(prefix.length + 1);
        if (nameTime(name) !== null) out.push({ name, bytes: Number(m[2]), at: nameTime(name) });
      }
      const more = /<IsTruncated>true<\/IsTruncated>/.test(xml);
      token = (xml.match(/<NextContinuationToken>([^<]+)<\/NextContinuationToken>/) || [])[1] || '';
      if (!more || !token) break;
    }
    return out;
  },
  async get(name) {
    const res = await s3Fetch('GET', s3Url(config().prefix + '/' + name));
    if (!res.ok) throw new Error('backup download failed: ' + await reason(res));
    return Buffer.from(await res.arrayBuffer());
  },
  async remove(name) {
    const res = await s3Fetch('DELETE', s3Url(config().prefix + '/' + name));
    if (!res.ok && res.status !== 404) throw new Error('backup delete failed: ' + await reason(res));
  }
};

function destination() {
  const { driver, bucket, region } = config();
  if (driver === 'disk') return diskDest;
  if (driver === 's3') {
    const missing = [];
    if (!bucket) missing.push('BACKUP_BUCKET or S3_BUCKET');
    if (!region) missing.push('AWS_REGION');
    if (!aws.configured()) missing.push('an AWS credential');
    if (missing.length) throw new Error('BACKUP_DRIVER=s3 needs ' + missing.join(', '));
    return s3Dest;
  }
  throw new Error('unknown BACKUP_DRIVER: ' + driver);
}

/* --------------------------------- The verbs --------------------------------- */

/**
 * Take a backup: snapshot → verify → compress → upload → prune.
 *
 * The order is the argument. Verification happens on the snapshot, before it is
 * compressed and before anything is uploaded, so a bad snapshot never reaches
 * the destination and never displaces a good one during pruning.
 */
async function backup(opts) {
  const o = opts || {};
  const dbPath = o.db || process.env.PREP_DB || path.join(__dirname, '..', 'data', 'prep.sqlite');
  const name = snapshotName(o.when);
  const work = path.join(o.workDir || fs.mkdtempSync(path.join(os.tmpdir(), 'prep-bk-')), 'snap.sqlite');

  try {
    const info = snapshot(dbPath, work);
    /* Level 6 rather than 9: on a 40 MB database level 9 costs several seconds
       of CPU on the box that is also serving learners, for a few per cent. */
    const gz = zlib.gzipSync(fs.readFileSync(work), { level: 6 });
    const dest = destination();
    await dest.put(name, gz);
    const pruned = await prune();
    return {
      name, driver: dest.name, bytes: gz.length, raw: info.bytes,
      users: info.users, attempts: info.attempts, tables: info.tables, pruned
    };
  } finally {
    fs.rmSync(path.dirname(work), { recursive: true, force: true });
  }
}

/** Every backup the destination holds, newest first. */
async function list() {
  const rows = await destination().list();
  return rows.sort((a, b) => b.at - a.at);
}

/**
 * Delete backups past the retention window — but only ever down to MIN_KEEP.
 *
 * The guard is deliberately computed over the whole set before any delete is
 * issued, rather than checked per object as the loop runs. Per-object is how a
 * clock skew or a bad `keepDays` reaps an entire bucket one object at a time,
 * each individual decision looking locally reasonable.
 */
async function prune(now) {
  const { keepDays } = config();
  if (!Number.isFinite(keepDays) || keepDays <= 0) return [];
  const all = await list();
  const cutoff = (now || Date.now()) - keepDays * 24 * 60 * 60 * 1000;
  /* Oldest first, so that trimming this list below keeps the NEWEST of the
     expired ones. Sorted explicitly rather than relying on list()'s order:
     list() is newest-first, and truncating a newest-first array keeps the
     newest — which is exactly backwards, deletes the most recent backups and
     leaves the most useless. That was the first version of this function, and
     the check "every deleted backup is older than every kept one" in
     scripts/test-backup.mjs is what found it. */
  const old = all.filter(b => b.at < cutoff).sort((a, b) => a.at - b.at);
  if (all.length - old.length < MIN_KEEP) {
    /* Would leave too few. Drop only as many of the oldest as the floor allows,
       which for a healthy schedule means dropping nothing. */
    const allowed = Math.max(0, all.length - MIN_KEEP);
    old.length = Math.min(old.length, allowed);
  }
  const dest = destination();
  for (const b of old) await dest.remove(b.name);
  return old.map(b => b.name);
}

/**
 * Put a backup back.
 *
 * `into` is written only after the archive has been unpacked, opened and passed
 * the same checks a fresh snapshot must pass. If a database is already there it
 * is renamed aside, not deleted — the one thing worse than a failed restore is a
 * successful restore of the wrong file over the only remaining copy.
 */
async function restore(name, opts) {
  const o = opts || {};
  const into = o.into || process.env.PREP_DB || path.join(__dirname, '..', 'data', 'prep.sqlite');
  const gz = await destination().get(name);
  const workDir = fs.mkdtempSync(path.join(os.tmpdir(), 'prep-rs-'));
  const candidate = path.join(workDir, 'candidate.sqlite');

  try {
    fs.writeFileSync(candidate, zlib.gunzipSync(gz));
    const info = verify(candidate);          // before anything is touched

    if (o.check) return { checked: name, ...info, into: null };

    fs.mkdirSync(path.dirname(into), { recursive: true });
    let moved = null;
    if (fs.existsSync(into)) {
      moved = into + '.before-restore-' + Date.now();
      fs.renameSync(into, moved);
      /* The sidecars belong to the file that was there, and leaving them next
         to a restored database is how you get a database that replays somebody
         else's write-ahead log over your restore. */
      for (const ext of ['-wal', '-shm']) fs.rmSync(into + ext, { force: true });
    }
    fs.copyFileSync(candidate, into);
    return { restored: name, into, movedAside: moved, ...info };
  } finally {
    fs.rmSync(workDir, { recursive: true, force: true });
  }
}

/**
 * Is the backup situation actually all right?
 *
 * The commonest way a backup system fails is not by breaking loudly. It is by
 * quietly stopping, while everyone keeps believing it runs. So this answers a
 * question a cron job or a health check can act on, and it treats a
 * disk-destination on a server as a problem to report rather than a success —
 * a copy on the disk that dies with the original is not an answer to the risk
 * this module exists for.
 */
async function backupHealth(now) {
  const t = now || Date.now();
  const cfg = config();
  const out = { driver: cfg.driver, ok: false, count: 0, newest: null, ageMs: null, problems: [] };
  try {
    const all = await list();
    out.count = all.length;
    if (!all.length) { out.problems.push('there are no backups at all'); return out; }
    out.newest = all[0].name;
    out.ageMs = t - all[0].at;
    if (out.ageMs > STALE_MS) {
      out.problems.push('newest backup is ' + Math.round(out.ageMs / 3.6e6) + 'h old');
    }
    if (cfg.driver === 'disk' && process.env.NODE_ENV === 'production') {
      out.problems.push('BACKUP_DRIVER=disk in production: same disk as the database');
    }
    out.ok = out.problems.length === 0;
  } catch (e) {
    out.problems.push(String(e && e.message || e));
  }
  return out;
}

module.exports = {
  backup, restore, list, prune, verify, snapshot, backupHealth,
  snapshotName, nameTime, config,
  MIN_KEEP, STALE_MS, PREFIX, SUFFIX
};
