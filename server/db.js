/**
 * Lớp dữ liệu — SQLite nhúng qua node:sqlite (không cần dependency native).
 * File DB: data/prep.sqlite (bỏ qua trong git, tự tạo + seed ở lần chạy đầu).
 *
 * Quy ước:
 * - Mọi truy vấn dùng prepared statement có tham số (chống SQL injection).
 * - Cột *_json lưu chuỗi JSON; đọc ra bằng jparse().
 * - Thời gian lưu ISO-8601 UTC dạng chuỗi để so sánh và sắp xếp bằng text.
 */
'use strict';
const { DatabaseSync } = require('node:sqlite');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const DATA_DIR = path.join(__dirname, '..', 'data');
const DB_FILE = process.env.PREP_DB || path.join(DATA_DIR, 'prep.sqlite');

if (DB_FILE !== ':memory:') fs.mkdirSync(path.dirname(DB_FILE), { recursive: true });

const db = new DatabaseSync(DB_FILE);
db.exec('PRAGMA journal_mode = WAL');
db.exec('PRAGMA foreign_keys = ON');

/* ============================== SCHEMA ============================== */
db.exec(`
CREATE TABLE IF NOT EXISTS admins (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  username TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  pass_hash TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'editor',          -- owner | editor
  active INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL,
  last_login_at TEXT
);

CREATE TABLE IF NOT EXISTS sessions (
  token_hash TEXT PRIMARY KEY,                  -- chỉ lưu bản băm của token
  admin_id INTEGER NOT NULL REFERENCES admins(id) ON DELETE CASCADE,
  created_at TEXT NOT NULL,
  expires_at TEXT NOT NULL,
  ip TEXT,
  ua TEXT
);

CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  username TEXT NOT NULL UNIQUE,
  email TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  pass_hash TEXT,
  verified INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'active',        -- active | locked
  interests_json TEXT NOT NULL DEFAULT '[]',
  note TEXT,
  created_at TEXT NOT NULL,
  last_login_at TEXT
);

-- Phiên đăng nhập của học viên. Tách khỏi bảng sessions của quản trị để hai khu
-- không bao giờ dùng nhầm phiên của nhau; cũng chỉ lưu BẢN BĂM của token.
CREATE TABLE IF NOT EXISTS user_sessions (
  token_hash TEXT PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TEXT NOT NULL,
  expires_at TEXT NOT NULL,
  ip TEXT,
  ua TEXT
);

-- Token dùng một lần gửi qua email: xác thực tài khoản và đặt lại mật khẩu.
-- Lưu bản băm để rò rỉ DB không dựng lại được liên kết trong hộp thư.
CREATE TABLE IF NOT EXISTS user_tokens (
  token_hash TEXT PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  kind TEXT NOT NULL,                           -- verify | reset
  created_at TEXT NOT NULL,
  expires_at TEXT NOT NULL,
  used_at TEXT
);

CREATE INDEX IF NOT EXISTS idx_user_tokens_user ON user_tokens(user_id, kind);

-- Khu tự học: bảng động từ bất quy tắc V1–V2–V3.
-- Tra được theo bất kỳ cột nào (gõ "went" phải ra "go") nên đánh index cả ba.
CREATE TABLE IF NOT EXISTS irregular_verbs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  v1 TEXT NOT NULL UNIQUE,
  v2 TEXT NOT NULL,
  v3 TEXT NOT NULL,
  ving TEXT NOT NULL,
  ipa_uk TEXT,
  ipa_us TEXT,
  vi TEXT NOT NULL,                             -- nghĩa tiếng Việt
  grp TEXT NOT NULL,                            -- aaa | aba | abb | abc
  level TEXT NOT NULL,                          -- A1…C2
  note TEXT,                                    -- biến thể Anh–Mỹ, bẫy phát âm
  ex_en TEXT,
  ex_vi TEXT,
  sort INTEGER NOT NULL DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_irr_v2 ON irregular_verbs(v2);
CREATE INDEX IF NOT EXISTS idx_irr_v3 ON irregular_verbs(v3);
CREATE INDEX IF NOT EXISTS idx_irr_level ON irregular_verbs(level);

CREATE TABLE IF NOT EXISTS families (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  sub TEXT NOT NULL,
  format TEXT NOT NULL,
  skills_json TEXT NOT NULL DEFAULT '[]',
  sort INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS tests (
  id TEXT PRIMARY KEY,
  family_id TEXT NOT NULL REFERENCES families(id),
  title TEXT NOT NULL,
  level TEXT NOT NULL,
  duration_min INTEGER NOT NULL DEFAULT 0,
  scoring TEXT NOT NULL DEFAULT '',
  guide_json TEXT NOT NULL DEFAULT '[]',
  status TEXT NOT NULL DEFAULT 'draft',         -- draft | published | archived
  build_mode TEXT NOT NULL DEFAULT 'manual',    -- manual | auto
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  created_by INTEGER REFERENCES admins(id)
);

CREATE TABLE IF NOT EXISTS sections (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  test_id TEXT NOT NULL REFERENCES tests(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  skill TEXT NOT NULL,                          -- listening | reading | writing | speaking
  type TEXT NOT NULL,
  minutes INTEGER NOT NULL DEFAULT 0,
  sort INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS questions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  family_id TEXT NOT NULL REFERENCES families(id),
  skill TEXT NOT NULL,
  level TEXT NOT NULL,
  type TEXT NOT NULL,                           -- mcq | gap | essay | speaking
  prompt TEXT NOT NULL,
  options_json TEXT NOT NULL DEFAULT '[]',
  answer TEXT NOT NULL DEFAULT '',
  explanation TEXT NOT NULL DEFAULT '',
  tags_json TEXT NOT NULL DEFAULT '[]',
  status TEXT NOT NULL DEFAULT 'active',        -- active | retired
  created_at TEXT NOT NULL,
  created_by INTEGER REFERENCES admins(id)
);

CREATE TABLE IF NOT EXISTS section_items (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  section_id INTEGER NOT NULL REFERENCES sections(id) ON DELETE CASCADE,
  question_id INTEGER NOT NULL REFERENCES questions(id) ON DELETE CASCADE,
  sort INTEGER NOT NULL DEFAULT 0,
  UNIQUE (section_id, question_id)
);

CREATE TABLE IF NOT EXISTS batches (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  unlock_type TEXT NOT NULL,
  unlock_ref TEXT NOT NULL,
  qty INTEGER NOT NULL,
  expires_at TEXT,
  created_at TEXT NOT NULL,
  created_by INTEGER REFERENCES admins(id)
);

CREATE TABLE IF NOT EXISTS codes (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  code TEXT NOT NULL UNIQUE,
  batch_id INTEGER REFERENCES batches(id) ON DELETE SET NULL,
  unlock_type TEXT NOT NULL,                    -- test | family | bundle
  unlock_ref TEXT NOT NULL,                     -- id bài / id kỳ thi / danh sách id ngăn bởi dấu phẩy
  status TEXT NOT NULL DEFAULT 'unused',        -- unused | redeemed | revoked
  expires_at TEXT,
  user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
  redeemed_at TEXT,
  note TEXT,
  created_at TEXT NOT NULL,
  created_by INTEGER REFERENCES admins(id)
);

CREATE TABLE IF NOT EXISTS packages (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  price INTEGER NOT NULL,
  family_id TEXT,
  description TEXT NOT NULL DEFAULT '',
  perks_json TEXT NOT NULL DEFAULT '[]',
  featured INTEGER NOT NULL DEFAULT 0,
  active INTEGER NOT NULL DEFAULT 1,
  sort INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS orders (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
  package_id TEXT,
  name TEXT NOT NULL,
  amount INTEGER NOT NULL DEFAULT 0,
  code_id INTEGER REFERENCES codes(id) ON DELETE SET NULL,
  status TEXT NOT NULL DEFAULT 'paid',          -- paid | pending | refunded
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS audit (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  admin_id INTEGER REFERENCES admins(id) ON DELETE SET NULL,
  admin_name TEXT,
  action TEXT NOT NULL,
  target TEXT,
  meta_json TEXT NOT NULL DEFAULT '{}',
  ip TEXT,
  at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_q_filter  ON questions (family_id, skill, level, status);
CREATE INDEX IF NOT EXISTS idx_codes_st  ON codes (status, expires_at);
CREATE INDEX IF NOT EXISTS idx_sec_test  ON sections (test_id, sort);
CREATE INDEX IF NOT EXISTS idx_audit_at  ON audit (at DESC);
`);

/* ============================== TIỆN ÍCH ============================== */
const nowISO = () => new Date().toISOString();
const jparse = (s, fb) => { try { return JSON.parse(s); } catch (e) { return fb; } };

const q = {
  all(sql, ...p) { return db.prepare(sql).all(...p); },
  get(sql, ...p) { return db.prepare(sql).get(...p); },
  run(sql, ...p) { return db.prepare(sql).run(...p); },
  val(sql, ...p) { const r = db.prepare(sql).get(...p); return r ? Object.values(r)[0] : null; }
};

/** Chạy nhiều lệnh trong một transaction (node:sqlite chưa có API transaction sẵn) */
function tx(fn) {
  db.exec('BEGIN');
  try { const out = fn(); db.exec('COMMIT'); return out; }
  catch (e) { db.exec('ROLLBACK'); throw e; }
}

/** Sinh mã code dạng XXXX-XXXX-XXXX, bỏ ký tự dễ nhầm (I, O, 0, 1) */
const CODE_ALPHA = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
function makeCode() {
  const chunk = () => Array.from(crypto.randomBytes(4))
    .map(b => CODE_ALPHA[b % CODE_ALPHA.length]).join('');
  return chunk() + '-' + chunk() + '-' + chunk();
}

function audit(req, action, target, meta) {
  const a = req && req.admin;
  q.run(
    'INSERT INTO audit (admin_id, admin_name, action, target, meta_json, ip, at) VALUES (?,?,?,?,?,?,?)',
    a ? a.id : null, a ? a.username : 'system', action, target || null,
    JSON.stringify(meta || {}), (req && req.ip) || null, nowISO()
  );
}

/* ============================== SEED ============================== */
const FAMILIES = [
  ['vept',  'VEPT',  'Chứng chỉ VEPT 4 kỹ năng',  '4 kỹ năng theo chuẩn CEFR', ['listening','reading','writing','speaking'], 1],
  ['vpet',  'VPET',  'Chứng chỉ VPET 4 kỹ năng',  '4 kỹ năng theo chuẩn CEFR', ['listening','reading','writing','speaking'], 2],
  ['ote',   'OTE',   'Oxford Test of English',    'Adaptive 4 module, CEFR A2-B2', ['listening','reading','writing','speaking'], 3],
  ['toeic', 'TOEIC', 'Test of English for International Communication', 'L&R / S&W, thang điểm 990', ['listening','reading'], 4],
  ['ielts', 'IELTS', 'International English Language Testing System',   '4 kỹ năng, band 0-9', ['listening','reading','writing','speaking'], 5],
  ['pte',   'PTE',   'Pearson Test of English',   'Thi trên máy, chấm AI, thang 10-90', ['listening','reading','writing','speaking'], 6]
];

const SEED_TESTS = [
  { id:'vpet-b1-01', family:'vpet', title:'VPET 4 kỹ năng B1', level:'B1', dur:112, status:'published',
    scoring:'Theo thang CEFR A1-C2, quy đổi từng kỹ năng',
    guide:['Chuẩn bị tai nghe và micro trước khi vào phần Nghe / Nói.',
           'Mỗi phần có đồng hồ riêng, hết giờ hệ thống tự chuyển phần.',
           'Bài Viết và Nói được chấm tự động, trả kết quả kèm nhận xét.'],
    sections:[['Listening','listening','Trắc nghiệm',25],['Reading','reading','Trắc nghiệm',35],
              ['Writing','writing','Tự luận',40],['Speaking','speaking','Ghi âm',12]] },
  { id:'ielts-ac-01', family:'ielts', title:'IELTS Academic Mock 01', level:'B2', dur:164, status:'published',
    scoring:'Band 0-9, làm tròn 0.5',
    guide:['Phần Nghe chỉ phát 1 lần, hãy đọc trước câu hỏi.',
           'Writing Task 2 chiếm 2/3 điểm phần Viết.',
           'Speaking mô phỏng phỏng vấn 3 part, trả lời theo đồng hồ.'],
    sections:[['Listening','listening','Trắc nghiệm + điền từ',30],['Reading','reading','Đọc hiểu học thuật',60],
              ['Writing','writing','Task 1 + Task 2',60],['Speaking','speaking','3 part, ghi âm',14]] },
  { id:'ielts-ac-02', family:'ielts', title:'IELTS Academic Mock 02', level:'C1', dur:164, status:'published',
    scoring:'Band 0-9, làm tròn 0.5',
    guide:['Đề nâng cao: từ vựng học thuật dày hơn Mock 01.',
           'Phân bổ 20 phút cho mỗi passage phần Đọc.',
           'Speaking part 3 hỏi sâu quan điểm, luyện trả lời có cấu trúc.'],
    sections:[['Listening','listening','Trắc nghiệm + điền từ',30],['Reading','reading','Đọc hiểu học thuật',60],
              ['Writing','writing','Task 1 + Task 2',60],['Speaking','speaking','3 part, ghi âm',14]] },
  { id:'toeic-lr-01', family:'toeic', title:'TOEIC Listening & Reading 01', level:'B1', dur:120, status:'published',
    scoring:'Thang 10-990 (mỗi phần 5-495)',
    guide:['Không có điểm trừ, đừng bỏ trống câu nào.',
           'Part 7 chiếm nhiều thời gian nhất, làm Part 5-6 thật nhanh.',
           'Đồng hồ chung cho cả phần Đọc, tự phân bổ thời gian.'],
    sections:[['Listening','listening','Part 1-4, trắc nghiệm',45],['Reading','reading','Part 5-7, trắc nghiệm',75]] },
  { id:'toeic-lr-02', family:'toeic', title:'TOEIC Listening & Reading 02', level:'B2', dur:120, status:'published',
    scoring:'Thang 10-990 (mỗi phần 5-495)',
    guide:['Đề mô phỏng độ khó kỳ thi thật từ 2024 trở lại đây.',
           'Luyện kỹ dạng đoạn đôi / đoạn ba ở Part 7.',
           'Nghe bằng tai nghe để đúng điều kiện phòng thi.'],
    sections:[['Listening','listening','Part 1-4, trắc nghiệm',45],['Reading','reading','Part 5-7, trắc nghiệm',75]] },
  { id:'pte-ac-01', family:'pte', title:'PTE Academic Mock 01', level:'B2', dur:127, status:'draft',
    scoring:'Thang 10-90, chấm máy toàn phần',
    guide:['Nói to, rõ, đều nhịp: máy chấm ưu tiên fluency.',
           'Read Aloud và Repeat Sentence chiếm trọng số lớn.',
           'Không quay lại câu đã nộp, cân nhắc trước khi bấm Next.'],
    sections:[['Speaking & Writing','speaking','7 dạng câu, ghi âm + gõ',62],['Reading','reading','5 dạng câu',30],
              ['Listening','listening','8 dạng câu',35]] }
];

const PACKAGES = [
  ['pk-single','1 bài thi thử',49000,null,'Mở khoá 1 bài thi thử bất kỳ đang có trong thư viện.',
   ['Chọn bài khi kích hoạt code','Hạn dùng 6 tháng','Làm lại không giới hạn trong hạn'],0,1],
  ['pk-vpet','Gói VPET',129000,'vpet','Mọi bài VPET hiện có + bài mới khi admin phát hành.',
   ['Toàn bộ bài VPET','Cập nhật đề mới miễn phí','Hạn dùng 12 tháng'],0,2],
  ['pk-toeic','Gói TOEIC',179000,'toeic','Trọn bộ TOEIC Listening & Reading, kèm đề mới.',
   ['Toàn bộ bài TOEIC','Cập nhật đề mới miễn phí','Hạn dùng 12 tháng'],0,3],
  ['pk-ielts','Gói IELTS',199000,'ielts','Trọn bộ IELTS Academic, kèm đề mới khi phát hành.',
   ['Toàn bộ bài IELTS','Cập nhật đề mới miễn phí','Hạn dùng 12 tháng'],0,4],
  ['pk-combo','Combo 2 kỳ thi',329000,null,'Chọn 2 kỳ thi bất kỳ, mở khoá toàn bộ bài của cả hai.',
   ['2 kỳ thi tuỳ chọn','Tiết kiệm 49.000đ so với mua lẻ gói','Hạn dùng 12 tháng'],1,5]
];

/* Ngân hàng câu hỏi mẫu: đủ để trình sinh đề tự động chạy được ngay.
   Đây là nội dung mẫu do nền tảng tạo, admin sẽ thay bằng đề thật. */
function seedQuestions() {
  const LEVELS = ['A2', 'B1', 'B2', 'C1'];
  const MCQ = {
    listening: [
      ['Nghe đoạn hội thoại. Người nói đang ở đâu?', ['Ở sân bay','Ở nhà ga','Ở bến xe buýt','Ở bến phà'], 'Ở sân bay'],
      ['Nghe thông báo. Chuyến bay bị hoãn bao lâu?', ['30 phút','45 phút','1 giờ','2 giờ'], '45 phút'],
      ['Nghe đoạn ghi âm. Người nói đề nghị điều gì?', ['Đổi lịch họp','Huỷ hợp đồng','Tăng ngân sách','Tuyển thêm người'], 'Đổi lịch họp'],
      ['Nghe bài giảng ngắn. Chủ đề chính là gì?', ['Biến đổi khí hậu','Lịch sử kiến trúc','Kinh tế vĩ mô','Tâm lý học trẻ em'], 'Biến đổi khí hậu'],
      ['Nghe đoạn hội thoại. Hai người sẽ gặp nhau lúc mấy giờ?', ['9 giờ','10 giờ 30','11 giờ','1 giờ chiều'], '10 giờ 30']
    ],
    reading: [
      ['Đọc đoạn văn. Từ "significant" trong dòng 3 gần nghĩa nhất với từ nào?', ['important','unclear','frequent','temporary'], 'important'],
      ['Theo đoạn văn, nguyên nhân chính của hiện tượng là gì?', ['Đô thị hoá nhanh','Thời tiết cực đoan','Chính sách thuế','Thiếu lao động'], 'Đô thị hoá nhanh'],
      ['Chọn từ đúng: The report ____ that sales had risen sharply.', ['indicated','indicating','indicate','indication'], 'indicated'],
      ['Chọn giới từ đúng: She has been working here ____ 2019.', ['since','for','from','during'], 'since'],
      ['Đoạn văn chủ yếu nhằm mục đích gì?', ['So sánh hai phương pháp','Kể một câu chuyện','Quảng cáo sản phẩm','Hướng dẫn lắp đặt'], 'So sánh hai phương pháp'],
      ['Chọn dạng đúng: If he ____ earlier, he would have caught the train.', ['had left','has left','leaves','would leave'], 'had left']
    ]
  };
  const GAP = {
    listening: ['Nghe và điền từ còn thiếu: The meeting will start at ______ o\'clock.',
                'Nghe và điền số: The total cost is ______ dollars.',
                'Nghe và điền tên phòng: Please go to room ______.'],
    reading:   ['Điền từ vào chỗ trống: Applicants must submit their forms ______ Friday.',
                'Điền từ vào chỗ trống: The company plans to ______ its workforce next year.',
                'Điền từ vào chỗ trống: This policy applies ______ all employees.']
  };
  const ESSAY = [
    'Some people believe university education should be free for everyone. To what extent do you agree or disagree?',
    'Viết thư cho quản lý toà nhà phản ánh về tiếng ồn và đề xuất hướng xử lý (khoảng 150 từ).',
    'Biểu đồ cho thấy lượng khách du lịch tới ba thành phố trong 10 năm. Tóm tắt các đặc điểm chính.',
    'Many companies now allow staff to work from home. Discuss the advantages and disadvantages.'
  ];
  const SPEAK = [
    'Hãy giới thiệu về quê hương bạn và điều bạn thích nhất ở đó (1 phút).',
    'Mô tả một cuốn sách đã ảnh hưởng tới bạn. Nói trong 2 phút.',
    'Bạn nghĩ mạng xã hội tác động thế nào tới cách sinh viên học tập?',
    'Đọc to đoạn văn sau, chú ý trọng âm và ngữ điệu.'
  ];

  const ins = db.prepare(`INSERT INTO questions
    (family_id, skill, level, type, prompt, options_json, answer, explanation, tags_json, status, created_at)
    VALUES (?,?,?,?,?,?,?,?,?,'active',?)`);
  const at = nowISO();
  let n = 0;

  for (const [famId, , , , skills] of FAMILIES) {
    for (const skill of skills) {
      LEVELS.forEach((level, li) => {
        if (skill === 'listening' || skill === 'reading') {
          MCQ[skill].forEach((item, i) => {
            ins.run(famId, skill, level, 'mcq',
              `[${famId.toUpperCase()} ${level}] ${item[0]}`,
              JSON.stringify(item[1]), item[2],
              'Câu mẫu do nền tảng tạo sẵn để chạy thử trình sinh đề.',
              JSON.stringify(['mẫu', skill]), at);
            n++;
          });
          GAP[skill].forEach((p, i) => {
            if (i > li) return;                       // level cao hơn thì có nhiều câu điền hơn
            ins.run(famId, skill, level, 'gap',
              `[${famId.toUpperCase()} ${level}] ${p}`, '[]', '',
              'Câu mẫu do nền tảng tạo sẵn.', JSON.stringify(['mẫu', skill]), at);
            n++;
          });
        }
        if (skill === 'writing') {
          ESSAY.forEach(p => {
            ins.run(famId, skill, level, 'essay', `[${famId.toUpperCase()} ${level}] ${p}`, '[]', '',
              'Đề viết mẫu, chấm theo tiêu chí của kỳ thi.', JSON.stringify(['mẫu','writing']), at);
            n++;
          });
        }
        if (skill === 'speaking') {
          SPEAK.forEach(p => {
            ins.run(famId, skill, level, 'speaking', `[${famId.toUpperCase()} ${level}] ${p}`, '[]', '',
              'Đề nói mẫu, thí sinh ghi âm câu trả lời.', JSON.stringify(['mẫu','speaking']), at);
            n++;
          });
        }
      });
    }
  }
  return n;
}

/** Seed lần đầu (idempotent: chỉ chạy khi bảng rỗng) */
function seed() {
  const at = nowISO();

  if (!q.val('SELECT COUNT(*) c FROM families')) {
    const ins = db.prepare('INSERT INTO families (id,name,sub,format,skills_json,sort) VALUES (?,?,?,?,?,?)');
    for (const [id, name, sub, format, skills, sort] of FAMILIES) {
      ins.run(id, name, sub, format, JSON.stringify(skills), sort);
    }
  }

  if (!q.val('SELECT COUNT(*) c FROM packages')) {
    const ins = db.prepare('INSERT INTO packages (id,name,price,family_id,description,perks_json,featured,active,sort) VALUES (?,?,?,?,?,?,?,1,?)');
    for (const [id, name, price, fam, desc, perks, feat, sort] of PACKAGES) {
      ins.run(id, name, price, fam, desc, JSON.stringify(perks), feat, sort);
    }
  }

  if (!q.val('SELECT COUNT(*) c FROM questions')) seedQuestions();

  if (!q.val('SELECT COUNT(*) c FROM tests')) {
    const insT = db.prepare(`INSERT INTO tests
      (id,family_id,title,level,duration_min,scoring,guide_json,status,build_mode,created_at,updated_at)
      VALUES (?,?,?,?,?,?,?,?,'manual',?,?)`);
    const insS = db.prepare('INSERT INTO sections (test_id,name,skill,type,minutes,sort) VALUES (?,?,?,?,?,?)');
    for (const t of SEED_TESTS) {
      insT.run(t.id, t.family, t.title, t.level, t.dur, t.scoring, JSON.stringify(t.guide), t.status, at, at);
      t.sections.forEach(([name, skill, type, minutes], i) => {
        insS.run(t.id, name, skill, type, minutes, i);
        // Gắn sẵn câu hỏi từ bank cho mỗi phần để đề có nội dung ngay
        const secId = q.val('SELECT id FROM sections WHERE test_id=? ORDER BY id DESC LIMIT 1', t.id);
        const want = skill === 'writing' ? 2 : skill === 'speaking' ? 3 : 20;
        const pool = q.all(
          `SELECT id FROM questions WHERE family_id=? AND skill=? AND status='active' ORDER BY level=? DESC, id LIMIT ?`,
          t.family, skill, t.level, want);
        const insI = db.prepare('INSERT OR IGNORE INTO section_items (section_id,question_id,sort) VALUES (?,?,?)');
        pool.forEach((r, j) => insI.run(secId, r.id, j));
      });
    }
  }

  if (!q.val('SELECT COUNT(*) c FROM users')) {
    // Tài khoản học viên demo (khớp với tài khoản seed phía frontend)
    const ins = db.prepare(`INSERT INTO users (username,email,name,verified,status,interests_json,created_at)
                            VALUES (?,?,?,?,?,?,?)`);
    const daysAgo = n => new Date(Date.now() - n * 86400000).toISOString();
    ins.run('student', 'student@vpetprep.vn', 'Học viên Demo', 1, 'active', JSON.stringify(['vpet','ielts']), daysAgo(21));
    const DEMO = [
      ['thuhang.nt','thuhang.nt@ftu.edu.vn','Nguyễn Thu Hằng',1,['ielts'],14],
      ['khanhqd','khanh.qd@hcmut.edu.vn','Quốc Khánh',1,['toeic','ielts'],11],
      ['mailinh.hu','mailinh@hutech.edu.vn','Mai Linh',0,['vpet'],8],
      ['baolong.tb','long.tb@sinhvien.edu.vn','Trần Bảo Long',1,['pte'],6],
      ['ngocanh.study','ngocanh.study@gmail.com','Ngọc Ánh',1,['ielts','toeic'],4],
      ['huyphan','huy.phan@uel.edu.vn','Phan Gia Huy',0,['ote'],2],
      ['thaovy.dn','thaovy@dut.udn.vn','Đỗ Thảo Vy',1,['vept'],1]
    ];
    for (const [u, e, n2, v, itr, d] of DEMO) {
      ins.run(u, e, n2, v, 'active', JSON.stringify(itr), daysAgo(d));
    }
  }

  if (!q.val('SELECT COUNT(*) c FROM codes')) {
    const insB = db.prepare('INSERT INTO batches (name,unlock_type,unlock_ref,qty,expires_at,created_at) VALUES (?,?,?,?,?,?)');
    const insC = db.prepare(`INSERT INTO codes (code,batch_id,unlock_type,unlock_ref,status,expires_at,user_id,redeemed_at,note,created_at)
                             VALUES (?,?,?,?,?,?,?,?,?,?)`);
    const daysFromNow = n => new Date(Date.now() + n * 86400000).toISOString().slice(0, 10);
    const daysAgo = n => new Date(Date.now() - n * 86400000).toISOString();

    // Lô demo cho lớp học
    insB.run('Lớp IELTS K62 - đợt 1', 'family', 'ielts', 8, daysFromNow(120), nowISO());
    const b1 = q.val('SELECT id FROM batches ORDER BY id DESC LIMIT 1');
    for (let i = 0; i < 8; i++) insC.run(makeCode(), b1, 'family', 'ielts', 'unused', daysFromNow(120), null, null, null, nowISO());

    // Code cố định để khớp mã demo phía frontend
    const studentId = q.val("SELECT id FROM users WHERE username='student'");
    insC.run('VPET-B1MK-24TR', null, 'test', 'vpet-b1-01', 'redeemed', daysFromNow(144), studentId, daysAgo(8), 'Cấp cho tài khoản demo', daysAgo(10));
    insC.run('IELT-AC12-96HD', null, 'family', 'ielts', 'unused', daysFromNow(67), null, null, null, daysAgo(9));
    insC.run('TOEC-LR20-26CB', null, 'family', 'toeic', 'unused', daysFromNow(200), null, null, null, daysAgo(7));
    insC.run('PREP-HHAN-2025', null, 'family', 'pte', 'unused', '2025-12-31', null, null, 'Mã minh hoạ đã hết hạn', daysAgo(300));
    insC.run('PREP-DUNG-ROI1', null, 'test', 'ielts-ac-01', 'redeemed', daysFromNow(140),
      q.val("SELECT id FROM users WHERE username='thuhang.nt'"), daysAgo(12), null, daysAgo(13));

    // Một ít code đã dùng để báo cáo có dữ liệu
    const users = q.all("SELECT id FROM users WHERE username IN ('khanhqd','ngocanh.study','baolong.tb')");
    const refs = [['family','toeic'], ['family','ielts'], ['test','pte-ac-01']];
    users.forEach((u, i) => {
      insC.run(makeCode(), null, refs[i][0], refs[i][1], 'redeemed', daysFromNow(180), u.id, daysAgo(i + 2), null, daysAgo(i + 3));
    });
  }

  if (!q.val('SELECT COUNT(*) c FROM orders')) {
    const ins = db.prepare('INSERT INTO orders (user_id,package_id,name,amount,status,created_at) VALUES (?,?,?,?,?,?)');
    const daysAgo = n => new Date(Date.now() - n * 86400000).toISOString();
    const rows = [
      ['ngocanh.study','pk-ielts','Gói IELTS',199000,2],
      ['khanhqd','pk-toeic','Gói TOEIC',179000,3],
      ['baolong.tb','pk-single','1 bài thi thử',49000,5],
      ['thuhang.nt','pk-ielts','Gói IELTS',199000,12],
      ['mailinh.hu','pk-vpet','Gói VPET',129000,7],
      ['student','pk-vpet','Gói VPET',129000,10]
    ];
    for (const [u, pk, name, amt, d] of rows) {
      ins.run(q.val('SELECT id FROM users WHERE username=?', u), pk, name, amt, 'paid', daysAgo(d));
    }
  }

  if (!q.val("SELECT COUNT(*) c FROM settings")) {
    const ins = db.prepare('INSERT INTO settings (key,value) VALUES (?,?)');
    ins.run('brand.name', 'VPET Prep');
    ins.run('brand.tenant', 'default');
    ins.run('platform.notice', '');
  }

  seedIrregularVerbs();
}

/* Bảng động từ bất quy tắc — nạp lại khi số dòng trong tệp nguồn nhiều hơn
   trong CSDL, để bổ sung động từ mới mà không phải xoá cả CSDL. */
function seedIrregularVerbs() {
  const rows = require('./data/irregular-verbs').rows();
  if (q.val('SELECT COUNT(*) c FROM irregular_verbs') >= rows.length) return;
  const ins = db.prepare(`INSERT INTO irregular_verbs
    (v1,v2,v3,ving,ipa_uk,ipa_us,vi,grp,level,note,ex_en,ex_vi,sort)
    VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)
    ON CONFLICT(v1) DO UPDATE SET
      v2=excluded.v2, v3=excluded.v3, ving=excluded.ving,
      ipa_uk=excluded.ipa_uk, ipa_us=excluded.ipa_us, vi=excluded.vi,
      grp=excluded.grp, level=excluded.level, note=excluded.note,
      ex_en=excluded.ex_en, ex_vi=excluded.ex_vi, sort=excluded.sort`);
  rows.forEach((r, i) => {
    ins.run(r.v1, r.v2, r.v3, r.ving, r.ipa_uk, r.ipa_us, r.vi,
      r.grp, r.level, r.note || null, r.ex_en || null, r.ex_vi || null, i);
  });
}

seed();

module.exports = { db, q, tx, nowISO, jparse, makeCode, audit, DB_FILE };
