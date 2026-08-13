/**
 * The data layer — SQLite embedded through node:sqlite (no native dependency).
 * Database file: data/prep.sqlite (gitignored, created and seeded on the first run).
 *
 * Conventions:
 * - Every query is a prepared statement with bound parameters (against SQL injection).
 * - A *_json column holds a JSON string; read it back with jparse().
 * - Times are stored as ISO-8601 UTC strings, so comparing and sorting is textual.
 */
'use strict';
const { DatabaseSync } = require('node:sqlite');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const DATA_DIR = path.join(__dirname, '..', 'data');
const DB_FILE = process.env.PREP_DB || path.join(DATA_DIR, 'prep.sqlite');

if (DB_FILE !== ':memory:') fs.mkdirSync(path.dirname(DB_FILE), { recursive: true });

const db = new DatabaseSync(DB_FILE);
db.exec('PRAGMA journal_mode = WAL');
db.exec('PRAGMA foreign_keys = ON');

/* ============================== SCHEMA ============================== */
db.exec(`
CREATE TABLE IF NOT EXISTS admins (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  username TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  pass_hash TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'editor',          -- owner | editor
  active INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL,
  last_login_at TEXT
);

CREATE TABLE IF NOT EXISTS sessions (
  token_hash TEXT PRIMARY KEY,                  -- only the token's hash is stored
  admin_id INTEGER NOT NULL REFERENCES admins(id) ON DELETE CASCADE,
  created_at TEXT NOT NULL,
  expires_at TEXT NOT NULL,
  ip TEXT,
  ua TEXT
);

CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  username TEXT NOT NULL UNIQUE,
  email TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  pass_hash TEXT,
  verified INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'active',        -- active | locked
  interests_json TEXT NOT NULL DEFAULT '[]',
  note TEXT,
  created_at TEXT NOT NULL,
  last_login_at TEXT
);

-- Student sessions. Kept apart from the admin sessions table so neither area
-- can ever pick up the other's session; again, only the token's HASH is stored.
CREATE TABLE IF NOT EXISTS user_sessions (
  token_hash TEXT PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TEXT NOT NULL,
  expires_at TEXT NOT NULL,
  ip TEXT,
  ua TEXT
);

-- Single-use tokens sent by email: account verification and password reset.
-- The hash is stored, so a leaked database cannot rebuild the link in an inbox.
CREATE TABLE IF NOT EXISTS user_tokens (
  token_hash TEXT PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  kind TEXT NOT NULL,                           -- verify | reset
  created_at TEXT NOT NULL,
  expires_at TEXT NOT NULL,
  used_at TEXT
);

CREATE INDEX IF NOT EXISTS idx_user_tokens_user ON user_tokens(user_id, kind);

-- Sign-in lockout and sliding-window rate limiting.
--
-- These lived in two Maps in one process's memory, which was wrong in two ways
-- at once. A restart wiped every lockout, so the answer to "I am locked out"
-- was "restart the server" -- and it is the attacker who benefits most from a
-- counter that forgets. And on more than one instance the lockout becomes five
-- guesses PER INSTANCE, which quietly undoes it at exactly the moment there is
-- enough traffic to need it.
--
-- One row per hit rather than a counter or a JSON array: a sliding window needs
-- the individual timestamps, and COUNT(*) over a time range is race-free between
-- processes in a way that read-modify-write on a shared row is not.
CREATE TABLE IF NOT EXISTS throttle_hits (
  bucket TEXT NOT NULL,
  at     TEXT NOT NULL                           -- ISO 8601: sorts chronologically
);

CREATE INDEX IF NOT EXISTS idx_throttle_hits ON throttle_hits(bucket, at);

CREATE TABLE IF NOT EXISTS throttle_locks (
  bucket       TEXT PRIMARY KEY,
  fails        INTEGER NOT NULL DEFAULT 0,
  locked_until TEXT                              -- null while merely counting
);

CREATE INDEX IF NOT EXISTS idx_throttle_locks_until ON throttle_locks(locked_until);

-- One-use recovery codes for an administrator who has lost their authenticator.
--
-- Without these, enrolling a second factor is a way to lock yourself out of your
-- own platform permanently, and the honest advice would be "do not turn it on".
-- Only the HASH is stored, for the same reason session tokens are: a leaked
-- database must not hand over a working way in.
CREATE TABLE IF NOT EXISTS admin_recovery_codes (
  code_hash TEXT PRIMARY KEY,
  admin_id  INTEGER NOT NULL REFERENCES admins(id) ON DELETE CASCADE,
  created_at TEXT NOT NULL,
  used_at   TEXT
);

CREATE INDEX IF NOT EXISTS idx_recovery_admin ON admin_recovery_codes(admin_id, used_at);

-- Self-study: the V1–V2–V3 irregular verb table.
-- Searchable on any column (typing "went" must find "go"), so all three are indexed.
CREATE TABLE IF NOT EXISTS irregular_verbs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  v1 TEXT NOT NULL UNIQUE,
  v2 TEXT NOT NULL,
  v3 TEXT NOT NULL,
  ving TEXT NOT NULL,
  ipa_uk TEXT,
  ipa_us TEXT,
  vi TEXT NOT NULL,                             -- the Vietnamese gloss
  grp TEXT NOT NULL,                            -- aaa | aba | abb | abc
  level TEXT NOT NULL,                          -- A1…C2
  note TEXT,                                    -- British/American variants, pronunciation traps
  ex_en TEXT,
  ex_vi TEXT,
  sort INTEGER NOT NULL DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_irr_v2 ON irregular_verbs(v2);
CREATE INDEX IF NOT EXISTS idx_irr_v3 ON irregular_verbs(v3);
CREATE INDEX IF NOT EXISTS idx_irr_level ON irregular_verbs(level);

-- Linking words: arranged by function × register, with sentence position,
-- punctuation rules and warnings about misuse and overuse.
CREATE TABLE IF NOT EXISTS linking_words (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  word TEXT NOT NULL,
  fn TEXT NOT NULL,                             -- add | contrast | concession | cause | …
  register TEXT NOT NULL,                       -- spoken | neutral | academic
  pos TEXT NOT NULL,                            -- start | mid | end | start-mid | conj | prep
  punct TEXT NOT NULL,                          -- punctuation rule
  vi TEXT NOT NULL,
  level TEXT NOT NULL,
  ex_en TEXT NOT NULL,
  ex_vi TEXT NOT NULL,
  warn TEXT,                                    -- warning about overuse or misuse
  sort INTEGER NOT NULL DEFAULT 0,
  UNIQUE(word, fn)                              -- one word can serve several functions
);

CREATE INDEX IF NOT EXISTS idx_link_fn ON linking_words(fn);
CREATE INDEX IF NOT EXISTS idx_link_reg ON linking_words(register);
CREATE INDEX IF NOT EXISTS idx_link_level ON linking_words(level);

-- Grammar points. Each carries all four cuts docs/LEARNING.md §2 requires:
-- the form, when to use it, when NOT to, and telling it apart from confusable points.
-- The *_json columns hold arrays or objects, read back with jparse().
CREATE TABLE IF NOT EXISTS grammar_points (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  slug TEXT NOT NULL UNIQUE,
  name_en TEXT NOT NULL,
  name_vi TEXT NOT NULL,
  grp TEXT NOT NULL,                            -- tense | noun | modal | passive | …
  level TEXT NOT NULL,                          -- A1…C2
  summary TEXT NOT NULL,                        -- a one-sentence Vietnamese summary
  formula_json TEXT NOT NULL,                   -- {pos, neg, que, note}
  signals_json TEXT NOT NULL,                   -- ["every day", "always", …]
  use_when_json TEXT NOT NULL,                  -- ["use it when …", …]
  use_not_json TEXT NOT NULL,                   -- [{what, why}]
  confuse_json TEXT NOT NULL,                   -- [{with, tell, pair:[{en,vi},{en,vi}]}]
  errors_json TEXT NOT NULL,                    -- [{wrong, right, why}]
  sort INTEGER NOT NULL DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_gp_grp ON grammar_points(grp);
CREATE INDEX IF NOT EXISTS idx_gp_level ON grammar_points(level);

-- Example sentences and practice items for each grammar point.
CREATE TABLE IF NOT EXISTS grammar_examples (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  point_id INTEGER NOT NULL REFERENCES grammar_points(id) ON DELETE CASCADE,
  kind TEXT NOT NULL,                           -- example | practice
  en TEXT NOT NULL,                             -- the English sentence; a practice item contains '___'
  vi TEXT NOT NULL,
  ok INTEGER,                                   -- 1 correct, 0 counter-example, NULL for a practice item
  answer TEXT,                                  -- the answer, present only on a practice item
  note TEXT,                                    -- the explanation
  sort INTEGER NOT NULL DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_ge_point ON grammar_examples(point_id, kind, sort);

-- Self-study vocabulary, the five tables docs/LEARNING.md §6 sets out: the
-- headword, its meanings, example sentences under each meaning, its inflected
-- forms, and the chunks it lives in.
--
-- These are keyed on natural keys and upserted, not cleared and reloaded like
-- the other authored tables, for the reason seedVpetItems() gives about the
-- question bank. learn_progress will hold a sense id and a review date per
-- learner, so a row id has to survive a re-import: reloading the word list must
-- not reset somebody's spaced repetition. Clearing the table cannot promise
-- that; upserting on (headword, pos) can.
CREATE TABLE IF NOT EXISTS vocab_entries (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  headword TEXT NOT NULL,
  pos TEXT NOT NULL,                            -- noun | verb | adj | adv | prep | conj | det | pron | phrase
  level TEXT NOT NULL,                          -- A1…C2
  level_source TEXT NOT NULL,                   -- ngsl-rank | nawl | tsl | bsl | corpus | manual
  ipa_uk TEXT,
  ipa_us TEXT,
  freq_rank INTEGER,                            -- rank in the source list; NULL when the level came from a corpus count
  source TEXT NOT NULL,                         -- which open list the entry came from
  licence TEXT NOT NULL,                        -- and under what licence, per docs/LEARNING.md §1.3
  sort INTEGER NOT NULL DEFAULT 0,
  UNIQUE(headword, pos)                         -- "book" the noun and "book" the verb are two entries
);

CREATE INDEX IF NOT EXISTS idx_vocab_level ON vocab_entries(level);
CREATE INDEX IF NOT EXISTS idx_vocab_rank  ON vocab_entries(freq_rank);
CREATE INDEX IF NOT EXISTS idx_vocab_head  ON vocab_entries(headword);

-- One meaning. A sense carries its own level because the headword's level is the
-- level of its commonest meaning: "book" the object is A1, "book" as in reserve
-- a table is A2, and docs/LEARNING.md §1.2 counts them as two items.
CREATE TABLE IF NOT EXISTS vocab_senses (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  entry_id INTEGER NOT NULL REFERENCES vocab_entries(id) ON DELETE CASCADE,
  en TEXT NOT NULL,                             -- the English definition
  vi TEXT NOT NULL,                             -- the Vietnamese gloss
  level TEXT NOT NULL,
  note TEXT,                                    -- register, usage traps, what it is not
  sort INTEGER NOT NULL DEFAULT 0,
  UNIQUE(entry_id, en)
);

CREATE INDEX IF NOT EXISTS idx_vsense_entry ON vocab_senses(entry_id, sort);
CREATE INDEX IF NOT EXISTS idx_vsense_level ON vocab_senses(level);

-- Bilingual example sentences, hung off the meaning rather than the headword so
-- a sentence illustrates the sense it was chosen for. Source and licence are per
-- row because these arrive from Tatoeba one sentence at a time.
CREATE TABLE IF NOT EXISTS vocab_examples (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  sense_id INTEGER NOT NULL REFERENCES vocab_senses(id) ON DELETE CASCADE,
  en TEXT NOT NULL,
  vi TEXT NOT NULL,
  source TEXT NOT NULL,
  licence TEXT NOT NULL,
  sort INTEGER NOT NULL DEFAULT 0,
  UNIQUE(sense_id, en)
);

CREATE INDEX IF NOT EXISTS idx_vex_sense ON vocab_examples(sense_id, sort);

-- Inflected and derived forms. Indexed on the form itself because a learner who
-- types "children" has to land on "child".
CREATE TABLE IF NOT EXISTS vocab_forms (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  entry_id INTEGER NOT NULL REFERENCES vocab_entries(id) ON DELETE CASCADE,
  form TEXT NOT NULL,
  kind TEXT NOT NULL,                           -- plural | past | pastp | ving | third | comparative | superlative | derived
  note TEXT,                                    -- irregular spellings, British and American splits
  sort INTEGER NOT NULL DEFAULT 0,
  UNIQUE(entry_id, form, kind)
);

CREATE INDEX IF NOT EXISTS idx_vform_entry ON vocab_forms(entry_id, sort);
CREATE INDEX IF NOT EXISTS idx_vform_form  ON vocab_forms(form);

-- Collocations, docs/LEARNING.md §3.1. Hung off the entry rather than the sense:
-- a chunk often spans meanings, and forcing a choice would drop the ones that do.
CREATE TABLE IF NOT EXISTS collocations (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  entry_id INTEGER NOT NULL REFERENCES vocab_entries(id) ON DELETE CASCADE,
  chunk TEXT NOT NULL,
  kind TEXT NOT NULL,                           -- verb-noun | adj-noun | noun-noun | noun-prep | verb-prep | adj-prep | adv-adj | phrase
  level TEXT NOT NULL,
  ex_en TEXT NOT NULL,
  ex_vi TEXT NOT NULL,
  note TEXT,
  sort INTEGER NOT NULL DEFAULT 0,
  UNIQUE(entry_id, chunk)
);

CREATE INDEX IF NOT EXISTS idx_colloc_entry ON collocations(entry_id, sort);
CREATE INDEX IF NOT EXISTS idx_colloc_level ON collocations(level);
CREATE INDEX IF NOT EXISTS idx_colloc_kind  ON collocations(kind);

-- One learner's schedule for one study item, docs/LEARNING.md §6. The numbers
-- are SM-2's and they are computed in server/srs.js, never here and never in
-- the browser: a schedule the client can write is a schedule that resets itself
-- the first time somebody wants an easier session.
--
-- item_type names the table item_id points into, and there is deliberately
-- NO foreign key: the three content tables are re-seeded from files, and a
-- cascade delete would mean a corrected spelling in a word list silently wiping
-- somebody's six months of review history. The reference is checked when a
-- review is graded and dangling rows are simply skipped when the queue is built,
-- which is the failure that loses nothing.
CREATE TABLE IF NOT EXISTS learn_progress (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  item_type TEXT NOT NULL,                      -- vocab_sense | irregular_verb | linking_word
  item_id INTEGER NOT NULL,
  ease REAL NOT NULL DEFAULT 2.5,
  interval_days INTEGER NOT NULL DEFAULT 0,     -- 0 means "still being learned"
  reps INTEGER NOT NULL DEFAULT 0,              -- consecutive successes; reset by a failure
  lapses INTEGER NOT NULL DEFAULT 0,            -- total failures, never reset
  state TEXT NOT NULL DEFAULT 'learning',       -- learning | review
  last_grade TEXT,
  due_at TEXT NOT NULL,
  reviewed_at TEXT NOT NULL,
  created_at TEXT NOT NULL,
  UNIQUE(user_id, item_type, item_id)
);

-- The queue query is "my cards, due before now, soonest first", and the daily
-- new-card cap counts rows created today; both are covered here.
CREATE INDEX IF NOT EXISTS idx_lp_due     ON learn_progress(user_id, due_at);
CREATE INDEX IF NOT EXISTS idx_lp_created ON learn_progress(user_id, created_at);

-- Fingerprints of the authored content tables (irregular verbs, linking words, …).
-- Reloaded when a fingerprint changes, so correcting content or removing an entry
-- also reaches a running database — not only adding rows.
CREATE TABLE IF NOT EXISTS seed_meta (
  name TEXT PRIMARY KEY,
  hash TEXT NOT NULL,
  n INTEGER NOT NULL,
  at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS families (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  sub TEXT NOT NULL,
  format TEXT NOT NULL,
  skills_json TEXT NOT NULL DEFAULT '[]',
  sort INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS tests (
  id TEXT PRIMARY KEY,
  family_id TEXT NOT NULL REFERENCES families(id),
  title TEXT NOT NULL,
  level TEXT NOT NULL,
  duration_min INTEGER NOT NULL DEFAULT 0,
  scoring TEXT NOT NULL DEFAULT '',
  guide_json TEXT NOT NULL DEFAULT '[]',
  status TEXT NOT NULL DEFAULT 'draft',         -- draft | published | archived
  build_mode TEXT NOT NULL DEFAULT 'manual',    -- manual | auto
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  created_by INTEGER REFERENCES admins(id)
);

CREATE TABLE IF NOT EXISTS sections (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  test_id TEXT NOT NULL REFERENCES tests(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  skill TEXT NOT NULL,                          -- listening | reading | writing | speaking
  type TEXT NOT NULL,
  minutes INTEGER NOT NULL DEFAULT 0,
  sort INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS questions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  family_id TEXT NOT NULL REFERENCES families(id),
  skill TEXT NOT NULL,
  level TEXT NOT NULL,
  type TEXT NOT NULL,                           -- mcq | gap | essay | speaking
  prompt TEXT NOT NULL,
  options_json TEXT NOT NULL DEFAULT '[]',
  answer TEXT NOT NULL DEFAULT '',
  explanation TEXT NOT NULL DEFAULT '',
  tags_json TEXT NOT NULL DEFAULT '[]',
  status TEXT NOT NULL DEFAULT 'active',        -- active | retired
  created_at TEXT NOT NULL,
  created_by INTEGER REFERENCES admins(id)
);

CREATE TABLE IF NOT EXISTS section_items (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  section_id INTEGER NOT NULL REFERENCES sections(id) ON DELETE CASCADE,
  question_id INTEGER NOT NULL REFERENCES questions(id) ON DELETE CASCADE,
  sort INTEGER NOT NULL DEFAULT 0,
  UNIQUE (section_id, question_id)
);

CREATE TABLE IF NOT EXISTS batches (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  unlock_type TEXT NOT NULL,
  unlock_ref TEXT NOT NULL,
  qty INTEGER NOT NULL,
  expires_at TEXT,
  created_at TEXT NOT NULL,
  created_by INTEGER REFERENCES admins(id)
);

CREATE TABLE IF NOT EXISTS codes (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  code TEXT NOT NULL UNIQUE,
  batch_id INTEGER REFERENCES batches(id) ON DELETE SET NULL,
  unlock_type TEXT NOT NULL,                    -- test | family | bundle
  unlock_ref TEXT NOT NULL,                     -- test id / family id / a comma-separated list of ids
  status TEXT NOT NULL DEFAULT 'unused',        -- unused | redeemed | revoked
  expires_at TEXT,
  user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
  redeemed_at TEXT,
  note TEXT,
  created_at TEXT NOT NULL,
  created_by INTEGER REFERENCES admins(id)
);

CREATE TABLE IF NOT EXISTS packages (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  price INTEGER NOT NULL,
  family_id TEXT,
  description TEXT NOT NULL DEFAULT '',
  perks_json TEXT NOT NULL DEFAULT '[]',
  featured INTEGER NOT NULL DEFAULT 0,
  active INTEGER NOT NULL DEFAULT 1,
  sort INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS orders (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
  package_id TEXT,
  name TEXT NOT NULL,
  amount INTEGER NOT NULL DEFAULT 0,
  code_id INTEGER REFERENCES codes(id) ON DELETE SET NULL,
  status TEXT NOT NULL DEFAULT 'paid',          -- paid | pending | failed | refunded
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS audit (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  admin_id INTEGER REFERENCES admins(id) ON DELETE SET NULL,
  admin_name TEXT,
  action TEXT NOT NULL,
  target TEXT,
  meta_json TEXT NOT NULL DEFAULT '{}',
  ip TEXT,
  at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS attempts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL REFERENCES users(id),
  test_id TEXT NOT NULL REFERENCES tests(id),
  code_id INTEGER REFERENCES codes(id),         -- which purchase paid for this sitting
  status TEXT NOT NULL DEFAULT 'in_progress',   -- in_progress | submitted
  started_at TEXT NOT NULL,
  submitted_at TEXT,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS attempt_parts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  attempt_id INTEGER NOT NULL REFERENCES attempts(id) ON DELETE CASCADE,
  section_id INTEGER NOT NULL REFERENCES sections(id),
  part TEXT,
  started_at TEXT,                              -- NULL until the candidate enters it
  ends_at TEXT,                                 -- stamped from started_at + minutes
  closed_at TEXT,
  UNIQUE (attempt_id, section_id)
);

CREATE TABLE IF NOT EXISTS attempt_answers (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  attempt_id INTEGER NOT NULL REFERENCES attempts(id) ON DELETE CASCADE,
  question_id INTEGER NOT NULL REFERENCES questions(id),
  section_id INTEGER NOT NULL REFERENCES sections(id),
  answer TEXT NOT NULL DEFAULT '',
  audio_key TEXT,                               -- spoken answer, in the storage adapter
  replays_used INTEGER NOT NULL DEFAULT 0,
  updated_at TEXT NOT NULL,
  UNIQUE (attempt_id, question_id)
);

CREATE TABLE IF NOT EXISTS attempt_scores (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  attempt_id INTEGER NOT NULL REFERENCES attempts(id) ON DELETE CASCADE,
  skill TEXT NOT NULL,                          -- listening | reading | writing | speaking | overall
  raw_earned REAL NOT NULL DEFAULT 0,
  raw_max REAL NOT NULL DEFAULT 0,
  scaled REAL,                                  -- on the exam's own scale (VPET: 0-10 in steps of 0.5)
  method TEXT NOT NULL DEFAULT '',              -- the conversion table used
  pending INTEGER NOT NULL DEFAULT 0,           -- 1 = items are still waiting on a human or AI marker
  at TEXT NOT NULL,
  UNIQUE (attempt_id, skill)
);

CREATE TABLE IF NOT EXISTS settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_q_filter  ON questions (family_id, skill, level, status);
CREATE INDEX IF NOT EXISTS idx_codes_st  ON codes (status, expires_at);
CREATE INDEX IF NOT EXISTS idx_sec_test  ON sections (test_id, sort);
CREATE INDEX IF NOT EXISTS idx_audit_at  ON audit (at DESC);
CREATE INDEX IF NOT EXISTS idx_att_user  ON attempts (user_id, status);
CREATE INDEX IF NOT EXISTS idx_att_ans   ON attempt_answers (attempt_id);
CREATE INDEX IF NOT EXISTS idx_att_score ON attempt_scores (attempt_id);
`);

/* ============================ MIGRATIONS ============================
   CREATE TABLE IF NOT EXISTS never adds a column to a table that already
   exists, so databases created before a column was introduced would keep the
   old shape and every query touching that column would throw. Each entry
   below is checked against the live table and applied only when missing, so
   the same code boots a fresh database and an old one. */
function addColumnIfMissing(table, column, definition) {
  const have = db.prepare(`PRAGMA table_info(${table})`).all().some(c => c.name === column);
  if (!have) db.exec(`ALTER TABLE ${table} ADD COLUMN ${column} ${definition}`);
}

/* Only one exam family is buildable right now; the rest are parked as
   coming_soon so the catalogue can show them without offering tests. */
addColumnIfMissing('families', 'status', "TEXT NOT NULL DEFAULT 'ready'");

/* VPET parts E, F, G, H and J play an MP3 to the candidate, so a question can
   own one audio file. Only the storage key lives here — the bytes are in
   whichever storage driver is configured (see server/storage.js). */
/* A student can sign in with Google instead of a password. The subject id is
   the stable identifier: it survives the person renaming their email address.
   SQLite cannot add a UNIQUE column with ALTER, so the constraint comes from a
   unique index — which also permits many NULLs, exactly what is wanted for
   accounts that never link a Google identity. */
addColumnIfMissing('users', 'google_sub', 'TEXT');
db.exec('CREATE UNIQUE INDEX IF NOT EXISTS idx_users_google_sub ON users (google_sub)');

/* A code now carries a subscription plan rather than a list of tests: what a
   buyer picks is how long they practise and how much of the platform they get.
   The access window is stamped at redemption, so a code bought in January and
   redeemed in March starts counting in March. attempts_used is on the code
   because the cap belongs to the purchase, not to the account. */
addColumnIfMissing('codes', 'plan_id', 'TEXT');
addColumnIfMissing('codes', 'access_expires_at', 'TEXT');
addColumnIfMissing('codes', 'attempts_used', 'INTEGER NOT NULL DEFAULT 0');

/* Second factor on the administrator sign-in. Added as columns rather than a
   table because there is exactly one per administrator, and a NULL secret is a
   complete and correct answer for "not enrolled". totp_last_counter is what
   makes a code single-use: a code stays valid for its whole 30-second step, so
   without it one glimpsed over a shoulder could be replayed. */
addColumnIfMissing('admins', 'totp_secret', 'TEXT');
addColumnIfMissing('admins', 'totp_enabled_at', 'TEXT');
addColumnIfMissing('admins', 'totp_last_counter', 'INTEGER');

addColumnIfMissing('questions', 'audio_key', 'TEXT');
addColumnIfMissing('questions', 'audio_bytes', 'INTEGER');
addColumnIfMissing('questions', 'audio_at', 'TEXT');

/* Which lettered VPET part an item belongs to (A-J), or NULL for families that
   have no part table. Skill alone cannot separate them: parts B and D are both
   writing essays, F and G are both listening multiple choice, H and J are both
   spoken answers to audio. Drawing those from one skill-wide pool builds an
   exam that looks right and asks the wrong things - a "repeat this sentence"
   item landing in "retell the story". The letter is what keeps each part
   drawing from its own pool. */
addColumnIfMissing('questions', 'part', 'TEXT');
db.exec('CREATE INDEX IF NOT EXISTS idx_q_part ON questions (family_id, part, status)');

/* A stable key for authored items, so the item bank can be re-seeded in place.
   The other content tables are reloaded by clearing them, which cannot work
   here: section_items holds a foreign key into questions, so clearing the bank
   would empty every test built from it. An external key gives each authored
   item an identity that survives, and the seed upserts against it — correcting
   a typo in an item reaches a running database without disturbing the tests
   that already use it, and without touching anything an admin wrote by hand.
   Existing rows keep NULL here; SQLite treats NULLs as distinct, so the unique
   index does not collide across them. */
addColumnIfMissing('questions', 'ext_key', 'TEXT');
addColumnIfMissing('questions', 'source', 'TEXT');
addColumnIfMissing('questions', 'licence', 'TEXT');
db.exec('CREATE UNIQUE INDEX IF NOT EXISTS idx_q_ext_key ON questions (ext_key)');

/* A section on a built test remembers which lettered part it is, so re-drawing
   its items later pulls from the same pool the generator used. Reading the
   letter back out of the section name would break the moment an admin renames
   it, which they are free to do. */
addColumnIfMissing('sections', 'part', 'TEXT');

/* The marking trail for each item (docs/SCORING.md §2.4). A mark has to be
explicable: when a candidate disputes one, it must be possible to see which items
were right, which were wrong and why — not just a final number. */
addColumnIfMissing('attempt_answers', 'earned', 'REAL');
addColumnIfMissing('attempt_answers', 'max_score', 'REAL');
addColumnIfMissing('attempt_answers', 'mark_note', 'TEXT');
addColumnIfMissing('attempt_answers', 'marked_at', 'TEXT');

/* An order used to be a record of something that had already happened — the
   admin issued a code, the row said 'paid'. With a gateway in front of it an
   order is created BEFORE the money moves, so it needs the reference the
   gateway knows it by, which provider that is, and when it settled.
   `ref` is unique because it is what an incoming notification is matched on,
   and two orders answering to one reference is how a payment settles the wrong
   one. SQLite allows many NULLs in a unique index, so the rows that predate
   this stay as they are. */
addColumnIfMissing('orders', 'provider', 'TEXT');
addColumnIfMissing('orders', 'ref', 'TEXT');
addColumnIfMissing('orders', 'gateway_ref', 'TEXT');
addColumnIfMissing('orders', 'paid_at', 'TEXT');
db.exec('CREATE UNIQUE INDEX IF NOT EXISTS idx_orders_ref ON orders (ref)');

/* ============================== HELPERS ============================== */
const nowISO = () => new Date().toISOString();
const jparse = (s, fb) => { try { return JSON.parse(s); } catch (e) { return fb; } };

const q = {
  all(sql, ...p) { return db.prepare(sql).all(...p); },
  get(sql, ...p) { return db.prepare(sql).get(...p); },
  run(sql, ...p) { return db.prepare(sql).run(...p); },
  val(sql, ...p) { const r = db.prepare(sql).get(...p); return r ? Object.values(r)[0] : null; }
};

/** Run several statements in one transaction (node:sqlite has no transaction API yet) */
function tx(fn) {
  db.exec('BEGIN');
  try { const out = fn(); db.exec('COMMIT'); return out; }
  catch (e) { db.exec('ROLLBACK'); throw e; }
}

/** Mint a code as XXXX-XXXX-XXXX, leaving out the confusable characters (I, O, 0, 1) */
const CODE_ALPHA = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
function makeCode() {
  const chunk = () => Array.from(crypto.randomBytes(4))
    .map(b => CODE_ALPHA[b % CODE_ALPHA.length]).join('');
  return chunk() + '-' + chunk() + '-' + chunk();
}

function audit(req, action, target, meta) {
  const a = req && req.admin;
  q.run(
    'INSERT INTO audit (admin_id, admin_name, action, target, meta_json, ip, at) VALUES (?,?,?,?,?,?,?)',
    a ? a.id : null, a ? a.username : 'system', action, target || null,
    JSON.stringify(meta || {}), (req && req.ip) || null, nowISO()
  );
}

/* ============================== SEED ============================== */
/* VPET is the only family being built right now; every other family is parked
   as coming_soon. Columns: id, name, sub, format, skills, sort, status. */
const FAMILIES = [
  ['vpet',  'VPET',  'Vietnam Proficiency English Test', 'Parts A-J, 55 items, AI scored speaking', ['listening','reading','writing','speaking'], 1, 'ready'],
  ['vept',  'VEPT',  'Vietnam English Proficiency Test', '4 skills, CEFR aligned', ['listening','reading','writing','speaking'], 2, 'coming_soon'],
  ['ote',   'OTE',   'Oxford Test of English',    'Adaptive, 4 modules, CEFR A2-B2', ['listening','reading','writing','speaking'], 3, 'coming_soon'],
  ['toeic', 'TOEIC', 'Test of English for International Communication', 'L&R / S&W, 990 point scale', ['listening','reading'], 4, 'coming_soon'],
  ['ielts', 'IELTS', 'International English Language Testing System',   '4 skills, band 0-9', ['listening','reading','writing','speaking'], 5, 'coming_soon'],
  ['pte',   'PTE',   'Pearson Test of English',   'Computer based, AI scored, 10-90 scale', ['listening','reading','writing','speaking'], 6, 'coming_soon']
];

const SEED_TESTS = [
  { id:'vpet-b1-01', family:'vpet', title:'VPET four skills B1', level:'B1', dur:112, status:'published',
    scoring:'On the CEFR A1-C2 scale, converted per skill',
    guide:['Have headphones and a microphone ready before the Listening / Speaking parts.',
           'Each part has its own clock; when it runs out the system moves on.',
           'Writing and Speaking are marked automatically and come back with comments.'],
    sections:[['Listening','listening','Multiple choice',25],['Reading','reading','Multiple choice',35],
              ['Writing','writing','Essay',40],['Speaking','speaking','Recorded',12]] },
  { id:'ielts-ac-01', family:'ielts', title:'IELTS Academic Mock 01', level:'B2', dur:164, status:'draft',
    scoring:'Band 0-9, rounded to 0.5',
    guide:['The Listening audio plays once only, so read the questions first.',
           'Writing Task 2 carries two thirds of the Writing mark.',
           'Speaking mirrors the three-part interview, answered against the clock.'],
    sections:[['Listening','listening','Multiple choice + gap fill',30],['Reading','reading','Academic reading',60],
              ['Writing','writing','Task 1 + Task 2',60],['Speaking','speaking','3 parts, recorded',14]] },
  { id:'ielts-ac-02', family:'ielts', title:'IELTS Academic Mock 02', level:'C1', dur:164, status:'draft',
    scoring:'Band 0-9, rounded to 0.5',
    guide:['A harder paper: denser academic vocabulary than Mock 01.',
           'Allow 20 minutes per Reading passage.',
           'Speaking part 3 probes your opinions, so practise structured answers.'],
    sections:[['Listening','listening','Multiple choice + gap fill',30],['Reading','reading','Academic reading',60],
              ['Writing','writing','Task 1 + Task 2',60],['Speaking','speaking','3 parts, recorded',14]] },
  { id:'toeic-lr-01', family:'toeic', title:'TOEIC Listening & Reading 01', level:'B1', dur:120, status:'draft',
    scoring:'Scale 10-990 (5-495 per section)',
    guide:['There is no penalty for a wrong answer, so never leave one blank.',
           'Part 7 takes the longest, so move quickly through Parts 5-6.',
           'One clock covers the whole Reading section; pace yourself.'],
    sections:[['Listening','listening','Parts 1-4, multiple choice',45],['Reading','reading','Parts 5-7, multiple choice',75]] },
  { id:'toeic-lr-02', family:'toeic', title:'TOEIC Listening & Reading 02', level:'B2', dur:120, status:'draft',
    scoring:'Scale 10-990 (5-495 per section)',
    guide:['Pitched at the difficulty of the real exam from 2024 onwards.',
           'Practise the double and triple passage sets in Part 7.',
           'Listen on headphones to match exam-room conditions.'],
    sections:[['Listening','listening','Parts 1-4, multiple choice',45],['Reading','reading','Parts 5-7, multiple choice',75]] },
  { id:'pte-ac-01', family:'pte', title:'PTE Academic Mock 01', level:'B2', dur:127, status:'draft',
    scoring:'Scale 10-90, marked entirely by machine',
    guide:['Speak up, clearly and evenly: the marker rewards fluency.',
           'Read Aloud and Repeat Sentence carry a lot of weight.',
           'You cannot go back to a submitted item, so think before pressing Next.'],
    sections:[['Speaking & Writing','speaking','7 task types, recorded + typed',62],['Reading','reading','5 task types',30],
              ['Listening','listening','8 task types',35]] }
];

const PACKAGES = [
  ['pk-single','One mock test',49000,null,'Unlocks any one mock test currently in the library.',
   ['Pick the test when you activate the code','Valid for 6 months','Unlimited retakes within the term'],0,1],
  ['pk-vpet','VPET bundle',129000,'vpet','Every VPET test there is, plus new ones as they are published.',
   ['Every VPET test','New papers at no extra cost','Valid for 12 months'],0,2],
  ['pk-toeic','TOEIC bundle',179000,'toeic','The full TOEIC Listening & Reading set, new papers included.',
   ['Every TOEIC test','New papers at no extra cost','Valid for 12 months'],0,3],
  ['pk-ielts','IELTS bundle',199000,'ielts','The full IELTS Academic set, new papers included as they land.',
   ['Every IELTS test','New papers at no extra cost','Valid for 12 months'],0,4],
  ['pk-combo','Two-exam combo',329000,null,'Pick any two exams and unlock every test in both.',
   ['Any two exams','Saves 49.000đ against two separate bundles','Valid for 12 months'],1,5]
];

/* A sample question bank: enough for the paper generator to run straight away.
   This is placeholder content produced by the platform; real items replace it.
   Left in Vietnamese on purpose — the VPET item bank replaces every row of it, and
   translating throwaway exam items would mean writing exam content carelessly. */
function seedQuestions() {
  const LEVELS = ['A2', 'B1', 'B2', 'C1'];
  const MCQ = {
    listening: [
      ['Nghe đoạn hội thoại. Người nói đang ở đâu?', ['Ở sân bay','Ở nhà ga','Ở bến xe buýt','Ở bến phà'], 'Ở sân bay'],
      ['Nghe thông báo. Chuyến bay bị hoãn bao lâu?', ['30 phút','45 phút','1 giờ','2 giờ'], '45 phút'],
      ['Nghe đoạn ghi âm. Người nói đề nghị điều gì?', ['Đổi lịch họp','Huỷ hợp đồng','Tăng ngân sách','Tuyển thêm người'], 'Đổi lịch họp'],
      ['Nghe bài giảng ngắn. Chủ đề chính là gì?', ['Biến đổi khí hậu','Lịch sử kiến trúc','Kinh tế vĩ mô','Tâm lý học trẻ em'], 'Biến đổi khí hậu'],
      ['Nghe đoạn hội thoại. Hai người sẽ gặp nhau lúc mấy giờ?', ['9 giờ','10 giờ 30','11 giờ','1 giờ chiều'], '10 giờ 30']
    ],
    reading: [
      ['Đọc đoạn văn. Từ "significant" trong dòng 3 gần nghĩa nhất với từ nào?', ['important','unclear','frequent','temporary'], 'important'],
      ['Theo đoạn văn, nguyên nhân chính của hiện tượng là gì?', ['Đô thị hoá nhanh','Thời tiết cực đoan','Chính sách thuế','Thiếu lao động'], 'Đô thị hoá nhanh'],
      ['Chọn từ đúng: The report ____ that sales had risen sharply.', ['indicated','indicating','indicate','indication'], 'indicated'],
      ['Chọn giới từ đúng: She has been working here ____ 2019.', ['since','for','from','during'], 'since'],
      ['Đoạn văn chủ yếu nhằm mục đích gì?', ['So sánh hai phương pháp','Kể một câu chuyện','Quảng cáo sản phẩm','Hướng dẫn lắp đặt'], 'So sánh hai phương pháp'],
      ['Chọn dạng đúng: If he ____ earlier, he would have caught the train.', ['had left','has left','leaves','would leave'], 'had left']
    ]
  };
  const GAP = {
    listening: ['Nghe và điền từ còn thiếu: The meeting will start at ______ o\'clock.',
                'Nghe và điền số: The total cost is ______ dollars.',
                'Nghe và điền tên phòng: Please go to room ______.'],
    reading:   ['Điền từ vào chỗ trống: Applicants must submit their forms ______ Friday.',
                'Điền từ vào chỗ trống: The company plans to ______ its workforce next year.',
                'Điền từ vào chỗ trống: This policy applies ______ all employees.']
  };
  const ESSAY = [
    'Some people believe university education should be free for everyone. To what extent do you agree or disagree?',
    'Viết thư cho quản lý toà nhà phản ánh về tiếng ồn và đề xuất hướng xử lý (khoảng 150 từ).',
    'Biểu đồ cho thấy lượng khách du lịch tới ba thành phố trong 10 năm. Tóm tắt các đặc điểm chính.',
    'Many companies now allow staff to work from home. Discuss the advantages and disadvantages.'
  ];
  const SPEAK = [
    'Hãy giới thiệu về quê hương bạn và điều bạn thích nhất ở đó (1 phút).',
    'Mô tả một cuốn sách đã ảnh hưởng tới bạn. Nói trong 2 phút.',
    'Bạn nghĩ mạng xã hội tác động thế nào tới cách sinh viên học tập?',
    'Đọc to đoạn văn sau, chú ý trọng âm và ngữ điệu.'
  ];

  const ins = db.prepare(`INSERT INTO questions
    (family_id, skill, level, type, prompt, options_json, answer, explanation, tags_json, status, created_at)
    VALUES (?,?,?,?,?,?,?,?,?,'active',?)`);
  const at = nowISO();
  let n = 0;

  for (const [famId, , , , skills] of FAMILIES) {
    for (const skill of skills) {
      LEVELS.forEach((level, li) => {
        if (skill === 'listening' || skill === 'reading') {
          MCQ[skill].forEach((item, i) => {
            ins.run(famId, skill, level, 'mcq',
              `[${famId.toUpperCase()} ${level}] ${item[0]}`,
              JSON.stringify(item[1]), item[2],
              'A sample item generated by the platform, for exercising the paper generator.',
              JSON.stringify(['mẫu', skill]), at);
            n++;
          });
          GAP[skill].forEach((p, i) => {
            if (i > li) return;                       // a higher level gets more gap-fill items
            ins.run(famId, skill, level, 'gap',
              `[${famId.toUpperCase()} ${level}] ${p}`, '[]', '',
              'A sample item generated by the platform.', JSON.stringify(['mẫu', skill]), at);
            n++;
          });
        }
        if (skill === 'writing') {
          ESSAY.forEach(p => {
            ins.run(famId, skill, level, 'essay', `[${famId.toUpperCase()} ${level}] ${p}`, '[]', '',
              'A sample writing task, marked against the exam criteria.', JSON.stringify(['mẫu','writing']), at);
            n++;
          });
        }
        if (skill === 'speaking') {
          SPEAK.forEach(p => {
            ins.run(famId, skill, level, 'speaking', `[${famId.toUpperCase()} ${level}] ${p}`, '[]', '',
              'A sample speaking task; the candidate records an answer.', JSON.stringify(['mẫu','speaking']), at);
            n++;
          });
        }
      });
    }
  }
  return n;
}

/** First-run seed (idempotent: it only runs while a table is empty) */
function seed() {
  const at = nowISO();

  /* Families are reference data: nothing in the admin UI edits them, so the
     table is reconciled with FAMILIES on every boot. That keeps an existing
     database in step when a family is renamed or parked as coming_soon,
     instead of only ever seeding an empty table. */
  const insFam = db.prepare(
    'INSERT INTO families (id,name,sub,format,skills_json,sort,status) VALUES (?,?,?,?,?,?,?)');
  const updFam = db.prepare(
    'UPDATE families SET name=?, sub=?, format=?, skills_json=?, sort=?, status=? WHERE id=?');
  for (const [id, name, sub, format, skills, sort, status] of FAMILIES) {
    const skillsJson = JSON.stringify(skills);
    if (q.val('SELECT 1 FROM families WHERE id=?', id)) {
      updFam.run(name, sub, format, skillsJson, sort, status, id);
    } else {
      insFam.run(id, name, sub, format, skillsJson, sort, status);
    }
  }

  if (!q.val('SELECT COUNT(*) c FROM packages')) {
    const ins = db.prepare('INSERT INTO packages (id,name,price,family_id,description,perks_json,featured,active,sort) VALUES (?,?,?,?,?,?,?,1,?)');
    for (const [id, name, price, fam, desc, perks, feat, sort] of PACKAGES) {
      ins.run(id, name, price, fam, desc, JSON.stringify(perks), feat, sort);
    }
  }

  /* A parked family must not have anything on sale. Seeds above only run on an
     empty table, so an existing database needs the rule applied directly —
     otherwise tests published before a family was parked stay in the
     catalogue and students can still buy them. */
  const pulled = q.run(`UPDATE tests SET status='draft', updated_at=?
                         WHERE status='published'
                           AND family_id IN (SELECT id FROM families WHERE status='coming_soon')`, at);
  if (pulled.changes) {
    console.warn(`[seed] ${pulled.changes} test(s) of a parked family pulled back to draft.`);
  }

  /* The shop sells subscription plans now, not per-exam bundles. The plan
     table in server/data/plans.js is the single source: packages are synced
     from it on every boot, and anything not in it is retired rather than
     deleted, because historical orders point at those rows. */
  const PLANS = require('./data/plans');
  const insPkg = db.prepare(
    'INSERT INTO packages (id,name,price,family_id,description,perks_json,featured,active,sort) VALUES (?,?,?,NULL,?,?,?,1,?)');
  const updPkg = db.prepare(
    'UPDATE packages SET name=?, price=?, family_id=NULL, description=?, perks_json=?, featured=?, active=1, sort=? WHERE id=?');
  PLANS.PLANS.forEach((p, i) => {
    const perks = JSON.stringify(p.perks);
    /* Plus is the one most people should buy: long enough to matter, and the
       step that opens the study material. */
    const featured = p.id === 'plus-6m' ? 1 : 0;
    if (q.val('SELECT 1 FROM packages WHERE id=?', p.id)) {
      updPkg.run(p.name, p.price, p.tagline, perks, featured, i, p.id);
    } else {
      insPkg.run(p.id, p.name, p.price, p.tagline, perks, featured, i);
    }
  });
  const retired = q.run(
    `UPDATE packages SET active=0 WHERE active=1 AND id NOT IN (${PLANS.PLANS.map(() => '?').join(',')})`,
    ...PLANS.PLANS.map(p => p.id));
  if (retired.changes) console.warn(`[seed] ${retired.changes} old bundle(s) retired in favour of the time-limited plans.`);

  if (!q.val('SELECT COUNT(*) c FROM questions')) seedQuestions();
  seedVpetItems();

  if (!q.val('SELECT COUNT(*) c FROM tests')) {
    const insT = db.prepare(`INSERT INTO tests
      (id,family_id,title,level,duration_min,scoring,guide_json,status,build_mode,created_at,updated_at)
      VALUES (?,?,?,?,?,?,?,?,'manual',?,?)`);
    const insS = db.prepare('INSERT INTO sections (test_id,name,skill,type,minutes,sort) VALUES (?,?,?,?,?,?)');
    for (const t of SEED_TESTS) {
      insT.run(t.id, t.family, t.title, t.level, t.dur, t.scoring, JSON.stringify(t.guide), t.status, at, at);
      t.sections.forEach(([name, skill, type, minutes], i) => {
        insS.run(t.id, name, skill, type, minutes, i);
        // Attach bank questions to each part so the paper has content immediately
        const secId = q.val('SELECT id FROM sections WHERE test_id=? ORDER BY id DESC LIMIT 1', t.id);
        const want = skill === 'writing' ? 2 : skill === 'speaking' ? 3 : 20;
        const pool = q.all(
          `SELECT id FROM questions WHERE family_id=? AND skill=? AND status='active' ORDER BY level=? DESC, id LIMIT ?`,
          t.family, skill, t.level, want);
        const insI = db.prepare('INSERT OR IGNORE INTO section_items (section_id,question_id,sort) VALUES (?,?,?)');
        pool.forEach((r, j) => insI.run(secId, r.id, j));
      });
    }
  }

  if (!q.val('SELECT COUNT(*) c FROM users')) {
    // The demo student account (matching the seed account on the front end)
    const ins = db.prepare(`INSERT INTO users (username,email,name,verified,status,interests_json,created_at)
                            VALUES (?,?,?,?,?,?,?)`);
    const daysAgo = n => new Date(Date.now() - n * 86400000).toISOString();
    ins.run('student', 'student@vpetprep.vn', 'Demo Student', 1, 'active', JSON.stringify(['vpet','ielts']), daysAgo(21));
    const DEMO = [
      ['thuhang.nt','thuhang.nt@ftu.edu.vn','Nguyễn Thu Hằng',1,['ielts'],14],
      ['khanhqd','khanh.qd@hcmut.edu.vn','Quốc Khánh',1,['toeic','ielts'],11],
      ['mailinh.hu','mailinh@hutech.edu.vn','Mai Linh',0,['vpet'],8],
      ['baolong.tb','long.tb@sinhvien.edu.vn','Trần Bảo Long',1,['pte'],6],
      ['ngocanh.study','ngocanh.study@gmail.com','Ngọc Ánh',1,['ielts','toeic'],4],
      ['huyphan','huy.phan@uel.edu.vn','Phan Gia Huy',0,['ote'],2],
      ['thaovy.dn','thaovy@dut.udn.vn','Đỗ Thảo Vy',1,['vept'],1]
    ];
    for (const [u, e, n2, v, itr, d] of DEMO) {
      ins.run(u, e, n2, v, 'active', JSON.stringify(itr), daysAgo(d));
    }
  }

  if (!q.val('SELECT COUNT(*) c FROM codes')) {
    const insB = db.prepare('INSERT INTO batches (name,unlock_type,unlock_ref,qty,expires_at,created_at) VALUES (?,?,?,?,?,?)');
    const insC = db.prepare(`INSERT INTO codes (code,batch_id,unlock_type,unlock_ref,status,expires_at,user_id,redeemed_at,note,created_at)
                             VALUES (?,?,?,?,?,?,?,?,?,?)`);
    const daysFromNow = n => new Date(Date.now() + n * 86400000).toISOString().slice(0, 10);
    const daysAgo = n => new Date(Date.now() - n * 86400000).toISOString();

    // A demo batch for a class
    insB.run('Lớp IELTS K62 - đợt 1', 'family', 'ielts', 8, daysFromNow(120), nowISO());
    const b1 = q.val('SELECT id FROM batches ORDER BY id DESC LIMIT 1');
    for (let i = 0; i < 8; i++) insC.run(makeCode(), b1, 'family', 'ielts', 'unused', daysFromNow(120), null, null, null, nowISO());

    // Fixed codes, matching the demo codes on the front end
    const studentId = q.val("SELECT id FROM users WHERE username='student'");
    insC.run('VPET-B1MK-24TR', null, 'test', 'vpet-b1-01', 'redeemed', daysFromNow(144), studentId, daysAgo(8), 'Issued to the demo account', daysAgo(10));
    insC.run('IELT-AC12-96HD', null, 'family', 'ielts', 'unused', daysFromNow(67), null, null, null, daysAgo(9));
    insC.run('TOEC-LR20-26CB', null, 'family', 'toeic', 'unused', daysFromNow(200), null, null, null, daysAgo(7));
    insC.run('PREP-HHAN-2025', null, 'family', 'pte', 'unused', '2025-12-31', null, null, 'An illustrative code, past its date', daysAgo(300));
    insC.run('PREP-DUNG-ROI1', null, 'test', 'ielts-ac-01', 'redeemed', daysFromNow(140),
      q.val("SELECT id FROM users WHERE username='thuhang.nt'"), daysAgo(12), null, daysAgo(13));

    // A few spent codes so the reports have something to show
    const users = q.all("SELECT id FROM users WHERE username IN ('khanhqd','ngocanh.study','baolong.tb')");
    const refs = [['family','toeic'], ['family','ielts'], ['test','pte-ac-01']];
    users.forEach((u, i) => {
      insC.run(makeCode(), null, refs[i][0], refs[i][1], 'redeemed', daysFromNow(180), u.id, daysAgo(i + 2), null, daysAgo(i + 3));
    });
  }

  /* The demo codes' plans are reconciled on every boot, not only at seed time. The
     block above only runs while the codes table is empty, so a database created
     before the plan model existed would keep plan_id NULL for ever — and a code
     with no plan opens nothing when redeemed. The symptom was the demo account
     silently losing all access after an upgrade, with no error anywhere.

     This has to sit AFTER the insert, and used to sit before it. On a fresh
     database the loop then ran while the codes table was still empty, found
     nothing to reconcile, and the INSERT below it named no plan_id column — so a
     brand-new install shipped sixteen codes that opened nothing, and only the
     SECOND boot repaired them. Redeeming one answered "This code has no plan
     attached. Ask your centre to issue a replacement", which is exactly the
     sentence you do not want a new customer reading on day one.

     Only the five fixed demo codes are touched: a real buyer's code missing its
     plan is something to settle by hand, not by issuing a plan automatically. */
  const DEMO_CODE_PLANS = [
    ['VPET-B1MK-24TR', 'plus-6m', 6],
    ['IELT-AC12-96HD', 'starter-3m', 0],
    ['TOEC-LR20-26CB', 'pro-12m', 0],
    ['PREP-HHAN-2025', 'starter-3m', 0],
    ['PREP-DUNG-ROI1', 'starter-3m', 3]
  ];
  const monthsFromNow = n => {
    const d = new Date(); d.setMonth(d.getMonth() + n); return d.toISOString();
  };
  let reattached = 0;
  for (const [code, planId, months] of DEMO_CODE_PLANS) {
    const row = q.get('SELECT id, plan_id FROM codes WHERE code=?', code);
    if (!row || row.plan_id) continue;
    q.run('UPDATE codes SET plan_id=?, access_expires_at=? WHERE id=?',
      planId, months ? monthsFromNow(months) : null, row.id);
    reattached++;
  }
  if (reattached) console.warn(`[seed] ${reattached} demo code(s) had their plan reattached.`);

  if (!q.val('SELECT COUNT(*) c FROM orders')) {
    const ins = db.prepare('INSERT INTO orders (user_id,package_id,name,amount,status,created_at) VALUES (?,?,?,?,?,?)');
    const daysAgo = n => new Date(Date.now() - n * 86400000).toISOString();
    const rows = [
      ['ngocanh.study','pk-ielts','IELTS bundle',199000,2],
      ['khanhqd','pk-toeic','TOEIC bundle',179000,3],
      ['baolong.tb','pk-single','One mock test',49000,5],
      ['thuhang.nt','pk-ielts','IELTS bundle',199000,12],
      ['mailinh.hu','pk-vpet','VPET bundle',129000,7],
      ['student','pk-vpet','VPET bundle',129000,10]
    ];
    for (const [u, pk, name, amt, d] of rows) {
      ins.run(q.val('SELECT id FROM users WHERE username=?', u), pk, name, amt, 'paid', daysAgo(d));
    }
  }

  if (!q.val("SELECT COUNT(*) c FROM settings")) {
    const ins = db.prepare('INSERT INTO settings (key,value) VALUES (?,?)');
    ins.run('brand.name', 'VPET Prep');
    ins.run('brand.tenant', 'default');
    ins.run('platform.notice', '');
  }

  seedIrregularVerbs();
  seedLinkingWords();
  seedGrammar();
  seedVocab();
}

/* Load an authored content table if and only if its source file has changed.
   The comparison is a fingerprint of the content, not a row count: fixing one cell,
   renaming an entry or dropping one all have to reach a running database. These
   tables are small and nothing holds a foreign key into them, so clearing and
   reloading is the surest way — an entry removed from the source leaves nothing behind. */
function seedContent(name, rows, tables, apply) {
  const hash = crypto.createHash('sha256')
    .update(JSON.stringify(rows)).digest('hex').slice(0, 32);
  if (q.val('SELECT hash FROM seed_meta WHERE name=?', name) === hash) return;
  tx(() => {
    // Delete in the order given: child tables first, parents after, so a foreign key
    // cannot block halfway through.
    tables.forEach(t => db.exec(`DELETE FROM ${t}`));
    apply(rows);
    db.prepare(`INSERT INTO seed_meta (name,hash,n,at) VALUES (?,?,?,?)
      ON CONFLICT(name) DO UPDATE SET
        hash=excluded.hash, n=excluded.n, at=excluded.at`)
      .run(name, hash, Array.isArray(rows) ? rows.length : rows.n, nowISO());
  });
}

/** Load one flat table — the commonest use of seedContent. */
function seedTable(name, table, rows, insertSql, values) {
  seedContent(name, rows, [table], list => {
    const ins = db.prepare(insertSql);
    list.forEach((r, i) => ins.run(...values(r, i)));
  });
}

/* The VPET item bank.
   Upserted on ext_key rather than cleared and reloaded, because section_items
   holds a foreign key into questions: clearing the bank would empty every test
   built from it. An admin's own edits to prompt or status are left alone — only
   the authored rows carry an ext_key, and only those are touched. */
function seedVpetItems() {
  const rows = require('./data/vpet-items').rows();
  const at = nowISO();
  const ins = db.prepare(`INSERT INTO questions
      (ext_key, family_id, skill, level, type, part, prompt, options_json, answer,
       explanation, tags_json, source, licence, status, created_at)
    VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?, 'active', ?)
    ON CONFLICT(ext_key) DO UPDATE SET
      skill=excluded.skill, level=excluded.level, type=excluded.type,
      part=excluded.part, prompt=excluded.prompt, options_json=excluded.options_json,
      answer=excluded.answer, explanation=excluded.explanation,
      tags_json=excluded.tags_json, source=excluded.source, licence=excluded.licence`);

  let n = 0;
  tx(() => {
    for (const r of rows) {
      const before = q.val('SELECT 1 FROM questions WHERE ext_key=?', r.key);
      ins.run(r.key, 'vpet', r.skill, r.level, r.type, r.part, r.prompt,
        JSON.stringify(r.options), r.answer, r.explanation,
        JSON.stringify(r.tags), r.source, r.licence, at);
      if (!before) n++;
    }
  });
  if (n) console.warn(`[seed] ${n} VPET bank item(s) added.`);
}

/* The self-study vocabulary, docs/LEARNING.md §6.

   Upserted on natural keys rather than cleared and reloaded, for a reason the
   other content tables do not have: learn_progress will hold a sense id and a
   review date per learner, so re-importing the word list must not renumber the
   rows underneath somebody's spaced repetition.

   Three rules the plain upsert in seedVpetItems() does not need:

   1. A level whose `level_source` is `manual` is left alone. §1.4 says a hand
      adjustment in the admin area beats the three automatic rules; an import
      that quietly reverted it would make that sentence untrue. Everything else
      about the entry is still refreshed — only the level is pinned.
   2. Children that the source no longer lists are deleted, but only within the
      entries being imported. A sense that is still there keeps its id, so
      progress against it survives; a sense that has gone takes its examples
      with it through ON DELETE CASCADE.
   3. Entries the import does not mention are not touched at all, so a word an
      administrator adds by hand is not swept away by the next run. */
function seedVocab() {
  const rows = require('./data/vocab').rows();

  const insEntry = db.prepare(`INSERT INTO vocab_entries
      (headword,pos,level,level_source,ipa_uk,ipa_us,freq_rank,source,licence,sort)
    VALUES (?,?,?,?,?,?,?,?,?,?)
    ON CONFLICT(headword,pos) DO UPDATE SET
      level = CASE WHEN vocab_entries.level_source = 'manual'
                   THEN vocab_entries.level ELSE excluded.level END,
      level_source = CASE WHEN vocab_entries.level_source = 'manual'
                   THEN vocab_entries.level_source ELSE excluded.level_source END,
      ipa_uk=excluded.ipa_uk, ipa_us=excluded.ipa_us, freq_rank=excluded.freq_rank,
      source=excluded.source, licence=excluded.licence, sort=excluded.sort`);

  const insSense = db.prepare(`INSERT INTO vocab_senses (entry_id,en,vi,level,note,sort)
    VALUES (?,?,?,?,?,?)
    ON CONFLICT(entry_id,en) DO UPDATE SET
      vi=excluded.vi, level=excluded.level, note=excluded.note, sort=excluded.sort`);

  const insExample = db.prepare(`INSERT INTO vocab_examples (sense_id,en,vi,source,licence,sort)
    VALUES (?,?,?,?,?,?)
    ON CONFLICT(sense_id,en) DO UPDATE SET
      vi=excluded.vi, source=excluded.source, licence=excluded.licence, sort=excluded.sort`);

  const insForm = db.prepare(`INSERT INTO vocab_forms (entry_id,form,kind,note,sort)
    VALUES (?,?,?,?,?)
    ON CONFLICT(entry_id,form,kind) DO UPDATE SET note=excluded.note, sort=excluded.sort`);

  const insColloc = db.prepare(`INSERT INTO collocations
      (entry_id,chunk,kind,level,ex_en,ex_vi,note,sort)
    VALUES (?,?,?,?,?,?,?,?)
    ON CONFLICT(entry_id,chunk) DO UPDATE SET
      kind=excluded.kind, level=excluded.level, ex_en=excluded.ex_en,
      ex_vi=excluded.ex_vi, note=excluded.note, sort=excluded.sort`);

  /* Delete the children of this entry that the source has stopped listing.
     Bound parameters only, so the placeholder list is built from the count. */
  const pruneUnlisted = (table, column, entryId, keep) => {
    const holes = keep.map(() => '?').join(',');
    db.prepare(`DELETE FROM ${table} WHERE entry_id = ?` +
      (keep.length ? ` AND ${column} NOT IN (${holes})` : '')).run(entryId, ...keep);
  };

  let added = 0;
  tx(() => {
    for (const e of rows) {
      const before = q.val('SELECT id FROM vocab_entries WHERE headword=? AND pos=?', e.headword, e.pos);
      insEntry.run(e.headword, e.pos, e.level, e.levelSource, e.ipaUk, e.ipaUs,
        e.freqRank, e.source, e.licence, e.sort);
      const entryId = q.val('SELECT id FROM vocab_entries WHERE headword=? AND pos=?', e.headword, e.pos);
      if (!before) added++;

      for (const s of e.senses) {
        insSense.run(entryId, s.en, s.vi, s.level, s.note, s.sort);
        const senseId = q.val('SELECT id FROM vocab_senses WHERE entry_id=? AND en=?', entryId, s.en);
        for (const x of s.examples) insExample.run(senseId, x.en, x.vi, x.source, x.licence, x.sort);
        const keepEx = s.examples.map(x => x.en);
        const holes = keepEx.map(() => '?').join(',');
        db.prepare('DELETE FROM vocab_examples WHERE sense_id = ?' +
          (keepEx.length ? ` AND en NOT IN (${holes})` : '')).run(senseId, ...keepEx);
      }
      pruneUnlisted('vocab_senses', 'en', entryId, e.senses.map(s => s.en));

      for (const f of e.forms) insForm.run(entryId, f.form, f.kind, f.note, f.sort);
      pruneUnlisted('vocab_forms', 'form', entryId, e.forms.map(f => f.form));

      for (const c of e.collocations)
        insColloc.run(entryId, c.chunk, c.kind, c.level, c.exEn, c.exVi, c.note, c.sort);
      pruneUnlisted('collocations', 'chunk', entryId, e.collocations.map(c => c.chunk));
    }
  });
  if (added) console.warn(`[seed] ${added} vocabulary entr${added === 1 ? 'y' : 'ies'} added.`);
}

/* The V1–V2–V3 irregular verb table */
function seedIrregularVerbs() {
  seedTable(
    'irregular-verbs', 'irregular_verbs',
    require('./data/irregular-verbs').rows(),
    `INSERT INTO irregular_verbs
      (v1,v2,v3,ving,ipa_uk,ipa_us,vi,grp,level,note,ex_en,ex_vi,sort)
      VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)`,
    (r, i) => [r.v1, r.v2, r.v3, r.ving, r.ipa_uk, r.ipa_us, r.vi,
      r.grp, r.level, r.note || null, r.ex_en || null, r.ex_vi || null, i]
  );
}

/* The linking-word table, by function × register */
function seedLinkingWords() {
  seedTable(
    'linking-words', 'linking_words',
    require('./data/linking-words').rows(),
    `INSERT INTO linking_words
      (word,fn,register,pos,punct,vi,level,ex_en,ex_vi,warn,sort)
      VALUES (?,?,?,?,?,?,?,?,?,?,?)`,
    (r, i) => [r.word, r.fn, r.register, r.pos, r.punct, r.vi,
      r.level, r.ex_en, r.ex_vi, r.warn || null, i]
  );
}

/* Grammar points plus their examples and practice items.
   The two tables are joined by a foreign key, so they load in one transaction under
   one fingerprint: the children point at the parent by slug, and a change on either
   side reloads both, so the two can never drift apart. */
function seedGrammar() {
  // Each group is its own file but they load together: the two tables are joined by
  // a foreign key, and clearing the parent takes every child with it, so the whole
  // set has to be rebuilt at once.
  const src = [
    require('./data/grammar-tenses'),
    require('./data/grammar-tenses-sequence'),
    require('./data/grammar-nouns'),
    require('./data/grammar-nouns-b1c2'),
    require('./data/grammar-adjectives'),
    require('./data/grammar-modals'),
    require('./data/grammar-modals-b2c2'),
    require('./data/grammar-conditionals'),
    require('./data/grammar-conditionals-c1c2'),
    require('./data/grammar-passive-reported'),
    require('./data/grammar-passive-reported-c1c2'),
    require('./data/grammar-clauses'),
    require('./data/grammar-clauses-b2'),
    require('./data/grammar-clauses-c1c2'),
    require('./data/grammar-emphasis'),
    require('./data/grammar-emphasis-c2'),
    require('./data/grammar-register'),
    require('./data/grammar-register-c1'),
    require('./data/grammar-register-c2')
  ];
  const points = src.flatMap(s => s.points());
  const examples = src.flatMap(s => s.examples());

  // Renumber by order of appearance within each group. Every file counts from 0, so
  // leaving those numbers alone would interleave two files of the same group;
  // renumbering here makes the file order in the array above decide display order.
  const dem = {};
  points.forEach(p => { p.sort = (dem[p.grp] = (dem[p.grp] || 0) + 1) - 1; });

  seedContent('grammar', { points, examples, n: points.length + examples.length },
    ['grammar_examples', 'grammar_points'],
    data => {
      const insP = db.prepare(`INSERT INTO grammar_points
        (slug,name_en,name_vi,grp,level,summary,formula_json,signals_json,
         use_when_json,use_not_json,confuse_json,errors_json,sort)
        VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)`);
      const idOf = new Map();
      data.points.forEach(p => {
        insP.run(p.slug, p.name_en, p.name_vi, p.grp, p.level, p.summary,
          p.formula_json, p.signals_json, p.use_when_json, p.use_not_json,
          p.confuse_json, p.errors_json, p.sort);
        idOf.set(p.slug, q.val('SELECT id FROM grammar_points WHERE slug=?', p.slug));
      });

      const insE = db.prepare(`INSERT INTO grammar_examples
        (point_id,kind,en,vi,ok,answer,note,sort) VALUES (?,?,?,?,?,?,?,?)`);
      data.examples.forEach(e => {
        const pid = idOf.get(e.slug);
        if (!pid) throw new Error('An example points at a grammar point that does not exist: ' + e.slug);
        insE.run(pid, e.kind, e.en, e.vi, e.ok, e.answer, e.note, e.sort);
      });
    });
}

seed();

module.exports = { db, q, tx, nowISO, jparse, makeCode, audit, DB_FILE, seedVocab };
