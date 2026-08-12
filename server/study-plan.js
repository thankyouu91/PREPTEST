/**
 * The personalised revision plan.
 *
 * Everything else in the academic layer answers one question each:
 *
 *   descriptors.js     what can this learner already do, and what is next
 *   rubrics.js         which criterion is costing the most marks
 *   pronunciation.js   which sounds are the cause
 *   vocabulary.js      which words would actually get used
 *
 * This file answers the only question a learner asks: **what should I do this
 * week?** It is the join, and the join is where the value is — four correct
 * lists presented separately are four things to read and nothing to do.
 *
 * ---------------------------------------------------------------------------
 * THE TWO RULES THAT SHAPE THE OUTPUT
 *
 * **Rank by recoverable marks, not by lowest score.** A criterion worth 10% of
 * the part sitting at band 2 is a smaller prize than one worth 40% sitting at
 * band 4, and a report that lists weaknesses in ascending order of score sends
 * the learner to work in the wrong place. `rubrics.rankByOpportunity` does the
 * arithmetic; this file refuses to reorder it afterwards.
 *
 * **Three things, never more.** A plan listing nine actions is a plan nobody
 * starts. Everything computed here is available through the API for a teacher
 * who wants the full picture; what reaches the learner is capped.
 * ---------------------------------------------------------------------------
 *
 * THE DIAGNOSIS WORTH THE WHOLE FILE
 *
 * When a learner is weak on grammar *and* on pronunciation, the report checks
 * whether the grammar marks were lost to sounds rather than to rules — a
 * Vietnamese speaker who cannot produce final /s/ and /z/ cannot say "she
 * works" however well they know the third person. Sending them to a grammar
 * page is sending them to practise something they already know.
 *
 * See `pronunciation.js` for why that is predictable rather than a guess.
 */
'use strict';

const descriptors = require('./data/descriptors');
const rubrics = require('./data/rubrics');
const pronunciation = require('./data/pronunciation');
const vocabulary = require('./data/vocabulary');

/* A criterion is "weak" below this band. Band 3 is the middle of a 0–6 scale
   and the point at which the rubric's own wording turns from what is missing
   to what is nearly there, so it is where remediation stops being the main
   event. */
const WEAK_BELOW = 4;

const uniq = xs => [...new Set(xs)];

/**
 * Build a plan from one attempt.
 *
 * @param {object}   input
 * @param {string}   input.skill    'speaking' | 'writing' | 'reading' | 'listening'
 * @param {number}   input.gse      the score for that skill, 10–90
 * @param {object}   input.parts    { J: { content: 2, fluency: 3, … }, … }
 * @param {number}   [input.actions] how many actions reach the learner
 */
function build({ skill, gse, parts = {}, actions = 3 } = {}) {
  if (!descriptors.BY_SKILL[skill]) throw new Error('Unknown skill: ' + skill);
  if (!Number.isFinite(gse) || gse < 10 || gse > 90) throw new Error('gse must be 10 to 90');

  const profile = descriptors.profile(skill, gse);

  /* Rank every part the learner attempted, then merge. Criteria repeat across
     parts — fluency is marked in H, I and J — and a learner told three times
     to work on fluency has been told nothing three times. The merge keeps the
     worst band and sums the recoverable marks, so a criterion that is weak
     everywhere outranks one that is weak in a single part. */
  const merged = new Map();
  const partScores = {};

  for (const [part, scores] of Object.entries(parts)) {
    if (!rubrics.PART_RUBRICS[part]) throw new Error('No rubric for part ' + part);
    partScores[part] = rubrics.partScore(part, scores);

    for (const row of rubrics.rankByOpportunity(part, scores)) {
      const prev = merged.get(row.criterion);
      if (!prev) {
        merged.set(row.criterion, { ...row, parts: [part], headroom: row.headroom });
      } else {
        prev.parts.push(part);
        prev.headroom += row.headroom;
        /* Keep the worst performance and the advice that goes with it: advice
           written for band 4 is wrong for a learner who scored 1 somewhere. */
        if (row.band < prev.band) { prev.band = row.band; prev.advice = row.advice; }
      }
    }
  }

  const ranked = [...merged.values()].sort((a, b) => b.headroom - a.headroom);
  const weak = ranked.filter(r => r.band < WEAK_BELOW).map(r => r.criterion);
  /* partScore returns a weighted band on the same 0–6 scale as the criteria,
     not a percentage. Comparing it against 60 would mark every part weak and
     make the vocabulary selection ignore its strongest signal. */
  const weakParts = Object.keys(partScores).filter(p => partScores[p] < WEAK_BELOW);

  /* Pronunciation is only offered where it is marked. Telling a reading
     candidate to work on final consonants is advice about an exam they did
     not sit. */
  const pronBand = ranked.find(r => r.criterion === 'pronunciation');
  const sounds = pronBand
    ? pronunciation.targetsFor({ band: pronBand.band, gse, weak, limit: actions })
    : [];

  const words = vocabulary.setsFor({ gse, weak, parts: weakParts, limit: 2 });

  return {
    skill, gse,
    band: profile.band,
    positionInBand: profile.positionInBand,
    pointsToNextBand: profile.pointsToNextBand,
    canAlready: profile.achieved.slice(0, 3),
    nextUp: profile.next.slice(0, 3),
    partScores,
    priorities: ranked.slice(0, actions).map(r => ({
      criterion: r.criterion, label: r.label, band: r.band,
      parts: r.parts, recoverable: Math.round(r.headroom),
      diagnosis: r.advice.diagnosis,
      actions: r.advice.actions.slice(0, 2),
      study: r.advice.study
    })),
    sounds,
    vocabulary: words,
    hiddenCauses: hiddenCauses(ranked, sounds),
    thisWeek: thisWeek(ranked, sounds, words, actions)
  };
}

/**
 * Where a low score is likely to have the wrong name.
 *
 * Only raised when both the disguised criterion and pronunciation are weak.
 * Either alone proves nothing: weak grammar with sound pronunciation really is
 * grammar, and weak pronunciation with sound grammar is not hiding anything.
 */
function hiddenCauses(ranked, sounds) {
  const bandOf = c => { const r = ranked.find(x => x.criterion === c); return r ? r.band : null; };
  const pron = bandOf('pronunciation');
  if (pron == null || pron >= WEAK_BELOW) return [];

  const out = [];
  for (const criterion of ['grammar', 'accuracy']) {
    const band = bandOf(criterion);
    if (band == null || band >= WEAK_BELOW) continue;

    const ids = pronunciation.hidesAs(criterion).filter(id => sounds.some(s => s.id === id));
    if (!ids.length) continue;

    const a = /^[aeiou]/i.test(criterion) ? 'an' : 'a';
    out.push({
      criterion,
      band,
      soundIds: ids,
      note: `Your ${criterion} score may not be ${a} ${criterion} problem. ` +
        ids.map(id => pronunciation.BY_ID[id].label).join(' and ') +
        ` ${ids.length > 1 ? 'are' : 'is'} marked as ${criterion} errors when dropped, and ` +
        'they are dropped because the sound is hard, not because the rule is unknown. ' +
        'Check whether you write these correctly. If you do, work on the sound.'
    });
  }
  return out;
}

/**
 * The list that actually reaches the learner.
 *
 * One line per action, each naming a thing to do rather than a thing to be.
 * "Improve your fluency" is not an action; "read a paragraph aloud and mark
 * where you paused" is. The rubric's own `actions` are already written that
 * way, so this mostly picks and orders rather than rewording.
 */
function thisWeek(ranked, sounds, words, limit) {
  const weakest = ranked.filter(r => r.band < WEAK_BELOW);

  /* Reserve room for the other two kinds. Left to itself the criterion list
     fills every slot, and the learner gets three restatements of the rubric —
     which is the report they could already have read. The mix is the product:
     one thing to practise, one sound to fix, one set of words to carry into
     the next attempt. */
  const mixed = sounds.length || words.length;
  const criterionSlots = mixed ? Math.max(1, limit - 2) : limit;

  const out = weakest.slice(0, criterionSlots).map(r => ({
    kind: 'criterion',
    why: `${r.label} is where the most marks are recoverable.`,
    do: r.advice.actions[0],
    study: r.advice.study[0] || null
  }));

  if (sounds.length) {
    const s = sounds[0];
    out.push({
      kind: 'sound',
      /* When one drill repairs two criteria it is the best-value thing on the
         page, so it says so and it goes to the top. */
      lead: s.alsoHelps.length > 0,
      why: s.alsoHelps.length
        ? `${s.label} — and it is costing you ${s.alsoHelps.join(' and ')} marks too.`
        : `${s.label} costs more meaning than anything else at your level.`,
      do: s.drill,
      study: null
    });
  }

  if (words.length) {
    const w = words[0];
    out.push({
      kind: 'vocabulary',
      why: `${w.label} — ${w.what}`,
      do: `Learn these ${w.items.length} with their stress marked, and use three in your next practice answer: ` +
        w.items.slice(0, 4).map(i => i.word).join(', ') + '…',
      study: null
    });
  }

  out.sort((a, b) => (b.lead ? 1 : 0) - (a.lead ? 1 : 0));
  out.forEach(x => delete x.lead);

  /* Nothing was weak enough to remediate. Saying "keep going" is useless, so
     point at the next thing on the descriptor ladder instead. */
  if (!out.length) {
    out.push({
      kind: 'stretch',
      why: 'Nothing is scoring badly enough to fix. The gain now is in reach, not repair.',
      do: 'Take the next ability on your list above and build one practice answer around it.',
      study: null
    });
  }

  return out.slice(0, limit);
}

module.exports = { build, hiddenCauses, WEAK_BELOW, uniq };
