#!/usr/bin/env node
/**
 * The one-shot migration task: S3 snapshot in, PostgreSQL out.
 *
 * This runs once, inside AWS, as an ECS Fargate task, and then the task is
 * gone. It exists because of a plain networking fact: the RDS instance is not
 * publicly accessible, so nothing outside the VPC can load it — not a laptop,
 * not CI, not the machine this was written on. The load has to happen from
 * something that is inside, and a Fargate task in a public subnet with
 * `assignPublicIp=ENABLED` is the smallest thing that qualifies. It can reach
 * S3 over the internet gateway AND the database over the VPC's own routing,
 * which is the pair of reachabilities the job needs, and it costs a few cents
 * for the minute it lives. A NAT gateway would also work and would cost about
 * $32 every month afterwards, for a task that runs once.
 *
 * ## What it does, in order
 *
 *   1. Fetches the named snapshot from the backup bucket, signing the request
 *      with the task role. No credential is passed in and none is stored.
 *   2. Gunzips it to PREP_DB, which is where `server/db.js` will look.
 *   3. Runs `scripts/pg-migrate.mjs --yes`, which loads db.js — bringing the
 *      snapshot's schema up to this build and seeding this build's content —
 *      and then copies every row into PostgreSQL.
 *   4. Runs `scripts/demo-purge.mjs --yes` against PostgreSQL, taking the
 *      fixture accounts back out of the copy.
 *
 * ## Why the purge is step 4 and not step 2
 *
 * It was step 2, and it did not work. Purging the SQLite file and then running
 * the migration means db.js loads a second time, in the migrator's own process,
 * and the seed puts the fixtures straight back — six fake paid orders, now with
 * a NULL user_id, because the accounts they belonged to had just been deleted.
 * The seed has since been given a one-time marker so that a purge sticks, and
 * either order would work now. It stays at step 4 anyway: purging the thing
 * that was actually written, after it was written, is verifiable in a way that
 * purging an input and hoping is not.
 *
 * ## Environment
 *
 *   BACKUP_BUCKET, BACKUP_KEY   the snapshot to load
 *   PGHOST, PGDATABASE, PGUSER  the target
 *   PGPASSWORD                  injected by ECS from the RDS master secret
 *   PREP_DB                     where the snapshot is unpacked
 *   AWS_REGION                  for the signature
 *
 * `DATABASE_URL` is deliberately NOT set. Setting it would switch db.js's own
 * engine to PostgreSQL, and then the migration would have no SQLite side to
 * read from — it would copy the target onto itself. `PG_URL` names the
 * destination and nothing else, which is the split the driver was built with.
 */
import { createRequire } from 'node:module';
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import zlib from 'node:zlib';
import { pipeline } from 'node:stream/promises';
import { Readable } from 'node:stream';

const require_ = createRequire(import.meta.url);
const aws = require_('/app/server/aws-sigv4.js');

const need = n => {
  const v = process.env[n];
  if (!v) { console.error(`[migrate] ${n} is not set.`); process.exit(1); }
  return v;
};

const BUCKET = need('BACKUP_BUCKET');
const KEY = need('BACKUP_KEY');
const REGION = process.env.AWS_REGION || 'ap-southeast-1';
const PREP_DB = process.env.PREP_DB || '/work/prep.sqlite';

/* Built here rather than passed in, so the password is never a substring of
   anything a task definition, a log line or a `ps` listing can show. It is
   URL-encoded because an RDS-generated password may contain characters that
   would otherwise end the DSN early — a `#` truncates it silently, and the
   error you get is "database does not exist", which sends you looking in
   entirely the wrong place. */
const dsn = () => {
  const u = encodeURIComponent(need('PGUSER'));
  const p = encodeURIComponent(need('PGPASSWORD'));
  const h = need('PGHOST');
  const port = process.env.PGPORT || '5432';
  const d = need('PGDATABASE');
  return `postgres://${u}:${p}@${h}:${port}/${d}?sslmode=${process.env.PGSSLMODE || 'require'}`;
};

async function download() {
  const url = `https://${BUCKET}.s3.${REGION}.amazonaws.com/${KEY.split('/').map(encodeURIComponent).join('/')}`;
  console.log(`[migrate] GET s3://${BUCKET}/${KEY}`);
  const headers = await aws.sign({ method: 'GET', url, service: 's3', region: REGION });
  const res = await fetch(url, { headers });
  if (!res.ok) {
    console.error(`[migrate] S3 refused the snapshot: ${res.status} ${res.statusText}`);
    console.error(await res.text().catch(() => ''));
    process.exit(1);
  }
  fs.mkdirSync(PREP_DB.replace(/\/[^/]*$/, '') || '/', { recursive: true });
  await pipeline(Readable.fromWeb(res.body), zlib.createGunzip(), fs.createWriteStream(PREP_DB));
  const mb = (fs.statSync(PREP_DB).size / 1048576).toFixed(1);
  console.log(`[migrate] unpacked ${mb} MB to ${PREP_DB}`);
}

/** Run one of the repo's scripts and fail the task if it fails. */
function run(script, args, env) {
  return new Promise((resolve, reject) => {
    console.log(`\n[migrate] ---- node ${script} ${args.join(' ')} ----`);
    const child = spawn(process.execPath, [script, ...args], {
      cwd: '/app', stdio: 'inherit', env: { ...process.env, ...env }
    });
    child.on('error', reject);
    child.on('exit', code => code === 0
      ? resolve()
      : reject(new Error(`${script} exited ${code}`)));
  });
}

const PG_URL = dsn();

try {
  await download();
  /* PG_URL names the destination. DATABASE_URL stays unset — see the note at
     the top; with it set, db.js would have no SQLite side to read. */
  await run('/app/scripts/pg-migrate.mjs', ['--yes'], { PG_URL, PREP_DB, DATABASE_URL: '' });
  /* Now against the copy: here DATABASE_URL is what points db.js's own q/tx at
     PostgreSQL, which is exactly what the purge should be operating on. */
  await run('/app/scripts/demo-purge.mjs', ['--yes'], { DATABASE_URL: PG_URL, PREP_DB });
  console.log('\n[migrate] done.');
  process.exit(0);
} catch (e) {
  console.error(`\n[migrate] FAILED: ${e && e.message}`);
  process.exit(1);
}
