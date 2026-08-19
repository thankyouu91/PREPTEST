/**
 * The admin API — everything sits under /api/admin (except the public /api/catalog).
 *
 * Rules:
 * - Every state-changing route: requireAdmin + csrfGuard + an audit entry.
 * - Every query uses bound parameters; no user value is ever concatenated in.
 * - Errors come back as { error } with a sensible HTTP status.
 */
'use strict';
const express = require('express');
const { q, tx, nowISO, jparse, makeCode, audit } = require('./db');
const A = require('./auth');
const EXAM_FORMATS = require('./data/exam-formats');
const storage = require('./storage');
const PLANS = require('./data/plans');
const LINKING = require('./data/linking-words');

const router = express.Router();
router.use(express.json({ limit: '1mb' }));

/* ============================ Helpers ============================ */
const SKILLS = ['listening', 'reading', 'writing', 'speaking'];
const LEVELS = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2'];

/**
 * The CEFR bands a paper at this level may draw items from.
 *
 * VPET is not sat at a CEFR band — it is sat at Level 1 or Level 2, and each
 * covers a range (A1–B1+, B2–C2). An item still carries a CEFR band, because
 * that is its difficulty; the level says which of those bands belong on the
 * paper. Every other family names a band directly, and for them this is just
 * that band.
 *
 * Getting this wrong is not a display bug. A Level 1 paper holding a C1 item
 * is a paper whose result cannot be defended, because nothing else on it can
 * tell B2 from C1.
 */
function levelBands(level) {
  const lv = EXAM_FORMATS.vpetLevel(level);
  return lv ? lv.cefr : [String(level || '').toUpperCase()];
}

/** Is this a level any family recognises — a CEFR band, or a VPET level id? */
const validLevel = level => LEVELS.includes(level) || !!EXAM_FORMATS.vpetLevel(level);
const QTYPES = ['mcq', 'gap', 'essay', 'speaking'];
const STATUSES = ['draft', 'published', 'archived'];

const bad = (res, msg) => res.status(400).json({ error: msg });
const str = (v, max) => (typeof v === 'string' ? v.trim().slice(0, max || 400) : '');
const int = (v, dflt) => (Number.isFinite(+v) ? Math.trunc(+v) : dflt);
const clamp = (n, lo, hi) => Math.min(hi, Math.max(lo, n));
const slug = s => str(s, 60).toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')
  .replace(/đ/g, 'd').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
const daysAgoISO = n => new Date(Date.now() - n * 86400000).toISOString();

function familyExists(id) { return !!q.val('SELECT 1 FROM families WHERE id=?', id); }

/** Describe in words what a code unlocks */
function unlockLabel(type, ref) {
  if (type === 'test') {
    const t = q.get('SELECT title FROM tests WHERE id=?', ref);
    return t ? t.title : 'Test ' + ref;
  }
  if (type === 'family') {
    const f = q.get('SELECT name FROM families WHERE id=?', ref);
    return 'All of ' + (f ? f.name : ref);
  }
  const names = String(ref).split(',').map(id => {
    const f = q.get('SELECT name FROM families WHERE id=?', id);
    return f ? f.name : id;
  });
  return 'Combo ' + names.join(' + ');
}

/* ======================= Admin sign-in ======================= */
router.post('/admin/login', (req, res) => {
  const username = str(req.body && req.body.username, 60);
  const password = typeof (req.body && req.body.password) === 'string' ? req.body.password : '';
  if (!username || !password) return bad(res, 'Enter a username and a password.');

  const key = A.throttleKey(req, username);
  const lockedFor = A.isLocked(key);
  if (lockedFor) {
    return res.status(429).json({
      error: 'Too many failed attempts. Try again in ' + Math.ceil(lockedFor / 60) + ' minutes.'
    });
  }

  const admin = q.get('SELECT * FROM admins WHERE username=? AND active=1', username);
  // Still hash once when no account is found, so response time gives nothing away
  const ok = admin ? A.verifyPassword(password, admin.pass_hash)
                   : A.verifyPassword(password, A.hashPassword('does-not-exist'));
  if (!admin || !ok) {
    A.noteFailure(key);
    audit({ ip: req.ip }, 'admin.login.failed', 'admins/' + username, {});
    return res.status(401).json({ error: 'That username or password is not right.' });
  }

  A.clearFailures(key);
  A.createSession(admin.id, req, res);
  q.run('UPDATE admins SET last_login_at=? WHERE id=?', nowISO(), admin.id);
  audit({ admin, ip: req.ip }, 'admin.login', 'admins/' + admin.username, {});
  res.json({ ok: true, admin: { username: admin.username, name: admin.name, role: admin.role } });
});

router.post('/admin/logout', A.csrfGuard, (req, res) => {
  const admin = A.currentAdmin(req);
  if (admin) audit({ admin, ip: req.ip }, 'admin.logout', 'admins/' + admin.username, {});
  A.destroySession(req, res);
  res.json({ ok: true });
});

router.get('/admin/me', (req, res) => {
  const admin = A.currentAdmin(req);
  if (!admin) return res.status(401).json({ error: 'Not signed in.' });
  res.json({ admin });
});

/* Everything below here needs a signed-in admin + CSRF */
router.use('/admin', A.requireAdmin, A.csrfGuard);

/* ============================ REPORTS ============================
   The management dashboard. Beyond the raw figures it returns the three things a
   manager actually needs in order to decide something:
   - kpi:    this period's number NEXT TO the previous period of the same length,
             with the percentage change. A number on its own says nothing.
   - funnel: registered → verified → code activated → still active, so it is clear
             where people are falling out.
   - todo:   what needs doing, ordered by urgency. This is what turns a reporting
             page into a page you run the place from.                            */
router.get('/admin/reports', (req, res) => {
  // The window: only 7, 30 and 90 are accepted, so nobody types ?days=100000 and strains the database
  const days = [7, 30, 90].includes(int(req.query.days, 30)) ? int(req.query.days, 30) : 30;
  const from = daysAgoISO(days);
  const prevFrom = daysAgoISO(days * 2);
  const hnay = nowISO().slice(0, 10);
  const sau7ngay = new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 10);

  /* One metric = this period's value + the previous one + the percentage change.
     delta is null when the previous period was 0, because "up infinitely" is not information. */
  const kpiOf = (sql, ...args) => {
    const value = q.val(sql, from, nowISO(), ...args) || 0;
    const prev = q.val(sql, prevFrom, from, ...args) || 0;
    return { value, prev, delta: prev ? Math.round(((value - prev) / prev) * 100) : null };
  };

  const kpi = {
    users: kpiOf('SELECT COUNT(*) c FROM users WHERE created_at >= ? AND created_at < ?'),
    redeems: kpiOf('SELECT COUNT(*) c FROM codes WHERE redeemed_at >= ? AND redeemed_at < ?'),
    revenue: kpiOf("SELECT COALESCE(SUM(amount),0) s FROM orders WHERE status='paid' AND created_at >= ? AND created_at < ?"),
    orders: kpiOf("SELECT COUNT(*) c FROM orders WHERE status='paid' AND created_at >= ? AND created_at < ?")
  };

  /* The student funnel — cumulative state, not bounded by the period. Percentages
     are of the first step, to show total attrition rather than step-on-step.

     Each step must be a SUBSET of the one before, or a later bar grows again and the
     funnel shape stops meaning anything. That is why the last step is "activated a
     code AND signed in recently" rather than everyone who signed in recently — people
     with no code can sign in too, so that figure does not sit under step three. */
  const fTong = q.val('SELECT COUNT(*) c FROM users');
  const fXacThuc = q.val('SELECT COUNT(*) c FROM users WHERE verified=1');
  const fKichHoat = q.val(
    "SELECT COUNT(DISTINCT c.user_id) c FROM codes c JOIN users u ON u.id = c.user_id" +
    " WHERE c.status='redeemed' AND u.verified=1");
  const fHoatDong = q.val(
    "SELECT COUNT(DISTINCT c.user_id) c FROM codes c JOIN users u ON u.id = c.user_id" +
    " WHERE c.status='redeemed' AND u.verified=1 AND u.last_login_at >= ?", daysAgoISO(30));
  const funnel = [
    { key: 'registered', label: 'Registered', value: fTong },
    { key: 'verified', label: 'Email verified', value: fXacThuc },
    { key: 'redeemed', label: 'Code activated', value: fKichHoat },
    { key: 'active', label: 'Still studying within 30 days', value: fHoatDong }
  ].map(s => ({ ...s, rate: fTong ? Math.round((s.value / fTong) * 100) : 0 }));

  const d7 = daysAgoISO(7), d30 = daysAgoISO(30);

  const users = {
    total: q.val('SELECT COUNT(*) c FROM users'),
    new7: q.val('SELECT COUNT(*) c FROM users WHERE created_at >= ?', d7),
    new30: q.val('SELECT COUNT(*) c FROM users WHERE created_at >= ?', d30),
    verified: q.val('SELECT COUNT(*) c FROM users WHERE verified=1'),
    locked: q.val("SELECT COUNT(*) c FROM users WHERE status='locked'")
  };
  const codes = {
    total: q.val('SELECT COUNT(*) c FROM codes'),
    unused: q.val("SELECT COUNT(*) c FROM codes WHERE status='unused'"),
    redeemed: q.val("SELECT COUNT(*) c FROM codes WHERE status='redeemed'"),
    revoked: q.val("SELECT COUNT(*) c FROM codes WHERE status='revoked'"),
    expired: q.val("SELECT COUNT(*) c FROM codes WHERE status='unused' AND expires_at IS NOT NULL AND expires_at < ?", nowISO().slice(0, 10)),
    redeemed7: q.val("SELECT COUNT(*) c FROM codes WHERE redeemed_at >= ?", d7)
  };
  const content = {
    tests: q.val('SELECT COUNT(*) c FROM tests'),
    published: q.val("SELECT COUNT(*) c FROM tests WHERE status='published'"),
    draft: q.val("SELECT COUNT(*) c FROM tests WHERE status='draft'"),
    questions: q.val("SELECT COUNT(*) c FROM questions WHERE status='active'"),
    families: q.val('SELECT COUNT(*) c FROM families')
  };
  const revenue = {
    total: q.val("SELECT COALESCE(SUM(amount),0) s FROM orders WHERE status='paid'"),
    d30: q.val("SELECT COALESCE(SUM(amount),0) s FROM orders WHERE status='paid' AND created_at >= ?", d30),
    orders30: q.val("SELECT COUNT(*) c FROM orders WHERE created_at >= ?", d30)
  };

  // A daily series across the chosen window: new users, codes activated, revenue
  const series = [];
  for (let i = days - 1; i >= 0; i--) {
    const day = new Date(Date.now() - i * 86400000).toISOString().slice(0, 10);
    series.push({
      day,
      users: q.val('SELECT COUNT(*) c FROM users WHERE substr(created_at,1,10)=?', day),
      redeems: q.val('SELECT COUNT(*) c FROM codes WHERE substr(redeemed_at,1,10)=?', day),
      revenue: q.val("SELECT COALESCE(SUM(amount),0) s FROM orders WHERE status='paid' AND substr(created_at,1,10)=?", day)
    });
  }

  const byFamily = q.all(`
    SELECT f.id, f.name, f.status,
           (SELECT COUNT(*) FROM tests t WHERE t.family_id=f.id) tests,
           (SELECT COUNT(*) FROM tests t WHERE t.family_id=f.id AND t.status='published') published,
           (SELECT COUNT(*) FROM questions qq WHERE qq.family_id=f.id AND qq.status='active') questions,
           (SELECT COUNT(*) FROM codes c WHERE c.unlock_type='family' AND c.unlock_ref=f.id AND c.status='redeemed') unlocks,
           (SELECT COUNT(*) FROM users u WHERE u.interests_json LIKE '%"' || f.id || '"%') interested
      FROM families f ORDER BY f.sort`);

  const bankGaps = q.all(`
    SELECT f.name family, s.skill, s.level, s.need, COALESCE(b.have,0) have
      FROM (SELECT DISTINCT t.family_id fid, se.skill skill, t.level level,
                   CASE se.skill WHEN 'writing' THEN 2 WHEN 'speaking' THEN 3 ELSE 20 END need
              FROM sections se JOIN tests t ON t.id = se.test_id) s
      JOIN families f ON f.id = s.fid
      LEFT JOIN (SELECT family_id, skill, level, COUNT(*) have FROM questions
                  WHERE status='active' GROUP BY family_id, skill, level) b
        ON b.family_id = s.fid AND b.skill = s.skill AND b.level = s.level
     WHERE COALESCE(b.have,0) < s.need
     ORDER BY (s.need - COALESCE(b.have,0)) DESC LIMIT 8`);

  const recent = q.all(
    'SELECT admin_name, action, target, at FROM audit ORDER BY id DESC LIMIT 8');

  /* Revenue by plan within the period. Grouped by package_id; an order with no plan
     attached (issued by hand) is grouped by its own name so it stays visible. */
  const revenueByPackage = q.all(`
    SELECT COALESCE(p.name, o.name) name,
           COUNT(*) orders,
           COALESCE(SUM(o.amount),0) amount
      FROM orders o LEFT JOIN packages p ON p.id = o.package_id
     WHERE o.status='paid' AND o.created_at >= ?
     GROUP BY COALESCE(o.package_id, o.name)
     ORDER BY amount DESC LIMIT 8`, from);

  /* ---- What needs doing ----
     Ordered by urgency: high is losing money or losing students right now, medium is
     something that becomes a problem if left, low is tidying up. Each entry carries a
     link to the screen that deals with it, so nobody has to go looking. */
  const todo = [];

  /* Only families that are actually open for business. A parked one having no
     published test is the intended state, not a problem to chase. */
  const thieuDe = byFamily.filter(f => f.status !== 'coming_soon' && f.interested > 0 && f.published === 0);
  if (thieuDe.length) {
    todo.push({
      sev: 'cao',
      title: 'People are interested but there is nothing to sell them',
      detail: thieuDe.map(f => f.name + ' (' + f.interested + ' following)').join(' · '),
      href: '/admin/format/', cta: 'Generate', count: thieuDe.length
    });
  }

  const hetHan = q.val(
    "SELECT COUNT(*) c FROM codes WHERE status='unused' AND expires_at IS NOT NULL AND expires_at >= ? AND expires_at <= ?",
    hnay, sau7ngay);
  if (hetHan) {
    todo.push({
      sev: 'cao',
      title: 'Codes expiring within 7 days',
      detail: hetHan + ' unused codes will expire; extend them or issue replacements.',
      href: '/admin/code/', cta: 'Xem code', count: hetHan
    });
  }

  if (content.draft) {
    todo.push({
      sev: 'vua',
      title: 'Draft tests not yet published',
      detail: content.draft + ' tests are built but students cannot see them.',
      href: '/admin/de-thi/', cta: 'View tests', count: content.draft
    });
  }

  if (bankGaps.length) {
    const thieuTong = bankGaps.reduce((a, g) => a + (g.need - g.have), 0);
    todo.push({
      sev: 'vua',
      title: 'The question bank is short',
      detail: bankGaps.length + ' gaps, ' + thieuTong + ' items in total.',
      href: '/admin/ngan-hang/', cta: 'Top up', count: bankGaps.length
    });
  }

  const treoXacThuc = q.val(
    'SELECT COUNT(*) c FROM users WHERE verified=0 AND created_at < ?', d7);
  if (treoXacThuc) {
    todo.push({
      sev: 'thap',
      title: 'Students registered but never verified their email',
      detail: treoXacThuc + ' accounts have gone 7 days without verifying.',
      href: '/admin/hoc-vien/', cta: 'View students', count: treoXacThuc
    });
  }

  if (users.locked) {
    todo.push({
      sev: 'thap',
      title: 'Locked accounts',
      detail: users.locked + ' accounts cannot sign in.',
      href: '/admin/hoc-vien/', cta: 'View students', count: users.locked
    });
  }

  res.json({
    period: { days, from, prevFrom },
    kpi, funnel, todo, revenueByPackage,
    users, codes, content, revenue, series, byFamily, bankGaps, recent
  });
});

/* ====================== THE QUESTION BANK ====================== */
router.get('/admin/questions', (req, res) => {
  const where = ["status != 'deleted'"];
  const args = [];
  const add = (cond, v) => { where.push(cond); args.push(v); };

  if (req.query.family) add('family_id = ?', str(req.query.family, 20));
  if (req.query.skill) add('skill = ?', str(req.query.skill, 20));
  if (req.query.level) add('level = ?', str(req.query.level, 5));
  if (req.query.type) add('type = ?', str(req.query.type, 20));
  if (req.query.status) add('status = ?', str(req.query.status, 20));
  if (req.query.q) add('prompt LIKE ?', '%' + str(req.query.q, 80) + '%');
  /* part=none finds the items that still have no letter — the pile an admin has
     to work through before a VPET test can be generated at all. */
  if (req.query.part === 'none') where.push('part IS NULL');
  else if (req.query.part) add('part = ?', str(req.query.part, 2).toUpperCase());

  const limit = clamp(int(req.query.limit, 30), 1, 200);
  const offset = clamp(int(req.query.offset, 0), 0, 1e6);
  const sql = 'FROM questions WHERE ' + where.join(' AND ');
  const total = q.val('SELECT COUNT(*) c ' + sql, ...args);
  const rows = q.all(
    `SELECT id, family_id, skill, level, type, part, prompt, options_json, answer, explanation, tags_json, status, created_at,
            audio_key, audio_bytes, audio_at, audio_script, audio_status, audio_voice_id, passage
       ${sql} ORDER BY id DESC LIMIT ? OFFSET ?`, ...args, limit, offset);

  res.json({
    total, limit, offset,
    items: rows.map(r => ({
      id: r.id, familyId: r.family_id, skill: r.skill, level: r.level, type: r.type,
      part: r.part || null,
      prompt: r.prompt, options: jparse(r.options_json, []), answer: r.answer,
      explanation: r.explanation, tags: jparse(r.tags_json, []), status: r.status, createdAt: r.created_at,
      /* The key itself never leaves the server - the browser only needs to know
         whether a file is attached, and how big it is. */
      hasAudio: !!r.audio_key, audioBytes: r.audio_bytes || 0, audioAt: r.audio_at || null,
      /* The script is the author's source text, not answer material the way the
         rendered audio is, so the bank screen gets it in full. */
      audioScript: r.audio_script || '', audioStatus: r.audio_status || 'none',
      audioVoiceId: r.audio_voice_id || '', part: r.part || null,
      /* Reading matter for parts B and C, kept apart from the prompt because
         part B hides it on a timer while the instruction stays put. */
      passage: r.passage || ''
    }))
  });
});

function readQuestion(body) {
  const familyId = str(body.familyId, 20);
  const skill = str(body.skill, 20);
  const level = str(body.level, 5).toUpperCase();
  const type = str(body.type, 20);
  const prompt = str(body.prompt, 4000);
  if (!familyExists(familyId)) return { err: 'That exam is not valid.' };
  if (!SKILLS.includes(skill)) return { err: 'That skill is not valid.' };
  if (!LEVELS.includes(level)) return { err: 'That level is not valid.' };
  if (!QTYPES.includes(type)) return { err: 'That item type is not valid.' };
  if (prompt.length < 5) return { err: 'The question text is too short.' };

  const options = Array.isArray(body.options) ? body.options.map(o => str(o, 500)).filter(Boolean) : [];
  const answer = str(body.answer, 500);
  if (type === 'mcq') {
    if (options.length < 2) return { err: 'A multiple-choice item needs at least two options.' };
    if (!options.includes(answer)) return { err: 'The answer must be one of the options entered.' };
  }
  const tags = Array.isArray(body.tags) ? body.tags.map(t => str(t, 30)).filter(Boolean).slice(0, 10) : [];

  /* The lettered part, for families whose format has a part table. Validated
     against the blueprint rather than a hardcoded A-J, and cross-checked
     against the skill the part actually tests: a speaking item filed under
     Part C would sit in the pool for a reading part and never be spotted until
     a candidate met it mid-exam. */
  const partsAllowed = EXAM_FORMATS.partsOf(familyId);
  const part = str(body.part, 2).toUpperCase();
  if (part) {
    if (!partsAllowed.length) {
      return { err: 'This exam has no part table to label against.' };
    }
    if (!partsAllowed.includes(part)) {
      return { err: 'That part is not valid. This exam has the parts: ' + partsAllowed.join(', ') + '.' };
    }
    const sec = EXAM_FORMATS.sectionOfPart(familyId, part);
    if (sec && sec.skill !== skill) {
      return { err: 'Part ' + part + ' belongs to the skill ' + sec.skill + ', not ' + skill + '.' };
    }
    if (sec && Array.isArray(sec.types) && sec.types.length && !sec.types.includes(type)) {
      return { err: 'Part ' + part + ' only takes the item types: ' + sec.types.join(', ') + '.' };
    }
  }

  return {
    familyId, skill, level, type, prompt, options, answer,
    part: part || null,
    explanation: str(body.explanation, 2000), tags
  };
}

router.post('/admin/questions', (req, res) => {
  const d = readQuestion(req.body || {});
  if (d.err) return bad(res, d.err);
  const r = q.run(
    `INSERT INTO questions (family_id,skill,level,type,part,prompt,options_json,answer,explanation,tags_json,status,created_at,created_by)
     VALUES (?,?,?,?,?,?,?,?,?,?,'active',?,?)`,
    d.familyId, d.skill, d.level, d.type, d.part, d.prompt, JSON.stringify(d.options), d.answer,
    d.explanation, JSON.stringify(d.tags), nowISO(), req.admin.id);
  audit(req, 'question.create', 'questions/' + r.lastInsertRowid, { family: d.familyId, skill: d.skill, part: d.part });
  res.status(201).json({ id: Number(r.lastInsertRowid) });
});

router.put('/admin/questions/:id', (req, res) => {
  const id = int(req.params.id, 0);
  if (!q.val('SELECT 1 FROM questions WHERE id=?', id)) return res.status(404).json({ error: 'No such question.' });
  const d = readQuestion(req.body || {});
  if (d.err) return bad(res, d.err);
  q.run(`UPDATE questions SET family_id=?, skill=?, level=?, type=?, part=?, prompt=?, options_json=?, answer=?, explanation=?, tags_json=?
          WHERE id=?`,
    d.familyId, d.skill, d.level, d.type, d.part, d.prompt, JSON.stringify(d.options), d.answer,
    d.explanation, JSON.stringify(d.tags), id);
  audit(req, 'question.update', 'questions/' + id, {});
  res.json({ ok: true });
});

/** Withdraw or reinstate a question (never a hard delete, so old tests keep their content) */
router.post('/admin/questions/:id/status', (req, res) => {
  const id = int(req.params.id, 0);
  const status = str(req.body && req.body.status, 20);
  if (!['active', 'retired'].includes(status)) return bad(res, 'That status is not valid.');
  const r = q.run('UPDATE questions SET status=? WHERE id=?', status, id);
  if (!r.changes) return res.status(404).json({ error: 'No such question.' });
  audit(req, 'question.status', 'questions/' + id, { status });
  res.json({ ok: true });
});

/* ==================== Question audio (VPET parts E, F, G, H, J) ====================
   The body arrives as raw bytes rather than multipart: the browser can send a
   File straight through fetch, which means no multipart parser and therefore
   no new dependency. express.json above ignores audio content types, so the
   raw parser here is the first thing to touch the body.

   Both routes sit under the router-wide requireAdmin + csrfGuard. */
const audioBody = express.raw({ type: storage.ACCEPTED_MIME, limit: storage.MAX_BYTES });

router.post('/admin/questions/:id/audio', audioBody, async (req, res) => {
  const id = int(req.params.id, 0);
  const row = q.get('SELECT id, audio_key FROM questions WHERE id=?', id);
  if (!row) return res.status(404).json({ error: 'No such question.' });

  const buf = Buffer.isBuffer(req.body) ? req.body : null;
  const why = storage.validate(buf, req.get('content-type'));
  if (why) return bad(res, why);

  try {
    const saved = await storage.put(buf, req.get('content-type'));
    /* Replacing an existing file: write the new key first, then drop the old
       one. If the delete fails the row still points at a file that exists. */
    const old = row.audio_key;
    /* Uploading a file by hand is its own approval: whoever picked it listened
       to it first. A rendered file is different — nobody has heard that yet. */
    q.run("UPDATE questions SET audio_key=?, audio_bytes=?, audio_at=?, audio_status='approved' WHERE id=?",
      saved.key, saved.bytes, nowISO(), id);
    if (old && old !== saved.key) await storage.remove(old).catch(() => {});
    audit(req, 'question.audio.upload', 'questions/' + id, { bytes: saved.bytes, driver: saved.driver });
    res.status(201).json({ ok: true, bytes: saved.bytes, driver: saved.driver });
  } catch (e) {
    if (e.code === 'INVALID_AUDIO') return bad(res, e.message);
    console.error('[audio] upload failed', e);
    res.status(502).json({ error: 'The audio file could not be saved. Check the storage configuration.' });
  }
});

router.get('/admin/questions/:id/audio', async (req, res) => {
  const row = q.get('SELECT audio_key, audio_bytes FROM questions WHERE id=?', int(req.params.id, 0));
  if (!row || !row.audio_key) return res.status(404).json({ error: 'This question has no audio file.' });
  try {
    const file = await storage.get(row.audio_key);
    res.set('Content-Type', 'audio/mpeg')
      .set('Content-Length', String(file.body.length))
      /* Exam audio must not sit in a shared cache: it is answer material. */
      .set('Cache-Control', 'private, no-store')
      .send(file.body);
  } catch (e) {
    console.error('[audio] read failed', e);
    res.status(502).json({ error: 'The audio file could not be read.' });
  }
});

router.delete('/admin/questions/:id/audio', async (req, res) => {
  const id = int(req.params.id, 0);
  const row = q.get('SELECT audio_key FROM questions WHERE id=?', id);
  if (!row) return res.status(404).json({ error: 'No such question.' });
  if (!row.audio_key) return res.json({ ok: true });
  q.run("UPDATE questions SET audio_key=NULL, audio_bytes=NULL, audio_at=NULL, audio_status='none', audio_hash=NULL WHERE id=?", id);
  await storage.remove(row.audio_key).catch(() => {});
  audit(req, 'question.audio.delete', 'questions/' + id, {});
  res.json({ ok: true });
});

/** Bulk import questions (pasted JSON, or CSV already split up on the client) */
router.post('/admin/questions/bulk', (req, res) => {
  const items = Array.isArray(req.body && req.body.items) ? req.body.items : null;
  if (!items || !items.length) return bad(res, 'There are no questions to import.');
  if (items.length > 500) return bad(res, 'At most 500 items per import.');

  const errors = [];
  const ok = [];
  items.forEach((raw, i) => {
    const d = readQuestion(raw || {});
    if (d.err) errors.push({ row: i + 1, error: d.err }); else ok.push(d);
  });
  if (!ok.length) return res.status(400).json({ error: 'No row was valid.', errors });

  tx(() => {
    const ins = require('./db').db.prepare(
      `INSERT INTO questions (family_id,skill,level,type,part,prompt,options_json,answer,explanation,tags_json,status,created_at,created_by)
       VALUES (?,?,?,?,?,?,?,?,?,?,'active',?,?)`);
    const at = nowISO();
    for (const d of ok) {
      ins.run(d.familyId, d.skill, d.level, d.type, d.part, d.prompt, JSON.stringify(d.options),
        d.answer, d.explanation, JSON.stringify(d.tags), at, req.admin.id);
    }
  });
  audit(req, 'question.bulk', 'questions', { inserted: ok.length, failed: errors.length });
  res.status(201).json({ inserted: ok.length, failed: errors.length, errors: errors.slice(0, 20) });
});

/** A sample CSV file for bulk question import.
 *  Served from the server (rather than built as a blob on the client) so the CSP stays strict. */
router.get('/admin/questions/template.csv', (req, res) => {
  const fam = q.get('SELECT id FROM families ORDER BY sort LIMIT 1');
  const famId = fam ? fam.id : 'ielts';
  /* The phan_thi column is blank for an exam with no part table; for VPET it is required,
     because an item with no letter belongs to no part's pool at all. */
  const rows = [
    'ky_thi,ky_nang,do_kho,dang_cau,phan_thi,noi_dung,phuong_an_1,phuong_an_2,phuong_an_3,phuong_an_4,dap_an,giai_thich',
    `${famId},reading,B1,mcq,,"Choose the word closest in meaning to ""rapid"".",quick,slow,heavy,quiet,quick,"Rapid means fast."`,
    `${famId},listening,B2,gap,,"Listen and type the missing number: The train leaves at ____.",,,,,,`,
    'vpet,reading,B1,mcq,C,"Read the passage and choose the correct statement.",A,B,C,D,A,"A VPET item must name its part: C is Reading Comprehension."',
    'vpet,writing,B1,gap,A,"Type the one missing word: She has lived here ____ 2019.",,,,,since,"Part A is Sentence Completion."'
  ];
  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', 'attachment; filename="mau-cau-hoi.csv"');
  res.send('﻿' + rows.join('\r\n'));   // a BOM so Excel opens the accents correctly
});

/** Count the items available against a set of criteria — the generator uses it to report shortfalls */
router.get('/admin/questions/availability', (req, res) => {
  const family = str(req.query.family, 20);
  const level = str(req.query.level, 5).toUpperCase();
  if (!familyExists(family)) return bad(res, 'That exam is not valid.');
  const rows = q.all(
    `SELECT skill, COUNT(*) exact FROM questions
      WHERE family_id=? AND level=? AND status='active' GROUP BY skill`, family, level);
  const any = q.all(
    `SELECT skill, COUNT(*) total FROM questions
      WHERE family_id=? AND status='active' GROUP BY skill`, family);
  const out = {};
  for (const s of SKILLS) {
    out[s] = {
      exact: (rows.find(r => r.skill === s) || {}).exact || 0,
      total: (any.find(r => r.skill === s) || {}).total || 0
    };
  }
  /* For an exam with a part table, a per-skill total says nothing: 20 Speaking items
     could all belong to part H while I and J are empty. Return each part separately,
     with the count the format needs, so the screen points at the actual gap. */
  const parts = EXAM_FORMATS.partsOf(family).map(letter => {
    const sec = EXAM_FORMATS.sectionOfPart(family, letter) || {};
    const bank = bankCount(family, sec.skill, sec.types, level, letter);
    return {
      part: letter, name: sec.name || letter, skill: sec.skill || '',
      need: sec.items || 0, needsAudio: !!sec.needsAudio,
      exact: bank.exact, total: bank.total,
      short: Math.max(0, (sec.items || 0) - bank.total)
    };
  });
  /* Items with no part yet: they belong to no pool, so they are counted separately
     rather than quietly vanishing from the report. */
  const untagged = EXAM_FORMATS.partsOf(family).length
    ? q.val("SELECT COUNT(*) c FROM questions WHERE family_id=? AND status='active' AND part IS NULL", family)
    : 0;
  res.json({ family, level, availability: out, parts, untagged });
});

/* ======================= STANDARD FORMATS =======================
   Each exam's paper formats, plus an analysis of whether the question bank holds
   enough to generate one. Choosing a format beats typing a blueprint by hand. */

/* One pool definition, used by the counters and by the generator, so what the
   readiness report promises is exactly what the generator can draw from. A
   section that names a lettered part draws only from items carrying that
   letter: skill and type cannot separate parts B and D (both writing essays),
   F and G (both listening multiple choice) or H and J (both spoken answers to
   audio), so without the letter those parts share one pool and an exam gets
   built that looks right and asks the wrong things. */
function poolWhere(familyId, skill, types, part) {
  const t = Array.isArray(types) && types.length ? types.filter(x => QTYPES.includes(x)) : QTYPES;
  const holes = t.map(() => '?').join(',');
  let sql = `family_id=? AND skill=? AND type IN (${holes}) AND status='active'`;
  const args = [familyId, skill, ...t];
  if (part) { sql += ' AND part=?'; args.push(part); }
  return { sql, args };
}

/** Count the items usable for one block: right exam, skill, item type and part */
function bankCount(familyId, skill, types, level, part) {
  const { sql, args } = poolWhere(familyId, skill, types, part);
  const base = 'SELECT COUNT(*) c FROM questions WHERE ' + sql;
  return {
    total: q.val(base, ...args),
    exact: level ? q.val(base + ' AND level=?', ...args, level) : 0
  };
}

/** Same pool as bankCount, but only the items whose audio has been approved.
    A VPET audio part cannot be generated from items that have no sound — and
    "has a file" is not the same as "somebody has listened to it". A synthetic
    voice mangling a proper noun is caught at the approval step, so that is the
    step this gate counts. See docs/VOICE.md 4.6. */
function audioReadyCount(familyId, skill, types, level, part) {
  const { sql, args } = poolWhere(familyId, skill, types, part);
  const base = 'SELECT COUNT(*) c FROM questions WHERE ' + sql +
    " AND audio_key IS NOT NULL AND audio_status='approved'";
  return {
    total: q.val(base, ...args),
    exact: level ? q.val(base + ' AND level=?', ...args, level) : 0
  };
}

router.get('/admin/exam-formats', (req, res) => {
  const familyId = str(req.query.familyId, 20);
  const level = LEVELS.includes(str(req.query.level, 5).toUpperCase())
    ? str(req.query.level, 5).toUpperCase() : '';
  const strict = req.query.strict === '1';

  const list = EXAM_FORMATS.FORMATS
    .filter(f => !familyId || f.familyId === familyId)
    .map(f => {
      const fam = q.get('SELECT name, status FROM families WHERE id=?', f.familyId);
      const sections = f.sections.map(s => {
        const bank = bankCount(f.familyId, s.skill, s.types, level, s.part);
        const have = strict ? bank.exact : bank.total;
        /* Audio parts are only buildable from items that carry an MP3, so they
           get their own shortfall alongside the plain bank count. */
        const withAudio = s.needsAudio ? audioReadyCount(f.familyId, s.skill, s.types, level, s.part) : null;
        const haveAudio = withAudio ? (strict ? withAudio.exact : withAudio.total) : 0;
        return {
          name: s.name, part: s.part || null,
          skill: s.skill, type: s.type, items: s.items, minutes: s.minutes,
          types: s.types || [], parts: s.parts || [], needsAudio: !!s.needsAudio,
          bank: { have, exact: bank.exact, total: bank.total, need: s.items, short: Math.max(0, s.items - have) },
          audio: s.needsAudio
            ? { have: haveAudio, need: s.items, short: Math.max(0, s.items - haveAudio) }
            : null
        };
      });
      const short = sections.reduce((a, s) => a + s.bank.short, 0);
      const audioShort = sections.reduce((a, s) => a + (s.audio ? s.audio.short : 0), 0);
      return {
        id: f.id, familyId: f.familyId, familyName: fam ? fam.name : f.familyId,
        familyStatus: fam ? (fam.status || 'ready') : 'ready',
        name: f.name, kind: f.kind, levels: f.levels,
        scoring: f.scoring, guide: f.guide, notes: f.notes,
        totalItems: EXAM_FORMATS.totalItems(f), totalMinutes: EXAM_FORMATS.totalMinutes(f),
        sections,
        /* Ready means the bank can fill every part AND every audio part has
           enough items with sound attached. */
        ready: short === 0 && audioShort === 0,
        shortBy: short,                   // how many items short
        audioShortBy: audioShort          // how many items with an MP3 short
      };
    });

  res.set('Cache-Control', 'no-store').json({ level, strict, formats: list });
});

/* ============================ TESTS ============================ */
function testDetail(id) {
  const t = q.get('SELECT * FROM tests WHERE id=?', id);
  if (!t) return null;
  const sections = q.all('SELECT * FROM sections WHERE test_id=? ORDER BY sort, id', id).map(s => {
    const items = q.all(
      `SELECT si.id item_id, si.sort, qs.id, qs.prompt, qs.type, qs.level, qs.skill, qs.status, qs.part
         FROM section_items si JOIN questions qs ON qs.id = si.question_id
        WHERE si.section_id=? ORDER BY si.sort, si.id`, s.id);
    return {
      id: s.id, name: s.name, part: s.part || null,
      skill: s.skill, type: s.type, minutes: s.minutes, sort: s.sort,
      items: items.map(i => ({
        itemId: i.item_id, questionId: i.id, prompt: i.prompt,
        type: i.type, level: i.level, skill: i.skill, status: i.status, part: i.part || null
      }))
    };
  });
  return {
    id: t.id, familyId: t.family_id, title: t.title, level: t.level,
    durationMin: t.duration_min, scoring: t.scoring, guide: jparse(t.guide_json, []),
    status: t.status, buildMode: t.build_mode, createdAt: t.created_at, updatedAt: t.updated_at,
    sections,
    totalItems: sections.reduce((a, s) => a + s.items.length, 0)
  };
}

router.get('/admin/tests', (req, res) => {
  const where = [];
  const args = [];
  if (req.query.family) { where.push('t.family_id = ?'); args.push(str(req.query.family, 20)); }
  if (req.query.status) { where.push('t.status = ?'); args.push(str(req.query.status, 20)); }
  if (req.query.q) { where.push('t.title LIKE ?'); args.push('%' + str(req.query.q, 80) + '%'); }
  const w = where.length ? 'WHERE ' + where.join(' AND ') : '';
  const rows = q.all(`
    SELECT t.*, f.name family_name,
           (SELECT COUNT(*) FROM sections s WHERE s.test_id=t.id) sections,
           (SELECT COUNT(*) FROM section_items si JOIN sections s ON s.id=si.section_id WHERE s.test_id=t.id) items
      FROM tests t JOIN families f ON f.id=t.family_id
      ${w} ORDER BY t.updated_at DESC`, ...args);
  res.json({
    items: rows.map(r => ({
      id: r.id, familyId: r.family_id, familyName: r.family_name, title: r.title, level: r.level,
      durationMin: r.duration_min, status: r.status, buildMode: r.build_mode,
      sections: r.sections, items: r.items, updatedAt: r.updated_at
    }))
  });
});

router.get('/admin/tests/:id', (req, res) => {
  const t = testDetail(str(req.params.id, 60));
  if (!t) return res.status(404).json({ error: 'No such test.' });
  res.json(t);
});

/** Create an empty test (the by-hand route) */
router.post('/admin/tests', (req, res) => {
  const b = req.body || {};
  const familyId = str(b.familyId, 20);
  const title = str(b.title, 200);
  const level = str(b.level, 5).toUpperCase();
  if (!familyExists(familyId)) return bad(res, 'That exam is not valid.');
  if (title.length < 3) return bad(res, 'That test name is too short.');
  if (!validLevel(level)) return bad(res, 'That level is not valid.');

  let id = slug(b.id || (familyId + '-' + level + '-' + title)).slice(0, 50) || (familyId + '-' + Date.now());
  let i = 1;
  while (q.val('SELECT 1 FROM tests WHERE id=?', id)) id = id.replace(/-\d+$/, '') + '-' + (++i);

  const at = nowISO();
  q.run(`INSERT INTO tests (id,family_id,title,level,duration_min,scoring,guide_json,status,build_mode,created_at,updated_at,created_by)
         VALUES (?,?,?,?,?,?,?,'draft',?,?,?,?)`,
    id, familyId, title, level, int(b.durationMin, 0), str(b.scoring, 300),
    JSON.stringify(Array.isArray(b.guide) ? b.guide.map(g => str(g, 300)).filter(Boolean) : []),
    str(b.buildMode, 10) === 'auto' ? 'auto' : 'manual', at, at, req.admin.id);
  audit(req, 'test.create', 'tests/' + id, { title, familyId });
  res.status(201).json(testDetail(id));
});

router.put('/admin/tests/:id', (req, res) => {
  const id = str(req.params.id, 60);
  if (!q.val('SELECT 1 FROM tests WHERE id=?', id)) return res.status(404).json({ error: 'No such test.' });
  const b = req.body || {};
  const title = str(b.title, 200);
  const level = str(b.level, 5).toUpperCase();
  if (title.length < 3) return bad(res, 'That test name is too short.');
  if (!validLevel(level)) return bad(res, 'That level is not valid.');
  q.run(`UPDATE tests SET title=?, level=?, duration_min=?, scoring=?, guide_json=?, updated_at=? WHERE id=?`,
    title, level, int(b.durationMin, 0), str(b.scoring, 300),
    JSON.stringify(Array.isArray(b.guide) ? b.guide.map(g => str(g, 300)).filter(Boolean) : []),
    nowISO(), id);
  audit(req, 'test.update', 'tests/' + id, {});
  res.json(testDetail(id));
});

/** Change status: publishing is allowed only once every part has questions */
router.post('/admin/tests/:id/status', (req, res) => {
  const id = str(req.params.id, 60);
  const status = str(req.body && req.body.status, 20);
  if (!STATUSES.includes(status)) return bad(res, 'That status is not valid.');
  const t = testDetail(id);
  if (!t) return res.status(404).json({ error: 'No such test.' });

  if (status === 'published') {
    /* The platform is only selling VPET right now. Letting a parked family's
       test go live would put it in the catalogue and on sale, which is the
       one thing parking it was meant to prevent. */
    const fam = q.get('SELECT name, status FROM families WHERE id=?', t.familyId);
    if (fam && fam.status === 'coming_soon') {
      return bad(res, fam.name + ' is not ready yet, so its tests cannot be published. '
        + 'Open this exam in server/db.js (FAMILIES) first.');
    }
    if (!t.sections.length) return bad(res, 'This test has no parts, so it cannot be published.');
    const empty = t.sections.filter(s => !s.items.length).map(s => s.name);
    if (empty.length) return bad(res, 'These parts have no questions yet: ' + empty.join(', '));

    /* A question is retired when somebody decided it should stop being asked —
       a wrong key, an ambiguous distractor, an item the analysis says takes
       marks from the candidates who understood. Publishing a test that still
       contains one puts it back in front of candidates, and the exam screen
       serves whatever the section holds without re-checking status. Draft is
       the same argument from the other end: content nobody has approved. */
    const notActive = [];
    for (const s of t.sections) {
      const bad2 = s.items.filter(i => i.status !== 'active');
      if (bad2.length) notActive.push(`${s.name} (${bad2.length})`);
    }
    if (notActive.length) {
      return bad(res, 'These parts contain questions that are retired or still in draft: '
        + notActive.join(', ') + '. Swap them out before publishing.');
    }

    /* A part the blueprint marks needsAudio must have an approved recording on
       every item before anyone can sit it.
       -------------------------------------------------------------------
       Without this gate a paper publishes happily with silent listening
       parts, and the candidate meets "You will hear a short story once" with
       nothing on screen to press. They cannot tell whether the exam is broken
       or their browser is, they have no way to ask, and the marks for that
       part are gone. The readiness screen already counted approved audio;
       nothing stopped a publish that ignored it.

       Approved, not merely present: a synthetic voice mangling a proper noun
       is caught by a person listening, and that gate is the reason
       audio_status exists (docs/VOICE.md 4.6). */
    const silent = [];
    for (const s of t.sections) {
      const bp = s.part ? EXAM_FORMATS.sectionOfPart(t.familyId, s.part) : null;
      if (!bp || !bp.needsAudio) continue;
      const ids = s.items.map(i => i.questionId);
      if (!ids.length) continue;
      const ready = q.val(
        `SELECT COUNT(*) c FROM questions
          WHERE id IN (${ids.map(() => '?').join(',')})
            AND audio_key IS NOT NULL AND audio_status='approved'`, ...ids);
      if (ready < ids.length) silent.push(`${s.name} (${ready}/${ids.length})`);
    }
    if (silent.length) {
      return bad(res, 'These parts play audio but their recordings are not built and approved yet: '
        + silent.join(', ') + '. Render and approve them in the question bank first.');
    }
  }
  q.run('UPDATE tests SET status=?, updated_at=? WHERE id=?', status, nowISO(), id);
  audit(req, 'test.status', 'tests/' + id, { status });
  res.json({ ok: true, status });
});

router.delete('/admin/tests/:id', (req, res) => {
  const id = str(req.params.id, 60);
  const used = q.val("SELECT COUNT(*) c FROM codes WHERE unlock_type='test' AND unlock_ref=?", id);
  if (used) return bad(res, used + ' codes point at this test. Archive it rather than deleting it.');
  const r = q.run('DELETE FROM tests WHERE id=?', id);
  if (!r.changes) return res.status(404).json({ error: 'No such test.' });
  audit(req, 'test.delete', 'tests/' + id, {});
  res.json({ ok: true });
});

/* ---- Sections ---- */
router.post('/admin/tests/:id/sections', (req, res) => {
  const id = str(req.params.id, 60);
  if (!q.val('SELECT 1 FROM tests WHERE id=?', id)) return res.status(404).json({ error: 'No such test.' });
  const b = req.body || {};
  const name = str(b.name, 100);
  const skill = str(b.skill, 20);
  if (name.length < 2) return bad(res, 'That part name is too short.');
  if (!SKILLS.includes(skill)) return bad(res, 'That skill is not valid.');
  /* Attach the part letter if this exam has a part table — so a later reshuffle
     still knows which part to draw from. */
  const fam = q.val('SELECT family_id FROM tests WHERE id=?', id);
  const allowed = EXAM_FORMATS.partsOf(fam);
  const part = str(b.part, 2).toUpperCase();
  if (part && !allowed.includes(part)) {
    return bad(res, 'That part is not valid. This exam has the parts: ' + (allowed.join(', ') || 'none') + '.');
  }
  const sort = (q.val('SELECT COALESCE(MAX(sort),-1) s FROM sections WHERE test_id=?', id)) + 1;
  const r = q.run('INSERT INTO sections (test_id,name,skill,type,minutes,sort,part) VALUES (?,?,?,?,?,?,?)',
    id, name, skill, str(b.type, 100) || 'Multiple choice', clamp(int(b.minutes, 0), 0, 600), sort, part || null);
  q.run('UPDATE tests SET updated_at=? WHERE id=?', nowISO(), id);
  audit(req, 'section.create', 'tests/' + id, { section: name, part: part || null });
  res.status(201).json({ id: Number(r.lastInsertRowid) });
});

router.put('/admin/sections/:sid', (req, res) => {
  const sid = int(req.params.sid, 0);
  const s = q.get('SELECT * FROM sections WHERE id=?', sid);
  if (!s) return res.status(404).json({ error: 'No such part.' });
  const b = req.body || {};
  q.run('UPDATE sections SET name=?, type=?, minutes=? WHERE id=?',
    str(b.name, 100) || s.name, str(b.type, 100) || s.type, clamp(int(b.minutes, s.minutes), 0, 600), sid);
  q.run('UPDATE tests SET updated_at=? WHERE id=?', nowISO(), s.test_id);
  audit(req, 'section.update', 'sections/' + sid, {});
  res.json({ ok: true });
});

router.delete('/admin/sections/:sid', (req, res) => {
  const sid = int(req.params.sid, 0);
  const s = q.get('SELECT test_id FROM sections WHERE id=?', sid);
  if (!s) return res.status(404).json({ error: 'No such part.' });
  q.run('DELETE FROM sections WHERE id=?', sid);
  q.run('UPDATE tests SET updated_at=? WHERE id=?', nowISO(), s.test_id);
  audit(req, 'section.delete', 'sections/' + sid, {});
  res.json({ ok: true });
});

/** Attach questions to a part (by hand, chosen from the bank) */
router.post('/admin/sections/:sid/items', (req, res) => {
  const sid = int(req.params.sid, 0);
  const s = q.get('SELECT * FROM sections WHERE id=?', sid);
  if (!s) return res.status(404).json({ error: 'No such part.' });
  const ids = Array.isArray(req.body && req.body.questionIds)
    ? req.body.questionIds.map(x => int(x, 0)).filter(Boolean) : [];
  if (!ids.length) return bad(res, 'No questions were chosen.');

  const test = q.get('SELECT family_id FROM tests WHERE id=?', s.test_id);
  let added = 0, skipped = 0;
  tx(() => {
    let sort = (q.val('SELECT COALESCE(MAX(sort),-1) s FROM section_items WHERE section_id=?', sid)) + 1;
    for (const qid of ids) {
      const row = q.get("SELECT family_id, skill FROM questions WHERE id=? AND status='active'", qid);
      // Only items from the same exam and the same skill as the part
      if (!row || row.family_id !== test.family_id || row.skill !== s.skill) { skipped++; continue; }
      const r = q.run('INSERT OR IGNORE INTO section_items (section_id,question_id,sort) VALUES (?,?,?)', sid, qid, sort++);
      if (r.changes) added++; else skipped++;
    }
    q.run('UPDATE tests SET updated_at=? WHERE id=?', nowISO(), s.test_id);
  });
  audit(req, 'section.items.add', 'sections/' + sid, { added, skipped });
  res.json({ added, skipped });
});

router.delete('/admin/items/:itemId', (req, res) => {
  const itemId = int(req.params.itemId, 0);
  const row = q.get(`SELECT si.id, s.test_id FROM section_items si
                       JOIN sections s ON s.id = si.section_id WHERE si.id=?`, itemId);
  if (!row) return res.status(404).json({ error: 'No such item in this part.' });
  q.run('DELETE FROM section_items WHERE id=?', itemId);
  q.run('UPDATE tests SET updated_at=? WHERE id=?', nowISO(), row.test_id);
  audit(req, 'section.items.remove', 'items/' + itemId, {});
  res.json({ ok: true });
});

/** GENERATE a test from a blueprint: drawn at random from the question bank.
 *  body: { familyId, level, title?, blueprint:[{name,skill,type,items,minutes}], strictLevel? }
 *  - strictLevel=true: only items at that level; by default the level is preferred, then others.
 *  - Returns a clear error when the bank does not hold enough.
 */
router.post('/admin/tests/generate', (req, res) => {
  const b = req.body || {};
  const familyId = str(b.familyId, 20);
  const level = str(b.level, 5).toUpperCase();
  const strict = !!b.strictLevel;
  if (!familyExists(familyId)) return bad(res, 'That exam is not valid.');
  if (!validLevel(level)) return bad(res, 'That level is not valid.');
  const bp = Array.isArray(b.blueprint) ? b.blueprint : [];
  if (!bp.length) return bad(res, 'No parts were declared for the test.');

  // Check there are enough items before creating anything, and gather every shortfall to report at once
  const picked = [];
  const shortages = [];
  const usedIds = new Set();
  for (const sec of bp) {
    const skill = str(sec.skill, 20);
    const want = clamp(int(sec.items, 0), 1, 200);
    if (!SKILLS.includes(skill)) return bad(res, 'That skill is not valid: ' + skill);

    /* A standard format declares which item types a block accepts (TOEIC Part 5 takes
       mcq only, for instance); declare none and it accepts any, as before. Declare the
       part letter too and it draws only from that part — one pool serving two different
       parts is the surest way to build a paper that looks right and asks the wrong things. */
    const part = EXAM_FORMATS.partsOf(familyId).includes(str(sec.part, 2).toUpperCase())
      ? str(sec.part, 2).toUpperCase() : '';
    const { sql: poolSql, args: poolArgs } = poolWhere(familyId, skill, sec.types, part);
    /* A level covers a set of CEFR bands, not one. Comparing `level` to an
       item's band directly worked only while the two happened to use the same
       vocabulary; a VPET Level 1 paper matches nothing that way, and would
       quietly fill itself from the fallback — that is, entirely with items from
       the wrong level. */
    const bands = levelBands(level);
    const holes = bands.map(() => '?').join(',');
    const pool = strict
      ? q.all(`SELECT id FROM questions WHERE ${poolSql} AND level IN (${holes})`, ...poolArgs, ...bands)
      : q.all(`SELECT id, (level IN (${holes})) exact FROM questions WHERE ${poolSql} ORDER BY exact DESC`,
              ...bands, ...poolArgs);

    const avail = pool.filter(r => !usedIds.has(r.id));
    if (avail.length < want) {
      shortages.push({
        section: str(sec.name, 100) || skill, skill, part: part || null,
        need: want, have: avail.length
      });
      continue;
    }
    // Shuffle within the priority groups: exact matches stay first, randomised inside each group
    const exact = avail.filter(r => strict || r.exact);
    const other = avail.filter(r => !strict && !r.exact);
    const shuffle = arr => arr.map(v => [Math.random(), v]).sort((a, c) => a[0] - c[0]).map(v => v[1]);
    const chosen = shuffle(exact).concat(shuffle(other)).slice(0, want);
    chosen.forEach(r => usedIds.add(r.id));
    picked.push({ sec, part, ids: chosen.map(r => r.id) });
  }

  if (shortages.length) {
    return res.status(409).json({
      error: 'The question bank does not hold enough to generate this.',
      shortages
    });
  }

  const title = str(b.title, 200) || (q.get('SELECT name FROM families WHERE id=?', familyId).name +
    ' generated ' + level + ' ' + new Date().toISOString().slice(0, 10));
  let id = slug(familyId + '-auto-' + level + '-' + Date.now().toString(36));
  const at = nowISO();

  tx(() => {
    q.run(`INSERT INTO tests (id,family_id,title,level,duration_min,scoring,guide_json,status,build_mode,created_at,updated_at,created_by)
           VALUES (?,?,?,?,?,?,?,'draft','auto',?,?,?)`,
      id, familyId, title, level,
      bp.reduce((a, s) => a + clamp(int(s.minutes, 0), 0, 600), 0),
      str(b.scoring, 300), JSON.stringify(Array.isArray(b.guide) ? b.guide.map(g => str(g, 300)) : []),
      at, at, req.admin.id);

    picked.forEach((p, i) => {
      /* The line under the part heading that tells a candidate what they are
         about to do. Take it from the caller, then from the published format
         for that part, and only then fall back — and fall back to the skill
         rather than to "Multiple choice".

         The old default was a specific claim, and on a dictation part it was a
         false one: part E showed "Multiple choice - 8 items" above eight boxes
         asking the candidate to type what they heard. A default that describes
         the wrong task is worse than one that describes none, because nobody
         reads it as a placeholder. */
      const fromFormat = EXAM_FORMATS.sectionOfPart(familyId, p.part);
      const displayType = str(p.sec.type, 100)
        || (fromFormat && str(fromFormat.type, 100))
        || str(p.sec.skill, 20);

      q.run('INSERT INTO sections (test_id,name,skill,type,minutes,sort,part) VALUES (?,?,?,?,?,?,?)',
        id, str(p.sec.name, 100) || p.sec.skill, str(p.sec.skill, 20),
        displayType, clamp(int(p.sec.minutes, 0), 0, 600), i, p.part || null);
      const sid = q.val('SELECT id FROM sections WHERE test_id=? ORDER BY id DESC LIMIT 1', id);
      p.ids.forEach((qid, j) =>
        q.run('INSERT OR IGNORE INTO section_items (section_id,question_id,sort) VALUES (?,?,?)', sid, qid, j));
    });
  });

  audit(req, 'test.generate', 'tests/' + id, { familyId, level, sections: bp.length, items: usedIds.size });
  res.status(201).json(testDetail(id));
});

/** Redraw every item in a part (keeping the count) */
router.post('/admin/sections/:sid/reshuffle', (req, res) => {
  const sid = int(req.params.sid, 0);
  const s = q.get('SELECT * FROM sections WHERE id=?', sid);
  if (!s) return res.status(404).json({ error: 'No such part.' });
  const t = q.get('SELECT family_id, level FROM tests WHERE id=?', s.test_id);
  const want = q.val('SELECT COUNT(*) c FROM section_items WHERE section_id=?', sid);
  if (!want) return bad(res, 'This part has no items to redraw.');

  /* A redraw has to draw from the same pool the generator used. This used to filter
     on skill alone: redrawing one VPET Speaking part could pull in items belonging to
     another Speaking part, and a multiple-choice Reading part could receive gap-fill
     items. The part letter stored on the section says where to draw, and the blueprint
     says which item types that part accepts. */
  const blueprint = s.part ? EXAM_FORMATS.sectionOfPart(t.family_id, s.part) : null;
  const { sql: poolSql, args: poolArgs } = poolWhere(
    t.family_id, s.skill, blueprint ? blueprint.types : null, s.part || '');
  const pool = q.all(
    `SELECT id, (level=?) exact FROM questions WHERE ${poolSql} ORDER BY exact DESC`,
    t.level, ...poolArgs);
  if (pool.length < want) {
    return bad(res, 'The bank' + (s.part ? ' for part ' + s.part : '') + ' holds only ' + pool.length +
      ' items, short of the ' + want + ' needed.');
  }

  const shuffle = arr => arr.map(v => [Math.random(), v]).sort((a, c) => a[0] - c[0]).map(v => v[1]);
  const chosen = shuffle(pool.filter(r => r.exact)).concat(shuffle(pool.filter(r => !r.exact))).slice(0, want);
  tx(() => {
    q.run('DELETE FROM section_items WHERE section_id=?', sid);
    chosen.forEach((r, i) => q.run('INSERT INTO section_items (section_id,question_id,sort) VALUES (?,?,?)', sid, r.id, i));
    q.run('UPDATE tests SET updated_at=? WHERE id=?', nowISO(), s.test_id);
  });
  audit(req, 'section.reshuffle', 'sections/' + sid, { count: want });
  res.json({ ok: true, count: want });
});

/* ============================= USER ============================= */
router.get('/admin/users', (req, res) => {
  const where = [];
  const args = [];
  if (req.query.status) { where.push('status = ?'); args.push(str(req.query.status, 20)); }
  if (req.query.verified === '1') where.push('verified = 1');
  if (req.query.verified === '0') where.push('verified = 0');
  if (req.query.q) {
    where.push('(name LIKE ? OR email LIKE ? OR username LIKE ?)');
    const like = '%' + str(req.query.q, 80) + '%';
    args.push(like, like, like);
  }
  const w = where.length ? 'WHERE ' + where.join(' AND ') : '';
  const limit = clamp(int(req.query.limit, 25), 1, 200);
  const offset = clamp(int(req.query.offset, 0), 0, 1e6);
  const total = q.val('SELECT COUNT(*) c FROM users ' + w, ...args);
  const rows = q.all(`
    SELECT u.*,
           (SELECT COUNT(*) FROM codes c WHERE c.user_id=u.id AND c.status='redeemed') codes,
           (SELECT COALESCE(SUM(o.amount),0) FROM orders o WHERE o.user_id=u.id AND o.status='paid') spent
      FROM users u ${w} ORDER BY u.created_at DESC LIMIT ? OFFSET ?`, ...args, limit, offset);
  res.json({
    total, limit, offset,
    items: rows.map(u => ({
      id: u.id, username: u.username, email: u.email, name: u.name,
      verified: !!u.verified, status: u.status, interests: jparse(u.interests_json, []),
      codes: u.codes, spent: u.spent, note: u.note, createdAt: u.created_at, lastLoginAt: u.last_login_at
    }))
  });
});

router.get('/admin/users/:id', (req, res) => {
  const id = int(req.params.id, 0);
  const u = q.get('SELECT * FROM users WHERE id=?', id);
  if (!u) return res.status(404).json({ error: 'No such student.' });
  const codes = q.all('SELECT * FROM codes WHERE user_id=? ORDER BY redeemed_at DESC', id);
  const orders = q.all('SELECT * FROM orders WHERE user_id=? ORDER BY created_at DESC', id);
  res.json({
    user: {
      id: u.id, username: u.username, email: u.email, name: u.name, verified: !!u.verified,
      status: u.status, interests: jparse(u.interests_json, []), note: u.note,
      createdAt: u.created_at, lastLoginAt: u.last_login_at
    },
    codes: codes.map(c => ({
      id: c.id, code: c.code, unlockType: c.unlock_type, unlockRef: c.unlock_ref,
      label: unlockLabel(c.unlock_type, c.unlock_ref), status: c.status,
      redeemedAt: c.redeemed_at, expiresAt: c.expires_at
    })),
    orders: orders.map(o => ({ id: o.id, name: o.name, amount: o.amount, status: o.status, createdAt: o.created_at }))
  });
});

router.post('/admin/users/:id/status', (req, res) => {
  const id = int(req.params.id, 0);
  const status = str(req.body && req.body.status, 20);
  if (!['active', 'locked'].includes(status)) return bad(res, 'That status is not valid.');
  const r = q.run('UPDATE users SET status=? WHERE id=?', status, id);
  if (!r.changes) return res.status(404).json({ error: 'No such student.' });
  audit(req, 'user.status', 'users/' + id, { status });
  res.json({ ok: true });
});

router.post('/admin/users/:id/verify', (req, res) => {
  const id = int(req.params.id, 0);
  const r = q.run('UPDATE users SET verified=1 WHERE id=?', id);
  if (!r.changes) return res.status(404).json({ error: 'No such student.' });
  audit(req, 'user.verify', 'users/' + id, {});
  res.json({ ok: true });
});

router.put('/admin/users/:id', (req, res) => {
  const id = int(req.params.id, 0);
  const u = q.get('SELECT * FROM users WHERE id=?', id);
  if (!u) return res.status(404).json({ error: 'No such student.' });
  const b = req.body || {};
  const name = str(b.name, 120) || u.name;
  const note = str(b.note, 500);
  const interests = Array.isArray(b.interests)
    ? b.interests.map(x => str(x, 20)).filter(familyExists) : jparse(u.interests_json, []);
  q.run('UPDATE users SET name=?, note=?, interests_json=? WHERE id=?', name, note, JSON.stringify(interests), id);
  audit(req, 'user.update', 'users/' + id, {});
  res.json({ ok: true });
});

/* ============================= CODE ============================= */
function validUnlock(type, ref) {
  if (type === 'test') return !!q.val('SELECT 1 FROM tests WHERE id=?', ref);
  if (type === 'family') return familyExists(ref);
  if (type === 'bundle') {
    const ids = String(ref).split(',').map(s => s.trim()).filter(Boolean);
    return ids.length >= 2 && ids.every(familyExists);
  }
  return false;
}

router.get('/admin/codes', (req, res) => {
  const where = [];
  const args = [];
  if (req.query.status) { where.push('c.status = ?'); args.push(str(req.query.status, 20)); }
  if (req.query.type) { where.push('c.unlock_type = ?'); args.push(str(req.query.type, 20)); }
  if (req.query.batch) { where.push('c.batch_id = ?'); args.push(int(req.query.batch, 0)); }
  if (req.query.q) { where.push('c.code LIKE ?'); args.push('%' + str(req.query.q, 40).toUpperCase() + '%'); }
  const w = where.length ? 'WHERE ' + where.join(' AND ') : '';
  const limit = clamp(int(req.query.limit, 30), 1, 500);
  const offset = clamp(int(req.query.offset, 0), 0, 1e6);
  const total = q.val('SELECT COUNT(*) c FROM codes c ' + w, ...args);
  const rows = q.all(`
    SELECT c.*, u.name user_name, u.email user_email, b.name batch_name
      FROM codes c LEFT JOIN users u ON u.id=c.user_id LEFT JOIN batches b ON b.id=c.batch_id
      ${w} ORDER BY c.id DESC LIMIT ? OFFSET ?`, ...args, limit, offset);
  res.json({
    total, limit, offset,
    items: rows.map(c => {
      const plan = PLANS.byId(c.plan_id);
      return {
        id: c.id, code: c.code, unlockType: c.unlock_type, unlockRef: c.unlock_ref,
        planId: c.plan_id || null,
        /* The label in the admin table is the plan name where there is one; an older
           code with no plan falls back to an exam label, and says so plainly. */
        label: plan ? plan.name + ' plan · ' + plan.months + ' months'
                    : unlockLabel(c.unlock_type, c.unlock_ref) + ' (no plan attached)',
        status: c.status,
        expiresAt: c.expires_at, accessExpiresAt: c.access_expires_at,
        redeemedAt: c.redeemed_at, note: c.note,
        batchId: c.batch_id, batchName: c.batch_name,
        user: c.user_id ? { id: c.user_id, name: c.user_name, email: c.user_email } : null,
        createdAt: c.created_at
      };
    })
  });
});

router.get('/admin/batches', (req, res) => {
  const rows = q.all(`
    SELECT b.*, (SELECT COUNT(*) FROM codes c WHERE c.batch_id=b.id) total,
           (SELECT COUNT(*) FROM codes c WHERE c.batch_id=b.id AND c.status='redeemed') used
      FROM batches b ORDER BY b.id DESC LIMIT 50`);
  res.json({
    items: rows.map(b => ({
      id: b.id, name: b.name, unlockType: b.unlock_type, unlockRef: b.unlock_ref,
      label: unlockLabel(b.unlock_type, b.unlock_ref), qty: b.qty, total: b.total, used: b.used,
      expiresAt: b.expires_at, createdAt: b.created_at
    }))
  });
});

/** Issue codes: a batch of many, or one issued straight to a student */
router.post('/admin/codes', (req, res) => {
  const b = req.body || {};
  const type = str(b.unlockType, 20);
  const ref = str(b.unlockRef, 200);
  const qty = clamp(int(b.qty, 1), 1, 500);
  const note = str(b.note, 200);
  const expiresAt = str(b.expiresAt, 10) || null;
  const assignTo = int(b.userId, 0) || null;
  /* What a code actually grants is a PLAN. It has to be chosen, with no default:
     a code with no plan redeems into nothing, and that mistake only surfaces once
     the buyer is holding the code. */
  const plan = PLANS.byId(str(b.planId, 40));

  if (!plan) {
    return bad(res, 'Choose a plan for the code: ' + PLANS.PLANS.map(p => p.id).join(', ') + '.');
  }
  if (!validUnlock(type, ref)) return bad(res, 'That unlock is not valid.');
  if (expiresAt && !/^\d{4}-\d{2}-\d{2}$/.test(expiresAt)) return bad(res, 'The expiry date must be YYYY-MM-DD.');
  if (assignTo && !q.val('SELECT 1 FROM users WHERE id=?', assignTo)) return bad(res, 'No such student.');
  if (assignTo && qty !== 1) return bad(res, 'Issuing straight to a student means one code at a time.');

  const at = nowISO();
  /* Issuing straight to a student activates it there and then, so the access term has
     to start counting now. Left empty, entitlementOf() reads it as never expiring —
     a plan given away for good. */
  const accessUntil = (() => {
    if (!assignTo) return null;
    const d = new Date(at);
    d.setMonth(d.getMonth() + plan.months);
    return d.toISOString();
  })();
  let batchId = null;
  const created = [];

  tx(() => {
    if (qty > 1) {
      q.run('INSERT INTO batches (name,unlock_type,unlock_ref,qty,expires_at,created_at,created_by) VALUES (?,?,?,?,?,?,?)',
        str(b.batchName, 120) || (plan.name + ' batch ' + at.slice(0, 10)),
        type, ref, qty, expiresAt, at, req.admin.id);
      batchId = q.val('SELECT id FROM batches ORDER BY id DESC LIMIT 1');
    }
    for (let i = 0; i < qty; i++) {
      let code = makeCode();
      while (q.val('SELECT 1 FROM codes WHERE code=?', code)) code = makeCode();
      q.run(`INSERT INTO codes (code,batch_id,unlock_type,unlock_ref,plan_id,status,expires_at,access_expires_at,user_id,redeemed_at,note,created_at,created_by)
             VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)`,
        code, batchId, type, ref, plan.id, assignTo ? 'redeemed' : 'unused', expiresAt,
        accessUntil, assignTo, assignTo ? at : null, note || null, at, req.admin.id);
      created.push(code);
    }
  });

  audit(req, 'code.issue', batchId ? 'batches/' + batchId : 'codes', { qty, plan: plan.id, type, ref, assignTo });
  res.status(201).json({ created, batchId, qty, plan: { id: plan.id, name: plan.name, months: plan.months } });
});

router.post('/admin/codes/:id/revoke', (req, res) => {
  const id = int(req.params.id, 0);
  const c = q.get('SELECT * FROM codes WHERE id=?', id);
  if (!c) return res.status(404).json({ error: 'No such code.' });
  if (c.status === 'revoked') return bad(res, 'That code was already revoked.');
  q.run("UPDATE codes SET status='revoked' WHERE id=?", id);
  audit(req, 'code.revoke', 'codes/' + id, { code: c.code, wasStatus: c.status });
  res.json({ ok: true });
});

/** Export the codes as CSV (by batch, or by status filter) */
router.get('/admin/codes/export', (req, res) => {
  const where = [];
  const args = [];
  if (req.query.batch) { where.push('c.batch_id = ?'); args.push(int(req.query.batch, 0)); }
  if (req.query.status) { where.push('c.status = ?'); args.push(str(req.query.status, 20)); }
  const w = where.length ? 'WHERE ' + where.join(' AND ') : '';
  const rows = q.all(`SELECT c.code, c.plan_id, c.unlock_type, c.unlock_ref, c.status,
                             c.expires_at, c.access_expires_at, c.redeemed_at,
                             u.email user_email
                        FROM codes c LEFT JOIN users u ON u.id=c.user_id ${w}
                       ORDER BY c.id DESC LIMIT 5000`, ...args);
  const esc = v => '"' + String(v == null ? '' : v).replace(/"/g, '""') + '"';
  /* This file gets handed out to a class, so it has to say which PLAN a code grants.
     It used to carry only the per-exam unlock column — under the new model that is
     wrong information passed straight to the buyer. */
  const csv = ['ma,goi,so_thang,quyen_mo_khoa,doi_tuong,trang_thai,han_kich_hoat,han_truy_cap,ngay_kich_hoat,email_hoc_vien']
    .concat(rows.map(r => {
      const plan = PLANS.byId(r.plan_id);
      return [r.code, plan ? plan.name : '', plan ? plan.months : '',
        r.unlock_type, r.unlock_ref, r.status,
        r.expires_at, r.access_expires_at, r.redeemed_at, r.user_email].map(esc).join(',');
    }))
    .join('\r\n');
  audit(req, 'code.export', 'codes', { rows: rows.length });
  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', 'attachment; filename="codes.csv"');
  res.send('﻿' + csv);            // a BOM so Excel reads the accents correctly
});

/* ======================= SETTINGS · AUDIT LOG ======================= */
router.get('/admin/settings', (req, res) => {
  const rows = q.all('SELECT key, value FROM settings');
  const settings = {};
  rows.forEach(r => { settings[r.key] = r.value; });
  res.json({
    settings,
    packages: q.all('SELECT * FROM packages ORDER BY sort').map(p => ({
      id: p.id, name: p.name, price: p.price, familyId: p.family_id,
      description: p.description, perks: jparse(p.perks_json, []),
      featured: !!p.featured, active: !!p.active
    })),
    families: q.all('SELECT * FROM families ORDER BY sort').map(f => ({
      id: f.id, name: f.name, sub: f.sub, format: f.format, skills: jparse(f.skills_json, [])
    })),
    admins: q.all('SELECT id, username, name, role, active, created_at, last_login_at FROM admins ORDER BY id')
  });
});

router.put('/admin/settings', (req, res) => {
  const b = (req.body && req.body.settings) || {};
  const allowed = ['brand.name', 'brand.tenant', 'platform.notice'];
  const ins = require('./db').db.prepare(
    'INSERT INTO settings (key,value) VALUES (?,?) ON CONFLICT(key) DO UPDATE SET value=excluded.value');
  for (const k of allowed) if (k in b) ins.run(k, str(b[k], 300));
  audit(req, 'settings.update', 'settings', { keys: Object.keys(b) });
  res.json({ ok: true });
});

router.put('/admin/packages/:id', (req, res) => {
  const id = str(req.params.id, 40);
  const p = q.get('SELECT * FROM packages WHERE id=?', id);
  if (!p) return res.status(404).json({ error: 'No such plan.' });
  const b = req.body || {};
  const price = clamp(int(b.price, p.price), 0, 100000000);
  q.run('UPDATE packages SET name=?, price=?, description=?, active=? WHERE id=?',
    str(b.name, 120) || p.name, price, str(b.description, 400) || p.description,
    b.active === false ? 0 : 1, id);
  audit(req, 'package.update', 'packages/' + id, { price });
  res.json({ ok: true });
});

/** Change your own admin password */
router.post('/admin/password', (req, res) => {
  const b = req.body || {};
  const cur = typeof b.current === 'string' ? b.current : '';
  const next = typeof b.next === 'string' ? b.next : '';
  const me = q.get('SELECT * FROM admins WHERE id=?', req.admin.id);
  if (!A.verifyPassword(cur, me.pass_hash)) return res.status(403).json({ error: 'That is not your current password.' });
  if (next.length < 10) return bad(res, 'A new password needs at least 10 characters.');
  if (!/[A-Za-z]/.test(next) || !/\d/.test(next)) return bad(res, 'A new password needs both letters and digits.');
  q.run('UPDATE admins SET pass_hash=? WHERE id=?', A.hashPassword(next), req.admin.id);
  q.run('DELETE FROM sessions WHERE admin_id=?', req.admin.id);   // force every device to sign in again
  audit(req, 'admin.password', 'admins/' + req.admin.username, {});
  res.json({ ok: true, reauth: true });
});

router.get('/admin/audit', (req, res) => {
  const limit = clamp(int(req.query.limit, 60), 1, 300);
  const rows = q.all('SELECT * FROM audit ORDER BY id DESC LIMIT ?', limit);
  res.json({
    items: rows.map(r => ({
      id: r.id, admin: r.admin_name, action: r.action, target: r.target,
      meta: jparse(r.meta_json, {}), ip: r.ip, at: r.at
    }))
  });
});

/* =================== THE PUBLIC CATALOGUE (read) ===================
   The shape matches the student-side mock, so the front end could move to the API
   without rewriting its markup. // TODO(frontend): replace _mock.js with this endpoint */
router.get('/catalog', (req, res) => {
  const families = q.all('SELECT * FROM families ORDER BY sort').map(f => ({
    id: f.id, name: f.name, sub: f.sub, format: f.format, skills: jparse(f.skills_json, []),
    /* 'ready' means the family has a working blueprint and can hold tests;
       'coming_soon' families are listed but cannot be bought or opened. */
    status: f.status || 'ready',
    /* Lettered parts this family's items are filed under, empty for a format
       with no part table. The bank screen builds its part picker from this
       rather than carrying its own copy of the VPET table. */
    parts: EXAM_FORMATS.partsOf(f.id).map(letter => {
      const sec = EXAM_FORMATS.sectionOfPart(f.id, letter) || {};
      return { part: letter, name: sec.name || letter, skill: sec.skill || '', types: sec.types || [] };
    })
  }));
  const tests = q.all("SELECT * FROM tests WHERE status='published' ORDER BY family_id, id").map(t => {
    const sections = q.all('SELECT * FROM sections WHERE test_id=? ORDER BY sort, id', t.id).map(s => ({
      name: s.name, type: s.type, minutes: s.minutes,
      items: q.val('SELECT COUNT(*) c FROM section_items WHERE section_id=?', s.id)
    }));
    /* Two fields, because a level id and the thing a candidate reads are not
       the same. VPET stores `L1`, which means nothing on a card; what a
       candidate needs before choosing is "Level 1" and what it measures.
       Families that name a CEFR band directly send the band for both. */
    const lv = EXAM_FORMATS.vpetLevel(t.level);
    return {
      id: t.id, familyId: t.family_id, title: t.title, level: t.level,
      levelName: lv ? lv.name : t.level,
      levelRange: lv ? lv.range : '',
      levelBlurb: lv ? lv.blurb : '',
      durationMin: t.duration_min, scoring: t.scoring, guide: jparse(t.guide_json, []),
      skills: [...new Set(q.all('SELECT skill FROM sections WHERE test_id=?', t.id).map(r => r.skill))],
      sections,
      comingSoon: sections.some(s => !s.items)
    };
  });
  const packages = q.all('SELECT * FROM packages WHERE active=1 ORDER BY sort').map(p => ({
    id: p.id, name: p.name, price: p.price, familyId: p.family_id,
    desc: p.description, perks: jparse(p.perks_json, []), featured: !!p.featured
  }));
  /* The price list is public information and both sides need it: the student's sales
     screens and the admin's code-issuing screen. Sending it with the catalogue means
     one call covers both, and nowhere has to keep its own copy of a price. */
  const plans = PLANS.PLANS.map(p => ({
    id: p.id, name: p.name, price: p.price, months: p.months,
    attempts: p.attempts || null, features: p.features,
    tagline: p.tagline, perks: p.perks, limits: p.limits
  }));
  res.set('Cache-Control', 'no-store').json({ families, tests, packages, plans });
});

/* ==================== Self-study (public) ==================== */

/** The irregular verb table. Searchable by V1, V2, V3 or the Vietnamese gloss. */
router.get('/learn/irregular-verbs', (req, res) => {
  const level = LEVELS.includes(str(req.query.level, 2)) ? str(req.query.level, 2) : '';
  const grp = ['aaa', 'aba', 'abb', 'abc'].includes(str(req.query.group, 3)) ? str(req.query.group, 3) : '';
  const kw = str(req.query.q, 60).toLowerCase();

  const where = [];
  const args = [];
  if (level) { where.push('level = ?'); args.push(level); }
  if (grp) { where.push('grp = ?'); args.push(grp); }
  if (kw) {
    where.push('(lower(v1) LIKE ? OR lower(v2) LIKE ? OR lower(v3) LIKE ? OR lower(vi) LIKE ?)');
    const like = '%' + kw + '%';
    args.push(like, like, like, like);
  }
  const sql = 'SELECT * FROM irregular_verbs' +
    (where.length ? ' WHERE ' + where.join(' AND ') : '') + ' ORDER BY sort, v1';

  const verbs = q.all(sql, ...args).map(v => ({
    v1: v.v1, v2: v.v2, v3: v.v3, ving: v.ving,
    ipaUk: v.ipa_uk, ipaUs: v.ipa_us, vi: v.vi,
    group: v.grp, level: v.level, note: v.note,
    exEn: v.ex_en, exVi: v.ex_vi
  }));

  res.set('Cache-Control', 'public, max-age=300').json({
    total: q.val('SELECT COUNT(*) c FROM irregular_verbs'),
    count: verbs.length,
    verbs
  });
});

/** Linking words — filtered by function, register, level, or a search term */
router.get('/learn/linking-words', (req, res) => {
  const fns = new Set(LINKING.FUNCTIONS.map(f => f[0]));
  const regs = new Set(LINKING.REGISTERS.map(r => r[0]));
  const fn = fns.has(str(req.query.fn, 20)) ? str(req.query.fn, 20) : '';
  const reg = regs.has(str(req.query.register, 20)) ? str(req.query.register, 20) : '';
  const level = LEVELS.includes(str(req.query.level, 2).toUpperCase())
    ? str(req.query.level, 2).toUpperCase() : '';
  const kw = str(req.query.q, 60).toLowerCase();

  const where = [];
  const args = [];
  if (fn) { where.push('fn = ?'); args.push(fn); }
  if (reg) { where.push('register = ?'); args.push(reg); }
  if (level) { where.push('level = ?'); args.push(level); }
  if (kw) {
    where.push('(lower(word) LIKE ? OR lower(vi) LIKE ? OR lower(ex_en) LIKE ?)');
    const like = '%' + kw + '%';
    args.push(like, like, like);
  }
  const sql = 'SELECT * FROM linking_words' +
    (where.length ? ' WHERE ' + where.join(' AND ') : '') + ' ORDER BY sort, word';

  const words = q.all(sql, ...args).map(w => ({
    word: w.word, fn: w.fn, register: w.register, pos: w.pos, punct: w.punct,
    vi: w.vi, level: w.level, exEn: w.ex_en, exVi: w.ex_vi, warn: w.warn
  }));

  res.set('Cache-Control', 'public, max-age=300').json({
    total: q.val('SELECT COUNT(*) c FROM linking_words'),
    count: words.length,
    functions: LINKING.FUNCTIONS.map(([id, label]) => ({ id, label })),
    registers: LINKING.REGISTERS.map(([id, label]) => ({ id, label })),
    words
  });
});

/* Grammar points — a compact list, without the examples, to keep the payload small */
router.get('/learn/grammar', (req, res) => {
  const grp = str(req.query.grp, 20);
  const level = LEVELS.includes(str(req.query.level, 2).toUpperCase())
    ? str(req.query.level, 2).toUpperCase() : '';

  const where = [];
  const args = [];
  if (grp) { where.push('grp = ?'); args.push(grp); }
  if (level) { where.push('level = ?'); args.push(level); }
  const sql = 'SELECT * FROM grammar_points' +
    (where.length ? ' WHERE ' + where.join(' AND ') : '') + ' ORDER BY sort, id';

  const points = q.all(sql, ...args).map(p => ({
    slug: p.slug, nameEn: p.name_en, nameVi: p.name_vi,
    grp: p.grp, level: p.level, summary: p.summary,
    formula: jparse(p.formula_json), signals: jparse(p.signals_json),
    counts: {
      example: q.val('SELECT COUNT(*) c FROM grammar_examples WHERE point_id=? AND kind=?', p.id, 'example'),
      practice: q.val('SELECT COUNT(*) c FROM grammar_examples WHERE point_id=? AND kind=?', p.id, 'practice')
    }
  }));

  res.set('Cache-Control', 'public, max-age=300').json({
    total: q.val('SELECT COUNT(*) c FROM grammar_points'),
    count: points.length,
    groups: q.all('SELECT grp, COUNT(*) c FROM grammar_points GROUP BY grp ORDER BY grp')
      .map(g => ({ id: g.grp, count: g.c })),
    points
  });
});

/* One grammar point with all of its examples and practice items */
router.get('/learn/grammar/:slug', (req, res) => {
  const p = q.get('SELECT * FROM grammar_points WHERE slug = ?', str(req.params.slug, 60));
  if (!p) return res.status(404).json({ error: 'No such grammar point' });

  const rows = q.all(
    'SELECT * FROM grammar_examples WHERE point_id = ? ORDER BY kind, sort, id', p.id);

  res.set('Cache-Control', 'public, max-age=300').json({
    point: {
      slug: p.slug, nameEn: p.name_en, nameVi: p.name_vi,
      grp: p.grp, level: p.level, summary: p.summary,
      formula: jparse(p.formula_json), signals: jparse(p.signals_json),
      useWhen: jparse(p.use_when_json), useNot: jparse(p.use_not_json),
      confuse: jparse(p.confuse_json), errors: jparse(p.errors_json)
    },
    examples: rows.filter(r => r.kind === 'example')
      .map(r => ({ en: r.en, vi: r.vi, ok: r.ok === 1, note: r.note })),
    practice: rows.filter(r => r.kind === 'practice')
      .map(r => ({ en: r.en, vi: r.vi, answer: r.answer }))
  });
});

/* Vocabulary — the list, without senses and examples, so the payload stays small.
   The search reaches into vocab_forms as well as the headword, because a learner
   who meets "children" in a text looks up "children", not "child". */
router.get('/learn/vocab', (req, res) => {
  const level = LEVELS.includes(str(req.query.level, 2).toUpperCase())
    ? str(req.query.level, 2).toUpperCase() : '';
  const pos = str(req.query.pos, 20).toLowerCase();
  const kw = str(req.query.q, 60).toLowerCase();
  const limit = clamp(int(req.query.limit, 50), 1, 200);
  const offset = clamp(int(req.query.offset, 0), 0, 100000);

  const where = [];
  const args = [];
  if (level) { where.push('e.level = ?'); args.push(level); }
  if (pos) { where.push('e.pos = ?'); args.push(pos); }
  if (kw) {
    where.push(`(lower(e.headword) LIKE ?
      OR EXISTS (SELECT 1 FROM vocab_forms f WHERE f.entry_id = e.id AND lower(f.form) LIKE ?)
      OR EXISTS (SELECT 1 FROM vocab_senses s WHERE s.entry_id = e.id AND lower(s.vi) LIKE ?))`);
    const like = '%' + kw + '%';
    args.push(like, like, like);
  }
  const w = where.length ? ' WHERE ' + where.join(' AND ') : '';

  const entries = q.all(
    `SELECT e.* FROM vocab_entries e ${w} ORDER BY e.sort, e.headword, e.pos LIMIT ? OFFSET ?`,
    ...args, limit, offset).map(e => ({
      headword: e.headword, pos: e.pos, level: e.level, levelSource: e.level_source,
      ipaUk: e.ipa_uk, ipaUs: e.ipa_us, freqRank: e.freq_rank,
      senses: q.val('SELECT COUNT(*) c FROM vocab_senses WHERE entry_id=?', e.id),
      forms: q.val('SELECT COUNT(*) c FROM vocab_forms WHERE entry_id=?', e.id),
      collocations: q.val('SELECT COUNT(*) c FROM collocations WHERE entry_id=?', e.id)
    }));

  res.set('Cache-Control', 'public, max-age=300').json({
    total: q.val('SELECT COUNT(*) c FROM vocab_entries'),
    matched: q.val(`SELECT COUNT(*) c FROM vocab_entries e ${w}`, ...args),
    count: entries.length,
    levels: q.all('SELECT level, COUNT(*) c FROM vocab_entries GROUP BY level ORDER BY level')
      .map(r => ({ id: r.level, count: r.c })),
    parts: q.all('SELECT pos, COUNT(*) c FROM vocab_entries GROUP BY pos ORDER BY pos')
      .map(r => ({ id: r.pos, count: r.c })),
    entries
  });
});

/* One headword with everything under it. Every part of speech is returned
   together — "book" the noun and "book" the verb are separate entries, but a
   learner looking the word up wants both, and which one they meant is exactly
   what they do not know yet. */
router.get('/learn/vocab/:headword', (req, res) => {
  const head = str(req.params.headword, 60).toLowerCase();
  const found = q.all(
    'SELECT * FROM vocab_entries WHERE lower(headword) = ? ORDER BY sort, pos', head);
  if (!found.length) return res.status(404).json({ error: 'No such word' });

  res.set('Cache-Control', 'public, max-age=300').json({
    headword: found[0].headword,
    entries: found.map(e => ({
      pos: e.pos, level: e.level, levelSource: e.level_source,
      ipaUk: e.ipa_uk, ipaUs: e.ipa_us, freqRank: e.freq_rank,
      /* Source and licence travel with the entry: docs/LEARNING.md §1.3 asks for
         attribution, and these lists are shared under CC BY-SA. */
      source: e.source, licence: e.licence,
      senses: q.all('SELECT * FROM vocab_senses WHERE entry_id=? ORDER BY sort, id', e.id)
        .map(s => ({
          en: s.en, vi: s.vi, level: s.level, note: s.note,
          examples: q.all('SELECT * FROM vocab_examples WHERE sense_id=? ORDER BY sort, id', s.id)
            .map(x => ({ en: x.en, vi: x.vi, source: x.source, licence: x.licence }))
        })),
      forms: q.all('SELECT * FROM vocab_forms WHERE entry_id=? ORDER BY sort, id', e.id)
        .map(f => ({ form: f.form, kind: f.kind, note: f.note })),
      collocations: q.all('SELECT * FROM collocations WHERE entry_id=? ORDER BY sort, id', e.id)
        .map(c => ({
          chunk: c.chunk, kind: c.kind, level: c.level,
          exEn: c.ex_en, exVi: c.ex_vi, note: c.note
        }))
    }))
  });
});

module.exports = router;
