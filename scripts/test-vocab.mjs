/**
 * Kiểm thử lược đồ từ vựng và trình nhập.
 *
 * Chạy khi server đã bật: node scripts/test-vocab.mjs
 *
 * Hai nửa, vì hai thứ cần chứng minh nằm ở hai chỗ khác nhau:
 *
 * - Nửa HTTP đọc `/api/learn/vocab` trên server đang chạy: dữ liệu có vào được
 *   cơ sở dữ liệu không, tra cứu theo dạng biến đổi có ra không, và ô nguồn có
 *   đi kèm không.
 * - Nửa trình nhập chạy trực tiếp trên một cơ sở dữ liệu tạm (`PREP_DB`), vì
 *   thứ cần kiểm là *chạy lại lần hai thì sao* — id có đổi không, bậc do quản
 *   trị viên sửa tay có bị ghi đè không, mục nguồn đã bỏ có bị xoá không. Không
 *   đụng vào `data/` và không dùng chung tệp với server.
 */
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createRequire } from 'node:module';

const BASE = process.env.BASE || 'http://127.0.0.1:3000';
let pass = 0, fail = 0;
const ok = (c, name, detail) => {
  if (c) { pass++; console.log('✓ ' + name); return; }
  fail++;
  console.log('✗ ' + name + (detail === undefined ? '' : '  → ' + detail));
};
const head = t => console.log('\n\x1b[1m== ' + t + ' ==\x1b[0m');

const get = async path => {
  const r = await fetch(BASE + path);
  return { status: r.status, data: await r.json().catch(() => ({})) };
};

let tmp = '';
try {
  head('Đọc qua API');

  let r = await get('/api/learn/vocab');
  ok(r.status === 200, 'Đọc được danh sách từ vựng', 'status ' + r.status);
  const list = r.data;
  ok(list.total >= 12, 'Ngân hàng từ có dữ liệu', 'total ' + list.total);
  ok(Array.isArray(list.entries) && list.entries.length === list.total,
    'Danh sách trả về đủ số mục đã đếm', list.entries.length + '/' + list.total);
  ok(list.levels.length >= 2 && list.parts.length >= 3,
    'Có thống kê theo bậc và theo từ loại', JSON.stringify({ levels: list.levels.length, parts: list.parts.length }));

  /* Cùng một mặt chữ ở hai từ loại là hai mục riêng — đó là lý do khoá tự nhiên
     là (headword, pos) chứ không phải mình headword. */
  const books = list.entries.filter(e => e.headword === 'book');
  ok(books.length === 2, 'Cùng mặt chữ khác từ loại là hai mục', JSON.stringify(books.map(b => b.pos)));
  ok(books.some(b => b.pos === 'noun' && b.level === 'A1') &&
     books.some(b => b.pos === 'verb' && b.level === 'A2'),
    'Hai mục "book" đúng bậc như docs/LEARNING.md §1.2 nêu',
    JSON.stringify(books.map(b => b.pos + '/' + b.level)));

  r = await get('/api/learn/vocab?level=B2');
  ok(r.status === 200 && r.data.entries.every(e => e.level === 'B2'),
    'Lọc theo bậc chỉ trả về bậc đó', JSON.stringify(r.data.entries.map(e => e.level)));
  ok(r.data.matched === r.data.entries.length && r.data.matched < r.data.total,
    'Số khớp bộ lọc khác tổng số', JSON.stringify({ matched: r.data.matched, total: r.data.total }));

  r = await get('/api/learn/vocab?pos=verb');
  ok(r.status === 200 && r.data.entries.length >= 3 && r.data.entries.every(e => e.pos === 'verb'),
    'Lọc theo từ loại', String(r.data.entries.length));

  /* Người học gặp "children" trong bài thì tra "children", không tra "child".
     Tìm kiếm phải với tới bảng dạng biến đổi, nếu không thì tra là hỏng. */
  r = await get('/api/learn/vocab?q=children');
  ok(r.status === 200 && r.data.entries.some(e => e.headword === 'child'),
    'Tra theo dạng biến đổi vẫn ra từ gốc', JSON.stringify(r.data.entries.map(e => e.headword)));
  r = await get('/api/learn/vocab?q=went');
  ok(r.data.entries.some(e => e.headword === 'go'), 'Tra "went" ra "go"');
  r = await get('/api/learn/vocab?q=bằng chứng');
  ok(r.data.entries.some(e => e.headword === 'evidence'), 'Tra bằng nghĩa tiếng Việt cũng ra');

  head('Một từ, đầy đủ nhánh dưới');

  r = await get('/api/learn/vocab/book');
  ok(r.status === 200 && r.data.entries.length === 2,
    'Tra một mặt chữ trả về cả hai từ loại', String(r.data.entries.length));
  const bookVerb = r.data.entries.find(e => e.pos === 'verb');
  ok(bookVerb && bookVerb.forms.length === 4,
    'Đủ bốn dạng của động từ', JSON.stringify(bookVerb && bookVerb.forms.map(f => f.kind)));
  ok(bookVerb && bookVerb.senses[0].examples.length >= 2,
    'Mỗi nghĩa có ít nhất hai câu ví dụ như §1.2 yêu cầu');
  ok(bookVerb && bookVerb.source && bookVerb.licence,
    'Mục nào cũng mang nguồn và giấy phép');
  ok(bookVerb && bookVerb.senses[0].examples.every(x => x.source && x.licence),
    'Câu ví dụ nào cũng mang nguồn và giấy phép riêng');

  /* Một nghĩa được phép nằm cao hơn bậc của từ gốc — "run" là A1, nhưng nghĩa
     "điều hành" là B1. Nếu nghĩa phải theo bậc của từ gốc thì cột level ở bảng
     nghĩa là thừa, và bảng định mức ở §1.2 đếm sai. */
  r = await get('/api/learn/vocab/run');
  const run = r.data.entries[0];
  ok(run && run.level === 'A1' && run.senses.some(s => s.level === 'B1'),
    'Nghĩa mang bậc riêng, cao hơn bậc của từ gốc',
    JSON.stringify(run && { entry: run.level, senses: run.senses.map(s => s.level) }));

  r = await get('/api/learn/vocab/child');
  const child = r.data.entries[0];
  ok(child.forms.some(f => f.form === 'children' && f.kind === 'plural' && f.note),
    'Dạng bất quy tắc có ghi chú đi kèm');

  r = await get('/api/learn/vocab/khong-co-tu-nay');
  ok(r.status === 404, 'Từ không có trả về 404', 'status ' + r.status);

  head('Trình nhập chạy lại được');

  /* Từ đây trở xuống chạy trên một cơ sở dữ liệu tạm của riêng bài test. */
  tmp = mkdtempSync(join(tmpdir(), 'prep-vocab-'));
  process.env.PREP_DB = join(tmp, 'probe.sqlite');
  const require_ = createRequire(import.meta.url);
  const DB = require_('../server/db.js');
  const { q, db, seedVocab } = DB;

  const snapshot = () => q.all(
    'SELECT id, headword, pos, level, level_source FROM vocab_entries ORDER BY id');
  const count = t => q.val('SELECT COUNT(*) c FROM ' + t);

  const before = snapshot();
  const beforeCounts = ['vocab_senses', 'vocab_examples', 'vocab_forms', 'collocations'].map(count);
  ok(before.length === 12, 'Cơ sở dữ liệu mới nhập đủ 12 mục', String(before.length));

  seedVocab();
  const after = snapshot();
  const afterCounts = ['vocab_senses', 'vocab_examples', 'vocab_forms', 'collocations'].map(count);
  ok(JSON.stringify(before) === JSON.stringify(after),
    'Chạy lần hai không đổi id và không nhân đôi mục');
  ok(JSON.stringify(beforeCounts) === JSON.stringify(afterCounts),
    'Chạy lần hai không nhân đôi nhánh dưới',
    JSON.stringify({ before: beforeCounts, after: afterCounts }));

  /* Id phải sống sót qua lần nhập lại, vì learn_progress sắp trỏ vào id nghĩa.
     Nếu nhập lại mà đánh số lại thì lịch ôn của người học trỏ sang từ khác. */
  const senseIds = q.all('SELECT id, en FROM vocab_senses ORDER BY id');
  seedVocab();
  ok(JSON.stringify(senseIds) === JSON.stringify(q.all('SELECT id, en FROM vocab_senses ORDER BY id')),
    'Id của nghĩa sống sót qua lần nhập lại — chỗ learn_progress sẽ trỏ vào');

  /* §1.4: quản trị viên sửa bậc bằng tay thì luôn thắng ba luật tự động. Một
     lần nhập lại mà lặng lẽ trả bậc về cũ sẽ khiến câu đó thành sai. */
  const target = q.get("SELECT id, level FROM vocab_entries WHERE headword='research'");
  db.prepare("UPDATE vocab_entries SET level='C1', level_source='manual' WHERE id=?").run(target.id);
  const other = q.get("SELECT id FROM vocab_entries WHERE headword='evidence'");
  db.prepare("UPDATE vocab_entries SET level='A1' WHERE id=?").run(other.id);

  seedVocab();
  const pinned = q.get('SELECT level, level_source FROM vocab_entries WHERE id=?', target.id);
  const reset = q.get('SELECT level FROM vocab_entries WHERE id=?', other.id);
  ok(pinned.level === 'C1' && pinned.level_source === 'manual',
    'Bậc do quản trị viên sửa tay không bị lần nhập sau ghi đè', JSON.stringify(pinned));
  ok(reset.level === 'B2',
    'Bậc không phải sửa tay thì trả về đúng nguồn', reset.level);

  /* Mục nguồn đã bỏ phải biến mất, nếu không thì sửa nội dung chỉ thêm được chứ
     không xoá được — đúng lý do seedContent chọn xoá-rồi-nạp cho các bảng khác. */
  const entry = q.get("SELECT id FROM vocab_entries WHERE headword='child'");
  db.prepare("INSERT INTO vocab_senses (entry_id,en,vi,level,sort) VALUES (?,?,?,?,?)")
    .run(entry.id, 'A stray sense that no longer exists in the source.', 'nghĩa thừa', 'A1', 99);
  db.prepare("INSERT INTO vocab_forms (entry_id,form,kind,sort) VALUES (?,?,?,?)")
    .run(entry.id, 'childs', 'plural', 99);
  const strays = q.val("SELECT COUNT(*) c FROM vocab_senses WHERE entry_id=?", entry.id);

  seedVocab();
  ok(q.val('SELECT COUNT(*) c FROM vocab_senses WHERE entry_id=?', entry.id) === strays - 1,
    'Nghĩa không còn trong nguồn bị xoá khi nhập lại');
  ok(!q.val("SELECT COUNT(*) c FROM vocab_forms WHERE entry_id=? AND form='childs'", entry.id),
    'Dạng biến đổi không còn trong nguồn bị xoá khi nhập lại');

  /* Ngược lại: từ do quản trị viên tự thêm không nằm trong nguồn, và lần nhập
     sau không được phép quét nó đi. */
  db.prepare(`INSERT INTO vocab_entries
      (headword,pos,level,level_source,source,licence,sort)
      VALUES ('kerfuffle','noun','C2','manual','Admin','Project content',900)`).run();
  seedVocab();
  ok(q.val("SELECT COUNT(*) c FROM vocab_entries WHERE headword='kerfuffle'") === 1,
    'Từ do quản trị viên thêm tay không bị lần nhập sau xoá');

  /* Xoá một nghĩa phải kéo theo câu ví dụ của nó — nếu không, ví dụ mồ côi ở lại
     và bảng ví dụ phình lên theo mỗi lần sửa nội dung. */
  const sense = q.get("SELECT id FROM vocab_senses WHERE en LIKE 'To manage or be in charge%'");
  const exBefore = q.val('SELECT COUNT(*) c FROM vocab_examples WHERE sense_id=?', sense.id);
  db.prepare('DELETE FROM vocab_senses WHERE id=?').run(sense.id);
  ok(exBefore >= 2 && q.val('SELECT COUNT(*) c FROM vocab_examples WHERE sense_id=?', sense.id) === 0,
    'Xoá một nghĩa kéo theo câu ví dụ của nó (ON DELETE CASCADE)');
} catch (e) {
  fail++;
  console.log('✗ Lỗi khi chạy: ' + (e && e.stack ? e.stack : e));
} finally {
  if (tmp) rmSync(tmp, { recursive: true, force: true });
}

console.log('\n' + (fail ? '\x1b[31m' : '\x1b[32m') + pass + '/' + (pass + fail) + ' kiểm thử đạt\x1b[0m');
process.exit(fail ? 1 : 0);
