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

/** Every page opened from this context gets the hardened goto. */
export function hardenContext(ctx) {
  const newPage = ctx.newPage.bind(ctx);
  ctx.newPage = async (...a) => hardenPage(await newPage(...a));
  return ctx;
}

/** …and every context opened from this browser hardens the pages it opens. */
export function hardenBrowser(browser) {
  const newContext = browser.newContext.bind(browser);
  browser.newContext = async (...a) => hardenContext(await newContext(...a));
  const newPage = browser.newPage.bind(browser);
  browser.newPage = async (...a) => hardenPage(await newPage(...a));
  return browser;
}

/** chromium.launch() with the right path already filled in for this machine. */
export async function launchChromium(extra) {
  return hardenBrowser(await chromium.launch(launchOptions(extra)));
}
