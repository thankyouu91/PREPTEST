/**
 * VPET audio scripts — one complete form per level.
 *
 * Every item that plays sound: parts E, F, G, H, J, plus the optional spoken
 * situation in part I. 37 scripts per level, 74 in total, matching the budget
 * worked out in docs/VOICE.md section 1.2.
 *
 * ---------------------------------------------------------------------------
 * Pause markup — see server/script-markup.js
 *
 *     ,  ;  :  "     short pause
 *     .  !  ?        long pause, end of sentence
 *     _              a gap of about 1.5 seconds
 *
 * Ordinary punctuation is written normally and the platform turns it into
 * timed pauses. `_` appears only where a real silence belongs — between a
 * scenario and the instruction that follows it, or between two halves of a
 * passage that a listener needs a moment to separate. It is not decoration.
 * ---------------------------------------------------------------------------
 *
 * Levels, from docs/VOICE.md section 1.7:
 *
 *   Level 1  measures B1 and below.  Everyday topics, high-frequency words,
 *            one idea per sentence, no idiom a learner would have to guess at.
 *   Level 2  measures B2 and above.  Work and study contexts, abstract ideas,
 *            longer sentences with subordination, and answers that turn on a
 *            qualifier rather than on a keyword.
 *
 * Item design rules applied throughout:
 *
 *   · Dictation sentences each target one thing that is hard to hear — a plural
 *     ending, a past-tense -ed, a number, a preposition — because that is what
 *     makes the error report in section 8.2 useful rather than generic.
 *   · Every multiple-choice distractor is what somebody who half-understood
 *     would pick. A distractor nobody chooses measures nothing.
 *   · Listening answers come from the audio and never from general knowledge.
 *   · Correct options are not the longest or the most detailed.
 *   · No names or places that are hard to say aloud, and no cultural reference
 *     a Vietnamese candidate would not have met.
 *
 * `answer` for part H mirrors the script: the marker scores it by word-level
 * alignment against exactly what was said (docs/VOICE.md section 6.1).
 */
'use strict';

/* ==========================================================================
 * LEVEL 1 — B1 and below
 * ======================================================================== */

const LEVEL_1 = [

  /* ---------------- Part E · Dictation ----------------
     One sentence each, played a fixed number of times. Twelve to sixteen
     words: long enough to need real listening, short enough to hold. */

  { ref: 'E1', part: 'E', type: 'gap',
    script: 'The train to Da Nang leaves at half past seven every morning.',
    answer: 'The train to Da Nang leaves at half past seven every morning',
    explanation: 'Time expression: "half past seven", not "seven thirty" or "half seven".' },

  { ref: 'E2', part: 'E', type: 'gap',
    script: 'She bought three tickets for the concert on Saturday evening.',
    answer: 'She bought three tickets for the concert on Saturday evening',
    explanation: 'Plural "tickets" and past tense "bought" are both easy to miss.' },

  { ref: 'E3', part: 'E', type: 'gap',
    script: 'My brother has worked at that hospital for almost ten years.',
    answer: 'My brother has worked at that hospital for almost ten years',
    explanation: 'Present perfect "has worked" — the -ed ending is unstressed and often dropped.' },

  { ref: 'E4', part: 'E', type: 'gap',
    script: 'Please remember to bring your passport and your student card.',
    answer: 'Please remember to bring your passport and your student card',
    explanation: 'Two objects joined by "and"; the second "your" is easy to lose.' },

  { ref: 'E5', part: 'E', type: 'gap',
    script: 'The weather was much colder than we expected last weekend.',
    answer: 'The weather was much colder than we expected last weekend',
    explanation: 'Comparative with "much colder than", plus past tense "expected".' },

  { ref: 'E6', part: 'E', type: 'gap',
    script: 'There are two supermarkets near the bus station in our town.',
    answer: 'There are two supermarkets near the bus station in our town',
    explanation: '"There are" with a plural noun, and the compound noun "bus station".' },

  { ref: 'E7', part: 'E', type: 'gap',
    script: 'He usually walks to school, but yesterday he took the bus.',
    answer: 'He usually walks to school but yesterday he took the bus',
    explanation: 'Present habit against past event: "walks" then "took".' },

  { ref: 'E8', part: 'E', type: 'gap',
    script: 'The library closes at six o’clock on weekdays and at noon on Sunday.',
    answer: 'The library closes at six o’clock on weekdays and at noon on Sunday',
    explanation: 'Third-person -s on "closes", and two different prepositions of time.' },

  /* ---------------- Part F · Response Selection ----------------
     The candidate hears one line and picks the natural reply. Distractors are
     answers to a question that was almost asked. */

  { ref: 'F1', part: 'F', type: 'mcq',
    script: 'Would you like something to drink?',
    prompt: 'Choose the most natural reply.',
    options: ['Just water, thanks.', 'Yes, I ate already.', 'It was very nice.', 'At about eight o’clock.'],
    answer: 'Just water, thanks.',
    explanation: '"Something to drink" is an offer, so the reply names a drink. The others answer questions about food, opinion and time.' },

  { ref: 'F2', part: 'F', type: 'mcq',
    script: 'How was your journey?',
    prompt: 'Choose the most natural reply.',
    options: ['Long, but comfortable.', 'By train, usually.', 'Next Tuesday morning.', 'Yes, I would like to.'],
    answer: 'Long, but comfortable.',
    explanation: '"How was" asks for an opinion about a past trip. "By train" answers "how do you travel", a different question.' },

  { ref: 'F3', part: 'F', type: 'mcq',
    script: 'I’m sorry I’m late.',
    prompt: 'Choose the most natural reply.',
    options: ['Don’t worry, we’ve just started.', 'Yes, you are.', 'I am late too, sorry.', 'Thank you very much.'],
    answer: 'Don’t worry, we’ve just started.',
    explanation: 'An apology is answered by reassurance. "Yes, you are" is grammatical but rude, which is exactly why it is here.' },

  { ref: 'F4', part: 'F', type: 'mcq',
    script: 'Could you pass me the salt, please?',
    prompt: 'Choose the most natural reply.',
    options: ['Here you are.', 'Yes, I could.', 'It is on the table.', 'No, thank you.'],
    answer: 'Here you are.',
    explanation: '"Could you" is a request, not a question about ability, so the reply is the action. "It is on the table" refuses to help while sounding helpful.' },

  { ref: 'F5', part: 'F', type: 'mcq',
    script: 'Do you mind if I open the window?',
    prompt: 'Choose the most natural reply.',
    options: ['Not at all, go ahead.', 'Yes, please open it.', 'I don’t like windows.', 'It is quite cold outside.'],
    answer: 'Not at all, go ahead.',
    explanation: '"Do you mind" is answered in the negative to give permission. "Yes, please open it" says yes and no at once — the classic trap.' },

  { ref: 'F6', part: 'F', type: 'mcq',
    script: 'What do you do?',
    prompt: 'Choose the most natural reply.',
    options: ['I work in a bank.', 'I am doing my homework.', 'I am very well, thank you.', 'Nothing much, and you?'],
    answer: 'I work in a bank.',
    explanation: 'The present simple asks about a job. "I am doing my homework" answers "what are you doing" — one word of difference.' },

  { ref: 'F7', part: 'F', type: 'mcq',
    script: 'Shall we meet at six?',
    prompt: 'Choose the most natural reply.',
    options: ['Six is fine for me.', 'We met at six.', 'Yes, it is six o’clock.', 'I will meet him there.'],
    answer: 'Six is fine for me.',
    explanation: '"Shall we" proposes a plan, so the reply accepts it. The others report a past meeting, tell the time, or talk about somebody else.' },

  { ref: 'F8', part: 'F', type: 'mcq',
    script: 'Thanks for all your help yesterday.',
    prompt: 'Choose the most natural reply.',
    options: ['Any time.', 'Yes, I helped you.', 'Thanks to you too.', 'I will help you tomorrow.'],
    answer: 'Any time.',
    explanation: 'Thanks is answered by playing the favour down. "Yes, I helped you" is true and still wrong as a reply.' },

  /* ---------------- Part G · Passage Comprehension ----------------
     A short spoken passage, one comprehension question on screen. The answer
     is always stated in the audio — never inferable from the topic alone. */

  { ref: 'G1', part: 'G', type: 'mcq',
    script:
      'Good afternoon, and welcome to the city library. ' +
      'Before you start, here are three things worth knowing. _ ' +
      'First, you can borrow up to six books at a time, and you may keep them for three weeks. ' +
      'Second, the study rooms on the second floor must be booked in advance, either at the front desk or on our website. ' +
      'And third, please turn your phone to silent once you pass the reading room doors. ' +
      'If you need help finding anything, the staff at the front desk are there all day.',
    prompt: 'How long can a book be kept?',
    options: ['Three weeks.', 'Six weeks.', 'Two weeks.', 'Until the end of the month.'],
    answer: 'Three weeks.',
    explanation: 'The passage gives two numbers close together — six books, three weeks. The distractor swaps them.' },

  { ref: 'G2', part: 'G', type: 'mcq',
    script:
      'This is an announcement for passengers travelling to Hue. ' +
      'The nine forty service has been delayed by approximately fifty minutes because of heavy rain further north. ' +
      'It will now depart from platform four, not platform two as printed on your ticket. _ ' +
      'Passengers who prefer not to wait may use their ticket on the coach service leaving from outside the main entrance at ten fifteen. ' +
      'We are sorry for the inconvenience.',
    prompt: 'What has changed apart from the time?',
    options: ['The platform.', 'The price of the ticket.', 'The destination.', 'The company running the train.'],
    answer: 'The platform.',
    explanation: 'The delay and the platform change are both stated. The coach is an alternative, not a change to the train.' },

  { ref: 'G3', part: 'G', type: 'mcq',
    script:
      'Our community garden started four years ago on a piece of land nobody was using. ' +
      'At first there were only five of us, and honestly, we grew almost nothing that first summer. ' +
      'Now there are more than forty families, and every Saturday morning somebody is out there planting or watering. _ ' +
      'What surprised me most was not the vegetables. ' +
      'It was that neighbours who had lived on the same street for years finally started talking to each other.',
    prompt: 'What does the speaker say surprised them most?',
    options: [
      'Neighbours got to know each other.',
      'The vegetables grew very well.',
      'Forty families joined in one year.',
      'The land was free to use.'
    ],
    answer: 'Neighbours got to know each other.',
    explanation: 'The speaker says explicitly that it was not the vegetables. The distractors are all true details from the passage, which is the point.' },

  { ref: 'G4', part: 'G', type: 'mcq',
    script:
      'Welcome to the museum. ' +
      'The tour takes about an hour and a quarter, and we will finish back here in the main hall. ' +
      'Photography is allowed everywhere except the room with the silk paintings, where the light would damage them. _ ' +
      'We will stop for ten minutes halfway through, and there is a cafe on the ground floor if you would like a drink then. ' +
      'Please stay together, and do ask questions as we go.',
    prompt: 'Where is photography not allowed?',
    options: ['In the room with the silk paintings.', 'In the main hall.', 'In the cafe.', 'Anywhere on the ground floor.'],
    answer: 'In the room with the silk paintings.',
    explanation: 'The exception is named directly. Each distractor is a place the passage mentions for another reason.' },

  { ref: 'G5', part: 'G', type: 'mcq',
    script:
      'A short notice for everyone in the building. ' +
      'We are holding a fire drill tomorrow at eleven o’clock. ' +
      'When you hear the alarm, please leave by the nearest staircase and go to the car park behind the building. _ ' +
      'Do not use the lifts, and do not stop to collect your things. ' +
      'Your team leader will check that everyone is out. ' +
      'The whole drill should take about fifteen minutes.',
    prompt: 'Where should people go when the alarm sounds?',
    options: ['The car park behind the building.', 'The nearest lift.', 'Their team leader’s office.', 'The staircase on the ground floor.'],
    answer: 'The car park behind the building.',
    explanation: 'The staircase is how you leave; the car park is where you go. Confusing route with destination is the intended error.' },

  { ref: 'G6', part: 'G', type: 'mcq',
    script:
      'The market on Tran Phu street has been open every Sunday for over thirty years. ' +
      'It used to sell mostly fruit and vegetables from the villages nearby. ' +
      'These days you will still find those, but there are also stalls selling second-hand books, old records and handmade jewellery. _ ' +
      'The traders say the busiest hours are early, between six and eight, when people come before the heat. ' +
      'By midday, most of the fresh produce has gone.',
    prompt: 'What is the market like now compared with the past?',
    options: [
      'It sells a wider range of goods.',
      'It opens on more days of the week.',
      'It has moved to a different street.',
      'It is busiest in the afternoon.'
    ],
    answer: 'It sells a wider range of goods.',
    explanation: '"You will still find those, but there are also…" is the comparison. The other options contradict details that are stated.' },

  /* ---------------- Part H · Repeat ----------------
     Said once, repeated back exactly. Length climbs from eight words to
     sixteen so the part discriminates across the whole level. */

  { ref: 'H1', part: 'H', type: 'speaking',
    script: 'The shop opens at nine in the morning.' },
  { ref: 'H2', part: 'H', type: 'speaking',
    script: 'I would like a table for two, please.' },
  { ref: 'H3', part: 'H', type: 'speaking',
    script: 'She has lived in this city since two thousand and ten.' },
  { ref: 'H4', part: 'H', type: 'speaking',
    script: 'Could you tell me where the nearest bank is?' },
  { ref: 'H5', part: 'H', type: 'speaking',
    script: 'We were planning to leave early, but the rain stopped us.' },
  { ref: 'H6', part: 'H', type: 'speaking',
    script: 'My sister works in a small school near the river.' },
  { ref: 'H7', part: 'H', type: 'speaking',
    script: 'If you finish your work early, you can go home.' },
  { ref: 'H8', part: 'H', type: 'speaking',
    script: 'The restaurant we visited last night was cheaper than I expected.' },
  { ref: 'H9', part: 'H', type: 'speaking',
    script: 'He asked me whether the meeting had been moved to Thursday afternoon.' },
  { ref: 'H10', part: 'H', type: 'speaking',
    script: 'Although it was raining heavily, they decided to walk to the station together.' },

  /* ---------------- Part I · Speaking Situations ----------------
     The situation is shown on screen and can also be played. The `_` splits
     the scenario from the instruction so the candidate hears the task
     separately from the setup. */

  { ref: 'I1', part: 'I', type: 'speaking',
    script:
      'You have just arrived at a hotel, and the key card for your room does not work. ' +
      'You go back down to the reception desk. _ ' +
      'Explain the problem, and ask the receptionist to help you.',
    prompt: 'You have just arrived at a hotel and your key card does not work. Go back to reception, explain the problem, and ask for help.' },

  { ref: 'I2', part: 'I', type: 'speaking',
    script:
      'A friend has invited you to a party on Saturday, but you already have other plans. ' +
      'You are calling to tell them. _ ' +
      'Thank your friend, say why you cannot come, and suggest meeting another day.',
    prompt: 'A friend has invited you to a party on Saturday but you are busy. Thank them, explain why you cannot come, and suggest another day.' },

  /* ---------------- Part J · Story Retellings ----------------
     Heard once, then retold. `keyPoints` is what the marker checks coverage
     against (docs/VOICE.md section 6.1) — write them as facts, not themes. */

  { ref: 'J1', part: 'J', type: 'speaking',
    script:
      'Last winter, Mai bought a second-hand bicycle so that she could get to work without taking the bus. ' +
      'It was cheap, and the man who sold it warned her that the brakes were not very good. _ ' +
      'On her third morning, going down the hill near the market, she found she could not stop. ' +
      'She steered onto the grass and fell off. Nothing was broken, but her knee hurt for a week. _ ' +
      'That afternoon she took the bicycle to a repair shop. The mechanic replaced both brakes for less than the price of a month of bus tickets. ' +
      'Mai still rides it every day, and she says the lesson was simple: when somebody warns you about something, deal with it before it becomes a problem.',
    keyPoints: [
      'Mai bought a second-hand bicycle to avoid taking the bus',
      'The seller warned her the brakes were not good',
      'She could not stop going down a hill and fell onto the grass',
      'She was not badly hurt, but her knee hurt for a week',
      'She had the brakes replaced cheaply the same afternoon',
      'Her lesson: act on a warning before it becomes a problem'
    ] },

  { ref: 'J2', part: 'J', type: 'speaking',
    script:
      'Tuan had worked at the same coffee shop for two years when the owner decided to sell it. ' +
      'The new owner wanted to change everything, starting with the menu. _ ' +
      'Most of the regular customers came for one drink, an iced coffee made the old way, and it was the first thing to be removed. ' +
      'Within a month, the shop was half empty in the mornings. ' +
      'Tuan said nothing at first, because he was new to speaking up. _ ' +
      'Then one Tuesday he showed the owner two years of his own notes on what people ordered. ' +
      'The old drink came back the following week, and by the end of the month the morning queue had returned. ' +
      'The owner later told him it was the most useful thing anyone in the shop had ever done.',
    keyPoints: [
      'Tuan had worked at the coffee shop for two years',
      'A new owner bought it and changed the menu',
      'The popular old-style iced coffee was removed',
      'The shop lost its morning customers within a month',
      'Tuan showed the owner his notes on what people ordered',
      'The drink returned and so did the customers'
    ] },

  { ref: 'J3', part: 'J', type: 'speaking',
    script:
      'When Lan was seventeen, she failed her driving test twice. ' +
      'The first time she was too nervous to start the engine properly. ' +
      'The second time she stopped at a green light. _ ' +
      'Her father, who had passed first time, offered to teach her himself, but she said no. ' +
      'Instead she saved for six months and paid for ten more lessons with the same instructor. ' +
      'He made her drive the test route until she was bored of it. _ ' +
      'She passed on the third attempt without a single mistake. ' +
      'Years later she said that failing twice had made her a better driver than passing first time would have, because she had learned the road rather than the test.',
    keyPoints: [
      'Lan failed her driving test twice at the age of seventeen',
      'She was too nervous the first time and stopped at a green light the second',
      'Her father offered to teach her but she refused',
      'She saved for six months to pay for ten more lessons',
      'The instructor made her drive the test route until it was boring',
      'She passed on the third attempt and believed failing made her a better driver'
    ] }
];

/* ==========================================================================
 * LEVEL 2 — B2 and above
 * ======================================================================== */

const LEVEL_2 = [

  /* ---------------- Part E · Dictation ---------------- */

  { ref: 'E1', part: 'E', type: 'gap',
    script: 'The committee postponed its decision until the results had been reviewed independently.',
    answer: 'The committee postponed its decision until the results had been reviewed independently',
    explanation: 'Past perfect passive "had been reviewed" plus the adverb ending — three unstressed syllables in a row.' },

  { ref: 'E2', part: 'E', type: 'gap',
    script: 'Several employees expressed concerns about the proposed changes to working hours.',
    answer: 'Several employees expressed concerns about the proposed changes to working hours',
    explanation: 'Three plurals and two -ed endings, none of them stressed.' },

  { ref: 'E3', part: 'E', type: 'gap',
    script: 'Had we known about the delay, we would have rearranged the entire schedule.',
    answer: 'Had we known about the delay we would have rearranged the entire schedule',
    explanation: 'Inverted third conditional. The missing "if" is what makes it hard.' },

  { ref: 'E4', part: 'E', type: 'gap',
    script: 'The report suggests that funding is unlikely to increase before next April.',
    answer: 'The report suggests that funding is unlikely to increase before next April',
    explanation: 'Hedged claim: "suggests" and "unlikely" both soften it, and both are easy to drop.' },

  { ref: 'E5', part: 'E', type: 'gap',
    script: 'Not only did the costs rise sharply, but the deadline was also brought forward.',
    answer: 'Not only did the costs rise sharply but the deadline was also brought forward',
    explanation: 'Inversion after "not only", and the phrasal verb "brought forward".' },

  { ref: 'E6', part: 'E', type: 'gap',
    script: 'Applicants whose documents arrive after the closing date will not be considered.',
    answer: 'Applicants whose documents arrive after the closing date will not be considered',
    explanation: 'Relative clause with "whose", and a passive main verb far from its subject.' },

  { ref: 'E7', part: 'E', type: 'gap',
    script: 'The findings were consistent with earlier studies conducted in similar conditions.',
    answer: 'The findings were consistent with earlier studies conducted in similar conditions',
    explanation: 'Reduced relative clause: "studies conducted in", not "studies which conducted".' },

  { ref: 'E8', part: 'E', type: 'gap',
    script: 'She argued that the policy, however well intended, had produced the opposite effect.',
    answer: 'She argued that the policy however well intended had produced the opposite effect',
    explanation: 'A concessive phrase dropped into the middle of the sentence, between subject and verb.' },

  /* ---------------- Part F · Response Selection ---------------- */

  { ref: 'F1', part: 'F', type: 'mcq',
    script: 'I was hoping we could bring the meeting forward to Monday.',
    prompt: 'Choose the most natural reply.',
    options: [
      'Monday is difficult, but I could do Tuesday morning.',
      'Yes, the meeting was on Monday.',
      'I hope so too.',
      'It has already been moved forward.'
    ],
    answer: 'Monday is difficult, but I could do Tuesday morning.',
    explanation: '"I was hoping" is a soft request, so the reply negotiates. "It has already been moved forward" answers a question about the past.' },

  { ref: 'F2', part: 'F', type: 'mcq',
    script: 'Would it be possible to have the figures by the end of the week?',
    prompt: 'Choose the most natural reply.',
    options: [
      'I should be able to, yes.',
      'It was possible last week.',
      'The figures are quite high.',
      'Yes, the week ends on Friday.'
    ],
    answer: 'I should be able to, yes.',
    explanation: 'A hedged request gets a hedged commitment. The others answer a question about the figures themselves.' },

  { ref: 'F3', part: 'F', type: 'mcq',
    script: 'To be honest, I’m not entirely convinced by the second option.',
    prompt: 'Choose the most natural reply.',
    options: [
      'What is it that concerns you?',
      'Neither am I convinced by you.',
      'Yes, it is the second option.',
      'You should be honest with me.'
    ],
    answer: 'What is it that concerns you?',
    explanation: 'Polite disagreement invites the objection to be explained. The distractors respond to the tone instead of the content.' },

  { ref: 'F4', part: 'F', type: 'mcq',
    script: 'I’m afraid we may have underestimated how long this will take.',
    prompt: 'Choose the most natural reply.',
    options: [
      'How far behind do you think we are?',
      'Don’t be afraid, we have time.',
      'Yes, it took a long time.',
      'We estimated it very carefully.'
    ],
    answer: 'How far behind do you think we are?',
    explanation: '"I’m afraid" signals bad news, not fear. Reading it literally is the trap.' },

  { ref: 'F5', part: 'F', type: 'mcq',
    script: 'You might want to check those numbers again before you send it.',
    prompt: 'Choose the most natural reply.',
    options: [
      'Good point, I’ll go through them once more.',
      'No, I don’t want to.',
      'Yes, I might want to.',
      'They were sent this morning.'
    ],
    answer: 'Good point, I’ll go through them once more.',
    explanation: '"You might want to" is advice softened almost to invisibility. Answering the modal literally misses it.' },

  { ref: 'F6', part: 'F', type: 'mcq',
    script: 'How did the presentation go in the end?',
    prompt: 'Choose the most natural reply.',
    options: [
      'Better than I expected, actually.',
      'It is going next week.',
      'By train, with the whole team.',
      'At the end of the presentation.'
    ],
    answer: 'Better than I expected, actually.',
    explanation: '"In the end" places it in the past. "It is going next week" reads the same verb as a future arrangement.' },

  { ref: 'F7', part: 'F', type: 'mcq',
    script: 'I wonder whether it might be worth getting a second opinion.',
    prompt: 'Choose the most natural reply.',
    options: [
      'It probably would, yes.',
      'I wonder about that too, sometimes.',
      'Second opinions are worth a lot.',
      'Yes, I gave my opinion already.'
    ],
    answer: 'It probably would, yes.',
    explanation: '"I wonder whether" is a proposal, not musing. The reply agrees with the proposal, not with the wondering.' },

  { ref: 'F8', part: 'F', type: 'mcq',
    script: 'That’s not quite what I meant, sorry.',
    prompt: 'Choose the most natural reply.',
    options: [
      'Go on, how would you put it?',
      'You do not need to apologise to me.',
      'Yes, that is exactly what you meant.',
      'I am sorry as well, then.'
    ],
    answer: 'Go on, how would you put it?',
    explanation: 'A gentle correction invites clarification. Taking the "sorry" as a real apology is the intended error.' },

  /* ---------------- Part G · Passage Comprehension ---------------- */

  { ref: 'G1', part: 'G', type: 'mcq',
    script:
      'Thank you all for coming. ' +
      'I want to be clear at the start that this review is not about individual performance. ' +
      'It is about whether the way we organise the work still makes sense after three years of growth. _ ' +
      'We will be speaking to everyone in the department over the next fortnight, and nothing will be decided until all of those conversations have taken place. ' +
      'I know reviews of this kind can be unsettling, so if you would rather raise something privately, my door is open, and so is Ms Ha’s.',
    prompt: 'What does the speaker emphasise about the review?',
    options: [
      'It is examining processes rather than people.',
      'It will be finished within a fortnight.',
      'It was requested by the department.',
      'Its conclusions have already been drafted.'
    ],
    answer: 'It is examining processes rather than people.',
    explanation: 'Stated in the first two sentences. The fortnight is when the conversations happen, not when the review concludes.' },

  { ref: 'G2', part: 'G', type: 'mcq',
    script:
      'The most common misunderstanding about the scheme is that it is a grant. ' +
      'It is not. It is a loan, and it has to be repaid, although the terms are unusually generous. _ ' +
      'Repayments do not begin until your income passes a threshold, and if it never does, the balance is written off after twenty-five years. ' +
      'That combination leads a lot of people to treat it as free money, which is fine right up until they apply for a mortgage and discover that the lender does not see it that way.',
    prompt: 'Why does the speaker mention applying for a mortgage?',
    options: [
      'To show a consequence people overlook.',
      'To explain how the threshold is calculated.',
      'To recommend repaying the loan early.',
      'To compare two kinds of lending.'
    ],
    answer: 'To show a consequence people overlook.',
    explanation: 'The mortgage is an illustration of the misunderstanding, not a new topic. The question tests why something is said, not what.' },

  { ref: 'G3', part: 'G', type: 'mcq',
    script:
      'When we opened the second branch, we assumed the difficult part would be finding customers. ' +
      'In fact, customers were the easy part. ' +
      'What we had badly underestimated was how much of the first shop’s success depended on two people who had been there since the beginning. _ ' +
      'They knew every regular by name, and they trained new staff without anyone ever asking them to. ' +
      'Once they were split between two sites, both branches got noticeably worse before either got better. ' +
      'If I were doing it again, I would move one of them across full time and accept the short-term cost.',
    prompt: 'What does the speaker say went wrong?',
    options: [
      'Key staff were spread too thinly across both branches.',
      'The second branch attracted too few customers.',
      'New staff were not trained before opening.',
      'The two branches were too far apart.'
    ],
    answer: 'Key staff were spread too thinly across both branches.',
    explanation: 'The passage rules out the customer problem explicitly, which is what makes that distractor tempting.' },

  { ref: 'G4', part: 'G', type: 'mcq',
    script:
      'There is a persistent belief that people learn better when material is presented in their preferred style, whether that is visual, verbal or something else. ' +
      'It is an appealing idea, and it has been tested many times. _ ' +
      'The tests generally find that people do have preferences, and that those preferences are stable. ' +
      'What they do not find is any advantage in matching teaching to them. ' +
      'Learners taught in their preferred style do not, on average, remember more. ' +
      'The preference is real. The benefit is what is missing.',
    prompt: 'What do the studies actually show?',
    options: [
      'Preferences exist but matching teaching to them does not help.',
      'Learning styles have no basis and preferences are imagined.',
      'Matching teaching to preference improves memory slightly.',
      'Visual learners perform better than verbal learners.'
    ],
    answer: 'Preferences exist but matching teaching to them does not help.',
    explanation: 'The distinction between the preference being real and the benefit being absent is the whole point of the passage.' },

  { ref: 'G5', part: 'G', type: 'mcq',
    script:
      'Our recycling rate rose from eighteen per cent to forty-one per cent in four years, and the council is understandably pleased. ' +
      'But the figure needs reading carefully. _ ' +
      'Almost all of that increase came from a single change: separate food waste collection. ' +
      'Plastics and textiles have barely moved. ' +
      'So the headline number is genuine, and it also conceals the fact that the harder problems have not been touched. ' +
      'The next twenty per cent will cost far more than the last twenty did.',
    prompt: 'What is the speaker’s main point about the figure?',
    options: [
      'It is accurate but hides where progress has not happened.',
      'It has been calculated using the wrong method.',
      'It shows that food waste is the largest category.',
      'It will continue to rise at the same rate.'
    ],
    answer: 'It is accurate but hides where progress has not happened.',
    explanation: '"Genuine, and it also conceals" is the sentence being tested. The speaker never disputes the number itself.' },

  { ref: 'G6', part: 'G', type: 'mcq',
    script:
      'Remote work was supposed to settle into one of two outcomes: everyone back in the office, or nobody. ' +
      'Four years on, neither has happened, and the pattern that emerged instead was not one anyone planned. _ ' +
      'Most organisations landed on two or three days in, chosen not by policy but by whichever days their teams happened to overlap. ' +
      'The result is that Tuesday and Wednesday are crowded, Friday is empty, and buildings are now sized for a peak they only reach twice a week. ' +
      'Whether that is efficient is a question nobody seems keen to ask out loud.',
    prompt: 'What does the speaker find notable about the outcome?',
    options: [
      'It emerged without being decided.',
      'It was the result of careful planning.',
      'It matches what most people predicted.',
      'It reduced the amount of office space needed.'
    ],
    answer: 'It emerged without being decided.',
    explanation: '"Chosen not by policy but by whichever days their teams happened to overlap" is the answer, restated in the final sentence.' },

  /* ---------------- Part H · Repeat ---------------- */

  { ref: 'H1', part: 'H', type: 'speaking',
    script: 'The proposal was rejected without much discussion.' },
  { ref: 'H2', part: 'H', type: 'speaking',
    script: 'She is responsible for coordinating the entire project.' },
  { ref: 'H3', part: 'H', type: 'speaking',
    script: 'We should have anticipated the delay in the first place.' },
  { ref: 'H4', part: 'H', type: 'speaking',
    script: 'The results were significant, although the sample was fairly small.' },
  { ref: 'H5', part: 'H', type: 'speaking',
    script: 'Not until the deadline had passed did anyone notice the error.' },
  { ref: 'H6', part: 'H', type: 'speaking',
    script: 'His argument rests on an assumption that nobody has actually tested.' },
  { ref: 'H7', part: 'H', type: 'speaking',
    script: 'Had the contract been reviewed earlier, the dispute could have been avoided.' },
  { ref: 'H8', part: 'H', type: 'speaking',
    script: 'The committee, which meets quarterly, has recommended a substantial revision.' },
  { ref: 'H9', part: 'H', type: 'speaking',
    script: 'What concerns me is not the cost but the precedent it would set.' },
  { ref: 'H10', part: 'H', type: 'speaking',
    script: 'Only after several attempts did they succeed in reproducing the original result.' },

  /* ---------------- Part I · Speaking Situations ---------------- */

  { ref: 'I1', part: 'I', type: 'speaking',
    script:
      'A colleague has sent round a proposal that you think has a serious weakness, ' +
      'but they have worked on it for weeks and the team seems broadly in favour. _ ' +
      'Explain your concern, acknowledge the work that has gone into it, and suggest how it might be tested before a decision is made.',
    prompt: 'A colleague’s proposal has a weakness you have spotted, but they have worked hard on it and the team likes it. Raise your concern, acknowledge their work, and suggest how to test it.' },

  { ref: 'I2', part: 'I', type: 'speaking',
    script:
      'You agreed to take on an extra piece of work, and it is now clear that you cannot finish it on time without the rest of your work suffering. _ ' +
      'Tell your manager, explain how the situation arose, and propose two realistic ways forward.',
    prompt: 'You cannot finish extra work you agreed to without your other work suffering. Tell your manager, explain how it happened, and propose two realistic options.' },

  /* ---------------- Part J · Story Retellings ---------------- */

  { ref: 'J1', part: 'J', type: 'speaking',
    script:
      'A hospital in the north of England spent two years trying to reduce the time patients waited in its emergency department. ' +
      'They added staff, they extended opening hours, and the waiting time barely moved. _ ' +
      'Then a junior nurse pointed out something nobody had measured: most of the delay was not in seeing a doctor at all. ' +
      'It was in waiting for a bed on a ward afterwards, and the wards could not free beds because discharge paperwork was only processed in the afternoon. ' +
      'The department was being blamed for a bottleneck two floors above it. _ ' +
      'Moving discharge processing to the morning cut the average wait by almost a third within six weeks, at no extra cost. ' +
      'The hospital’s director later said the uncomfortable lesson was that they had spent two years measuring the wrong thing very carefully.',
    keyPoints: [
      'A hospital spent two years trying to cut emergency waiting times',
      'Adding staff and extending hours made almost no difference',
      'A junior nurse identified that the delay was in waiting for a ward bed',
      'Wards could not free beds because discharge paperwork was done in the afternoon',
      'Moving discharge processing to the morning cut waits by about a third',
      'The lesson was that they had measured the wrong thing carefully for two years'
    ] },

  { ref: 'J2', part: 'J', type: 'speaking',
    script:
      'In the nineteen seventies, a Swedish company sold a self-assembly bookcase that became one of the most widely owned pieces of furniture in the world. ' +
      'Its designer had not set out to make anything iconic. _ ' +
      'He had been asked to solve a shipping problem: assembled bookcases were mostly air, and shipping air across Europe was expensive. ' +
      'Flat packing was the answer, and putting the assembly work onto the customer was simply what flat packing required. ' +
      'What nobody predicted was that customers would come to value the thing they had built more highly than an identical one delivered finished. _ ' +
      'Researchers later gave that effect a name, and it now shows up in everything from cookery kits to software. ' +
      'A decision made purely to cut freight costs turned out to have changed how people feel about what they own.',
    keyPoints: [
      'A Swedish company sold a self-assembly bookcase in the 1970s',
      'The designer was solving a shipping problem, not aiming for an icon',
      'Assembled furniture was mostly air and expensive to ship',
      'Flat packing moved the assembly work to the customer',
      'Customers valued furniture they had built more than identical finished furniture',
      'A cost decision ended up changing how people feel about what they own'
    ] },

  { ref: 'J3', part: 'J', type: 'speaking',
    script:
      'For nearly forty years, a small town in Norway sat in shadow for half of each year, because the mountains around it blocked the winter sun entirely. ' +
      'People walked or took a cable car to a ledge above the town to see daylight. _ ' +
      'In two thousand and thirteen, the town installed three large mirrors on the mountainside, angled by computer to follow the sun and reflect it down onto the market square. ' +
      'The lit area is small, roughly the size of the square itself, and it moves through the day. ' +
      'Critics said the money would have been better spent on almost anything else. _ ' +
      'What the critics had not counted on was what people did with it. ' +
      'The square, which had been empty in winter for a century, became the place the town gathered, and the cafes around it now stay open through the season. ' +
      'The mirrors did not change the amount of sunlight. They changed where people chose to stand.',
    keyPoints: [
      'A Norwegian town had no direct winter sun for about half the year because of the mountains',
      'People climbed or took a cable car to a ledge to see daylight',
      'In 2013 the town installed three computer-controlled mirrors on the mountainside',
      'The mirrors reflect sunlight onto the market square, lighting a small moving area',
      'Critics thought the money was badly spent',
      'The square became the town’s winter gathering place and cafes stayed open'
    ] }
];

/* ==========================================================================
 * Defaults filled in per part, so the items above carry only what varies.
 * ======================================================================== */

const PART_DEFAULTS = {
  E: { skill: 'listening', prompt: 'Type the sentence you hear.' },
  F: { skill: 'listening' },
  G: { skill: 'listening' },
  H: { skill: 'speaking', prompt: 'Repeat the sentence exactly as you hear it.' },
  I: { skill: 'speaking' },
  J: { skill: 'speaking', prompt: 'You will hear a short story once. Retell it in your own words.' }
};

/** Level 1 tops out at B1; level 2 starts at B2 (docs/VOICE.md section 1.7). */
const CEFR_FOR_LEVEL = { 1: 'B1', 2: 'B2' };

/**
 * Every item, flattened and filled in, ready for the importer.
 *
 * Part H items get their answer from the script itself: the marker aligns the
 * candidate's words against exactly what was said, so duplicating the sentence
 * by hand would only create a chance for the two to drift apart.
 */
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
        script: item.script,
        prompt: item.prompt || d.prompt || '',
        options: item.options || [],
        answer: item.answer != null ? item.answer : (item.part === 'H' ? item.script : ''),
        explanation: item.explanation || '',
        keyPoints: item.keyPoints || []
      });
    }
  }
  return out;
}

module.exports = { LEVEL_1, LEVEL_2, PART_DEFAULTS, CEFR_FOR_LEVEL, allItems };
