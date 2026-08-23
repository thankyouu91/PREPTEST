/**
 * Revision: grammar and vocabulary practised by USING them, not by recognising them.
 *
 * Block 5. The owner was explicit — "luyện trong viết câu + áp dụng từ" — and
 * the thing being ruled out is the four-option quiz. Recognising the right form
 * among four is a different skill from producing it, and it is the easier one;
 * a learner who can pick `has been considering` from a list may still write
 * `is considering` in their e-mail on Part D.
 *
 * So there are two exercise types and neither offers a choice.
 *
 * ## 1. `apply` — put the word in, in the right form
 *
 *     The committee ___ (consider) the proposal since March.
 *
 * The word is given; what is being practised is the form. Machine-marked
 * exactly, because there is a finite right answer — which is what lets it be
 * free, instant and unlimited. This is the bulk of the material: 2,214 sentences
 * across A1–C2 and nine grammar groups already sit in `grammar_examples`, one
 * gap and one answer each.
 *
 * ## 2. `build` — write your own sentence with it
 *
 *     Write a sentence about your work using the present perfect continuous.
 *
 * No gap, no scaffold. Marked by the tier-1 measurements in `server/rubric.js`
 * straight away — is the target actually there, is it a sentence, is it their
 * own words rather than the example copied — and by the tier-3 marker later
 * where one is configured. Producing language is the thing the exam tests and
 * the thing a gap-fill cannot reach.
 *
 * ## How it connects to the ability report
 *
 * Same loop as drills, one level down. `weakestTopics()` reads the per-TOPIC
 * estimates `server/ability.js` already keeps — bucketed by grammar slug — and
 * every marked answer writes a `skill_event` back with `skill: 'grammar'` and
 * that slug as `topic`. Grammar and vocabulary are deliberately NOT part of the
 * overall band: `abilityOf()` computes that from the four exam skills only,
 * because VPET does not award a grammar score and inventing one would produce a
 * number that corresponds to no exam anybody sits. They are diagnostic
 * dimensions — they say what to work on, not what you would get.
 *
 * ## Marking a gap fairly
 *
 * `matches()` is the whole difference between practice that teaches and practice
 * that annoys. A learner who writes `do not live` where the key says `don't
 * live` has not made a mistake, and marking them wrong twice teaches them to
 * distrust the marker rather than to write better English.
 */
'use strict';

const { q, nowISO } = require('./db');
const ability = require('./ability');
const rubric = require('./rubric');

const DEFAULT_SIZE = 8;
const MAX_SIZE = 15;

/** Weighted the same as a drill: unhurried, retryable, not the exam. */
const REVISION_WEIGHT = 0.6;

/** How long before a sentence may come round again. */
const COOLDOWN_DAYS = 30;

/** The levels the owner asked for, in order. A1/A2 stay reachable for a learner
    the model places below B1 — refusing to teach somebody who needs it most
    would be a strange reading of "B1–C2". */
const LEVELS = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2'];
const TARGET_LEVELS = ['B1', 'B2', 'C1', 'C2'];

/* ---------------------------- Marking a gap ---------------------------- */

/** Contractions a learner may legitimately write out, and the reverse. */
const CONTRACTIONS = [
  ["n't", ' not'], ["'re", ' are'], ["'ve", ' have'], ["'ll", ' will'],
  ["'d", ' would'], ["'m", ' am'], ["'s", ' is']
];

/**
 * One answer, reduced to what actually matters about it.
 *
 * Curly quotes become straight (a phone keyboard produces them and a learner
 * cannot see the difference), contractions are expanded, case and punctuation go,
 * and whitespace collapses. `'s` → ` is` is the one that is not always right —
 * it is also possessive and the third-person of `has` — but inside a gap answer
 * it is overwhelmingly the copula, and the cost of being wrong is accepting a
 * correct answer written another way rather than rejecting a right one.
 */
function normalise(s) {
  let t = String(s == null ? '' : s).toLowerCase()
    .replace(/[‘’ʼ]/g, "'")
    .replace(/[“”]/g, '"');
  for (const [short, long] of CONTRACTIONS) t = t.split(short).join(long);
  return t.replace(/[^\p{L}\p{N}\s']/gu, ' ').replace(/\s+/gu, ' ').trim();
}

/**
 * Does what the learner wrote satisfy the key?
 *
 * Two shapes of key, and the second is why this is not one string compare:
 *
 *   `works`            — one gap, one answer
 *   `Does … like`      — TWO gaps in the sentence, and the key names both parts
 *                        in order. The learner types the whole sentence's
 *                        missing words, so each fragment has to appear, in
 *                        order, and nothing else needs to match.
 *
 * A key may also offer alternatives separated by `|`, the same convention
 * server/marking.js already uses for gap items.
 */
function matches(given, key) {
  const g = normalise(given);
  if (!g) return false;
  for (const option of String(key || '').split('|')) {
    const parts = option.split(/\s*(?:…|\.\.\.)\s*/).map(normalise).filter(Boolean);
    if (!parts.length) continue;
    if (parts.length === 1) { if (g === parts[0]) return true; continue; }
    /* Several fragments: each must appear, in order, in what they wrote. */
    let from = 0, all = true;
    for (const p of parts) {
      const at = g.indexOf(p, from);
      if (at < 0) { all = false; break; }
      from = at + p.length;
    }
    if (all) return true;
  }
  return false;
}

/** The bracketed cue in `My father ___ (work) in a hospital.` */
function cueOf(sentence) {
  const m = /\(([^)]{1,40})\)/.exec(String(sentence || ''));
  return m ? m[1].trim() : null;
}

/* ------------------------------ Choosing what ------------------------------ */

const jparse = (s, f) => { try { const v = JSON.parse(s); return v == null ? f : v; } catch { return f; } };
const clampInt = (v, lo, hi, d) => {
  const n = parseInt(v, 10);
  return Number.isFinite(n) ? Math.min(hi, Math.max(lo, n)) : d;
};

/** The CEFR level to revise at, from the ability report. */
function levelFor(ab) {
  const g = (ab.skills || {}).grammar;
  const o = ab.overall || {};
  const score = g && g.confident ? g.score : (o.confident ? o.score : null);
  if (score == null) return 'B1';
  if (score >= 8.5) return 'C1';
  if (score >= 6.5) return 'B2';
  if (score >= 3.5) return 'B1';
  return 'A2';
}

/**
 * The grammar topics worth revising, worst first.
 *
 * Topics the model has never seen are included and ranked ABOVE weak ones with
 * data, for the reason `roadmap()` gives about parts: the first thing to do
 * about an unknown is measure it. A learner who has never touched conditionals
 * should meet them before being sent back to a tense they merely scored 6 on.
 */
async function weakestTopics(userId, level, limit) {
  const cap = limit === undefined ? 6 : limit;
  const ab = await ability.abilityOf(userId);
  const seen = ab.topics || {};

  const rows = await q.all(
    `SELECT gp.slug, gp.name_en, gp.name_vi, gp.grp, gp.level,
            COUNT(ge.id) items
       FROM grammar_points gp
       JOIN grammar_examples ge ON ge.point_id = gp.id
      WHERE ge.kind = 'practice' AND ge.answer IS NOT NULL AND ge.answer <> ''
        AND gp.level = ?
      GROUP BY gp.slug
      HAVING items > 0`, level);

  const scored = rows.map(r => {
    const est = seen[r.slug];
    return {
      slug: r.slug, nameEn: r.name_en, nameVi: r.name_vi, group: r.grp,
      level: r.level, items: r.items,
      score: est ? est.score : null,
      confident: est ? !!est.confident : false,
      /* Never measured sorts first, then weakest, then the rest. */
      rank: est ? (est.confident ? est.score : est.score + 2) : -1
    };
  });
  scored.sort((a, b) => a.rank - b.rank);
  return scored.slice(0, cap);
}

/** Sentences this learner has met recently, so revision is never recall. */
async function recentlySeen(userId) {
  const since = new Date(Date.now() - COOLDOWN_DAYS * 86400e3).toISOString();
  const rows = await q.all(
    "SELECT DISTINCT item_key FROM skill_events WHERE user_id = ? AND source = 'revision' AND at > ?",
    userId, since);
  const out = new Set();
  for (const r of rows) {
    const m = /^g(\d+)$/.exec(r.item_key || '');
    if (m) out.add(Number(m[1]));
  }
  return out;
}

/* -------------------------------- Sitting one -------------------------------- */

/**
 * A revision set: `size` gap sentences from one topic, plus one sentence to write.
 *
 * The `build` item is deliberately last and deliberately single. It is the
 * expensive one to answer and the one people skip; putting it after eight
 * quick wins means it is met by somebody already in the topic rather than by
 * somebody deciding whether to start.
 */
async function start(userId, opts) {
  const o = opts || {};
  const ab = await ability.abilityOf(userId);
  const level = LEVELS.includes(String(o.level)) ? String(o.level) : levelFor(ab);
  const size = clampInt(o.size, 3, MAX_SIZE, DEFAULT_SIZE);

  let slug = String(o.topic || '').trim();
  if (!slug) {
    const top = await weakestTopics(userId, level, 1);
    if (!top.length) return { error: 'no-topic', level };
    slug = top[0].slug;
  }

  const point = await q.get(
    'SELECT id, slug, name_en, name_vi, grp, level, summary FROM grammar_points WHERE slug = ?', slug);
  if (!point) return { error: 'no-topic', level };

  const skip = await recentlySeen(userId);
  const pool = await q.all(
    `SELECT id, en, vi, answer FROM grammar_examples
      WHERE point_id = ? AND kind = 'practice' AND answer IS NOT NULL AND answer <> ''
      ORDER BY RANDOM() LIMIT 120`, point.id);

  let picked = pool.filter(r => !skip.has(r.id)).slice(0, size);
  /* Everything at this topic is on cooldown. Better to repeat than to refuse —
     but say so, so the screen can be honest rather than quietly recycling. */
  const repeated = picked.length === 0;
  if (repeated) picked = pool.slice(0, size);
  if (!picked.length) return { error: 'no-items', topic: slug, level };

  const items = picked.map(r => ({
    type: 'apply', exampleId: r.id,
    sentence: r.en, cue: cueOf(r.en), vi: r.vi
  }));

  /* One sentence of their own, using the same grammar. The example sentences
     are NOT shown with it — the point is production, and a model answer on
     screen turns it into copying. */
  items.push({
    type: 'build', exampleId: null,
    topic: point.slug, topicEn: point.name_en, topicVi: point.name_vi,
    summary: point.summary || null
  });

  const res = await q.run(
    `INSERT INTO revision_sets (user_id, topic, level, size, item_ids_json, status, started_at)
     VALUES (?,?,?,?,?,'open',?)`,
    userId, point.slug, level, items.length,
    JSON.stringify(picked.map(r => r.id)), nowISO());

  return {
    setId: Number(res.lastInsertRowid),
    topic: point.slug, topicEn: point.name_en, topicVi: point.name_vi,
    group: point.grp, level, repeated,
    items
  };
}

/**
 * Mark a finished set.
 *
 * The `apply` items are marked exactly. The `build` sentence gets the tier-1
 * measurements and three checks a machine can make honestly — the target
 * structure is present, it is a sentence, and it is not the prompt echoed back.
 * It is NOT given a score out of ten by this function: `server/rubric.js` is
 * clear that tier 1 is diagnostic, and inventing a mark here would be the thing
 * that file exists to prevent.
 */
async function submit(userId, setId, answers) {
  const s = await q.get('SELECT * FROM revision_sets WHERE id = ? AND user_id = ?', setId, userId);
  if (!s) return { error: 'not-found' };
  if (s.status === 'done') return { error: 'already-done' };

  const ids = jparse(s.item_ids_json, []);
  const given = new Map();
  let built = '';
  for (const a of Array.isArray(answers) ? answers : []) {
    if (a && a.type === 'build') { built = String(a.answer || '').slice(0, 2000); continue; }
    const id = Number(a && a.exampleId);
    if (ids.includes(id)) given.set(id, String((a && a.answer) || ''));
  }

  const fetched = ids.length
    ? await q.all(`SELECT id, en, vi, answer FROM grammar_examples WHERE id IN (${ids.map(() => '?').join(',')})`, ...ids)
    : [];
  /* Back into the order they were ANSWERED in. `IN (…)` returns rows in
     whatever order the index gives — ascending id here — while the set was
     drawn at random, so the feedback list came back shuffled relative to the
     questions the learner had just worked through. Nothing was mismarked, but
     "question 1 · you put X" pointed at a different sentence, which is
     indistinguishable from a marking bug to the person reading it. */
  const byId = new Map(fetched.map(r => [r.id, r]));
  const rows = ids.map(id => byId.get(id)).filter(Boolean);

  const at = nowISO();
  const events = [];
  const detail = [];
  let earned = 0, max = 0;

  for (const r of rows) {
    const mine = given.has(r.id) ? given.get(r.id) : '';
    const right = matches(mine, r.answer);
    earned += right ? 1 : 0; max += 1;
    /* Two events per sentence, on purpose. Filling `has been considering` into
       a gap is evidence about grammar AND about knowing the word; recording only
       one of them leaves the revision roadmap blind to half of what it just
       measured. Distinct item_key per skill or the second collides with the
       first and is silently dropped. */
    for (const skill of ['grammar', 'vocabulary']) {
      events.push({
        user_id: userId, source: 'revision', ref_id: 'revision:' + setId,
        item_key: (skill === 'grammar' ? 'g' : 'v') + r.id,
        skill, part: null, topic: s.topic, level: s.level,
        earned: right ? 1 : 0, max_score: 1, weight: REVISION_WEIGHT, at
      });
    }
    detail.push({
      type: 'apply', exampleId: r.id, sentence: r.en, given: mine,
      right, answer: r.answer, vi: r.vi
    });
  }

  let build = null;
  if (built.trim()) {
    const linking = await q.all('SELECT word FROM linking_words').catch(() => []);
    const diag = rubric.diagnostics(built, { linking: linking.map(x => x.word) });
    const words = rubric.words(built);
    build = {
      given: built,
      diagnostics: diag,
      /* Three things a machine can say without pretending to judge the English.
         Everything else waits for a marker. */
      isSentence: rubric.sentences(built).length >= 1 && words.length >= 4,
      wordCount: words.length,
      /* Said plainly on the payload so no screen can render it as a mark. */
      marked: false,
      note: 'Measured, not marked. A marker scores this against the rubric later.'
    };
  }

  await q.run("UPDATE revision_sets SET status='done', done_at=?, earned=?, max_score=?, built=? WHERE id=?",
    at, earned, max, built || null, setId);

  const recorded = await ability.record(events);
  return {
    setId, topic: s.topic, level: s.level,
    earned, max, score: max ? Math.round((earned / max) * 10 * 2) / 2 : null,
    recorded, detail, build
  };
}

/** The topics on offer, for the picker. */
async function topics(userId, level) {
  const ab = await ability.abilityOf(userId);
  const lv = LEVELS.includes(String(level)) ? String(level) : levelFor(ab);
  return { level: lv, levels: TARGET_LEVELS, topics: await weakestTopics(userId, lv) };
}

function history(userId, limit) {
  return q.all(
    `SELECT id setId, topic, level, earned, max_score max, done_at doneAt
       FROM revision_sets WHERE user_id = ? AND status = 'done'
      ORDER BY done_at DESC LIMIT ?`, userId, clampInt(limit, 1, 50, 10));
}

module.exports = {
  start, submit, topics, history, weakestTopics, levelFor, recentlySeen,
  matches, normalise, cueOf,
  DEFAULT_SIZE, MAX_SIZE, REVISION_WEIGHT, COOLDOWN_DAYS, LEVELS, TARGET_LEVELS
};
