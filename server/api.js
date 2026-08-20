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
const { asyncRoutes } = require('./async-route');
const { q, tx, nowISO, jparse, makeCode, audit } = require('./db');
const A = require('./auth');
const totp = require('./totp');
const EXAM_FORMATS = require('./data/exam-formats');
const storage = require('./storage');
const PLANS = require('./data/plans');
const { entitlementOf } = require('./entitlements');
const classroom = require('./classroom');
const LINKING = require('./data/linking-words');

const router = asyncRoutes(express.Router());
router.use(express.json({ limit: '1mb' }));

/* ============================ Helpers ============================ */
const SKILLS = ['listening', 'reading', 'writing', 'speaking'];
const LEVELS = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2'];
const QTYPES = ['mcq', 'gap', 'essay', 'speaking'];
const STATUSES = ['draft', 'published', 'archived'];

const bad = (res, msg) => res.status(400).json({ error: msg });
const str = (v, max) => (typeof v === 'string' ? v.trim().slice(0, max || 400) : '');
const int = (v, dflt) => (Number.isFinite(+v) ? Math.trunc(+v) : dflt);
const clamp = (n, lo, hi) => Math.min(hi, Math.max(lo, n));
const slug = s => str(s, 60).toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')
  .replace(/đ/g, 'd').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
const daysAgoISO = n => new Date(Date.now() - n * 86400000).toISOString();

async function familyExists(id) { return !!await q.val('SELECT 1 FROM families WHERE id=?', id); }

/** Describe in words what a code unlocks */
async function unlockLabel(type, ref) {
  if (type === 'test') {
    const t = await q.get('SELECT title FROM tests WHERE id=?', ref);
    return t ? t.title : 'Test ' + ref;
  }
  if (type === 'family') {
    const f = await q.get('SELECT name FROM families WHERE id=?', ref);
    return 'All of ' + (f ? f.name : ref);
  }
  const names = await Promise.all(String(ref).split(',').map(async id => {
    const f = await q.get('SELECT name FROM families WHERE id=?', id);
    return f ? f.name : id;
  }));
  return 'Combo ' + names.join(' + ');
}

/* ======================= Admin sign-in ======================= */
router.post('/admin/login', A.csrfGuard, async (req, res) => {
  const username = str(req.body && req.body.username, 60);
  const password = typeof (req.body && req.body.password) === 'string' ? req.body.password : '';
  if (!username || !password) return bad(res, 'Enter a username and a password.');

  const key = A.throttleKey(req, username);
  const lockedFor = await A.isLocked(key);
  if (lockedFor) {
    return res.status(429).json({
      error: 'Too many failed attempts. Try again in ' + Math.ceil(lockedFor / 60) + ' minutes.'
    });
  }

  const admin = await q.get('SELECT * FROM admins WHERE username=? AND active=1', username);
  // Still hash once when no account is found, so response time gives nothing away
  const ok = admin ? A.verifyPassword(password, admin.pass_hash)
                   : A.verifyPassword(password, A.hashPassword('does-not-exist'));
  if (!admin || !ok) {
    await A.noteFailure(key);
    await audit({ ip: req.ip }, 'admin.login.failed', 'admins/' + username, {});
    return res.status(401).json({ error: 'That username or password is not right.' });
  }

  /* Second factor, when this account has one. An administrator with no second
     factor sees exactly the behaviour it always had — the feature is off until
     somebody turns it on, per the rule for anything that needs setting up.

     The wrong code counts as a failed attempt against the same lockout as a
     wrong password. Otherwise the password stays rate-limited and the six
     digits standing behind it do not, which is the wrong way round: those six
     digits are a million guesses, not a passphrase. */
  if (A.totpEnabled(admin)) {
    const factor = await A.verifySecondFactor(admin, req.body && req.body.code);
    if (!factor) {
      await A.noteFailure(key);
      await audit({ ip: req.ip }, 'admin.login.2fa_failed', 'admins/' + username, {});
      /* Say the password was right: whoever is holding it already knows, and a
         vague answer here just leaves an administrator staring at a screen that
         will not say which of the two fields it disliked. */
      return res.status(401).json({
        error: (req.body && req.body.code)
          ? 'That code is not right, or it has already been used.'
          : 'This account needs a code from your authenticator app.',
        needCode: true
      });
    }
    if (factor === 'recovery') {
      const left = await A.recoveryCodesLeft(admin.id);
      await audit({ admin, ip: req.ip }, 'admin.login.recovery_used', 'admins/' + admin.username, { left });
      console.warn(`[2fa] ${admin.username} signed in with a recovery code; ${left} left`);
    }
  }

  await A.clearFailures(key);
  await A.createSession(admin.id, req, res);
  await q.run('UPDATE admins SET last_login_at=? WHERE id=?', nowISO(), admin.id);
  await audit({ admin, ip: req.ip }, 'admin.login', 'admins/' + admin.username, {});
  res.json({ ok: true, admin: { username: admin.username, name: admin.name, role: admin.role } });
});

router.post('/admin/logout', A.csrfGuard, async (req, res) => {
  const admin = await A.currentAdmin(req);
  if (admin) await audit({ admin, ip: req.ip }, 'admin.logout', 'admins/' + admin.username, {});
  await A.destroySession(req, res);
  res.json({ ok: true });
});

router.get('/admin/me', async (req, res) => {
  const admin = await A.currentAdmin(req);
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
router.get('/admin/reports', async (req, res) => {
  // The window: only 7, 30 and 90 are accepted, so nobody types ?days=100000 and strains the database
  const days = [7, 30, 90].includes(int(req.query.days, 30)) ? int(req.query.days, 30) : 30;
  const from = daysAgoISO(days);
  const prevFrom = daysAgoISO(days * 2);
  const hnay = nowISO().slice(0, 10);
  const sau7ngay = new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 10);

  /* One metric = this period's value + the previous one + the percentage change.
     delta is null when the previous period was 0, because "up infinitely" is not information. */
  const kpiOf = async (sql, ...args) => {
    const value = await q.val(sql, from, nowISO(), ...args) || 0;
    const prev = await q.val(sql, prevFrom, from, ...args) || 0;
    return { value, prev, delta: prev ? Math.round(((value - prev) / prev) * 100) : null };
  };

  const kpi = {
    users: await kpiOf('SELECT COUNT(*) c FROM users WHERE created_at >= ? AND created_at < ?'),
    redeems: await kpiOf('SELECT COUNT(*) c FROM codes WHERE redeemed_at >= ? AND redeemed_at < ?'),
    revenue: await kpiOf("SELECT COALESCE(SUM(amount),0) s FROM orders WHERE status='paid' AND created_at >= ? AND created_at < ?"),
    orders: await kpiOf("SELECT COUNT(*) c FROM orders WHERE status='paid' AND created_at >= ? AND created_at < ?")
  };

  /* The student funnel — cumulative state, not bounded by the period. Percentages
     are of the first step, to show total attrition rather than step-on-step.

     Each step must be a SUBSET of the one before, or a later bar grows again and the
     funnel shape stops meaning anything. That is why the last step is "activated a
     code AND signed in recently" rather than everyone who signed in recently — people
     with no code can sign in too, so that figure does not sit under step three. */
  const fTong = await q.val('SELECT COUNT(*) c FROM users');
  const fXacThuc = await q.val('SELECT COUNT(*) c FROM users WHERE verified=1');
  const fKichHoat = await q.val(
    "SELECT COUNT(DISTINCT c.user_id) c FROM codes c JOIN users u ON u.id = c.user_id" +
    " WHERE c.status='redeemed' AND u.verified=1");
  const fHoatDong = await q.val(
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
    total: await q.val('SELECT COUNT(*) c FROM users'),
    new7: await q.val('SELECT COUNT(*) c FROM users WHERE created_at >= ?', d7),
    new30: await q.val('SELECT COUNT(*) c FROM users WHERE created_at >= ?', d30),
    verified: await q.val('SELECT COUNT(*) c FROM users WHERE verified=1'),
    locked: await q.val("SELECT COUNT(*) c FROM users WHERE status='locked'")
  };
  const codes = {
    total: await q.val('SELECT COUNT(*) c FROM codes'),
    unused: await q.val("SELECT COUNT(*) c FROM codes WHERE status='unused'"),
    redeemed: await q.val("SELECT COUNT(*) c FROM codes WHERE status='redeemed'"),
    revoked: await q.val("SELECT COUNT(*) c FROM codes WHERE status='revoked'"),
    expired: await q.val("SELECT COUNT(*) c FROM codes WHERE status='unused' AND expires_at IS NOT NULL AND expires_at < ?", nowISO().slice(0, 10)),
    redeemed7: await q.val("SELECT COUNT(*) c FROM codes WHERE redeemed_at >= ?", d7)
  };
  const content = {
    tests: await q.val('SELECT COUNT(*) c FROM tests'),
    published: await q.val("SELECT COUNT(*) c FROM tests WHERE status='published'"),
    draft: await q.val("SELECT COUNT(*) c FROM tests WHERE status='draft'"),
    questions: await q.val("SELECT COUNT(*) c FROM questions WHERE status='active'"),
    families: await q.val('SELECT COUNT(*) c FROM families')
  };
  const revenue = {
    total: await q.val("SELECT COALESCE(SUM(amount),0) s FROM orders WHERE status='paid'"),
    d30: await q.val("SELECT COALESCE(SUM(amount),0) s FROM orders WHERE status='paid' AND created_at >= ?", d30),
    orders30: await q.val("SELECT COUNT(*) c FROM orders WHERE created_at >= ?", d30)
  };

  // A daily series across the chosen window: new users, codes activated, revenue
  const series = [];
  for (let i = days - 1; i >= 0; i--) {
    const day = new Date(Date.now() - i * 86400000).toISOString().slice(0, 10);
    series.push({
      day,
      users: await q.val('SELECT COUNT(*) c FROM users WHERE substr(created_at,1,10)=?', day),
      redeems: await q.val('SELECT COUNT(*) c FROM codes WHERE substr(redeemed_at,1,10)=?', day),
      revenue: await q.val("SELECT COALESCE(SUM(amount),0) s FROM orders WHERE status='paid' AND substr(created_at,1,10)=?", day)
    });
  }

  const byFamily = await q.all(`
    SELECT f.id, f.name, f.status,
           (SELECT COUNT(*) FROM tests t WHERE t.family_id=f.id) tests,
           (SELECT COUNT(*) FROM tests t WHERE t.family_id=f.id AND t.status='published') published,
           (SELECT COUNT(*) FROM questions qq WHERE qq.family_id=f.id AND qq.status='active') questions,
           (SELECT COUNT(*) FROM codes c WHERE c.unlock_type='family' AND c.unlock_ref=f.id AND c.status='redeemed') unlocks,
           (SELECT COUNT(*) FROM users u WHERE u.interests_json LIKE '%"' || f.id || '"%') interested
      FROM families f ORDER BY f.sort`);

  const bankGaps = await q.all(`
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

  const recent = await q.all(
    'SELECT admin_name, action, target, at FROM audit ORDER BY id DESC LIMIT 8');

  /* Revenue by plan within the period. Grouped by package_id; an order with no plan
     attached (issued by hand) is grouped by its own name so it stays visible. */
  const revenueByPackage = await q.all(`
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

  const hetHan = await q.val(
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

  const treoXacThuc = await q.val(
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
router.get('/admin/questions', async (req, res) => {
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
  const total = await q.val('SELECT COUNT(*) c ' + sql, ...args);
  const rows = await q.all(
    `SELECT id, family_id, skill, level, type, part, prompt, options_json, answer, explanation, tags_json, status, created_at,
            audio_key, audio_bytes, audio_at
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
      hasAudio: !!r.audio_key, audioBytes: r.audio_bytes || 0, audioAt: r.audio_at || null
    }))
  });
});

async function readQuestion(body) {
  const familyId = str(body.familyId, 20);
  const skill = str(body.skill, 20);
  const level = str(body.level, 5).toUpperCase();
  const type = str(body.type, 20);
  const prompt = str(body.prompt, 4000);
  if (!await familyExists(familyId)) return { err: 'That exam is not valid.' };
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

router.post('/admin/questions', async (req, res) => {
  const d = await readQuestion(req.body || {});
  if (d.err) return bad(res, d.err);
  const r = await q.run(
    `INSERT INTO questions (family_id,skill,level,type,part,prompt,options_json,answer,explanation,tags_json,status,created_at,created_by)
     VALUES (?,?,?,?,?,?,?,?,?,?,'active',?,?)`,
    d.familyId, d.skill, d.level, d.type, d.part, d.prompt, JSON.stringify(d.options), d.answer,
    d.explanation, JSON.stringify(d.tags), nowISO(), req.admin.id);
  await audit(req, 'question.create', 'questions/' + r.lastInsertRowid, { family: d.familyId, skill: d.skill, part: d.part });
  res.status(201).json({ id: Number(r.lastInsertRowid) });
});

router.put('/admin/questions/:id', async (req, res) => {
  const id = int(req.params.id, 0);
  if (!await q.val('SELECT 1 FROM questions WHERE id=?', id)) return res.status(404).json({ error: 'No such question.' });
  const d = await readQuestion(req.body || {});
  if (d.err) return bad(res, d.err);
  await q.run(`UPDATE questions SET family_id=?, skill=?, level=?, type=?, part=?, prompt=?, options_json=?, answer=?, explanation=?, tags_json=?
          WHERE id=?`,
    d.familyId, d.skill, d.level, d.type, d.part, d.prompt, JSON.stringify(d.options), d.answer,
    d.explanation, JSON.stringify(d.tags), id);
  await audit(req, 'question.update', 'questions/' + id, {});
  res.json({ ok: true });
});

/** Withdraw or reinstate a question (never a hard delete, so old tests keep their content) */
router.post('/admin/questions/:id/status', async (req, res) => {
  const id = int(req.params.id, 0);
  const status = str(req.body && req.body.status, 20);
  if (!['active', 'retired'].includes(status)) return bad(res, 'That status is not valid.');
  const r = await q.run('UPDATE questions SET status=? WHERE id=?', status, id);
  if (!r.changes) return res.status(404).json({ error: 'No such question.' });
  await audit(req, 'question.status', 'questions/' + id, { status });
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
  const row = await q.get('SELECT id, audio_key FROM questions WHERE id=?', id);
  if (!row) return res.status(404).json({ error: 'No such question.' });

  const buf = Buffer.isBuffer(req.body) ? req.body : null;
  const why = storage.validate(buf, req.get('content-type'));
  if (why) return bad(res, why);

  try {
    const saved = await storage.put(buf, req.get('content-type'));
    /* Replacing an existing file: write the new key first, then drop the old
       one. If the delete fails the row still points at a file that exists. */
    const old = row.audio_key;
    await q.run('UPDATE questions SET audio_key=?, audio_bytes=?, audio_at=? WHERE id=?',
      saved.key, saved.bytes, nowISO(), id);
    if (old && old !== saved.key) await storage.remove(old).catch(() => {});
    await audit(req, 'question.audio.upload', 'questions/' + id, { bytes: saved.bytes, driver: saved.driver });
    res.status(201).json({ ok: true, bytes: saved.bytes, driver: saved.driver });
  } catch (e) {
    if (e.code === 'INVALID_AUDIO') return bad(res, e.message);
    console.error('[audio] upload failed', e);
    res.status(502).json({ error: 'The audio file could not be saved. Check the storage configuration.' });
  }
});

router.get('/admin/questions/:id/audio', async (req, res) => {
  const row = await q.get('SELECT audio_key, audio_bytes FROM questions WHERE id=?', int(req.params.id, 0));
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
  const row = await q.get('SELECT audio_key FROM questions WHERE id=?', id);
  if (!row) return res.status(404).json({ error: 'No such question.' });
  if (!row.audio_key) return res.json({ ok: true });
  await q.run('UPDATE questions SET audio_key=NULL, audio_bytes=NULL, audio_at=NULL WHERE id=?', id);
  await storage.remove(row.audio_key).catch(() => {});
  await audit(req, 'question.audio.delete', 'questions/' + id, {});
  res.json({ ok: true });
});

/** Bulk import questions (pasted JSON, or CSV already split up on the client) */
router.post('/admin/questions/bulk', async (req, res) => {
  const items = Array.isArray(req.body && req.body.items) ? req.body.items : null;
  if (!items || !items.length) return bad(res, 'There are no questions to import.');
  if (items.length > 500) return bad(res, 'At most 500 items per import.');

  const errors = [];
  const ok = [];
  /* A loop rather than forEach: the callback awaits, and forEach would return
     before a single row had been read — leaving both arrays empty. */
  for (const [i, raw] of items.entries()) {
    const d = await readQuestion(raw || {});
    if (d.err) errors.push({ row: i + 1, error: d.err }); else ok.push(d);
  }
  if (!ok.length) return res.status(400).json({ error: 'No row was valid.', errors });

  await tx(() => {
    const ins = require('./db').db.prepare(
      `INSERT INTO questions (family_id,skill,level,type,part,prompt,options_json,answer,explanation,tags_json,status,created_at,created_by)
       VALUES (?,?,?,?,?,?,?,?,?,?,'active',?,?)`);
    const at = nowISO();
    for (const d of ok) {
      ins.run(d.familyId, d.skill, d.level, d.type, d.part, d.prompt, JSON.stringify(d.options),
        d.answer, d.explanation, JSON.stringify(d.tags), at, req.admin.id);
    }
  });
  await audit(req, 'question.bulk', 'questions', { inserted: ok.length, failed: errors.length });
  res.status(201).json({ inserted: ok.length, failed: errors.length, errors: errors.slice(0, 20) });
});

/** A sample CSV file for bulk question import.
 *  Served from the server (rather than built as a blob on the client) so the CSP stays strict. */
router.get('/admin/questions/template.csv', async (req, res) => {
  const fam = await q.get('SELECT id FROM families ORDER BY sort LIMIT 1');
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
router.get('/admin/questions/availability', async (req, res) => {
  const family = str(req.query.family, 20);
  const level = str(req.query.level, 5).toUpperCase();
  if (!await familyExists(family)) return bad(res, 'That exam is not valid.');
  const rows = await q.all(
    `SELECT skill, COUNT(*) exact FROM questions
      WHERE family_id=? AND level=? AND status='active' GROUP BY skill`, family, level);
  const any = await q.all(
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
  const parts = await Promise.all(EXAM_FORMATS.partsOf(family).map(async letter => {
    const sec = EXAM_FORMATS.sectionOfPart(family, letter) || {};
    const bank = await bankCount(family, sec.skill, sec.types, level, letter);
    return {
      part: letter, name: sec.name || letter, skill: sec.skill || '',
      need: sec.items || 0, needsAudio: !!sec.needsAudio,
      exact: bank.exact, total: bank.total,
      short: Math.max(0, (sec.items || 0) - bank.total)
    };
  }));
  /* Items with no part yet: they belong to no pool, so they are counted separately
     rather than quietly vanishing from the report. */
  const untagged = EXAM_FORMATS.partsOf(family).length
    ? await q.val("SELECT COUNT(*) c FROM questions WHERE family_id=? AND status='active' AND part IS NULL", family)
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
async function bankCount(familyId, skill, types, level, part) {
  const { sql, args } = poolWhere(familyId, skill, types, part);
  const base = 'SELECT COUNT(*) c FROM questions WHERE ' + sql;
  return {
    total: await q.val(base, ...args),
    exact: level ? await q.val(base + ' AND level=?', ...args, level) : 0
  };
}

/** Same pool as bankCount, but only the items that already have an MP3.
    A VPET audio part cannot be generated from items that have no sound. */
async function audioReadyCount(familyId, skill, types, level, part) {
  const { sql, args } = poolWhere(familyId, skill, types, part);
  const base = 'SELECT COUNT(*) c FROM questions WHERE ' + sql + ' AND audio_key IS NOT NULL';
  return {
    total: await q.val(base, ...args),
    exact: level ? await q.val(base + ' AND level=?', ...args, level) : 0
  };
}

router.get('/admin/exam-formats', async (req, res) => {
  const familyId = str(req.query.familyId, 20);
  const level = LEVELS.includes(str(req.query.level, 5).toUpperCase())
    ? str(req.query.level, 5).toUpperCase() : '';
  const strict = req.query.strict === '1';

  const list = await Promise.all(EXAM_FORMATS.FORMATS
    .filter(f => !familyId || f.familyId === familyId)
    .map(async f => {
      const fam = await q.get('SELECT name, status FROM families WHERE id=?', f.familyId);
      const sections = await Promise.all(f.sections.map(async s => {
        const bank = await bankCount(f.familyId, s.skill, s.types, level, s.part);
        const have = strict ? bank.exact : bank.total;
        /* Audio parts are only buildable from items that carry an MP3, so they
           get their own shortfall alongside the plain bank count. */
        const withAudio = s.needsAudio ? await audioReadyCount(f.familyId, s.skill, s.types, level, s.part) : null;
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
      }));
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
    }));

  res.set('Cache-Control', 'no-store').json({ level, strict, formats: list });
});

/* ============================ TESTS ============================ */
async function testDetail(id) {
  const t = await q.get('SELECT * FROM tests WHERE id=?', id);
  if (!t) return null;
  const sections = await Promise.all((await q.all('SELECT * FROM sections WHERE test_id=? ORDER BY sort, id', id)).map(async s => {
    const items = await q.all(
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
  }));
  return {
    id: t.id, familyId: t.family_id, title: t.title, level: t.level,
    durationMin: t.duration_min, scoring: t.scoring, guide: jparse(t.guide_json, []),
    status: t.status, buildMode: t.build_mode, createdAt: t.created_at, updatedAt: t.updated_at,
    sections,
    totalItems: sections.reduce((a, s) => a + s.items.length, 0)
  };
}

router.get('/admin/tests', async (req, res) => {
  const where = [];
  const args = [];
  if (req.query.family) { where.push('t.family_id = ?'); args.push(str(req.query.family, 20)); }
  if (req.query.status) { where.push('t.status = ?'); args.push(str(req.query.status, 20)); }
  if (req.query.q) { where.push('t.title LIKE ?'); args.push('%' + str(req.query.q, 80) + '%'); }
  const w = where.length ? 'WHERE ' + where.join(' AND ') : '';
  const rows = await q.all(`
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

router.get('/admin/tests/:id', async (req, res) => {
  const t = await testDetail(str(req.params.id, 60));
  if (!t) return res.status(404).json({ error: 'No such test.' });
  res.json(t);
});

/** Create an empty test (the by-hand route) */
router.post('/admin/tests', async (req, res) => {
  const b = req.body || {};
  const familyId = str(b.familyId, 20);
  const title = str(b.title, 200);
  const level = str(b.level, 5).toUpperCase();
  if (!await familyExists(familyId)) return bad(res, 'That exam is not valid.');
  if (title.length < 3) return bad(res, 'That test name is too short.');
  if (!LEVELS.includes(level)) return bad(res, 'That level is not valid.');

  let id = slug(b.id || (familyId + '-' + level + '-' + title)).slice(0, 50) || (familyId + '-' + Date.now());
  let i = 1;
  while (await q.val('SELECT 1 FROM tests WHERE id=?', id)) id = id.replace(/-\d+$/, '') + '-' + (++i);

  const at = nowISO();
  await q.run(`INSERT INTO tests (id,family_id,title,level,duration_min,scoring,guide_json,status,build_mode,created_at,updated_at,created_by)
         VALUES (?,?,?,?,?,?,?,'draft',?,?,?,?)`,
    id, familyId, title, level, int(b.durationMin, 0), str(b.scoring, 300),
    JSON.stringify(Array.isArray(b.guide) ? b.guide.map(g => str(g, 300)).filter(Boolean) : []),
    str(b.buildMode, 10) === 'auto' ? 'auto' : 'manual', at, at, req.admin.id);
  await audit(req, 'test.create', 'tests/' + id, { title, familyId });
  res.status(201).json(await testDetail(id));
});

router.put('/admin/tests/:id', async (req, res) => {
  const id = str(req.params.id, 60);
  if (!await q.val('SELECT 1 FROM tests WHERE id=?', id)) return res.status(404).json({ error: 'No such test.' });
  const b = req.body || {};
  const title = str(b.title, 200);
  const level = str(b.level, 5).toUpperCase();
  if (title.length < 3) return bad(res, 'That test name is too short.');
  if (!LEVELS.includes(level)) return bad(res, 'That level is not valid.');
  await q.run(`UPDATE tests SET title=?, level=?, duration_min=?, scoring=?, guide_json=?, updated_at=? WHERE id=?`,
    title, level, int(b.durationMin, 0), str(b.scoring, 300),
    JSON.stringify(Array.isArray(b.guide) ? b.guide.map(g => str(g, 300)).filter(Boolean) : []),
    nowISO(), id);
  await audit(req, 'test.update', 'tests/' + id, {});
  res.json(await testDetail(id));
});

/** Change status: publishing is allowed only once every part has questions */
router.post('/admin/tests/:id/status', async (req, res) => {
  const id = str(req.params.id, 60);
  const status = str(req.body && req.body.status, 20);
  if (!STATUSES.includes(status)) return bad(res, 'That status is not valid.');
  const t = await testDetail(id);
  if (!t) return res.status(404).json({ error: 'No such test.' });

  if (status === 'published') {
    /* The platform is only selling VPET right now. Letting a parked family's
       test go live would put it in the catalogue and on sale, which is the
       one thing parking it was meant to prevent. */
    const fam = await q.get('SELECT name, status FROM families WHERE id=?', t.familyId);
    if (fam && fam.status === 'coming_soon') {
      return bad(res, fam.name + ' is not ready yet, so its tests cannot be published. '
        + 'Open this exam in server/db.js (FAMILIES) first.');
    }
    if (!t.sections.length) return bad(res, 'This test has no parts, so it cannot be published.');
    const empty = t.sections.filter(s => !s.items.length).map(s => s.name);
    if (empty.length) return bad(res, 'These parts have no questions yet: ' + empty.join(', '));
  }
  await q.run('UPDATE tests SET status=?, updated_at=? WHERE id=?', status, nowISO(), id);
  await audit(req, 'test.status', 'tests/' + id, { status });
  res.json({ ok: true, status });
});

router.delete('/admin/tests/:id', async (req, res) => {
  const id = str(req.params.id, 60);
  const used = await q.val("SELECT COUNT(*) c FROM codes WHERE unlock_type='test' AND unlock_ref=?", id);
  if (used) return bad(res, used + ' codes point at this test. Archive it rather than deleting it.');
  /* Same answer for a test somebody has sat. attempts.test_id has no ON DELETE
     CASCADE - deliberately, because a sitting is a person's record and must not
     vanish with the paper - so the delete used to fail on the foreign key and
     come back as a 500 with a stack trace in the log. Refusing it in words, the
     way the codes case already did, is the same outcome said properly. */
  const sat = await q.val('SELECT COUNT(*) c FROM attempts WHERE test_id=?', id);
  if (sat) {
    return bad(res, sat + ' sitting(s) have been taken on this test, so it cannot be deleted. '
      + 'Archive it instead: it leaves the catalogue and the results stay readable.');
  }
  const r = await q.run('DELETE FROM tests WHERE id=?', id);
  if (!r.changes) return res.status(404).json({ error: 'No such test.' });
  await audit(req, 'test.delete', 'tests/' + id, {});
  res.json({ ok: true });
});

/* ---- Sections ---- */
router.post('/admin/tests/:id/sections', async (req, res) => {
  const id = str(req.params.id, 60);
  if (!await q.val('SELECT 1 FROM tests WHERE id=?', id)) return res.status(404).json({ error: 'No such test.' });
  const b = req.body || {};
  const name = str(b.name, 100);
  const skill = str(b.skill, 20);
  if (name.length < 2) return bad(res, 'That part name is too short.');
  if (!SKILLS.includes(skill)) return bad(res, 'That skill is not valid.');
  /* Attach the part letter if this exam has a part table — so a later reshuffle
     still knows which part to draw from. */
  const fam = await q.val('SELECT family_id FROM tests WHERE id=?', id);
  const allowed = EXAM_FORMATS.partsOf(fam);
  const part = str(b.part, 2).toUpperCase();
  if (part && !allowed.includes(part)) {
    return bad(res, 'That part is not valid. This exam has the parts: ' + (allowed.join(', ') || 'none') + '.');
  }
  const sort = (await q.val('SELECT COALESCE(MAX(sort),-1) s FROM sections WHERE test_id=?', id)) + 1;
  const r = await q.run('INSERT INTO sections (test_id,name,skill,type,minutes,sort,part) VALUES (?,?,?,?,?,?,?)',
    id, name, skill, str(b.type, 100) || 'Multiple choice', clamp(int(b.minutes, 0), 0, 600), sort, part || null);
  await q.run('UPDATE tests SET updated_at=? WHERE id=?', nowISO(), id);
  await audit(req, 'section.create', 'tests/' + id, { section: name, part: part || null });
  res.status(201).json({ id: Number(r.lastInsertRowid) });
});

router.put('/admin/sections/:sid', async (req, res) => {
  const sid = int(req.params.sid, 0);
  const s = await q.get('SELECT * FROM sections WHERE id=?', sid);
  if (!s) return res.status(404).json({ error: 'No such part.' });
  const b = req.body || {};
  await q.run('UPDATE sections SET name=?, type=?, minutes=? WHERE id=?',
    str(b.name, 100) || s.name, str(b.type, 100) || s.type, clamp(int(b.minutes, s.minutes), 0, 600), sid);
  await q.run('UPDATE tests SET updated_at=? WHERE id=?', nowISO(), s.test_id);
  await audit(req, 'section.update', 'sections/' + sid, {});
  res.json({ ok: true });
});

router.delete('/admin/sections/:sid', async (req, res) => {
  const sid = int(req.params.sid, 0);
  const s = await q.get('SELECT test_id FROM sections WHERE id=?', sid);
  if (!s) return res.status(404).json({ error: 'No such part.' });
  await q.run('DELETE FROM sections WHERE id=?', sid);
  await q.run('UPDATE tests SET updated_at=? WHERE id=?', nowISO(), s.test_id);
  await audit(req, 'section.delete', 'sections/' + sid, {});
  res.json({ ok: true });
});

/** Attach questions to a part (by hand, chosen from the bank) */
router.post('/admin/sections/:sid/items', async (req, res) => {
  const sid = int(req.params.sid, 0);
  const s = await q.get('SELECT * FROM sections WHERE id=?', sid);
  if (!s) return res.status(404).json({ error: 'No such part.' });
  const ids = Array.isArray(req.body && req.body.questionIds)
    ? req.body.questionIds.map(x => int(x, 0)).filter(Boolean) : [];
  if (!ids.length) return bad(res, 'No questions were chosen.');

  const test = await q.get('SELECT family_id FROM tests WHERE id=?', s.test_id);
  let added = 0, skipped = 0;
  await tx(async () => {
    let sort = (await q.val('SELECT COALESCE(MAX(sort),-1) s FROM section_items WHERE section_id=?', sid)) + 1;
    for (const qid of ids) {
      const row = await q.get("SELECT family_id, skill FROM questions WHERE id=? AND status='active'", qid);
      // Only items from the same exam and the same skill as the part
      if (!row || row.family_id !== test.family_id || row.skill !== s.skill) { skipped++; continue; }
      const r = await q.run('INSERT OR IGNORE INTO section_items (section_id,question_id,sort) VALUES (?,?,?)', sid, qid, sort++);
      if (r.changes) added++; else skipped++;
    }
    await q.run('UPDATE tests SET updated_at=? WHERE id=?', nowISO(), s.test_id);
  });
  await audit(req, 'section.items.add', 'sections/' + sid, { added, skipped });
  res.json({ added, skipped });
});

router.delete('/admin/items/:itemId', async (req, res) => {
  const itemId = int(req.params.itemId, 0);
  const row = await q.get(`SELECT si.id, s.test_id FROM section_items si
                       JOIN sections s ON s.id = si.section_id WHERE si.id=?`, itemId);
  if (!row) return res.status(404).json({ error: 'No such item in this part.' });
  await q.run('DELETE FROM section_items WHERE id=?', itemId);
  await q.run('UPDATE tests SET updated_at=? WHERE id=?', nowISO(), row.test_id);
  await audit(req, 'section.items.remove', 'items/' + itemId, {});
  res.json({ ok: true });
});

/** GENERATE a test from a blueprint: drawn at random from the question bank.
 *  body: { familyId, level, title?, blueprint:[{name,skill,type,items,minutes}], strictLevel? }
 *  - strictLevel=true: only items at that level; by default the level is preferred, then others.
 *  - Returns a clear error when the bank does not hold enough.
 */
router.post('/admin/tests/generate', async (req, res) => {
  const b = req.body || {};
  const familyId = str(b.familyId, 20);
  const level = str(b.level, 5).toUpperCase();
  const strict = !!b.strictLevel;
  if (!await familyExists(familyId)) return bad(res, 'That exam is not valid.');
  if (!LEVELS.includes(level)) return bad(res, 'That level is not valid.');
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
    const pool = strict
      ? await q.all(`SELECT id FROM questions WHERE ${poolSql} AND level=?`, ...poolArgs, level)
      : await q.all(`SELECT id, (level=?) exact FROM questions WHERE ${poolSql} ORDER BY exact DESC`,
              level, ...poolArgs);

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

  const title = str(b.title, 200) || ((await q.get('SELECT name FROM families WHERE id=?', familyId)).name +
    ' generated ' + level + ' ' + new Date().toISOString().slice(0, 10));
  let id = slug(familyId + '-auto-' + level + '-' + Date.now().toString(36));
  const at = nowISO();

  await tx(async () => {
    await q.run(`INSERT INTO tests (id,family_id,title,level,duration_min,scoring,guide_json,status,build_mode,created_at,updated_at,created_by)
           VALUES (?,?,?,?,?,?,?,'draft','auto',?,?,?)`,
      id, familyId, title, level,
      bp.reduce((a, s) => a + clamp(int(s.minutes, 0), 0, 600), 0),
      str(b.scoring, 300), JSON.stringify(Array.isArray(b.guide) ? b.guide.map(g => str(g, 300)) : []),
      at, at, req.admin.id);

    /* A loop rather than forEach: each part reads back the id of the row it
       just inserted, so these writes have to stay in order. */
    for (const [i, p] of picked.entries()) {
      await q.run('INSERT INTO sections (test_id,name,skill,type,minutes,sort,part) VALUES (?,?,?,?,?,?,?)',
        id, str(p.sec.name, 100) || p.sec.skill, str(p.sec.skill, 20),
        str(p.sec.type, 100) || 'Multiple choice', clamp(int(p.sec.minutes, 0), 0, 600), i, p.part || null);
      const sid = await q.val('SELECT id FROM sections WHERE test_id=? ORDER BY id DESC LIMIT 1', id);
      for (const [j, qid] of p.ids.entries()) {
        await q.run('INSERT OR IGNORE INTO section_items (section_id,question_id,sort) VALUES (?,?,?)', sid, qid, j);
      }
    }
  });

  await audit(req, 'test.generate', 'tests/' + id, { familyId, level, sections: bp.length, items: usedIds.size });
  res.status(201).json(await testDetail(id));
});

/** Redraw every item in a part (keeping the count) */
router.post('/admin/sections/:sid/reshuffle', async (req, res) => {
  const sid = int(req.params.sid, 0);
  const s = await q.get('SELECT * FROM sections WHERE id=?', sid);
  if (!s) return res.status(404).json({ error: 'No such part.' });
  const t = await q.get('SELECT family_id, level FROM tests WHERE id=?', s.test_id);
  const want = await q.val('SELECT COUNT(*) c FROM section_items WHERE section_id=?', sid);
  if (!want) return bad(res, 'This part has no items to redraw.');

  /* A redraw has to draw from the same pool the generator used. This used to filter
     on skill alone: redrawing one VPET Speaking part could pull in items belonging to
     another Speaking part, and a multiple-choice Reading part could receive gap-fill
     items. The part letter stored on the section says where to draw, and the blueprint
     says which item types that part accepts. */
  const blueprint = s.part ? EXAM_FORMATS.sectionOfPart(t.family_id, s.part) : null;
  const { sql: poolSql, args: poolArgs } = poolWhere(
    t.family_id, s.skill, blueprint ? blueprint.types : null, s.part || '');
  const pool = await q.all(
    `SELECT id, (level=?) exact FROM questions WHERE ${poolSql} ORDER BY exact DESC`,
    t.level, ...poolArgs);
  if (pool.length < want) {
    return bad(res, 'The bank' + (s.part ? ' for part ' + s.part : '') + ' holds only ' + pool.length +
      ' items, short of the ' + want + ' needed.');
  }

  const shuffle = arr => arr.map(v => [Math.random(), v]).sort((a, c) => a[0] - c[0]).map(v => v[1]);
  const chosen = shuffle(pool.filter(r => r.exact)).concat(shuffle(pool.filter(r => !r.exact))).slice(0, want);
  await tx(async () => {
    await q.run('DELETE FROM section_items WHERE section_id=?', sid);
    for (const [i, r] of chosen.entries()) {
      await q.run('INSERT INTO section_items (section_id,question_id,sort) VALUES (?,?,?)', sid, r.id, i);
    }
    await q.run('UPDATE tests SET updated_at=? WHERE id=?', nowISO(), s.test_id);
  });
  await audit(req, 'section.reshuffle', 'sections/' + sid, { count: want });
  res.json({ ok: true, count: want });
});

/* ============================= USER ============================= */
router.get('/admin/users', async (req, res) => {
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
  const total = await q.val('SELECT COUNT(*) c FROM users ' + w, ...args);
  const rows = await q.all(`
    SELECT u.*,
           (SELECT COUNT(*) FROM codes c WHERE c.user_id=u.id AND c.status='redeemed') codes,
           (SELECT COALESCE(SUM(o.amount),0) FROM orders o WHERE o.user_id=u.id AND o.status='paid') spent
      FROM users u ${w} ORDER BY u.created_at DESC LIMIT ? OFFSET ?`, ...args, limit, offset);
  res.json({
    total, limit, offset,
    items: rows.map(u => ({
      id: u.id, username: u.username, email: u.email, name: u.name, phone: u.phone || null,
      verified: !!u.verified, status: u.status, interests: jparse(u.interests_json, []),
      codes: u.codes, spent: u.spent, note: u.note, createdAt: u.created_at, lastLoginAt: u.last_login_at
    }))
  });
});

router.get('/admin/users/:id', async (req, res) => {
  const id = int(req.params.id, 0);
  const u = await q.get('SELECT * FROM users WHERE id=?', id);
  if (!u) return res.status(404).json({ error: 'No such student.' });
  const codes = await q.all('SELECT * FROM codes WHERE user_id=? ORDER BY redeemed_at DESC', id);
  const orders = await q.all('SELECT * FROM orders WHERE user_id=? ORDER BY created_at DESC', id);
  res.json({
    user: {
      id: u.id, username: u.username, email: u.email, name: u.name, phone: u.phone || null,
      verified: !!u.verified, status: u.status, interests: jparse(u.interests_json, []), note: u.note,
      createdAt: u.created_at, lastLoginAt: u.last_login_at
    },
    codes: await Promise.all(codes.map(async c => ({
      id: c.id, code: c.code, unlockType: c.unlock_type, unlockRef: c.unlock_ref,
      label: await unlockLabel(c.unlock_type, c.unlock_ref), status: c.status,
      redeemedAt: c.redeemed_at, expiresAt: c.expires_at
    }))),
    orders: orders.map(o => ({ id: o.id, name: o.name, amount: o.amount, status: o.status, createdAt: o.created_at }))
  });
});

/* ==================================================================== *
 * Making and looking after a student account, from the admin side
 *
 * Students normally sign themselves up. A centre needs the other way round:
 * somebody pays at a desk, or a class of thirty arrives at once, and an
 * administrator makes the account and puts a term on it there and then.
 * ==================================================================== */

/** A code nobody holds yet. Shared with the batch issuer below. */
async function unusedCode() {
  let code = makeCode();
  while (await q.val('SELECT 1 FROM codes WHERE code=?', code)) code = makeCode();
  return code;
}

/**
 * Put a term on an account: mint a code and activate it in one go.
 *
 * The term runs from NOW, not from the end of any term already held — the same
 * rule as a student redeeming a code themselves (`POST /api/redeem`). It would
 * be kinder to renewals to extend from the current expiry, but making the admin
 * path behave differently from the student path is how two answers to "when
 * does this run out" get into one system. `entitlementOf()` already takes the
 * furthest date across live codes and adds the attempts up, so an early renewal
 * loses nothing except the overlap.
 */
async function grantPlan(userId, plan, adminId, note) {
  const at = nowISO();
  const until = new Date(at);
  until.setMonth(until.getMonth() + plan.months);
  const code = await unusedCode();
  await q.run(
    `INSERT INTO codes (code, batch_id, unlock_type, unlock_ref, plan_id, status,
                        expires_at, access_expires_at, user_id, redeemed_at, note, created_at, created_by)
     VALUES (?, NULL, 'family', 'vpet', ?, 'redeemed', NULL, ?, ?, ?, ?, ?, ?)`,
    code, plan.id, until.toISOString(), userId, at, note || null, at, adminId || null);
  return { code, accessUntil: until.toISOString() };
}

/**
 * POST /admin/users — create a student account.
 *
 * Verified on creation: an administrator typing the address in has already
 * confirmed it by other means, and leaving it unverified would lock the person
 * out of the thing that was just made for them.
 */
router.post('/admin/users', async (req, res) => {
  const b = req.body || {};
  const name = str(b.name, 120);
  const email = str(b.email, 160).toLowerCase();
  const phone = str(b.phone, 24);
  const note = str(b.note, 500);
  const planId = str(b.planId, 40);

  if (!name) return bad(res, 'Give the student a name.');
  if (!A.EMAIL_RE.test(email)) return bad(res, 'That email address is not valid.');
  if (phone) { const phErr = A.phoneProblem(phone); if (phErr) return bad(res, phErr); }
  if (await q.val('SELECT 1 FROM users WHERE email=?', email)) {
    return res.status(409).json({ error: 'An account with that email already exists.' });
  }
  /* A term is optional, but a plan id that means nothing is a typo worth
     refusing rather than an account quietly created with no access. */
  const plan = planId ? PLANS.byId(planId) : null;
  if (planId && !plan) return bad(res, 'That plan does not exist.');

  /* Given a password, it has to pass the same rule a student's would. Given
     none, one is generated and returned ONCE — which is the only moment it
     exists in readable form, since the column holds a scrypt hash. */
  const chosen = typeof b.password === 'string' && b.password ? b.password : '';
  if (chosen) {
    const problem = A.passwordProblem(chosen);
    if (problem) return bad(res, problem);
  }
  const password = chosen || A.generatedPassword();

  const at = nowISO();
  let userId = 0;
  let granted = null;
  await tx(async () => {
    await q.run(
      `INSERT INTO users (username, email, name, phone, pass_hash, verified, status, interests_json, note, created_at)
       VALUES (?,?,?,?,?,1,'active','[]',?,?)`,
      await A.freeUsername(email), email, name, A.normalizePhone(phone) || null, A.hashPassword(password), note || null, at);
    userId = await q.val('SELECT id FROM users WHERE email=?', email);
    if (plan) granted = await grantPlan(userId, plan, req.admin.id, 'Created with the account');
  });

  await audit(req, 'user.create', 'users/' + userId, { email, plan: plan ? plan.id : null });
  res.status(201).json({
    ok: true,
    user: { id: userId, name, email },
    /* Shown once, in the response to the administrator who asked for it. Never
       logged, and there is no way to read it back afterwards. */
    password: chosen ? null : password,
    grant: granted && { plan: plan.id, months: plan.months, accessUntil: granted.accessUntil }
  });
});

/* POST /admin/users/bulk — create many accounts at once, for a class or a
   company intake. The browser sends rows it has already split from a pasted
   list or a CSV it read itself, so there is no file upload and no CSV parser on
   the server. Each row needs a name, a valid email and a phone; a generated
   password comes back per account, shown once. Bad rows are reported by line
   number rather than failing the whole batch. */
router.post('/admin/users/bulk', async (req, res) => {
  const b = req.body || {};
  const rows = Array.isArray(b.rows) ? b.rows.slice(0, 500) : [];
  const planId = str(b.planId, 40);
  const plan = planId ? PLANS.byId(planId) : null;
  if (planId && !plan) return bad(res, 'That plan does not exist.');
  if (!rows.length) return bad(res, 'There is nothing to create.');

  const created = [], errors = [], seen = new Set();
  for (let i = 0; i < rows.length; i++) {
    const row = rows[i] || {};
    const line = int(row.line, i + 1);
    const name = str(row.name, 120);
    const email = str(row.email, 160).toLowerCase();
    const phone = str(row.phone, 24);
    if (!name || !A.EMAIL_RE.test(email)) { errors.push({ line, email, error: 'Missing name or invalid email' }); continue; }
    const phErr = A.phoneProblem(phone);
    if (phErr) { errors.push({ line, email, error: phErr }); continue; }
    if (seen.has(email)) { errors.push({ line, email, error: 'Duplicated within this list' }); continue; }
    seen.add(email);
    if (await q.val('SELECT 1 FROM users WHERE email=?', email)) { errors.push({ line, email, error: 'Email already registered' }); continue; }
    const password = A.generatedPassword();
    try {
      await tx(async () => {
        await q.run(`INSERT INTO users (username, email, name, phone, pass_hash, verified, status, interests_json, created_at)
                     VALUES (?,?,?,?,?,1,'active','[]',?)`,
          await A.freeUsername(email), email, name, A.normalizePhone(phone), A.hashPassword(password), nowISO());
        const userId = await q.val('SELECT id FROM users WHERE email=?', email);
        if (plan) await grantPlan(userId, plan, req.admin.id, 'Bulk-created');
      });
      created.push({ email, name, password });
    } catch (e) { errors.push({ line, email, error: 'Could not create this account' }); }
  }
  await audit(req, 'user.bulk_create', 'users', { created: created.length, errors: errors.length, plan: plan ? plan.id : null });
  res.status(201).json({ ok: true, created, errors, plan: plan ? { id: plan.id, months: plan.months, name: plan.name } : null });
});

/** POST /admin/users/:id/grant — put a term on an existing account. */
router.post('/admin/users/:id/grant', async (req, res) => {
  const id = int(req.params.id, 0);
  const plan = PLANS.byId(str(req.body && req.body.planId, 40));
  if (!plan) {
    return bad(res, 'Choose a term: ' + PLANS.PLANS.map(p => p.id).join(', ') + '.');
  }
  if (!await q.val('SELECT 1 FROM users WHERE id=?', id)) {
    return res.status(404).json({ error: 'No such student.' });
  }
  const note = str(req.body && req.body.note, 200) || 'Granted by an administrator';
  const granted = await tx(async () => await grantPlan(id, plan, req.admin.id, note));
  await audit(req, 'user.grant', 'users/' + id, { plan: plan.id, months: plan.months });
  res.status(201).json({
    ok: true,
    plan: { id: plan.id, name: plan.name, months: plan.months },
    code: granted.code,
    accessUntil: granted.accessUntil,
    entitlement: await entitlementOf(id)
  });
});

/**
 * POST /admin/users/:id/password — set a student's password.
 *
 * Every session that account holds is dropped: whoever the password was reset
 * because of must not still be signed in somewhere.
 */
router.post('/admin/users/:id/password', async (req, res) => {
  const id = int(req.params.id, 0);
  if (!await q.val('SELECT 1 FROM users WHERE id=?', id)) {
    return res.status(404).json({ error: 'No such student.' });
  }
  const chosen = typeof (req.body && req.body.password) === 'string' && req.body.password
    ? req.body.password : '';
  if (chosen) {
    const problem = A.passwordProblem(chosen);
    if (problem) return bad(res, problem);
  }
  const password = chosen || A.generatedPassword();
  await q.run('UPDATE users SET pass_hash=? WHERE id=?', A.hashPassword(password), id);
  await A.dropUserSessions(id);
  await audit(req, 'user.password', 'users/' + id, { generated: !chosen });
  res.json({ ok: true, password: chosen ? null : password });
});

router.post('/admin/users/:id/status', async (req, res) => {
  const id = int(req.params.id, 0);
  const status = str(req.body && req.body.status, 20);
  if (!['active', 'locked'].includes(status)) return bad(res, 'That status is not valid.');
  const r = await q.run('UPDATE users SET status=? WHERE id=?', status, id);
  if (!r.changes) return res.status(404).json({ error: 'No such student.' });
  await audit(req, 'user.status', 'users/' + id, { status });
  res.json({ ok: true });
});

router.post('/admin/users/:id/verify', async (req, res) => {
  const id = int(req.params.id, 0);
  const r = await q.run('UPDATE users SET verified=1 WHERE id=?', id);
  if (!r.changes) return res.status(404).json({ error: 'No such student.' });
  await audit(req, 'user.verify', 'users/' + id, {});
  res.json({ ok: true });
});

router.put('/admin/users/:id', async (req, res) => {
  const id = int(req.params.id, 0);
  const u = await q.get('SELECT * FROM users WHERE id=?', id);
  if (!u) return res.status(404).json({ error: 'No such student.' });
  const b = req.body || {};
  const name = str(b.name, 120) || u.name;
  const note = str(b.note, 500);
  const interests = Array.isArray(b.interests)
    ? b.interests.map(x => str(x, 20)).filter(familyExists) : jparse(u.interests_json, []);
  /* Phone is editable so an older account can be brought up to the standard a
     bound code needs: a valid number is normalised and kept; an omitted or empty
     field leaves whatever was there, rather than silently wiping it. */
  const phoneRaw = str(b.phone, 24);
  let phone = u.phone;
  if (phoneRaw) {
    const phErr = A.phoneProblem(phoneRaw);
    if (phErr) return bad(res, phErr);
    phone = A.normalizePhone(phoneRaw);
  }
  await q.run('UPDATE users SET name=?, note=?, phone=?, interests_json=? WHERE id=?',
    name, note, phone || null, JSON.stringify(interests), id);
  await audit(req, 'user.update', 'users/' + id, {});
  res.json({ ok: true });
});

/* ============================= CODE ============================= */
async function validUnlock(type, ref) {
  if (type === 'test') return !!await q.val('SELECT 1 FROM tests WHERE id=?', ref);
  if (type === 'family') return await familyExists(ref);
  if (type === 'bundle') {
    const ids = String(ref).split(',').map(s => s.trim()).filter(Boolean);
    return ids.length >= 2 && ids.every(familyExists);
  }
  return false;
}

router.get('/admin/codes', async (req, res) => {
  const where = [];
  const args = [];
  if (req.query.status) { where.push('c.status = ?'); args.push(str(req.query.status, 20)); }
  if (req.query.type) { where.push('c.unlock_type = ?'); args.push(str(req.query.type, 20)); }
  if (req.query.batch) { where.push('c.batch_id = ?'); args.push(int(req.query.batch, 0)); }
  if (req.query.q) { where.push('c.code LIKE ?'); args.push('%' + str(req.query.q, 40).toUpperCase() + '%'); }
  const w = where.length ? 'WHERE ' + where.join(' AND ') : '';
  const limit = clamp(int(req.query.limit, 30), 1, 500);
  const offset = clamp(int(req.query.offset, 0), 0, 1e6);
  const total = await q.val('SELECT COUNT(*) c FROM codes c ' + w, ...args);
  const rows = await q.all(`
    SELECT c.*, u.name user_name, u.email user_email, b.name batch_name
      FROM codes c LEFT JOIN users u ON u.id=c.user_id LEFT JOIN batches b ON b.id=c.batch_id
      ${w} ORDER BY c.id DESC LIMIT ? OFFSET ?`, ...args, limit, offset);
  res.json({
    total, limit, offset,
    items: await Promise.all(rows.map(async c => {
      const plan = PLANS.byId(c.plan_id);
      return {
        id: c.id, code: c.code, unlockType: c.unlock_type, unlockRef: c.unlock_ref,
        planId: c.plan_id || null,
        /* The label in the admin table is the plan name where there is one; an older
           code with no plan falls back to an exam label, and says so plainly. */
        label: plan ? plan.name + ' plan · ' + plan.months + ' months'
                    : await unlockLabel(c.unlock_type, c.unlock_ref) + ' (no plan attached)',
        status: c.status,
        expiresAt: c.expires_at, accessExpiresAt: c.access_expires_at,
        redeemedAt: c.redeemed_at, note: c.note,
        batchId: c.batch_id, batchName: c.batch_name,
        user: c.user_id ? { id: c.user_id, name: c.user_name, email: c.user_email } : null,
        createdAt: c.created_at
      };
    }))
  });
});

router.get('/admin/batches', async (req, res) => {
  const rows = await q.all(`
    SELECT b.*, (SELECT COUNT(*) FROM codes c WHERE c.batch_id=b.id) total,
           (SELECT COUNT(*) FROM codes c WHERE c.batch_id=b.id AND c.status='redeemed') used
      FROM batches b ORDER BY b.id DESC LIMIT 50`);
  res.json({
    items: await Promise.all(rows.map(async b => ({
      id: b.id, name: b.name, unlockType: b.unlock_type, unlockRef: b.unlock_ref,
      label: await unlockLabel(b.unlock_type, b.unlock_ref), qty: b.qty, total: b.total, used: b.used,
      expiresAt: b.expires_at, createdAt: b.created_at
    })))
  });
});

/**
 * Issue codes. Three shapes, one endpoint:
 *   · a batch of many unassigned codes, sold or handed out, redeemed first-come;
 *   · one code RESERVED to a named account — bound at issue, so only that account
 *     can activate it, and the term does not start until they do;
 *   · one code activated on a named account there and then.
 *
 * Binding a code to an account is the model a school asked for: each code goes to
 * exactly one student, and that student has to be a real, reachable account —
 * hence the requirement that it carry both an email and a phone number. The
 * "one code, one account" rule is enforced again at redemption; reserving simply
 * decides the owner up front instead of letting whoever types it first win.
 */
router.post('/admin/codes', async (req, res) => {
  const b = req.body || {};
  const type = str(b.unlockType, 20);
  const ref = str(b.unlockRef, 200);
  const qty = clamp(int(b.qty, 1), 1, 500);
  const note = str(b.note, 200);
  const expiresAt = str(b.expiresAt, 10) || null;
  const assignTo = int(b.userId, 0) || null;
  /* Reserve = bind to the account but leave it for them to activate. Off by
     default, so issuing straight to an account activates it there and then, the
     way admin-side grants have always worked; reserving is the explicit ask. */
  const reserve = assignTo ? (b.reserve === true || b.reserve === 'true') : false;
  /* What a code actually grants is a PLAN. It has to be chosen, with no default:
     a code with no plan redeems into nothing, and that mistake only surfaces once
     the buyer is holding the code. */
  const plan = PLANS.byId(str(b.planId, 40));

  if (!plan) {
    return bad(res, 'Choose a plan for the code: ' + PLANS.PLANS.map(p => p.id).join(', ') + '.');
  }
  if (!await validUnlock(type, ref)) return bad(res, 'That unlock is not valid.');
  if (expiresAt && !/^\d{4}-\d{2}-\d{2}$/.test(expiresAt)) return bad(res, 'The expiry date must be YYYY-MM-DD.');
  if (assignTo && qty !== 1) return bad(res, 'Issuing straight to one account means one code at a time.');

  /* A code bound to an account needs a real account behind it — one that
     registered with an email AND a phone. An older account with no phone on
     file is refused here rather than quietly bound to something half-reachable. */
  let boundUser = null;
  if (assignTo) {
    boundUser = await q.get('SELECT id, email, name, phone FROM users WHERE id=?', assignTo);
    if (!boundUser) return bad(res, 'No such student.');
    if (!boundUser.phone) {
      return bad(res, 'That account has no phone number on file. A code bound to one account needs the account to have registered an email and a phone.');
    }
  }

  const at = nowISO();
  /* Activating now starts the access term now. Left empty, entitlementOf() reads
     it as never expiring — a plan given away for good — so it is set only on the
     activate-now path. A reserved code carries no term until the student redeems it. */
  const accessUntil = (() => {
    if (!assignTo || reserve) return null;
    const d = new Date(at);
    d.setMonth(d.getMonth() + plan.months);
    return d.toISOString();
  })();
  const activatedNow = !!assignTo && !reserve;
  let batchId = null;
  const created = [];

  await tx(async () => {
    if (qty > 1) {
      await q.run('INSERT INTO batches (name,unlock_type,unlock_ref,qty,expires_at,created_at,created_by) VALUES (?,?,?,?,?,?,?)',
        str(b.batchName, 120) || (plan.name + ' batch ' + at.slice(0, 10)),
        type, ref, qty, expiresAt, at, req.admin.id);
      batchId = await q.val('SELECT id FROM batches ORDER BY id DESC LIMIT 1');
    }
    for (let i = 0; i < qty; i++) {
      let code = makeCode();
      while (await q.val('SELECT 1 FROM codes WHERE code=?', code)) code = makeCode();
      /* Reserved codes keep status 'unused' but carry the account they belong to,
         so redemption can refuse anyone else. Activated codes are 'redeemed' now. */
      await q.run(`INSERT INTO codes (code,batch_id,unlock_type,unlock_ref,plan_id,status,expires_at,access_expires_at,user_id,redeemed_at,note,created_at,created_by)
             VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)`,
        code, batchId, type, ref, plan.id, activatedNow ? 'redeemed' : 'unused', expiresAt,
        accessUntil, assignTo, activatedNow ? at : null, note || null, at, req.admin.id);
      created.push(code);
    }
  });

  await audit(req, 'code.issue', batchId ? 'batches/' + batchId : 'codes',
    { qty, plan: plan.id, type, ref, assignTo, mode: assignTo ? (reserve ? 'reserved' : 'activated') : 'batch' });
  res.status(201).json({
    created, batchId, qty,
    plan: { id: plan.id, name: plan.name, months: plan.months },
    boundTo: boundUser ? { id: boundUser.id, email: boundUser.email, name: boundUser.name } : null,
    reserved: reserve
  });
});

router.post('/admin/codes/:id/revoke', async (req, res) => {
  const id = int(req.params.id, 0);
  const c = await q.get('SELECT * FROM codes WHERE id=?', id);
  if (!c) return res.status(404).json({ error: 'No such code.' });
  if (c.status === 'revoked') return bad(res, 'That code was already revoked.');
  await q.run("UPDATE codes SET status='revoked' WHERE id=?", id);
  await audit(req, 'code.revoke', 'codes/' + id, { code: c.code, wasStatus: c.status });
  res.json({ ok: true });
});

/** Export the codes as CSV (by batch, or by status filter) */
router.get('/admin/codes/export', async (req, res) => {
  const where = [];
  const args = [];
  if (req.query.batch) { where.push('c.batch_id = ?'); args.push(int(req.query.batch, 0)); }
  if (req.query.status) { where.push('c.status = ?'); args.push(str(req.query.status, 20)); }
  const w = where.length ? 'WHERE ' + where.join(' AND ') : '';
  const rows = await q.all(`SELECT c.code, c.plan_id, c.unlock_type, c.unlock_ref, c.status,
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
  await audit(req, 'code.export', 'codes', { rows: rows.length });
  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', 'attachment; filename="codes.csv"');
  res.send('﻿' + csv);            // a BOM so Excel reads the accents correctly
});

/* ==================== GOOGLE CLASSROOM ====================
 *
 * All four sit under the router-wide requireAdmin + csrfGuard registered at the
 * top of this file. The consent round trip itself is not here — it is two GET
 * browser navigations in server/google-auth.js, because a redirect to Google
 * cannot carry a CSRF header and is guarded by the state cookie instead.
 *
 * The grant belongs to the administrator who made it, and every route below
 * reads req.admin.id rather than taking an id from the request. One
 * administrator must not be able to spend another's Google permission.
 */

router.get('/admin/classroom', async (req, res) => {
  res.set('Cache-Control', 'no-store').json(await classroom.status(req.admin.id));
});

router.get('/admin/classroom/courses', async (req, res) => {
  try {
    res.set('Cache-Control', 'no-store').json(await classroom.courses(req.admin.id));
  } catch (e) {
    /* A Google failure is not a fault in this server, and the administrator can
       act on it — reconnect, or grant the missing scope — so the reason is
       passed on rather than swallowed into a 500. */
    res.status(502).json({ error: (e && e.message) || 'Google Classroom could not be reached' });
  }
});

router.get('/admin/classroom/courses/:courseId/roster', async (req, res) => {
  const courseId = str(req.params.courseId, 60);
  if (!courseId) return bad(res, 'Which course?');
  try {
    res.set('Cache-Control', 'no-store').json(await classroom.roster(req.admin.id, courseId));
  } catch (e) {
    res.status(502).json({ error: (e && e.message) || 'Google Classroom could not be reached' });
  }
});

router.post('/admin/classroom/unlink', async (req, res) => {
  const had = await classroom.unlink(req.admin.id);
  if (had) await audit(req, 'classroom.unlinked', 'admins/' + req.admin.id, {});
  res.json({ ok: true, wasLinked: had });
});

/* ======================= SETTINGS · AUDIT LOG ======================= */
/* What the settings screen is allowed to see.
   This was `SELECT key, value FROM settings` and everything it found went to the
   browser. That was harmless while the table held a brand name and a notice, and
   it stopped being harmless the moment anything sealed went in beside them - a
   row added tomorrow would have been published by default rather than withheld
   by default. A whitelist inverts that: a new key is invisible until somebody
   decides it may be seen, which is the direction that fails safe. */
const PUBLIC_SETTING_KEYS = ['brand.name', 'brand.tenant', 'platform.notice'];

router.get('/admin/settings', async (req, res) => {
  const rows = await q.all(
    `SELECT key, value FROM settings WHERE key IN (${PUBLIC_SETTING_KEYS.map(() => '?').join(',')})`,
    ...PUBLIC_SETTING_KEYS);
  const settings = {};
  rows.forEach(r => { settings[r.key] = r.value; });
  res.json({
    settings,
    packages: (await q.all('SELECT * FROM packages ORDER BY sort')).map(p => ({
      id: p.id, name: p.name, price: p.price, familyId: p.family_id,
      description: p.description, perks: jparse(p.perks_json, []),
      featured: !!p.featured, active: !!p.active
    })),
    families: (await q.all('SELECT * FROM families ORDER BY sort')).map(f => ({
      id: f.id, name: f.name, sub: f.sub, format: f.format, skills: jparse(f.skills_json, [])
    })),
    admins: await q.all('SELECT id, username, name, role, active, created_at, last_login_at FROM admins ORDER BY id')
  });
});

router.put('/admin/settings', async (req, res) => {
  const b = (req.body && req.body.settings) || {};
  const allowed = PUBLIC_SETTING_KEYS;
  const ins = require('./db').db.prepare(
    'INSERT INTO settings (key,value) VALUES (?,?) ON CONFLICT(key) DO UPDATE SET value=excluded.value');
  for (const k of allowed) if (k in b) ins.run(k, str(b[k], 300));
  await audit(req, 'settings.update', 'settings', { keys: Object.keys(b) });
  res.json({ ok: true });
});

/* ======================= AI MARKING =======================
   Where the key for the model that marks writing and speaking is set. Owner
   only, and write-only: the key goes in and never comes back out, because a
   screen that can show a key is a screen that can leak one. What comes back is
   whether one is set, its last four characters so an operator can tell WHICH
   key is in use, and whether the last check worked. */

const aiMarking = require('./ai-marking');
const aiRun = require('./ai-marking-run');

/* server/auth.js already exports requireOwner and other routes use it; a second
   role test here would be a second thing to keep in step. Everything on this
   credential - reading its status included, since the key hint and the endpoint
   are its shape - is owner business. */
const requireOwner = A.requireOwner;

router.get('/admin/ai', requireOwner, async (req, res) => {
  const s = await aiMarking.settings();
  /* Counted the same way the pass finds work - from the PAPER, left-joining the
     answers - and not from attempt_answers alone. An item the candidate never
     touched has no answer row, so a count starting there could not see the very
     items pending() was rewritten to find, and the two numbers disagreed by
     exactly the ones that matter. Restricted to submitted sittings for the same
     reason the pass is: a paper still being written is not waiting on anybody. */
  const waiting = await q.val(
    `SELECT COUNT(*) c
       FROM attempts a
       JOIN attempt_parts ap ON ap.attempt_id = a.id
       JOIN section_items si ON si.section_id = ap.section_id
       JOIN questions qs ON qs.id = si.question_id
       LEFT JOIN attempt_answers aa
              ON aa.attempt_id = a.id AND aa.question_id = si.question_id
      WHERE a.status = 'submitted'
        AND qs.type IN ('essay','speaking')
        AND aa.earned IS NULL`);
  /* Papers, not answers. The count above is the honest size of the job and the
     one below is the honest size of the queue - a screen showing only the first
     leaves an owner unable to tell one badly-stuck paper from forty ordinary
     ones. `due` is what the next sweep would actually pick up. */
  const backlog = await q.val('SELECT COUNT(*) c FROM ai_marking_backlog');
  const dueNow = (await aiRun.due(1000)).length;
  res.set('Cache-Control', 'no-store').json({ ai: s, waiting, backlog, due: dueNow });
});

router.put('/admin/ai', requireOwner, async (req, res) => {
  const b = req.body || {};

  if ('baseUrl' in b || 'model' in b || 'sttBaseUrl' in b || 'sttModel' in b) {
    /* Only the fields that were actually sent. `str()` of an absent field is '',
       which fell through to the default - so a request that changed the model
       name silently reset the endpoint and switched transcription off. */
    const now = await aiMarking.settings();
    const url = 'baseUrl' in b ? str(b.baseUrl, 200) : now.baseUrl;
    const sttUrl = 'sttBaseUrl' in b ? str(b.sttBaseUrl, 200) : now.sttBaseUrl;
    const model = 'model' in b ? str(b.model, 100) : now.model;
    const sttModel = 'sttModel' in b ? str(b.sttModel, 100) : now.sttModel;
    /* A model name is interpolated into a multipart body, so a newline in it
       would let the caller write their own headers into the request. */
    if (/[\r\n]/.test(model) || /[\r\n]/.test(sttModel)) {
      return bad(res, 'A model name cannot contain a line break.');
    }
    /* An http:// endpoint would put the key on the wire in clear. Loopback is the
       one exception, and a real one: a gateway on 127.0.0.1 never reaches a
       network, and refusing it would rule out both a self-hosted proxy and any
       way of testing this without a live account. Anything else must be https. */
    const okEndpoint = u => /^https:\/\//i.test(u)
      || /^http:\/\/(127\.0\.0\.1|\[::1\]|localhost)(:\d+)?(\/|$)/i.test(u);
    for (const [label, u] of [['The model endpoint', url], ['The transcription endpoint', sttUrl]]) {
      if (u && !okEndpoint(u)) {
        return bad(res, label + ' must be an https address (http is allowed only on this machine).');
      }
    }
    await aiMarking.setProvider({
      baseUrl: url || aiMarking.DEFAULTS.baseUrl,
      model: model || aiMarking.DEFAULTS.model,
      sttBaseUrl: sttUrl,
      sttModel: sttModel || aiMarking.DEFAULTS.sttModel
    });
  }

  /* An absent field leaves the stored key alone; an explicit empty string
     clears it. Otherwise saving a changed model name would wipe the key. */
  for (const [field, which] of [['apiKey', 'model'], ['sttApiKey', 'stt']]) {
    if (!(field in b)) continue;
    const raw = String(b[field] == null ? '' : b[field]).trim();
    if (raw && raw.length < 12) return bad(res, 'That does not look like an API key.');
    try {
      await aiMarking.setKey(which, raw || null);
    } catch (e) {
      return bad(res, e.message);
    }
  }

  /* The key itself never reaches the audit log - only that one was set. */
  await audit(req, 'ai.settings', 'settings', {
    fields: Object.keys(b).map(k => (/key/i.test(k) ? k + ':changed' : k))
  });
  res.json({ ok: true, ai: await aiMarking.settings() });
});

/**
 * Queue every paper that is due another marking pass.
 *
 * The sweeper does this by itself every ten minutes; this is the button for the
 * moment a key is first pasted in, when the honest answer to "what about the
 * sittings already finished?" should not be "wait ten minutes and hope".
 *
 * Returns as soon as the papers are queued rather than waiting for the marking:
 * twenty papers is twenty minutes of model calls, and no browser holds a request
 * open that long.
 */
router.post('/admin/ai/sweep', requireOwner, async (req, res) => {
  if (!await aiMarking.ready()) return bad(res, 'No marking key is configured.');
  const out = await aiRun.sweep();
  await audit(req, 'ai.sweep', 'attempts', out);
  res.json({ ok: true, ...out });
});

router.post('/admin/ai/test', requireOwner, async (req, res) => {
  const out = await aiMarking.testConnection();
  await audit(req, 'ai.test', 'settings', { ok: out.ok });
  res.status(out.ok ? 200 : 502).json(out);
});

/** Mark one paper's outstanding writing and speaking now, and wait for it. */
/* Owner-only as well: it spends against the credential, and an unbounded pass
   is not something every admin role should be able to start. */
router.post('/admin/attempts/:id/mark', requireOwner, async (req, res) => {
  const id = int(req.params.id, 0);
  if (!await q.val('SELECT 1 FROM attempts WHERE id=?', id)) {
    return res.status(404).json({ error: 'No such sitting.' });
  }
  if (!await aiMarking.ready()) return bad(res, 'No marking key is configured.');
  /* ?force=1 throws away the marks already given and makes them again - for a
     changed model, or a mark that is plainly wrong. Without it a marked item is
     never revisited, which is what stops an automatic retry from quietly
     rewriting a candidate's result. */
  const force = String(req.query.force || '') === '1';
  const out = await aiRun.runNow(id, { force });
  await audit(req, 'ai.mark', 'attempts/' + id, { ...out, force });
  res.json({ ok: true, ...out });
});

router.put('/admin/packages/:id', async (req, res) => {
  const id = str(req.params.id, 40);
  const p = await q.get('SELECT * FROM packages WHERE id=?', id);
  if (!p) return res.status(404).json({ error: 'No such plan.' });
  const b = req.body || {};
  const price = clamp(int(b.price, p.price), 0, 100000000);
  await q.run('UPDATE packages SET name=?, price=?, description=?, active=? WHERE id=?',
    str(b.name, 120) || p.name, price, str(b.description, 400) || p.description,
    b.active === false ? 0 : 1, id);
  await audit(req, 'package.update', 'packages/' + id, { price });
  res.json({ ok: true });
});

/** Change your own admin password */
/* POST /admin/me — an administrator editing their OWN profile. Only the display
   name: the username is the sign-in handle, and the role is not something an
   account may grant itself (that lives on the Administration screen, for owners).
   The name shows in the chrome and the audit log, so it is worth keeping right
   without opening the full admin-management screen. */
router.post('/admin/me', async (req, res) => {
  const name = str(req.body && req.body.name, 120).trim();
  if (!name) return bad(res, 'Your name cannot be empty.');
  await q.run('UPDATE admins SET name=? WHERE id=?', name, req.admin.id);
  await audit(req, 'admin.profile', 'admins/' + req.admin.username, {});
  res.json({ ok: true, name });
});

/* POST /admin/preview-student — look at the student site with real data.
   It signs THIS browser into the read-only demo student alongside the admin
   session (prep_user and prep_admin are separate cookies and never collide), and
   raises a prep_preview flag the student pages read to show a "back to admin"
   banner. Scoped to the demo account by design: an administrator can walk the
   platform, never open a real student's private dashboard. Ending the preview is
   an ordinary student sign-out, which clears the flag too. */
router.post('/admin/preview-student', async (req, res) => {
  const demo = await q.get('SELECT id FROM users WHERE username=?', A.DEMO_STUDENT_USER);
  if (!demo) return res.status(404).json({ error: 'There is no demo student on this server to preview.' });
  await A.createUserSession(demo.id, req, res);
  A.setPreviewFlag(res, true);
  await audit(req, 'admin.preview_student', 'users/' + demo.id, {});
  res.json({ ok: true });
});

router.post('/admin/password', async (req, res) => {
  const b = req.body || {};
  const cur = typeof b.current === 'string' ? b.current : '';
  const next = typeof b.next === 'string' ? b.next : '';
  const me = await q.get('SELECT * FROM admins WHERE id=?', req.admin.id);
  if (!A.verifyPassword(cur, me.pass_hash)) return res.status(403).json({ error: 'That is not your current password.' });
  if (next.length < 10) return bad(res, 'A new password needs at least 10 characters.');
  if (!/[A-Za-z]/.test(next) || !/\d/.test(next)) return bad(res, 'A new password needs both letters and digits.');
  await q.run('UPDATE admins SET pass_hash=? WHERE id=?', A.hashPassword(next), req.admin.id);
  await q.run('DELETE FROM sessions WHERE admin_id=?', req.admin.id);   // force every device to sign in again
  await audit(req, 'admin.password', 'admins/' + req.admin.username, {});
  res.json({ ok: true, reauth: true });
});

/* ------------------ Second factor, from the browser ------------------
   The same two-step flow `scripts/accounts.js totp-enable` runs, so there is one
   procedure with two front doors rather than two procedures. The CLI stays the
   authority for the operation that can lock you out of this very screen —
   turning it OFF when the phone is gone — but enrolling should not need a
   terminal.

   The pending secret is carried by the client between the two calls rather than
   parked in a table. It is worthless on its own: using it needs a matching code
   AND an already-authenticated admin session, and anybody holding that session
   can enrol a secret of their own choosing anyway. A pending-state table would
   add a row to expire and clean up, and would buy nothing. */

router.get('/admin/totp', async (req, res) => {
  const me = await q.get('SELECT * FROM admins WHERE id=?', req.admin.id);
  res.json({
    enabled: A.totpEnabled(me),
    enabledAt: me.totp_enabled_at || null,
    recoveryLeft: A.totpEnabled(me) ? await A.recoveryCodesLeft(me.id) : 0
  });
});

router.post('/admin/totp/start', async (req, res) => {
  const me = await q.get('SELECT * FROM admins WHERE id=?', req.admin.id);
  if (A.totpEnabled(me)) return res.status(409).json({ error: 'Two-factor is already on for this account.' });
  /* Nothing is written. This step exists to hand over a secret and prove, at the
     next step, that an authenticator really holds it — enabling in one step would
     switch on a factor whose codes nobody can produce. */
  const secret = totp.newSecret();
  res.json({ secret, uri: totp.otpauthUri(secret, me.username) });
});

router.post('/admin/totp/enable', async (req, res) => {
  const b = req.body || {};
  const secret = typeof b.secret === 'string' ? b.secret.replace(/\s/g, '') : '';
  const code = typeof b.code === 'string' ? b.code.replace(/\s/g, '') : '';
  const me = await q.get('SELECT * FROM admins WHERE id=?', req.admin.id);
  if (A.totpEnabled(me)) return res.status(409).json({ error: 'Two-factor is already on for this account.' });
  if (!secret) return bad(res, 'Start again: no secret was carried over from the first step.');

  let counter = null;
  try { counter = totp.verify(secret, code); }
  catch (e) { return bad(res, 'That secret is not valid. Start again.'); }
  if (counter === null) {
    return res.status(403).json({ error: 'That code does not match. Check the clock on your phone, then try again.' });
  }

  const codes = await A.issueRecoveryCodes(me.id);
  await q.run('UPDATE admins SET totp_secret=?, totp_enabled_at=?, totp_last_counter=? WHERE id=?',
    secret, nowISO(), counter, me.id);
  await audit(req, 'admin.totp.enabled', 'admins/' + me.username, {});
  /* Shown once, here and nowhere else: only the hashes are kept, so no later
     request — and no support conversation — can produce them again. */
  res.json({ ok: true, recoveryCodes: codes });
});

router.post('/admin/totp/disable', async (req, res) => {
  const b = req.body || {};
  const me = await q.get('SELECT * FROM admins WHERE id=?', req.admin.id);
  if (!A.totpEnabled(me)) return res.json({ ok: true, alreadyOff: true });
  /* The password again, deliberately. Turning a second factor ON is an upgrade
     and needs no ceremony; turning it OFF is a downgrade, and a downgrade that a
     borrowed session can perform on its own is not much of a second factor. */
  if (!A.verifyPassword(typeof b.password === 'string' ? b.password : '', me.pass_hash)) {
    return res.status(403).json({ error: 'Enter your current password to turn two-factor off.' });
  }
  await q.run('UPDATE admins SET totp_secret=NULL, totp_enabled_at=NULL, totp_last_counter=NULL WHERE id=?', me.id);
  await q.run('DELETE FROM admin_recovery_codes WHERE admin_id=?', me.id);
  await audit(req, 'admin.totp.disabled', 'admins/' + me.username, {});
  res.json({ ok: true });
});

router.get('/admin/audit', async (req, res) => {
  const limit = clamp(int(req.query.limit, 60), 1, 300);
  const rows = await q.all('SELECT * FROM audit ORDER BY id DESC LIMIT ?', limit);
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
router.get('/catalog', async (req, res) => {
  /* Owner's decision, 2026-08-13: while the platform is VPET-only, the other
     five are not merely unbuyable, they are not shown at all. A "coming soon"
     card that has said coming soon for months reads as a dead product, and
     five of them next to one real exam make the real one look like a trial.
     Nothing else changes — the exam engine and the publish guard already
     refuse a parked family, so this is the display half of a rule that was
     already enforced. Undo by setting a family back to 'ready' in the FAMILIES
     table in server/db.js.
     An administrator still sees everything: they are the person who has to
     manage the parked families, and hiding them from the only screen that can
     open them again would be its own trap. */
  const hideParked = !await A.currentAdmin(req);
  const visible = f => !(hideParked && (f.status || 'ready') === 'coming_soon');

  const families = (await q.all('SELECT * FROM families ORDER BY sort')).filter(visible).map(f => ({
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
  /* A test whose family is hidden goes with it. Leaving it in would put an
     exam in the library belonging to a family the filter chips cannot even
     name — and one the engine would refuse to open. */
  const shown = new Set(families.map(f => f.id));
  const tests = await Promise.all((await q.all("SELECT * FROM tests WHERE status='published' ORDER BY family_id, id"))
    .filter(t => shown.has(t.family_id)).map(async t => {
    const sections = await Promise.all((await q.all('SELECT * FROM sections WHERE test_id=? ORDER BY sort, id', t.id)).map(async s => ({
      name: s.name, type: s.type, minutes: s.minutes,
      items: await q.val('SELECT COUNT(*) c FROM section_items WHERE section_id=?', s.id)
    })));
    return {
      id: t.id, familyId: t.family_id, title: t.title, level: t.level,
      durationMin: t.duration_min, scoring: t.scoring, guide: jparse(t.guide_json, []),
      skills: [...new Set((await q.all('SELECT skill FROM sections WHERE test_id=?', t.id)).map(r => r.skill))],
      sections,
      comingSoon: sections.some(s => !s.items)
    };
  }));
  const packages = (await q.all('SELECT * FROM packages WHERE active=1 ORDER BY sort')).map(p => ({
    id: p.id, name: p.name, price: p.price, familyId: p.family_id,
    desc: p.description, perks: jparse(p.perks_json, []), featured: !!p.featured
  }));
  /* The price list is public information and both sides need it: the student's sales
     screens and the admin's code-issuing screen. Sending it with the catalogue means
     one call covers both, and nowhere has to keep its own copy of a price. */
  const plans = PLANS.PLANS.map(p => ({
    id: p.id, name: p.name, price: p.price, listPrice: p.listPrice || null, months: p.months,
    attempts: p.attempts || null, features: p.features,
    tagline: p.tagline, perks: p.perks, limits: p.limits
  }));
  res.set('Cache-Control', 'no-store').json({ families, tests, packages, plans });
});

/* ==================== Self-study (public) ==================== */

/** The irregular verb table. Searchable by V1, V2, V3 or the Vietnamese gloss. */
router.get('/learn/irregular-verbs', async (req, res) => {
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

  const verbs = (await q.all(sql, ...args)).map(v => ({
    v1: v.v1, v2: v.v2, v3: v.v3, ving: v.ving,
    ipaUk: v.ipa_uk, ipaUs: v.ipa_us, vi: v.vi,
    group: v.grp, level: v.level, note: v.note,
    exEn: v.ex_en, exVi: v.ex_vi
  }));

  res.set('Cache-Control', 'public, max-age=300').json({
    total: await q.val('SELECT COUNT(*) c FROM irregular_verbs'),
    count: verbs.length,
    verbs
  });
});

/** Linking words — filtered by function, register, level, or a search term */
router.get('/learn/linking-words', async (req, res) => {
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

  const words = (await q.all(sql, ...args)).map(w => ({
    word: w.word, fn: w.fn, register: w.register, pos: w.pos, punct: w.punct,
    vi: w.vi, level: w.level, exEn: w.ex_en, exVi: w.ex_vi, warn: w.warn
  }));

  res.set('Cache-Control', 'public, max-age=300').json({
    total: await q.val('SELECT COUNT(*) c FROM linking_words'),
    count: words.length,
    functions: LINKING.FUNCTIONS.map(([id, label]) => ({ id, label })),
    registers: LINKING.REGISTERS.map(([id, label]) => ({ id, label })),
    words
  });
});

/* Grammar points — a compact list, without the examples, to keep the payload small */
router.get('/learn/grammar', async (req, res) => {
  const grp = str(req.query.grp, 20);
  const level = LEVELS.includes(str(req.query.level, 2).toUpperCase())
    ? str(req.query.level, 2).toUpperCase() : '';

  const where = [];
  const args = [];
  if (grp) { where.push('grp = ?'); args.push(grp); }
  if (level) { where.push('level = ?'); args.push(level); }
  const sql = 'SELECT * FROM grammar_points' +
    (where.length ? ' WHERE ' + where.join(' AND ') : '') + ' ORDER BY sort, id';

  const points = await Promise.all((await q.all(sql, ...args)).map(async p => ({
    slug: p.slug, nameEn: p.name_en, nameVi: p.name_vi,
    grp: p.grp, level: p.level, summary: p.summary,
    formula: jparse(p.formula_json), signals: jparse(p.signals_json),
    counts: {
      example: await q.val('SELECT COUNT(*) c FROM grammar_examples WHERE point_id=? AND kind=?', p.id, 'example'),
      practice: await q.val('SELECT COUNT(*) c FROM grammar_examples WHERE point_id=? AND kind=?', p.id, 'practice')
    }
  })));

  res.set('Cache-Control', 'public, max-age=300').json({
    total: await q.val('SELECT COUNT(*) c FROM grammar_points'),
    count: points.length,
    groups: (await q.all('SELECT grp, COUNT(*) c FROM grammar_points GROUP BY grp ORDER BY grp'))
      .map(g => ({ id: g.grp, count: g.c })),
    points
  });
});

/* One grammar point with all of its examples and practice items */
router.get('/learn/grammar/:slug', async (req, res) => {
  const p = await q.get('SELECT * FROM grammar_points WHERE slug = ?', str(req.params.slug, 60));
  if (!p) return res.status(404).json({ error: 'No such grammar point' });

  const rows = await q.all(
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
router.get('/learn/vocab', async (req, res) => {
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

  const entries = await Promise.all((await q.all(
    `SELECT e.* FROM vocab_entries e ${w} ORDER BY e.sort, e.headword, e.pos LIMIT ? OFFSET ?`,
    ...args, limit, offset)).map(async e => ({
      headword: e.headword, pos: e.pos, level: e.level, levelSource: e.level_source,
      ipaUk: e.ipa_uk, ipaUs: e.ipa_us, freqRank: e.freq_rank,
      senses: await q.val('SELECT COUNT(*) c FROM vocab_senses WHERE entry_id=?', e.id),
      forms: await q.val('SELECT COUNT(*) c FROM vocab_forms WHERE entry_id=?', e.id),
      collocations: await q.val('SELECT COUNT(*) c FROM collocations WHERE entry_id=?', e.id)
    })));

  res.set('Cache-Control', 'public, max-age=300').json({
    total: await q.val('SELECT COUNT(*) c FROM vocab_entries'),
    matched: await q.val(`SELECT COUNT(*) c FROM vocab_entries e ${w}`, ...args),
    count: entries.length,
    levels: (await q.all('SELECT level, COUNT(*) c FROM vocab_entries GROUP BY level ORDER BY level'))
      .map(r => ({ id: r.level, count: r.c })),
    parts: (await q.all('SELECT pos, COUNT(*) c FROM vocab_entries GROUP BY pos ORDER BY pos'))
      .map(r => ({ id: r.pos, count: r.c })),
    entries
  });
});

/* One headword with everything under it. Every part of speech is returned
   together — "book" the noun and "book" the verb are separate entries, but a
   learner looking the word up wants both, and which one they meant is exactly
   what they do not know yet. */
router.get('/learn/vocab/:headword', async (req, res) => {
  const head = str(req.params.headword, 60).toLowerCase();
  const found = await q.all(
    'SELECT * FROM vocab_entries WHERE lower(headword) = ? ORDER BY sort, pos', head);
  if (!found.length) return res.status(404).json({ error: 'No such word' });

  res.set('Cache-Control', 'public, max-age=300').json({
    headword: found[0].headword,
    entries: await Promise.all(found.map(async e => ({
      pos: e.pos, level: e.level, levelSource: e.level_source,
      ipaUk: e.ipa_uk, ipaUs: e.ipa_us, freqRank: e.freq_rank,
      /* Source and licence travel with the entry: docs/LEARNING.md §1.3 asks for
         attribution, and these lists are shared under CC BY-SA. */
      source: e.source, licence: e.licence,
      senses: await Promise.all((await q.all('SELECT * FROM vocab_senses WHERE entry_id=? ORDER BY sort, id', e.id))
        .map(async s => ({
          en: s.en, vi: s.vi, level: s.level, note: s.note,
          examples: (await q.all('SELECT * FROM vocab_examples WHERE sense_id=? ORDER BY sort, id', s.id))
            .map(x => ({ en: x.en, vi: x.vi, source: x.source, licence: x.licence }))
        }))),
      forms: (await q.all('SELECT * FROM vocab_forms WHERE entry_id=? ORDER BY sort, id', e.id))
        .map(f => ({ form: f.form, kind: f.kind, note: f.note })),
      collocations: (await q.all('SELECT * FROM collocations WHERE entry_id=? ORDER BY sort, id', e.id))
        .map(c => ({
          chunk: c.chunk, kind: c.kind, level: c.level,
          exEn: c.ex_en, exVi: c.ex_vi, note: c.note
        }))
    })))
  });
});

/* ==================================================================== *
 * Spaced repetition — the review queue and the grading of one card
 *
 * docs/LEARNING.md §6: a learner sees what is DUE, not the whole word list.
 * The schedule itself is in server/srs.js; this part decides which cards exist,
 * which of them are due, and how many unseen ones to let through in a day.
 *
 * Two decisions worth stating, because both look like mistakes from the exam
 * engine's side of the house:
 *
 *  · The answer is sent with the question. The exam router strips `answer` from
 *    every item it serialises, and must. A recall card is the opposite: the back
 *    of the card IS the study material, the learner grades themselves, and there
 *    is nothing to cheat at. Sending both halves means a session runs without a
 *    round trip per card.
 *  · Grades are self-reported and taken at face value, for the same reason.
 * ==================================================================== */

const srs = require('./srs');

/* Which content tables can be reviewed, and how a row from each becomes a card.
   Adding a deck is adding an entry here: the queue, the counts, the validation
   and the screen all read this one object. */
const DECKS = {
  irregular_verb: {
    label: 'Irregular verbs',
    idsSql: 'SELECT id FROM irregular_verbs ORDER BY sort, v1',
    rowsSql: holes => `SELECT * FROM irregular_verbs WHERE id IN (${holes})`,
    card: r => ({
      prompt: r.v1,
      ipa: r.ipa_uk || r.ipa_us || '',
      ask: 'Past simple, past participle, and what it means',
      answer: [r.v2, r.v3].join(' · '),
      gloss: r.vi,
      exEn: r.ex_en || '',
      exVi: r.ex_vi || '',
      note: r.note || '',
      level: r.level
    })
  },
  linking_word: {
    label: 'Linking words',
    idsSql: 'SELECT id FROM linking_words ORDER BY sort, word',
    rowsSql: holes => `SELECT * FROM linking_words WHERE id IN (${holes})`,
    card: r => ({
      prompt: r.word,
      ipa: '',
      ask: 'What does it signal, and where does it go in the sentence?',
      answer: r.vi,
      gloss: `${r.register} · ${r.punct}`,
      exEn: r.ex_en || '',
      exVi: r.ex_vi || '',
      note: r.warn || '',
      level: r.level
    })
  },
  /* A sense, not a headword: "book" the object and "book" the verb are two
     cards, which is what docs/LEARNING.md §1.2 counts as two items. */
  vocab_sense: {
    label: 'Vocabulary',
    idsSql: 'SELECT id FROM vocab_senses ORDER BY sort, id',
    rowsSql: holes => `SELECT s.*, e.headword, e.pos, e.ipa_uk, e.ipa_us
                         FROM vocab_senses s JOIN vocab_entries e ON e.id = s.entry_id
                        WHERE s.id IN (${holes})`,
    card: r => ({
      prompt: r.headword,
      ipa: r.ipa_uk || r.ipa_us || '',
      ask: `What does it mean as a ${r.pos}?`,
      answer: r.en,
      gloss: r.vi,
      exEn: '',
      exVi: '',
      note: r.note || '',
      level: r.level
    })
  }
};
const DECK_IDS = Object.keys(DECKS);

/** How many cards a learner has never seen may be introduced in one day. */
const NEW_PER_DAY = Math.max(1, parseInt(process.env.LEARN_NEW_PER_DAY, 10) || 20);
/** How many cards one queue request hands over. A session, not a word list. */
const BATCH = 20;

/* A daily cap has to roll over at a time that means something to the person it
   limits. The audience is in Vietnam, so the day boundary is UTC+7 by default
   rather than UTC: at UTC a session before 07:00 local would be handed
   yesterday's allowance, which reads as the cap being broken. */
const DAY_OFFSET_MIN = (() => {
  const raw = process.env.LEARN_DAY_OFFSET_MIN;
  const n = Number(raw);
  return raw !== undefined && raw !== '' && Number.isInteger(n) ? n : 420;
})();

/** Midnight of the learner's day, as the UTC instant `created_at` is compared to. */
function dayStartISO(now) {
  const shifted = new Date(now.getTime() + DAY_OFFSET_MIN * 60000);
  const midnight = Date.UTC(shifted.getUTCFullYear(), shifted.getUTCMonth(), shifted.getUTCDate());
  return new Date(midnight - DAY_OFFSET_MIN * 60000).toISOString();
}

/* The `IN (…)` lists below are built from `ids.length` question marks — never
   from a value — and every id is bound. node:sqlite has no array binding. */
const holesFor = ids => ids.map(() => '?').join(',');

/** Rows of a deck by id, in one query rather than one per card. */
async function deckRows(deckId, ids) {
  const d = DECKS[deckId];
  if (!d || !ids.length) return new Map();
  return new Map((await q.all(d.rowsSql(holesFor(ids)), ...ids)).map(r => [r.id, r]));
}

/** Every reviewable id in a deck, in teaching order. */
async function deckIds(deckId) {
  return (await q.all(DECKS[deckId].idsSql)).map(r => r.id);
}

/** The learner's rows for a deck, keyed by item id. */
async function progressOf(userId, deckId) {
  return new Map((await q.all(
    'SELECT * FROM learn_progress WHERE user_id=? AND item_type=?', userId, deckId))
    .map(r => [r.item_id, r]));
}

const asState = row => ({
  ease: row.ease, interval: row.interval_days, reps: row.reps,
  lapses: row.lapses, state: row.state
});

/**
 * GET /api/learn/review — what to study now.
 *
 * `?deck=` narrows to one deck; anything else means all of them. Due cards come
 * first and in due order, oldest first, so a backlog is worked off rather than
 * shuffled around; unseen cards fill the rest of the batch up to the daily cap.
 */
router.get('/learn/review', A.requireUser, async (req, res) => {
  const want = str(req.query.deck, 30);
  const decks = DECK_IDS.includes(want) ? [want] : DECK_IDS;
  const now = new Date();
  const nowIso = now.toISOString();

  /* The daily cap counts rows CREATED today rather than reviews done today: a
     card seen for the first time is the expensive one, and re-reviewing it in
     the same session must not eat the allowance twice. */
  const introducedToday = await q.val(
    'SELECT COUNT(*) c FROM learn_progress WHERE user_id=? AND created_at >= ?',
    req.user.id, dayStartISO(now)) || 0;
  let newAllowance = Math.max(0, NEW_PER_DAY - introducedToday);

  const summary = [];
  const due = [];
  const unseen = [];

  for (const id of decks) {
    const ids = await deckIds(id);
    const known = await progressOf(req.user.id, id);
    let dueCount = 0;
    for (const itemId of ids) {
      const row = known.get(itemId);
      if (!row) { unseen.push({ deck: id, itemId }); continue; }
      if (row.due_at <= nowIso) { dueCount++; due.push({ deck: id, itemId, row }); }
    }
    summary.push({
      id, label: DECKS[id].label,
      total: ids.length,
      seen: known.size,
      due: dueCount,
      review: [...known.values()].filter(r => r.state === 'review').length
    });
  }

  /* Oldest due first. Two learners with the same backlog get the same order,
     and the order does not change under them as the clock moves. */
  due.sort((a, b) => (a.row.due_at < b.row.due_at ? -1 : a.row.due_at > b.row.due_at ? 1 : 0));

  const picked = due.slice(0, BATCH);
  for (const u of unseen) {
    if (picked.length >= BATCH || newAllowance <= 0) break;
    picked.push(u);
    newAllowance--;
  }

  /* One query per deck for the rows actually picked, not one per card. */
  const byDeck = new Map();
  picked.forEach(p => {
    if (!byDeck.has(p.deck)) byDeck.set(p.deck, []);
    byDeck.get(p.deck).push(p.itemId);
  });
  const rows = new Map();
  for (const [deckId, ids] of byDeck) rows.set(deckId, await deckRows(deckId, ids));

  const cards = picked.map(p => {
    const row = rows.get(p.deck).get(p.itemId);
    if (!row) return null;             // content re-seeded away under a saved row
    const state = p.row ? asState(p.row) : null;
    return Object.assign({
      deck: p.deck,
      deckLabel: DECKS[p.deck].label,
      itemId: p.itemId,
      isNew: !p.row,
      state: p.row ? p.row.state : 'new',
      lapses: p.row ? p.row.lapses : 0,
      /* What each button would schedule, worked out where the algorithm lives
         so the screen never has to reimplement it to print "6 days". */
      preview: Object.fromEntries(
        srs.GRADES.map(g => [g, srs.previewLabel(state, g, now)]))
    }, DECKS[p.deck].card(row));
  }).filter(Boolean);

  res.set('Cache-Control', 'no-store').json({
    decks: summary,
    grades: srs.GRADES,
    newPerDay: NEW_PER_DAY,
    newLeftToday: Math.max(0, NEW_PER_DAY - introducedToday),
    dueTotal: due.length,
    cards
  });
});

/**
 * POST /api/learn/review — grade one card and schedule the next sight of it.
 *
 * Body: { deck, itemId, grade }. The schedule is computed from the server's
 * clock and the stored state; nothing about timing is taken from the caller.
 */
router.post('/learn/review', A.requireUser, A.csrfGuard, async (req, res) => {
  const b = req.body || {};
  const deck = str(b.deck, 30);
  const itemId = int(b.itemId, 0);
  const grade = str(b.grade, 10);

  if (!DECKS[deck]) return bad(res, 'Unknown deck');
  if (!srs.GRADES.includes(grade)) return bad(res, 'Unknown grade');
  if (itemId <= 0) return bad(res, 'Missing item');
  /* The item has to exist in the deck it claims to belong to. Without this a
     caller could file progress against any integer and grow the table. */
  if (!(await deckRows(deck, [itemId])).has(itemId)) return res.status(404).json({ error: 'No such card' });

  const now = new Date();
  const at = now.toISOString();
  const prev = await q.get(
    'SELECT * FROM learn_progress WHERE user_id=? AND item_type=? AND item_id=?',
    req.user.id, deck, itemId);
  const next = srs.schedule(prev ? asState(prev) : null, grade, now);

  await q.run(
    `INSERT INTO learn_progress
       (user_id, item_type, item_id, ease, interval_days, reps, lapses, state,
        last_grade, due_at, reviewed_at, created_at)
     VALUES (?,?,?,?,?,?,?,?,?,?,?,?)
     ON CONFLICT(user_id, item_type, item_id) DO UPDATE SET
       ease=excluded.ease, interval_days=excluded.interval_days, reps=excluded.reps,
       lapses=excluded.lapses, state=excluded.state, last_grade=excluded.last_grade,
       due_at=excluded.due_at, reviewed_at=excluded.reviewed_at`,
    req.user.id, deck, itemId, next.ease, next.interval, next.reps, next.lapses,
    next.state, grade, next.dueAt, at, at);

  res.json({
    deck, itemId, grade,
    ease: next.ease,
    interval: next.interval,
    reps: next.reps,
    lapses: next.lapses,
    state: next.state,
    dueAt: next.dueAt,
    dueIn: srs.previewLabel(prev ? asState(prev) : null, grade, now)
  });
});

module.exports = router;
