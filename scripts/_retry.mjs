/**
 * Try a step again when it failed for a reason the network invented.
 *
 * `npm run verify` drives a real browser against a real server across four
 * workers, and about once every few hundred jobs one of those connections is
 * dropped mid-flight: `ECONNRESET` on an API warm-up, `net::ERR_ABORTED` on a
 * navigation. Nothing is wrong with the page. The run went red anyway, and a
 * red that clears on an identical re-run is the most expensive kind of test to
 * own — it teaches you to re-run rather than to read.
 *
 * Two rules keep this from hiding real faults:
 *
 *  - **The list of what counts as transient is closed and short.** A failed
 *    assertion, a timeout, a 500, a missing selector — none of them retry,
 *    because none of them get better by being asked a second time. Anything not
 *    on the list is thrown on the first failure, exactly as before.
 *  - **A retry is printed.** Silence would turn an intermittent server fault
 *    into an invisible one. A line per retry means the count stays visible, and
 *    a run that suddenly prints ten of them is telling you something.
 */

import { setTimeout as sleep } from 'node:timers/promises';

/* Chromium, Node and undici describe the same dropped socket in three different
   sets of words, so the list was written by reading real thrown errors rather
   than from memory — `other side closed` is undici's phrasing and would have
   been missed. Each pattern is anchored on the distinctive part of the message
   rather than the whole of it, which carries a URL and so differs every time.
   `fetch failed` is deliberately absent: a DNS failure says that too. */
const TRANSIENT = [
  /ECONNRESET/,
  /ECONNABORTED/,
  /EPIPE/,
  /socket hang up/i,
  /other side closed/i,
  /UND_ERR_SOCKET/,
  /net::ERR_ABORTED/,
  /net::ERR_CONNECTION_RESET/,
  /net::ERR_CONNECTION_CLOSED/,
  /net::ERR_EMPTY_RESPONSE/,
  /net::ERR_NETWORK_CHANGED/
];

const oneLine = e => String(e && e.message ? e.message : e).split('\n')[0].slice(0, 160);

/**
 * The first line of whatever was thrown — enough to name it in one log line.
 * `fetch` reports a dropped socket as the useless `TypeError: fetch failed`
 * and puts the reason in `cause`, so the cause comes along when there is one.
 */
export function firstLine(err) {
  const text = oneLine(err);
  const cause = err && err.cause ? oneLine(err.cause) : '';
  return cause && !text.includes(cause) ? `${text} (${cause})` : text;
}

/**
 * Is this worth asking again?
 *
 * The chain is walked, because the interesting part is often not on the outside:
 * `fetch` throws `TypeError: fetch failed` and hangs the real
 * `SocketError: other side closed` off `cause`. Both the message and the `code`
 * are matched, since undici puts its reason in the message and Node's own
 * socket errors put theirs in `code`.
 *
 * A Playwright timeout is deliberately NOT transient even though it looks like
 * a network fault: the wait already spent its 30 seconds, and a second one
 * spends 30 more before failing the same way. The name is checked at every
 * level, so a timeout cannot sneak in behind a message that mentions a socket.
 */
export function isTransient(err) {
  for (let e = err, depth = 0; e && depth < 5; e = e.cause, depth++) {
    if (e.name === 'TimeoutError') return false;
    const text = `${e.message === undefined ? e : e.message} ${e.code || ''}`;
    if (TRANSIENT.some(re => re.test(text))) return true;
  }
  return false;
}

/** The first try plus one more. Bounded on purpose: see the note above. */
export const ATTEMPTS = 2;
export const BACKOFF_MS = 250;

/**
 * Run `fn`, and if it fails the way a dropped connection fails, run it again.
 *
 * @param {string} label      what is being retried, for the log line
 * @param {Function} fn       (attemptNumber) => Promise<any>
 * @param {object} [opts]     attempts, backoffMs, log
 * @returns whatever `fn` returned; throws the LAST error if it never succeeded
 */
export async function retry(label, fn, opts) {
  const o = opts || {};
  const attempts = Math.max(1, o.attempts || ATTEMPTS);
  const backoff = o.backoffMs === undefined ? BACKOFF_MS : o.backoffMs;
  const log = o.log || (m => console.log(m));
  let last;
  for (let i = 1; i <= attempts; i++) {
    try {
      return await fn(i);
    } catch (e) {
      last = e;
      if (i === attempts || !isTransient(e)) break;
      log(`   ↻ ${label}: ${firstLine(e)} — trying again (${i + 1}/${attempts})`);
      if (backoff > 0) await sleep(backoff * i);
    }
  }
  throw last;
}
