/**
 * A part's evidence must be filed under the skill that part actually tests.
 *
 * placement.skillOfPart() walked `Object.values(exam-formats)` looking for
 * `f.parts`. The module exports `{FORMATS, partsOf, totalItems, …}` and a format
 * carries `sections`, not `parts`, so nothing ever matched, the map stayed empty,
 * and every part fell through a `|| 'reading'` default.
 *
 * Part C is genuinely reading, which is why nobody caught it: any spot-check
 * that happened to pick C came back correct. Everything else was wrong. Parts E,
 * F and G are listening; A, B and D are writing; H, I and J are speaking. All of
 * them were recorded as reading — by the placement, which is the first eighteen
 * items the platform ever sees of a learner, and by all three drill paths.
 *
 * What it looked like from the outside: a learner answers twelve listening items
 * in the placement and the dashboard says "Nghe: chưa có" while Đọc carries a
 * band built from their listening and writing answers.
 *
 * So this asserts the mapping against the blueprint ITSELF rather than against a
 * list typed in here — a list would be the same hardcoding the function set out
 * to avoid — plus the two things a silent default hides: that the map is not
 * empty, and that an unknown part gets no answer rather than a plausible one.
 *
 * Run: node scripts/test-part-skill.mjs
 */
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const placement = require('../server/placement.js');
const { FORMATS } = require('../server/data/exam-formats.js');

const out = [];
const check = (n, ok, extra) => out.push({ n, ok: !!ok, extra });

/* The blueprint, read the same way the product reads it everywhere else. */
const blueprint = {};
for (const f of FORMATS || []) {
  for (const s of (f && f.sections) || []) if (s.part && s.skill) blueprint[s.part] = s.skill;
}

const parts = Object.keys(blueprint).sort();
check('The blueprint names lettered parts', parts.length >= 8, parts.join(' '));

const wrong = parts.filter(p => placement.skillOfPart(p) !== blueprint[p])
  .map(p => p + ': said ' + placement.skillOfPart(p) + ', blueprint says ' + blueprint[p]);
check('Every part is filed under the skill the blueprint gives it',
  wrong.length === 0, wrong.join(' | '));

/* The specific claim the old default got wrong, stated on its own so a failure
   reads as the product fault it is rather than as a mapping mismatch. */
const listening = parts.filter(p => blueprint[p] === 'listening');
check('Listening parts are not filed as reading',
  listening.length > 0 && listening.every(p => placement.skillOfPart(p) === 'listening'),
  listening.map(p => p + '→' + placement.skillOfPart(p)).join(' '));

const writing = parts.filter(p => blueprint[p] === 'writing');
check('Writing parts are not filed as reading',
  writing.length > 0 && writing.every(p => placement.skillOfPart(p) === 'writing'),
  writing.map(p => p + '→' + placement.skillOfPart(p)).join(' '));

/* An unknown part must come back with nothing. The old code answered 'reading',
   which is what turned a broken lookup into eighteen items of wrong evidence
   instead of an empty panel somebody would have reported on day one. */
check('An unknown part is refused rather than guessed',
  placement.skillOfPart('Z') === null || placement.skillOfPart('Z') === undefined,
  JSON.stringify(placement.skillOfPart('Z')));
check('and so is a missing one', !placement.skillOfPart(null) && !placement.skillOfPart(''),
  JSON.stringify([placement.skillOfPart(null), placement.skillOfPart('')]));

let bad = 0;
for (const r of out) {
  console.log((r.ok ? '✓ ' : '✗ ') + r.n + (r.ok || !r.extra ? '' : '  — ' + r.extra));
  if (!r.ok) bad++;
}
console.log('\n' + (out.length - bad) + '/' + out.length + ' checks passed');
process.exit(bad ? 1 : 0);
