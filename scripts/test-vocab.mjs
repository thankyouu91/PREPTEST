/**
 * Vocabulary schema and importer.
 *
 * Run with the server up: node scripts/test-vocab.mjs
 *
 * Two halves, because the two things to prove live in different places:
 *
 * - The HTTP half reads `/api/learn/vocab` on the running server: did the data
 *   reach the database, does lookup by inflected form work, and does provenance
 *   travel with it.
 * - The importer half runs directly against a throwaway database (`PREP_DB`),
 *   because what needs proving is *what happens on the second run* — do ids
 *   change, is a hand-set level overwritten, is a dropped entry removed. It
 *   touches nothing in `data/` and shares no file with the server.
 */
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createRequire } from 'node:module';

const BASE = process.env.BASE || 'http://127.0.0.1:3000';
let pass = 0, fail = 0;
const ok = (c, name, detail) => {
  if (c) { pass++; console.log('✓ ' + name); return; }
  fail++;
  console.log('✗ ' + name + (detail === undefined ? '' : '  → ' + detail));
};
const head = t => console.log('\n\x1b[1m== ' + t + ' ==\x1b[0m');

const get = async path => {
  const r = await fetch(BASE + path);
  return { status: r.status, data: await r.json().catch(() => ({})) };
};

let tmp = '';
try {
  head('Reading through the API');

  let r = await get('/api/learn/vocab');
  ok(r.status === 200, 'The word list is readable', 'status ' + r.status);
  const list = r.data;
  ok(list.total >= 12, 'The bank holds data', 'total ' + list.total);
  ok(Array.isArray(list.entries) && list.entries.length === list.total,
    'The list returns as many entries as it counted', list.entries.length + '/' + list.total);
  ok(list.levels.length >= 2 && list.parts.length >= 3,
    'Counts by level and by part of speech are present', JSON.stringify({ levels: list.levels.length, parts: list.parts.length }));

  /* The same headword under two parts of speech is two entries — which is why the
     natural key is (headword, pos) and not the headword alone. */
  const books = list.entries.filter(e => e.headword === 'book');
  ok(books.length === 2, 'One headword, two parts of speech, two entries', JSON.stringify(books.map(b => b.pos)));
  ok(books.some(b => b.pos === 'noun' && b.level === 'A1') &&
     books.some(b => b.pos === 'verb' && b.level === 'A2'),
    'The two "book" entries sit at the levels docs/LEARNING.md §1.2 names',
    JSON.stringify(books.map(b => b.pos + '/' + b.level)));

  r = await get('/api/learn/vocab?level=B2');
  ok(r.status === 200 && r.data.entries.every(e => e.level === 'B2'),
    'Filtering by level returns only that level', JSON.stringify(r.data.entries.map(e => e.level)));
  ok(r.data.matched === r.data.entries.length && r.data.matched < r.data.total,
    'The matched count differs from the total', JSON.stringify({ matched: r.data.matched, total: r.data.total }));

  r = await get('/api/learn/vocab?pos=verb');
  ok(r.status === 200 && r.data.entries.length >= 3 && r.data.entries.every(e => e.pos === 'verb'),
    'Filtering by part of speech', String(r.data.entries.length));

  /* A learner who meets "children" in a text looks up "children", not "child".
     The search has to reach the inflected-forms table, or lookup is broken. */
  r = await get('/api/learn/vocab?q=children');
  ok(r.status === 200 && r.data.entries.some(e => e.headword === 'child'),
    'Looking up an inflected form still finds the headword', JSON.stringify(r.data.entries.map(e => e.headword)));
  r = await get('/api/learn/vocab?q=went');
  ok(r.data.entries.some(e => e.headword === 'go'), 'Looking up "went" finds "go"');
  r = await get('/api/learn/vocab?q=bằng chứng');
  ok(r.data.entries.some(e => e.headword === 'evidence'), 'Looking up the Vietnamese gloss works too');

  head('One headword, with everything under it');

  r = await get('/api/learn/vocab/book');
  ok(r.status === 200 && r.data.entries.length === 2,
    'One headword returns both parts of speech', String(r.data.entries.length));
  const bookVerb = r.data.entries.find(e => e.pos === 'verb');
  ok(bookVerb && bookVerb.forms.length === 4,
    'All four verb forms are there', JSON.stringify(bookVerb && bookVerb.forms.map(f => f.kind)));
  ok(bookVerb && bookVerb.senses[0].examples.length >= 2,
    'Every sense has at least the two examples §1.2 asks for');
  ok(bookVerb && bookVerb.source && bookVerb.licence,
    'Every entry carries source and licence');
  ok(bookVerb && bookVerb.senses[0].examples.every(x => x.source && x.licence),
    'Every example carries its own source and licence');

  /* A sense is allowed to sit above its headword's level — "run" is A1, but the
     "manage" sense is B1. If a sense had to inherit the headword's level, the level
     column on the senses table would be redundant and the §1.2 counts would be wrong. */
  r = await get('/api/learn/vocab/run');
  const run = r.data.entries[0];
  ok(run && run.level === 'A1' && run.senses.some(s => s.level === 'B1'),
    'A sense carries its own level, above the headword\'s',
    JSON.stringify(run && { entry: run.level, senses: run.senses.map(s => s.level) }));

  r = await get('/api/learn/vocab/child');
  const child = r.data.entries[0];
  ok(child.forms.some(f => f.form === 'children' && f.kind === 'plural' && f.note),
    'An irregular form comes with a note');

  r = await get('/api/learn/vocab/no-such-word-here');
  ok(r.status === 404, 'An unknown word returns 404', 'status ' + r.status);

  head('The importer is re-runnable');

  /* From here down, everything runs against a throwaway database of its own. */
  tmp = mkdtempSync(join(tmpdir(), 'prep-vocab-'));
  process.env.PREP_DB = join(tmp, 'probe.sqlite');
  const require_ = createRequire(import.meta.url);
  const DB = require_('../server/db.js');
  const { q, db, seedVocab } = DB;

  const snapshot = () => q.all(
    'SELECT id, headword, pos, level, level_source FROM vocab_entries ORDER BY id');
  const count = t => q.val('SELECT COUNT(*) c FROM ' + t);

  const before = snapshot();
  const beforeCounts = ['vocab_senses', 'vocab_examples', 'vocab_forms', 'collocations'].map(count);
  ok(before.length === 12, 'A fresh database imports all 12 entries', String(before.length));

  seedVocab();
  const after = snapshot();
  const afterCounts = ['vocab_senses', 'vocab_examples', 'vocab_forms', 'collocations'].map(count);
  ok(JSON.stringify(before) === JSON.stringify(after),
    'A second run changes no id and duplicates no entry');
  ok(JSON.stringify(beforeCounts) === JSON.stringify(afterCounts),
    'A second run duplicates none of the children',
    JSON.stringify({ before: beforeCounts, after: afterCounts }));

  /* Ids have to survive a re-import, because learn_progress is about to point at a
     sense id. Renumbering on import would point a learner's review schedule at another word. */
  const senseIds = q.all('SELECT id, en FROM vocab_senses ORDER BY id');
  seedVocab();
  ok(JSON.stringify(senseIds) === JSON.stringify(q.all('SELECT id, en FROM vocab_senses ORDER BY id')),
    'Sense ids survive a re-import — where learn_progress will point');

  /* §1.4: a level set by hand in the admin area always beats the three automatic
     rules. A re-import that quietly reverted it would make that sentence untrue. */
  const target = q.get("SELECT id, level FROM vocab_entries WHERE headword='research'");
  db.prepare("UPDATE vocab_entries SET level='C1', level_source='manual' WHERE id=?").run(target.id);
  const other = q.get("SELECT id FROM vocab_entries WHERE headword='evidence'");
  db.prepare("UPDATE vocab_entries SET level='A1' WHERE id=?").run(other.id);

  seedVocab();
  const pinned = q.get('SELECT level, level_source FROM vocab_entries WHERE id=?', target.id);
  const reset = q.get('SELECT level FROM vocab_entries WHERE id=?', other.id);
  ok(pinned.level === 'C1' && pinned.level_source === 'manual',
    'A hand-set level is not overwritten by a later import', JSON.stringify(pinned));
  ok(reset.level === 'B2',
    'A level that was not hand-set goes back to what the source says', reset.level);

  /* An entry the source has dropped must disappear, or correcting content can only
     add and never remove — the very reason seedContent clears and reloads elsewhere. */
  const entry = q.get("SELECT id FROM vocab_entries WHERE headword='child'");
  db.prepare("INSERT INTO vocab_senses (entry_id,en,vi,level,sort) VALUES (?,?,?,?,?)")
    .run(entry.id, 'A stray sense that no longer exists in the source.', 'nghĩa thừa', 'A1', 99);
  db.prepare("INSERT INTO vocab_forms (entry_id,form,kind,sort) VALUES (?,?,?,?)")
    .run(entry.id, 'childs', 'plural', 99);
  const strays = q.val("SELECT COUNT(*) c FROM vocab_senses WHERE entry_id=?", entry.id);

  seedVocab();
  ok(q.val('SELECT COUNT(*) c FROM vocab_senses WHERE entry_id=?', entry.id) === strays - 1,
    'A sense no longer in the source is deleted on re-import');
  ok(!q.val("SELECT COUNT(*) c FROM vocab_forms WHERE entry_id=? AND form='childs'", entry.id),
    'An inflected form no longer in the source is deleted on re-import');

  /* The other way round: a word an administrator added by hand is not in the source,
     and a later import must not sweep it away. */
  db.prepare(`INSERT INTO vocab_entries
      (headword,pos,level,level_source,source,licence,sort)
      VALUES ('kerfuffle','noun','C2','manual','Admin','Project content',900)`).run();
  seedVocab();
  ok(q.val("SELECT COUNT(*) c FROM vocab_entries WHERE headword='kerfuffle'") === 1,
    'A word added by hand is not deleted by a later import');

  /* Deleting a sense must take its examples with it — otherwise orphaned examples
     stay behind and the examples table grows with every content fix. */
  const sense = q.get("SELECT id FROM vocab_senses WHERE en LIKE 'To manage or be in charge%'");
  const exBefore = q.val('SELECT COUNT(*) c FROM vocab_examples WHERE sense_id=?', sense.id);
  db.prepare('DELETE FROM vocab_senses WHERE id=?').run(sense.id);
  ok(exBefore >= 2 && q.val('SELECT COUNT(*) c FROM vocab_examples WHERE sense_id=?', sense.id) === 0,
    'Deleting a sense takes its examples with it (ON DELETE CASCADE)');
} catch (e) {
  fail++;
  console.log('✗ Failed while running: ' + (e && e.stack ? e.stack : e));
} finally {
  if (tmp) rmSync(tmp, { recursive: true, force: true });
}

console.log('\n' + (fail ? '\x1b[31m' : '\x1b[32m') + pass + '/' + (pass + fail) + ' checks passed\x1b[0m');
process.exit(fail ? 1 : 0);
