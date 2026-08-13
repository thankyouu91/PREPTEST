# The AI marking guideline

What the automated marker is told, what it is forbidden to do, and how a band
becomes a number on the 10–90 scale.

Read alongside [`docs/ACADEMIC.md`](ACADEMIC.md) for why the scale exists and
[`docs/VOICE.md`](VOICE.md) §6 for the marking machinery around it.

Everything the marker is told is **generated from `server/data/rubrics.js`** by
`server/marking-guide.js`. This document and the prompt the model receives are
therefore the same rubric. They cannot drift into disagreeing about what band 4
means, because there is only one band 4.

---

## 0. The boundary this whole design rests on

> **The model judges performance. The platform converts that judgement into a
> number. The model never sees the second job.**

The marker is not shown the 10–90 scale, is never asked for a score out of 90
or 100, and its response schema has **no field it could put one in**. It
returns a band from 0 to 6 per criterion, each with a quotation from the
candidate's own answer.

Three reasons, in descending order of what they would cost:

1. **A number the model invents cannot be audited.** A band with a quotation
   attached can be checked by a teacher in ten seconds and overturned. "GSE 61"
   can only be agreed with or argued about.
2. **This is the thing models do worse.** Matching a described standard to an
   observed performance is a task they are good at. Consistent numeric scaling
   across thousands of candidates is a task they are bad at.
3. **The anchors will move.** [`ACADEMIC.md`](ACADEMIC.md) §9 expects the
   band-to-scale mapping to be revised once there is candidate data. Marks
   stored as bands can all be recomputed. Marks the model wrote as numbers
   could not be.

---

## 1. What the marker returns

One object per part, validated against a strict JSON schema
(`markingGuide.responseSchema(part)`), with `additionalProperties: false` on
every level — a model that decides to add a `score` or a `cefr` field **fails
validation** rather than having the extra field quietly ignored. Silent
ignoring is how an invented number reaches a report.

```jsonc
{
  "criteria": {
    "content":  { "band": 4, "evidence": "\"the shop had closed early because of the storm\"",
                  "note": "Three of five key points recovered; the reason survived." },
    "fluency":  { "band": 3, "evidence": "\"she went to the— to the shop\"", "note": "" }
    // … one entry per criterion the part is marked on
  },
  "refusal": null,
  "transcript": "…",         // spoken parts: what was heard, verbatim
  "keyPointsCovered": 3      // content parts only — see §1.2
}
```

### 1.1 One criterion the marker is never asked for

**`accuracy` on part H is counted, not judged.** It is 50% of that part, and it
asks how much of a played sentence came back — a quantity with an exact answer.
`markingGuide.wordAccuracy()` aligns the transcript against the script word by
word and `rubrics.bandForMeasure()` turns the result into a band.

The criterion is therefore **absent from part H's schema entirely**, rather than
asked for and then overridden. Asking would put a guessed band in the response
that disagrees with the counted one, and nobody reading both could tell which
produced the mark.

It is still described in the prompt, marked `DO NOT return a band`, because a
marker who knows the transcript is measured word by word transcribes faithfully
instead of tidying. On part H the transcript *is* the graded artefact.

Words the candidate **added** are counted and shown to the marker but do not
reduce the score. The criterion's own `measurable` list names dropped and
substituted words and stops there, and its band 6 is "repeated exactly" — a
claim about the sentence coming back whole. Full word error rate, where an
insertion costs as much as a dropped word, would score a candidate who repeats
an eight-word sentence perfectly and then says "I think" at band 3. Exam
recordings are full of false starts and repeated words; charging for them marks
the candidate's nerves rather than their English.

### 1.2 Countable things come back as counts

Parts marked on `content` also return `keyPointsCovered`. The band descriptors
are percentages of the item's key points, so the count is what lets the
platform check the band against the rubric's own definition: band 5 reported
next to "2 of 6" is a contradiction a program can catch, which no amount of
prose in the prompt achieves. It is also what lets a report say "4 of 6"
instead of "some".

**Evidence is required, not optional.** A band without a quotation cannot be
checked, and a marker that cannot be checked is a marker that cannot be
corrected.

---

## 2. Bands, and how they become a scale position

### 2.1 The anchors

| Band | 0 | 1 | 2 | 3 | 4 | 5 | 6 |
|---|---|---|---|---|---|---|---|
| Scale | — | 26 | 33 | 47 | 63 | 80 | 87 |
| CEFR | — | A1 | A2 | B1 | B2 | C1 | C2 |

**Band 0 has no scale position, deliberately.** It is a performance that could
not be rated — not the absence of one. Collapsing it into the bottom of the
scale would tell a learner their English is at 10 when what happened is that
nothing gradable came back.

**Band 0 is not the same as not attempting.** Silence, an empty answer and an
unusable recording are *refusals* (§5), reported as "not attempted" and left
out of the average. Band 0 goes into the average and pulls the skill score
down. The two were blurred until 2026-08-13: three criteria named silence or
"nothing produced" as their band-0 evidence while the refusal table said the
same observation must never become band 0, so a marker reading both had two
rules pointing opposite ways. Band 0 descriptors now describe what was said,
never the absence of it, and a test enforces that.

### 2.2 Interpolation, not rounding

A part score is the weighted mean of its criterion bands, and lands between
anchors far more often than on one. `bandToGse()` interpolates:

```
band 3.0 → 47.0        band 3.4 → 53.4        band 4.0 → 63.0
```

Rounding 3.4 to band 3 would discard exactly the distance information that
having a continuous scale exists to provide ([`ACADEMIC.md`](ACADEMIC.md) §1).

### 2.3 Weighting happens on the band scale

Part weights (`H 25 · I 30 · J 45` for Speaking; `B 40 · D 60` for Writing) are
applied to **bands**, and the result is converted once.

This is not interchangeable with averaging converted numbers. The conversion is
not linear — band 3→4 spans 16 points, band 5→6 spans 7 — so averaging
converted numbers would quietly weight the middle of the scale more heavily
than the ends. Nobody decided that, so it must not happen by accident.

### 2.4 A partial result says so

`skillResult()` returns `weightCovered`. A Speaking result built from part H
alone covers 25% of the weight, and a report that does not say so invites the
reader to assume the other 75% agreed with it.

---

## 3. The band boundary bug this document was written after

The band table uses whole numbers — B1+ is 51–58, B2 starts at 59. A lookup
written as `score >= min && score <= max` therefore matches **nothing** for a
fractional score in any of the nine gaps between bands, and the old fallback
answered `'C2'` for anything it could not place.

A weighted result of **58.2 — a B1+ performance — was reported as C2**, and
would have been printed on a certificate.

The fix is in `descriptors.bandFor()`: bands are ordered, so the band a score
belongs to is the last one whose floor it has reached. That covers the
continuum with no gaps and needs no fallback above the bottom of the scale.

The general lesson is worth more than the fix: **a failed lookup must never
resolve upward.** If a scale cannot place a score, the answer is "cannot
place", never "top band".

### 3.1 The same class of bug, one level down

The two criteria stated as percentages — `accuracy` and `content` — wrote every
boundary into **both** of the bands it separates: "Word match 75–90%" sat next
to "90–97%", and "20–35% of key points" next to "35–55%". Every boundary, in
both criteria.

On `accuracy` those are not hypothetical values. Part H sentences run 7 to 13
words, and **nine words right out of ten is 90%** — the commonest
good-but-not-perfect result there is. Bands 4 and 5 both claimed it, on a
criterion carrying half the part. Three such values occur at real part H
lengths.

The fix is the same shape as the one above: the bands carry `range: [low, high)`
— low included, high excluded — so exactly one band claims any value, and
`bandForMeasure()` reads those numbers rather than the prose. The prose was
rewritten in whole per cent ("75–89%", "90–96%") so the two say the same thing.
A test sweeps the whole 0–1 interval and fails if any value lands in two bands
or in none.

**Where a range must not go:** only on criteria that are actually measured.
`bandForMeasure()` returns `null` for a judged criterion like fluency, because
inventing a numeric threshold for something nobody counts would be a worse
error than the ambiguity it replaced.

---

## 4. What the marker is told, per criterion

For every criterion the part is marked on, the prompt carries **all seven
bands**, each with its descriptor *and* the observable evidence that justifies
it. Example, from `rubrics.js`:

```
## Fluency (fluency) — 20% of this part
How smoothly speech runs, and where it breaks.

  6. Speaks as smoothly as a confident speaker of the language.
     Look for: Pauses are rhetorical, not searching.
  …
  4. Speaks at length with only occasional hesitation.
     Look for: Pauses fall where meaning divides; self-corrects without stopping.
  …
```

A marker told to "apply band 4 fluency" without the descriptor applies its own
idea of band 4, and nobody can later say why a mark came out as it did.

**Between two bands, choose the lower one and say so in `note`.** A mark that
is too generous is harder to challenge than one that is too harsh, because
nobody appeals a mark in their favour.

---

## 5. When the marker must refuse

| Code | Condition | Why it is not a zero |
|---|---|---|
| `no-response` | Empty, or silence only | "Not attempted" and "band 0 for language" mean different things to a learner and to a teacher |
| `too-short` | Under five words, or under three seconds | Not enough behaviour to place against six bands; guessing from a fragment is the fastest route to an indefensible mark |
| `off-task` | Does not address the prompt | Task criteria go to 0, **language criteria are still marked** — the candidate did demonstrate language |
| `not-english` | Substantially another language | Flagged for a human. Code-switching inside an otherwise English answer is not the same thing, and an automatic zero has been wrong often enough |
| `unintelligible-recording` | Too noisy, clipped or quiet to judge | A fault of the equipment. [`ACADEMIC.md`](ACADEMIC.md) §8: **a candidate must never lose points for their microphone** |

---

## 6. What must never move a mark

- The candidate's **accent**, where it does not reduce intelligibility.
- **Recording quality**, background noise, connection problems.
- The candidate's **name, gender, age**, or anything inferred from their voice.
- **Agreement with the opinion expressed** — only how well it is expressed.
- **Length beyond what the task asks.** A longer answer is not a better one.
- Surface slips in writing that do not impede meaning, beyond what the
  mechanics criterion already covers.

These are in the prompt verbatim and asserted in `scripts/test-authoring.mjs`,
so removing one breaks a test rather than quietly changing how people are
marked.

---

## 7. What cannot yet be claimed

Stated here rather than left implied, and consistent with
[`ACADEMIC.md`](ACADEMIC.md) §10:

1. **No measured agreement with human markers.** The benchmark set
   ([`VOICE.md`](VOICE.md) §6.5) does not exist yet. Until it does, every
   AI mark needs human review before it reaches a candidate.
2. **The band-to-scale anchors are judgement.** They are a designed mapping,
   not one derived from candidate performance.
3. **Accent bias has not been measured.** It is a documented risk in automated
   speech scoring and it will not surface on its own — it needs
   accent-labelled data and a deliberate look. Human review is what stands in
   the way until then.
4. **Marker consistency is untested.** Whether the same response marked twice
   gets the same band has not been measured. Once there is data, it is cheap to
   check and belongs beside the reliability figures in `ACADEMIC.md` §9.
5. **The cross-check layer is mostly declared, not built.** `rubrics.js` names
   17 quantities across its criteria's `measurable` lists and describes them as
   what "lets the engine flag a fluency band of 5 sitting next to a measured
   silence ratio of 70%". Five of the seventeen exist. **Twelve do not**, so no
   such flag can fire today:

   | State | Metrics |
   |---|---|
   | Computed (§1.1) | `wordErrorRate`, `wordsDropped`, `wordsSubstituted` |
   | Available already | `keyPointsCovered` (returned by the marker), `keyPointsTotal` (the item's own list) |
   | **Not built — text only, cheap** | `wordCount`, `paragraphCount`, `typeTokenRatio`, `spellingErrors`, `durationMs` |
   | **Not built — needs the vocabulary list** | `cefrBandCoverage` |
   | **Not built — needs audio analysis** | `silenceRatio`, `pauseCount`, `meanLengthOfRun`, `articulationRate`, `fillerCount`, `snrDb` |

   The five text-only metrics are an afternoon and would give `fluency`,
   `vocabulary` and `organisation` something to be checked against for the
   first time. The six audio metrics are real work — signal processing over
   every candidate recording — and that is a decision to take before starting,
   not after. Until then, `measurable` is a statement of intent, and this table
   is what keeps it from reading as a statement of fact.

---

## 8. Where this lives in code

| Piece | Where |
|---|---|
| Prompt, schema, refusals, conversion | `server/marking-guide.js` |
| Per-item half of the prompt — key points, the played sentence | `markingGuide.userPrompt()` |
| Word-level counting for `accuracy` | `markingGuide.wordAccuracy()` |
| The rubric everything is generated from | `server/data/rubrics.js` |
| Measured value → band, from the bands' own ranges | `rubrics.bandForMeasure()` |
| Band table and scale lookup | `server/data/descriptors.js` |
| Tests, including both boundary bugs above | `scripts/test-authoring.mjs` |
| Consistency gate | `npm run hoc-thuat` |
| What an item must carry to be markable | [`BLUEPRINT.md`](BLUEPRINT.md) |
