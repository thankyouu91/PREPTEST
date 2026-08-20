/**
 * Exam engine — the sitting itself.
 *
 * This is the half of the engine that has to be right, because none of it can
 * be trusted to the browser:
 *
 *   · Timing is stamped and checked here. A client clock can be wound back,
 *     a tab can be frozen and resumed, a request can be replayed. The deadline
 *     for a part is written when the candidate enters it and every later write
 *     is measured against it.
 *   · Replays are counted here. A play counter in JavaScript is a suggestion;
 *     a candidate who opens the console has infinite listens to a dictation.
 *   · Items go out with the answer key stripped. Nothing on this router ever
 *     serialises `answer` or `explanation` — the mark comes later, server side.
 *   · A sitting is charged against the buyer's plan here, once, at the start.
 *
 * What is deliberately NOT here: marking. Scoring lives in its own pass
 * (docs/SCORING.md, tiers 1-3) and runs over the saved answers after submit, so
 * a marking change never needs the candidate to sit the test again.
 */
'use strict';

const express = require('express');
const { asyncRoutes } = require('./async-route');
const { q, tx, nowISO } = require('./db');
const A = require('./auth');
const analytics = require('./analytics');
const storage = require('./storage');
const { entitlementOf } = require('./entitlements');
const PLANS = require('./data/plans');
const marking = require('./marking');

const router = asyncRoutes(express.Router());

const str = (v, max) => (typeof v === 'string' ? v.trim().slice(0, max || 400) : '');
const int = (v, dflt) => (Number.isFinite(+v) ? Math.trunc(+v) : dflt);
const bad = (res, msg) => res.status(400).json({ error: msg });

/** How many times an audio item may be played when the blueprint says nothing. */
const DEFAULT_REPLAYS = 2;

const EXAM_FORMATS = require('./data/exam-formats');

/**
 * How many times THIS part's audio may be played.
 *
 * VPET plays each recording once: "You will hear the sentence only once" (Part E)
 * and "It will be spoken once" (Part J), with no replay control described for any
 * other part either. The blueprint carries the number per part; two remains the
 * fallback for a family that publishes no part table, where nothing is known.
 */
function playsFor(familyId, part) {
  if (!familyId || !part) return DEFAULT_REPLAYS;
  const sec = EXAM_FORMATS.sectionOfPart(familyId, part);
  return sec && sec.plays ? sec.plays : DEFAULT_REPLAYS;
}

/**
 * How this part paces the items inside it, or null when it does not.
 *
 * Only Part B for now, and only because the guide is explicit about it: the
 * passage "will disappear after 30 seconds", then "You have 90 seconds to
 * rewrite the passage." A part rendered all at once, with all three passages
 * sitting on the screen for six minutes, is a copying exercise wearing a memory
 * exercise's name - and someone practising on it would arrive at the real test
 * having practised the wrong skill.
 *
 * The numbers come from the blueprint's timing table, the same one that decides
 * how long the part itself runs, so the two can never drift apart. Parts H, I
 * and J want this as well - a clock and a beep per spoken answer - and will get
 * it from here rather than from a second table.
 *
 * The part's own clock stays authoritative and stays on the server. This paces
 * what a candidate SEES inside that window; it is not a second enforcement
 * layer, and it does not pretend to be one.
 */
function pacingFor(familyId, part) {
  if (!familyId || !part) return null;
  const t = EXAM_FORMATS.vpetTiming()[part];
  /* `read` is the marker: it is what makes a part two-phase. A part whose items
     are simply answered one after another needs nothing here. */
  if (!t || !t.read) return null;
  const sec = EXAM_FORMATS.sectionOfPart(familyId, part);
  if (!sec) return null;
  return { read: t.read, answer: t.answer || 0 };
}

/* Spoken answers are recorded in the browser and uploaded as bytes. Same
   ceiling and same raw-body approach as the admin MP3 upload: no multipart
   parser, so no new dependency. */
const answerAudioBody = express.raw({ type: ['audio/*', 'application/octet-stream'], limit: '10mb' });

/* ------------------------------------------------------------------ *
 * Helpers
 * ------------------------------------------------------------------ */

/** The attempt, only if it belongs to the caller. Anything else is a 404: an
    attempt id that exists must not be distinguishable from one that does not. */
async function ownAttempt(req) {
  const id = int(req.params.id, 0);
  if (!id) return null;
  return await q.get('SELECT * FROM attempts WHERE id=? AND user_id=?', id, req.user.id) || null;
}

/** Minutes allowed for a section, from the test as built. */
/**
 * How long a part is open for, in SECONDS.
 *
 * `sections.seconds` when it is set, because that is the only column that can
 * hold what VPET actually allows - 25 seconds an item in Part A, 15 in Part F.
 * Rounded to minutes those become 30 and 0, and ten such roundings do not
 * cancel out. Falls back to minutes for a paper built before the column existed.
 */
async function partWindow(sectionId) {
  const s = await q.get('SELECT minutes, seconds FROM sections WHERE id=?', sectionId);
  if (!s) return 0;
  if (s.seconds != null && s.seconds > 0) return Math.max(0, s.seconds);
  return Math.max(0, (s.minutes || 0) * 60);
}

/** Seconds left in a part; null when it has no timer or has not started. */
function secondsLeft(row) {
  if (!row || !row.ends_at) return null;
  return Math.max(0, Math.round((new Date(row.ends_at) - new Date()) / 1000));
}

/** True when the part is open for writing right now. */
function partOpen(row) {
  if (!row || !row.started_at || row.closed_at) return false;
  if (!row.ends_at) return true;                        // no timer declared
  return new Date(row.ends_at) > new Date();
}

/**
 * The state a runner needs, with nothing it must not have.
 *
 * Items carry the prompt and the options but never the answer: the options of
 * a multiple-choice item are on screen anyway, the answer is what marks it.
 */
async function attemptState(att) {
  const test = await q.get('SELECT * FROM tests WHERE id=?', att.test_id);
  const parts = await q.all(
    `SELECT ap.*, s.name, s.skill, s.type, s.minutes, s.seconds, s.sort, s.part AS section_part
       FROM attempt_parts ap JOIN sections s ON s.id = ap.section_id
      WHERE ap.attempt_id=? ORDER BY s.sort, s.id`, att.id);

  const answers = await q.all('SELECT * FROM attempt_answers WHERE attempt_id=?', att.id);
  const byQuestion = new Map(answers.map(a => [a.question_id, a]));

  return {
    id: att.id,
    testId: att.test_id,
    testTitle: test ? test.title : att.test_id,
    familyId: test ? test.family_id : null,
    status: att.status,
    startedAt: att.started_at,
    submittedAt: att.submitted_at,
    /* Promise.all rather than a bare map: the callback reads each part's
       items, so mapping it alone would put promises on the response. */
    parts: await Promise.all(parts.map(async p => {
      const items = await q.all(
        `SELECT si.sort, qs.id, qs.prompt, qs.type, qs.options_json, qs.audio_key
           FROM section_items si JOIN questions qs ON qs.id = si.question_id
          WHERE si.section_id=? ORDER BY si.sort, si.id`, p.section_id);
      const open = partOpen(p);
      const letter = p.part || p.section_part;
      const plays = playsFor(test ? test.family_id : null, p.part || p.section_part);
      /* The floor the guide sets for this part's writing, so the browser can show
         a word count against it instead of leaving the candidate to guess. */
      const bp = test && letter ? EXAM_FORMATS.sectionOfPart(test.family_id, letter) : null;
      const minWords = bp && bp.minWords ? bp.minWords : null;
      /* How the exam paces the items INSIDE this part, when it paces them at
         all. Part B is the case that forced this: the guide says the passage
         "will disappear after 30 seconds", and a part that renders all three
         passages at once and leaves them there is not a memory task, it is a
         copying task. Sent as the blueprint's own numbers rather than as a flag,
         so the browser is showing what the exam says instead of a constant
         somebody typed into a script. */
      const pacing = letter ? pacingFor(test ? test.family_id : null, letter) : null;
      return {
        sectionId: p.section_id,
        part: p.part || p.section_part || null,
        plays,
        minWords,
        pacing,
        name: p.name,
        skill: p.skill,
        type: p.type,
        minutes: p.minutes,
        startedAt: p.started_at,
        endsAt: p.ends_at,
        closedAt: p.closed_at,
        secondsLeft: secondsLeft(p),
        open,
        items: items.map(it => {
          const saved = byQuestion.get(it.id);
          const used = saved ? saved.replays_used : 0;
          return {
            questionId: it.id,
            prompt: it.prompt,
            type: it.type,
            options: JSON.parse(it.options_json || '[]'),
            hasAudio: !!it.audio_key,
            replaysLeft: it.audio_key ? Math.max(0, plays - used) : null,
            answer: saved ? saved.answer : '',
            hasRecording: !!(saved && saved.audio_key)
          };
        })
      };
    }))
  };
}

/* ------------------------------------------------------------------ *
 * Start / resume
 * ------------------------------------------------------------------ */

/**
 * Start a sitting, or hand back the one already running.
 *
 * A sitting is charged when it starts, not when it is submitted. Charging on
 * submit would make abandoning free and unlimited, which empties the meaning of
 * "ten sittings". Resuming never charges twice — the running attempt is
 * returned as it stands.
 */
router.post('/attempts', A.requireUser, A.csrfGuard, async (req, res) => {
  const testId = str(req.body && req.body.testId, 60);

  const running = await q.get(
    "SELECT * FROM attempts WHERE user_id=? AND status='in_progress' ORDER BY id DESC LIMIT 1",
    req.user.id);
  if (running) {
    /* One sitting at a time: opening another while one is unfinished is a reliable
    way to lose the first without anyone noticing. */
    if (testId && running.test_id !== testId) {
      return res.status(409).json({
        error: 'You have a test that has not been handed in. Hand it in or finish it before opening another.',
        attemptId: running.id, testId: running.test_id
      });
    }
    return res.json({ resumed: true, attempt: await attemptState(running) });
  }

  const test = await q.get("SELECT * FROM tests WHERE id=? AND status='published'", testId);
  if (!test) return res.status(404).json({ error: 'No such published test.' });
  const fam = await q.get('SELECT status FROM families WHERE id=?', test.family_id);
  if (fam && fam.status === 'coming_soon') {
    return bad(res, 'This exam is not open yet.');
  }

  const ent = await entitlementOf(req.user.id);
  if (!ent) {
    return res.status(403).json({ error: 'You have no plan in force. Enter a code to start practising.', need: 'plan' });
  }
  if (ent.attemptsLeft !== null && ent.attemptsLeft <= 0) {
    return res.status(403).json({
      error: 'You have used all ' + ent.attemptsLimit + ' sittings your plan allows. Move up a plan to practise without a cap.',
      need: 'attempts'
    });
  }

  const sections = await q.all('SELECT * FROM sections WHERE test_id=? ORDER BY sort, id', test.id);
  if (!sections.length) return bad(res, 'This paper has no parts yet.');
  const itemCount = await q.val(
    `SELECT COUNT(*) c FROM section_items si JOIN sections s ON s.id=si.section_id WHERE s.test_id=?`, test.id);
  if (!itemCount) return bad(res, 'This paper has no questions yet.');

  /* Charge the code that actually paid for this sitting: the cap belongs to the
  purchase, not to the account. Someone holding two capped codes is charged
  the one with room left rather than always the first — the total would still
  be right, but the per-code number would be meaningless, and that is exactly
  the number shown on the "My codes" screen. */
  const liveCodes = (await q.all(
    `SELECT * FROM codes
      WHERE user_id=? AND status='redeemed' AND plan_id IS NOT NULL
        AND (access_expires_at IS NULL OR access_expires_at > ?)
      ORDER BY id ASC`, req.user.id, nowISO()))
    .map(c => ({ row: c, plan: PLANS.byId(c.plan_id) }))
    .filter(x => x.plan);
  const capped = liveCodes.filter(x => x.plan.attempts !== PLANS.UNLIMITED);
  const chargeable = capped.find(x => (x.row.attempts_used || 0) < x.plan.attempts) || null;
  /* The code stamped on a sitting is the one that paid for it — an uncapped plan
  has nothing to decrement, but which purchase it belongs to still matters. */
  const chargeCode = (chargeable && chargeable.row) || (liveCodes[0] && liveCodes[0].row) || null;

  const at = nowISO();
  let attemptId = 0;
  await tx(async () => {
    const r = await q.run(
      `INSERT INTO attempts (user_id,test_id,code_id,status,started_at,updated_at)
       VALUES (?,?,?,'in_progress',?,?)`,
      req.user.id, test.id, chargeCode ? chargeCode.id : null, at, at);
    attemptId = Number(r.lastInsertRowid);
    for (const s of sections) {
      await q.run('INSERT INTO attempt_parts (attempt_id,section_id,part) VALUES (?,?,?)',
        attemptId, s.id, s.part || null);
    }
    /* Only decrement when the plan is capped. An uncapped plan still records how
       many sittings were used, for reporting, but has nothing to run out of. */
    if (ent.attemptsLimit !== null && chargeable) {
      await q.run('UPDATE codes SET attempts_used = attempts_used + 1 WHERE id=?', chargeable.row.id);
    }
  });

  const att = await q.get('SELECT * FROM attempts WHERE id=?', attemptId);
  analytics.track(req, 'exam_start', { test_id: test.id, family_id: test.family_id });
  res.status(201).json({ resumed: false, attempt: await attemptState(att) });
});

/** The unfinished sitting, if there is one — used to resume after closing the browser. */
router.get('/attempts/current', A.requireUser, async (req, res) => {
  const att = await q.get(
    "SELECT * FROM attempts WHERE user_id=? AND status='in_progress' ORDER BY id DESC LIMIT 1",
    req.user.id);
  if (!att) return res.json({ attempt: null });
  res.set('Cache-Control', 'no-store').json({ attempt: await attemptState(att) });
});

router.get('/attempts/:id', A.requireUser, async (req, res) => {
  const att = await ownAttempt(req);
  if (!att) return res.status(404).json({ error: 'No such sitting.' });
  res.set('Cache-Control', 'no-store').json({ attempt: await attemptState(att) });
});

/* ------------------------------------------------------------------ *
 * Per-part timer
 * ------------------------------------------------------------------ */

/**
 * Enter a part and start its clock.
 *
 * The deadline is computed and stored here rather than sent by the client, and
 * entering a part that has already run is not a way to get a fresh clock.
 */
router.post('/attempts/:id/parts/:sectionId/start', A.requireUser, A.csrfGuard, async (req, res) => {
  const att = await ownAttempt(req);
  if (!att) return res.status(404).json({ error: 'No such sitting.' });
  if (att.status !== 'in_progress') return bad(res, 'This sitting has been handed in.');

  const sectionId = int(req.params.sectionId, 0);
  const row = await q.get('SELECT * FROM attempt_parts WHERE attempt_id=? AND section_id=?', att.id, sectionId);
  if (!row) return res.status(404).json({ error: 'No such part in this sitting.' });
  if (row.closed_at) return bad(res, 'This part has finished.');
  if (row.started_at) {
    /* Re-entering an open part is perfectly normal (a page reload, a dropped
       connection); it must never grant a fresh clock. */
    return res.json({ sectionId, startedAt: row.started_at, endsAt: row.ends_at, secondsLeft: secondsLeft(row) });
  }

  const at = new Date();
  const secs = await partWindow(sectionId);
  const ends = secs ? new Date(at.getTime() + secs * 1000).toISOString() : null;
  await q.run('UPDATE attempt_parts SET started_at=?, ends_at=? WHERE id=?', at.toISOString(), ends, row.id);
  await q.run('UPDATE attempts SET updated_at=? WHERE id=?', at.toISOString(), att.id);
  res.json({ sectionId, startedAt: at.toISOString(), endsAt: ends, secondsLeft: secs || null });
});

/** Finish a part early — no going back, exactly as in the real room. */
router.post('/attempts/:id/parts/:sectionId/close', A.requireUser, A.csrfGuard, async (req, res) => {
  const att = await ownAttempt(req);
  if (!att) return res.status(404).json({ error: 'No such sitting.' });
  if (att.status !== 'in_progress') return bad(res, 'This sitting has been handed in.');
  const sectionId = int(req.params.sectionId, 0);
  const row = await q.get('SELECT * FROM attempt_parts WHERE attempt_id=? AND section_id=?', att.id, sectionId);
  if (!row) return res.status(404).json({ error: 'No such part in this sitting.' });
  if (row.closed_at) return res.json({ ok: true, closedAt: row.closed_at });
  const at = nowISO();
  await q.run('UPDATE attempt_parts SET closed_at=? WHERE id=?', at, row.id);
  await q.run('UPDATE attempts SET updated_at=? WHERE id=?', at, att.id);
  res.json({ ok: true, closedAt: at });
});

/* ------------------------------------------------------------------ *
 * Autosave
 * ------------------------------------------------------------------ */

/** Whether a question really belongs to this sitting, and which part it is in */
async function itemOf(attemptId, questionId) {
  return await q.get(
    `SELECT si.section_id, ap.* FROM section_items si
       JOIN attempt_parts ap ON ap.section_id = si.section_id AND ap.attempt_id=?
      WHERE si.question_id=?`, attemptId, questionId);
}

/**
 * Save answers as they are typed.
 *
 * Accepts a batch so a runner can flush several fields at once. Every answer is
 * checked against its own part's clock: a batch that arrives after the part
 * closed is refused item by item, and the response says which ones were kept,
 * so the runner can show the candidate the truth instead of a silent loss.
 */
router.patch('/attempts/:id/answers', A.requireUser, A.csrfGuard, async (req, res) => {
  const att = await ownAttempt(req);
  if (!att) return res.status(404).json({ error: 'No such sitting.' });
  if (att.status !== 'in_progress') return bad(res, 'This sitting has been handed in and cannot be changed.');

  const list = Array.isArray(req.body && req.body.answers) ? req.body.answers.slice(0, 200) : null;
  if (!list || !list.length) return bad(res, 'There are no answers to save.');

  const saved = [];
  const rejected = [];
  const at = nowISO();
  await tx(async () => {
    for (const raw of list) {
      const questionId = int(raw && raw.questionId, 0);
      const answer = str(raw && raw.answer, 20000);
      const item = await itemOf(att.id, questionId);
      if (!item) { rejected.push({ questionId, reason: 'not-in-attempt' }); continue; }
      if (!partOpen(item)) { rejected.push({ questionId, reason: 'part-closed' }); continue; }
      await q.run(
        `INSERT INTO attempt_answers (attempt_id,question_id,section_id,answer,updated_at)
         VALUES (?,?,?,?,?)
         ON CONFLICT(attempt_id,question_id) DO UPDATE SET answer=excluded.answer, updated_at=excluded.updated_at`,
        att.id, questionId, item.section_id, answer, at);
      saved.push(questionId);
    }
    await q.run('UPDATE attempts SET updated_at=? WHERE id=?', at, att.id);
  });

  res.json({ saved, rejected, savedAt: at });
});

/* ------------------------------------------------------------------ *
 * Audio: prompt playback and spoken answers
 * ------------------------------------------------------------------ */

/**
 * Play the prompt audio for one item, and spend one replay doing it.
 *
 * The count is decided and stored here. Anything the browser tracks is a
 * courtesy display; a candidate with the network tab open would otherwise have
 * a dictation on loop.
 */
router.get('/attempts/:id/items/:questionId/audio', A.requireUser, async (req, res) => {
  const att = await ownAttempt(req);
  if (!att) return res.status(404).json({ error: 'No such sitting.' });
  if (att.status !== 'in_progress') return res.status(403).json({ error: 'This sitting has been handed in.' });

  const questionId = int(req.params.questionId, 0);
  const item = await itemOf(att.id, questionId);
  if (!item) return res.status(404).json({ error: 'That question is not part of this sitting.' });
  if (!partOpen(item)) return res.status(403).json({ error: 'Time is up for this part.' });

  const qs = await q.get('SELECT audio_key FROM questions WHERE id=?', questionId);
  if (!qs || !qs.audio_key) return res.status(404).json({ error: 'This item has no audio file.' });

  const row = await q.get('SELECT * FROM attempt_answers WHERE attempt_id=? AND question_id=?', att.id, questionId);
  const used = row ? row.replays_used : 0;
  const test = await q.get('SELECT family_id FROM tests WHERE id=?', att.test_id);
  const sec = await q.get('SELECT part FROM sections WHERE id=?', item.section_id);
  const plays = playsFor(test && test.family_id, sec && sec.part);
  if (used >= plays) {
    return res.status(429).json({
      error: plays === 1
        ? 'This recording plays once, and it has been played.'
        : 'You have used every replay for this item.',
      replaysLeft: 0
    });
  }

  let file;
  try {
    file = await storage.get(qs.audio_key);
  } catch (e) {
    console.error('[exam] audio read failed', e);
    return res.status(502).json({ error: 'The audio file could not be read.' });
  }

  /* Only spend a replay once the file has definitely been read: charging for a
  disk failure costs the candidate a replay for the system's mistake. */
  const at = nowISO();
  await q.run(
    `INSERT INTO attempt_answers (attempt_id,question_id,section_id,replays_used,updated_at)
     VALUES (?,?,?,1,?)
     ON CONFLICT(attempt_id,question_id) DO UPDATE SET replays_used = replays_used + 1, updated_at=excluded.updated_at`,
    att.id, questionId, item.section_id, at);

  res.set('Content-Type', 'audio/mpeg')
    .set('Content-Length', String(file.body.length))
    /* An exam paper carries its own answers: it must not sit in a shared cache, nor
       a private one, because a cached copy is a replay that was never counted. */
    .set('Cache-Control', 'private, no-store')
    .set('X-Replays-Left', String(Math.max(0, plays - used - 1)))
    .send(file.body);
});

/** A recorded answer (parts H, I, J). Raw bytes, no multipart. */
router.post('/attempts/:id/items/:questionId/recording',
  A.requireUser, A.csrfGuard, answerAudioBody, async (req, res) => {
    const att = await ownAttempt(req);
    if (!att) return res.status(404).json({ error: 'No such sitting.' });
    if (att.status !== 'in_progress') return bad(res, 'This sitting has been handed in.');

    const questionId = int(req.params.questionId, 0);
    const item = await itemOf(att.id, questionId);
    if (!item) return res.status(404).json({ error: 'That question is not part of this sitting.' });
    if (!partOpen(item)) return res.status(403).json({ error: 'Time is up for this part.' });

    const body = req.body;
    if (!body || !body.length) return bad(res, 'No recording data was received.');

    let stored;
    try {
      stored = await storage.putRecording(body, req.headers['content-type']);
    } catch (e) {
      if (e && e.code === 'INVALID_AUDIO') return bad(res, e.message);
      console.error('[exam] recording save failed', e);
      return res.status(502).json({ error: 'The recording could not be saved.' });
    }

    const at = nowISO();
    const prev = await q.get('SELECT audio_key FROM attempt_answers WHERE attempt_id=? AND question_id=?',
      att.id, questionId);
    await q.run(
      `INSERT INTO attempt_answers (attempt_id,question_id,section_id,audio_key,updated_at)
       VALUES (?,?,?,?,?)
       ON CONFLICT(attempt_id,question_id) DO UPDATE SET audio_key=excluded.audio_key, updated_at=excluded.updated_at`,
      att.id, questionId, item.section_id, stored.key, at);
    /* On a re-record nothing points at the old file — delete it rather than letting the store fill with orphans. */
    if (prev && prev.audio_key) await storage.remove(prev.audio_key).catch(() => {});

    res.status(201).json({ ok: true, bytes: body.length, savedAt: at });
  });

/* ------------------------------------------------------------------ *
 * Submit
 * ------------------------------------------------------------------ */

/**
 * Hand the paper in.
 *
 * Marking does not happen here. The sitting closes, every part closes with it,
 * and the answers sit waiting for the scoring pass — which means a fix to the
 * marker can be re-run over old sittings without asking anyone to sit again.
 */
router.post('/attempts/:id/submit', A.requireUser, A.csrfGuard, async (req, res) => {
  const att = await ownAttempt(req);
  if (!att) return res.status(404).json({ error: 'No such sitting.' });
  if (att.status === 'submitted') {
    return res.json({ ok: true, alreadySubmitted: true, submittedAt: att.submitted_at });
  }

  const at = nowISO();
  await tx(async () => {
    await q.run('UPDATE attempt_parts SET closed_at=? WHERE attempt_id=? AND closed_at IS NULL', at, att.id);
    await q.run("UPDATE attempts SET status='submitted', submitted_at=?, updated_at=? WHERE id=?", at, at, att.id);
  });
  /* Mark what a machine can mark straight away (multiple choice, gap fill).
  Writing and Speaking are left pending — marking them zero is a lie wearing
  the costume of a result. Marking re-runs, so fixing the marker never means
  sitting the test again. */
  await marking.markAttempt(att.id);

  const answered = await q.val(
    "SELECT COUNT(*) c FROM attempt_answers WHERE attempt_id=? AND (answer <> '' OR audio_key IS NOT NULL)", att.id);
  const total = await q.val(
    `SELECT COUNT(*) c FROM section_items si
       JOIN attempt_parts ap ON ap.section_id = si.section_id
      WHERE ap.attempt_id=?`, att.id);

  analytics.track(req, 'exam_submit', { test_id: att.test_id, answered, total });
  res.json({ ok: true, submittedAt: at, answered, total });

  /* Writing and speaking go to the rubric marker AFTER the receipt has gone. A
     dozen model calls is a minute the candidate would otherwise spend on a
     spinner, and a closed tab would lose the lot. Deliberately not awaited; the
     result screen fills in as the marks land. No-op when no key is configured. */
  require('./ai-marking-run').kick(att.id);
});

/**
 * The result of one sitting.
 *
 * How much detail depends on the plan bought, and that decision belongs on the
 * server: Starter buys "the ordinary mark-and-band report", so it gets the mark and
 * the band; Plus and above get the part-by-part and item-by-item breakdown. Hiding
 * it in the interface is undone by anyone who opens the page source, so that data
 * must not leave here at all.
 */
router.get('/attempts/:id/result', A.requireUser, async (req, res) => {
  const att = await ownAttempt(req);
  if (!att) return res.status(404).json({ error: 'No such sitting.' });
  if (att.status !== 'submitted') {
    return res.status(409).json({ error: 'This sitting has not been handed in, so there is no result yet.' });
  }
  const ent = await entitlementOf(req.user.id);
  const detailed = !!(ent && ent.features && ent.features.detailedReport);
  const out = await marking.resultOf(att.id, detailed);
  if (!out) return res.status(404).json({ error: 'No such sitting.' });
  /* Say plainly why the report is short, rather than letting it look like a fault. */
  if (!detailed) out.upgradeHint = 'The part-by-part breakdown comes with Plus and above.';
  res.set('Cache-Control', 'no-store').json(out);
});

/** The history of past sittings — the progress screen reads this. */
router.get('/attempts', A.requireUser, async (req, res) => {
  const rows = await q.all(
    `SELECT a.*, t.title FROM attempts a LEFT JOIN tests t ON t.id = a.test_id
      WHERE a.user_id=? ORDER BY a.id DESC LIMIT 50`, req.user.id);
  res.set('Cache-Control', 'no-store').json({
    items: rows.map(r => ({
      id: r.id, testId: r.test_id, testTitle: r.title || r.test_id, status: r.status,
      startedAt: r.started_at, submittedAt: r.submitted_at
    }))
  });
});

module.exports = router;
