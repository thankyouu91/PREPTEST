/**
 * Run a list of jobs through N parallel workers, returning results IN ORDER.
 *
 * The audit and screenshot steps take most of `npm run verify`, and every page
 * load inside them is fully independent: its own BrowserContext, no shared
 * state. They ran one at a time only because the loops were written that way.
 *
 * Keeping the result order is deliberate: run in parallel and the COMPLETION
 * order is arbitrary, and a report that reorders itself on every run cannot be
 * diffed against the last one. Callers collect, then print once at the end.
 *
 * **One job that throws no longer ends the run.** It used to: the exception
 * escaped the worker, `Promise.all` rejected, and 220 finished-or-not jobs were
 * reported as one stack trace naming neither the page nor the width. A single
 * dropped connection therefore looked identical to the interface being broken
 * everywhere. Now the failure is recorded in that job's slot, named, and the
 * other jobs finish — so the report says which page died and what the other 219
 * found. The fail-fast property is kept for the case that actually needs it:
 * `abortAfter` failures in one run is not a flake, it is the server being gone,
 * and there the pool still gives up rather than grinding through the rest.
 */

import { availableParallelism } from 'node:os';
import { firstLine } from './_retry.mjs';

/* The default worker count follows the machine rather than a fixed number: on a
   two-core runner four Chromium contexts fight for CPU hard enough to be slower
   than one at a time, and the audit own layout measurements start to drift.
   Capped at 4: past that the bottleneck is memory, not CPU. PW_JOBS overrides. */

const cores = typeof availableParallelism === 'function' ? availableParallelism() : 4;
export const JOBS = Math.max(1, parseInt(process.env.PW_JOBS, 10) || Math.min(4, cores));

/** Sits in the results array where a job's result would have been. */
export class PoolFailure {
  constructor(item, index, where, cause) {
    this.item = item;
    this.index = index;
    this.where = where;
    this.cause = cause;
    this.message = firstLine(cause);
  }
}

/** True for the slots `pool()` filled with a failure instead of a result. */
export const isFailure = v => v instanceof PoolFailure;

/**
 * @param {Array} items   the jobs to run
 * @param {number} limit  how many run at once
 * @param {Function} worker  (item, index) => Promise<any>
 * @param {object} [opts]
 *   - describe(item, index) => string, how a failed job is named in the log
 *   - abortAfter: give up once this many jobs have failed (default 5)
 * @returns {Promise<Array>} results in the same order as items, with a
 *   PoolFailure in the slot of any job that threw
 */
export async function pool(items, limit, worker, opts) {
  const o = opts || {};
  const describe = o.describe || ((item, i) => `job #${i}`);
  const abortAfter = o.abortAfter === undefined ? 5 : o.abortAfter;
  const log = o.log || (m => console.log(m));

  const out = new Array(items.length);
  const failures = [];
  let next = 0;
  let givenUp = false;

  const runner = async () => {
    for (;;) {
      if (givenUp) return;
      const i = next++;
      if (i >= items.length) return;
      try {
        out[i] = await worker(items[i], i);
      } catch (cause) {
        const where = describe(items[i], i);
        const failure = new PoolFailure(items[i], i, where, cause);
        out[i] = failure;
        failures.push(failure);
        /* Printed the moment it happens rather than only at the end: a caller
           that forgets to check the slots still cannot hide this. */
        log(`   ✗ ${where} threw: ${failure.message}`);
        if (abortAfter > 0 && failures.length >= abortAfter) givenUp = true;
      }
    }
  };

  await Promise.all(
    Array.from({ length: Math.max(1, Math.min(limit, items.length)) }, runner));

  if (givenUp) {
    /* Whatever is wrong is not one page. The results are incomplete by
       definition here — jobs were never started — so they are not returned. */
    throw new Error(
      `${failures.length} jobs failed, which is not a flake — gave up with `
      + `${items.length - next} of ${items.length} not started:\n`
      + failures.map(f => `   - ${f.where}: ${f.message}`).join('\n'));
  }
  return out;
}
