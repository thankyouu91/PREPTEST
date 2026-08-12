/**
 * Vocabulary sets for personalised revision.
 *
 * ---------------------------------------------------------------------------
 * WHY THESE ARE GROUPED BY FUNCTION RATHER THAN BY TOPIC
 *
 * A topic list — twenty words about travel — is easy to write and hard to use.
 * The learner meets it in a report, recognises most of it, learns three words,
 * and none of the three appears in the exam.
 *
 * VPET does not ask candidates to discuss travel. It asks them to make a
 * request, repair a misunderstanding, retell what somebody said, or recommend
 * one option over another. Those are functions, they recur in every form
 * regardless of topic, and a learner who owns the eight phrases for making a
 * polite request has something they will use in part I whatever the scenario
 * turns out to be.
 *
 * Four topic sets survive at the end, because some content words genuinely have
 * to be known and cannot be derived. They are marked `kind: 'topic'` and they
 * are ranked below the functional sets on purpose.
 * ---------------------------------------------------------------------------
 *
 * ON LICENSING. Nothing here is copied from a published word list. Frequency
 * lists such as NGSL are openly licensed and worth importing later to check
 * coverage, but the entries below were written for this exam, with the
 * collocations and the stress marking that a Vietnamese learner needs and a
 * frequency list does not carry. See docs/ACADEMIC.md §2 for the same argument
 * about descriptors.
 *
 * ON STRESS MARKING. Every multi-syllable entry carries its stressed syllable
 * in capitals. This is not decoration: `pronunciation.js` puts word stress
 * among the highest-cost targets for this L1, and a vocabulary list that
 * teaches the letters without the stress teaches a word the learner will say
 * in a way nobody recognises.
 */
'use strict';

const SETS = [
  {
    id: 'requests',
    label: 'Making a request',
    kind: 'function',
    gse: [30, 60],
    parts: ['I'],
    what: 'Asking for something in a way that leaves the other person free to say no.',
    items: [
      { word: 'I was wondering if', stress: 'I was WONdering if', gloss: 'the most useful opening in the exam: softens any request', example: 'I was wondering if you could change my room.' },
      { word: 'Would it be possible to', stress: 'Would it be POSsible to', gloss: 'formal, safe with a stranger', example: 'Would it be possible to move the meeting?' },
      { word: 'Do you mind if I', gloss: 'asking permission, not a favour', example: 'Do you mind if I open the window?' },
      { word: 'I\'d appreciate it if', stress: 'apPREciate', gloss: 'raises the register a level', example: 'I\'d appreciate it if you could confirm by email.' },
      { word: 'in advance', stress: 'in adVANCE', gloss: 'before the time in question', collocations: ['book in advance', 'pay in advance'] },
      { word: 'at your convenience', stress: 'conVENience', gloss: 'when it suits you — polite, slightly formal' },
      { word: 'urgent', stress: 'URgent', gloss: 'needs attention now', collocations: ['an urgent matter', 'urgently need'] },
      { word: 'on behalf of', stress: 'beHALF', gloss: 'speaking for somebody else' }
    ]
  },
  {
    id: 'apologising',
    label: 'Apologising and repairing',
    kind: 'function',
    gse: [28, 58],
    parts: ['I'],
    what: 'What to say when something has gone wrong, including when it was your fault.',
    items: [
      { word: 'I\'m afraid', stress: 'aFRAID', gloss: 'introduces bad news politely — not about fear', example: 'I\'m afraid I won\'t be able to come.' },
      { word: 'I do apologise', stress: 'apoLOgise', gloss: 'stronger than sorry; the "do" carries the weight' },
      { word: 'there\'s been a misunderstanding', stress: 'misunderSTANDing', gloss: 'blames neither side' },
      { word: 'let me explain', stress: 'exPLAIN', gloss: 'buys space before giving a reason' },
      { word: 'it won\'t happen again', stress: 'HAPpen', gloss: 'the closing move of an apology' },
      { word: 'make up for', gloss: 'compensate', collocations: ['make up for the delay', 'make up for it'] },
      { word: 'inconvenience', stress: 'inconVENience', gloss: 'the standard noun in a service apology', collocations: ['sorry for the inconvenience'] },
      { word: 'sort it out', gloss: 'fix the problem — informal and very common' }
    ]
  },
  {
    id: 'complaining',
    label: 'Complaining politely',
    kind: 'function',
    gse: [36, 66],
    parts: ['I'],
    what: 'Saying something is wrong without accusing the person you are speaking to.',
    items: [
      { word: 'there seems to be a problem with', stress: 'PROBlem', gloss: '"seems" removes the accusation' },
      { word: 'I\'m not entirely happy with', stress: 'enTIREly / HAPpy', gloss: 'understatement — stronger than it sounds in English' },
      { word: 'this isn\'t what I ordered', stress: 'ORdered', gloss: 'states the fact, blames nobody' },
      { word: 'faulty', stress: 'FAULty', gloss: 'broken in a way that is the seller\'s responsibility' },
      { word: 'a refund', stress: 'reFUND (noun) / refUND (verb)', gloss: 'money back — note the stress moves' },
      { word: 'resolve', stress: 'reSOLVE', gloss: 'settle a problem — formal register' },
      { word: 'looking into it', stress: 'LOOKing INto it', gloss: 'investigating — what staff say back to you' },
      { word: 'as soon as possible', stress: 'POSsible', gloss: 'the standard way to press for speed politely' }
    ]
  },
  {
    id: 'arranging',
    label: 'Arranging and rescheduling',
    kind: 'function',
    gse: [30, 58],
    parts: ['I', 'H'],
    what: 'Fixing, moving and confirming times — the commonest part I scenario.',
    items: [
      { word: 'put back', gloss: 'move to a later time — not "move backwards"', example: 'Can we put the meeting back to Thursday?' },
      { word: 'bring forward', stress: 'bring FORward', gloss: 'move to an earlier time' },
      { word: 'clash with', gloss: 'happen at the same time as', collocations: ['it clashes with my class'] },
      { word: 'availability', stress: 'availaBIlity', gloss: 'when you are free' },
      { word: 'confirm', stress: 'conFIRM', gloss: 'say definitely that it is agreed' },
      { word: 'at short notice', stress: 'NOtice', gloss: 'with little warning' },
      { word: 'fit you in', gloss: 'find a slot for you' },
      { word: 'reschedule', stress: 'reSCHEDule', gloss: 'move to another time — one word for the whole task' }
    ]
  },
  {
    id: 'narrating',
    label: 'Telling what happened',
    kind: 'function',
    gse: [32, 70],
    parts: ['J'],
    what: 'Sequencing a story so a listener can follow it. Part J is scored on how much survives the retelling.',
    items: [
      { word: 'to begin with', stress: 'beGIN', gloss: 'opens a sequence more naturally than "first"' },
      { word: 'shortly afterwards', stress: 'AFterwards', gloss: 'a short gap in time' },
      { word: 'meanwhile', stress: 'MEANwhile', gloss: 'at the same time, elsewhere' },
      { word: 'it turned out that', gloss: 'introduces the thing nobody expected — the pivot of most stories' },
      { word: 'in the end', gloss: 'finally, after difficulty — not the same as "at the end"' },
      { word: 'as a result', stress: 'reSULT', gloss: 'marks consequence, which retellings usually lose first' },
      { word: 'even though', stress: 'EVen though', gloss: 'concession — keeps two facts in one sentence' },
      { word: 'by the time', gloss: 'links two past events', example: 'By the time she arrived, the train had left.' }
    ]
  },
  {
    id: 'reporting',
    label: 'Reporting what somebody said',
    kind: 'function',
    gse: [40, 76],
    parts: ['J', 'D'],
    what: 'Retelling speech without quoting it. The single hardest grammar demand in part J.',
    items: [
      { word: 'he pointed out that', stress: 'he POINted out that', gloss: 'reports a fact the speaker considered important' },
      { word: 'she admitted', stress: 'adMITted', gloss: 'reports an unwilling agreement' },
      { word: 'they insisted on', stress: 'inSISted', gloss: 'reports a refusal to move', collocations: ['insisted on paying'] },
      { word: 'according to', stress: 'acCORDing', gloss: 'attributes without endorsing' },
      { word: 'she suggested', stress: 'sugGESTed', gloss: 'note: suggested *that he go*, never "suggested him to go"' },
      { word: 'he refused to', stress: 'reFUSED', gloss: 'the standard negative report' },
      { word: 'warned', gloss: 'reported a risk', collocations: ['warned him not to'] },
      { word: 'as she put it', gloss: 'flags that the words are hers, not yours' }
    ]
  },
  {
    id: 'evaluating',
    label: 'Recommending and evaluating',
    kind: 'function',
    gse: [44, 80],
    parts: ['D', 'I'],
    what: 'Choosing between options and defending the choice — what the writing task usually wants.',
    items: [
      { word: 'on balance', stress: 'BALance', gloss: 'having weighed both sides' },
      { word: 'the main drawback', stress: 'DRAWback', gloss: 'the strongest disadvantage' },
      { word: 'outweigh', stress: 'outWEIGH', gloss: 'be more important than', collocations: ['the benefits outweigh the costs'] },
      { word: 'worth considering', stress: 'conSIDering', gloss: 'recommends without committing' },
      { word: 'in the long run', gloss: 'over time — signals you thought past the obvious' },
      { word: 'cost-effective', stress: 'efFECTive', gloss: 'good value, not merely cheap' },
      { word: 'I\'d be inclined to', stress: 'inCLINED', gloss: 'a hedged recommendation, high register' },
      { word: 'provided that', stress: 'proVIDed that', gloss: 'attaches a condition to a recommendation' }
    ]
  },
  {
    id: 'comparing',
    label: 'Comparing and contrasting',
    kind: 'function',
    gse: [38, 74],
    parts: ['B', 'D'],
    what: 'Holding two things side by side, which part B needs when a passage is paraphrased.',
    items: [
      { word: 'whereas', stress: 'whereAS', gloss: 'contrast inside one sentence — more precise than "but"' },
      { word: 'similarly', stress: 'SIMilarly', gloss: 'signals the next point runs the same way' },
      { word: 'unlike', stress: 'unLIKE', gloss: 'contrast before a noun', example: 'Unlike the first option, this one is free.' },
      { word: 'far more', gloss: 'strengthens a comparison', collocations: ['far more useful', 'far more likely'] },
      { word: 'the difference lies in', stress: 'the DIFference lies in', gloss: 'names where the contrast actually is' },
      { word: 'have in common', stress: 'have in COMmon', gloss: 'share', collocations: ['what they have in common'] },
      { word: 'by contrast', stress: 'by CONtrast', gloss: 'opens a contrasting sentence' },
      { word: 'to a lesser extent', stress: 'LESser / exTENT', gloss: 'grades a comparison instead of flattening it' }
    ]
  },
  {
    id: 'workstudy',
    label: 'Work and study',
    kind: 'topic',
    gse: [30, 64],
    parts: ['C', 'G', 'D'],
    what: 'Content words that recur across reading and listening passages.',
    items: [
      { word: 'deadline', stress: 'DEADline', gloss: 'the last acceptable time', collocations: ['meet a deadline', 'miss a deadline'] },
      { word: 'shift', gloss: 'a work period', collocations: ['night shift', 'work shifts'] },
      { word: 'apply for', stress: 'apPLY', gloss: 'request formally — apply *for* a job, *to* a company' },
      { word: 'qualification', stress: 'qualifiCAtion', gloss: 'a certificate or degree' },
      { word: 'training course', stress: 'TRAINing course', gloss: 'a short programme of instruction' },
      { word: 'take on', gloss: 'accept work or hire somebody', collocations: ['take on extra work'] },
      { word: 'workload', stress: 'WORKload', gloss: 'how much you have to do' },
      { word: 'cover for', stress: 'COVer for', gloss: 'do somebody else\'s work while they are away' }
    ]
  },
  {
    id: 'travel',
    label: 'Travel and accommodation',
    kind: 'topic',
    gse: [26, 58],
    parts: ['F', 'G', 'I'],
    what: 'The setting of most part I scenarios and many listening passages.',
    items: [
      { word: 'check in', gloss: 'register on arrival — two words as a verb, "check-in" as a noun' },
      { word: 'boarding pass', stress: 'BOARDing', gloss: 'the document that lets you on' },
      { word: 'delayed', stress: 'deLAYED', gloss: 'later than scheduled' },
      { word: 'fully booked', stress: 'FULly booked', gloss: 'no space left' },
      { word: 'deposit', stress: 'dePOSit', gloss: 'money paid up front and usually returned' },
      { word: 'facilities', stress: 'faCILities', gloss: 'what a place provides — almost always plural' },
      { word: 'within walking distance', stress: 'WALKing', gloss: 'close enough to walk' },
      { word: 'sold out', gloss: 'nothing left to buy' }
    ]
  },
  {
    id: 'health',
    label: 'Health and services',
    kind: 'topic',
    gse: [28, 60],
    parts: ['F', 'G', 'I'],
    what: 'Appointments, symptoms and public services.',
    items: [
      { word: 'appointment', stress: 'apPOINTment', gloss: 'an arranged time to see somebody' },
      { word: 'symptom', stress: 'SYMPtom', gloss: 'a sign of illness' },
      { word: 'prescription', stress: 'preSCRIPtion', gloss: 'written permission for medicine' },
      { word: 'get over', stress: 'get OVer', gloss: 'recover from', collocations: ['get over a cold'] },
      { word: 'insurance', stress: 'inSURance', gloss: 'cover against cost' },
      { word: 'refer you to', stress: 'reFER', gloss: 'send you to a specialist' },
      { word: 'run out of', gloss: 'have none left' },
      { word: 'come down with', gloss: 'start to be ill with' }
    ]
  },
  {
    id: 'problems',
    label: 'Everyday problems and technology',
    kind: 'topic',
    gse: [30, 62],
    parts: ['F', 'I'],
    what: 'Things going wrong, which is what a part I scenario almost always is.',
    items: [
      { word: 'not working', stress: 'WORKing', gloss: 'broken — the commonest and safest phrasing' },
      { word: 'out of order', stress: 'ORder', gloss: 'broken, of a public machine' },
      { word: 'log in', gloss: 'enter an account — two words as a verb' },
      { word: 'back up', gloss: 'make a spare copy' },
      { word: 'crash', gloss: 'stop working suddenly', collocations: ['the system crashed'] },
      { word: 'set up', gloss: 'install and configure' },
      { word: 'charge', gloss: 'both "put power in" and "ask for money" — context decides' },
      { word: 'give it a go', gloss: 'try — informal, useful in part H' }
    ]
  }
];

const BY_ID = Object.fromEntries(SETS.map(s => [s.id, s]));
const ALL_WORDS = SETS.flatMap(s => s.items.map(i => ({ ...i, set: s.id, setLabel: s.label })));

/**
 * The sets worth this learner's time.
 *
 * Ranked by three things in descending weight: whether the learner did badly
 * on a part the set serves, whether vocabulary itself is a weak criterion, and
 * whether the set is within reach of their current score. Functional sets beat
 * topic sets at equal score, for the reason in the header.
 *
 * @param {object}   opts
 * @param {number}   opts.gse     the learner's score on the relevant skill
 * @param {string[]} opts.weak    criteria scoring badly
 * @param {string[]} opts.parts   parts the learner scored badly on
 * @param {number}   opts.limit   how many sets to return
 */
function setsFor({ gse, weak = [], parts = [], limit = 2 } = {}) {
  const reachable = SETS.filter(s => {
    if (gse == null) return true;
    /* Below the range the set is unusable; well above it, the learner has the
       words already and a report telling them to learn "check in" at C1 has
       wasted the only three lines a learner reads. */
    return gse >= s.gse[0] - 8 && gse <= s.gse[1] + 10;
  });

  const scored = reachable.map(s => {
    let score = s.kind === 'function' ? 10 : 0;
    score += s.parts.filter(p => parts.includes(p)).length * 15;
    if (weak.includes('vocabulary')) score += 8;
    /* Sets aimed near the learner's level beat sets they have half outgrown. */
    if (gse != null) {
      const mid = (s.gse[0] + s.gse[1]) / 2;
      score -= Math.abs(gse - mid) / 4;
    }
    return { set: s, score };
  });

  return scored
    .sort((a, b) => b.score - a.score || a.set.id.localeCompare(b.set.id))
    .slice(0, limit)
    .map(({ set }) => ({
      id: set.id, label: set.label, kind: set.kind,
      what: set.what, parts: set.parts, items: set.items
    }));
}

module.exports = { SETS, BY_ID, ALL_WORDS, setsFor };
