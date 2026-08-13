/**
 * The AI marker's instructions, and the arithmetic it is not allowed to do.
 *
 * ---------------------------------------------------------------------------
 * THE BOUNDARY THIS FILE EXISTS TO ENFORCE
 *
 * The model judges performance. The platform converts that judgement to a
 * number. Those are two jobs and the model only gets the first one.
 *
 * So the marker is never shown the GSE scale, never asked for a score out of
 * 90, and its response schema has no field it could put one in. It returns a
 * band from 0 to 6 per criterion, with a quotation from the candidate's own
 * answer as evidence. `bandToGse()` below does the rest.
 *
 * Three reasons, in descending order of how much they would cost:
 *
 *   1. A number the model invents cannot be audited. A band with a quotation
 *      attached can be checked by a teacher in ten seconds, and overturned.
 *   2. Language models are poor at consistent numeric scaling and good at
 *      matching a description to a performance. Asking for 63 rather than
 *      "band 4" is asking for the thing it does worse.
 *   3. If the band-to-GSE anchors move — and section 9 of docs/ACADEMIC.md
 *      expects them to, once there is data — every mark ever given can be
 *      recomputed. Marks the model wrote as numbers could not be.
 * ---------------------------------------------------------------------------
 *
 * Everything the marker is told is generated from `data/rubrics.js`. The
 * document a human reads (docs/MARKING.md) and the prompt the model receives
 * are therefore the same rubric, and cannot drift into disagreeing about what
 * band 4 means.
 */
'use strict';

const rubrics = require('./data/rubrics');
const descriptors = require('./data/descriptors');

/* The scale runs 10-90 (docs/ACADEMIC.md §2). Band 0 is not a point on it:
   it means nothing markable was produced, which is a different statement from
   "performed at the bottom of the scale" and is reported as such. */
const SCALE_MIN = 10;
const SCALE_MAX = 90;

/**
 * Turn a rubric band into a position on the 10-90 scale.
 *
 * `rubrics.BAND_GSE` anchors six of the seven bands; this interpolates between
 * them so a weighted part score of 3.4 lands between band 3 and band 4 rather
 * than being rounded to one of them. Rounding would throw away exactly the
 * distance information the two-scale design exists to provide
 * (docs/ACADEMIC.md §1).
 *
 * @param {number} band 0-6, fractional allowed
 * @returns {number|null} 10-90, or null when nothing was produced
 */
function bandToGse(band) {
  const b = Number(band);
  if (!Number.isFinite(b) || b <= 0) return null;

  const anchors = [];
  for (let i = 1; i <= 6; i++) {
    const g = rubrics.BAND_GSE[i];
    if (g != null) anchors.push({ band: i, gse: g });
  }
  /* Below the first anchor, interpolate down to the floor of the scale rather
     than clamping: a candidate who scored 0.5 did produce something, and
     flattening every such performance onto one number would hide the
     difference between "barely started" and "nearly band 1". */
  if (b <= anchors[0].band) {
    const t = b / anchors[0].band;
    return round1(SCALE_MIN + t * (anchors[0].gse - SCALE_MIN));
  }
  const last = anchors[anchors.length - 1];
  if (b >= last.band) return round1(Math.min(SCALE_MAX, last.gse));

  for (let i = 0; i < anchors.length - 1; i++) {
    const lo = anchors[i], hi = anchors[i + 1];
    if (b >= lo.band && b <= hi.band) {
      const t = (b - lo.band) / (hi.band - lo.band);
      return round1(lo.gse + t * (hi.gse - lo.gse));
    }
  }
  return null;
}

const round1 = n => Math.round(n * 10) / 10;

/** One part's criterion bands → a part score, a scale position and a CEFR band. */
function partResult(part, scores) {
  const score = rubrics.partScore(part, scores);
  if (score == null) return null;
  const gse = bandToGse(score);
  return {
    part,
    bandScore: round1(score),
    gse,
    cefr: gse == null ? null : descriptors.bandFor(gse)
  };
}

/**
 * Combine parts into one skill result, using the published part weights.
 *
 * Weighted on the **band scale**, not on the converted numbers. The conversion
 * is not linear — band 3 to 4 is 16 points, band 5 to 6 is 7 — so averaging
 * converted numbers would silently weight the middle of the scale more heavily
 * than the ends, which is not a decision anybody made.
 */
function skillResult(skill, partScores) {
  const weights = skill === 'speaking' ? rubrics.SPEAKING_PART_WEIGHTS
    : skill === 'writing' ? rubrics.WRITING_PART_WEIGHTS : null;
  if (!weights) throw new Error('No part weights for skill: ' + skill);

  let total = 0, used = 0;
  const parts = [];
  for (const [part, weight] of Object.entries(weights)) {
    const scores = partScores[part];
    if (!scores) continue;
    const r = partResult(part, scores);
    if (!r) continue;
    parts.push(Object.assign({ weight }, r));
    total += r.bandScore * weight;
    used += weight;
  }
  if (!used) return null;

  const bandScore = total / used;
  const gse = bandToGse(bandScore);
  return {
    skill,
    bandScore: round1(bandScore),
    gse,
    cefr: gse == null ? null : descriptors.bandFor(gse),
    /* Which parts actually contributed. A speaking result built from part H
       alone is a different claim from one built from all three, and a report
       that does not say so invites the reader to assume the stronger one. */
    parts,
    weightCovered: used
  };
}

/* ------------------------------------------------------------------ */

/** Conditions under which the marker must refuse rather than guess. */
const REFUSALS = [
  { code: 'no-response', when: 'The response is empty, or silence only.',
    note: 'Reported as "not attempted", never as band 0 for language — the two mean different things to a learner and to a teacher.' },
  { code: 'too-short', when: 'Fewer than five words, or under three seconds of speech.',
    note: 'There is not enough behaviour to place against six bands. Guessing from a fragment is the fastest way to an indefensible mark.' },
  { code: 'off-task', when: 'The response does not address the prompt at all.',
    note: 'Task criteria go to band 0; language criteria are still marked on what was produced, because the candidate did demonstrate language.' },
  { code: 'not-english', when: 'The response is substantially in another language.',
    note: 'Flagged for a human. An automatic zero here has been wrong often enough — code-switching inside an otherwise English answer is not the same thing.' },
  { code: 'unintelligible-recording', when: 'The audio is too noisy, clipped or quiet to judge.',
    note: 'A fault of the equipment, not the candidate. docs/ACADEMIC.md §8 — a candidate must never lose marks for their microphone.' }
];

/** Things that must never move a mark, stated so they can be tested against. */
const NEVER = [
  'The candidate\'s accent, where it does not reduce intelligibility.',
  'Recording quality, background noise, or connection problems.',
  'The candidate\'s name, gender, age, or anything inferred from their voice.',
  'Agreement with the opinion expressed — only how well it is expressed.',
  'Length beyond what the task asks for. A longer answer is not a better one.',
  'Handwriting-style surface slips in writing that do not impede meaning, beyond what the mechanics criterion already covers.'
];

/**
 * The marker's instructions for one part, built from the rubric itself.
 *
 * Long on purpose. Every band the model can choose is spelled out with both
 * its descriptor and the observable evidence that justifies it, because a
 * marker asked to apply "band 4 fluency" from memory will apply its own idea
 * of band 4 and nobody will be able to say why a mark came out as it did.
 */
function systemPrompt(part) {
  const rubric = rubrics.PART_RUBRICS[part];
  if (!rubric) throw new Error('No rubric for part ' + part);

  const lines = [];
  lines.push(`You are marking VPET part ${part} — ${rubric.name}.`);
  lines.push('');
  lines.push('Return a band from 0 to 6 for each criterion below, with a short quotation');
  lines.push('from the candidate\'s own response as evidence for each one. Quote what they');
  lines.push('actually produced; do not paraphrase and do not invent.');
  lines.push('');
  lines.push('Do not return a score out of 100, a percentage, a CEFR level, or a number on');
  lines.push('any other scale. Bands and evidence only — the platform converts them.');
  lines.push('');

  for (const [name, weight] of Object.entries(rubric.criteria)) {
    const c = rubrics.CRITERIA[name];
    lines.push(`## ${c.label} (${name}) — ${weight}% of this part`);
    lines.push(c.what);
    lines.push('');
    for (const b of [...c.bands].sort((x, y) => y.band - x.band)) {
      lines.push(`  ${b.band}. ${b.descriptor}`);
      lines.push(`     Look for: ${b.evidence}`);
    }
    lines.push('');
  }

  lines.push('## When not to mark');
  for (const r of REFUSALS) {
    lines.push(`- ${r.code}: ${r.when} ${r.note}`);
  }
  lines.push('');
  lines.push('## What must never affect a band');
  for (const n of NEVER) lines.push(`- ${n}`);
  lines.push('');
  lines.push('If you are between two bands, choose the lower one and say so in `note`.');
  lines.push('A mark that is too generous is harder to challenge than one that is too');
  lines.push('harsh, because nobody appeals a mark in their favour.');

  return lines.join('\n');
}

/**
 * What the marker is shown about *this* item and *this* response.
 *
 * `systemPrompt()` is the rubric and is identical for every candidate sitting
 * the part. This is the half that varies, and it exists because two of the
 * criteria cannot be applied without it:
 *
 *   · `content` (parts B and J) states its bands as percentages of key points
 *     covered — 20%, 35%, 55%, 75%, 90%. A percentage needs a denominator, and
 *     the denominator is the item's key points. Without them the model has to
 *     invent its own idea of what the source contained, which is exactly the
 *     unauditable judgement this file exists to prevent.
 *   · `task` (parts D and I) reaches band 4 when "all required elements present
 *     and identifiable". Somebody has to say which elements those are. If the
 *     model derives the list from the prompt on every run, two markings of the
 *     same script can disagree about how many elements there were, and band 4
 *     silently means different things for two candidates who wrote the same
 *     email. The list is pinned to the item so the band is reproducible.
 *
 * Part H needs neither: its reference is the sentence that was played, and
 * `accuracy` is measured against that directly.
 *
 * The answer key is never included. On the parts marked here there isn't one —
 * but stating it is the rule keeps a later part from acquiring one by accident.
 */
function userPrompt(part, item, response) {
  const rubric = rubrics.PART_RUBRICS[part];
  if (!rubric) throw new Error('No rubric for part ' + part);
  const criteria = Object.keys(rubric.criteria);
  const keyPoints = (item && item.keyPoints) || [];

  const lines = [];
  lines.push('## What the candidate was asked');
  lines.push(String((item && item.prompt) || '').trim());
  lines.push('');

  /* Which reference to show is decided by which criterion is in play, not by a
     list of part letters, so a new part gets the right reference by declaring
     its criteria rather than by being added here. */
  if (criteria.includes('accuracy')) {
    lines.push('## The sentence that was played');
    lines.push(String((item && item.script) || (item && item.answer) || '').trim());
    lines.push('');
    lines.push('Mark `accuracy` by comparing what you heard against that sentence,');
    lines.push('word by word. Do not reward a fluent paraphrase: this part asks for');
    lines.push('repetition, and a better sentence than the one played is still wrong.');
    lines.push('');
  }

  if (criteria.includes('content')) {
    lines.push(`## The ${keyPoints.length} key points of the source`);
    keyPoints.forEach((k, i) => lines.push(`  ${i + 1}. ${k}`));
    lines.push('');
    lines.push('Count a point as covered when the candidate conveys it in their own');
    lines.push('words. Matching the source wording is not required and is not worth');
    lines.push('extra — the task is to reconstruct the meaning, not to memorise.');
    lines.push('Return the count in `keyPointsCovered`, and make sure the `content`');
    lines.push('band you choose is the one that count falls into.');
    lines.push('');
  }

  if (criteria.includes('task')) {
    lines.push(`## The ${keyPoints.length} elements this task requires`);
    keyPoints.forEach((k, i) => lines.push(`  ${i + 1}. ${k}`));
    lines.push('');
    lines.push('These are the elements `task` is marked against. Judge each one on');
    lines.push('whether it is present and identifiable, not on how elegantly it is');
    lines.push('put — the other criteria mark the language. A missing element costs');
    lines.push('marks that correct English cannot recover.');
    lines.push('');
  }

  lines.push('## The response');
  const text = String(response == null ? '' : response).trim();
  lines.push(text || '(nothing was submitted)');

  return lines.join('\n');
}

/**
 * The JSON schema the marker must answer in.
 *
 * Strict, with `additionalProperties: false` on every object, so a model that
 * decides to add a `score` or a `cefr` field fails validation instead of
 * having the extra field quietly ignored — which is how an invented number
 * ends up in a report.
 */
function responseSchema(part) {
  const rubric = rubrics.PART_RUBRICS[part];
  if (!rubric) throw new Error('No rubric for part ' + part);

  const props = {};
  for (const name of Object.keys(rubric.criteria)) {
    props[name] = {
      type: 'object',
      additionalProperties: false,
      properties: {
        band: { type: 'integer', minimum: 0, maximum: 6 },
        evidence: { type: 'string', minLength: 1, maxLength: 400,
          description: 'A quotation from the candidate\'s response supporting this band.' },
        note: { type: 'string', maxLength: 300 }
      },
      required: ['band', 'evidence', 'note']
    };
  }

  const schema = {
    type: 'object',
    additionalProperties: false,
    properties: {
      criteria: {
        type: 'object', additionalProperties: false,
        properties: props, required: Object.keys(props)
      },
      refusal: {
        type: ['string', 'null'],
        enum: [...REFUSALS.map(r => r.code), null],
        description: 'Set when the response cannot be marked; criteria bands are then ignored.'
      },
      transcript: { type: 'string', maxLength: 4000,
        description: 'For spoken parts: what you heard, verbatim.' }
    },
    required: ['criteria', 'refusal', 'transcript']
  };

  /* The `content` criterion declares its measurable quantities as
     keyPointsCovered and keyPointsTotal, and its bands are stated as
     percentages of them. Asking for the count back is what lets the platform
     check the band against its own definition — a model that reports 2 of 6
     covered and then awards band 5 has contradicted itself in a way that can
     be caught automatically, which no amount of prose in the prompt achieves.
     It is also what lets a report say "4 of 6" instead of "some". */
  if (Object.keys(rubric.criteria).includes('content')) {
    schema.properties.keyPointsCovered = { type: 'integer', minimum: 0,
      description: 'How many of the listed key points the response conveys.' };
    schema.required.push('keyPointsCovered');
  }

  return schema;
}

/** Every part the AI marker is allowed to touch. */
const MARKED_PARTS = Object.keys(rubrics.PART_RUBRICS);

module.exports = {
  SCALE_MIN, SCALE_MAX, REFUSALS, NEVER, MARKED_PARTS,
  bandToGse, partResult, skillResult, systemPrompt, userPrompt, responseSchema
};
