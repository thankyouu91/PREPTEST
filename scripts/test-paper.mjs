/**
 * The paper a student actually receives: does it match the blueprint.
 *
 * Run standalone: node scripts/test-paper.mjs   (no server needed)
 *
 * This suite exists because the whole gate was green while the only published
 * paper served 95 items instead of 58, with three groups of three parts holding
 * byte-identical questions. Nothing was broken in the engine — scripts/
 * test-exam.mjs builds its own two-part fixture to measure timers and guards,
 * and scripts/test-items.mjs reads the bank's source file. Neither of them ever
 * opened the paper a real candidate sits and counted it.
 *
 * So that is all this does: read the stored rows for every published paper whose
 * family publishes a blueprint, and compare them with the blueprint. It reads
 * the database rather than the seed code, because the seed code being right is
 * the claim under test.
 */
import { readFileSync } from 'node:fs';
import { DatabaseSync } from 'node:sqlite';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

let pass = 0, fail = 0;
const ok = (c, name, detail) => {
  if (c) { pass++; console.log('✓ ' + name); return; }
  fail++;
  console.log('✗ ' + name + (detail === undefined ? '' : '  → ' + detail));
};
const head = t => console.log('\n\x1b[1m== ' + t + ' ==\x1b[0m');

/**
 * The parts the bank cannot fill, and why.
 *
 * Empty, and the empty object is the point: every part of the paper is filled to
 * its blueprint count. It held E, F, G, H and J for as long as those five had no
 * items and no recordings.
 *
 * Checked in BOTH directions, so it cannot drift back into a tolerance nobody
 * reads: a part short of the blueprint and not listed here is red, and a part
 * listed here that turns out to be full is red too. Add an entry only with the
 * reason written down, and delete it the day the reason stops being true.
 */
const KNOWN_SHORT = {};

/**
 * The paper is read through a raw connection of our own, NOT through
 * server/db.js.
 *
 * Importing server/db.js runs the seed, and the seed now repairs any paper that
 * has drifted from the blueprint. That is right for the server and fatal for
 * this suite: the first version of it imported db.js, and when the original bug
 * was injected by hand to prove the suite would catch it, the suite passed —
 * the import had silently put the paper back before a single assertion ran. A
 * check that heals what it is measuring measures nothing.
 *
 * So: snapshot the stored rows first, assert against the snapshot, and only then
 * import db.js for the builder's own agreement checks at the bottom.
 */
const HERE = dirname(fileURLToPath(import.meta.url));
const DB_FILE = process.env.PREP_DB || join(HERE, '..', 'data', 'prep.sqlite');
const raw = new DatabaseSync(DB_FILE, { readOnly: true });

const EXAM_FORMATS = await import('../server/data/exam-formats.js').then(m => m.default || m);
const { SEED_TESTS } = await import('../server/data/seed-tests.js').then(m => m.default || m);

const sql = (s, ...p) => raw.prepare(s).all(...p);
const one = (s, ...p) => raw.prepare(s).get(...p);

try {
  /* ------------------------------------------------------------------ *
   * The blueprint itself has to add up before anything is measured against it
   * ------------------------------------------------------------------ */
  head('The blueprint is self-consistent');

  const bad = EXAM_FORMATS.inconsistencies();
  ok(bad.length === 0, 'No format disagrees with its own part table', bad.join(' · '));

  const vpet = EXAM_FORMATS.FORMATS.find(f => f.id === 'vpet-full');
  ok(!!vpet, 'The VPET blueprint is published');
  ok(EXAM_FORMATS.totalItems(vpet) === 58, 'VPET totals 58 items', String(EXAM_FORMATS.totalItems(vpet)));
  /* The clock, and where it comes from. Every part's window is arithmetic over the
     per-item timings the Pearson guide states - 25 seconds an item in Part A, 9
     minutes an e-mail in Part D, 3 minutes a passage in Part C - so a part whose
     window stops matching its own timing block is red. It used to be ten numbers
     somebody chose, and Part C had seven minutes for something the guide gives
     nine. */
  for (const sec of vpet.sections) {
    const want = EXAM_FORMATS.partSeconds(sec.part, sec.items);
    ok(sec.seconds === want,
      `Part ${sec.part}'s window is what its timings add up to (${want}s)`, `${sec.seconds}s`);
  }

  /* The guide's "approximately 60 minutes" is the whole sitting, and each part
     opens with an instruction screen and a sample item that carry no clock here.
     So the timed windows come to less than 60, and how much less has to stay
     small enough that the paper still describes the real thing. */
  const timed = EXAM_FORMATS.totalSeconds(vpet);
  ok(timed >= 52 * 60 && timed <= 60 * 60,
    'The timed windows come to between 52 and 60 minutes',
    (timed / 60).toFixed(1) + ' min');
  ok(EXAM_FORMATS.totalMinutes(vpet) === Math.round(timed / 60),
    'The stated total is the timed total, not a rounder number');
  ok(vpet.sections.length === 10, 'VPET has ten parts', String(vpet.sections.length));
  ok(vpet.sections.map(s => s.part).join('') === 'ABCDEFGHIJ',
    'The ten parts are lettered A to J in order', vpet.sections.map(s => s.part).join(''));

  /* ------------------------------------------------------------------ *
   * Every published paper, against the blueprint its family publishes
   * ------------------------------------------------------------------ */
  const papers = sql(
    `SELECT t.id, t.title, t.family_id, t.level, t.duration_min
       FROM tests t
      WHERE t.status='published'
      ORDER BY t.id`);

  const withBlueprint = papers.filter(p => EXAM_FORMATS.partsOf(p.family_id).length);
  head(`Published papers: ${papers.length} in the catalogue, ${withBlueprint.length} with a blueprint to check`);

  ok(withBlueprint.length > 0, 'There is at least one published paper to check');

  /* A published paper whose family has no part table cannot be checked here, and
     a paper nobody can check is how the last one went wrong. Name them. */
  const unchecked = papers.filter(p => !EXAM_FORMATS.partsOf(p.family_id).length);
  ok(unchecked.length === 0,
    'No published paper escapes this check',
    unchecked.map(p => `${p.id} (${p.family_id} publishes no part table)`).join(', '));

  /* Which papers are meant to be the whole exam. A module paper covering one
     part is a legitimate thing to publish, so "has all ten parts" is asked only
     of the papers built from the blueprint; every other rule below is asked of
     everything, because none of them depends on the paper being full-length. */
  const fullPapers = new Set(SEED_TESTS.map(t => t.id));

  for (const paper of withBlueprint) {
    const isFull = fullPapers.has(paper.id);
    head(`${paper.id} — ${paper.title}${isFull ? '' : '   (partial paper: per-part checks only)'}`);

    const fmt = EXAM_FORMATS.FORMATS.find(f => f.familyId === paper.family_id && f.kind === 'full');
    const secs = sql(
      'SELECT id, sort, part, name, skill, type, minutes, seconds FROM sections WHERE test_id=? ORDER BY sort', paper.id);

    if (isFull) {
      ok(secs.length === fmt.sections.length,
        `Has all ${fmt.sections.length} parts`, `saw ${secs.length}`);

      ok(secs.map(s => s.part || '?').join('') === fmt.sections.map(s => s.part).join(''),
        'The part letters are the blueprint\'s, in the blueprint\'s order',
        secs.map(s => s.part || 'NULL').join(''));

      const mins = secs.reduce((a, s) => a + s.minutes, 0);
      ok(mins === EXAM_FORMATS.totalMinutes(fmt),
        `The parts add up to ${EXAM_FORMATS.totalMinutes(fmt)} minutes`, String(mins));

      /* Minutes are for the screen; the clock a candidate gets is the seconds
         column, and that is the one that has to match the blueprint exactly. */
      const wrongSecs = fmt.sections
        .map(bp => [bp, secs.find(x => x.part === bp.part)])
        .filter(([bp, row]) => row && row.seconds !== bp.seconds);
      ok(wrongSecs.length === 0,
        'Every part is stored with the blueprint\'s own clock, to the second',
        wrongSecs.map(([bp, row]) => `${bp.part} ${row.seconds}s not ${bp.seconds}s`).join(', '));
      ok(paper.duration_min === mins,
        'The paper\'s stated duration is the sum of its parts',
        `test says ${paper.duration_min}, parts add to ${mins}`);
    }

    /* True of every paper, full or not: a part that carries no letter cannot be
       drawn from the right pool and cannot be labelled on the result page. */
    const unlettered = secs.filter(s => !s.part);
    ok(unlettered.length === 0,
      'Every part carries its blueprint letter',
      unlettered.map(s => `"${s.name}"`).join(', '));

    /* --- item counts, part by part --- */
    const seen = new Map();        // question id -> the part that already used it
    const shortfall = {};
    let checkedParts = 0;

    for (const bp of fmt.sections) {
      const sec = secs.find(s => s.part === bp.part);
      if (!sec) continue;          // already reported by the part-letter check
      checkedParts++;

      const items = sql(
        `SELECT qu.id, qu.part, qu.type, qu.skill, qu.status, qu.audio_key, qu.group_key
           FROM section_items si JOIN questions qu ON qu.id=si.question_id
          WHERE si.section_id=? ORDER BY si.sort`, sec.id);

      if (items.length !== bp.items) shortfall[bp.part] = items.length;

      ok(items.length <= bp.items,
        `Part ${bp.part} holds no more than the blueprint's ${bp.items}`, `saw ${items.length}`);

      /* The failure that started all this: a part serving another part's items. */
      const wrongPart = items.filter(i => i.part !== bp.part);
      ok(wrongPart.length === 0,
        `Part ${bp.part} draws only from part ${bp.part}`,
        wrongPart.map(i => `q${i.id} is part ${i.part || 'untagged'}`).join(', '));

      const allowed = bp.types || [];
      const wrongType = allowed.length ? items.filter(i => !allowed.includes(i.type)) : [];
      ok(wrongType.length === 0,
        `Part ${bp.part} holds only ${allowed.join('/') || 'any'} items`,
        wrongType.map(i => `q${i.id} is ${i.type}`).join(', '));

      const inactive = items.filter(i => i.status !== 'active');
      ok(inactive.length === 0,
        `Part ${bp.part} serves no withdrawn item`,
        inactive.map(i => `q${i.id} is ${i.status}`).join(', '));

      /* Audio is not decoration on these parts: without it the candidate is
         answering a question they were never asked. An empty part is exempt —
         it has nothing to play — and is caught by the shortfall check instead.

         Counted per GROUP where a part has them. Part G is one passage and
         three questions about it: the passage is played once, at the top of the
         group, so exactly one of the three carries a recording. Demanding one
         per item would demand the passage be played three times, which is the
         opposite of what the guide describes.

         What must hold either way: every group can be heard, and the item that
         plays it comes first. A group whose recording sits on its second
         question asks about a passage before playing it. */
      if (bp.needsAudio && items.length) {
        const grouped = items.filter(i => i.group_key);
        const byGroup = {};
        for (const i of grouped) (byGroup[i.group_key] = byGroup[i.group_key] || []).push(i);
        for (const [gk, members] of Object.entries(byGroup)) {
          const withAudio = members.filter(i => i.audio_key);
          ok(withAudio.length === 1,
            `Part ${bp.part} group ${gk} plays its passage exactly once`,
            `${withAudio.length} of ${members.length} items carry a recording`);
          ok(!!members[0].audio_key,
            `Part ${bp.part} group ${gk} plays the passage before the first question`,
            'the recording is on item ' + (members.findIndex(i => i.audio_key) + 1));
        }
        const mute = items.filter(i => !i.audio_key && !i.group_key);
        ok(mute.length === 0,
          `Part ${bp.part} plays audio on every ungrouped item`,
          `${mute.length} of ${items.length} items have no recording`);
      }

      for (const it of items) {
        if (seen.has(it.id)) {
          ok(false, `Part ${bp.part} shares no item with another part`,
            `q${it.id} is also in part ${seen.get(it.id)}`);
          break;
        }
        seen.set(it.id, bp.part);
      }
    }

    /* A paper whose parts all failed to match would otherwise sail through the
       loop above without a single assertion running. */
    ok(checkedParts > 0, 'At least one part of this paper was matched and checked',
      `${secs.length} sections, none matching a blueprint letter`);

    /* One assertion for the whole paper, so a duplicate anywhere is one line. */
    const slots = fmt.sections.reduce((a, bp) => {
      const sec = secs.find(s => s.part === bp.part);
      return a + (sec ? (one('SELECT COUNT(*) c FROM section_items WHERE section_id=?', sec.id) || {}).c || 0 : 0);
    }, 0);
    ok(slots === seen.size,
      'Every answer box on the paper is a different question',
      `${slots} boxes but only ${seen.size} distinct questions`);

    /* --- the declared shortfall, checked in both directions --- */
    if (isFull) {
      head(`${paper.id} — the parts the bank still cannot fill`);

      for (const bp of fmt.sections) {
        const have = shortfall[bp.part];
        const declared = KNOWN_SHORT[bp.part];

        if (declared === undefined) {
          ok(have === undefined,
            `Part ${bp.part} is filled to the blueprint's ${bp.items}`,
            have === undefined ? '' : `holds ${have}`);
          continue;
        }
        if (have === undefined) {
          ok(false,
            `Part ${bp.part} is listed as short but is now full — remove it from KNOWN_SHORT`,
            `${bp.items}/${bp.items} items`);
          continue;
        }
        ok(have === declared.have,
          `Part ${bp.part} is short by exactly the amount declared (${declared.have}/${bp.items}: ${declared.why})`,
          `holds ${have}, KNOWN_SHORT says ${declared.have}`);
      }

      const total = fmt.sections.reduce(
        (a, s) => a + (shortfall[s.part] === undefined ? s.items : shortfall[s.part]), 0);
      const waiting = Object.keys(KNOWN_SHORT).length;
      console.log(`\n   The paper holds ${total} of ${EXAM_FORMATS.totalItems(fmt)} items.`
        + (waiting ? ` ${waiting} part(s) wait on content — see docs/VPET-BLUEPRINT.md.` : ' Every part is full.'));
    }
  }

  /* ------------------------------------------------------------------ *
   * Everything above read the stored paper. Only now is db.js allowed in —
   * importing it runs the seed, which repairs the paper.
   * ------------------------------------------------------------------ */
  head('The builder writes what the blueprint plans, and stops there');

  const itemsOf = conn => conn.prepare(
    `SELECT s.part, si.question_id FROM sections s
       JOIN section_items si ON si.section_id=s.id
      WHERE s.test_id='vpet-b1-01' ORDER BY s.sort, si.sort`).all();

  const before = itemsOf(raw);
  const { db, buildPaperFromBlueprint, plannedPaper } =
    await import('../server/db.js').then(m => m.default || m);
  const afterSeed = itemsOf(db);

  /* If this one fires, the stored paper had drifted and the seed has just put it
     back. That is the seed doing its job, so the interesting failures are the
     ones above — this is here to say out loud that the rows changed underneath,
     rather than letting the checks below quietly grade the repaired copy. */
  const drifted = before
    .map((r, i) => [r, afterSeed[i]])
    .filter(([a, b]) => !b || a.part !== b.part || a.question_id !== b.question_id)
    .map(([a, b]) => `${a.part}:q${a.question_id} → ${b ? b.part + ':q' + b.question_id : 'gone'}`);
  ok(JSON.stringify(before) === JSON.stringify(afterSeed),
    'The stored paper already matched the blueprint — the seed had nothing to repair',
    drifted.slice(0, 4).join(', ') + (drifted.length > 4 ? ` (+${drifted.length - 4} more)` : ''));

  buildPaperFromBlueprint('vpet-b1-01', 'vpet', 'B1');
  const afterBuild = itemsOf(db);
  ok(JSON.stringify(afterSeed) === JSON.stringify(afterBuild),
    'Building a second time changes nothing',
    `${afterSeed.length} items, then ${afterBuild.length}`);

  /* The plan and the stored paper have to be the same thing, or the builder is
     writing something other than what it planned. */
  const plan = plannedPaper('vpet', 'B1');
  const planned = plan.flatMap(p => p.ids.map(id => ({ part: p.bp.part, question_id: id })));
  ok(JSON.stringify(planned) === JSON.stringify(afterBuild),
    'What is stored is exactly what the blueprint planned',
    `planned ${planned.length}, stored ${afterBuild.length}`);

  /* ------------------------------------------------------------------ *
   * The blueprint is the only copy of the part table
   * ------------------------------------------------------------------ */
  head('Nobody keeps a second copy of the part table');

  /* The demo paper used to carry its own hand-written list of ten parts, and the
     copy is what drifted. Any file that names the parts and their counts again
     is the same bug waiting. */
  const seedSrc = readFileSync(new URL('../server/db.js', import.meta.url), 'utf8');
  ok(!/'Part [A-J] - /.test(seedSrc),
    'server/db.js names no part of the paper — it reads exam-formats.js',
    (seedSrc.match(/'Part [A-J] - [^'\n]*/g) || []).slice(0, 3).join(' · '));
  ok(!/skill === 'writing' \? 2/.test(seedSrc),
    'The old pick-by-skill loop is gone from the seed');

} catch (err) {
  fail++;
  console.log('\n✗ The suite threw: ' + (err && err.stack ? err.stack : err));
}

console.log(`\n${fail ? '\x1b[31m' : '\x1b[32m'}${pass} passed, ${fail} failed\x1b[0m`);
process.exit(fail ? 1 : 0);
