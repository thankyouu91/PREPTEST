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
const { q, tx, nowISO } = require('./db');
const A = require('./auth');
const storage = require('./storage');
const { entitlementOf } = require('./entitlements');
const PLANS = require('./data/plans');
const marking = require('./marking');
const EXAM_FORMATS = require('./data/exam-formats');

const router = express.Router();

const str = (v, max) => (typeof v === 'string' ? v.trim().slice(0, max || 400) : '');
const int = (v, dflt) => (Number.isFinite(+v) ? Math.trunc(+v) : dflt);
const bad = (res, msg) => res.status(400).json({ error: msg });

/** How many times an audio item may be played when the blueprint says nothing.
    A platform default like the per-part minutes, not a published exam rule. */
const DEFAULT_REPLAYS = 2;

/**
 * The replay allowance for one part, from the blueprint, falling back to the
 * platform default only where a format has not set one.
 *
 * This is the hook the constant above promised and did not have. Every audio
 * part ran at two replays regardless of what its design needed, and part G —
 * six half-minute passages — needed 193% of its six minutes at that number.
 * The allowance is read in two places and they must agree: the count shown to
 * the candidate, and the limit enforced when they press play. A generous
 * display next to a strict limit is a candidate being refused a replay the
 * screen just offered them.
 */
function replaysFor(familyId, part) {
  const sec = part ? EXAM_FORMATS.sectionOfPart(familyId, part) : null;
  return sec && Number.isFinite(sec.replays) ? sec.replays : DEFAULT_REPLAYS;
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
function ownAttempt(req) {
  const id = int(req.params.id, 0);
  if (!id) return null;
  return q.get('SELECT * FROM attempts WHERE id=? AND user_id=?', id, req.user.id) || null;
}

/** Minutes allowed for a section, from the test as built. */
function partWindow(sectionId) {
  const s = q.get('SELECT minutes FROM sections WHERE id=?', sectionId);
  return Math.max(0, (s && s.minutes) || 0);
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
function attemptState(att) {
  const test = q.get('SELECT * FROM tests WHERE id=?', att.test_id);
  const parts = q.all(
    `SELECT ap.*, s.name, s.skill, s.type, s.minutes, s.sort
       FROM attempt_parts ap JOIN sections s ON s.id = ap.section_id
      WHERE ap.attempt_id=? ORDER BY s.sort, s.id`, att.id);

  const answers = q.all('SELECT * FROM attempt_answers WHERE attempt_id=?', att.id);
  const byQuestion = new Map(answers.map(a => [a.question_id, a]));

  return {
    id: att.id,
    testId: att.test_id,
    testTitle: test ? test.title : att.test_id,
    familyId: test ? test.family_id : null,
    status: att.status,
    startedAt: att.started_at,
    submittedAt: att.submitted_at,
    parts: parts.map(p => {
      const items = q.all(
        `SELECT si.sort, qs.id, qs.prompt, qs.passage, qs.type, qs.options_json, qs.audio_key
           FROM section_items si JOIN questions qs ON qs.id = si.question_id
          WHERE si.section_id=? ORDER BY si.sort, si.id`, p.section_id);
      const open = partOpen(p);
      return {
        sectionId: p.section_id,
        part: p.part || null,
        name: p.name,
        skill: p.skill,
        type: p.type,
        minutes: p.minutes,
        startedAt: p.started_at,
        endsAt: p.ends_at,
        closedAt: p.closed_at,
        secondsLeft: secondsLeft(p),
        open,
        /* Whether the blueprint says this part plays audio. The screen needs it
           to tell "this item has no recording" apart from "this item never had
           one" — part I is spoken but text-prompted, and flagging a missing
           recording there would send a candidate to their teacher over nothing. */
        needsAudio: !!(p.part && (EXAM_FORMATS.sectionOfPart(
          test ? test.family_id : null, p.part) || {}).needsAudio),
        items: items.map(it => {
          const saved = byQuestion.get(it.id);
          const used = saved ? saved.replays_used : 0;
          const allowed = replaysFor(test ? test.family_id : null, p.part);
          return {
            questionId: it.id,
            prompt: it.prompt,
            /* Reading matter shown beside the instruction. The authoring screen
               has accepted this field since the column was added and the exam
               never read it, so anything typed there was silently dropped on
               the way to the candidate — an author could write a part C passage,
               see it saved, and ship a comprehension question about a text
               nobody would ever be shown. */
            passage: it.passage || '',
            type: it.type,
            options: JSON.parse(it.options_json || '[]'),
            hasAudio: !!it.audio_key,
            replaysLeft: it.audio_key ? Math.max(0, allowed - used) : null,
            answer: saved ? saved.answer : '',
            hasRecording: !!(saved && saved.audio_key)
          };
        })
      };
    })
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
router.post('/attempts', A.requireUser, A.csrfGuard, (req, res) => {
  const testId = str(req.body && req.body.testId, 60);

  const running = q.get(
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
    return res.json({ resumed: true, attempt: attemptState(running) });
  }

  const test = q.get("SELECT * FROM tests WHERE id=? AND status='published'", testId);
  if (!test) return res.status(404).json({ error: 'No such published test.' });
  const fam = q.get('SELECT status FROM families WHERE id=?', test.family_id);
  if (fam && fam.status === 'coming_soon') {
    return bad(res, 'This exam is not open yet.');
  }

  const ent = entitlementOf(req.user.id);
  if (!ent) {
    return res.status(403).json({ error: 'You have no plan in force. Enter a code to start practising.', need: 'plan' });
  }
  if (ent.attemptsLeft !== null && ent.attemptsLeft <= 0) {
    return res.status(403).json({
      error: 'You have used all ' + ent.attemptsLimit + ' sittings your plan allows. Move up a plan to practise without a cap.',
      need: 'attempts'
    });
  }

  const sections = q.all('SELECT * FROM sections WHERE test_id=? ORDER BY sort, id', test.id);
  if (!sections.length) return bad(res, 'This paper has no parts yet.');
  const itemCount = q.val(
    `SELECT COUNT(*) c FROM section_items si JOIN sections s ON s.id=si.section_id WHERE s.test_id=?`, test.id);
  if (!itemCount) return bad(res, 'This paper has no questions yet.');

  /* Charge the code that actually paid for this sitting: the cap belongs to the
  purchase, not to the account. Someone holding two capped codes is charged
  the one with room left rather than always the first — the total would still
  be right, but the per-code number would be meaningless, and that is exactly
  the number shown on the "My codes" screen. */
  const liveCodes = q.all(
    `SELECT * FROM codes
      WHERE user_id=? AND status='redeemed' AND plan_id IS NOT NULL
        AND (access_expires_at IS NULL OR access_expires_at > ?)
      ORDER BY id ASC`, req.user.id, nowISO())
    .map(c => ({ row: c, plan: PLANS.byId(c.plan_id) }))
    .filter(x => x.plan);
  const capped = liveCodes.filter(x => x.plan.attempts !== PLANS.UNLIMITED);
  const chargeable = capped.find(x => (x.row.attempts_used || 0) < x.plan.attempts) || null;
  /* The code stamped on a sitting is the one that paid for it — an uncapped plan
  has nothing to decrement, but which purchase it belongs to still matters. */
  const chargeCode = (chargeable && chargeable.row) || (liveCodes[0] && liveCodes[0].row) || null;

  const at = nowISO();
  let attemptId = 0;
  tx(() => {
    const r = q.run(
      `INSERT INTO attempts (user_id,test_id,code_id,status,started_at,updated_at)
       VALUES (?,?,?,'in_progress',?,?)`,
      req.user.id, test.id, chargeCode ? chargeCode.id : null, at, at);
    attemptId = Number(r.lastInsertRowid);
    for (const s of sections) {
      q.run('INSERT INTO attempt_parts (attempt_id,section_id,part) VALUES (?,?,?)',
        attemptId, s.id, s.part || null);
    }
    /* Only decrement when the plan is capped. An uncapped plan still records how
       many sittings were used, for reporting, but has nothing to run out of. */
    if (ent.attemptsLimit !== null && chargeable) {
      q.run('UPDATE codes SET attempts_used = attempts_used + 1 WHERE id=?', chargeable.row.id);
    }
  });

  const att = q.get('SELECT * FROM attempts WHERE id=?', attemptId);
  res.status(201).json({ resumed: false, attempt: attemptState(att) });
});

/** The unfinished sitting, if there is one — used to resume after closing the browser. */
router.get('/attempts/current', A.requireUser, (req, res) => {
  const att = q.get(
    "SELECT * FROM attempts WHERE user_id=? AND status='in_progress' ORDER BY id DESC LIMIT 1",
    req.user.id);
  if (!att) return res.json({ attempt: null });
  res.set('Cache-Control', 'no-store').json({ attempt: attemptState(att) });
});

router.get('/attempts/:id', A.requireUser, (req, res) => {
  const att = ownAttempt(req);
  if (!att) return res.status(404).json({ error: 'No such sitting.' });
  res.set('Cache-Control', 'no-store').json({ attempt: attemptState(att) });
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
router.post('/attempts/:id/parts/:sectionId/start', A.requireUser, A.csrfGuard, (req, res) => {
  const att = ownAttempt(req);
  if (!att) return res.status(404).json({ error: 'No such sitting.' });
  if (att.status !== 'in_progress') return bad(res, 'This sitting has been handed in.');

  const sectionId = int(req.params.sectionId, 0);
  const row = q.get('SELECT * FROM attempt_parts WHERE attempt_id=? AND section_id=?', att.id, sectionId);
  if (!row) return res.status(404).json({ error: 'No such part in this sitting.' });
  if (row.closed_at) return bad(res, 'This part has finished.');
  if (row.started_at) {
    /* Re-entering an open part is perfectly normal (a page reload, a dropped
       connection); it must never grant a fresh clock. */
    return res.json({ sectionId, startedAt: row.started_at, endsAt: row.ends_at, secondsLeft: secondsLeft(row) });
  }

  const at = new Date();
  const minutes = partWindow(sectionId);
  const ends = minutes ? new Date(at.getTime() + minutes * 60000).toISOString() : null;
  q.run('UPDATE attempt_parts SET started_at=?, ends_at=? WHERE id=?', at.toISOString(), ends, row.id);
  q.run('UPDATE attempts SET updated_at=? WHERE id=?', at.toISOString(), att.id);
  res.json({ sectionId, startedAt: at.toISOString(), endsAt: ends, secondsLeft: minutes ? minutes * 60 : null });
});

/** Finish a part early — no going back, exactly as in the real room. */
router.post('/attempts/:id/parts/:sectionId/close', A.requireUser, A.csrfGuard, (req, res) => {
  const att = ownAttempt(req);
  if (!att) return res.status(404).json({ error: 'No such sitting.' });
  if (att.status !== 'in_progress') return bad(res, 'This sitting has been handed in.');
  const sectionId = int(req.params.sectionId, 0);
  const row = q.get('SELECT * FROM attempt_parts WHERE attempt_id=? AND section_id=?', att.id, sectionId);
  if (!row) return res.status(404).json({ error: 'No such part in this sitting.' });
  if (row.closed_at) return res.json({ ok: true, closedAt: row.closed_at });
  const at = nowISO();
  q.run('UPDATE attempt_parts SET closed_at=? WHERE id=?', at, row.id);
  q.run('UPDATE attempts SET updated_at=? WHERE id=?', at, att.id);
  res.json({ ok: true, closedAt: at });
});

/* ------------------------------------------------------------------ *
 * Autosave
 * ------------------------------------------------------------------ */

/** Whether a question really belongs to this sitting, and which part it is in */
function itemOf(attemptId, questionId) {
  return q.get(
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
router.patch('/attempts/:id/answers', A.requireUser, A.csrfGuard, (req, res) => {
  const att = ownAttempt(req);
  if (!att) return res.status(404).json({ error: 'No such sitting.' });
  if (att.status !== 'in_progress') return bad(res, 'This sitting has been handed in and cannot be changed.');

  const list = Array.isArray(req.body && req.body.answers) ? req.body.answers.slice(0, 200) : null;
  if (!list || !list.length) return bad(res, 'There are no answers to save.');

  const saved = [];
  const rejected = [];
  const at = nowISO();
  tx(() => {
    for (const raw of list) {
      const questionId = int(raw && raw.questionId, 0);
      const answer = str(raw && raw.answer, 20000);
      const item = itemOf(att.id, questionId);
      if (!item) { rejected.push({ questionId, reason: 'not-in-attempt' }); continue; }
      if (!partOpen(item)) { rejected.push({ questionId, reason: 'part-closed' }); continue; }
      q.run(
        `INSERT INTO attempt_answers (attempt_id,question_id,section_id,answer,updated_at)
         VALUES (?,?,?,?,?)
         ON CONFLICT(attempt_id,question_id) DO UPDATE SET answer=excluded.answer, updated_at=excluded.updated_at`,
        att.id, questionId, item.section_id, answer, at);
      saved.push(questionId);
    }
    q.run('UPDATE attempts SET updated_at=? WHERE id=?', at, att.id);
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
  const att = ownAttempt(req);
  if (!att) return res.status(404).json({ error: 'No such sitting.' });
  if (att.status !== 'in_progress') return res.status(403).json({ error: 'This sitting has been handed in.' });

  const questionId = int(req.params.questionId, 0);
  const item = itemOf(att.id, questionId);
  if (!item) return res.status(404).json({ error: 'That question is not part of this sitting.' });
  if (!partOpen(item)) return res.status(403).json({ error: 'Time is up for this part.' });

  const qs = q.get('SELECT audio_key FROM questions WHERE id=?', questionId);
  if (!qs || !qs.audio_key) return res.status(404).json({ error: 'This item has no audio file.' });

  const row = q.get('SELECT * FROM attempt_answers WHERE attempt_id=? AND question_id=?', att.id, questionId);
  const used = row ? row.replays_used : 0;
  /* Read from the same place the count shown on screen came from. If these two
     ever disagree the candidate is refused a replay the interface just offered
     them, mid-exam, with the clock running. */
  const fam = q.val(
    'SELECT t.family_id FROM attempts a JOIN tests t ON t.id=a.test_id WHERE a.id=?', att.id);
  const allowed = replaysFor(fam, item.part);
  if (used >= allowed) {
    return res.status(429).json({ error: 'You have used every replay for this item.', replaysLeft: 0 });
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
  q.run(
    `INSERT INTO attempt_answers (attempt_id,question_id,section_id,replays_used,updated_at)
     VALUES (?,?,?,1,?)
     ON CONFLICT(attempt_id,question_id) DO UPDATE SET replays_used = replays_used + 1, updated_at=excluded.updated_at`,
    att.id, questionId, item.section_id, at);

  res.set('Content-Type', 'audio/mpeg')
    .set('Content-Length', String(file.body.length))
    /* An exam paper carries its own answers: it must not sit in a shared cache, nor
       a private one, because a cached copy is a replay that was never counted. */
    .set('Cache-Control', 'private, no-store')
    .set('X-Replays-Left', String(Math.max(0, allowed - used - 1)))
    .send(file.body);
});

/** A recorded answer (parts H, I, J). Raw bytes, no multipart. */
router.post('/attempts/:id/items/:questionId/recording',
  A.requireUser, A.csrfGuard, answerAudioBody, async (req, res) => {
    const att = ownAttempt(req);
    if (!att) return res.status(404).json({ error: 'No such sitting.' });
    if (att.status !== 'in_progress') return bad(res, 'This sitting has been handed in.');

    const questionId = int(req.params.questionId, 0);
    const item = itemOf(att.id, questionId);
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
    const prev = q.get('SELECT audio_key FROM attempt_answers WHERE attempt_id=? AND question_id=?',
      att.id, questionId);
    q.run(
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
router.post('/attempts/:id/submit', A.requireUser, A.csrfGuard, (req, res) => {
  const att = ownAttempt(req);
  if (!att) return res.status(404).json({ error: 'No such sitting.' });
  if (att.status === 'submitted') {
    return res.json({ ok: true, alreadySubmitted: true, submittedAt: att.submitted_at });
  }

  const at = nowISO();
  tx(() => {
    q.run('UPDATE attempt_parts SET closed_at=? WHERE attempt_id=? AND closed_at IS NULL', at, att.id);
    q.run("UPDATE attempts SET status='submitted', submitted_at=?, updated_at=? WHERE id=?", at, at, att.id);
  });
  /* Mark what a machine can mark straight away (multiple choice, gap fill).
  Writing and Speaking are left pending — marking them zero is a lie wearing
  the costume of a result. Marking re-runs, so fixing the marker never means
  sitting the test again. */
  marking.markAttempt(att.id);

  const answered = q.val(
    "SELECT COUNT(*) c FROM attempt_answers WHERE attempt_id=? AND (answer <> '' OR audio_key IS NOT NULL)", att.id);
  const total = q.val(
    `SELECT COUNT(*) c FROM section_items si
       JOIN attempt_parts ap ON ap.section_id = si.section_id
      WHERE ap.attempt_id=?`, att.id);

  res.json({ ok: true, submittedAt: at, answered, total });
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
router.get('/attempts/:id/result', A.requireUser, (req, res) => {
  const att = ownAttempt(req);
  if (!att) return res.status(404).json({ error: 'No such sitting.' });
  if (att.status !== 'submitted') {
    return res.status(409).json({ error: 'This sitting has not been handed in, so there is no result yet.' });
  }
  const ent = entitlementOf(req.user.id);
  const detailed = !!(ent && ent.features && ent.features.detailedReport);
  const out = marking.resultOf(att.id, detailed);
  if (!out) return res.status(404).json({ error: 'No such sitting.' });
  /* Say plainly why the report is short, rather than letting it look like a fault. */
  if (!detailed) out.upgradeHint = 'The part-by-part breakdown comes with Plus and above.';
  res.set('Cache-Control', 'no-store').json(out);
});

/** The history of past sittings — the progress screen reads this. */
router.get('/attempts', A.requireUser, (req, res) => {
  const rows = q.all(
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
