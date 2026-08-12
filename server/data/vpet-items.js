/**
 * VPET item bank — the parts that need no audio: A, B, C, D and I.
 *
 * Sixty-two items: A 30, B 8, C 8, D 8, I 8. Parts E, F, G, H and J are missing
 * on purpose: each is an audio part, and a script with no recording behind it is
 * not an item a candidate can sit. They arrive with the voice work.
 *
 * Depth is counted per level, not per part, because that is what the generator
 * reacts to. It orders the pool exact-level-first and then takes what it needs,
 * so a part holding fewer items at the paper's level than the blueprint asks for
 * repeats every one of them on a retake — and a part holding exactly the
 * blueprint count repeats all of them with certainty, which is the worse case of
 * the two. Every part therefore holds either fewer items at a level than the
 * blueprint count (a shallow level, which only tops a paper up, and the top-up
 * varies) or at least twice it (a level two different papers can be drawn from).
 * Never the number in between. Today every part is deep at B2, and parts D and I
 * are deep at B1 as well; A, B and C are still shallow at B1, and A2 and C1 are
 * shallow everywhere. scripts/test-items.mjs holds that rule.
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
    'Hardly had + subject + past participle … when …. Fronting "hardly" forces the inversion.'],

  /* Second set. The bank is a pool, not a fixed paper: the generator draws the
     blueprint's ten from whatever part A holds, so a second ten is what makes a
     retake a different sitting rather than the same one again. */
  ['vpet-a-11', 'A2', 'I have lived in this street ___ ten years.', 'for',
    'for + a length of time. "since" would need a starting point ("since 2015").'],
  ['vpet-a-12', 'A2', 'My younger sister is afraid ___ dogs.', 'of',
    'afraid of + noun. "afraid from" is a common transfer error.'],
  ['vpet-a-13', 'B1', 'The concert was called ___ because of the storm.', 'off',
    'call off = cancel. "call out" and "call up" do not fit a cancelled event.'],
  ['vpet-a-14', 'B1', 'I look forward ___ hearing from you.', 'to',
    'look forward to + -ing. Another preposition "to", which is why it is not "hear".'],
  ['vpet-a-15', 'B1', 'He succeeded ___ passing the exam at the third attempt.', 'in',
    'succeed in + -ing. Compare "manage to pass", which takes the infinitive.'],
  ['vpet-a-16', 'B2', 'The flight was cancelled ___ account of the fog.', 'on',
    'on account of = because of. A fixed three-word preposition.'],
  ['vpet-a-17', 'B2', 'There is no point ___ arguing with him.', 'in',
    'no point in + -ing. The "in" is often dropped in speech but is wanted in writing.'],
  ['vpet-a-18', 'B2', 'She insisted ___ paying for the meal herself.', 'on',
    'insist on + -ing. "insist to" does not exist; "insist that" takes a clause instead.'],
  ['vpet-a-19', 'B2', 'Not only ___ he arrive late, he also forgot the tickets.', 'did',
    'Not only + auxiliary + subject. Fronting "not only" forces the inversion, and the main verb goes back to its base form.'],
  ['vpet-a-20', 'B2', 'The new safety rules come ___ force next month.', 'into',
    'come into force = start to apply. "in force" is the state; "into force" is the change.'],

  /* Third set, all B2, and deliberately wider than the two above. Those two turn
     almost entirely on dependent prepositions and particles; ten of those in one
     paper measure a single thing ten times. These reach for the other structures
     a B2 candidate is expected to control — fixed clause frames, inversion after
     a fronted adverbial, the inverted conditional, and collocations where the
     verb rather than the preposition is the missing piece. */
  ['vpet-a-21', 'B2', 'The proposal was rejected on the grounds ___ it would cost too much.', 'that',
    'on the grounds that + clause. "on the grounds of" is the other half of the pair and needs a noun ("on the grounds of cost").'],
  ['vpet-a-22', 'B2', 'It is high time we ___ this problem seriously.', 'took',
    'it is high time + past tense. The past form marks the action as overdue, not as finished; "take" and "to take" are both the error this item looks for.'],
  ['vpet-a-23', 'B2', 'The results were, ___ and large, better than anyone expected.', 'by',
    'by and large = on the whole. A fixed phrase, so no other preposition fits.'],
  ['vpet-a-24', 'B2', 'No amount of persuasion could talk him ___ of resigning.', 'out',
    'talk someone out of + -ing = persuade them not to. "talk into" is the same frame pointing the other way, and "of" already fixes which one is wanted.'],
  ['vpet-a-25', 'B2', 'The two reports are at ___ with each other over the cost.', 'odds',
    'at odds with = in conflict with. The missing word is the noun, not the preposition, which is what makes this harder than it looks.'],
  ['vpet-a-26', 'B2', 'The bill came ___ rather more than we had budgeted for.', 'to',
    'come to = add up to. "come out at" and "come in at" say the same thing but need two words.'],
  ['vpet-a-27', 'B2', 'She was taken ___ by how quickly the room emptied.', 'aback',
    'taken aback = surprised, usually unpleasantly. "aback" survives in this phrase and almost nowhere else.'],
  ['vpet-a-28', 'B2', 'Only after the meeting ___ we realise what had been decided.', 'did',
    'Only + adverbial at the front forces the inversion, so the auxiliary comes before the subject and "realise" stays in its base form.'],
  ['vpet-a-29', 'B2', '___ I known about the strike, I would have travelled a day earlier.', 'had',
    'The inverted third conditional: "Had I known" replaces "If I had known". Dropping "if" is what forces the auxiliary to the front.'],
  ['vpet-a-30', 'B2', 'The report makes no ___ of the complaints received last year.', 'mention',
    'make no mention of. The preposition is already there, which rules out "reference" (reference to) and "note" (note of, but "make note of" is not the idiom).']
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
    'Both the result and its explanation must survive. Reporting only the fall in car journeys is half the passage.'],

  /* Second set, so a retake draws three different passages. */
  ['vpet-b-04', 'B1',
    'Read this passage, then write it again in your own words after it disappears.\n\n' +
    'The number 12 bus used to run every twenty minutes and was often nearly empty. ' +
    'Last year the council cut it to one an hour and put the money into a later evening ' +
    'service. Complaints rose sharply at first, then fell below where they had started.',
    'Three facts and an order: the old service, the change, and how complaints moved. Losing the reversal loses the passage.'],
  ['vpet-b-05', 'B2',
    'Read this passage, then write it again in your own words after it disappears.\n\n' +
    'A secondary school made its lunches free for everyone rather than for the poorest ' +
    'pupils only. Take-up went from a third of the school to almost all of it. Teachers ' +
    'reported fewer disputes in afternoon lessons, though the head was careful to say ' +
    'that nobody had measured this properly.',
    'The hedge at the end is part of the meaning. A reconstruction that states the calmer afternoons as fact has overstated the passage.'],
  ['vpet-b-06', 'B2',
    'Read this passage, then write it again in your own words after it disappears.\n\n' +
    'For thirty years the paper mill was the largest employer in the valley and the main ' +
    'source of pollution in its river. It closed in 2018. The water is now clean enough ' +
    'for fish to return, and the town has lost a fifth of its working population.',
    'The passage sets a gain against a loss without resolving it. Keeping only one side changes what it says.'],

  /* Third set, both B2, so part B holds two whole sittings at that level. */
  ['vpet-b-07', 'B2',
    'Read this passage, then write it again in your own words after it disappears.\n\n' +
    'A supermarket chain began printing the date of first sale on its fruit instead of a ' +
    'use-by date. Waste in its own shops fell by a fifth. Customers threw away slightly ' +
    'more at home, and the chain has not published a figure for the two together.',
    'What the passage withholds is part of what it says. A reconstruction that reports the fall in shop waste as an overall saving has claimed the figure the chain declined to give.'],
  ['vpet-b-08', 'B2',
    'Read this passage, then write it again in your own words after it disappears.\n\n' +
    'A hospital moved its blood tests from the wards to a small unit by the main entrance. ' +
    'The wait for the test itself barely changed. What did change was the number of patients ' +
    'who never arrived at all, which halved; staff put that down to nobody having to find a ward.',
    'The finding is about attendance rather than speed, and the explanation is attributed to the staff rather than measured. Both distinctions have to survive.']
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
    'The caution is about who came, not how many. The passage says plainly that income did not fall, which removes the second option.'],

  /* Second set, so a retake draws three different passages. */
  ['vpet-c-04', 'B1',
    'The swimming pool opens at six in the morning on weekdays and at eight at weekends. ' +
    'In July and August it also stays open until ten at night, an hour later than usual. ' +
    'The lane reserved for slow swimmers is closed during school lessons on Tuesday and ' +
    'Thursday mornings.\n\nWhen is the slow lane unavailable?',
    ['On two mornings a week during lessons', 'Every morning before eight',
      'Throughout July and August', 'At weekends only'],
    'On two mornings a week during lessons',
    'The passage names Tuesday and Thursday mornings. The other options each reuse a real detail from the text but attach it to the wrong thing.'],
  ['vpet-c-05', 'B2',
    'The company published its emissions figures a year earlier than the law required. ' +
    'Rivals complained that the early release made their own reporting look slow, and one ' +
    'accused the company of choosing a favourable measure. The company has not disputed ' +
    'that the measure it used is the most flattering of the three in common use.\n\n' +
    'What is the company\'s position on the measure it chose?',
    ['It has not denied the criticism', 'It denies choosing a flattering measure',
      'It says the law required that measure', 'It has stopped using the measure'],
    'It has not denied the criticism',
    '"Has not disputed" is an admission by silence, not a denial. The distractors turn that into a denial, a legal requirement or a reversal, none of which the passage says.'],
  ['vpet-c-06', 'B2',
    'Researchers gave one group of drivers a display showing their fuel use in real time ' +
    'and left a second group without one. Over six months the first group used four per ' +
    'cent less fuel. The effect was almost entirely produced in the first three weeks, ' +
    'after which the two groups behaved much the same.\n\nWhat does the study suggest about the display?',
    ['Its effect faded after a short time', 'It saved fuel steadily over six months',
      'It made no difference at any point', 'It worked only for experienced drivers'],
    'Its effect faded after a short time',
    'The last sentence is the finding: the saving is real but front-loaded. "Steadily over six months" is the reading the last sentence exists to rule out.'],

  /* Third set, both B2, so part C holds two whole sittings at that level. */
  ['vpet-c-07', 'B2',
    'A publisher offered its authors a choice: a larger payment up front, or a smaller one ' +
    'with a bigger share of later sales. Established authors mostly took the payment. Debut ' +
    'authors, who had the least money, more often took the share — not out of confidence, ' +
    'they said, but because the sum offered to them was too small to make much difference.' +
    '\n\nWhy did debut authors more often choose the share of sales?',
    ['The sum offered to them up front was very small', 'They were confident their books would sell well',
      'They had more money behind them than established authors', 'The publisher would not offer them a payment up front'],
    'The sum offered to them up front was very small',
    'The clause after the dash gives the reason and rules out confidence in the same breath. The last option turns a small offer into no offer, which the passage does not say.'],
  ['vpet-c-08', 'B2',
    'The council fitted sensors that dim the street lights when nobody is nearby, and ' +
    'electricity use fell by a third. Residents of two streets asked for the old lighting ' +
    'back, saying the dimming left them uneasy. The council restored full lighting on those ' +
    'streets and kept the sensors everywhere else.\n\nHow did the council answer the complaints?',
    ['It restored full lighting on those two streets only', 'It took the sensors out across the whole town',
      'It made no change and kept the sensors everywhere', 'It dimmed the lights further to save more'],
    'It restored full lighting on those two streets only',
    'The last sentence draws the line precisely: full lighting on the two streets, sensors elsewhere. Each distractor takes that partial reversal to a total one, to none at all, or to the opposite.']
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
    'Formal register is part of the mark here. So is a specific deadline: "as soon as possible" leaves the supplier nothing to meet.'],

  /* Second set: one friendly, one formal, matching the pairing above so a retake
     is a different task rather than a different level of difficulty. */
  ['vpet-d-03', 'B1',
    'You bought a pair of headphones online two weeks ago. One side stopped working after ' +
    'three days. You still have the order number and the packaging.\n\n' +
    'Write an email of about 120 words to the shop. Say what you bought and when, describe ' +
    'the fault, and say what you want them to do about it.',
    'Task, tone and accuracy. The three facts (what, when, what is wrong) and a clear request all have to be there; a polite email that never asks for a refund or replacement has not done the task.'],
  ['vpet-d-04', 'B2',
    'You rent a flat. The heating has not worked for eight days. You reported it twice by ' +
    'telephone and nothing has happened. It is now the coldest week of the year.\n\n' +
    'Write an email of about 150 words to the landlord. Set out what has happened, say why ' +
    'it now matters urgently, and state what you expect and by when. Stay formal and civil.',
    'The difficulty is escalating without losing the register. A letter that becomes angry, or one that stays so mild it reads as a first report, both miss.'],

  /* Third and fourth sets, two at each level, so part D holds two whole sittings
     at B1 and two at B2 rather than two sittings' worth spread across both. */
  ['vpet-d-05', 'B1',
    'You signed up for a six-week evening course. After two weeks the class was moved from ' +
    'Tuesday to Thursday, which is the one evening you cannot attend.\n\n' +
    'Write an email of about 120 words to the course office. Say which course you are on, ' +
    'explain why the new evening does not work, and ask what your options are.',
    'Task, tone and accuracy. Naming the course and the change, and asking a question the office can actually answer, are what separate this from a complaint.'],
  ['vpet-d-06', 'B1',
    'A friend from another city is coming to stay for a weekend next month. They have asked ' +
    'what there is to do and whether they need to bring anything.\n\n' +
    'Write an email of about 120 words. Suggest two things to do, answer the question about ' +
    'what to bring, and agree a time to meet.',
    'Three things have to be there: the suggestions, the answer about what to bring, and a time. A warm email that leaves the arrangements open has not done the task.'],
  ['vpet-d-07', 'B2',
    'You booked a training course for four colleagues. The provider has moved it to a date ' +
    'when none of them can attend, and the booking terms say the fee is non-refundable.\n\n' +
    'Write an email of about 150 words to the provider. Set out what was booked and what ' +
    'changed, explain why the new date is impossible, and say what you are asking for. Use a ' +
    'formal register.',
    'The mark turns on building a case rather than voicing a grievance: facts, consequence, and a specific request. Quoting the non-refundable term without asking for anything leaves the reader nothing to act on.'],
  ['vpet-d-08', 'B2',
    'You manage a small team. One of your staff has asked to drop to four days a week from ' +
    'next month. You are willing, but the fifth day needs covering and your own manager has ' +
    'to approve it.\n\n' +
    'Write an email of about 150 words to your manager. Explain the request, say how the work ' +
    'would be covered, and ask for a decision by a named date. Stay formal.',
    'Three things are marked together: the request, a workable plan for the uncovered day, and a deadline. A message that only passes the request upwards has made the decision harder, not easier.']
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
    'The difficulty is being firm and polite at once. A complaint that never asks for anything, or one that becomes rude, both lose marks.'],

  /* Second set. Both name a relationship and a difficulty, as above: register in
     speech comes from who is being spoken to. */
  ['vpet-i-03', 'B1',
    'You bought a jacket last week and the zip has broken. You are at the shop counter, ' +
    'speaking to an assistant. You do not have the receipt, but you paid by card.\n\n' +
    'Speak for up to one minute. Explain the problem, say what you would like, and deal with ' +
    'the missing receipt.',
    'Scored on whether the problem, the request and the receipt are all handled, and on whether the tone stays reasonable when the receipt comes up.'],
  ['vpet-i-04', 'B2',
    'Your manager has invited you to a work social event on Saturday. You cannot go, and the ' +
    'reason is personal and you would rather not explain it.\n\n' +
    'Speak for up to one minute. Decline the invitation, keep the reason private without ' +
    'sounding evasive, and leave the relationship in good order.',
    'The hard part is declining without either over-explaining or sounding cold. Vague-but-warm is the target; a flat refusal and an invented excuse both miss it.'],

  /* Third and fourth sets, two at each level, matching part D: two whole sittings
     at B1 and two at B2 rather than four items spread across the two levels. */
  ['vpet-i-05', 'B1',
    'You ordered a coffee and a sandwich. The coffee is cold and the sandwich is not the one ' +
    'you asked for. You are speaking to the person who served you, in a small cafe that is ' +
    'not busy.\n\n' +
    'Speak for up to one minute. Explain both problems, say what you would like instead, and ' +
    'stay friendly.',
    'Scored on whether both problems and a clear request are there, and on whether the tone matches a small cafe rather than a formal complaint.'],
  ['vpet-i-06', 'B1',
    'A classmate has asked to borrow your notes for a lesson they missed. Your notes are ' +
    'incomplete for that lesson because you left early.\n\n' +
    'Speak for up to one minute. Agree to lend them, warn about the gap, and suggest where ' +
    'they could get the rest.',
    'The three moves are agreeing, flagging the gap, and pointing somewhere else. Handing over the notes without the warning is the failure this item is watching for.'],
  ['vpet-i-07', 'B2',
    'A friend has asked you to look over a job application before they send it. It reads ' +
    'badly in places and claims experience you know they do not have. You are at their flat, ' +
    'and they are clearly pleased with it.\n\n' +
    'Speak for up to one minute. Give your honest view, be specific about what needs changing, ' +
    'and keep the friendship intact.',
    'The difficulty is being useful without being cruel, and not letting the invented experience pass unmentioned. Praise with no substance and blunt criticism lose marks for opposite reasons.'],
  ['vpet-i-08', 'B2',
    'You are chairing a short team meeting. One person has spoken for most of it and two ' +
    'others have said nothing at all. Time is nearly up.\n\n' +
    'Speak for up to one minute. Interrupt politely, sum up what has been said so far, and ' +
    'bring the quieter members in.',
    'Scored on the three moves — interrupt, summarise, invite — and on whether the interruption stays courteous. Cutting the speaker off without acknowledging the point they were making misses.']
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
