/**
 * VPET item bank - parts A, B, C, D and I. The five parts that need a recording
 * (E, F, G, H, J) are in vpet-items-audio.js and come back from the same rows().
 *
 * WRITING NEW ITEMS? Read docs/VPET-BLUEPRINT.md first. It describes all ten
 * parts - what each one measures, how to write one, and the traps - plus the
 * depth rule below and what the bank is still missing.
 *
 * A 50, B 14, C 26, D 12, I 12 here; E 10, F 10, G 8, H 12, J 4 next door. A
 * hundred and fifty-eight in all, enough to fill every part of a paper.
 *
 * Depth is counted per level, not per part, because that is what the generator
 * reacts to. It orders the pool exact-level-first and then takes what it needs,
 * so a part holding fewer items at the paper's level than the blueprint asks for
 * repeats every one of them on a retake — and a part holding exactly the
 * blueprint count repeats all of them with certainty, which is the worse case of
 * the two. Every part therefore holds either fewer items at a level than the
 * blueprint count (a shallow level, which only tops a paper up, and the top-up
 * varies) or at least twice it (a level two different papers can be drawn from).
 * Never the number in between. Today every part is deep at B2; parts D and I are
 * deep at B1 as well, and A, B, C, D and I are deep at C1. A, B and C are still
 * shallow at B1, A2 is shallow everywhere, and C1 has nothing yet in the five
 * audio parts — which is what stops a Level 2 paper being drawn at C1 across
 * the board. scripts/test-items.mjs holds that rule.
 *
 * WHY C1 EXISTS AT ALL. VPET is two papers: Level 1 measures A1 to B1+ and
 * Level 2 B1+ to C2 (docs/VPET-OFFICIAL-SPEC.md §0, and server/bands.js turns a
 * mark into a level accordingly). A Level 2 paper built only from B2 material
 * cannot reach the top of what it is supposed to report, so the C1 sets below
 * are the difference between a Level 2 paper and a hard Level 1 one.
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
    'make no mention of. The preposition is already there, which rules out "reference" (reference to) and "note" (note of, but "make note of" is not the idiom).'],

  /* C1. The B2 set above turns on knowing a phrasal verb or an inversion; these
     turn on knowing which of several idioms a register admits. Every gap still
     takes exactly one word, and where two spellings of the same choice exist
     (on/upon) both are accepted — that is one answer written two ways, which is
     what the `|` in the answer key is for. */
  ['vpet-a-31', 'C1', 'The board\'s silence was tantamount ___ an admission of failure.', 'to',
    'tantamount to = amounting to the same thing as. The adjective takes "to" and nothing else.'],
  ['vpet-a-32', 'C1', 'No ___ had the findings been published than the share price fell.', 'sooner',
    '"No sooner … than" — and note it is "than", not "when". The inversion after the fronted negative is compulsory.'],
  ['vpet-a-33', 'C1', 'The legacy system will be phased ___ by the end of next year.', 'out',
    'phase out = withdraw gradually. "Phase in" is the opposite and cannot take "legacy system" as its object.'],
  ['vpet-a-34', 'C1', 'The inquiry was set up ___ the behest of the outgoing chair.', 'at',
    'at the behest of = at the request of, formal. "By the behest" and "on the behest" are both wrong.'],
  ['vpet-a-35', 'C1', 'The full trial bore ___ what the pilot study had suggested.', 'out',
    'bear out = confirm. "Bear on" exists but means "be relevant to", which needs a different object.'],
  ['vpet-a-36', 'C1', 'Staff were given time off in ___ of overtime pay.', 'lieu',
    'in lieu of = instead of. The word survives in this phrase and in "lieutenant" and almost nowhere else.'],
  ['vpet-a-37', 'C1', 'The two sides spent the weekend hammering ___ a compromise.', 'out',
    'hammer out = negotiate with difficulty until it is settled. "Hammer down" is not idiomatic here.'],
  ['vpet-a-38', 'C1', 'Not ___ the audit was complete did the scale of the loss emerge.', 'until',
    '"Not until X did Y" — the fronted negative forces the inversion in the main clause, not in the "until" clause.'],
  ['vpet-a-39', 'C1', 'She is averse ___ taking risks with other people\'s money.', 'to',
    'averse to + noun or -ing. "Averse from" is archaic; "adverse" is a different word altogether.'],
  ['vpet-a-40', 'C1', 'The proposal was thrown ___ at the first committee meeting.', 'out',
    'throw out = reject formally. "Throw off" and "throw over" both exist and mean something else.'],
  ['vpet-a-41', 'C1', 'The whole argument rests ___ an assumption nobody has tested.', 'on|upon',
    'rest on/upon = depend on for its validity. Both spellings of the same preposition are accepted.'],
  ['vpet-a-42', 'C1', 'The company has come ___ sustained criticism for its hiring practices.', 'under',
    'come under criticism / fire / pressure. "Come in for criticism" is the other idiom, but that needs two words.'],
  ['vpet-a-43', 'C1', 'We should flesh ___ the outline before it goes to the client.', 'out',
    'flesh out = add the detail to something that is only a skeleton.'],
  ['vpet-a-44', 'C1', 'The scheme was conceived ___ a response to falling attendance.', 'as',
    'conceive of something AS something. Without "of", the verb takes "as" directly.'],
  ['vpet-a-45', 'C1', 'Little ___ they know how much the contract would eventually cost.', 'did',
    '"Little did they know" — a fronted negative adverb again, and one of the few that survives as a set phrase.'],
  ['vpet-a-46', 'C1', 'The deadline was brought ___ by two weeks with no warning.', 'forward',
    'bring forward = move to an earlier date. "Bring back" and "bring up" are different verbs.'],
  ['vpet-a-47', 'C1', 'His resignation was widely construed ___ an admission of defeat.', 'as',
    'construe X as Y = interpret it that way. "Construed to" and "construed for" are both wrong.'],
  ['vpet-a-48', 'C1', 'Production was wound ___ at the end of the quarter.', 'down|up',
    'wind down = reduce gradually; wind up = close entirely. Both fit a quarter-end and both are accepted.'],
  ['vpet-a-49', 'C1', 'She prevailed ___ the committee to reconsider its decision.', 'on|upon',
    'prevail on/upon someone to do something = persuade them. Note that "prevail over" means defeat, not persuade.'],
  ['vpet-a-50', 'C1', 'The clause was inserted ___ the express purpose of preventing this.', 'for',
    'for the express purpose of. "With the express purpose" is heard, but "for" is the settled form with "purpose".']
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
    'The finding is about attendance rather than speed, and the explanation is attributed to the staff rather than measured. Both distinctions have to survive.'],

  /* C1. Same task, harder passages. What rises is not the vocabulary so much as
     the number of things that must survive TOGETHER: a claim, who is making it,
     what it is being contrasted with, and what the passage stops short of
     saying. A reconstruction that keeps the facts and loses the hedging has
     changed what the passage means, and at this level that is the thing being
     measured. */
  ['vpet-b-09', 'C1',
    'Read this passage, then write it again in your own words after it disappears.\n\n' +
    'An insurer offered lower premiums to drivers who let it monitor their braking. Claims ' +
    'among those drivers fell by a fifth. The insurer presented this as proof that feedback ' +
    'improves driving; a statistician engaged by the regulator suggested instead that the ' +
    'drivers willing to be monitored had been the safer ones all along.',
    'Two explanations of one number, and the passage does not settle between them. A version that reports either as the finding has taken a side the text refuses to take.'],
  ['vpet-b-10', 'C1',
    'Read this passage, then write it again in your own words after it disappears.\n\n' +
    'The department published its waiting times for the first time in April. Performance ' +
    'appeared to worsen sharply over the following quarter. Officials attribute this to a ' +
    'change in what counts as a wait, introduced in the same month; critics say the figures ' +
    'were simply never this visible before.',
    'The apparent worsening may be an artefact of measurement or of visibility, and the passage attributes each view to somebody. Losing the attribution turns disagreement into fact.'],
  ['vpet-b-11', 'C1',
    'Read this passage, then write it again in your own words after it disappears.\n\n' +
    'A publisher reduced its list from ninety titles a year to fifty. Revenue held steady, ' +
    'which the managing director cites whenever the decision is questioned. She is careful ' +
    'to add that the titles dropped were chosen with hindsight the company did not have at ' +
    'the time, and that the same cut made blindly would probably have gone badly.',
    'The qualification is the point of the passage, not a footnote to it. A version that keeps only "fewer books, same revenue" has kept the half the speaker herself warns against.'],
  ['vpet-b-12', 'C1',
    'Read this passage, then write it again in your own words after it disappears.\n\n' +
    'Researchers gave one group of shoppers a trolley with a line marked across the middle ' +
    'and asked them to fill the front half with fresh produce. Those shoppers bought more ' +
    'fruit and vegetables than a group given no line. The effect disappeared entirely once ' +
    'the shoppers were told what the line was for.',
    'The last sentence reverses the usefulness of the first two. A reconstruction that stops at "the line worked" has dropped the finding.'],
  ['vpet-b-13', 'C1',
    'Read this passage, then write it again in your own words after it disappears.\n\n' +
    'A city replaced two lanes of a main road with a cycle track. Journey times by car rose ' +
    'in the first month and were back to their previous level within a year, though the ' +
    'traffic count never recovered. Planners take this as evidence that some journeys were ' +
    'never necessary; drivers\' groups argue they simply moved to streets nobody is counting.',
    'Three facts and two readings of them, and the two readings are compatible with the same numbers. Both have to be present and attributed.'],
  ['vpet-b-14', 'C1',
    'Read this passage, then write it again in your own words after it disappears.\n\n' +
    'A charity stopped asking donors for a fixed monthly amount and let them name their own. ' +
    'The average gift fell, but the number of donors rose enough that total income was ' +
    'slightly higher. The finance director notes that the charity has not yet been through ' +
    'a year in which the two move in the same direction.',
    'An average down, a count up, a total marginally up, and an explicit warning that the arithmetic has not been stress-tested. The warning is the hardest part to keep and the most important.']
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
    ['The length of the whole novel',
      'The pace of the middle section',
      'The ending being predictable',
      'The order in which the book was written'],
    'The pace of the middle section',
    'The last sentence says so directly, and rules out the ending. "The order it was written in" is stated but never criticised.'],
  ['vpet-c-03', 'B2',
    'The museum stopped charging for entry in 2021 and visitor numbers doubled. Income did ' +
    'not fall, because the shop and cafe took more than the tickets ever had. The director ' +
    'is cautious all the same: two thirds of the extra visitors live within the city, and ' +
    'the museum had hoped to draw people from further away.\n\nWhy is the director cautious?',
    ['The shop and cafe are too small',
      'Visitor numbers have started to fall',
      'The new visitors are mostly local',
      'The museum is losing money'],
    'The new visitors are mostly local',
    'The caution is about who came, not how many. The passage says plainly that income did not fall, which removes the second option.'],

  /* Second set, so a retake draws three different passages. */
  ['vpet-c-04', 'B1',
    'The swimming pool opens at six in the morning on weekdays and at eight at weekends. ' +
    'In July and August it also stays open until ten at night, an hour later than usual. ' +
    'The lane reserved for slow swimmers is closed during school lessons on Tuesday and ' +
    'Thursday mornings.\n\nWhen is the slow lane unavailable?',
    ['Every morning before eight',
      'Throughout July and August',
      'At weekends only',
      'On two mornings a week during lessons'],
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
    ['It worked only for experienced drivers',
      'Its effect faded after a short time',
      'It saved fuel steadily over six months',
      'It made no difference at any point'],
    'Its effect faded after a short time',
    'The last sentence is the finding: the saving is real but front-loaded. "Steadily over six months" is the reading the last sentence exists to rule out.'],

  /* Third set, both B2, so part C holds two whole sittings at that level. */
  ['vpet-c-07', 'B2',
    'A publisher offered its authors a choice: a larger payment up front, or a smaller one ' +
    'with a bigger share of later sales. Established authors mostly took the payment. Debut ' +
    'authors, who had the least money, more often took the share — not out of confidence, ' +
    'they said, but because the sum offered to them was too small to make much difference.' +
    '\n\nWhy did debut authors more often choose the share of sales?',
    ['They had more money behind them than established authors',
      'The publisher would not offer them a payment up front',
      'The sum offered to them up front was very small',
      'They were confident their books would sell well'],
    'The sum offered to them up front was very small',
    'The clause after the dash gives the reason and rules out confidence in the same breath. The last option turns a small offer into no offer, which the passage does not say.'],
  ['vpet-c-08', 'B2',
    'The council fitted sensors that dim the street lights when nobody is nearby, and ' +
    'electricity use fell by a third. Residents of two streets asked for the old lighting ' +
    'back, saying the dimming left them uneasy. The council restored full lighting on those ' +
    'streets and kept the sensors everywhere else.\n\nHow did the council answer the complaints?',
    ['It took the sensors out across the whole town',
      'It made no change and kept the sensors everywhere',
      'It dimmed the lights further to save more',
      'It restored full lighting on those two streets only'],
    'It restored full lighting on those two streets only',
    'The last sentence draws the line precisely: full lighting on the two streets, sensors elsewhere. Each distractor takes that partial reversal to a total one, to none at all, or to the opposite.'],

  /* Fourth, fifth and sixth sets, all B2. Part C asks for six items a sitting, so
     the level a paper is built at needs twelve to avoid handing back the same six
     on a retake — see "No part sits between shallow and deep" in test-items.mjs. */
  ['vpet-c-09', 'B2',
    'A supermarket moved its fruit and vegetables from the back of the shop to just inside ' +
    'the entrance. Sales of them rose by a fifth. Sales of everything else were unchanged, ' +
    'which the manager took as the point: the aim had been to add to what people bought, ' +
    'not to shift the same spending around.\n\nWhy was the manager pleased that other sales stayed flat?',
    ['It showed the fruit sales were additional, not moved from elsewhere',
      'It showed customers were spending less overall',
      'It proved the other aisles needed rearranging too',
      'It meant the shop could reduce its range'],
    'It showed the fruit sales were additional, not moved from elsewhere',
    'The final clause states the aim, so flat sales elsewhere are the evidence it was met. The other options read a flat figure as a problem, which the passage says it is not.'],
  ['vpet-c-10', 'B2',
    'A city introduced a fee for driving into the centre at peak times. Traffic fell sharply ' +
    'in the first month, then crept back up as drivers learned which streets lay outside the ' +
    'charged zone. Two years on, the centre is quieter than before, but the roads ringing it ' +
    'carry more cars than they were built for.\n\nWhat has been the lasting effect of the fee?',
    ['Drivers stopped coming into the city altogether',
      'Traffic moved to the surrounding roads rather than disappearing',
      'Traffic returned to exactly the level it was before',
      'The centre is as busy now as it was before the fee'],
    'Traffic moved to the surrounding roads rather than disappearing',
    'The last sentence holds both halves: the centre is quieter, the ring roads busier. Two distractors keep only the second half and drop the first.'],
  ['vpet-c-11', 'B2',
    'A hospital asked patients to rate their pain before and after a new painkiller. Scores ' +
    'improved markedly. When the trial was repeated with half the patients given a tablet ' +
    'containing nothing, their scores improved almost as much. The researchers did not ' +
    'conclude the drug was useless, only that the first trial could not show what it did.' +
    '\n\nWhat do the researchers say about the first trial?',
    ['It showed the drug worked better than a tablet containing nothing',
      'It recorded the pain scores incorrectly',
      'It was not designed to show whether the drug itself worked',
      'It proved the drug had no effect on pain'],
    'It was not designed to show whether the drug itself worked',
    'The last sentence separates "useless" from "unproven" and picks the second. The distractor saying the drug has no effect is exactly the conclusion the researchers decline to draw.'],
  ['vpet-c-12', 'B2',
    'A firm let staff choose their own hours. Output held steady and people reported being ' +
    'happier, but managers found meetings harder to arrange and junior staff said they saw ' +
    'less of colleagues they had learned from. The firm kept the policy and set two fixed ' +
    'days a week when everyone is in.\n\nWhat problem did the two fixed days address?',
    ['Output had started to fall once hours were flexible',
      'Staff were unhappy with being able to choose their hours',
      'Managers wanted the old fixed working week back',
      'People were overlapping too little to meet and learn from each other'],
    'People were overlapping too little to meet and learn from each other',
    'The two complaints are meetings and contact with colleagues, and both are about overlap. Output and happiness are given as the things that did NOT go wrong.'],
  ['vpet-c-13', 'B2',
    'An airline began boarding passengers from the back of the plane forwards. Boarding got ' +
    'quicker on short flights but slower on long ones, where passengers carry more and take ' +
    'longer to stow it. The airline now uses the method only on routes under two hours.' +
    '\n\nWhy is the method limited to shorter routes?',
    ['On longer flights the extra luggage cancels out the saving',
      'Passengers on longer flights refused to board that way',
      'Short flights carry fewer passengers to board',
      'The method was found to be unsafe on long flights'],
    'On longer flights the extra luggage cancels out the saving',
    'The middle sentence gives the cause directly: more to stow, slower boarding. The other options supply reasons the passage never mentions.'],
  ['vpet-c-14', 'B2',
    'A library replaced its late fines with a system that simply blocks further borrowing ' +
    'until a book comes back. Returns arrived no later than before, and the number of people ' +
    'using the library rose, particularly among those who had previously stopped coming ' +
    'because they owed money.\n\nWhat was the main effect of dropping the fines?',
    ['The library collected more money than it had from fines',
      'More people used the library, without books coming back later',
      'Books started coming back considerably later than before',
      'Borrowing fell because there was no penalty for lateness'],
    'More people used the library, without books coming back later',
    'Both findings sit in the second sentence and the right answer keeps them together. The distractors each contradict one of the two.'],

  /* C1. The B1 and B2 items above ask what the passage says. These ask what
     follows from it, what it stops short of claiming, or whose claim it is —
     and the distractors are all things the passage genuinely contains, put to a
     use it does not support. An option nobody would pick teaches nothing. */
  ['vpet-c-15', 'C1',
    'A retailer credits its loyalty scheme with a rise in repeat custom, noting that members ' +
    'return three times as often as non-members. Its own analysts are more cautious: joining ' +
    'requires filling in a form at the till, which is a thing that frequent shoppers are far ' +
    'more likely to have had the opportunity to do.\n\nWhat objection do the analysts raise?',
    ['That the scheme may be recording loyal shoppers rather than creating them',
      'That the form at the till takes too long to complete',
      'That non-members return to the shop more often than the figures suggest',
      'That three times as often is too small a difference to be meaningful'],
    'That the scheme may be recording loyal shoppers rather than creating them',
    'The analysts point at how members are recruited, which makes membership a consequence of frequent visits rather than a cause. The other three each reuse a real detail to make a claim the passage never supports.'],
  ['vpet-c-16', 'C1',
    'The committee\'s report stops short of recommending closure. It sets out the running ' +
    'costs in detail, notes that no comparable site has stayed open beyond a decade, and ' +
    'observes that the trustees have not sought alternative funding. It then states that the ' +
    'decision properly belongs to the trustees.\n\nWhat is the report doing?',
    ['Assembling the case for closure while leaving the decision to others',
      'Recommending that the site be closed within the decade',
      'Arguing that the trustees have already made their decision',
      'Declining to express any view on the site\'s prospects'],
    'Assembling the case for closure while leaving the decision to others',
    'Every fact selected points one way; the final sentence withholds the recommendation. "Declining to express any view" ignores the selection, and "recommending closure" ignores the refusal.'],
  ['vpet-c-17', 'C1',
    'Early trials of the drug were stopped when the benefit became clear, on the grounds that ' +
    'withholding it from the control group would no longer be defensible. Later reviewers have ' +
    'pointed out that trials halted early tend to overstate how well a treatment works, because ' +
    'they are stopped at the moment the results look best.\n\nWhy do the reviewers question the result?',
    ['Because stopping at a favourable moment can exaggerate the benefit',
      'Because the control group should have received the drug sooner',
      'Because the trial was too small to show a real benefit',
      'Because the benefit was never actually observed in the trial'],
    'Because stopping at a favourable moment can exaggerate the benefit',
    'The objection is about WHEN the trial stopped, not whether the benefit existed. The passage explicitly says the benefit became clear, which rules out the last option.'],
  ['vpet-c-18', 'C1',
    'Supporters of the scheme describe it as a pilot. Its critics note that the contract runs ' +
    'for eleven years, that the buildings are purpose-built, and that no criteria have been ' +
    'published against which the pilot could be judged a failure.\n\nWhat are the critics implying?',
    ['That calling it a pilot is misleading, because nothing about it is provisional',
      'That eleven years is too short a period to evaluate the scheme',
      'That the buildings should have been designed for another purpose',
      'That the criteria will be published once the pilot is under way'],
    'That calling it a pilot is misleading, because nothing about it is provisional',
    'Each fact the critics cite is something a genuine pilot would not have. The implication is about the word "pilot" itself, which is what makes this an inference rather than a retrieval.'],
  ['vpet-c-19', 'C1',
    'The survey found that staff who work from home report higher satisfaction. It also found ' +
    'that the option is taken up mainly by senior staff, who reported higher satisfaction than ' +
    'their colleagues before the policy existed.\n\nWhat does the second finding do to the first?',
    ['It offers a reason for the difference other than working from home',
      'It confirms that working from home raises satisfaction',
      'It shows that senior staff dislike working from home',
      'It shows that the survey asked the wrong people'],
    'It offers a reason for the difference other than working from home',
    'Seniority is present in both groups and predates the policy, so it can account for the gap on its own. The passage does not say the policy has no effect — only that this survey cannot separate the two.'],
  ['vpet-c-20', 'C1',
    'Asked whether the delay was avoidable, the director said the schedule had been "ambitious ' +
    'from the outset" and that the team had "worked to the plan they were given". She did not ' +
    'say who had set the plan.\n\nWhat is the effect of her answer?',
    ['It moves responsibility away from the team without naming anyone else',
      'It accepts that the delay was avoidable',
      'It blames the team for failing to follow the plan',
      'It identifies who set the schedule'],
    'It moves responsibility away from the team without naming anyone else',
    'Both quoted phrases exonerate the team; the final sentence points out what is missing. The question is about what the answer accomplishes, not what it asserts.'],
  ['vpet-c-21', 'C1',
    'The museum reports record attendance. Admission became free in the same year, and the ' +
    'count is now taken at the door rather than from tickets sold. The director says the ' +
    'underlying interest is real; she has not published the two years on a comparable basis.' +
    '\n\nWhy is the record figure hard to interpret?',
    ['Two things changed at once, and one of them was how visitors are counted',
      'The museum has stopped counting visitors altogether',
      'Attendance fell in the year admission became free',
      'The director has published figures that contradict each other'],
    'Two things changed at once, and one of them was how visitors are counted',
    'A change in the measure and a change in the price arrived together, so the rise cannot be attributed to either. "Contradict each other" overstates: the problem is that comparable figures do not exist.'],
  ['vpet-c-22', 'C1',
    'The manufacturer\'s guarantee covers "failure under normal use". A tribunal has held that ' +
    'where a manufacturer knows a product is habitually used in a particular way, that use is ' +
    'normal for the purposes of the guarantee, whatever the instructions say.\n\nWhat does the ' +
    'ruling establish?',
    ['That what customers actually do can define normal use, not just the instructions',
      'That instructions have no bearing on a guarantee',
      'That guarantees cover any failure whatsoever',
      'That manufacturers must anticipate every possible use of a product'],
    'That what customers actually do can define normal use, not just the instructions',
    'The ruling turns on the manufacturer KNOWING about the habitual use. The two absolute options ("no bearing", "any failure") go further than the passage, which is the usual shape of a distractor at this level.'],
  ['vpet-c-23', 'C1',
    'The consultant recommended the cheaper of the two systems. Her fee was a fixed sum agreed ' +
    'in advance, and she had no commercial relationship with either supplier. The losing ' +
    'supplier has nonetheless asked for the recommendation to be reviewed, on the grounds ' +
    'that she had recommended the same system to three previous clients.\n\nWhat is the ' +
    'supplier\'s objection?',
    ['That she may be repeating a familiar choice rather than assessing this one',
      'That she was paid more for recommending the cheaper system',
      'That she has a commercial interest in the winning supplier',
      'That the cheaper system is unsuitable for this client'],
    'That she may be repeating a familiar choice rather than assessing this one',
    'The passage rules out both financial motives in its second sentence, which leaves habit as the only objection the last sentence could be making.'],
  ['vpet-c-24', 'C1',
    'A council introduced a twenty-minute limit on the parking bays outside a row of shops. ' +
    'Takings at the shops rose. The council attributes this to a faster turnover of customers. ' +
    'A shopkeepers\' association points out that the limit was introduced in the same week as ' +
    'a bus route change that brought two new services past the row.\n\nWhat is the ' +
    'association\'s point?',
    ['Another change that week could equally explain the rise in takings',
      'The parking limit has reduced the number of customers',
      'The bus route change has damaged trade at the shops',
      'Takings did not actually rise during the period'],
    'Another change that week could equally explain the rise in takings',
    'The association is not disputing the rise, only its cause — a confound, not a contradiction. Two of the distractors dispute the rise itself.'],
  ['vpet-c-25', 'C1',
    'The guidance says an employee "may" be granted leave in these circumstances, whereas the ' +
    'earlier version said an employer "shall" grant it. The department describes the change as ' +
    'a clarification and states that no change in practice is intended.\n\nWhat has changed?',
    ['An obligation on the employer has become a discretion',
      'Employees have lost the right to apply for leave',
      'The circumstances in which leave is available have narrowed',
      'Nothing has changed, as the department states'],
    'An obligation on the employer has become a discretion',
    '"Shall" binds and "may" permits, so the duty is gone whatever the stated intention. The passage reports the department\'s characterisation without endorsing it.'],
  ['vpet-c-26', 'C1',
    'The paper reports that the technique identified every case in the sample. Buried in the ' +
    'method section is the fact that the sample was assembled from records where the diagnosis ' +
    'had already been confirmed by other means.\n\nWhy does the second sentence matter?',
    ['The technique was only ever tested on cases already known to be positive',
      'The sample was too small for the result to be reliable',
      'The technique failed to identify some of the cases',
      'The diagnosis was confirmed after the technique was applied'],
    'The technique was only ever tested on cases already known to be positive',
    'With no negative cases in the sample there is nothing the technique could have got wrong, so "identified every case" is close to guaranteed. The passage says nothing about sample size.']
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
    'Three things are marked together: the request, a workable plan for the uncovered day, and a deadline. A message that only passes the request upwards has made the decision harder, not easier.'],

  /* C1. The B-level e-mails ask for a clear message in the right register. These
     ask for something harder: a message where the straightforward version would
     damage something the writer needs to keep. Saying no to a superior, going
     back on an agreement, delivering bad news to someone who will be angry.
     What rises is not the vocabulary but the number of things that have to be
     true at once. */
  ['vpet-d-09', 'C1',
    'Your director has asked you to take on a project starting next month. You are already ' +
    'committed to two pieces of work that she signed off, and taking the third would put all ' +
    'three at risk. She is not aware the other two overlap.\n\n' +
    'Write an email of about 180 words. Decline in a way that keeps the relationship and the ' +
    'project alive: set out the conflict, propose what could realistically be done, and leave ' +
    'the choice with her.',
    'A flat refusal and a reluctant yes both fail this. What is marked is whether the conflict is made visible, whether the alternative is concrete enough to be chosen, and whether the decision is genuinely handed back rather than pre-empted.'],
  ['vpet-d-10', 'C1',
    'Six weeks ago you agreed a price with a supplier. Your own costs have since risen and ' +
    'the agreed price would now lose you money. The supplier has done nothing wrong and you ' +
    'want to keep working with them.\n\n' +
    'Write an email of about 180 words asking to reopen the price. Acknowledge that you are ' +
    'the one going back on the agreement, explain what changed, and make an offer.',
    'The register problem is that the writer is in the wrong and still asking for something. An email that hides that, or that leans on it so heavily it never makes the ask, both lose marks. A specific offer is required — "some flexibility" is not one.'],
  ['vpet-d-11', 'C1',
    'A long-standing client has complained, in strong terms, about a delay that was in fact ' +
    'caused by their own late approval. You have the dates. You want to correct the record ' +
    'and keep the client.\n\n' +
    'Write an email of about 180 words. Set out what happened without accusing them, address ' +
    'the complaint itself, and say what will prevent a repeat.',
    'The dates do the work; the tone decides whether they land. Marked on whether the correction is unmistakable and whether it is made without a single sentence the client could read as blame.'],
  ['vpet-d-12', 'C1',
    'You recommended a candidate who was hired and has not worked out. Your manager has asked ' +
    'for your view in writing before a probation decision next week.\n\n' +
    'Write an email of about 180 words. Give an honest assessment, distinguish what you knew ' +
    'at the time from what is now clear, and say what you would recommend.',
    'Three things have to be kept apart: the assessment, the writer\'s own part in it, and the recommendation. Defending the original recommendation instead of assessing the person is the commonest way to fail this one.']
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
    'Scored on the three moves — interrupt, summarise, invite — and on whether the interruption stays courteous. Cutting the speaker off without acknowledging the point they were making misses.'],

  /* C1. Every one of these puts two obligations in tension and gives the speaker
     a minute. What is measured is whether both survive — not fluency, which the
     transcript cannot show anyway. */
  ['vpet-i-09', 'C1',
    'A supplier you rely on has missed a deadline for the third time. You cannot easily ' +
    'replace them, and the person you are speaking to is not the one who caused it.\n\n' +
    'Speak for up to one minute. Make clear this cannot continue, without threatening a ' +
    'relationship you need, and agree a specific next step.',
    'Firmness and dependence at the same time. A speaker who only complains has not asked for anything; one who only asks has let the third failure pass without comment. The specific next step is the third mark.'],
  ['vpet-i-10', 'C1',
    'Your team has been asked to adopt a new process you privately think is a mistake. The ' +
    'decision has been made and you are briefing your team, who will ask what you think.' +
    '\n\n' +
    'Speak for up to one minute. Explain the change, answer honestly when asked, and leave ' +
    'the team able to work with it.',
    'Being loyal to a decision and honest about it at once. Pretending to agree and openly undermining the decision both fail; what is marked is whether the speaker separates their view from what the team now has to do.'],
  ['vpet-i-11', 'C1',
    'You are presenting figures to a committee. Partway through, you realise a number on the ' +
    'slide behind you is wrong, and it is one the committee has already discussed.\n\n' +
    'Speak for up to one minute. Correct it there and then, say what it changes and what it ' +
    'does not, and carry on.',
    'The correction has to be unambiguous and the recovery has to be quick. Burying the error in qualification, or correcting it without saying which conclusions still stand, both lose marks.'],
  ['vpet-i-12', 'C1',
    'A colleague has asked you to support their proposal at a meeting tomorrow. You think ' +
    'parts of it are good and one part is unworkable. They have asked for a straight yes.' +
    '\n\n' +
    'Speak for up to one minute. Give them an answer they can plan around, and be specific ' +
    'about what you will and will not say.',
    'The task is to refuse the yes without refusing the person. Marked on whether the split is explicit — which parts are supported, which are not — and on whether the colleague could actually plan from the answer.']
];

/* The five audio parts live in their own file because their rows carry a `say`
   string and a bundled recording. They are the same bank, so they come back from
   the same call - nothing downstream should have to know there are two files. */
const AUDIO_PARTS = require('./vpet-items-audio');

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

  return out.concat(AUDIO_PARTS.rows());
}

module.exports = { rows, SOURCE, LICENCE };
