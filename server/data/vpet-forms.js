/**
 * Five complete VPET papers — forms 1 to 5, 55 items each.
 *
 * ---------------------------------------------------------------------------
 * WHY A THIRD CONTENT FILE
 *
 * `vpet-items.js` and `vpet-scripts.js` hold the original bank, split by
 * whether a part plays audio, because they are imported by two different
 * commands. That split made sense for one paper's worth of material and stops
 * making sense at five: a form is a unit somebody assembles, sits and marks,
 * and cutting each one in half across two files by an implementation detail
 * makes it impossible to read a paper as a paper.
 *
 * So a form lives in one place, all ten parts of it, and the importer sorts out
 * which ones need an MP3. Each form file is one sitting.
 *
 * ---------------------------------------------------------------------------
 * LEVELS, AND WHY THREE AND TWO
 *
 * Forms 1-3 are B1, forms 4-5 are B2. Not an aesthetic choice — it is what
 * fixes the depth problem docs/BLUEPRINT.md §6 describes.
 *
 * A paper is generated at one level and the builder prefers items at that
 * level, so depth has to be counted per level, not per part. Every audio part
 * held exactly the blueprint count at each level, which is the one number the
 * pool rule forbids: two sittings at the same level drew the identical part.
 * Three new B1 forms and two new B2 forms take every part past twice the
 * blueprint count at both levels, which is what "deep" means and what lets two
 * sittings genuinely differ.
 *
 * ---------------------------------------------------------------------------
 * WHAT EACH PART MUST LOOK LIKE
 *
 * docs/BLUEPRINT.md, enforced by `npm run kiem-noi-dung`. The rules that bite
 * most often while writing:
 *
 *   A  one word per gap, and a visible ___ in the sentence
 *   B  a passage of about 50 words with a turn in it, and EXACTLY 6 key points
 *   C  four options, every distractor traceable to the passage
 *   D  the register named in the prompt in words, and 4+ key points
 *   E  10-14 words; the answer is the script, so they cannot drift
 *   F  four options; the prompt line is spoken, the options are read
 *   G  about 85 words spoken, then one question with four options
 *   H  7-13 words, the answer taken from the script itself
 *   I  the relationship named, because that is where the register comes from
 *   J  about 740 characters ending on something retellable, and 6 key points
 *
 * Proper nouns are held to names an English text-to-speech voice says
 * correctly. Kokoro is an English model; on part E, where the whole item is
 * transcription, a mispronounced name costs the candidate marks for the
 * platform's mistake.
 */
'use strict';

const FORM_1 = require('./forms/vpet-form-1.js');
const FORM_2 = require('./forms/vpet-form-2.js');
const FORM_3 = require('./forms/vpet-form-3.js');
const FORM_4 = require('./forms/vpet-form-4.js');
const FORM_5 = require('./forms/vpet-form-5.js');

const FORMS = [FORM_1, FORM_2, FORM_3, FORM_4, FORM_5];

/* Which parts carry a script to be read aloud. Taken from the blueprint rather
   than listed again here, so a part that starts or stops playing audio does not
   leave this file quietly disagreeing with the exam. */
const FORMATS = require('./exam-formats.js');
const AUDIO_PARTS = new Set(
  FORMATS.FORMATS.find(f => f.id === 'vpet-full').sections
    .filter(s => s.needsAudio)
    .map(s => (/^Part ([A-J])\b/.exec(s.name) || [])[1])
    .filter(Boolean)
);

/* Skill and item type per part, also from the blueprint. */
const SHAPE = {};
FORMATS.FORMATS.find(f => f.id === 'vpet-full').sections.forEach(s => {
  const m = /^Part ([A-J])\b/.exec(s.name);
  if (m) SHAPE[m[1]] = { skill: s.skill, type: (s.types || [])[0] };
});

/** The instruction shown above the item, where every item in a part shares one. */
const PROMPTS = {
  B: 'Read this passage, then write it again in your own words after it disappears.',
  E: 'Type the sentence you hear.',
  F: 'Choose the most natural reply.',
  H: 'Repeat the sentence exactly as you hear it.',
  J: 'You will hear a short story once. Retell it in your own words.'
};

/**
 * Every item of every form, flattened into the shape the importer writes.
 *
 * One pass, so audio and silent parts come out identical apart from `script`.
 * Part E and H take their answer from the script rather than carrying a second
 * copy — the marker aligns the response against exactly what was said, and two
 * hand-typed copies of one sentence are two chances to drift apart.
 */
function allItems() {
  const out = [];

  for (const form of FORMS) {
    for (const [part, items] of Object.entries(form.parts)) {
      const shape = SHAPE[part];
      const coAudio = AUDIO_PARTS.has(part);

      items.forEach((it, i) => {
        const ref = `${form.id}-${part}${i + 1}`;

        /* The displayed instruction. Parts B, E, F, H and J share one per part;
           C, D and I state their own, because the task changes item to item. */
        let prompt = it.prompt || PROMPTS[part] || '';
        if (part === 'B') prompt = PROMPTS.B + '\n\n' + it.passage;
        if (part === 'C') prompt = it.passage + '\n\n' + it.question;
        if (part === 'D' || part === 'I') prompt = it.scenario + '\n\n' + it.task;
        if (part === 'G') prompt = it.question;

        out.push({
          ref,
          form: form.id,
          formName: form.name,
          part,
          level: form.level,
          skill: shape.skill,
          type: shape.type,
          prompt,
          options: it.options || [],
          answer: coAudio && ['E', 'H'].includes(part) ? it.script : (it.answer || ''),
          explanation: it.explanation || '',
          script: coAudio ? (it.script || '') : '',
          keyPoints: it.keyPoints || []
        });
      });
    }
  }

  return out;
}

/** One form's items, in part order — what a paper is assembled from. */
function itemsOf(formId) {
  return allItems().filter(i => i.form === formId);
}

module.exports = { FORMS, allItems, itemsOf, AUDIO_PARTS, SHAPE, PROMPTS };
