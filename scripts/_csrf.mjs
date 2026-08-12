/**
 * Send a write through Playwright APIRequestContext, carrying a CSRF token.
 *
 * Since 2026-08-12 every mutating route goes through csrfGuard, sign-in and
 * registration included. A real browser needs no help: it loads a page, the
 * server sets `prep_csrf` on that response, and the code on the page reads the
 * cookie and attaches the header. A script that calls `ctx.request.post()`
 * directly skips the page load, holds no cookie, and gets 403 — as audit did.
 *
 * This redoes that order: with no cookie yet, ask for a page carrying no
 * redirect guard, then send. The cookie lands in the context own jar, so the
 * sign-in that follows still belongs to that context.
 */

import { retry } from './_retry.mjs';

/** The page used to obtain the cookie: public, and never redirects. */
const WARM_PATH = '/prep/landing/';

/**
 * The warm-up is the single most-called request in the suite — every audit job
 * and every screenshot with a session starts here — and for a while it was also
 * the least forgiving: one `ECONNRESET` under the four-worker pool threw out of
 * the worker and took all 220 jobs with it. It gets one more try now.
 */
async function csrfToken(ctx, base) {
  const read = async () => (await ctx.cookies(base)).find(c => c.name === 'prep_csrf');
  let hit = await read();
  if (!hit) {
    await retry(`CSRF warm-up ${WARM_PATH}`, () => ctx.request.get(base + WARM_PATH));
    hit = await read();
  }
  return hit ? hit.value : '';
}

/** POST with X-CSRF-Token, returning an APIResponse like ctx.request.post(). */
export async function postWithCsrf(ctx, base, path, data) {
  const token = await csrfToken(ctx, base);
  return ctx.request.post(base + path, { data, headers: { 'X-CSRF-Token': token } });
}
