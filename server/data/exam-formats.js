/**
 * The standard paper formats for each exam - the platform's "subject knowledge".
 *
 * Each format describes the real paper: how many sections, how many items and
 * minutes in each, which item types, and what it is marked on. Choosing a format
 * gives the generator a correct blueprint instead of numbers typed in by hand.
 *
 * The shape of a format:
 *   id          unique code
 *   familyId    which exam family it belongs to
 *   name        display name
 *   kind        'full' (whole paper) | 'module' (one skill) | 'mini' (a short practice cut)
 *   levels      the levels it can be used at
 *   scoring     a description of the marking scale
 *   guide       the instructions shown on the pre-start screen
 *   sections[]  the SEPARATELY TIMED BLOCKS - this is the blueprint sent to
 *               POST /api/admin/tests/generate
 *     name, skill, type (a label), items, minutes, types[] (which item types to draw)
 *     parts[]   what is inside the block; for display and to explain the design
 *   notes[]     notes on the exam itself: why it splits this way, and the usual traps
 *
 * Sources: each examining body's published documentation. VEPT follows the VSTEP.3-5
 * format (Circular 01/2014/TT-BGDĐT); VPET is Pearson's Versant Professional English
 * Test and has a part table of its own. See docs/SCORING.md.
 */
'use strict';

/* The VSTEP format, shared by VEPT and VPET - two domestic certificates on one framework */
function vstepSections() {
  return [
    {
      name: 'Listening', skill: 'listening', type: 'Multiple choice', items: 35, minutes: 40,
      types: ['mcq'],
      parts: [
        { label: 'Part 1', items: 8, note: 'Announcements and short instructions - played once' },
        { label: 'Part 2', items: 12, note: 'A conversation between two people' },
        { label: 'Part 3', items: 15, note: 'Longer talks and lectures' }
      ]
    },
    {
      name: 'Reading', skill: 'reading', type: 'Four passages', items: 40, minutes: 60,
      types: ['mcq'],
      parts: [
        { label: 'Passage 1', items: 10, note: 'Everyday topics, the easiest of the four' },
        { label: 'Passage 2', items: 10, note: 'Social topics' },
        { label: 'Passage 3', items: 10, note: 'Popular science' },
        { label: 'Passage 4', items: 10, note: 'Academic topics, the hardest of the four' }
      ]
    },
    {
      name: 'Writing', skill: 'writing', type: 'Two written tasks', items: 2, minutes: 60,
      types: ['essay'],
      parts: [
        { label: 'Task 1', items: 1, note: 'A letter or email of about 120 words, ~20 minutes' },
        { label: 'Task 2', items: 1, note: 'An essay of about 250 words, ~40 minutes' }
      ]
    },
    {
      name: 'Speaking', skill: 'speaking', type: 'Three parts, recorded', items: 3, minutes: 12,
      types: ['speaking'],
      parts: [
        { label: 'Part 1', items: 1, note: 'Social interaction, 3–4 minutes' },
        { label: 'Part 2', items: 1, note: 'Discussing a solution, 4 minutes' },
        { label: 'Part 3', items: 1, note: 'Developing a topic, 5 minutes' }
      ]
    }
  ];
}

/* ------------------------------------------------------------------ *
 * VPET blueprint - ten lettered parts, A to J, 58 items in total.
 *
 * VPET is Pearson's Versant Professional English Test. Item counts are fixed
 * by the published VPET part table:
 *   A Sentence Completion 10 · B Passage Reconstruction 3
 *   C Reading Comprehension 6 · D E-Mail Writing 2
 *   E Dictation 8 · F Response Selection 8 · G Passage Comprehension 6
 *   H Repeat 10 · I Speaking Situations 2 · J Story Retellings 3
 *
 * Part C said 3 here until 2026-08-20, which is where the old "55 items" came
 * from; the published table says 6, and 58 is the total Pearson states.
 *
 * Skill and item type per part are the platform's mapping onto its own item
 * bank (mcq | gap | essay | speaking). Timings are the guide's own per-item
 * numbers - see vpetTiming() - and a part's window is arithmetic over them.
 * ------------------------------------------------------------------ */
/* Official per-item timings, quoted from the Pearson test-taker guide
   (Official Guide for Test-Takers, Versant Professional English Test):

     Part A  "You will have 25 seconds to answer."
     Part B  the passage "will disappear after 30 seconds"; "You have 90 seconds
             to rewrite the passage."
     Part C  "You will be asked to answer two multiple-choice questions based on
             the information displayed. You will have 3 minutes to read the
             passage and answer the questions."   -> three passages of two
     Part D  "You have 9 minutes to read the situation and respond."
     Part E  "You have 25 seconds to type your answer."
     Part H  "You have 15 seconds to answer." (and start within 6)
     Part I  "You have 10 seconds to think about your answer. After the beep you
             have 60 seconds to respond."
     Part J  "You will hear a short story. It will be spoken once. You have 30
             seconds to tell the story."

   The guide states no answer time for Parts F and G; `answer` for those two is
   this platform's own allowance, marked below, chosen so the ten parts land on
   the 60 minutes the guide gives as the total.

   `audio` is the playback allowance, measured from the bank's own recordings
   (server/data/audio/manifest.json) and rounded up: E 5.4s, F 4.0s, H 5.4s,
   G 29s per passage, J 32s per story. A part's window is arithmetic from these,
   never a number somebody picked - which is what the old 8/8/7/18/4/3/4/3/2/3
   was, and it gave Part C seven minutes for something the guide gives nine. */
function vpetTiming() {
  return {
    /* group: how many items share one clock and one stimulus. Part C is three
       passages of two questions, Part G two passages of three; every other part
       is timed item by item. */
    /* `startWithin` is the guide's other rule about a spoken answer: how long
       the candidate may sit in silence before the test gives up on them. It is
       NOT part of the arithmetic - the window is the same either way - so it is
       carried here only to be shown on the screen. `audio` above is a playback
       measurement and happens to be 6 for Part H as well; the two are unrelated
       and reusing one for the other would tie a rule to a recording length. */
    A: { answer: 25, group: 1 },
    B: { read: 30, answer: 90, group: 1 },
    C: { groupAnswer: 180, group: 2 },
    D: { answer: 540, group: 1 },
    E: { answer: 25, audio: 6, group: 1 },
    F: { answer: 15, audio: 4, group: 1, ours: true },
    G: { answer: 20, audio: 30, group: 3, ours: true },
    H: { answer: 15, audio: 6, group: 1, startWithin: 6 },
    I: { think: 10, answer: 60, group: 1, startWithin: 15 },
    J: { answer: 30, audio: 32, group: 1 }
  };
}

/** Seconds a part is given: every group's stimulus plus every item's answer. */
function partSeconds(part, items) {
  const t = vpetTiming()[part];
  if (!t) return 0;
  const groups = Math.ceil(items / (t.group || 1));
  const perItem = (t.answer || 0) + (t.think || 0);
  /* Read time and audio belong to the GROUP - one passage read once, one
     recording played once - while answer time usually belongs to each item.
     Part G is where that difference shows: three questions on one passage, so
     the passage is heard once rather than three times.

     Part C is the other shape again. Its three minutes cover reading the passage
     AND answering both questions on it, so the whole allowance is the group's
     and `groupAnswer` carries it - the first draft used `answer` and gave part C
     eighteen minutes, three times what the guide allows. */
  const perGroup = (t.read || 0) + (t.audio || 0) + (t.groupAnswer || 0);
  return groups * perGroup + items * perItem;
}

function vpetSections() {
  /* How many options an mcq part shows. The guide is explicit for F - "You will
     see three possible answers" - and silent for C, which keeps the four it has
     always had. A number here rather than in the items means the suite can check
     every item against it. */
  const CHOICES = { C: 4, F: 3 };

  /* How many times an audio item plays. The guide is explicit twice - Part E
     "You will hear the sentence only once", Part J "It will be spoken once" -
     and describes no replay control anywhere else either, so F, G and H are one
     pass as well. That last part is a reading of the guide rather than a
     quotation from it; if a replay ever turns out to be allowed, this is the one
     place to say so. */
  const PLAYS = { E: 1, F: 1, G: 1, H: 1, J: 1 };

  /* "You must write at least 100 words" (Part D). The guide sets no floor for
     Part B, whose tip is qualitative - "include all the details you can" - so
     part B has none here either rather than one somebody guessed. */
  const MIN_WORDS = { D: 100 };

  const S = (part, name, skill, type, items, types, needsAudio, note) => ({
    name: 'Part ' + part + ' - ' + name, part, skill, type, items,
    choices: CHOICES[part] || null,
    plays: PLAYS[part] || null,
    minWords: MIN_WORDS[part] || null,
    seconds: partSeconds(part, items),
    /* Kept because the database column, the admin screen and the study pack all
       speak minutes. Derived, never typed: rounding is display only and the
       clock a candidate gets comes from `seconds`. */
    minutes: Math.round(partSeconds(part, items) / 60),
    types, needsAudio: !!needsAudio,
    parts: [{ label: part + '1-' + part + items, items, note }]
  });

  return [
    S('A', 'Sentence Completion', 'writing', 'Type the missing word', 10, ['gap'], false,
      'One word missing per sentence; grammar and collocation in context.'),
    S('B', 'Passage Reconstruction', 'writing', 'Read, then rewrite from memory', 3, ['essay'], false,
      'Passage shown for 30 seconds, then hidden; rebuild it in your own words in 90.'),
    S('C', 'Reading Comprehension', 'reading', 'Multiple choice', 6, ['mcq'], false,
      'Three passages, two questions each, three minutes a passage.'),
    S('D', 'E-Mail Writing', 'writing', 'Two emails', 2, ['essay'], false,
      'Reply to a prompt in a set register; nine minutes each, graded on task, tone and accuracy.'),
    S('E', 'Dictation', 'listening', 'Type what you hear', 8, ['gap'], true,
      'One sentence per item, 25 seconds to type it. Needs audio.'),
    S('F', 'Response Selection', 'listening', 'Multiple choice', 8, ['mcq'], true,
      'Hear a prompt, pick the natural reply from three. Needs audio.'),
    S('G', 'Passage Comprehension', 'listening', 'Answer out loud', 6, ['speaking'], true,
      'Two spoken passages, three questions each, answered out loud. Needs audio.'),
    S('H', 'Repeat', 'speaking', 'Say the sentence back', 10, ['speaking'], true,
      /* NOT pronunciation and fluency, whatever the published VPET description
         says: this platform marks Part H from a transcript, and every spoken
         rubric in server/rubric.js tells the model to say nothing about
         pronunciation, accent or fluency. Only an administrator sees this
         screen, and an administrator who reads it will repeat it to a class. */
      'Repeat each sentence exactly, 15 seconds each. Marked from a transcript, on how much of the '
        + 'sentence survives — not on pronunciation. Needs audio.'),
    S('I', 'Speaking Situations', 'speaking', 'Respond to a situation', 2, ['speaking'], false,
      '10 seconds to think, then up to 60 to speak in the register the situation calls for.'),
    S('J', 'Story Retellings', 'speaking', 'Retell what you heard', 3, ['speaking'], true,
      'Hear a short story once, then 30 seconds to retell it. Needs audio.')
  ];
}

const VPET_GUIDE = [
  'Ten parts, A to J, 58 items in one sitting. Every part has its own timer.',
  'Parts E, F, G, H and J play audio. Check your headphones before you start.',
  'Parts H, I and J record your voice. Speak after the beep and stay in the time shown.',
  /* This said "then a reviewer can override", and no such path exists:
     `rubric_scores.marked_by` is the string 'ai' at its one and only insert
     site, and the only marking route an administrator has re-runs the same
     model. Promising a human backstop that is not there is the worst of the
     three options — worse than saying nothing — because it is the sentence a
     candidate would rely on when a mark looks wrong.

     The second line is new. Writing and Speaking answers are sent to an
     outside marking service to be scored, and a spoken answer is sent as the
     recording itself. A candidate is entitled to know that before they speak,
     not to find it in a settings screen they cannot see. */
  'Reading and Listening are marked automatically. Writing and Speaking are marked by an AI service; '
    + 'an administrator can have a paper marked again, but no person re-reads it.',
  'To mark them, your written answers and your voice recordings are sent to an outside AI service. '
    + 'Your name, e-mail and account are not sent with them. Speaking is scored from a written '
    + 'transcript of your recording: the words and the grammar, not pronunciation or fluency.'
];

const VPET_NOTES = [
  'Item counts follow the published VPET part table and are fixed: 10-3-6-2-8-8-6-10-2-3.',
  'Timings come from the official test-taker guide, per item, and each part\'s window is the sum of them.',
  'Audio parts cannot be generated until every question in them has an MP3 attached.'
];

const VSTEP_GUIDE = [
  'Each skill is marked 0–10, rounded to 0.5. The overall mark is the mean of the four.',
  '4.0 to 5.5 is Bậc 3 (B1) · 6.0 to 8.0 is Bậc 4 (B2) · 8.5 and above is Bậc 5 (C1).',
  'The Listening audio plays once only, so skim the questions before you start.'
];

const VSTEP_NOTES = [
  'The four skills are sat back to back, about 180 minutes in all.',
  'Reading gets harder across the four passages - do not spend the time on the first.',
  'Writing Task 2 carries more weight than Task 1 in the Writing mark.'
];

const FORMATS = [
  /* ------------------------- VEPT ------------------------- */
  {
    id: 'vept-full', familyId: 'vept', kind: 'full',
    name: 'VEPT four skills (VSTEP.3-5 format)',
    levels: ['B1', 'B2', 'C1'],
    scoring: 'On the CEFR A1-C2 scale, converted per skill',
    guide: VSTEP_GUIDE, notes: VSTEP_NOTES, sections: vstepSections()
  },

  /* ------------------------- VPET -------------------------
     The official VPET blueprint: ten lettered parts, A to J, 58 items.
     Item counts come straight from the published part table and must not be
     changed. Minutes are platform defaults an admin can edit per test - the
     part table does not publish timings.

     Each lettered part is its own timed section because every part has a
     different task, its own instructions and its own answer mode. Audio parts
     (E, F, G, H, J) need an MP3 attached to each question. */
  {
    id: 'vpet-full', familyId: 'vpet', kind: 'full',
    name: 'VPET full test (parts A-J, 58 items)',
    levels: ['A1', 'A2', 'B1', 'B2', 'C1', 'C2'],
    scoring: 'CEFR A1-C2 per skill; Speaking parts H, I and J are AI scored',
    guide: VPET_GUIDE, notes: VPET_NOTES, sections: vpetSections()
  },

  /* ------------------------ IELTS ------------------------- */
  {
    id: 'ielts-academic-full', familyId: 'ielts', kind: 'full',
    name: 'IELTS Academic - all four skills',
    levels: ['B1', 'B2', 'C1', 'C2'],
    scoring: 'Band 0-9, rounded to 0.5',
    guide: [
      'The Listening audio plays once only. The computer version gives no separate transfer time.',
      'Writing Task 2 counts double Task 1 towards the Writing band.',
      'The overall band is the mean of the four skills: a .25 rounds up to .5, a .75 rounds up to the whole.'
    ],
    notes: [
      'Listening and Reading are 40 items each, converted from raw score to band by a table of their own.',
      'Academic Reading is harder than General Training at the same raw score - the conversion tables differ.',
      'Nothing is deducted for a wrong answer, so never leave one blank.'
    ],
    sections: [
      {
        name: 'Listening', skill: 'listening', type: 'Multiple choice + gap fill', items: 40, minutes: 30,
        types: ['mcq', 'gap'],
        parts: [
          { label: 'Part 1', items: 10, note: 'An everyday conversation between two people - usually filling in a form' },
          { label: 'Part 2', items: 10, note: 'A monologue in an everyday situation' },
          { label: 'Part 3', items: 10, note: 'An academic discussion, up to four speakers' },
          { label: 'Part 4', items: 10, note: 'An academic lecture - the hardest, with no break in it' }
        ]
      },
      {
        name: 'Reading', skill: 'reading', type: 'Academic reading', items: 40, minutes: 60,
        types: ['mcq', 'gap'],
        parts: [
          { label: 'Passage 1', items: 13, note: 'The easiest; aim to finish it in 17 minutes' },
          { label: 'Passage 2', items: 13, note: 'Middling difficulty' },
          { label: 'Passage 3', items: 14, note: 'Abstract argument, the hardest' }
        ]
      },
      {
        name: 'Writing', skill: 'writing', type: 'Task 1 + Task 2', items: 2, minutes: 60,
        types: ['essay'],
        parts: [
          { label: 'Task 1', items: 1, note: 'Describe a chart or a process, at least 150 words, ~20 minutes' },
          { label: 'Task 2', items: 1, note: 'An opinion essay, at least 250 words, ~40 minutes' }
        ]
      },
      {
        name: 'Speaking', skill: 'speaking', type: 'Three parts, recorded', items: 3, minutes: 14,
        types: ['speaking'],
        parts: [
          { label: 'Part 1', items: 1, note: 'Questions about yourself, 4–5 minutes' },
          { label: 'Part 2', items: 1, note: 'Two minutes from a cue card, with one minute to prepare' },
          { label: 'Part 3', items: 1, note: 'A deeper discussion of the Part 2 topic, 4–5 minutes' }
        ]
      }
    ]
  },
  {
    id: 'ielts-listening-module', familyId: 'ielts', kind: 'module',
    name: 'IELTS - Listening practice on its own',
    levels: ['A2', 'B1', 'B2', 'C1'],
    scoring: 'Band 0-9 for Listening alone',
    guide: ['One skill on its own; no overall mark is calculated.'],
    notes: ['For focused practice; the paper has the full 40 items of the real thing.'],
    sections: [{
      name: 'Listening', skill: 'listening', type: 'Multiple choice + gap fill', items: 40, minutes: 30,
      types: ['mcq', 'gap'],
      parts: [
        { label: 'Part 1', items: 10, note: 'An everyday conversation' },
        { label: 'Part 2', items: 10, note: 'An everyday monologue' },
        { label: 'Part 3', items: 10, note: 'An academic discussion' },
        { label: 'Part 4', items: 10, note: 'An academic lecture' }
      ]
    }]
  },
  {
    id: 'ielts-reading-module', familyId: 'ielts', kind: 'module',
    name: 'IELTS Academic - Reading practice on its own',
    levels: ['A2', 'B1', 'B2', 'C1'],
    scoring: 'Band 0-9 for Reading alone',
    guide: ['One skill on its own; no overall mark is calculated.'],
    notes: ['Allow 20 minutes per passage.'],
    sections: [{
      name: 'Reading', skill: 'reading', type: 'Academic reading', items: 40, minutes: 60,
      types: ['mcq', 'gap'],
      parts: [
        { label: 'Passage 1', items: 13, note: 'The easiest' },
        { label: 'Passage 2', items: 13, note: 'Middling' },
        { label: 'Passage 3', items: 14, note: 'The hardest' }
      ]
    }]
  },

  /* ------------------------ TOEIC ------------------------- */
  {
    id: 'toeic-lr-full', familyId: 'toeic', kind: 'full',
    name: 'TOEIC Listening & Reading - the full 200-item paper',
    levels: ['A2', 'B1', 'B2', 'C1'],
    scoring: 'Scale 10-990 (5-495 per section)',
    guide: [
      'Nothing is deducted for a wrong answer - never leave one blank; guess when time runs short.',
      'Listening runs for 45 minutes without a break and cannot be rewound.',
      'Reading shares 75 minutes across Parts 5, 6 and 7 - pace it yourself.'
    ],
    notes: [
      'Part 7 is 54 of the 100 Reading items, so move fast through Parts 5 and 6 to buy time for it.',
      'Raw scores convert through an equating table specific to each paper; the platform table is a reference.',
      'A full paper needs 200 items in the bank - check coverage before generating one.'
    ],
    sections: [
      {
        name: 'Listening', skill: 'listening', type: 'Parts 1-4, multiple choice', items: 100, minutes: 45,
        types: ['mcq'],
        parts: [
          { label: 'Part 1', items: 6, note: 'Describe a photograph, four options' },
          { label: 'Part 2', items: 25, note: 'Question and response, three options, not printed on the paper' },
          { label: 'Part 3', items: 39, note: '13 conversations × 3 items' },
          { label: 'Part 4', items: 30, note: '10 short talks × 3 items' }
        ]
      },
      {
        name: 'Reading', skill: 'reading', type: 'Parts 5-7, multiple choice', items: 100, minutes: 75,
        types: ['mcq'],
        parts: [
          { label: 'Part 5', items: 30, note: 'Incomplete sentences - grammar and vocabulary' },
          { label: 'Part 6', items: 16, note: '4 texts × 4 gaps, one of which takes a whole sentence' },
          { label: 'Part 7', items: 54, note: '29 single-passage items + 25 double and triple passage items' }
        ]
      }
    ]
  },
  {
    id: 'toeic-lr-mini', familyId: 'toeic', kind: 'mini',
    name: 'TOEIC L&R - a 100-item short cut for quick practice',
    levels: ['A2', 'B1', 'B2'],
    scoring: 'A reference scale, estimated from half a paper',
    guide: ['Half the paper, for practice in about 60 minutes.'],
    notes: [
      'Keeps the mix of item types the real paper has, at half the count.',
      'The mark is indicative only, because the real conversion table assumes all 200 items.'
    ],
    sections: [
      {
        name: 'Listening', skill: 'listening', type: 'Parts 1-4, shortened', items: 50, minutes: 23,
        types: ['mcq'],
        parts: [
          { label: 'Part 1', items: 3, note: 'Describe a photograph' },
          { label: 'Part 2', items: 13, note: 'Question and response' },
          { label: 'Part 3', items: 19, note: 'Conversations' },
          { label: 'Part 4', items: 15, note: 'Short talks' }
        ]
      },
      {
        name: 'Reading', skill: 'reading', type: 'Parts 5-7, shortened', items: 50, minutes: 38,
        types: ['mcq'],
        parts: [
          { label: 'Part 5', items: 15, note: 'Incomplete sentences' },
          { label: 'Part 6', items: 8, note: 'Text completion' },
          { label: 'Part 7', items: 27, note: 'Reading comprehension' }
        ]
      }
    ]
  },
  {
    id: 'toeic-sw', familyId: 'toeic', kind: 'full',
    name: 'TOEIC Speaking & Writing',
    levels: ['B1', 'B2', 'C1'],
    scoring: '0-200 for each paper; Speaking has 8 levels, Writing 9',
    guide: [
      'Speaking is recorded live, and each item has its own preparation time.',
      'Writing is typed, with no spell checker.'
    ],
    notes: ['Marked against a rubric per item type, not right or wrong.'],
    sections: [
      {
        name: 'Speaking', skill: 'speaking', type: '11 items, recorded', items: 11, minutes: 20,
        types: ['speaking'],
        parts: [
          { label: 'Read aloud', items: 2, note: 'Read a text aloud' },
          { label: 'Describe a picture', items: 1, note: 'Describe a picture' },
          { label: 'Respond to questions', items: 3, note: 'Respond to questions' },
          { label: 'Respond using given information', items: 3, note: 'Working from a schedule or programme' },
          { label: 'Propose a solution', items: 1, note: 'Propose a solution' },
          { label: 'Express an opinion', items: 1, note: 'Express an opinion' }
        ]
      },
      {
        name: 'Writing', skill: 'writing', type: '8 items, typed', items: 8, minutes: 60,
        types: ['essay'],
        parts: [
          { label: 'Write a sentence from a picture', items: 5, note: 'Using exactly the two words given' },
          { label: 'Respond to an email', items: 2, note: '10 minutes each' },
          { label: 'Opinion essay', items: 1, note: '~300 words, 30 minutes' }
        ]
      }
    ]
  },

  /* ------------------------- PTE -------------------------- */
  {
    id: 'pte-academic-full', familyId: 'pte', kind: 'full',
    name: 'PTE Academic - the whole paper, machine marked',
    levels: ['B1', 'B2', 'C1'],
    scoring: 'Scale 10-90, marked entirely by machine',
    guide: [
      'Speak up, clearly and evenly - the marker rewards fluency over a native accent.',
      'Some multiple-answer items DO deduct marks for a wrong pick, unlike TOEIC.',
      'You cannot return to a submitted item, so think before pressing Next.'
    ],
    notes: [
      'Integrated marking: one item can contribute to several skills at once.',
      'Many item types award partial credit rather than a binary right or wrong.',
      'The report adds enabling skills: grammar, fluency, pronunciation, spelling, vocabulary and coherence.'
    ],
    sections: [
      {
        name: 'Speaking & Writing', skill: 'speaking', type: '7 task types, recorded + typed', items: 28, minutes: 62,
        types: ['speaking', 'essay'],
        parts: [
          { label: 'Read Aloud', items: 6, note: 'Counts towards both Reading and Speaking' },
          { label: 'Repeat Sentence', items: 10, note: 'Counts towards both Listening and Speaking' },
          { label: 'Describe Image', items: 3, note: 'Counts towards Speaking only' },
          { label: 'Re-tell Lecture', items: 2, note: 'Counts towards both Listening and Speaking' },
          { label: 'Answer Short Question', items: 5, note: 'Counts towards both Listening and Speaking' },
          { label: 'Summarize Written Text', items: 1, note: 'Counts towards both Reading and Writing' },
          { label: 'Essay', items: 1, note: '200–300 words, 20 minutes' }
        ]
      },
      {
        name: 'Reading', skill: 'reading', type: '5 task types', items: 15, minutes: 30,
        types: ['mcq', 'gap'],
        parts: [
          { label: 'Fill in the Blanks', items: 6, note: 'Drag and drop, and choose from a list' },
          { label: 'Multiple Choice', items: 4, note: 'The multiple-answer variant deducts for a wrong pick' },
          { label: 'Re-order Paragraphs', items: 2, note: 'Marked on correctly adjacent pairs' },
          { label: 'Reading Comprehension', items: 3, note: 'A long passage, one answer' }
        ]
      },
      {
        name: 'Listening', skill: 'listening', type: '8 task types', items: 17, minutes: 35,
        types: ['mcq', 'gap', 'essay'],
        parts: [
          { label: 'Summarize Spoken Text', items: 2, note: '50–70 words; counts towards both Listening and Writing' },
          { label: 'Multiple Choice', items: 3, note: 'One variant deducts for a wrong pick' },
          { label: 'Fill in the Blanks', items: 2, note: 'Type the words you hear' },
          { label: 'Highlight Correct Summary', items: 2, note: 'Pick the summary that matches' },
          { label: 'Select Missing Word', items: 2, note: 'Work out the final word, which is cut off' },
          { label: 'Highlight Incorrect Words', items: 3, note: 'Deducts for a wrong pick' },
          { label: 'Write from Dictation', items: 3, note: 'Marked on the number of correct words' }
        ]
      }
    ]
  },

  /* -------------------------- OTE ------------------------- */
  {
    id: 'ote-listening', familyId: 'ote', kind: 'module',
    name: 'Oxford Test of English - Listening module',
    levels: ['A2', 'B1', 'B2'],
    scoring: 'CEFR (below A2 / A2 / B1 / B2) with a score of 51-140',
    guide: ['Taken module by module; there is no requirement to sit all four skills.'],
    notes: [
      'The real test is adaptive: how hard an item is depends on the one before it.',
      'The platform generates fixed papers for now; adaptive marking is on the roadmap.'
    ],
    sections: [{
      name: 'Listening', skill: 'listening', type: 'Adaptive, four parts', items: 20, minutes: 30,
      types: ['mcq'],
      parts: [
        { label: 'Part 1', items: 6, note: 'Short, unconnected extracts' },
        { label: 'Part 2', items: 4, note: 'A monologue; fill in the information' },
        { label: 'Part 3', items: 6, note: 'Match each speaker to an idea' },
        { label: 'Part 4', items: 4, note: 'A long conversation' }
      ]
    }]
  },
  {
    id: 'ote-reading', familyId: 'ote', kind: 'module',
    name: 'Oxford Test of English - Reading module',
    levels: ['A2', 'B1', 'B2'],
    scoring: 'CEFR (below A2 / A2 / B1 / B2) with a score of 51-140',
    guide: ['Taken module by module; there is no requirement to sit all four skills.'],
    notes: ['The real test adapts to each answer as it is given.'],
    sections: [{
      name: 'Reading', skill: 'reading', type: 'Adaptive, four parts', items: 22, minutes: 35,
      types: ['mcq', 'gap'],
      parts: [
        { label: 'Part 1', items: 6, note: 'Short texts; pick the right idea' },
        { label: 'Part 2', items: 6, note: 'Match each text to a heading' },
        { label: 'Part 3', items: 6, note: 'Detailed comprehension' },
        { label: 'Part 4', items: 4, note: 'Fill the gaps in a text' }
      ]
    }]
  }
];

/** The total item count of a format */
function totalItems(f) {
  return f.sections.reduce((s, x) => s + x.items, 0);
}

/** The total running time of a format */
function totalMinutes(f) {
  return Math.round(totalSeconds(f) / 60);
}

/** The real total: seconds, because a 25-second item cannot be said in minutes. */
function totalSeconds(f) {
  return f.sections.reduce((s, x) => s + (x.seconds != null ? x.seconds : x.minutes * 60), 0);
}

/** Consistency check: the parts' item counts must add up to the section's */
function inconsistencies() {
  const out = [];
  for (const f of FORMATS) {
    for (const s of f.sections) {
      if (!Array.isArray(s.parts) || !s.parts.length) continue;
      const sum = s.parts.reduce((a, p) => a + p.items, 0);
      if (sum !== s.items) {
        out.push(`${f.id} · ${s.name}: parts total ${sum} ≠ items ${s.items}`);
      }
    }
  }
  return out;
}

/** The lettered parts a family's items can be tagged with, in blueprint order.
    Empty for a family whose format has no part table, which is every family
    except VPET today. The API validates against this rather than a hardcoded
    A-J list, so the blueprint stays the single source of truth. */
function partsOf(familyId) {
  const out = [];
  for (const f of FORMATS) {
    if (f.familyId !== familyId) continue;
    for (const s of f.sections) if (s.part && !out.includes(s.part)) out.push(s.part);
  }
  return out;
}

/** The blueprint section that owns a part letter - used to describe a part in
    the interface without repeating its name in a second place. */
function sectionOfPart(familyId, part) {
  for (const f of FORMATS) {
    if (f.familyId !== familyId) continue;
    const s = f.sections.find(x => x.part === part);
    if (s) return s;
  }
  return null;
}

module.exports = { FORMATS, totalItems, totalMinutes, totalSeconds, inconsistencies,
  partsOf, sectionOfPart, vpetTiming, partSeconds };
