/**
 * VPET form 2 — B1. Fifty-five items, parts A to J.
 *
 * Distinct in subject from form 1 as well as from the original bank: two forms
 * at the same level that both turn on a village shop are two forms a candidate
 * can prepare for once.
 */
'use strict';

module.exports = {
  id: 'f2',
  name: 'VPET practice form 2',
  level: 'B1',
  parts: {

    /* ---- A · Sentence Completion (10) ------------------------------ */
    A: [
      { prompt: 'The concert was cancelled ___ of the storm.', answer: 'because',
        explanation: 'because of + noun. "due" is possible after a noun ("the cancellation was due to"), but not before "of" in this position.' },
      { prompt: 'I wish I ___ how to drive when I was younger.', answer: 'knew',
        explanation: 'wish + past tense for a regret about the present or a general one. "know" and "have known" are the two errors this item watches for.' },
      { prompt: 'She apologised ___ arriving so late to the meeting.', answer: 'for',
        explanation: 'apologise for + -ing. "apologise to" takes the person, and both can appear together ("apologised to me for").' },
      { prompt: 'This is the man ___ car was stolen last night.', answer: 'whose',
        explanation: 'whose marks possession in a relative clause. "who\'s" is the same sound and means "who is".' },
      { prompt: 'They have been married ___ over thirty years.', answer: 'for',
        explanation: 'for + a length of time with the present perfect continuous. "since" would need the year they married.' },
      { prompt: 'It was such ___ good film that we watched it twice.', answer: 'a',
        explanation: 'such + a + adjective + singular noun. The frame is "so good a film" or "such a good film", and the word order here fixes which.' },
      { prompt: 'Hardly ___ I sat down when the telephone rang.', answer: 'had',
        explanation: 'Hardly at the front forces the inversion, and the past perfect pairs with "when". "did" would need a bare infinitive after it.' },
      { prompt: 'You had better ___ a coat, it is freezing outside.', answer: 'take',
        explanation: 'had better + bare infinitive. "to take" is the error; despite the "had", nothing here is a perfect tense.' },
      { prompt: 'The house was built ___ my grandfather in 1955.', answer: 'by',
        explanation: 'Passive + by + the agent. "from" would introduce material ("built from stone"), which is the near-miss.' },
      { prompt: 'I would rather you ___ not tell anyone about this.', answer: 'did',
        explanation: 'would rather + subject + past tense for what you want somebody else to do. "do" and "would" are the two wrong forms.' }
    ],

    /* ---- B · Passage Reconstruction (3) ---------------------------- */
    B: [
      { passage: 'A company replaced its yearly staff survey with a single question sent every '
          + 'Friday afternoon. Response rates rose from a quarter of staff to nearly all of them. '
          + 'The answers were shorter and less detailed, and managers say they now know what is '
          + 'happening but not why.',
        explanation: 'The gain and the loss are in the same finding. A reconstruction that reports the higher response rate alone has kept the good half only.',
        keyPoints: [
          'A company replaced its yearly staff survey with a single weekly question',
          'The question was sent every Friday afternoon',
          'Response rates rose from a quarter of staff to nearly all of them',
          'The answers were shorter and less detailed than before',
          'Managers now know what is happening',
          'They do not know why it is happening'
        ] },
      { passage: 'A seaside town banned cars from its promenade on summer weekends. Shopkeepers '
          + 'objected loudly for months before it began, predicting empty tills and a ruined '
          + 'season. Takings in fact rose in the cafes, and fell only in the two shops that sold '
          + 'heavy goods, which nobody on either side had thought about.',
        explanation: 'The last clause is the point: the prediction was wrong overall but right somewhere specific. Reporting only "takings rose" flattens it.',
        keyPoints: [
          'A seaside town banned cars from its promenade on summer weekends',
          'Shopkeepers objected loudly for months before the ban began',
          'They predicted empty tills and a ruined season',
          'Takings rose in the cafes',
          'Takings fell in the two shops selling heavy goods',
          'Nobody on either side had thought about those shops'
        ] },
      { passage: 'A school stopped setting homework for its youngest pupils for one term as an '
          + 'experiment. Reading scores did not change. What did change was the number of parents '
          + 'coming to evening meetings, which doubled, and the teachers think the two are '
          + 'connected in a way nobody has yet measured.',
        explanation: 'The measured result is the null one, and the interesting result is unexplained. A version that claims homework caused the meetings has overstated the passage.',
        keyPoints: [
          'A school stopped setting homework for its youngest pupils',
          'The change lasted one term and was an experiment',
          'Reading scores did not change',
          'The number of parents at evening meetings doubled',
          'Teachers think the two changes are connected',
          'The connection has not been measured'
        ] }
    ],

    /* ---- C · Reading Comprehension (3) ----------------------------- */
    C: [
      { passage: 'A car park began charging by the minute rather than by the hour. Drivers stayed '
          + 'for shorter periods, and the number of different cars using it each day rose. Total '
          + 'income was almost unchanged, which the owner had expected.',
        question: 'What happened to the car park\'s income?',
        options: [
          'It stayed about the same, as the owner had predicted',
          'It rose, because more cars used the car park',
          'It fell, because drivers stayed for less time',
          'It rose sharply and surprised the owner'
        ],
        answer: 'It stayed about the same, as the owner had predicted',
        explanation: '"Almost unchanged, which the owner had expected" carries both halves. Two distractors take one of the two real changes — shorter stays, more cars — and make it the outcome; the fourth reverses the expectation.' },
      { passage: 'A charity asked its regular donors to switch from monthly gifts to a single '
          + 'yearly one. Most refused. Those who agreed gave slightly more in total, but a third '
          + 'of them did not renew the following year, so the charity ended up worse off.',
        question: 'Why did the change leave the charity worse off?',
        options: [
          'A third of those who switched did not give again the next year',
          'Those who switched gave less money in total',
          'Most donors stopped giving entirely',
          'The charity spent too much on asking'
        ],
        answer: 'A third of those who switched did not give again the next year',
        explanation: 'The passage says the switchers gave slightly more but a third did not renew — so the loss is in year two. The distractors contradict the "slightly more", overstate "most refused" into "stopped giving", and add a cost the passage never mentions.' },
      { passage: 'A town replaced the timetable at its bus stops with a screen showing how many '
          + 'minutes until the next bus. Passenger numbers did not rise, but complaints about '
          + 'the service fell by half. The buses were running exactly as often as before.',
        question: 'What does the passage suggest the screens changed?',
        options: [
          'How passengers felt about a service that had not changed',
          'How often the buses actually ran',
          'How many people used the buses',
          'How long passengers had to wait for a bus'
        ],
        answer: 'How passengers felt about a service that had not changed',
        explanation: 'Complaints halved while frequency and passenger numbers held — so what moved was perception. Each distractor names one of the things the passage explicitly says did not change.' }
    ],

    /* ---- D · E-Mail Writing (2) ------------------------------------ */
    D: [
      { scenario: 'You booked a hotel room for two nights next month and paid in advance. Your '
          + 'plans have changed and you now need only one night. The booking page said changes '
          + 'were possible but did not say how.',
        task: 'Write an email of about 120 words to the hotel. Give your booking details, say '
          + 'what you need changed, and ask what happens to the money for the second night. '
          + 'Keep the tone polite and businesslike.',
        explanation: 'Three things must be there: the identifying details, the change, and the money question. An email that asks nothing about the refund has left the difficult part out.',
        keyPoints: [
          'Gives the booking details — dates and name — so the hotel can find it',
          'States the change clearly: two nights becomes one',
          'Asks what happens to the money already paid for the second night',
          'Polite and businesslike, neither apologetic nor demanding'
        ] },
      { scenario: 'Your friend has lent you a book and asked for it back this week. You have '
          + 'looked everywhere and cannot find it. You think you may have left it on a train.',
        task: 'Write an email of about 120 words. Tell them what has happened, apologise properly, '
          + 'and say what you intend to do about it. Keep the tone warm and honest.',
        explanation: 'The mark turns on doing something rather than only feeling bad. An email that apologises at length and offers nothing has not finished the task.',
        keyPoints: [
          'Says plainly that the book is lost and where it probably went',
          'Apologises properly rather than making light of it',
          'Offers a concrete remedy — replacing the book, or buying another copy',
          'Warm and honest in tone, as between friends, with no excuses'
        ] }
    ],

    /* ---- E · Dictation (8) ----------------------------------------- */
    E: [
      { script: 'The post office opens at nine and closes at five.' },
      { script: 'I left my jacket on the back of the chair.' },
      { script: 'They are building a new bridge across the river.' },
      { script: 'The doctor said I should rest for a few days.' },
      { script: 'We walked home because the last bus had gone.' },
      { script: 'She speaks three languages and is learning a fourth.' },
      { script: 'The parcel should arrive some time on Wednesday morning.' },
      { script: 'Please write your name clearly at the top of the form.' }
    ],

    /* ---- F · Response Selection (8) -------------------------------- */
    F: [
      { script: 'What do you usually do at the weekend?',
        options: ['I see friends, mostly.', 'It is about three miles.', 'Yes, I did enjoy it.', 'On the top shelf.'],
        answer: 'I see friends, mostly.',
        explanation: 'A habitual question wants a habit. The distractors give a distance, answer a yes-no question in the past, and give a location.' },
      { script: 'I have not seen you for ages. How have you been?',
        options: ['Very well, thanks. And you?', 'It is just around the corner.', 'No, I have not read it.', 'Twice a week, usually.'],
        answer: 'Very well, thanks. And you?',
        explanation: 'A greeting after a long gap takes a state and a return question. The nearest distractor gives a frequency, which answers "how often" not "how".' },
      { script: 'Sorry, I did not catch your name.',
        options: ['It is Laura, with an L.', 'Yes, I have been there.', 'It is on the table.', 'About half an hour ago.'],
        answer: 'It is Laura, with an L.',
        explanation: 'The speaker is asking for the name again. "It is on the table" answers where something is — the same "it is" opening, a different question.' },
      { script: 'Do you think it will rain this afternoon?',
        options: ['It looks like it, yes.', 'I went there last year.', 'She is a teacher.', 'They cost about five pounds.'],
        answer: 'It looks like it, yes.',
        explanation: 'A prediction question takes an opinion about the future. Every distractor is anchored in the past or in an unrelated fact.' },
      { script: 'Excuse me, is this seat free?',
        options: ['Yes, please, do sit down.', 'It is quite a long journey.', 'I bought it at the station.', 'About twenty past four.'],
        answer: 'Yes, please, do sit down.',
        explanation: 'A request for permission takes permission. The other three are all natural on a train, which is what makes them work as distractors.' },
      { script: 'Have you managed to finish the report yet?',
        options: ['Almost, I need another hour.', 'It is on the second floor.', 'Yes, she left at six.', 'No, it is not very heavy.'],
        answer: 'Almost, I need another hour.',
        explanation: 'A "yet" question is about progress. The distractors answer where, about a different person, and about weight.' },
      { script: 'That is a lovely coat. Where did you get it?',
        options: ['A little shop near the market.', 'Yes, it is rather warm.', 'I have had it for ages.', 'It was raining hard.'],
        answer: 'A little shop near the market.',
        explanation: 'The question is where. "I have had it for ages" is the strongest distractor because it answers a question the speaker did not ask — how long.' },
      { script: 'Would Thursday suit you for the appointment?',
        options: ['Thursday is fine, thank you.', 'It took about an hour.', 'Yes, I saw him on Monday.', 'The waiting room is upstairs.'],
        answer: 'Thursday is fine, thank you.',
        explanation: 'A proposed day is accepted or refused. The distractors give a duration, a past sighting and a location.' }
    ],

    /* ---- G · Passage Comprehension (6) ----------------------------- */
    G: [
      { script: 'Thank you for calling the surgery. Please listen carefully, as our opening '
          + 'hours have changed this month. We are now open from eight in the morning until '
          + 'six in the evening on weekdays, and on Saturday mornings until midday. _ If you '
          + 'need an appointment today, please call before ten, because same-day appointments '
          + 'are given out in the first two hours only. For a repeat prescription, please use '
          + 'the website rather than calling, as it is much quicker.',
        question: 'What does the message ask callers to do about repeat prescriptions?',
        options: [
          'Use the website instead of telephoning',
          'Call before ten in the morning',
          'Come in on a Saturday morning',
          'Wait until the following weekday'
        ],
        answer: 'Use the website instead of telephoning',
        explanation: 'The instruction is explicit in the last sentence. The distractors are the other three time-related facts in the message, each attached to a different purpose.' },
      { script: 'Welcome aboard. This is the eleven forty service, calling at all stations to '
          + 'the city centre. The buffet car is in the middle of the train, in coach D, and it '
          + 'is open for the whole journey today. _ Please note that the front two coaches will '
          + 'be locked before we reach the last station, so if you are travelling all the way, '
          + 'move back through the train when you hear the announcement. Tickets and railcards, '
          + 'please, when the inspector comes round.',
        question: 'What must passengers going to the last station do?',
        options: [
          'Move back through the train when the announcement is made',
          'Move to the front two coaches before arriving',
          'Show their ticket at the buffet car',
          'Change trains at the city centre'
        ],
        answer: 'Move back through the train when the announcement is made',
        explanation: 'The passage says the front two coaches are locked, so the required movement is backwards. The strongest distractor reverses the direction, which is exactly the error a candidate makes if they catch "front two coaches" and nothing else.' },
      { script: 'A short notice about the car park behind the library. From the first of next '
          + 'month it will be closed to the public for six weeks while the surface is relaid. '
          + '_ Library users may park free of charge at the leisure centre during that time, '
          + 'but you will need to collect a permit from the desk inside the library first, and '
          + 'the permit only covers three hours. Blue badge spaces at the front of the library '
          + 'are not affected and stay open throughout.',
        question: 'What must a library user do before parking at the leisure centre?',
        options: [
          'Collect a permit from the library desk',
          'Pay a small charge at the leisure centre',
          'Book a space in advance by telephone',
          'Show a blue badge at the entrance'
        ],
        answer: 'Collect a permit from the library desk',
        explanation: 'The condition is stated directly. The distractors contradict "free of charge", invent a booking system, and misapply the blue badge sentence, which is about a different set of spaces.' },
      { script: 'Right, everyone, a few words about tomorrow before you go. The photographer '
          + 'arrives at half past eight, and the whole group photograph is taken first, so please '
          + 'be outside by twenty five past at the latest. _ After that, the individual pictures '
          + 'run through the morning in register order, which means the later your name comes in '
          + 'the alphabet, the longer you wait. Bring something to read. Lessons carry on as '
          + 'normal for anyone not being photographed.',
        question: 'What decides how long a pupil will have to wait?',
        options: [
          'Where their name comes in the register order',
          'Which lesson they are timetabled for',
          'How early they arrive in the morning',
          'Whether they are in the group photograph'
        ],
        answer: 'Where their name comes in the register order',
        explanation: 'The passage explains the order explicitly. Each distractor is another organising fact in the announcement — arrival time, lessons, the group photograph — none of which governs the waiting.' },
      { script: 'This is a message for members of the walking group. Sunday\'s walk is going '
          + 'ahead, but we have changed the route because the path along the top of the hill is '
          + 'flooded in two places. _ We will now follow the lower track through the woods, which '
          + 'is about the same distance but a good deal muddier, so please wear proper boots '
          + 'rather than trainers. We still meet at the church at half past nine, as usual.',
        question: 'Why has the route been changed?',
        options: [
          'The higher path is flooded in two places',
          'The lower track is shorter',
          'The group asked for an easier walk',
          'The church car park is closed'
        ],
        answer: 'The higher path is flooded in two places',
        explanation: 'The reason is given at the start. The distractors contradict "about the same distance", invent a request, and misuse the meeting place, which the message says is unchanged.' },
      { script: 'Good evening. Before the film starts, a reminder about our new membership '
          + 'scheme. Members pay four pounds a month and get any weekday ticket for half price, '
          + 'which means the scheme pays for itself if you come twice. _ Weekend tickets are not '
          + 'included, and neither are the special screenings on the last Sunday of each month. '
          + 'You can join at the desk on your way out, and the first month can be cancelled if '
          + 'you change your mind.',
        question: 'When does the membership scheme start to save a member money?',
        options: [
          'Once they come twice in a month',
          'Once they come to a weekend screening',
          'After the first month has ended',
          'Once they have attended a special screening'
        ],
        answer: 'Once they come twice in a month',
        explanation: 'The passage does the arithmetic out loud: "pays for itself if you come twice". The distractors point at the two kinds of screening the scheme excludes and at the cancellation clause.' }
    ],

    /* ---- H · Repeat (10) ------------------------------------------- */
    H: [
      { script: 'The shop on the corner has closed for good.' },
      { script: 'I have been trying to reach you all morning.' },
      { script: 'She would have come if we had asked her.' },
      { script: 'The new timetable starts at the end of the month.' },
      { script: 'He left his umbrella in the waiting room again.' },
      { script: 'We need to decide before the office closes today.' },
      { script: 'There is a good chance it will snow tonight.' },
      { script: 'The garden looks much better since they cut the hedge.' },
      { script: 'I had no idea the journey would take so long.' },
      { script: 'Most of the seats had already been taken.' }
    ],

    /* ---- I · Speaking Situations (2) ------------------------------- */
    I: [
      { scenario: 'You are staying with a host family while you study. They cook a large dinner '
          + 'every evening and you cannot eat that much, but you do not want to seem ungrateful '
          + 'or to make extra work for them.',
        task: 'Speak for up to one minute. Raise the subject, explain the problem, and suggest '
          + 'something that would suit you both.',
        explanation: 'The register is the difficulty: a guest raising a complaint about hospitality. Bluntness and vagueness both lose marks here.',
        keyPoints: [
          'Raises the subject rather than continuing to leave food',
          'Explains that the portions are too large, not that the food is disliked',
          'Praises the cooking so the point is not heard as a criticism',
          'Suggests a workable arrangement, such as serving less or helping themselves',
          'Warm and grateful in tone — a guest in someone\'s home, not a customer'
        ] },
      { scenario: 'A shop assistant has spent ten minutes helping you choose a jacket. You have '
          + 'decided not to buy anything today, and they are clearly expecting a sale.',
        task: 'Speak for up to one minute. Say you are not buying today, thank them for their '
          + 'time, and leave without being pressed into it.',
        explanation: 'The mark turns on holding the decision while staying courteous. An answer that gives in, or that leaves abruptly, misses in opposite directions.',
        keyPoints: [
          'Says clearly that no purchase will be made today',
          'Thanks the assistant for the time they spent',
          'Gives a reason without inventing an elaborate excuse',
          'Holds the decision politely if pressed',
          'Courteous and easy in tone, so the assistant is not embarrassed'
        ] }
    ],

    /* ---- J · Story Retellings (3) ---------------------------------- */
    J: [
      { script: 'James bought a flat with a small balcony that faced north and got almost no sun. '
          + 'The neighbour above him had the same balcony and grew tomatoes on it every summer. '
          + '_ James decided the neighbour must know something he did not, so one evening he '
          + 'asked. The neighbour explained that the tomatoes never actually ripened. He carried '
          + 'them upstairs in September and finished them on the kitchen windowsill, which faced '
          + 'the other way. _ James planted his own the next spring and did the same. His mother '
          + 'asked why he did not simply keep the plants at the window from the start. He said '
          + 'the balcony was where they grew and the window was where they finished, and that '
          + 'you needed both.',
        explanation: 'The point is that the answer was a two-stage method, not a trick. A retelling that says "he grew tomatoes on the balcony" has lost the whole story.',
        keyPoints: [
          'James bought a flat with a north-facing balcony that got almost no sun',
          'The neighbour above grew tomatoes on an identical balcony',
          'James asked the neighbour how it was done',
          'The tomatoes never ripened on the balcony',
          'The neighbour finished them on a kitchen windowsill facing the other way',
          'James did the same, and says you need both places'
        ] },
      { script: 'Laura took a job in a town where she knew nobody. For the first two months she '
          + 'went straight home after work and spoke to almost no one outside the office. _ Then '
          + 'her washing machine broke. The repair man could not come for a week, so she started '
          + 'using the launderette at the end of her road, sitting there for an hour twice a '
          + 'week with nothing to do. By the third visit she knew the woman who ran it, and by '
          + 'the fifth she had been invited to a birthday party. _ The machine was mended in the '
          + 'end. Laura kept going to the launderette anyway, and she tells people that the best '
          + 'thing that happened to her that year was something breaking.',
        explanation: 'The last line is the story and it is a reversal. Retellings that stop at "she made friends" have kept the outcome and dropped the cause.',
        keyPoints: [
          'Laura took a job in a town where she knew nobody',
          'For two months she went straight home and spoke to almost no one',
          'Her washing machine broke and could not be repaired for a week',
          'She began using the launderette twice a week',
          'She got to know the woman who ran it and was invited to a party',
          'She kept going after the machine was mended, and says the breakdown was the best thing that happened'
        ] },
      { script: 'Peter had kept the same diary for thirty years, one line a day, never more. His '
          + 'daughter thought it was a waste and told him he should write properly about his '
          + 'life while he still remembered it. _ He tried. He managed four pages about his '
          + 'childhood and then stopped, because he found he could not tell which parts he '
          + 'remembered and which parts he had simply been told. The single lines had no such '
          + 'problem: each one had been written on the day it happened. _ He went back to one '
          + 'line a day. When his daughter asked why, he read her the entry for the day she was '
          + 'born. It was nine words long and she cried. He said that was the argument, and she '
          + 'never raised it again.',
        explanation: 'The proof is the nine-word entry, and it only works because the daughter had called the diary a waste. A retelling that omits her objection loses the ending.',
        keyPoints: [
          'Peter had kept a one-line-a-day diary for thirty years',
          'His daughter thought it was a waste and told him to write properly',
          'He tried and managed only four pages about his childhood',
          'He stopped because he could not tell memory from what he had been told',
          'The single lines were written on the day, so they had no such problem',
          'He read her the nine-word entry for the day she was born and she never raised it again'
        ] }
    ]
  }
};
