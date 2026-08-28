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
 *   2b. **So is copying the stimulus back.** Part B hands the candidate a
 *      passage and asks for it again in their own words; an answer that is the
 *      passage word for word is three perfect criterion scores and none of the
 *      task. Measured, not judged — see COPY_PARTS below for why that
 *      distinction is the whole point, and which parts it does NOT apply to.
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
/* Bumped when G and H gained criteria of their own and the length cap stopped
   being a cliff. Stored marks carry this, so a report can still say which rules
   produced a number from before the change rather than implying the new ones.

   -3 adds the copied-source cap. Marks made under -2 keep it: a paper sat before
   the rule existed was sat under the rules it was told about, and quietly
   re-scoring it downward months later is the one thing a mark must never do. */
const RUBRIC_VERSION = '2026-08-vpet-3';

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
  /* G and H had no criteria at all, and between them they are 16 of the paper's
     58 items — including 10 of the 15 that make up Speaking. combine() fell
     through to `fallbackScore`, so for those items the model's own headline
     number WAS the mark: nothing cross-checked it, nothing was written to
     rubric_scores, and the candidate's report showed a score with no working
     under it. Two thirds of a Speaking mark arrived unexplained.

     Both parts are genuinely narrow — that part was right — so these say what
     each is narrow ABOUT rather than inventing dimensions to fill a table. The
     wording tracks each part's rubric text in server/ai-marking.js; if one
     changes, the other has to. */
  G: [
    { key: 'correct', en: 'Right answer', vi: 'Trả lời đúng',
      about: 'Whether the answer is right. A correct short phrase is a full mark and is not '
        + 'marked down for being short; grammar matters only where it changes the meaning.' }
  ],
  H: [
    { key: 'content', en: 'How much came back', vi: 'Giữ được bao nhiêu',
      about: 'How much of the sentence is reproduced.' },
    { key: 'structure', en: 'Structure kept', vi: 'Giữ được cấu trúc',
      about: 'Whether the sentence\'s word order and grammar survive the repetition.' }
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
 * What a number on the ten-point scale MEANS.
 *
 * Every criterion above says what it is about. None of them said what a 7 is,
 * and a scale with no anchors is not a scale — it is a marker's mood. That is
 * measurable in the product: the same pasted passage came back at 10/10 on one
 * run and 1/10 on another, and both runs had been given the same one-sentence
 * description of "Meaning kept" and nothing else to hang a number on.
 *
 * One ladder, shared by every criterion, rather than a private table for each.
 * Fifteen criteria × six bands is ninety sentences, and nobody would ever check
 * eighty-five of them; the honest version is a ladder that is genuinely general
 * and a per-criterion `about` that says what is being climbed. The rungs are
 * written from the READER's side — how much work the person on the other end
 * has to do — because that is the same place the weakest-link rule argues from,
 * and a scale that argues from somewhere else would pull against it.
 *
 * Six rungs, not eleven. Odd numbers and halves are for a marker who wants to
 * sit between two rungs, which is a real thing to want; naming all eleven would
 * only be pretending the gaps had been defined too.
 */
const BANDS = [
  { at: 10, en: 'Fully met. The reader has to do no work at all on this.',
    vi: 'Đạt trọn vẹn. Người đọc/người nghe không phải bù đắp gì.' },
  { at: 8, en: 'Met. A few things are not quite right, but none of them stops the reader.',
    vi: 'Đạt. Có vài chỗ chưa chuẩn nhưng không làm người đọc phải dừng lại.' },
  { at: 6, en: 'Mostly met. The reader gets there, but has to work out a place or two.',
    vi: 'Đạt phần lớn. Người đọc vẫn hiểu, nhưng phải tự đoán một hai chỗ.' },
  { at: 4, en: 'Partly met. The reader has to re-read, or a whole piece of what was asked is missing.',
    vi: 'Đạt một phần. Người đọc phải đọc lại, hoặc thiếu hẳn một phần yêu cầu.' },
  { at: 2, en: 'Barely. There are usable fragments and not much else.',
    vi: 'Gần như chưa đạt. Chỉ có vài mảnh dùng được.' },
  { at: 0, en: 'Nothing here belongs to this criterion.',
    vi: 'Không có gì thuộc tiêu chí này.' }
];

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

/**
 * Between "not an attempt" and the full requirement, the ceiling rises with the
 * length instead of jumping.
 *
 * There was a forty-word hole here, and it let a candidate score full marks on
 * a task they had done three fifths of. The gate fired below 60 words on a
 * 100-word requirement and did nothing at all above it, while the marker was
 * told in the same prompt — two lines apart — both "an email under 100 words
 * has not met the task" AND "length is checked separately and enforced without
 * you, so do not also deduct for shortness". So nothing penalised 60 to 99
 * words: measured, a 60-word e-mail with good sentences came out at 9/10
 * against a requirement of 100.
 *
 * The rule now runs from the hard cap at 0.6 of the floor up to no cap at the
 * floor itself, so the two ends meet and a word either side of a threshold is
 * worth about the same. 60 words caps at 4, 80 at 7, 99 at ~9.9 — which rounds
 * to 10, and should: 99 words against 100 is not a shortfall worth marking.
 */
function lengthCeiling(n, floor) {
  if (!floor || n >= floor) return null;
  const at = UNDER_LENGTH_FRACTION * floor;
  if (n < at) return UNDER_LENGTH_CAP;
  /* Linear from (0.6·floor → 4) to (floor → 10). */
  return UNDER_LENGTH_CAP + (10 - UNDER_LENGTH_CAP) * ((n - at) / (floor - at));
}

/**
 * Copying the stimulus back.
 *
 * Part B is "read this passage, watch it disappear, now write it again in your
 * own words". Measured, a candidate who selected the passage during the reading
 * window and pasted it into the answer box scored **10/10 on all three
 * criteria** — and every one of those tens was correct on its own terms. No
 * meaning was lost. The grammar was the passage's own, so it was perfect. The
 * ideas came in the order a reader can follow, because they came in the
 * passage's order. Three right answers to three wrong questions.
 *
 * The same paste marked a second time came back at 1/10. That is the worse
 * half of the fault: the rule was left to the marker's judgement, and a
 * language model's judgement about the same text twice is two judgements. A
 * candidate cannot be told "your mark depends on which run you got".
 *
 * So it is arithmetic, like the length gate, and for the same reason: it holds
 * whether or not a marker ever ran, and it holds the same way every time.
 *
 * ### This is a rule of THIS PLATFORM, and it is a trade
 *
 * Pearson publishes no copy rule, and the real Versant runs in a locked-down
 * browser where there is nothing to paste from. This one runs in a normal tab,
 * where the passage arrives in the sitting payload and the reading window is
 * thirty seconds of selectable text. The platform therefore cannot tell a paste
 * from a genuinely extraordinary memory, and it does not pretend to: what it
 * measures is the overlap, and the cap is stated to the candidate as being
 * about the overlap. A candidate who really did reproduce a passage from memory
 * has been marked down for something they did honestly — that is the cost, and
 * it is worth paying, because the alternative is that practice on this part
 * teaches copying and the day of the real exam is where they find out.
 */
const COPY_PARTS = new Set(['B', 'D']);

/* Not G: the guide tells candidates to answer "using a short phrase", and the
   right phrase is usually the passage's own words — capping that would punish
   the correct answer. Not H: saying the sentence back verbatim IS the task, and
   repeat.js scores it by exactly the overlap this rule penalises. Not J: the
   story was heard, never shown, so there is nothing on screen to copy, and
   close recall of a story is the skill being measured rather than a way round
   it. Not I for the same reason as G — a good answer to "apologise for missing
   the meeting" reuses the situation's own words, and a false cap on honest work
   is a worse failure than missing a rare cheat. */

/** Word runs this long are compared. Short enough to catch a paste, long enough
    that a shared idiom is not one. */
const COPY_SHINGLE = 5;

/** Below this much verbatim overlap nothing fires: a reconstruction of a
    passage read moments ago legitimately reuses its vocabulary and its phrases. */
const COPY_FREE = 0.35;

/** At and above this, the answer is the stimulus with the serial numbers filed
    off, and the ceiling stops falling. */
const COPY_TOTAL = 0.85;

/** What a copy is worth. Below the 4 a short genuine attempt is capped at, on
    purpose: a short attempt is some of the task, and a copy is none of it. */
const COPY_CAP = 3;

/** Below this many words there is nothing to measure, and the length rule and
    the criteria already have the answer covered. */
const COPY_MIN_WORDS = 12;

/** Both texts are cut to this before the quadratic run-finder sees them. */
const COPY_MAX_WORDS = 1500;

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

/* ------------------------- How much was copied, measured ------------------------- */

/**
 * The longest run of words that appears, in this order, in both texts.
 *
 * This is what gets shown to the candidate — "31 words in a row are the
 * passage's own" is a fact they can check against their own screen, where a
 * percentage is a number they have to take on trust. It is the classic
 * longest-common-substring table, one row at a time so nothing large is held.
 */
function longestSharedRun(a, s) {
  if (!a.length || !s.length) return 0;
  let best = 0;
  let prev = new Uint16Array(s.length + 1);
  let cur = new Uint16Array(s.length + 1);
  for (let i = 0; i < a.length; i++) {
    cur.fill(0);
    for (let j = 0; j < s.length; j++) {
      if (a[i] === s[j]) {
        const n = prev[j] + 1;
        cur[j + 1] = n;
        if (n > best) best = n;
      }
    }
    const t = prev; prev = cur; cur = t;
  }
  return best;
}

/**
 * How much of this answer is lifted word for word from the text it was written
 * against. `null` when there is not enough of either to measure honestly.
 *
 * The fraction counts five-word runs rather than single words on purpose. Word
 * overlap alone would flag every faithful reconstruction, because a
 * reconstruction is *supposed* to reuse the passage's nouns; what separates a
 * retelling from a transcription is whether the words come back in the
 * passage's own order, and a five-word run is the shortest span where that
 * stops happening by accident.
 */
function copiedFrom(answer, source) {
  const a = words(answer).slice(0, COPY_MAX_WORDS);
  const s = words(source).slice(0, COPY_MAX_WORDS);
  if (a.length < COPY_MIN_WORDS || s.length < COPY_SHINGLE || a.length < COPY_SHINGLE) return null;

  const seen = new Set();
  for (let i = 0; i + COPY_SHINGLE <= s.length; i++) seen.add(s.slice(i, i + COPY_SHINGLE).join(' '));

  let hits = 0, total = 0;
  for (let i = 0; i + COPY_SHINGLE <= a.length; i++) {
    total++;
    if (seen.has(a.slice(i, i + COPY_SHINGLE).join(' '))) hits++;
  }
  if (!total) return null;
  return { fraction: hits / total, longestRun: longestSharedRun(a, s), words: a.length };
}

/**
 * The ceiling a given overlap allows, or `null` for no ceiling.
 *
 * Continuous, for the reason the length gate is: a step would make one word
 * either side of a threshold worth six marks, and the candidate on the wrong
 * side of it would be right to say the mark was arbitrary.
 */
function copyCeiling(f) {
  if (!(f > COPY_FREE)) return null;
  if (f >= COPY_TOTAL) return COPY_CAP;
  return COPY_CAP + (10 - COPY_CAP) * (1 - (f - COPY_FREE) / (COPY_TOTAL - COPY_FREE));
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
    const ceiling = lengthCeiling(n, floor);
    if (ceiling !== null && score > half(ceiling)) {
      const hard = n < floor * UNDER_LENGTH_FRACTION;
      caps.push({
        rule: 'under-length', from: half(score), to: half(ceiling),
        en: 'Only ' + n + ' words against a required ' + floor + '. '
          + (hard
            ? 'Well under the length is not an attempt at the task, whatever the sentences are like.'
            : 'A short answer cannot score as if the whole task were done, however good its sentences are.'),
        vi: 'Chỉ ' + n + ' từ so với yêu cầu ' + floor + '. '
          + (hard
            ? 'Quá ngắn so với yêu cầu thì chưa tính là đã làm bài, dù câu cú có tốt đến đâu.'
            : 'Bài viết ngắn không thể được điểm như đã làm trọn yêu cầu, dù câu cú có tốt đến đâu.')
      });
      score = half(ceiling);
    }
  }

  /* Rule 4: the answer is the question.
     Measured for the same reason Rule 3 is — a marker asked to judge this
     answered 10 one run and 1 the next, and both times it was answering a
     different question from the one the part asks. The overlap does not vary
     between runs. */
  if (COPY_PARTS.has(part) && o.stimulus) {
    const copied = copiedFrom(o.answer, o.stimulus);
    const ceiling = copied === null ? null : copyCeiling(copied.fraction);
    if (ceiling !== null && score > half(ceiling)) {
      const pct = Math.round(copied.fraction * 100);
      const run = copied.longestRun;
      /* The run is the part a candidate can check for themselves; the
         percentage on its own invites "says who?". */
      const runEn = run >= COPY_SHINGLE
        ? ' The longest stretch taken word for word is ' + run + ' words.' : '';
      const runVi = run >= COPY_SHINGLE
        ? ' Đoạn dài nhất chép nguyên văn là ' + run + ' từ.' : '';
      caps.push({
        rule: 'copied-source', from: half(score), to: half(ceiling),
        en: pct + '% of this answer is word for word from the text you were given.'
          + runEn + ' This part asks you to write it again in your own words, so'
          + ' copying it back cannot score as if you had.',
        vi: pct + '% bài làm này trùng nguyên văn với đoạn đã cho.'
          + runVi + ' Phần này yêu cầu viết lại bằng lời của mình, nên chép lại'
          + ' không thể được điểm như đã làm bài.'
      });
      score = half(ceiling);
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
  RUBRIC_VERSION, CRITERIA, BANDS, MIN_WORDS,
  UNDER_LENGTH_FRACTION, UNDER_LENGTH_CAP, WEAKEST_LINK_HEADROOM, MIN_EVIDENCE_WORDS,
  COPY_PARTS, COPY_SHINGLE, COPY_FREE, COPY_TOTAL, COPY_CAP, COPY_MIN_WORDS,
  criteriaFor, combine, applyCaps, diagnostics, verifyEvidence, words, sentences, half,
  copiedFrom, copyCeiling
};
