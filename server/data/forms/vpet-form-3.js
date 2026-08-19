/**
 * VPET form 3 — B1. Fifty-five items, parts A to J.
 *
 * The third and last B1 form. With forms 1 and 2 it takes every part past twice
 * the blueprint count at this level, which is what lets two B1 sittings draw
 * genuinely different papers (docs/BLUEPRINT.md §6).
 */
'use strict';

module.exports = {
  id: 'f3',
  name: 'VPET practice form 3',
  level: 'B1',
  parts: {

    /* ---- A · Sentence Completion (10) ------------------------------ */
    A: [
      { prompt: 'She is very good ___ explaining difficult ideas simply.', answer: 'at',
        explanation: 'good at + -ing. "good in" and "good for" both exist but mean other things ("good for you", "good in parts").' },
      { prompt: 'The keys must be somewhere ___ I left them on the table.', answer: 'unless',
        explanation: 'unless = if not. "if" alone would need a negative after it, and the sentence has none.' },
      { prompt: 'He was born in a small town ___ nobody has heard of.', answer: 'that',
        explanation: 'A defining relative clause about a thing takes that or which. "where" is the trap: the clause needs an object, not a place adverb.' },
      { prompt: 'I have not finished ___ , I need another ten minutes.', answer: 'yet',
        explanation: 'not … yet with the present perfect. "already" belongs to the affirmative, and "still" would go before "have".' },
      { prompt: 'Take an umbrella ___ case it rains later.', answer: 'in',
        explanation: 'in case + present tense for a precaution. Distinct from "if it rains", which is a condition rather than a precaution.' },
      { prompt: 'Nobody knew the answer, ___ did the teacher.', answer: 'nor',
        explanation: 'nor + inversion continues a negative. "neither" also works here, but with "nor" already implied by the comma the pair is fixed.' },
      { prompt: 'The more you practise, ___ easier it becomes.', answer: 'the',
        explanation: 'The more … the more. The second "the" is compulsory and is what the item tests; leaving it out is the commonest error.' },
      { prompt: 'She insisted ___ paying for the meal herself.', answer: 'on',
        explanation: 'insist on + -ing. "insist that" takes a clause, and the -ing after the gap rules it out.' },
      { prompt: 'We will have to put the meeting ___ until next week.', answer: 'off',
        explanation: 'put off = postpone. "put out", "put up" and "put on" are all real phrasal verbs, which is what makes the particle the whole question.' },
      { prompt: 'It is no use ___ about it now, the decision is made.', answer: 'worrying',
        explanation: 'It is no use + -ing. "to worry" is the error, and the frame is fixed.' }
    ],

    /* ---- B · Passage Reconstruction (3) ---------------------------- */
    B: [
      { passage: 'A dentist began sending appointment reminders by text instead of by post. '
          + 'Missed appointments fell by a third in the first year, and the practice saved the '
          + 'cost of the stamps as well. Older patients complained, and about forty of them '
          + 'asked to be moved back onto letters.',
        explanation: 'The saving and the complaint sit together. A reconstruction that keeps only the improvement has reported a decision nobody objected to, which is not what happened.',
        keyPoints: [
          'A dentist replaced posted appointment reminders with text messages',
          'Missed appointments fell by a third in the first year',
          'The practice also saved the cost of postage',
          'Older patients complained about the change',
          'About forty of them asked to go back to letters',
          'The practice moved those patients back onto letters'
        ] },
      { passage: 'A supermarket moved its milk from the back of the shop to just inside the door. '
          + 'Sales of milk did not change at all. What did change was the average amount spent '
          + 'per visit, which fell noticeably, because shoppers no longer walked past everything '
          + 'else to reach it.',
        explanation: 'The result is about the walk, not the milk. Keeping only "milk sales did not change" drops the finding entirely.',
        keyPoints: [
          'A supermarket moved its milk from the back of the shop to just inside the door',
          'Sales of milk themselves did not change at all',
          'The average amount spent per visit fell noticeably',
          'The reason was that shoppers no longer walked through the shop',
          'They had previously passed everything else on the way to the milk',
          'The change was measured per visit rather than per customer'
        ] },
      { passage: 'A council offered free tree planting to anyone with a front garden. Two hundred '
          + 'households applied in the first month. Four years later a survey found that a fifth '
          + 'of the trees had died, almost all of them in the gardens of people who had moved '
          + 'house since planting.',
        explanation: 'The pattern in the last clause is the whole point. A version that reports the death rate without the reason has kept a number and lost the finding.',
        keyPoints: [
          'A council offered free tree planting to anyone with a front garden',
          'Two hundred households applied in the first month',
          'A survey was carried out four years later',
          'A fifth of the trees had died',
          'Almost all the dead trees were in gardens where the household had moved',
          'The deaths were concentrated among people who had left since planting'
        ] }
    ],

    /* ---- C · Reading Comprehension (3) ----------------------------- */
    C: [
      { passage: 'A cinema replaced its printed programme with a monthly email. Bookings from '
          + 'people under thirty rose, and bookings from people over sixty fell by more. The '
          + 'manager has restored the printed version alongside the email rather than instead '
          + 'of it.',
        question: 'What has the manager done about the printed programme?',
        options: [
          'Brought it back while keeping the email as well',
          'Replaced the email with it again',
          'Kept only the email, since younger bookings rose',
          'Sent it only to people over sixty'
        ],
        answer: 'Brought it back while keeping the email as well',
        explanation: '"Alongside the email rather than instead of it" is the precise line the item turns on. Two distractors take that back to one channel or the other, and the fourth invents a targeting rule.' },
      { passage: 'A factory changed its shift start from six in the morning to seven. Lateness '
          + 'almost disappeared. Output per shift dropped slightly, because the later start '
          + 'overlapped with the busiest hour on the road and deliveries arrived behind schedule.',
        question: 'Why did output per shift fall?',
        options: [
          'Deliveries were delayed by heavier traffic',
          'Workers were arriving late more often',
          'The shift was made shorter than before',
          'Fewer workers were on each shift'
        ],
        answer: 'Deliveries were delayed by heavier traffic',
        explanation: 'The cause is spelled out: the later start met the busiest hour on the road. The strongest distractor is lateness, which the passage says almost disappeared — the opposite of the answer.' },
      { passage: 'A council put recycling bins on a busy shopping street. The bins filled quickly, '
          + 'but a third of what went into them was ordinary rubbish, which meant the whole '
          + 'container had to be treated as waste. The scheme now costs more than it saves.',
        question: 'Why does the scheme cost more than it saves?',
        options: [
          'Contaminated containers have to be treated as waste',
          'The bins are emptied too often',
          'People are not using the bins at all',
          'Recycling has become more expensive to sell'
        ],
        answer: 'Contaminated containers have to be treated as waste',
        explanation: 'The mechanism is in the middle sentence: one third ordinary rubbish spoils the whole container. Two distractors contradict "the bins filled quickly", and the fourth adds a market change the passage never mentions.' }
    ],

    /* ---- D · E-Mail Writing (2) ------------------------------------ */
    D: [
      { scenario: 'You signed up for a monthly delivery of fruit. The last two boxes arrived with '
          + 'several damaged pieces. You would like to continue the service if the problem can be '
          + 'sorted out.',
        task: 'Write an email of about 120 words to the company. Describe what has arrived, say '
          + 'that you want to stay a customer, and ask what they will do. Keep the tone polite '
          + 'and constructive.',
        explanation: 'The mark turns on complaining while signalling that the relationship is worth keeping. A cancellation email has answered a different question.',
        keyPoints: [
          'Describes the problem: damaged fruit in the last two boxes',
          'Makes clear that the writer wants to continue the service',
          'Asks what the company will do about it',
          'Polite and constructive — a complaint aimed at a fix, not at ending the contract'
        ] },
      { scenario: 'You promised to help a friend move house on Saturday. Your employer has now '
          + 'asked you to work that day, and you cannot refuse without difficulty.',
        task: 'Write an email of about 120 words. Explain what has happened, apologise, and offer '
          + 'a practical alternative. Keep the tone warm and apologetic.',
        explanation: 'Breaking a promise is the difficulty. An email that explains at length and offers nothing has left the friend exactly where they were.',
        keyPoints: [
          'Explains that work has been scheduled for Saturday and why it cannot be refused',
          'Apologises for going back on the promise',
          'Offers a practical alternative — another day, or help with packing beforehand',
          'Warm and apologetic, so the friendship is not damaged by the change'
        ] }
    ],

    /* ---- E · Dictation (8) ----------------------------------------- */
    E: [
      { script: 'The next train to the coast leaves in ten minutes.' },
      { script: 'I would like to book a table for four people.' },
      { script: 'She has worked at the same school for years.' },
      { script: 'The kitchen window had been left open all night again.' },
      { script: 'We should arrive before the shops close this evening.' },
      { script: 'He borrowed my bicycle and returned it the next day.' },
      { script: 'There is a bank opposite the entrance to the park.' },
      { script: 'They have decided to sell the house in the spring.' }
    ],

    /* ---- F · Response Selection (8) -------------------------------- */
    F: [
      { script: 'How long have you been waiting?',
        options: ['About twenty minutes.', 'Yes, it is very comfortable.', 'On the platform over there.', 'No, I have not tried it.'],
        answer: 'About twenty minutes.',
        explanation: '"How long" wants a duration. The distractors give an opinion, a place and a yes-no answer.' },
      { script: 'Can I get you anything while I am up?',
        options: ['A glass of water would be lovely.', 'It is on the third floor.', 'Yes, I saw her yesterday.', 'About half past two.'],
        answer: 'A glass of water would be lovely.',
        explanation: 'An offer to fetch something takes a request. The distractors answer where, who and when.' },
      { script: 'I am afraid the manager is not in today.',
        options: ['Could I leave a message?', 'Yes, it is quite far.', 'They cost about eight pounds.', 'I have already had lunch.'],
        answer: 'Could I leave a message?',
        explanation: 'Being told someone is out invites a next step. The other three are all natural office remarks that answer nothing that was said.' },
      { script: 'Did you manage to get tickets in the end?',
        options: ['Only two, but that is enough.', 'It starts at half past seven.', 'The theatre is quite old.', 'Yes, I have been before.'],
        answer: 'Only two, but that is enough.',
        explanation: 'The question is whether tickets were obtained. "Yes, I have been before" answers a different yes-no question and is the strongest trap.' },
      { script: 'This soup is delicious. What is in it?',
        options: ['Mostly carrots and a little ginger.', 'It was quite expensive.', 'Yes, I made it yesterday.', 'In the cupboard above the sink.'],
        answer: 'Mostly carrots and a little ginger.',
        explanation: 'The question asks for contents. "Yes, I made it yesterday" is close enough to sound cooperative while answering when rather than what.' },
      { script: 'Is there anywhere near here to get a coffee?',
        options: ['There is a place across the road.', 'I usually have tea, thanks.', 'It was rather strong.', 'Yes, about ten o\'clock.'],
        answer: 'There is a place across the road.',
        explanation: 'The question is where. "I usually have tea, thanks" answers a question about preference that was not asked.' },
      { script: 'You look tired. Did you sleep badly?',
        options: ['The neighbours were up all night.', 'It is on the second shelf.', 'About four pounds fifty.', 'Yes, I will be there.'],
        answer: 'The neighbours were up all night.',
        explanation: 'The reply explains the poor sleep without needing a yes. The distractors answer where, how much and a future arrangement.' },
      { script: 'Do you happen to know when the library opens?',
        options: ['Not until ten on a Sunday.', 'It is a very old building.', 'Yes, I go there often.', 'About two miles from here.'],
        answer: 'Not until ten on a Sunday.',
        explanation: 'The question is when. "Yes, I go there often" answers the literal "do you know" and ignores what was actually asked, which is the classic trap in this frame.' }
    ],

    /* ---- G · Passage Comprehension (6) ----------------------------- */
    G: [
      { script: 'Thank you all for coming in this evening. The plan for the old market hall has '
          + 'changed since the last meeting, and I want to be clear about what has changed and '
          + 'what has not. _ The building will still be repaired rather than knocked down, and '
          + 'that was never in doubt. What has changed is the use: instead of offices upstairs, '
          + 'there will now be a small library, and the ground floor stays a market as it always '
          + 'was. The money comes from the same grant as before.',
        question: 'What has changed in the plan?',
        options: [
          'The upstairs will be a library rather than offices',
          'The building will be knocked down instead of repaired',
          'The ground floor will no longer be a market',
          'The money will come from a different grant'
        ],
        answer: 'The upstairs will be a library rather than offices',
        explanation: 'The passage is built to separate one change from three constants, and names all four. Each distractor is one of the things it says has not changed.' },
      { script: 'A message for everyone taking the coach on Friday. We are leaving from the back '
          + 'car park this time, not the front, because the front gates are being repainted. '
          + '_ The coach goes at seven sharp and the driver will not wait, so aim to be there by '
          + 'quarter to. Bring your own breakfast, as we are not stopping until eleven, and that '
          + 'stop is only twenty minutes. Anyone who has not paid should see me before Thursday.',
        question: 'Why is the departure point different this time?',
        options: [
          'The front gates are being repainted',
          'The coach is larger than usual',
          'The front car park is full on Fridays',
          'The driver asked for a change'
        ],
        answer: 'The front gates are being repainted',
        explanation: 'The reason is attached to the change in the same sentence. The distractors are all plausible logistics that the passage never raises.' },
      { script: 'Here is what is happening with the evening classes next term. Beginners cookery '
          + 'is full and we have opened a second group on Wednesdays, so if you were on the '
          + 'waiting list you should have had an email. _ Conversational Spanish is running as '
          + 'planned. Watercolour painting has been cancelled, not for lack of interest but '
          + 'because the tutor has moved away, and we are looking for a replacement for the '
          + 'term after next.',
        question: 'Why has the painting class been cancelled?',
        options: [
          'The tutor has moved away',
          'Not enough people signed up',
          'The room was needed for cookery',
          'It has been moved to next term instead'
        ],
        answer: 'The tutor has moved away',
        explanation: 'The passage rules out the obvious cause before giving the real one — "not for lack of interest but because". The first distractor is exactly the cause it rules out.' },
      { script: 'Good afternoon. This is a short announcement about the lifts in this building. '
          + 'The main lift is out of service until Monday while a part is replaced, and the goods '
          + 'lift at the rear is being used for passengers in the meantime. _ It is slower and it '
          + 'stops at every floor, so please allow extra time, especially if you have an '
          + 'appointment. Anyone who cannot manage the stairs and cannot wait should speak to '
          + 'reception, who will arrange something.',
        question: 'What is the passage asking people to do differently?',
        options: [
          'Allow extra time, because the replacement lift is slower',
          'Use the stairs instead of any lift',
          'Report to reception before using the goods lift',
          'Avoid the building until Monday'
        ],
        answer: 'Allow extra time, because the replacement lift is slower',
        explanation: 'The instruction and its reason are in one sentence. The reception advice applies only to people who cannot manage stairs, which the third distractor generalises to everyone.' },
      { script: 'A note about the changes to the car sharing scheme. Until now you have booked a '
          + 'car by the hour, with a minimum of two hours, and a lot of members told us that was '
          + 'the thing stopping them using it for short trips. _ From next month the minimum drops '
          + 'to thirty minutes. The rate per hour goes up slightly to pay for it, so members who '
          + 'take long trips will pay a little more, and we thought it was fairer to say so than '
          + 'to leave people to discover it.',
        question: 'Who will pay more under the new arrangement?',
        options: [
          'Members who take long trips',
          'Members who take short trips',
          'All members, by the same amount',
          'New members joining after next month'
        ],
        answer: 'Members who take long trips',
        explanation: 'The passage says the hourly rate rises to fund a shorter minimum, and names who that costs. The whole point of the change is that short trips get cheaper, which is the first distractor.' },
      { script: 'Right, a quick word about the exhibition before we open the doors. The paintings '
          + 'in the first room are the ones people come for, and they are also the most fragile, '
          + 'so we are letting in twenty at a time and no more. _ Rooms two and three are open '
          + 'as usual with no limit. If there is a queue, and there will be, please explain the '
          + 'reason for it rather than just apologising, because people mind waiting much less '
          + 'when they know why.',
        question: 'What does the speaker ask the staff to do about the queue?',
        options: [
          'Explain why it exists, not just apologise for it',
          'Move visitors into rooms two and three instead',
          'Let people in more quickly when it grows',
          'Apologise to everyone who has to wait'
        ],
        answer: 'Explain why it exists, not just apologise for it',
        explanation: 'The instruction contrasts the two directly — "rather than just apologising" — and gives the reason. The fourth distractor is the half the speaker explicitly says is not enough.' }
    ],

    /* ---- H · Repeat (10) ------------------------------------------- */
    H: [
      { script: 'The road has been closed since early this morning.' },
      { script: 'I could not find my glasses anywhere in the house.' },
      { script: 'We are hoping to leave before the traffic gets bad.' },
      { script: 'She told me she had already sent the message.' },
      { script: 'The film was longer than either of us expected.' },
      { script: 'There is not much time left before the deadline.' },
      { script: 'He has been offered a job in another city.' },
      { script: 'Most of the shops open late on a Thursday.' },
      { script: 'They should have told us about the change earlier.' },
      { script: 'The weather was better than the forecast suggested.' }
    ],

    /* ---- I · Speaking Situations (2) ------------------------------- */
    I: [
      { scenario: 'You share a flat with someone you like. They keep borrowing your food without '
          + 'asking and replacing it a few days later. It is not a big loss, but it has started '
          + 'to bother you.',
        task: 'Speak for up to one minute. Raise it, keep it proportionate to how small it is, '
          + 'and agree something that works.',
        explanation: 'The whole difficulty is scale: making the point without turning a minor annoyance into a confrontation.',
        keyPoints: [
          'Raises the issue rather than letting it build up',
          'Keeps it proportionate — a small thing said lightly, not a grievance',
          'Explains why it bothers them, which is the asking rather than the food',
          'Proposes something workable, such as a message first or a shared shelf',
          'Friendly and relaxed, as between flatmates who get on'
        ] },
      { scenario: 'A relative has given you a jumper for your birthday. It does not fit and you '
          + 'do not like the colour. They have kept the receipt and have asked whether you want '
          + 'to change it.',
        task: 'Speak for up to one minute. Answer honestly, protect their feelings, and settle '
          + 'what happens next.',
        explanation: 'A direct question makes evasion obvious, so the mark turns on honesty delivered kindly.',
        keyPoints: [
          'Answers the question honestly rather than pretending the jumper is fine',
          'Thanks them warmly for the thought behind the present',
          'Mentions the fit before the colour, since fit is easier to raise without hurt',
          'Settles what happens next — changing it, and possibly going together',
          'Affectionate and informal, as with a relative'
        ] }
    ],

    /* ---- J · Story Retellings (3) ---------------------------------- */
    J: [
      { script: 'Thomas worked in an office where everyone complained about the coffee. It came '
          + 'from a machine in the corridor and it was genuinely bad. _ One January he bought a '
          + 'cheap filter jug and started making a pot each morning, mostly for himself. Within '
          + 'a fortnight six people were drinking it and putting coins in a mug to cover the '
          + 'beans. By March it was fourteen people and a rota. _ In the summer the company '
          + 'noticed and offered to buy a proper machine for the office. The group said no. '
          + 'Thomas explained afterwards that the coffee had stopped being the point some time '
          + 'in February, and that what they actually had now was ten minutes together every '
          + 'morning.',
        explanation: 'The refusal is the story, and it only makes sense if the growth from six to fourteen is kept. A retelling that ends with the company offer misses the reversal.',
        keyPoints: [
          'Everyone in the office complained about the coffee from the machine',
          'Thomas bought a cheap filter jug and made a pot each morning',
          'Within a fortnight six people were drinking it and paying for the beans',
          'By March there were fourteen people and a rota',
          'The company offered to buy a proper machine and the group refused',
          'The coffee had stopped being the point; the ten minutes together was'
        ] },
      { script: 'Alice agreed to run a stall at her village fair, selling second-hand books. She '
          + 'collected four large boxes from neighbours and priced everything at fifty pence. '
          + '_ On the day it rained hard from eleven o\'clock and almost nobody came. By three '
          + 'she had sold eleven books and was ready to pack up. Then a man arrived with a van '
          + 'and offered to take the lot for thirty pounds, which was more than she would have '
          + 'made in sunshine. _ She agreed before she thought about it. He turned out to run a '
          + 'second-hand shop two towns away, and he had come out in the rain precisely because '
          + 'he expected a wet stall to sell cheap. Alice says she has never been quite sure who '
          + 'got the better of it.',
        explanation: 'The ending is deliberately unresolved and that is the point. A retelling that decides she was cheated, or that she won, has closed something the story leaves open.',
        keyPoints: [
          'Alice ran a second-hand book stall at her village fair',
          'She collected four boxes from neighbours and priced everything at fifty pence',
          'It rained hard from eleven and almost nobody came',
          'By three she had sold only eleven books',
          'A man with a van offered thirty pounds for the lot and she agreed',
          'He ran a shop and had come out in the rain expecting a cheap sale, and she is still unsure who did better'
        ] },
      { script: 'Martin decided to learn the guitar at fifty two. He told nobody, because he '
          + 'expected to give up and did not want to be asked about it. _ For eight months he '
          + 'practised twenty minutes a night in the spare room with the door shut. He was slow '
          + 'and he knew it. What kept him going was that nobody was watching, so there was '
          + 'nothing to be embarrassed about and no reason to stop. _ At Christmas his daughter '
          + 'found the guitar and asked how long he had been playing. He said eight months and '
          + 'then played her two songs, badly. She told everyone. Martin says the secrecy was '
          + 'the only reason he lasted long enough to have something to show, and that he would '
          + 'do it the same way again.',
        explanation: 'The claim at the end is causal: the secrecy caused the persistence. Retellings that report the secrecy as shyness have lost the argument the story makes.',
        keyPoints: [
          'Martin decided to learn the guitar at fifty two',
          'He told nobody because he expected to give up',
          'He practised twenty minutes a night for eight months with the door shut',
          'Nobody watching meant nothing to be embarrassed about and no reason to stop',
          'His daughter found the guitar at Christmas and he played her two songs',
          'He says the secrecy was why he lasted, and he would do it the same way again'
        ] }
    ]
  }
};
