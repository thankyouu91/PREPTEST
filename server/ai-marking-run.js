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
 *
 * ## And something outside the process remembers
 *
 * The queue is memory, so on its own it lasts exactly as long as the process.
 * Every deploy restarts this server, and a restart mid-pass used to drop that
 * paper for ever: kick() is called from the submit route, submitting twice is
 * refused, and nothing else ever asked again. The candidate kept the null band
 * this whole feature exists to end.
 *
 * So `ai_marking_backlog` holds a row per paper that still owes marks, and
 * `sweep()` re-queues whatever is due. That one table also answers three
 * separate complaints with the same mechanism:
 *
 *   · papers submitted BEFORE anybody pasted a key, which no submit will ever
 *     fire for again
 *   · an item that came back 'failed' - the note on it says "It will be tried
 *     again", and now something actually does
 *   · whatever was queued when the process went away
 */
'use strict';

const { q, nowISO } = require('./db');
const ai = require('./ai-marking');
const storage = require('./storage');
const { markAttempt } = require('./marking');
const rubric = require('./rubric');
const repeat = require('./repeat');

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

/**
 * Minutes to wait before trying a paper again, by how many tries it has had.
 *
 * Front-loaded because most failures are the transient kind - a 429, a timeout,
 * a gateway restarting - and those clear in minutes. The tail is long because
 * the failures that survive an hour are the other kind: a key that has been
 * revoked, a speaking item with no transcription service configured. Retrying
 * those every minute would spend an account's credit on the same refusal
 * thousands of times a day and bury the real work behind it.
 *
 * The last value repeats for ever rather than giving up. A paper that cannot be
 * marked today can be marked the day somebody fixes the setting, and giving up
 * silently is how the backlog this replaced came to exist.
 */
const BACKOFF_MIN = [1, 5, 20, 60, 360, 1440];

/** How many papers one sweep may queue. A bound, not a target. */
const SWEEP_LIMIT = 20;

/** How often to look for work. */
const SWEEP_EVERY_MS = 10 * 60e3;

/* Not at zero: the first sweep waits until the server is actually serving.
   Marking a backlog is never more urgent than answering the first request. */
const SWEEP_FIRST_MS = 15e3;

/**
 * How long to wait for a recording to come back from the store.
 *
 * There is no timeout inside the storage drivers - none of the S3, GCS or
 * Supabase fetches carries a signal - and Node's default is to wait for ever.
 * Papers are marked ONE at a time, so a single stalled read is not one slow
 * item: it is every candidate on this server waiting behind it, indefinitely,
 * with the queue silent. Thirty seconds is far longer than a one-megabyte
 * object ever legitimately takes.
 */
const STORAGE_MS = 30e3;

/**
 * How many failed tries before an empty transcript is believed to be silence.
 *
 * The count comes from ai_marking_backlog, so this is "after the paper has come
 * back around twice" - about half an hour with the backoff below.
 */
/* The note a first silent transcription leaves behind, and the thing a second
   one looks for. A marker on the item itself: see the long note in words(). */
const SILENT_ONCE = 'No words could be made out yet.';

/**
 * `p`, unless it takes longer than `ms`, in which case an error.
 *
 * The underlying request is NOT cancelled - there is no signal to cancel it
 * with, which is the whole problem. What this guarantees is narrower and is the
 * one that matters here: the marking queue moves on. An abandoned socket costs
 * one file descriptor until the runtime gives up on it; an abandoned queue
 * costs every paper behind it.
 */
function withDeadline(p, ms, what) {
  let timer;
  const limit = new Promise((_, reject) => {
    timer = setTimeout(() => reject(new Error('Timed out waiting for ' + what)), ms);
  });
  return Promise.race([p, limit]).finally(() => clearTimeout(timer));
}

/* Which parts are marked by rubric rather than by comparison, and how. `spoken`
   means the answer is a recording that has to be transcribed first. */
const RUBRIC_PARTS = {
  B: { spoken: false },
  D: { spoken: false },
  /* G is here because the guide says the answers are spoken - "You answer the
     questions by speaking out loud" - even though the part is scored as
     Listening. What is measured is whether the passage was understood; the
     mouth is only how the answer comes out. */
  G: { spoken: true },
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
    /* mark_note comes along because words() reads it: a silent transcription
       leaves a marker there, and the second one turns it into a zero. */
    `SELECT aa.id, aa.answer, aa.audio_key, aa.mark_note,
            si.question_id, ap.section_id,
            qs.prompt, qs.type, qs.level, qs.part, qs.ext_key,
            t.level paper_level, t.family_id family
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
async function words(row, tries, ctx) {
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
    const file = await withDeadline(storage.get(row.audio_key), STORAGE_MS, 'the recording');
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
    text = await ai.transcribe(bytes, sniffMime(bytes), ctx);
  } catch (e) {
    /* The ceiling again. Rethrown rather than turned into a retry note, so the
       pass stops here instead of spending the remaining twenty answers finding
       out the same thing twenty more times. */
    if (e.budget) throw e;
    console.warn('[ai] transcription failed: ' + ai.scrub(e && e.message));
    return { retry: 'The recording could not be transcribed. It will be tried again.' };
  }
  /* An empty transcript is ambiguous in the one direction that costs a
     candidate marks. It may be genuine silence - somebody who recorded nothing
     but background noise - or a transcription service that answered 200 with
     an empty string, which is what a wrong audio format, a truncated upload or
     a bad day at the provider all look like. Scoring the first case zero is
     right; scoring the second case zero puts a service fault on somebody's
     record and calls it their speaking.
     So it is retried first, and only becomes a zero once the backoff has been
     round several times and the answer has not changed. That is a judgement
     the platform can only make with the try count in front of it, which is
     exactly what ai_marking_backlog now holds. */
  if (!text) {
    /* Counted on THIS ITEM, from the note the last silent pass left, rather
       than on the paper's `tries`.
     *
     * `tries` goes up whenever anything on the paper is still unmarked, for any
     * reason — including the model refusing every item because its key was
     * revoked, which has nothing to do with this recording. So an outage on the
     * marking provider pushed `tries` past the threshold, and the next
     * ambiguous empty transcript from the OTHER provider was written down as
     * `earned = 0` with "No words could be made out". Once earned is not null
     * the item is never picked up again: one provider's bad afternoon became a
     * permanent zero on a candidate's speaking score, with no way back short of
     * an administrator forcing a re-mark. */
    return String(row.mark_note || '').startsWith(SILENT_ONCE)
      ? { blank: 'No words could be made out in this recording.' }
      : { retry: SILENT_ONCE + ' The recording will be tried again.' };
  }
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
async function markRow(attemptId, row, tries, userId) {
  const cfg = RUBRIC_PARTS[row.part];
  if (!cfg) return 'skipped';
  const rowId = await rowFor(attemptId, row);
  if (!rowId) return 'failed';

  let heard = null;
  let source = null;

  if (cfg.spoken) {
    const w = await words(row, tries || 0, { userId, attemptId });
    if (w.blank) {
      /* A real zero: the item was sat and nothing usable came back. */
      await q.run('UPDATE attempt_answers SET earned=0, max_score=1, mark_note=?, mark_caps=NULL, marked_at=? WHERE id=?',
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
    await q.run('UPDATE attempt_answers SET earned=0, max_score=1, mark_note=?, mark_caps=NULL, marked_at=? WHERE id=?',
      'Left blank', nowISO(), rowId);
    return 'marked';
  }

  let verdict;

  /* Part H is measured, not judged.
   *
   * "Say this sentence back" is the one spoken part with a right answer, and
   * the answer is on file — `say` on the bank item, which is what the candidate
   * heard. Sending the transcript and the sentence to a language model and
   * asking how much survived is paying for an opinion about a question that has
   * one. Ten of the paper's 26 model calls were this.
   *
   * So it goes to server/repeat.js instead: word overlap for how much came
   * back, longest in-order run for whether the structure held. It returns the
   * same {score, note, criteria} shape ai.markOne() does, against the same two
   * criteria rubric.js already names for Part H, so everything below — the
   * caps, rubric_scores, the report — is unchanged. It also cannot disagree
   * with itself between two runs, which a model can.
   *
   * `source` is null when the bank item has no script, and then this falls
   * through to the model rather than guessing. */
  const sentence = row.part === 'H' ? repeat.sentenceFor(row.ext_key) : null;
  if (sentence && heard) {
    verdict = repeat.score(sentence, heard);
  } else {
    try {
      verdict = await ai.markOne({
        part: row.part,
        /* Two levels, deliberately. `level` is how hard THIS ITEM is; the scale
           the marker aims at belongs to the PAPER, because that is the range
           server/bands.js will read the mark back through. They used to be one
           argument — `row.level || row.paper_level` — so a B2-tagged item on a
           B1 paper silently moved the whole scale under the marker while the
           report went on reading it against the paper's. */
        level: row.level,
        paperLevel: row.paper_level,
        family: row.family,
        prompt: row.prompt,
        answer: row.answer,
        heard, source,
        userId, attemptId
      });
    } catch (e) {
      /* A spending ceiling is not a marking failure, and it must not be recorded
         as one: the item is untouched, the note says the paper is waiting rather
         than broken, and the error carries `budget` so run() can stop the pass
         instead of asking twenty-five more times for the same refusal. */
      if (e.budget) {
        await q.run('UPDATE attempt_answers SET mark_note=?, marked_at=? WHERE id=?',
          e.budget.en, nowISO(), rowId);
        throw e;
      }
      /* A refusal that is going to be repeated is not worth repeating.
       *
       * Everything used to land here together: a revoked key, a request this
       * version cannot make, and a thirty-second capacity blip were one case, so
       * all three went back on the same backoff ladder. That is expensive rather
       * than merely untidy. On a spoken item the transcription runs FIRST and
       * succeeds, so every doomed pass bought 21 real transcriptions and threw
       * them away when the model said 401 again — an invalid key billing OpenAI
       * indefinitely. `retryable === false` means stop, and say what is wrong. */
      if (e.retryable === false) {
        const why = e.status === 401 || e.status === 403
          ? 'the marking service would not accept the API key'
          : e.truncated
            ? 'the marker ran out of room before it finished'
            : 'the marking service refused the request';
        console.warn('[ai] stopping the pass: ' + why + ' — ' + ai.scrub(e.message));
        await q.run('UPDATE attempt_answers SET mark_note=?, marked_at=? WHERE id=?',
          'Not marked - ' + why + '. An administrator has to look at the settings.', nowISO(), rowId);
        e.fatal = why;
        throw e;
      }
      console.warn('[ai] item ' + row.question_id + ' could not be marked: ' + ai.scrub(e.message));
      await q.run('UPDATE attempt_answers SET mark_note=?, marked_at=? WHERE id=?',
        'Not marked yet - the marker could not be reached. It will be tried again.', nowISO(), rowId);
      return 'failed';
  }
  }
  if (!verdict) {
    /* The skip path leaves a reason; this one used to leave nothing, so the item
       read "Awaiting marking" for ever with no hint that anything had happened. */
    await q.run('UPDATE attempt_answers SET mark_note=?, marked_at=? WHERE id=?',
      'Not marked yet - the marker gave no usable answer. It will be tried again.', nowISO(), rowId);
    return 'failed';
  }

  /* The criteria decide the mark, not the model's own headline number.
     `combine` averages what it was given, then applies the two caps in
     server/rubric.js: nothing sits more than half a band above its weakest
     criterion, and something well under the required length is capped whatever
     its sentences look like. Evidence is checked against the candidate's real
     words on the way through, and a quotation that is not there is dropped.

     A model that answered in the old two-field shape has no criteria, so the
     fallback is its own score with the length cap still applied — the gate that
     is measured rather than judged keeps working with no marker at all. */
  /* `stimulus` is the text the candidate had in front of them. On Part B that is
     the passage they were asked to rebuild, and an answer that comes back as
     that passage is capped by arithmetic rather than by whatever the marker
     happened to think this run. rubric.js decides which parts that applies to;
     handing it the prompt for a part it does not check costs nothing. */
  const graded = rubric.combine(row.part, verdict.criteria, {
    answer: heard || row.answer,
    stimulus: row.prompt,
    fallbackScore: verdict.score
  }) || { score: verdict.score, criteria: [], caps: [], version: rubric.RUBRIC_VERSION };

  /* Every item on this paper is worth one, so a rubric score out of ten is
     stored as a fraction of one. Keeping the model's ten-point note in the text
     would be a second scale for a reader to reconcile; the note says what to
     change, and the number lives in one place. */
  /* Say what the mark was made from. The rubric already forbids the model from
     commenting on pronunciation - it cannot hear any - but a candidate reading
     a speaking mark is entitled to know that nobody listened to their voice.
     Stating it once, on the item, beats leaving it to a footnote nobody reads. */
  let note = cfg.spoken
    ? verdict.note + ' (Marked from a transcript of your answer: the words and the grammar, '
      + 'not pronunciation or fluency.)'
    : verdict.note;
  /* A cap that fires silently is a mark the candidate cannot account for.
     The note keeps the English sentence — it is one string, and the marker's
     own feedback in it is English too — and the pair goes to `mark_caps` beside
     it so the result screen can show whichever language the reader is in. */
  for (const c of graded.caps) note += ' ' + c.en;
  const capsJson = graded.caps.length
    ? JSON.stringify(graded.caps.map(c => ({ rule: c.rule, en: c.en, vi: c.vi })))
    : null;

  /* The working, kept. Replaced rather than appended, because marking is
     re-runnable and a second pass must correct the record, not grow it. */
  await q.run('DELETE FROM rubric_scores WHERE attempt_id=? AND question_id=?',
    attemptId, row.question_id);
  for (const c of graded.criteria) {
    await q.run(
      `INSERT INTO rubric_scores
         (attempt_id, question_id, criterion, score, evidence, comment, version, marked_by, at)
       VALUES (?,?,?,?,?,?,?,'ai',?)`,
      attemptId, row.question_id, c.key, c.score, c.evidence, c.comment,
      graded.version, nowISO());
  }

  /* One point per item, the same as every other item on the paper. An 18-minute
     e-mail therefore weighs the same as one sentence-completion gap, which is
     worth being deliberate about: the alternative is a second weighting scheme
     living beside markItem's, and VPET publishes no per-item weights to copy. */
  await q.run(
    'UPDATE attempt_answers SET earned=?, max_score=1, mark_note=?, mark_caps=?, marked_at=? WHERE id=?',
    graded.score / 10, note, capsJson, nowISO(), rowId);
  return 'marked';
}

/**
 * What the marker is shown besides the candidate's words: the recording's
 * script, and for Part G a model answer as well.
 *
 * The model answer is here rather than on the question row because
 * `questions.answer` is empty on every rubric-marked item and has to stay that
 * way — it is what a string comparison would reach for, and a spoken answer
 * marked by exact match fails a candidate for saying the right thing in
 * different words. scripts/test-items.mjs holds that line.
 *
 * Part G needs one anyway. "How many boxes were damaged?" has a right answer,
 * and a marker judging it from sixty words of passage alone is doing avoidable
 * work with avoidable variance. Given as a reference, not as a key: the rubric
 * asks whether the candidate's answer means the same, not whether it matches.
 */
async function scriptFor(extKey) {
  if (!extKey) return null;
  try {
    const rows = require('./data/vpet-items').rows();
    const hit = rows.find(r => r.key === extKey);
    if (!hit || !hit.say) return null;
    return hit.modelAnswer
      ? hit.say + '\n\nA correct short answer would be: ' + hit.modelAnswer
      : hit.say;
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

/**
 * Write down what a pass left behind, so something can come back to it.
 *
 * Deliberately measured rather than inferred. The pass counts what it marked,
 * but "marked 12" does not say whether anything is left - an item can be skipped
 * for a reason that will still be true tomorrow, and a pass that fell over
 * before its last item counted nothing at all. So this asks the same question
 * the next pass will ask, `pending()`, and records the answer.
 */
async function noteOutcome(attemptId) {
  const left = (await pending(attemptId)).length;
  const now = nowISO();
  if (!left) {
    await q.run('DELETE FROM ai_marking_backlog WHERE attempt_id=?', attemptId);
    return 0;
  }
  const tries = (await q.val('SELECT tries FROM ai_marking_backlog WHERE attempt_id=?', attemptId)) || 0;
  const wait = BACKOFF_MIN[Math.min(tries, BACKOFF_MIN.length - 1)];
  const next = new Date(Date.now() + wait * 60e3).toISOString();
  const note = left + ' item(s) still unmarked after ' + (tries + 1) + ' attempt(s).';
  await q.run(
    `INSERT INTO ai_marking_backlog (attempt_id,tries,next_try,last_note,updated_at)
     VALUES (?,?,?,?,?)
     ON CONFLICT(attempt_id) DO UPDATE
        SET tries=excluded.tries, next_try=excluded.next_try,
            last_note=excluded.last_note, updated_at=excluded.updated_at`,
    attemptId, tries + 1, next, note, now);
  return left;
}

/**
 * Submitted papers that still owe rubric marks and are due another try.
 *
 * A paper with no backlog row has never been looked at - a sitting submitted
 * before the key was configured, or one whose pass died with the process - and
 * is due immediately. That is the whole point: the row is a record of tries, not
 * a licence to be marked.
 */
async function due(limit) {
  return q.all(
    `SELECT a.id
       FROM attempts a
       JOIN attempt_parts ap ON ap.attempt_id = a.id
       JOIN section_items si ON si.section_id = ap.section_id
       JOIN questions qs ON qs.id = si.question_id
       LEFT JOIN attempt_answers aa
              ON aa.attempt_id = a.id AND aa.question_id = si.question_id
       LEFT JOIN ai_marking_backlog b ON b.attempt_id = a.id
      WHERE a.status = 'submitted'
        AND qs.type IN ('essay','speaking')
        AND aa.earned IS NULL
        AND (b.next_try IS NULL OR b.next_try <= ?)
      GROUP BY a.id
      ORDER BY a.submitted_at
      LIMIT ?`, nowISO(), limit);
}

/**
 * Queue every paper that is due. Returns how many, without waiting for them.
 *
 * Bounded on purpose. An install that turns marking on for the first time may
 * have hundreds of finished papers, and queueing all of them at once would hold
 * the single marking queue for hours - so every new submission would wait behind
 * a backlog from last month. Twenty per sweep, ten minutes apart, clears a
 * hundred papers in under an hour and never blocks the front of the queue for
 * long.
 */
async function sweep(opts) {
  const limit = (opts && opts.limit) || SWEEP_LIMIT;
  if (!await ai.ready()) return { queued: 0, skipped: 'no-key' };
  const rows = await due(limit);
  for (const r of rows) kick(r.id);
  if (rows.length) console.warn('[ai] sweep: ' + rows.length + ' paper(s) queued for marking.');
  return { queued: rows.length };
}

let sweepTimer = null;

/**
 * Start looking for unmarked papers, now and then every ten minutes.
 *
 * Unref'd, both timers. A test script that requires this module must still be
 * able to exit, and a timer that keeps the event loop alive turns every suite
 * into one that hangs at the end for no reason a reader could guess.
 */
function startSweeper(opts) {
  if (sweepTimer) return sweepTimer;
  const go = () => sweep(opts).catch(e => console.warn('[ai] sweep: ' + ai.scrub(e && e.message)));
  setTimeout(go, (opts && opts.firstMs) || SWEEP_FIRST_MS).unref();
  sweepTimer = setInterval(go, (opts && opts.everyMs) || SWEEP_EVERY_MS);
  sweepTimer.unref();
  return sweepTimer;
}

/** For tests, which must not inherit a timer from the suite before them. */
function stopSweeper() {
  if (sweepTimer) clearInterval(sweepTimer);
  sweepTimer = null;
}

/** Mark everything outstanding on one paper, then re-score it. */
async function run(attemptId, opts) {
  if (!await ai.ready()) return { skipped: 'no-key' };

  /* A forced re-mark wipes the existing marks before it knows whether it can
     produce new ones, and `ai.ready()` is not that knowledge: it only checks
     that the stored key still DECRYPTS, so a key the provider has revoked sails
     past it. An administrator pressing "mark again" on a paper whose provider
     is unreachable therefore destroyed a candidate's band and could not get it
     back — the marks are gone, `overall` is null, and there is no undo.
     Snapshotted here, and put back below if the pass turns out to mark nothing
     at all. Re-marking is meant to replace a mark, never to subtract one. */
  let restore = null;
  if (opts && opts.force) {
    restore = await q.all(
      `SELECT id, earned, max_score, mark_note, marked_at FROM attempt_answers
        WHERE attempt_id=? AND earned IS NOT NULL AND question_id IN (
          SELECT id FROM questions WHERE type IN ('essay','speaking'))`, attemptId);
    await clearRubricMarks(attemptId);
  }

  const rows = await pending(attemptId);
  /* Nothing owed. Still worth a call: a paper finished by an earlier pass may
     have left a backlog row behind, and a row that outlives the work it stands
     for is a sweep that keeps picking up a paper with nothing to do. */
  if (!rows.length) {
    try { await noteOutcome(attemptId); } catch (e) { /* the next pass tidies it */ }
    return { marked: 0, failed: 0, skipped: 0, left: 0 };
  }

  /* How many times this paper has already been round. Read once, before the
     loop, because it decides one thing only: whether a recording that keeps
     transcribing to nothing is still worth another try or is simply silent. A
     forced re-mark starts that judgement over - an administrator pressing it has
     usually just changed the very setting that was producing the empty
     transcripts. */
  const tries = (opts && opts.force)
    ? 0
    : ((await q.val('SELECT tries FROM ai_marking_backlog WHERE attempt_id=?', attemptId)) || 0);

  /* Whose account this work is billed against. Read once per paper rather than
     per item: it is the same answer twenty-six times, and it is what lets the
     per-account ceiling in server/ai-budget.js mean anything. */
  const userId = await q.val('SELECT user_id FROM attempts WHERE id=?', attemptId);

  let marked = 0, failed = 0, skipped = 0, stopped = null, restored = 0;
  for (const row of rows) {
    /* markRow's own try covers the model call only. Transcription, storage and
       the writes throw too, and an uncaught one used to end the pass - so a
       single unreadable recording left every later item unmarked for ever. */
    let r;
    try {
      r = await markRow(attemptId, row, tries, userId);
    } catch (e) {
      /* The one exception to "one item failing does not fail the paper". A
         spending ceiling is not about this item, so the next item would meet
         exactly the same refusal - twenty-five more counts against the database
         to learn nothing. Stop, leave the rest owed, and let the backlog bring
         the paper back when the rolling window has moved. */
      if (e.budget) { stopped = e.budget; break; }
      /* Same reasoning as the ceiling, for the same reason: the next item meets
         the identical refusal, and on a spoken one it pays for a transcription
         to get there. See the classification in markRow. */
      if (e.fatal) { stopped = { en: e.fatal, vi: e.fatal, fatal: true }; break; }
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

  /* The pass replaced nothing, so put back what the clear above took. */
  if (restore && restore.length && marked === 0) {
    for (const r of restore) {
      await q.run('UPDATE attempt_answers SET earned=?, max_score=?, mark_note=?, marked_at=? WHERE id=?',
        r.earned, r.max_score, r.mark_note, r.marked_at, r.id);
    }
    restored = restore.length;
    console.warn('[ai] attempt ' + attemptId + ': the forced re-mark could not mark anything, so its '
      + restored + ' previous mark' + (restored === 1 ? ' was' : 's were') + ' kept rather than lost.');
  }

  await markAttempt(attemptId);
  /* Last, and outside the loop: what is still owed decides whether this paper
     comes back. Its own try, because a bookkeeping failure must not throw away
     a pass that did real work. */
  let left = 0;
  try { left = await noteOutcome(attemptId); }
  catch (e) { console.warn('[ai] attempt ' + attemptId + ': backlog not recorded: ' + ai.scrub(e && e.message)); }
  console.warn(`[ai] attempt ${attemptId}: ${marked} marked, ${skipped} skipped, ${failed} failed`
    + (left ? `, ${left} still owed.` : '.')
    + (stopped && stopped.fatal ? ` Stopped: ${stopped.en}.` : '')
    + (stopped && !stopped.fatal
      ? ` Stopped at the ${stopped.reason} spending ceiling (${stopped.count}/${stopped.cap}).` : ''));
  return {
    marked, failed, skipped, left, restored,
    stopped: stopped ? (stopped.fatal ? 'config' : stopped.reason) : null
  };
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

module.exports = {
  kick, runNow, pending, clearRubricMarks, RUBRIC_PARTS,
  sweep, due, startSweeper, stopSweeper, noteOutcome, BACKOFF_MIN, SWEEP_LIMIT
};
