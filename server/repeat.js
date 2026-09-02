/**
 * Marking Part H — Repeat — by comparing words, not by asking a model.
 *
 * The candidate hears one sentence and says it back. Unlike every other spoken
 * part, there IS a right answer: the sentence itself, sitting in the item bank
 * as `say`. Sending that to a language model and asking "how much of it
 * survived?" is paying for an opinion about a question that has an answer.
 *
 * Ten of the paper's 58 items are Part H, and ten of the 26 that were going to
 * a model. Removing them takes ~38% off the marking bill and — more to the
 * point — replaces a judgement with a measurement. A model asked the same
 * question twice can answer differently; this cannot.
 *
 * ## The two numbers, and why they are the two the rubric already names
 *
 * server/rubric.js defines Part H as `content` and `structure`, from its own
 * rubric text: "how much of the sentence is reproduced and whether its
 * structure survives". Those map onto a word-level comparison exactly:
 *
 *   content    how many of the expected words came back at all, order ignored.
 *              A multiset intersection, so saying "the" twice does not earn
 *              credit for a "the" that was only there once.
 *
 *   structure  the longest run of words that appear in BOTH, in order, over
 *              the longer of the two. Dividing by the longer side is what makes
 *              padding cost something: a candidate who recites the sentence and
 *              then keeps talking has not repeated it.
 *
 * Both come back as ordinary criteria, so `rubric.combine()` averages them and
 * applies the weakest-link cap exactly as it would to a model's answer, and the
 * candidate sees the same shape of working on their report.
 *
 * ## What this is fair about, and what it is not
 *
 * Fair: contractions are expanded on both sides, because "I'll" and "I will"
 * are the same utterance and which one comes back is the transcriber's choice,
 * not the candidate's. Numbers are matched across digits and words for the same
 * reason — "at six" and "at 6" is a transcription style, not a mistake.
 *
 * Not fair, and worth being honest about: **the transcriber's accuracy is now
 * the mark.** A model marking a transcript could shrug at a near-miss; this
 * cannot, because it does not know which near-misses are the candidate's and
 * which are the machine's. That is the direct argument for `gpt-transcribe`
 * over the cheapest transcription model — see the note on DEFAULTS in
 * server/ai-marking.js. The note this returns always quotes both sentences, so
 * a learner who was marked down can see precisely what was compared.
 */
'use strict';

/* Written out on both sides before comparing. Which form comes back is the
   transcription service's habit, not something the candidate chose. */
const CONTRACTIONS = [
  ["can't", 'can not'], ["won't", 'will not'], ["shan't", 'shall not'],
  ["n't", ' not'],
  ["'re", ' are'], ["'ve", ' have'], ["'ll", ' will'], ["'d", ' would'],
  ["'m", ' am'], ["it's", 'it is'], ["let's", 'let us'], ["that's", 'that is'],
  ["what's", 'what is'], ["he's", 'he is'], ["she's", 'she is'],
  ["there's", 'there is'], ["who's", 'who is'], ["here's", 'here is']
];

/* And the same contractions with the apostrophe missing, which is a thing
   transcription services do and candidates cannot control. Measured: a
   perfectly correct repetition of "I'll call you back as soon as the meeting
   finishes" scored 8 out of 10 purely because the transcript read "Ill".
 *
 * Only forms that are not also ordinary words. `ill`, `hell`, `were`, `well`
 * and `cant` are all real English, so expanding them would credit a candidate
 * who said something else — and `were`/`well` in particular are common. The
 * cost of leaving those out is that one transcription quirk can still cost a
 * couple of marks; the cost of putting them in is marking a wrong answer
 * right, which is worse. */
const NO_APOSTROPHE = {
  dont: 'do not', doesnt: 'does not', didnt: 'did not', wont: 'will not',
  wouldnt: 'would not', couldnt: 'could not', shouldnt: 'should not',
  isnt: 'is not', arent: 'are not', wasnt: 'was not', werent: 'were not',
  hasnt: 'has not', havent: 'have not', hadnt: 'had not',
  youre: 'you are', theyre: 'they are', weve: 'we have', youve: 'you have',
  theyve: 'they have', youll: 'you will', theyll: 'they will',
  itll: 'it will', thats: 'that is', whats: 'what is',
  theres: 'there is', lets: 'let us', im: 'i am', ive: 'i have'
};

/* Same reason: a transcriber writes "6" or "six" depending on the model and the
   context, and a candidate marked down for that has been marked on somebody
   else's spelling. */
const NUMBERS = {
  zero: '0', one: '1', two: '2', three: '3', four: '4', five: '5', six: '6',
  seven: '7', eight: '8', nine: '9', ten: '10', eleven: '11', twelve: '12',
  thirteen: '13', fourteen: '14', fifteen: '15', sixteen: '16',
  seventeen: '17', eighteen: '18', nineteen: '19', twenty: '20',
  thirty: '30', forty: '40', fifty: '50', sixty: '60', seventy: '70',
  eighty: '80', ninety: '90', hundred: '100', thousand: '1000'
};

/** One sentence to a list of comparable word tokens. */
function tokens(text) {
  let s = String(text == null ? '' : text).toLowerCase();
  /* Curly apostrophes first, or the contraction table misses every one of them
     — and a transcription service emits them far more often than a keyboard. */
  s = s.replace(/[‘’ʼ]/g, "'");
  for (const [from, to] of CONTRACTIONS) s = s.split(from).join(to);
  return s
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter(Boolean)
    /* Two passes, because expanding "dont" yields two tokens. */
    .flatMap(w => (NO_APOSTROPHE[w] || w).split(' '))
    .map(w => NUMBERS[w] || w);
}

/** How many tokens the two lists share, counting repeats only as often as both have them. */
function overlap(a, b) {
  const left = new Map();
  for (const w of a) left.set(w, (left.get(w) || 0) + 1);
  let n = 0;
  for (const w of b) {
    const have = left.get(w) || 0;
    if (have > 0) { left.set(w, have - 1); n++; }
  }
  return n;
}

/** The longest run of tokens appearing in both, in order. */
function longestInOrder(a, b) {
  /* Two rows rather than the full table: these are sentences, but there is no
     reason to hold an n×m grid for a number that only needs the row above. */
  let prev = new Array(b.length + 1).fill(0);
  let cur = new Array(b.length + 1).fill(0);
  for (let i = 1; i <= a.length; i++) {
    for (let j = 1; j <= b.length; j++) {
      cur[j] = a[i - 1] === b[j - 1] ? prev[j - 1] + 1 : Math.max(prev[j], cur[j - 1]);
    }
    const swap = prev; prev = cur; cur = swap;
    cur.fill(0);
  }
  return prev[b.length];
}

const half = n => Math.round(n * 2) / 2;
const clamp10 = n => Math.max(0, Math.min(10, n));

/**
 * Mark one repetition.
 *
 * Returns the same shape `ai.markOne()` returns — `{score, note, criteria}` —
 * so everything downstream is unchanged: rubric.combine() averages the
 * criteria, applies the caps, and the report renders the working the same way
 * it renders a model's. Returns null when there is nothing to compare against,
 * which the caller must treat as "not marked" rather than zero.
 */
function score(expected, heard) {
  const want = tokens(expected);
  const got = tokens(heard);
  if (!want.length) return null;               // no sentence on file: not our call to make

  const shared = overlap(want, got);
  const inOrder = longestInOrder(want, got);

  const content = clamp10((shared / want.length) * 10);
  /* Over the LONGER side, so both dropping words and padding cost something. */
  const structure = shared === 0 ? 0
    : clamp10((inOrder / Math.max(want.length, got.length)) * 10);

  const missing = want.length - shared;
  const extra = Math.max(0, got.length - shared);
  const words = n => n + ' word' + (n === 1 ? '' : 's');

  /* The out-of-order case is checked on its own rather than inside an "else",
     because it is the one that can happen with nothing missing and nothing
     added: every word came back, in the wrong sequence. Folded into the else it
     read "Repeated in full" for an answer that was not. */
  const bits = [];
  if (missing > 0) bits.push(words(missing) + ' missing');
  if (extra > 0) bits.push(words(extra) + ' added');
  if (shared > inOrder) bits.push('some words came back out of order');

  let said_what;
  if (!got.length) said_what = 'Nothing was heard back.';
  else if (!bits.length) said_what = 'Repeated in full.';
  else said_what = bits.join(', ').replace(/^./, c => c.toUpperCase()) + '.';

  /* Both sentences, always. This marker cannot tell a candidate's slip from the
     transcriber's, so the least it can do is show what it compared. */
  const said = String(heard || '').trim();
  const note = said_what
    + (said ? ' You said: "' + said + '"' : '')
    + ' The sentence was: "' + String(expected).trim() + '"';

  return {
    score: half((content + structure) / 2),
    note: note.slice(0, 600),
    criteria: {
      content: {
        score: half(content),
        /* The words that did come back, in the candidate's own transcript —
           which is what rubric.verifyEvidence() will check it against. */
        evidence: String(heard || '').trim().slice(0, 200) || null,
        comment: shared + ' of ' + want.length + ' words came back'
      },
      structure: {
        score: half(structure),
        comment: inOrder + ' of ' + want.length + ' in the original order'
      }
    }
  };
}

/**
 * The exact sentence a Part H item asks to be repeated, or null.
 *
 * Deliberately NOT `scriptFor()` in server/ai-marking-run.js, which answers a
 * different question: what to TELL a model. That one appends "a correct short
 * answer would be…" when the bank item carries a model answer, which is right
 * for Part G and would silently corrupt the comparison here the day somebody
 * adds a model answer to an H item. This wants the sentence and nothing else.
 *
 * Takes the question row — `{ ext_key, part, script }` — or, for the older
 * callers, a bare ext_key.
 */
function sentenceFor(row) {
  if (!row) return null;
  const r = typeof row === 'string' ? { ext_key: row } : row;
  if (r.part && r.part !== 'H') return null;
  /* The row first. An item written on the bank screen has no ext_key and no
     line in the authored file; what it has is `script`, the sentence the
     administrator typed beside the recording, and that is the only copy. */
  const own = String(r.script || '').trim();
  if (own) return own;
  if (!r.ext_key) return null;
  try {
    const hit = require('./data/vpet-items').rows().find(x => x.key === r.ext_key);
    return hit && hit.part === 'H' && hit.say ? hit.say : null;
  } catch (e) { return null; }
}

module.exports = { score, sentenceFor, tokens, overlap, longestInOrder };
