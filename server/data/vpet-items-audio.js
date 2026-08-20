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
 * only one can be the key. Parts H and J are `speaking` and carry no answer at
 * all: they are rubric-marked, and marking leaves them pending rather than
 * scoring them zero.
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
 * The distractors are all grammatical English. Each fails on fit, not on form.
 * ---------------------------------------------------------------- */
const PART_F = [
  ['vpet-f-01', 'B1', 'Would you like me to book a table for seven?',
    ['I have been there twice.', 'Yes, please, that would help.',
      'It is on the second floor.', 'About twenty minutes.'],
    'Yes, please, that would help.',
    'An offer wants an acceptance or a refusal. The other three answer questions that were not asked.'],
  ['vpet-f-02', 'B1', 'Sorry, I did not catch your name.',
    ['No, thank you.', 'At half past three.', 'It is Mai. M, A, I.', 'Yes, I did.'],
    'It is Mai. M, A, I.',
    '"I did not catch" is a request to repeat, not a statement about hearing. "Yes, I did" answers it as though it were a question.'],
  ['vpet-f-03', 'B1', 'How was the training session?',
    ['Longer than I expected.', 'On the third floor.', 'Yes, please.', 'By train.'],
    'Longer than I expected.',
    '"How was" asks for an impression. "By train" is the trap for anyone who hears only the word training.'],
  ['vpet-f-04', 'B1', 'Do you mind if I open the window?',
    ['Yes, I opened it.', 'Not at all, go ahead.', 'It is a window.', 'About an hour ago.'],
    'Not at all, go ahead.',
    'The polite yes to "do you mind" is a negative. Candidates who answer the surface question agree to the wrong thing.'],
  ['vpet-f-05', 'B1', 'I am afraid the printer is out of paper again.',
    ['The printer is new.', 'Since last Tuesday.',
      'I will fetch some from the store room.', 'Yes, it prints well.'],
    'I will fetch some from the store room.',
    '"I am afraid" signals a problem being reported, so the reply that fits is an offer to fix it.'],

  ['vpet-f-06', 'B2', 'I would rather we did not raise this at the meeting.',
    ['Yes, the meeting is at ten.', 'Understood. I will speak to her privately instead.',
      'I raised it last week.', 'The meeting room is booked.'],
    'Understood. I will speak to her privately instead.',
    '"I would rather we did not" is a request, phrased as a preference. The reply has to acknowledge it and adjust.'],
  ['vpet-f-07', 'B2', 'Had I known the deadline had moved, I would have said something.',
    ['Nobody was told, to be fair.', 'The deadline is Friday.',
      'Yes, I said something.', 'I know it well.'],
    'Nobody was told, to be fair.',
    'The inverted conditional carries a note of regret and mild self-defence. Only one reply answers that rather than the literal words.'],
  ['vpet-f-08', 'B2', 'You could not have picked a worse week to be away.',
    ['Yes, the week was good.', 'The weather was terrible.',
      'I am sorry. It was booked months ago.', 'I will be away on Tuesday.'],
    'I am sorry. It was booked months ago.',
    'A complaint dressed as an observation. The fitting reply apologises and explains; the others take it at face value.'],
  ['vpet-f-09', 'B2', 'Is there any chance you could look at this before you go?',
    ['I went yesterday.', 'Give me ten minutes and I will.',
      'It is a good chance.', 'No, I have not seen it.'],
    'Give me ten minutes and I will.',
    '"Is there any chance" is a softened request. The distractor "it is a good chance" tests whether chance was heard as a noun in isolation.'],
  ['vpet-f-10', 'B2', 'That is not quite what I had in mind.',
    ['Yes, I had it in mind.', 'It is mine.',
      'Tell me what you were expecting.', 'I will mind it.'],
    'Tell me what you were expecting.',
    '"Not quite" is a soft rejection asking for direction. The reply that fits invites the speaker to say more.']
];

/* ---------------------------------------------------------------- *
 * Part G - Passage Comprehension.  Hear a passage, answer one question.
 *   [key, level, say, question, options, answer, explanation]
 * The question is on screen; the passage is only heard.
 * ---------------------------------------------------------------- */
const PART_G = [
  ['vpet-g-01', 'B1',
    'The library will change its opening hours from the first of next month. It will open '
    + 'at eight in the morning instead of nine, and close at six in the evening instead of '
    + 'eight. Staff say the earlier start suits students who come in before class, and that '
    + 'very few people used the building after six.',
    'Why is the library changing its hours?',
    ['Because the building needs repairs',
      'Because few people came in the evening',
      'Because there are not enough staff',
      'Because students asked for a later closing time'],
    'Because few people came in the evening',
    'The reason is given in the last sentence, after two sentences of detail about times. Candidates who stop listening once they have the numbers miss it.'],
  ['vpet-g-02', 'B1',
    'A supermarket in the town centre has started giving away bread and vegetables that are '
    + 'close to their sell-by date. Anyone can collect them between five and six in the '
    + 'evening. The manager said the shop used to throw away about thirty bags of food a '
    + 'week, and now throws away almost none.',
    'What has changed at the supermarket?',
    ['It sells food more cheaply after five',
      'It has stopped selling bread and vegetables',
      'It gives away food that is nearly out of date',
      'It opens for an extra hour every evening'],
    'It gives away food that is nearly out of date',
    'Gives away rather than sells cheaply is the distinction. The five-to-six window is there to pull attention towards the wrong option.'],
  ['vpet-g-03', 'B1',
    'Our train to Danang leaves at ten past seven, not twenty past, so we should be at the '
    + 'station by half past six. I will bring the tickets. Could you bring something to eat? '
    + 'There is a buffet car, but it does not open until the train has been going an hour.',
    'What is the speaker asking the listener to do?',
    ['Buy the tickets', 'Bring some food',
      'Arrive at the station at seven', 'Book a seat in the buffet car'],
    'Bring some food',
    'Four numbers and a correction pass before the request arrives. Holding the request while the times go by is the skill being measured.'],
  ['vpet-g-04', 'B1',
    'The company will move to the new office in March. It is two stops further out on the '
    + 'metro, but the building has a canteen and a bicycle store, which the current one does '
    + 'not. Everyone will keep the same desk arrangement, so nobody needs to pack anything '
    + 'except personal belongings.',
    'What will be different in the new office?',
    ['People will sit in new teams', 'There will be somewhere to eat',
      'It will be closer to the metro', 'Everyone will pack their own desk'],
    'There will be somewhere to eat',
    'Three of the four options are contradicted by the passage. The trap is "closer to the metro", which reverses "two stops further out".'],

  ['vpet-g-05', 'B2',
    'The council put in twenty new cycle racks outside the market last spring, and by the '
    + 'autumn they were rarely more than half full. Rather than conclude that people do not '
    + 'cycle, the transport officer looked at where bicycles actually were being left, and '
    + 'found most of them chained to railings on the far side, nearer the entrance people '
    + 'actually use. The racks were not unwanted. They were in the wrong place.',
    'What did the transport officer conclude?',
    ['That the racks were badly located',
      'That fewer people cycle than expected',
      'That the racks should be removed',
      'That cyclists prefer to use railings'],
    'That the racks were badly located',
    'The passage sets up the obvious inference and then rejects it. The last two short sentences carry the conclusion, and both are easy to miss after a long opening.'],
  ['vpet-g-06', 'B2',
    'Two years ago the firm began letting staff choose their own hours, provided the work was '
    + 'covered. Productivity did not rise, which disappointed the managers who had argued for '
    + 'it, but the number of people leaving fell by nearly half. The finance director now '
    + 'points out that replacing someone costs more than any productivity gain would have '
    + 'been worth, so the policy has more than paid for itself.',
    'What is the finance director\'s point?',
    ['The policy saves money by keeping staff',
      'The policy has raised productivity',
      'The policy costs more than it saves',
      'Managers were right to expect a gain'],
    'The policy saves money by keeping staff',
    'The passage concedes a failure before making its point. A candidate listening for whether the policy worked hears "productivity did not rise" and stops.'],
  ['vpet-g-07', 'B2',
    'The exhibition was supposed to run for six weeks. It closed after three, not because '
    + 'nobody came, but because so many did that the floor of the upper gallery was judged '
    + 'unsafe. The organisers have promised to reopen in a larger building next year, and '
    + 'anyone holding a ticket for the cancelled weeks will be admitted free.',
    'Why did the exhibition close early?',
    ['Too few visitors came', 'The building could not take the crowds',
      'It was moved to a larger venue', 'Tickets had sold out'],
    'The building could not take the crowds',
    'The cause is given inside a "not because X, but because Y" frame, and X is the answer most candidates expect.'],
  ['vpet-g-08', 'B2',
    'When the bus route was extended to the hospital, journey times for existing passengers '
    + 'went up by about seven minutes. Complaints followed immediately. What the complaints '
    + 'did not mention, and what the survey a year later showed, was that a quarter of the '
    + 'people now on that bus had previously had no way of getting to an appointment without '
    + 'paying for a taxi.',
    'What does the speaker suggest about the complaints?',
    ['They were about the wrong thing',
      'They came from taxi drivers',
      'They led to the route being changed back',
      'They were mostly from hospital staff'],
    'They were about the wrong thing',
    'Nothing in the passage says this outright. It has to be inferred from the contrast between what the complaints mentioned and what the survey found.']
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
  const push = (key, part, skill, type, level, prompt, options, answer, explanation, say) =>
    out.push({
      key, part, skill, type, level, prompt,
      options: options || [],
      answer: answer || '',
      explanation,
      say,
      tags: ['vpet', 'part-' + part.toLowerCase(), 'audio'],
      source: SOURCE,
      licence: LICENCE
    });

  /* The instruction, not the sentence: printing the words next to a dictation
     question would answer it. Same for Part H. */
  for (const [key, level, say, explanation] of PART_E)
    push(key, 'E', 'listening', 'gap', level,
      'Listen, then type the sentence exactly as you hear it.', [], say, explanation, say);

  for (const [key, level, say, options, answer, explanation] of PART_F)
    push(key, 'F', 'listening', 'mcq', level,
      'Listen, then choose the best reply.', options, answer, explanation, say);

  for (const [key, level, say, question, options, answer, explanation] of PART_G)
    push(key, 'G', 'listening', 'mcq', level, question, options, answer, explanation, say);

  for (const [key, level, say, explanation] of PART_H)
    push(key, 'H', 'speaking', 'speaking', level,
      'Listen, then say the sentence back exactly.', [], '', explanation, say);

  for (const [key, level, say, explanation] of PART_J)
    push(key, 'J', 'speaking', 'speaking', level,
      'Listen to the story, then retell it in your own words.', [], '', explanation, say);

  return out;
}

module.exports = { rows, SOURCE, LICENCE };
