# The measurement framework

What the VPET practice suite measures, how the numbers are arrived at, and —
the part most documents like this leave out — what cannot yet be claimed.

Read alongside [`docs/VOICE.md`](VOICE.md) for the marking machinery,
[`docs/SCORING.md`](SCORING.md) for the scoring engine, and
[`docs/LEARNING.md`](LEARNING.md) for the self-study side.

---

## 0. What this platform claims, and what it does not

**Claims.** A practice result on this platform is an estimate of a learner's
English ability, reported on a continuous scale with a CEFR label, produced by
a documented process that can be inspected and challenged.

**Does not claim.** It is not a VPET result. It is not equated to one, it is
not issued by the awarding body, and a learner who scores B2 here has no
evidence they would score B2 there. The certificate says so on its face
([`docs/VOICE.md`](VOICE.md) §8.4).

That distinction is not modesty. Two exams that report on the same scale are
comparable only if they have been statistically linked, which requires a
sample of candidates who sat both. No such study exists here, so the honest
description is *practice test aligned to CEFR*, never *equivalent to VPET*.

Everything below is written so that a reader can decide for themselves whether
the numbers deserve trust, rather than being asked to take it on faith.

---

## 1. Why two scales

Results carry a **GSE-style 10–90 number** and a **CEFR band**. Each does
something the other cannot.

| | What it gives | What it cannot do |
|---|---|---|
| CEFR band | A label employers and schools recognise | Express distance. "B1" covers a range in which one learner is nearly B2 and another has just arrived |
| 10–90 scale | Distance, and therefore advice | Mean anything to somebody outside language teaching |

The gain is concrete. "You are B1" supports no advice beyond *keep studying*.
"You are at 55 and B2 begins at 59" supports the entire tips engine in
[`docs/VOICE.md`](VOICE.md) §8.2, and it makes progress across attempts visible
as a line rather than as three identical labels in a row.

**The cost, stated plainly.** A finer scale looks more precise than the
measurement behind it. Reporting 55 rather than B1+ invites a learner to read
a one-point change as real when it is well inside the error of any test this
length. Two mitigations, both in the product rather than in this document:
the report shows a position within a band rather than a bare number, and it
never celebrates a change smaller than the band width. **Reporting a
confidence interval once there is data to compute one is queued in section 9,
and until then the number is presented as a position, not a measurement.**

---

## 2. Band alignment

| CEFR | below A1 | A1 | A2 | A2+ | B1 | B1+ | B2 | B2+ | C1 | C2 |
|---|---|---|---|---|---|---|---|---|---|---|
| Scale | 10–21 | 22–29 | 30–35 | 36–42 | 43–50 | 51–58 | 59–66 | 67–75 | 76–84 | 85–90 |

These boundaries follow the published Global Scale of English alignment, and
the numbering is used as a common reference so that a score here means the same
thing as a score anywhere else using it.

**Two things about this need saying.**

First, **using the numbering is not the same as reprinting the descriptors.**
The GSE Learning Objectives are Pearson's material. This platform writes its
own can-do statements against the same numbers (section 5), which is why
`server/data/descriptors.js` contains 140 statements nobody else owns.
Confirm the position on the scale itself with Pearson before this is used
commercially at scale — it is a question for a lawyer, and it is cheap to ask
now and expensive to unwind later.

Second, **placing our items on that scale is currently judgemental.** Item
difficulty was set by expert judgement during authoring, not by trialling items
on candidates of known ability. That is a legitimate starting point and it is
not a substitute for data. Section 9 is the plan for replacing it.

The boundaries live in `scoring_scales` as data, not in code, so a revision is
an administrative act rather than a deployment ([`docs/SCORING.md`](SCORING.md)
§2.1, principle 2).

---

## 3. Two levels, and why a test should refuse to answer

VPET is sat at one of two levels.

| Level | Targets | Reliable range | Reports |
|---|---|---|---|
| **Level 1** | B1 and below | 10–50 | below A1 · A1 · A2 · A2+ · B1 |
| **Level 2** | B2 and above | 59–90 | B2 · B2+ · C1 · C2 |

A single test covering pre-A1 to C2 would waste most of its items on every
candidate: a C1 speaker gains nothing from a Level 1 dictation, and an A2
speaker gains nothing from an item they cannot attempt. Splitting the range
puts more items where each candidate's ability actually is, which is the whole
mechanism by which a shorter test can measure better.

**The consequence is a refusal, and the refusal is the point.** A Level 1 form
contains no item that distinguishes B2 from C1, so a C1 claim from it would
rest on no evidence. The engine clamps to the level's range and reports a
ceiling with a recommendation to sit Level 2 — see [`docs/VOICE.md`](VOICE.md)
§1.7. A test that reports a number it cannot support is worse than one that
declines, because the number gets believed.

The GSE 51–58 gap (B1+) belongs cleanly to neither level. Level 1 reports it as
at or above the ceiling; Level 2 reports it as below the floor. Both are true,
and neither pretends to a precision that is not there.

---

## 4. Weighting, and the argument for each number

### 4.1 The four skills

Overall = the mean of the four skill scores, unweighted.

Equal weighting is a claim, so it needs defending. The argument is that VPET
reports a general proficiency estimate rather than a purpose-specific one; no
skill is privileged because no single use case is assumed. A platform serving
one purpose — university admission, say, where reading and writing dominate —
would be justified in weighting differently, and would have to say so.

Averaging happens **on the numeric scale, then converts once**. Averaging CEFR
labels is meaningless, and converting each skill separately before averaging
accumulates rounding error across four skills.

### 4.2 Inside Speaking

`Speaking = 0.25 × H + 0.30 × I + 0.45 × J`

| Part | Items | Weight | Why this number |
|---|---:|---:|---|
| H Repeat | 10 | 25% | Measured most precisely of the three — there is a reference answer, so accuracy is computed rather than judged. But it measures narrowly: repetition is a phonological and working-memory task, not a productive one. A candidate can drill it and improve their score without becoming able to speak. The low ceiling is a deliberate guard against exactly that. |
| I Situations | 2 | 30% | Genuine free production, which is what the construct is. Only two items, so the sampling error is large — one bad topic moves the score more than it should. |
| J Retellings | 3 | 45% | Most items, longest samples, and it measures content transfer alongside language. Three 90-second samples give the marker far more to work with than two 60-second ones, which is why it carries the most weight. |

**The tension, acknowledged.** The most reliably measured part carries the
least weight, and the most heavily weighted part is the one marked by
judgement. That is deliberate: reliability is worth little if the thing being
measured reliably is not the thing you care about. A test that weighted by
precision alone would score repetition ability and call it speaking.

### 4.3 Criteria within each part

| Criterion | H | I | J |
|---|---:|---:|---:|
| accuracy — word match | **50%** | – | – |
| content coverage | – | – | **25%** |
| task & register | – | **30%** | – |
| coherence | – | 10% | 15% |
| fluency | 20% | 20% | 20% |
| pronunciation | **30%** | 15% | 15% |
| vocabulary | – | 15% | 15% |
| grammar | – | 10% | 10% |

The blank cells are the substantive part.

**Vocabulary and grammar are not scored on part H** because the item supplies
the words. Scoring them would score the item writer. This is the most common
error in repeat-task rubrics and it inflates scores for candidates who have
understood nothing.

**Accuracy is not scored on I and J** because there is no reference text. On J
the equivalent is content coverage, checked against the key points the author
listed with the story — which is why every story in `server/data/vpet-scripts.js`
carries six of them.

**Fluency and pronunciation appear on all three** because they are the only two
constructs observable across the whole section, and — usefully — the only two
the deterministic metrics layer can cross-check numerically
([`docs/VOICE.md`](VOICE.md) §6.2). A rubric score for fluency that contradicts
a measured silence ratio of 70% is a flag, not a score.

---

## 5. The can-do descriptors

`server/data/descriptors.js` holds **140 statements**, 35 per skill, spanning
A1 to C2.

**Written in-house, deliberately.** Two established sets exist — the Council of
Europe's CEFR illustrative descriptors and Pearson's GSE Learning Objectives —
and both are somebody else's work under somebody else's terms. This platform
would be republishing them in a report, on a certificate and in study material,
at scale, commercially. Writing our own costs time once and settles the
question permanently.

**How they are constructed.**

- One observable ability per statement. Two joined by "and" cannot be half true,
  and a marker forced to choose will choose inconsistently.
- Phrased from the learner's side. *"You can repair a sentence you have started
  badly and carry on"* is something a learner recognises about themselves;
  *"demonstrates control of self-repair strategies"* is not.
- Placed at the point on the scale where the ability becomes **dependable**, not
  where it first appears. The difference matters because the report uses the
  placement as a target, and a target a learner hit once by luck is discouraging
  rather than motivating.

**How the report uses them.** `profile(skill, gse)` returns the band, the
position inside it, the distance to the next boundary, what the learner can
already do, and the nearest abilities above their score ordered by distance.
That ordering is the entire practical value of a continuous scale — a learner at
55 is shown the 56 and 58 statements before the 60 one, because those are the
ones within reach this term.

**Their status.** These are expert-written and have not been validated against
learner performance. A descriptor claiming an ability appears at 56 is a
hypothesis until enough candidates at 56 have demonstrated it. Section 9 says
how that gets checked.

---

## 6. Content validity: what each part is evidence for

Validity is not a property a test has; it is an argument about a particular
use. The argument here is per part.

| Part | Construct | Evidence it gives | What it does not license |
|---|---|---|---|
| A Sentence Completion | Grammatical and collocational control in context | Accuracy under production conditions | Nothing about extended writing |
| B Passage Reconstruction | Holding and reproducing meaning in writing | Reading-to-write transfer, memory for structure | Not free composition; the ideas are supplied |
| C Reading Comprehension | Understanding short written text | Literal and inferential comprehension | Not reading at length or under time pressure |
| D E-Mail Writing | Functional writing in a set register | Task fulfilment, tone, accuracy | Not academic or argumentative writing |
| E Dictation | Phonological decoding plus orthography | Fine-grained listening, spelling | Not comprehension — a candidate can transcribe what they do not understand |
| F Response Selection | Pragmatic listening | Recognising the function of an utterance | Not extended listening |
| G Passage Comprehension | Extended listening | Following a spoken text and locating information | Not interaction, which is untested here |
| H Repeat | Phonological and prosodic control | Pronunciation, working memory for language | Not speaking ability; the language is supplied |
| I Speaking Situations | Free production in context | Task, register, spontaneous fluency | Only two samples — treat as indicative |
| J Story Retellings | Listening-to-speaking transfer | Content retention plus language production | Not interactive speaking |

**The gap worth naming: nothing here tests interaction.** VPET as implemented
measures production into a microphone, not conversation. That is a real limit
of any recorded speaking test, and a learner who scores well may still struggle
in a live exchange where they must listen and respond in real time. The report
should not imply otherwise.

---

## 7. Reliability: what cannot yet be claimed

**No reliability coefficient can be reported, because there is no candidate
data.** Every number in this document is a design decision, not a measurement.
Saying so is the difference between a framework and a brochure.

What will be computable once attempts exist, in the order it becomes worth
computing:

| Measure | What it answers | Needs |
|---|---|---|
| Item facility (p-value) | Is this item too easy or too hard to tell anyone apart? | ~100 attempts per item |
| Item discrimination | Do stronger candidates get this item right more often? | ~100 attempts per item |
| Distractor analysis | Is any wrong option attracting nobody, or attracting strong candidates? | ~100 attempts |
| Internal consistency (α or ω) | Do the items in a section measure one thing? | ~200 attempts |
| Marker agreement | Does the AI marker agree with a human? | ~50 double-marked responses |
| Standard error of measurement | How wide is the band around a reported score? | Follows from consistency |

The last one is what makes an honest report possible. A score of 55 with a
standard error of 3 means B2 is not ruled out, and a learner deserves to know
that before they decide whether to sit the real exam.

**Discrimination is the one that changes the item bank.** An item everybody
gets right and an item everybody gets wrong both contribute nothing but
fatigue. An item that strong candidates get wrong more often than weak ones is
worse than useless — it is actively misleading, and it is nearly always a
flawed key or an ambiguous distractor rather than a hard item.

---

## 8. Fairness

Three fairness questions apply to this platform specifically.

**Content bias.** Items assuming knowledge a Vietnamese learner would not have
measure background, not English. The scripts in
`server/data/vpet-scripts.js` were written against this constraint. Once there
is data, differential item functioning can be checked between groups; until
then it rests on authorial judgement, which is weaker.

**Technical bias.** Speaking parts are marked from a recording, so microphone
quality, background noise and connection stability all enter the score. The
metrics layer measures a signal-to-noise ratio for exactly this reason: a poor
recording should be flagged, not marked as poor pronunciation. **A candidate
must never lose points for their equipment.**

**Marker bias.** An AI marker may be systematically harsher on some accents.
This is a documented risk in automated speech scoring and it is not a
hypothetical. Detecting it requires accent-labelled data and a deliberate look;
it will not surface on its own. Until that check has been run, human review of
every attempt is what stands in the way ([`docs/VOICE.md`](VOICE.md) §8.1).

---

## 9. What to do when real data arrives

A concrete sequence, in dependency order, so this document has consequences.

**After roughly 100 attempts**

1. Compute facility and discrimination per item. Retire anything with
   discrimination below 0.15, and review anything negative as a suspected key
   error before assuming it is a hard item.
2. Run distractor analysis on every multiple-choice item. A distractor chosen
   by nobody is a wasted option; one chosen by strong candidates is a warning.
3. Compare observed difficulty against the level it was authored for. Items
   that land in the wrong level get re-tagged rather than rewritten.

**After roughly 200 attempts**

4. Compute internal consistency per section, and a standard error of
   measurement from it. **Then start showing a confidence range on the report**,
   which is the single largest honesty improvement available.
5. Review the band boundaries against the observed distribution. If a form
   places nobody below A2, either the population or the boundaries are wrong,
   and both are worth knowing.

**Alongside, from the first double-marked responses**

6. Build the benchmark set: 30–50 responses marked by teachers, held out
   ([`docs/VOICE.md`](VOICE.md) §6.5). Nothing about the AI marker can be
   claimed without it, and it is also the only way to evaluate a model upgrade
   rather than hoping.
7. Track AI ↔ human agreement per part and per criterion. A drop there is the
   earliest warning that anything in the marking chain has broken.

**Continuously**

8. Check the descriptor placements against performance. If candidates at 56
   routinely fail the ability placed at 56, the placement is wrong, not the
   candidates.

---

## 10. Limitations

Stated together, so nobody has to assemble them from footnotes.

1. **Not equated to VPET.** Aligned to CEFR by design and judgement; no linking
   study exists.
2. **No empirical reliability.** Every figure here is a design decision until
   candidate data exists.
3. **Item difficulty is judged, not trialled.** Expert placement is a starting
   point, not evidence.
4. **Interaction is untested.** Recorded speaking is not conversation.
5. **Two items in part I.** Sampling error on that part is large and the weight
   partly reflects it.
6. **AI marking is unvalidated.** No measured agreement with human markers yet.
7. **Descriptors are expert-written and unvalidated.** Plausible, not verified.
8. **Scale precision exceeds measurement precision.** A one-point difference is
   not meaningful, and the product must not present it as though it were.

None of these makes the platform unfit for what it is — a practice test that
tells learners where they stand and what to do next. All of them would make it
unfit to certify anyone, which is why it does not.
