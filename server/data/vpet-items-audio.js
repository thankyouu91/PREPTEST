/**
 * VPET item bank - the five parts that need a recording: E, F, G, H and J.
 *
 * Kept apart from vpet-items.js because these rows carry something the others do
 * not: a `say` string, which is the words the candidate HEARS. The recording is
 * the item here. The prompt on screen is only the instruction, and for Parts E
 * and H it deliberately gives nothing away - printing the sentence next to a
 * dictation question would answer it.
 *
 * `say` is the single source for the audio. scripts/make-vpet-audio.mjs renders
 * each one to server/data/audio/<key>.mp3 at build time and those files are
 * committed, because the deploy runs `npm ci --omit=dev` and cannot synthesise
 * anything. server/db.js uploads them through server/storage.js on boot and
 * writes the resulting key onto the question, so the same rows work whether the
 * audio ends up on disk, S3, GCS or Supabase.
 *
 * The voices are synthetic. That is a stopgap and it is written down rather than
 * glossed over: a listening paper read by a formant synthesiser is a fair test of
 * whether the candidate caught the words, and a poor one of whether they can
 * follow a human speaker. Re-record `say` with real voices and drop the files in
 * under the same names - nothing else has to change.
 *
 * DEPTH. Same rule as the rest of the bank, counted per part PER LEVEL: fewer
 * than the blueprint count at that level (shallow, so the top-up from the other
 * level varies between sittings) or at least twice it (deep). Never the number in
 * between, which repeats every item with certainty on a retake. Every part here
 * is shallow at both levels and has enough across the two to fill a paper:
 *
 *   part   blueprint   B1   B2   total
 *   E          8        5    5     10
 *   F          8        5    5     10
 *   G          6        4    4      8
 *   H         10        6    6     12
 *   J          3        2    2      4
 *
 * MARKING. Part E is `gap`, and server/marking.js compares after collapsing
 * whitespace, lowercasing and stripping punctuation from the ENDS only - an
 * internal comma would have to be typed. So no dictation sentence here contains
 * one, and no contraction either, since "do not" and "don't" both sound right and
 * only one can be the key. Parts G, H and J are `speaking` and carry no answer
 * at all: they are rubric-marked, and marking leaves them pending rather than
 * scoring them zero. Part G's model answers travel as `modelAnswer`, read only
 * by the marker - see scriptFor() in server/ai-marking-run.js.
 *
 * PROVENANCE. Written for this platform. Nothing is transcribed from a published
 * test. See docs/VPET-BLUEPRINT.md for what each part measures and how to write
 * one.
 */
'use strict';

/* Same provenance strings as the rest of the bank - one bank, one origin. */
const SOURCE = 'VPET Prep — written for this platform';
const LICENCE = 'Project content; no third-party list reproduced';

/* ---------------------------------------------------------------- *
 * Part E - Dictation.  Hear one sentence, type it exactly.
 *   [key, level, say/answer, explanation]
 * The sentence IS the answer, so it is written once.
 * ---------------------------------------------------------------- */
const PART_E = [
  ['vpet-e-01', 'B1', 'The meeting has been moved to Thursday morning.',
    'Tests whether the candidate hears the passive "has been moved" rather than "has moved". Both are plausible sentences; only one is said.'],
  ['vpet-e-02', 'B1', 'Please send me the invoice before the end of the week.',
    'Nine words with no stressed content word at the end, so the final phrase is the part most often dropped.'],
  ['vpet-e-03', 'B1', 'There is a small problem with the delivery address.',
    'The unstressed "there is" opening is easy to lose; candidates often start writing at "a small problem".'],
  ['vpet-e-04', 'B1', 'We need two more chairs for the training room.',
    'Short and concrete. It measures spelling and the plural -s more than it measures listening.'],
  ['vpet-e-05', 'B1', 'The office will be closed on Monday for maintenance.',
    '"Will be closed" against "will close" is the point. Also checks the spelling of maintenance, which is commonly wrong.'],

  ['vpet-e-06', 'B2', 'The supplier has agreed to cover the cost of the delay.',
    'Three unstressed function words in a row - "to cover the" - inside a longer sentence.'],
  ['vpet-e-07', 'B2', 'Nobody had warned us that the software would be replaced.',
    'Past perfect plus a passive in the same sentence, at a length where holding the whole thing in memory starts to matter.'],
  ['vpet-e-08', 'B2', 'Attendance has fallen steadily since the venue changed.',
    'Two low-frequency nouns, and an adverb between the verb and its time clause where candidates expect the clause to arrive sooner.'],
  ['vpet-e-09', 'B2', 'The report should reach the board before it is discussed.',
    'Eleven words, all short. Length rather than vocabulary is what makes it hard.'],
  ['vpet-e-10', 'B2', 'Whoever signs the form takes responsibility for the figures.',
    'A subject clause opening with "whoever", which candidates frequently write as "who ever" or reduce to "who".']
];

/* ---------------------------------------------------------------- *
 * Part F - Response Selection.  Hear a line, pick the natural reply.
 *   [key, level, say, options, answer, explanation]
 * THREE options, not four: "You will listen to a sentence. You will see three
 * possible answers." (Official Guide, Part F). The two distractors that survived
 * the cut are the ones that fail on fit rather than on form - a reply that is
 * merely off-topic teaches nothing.
 * The answer sits at a different position across the ten, because the reading
 * bank was written with the key first in all fourteen of its items and a
 * candidate who notices that scores without listening.
 * ---------------------------------------------------------------- */
const PART_F = [
  ['vpet-f-01', 'B1', 'Would you like me to book a table for seven?',
    ['I have been there twice.',
      'About twenty minutes.',
      'Yes, please, that would help.'],
    'Yes, please, that would help.',
    'An offer wants an acceptance or a refusal. The other three answer questions that were not asked.'],
  ['vpet-f-02', 'B1', 'Sorry, I did not catch your name.',
    ['It is Mai. M, A, I.',
      'Yes, I did.',
      'No, thank you.'],
    'It is Mai. M, A, I.',
    '"I did not catch" is a request to repeat, not a statement about hearing. "Yes, I did" answers it as though it were a question.'],
  ['vpet-f-03', 'B1', 'How was the training session?',
    ['By train.',
      'Longer than I expected.',
      'On the third floor.'],
    'Longer than I expected.',
    '"How was" asks for an impression. "By train" is the trap for anyone who hears only the word training.'],
  ['vpet-f-04', 'B1', 'Do you mind if I open the window?',
    ['Yes, I opened it.',
      'About an hour ago.',
      'Not at all, go ahead.'],
    'Not at all, go ahead.',
    'The polite yes to "do you mind" is a negative. Candidates who answer the surface question agree to the wrong thing.'],
  ['vpet-f-05', 'B1', 'I am afraid the printer is out of paper again.',
    ['I will fetch some from the store room.',
      'Yes, it prints well.',
      'Since last Tuesday.'],
    'I will fetch some from the store room.',
    '"I am afraid" signals a problem being reported, so the reply that fits is an offer to fix it.'],

  ['vpet-f-06', 'B2', 'I would rather we did not raise this at the meeting.',
    ['I raised it last week.',
      'Understood. I will speak to her privately instead.',
      'Yes, the meeting is at ten.'],
    'Understood. I will speak to her privately instead.',
    '"I would rather we did not" is a request, phrased as a preference. The reply has to acknowledge it and adjust.'],
  ['vpet-f-07', 'B2', 'Had I known the deadline had moved, I would have said something.',
    ['Yes, I said something.',
      'The deadline is Friday.',
      'Nobody was told, to be fair.'],
    'Nobody was told, to be fair.',
    'The inverted conditional carries a note of regret and mild self-defence. Only one reply answers that rather than the literal words.'],
  ['vpet-f-08', 'B2', 'You could not have picked a worse week to be away.',
    ['I am sorry. It was booked months ago.',
      'The weather was terrible.',
      'I will be away on Tuesday.'],
    'I am sorry. It was booked months ago.',
    'A complaint dressed as an observation. The fitting reply apologises and explains; the others take it at face value.'],
  ['vpet-f-09', 'B2', 'Is there any chance you could look at this before you go?',
    ['It is a good chance.',
      'Give me ten minutes and I will.',
      'I went yesterday.'],
    'Give me ten minutes and I will.',
    '"Is there any chance" is a softened request. The distractor "it is a good chance" tests whether chance was heard as a noun in isolation.'],
  ['vpet-f-10', 'B2', 'That is not quite what I had in mind.',
    ['Yes, I had it in mind.',
      'I will mind it.',
      'Tell me what you were expecting.'],
    'Tell me what you were expecting.',
    '"Not quite" is a soft rejection asking for direction. The reply that fits invites the speaker to say more.']
];

/* ---------------------------------------------------------------- *
 * Part G - Passage Comprehension.  Hear a passage, answer one question.
 *   [key, level, say, question, options, answer, explanation]
 * The question is on screen; the passage is only heard.
 * ---------------------------------------------------------------- */
/* ---------------------------------------------------------------- *
 * Part G - Passage Comprehension.
 *   [key, level, group, say, question, answer, explanation]
 *
 *   "You will hear a passage about an everyday or workplace situation. There
 *    will be THREE questions about the passage. You answer the questions by
 *    SPEAKING OUT LOUD."
 *   Tips: "Answer using a short phrase or a very short sentence."
 *
 * Three items share a `group` and therefore share one passage, heard once for
 * all three. Every item in a group carries the same `say`: the recording is
 * played once, at the top of the group, but the marker is given the passage
 * for each question and cannot judge an answer without it.
 *
 * `answer` is the model answer, not something the candidate ever sees. It is
 * what a short correct reply looks like - three or four words, usually - and
 * exists so the rubric has something to compare a transcript against.
 *
 * The questions are deliberately not all "what happened": one asks for a fact
 * carried in a number, one for a reason, one for something the speaker implies
 * without saying. A passage answered entirely by remembering nouns is testing
 * memory rather than comprehension.
 * ---------------------------------------------------------------- */
const PART_G = [
  /* ---- B1, passage 1: a delivery going wrong ---- */
  ['vpet-g-01', 'B1', 'g-b1-1',
    'Thanh works in a small warehouse. On Monday a delivery of forty boxes arrived, but '
    + 'eight of them were damaged. She called the supplier, who offered to send replacements '
    + 'on Thursday. Thanh asked for Wednesday instead, because the shop they supply opens on '
    + 'Thursday morning and needs the stock the day before.',
    'How many boxes were damaged?', 'Eight.',
    'A number carried in the middle of the passage, with another number - forty - in front of it to be confused with.'],
  ['vpet-g-02', 'B1', 'g-b1-1',
    'Thanh works in a small warehouse. On Monday a delivery of forty boxes arrived, but '
    + 'eight of them were damaged. She called the supplier, who offered to send replacements '
    + 'on Thursday. Thanh asked for Wednesday instead, because the shop they supply opens on '
    + 'Thursday morning and needs the stock the day before.',
    'Why did Thanh ask for Wednesday?', 'The shop opens on Thursday.',
    'The reason is in the last clause. Answering "because she wanted it sooner" is true and does not answer the question.'],
  ['vpet-g-03', 'B1', 'g-b1-1',
    'Thanh works in a small warehouse. On Monday a delivery of forty boxes arrived, but '
    + 'eight of them were damaged. She called the supplier, who offered to send replacements '
    + 'on Thursday. Thanh asked for Wednesday instead, because the shop they supply opens on '
    + 'Thursday morning and needs the stock the day before.',
    'Who did Thanh telephone?', 'The supplier.',
    'Said once, in passing. The passage never uses the word "phone" again.'],

  /* ---- B1, passage 2: a change to a bus route ---- */
  ['vpet-g-04', 'B1', 'g-b1-2',
    'From the first of June the number twelve bus will no longer stop outside the hospital. '
    + 'It will stop at the corner of Le Loi street instead, about four minutes further to walk. '
    + 'The company says the hospital stop was holding up traffic every morning. Passengers who '
    + 'cannot walk that far can ask the driver to use the old stop.',
    'Where will the bus stop from June?', 'The corner of Le Loi street.',
    'The new stop is named immediately after the old one is ruled out; the two are easy to swap.'],
  ['vpet-g-05', 'B1', 'g-b1-2',
    'From the first of June the number twelve bus will no longer stop outside the hospital. '
    + 'It will stop at the corner of Le Loi street instead, about four minutes further to walk. '
    + 'The company says the hospital stop was holding up traffic every morning. Passengers who '
    + 'cannot walk that far can ask the driver to use the old stop.',
    'Why is the stop being moved?', 'It was holding up traffic.',
    'The reason is attributed to the company rather than stated flatly, which is how a real announcement gives one.'],
  ['vpet-g-06', 'B1', 'g-b1-2',
    'From the first of June the number twelve bus will no longer stop outside the hospital. '
    + 'It will stop at the corner of Le Loi street instead, about four minutes further to walk. '
    + 'The company says the hospital stop was holding up traffic every morning. Passengers who '
    + 'cannot walk that far can ask the driver to use the old stop.',
    'What can a passenger who cannot walk far do?', 'Ask the driver to stop at the old stop.',
    'The exception arrives last, after the listener has already accepted the rule.'],

  /* ---- B1, passage 3: a shift swap ---- */
  ['vpet-g-07', 'B1', 'g-b1-3',
    'Minh was down to work on Saturday, but his sister is getting married that day. He asked '
    + 'Hoa to swap, and she agreed to take Saturday if he takes her Tuesday evening shift. '
    + 'Their manager said that is fine as long as one of them writes it on the board before '
    + 'Friday, because the pay is worked out from the board and not from what people remember.',
    'What does Minh want to do on Saturday?', 'Go to his sister’s wedding.',
    'The reason for the swap, not the swap itself. A candidate who answers "swap his shift" has heard the mechanism and missed the cause.'],
  ['vpet-g-08', 'B1', 'g-b1-3',
    'Minh was down to work on Saturday, but his sister is getting married that day. He asked '
    + 'Hoa to swap, and she agreed to take Saturday if he takes her Tuesday evening shift. '
    + 'Their manager said that is fine as long as one of them writes it on the board before '
    + 'Friday, because the pay is worked out from the board and not from what people remember.',
    'What must they do before Friday?', 'Write the swap on the board.',
    'A condition attached to permission. The deadline and the action are in the same clause and both are needed.'],
  ['vpet-g-09', 'B1', 'g-b1-3',
    'Minh was down to work on Saturday, but his sister is getting married that day. He asked '
    + 'Hoa to swap, and she agreed to take Saturday if he takes her Tuesday evening shift. '
    + 'Their manager said that is fine as long as one of them writes it on the board before '
    + 'Friday, because the pay is worked out from the board and not from what people remember.',
    'Why does the board matter?', 'The pay is worked out from it.',
    'Stated as a subordinate reason at the very end, when attention has usually gone.'],

  /* ---- B1, passage 4: a lost card ---- */
  ['vpet-g-10', 'B1', 'g-b1-4',
    'Lan could not find her bank card on Sunday evening. She used the app to freeze it, which '
    + 'stops anyone spending on it but does not cancel it. On Monday morning she found the card '
    + 'in a coat pocket, so she unfroze it in the app rather than ordering a new one. The bank '
    + 'charges nothing to freeze a card, but a replacement takes about a week.',
    'What did Lan do on Sunday evening?', 'She froze her card.',
    'Froze, not cancelled - the passage draws the distinction in the next clause, and it is the whole point of the story.'],
  ['vpet-g-11', 'B1', 'g-b1-4',
    'Lan could not find her bank card on Sunday evening. She used the app to freeze it, which '
    + 'stops anyone spending on it but does not cancel it. On Monday morning she found the card '
    + 'in a coat pocket, so she unfroze it in the app rather than ordering a new one. The bank '
    + 'charges nothing to freeze a card, but a replacement takes about a week.',
    'Where did Lan find the card?', 'In a coat pocket.',
    'A small concrete detail in a passage otherwise made of procedure.'],
  ['vpet-g-12', 'B1', 'g-b1-4',
    'Lan could not find her bank card on Sunday evening. She used the app to freeze it, which '
    + 'stops anyone spending on it but does not cancel it. On Monday morning she found the card '
    + 'in a coat pocket, so she unfroze it in the app rather than ordering a new one. The bank '
    + 'charges nothing to freeze a card, but a replacement takes about a week.',
    'How long does a replacement card take?', 'About a week.',
    'The last fact, and one that is never acted on - it explains why freezing was the better move.'],

  /* ---- B2, passage 1: a project slipping ---- */
  ['vpet-g-13', 'B2', 'g-b2-1',
    'The team had promised the client a working version by the end of March. Two of the four '
    + 'developers were pulled onto an urgent security fix in February, and the work has slipped '
    + 'by roughly three weeks. Rather than announce a new date straight away, the project lead '
    + 'wants to show the client what is already finished, on the grounds that a date given twice '
    + 'and missed twice costs more trust than a delay explained once.',
    'Why has the project slipped?', 'Two developers were moved to a security fix.',
    'The cause is a reassignment, not a technical difficulty - a distinction candidates routinely flatten.'],
  ['vpet-g-14', 'B2', 'g-b2-1',
    'The team had promised the client a working version by the end of March. Two of the four '
    + 'developers were pulled onto an urgent security fix in February, and the work has slipped '
    + 'by roughly three weeks. Rather than announce a new date straight away, the project lead '
    + 'wants to show the client what is already finished, on the grounds that a date given twice '
    + 'and missed twice costs more trust than a delay explained once.',
    'What does the project lead want to do first?', 'Show the client the finished work.',
    'Ordering matters: the passage names what he will NOT do first, then what he will.'],
  ['vpet-g-15', 'B2', 'g-b2-1',
    'The team had promised the client a working version by the end of March. Two of the four '
    + 'developers were pulled onto an urgent security fix in February, and the work has slipped '
    + 'by roughly three weeks. Rather than announce a new date straight away, the project lead '
    + 'wants to show the client what is already finished, on the grounds that a date given twice '
    + 'and missed twice costs more trust than a delay explained once.',
    'What is he trying to avoid?', 'Giving a second date and missing it.',
    'Inference. The passage gives the principle rather than the risk, and the answer is the risk it implies.'],

  /* ---- B2, passage 2: a hiring decision ---- */
  ['vpet-g-16', 'B2', 'g-b2-2',
    'Two candidates reached the final round. The first has six years in the industry but has '
    + 'only ever worked at one company. The second has three years across four employers and '
    + 'much stronger references from the people who managed her. The panel is split, and the '
    + 'head of department has asked both to spend a morning with the team before anyone decides, '
    + 'which nobody has done here before.',
    'How many years has the second candidate worked?', 'Three years.',
    'Four numbers pass in two sentences. The one asked for is attached to the second candidate, not the first.'],
  ['vpet-g-17', 'B2', 'g-b2-2',
    'Two candidates reached the final round. The first has six years in the industry but has '
    + 'only ever worked at one company. The second has three years across four employers and '
    + 'much stronger references from the people who managed her. The panel is split, and the '
    + 'head of department has asked both to spend a morning with the team before anyone decides, '
    + 'which nobody has done here before.',
    'What has the head of department asked for?', 'A morning with the team.',
    'The action is buried behind the reason for it.'],
  ['vpet-g-18', 'B2', 'g-b2-2',
    'Two candidates reached the final round. The first has six years in the industry but has '
    + 'only ever worked at one company. The second has three years across four employers and '
    + 'much stronger references from the people who managed her. The panel is split, and the '
    + 'head of department has asked both to spend a morning with the team before anyone decides, '
    + 'which nobody has done here before.',
    'What is unusual about this decision?', 'They have never done the team morning before.',
    'The final clause qualifies the whole sentence rather than the noun beside it.'],

  /* ---- B2, passage 3: a policy that backfired ---- */
  ['vpet-g-19', 'B2', 'g-b2-3',
    'To cut printing costs the office asked everyone to print double-sided by default. Costs fell '
    + 'in the first month and then rose above where they started, because staff found the '
    + 'double-sided setting slow and began sending jobs to the colour printer instead, which is '
    + 'far more expensive per page. The rule was not withdrawn; the slow printer was replaced.',
    'What was the rule meant to do?', 'Cut printing costs.',
    'The purpose is in the opening clause, before the subject of the sentence arrives.'],
  ['vpet-g-20', 'B2', 'g-b2-3',
    'To cut printing costs the office asked everyone to print double-sided by default. Costs fell '
    + 'in the first month and then rose above where they started, because staff found the '
    + 'double-sided setting slow and began sending jobs to the colour printer instead, which is '
    + 'far more expensive per page. The rule was not withdrawn; the slow printer was replaced.',
    'Why did the printing costs rise?', 'Staff used the colour printer instead.',
    'A two-step cause: the setting was slow, so people moved to a dearer machine. Naming only "it was slow" stops halfway.'],
  ['vpet-g-21', 'B2', 'g-b2-3',
    'To cut printing costs the office asked everyone to print double-sided by default. Costs fell '
    + 'in the first month and then rose above where they started, because staff found the '
    + 'double-sided setting slow and began sending jobs to the colour printer instead, which is '
    + 'far more expensive per page. The rule was not withdrawn; the slow printer was replaced.',
    'What did the office do in the end?', 'They replaced the slow printer.',
    'The last clause contrasts with what was NOT done, and the contrast is where candidates pick the wrong half.'],

  /* ---- B2, passage 4: a complaint handled well ---- */
  ['vpet-g-22', 'B2', 'g-b2-4',
    'A customer wrote to say her order had arrived opened. The support agent refunded the postage '
    + 'the same day and sent a replacement without asking for the damaged one back, which is not '
    + 'what the policy says. Her manager backed the decision afterwards: the item was worth less '
    + 'than the cost of collecting it, and the customer had been with them for nine years.',
    'What was wrong with the order?', 'It arrived opened.',
    'The opening fact, before any of the response. Short passages still reward listening from the first word.'],
  ['vpet-g-23', 'B2', 'g-b2-4',
    'A customer wrote to say her order had arrived opened. The support agent refunded the postage '
    + 'the same day and sent a replacement without asking for the damaged one back, which is not '
    + 'what the policy says. Her manager backed the decision afterwards: the item was worth less '
    + 'than the cost of collecting it, and the customer had been with them for nine years.',
    'What did the agent do that the policy does not allow?', 'She did not ask for the item back.',
    'The breach is named in a relative clause, not as the main verb.'],
  ['vpet-g-24', 'B2', 'g-b2-4',
    'A customer wrote to say her order had arrived opened. The support agent refunded the postage '
    + 'the same day and sent a replacement without asking for the damaged one back, which is not '
    + 'what the policy says. Her manager backed the decision afterwards: the item was worth less '
    + 'than the cost of collecting it, and the customer had been with them for nine years.',
    'Why did the manager agree?', 'Collecting it cost more than the item.',
    'Two reasons are given; either alone is a correct short answer, which is the point of a short-phrase reply.']
];

/* ---------------------------------------------------------------- *
 * Part H - Repeat.  Hear a sentence, say it back exactly.
 *   [key, level, say, explanation]
 * Length climbs within each level; that climb is the measurement.
 * ---------------------------------------------------------------- */
const PART_H = [
  ['vpet-h-01', 'B1', 'The train leaves at six.',
    'Five words. Almost everyone repeats this; it is here so the part does not open on a failure.'],
  ['vpet-h-02', 'B1', 'She works in the office next to ours.',
    'Eight words, all high frequency. Scores pronunciation rather than memory.'],
  ['vpet-h-03', 'B1', 'I will call you back as soon as the meeting finishes.',
    'Eleven words in two clauses. The clause boundary is where repetitions start to break.'],
  ['vpet-h-04', 'B1', 'They have not decided where to hold the conference this year.',
    'Eleven words with a negative and an embedded question, which candidates often smooth into a statement.'],
  ['vpet-h-05', 'B1', 'The parcel should arrive before Friday if it was posted on Monday.',
    'Twelve words carrying two dates. Losing one of them is the usual error.'],
  ['vpet-h-06', 'B1', 'We asked for a quieter room but the hotel said they were full.',
    'Thirteen words. At this length a candidate who has been repeating word by word runs out.'],

  ['vpet-h-07', 'B2', 'Whether the plan works depends on how quickly people adapt to it.',
    'Twelve words opening on a subject clause, so the main verb does not arrive until late.'],
  ['vpet-h-08', 'B2', 'Had the figures been checked earlier the error would have been obvious.',
    'Twelve words, inverted conditional. Candidates routinely restore it to "if the figures had been", which is a repeat failure even though the meaning survives.'],
  ['vpet-h-09', 'B2', 'The committee agreed to postpone the decision until the report is published.',
    'Twelve words, three of them low frequency. Vocabulary and length pull together here.'],
  ['vpet-h-10', 'B2', 'Not once during the whole discussion did anyone mention the cost.',
    'Eleven words with a fronted negative forcing inversion, the structure most often flattened on repeat.'],
  ['vpet-h-11', 'B2', 'What surprised us was not the delay itself but how late we were told.',
    'Fourteen words in a cleft with a not-but contrast. Both halves have to survive.'],
  ['vpet-h-12', 'B2', 'The sooner we agree on a date the easier the rest of the arrangements become.',
    'Fifteen words on a the-sooner-the-easier frame, the longest in the part and the clearest test of holding a whole structure.']
];

/* ---------------------------------------------------------------- *
 * Part J - Story Retellings.  Hear a story, retell it in your own words.
 *   [key, level, say, explanation]
 * Rubric-marked: the events, their order, and the point of the story.
 * ---------------------------------------------------------------- */
const PART_J = [
  ['vpet-j-01', 'B1',
    'Last winter Mrs Hoa noticed that the light in the stairwell of her building had stopped '
    + 'working. She reported it to the management office twice and nothing happened. So one '
    + 'evening she bought a bulb herself, borrowed a ladder from the shop downstairs, and '
    + 'changed it. The next morning a notice appeared in the lobby thanking the management '
    + 'company for repairing the light. Mrs Hoa read it, said nothing, and kept the receipt.',
    'Four events in order plus a closing detail that carries the joke. A retelling that reports the facts and misses why the receipt matters has understood the words but not the story.'],
  ['vpet-j-02', 'B1',
    'A young man arrived twenty minutes early for a job interview and sat in the waiting area. '
    + 'While he waited, an older woman came in carrying two heavy boxes and could not open the '
    + 'inner door. He got up, held the door, and helped her carry the boxes to a desk. When he '
    + 'was finally called in, the same woman was sitting behind the interview table. She did '
    + 'not mention the boxes, and neither did he.',
    'Tests whether the retelling keeps the reveal until the end, as the original does. Candidates who open with "he helped his interviewer" have retold the facts and thrown away the shape.'],

  ['vpet-j-03', 'B2',
    'A bakery near the station had a rule that anything unsold by closing time went to the '
    + 'shelter around the corner. One year the owner decided to bake less, so that less would '
    + 'be wasted. It worked, in the sense that almost nothing was left over. But the shelter, '
    + 'which had come to count on the deliveries, had to start buying bread it had not budgeted '
    + 'for. The owner heard about it in the spring, and went back to baking too much on purpose.',
    'A story whose point is a consequence nobody intended. A good retelling makes the reason for going back to overbaking explicit; a weak one reports the change of mind as a change of heart.'],
  ['vpet-j-04', 'B2',
    'An engineer was asked to find out why one lift in an office block was always slower than '
    + 'the other three. She measured everything and found no difference at all: the motor, the '
    + 'doors and the timing were identical. What was different was the floor. That lift was the '
    + 'one nearest the entrance, so it filled first and stopped at every level. Her report '
    + 'recommended moving the reception desk, and the complaints stopped within a month.',
    'The resolution turns on a distinction between the lift and its position. A retelling that says the lift was broken has missed the entire point, even if every other detail is right.']
];

/** Flattened into the shape the seed inserts, with `say` carried through. */
function rows() {
  const out = [];
  const push = (key, part, skill, type, level, prompt, options, answer, explanation, say, group) => {
    const row = {
      key, part, skill, type, level, prompt,
      options: options || [],
      answer: answer || '',
      explanation,
      say,
      /* Null for every part answered item by item, which is all of them but G.
         Carried through to questions.group_key, and it is what lets the runner
         play one recording for three questions instead of three. */
      group: group || null,
      tags: ['vpet', 'part-' + part.toLowerCase(), 'audio'],
      source: SOURCE,
      licence: LICENCE
    };
    out.push(row);
    return row;
  };

  /* The instruction, not the sentence: printing the words next to a dictation
     question would answer it. Same for Part H. */
  for (const [key, level, say, explanation] of PART_E)
    push(key, 'E', 'listening', 'gap', level,
      'Listen, then type the sentence exactly as you hear it.', [], say, explanation, say);

  for (const [key, level, say, options, answer, explanation] of PART_F)
    push(key, 'F', 'listening', 'mcq', level,
      'Listen, then choose the best reply.', options, answer, explanation, say);

  /* Scored as Listening, answered by speaking. The type decides how the answer
     is collected and who marks it; the skill decides which band it counts
     towards. For Part G those are genuinely different questions, and the guide
     answers both: the part is Listening, and "you answer the questions by
     speaking out loud". */
  for (const [key, level, group, say, question, answer, explanation] of PART_G) {
    /* The model answer does NOT go into the item's `answer`. That column is
       empty on every rubric-marked item and stays that way: it is what a string
       comparison would reach for, and a spoken answer marked by exact match is
       a candidate failed for saying the right thing differently.
       It travels as `modelAnswer` instead, which only the marker reads. */
    const it = push(key, 'G', 'listening', 'speaking', level, question, [], '', explanation, say, group);
    it.modelAnswer = answer;
  }

  for (const [key, level, say, explanation] of PART_H)
    push(key, 'H', 'speaking', 'speaking', level,
      'Listen, then say the sentence back exactly.', [], '', explanation, say);

  for (const [key, level, say, explanation] of PART_J)
    push(key, 'J', 'speaking', 'speaking', level,
      'Listen to the story, then retell it in your own words.', [], '', explanation, say);

  return out;
}

module.exports = { rows, SOURCE, LICENCE };
