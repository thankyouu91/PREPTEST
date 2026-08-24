/**
 * A ceiling on what the model can be asked to do, per day and per account.
 *
 * Block 8. Every other limit on this platform protects the machine or the data.
 * This one protects the bank account, and it is the only limit here whose
 * absence is invisible until an invoice arrives.
 *
 * ## The shape of the risk
 *
 * The marking pass is automatic. A paper is handed in, the sweeper finds it,
 * and twenty-six items go to a model without anybody deciding anything. That is
 * the point of it — and it means the platform's spend is a function of how many
 * papers exist, which is a function of how many accounts exist, which is a
 * number an attacker gets to choose. Sign up, submit, repeat. Nothing in the
 * marking path asked a single question about cost before this file.
 *
 * Two ceilings, because one is not enough:
 *
 *   **Per account, per day.** Stops one person, or one script wearing one
 *   account, from being the whole bill. A real learner sits at most a couple of
 *   papers a day; the ceiling is set several times above that, because a limit
 *   a genuine user can reach is a support ticket, not a defence.
 *
 *   **Platform-wide, per day.** Stops a thousand accounts each staying politely
 *   under their own ceiling. This is the one that actually bounds the invoice,
 *   and it is the reason the per-account number can stay generous.
 *
 * ## Counted, never estimated
 *
 * The same rule `server/report.js` follows. A row goes into `ai_calls` BEFORE
 * the request leaves, and the ceilings count rows.
 *
 * Counting successful marks instead would have been easier and wrong in the
 * expensive direction: a call that times out after the model has generated its
 * answer costs full price and leaves no mark behind. A provider having a bad
 * afternoon would then bill without limit while the ceiling reported plenty of
 * room — the exact moment the ceiling exists for.
 *
 * ## What happens at the ceiling
 *
 * The item stays `pending`, which is a state the whole marking path already
 * understands and displays. It is NOT scored zero — the platform's budget is
 * not the candidate's fault, and `server/rubric.js` has a rule about exactly
 * this: a mark of zero must mean "nothing was handed in", never "nothing was
 * done about it". The sweeper comes back every ten minutes, so a paper stopped
 * by a ceiling at 23:00 is marked when the window rolls.
 *
 * ## A rolling window, not a calendar day
 *
 * `at > now - 24h`, not `date(at) = today`. A calendar day resets at midnight in
 * some timezone, which means the whole day's allowance is available again at a
 * predictable instant — and a script that knows the instant gets two days of
 * spend in two minutes. A rolling window has no such edge.
 */
'use strict';

const { q, nowISO } = require('./db');

const DAY_MS = 24 * 3600e3;

/**
 * The defaults, and the arithmetic behind them.
 *
 * A full VPET paper is 26 model calls: parts B and D are 5 essays, parts G, H,
 * I and J are 21 spoken answers. A spoken answer also needs a transcription,
 * so a paper marked end to end is 26 marking calls plus 21 transcription calls,
 * and `ai_calls` counts both.
 *
 * PER ACCOUNT 240/day is therefore about five complete papers. A learner sitting
 * five full mock exams in one day is not a learner this platform needs to
 * accommodate; a learner sitting two is normal and nowhere near it.
 *
 * PLATFORM 6000/day is about 127 complete papers, which is far above anything
 * this deployment has seen and still a number an invoice can survive. It is
 * meant to be raised deliberately once there is real traffic to size it
 * against — the point of the default is that there IS one, not that it is
 * perfect.
 */
const PER_ACCOUNT_PER_DAY = num(process.env.AI_CALLS_PER_ACCOUNT_PER_DAY, 240);
const PLATFORM_PER_DAY = num(process.env.AI_CALLS_PER_DAY, 6000);

/* A negative or unparseable value falls back to the default rather than to
   "off", because a typo in an environment variable must never be the thing that
   removes a spending limit.
 *
 * `0` means STOP, not "no ceiling", and it used to mean the opposite. Read the
 * variable's name the way the person typing it does: someone who sets
 * AI_CALLS_PER_DAY=0 is an owner who has just seen an invoice and wants the
 * spending to stop. Handing them unlimited spending is the single worst
 * response available, and it is silent — `take()` simply never refuses.
 *
 * Switching a ceiling off is still possible and now has to be said out loud:
 * AI_CALLS_PER_DAY=off. The one that costs money is the one you have to spell. */
/* A function declaration, not a const: the two ceilings above are initialised at
   module load and call straight into it, so anything in a temporal dead zone
   here would throw at require time. */
function isOff(raw) { return String(raw == null ? '' : raw).trim().toLowerCase() === 'off'; }
function num(raw, fallback) {
  /* Infinity, not 0, for "no ceiling". 0 was doing both jobs — the sentinel for
     off AND the number an owner types to mean stop — and every guard below had
     to test truthiness before comparing, which is what silently turned "stop"
     into "unlimited". With Infinity the comparison is just a comparison, and 0
     can mean what it says: refuse everything. */
  if (isOff(raw)) return Infinity;
  const n = parseInt(raw, 10);
  if (!Number.isFinite(n) || n < 0) return fallback;
  return n;
}

function since() {
  return new Date(Date.now() - DAY_MS).toISOString();
}

/** How many calls have gone out in the last 24 hours, in total and for one account. */
async function used(userId) {
  const cutoff = since();
  const platform = await q.val('SELECT COUNT(*) c FROM ai_calls WHERE at > ?', cutoff);
  let account = 0;
  if (userId != null) {
    account = await q.val('SELECT COUNT(*) c FROM ai_calls WHERE user_id=? AND at > ?',
      userId, cutoff);
  }
  return { platform, account };
}

/**
 * Ask permission to make one call.
 *
 * Returns `{ ok: true, id }` and has ALREADY recorded the call — the caller
 * spends it or reports why it failed, but it is counted either way. Returns
 * `{ ok: false, reason, retryAfterSec }` when a ceiling is reached, and in that
 * case nothing is recorded, because a refused call costs nothing.
 */
async function take(opts) {
  const o = opts || {};
  const u = await used(o.userId);

  if (u.platform >= PLATFORM_PER_DAY) {
    return refusal('platform', u.platform, PLATFORM_PER_DAY, null);
  }
  if (o.userId != null && u.account >= PER_ACCOUNT_PER_DAY) {
    return refusal('account', u.account, PER_ACCOUNT_PER_DAY, o.userId);
  }

  /* `lastInsertRowid` off this statement, never `SELECT MAX(id)`. Since block 7
     there can be four processes on one database, and MAX(id) would hand this
     worker the id of a row another worker inserted a microsecond earlier — so
     `settle()` would then stamp the outcome of somebody else's call. */
  const r = await q.run(
    'INSERT INTO ai_calls (at, kind, user_id, attempt_id, outcome) VALUES (?,?,?,?,?)',
    nowISO(), o.kind || 'mark', o.userId == null ? null : o.userId,
    o.attemptId == null ? null : String(o.attemptId), 'started');
  return { ok: true, id: r && Number(r.lastInsertRowid) };
}

/**
 * When the window frees up, in seconds.
 *
 * The oldest call inside the window is the one that leaves it first, so that is
 * when there is room for one more. Never 0 while the ceiling is reached: the
 * caller reads 0 as "go ahead".
 */
async function refusal(which, count, cap, userId) {
  const cutoff = since();
  const oldest = userId == null
    ? await q.val('SELECT MIN(at) m FROM ai_calls WHERE at > ?', cutoff)
    : await q.val('SELECT MIN(at) m FROM ai_calls WHERE user_id=? AND at > ?', userId, cutoff);
  const freeAt = oldest ? Date.parse(oldest) + DAY_MS : Date.now() + DAY_MS;
  return {
    ok: false,
    reason: which,
    count,
    cap,
    retryAfterSec: Math.max(1, Math.ceil((freeAt - Date.now()) / 1000)),
    /* Said in both languages because this text reaches a candidate's result
       screen, not only a log. It says the paper is waiting, not that it failed:
       the sweeper will come back for it. */
    en: which === 'platform'
      ? 'The marking service has reached its limit for today. This paper stays in the queue and is marked when the limit frees up.'
      : 'This account has reached its marking limit for today. The paper stays in the queue and is marked when the limit frees up.',
    vi: which === 'platform'
      ? 'Dịch vụ chấm bài đã chạm giới hạn trong ngày. Bài này vẫn nằm trong hàng đợi và sẽ được chấm khi giới hạn được nới.'
      : 'Tài khoản này đã chạm giới hạn chấm bài trong ngày. Bài vẫn nằm trong hàng đợi và sẽ được chấm khi giới hạn được nới.'
  };
}

/** Record how a call ended. Best effort: a failed note must not fail the call. */
async function settle(id, outcome) {
  if (!id) return;
  try {
    await q.run('UPDATE ai_calls SET outcome=? WHERE id=?', String(outcome || 'ok'), id);
  } catch (e) {
    console.warn('[ai-budget] could not record the outcome of call ' + id + ': ' + (e && e.message));
  }
}

/** For the admin screen: where the two ceilings stand right now. */
async function status() {
  const u = await used(null);
  return {
    /* JSON has no Infinity — it serialises as null — so the screen is told
       `off` and given a cap it can print. */
    platform: {
      used: u.platform,
      cap: PLATFORM_PER_DAY === Infinity ? null : PLATFORM_PER_DAY,
      off: PLATFORM_PER_DAY === Infinity
    },
    perAccount: {
      cap: PER_ACCOUNT_PER_DAY === Infinity ? null : PER_ACCOUNT_PER_DAY,
      off: PER_ACCOUNT_PER_DAY === Infinity
    },
    windowHours: 24
  };
}

/**
 * Drop rows that are past the window and past any use.
 *
 * Kept for a week rather than a day: the ceiling only needs 24 hours, but an
 * administrator asking "what did last Tuesday cost" needs more than that, and a
 * row is six small columns.
 */
async function purge() {
  const cutoff = new Date(Date.now() - 7 * DAY_MS).toISOString();
  await q.run('DELETE FROM ai_calls WHERE at <= ?', cutoff);
}

module.exports = {
  take, settle, used, status, purge,
  PER_ACCOUNT_PER_DAY, PLATFORM_PER_DAY, DAY_MS
};
