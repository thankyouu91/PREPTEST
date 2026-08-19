/**
 * VPET form 5 — B2. Fifty-five items, parts A to J.
 *
 * The second B2 form, and with form 4 it takes every part past twice the
 * blueprint count at this level. Kept clear of form 4 in subject as well as in
 * structure: two B2 forms that both turn on a committee correcting a figure
 * would be one form written twice.
 */
'use strict';

module.exports = {
  id: 'f5',
  name: 'VPET practice form 5',
  level: 'B2',
  parts: {

    /* ---- A · Sentence Completion (10) ------------------------------ */
    A: [
      { prompt: 'Not until the following morning ___ we learn what had happened.', answer: 'did',
        explanation: 'Not until + adverbial at the front inverts the auxiliary, and "learn" then stays in its base form. The tense sits in "did", not in the verb.' },
      { prompt: 'She would sooner resign ___ accept those conditions.', answer: 'than',
        explanation: 'would sooner … than, with bare infinitives on both sides. "rather than" would need "would rather" before it.' },
      { prompt: 'The scheme is, to all ___ and purposes, already finished.', answer: 'intents',
        explanation: 'to all intents and purposes = effectively. A fixed phrase, so nothing else fits, and the second half is already supplied.' },
      { prompt: 'Much ___ I admire her work, I cannot support this decision.', answer: 'as',
        explanation: 'Much as + clause = although very much. "though" is possible in "Much though I admire", but the concessive frame with "as" is the commoner one and both need the fronted "much".' },
      { prompt: 'His resignation came as no ___ to anyone in the department.', answer: 'surprise',
        explanation: 'come as no surprise. The article "no" fixes a noun, which rules out "surprising", and "shock" would take "as no shock" less idiomatically here.' },
      { prompt: 'They went ahead with the plan ___ the objections raised.', answer: 'despite',
        explanation: 'despite + noun phrase. "although" would need a clause with a verb, and the noun after the gap decides it.' },
      { prompt: 'Rarely ___ a proposal attracted so much comment so quickly.', answer: 'has',
        explanation: 'Rarely at the front inverts with the auxiliary, and the present perfect pairs with "so quickly". "did" would need "attract" in the base form.' },
      { prompt: 'The decision rests ___ whether the funding is renewed.', answer: 'on',
        explanation: 'rest on = depend on. "in" and "with" both follow "rest" in other senses ("rest with the committee"), which is what makes the particle the question.' },
      { prompt: 'She is not so much unwilling ___ unable to help.', answer: 'as',
        explanation: 'not so much X as Y, correcting one description with a better one. "but" and "than" are the two errors this frame attracts.' },
      { prompt: 'Given the circumstances, we had no ___ but to postpone it.', answer: 'choice',
        explanation: 'have no choice but to + infinitive. "option" takes "no option but to" as well, but "choice" is the commoner collocation and "alternative" would need "to" rather than "but".' }
    ],

    /* ---- B · Passage Reconstruction (3) ---------------------------- */
    B: [
      { passage: 'A national museum began lending items to small local museums for a year at a '
          + 'time. Visitor numbers at the borrowing museums rose by a third on average. Two of '
          + 'the eleven could not meet the security conditions and withdrew, which the scheme\'s '
          + 'organisers say they should have foreseen.',
        explanation: 'The admission at the end is part of the finding. A reconstruction that reports the average rise alone describes a scheme that worked for everyone, which it did not.',
        keyPoints: [
          'A national museum began lending items to small local museums',
          'Each loan lasted a year at a time',
          'Visitor numbers at borrowing museums rose by a third on average',
          'Eleven museums took part',
          'Two could not meet the security conditions and withdrew',
          'The organisers say they should have foreseen that'
        ] },
      { passage: 'An employer replaced its annual pay review with one held every six months. '
          + 'Staff turnover fell in the first year and the total wage bill rose by less than '
          + 'expected. Managers report spending noticeably more time on the reviews themselves, '
          + 'and two departments have asked to return to the old arrangement.',
        explanation: 'Three results point in three directions and the passage does not resolve them. A version that keeps only the first has taken a side the text refuses to take.',
        keyPoints: [
          'An employer replaced its annual pay review with one every six months',
          'Staff turnover fell in the first year',
          'The total wage bill rose by less than expected',
          'Managers spend noticeably more time on the reviews',
          'Two departments have asked to go back to the old arrangement',
          'The results point in different directions and are not resolved'
        ] },
      { passage: 'A water company published a live map showing every leak it knew about and how '
          + 'long each had been open. Reports from the public tripled. The company now finds '
          + 'leaks faster than it can repair them, and the average age of an unrepaired leak on '
          + 'the map has risen since publication.',
        explanation: 'The transparency worked and made the published number look worse. Keeping only "reports tripled" loses the irony the last sentence carries.',
        keyPoints: [
          'A water company published a live map of every leak it knew about',
          'The map showed how long each leak had been open',
          'Reports from the public tripled',
          'The company now finds leaks faster than it can repair them',
          'The average age of an unrepaired leak has risen',
          'That rise has happened since the map was published'
        ] }
    ],

    /* ---- C · Reading Comprehension (3) ----------------------------- */
    C: [
      { passage: 'A study compared two ways of teaching a practical skill: a single long session '
          + 'and four short ones spread over a month. Tested a week later, the two groups scored '
          + 'almost identically. Tested again after six months, the spaced group scored '
          + 'substantially higher, which the authors say is the result that matters for training.',
        question: 'Why do the authors regard the six-month test as the important one?',
        options: [
          'It reflects what training is meant to achieve',
          'It was the only test with a clear difference in scores',
          'The one-week test used a different method',
          'The spaced group had more practice overall'
        ],
        answer: 'It reflects what training is meant to achieve',
        explanation: 'The authors\' stated reason is that it "matters for training" — retention, not immediate performance. The second distractor is factually true of the results but is not the reason given, which is exactly the distinction the item tests.' },
      { passage: 'A council trialled free bus travel for under-eighteens in two districts. Bus use '
          + 'by that age group roughly doubled. Car journeys by their parents fell only slightly, '
          + 'because most of the new bus trips replaced walking and cycling rather than being '
          + 'driven.',
        question: 'Why did car journeys fall by less than expected?',
        options: [
          'The new bus trips mostly replaced walking and cycling',
          'Too few young people took up the free travel',
          'Parents continued to drive for other reasons',
          'The trial covered only two districts'
        ],
        answer: 'The new bus trips mostly replaced walking and cycling',
        explanation: 'The passage gives the mechanism explicitly. The first distractor contradicts "roughly doubled"; the others are plausible explanations the passage does not make.' },
      { passage: 'A hospital introduced a checklist before routine operations. Complication rates '
          + 'fell in the first year. Surgeons who had opposed the checklist most strongly showed '
          + 'the largest improvement, a finding the authors describe as interesting but which '
          + 'they are careful not to explain.',
        question: 'What is the authors\' position on the finding about the opposing surgeons?',
        options: [
          'They report it without offering an explanation',
          'They argue it shows the surgeons were previously careless',
          'They suggest the checklist mattered less than attitude',
          'They treat it as evidence that opposition was justified'
        ],
        answer: 'They report it without offering an explanation',
        explanation: '"Careful not to explain" is the whole answer. Each distractor supplies precisely the interpretation the authors decline to make, which is the trap for a candidate who reads for a conclusion.' }
    ],

    /* ---- D · E-Mail Writing (2) ------------------------------------ */
    D: [
      { scenario: 'You manage a project that will finish about three weeks late. The cause is a '
          + 'decision your own client made in month two, which you advised against at the time '
          + 'and recorded in writing. You need to inform them without turning it into an argument '
          + 'about blame.',
        task: 'Write an email of about 150 words to the client. State the new date, explain the '
          + 'cause factually, and set out what happens now. Use a formal register.',
        explanation: 'The difficulty is naming a cause that reflects badly on the reader without appearing to score a point. An email that hides the cause and one that dwells on it both fail.',
        keyPoints: [
          'States the new completion date plainly and early',
          'Explains the cause factually, including the decision taken in month two',
          'Refers to the written advice without labouring it or assigning blame',
          'Sets out what happens now — the recovery plan and any choices the client has',
          'Formal and even in tone, so the account reads as a record rather than a complaint'
        ] },
      { scenario: 'A colleague at another organisation has asked you to write a reference for a '
          + 'former team member. You can recommend their technical work warmly, but they left '
          + 'your team after repeated problems with deadlines, and the new role is one where '
          + 'deadlines matter.',
        task: 'Write an email of about 150 words. Be fair to the candidate, be honest with the '
          + 'reader, and make clear what you can and cannot speak to. Use a formal register.',
        explanation: 'Honesty and fairness pull against each other, and both are marked. An unreservedly warm reference and a damning one are the two ways to fail this.',
        keyPoints: [
          'Recommends the technical work warmly and specifically',
          'Raises the difficulty with deadlines honestly rather than omitting it',
          'Gives it proportionate weight, without turning the reference into a warning',
          'Makes clear what the writer can and cannot speak to',
          'Formal and measured — a professional reference, fair to both the candidate and the reader'
        ] }
    ],

    /* ---- E · Dictation (8) ----------------------------------------- */
    E: [
      { script: 'The final version was circulated late on Friday afternoon.' },
      { script: 'Nobody had expected the figures to change so quickly.' },
      { script: 'The contract runs for three years with an option to extend.' },
      { script: 'Her evidence was accepted and no one asked anything further.' },
      { script: 'The building has stood empty since the factory closed.' },
      { script: 'They were unable to agree on the wording of the clause.' },
      { script: 'The results will be announced at the end of the week.' },
      { script: 'He described the delay as unfortunate but entirely avoidable.' }
    ],

    /* ---- F · Response Selection (8) -------------------------------- */
    F: [
      { script: 'I take it you have seen the revised figures.',
        options: ['Only the summary so far.', 'It is just past the station.', 'Yes, she starts on Monday.', 'About sixty people came.'],
        answer: 'Only the summary so far.',
        explanation: '"I take it" assumes and invites correction or qualification. The distractors answer where, who and how many.' },
      { script: 'Is there any chance of moving the deadline?',
        options: ['I could give you until Thursday.', 'It was rather well received.', 'Yes, on the second floor.', 'She has been here a year.'],
        answer: 'I could give you until Thursday.',
        explanation: 'A request for an extension takes a concrete offer or a refusal. The nearest distractor evaluates something, which answers "how was it" rather than "can we".' },
      { script: 'I would not want to speak for the whole team.',
        options: ['Of course, just your own view is fine.', 'Yes, it is quite far to walk.', 'They cost about thirty pounds each.', 'No, I have not finished it.'],
        answer: 'Of course, just your own view is fine.',
        explanation: 'A hedge about authority invites reassurance that a personal view will do. The others answer distance, price and completion.' },
      { script: 'That is not quite what I meant, I am afraid.',
        options: ['Sorry, could you put it another way?', 'Yes, it arrived this morning.', 'About half past eleven.', 'It is on the top shelf.'],
        answer: 'Sorry, could you put it another way?',
        explanation: 'A correction invites a request for clarification. Each distractor answers a question about time, delivery or place.' },
      { script: 'How firm is the estimate at this stage?',
        options: ['Fairly rough, to be honest.', 'Yes, I sent it yesterday.', 'On the desk by the window.', 'Around fifteen of them.'],
        answer: 'Fairly rough, to be honest.',
        explanation: 'The question asks about confidence, not about the number. "Around fifteen of them" answers the quantity, which is the trap for a candidate who hears "estimate" and stops.' },
      { script: 'We seem to have rather more data than we need.',
        options: ['Shall we cut it down together?', 'Yes, it was quite expensive.', 'She left before the end.', 'It is about twenty pages.'],
        answer: 'Shall we cut it down together?',
        explanation: 'An observation about a surplus invites a proposal to act. The distractors comment on cost, a person and length.' },
      { script: 'I am sorry to have kept you waiting so long.',
        options: ['It is quite all right, I was early.', 'Yes, about half an hour.', 'It is on the ground floor.', 'No, I have not eaten.'],
        answer: 'It is quite all right, I was early.',
        explanation: 'An apology takes acceptance. "Yes, about half an hour" confirms the length of the wait, which agrees with the complaint instead of dismissing it — natural but not the reply an apology invites.' },
      { script: 'Would it help if I looked at it before you send it?',
        options: ['That would be very useful, thank you.', 'It was posted last Tuesday.', 'Yes, the address is correct.', 'About four pages, I think.'],
        answer: 'That would be very useful, thank you.',
        explanation: 'An offer of help takes acceptance or refusal. Every distractor treats the document as already sent, which the offer explicitly precedes.' }
    ],

    /* ---- G · Passage Comprehension (6) ----------------------------- */
    G: [
      { script: 'A brief word about the results before you read them yourselves. The headline '
          + 'number is that complaints have halved, and I want to be careful about how much '
          + 'weight that carries. _ We changed the complaints form at the same time, and the new '
          + 'one is shorter but harder to find on the website. So some of that fall is real and '
          + 'some of it is people giving up, and at the moment we cannot say what the split is.',
        question: 'Why is the speaker cautious about the fall in complaints?',
        options: [
          'A harder-to-find form may have stopped people complaining',
          'The complaints were not counted accurately',
          'The fall was too small to be meaningful',
          'The new form was introduced after the results'
        ],
        answer: 'A harder-to-find form may have stopped people complaining',
        explanation: 'The passage names the confound and says the split is unknown. The fourth distractor reverses the timing, which is what makes the confound possible in the first place.' },
      { script: 'Two changes to the way we handle bookings from next month. Groups of eight or '
          + 'more will need to pay a deposit when they book, which we have not asked for before, '
          + 'and which is refundable up to a week beforehand. _ Smaller bookings are unaffected. '
          + 'The second change is that we will hold a table for fifteen minutes rather than half '
          + 'an hour, because on busy evenings that half hour was costing us a second sitting.',
        question: 'Why has the table-holding time been reduced?',
        options: [
          'The longer wait was costing a second sitting on busy evenings',
          'Groups of eight or more were arriving late',
          'Customers asked for a shorter holding time',
          'Deposits made the holding time unnecessary'
        ],
        answer: 'The longer wait was costing a second sitting on busy evenings',
        explanation: 'The reason is attached to the change in the same sentence. The distractors connect it to the deposit rule, which the passage keeps entirely separate.' },
      { script: 'I want to say something about the pilot before we decide whether to extend it. '
          + 'It met every target we set, and I am not going to pretend otherwise. _ But we chose '
          + 'the two friendliest sites to run it in, for good reasons at the time, and that means '
          + 'we have learned what happens when everything goes well. We have not learned what '
          + 'happens when it does not, and that is the thing a decision to extend actually turns '
          + 'on.',
        question: 'What limitation does the speaker identify in the pilot?',
        options: [
          'It was run only in sites where success was likely',
          'It failed to meet several of its targets',
          'It ran for too short a period to judge',
          'The targets themselves were set too low'
        ],
        answer: 'It was run only in sites where success was likely',
        explanation: 'The speaker concedes the targets were met and locates the problem in site selection. Each distractor attacks the pilot in a way the passage explicitly does not.' },
      { script: 'A short update on the recruitment. We advertised the post twice, and the second '
          + 'time we removed the requirement for a degree, which was not needed for the work. '
          + '_ Applications went up by about half, and the shortlist was noticeably stronger than '
          + 'the first one. Two of the four we interviewed had no degree. I mention it because '
          + 'we have the same requirement on six other posts and nobody has looked at whether '
          + 'they need it either.',
        question: 'Why does the speaker mention the other six posts?',
        options: [
          'Their degree requirement has never been examined',
          'They have all been advertised twice already',
          'They attracted weaker shortlists than this one',
          'They are being combined into fewer roles'
        ],
        answer: 'Their degree requirement has never been examined',
        explanation: 'The final sentence states the point of raising them. The distractors carry facts from the story of this post across to the others, which is exactly what the passage does not claim.' },
      { script: 'Before the vote, let me set out what we are and are not deciding tonight. We are '
          + 'deciding whether to commission the study, which costs eleven thousand pounds and '
          + 'takes about four months. _ We are not deciding whether to build anything, and '
          + 'nothing said tonight commits us to that. I stress this because the last time we '
          + 'commissioned a study, several people felt afterwards that the decision to proceed '
          + 'had somehow already been taken, and I do not want that again.',
        question: 'Why does the speaker stress the limits of the vote?',
        options: [
          'A previous study left people feeling committed to proceeding',
          'The cost of the study has not yet been agreed',
          'Some members want to vote on the building instead',
          'The study will take longer than four months'
        ],
        answer: 'A previous study left people feeling committed to proceeding',
        explanation: 'The reason is given in the last sentence and is about a past experience. The distractors contradict the figures the speaker has just stated as settled.' },
      { script: 'One more item, about the volunteers. We now have forty two people on the list, '
          + 'which is more than we have ever had, and about a dozen of them have never actually '
          + 'been asked to do anything. _ That is our fault rather than theirs. People who sign '
          + 'up and then hear nothing for six months do not sign up again, and we have been '
          + 'losing them steadily without noticing because the number on the list kept going up. '
          + 'I would rather have twenty five people we use than forty two we do not.',
        question: 'Why had the problem gone unnoticed?',
        options: [
          'The total on the list kept rising',
          'Volunteers did not complain about being unused',
          'Nobody was responsible for the volunteer list',
          'The list was only reviewed once a year'
        ],
        answer: 'The total on the list kept rising',
        explanation: 'The passage says the growing headline number masked the loss. The distractors are plausible organisational failures the passage never mentions, and the speaker in fact accepts responsibility rather than citing an absence of it.' }
    ],

    /* ---- H · Repeat (10) ------------------------------------------- */
    H: [
      { script: 'The decision was taken without consulting the staff involved.' },
      { script: 'Few of us expected the talks to last so long.' },
      { script: 'She had already withdrawn her name from the list.' },
      { script: 'The evidence was strong enough to change their minds.' },
      { script: 'Nobody has been able to explain the discrepancy yet.' },
      { script: 'They intend to publish the findings later this year.' },
      { script: 'The offer was withdrawn before anyone could accept it.' },
      { script: 'His account differs from hers in several important ways.' },
      { script: 'We were assured that the problem had been resolved.' },
      { script: 'The scheme worked far better than its critics predicted.' }
    ],

    /* ---- I · Speaking Situations (2) ------------------------------- */
    I: [
      { scenario: 'You are presenting work to a client and realise halfway through that one of '
          + 'your figures is wrong. It changes a conclusion you have already stated. Nobody in '
          + 'the room has noticed.',
        task: 'Speak for up to one minute. Correct it before you go on, keep the client\'s '
          + 'confidence, and say what it does and does not change.',
        explanation: 'The mark turns on volunteering the error at once and containing it. Continuing and hoping, or over-apologising until the whole piece looks unsafe, are the two failures.',
        keyPoints: [
          'Corrects the error immediately rather than continuing and hoping',
          'States plainly which figure is wrong and what the right one is',
          'Says which conclusion changes and, just as importantly, which do not',
          'Keeps the client\'s confidence by proposing how the rest will be checked',
          'Composed and professional — an owned mistake, not an apology that undermines the work'
        ] },
      { scenario: 'A supplier you rely on has asked you for a reference for another client. Their '
          + 'work for you has been good but their invoicing has been consistently late, and you '
          + 'are speaking to them on the telephone.',
        task: 'Speak for up to one minute. Agree to give the reference, be clear about what you '
          + 'will say, and raise the invoicing so it is not a surprise.',
        explanation: 'The difficulty is raising a fault with someone you depend on, in a conversation they started expecting a favour.',
        keyPoints: [
          'Agrees to give the reference rather than leaving it ambiguous',
          'Says warmly what will be praised — the quality of the work',
          'Raises the late invoicing directly rather than letting it appear in writing unannounced',
          'Explains that the reference will be honest, so nothing in it is a surprise',
          'Cordial but frank — the register of a long working relationship, not a complaint'
        ] }
    ],

    /* ---- J · Story Retellings (3) ---------------------------------- */
    J: [
      { script: 'Kate took over a failing bookshop and spent the first month doing nothing but '
          + 'watching. Her friends thought she was wasting the little money she had. _ What she '
          + 'noticed was that almost everyone who came in walked to the back, looked at the '
          + 'noticeboard by the door to the yard, and left again. The noticeboard carried adverts '
          + 'for local music. The books were, to most of them, something they passed on the way. '
          + '_ She moved the noticeboard to the front window and put a table of secondhand '
          + 'paperbacks beside it. Sales rose immediately, not because anyone came for books, '
          + 'but because people now waited by a table instead of walking past shelves. Kate says '
          + 'the month of watching was the only research she has ever done that was worth '
          + 'anything.',
        explanation: 'The mechanism is the point: she did not attract readers, she changed where people stood. Retellings that say "she moved things around and sales rose" have kept the outcome and lost the reasoning.',
        keyPoints: [
          'Kate took over a failing bookshop and spent the first month watching',
          'Her friends thought she was wasting her money',
          'Customers walked to the back, looked at the noticeboard and left',
          'The noticeboard carried adverts for local music, not books',
          'She moved it to the front window with a table of paperbacks beside it',
          'Sales rose because people now waited by a table, and she says the watching was her only worthwhile research'
        ] },
      { script: 'Michael spent eleven years as a translator before he lost most of his hearing. He '
          + 'assumed his working life was over, since almost all of his work had come from '
          + 'interpreting at meetings. _ For a year he took whatever written work he could find '
          + 'and earned about a third of what he had before. He was slower than he had been and '
          + 'he minded that more than the money. _ What changed things was a publisher who wanted '
          + 'a difficult technical manual translated and did not care how long it took. Michael '
          + 'discovered he was better at that than he had ever been at meetings, because the work '
          + 'rewarded exactly the thing he now had, which was time. He says he would not have '
          + 'found out any other way, and that he does not recommend the method.',
        explanation: 'The last clause keeps the story honest: it worked out and it was not a blessing. A retelling that turns it into a story about a silver lining loses the refusal at the end.',
        keyPoints: [
          'Michael worked as a translator for eleven years and then lost most of his hearing',
          'Almost all his work had been interpreting at meetings, so he assumed it was over',
          'For a year he took written work and earned about a third as much',
          'He minded being slower more than he minded the money',
          'A publisher wanted a technical manual with no deadline, and he proved better at it',
          'The work rewarded time, and he says he would not have found out otherwise but does not recommend the method'
        ] },
      { script: 'A small town council asked residents which of four projects should get the year\'s '
          + 'budget. Nearly two thousand people voted, far more than in the council elections, '
          + 'and the new playground won comfortably. _ The council built it. Turnout at the next '
          + 'council election was almost exactly what it had been before, which surprised the '
          + 'councillors, who had expected the vote to draw people in. _ A researcher who looked '
          + 'at it afterwards found that most of those who voted on the projects had not realised '
          + 'the council ran the vote at all. They had seen a poster about a playground. Her '
          + 'conclusion was that the council had successfully asked a question and entirely failed '
          + 'to introduce itself, and that these are separate pieces of work.',
        explanation: 'The finding is the separation of two things the council had assumed were one. A retelling that stops at "turnout did not rise" reports the puzzle without the answer.',
        keyPoints: [
          'A town council asked residents to choose between four projects',
          'Nearly two thousand voted, far more than in council elections',
          'The playground won and the council built it',
          'Turnout at the next council election was unchanged, which surprised the councillors',
          'A researcher found most voters had not realised the council ran the vote',
          'Her conclusion was that asking a question and introducing yourself are separate pieces of work'
        ] }
    ]
  }
};
