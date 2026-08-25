/**
 * The PostgreSQL driver — step three of the move off SQLite.
 *
 * Steps one and two are done and are what make this small. `server/schema.js`
 * already translates the schema and `scripts/test-pg-schema.mjs` already proves
 * it against a real server; `server/db.js` already turned `q.all/get/run/val`
 * into promises and already routes in-transaction statements through
 * AsyncLocalStorage. That second one was the expensive part, and it was written
 * with this file in mind: "a pooled Postgres client has exactly this shape,
 * where in-transaction statements go to the held client and the rest to the
 * pool." So what is left is a driver, not a rewrite.
 *
 * This is also the one place the project takes a runtime dependency beyond
 * express. Speaking to Postgres means speaking its wire protocol, and hand
 * rolling ~1500 lines of SCRAM authentication and binary decoding to avoid a
 * package is not a trade anybody should make. `pg` was approved for exactly
 * this reason and for nothing else.
 *
 * ## What the driver has to reconcile
 *
 *   · **Placeholders.** SQLite takes `?`, Postgres takes `$1…$n`. Rewritten
 *     here rather than at several hundred call sites, by a scanner that knows
 *     about string literals — a `?` inside quotes is data, and a regex would
 *     renumber it.
 *   · **`INSERT OR IGNORE`.** SQLite puts it after INSERT; Postgres spells it
 *     `ON CONFLICT DO NOTHING` at the END of the statement. Two call sites use
 *     it, and both are load-bearing.
 *   · **`lastInsertRowid`.** SQLite hands it back from any insert. Postgres
 *     only returns what you ask for, so an insert into a table that HAS an `id`
 *     column gets `RETURNING id` appended. Which tables those are is read from
 *     the live database once, at connect, rather than guessed — an insert into
 *     `user_sessions` (keyed on a token hash) must not acquire a RETURNING
 *     clause naming a column that is not there.
 *   · **Transactions.** A pooled client, held for the duration, with every
 *     statement inside the scope routed to it and everything else going to the
 *     pool. This is where Postgres is genuinely better than what it replaces:
 *     under SQLite the rest of the application had to WAIT for an open
 *     transaction, because there was one connection. Here it does not.
 *
 * ## What it deliberately does not do
 *
 * It does not create the schema and it does not seed. On a managed database
 * that is a DEPLOY step, not something every container does on the way up —
 * ten tasks starting at once must not all race to CREATE TABLE. That belongs to
 * `scripts/pg-migrate.mjs`, which is run once and on purpose.
 */
'use strict';

const { Pool } = require('pg');
const { AsyncLocalStorage } = require('node:async_hooks');

/**
 * `?` → `$1…$n`, without touching a question mark inside a string.
 *
 * A regex would be one line and would be wrong: `WHERE note LIKE '%?%'` is a
 * literal question mark in data, and renumbering it produces a statement that
 * either errors or — worse — silently binds a parameter into the middle of a
 * LIKE pattern. So this walks the text, and the only state it needs is whether
 * it is inside a quoted run.
 *
 * Both quoting styles are handled because both appear in this codebase: single
 * quotes for values and double quotes for the odd identifier. SQL escapes a
 * quote by doubling it, and that falls out of the loop for free — the closing
 * quote flips the state off and the immediately following one flips it back on.
 */
function toDollars(sql) {
  let out = '';
  let n = 0;
  let quote = null;                      // "'" or '"' while inside one
  for (let i = 0; i < sql.length; i++) {
    const c = sql[i];
    if (quote) {
      out += c;
      if (c === quote) quote = null;
      continue;
    }
    if (c === "'" || c === '"') { quote = c; out += c; continue; }
    if (c === '?') { out += '$' + (++n); continue; }
    out += c;
  }
  return { text: out, count: n };
}

/**
 * SQLite's `INSERT OR IGNORE` in Postgres spelling.
 *
 * Not a straight word swap: SQLite marks the conflict behaviour up front and
 * Postgres marks it at the end, so the phrase has to be removed from one place
 * and added in another. Left alone when the statement already carries its own
 * ON CONFLICT — this codebase has upserts that name a target and a DO UPDATE,
 * and appending a second clause to those would be a syntax error.
 */
function orIgnore(sql) {
  if (!/^\s*INSERT\s+OR\s+IGNORE\s+/i.test(sql)) return sql;
  const stripped = sql.replace(/^(\s*)INSERT\s+OR\s+IGNORE\s+/i, '$1INSERT ');
  if (/\bON\s+CONFLICT\b/i.test(stripped)) return stripped;
  return stripped.replace(/\s*;?\s*$/, '') + ' ON CONFLICT DO NOTHING';
}

/** The table an INSERT is aimed at, or null when the statement is not one. */
function insertTarget(sql) {
  const m = /^\s*INSERT\s+(?:OR\s+\w+\s+)?INTO\s+"?([A-Za-z_][A-Za-z0-9_]*)"?/i.exec(sql);
  return m ? m[1].toLowerCase() : null;
}

/**
 * One connection pool, and the state that rides with it.
 *
 * `idTables` is filled at connect from the live catalogue rather than from a
 * list kept here. A list would be a second copy of the schema, and the schema
 * is already generated from one place on purpose.
 */
function createPg(opts) {
  const o = opts || {};
  const pool = new Pool({
    connectionString: o.url || process.env.DATABASE_URL || process.env.PG_URL,
    max: Number(o.max || process.env.PG_POOL_MAX || 10),
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: Number(o.connectTimeoutMs || 10000)
  });

  /* A pool emits errors for idle clients the server has dropped. Unhandled,
     that is an uncaught exception and the process dies for a connection nobody
     was using. */
  pool.on('error', e => console.error('[pg] idle client error:', e && e.message));

  let idTables = new Set();
  const txScope = new AsyncLocalStorage();

  /** Which tables have an `id` column, so only those get RETURNING id. */
  async function loadIdTables() {
    const r = await pool.query(
      `SELECT table_name FROM information_schema.columns
        WHERE table_schema = current_schema() AND column_name = 'id'`);
    idTables = new Set(r.rows.map(x => String(x.table_name).toLowerCase()));
    return idTables;
  }

  /** Whoever should run this statement: the transaction's client, or the pool. */
  const runner = () => txScope.getStore() || pool;

  async function query(sql, params) {
    const prepared = toDollars(orIgnore(sql));
    return runner().query(prepared.text, params);
  }

  const q = {
    async all(sql, ...p) { return (await query(sql, p)).rows; },
    async get(sql, ...p) { return (await query(sql, p)).rows[0] || undefined; },
    async val(sql, ...p) {
      const r = (await query(sql, p)).rows[0];
      return r ? Object.values(r)[0] : null;
    },
    /**
     * The SQLite result shape, so no caller has to know which engine answered.
     *
     * `changes` is rowCount. `lastInsertRowid` needs asking for: an insert into
     * a table with an `id` gets RETURNING id appended and reads it back, and an
     * insert into one without leaves it undefined — which is exactly what those
     * callers already do with it, since none of them looks.
     */
    async run(sql, ...p) {
      const target = insertTarget(sql);
      const wantsId = target && idTables.has(target) && !/\bRETURNING\b/i.test(sql);
      /* ON CONFLICT before RETURNING, which is the order Postgres parses and
         the opposite of the order these two rewrites were first applied in.
         `run()` used to append RETURNING to the raw statement and leave the
         OR IGNORE translation to query(), which then put ON CONFLICT after it:
         "… VALUES (…) RETURNING id ON CONFLICT DO NOTHING", a syntax error on
         every ignoring insert into a table with an id. So the conflict clause
         is settled here first; query() sees no OR IGNORE left and does nothing. */
      const base = orIgnore(sql);
      const text = wantsId ? base.replace(/\s*;?\s*$/, '') + ' RETURNING id' : base;
      const r = await query(text, p);
      return {
        changes: r.rowCount,
        lastInsertRowid: wantsId && r.rows[0] ? r.rows[0].id : undefined
      };
    }
  };

  /**
   * Run `fn` inside one transaction, on one held client.
   *
   * The shape matches server/db.js's SQLite transaction exactly — join an open
   * one rather than nesting, because a caller should not have to know whether
   * it is already inside — but the resemblance stops at an important place.
   * Under SQLite every OTHER statement in the process had to wait for the
   * transaction to finish, because there was one connection. Here they go to
   * the pool and run straight away. That is the whole reason for the move.
   */
  async function tx(fn) {
    if (txScope.getStore()) return fn();          // already inside: join it
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      const out = await txScope.run(client, fn);
      await client.query('COMMIT');
      return out;
    } catch (e) {
      /* A rollback can itself fail when the connection is already gone. The
         original error is the one worth reporting, so this must not replace it. */
      try { await client.query('ROLLBACK'); } catch (_) { /* the throw below says why */ }
      throw e;
    } finally {
      client.release();
    }
  }

  /** Prove the connection and learn the catalogue. Call once, at boot. */
  async function connect() {
    await pool.query('SELECT 1');
    await loadIdTables();
    return { idTables: [...idTables].sort() };
  }

  return { q, tx, connect, pool, loadIdTables, close: () => pool.end() };
}

module.exports = { createPg, toDollars, orIgnore, insertTarget };
