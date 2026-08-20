/**
 * VPET item bank: does the content match the blueprint.
 *
 * Run with the server up: node scripts/test-items.mjs
 *
 * The focus is the mistakes that survive proof-reading: a part whose skill or
 * item type differs from the blueprint, a gap answer that is two words, an mcq
 * whose answer is missing from its own options, or two identical options.
 *
 * And depth per level, which counts correctly by eye and is still wrong: a part
 * holding twice the blueprint count repeats itself exactly on a retake if that
 * depth sits at a level other than the paper's. See "Bank matches blueprint".
 */
import { readFileSync, existsSync } from 'node:fs';
import { createHash } from 'node:crypto';

const BASE = process.env.BASE || 'http://127.0.0.1:3000';
let pass = 0, fail = 0;
const ok = (c, name, detail) => {
  if (c) { pass++; console.log('✓ ' + name); return; }
  fail++;
  console.log('✗ ' + name + (detail === undefined ? '' : '  → ' + detail));
};
const head = t => console.log('\n\x1b[1m== ' + t + ' ==\x1b[0m');

/* The blueprint is the source of truth: read it rather than restating its
   numbers here, so the test cannot pass once the blueprint has moved. */
const { FORMATS } = await import('../server/data/exam-formats.js').then(m => m.default || m);
const blueprint = FORMATS.find(f => f.id === 'vpet-full');
const partOf = {};
for (const s of blueprint.sections) partOf[s.part] = s;

const items = (await import('../server/data/vpet-items.js').then(m => m.default || m)).rows();

try {
  head('Bank matches blueprint');

  /* All ten parts, read off the blueprint rather than listed here. The bank
     covered only A, B, C, D and I until the five audio parts were written; the
     list of what it happens to hold today is not something a test should assert
     against a copy of itself. */
  const PARTS = blueprint.sections.map(s => s.part);
  const covered = [...new Set(items.map(i => i.part))].sort();
  ok(covered.join('') === PARTS.join(''),
    'The bank covers every part the blueprint declares', covered.join('') + ' vs ' + PARTS.join(''));

  /* The bank is a POOL, not a fixed paper, and depth has to be counted PER
     LEVEL rather than per part. The generator puts exact-level items first and
     then takes what it needs, so a part holding fewer items at the paper's level
     than the blueprint asks for repeats every one of them next time — and a part
     holding EXACTLY the blueprint count repeats all of them with certainty,
     which is the worse of the two. Hence the rule: at any level a part is either
     SHALLOW (fewer than the blueprint count, so the top-up from other levels
     still varies) or DEEP (at least twice it). In between is the only bad place. */
  const SITTINGS = 2;
  const between = [];
  const deepAt = {};
  for (const letter of PARTS) {
    const mine = items.filter(i => i.part === letter);
    const want = partOf[letter];
    ok(mine.length >= want.items,
      'Part ' + letter + ' holds at least ' + want.items + ' items for one sitting', String(mine.length));
    ok(mine.every(i => i.skill === want.skill),
      'Part ' + letter + ' is the right skill, ' + want.skill);
    ok(mine.every(i => want.types.includes(i.type)),
      'Part ' + letter + ' is the right item type, ' + want.types.join('/'));

    deepAt[letter] = new Set();
    for (const level of new Set(mine.map(i => i.level))) {
      const have = mine.filter(i => i.level === level).length;
      if (have >= SITTINGS * want.items) deepAt[letter].add(level);
      else if (have >= want.items) {
        between.push(letter + ' level ' + level + ': ' + have + ' items, blueprint wants ' + want.items);
      }
    }
  }
  ok(between.length === 0,
    'No part sits between shallow and deep at any level', between.join(' · '));

  /* Deep at a different level in each part still cannot regenerate a whole paper:
     part A good for two sittings at B2 while part C is only good at B1 means every
     B2 paper repeats part C. At least one level must be deep in EVERY part.

     The five audio parts are not there yet, and that is declared rather than
     tolerated. Each needs twice its blueprint count at one level - E 16, F 16,
     G 12, H 20, J 6 - and each item needs a recording, so the shortfall is voice
     work as much as writing. Until then a retake repeats some of what was heard.
     Checked in both directions: a part that gets deep and stays on this list is
     as red as one that quietly drops off it. */
  const NOT_YET_DEEP = {
    E: 'needs 16 at one level; recordings as well as scripts',
    F: 'needs 16 at one level; recordings as well as scripts',
    G: 'needs 12 at one level; recordings as well as scripts',
    H: 'needs 20 at one level; recordings as well as scripts',
    J: 'needs 6 at one level; recordings as well as scripts'
  };
  const deepParts = PARTS.filter(x => !NOT_YET_DEEP[x]);
  for (const letter of PARTS) {
    const isDeep = deepAt[letter].size > 0;
    if (NOT_YET_DEEP[letter]) {
      ok(!isDeep,
        'Part ' + letter + ' is still short of two sittings (' + NOT_YET_DEEP[letter] + ')',
        isDeep ? 'it is deep now at ' + [...deepAt[letter]].join('/') + ' — take it out of NOT_YET_DEEP' : '');
    } else {
      ok(isDeep, 'Part ' + letter + ' is good for ' + SITTINGS + ' sittings at some level');
    }
  }
  const common = [...deepAt[deepParts[0]]].filter(l => deepParts.every(x => deepAt[x].has(l)));
  ok(common.length >= 1,
    'At least one level where every finished part is good for ' + SITTINGS + ' sittings',
    JSON.stringify(Object.fromEntries(deepParts.map(x => [x, [...deepAt[x]]]))));

  head('The recordings');

  /* An audio part whose item has no recording is a question the candidate is never
     asked. The files are committed (see scripts/make-vpet-audio.mjs) because the
     deploy cannot synthesise them, so their absence is a repository problem and
     this is where it shows up. */
  const audioItems = items.filter(i => partOf[i.part].needsAudio);
  ok(audioItems.length > 0, 'The audio parts hold items at all', String(audioItems.length));
  ok(audioItems.every(i => i.say && i.say.trim().length > 10),
    'Every audio item carries the words that are spoken',
    audioItems.filter(i => !i.say || i.say.trim().length <= 10).map(i => i.key).join(', '));
  ok(items.filter(i => !partOf[i.part].needsAudio).every(i => !i.say),
    'No silent part carries a recording script it cannot play');

  const audioDir = new URL('../server/data/audio/', import.meta.url);
  const missingFile = audioItems.filter(i => !existsSync(new URL(i.key + '.mp3', audioDir)));
  ok(missingFile.length === 0,
    'Every audio item has its recording committed',
    missingFile.map(i => i.key).join(', ') + ' — run `npm run audio:vpet`');

  /* The manifest records which words each file was made from. A `say` edited
     without re-running the generator leaves the old recording in place, and the
     candidate hears one sentence while being marked against another. */
  const manifest = JSON.parse(readFileSync(new URL('manifest.json', audioDir), 'utf8'));
  const stale = audioItems.filter(i => {
    const m = manifest[i.key];
    return !m || m.hash !== createHash('sha256').update(i.say, 'utf8').digest('hex').slice(0, 16);
  });
  ok(stale.length === 0,
    'No recording is out of date with the words it should say',
    stale.map(i => i.key).join(', ') + ' — run `npm run audio:vpet`');

  head('Per-item quality');

  const keys = items.map(i => i.key);
  ok(new Set(keys).size === keys.length, 'No duplicate keys');
  ok(items.every(i => /^vpet-[a-j]-\d{2}$/.test(i.key)), 'Keys follow vpet-<part>-<number>');
  ok(items.every(i => ['A1', 'A2', 'B1', 'B2', 'C1', 'C2'].includes(i.level)), 'Levels are on the CEFR scale');
  ok(items.every(i => i.prompt.trim().length >= 20), 'Every prompt has real content');
  ok(items.every(i => i.explanation.trim().length >= 20), 'Every item carries a note for the marker');
  ok(items.every(i => i.source && i.licence), 'Every item records source and licence');

  /* Gap-fill: the answer must be ONE word. A two-word answer means the blank
     really accepts several things, and a learner who types half of it is marked wrong. */
  /* Two different tasks share the `gap` type, and the blueprint tells them apart:
     a gap in a silent part is Part A, one missing word in a printed sentence; a gap
     in an audio part is Part E, a whole sentence transcribed from a recording. One
     word is right for the first and wrong for the second, so the rule is applied
     per part rather than to the type. */
  const gaps = items.filter(i => i.type === 'gap');
  const written = gaps.filter(i => !partOf[i.part].needsAudio);
  const heard = gaps.filter(i => partOf[i.part].needsAudio);

  const multi = written.filter(i => i.answer.split('|').some(v => v.trim().split(/\s+/).length !== 1));
  ok(multi.length === 0, 'Every written gap answer is exactly one word', multi.map(i => i.key).join(', '));
  ok(written.every(i => i.prompt.includes('___')), 'Every written gap item has a blank in the prompt');
  ok(gaps.every(i => i.answer.trim()), 'Every gap item has an answer');

  /* Dictation is marked by string comparison after stripping punctuation from the
     ENDS only (server/marking.js), so an internal comma or an apostrophe has to be
     typed exactly. Either is a candidate marked wrong for hearing correctly. */
  const punctuated = heard.filter(i => /[,;:"()]/.test(i.answer) || /\w'\w/.test(i.answer));
  ok(punctuated.length === 0,
    'No dictation answer hides punctuation the candidate must guess',
    punctuated.map(i => i.key).join(', '));
  ok(heard.every(i => i.answer.trim().split(/\s+/).length >= 5),
    'Every dictation answer is a whole sentence, not a word');

  /* Multiple choice: the answer must be among the options, and no two options may
     be identical — two the same and the item measures nothing at all. */
  const mcqs = items.filter(i => i.type === 'mcq');
  ok(mcqs.every(i => i.options.length === 4), 'Every mcq has exactly 4 options');
  ok(mcqs.every(i => i.options.includes(i.answer)), 'The answer is always among the options');
  ok(mcqs.every(i => new Set(i.options).size === i.options.length), 'No two options are identical');
  ok(mcqs.every(i => i.options.every(o => o.trim())), 'No option is left blank');

  /* Essay and speaking are rubric-marked: a pre-written answer is the wrong model,
     marking.js leaves them pending rather than comparing strings. */
  const rubric = items.filter(i => i.type === 'essay' || i.type === 'speaking');
  ok(rubric.every(i => i.answer === ''), 'Rubric items carry no pre-written answer');
  /* The other direction: a rubric item may only sit in a part the blueprint
     declares as essay or speaking. An essay loose in part C would leave marking.js
     holding a part for hand-marking that should have been auto-marked on submit. */
  const rubricParts = PARTS.filter(l =>
    partOf[l].types.some(t => t === 'essay' || t === 'speaking'));
  ok(rubric.every(i => rubricParts.includes(i.part)),
    'Rubric items sit only in parts the blueprint declares essay or speaking',
    rubric.filter(i => !rubricParts.includes(i.part)).map(i => i.key).join(', '));

  head('Reached the database');

  const r = await fetch(BASE + '/api/catalog');
  ok(r.status === 200, 'Catalogue is readable', 'status ' + r.status);

  /* Source and licence are internal data: they must not reach the public catalogue. */
  const raw = JSON.stringify(await r.json());
  ok(!raw.includes('written for this platform'), 'Internal provenance stays out of the public catalogue');

  head('The data file');

  const src = readFileSync(new URL('../server/data/vpet-items.js', import.meta.url), 'utf8');
  /* No string check can prove "never copied". What can be checked is whether
     provenance is declared: the file must say what it levelled against, must name
     the two forbidden lists to state that it did not use them, and no item's
     source field may point at either. */
  ok(/NGSL/.test(src) && /NAWL/.test(src), 'Names the open reference lists used for levelling');
  ok(/Oxford 3000 \/\s*\n?\s*\* 5000 and the English Vocabulary Profile were not used/.test(src)
    || /Oxford[\s\S]{0,80}English Vocabulary Profile were not used/.test(src),
    'States plainly that Oxford 3000/5000 and the EVP were not used');
  ok(items.every(i => !/oxford|vocabulary profile/i.test(i.source + i.licence)),
    'No item source points at a copyrighted list');
} catch (e) {
  fail++;
  console.log('✗ Failed while running: ' + (e && e.stack ? e.stack : e));
}

console.log('\n' + (fail ? '\x1b[31m' : '\x1b[32m') + (pass) + '/' + (pass + fail) + ' checks passed\x1b[0m');
process.exit(fail ? 1 : 0);
