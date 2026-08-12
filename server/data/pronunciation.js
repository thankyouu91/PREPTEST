/**
 * Pronunciation targets for Vietnamese speakers of English.
 *
 * The rubric in `rubrics.js` can say "work on final consonants". It cannot say
 * *which* ones, or why that particular learner is dropping them, because a
 * rubric describes performance and this describes causes. This file is the
 * causes.
 *
 * ---------------------------------------------------------------------------
 * THE PRINCIPLE THAT ORDERS THIS LIST
 *
 * Intelligibility, not accent. Every target here is ranked by how much meaning
 * it destroys, not by how foreign it sounds. A learner who says /tɪŋ/ for
 * "thing" is understood every time; a learner who drops the final /s/ has said
 * a different number, a different tense, or a different word, and the listener
 * does not know it happened.
 *
 * The consequence is that this list looks wrong to anyone expecting an accent
 * course. "th" is near the bottom. Final consonants are at the top. That is
 * deliberate and it is the whole point: the goal is a candidate who is
 * understood, and time spent on /θ/ is time not spent on the thing that is
 * actually costing them marks.
 * ---------------------------------------------------------------------------
 *
 * WHY SOME OF THESE COST GRAMMAR MARKS
 *
 * English marks plural, possessive, third person and past tense with word-final
 * consonants that Vietnamese does not permit in that position. A speaker who
 * cannot produce final /s/ and /z/ cannot say "she works" or "two books" no
 * matter how well they know the rule — and a marker hearing "she work" scores
 * it as a grammar error, because from the outside the two are identical.
 *
 * This is why several entries below list `grammar` or `accuracy` in `affects`.
 * A report that sends such a learner to a grammar page is sending them to
 * practise something they already know. The `misdiagnosis` field on those
 * entries says so, so the tips engine can say it too.
 *
 * Sources are descriptive phonology of Vietnamese and English, not a
 * proprietary syllabus: Vietnamese permits a small set of unreleased final
 * stops and nasals and no final clusters, and every prediction here follows
 * from that plus the English inventory. Anything not derivable that way has
 * been left out rather than guessed at.
 */
'use strict';

/* How much meaning is lost when this goes wrong. The ranking key — see the
   header. `high` means a listener can be misled without noticing. */
const COST = { high: 3, medium: 2, low: 1 };

const TARGETS = [
  {
    id: 'final-s-z',
    label: 'Final /s/ and /z/',
    contrast: 'work → works, book → books, he → he\'s',
    cost: 'high',
    affects: ['pronunciation', 'grammar', 'accuracy'],
    gse: [22, 60],
    why: 'Vietnamese does not allow /s/ or /z/ at the end of a syllable, so the sound is dropped rather than mispronounced. The grammar is known; the sound is not available.',
    misdiagnosis: 'This is scored as a grammar error — missing plural, missing third person — and sending the learner to a grammar page will not fix it, because they already know the rule.',
    listen: 'Count how many plural nouns and third-person verbs lose their ending. If it is nearly all of them, this is phonological, not grammatical.',
    pairs: [['work', 'works'], ['book', 'books'], ['he', 'he\'s'], ['play', 'plays']],
    drill: 'Say the bare word, then add the ending as a separate beat: "book — s — books". Speed up only once the ending survives at slow speed.'
  },
  {
    id: 'final-ed',
    label: 'Past-tense -ed endings',
    contrast: 'walk → walked /t/, play → played /d/, want → wanted /ɪd/',
    cost: 'high',
    affects: ['pronunciation', 'grammar', 'accuracy'],
    gse: [24, 62],
    why: 'The ending is one of three sounds depending on what comes before it, and two of the three are final consonants Vietnamese does not use. The whole past tense disappears from speech.',
    misdiagnosis: 'A marker hears present tense throughout a past-tense narrative and scores grammar accordingly. In part J, where a candidate retells a story, this can cost more than any other single fault.',
    listen: 'Ask for a story about yesterday. If every verb is present, check whether the written form is correct — if it is, this is the cause.',
    pairs: [['walk', 'walked'], ['play', 'played'], ['want', 'wanted'], ['ask', 'asked']],
    drill: 'Sort twenty verbs into the three endings by ear, not by rule: /t/ after voiceless, /d/ after voiced, /ɪd/ after t or d. Then read a past-tense paragraph aloud.'
  },
  {
    id: 'final-consonants',
    label: 'Releasing final consonants',
    contrast: 'bad vs bat vs back, mine vs might',
    cost: 'high',
    affects: ['pronunciation', 'accuracy'],
    gse: [20, 55],
    why: 'Vietnamese final stops are unreleased, so the mouth closes on the sound without letting it out. To an English ear the word stops one sound short and several different words collapse into one.',
    listen: 'Whole words become ambiguous rather than accented — a listener asks "sorry?" on a word they should know.',
    pairs: [['bad', 'bat'], ['bat', 'back'], ['light', 'like'], ['need', 'neat']],
    drill: 'Say the word with an exaggerated puff of air on the last sound, then halve it. Record and check the last sound is still audible.'
  },
  {
    id: 'clusters',
    label: 'Consonant clusters',
    contrast: 'street, asked, texts, world',
    cost: 'high',
    affects: ['pronunciation', 'fluency'],
    gse: [26, 66],
    why: 'Vietnamese syllables carry one consonant at each edge. English allows three at the start and four at the end, so the cluster is either broken up with an extra vowel or reduced to one sound.',
    listen: 'Extra syllables appear — "s\'treet", "ask\'ed" — or the cluster is flattened to a single consonant.',
    pairs: [['street', 'suh-treet'], ['asked', 'ask'], ['texts', 'tex'], ['world', 'wor']],
    drill: 'Build the cluster backwards: "reet — treet — street". Never insert a vowel to get started; begin from the last consonant of the cluster.'
  },
  {
    id: 'word-stress',
    label: 'Word stress',
    contrast: 'PHOtograph, phoTOGraphy, photoGRAPHic',
    cost: 'high',
    affects: ['pronunciation', 'vocabulary'],
    gse: [30, 75],
    why: 'Vietnamese is syllable-timed and every syllable carries a tone, so English stress — one strong syllable and the rest reduced — has no equivalent. Even syllable weight sounds like a word the listener does not know.',
    listen: 'Individual sounds are correct and the word is still not recognised. That is almost always stress.',
    pairs: [['PHOtograph', 'phoTOGraphy'], ['REcord (n)', 'reCORD (v)'], ['PREsent (n)', 'preSENT (v)']],
    drill: 'Learn stress with the word, never after it. Write new vocabulary with the stressed syllable in capitals from the first time you meet it.'
  },
  {
    id: 'schwa',
    label: 'The unstressed vowel /ə/',
    contrast: 'banana → b-NAH-n, computer → k-PYOO-t',
    cost: 'medium',
    affects: ['pronunciation', 'fluency'],
    gse: [36, 78],
    why: 'Giving every syllable full value is correct in Vietnamese and wrong in English. The commonest English vowel is the one in unstressed syllables, and it is almost silent.',
    listen: 'Speech sounds careful and even, and takes longer than it should. Nothing is wrong with any single sound.',
    pairs: [['banana', 'ba-na-na'], ['computer', 'com-pu-ter'], ['about', 'a-bout']],
    drill: 'Say the stressed syllable at full volume and swallow the others. It will feel like mumbling. That is the target.'
  },
  {
    id: 'vowel-length',
    label: 'Long and short vowels',
    contrast: 'sheep vs ship, fool vs full',
    cost: 'medium',
    affects: ['pronunciation'],
    gse: [28, 64],
    why: 'The English pairs differ in both length and tongue position; the Vietnamese vowel sits between them, so both English words come out as the same third sound.',
    listen: 'A consistent pair of words the listener keeps mishearing, rather than a general accent.',
    pairs: [['sheep', 'ship'], ['fool', 'full'], ['beat', 'bit'], ['pool', 'pull']],
    drill: 'Minimal pairs with a partner reading and you pointing. Producing the difference comes after hearing it, never before.'
  },
  {
    id: 'sentence-stress',
    label: 'Sentence stress and rhythm',
    contrast: 'I didn\'t say she took it (six different meanings)',
    cost: 'medium',
    affects: ['pronunciation', 'coherence'],
    gse: [42, 84],
    why: 'English puts the new information on a strong beat and weakens everything else. Even stress across a sentence removes the signal that tells a listener what matters.',
    listen: 'Every word equally weighted; the listener cannot tell what the point was.',
    pairs: [
      ['I didn\'t say SHE took it', 'I didn\'t say she TOOK it'],
      ['I said the RED one', 'I SAID the red one']
    ],
    drill: 'Take one sentence and say it six times, stressing a different word each time. Say what each version means.'
  },
  {
    id: 'linking',
    label: 'Linking between words',
    contrast: 'an apple → a-napple, turn it off → tur-ni-toff',
    cost: 'medium',
    affects: ['pronunciation', 'fluency'],
    gse: [46, 84],
    why: 'Vietnamese syllables have clear edges. English runs the end of one word into the start of the next, and a speaker who separates every word sounds effortful even when every sound is right.',
    listen: 'Correct, clear and slightly staccato. This is a fluency ceiling rather than an error.',
    pairs: [['an apple', 'an | apple'], ['turn it off', 'turn | it | off']],
    drill: 'Mark the joins in a written sentence, then read it as though the marked pairs were single words.'
  },
  {
    id: 'l-n',
    label: '/l/ and /n/',
    contrast: 'light vs night, low vs no',
    cost: 'medium',
    affects: ['pronunciation'],
    gse: [22, 50],
    dialect: 'Common in northern Vietnamese speech; often absent in southern.',
    why: 'The two are interchangeable in several northern varieties, so the distinction is not one the ear has been trained to make.',
    listen: 'Whole words swap. Unlike an accent feature, this changes which word was said.',
    pairs: [['light', 'night'], ['low', 'no'], ['lot', 'not']],
    drill: 'Hold the tongue tip against the ridge behind the teeth and hum: if air comes out of the nose it is /n/, if round the sides it is /l/.'
  },
  {
    id: 'final-l',
    label: 'Final /l/',
    contrast: 'call, feel, small, well',
    cost: 'medium',
    affects: ['pronunciation'],
    gse: [24, 56],
    why: 'Vietnamese has no final /l/, so it becomes a vowel or disappears — "call" turns into "caw".',
    listen: 'The word ends on a vowel where it should end on a consonant.',
    pairs: [['call', 'caw'], ['feel', 'fee'], ['well', 'weh']],
    drill: 'Finish the word with the tongue tip touching the ridge behind the teeth and leave it there for a beat.'
  },
  {
    id: 'r-sound',
    label: 'Initial /r/',
    contrast: 'red, right, around',
    cost: 'low',
    affects: ['pronunciation'],
    gse: [24, 58],
    dialect: 'Realised differently across Vietnamese regions; northern /z/-like, southern closer to English.',
    why: 'The Vietnamese sound written r varies by region and none of the variants is the English one, so the substitution is systematic rather than careless.',
    listen: 'Consistent and rarely confusing — a listener notices an accent, not a different word.',
    pairs: [['red', 'zed'], ['right', 'zight']],
    drill: 'Curl the tongue tip back without touching anything. If it touches, it becomes /d/ or /z/.'
  },
  {
    id: 'th',
    label: '/θ/ and /ð/ — "th"',
    contrast: 'think, this, three, weather',
    cost: 'low',
    affects: ['pronunciation'],
    gse: [26, 70],
    why: 'Neither sound exists in Vietnamese, so /t/, /d/, /s/ or /z/ is substituted.',
    listen: 'Very audible and almost never confusing. Context resolves nearly every case.',
    misdiagnosis: 'The one learners ask about first and the one worth doing last. Time spent here is time not spent on final consonants, which are costing real marks.',
    pairs: [['think', 'tink'], ['this', 'dis'], ['three', 'tree']],
    drill: 'Tongue tip lightly between the teeth and blow. Do this after the high-cost targets, not before.'
  },
  {
    id: 'ch-sh-j',
    label: '/tʃ/, /ʃ/ and /dʒ/',
    contrast: 'chair vs share, jeep vs cheap',
    cost: 'low',
    affects: ['pronunciation'],
    gse: [30, 66],
    why: 'Vietnamese has similar but not identical sounds, and the voiced /dʒ/ has no counterpart, so it devoices.',
    listen: 'Occasional word confusion in noisy conditions; usually recoverable.',
    pairs: [['chair', 'share'], ['jeep', 'cheap'], ['choose', 'shoes']],
    drill: 'Hand on the throat: /dʒ/ buzzes, /tʃ/ does not. Practise in pairs so the contrast is trained, not the sound alone.'
  }
];

const BY_ID = Object.fromEntries(TARGETS.map(t => [t.id, t]));

/**
 * The targets worth this learner's time, in the order to spend it.
 *
 * Three inputs, and each one narrows the list differently:
 *
 *   band   0–6 from the pronunciation rubric — how much can be tackled at once
 *   gse    the learner's speaking score — targets outside their range are
 *          either already solved or not yet reachable
 *   weak   other criteria scoring badly, which promotes targets that damage
 *          them. A learner weak on grammar *and* pronunciation may have one
 *          problem, not two.
 *
 * Returns at most `limit`, because a report listing fourteen things to fix is
 * a report nobody acts on. Three is a week's work.
 */
function targetsFor({ band, gse, weak = [], limit = 3 } = {}) {
  const relevant = TARGETS.filter(t => {
    if (gse == null) return true;
    /* A margin either side: a target stops mattering some way past the point
       it is usually mastered, and starts mattering slightly before. */
    return gse >= t.gse[0] - 6 && gse <= t.gse[1] + 6;
  });

  const scored = relevant.map(t => {
    let score = COST[t.cost] * 10;

    /* The heart of the ranking. When a learner is losing marks on grammar and
       this target is one of the ways pronunciation destroys grammar, it stops
       being a pronunciation exercise and becomes the shortest route to two
       criteria at once. */
    const overlap = t.affects.filter(a => a !== 'pronunciation' && weak.includes(a));
    score += overlap.length * 12;

    /* At the bottom of the scale, only the highest-cost work is worth doing:
       a learner at band 1 who spends a month on linking will still not be
       understood. At the top, the high-cost targets are long since solved. */
    if (band != null) {
      if (band <= 2 && t.cost !== 'high') score -= 15;
      if (band >= 5 && t.cost === 'high') score -= 10;
    }

    return { target: t, score, alsoHelps: overlap };
  });

  return scored
    .sort((a, b) => b.score - a.score || a.target.id.localeCompare(b.target.id))
    .slice(0, limit)
    .map(({ target, alsoHelps }) => ({
      id: target.id,
      label: target.label,
      contrast: target.contrast,
      cost: target.cost,
      why: target.why,
      listen: target.listen,
      drill: target.drill,
      pairs: target.pairs,
      misdiagnosis: target.misdiagnosis || null,
      dialect: target.dialect || null,
      alsoHelps
    }));
}

/**
 * Targets whose failure is scored as something other than pronunciation.
 *
 * Used by the report to add a sentence a learner would otherwise never be
 * told: that the grammar marks they lost may not be a grammar problem.
 */
const hidesAs = criterion =>
  TARGETS.filter(t => t.affects.includes(criterion) && t.misdiagnosis).map(t => t.id);

module.exports = { TARGETS, BY_ID, COST, targetsFor, hidesAs };
