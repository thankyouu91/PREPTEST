/**
 * VPET items for the four parts that play no audio — A, B, C and D.
 *
 * 18 items per level, 36 in total, completing the 55-item blueprint alongside
 * the audio parts in `server/data/vpet-scripts.js`.
 *
 *   A  Sentence Completion   10  writing   one word missing, typed in
 *   B  Passage Reconstruction 3  writing   read, then rebuild from memory
 *   C  Reading Comprehension  3  reading   short passage, one question
 *   D  E-Mail Writing         2  writing   reply in a set register
 *
 * ---------------------------------------------------------------------------
 * Levels, from docs/ACADEMIC.md §3
 *
 *   Level 1  measures B1 and below.  Everyday contexts, high-frequency words,
 *            one idea per sentence.
 *   Level 2  measures B2 and above.  Work and study, and answers that turn on
 *            a qualifier or a collocation rather than on a keyword.
 * ---------------------------------------------------------------------------
 *
 * WHAT MAKES A PART A ITEM WORK
 *
 * Exactly one word can fill the gap. That sounds obvious and is the hardest
 * thing about writing them: "She is good ___ playing the piano" admits only
 * "at", but "She has a ___ grasp of the subject" admits firm, good, strong,
 * solid and several more, and any of them is defensible. An item with four
 * defensible answers marks nothing — it marks whether the candidate guessed
 * the one the author happened to think of.
 *
 * Where more than one form is genuinely correct, `answer` lists the variants
 * separated by `|` and the marker accepts any of them. That is honesty about
 * the language, not laxity: "rests|rested|hinges" are all right, and a marker
 * that accepts only the first is wrong rather than strict.
 *
 * WHY B AND D CARRY KEY POINTS
 *
 * Both are marked against a rubric rather than a key, and both have a content
 * dimension separate from the language: did the reconstruction keep the facts,
 * did the email do everything it was asked to do. `keyPoints` is what the
 * content criterion is checked against — the same mechanism as the part J
 * retellings (docs/VOICE.md §6.1). Without it a marker can only judge the
 * English, which is half the task.
 *
 * `passage` is separate from `prompt` because part B hides the passage after a
 * fixed time while the instruction stays on screen. One field could not do
 * both.
 */
'use strict';

/* ==========================================================================
 * LEVEL 1 — B1 and below
 * ======================================================================== */

const LEVEL_1 = [

  /* ---------------- Part A · Sentence Completion ----------------
     One word per gap, testing grammar and collocation in context rather than
     in isolation. Each gap has exactly one defensible filler. */

  { ref: 'A1', part: 'A', type: 'gap',
    prompt: 'I have been living in this city ______ 2019.',
    answer: 'since',
    explanation: '"Since" with a point in time; "for" would need a length of time.' },

  { ref: 'A2', part: 'A', type: 'gap',
    prompt: 'She is very good ______ playing the piano.',
    answer: 'at',
    explanation: '"Good at" is fixed. No other preposition works here.' },

  { ref: 'A3', part: 'A', type: 'gap',
    prompt: 'If it ______ tomorrow, we will stay at home.',
    answer: 'rains',
    explanation: 'First conditional: present simple in the if-clause, not "will rain".' },

  { ref: 'A4', part: 'A', type: 'gap',
    prompt: 'This is the man ______ helped me yesterday.',
    answer: 'who|that',
    explanation: 'Subject relative pronoun for a person. Both forms are standard.' },

  { ref: 'A5', part: 'A', type: 'gap',
    prompt: 'There isn’t ______ milk left in the fridge.',
    answer: 'any',
    explanation: '"Any" with an uncountable noun in a negative sentence.' },

  { ref: 'A6', part: 'A', type: 'gap',
    prompt: 'My sister speaks English ______ than I do.',
    answer: 'better',
    explanation: 'Irregular comparative of "well". "More well" is not English.' },

  { ref: 'A7', part: 'A', type: 'gap',
    prompt: 'I am looking forward ______ meeting your family.',
    answer: 'to',
    explanation: '"Look forward to" takes a preposition, then -ing. The trap is reading "to" as an infinitive marker.' },

  { ref: 'A8', part: 'A', type: 'gap',
    prompt: 'You ______ to wear a helmet when you ride a motorbike.',
    answer: 'have|need',
    explanation: 'Obligation with a to-infinitive. "Must" is also obligation but never takes "to".' },

  { ref: 'A9', part: 'A', type: 'gap',
    prompt: 'She has worked here for ten years, ______ she?',
    answer: 'hasn’t|hasnt|has not',
    explanation: 'Question tag: positive statement takes a negative tag, and it repeats the auxiliary.' },

  { ref: 'A10', part: 'A', type: 'gap',
    prompt: 'The film was so boring that I fell ______ before the end.',
    answer: 'asleep',
    explanation: '"Fall asleep" is fixed. "Sleeping" and "down" both break the collocation.' },

  /* ---------------- Part B · Passage Reconstruction ----------------
     The passage is shown for a fixed time, then hidden. The candidate rebuilds
     it in their own words — so the marker checks the facts kept (keyPoints)
     alongside the English. Copying verbatim is not the task and the rubric
     should not reward it. */

  { ref: 'B1', part: 'B', type: 'essay',
    passage:
      'Minh leaves his house at half past six every morning. He walks to the bus stop, ' +
      'which takes about ten minutes, and catches the number 12 bus into the centre. ' +
      'The journey usually takes twenty minutes, but on Mondays the traffic is worse and ' +
      'it can take almost forty. He always arrives before eight, because his shift starts ' +
      'at eight fifteen and he likes to have a coffee first.',
    prompt: 'You have two minutes to read the passage. It will then be hidden. Rewrite it in your own words, keeping as much of the information as you can.',
    keyPoints: [
      'Minh leaves home at 6.30 every morning',
      'He walks about ten minutes to the bus stop',
      'He takes the number 12 bus into the centre',
      'The journey is usually twenty minutes, but up to forty on Mondays',
      'He arrives before eight because his shift starts at 8.15',
      'He likes to have a coffee before starting work'
    ] },

  { ref: 'B2', part: 'B', type: 'essay',
    passage:
      'The small bookshop on Le Loi street closed last month after twenty-two years. ' +
      'The owner, who is now seventy, said that he was not losing money, but that he was tired ' +
      'and none of his children wanted to take it over. Regular customers held a small party ' +
      'on the last day. One of them, a teacher, said she had bought her first English dictionary ' +
      'there when she was fifteen.',
    prompt: 'You have two minutes to read the passage. It will then be hidden. Rewrite it in your own words, keeping as much of the information as you can.',
    keyPoints: [
      'A bookshop on Le Loi street closed last month',
      'It had been open for twenty-two years',
      'The owner is seventy and was tired, not losing money',
      'None of his children wanted to take over the shop',
      'Regular customers held a party on the last day',
      'A teacher said she bought her first English dictionary there aged fifteen'
    ] },

  { ref: 'B3', part: 'B', type: 'essay',
    passage:
      'Our office moved to a new building in March. The new place is further from the station — ' +
      'about fifteen minutes on foot instead of five — but it has a proper kitchen and much more ' +
      'daylight. Most people complained about the walk for the first two weeks and then stopped. ' +
      'One colleague, who had been driving to work for years, now walks from the station and says ' +
      'he feels better for it.',
    prompt: 'You have two minutes to read the passage. It will then be hidden. Rewrite it in your own words, keeping as much of the information as you can.',
    keyPoints: [
      'The office moved to a new building in March',
      'It is further from the station: fifteen minutes on foot instead of five',
      'The new building has a proper kitchen and more daylight',
      'People complained about the walk for about two weeks then stopped',
      'One colleague used to drive to work',
      'He now walks from the station and feels better for it'
    ] },

  /* ---------------- Part C · Reading Comprehension ----------------
     Short passage, one question. The answer is stated in the text; the
     distractors are drawn from true details mentioned for other reasons, so
     the item tests reading rather than plausibility. */

  { ref: 'C1', part: 'C', type: 'mcq',
    passage:
      'NOTICE TO RESIDENTS\n\n' +
      'The lift in Block B will be out of service from Monday 3 June until Friday 7 June while ' +
      'the motor is replaced. Residents on floors 6 to 12 who need help carrying shopping should ' +
      'contact the building office before 4pm and a member of staff will assist. ' +
      'The lift in Block A is unaffected and may be used by anyone during this period.',
    prompt: 'What should a resident on floor 8 do if they need help with shopping?',
    options: [
      'Contact the building office before 4pm.',
      'Use the lift in Block A instead.',
      'Wait until Friday 7 June.',
      'Ask a neighbour on a lower floor.'
    ],
    answer: 'Contact the building office before 4pm.',
    explanation: 'The notice gives one instruction for that situation. Block A is offered to everyone, not as the answer to needing help carrying things.' },

  { ref: 'C2', part: 'C', type: 'mcq',
    passage:
      'From: Ha Nguyen\nTo: All staff\nSubject: Parking\n\n' +
      'From next week the car park will be resurfaced, one half at a time. The work should take ' +
      'three weeks in total. While it is going on there will be roughly half the usual number of ' +
      'spaces, so please use the spaces nearest the gate only if you genuinely need them — ' +
      'those are being kept for people carrying equipment.',
    prompt: 'Who should use the spaces nearest the gate?',
    options: [
      'People carrying equipment.',
      'Anyone who arrives early.',
      'Staff who work three weeks or more.',
      'Nobody, until the work is finished.'
    ],
    answer: 'People carrying equipment.',
    explanation: 'Stated in the last line. "Three weeks" is how long the work lasts, not a rule about who may park.' },

  { ref: 'C3', part: 'C', type: 'mcq',
    passage:
      'Thank you for your order. Your item was sent on 12 May and should arrive within five ' +
      'working days. If it has not arrived by 19 May, please reply to this email with your order ' +
      'number and we will send a replacement free of charge. Please do not return the original ' +
      'item if it arrives later — you may keep both.',
    prompt: 'What should the customer do if the item arrives on 21 May, after a replacement has been sent?',
    options: [
      'Keep both items.',
      'Return the first item.',
      'Reply with the order number again.',
      'Pay for the second item.'
    ],
    answer: 'Keep both items.',
    explanation: 'The final sentence covers exactly this case. The distractors are all reasonable-sounding actions the email rules out.' },

  /* ---------------- Part D · E-Mail Writing ----------------
     A situation and a register. keyPoints are the things the email must do —
     the task criterion is scored against them, separately from the English. */

  { ref: 'D1', part: 'D', type: 'essay',
    prompt:
      'You booked a hotel room for two nights but you now need to cancel because of a family ' +
      'problem. Write an email to the hotel. Explain that you need to cancel, say briefly why, ' +
      'ask whether you can get your deposit back, and ask whether you could book again in ' +
      'September instead. Write about 120 words in a polite, fairly formal style.',
    keyPoints: [
      'States clearly that the booking is being cancelled',
      'Gives a brief reason without excessive detail',
      'Asks whether the deposit can be refunded',
      'Asks about rebooking in September',
      'Uses a polite, fairly formal register throughout',
      'Opens and closes appropriately for an email to a business'
    ] },

  { ref: 'D2', part: 'D', type: 'essay',
    prompt:
      'A friend from another country is going to visit your city for three days next month. ' +
      'Write an email to your friend. Say how pleased you are, suggest two things to do, ' +
      'warn them about the weather at that time of year, and ask what time their flight arrives. ' +
      'Write about 120 words in a friendly, informal style.',
    keyPoints: [
      'Expresses pleasure about the visit',
      'Suggests two specific things to do',
      'Warns about the weather at that time of year',
      'Asks what time the flight arrives',
      'Uses a friendly, informal register throughout',
      'Reads as an email to a friend, not to a stranger'
    ] }
];

/* ==========================================================================
 * LEVEL 2 — B2 and above
 * ======================================================================== */

const LEVEL_2 = [

  /* ---------------- Part A · Sentence Completion ---------------- */

  { ref: 'A1', part: 'A', type: 'gap',
    prompt: 'The findings were largely ______ with the results of the earlier study.',
    answer: 'consistent',
    explanation: '"Consistent with" is the fixed collocation for agreement between findings.' },

  { ref: 'A2', part: 'A', type: 'gap',
    prompt: 'Little ______ we know that the decision had already been taken.',
    answer: 'did',
    explanation: 'Inversion after a fronted negative adverbial requires the auxiliary before the subject.' },

  { ref: 'A3', part: 'A', type: 'gap',
    prompt: 'The report ______ light on a problem nobody had noticed.',
    answer: 'shed|sheds|shone',
    explanation: '"Shed light on" is fixed. Present or past both fit the sentence.' },

  { ref: 'A4', part: 'A', type: 'gap',
    prompt: 'The committee took her objections into ______ before voting.',
    answer: 'account|consideration',
    explanation: 'Two fixed phrases are equally standard here, so both are accepted.' },

  { ref: 'A5', part: 'A', type: 'gap',
    prompt: 'Their whole argument ______ on an assumption that nobody has tested.',
    answer: 'rests|rested|hinges|hinged',
    explanation: '"Rest on" and "hinge on" both take an assumption as their object.' },

  { ref: 'A6', part: 'A', type: 'gap',
    prompt: 'The proposal was turned ______ without any real discussion.',
    answer: 'down',
    explanation: 'Phrasal verb "turn down" for rejecting. "Off", "over" and "up" all mean something else.' },

  { ref: 'A7', part: 'A', type: 'gap',
    prompt: '______ for the strike, the shipment would have arrived on Tuesday.',
    answer: 'But',
    explanation: '"But for" introduces a counterfactual cause. The third conditional in the main clause is the clue.' },

  { ref: 'A8', part: 'A', type: 'gap',
    prompt: 'She is widely ______ as the leading authority in the field.',
    answer: 'regarded|recognised|recognized',
    explanation: '"Widely regarded as" and "widely recognised as" are both standard.' },

  { ref: 'A9', part: 'A', type: 'gap',
    prompt: 'No sooner ______ the meeting begun than the power failed.',
    answer: 'had',
    explanation: 'Inversion after "no sooner", and the past perfect is required before "than".' },

  { ref: 'A10', part: 'A', type: 'gap',
    prompt: 'The evidence falls well ______ of what would be needed to prove the claim.',
    answer: 'short',
    explanation: '"Fall short of" is fixed. The adverb "well" before it is a strong signal.' },

  /* ---------------- Part B · Passage Reconstruction ---------------- */

  { ref: 'B1', part: 'B', type: 'essay',
    passage:
      'A study published last year examined why so many workplace training programmes fail to ' +
      'change behaviour. The researchers followed four hundred employees across eleven companies ' +
      'for eighteen months. They found that what people learned in training was retained well ' +
      'enough, but that almost none of it survived contact with a manager who had not attended ' +
      'the same course. The authors concluded that training a team without training the person ' +
      'who supervises it is largely wasted effort.',
    prompt: 'You have two minutes to read the passage. It will then be hidden. Rewrite it in your own words, keeping as much of the information as you can.',
    keyPoints: [
      'A study last year examined why workplace training fails to change behaviour',
      'It followed four hundred employees across eleven companies',
      'The study ran for eighteen months',
      'What people learned was retained adequately',
      'The learning did not survive contact with an untrained manager',
      'Training a team without training its supervisor is largely wasted'
    ] },

  { ref: 'B2', part: 'B', type: 'essay',
    passage:
      'When a city introduced a charge for driving into its centre, opposition was fierce and ' +
      'largely came from people who did not drive there. Support rose sharply within a year of the ' +
      'scheme starting, and by the third year a referendum to remove it was defeated comfortably. ' +
      'Researchers who studied the shift concluded that most people had not changed their minds ' +
      'about the principle. They had simply stopped noticing the charge and started noticing the ' +
      'shorter journeys.',
    prompt: 'You have two minutes to read the passage. It will then be hidden. Rewrite it in your own words, keeping as much of the information as you can.',
    keyPoints: [
      'A city introduced a charge for driving into the centre',
      'Opposition was fierce and came mostly from people who did not drive there',
      'Support rose sharply within a year of the scheme starting',
      'A referendum to remove the charge was defeated in the third year',
      'Researchers found most people had not changed their view of the principle',
      'They had stopped noticing the charge and noticed the shorter journeys instead'
    ] },

  { ref: 'B3', part: 'B', type: 'essay',
    passage:
      'The manuscript had been catalogued in 1908 as an eighteenth-century copy and left ' +
      'undisturbed for over a century. A doctoral student examining the binding noticed that the ' +
      'thread was inconsistent with the date on the catalogue card. Analysis of the paper placed ' +
      'it two hundred years earlier. The library has since begun re-examining several hundred ' +
      'items catalogued by the same archivist, on the reasonable assumption that one error of ' +
      'that size is rarely the only one.',
    prompt: 'You have two minutes to read the passage. It will then be hidden. Rewrite it in your own words, keeping as much of the information as you can.',
    keyPoints: [
      'A manuscript was catalogued in 1908 as an eighteenth-century copy',
      'It sat undisturbed for over a hundred years',
      'A doctoral student noticed the binding thread did not match the catalogued date',
      'Analysis of the paper dated it two hundred years earlier',
      'The library is re-examining several hundred items catalogued by the same archivist',
      'The assumption is that an error that large is rarely isolated'
    ] },

  /* ---------------- Part C · Reading Comprehension ---------------- */

  { ref: 'C1', part: 'C', type: 'mcq',
    passage:
      'The scheme has been described as a subsidy, which it is not, and as a loan, which is closer ' +
      'but still incomplete. Repayment is tied to income and stops entirely if income falls below a ' +
      'threshold. What remains after twenty-five years is written off. In practice this makes it ' +
      'behave less like a debt and more like a graduate tax with an upper limit — a distinction ' +
      'that matters a great deal when applying for a mortgage, and not at all before then.',
    prompt: 'What does the writer suggest about the distinction they draw?',
    options: [
      'It becomes important only in specific circumstances.',
      'It has no practical consequences at all.',
      'It shows the scheme is really a subsidy.',
      'It applies only after twenty-five years.'
    ],
    answer: 'It becomes important only in specific circumstances.',
    explanation: 'The final clause states when it matters and when it does not. The item tests whether the candidate reads the qualifier rather than the topic.' },

  { ref: 'C2', part: 'C', type: 'mcq',
    passage:
      'It is often said that the department was reorganised because of the audit. The timing ' +
      'supports this, and the director has never denied it. But the proposal had been drafted ' +
      'eight months before the auditors arrived, circulated twice, and shelved for lack of ' +
      'support. What the audit provided was not the idea but the argument — and, more usefully, ' +
      'the moment at which objecting became difficult.',
    prompt: 'What does the writer say the audit actually contributed?',
    options: [
      'A reason to act on a plan that already existed.',
      'The original idea for the reorganisation.',
      'Evidence that the department was failing.',
      'A delay of eight months to the proposal.'
    ],
    answer: 'A reason to act on a plan that already existed.',
    explanation: '"Not the idea but the argument" is the sentence being tested. The first distractor is what the passage explicitly rules out.' },

  { ref: 'C3', part: 'C', type: 'mcq',
    passage:
      'Reviewers praised the second edition for its clarity, and it is certainly easier to read ' +
      'than the first. Whether it is a better book is another question. The passages that have ' +
      'gone were the ones where the author hesitated, qualified, and admitted what was not known. ' +
      'What remains reads more confidently and claims more than the evidence in the same volume ' +
      'will support.',
    prompt: 'What is the writer’s view of the second edition?',
    options: [
      'Its greater clarity came at the cost of accuracy.',
      'It is worse written than the first edition.',
      'It contains less evidence than the first edition.',
      'Reviewers were wrong to find it clear.'
    ],
    answer: 'Its greater clarity came at the cost of accuracy.',
    explanation: 'The writer concedes the clarity and objects to what produced it. The distractors each contradict something the passage concedes.' },

  /* ---------------- Part D · E-Mail Writing ---------------- */

  { ref: 'D1', part: 'D', type: 'essay',
    prompt:
      'You manage a small team. A supplier has been late with three deliveries in two months, ' +
      'and it is now affecting your own deadlines. You do not want to end the relationship. ' +
      'Write an email to your contact at the supplier. Set out the problem with the facts, ' +
      'explain the effect on your work, ask what has changed at their end, and propose a way to ' +
      'prevent it happening again. Write about 180 words in a professional style.',
    keyPoints: [
      'States the problem factually, with the three late deliveries',
      'Explains the effect on the writer’s own deadlines',
      'Asks what has changed at the supplier’s end',
      'Proposes a concrete way to prevent recurrence',
      'Keeps the relationship intact — firm without being hostile',
      'Maintains a professional register throughout'
    ] },

  { ref: 'D2', part: 'D', type: 'essay',
    prompt:
      'You applied for a place on a training course and were not accepted. The rejection gave no ' +
      'reason. You would like to apply again next year. Write an email to the course administrator. ' +
      'Thank them for considering your application, ask for feedback on why it was unsuccessful, ' +
      'ask what would strengthen a future application, and say that you intend to apply again. ' +
      'Write about 180 words in a professional style.',
    keyPoints: [
      'Thanks them for considering the application',
      'Asks for feedback on the reasons for rejection',
      'Asks specifically what would strengthen a future application',
      'States the intention to apply again next year',
      'Asks without sounding aggrieved or entitled',
      'Maintains a professional register throughout'
    ] }
];

/* ==========================================================================
 * Defaults per part, so the items above carry only what varies.
 * ======================================================================== */

const PART_DEFAULTS = {
  A: { skill: 'writing' },
  B: { skill: 'writing' },
  C: { skill: 'reading' },
  D: { skill: 'writing' }
};

const CEFR_FOR_LEVEL = { 1: 'B1', 2: 'B2' };

/** Every item, flattened and filled in, in the shape the importer expects. */
function allItems() {
  const out = [];
  for (const [level, list] of [[1, LEVEL_1], [2, LEVEL_2]]) {
    for (const item of list) {
      const d = PART_DEFAULTS[item.part] || {};
      out.push({
        ref: `${item.ref}-L${level}`,
        part: item.part,
        level,
        cefr: CEFR_FOR_LEVEL[level],
        skill: d.skill,
        type: item.type,
        /* No audio in these parts. Kept in the shape so one importer handles
           both files without branching on which one it came from. */
        script: '',
        passage: item.passage || '',
        prompt: item.prompt || '',
        options: item.options || [],
        answer: item.answer || '',
        explanation: item.explanation || '',
        keyPoints: item.keyPoints || []
      });
    }
  }
  return out;
}

module.exports = { LEVEL_1, LEVEL_2, PART_DEFAULTS, CEFR_FOR_LEVEL, allItems };
