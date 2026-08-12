/**
 * VPET marking rubrics — the band scales, and what to do about each band.
 *
 * This is the document the AI marker is given, the document a teacher marks
 * against, and the source of the personalised practice a learner sees in their
 * report. One file, because those three must never disagree: a rubric the
 * marker uses and a rubric the learner is shown that differ is how a learner
 * ends up working on something that was never being scored.
 *
 * ---------------------------------------------------------------------------
 * STRUCTURE
 *
 *   CRITERIA       Each criterion defined once, with a 0–6 band scale.
 *   PART_RUBRICS   Each part names the criteria it uses and their weights.
 *
 * Defining a criterion once and referencing it is not only less to maintain —
 * it is the academically correct shape. "Fluency at band 4" has to mean the
 * same thing in part I as in part J, or the two cannot be averaged, and the
 * moment there are two copies of a descriptor they start to drift.
 *
 * ---------------------------------------------------------------------------
 * THE BAND SCALE
 *
 *   0  no ratable performance      4  B2   GSE 63
 *   1  A1   GSE 26                 5  C1   GSE 80
 *   2  A2   GSE 33                 6  C2   GSE 87
 *   3  B1   GSE 47
 *
 * A band is scored, and the GSE anchor is what it converts to. Interpolate
 * between anchors when the evidence sits between two bands — the scale is
 * continuous even though the judgement is not (docs/VOICE.md §1.6).
 *
 * ---------------------------------------------------------------------------
 * WHY EACH BAND CARRIES `evidence`
 *
 * `descriptor` says what the performance is like; `evidence` says what the
 * marker should be able to point at. A rubric without the second is a rubric
 * two markers apply differently and neither can defend. It is also what the
 * AI marker is required to quote (docs/VOICE.md §6.4) — the `evidence` field
 * in its output exists to be checked against this one.
 *
 * ---------------------------------------------------------------------------
 * WHY EACH CRITERION CARRIES `remediation`
 *
 * A band tells a learner where they are. It does not tell them what to do, and
 * "improve your fluency" is not an instruction anybody can act on. Each
 * criterion therefore carries three remediation entries — struggling,
 * developing, refining — with concrete actions and links to the study pages
 * that already exist. This is what the report's tips are assembled from
 * (docs/VOICE.md §8.2), which is why the ranking is by points recoverable
 * rather than by how bad something looks.
 *
 * ---------------------------------------------------------------------------
 * `measurable` LINKS A CRITERION TO THE NUMBERS
 *
 * Some criteria can be cross-checked against the deterministic metrics layer
 * (docs/VOICE.md §6.2); most cannot. Naming the metrics here is what lets the
 * engine flag a fluency band of 5 sitting next to a measured silence ratio of
 * 70%. A criterion with an empty `measurable` list is one where the marker's
 * judgement stands alone, and knowing which those are matters.
 */
'use strict';

/* GSE anchor per band. Shared with server/data/descriptors.js by construction:
   the anchors are the points those descriptors were written around. */
const BAND_GSE = { 0: null, 1: 26, 2: 33, 3: 47, 4: 63, 5: 80, 6: 87 };
const BAND_CEFR = { 0: null, 1: 'A1', 2: 'A2', 3: 'B1', 4: 'B2', 5: 'C1', 6: 'C2' };

/* Study pages that exist today. The academic audit checks every link here
   against the routes in server.js, so a renamed page fails loudly instead of
   sending a learner to a 404 at the exact moment they decided to act. */
const STUDY = {
  tenses: '/prep/hoc/thi/',
  linkers: '/prep/hoc/tu-noi/',
  nouns: '/prep/hoc/danh-tu/',
  adjectives: '/prep/hoc/tinh-tu/',
  modals: '/prep/hoc/khuyet-thieu/',
  conditionals: '/prep/hoc/dieu-kien/',
  passive: '/prep/hoc/bi-dong/',
  clauses: '/prep/hoc/menh-de/',
  emphasis: '/prep/hoc/nhan-manh/',
  register: '/prep/hoc/sac-thai/',
  irregularVerbs: '/prep/hoc/dong-tu-bat-quy-tac/'
};

/* ==========================================================================
 * CRITERIA
 * ======================================================================== */

const CRITERIA = {

  /* ---------------------------------------------------------------- */
  accuracy: {
    label: 'Accuracy',
    skills: ['speaking'],
    what: 'How closely the repeated sentence matches the one that was played.',
    /* Computed, not judged. The marker is told the number rather than asked
       for one — docs/VOICE.md §6.1. A model asked to estimate word overlap
       will estimate it, and estimating a quantity that can be counted is the
       most avoidable error in the whole marking chain. */
    measurable: ['wordErrorRate', 'wordsDropped', 'wordsSubstituted'],
    computed: true,
    bands: [
      { band: 0, descriptor: 'Nothing recognisable from the sentence, or no speech.', evidence: 'Word match below 15%.' },
      { band: 1, descriptor: 'A few isolated words survive; the sentence is not recoverable.', evidence: 'Word match 15–35%.' },
      { band: 2, descriptor: 'The main content words are there, the grammar around them is not.', evidence: 'Word match 35–55%; function words dropped.' },
      { band: 3, descriptor: 'Most of the sentence is repeated; endings and small words go missing.', evidence: 'Word match 55–75%; plural and past-tense endings dropped.' },
      { band: 4, descriptor: 'The sentence is repeated accurately apart from one or two words.', evidence: 'Word match 75–90%.' },
      { band: 5, descriptor: 'Repeated accurately, with at most a trivial slip.', evidence: 'Word match 90–97%.' },
      { band: 6, descriptor: 'Repeated exactly, including unstressed endings.', evidence: 'Word match above 97%.' }
    ],
    remediation: {
      struggling: {
        diagnosis: 'The sentence is gone before you can say it back. This is memory for language, not hearing.',
        actions: [
          'Practise with sentences half this length first, then build up one word at a time.',
          'Say the sentence in your head once before you speak — repeating from memory beats repeating from sound.',
          'Record yourself and compare word by word; you will usually find the same word type going missing.'
        ],
        study: [STUDY.irregularVerbs]
      },
      developing: {
        diagnosis: 'You keep the meaning but lose the endings — plurals, past tense, articles.',
        actions: [
          'Slow down slightly. Most dropped endings are lost to speed, not to not knowing them.',
          'Read sentences aloud with the endings deliberately over-pronounced, then at normal speed.',
          'Work through the past-tense forms until they need no thought while speaking.'
        ],
        study: [STUDY.irregularVerbs, STUDY.tenses]
      },
      refining: {
        diagnosis: 'You repeat accurately. What is left is rhythm rather than words.',
        actions: [
          'Copy the stress pattern, not only the words — where the speaker went up and down.',
          'Practise with longer sentences containing subordinate clauses.'
        ],
        study: [STUDY.clauses]
      }
    }
  },

  /* ---------------------------------------------------------------- */
  pronunciation: {
    label: 'Pronunciation',
    skills: ['speaking'],
    what: 'How much effort a listener has to make, and whether stress and intonation carry meaning.',
    measurable: ['articulationRate', 'snrDb'],
    bands: [
      { band: 0, descriptor: 'Cannot be understood.', evidence: 'Listener cannot recover the message at all.' },
      { band: 1, descriptor: 'Individual words are recognisable; connected speech is not.', evidence: 'Listener catches words but not sentences.' },
      { band: 2, descriptor: 'Understandable with effort and with the topic known.', evidence: 'Frequent mispronunciation of common words; flat intonation.' },
      { band: 3, descriptor: 'Generally understandable; some sounds and stress patterns mislead.', evidence: 'Word stress on the wrong syllable; final consonants dropped.' },
      { band: 4, descriptor: 'Clear throughout; accent present but never an obstacle.', evidence: 'Occasional slips, always recoverable from context.' },
      { band: 5, descriptor: 'Clear and controlled; stress and intonation mark meaning deliberately.', evidence: 'Emphasis lands where the speaker intends it.' },
      { band: 6, descriptor: 'Precise, with intonation carrying attitude as well as structure.', evidence: 'Listener attends to the content, never to the delivery.' }
    ],
    remediation: {
      struggling: {
        diagnosis: 'Individual sounds are getting in the way before sentences even begin.',
        actions: [
          'Work on final consonants first — dropping them costs more meaning than any vowel.',
          'Use the pronunciation player on the study pages: tap a word, hear it, repeat it, record.',
          'Pick the ten words you use most often and get those exactly right before widening.'
        ],
        study: [STUDY.irregularVerbs]
      },
      developing: {
        diagnosis: 'You are understood, but word stress is landing in the wrong place, which costs more than accent does.',
        actions: [
          'For every new word you learn, learn which syllable is stressed at the same time.',
          'Read a short paragraph aloud, mark the stressed word in each sentence, then read it again.',
          'Listen to one of the exam passages, then read it aloud alongside the recording.'
        ],
        study: [STUDY.adjectives]
      },
      refining: {
        diagnosis: 'You are clear. What separates you from the next band is using intonation on purpose.',
        actions: [
          'Practise saying the same sentence three ways, stressing a different word each time.',
          'Work on the intonation of questions and of contrast — the two that carry the most meaning.'
        ],
        study: [STUDY.emphasis]
      }
    }
  },

  /* ---------------------------------------------------------------- */
  fluency: {
    label: 'Fluency',
    skills: ['speaking'],
    what: 'How smoothly speech runs, and whether pauses fall where meaning divides.',
    /* The most cross-checkable criterion in the set. A high band next to a
       measured silence ratio of 70% is a flag, not a score. */
    measurable: ['articulationRate', 'silenceRatio', 'pauseCount', 'meanLengthOfRun', 'fillerCount'],
    bands: [
      { band: 0, descriptor: 'No sustained speech.', evidence: 'Isolated words, or silence.' },
      { band: 1, descriptor: 'Very short utterances with long pauses between them.', evidence: 'Under 5 words between pauses; silence over half the time.' },
      { band: 2, descriptor: 'Speech in short bursts; pauses fall inside phrases.', evidence: 'Pauses mid-phrase; heavy reliance on fillers.' },
      { band: 3, descriptor: 'Keeps going on familiar topics; noticeable hesitation when searching for words.', evidence: 'Pauses at clause boundaries; occasional restarts.' },
      { band: 4, descriptor: 'Speaks at length with only occasional hesitation.', evidence: 'Pauses fall where meaning divides; self-corrects without stopping.' },
      { band: 5, descriptor: 'Fluent and even; hesitation is for thought, not for language.', evidence: 'Rate steady; pauses rhetorical rather than forced.' },
      { band: 6, descriptor: 'Effortless, with pace varied for effect.', evidence: 'Slows and speeds deliberately; no searching.' }
    ],
    remediation: {
      struggling: {
        diagnosis: 'You stop mid-phrase to look for the next word, and the sentence does not survive the wait.',
        actions: [
          'Speak for thirty seconds on one everyday topic without stopping, even if it is not correct. Accuracy comes after.',
          'Learn five phrases that buy time — "let me think", "that is a good question" — and use them instead of silence.',
          'Prepare content, not sentences. Knowing what you want to say removes most of the pausing.'
        ],
        study: [STUDY.linkers]
      },
      developing: {
        diagnosis: 'You can keep going, but the pauses fall in the middle of ideas rather than between them.',
        actions: [
          'Practise finishing a clause before you pause, even if the clause is simple.',
          'Use linking words to buy the moment you need — the connector and the thinking time arrive together.',
          'Time yourself speaking for one minute; aim to raise the words between pauses, not the total.'
        ],
        study: [STUDY.linkers, STUDY.clauses]
      },
      refining: {
        diagnosis: 'You are fluent. The remaining gain is in varying pace rather than removing pauses.',
        actions: [
          'Pause deliberately before the point you want the listener to notice.',
          'Practise the longer part J retellings and keep the pace even across all ninety seconds.'
        ],
        study: [STUDY.emphasis]
      }
    }
  },

  /* ---------------------------------------------------------------- */
  vocabulary: {
    label: 'Vocabulary',
    skills: ['speaking', 'writing'],
    what: 'Range, precision, and whether words are used in the combinations they belong in.',
    measurable: ['typeTokenRatio', 'cefrBandCoverage'],
    bands: [
      { band: 0, descriptor: 'Too little language to assess.', evidence: 'Fewer than about ten content words.' },
      { band: 1, descriptor: 'Isolated everyday words and memorised phrases.', evidence: 'Repeats the same few words throughout.' },
      { band: 2, descriptor: 'Enough for familiar everyday topics; frequent repetition.', evidence: 'Reaches for a general word where a specific one is needed.' },
      { band: 3, descriptor: 'Sufficient for familiar topics; circumlocution when precision is needed.', evidence: 'Says "the thing you cook with" rather than naming it.' },
      { band: 4, descriptor: 'Good range on general topics; collocation mostly correct.', evidence: 'Occasional unnatural pairings — "do a mistake".' },
      { band: 5, descriptor: 'Broad and precise; comfortable with less common words.', evidence: 'Chooses the exact word; collocation reliable.' },
      { band: 6, descriptor: 'Consistently precise, including idiom used naturally.', evidence: 'Word choice shades meaning rather than merely conveying it.' }
    ],
    remediation: {
      struggling: {
        diagnosis: 'You are working with a small set of words, so meaning has to be approximated.',
        actions: [
          'Build from the most frequent words outward — the first two thousand cover most of what you will hear.',
          'Learn words in phrases, never alone. "Make a decision" is one item to learn, not two.',
          'When you cannot find a word, describe it and then look it up afterwards. Both halves matter.'
        ],
        study: [STUDY.nouns]
      },
      developing: {
        diagnosis: 'You have the words but not always the company they keep — the pairings sound off.',
        actions: [
          'Whenever you meet a new noun, note the verb that usually goes with it.',
          'Replace one general word per answer with a specific one: "good" into "reliable", "thorough", "convincing".',
          'Work through the linking words by function so you stop reaching for the same three.'
        ],
        study: [STUDY.linkers, STUDY.adjectives]
      },
      refining: {
        diagnosis: 'Your range is broad. What is left is shading — choosing between near-synonyms on purpose.',
        actions: [
          'Practise hedging: the difference between "this shows", "this suggests" and "this may indicate".',
          'Read in one subject area and collect the words that field uses differently from everyday English.'
        ],
        study: [STUDY.register]
      }
    }
  },

  /* ---------------------------------------------------------------- */
  grammar: {
    label: 'Grammar',
    skills: ['speaking', 'writing'],
    what: 'Range of structures and control over them, weighted by whether errors obscure meaning.',
    measurable: [],
    bands: [
      { band: 0, descriptor: 'Too little language to assess.', evidence: 'No sustained sentence.' },
      { band: 1, descriptor: 'Memorised phrases; little sentence building.', evidence: 'Words in sequence without structure.' },
      { band: 2, descriptor: 'Simple sentences, frequent basic errors.', evidence: 'Subject–verb agreement and tense unstable.' },
      { band: 3, descriptor: 'Simple structures controlled; complex ones attempted with errors.', evidence: 'Errors present but meaning survives.' },
      { band: 4, descriptor: 'Good control; errors occur in complex structures and rarely obscure meaning.', evidence: 'Subordination attempted and mostly successful.' },
      { band: 5, descriptor: 'Consistent control over a wide range; errors rare and self-corrected.', evidence: 'Complex sentences built without visible effort.' },
      { band: 6, descriptor: 'Full control, including deliberate departures from the ordinary pattern.', evidence: 'Inversion, fronting and ellipsis used for effect.' }
    ],
    remediation: {
      struggling: {
        diagnosis: 'Sentences are breaking down before they finish. Structure first, complexity later.',
        actions: [
          'Fix one thing at a time: start with subject–verb agreement, then present and past.',
          'Write five sentences a day about your own day and check the verb in each.',
          'Speak in short sentences deliberately. A correct short sentence beats a broken long one.'
        ],
        study: [STUDY.tenses, STUDY.nouns]
      },
      developing: {
        diagnosis: 'Simple sentences are solid. The errors are appearing when you attempt something longer.',
        actions: [
          'Work on one complex structure at a time until it is automatic, then add the next.',
          'Relative clauses and conditionals give the most return: they appear constantly in speaking and writing.',
          'Take your own answer and join every pair of short sentences into one. Then check it.'
        ],
        study: [STUDY.clauses, STUDY.conditionals, STUDY.passive]
      },
      refining: {
        diagnosis: 'Control is good. The next band is about using structure for emphasis, not only for correctness.',
        actions: [
          'Practise fronting and inversion so the important part of the sentence lands first.',
          'Work on modals for degrees of certainty — the difference between "will", "should" and "may".'
        ],
        study: [STUDY.emphasis, STUDY.modals]
      }
    }
  },

  /* ---------------------------------------------------------------- */
  coherence: {
    label: 'Coherence',
    skills: ['speaking', 'writing'],
    what: 'Whether the parts connect, and whether a listener or reader can follow without backtracking.',
    measurable: [],
    bands: [
      { band: 0, descriptor: 'No connected discourse.', evidence: 'Disconnected fragments.' },
      { band: 1, descriptor: 'Single ideas, unlinked.', evidence: 'No connectors at all.' },
      { band: 2, descriptor: 'Ideas joined with "and", "but", "then".', evidence: 'The same two or three connectors throughout.' },
      { band: 3, descriptor: 'A clear sequence, though the links are simple and sometimes repetitive.', evidence: 'Follows a beginning-middle-end order.' },
      { band: 4, descriptor: 'Clearly organised; connectors chosen for their function.', evidence: 'Signals contrast and cause distinctly.' },
      { band: 5, descriptor: 'Well structured; the listener always knows where the argument is going.', evidence: 'Signposts the structure without labouring it.' },
      { band: 6, descriptor: 'Structure serves the point; connection is often implicit and still clear.', evidence: 'Cohesion carried by reference and word choice, not by connectors alone.' }
    ],
    remediation: {
      struggling: {
        diagnosis: 'The ideas are there but arriving in no particular order.',
        actions: [
          'Before you answer, decide on three points and their order. Say them in that order.',
          'Learn six connectors and use them deliberately: first, then, because, but, so, finally.'
        ],
        study: [STUDY.linkers]
      },
      developing: {
        diagnosis: 'You have a sequence, but you are using the same few links for every relationship between ideas.',
        actions: [
          'Match the connector to the job: contrast, cause, addition and concession are four different things.',
          'Take an answer you have given and rewrite it with each connector replaced by a more precise one.'
        ],
        study: [STUDY.linkers, STUDY.clauses]
      },
      refining: {
        diagnosis: 'You are organised. The next step is connecting without announcing the connection.',
        actions: [
          'Practise carrying the thread with reference words — "this", "that approach", "the second of these".',
          'Try removing half your connectors and check whether the argument still holds together.'
        ],
        study: [STUDY.linkers, STUDY.register]
      }
    }
  },

  /* ---------------------------------------------------------------- */
  task: {
    label: 'Task fulfilment and register',
    skills: ['speaking', 'writing'],
    what: 'Whether everything asked for was done, at the level of formality the situation calls for.',
    measurable: ['durationMs', 'wordCount'],
    bands: [
      { band: 0, descriptor: 'Does not address the task.', evidence: 'Off topic, or nothing produced.' },
      { band: 1, descriptor: 'Touches the topic; the task itself is not attempted.', evidence: 'Talks about the subject rather than doing what was asked.' },
      { band: 2, descriptor: 'Attempts part of the task; register not controlled.', evidence: 'One of several required elements present.' },
      { band: 3, descriptor: 'Covers most of the task; register broadly appropriate but inconsistent.', evidence: 'Slips between formal and casual within one answer.' },
      { band: 4, descriptor: 'Covers the whole task; register appropriate and mostly consistent.', evidence: 'All required elements present and identifiable.' },
      { band: 5, descriptor: 'Covers the task fully and judges tone well throughout.', evidence: 'Softens or sharpens deliberately as the situation needs.' },
      { band: 6, descriptor: 'Fulfils the task and shapes it to the reader or listener.', evidence: 'Anticipates the response and adjusts before it is needed.' }
    ],
    remediation: {
      struggling: {
        diagnosis: 'Parts of what was asked are not being done — this costs more marks than any language error.',
        actions: [
          'Read the task and list every separate thing it asks for. Most tasks ask for three or four.',
          'Tick each one off as you cover it. Missing an element loses marks that correct English cannot recover.'
        ],
        study: [STUDY.register]
      },
      developing: {
        diagnosis: 'You cover the task, but the level of formality moves around inside one answer.',
        actions: [
          'Decide who you are writing or speaking to before you start, and hold it.',
          'Learn the formal and informal version of the same functions: requesting, apologising, refusing.',
          'Check your opening and closing match each other in formality.'
        ],
        study: [STUDY.register, STUDY.modals]
      },
      refining: {
        diagnosis: 'The task is covered and the tone is right. What is left is anticipating the other person.',
        actions: [
          'Practise hedging a request so it is easy to refuse, then a version that is hard to refuse.',
          'Answer the objection before it is raised — that is what separates persuasive from correct.'
        ],
        study: [STUDY.register]
      }
    }
  },

  /* ---------------------------------------------------------------- */
  content: {
    label: 'Content coverage',
    skills: ['speaking', 'writing'],
    what: 'How much of the source material was retained and conveyed. Checked against the item’s key points.',
    /* Countable, which is why the report can say "3 of 6" rather than "some". */
    measurable: ['keyPointsCovered', 'keyPointsTotal'],
    bands: [
      { band: 0, descriptor: 'Nothing from the source.', evidence: 'No key point covered.' },
      { band: 1, descriptor: 'One detail, without the shape of the whole.', evidence: 'Under 20% of key points.' },
      { band: 2, descriptor: 'A few details; the main line is missing.', evidence: '20–35% of key points.' },
      { band: 3, descriptor: 'The main events retained; supporting detail lost.', evidence: '35–55% of key points, main ones present.' },
      { band: 4, descriptor: 'Most of the content, including some detail.', evidence: '55–75% of key points.' },
      { band: 5, descriptor: 'Nearly all the content, accurately ordered.', evidence: '75–90% of key points, no distortion.' },
      { band: 6, descriptor: 'Complete and faithful, including what the source implied.', evidence: 'Above 90%, with relationships between facts preserved.' }
    ],
    remediation: {
      struggling: {
        diagnosis: 'The content is gone by the time you speak or write. That is a listening and note-taking problem, not a language one.',
        actions: [
          'Listen for the shape first — who, what, when — before trying to hold the wording.',
          'Practise with shorter sources and retell immediately, then lengthen the gap.',
          'Note two words per idea while listening, not full sentences.'
        ],
        study: []
      },
      developing: {
        diagnosis: 'You keep the main events but lose the detail that carries most of the marks.',
        actions: [
          'After each retelling, check what you missed. It is usually numbers, names and reasons.',
          'Retell twice: once for the events, once adding the detail you dropped.',
          'Practise reporting what somebody said — the structures that carry detail are the reported ones.'
        ],
        study: [STUDY.passive]
      },
      refining: {
        diagnosis: 'You cover the content. What remains is keeping the relationships between the facts, not only the facts.',
        actions: [
          'Retell keeping cause and consequence explicit — not just what happened, but because of what.',
          'Preserve the source’s emphasis: what it treated as important should still sound important.'
        ],
        study: [STUDY.linkers]
      }
    }
  },

  /* ---------------------------------------------------------------- */
  organisation: {
    label: 'Organisation',
    skills: ['writing'],
    what: 'Paragraphing, ordering, and whether the shape of the text helps the reader.',
    measurable: ['paragraphCount', 'wordCount'],
    bands: [
      { band: 0, descriptor: 'No discernible organisation.', evidence: 'Single undivided block, no order.' },
      { band: 1, descriptor: 'Sentences in sequence with no grouping.', evidence: 'No paragraphs.' },
      { band: 2, descriptor: 'Some grouping, not consistently by idea.', evidence: 'Paragraph breaks appear arbitrary.' },
      { band: 3, descriptor: 'Clear opening and closing; the middle is ordered but plain.', evidence: 'Recognisable structure for the text type.' },
      { band: 4, descriptor: 'Paragraphs handle one idea each and follow a sensible order.', evidence: 'A reader could summarise each paragraph in a phrase.' },
      { band: 5, descriptor: 'Structure chosen for the argument, not applied from a template.', evidence: 'Order builds rather than lists.' },
      { band: 6, descriptor: 'Shape and content are inseparable; the structure carries part of the meaning.', evidence: 'Placement itself signals what matters most.' }
    ],
    remediation: {
      struggling: {
        diagnosis: 'The text is one block, so a reader has to do the sorting you did not do.',
        actions: [
          'One idea, one paragraph. Start a new paragraph whenever the subject moves.',
          'Every email needs an opening line, a middle that does the job, and a closing line.'
        ],
        study: [STUDY.linkers]
      },
      developing: {
        diagnosis: 'You have paragraphs, but the order inside them is not doing work.',
        actions: [
          'Put the point of a paragraph in its first sentence, then support it.',
          'Read your own paragraphs and try to name each in three words. If you cannot, it holds two ideas.'
        ],
        study: [STUDY.linkers]
      },
      refining: {
        diagnosis: 'Well organised. The next step is letting the order carry the argument.',
        actions: [
          'Try ordering by strength of evidence rather than by chronology.',
          'Put the concession before the claim and see whether the argument reads stronger.'
        ],
        study: [STUDY.register]
      }
    }
  },

  /* ---------------------------------------------------------------- */
  mechanics: {
    label: 'Spelling and punctuation',
    skills: ['writing'],
    what: 'Surface accuracy: spelling, punctuation, capitalisation.',
    measurable: ['spellingErrors', 'wordCount'],
    bands: [
      { band: 0, descriptor: 'Unreadable.', evidence: 'Errors prevent reading.' },
      { band: 1, descriptor: 'Frequent errors that slow the reader down.', evidence: 'Errors in common words; little punctuation.' },
      { band: 2, descriptor: 'Regular errors; meaning generally survives.', evidence: 'Sentence boundaries unclear.' },
      { band: 3, descriptor: 'Reasonable control; errors noticeable but not obstructive.', evidence: 'Full stops and capitals mostly right.' },
      { band: 4, descriptor: 'Good control; occasional slips.', evidence: 'Commas mostly correct; spelling reliable.' },
      { band: 5, descriptor: 'Accurate throughout, including less common punctuation.', evidence: 'Errors rare enough to read as typing slips.' },
      { band: 6, descriptor: 'Faultless, with punctuation used to control pace.', evidence: 'Punctuation shapes how the sentence is read.' }
    ],
    remediation: {
      struggling: {
        diagnosis: 'Surface errors are making a reader work, which costs marks on every criterion at once.',
        actions: [
          'Fix sentence boundaries first: capital letter at the start, full stop at the end.',
          'Keep a list of the words you personally get wrong. It will be short and it will repeat.'
        ],
        study: []
      },
      developing: {
        diagnosis: 'Mostly accurate. The remaining errors cluster in a few predictable places.',
        actions: [
          'Learn the comma rules for lists and for introductory phrases — those two cover most cases.',
          'Reread once for meaning and once only for surface errors. Two passes catch far more than one.'
        ],
        study: []
      },
      refining: {
        diagnosis: 'Accurate. Punctuation can now do more than separate.',
        actions: [
          'Use a dash or a colon deliberately to change the pace of a sentence.',
          'Vary sentence length on purpose, and let punctuation mark the variation.'
        ],
        study: [STUDY.emphasis]
      }
    }
  }
};

/* ==========================================================================
 * PART RUBRICS
 *
 * Weights come from docs/ACADEMIC.md §4.3 and each must total 100. The audit
 * checks that, because a rubric whose weights sum to 97 produces scores that
 * are quietly 3% low and nothing else complains.
 * ======================================================================== */

const PART_RUBRICS = {
  H: {
    part: 'H', name: 'Repeat', skill: 'speaking',
    /* No vocabulary or grammar: the item supplies the words, so scoring them
       would score the item writer (docs/ACADEMIC.md §4.3). */
    criteria: { accuracy: 50, pronunciation: 30, fluency: 20 }
  },
  I: {
    part: 'I', name: 'Speaking Situations', skill: 'speaking',
    criteria: { task: 30, fluency: 20, pronunciation: 15, vocabulary: 15, grammar: 10, coherence: 10 }
  },
  J: {
    part: 'J', name: 'Story Retellings', skill: 'speaking',
    criteria: { content: 25, fluency: 20, coherence: 15, pronunciation: 15, vocabulary: 15, grammar: 10 }
  },
  B: {
    part: 'B', name: 'Passage Reconstruction', skill: 'writing',
    /* Content dominates: the task is retention and rewriting, not composition.
       No `task` criterion — the instruction is the same every time. */
    criteria: { content: 40, grammar: 25, vocabulary: 20, mechanics: 15 }
  },
  D: {
    part: 'D', name: 'E-Mail Writing', skill: 'writing',
    criteria: { task: 35, grammar: 20, organisation: 15, vocabulary: 15, mechanics: 15 }
  }
};

/** Speaking parts combine into the skill score with these weights (ACADEMIC §4.2). */
const SPEAKING_PART_WEIGHTS = { H: 25, I: 30, J: 45 };

/** Writing: part A is auto-marked, so only B and D carry rubric weight. */
const WRITING_PART_WEIGHTS = { B: 40, D: 60 };

/* ==========================================================================
 * Lookups
 * ======================================================================== */

/** Which remediation tier a band falls in. */
function tierFor(band) {
  const b = Number(band);
  if (b <= 2) return 'struggling';
  if (b <= 4) return 'developing';
  return 'refining';
}

/** The band row for one criterion, with its CEFR label and GSE anchor. */
function bandInfo(criterion, band) {
  const c = CRITERIA[criterion];
  if (!c) return null;
  const row = c.bands.find(x => x.band === Number(band));
  if (!row) return null;
  return {
    criterion, label: c.label, band: row.band,
    cefr: BAND_CEFR[row.band], gse: BAND_GSE[row.band],
    descriptor: row.descriptor, evidence: row.evidence
  };
}

/**
 * What to do about a score on one criterion.
 *
 * This is the unit the report's tips are built from: a diagnosis in the
 * learner's terms, concrete actions, and the study pages that support them.
 */
function adviceFor(criterion, band) {
  const c = CRITERIA[criterion];
  if (!c) return null;
  const tier = tierFor(band);
  const r = c.remediation[tier];
  return {
    criterion, label: c.label, band: Number(band), tier,
    diagnosis: r.diagnosis, actions: r.actions, study: r.study
  };
}

/**
 * Rank a set of criterion scores by how many points are recoverable.
 *
 * Deliberately not by which score is lowest. A criterion worth 10% of the part
 * sitting at band 2 is a smaller opportunity than one worth 40% sitting at
 * band 4, and a learner acting on the first is spending effort in the wrong
 * place. `headroom` is bands remaining × weight, which is the actual size of
 * the prize (docs/VOICE.md §8.2).
 */
function rankByOpportunity(part, scores) {
  const rubric = PART_RUBRICS[part];
  if (!rubric) return [];
  return Object.entries(rubric.criteria)
    .filter(([name]) => scores[name] != null)
    .map(([name, weight]) => ({
      criterion: name,
      label: CRITERIA[name].label,
      band: Number(scores[name]),
      weight,
      headroom: (6 - Number(scores[name])) * weight,
      advice: adviceFor(name, scores[name])
    }))
    .sort((a, b) => b.headroom - a.headroom);
}

/** Weighted band score for one part, on the 0–6 scale. */
function partScore(part, scores) {
  const rubric = PART_RUBRICS[part];
  if (!rubric) return null;
  let total = 0, used = 0;
  for (const [name, weight] of Object.entries(rubric.criteria)) {
    if (scores[name] == null) continue;
    total += Number(scores[name]) * weight;
    used += weight;
  }
  /* Rescale to the weight actually present rather than assuming 100: a part
     marked with one criterion missing should not silently score low. */
  return used ? total / used : null;
}

module.exports = {
  CRITERIA, PART_RUBRICS, STUDY,
  BAND_GSE, BAND_CEFR,
  SPEAKING_PART_WEIGHTS, WRITING_PART_WEIGHTS,
  tierFor, bandInfo, adviceFor, rankByOpportunity, partScore
};
