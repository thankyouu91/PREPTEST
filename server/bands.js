/**
 * Turning a 0–10 mark into a level a candidate can put on a CV.
 *
 * Split out of server/marking.js because it stopped being one table. Marking
 * knows arithmetic — how many items were right, what fraction that is. This
 * knows what a number MEANS on a particular exam, and that is a different kind
 * of claim: it is about the world, not about the code, and it is the part most
 * likely to be wrong in a way tests cannot catch.
 *
 * ## The bug this exists to fix
 *
 * Every paper got the VSTEP band table — Bậc 3/4/5 → B1/B2/C1 — whatever exam
 * it belonged to. For VEPT that is right: VEPT follows the VSTEP framework
 * (Thông tư 01/2014/TT-BGDĐT) and those are its published bands.
 *
 * For VPET it is wrong twice over. VPET is Pearson's Versant Professional
 * English Test; it does not use VSTEP bands at all, and — the part that
 * actually harmed candidates — **it comes in two levels, and each measures a
 * different stretch of the scale**:
 *
 *     Level 1   GSE 10–58   A1 up to B1+
 *     Level 2   GSE 51–90   B1+ up to C2
 *
 * The platform's papers are Level 1. A candidate who answered everything
 * correctly was told **Bậc 5 / C1** — two whole bands above the highest thing
 * that paper is capable of measuring. A test that tops out at B1+ cannot
 * discover a C1 speaker; it can only discover that they beat it.
 *
 * ## How a mark becomes a level
 *
 * Not by cut-offs I chose. Pearson publishes the GSE↔CEFR alignment, and the
 * repo's own docs/VPET-OFFICIAL-SPEC.md already records each level's GSE span
 * from the Official Guide for Test-Takers. So the 0–10 mark is placed inside
 * the level's own GSE range, and the CEFR level is read off the published
 * table:
 *
 *     gse  = low + (mark / 10) × (high − low)
 *     cefr = the published GSE band that gse falls in
 *
 * That makes the ceiling fall out of the arithmetic rather than being a rule
 * bolted on top: 10/10 on Level 1 is GSE 58, and GSE 58 is the top of B1+.
 *
 * **The linear placement inside the range is this platform's own choice** and
 * Pearson publishes nothing like it — a real Versant score comes from an IRT
 * model over item difficulty, which this platform does not have. The GSE
 * boundaries are theirs; the straight line between them is ours. Said plainly
 * here for the same reason server/rubric.js says it about the weakest-link
 * rule: somebody will read this code and take it for the official method.
 */
'use strict';

/**
 * Pearson's published GSE↔CEFR alignment. The scale runs 10–90.
 *
 * Ordered high to low and read with `find`, so the first match wins. The `+`
 * sublevels are real published subdivisions, not decoration: B1+ at 51–58 is
 * exactly where Level 1 stops, which is the whole reason this table is here at
 * this resolution rather than six coarse bands.
 */
const GSE_CEFR = [
  { min: 85, cefr: 'C2' },
  { min: 76, cefr: 'C1' },
  { min: 67, cefr: 'B2+' },
  { min: 59, cefr: 'B2' },
  { min: 51, cefr: 'B1+' },
  { min: 43, cefr: 'B1' },
  { min: 36, cefr: 'A2+' },
  { min: 30, cefr: 'A2' },
  { min: 22, cefr: 'A1' },
  /* English, like every other label the screens print: the interface is
     authored in English and i18n.js translates whole text nodes, so this one
     is in its dictionary ('dưới A1'). A Vietnamese literal here stayed
     Vietnamese with the language switched to English. */
  { min: 10, cefr: 'below A1' }
];

/**
 * The two VPET papers, and what each can see.
 *
 * From docs/VPET-OFFICIAL-SPEC.md §0, quoting the Official Guide for
 * Test-Takers. The ranges OVERLAP at B1+ (58 / 51) and that is deliberate in
 * the real exam: the two papers are meant to meet, so a candidate near the join
 * gets the same answer from either.
 */
const VPET_LEVELS = {
  1: { gse: [10, 58], from: 'A1', to: 'B1+' },
  2: { gse: [51, 90], from: 'B1+', to: 'C2' }
};

/**
 * Which VPET paper a test is, from the CEFR level it was built at.
 *
 * `tests.level` is what the platform already stores and what the item bank is
 * tagged with, so this reads that rather than adding a column nobody would
 * remember to fill in. B2 and above is the harder paper.
 */
function vpetLevelOf(testLevel) {
  return ['B2', 'B2+', 'C1', 'C2'].includes(String(testLevel || '').toUpperCase()) ? 2 : 1;
}

/**
 * A paper cannot discriminate at its own floor.
 *
 * Level 2 starts at GSE 51, which is the bottom of B1+. A candidate whose mark
 * lands in that lowest band has hit the floor of the instrument: the paper can
 * say "at most B1+", and cannot say whether they are B1+, B1, or A2, because
 * every one of those produces the same near-zero mark on a paper pitched at
 * C-level work. So that band is reported as a ceiling, not a level, with the
 * easier paper named.
 *
 * Expressed as "the lowest band in this level's range" rather than a score
 * threshold, and the first version got that wrong: it cut at 3.5/10, which on
 * Level 2 is GSE 64.7 — throwing away the whole B1+ and lower-B2 stretch the
 * paper measures perfectly well, and jumping a candidate straight from "not
 * measured" to B2.
 *
 * Level 1 needs no equivalent. Its lowest band is "below A1", which is a true
 * and complete answer — there is no easier paper to send anybody to.
 */
function atFloorOf(gse, low) {
  return cefrOfGse(gse) === cefrOfGse(low);
}

/** VEPT: the VSTEP bands, per docs/SCORING.md §1.1. Unchanged and unrelated. */
const VSTEP_BANDS = [
  { min: 8.5, band: 'Bậc 5', cefr: 'C1' },
  { min: 5.5, band: 'Bậc 4', cefr: 'B2' },
  { min: 3.5, band: 'Bậc 3', cefr: 'B1' }
];

const round1 = n => Math.round(n * 10) / 10;

function cefrOfGse(gse) {
  const hit = GSE_CEFR.find(r => gse >= r.min);
  return hit ? hit.cefr : 'below A1';
}

/**
 * The level for a mark, or null when there is nothing to say.
 *
 * `opts.family` picks the scheme; `opts.level` is the CEFR level the paper was
 * built at, which decides WHICH VPET paper this is. Returns a shape the result
 * screen can render without knowing any of this:
 *
 *   { cefr, band?, gse?, vpetLevel?, ceiling?, atCeiling?, belowFloor? }
 */
function bandFor(score, opts) {
  if (score == null) return null;
  const o = opts || {};
  const family = String(o.family || '').toLowerCase();

  if (family !== 'vpet') {
    /* VEPT and anything else on the VSTEP framework. */
    const hit = VSTEP_BANDS.find(b => score >= b.min);
    return hit ? { band: hit.band, cefr: hit.cefr } : { band: null, cefr: null };
  }

  const lvl = vpetLevelOf(o.level);
  const range = VPET_LEVELS[lvl];
  const [low, high] = range.gse;

  const gse = round1(low + (Math.max(0, Math.min(10, score)) / 10) * (high - low));
  const cefr = cefrOfGse(gse);

  if (lvl === 2 && atFloorOf(gse, low)) {
    return {
      cefr: null, band: null, gse, vpetLevel: 2, ceiling: range.to,
      atFloor: true, mostThis: range.from,
      /* Both languages, because the sentence carries a value and i18n.js can
         only translate a text node it can look up whole. The screen picks one
         with PREP.t(); `note` stays English so an older reader still gets a
         sentence rather than nothing. */
      note: 'A Level 2 paper only measures from ' + range.from + ' up, and this result sits '
        + 'at that floor — so all it can say is "no higher than ' + range.from + '". '
        + 'Sit a Level 1 paper to find out exactly where you are.',
      noteVi: 'Đề Cấp 2 chỉ đo được từ ' + range.from + ' trở lên, và kết quả này ở '
        + 'đúng mức sàn đó — nên nó chỉ nói được "không quá ' + range.from + '". '
        + 'Làm đề Cấp 1 để biết chính xác đang ở đâu.'
    };
  }
  return {
    cefr,
    band: null,                       // VPET publishes no "Bậc"; that is VSTEP's
    gse,
    vpetLevel: lvl,
    ceiling: range.to,
    /* So the screen can say "this paper cannot go higher" rather than leaving a
       candidate to wonder why a perfect paper stopped at B1+. */
    atCeiling: cefr === range.to
  };
}

module.exports = { bandFor, vpetLevelOf, cefrOfGse, GSE_CEFR, VPET_LEVELS, VSTEP_BANDS };
