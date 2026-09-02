#!/usr/bin/env node
/**
 * The PostgreSQL driver, checked against SQLite doing the same thing.
 *
 * Run: PG_URL=postgres://… node scripts/test-pg-driver.mjs
 *
 * A driver test that only asks "did Postgres answer" proves nothing useful. The
 * contract this file has to keep is not "it works" but "it answers the same as
 * the engine every call site was written against" — so most of what is below
 * runs an operation on BOTH engines and compares the two answers, rather than
 * comparing one answer to what I expected while writing it.
 *
 * Without PG_URL it skips, loudly, the same way scripts/test-pg-schema.mjs
 * does. A laptop with no PostgreSQL still has to be able to run the suite; a
 * check that quietly passes when it did not run is worse than no check.
 */
import { createRequire } from 'node:module';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const require_ = createRequire(import.meta.url);

let pass = 0, fail = 0;
const ok = (c, name, detail) => {
  if (c) { pass++; console.log('✓ ' + name); return; }
  fail++; console.log('✗ ' + name + (detail === undefined ? '' : '  → ' + detail));
};
const head = t => console.log('\n\x1b[1m== ' + t + ' ==\x1b[0m');

const PG_URL = process.env.PG_URL || process.env.DATABASE_URL;

/* ---------------------------------------------------------------- *
 * 1. The pure translation, which needs no server at all
 * ---------------------------------------------------------------- */
head('Rewriting the SQL');

const { toDollars, orIgnore, insertTarget } = require_('../server/pg.js');

ok(toDollars('SELECT * FROM t WHERE a=? AND b=?').text === 'SELECT * FROM t WHERE a=$1 AND b=$2',
  'Placeholders are numbered in order', toDollars('SELECT * FROM t WHERE a=? AND b=?').text);
ok(toDollars('SELECT * FROM t WHERE a=?').count === 1,
  'and the count comes back so a caller can check its own argument list');

/* The reason this is a scanner and not a regex. */
const literal = "SELECT * FROM t WHERE note LIKE '%?%' AND a=?";
ok(toDollars(literal).text === "SELECT * FROM t WHERE note LIKE '%?%' AND a=$1",
  'A question mark inside a string literal is left alone', toDollars(literal).text);
ok(toDollars(literal).count === 1,
  'and does not consume a parameter number', String(toDollars(literal).count));

const doubled = "SELECT 'it''s fine' AS a WHERE b=?";
ok(toDollars(doubled).text === "SELECT 'it''s fine' AS a WHERE b=$1",
  'A doubled quote inside a literal does not end the literal early', toDollars(doubled).text);

ok(toDollars('SELECT "odd?column" FROM t WHERE a=?').text === 'SELECT "odd?column" FROM t WHERE a=$1',
  'A double-quoted identifier is a literal too');

/* An apostrophe inside a comment is not a quote. Two queries in this codebase
   carry one ("the learner's own"); the scanner used to read it as the start of
   a literal that ran to the next apostrophe, and every ? inside that stretch
   went to Postgres as a literal question mark. */
const commented = "SELECT a /* the learner's own */ FROM t WHERE b=? AND c=? -- can't be null\nAND d=?";
const done = toDollars(commented);
ok(done.count === 3, 'Placeholders after a commented apostrophe are still numbered', String(done.count));
ok(done.text === "SELECT a /* the learner's own */ FROM t WHERE b=$1 AND c=$2 -- can't be null\nAND d=$3",
  'and the comments themselves are copied through untouched', done.text);
ok(toDollars("SELECT '--not a comment?' AS a WHERE b=?").text === "SELECT '--not a comment?' AS a WHERE b=$1",
  'A comment marker inside a literal is still just a literal');

ok(/ON CONFLICT DO NOTHING$/.test(orIgnore('INSERT OR IGNORE INTO t (a) VALUES (?)')),
  'INSERT OR IGNORE moves to the end as ON CONFLICT DO NOTHING',
  orIgnore('INSERT OR IGNORE INTO t (a) VALUES (?)'));
ok(!/OR\s+IGNORE/i.test(orIgnore('INSERT OR IGNORE INTO t (a) VALUES (?)')),
  'and the SQLite spelling is gone from the front');

const upsert = 'INSERT INTO t (a) VALUES (?) ON CONFLICT(a) DO UPDATE SET a=excluded.a';
ok(orIgnore(upsert) === upsert,
  'A statement that already has its own ON CONFLICT is untouched — a second clause would not parse');

ok(insertTarget('INSERT INTO users (a) VALUES (?)') === 'users',
  'The insert target is read off the statement');
ok(insertTarget('  insert or ignore into  Section_Items (a) values (?)') === 'section_items',
  'whatever the spacing, keyword case or table case');
ok(insertTarget('UPDATE users SET a=?') === null,
  'and an UPDATE is not an insert');

if (!PG_URL) {
  console.log('\n\x1b[33m⚠ PG_URL is not set, so everything below was SKIPPED.\x1b[0m');
  console.log('  The translation above is proved; the driver against a real server is not.');
  console.log('  scripts/pg-dev.sh starts a throwaway cluster when the binaries are installed.');
  console.log(`\n${fail ? '\x1b[31m' : '\x1b[32m'}${pass} passed, ${fail} failed\x1b[0m`);
  process.exit(fail ? 1 : 0);
}

/* ---------------------------------------------------------------- *
 * 2. The same operations on both engines
 * ---------------------------------------------------------------- */

/* A throwaway SQLite, so this never touches the working database. */
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'pgdriver-'));
process.env.PREP_DB = path.join(tmp, 'throwaway.sqlite');

/* `sqliteQ`, not `q`. With PG_URL set — which it is, or this half would not be
   running — db.js's `q` IS the Postgres driver, so taking it here would compare
   Postgres against itself and pass while proving nothing. */
const { sqliteQ: sq, SCHEMA_SQL, ADDED_COLUMNS, ADDED_INDEXES } = require_('../server/db.js');
const S = require_('../server/schema.js');
const { createPg } = require_('../server/pg.js');

const pg = createPg({ url: PG_URL });
let caught = 0;

try {
  head('Connecting, and learning the catalogue');

  /* The schema has to exist before the driver can be asked anything, and it is
     the deploy step's job in real life. Here the suite does it itself. */
  const { Client } = require_('pg');
  const c = new Client({ connectionString: PG_URL });
  await c.connect();
  await c.query('DROP SCHEMA IF EXISTS public CASCADE; CREATE SCHEMA public;');
  await c.query(S.fullPostgresDdl(SCHEMA_SQL, ADDED_COLUMNS, ADDED_INDEXES));
  await c.end();

  const info = await pg.connect();
  ok(Array.isArray(info.idTables) && info.idTables.length > 20,
    'The driver connects and reads which tables carry an id column',
    String(info.idTables.length));
  ok(info.idTables.includes('users') && info.idTables.includes('questions'),
    'including the ones inserts actually read an id back from');
  ok(!info.idTables.includes('user_sessions'),
    'and NOT user_sessions, which is keyed on a token hash — appending RETURNING id there would error',
    info.idTables.filter(t => t.startsWith('user_')).join(', '));

  head('The four verbs answer the way SQLite answers');

  const at = new Date().toISOString();
  const mk = (u) => ['INSERT INTO users (username,email,name,pass_hash,verified,status,interests_json,created_at)'
    + " VALUES (?,?,?,?,0,'active','[]',?)", u, u + '@driver.test', 'Driver ' + u, 'x', at];

  const sRun = await sq.run(...mk('alpha'));
  const pRun = await pg.q.run(...mk('alpha'));
  ok(sRun.changes === 1 && pRun.changes === 1,
    'run() reports one row changed on both', `sqlite ${sRun.changes}, pg ${pRun.changes}`);
  ok(Number(sRun.lastInsertRowid) > 0 && Number(pRun.lastInsertRowid) > 0,
    'and both hand back a usable lastInsertRowid',
    `sqlite ${sRun.lastInsertRowid}, pg ${pRun.lastInsertRowid}`);

  const sGot = await sq.get('SELECT username,email,verified FROM users WHERE id=?', sRun.lastInsertRowid);
  const pGot = await pg.q.get('SELECT username,email,verified FROM users WHERE id=?', pRun.lastInsertRowid);
  ok(JSON.stringify(sGot) === JSON.stringify(pGot),
    'get() returns the same row, field for field',
    JSON.stringify({ sqlite: sGot, pg: pGot }));

  const sVal = await sq.val('SELECT COUNT(*) c FROM users WHERE username=?', 'alpha');
  const pVal = await pg.q.val('SELECT COUNT(*) c FROM users WHERE username=?', 'alpha');
  ok(Number(sVal) === 1 && Number(pVal) === 1,
    'val() pulls the first column of the first row on both', `sqlite ${sVal}, pg ${pVal}`);

  /* Asserted as a TYPE, not just a value, and the first version of this check
     did not: it wrapped both sides in Number() and passed while Postgres was
     handing back the string "1". node-postgres returns int8 as a string by
     default — rightly, since int8 outruns a JavaScript number — and COUNT(*) is
     an int8. Left unparsed, arithmetic all over the codebase quietly becomes
     string concatenation: a drill reported `available: "050"`, which is two
     counts joined rather than added, with nothing thrown. */
  ok(typeof sVal === 'number' && typeof pVal === 'number',
    'and a COUNT is a NUMBER on both, not a string on one of them',
    `sqlite ${typeof sVal}, pg ${typeof pVal}`);
  const sSum = await sq.val('SELECT SUM(verified) s FROM users');
  const pSum = await pg.q.val('SELECT SUM(verified) s FROM users');
  ok(typeof sSum === typeof pSum,
    'so is a SUM over an integer column', `sqlite ${typeof sSum}, pg ${typeof pSum}`);

  await sq.run(...mk('beta'));
  await pg.q.run(...mk('beta'));
  const sAll = (await sq.all('SELECT username FROM users WHERE email LIKE ? ORDER BY username', '%@driver.test'))
    .map(r => r.username);
  const pAll = (await pg.q.all('SELECT username FROM users WHERE email LIKE ? ORDER BY username', '%@driver.test'))
    .map(r => r.username);
  ok(JSON.stringify(sAll) === JSON.stringify(pAll) && sAll.length === 2,
    'all() returns the same rows in the same order',
    JSON.stringify({ sqlite: sAll, pg: pAll }));

  const sMiss = await sq.get('SELECT * FROM users WHERE username=?', 'nobody-here');
  const pMiss = await pg.q.get('SELECT * FROM users WHERE username=?', 'nobody-here');
  ok(sMiss === undefined && pMiss === undefined,
    'and a get() that matches nothing is undefined on both, not null and not an empty object',
    `sqlite ${String(sMiss)}, pg ${String(pMiss)}`);

  head('An insert into a table with no id column');

  /* The case that made RETURNING id conditional rather than automatic. */
  const tok = 'driver-' + Date.now().toString(36);
  const sess = ['INSERT INTO user_sessions (token_hash,user_id,created_at,expires_at) VALUES (?,?,?,?)',
    tok, Number(pRun.lastInsertRowid), at, at];
  let sessionOk = true, why = '';
  try { await pg.q.run(...sess); } catch (e) { sessionOk = false; why = e.message; }
  ok(sessionOk, 'goes in without a RETURNING clause being invented for it', why);
  ok(await pg.q.val('SELECT COUNT(*) c FROM user_sessions WHERE token_hash=?', tok) === '1'
     || Number(await pg.q.val('SELECT COUNT(*) c FROM user_sessions WHERE token_hash=?', tok)) === 1,
    'and the row is really there');

  head('INSERT OR IGNORE, against a real unique constraint');

  const dup = ['INSERT OR IGNORE INTO users (username,email,name,pass_hash,verified,status,interests_json,created_at)'
    + " VALUES (?,?,?,?,0,'active','[]',?)", 'alpha', 'alpha@driver.test', 'Duplicate', 'x', at];
  const sDup = await sq.run(...dup);
  const pDup = await pg.q.run(...dup);
  ok(sDup.changes === 0 && pDup.changes === 0,
    'A conflicting row is ignored rather than thrown, and both report zero changes',
    `sqlite ${sDup.changes}, pg ${pDup.changes}`);
  ok(Number(await sq.val('SELECT COUNT(*) c FROM users WHERE username=?', 'alpha')) === 1
    && Number(await pg.q.val('SELECT COUNT(*) c FROM users WHERE username=?', 'alpha')) === 1,
    'and neither engine ended up with two');

  head('Transactions');

  const before = Number(await pg.q.val('SELECT COUNT(*) c FROM users'));
  let threw = false;
  try {
    await pg.tx(async () => {
      await pg.q.run(...mk('gamma'));
      throw new Error('deliberate');
    });
  } catch (e) { threw = e.message === 'deliberate'; }
  ok(threw, 'A throw inside a transaction comes back out to the caller');
  ok(Number(await pg.q.val('SELECT COUNT(*) c FROM users')) === before,
    'and the row it wrote is gone', 'count moved from ' + before);

  await pg.tx(async () => { await pg.q.run(...mk('delta')); });
  ok(Number(await pg.q.val('SELECT COUNT(*) c FROM users WHERE username=?', 'delta')) === 1,
    'A transaction that returns commits what it wrote');

  let joined = false;
  await pg.tx(async () => {
    await pg.tx(async () => { joined = true; await pg.q.run(...mk('epsilon')); });
  });
  ok(joined && Number(await pg.q.val('SELECT COUNT(*) c FROM users WHERE username=?', 'epsilon')) === 1,
    'A nested transaction joins the open one instead of deadlocking on a second BEGIN');

  /* The property that is the whole point of the move: under SQLite everything
     else in the process had to wait for an open transaction, because there was
     one connection. Here it does not. */
  head('The reason for moving at all');

  /* Started BEFORE the transaction opens, so its async context has no
     transaction client in it — which is what another HTTP request looks like.
     The first version of this used setImmediate from INSIDE the callback and
     was wrong: AsyncLocalStorage propagates into scheduled callbacks, exactly
     as it should, so that "outsider" was still the transaction and duly saw
     its own uncommitted row. The test was broken, not the driver. */
  let release;
  const written = new Promise(r => { release = r; });
  let sawUncommitted = null, outsideRan = false;
  const outsider = (async () => {
    await written;
    sawUncommitted = Number(await pg.q.val(
      'SELECT COUNT(*) c FROM users WHERE username=?', 'zeta'));
    outsideRan = true;
  })();

  await pg.tx(async () => {
    await pg.q.run(...mk('zeta'));
    release();                       // the row is written but NOT committed
    await outsider;                  // and the outsider runs while we are still open
  });

  ok(sawUncommitted === 0,
    'A statement outside the transaction cannot see its uncommitted rows', String(sawUncommitted));
  ok(outsideRan,
    'and it runs while the transaction is still open rather than waiting for the commit — which is what the pool buys');
  ok(Number(await pg.q.val('SELECT COUNT(*) c FROM users WHERE username=?', 'zeta')) === 1,
    'then sees them once it has committed');

  head('Types come back the way the callers expect');

  await pg.q.run("INSERT INTO settings (key,value) VALUES (?,?) ON CONFLICT(key) DO UPDATE SET value=excluded.value",
    'driver.test', 'hello');
  ok(await pg.q.val('SELECT value FROM settings WHERE key=?', 'driver.test') === 'hello',
    'TEXT is a string');
  const nulled = await pg.q.get('SELECT note FROM users WHERE id=?', Number(pRun.lastInsertRowid));
  ok(nulled && nulled.note === null,
    'an unset column is null, not undefined — callers test it with == null', JSON.stringify(nulled));

  /* ---------------------------------------------------------------- *
   * The password, when it is not in the connection string
   * ---------------------------------------------------------------- *
   * A managed database rotates its password, so the driver fetches one per
   * connection instead of holding one. These checks are about the two ways
   * that goes wrong: fetching too often, on a path a user is waiting on, and
   * not fetching again after a rotation. */
  head('A rotating password');

  const { secretPassword } = require_('../server/pg.js');

  /* Stand in for Secrets Manager by pre-loading the module the resolver asks
     for. It is required lazily inside the resolver precisely so this is
     possible — and so a SQLite install never loads the signer at all. */
  const secretsPath = require_.resolve('../server/secrets.js');
  const realSecrets = require_.cache[secretsPath];
  let fetches = 0;
  let payload = { password: 'first-one' };
  require_.cache[secretsPath] = {
    id: secretsPath, filename: secretsPath, loaded: true, exports: {
      async fetchSecret() { fetches++; return payload; }
    }
  };

  try {
    const resolve = secretPassword('a-secret-arn');
    ok(await resolve() === 'first-one', 'The password comes from the secret');
    ok(fetches === 1, 'one fetch so far', String(fetches));

    await resolve(); await resolve();
    ok(fetches === 1, 'and repeated connections inside the TTL reuse it rather than re-fetching',
      String(fetches));

    /* Ten connections opening at once is the normal case for a pool filling,
       not an edge case. It must be one call, not ten. */
    fetches = 0;
    const burst = secretPassword('a-secret-arn');
    const all = await Promise.all(Array.from({ length: 10 }, () => burst()));
    ok(all.every(v => v === 'first-one'), 'A burst of connections all get the password');
    ok(fetches === 1, 'and share ONE fetch between them', String(fetches));

    /* The rotation. */
    payload = { password: 'rotated-one' };
    ok(await resolve() === 'first-one', 'A rotation is not seen while the cached value is still fresh');
    resolve.invalidate();
    ok(await resolve() === 'rotated-one', 'and IS seen once the cache is cleared — which is what the pool error handler does');

    /* The failure has to be legible without being a leak. */
    const wrongField = secretPassword('a-secret-arn', 'no-such-field');
    let message = '';
    try { await wrongField(); } catch (e) { message = e.message; }
    ok(/no-such-field/.test(message), 'A missing field says which field was missing', message);
    ok(!/first-one|rotated-one/.test(message), 'and does not put the secret in the error', message);

    /* The other half: config assembled from PGHOST and friends rather than a
       DSN. This is what runs in production, so it is checked against the real
       server rather than by reading a config object back.
     *
     * The first version of this check passed while testing nothing. `PG_URL` is
     * exported for the whole suite, `createPg` preferred it over the options it
     * was handed, and the pool connected — to the right server, by the wrong
     * route, with every option ignored. It is proved here instead by pointing
     * the parts at a database that does NOT exist and requiring the failure to
     * name it: only the parts branch could have produced that. */
    const u = new URL(PG_URL);
    const asParts = extra => createPg({
      host: u.hostname,
      port: u.port || 5432,
      database: u.pathname.replace(/^\//, ''),
      user: decodeURIComponent(u.username || ''),
      ...extra
    });

    /* A local cluster has no TLS, so the reachability checks run with
       PGSSLMODE=disable — which is also the check that the switch is honoured.
       Production leaves it unset and gets `require`, which is the check after. */
    const sslmodeWas = process.env.PGSSLMODE;
    process.env.PGSSLMODE = 'disable';
    try {
      const wrongDb = asParts({ database: 'no_such_database_here' });
      let partsErr = '';
      try { await wrongDb.q.val('SELECT 1'); } catch (e) { partsErr = e.message; }
      await wrongDb.close().catch(() => {});
      ok(/no_such_database_here/.test(partsErr),
        'The parts are actually used — an ambient PG_URL does not override them', partsErr);

      const parts = asParts({});
      try {
        ok(Number(await parts.q.val('SELECT 1 AS n')) === 1,
          'A pool built from PGHOST/PGPORT/PGDATABASE/PGUSER connects and answers');
        ok(await parts.q.val('SHOW ssl') === 'off',
          'and PGSSLMODE=disable is honoured, which is the only reason it reached a local cluster');
      } finally {
        await parts.close().catch(() => {});
      }
    } finally {
      if (sslmodeWas === undefined) delete process.env.PGSSLMODE;
      else process.env.PGSSLMODE = sslmodeWas;
    }

    /* And the default, which is the one production runs: no PGSSLMODE, so TLS
       is required — against a cluster that has none, that must FAIL rather than
       quietly fall back to plaintext. */
    const insecure = asParts({});
    let sslErr = '';
    try { await insecure.q.val('SELECT 1'); } catch (e) { sslErr = e.message; }
    await insecure.close().catch(() => {});
    ok(/SSL|ssl/.test(sslErr),
      'With PGSSLMODE unset the driver demands TLS and does not fall back to plaintext', sslErr);
  } finally {
    if (realSecrets) require_.cache[secretsPath] = realSecrets;
    else delete require_.cache[secretsPath];
  }

} catch (e) {
  caught++;
  console.log('\n✗ The suite threw: ' + (e && e.stack ? e.stack : e));
} finally {
  await pg.close().catch(() => {});
  try { fs.rmSync(tmp, { recursive: true, force: true }); } catch (_) { /* a temp dir */ }
}

console.log(`\n${(fail + caught) ? '\x1b[31m' : '\x1b[32m'}${pass} passed, ${fail + caught} failed\x1b[0m`);
process.exit((fail + caught) ? 1 : 0);
