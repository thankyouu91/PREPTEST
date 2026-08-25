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

const pgLib = require('pg');
const { Pool } = pgLib;
const { AsyncLocalStorage } = require('node:async_hooks');

/**
 * Counts and sums come back as NUMBERS, the way SQLite hands them over.
 *
 * node-postgres returns `bigint` as a STRING by default, and it is right to:
 * PostgreSQL's int8 goes past what a JavaScript number holds exactly, so
 * parsing it silently would lose precision on values this application will
 * never have. `COUNT(*)` is an int8. So is `SUM()` over an integer column.
 *
 * Left alone, every count in the codebase changes type under the new engine,
 * and the failure is not an error — it is arithmetic quietly becoming string
 * concatenation. It surfaced as a drill reporting `available: "050"`, which is
 * "0" and "50" joined, on a screen that had been correct for months. Nothing
 * threw. A `> 0` test still passed. Only the number was wrong.
 *
 * So int8 and numeric are parsed here, once, for the whole process. The
 * precision argument does not apply to this schema — ids, counts and marks are
 * all far inside the safe range, and SQLite has been handing them over as
 * numbers all along, which is what every caller was written against.
 */
pgLib.types.setTypeParser(20, v => (v === null ? null : Number(v)));    // int8
pgLib.types.setTypeParser(1700, v => (v === null ? null : Number(v)));  // numeric

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
 * The password, fetched per connection, because a managed one MOVES.
 *
 * RDS was asked to manage the master password, which means Secrets Manager
 * rotates it — every seven days, by default, and it does not ask. A password
 * read once at boot and held in a DSN is therefore correct for a week and then
 * wrong forever, and the failure lands at 23:59 on a Tuesday, on a service
 * nobody is watching, as `password authentication failed`. Copying the password
 * into a second secret has the same fault with an extra place to forget.
 *
 * node-postgres takes `password` as a function and calls it for EVERY new
 * connection, which turns the whole problem into a fetch. This is that function
 * — with a short cache, because a pool filling ten connections at once should
 * make one call to Secrets Manager and not ten, and because the value is
 * needed on a path a user is waiting on.
 *
 * The cache is deliberately short rather than clever. Sixty seconds is the
 * longest a rotation can keep new connections failing, existing ones are
 * already authenticated and unaffected, and the alternative — invalidating on
 * an authentication error — needs the failure to be visible at a layer that
 * does not see it. `invalidate()` is exported into the pool's error handler so
 * a dropped connection also clears it, which covers the common case sooner.
 */
function secretPassword(secretId, field) {
  let cached = null;
  let until = 0;
  let inflight = null;
  const key = field || 'password';
  const TTL_MS = Number(process.env.DB_PASSWORD_TTL_MS || 60000);

  const fetchNow = async () => {
    /* Required lazily: server/secrets.js pulls in the signer, and a SQLite
       install should not load either of them to open a file. */
    const secrets = require('./secrets');
    const json = await secrets.fetchSecret(secretId);
    const value = json && json[key];
    if (!value) {
      /* Never the secret's contents, and never the value — just which name was
         looked for, which is the only part that helps. */
      throw new Error(`the secret has no "${key}" field`);
    }
    return String(value);
  };

  const get = async () => {
    if (cached && Date.now() < until) return cached;
    /* One fetch in flight at a time. Ten connections opening together is the
       normal case, not the exception. */
    if (!inflight) {
      inflight = fetchNow()
        .then(v => { cached = v; until = Date.now() + TTL_MS; return v; })
        .finally(() => { inflight = null; });
    }
    return inflight;
  };

  get.invalidate = () => { cached = null; until = 0; };
  return get;
}

/**
 * One connection pool, and the state that rides with it.
 *
 * `idTables` is filled at connect from the live catalogue rather than from a
 * list kept here. A list would be a second copy of the schema, and the schema
 * is already generated from one place on purpose.
 *
 * The connection itself comes from one of two places. A DSN — `DATABASE_URL` —
 * is what a laptop, the test suite and a self-hosted Postgres all use. The
 * separate `PG*` variables are what a managed database wants, because there the
 * password is not a constant and does not belong in a string: `DB_PASSWORD_SECRET`
 * names a Secrets Manager secret and the password is fetched per connection.
 */
function createPg(opts) {
  const o = opts || {};
  /* What the CALLER passed beats what happens to be in the environment, both
     ways round. A caller naming a host means the parts branch even though
     `PG_URL` is exported for the test suites — getting that precedence backwards
     silently ignored every option passed in, and the test that was meant to
     catch it passed, because it connected to the right server by the wrong
     route. Only when the caller says nothing does the environment decide. */
  const url = o.url || (o.host ? '' : (process.env.DATABASE_URL || process.env.PG_URL));
  const secretId = o.passwordSecret || process.env.DB_PASSWORD_SECRET || '';

  const config = {
    max: Number(o.max || process.env.PG_POOL_MAX || 10),
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: Number(o.connectTimeoutMs || 10000)
  };

  if (url) {
    config.connectionString = url;
  } else {
    config.host = o.host || process.env.PGHOST;
    config.port = Number(o.port || process.env.PGPORT || 5432);
    config.database = o.database || process.env.PGDATABASE;
    config.user = o.user || process.env.PGUSER;
    /* TLS on, and VERIFIED. The certificate authority is Amazon's, which is not
       in Node's default trust store — the image carries the RDS root bundle and
       `NODE_EXTRA_CA_CERTS` points at it, which is a whole-process setting and
       so covers `scripts/pg-migrate.mjs` and its bare `new Client()` too.
     *
       Two escape hatches, both explicit. `PGSSLMODE=disable` is plaintext, for
       the local cluster the test suite starts, which has no TLS at all.
       `PGSSLMODE=no-verify` encrypts without checking who answered, which is
       what to reach for if a certificate problem is standing between you and an
       incident — but it is not a resting place: it accepts any certificate, so
       anything that can get in front of the database can read the traffic. */
    const mode = process.env.PGSSLMODE || 'require';
    if (mode === 'no-verify') config.ssl = { rejectUnauthorized: false };
    else if (mode !== 'disable') config.ssl = { rejectUnauthorized: true };
  }

  let password = null;
  if (secretId) {
    password = secretPassword(secretId, o.passwordField || process.env.DB_PASSWORD_FIELD);
    config.password = password;
    /* A DSN with a password in it AND a secret naming another one is a
       configuration nobody meant. The secret wins — it is the one that rotates
       — and it is said out loud, because the other way round is an incident. */
    if (url && /:\/\/[^@/]*:[^@/]+@/.test(url)) {
      console.warn('[pg] DB_PASSWORD_SECRET is set, so the password in the connection string is ignored.');
    }
  }

  const pool = new Pool(config);

  /* A pool emits errors for idle clients the server has dropped. Unhandled,
     that is an uncaught exception and the process dies for a connection nobody
     was using. */
  pool.on('error', e => {
    console.error('[pg] idle client error:', e && e.message);
    /* A dropped connection is the commonest way a rotation announces itself
       before the TTL is up. Clearing here means the next connection re-fetches
       rather than waiting out the cache. */
    if (password) password.invalidate();
  });

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

module.exports = { createPg, secretPassword, toDollars, orIgnore, insertTarget };
