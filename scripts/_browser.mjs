/**
 * Open Chromium in a way that works in both places: this machine and CI.
 *
 * This machine keeps a Chromium at `/opt/pw-browsers/chromium`, which is why
 * the scripts used to point straight at it. CI has no such file: there,
 * `playwright-core install chromium` downloads its own copy into
 * `~/.cache/ms-playwright` under a build-numbered directory. Forcing
 * `executablePath` at a path that does not exist fails at `launch()`, and the
 * error says nothing about a hardcoded path being the cause.
 *
 * Order: `CHROMIUM` if set, then the familiar path if it really exists, then
 * nothing at all, so Playwright finds the build it has just installed.
 */
import { existsSync } from 'node:fs';
import { chromium } from 'playwright-core';
import { retry } from './_retry.mjs';

const LOCAL = '/opt/pw-browsers/chromium';

/** The Chromium to use, or null to let Playwright decide for itself. */
export function chromiumPath() {
  if (process.env.CHROMIUM) return process.env.CHROMIUM;
  return existsSync(LOCAL) ? LOCAL : null;
}

/** launchOptions with executablePath only when we know it is there. */
export function launchOptions(extra) {
  const exec = chromiumPath();
  return Object.assign({}, extra || {}, exec ? { executablePath: exec } : {});
}

/**
 * Give `page.goto` one more try when a navigation is aborted mid-flight.
 *
 * There are around fifty `page.goto` calls across the suite and every one of
 * them is a plain GET of a page we control, so retrying is safe and none of
 * them wants its own retry code. Wrapping here means a call site cannot forget
 * it, including call sites written after this. The wrapper is thin on purpose:
 * same arguments, same return value (`Response | null`, which `test-auth.mjs`
 * reads), and only the closed transient list in `_retry.mjs` is retried at all.
 */
export function hardenPage(page) {
  const goto = page.goto.bind(page);
  page.goto = (url, opts) => retry(`goto ${url}`, () => goto(url, opts));
  return page;
}

/* ------------------------- Which language to test in -------------------------
   The interface is bilingual and Vietnamese is what a real visitor gets. That
   makes the DEFAULT language a bad thing for an assertion to depend on: a test
   reading "Unlocked." would start failing the day the default flipped, for a
   reason that has nothing to do with the code under test.

   So every browser context pins the language explicitly, before any page script
   runs. English by default, because the pages are authored in English and that
   is the copy the assertions quote. The steps where the language IS the point —
   the interface audit, which must catch Vietnamese text overflowing a button,
   and the acceptance screenshots, which document what users actually see — set
   PREP_TEST_LANG=vi and get the real thing. */
const TEST_LANG = process.env.PREP_TEST_LANG || 'en';

/** Runs in the page, before its own scripts, on every navigation. */
function pinLanguage(lang) {
  try { localStorage.setItem('prep.lang', lang); } catch (e) {}
}

/** Every page opened from this context gets the hardened goto and the pinned language. */
export function hardenContext(ctx) {
  /* Guarded because test-harness.mjs hardens a hand-made stub that has only
     newPage; awaited in newPage so a page can never open before it is registered. */
  const ready = typeof ctx.addInitScript === 'function'
    ? Promise.resolve(ctx.addInitScript(pinLanguage, TEST_LANG)).catch(() => {})
    : null;
  const newPage = ctx.newPage.bind(ctx);
  ctx.newPage = async (...a) => {
    if (ready) await ready;
    return hardenPage(await newPage(...a));
  };
  return ctx;
}

/** …and every context opened from this browser hardens the pages it opens. */
export function hardenBrowser(browser) {
  const newContext = browser.newContext.bind(browser);
  browser.newContext = async (...a) => hardenContext(await newContext(...a));
  /* A page opened straight off the browser gets a context of its own, which
     never passed through hardenContext — pin the language on it too. */
  const newPage = browser.newPage.bind(browser);
  browser.newPage = async (...a) => {
    const page = await newPage(...a);
    try { await page.context().addInitScript(pinLanguage, TEST_LANG); } catch (e) {}
    return hardenPage(page);
  };
  return browser;
}

/** chromium.launch() with the right path already filled in for this machine. */
export async function launchChromium(extra) {
  return hardenBrowser(await chromium.launch(launchOptions(extra)));
}
