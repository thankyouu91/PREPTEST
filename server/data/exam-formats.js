/**
 * The standard paper formats for each exam — the platform's "subject knowledge".
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
 *   sections[]  the SEPARATELY TIMED BLOCKS — this is the blueprint sent to
 *               POST /api/admin/tests/generate
 *     name, skill, type (a label), items, minutes, types[] (which item types to draw)
 *     parts[]   what is inside the block; for display and to explain the design
 *   notes[]     notes on the exam itself: why it splits this way, and the usual traps
 *
 * Sources: each examining body's published documentation; VEPT and VPET follow the
 * VSTEP.3-5 format (Circular 01/2014/TT-BGDĐT). See docs/SCORING.md.
 */
'use strict';

/* The VSTEP format, shared by VEPT and VPET — two domestic certificates on one framework */
function vstepSections() {
  return [
    {
      name: 'Listening', skill: 'listening', type: 'Multiple choice', items: 35, minutes: 40,
      types: ['mcq'],
      parts: [
        { label: 'Part 1', items: 8, note: 'Announcements and short instructions — played once' },
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
 * VPET blueprint — ten lettered parts, A to J, 55 items in total.
 *
 * Item counts are fixed by the published VPET part table:
 *   A Sentence Completion 10 · B Passage Reconstruction 3
 *   C Reading Comprehension 3 · D E-Mail Writing 2
 *   E Dictation 8 · F Response Selection 8 · G Passage Comprehension 6
 *   H Repeat 10 · I Speaking Situations 2 · J Story Retellings 3
 *
 * Skill and item type per part are the platform's mapping onto its own item
 * bank (mcq | gap | essay | speaking); minutes are editable defaults, since
 * the part table publishes counts only.
 * ------------------------------------------------------------------ */
/**
 * The ten VPET parts, as the owner's specification describes them.
 *
 * Source: `VPET_test.xlsx`, supplied 2026-10-08. Every field below that names a
 * duration, a count, an answer mode or a line of on-screen text comes from that
 * sheet. Where this file and the sheet disagree, the sheet is right.
 *
 * ---------------------------------------------------------------------------
 * WHAT THE SHEET CHANGED
 *
 *   C  3 items -> 6. Three passages, two multiple-choice questions each, four
 *      options per question, three minutes per passage. The old shape was one
 *      question per passage.
 *   G  multiple choice -> spoken short answer. The sheet is explicit: "Nói vào
 *      Mic", seven seconds, "a few words or a very short sentence", and a beep
 *      the moment the question finishes. It was built as a listening MCQ, which
 *      tests the same passage through a different skill.
 *   I  text-only -> text and audio together. The sheet's stimulus column says
 *      "Vừa hiện chữ vừa phát âm (Cả hai)".
 *
 * ---------------------------------------------------------------------------
 * ONE CONTRADICTION, RESOLVED FROM THE SHEET ITSELF
 *
 * Part I is given two timings. The instruction-page column says ten seconds to
 * think and sixty to answer; the on-screen line says thirty and forty. The beep
 * column settles it — "Có tiếng bíp sau khi kết thúc 30 giây suy nghĩ" — so the
 * thinking window is thirty seconds, and the on-screen line is the one that
 * matches. The instruction-page text is corrected to agree rather than left to
 * contradict the clock a candidate is actually given.
 *
 * ---------------------------------------------------------------------------
 * `replays` — HOW MANY TIMES AN AUDIO ITEM MAY BE PLAYED AGAIN
 *
 * Declared per part because it is part of the exam design, not a platform
 * setting. `server/exam-api.js` used a flat default of 2 for every audio part,
 * with a comment saying the owner would set the real numbers per part — the
 * hook that would have let them was never built, so every part silently ran at
 * 2, and one of them could not fit its clock at that number.
 *
 *   G  0  The sheet gives seven seconds to answer after a beep that lands the
 *          instant the question ends. There is no replay in that flow.
 *   E  1  Play twice. Dictation is the one part where a second hearing is the
 *          task rather than a concession, but a third does not fit: eight
 *          sentences also have to be typed.
 *   F  0  Play once. This one was set to 2 on the reasoning that the lines are
 *          short — which was wrong, and the audit said so: part F speaks the
 *          prompt AND all three responses, about sixteen seconds an item, so
 *          three plays is 378 seconds of listening inside a 240-second part.
 *          184% of the clock. The sheet describes no replay control on this
 *          screen either; it shows three letters and nothing else.
 *   H  0  Repeat what you heard. A replay would be answering the question.
 *   J  0  The item says "each story will be spoken once" and means it.
 *
 * Changing a number here changes what a candidate is allowed to do, so it is
 * the owner's to set. These are the values the clock permits; a part whose
 * `replays` and `minutes` disagree is caught by `npm run soat-de`.
 *
 * ---------------------------------------------------------------------------
 * THE FIELDS THE RUNNER READS
 *
 *   seconds     the per-item countdown, in seconds. The sheet puts a clock on
 *               every item; the old build clocked whole parts instead, which is
 *               a different exam.
 *   answer      'type' | 'click' | 'speak' — the sheet's "Cách trả lời".
 *   stimulus    'text' | 'audio' | 'both' — the sheet's "Đề bài chính thức".
 *   pages       1 or 2. Two means the stimulus and the answer are on separate
 *               screens and the candidate cannot see one while giving the other
 *               — the whole point of B, E, G, H, I and J.
 *   beep        when the tone sounds, in the sheet's own words.
 *   say         the line spoken and shown at the top of every item page.
 *   brief       the instruction page read out before the part begins.
 */
function vpetSections() {
  return [
    {
      name: 'Part A - Sentence Completion', part: 'A', skill: 'writing', type: 'Type the missing word',
      items: 10, minutes: 10, types: ['gap'],
      parts: [{ label: 'A1-A10', items: 10, note: 'One word missing per sentence; grammar and collocation in context.' }],
      seconds: 25, answer: 'type', stimulus: 'text', pages: 1,
      beep: 'A tone before each sentence.',
      say: 'Part A: Sentence Completion. Please type one word that best completes the sentence. You will have 25 seconds for each sentence.',
      brief: 'Please type one word that best fits the meaning of the sentence. Type only one word. You will have 25 seconds for each sentence. Click "Next" when you are finished.',
      example: true
    },
    {
      name: 'Part B - Passage Reconstruction', part: 'B', skill: 'writing', type: 'Read, then rewrite from memory',
      items: 3, minutes: 6, types: ['essay'],
      parts: [{ label: 'B1-B3', items: 3, note: 'Passage shown for 30 seconds, then hidden; rebuild it in your own words in 90 seconds.' }],
      /* 30 s to read, then the passage goes and 90 s to rewrite. `seconds` is
         the answering window, which is what the countdown on screen shows;
         `readSeconds` is the first page. */
      seconds: 90, readSeconds: 30, answer: 'type', stimulus: 'text', pages: 2,
      beep: 'A tone before each passage.',
      say: 'Part B: Passage Reconstruction. You will have 30 seconds to read a short passage. After 30 seconds, the passage will disappear and you will have 90 seconds to reconstruct the passage by typing it into the box.',
      brief: 'You will have 30 seconds to read a paragraph. After 30 seconds, the paragraph will disappear from the screen. Then, you will have 90 seconds to reconstruct the paragraph. Show that you understood the passage by rewriting it in your own words. Your answer will be scored for clear and accurate content, not word-for-word memorization. After 90 seconds, your work will be saved automatically.',
      example: true
    },
    {
      /* Three passages, two questions each. The sheet's layout column is
         explicit: passage on the left, "Hai câu hỏi. 4 lựa chọn cho mỗi câu" on
         the right, both on one screen, three minutes for the pair. So the
         countdown belongs to the passage, not to the single question. */
      name: 'Part C - Reading Comprehension', part: 'C', skill: 'reading', type: 'Multiple choice',
      items: 6, minutes: 9, types: ['mcq'],
      parts: [{ label: 'C1-C6', items: 6, note: 'Three passages, two questions each, four options per question.' }],
      seconds: 180, perStimulus: 2, answer: 'click', stimulus: 'text', pages: 1, split: true,
      optionCount: 4,
      beep: 'A tone before each passage.',
      say: 'Part C: Reading Comprehension. Read the passage and answer the multiple-choice question. Choose the best answer.',
      brief: 'Read a passage and two questions. Select the best answer to each question. You will have 3 minutes. If you finish early, click "Next".'
    },
    {
      name: 'Part D - E-Mail Writing', part: 'D', skill: 'writing', type: 'Two emails',
      items: 2, minutes: 18, types: ['essay'],
      parts: [{ label: 'D1-D2', items: 2, note: 'Reply to a situation in at least 100 words, nine minutes each.' }],
      seconds: 540, minWords: 100, answer: 'type', stimulus: 'text', pages: 1, split: true,
      beep: 'A tone before each situation.',
      say: 'Part D: E-mail Writing. Read the situation and write an e-mail in response. You should write at least 100 words. You have 9 minutes.',
      brief: 'Read a description of a situation and write an email addressing the issues described in the situation. You will have 9 minutes. You must write at least 100 words. You will be able to see how much time is left and how many words you have written. Write in complete sentences. If you do not finish in 9 minutes, everything you have written will be saved automatically and the next item will begin.'
    },
    {
      name: 'Part E - Dictation', part: 'E', skill: 'listening', type: 'Type what you hear',
      items: 8, minutes: 6, types: ['gap'], needsAudio: true, replays: 1,
      parts: [{ label: 'E1-E8', items: 8, note: 'One sentence per item. Listen, then type it exactly. Needs audio.' }],
      seconds: 25, answer: 'type', stimulus: 'audio', pages: 2,
      beep: 'A tone before each sentence.',
      say: 'Part E: Dictation. You will hear a sentence. Please type the sentence exactly as you hear it. You will have 25 seconds.',
      brief: 'Please type each sentence exactly as you hear it. You will have 25 seconds for each sentence. Pay attention to spelling and punctuation. Click "Next" when you are finished. After 25 seconds, your work will be saved automatically.',
      example: true
    },
    {
      /* Nothing is written on screen but "Select the correct response" and three
         lettered buttons — the prompt and all three options are spoken. That is
         why `stimulus` is audio and the options carry no text. */
      name: 'Part F - Response Selection', part: 'F', skill: 'listening', type: 'Multiple choice',
      items: 8, minutes: 4, types: ['mcq'], needsAudio: true, replays: 0,
      parts: [{ label: 'F1-F8', items: 8, note: 'Hear a prompt and three spoken replies; choose A, B or C. Needs audio.' }],
      seconds: 8, answer: 'click', stimulus: 'audio', pages: 1, spokenOptions: true,
      /* Three, not four. The sheet's layout column says the screen carries
         "các nút chọn A, B, C" and the brief says "three possible responses". */
      optionCount: 3,
      beep: 'A tone before each item.',
      say: 'Part F: Response Selection. You will hear a question or statement, followed by three possible responses. Choose the best response.',
      brief: 'You will hear a sentence and then three possible responses. Click the letter A, B or C to choose the correct response. You will have 8 seconds to answer.',
      example: true
    },
    {
      /* Two stories, three questions each, answered aloud in a few words. The
         sheet says "Nói vào Mic" and seven seconds — not multiple choice, which
         is how this part had been built. */
      name: 'Part G - Passage Comprehension', part: 'G', skill: 'speaking', type: 'Say a short answer',
      items: 6, minutes: 6, types: ['speaking'], needsAudio: true, replays: 0,
      parts: [{ label: 'G1-G6', items: 6, note: 'Two spoken passages, three questions each. Answer aloud in a few words. Needs audio.' }],
      seconds: 7, perStimulus: 3, answer: 'speak', stimulus: 'audio', pages: 2,
      beep: 'A tone the moment the question ends.',
      say: 'Part G: Passage Comprehension. You will hear a short conversation or monologue, followed by a question. After the beep, please say your answer. You will have 7 seconds.',
      brief: 'You will hear a story, followed by three questions. When you hear a beep, say your answer. Your answer should be a few words or a very short sentence.',
      example: true
    },
    {
      name: 'Part H - Repeat', part: 'H', skill: 'speaking', type: 'Say the sentence back',
      items: 10, minutes: 4, types: ['speaking'], needsAudio: true, replays: 0,
      parts: [{ label: 'H1-H10', items: 10, note: 'Repeat each sentence exactly. Scores pronunciation and fluency. Needs audio.' }],
      seconds: 15, answer: 'speak', stimulus: 'audio', pages: 2,
      beep: 'A tone the moment the sentence ends.',
      say: 'Part H: Repeat. You will hear some sentences. Please repeat each sentence exactly as you hear it. Speak after the beep.',
      brief: 'Please repeat each sentence that you hear.',
      example: true
    },
    {
      /* Thirty seconds to think, forty to speak. The instruction page in the
         sheet says ten and sixty; the beep column and the on-screen line both
         say thirty, so thirty is what the clock does and the brief is written to
         match. See the note above this function. */
      name: 'Part I - Speaking Situations', part: 'I', skill: 'speaking', type: 'Respond to a situation',
      items: 2, minutes: 4, types: ['speaking'], needsAudio: true, replays: 0,
      parts: [{ label: 'I1-I2', items: 2, note: 'Read and hear a business situation, think for 30 seconds, then speak for 40.' }],
      seconds: 40, thinkSeconds: 30, answer: 'speak', stimulus: 'both', pages: 2,
      beep: 'A tone after the 30 seconds of thinking time.',
      say: 'Part I: Speaking Situations. You will read and hear a business situation. You will have 30 seconds to think, and 40 seconds to speak your response after the beep.',
      brief: 'You will hear and read a description of a situation. You will have 30 seconds to think about your answer. Then you will hear a beep. You will have 40 seconds to answer the question. Please answer as completely as you can.'
    },
    {
      name: 'Part J - Story Retellings', part: 'J', skill: 'speaking', type: 'Retell what you heard',
      items: 3, minutes: 5, types: ['speaking'], needsAudio: true, replays: 0,
      parts: [{ label: 'J1-J3', items: 3, note: 'Hear a short story once, then retell it in your own words in 30 seconds. Needs audio.' }],
      seconds: 30, answer: 'speak', stimulus: 'audio', pages: 2,
      beep: 'A tone the moment the story ends, and another at the end of the 30 seconds.',
      say: 'Part J: Story Retellings. You will hear a short story. You will have 30 seconds to retell the story in your own words. Speak after the beep.',
      brief: 'You will hear three brief stories. Each story will be spoken once, followed by a beep. When you hear the beep, you will have 30 seconds to retell the story in English. Try to retell as much of the story as you can, including the situation, characters, actions, and ending. You will hear another beep at the end of 30 seconds.'
    }
  ];
}

const VPET_GUIDE = [
  'Ten parts, A to J, 58 items in one sitting. Every item has its own timer.',
  'Parts E, F, G, H, I and J play audio. Check your headphones before you start.',
  'Parts G, H, I and J record your voice. Speak after the beep and stay in the time shown.',
  'Reading and Listening are marked automatically; Writing and Speaking are AI scored, then a reviewer can override.'
];

const VPET_NOTES = [
  'Item counts follow the published VPET part table and are fixed: 10-3-3-2-8-8-6-10-2-3.',
  'Minutes shown are platform defaults; an admin can change them on each test without touching the blueprint.',
  'Audio parts cannot be generated until every question in them has an MP3 attached.'
];

const VSTEP_GUIDE = [
  'Each skill is marked 0–10, rounded to 0.5. The overall mark is the mean of the four.',
  '4.0 to 5.5 is Bậc 3 (B1) · 6.0 to 8.0 is Bậc 4 (B2) · 8.5 and above is Bậc 5 (C1).',
  'The Listening audio plays once only, so skim the questions before you start.'
];

const VSTEP_NOTES = [
  'The four skills are sat back to back, about 180 minutes in all.',
  'Reading gets harder across the four passages — do not spend the time on the first.',
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
     The official VPET blueprint: ten lettered parts, A to J, 55 items.
     Item counts come straight from the published part table and must not be
     changed. Minutes are platform defaults an admin can edit per test — the
     part table does not publish timings.

     Each lettered part is its own timed section because every part has a
     different task, its own instructions and its own answer mode. Audio parts
     (E, F, G, H, J) need an MP3 attached to each question. */
  {
    id: 'vpet-full', familyId: 'vpet', kind: 'full',
    name: 'VPET full test (parts A-J, 55 items)',
    /* Sat at one of two levels, not at a CEFR band — see VPET_LEVELS below.
       The bands each level reports are a property of the level, not of the
       format, which is why they are not listed here. */
    levels: ['L1', 'L2'],
    scoring: 'CEFR A1-C2 per skill; Speaking parts H, I and J are AI scored',
    guide: VPET_GUIDE, notes: VPET_NOTES, sections: vpetSections()
  },

  /* ------------------------ IELTS ------------------------- */
  {
    id: 'ielts-academic-full', familyId: 'ielts', kind: 'full',
    name: 'IELTS Academic — all four skills',
    levels: ['B1', 'B2', 'C1', 'C2'],
    scoring: 'Band 0-9, rounded to 0.5',
    guide: [
      'The Listening audio plays once only. The computer version gives no separate transfer time.',
      'Writing Task 2 counts double Task 1 towards the Writing band.',
      'The overall band is the mean of the four skills: a .25 rounds up to .5, a .75 rounds up to the whole.'
    ],
    notes: [
      'Listening and Reading are 40 items each, converted from raw score to band by a table of their own.',
      'Academic Reading is harder than General Training at the same raw score — the conversion tables differ.',
      'Nothing is deducted for a wrong answer, so never leave one blank.'
    ],
    sections: [
      {
        name: 'Listening', skill: 'listening', type: 'Multiple choice + gap fill', items: 40, minutes: 30,
        types: ['mcq', 'gap'],
        parts: [
          { label: 'Part 1', items: 10, note: 'An everyday conversation between two people — usually filling in a form' },
          { label: 'Part 2', items: 10, note: 'A monologue in an everyday situation' },
          { label: 'Part 3', items: 10, note: 'An academic discussion, up to four speakers' },
          { label: 'Part 4', items: 10, note: 'An academic lecture — the hardest, with no break in it' }
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
    name: 'IELTS — Listening practice on its own',
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
    name: 'IELTS Academic — Reading practice on its own',
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
    name: 'TOEIC Listening & Reading — the full 200-item paper',
    levels: ['A2', 'B1', 'B2', 'C1'],
    scoring: 'Scale 10-990 (5-495 per section)',
    guide: [
      'Nothing is deducted for a wrong answer — never leave one blank; guess when time runs short.',
      'Listening runs for 45 minutes without a break and cannot be rewound.',
      'Reading shares 75 minutes across Parts 5, 6 and 7 — pace it yourself.'
    ],
    notes: [
      'Part 7 is 54 of the 100 Reading items, so move fast through Parts 5 and 6 to buy time for it.',
      'Raw scores convert through an equating table specific to each paper; the platform table is a reference.',
      'A full paper needs 200 items in the bank — check coverage before generating one.'
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
          { label: 'Part 5', items: 30, note: 'Incomplete sentences — grammar and vocabulary' },
          { label: 'Part 6', items: 16, note: '4 texts × 4 gaps, one of which takes a whole sentence' },
          { label: 'Part 7', items: 54, note: '29 single-passage items + 25 double and triple passage items' }
        ]
      }
    ]
  },
  {
    id: 'toeic-lr-mini', familyId: 'toeic', kind: 'mini',
    name: 'TOEIC L&R — a 100-item short cut for quick practice',
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
    name: 'PTE Academic — the whole paper, machine marked',
    levels: ['B1', 'B2', 'C1'],
    scoring: 'Scale 10-90, marked entirely by machine',
    guide: [
      'Speak up, clearly and evenly — the marker rewards fluency over a native accent.',
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
    name: 'Oxford Test of English — Listening module',
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
    name: 'Oxford Test of English — Reading module',
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
  return f.sections.reduce((s, x) => s + x.minutes, 0);
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
/* ==========================================================================
 * The two VPET levels
 *
 * VPET is not sat at a CEFR band. It is sat at one of two levels, and each
 * level measures a range of bands (owner, 2026-08-19):
 *
 *   Level 1   A1 – B1+     GSE 10–58
 *   Level 2   B2 – C2      GSE 59–90
 *
 * ---------------------------------------------------------------------------
 * WHY THIS IS DATA AND NOT A LABEL
 *
 * The level decides which items a paper may contain, and therefore what a
 * result from it can honestly claim. A Level 1 form holds nothing hard enough
 * to tell B2 from C1, so a C1 result off a Level 1 paper is a number with no
 * evidence under it. Keeping the accepted bands here, next to the part table,
 * is what lets the generator refuse to build such a paper in the first place.
 *
 * ---------------------------------------------------------------------------
 * THE RANGES ARE CONTIGUOUS, AND THAT IS THE CORRECTION
 *
 * docs/VOICE.md §1.7 previously ran Level 1 to 50 and started Level 2 at 59,
 * leaving B1+ (51–58) in neither — the document called it a gap that "belongs
 * to neither level cleanly" and gave both levels a way to report it vaguely.
 * B1+ belongs to Level 1. A candidate finishing at the top of Level 1 now gets
 * a band rather than a hedge, and every point on the 10–90 scale belongs to
 * exactly one level.
 *
 * `below A1` (10–21) sits inside Level 1's reporting range without being one of
 * its targets: it is what a Level 1 paper says when the candidate did not reach
 * A1, which is a real outcome and needs somewhere to land.
 * ======================================================================== */
const VPET_LEVELS = [
  {
    id: 'L1',
    name: 'Level 1',
    range: 'A1 – B1+',
    blurb: 'For beginner to lower-intermediate learners. Reports anywhere from below A1 up to B1+.',
    /* Which item bands a Level 1 paper may draw. `below A1` is a result, not an
       item difficulty, so it is not here. */
    cefr: ['A1', 'A2', 'A2+', 'B1', 'B1+'],
    gse: [10, 58]
  },
  {
    id: 'L2',
    name: 'Level 2',
    range: 'B2 – C2',
    blurb: 'For upper-intermediate learners and above. Reports from B2 up to C2.',
    cefr: ['B2', 'B2+', 'C1', 'C2'],
    gse: [59, 90]
  }
];

/** One level by its id, or null. */
function vpetLevel(id) {
  return VPET_LEVELS.find(l => l.id === String(id || '').toUpperCase()) || null;
}

/**
 * Which level an item of this CEFR band belongs to.
 *
 * Returns null for a band no level accepts, rather than guessing. An item
 * tagged `below A1` has no level: it describes a performance, not a question.
 */
function vpetLevelOfCefr(cefr) {
  const c = String(cefr || '');
  const hit = VPET_LEVELS.find(l => l.cefr.includes(c));
  return hit ? hit.id : null;
}

/** Which level a GSE result falls in. Every point 10–90 belongs to exactly one. */
function vpetLevelOfGse(gse) {
  const n = Number(gse);
  if (!Number.isFinite(n)) return null;
  const hit = VPET_LEVELS.find(l => n >= l.gse[0] && n <= l.gse[1]);
  return hit ? hit.id : null;
}

function partsOf(familyId) {
  const out = [];
  for (const f of FORMATS) {
    if (f.familyId !== familyId) continue;
    for (const s of f.sections) if (s.part && !out.includes(s.part)) out.push(s.part);
  }
  return out;
}

/** The blueprint section that owns a part letter — used to describe a part in
    the interface without repeating its name in a second place. */
function sectionOfPart(familyId, part) {
  for (const f of FORMATS) {
    if (f.familyId !== familyId) continue;
    const s = f.sections.find(x => x.part === part);
    if (s) return s;
  }
  return null;
}

module.exports = {
  FORMATS, totalItems, totalMinutes, inconsistencies, partsOf, sectionOfPart,
  VPET_LEVELS, vpetLevel, vpetLevelOfCefr, vpetLevelOfGse
};
