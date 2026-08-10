/**
 * Kiểm thử khu tự học: hai API tra cứu (động từ bất quy tắc, từ nối) và hai
 * trang dùng chúng.
 *
 * Trọng tâm là chất lượng dữ liệu, không chỉ mã trạng thái HTTP: câu ví dụ
 * phải thực sự chứa mục từ nó minh hoạ, mọi mục phải có nghĩa tiếng Việt, và
 * bộ lọc phải lọc đúng chứ không âm thầm trả về cả bảng.
 *
 * Chạy khi server đã bật: node scripts/test-learn.mjs
 */
import { chromium } from 'playwright-core';

const BASE = process.env.BASE || 'http://127.0.0.1:3000';
const EXEC = process.env.CHROMIUM || '/opt/pw-browsers/chromium';

let pass = 0, fail = 0;
const ok = (c, name) => { c ? (pass++, console.log('✓ ' + name)) : (fail++, console.log('✗ ' + name)); };

const get = async (p) => (await fetch(BASE + p)).json();

async function login(ctx) {
  const page = await ctx.newPage();
  await page.goto(BASE + '/prep/dang-nhap/', { waitUntil: 'networkidle' });
  await page.fill('#email', 'student');
  await page.fill('#password', 'Goodmorning01');
  await page.click('#submit');
  await page.waitForURL(u => !u.pathname.includes('dang-nhap'), { timeout: 10000 });
  return page;
}

const browser = await chromium.launch({ executablePath: EXEC, args: ['--no-sandbox'] });

try {
  /* ============ 1. Động từ bất quy tắc ============ */
  console.log('\n\x1b[1m== API động từ bất quy tắc ==\x1b[0m');

  const irr = await get('/api/learn/irregular-verbs');
  ok(irr.total >= 190, 'Bảng có ít nhất 190 động từ (' + irr.total + ')');
  ok(irr.count === irr.verbs.length, 'count khớp số phần tử trả về');

  const vAll = irr.verbs;
  ok(vAll.every(v => v.v1 && v.v2 && v.v3 && v.ving), 'Mọi động từ đủ V1–V2–V3–Ving');
  ok(vAll.every(v => v.vi && v.vi.trim()), 'Mọi động từ có nghĩa tiếng Việt');
  ok(vAll.every(v => v.ipaUk && v.ipaUs), 'Mọi động từ có phiên âm Anh và Mỹ');
  ok(vAll.every(v => ['aaa', 'aba', 'abb', 'abc'].includes(v.group)), 'Nhóm luôn thuộc aaa/aba/abb/abc');
  ok(new Set(vAll.map(v => v.v1)).size === vAll.length, 'Không có V1 trùng nhau');

  /* Nhóm phải đúng với hình thái thật, nếu không bảng phân nhóm là vô nghĩa */
  const wrongGrp = vAll.filter(v => {
    const [a, b, c] = [v.v1.toLowerCase(), v.v2.toLowerCase(), v.v3.toLowerCase()];
    const shape = a === b && b === c ? 'aaa' : a === c && a !== b ? 'aba'
      : b === c && a !== b ? 'abb' : 'abc';
    return shape !== v.group;
  });
  ok(wrongGrp.length === 0, 'Nhóm khớp hình thái thật của từng động từ' +
    (wrongGrp.length ? ' (sai: ' + wrongGrp.slice(0, 5).map(v => v.v1).join(', ') + ')' : ''));

  /* Câu ví dụ phải chứa ít nhất một dạng của chính động từ đó.
     Vài ô chứa hai biến thể ngăn bằng dấu '/' (be → "was/were", learn →
     "learnt/learned"), nên tách ra trước khi so. */
  const forms = v => [v.v1, v.v2, v.v3, v.ving]
    .flatMap(f => f.split('/')).map(f => f.trim().toLowerCase()).filter(Boolean);
  const exBad = vAll.filter(v => {
    if (!v.exEn) return false;
    const s = v.exEn.toLowerCase();
    return !forms(v).some(f => s.includes(f));
  });
  ok(exBad.length === 0, 'Câu ví dụ chứa đúng động từ nó minh hoạ' +
    (exBad.length ? ' (sai: ' + exBad.slice(0, 5).map(v => v.v1).join(', ') + ')' : ''));

  const irrA1 = await get('/api/learn/irregular-verbs?level=A1');
  ok(irrA1.verbs.length > 0 && irrA1.verbs.every(v => v.level === 'A1'), 'Lọc theo bậc A1 trả đúng bậc');
  ok(irrA1.verbs.length < irr.count, 'Lọc theo bậc thu hẹp kết quả');

  const irrAbc = await get('/api/learn/irregular-verbs?group=abc');
  ok(irrAbc.verbs.length > 0 && irrAbc.verbs.every(v => v.group === 'abc'), 'Lọc theo nhóm abc trả đúng nhóm');

  const irrKw = await get('/api/learn/irregular-verbs?q=go');
  ok(irrKw.verbs.some(v => v.v1 === 'go'), 'Tìm "go" thấy động từ go');

  const irrJunk = await get('/api/learn/irregular-verbs?level=Z9&group=xxx');
  ok(irrJunk.count === irr.count, 'Tham số lọc rác bị bỏ qua, không làm hỏng truy vấn');

  /* read: V2/V3 viết giống V1 nhưng đọc khác — phải có ghi chú bẫy phát âm */
  const read = vAll.find(v => v.v1 === 'read');
  ok(read && read.note && /red/i.test(read.note), 'Động từ "read" có ghi chú bẫy phát âm /red/');

  /* ============ 2. Từ nối ============ */
  console.log('\n\x1b[1m== API từ nối ==\x1b[0m');

  const lw = await get('/api/learn/linking-words');
  ok(lw.total >= 120, 'Bảng có ít nhất 120 từ nối (' + lw.total + ')');
  ok(lw.count === lw.words.length, 'count khớp số phần tử trả về');
  ok(Array.isArray(lw.functions) && lw.functions.length === 13, 'Trả đủ 13 chức năng');
  ok(Array.isArray(lw.registers) && lw.registers.length === 3, 'Trả đủ 3 mức trang trọng');
  ok(lw.functions.every(f => f.id && f.label), 'Mỗi chức năng có id và nhãn tiếng Việt');

  const wAll = lw.words;
  const fnIds = new Set(lw.functions.map(f => f.id));
  const regIds = new Set(lw.registers.map(r => r.id));
  ok(wAll.every(w => fnIds.has(w.fn)), 'Mọi từ nối thuộc một chức năng đã khai báo');
  ok(wAll.every(w => regIds.has(w.register)), 'Mọi từ nối có mức trang trọng hợp lệ');
  ok(wAll.every(w => w.vi && w.vi.trim()), 'Mọi từ nối có nghĩa tiếng Việt');
  ok(wAll.every(w => w.punct && w.punct.trim()), 'Mọi từ nối có quy tắc dấu câu');
  ok(wAll.every(w => w.exEn && w.exVi), 'Mọi từ nối có ví dụ song ngữ Anh–Việt');

  /* Câu ví dụ phải thật sự dùng từ nối đó — bắt lỗi ghép nhầm dữ liệu */
  const lwBad = wAll.filter(w => !w.exEn.toLowerCase().includes(w.word.toLowerCase().split(' ')[0]));
  ok(lwBad.length === 0, 'Câu ví dụ thật sự chứa từ nối nó minh hoạ' +
    (lwBad.length ? ' (sai: ' + lwBad.slice(0, 5).map(w => w.word).join(', ') + ')' : ''));

  /* Cùng một từ có thể mang nhiều chức năng, nhưng không được trùng cặp */
  const pairs = wAll.map(w => w.word + '|' + w.fn);
  ok(new Set(pairs).size === pairs.length, 'Không có cặp (từ, chức năng) trùng nhau');

  /* Mỗi chức năng phải có ít nhất vài từ, nếu không nhóm đó là chỗ trống */
  const thin = lw.functions.filter(f => wAll.filter(w => w.fn === f.id).length < 5);
  ok(thin.length === 0, 'Mỗi chức năng có ít nhất 5 từ' +
    (thin.length ? ' (mỏng: ' + thin.map(f => f.id).join(', ') + ')' : ''));

  const lwFn = await get('/api/learn/linking-words?fn=contrast');
  ok(lwFn.words.length > 0 && lwFn.words.every(w => w.fn === 'contrast'), 'Lọc theo chức năng trả đúng chức năng');
  ok(lwFn.words.length < lw.count, 'Lọc theo chức năng thu hẹp kết quả');

  const lwReg = await get('/api/learn/linking-words?register=academic');
  ok(lwReg.words.length > 0 && lwReg.words.every(w => w.register === 'academic'), 'Lọc theo mức trang trọng trả đúng mức');

  const lwLvl = await get('/api/learn/linking-words?level=b1');
  ok(lwLvl.words.length > 0 && lwLvl.words.every(w => w.level === 'B1'), 'Lọc theo bậc chấp nhận chữ thường');

  const lwKw = await get('/api/learn/linking-words?q=however');
  ok(lwKw.words.some(w => w.word === 'however'), 'Tìm "however" thấy đúng từ');

  const lwJunk = await get('/api/learn/linking-words?fn=khong-co&register=xyz');
  ok(lwJunk.count === lw.count, 'Tham số lọc rác bị bỏ qua, không làm hỏng truy vấn');

  /* Lỗi kinh điển của người học: dùng "however" như liên từ nối hai mệnh đề */
  const however = wAll.find(w => w.word === 'however');
  ok(however && however.warn && /chấm|;/.test(however.warn),
    '"however" cảnh báo phải dùng dấu chấm hoặc chấm phẩy');
  ok(wAll.filter(w => w.warn && w.warn.trim()).length >= 40, 'Ít nhất 40 mục có cảnh báo dùng sai');

  /* ============ 3. Hai trang tự học ============ */
  console.log('\n\x1b[1m== Trang khu tự học ==\x1b[0m');

  const ctx = await browser.newContext();
  const errs = [];
  ctx.on('weberror', e => errs.push(String(e.error())));

  const page = await login(ctx);

  /* Bảng động từ: bản bảng cho màn rộng và bản thẻ cho màn hẹp dùng chung
     một tập dữ liệu, cả hai đều phải được đổ đầy. */
  await page.goto(BASE + '/prep/hoc/dong-tu-bat-quy-tac/', { waitUntil: 'networkidle' });
  await page.waitForSelector('#tbody tr', { timeout: 10000 });
  const rowCount = await page.locator('#tbody tr').count();
  ok(rowCount === irr.count, 'Trang động từ hiện đủ ' + irr.count + ' dòng (thấy ' + rowCount + ')');
  ok(await page.locator('#cards article').count() === irr.count, 'Bản thẻ cho màn hẹp cũng đủ dòng');
  ok(await page.locator('#empty[hidden]').count() === 1, 'Trang động từ không hiện trạng thái rỗng khi có dữ liệu');

  await page.goto(BASE + '/prep/hoc/tu-noi/', { waitUntil: 'networkidle' });
  await page.waitForSelector('#grid article', { timeout: 10000 });
  const cardCount = await page.locator('#grid article').count();
  ok(cardCount === lw.count, 'Trang từ nối hiện đủ ' + lw.count + ' thẻ (thấy ' + cardCount + ')');
  ok(await page.locator('#empty[hidden]').count() === 1, 'Không hiện trạng thái rỗng khi có dữ liệu');
  ok(await page.locator('#skeleton.hidden').count() === 1, 'Skeleton đã nhường chỗ cho nội dung');

  /* Lọc theo chức năng trên giao diện phải khớp số liệu API */
  await page.click('[data-fn="contrast"]');
  await page.waitForTimeout(350);
  const afterFilter = await page.locator('#grid article').count();
  ok(afterFilter === lwFn.words.length,
    'Chip "tương phản" lọc còn ' + lwFn.words.length + ' thẻ (thấy ' + afterFilter + ')');

  /* Tìm chuỗi chắc chắn không có → phải ra trạng thái rỗng, không phải trang trắng */
  await page.click('[data-fn=""]');
  await page.fill('#q', 'zzzzkhongcotu');
  await page.waitForTimeout(400);
  ok(await page.locator('#empty:not([hidden])').count() === 1, 'Tìm không thấy thì hiện trạng thái rỗng');
  ok(await page.locator('#grid[hidden]').count() === 1, 'Lưới ẩn đi khi không có kết quả');

  /* Nút xoá bộ lọc phải đưa về đủ danh sách */
  await page.click('#clear');
  await page.waitForTimeout(350);
  ok(await page.locator('#grid article').count() === lw.count, 'Nút "Xoá bộ lọc" đưa về đủ danh sách');

  ok(errs.length === 0, 'Không có lỗi JavaScript trên hai trang' +
    (errs.length ? ': ' + errs[0] : ''));

  await ctx.close();
} finally {
  await browser.close();
}

console.log(`\n${pass}/${pass + fail} kiểm thử đạt`);
process.exit(fail ? 1 : 0);
