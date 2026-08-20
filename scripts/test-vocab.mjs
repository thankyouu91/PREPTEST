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
  /* Trang mặc định là 50 mục. Phép kiểm cũ đòi `entries.length === total`, và
     nó chỉ đúng chừng nào kho còn nhỏ hơn một trang — nghĩa là nó hỏng đúng vào
     ngày trình nhập từ điển làm kho lớn lên, việc mà nó sinh ra để làm. */
  ok(Array.isArray(list.entries) && list.entries.length === Math.min(list.total, 50),
    'Danh sách trả về đủ một trang', list.entries.length + '/' + list.total);
  ok(list.levels.length >= 2 && list.parts.length >= 3,
    'Có thống kê theo bậc và theo từ loại', JSON.stringify({ levels: list.levels.length, parts: list.parts.length }));

  /* Cùng một mặt chữ ở hai từ loại là hai mục riêng — đó là lý do khoá tự nhiên
     là (headword, pos) chứ không phải mình headword. Hỏi thẳng bằng từ khoá chứ
     không lọc trang đầu: trang đầu không hứa chứa từ nào cả. */
  const books = (await get('/api/learn/vocab?q=book')).data.entries
    .filter(e => e.headword === 'book');
  ok(books.length === 2, 'Cùng mặt chữ khác từ loại là hai mục', JSON.stringify(books.map(b => b.pos)));
  ok(books.some(b => b.pos === 'noun' && b.level === 'A1') &&
     books.some(b => b.pos === 'verb' && b.level === 'A2'),
    'Hai mục "book" đúng bậc như docs/LEARNING.md §1.2 nêu',
    JSON.stringify(books.map(b => b.pos + '/' + b.level)));

  r = await get('/api/learn/vocab?level=B2&limit=200');
  ok(r.status === 200 && r.data.entries.every(e => e.level === 'B2'),
    'Lọc theo bậc chỉ trả về bậc đó', JSON.stringify(r.data.entries.map(e => e.level)));
  ok(r.data.matched < r.data.total && r.data.matched > 0,
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

  /* ================= Từ điển mở qua API =================
     Chạy thuần trên `normalise()`, không gọi mạng: bài test không được phụ
     thuộc vào việc freedictionaryapi.com có sống hay không, và cái cần chứng
     minh là cách xử lý dữ liệu chứ không phải đường truyền.

     Mọi mẩu dữ liệu dưới đây là hình dạng thật, chép từ lần gọi thật ngày
     19/08/2026 — "trunk" đúng là mở đầu bằng một nghĩa tiêu đề rỗng, và
     "reasonable" đúng là mở đầu bằng một nghĩa cổ. */
  head('Từ điển mở qua API');

  const dict = require_('../server/providers/dictionary.js');
  const than = (partOfSpeech, senses) => ({
    source: { url: 'https://en.wiktionary.org/wiki/x', license: { name: 'CC BY-SA 4.0' } },
    entries: [{ language: { code: 'en' }, partOfSpeech, senses }]
  });
  const dinh = (definition, extra) => Object.assign({ definition }, extra || {});

  /* Nghĩa thiếu bản dịch vẫn được giữ. Đây là chỗ hỏng thật: bản đầu bỏ luôn
     nghĩa nào không có tiếng Việt, và một mẻ B2 mười hai từ chỉ vào được bốn —
     "festival" và "trunk" rơi hết. Định nghĩa tiếng Anh vẫn dạy được từ. */
  const khongDich = dict.normalise('festival', than('noun', [
    dinh('An event or series of special events centred on a celebration.')
  ]));
  ok(khongDich && khongDich[0].senses.length === 1,
    'Nghĩa không có bản dịch tiếng Việt vẫn được giữ, không bị bỏ từ');
  ok(khongDich && khongDich[0].senses[0].vi === '',
    'Chỗ chưa dịch để trống chứ không bịa ra chữ',
    JSON.stringify(khongDich && khongDich[0].senses[0].vi));

  const coDich = dict.normalise('tradition', than('noun', [
    dinh('A part of culture passed from person to person.', {
      translations: [{ language: { code: 'fr' }, word: 'tradition' },
                     { language: { code: 'vi' }, word: 'sự truyền miệng' }]
    })
  ]));
  ok(coDich[0].senses[0].vi === 'sự truyền miệng',
    'Có bản dịch tiếng Việt thì lấy đúng nó, không lấy nhầm ngôn ngữ khác',
    coDich[0].senses[0].vi);

  /* Nghĩa cổ không đưa vào giáo trình. "reasonable" ở Wiktionary mở đầu bằng
     "(now rare) having the faculty of reason" — người học B2 không cần nghĩa
     đó, và để nó đứng đầu là dạy sai từ. */
  const cu = dict.normalise('reasonable', than('adjective', [
    dinh('(now rare) Having the faculty of reason.', { tags: ['archaic'] }),
    dinh('Just; fair; agreeable to reason.'),
    dinh('Not expensive; fairly priced.')
  ]));
  ok(cu[0].senses.length === 2 && /^Just; fair/.test(cu[0].senses[0].en),
    'Nghĩa cổ bị loại, nghĩa đang dùng lên đầu', cu[0].senses.map(s => s.en.slice(0, 18)).join(' | '));

  /* Dạng chia và lỗi chính tả không phải nghĩa. "plural of datum" thì từ gốc
     đã có mục riêng và dạng chia thuộc về bảng `vocab_forms`; còn "Misspelling
     of bloc." từng nằm trong danh sách B1 như một nghĩa của "block" — một thẻ
     dạy người học viết sai từ. */
  const vun = dict.normalise('block', than('noun', [
    dinh('Misspelling of bloc.', { tags: ['alt of', 'misspelling'] }),
    dinh('simple past and past participle of ashame', { tags: ['form of', 'past'] }),
    dinh('A substantial, often cuboid, piece of any substance.')
  ]));
  ok(vun[0].senses.length === 1 && /^A substantial/.test(vun[0].senses[0].en),
    'Dạng chia và lỗi chính tả bị loại, không thành thẻ từ vựng',
    vun[0].senses.map(s => s.en.slice(0, 20)).join(' | '));

  /* Nhưng "alt of" trần thì giữ: "Ellipsis of swimming trunks" đúng là nghĩa
     người học cần biết. Loại cả nhóm là loại nhầm. */
  const rutGon = dict.normalise('trunk', than('noun', [
    dinh('(in the plural) Ellipsis of swimming trunks.',
      { tags: ['abbreviation', 'alt of', 'ellipsis', 'in plural'] })
  ]));
  ok(rutGon && rutGon[0].senses.length === 1,
    '"alt of" trần vẫn giữ — dạng rút gọn là nghĩa đáng dạy');

  /* Nghĩa "tiêu đề" của Wiktionary là vỏ rỗng: các nghĩa con nằm dưới nó thì
     API này không trả về, nên lưu lại chỉ được một câu không dạy gì. */
  const tieuDe = dict.normalise('trunk', than('noun', [
    dinh('(heading, biology) Part of a body.'),
    dinh('(heading) A container.'),
    dinh('The main line or body of anything.')
  ]));
  ok(tieuDe[0].senses.length === 1 && /^The main line/.test(tieuDe[0].senses[0].en),
    'Nghĩa tiêu đề rỗng bị loại', tieuDe[0].senses.map(s => s.en.slice(0, 20)).join(' | '));

  /* Nghĩa chuyên ngành thì giữ nhưng xếp sau. Loại hẳn là sai: "negligence"
     vốn là từ luật, bỏ nghĩa (law) đi thì mục từ rỗng ruột. */
  const chuyenNganh = dict.normalise('negligence', than('noun', [
    dinh('(law, uncountable) The breach of a duty of care.'),
    dinh('The state of being negligent.')
  ]));
  ok(/^The state/.test(chuyenNganh[0].senses[0].en),
    'Nghĩa phổ thông đứng trước nghĩa chuyên ngành',
    chuyenNganh[0].senses.map(s => s.en.slice(0, 16)).join(' | '));
  ok(chuyenNganh[0].senses.length === 2,
    'Nhưng nghĩa chuyên ngành vẫn được giữ, chỉ xếp sau');

  /* Nhãn ngữ pháp không phải nhãn chuyên ngành. Nếu đọc nhầm "(uncountable)"
     thành một lĩnh vực thì gần như mọi danh từ đều bị đẩy xuống cuối. */
  const nguPhap = dict.normalise('advice', than('noun', [
    dinh('(uncountable) An opinion offered as a guide to action.'),
    dinh('(law) Formal notice of a transaction.')
  ]));
  ok(/^\(uncountable\)/.test(nguPhap[0].senses[0].en),
    'Nhãn ngữ pháp không bị nhầm thành nhãn chuyên ngành',
    nguPhap[0].senses[0].en.slice(0, 22));

  /* Ngoặc đầu định nghĩa không phải lúc nào cũng là nhãn lĩnh vực. Wiktionary
     nhét cả lời dẫn nghĩa vào đó — "(of a situation)" ở `ironic`, "(physical)"
     ở `accommodation`, "(relational)" ở `facial`. Bản đầu đọc tất cả thành
     "chuyên ngành", thế là ba từ B2 bình thường bị trình nhập vứt đi. */
  const dan = dict.normalise('ironic', than('adjective', [
    dinh('(of a situation) Characterized by irony.'),
    dinh('(relational) Of or relating to irony.')
  ]));
  ok(dict.teachable(dan), 'Lời dẫn nghĩa trong ngoặc không biến từ thường thành từ chuyên ngành');

  /* Và nghĩa theo vùng thì KHÔNG bị đẩy xuống. Nghĩa "chỗ ở" của
     "accommodation" mang nhãn (British, Australia) vì tiếng Anh-Mỹ nói
     "accommodations" — đẩy nó xuống thì người học mở thẻ ra gặp nghĩa "sự điều
     tiết" trước nghĩa họ cần. */
  const vung = dict.normalise('accommodation', than('noun', [
    dinh('(British, Australia, a mass noun) Lodging in a dwelling.'),
    dinh('(physical) Adaptation or adjustment.')
  ]));
  ok(/^\(British/.test(vung[0].senses[0].en),
    'Nghĩa theo vùng không bị đẩy xuống', vung[0].senses[0].en.slice(0, 24));

  /* Giấy phép CC BY-SA đòi ghi nguồn. Không có nguồn thì thà bỏ từ. */
  ok(dict.normalise('x', { entries: [{ partOfSpeech: 'noun', senses: [dinh('A thing.')] }] }) === null,
    'Không có nguồn và giấy phép thì không nhận mục từ');
  ok(dict.normalise('x', than('noun', [dinh('A thing.')]))[0].licence === 'CC BY-SA 4.0',
    'Giấy phép đi kèm từng mục');

  /* Không còn nghĩa nào dùng được thì trả null, để trình nhập đếm vào ô "không
     có trong từ điển" thay vì ghi một mục rỗng. */
  ok(dict.normalise('x', than('noun', [dinh('(heading) A thing.')])) === null,
    'Mục chỉ toàn nghĩa bỏ đi thì trả null chứ không lưu mục rỗng');

  /* Trần bốn nghĩa mỗi từ loại — thẻ từ vựng không phải trang từ điển. */
  const nhieu = dict.normalise('set', than('verb',
    Array.from({ length: 9 }, (_, i) => dinh('Sense number ' + i + ' of a very long entry.'))));
  ok(nhieu[0].senses.length === 4, 'Mỗi từ loại giữ tối đa bốn nghĩa', String(nhieu[0].senses.length));

  /* ---- Luật giáo trình: tra được không có nghĩa là đáng dạy ----
     Danh sách tần suất lấy từ phụ đề, nên "randy" và "nah" nằm cùng dải hạng
     với "negligence" và "voyage". Trước khi tra nghĩa thì không có cách nào
     phân biệt; sau khi tra thì có. */
  const muc = (senses) => dict.normalise('x', than('noun', senses))[0];

  ok(dict.teachable(muc([dinh('The state of being negligent.')])),
    'Từ có nghĩa phổ thông thì nhận');
  ok(!dict.teachable(muc([
    dinh('(British, informal) Sexually aroused.'),
    dinh('(chiefly Scotland) Rude or coarse in manner.')
  ])), 'Mọi nghĩa đều là khẩu ngữ hoặc phương ngữ thì loại — "randy" vào bảng B2 là hỏng');

  /* Nhãn lĩnh vực KHÔNG phải lý do loại. Bản đầu coi (anatomy), (chemistry) và
     (law) là đủ để loại, và vứt mất "pelvis", "silicon", "urine",
     "accommodation" — đúng những từ C1–C2 mà lệnh này sinh ra để thêm vào. */
  ok(dict.teachable(muc([
    dinh('(anatomy) The large compound bone structure at the base of the spine.'),
    dinh('(anatomy) A funnel-shaped cavity.')
  ])), 'Từ mà mọi nghĩa đều thuộc một lĩnh vực vẫn được nhận — "pelvis" là từ đáng dạy');

  /* Một từ, nhiều từ loại: xét cả từ chứ không xét riêng từng từ loại. "exam"
     là khẩu ngữ ở danh từ nhưng bình thường ở động từ; loại danh từ đi thì kho
     giữ đúng nửa sai của từ. */
  ok(dict.teachable([
    { senses: [{ en: '(informal) Clipping of examination.', note: 'informal' }] },
    { senses: [{ en: '(sciences) Shortened form of examine.', note: '' }] }
  ]), 'Xét cả từ chứ không xét riêng từng từ loại');
  ok(!dict.teachable(muc([dinh('(slang) Cocaine.'), dinh('(slang) A drug portion.')])),
    'Mọi nghĩa đều là tiếng lóng thì loại');
  ok(dict.teachable(muc([
    dinh('The noise of a horn or whistle.'), dinh('(slang) Cocaine.')
  ])), 'Nghĩa đời thường có mặt thì nhận, nghĩa lóng phía sau không làm hỏng mục từ');

  /* Nghĩa lóng bị đẩy xuống cuối, y như nghĩa chuyên ngành. Đây là chỗ "sink"
     hỏng: Wiktionary xếp động từ trước danh từ và mở đầu bằng "(transitive,
     slang) To drink", nên thẻ của một từ A2 mở ra là một nghĩa lóng. */
  const cLong = dict.normalise('sink', than('verb', [
    dinh('(transitive, slang) To drink quickly.'),
    dinh('(intransitive) To descend below the surface.')
  ]));
  ok(/^\(intransitive\)/.test(cLong[0].senses[0].en),
    'Nghĩa lóng bị đẩy xuống, nghĩa thường lên đầu', cLong[0].senses[0].en.slice(0, 24));

  /* Và xét cả từ: một từ loại mở đầu bằng nghĩa lóng không kéo cả từ xuống nếu
     từ loại khác vẫn mở đầu đàng hoàng. */
  ok(dict.teachable([
    { senses: [{ en: '(transitive, slang) To drink quickly.', note: 'slang' }] },
    { senses: [{ en: 'A basin used for holding water.', note: '' }] }
  ]), 'Một từ loại mở đầu bằng tiếng lóng không loại cả từ — "sink" là từ A2');
  ok(dict.normalise('x', than('noun', [dinh('A coarse word.', { tags: ['vulgar'] })])) === null,
    'Nghĩa tục bị loại ngay ở tầng từ điển, không còn nghĩa nào thì không có mục từ');

  /* Từ nào có một nghĩa là lời miệt thị thì không dạy, dù các nghĩa còn lại
     lành. "fag" giữ nghĩa "điếu thuốc" ở Anh và một nghĩa lịch sử trong trường
     học, nên bỏ riêng nghĩa xúc phạm đi là từ này lọt vào danh sách B2 trông
     rất vô hại — trong khi nghĩa người học sẽ gặp ngoài đời đúng là nghĩa vừa
     bỏ. Đây là luật đọc từ nhãn của Wiktionary, không phải danh sách cấm chép
     tay. */
  const coMietThi = dict.normalise('fag', {
    source: { url: 'https://en.wiktionary.org/wiki/x', license: { name: 'CC BY-SA 4.0' } },
    entries: [
      { language: { code: 'en' }, partOfSpeech: 'noun',
        senses: [dinh('(UK, Ireland, colloquial) A cigarette.')] },
      { language: { code: 'en' }, partOfSpeech: 'noun',
        senses: [dinh('A slur.', { tags: ['offensive'] }),
                 dinh('Another slur.', { tags: ['vulgar'] }),
                 dinh('A third slur.', { tags: ['slur'] })] }
    ]
  });
  ok(coMietThi && coMietThi.length === 1 && coMietThi[0].offensive === true,
    'Từ loại chỉ toàn nghĩa xúc phạm bị bỏ, nhưng cờ vẫn bám vào cả từ',
    JSON.stringify(coMietThi && coMietThi.map(e => e.offensive)));
  ok(!dict.teachable(coMietThi),
    'Từ có cả một từ loại toàn nghĩa miệt thị thì không dạy, dù nghĩa còn lại lành');

  /* Nhưng MỘT nghĩa thô nằm lẻ trong một mục từ dài thì không định nghĩa cả từ.
     "cancer" có đúng một nghĩa tính từ tục từ tiếng lóng mạng, bên cạnh nghĩa
     bệnh — luật đếm-một đã loại mất "cancer", "wet", "cheese" và "curry". */
  const motNghiaTho = dict.normalise('cancer', {
    source: { url: 'https://en.wiktionary.org/wiki/x', license: { name: 'CC BY-SA 4.0' } },
    entries: [
      { language: { code: 'en' }, partOfSpeech: 'noun',
        senses: [dinh('(medicine) A disease in which cells divide uncontrollably.')] },
      { language: { code: 'en' }, partOfSpeech: 'adjective',
        senses: [dinh('Extremely unpleasant.', { tags: ['vulgar', 'slang'] })] }
    ]
  });
  ok(dict.teachable(motNghiaTho),
    'Một nghĩa thô lẻ loi trong mục từ dài thì không loại cả từ — "cancer" vẫn phải dạy được');

  /* Và phần luật nhãn với tay không tới thì có danh sách người giữ, ghi rõ là
     danh sách chứ không giả vờ là luật. */
  ok(!dict.teachable(dict.normalise('cock', than('noun', [dinh('A male bird.')]))),
    'Danh sách người giữ chặn được từ mà thứ tự nghĩa của Wiktionary không lộ ra');

  /* Nhãn liệt kê nhiều vùng nhưng có kèm một chuẩn quốc gia thì không phải
     phương ngữ. "theatre" mang nhãn "(chiefly Australia, Canada, New Zealand,
     UK, Hong Kong…)" — đọc cái đuôi ấy thành phương ngữ là vứt mất cách viết
     Anh-Anh của một từ thường. */
  ok(dict.teachable(dict.normalise('theatre', than('noun', [
    dinh('(chiefly Australia, Canada, New Zealand, UK, Hong Kong) A place of performance.')
  ]))), 'Nhãn nhiều vùng có kèm chuẩn quốc gia thì không tính là phương ngữ');

  /* Nhãn có khi chỉ nằm trong ngoặc đầu định nghĩa chứ không nằm ở `tags` —
     bản đầu chỉ đọc `tags` nên bỏ lọt đúng cái nửa mà người đọc nhìn thấy. */
  ok(!dict.teachable(muc([dinh('(slang) A thing.'), dinh('(slang) Another thing.')])),
    'Nhãn lóng viết trong ngoặc, không có ở tags, vẫn bị bắt');

  /* Đây là một phán đoán giáo trình chứ không phải một sự thật ngôn ngữ, nên
     `normalise()` không được tự áp dụng: người quản trị thêm tay từ nào cũng
     phải được, kể cả từ mà luật này loại. */
  ok(dict.normalise('randy', than('adjective', [dinh('(British, informal) Sexually aroused.')])) !== null,
    'normalise() vẫn trả về đủ, việc lọc là của bên gọi');

  /* ================= Kho bản dịch tiếng Việt =================
     `server/data/vocab-vi.tsv` do một tác nhân dịch ghi vào theo giờ, không có
     ai ngồi cạnh. Nên hình dạng của tệp phải được kiểm ở đây: một dòng lệch cột
     sẽ đẩy sai mọi cột sau nó, và không ai phát hiện ra cho tới khi người học
     mở thẻ từ ra và thấy bản dịch của một từ khác. */
  head('Kho bản dịch tiếng Việt');

  const store = require_('../server/data/vocab-vi.js');
  const banDich = store.read();

  ok(banDich.length > 3000, 'Kho bản dịch có đủ dòng', String(banDich.length));

  const raw = require_('node:fs').readFileSync(store.FILE, 'utf8').split('\n')
    .filter((l, i) => l.trim() && i > 0);
  const lechCot = raw.filter(l => l.split('\t').length !== store.COLUMNS.length);
  ok(lechCot.length === 0, 'Mọi dòng đúng năm cột — lệch một cột là sai cả tệp',
    lechCot.slice(0, 2).map(l => l.slice(0, 50)).join(' | '));

  /* Khoá trùng thì bước trộn ghi vào dòng đầu và bỏ quên dòng sau, im lặng. */
  const khoa = new Map();
  banDich.forEach(r => {
    const k = store.key(r.headword, r.pos, r.en);
    khoa.set(k, (khoa.get(k) || 0) + 1);
  });
  const trung = [...khoa.entries()].filter(([, n]) => n > 1);
  ok(trung.length === 0, 'Không khoá nào trùng', trung.slice(0, 2).map(([k]) => k.slice(0, 46)).join(' | '));

  ok(banDich.every(r => r.level && r.headword && r.pos && r.en),
    'Bốn cột khoá không dòng nào để trống');

  /* Bản dịch mà vẫn là tiếng Anh nghĩa là tác nhân chép lại định nghĩa. Bước
     trộn đã chặn, nhưng chặn ở một chỗ thì phải kiểm ở chỗ khác. */
  const CO_DAU = /[àáảãạăằắẳẵặâầấẩẫậèéẻẽẹêềếểễệìíỉĩịòóỏõọôồốổỗộơờớởỡợùúủũụưừứửữựỳýỷỹỵđ]/i;
  const conAnh = banDich.filter(r => r.vi && r.vi.length > 24 && !CO_DAU.test(r.vi));
  ok(conAnh.length === 0, 'Không bản dịch nào còn là tiếng Anh',
    conAnh.slice(0, 2).map(r => r.headword + ': ' + r.vi.slice(0, 40)).join(' | '));

  const p = store.progress();
  ok(p.done + p.todo === p.total && p.done > 0,
    'Số đếm tiến độ khớp với nội dung tệp', JSON.stringify(p));

  /* Cột `vi` để trống phải lộ ra ở API, nếu không màn hình sẽ in một dòng trắng
     ở đúng chỗ đáng lẽ là bản dịch. */
  const chuaDich = q.get("SELECT id FROM vocab_entries WHERE headword='child'");
  db.prepare("INSERT INTO vocab_senses (entry_id,en,vi,level,sort) VALUES (?,?,'','B2',98)")
    .run(chuaDich.id, 'A sense imported without a Vietnamese gloss.');
  const conThieu = q.val("SELECT COUNT(*) c FROM vocab_senses WHERE vi=''");
  ok(conThieu === 1, 'Đếm được số nghĩa đang chờ dịch', String(conThieu));
} catch (e) {
  fail++;
  console.log('✗ Lỗi khi chạy: ' + (e && e.stack ? e.stack : e));
} finally {
  if (tmp) rmSync(tmp, { recursive: true, force: true });
}

console.log('\n' + (fail ? '\x1b[31m' : '\x1b[32m') + pass + '/' + (pass + fail) + ' kiểm thử đạt\x1b[0m');
process.exit(fail ? 1 : 0);
