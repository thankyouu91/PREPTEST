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
 * is now DEEP at C1 — two Level 2 sittings can be drawn without repeating an
 * item — and shallow at B1 and B2, which between them fill a Level 1 paper:
 *
 *   part   blueprint   B1   B2   C1   total
 *   E          8        5    5   16      26
 *   F          8        5    5   16      26
 *   G          6        4    4   12      20
 *   H         10        6    6   20      32
 *   J          3        2    2    6      10
 *
 * The C1 sets exist because VPET is two papers and Level 2 reports up to C2
 * (docs/VPET-OFFICIAL-SPEC.md §0). A Level 2 paper drawn from B2 material
 * cannot reach the top of the range it is supposed to report, so these are the
 * difference between a Level 2 paper and a hard Level 1 one.
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
    'A subject clause opening with "whoever", which candidates frequently write as "who ever" or reduce to "who".'],

  /* C1. Longer, and the length is not the point — subordination is. A B2
     dictation is a clause and a tail; these carry a subordinate clause the
     candidate must hold intact while still writing the main one. Same two
     constraints as every sentence in this part: no internal comma and no
     contraction, because marking strips punctuation from the ends only and
     "do not" and "don't" both sound right. */
  ['vpet-e-11', 'C1', 'The committee has deferred its decision until the auditors have reported.',
    'Twelve words with the weight at the end. "Deferred" and "auditors" are both C1 vocabulary that has to be spelt, not just heard.'],
  ['vpet-e-12', 'C1', 'Attendance figures were revised downwards after an error in the counting method was discovered.',
    'Fourteen words and two passives. The second passive is five words from its subject, which is where the sentence usually collapses.'],
  ['vpet-e-13', 'C1', 'Nobody had anticipated that the consultation would attract quite so many responses.',
    'The past perfect opening is unstressed and easily written as "nobody anticipated". "Quite so many" is the other trap.'],
  ['vpet-e-14', 'C1', 'Funding for the scheme will be withdrawn unless the targets are met by December.',
    'A conditional carried by "unless" rather than "if not". Candidates who hear it as "if" often reverse the meaning in writing.'],
  ['vpet-e-15', 'C1', 'She argued that the evidence was insufficient to justify such a substantial change.',
    'Fourteen words with three long Latinate items in a row. Each is unambiguous heard; each is commonly misspelt.'],
  ['vpet-e-16', 'C1', 'The revised guidance takes effect from the first of April without exception.',
    'Short for this set, and the difficulty is entirely in "takes effect" against "takes affect", which sound identical.'],
  ['vpet-e-17', 'C1', 'Delegates were reminded that the discussion remained strictly confidential.',
    'A reporting passive with no agent. "Were reminded" is easy to hear as "remembered", which changes who did what.'],
  ['vpet-e-18', 'C1', 'A significant proportion of respondents declined to answer the final question.',
    'The subject is four words long before the verb arrives, and "proportion" governs a singular verb despite the plural next to it.'],
  ['vpet-e-19', 'C1', 'The department acknowledged the delay but disputed the figures quoted in the report.',
    'Two contrasting verbs sharing one subject, then a reduced relative clause. Dropping "quoted" leaves a sentence that still parses, which is why it goes.'],
  ['vpet-e-20', 'C1', 'Any application submitted after the deadline will be returned without consideration.',
    'A reduced relative clause inside the subject. Candidates often insert "that is" and change the sentence they were given.'],
  ['vpet-e-21', 'C1', 'The proposal was withdrawn shortly before the vote was due to take place.',
    'Fourteen words and two time relations. "Was due to take place" is four unstressed syllables at the end, the position most often lost.'],
  ['vpet-e-22', 'C1', 'Several members expressed reservations about the timetable that had been proposed.',
    '"Reservations" in its abstract sense, not the booking sense, and a relative clause in the past perfect passive.'],
  ['vpet-e-23', 'C1', 'The findings were published simultaneously in three separate journals.',
    'Eleven words. "Simultaneously" is five syllables and carries no meaning the rest of the sentence gives away.'],
  ['vpet-e-24', 'C1', 'Responsibility for the oversight has not yet been formally assigned.',
    'A four-part verb group with the negative in the middle. "Oversight" here means the failure to notice, not supervision.'],
  ['vpet-e-25', 'C1', 'The contract permits either party to terminate with ninety days of notice.',
    'Deliberately "ninety days of notice" rather than the idiomatic possessive: an internal apostrophe would have to be typed exactly and this part strips punctuation only from the ends.'],
  ['vpet-e-26', 'C1', 'Nothing in the agreement prevents the supplier from raising its prices later.',
    'A negative subject with a positive verb, which candidates routinely flip. "Prevents from" is the other half of the item.'],
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
    '"Not quite" is a soft rejection asking for direction. The reply that fits invites the speaker to say more.'],

  /* C1. The B-level prompts here are direct speech acts wearing ordinary
     clothes: an offer, a request, a question. These are indirect ones — a
     request shaped like a doubt, a disagreement shaped like an agreement, a
     refusal that never says no. Each distractor answers the LITERAL sentence,
     which is exactly the mistake the part is looking for. */
  ['vpet-f-11', 'C1', 'I do not suppose you could look at this before Thursday?',
    ['No, I do not suppose so.',
      'Thursday should be fine. Send it over.',
      'I looked at it on Thursday.'],
    'Thursday should be fine. Send it over.',
    'A request buried under two hedges. "No, I do not suppose so" answers the grammar and refuses something nobody asked.'],
  ['vpet-f-12', 'C1', 'You would not happen to know who signed this off?',
    ['It was Mai, I think. Shall I check?',
      'No, it did not happen.',
      'Yes, I would.'],
    'It was Mai, I think. Shall I check?',
    '"You would not happen to know" is a polite question, not a conditional. The other two parse it as one.'],
  ['vpet-f-13', 'C1', 'I would rather we did not go over this again.',
    ['All right. What would you like to do instead?',
      'Yes, let us go over it again.',
      'I would rather too.'],
    'All right. What would you like to do instead?',
    'A refusal stated as a preference. Agreeing with the words ("yes, let us") reverses what was asked.'],
  ['vpet-f-14', 'C1', 'That is one way of putting it.',
    ['You do not sound convinced. How would you put it?',
      'Thank you, I thought it was clear.',
      'There are many ways of putting it.'],
    'You do not sound convinced. How would you put it?',
    'A disagreement dressed as acknowledgement. Reading it as praise is the trap, and it is a common one.'],
  ['vpet-f-15', 'C1', 'I will be honest, the timing is not ideal.',
    ['I understand. Would later in the month be easier?',
      'Thank you for being honest with me.',
      'The timing was ideal, actually.'],
    'I understand. Would later in the month be easier?',
    'A soft refusal that invites a counter-offer. Thanking the speaker for honesty ends the exchange without addressing it.'],
  ['vpet-f-16', 'C1', 'I was rather hoping we could settle this today.',
    ['We can. What is still open?',
      'I hope so too.',
      'Yes, it was settled today.'],
    'We can. What is still open?',
    '"I was rather hoping" is a request in the past tense. Answering the hope rather than the request leaves the speaker where they started.'],
  ['vpet-f-17', 'C1', 'It is not that I disagree, exactly.',
    ['But something is bothering you. Go on.',
      'Good, then we are agreed.',
      'I did not say you disagreed.'],
    'But something is bothering you. Go on.',
    'The hedge announces an objection that has not arrived yet. Treating it as agreement closes a door the speaker just opened.'],
  ['vpet-f-18', 'C1', 'You may want to check that figure again.',
    ['Which one? I will look now.',
      'No thank you, I do not want to.',
      'I checked it again yesterday.'],
    'Which one? I will look now.',
    '"You may want to" is a warning that something is wrong, not an offer. The literal reading turns a correction into a preference.'],
  ['vpet-f-19', 'C1', 'I will leave that with you then.',
    ['Understood. I will come back to you by Friday.',
      'Where will you leave it?',
      'Thank you, I will leave it with you too.'],
    'Understood. I will come back to you by Friday.',
    'A handover of responsibility. The right response accepts the task and names a time; the others take "leave" literally.'],
  ['vpet-f-20', 'C1', 'Is there any chance of moving this to next week?',
    ['Probably. Let me see what else is booked.',
      'Yes, there is a chance of that.',
      'It moved to next week already.'],
    'Probably. Let me see what else is booked.',
    'A request phrased as a question about possibility. Confirming that a chance exists answers nothing.'],
  ['vpet-f-21', 'C1', 'I am not sure that is entirely fair.',
    ['Tell me which part you disagree with.',
      'I am not sure either.',
      'It was completely fair.'],
    'Tell me which part you disagree with.',
    'A challenge with the edges filed off. Agreeing with the uncertainty misses that an objection is being raised.'],
  ['vpet-f-22', 'C1', 'We could always come back to it.',
    ['Fine. Let us park it and move on.',
      'When did we come back to it?',
      'No, we could not.'],
    'Fine. Let us park it and move on.',
    'A proposal to postpone, phrased as a possibility. The reply that fits accepts the postponement.'],
  ['vpet-f-23', 'C1', 'If it were up to me, I would say yes.',
    ['So who does need to approve it?',
      'Thank you. I will take that as a yes.',
      'It is up to you, though.'],
    'So who does need to approve it?',
    'The conditional signals that the speaker cannot decide. Taking it as a yes is the error the item is built around.'],
  ['vpet-f-24', 'C1', 'Let me stop you there.',
    ['Sorry. Go ahead.',
      'I have not started yet.',
      'Where would you like me to stop?'],
    'Sorry. Go ahead.',
    'An interruption. The right response yields the floor; the others treat it as a question about stopping.'],
  ['vpet-f-25', 'C1', 'I take your point, but the budget has not changed.',
    ['Then shall we look at what we drop?',
      'I am glad you agree.',
      'The budget changed last month.'],
    'Then shall we look at what we drop?',
    'A concession followed by a refusal, and the refusal is the operative half. Hearing only the concession is the trap.'],
  ['vpet-f-26', 'C1', 'You are welcome to try, of course.',
    ['You do not think it will work, do you?',
      'Thank you, I will try.',
      'You are welcome.'],
    'You do not think it will work, do you?',
    'Permission with obvious reservation. "Thank you, I will try" is not wrong socially but ignores what was actually communicated.'],
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
    'Two reasons are given; either alone is a correct short answer, which is the point of a short-phrase reply.'],

  /* C1. Four passages, three questions each. What changes from B2 is that the
     answer is no longer a fact sitting in one clause: it is a reason, a
     contrast, or something the passage implies without stating. The model
     answers stay short, because the guide tells candidates to answer with a
     short phrase and the rubric forbids marking them down for it. */

  /* ---- C1, passage 1: a measurement that changed ---- */
  ['vpet-g-25', 'C1', 'g-c1-1',
    'A hospital reported that its average wait had risen by nine minutes. In the same quarter '
    + 'it began counting from arrival rather than from triage. The clinical director said the '
    + 'underlying service had not changed and that the new figure was the more honest of the '
    + 'two. She did not publish the quarter on the old basis for comparison.',
    'Why did the average wait appear to rise?', 'The counting started earlier.',
    'The rise is an artefact of when the clock starts. Answering "the service got worse" contradicts the director without evidence.'],
  ['vpet-g-26', 'C1', 'g-c1-1',
    'A hospital reported that its average wait had risen by nine minutes. In the same quarter '
    + 'it began counting from arrival rather than from triage. The clinical director said the '
    + 'underlying service had not changed and that the new figure was the more honest of the '
    + 'two. She did not publish the quarter on the old basis for comparison.',
    'What did the director not do?', 'Publish the figure the old way.',
    'The last sentence is the answer, and it is the only negative statement in the passage.'],
  ['vpet-g-27', 'C1', 'g-c1-1',
    'A hospital reported that its average wait had risen by nine minutes. In the same quarter '
    + 'it began counting from arrival rather than from triage. The clinical director said the '
    + 'underlying service had not changed and that the new figure was the more honest of the '
    + 'two. She did not publish the quarter on the old basis for comparison.',
    'Which figure did she call more honest?', 'The new one.',
    'A pronoun reference across two sentences. "The two" refers back to the old and new bases, not to two hospitals.'],

  /* ---- C1, passage 2: a rule with an unintended effect ---- */
  ['vpet-g-28', 'C1', 'g-c1-2',
    'To reduce cancellations a clinic began charging for appointments missed without notice. '
    + 'Cancellations fell sharply. So did attendance: patients who could not pay simply stopped '
    + 'booking. The clinic kept the charge but added a hardship exemption, after which bookings '
    + 'recovered and cancellations stayed low.',
    'What happened to attendance at first?', 'It fell.',
    'The answer is carried by "so did", which points back to the previous sentence rather than forward.'],
  ['vpet-g-29', 'C1', 'g-c1-2',
    'To reduce cancellations a clinic began charging for appointments missed without notice. '
    + 'Cancellations fell sharply. So did attendance: patients who could not pay simply stopped '
    + 'booking. The clinic kept the charge but added a hardship exemption, after which bookings '
    + 'recovered and cancellations stayed low.',
    'Why did some patients stop booking?', 'They could not afford the charge.',
    'A reason stated after a colon. Answering "because of the rule" is true and too vague to show comprehension.'],
  ['vpet-g-30', 'C1', 'g-c1-2',
    'To reduce cancellations a clinic began charging for appointments missed without notice. '
    + 'Cancellations fell sharply. So did attendance: patients who could not pay simply stopped '
    + 'booking. The clinic kept the charge but added a hardship exemption, after which bookings '
    + 'recovered and cancellations stayed low.',
    'What did the clinic change in the end?', 'It added an exemption.',
    'The passage says the charge was kept, so answering "it removed the charge" reverses the outcome.'],

  /* ---- C1, passage 3: two explanations of one number ---- */
  ['vpet-g-31', 'C1', 'g-c1-3',
    'A publisher found that books with a certain designer\'s covers sold better. It concluded '
    + 'that the covers were working. An analyst pointed out that the designer was given the '
    + 'titles the company already expected to do well, and had been for years.',
    'What did the publisher conclude?', 'That the covers increased sales.',
    'The conclusion and the objection are both in the passage; the question asks for the first.'],
  ['vpet-g-32', 'C1', 'g-c1-3',
    'A publisher found that books with a certain designer\'s covers sold better. It concluded '
    + 'that the covers were working. An analyst pointed out that the designer was given the '
    + 'titles the company already expected to do well, and had been for years.',
    'Why does the analyst doubt it?', 'The best titles went to that designer.',
    'The objection is about which books the designer received, not about the covers themselves.'],
  ['vpet-g-33', 'C1', 'g-c1-3',
    'A publisher found that books with a certain designer\'s covers sold better. It concluded '
    + 'that the covers were working. An analyst pointed out that the designer was given the '
    + 'titles the company already expected to do well, and had been for years.',
    'Does the passage say who is right?', 'No.',
    'A yes-or-no question about the passage itself. Both explanations fit the same figure and neither is settled.'],

  /* ---- C1, passage 4: a decision left with somebody else ---- */
  ['vpet-g-34', 'C1', 'g-c1-4',
    'The review set out the running costs in full, noted that no comparable centre had lasted '
    + 'beyond ten years, and observed that no alternative funding had been sought. It then said '
    + 'the decision belonged to the trustees and made no recommendation of its own.',
    'What did the review recommend?', 'Nothing.',
    'The final clause is explicit. A candidate who answers "closure" has read the selection of facts as a recommendation, which is the inference the passage carefully avoids making.'],
  ['vpet-g-35', 'C1', 'g-c1-4',
    'The review set out the running costs in full, noted that no comparable centre had lasted '
    + 'beyond ten years, and observed that no alternative funding had been sought. It then said '
    + 'the decision belonged to the trustees and made no recommendation of its own.',
    'Who does the review say has to decide?', 'The trustees.',
    'Stated once, near the end, and easy to lose behind the three findings in front of it.'],
  ['vpet-g-36', 'C1', 'g-c1-4',
    'The review set out the running costs in full, noted that no comparable centre had lasted '
    + 'beyond ten years, and observed that no alternative funding had been sought. It then said '
    + 'the decision belonged to the trustees and made no recommendation of its own.',
    'Had anyone looked for other funding?', 'No.',
    'A negative fact inside a list of three. The word "observed" softens it, which is where it goes missing.'],
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
    'Fifteen words on a the-sooner-the-easier frame, the longest in the part and the clearest test of holding a whole structure.'],

  /* C1. Length alone stops discriminating past about thirteen words — a
     candidate either has the sentence or does not. What these add is STRUCTURE
     to hold: an embedded clause, a fronted adverbial, a negative that must not
     flip. Repeating the words in the wrong order scores on `content` and loses
     on `structure`, which is exactly the split server/repeat.js measures. */
  ['vpet-h-13', 'C1', 'Had we known about the delay we would have rearranged the whole schedule.',
    'The inverted conditional. Candidates who reach for "if" produce a fluent sentence that is not the one they heard.'],
  ['vpet-h-14', 'C1', 'What surprised everyone was how little the changes actually cost.',
    'A cleft sentence. The natural repair is "everyone was surprised", which keeps the meaning and loses the structure being tested.'],
  ['vpet-h-15', 'C1', 'Not one of the objections raised at the meeting had been anticipated.',
    'A negative subject and a reduced relative clause. Sixteen words with the main verb at the very end.'],
  ['vpet-h-16', 'C1', 'The report she referred to has not been circulated to the committee.',
    'A relative clause with the preposition stranded, then a passive. Candidates commonly insert "which" and change the sentence.'],
  ['vpet-h-17', 'C1', 'Only after the audit was published did anyone question the figures.',
    'A fronted adverbial forcing inversion. Repeating it as "anyone questioned" loses the structure entirely.'],
  ['vpet-h-18', 'C1', 'Rarely have I seen a proposal rejected quite so quickly.',
    'Another fronted negative with inversion, shorter, so memory is not the difficulty.'],
  ['vpet-h-19', 'C1', 'He denied having been told anything about the change of supplier.',
    'A perfect passive gerund after "denied". Four grammatical decisions inside six words.'],
  ['vpet-h-20', 'C1', 'The building will have been standing empty for two years by March.',
    'Future perfect continuous. Every auxiliary is unstressed and the tense collapses if one is dropped.'],
  ['vpet-h-21', 'C1', 'Whichever option we choose is going to disappoint somebody on the board.',
    'A subject clause opening with "whichever", which candidates flatten to "if we choose".'],
  ['vpet-h-22', 'C1', 'She insisted that the matter be raised at the next available opportunity.',
    'The mandative subjunctive: "be raised", not "is raised" or "was raised". One word carries it.'],
  ['vpet-h-23', 'C1', 'There appear to be rather more applications this year than last.',
    'Twelve words with almost no stressed content. "Appear to be" is the part that goes.'],
  ['vpet-h-24', 'C1', 'No sooner had the figures been checked than a further error appeared.',
    'A fronted negative with inversion AND a perfect passive inside it. Deliberately not the-sooner-the-easier frame, which vpet-h-12 already tests at B2.'],
  ['vpet-h-25', 'C1', 'Nobody seems to have noticed that the deadline passed last Friday.',
    'A negative subject and a perfect infinitive, then a clause. The perfect infinitive is what disappears.'],
  ['vpet-h-26', 'C1', 'Were the funding to be withdrawn the project would close within weeks.',
    'The inverted subjunctive conditional, the rarest of the three inversions in this set.'],
  ['vpet-h-27', 'C1', 'It was not until the third attempt that the connection finally worked.',
    'A cleft built on a negative time expression. Fifteen words and only one of them stressed early.'],
  ['vpet-h-28', 'C1', 'Much as I would like to help there is nothing further I can do.',
    '"Much as" as a concessive, which is easily heard and repeated as "as much as", changing the meaning.'],
  ['vpet-h-29', 'C1', 'The committee having reached no decision the matter was deferred again.',
    'An absolute construction with no conjunction at all. Candidates supply "because" and produce a different sentence.'],
  ['vpet-h-30', 'C1', 'They are said to have been aware of the risk from the beginning.',
    'A raised subject with a perfect passive infinitive. Fourteen words carrying four auxiliaries.'],
  ['vpet-h-31', 'C1', 'Little did we realise how much the whole exercise would eventually cost.',
    'Fronted "little" with inversion, then an embedded exclamative clause.'],
  ['vpet-h-32', 'C1', 'On no account should the figures be shared outside this room.',
    'A fronted negative prepositional phrase forcing inversion, and a passive modal inside it.'],
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
    'The resolution turns on a distinction between the lift and its position. A retelling that says the lift was broken has missed the entire point, even if every other detail is right.'],

  /* C1. Longer, and each one turns on something that is never stated: an irony,
     a motive, a reversal. Thirty seconds is not enough to recount every clause,
     so the retelling has to choose — and what a candidate chooses to keep is
     the measurement. A version with every fact and no point scores worse here
     than a shorter one that lands it. */
  ['vpet-j-05', 'C1',
    'A company brought in a rule that expenses over fifty dollars needed a manager\'s signature. '
    + 'Within two months the finance team noticed a cluster of claims at forty-nine. Nobody had '
    + 'broken the rule and nothing was refused. The rule was quietly raised to two hundred, and '
    + 'the average claim fell.',
    'The joke is in the last sentence and it is arithmetic, not behaviour: a lower threshold produced higher claims. A retelling that stops at "people claimed forty-nine dollars" has the observation and not the finding.'],
  ['vpet-j-06', 'C1',
    'A restaurant owner noticed that the tables by the window emptied faster than the rest. She '
    + 'assumed people wanted to look out and raised the price of those tables. Bookings for them '
    + 'held steady but the turnover slowed to match everywhere else. It turned out the window '
    + 'tables had simply been the ones closest to the door, and the people at them had been the '
    + 'ones in a hurry.',
    'The reversal is that the owner\'s explanation was wrong and her intervention proved it. Keeping the price rise without keeping why it backfired loses the story.'],
  ['vpet-j-07', 'C1',
    'A translator was asked to check a contract another agency had already translated. She found '
    + 'one error, in a clause about who paid for shipping, and charged for a full day. The client '
    + 'objected that a single word could not be worth a day. She sent back an itemised invoice: '
    + 'one minute for the correction, and the rest for knowing where to look.',
    'The point is the itemised invoice, which reframes what was being paid for. A retelling that reports the disagreement and omits the invoice has left out the ending.'],
  ['vpet-j-08', 'C1',
    'A council put a suggestion box in the library and received forty-one notes in a year, of '
    + 'which thirty-nine asked for longer opening hours. It extended the hours by six a week. '
    + 'The following year the box held nine notes. The librarian, asked whether interest had '
    + 'dropped, said the box had done its job and people write when something is wrong.',
    'The final line reinterprets the fall as success rather than apathy. Reporting the numbers without the librarian\'s reading gives the opposite impression.'],
  ['vpet-j-09', 'C1',
    'A new manager inherited a weekly report that took a junior analyst most of Friday to '
    + 'produce. He stopped sending it for a month to see who would ask. Two people did, and both '
    + 'wanted only one table from it. The report now runs to a single page and goes out on '
    + 'Thursday morning, and the analyst has Friday back.',
    'The method is the story: he tested demand by withdrawing supply. A retelling that says he shortened the report has kept the outcome and lost how he knew what to cut.'],
  ['vpet-j-10', 'C1',
    'A cyclist wrote to the city complaining that a new bike lane ended abruptly at the busiest '
    + 'junction. The reply explained that the final section had been refused by the landowner and '
    + 'that the city had built everything it was permitted to build. She wrote back asking who '
    + 'the landowner was. It was another department of the same city.',
    'Everything turns on the last five words, and the humour is structural rather than in any phrase. A retelling that keeps the complaint and the refusal but not the identity of the landowner has told a different, duller story.'],
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
