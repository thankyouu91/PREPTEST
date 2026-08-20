/**
 * The pass that marks a submitted paper's writing and speaking.
 *
 * Separate from server/ai-marking.js, which knows how to talk to a model, and
 * from server/marking.js, which knows what a score means. This knows only the
 * order of operations: find what is unmarked, mark it one item at a time, write
 * each result down as it arrives, and re-score the paper at the end so the skill
 * marks and the overall band catch up.
 *
 * ## It runs after the response
 *
 * Marking a paper is a dozen model calls. Doing that inside the submit request
 * would hold the candidate on a spinner for a minute and lose everything if they
 * closed the tab. `kick()` starts it and returns immediately; the result screen
 * shows what has been marked so far and fills in as it goes.
 *
 * ## One item failing does not fail the paper
 *
 * Every item is its own try. A model that times out on item four leaves items
 * one to three marked, moves on to five, and leaves four pending - which is the
 * state it was already in. Nothing here can lower a score that was already
 * awarded, and nothing here writes a zero: an item that cannot be marked stays
 * unmarked, because a zero and "we could not read this" look identical on a
 * result screen and only one of them is true.
 *
 * ## One paper at a time
 *
 * A queue of one, keyed by attempt. Two submits of the same paper - a retry, a
 * double click - must not have two passes writing the same rows, and a hundred
 * candidates finishing at once must not open a hundred concurrent conversations
 * with the model.
 */
'use strict';

const { q, nowISO } = require('./db');
const ai = require('./ai-marking');
const storage = require('./storage');
const { markAttempt } = require('./marking');

/**
 * Attempts being marked right now: id -> the promise of that pass.
 *
 * A Set was the first version, and it made the two callers behave differently in
 * the way that mattered least usefully. Submitting a paper calls kick(), so an
 * administrator pressing "mark now" a second later found the id already in the
 * set and was told 'already-running' with nothing to wait for. Holding the
 * promise instead means a second caller joins the pass in progress and gets its
 * result, while still only one pass ever writes the rows.
 */
const inFlight = new Map();

/** Papers waiting their turn. Marking runs one paper at a time, in order. */
const queue = [];
let draining = false;

/* Which parts are marked by rubric rather than by comparison, and how. `spoken`
   means the answer is a recording that has to be transcribed first. */
const RUBRIC_PARTS = {
  B: { spoken: false },
  D: { spoken: false },
  H: { spoken: true },
  I: { spoken: true },
  J: { spoken: true }
};

/**
 * Everything on this paper that a rubric still owes a mark to.
 *
 * `earned IS NULL` is the test, not the item type: an item marked on an earlier
 * pass is finished, and a re-run must not spend a model call to reach the same
 * conclusion or, worse, a different one.
 */
async function pending(attemptId) {
  /* LEFT JOIN from the paper, not an inner join from the answers.
     An essay the candidate never touched has no attempt_answers row at all, so
     the first version of this could not see it - and one untouched essay leaves
     its skill pending, which leaves `overall` null, which is the exact failure
     this whole feature exists to end. It has to be marked zero, and to be marked
     zero it has to be found. */
  return q.all(
    `SELECT aa.id, aa.answer, aa.audio_key,
            si.question_id, ap.section_id,
            qs.prompt, qs.type, qs.level, qs.part, qs.ext_key,
            t.level paper_level
       FROM attempt_parts ap
       JOIN section_items si ON si.section_id = ap.section_id
       JOIN questions qs ON qs.id = si.question_id
       JOIN attempts a ON a.id = ap.attempt_id
       JOIN tests t ON t.id = a.test_id
       LEFT JOIN attempt_answers aa
              ON aa.attempt_id = ap.attempt_id AND aa.question_id = si.question_id
      WHERE ap.attempt_id = ?
        AND aa.earned IS NULL
        AND qs.type IN ('essay','speaking')
      ORDER BY si.section_id, si.sort`, attemptId);
}

/**
 * The row to write a mark on, creating it when the candidate left the item
 * untouched. A blank answer is still an answer: it earns zero, and a zero has to
 * live somewhere.
 */
async function rowFor(attemptId, row) {
  if (row.id) return row.id;
  await q.run(
    `INSERT INTO attempt_answers (attempt_id,question_id,section_id,answer,updated_at)
     VALUES (?,?,?,'',?)
     ON CONFLICT(attempt_id,question_id) DO NOTHING`,
    attemptId, row.question_id, row.section_id, nowISO());
  return q.val('SELECT id FROM attempt_answers WHERE attempt_id=? AND question_id=?',
    attemptId, row.question_id);
}

/**
 * The words a spoken answer contains, or a reason there are none.
 *
 * Returns `{ text }` when there is a transcript, `{ skip }` when the platform is
 * not configured to make one. The difference matters: no transcription provider
 * is a setting somebody has not filled in, and telling the candidate their
 * speaking "scored nothing" for that reason would be a lie.
 */
async function words(row) {
  /* Nothing recorded is a zero, not a skip. A skip leaves the item pending, one
     pending item leaves Speaking pending, and Speaking pending leaves the whole
     band withheld - so a candidate who simply did not answer one speaking
     question would never get a result at all. Same treatment as a blank essay
     and a blank gap-fill. */
  if (!row.audio_key) return { blank: 'Nothing was recorded for this item.' };
  let bytes;
  /* The longest spoken answer VPET allows is sixty seconds (Part I). Ten
     megabytes is far past that at any sane bitrate, and the cap matters because
     what is on the other side of this call is somebody's metered account. */
  const MAX_AUDIO = 10 * 1024 * 1024;
  try {
    const file = await storage.get(row.audio_key);
    bytes = file.body;
  } catch (e) {
    return { skip: 'The recording could not be read.' };
  }
  if (!bytes || !bytes.length) return { blank: 'The recording is empty.' };
  if (bytes.length > MAX_AUDIO) return { skip: 'The recording is too long to be marked.' };
  /* Sniff the container rather than asserting one. A browser gives WebM on
     Chrome and MP4 on Safari, and telling the transcription service the wrong
     type is a rejected upload that reads as "speaking cannot be marked". */
  /* Told apart, because they are different things to a candidate reading their
     result: one is a setting nobody filled in, the other is a recording that
     could not be turned into words. Saying "no transcription service" for both
     was a message that sent people to check the wrong thing. */
  if (!(await ai.canTranscribe())) {
    return { skip: 'Speaking is not marked yet: no transcription service is configured.' };
  }
  let text;
  try {
    text = await ai.transcribe(bytes, sniffMime(bytes));
  } catch (e) {
    console.warn('[ai] transcription failed: ' + ai.scrub(e && e.message));
    return { retry: 'The recording could not be transcribed. It will be tried again.' };
  }
  if (!text) return { blank: 'No words could be made out in this recording.' };
  return { text };
}

/** What kind of audio this actually is, from its first bytes. */
function sniffMime(buf) {
  const b = Buffer.isBuffer(buf) ? buf : Buffer.from(buf || []);
  if (b.length >= 4 && b[0] === 0x1A && b[1] === 0x45 && b[2] === 0xDF && b[3] === 0xA3) return 'audio/webm';
  if (b.length >= 4 && b.slice(0, 4).toString('latin1') === 'OggS') return 'audio/ogg';
  if (b.length >= 12 && b.slice(4, 8).toString('latin1') === 'ftyp') return 'audio/mp4';
  if (b.length >= 3 && (b.slice(0, 3).toString('latin1') === 'ID3' || (b[0] === 0xFF && (b[1] & 0xE0) === 0xE0))) return 'audio/mpeg';
  return 'audio/webm';
}

/** Mark one item and write the result down. Returns 'marked' | 'skipped' | 'failed'. */
async function markRow(attemptId, row) {
  const cfg = RUBRIC_PARTS[row.part];
  if (!cfg) return 'skipped';
  const rowId = await rowFor(attemptId, row);
  if (!rowId) return 'failed';

  let heard = null;
  let source = null;

  if (cfg.spoken) {
    const w = await words(row);
    if (w.blank) {
      /* A real zero: the item was sat and nothing usable came back. */
      await q.run('UPDATE attempt_answers SET earned=0, max_score=1, mark_note=?, marked_at=? WHERE id=?',
        w.blank, nowISO(), rowId);
      return 'marked';
    }
    if (w.retry) {
      await q.run('UPDATE attempt_answers SET mark_note=?, marked_at=? WHERE id=?',
        w.retry, nowISO(), rowId);
      return 'failed';
    }
    if (w.skip) {
      /* Recorded on the row so the result screen can say WHY rather than showing
         a permanent "awaiting marking" with no explanation. The item stays
         unmarked - no earned, no max - so the skill stays honestly incomplete. */
      await q.run('UPDATE attempt_answers SET mark_note=?, marked_at=? WHERE id=?',
        w.skip, nowISO(), rowId);
      return 'skipped';
    }
    heard = w.text;
    /* What the recording said, so the model can compare against it. Only parts
       whose bank item carries a script have one. */
    source = await scriptFor(row.ext_key);
  } else if (!String(row.answer || '').trim()) {
    await q.run('UPDATE attempt_answers SET earned=0, max_score=1, mark_note=?, marked_at=? WHERE id=?',
      'Left blank', nowISO(), rowId);
    return 'marked';
  }

  let verdict;
  try {
    verdict = await ai.markOne({
      part: row.part,
      level: row.level || row.paper_level,
      prompt: row.prompt,
      answer: row.answer,
      heard, source
    });
  } catch (e) {
    console.warn('[ai] item ' + row.question_id + ' could not be marked: ' + ai.scrub(e.message));
    await q.run('UPDATE attempt_answers SET mark_note=?, marked_at=? WHERE id=?',
      'Not marked yet - the marker could not be reached. It will be tried again.', nowISO(), rowId);
    return 'failed';
  }
  if (!verdict) {
    /* The skip path leaves a reason; this one used to leave nothing, so the item
       read "Awaiting marking" for ever with no hint that anything had happened. */
    await q.run('UPDATE attempt_answers SET mark_note=?, marked_at=? WHERE id=?',
      'Not marked yet - the marker gave no usable answer. It will be tried again.', nowISO(), rowId);
    return 'failed';
  }

  /* Every item on this paper is worth one, so a rubric score out of ten is
     stored as a fraction of one. Keeping the model's ten-point note in the text
     would be a second scale for a reader to reconcile; the note says what to
     change, and the number lives in one place. */
  /* Say what the mark was made from. The rubric already forbids the model from
     commenting on pronunciation - it cannot hear any - but a candidate reading
     a speaking mark is entitled to know that nobody listened to their voice.
     Stating it once, on the item, beats leaving it to a footnote nobody reads. */
  const note = cfg.spoken
    ? verdict.note + ' (Marked from a transcript of your answer: the words and the grammar, '
      + 'not pronunciation or fluency.)'
    : verdict.note;

  /* One point per item, the same as every other item on the paper. An 18-minute
     e-mail therefore weighs the same as one sentence-completion gap, which is
     worth being deliberate about: the alternative is a second weighting scheme
     living beside markItem's, and VPET publishes no per-item weights to copy. */
  await q.run(
    'UPDATE attempt_answers SET earned=?, max_score=1, mark_note=?, marked_at=? WHERE id=?',
    verdict.score / 10, note, nowISO(), rowId);
  return 'marked';
}

/** The words a Part H/J recording spoke, from the bank. Null for parts without one. */
async function scriptFor(extKey) {
  if (!extKey) return null;
  try {
    const rows = require('./data/vpet-items').rows();
    const hit = rows.find(r => r.key === extKey);
    return hit && hit.say ? hit.say : null;
  } catch (e) { return null; }
}

/**
 * Clear the rubric marks on a paper so the next pass makes them again.
 *
 * Only rubric items - a gap-fill's mark is arithmetic and re-running it would
 * reach the same answer. This exists because a mark, once given, is otherwise
 * permanent: `pending()` skips anything already scored, which is right for an
 * automatic retry and wrong for an administrator who has changed the model or
 * seen a mark that is obviously off.
 */
async function clearRubricMarks(attemptId) {
  const r = await q.run(
    `UPDATE attempt_answers SET earned=NULL, max_score=NULL, mark_note=NULL, marked_at=NULL
      WHERE attempt_id=? AND question_id IN (
        SELECT id FROM questions WHERE type IN ('essay','speaking'))`, attemptId);
  return r.changes || 0;
}

/** Mark everything outstanding on one paper, then re-score it. */
async function run(attemptId, opts) {
  if (!await ai.ready()) return { skipped: 'no-key' };
  if (opts && opts.force) await clearRubricMarks(attemptId);

  const rows = await pending(attemptId);
  if (!rows.length) return { marked: 0, failed: 0, skipped: 0 };

  let marked = 0, failed = 0, skipped = 0;
  for (const row of rows) {
    /* markRow's own try covers the model call only. Transcription, storage and
       the writes throw too, and an uncaught one used to end the pass - so a
       single unreadable recording left every later item unmarked for ever. */
    let r;
    try {
      r = await markRow(attemptId, row);
    } catch (e) {
      console.warn('[ai] item ' + row.question_id + ' threw: ' + ai.scrub(e && e.message));
      r = 'failed';
    }
    if (r === 'marked') marked++;
    else if (r === 'failed') failed++;
    else skipped++;

    /* Re-score after every item rather than only at the end. A candidate
       refreshing the result screen watches the marks arrive, and a pass that
       dies halfway still leaves the paper consistent with what was marked. */
    try { await markAttempt(attemptId); } catch (e) { /* re-scored again below */ }
  }

  await markAttempt(attemptId);
  console.warn(`[ai] attempt ${attemptId}: ${marked} marked, ${skipped} skipped, ${failed} failed.`);
  return { marked, failed, skipped };
}

async function drain() {
  if (draining) return;
  draining = true;
  try {
    while (queue.length) {
      const job = queue.shift();
      try {
        job.resolve(await run(job.id, job.opts));
      } catch (e) {
        console.warn('[ai] attempt ' + job.id + ': the marking pass stopped: ' + ai.scrub(e && e.message));
        job.resolve({ marked: 0, failed: 0, skipped: 0, error: ai.scrub(e && e.message) });
      } finally {
        inFlight.delete(job.id);
      }
    }
  } finally {
    draining = false;
  }
}

/**
 * Queue a paper, or hand back the pass already running for it.
 *
 * Everything goes through here, so "mark this paper" means the same thing
 * whether it came from the submit route or from an administrator.
 */
function start(attemptId, opts) {
  const id = Number(attemptId);
  if (!id) return Promise.resolve({ marked: 0, failed: 0, skipped: 0 });
  const running = inFlight.get(id);
  /* A forced re-mark must not be answered by the pass already in flight, which
     was started without the instruction to clear anything. */
  if (running && !(opts && opts.force)) return running;
  if (running) return running.then(() => start(id, opts));

  let resolve;
  const promise = new Promise(r => { resolve = r; });
  inFlight.set(id, promise);
  queue.push({ id, resolve, opts });
  setImmediate(drain);
  return promise;
}

/**
 * Ask for a paper to be marked. Returns at once; the work happens after.
 *
 * Deliberately not awaited by its callers - the submit route has already sent
 * the candidate their receipt by the time this starts. The rejection handler is
 * not optional: an unhandled one would take the process down.
 */
function kick(attemptId) {
  start(attemptId).catch(e => console.warn('[ai] ' + ai.scrub(e && e.message)));
  return true;
}

/** For a route or a test that wants to wait for the answer. */
function runNow(attemptId, opts) {
  return start(attemptId, opts);
}

module.exports = { kick, runNow, pending, clearRubricMarks, RUBRIC_PARTS };
