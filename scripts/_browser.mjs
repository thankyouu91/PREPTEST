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

/** chromium.launch() with the right path already filled in for this machine. */
export function launchChromium(extra) {
  return chromium.launch(launchOptions(extra));
}
