#!/usr/bin/env node
/**
 * The spending ceiling. No server needed — this drives the module directly.
 *
 * Block 8. Every other limit on this platform protects the machine or the data;
 * this one protects the bank account, and it is the only limit whose absence is
 * invisible until an invoice arrives. So the checks are about the ways a
 * spending limit fails while still looking present:
 *
 *   · counting successes, so a failing provider bills without limit
 *   · a calendar day, so the whole allowance is free again at a known instant
 *   · one ceiling instead of two, so a thousand polite accounts add up to a bill
 *   · a typo in an env var silently turning the whole thing off
 *   · MAX(id) instead of lastInsertRowid, so two workers stamp each other's rows
 *
 * Runs on its own scratch database. It writes several thousand rows to reach a
 * ceiling, and a suite that leaves those in `data/prep.sqlite` would make the
 * NEXT run of this file start halfway to the limit.
 */
import { createRequire } from 'node:module';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const dir = mkdtempSync(join(tmpdir(), 'vpet-budget-'));
process.env.PREP_DB = join(dir, 'budget.sqlite');
/* Small ceilings, so reaching them costs a handful of rows rather than 6,000.
   Set before the module is required — they are read at import. */
process.env.AI_CALLS_PER_DAY = '10';
process.env.AI_CALLS_PER_ACCOUNT_PER_DAY = '4';

const require = createRequire(import.meta.url);
const B = require('../server/ai-budget.js');
const { q } = require('../server/db.js');

let pass = 0, fail = 0;
const ok = (c, name, detail) => {
  if (c) { pass++; console.log('✓ ' + name); return; }
  fail++; console.log('✗ ' + name + (detail === undefined ? '' : '  → ' + detail));
};
const head = t => console.log('\n\x1b[1m== ' + t + ' ==\x1b[0m');

const clear = () => q.run('DELETE FROM ai_calls');

/* Real accounts, because `ai_calls.user_id` really does reference `users(id)`.
   That constraint is wanted — ON DELETE SET NULL means closing an account
   anonymises its spend record rather than erasing it, which is what an
   administrator asking "what did last week cost" needs — so the test bends to
   the schema rather than the other way round. */
async function account(id) {
  await q.run(
    `INSERT INTO users (id, username, email, name, verified, status, interests_json, created_at)
     VALUES (?,?,?,?,0,'active','[]',?)
     ON CONFLICT(id) DO NOTHING`,
    id, 'budget' + id, 'budget' + id + '@example.test', 'Budget ' + id, new Date().toISOString());
  return id;
}

head('The ceilings are read from the environment');

ok(B.PLATFORM_PER_DAY === 10, 'the platform ceiling is taken from the environment', B.PLATFORM_PER_DAY);
ok(B.PER_ACCOUNT_PER_DAY === 4, 'the per-account ceiling too', B.PER_ACCOUNT_PER_DAY);

head('A permit is recorded before the call, not after it');

await account(7); await account(8); await account(999);
for (let u = 100; u < 110; u++) await account(u);

await clear();
const first = await B.take({ kind: 'mark', userId: 7, attemptId: 'att-1' });
ok(first.ok === true, 'the first call is allowed');
ok(Number.isInteger(first.id) && first.id > 0, 'and comes back with the id of its own row', first.id);

const row = await q.get('SELECT * FROM ai_calls WHERE id=?', first.id);
ok(row && row.outcome === 'started',
  'the row exists ALREADY, marked started — the ceiling counts intent, not success',
  row && row.outcome);
ok(row && row.user_id === 7 && row.attempt_id === 'att-1' && row.kind === 'mark',
  'and it records who it was for', row && JSON.stringify([row.user_id, row.attempt_id, row.kind]));

/* The whole reason this is a ledger rather than a count of marks. */
await B.settle(first.id, 'timeout');
const after = await q.get('SELECT outcome FROM ai_calls WHERE id=?', first.id);
ok(after.outcome === 'timeout', 'a failed call keeps its row', after.outcome);
const stillCounted = await B.used(7);
ok(stillCounted.platform === 1,
  'and STILL COUNTS: a call that timed out after the model answered cost full price',
  stillCounted.platform);

head('Two ceilings, and each one bites on its own');

await clear();
/* Four for one account, which is that account's whole allowance. */
for (let i = 0; i < 4; i++) await B.take({ kind: 'mark', userId: 7 });
const refusedAccount = await B.take({ kind: 'mark', userId: 7 });
ok(refusedAccount.ok === false, 'the fifth call for that account is refused');
ok(refusedAccount.reason === 'account', 'and it says which ceiling', refusedAccount.reason);
ok(refusedAccount.count === 4 && refusedAccount.cap === 4,
  'with the numbers, so the message can be specific',
  refusedAccount.count + '/' + refusedAccount.cap);
ok(refusedAccount.retryAfterSec > 0 && refusedAccount.retryAfterSec <= 24 * 3600,
  'and when there will be room again, never 0', refusedAccount.retryAfterSec);
ok(/vi|Vi|à|ạ|ế|ữ/.test(refusedAccount.vi) && refusedAccount.en.length > 20,
  'in both languages, because this text reaches a candidate');

/* A refused call must not be recorded — it cost nothing. */
const afterRefusal = await B.used(7);
ok(afterRefusal.platform === 4, 'a refused call is NOT written down; it cost nothing', afterRefusal.platform);

/* A different account still has its own allowance. */
const other = await B.take({ kind: 'mark', userId: 8 });
ok(other.ok === true, 'a different account is unaffected by the first one hitting its ceiling');

head('The platform ceiling catches what the per-account one cannot');

await clear();
/* Ten accounts, one call each: every account far inside its own ceiling of
   four, and the platform at its ceiling of ten. This is the case a single
   per-account limit misses entirely. */
for (let u = 100; u < 110; u++) {
  const r = await B.take({ kind: 'mark', userId: u });
  if (!r.ok) { ok(false, 'ten separate accounts each get their first call', 'refused at user ' + u); break; }
}
const eleventh = await B.take({ kind: 'mark', userId: 999 });
ok(eleventh.ok === false, 'a brand-new account is refused once the PLATFORM is at its ceiling');
ok(eleventh.reason === 'platform', 'and the reason is the platform, not the account', eleventh.reason);

head('A rolling window, not a calendar day');

await clear();
/* A call from twenty-five hours ago is outside the window and must not count.
   A calendar-day implementation would still be counting it until midnight, or
   would have forgotten everything at midnight — both wrong in a way somebody
   can time. */
const old = new Date(Date.now() - 25 * 3600e3).toISOString();
for (let i = 0; i < 10; i++) {
  await q.run('INSERT INTO ai_calls (at, kind, user_id, outcome) VALUES (?,?,?,?)',
    old, 'mark', 7, 'ok');
}
const afterOld = await B.used(7);
ok(afterOld.platform === 0, 'calls older than 24 hours have left the window', afterOld.platform);
ok((await B.take({ kind: 'mark', userId: 7 })).ok === true,
  'so the ceiling has room again — no midnight cliff for a script to wait for');

/* And one inside the window still counts, at 23 hours. */
await clear();
const recent = new Date(Date.now() - 23 * 3600e3).toISOString();
for (let i = 0; i < 10; i++) {
  await q.run('INSERT INTO ai_calls (at, kind, user_id, outcome) VALUES (?,?,?,?)',
    recent, 'mark', 7, 'ok');
}
ok((await B.take({ kind: 'mark', userId: 7 })).ok === false,
  'a call from 23 hours ago is still inside the window and still counts');

head('An unknown account is still bounded');

await clear();
/* userId null — a paper whose account was deleted, or an administrator pressing
   "Test connection". The per-account ceiling cannot apply, so the platform one
   must, or null becomes the way round the limit. */
for (let i = 0; i < 10; i++) await B.take({ kind: 'mark', userId: null });
const anon = await B.take({ kind: 'mark', userId: null });
ok(anon.ok === false, 'calls with no account still meet the platform ceiling');
ok(anon.reason === 'platform', 'and are refused by it', anon.reason);

head('A typo in an environment variable cannot remove the limit');

/* The failure mode that matters: someone writes AI_CALLS_PER_DAY=none, the
   parse gives NaN, a careless `|| 0` reads that as "off", and the platform runs
   with no spending limit while the setting looks deliberate. */
function ceilingWith(value) {
  const had = process.env.AI_CALLS_PER_DAY;
  process.env.AI_CALLS_PER_DAY = value;
  delete require.cache[require.resolve('../server/ai-budget.js')];
  const m = require('../server/ai-budget.js');
  process.env.AI_CALLS_PER_DAY = had;
  delete require.cache[require.resolve('../server/ai-budget.js')];
  return m.PLATFORM_PER_DAY;
}
ok(ceilingWith('none') === 6000, 'a word falls back to the DEFAULT, not to unlimited', ceilingWith('none'));
ok(ceilingWith('-5') === 6000, 'a negative number falls back to the default', ceilingWith('-5'));
ok(ceilingWith('') === 6000, 'an empty value falls back to the default', ceilingWith(''));

/* The polarity, which was the wrong way round and silently so.
 *
 * `0` used to mean "no ceiling", and the guards read it by truthiness so the
 * limit was simply never consulted. Read the variable's name the way the person
 * typing it does: whoever sets AI_CALLS_PER_DAY=0 has just seen an invoice and
 * wants the spending to stop. Unlimited spending is the worst available answer
 * to that, and nothing on any screen said it had happened. */
ok(ceilingWith('0') === 0, 'zero is a ceiling of zero — the number somebody types to mean STOP',
  ceilingWith('0'));
ok(ceilingWith('off') === Infinity, 'switching a ceiling off has to be spelt out', ceilingWith('off'));
ok(ceilingWith('OFF') === Infinity, 'and is not case-sensitive, because env vars are shouted');

head('Housekeeping');

await clear();
await q.run('INSERT INTO ai_calls (at, kind, outcome) VALUES (?,?,?)',
  new Date(Date.now() - 8 * 24 * 3600e3).toISOString(), 'mark', 'ok');
await q.run('INSERT INTO ai_calls (at, kind, outcome) VALUES (?,?,?)',
  new Date(Date.now() - 2 * 24 * 3600e3).toISOString(), 'mark', 'ok');
await B.purge();
const left = await q.val('SELECT COUNT(*) c FROM ai_calls');
ok(left === 1, 'purge drops rows past a week and keeps the rest, so last week is still readable', left);

const st = await B.status();
ok(st.platform.cap === 10 && st.perAccount.cap === 4 && st.windowHours === 24,
  'status reports both ceilings and the window, for the admin screen',
  JSON.stringify(st));

try { rmSync(dir, { recursive: true, force: true }); } catch (e) { /* tmp */ }

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
