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
/* The published part tables. A paper's shape is read from here and never
   written down a second time — see buildPaperFromBlueprint(). */
const EXAM_FORMATS = require('./data/exam-formats');

const DATA_DIR = path.join(__dirname, '..', 'data');
const DB_FILE = process.env.PREP_DB || path.join(DATA_DIR, 'prep.sqlite');

if (DB_FILE !== ':memory:') fs.mkdirSync(path.dirname(DB_FILE), { recursive: true });

const db = new DatabaseSync(DB_FILE);
db.exec('PRAGMA journal_mode = WAL');
db.exec('PRAGMA foreign_keys = ON');

/* ---------------------- Two pragmas that are worth measuring ----------------------
 *
 * `synchronous` decides how often SQLite waits for the disk to confirm a write.
 * Measured on this project's own storage layer, one autocommit write at a time,
 * which is what a single autosave request does:
 *
 *     synchronous = FULL     0.246 ms per write    ~4,060 writes/s
 *     synchronous = NORMAL   0.026 ms per write   ~37,990 writes/s
 *
 * Nine times, for one line — and NORMAL is not a corner cut. Under WAL, SQLite
 * documents NORMAL as safe against corruption; what it gives up is durability
 * of the most recent transactions if the *operating system* dies or the machine
 * loses power. A crash of this process alone loses nothing, because the WAL is
 * already written — it is only the fsync that is deferred. FULL is the right
 * default for a rollback journal and an over-payment under WAL.
 *
 * The trade is worth naming plainly: in exchange for the throughput, a power
 * cut can cost the last few seconds of answers. That is recoverable — a learner
 * re-answers a question — and it is now backed by an actual backup, which it
 * was not before Block 0. Set PREP_SYNCHRONOUS=FULL to buy the durability back.
 *
 * `busy_timeout` is not an optimisation, it is a precondition. It is zero by
 * default, which means the instant two connections want the write lock the
 * loser gets SQLITE_BUSY immediately and the query throws. With one process
 * that almost never happens; with the cluster of Block 7 it happens constantly.
 * Five seconds is a ceiling to survive contention, not a target to sit at:
 * node:sqlite is synchronous, so a connection waiting on this lock blocks its
 * whole event loop for the duration. If waits ever get near it, that is the
 * signal to move to Postgres rather than to raise the number. */
const SYNCHRONOUS = (process.env.PREP_SYNCHRONOUS || 'NORMAL').toUpperCase();
/* OFF is deliberately not on this list. It is the setting where an OS crash can
   leave a *corrupt* database rather than merely a stale one, and no gain it
   offers over NORMAL is worth that on a system holding people's accounts. An
   env var that accepts it is an env var somebody eventually sets. */
if (!['NORMAL', 'FULL', 'EXTRA'].includes(SYNCHRONOUS)) {
  throw new Error('PREP_SYNCHRONOUS must be NORMAL, FULL or EXTRA — got ' + SYNCHRONOUS);
}
db.exec('PRAGMA synchronous = ' + SYNCHRONOUS);
db.exec('PRAGMA busy_timeout = ' + Number(process.env.PREP_BUSY_TIMEOUT_MS || 5000));

/* ============================== SCHEMA ==============================
   Held in a named constant rather than passed straight to db.exec(), because
   there is now a second reader: server/schema.js translates this same text into
   PostgreSQL for the move off SQLite. One definition, two dialects — a schema
   copied into a second file is a schema that is wrong within a month. */
const SCHEMA_SQL = `
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

/* Papers whose writing and speaking are still owed a mark.

   The marking pass used to live entirely in process memory: a queue, an array,
   and two callers — a submit, and an administrator pressing a button. Which
   meant a restart during a pass, and every deploy is one, dropped that work
   with nothing left behind that knew to pick it up. The candidate kept a null
   band for ever and nobody could see why.

   So the intention to mark a paper is written down. A row here says "this paper
   still owes marks, try again after next_try"; the row is deleted the moment
   nothing is outstanding. The try count drives the backoff, so a model that is
   down is retried soon and a paper that can never be finished — speaking with
   no transcription service configured — settles to once a day and costs nothing
   until somebody fixes the setting. */
CREATE TABLE IF NOT EXISTS ai_marking_backlog (
  attempt_id INTEGER PRIMARY KEY REFERENCES attempts(id) ON DELETE CASCADE,
  tries      INTEGER NOT NULL DEFAULT 0,
  next_try   TEXT NOT NULL,
  last_note  TEXT,
  updated_at TEXT NOT NULL
);

/* Every graded thing this learner has done, wherever it was graded.

   One table on purpose. The alternative arrives by itself if nobody decides
   against it: the exam keeps attempt_scores, drills keep a table, vocabulary
   keeps SRS counters, writing keeps rubric marks — five numbers for one person,
   none of which agree, and a progress panel that has to pick one to believe.
   Everything that marks anything writes a row here, and server/ability.js is
   the only thing that turns rows into a claim about what somebody can do.

   Deliberately one row per ITEM rather than per sitting. The estimator decays
   each event by its own age, and a pre-aggregated SUM has already thrown away
   the when; per-part ability could never be recovered from it either.

   UNIQUE (source, ref_id, item_key) because marking is idempotent — markAttempt
   says so in as many words — and a re-mark that appended rather than replaced
   would double every score it touched. */
CREATE TABLE IF NOT EXISTS skill_events (
  id        INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id   INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  source    TEXT NOT NULL,                 -- exam | drill | vocab | writing | speaking
  ref_id    TEXT NOT NULL,                 -- attempt id, drill id: what to trace back to
  item_key  TEXT NOT NULL,                 -- question id, word id: unique within that ref
  skill     TEXT NOT NULL,                 -- listening reading writing speaking grammar vocabulary
  part      TEXT,                          -- 'A'..'J', null when it belongs to no part
  topic     TEXT,                          -- grammar point or vocabulary group slug
  level     TEXT,                          -- B1 | B2 | C1 | C2
  earned    REAL NOT NULL,
  max_score REAL NOT NULL,
  weight    REAL NOT NULL DEFAULT 1,       -- an item under exam conditions counts for more
  at        TEXT NOT NULL,
  /* user_id FIRST, and it is not decoration. Without it the key identifies a
     piece of work rather than a learner's piece of work, and any two learners
     whose ref_id happens to match write onto one row — see widenSkillEventsKey
     in the migrations below for how that happened and what it cost. */
  UNIQUE (user_id, source, ref_id, item_key)
);
CREATE INDEX IF NOT EXISTS idx_se_user ON skill_events (user_id, at DESC);
CREATE INDEX IF NOT EXISTS idx_se_part ON skill_events (user_id, part, at DESC);

/* One row per criterion per marked item — the working behind a Writing or
   Speaking mark, kept so a learner can see WHY, and so a disputed score can be
   traced (docs/SCORING.md §2.1, principle 4).

   evidence is a span quoted from the candidate's OWN answer, and it is stored
   only after server/rubric.js has found it there: a marking service is a
   language model, and a quotation it invented looks exactly like proof.

   rubric_version is not decoration. Criteria will change, and rescoring old
   marks when they do would erase the learner's record of getting better; each
   score keeps the version it was made under. */
CREATE TABLE IF NOT EXISTS rubric_scores (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  attempt_id  INTEGER NOT NULL REFERENCES attempts(id) ON DELETE CASCADE,
  question_id INTEGER NOT NULL REFERENCES questions(id),
  criterion   TEXT NOT NULL,
  score       REAL NOT NULL,
  evidence    TEXT,
  comment     TEXT,
  version     TEXT NOT NULL,
  marked_by   TEXT NOT NULL DEFAULT 'ai',
  at          TEXT NOT NULL,
  UNIQUE (attempt_id, question_id, criterion)
);
CREATE INDEX IF NOT EXISTS idx_rs_attempt ON rubric_scores (attempt_id);

/* One placement per learner, sat once, before anything else.

   UNIQUE on user_id rather than a history of attempts: a placement is a
   starting point, and letting somebody re-sit it until they like the answer
   would make it a score to farm rather than a measurement. Re-placing is a
   deliberate act (delete the row) and belongs to whoever supports the learner.

   asked_json is written BEFORE the items are answered, so a reload cannot draw
   a different six and silently drop the ones already being thought about.
   right_json holds one count per rung, which is what settle() reads to work out
   the hardest level the learner actually held up at — different from the level
   they finished on whenever somebody is pushed up, struggles, and comes back
   down. */
/* One drill: a short paper for one part, sat at the learner's own level.

   item_ids_json is fixed when the drill is created, and submit() will only mark
   answers to ids that are in it. Without that, a client can post answers to any
   question in the bank and farm skill_events for items it chose itself — which
   would make the ability model a number the learner controls.

   No UNIQUE on user_id here, unlike placements: drilling repeatedly is the whole
   point. The thing that stops it being a way to grind the estimate up is the
   30-day cooldown in server/drills.js plus a weight below a real sitting. */
/* One revision set: gap sentences from a grammar topic, plus one sentence the
   learner writes themselves. Same shape and same guards as the drills table —
   the id list is fixed at creation so submit() cannot be told which questions
   to mark. The built column keeps what they wrote, because tier-3 marking
   happens later and the text has to still be there when it does.
   (No backticks anywhere in this comment: it lives inside the SCHEMA_SQL
   template literal, where a backtick ends the string.) */
CREATE TABLE IF NOT EXISTS revision_sets (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id       INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  topic         TEXT NOT NULL,
  level         TEXT NOT NULL,
  size          INTEGER NOT NULL,
  item_ids_json TEXT NOT NULL,
  status        TEXT NOT NULL DEFAULT 'open',
  started_at    TEXT NOT NULL,
  done_at       TEXT,
  earned        REAL,
  max_score     REAL,
  built         TEXT
);
CREATE INDEX IF NOT EXISTS idx_revsets_user ON revision_sets (user_id, done_at DESC);

CREATE TABLE IF NOT EXISTS drills (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id       INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  part          TEXT NOT NULL,
  level         TEXT NOT NULL,
  size          INTEGER NOT NULL,
  item_ids_json TEXT NOT NULL,
  status        TEXT NOT NULL DEFAULT 'open',
  started_at    TEXT NOT NULL,
  done_at       TEXT,
  earned        REAL,
  max_score     REAL
);
CREATE INDEX IF NOT EXISTS idx_drills_user ON drills (user_id, done_at DESC);

CREATE TABLE IF NOT EXISTS drill_answers (
  drill_id    INTEGER NOT NULL REFERENCES drills(id) ON DELETE CASCADE,
  question_id INTEGER NOT NULL REFERENCES questions(id),
  answer      TEXT,
  earned      REAL,
  max_score   REAL,
  note        TEXT,
  PRIMARY KEY (drill_id, question_id)
);

CREATE TABLE IF NOT EXISTS placements (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id      INTEGER NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
  status       TEXT NOT NULL DEFAULT 'open',
  rung         INTEGER NOT NULL DEFAULT 1,
  level        TEXT NOT NULL DEFAULT 'B1',
  asked_json   TEXT NOT NULL DEFAULT '[]',
  right_json   TEXT NOT NULL DEFAULT '[]',
  started_at   TEXT NOT NULL,
  done_at      TEXT,
  placed_level TEXT,
  placed_score REAL
);

/* One administrator's standing permission to act on their Google account —
   today only Classroom. The refresh token is stored ENCRYPTED (AES-256-GCM,
   see server/classroom.js): unlike a TOTP secret, which is useless without the
   password, a Google refresh token is on its own a way into somebody's account
   until they revoke it, and this row travels with every database export.
   One grant per administrator; re-consenting replaces it. */
CREATE TABLE IF NOT EXISTS google_grants (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  admin_id   INTEGER NOT NULL UNIQUE REFERENCES admins(id) ON DELETE CASCADE,
  email      TEXT,
  scopes     TEXT NOT NULL,
  token_enc  TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

/* One row per outgoing call to a model provider. A LEDGER, not a cache: it is
   what the daily spend ceilings in server/ai-budget.js are counted from, and
   the reason it is its own table rather than a count of rubric_scores is that
   a mark is a call that SUCCEEDED. A call that timed out after the model had
   already generated its answer costs exactly the same and leaves no mark, so
   counting results would let a failing provider bill without limit while the
   ceiling reported plenty of room. The row is written BEFORE the request goes
   out, for the same reason. */
CREATE TABLE IF NOT EXISTS ai_calls (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  at         TEXT NOT NULL,
  kind       TEXT NOT NULL,            -- 'mark' | 'transcribe'
  user_id    INTEGER REFERENCES users(id) ON DELETE SET NULL,
  attempt_id TEXT,
  outcome    TEXT NOT NULL DEFAULT 'started'
);

CREATE INDEX IF NOT EXISTS idx_q_filter  ON questions (family_id, skill, level, status);
CREATE INDEX IF NOT EXISTS idx_codes_st  ON codes (status, expires_at);
CREATE INDEX IF NOT EXISTS idx_sec_test  ON sections (test_id, sort);
CREATE INDEX IF NOT EXISTS idx_audit_at  ON audit (at DESC);
CREATE INDEX IF NOT EXISTS idx_att_user  ON attempts (user_id, status);
CREATE INDEX IF NOT EXISTS idx_att_ans   ON attempt_answers (attempt_id);
CREATE INDEX IF NOT EXISTS idx_att_score ON attempt_scores (attempt_id);
CREATE INDEX IF NOT EXISTS idx_ai_due    ON ai_marking_backlog (next_try);
CREATE INDEX IF NOT EXISTS idx_ai_calls   ON ai_calls (at DESC);
CREATE INDEX IF NOT EXISTS idx_ai_calls_u ON ai_calls (user_id, at DESC);
`;
db.exec(SCHEMA_SQL);

/* ============================ MIGRATIONS ============================
   CREATE TABLE IF NOT EXISTS never adds a column to a table that already
   exists, so databases created before a column was introduced would keep the
   old shape and every query touching that column would throw. Each entry
   below is checked against the live table and applied only when missing, so
   the same code boots a fresh database and an old one. */
/* Every migration records itself as it runs. server/schema.js needs this list to
   build the same tables on Postgres, and a hand-kept copy of it was wrong within
   five minutes of being written — it missed six columns. Collected here by the
   calls themselves, it cannot be missing one. */
const ADDED_COLUMNS = [];
const ADDED_INDEXES = [];

function addColumnIfMissing(table, column, definition) {
  ADDED_COLUMNS.push([table, column, definition]);
  const have = db.prepare(`PRAGMA table_info(${table})`).all().some(c => c.name === column);
  if (!have) db.exec(`ALTER TABLE ${table} ADD COLUMN ${column} ${definition}`);
}

/** An index created beside a late column, recorded for the same reason. */
function addIndex(sql) {
  ADDED_INDEXES.push(sql);
  db.exec(sql);
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
addColumnIfMissing('users', 'phone', 'TEXT');
addIndex('CREATE UNIQUE INDEX IF NOT EXISTS idx_users_google_sub ON users (google_sub)');

/* Which emails a learner agrees to receive. Columns rather than a JSON blob
   because the question the eventual mailer asks is "who wants this one", and
   that has to be a WHERE clause — a preference nobody can select on is a
   preference nobody will honour.
   The defaults match what the account screen has always shown when there was
   nowhere to store the answer: the two service emails on, marketing off. Off by
   default is not a style choice — consent to marketing has to be given, and a
   column that starts at 1 records a consent the person never gave.
   notify_set_at is when they last decided. Kept because "did this address opt
   in, and when" is the only defence when someone says they never did. */
addColumnIfMissing('users', 'notify_new_tests', 'INTEGER NOT NULL DEFAULT 1');
addColumnIfMissing('users', 'notify_reminder', 'INTEGER NOT NULL DEFAULT 1');
addColumnIfMissing('users', 'notify_promo', 'INTEGER NOT NULL DEFAULT 0');
addColumnIfMissing('users', 'notify_set_at', 'TEXT');

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
/* Which bundled recording is attached, by content hash. Without it the only way
   to know whether a re-recorded `say` has reached the database is to compare
   bytes, and attachBankAudio() would either re-upload all forty-four files on
   every boot or never notice a change. */
addColumnIfMissing('questions', 'audio_sha', 'TEXT');

/* Part G's spoken QUESTIONS, which are a second recording per item.
 *
 * `audio_key` is the item's stimulus — Part E's sentence, Part H's sentence,
 * Part J's story, and for Part G the passage its whole group shares. That left
 * Part G's three questions with no recording of their own, so the passage
 * played and then the candidate READ the questions off the screen. The real
 * part asks them out loud: a passage, then question one, answer, question two,
 * answer, question three, answer. Reading them instead quietly turns a
 * listening item into a reading one.
 *
 * A second slot rather than a second row: the paper is 58 items and a passage
 * is not one of them. Only Part G fills these today, and nothing else has to
 * know they exist. */
addColumnIfMissing('questions', 'question_audio_key', 'TEXT');
addColumnIfMissing('questions', 'question_audio_bytes', 'INTEGER');
addColumnIfMissing('questions', 'question_audio_at', 'TEXT');
addColumnIfMissing('questions', 'question_audio_sha', 'TEXT');

/* Playing Part G's spoken question must not spend the passage's single play.
   `replays_used` counts the stimulus; this counts the question, so the two
   budgets are independent and a candidate who hears question two has not
   thereby used up the passage they are answering about. */
addColumnIfMissing('attempt_answers', 'question_replays_used', 'INTEGER NOT NULL DEFAULT 0');

/* Part practice for the written and spoken parts (B, D and I).
   A drill is no longer always six machine-marked items: parts B and D are
   e-mails and part I is spoken, and those go to the marker rather than to an
   answer key. `mode` records which kind a drill is, so the screen and the
   submit path do not have to re-derive it from the blueprint every time and
   cannot disagree about a drill already in flight. `audio_key` is where a
   spoken answer's recording lives, exactly as attempt_answers stores one. */
addColumnIfMissing('drills', 'mode', "TEXT NOT NULL DEFAULT 'instant'");
addColumnIfMissing('drill_answers', 'audio_key', 'TEXT');

/* The six items of the rung currently on screen — the placement's equivalent of
   `drills.item_ids_json`, and there for the same reason. `asked_json` is every
   item dealt across the whole sitting, so it cannot answer "may this rung be
   marked with this item": it would let rung 1's six known-correct answers be
   replayed into rung 3. See server/placement.js answer(). */
addColumnIfMissing('placements', 'rung_json', "TEXT NOT NULL DEFAULT '[]'");

/* Which lettered VPET part an item belongs to (A-J), or NULL for families that
   have no part table. Skill alone cannot separate them: parts B and D are both
   writing essays, F and G are both listening multiple choice, H and J are both
   spoken answers to audio. Drawing those from one skill-wide pool builds an
   exam that looks right and asks the wrong things - a "repeat this sentence"
   item landing in "retell the story". The letter is what keeps each part
   drawing from its own pool. */
addColumnIfMissing('questions', 'part', 'TEXT');
addIndex('CREATE INDEX IF NOT EXISTS idx_q_part ON questions (family_id, part, status)');

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
/* Questions that share one stimulus.
   Part G is the reason: "You will hear a passage ... There will be three
   questions about the passage." One recording, heard once, three answers. The
   blueprint has said `group: 3` since the timing was corrected - the arithmetic
   already treats it as two groups of three rather than six items - but nothing
   in the database could express which three, so the paper was six unrelated
   passages wearing the part's name.
   Null for every part that is genuinely item-by-item, which is most of them. */
addColumnIfMissing('questions', 'group_key', 'TEXT');
addColumnIfMissing('questions', 'source', 'TEXT');
addColumnIfMissing('questions', 'licence', 'TEXT');
addIndex('CREATE UNIQUE INDEX IF NOT EXISTS idx_q_ext_key ON questions (ext_key)');

/* What the recording SAYS, on the row.
   The marker needs it: Part H is scored by comparing the transcript with the
   sentence the candidate heard, and Parts G and J are judged against the
   passage or story. Until now that text lived only in the authored file,
   looked up by ext_key — so an item written on the bank screen, which has no
   ext_key, was marked with nothing to compare against. `model_answer` is Part
   G's short correct reply, a reference for the marker and never a key: the
   `answer` column stays empty on every rubric-marked item, and must. */
addColumnIfMissing('questions', 'script', 'TEXT');
addColumnIfMissing('questions', 'model_answer', 'TEXT');

/* A section on a built test remembers which lettered part it is, so re-drawing
   its items later pulls from the same pool the generator used. Reading the
   letter back out of the section name would break the moment an admin renames
   it, which they are free to do. */
addColumnIfMissing('sections', 'part', 'TEXT');
/* The clock a part really gets. `minutes` cannot hold it: VPET times Part A at 25
   seconds an item and Part F at 15, so a minutes-only window is either generous
   or short by up to half a minute on every part, and the ten roundings do not
   cancel. `minutes` stays for the admin screen and the study pack; the deadline
   comes from here whenever it is set. */
addColumnIfMissing('sections', 'seconds', 'INTEGER');

/* The marking trail for each item (docs/SCORING.md §2.4). A mark has to be
explicable: when a candidate disputes one, it must be possible to see which items
were right, which were wrong and why — not just a final number. */
addColumnIfMissing('attempt_answers', 'earned', 'REAL');
addColumnIfMissing('attempt_answers', 'max_score', 'REAL');
addColumnIfMissing('attempt_answers', 'mark_note', 'TEXT');
addColumnIfMissing('attempt_answers', 'marked_at', 'TEXT');
/* The caps that fired on this item, as JSON, so the result screen can show each
   one in the reader's own language.

   They were already being explained — server/ai-marking-run.js appends each
   cap's sentence to mark_note — but only ever the English one, on a platform
   whose candidates are Vietnamese. Every cap in server/rubric.js has carried a
   `vi` since it was written and not one of them had ever reached a screen. That
   is worst for the newest cap, which tells somebody their answer was copied:
   an accusation nobody can read is punishment without the part that teaches.
   Nullable, and the note keeps its English sentences, so a mark made before
   this column existed still explains itself. */
addColumnIfMissing('attempt_answers', 'mark_caps', 'TEXT');

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
addIndex('CREATE UNIQUE INDEX IF NOT EXISTS idx_orders_ref ON orders (ref)');

/* skill_events: put the learner INTO the key that is supposed to identify their
   own work.
 *
 * The constraint was UNIQUE (source, ref_id, item_key), and ability.record()
 * upserts on that same triple — without user_id in either. It held only because
 * every producer happened to build ref_id from a global surrogate: an attempt
 * id, a drills row id, a placements row id. Nothing enforced that, and one
 * producer does not do it. server/learn-practice.js builds
 *
 *     ref_id = 'learn:' + kind + ':' + roundId
 *
 * from a round id SUPPLIED BY THE BROWSER, and its comment says it is
 * "namespaced by kind, so two kinds cannot collide" — which is true, and not
 * the collision that matters. Two LEARNERS practising the same kind on the same
 * round number produce the same triple, and the ON CONFLICT then fires across
 * accounts.
 *
 * What that does is worse than losing the second write. The DO UPDATE sets the
 * score and leaves user_id alone, because user_id is not in the SET either — so
 * one learner's answers are written on top of another learner's row, under the
 * first learner's name. The victim's estimate moves for work they never did,
 * and the author of the work sees nothing.
 *
 * Not yet triggered in production: nothing has used the self-study area, so
 * there are no `learn` rows to have collided. It would have started with the
 * first two learners who did.
 *
 * SQLite cannot alter a table-level UNIQUE, so the table is rebuilt. Widening a
 * unique tuple only ever permits more rows, so every existing row carries over.
 */
(function widenSkillEventsKey() {
  const wanted = ['user_id', 'source', 'ref_id', 'item_key'];
  const already = db.prepare("PRAGMA index_list('skill_events')").all()
    .filter(i => i.unique)
    .some(i => {
      const cols = db.prepare(`PRAGMA index_info('${i.name}')`).all().map(c => c.name);
      return cols.length === wanted.length && wanted.every((w, n) => cols[n] === w);
    });
  if (already) return;

  /* Foreign keys off for the swap, as SQLite requires for a table rebuild, and
     restored afterwards whatever happens. Outside a transaction because the
     pragma is a no-op inside one. */
  const fk = db.prepare('PRAGMA foreign_keys').get();
  db.exec('PRAGMA foreign_keys = OFF');
  try {
    db.exec('BEGIN');
    db.exec(`
      CREATE TABLE skill_events_rebuilt (
        id        INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id   INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        source    TEXT NOT NULL,
        ref_id    TEXT NOT NULL,
        item_key  TEXT NOT NULL,
        skill     TEXT NOT NULL,
        part      TEXT,
        topic     TEXT,
        level     TEXT,
        earned    REAL NOT NULL,
        max_score REAL NOT NULL,
        weight    REAL NOT NULL DEFAULT 1,
        at        TEXT NOT NULL,
        UNIQUE (user_id, source, ref_id, item_key)
      );
      INSERT INTO skill_events_rebuilt
        (id,user_id,source,ref_id,item_key,skill,part,topic,level,earned,max_score,weight,at)
        SELECT id,user_id,source,ref_id,item_key,skill,part,topic,level,earned,max_score,weight,at
          FROM skill_events;
      DROP TABLE skill_events;
      ALTER TABLE skill_events_rebuilt RENAME TO skill_events;
      CREATE INDEX IF NOT EXISTS idx_se_user ON skill_events (user_id, at DESC);
      CREATE INDEX IF NOT EXISTS idx_se_part ON skill_events (user_id, part, at DESC);
    `);
    db.exec('COMMIT');
    console.log('[schema] skill_events: unique key now includes user_id');
  } catch (e) {
    try { db.exec('ROLLBACK'); } catch (e2) {}
    throw e;
  } finally {
    if (!fk || fk.foreign_keys) db.exec('PRAGMA foreign_keys = ON');
  }
})();

/**
 * Re-file the events whose skill disagrees with their part.
 *
 * server/placement.js's part→skill lookup never matched anything and defaulted
 * every part to 'reading' (the note on skillOfPart says exactly how). So every
 * placement item and every drill item ever recorded went in as reading
 * evidence — including parts E, F and G, which are LISTENING, and A, B and D,
 * which are WRITING. On the dashboard that reads as "Nghe: chưa có" and
 * "Viết: chưa có" beside a reading band quietly carrying all of it.
 *
 * Fixing the function only fixes what comes next. The rows already written are
 * repairable exactly, without guessing, because `part` was stored correctly all
 * along and the blueprint says what each letter is — so this derives the skill
 * from the part rather than from anything about how the row was made.
 *
 * Confined to rows that HAVE a part. Revision and self-study events carry a
 * topic and no part; their skill was always set explicitly and is not in doubt.
 */
(function refileEventsByPart() {
  let map = {};
  try {
    const { FORMATS } = require('./data/exam-formats');
    for (const f of FORMATS || []) {
      for (const s of (f && f.sections) || []) if (s.part && s.skill) map[s.part] = s.skill;
    }
  } catch (e) {
    console.error('[schema] skill_events: cannot read the blueprint, leaving skills alone', e);
    return;
  }
  /* No map, no repair. Running with an empty one would rewrite every row to
     nothing, which is worse than the fault being fixed. */
  if (!Object.keys(map).length) return;

  let moved = 0;
  for (const [part, skill] of Object.entries(map)) {
    const r = db.prepare(
      'UPDATE skill_events SET skill = ? WHERE part = ? AND skill <> ?').run(skill, part, skill);
    moved += Number(r.changes) || 0;
  }
  if (moved) console.log('[schema] skill_events: ' + moved + ' row(s) re-filed under the skill their part belongs to');
})();

/* ============================== HELPERS ============================== */
const nowISO = () => new Date().toISOString();
const jparse = (s, fb) => { try { return JSON.parse(s); } catch (e) { return fb; } };

/* ============================ THE QUERY LAYER ============================
   Two interfaces over one engine, and the difference is the whole point.

   `qs` is synchronous and private to this file. The schema, the migrations and
   the seed below run once at require() time, before anything is listening, and
   CommonJS has no top-level await to offer them — so boot stays synchronous and
   stays here.

   `q` is asynchronous and is what every request goes through. SQLite answers
   synchronously underneath, so today the promise is already settled by the time
   it is handed back; the point is that the *call sites* no longer assume it.
   Postgres cannot answer synchronously, and rewriting several hundred callers
   in the same change that swaps the engine would mean a migration where a
   failure could be either. This slice moves the interface with the engine held
   still, so the test suite is a real answer at every step. */
const qs = {
  all(sql, ...p) { return db.prepare(sql).all(...p); },
  get(sql, ...p) { return db.prepare(sql).get(...p); },
  run(sql, ...p) { return db.prepare(sql).run(...p); },
  val(sql, ...p) { const r = db.prepare(sql).get(...p); return r ? Object.values(r)[0] : null; }
};

/* An async interface over one shared connection has a hazard a synchronous one
   cannot have: a transaction is now open across await points, so a statement
   belonging to some other request can land between BEGIN and COMMIT and be
   committed — or rolled back — with it. Two things keep that from happening.
   AsyncLocalStorage marks the calls that genuinely belong to the open
   transaction, and everything else waits for it to finish. Transactions
   themselves queue, because SQLite has no nested BEGIN.

   This is not scaffolding thrown away in the next slice: a pooled Postgres
   client has exactly this shape, where in-transaction statements go to the
   held client and the rest to the pool. Here "the pool" is one connection, so
   the rest waits instead. */
const { AsyncLocalStorage } = require('node:async_hooks');
const txScope = new AsyncLocalStorage();
let openTx = null;                 // { token, done } while a transaction runs
let txQueue = Promise.resolve();   // transactions run one at a time

/** Hold a statement that does not belong to the transaction currently open. */
async function outsideTx() {
  // A loop, not an if: the next queued transaction may start while we wait.
  while (openTx && txScope.getStore() !== openTx.token) await openTx.done;
}

const sqliteQ = {
  async all(sql, ...p) { await outsideTx(); return qs.all(sql, ...p); },
  async get(sql, ...p) { await outsideTx(); return qs.get(sql, ...p); },
  async run(sql, ...p) { await outsideTx(); return qs.run(sql, ...p); },
  async val(sql, ...p) { await outsideTx(); return qs.val(sql, ...p); }
};

/* ---------------------- Which engine answers a request ----------------------
 *
 * `DATABASE_URL` (or `PG_URL`) present means Postgres. Chosen here, at the top,
 * rather than at the export at the bottom, and that placement is the whole
 * point: `audit()` and `attachBankAudio()` further down close over `q`, so a
 * switch made later would have left those two writing to the SQLite file while
 * every other statement went to Postgres. An audit trail landing in a scratch
 * file nobody reads is precisely the sort of half-migration that looks fine.
 *
 * A facade rather than a reassignment, so `q` stays a `const` that every
 * reference in this file and every importer already points at.
 *
 * Note what does NOT switch: `qs`, the synchronous interface the schema, the
 * migrations and the seed below use. Those still run against SQLite on the way
 * up, because the seed is the only definition of the starter content there is
 * and it is written synchronously. On Postgres that local file is scratch —
 * `scripts/pg-migrate.mjs` runs this same boot and then copies the result
 * across, which is the deploy step, done once and on purpose rather than by
 * ten containers racing to CREATE TABLE.
 */
/* `DATABASE_URL` ONLY, and never `PG_URL`. The two variables mean different
   things and conflating them was a live bug for about an hour:

     DATABASE_URL  this deployment runs on Postgres
     PG_URL        here is a Postgres the TESTS may use

   scripts/verify.sh starts a throwaway cluster and `eval`s its `export PG_URL`,
   which then persists for the whole script — including `node server.js`. With
   both names switching the engine, the gate's own server quietly came up on a
   scratch database holding a different seed and different passwords, and a
   dozen student suites would have gone red for a reason nowhere near them. */
/* Two ways to be told to use PostgreSQL, because two kinds of deployment ask
   differently. `DATABASE_URL` is one string and is what a laptop, the test
   suite and a self-hosted server use. `PGHOST` and its siblings are what a
   managed database wants: there the password rotates on its own schedule and
   has no business being inside a URL, so it is fetched per connection from the
   secret `DB_PASSWORD_SECRET` names. Either one switches the engine; neither
   changes a line of the several hundred call sites above.

   `PG_URL` deliberately does NOT switch it. That variable belongs to the
   PostgreSQL test suites, and `scripts/verify.sh` exports it for the whole run
   — honouring it here would put the gate's own server on a scratch database. */
const PG_DSN = process.env.DATABASE_URL || '';
const PG_PARTS = !PG_DSN && !!process.env.PGHOST;
const pgHandle = (PG_DSN || PG_PARTS)
  ? require('./pg').createPg(PG_DSN ? { url: PG_DSN } : {})
  : null;
const engine = pgHandle ? 'postgres' : 'sqlite';
const live = pgHandle ? pgHandle.q : sqliteQ;

const q = {
  all: (sql, ...p) => live.all(sql, ...p),
  get: (sql, ...p) => live.get(sql, ...p),
  run: (sql, ...p) => live.run(sql, ...p),
  val: (sql, ...p) => live.val(sql, ...p)
};

/** Run several statements in one transaction (node:sqlite has no transaction API yet) */
function txSync(fn) {
  db.exec('BEGIN');
  try { const out = fn(); db.exec('COMMIT'); return out; }
  catch (e) { db.exec('ROLLBACK'); throw e; }
}

/**
 * Run `fn` inside one transaction. `fn` may be async; every `q` call it makes,
 * however deep, is part of the transaction, and every `q` call made elsewhere
 * waits until it has committed or rolled back.
 */
function sqliteTx(fn) {
  /* Already inside one: join it rather than deadlocking on our own queue.
     SQLite would refuse a nested BEGIN anyway, so joining is also the only
     behaviour that could have worked. */
  if (txScope.getStore()) return (async () => fn())();

  const run = async () => {
    const token = {};
    let settle;
    openTx = { token, done: new Promise(r => { settle = r; }) };
    db.exec('BEGIN');
    try {
      const out = await txScope.run(token, fn);
      db.exec('COMMIT');
      return out;
    } catch (e) {
      db.exec('ROLLBACK');
      throw e;
    } finally {
      openTx = null;
      settle();
    }
  };

  const started = txQueue.then(run);
  txQueue = started.then(() => {}, () => {});   // the queue itself never rejects
  return started;
}

/* The same switch as `q` above, and it has to be a wrapper for the same
   reason: `tx` is imported by name in four modules and called inside this one,
   so reassigning it later would leave some callers holding the SQLite version.
   The two implementations have the same contract — join an open transaction
   rather than nesting, roll back on a throw — and differ where they should:
   under SQLite every other statement in the process waits for the open
   transaction because there is one connection, and under Postgres they do not. */
const tx = pgHandle ? pgHandle.tx : sqliteTx;

/** Mint a code as XXXX-XXXX-XXXX, leaving out the confusable characters (I, O, 0, 1) */
const CODE_ALPHA = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
function makeCode() {
  const chunk = () => Array.from(crypto.randomBytes(4))
    .map(b => CODE_ALPHA[b % CODE_ALPHA.length]).join('');
  return chunk() + '-' + chunk() + '-' + chunk();
}

/* Async like everything else on the request path, and awaited by its callers
   rather than left to run whenever: an audit entry started inside a
   transaction and finished outside it records the wrong thing about a write
   that was rolled back. */
async function audit(req, action, target, meta) {
  const a = req && req.admin;
  await q.run(
    'INSERT INTO audit (admin_id, admin_name, action, target, meta_json, ip, at) VALUES (?,?,?,?,?,?,?)',
    a ? a.id : null, a ? a.username : 'system', action, target || null,
    JSON.stringify(meta || {}), (req && req.ip) || null, nowISO()
  );
}

/* ============================== SEED ============================== */
/* VPET is the only family being built right now; every other family is parked
   as coming_soon. Columns: id, name, sub, format, skills, sort, status. */
const FAMILIES = [
  ['vpet',  'VPET',  'Versant Professional English Test', 'Parts A-J, 58 items, AI scored speaking', ['listening','reading','writing','speaking'], 1, 'ready'],
  ['vept',  'VEPT',  'Vietnam English Proficiency Test', '4 skills, CEFR aligned', ['listening','reading','writing','speaking'], 2, 'coming_soon'],
  ['ote',   'OTE',   'Oxford Test of English',    'Adaptive, 4 modules, CEFR A2-B2', ['listening','reading','writing','speaking'], 3, 'coming_soon'],
  ['toeic', 'TOEIC', 'Test of English for International Communication', 'L&R / S&W, 990 point scale', ['listening','reading'], 4, 'coming_soon'],
  ['ielts', 'IELTS', 'International English Language Testing System',   '4 skills, band 0-9', ['listening','reading','writing','speaking'], 5, 'coming_soon'],
  ['pte',   'PTE',   'Pearson Test of English',   'Computer based, AI scored, 10-90 scale', ['listening','reading','writing','speaking'], 6, 'coming_soon']
];

/* Metadata only — the parts come from the blueprint. See the header of
   server/data/seed-tests.js for why the list lives in its own file. */
const { SEED_TESTS } = require('./data/seed-tests');

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
    if (famId !== 'vpet') continue;               // VPET-only platform: no sample items for the parked families
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

/* ------------------------------------------------------------------ *
 * Building a paper from the published blueprint
 * ------------------------------------------------------------------ */

/** The one full-length format a family publishes, or null. */
function fullFormatOf(familyId) {
  return EXAM_FORMATS.FORMATS.find(f => f.familyId === familyId && f.kind === 'full') || null;
}

/**
 * The parts a paper *should* have, and the exact questions each should hold.
 *
 * Two rules decide the items, and both exist because breaking either is what
 * broke the demo paper:
 *
 *   · A part draws only from questions tagged with its own letter. Drawing by
 *     skill instead looks reasonable until you notice three parts share a skill
 *     — A, B and D are all `writing` — and each then receives the same rows.
 *   · A question used by one part is off the table for the rest of the paper.
 *     Nothing else stops the same item appearing twice, and a duplicate is
 *     worse than it sounds: `attempt_answers` is keyed (attempt, question), so
 *     answering it in the later part overwrites the answer given in the earlier
 *     one.
 *
 * Where the bank cannot fill a part, the part is left short rather than padded
 * from somewhere else. A short part is visible and countable; a padded one asks
 * the wrong questions while looking complete.
 */
function plannedPaper(familyId, level) {
  const fmt = fullFormatOf(familyId);
  if (!fmt) return null;

  const used = new Set();
  return fmt.sections.map((bp, sort) => {
    const typeSql = bp.types && bp.types.length
      ? ` AND type IN (${bp.types.map(() => '?').join(',')})` : '';
    /* `ext_key IS NOT NULL` restricts this to the authored bank in
       server/data/vpet-items.js. A shipped paper is built from shipped content,
       and everything else in the questions table is not that: the exam-engine
       suite mints a couple of Part F items through the admin API on every run
       and retires them on the way out, so without this the demo paper's Part F
       would hold two items called "Engine test listening item 0" for as long as
       the suite's fixtures happened to be active, and none the rest of the time.
       A paper whose contents depend on whether a test ran recently is not a
       paper. Admin-authored papers are built by /admin/tests/generate, which
       draws from everything and is right to.

       Level is a preference, not a filter: a B1 paper prefers B1 items and falls
       back rather than leaving a part empty over a level mismatch. */
    const pool = qs.all(
      `SELECT id, group_key FROM questions
        WHERE family_id=? AND part=? AND status='active'
          AND ext_key IS NOT NULL AND ext_key<>''${typeSql}
        ORDER BY (level=?) DESC, id`,
      familyId, bp.part, ...(bp.types || []), level);

    /* Whole groups or none of them.
       Part G is three questions about ONE passage, and only the first of the
       three carries the recording. Taking them one at a time works only as long
       as they happen to be adjacent in id order - and the day a question is
       retired, or the bank is reordered, the draw splits a group and a
       candidate is asked about a passage they were never played. It would look
       like a content bug for weeks.
       A group that will not fit in what is left of the part is skipped rather
       than truncated, and the next one is tried. */
    const ids = [];
    const takenGroups = new Set();
    for (const row of pool) {
      if (ids.length >= bp.items) break;
      if (used.has(row.id)) continue;
      if (!row.group_key) { used.add(row.id); ids.push(row.id); continue; }
      if (takenGroups.has(row.group_key)) continue;
      const members = pool.filter(r => r.group_key === row.group_key && !used.has(r.id));
      if (ids.length + members.length > bp.items) continue;
      takenGroups.add(row.group_key);
      for (const m of members) { used.add(m.id); ids.push(m.id); }
    }
    return { sort, bp, ids };
  });
}

/**
 * Make the stored paper match plannedPaper(), and say so when it could not.
 *
 * Runs on every boot, so the production database is repaired rather than only
 * new installs — but it rewrites nothing that is already right, because a paper
 * rebuilt underneath a sitting in progress is a paper whose candidate loses
 * their place.
 *
 * Returns a list of parts the bank could not fill, `[]` when the paper is
 * complete, and null when there is no blueprint or no such test.
 */
function buildPaperFromBlueprint(testId, familyId, level) {
  const plan = plannedPaper(familyId, level);
  if (!plan) return null;
  if (!qs.val('SELECT 1 FROM tests WHERE id=?', testId)) return null;

  const at = nowISO();
  let changed = 0;

  for (const { sort, bp, ids } of plan) {
    const cur = qs.get(
      'SELECT id, name, skill, type, minutes, seconds, part FROM sections WHERE test_id=? AND sort=?',
      testId, sort);

    let secId;
    if (!cur) {
      qs.run('INSERT INTO sections (test_id,name,skill,type,minutes,seconds,sort,part) VALUES (?,?,?,?,?,?,?,?)',
        testId, bp.name, bp.skill, bp.type, bp.minutes, bp.seconds, sort, bp.part);
      secId = qs.val('SELECT id FROM sections WHERE test_id=? AND sort=?', testId, sort);
      changed++;
    } else {
      secId = cur.id;
      /* Minutes come from the blueprint too, with no exception for a value already
         stored. The first draft of this kept whatever was there, reasoning that the
         part table publishes item counts rather than timings and an admin may
         legitimately retime a part. The production box showed what that reasoning
         costs: its first four sections still carried 25, 35, 40 and 12 minutes from
         the retired four-block paper, so the rebuilt paper was correctly lettered
         A to J and ran 112 minutes. Those numbers were not somebody's choice, they
         were debris, and no rule could tell the two apart.
         An admin who wants different timings builds their own paper through
         /admin/tests/generate; this function only ever touches SEED_TESTS. */
      if (cur.name !== bp.name || cur.skill !== bp.skill || cur.type !== bp.type
          || cur.part !== bp.part || cur.minutes !== bp.minutes || cur.seconds !== bp.seconds) {
        qs.run('UPDATE sections SET name=?, skill=?, type=?, part=?, minutes=?, seconds=? WHERE id=?',
          bp.name, bp.skill, bp.type, bp.part, bp.minutes, bp.seconds, secId);
        changed++;
      }
    }

    const have = qs.all('SELECT question_id FROM section_items WHERE section_id=? ORDER BY sort', secId)
      .map(r => r.question_id);
    if (have.length === ids.length && have.every((id, i) => id === ids[i])) continue;

    qs.run('DELETE FROM section_items WHERE section_id=?', secId);
    const insI = db.prepare('INSERT INTO section_items (section_id,question_id,sort) VALUES (?,?,?)');
    ids.forEach((id, j) => insI.run(secId, id, j));
    changed++;
  }

  /* A paper built by the old code can carry parts the blueprint does not have.
     They go — unless somebody has already sat them, in which case dropping the
     row would take their answers with it (or, with foreign keys on, simply
     throw). Loud is the right answer there, not clever. */
  const extra = qs.all('SELECT id, name FROM sections WHERE test_id=? AND sort>=?', testId, plan.length);
  for (const s of extra) {
    const sat = qs.val('SELECT 1 FROM attempt_parts WHERE section_id=? LIMIT 1', s.id)
      || qs.val('SELECT 1 FROM attempt_answers WHERE section_id=? LIMIT 1', s.id);
    if (sat) {
      console.warn(`[paper] ${testId}: "${s.name}" is not in the blueprint but has been sat; left in place.`);
      continue;
    }
    qs.run('DELETE FROM sections WHERE id=?', s.id);
    changed++;
  }

  const minutes = qs.val('SELECT COALESCE(SUM(minutes),0) FROM sections WHERE test_id=?', testId);
  if (qs.val('SELECT duration_min FROM tests WHERE id=?', testId) !== minutes) {
    qs.run('UPDATE tests SET duration_min=?, updated_at=? WHERE id=?', minutes, at, testId);
    changed++;
  }

  const short = plan.filter(p => p.ids.length < p.bp.items)
    .map(p => `${p.bp.part} ${p.ids.length}/${p.bp.items}`);

  if (changed) {
    const total = plan.reduce((a, p) => a + p.ids.length, 0);
    const want = plan.reduce((a, p) => a + p.bp.items, 0);
    console.warn(`[paper] ${testId} rebuilt from the blueprint: ${plan.length} parts, ${total}/${want} items.`);
  }
  if (short.length) {
    console.warn(`[paper] ${testId}: the bank cannot fill ${short.length} part(s) — ${short.join(', ')}.`
      + ' Write the missing items (see docs/VPET-BLUEPRINT.md); the paper stays short until then.');
  }
  return short;
}

/**
 * Put the bank's bundled recordings into whatever store this install uses.
 *
 * Parts E, F, G, H and J are audio items: the words are in `say`, the recording
 * is committed at server/data/audio/<key>.mp3 by scripts/make-vpet-audio.mjs,
 * and the question row needs the storage key of a copy that server/storage.js
 * can serve. That copy is what this makes.
 *
 * Asynchronous, and therefore NOT part of seed(). Every storage driver except
 * the local disk one talks over the network, so the upload cannot happen at
 * require() time with the rest of the seeding. server.js awaits it in the block
 * that already runs before listen(), so nothing is ever served an item whose
 * audio has not landed.
 *
 * Idempotent by content hash: a recording already attached is skipped, a
 * re-recorded one replaces its predecessor and the old object is deleted. A
 * failure is reported and skipped rather than thrown - one unreachable bucket
 * must not stop the server from starting.
 */
async function attachBankAudio() {
  const storage = require('./storage');
  const dir = path.join(__dirname, 'data', 'audio');
  if (!fs.existsSync(dir)) return { attached: 0, missing: 0, failed: 0 };

  /* One recording per GROUP, matching scripts/make-vpet-audio.mjs.
     Part G's three questions each carry the passage so the marker can see it,
     but only the first is rendered and only the first is played - the exam
     plays a passage once. Counting the other two as "missing" would print a
     warning telling an operator to run `npm run audio:vpet`, which will not
     produce them, about a state that is correct. */
  const seenGroup = new Set();
  const bank = require('./data/vpet-items').rows();
  const items = bank.filter(r => {
    if (!r.say) return false;
    if (!r.group) return true;
    if (seenGroup.has(r.group)) return false;
    seenGroup.add(r.group);
    return true;
  });
  /* Part G's spoken questions, one per item — see slotFor() below. */
  for (const r of bank) {
    if (r.part === 'G' && r.prompt) items.push({ key: r.key + '-q', part: r.part });
  }
  let attached = 0, missing = 0, failed = 0;

  /* Part G's questions are recorded as `<item key>-q.mp3` and belong in the
     item's SECOND audio slot, so the passage and the question can be played one
     after the other without either spending the other's single play. */
  const slotFor = key => key.endsWith('-q')
    ? { ext: key.slice(0, -2), key: 'question_audio_key', bytes: 'question_audio_bytes',
        at: 'question_audio_at', sha: 'question_audio_sha' }
    : { ext: key, key: 'audio_key', bytes: 'audio_bytes', at: 'audio_at', sha: 'audio_sha' };

  for (const it of items) {
    const file = path.join(dir, it.key + '.mp3');
    if (!fs.existsSync(file)) { missing++; continue; }

    const slot = slotFor(it.key);
    const buf = fs.readFileSync(file);
    const sha = crypto.createHash('sha256').update(buf).digest('hex').slice(0, 16);
    const row = await q.get(
      `SELECT id, ${slot.key} k, ${slot.sha} sha FROM questions WHERE ext_key=?`, slot.ext);
    if (!row) { missing++; continue; }
    if (row.k && row.sha === sha) continue;

    try {
      const put = await storage.put(buf, 'audio/mpeg');
      await q.run(
        `UPDATE questions SET ${slot.key}=?, ${slot.bytes}=?, ${slot.at}=?, ${slot.sha}=? WHERE id=?`,
        put.key, put.bytes, nowISO(), sha, row.id);
      /* Only after the new one is safely recorded, so a crash in between leaves a
         stray object rather than a question pointing at nothing. */
      if (row.k && row.k !== put.key) {
        try { await storage.remove(row.k); } catch (e) { /* an orphan is not worth failing over */ }
      }
      attached++;
    } catch (e) {
      failed++;
      console.warn(`[audio] ${it.key}: could not be stored (${e && e.message}).`);
    }
  }

  if (attached) console.warn(`[audio] ${attached} bank recording(s) stored via ${storage.driverName()}.`);
  if (missing) {
    console.warn(`[audio] ${missing} item(s) have no recording on disk.`
      + ' Run `npm run audio:vpet` and commit what it writes.');
  }
  return { attached, missing, failed };
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
    if (qs.val('SELECT 1 FROM families WHERE id=?', id)) {
      updFam.run(name, sub, format, skillsJson, sort, status, id);
    } else {
      insFam.run(id, name, sub, format, skillsJson, sort, status);
    }
  }

  if (!qs.val('SELECT COUNT(*) c FROM packages')) {
    const ins = db.prepare('INSERT INTO packages (id,name,price,family_id,description,perks_json,featured,active,sort) VALUES (?,?,?,?,?,?,?,1,?)');
    for (const [id, name, price, fam, desc, perks, feat, sort] of PACKAGES) {
      ins.run(id, name, price, fam, desc, JSON.stringify(perks), feat, sort);
    }
  }

  /* A parked family must not have anything on sale. Seeds above only run on an
     empty table, so an existing database needs the rule applied directly —
     otherwise tests published before a family was parked stay in the
     catalogue and students can still buy them. */
  const pulled = qs.run(`UPDATE tests SET status='draft', updated_at=?
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
    if (qs.val('SELECT 1 FROM packages WHERE id=?', p.id)) {
      updPkg.run(p.name, p.price, p.tagline, perks, featured, i, p.id);
    } else {
      insPkg.run(p.id, p.name, p.price, p.tagline, perks, featured, i);
    }
  });
  const retired = qs.run(
    `UPDATE packages SET active=0 WHERE active=1 AND id NOT IN (${PLANS.PLANS.map(() => '?').join(',')})`,
    ...PLANS.PLANS.map(p => p.id));
  if (retired.changes) console.warn(`[seed] ${retired.changes} old bundle(s) retired in favour of the time-limited plans.`);

  if (!qs.val('SELECT COUNT(*) c FROM questions')) seedQuestions();
  seedVpetItems();

  /* The seeded papers, reconciled on EVERY boot rather than only on an empty
     database — for the same reason the parts below are, and it took shipping the
     bug to see it.

     This block used to be wrapped in `if (!COUNT(*) FROM tests)`. That guard is
     true exactly once in a database's life, so adding a paper to SEED_TESTS
     added it to new installs and to nothing else: every existing database — the
     production box, every developer's copy, the gate's own — silently kept the
     old list. Level 2 was added to the list, the gate went green on the
     nine-hundred-line paper suite, and the paper was not in the database at all.
     Nothing failed, because the one function that would have noticed
     (buildPaperFromBlueprint) opens with `if (!SELECT 1 FROM tests) return null`
     and returns quietly. A missing paper looked exactly like a finished one.

     What is reconciled, and what is deliberately not:

       id, family, title, level   The seed's, always. `level` is not cosmetic —
                                  server/bands.js reads it to decide which of the
                                  two VPET instruments a sitting was, so a row
                                  that drifts from this list reports a candidate
                                  at the wrong CEFR level.
       duration / scoring / guide The blueprint's, always. The parts are already
                                  rebuilt from it every boot; leaving the paper's
                                  stated duration behind is how a paper comes to
                                  claim 112 minutes over ten parts adding to 58.
       status                     NOT touched once the row exists. Taking a
                                  broken paper out of the catalogue is an
                                  operator's decision, and a seed that republished
                                  it on the next restart would overrule the person
                                  who did it. Only a row being created for the
                                  first time takes its status from the list. */
  const insT = db.prepare(`INSERT INTO tests
    (id,family_id,title,level,duration_min,scoring,guide_json,status,build_mode,created_at,updated_at)
    VALUES (?,?,?,?,?,?,?,?,'manual',?,?)`);
  let added = 0, retitled = 0;
  for (const t of SEED_TESTS) {
    const fmt = fullFormatOf(t.family);
    const mins = fmt ? EXAM_FORMATS.totalMinutes(fmt) : 0;
    const scoring = fmt ? fmt.scoring : '';
    const guide = JSON.stringify(fmt ? fmt.guide : []);
    const cur = qs.get('SELECT family_id, title, level, duration_min, scoring, guide_json FROM tests WHERE id=?', t.id);

    if (!cur) {
      insT.run(t.id, t.family, t.title, t.level, mins, scoring, guide, t.status, at, at);
      added++;
      continue;
    }
    if (cur.family_id === t.family && cur.title === t.title && cur.level === t.level
        && cur.duration_min === mins && cur.scoring === scoring && cur.guide_json === guide) continue;

    qs.run('UPDATE tests SET family_id=?, title=?, level=?, duration_min=?, scoring=?, guide_json=?, updated_at=? WHERE id=?',
      t.family, t.title, t.level, mins, scoring, guide, at, t.id);
    retitled++;
  }
  if (added) console.warn(`[seed] ${added} seeded paper(s) added to this database.`);
  if (retitled) console.warn(`[seed] ${retitled} seeded paper(s) brought back in step with the list.`);

  /* The parts themselves are built from the blueprint, on every boot rather than
     only on a fresh database — the paper this repairs is already sitting on the
     production box, and a fix that only runs on an empty database would never
     reach it.

     Guarded, because this is the seed's only write that happens on EVERY boot
     rather than on an empty database. That difference matters: another process
     holding the file (a deploy where the old server has not exited yet, a script
     mid-run) turns a write into `SQLITE_BUSY`, and an unguarded one takes the
     new server down with it. A repair that cannot run right now must not stop
     the server from starting; the paper keeps whatever shape it had and the next
     clean boot fixes it. */
  for (const t of SEED_TESTS) {
    try {
      buildPaperFromBlueprint(t.id, t.family, t.level);
    } catch (e) {
      console.warn(`[paper] ${t.id}: could not be rebuilt from the blueprint this boot`
        + ` (${e && e.message}). Serving it as stored; scripts/test-paper.mjs will say if it is wrong.`);
    }
  }

  /* Focus on VPET (owner, 2026-08-19). The other five families stay in the
     catalogue as coming_soon, but their demo tests and sample questions are
     removed — from the student library, the admin board and the database alike.
     This runs on EVERY boot, not only a fresh one, so an existing database (the
     production box included) is scrubbed the next time it starts, not just new
     installs. Order is dictated by the foreign keys: a test's attempts go first
     (their parts, answers and scores cascade on attempt_id), then the tests
     themselves (sections and section_items cascade on the test), and finally the
     sample questions, whose stray answers are cleared just before them. */
  const strayTests = qs.all("SELECT id FROM tests WHERE family_id <> 'vpet'").map(r => r.id);
  if (strayTests.length) {
    const ph = strayTests.map(() => '?').join(',');
    qs.run(`DELETE FROM attempts WHERE test_id IN (${ph})`, ...strayTests);
    qs.run(`DELETE FROM tests WHERE id IN (${ph})`, ...strayTests);
    console.warn(`[seed] removed ${strayTests.length} non-VPET demo test(s): ${strayTests.join(', ')}`);
  }
  qs.run("DELETE FROM attempt_answers WHERE question_id IN (SELECT id FROM questions WHERE family_id <> 'vpet')");
  const strayQ = qs.run("DELETE FROM questions WHERE family_id <> 'vpet'");
  if (strayQ.changes) console.warn(`[seed] removed ${strayQ.changes} non-VPET sample question(s).`);

  /* The demo fixtures — accounts, a code batch and their orders — are planted
     ONCE and then never again.
   *
   * They used to be guarded on "is the table empty?", which is the same thing
   * on a fresh install and the opposite of it afterwards: an owner who clears
   * the six fixture orders gets them back on the next boot, and cannot ever be
   * rid of them. That is not a hypothetical. Every order on the production box
   * was a fixture — 884.000 đ of revenue that never happened, in the report the
   * owner opens — and `scripts/demo-purge.mjs` could delete them all evening
   * and the next restart would put them back, now with a NULL user_id because
   * the accounts they belonged to are gone. Fake sales, and untraceable ones.
   *
   * So the marker records that the planting has HAPPENED, not that the tables
   * are full. Both empty-table checks stay inside it, because an install that
   * already has users must not be planted into either — it gets the marker
   * without the fixtures, which is exactly right: it has been seen, and it will
   * never be planted into again. */
  const fixturesPlanted = !!qs.val("SELECT hash FROM seed_meta WHERE name='demo-fixtures'");

  if (!fixturesPlanted && !qs.val('SELECT COUNT(*) c FROM users')) {
    // The demo student account (matching the seed account on the front end)
    const ins = db.prepare(`INSERT INTO users (username,email,name,verified,status,interests_json,created_at)
                            VALUES (?,?,?,?,?,?,?)`);
    const daysAgo = n => new Date(Date.now() - n * 86400000).toISOString();
    ins.run('student', 'student@vpetprep.vn', 'Demo Student', 1, 'active', JSON.stringify(['vpet','ielts']), daysAgo(21));
    /* The same list DEMO_USERNAMES exports below. Kept as one array rather than
       two, because `scripts/attempts.js` decides what counts as a simulated
       sitting from it — and a second copy of "who is a fixture" is how a purge
       eventually spares an account it should have cleared, or clears a real one. */
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

  if (!fixturesPlanted && !qs.val('SELECT COUNT(*) c FROM codes')) {
    const insB = db.prepare('INSERT INTO batches (name,unlock_type,unlock_ref,qty,expires_at,created_at) VALUES (?,?,?,?,?,?)');
    const insC = db.prepare(`INSERT INTO codes (code,batch_id,unlock_type,unlock_ref,status,expires_at,user_id,redeemed_at,note,created_at)
                             VALUES (?,?,?,?,?,?,?,?,?,?)`);
    const daysFromNow = n => new Date(Date.now() + n * 86400000).toISOString().slice(0, 10);
    const daysAgo = n => new Date(Date.now() - n * 86400000).toISOString();

    // A demo batch for a class
    insB.run('Lớp IELTS K62 - đợt 1', 'family', 'ielts', 8, daysFromNow(120), nowISO());
    const b1 = qs.val('SELECT id FROM batches ORDER BY id DESC LIMIT 1');
    for (let i = 0; i < 8; i++) insC.run(makeCode(), b1, 'family', 'ielts', 'unused', daysFromNow(120), null, null, null, nowISO());

    // Fixed codes, matching the demo codes on the front end
    const studentId = qs.val("SELECT id FROM users WHERE username='student'");
    insC.run('VPET-B1MK-24TR', null, 'test', 'vpet-b1-01', 'redeemed', daysFromNow(144), studentId, daysAgo(8), 'Issued to the demo account', daysAgo(10));
    insC.run('IELT-AC12-96HD', null, 'family', 'ielts', 'unused', daysFromNow(67), null, null, null, daysAgo(9));
    insC.run('TOEC-LR20-26CB', null, 'family', 'toeic', 'unused', daysFromNow(200), null, null, null, daysAgo(7));
    insC.run('PREP-HHAN-2025', null, 'family', 'pte', 'unused', '2025-12-31', null, null, 'An illustrative code, past its date', daysAgo(300));
    insC.run('PREP-DUNG-ROI1', null, 'test', 'vpet-b1-01', 'redeemed', daysFromNow(140),
      qs.val("SELECT id FROM users WHERE username='thuhang.nt'"), daysAgo(12), null, daysAgo(13));

    // A few spent codes so the reports have something to show
    const users = qs.all("SELECT id FROM users WHERE username IN ('khanhqd','ngocanh.study','baolong.tb')");
    const refs = [['family','toeic'], ['family','ielts'], ['test','vpet-b1-01']];
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
    const row = qs.get('SELECT id, plan_id FROM codes WHERE code=?', code);
    if (!row || row.plan_id) continue;
    qs.run('UPDATE codes SET plan_id=?, access_expires_at=? WHERE id=?',
      planId, months ? monthsFromNow(months) : null, row.id);
    reattached++;
  }
  if (reattached) console.warn(`[seed] ${reattached} demo code(s) had their plan reattached.`);

  if (!fixturesPlanted && !qs.val('SELECT COUNT(*) c FROM orders')) {
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
      ins.run(qs.val('SELECT id FROM users WHERE username=?', u), pk, name, amt, 'paid', daysAgo(d));
    }
  }

  /* Written whether or not anything was actually planted above — see the note
     at the top of the block. `n` is what the tables hold now rather than what
     was inserted, so the row says something true on an install that already had
     its own data. */
  if (!fixturesPlanted) {
    qs.run(`INSERT INTO seed_meta (name,hash,n,at) VALUES ('demo-fixtures','once',?,?)
              ON CONFLICT(name) DO NOTHING`,
      Number(qs.val('SELECT COUNT(*) c FROM users')) || 0, nowISO());
  }

  if (!qs.val("SELECT COUNT(*) c FROM settings")) {
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
  if (qs.val('SELECT hash FROM seed_meta WHERE name=?', name) === hash) return;
  txSync(() => {
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
      (ext_key, family_id, skill, level, type, part, group_key, prompt, options_json, answer,
       explanation, tags_json, source, licence, script, model_answer, status, created_at)
    VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?, 'active', ?)
    ON CONFLICT(ext_key) DO UPDATE SET
      skill=excluded.skill, level=excluded.level, type=excluded.type,
      part=excluded.part, group_key=excluded.group_key, prompt=excluded.prompt,
      options_json=excluded.options_json,
      answer=excluded.answer, explanation=excluded.explanation,
      tags_json=excluded.tags_json, source=excluded.source, licence=excluded.licence,
      script=excluded.script, model_answer=excluded.model_answer`);

  let n = 0;
  txSync(() => {
    for (const r of rows) {
      const before = qs.val('SELECT 1 FROM questions WHERE ext_key=?', r.key);
      /* `say` and `modelAnswer` travel to the row, so the marker reads the
         same text for an authored item as for one written on the screen. */
      ins.run(r.key, 'vpet', r.skill, r.level, r.type, r.part, r.group || null, r.prompt,
        JSON.stringify(r.options), r.answer, r.explanation,
        JSON.stringify(r.tags), r.source, r.licence, r.say || null, r.modelAnswer || null, at);
      if (!before) n++;
    }
  });
  /* Anything authored that is no longer in the bank gets retired.
     The upsert above keys on ext_key, so RENAMING an item does not replace the
     old row - it inserts a second one and leaves the first behind, active, in
     the pool the paper draws from. That is not hypothetical: renaming Part G's
     keys to the bank convention left twenty-four orphans, and the next paper
     built from the blueprint drew six questions from a group of what looked
     like six because two generations were sitting in the same group.
     Retired rather than deleted: a sitting already taken points at these rows
     and its result would lose its questions. */
  const live = new Set(rows.map(r => r.key));
  const orphans = qs.all(
    "SELECT id, ext_key FROM questions WHERE ext_key IS NOT NULL AND ext_key<>'' AND status='active'")
    .filter(r => !live.has(r.ext_key));
  if (orphans.length) {
    txSync(() => {
      for (const o of orphans) db.prepare("UPDATE questions SET status='retired' WHERE id=?").run(o.id);
    });
    console.warn(`[seed] ${orphans.length} bank item(s) retired: no longer in the authored bank.`);
  }
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
  txSync(() => {
    for (const e of rows) {
      const before = qs.val('SELECT id FROM vocab_entries WHERE headword=? AND pos=?', e.headword, e.pos);
      insEntry.run(e.headword, e.pos, e.level, e.levelSource, e.ipaUk, e.ipaUs,
        e.freqRank, e.source, e.licence, e.sort);
      const entryId = qs.val('SELECT id FROM vocab_entries WHERE headword=? AND pos=?', e.headword, e.pos);
      if (!before) added++;

      for (const s of e.senses) {
        insSense.run(entryId, s.en, s.vi, s.level, s.note, s.sort);
        const senseId = qs.val('SELECT id FROM vocab_senses WHERE entry_id=? AND en=?', entryId, s.en);
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
    require('./data/grammar-register-c2'),
    /* Nhóm thứ mười. Bậc A1-A2 trước vì đây là nhóm mà lỗi nặng nhất nằm ở
       bậc thấp: giới từ tiếng Anh không dịch một-đối-một từ tiếng Việt, nên
       người học mắc từ "at 7 o'clock" chứ không đợi tới C1 mới mắc. */
    require('./data/grammar-prepositions'),
    require('./data/grammar-prepositions-b1b2'),
    require('./data/grammar-prepositions-c1c2')
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
        idOf.set(p.slug, qs.val('SELECT id FROM grammar_points WHERE slug=?', p.slug));
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

/**
 * Every learner account the seed creates, demo student first.
 *
 * Exported so the purge tool can say what a "simulated" sitting is without
 * keeping its own copy of the list. Read by scripts/attempts.js.
 */
const DEMO_USERNAMES = ['student', 'thuhang.nt', 'khanhqd', 'mailinh.hu',
  'baolong.tb', 'ngocanh.study', 'huyphan', 'thaovy.dn'];

/**
 * 'YYYY-MM-DD' for the local day an ISO-8601 TEXT column falls in, spelled for
 * whichever engine is answering.
 *
 * The one place in the codebase where the two dialects genuinely diverge, and
 * it earns a helper rather than a rewrite. `date(at, '+7 hours')` is SQLite's
 * and Postgres has no such function; the portable alternative is to select the
 * raw rows and group them in JavaScript, which is what this replaced — measured
 * on an account with 5,863 events, moving the grouping into SQL took the report
 * from 23.6ms to 11.4ms. Throwing that away to avoid four lines here would be
 * paying twelve milliseconds on the first page every signed-in learner loads,
 * for tidiness.
 *
 * `shift` is the same string sqlTzShift() already builds ('+7 hours'), so the
 * caller does not have to know which engine it is talking to either.
 */
function localDaySql(column, shift) {
  if (engine !== 'postgres') return `date(${column}, ?)`;
  /* ::timestamptz reads the stored ISO-8601 as UTC, the interval shifts it, and
     to_char formats it — the same three steps SQLite's date() does in one. The
     interval is bound rather than pasted, so this stays parameterised. */
  return `to_char((${column})::timestamptz + (?)::interval, 'YYYY-MM-DD')`;
}

/**
 * Prove the connection before anything is served.
 *
 * Called by server.js and awaited before `listen`. On SQLite it is a no-op that
 * still returns the same shape, so the caller needs no branch. On Postgres it
 * fails LOUDLY and early: a process that starts, binds the port and then errors
 * on every request is worse than one that never came up, because a health check
 * on the port alone would call it well.
 */
async function connectEngine() {
  if (engine !== 'postgres') return { engine, file: DB_FILE };
  const info = await pgHandle.connect();
  /* If the schema is not there, the deploy step has not been run. Saying that
     is more use than three hundred "relation does not exist" errors. */
  const n = await pgHandle.q.val(
    "SELECT COUNT(*) c FROM information_schema.tables WHERE table_schema = current_schema()");
  if (Number(n) === 0) {
    throw new Error('PostgreSQL is reachable but empty. Run: PG_URL=… npm run pg:migrate -- --yes');
  }

  /* Present is not the same as current.
   *
   * addColumnIfMissing() runs ALTER TABLE against the SQLite handle, which on a
   * Postgres deployment is a scratch file. The live schema gets those columns
   * only through fullPostgresDdl(), which only scripts/pg-migrate.mjs runs. So a
   * deploy that adds a column and skips the migrate step comes up perfectly
   * healthy and is wrong in a way nothing points at: a SELECT * hands back a row
   * without the column, the reader sees `undefined` and treats it as false, and
   * the first write to it is a 500 on whichever route the person happened to
   * use. A learner's notification preferences reading "all off" is not an error
   * anybody reports — it just looks like the setting.
   *
   * Checked against ADDED_COLUMNS rather than a list written here, so a column
   * added in six months is covered by having been added. Counting tables could
   * never have caught this; the tables were all there.
   *
   * The gate cannot see this either: every Postgres suite builds its schema
   * fresh from fullPostgresDdl and therefore always has the columns. */
  const want = new Map();
  for (const [table, column] of ADDED_COLUMNS) {
    if (!want.has(table)) want.set(table, new Set());
    want.get(table).add(column.toLowerCase());
  }
  const have = await pgHandle.q.all(
    'SELECT table_name, column_name FROM information_schema.columns WHERE table_schema = current_schema()');
  const seen = new Map();
  for (const r of have) {
    const t = String(r.table_name);
    if (!seen.has(t)) seen.set(t, new Set());
    seen.get(t).add(String(r.column_name).toLowerCase());
  }
  const missing = [];
  for (const [table, cols] of want) {
    const got = seen.get(table);
    if (!got) continue;                       // the table itself is absent; the count check owns that
    for (const c of cols) if (!got.has(c)) missing.push(table + '.' + c);
  }
  if (missing.length) {
    throw new Error('PostgreSQL is behind this build by ' + missing.length + ' column(s): '
      + missing.slice(0, 8).join(', ') + (missing.length > 8 ? ', …' : '')
      + '. Run the deploy step: PG_URL=… npm run pg:migrate -- --yes');
  }

  return { engine, tables: Number(n), idTables: info.idTables.length };
}

module.exports = { db, q, tx, engine, connectEngine, pg: pgHandle, localDaySql,
  /* The SQLite interface by name, whatever engine is configured. Exported for
     scripts/test-pg-driver.mjs alone: that suite's whole method is running an
     operation on BOTH engines and comparing, and once `q` follows DATABASE_URL
     it would otherwise have been comparing Postgres with itself and passing. */
  sqliteQ,
  nowISO, jparse, makeCode, audit, DB_FILE, seedVocab, DEMO_USERNAMES,
  SCHEMA_SQL, ADDED_COLUMNS, ADDED_INDEXES,
  /* Exported for scripts/test-paper.mjs, which checks a stored paper against
     the same plan the builder works from. */
  fullFormatOf, plannedPaper, buildPaperFromBlueprint, attachBankAudio };
