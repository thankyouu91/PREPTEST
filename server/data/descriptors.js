/**
 * Can-do descriptors — the platform's own, written from scratch.
 *
 * WHY THESE EXIST AT ALL
 *
 * A score is a number until somebody says what it means. "GSE 55, B1+" tells a
 * learner nothing they can act on; "you can follow a conversation between
 * several speakers, and at 59 you would be following the argument and the
 * evidence behind it" tells them where they are and what changes next. Every
 * piece of advice the report gives (docs/VOICE.md section 8.2) is built on
 * these statements.
 *
 * WHY WRITTEN IN-HOUSE
 *
 * Two well-known descriptor sets already exist: the Council of Europe's CEFR
 * illustrative descriptors, and Pearson's GSE Learning Objectives. Both are
 * somebody else's work under somebody else's terms, and this platform is a
 * commercial product that would be republishing them at scale, in a report, on
 * a certificate, and in study material. Using the GSE *numbering* to report a
 * position on a scale is a different act from reprinting their descriptor text,
 * and the second is the one that needs permission.
 *
 * So these are written here, mapped onto the same numeric bands, and owned
 * outright. That costs writing time once and settles the question permanently.
 * See docs/ACADEMIC.md for the alignment argument.
 *
 * HOW A DESCRIPTOR IS WRITTEN
 *
 * Each one is a single observable thing a learner either can or cannot do, in
 * language a learner recognises about themselves. Not "demonstrates control of
 * subordinate clauses" — nobody has ever thought that about their own English.
 *
 *   · One ability per statement. Two joined by "and" cannot be half true.
 *   · Observable in performance, not in a grammar syllabus.
 *   · Written from the learner's side: "you can", not "the candidate is able to".
 *   · Placed at the GSE point where it typically becomes reliable, not where it
 *     first appears — the difference matters when the report uses it as a target.
 *
 * THE `gse` FIELD IS DOING REAL WORK
 *
 * It is not decoration and not the band midpoint. It is the point at which this
 * ability becomes dependable, which is what lets the report sort targets by how
 * close they are rather than by which band they belong to. A learner at 55 is
 * shown the 56 and 58 statements before the 60 one, and that ordering is the
 * whole value of a continuous scale.
 */
'use strict';

/* Band boundaries, kept here so descriptors and reports cannot drift apart.
   Mirrors the alignment table in docs/ACADEMIC.md and, once the scoring engine
   exists, `scoring_scales` in the database is the runtime source. */
const BANDS = [
  { band: 'below A1', min: 10, max: 21 },
  { band: 'A1',       min: 22, max: 29 },
  { band: 'A2',       min: 30, max: 35 },
  { band: 'A2+',      min: 36, max: 42 },
  { band: 'B1',       min: 43, max: 50 },
  { band: 'B1+',      min: 51, max: 58 },
  { band: 'B2',       min: 59, max: 66 },
  { band: 'B2+',      min: 67, max: 75 },
  { band: 'C1',       min: 76, max: 84 },
  { band: 'C2',       min: 85, max: 90 }
];

/* ------------------------------------------------------------------ *
 * LISTENING                                                           *
 * ------------------------------------------------------------------ */

const LISTENING = [
  { gse: 24, text: 'You can understand simple questions about your name, your age and where you live, when somebody speaks slowly.' },
  { gse: 26, text: 'You can catch a number, a price or a time when it is said slowly and repeated.' },
  { gse: 28, text: 'You can follow simple instructions such as where to sit or which page to open.' },
  { gse: 29, text: 'You can pick out words you know in a short announcement about a familiar situation.' },

  { gse: 31, text: 'You can get the main point of a short, clear announcement in a shop or a station.' },
  { gse: 33, text: 'You can follow a simple conversation between two people about everyday plans.' },
  { gse: 34, text: 'You can understand simple directions to a place nearby.' },
  { gse: 35, text: 'You can catch the day, the time and the place in a short spoken message.' },

  { gse: 37, text: 'You can understand a short recorded message such as an appointment reminder.' },
  { gse: 39, text: 'You can follow the main events of a short story told in simple language.' },
  { gse: 41, text: 'You can get the essential information from a short broadcast on a predictable topic.' },
  { gse: 42, text: 'You can tell whether a speaker is agreeing or disagreeing in a simple exchange.' },

  { gse: 44, text: 'You can understand the main points of clear standard speech about work, school or free time.' },
  { gse: 46, text: 'You can follow a straightforward talk on a subject you already know something about.' },
  { gse: 48, text: 'You can follow the plot of a story told at normal speed.' },
  { gse: 50, text: 'You can find specific information in a longer passage when you know what to listen for.' },

  { gse: 52, text: 'You can hear the speaker’s opinion as well as the facts in a clear discussion.' },
  { gse: 54, text: 'You can follow a conversation between several speakers on a familiar topic.' },
  { gse: 56, text: 'You can understand detailed instructions or a procedure explained out loud.' },
  { gse: 58, text: 'You can tell when a speaker is restating a point rather than making a new one.' },

  { gse: 60, text: 'You can understand extended speech and talks on reasonably familiar subjects.' },
  { gse: 62, text: 'You can follow an argument and identify the evidence offered for it.' },
  { gse: 64, text: 'You can understand most news and current affairs programmes.' },
  { gse: 66, text: 'You can separate a speaker’s own view from views they are reporting.' },

  { gse: 68, text: 'You can follow a complex line of argument on an abstract topic.' },
  { gse: 70, text: 'You can pick up meaning that is implied rather than stated, including hesitation and understatement.' },
  { gse: 72, text: 'You can follow fast speech between fluent speakers with only occasional difficulty.' },
  { gse: 74, text: 'You can notice a change in how formally somebody is speaking and work out what it signals.' },

  { gse: 78, text: 'You can understand extended speech even when it is not clearly structured.' },
  { gse: 80, text: 'You can follow a specialised talk containing terminology you do not know.' },
  { gse: 82, text: 'You can understand a wide range of idiomatic and colloquial expressions.' },
  { gse: 84, text: 'You can read a speaker’s attitude from tone alone, without being told.' },

  { gse: 86, text: 'You can understand any kind of spoken language at natural speed, live or recorded.' },
  { gse: 88, text: 'You can adjust to an unfamiliar accent or dialect after a short period of exposure.' },
  { gse: 90, text: 'You can detect fine shades of meaning, including deliberate ambiguity and irony.' }
];

/* ------------------------------------------------------------------ *
 * READING                                                             *
 * ------------------------------------------------------------------ */

const READING = [
  { gse: 24, text: 'You can understand single words and short phrases on everyday signs.' },
  { gse: 26, text: 'You can read a very short, simple message such as a text about meeting somebody.' },
  { gse: 28, text: 'You can find a name, a price or a time in a short written notice.' },
  { gse: 29, text: 'You can understand a simple form asking for your personal details.' },

  { gse: 31, text: 'You can understand a short personal letter or email about everyday matters.' },
  { gse: 33, text: 'You can find the information you need in a menu, a timetable or an advertisement.' },
  { gse: 34, text: 'You can follow simple written instructions, such as how to use a machine.' },
  { gse: 35, text: 'You can understand the main point of a short newspaper item on a familiar subject.' },

  { gse: 37, text: 'You can understand a short description of an event or a place.' },
  { gse: 39, text: 'You can work out the meaning of an unknown word from the sentence around it, when the topic is familiar.' },
  { gse: 41, text: 'You can follow a short story written in simple language.' },
  { gse: 42, text: 'You can tell a fact from an opinion in a straightforward text.' },

  { gse: 44, text: 'You can understand texts made up of everyday or job-related language.' },
  { gse: 46, text: 'You can find and compare information across two short texts on the same subject.' },
  { gse: 48, text: 'You can follow the sequence of events in a longer narrative.' },
  { gse: 50, text: 'You can understand the writer’s main point in a clearly argued article.' },

  { gse: 52, text: 'You can scan a longer text quickly and locate the part that answers your question.' },
  { gse: 54, text: 'You can understand a description of feelings or wishes in a personal letter.' },
  { gse: 56, text: 'You can follow how a text is organised, and predict what a paragraph will do next.' },
  { gse: 58, text: 'You can recognise which parts of an argument are support and which are the claim.' },

  { gse: 60, text: 'You can read articles and reports on contemporary issues where writers take a position.' },
  { gse: 62, text: 'You can understand a text well enough to summarise it accurately in your own words.' },
  { gse: 64, text: 'You can identify what a writer has left out as well as what they have said.' },
  { gse: 66, text: 'You can recognise a hedged claim and understand how strongly it is being made.' },

  { gse: 68, text: 'You can read long, complex texts and appreciate differences in style.' },
  { gse: 70, text: 'You can understand specialised articles outside your own field with occasional use of a dictionary.' },
  { gse: 72, text: 'You can trace an argument across several paragraphs and see where it changes direction.' },
  { gse: 74, text: 'You can evaluate whether the evidence a writer offers actually supports their claim.' },

  { gse: 78, text: 'You can understand lengthy and demanding texts, including implicit meaning.' },
  { gse: 80, text: 'You can read a technical or legal text closely enough to notice the significance of a qualifier.' },
  { gse: 82, text: 'You can recognise irony, understatement and other indirect ways of making a point.' },
  { gse: 84, text: 'You can compare how two writers treat the same subject and account for the difference.' },

  { gse: 86, text: 'You can read virtually all forms of written language, including abstract and structurally complex texts.' },
  { gse: 88, text: 'You can appreciate the effect of an author’s stylistic choices, not only their content.' },
  { gse: 90, text: 'You can read a text as a specialist would, noticing what an expert reader would object to.' }
];

/* ------------------------------------------------------------------ *
 * WRITING                                                             *
 * ------------------------------------------------------------------ */

const WRITING = [
  { gse: 24, text: 'You can fill in a form with your name, address and date of birth.' },
  { gse: 26, text: 'You can write a short greeting card or a very simple note.' },
  { gse: 28, text: 'You can write simple sentences about yourself using familiar words.' },
  { gse: 29, text: 'You can join two ideas with "and" or "but".' },

  { gse: 31, text: 'You can write a short message asking for or giving simple information.' },
  { gse: 33, text: 'You can describe your family, your home or your daily routine in a few sentences.' },
  { gse: 34, text: 'You can write about a past event using simple past forms.' },
  { gse: 35, text: 'You can write a short, simple email to a friend about plans.' },

  { gse: 37, text: 'You can write a short description of a place or a person with some detail.' },
  { gse: 39, text: 'You can link sentences with "because", "so" and "then" to show how they connect.' },
  { gse: 41, text: 'You can write a simple letter of complaint or request using a set pattern.' },
  { gse: 42, text: 'You can give reasons for an opinion in a few sentences.' },

  { gse: 44, text: 'You can write connected text on familiar subjects, organised into paragraphs.' },
  { gse: 46, text: 'You can write a straightforward email in the register the situation calls for.' },
  { gse: 48, text: 'You can describe an experience and say how you felt about it.' },
  { gse: 50, text: 'You can present an argument with a clear main point and supporting reasons.' },

  { gse: 52, text: 'You can summarise information from more than one source in your own words.' },
  { gse: 54, text: 'You can vary your sentence length deliberately rather than by accident.' },
  { gse: 56, text: 'You can signal the structure of a piece so a reader knows where it is going.' },
  { gse: 58, text: 'You can adjust how direct you are according to who will read it.' },

  { gse: 60, text: 'You can write clear, detailed text on a wide range of subjects.' },
  { gse: 62, text: 'You can develop an argument, giving reasons for and against a position.' },
  { gse: 64, text: 'You can qualify a claim so it says exactly as much as you can support.' },
  { gse: 66, text: 'You can write a formal email that achieves its purpose without being blunt.' },

  { gse: 68, text: 'You can write clear, well-structured text expressing points of view at length.' },
  { gse: 70, text: 'You can select the style appropriate to the reader without conscious effort.' },
  { gse: 72, text: 'You can anticipate an objection and answer it before the reader raises it.' },
  { gse: 74, text: 'You can rewrite your own draft to make it shorter without losing the argument.' },

  { gse: 78, text: 'You can express yourself in clear, well-structured text on complex subjects.' },
  { gse: 80, text: 'You can write a summary of a long, demanding source that a reader could rely on.' },
  { gse: 82, text: 'You can use tone to carry meaning that the words alone do not state.' },
  { gse: 84, text: 'You can write in a style that a reader would not identify as non-native.' },

  { gse: 86, text: 'You can write clear, smoothly flowing text in an appropriate and effective style.' },
  { gse: 88, text: 'You can produce writing whose structure helps the reader notice what matters most.' },
  { gse: 90, text: 'You can write with precision fine enough that changing one word would change the meaning.' }
];

/* ------------------------------------------------------------------ *
 * SPEAKING                                                            *
 * ------------------------------------------------------------------ */

const SPEAKING = [
  { gse: 24, text: 'You can introduce yourself and answer simple questions about where you are from.' },
  { gse: 26, text: 'You can ask for something in a shop using a familiar phrase.' },
  { gse: 28, text: 'You can say numbers, days and times clearly enough to be understood.' },
  { gse: 29, text: 'You can repeat a short sentence you have just heard.' },

  { gse: 31, text: 'You can order food or buy a ticket without preparing what to say.' },
  { gse: 33, text: 'You can describe your family or your job in several connected sentences.' },
  { gse: 34, text: 'You can ask for and give simple directions.' },
  { gse: 35, text: 'You can make and respond to an invitation.' },

  { gse: 37, text: 'You can tell somebody about something that happened to you recently.' },
  { gse: 39, text: 'You can keep a simple conversation going by asking a question back.' },
  { gse: 41, text: 'You can explain a problem clearly enough to get help with it.' },
  { gse: 42, text: 'You can give a short reason for a preference or a decision.' },

  { gse: 44, text: 'You can take part in a conversation on familiar topics without much hesitation.' },
  { gse: 46, text: 'You can describe an experience in a sequence a listener can follow.' },
  { gse: 48, text: 'You can retell the main events of a story you have just heard.' },
  { gse: 50, text: 'You can give a short prepared talk on a familiar subject.' },

  { gse: 52, text: 'You can explain your opinion and respond when somebody disagrees.' },
  { gse: 54, text: 'You can repair a sentence you have started badly and carry on.' },
  { gse: 56, text: 'You can adjust what you say when you can see the listener has not understood.' },
  { gse: 58, text: 'You can speak for a minute on a familiar topic without long pauses.' },

  { gse: 60, text: 'You can interact with fluency and spontaneity on a range of topics.' },
  { gse: 62, text: 'You can present an argument and defend it when it is challenged.' },
  { gse: 64, text: 'You can soften a disagreement so it does not sound like an attack.' },
  { gse: 66, text: 'You can be understood without the listener having to work at it.' },

  { gse: 68, text: 'You can express yourself fluently without obviously searching for words.' },
  { gse: 70, text: 'You can use stress and intonation to mark which part of your point matters.' },
  { gse: 72, text: 'You can take part in a fast discussion with several speakers.' },
  { gse: 74, text: 'You can change register mid-conversation when the situation shifts.' },

  { gse: 78, text: 'You can move between a social conversation and a professional one without losing fluency.' },
  { gse: 80, text: 'You can present a complex subject clearly to somebody who does not know it.' },
  { gse: 82, text: 'You can speak at length with a structure a listener can follow without effort.' },
  { gse: 84, text: 'You can be persuasive rather than merely correct.' },

  { gse: 86, text: 'You can take part effortlessly in any conversation or discussion.' },
  { gse: 88, text: 'You can convey finer shades of meaning precisely, including humour and irony.' },
  { gse: 90, text: 'You can speak so that a listener attends to what you are saying rather than how.' }
];

const BY_SKILL = {
  listening: LISTENING,
  reading: READING,
  writing: WRITING,
  speaking: SPEAKING
};

/* ------------------------------------------------------------------ *
 * Lookups                                                             *
 * ------------------------------------------------------------------ */

/** The CEFR band a GSE score falls in. */
function bandFor(gse) {
  const n = Number(gse);
  if (!Number.isFinite(n)) return null;
  const hit = BANDS.find(b => n >= b.min && n <= b.max);
  return hit ? hit.band : (n < 10 ? 'below A1' : 'C2');
}

/** Where a score sits inside its band, 0 to 1. Drives the position bar. */
function positionInBand(gse) {
  const n = Number(gse);
  const b = BANDS.find(x => n >= x.min && n <= x.max);
  if (!b || b.max === b.min) return 0;
  return Math.min(1, Math.max(0, (n - b.min) / (b.max - b.min)));
}

/** How many points to the next band, or null at the top of the scale. */
function pointsToNextBand(gse) {
  const n = Number(gse);
  const i = BANDS.findIndex(b => n >= b.min && n <= b.max);
  if (i < 0 || i === BANDS.length - 1) return null;
  return BANDS[i + 1].min - n;
}

/**
 * What a learner at this score can already do.
 *
 * Reads downward from the score, so it describes ability that is dependable
 * rather than the single hardest thing they managed once.
 */
function achieved(skill, gse, n = 4) {
  const list = BY_SKILL[skill] || [];
  return list.filter(d => d.gse <= Number(gse)).slice(-n).reverse()
    .map(d => ({ gse: d.gse, band: bandFor(d.gse), text: d.text }));
}

/**
 * What to work on next.
 *
 * The nearest abilities above the score, in order of distance. This is the
 * ordering that makes a continuous scale worth having: a learner at 55 gets
 * the 56 and 58 statements before the 60 one, because those are the ones
 * within reach this term.
 */
function nextTargets(skill, gse, n = 3) {
  const list = BY_SKILL[skill] || [];
  return list.filter(d => d.gse > Number(gse)).slice(0, n)
    .map(d => ({ gse: d.gse, band: bandFor(d.gse), gap: d.gse - Number(gse), text: d.text }));
}

/** Everything the report needs for one skill, in one call. */
function profile(skill, gse) {
  return {
    skill,
    gse: Number(gse),
    band: bandFor(gse),
    positionInBand: positionInBand(gse),
    pointsToNextBand: pointsToNextBand(gse),
    achieved: achieved(skill, gse),
    next: nextTargets(skill, gse)
  };
}

module.exports = {
  BANDS, BY_SKILL,
  LISTENING, READING, WRITING, SPEAKING,
  bandFor, positionInBand, pointsToNextBand, achieved, nextTargets, profile
};
