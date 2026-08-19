/**
 * The English lexicon — is this a word, and how common is it.
 *
 * Three files under `lexicon/`, fetched once by `scripts/tai-tu-dien.mjs` and
 * committed. Each ships its licence beside it; both sources require the
 * copyright notice to travel with the data, so do not separate them.
 *
 *   en-words.txt      39,965 common words. SCOWL, en_GB-ise ∪ en_US. "Is this English?"
 *   en-names.txt       9,450 proper nouns from the same source. "Is this a name?"
 *   en-frequency.txt  49,052 words in rank order, OpenSubtitles (MIT). "How common?"
 *
 * ---------------------------------------------------------------------------
 * BOTH SPELLING VARIETIES ARE ACCEPTED, DELIBERATELY
 *
 * The platform writes British English — the voice is en-gb and the bank says
 * "realise", "colour", "centre". A candidate does not. Vietnamese learners meet
 * both varieties, and "color" is not a spelling error; it is American. Counting
 * it as one is the same class of unfairness as marking down an accent, which
 * docs/MARKING.md §6 forbids outright.
 *
 * So this lexicon is the union. The bank staying British is a separate rule,
 * enforced separately by `scripts/kiem-noi-dung.mjs`.
 *
 * ---------------------------------------------------------------------------
 * WHY LEVELS COME FROM FREQUENCY RANK
 *
 * Not a workaround. docs/LEARNING.md §1.4 opens by saying there is no free
 * source that assigns CEFR directly, and then gives the rule the platform uses
 * instead: rank 1–750 → A1, 751–1,800 → A2, 1,801–3,300 → B1, and rarer words
 * higher. `BANDS` below is that rule, continued past 3,300 for the tail.
 *
 * The list is not NGSL, which §1.4 names — NGSL is not mirrored anywhere
 * fetchable. It is a frequency list of the same shape, applied by the same
 * rule. Saying so matters: someone reading "A2" here should know it came from a
 * rank in a subtitle corpus, not from a lexicographer.
 */
'use strict';

const fs = require('node:fs');
const path = require('node:path');

const DIR = path.join(__dirname, 'lexicon');

const read = f => fs.readFileSync(path.join(DIR, f), 'utf8').split('\n').filter(Boolean);

/** Common words — both varieties, no proper nouns. */
const WORDS = new Set(read('en-words.txt'));

/**
 * Proper nouns, kept apart from common words.
 *
 * Spelling and syllabus need opposite answers about "Pete". It is not a
 * misspelling, so `isWord()` accepts it; it is also not a word anyone should be
 * taught as B2 vocabulary, so `scripts/nhap-tu-vung.mjs` skips it. Merging the
 * two put "pete", "belgrade" and "cedric" in a B1-C2 candidate list beside
 * "reasonable" and "negligence".
 *
 * A word that is both a name and an ordinary word — mark, bill, rose — is in
 * WORDS only, because teaching "rose" is perfectly reasonable.
 */
const NAMES = new Set(read('en-names.txt'));

/** word → 1-based frequency rank. Missing means rarer than the list goes. */
const RANK = new Map();
read('en-frequency.txt').forEach((w, i) => { if (!RANK.has(w)) RANK.set(w, i + 1); });

/* docs/LEARNING.md §1.4 rule 1, continued past its last stated threshold by
   rule 3 ("the rarer, the higher"). The first three are the document's own
   numbers and must not be changed here without changing it there. */
const BANDS = [
  { band: 'A1', max: 750 },
  { band: 'A2', max: 1800 },
  { band: 'B1', max: 3300 },
  { band: 'B2', max: 7000 },
  { band: 'C1', max: 15000 },
  { band: 'C2', max: Infinity }
];

/**
 * Common inflections, stripped so a regular form does not read as a misspelling.
 *
 * The word files hold base forms with hunspell affix flags removed, so
 * "walked" is not in them and "walk" is. Without this, ordinary past tense
 * would be counted as a spelling error on every response — which is the
 * failure mode that matters, because over-counting invents evidence against a
 * candidate.
 *
 * Deliberately conservative in the other direction too: every candidate base
 * is checked against the lexicon, so stripping cannot invent a word. "ked" is
 * not rescued by any of these rules.
 */
function bases(w) {
  const out = [w];
  const add = x => { if (x && x.length > 1) out.push(x); };

  if (w.endsWith("'s") || w.endsWith('’s')) add(w.slice(0, -2));         // possessive
  if (w.endsWith('s') && !w.endsWith('ss')) add(w.slice(0, -1));         // plural / 3rd person
  if (w.endsWith('es')) add(w.slice(0, -2));
  if (w.endsWith('ies')) add(w.slice(0, -3) + 'y');
  if (w.endsWith('ed')) { add(w.slice(0, -2)); add(w.slice(0, -1)); }    // walked, liked
  if (w.endsWith('ied')) add(w.slice(0, -3) + 'y');
  if (w.endsWith('ing')) { add(w.slice(0, -3)); add(w.slice(0, -3) + 'e'); }  // walking, liking
  if (w.endsWith('ly')) add(w.slice(0, -2));
  if (w.endsWith('er')) { add(w.slice(0, -2)); add(w.slice(0, -1)); }
  if (w.endsWith('est')) { add(w.slice(0, -3)); add(w.slice(0, -2)); }
  /* Doubled final consonant before a suffix: stopped → stop, running → run. */
  const m = /^(.*?)([bdfglmnprt])\2(ed|ing|er|est)$/.exec(w);
  if (m) add(m[1] + m[2]);
  return out;
}

/** Contractions, which the word files do not carry as single tokens. */
const CONTRACTIONS = new Set([
  "i'm", "i've", "i'd", "i'll", "you're", "you've", "you'd", "you'll",
  "he's", "he'd", "he'll", "she's", "she'd", "she'll", "it's", "it'd", "it'll",
  "we're", "we've", "we'd", "we'll", "they're", "they've", "they'd", "they'll",
  "that's", "that'd", "that'll", "there's", "there'd", "there'll", "here's",
  "what's", "who's", "where's", "when's", "how's", "let's",
  "isn't", "aren't", "wasn't", "weren't", "don't", "doesn't", "didn't",
  "haven't", "hasn't", "hadn't", "won't", "wouldn't", "can't", "cannot",
  "couldn't", "shouldn't", "mustn't", "needn't", "shan't", "ain't", "o'clock"
]);

/**
 * How far up the frequency list a word is accepted as real on rank alone.
 *
 * The spelling list holds hunspell BASE forms; the affix rules that generate
 * irregular inflections were stripped when it was built, so a handful of
 * extremely common forms are missing from it. "is" is one — the twelfth
 * commonest word in English was being counted as a misspelling.
 *
 * The frequency list covers them, because it comes from real usage. But it
 * comes from subtitles, so it also contains misspellings: "wich" sits at
 * 37,528 and "seperate" at 47,930. Both are deep in the tail, while genuine
 * words this check needs to rescue are near the top. 20,000 takes the
 * irregulars and leaves the typos out.
 */
const FREQ_TRUST = 20000;

/** Is this an English word, allowing regular inflection and contraction? */
function isWord(raw) {
  const w = String(raw || '').toLowerCase().replace(/[’]/g, "'").replace(/^['-]+|['-]+$/g, '');
  if (!w) return true;                                   // punctuation only
  if (/\d/.test(w)) return true;                         // numbers are not spelling
  if (w.length === 1) return true;                       // "a", "I", initials
  if (CONTRACTIONS.has(w)) return true;
  /* A hyphenated compound counts when both halves do — "well-known" is not in
     the list, and neither half is a misspelling. */
  if (w.includes('-')) return w.split('-').filter(Boolean).every(isWord);
  return bases(w).some(b => WORDS.has(b) || NAMES.has(b) || (RANK.get(b) || Infinity) <= FREQ_TRUST);
}

/** 1-based frequency rank, or null when rarer than the list reaches. */
function rankOf(raw) {
  const w = String(raw || '').toLowerCase();
  if (RANK.has(w)) return RANK.get(w);
  for (const b of bases(w)) if (RANK.has(b)) return RANK.get(b);
  return null;
}

/**
 * Indicative CEFR band for one word, from its rank.
 *
 * "Indicative" is the operative word — see the header. A word absent from the
 * frequency list is rarer than its 49,000 entries reach, which is C2 territory
 * by rule 3, but only if it is a word at all: `isWord()` decides that.
 */
function bandOf(raw) {
  if (!isWord(raw)) return null;
  const r = rankOf(raw);
  if (r == null) return 'C2';
  return (BANDS.find(b => r <= b.max) || BANDS[BANDS.length - 1]).band;
}

/** Is this a proper noun rather than a common word? */
const isName = raw => NAMES.has(String(raw || '').toLowerCase());

module.exports = {
  WORDS, NAMES, RANK, BANDS, FREQ_TRUST,
  isWord, isName, rankOf, bandOf, bases, CONTRACTIONS
};
