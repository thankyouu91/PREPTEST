/**
 * The papers the platform ships with.
 *
 * A row here is metadata only — id, family, title, level, status. It carries no
 * part list and no item counts on purpose: those live in exam-formats.js, and
 * server/db.js's buildPaperFromBlueprint() reads them from there.
 *
 * It used to carry its own copy of the ten VPET parts, and the copy is where
 * the paper went wrong. The rows named the parts but held no item counts and no
 * part letters, so the code filling them had nothing to aim at and fell back on
 * each item's skill. Three parts share a skill — A, B and D are all `writing` —
 * so those three parts received the same questions, and the paper went out with
 * 95 items instead of 58, only 45 of them distinct.
 *
 * Its own file rather than a constant inside db.js so that scripts/test-paper.mjs
 * can read the list without importing db.js: importing db.js runs the seed, and
 * a suite that repairs the paper before measuring it can never see the paper
 * break.
 */
const SEED_TESTS = [
  { id: 'vpet-b1-01', family: 'vpet', title: 'VPET four skills B1', level: 'B1', status: 'published' }
];

module.exports = { SEED_TESTS };
