/**
 * The rubric: criteria, the rules that keep a mark honest, and the free
 * diagnostics that need no marker at all.
 *
 * `docs/SCORING.md` §2.3 lays out three tiers for Writing and Speaking — things
 * a machine can measure, a human with a rubric, and a marking service. This file
 * is tier 1 in full, plus the *shape* tiers 2 and 3 have to fill in, plus the
 * arithmetic that turns criterion scores into one number.
 *
 * ## Strict means accurate, not stingy
 *
 * The owner asked for a rubric that is "thật sát và khắt khe" so learners can
 * recognise their real level. That is not the same as marking low, and the
 * difference matters: a rubric that simply subtracts a band from everyone is
 * just as uninformative as one that flatters, and it is worse, because it also
 * makes people give up. Four rules do the work instead, and each of them is
 * about being *right*:
 *
 *   1. **The weakest criterion caps the whole.** A piece with C1 vocabulary and
 *      A2 grammar is not a B2 piece; in a real workplace the grammar is what
 *      the reader trips on. So the aggregate may sit at most half a band above
 *      the lowest criterion. This is a HOUSE RULE, stated as one — VPET
 *      publishes no such rule and this file must not pretend otherwise.
 *
 *   2. **Length is a gate, not a criterion.** Part D asks for at least 100
 *      words. Something well under that has not attempted the task, whatever
 *      its sentences are like, and the real exam treats it that way. Capped,
 *      and told plainly why.
 *
 *   3. **Every criterion points at evidence, and the evidence is CHECKED.** A
 *      mark a learner cannot trace to their own words teaches nothing. And
 *      because the tier-3 marker is a language model, a quotation it offers is
 *      not taken on trust: `verifyEvidence` looks for it in the candidate's
 *      actual text and drops it when it is not there. A fabricated quotation is
 *      worse than none.
 *
 *   4. **A mark records which rubric produced it.** Criteria will change.
 *      Re-scoring history when they do would erase the learner's own record of
 *      getting better, so every stored score carries RUBRIC_VERSION and old
 *      marks keep the version they were made under.
 *
 * ## What is deliberately NOT here
 *
 * Pronunciation and fluency. The speaking parts are marked from a transcript,
 * so nobody has heard the candidate; criteria about how they sounded would be
 * invented. `server/ai-marking.js` already says this to the model and to the
 * candidate, and this file does not quietly add them back.
 */
'use strict';

/** Bump when a criterion is added, removed, or its meaning changes. Stored with
    every score so old marks stay interpretable. */
const RUBRIC_VERSION = '2026-08-vpet-1';

/**
 * The criteria, per part.
 *
 * Only the parts that genuinely have several dimensions get several. Part H is
 * "say this sentence back": there is one thing to measure, and splitting it into
 * four to look thorough would be theatre. Part G is "is the answer right".
 * Inventing criteria for those would produce four numbers that all move
 * together, which tells a learner nothing they did not already know.
 */
const CRITERIA = {
  B: [
    { key: 'meaning', en: 'Meaning kept', vi: 'Giữ được ý',
      about: 'How much of the passage\'s meaning survives. Original wording is neither required nor rewarded; missing whole ideas is what costs marks.' },
    { key: 'accuracy', en: 'Grammar and spelling', vi: 'Ngữ pháp và chính tả',
      about: 'Sentence structure, verb forms, articles, spelling.' },
    { key: 'organisation', en: 'Order and flow', vi: 'Sắp xếp và mạch văn',
      about: 'Whether the ideas come in an order a reader can follow.' }
  ],
  D: [
    { key: 'task', en: 'Task completion', vi: 'Hoàn thành yêu cầu',
      about: 'Whether EVERY point the situation asks for is addressed. Being polite is not enough if a requested point is missing.' },
    { key: 'register', en: 'Tone for the reader', vi: 'Giọng văn phù hợp',
      about: 'Whether the tone suits this recipient and a workplace.' },
    { key: 'organisation', en: 'Organisation', vi: 'Bố cục',
      about: 'Opening, body, closing; one idea per paragraph; linking that helps rather than decorates.' },
    { key: 'accuracy', en: 'Grammar and spelling', vi: 'Ngữ pháp và chính tả',
      about: 'Sentence structure, verb forms, articles, spelling.' }
  ],
  I: [
    { key: 'task', en: 'Dealing with the situation', vi: 'Xử lý được tình huống',
      about: 'Whether every move the situation asks for actually happens.' },
    { key: 'range', en: 'Range of language', vi: 'Vốn ngôn ngữ',
      about: 'Whether the vocabulary and structures stretch beyond the safest possible choices.' },
    { key: 'accuracy', en: 'Accuracy', vi: 'Độ chính xác',
      about: 'Grammar and word choice, judged from the transcript.' },
    { key: 'register', en: 'Register', vi: 'Mức trang trọng',
      about: 'Whether the level of formality fits who is being spoken to.' }
  ],
  J: [
    { key: 'events', en: 'Events kept', vi: 'Giữ được sự việc',
      about: 'How many of the story\'s events survive the retelling.' },
    { key: 'sequence', en: 'Order of events', vi: 'Trình tự',
      about: 'Whether they come in the right order.' },
    { key: 'point', en: 'The point of it', vi: 'Ý chính',
      about: 'Whether the point of the story comes across, not just its parts.' }
  ]
};

/**
 * The published length floor, where the exam publishes one.
 *
 * Part D's 100 words is from the official guide. Part B has no published floor —
 * the passage varies — so the gate there is relative to the passage, handled by
 * the caller, and this table stays honest about what is published.
 */
const MIN_WORDS = { D: 100 };

/** Below this fraction of the floor, the task has not been attempted. */
const UNDER_LENGTH_FRACTION = 0.6;

/** And that is what it is worth, whatever the sentences look like. */
const UNDER_LENGTH_CAP = 4;

/** The aggregate may sit at most this far above the weakest criterion. */
const WEAKEST_LINK_HEADROOM = 0.5;

/** The shortest quotation that can count as evidence. One word matches anything. */
const MIN_EVIDENCE_WORDS = 3;

const criteriaFor = part => CRITERIA[part] || [];
const half = n => Math.round(n * 2) / 2;

/* ----------------------------- Tier 1: measuring ----------------------------- */

/** Words, the way a person counts them: runs of letters, digits and apostrophes. */
function words(text) {
  return String(text || '').toLowerCase().match(/[\p{L}\p{N}][\p{L}\p{N}'’-]*/gu) || [];
}

/** Sentences, roughly. Good enough to spot "one 90-word sentence" and "all six
    words long", which is all this is for. */
function sentences(text) {
  return String(text || '').split(/[.!?]+[\s"'”’)\]]*/u).map(s => s.trim()).filter(Boolean);
}

/**
 * What can be measured without a marker, and without an opinion.
 *
 * These are NOT a score and must never be shown as one — `docs/SCORING.md` §2.3
 * is explicit, and so is the result screen. A high type-token ratio can mean a
 * rich vocabulary or a candidate who never repeats a noun they should have; a
 * long mean sentence can mean control or a run-on. They are prompts to look, not
 * verdicts.
 *
 * `linking` is the list to count against — the platform already has 123 of them
 * in `linking_words`, so the caller passes them in rather than this file keeping
 * a second copy that drifts.
 */
function diagnostics(text, opts) {
  const o = opts || {};
  const w = words(text);
  const s = sentences(text);
  const distinct = new Set(w);
  const lens = s.map(x => words(x).length).filter(n => n > 0);

  let linkingHits = 0;
  if (Array.isArray(o.linking) && o.linking.length) {
    const hay = ' ' + w.join(' ') + ' ';
    for (const phrase of o.linking) {
      const p = String(phrase || '').toLowerCase().trim();
      if (!p) continue;
      let from = 0, at;
      while ((at = hay.indexOf(' ' + p + ' ', from)) !== -1) { linkingHits++; from = at + 1; }
    }
  }

  /* Which content word is leaned on hardest. Function words are excluded, or
     this always answers "the". */
  const STOP = new Set(['the', 'a', 'an', 'and', 'or', 'but', 'to', 'of', 'in', 'on', 'at',
    'is', 'are', 'was', 'were', 'be', 'been', 'i', 'you', 'he', 'she', 'it', 'we', 'they',
    'this', 'that', 'for', 'with', 'as', 'my', 'your', 'have', 'has', 'had', 'do', 'does', 'not']);
  const counts = new Map();
  for (const t of w) if (!STOP.has(t)) counts.set(t, (counts.get(t) || 0) + 1);
  let topWord = null, topCount = 0;
  for (const [t, n] of counts) if (n > topCount) { topWord = t; topCount = n; }

  return {
    words: w.length,
    sentences: s.length,
    distinctWords: distinct.size,
    /* Only meaningful once there is something to measure. Below ~30 words the
       ratio is dominated by length, not by variety, so it is withheld rather
       than reported as a flattering 0.95. */
    typeTokenRatio: w.length >= 30 ? Number((distinct.size / w.length).toFixed(3)) : null,
    meanSentenceWords: lens.length ? Number((w.length / lens.length).toFixed(1)) : 0,
    longestSentenceWords: lens.length ? Math.max(...lens) : 0,
    linkingPer100: w.length ? Number((linkingHits / w.length * 100).toFixed(1)) : 0,
    mostRepeatedWord: topCount >= 3 ? topWord : null,
    mostRepeatedCount: topCount >= 3 ? topCount : 0
  };
}

/* --------------------------- Evidence, actually checked --------------------------- */

/** Case, punctuation and spacing all vary between a quotation and its source. */
const flatten = t => String(t || '').toLowerCase()
  .replace(/[^\p{L}\p{N}\s]/gu, ' ').replace(/\s+/gu, ' ').trim();

/**
 * Does this quotation really occur in what the candidate wrote?
 *
 * A language model asked for evidence will sometimes produce a plausible
 * sentence that is not in the text — and a fabricated quotation is worse than no
 * quotation, because it looks exactly like proof. So nothing is displayed until
 * it has been found in the source.
 *
 * Short quotations are refused outright: "the" occurs in almost everything, and
 * a three-word floor is the point below which a match stops being evidence of
 * anything.
 */
function verifyEvidence(quote, source) {
  const q = flatten(quote);
  if (!q || q.split(' ').length < MIN_EVIDENCE_WORDS) return null;
  const hay = flatten(source);
  if (!hay) return null;
  return hay.includes(q) ? String(quote).trim().slice(0, 400) : null;
}

/* ------------------------------ Putting it together ------------------------------ */

/**
 * One item's criterion scores → one mark, with every cap that fired named.
 *
 * `criteria` is `{ key: { score, evidence?, comment? } }`. Unknown keys are
 * ignored and missing ones are simply absent — a marker that returns three of
 * four criteria produces a mark from three, rather than a zero for the fourth,
 * because "not assessed" and "assessed as nothing" are different claims.
 *
 * Returns `null` when there is nothing usable, which everywhere in this codebase
 * means "not marked" and never means zero.
 */
function combine(part, criteria, opts) {
  const o = opts || {};
  const defs = criteriaFor(part);
  const used = [];

  for (const def of defs) {
    const got = criteria && criteria[def.key];
    if (!got) continue;
    /* Not `Number()`: null, '', false and [] all coerce to 0, and 0 is a real
       score. `{"score": null}` is how a model says "I could not assess this",
       and reading it as zero dragged the whole item down through the
       weakest-link rule below — one absent field cost a measured 8 an item. */
    const n = typeof got.score === 'number' || (typeof got.score === 'string' && got.score.trim())
      ? Number(got.score) : NaN;
    if (!Number.isFinite(n) || n < 0 || n > 10) continue;
    used.push({
      key: def.key, en: def.en, vi: def.vi, score: half(n),
      evidence: verifyEvidence(got.evidence, o.answer),
      /* Said out loud rather than left as a silent absence: "the marker quoted
         something you did not write" is information the learner should have. */
      evidenceRejected: !!(got.evidence && !verifyEvidence(got.evidence, o.answer)),
      comment: String(got.comment || '').trim().slice(0, 300) || null
    });
  }

  /* Parts with no criteria of their own — G and H — carry a single score, and
     the caps below still apply to it. */
  if (!used.length) {
    const single = Number(o.fallbackScore);
    if (!Number.isFinite(single) || single < 0 || single > 10) return null;
    return applyCaps(part, half(single), [], o);
  }

  const mean = used.reduce((s, c) => s + c.score, 0) / used.length;
  return applyCaps(part, mean, used, o);
}

/** The two caps, applied in the order that makes the reason legible. */
function applyCaps(part, base, used, o) {
  const caps = [];
  let score = base;

  /* Rule 1: the weakest criterion. Only where there is more than one — a single
     score cannot be more than half a band above itself. */
  if (used.length > 1) {
    const weakest = Math.min(...used.map(c => c.score));
    const ceiling = weakest + WEAKEST_LINK_HEADROOM;
    if (score > ceiling) {
      const worst = used.find(c => c.score === weakest);
      caps.push({
        rule: 'weakest-criterion', from: half(score), to: half(ceiling),
        en: 'Held down by "' + worst.en + '" at ' + weakest.toFixed(1)
          + '. A piece is only as usable as its weakest part.',
        vi: 'Bị kéo xuống bởi "' + worst.vi + '" ở mức ' + weakest.toFixed(1)
          + '. Một bài chỉ dùng được ở mức phần yếu nhất của nó.'
      });
      score = ceiling;
    }
  }

  /* Rule 2: nothing was handed in.
     This has to come BEFORE the length rule and it has to be a floor of zero,
     not a cap. Rule 3 below caps a short answer at 4 and its own wording says
     "well under the length is not an attempt at the task" — and then awarded 4
     for it. An empty answer went in and 4 out of 10 came out.

     The two callers that mark real work both happen to short-circuit a blank
     to zero before reaching here, so this was not scoring live papers. That is
     not a defence: combine() is the function that DECIDES a mark, and it will
     hand out 4 for nothing the first time a caller forgets. The rule belongs
     where the decision is.

     Applied to every part, including those with no word floor: no words is no
     words whether or not a minimum was set. */
  if (!words(o.answer).length) {
    if (score > 0) {
      caps.push({
        rule: 'no-answer', from: half(score), to: 0,
        en: 'Nothing was handed in for this item, so there is nothing to mark.',
        vi: 'Không có bài nộp cho câu này nên không có gì để chấm.'
      });
    }
    return {
      score: 0, beforeCaps: half(base), criteria: used, caps,
      version: RUBRIC_VERSION
    };
  }

  /* Rule 3: length. Measured, not judged — so it applies whether or not a
     marker ever ran. A genuine but short attempt, unlike the case above. */
  const floor = o.minWords || MIN_WORDS[part];
  if (floor) {
    const n = words(o.answer).length;
    if (n < floor * UNDER_LENGTH_FRACTION && score > UNDER_LENGTH_CAP) {
      caps.push({
        rule: 'under-length', from: half(score), to: UNDER_LENGTH_CAP,
        en: 'Only ' + n + ' words against a required ' + floor
          + '. Well under the length is not an attempt at the task, whatever the sentences are like.',
        vi: 'Chỉ ' + n + ' từ so với yêu cầu ' + floor
          + '. Quá ngắn so với yêu cầu thì chưa tính là đã làm bài, dù câu cú có tốt đến đâu.'
      });
      score = UNDER_LENGTH_CAP;
    }
  }

  return {
    score: half(score),
    beforeCaps: half(base),
    criteria: used,
    caps,
    version: RUBRIC_VERSION
  };
}

module.exports = {
  RUBRIC_VERSION, CRITERIA, MIN_WORDS,
  UNDER_LENGTH_FRACTION, UNDER_LENGTH_CAP, WEAKEST_LINK_HEADROOM, MIN_EVIDENCE_WORDS,
  criteriaFor, combine, applyCaps, diagnostics, verifyEvidence, words, sentences, half
};
