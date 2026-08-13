/**
 * The PostgreSQL schema, loaded into a real PostgreSQL.
 *
 * Run: PG_URL=postgres://… node scripts/test-pg-schema.mjs
 *
 * Step one of moving off SQLite is being sure the tables can exist at all on
 * the other engine. That is not something to find out during a migration
 * window, and it is not something a translation function can be trusted about
 * on its own — `toPostgres()` returning plausible-looking DDL proves nothing.
 * So this hands the generated text to a real server and then compares what the
 * two databases actually built, table by table and column by column.
 *
 * Without PG_URL it skips, loudly. `scripts/verify.sh` starts a throwaway
 * cluster when the Postgres binaries are installed, so on a machine that has
 * them this really runs; CI will skip until a service is added to the workflow,
 * and says so rather than quietly passing.
 */
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { createRequire } from 'node:module';

const exec = promisify(execFile);
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'pgschema-'));
process.env.PREP_DB = path.join(tmp, 'throwaway.sqlite');

const require_ = createRequire(import.meta.url);
const { SCHEMA_SQL, ADDED_COLUMNS, ADDED_INDEXES, db } = require_('../server/db.js');
const S = require_('../server/schema.js');

let pass = 0, fail = 0;
const ok = (c, name, detail) => {
  if (c) { pass++; console.log('✓ ' + name); return; }
  fail++;
  console.log('✗ ' + name + (detail === undefined ? '' : '  → ' + detail));
};
const head = t => console.log('\n\x1b[1m== ' + t + ' ==\x1b[0m');

const PG_URL = process.env.PG_URL || '';

/** Run SQL through psql and hand back rows as arrays of strings. */
async function psql(sql, { file } = {}) {
  const args = ['-v', 'ON_ERROR_STOP=1', '-X', '-q', '-tA', '-F', '', PG_URL];
  args.push(file ? '-f' : '-c', file || sql);
  const { stdout } = await exec('psql', args, { maxBuffer: 32 * 1024 * 1024 });
  return stdout.split('\n').filter(Boolean).map(l => l.split(''));
}

try {
  if (!PG_URL) {
    console.log('\n\x1b[33m⚠ SKIPPED: PG_URL is not set, so the PostgreSQL schema was not loaded'
      + ' anywhere.\x1b[0m');
    console.log('  This check needs a real server — a translation that only looks right is');
    console.log('  exactly what it exists to catch. Start one and set PG_URL, or run');
    console.log('  npm run verify on a machine with the postgresql binaries installed.\n');
    process.exit(0);
  }

  /* ============ 1. It loads ============ */
  head('The generated schema loads into PostgreSQL');

  const ddl = S.fullPostgresDdl(SCHEMA_SQL, ADDED_COLUMNS, ADDED_INDEXES);
  ok(!/AUTOINCREMENT/i.test(ddl), 'No AUTOINCREMENT survives the translation');
  ok(!/(^|[\s(,])REAL(?=[\s,)])/i.test(ddl), 'and no bare REAL column type');

  const ddlFile = path.join(tmp, 'schema.pg.sql');
  fs.writeFileSync(ddlFile, ddl);
  await psql('DROP SCHEMA IF EXISTS public CASCADE; CREATE SCHEMA public;');

  let loadError = null;
  try { await psql(null, { file: ddlFile }); }
  catch (e) { loadError = String(e.stderr || e.message).split('\n').slice(0, 3).join(' '); }
  ok(loadError === null, 'The whole thing executes with no error', loadError);
  if (loadError) throw new Error('nothing further can be checked');

  /* Running it twice is how a deploy actually behaves — every statement carries
     IF NOT EXISTS, and a schema that only applies once is a schema that breaks
     the second release. */
  let againError = null;
  try { await psql(null, { file: ddlFile }); }
  catch (e) { againError = String(e.stderr || e.message).split('\n').slice(0, 3).join(' '); }
  ok(againError === null, 'and applying it a second time changes nothing and fails nothing', againError);

  /* ============ 2. The two databases agree ============ */
  head('SQLite and PostgreSQL describe the same thing');

  const sqliteTables = db.prepare(
    "SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' ORDER BY name")
    .all().map(r => r.name);
  const pgTables = (await psql(
    "SELECT table_name FROM information_schema.tables WHERE table_schema='public' ORDER BY table_name"))
    .map(r => r[0]);

  ok(pgTables.length === sqliteTables.length,
    `Both hold the same number of tables (${sqliteTables.length})`,
    `sqlite ${sqliteTables.length}, postgres ${pgTables.length}`);
  const missing = sqliteTables.filter(t => !pgTables.includes(t));
  const extra = pgTables.filter(t => !sqliteTables.includes(t));
  ok(missing.length === 0, 'Every SQLite table exists in PostgreSQL', missing.join(', '));
  ok(extra.length === 0, 'and PostgreSQL invented none of its own', extra.join(', '));

  /* Column by column. A table that exists with the wrong columns is worse than
     one that is missing: it fails on the first insert instead of at deploy. */
  const pgCols = new Map();
  for (const [t, c, nullable, type] of await psql(
    "SELECT table_name, column_name, is_nullable, data_type FROM information_schema.columns"
    + " WHERE table_schema='public' ORDER BY table_name, ordinal_position")) {
    if (!pgCols.has(t)) pgCols.set(t, new Map());
    pgCols.get(t).set(c, { nullable: nullable === 'YES', type });
  }

  const colProblems = [];
  const nullProblems = [];
  const pkNullable = [];
  for (const table of sqliteTables) {
    const sq = db.prepare(`PRAGMA table_info(${table})`).all();
    const pg = pgCols.get(table) || new Map();
    for (const col of sq) {
      if (!pg.has(col.name)) { colProblems.push(`${table}.${col.name}`); continue; }
      /* NOT NULL has to survive: a column that lost it accepts the row that
         SQLite would have refused, and the difference shows up as data.
         Primary keys are compared separately below, because SQLite's own
         PRAGMA reports notnull=0 for them — for the rowid alias and, it turns
         out, for a TEXT PRIMARY KEY too — while Postgres marks them NOT NULL.
         Postgres is right and SQLite's answer is the misleading one, so
         comparing the two directly reports a difference that is not real. */
      const pgNullable = pg.get(col.name).nullable;
      if (col.pk) {
        if (pgNullable) pkNullable.push(`${table}.${col.name}`);
      } else if (!!col.notnull !== !pgNullable) {
        nullProblems.push(`${table}.${col.name} (sqlite notnull=${col.notnull}, pg nullable=${pgNullable})`);
      }
    }
    for (const name of pg.keys()) {
      if (!sq.some(c => c.name === name)) colProblems.push(`${table}.${name} (only in postgres)`);
    }
  }
  ok(colProblems.length === 0, 'Every column exists on both sides, and only those',
    colProblems.slice(0, 6).join(', '));
  ok(nullProblems.length === 0, 'and NOT NULL means the same on both, column for column',
    nullProblems.slice(0, 6).join(', '));
  ok(pkNullable.length === 0, 'and every primary key is NOT NULL on the PostgreSQL side',
    pkNullable.slice(0, 6).join(', '));

  /* ============ 3. The types that were translated ============ */
  head('The two types that could not carry over unchanged');

  const identities = (await psql(
    "SELECT table_name FROM information_schema.columns WHERE table_schema='public'"
    + " AND is_identity='YES' ORDER BY table_name")).map(r => r[0]);
  const autoTables = [...SCHEMA_SQL.matchAll(
    /CREATE TABLE (?:IF NOT EXISTS )?([A-Za-z_][A-Za-z0-9_]*)\s*\(\s*id INTEGER PRIMARY KEY AUTOINCREMENT/gi)]
    .map(m => m[1]);
  ok(autoTables.length > 0, `SQLite declares ${autoTables.length} AUTOINCREMENT keys to translate`);
  const notIdentity = autoTables.filter(t => !identities.includes(t));
  ok(notIdentity.length === 0, 'and every one of them is an identity column in PostgreSQL',
    notIdentity.join(', '));

  /* BY DEFAULT, not ALWAYS: the seed inserts rows with explicit ids, and
     ALWAYS would refuse them. Proved by doing it rather than by reading it. */
  await psql("INSERT INTO families (id,name,sub,format,skills_json,sort) VALUES ('t1','T','s','f','[]',1)");
  await psql("INSERT INTO batches (name,unlock_type,unlock_ref,qty,created_at) VALUES ('b','family','t1',1,'2026-01-01')");
  const gen = await psql('SELECT id FROM batches');
  ok(gen.length === 1 && Number(gen[0][0]) >= 1, 'An identity key generates a value when none is given',
    JSON.stringify(gen));
  let explicitErr = null;
  try { await psql("INSERT INTO batches (id,name,unlock_type,unlock_ref,qty,created_at) VALUES (9001,'b2','family','t1',1,'2026-01-01')"); }
  catch (e) { explicitErr = String(e.stderr || e.message).split('\n')[0]; }
  ok(explicitErr === null, 'and still accepts a row that names its own id — GENERATED BY DEFAULT, not ALWAYS',
    explicitErr);

  const doubles = (await psql(
    "SELECT table_name||'.'||column_name FROM information_schema.columns"
    + " WHERE table_schema='public' AND data_type='double precision' ORDER BY 1")).map(r => r[0]);
  ok(doubles.length >= 4,
    `The REAL columns became double precision, not real (${doubles.length})`, doubles.join(', '));
  const realCols = (await psql(
    "SELECT count(*) FROM information_schema.columns WHERE table_schema='public' AND data_type='real'"));
  ok(realCols[0][0] === '0',
    'and nothing is a 32-bit float, which would silently round every mark stored in it',
    realCols[0][0]);

  /* ============ 4. The query shapes the application relies on ============ */
  head('The patterns the code already uses');

  /* Upserts. Every seed in server/db.js is ON CONFLICT DO UPDATE, and the whole
     re-runnable-seed design rests on it behaving identically. */
  await psql("INSERT INTO settings (key,value) VALUES ('k','one')");
  await psql("INSERT INTO settings (key,value) VALUES ('k','two') ON CONFLICT(key) DO UPDATE SET value=excluded.value");
  const upserted = await psql("SELECT value FROM settings WHERE key='k'");
  ok(upserted[0][0] === 'two', 'ON CONFLICT … DO UPDATE SET … = excluded.… works the same',
    JSON.stringify(upserted));

  await psql("INSERT INTO settings (key,value) VALUES ('k','three') ON CONFLICT DO NOTHING");
  const untouched = await psql("SELECT value FROM settings WHERE key='k'");
  ok(untouched[0][0] === 'two', 'and ON CONFLICT DO NOTHING leaves the row alone');

  /* A composite conflict target, which learn_progress and the throttle use. */
  await psql("INSERT INTO throttle_locks (bucket,fails) VALUES ('b',1)"
    + " ON CONFLICT(bucket) DO UPDATE SET fails = throttle_locks.fails + 1");
  await psql("INSERT INTO throttle_locks (bucket,fails) VALUES ('b',1)"
    + " ON CONFLICT(bucket) DO UPDATE SET fails = throttle_locks.fails + 1");
  const bumped = await psql("SELECT fails FROM throttle_locks WHERE bucket='b'");
  ok(bumped[0][0] === '2', 'An upsert that reads the existing row counts up correctly', bumped[0][0]);

  /* Foreign keys are enforced by default in Postgres; in SQLite only because
     db.js turns them on. Worth proving they are really there. */
  let fkErr = null;
  try { await psql("INSERT INTO sections (test_id,name,skill,type,sort) VALUES ('no-such-test','x','reading','mcq',1)"); }
  catch (e) { fkErr = String(e.stderr || e.message); }
  ok(fkErr !== null && /foreign key/i.test(fkErr),
    'A foreign key to a row that does not exist is refused', (fkErr || 'accepted!').split('\n')[0]);

  /* The one index with a direction on it. */
  const auditIdx = await psql(
    "SELECT indexdef FROM pg_indexes WHERE schemaname='public' AND indexname='idx_audit_at'");
  ok(auditIdx.length === 1 && /DESC/i.test(auditIdx[0][0]),
    'A descending index keeps its direction', JSON.stringify(auditIdx));

  /* A unique index over a nullable column: many NULLs must still be allowed,
     which is what lets orders that predate the payment work keep a null ref. */
  await psql("INSERT INTO orders (name,amount,status,created_at) VALUES ('a',1,'paid','2026-01-01')");
  await psql("INSERT INTO orders (name,amount,status,created_at) VALUES ('b',1,'paid','2026-01-01')");
  const nulls = await psql('SELECT count(*) FROM orders WHERE ref IS NULL');
  ok(nulls[0][0] === '2', 'A unique index over a nullable column still allows many NULLs', nulls[0][0]);
} catch (e) {
  fail++;
  console.log('\n✗ The test itself threw:\n', e && e.message ? e.message : e);
} finally {
  fs.rmSync(tmp, { recursive: true, force: true });
}

console.log(`\n${fail === 0 ? '\x1b[32m✔' : '\x1b[31m✗'} ${pass} passed, ${fail} failed\x1b[0m`);
process.exit(fail === 0 ? 0 : 1);
