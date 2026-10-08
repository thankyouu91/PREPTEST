/**
 * VPET item bank — one complete paper, built to the owner's specification.
 *
 * Source of truth: `VPET_test.xlsx`, supplied 2026-10-08. Fifty-eight items in
 * the counts that sheet fixes — A 10, B 3, C 6, D 2, E 8, F 8, G 6, H 10, I 2,
 * J 3 — and in the shapes it describes. The previous bank was emptied and this
 * written from nothing, because three parts had the wrong shape rather than the
 * wrong content: C ran one question per passage where the sheet wants two, G was
 * multiple choice where the sheet wants a spoken answer, and I had no audio where
 * the sheet wants the situation read aloud as well as shown.
 *
 * ---------------------------------------------------------------------------
 * SHARED STIMULUS
 *
 * Two parts hang several questions off one piece of material: C puts two
 * questions on each reading passage, G puts three on each spoken story. Those
 * rows carry the same `stimulusKey`, and the runner shows the passage once and
 * the questions against it. Without that key the runner would have no way to
 * tell "six passages with one question" from "three passages with two", which
 * is exactly the distinction the sheet draws and the old bank lost.
 *
 * ---------------------------------------------------------------------------
 * WHAT GETS SPOKEN
 *
 * `script` is the text sent to the voice. It exists on every item in an audio
 * part — E, F, G, H, I, J — and nowhere else. Part F is the unusual one: the
 * sheet says the screen shows only "Select the correct response" and three
 * lettered buttons, so the prompt AND all three options are spoken, and the
 * option text in `options` is there to be read aloud and to be marked against,
 * never to be displayed.
 *
 * Part I is the other unusual one: `stimulus: 'both'` in the blueprint, so the
 * situation is shown on screen and read aloud at the same time.
 *
 * ---------------------------------------------------------------------------
 * PROVENANCE
 *
 * Written for this platform. Nothing is copied from a published test or a
 * licensed word list. Levels are judged against the CEFR bands docs/LEARNING.md
 * sets out, using NGSL and NAWL (both CC BY-SA) as a reference for how common a
 * word is — consulted, not reproduced. Oxford 3000/5000 and the English
 * Vocabulary Profile were not used at all: both are copyrighted, and
 * docs/LEARNING.md rules them out by name.
 *
 * Marking. `gap` answers are compared after trimming, lowercasing and stripping
 * edge punctuation (server/marking.js), and a `|` separates spellings of the
 * same answer, not different answers. `essay` and `speaking` items carry no
 * answer at all: they are rubric-marked against `keyPoints`, and marking leaves
 * them pending rather than scoring them zero.
 */
'use strict';

const SOURCE = 'VPET Prep — written for this platform';
const LICENCE = 'Project content; no third-party list reproduced';

/* ---------------- Part A · Sentence Completion (writing, gap, 25 s) ----------
   One word missing, and only one word fits. Every gap turns on a dependent
   preposition, a particle or an inversion — the places where knowing the word
   is not the same as knowing what follows it. */
const PART_A = [
  ['vpet-a-01', 'A2', 'She has worked at this branch ___ 2019.', 'since',
    'since + a point in time; "for" would need a length of time ("for six years").'],
  ['vpet-a-02', 'A2', 'I am not very good ___ remembering names.', 'at',
    'good at + noun or -ing. "good in" is a common first-language transfer error.'],
  ['vpet-a-03', 'B1', 'The meeting has been put ___ until Friday.', 'off',
    'put off = postpone. "put back" is possible for a schedule but not with "until" here.'],
  ['vpet-a-04', 'B1', 'He apologised ___ arriving so late.', 'for',
    'apologise for + -ing. You apologise to a person, for a thing.'],
  ['vpet-a-05', 'B1', 'It took me months to get used ___ working nights.', 'to',
    'get used to + -ing. The "to" is a preposition, which is why it is "working", not "work".'],
  ['vpet-a-06', 'B2', 'The report must be handed in ___ Friday at the latest.', 'by',
    'by = not later than. "until" would mean the handing in continues up to Friday.'],
  ['vpet-a-07', 'B2', 'She is perfectly capable ___ running the department alone.', 'of',
    'capable of + -ing. Compare "able to run", which takes the infinitive.'],
  ['vpet-a-08', 'B2', 'Whether the launch goes ahead depends ___ the budget.', 'on',
    'depend on. The verb never takes "of" in standard English.'],
  ['vpet-a-09', 'B2', 'We had no choice ___ to cancel the order.', 'but',
    'no choice but to + infinitive. A fixed frame.'],
  ['vpet-a-10', 'C1', 'Hardly ___ I sat down when the telephone rang.', 'had',
    'Hardly had + subject + past participle … when …. Fronting "hardly" forces the inversion.']
];

/* ---------------- Part B · Passage Reconstruction (writing, essay) -----------
   30 s to read, the passage disappears, 90 s to rebuild it in your own words.
   Scored for content, not for word-for-word recall — so the key points are the
   facts that must survive, not the sentences they arrived in. */
const PART_B = [
  ['vpet-b-01', 'B1',
    'The office will move to the third floor over the weekend of 14 March. Staff should pack their own desk items into the boxes provided and label each box with their name and team. IT will move computers and monitors, so nobody should unplug anything. Anyone who needs access to the building on Saturday must tell reception by Thursday.',
    'Five facts, one instruction each. A reconstruction that keeps the date and loses "do not unplug" has kept the easy half.',
    ['Office moves to the third floor', 'Weekend of 14 March',
     'Staff pack their own desk items into labelled boxes',
     'IT moves computers — staff must not unplug anything',
     'Saturday access must be requested from reception by Thursday',
     'Boxes are provided by the company — staff do not supply their own']],
  ['vpet-b-02', 'B2',
    'From next month the company will reimburse train travel at the standard fare only. Anyone booking a first-class ticket will be repaid the standard price and will cover the difference themselves. Receipts must be submitted within thirty days of travel, and claims made after that will not be processed. The policy does not apply to journeys booked before the first of the month.',
    'The trap is the exception at the end: a candidate who reconstructs the rule and drops the carve-out has changed the policy.',
    ['Train travel reimbursed at standard fare only from next month',
     'First-class bookings repaid at standard price, traveller pays the difference',
     'Receipts within thirty days of travel',
     'Late claims are not processed',
     'Journeys booked before the first of the month are exempt',
     'The traveller is repaid only the standard price, never the first-class fare']],
  ['vpet-b-03', 'B2',
    'The supplier has confirmed that the delayed components left the port on Tuesday and should reach the warehouse by the end of next week. Production can therefore restart on the Monday following. Because the line has been idle for eleven days, the team will work one Saturday in October to recover the lost output. No overtime will be required beyond that single day.',
    'Two dates and a consequence. "One Saturday, and no more overtime than that" is a single point, and splitting it loses the reassurance.',
    ['Delayed components left the port on Tuesday',
     'Expected at the warehouse by the end of next week',
     'Production restarts the following Monday',
     'Line idle eleven days, so one Saturday in October will be worked',
     'No overtime beyond that one day',
     'The line has been idle for eleven days']]
];

/* ---------------- Part C · Reading Comprehension (reading, mcq) --------------
   Three passages, two questions each, four options a question, three minutes a
   passage. Rows sharing a `stimulusKey` share the passage. The second question
   on each passage is deliberately the harder one — inference rather than
   retrieval — so the pair separates skimming from reading. */
const PART_C = [
  ['vpet-c-p1', 'B1',
    'Riverside Logistics has changed the way it handles customer complaints. Until last year every complaint went to the branch that made the delivery, and a manager there decided what to do. Branches handled similar cases differently, and customers who moved between regions noticed. Since January all complaints have gone to a single team in Leeds, which applies one set of rules. Branch managers are still told the outcome, but they no longer decide it.',
    [['vpet-c-01', 'What changed in January?',
      ['Complaints are now decided by one central team.',
       'Branches stopped receiving complaints altogether.',
       'Customers must now complain in writing.',
       'Managers were moved to the Leeds office.'],
      'Complaints are now decided by one central team.',
      'The passage says all complaints go to a single team which applies one set of rules. The branches still hear outcomes, so they have not stopped being involved.'],
     ['vpet-c-02', 'Why does the passage mention customers who moved between regions?',
      ['To explain why the old arrangement was a problem.',
       'To show that the company has customers across the country.',
       'To suggest that those customers complain more often.',
       'To introduce a new policy for relocating customers.'],
      'To explain why the old arrangement was a problem.',
      'They "noticed" the inconsistency — the sentence exists to evidence the flaw that the change fixes, not to describe the customer base.']]],
  ['vpet-c-p2', 'B2',
    'A trial of a four-day week at Calder Manufacturing ended last month. Output per week was almost unchanged, and absence fell by a fifth. The finance director nonetheless recommended against adopting the pattern permanently, pointing out that the trial ran through the quietest quarter of the year and that the two production lines were never both at capacity. The board has asked for a second trial in the autumn.',
    [['vpet-c-03', 'What did the trial find about output?',
      ['It stayed at roughly the same level.',
       'It rose by about a fifth.',
       'It fell slightly over the four days.',
       'It was not measured during the trial.'],
      'It stayed at roughly the same level.',
      '"Almost unchanged." The fifth belongs to absence, which is the distractor the question is built on.'],
     ['vpet-c-04', 'Why did the finance director recommend against the change?',
      ['The trial did not test the busiest conditions.',
       'The cost of the trial was higher than expected.',
       'Staff were opposed to working four days.',
       'Output fell once absence was taken into account.'],
      'The trial did not test the busiest conditions.',
      'Quietest quarter, lines never both at capacity — both objections say the same thing: the trial was not run under load.']]],
  ['vpet-c-p3', 'B2',
    'Guests at the Brackley Hotel may now check in using a machine in the lobby. The hotel kept its reception desk open, and in the first three months about a third of guests used the machine. Use was highest among guests arriving after ten at night, when the desk is staffed by one person. The hotel has not reduced reception hours and says it has no plans to.',
    [['vpet-c-05', 'How many guests used the machine in the first three months?',
      ['About a third of them.', 'Almost all of them.',
       'Only those arriving late at night.', 'Fewer than one in ten.'],
      'About a third of them.',
      'Stated directly. "Only those arriving late" confuses the group with the highest rate for the whole group.'],
     ['vpet-c-06', 'What does the passage suggest about the reception desk?',
      ['It will continue to operate as before.',
       'It will close late at night.',
       'It will be replaced by more machines.',
       'It is already staffed by fewer people than before.'],
      'It will continue to operate as before.',
      'The last sentence is explicit: hours have not been reduced and there are no plans to. The late-night staffing of one person is described as the existing arrangement, not a cut.']]]
];

/* ---------------- Part D · E-mail Writing (writing, essay, 9 min) ------------
   At least 100 words, nine minutes, situation on the left and the editor on the
   right. The key points are the things the e-mail must actually do; a fluent
   message that answers two of four has not done the task. */
const PART_D = [
  ['vpet-d-01', 'B1',
    'You ordered twenty office chairs from a supplier for delivery on 3 May. On 6 May only twelve chairs arrived, and two of those have damaged armrests. Your team starts in the new office on 20 May. Write a polite but firm e-mail to the supplier.',
    'Four things to do and a deadline to state. Politeness is not the test; completeness is.',
    ['Says what was ordered and when it was due',
     'States clearly that only twelve of twenty arrived',
     'Reports the two damaged armrests',
     'Asks for the missing chairs and a replacement for the damaged ones',
     'Gives the 20 May deadline and asks for confirmation']],
  ['vpet-d-02', 'B2',
    'You manage a small team. One of your staff has asked to work from home three days a week to care for a relative. Your department\'s policy allows two days. You want to support the request but cannot change the policy yourself. Write a formal e-mail to your own manager.',
    'The difficulty is register: the writer wants something, cannot grant it, and must not promise it. An e-mail that tells the manager what will happen has mistaken the relationship.',
    ['Explains the request and the reason behind it',
     'States the policy limit of two days accurately',
     'Makes clear the writer cannot approve the exception alone',
     'Supports the request without promising an outcome',
     'Asks the manager for a decision or a meeting']]
];

/* ---------------- Part E · Dictation (listening, gap, 25 s) ------------------
   Type the sentence exactly, spelling and punctuation included. Sentence length
   climbs across the part; the later ones carry a number or a name, which is
   where accuracy usually goes. */
const PART_E = [
  ['vpet-e-01', 'A2', 'The meeting starts at nine thirty.'],
  ['vpet-e-02', 'A2', 'Please send me the invoice before Friday.'],
  ['vpet-e-03', 'B1', 'We moved the training session to the second floor.'],
  ['vpet-e-04', 'B1', 'All staff should return their equipment by the end of the month.'],
  ['vpet-e-05', 'B1', 'The supplier confirmed that the order will arrive on Tuesday.'],
  ['vpet-e-06', 'B2', 'Our customer service team answered four hundred calls last week.'],
  ['vpet-e-07', 'B2', 'The new policy applies to everyone who joined after March.'],
  ['vpet-e-08', 'B2', 'We cannot approve the budget until the figures have been checked.']
];

/* ---------------- Part F · Response Selection (listening, mcq, 8 s) ----------
   The prompt and all three replies are spoken; the screen carries nothing but
   the three letters. The wrong options are wrong in two different ways — one
   answers a question that was not asked, the other is the right register for
   the wrong content — because an item where both distractors fail the same way
   is a two-way choice wearing three buttons. */
const PART_F = [
  ['vpet-f-01', 'A2', 'Could you tell me where the lift is?',
    ['It is just past reception, on your left.', 'Yes, I took the lift this morning.', 'The lift was installed last year.'], 0],
  ['vpet-f-02', 'A2', 'Would you like me to book a taxi for you?',
    ['Yes please, for about six o\'clock.', 'The taxi was quite expensive.', 'I booked the meeting room already.'], 0],
  ['vpet-f-03', 'B1', 'I am afraid the delivery will be a day late.',
    ['That should still be all right, thank you for letting me know.', 'Yes, it arrived yesterday afternoon.', 'We deliver on Mondays and Thursdays.'], 0],
  ['vpet-f-04', 'B1', 'How long have you been with the company?',
    ['Just over three years now.', 'It takes about three years.', 'I will be there in three years.'], 0],
  ['vpet-f-05', 'B1', 'Do you mind if I move this meeting to Thursday?',
    ['Not at all, Thursday suits me better anyway.', 'Yes, the meeting went well on Thursday.', 'I moved the files on Thursday.'], 0],
  ['vpet-f-06', 'B2', 'Shall I go ahead and sign off the order, or wait for the manager?',
    ['Better to wait — she has the final figures.', 'The order arrived without a signature.', 'The manager signed the visitors book earlier.'], 0],
  ['vpet-f-07', 'B2', 'We are over budget on this project by about eight per cent.',
    ['Then we will need to go back to the client before we spend anything more.', 'The budget was approved in January.', 'Eight per cent of the team are on leave.'], 0],
  ['vpet-f-08', 'B2', 'I did not realise the report was due this morning.',
    ['Do not worry, I can give you until the end of the day.', 'The report was very thorough, thank you.', 'I read it on the train this morning.'], 0]
];

/* ---------------- Part G · Passage Comprehension (speaking, 7 s) -------------
   Two spoken passages, three questions each, answered ALOUD in a few words.
   The sheet is explicit about this and the part had been built as multiple
   choice, which tests the same passage through a different skill.

   Seven seconds is short on purpose: the answer is one fact, and a candidate
   who has it says it at once. `keyPoints` therefore holds the fact, not a
   sentence — the marker is checking whether the right thing was said, not how
   it was phrased. */
const PART_G = [
  ['vpet-g-p1', 'B1',
    'Good morning. This is a message for everyone working in the main office. The car park will be closed all day on Wednesday the twelfth while the surface is repaired. Staff who normally drive should use the public car park on the main road, and the company will cover the cost. Keep your ticket and give it to reception on Thursday. The car park reopens on Thursday morning as usual.',
    [['vpet-g-01', 'Which day will the car park be closed?', ['Wednesday the twelfth of the month']],
     ['vpet-g-02', 'Where should staff who drive park instead?', ['The public car park on the main road']],
     ['vpet-g-03', 'What should staff do with their parking ticket?', ['Hand the ticket to reception on Thursday']]]],
  ['vpet-g-p2', 'B2',
    'Thanks for coming in. The role is in our customer support team, and it is a twelve-month contract to begin with. You would be covering the afternoon shift, that is one until nine, four days a week. The training is two weeks and it is paid. Most people on the team move on to a permanent contract, though I cannot promise that. If you are still interested, we would like you to meet the team leader next Tuesday.',
    [['vpet-g-04', 'How long is the contract?', ['A twelve-month contract to begin with']],
     ['vpet-g-05', 'What hours is the shift?', ['The afternoon shift, one until nine']],
     ['vpet-g-06', 'What happens next Tuesday?', ['He is invited to meet the team leader']]]]
];

/* ---------------- Part H · Repeat (speaking) ---------------------------------
   Say the sentence back exactly. Length climbs from six words to about twenty,
   because this part measures how much language a candidate can hold at once and
   a flat length measures nothing. */
const PART_H = [
  ['vpet-h-01', 'A2', 'The office opens at eight.'],
  ['vpet-h-02', 'A2', 'Please leave your coat in the cupboard.'],
  ['vpet-h-03', 'A2', 'She will call you back this afternoon.'],
  ['vpet-h-04', 'B1', 'We need three more chairs for the training room.'],
  ['vpet-h-05', 'B1', 'The report is finished, but nobody has checked the figures.'],
  ['vpet-h-06', 'B1', 'If the train is delayed again, I will take the bus instead.'],
  ['vpet-h-07', 'B2', 'The supplier has agreed to replace the damaged items at no extra cost.'],
  ['vpet-h-08', 'B2', 'Although the budget was approved in March, none of the money has been spent.'],
  ['vpet-h-09', 'B2', 'Staff who joined before the first of June keep their existing holiday entitlement.'],
  ['vpet-h-10', 'C1', 'Had we known how long the approval would take, we would have started the work in January.']
];

/* ---------------- Part I · Speaking Situations (speaking, 30 s + 40 s) -------
   Read AND heard, then 30 seconds to think and 40 to answer. Both situations
   put the candidate in a position where the easy answer is the wrong one: a
   complaint that cannot be fully granted, and news nobody wants to hear. */
const PART_I = [
  ['vpet-i-01', 'B1',
    'You work at a hotel reception. A guest tells you the room they have been given is much noisier than the one they booked, and asks to be moved. The hotel is full tonight, but a quieter room will be free tomorrow. Speak to the guest.',
    'The candidate cannot give the guest what they want tonight. Everything rests on saying so without sounding like a refusal.',
    ['Apologises for the noise',
     'States plainly that the hotel is full tonight',
     'Offers the quieter room from tomorrow',
     'Offers something for tonight, or asks what would help',
     'Keeps a courteous, service-register tone']],
  ['vpet-i-02', 'B2',
    'You manage a project that is two weeks behind. Your client has asked for an update on a call. The delay was caused by a supplier, not by your team, and you can still meet the final deadline if the client approves one change. Speak to the client.',
    'Blaming the supplier is accurate and unhelpful. The answer has to carry the bad news, the cause, and the ask, in that order.',
    ['States the two-week delay directly, early',
     'Explains the supplier cause without using it as an excuse',
     'Confirms the final deadline can still be met',
     'Makes the specific ask — approval for one change',
     'Maintains a professional register throughout']]
];

/* ---------------- Part J · Story Retellings (speaking, 30 s) -----------------
   One hearing, then 30 seconds to retell. Each story is built to have a
   situation, two or three characters, a turn and an ending, because those are
   the four things the rubric asks the retelling to carry. */
const PART_J = [
  ['vpet-j-01', 'B1',
    'A sales manager had arranged to meet a client at a café near her office at two o\'clock. She arrived ten minutes early and waited. At half past two the client still had not come, so she telephoned his office. His assistant told her that the meeting had been moved to the client\'s own building, and that an e-mail had been sent that morning. She checked her phone and found the e-mail in her junk folder. She apologised, took a taxi, and arrived forty minutes late. The client was understanding, and they finished the meeting as planned.',
    ['A sales manager waited for a client at a café', 'The client did not arrive',
     'She phoned and learned the meeting had been moved',
     'The e-mail about the change was in her junk folder',
     'She took a taxi and arrived late', 'The client was understanding and the meeting went ahead']],
  ['vpet-j-02', 'B2',
    'A small family bakery had been run by the same family for thirty years. When the grandmother retired, her grandson took over. He wanted to sell online, but the old customers complained that the shop was always busy with delivery orders and they could no longer buy bread in the morning. After two months he changed the system: deliveries were prepared from four until seven in the morning, before the shop opened, and the counter went back to normal. Sales rose, and the regular customers stayed.',
    ['A family bakery of thirty years passed to the grandson',
     'He started selling online', 'Regular customers complained the shop was too busy for them',
     'He moved delivery preparation to early morning, before opening',
     'Sales rose and the regular customers stayed',
     'Deliveries were prepared from four until seven, before opening']],
  ['vpet-j-03', 'B2',
    'An engineer was sent to a factory to find out why a machine kept stopping. He spent a day watching it and found nothing wrong with the machine itself. On the second day he noticed that it only stopped in the afternoon. He checked the power supply and discovered that a large air conditioning unit, installed the previous summer, switched on at midday and drew too much current from the same circuit. The factory moved the air conditioner to its own supply, and the machine has not stopped since.',
    ['An engineer was sent to find why a machine kept stopping',
     'He found nothing wrong with the machine itself',
     'He noticed it only stopped in the afternoon',
     'An air conditioner on the same circuit switched on at midday',
     'Moving it to its own supply fixed the problem',
     'The air conditioner had been installed the previous summer']]
];

/**
 * Every item, flattened into the shape the seeder inserts.
 *
 * `stimulusKey` groups the rows that share one passage or one story — C and G
 * only. `script` is present exactly on the audio parts. Both are null elsewhere
 * rather than absent, so a consumer never has to tell "no audio" from "field
 * forgotten".
 */
function rows() {
  const out = [];
  const push = r => out.push(Object.assign({
    options: [], answer: '', explanation: '', keyPoints: [],
    passage: null, stimulusKey: null, script: null,
    tags: ['vpet', 'part-' + r.part.toLowerCase()],
    source: SOURCE, licence: LICENCE
  }, r));

  for (const [key, level, prompt, answer, explanation] of PART_A)
    push({ key, part: 'A', skill: 'writing', type: 'gap', level, prompt, answer, explanation });

  for (const [key, level, passage, explanation, keyPoints] of PART_B)
    push({ key, part: 'B', skill: 'writing', type: 'essay', level,
      prompt: 'Rewrite the passage using your own words.', passage, explanation, keyPoints });

  for (const [stimulusKey, level, passage, qs] of PART_C)
    for (const [key, prompt, options, answer, explanation] of qs)
      push({ key, part: 'C', skill: 'reading', type: 'mcq', level,
        prompt, options, answer, explanation, passage, stimulusKey });

  for (const [key, level, passage, explanation, keyPoints] of PART_D)
    push({ key, part: 'D', skill: 'writing', type: 'essay', level,
      prompt: 'Type your e-mail.', passage, explanation, keyPoints });

  for (const [key, level, sentence] of PART_E)
    push({ key, part: 'E', skill: 'listening', type: 'gap', level,
      prompt: 'Type what you heard.', answer: sentence, script: sentence,
      explanation: 'Marked on the whole sentence, including spelling and punctuation.' });

  for (const [key, level, prompt, options, correct] of PART_F)
    push({ key, part: 'F', skill: 'listening', type: 'mcq', level,
      prompt: 'Select the correct response.', options, answer: options[correct],
      /* Prompt then all three replies, lettered, because the screen shows none
         of it. The letters are spoken so a candidate knows which button is which. */
      script: `${prompt} ... A. ${options[0]} ... B. ${options[1]} ... C. ${options[2]}`,
      explanation: 'The prompt and all three responses are heard, not read.' });

  for (const [stimulusKey, level, passage, qs] of PART_G)
    qs.forEach(([key, prompt, keyPoints], i) =>
      push({ key, part: 'G', skill: 'speaking', type: 'speaking', level,
        prompt, keyPoints, passage, stimulusKey,
        /* The passage is spoken once before the first question of its group;
           every question is spoken as it arrives. */
        script: i === 0 ? `${passage} ... ${prompt}` : prompt,
        explanation: 'Answered aloud in a few words. Marked on whether the fact is right.' }));

  for (const [key, level, sentence] of PART_H)
    push({ key, part: 'H', skill: 'speaking', type: 'speaking', level,
      prompt: 'Repeat the sentence.', script: sentence,
      /* The sentence is both the thing read out and the thing marked against,
         so it is the answer as well as the single key point. `wordAccuracy()`
         in server/marking-guide.js aligns the recording against this. */
      answer: sentence, keyPoints: [sentence],
      explanation: 'Marked on how much of the sentence is reproduced, and on pronunciation and fluency.' });

  for (const [key, level, passage, explanation, keyPoints] of PART_I)
    push({ key, part: 'I', skill: 'speaking', type: 'speaking', level,
      prompt: 'Answer the question.', passage, script: passage, explanation, keyPoints });

  for (const [key, level, story, keyPoints] of PART_J)
    push({ key, part: 'J', skill: 'speaking', type: 'speaking', level,
      prompt: 'Retell the story in your own words.', passage: story, script: story, keyPoints,
      explanation: 'Marked on how much of the situation, characters, actions and ending survive.' });

  return out;
}

module.exports = { rows, SOURCE, LICENCE };
