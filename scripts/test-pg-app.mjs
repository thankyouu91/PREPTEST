#!/usr/bin/env node
/**
 * The application's own queries, run against PostgreSQL.
 *
 * Run: PG_URL=postgres://… node scripts/test-pg-app.mjs
 *
 * The driver suite proves the four verbs behave. This proves the several
 * hundred statements written on top of them actually parse and answer on the
 * other engine, which is a different question and the one that bites. Every
 * fault found while writing this was a query that had been correct for months:
 *
 *   · `HAVING items > 0` — SQLite resolves an output alias in HAVING and
 *     Postgres does not.
 *   · `SELECT gp.name_en … GROUP BY gp.slug` — SQLite lets a non-aggregated
 *     column ride along; Postgres requires it in the GROUP BY.
 *   · `ORDER BY (earned * 1.0 / max)` — a bare alias in ORDER BY is fine in
 *     both, an alias INSIDE an expression is not.
 *   · `date(at, '+7 hours')` — SQLite only.
 *
 * None of those is exotic and none would be caught by reading. They are found
 * by running, which is what this does: the real modules, on real migrated data,
 * with `q` pointed at Postgres.
 *
 * ## How it gets Postgres to point at
 *
 * The migration is run in a CHILD process, because it has to seed a SQLite file
 * first and copy the result across — and a parent that had already required
 * db.js would have fixed its engine before the data existed. So: child seeds
 * and copies, then this process requires db.js with PG_URL set and every module
 * it pulls in speaks to a database that is already full.
 */
import { createRequire } from 'node:module';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const exec = promisify(execFile);
const require_ = createRequire(import.meta.url);

let pass = 0, fail = 0;
const ok = (c, name, detail) => {
  if (c) { pass++; console.log('✓ ' + name); return; }
  fail++; console.log('✗ ' + name + (detail === undefined ? '' : '  → ' + detail));
};
const head = t => console.log('\n\x1b[1m== ' + t + ' ==\x1b[0m');

const PG_URL = process.env.PG_URL || process.env.DATABASE_URL;
if (!PG_URL) {
  console.log('\x1b[33m⚠ PG_URL is not set — the application queries were NOT run against PostgreSQL.\x1b[0m');
  console.log('  scripts/pg-dev.sh starts a throwaway cluster when the binaries are installed.');
  process.exit(0);
}

const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'pgapp-'));
const sqliteFile = path.join(tmp, 'seed.sqlite');

let caught = 0;
try {
  head('PG_URL alone must NOT switch the live engine');

  /* In a child, because this process is about to set DATABASE_URL on purpose.
     scripts/verify.sh exports PG_URL for its whole run — that is how the
     throwaway cluster reaches these suites — so if PG_URL also switched the
     engine, the gate's own server would come up on a scratch database with a
     different seed and different passwords, and a dozen student suites would
     go red for a reason nowhere near them. It did, for about an hour. */
  const probe = async (env) => (await exec(process.execPath,
    ['-e', "console.log(require('./server/db.js').engine)"],
    { cwd: path.join(import.meta.dirname, '..'),
      env: { ...process.env, DATABASE_URL: '', PG_URL: '', PREP_DB: path.join(tmp, 'probe.sqlite'), ...env },
      maxBuffer: 8 * 1024 * 1024 })).stdout.trim().split('\n').pop();

  ok(await probe({ PG_URL }) === 'sqlite',
    'PG_URL says "here is a Postgres for the tests" and leaves the engine alone');
  ok(await probe({ DATABASE_URL: PG_URL }) === 'postgres',
    'DATABASE_URL says "this deployment runs on Postgres" and switches it');

  head('Filling PostgreSQL from a freshly seeded SQLite');
  const { stdout } = await exec(process.execPath,
    [path.join(import.meta.dirname, 'pg-migrate.mjs'), '--yes', '--fresh'],
    { env: { ...process.env, PREP_DB: sqliteFile, PG_URL }, maxBuffer: 32 * 1024 * 1024 });
  const copied = /(\d+) rows read, (\d+) written/.exec(stdout);
  ok(!!copied && copied[1] === copied[2] && Number(copied[1]) > 1000,
    'the seed migrated across in full', copied ? copied[0] : 'no count in the output');
  ok(/every table holds the same number of rows on both sides/.test(stdout),
    'and both sides agree table by table');

  /* Only now, with the database full, is db.js allowed to pick its engine —
     and it is told with DATABASE_URL, which is the ONLY name that switches it.
     PG_URL means "here is a Postgres the tests may use" and nothing more:
     scripts/verify.sh exports it for the whole run, so a PG_URL that also
     switched engines would have put the gate's own server on a scratch
     database. Set here, deliberately, for this process alone. */
  process.env.DATABASE_URL = PG_URL;
  process.env.PREP_DB = path.join(tmp, 'scratch.sqlite');
  const db = require_('../server/db.js');
  ok(db.engine === 'postgres', 'db.js selected the Postgres engine from DATABASE_URL', db.engine);
  const info = await db.connectEngine();
  ok(info.tables > 20, 'and connectEngine() found the schema', JSON.stringify(info));

  const uid = await db.q.val("SELECT id FROM users WHERE username = 'student'");
  ok(uid > 0, 'the demo student came across', String(uid));

  /* --------------------------------------------------------------
   * Every module that owns non-trivial SQL, called for real.
   * A throw is the failure this file exists to catch, so each is
   * caught individually — one broken module must not hide the rest.
   * -------------------------------------------------------------- */
  const call = async (name, fn, check) => {
    try {
      const out = await fn();
      ok(check ? check(out) : true, name,
        check ? JSON.stringify(out === undefined ? null : out).slice(0, 160) : undefined);
      return out;
    } catch (e) {
      ok(false, name, (e && e.message) || String(e));
      return null;
    }
  };

  head('The report, the estimate and the plan');
  const report = require_('../server/report.js');
  await call('report.activity() — the local-day grouping, the one date() lived in',
    () => report.activity(uid), r => r && Array.isArray(r.days) && r.days.length > 0);
  await call('report.reportOf() — the whole progress panel',
    () => report.reportOf(uid), r => r && typeof r === 'object');
  await call('report.quality() — conditional sums over one scan',
    () => report.quality(uid), r => r && typeof r === 'object');

  const ability = require_('../server/ability.js');
  await call('ability.abilityOf() — the weighted estimate',
    () => ability.abilityOf(uid), a => a && a.skills && typeof a.skills === 'object');

  const levelAdvice = require_('../server/level-advice.js');
  await call('levelAdvice.recommendLevel() — which paper next',
    () => levelAdvice.recommendLevel(uid), r => r && (r.level === 1 || r.level === 2));

  const revision = require_('../server/revision.js');
  await call('revision.weakestTopics() — the HAVING and the GROUP BY',
    () => revision.weakestTopics(uid, 'B1', 3), r => Array.isArray(r));

  const studyMap = require_('../server/study-map.js');
  await call('studyMap.partCriteria() — aggregates over rubric_scores',
    () => studyMap.partCriteria(uid), r => Array.isArray(r));
  await call('studyMap.weakGroups() — the ORDER BY over aggregates',
    () => studyMap.weakGroups(uid, 5), r => Array.isArray(r));
  await call('studyMap.whatToStudy() — the whole study list',
    () => studyMap.whatToStudy(uid), r => Array.isArray(r));

  const drills = require_('../server/drills.js');
  /* The check that found the type fault: `available` is a COUNT, and under
     node-postgres a bigint arrives as a STRING unless it is parsed. It read
     "050" here — two counts concatenated instead of added — on a screen that
     had been right for months, with nothing thrown and no error logged. */
  await call('drills.overview() — the per-part counts, as NUMBERS',
    () => drills.overview(uid),
    r => Array.isArray(r) && r.length === 10 && r.every(x => typeof x.available === 'number'));
  await call('drills.suggest() — the ranked suggestions',
    () => drills.suggest(uid, null, 3, 1), r => Array.isArray(r));

  const plan = require_('../server/plan.js');
  await call('plan.weekly() — everything above, together',
    () => plan.weekly(uid), p => p && Array.isArray(p.plan) && p.nextPaper && Array.isArray(p.study));

  head('Writes, transactions and the audit trail');
  const at = new Date().toISOString();
  await call('a plain insert through the live q',
    () => db.q.run("INSERT INTO settings (key,value) VALUES (?,?) ON CONFLICT(key) DO UPDATE SET value=excluded.value",
      'pg.app.test', at), r => r && r.changes === 1);
  await call('audit() writes to the engine in use, not to a scratch file',
    async () => {
      const before = Number(await db.q.val('SELECT COUNT(*) c FROM audit'));
      await db.audit({ admin: { id: null, username: 'pg-app-test' } }, 'test.pg', 'app', { ok: true });
      return Number(await db.q.val('SELECT COUNT(*) c FROM audit')) - before;
    }, n => n === 1);
  await call('tx() commits',
    async () => {
      await db.tx(async () => {
        await db.q.run("INSERT INTO settings (key,value) VALUES (?,?) ON CONFLICT(key) DO UPDATE SET value=excluded.value",
          'pg.app.tx', 'committed');
      });
      return db.q.val('SELECT value FROM settings WHERE key=?', 'pg.app.tx');
    }, v => v === 'committed');
  await call('and rolls back',
    async () => {
      try {
        await db.tx(async () => {
          await db.q.run("INSERT INTO settings (key,value) VALUES (?,?) ON CONFLICT(key) DO UPDATE SET value=excluded.value",
            'pg.app.rollback', 'should not survive');
          throw new Error('deliberate');
        });
      } catch (e) { /* expected */ }
      return db.q.val('SELECT value FROM settings WHERE key=?', 'pg.app.rollback');
    }, v => v === null);

  head('The admin reports, which carry the awkward aggregates');
  await call('revenue by plan — COALESCE in both SELECT and GROUP BY',
    () => db.q.all(
      `SELECT COALESCE(p.name, o.name) name, COUNT(*) orders, COALESCE(SUM(o.amount),0) amount
         FROM orders o LEFT JOIN packages p ON p.id = o.package_id
        WHERE o.status='paid'
        GROUP BY COALESCE(o.package_id, o.name), COALESCE(p.name, o.name)
        ORDER BY amount DESC LIMIT 8`), r => Array.isArray(r));
  await call('the marking backlog — GROUP BY a primary key, ORDER BY another column',
    () => db.q.all(
      `SELECT a.id FROM attempts a
         JOIN attempt_parts ap ON ap.attempt_id = a.id
         JOIN section_items si ON si.section_id = ap.section_id
         JOIN questions qs ON qs.id = si.question_id
        WHERE a.status = 'submitted' AND qs.type IN ('essay','speaking')
        GROUP BY a.id ORDER BY a.submitted_at LIMIT 5`), r => Array.isArray(r));
  await call('the bank gap report — a grouped subquery joined back',
    () => db.q.all(
      `SELECT b.family_id, b.skill, b.level, b.have
         FROM (SELECT family_id, skill, level, COUNT(*) have FROM questions
                WHERE status='active' GROUP BY family_id, skill, level) b
        LIMIT 5`), r => Array.isArray(r));

  if (db.pg) await db.pg.close();
} catch (e) {
  caught++;
  console.log('\n✗ The suite threw: ' + (e && e.stack ? e.stack : e));
} finally {
  try { fs.rmSync(tmp, { recursive: true, force: true }); } catch (_) { /* a temp dir */ }
}

console.log(`\n${(fail + caught) ? '\x1b[31m' : '\x1b[32m'}${pass} passed, ${fail + caught} failed\x1b[0m`);
process.exit((fail + caught) ? 1 : 0);
