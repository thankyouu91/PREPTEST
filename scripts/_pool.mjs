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
 */

import { availableParallelism } from 'node:os';

/* The default worker count follows the machine rather than a fixed number: on a
   two-core runner four Chromium contexts fight for CPU hard enough to be slower
   than one at a time, and the audit own layout measurements start to drift.
   Capped at 4: past that the bottleneck is memory, not CPU. PW_JOBS overrides. */

const cores = typeof availableParallelism === 'function' ? availableParallelism() : 4;
export const JOBS = Math.max(1, parseInt(process.env.PW_JOBS, 10) || Math.min(4, cores));

/**
 * @param {Array} items   the jobs to run
 * @param {number} limit  how many run at once
 * @param {Function} worker  (item, index) => Promise<any>
 * @returns {Promise<Array>} results in the same order as items
 */
export async function pool(items, limit, worker) {
  const out = new Array(items.length);
  let next = 0;
  const runner = async () => {
    for (;;) {
      const i = next++;
      if (i >= items.length) return;
      out[i] = await worker(items[i], i);
    }
  };
  await Promise.all(
    Array.from({ length: Math.max(1, Math.min(limit, items.length)) }, runner));
  return out;
}
