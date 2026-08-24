#!/usr/bin/env node
/**
 * Is the cheap model good enough to mark with?
 *
 * A model card cannot answer that and neither can I. What settles it is marking
 * the same answers with two models and reading the difference — so this marks
 * every rubric answer on a paper (or a handful of papers) once per model, and
 * prints where they disagree.
 *
 *   node scripts/model-compare.mjs --attempt=12
 *   node scripts/model-compare.mjs --attempt=12,13,14
 *   node scripts/model-compare.mjs --attempt=12 --models=claude-haiku-4-5,claude-sonnet-5
 *   node scripts/model-compare.mjs --attempt=12 --repeat=3
 *
 * ## This spends real money
 *
 * Every call is a real call against the configured key, counted in `ai_calls`
 * like any other. A full paper is 26 rubric items, so two models over one paper
 * is 52 calls; `--repeat=3` triples that. The estimate is printed first and it
 * stops there unless `--yes` is given, for the same reason scripts/attempts.js
 * does: a number on screen before the money leaves.
 *
 * Nothing it does touches the paper. Marks are read, compared and thrown away —
 * `attempt_answers`, `rubric_scores` and `attempt_scores` are never written, so
 * this can be run against a real sitting without changing what its candidate
 * sees. (`ai_calls` IS written, because that is the spend ledger and the spend
 * is real.)
 *
 * ## What to look at
 *
 * **Not marked** is the first column that matters. A model that cannot produce
 * a readable verdict is not cheap at any price: those items would sit pending
 * and come back round the backoff ladder, paying again each time.
 *
 * **Mean gap** is calibration. A cheap model that scores everything 0.3 lower
 * than the expensive one is not a problem — that is a constant, and the band
 * table can absorb it. A cheap model with a large SPREAD of disagreement is a
 * problem, because it means the two disagree about which answers are good, not
 * about where the scale sits. Watch `spread`, not `mean gap`.
 *
 * **Evidence dropped** is honesty. rubric.js throws away a quotation that is
 * not in the candidate's text, so a high count here means the model is
 * inventing quotes — the marks may still be fine, but the feedback a learner
 * reads has nothing behind it.
 *
 * **--repeat** answers a different question: how much a model disagrees with
 * ITSELF. A model whose own two runs differ by more than it differs from the
 * other model is not being compared to anything — it is noise.
 */
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const { q } = require('../server/db');
const ai = require('../server/ai-marking');
const rubric = require('../server/rubric');
const storage = require('../server/storage');

const argv = process.argv.slice(2);
const has = f => argv.includes('--' + f);
const opt = (f, dflt) => {
  const hit = argv.find(a => a.startsWith('--' + f + '='));
  return hit ? hit.slice(f.length + 3) : dflt;
};

const MODELS = String(opt('models', 'claude-haiku-4-5,claude-sonnet-5'))
  .split(',').map(s => s.trim()).filter(Boolean);
const REPEAT = Math.max(1, parseInt(opt('repeat', '1'), 10) || 1);
const ATTEMPTS = String(opt('attempt', '')).split(',').map(s => parseInt(s, 10)).filter(Boolean);

const n2 = x => (x === null || x === undefined ? '  -  ' : x.toFixed(2).padStart(5));

function die(msg) { console.error('\n' + msg + '\n'); process.exit(1); }

/* ------------------------------------------------------------------ *
 * What is being marked
 * ------------------------------------------------------------------ */

/** Every rubric-marked item on a paper, with the candidate's answer. */
async function itemsOf(attemptId) {
  return q.all(
    `SELECT aa.answer, aa.audio_key, si.question_id,
            qs.prompt, qs.type, qs.level, qs.part, t.level paper_level
       FROM attempt_parts ap
       JOIN section_items si ON si.section_id = ap.section_id
       JOIN questions qs ON qs.id = si.question_id
       JOIN attempts a ON a.id = ap.attempt_id
       JOIN tests t ON t.id = a.test_id
       LEFT JOIN attempt_answers aa
              ON aa.attempt_id = ap.attempt_id AND aa.question_id = si.question_id
      WHERE ap.attempt_id = ? AND qs.type IN ('essay','speaking')
      ORDER BY qs.part, si.sort`, attemptId);
}

/**
 * The words to mark. A spoken answer is transcribed ONCE and the transcript
 * reused for every model — otherwise the comparison measures the transcriber's
 * variance as well as the markers', and the two cannot be told apart.
 */
async function wordsFor(row) {
  if (row.type !== 'speaking') return { text: String(row.answer || ''), heard: null };
  if (!row.audio_key) return null;
  if (!await ai.canTranscribe()) return null;
  try {
    const file = await storage.get(row.audio_key);
    const heard = await ai.transcribe(file.body || file, file.mime, {});
    return heard ? { text: '', heard } : null;
  } catch (e) {
    console.warn('  (transcription failed on question ' + row.question_id + ': '
      + ai.scrub(e && e.message) + ')');
    return null;
  }
}

/* ------------------------------------------------------------------ *
 * Marking, and what came back
 * ------------------------------------------------------------------ */

async function markWith(model, row, words) {
  let verdict = null, error = null;
  try {
    verdict = await ai.markOne({
      part: row.part, level: row.level || row.paper_level, prompt: row.prompt,
      answer: words.text, heard: words.heard,
      source: row.type === 'speaking' ? 'transcript' : 'text',
      model
    });
  } catch (e) {
    error = ai.scrub(e && e.message);
    /* A ceiling or a rejected key will meet every remaining item the same way,
       so there is no point spending the rest of the run finding that out. */
    if (e && (e.budget || e.retryable === false)) throw e;
  }
  if (!verdict) return { marked: false, error };

  const graded = rubric.combine(row.part, verdict.criteria, {
    answer: words.heard || words.text, fallbackScore: verdict.score
  });
  const wanted = rubric.CRITERIA[row.part] ? rubric.CRITERIA[row.part].length : 0;
  return {
    marked: true,
    score: graded ? graded.score : verdict.score,
    headline: verdict.score,
    criteriaGiven: verdict.criteria ? Object.keys(verdict.criteria).length : 0,
    criteriaWanted: wanted,
    criteriaUsed: graded ? graded.criteria.length : 0,
    evidenceDropped: graded ? graded.criteria.filter(c => c.evidenceRejected).length : 0,
    caps: graded ? graded.caps.map(c => c.rule) : [],
    noteWords: rubric.words(verdict.note || '').length
  };
}

/* ------------------------------------------------------------------ *
 * Arithmetic on the differences
 * ------------------------------------------------------------------ */

const mean = xs => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : null);
function stdev(xs) {
  if (xs.length < 2) return null;
  const m = mean(xs);
  return Math.sqrt(xs.reduce((s, x) => s + (x - m) ** 2, 0) / (xs.length - 1));
}

/* ------------------------------------------------------------------ *
 * Run
 * ------------------------------------------------------------------ */

(async () => {
  if (!ATTEMPTS.length) {
    die('Which sitting? --attempt=<id>, or several: --attempt=12,13\n'
      + '  node scripts/attempts.js list   shows what is on this server.');
  }
  if (MODELS.length < 2 && REPEAT < 2) {
    die('Give at least two models, or --repeat=2 to compare a model with itself.\n'
      + '  --models=claude-haiku-4-5,claude-sonnet-5');
  }
  if (!await ai.ready()) {
    die('No marking key is configured, or it cannot be opened.\n'
      + '  Administration → Settings, or see docs/VAN-HANH.md §1.');
  }

  /* Gather first, so the estimate is a real count rather than a guess. */
  const work = [];
  for (const id of ATTEMPTS) {
    const rows = await itemsOf(id);
    if (!rows.length) die('Sitting ' + id + ' has no rubric-marked items (or does not exist).');
    work.push({ id, rows });
  }
  const items = work.reduce((n, w) => n + w.rows.length, 0);
  const spoken = work.reduce((n, w) => n + w.rows.filter(r => r.type === 'speaking').length, 0);
  const calls = items * MODELS.length * REPEAT;

  console.log('\n  ' + work.length + ' sitting(s), ' + items + ' rubric item(s), '
    + MODELS.length + ' model(s)' + (REPEAT > 1 ? ' × ' + REPEAT + ' runs' : ''));
  console.log('  ' + MODELS.join('  vs  '));
  console.log('\n  This will make about ' + calls + ' marking call(s) and '
    + spoken + ' transcription call(s), against your key.');
  console.log('  Nothing on the paper is changed — marks are compared and thrown away.');

  if (!has('yes')) {
    console.log('\n  Nothing has been spent. Run it again with --yes:\n');
    console.log('      node scripts/model-compare.mjs ' + argv.join(' ') + ' --yes\n');
    return;
  }

  /* results[model] = [{questionId, part, ...run}] */
  const byModel = new Map(MODELS.map(m => [m, []]));
  const perRun = new Map();                    // model -> run -> [score|null]

  for (const w of work) {
    console.log('\n  Sitting ' + w.id + ':');
    for (const row of w.rows) {
      const words = await wordsFor(row);
      if (!words || (!words.text.trim() && !words.heard)) {
        console.log('    ' + row.part + ' q' + row.question_id + '  (nothing to mark, skipped)');
        continue;
      }
      const line = ['    ' + row.part + ' q' + String(row.question_id).padEnd(5)];
      for (const model of MODELS) {
        for (let run = 0; run < REPEAT; run++) {
          const got = await markWith(model, row, words);
          if (run === 0) {
            byModel.get(model).push({ questionId: row.question_id, part: row.part, ...got });
            line.push(got.marked ? n2(got.score) : ' ---- ');
          }
          const key = model + '#' + run;
          if (!perRun.has(key)) perRun.set(key, []);
          perRun.get(key).push(got.marked ? got.score : null);
        }
      }
      console.log(line.join('  '));
    }
  }

  /* ---------------------------------------------------------------- *
   * The table
   * ---------------------------------------------------------------- */

  console.log('\n\n  PER MODEL\n');
  console.log('  ' + 'MODEL'.padEnd(24) + 'MARKED  NOT MARKED  MEAN  CRITERIA  EVIDENCE DROPPED');
  for (const model of MODELS) {
    const rs = byModel.get(model);
    const ok = rs.filter(r => r.marked);
    const full = ok.filter(r => r.criteriaUsed >= r.criteriaWanted).length;
    console.log('  ' + model.padEnd(24)
      + String(ok.length).padStart(6)
      + String(rs.length - ok.length).padStart(12)
      + n2(mean(ok.map(r => r.score))).padStart(6)
      + (full + '/' + ok.length).padStart(10)
      + String(ok.reduce((n, r) => n + r.evidenceDropped, 0)).padStart(18));
  }

  if (MODELS.length >= 2) {
    console.log('\n\n  MODEL vs MODEL — on the items BOTH marked\n');
    const [a, b] = MODELS;
    const byQ = new Map(byModel.get(b).map(r => [r.questionId, r]));
    const pairs = byModel.get(a)
      .filter(r => r.marked && byQ.get(r.questionId) && byQ.get(r.questionId).marked)
      .map(r => ({ part: r.part, questionId: r.questionId, a: r.score, b: byQ.get(r.questionId).score }));

    if (!pairs.length) {
      console.log('  (no item was marked by both — see NOT MARKED above)');
    } else {
      const gaps = pairs.map(p => p.a - p.b);
      const abs = gaps.map(Math.abs);
      console.log('  items compared     ' + pairs.length);
      console.log('  mean gap           ' + n2(mean(gaps)).trim()
        + '   (' + a + ' minus ' + b + '; a constant offset is harmless)');
      console.log('  spread of the gap  ' + n2(stdev(gaps)).trim()
        + '   (THIS is the number that matters — disagreement about which answers are good)');
      console.log('  worst single item  ' + n2(Math.max(...abs)).trim());
      console.log('  within 1.0 mark    ' + abs.filter(x => x <= 1).length + ' of ' + pairs.length);
      console.log('  within 2.0 marks   ' + abs.filter(x => x <= 2).length + ' of ' + pairs.length);

      const worst = pairs.slice().sort((x, y) => Math.abs(y.a - y.b) - Math.abs(x.a - x.b)).slice(0, 8);
      console.log('\n  Furthest apart:');
      console.log('    PART  ITEM    ' + a.slice(0, 18).padEnd(20) + b.slice(0, 18));
      for (const p of worst) {
        console.log('    ' + p.part.padEnd(6) + String(p.questionId).padEnd(8)
          + n2(p.a).padEnd(20) + n2(p.b));
      }
    }
  }

  if (REPEAT > 1) {
    console.log('\n\n  A MODEL AGAINST ITSELF — ' + REPEAT + ' runs of the same answers\n');
    console.log('  If this is as large as the gap between models, the comparison above');
    console.log('  is measuring noise rather than a difference.\n');
    for (const model of MODELS) {
      const runs = Array.from({ length: REPEAT }, (_, i) => perRun.get(model + '#' + i) || []);
      const spreads = [];
      for (let i = 0; i < runs[0].length; i++) {
        const got = runs.map(r => r[i]).filter(x => x !== null && x !== undefined);
        if (got.length >= 2) spreads.push(Math.max(...got) - Math.min(...got));
      }
      console.log('  ' + model.padEnd(24) + 'mean own-spread ' + n2(mean(spreads)).trim()
        + '   worst ' + (spreads.length ? Math.max(...spreads).toFixed(1) : '-'));
    }
  }

  console.log('\n  Nothing on any paper was changed. The calls are in `ai_calls`.\n');
})().catch(e => {
  console.error('\n' + ai.scrub(String((e && e.message) || e)) + '\n');
  process.exit(1);
});
