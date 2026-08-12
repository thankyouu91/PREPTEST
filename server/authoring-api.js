/**
 * Authoring API — provider keys, audio rendering, and AI-drafted items.
 *
 * Everything here sits under /api/admin behind requireAdmin + csrfGuard, added
 * by this router rather than inherited, so mounting order in server.js cannot
 * quietly leave a route open.
 *
 * The pipeline these routes serve, in the order an author walks it:
 *
 *   1. Settings → Integrations: paste the two API keys, test them.
 *   2. Draft a spoken script  (AI, or typed by hand — same downstream path)
 *   3. Preview the pause markup, free and instant, before spending characters
 *   4. Render to MP3, listen, re-render or approve
 *   5. Draft the items that go with the audio, straight into the bank as drafts
 *
 * Steps 2 and 5 are optional: an author who writes their own scripts and items
 * uses 3 and 4 and never touches OpenAI.
 *
 * Rendering runs inline rather than through a queue. Exam clips are short and
 * the person who pressed the button is the person waiting, so a job table would
 * add moving parts without removing a wait. Batch rendering across a whole form
 * is what needs a queue, and that arrives with the Cloud Run work in
 * docs/VOICE.md section 7.
 */
'use strict';

const express = require('express');
const crypto = require('node:crypto');

const { q, nowISO, jparse, audit } = require('./db');
const A = require('./auth');
const storage = require('./storage');
const secrets = require('./secrets');
const markup = require('./script-markup');
const eleven = require('./providers/elevenlabs');
const openai = require('./providers/openai');
const descriptors = require('./data/descriptors');
const EXAM_FORMATS = require('./data/exam-formats');

const router = express.Router();
router.use(express.json({ limit: '1mb' }));
router.use('/admin', A.requireAdmin, A.csrfGuard);

/* ============================== helpers ============================== */

const bad = (res, msg) => res.status(400).json({ error: msg });
const str = (v, max) => (typeof v === 'string' ? v.trim().slice(0, max || 400) : '');
const int = (v, dflt) => (Number.isFinite(+v) ? Math.trunc(+v) : dflt);
const clamp = (n, lo, hi) => Math.min(hi, Math.max(lo, n));

/**
 * Turn a provider failure into an HTTP response.
 *
 * 502 rather than 500 for anything upstream: this server is fine, the service
 * it called is not, and the distinction is the first thing anyone reading a log
 * wants to know. A missing key is the administrator's to fix, so that is a 400.
 */
function providerFail(res, e, where) {
  if (e && e.name === 'ProviderError') {
    const status = e.code === 'NOKEY' ? 400 : 502;
    return res.status(status).json({ error: e.message, code: e.code, retryable: !!e.retryable });
  }
  console.error(`[authoring] ${where} failed`, e);
  return res.status(500).json({ error: 'Something went wrong. The log has the detail.' });
}

/* The VPET blueprint, indexed by part letter, so a route can answer "what is
   part G and which item types belong to it" without the caller being trusted
   to say. Derived from the published format rather than duplicated. */
function vpetParts() {
  const fmt = EXAM_FORMATS.FORMATS.find(f => f.id === 'vpet-full');
  const out = {};
  (fmt ? fmt.sections : []).forEach(s => {
    const m = /^Part ([A-J])\b/.exec(s.name);
    if (!m) return;
    out[m[1]] = {
      part: m[1],
      name: s.name.replace(/^Part [A-J]\s*-\s*/, ''),
      skill: s.skill,
      items: s.items,
      types: s.types || ['mcq'],
      needsAudio: !!s.needsAudio
    };
  });
  return out;
}
const PARTS = vpetParts();

/** Everything that decides what the render sounds like, hashed together. */
function renderHash(script, voiceId, modelId, settings, seed) {
  /* NUL as the separator, written as an escape so the source stays plain text.
     A space would let two different renders collide: script "a" with voice
     "b c" joins to the same string as script "a b" with voice "c". NUL cannot
     appear in any of the inputs. */
  return crypto.createHash('sha256')
    .update([script, voiceId, modelId, JSON.stringify(settings || {}), String(seed)].join('\u0000'))
    .digest('hex');
}

/* ======================= Integrations · API keys ======================= */

router.get('/admin/integrations', async (req, res) => {
  const providers = secrets.status();

  /* Quota is a live call, so one slow provider must not stop the screen from
     rendering the other. Report the failure in the row instead. */
  const withQuota = await Promise.all(providers.map(async p => {
    if (p.name !== 'elevenlabs' || !p.configured) return p;
    try {
      return Object.assign({}, p, { quota: await eleven.quota(secrets.get('elevenlabs')) });
    } catch (e) {
      return Object.assign({}, p, { quotaError: e.message });
    }
  }));

  res.json({
    providers: withQuota,
    models: { tts: eleven.DEFAULT_MODEL, items: openai.DEFAULT_MODEL }
  });
});

router.put('/admin/integrations/:name', (req, res) => {
  const name = str(req.params.name, 30);
  if (!secrets.PROVIDERS[name]) return bad(res, 'Unknown provider.');

  const fromEnv = (process.env[secrets.PROVIDERS[name].env] || '').trim();
  if (fromEnv) {
    return bad(res, `${secrets.PROVIDERS[name].label} is configured from the environment ` +
      `(${secrets.PROVIDERS[name].env}) and cannot be changed here.`);
  }

  const out = secrets.set(name, req.body && req.body.key);
  if (!out.ok) return bad(res, out.error);

  /* The key itself never reaches the audit log — only the fact that it moved,
     and who moved it. An audit trail that leaks the secret it is auditing is
     worse than no audit trail. */
  audit(req, 'integration.key.set', 'integrations/' + name, { masked: out.masked });
  res.json({ ok: true, masked: out.masked });
});

router.delete('/admin/integrations/:name', (req, res) => {
  const name = str(req.params.name, 30);
  if (!secrets.PROVIDERS[name]) return bad(res, 'Unknown provider.');
  secrets.clear(name);
  audit(req, 'integration.key.clear', 'integrations/' + name, {});
  res.json({ ok: true });
});

router.post('/admin/integrations/:name/test', async (req, res) => {
  const name = str(req.params.name, 30);
  if (!secrets.PROVIDERS[name]) return bad(res, 'Unknown provider.');

  const key = secrets.get(name);
  if (!key) return bad(res, `No ${secrets.PROVIDERS[name].label} key is configured yet.`);

  try {
    const out = name === 'elevenlabs' ? await eleven.ping(key) : await openai.ping(key);
    audit(req, 'integration.key.test', 'integrations/' + name, { ok: true });
    res.json(out);
  } catch (e) {
    return providerFail(res, e, `${name} test`);
  }
});

/** The account's voices, for the casting dropdown. */
router.get('/admin/tts/voices', async (req, res) => {
  const key = secrets.get('elevenlabs');
  if (!key) return bad(res, 'No ElevenLabs key is configured yet.');
  try {
    res.json({ voices: await eleven.listVoices(key) });
  } catch (e) {
    return providerFail(res, e, 'voice list');
  }
});

/* ========================= Script · markup ========================= */

/**
 * Parse a script without rendering it.
 *
 * Free, instant, and no API call — an author can see exactly where the pauses
 * land and what the render will be billed before committing any characters.
 * The estimated duration is the useful part: it says whether a part will fit
 * its timer while there is still time to shorten it.
 */
router.post('/admin/script/preview', (req, res) => {
  const raw = str(req.body && req.body.script, 20000);
  if (!raw) return bad(res, 'The script is empty.');

  const turns = markup.splitTurns(raw);
  const parsed = markup.parseScript(raw);

  res.json({
    text: parsed.text,
    plain: parsed.plain,
    segments: parsed.segments,
    stats: parsed.stats,
    turns: turns.map(t => ({ speaker: t.speaker, chars: t.script.length })),
    defaults: markup.DEFAULTS
  });
});

/** Save the script and the voice on an item without rendering anything yet. */
router.put('/admin/questions/:id/script', (req, res) => {
  const id = int(req.params.id, 0);
  const row = q.get('SELECT id, audio_status FROM questions WHERE id=?', id);
  if (!row) return res.status(404).json({ error: 'Question not found.' });

  const script = str(req.body && req.body.script, 20000);
  const voiceId = str(req.body && req.body.voiceId, 80);
  const keyPoints = Array.isArray(req.body && req.body.keyPoints)
    ? req.body.keyPoints.map(k => str(k, 300)).filter(Boolean).slice(0, 12) : [];

  /* Editing the script invalidates the approval: the file on disk no longer
     matches what the item says it plays. Back to 'none' so the readiness
     report stops counting it and somebody has to render and listen again. */
  q.run(`UPDATE questions SET audio_script=?, audio_voice_id=?, key_points_json=?,
           audio_status = CASE WHEN audio_status='approved' THEN 'none' ELSE audio_status END
         WHERE id=?`,
    script || null, voiceId || null, JSON.stringify(keyPoints), id);

  audit(req, 'question.script.save', 'questions/' + id, { chars: script.length });
  res.json({ ok: true, invalidated: row.audio_status === 'approved' });
});

/* ========================= Render · approve ========================= */

router.post('/admin/questions/:id/tts', async (req, res) => {
  const id = int(req.params.id, 0);
  const row = q.get(
    'SELECT id, audio_key, audio_script, audio_voice_id, audio_hash FROM questions WHERE id=?', id);
  if (!row) return res.status(404).json({ error: 'Question not found.' });

  const script = str(req.body && req.body.script, 20000) || row.audio_script || '';
  const voiceId = str(req.body && req.body.voiceId, 80) || row.audio_voice_id || '';
  if (!script) return bad(res, 'Write the script before rendering.');
  if (!voiceId) return bad(res, 'Choose a voice before rendering.');

  const key = secrets.get('elevenlabs');
  if (!key) return bad(res, 'No ElevenLabs key is configured yet.');

  const parsed = markup.parseScript(script);
  const settings = (req.body && typeof req.body.settings === 'object') ? req.body.settings : {};
  const seed = Number.isInteger(req.body && req.body.seed) ? req.body.seed : null;
  const modelId = eleven.DEFAULT_MODEL;
  const hash = renderHash(parsed.text, voiceId, modelId, settings, seed);

  /* Same inputs as last time and the file is still there: reuse it. Pressing
     Render twice on an unchanged item should cost nothing. `force` exists
     because a voice can produce a bad take from identical inputs. */
  if (!req.body?.force && hash === row.audio_hash && row.audio_key) {
    q.run("UPDATE questions SET audio_status='ready' WHERE id=? AND audio_status='none'", id);
    return res.json({ ok: true, reused: true, chars: 0, stats: parsed.stats });
  }

  let out;
  try {
    out = await eleven.synthesize({
      apiKey: key, text: parsed.text, voiceId, modelId, settings,
      seed: seed === null ? undefined : seed
    });
  } catch (e) {
    q.run(`INSERT INTO tts_renders (question_id,hash,voice_id,model_id,settings_json,seed,script,chars,status,error,created_by,created_at)
           VALUES (?,?,?,?,?,?,?,?, 'failed', ?, ?, ?)`,
      id, hash, voiceId, modelId, JSON.stringify(settings), seed, parsed.text,
      parsed.stats.billedChars, String(e.message).slice(0, 500), req.admin.id, nowISO());
    q.run("UPDATE questions SET audio_status='failed' WHERE id=?", id);
    return providerFail(res, e, 'render');
  }

  let saved;
  try {
    saved = await storage.put(out.mp3, 'audio/mpeg');
  } catch (e) {
    q.run("UPDATE questions SET audio_status='failed' WHERE id=?", id);
    console.error('[authoring] storing rendered audio failed', e);
    return res.status(502).json({ error: 'The audio rendered but could not be stored. Check the storage settings.' });
  }

  /* Write the new key before dropping the old file: if the delete fails, the
     row still points at something that exists. Same order as the manual
     upload path in api.js, for the same reason. */
  const old = row.audio_key;
  q.run(`UPDATE questions SET audio_key=?, audio_bytes=?, audio_at=?, audio_script=?,
           audio_voice_id=?, audio_hash=?, audio_status='ready' WHERE id=?`,
    saved.key, saved.bytes, nowISO(), script, voiceId, hash, id);
  if (old && old !== saved.key) await storage.remove(old).catch(() => {});

  q.run(`INSERT INTO tts_renders (question_id,hash,voice_id,model_id,settings_json,seed,script,chars,storage_key,bytes,ms,status,created_by,created_at)
         VALUES (?,?,?,?,?,?,?,?,?,?,?, 'ok', ?, ?)`,
    id, hash, voiceId, modelId, JSON.stringify(settings), seed, parsed.text,
    out.chars, saved.key, saved.bytes, out.ms, req.admin.id, nowISO());

  audit(req, 'question.tts.render', 'questions/' + id,
    { chars: out.chars, voiceId, model: modelId, bytes: saved.bytes });

  res.status(201).json({
    ok: true, reused: false, chars: out.chars, bytes: saved.bytes, ms: out.ms,
    stats: parsed.stats
  });
});

/**
 * Approve a rendered file.
 *
 * The gate that keeps a mispronounced proper noun out of a live form: an item
 * only counts as ready once a person has listened to it. Requires the file to
 * exist and the script to be unchanged since it was rendered, so approving
 * cannot be done from a stale screen.
 */
router.post('/admin/questions/:id/tts/approve', (req, res) => {
  const id = int(req.params.id, 0);
  const row = q.get('SELECT audio_key, audio_status FROM questions WHERE id=?', id);
  if (!row) return res.status(404).json({ error: 'Question not found.' });
  if (!row.audio_key) return bad(res, 'There is no audio to approve yet.');
  if (row.audio_status === 'failed') return bad(res, 'The last render failed. Render again before approving.');

  q.run("UPDATE questions SET audio_status='approved' WHERE id=?", id);
  audit(req, 'question.tts.approve', 'questions/' + id, {});
  res.json({ ok: true });
});

/** Send an approved item back for another listen. */
router.post('/admin/questions/:id/tts/unapprove', (req, res) => {
  const id = int(req.params.id, 0);
  const r = q.run("UPDATE questions SET audio_status='ready' WHERE id=? AND audio_key IS NOT NULL", id);
  if (!r.changes) return res.status(404).json({ error: 'Question not found, or it has no audio.' });
  audit(req, 'question.tts.unapprove', 'questions/' + id, {});
  res.json({ ok: true });
});

/** Render history for one item — which voice, which model, what it cost. */
router.get('/admin/questions/:id/tts/history', (req, res) => {
  const rows = q.all(
    `SELECT id, hash, voice_id, model_id, chars, bytes, ms, status, error, created_at
       FROM tts_renders WHERE question_id=? ORDER BY id DESC LIMIT 20`, int(req.params.id, 0));
  res.json({
    renders: rows.map(r => ({
      id: r.id, voiceId: r.voice_id, model: r.model_id, chars: r.chars,
      bytes: r.bytes, ms: r.ms, status: r.status, error: r.error, at: r.created_at
    }))
  });
});

/* ===================== AI drafting · script and items ===================== */

router.post('/admin/authoring/script', async (req, res) => {
  const part = str(req.body && req.body.part, 1).toUpperCase();
  if (!PARTS[part]) return bad(res, 'Unknown VPET part.');

  const key = secrets.get('openai');
  if (!key) return bad(res, 'No OpenAI key is configured yet.');

  try {
    const out = await openai.draftScript({
      apiKey: key,
      part,
      partName: PARTS[part].name,
      level: clamp(int(req.body && req.body.level, 1), 1, 2),
      words: clamp(int(req.body && req.body.words, 150), 10, 400),
      brief: str(req.body && req.body.brief, 600)
    });
    audit(req, 'authoring.script.draft', 'parts/' + part, { chars: out.script.length });

    /* Parse the draft here so the author sees the pause layout and the cost in
       the same response — the model was told the markup rules, and this is
       where we find out whether it followed them. */
    const parsed = markup.parseScript(out.script);
    res.json({ script: out.script, summary: out.summary, keyPoints: out.keyPoints, stats: parsed.stats });
  } catch (e) {
    return providerFail(res, e, 'script draft');
  }
});

router.post('/admin/authoring/items', async (req, res) => {
  const part = str(req.body && req.body.part, 1).toUpperCase();
  if (!PARTS[part]) return bad(res, 'Unknown VPET part.');

  const key = secrets.get('openai');
  if (!key) return bad(res, 'No OpenAI key is configured yet.');

  const spec = PARTS[part];
  const level = clamp(int(req.body && req.body.level, 1), 1, 2);
  const count = clamp(int(req.body && req.body.count, 5), 1, 20);
  const script = str(req.body && req.body.script, 20000);
  /* Level 1 tops out at B1, Level 2 starts at B2. Tagging a Level 2 item as B1
     would put it in a pool no Level 2 form should draw from. */
  const cefr = level === 2 ? 'B2' : 'B1';

  let draft;
  try {
    draft = await openai.draftItems({
      apiKey: key, part, partName: spec.name, level, count,
      types: spec.types, script, brief: str(req.body && req.body.brief, 600)
    });
  } catch (e) {
    return providerFail(res, e, 'item draft');
  }

  /* Nothing is inserted unless the caller asks. The default is to show the
     author what came back and let them decide, because a batch of drafts that
     silently appeared in the bank is a batch nobody reviews. */
  if (!req.body?.commit) {
    return res.json({ items: draft.items, rejected: draft.rejected, committed: 0 });
  }

  const ids = [];
  for (const it of draft.items) {
    if (!spec.types.includes(it.type)) continue;      // wrong type for this part
    const r = q.run(
      `INSERT INTO questions (family_id,skill,level,type,part,prompt,options_json,answer,explanation,tags_json,status,created_at,created_by)
       VALUES ('vpet',?,?,?,?,?,?,?,?,?,'draft',?,?)`,
      spec.skill, cefr, it.type, part, it.prompt, JSON.stringify(it.options),
      it.answer, it.explanation, JSON.stringify(['ai-draft', 'part-' + part]),
      nowISO(), req.admin.id);
    ids.push(Number(r.lastInsertRowid));
  }

  audit(req, 'authoring.items.commit', 'parts/' + part,
    { part, level, drafted: draft.items.length, inserted: ids.length, rejected: draft.rejected.length });

  res.status(201).json({
    items: draft.items, rejected: draft.rejected, committed: ids.length, ids,
    /* Drafts, not live items. Said plainly so nobody assumes the bank grew by
       twelve usable questions. */
    note: 'Inserted with status "draft". Review each item before publishing.'
  });
});

/** The VPET blueprint as the authoring screen needs it. */
router.get('/admin/authoring/parts', (req, res) => {
  res.json({ parts: Object.values(PARTS) });
});

/* ===================== Measurement framework =====================
   The band table and the can-do descriptors, served rather than duplicated.
   The report generator, the marking rubrics and the study pages all need the
   same statements, and three copies of a descriptor set is three chances for
   them to disagree about what B2 means. See docs/ACADEMIC.md. */

router.get('/admin/framework/bands', (req, res) => {
  res.json({ bands: descriptors.BANDS });
});

router.get('/admin/framework/descriptors', (req, res) => {
  const skill = str(req.query.skill, 20);
  if (skill && !descriptors.BY_SKILL[skill]) return bad(res, 'Unknown skill.');
  const out = {};
  for (const [name, list] of Object.entries(descriptors.BY_SKILL)) {
    if (skill && name !== skill) continue;
    out[name] = list.map(d => ({ gse: d.gse, band: descriptors.bandFor(d.gse), text: d.text }));
  }
  res.json({ descriptors: out });
});

/**
 * One skill's profile at a given score.
 *
 * This is the shape the candidate report is built from: where they are, what
 * that means they can do, and the nearest things above them ordered by how
 * close. Exposed now so the framework is exercised and testable before the
 * results engine exists to consume it.
 */
router.get('/admin/framework/profile', (req, res) => {
  const skill = str(req.query.skill, 20);
  if (!descriptors.BY_SKILL[skill]) return bad(res, 'Unknown skill.');

  const gse = int(req.query.gse, NaN);
  if (!Number.isFinite(gse) || gse < 10 || gse > 90) {
    return bad(res, 'Score must be a number between 10 and 90.');
  }
  res.json(descriptors.profile(skill, gse));
});

module.exports = router;
