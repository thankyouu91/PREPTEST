# Lộ trình xây nền tảng VPET Prep

## Who takes what — owner decision, 2026-08-12

**The hourly Routine builds the platform: the engine, running it, keeping it
working, upgrading it. Academic content goes to a separate session.** This
reverses the split the file used to describe, in which the Routine took only
the repetitive content work and never touched architecture.

| Lane | Who | Where the queue is |
|---|---|---|
| Platform, engine, operations, maintenance, upgrades | **the hourly Routine** | "Nền tảng & engine" below |
| Exam items, vocabulary, grammar, self-study content | a separate session | "Hàng đợi" and the content items in the VPET section |
| Anything that changes the blueprint, the band table or the schema contract | the owner, in a session with a human present | flagged in place |

> **The Routine prompt still carries the old rule** — it says to take the first
> unchecked item in the VPET queue, then "Hàng đợi", and never to touch "Việc
> kiến trúc". Until that prompt is edited, a Routine turn reads two sets of
> instructions that disagree. This file is the newer one and wins; the prompt
> should be updated to match. Recorded here rather than fixed silently, because
> only the owner can edit the Routine.

Nhánh làm việc: `claude/prep-test-platform-design-fpiuqn`

## Nền tảng & engine — the Routine's queue

One unchecked item per turn, from the top. VPET is still what the product is
for; what changed is that the Routine builds the machinery and someone else
writes what goes through it. Detail and the reasoning behind the Google items
are further down under "Việc kiến trúc", which is now a reference section
rather than a separate no-go queue.

- [x] **Vocabulary schema + importer** — the five tables of `docs/LEARNING.md` §6 in `server/db.js`, `seedVocab()`, `server/data/vocab.js`, and `GET /api/learn/vocab` + `/api/learn/vocab/:headword`. Done first because it was the one item blocking the other session outright. Three decisions worth the words: the natural key is **(headword, pos)**, since §1.2's own worked example is `book` the A1 noun beside `book` the A2 verb; a **sense carries its own level**, because "run" is A1 and "run a business" is B1, and a sense that inherited its headword's level would make the §1.2 count wrong; and the importer **upserts rather than clears and reloads** — `learn_progress` will hold a sense id per learner, so re-importing the word list must not renumber the rows under somebody's spaced repetition. On top of the plain upsert: a level whose `level_source` is `manual` is never overwritten (§1.4 says a hand adjustment beats the automatic rules, and an import that reverted it would make that untrue), children the source has dropped are deleted while children that remain keep their ids, and entries the import does not mention are left alone so an admin's own word is not swept away. `server/data/vocab.js` holds twelve starter entries, not a word list: they exist so every table and relationship carries real data, and `freq_rank` is null on all of them because a rank is NGSL's data and inventing one would be worse than leaving it empty. `scripts/test-vocab.mjs` (30 checks) tests the API against the running server and the importer's semantics against a throwaway database via `PREP_DB`, so re-run behaviour is proved rather than assumed
- [x] **Security sweep across the whole API** — `server/security.js`, `docs/SECURITY.md`, `scripts/security-map.mjs` and `scripts/test-security.mjs` (47 checks). The lasting part is not the fixes, it is that the table is **generated from the Express stack** and re-generated on every `npm run verify`: adding an endpoint without a guard is red immediately, rather than waiting for the next sweep. Reading the stack rather than the source matters here — `router.use('/admin', requireAdmin, csrfGuard)` wraps only the routes registered *after* it, and reading the file makes it easy to conclude the opposite. What the sweep found and fixed: base security headers were on HTML responses only, so every API response and every static asset went out bare — they are now set once, globally, before any router, with `Permissions-Policy` denying everything except `microphone=(self)`, which the speaking parts need for MediaRecorder; HSTS is sent only when the request already arrived over HTTPS, because sending it in development pins `localhost` to HTTPS in the developer's own browser for a year; `/api/*` now carries `default-src 'none'; frame-ancestors 'none'; sandbox`, since an API response is data and never a document; and a global write limit (`WRITE_PER_MIN`, default 300/min, keyed on the **hashed session cookie × IP** so a stolen session is the unit being counted) sits under every mutating route including ones written tomorrow. The eight write endpoints that legitimately have no auth guard are named in `PUBLIC_WRITES` with what stands in for one, and the test checks that list in both directions — an undeclared one is red, and so is a stale entry
  - [x] **Issue `prep_csrf` before sign-in, so `csrfGuard` covers every write** — the cookie is now minted when any HTML page is served, not only on a successful sign-in, so a guest holds a token before any form can be submitted. All six unauthenticated write endpoints (register, both sign-ins, forgot, reset, verify) gained `csrfGuard`; **43 of 43 mutating routes now carry it**, up from 35, and `test-security.mjs` asserts the invariant without an exemption for unauthenticated ones. Neither client needed changing — `PrepApi` and `AD.api` already read the cookie and attach `X-CSRF-Token` to every non-GET. The three fetch-based test harnesses now warm the cookie lazily on their first write, the way a browser does by loading a page first.
    - **Correction to what the previous sweep claimed.** It called this live login CSRF. Checked with real requests, it was not exploitable: a cross-site `<form>` POST gets 400 because `express.json()` will not read a form body, `text/plain` gets 400 for the same reason, and an `application/json` body needs a CORS preflight this server never answers, so the browser never sends it. The barrier was real but *incidental* — a side effect of loading only `express.json()` and configuring no CORS. Adding `express.urlencoded()`, or opening CORS for a mobile client, would have turned the accident into a hole with nobody noticing. That is the reason the guard was worth adding, and docs/SECURITY.md now says so instead of overstating the risk. Overstating a vulnerability costs a document its credibility the same way understating one does
    - Sign-in still rotates the token, and `test-admin.mjs` now asserts that rather than merely asserting the cookie exists — a token planted before sign-in that survived into the session would defeat double-submit entirely, and "the cookie is present" stopped meaning anything the moment guests started getting one
  - [x] **`npm run verify` now takes about six minutes, down from over fifteen** — measured, not estimated: the run prints a per-step timing table at the end, so the next slow step tells on itself instead of hiding in a wall of ticks. The audit and the screenshot steps were the whole problem. Between them they did 306 page loads strictly one at a time, and every one of those loads is independent — its own `BrowserContext`, its own output file, no shared state. Both now run through `scripts/_pool.mjs`, a small worker pool sized from `availableParallelism()` and capped at 4 (override with `PW_JOBS`); the cap is there because past four the bottleneck stops being CPU and becomes memory, and on a two-core runner four Chromium contexts are slower than one. Results are collected in input order and printed afterwards rather than as they land, because a report that reorders itself on every run cannot be diffed against the last one. Total 371s, of which audit 152s and screenshots 123s
    - Not done, and deliberately: the fixed `waitForTimeout(1100)` in the audit and `1300` in the screenshots are still there, and are now roughly 40% of what is left. They are the same "guess how long the page needs" pattern that made `test-auth.mjs` flaky, and replacing them properly means finding a readiness signal every one of 22 different pages agrees on. Worth doing, but it is a correctness change wearing a performance costume, and bundling it into this one would have hidden it
    - Also not done: reusing one browser across the three scripts. Three launches cost about a second each, which was worth chasing at fifteen minutes and is not at six
- [x] **CI: `npm run verify` on every push** — `.github/workflows/verify.yml`, running `SKIP_SHOTS=1 npm run verify` on every branch, on pull requests, and on demand. Doing it now rather than earlier was the point: wiring a flaky fifteen-minute gate into CI teaches everyone to press re-run, which is worse than no gate. It needed no new dependency — `playwright-core` ships the `install` CLI, so `npx playwright-core install --with-deps chromium` is enough, with `~/.cache/ms-playwright` cached against the lockfile hash.
  - **Screenshots are skipped on purpose.** They write PNGs into `docs/screenshots/`, which is an authoring artefact reviewed by eye and committed by hand. CI generating images nobody looks at, into a working tree it then throws away, costs two minutes and buys nothing. Every correctness gate still runs, including the interface audit — which does need the browser
  - **The hardcoded browser path had to go first.** Eight scripts pointed `executablePath` at `/opt/pw-browsers/chromium`, which exists on this machine and nowhere else; on a runner that is an immediate crash whose message says nothing about a hardcoded path. `scripts/_browser.mjs` now resolves it: `CHROMIUM` if set, the familiar path if it actually exists, otherwise nothing at all so Playwright finds the build it just installed
  - **What was verified here and what was not.** Verified by running it: the YAML parses; `npm ci` is satisfiable against the lockfile; `playwright-core install chromium` really does fetch the headless-shell build that a bare `launch()` looks for, and a bare `launch()` against a clean browsers directory works; the helper returns no `executablePath` on a machine without the local path and launches anyway; and the exact CI command, run against the exact Chromium build CI will install, is green in 255s. Not verified, because it cannot be from here: that GitHub Actions is enabled on the repository, and that the runner itself behaves. The first run on GitHub is the remaining unknown
- [ ] **Translate `scripts/`** — the last Vietnamese island in the repo, and the only thing left before "English everywhere" is true. Eight test scripts plus `verify.sh`. Whole-line replacement keyed on line number, as slice 4b did; the check names are printed output, not identifiers, so nothing else moves
- [ ] **Spaced-repetition screen + `learn_progress`** — the reduced SM-2 in `docs/LEARNING.md`. Needs the vocabulary schema above, not the vocabulary data: the screen can be built and tested against a handful of seeded rows
- [ ] **Google Cloud Storage driver in `server/storage.js`** — third driver beside disk and Supabase. Ships disabled and falls back to disk until the credential exists, like every other keyed feature here
- [ ] **Server-side GA4 via the Measurement Protocol** — the GA4 tag cannot pass the CSP, so events go from the server. Disabled without `GA4_MEASUREMENT_ID` / `GA4_API_SECRET`
- [ ] **Payments in sandbox (VNPay / MoMo)** — issue a code automatically once a payment settles. Sandbox only; the live keys are the owner's call
- [ ] **Move off SQLite to Cloud SQL Postgres** — the blocker for Cloud Run, and the one item here that wants a whole turn to itself: rewriting `q.all/get/run/val` to a pooled async client means awaiting every call site. Do not start it in a turn that is already half spent
- [ ] **Containerise + deploy to Cloud Run**, with Secret Manager for keys and a deploy from CI
- [ ] **Google Classroom hand-off** — publish a test as an assignment, pull the roster, push scores back
- [ ] **Results export to Google Sheets** for teachers

## VPET first — current priority

Owner decision (2026-08-11): **build the VPET practice suite before anything
else.** Every other exam family is parked as `coming_soon`; nothing else gets
built for them until VPET is done.

Three standing decisions that shape the work:

| Decision | Choice |
|---|---|
| Speaking scoring | Audio-native model (Gemini / GPT-4o audio): the MP3 goes straight to the model, no separate transcription step |
| Audio storage | Storage adapter with two drivers — local disk for dev, Supabase Storage for production |
| Interface language | **English everywhere** — UI copy, code, identifiers, comments, data and AI prompts |

The official VPET blueprint, already in `server/data/exam-formats.js`, is fixed
at 55 items and must not be changed:

| Part | Task | Items | Skill | Needs audio |
|---|---|---:|---|---|
| A | Sentence Completion | 10 | writing | |
| B | Passage Reconstruction | 3 | writing | |
| C | Reading Comprehension | 3 | reading | |
| D | E-Mail Writing | 2 | writing | |
| E | Dictation | 8 | listening | yes |
| F | Response Selection | 8 | listening | yes |
| G | Passage Comprehension | 6 | listening | yes |
| H | Repeat | 10 | speaking | yes |
| I | Speaking Situations | 2 | speaking | |
| J | Story Retellings | 3 | speaking | yes |

**Platform before content** (owner, 2026-08-11): build frontend and backend
first; real exam items come last, once the machinery that carries them works.

Queue for this track, in order. Since 2026-08-12 the two remaining **content**
items here — the five audio parts, and slice 2 of the level balancing — belong
to the content session, not to the Routine. They are left in place because the
platform reasoning around them is what makes them legible; only who picks them
up has changed. The two items still waiting on a decision or on another branch
are marked as such and belong to nobody until that clears.

- [x] VPET blueprint: ten lettered parts A-J, 55 items, in `server/data/exam-formats.js`
- [x] Family readiness flag: `families.status` = `ready` / `coming_soon`, VPET ready and the other five parked; served by `GET /api/catalog`
- [x] MP3 upload in the admin question bank: storage adapter (disk + Supabase driver), raw-body upload behind requireAdmin + CSRF with magic-byte validation, player and replace/remove on each item, and per-part audio coverage in the format readiness report
- [x] **Google Sign-In** — server-side OAuth 2.0 redirect (`/auth/google`, `/auth/google/callback`), no external script so the CSP is untouched; state + nonce, issuer/audience/expiry checks, open-redirect guard, links onto an existing account by verified email, and stays hidden until `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` are set
- [x] **PWA** — manifest with maskable icons rendered from the brand SVG, service worker caching only the shell (never `/api`, never a signed-in page), offline screen, installable from Chrome on Android without a Play listing
- [x] Stop offering non-VPET tests: seeded IELTS/TOEIC tests seed as drafts, boot pulls any already-published test of a parked family back to draft, the API refuses to publish one, and the dashboard stops raising "nothing to sell" for parked families
- [x] **Subscription model and permissions** — three time-limited plans replace the per-exam bundles (Starter 499k/3 months capped at 10 sittings, Plus 799k/6 months, Pro 1,399k/12 months, both uncapped); `server/data/plans.js` is the single source and the `packages` table is synced from it on boot, retiring the old rows rather than deleting them because orders point at them. `POST /api/redeem` moved redemption to the server so "one code, one account" can actually be enforced, and `entitlementOf()` resolves the strongest plan across every live code an account holds. The self-study routes refuse a request without `selfStudy` at HTTP level; the interface dims the same items and points them at the price list instead of a door that will be slammed. A code now carries a plan end to end: the admin issue screen asks which plan first and the API refuses a code without one, because a plan-less code activates into nothing and the mistake only surfaces once a buyer is holding it
- [x] Landing prices come from `plans.js` like every other screen: the cards keep their tuned Vietnamese copy but the numbers, the durations and the note under the call to action are written in from `PrepState.plans()` after boot, with the typed values left as the offline fallback. A plan that leaves the price list takes its card with it rather than leaving a button that leads nowhere
- [x] Tag items by VPET part: `questions.part` (A-J), because skill and type cannot tell parts apart — B and D are both writing essays, F and G both listening multiple choice, H and J both spoken answers to audio, so one skill-wide pool builds an exam that looks right and asks the wrong things. The blueprint carries the letter, `/api/catalog` publishes each family's part table, and one `poolWhere()` feeds the readiness report, the generator and re-draw alike so what the report promises is what the generator can draw. A part is refused unless it exists in the blueprint and matches that part's skill and item type. Sections remember their letter so re-drawing stays inside the part. The bank screen gains a part picker, a part filter with a "not tagged yet" option, and a badge that calls out any item with no letter; the CSV import gains a `phan_thi` column
- [x] **VPET exam engine, backend half** — `attempts` / `attempt_parts` / `attempt_answers` per docs/SCORING.md §2.4, and every rule that cannot be trusted to a browser is decided in `server/exam-api.js`: the per-part deadline is stamped when the candidate enters a part and re-entering never grants a fresh clock; replays are counted server side and refused at the limit; items go out with `answer` and `explanation` stripped; autosave reports per item which writes were kept so a late batch cannot be lost silently; spoken answers upload as raw bytes and are sniffed on content (WebM/Ogg/MP4/MP3, because no browser records MP3 and ffmpeg is not a dependency we are taking); submit closes every part and leaves marking to a later pass so a marker fix can be re-run over old sittings
  - [x] Attempt metering: a sitting is charged at start, not at submit, or abandoning would be free and unlimited. Resuming never charges twice, an account holding two capped codes charges the one with room left, and an uncapped plan is not decremented at all
- [x] **VPET exam runner, the screen** — `/prep/lam-bai/`, holding no rules of its own: the clock, the replay count and whether a write is still accepted all come from the server, and the countdown resyncs from `secondsLeft` after every call, so drift on the candidate's machine cannot move the real deadline. A part is entered deliberately (the clock starts on a button, after saying so), items render per type, audio is fetched before playing so a spent-replay refusal reads as "hết lượt nghe" instead of a silent failure, speaking parts record through MediaRecorder and upload the blob, and autosave runs on a debounce, on blur and on page-hide. Answers the server refused are reported rather than swallowed. Starting a second test while one is unfinished now explains itself and offers to submit the old one, instead of silently dropping the candidate into the wrong paper
- [ ] AI speaking scoring — **being built on `claude/vpet-tts-speaking-scoring-w7rgtz`** (`server/providers/openai.js`, `server/providers/elevenlabs.js`, `server/authoring-api.js`). Skipped here on 2026-08-11 rather than written twice: duplicating it would mean a hard merge across `server/api.js`, `server/db.js` and `exam-formats.js`. Whoever merges the two branches owns joining that scorer to `attempt_answers.audio_key` and filling in the pending speaking/writing skills
- [x] **Auto marking + band conversion** — `server/marking.js` in the three tiers docs/SCORING.md §2.2 sets out: mark each item, add up per skill, convert with `linear` (raw/max × 10, rounded to 0.5). Multiple choice and gap-fill are marked the moment the paper is handed in; writing and speaking are left `pending` rather than scored zero, and the overall mark stays null until all four skills are in, because averaging two skills and calling it a total is a wrong number wearing the costume of a result. Blank items count in the denominator. Every item keeps earned/max/note so a disputed score traces back to the item that caused it, and marking re-runs over stored answers so a marker fix never means sitting the test again. `GET /api/attempts/:id/result` gates the breakdown on `detailedReport`: Starter gets score and band, Plus and Pro get the per-part and per-item table — enforced server side, since hiding it in the interface is undone by anyone who opens the page source
  - [x] **The result screen** — `/prep/ket-qua/:attemptId/`: overall mark and band, per-skill cards, and the part-by-part table with each item marked right / wrong / blank against the candidate's own answer. An unfinished mark shows a dash and says which skills are still out, rather than a half-computed number that reads as final. A rubric item with nothing recorded says "bỏ trống", not "chờ chấm" — nothing is queued for it. Starter sees the score, the band and a panel explaining what the fuller report contains, with the breakdown never sent to the browser at all. The runner's finish panel now links straight here
  - [ ] **Band cut-offs contradict each other and need the owner's ruling.** `docs/SCORING.md` §1.1 says 3.5-5.0 → Bậc 3 (B1), 5.5-8.0 → Bậc 4 (B2), 8.5+ → Bậc 5 (C1). `VSTEP_GUIDE` in `server/data/exam-formats.js` says 4.0-5.5 → Bậc 3, 6.0-8.0 → Bậc 4, 8.5+ → Bậc 5. The engine follows SCORING.md because that is the scoring authority, and the table lives in exactly one place (`marking.js` BANDS). Which is right is a question about the real exam, so it is not something to settle by picking one
- [x] **Translate the interface, slice 1: the five account screens** — sign in, sign up, forgot password, reset password, verify email, plus the `/api/auth/*` messages they display, so a screen and the errors it shows are never in two languages. These five share no chrome with the signed-in area, which is what makes them a clean seam: nothing is left half-translated. Tests needed no changes — they key on element ids and status codes, not on copy
- [x] **Translate slice 2: the landing page** — hero, the three steps, the feature bento, the price table, the testimonials, the closing call to action and the footer, plus the code comments in the page script. `lang` on all six pre-login screens is now `en`. Two things stay Vietnamese on purpose: prices in đồng, and the names on the illustrative testimonials, which are Vietnamese students speaking to Vietnamese students and already labelled as demo-stage placeholders. The whole pre-login funnel now reads in one language; the seam has moved to sign-in → dashboard
- [x] **Translate slice 3: the signed-in student area** — the shared chrome, dashboard, library, test detail, exam runner, result, the three code screens, account and `_mock.js`, plus `server/exam-api.js` and `server/user-api.js` end to end (the `/api/redeem` and `/api/attempts/*` messages the item named, and the comments around them). Moved as one piece because the chrome is shared. Three of these were decisions rather than wording: `PREP.SKILL_VI` became `PREP.SKILL_LABEL`, `PREP.diem()` became `PREP.score()` and dropped the Vietnamese comma decimal so a mark now reads `7.5`, and the `vnd()` formatter kept its `vi-VN` grouping because prices stay in đồng. The admin's own `AD.SKILL_VI` is a separate object and waits for slice 4. One test assertion moved with the copy it reads (`#ex-saved` → "Saved"); nothing else in the suite keys on wording
  - [x] Shop and price-list copy: the words around the plan data are English now, so the `plans.js` names, perks and limits no longer sit inside Vietnamese sentences
  - [x] The demo student's display name is now `Demo Student`, reconciled at boot rather than only seeded. `ensureDemoStudentPassword` already pulled the account's password, `verified` and `status` back to what the documentation says on every non-production boot — the name belonged in exactly that check, because it is seeded once and an existing `data/prep.sqlite` would otherwise keep the old value however the seed reads. The function is now `ensureDemoStudent`, since it had already outgrown its name. `test-taikhoan.js` covers name drift the same way it covers password drift, and the reconciler fixed the working database on first boot. The other seven demo accounts carry real Vietnamese names and stay as they are, like the landing-page testimonials
  - [x] **The eleven self-study pages under `/prep/hoc/`** — shell translated, teaching content untouched. The line drawn, because these pages are the one place the two languages genuinely have to sit together: anything that *structures* the page is English (titles, headings, the chip rail, filters, empty states, the no-voice warning, table headers, the voice and speed controls, and the section labels `_grammar.js` renders — When to use it / When NOT to use it / Mistakes Vietnamese learners make / Examples / Practice), and anything that *explains English* stays Vietnamese (the intro paragraph on each page, every gloss, bilingual example, error note and practice translation coming out of the database). So a card now reads with an English heading over a Vietnamese explanation, which is what a bilingual reference is supposed to look like. Twelve test references moved with the copy: the `nav[aria-label]` selector in seven places, and five assertions that read section labels. The linking-word search placeholder keeps `tuy nhiên` because the search really does match Vietnamese glosses — it is an example of what to type, not a label
  - [x] **Translate slice 5: the shared server files** — `auth.js` and `marking.js` in full, `db.js` for all of its code, and `storage.js` which turned out to be English already. The student-facing reason for doing this now is gone: `requireUser` no longer answers an expired session in Vietnamese. Three things were kept on purpose. The VSTEP band names (`Bậc 3/4/5`) stay — they are the official designations printed on the certificate, and the CEFR equivalent sits beside them in the interface anyway. The demo people (`Nguyễn Thu Hằng` and the other six) and the demo class name stay, like the landing-page testimonials. And the sample question bank in `db.js` stays, because the VPET item bank replaces every row of it — translating throwaway exam items would mean writing exam content carelessly, against the content rules
    - Seeded catalogue strings (test titles, scoring lines, guide bullets, section labels, the retired bundle copy) were translated, but the `tests` and `packages` rows are seeded once. An existing `data/prep.sqlite` keeps the Vietnamese it already has, and that is deliberate: unlike the demo student's name, these rows are editable sample content, so reconciling them at boot would overwrite an administrator's edits. They correct themselves on a fresh database, and the item bank replaces them on an existing one
  - [x] **`server/data/exam-formats.js`** — all eleven format descriptors, their section labels, part notes, guides and notes, plus the file's own documentation. It turned out not to be blocked on the band ruling after all: the contradiction is in the *numbers* on the `VSTEP_GUIDE` line, and translating the words around them leaves those numbers exactly as they were, still contradicting `docs/SCORING.md`, still waiting for a decision. The VPET blueprint was already English. Two things stay Vietnamese: the circular number `01/2014/TT-BGDĐT`, which is a citation, and the `Bậc 3/4/5` band names, for the same reason as in `marking.js`. Item counts are the invariant here, so they were checked rather than assumed: all 121 `items:` and 31 `minutes:` values are byte-identical to the previous commit, `inconsistencies()` returns empty, and the VPET blueprint still reads A-J / 55
- [x] **Translate slice 4a: the eight admin screens** — sign-in, reports, tests, the test builder, the question bank, formats, students, codes and administration, plus the shared admin chrome in `_admin.js`. `AD.SKILL_VI` / `TYPE_VI` / `STATUS_VI` became `AD.SKILL_LABEL` / `TYPE_LABEL` / `STATUS_LABEL`, matching `PREP.SKILL_LABEL` on the student side. Two things stay as they are: the `vi-VN` price grouping, because prices are still in đồng, and the CSV import column names (`ky_thi`, `ky_nang`, `do_kho`, `dang_cau`, `phan_thi`, …) — those are a format contract, asserted by `test-admin.mjs` against the downloadable template and carried in files an administrator may already hold, so renaming them is a functional change and not a translation. The prose around them says so, and the importer still accepts Vietnamese skill names as input
- [x] **Translate slice 4b: `server/api.js`** — all 217 Vietnamese lines: the `/api/admin/*` error messages, the reporting comments, the funnel and to-do labels, and the sample CSV rows an administrator downloads. The one coupled assertion moved with its message (`test-admin.mjs`, `/chưa sẵn sàng/` → `/is not ready yet/`). Only the diacritic-stripping regex in `slugify` keeps a Vietnamese character, because that is what it is for. The CSV column names stay, as in 4a. This slice was applied by whole-line replacement keyed on line number, with the applier refusing any line that no longer contained Vietnamese — 4a's failures were all truncated substring keys, and a whole-line swap cannot weld an English replacement onto a Vietnamese tail. 217 lines went through with no repairs
  - **Not to be translated:** the eight admin screens' own CSV column identifiers, see above. Separate audience (staff, not learners), so it is a genuine boundary rather than a convenient one
  - **Not to be translated:** the self-study teaching content. `irregular_verbs.vi`, `linking_words.ex_vi`, `grammar_points.name_vi` and the Vietnamese glosses beside every English example exist so a Vietnamese learner can read an explanation of English in their first language, and "lỗi người Việt hay mắc" is by definition about Vietnamese speakers. Rendering that in English deletes the reason it exists. Only the shell of those pages — headings, filters, empty states — is interface
- [x] **VPET item bank, the audio-free parts** — twenty items in `server/data/vpet-items.js`: A ten sentence completions, B three passage reconstructions, C three reading comprehensions, D two emails, I two speaking situations. One paper's worth of every part that can be sat without a recording. The seed upserts on a new `questions.ext_key` rather than clearing and reloading, because `section_items` holds a foreign key into `questions` and clearing the bank would empty every test built from it — so correcting an item reaches a running database without disturbing tests already using it, and rows an admin wrote by hand have no `ext_key` and are never touched. `scripts/test-items.mjs` (36 checks) reads the blueprint rather than restating it, so the test cannot pass once the blueprint moves; it also catches the mistakes that survive proof-reading — a gap answer that is two words, an mcq answer missing from its own options, duplicate options, a rubric item carrying a pre-written answer
  - [ ] **VPET item bank, the five audio parts** — E dictation 8, F response selection 8, G passage comprehension 6, H repeat 10, J story retelling 3: 35 items. Held back deliberately rather than authored as text: for every one of these the recording *is* the item, and a script with no MP3 behind it is not something a candidate can sit. The readiness report already reports them as short, and `questions.audio_key` is the field waiting. Needs the TTS work on `claude/vpet-tts-speaking-scoring-w7rgtz`, or a voice credential, before it can be finished — so it should follow that branch rather than race it
  - [x] **A second sitting's worth of the audio-free parts** — twenty more items, so the pool is A 20 · B 6 · C 6 · D 4 · I 4. Correcting my own note from the turn before, which said this was only worth doing once the audio parts existed: the retake is half a test either way, and that is fixed until the voice work lands. What a second set changes is that the half a candidate *can* sit is no longer identical on the second attempt, which is worth having now. Verified against the running generator rather than assumed — two draws of part A returned different sets
    - Known limit, and it is not what you would guess from "the pool is doubled": the generator prefers exact level matches before filling from other levels, so a retake at B1 repeats every B1 item in the part. Part A holds six of them, which is exactly the 6/10 overlap two draws produced. A fully different retake at a given level needs two sittings' worth **at that level**, not just in the part. That is a level-balance job, not a volume one, and it is the right shape for the next content item
  - [x] **Level-balanced depth, slice 1: two sittings at B2** — twenty-two more items (A +10, B +2, C +2, D +4, I +4), so the pool is A 30 · B 8 · C 8 · D 8 · I 8 = 62. What this changes is *where* the depth sits rather than how much of it there is, and the earlier note above understated the problem. The generator orders the pool exact-level-first, so at the paper's level a part holding fewer items than the blueprint asks for repeats every one of them — and a part holding **exactly** the blueprint count repeats all of them with certainty, which is the worse of the two and is exactly where part A stood at B2, with ten B2 items for a ten-item part. Parts D and I were in that position at both of their levels. Every audio-free part now holds twice the blueprint count at B2, and D and I at B1 as well. The rule the pool follows from here, and `scripts/test-items.mjs` enforces: at any level a part is either shallow (fewer than the blueprint count, so the top-up drawn from other levels varies between sittings) or deep (at least twice it) — never the number in between. The assertion that each part's *total* be a whole multiple of its blueprint count went with it: same idea measured on the wrong axis, and it passed happily on a pool that repeated itself. `test-admin.mjs` now checks the claim through the API rather than the data file — a B2 paper draws only B2 items, and two draws of part A at B2 do not come back identical
    - Not done here, and worth saying rather than leaving implied: depth makes a different retake *possible*, it does not make one certain. Ten items drawn at random from twenty overlap by five on average. Getting below that is a generator change — remembering what a candidate has already been shown — and that is engine work, not content work
  - [ ] **Level-balanced depth, slice 2: B1 for parts A, B and C** — twenty-two items (A 14, B 4, C 4), which is what is left to make B1 as deep as B2 now is. B1 is the level a real retake meets first: the generate screen defaults to it and the seeded VPET paper is a B1 paper. A2 and C1 stay shallow on purpose and are a different question — whether a VPET paper should be generated at those levels at all is a blueprint decision, not a content one

## Hàng đợi

Content lane — the separate session works from here, not the Routine (owner
decision, 2026-08-12).

- [x] Frontend giai đoạn 1: 12 màn học viên, token white-label, dark mode, CSP nghiêm ngặt
- [x] Tài khoản học viên demo `student` + kho tài khoản phía client
- [x] Dashboard học viên đầy đủ sau đăng nhập
- [x] Backend quản trị: SQLite, phiên đăng nhập, CSRF, chống dò mật khẩu, nhật ký thao tác
- [x] API quản trị: báo cáo, đề thi, ngân hàng câu hỏi, học viên, code, cài đặt
- [x] Giao diện quản trị: đăng nhập, báo cáo, danh sách đề, trình xây đề, ngân hàng câu hỏi, học viên, code, quản trị + ảnh nghiệm thu
- [x] Nhập câu hỏi hàng loạt từ CSV trong màn Ngân hàng câu hỏi (tải mẫu, xem trước, báo lỗi từng dòng)
- [x] Chuyển trang học viên từ `public/prep/_mock.js` sang đọc `GET /api/catalog`, giữ nguyên markup và các trạng thái loading/empty
- [x] API học viên thật: đăng ký, đăng nhập, xác thực email, quên/đặt lại mật khẩu, phiên cookie `prep_user` (scrypt như khu quản trị)
- [x] Nối 4 màn auth + màn Tài khoản vào API học viên: bỏ `PrepAuth`/`PrepAccounts` localStorage, dựng thêm màn `/prep/dat-lai-mat-khau/`, guard phía server cho trang cần đăng nhập
- [x] Nghiên cứu cơ cấu và cách chấm 6 kỳ thi + thiết kế engine chấm điểm (`docs/SCORING.md`)
- [x] Thiết kế khu tự học: định mức từ vựng A1–C2, nguồn dữ liệu mở, lược đồ (`docs/LEARNING.md`)
- [x] Bảng động từ bất quy tắc V1–V2–V3 (193 từ) + lớp TTS Anh/Mỹ dùng chung
- [x] Engine format đề chuẩn: 11 format của 6 kỳ thi + phân tích độ phủ ngân hàng + sinh đề một chạm

### Việc soạn nội dung (phiên nội dung làm tiếp từ đây)

- [x] Linking words: 123 mục theo chức năng × độ trang trọng, kèm vị trí trong câu, dấu câu và cảnh báo lạm dụng
- [x] Ngữ pháp 12 thì: công thức, khi dùng / khi không dùng, phân biệt cặp dễ nhầm, lỗi người Việt hay mắc, 8 ví dụ + 12 câu luyện mỗi thì
- [x] Ngữ pháp nhóm danh từ – mạo từ – lượng từ, bậc A1–A2 (14 điểm: số nhiều, đếm được, a/an/the/zero, this–that, some–any, sở hữu cách, much–many, a few–a little, danh từ ghép, there is–are, đơn vị đo)
- [x] Ngữ pháp nhóm danh từ – mạo từ – lượng từ, bậc B1–C2 (14 điểm: few/little không có "a", all–both–whole, each–every, danh từ tập hợp, mạo từ với tên riêng, danh từ đổi nghĩa theo tính đếm được, lượng từ với "of", no–none–neither, mạo từ khái quát, zero article học thuật, lượng từ trang trọng, hoà hợp chủ ngữ với cụm lượng, mạo từ trong thành ngữ, danh từ hoá) — nhóm này đủ 28/28 điểm theo hạn mức
- [x] Ngữ pháp động từ khuyết thiếu bậc A1–B1 (14 điểm: can, can/could xin phép, must/mustn't, have to, should, may/might, would like, could quá khứ, must khác have to, suy đoán, should/ought to/had better, used to, xin phép theo độ trang trọng, be able to)
- [x] Ngữ pháp động từ khuyết thiếu bậc B2–C2 (15 điểm: suy đoán quá khứ, should have, needn't have khác didn't need to, could have, would đa chức năng, khuyết thiếu bị động, thang chắc chắn, hedging học thuật, may well / might as well, bán khuyết thiếu với "be", shall, lùi thì để lịch sự, cụm cố định, was to have done, lược bỏ sau khuyết thiếu) — nhóm này đủ 29/29 điểm
- [x] Ngữ pháp câu điều kiện bậc A2–B2 (11 điểm: loại 0, loại 1, loại 2, unless và các liên từ điều kiện, wish hiện tại, biến thể loại 1, loại 3, wish quá khứ và wish + would, điều kiện hỗn hợp, would rather / it's time, các cách nói điều kiện khác)
- [x] Ngữ pháp câu điều kiện bậc C1–C2 (9 điểm: đảo ngữ điều kiện, but for / if it were not for, thức giả định trong mệnh đề that, điều kiện ngầm, otherwise trong lập luận, lest, rào đón bằng điều kiện trong bài học thuật, sắc thái tiếc nuối và trách móc, lược bỏ trong câu điều kiện) — nhóm này đủ 20/20 điểm
- [x] Ngữ pháp bị động và tường thuật, bậc A2–B2 (13 điểm: bị động cơ bản, bị động các thì, by-tác nhân, bị động với khuyết thiếu, hai tân ngữ, bị động phi ngôi, have/get something done; tường thuật câu kể, câu hỏi, mệnh lệnh, chuyển đại từ và trạng ngữ, ngoại lệ lùi thì, mẫu câu động từ tường thuật)
- [x] Ngữ pháp bị động và tường thuật, bậc C1–C2 (9 điểm: bị động trong văn học thuật, bị động với động từ tri giác và sai khiến, bị động dạng không chia, `there is said to be`, động từ tường thuật mang sắc thái đánh giá, tường thuật gián tiếp tự do, tường thuật trong văn bản pháp lý, bị động giấu tác nhân, danh từ tường thuật) — nhóm này đủ 22/22 điểm
- [x] Ngữ pháp mệnh đề quan hệ và mệnh đề phụ, bậc A2–B1 (9 điểm: who/which/that, mệnh đề chỉ thời gian, mệnh đề chỉ nguyên nhân; mệnh đề xác định và không xác định, whose, where/when/why, lược bỏ đại từ quan hệ, mệnh đề chỉ mục đích, mệnh đề nhượng bộ) — mục 17 điểm A2–B2 đã tách đôi đúng như ghi chú
- [x] Ngữ pháp mệnh đề quan hệ và mệnh đề phụ, bậc B2 (8 điểm: rút gọn mệnh đề quan hệ bằng V-ing / V3 / to-V, giới từ + which và whom, mệnh đề quan hệ với lượng từ (`some of which`, `most of whom`), `which` thay cho cả mệnh đề đứng trước, mệnh đề đối chiếu (`whereas`, `while`), mệnh đề chỉ cách thức (`as if`, `as though`), nhóm `-ever`, mệnh đề danh ngữ với `what` và `whether`)
- [x] Ngữ pháp mệnh đề quan hệ và mệnh đề phụ, bậc C1–C2 (12 điểm: mệnh đề phân từ làm trạng ngữ và lỗi phân từ treo, mệnh đề kết quả, chủ ngữ giả `it`, `for + tân ngữ + to-V`, lược bỏ trong mệnh đề phụ, `in case`/`provided that`, mệnh đề `as` học thuật; cấu trúc tuyệt đối, `whereby`/`wherein`/`whereupon`, mệnh đề quan hệ tách xa, nhượng bộ trang trọng, mệnh đề gắn nhầm chỗ) — nhóm này đủ 29/29 điểm
- [x] Ngữ pháp đảo ngữ – nhấn mạnh – câu chẻ, bậc B1–C1 (14 điểm: So do I, Here comes, nhấn mạnh bằng do/does/did, câu chẻ `It is… that`, câu chẻ `What… is`, đảo ngữ sau Never/Rarely, đại từ phản thân nhấn mạnh; `Not only`/`No sooner`/`Hardly`/`Little did`, đảo ngữ sau `Only`, `So great was`, đưa lên đầu mà không đảo, biến thể `All I want is`, câu chẻ đảo `That is what`, trạng từ nhấn mạnh) — mục gốc gộp hai hàng hạn mức (đảo ngữ 21 + sắc thái 33 = 54 điểm) nên đã tách theo hai bảng dưới đây
- [x] Ngữ pháp đảo ngữ – nhấn mạnh – câu chẻ, bậc C2 (7 điểm: đảo toàn phần khác đảo trợ động từ, đưa phân từ và tính từ lên đầu, đảo ngữ sau `as` và `than`, câu chẻ phủ định `It was not until… that`, đảo ngữ với cụm `Not…`, đưa cụm giới từ lên đầu để nối mạch, phủ định nhấn mạnh gián tiếp `far from` / `anything but`) — nhóm này đủ 21/21 điểm
- [x] Ngữ pháp sắc thái – độ trang trọng – hedging, bậc A1–B2 (14 điểm: nghi thức please/excuse me, làm nhẹ lời chê bằng `a bit`, báo tin không vui `I am afraid`; câu hỏi gián tiếp, câu hỏi đuôi, `quite`/`rather`/`fairly`, nói ước chừng; viết tắt và độ trang trọng, rào đón bằng `seem`/`tend to`, trạng từ rào đón, trạng từ tăng cam kết, cụm động từ khác động từ trang trọng, từ chối cho nhẹ, lối nói phi ngôi)
- [x] Ngữ pháp sắc thái – độ trang trọng – hedging, bậc C1 (9 điểm: hạn định phạm vi khẳng định, khoanh vùng bằng điều kiện, cân liều rào đón, lời nhờ trong thư công việc, góp ý phê bình cho nhã, nói giảm, uyển ngữ, ngữ pháp của văn nói, đánh dấu lập trường cá nhân) — mục 19 điểm C1–C2 đã tách đôi đúng như ghi chú
- [x] Ngữ pháp sắc thái – độ trang trọng – hedging, bậc C2 (10 điểm: mỉa mai và châm biếm, hàm ý hội thoại, tiền giả định, phê bình nguồn trong bài học thuật, công thức văn bản chính thức, từ ngữ mang đánh giá ngầm, ngoặc kép giữ khoảng cách, câu rào đón dọn đường, thang xin lỗi, cố ý đổi giọng) — nhóm này đủ 33/33 điểm

#### Phần ngữ pháp còn thiếu so với bảng phân bậc

Đối chiếu dữ liệu đã dựng với bảng phân bậc `docs/LEARNING.md` mục 2 (tổng 303 điểm):
hiện có **219/303**. Tám nhóm đã đủ hạn mức (thì 21, danh từ 28, khuyết thiếu 29,
điều kiện 20, bị động 22, mệnh đề 29, đảo ngữ 21, sắc thái 33). Nhóm tính từ – trạng từ –
so sánh đang làm dở: 16/28 điểm. Còn nhóm giới từ (35 điểm) chưa có mục nào, cộng một
hàng cần người dùng quyết:

- [x] Ngữ pháp phối hợp thì, 9 điểm còn lại của nhóm "thì" (A1 1 · A2 1 · B1 1 · B2 2 · C1 2 · C2 2: chia thì cả hai vế sau `and`/`but`, thì sau `before`/`after`, bộ ba thì kể chuyện quá khứ, giữ mốc thì nhất quán trong đoạn và lỗi trôi thì, tương lai nhìn từ quá khứ, ba thì hoàn thành quanh mốc quy chiếu, thì trong bài viết học thuật, hiện tại lịch sử, điều khiển đoạn hồi tưởng) — nhóm này đủ 21/21 điểm. Phần lùi thì khi tường thuật lời người khác vẫn thuộc nhóm "Bị động, tường thuật", không làm lại ở đây
- [x] Ngữ pháp tính từ – trạng từ – so sánh, bậc A1–B1 (16 điểm: vị trí tính từ, tính từ phải có `be`, trạng từ tần suất, so sánh hơn và nhất với tính từ ngắn; `more`/`the most`, so sánh bất quy tắc, `as … as`, trạng từ cách thức và bẫy `hard`/`hardly`, tính từ `-ed` khác `-ing`, `too`/`enough`; trật tự nhiều tính từ, bổ nghĩa cho so sánh, so sánh kép, vị trí trạng từ, tính từ ghép) — dựng thêm trang `/prep/hoc/tinh-tu/` cho nhóm mới
- [ ] Ngữ pháp tính từ – trạng từ – so sánh, bậc B2–C2 (12 điểm còn lại: B2 5, C1 4, C2 3)
- [ ] Ngữ pháp giới từ và cụm giới từ, bậc A1–A2 (13 điểm theo hạn mức: A1 6, A2 7)
- [ ] Ngữ pháp giới từ và cụm giới từ, bậc B1–B2 (13 điểm: B1 7, B2 6)
- [ ] Ngữ pháp giới từ và cụm giới từ, bậc C1–C2 (9 điểm: C1 5, C2 4)
- [ ] **Cần người dùng quyết**: nhóm "Liên kết câu, mạch lạc văn bản" (37 điểm trong bảng phân bậc) hiện đã được phục vụ bằng bảng `linking_words` 123 mục, không phải bằng `grammar_points`. Nếu coi bảng từ nối là đủ thì gạch hàng này khỏi hạn mức; nếu muốn có thêm điểm ngữ pháp về mạch lạc văn bản (câu chủ đề, tham chiếu, thay thế, lược bỏ, trật tự thông tin) thì tách thành các mục như trên.
- [ ] Nhập từ vựng NGSL (~2.800 từ) → `vocab_entries`, gán bậc A1–B1 theo hạng tần suất
- [ ] Nhập từ vựng NAWL (~960 từ học thuật) + TSL (~1.200 từ TOEIC), gán bậc B2–C1
- [ ] Nhập câu ví dụ song ngữ Anh–Việt từ Tatoeba, ghép vào từng nghĩa
- [ ] Bổ sung nghĩa và phiên âm Anh/Mỹ từ Wiktextract cho toàn bộ từ đã nhập
- [ ] Collocations: trích từ corpus bằng thống kê đồng hiện, lọc tay, gán bậc

## Việc kiến trúc

Reference section, not a queue. Since 2026-08-12 the platform items below are
worked from "Nền tảng & engine" at the top of this file, which carries them in
priority order; what is kept here is the reasoning, the constraints and the
Google scope decision. Items already delivered are ticked so the list stops
reading as a backlog of work nobody has done.

### Google ecosystem — scope settled 2026-08-11

Owner chose the **full** scope: service integrations, hosting on Google Cloud,
and Classroom / Workspace on top. Sign-In and PWA were pulled forward into the
VPET queue because they are small and block nothing; everything below is the
heavy half and waits until the VPET engine works.

One constraint shapes all of it: **the platform runs a strict CSP with no
external scripts.** That rules out the drop-in Google widgets, so each piece
below uses the server-side route instead — which is also the more private one.

| Piece | How it fits here |
|---|---|
| Sign-In | OAuth 2.0 redirect handled by the server. No `gsi/client` script, no CSP exception. In the VPET queue. |
| Gemini | Speaking scoring, server-side call with inline audio. Already queued. |
| Cloud Storage | Third driver in `server/storage.js`; the adapter takes it without touching call sites. |
| Cloud Run | Container deploy, closest to how the app runs today. |
| Cloud SQL | SQLite has to go first — see below. |
| Secret Manager | Every API key moves out of plain environment variables. |
| Analytics | GA4's script breaks CSP; use the Measurement Protocol from the server instead. |
| Classroom | Assignment hand-off, and results export to Sheets. |

- [ ] Google Cloud Storage driver in `server/storage.js` — third driver beside disk and Supabase
- [ ] **Move off SQLite to Cloud SQL Postgres.** The blocker for Cloud Run: local SQLite dies with the container. The Supabase export already proved the schema ports, so the work is rewriting the `q.all/get/run/val` layer to a pooled async client and making every call site await it. Big and invasive — do it in one dedicated pass, not piecemeal.
- [ ] Containerise + deploy to Cloud Run, with Secret Manager for keys and a CI deploy from the working branch
- [ ] Google Classroom hand-off: publish a test as an assignment, pull the roster, push scores back
- [ ] Results export to Google Sheets for teachers
- [ ] Server-side GA4 Measurement Protocol events, since the GA4 script cannot pass the CSP

- [ ] Lược đồ từ vựng: `vocab_entries` / `vocab_senses` / `vocab_examples` / `vocab_forms` / `collocations` + trình nhập
- [x] Lược đồ ngữ pháp: `grammar_points` / `grammar_examples` (dựng cùng mục 12 thì, theo đúng đặc tả `docs/LEARNING.md` mục 6; `linking_words` đã dựng cùng mục từ nối)
- [x] API kích hoạt code phía server (`POST /api/redeem`) + rate-limit chống dò mã, thay `PrepState.redeem` — dựng cùng mục gói thuê bao; giới hạn 12 lần / 10 phút theo tài khoản trong `server/user-api.js`
- [ ] Màn học từ vựng có lặp lại ngắt quãng (SM-2 rút gọn) + bảng `learn_progress`
- [x] Engine chấm điểm: `attempts` + chấm trắc nghiệm/điền từ + bảng quy đổi theo kỳ thi (`docs/SCORING.md` mục 2) — `server/marking.js`, ba tầng, quy đổi `linear`
- [x] Engine làm bài: khung làm bài theo phần, đồng hồ từng phần, tự lưu tiến độ, nộp bài — `server/exam-api.js` và `/prep/lam-bai/`, mọi luật nằm ở server
- [x] Màn kết quả cho học viên: điểm từng phần, phân tích 4 kỹ năng, lịch sử các lần làm — `/prep/ket-qua/:attemptId/`, bảng chi tiết gác sau quyền `detailedReport`
- [ ] Chấm phần Viết và Nói: khung chấm theo tiêu chí + chỗ cắm dịch vụ chấm
- [ ] Tích hợp thanh toán VNPay/MoMo ở chế độ sandbox, tự sinh code sau khi thanh toán thành công
- [ ] Rà soát bảo mật toàn hệ: security headers, rate-limit toàn API, kiểm tra phân quyền từng endpoint
- [ ] Kiểm thử đầu-cuối: luồng học viên và luồng quản trị chạy trong CI

## Ghi chú cho phiên tự động

**Quan trọng — phiên mới clone repo sạch, chưa có `node_modules`.** Đừng chạy lẻ từng lệnh test,
hãy dùng đúng một lệnh sau, nó tự cài dependency, tự bật/tắt server và chạy hết mọi bước:

```bash
npm run verify          # cài deps → build → chạy server → 10 bộ test → audit → chụp ảnh
                        # (test-taikhoan, test-admin, test-auth, test-catalog,
                        #  test-user-api, test-exam, test-items, test-security, test-vocab,
                        #  test-learn)
SKIP_SHOTS=1 npm run verify   # bản nhanh, bỏ bước chụp ảnh
```

Lệnh trả mã thoát khác 0 nếu có bước đỏ. Chỉ push khi nó xanh.

Quy trình một lượt:

1. `git fetch origin` và `git pull --rebase origin claude/prep-test-platform-design-fpiuqn`.
2. Nếu commit gần nhất mới dưới 15 phút: có thể có phiên khác đang làm, bỏ lượt, thoát êm.
3. Lấy mục chưa tick đầu tiên ở **"Nền tảng & engine"** (đầu tệp này). Làm đúng một mục đó.
   Từ 2026-08-12, Routine làm nền tảng và engine; nội dung học thuật do phiên khác làm,
   nên **không** lấy việc ở "Hàng đợi" hay ở các mục nội dung trong phần VPET nữa.
4. Chạy `npm run verify`. Đỏ thì sửa; không sửa được thì `git checkout -- .`, ghi lý do vào
   "Vướng mắc" bên dưới, commit riêng ghi chú đó rồi thoát. Không push code hỏng.
5. Tick ô đã xong, cập nhật README nếu có tính năng mới, commit và push.

Giới hạn: không đụng `data/` (dữ liệu chạy), không commit mật khẩu hay khoá bí mật, không
force-push, không tạo pull request, không đổi nhánh.

## Vướng mắc

_(phiên tự động ghi lại đây nếu bị chặn)_
