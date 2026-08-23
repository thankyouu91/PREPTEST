#!/usr/bin/env node
/**
 * Regenerate the endpoint table at the bottom of docs/SECURITY.md.
 *
 *   node scripts/security-doc.mjs
 *
 * scripts/test-security.mjs compares that table against the live Express stack
 * and goes red when they disagree, with the words "re-run the script to update
 * it". Until now there was no script to re-run: the generator was a library
 * (scripts/security-map.mjs) that only the test imported, so the instruction in
 * the failure message pointed at nothing and the fix was to hand-edit a
 * generated table. This is that script.
 *
 * Adding a route is the ordinary reason to run it. The check exists so a new
 * endpoint cannot reach production without its guards being written down where
 * somebody reviews them, and regenerating is meant to be the boring part.
 */
import { readFileSync, writeFileSync, mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

/* Loading the routers loads server/db.js with them, and a documentation script
   must not touch data/. Same throwaway-database trick the test uses. */
const tmp = mkdtempSync(join(tmpdir(), 'security-doc-'));
process.env.PREP_DB = join(tmp, 'scratch.sqlite');

try {
  const map = await import('./security-map.mjs');
  const rows = map.routeTable();

  const path = new URL('../docs/SECURITY.md', import.meta.url);
  const doc = readFileSync(path, 'utf8');
  const HEADER = '| Method | Endpoint | Guards | Write limit |';
  const marker = doc.indexOf(HEADER);
  if (marker < 0) {
    console.error('✗ docs/SECURITY.md has no generated table to replace.');
    console.error('  Expected a line reading: ' + HEADER);
    process.exit(1);
  }

  const before = doc.slice(marker).trim();
  const after = map.markdownTable(rows).trim();
  if (before === after) {
    console.log('✔ docs/SECURITY.md already matches the stack (' + rows.length + ' routes).');
  } else {
    writeFileSync(path, doc.slice(0, marker) + after + '\n');
    console.log('✔ docs/SECURITY.md regenerated: ' + rows.length + ' routes.');
  }
} finally {
  rmSync(tmp, { recursive: true, force: true });
}
