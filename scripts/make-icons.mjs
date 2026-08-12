/**
 * Render the brand mark to the PNG icons a PWA install needs.
 *
 * Why a script rather than committed art nobody can regenerate: the source of
 * truth stays public/favicon.svg, and re-running this after a rebrand keeps
 * every size in step. It uses the Chromium that already ships for screenshots,
 * so no image library joins the dependency list.
 *
 *   node scripts/make-icons.mjs
 *
 * Two shapes come out of it:
 *   icon-192 / icon-512   the mark as drawn, edge to edge
 *   maskable-512          the same mark inset inside a filled square, because
 *                         Android crops maskable icons to whatever shape the
 *                         launcher uses and anything in the outer ~10% can be
 *                         cut away
 */
import { chromium } from 'playwright-core';
import fs from 'node:fs/promises';
import path from 'node:path';
import { chromiumPath } from './_browser.mjs';

const ROOT = path.join(import.meta.dirname, '..');
const SVG = path.join(ROOT, 'public', 'favicon.svg');
const OUT = path.join(ROOT, 'public', 'icons');
const EXEC = chromiumPath();

/* The safe zone for a maskable icon: keep the mark inside the middle 80%. */
const MASKABLE_INSET = 0.1;

const TARGETS = [
  { file: 'icon-192.png', size: 192, inset: 0 },
  { file: 'icon-512.png', size: 512, inset: 0 },
  { file: 'maskable-512.png', size: 512, inset: MASKABLE_INSET }
];

const page = await (await chromium.launch({ executablePath: EXEC })).newPage();
const svg = await fs.readFile(SVG, 'utf8');
await fs.mkdir(OUT, { recursive: true });

for (const t of TARGETS) {
  const pad = Math.round(t.size * t.inset);
  const inner = t.size - pad * 2;
  /* A maskable icon must fill its whole square: transparent corners would show
     the launcher's background through the crop. The brand gradient's first
     stop doubles as that backdrop. */
  const backdrop = t.inset ? '#1c3d8f' : 'transparent';
  await page.setViewportSize({ width: t.size, height: t.size });
  await page.setContent(
    `<!doctype html><meta charset="utf-8">` +
    `<style>html,body{margin:0;padding:0;background:${backdrop}}` +
    `div{width:${t.size}px;height:${t.size}px;display:flex;align-items:center;justify-content:center}` +
    `svg{width:${inner}px;height:${inner}px;display:block}</style>` +
    `<div>${svg}</div>`
  );
  await page.screenshot({
    path: path.join(OUT, t.file),
    omitBackground: !t.inset
  });
  console.log('✓ ' + t.file + '  ' + t.size + 'px' + (t.inset ? ' (maskable)' : ''));
}

await page.context().browser().close();
