/**
 * VPET item bank — the parts that need no audio: A, B, C, D and I.
 *
 * Twenty items, one paper's worth of every part that can be sat without an MP3.
 * Parts E, F, G, H and J are missing on purpose: each is an audio part, and a
 * script with no recording behind it is not an item a candidate can sit. They
 * arrive with the voice work.
 *
 * Each row must satisfy the blueprint in server/data/exam-formats.js — the part
 * letter fixes the skill and the item type, and the admin API refuses a mismatch:
 *
 *   A Sentence Completion   writing   gap       B Passage Reconstruction writing essay
 *   C Reading Comprehension reading   mcq       D E-Mail Writing         writing essay
 *   I Speaking Situations   speaking  speaking
 *
 * Provenance. These items are written for this platform; nothing is copied from
 * a published test or a licensed word list. Levels are judged against the CEFR
 * bands docs/LEARNING.md sets out, using NGSL and NAWL (both CC BY-SA) as a
 * reference for how common a word is — consulted, not reproduced. Oxford 3000 /
 * 5000 and the English Vocabulary Profile were not used at all: both are
 * copyrighted, and docs/LEARNING.md rules them out by name.
 *
 * Marking. `gap` answers are compared after trimming, lowercasing and stripping
 * edge punctuation (server/marking.js), and a `|` separates spellings of the
 * same answer, not different answers. `essay` and `speaking` items carry no
 * answer at all: they are rubric-marked, and marking leaves them pending rather
 * than scoring them zero.
 */
'use strict';

const SOURCE = 'VPET Prep — written for this platform';
const LICENCE = 'Project content; no third-party list reproduced';

/* ---------------- Part A · Sentence Completion (writing, gap) ----------------
   One word missing per sentence, and only one word can fill it. Every gap here
   turns on a dependent preposition, a particle or an inversion — the places
   where knowing the word is not the same as knowing what follows it. */
const PART_A = [
  ['vpet-a-01', 'A2', 'She has worked at this school ___ 2019.', 'since',
    'since + a point in time; "for" would need a length of time ("for six years").'],
  ['vpet-a-02', 'A2', 'I am not very good ___ remembering names.', 'at',
    'good at + noun or -ing. "good in" is a common first-language transfer error.'],
  ['vpet-a-03', 'B1', 'The meeting has been put ___ until Friday.', 'off',
    'put off = postpone. "put back" is possible for a schedule but not with "until" here.'],
  ['vpet-a-04', 'B1', 'He apologised ___ arriving so late.', 'for',
    'apologise for + -ing. Apologise to a person, for a thing.'],
  ['vpet-a-05', 'B1', 'It took me months to get used ___ working nights.', 'to',
    'get used to + -ing. The "to" here is a preposition, which is why "working" is not "work".'],
  ['vpet-a-06', 'B2', 'The report must be handed in ___ Friday at the latest.', 'by',
    'by = not later than. "until" would mean the handing in continues up to Friday.'],
  ['vpet-a-07', 'B2', 'She is perfectly capable ___ running the department alone.', 'of',
    'capable of + -ing. Compare "able to run", which takes the infinitive.'],
  ['vpet-a-08', 'B2', 'Whether the match goes ahead depends ___ the weather.', 'on',
    'depend on. The verb never takes "of" in standard English, though the noun phrase "dependent on" mirrors it.'],
  ['vpet-a-09', 'B2', 'We had no choice ___ to cancel the trip.', 'but',
    'no choice but to + infinitive. A fixed frame; "except" needs "except to" and reads oddly here.'],
  ['vpet-a-10', 'B2', 'Hardly ___ I sat down when the telephone rang.', 'had',
    'Hardly had + subject + past participle … when …. Fronting "hardly" forces the inversion.']
];

/* ---------------- Part B · Passage Reconstruction (writing, essay) ----------------
   The passage is shown for a short time, then hidden, and the candidate rebuilds
   it in their own words. Length is kept near 50 words: long enough that copying
   it verbatim from memory is not the point, short enough to hold. */
const PART_B = [
  ['vpet-b-01', 'B1',
    'Read this passage, then write it again in your own words after it disappears.\n\n' +
    'The town library opened a small repair workshop last spring. Twice a month, ' +
    'volunteers help residents mend lamps, radios and bicycles instead of throwing ' +
    'them away. The service is free, and it has become so popular that people now ' +
    'arrive an hour before the doors open.',
    'Look for the three facts (what opened, how often it runs, why it is busy) rather than matching wording.'],
  ['vpet-b-02', 'B2',
    'Read this passage, then write it again in your own words after it disappears.\n\n' +
    'When the company let staff choose where to work, most expected everyone to stay ' +
    'at home. In practice, about half came into the office two or three days a week, ' +
    'mainly for meetings they felt went badly on a screen. The finding surprised the ' +
    'managers, who had already begun looking for a smaller building.',
    'The turn in the passage is "surprised the managers" — a reconstruction that misses it has lost the point.'],
  ['vpet-b-03', 'B2',
    'Read this passage, then write it again in your own words after it disappears.\n\n' +
    'The city put five hundred bicycles on its streets and asked nobody to pay for the ' +
    'first half hour. Within a year, short car journeys in the centre had fallen by a ' +
    'tenth. Cities that copied the scheme saw smaller gains, largely because they kept ' +
    'the bicycles inside a single district.',
    'Both the result and its explanation must survive. Reporting only the fall in car journeys is half the passage.']
];

/* ---------------- Part C · Reading Comprehension (reading, mcq) ----------------
   A short passage with one question. The distractors are all traceable to the
   passage — a wrong option that mentions nothing in the text is not a distractor,
   it is padding. */
const PART_C = [
  ['vpet-c-01', 'B1',
    'A neighbourhood group planted forty trees along the main road in March. By August, ' +
    'eleven had died. The group blamed the dry summer, but the council pointed out that ' +
    'the trees nearest the bus stops, where the soil is compacted by foot traffic, had ' +
    'died first.\n\nWhat does the council suggest caused the losses?',
    ['The ground where the trees stood', 'The unusually dry summer',
      'Planting too late in the year', 'Damage caused by buses'],
    'The ground where the trees stood',
    'The council contrasts its explanation with the dry summer and points at compacted soil. "Damage caused by buses" reuses the bus stops without the passage saying it.'],
  ['vpet-c-02', 'B2',
    'Reviewers praised the novel for its ending, which most readers do not see coming. ' +
    'The author has said she wrote that chapter first and spent two years building the ' +
    'rest of the book towards it. Critics who disliked the novel tended to object not to ' +
    'the ending but to how slowly the middle moves.\n\nWhat do the critical reviews object to?',
    ['The pace of the middle section', 'The ending being predictable',
      'The order in which the book was written', 'The length of the whole novel'],
    'The pace of the middle section',
    'The last sentence says so directly, and rules out the ending. "The order it was written in" is stated but never criticised.'],
  ['vpet-c-03', 'B2',
    'The museum stopped charging for entry in 2021 and visitor numbers doubled. Income did ' +
    'not fall, because the shop and cafe took more than the tickets ever had. The director ' +
    'is cautious all the same: two thirds of the extra visitors live within the city, and ' +
    'the museum had hoped to draw people from further away.\n\nWhy is the director cautious?',
    ['The new visitors are mostly local', 'The museum is losing money',
      'The shop and cafe are too small', 'Visitor numbers have started to fall'],
    'The new visitors are mostly local',
    'The caution is about who came, not how many. The passage says plainly that income did not fall, which removes the second option.']
];

/* ---------------- Part D · E-Mail Writing (writing, essay) ----------------
   The register is named in the prompt, because register is half of what this
   part marks. A task that only says "write an email" cannot fairly penalise
   someone for being too casual. */
const PART_D = [
  ['vpet-d-01', 'B1',
    'Your neighbour has been doing building work early in the morning and it wakes you. ' +
    'You get on well and want to keep it that way.\n\n' +
    'Write an email of about 120 words. Say what the problem is, how it affects you, and ' +
    'suggest something that would work for both of you. Keep the tone friendly but clear.',
    'Marked on task, tone and accuracy. A polite email that never states the problem has not done the task.'],
  ['vpet-d-02', 'B2',
    'You ordered materials for your company. They were promised on the 3rd and have still ' +
    'not arrived on the 12th. Your own work has stopped as a result.\n\n' +
    'Write an email of about 150 words to the supplier. State the facts, explain the ' +
    'consequence, and say what you now need and by when. Use a formal register throughout.',
    'Formal register is part of the mark here. So is a specific deadline: "as soon as possible" leaves the supplier nothing to meet.']
];

/* ---------------- Part I · Speaking Situations (speaking) ----------------
   No audio: the situation is read, and the candidate speaks. Each one names a
   relationship and a difficulty, because register in speech comes from who you
   are talking to. */
const PART_I = [
  ['vpet-i-01', 'B1',
    'A colleague you know well has asked you to swap shifts on Saturday. You cannot do ' +
    'Saturday, but you could take their Sunday.\n\n' +
    'Speak for up to one minute. Turn down the request, explain why, and offer the alternative.',
    'Scored on whether the refusal, the reason and the offer are all there, and on whether the tone fits a colleague rather than a stranger.'],
  ['vpet-i-02', 'B2',
    'You have arrived at your hotel late in the evening. The room you were given is directly ' +
    'above a bar and is too noisy to sleep in. You are speaking to the receptionist.\n\n' +
    'Speak for up to one minute. Describe the problem, say what you would like done, and stay polite.',
    'The difficulty is being firm and polite at once. A complaint that never asks for anything, or one that becomes rude, both lose marks.']
];

/** Every item, flattened into the shape the seed inserts. */
function rows() {
  const out = [];
  const push = (key, part, skill, type, level, prompt, options, answer, explanation) =>
    out.push({
      key, part, skill, type, level, prompt,
      options: options || [],
      answer: answer || '',
      explanation,
      tags: ['vpet', 'part-' + part.toLowerCase()],
      source: SOURCE,
      licence: LICENCE
    });

  for (const [key, level, prompt, answer, explanation] of PART_A)
    push(key, 'A', 'writing', 'gap', level, prompt, [], answer, explanation);
  for (const [key, level, prompt, explanation] of PART_B)
    push(key, 'B', 'writing', 'essay', level, prompt, [], '', explanation);
  for (const [key, level, prompt, options, answer, explanation] of PART_C)
    push(key, 'C', 'reading', 'mcq', level, prompt, options, answer, explanation);
  for (const [key, level, prompt, explanation] of PART_D)
    push(key, 'D', 'writing', 'essay', level, prompt, [], '', explanation);
  for (const [key, level, prompt, explanation] of PART_I)
    push(key, 'I', 'speaking', 'speaking', level, prompt, [], '', explanation);

  return out;
}

module.exports = { rows, SOURCE, LICENCE };
