/**
 * VPET form 1 — B1. Fifty-five items, parts A to J.
 *
 * Themes are kept clear of the original bank so a candidate who has practised
 * on it does not meet the same passage twice. See ../vpet-forms.js for the
 * shape of an item and docs/BLUEPRINT.md for what each part must contain.
 */
'use strict';

module.exports = {
  id: 'f1',
  name: 'VPET practice form 1',
  /* The paper sits at a VPET level; its items carry a CEFR band. Level 1
     covers A1 – B1+, and these items are written at B1 inside it. */
  level: 'L1',
  itemCefr: 'B1',
  parts: {

    /* ---- A · Sentence Completion (10) ------------------------------ */
    A: [
      { prompt: 'She has been working here ___ 2019, and she still enjoys it.', answer: 'since',
        explanation: 'since + a point in time; "for" would need a length of time ("for six years"). The date after the gap decides it.' },
      { prompt: 'I am looking forward ___ meeting your family next month.', answer: 'to',
        explanation: 'look forward to + -ing. The "to" here is a preposition, not part of an infinitive, which is why "meeting" and not "meet".' },
      { prompt: 'If it ___ tomorrow, we will move the party indoors.', answer: 'rains',
        explanation: 'First conditional: present simple in the if-clause, will in the main clause. "will rain" after "if" is the error this looks for.' },
      { prompt: 'The film was so boring ___ half the audience left early.', answer: 'that',
        explanation: 'so + adjective + that + clause. "such" takes a noun ("such a boring film that"), so the adjective already rules it out.' },
      { prompt: 'He is much taller ___ his older brother.', answer: 'than',
        explanation: 'Comparative + than. "then" is the common misspelling and means something else entirely.' },
      { prompt: 'I have lived in this town ___ about ten years.', answer: 'for',
        explanation: 'for + a length of time. The pair to item 1: "since" would need a starting point, not a duration.' },
      { prompt: 'Would you mind ___ the window? It is rather cold in here.', answer: 'closing',
        explanation: 'Would you mind + -ing. "to close" is the error; the polite request frame takes a gerund.' },
      { prompt: 'She is used ___ getting up early because of her job.', answer: 'to',
        explanation: 'be used to + -ing = accustomed to. Distinct from "used to get up", which is a past habit.' },
      { prompt: 'Neither the manager ___ the staff knew about the change.', answer: 'nor',
        explanation: 'neither … nor. "or" is the trap, and the "neither" before the gap fixes which half of the pair is needed.' },
      { prompt: 'The report needs to be finished ___ Friday at the latest.', answer: 'by',
        explanation: 'by + a deadline = not later than. "until" would mean the finishing continues up to Friday, which is not what a deadline says.' }
    ],

    /* ---- B · Passage Reconstruction (3) ---------------------------- */
    B: [
      { passage: 'The village shop closed in March after forty years of trading, and the nearest '
          + 'other shop was four miles away. A group of neighbours reopened it in June, staffed '
          + 'entirely by volunteers and open shorter hours. It now sells less than it used to, '
          + 'but it opens on Sundays, which the old owner never did.',
        explanation: 'The turn is the last clause: it sells less yet opens more. A reconstruction that reports only the reopening has lost the trade-off.',
        keyPoints: [
          'The village shop closed in March after forty years of trading',
          'The nearest other shop was four miles away',
          'A group of neighbours reopened it in June',
          'It is staffed entirely by volunteers and opens shorter hours',
          'It now sells less than it used to',
          'It opens on Sundays, which the old owner never did'
        ] },
      { passage: 'A hospital asked patients to bring their own written list of medicines to every '
          + 'appointment. Doctors expected the lists to be full of mistakes and had argued against '
          + 'the idea. In fact most of them were accurate, and the appointments that used one '
          + 'finished about four minutes earlier than the rest.',
        explanation: 'The expectation and the result point opposite ways. Losing "doctors expected them to be wrong" removes the reason the finding matters.',
        keyPoints: [
          'A hospital asked patients to bring a written list of their own medicines',
          'The lists were to be brought to every appointment',
          'Doctors expected the lists to be full of mistakes',
          'The doctors had argued against the idea',
          'Most of the lists turned out to be accurate',
          'Appointments using a list finished about four minutes earlier'
        ] },
      { passage: 'A city put benches along a steep street so that older residents could rest on '
          + 'the way up. Use of the street rose by a fifth. The council had planned the benches '
          + 'for eight stops but installed only five, and the gap in the middle is where people '
          + 'still turn back.',
        explanation: 'The sting is in the last sentence: the scheme worked and was under-built. A version that stops at "rose by a fifth" reports half of it.',
        keyPoints: [
          'A city installed benches along a steep street',
          'They were meant to let older residents rest on the way up',
          'Use of the street rose by a fifth',
          'The council had planned eight stops',
          'Only five benches were actually installed',
          'People still turn back at the gap in the middle'
        ] }
    ],

    /* ---- C · Reading Comprehension (3) ----------------------------- */
    C: [
      { passage: 'A bakery started selling yesterday\'s bread at half price after four o\'clock. '
          + 'Waste fell sharply. The owner then noticed that morning sales had dropped too, '
          + 'because regular customers had begun coming in the afternoon instead.',
        question: 'What unintended effect did the discount have?',
        options: [
          'Regular customers moved to the afternoon',
          'The bakery threw away more bread than before',
          'Morning customers stopped coming altogether',
          'The bakery had to raise its full prices'
        ],
        answer: 'Regular customers moved to the afternoon',
        explanation: 'The passage says morning sales dropped "because regular customers had begun coming in the afternoon" — a shift, not a loss. The distractors take that shift to a total loss, reverse the waste finding, or add a price change the passage never mentions.' },
      { passage: 'A language school moved its beginner classes from Saturday morning to Tuesday '
          + 'evening. Attendance improved, but the students who did come made slower progress, '
          + 'which the teachers put down to tiredness rather than to the shorter lesson.',
        question: 'What explanation did the teachers give for the slower progress?',
        options: [
          'The students were tired',
          'The lessons had been made shorter',
          'Fewer students were attending',
          'Tuesday classes had less experienced teachers'
        ],
        answer: 'The students were tired',
        explanation: 'The last clause attributes it to tiredness "rather than to the shorter lesson", so the passage names one cause and explicitly sets aside another. Two distractors are the rejected cause and a reversal of the attendance finding.' },
      { passage: 'A museum made entry free on Wednesdays. Visitor numbers on that day tripled, '
          + 'and shop takings per visitor fell by half. Overall the museum earned slightly more '
          + 'on Wednesdays than before, though the director said one term was too short to judge.',
        question: 'What does the passage say about the museum\'s Wednesday earnings?',
        options: [
          'They rose slightly, but the director was cautious about the figure',
          'They fell, because each visitor spent less',
          'They stayed exactly the same as before',
          'They tripled, in line with visitor numbers'
        ],
        answer: 'They rose slightly, but the director was cautious about the figure',
        explanation: 'Both halves are in the passage: "earned slightly more" and "too short to judge". Each distractor keeps one figure from the passage — the halved spending, the tripled visitors — and lets it stand for the total.' }
    ],

    /* ---- D · E-Mail Writing (2) ------------------------------------ */
    D: [
      { scenario: 'You joined a gym three weeks ago. The changing room showers have been out of '
          + 'order the whole time, and nobody has told the members when they will be fixed.',
        task: 'Write an email of about 120 words to the gym manager. Say when you joined and '
          + 'what the problem is, explain why it matters to you, and ask for a date. Keep the '
          + 'tone polite but firm.',
        explanation: 'Task, tone and accuracy. Asking for a date is what separates this from a complaint; an email that only expresses annoyance has not done the task.',
        keyPoints: [
          'Says when the writer joined and that the showers have been broken throughout',
          'Explains why it matters — showering after exercise is part of what was paid for',
          'Asks for a specific date when the showers will work again',
          'Polite but firm: a reasonable member, not an angry one'
        ] },
      { scenario: 'A colleague you get on with has offered to give you a lift to work every day. '
          + 'It would save you money, but they drive faster than you are comfortable with.',
        task: 'Write an email of about 120 words. Thank them, explain your hesitation honestly, '
          + 'and suggest something that would work. Keep the tone warm and informal.',
        explanation: 'The difficulty is raising the driving without insulting the driver. An email that accepts and says nothing, or that refuses with no reason, both miss.',
        keyPoints: [
          'Thanks the colleague for the offer',
          'Explains the hesitation honestly — the speed of the driving',
          'Suggests a workable alternative, such as sharing two days a week or driving in turn',
          'Warm and informal throughout, so the working relationship is not damaged'
        ] }
    ],

    /* ---- E · Dictation (8) ----------------------------------------- */
    E: [
      { script: 'The train to the airport leaves from platform four.' },
      { script: 'She forgot her umbrella and got wet on the way home.' },
      { script: 'Please turn off your phone before the lesson begins.' },
      { script: 'We have booked a table for seven o\'clock on Friday.' },
      { script: 'The library is closed for repairs until the end of May.' },
      { script: 'He asked me to call him back after the meeting.' },
      { script: 'There is a small cafe on the corner near the station.' },
      { script: 'My sister works in a hospital about ten miles away.' }
    ],

    /* ---- F · Response Selection (8) -------------------------------- */
    F: [
      { script: 'Do you know what time the shop closes?',
        options: ['I think about six.', 'Yes, it is quite near.', 'No, I did not buy it.', 'It was very expensive.'],
        answer: 'I think about six.',
        explanation: 'The question asks for a time. The distractors answer distance, a purchase and a price — each plausible in a shop conversation, none an answer to when.' },
      { script: 'Would you like me to help you with that?',
        options: ['That is very kind, thank you.', 'It is on the second floor.', 'I bought it last week.', 'About twenty minutes.'],
        answer: 'That is very kind, thank you.',
        explanation: 'An offer takes acceptance or refusal. The distractors answer where, when bought and how long.' },
      { script: 'I am afraid I will be a little late.',
        options: ['Do not worry, we will wait.', 'Yes, it is a nice colour.', 'She lives near the park.', 'It costs about ten pounds.'],
        answer: 'Do not worry, we will wait.',
        explanation: 'An apology for lateness invites reassurance. The others reply to a comment on colour, a question about a person and a price.' },
      { script: 'How was your holiday in the mountains?',
        options: ['Lovely, though it rained twice.', 'At about half past eight.', 'Yes, please, with milk.', 'On the shelf behind you.'],
        answer: 'Lovely, though it rained twice.',
        explanation: 'A "how was" question wants an evaluation. The distractors give a time, accept a drink and give a location.' },
      { script: 'Could you tell me where the nearest bank is?',
        options: ['It is just past the traffic lights.', 'I have already eaten, thanks.', 'She started work on Monday.', 'It was rather cold last night.'],
        answer: 'It is just past the traffic lights.',
        explanation: 'The question asks where. Each distractor is a natural sentence answering something else entirely.' },
      { script: 'Shall we take the bus or walk?',
        options: ['Let us walk, it is a nice evening.', 'No, I have not seen it.', 'It arrived this morning.', 'About four pounds each.'],
        answer: 'Let us walk, it is a nice evening.',
        explanation: 'A choice between two options needs one of them chosen. The distractors answer a yes-no question, a when and a how much.' },
      { script: 'I am sorry, but I think you have my seat.',
        options: ['Oh, I do apologise, let me move.', 'Yes, it is quite comfortable.', 'The next one leaves at nine.', 'I have been here before.'],
        answer: 'Oh, I do apologise, let me move.',
        explanation: 'A polite challenge calls for an apology and an action. The nearest distractor comments on the seat instead of giving it up.' },
      { script: 'Do you mind if I open the window?',
        options: ['Not at all, go ahead.', 'Yes, I closed it earlier.', 'It is made of glass.', 'She opened it yesterday.'],
        answer: 'Not at all, go ahead.',
        explanation: '"Do you mind" is answered by giving permission, and "not at all" is the idiomatic yes. "Yes, I closed it earlier" is the trap: it sounds cooperative but literally refuses.' }
    ],

    /* ---- G · Passage Comprehension (6) ----------------------------- */
    G: [
      { script: 'Good morning, everyone, and welcome. Before we start the tour, there are two '
          + 'things worth knowing. The house itself has no heating at all, so you may want to '
          + 'keep your coats on while we are inside, even though it is warm out here in the '
          + 'sun. _ And photography is allowed everywhere except the library on the first floor, '
          + 'where the light would damage the older books. The garden is open until five o\'clock, '
          + 'and the tea room stops serving at half past four, so please do not leave it too late.',
        question: 'Where are visitors not allowed to take photographs?',
        options: ['In the library', 'In the garden', 'In the tea room', 'Anywhere inside the house'],
        answer: 'In the library',
        explanation: 'The exception is named directly. The distractors are the three other places the passage mentions, each with its own detail attached, so a candidate who heard the places but not the rule can land on any of them.' },
      { script: 'This is an announcement for passengers waiting for the ten fifteen service '
          + 'to the coast. That train is running about twenty minutes late because of a fault '
          + 'at an earlier station. _ Passengers holding tickets for the ten fifteen may travel '
          + 'instead on the ten forty, which is direct and will arrive first, but which does not '
          + 'stop at the two smaller stations on the way. We are sorry for the delay.',
        question: 'Why might a passenger choose to wait for the later train rather than the direct one?',
        options: [
          'The direct train misses two smaller stations',
          'The direct train is more expensive',
          'The direct train arrives later',
          'The direct train requires a new ticket'
        ],
        answer: 'The direct train misses two smaller stations',
        explanation: 'The passage says the ten forty is direct, arrives first, and skips two stations — so the only reason to refuse it is the stops. Two distractors contradict what was said, and the third adds a cost the passage rules out with "may travel instead".' },
      { script: 'A quick note about the new recycling collection. From next month, food waste '
          + 'goes in the small brown bin rather than the green one, and it will be collected '
          + 'every week instead of every fortnight. _ The green bin is now for garden waste only, '
          + 'and that changes to once a month over the winter. Bins put out with the wrong '
          + 'contents will be left, and a note will explain why.',
        question: 'What happens to a bin containing the wrong sort of waste?',
        options: [
          'It is left behind with a note explaining why',
          'It is emptied but the household is charged',
          'It is collected the following week instead',
          'It is emptied into the brown bin by the crew'
        ],
        answer: 'It is left behind with a note explaining why',
        explanation: 'The last sentence states both halves. Each distractor invents a consequence that sounds administratively plausible but appears nowhere in the passage.' },
      { script: 'Thank you all for coming to the meeting about the new footpath. The plan is to '
          + 'build it along the river rather than beside the road, which is longer but much safer '
          + 'for children. _ The cost is the same either way. What has not been decided is the '
          + 'surface: gravel is cheaper and drains better, while a solid surface would let '
          + 'wheelchairs use the path all year. We would like your views on that before the end '
          + 'of the month.',
        question: 'What question is the meeting asking people to give their views on?',
        options: [
          'Which surface the path should have',
          'Whether the path should follow the river or the road',
          'How much the path should cost',
          'Whether children should use the path'
        ],
        answer: 'Which surface the path should have',
        explanation: 'The route is settled and the cost is equal; only the surface is open. The distractors are exactly the decisions the passage says have already been made.' },
      { script: 'Here is the plan for Saturday. We meet at the main gate at nine, and the coach '
          + 'leaves at ten past, so please do not be late. _ Bring a packed lunch, because the '
          + 'cafe at the castle is very small and there will not be time to queue. Waterproofs '
          + 'are more useful than umbrellas, since the walk along the wall is exposed and windy. '
          + 'We should be back by six.',
        question: 'Why does the speaker suggest waterproofs rather than umbrellas?',
        options: [
          'The walk is exposed and windy',
          'Umbrellas are not allowed at the castle',
          'The walk is longer than people expect',
          'There is nowhere to leave an umbrella'
        ],
        answer: 'The walk is exposed and windy',
        explanation: 'The reason is given in the same sentence. The distractors are rules and inconveniences of a kind the passage discusses elsewhere, but never about umbrellas.' },
      { script: 'Some news about the swimming pool, and I am afraid the first part is not good. '
          + 'The main pool will close for three weeks in August so that the roof can be repaired, '
          + 'because it has been leaking steadily since the spring. _ The small pool stays open '
          + 'throughout, and lessons for children will move across to it, though the classes will '
          + 'have to be smaller as a result and some families will be offered a different time. '
          + 'Membership will not be charged for those three weeks.',
        question: 'What is the consequence of moving the lessons to the small pool?',
        options: [
          'Classes will be smaller and some families moved to another time',
          'Lessons will be cancelled for three weeks',
          'Families will have to pay an extra charge',
          'Children will be taught at a different pool in another town'
        ],
        answer: 'Classes will be smaller and some families moved to another time',
        explanation: 'The passage names both effects in one clause. Two distractors contradict it directly — lessons continue, and membership is not charged — and the third invents a second site.' }
    ],

    /* ---- H · Repeat (10) ------------------------------------------- */
    H: [
      { script: 'The meeting has been moved to Thursday afternoon.' },
      { script: 'I would rather walk than wait for the bus.' },
      { script: 'She sent the letter before she left the office.' },
      { script: 'There were far more people than we expected.' },
      { script: 'He has never been abroad on his own before.' },
      { script: 'The keys are in the drawer beside the sink.' },
      { script: 'We should leave now if we want to arrive early.' },
      { script: 'They have painted the front door a darker green.' },
      { script: 'I did not realise the shop was closed on Mondays.' },
      { script: 'The children were tired after the long journey.' }
    ],

    /* ---- I · Speaking Situations (2) ------------------------------- */
    I: [
      { scenario: 'A neighbour you know slightly has offered you some vegetables from their '
          + 'garden. You do not want them, because you will be away all week and they would '
          + 'go bad.',
        task: 'Speak for up to one minute. Turn the offer down, explain why, and keep the door '
          + 'open for another time.',
        explanation: 'The whole difficulty is refusing generosity without seeming ungrateful. A flat no and an insincere acceptance both miss.',
        keyPoints: [
          'Turns the offer down clearly rather than leaving it vague',
          'Gives the real reason — a week away and the vegetables would spoil',
          'Thanks the neighbour so the refusal does not read as rejection',
          'Leaves the door open for another time',
          'Friendly but slightly formal, as with a neighbour known only a little'
        ] },
      { scenario: 'You are in a shop and the assistant has given you too much change. They look '
          + 'busy and have already turned to the next customer.',
        task: 'Speak for up to one minute. Interrupt politely, explain what has happened, and '
          + 'return the money.',
        explanation: 'Two things are marked together: interrupting without rudeness, and being clear enough that the assistant understands quickly.',
        keyPoints: [
          'Interrupts politely, acknowledging that the assistant is busy',
          'Explains clearly that too much change was given',
          'Returns the money',
          'Keeps it brief and easy to follow, since there is a queue',
          'Friendly and low-key, not making an occasion of the honesty'
        ] }
    ],

    /* ---- J · Story Retellings (3) ---------------------------------- */
    J: [
      { script: 'Last autumn, Helen agreed to look after her neighbour\'s cat for a fortnight. '
          + 'She had never kept a pet and thought it would be simple: food twice a day and fresh '
          + 'water. _ On the third evening the cat did not appear. Helen searched the house, then '
          + 'the garden, then the whole street, calling until it was dark. She hardly slept. In '
          + 'the morning she found the cat asleep in the airing cupboard, which she had opened '
          + 'the day before and forgotten to close. _ When the neighbour came back, Helen '
          + 'admitted what had happened. The neighbour laughed and said the cat had done exactly '
          + 'the same thing to her twice. Helen still looks after the cat, but now she counts the '
          + 'doors before she goes to bed.',
        explanation: 'The lesson is in the last line and is an action, not a sentiment. A retelling that stops at "she found the cat" has dropped the point.',
        keyPoints: [
          'Helen agreed to look after her neighbour\'s cat for a fortnight',
          'She had never kept a pet and expected it to be simple',
          'On the third evening the cat disappeared and she searched everywhere',
          'She found it asleep in the airing cupboard she had left open',
          'The neighbour laughed and said the cat had done the same to her',
          'Helen now counts the doors before going to bed'
        ] },
      { script: 'Daniel started running in January because his doctor suggested it. He bought '
          + 'expensive shoes, a watch that measured everything, and a book of training plans. '
          + '_ For three weeks he followed the plan exactly and hated every minute. Then he hurt '
          + 'his knee and had to stop. While he was resting he began walking to work instead, '
          + 'about forty minutes each way, mostly because he was bored. _ By the summer his knee '
          + 'had recovered, but he did not go back to running. He had lost the weight the doctor '
          + 'was worried about, and he had done it without the watch, the book or the shoes. He '
          + 'says the useful part was the thing he started by accident.',
        explanation: 'The point is the reversal: the equipment failed and the accident worked. Retellings that keep only "he got fit" lose it.',
        keyPoints: [
          'Daniel started running in January because his doctor suggested it',
          'He bought expensive shoes, a watch and a book of training plans',
          'He followed the plan for three weeks and hated it',
          'He hurt his knee and had to stop running',
          'While resting he walked to work, about forty minutes each way',
          'He lost the weight by walking, and says the accidental habit was the useful one'
        ] },
      { script: 'Grace inherited a piano from her aunt. It was too big for her flat and badly out '
          + 'of tune, and moving it had cost more than the piano was worth. _ She advertised it '
          + 'free to anyone who would collect it. Eleven people replied within a day. She chose a '
          + 'young teacher who said she wanted it for a school that had none. _ Two months later '
          + 'Grace was invited to a concert at that school. Thirty children played, badly and '
          + 'very loudly, on her aunt\'s piano. Grace had not thought about the instrument since '
          + 'the day it left. She said afterwards that giving it away had turned out to be the '
          + 'only thing she had ever done with it that her aunt would have liked.',
        explanation: 'The last sentence is the whole story, and it depends on the aunt being mentioned at the start. A retelling that drops the inheritance cannot land it.',
        keyPoints: [
          'Grace inherited a piano from her aunt',
          'It was too big for her flat, out of tune, and had cost a lot to move',
          'She advertised it free to anyone who would collect it',
          'Eleven people replied and she chose a teacher who wanted it for a school',
          'Two months later she went to a concert where thirty children played it',
          'She felt that giving it away was the thing her aunt would have liked'
        ] }
    ]
  }
};
