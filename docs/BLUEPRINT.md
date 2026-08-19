# The item blueprint

What one VPET item has to look like, part by part, so that the bank can be
grown by more than one person without the parts quietly drifting apart.

Read alongside [`docs/MARKING.md`](MARKING.md) for what happens to an item once
a candidate has answered it, [`docs/VOICE.md`](VOICE.md) for the audio pipeline,
and [`docs/ACADEMIC.md`](ACADEMIC.md) for why the levels are what they are.

---

## 0. Why this document is short and the checker is not

The bank holds 407 items: the original 132, plus five complete papers of 55.
Growing it further means several authors, or a model, at several different
times — and at that point the only thing keeping part C at four options, part B
with something to mark against, and part A down to a single missing word, is a
check that **runs**.

It earns this on the five forms already. Writing them, the checker caught four
passages short of the 50-word target, six dictation sentences outside the
10–14 word band, and a part E whose average sentence length would not have fit
its clock — none of which reading the file would have shown.

So the rules below come in two kinds, and it is worth knowing which you are
reading. **Shape** is checked by a program. **Craft** is not, and cannot be.

```
npm run kiem-noi-dung          # every item, every shape rule, grouped by fault
node scripts/kiem-noi-dung.mjs --part=B     # one part
node scripts/kiem-noi-dung.mjs --gon        # failures only
```

It exits non-zero when anything is wrong, and `scripts/verify.sh` runs it, so a
malformed item cannot reach a candidate through a green build.

Everything it verifies, in full — if a rule is not on this list, no program is
going to catch you breaking it:

| | Checked |
|---|---|
| Every item | part exists in the blueprint; `type` and `skill` match what the part declares; level is one of A2/B1/B2/C1; the prompt is not empty |
| Audio | a script exists on every audio part, and on no silent one |
| mcq (C, F, G) | exactly 4 options, all distinct, none empty, the answer among them |
| gap (A, E) | an answer exists; part A shows a visible gap and every answer variant is one word |
| E and H | the answer matches the script once case and punctuation are normalised |
| D | the prompt states the register in words |
| B, D, I, J | enough key points for the criterion that marks them, none too short, none duplicated |
| Scripts | proper nouns appearing mid-sentence that are not on the allowlist of names an English voice says correctly |

The checker holds no copy of these rules. It reads the part table from
`server/data/exam-formats.js` and the marking weights from
`server/data/rubrics.js`, so **this document, the checker and the exam are the
same facts stated once.** Change the blueprint and the checker changes with it;
change this document alone and you have changed nothing.

What it cannot see is in §9, and it is most of what makes an item good.

---

## 1. Where an item goes

| File | Parts | Why |
|---|---|---|
| `server/data/vpet-items.js` | A, B, C, D, I | The original bank, no audio. Loaded at startup by `seedVpetItems()`, matched on `ext_key`. |
| `server/data/vpet-scripts.js` | E, F, G, H, J | The original bank, audio. Imported by `node scripts/nhap-kich-ban.js`. |
| `server/data/forms/vpet-form-N.js` | **all ten** | One complete paper per file. Imported by `node scripts/nhap-bo-de.js`, which sorts out audio from the blueprint. |

The split is enforced in both directions. An item in an audio part without a
script fails; an item in a silent part that carries one also fails, because it
would show a "Build MP3" button on a part that never plays anything.

**New material goes in a form file.** Splitting each paper in half by whether a
part happens to play audio follows the two old import commands, not anything
about the exam, and at five papers it makes a form impossible to read as a
form. A form file is one sitting, all ten parts of it.

**Never put the same item in two files.** They are separate import paths writing
to one table, and the paper builder would draw whichever copy it happened to
hit.

---

## 2. What every item carries

| Field | Rule |
|---|---|
| key / ref | Unique. `vpet-<part>-<nn>` in `vpet-items.js` (`vpet-b-01`); `<PART><n>-L<level>` in `vpet-scripts.js` (`J1-L1`), where the `-L1` / `-L2` suffix is added by `allItems()` from whichever list the item is in. |
| level | `A2`, `B1`, `B2` or `C1`. In `vpet-scripts.js` it comes from which list the item is in — level 1 is B1, level 2 is B2. |
| skill | Must equal the skill the part table declares. Not a free choice. |
| type | Must be one the part table accepts. |
| prompt | Real displayed text. Never empty, never a placeholder. |
| explanation | A note to whoever marks or reviews it. Why this answer, what the trap is. |

---

## 3. The parts

Counts are per paper. "Pool" is what the bank holds today, and "Plays" is how
many times an audio item may be heard in total (§5a).

| | Part | Skill | Type | Items | Min | Plays | Pool |
|---|---|---|---|---|---|---|---|
| A | Sentence Completion | writing | gap | 10 | 10 | — | 80 |
| B | Passage Reconstruction | writing | essay | 3 | 9 | — | 23 |
| C | Reading Comprehension | reading | mcq | 3 | 6 | — | 23 |
| D | E-Mail Writing | writing | essay | 2 | 18 | — | 18 |
| E | Dictation | listening | gap | 8 | 6 | 2 | 56 |
| F | Response Selection | listening | mcq | 8 | 4 | 3 | 56 |
| G | Passage Comprehension | listening | mcq | 6 | 6 | **1** | 42 |
| H | Repeat | speaking | speaking | 10 | 4 | 1 | 70 |
| I | Speaking Situations | speaking | speaking | 2 | 4 | — | 18 |
| J | Story Retellings | speaking | speaking | 3 | 9 | 1 | 21 |

55 items, 76 minutes.

### Part A — Sentence Completion

One sentence with one gap, marked automatically against an answer key.

- The gap must be **visible in the prompt** as two or more underscores.
- **Each accepted answer is one word.** Alternatives are separated by `|`, and
  every alternative must still be a single word — the interface gives the
  candidate one box, so a two-word answer is unenterable and marks as wrong.
- Write the explanation so it names the *pattern*, not just the answer, and say
  what the near-miss is. `'on the grounds that + clause. "on the grounds of" is
  the other half of the pair and needs a noun.'`
- Difficulty comes from the collocation being fixed, not from obscure
  vocabulary.

### Part B — Passage Reconstruction

A passage is shown, hidden, and rebuilt from memory in the candidate's own
words.

- Passage length **around 50 words**. Long enough that copying it out of memory
  is not the task, short enough to hold.
- Give it a turn — a "but", a surprise, a hedge. The current items all have one,
  and it is what makes a reconstruction checkable: a version that keeps every
  fact but drops the reversal has demonstrably lost the passage.
- **Exactly 6 key points** (§4).
- Marked `content 40 · grammar 25 · vocabulary 20 · mechanics 15`.

### Part C — Reading Comprehension

A short passage and one question.

- **Exactly 4 options**, all distinct, none empty, and the answer must be one of
  them.
- Every distractor must be **traceable to the passage**. An option that mentions
  nothing in the text is not a distractor, it is padding, and it turns a
  four-way item into a three-way one.
- The good pattern in the bank: the passage draws a line precisely, and each
  distractor moves that line — to a total reversal, to none at all, or to the
  opposite side.

### Part D — E-Mail Writing

- **Name the register in the prompt**, in words — "Use a formal register
  throughout", "Keep the tone friendly but clear", "Keep the tone polite but
  firm". This is checked, because `task` marks register and an item that never
  states it penalises the candidate for a requirement nobody told them. Three
  items (D-03, D-05, D-06) were missing it and have been given one.
- **Name the relationship**, because that is where the register comes from: a
  neighbour, a supplier, a landlord, your own manager.
- State a word count — 120 at B1, 150 at B2 in the current items.
- The prompt lists what the email must do, typically three things. Those become
  the key points, plus one for register: **at least 4** (§4).
- Marked `task 35 · grammar 20 · organisation 15 · vocabulary 15 · mechanics 15`.

### Part E — Dictation

The candidate types the sentence they hear.

- **The answer is the script**, and the checker compares the two after
  normalising case and punctuation. They must agree.
- 10–14 words in the current items, which is what fits the clock.
- No proper nouns outside common English ones. Kokoro is an English model and
  will mispronounce them — on a part that is pure transcription, that costs the
  candidate marks for the platform's mistake. The checker flags unrecognised
  capitalised words.

### Part F — Response Selection

A short spoken line; the candidate picks the reply that fits.

- Script is short — 15–64 characters today, about 4 seconds.
- **Exactly 4 options**, distinct, answer among them.
- The options are read on screen, not played, so they may be longer than the
  prompt.

### Part G — Passage Comprehension

A longer spoken passage with comprehension questions.

- Passage around **85 words / 30 seconds**.
- **Exactly 4 options** per question.
- The passage plays **once** (§5a). Write it so one hearing is enough: the
  question should turn on something stated, not on a detail a listener would
  need to go back for. Several of the strongest items in the bank name the
  answer and then name three things it is not, which is a shape that survives
  a single hearing.

### Part H — Repeat

The candidate says the sentence back.

- **The answer is the script**, taken from it directly rather than retyped —
  `allItems()` does this, so the two cannot drift.
- 7–13 words. Long enough to test memory, short enough to hold in one span.
- Marked `accuracy 50 · pronunciation 30 · fluency 20`. Deliberately no
  vocabulary or grammar: the words were given.
- No key points. The reference is the sentence itself.

### Part I — Speaking Situations

Read a situation, speak for up to a minute. No audio.

- **Name the relationship and the difficulty.** Register in speech comes from
  who is being spoken to, so "a colleague you know well", "your manager", "a
  small cafe that is not busy" are load-bearing, not scene-setting. This is why
  part I, unlike part D, does not have to state the register in words — the
  relationship carries it. All eight items name one.
- The difficulty should be a genuine conflict, not just a task: decline without
  explaining, be honest without wounding, interrupt without embarrassing.
- The prompt lists what to do, plus register: **at least 4** key points (§4).
- Marked `task 30 · fluency 20 · pronunciation 15 · vocabulary 15 · grammar 10
  · coherence 10`.

### Part J — Story Retellings

Heard once, retold.

- ~740 characters, about 47 seconds.
- Use `_` to mark a paragraph break in the script; it becomes a longer pause.
- **Exactly 6 key points** (§4), which is what the current items already carry.
- End on something retellable — a lesson, a reversal, a point. Every current
  item does, and it gives the sixth key point somewhere to be.
- Marked `content 25 · fluency 20 · coherence 15 · pronunciation 15 ·
  vocabulary 15 · grammar 10`.

---

## 4. Key points

`keyPoints` is one field with **two different meanings**, decided by which
criterion the part is marked on. Get this wrong and the item marks the wrong
thing.

### On `content` parts (B, J) — what the source said

The band descriptors are written as percentages of key points covered, so the
list is not a note to the marker, it is **the denominator**.

**Exactly 6.** Not a round number — it is the smallest count at which all seven
bands can actually occur:

| Covered | 0/6 | 1/6 | 2/6 | 3/6 | 4/6 | 5/6 | 6/6 |
|---|---|---|---|---|---|---|---|
| % | 0 | 17 | 33 | 50 | 67 | 83 | 100 |
| Band | 0 | 1 | 2 | 3 | 4 | 5 | 6 |

With 5 points, covering one is already 20%, which lands in band 2 — so **band 1
is unreachable**, and every candidate who retains a single detail is marked a
band high, at exactly the end of the scale where the weakest candidates sit.
With 6 the mapping is one-to-one. `scripts/test-authoring.mjs` re-derives this
arithmetic, so changing the band table turns the "6" red instead of quietly
invalidating it.

Write them as **facts, not phrases to match** — the candidate is asked for their
own words. Split compound facts: "take-up went from a third to almost all" is
two things a candidate can retain separately, and counting it as one hides a
real difference.

### On `task` parts (D, I) — what the task asked for

There is no source. Band 4 is reached when "all required elements present and
identifiable", so somebody has to decide what the elements are.

If the marker works that out from the prompt on every run, two markings of the
same script can produce different lists, and band 4 silently means different
things for two candidates who wrote the same email. **Pinning the list to the
item is what makes the band reproducible.**

**At least 4**: the three things the prompt lists, plus one for register — the
criterion is "task fulfilment *and register*", so leaving register implicit is
how a formal email and a chatty one score the same.

### Reaching the marker

Three stages, and a break in any of them looks identical from outside: the
paper is still marked, the heaviest criterion still returns a number, and that
number is compared against nothing.

1. **Authored** in the content file.
2. **Persisted** — `seedVpetItems()` and `nhap-kich-ban.js` both write
   `key_points_json`, on insert *and* on update.
3. **Delivered** — `marking-guide.js` `userPrompt()` puts the list in front of
   the model, labelled by criterion, and on `content` parts asks for the count
   back in `keyPointsCovered` so a band-5 verdict attached to "2 of 6" can be
   caught automatically.

All three are tested in `scripts/test-authoring.mjs`.

---

## 5. Audio scripts

Only parts E, F, G, H, J. Pacing is set once in `server/script-markup.js` and
applies everywhere:

| | |
|---|---|
| Lead-in before speech | 1000 ms |
| Pause at a comma | 300 ms |
| Pause at a full stop | 800 ms |
| Pause at `_` (segment break) | 1500 ms |
| Speed the MP3s are built at | 1.25× (`BUILD_SPEED`) |
| Longest single pause | 3000 ms |
| Most pauses in one script | 60 |

Silence is **spliced in after rendering**, not requested from the model —
Kokoro reads SSML aloud, which was measured before anything was built on it.

Write plain sentences and let the punctuation do the work. Use `_` only for a
real paragraph break. Duration is estimated at 17 characters per second at
speed 1.0, calibrated against 70 real renders (mean error 4.1%), then divided
by `BUILD_SPEED`.

`DEFAULTS.speed` is a different number — 1.2 — and that is not a bug in either.
1.2 is ElevenLabs' hard ceiling for the preview path; Kokoro has none and
builds at the 1.25 that was asked for. The auditor now estimates at
`BUILD_SPEED`; it was reading 1.2 while the files were built at 1.25, a 4%
error visible only on scripts nobody has rendered yet — which is exactly when
an author is deciding whether a new passage fits its clock.

### 5a. How many times an item plays

Declared per part in the blueprint, not as one platform-wide number:

| Part | Replays | Why |
|---|---|---|
| E | 1 | Dictation — a second hearing is the task. A third does not fit the typing. |
| F | 2 | Single short lines; the part sits at 84% even at three plays. |
| G | **0** | A comprehension passage played three times is a reading test with an audio delivery mechanism. |
| H | 0 | A replay would be answering the question. |
| J | 0 | The item says "you will hear a short story once". |

This was one flat default of 2 until August 2026, which put part G at **193% of
its six minutes** — six half-minute passages played three times each is 576
seconds of listening before a candidate reads a single option. The passages were
not too long; the allowance was wrong. At the numbers above, G sits at 87% and E
at 92%.

Changing a number here changes what a candidate is allowed to do, so it is the
owner's to set. `npm run soat-de` fails any part whose `replays` and `minutes`
disagree, so a change that does not fit says so immediately.

### 5b. Building the audio

```
node scripts/nhap-bo-de.js --thu         # dry run: what would be imported
node scripts/nhap-bo-de.js               # import a form file
node scripts/dung-audio-kokoro.mjs       # render MP3s, whole bank in one batch
```

The renderer loads the model once for the whole run rather than once per item —
175 items take minutes rather than an hour and a half. `--part=G` and
`--so-cau=N` narrow it while drafting.

Editing a script after its MP3 exists **invalidates the approval** — the file no
longer reads what the item claims. That is deliberate; re-approve in Admin →
Question bank.

---

## 6. Levels, and how deep a part has to be

The bank is a **pool**, not a fixed paper. The builder puts items at the
paper's level first, shuffles within that group, then takes as many as it
needs.

That gives one rule, and it is about depth **per level**, not per part:

> At each level, a part must be either **shallow** — fewer items than the paper
> needs, so the remainder is drawn from another level and two sittings differ —
> or **deep**, at least twice what the paper needs, enough for two different
> papers. **The space between is the only place it must not be.**

Holding *exactly* the paper count is the worst case of all: every sitting at
that level draws every item, so a retake is the identical part.

### Where the bank stands

Every part is now deep at both levels, after the five forms were added.

| Part | Needs | A2 | B1 | B2 |
|---|---|---|---|---|
| A | 10 | 4 | 36 | 40 |
| B | 3 | — | 11 | 12 |
| C | 3 | — | 11 | 12 |
| D | 2 | — | 10 | 8 |
| E | 8 | — | 32 | 24 |
| F | 8 | — | 32 | 24 |
| G | 6 | — | 24 | 18 |
| H | 10 | — | 40 | 30 |
| I | 2 | — | 10 | 8 |
| J | 3 | — | 12 | 9 |

**What this fixed.** Before the forms, every audio part held exactly the
blueprint count at each level — the one number the rule forbids. Two B1 papers
generated back to back shared all of E, F, G, H and J: 35 of 55 items, with only
the order differing. Measured again after: **no part identical, about a quarter
of items overlapping**, which is what a random draw from a deep pool looks like.

**Why it had not been visible.** Two checks looked at it and both missed it, in
different ways. `scripts/test-items.mjs` applies the depth rule per level,
correctly, but reads `vpet-items.js` and so never saw the five scripted parts.
`soat-de-vpet.mjs` did see them and summed its pool across levels: part E held
16 items against a blueprint of 8, twice what is needed, and the column went
green — but the 16 were 8 at B1 and 8 at B2, and a B1 paper draws only from the
8. It now counts per level.

---

## 7. Adding a batch

A new paper is a new file in `server/data/forms/`, registered in
`server/data/vpet-forms.js`.

1. Copy an existing form file and replace its content, following §3 part by
   part. Give it a new `id` — the id becomes each item's `ext_key` prefix, so
   two forms sharing one would overwrite each other on import.
2. `npm run kiem-noi-dung` — fix everything it reports. It groups by fault, so
   eight items with one mistake read as one job rather than eight.
3. `node scripts/nhap-bo-de.js --thu`, then without `--thu`. Re-running is safe:
   items match on `ext_key`, so an edit updates rather than duplicates.
4. `node scripts/dung-audio-kokoro.mjs` for the E, F, G, H and J items.
5. `node scripts/soat-de-vpet.mjs` — pool depth per level, audio, marking, and
   whether each part fits its clock.
6. `SKIP_SHOTS=1 bash scripts/verify.sh` — everything, including steps 2 and 5.
7. Approve the audio in Admin → Question bank. A paper publishes only when its
   audio parts are `approved` and nothing in it is `retired` or `draft`.

Editing a script after its MP3 exists pulls `audio_status` back to `none` on
import. That is deliberate: a changed script beside an unchanged file is a
question claiming to say one thing while the audio says another, and nobody
finds out until a candidate hears it.

---

## 8. What is still open

These are decisions for the exam owner, not defects the checker can settle.
They constrain how new material should be written, which is why they are here.

- **Part B's passage does not hide**, although the item says "after it
  disappears". The hide duration and what happens on a page reload both need
  deciding before this part is used for real.
- **The replay allowances are a judgement, not a published rule.** §5a sets
  them at what the clock permits. If the real VPET publishes different numbers,
  those win, and `npm run soat-de` will say immediately whether the minutes
  still work.

Resolved since the first version of this document: part G at 193% of its clock
and part E at 104% were both caused by a flat replay default rather than by the
material (§5a).

---

## 9. What the checker cannot tell you

Worth knowing, so a green run is not read as more than it is. It checks shape,
not quality. It cannot tell whether a distractor is tempting, whether a passage
is interesting, whether an item is at the level it claims, or whether two items
test the same thing twice.

Those come from `scripts/phan-tich-cau-hoi.mjs` once there are real candidate
responses — facility, discrimination and distractor analysis, which say what no
amount of reading before the fact can.
