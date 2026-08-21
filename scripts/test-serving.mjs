#!/usr/bin/env node
/**
 * How pages are served, and how the database is tuned. Block 1.
 *
 * Both halves of this block are changes that make things faster without
 * changing what they do — which is precisely the kind of change that can be
 * wrong for a long time without anybody noticing.
 *
 * ## The one that would have been serious
 *
 * Pages are now cut once and kept in memory, and only the nonce is per-request.
 * The obvious way to write that optimisation is to cache the RENDERED html —
 * and that version works perfectly, looks right in a browser, passes a
 * screenshot pass, and hands **every visitor the same nonce**. A nonce that is
 * shared is a nonce an attacker knows, and the entire strict-CSP posture of
 * this project rests on it not being knowable.
 *
 * So the assertion that matters here is not "the page has a nonce". It is
 * **"two requests to the same page get different nonces"**, and it is checked
 * against a real running server rather than against the function, because the
 * cache lives between the function and the response.
 *
 * ## The database half
 *
 * `synchronous` and `busy_timeout` are set at import time from the environment,
 * so they can only be checked honestly in a fresh process. Asserting on a
 * module already loaded in THIS process would prove that the current process
 * read the current environment, which nobody doubted.
 */
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';

const BASE = process.env.BASE_URL || 'http://localhost:3000';
let pass = 0, fail = 0;
const ok = (c, name, detail) => {
  if (c) { pass++; console.log('✓ ' + name); return; }
  fail++; console.log('✗ ' + name + (detail === undefined ? '' : '  → ' + detail));
};
const head = t => console.log('\n\x1b[1m== ' + t + ' ==\x1b[0m');

const TMP = fs.mkdtempSync(path.join(os.tmpdir(), 'prep-serving-'));

/** Load server/db.js in a fresh process with a given environment, and ask it
    what SQLite actually ended up with. Reports the error instead when the
    module refuses to load, which for two of these cases is the point. */
function pragmasWith(extra) {
  const r = spawnSync(process.execPath, ['-e', `
    const { db } = require('./server/db.js');
    const out = {};
    for (const p of ['synchronous', 'busy_timeout', 'journal_mode', 'foreign_keys']) {
      out[p] = Object.values(db.prepare('PRAGMA ' + p).get())[0];
    }
    console.log(JSON.stringify(out));
  `], {
    env: { ...process.env, PREP_DB: path.join(TMP, 'p-' + Math.random().toString(36).slice(2) + '.sqlite'), ...extra },
    encoding: 'utf8', timeout: 120000
  });
  const line = (r.stdout || '').trim().split('\n').filter(l => l.startsWith('{')).pop();
  return { ok: r.status === 0, out: line ? JSON.parse(line) : null, err: r.stderr || '' };
}

try {
  head('SQLite is tuned the way Block 1 says, and says no to the rest');

  /* Exported so the pragmas can be read back at all. If this is missing the
     rest of this section cannot mean anything, so it is checked first. */
  const exposed = spawnSync(process.execPath,
    ['-e', 'console.log(typeof require("./server/db.js").db)'],
    { env: { ...process.env, PREP_DB: path.join(TMP, 'exp.sqlite') }, encoding: 'utf8', timeout: 120000 });
  ok((exposed.stdout || '').includes('object'),
    'server/db.js exposes the handle, so the settings can be read back',
    (exposed.stderr || '').slice(-200));

  const dflt = pragmasWith({});
  ok(dflt.ok && dflt.out && Number(dflt.out.synchronous) === 1,
    'synchronous defaults to NORMAL (1) — the measured 9× on writes',
    dflt.out ? 'got ' + dflt.out.synchronous : dflt.err.slice(-200));
  ok(dflt.out && Number(dflt.out.busy_timeout) === 5000,
    'busy_timeout is 5000ms, the precondition for running more than one process',
    dflt.out && dflt.out.busy_timeout);
  ok(dflt.out && String(dflt.out.journal_mode).toLowerCase() === 'wal',
    'journal_mode is still WAL — NORMAL is only safe under WAL',
    dflt.out && dflt.out.journal_mode);
  ok(dflt.out && Number(dflt.out.foreign_keys) === 1,
    'foreign keys are still enforced');

  const full = pragmasWith({ PREP_SYNCHRONOUS: 'FULL' });
  ok(full.ok && full.out && Number(full.out.synchronous) === 2,
    'PREP_SYNCHRONOUS=FULL buys the durability back',
    full.out ? 'got ' + full.out.synchronous : full.err.slice(-200));

  const lower = pragmasWith({ PREP_SYNCHRONOUS: 'full' });
  ok(lower.ok && lower.out && Number(lower.out.synchronous) === 2,
    'And it is not case-sensitive, because nobody types env vars in capitals reliably');

  /* OFF is the setting where an OS crash leaves a corrupt database rather than
     a stale one. An env var that accepts it is an env var somebody sets. */
  const off = pragmasWith({ PREP_SYNCHRONOUS: 'OFF' });
  ok(!off.ok && /PREP_SYNCHRONOUS/.test(off.err),
    'PREP_SYNCHRONOUS=OFF is refused, loudly, at boot', String(off.ok));

  const junk = pragmasWith({ PREP_SYNCHRONOUS: 'fast' });
  ok(!junk.ok && /PREP_SYNCHRONOUS/.test(junk.err),
    'And so is anything that is not one of the three real values');

  const custom = pragmasWith({ PREP_BUSY_TIMEOUT_MS: '250' });
  ok(custom.ok && custom.out && Number(custom.out.busy_timeout) === 250,
    'busy_timeout can be lowered for a machine that would rather fail fast');

  head('Cached pages still mint a fresh nonce for every single request');

  const pages = ['/prep/landing/', '/prep/dang-nhap/'];
  for (const p of pages) {
    const a = await fetch(BASE + p, { redirect: 'manual' });
    const ahtml = await a.text();
    const b = await fetch(BASE + p, { redirect: 'manual' });
    const bhtml = await b.text();

    const nonces = h => [...h.matchAll(/nonce="([^"]+)"/g)].map(m => m[1]);
    const an = nonces(ahtml), bn = nonces(bhtml);

    ok(an.length > 0, p + ' carries nonces at all', an.length + '');
    ok(new Set(an).size === 1,
      p + ': one nonce per document, the same on every tag in it', new Set(an).size + ' distinct');
    /* The assertion this whole file exists for. */
    ok(an[0] !== bn[0],
      p + ': and a DIFFERENT nonce on the next request — the cache holds the page, never the nonce',
      an[0] + ' vs ' + bn[0]);

    /* A nonce in the body that the header does not name protects nothing. */
    const csp = a.headers.get('content-security-policy') || '';
    ok(csp.includes(`'nonce-${an[0]}'`),
      p + ': and the CSP header names that same nonce', csp.slice(0, 90));

    /* The failure mode of a cut-based rewrite is a missed injection point: one
       <script the regex used to catch and the splitter does not. It would look
       fine until the browser refused to run that one script. */
    const openers = (ahtml.match(/<(?:script|style)\b/g) || []).length;
    ok(openers === an.length,
      p + `: every <script and <style got one — ${openers} tags, ${an.length} nonces`);
    ok(!/<(?:script|style)(?!\s+nonce=)/.test(ahtml),
      p + ': and none was left without one');

    ok((a.headers.get('cache-control') || '').includes('no-store'),
      p + ': still no-store, so no shared cache can hand the nonce to somebody else');
  }

  head('The document is byte-identical to what the old rewrite produced');

  /* The cut-and-join must be exactly the two replaces it replaced, on the real
     pages rather than on a fixture — a fixture proves the splitter handles the
     fixture. */
  const cut = html => {
    const out = []; const re = /<(?:script|style)\b/g; let last = 0, m;
    while ((m = re.exec(html)) !== null) { const e = m.index + m[0].length; out.push(html.slice(last, e)); last = e; }
    out.push(html.slice(last)); return out;
  };
  const files = [
    'public/prep/landing/index.html', 'public/prep/index.html',
    'public/admin/index.html', 'public/prep/auth/dang-nhap.html'
  ].filter(f => fs.existsSync(f));
  ok(files.length >= 3, 'Found real pages to compare against', files.length + '');
  let diff = 0;
  for (const f of files) {
    const html = fs.readFileSync(f, 'utf8');
    const n = 'AbC123+/=test';
    const was = html.replace(/<script\b/g, `<script nonce="${n}"`)
      .replace(/<style\b/g, `<style nonce="${n}"`);
    if (cut(html).join(` nonce="${n}"`) !== was) diff++;
  }
  ok(diff === 0, 'Cut-and-join matches the old replace on every one of them', diff + ' differ');

  head('Outside production, editing a page shows up on reload');

  /* The cost of caching is stale pages during development, and the mitigation
     is an mtime check. It has to be checked by actually editing a file: a
     cache that only refreshes on restart is exactly what this avoids, and the
     difference is invisible until somebody loses an afternoon to it. */
  const victim = 'public/prep/offline.html';
  if (fs.existsSync(victim)) {
    const original = fs.readFileSync(victim, 'utf8');
    const marker = 'blk1-' + Date.now();
    /* This check edits a file that is in git, so it has to put it back on every
       path out of the process, not only the happy one. A suite interrupted
       halfway that leaves a stray comment in a page is a suite that gets
       committed by the next person who runs `git add -A`. */
    const putBack = () => { try { fs.writeFileSync(victim, original); } catch { /* nothing left to do */ } };
    process.on('exit', putBack);
    for (const sig of ['SIGINT', 'SIGTERM']) process.on(sig, () => { putBack(); process.exit(130); });
    try {
      const before = await (await fetch(BASE + '/prep/offline/', { redirect: 'manual' })).text();
      ok(!before.includes(marker), 'The marker is not there to begin with');
      fs.writeFileSync(victim, original.replace('</body>', `<!-- ${marker} --></body>`));
      /* mtime has 1ms resolution on most filesystems; the write above is a
         different millisecond than the read, but give it room. */
      await new Promise(r => setTimeout(r, 40));
      const after = await (await fetch(BASE + '/prep/offline/', { redirect: 'manual' })).text();
      ok(after.includes(marker),
        'An edited page is picked up on the next request, without a restart');
    } finally {
      fs.writeFileSync(victim, original);
    }
  } else {
    ok(false, 'Could not find a page to edit for the staleness check', victim);
  }

} catch (e) {
  fail++;
  console.log('\n✗ The suite threw: ' + (e && e.stack ? e.stack : e));
} finally {
  fs.rmSync(TMP, { recursive: true, force: true });
}

console.log(`\n${fail ? '\x1b[31m' : '\x1b[32m'}${pass} passed, ${fail} failed\x1b[0m`);
process.exit(fail ? 1 : 0);
