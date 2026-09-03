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
const roles = require('./roles');
const totp = require('./totp');
const learnPractice = require('./learn-practice');
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
  /* The capabilities travel with the identity so the interface can hide what
     this account cannot use. Hiding is a courtesy, not the control: every one
     of these is enforced again on the server by roles.requireCap(), because a
     menu item that is merely absent is one devtools inspection away from being
     present. What it buys is an admin area that shows a teacher a screen they
     can actually work on rather than six links that answer 403. */
  const r = roles.roleOf(admin.role);
  res.json({
    admin: { ...admin, caps: roles.capsOf(admin.role), label: r.label, blurb: r.blurb }
  });
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
router.get('/admin/reports', roles.requireCap('reports.read'), async (req, res) => {
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

  /* A daily series across the chosen window: new users, codes activated,
     revenue. Three grouped queries rather than three per day: at 90 days the
     loop was 270 round trips for one screen, every time the period chip was
     pressed, on the one process that also serves the learners. The days with
     nothing in them are filled in here, because a chart wants every day. */
  const firstDay = new Date(Date.now() - (days - 1) * 86400000).toISOString().slice(0, 10);
  const perDay = (rows, key) => new Map(rows.map(r => [r.day, Number(r[key]) || 0]));
  const usersByDay = perDay(await q.all(
    `SELECT substr(created_at,1,10) day, COUNT(*) c FROM users
      WHERE substr(created_at,1,10) >= ? GROUP BY substr(created_at,1,10)`, firstDay), 'c');
  const redeemsByDay = perDay(await q.all(
    `SELECT substr(redeemed_at,1,10) day, COUNT(*) c FROM codes
      WHERE redeemed_at IS NOT NULL AND substr(redeemed_at,1,10) >= ? GROUP BY substr(redeemed_at,1,10)`, firstDay), 'c');
  const revenueByDay = perDay(await q.all(
    `SELECT substr(created_at,1,10) day, COALESCE(SUM(amount),0) s FROM orders
      WHERE status='paid' AND substr(created_at,1,10) >= ? GROUP BY substr(created_at,1,10)`, firstDay), 's');
  const series = [];
  for (let i = days - 1; i >= 0; i--) {
    const day = new Date(Date.now() - i * 86400000).toISOString().slice(0, 10);
    series.push({
      day,
      users: usersByDay.get(day) || 0,
      redeems: redeemsByDay.get(day) || 0,
      revenue: revenueByDay.get(day) || 0
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
     GROUP BY COALESCE(o.package_id, o.name), COALESCE(p.name, o.name)
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
router.get('/admin/questions', roles.requireCap('bank.read'), async (req, res) => {
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
    `SELECT id, family_id, skill, level, type, part, group_key, ext_key, prompt, options_json, answer, explanation, tags_json, status, created_at,
            script, model_answer,
            audio_key, audio_bytes, audio_at,
            question_audio_key, question_audio_bytes, question_audio_at
       ${sql} ORDER BY id DESC LIMIT ? OFFSET ?`, ...args, limit, offset);

  res.json({
    total, limit, offset,
    items: rows.map(r => ({
      id: r.id, familyId: r.family_id, skill: r.skill, level: r.level, type: r.type,
      part: r.part || null,
      /* Which questions share one stimulus. Null for everything answered item by
         item. An admin looking at Part G needs to see that three questions hang
         off one passage - and that only the first of them carries the
         recording - or the other two look like items somebody forgot to
         attach audio to. */
      groupKey: r.group_key || null,
      /* The authoring key — `vpet-g-07` — which is what every script, the item
         bank file and the audio manifest call this item. Not a secret, and it
         is the only name that lets an administrator (or a failing check) match
         a row on this screen to the recording on disk it is supposed to have.
         A numeric id cannot do that. */
      extKey: r.ext_key || null,
      prompt: r.prompt, options: jparse(r.options_json, []), answer: r.answer,
      explanation: r.explanation, tags: jparse(r.tags_json, []), status: r.status, createdAt: r.created_at,
      /* What the recording says, and Part G's model answer. For the editor and
         for the marker; a candidate never sees either. */
      script: r.script || '', modelAnswer: r.model_answer || '',
      /* The key itself never leaves the server - the browser only needs to know
         whether a file is attached, and how big it is. */
      hasAudio: !!r.audio_key, audioBytes: r.audio_bytes || 0, audioAt: r.audio_at || null,
      /* Part G's spoken question — a second recording on the same item, so the
         three questions are asked out loud rather than read off the screen. */
      hasQuestionAudio: !!r.question_audio_key,
      questionAudioBytes: r.question_audio_bytes || 0,
      questionAudioAt: r.question_audio_at || null
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
  /* A typed item with no key is not an incomplete item, it is a WRONG one: it
     goes into a paper, a candidate types the right sentence, and markItem()
     finds no key and scores zero. Nothing downstream can tell that apart from a
     candidate who got it wrong, which is why this is refused at the door rather
     than reported later.
     It was possible to save one until now — the bank editor had no field for a
     key at all and sent an empty string for everything that was not multiple
     choice, so every Part A and Part E item written through the screen was born
     unmarkable. */
  if (type === 'gap' && !answer) {
    return { err: 'A typed item needs an answer key, or every candidate is marked wrong. '
      + 'Separate equally correct spellings with | — for example: color | colour' };
  }
  const tags = Array.isArray(body.tags) ? body.tags.map(t => str(t, 30)).filter(Boolean).slice(0, 10) : [];

  /* What the recording says, for the parts that are heard. Only the marker
     reads it: Part H is scored by comparing the transcript with this sentence,
     Part G and J are judged against this passage or story. An item authored on
     the bank screen had nowhere to put it, so every such item was marked with
     nothing to compare against. The model answer is a reference for Part G's
     marker — see scriptFor() in server/ai-marking-run.js — and never a key. */
  const heard = skill === 'listening' || skill === 'speaking';
  const script = heard ? str(body.script, 6000) : '';
  const modelAnswer = heard ? str(body.modelAnswer, 500) : '';

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
    /* And however many options the part publishes, exactly. Part F shows three —
       "You will see three possible answers" — so a fourth is a distractor the
       exam never displays and nobody can choose, on an item that looks finished.
       Checked here as well as in the editor because the editor is not the only
       way in: the CSV importer, the JSON tab and the write-into-a-part screen
       all arrive through readQuestion(). */
    if (sec && type === 'mcq' && sec.choices && options.length !== sec.choices) {
      return { err: 'Part ' + part + ' shows ' + sec.choices + ' options, and this item has '
        + options.length + '. The exam would never display the ' + (options.length > sec.choices
          ? 'extra one' + (options.length - sec.choices > 1 ? 's' : '') : 'missing one' + '') + '.' };
    }
  }

  return {
    familyId, skill, level, type, prompt, options, answer,
    part: part || null,
    explanation: str(body.explanation, 2000), tags,
    script: script || null, modelAnswer: modelAnswer || null
  };
}

router.post('/admin/questions', roles.requireCap('bank.write'), async (req, res) => {
  const d = await readQuestion(req.body || {});
  if (d.err) return bad(res, d.err);
  const r = await q.run(
    `INSERT INTO questions (family_id,skill,level,type,part,prompt,options_json,answer,explanation,tags_json,script,model_answer,status,created_at,created_by)
     VALUES (?,?,?,?,?,?,?,?,?,?,?,?,'active',?,?)`,
    d.familyId, d.skill, d.level, d.type, d.part, d.prompt, JSON.stringify(d.options), d.answer,
    d.explanation, JSON.stringify(d.tags), d.script, d.modelAnswer, nowISO(), req.admin.id);
  await audit(req, 'question.create', 'questions/' + r.lastInsertRowid, { family: d.familyId, skill: d.skill, part: d.part });
  res.status(201).json({ id: Number(r.lastInsertRowid) });
});

router.put('/admin/questions/:id', roles.requireCap('bank.write'), async (req, res) => {
  const id = int(req.params.id, 0);
  if (!await q.val('SELECT 1 FROM questions WHERE id=?', id)) return res.status(404).json({ error: 'No such question.' });
  const d = await readQuestion(req.body || {});
  if (d.err) return bad(res, d.err);
  await q.run(`UPDATE questions SET family_id=?, skill=?, level=?, type=?, part=?, prompt=?, options_json=?, answer=?, explanation=?, tags_json=?,
                                    script=?, model_answer=?
          WHERE id=?`,
    d.familyId, d.skill, d.level, d.type, d.part, d.prompt, JSON.stringify(d.options), d.answer,
    d.explanation, JSON.stringify(d.tags), d.script, d.modelAnswer, id);
  await audit(req, 'question.update', 'questions/' + id, {});
  res.json({ ok: true });
});

/** Withdraw or reinstate a question (never a hard delete, so old tests keep their content) */
router.post('/admin/questions/:id/status', roles.requireCap('bank.publish'), async (req, res) => {
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

/* Two recordings can hang off one question, and the three routes are the same
   three routes twice over, so the slot is a parameter rather than a copy:

     `audio`           the item's stimulus — Part E's sentence, Part H's
                       sentence, Part J's story, and for Part G the passage the
                       item's whole group shares.
     `question-audio`  the item's own question, spoken. Part G only, where the
                       three questions are ASKED out loud rather than read off
                       the screen.

   A table of column names rather than three more route bodies differing by one
   identifier each: the copy that drifts is the one nobody is looking at. */
const AUDIO_SLOTS = {
  'audio': { key: 'audio_key', bytes: 'audio_bytes', at: 'audio_at', label: 'audio' },
  'question-audio': { key: 'question_audio_key', bytes: 'question_audio_bytes',
    at: 'question_audio_at', label: 'question audio' }
};
const slotOf = req => AUDIO_SLOTS[req.params.slot] || AUDIO_SLOTS.audio;

async function putSlot(req, res) {
  const slot = slotOf(req);
  const id = int(req.params.id, 0);
  const row = await q.get(
    `SELECT id, group_key, ${slot.key} k FROM questions WHERE id=?`, id);
  if (!row) return res.status(404).json({ error: 'No such question.' });

  /* One stimulus per group, and the exam depends on it.
   *
   * A Part G group is one passage and three questions: the passage belongs to
   * the group and plays once, at the top. The screen offers a passage control
   * on all three items, so attaching a second one was a click away — and the
   * runner would then play a passage again in the middle of the group, after
   * the candidate had already answered about the first.
   *
   * Refused here rather than in the browser, because the invariant is the
   * exam's and not the screen's, and because nothing else checks it:
   * scripts/test-items.mjs asserts one passage per group against the item bank
   * FILE, which an upload does not touch. */
  if (slot.key === 'audio_key' && row.group_key && !row.k) {
    const taken = await q.get(
      'SELECT id FROM questions WHERE group_key=? AND id<>? AND audio_key IS NOT NULL',
      row.group_key, id);
    if (taken) {
      return bad(res, 'These questions share one passage, and it is already attached to '
        + 'another of them. Replace it there, or remove it first — a group with two '
        + 'passages plays the second one in the middle of the group.');
    }
  }

  const buf = Buffer.isBuffer(req.body) ? req.body : null;
  const why = storage.validate(buf, req.get('content-type'));
  if (why) return bad(res, why);

  try {
    const saved = await storage.put(buf, req.get('content-type'));
    /* Replacing an existing file: write the new key first, then drop the old
       one. If the delete fails the row still points at a file that exists. */
    const old = row.k;
    await q.run(`UPDATE questions SET ${slot.key}=?, ${slot.bytes}=?, ${slot.at}=? WHERE id=?`,
      saved.key, saved.bytes, nowISO(), id);
    if (old && old !== saved.key) await storage.remove(old).catch(() => {});
    await audit(req, 'question.audio.upload', 'questions/' + id,
      { bytes: saved.bytes, driver: saved.driver, slot: slot.label });
    res.status(201).json({ ok: true, bytes: saved.bytes, driver: saved.driver });
  } catch (e) {
    if (e.code === 'INVALID_AUDIO') return bad(res, e.message);
    console.error('[audio] upload failed', e);
    res.status(502).json({ error: 'The audio file could not be saved. Check the storage configuration.' });
  }
}

async function getSlot(req, res) {
  const slot = slotOf(req);
  const row = await q.get(`SELECT ${slot.key} k FROM questions WHERE id=?`, int(req.params.id, 0));
  if (!row || !row.k) return res.status(404).json({ error: 'This question has no ' + slot.label + ' file.' });
  try {
    const file = await storage.get(row.k);
    res.set('Content-Type', 'audio/mpeg')
      .set('Content-Length', String(file.body.length))
      /* Exam audio must not sit in a shared cache: it is answer material. */
      .set('Cache-Control', 'private, no-store')
      .send(file.body);
  } catch (e) {
    console.error('[audio] read failed', e);
    res.status(502).json({ error: 'The audio file could not be read.' });
  }
}

async function delSlot(req, res) {
  const slot = slotOf(req);
  const id = int(req.params.id, 0);
  const row = await q.get(`SELECT ${slot.key} k FROM questions WHERE id=?`, id);
  if (!row) return res.status(404).json({ error: 'No such question.' });
  if (!row.k) return res.json({ ok: true });
  await q.run(`UPDATE questions SET ${slot.key}=NULL, ${slot.bytes}=NULL, ${slot.at}=NULL WHERE id=?`, id);
  await storage.remove(row.k).catch(() => {});
  await audit(req, 'question.audio.delete', 'questions/' + id, { slot: slot.label });
  res.json({ ok: true });
}

/* The old paths — /questions/:id/audio — are the `audio` slot and keep working
   exactly as they did; nothing that already calls them has to change. */
router.post('/admin/questions/:id/:slot(audio|question-audio)', roles.requireCap('bank.write'), audioBody, putSlot);
router.get('/admin/questions/:id/:slot(audio|question-audio)', roles.requireCap('bank.read'), getSlot);
router.delete('/admin/questions/:id/:slot(audio|question-audio)', roles.requireCap('bank.write'), delSlot);

/** Bulk import questions (pasted JSON, or CSV already split up on the client) */
router.post('/admin/questions/bulk', roles.requireCap('bank.write'), async (req, res) => {
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

  /* Through `q` rather than a reused prepared statement off the raw SQLite
     handle. The statement cache was worth a little on a bulk import and cost
     the ability to run on anything else: `db.prepare` is node:sqlite's, so this
     route was the only thing standing between the application and a managed
     Postgres. Still one transaction, so a half-imported batch is impossible. */
  await tx(async () => {
    const at = nowISO();
    for (const d of ok) {
      await q.run(
        `INSERT INTO questions (family_id,skill,level,type,part,prompt,options_json,answer,explanation,tags_json,script,model_answer,status,created_at,created_by)
         VALUES (?,?,?,?,?,?,?,?,?,?,?,?,'active',?,?)`,
        d.familyId, d.skill, d.level, d.type, d.part, d.prompt, JSON.stringify(d.options),
        d.answer, d.explanation, JSON.stringify(d.tags), d.script, d.modelAnswer, at, req.admin.id);
    }
  });
  await audit(req, 'question.bulk', 'questions', { inserted: ok.length, failed: errors.length });
  res.status(201).json({ inserted: ok.length, failed: errors.length, errors: errors.slice(0, 20) });
});

/** A sample CSV file for bulk question import.
 *  Served from the server (rather than built as a blob on the client) so the CSP stays strict. */
router.get('/admin/questions/template.csv', roles.requireCap('bank.read'), async (req, res) => {
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
router.get('/admin/questions/availability', roles.requireCap('bank.read'), async (req, res) => {
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

router.get('/admin/exam-formats', roles.requireCap('tests.read'), async (req, res) => {
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

router.get('/admin/tests', roles.requireCap('tests.read'), async (req, res) => {
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

router.get('/admin/tests/:id', roles.requireCap('tests.read'), async (req, res) => {
  const t = await testDetail(str(req.params.id, 60));
  if (!t) return res.status(404).json({ error: 'No such test.' });
  res.json(t);
});

/** Create an empty test (the by-hand route) */
router.post('/admin/tests', roles.requireCap('tests.write'), async (req, res) => {
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

router.put('/admin/tests/:id', roles.requireCap('tests.write'), async (req, res) => {
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
router.post('/admin/tests/:id/status', roles.requireCap('tests.write'), async (req, res) => {
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

router.delete('/admin/tests/:id', roles.requireCap('tests.write'), async (req, res) => {
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

/* ==================== Writing items straight into a part ====================
 *
 * The builder could do exactly one thing with a part: attach items that were
 * already in the bank. Writing a paper therefore meant leaving the builder,
 * typing the items on the bank screen, coming back, and hunting them down again
 * in the picker — once per part, on every paper. The two paths below let the
 * text be typed where the part is being built.
 *
 * What they deliberately do NOT do is invent a second kind of question. Every
 * item written here becomes an ordinary bank row, filed under the paper's exam,
 * the part's skill and the part's letter. That is what keeps a later redraw, the
 * availability counts, the shortage report and the bank screen itself all
 * telling the truth about it afterwards. A question that existed only inside one
 * paper would be invisible to every one of them.
 *
 * Because the exam, skill and part come from the paper rather than the body,
 * four of the eight fields the bank screen asks for are already answered — which
 * is the whole reason this is faster than the round trip it replaces.
 */
const MAX_INLINE_ITEMS = 60;

/**
 * Validate a batch of typed-in items against the part they are going into.
 *
 * The whole batch is checked before a single row is written. Somebody who has
 * just typed eight items and got the seventh wrong should get the seventh back
 * to fix, not a part holding six of them and no way to tell which is missing.
 */
async function readInlineQuestions(list, ctx) {
  if (!Array.isArray(list) || !list.length) return { rows: [] };
  if (list.length > MAX_INLINE_ITEMS) {
    return { err: 'Write at most ' + MAX_INLINE_ITEMS + ' items at a time.' };
  }
  const rows = [];
  for (let i = 0; i < list.length; i++) {
    const raw = list[i] || {};
    /* The paper fixes the exam; the part fixes the skill and the letter. Reading
       any of them from the body would let an item be filed under a part it is
       not actually in — which no screen would ever show, because every screen
       trusts those three to agree with the part it came from. */
    const d = await readQuestion({
      familyId: ctx.familyId,
      skill: ctx.skill,
      part: ctx.part || '',
      level: str(raw.level, 5) || ctx.level,
      type: raw.type,
      prompt: raw.prompt,
      options: raw.options,
      answer: raw.answer,
      explanation: raw.explanation,
      tags: raw.tags,
      script: raw.script,
      modelAnswer: raw.modelAnswer
    });
    if (d.err) return { err: 'Item ' + (i + 1) + ': ' + d.err, index: i };
    /* readQuestion() refuses a keyless gap item for every caller now, so this
       is unreachable and kept only to say which ITEM of the batch was at fault:
       the shared message names no index, and "a gap-fill item needs an answer
       key" is no use against forty pasted rows. */
    if (d.type === 'gap' && !d.answer) {
      return { err: 'Item ' + (i + 1) + ': a gap-fill item needs an answer key.', index: i };
    }
    rows.push(d);
  }

  /* Parts whose items share one recording — Part G, and only Part G today — are
     written in runs of the published group size. Without this every typed item
     became a group of one, so a Part G paper played six passages instead of two
     and the candidate heard each question's passage all over again.
     A batch that does not divide is refused rather than rounded: three items
     into a part that groups in threes is one passage, four is a passage and a
     fragment, and there is no honest guess about which item the fragment goes
     with. `sharesAudio` is narrow on purpose — Part C groups on the clock only,
     because each of its items carries its own copy of the passage. */
  const sec = ctx.part ? EXAM_FORMATS.sectionOfPart(ctx.familyId, ctx.part) : null;
  const size = sec && sec.sharesAudio ? sec.group : 1;
  if (size > 1) {
    if (rows.length % size) {
      return { err: 'Part ' + ctx.part + ' asks ' + size + ' questions about each recording, so items are '
        + 'written ' + size + ' at a time. This batch has ' + rows.length + '. '
        + 'Add ' + (size - (rows.length % size)) + ' more, or remove ' + (rows.length % size) + '.' };
    }
    rows.forEach((d, i) => { d.groupIndex = Math.floor(i / size); });
    /* One group, one level. The key is minted from the group's level and each
       item carries its own, so a group with a B1 first question and two B2 ones
       would be filed under g-b1-N while two thirds of it says B2 — and
       /admin/tests/generate with strictLevel filters on `level`, so it would
       draw part of that group and leave the rest. Unreachable from the composer,
       which sends no per-row level; reachable from the API, which is where an
       import script arrives. */
    for (let g = 0; g * size < rows.length; g++) {
      const members = rows.slice(g * size, (g + 1) * size);
      if (members.some(d => d.level !== members[0].level)) {
        return { err: 'Item ' + (g * size + 1) + ': the ' + size + ' questions about one recording must '
          + 'all be the same level. This group has ' + [...new Set(members.map(d => d.level))].join(' and ') + '.',
        index: g * size };
      }
    }
  }
  return { rows, groupSize: size };
}

/* The next free group key for a part at a level, in the shape the bank already
   uses: g-b1-1, g-b1-2, … Minted here rather than typed by the operator because
   a typed key that happens to match an existing one does not fail — it quietly
   files the new questions under somebody else's passage, and the first sign is
   a candidate hearing a recording that has nothing to do with the question. */
async function nextGroupKey(part, level, alsoTaken) {
  const prefix = part.toLowerCase() + '-' + String(level).toLowerCase() + '-';
  const taken = new Set((await q.all(
    'SELECT group_key FROM questions WHERE group_key LIKE ?', prefix + '%')).map(r => r.group_key));
  /* `alsoTaken` is what this same batch has already minted. Nothing has been
     INSERTed yet when the keys are handed out, so without it two passages in one
     batch would both be told the same key is free and end up as one group of
     six. */
  let n = 1;
  while (taken.has(prefix + n) || (alsoTaken && alsoTaken.has(prefix + n))) n++;
  return prefix + n;
}

/** Insert a validated batch into the bank and attach it to a part, in order.
    Call inside tx(): a half-written part is worse than no part at all. */
async function writeInlineQuestions(rows, sid, adminId) {
  let sort = (await q.val('SELECT COALESCE(MAX(sort),-1) s FROM section_items WHERE section_id=?', sid)) + 1;
  /* One key per run of items that share a recording, minted before the loop so
     the three questions on one passage carry the same one. readInlineQuestions()
     stamped groupIndex; a part that does not group leaves it undefined and every
     row is written with a NULL group_key, exactly as before. */
  const keys = new Map(), minted = new Set();
  for (const d of rows) {
    if (d.groupIndex === undefined || keys.has(d.groupIndex)) continue;
    const key = await nextGroupKey(d.part, d.level, minted);
    minted.add(key);
    keys.set(d.groupIndex, key);
  }
  const ids = [];
  for (const d of rows) {
    const r = await q.run(
      `INSERT INTO questions (family_id,skill,level,type,part,group_key,prompt,options_json,answer,explanation,tags_json,script,model_answer,status,created_at,created_by)
       VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,'active',?,?)`,
      d.familyId, d.skill, d.level, d.type, d.part,
      d.groupIndex === undefined ? null : keys.get(d.groupIndex),
      d.prompt, JSON.stringify(d.options), d.answer,
      d.explanation, JSON.stringify(d.tags), d.script, d.modelAnswer, nowISO(), adminId);
    const qid = Number(r.lastInsertRowid);
    await q.run('INSERT INTO section_items (section_id,question_id,sort) VALUES (?,?,?)', sid, qid, sort++);
    ids.push(qid);
  }
  return ids;
}

/* Writing a paper and writing the bank are two different capabilities, and today
   every role that holds one holds the other. That is exactly why it is worth
   asserting rather than assuming: the moment somebody defines a role that can
   arrange a paper but not author questions, this route would otherwise be the
   back door that lets them do it anyway. */
function mayWriteBank(req, res) {
  if (roles.can(req.admin.role, 'bank.write')) return true;
  res.status(403).json({
    error: 'Your account level can arrange a paper but not write new questions.',
    need: 'bank.write', role: req.admin.role
  });
  return false;
}

/* ---- Sections ---- */
router.post('/admin/tests/:id/sections', roles.requireCap('tests.write'), async (req, res) => {
  const id = str(req.params.id, 60);
  const test = await q.get('SELECT family_id, level FROM tests WHERE id=?', id);
  if (!test) return res.status(404).json({ error: 'No such test.' });
  const b = req.body || {};
  const name = str(b.name, 100);
  const skill = str(b.skill, 20);
  if (name.length < 2) return bad(res, 'That part name is too short.');
  if (!SKILLS.includes(skill)) return bad(res, 'That skill is not valid.');
  /* Attach the part letter if this exam has a part table — so a later reshuffle
     still knows which part to draw from. */
  const allowed = EXAM_FORMATS.partsOf(test.family_id);
  const part = str(b.part, 2).toUpperCase();
  if (part && !allowed.includes(part)) {
    return bad(res, 'That part is not valid. This exam has the parts: ' + (allowed.join(', ') || 'none') + '.');
  }

  /* Items typed in the same dialog as the part. Validated before the part is
     created, so a rejected batch leaves nothing at all behind rather than an
     empty part the operator has to notice and delete. */
  const wanted = Array.isArray(b.questions) ? b.questions : [];
  if (wanted.length && !mayWriteBank(req, res)) return;
  const batch = await readInlineQuestions(wanted, {
    familyId: test.family_id, skill, part, level: str(b.level, 5) || test.level
  });
  if (batch.err) return res.status(400).json({ error: batch.err, index: batch.index });

  let sid = 0, questionIds = [];
  await tx(async () => {
    const sort = (await q.val('SELECT COALESCE(MAX(sort),-1) s FROM sections WHERE test_id=?', id)) + 1;
    const r = await q.run('INSERT INTO sections (test_id,name,skill,type,minutes,sort,part) VALUES (?,?,?,?,?,?,?)',
      id, name, skill, str(b.type, 100) || 'Multiple choice', clamp(int(b.minutes, 0), 0, 600), sort, part || null);
    sid = Number(r.lastInsertRowid);
    if (batch.rows.length) questionIds = await writeInlineQuestions(batch.rows, sid, req.admin.id);
    await q.run('UPDATE tests SET updated_at=? WHERE id=?', nowISO(), id);
  });
  await audit(req, 'section.create', 'tests/' + id,
    { section: name, part: part || null, written: questionIds.length });
  res.status(201).json({ id: sid, questionIds });
});

/** Write brand-new items into a part that already exists. */
router.post('/admin/sections/:sid/questions', roles.requireCap('tests.write'), async (req, res) => {
  const sid = int(req.params.sid, 0);
  const s = await q.get('SELECT * FROM sections WHERE id=?', sid);
  if (!s) return res.status(404).json({ error: 'No such part.' });
  if (!mayWriteBank(req, res)) return;

  const test = await q.get('SELECT family_id, level FROM tests WHERE id=?', s.test_id);
  const b = req.body || {};
  const wanted = Array.isArray(b.questions) ? b.questions : [];
  if (!wanted.length) return bad(res, 'There are no items to write.');

  const batch = await readInlineQuestions(wanted, {
    familyId: test.family_id, skill: s.skill, part: s.part, level: str(b.level, 5) || test.level
  });
  if (batch.err) return res.status(400).json({ error: batch.err, index: batch.index });

  let questionIds = [];
  await tx(async () => {
    questionIds = await writeInlineQuestions(batch.rows, sid, req.admin.id);
    await q.run('UPDATE tests SET updated_at=? WHERE id=?', nowISO(), s.test_id);
  });
  await audit(req, 'section.questions.write', 'sections/' + sid,
    { written: questionIds.length, part: s.part || null });
  res.status(201).json({ added: questionIds.length, questionIds });
});

router.put('/admin/sections/:sid', roles.requireCap('tests.write'), async (req, res) => {
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

router.delete('/admin/sections/:sid', roles.requireCap('tests.write'), async (req, res) => {
  const sid = int(req.params.sid, 0);
  const s = await q.get('SELECT test_id FROM sections WHERE id=?', sid);
  if (!s) return res.status(404).json({ error: 'No such part.' });
  await q.run('DELETE FROM sections WHERE id=?', sid);
  await q.run('UPDATE tests SET updated_at=? WHERE id=?', nowISO(), s.test_id);
  await audit(req, 'section.delete', 'sections/' + sid, {});
  res.json({ ok: true });
});

/** Attach questions to a part (by hand, chosen from the bank) */
router.post('/admin/sections/:sid/items', roles.requireCap('tests.write'), async (req, res) => {
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
      const row = await q.get("SELECT family_id, skill, part FROM questions WHERE id=? AND status='active'", qid);
      /* Only items from the same exam and the same skill as the part — and,
         where both carry a letter, the same letter. Skill cannot tell H from
         J, and the picker's filter is a courtesy the API did not repeat. */
      if (!row || row.family_id !== test.family_id || row.skill !== s.skill
          || (s.part && row.part && row.part !== s.part)) { skipped++; continue; }
      const r = await q.run('INSERT OR IGNORE INTO section_items (section_id,question_id,sort) VALUES (?,?,?)', sid, qid, sort++);
      if (r.changes) added++; else skipped++;
    }
    await q.run('UPDATE tests SET updated_at=? WHERE id=?', nowISO(), s.test_id);
  });
  await audit(req, 'section.items.add', 'sections/' + sid, { added, skipped });
  res.json({ added, skipped });
});

router.delete('/admin/items/:itemId', roles.requireCap('tests.write'), async (req, res) => {
  const itemId = int(req.params.itemId, 0);
  const row = await q.get(`SELECT si.id, s.test_id FROM section_items si
                       JOIN sections s ON s.id = si.section_id WHERE si.id=?`, itemId);
  if (!row) return res.status(404).json({ error: 'No such item in this part.' });
  await q.run('DELETE FROM section_items WHERE id=?', itemId);
  await q.run('UPDATE tests SET updated_at=? WHERE id=?', nowISO(), row.test_id);
  await audit(req, 'section.items.remove', 'items/' + itemId, {});
  res.json({ ok: true });
});

/**
 * Draw `want` items from a pool at random — whole groups or none of them.
 *
 * The same rule plannedPaper() applies, and for the same reason: Part G is
 * three questions about ONE recording that only the first of the three
 * carries. Taking a slice of a shuffled list splits groups, and the candidate
 * is asked about a passage that was never played. The generator drew items one
 * at a time because until now nothing an administrator authored WAS grouped;
 * every Part G batch written through the composer is, so the split went from
 * unlikely to routine. A group that will not fit in what is left is skipped and
 * the next tried, which is why this counts as it goes rather than slicing at
 * the end — and why the caller must compare the result with `want`.
 *
 * Exact-level rows come first, randomised inside each tier, so a level the
 * paper was built at is preferred without being required. `pool` rows carry
 * {id, group_key, exact?}; under `strict` every row is exact.
 *
 * One function for the generator AND the redraw. The generator had this logic
 * and the redraw did not: it kept slicing, so redrawing one Part G section was
 * the one remaining way to build the paper the rule exists to prevent.
 */
function drawFromPool(pool, want, strict) {
  const shuffle = arr => arr.map(v => [Math.random(), v]).sort((a, c) => a[0] - c[0]).map(v => v[1]);
  const exact = pool.filter(r => strict || r.exact);
  const other = pool.filter(r => !strict && !r.exact);
  const byGroup = new Map();
  for (const r of pool) if (r.group_key) {
    if (!byGroup.has(r.group_key)) byGroup.set(r.group_key, []);
    byGroup.get(r.group_key).push(r);
  }
  const chosen = [];
  const taken = new Set();
  const takenGroups = new Set();
  for (const r of shuffle(exact).concat(shuffle(other))) {
    if (chosen.length >= want) break;
    if (taken.has(r.id)) continue;
    if (!r.group_key) { taken.add(r.id); chosen.push(r); continue; }
    if (takenGroups.has(r.group_key)) continue;
    const members = (byGroup.get(r.group_key) || []).filter(m => !taken.has(m.id));
    if (chosen.length + members.length > want) continue;
    takenGroups.add(r.group_key);
    for (const m of members) { taken.add(m.id); chosen.push(m); }
  }
  return chosen;
}

/** GENERATE a test from a blueprint: drawn at random from the question bank.
 *  body: { familyId, level, title?, blueprint:[{name,skill,type,items,minutes}], strictLevel? }
 *  - strictLevel=true: only items at that level; by default the level is preferred, then others.
 *  - Returns a clear error when the bank does not hold enough.
 */
router.post('/admin/tests/generate', roles.requireCap('tests.write'), async (req, res) => {
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
      ? await q.all(`SELECT id, group_key FROM questions WHERE ${poolSql} AND level=?`, ...poolArgs, level)
      : await q.all(`SELECT id, group_key, (level=?) exact FROM questions WHERE ${poolSql} ORDER BY exact DESC`,
              level, ...poolArgs);

    const avail = pool.filter(r => !usedIds.has(r.id));
    if (avail.length < want) {
      shortages.push({
        section: str(sec.name, 100) || skill, skill, part: part || null,
        need: want, have: avail.length
      });
      continue;
    }
    const chosen = drawFromPool(avail, want, strict);
    /* Counted after the grouping, not before: a part whose remaining items are
       all in groups too big for the gap left is short even though `avail` said
       otherwise, and reporting it here is the difference between a shortage the
       operator can act on and a paper quietly one item light. */
    if (chosen.length < want) {
      shortages.push({
        section: str(sec.name, 100) || skill, skill, part: part || null,
        need: want, have: chosen.length
      });
      continue;
    }
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
      const made = await q.run('INSERT INTO sections (test_id,name,skill,type,minutes,sort,part) VALUES (?,?,?,?,?,?,?)',
        id, str(p.sec.name, 100) || p.sec.skill, str(p.sec.skill, 20),
        str(p.sec.type, 100) || 'Multiple choice', clamp(int(p.sec.minutes, 0), 0, 600), i, p.part || null);
      const sid = Number(made.lastInsertRowid);
      for (const [j, qid] of p.ids.entries()) {
        await q.run('INSERT OR IGNORE INTO section_items (section_id,question_id,sort) VALUES (?,?,?)', sid, qid, j);
      }
    }
  });

  await audit(req, 'test.generate', 'tests/' + id, { familyId, level, sections: bp.length, items: usedIds.size });
  res.status(201).json(await testDetail(id));
});

/** Redraw every item in a part (keeping the count) */
router.post('/admin/sections/:sid/reshuffle', roles.requireCap('tests.write'), async (req, res) => {
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
    `SELECT id, group_key, (level=?) exact FROM questions WHERE ${poolSql} ORDER BY exact DESC`,
    t.level, ...poolArgs);
  if (pool.length < want) {
    return bad(res, 'The bank' + (s.part ? ' for part ' + s.part : '') + ' holds only ' + pool.length +
      ' items, short of the ' + want + ' needed.');
  }

  /* Whole groups or none — the generator's rule, see drawFromPool(). */
  const chosen = drawFromPool(pool, want, false);
  if (chosen.length < want) {
    return bad(res, 'The bank' + (s.part ? ' for part ' + s.part : '') + ' can fill only ' + chosen.length
      + ' of the ' + want + ' items: its items come in groups that do not divide into ' + want + '.');
  }
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
router.get('/admin/users', roles.requireCap('users.read'), async (req, res) => {
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

router.get('/admin/users/:id', roles.requireCap('users.read'), async (req, res) => {
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
router.post('/admin/users', roles.requireCap('users.write'), async (req, res) => {
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
router.post('/admin/users/bulk', roles.requireCap('users.write'), async (req, res) => {
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
router.post('/admin/users/:id/grant', roles.requireCap('users.write'), async (req, res) => {
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
router.post('/admin/users/:id/password', roles.requireCap('users.write'), async (req, res) => {
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

router.post('/admin/users/:id/status', roles.requireCap('users.write'), async (req, res) => {
  const id = int(req.params.id, 0);
  const status = str(req.body && req.body.status, 20);
  if (!['active', 'locked'].includes(status)) return bad(res, 'That status is not valid.');
  const r = await q.run('UPDATE users SET status=? WHERE id=?', status, id);
  if (!r.changes) return res.status(404).json({ error: 'No such student.' });
  await audit(req, 'user.status', 'users/' + id, { status });
  res.json({ ok: true });
});

router.post('/admin/users/:id/verify', roles.requireCap('users.write'), async (req, res) => {
  const id = int(req.params.id, 0);
  const r = await q.run('UPDATE users SET verified=1 WHERE id=?', id);
  if (!r.changes) return res.status(404).json({ error: 'No such student.' });
  await audit(req, 'user.verify', 'users/' + id, {});
  res.json({ ok: true });
});

router.put('/admin/users/:id', roles.requireCap('users.write'), async (req, res) => {
  const id = int(req.params.id, 0);
  const u = await q.get('SELECT * FROM users WHERE id=?', id);
  if (!u) return res.status(404).json({ error: 'No such student.' });
  const b = req.body || {};
  const name = str(b.name, 120) || u.name;
  const note = str(b.note, 500);
  /* One at a time, awaited. This was `.filter(familyExists)` — an async
     predicate returns a Promise, a Promise is truthy, and the filter kept
     every string it was handed. */
  let interests = jparse(u.interests_json, []);
  if (Array.isArray(b.interests)) {
    interests = [];
    for (const x of b.interests.map(v => str(v, 20)).filter(Boolean)) {
      if (await familyExists(x) && !interests.includes(x)) interests.push(x);
    }
  }
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
    if (ids.length < 2) return false;
    /* A loop, not `.every(familyExists)`: `every` cannot await, a Promise is
       truthy, and every combo naming two words passed — including words that
       are not exam families, which redeem into nothing. */
    for (const id of ids) if (!await familyExists(id)) return false;
    return true;
  }
  return false;
}

router.get('/admin/codes', roles.requireCap('codes.read'), async (req, res) => {
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

router.get('/admin/batches', roles.requireCap('codes.read'), async (req, res) => {
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
router.post('/admin/codes', roles.requireCap('codes.write'), async (req, res) => {
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
      const made = await q.run('INSERT INTO batches (name,unlock_type,unlock_ref,qty,expires_at,created_at,created_by) VALUES (?,?,?,?,?,?,?)',
        str(b.batchName, 120) || (plan.name + ' batch ' + at.slice(0, 10)),
        type, ref, qty, expiresAt, at, req.admin.id);
      batchId = Number(made.lastInsertRowid);
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

router.post('/admin/codes/:id/revoke', roles.requireCap('codes.write'), async (req, res) => {
  const id = int(req.params.id, 0);
  const c = await q.get('SELECT * FROM codes WHERE id=?', id);
  if (!c) return res.status(404).json({ error: 'No such code.' });
  if (c.status === 'revoked') return bad(res, 'That code was already revoked.');
  await q.run("UPDATE codes SET status='revoked' WHERE id=?", id);
  await audit(req, 'code.revoke', 'codes/' + id, { code: c.code, wasStatus: c.status });
  res.json({ ok: true });
});

/**
 * Refund a bought code: withdraw it and write the refund down against the order.
 *
 * Revoking on its own was never enough. It stops the code being used, which is
 * the half that protects us, and leaves `orders.status` reading 'paid' — so the
 * revenue report counts a sale that was handed back, and nothing anywhere says
 * why the code died. The schema has had a 'refunded' state all along and no code
 * path that could ever write it.
 *
 * Both writes go in one transaction. A revoked code beside an order still
 * reading 'paid' is the worst of the three possible outcomes: the customer has
 * lost the code and the books say they were not refunded.
 *
 * It does NOT refuse a redeemed code. The published policy says an activated
 * code is not refundable, but it also says our own faults are refundable whether
 * activated or not — charged twice, charged with no code issued, a long outage.
 * An endpoint that hard-blocks those would push the administrator into editing
 * the database by hand, which is worse than the thing it prevents. So the rule
 * is enforced by recording rather than by refusing: `withinPolicy` says whether
 * this one followed the ordinary rule, and the audit row keeps the reason, the
 * redemption state and the age of the order. A refund outside the rule is then a
 * thing somebody can find later, which is the point.
 */
router.post('/admin/codes/:id/refund', roles.requireCap('codes.write'), async (req, res) => {
  const id = int(req.params.id, 0);
  const reason = str(req.body && req.body.reason, 300);
  if (!reason) return bad(res, 'Say why this is being refunded — it goes in the audit log.');

  const c = await q.get('SELECT * FROM codes WHERE id=?', id);
  if (!c) return res.status(404).json({ error: 'No such code.' });

  const order = await q.get('SELECT * FROM orders WHERE code_id=?', id);
  if (!order) return bad(res, 'That code was not bought online, so there is no payment to refund.');
  if (order.status === 'refunded') return bad(res, 'That order was already refunded.');
  if (order.status !== 'paid') return bad(res, `That order is "${order.status}", so there is nothing to refund.`);

  /* The two conditions the policy actually names, evaluated rather than assumed:
     never activated, and asked for inside the refund window. */
  const ageDays = (Date.now() - Date.parse(order.created_at)) / 86400e3;
  const withinPolicy = c.status === 'unused' && ageDays <= PLANS.REFUND_DAYS;

  await tx(async () => {
    if (c.status !== 'revoked') await q.run("UPDATE codes SET status='revoked' WHERE id=?", id);
    await q.run("UPDATE orders SET status='refunded' WHERE id=?", order.id);
  });

  await audit(req, 'code.refund', 'codes/' + id, {
    code: c.code, order: order.id, amount: order.amount, reason,
    wasStatus: c.status, orderAgeDays: Math.round(ageDays * 10) / 10, withinPolicy
  });
  res.json({ ok: true, withinPolicy, order: { id: order.id, amount: order.amount } });
});

/** Export the codes as CSV (by batch, or by status filter) */
router.get('/admin/codes/export', roles.requireCap('codes.read'), async (req, res) => {
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

router.get('/admin/classroom', roles.requireCap('secrets.manage'), async (req, res) => {
  res.set('Cache-Control', 'no-store').json(await classroom.status(req.admin.id));
});

router.get('/admin/classroom/courses', roles.requireCap('secrets.manage'), async (req, res) => {
  try {
    res.set('Cache-Control', 'no-store').json(await classroom.courses(req.admin.id));
  } catch (e) {
    /* A Google failure is not a fault in this server, and the administrator can
       act on it — reconnect, or grant the missing scope — so the reason is
       passed on rather than swallowed into a 500. */
    res.status(502).json({ error: (e && e.message) || 'Google Classroom could not be reached' });
  }
});

router.get('/admin/classroom/courses/:courseId/roster', roles.requireCap('secrets.manage'), async (req, res) => {
  const courseId = str(req.params.courseId, 60);
  if (!courseId) return bad(res, 'Which course?');
  try {
    res.set('Cache-Control', 'no-store').json(await classroom.roster(req.admin.id, courseId));
  } catch (e) {
    res.status(502).json({ error: (e && e.message) || 'Google Classroom could not be reached' });
  }
});

router.post('/admin/classroom/unlink', roles.requireCap('secrets.manage'), async (req, res) => {
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

router.get('/admin/settings', roles.requireCap('reports.read'), async (req, res) => {
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
    }))
    /* The administrator list used to be returned here, and it had to move.
       This route is readable by every level — a teacher opens the same screen
       to change their own password — so a roster of every administrator, their
       username and their level was travelling to accounts that cannot manage
       them and have no reason to know they exist. It now comes from
       GET /admin/admins, behind `admins.manage`. */
  });
});

router.put('/admin/settings', roles.requireCap('settings.write'), async (req, res) => {
  const b = (req.body && req.body.settings) || {};
  const allowed = PUBLIC_SETTING_KEYS;
  /* Same reason as the bulk import above: no raw node:sqlite handle, so this
     route runs on whichever engine is configured. At most a handful of keys. */
  for (const k of allowed) {
    if (!(k in b)) continue;
    await q.run('INSERT INTO settings (key,value) VALUES (?,?) ON CONFLICT(key) DO UPDATE SET value=excluded.value',
      k, str(b[k], 300));
  }
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
const aiBudget = require('./ai-budget');

/* Everything on this credential - reading its status included, since the key
   hint and the endpoint are its shape - needs `secrets.manage`, which only the
   top level holds. It used to be `requireOwner`, a direct test of the role;
   the capability says the same thing and says it in the one place that also
   answers what a manager and a teacher may do. See server/roles.js. */

router.get('/admin/ai', roles.requireCap('secrets.manage'), async (req, res) => {
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
  /* Where the spending ceilings stand. On the screen because a limit nobody can
     see is a limit that arrives as a mystery: without this, the first anybody
     knows of it is a paper that stopped marking for no visible reason. */
  const budget = await aiBudget.status();
  res.set('Cache-Control', 'no-store').json({ ai: s, waiting, backlog, due: dueNow, budget });
});

router.put('/admin/ai', roles.requireCap('secrets.manage'), async (req, res) => {
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
    /* A line break INSIDE the value, which trim() cannot reach. It matters
       because of where the value goes next: straight into a header, where
       Node refuses it — and the TypeError it refuses with quotes the whole
       value back. scrub() masks `sk-...` up to the newline and publishes
       everything after it, into ai.lastError, which is a plaintext settings
       row that is read by the admin screen and copied into every backup. The
       same check already guards the model name three fields up. */
    if (/[\r\n]/.test(raw)) {
      return bad(res, 'That key has a line break in it. Copy it again without the newline.');
    }

    /* The one wrong value worth spending a scrypt on.
     *
     * These two inputs are `type="password"`, so a browser's password manager
     * offers the credential it has saved for THIS site — the administrator's
     * own sign-in password. The field markup now tells every manager not to,
     * but the browser is not the last word on what arrives here, and the cost
     * of this particular mistake is not a bad setting: the value is sealed into
     * the database and then sent to api.anthropic.com in an `x-api-key` header
     * on the next paper marked. An administrator password handed to a third
     * party, by a form that looked like it worked.
     *
     * So it is checked, once, against the account doing the saving — which is
     * the only credential a manager would have had to offer. One scrypt on a
     * route somebody touches twice a year. */
    if (raw) {
      const me = await q.get('SELECT pass_hash FROM admins WHERE id=?', req.admin.id);
      if (me && A.verifyPassword(raw, me.pass_hash)) {
        return bad(res, 'That is your own sign-in password, not an API key — your browser '
          + 'probably filled it in. Paste the key from the provider instead.');
      }
    }

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
router.post('/admin/ai/sweep', roles.requireCap('marking.run'), async (req, res) => {
  if (!await aiMarking.ready()) return bad(res, 'No marking key is configured.');
  const out = await aiRun.sweep();
  await audit(req, 'ai.sweep', 'attempts', out);
  res.json({ ok: true, ...out });
});

router.post('/admin/ai/test', roles.requireCap('secrets.manage'), async (req, res) => {
  const out = await aiMarking.testConnection();
  await audit(req, 'ai.test', 'settings', { ok: out.ok });
  res.status(out.ok ? 200 : 502).json(out);
});

/** Mark one paper's outstanding writing and speaking now, and wait for it. */
/* Not owner-only: `marking.run` is held by all three levels, deliberately —
   re-marking a paper is the everyday fix for a teacher looking at a wrong
   score, and routing it through the owner would make that a ticket. The
   comment here used to claim the opposite, which is the kind of thing that
   gets believed instead of the code. It does spend against the owner's
   credential, so what actually bounds it is server/ai-budget.js, not the role. */
router.post('/admin/attempts/:id/mark', roles.requireCap('marking.run'), async (req, res) => {
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

/* ======================= BACKUPS =======================
   Whether the database is actually being copied anywhere, answerable from a
   screen instead of from a shell on the box.

   The reason this route exists rather than "the operator can check with ssh":
   the commonest way a backup system fails is not by breaking loudly on the day
   it is needed. It stops quietly months earlier, and everybody keeps believing
   it runs. Something a person sees every time they open Settings is the cheapest
   possible defence against that.

   Read-only, and owner-only. It names buckets and file names, which is a map of
   where the data lives — not something every admin role needs. */

const backup = require('./backup');

router.get('/admin/backup', roles.requireCap('secrets.manage'), async (req, res) => {
  const health = await backup.backupHealth();
  const list = await backup.list().catch(() => []);
  res.set('Cache-Control', 'no-store').json({
    health,
    /* Ten is enough to see a schedule running and to spot a gap in it. The full
       list is a bucket listing and belongs in a bucket listing. */
    recent: list.slice(0, 10).map(b => ({ name: b.name, bytes: b.bytes, at: b.at })),
    count: list.length,
    keepDays: backup.config().keepDays,
    minKeep: backup.MIN_KEEP,
    staleHours: Math.round(backup.STALE_MS / 3.6e6)
  });
});

/**
 * Take one now.
 *
 * Not a substitute for the schedule — a backup somebody has to remember is not a
 * backup. It is here for the moment before a risky change, which is exactly when
 * a person wants one and exactly when waiting six hours for the next cron is the
 * wrong answer.
 */
router.post('/admin/backup', roles.requireCap('secrets.manage'), async (req, res) => {
  try {
    const out = await backup.backup();
    await audit(req, 'backup.run', 'database', { name: out.name, driver: out.driver, bytes: out.bytes });
    res.json({ ok: true, ...out });
  } catch (e) {
    /* The reason goes back to the owner because the owner is the only one who
       can fix it — a missing bucket, a permission, an unset variable. It is the
       same class of message as the marking connection test. */
    await audit(req, 'backup.failed', 'database', { error: String(e && e.message).slice(0, 200) });
    res.status(502).json({ ok: false, error: String(e && e.message || e).slice(0, 300) });
  }
});

router.put('/admin/packages/:id', roles.requireCap('settings.write'), async (req, res) => {
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

/* ==================== ADMINISTRATORS ====================
 *
 * Making other administrators, and setting what they may do. Owner-only, all of
 * it, because the account that can create accounts can create itself a way
 * round every other permission in the platform.
 *
 * Four rules are enforced on the server and not merely hidden in the interface,
 * because the interface is a suggestion and these are not:
 *
 *   1. You cannot change your own level. Otherwise the sole owner demotes
 *      themselves by mis-clicking and the platform has nobody who can undo it.
 *   2. You cannot deactivate yourself, for the same reason and more immediately.
 *   3. The LAST active owner cannot be demoted or deactivated by anybody,
 *      including another owner. This is the one that actually saves the
 *      install: two owners, each deactivating the other, is a platform with no
 *      way back in short of the command line.
 *   4. Changing somebody's level or turning them off ends their sessions on the
 *      spot. A permission that keeps working for the next eight hours because
 *      that is when the cookie expires is not a permission that was removed.
 *
 * `scripts/accounts.js` stays the way back in when all four rules have somehow
 * still produced a locked-out platform. It runs on the machine, so it answers
 * to whoever holds the server rather than to whoever holds a session.
 */

/** Everything about the administrators, except anything secret. */
router.get('/admin/admins', roles.requireCap('admins.manage'), async (req, res) => {
  const rows = await q.all(
    `SELECT id, username, name, role, active, created_at, last_login_at,
            totp_enabled_at IS NOT NULL AS totp
       FROM admins ORDER BY active DESC, role, lower(username)`);
  res.set('Cache-Control', 'no-store').json({
    admins: rows.map(r => ({ ...r, totp: !!r.totp, label: roles.roleOf(r.role).label })),
    roles: roles.list(),
    me: req.admin.id
  });
});

/**
 * The invariant: at least one owner can always still sign in.
 *
 * Checked AFTER the write and inside the transaction, which is not fussiness.
 * The obvious version — count the other owners first, refuse if there are none
 * — cannot fire at all through a single request: only an owner may manage
 * administrators, so the actor IS another owner, and the count is never zero.
 * It reads like a safety net and catches nothing.
 *
 * What it misses is two owners acting at the same moment. A deactivates B while
 * B deactivates A; both requests count the other as the survivor, both are
 * allowed, both writes land, and the platform has no owner left and no way back
 * in short of the command line. The window is between the count and the update,
 * so the fix is to look after the update, with the write held open — SQLite
 * serialises writers, so the second transaction sees the first one's row.
 */
class NoOwnerLeft extends Error {}

async function assertAnOwnerRemains() {
  const owners = await q.val("SELECT COUNT(*) c FROM admins WHERE role='owner' AND active=1");
  if (!owners) throw new NoOwnerLeft();
}

/** Make an administrator. */
router.post('/admin/admins', roles.requireCap('admins.manage'), async (req, res) => {
  const b = req.body || {};
  const username = str(b.username, 40).toLowerCase();
  const name = str(b.name, 120);
  const role = str(b.role, 20);
  const password = typeof b.password === 'string' ? b.password : '';

  if (!/^[a-z0-9._-]{3,40}$/.test(username)) {
    return bad(res, 'A username is 3 to 40 characters: letters, digits, dot, dash or underscore.');
  }
  if (!name) return bad(res, 'Give the account a display name.');
  if (!roles.isRole(role)) return bad(res, 'Pick one of the three levels.');
  const pwProblem = A.passwordProblem(password);
  if (pwProblem) return bad(res, pwProblem);
  if (await q.val('SELECT 1 FROM admins WHERE lower(username)=?', username)) {
    return bad(res, 'That username is taken.');
  }

  await q.run(
    'INSERT INTO admins (username,name,pass_hash,role,active,created_at) VALUES (?,?,?,?,1,?)',
    username, name, A.hashPassword(password), role, nowISO());
  /* The password is never echoed back, not even to the owner who just typed it.
     It reached the server once, over one request; putting it in the response
     puts it in every proxy log and every browser history between here and
     them, in exchange for nothing they do not already know. */
  await audit(req, 'admin.create', 'admins/' + username, { role });
  res.json({ ok: true, username, role });
});

/** Rename, re-level, or turn an administrator on and off. */
router.put('/admin/admins/:id', roles.requireCap('admins.manage'), async (req, res) => {
  const id = int(req.params.id, 0);
  const target = await q.get('SELECT id, username, name, role, active FROM admins WHERE id=?', id);
  if (!target) return res.status(404).json({ error: 'No such administrator.' });

  const b = req.body || {};
  const patch = {};
  if (typeof b.name === 'string') {
    const name = str(b.name, 120);
    if (!name) return bad(res, 'A display name cannot be empty.');
    patch.name = name;
  }
  if (typeof b.role === 'string' && b.role !== target.role) {
    if (!roles.isRole(b.role)) return bad(res, 'Pick one of the three levels.');
    if (target.id === req.admin.id) {
      return bad(res, 'You cannot change your own level. Ask another administrator.');
    }
    patch.role = b.role;
  }
  if (typeof b.active === 'boolean' && b.active !== !!target.active) {
    if (target.id === req.admin.id) {
      return bad(res, 'You cannot deactivate your own account.');
    }
    patch.active = b.active ? 1 : 0;
  }

  const keys = Object.keys(patch);
  if (!keys.length) return res.json({ ok: true, unchanged: true });

  try {
    await tx(async () => {
      await q.run('UPDATE admins SET ' + keys.map(k => k + '=?').join(', ') + ' WHERE id=?',
        ...keys.map(k => patch[k]), id);
      /* Inside the transaction, after the write: see the note on
         assertAnOwnerRemains. Throwing rolls the change back. */
      if ('role' in patch || 'active' in patch) await assertAnOwnerRemains();

      /* Anything that changes what this account may do ends its sessions. A
         level taken away that keeps working until the cookie expires was not
         taken away. Inside the transaction too, so a rolled-back demotion does
         not sign somebody out of a change that never happened. */
      if ('role' in patch || 'active' in patch) {
        await q.run('DELETE FROM sessions WHERE admin_id=?', id);
      }
    });
  } catch (e) {
    if (e instanceof NoOwnerLeft) {
      return bad(res, 'That would leave the platform with no administrator at the top level. Promote somebody else first.');
    }
    throw e;
  }
  await audit(req, 'admin.update', 'admins/' + target.username, patch);
  res.json({ ok: true, ...patch });
});

/** Set somebody else's password, for the day they lose theirs. */
router.post('/admin/admins/:id/password', roles.requireCap('admins.manage'), async (req, res) => {
  const id = int(req.params.id, 0);
  const target = await q.get('SELECT id, username FROM admins WHERE id=?', id);
  if (!target) return res.status(404).json({ error: 'No such administrator.' });

  const password = typeof (req.body || {}).password === 'string' ? req.body.password : '';
  const problem = A.passwordProblem(password);
  if (problem) return bad(res, problem);

  await q.run('UPDATE admins SET pass_hash=? WHERE id=?', A.hashPassword(password), id);
  /* Including their own, if an owner resets their own here: a password change
     is exactly when every other device holding a session should stop being
     trusted, because "somebody has my password" is the usual reason. */
  await q.run('DELETE FROM sessions WHERE admin_id=?', id);
  await audit(req, 'admin.password_reset', 'admins/' + target.username, {});
  res.json({ ok: true, reauth: target.id === req.admin.id });
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
   It signs THIS browser into the demo student alongside the admin session
   (prep_user and prep_admin are separate cookies and never collide), and raises
   a prep_preview flag the student pages read to show a "back to admin" banner.
   Scoped to the demo account by design: an administrator can walk the platform,
   never open a real student's private dashboard. Ending the preview is an
   ordinary student sign-out, which clears the flag too.

   It is NOT read-only — this comment used to say it was, and the word was doing
   no work: the session it creates is an ordinary student session, so a paper sat
   during a preview is really sat, by `student`. That is fine while the preview
   is a preview, which is why the session is a SHORT one (see
   PREVIEW_SESSION_HOURS in server/auth.js). Anyone wanting to test as a learner
   for longer than that should sign in as one. */
router.post('/admin/preview-student', roles.requireCap('users.read'), async (req, res) => {
  const demo = await q.get('SELECT id FROM users WHERE username=?', A.DEMO_STUDENT_USER);
  if (!demo) return res.status(404).json({ error: 'There is no demo student on this server to preview.' });
  await A.createUserSession(demo.id, req, res, { preview: true });
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

router.get('/admin/audit', roles.requireCap('audit.read'), async (req, res) => {
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
      /* Everything about a part that a screen would otherwise have to keep its
         own copy of.

         `type` is the blueprint's own words for what the part asks of a student
         — "Type the missing word", "Read, then rewrite from memory" — which the
         builder used to make an operator retype for every part.

         `choices` is how many options the part shows, and it is here because the
         bank editor rendered four for every part: Part F takes THREE — the guide
         says "You will see three possible answers" — so a Part F item was
         authored with a fourth option the exam will never display. */
      /* `group` and `sharesAudio` together say how the part's items are written:
         Part G asks three questions about one recording, so it is authored three
         at a time and only the first of each three carries the passage. The
         builder needs both numbers to lay the rows out that way, and the API
         refuses a batch that does not divide by the same number. */
      return {
        part: letter, name: sec.name || letter, skill: sec.skill || '',
        types: sec.types || [], type: sec.type || '',
        choices: sec.choices || null, minWords: sec.minWords || null,
        needsAudio: !!sec.needsAudio,
        group: sec.group || 1, sharesAudio: !!sec.sharesAudio
      };
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
/* ------------------------------------------------------------------ *
 * Practice on the two reference pages
 *
 * The verb table and the linking-word table were lookup tables with nothing to
 * do. server/learn-practice.js carries the reasoning, including why the
 * browser posts the ANSWER rather than a verdict about it.
 * ------------------------------------------------------------------ */
router.get('/learn/practice', A.requireUser, async (req, res) => {
  const kind = str(req.query.kind, 8);
  if (!learnPractice.KINDS[kind]) return res.status(400).json({ error: 'Unknown kind of practice.' });
  const level = LEVELS.includes(str(req.query.level, 2)) ? str(req.query.level, 2) : '';
  res.set('Cache-Control', 'no-store')
     .json({ items: await learnPractice.draw(kind, level, req.query.size) });
});

router.post('/learn/practice', A.requireUser, A.csrfGuard, async (req, res) => {
  const b = req.body || {};
  const out = await learnPractice.submit(req.user.id, str(b.kind, 8), b.roundId, b.answers);
  if (out.error === 'bad-kind') return res.status(400).json({ error: 'Unknown kind of practice.' });
  if (out.error === 'no-answers') return res.status(400).json({ error: 'No answers were sent.' });
  res.json(out);
});

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
