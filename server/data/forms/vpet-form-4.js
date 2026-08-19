/**
 * VPET form 4 — B2. Fifty-five items, parts A to J.
 *
 * The step up from B1 is in what the item asks for, not in obscurity of
 * vocabulary. Part A moves to inversion, subjunctives and fixed idiom rather
 * than to rare words; part C turns on attribution and hedging rather than on
 * finding a stated fact; parts D and I put the candidate in a position where
 * being clear and being tactful pull against each other.
 */
'use strict';

module.exports = {
  id: 'f4',
  name: 'VPET practice form 4',
  level: 'B2',
  parts: {

    /* ---- A · Sentence Completion (10) ------------------------------ */
    A: [
      { prompt: 'Under no circumstances ___ the door be left unlocked overnight.', answer: 'should',
        explanation: 'A negative adverbial at the front forces inversion, so the modal comes before the subject. "must" also inverts but the frame here takes should for a standing instruction.' },
      { prompt: 'The committee recommended that the rule ___ reviewed annually.', answer: 'be',
        explanation: 'The subjunctive after recommend that: bare "be", not "is" and not "should be" once "should" is omitted.' },
      { prompt: 'She takes after her mother ___ than her father in temperament.', answer: 'more',
        explanation: 'more … than in a comparison of two. "rather" would need "rather than" as a unit with no comparative before it.' },
      { prompt: 'No sooner ___ the announcement been made than the phones started ringing.', answer: 'had',
        explanation: 'No sooner … than with the past perfect, inverted. The pair "no sooner … than" is fixed; "when" is the common error.' },
      { prompt: 'It is high time the council ___ something about the potholes.', answer: 'did',
        explanation: 'It is high time + past tense, marking the action as overdue rather than finished. "does" and "to do" are the two errors.' },
      { prompt: 'The proposal was turned down on the ___ that it cost too much.', answer: 'grounds',
        explanation: 'on the grounds that + clause. "basis" takes "on the basis that" too, but "grounds" is the collocation with turning a proposal down.' },
      { prompt: 'Were it not ___ your help, we would never have finished.', answer: 'for',
        explanation: 'Were it not for = if it were not for, inverted. The preposition is fixed and the inversion is what makes the register formal.' },
      { prompt: 'He is by ___ the most experienced person on the team.', answer: 'far',
        explanation: 'by far + superlative. "much" intensifies comparatives ("much better") but not superlatives in this frame.' },
      { prompt: 'They objected to ___ told what to do at such short notice.', answer: 'being',
        explanation: 'object to + -ing, and the passive needs "being told". "be told" is the error the preposition creates.' },
      { prompt: 'Little ___ she know that the decision had already been taken.', answer: 'did',
        explanation: 'Little at the front inverts with the auxiliary, and "know" then stays in its base form. This is the frame the item tests, not the vocabulary.' }
    ],

    /* ---- B · Passage Reconstruction (3) ---------------------------- */
    B: [
      { passage: 'A regional airline published its real on-time figures rather than the industry '
          + 'average it had used before. Bookings fell for two months and then recovered above '
          + 'where they had started. The chief executive said the recovery was the point, but '
          + 'admitted the board had nearly reversed the decision in week six.',
        explanation: 'The admission at the end is what makes the story more than a success. A reconstruction that reports only the recovery has removed the risk that was actually run.',
        keyPoints: [
          'A regional airline published its real on-time figures',
          'It had previously used the industry average instead',
          'Bookings fell for two months',
          'They then recovered above where they had started',
          'The chief executive said the recovery was the point',
          'The board had nearly reversed the decision in week six'
        ] },
      { passage: 'Researchers offered a small payment to people who returned a health questionnaire '
          + 'within a week. Return rates rose sharply, but the answers from paid respondents '
          + 'differed systematically from the unpaid ones, and the study now reports the two '
          + 'groups separately rather than pooling them.',
        explanation: 'The methodological consequence is the finding. A version that stops at "return rates rose" has reported the incentive and not what it cost.',
        keyPoints: [
          'Researchers offered a small payment for questionnaires returned within a week',
          'Return rates rose sharply',
          'Answers from paid respondents differed systematically from unpaid ones',
          'The difference was systematic rather than random',
          'The study now reports the two groups separately',
          'The groups are no longer pooled into one result'
        ] },
      { passage: 'A university replaced its end-of-year examinations in one department with '
          + 'coursework spread through the year. Average marks rose by about four points and the '
          + 'spread between students narrowed. External examiners accepted the marks but noted '
          + 'that the narrowing made it harder to identify the strongest candidates.',
        explanation: 'The examiners accepted and objected in the same breath. Keeping only "marks rose" turns a qualified outcome into an endorsement.',
        keyPoints: [
          'A university replaced end-of-year examinations with coursework in one department',
          'The coursework was spread through the year',
          'Average marks rose by about four points',
          'The spread between students narrowed',
          'External examiners accepted the marks',
          'They noted it had become harder to identify the strongest candidates'
        ] }
    ],

    /* ---- C · Reading Comprehension (3) ----------------------------- */
    C: [
      { passage: 'A city introduced a charge for driving into the centre at peak times. Traffic '
          + 'fell by about fifteen per cent in the first year. Campaigners against the charge '
          + 'point out that traffic on the ring road rose over the same period, though the '
          + 'council argues that the ring road was already growing before the charge began.',
        question: 'What is the disagreement between the campaigners and the council about?',
        options: [
          'Whether the charge caused the rise in ring road traffic',
          'Whether traffic in the centre actually fell',
          'Whether the charge should apply at peak times only',
          'Whether the ring road figures were measured correctly'
        ],
        answer: 'Whether the charge caused the rise in ring road traffic',
        explanation: 'Both sides accept the two numbers; they differ on attribution, which is what "already growing before" disputes. The distractors move the argument to the central figure, the policy design, and the measurement, none of which is contested in the passage.' },
      { passage: 'A trial gave one group of patients a fortnightly telephone call from a nurse and '
          + 'the other group nothing extra. Admissions to hospital fell in the group receiving '
          + 'calls. The authors caution that patients who agreed to take part were more likely '
          + 'to answer the telephone in the first place, and that this may explain some of the '
          + 'difference.',
        question: 'What caution do the authors raise about their own result?',
        options: [
          'The people who volunteered may differ from those who did not',
          'The nurses may have varied in how they made the calls',
          'The fall in admissions was too small to be meaningful',
          'The two groups were not the same size'
        ],
        answer: 'The people who volunteered may differ from those who did not',
        explanation: 'The caution is about who agreed to take part — a selection effect. The distractors are three other kinds of methodological objection, all reasonable in general and none raised here.' },
      { passage: 'A publisher moved its academic journals to free access, paid for by charging '
          + 'authors instead of readers. Downloads rose roughly fivefold. Submissions from '
          + 'universities in wealthier countries rose; submissions from elsewhere fell, which '
          + 'the publisher describes as a problem it has not solved.',
        question: 'How does the publisher characterise the change in submissions from poorer countries?',
        options: [
          'As a problem it has not yet solved',
          'As an acceptable cost of wider readership',
          'As a temporary effect that will reverse',
          'As evidence that the charge is set too low'
        ],
        answer: 'As a problem it has not yet solved',
        explanation: 'The passage quotes the publisher\'s own framing exactly. Each distractor is a different stance the publisher might have taken and did not, and picking one means importing a judgement the text withholds.' }
    ],

    /* ---- D · E-Mail Writing (2) ------------------------------------ */
    D: [
      { scenario: 'You are the contact for a supplier your company has used for years. Their '
          + 'invoices have been arriving with the wrong reference number for three months, which '
          + 'delays payment at your end. You have mentioned it twice by telephone to different '
          + 'people.',
        task: 'Write an email of about 150 words. Set out the history, explain the consequence '
          + 'for both sides, and propose a specific fix with a date. Use a formal register.',
        explanation: 'The difficulty is escalating a small recurring fault without damaging a long relationship. An email that only restates the problem has not moved it forward.',
        keyPoints: [
          'Sets out the history: three months of wrong reference numbers, raised twice by telephone',
          'Explains the consequence — payment is delayed, which costs both sides',
          'Proposes a specific fix rather than asking them to look into it',
          'Names a date by which the fix should be in place',
          'Formal throughout, and mindful that this is a long-standing supplier'
        ] },
      { scenario: 'You applied for an internal promotion and were not selected. Your manager told '
          + 'you informally that the decision was close. You would like written feedback and to '
          + 'be considered next time, without appearing to dispute the outcome.',
        task: 'Write an email of about 150 words to your manager. Accept the decision, ask for '
          + 'specific feedback, and say what you want next. Keep the register formal and '
          + 'constructive.',
        explanation: 'The register carries most of the difficulty: disappointment must not read as grievance, and the request must be answerable.',
        keyPoints: [
          'Accepts the decision without arguing with it',
          'Asks for specific feedback rather than general comments',
          'States what is wanted next — to be considered for the following opportunity',
          'Offers something concrete, such as a development conversation or a stretch task',
          'Formal and constructive, so disappointment does not read as grievance'
        ] }
    ],

    /* ---- E · Dictation (8) ----------------------------------------- */
    E: [
      { script: 'The committee agreed to postpone the decision until March.' },
      { script: 'Witnesses did not agree on what happened later that evening.' },
      { script: 'The report was published without the usual press conference.' },
      { script: 'She resigned shortly before the review was due to begin.' },
      { script: 'Funding for the project runs out at the end of June.' },
      { script: 'The results were consistent across all four regions studied.' },
      { script: 'He denied any knowledge of the agreement at the time.' },
      { script: 'Applications must be submitted well before the closing date.' }
    ],

    /* ---- F · Response Selection (8) -------------------------------- */
    F: [
      { script: 'I gather the deadline has been brought forward.',
        options: ['Yes, to the fifteenth, apparently.', 'It is on the third floor.', 'No, I have not met her.', 'About four hundred pounds.'],
        answer: 'Yes, to the fifteenth, apparently.',
        explanation: '"I gather" invites confirmation and detail. The distractors answer where, who and how much, and each would be natural in the same office.' },
      { script: 'Would you mind if we moved the meeting to Wednesday?',
        options: ['Not at all, Wednesday suits me better.', 'Yes, it went very well.', 'It lasted about two hours.', 'In the room next door.'],
        answer: 'Not at all, Wednesday suits me better.',
        explanation: '"Would you mind" is answered by granting permission, and "not at all" is the idiomatic agreement. "Yes, it went very well" is the trap: agreeable in tone, and a refusal in form.' },
      { script: 'I am not entirely convinced by the second option.',
        options: ['Nor am I, to be honest.', 'Yes, I have read it twice.', 'It arrives on Thursday.', 'About half the department.'],
        answer: 'Nor am I, to be honest.',
        explanation: 'A hedged disagreement invites alignment, and "nor am I" matches the negative. The others reply to statements that were not made.' },
      { script: 'Could you possibly take this on at short notice?',
        options: ['I can, provided the deadline moves.', 'Yes, it was rather good.', 'She left about an hour ago.', 'On the shelf by the window.'],
        answer: 'I can, provided the deadline moves.',
        explanation: 'A conditional acceptance is the natural professional reply. The distractors evaluate something, report on a person and give a location.' },
      { script: 'How did the presentation go in the end?',
        options: ['Better than I had feared, actually.', 'At about ten to three.', 'Yes, please, if there is any.', 'It is roughly ten pages.'],
        answer: 'Better than I had feared, actually.',
        explanation: '"How did it go" wants an evaluation. The nearest distractor gives the time it started, which answers when rather than how.' },
      { script: 'Do you think we should raise this with the director?',
        options: ['Not yet, I would wait for the figures.', 'Yes, it is on the agenda.', 'She has been there for years.', 'About twenty of them.'],
        answer: 'Not yet, I would wait for the figures.',
        explanation: 'The question asks for a judgement about a course of action. "Yes, it is on the agenda" answers a factual question about the meeting instead.' },
      { script: 'I am afraid there has been a misunderstanding about the dates.',
        options: ['Let us go through them now.', 'Yes, it is quite a long way.', 'They were very helpful.', 'About six or seven.'],
        answer: 'Let us go through them now.',
        explanation: 'A flagged problem invites a move to resolve it. The others respond to remarks about distance, people and quantity.' },
      { script: 'That approach worked well for us last year.',
        options: ['Then it is worth trying again.', 'No, I have not been there.', 'It costs about fifty pounds.', 'At half past nine, I think.'],
        answer: 'Then it is worth trying again.',
        explanation: 'A report of past success invites a conclusion drawn from it. Each distractor answers a question of place, price or time.' }
    ],

    /* ---- G · Passage Comprehension (6) ----------------------------- */
    G: [
      { script: 'Before we take questions, I want to be precise about what the survey does and '
          + 'does not show. It shows that satisfaction with the service has risen in every age '
          + 'group over the last two years, and that rise is large enough to be confident about. '
          + '_ What it does not show is why. We changed four things in that period and the survey '
          + 'was not designed to separate them, so anyone who tells you which change did the work '
          + 'is guessing, including me.',
        question: 'What does the speaker say the survey cannot establish?',
        options: [
          'Which of the four changes produced the rise',
          'Whether satisfaction rose at all',
          'Whether the rise was large enough to be confident about',
          'Whether every age group was included'
        ],
        answer: 'Which of the four changes produced the rise',
        explanation: 'The passage separates a firm finding from an unanswerable question, and states both. Each distractor is part of the finding the speaker says is solid.' },
      { script: 'A note on the change to our returns policy, because the wording has caused some '
          + 'confusion. Customers may still return anything unused within thirty days for a full '
          + 'refund, and that has not changed at all. _ What has changed is the treatment of '
          + 'items bought in a sale: those can now be exchanged or credited but not refunded in '
          + 'cash. Staff should say this at the till when a sale item is bought, rather than '
          + 'leaving the customer to discover it later.',
        question: 'What are staff asked to do differently?',
        options: [
          'Tell customers about the sale rule at the point of sale',
          'Refuse cash refunds on all returned items',
          'Extend the returns period beyond thirty days',
          'Send sale customers a written copy of the policy'
        ],
        answer: 'Tell customers about the sale rule at the point of sale',
        explanation: 'The instruction is in the final sentence, and its rationale — rather than leaving the customer to discover it — makes it unambiguous. Two distractors overgeneralise the sale rule and the period; the fourth invents a mechanism.' },
      { script: 'I would like to correct something said at the last meeting. It was reported that '
          + 'the department had underspent its budget by nine per cent, and that figure is '
          + 'accurate. _ It was then suggested that this meant the budget could be reduced next '
          + 'year, and that does not follow. The underspend is almost entirely a delayed building '
          + 'project whose invoices will arrive in the next financial year instead. The money is '
          + 'committed; it has simply not been paid out.',
        question: 'What is the speaker correcting?',
        options: [
          'The conclusion drawn from the underspend, not the figure itself',
          'The size of the underspend, which was overstated',
          'The claim that a building project had been delayed',
          'The date on which the invoices were received'
        ],
        answer: 'The conclusion drawn from the underspend, not the figure itself',
        explanation: 'The speaker says the figure is accurate and the inference does not follow. The first distractor is exactly the thing being confirmed rather than corrected, which is what makes it tempting.' },
      { script: 'On the question of the new opening hours, the consultation produced a clearer '
          + 'answer than we expected, though not the one we asked about. Most respondents were '
          + 'indifferent to opening an hour earlier. _ A large majority, however, objected '
          + 'strongly to closing an hour earlier on Fridays, which we had treated as a minor '
          + 'detail and had not really consulted on. We are dropping the Friday change and '
          + 'proceeding with the rest.',
        question: 'Why does the speaker say the consultation did not answer the question asked?',
        options: [
          'The strong response was about a detail they had not consulted on',
          'Too few people responded to draw a conclusion',
          'Respondents misunderstood the proposed hours',
          'The responses contradicted each other'
        ],
        answer: 'The strong response was about a detail they had not consulted on',
        explanation: 'The passage contrasts indifference on the consulted question with strong objection on an unconsulted one. The distractors are three ordinary reasons a consultation fails, none of them stated here.' },
      { script: 'Two things about the maintenance work starting on Monday. The scaffolding goes up '
          + 'on the north side first, which means the fire door on that side is out of use for '
          + 'about three weeks, and the alternative route is through the kitchen. _ Please walk '
          + 'it once before you need it. The second thing is that the water will be off between '
          + 'nine and eleven on the first Tuesday only, and we will put a notice up the day '
          + 'before as a reminder.',
        question: 'What does the speaker ask people to do in advance?',
        options: [
          'Walk the alternative fire route before they need it',
          'Avoid the kitchen while the scaffolding is up',
          'Store water before the supply is turned off',
          'Read the notice going up the day before'
        ],
        answer: 'Walk the alternative fire route before they need it',
        explanation: 'The only instruction phrased in advance is the walk. The second distractor inverts the kitchen\'s role, which is the route rather than the obstruction.' },
      { script: 'I want to flag a risk in the timetable rather than a problem, because nothing has '
          + 'gone wrong yet. Every stage so far has finished on the day it was meant to, which '
          + 'is genuinely good. _ The difficulty is that we have used all the slack doing it. '
          + 'There were nine spare days built into the schedule and there are now none, so the '
          + 'next delay of any size moves the launch date rather than being absorbed. I would '
          + 'rather say that now than in November.',
        question: 'What is the speaker\'s concern?',
        options: [
          'There is no spare time left to absorb a future delay',
          'The project has already fallen behind schedule',
          'The launch date has been moved to November',
          'Stages are finishing later than planned'
        ],
        answer: 'There is no spare time left to absorb a future delay',
        explanation: 'The speaker is explicit that nothing has gone wrong and that the risk is the exhausted slack. Two distractors assert the delay the passage denies, and the third misreads November, which is when the speaker did not want to be saying this.' }
    ],

    /* ---- H · Repeat (10) ------------------------------------------- */
    H: [
      { script: 'The findings have not yet been independently confirmed.' },
      { script: 'She argued that the evidence pointed the other way.' },
      { script: 'Had we known earlier, we would have acted differently.' },
      { script: 'The agreement collapsed shortly after it was signed.' },
      { script: 'Very few of the objections were about the cost.' },
      { script: 'The scheme has been extended for a further two years.' },
      { script: 'He was reluctant to commit to any particular date.' },
      { script: 'Nothing in the report suggests the figures were wrong.' },
      { script: 'The proposal was rejected almost as soon as it appeared.' },
      { script: 'They have since revised their estimate downwards twice.' }
    ],

    /* ---- I · Speaking Situations (2) ------------------------------- */
    I: [
      { scenario: 'You lead a small team. A member of it has been doing good work but consistently '
          + 'takes credit in meetings for things a quieter colleague did. You are speaking to '
          + 'them privately.',
        task: 'Speak for up to one minute. Raise it specifically, keep it correctable rather than '
          + 'accusatory, and say what you expect from now on.',
        explanation: 'The difficulty is that the person is doing good work, so the conversation has to correct a behaviour without reading as a general complaint.',
        keyPoints: [
          'Raises the behaviour with a specific example rather than a general impression',
          'Acknowledges that their own work has been good',
          'Explains the effect on the quieter colleague',
          'States clearly what is expected in future meetings',
          'Private, direct and non-accusatory — the register of a manager correcting, not disciplining'
        ] },
      { scenario: 'You are on a committee that has just voted for a decision you argued against. '
          + 'Someone outside the committee asks you what you think of it, and you will have to '
          + 'implement it either way.',
        task: 'Speak for up to one minute. Be honest about your view, support the decision that '
          + 'was taken, and avoid undermining it.',
        explanation: 'Honesty and loyalty pull against each other here, and an answer that abandons either one misses. Pretending to agree and briefing against it are the two failures.',
        keyPoints: [
          'States honestly that they argued against it, without concealing the disagreement',
          'Explains the reasoning briefly rather than relitigating it',
          'Supports the decision as taken and commits to implementing it',
          'Avoids undermining it or inviting the listener to share the objection',
          'Measured and professional — the register of someone speaking about their own institution'
        ] }
    ],

    /* ---- J · Story Retellings (3) ---------------------------------- */
    J: [
      { script: 'Rachel spent four years building a database of every tree in her town. She '
          + 'measured them, photographed them and recorded who owned the land. Nobody had asked '
          + 'her to. _ When she finished, she offered it to the council, who thanked her politely '
          + 'and did nothing with it for two years. Rachel assumed that was the end of it and '
          + 'stopped updating the file. _ Then a developer applied to build on a strip of land at '
          + 'the edge of town. The council needed to know what was there and how old it was, and '
          + 'the only record in existence was hers. The application was refused on the strength '
          + 'of it. Rachel says the useful thing about the four years was that she had done them '
          + 'before anyone needed the answer.',
        explanation: 'The point is about timing, not about vindication. A retelling that makes it a story of persistence rewarded has missed the actual claim.',
        keyPoints: [
          'Rachel spent four years recording every tree in her town, unasked',
          'She measured them, photographed them and noted who owned the land',
          'She gave the database to the council, who did nothing with it for two years',
          'She assumed it was over and stopped updating it',
          'A developer applied to build and the council needed exactly that record',
          'The application was refused, and she says the value was in having done it beforehand'
        ] },
      { script: 'Andrew ran a small printing business that had used the same paper supplier for '
          + 'nineteen years. In the twentieth, a larger firm offered the same paper for eleven '
          + 'per cent less. _ He did the arithmetic, which was not close, and then did not switch. '
          + 'His staff thought he was being sentimental and told him so. What he did instead was '
          + 'show the old supplier the offer and ask what they could do. _ They could not match '
          + 'it, but they offered next-day delivery on short runs, which the larger firm did not '
          + 'do at all. Within a year that had won Andrew two contracts worth more than the '
          + 'saving. He says he was lucky, and that he would have looked foolish if it had gone '
          + 'the other way.',
        explanation: 'The final concession is essential: the decision worked and he does not claim it was correct. Retellings that present it as shrewdness have removed the doubt he insists on.',
        keyPoints: [
          'Andrew had used the same paper supplier for nineteen years',
          'A larger firm offered the same paper eleven per cent cheaper',
          'He did the arithmetic and chose not to switch, and his staff disagreed',
          'He showed the old supplier the offer and asked what they could do',
          'They could not match the price but offered next-day delivery on short runs',
          'That won two contracts worth more than the saving, though he says he was lucky'
        ] },
      { script: 'Julia was asked to reduce her department\'s spending by a tenth. She began by '
          + 'asking every team to list what they would stop doing if they had to, which took '
          + 'three weeks and produced a document nobody enjoyed writing. _ Reading it, she found '
          + 'that four teams had independently listed the same monthly report, which took two '
          + 'days a month to produce between them. She checked who read it. The answer was that '
          + 'it had been requested by a committee that no longer existed. _ Stopping it saved '
          + 'about a third of what she needed. Julia says the striking part was not the waste '
          + 'itself but that four separate teams had known about it for years and none of them '
          + 'had thought it was their place to say so.',
        explanation: 'The lesson is about who is allowed to raise something, not about waste. A retelling that ends at "she found a useless report" has kept the anecdote and lost the point.',
        keyPoints: [
          'Julia was asked to cut her department\'s spending by a tenth',
          'She asked every team to list what they would stop doing',
          'Four teams independently named the same monthly report',
          'It took two days a month to produce between them',
          'It had been requested by a committee that no longer existed',
          'Stopping it saved a third of the target, and four teams had known for years without saying'
        ] }
    ]
  }
};
