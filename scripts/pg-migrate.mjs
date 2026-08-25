#!/usr/bin/env node
/**
 * Create the schema in PostgreSQL and copy the SQLite database into it.
 *
 *   PG_URL=postgres://…  node scripts/pg-migrate.mjs            (says what it WOULD do)
 *   PG_URL=postgres://…  node scripts/pg-migrate.mjs --yes      (does it)
 *   …                    node scripts/pg-migrate.mjs --yes --fresh   (drops the schema first)
 *
 * This is the deploy step the driver deliberately does not do. On a managed
 * database, creating tables is not something every container does on the way
 * up — ten tasks starting at once must not race to CREATE TABLE, and a seed
 * that runs on every boot is a seed that will one day run against production
 * data. So it happens here: once, on purpose, by somebody who typed --yes.
 *
 * It is also the tool for the actual migration. The platform runs on an
 * embedded SQLite file today; moving a live box to RDS means carrying the
 * accounts, the sittings and the marks across, not just the shape.
 *
 * ## Three things it is careful about
 *
 * **Dry run by default.** Every destructive tool that opens with "are you sure?"
 * gets a reflexive yes within a week. Printing what would happen and stopping
 * makes the confirmation a separate, deliberate command.
 *
 * **Foreign keys, in the right order.** Rows are copied parents-first, in an
 * order worked out from PostgreSQL's own catalogue rather than from a list kept
 * here. Turning the constraints off for the duration would be easier and would
 * also mean a broken copy could complete and look fine.
 *
 * **Sequences.** The ids come across as they are, so the identity sequences are
 * still at 1 afterwards and the very next insert collides with row one. This is
 * the failure that makes a migration look successful for exactly as long as it
 * takes somebody to register. Every sequence is set past its table's high-water
 * mark, and then read back.
 */
import { createRequire } from 'node:module';

const require_ = createRequire(import.meta.url);
const { Client } = require_('pg');

const ARGV = process.argv.slice(2);
const WRITE = ARGV.includes('--yes');
const FRESH = ARGV.includes('--fresh');
const PG_URL = process.env.PG_URL || process.env.DATABASE_URL;

const say = m => console.log(m);
const bold = m => console.log('\n\x1b[1m' + m + '\x1b[0m');

if (!PG_URL) {
  console.error('PG_URL (or DATABASE_URL) is not set. Nothing to migrate to.');
  process.exit(1);
}

/* Loading db.js runs the SQLite schema, the migrations and the seed, which is
   what makes a fresh install worth copying in the first place. */
const { db, SCHEMA_SQL, ADDED_COLUMNS, ADDED_INDEXES, DB_FILE } = require_('../server/db.js');
const S = require_('../server/schema.js');

const pg = new Client({ connectionString: PG_URL });
await pg.connect();

let failed = 0;
try {
  bold('Where the data is coming from and going to');
  say('  from  ' + DB_FILE);
  say('  to    ' + PG_URL.replace(/:\/\/([^@/]*)@/, '://***@'));
  say('  mode  ' + (WRITE ? (FRESH ? 'WRITE, after dropping the schema' : 'WRITE') : 'dry run — nothing will be changed'));

  /* ---------------- 1. The schema ---------------- */
  bold('Schema');
  const ddl = S.fullPostgresDdl(SCHEMA_SQL, ADDED_COLUMNS, ADDED_INDEXES);
  const wantTables = S.tableNames(SCHEMA_SQL);
  say('  ' + wantTables.length + ' tables to create');

  if (WRITE) {
    if (FRESH) await pg.query('DROP SCHEMA IF EXISTS public CASCADE; CREATE SCHEMA public;');
    await pg.query(ddl);
    say('  created');
  } else {
    say('  (dry run: not created)');
  }

  /* ---------------- 2. Parents before children ----------------
     Read off PostgreSQL's catalogue, so it describes the database being
     written to rather than a reading of the DDL. A cycle would loop for ever,
     so anything still unplaced after a full pass is appended and reported —
     this schema has none, and a future one that does should say so out loud
     rather than hang. */
  bold('Copy order');
  const deps = new Map();
  if (WRITE || FRESH) {
    const r = await pg.query(`
      SELECT c.relname AS child, f.relname AS parent
        FROM pg_constraint k
        JOIN pg_class c ON c.oid = k.conrelid
        JOIN pg_class f ON f.oid = k.confrelid
       WHERE k.contype = 'f' AND c.relnamespace = 'public'::regnamespace`);
    for (const row of r.rows) {
      if (row.child === row.parent) continue;                 // self-reference: no ordering to fix
      if (!deps.has(row.child)) deps.set(row.child, new Set());
      deps.get(row.child).add(row.parent);
    }
  }

  const order = [];
  const placed = new Set();
  let moved = true;
  while (moved) {
    moved = false;
    for (const t of wantTables) {
      if (placed.has(t)) continue;
      const need = deps.get(t) || new Set();
      if ([...need].every(p => placed.has(p) || !wantTables.includes(p))) {
        order.push(t); placed.add(t); moved = true;
      }
    }
  }
  const cyclic = wantTables.filter(t => !placed.has(t));
  if (cyclic.length) {
    say('  \x1b[33mcircular references, appended in schema order: ' + cyclic.join(', ') + '\x1b[0m');
    order.push(...cyclic);
  }
  say('  ' + order.length + ' tables ordered' + (deps.size ? ', ' + deps.size + ' with parents' : ''));

  /* ---------------- 3. The rows ---------------- */
  bold('Rows');
  let totalRead = 0, totalWritten = 0;
  const report = [];

  for (const table of order) {
    let rows;
    try {
      rows = db.prepare('SELECT * FROM "' + table + '"').all();
    } catch (e) {
      /* A table in the DDL that this SQLite file has not got: a database made
         before that table existed. Reported, not fatal. */
      report.push([table, 0, 0, 'not in the SQLite file']);
      continue;
    }
    totalRead += rows.length;
    if (!rows.length) { report.push([table, 0, 0, '']); continue; }

    if (!WRITE) { report.push([table, rows.length, 0, 'dry run']); continue; }

    const cols = Object.keys(rows[0]);
    const quoted = cols.map(c => '"' + c + '"').join(',');
    /* One statement per chunk rather than per row: 58-item papers and a few
       thousand skill events make per-row round trips the slowest part by far. */
    const CHUNK = 200;
    let written = 0;
    for (let i = 0; i < rows.length; i += CHUNK) {
      const slice = rows.slice(i, i + CHUNK);
      const values = [];
      const params = [];
      slice.forEach((row, n) => {
        values.push('(' + cols.map((_, j) => '$' + (n * cols.length + j + 1)).join(',') + ')');
        for (const c of cols) {
          const v = row[c];
          /* node:sqlite hands back BigInt for large integers and Buffer for
             blobs. pg understands neither as a bound parameter. */
          params.push(typeof v === 'bigint' ? Number(v) : v);
        }
      });
      const res = await pg.query(
        'INSERT INTO "' + table + '" (' + quoted + ') VALUES ' + values.join(',') +
        ' ON CONFLICT DO NOTHING', params);
      written += res.rowCount;
    }
    totalWritten += written;
    report.push([table, rows.length, written, written === rows.length ? '' : 'SOME ROWS DID NOT LAND']);
  }

  const w = Math.max(...report.map(r => r[0].length));
  for (const [t, read, written, note] of report) {
    if (!read && !note) continue;                             // empty table, nothing to say
    say('  ' + t.padEnd(w) + '  read ' + String(read).padStart(6) +
        '  wrote ' + String(written).padStart(6) + (note ? '   ' + note : ''));
  }
  say('  ' + String(totalRead) + ' rows read, ' + String(totalWritten) + ' written');

  const short = report.filter(r => r[3] === 'SOME ROWS DID NOT LAND');
  if (short.length) {
    failed++;
    say('\n\x1b[31m✗ ' + short.length + ' table(s) did not copy in full: ' +
        short.map(r => r[0]).join(', ') + '\x1b[0m');
  }

  /* ---------------- 4. The sequences ---------------- */
  bold('Identity sequences');
  if (!WRITE) {
    say('  (dry run: not touched — this is the step that decides whether the NEXT insert works)');
  } else {
    const idTables = (await pg.query(
      `SELECT table_name FROM information_schema.columns
        WHERE table_schema = current_schema() AND column_name = 'id'`)).rows.map(r => r.table_name);
    let fixed = 0, checked = 0;
    for (const t of idTables) {
      const seq = (await pg.query("SELECT pg_get_serial_sequence($1,'id') AS s", [t])).rows[0].s;
      if (!seq) continue;                                     // an id that is not an identity column
      const max = Number((await pg.query('SELECT COALESCE(MAX(id),0) AS m FROM "' + t + '"')).rows[0].m);
      await pg.query('SELECT setval($1, $2, true)', [seq, Math.max(max, 1)]);
      checked++;
      /* Read back rather than assumed: a sequence left behind its table is the
         failure that looks like a clean migration until somebody registers. */
      const next = Number((await pg.query('SELECT last_value FROM ' + seq)).rows[0].last_value);
      if (next < max) { failed++; say('  \x1b[31m✗ ' + t + ' sequence at ' + next + ', behind max id ' + max + '\x1b[0m'); }
      else if (max > 0) fixed++;
    }
    say('  ' + checked + ' sequence(s) set, ' + fixed + ' past real data');
  }

  /* ---------------- 5. Count both sides ---------------- */
  if (WRITE) {
    bold('Both sides agree');
    let mismatched = 0;
    for (const table of order) {
      let here;
      try { here = db.prepare('SELECT COUNT(*) c FROM "' + table + '"').get().c; }
      catch (e) { continue; }
      const there = Number((await pg.query('SELECT COUNT(*) c FROM "' + table + '"')).rows[0].c);
      if (Number(here) !== there) {
        mismatched++;
        say('  \x1b[31m✗ ' + table + ': sqlite ' + here + ', postgres ' + there + '\x1b[0m');
      }
    }
    if (mismatched) { failed++; say('  ' + mismatched + ' table(s) differ'); }
    else say('  every table holds the same number of rows on both sides');
  }

  bold(failed ? '\x1b[31m✗ finished with ' + failed + ' problem(s)\x1b[0m'
              : (WRITE ? '\x1b[32m✔ migrated\x1b[0m'
                       : '\x1b[33mdry run complete — add --yes to write\x1b[0m'));
} catch (e) {
  failed++;
  console.error('\n\x1b[31m✗ ' + (e && e.stack ? e.stack : e) + '\x1b[0m');
} finally {
  await pg.end().catch(() => {});
}

process.exit(failed ? 1 : 0);
