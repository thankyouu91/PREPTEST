/**
 * The deterministic half of marking — quantities counted from a response.
 *
 * ---------------------------------------------------------------------------
 * WHAT THESE ARE FOR
 *
 * Not for scoring. `data/rubrics.js` names them per criterion in `measurable`
 * and says why: they are what lets the platform "flag a fluency band of 5
 * sitting next to a measured silence ratio of 70%". A band is a judgement and
 * stays one; a metric is a fact, and a judgement that contradicts a fact about
 * the same response is a mark somebody should look at before it is published.
 *
 * `checkBands()` at the bottom is that comparison. Everything above it exists
 * to feed it.
 *
 * ---------------------------------------------------------------------------
 * WHAT IS HERE, AND WHAT IS HONESTLY NOT
 *
 * `rubrics.js` declares seventeen measurable quantities. Thirteen are computed
 * here or alongside; `MISSING` below names the four that are not, and what each
 * would take.
 *
 * The two lexical metrics — `spellingErrors` and `cefrBandCoverage` — are built
 * on `data/lexicon.js`, two open word lists committed under `data/lexicon/`.
 * They were absent until 2026-08-19 for want of a dictionary; the platform's own
 * teaching word lists hold about a hundred entries between them, and a spell
 * checker built on those would have marked nearly every correct word wrong.
 *
 * The four that remain need the candidate's audio decoded to a waveform.
 * Recordings arrive as opaque webm/opus blobs from MediaRecorder and this
 * application has one npm dependency, so that is a real decision about a real
 * dependency rather than something to slip in.
 * ---------------------------------------------------------------------------
 */
'use strict';

const rubrics = require('./data/rubrics');
const lexicon = require('./data/lexicon');

/**
 * Hesitation markers — sounds that are never anything but hesitation.
 *
 * This is why `fillerCount` is computable while `spellingErrors` is not: the
 * set of hesitation sounds is short and closed, and the set of correctly spelled
 * English words is not.
 *
 * ---------------------------------------------------------------------------
 * WHY "like", "well", "so" AND "you know" ARE NOT ON THIS LIST
 *
 * They are the commonest fillers in speech and they are also ordinary words.
 * A first version of this list included them and immediately charged two
 * fillers against "I would **like** to raise something about the delivery,
 * **so** I could not use the parts" — a sentence with no hesitation in it at
 * all. Telling the filler "like" from the verb "like" needs the grammar of the
 * sentence, not a word list.
 *
 * So the count is of hesitation sounds only. That makes it an undercount, which
 * is the safe direction for what it is used for: `checkBands()` fires when a
 * fluent band sits beside heavy filler use, and an undercount can only miss a
 * flag, never invent one. A metric that manufactures evidence against a
 * candidate is worse than one that occasionally stays quiet.
 */
const FILLERS_MULTI = [];
const FILLERS_ONE = new Set(['um', 'uh', 'uhm', 'er', 'erm', 'ah', 'eh', 'hmm', 'mmm', 'mm']);

/* Quantities `rubrics.js` names but nothing produces, with the reason. Exported
   so docs and tests read the same list rather than two copies that drift. */
const MISSING = {
  silenceRatio: 'Needs the recording decoded to a waveform.',
  pauseCount: 'Needs the recording decoded to a waveform.',
  meanLengthOfRun: 'Needs pause boundaries, so it needs the waveform too.',
  snrDb: 'Needs the recording decoded to a waveform.'
};

const words = text => String(text == null ? '' : text)
  .toLowerCase()
  .replace(/[^a-z0-9\s'’-]/g, ' ')
  .split(/\s+/)
  .filter(Boolean);

/**
 * Count what can be counted in one response.
 *
 * `text` is the written answer, or the transcript for a spoken one — the
 * marker returns a verbatim transcript precisely so spoken responses have text
 * to measure. `durationMs` comes from the recording where there is one.
 *
 * Every value is either a number or null. Null means "not measurable here",
 * never zero: a response with no recording has no articulation rate, and
 * reporting that as 0 words per second would be a measurement nobody made.
 */
function measure(text, durationMs) {
  const raw = String(text == null ? '' : text);
  const w = words(raw);
  const ms = Number.isFinite(Number(durationMs)) && Number(durationMs) > 0 ? Number(durationMs) : null;

  /* Fillers: multi-word first, then singles over what is left, so "you know"
     is not also counted as the filler "you". */
  let hay = ' ' + w.join(' ') + ' ';
  let fillerCount = 0;
  for (const f of FILLERS_MULTI) {
    const parts = hay.split(' ' + f + ' ');
    fillerCount += parts.length - 1;
    hay = parts.join(' ');
  }
  fillerCount += hay.trim().split(/\s+/).filter(x => FILLERS_ONE.has(x)).length;

  const types = new Set(w).size;

  /* Spelling, counted conservatively.
     ------------------------------------------------------------------
     Over-counting here invents evidence against a candidate, so every
     doubtful case is resolved in their favour: regular inflections,
     contractions, hyphenated compounds, numbers and both spelling
     varieties all pass. A capitalised word mid-sentence is skipped
     entirely — it is a name far more often than a misspelling, and no
     word list holds the world's names.

     The cost is real misses. "occured" reduces to "occur" and passes.
     That is the direction to be wrong in. */
  const tokens = raw.split(/\s+/).filter(Boolean);
  const misspelt = [];
  tokens.forEach((tok, i) => {
    const bare = tok.replace(/^[^A-Za-z'’-]+|[^A-Za-z'’-]+$/g, '');
    if (!bare || bare.length < 2) return;
    /* Sentence-initial capitals are ordinary words; capitals elsewhere are
       usually names. The first token of the response counts as initial too. */
    const initial = i === 0 || /[.!?]["'’)]?$/.test(tokens[i - 1] || '');
    if (!initial && /^[A-Z]/.test(bare)) return;
    if (!lexicon.isWord(bare)) misspelt.push(bare.toLowerCase());
  });

  /* Vocabulary reach, by frequency band (docs/LEARNING.md §1.4).
     Counted over DISTINCT words: repeating "the" forty times says nothing
     about range, which is what the `vocabulary` criterion asks about. */
  const distinct = [...new Set(w)];
  const byBand = {};
  let banded = 0;
  for (const word of distinct) {
    const b = lexicon.bandOf(word);
    if (!b) continue;
    byBand[b] = (byBand[b] || 0) + 1;
    banded++;
  }
  const ORDER = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2'];
  const share = {};
  ORDER.forEach(b => { share[b] = banded ? Math.round(((byBand[b] || 0) / banded) * 1000) / 1000 : 0; });

  return {
    /* How many words were not recognised, and which — the list is what makes
       the number checkable by a person rather than taken on trust. */
    spellingErrors: misspelt.length,
    spellingFlagged: misspelt,
    /* Distribution of distinct words across frequency bands, and how far up
       the candidate reached at all. `null` when there is nothing to measure. */
    cefrBandCoverage: banded ? share : null,
    cefrReach: banded ? [...ORDER].reverse().find(b => (byBand[b] || 0) > 0) || null : null,
    wordCount: w.length,
    /* Blank-line separated blocks. An email written as one wall of text and one
       written with a greeting, body and sign-off differ here, which is what the
       `organisation` criterion is looking at. */
    paragraphCount: raw.trim() ? raw.trim().split(/\n\s*\n/).filter(p => p.trim()).length : 0,
    /* Distinct words over total. Length-sensitive — a long answer repeats
       function words — so it is only comparable between responses of similar
       length, and `checkBands()` only uses it above a floor. */
    typeTokenRatio: w.length ? Math.round((types / w.length) * 1000) / 1000 : null,
    fillerCount,
    durationMs: ms,
    /* Words per minute of speech. Null without a recording. */
    articulationRate: ms ? Math.round((w.length / (ms / 60000)) * 10) / 10 : null,
    /* Named so a reader of the report knows the absence is deliberate. */
    notMeasured: Object.keys(MISSING)
  };
}

/**
 * Bands that disagree with what was counted from the same response.
 *
 * ---------------------------------------------------------------------------
 * WHY THE THRESHOLDS ARE SET WHERE THEY ARE
 *
 * These are not scoring rules and they must not become them. Each one is set
 * where a band and a measurement cannot both be right — far enough apart that
 * the flag means "look at this", not "this is a bit generous". A checker that
 * fires on ordinary marking is one a reviewer learns to dismiss, and then it is
 * worth less than nothing, because it looks like oversight while providing
 * none.
 *
 * So every rule below needs a floor on the evidence as well: a five-word answer
 * has a type-token ratio of 1.0 and tells you nothing about vocabulary range.
 *
 * @returns {Array<{criterion, band, metric, value, why}>} empty when nothing disagrees
 */
function checkBands(part, bands, metrics) {
  const rubric = rubrics.PART_RUBRICS[part];
  if (!rubric || !bands || !metrics) return [];
  const out = [];
  const has = name => name in rubric.criteria && Number.isFinite(Number(bands[name]));
  const flag = (criterion, metric, value, why) =>
    out.push({ criterion, band: Number(bands[criterion]), metric, value, why });

  /* Fluency at or above "speaks at length with only occasional hesitation",
     next to speech slower than about 60 words a minute. Conversational English
     runs 120-160; 60 is halting by any measure. */
  if (has('fluency') && metrics.articulationRate != null && metrics.wordCount >= 20) {
    if (bands.fluency >= 4 && metrics.articulationRate < 60) {
      flag('fluency', 'articulationRate', metrics.articulationRate,
        'Band 4 and above describes speech at length with only occasional hesitation, '
        + 'but the measured rate is under 60 words a minute.');
    }
  }

  /* Fluency high next to heavy filler use. Band 2 is the one that names
     "heavy reliance on fillers", so band 4+ with fillers above a tenth of every
     word said is the two descriptions contradicting each other. */
  if (has('fluency') && metrics.wordCount >= 30 && bands.fluency >= 4
      && metrics.fillerCount / metrics.wordCount > 0.10) {
    flag('fluency', 'fillerCount', metrics.fillerCount,
      'Band 4 and above is fluent speech, but more than a tenth of the words counted are fillers, '
      + 'which is what band 2 describes.');
  }

  /* Vocabulary range against distinct-word ratio, only on answers long enough
     for the ratio to mean anything. Band 1 is "repeats the same few words". */
  if (has('vocabulary') && metrics.typeTokenRatio != null && metrics.wordCount >= 60
      && bands.vocabulary >= 4 && metrics.typeTokenRatio < 0.35) {
    flag('vocabulary', 'typeTokenRatio', metrics.typeTokenRatio,
      'Band 4 and above describes range, but fewer than 35% of the words used are distinct.');
  }

  /* Organisation on a piece written as one undivided block. Band 0 is
     literally "single undivided block, no order", so band 4+ on one is a
     straight contradiction — but only once the answer is long enough that
     paragraphing was a choice. */
  if (has('organisation') && metrics.wordCount >= 100
      && bands.organisation >= 4 && metrics.paragraphCount <= 1) {
    flag('organisation', 'paragraphCount', metrics.paragraphCount,
      'Band 4 and above describes deliberate structure, but the response is a single '
      + 'undivided block, which is what band 0 describes.');
  }

  /* Content coverage against the count the marker returned for itself. Exact
     rather than heuristic: the band and the count come from the same response,
     and rubrics.js states each content band as a percentage of key points. */
  if (has('content') && Number.isFinite(Number(metrics.keyPointsCovered))
      && Number(metrics.keyPointsTotal) > 0) {
    const share = Number(metrics.keyPointsCovered) / Number(metrics.keyPointsTotal);
    const should = rubrics.bandForMeasure('content', share);
    if (should != null && Math.abs(should - Number(bands.content)) >= 2) {
      flag('content', 'keyPointsCovered', metrics.keyPointsCovered,
        `Covering ${metrics.keyPointsCovered} of ${metrics.keyPointsTotal} key points is band ${should} `
        + `by the rubric's own percentages, but band ${bands.content} was given.`);
    }
  }

  /* Mechanics against unrecognised words. Band 4 and above on a piece with
     errors in more than a twentieth of its words is the band and the page
     disagreeing. The count is deliberately an undercount (see `measure()`), so
     reaching this threshold takes real, repeated misspelling. */
  if (has('mechanics') && metrics.wordCount >= 50
      && bands.mechanics >= 4 && metrics.spellingErrors / metrics.wordCount > 0.05) {
    flag('mechanics', 'spellingErrors', metrics.spellingErrors,
      `Band 4 and above describes control of surface accuracy, but ${metrics.spellingErrors} words `
      + `of ${metrics.wordCount} were not recognised`
      + (metrics.spellingFlagged && metrics.spellingFlagged.length
        ? ` (${metrics.spellingFlagged.slice(0, 5).join(', ')})` : '') + '.');
  }

  /* Vocabulary range against how far up the frequency bands the candidate
     actually reached. Band 5 is "precise and wide"; an answer of any length
     that never leaves the commonest 1,800 words has not shown that. */
  if (has('vocabulary') && metrics.wordCount >= 60 && bands.vocabulary >= 5
      && metrics.cefrReach && ['A1', 'A2'].includes(metrics.cefrReach)) {
    flag('vocabulary', 'cefrReach', metrics.cefrReach,
      'Band 5 describes precise and wide vocabulary, but every distinct word used falls in '
      + 'the commonest 1,800 of English.');
  }

  /* Task fulfilment on an answer far shorter than the prompt asked for. Not a
     length rule — docs/MARKING.md §6 forbids rewarding length — but a task
     asking for 150 words and answered in 40 has almost certainly left required
     elements out, which is what `task` marks. */
  if (has('task') && Number(metrics.wordsAsked) > 0 && metrics.wordCount > 0
      && bands.task >= 4 && metrics.wordCount < Number(metrics.wordsAsked) * 0.4) {
    flag('task', 'wordCount', metrics.wordCount,
      `Band 4 and above means every required element is present, but the response is `
      + `${metrics.wordCount} words against about ${metrics.wordsAsked} asked for.`);
  }

  return out;
}

module.exports = { measure, checkBands, MISSING, FILLERS_MULTI, FILLERS_ONE };
