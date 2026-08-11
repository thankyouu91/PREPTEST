/**
 * Xuất nội dung dự án ra Supabase (Postgres).
 *
 * Vì sao có tệp này: CSDL chạy của ứng dụng là SQLite nhúng, còn Supabase là
 * Postgres. Đây KHÔNG phải bước chuyển ứng dụng sang Postgres — ứng dụng vẫn
 * chạy SQLite như cũ. Tệp này đẩy phần NỘI DUNG lên Supabase để nơi khác đọc
 * được:
 *
 *   Khu tự học (nguồn: server/data/*.js — tệp nguồn trong git)
 *     irregular_verbs, linking_words, grammar_points, grammar_examples
 *   Danh mục và ngân hàng đề (nguồn: data/prep.sqlite — CSDL đang chạy)
 *     exam_families, exam_packages, exam_formats,
 *     exam_tests, exam_sections, exam_questions, exam_section_items
 *
 * KHÔNG xuất: tài khoản, phiên đăng nhập, token, code, đơn hàng, nhật ký —
 * dữ liệu người dùng và bí mật ở lại máy chủ.
 *
 * Chạy:
 *   node scripts/xuat-supabase.mjs --ddl            → in phần tạo bảng
 *   node scripts/xuat-supabase.mjs --data           → in toàn bộ INSERT
 *   node scripts/xuat-supabase.mjs --count          → đếm số câu lệnh
 *   node scripts/xuat-supabase.mjs --bang           → liệt kê tên bảng
 *   node scripts/xuat-supabase.mjs --json <bảng>    → JSON để nạp qua PostgREST
 *
 * Nạp lại được nhiều lần: mọi INSERT đều ON CONFLICT DO UPDATE nên chạy lại
 * chỉ cập nhật chứ không nhân đôi. Câu ví dụ nối với điểm ngữ pháp qua slug
 * chứ không qua id.
 *
 * Không đụng tới khoá bí mật: việc kết nối do công cụ bên ngoài lo, tệp này
 * chỉ sinh ra SQL và JSON thuần.
 */
import { createRequire } from 'node:module';
import { existsSync } from 'node:fs';
const require = createRequire(import.meta.url);

const NGU_PHAP = [
  'grammar-tenses', 'grammar-tenses-sequence',
  'grammar-nouns', 'grammar-nouns-b1c2',
  'grammar-modals', 'grammar-modals-b2c2',
  'grammar-conditionals', 'grammar-conditionals-c1c2',
  'grammar-passive-reported', 'grammar-passive-reported-c1c2',
  'grammar-clauses', 'grammar-clauses-b2', 'grammar-clauses-c1c2',
  'grammar-emphasis', 'grammar-emphasis-c2',
  'grammar-register', 'grammar-register-c1', 'grammar-register-c2'
];

/* ------------------------------------------------------------------ *
 * Nguồn 1: tệp nguồn khu tự học
 * ------------------------------------------------------------------ */

let _nguPhap = null;
const nguPhap = () => (_nguPhap ||= NGU_PHAP.map(f => require('../server/data/' + f)));

/* Điểm ngữ pháp đã đánh lại sort theo từng nhóm — y hệt seedGrammar bên db.js */
function diemNguPhap() {
  const diem = nguPhap().flatMap(x => x.points());
  const dem = {};
  diem.forEach(p => { p.sort = (dem[p.grp] = (dem[p.grp] || 0) + 1) - 1; });
  return diem;
}

const rong = (v) => (v === undefined || v === '') ? null : v;

/* ------------------------------------------------------------------ *
 * Nguồn 2: CSDL đang chạy (danh mục + ngân hàng đề, admin sửa được)
 * ------------------------------------------------------------------ */

let _db = null;
function db() {
  if (_db) return _db;
  if (!existsSync('data/prep.sqlite')) {
    console.error('Chưa có data/prep.sqlite. Chạy `npm start` một lần để tạo và seed CSDL.');
    process.exit(1);
  }
  const { DatabaseSync } = require('node:sqlite');
  return (_db = new DatabaseSync('data/prep.sqlite', { readOnly: true }));
}

const lay = (sql) => db().prepare(sql).all();
const doc = (v) => JSON.parse(v || '[]');   /* cột *_json trong SQLite */
const bool = (v) => !!v;                    /* SQLite lưu 0/1 */

/* ------------------------------------------------------------------ *
 * Bảng: khoá chính + cách dựng từng dòng
 * ------------------------------------------------------------------ */

const BANG = {
  irregular_verbs: {
    pk: ['v1'],
    rows: () => require('../server/data/irregular-verbs').rows().map((v, i) => ({
      v1: v.v1, v2: v.v2, v3: v.v3, ving: v.ving,
      ipa_uk: rong(v.ipa_uk), ipa_us: rong(v.ipa_us),
      vi: v.vi, grp: v.grp, level: v.level,
      note: rong(v.note), ex_en: rong(v.ex_en), ex_vi: rong(v.ex_vi), sort: i
    }))
  },

  linking_words: {
    pk: ['word', 'fn'],
    rows: () => require('../server/data/linking-words').rows().map((w, i) => ({
      word: w.word, fn: w.fn, register: w.register, pos: w.pos, punct: w.punct,
      vi: w.vi, level: w.level, ex_en: w.ex_en, ex_vi: w.ex_vi,
      warn: rong(w.warn), sort: i
    }))
  },

  grammar_points: {
    pk: ['slug'],
    rows: () => diemNguPhap().map(p => ({
      slug: p.slug, name_en: p.name_en, name_vi: p.name_vi,
      grp: p.grp, level: p.level, summary: p.summary,
      formula: JSON.parse(p.formula_json), signals: JSON.parse(p.signals_json),
      use_when: JSON.parse(p.use_when_json), use_not: JSON.parse(p.use_not_json),
      confuse: JSON.parse(p.confuse_json), errors: JSON.parse(p.errors_json),
      sort: p.sort
    }))
  },

  grammar_examples: {
    pk: ['point_slug', 'kind', 'sort'],
    rows: () => nguPhap().flatMap(x => x.examples()).map(e => ({
      point_slug: e.slug, kind: e.kind, sort: e.sort, en: e.en, vi: e.vi,
      ok: (e.ok === null || e.ok === undefined) ? null : !!e.ok,
      answer: rong(e.answer), note: rong(e.note)
    }))
  },

  exam_families: {
    pk: ['id'],
    rows: () => lay('select * from families order by sort').map(f => ({
      id: f.id, name: f.name, sub: f.sub, format: f.format,
      skills: doc(f.skills_json), sort: f.sort
    }))
  },

  exam_packages: {
    pk: ['id'],
    rows: () => lay('select * from packages order by sort').map(p => ({
      id: p.id, name: p.name, price: p.price, family_id: rong(p.family_id),
      description: p.description, perks: doc(p.perks_json),
      featured: bool(p.featured), active: bool(p.active), sort: p.sort
    }))
  },

  exam_formats: {
    pk: ['id'],
    rows: () => {
      const F = require('../server/data/exam-formats');
      return F.FORMATS.map((f, i) => ({
        id: f.id, family_id: f.familyId, name: f.name, kind: f.kind,
        levels: f.levels, scoring: f.scoring, guide: f.guide,
        sections: f.sections, notes: f.notes,
        total_items: F.totalItems(f), total_minutes: F.totalMinutes(f), sort: i
      }));
    }
  },

  exam_tests: {
    pk: ['id'],
    rows: () => lay('select * from tests order by id').map(t => ({
      id: t.id, family_id: t.family_id, title: t.title, level: t.level,
      duration_min: t.duration_min, scoring: t.scoring, guide: doc(t.guide_json),
      status: t.status, build_mode: t.build_mode,
      created_at: t.created_at, updated_at: t.updated_at
    }))
  },

  exam_sections: {
    pk: ['id'],
    rows: () => lay('select * from sections order by id').map(s => ({
      id: s.id, test_id: s.test_id, name: s.name, skill: s.skill,
      type: s.type, minutes: s.minutes, sort: s.sort
    }))
  },

  exam_questions: {
    pk: ['id'],
    rows: () => lay('select * from questions order by id').map(q => ({
      id: q.id, family_id: q.family_id, skill: q.skill, level: q.level,
      type: q.type, prompt: q.prompt, options: doc(q.options_json),
      answer: q.answer, explanation: q.explanation, tags: doc(q.tags_json),
      status: q.status, created_at: q.created_at
    }))
  },

  exam_section_items: {
    pk: ['section_id', 'question_id'],
    rows: () => lay('select * from section_items order by section_id, sort').map(i => ({
      section_id: i.section_id, question_id: i.question_id, sort: i.sort
    }))
  }
};

/* Thứ tự nạp: bảng cha trước bảng con, vì có khoá ngoại */
const THU_TU = [
  'irregular_verbs', 'linking_words', 'grammar_points', 'grammar_examples',
  'exam_families', 'exam_packages', 'exam_formats',
  'exam_tests', 'exam_sections', 'exam_questions', 'exam_section_items'
];

/* ------------------------------------------------------------------ *
 * Sinh SQL từ chính các dòng JSON ở trên — một nguồn, hai đầu ra
 * ------------------------------------------------------------------ */

function giaTri(v) {
  if (v === null || v === undefined) return 'NULL';
  if (typeof v === 'number') return String(v);
  if (typeof v === 'boolean') return v ? 'true' : 'false';
  if (typeof v === 'object') return nhay(JSON.stringify(v)) + '::jsonb';
  return nhay(String(v));
}
const nhay = (s) => "'" + s.replace(/'/g, "''") + "'";

function cauLenh(ten) {
  const { pk, rows } = BANG[ten];
  return rows().map(r => {
    const cot = Object.keys(r);
    const dat = cot.filter(c => !pk.includes(c)).map(c => `${c}=excluded.${c}`);
    const duoi = dat.length ? `do update set ${dat.join(', ')}` : 'do nothing';
    return `insert into public.${ten} (${cot.join(',')}) values (${
      cot.map(c => giaTri(r[c])).join(',')
    }) on conflict (${pk.join(',')}) ${duoi};`;
  });
}

/* ------------------------------------------------------------------ *
 * DDL
 * ------------------------------------------------------------------ */

const DDL = `
-- Nội dung VPET Prep trên Supabase. Sinh bằng scripts/xuat-supabase.mjs.
--
-- Hai mức truy cập:
--   công khai  — nội dung học và danh mục kỳ thi: ai cũng đọc được
--   nội bộ     — câu hỏi và bố cục đề: bật RLS, KHÔNG có policy nào, nên khoá
--                công khai không đọc nổi. Chỉ service role (tức là qua máy
--                chủ) mới thấy. Lý do: cột answer và explanation là đáp án đề
--                thi, lộ ra là hỏng ngân hàng câu hỏi.

create table if not exists public.irregular_verbs (
  v1 text primary key,
  v2 text not null, v3 text not null, ving text not null,
  ipa_uk text, ipa_us text,
  vi text not null, grp text not null, level text not null,
  note text, ex_en text, ex_vi text,
  sort integer not null default 0
);

create table if not exists public.linking_words (
  word text not null, fn text not null,
  register text not null, pos text not null, punct text not null,
  vi text not null, level text not null,
  ex_en text not null, ex_vi text not null, warn text,
  sort integer not null default 0,
  primary key (word, fn)
);

create table if not exists public.grammar_points (
  slug text primary key,
  name_en text not null, name_vi text not null,
  grp text not null, level text not null, summary text not null,
  formula jsonb not null, signals jsonb not null,
  use_when jsonb not null, use_not jsonb not null,
  confuse jsonb not null, errors jsonb not null,
  sort integer not null default 0
);

create table if not exists public.grammar_examples (
  point_slug text not null references public.grammar_points(slug) on delete cascade,
  kind text not null,                        -- example | practice
  sort integer not null,
  en text not null, vi text not null,
  ok boolean,                                -- true đúng, false phản ví dụ, null với câu luyện
  answer text, note text,
  primary key (point_slug, kind, sort)
);

create table if not exists public.exam_families (
  id text primary key,
  name text not null, sub text not null, format text not null,
  skills jsonb not null default '[]'::jsonb,
  sort integer not null default 0
);

create table if not exists public.exam_packages (
  id text primary key,
  name text not null, price integer not null,
  family_id text references public.exam_families(id),
  description text not null default '',
  perks jsonb not null default '[]'::jsonb,
  featured boolean not null default false,
  active boolean not null default true,
  sort integer not null default 0
);

create table if not exists public.exam_formats (
  id text primary key,
  family_id text not null references public.exam_families(id),
  name text not null,
  kind text not null,                        -- full | module | mini
  levels jsonb not null, scoring text not null,
  guide jsonb not null, sections jsonb not null, notes jsonb not null,
  total_items integer not null, total_minutes integer not null,
  sort integer not null default 0
);

create table if not exists public.exam_tests (
  id text primary key,
  family_id text not null references public.exam_families(id),
  title text not null, level text not null,
  duration_min integer not null default 0,
  scoring text not null default '',
  guide jsonb not null default '[]'::jsonb,
  status text not null default 'draft',      -- draft | published | archived
  build_mode text not null default 'manual', -- manual | auto
  created_at timestamptz not null, updated_at timestamptz not null
);

create table if not exists public.exam_sections (
  id integer primary key,
  test_id text not null references public.exam_tests(id) on delete cascade,
  name text not null,
  skill text not null,                       -- listening | reading | writing | speaking
  type text not null,
  minutes integer not null default 0,
  sort integer not null default 0
);

create table if not exists public.exam_questions (
  id integer primary key,
  family_id text not null references public.exam_families(id),
  skill text not null, level text not null,
  type text not null,                        -- mcq | gap | essay | speaking
  prompt text not null,
  options jsonb not null default '[]'::jsonb,
  answer text not null default '',
  explanation text not null default '',
  tags jsonb not null default '[]'::jsonb,
  status text not null default 'active',     -- active | retired
  created_at timestamptz not null
);

create table if not exists public.exam_section_items (
  section_id integer not null references public.exam_sections(id) on delete cascade,
  question_id integer not null references public.exam_questions(id) on delete cascade,
  sort integer not null default 0,
  primary key (section_id, question_id)
);

create index if not exists idx_irr_level on public.irregular_verbs (level);
create index if not exists idx_irr_grp on public.irregular_verbs (grp);
create index if not exists idx_link_fn on public.linking_words (fn);
create index if not exists idx_link_level on public.linking_words (level);
create index if not exists idx_gp_grp on public.grammar_points (grp);
create index if not exists idx_gp_level on public.grammar_points (level);
create index if not exists idx_ge_point on public.grammar_examples (point_slug, kind, sort);
create index if not exists idx_fmt_family on public.exam_formats (family_id);
create index if not exists idx_test_family on public.exam_tests (family_id, status);
create index if not exists idx_sec_test on public.exam_sections (test_id, sort);
create index if not exists idx_q_family on public.exam_questions (family_id, skill, level, status);
create index if not exists idx_si_question on public.exam_section_items (question_id);

alter table public.irregular_verbs    enable row level security;
alter table public.linking_words      enable row level security;
alter table public.grammar_points     enable row level security;
alter table public.grammar_examples   enable row level security;
alter table public.exam_families      enable row level security;
alter table public.exam_packages      enable row level security;
alter table public.exam_formats       enable row level security;
alter table public.exam_tests         enable row level security;
alter table public.exam_sections      enable row level security;
alter table public.exam_questions     enable row level security;
alter table public.exam_section_items enable row level security;

-- Công khai: ai cũng đọc được, không ai ghi được qua khoá công khai.
-- Muốn ghi thì phải dùng service role, tức là qua máy chủ.
drop policy if exists doc_cong_khai on public.irregular_verbs;
drop policy if exists doc_cong_khai on public.linking_words;
drop policy if exists doc_cong_khai on public.grammar_points;
drop policy if exists doc_cong_khai on public.grammar_examples;
drop policy if exists doc_cong_khai on public.exam_families;
drop policy if exists doc_cong_khai on public.exam_packages;
drop policy if exists doc_cong_khai on public.exam_formats;
create policy doc_cong_khai on public.irregular_verbs  for select using (true);
create policy doc_cong_khai on public.linking_words    for select using (true);
create policy doc_cong_khai on public.grammar_points   for select using (true);
create policy doc_cong_khai on public.grammar_examples for select using (true);
create policy doc_cong_khai on public.exam_families    for select using (true);
create policy doc_cong_khai on public.exam_packages    for select using (true);
create policy doc_cong_khai on public.exam_formats     for select using (true);

-- Đề: chỉ đề đã phát hành mới lộ ra ngoài, bản nháp thì không.
drop policy if exists doc_de_da_phat_hanh on public.exam_tests;
drop policy if exists doc_phan_de_da_phat_hanh on public.exam_sections;
create policy doc_de_da_phat_hanh on public.exam_tests
  for select using (status = 'published');
create policy doc_phan_de_da_phat_hanh on public.exam_sections
  for select using (exists (
    select 1 from public.exam_tests t
    where t.id = exam_sections.test_id and t.status = 'published'
  ));

-- exam_questions và exam_section_items cố tình KHÔNG có policy: bật RLS mà
-- không mở policy nào nghĩa là khoá công khai không đọc được dòng nào.
`.trim();

/* ------------------------------------------------------------------ *
 * Dòng lệnh
 * ------------------------------------------------------------------ */

const cd = process.argv[2];
if (cd === '--ddl') {
  console.log(DDL);
} else if (cd === '--data') {
  console.log(THU_TU.flatMap(cauLenh).join('\n'));
} else if (cd === '--count') {
  THU_TU.forEach(t => console.log(String(BANG[t].rows().length).padStart(6), t));
} else if (cd === '--bang') {
  console.log(THU_TU.join('\n'));
} else if (cd === '--json') {
  const ten = process.argv[3];
  if (!BANG[ten]) {
    console.error('Bảng lạ: ' + ten + '. Có: ' + THU_TU.join(', '));
    process.exit(1);
  }
  console.log(JSON.stringify(BANG[ten].rows()));
} else {
  console.error('Dùng: node scripts/xuat-supabase.mjs --ddl | --data | --count | --bang | --json <bảng>');
  process.exit(1);
}
