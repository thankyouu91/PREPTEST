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

  /* ============ 3. Ngữ pháp: 12 thì ============ */
  console.log('\n\x1b[1m== API ngữ pháp (12 thì) ==\x1b[0m');

  const gr = await get('/api/learn/grammar?grp=tense');
  ok(gr.count === 12, 'Có đúng 12 thì (' + gr.count + ')');
  ok(gr.points.every(p => p.grp === 'tense'), 'Lọc theo nhóm trả đúng nhóm');
  ok(gr.points.every(p => p.nameVi && p.nameEn && p.summary), 'Mọi thì có tên Việt, tên Anh và tóm tắt');
  ok(gr.points.every(p => ['A1', 'A2', 'B1', 'B2', 'C1', 'C2'].includes(p.level)), 'Bậc luôn hợp lệ');
  ok(new Set(gr.points.map(p => p.slug)).size === 12, 'Không có slug trùng');

  /* Công thức phải đủ ba dạng, nếu thiếu thì mục học là nửa vời */
  const formRows = p => (p.formula && p.formula.rows || []).filter(r => r && r[1]);
  const noForm = gr.points.filter(p => formRows(p).length !== 3);
  ok(noForm.length === 0, 'Mọi thì có đủ công thức khẳng định, phủ định, nghi vấn' +
    (noForm.length ? ' (thiếu: ' + noForm.map(p => p.slug).join(', ') + ')' : ''));
  ok(gr.points.every(p => p.signals && p.signals.length), 'Mọi thì có dấu hiệu nhận biết');
  ok(gr.points.every(p => p.counts.example === 8), 'Mỗi thì có đúng 8 câu ví dụ');
  ok(gr.points.every(p => p.counts.practice === 12), 'Mỗi thì có đúng 12 câu luyện tập');

  const grLvl = await get('/api/learn/grammar?grp=tense&level=a1');
  ok(grLvl.count > 0 && grLvl.points.every(p => p.level === 'A1'), 'Lọc theo bậc chấp nhận chữ thường');
  ok(grLvl.count < 12, 'Lọc theo bậc thu hẹp kết quả');

  const gr404 = await fetch(BASE + '/api/learn/grammar/khong-co-that');
  ok(gr404.status === 404, 'Slug không tồn tại trả 404');

  /* Soi kỹ từng thì: đây là nơi lỗi soạn nội dung hay lọt qua */
  let exTotal = 0, prTotal = 0;
  const flaws = [];
  for (const p of gr.points) {
    const d = await get('/api/learn/grammar/' + p.slug);
    exTotal += d.examples.length;
    prTotal += d.practice.length;

    if (!d.point.useWhen.length) flaws.push(p.slug + ': thiếu "dùng khi nào"');
    if (!d.point.useNot.length) flaws.push(p.slug + ': thiếu "KHÔNG dùng khi nào"');
    if (!d.point.confuse.length) flaws.push(p.slug + ': thiếu phần phân biệt');
    if (!d.point.errors.length) flaws.push(p.slug + ': thiếu lỗi hay mắc');
    if (d.point.useNot.some(u => !u.what || !u.why)) flaws.push(p.slug + ': mục "không dùng" thiếu lý do');
    if (d.point.errors.some(e => !e.wrong || !e.right || !e.why)) flaws.push(p.slug + ': lỗi thiếu câu sửa hoặc lý do');
    if (d.point.confuse.some(c => !c.with || !c.tell || !c.pair || c.pair.length !== 2)) {
      flaws.push(p.slug + ': cặp phân biệt không đủ hai câu');
    }
    if (d.examples.some(x => !x.en || !x.vi)) flaws.push(p.slug + ': ví dụ thiếu song ngữ');
    if (d.practice.some(x => !x.en || !x.vi || !x.answer)) flaws.push(p.slug + ': câu luyện thiếu nghĩa Việt hoặc đáp án');

    /* Phản ví dụ phải có ghi chú, nếu không người học chỉ thấy câu sai mà không biết sửa sao */
    if (d.examples.some(x => !x.ok && !x.note)) flaws.push(p.slug + ': phản ví dụ không có cách sửa');
    if (!d.examples.some(x => !x.ok)) flaws.push(p.slug + ': không có phản ví dụ nào');

    /* Số chỗ trống phải khớp số phần đáp án — bắt lỗi gõ nhầm trong dữ liệu */
    const gapMismatch = d.practice.filter(x =>
      (x.en.match(/___/g) || []).length !== x.answer.split('…').length);
    if (gapMismatch.length) flaws.push(p.slug + ': ' + gapMismatch.length + ' câu luyện lệch chỗ trống/đáp án');
  }
  ok(exTotal === 96, 'Tổng 96 câu ví dụ (' + exTotal + ')');
  ok(prTotal === 144, 'Tổng 144 câu luyện tập (' + prTotal + ')');
  ok(flaws.length === 0, 'Mọi thì đủ bốn lát cắt và dữ liệu sạch' +
    (flaws.length ? ' — ' + flaws.slice(0, 6).join('; ') : ''));

  /* Kiểm điểm nội dung học thuật ở chỗ dễ sai nhất */
  const pp = await get('/api/learn/grammar/present-perfect');
  ok(pp.point.confuse.some(c => /quá khứ đơn/i.test(c.with)),
    'Hiện tại hoàn thành có đối chiếu với quá khứ đơn — lỗi kinh điển của người Việt');
  ok(pp.point.useNot.some(u => /yesterday|mốc/i.test(u.what + u.why)),
    'Hiện tại hoàn thành cảnh báo không dùng với mốc quá khứ xác định');

  const pc = await get('/api/learn/grammar/present-continuous');
  ok(pc.point.useNot.some(u => /trạng thái/i.test(u.what + u.why)),
    'Hiện tại tiếp diễn cảnh báo động từ trạng thái');

  const fs = await get('/api/learn/grammar/future-simple');
  ok(fs.point.useNot.some(u => /if|when|điều kiện|thời gian/i.test(u.what + u.why)),
    'Tương lai đơn cảnh báo không dùng "will" trong mệnh đề if/when');

  /* ============ 4. Ngữ pháp: danh từ, mạo từ, lượng từ ============ */
  console.log('\n\x1b[1m== API ngữ pháp (danh từ, mạo từ, lượng từ) ==\x1b[0m');

  const nn = await get('/api/learn/grammar?grp=noun');
  ok(nn.count === 28, 'Có đủ 28 điểm A1–C2 (' + nn.count + ')');
  ok(nn.points.every(p => p.grp === 'noun'), 'Lọc theo nhóm trả đúng nhóm');

  /* Bám sát hạn mức A1 8 · A2 6 · B1 5 · B2 4 · C1 3 · C2 2 trong docs/LEARNING.md.
     Đây là chốt chặn cho ràng buộc "không tự nâng số lượng để cho nhiều". */
  const byLevel = nn.points.reduce((a, p) => (a[p.level] = (a[p.level] || 0) + 1, a), {});
  const QUOTA = { A1: 8, A2: 6, B1: 5, B2: 4, C1: 3, C2: 2 };
  const lech = Object.keys(QUOTA).filter(l => byLevel[l] !== QUOTA[l]);
  ok(lech.length === 0, 'Đúng hạn mức từng bậc theo bảng phân bậc' +
    (lech.length ? ' (lệch: ' + lech.map(l => l + ' ' + (byLevel[l] || 0) + '/' + QUOTA[l]).join(', ') + ')' : ''));

  /* Thứ tự hiển thị phải đi từ bậc thấp lên bậc cao, không cài răng lược */
  const bacSo = { A1: 1, A2: 2, B1: 3, B2: 4, C1: 5, C2: 6 };
  const daSap = nn.points.every((p, i) => i === 0 || bacSo[p.level] >= bacSo[nn.points[i - 1].level]);
  ok(daSap, 'Danh sách xếp từ bậc thấp lên bậc cao');

  ok(nn.points.every(p => formRows(p).length >= 2), 'Mọi điểm có ít nhất hai dòng công thức');
  ok(nn.points.every(p => p.counts.example === 6), 'Mỗi điểm có đúng 6 câu ví dụ');
  ok(nn.points.every(p => p.counts.practice === 10), 'Mỗi điểm có đúng 10 câu luyện tập');

  /* Hai nhóm phải tách bạch, không lẫn vào nhau */
  const allGrammar = await get('/api/learn/grammar');
  ok(allGrammar.count === 161, 'Tổng bảy nhóm là 161 điểm (' + allGrammar.count + ')');
  ok(allGrammar.groups.some(g => g.id === 'tense' && g.count === 12) &&
     allGrammar.groups.some(g => g.id === 'noun' && g.count === 28) &&
     allGrammar.groups.some(g => g.id === 'modal' && g.count === 29) &&
     allGrammar.groups.some(g => g.id === 'conditional' && g.count === 20) &&
     allGrammar.groups.some(g => g.id === 'passive' && g.count === 22) &&
     allGrammar.groups.some(g => g.id === 'clause' && g.count === 29) &&
     allGrammar.groups.some(g => g.id === 'emphasis' && g.count === 21),
    'Thống kê theo nhóm đúng: tense 12, noun 28, modal 29, conditional 20, passive 22, clause 29, emphasis 21');
  ok(new Set(allGrammar.points.map(p => p.slug)).size === allGrammar.count,
    'Không có slug trùng giữa các nhóm');

  let nExTotal = 0, nPrTotal = 0;
  const nFlaws = [];
  for (const p of nn.points) {
    const d = await get('/api/learn/grammar/' + p.slug);
    nExTotal += d.examples.length;
    nPrTotal += d.practice.length;

    if (!d.point.useWhen.length) nFlaws.push(p.slug + ': thiếu "dùng khi nào"');
    if (!d.point.useNot.length) nFlaws.push(p.slug + ': thiếu "KHÔNG dùng khi nào"');
    if (!d.point.confuse.length) nFlaws.push(p.slug + ': thiếu phần phân biệt');
    if (!d.point.errors.length) nFlaws.push(p.slug + ': thiếu lỗi hay mắc');
    if (d.point.useNot.some(u => !u.what || !u.why)) nFlaws.push(p.slug + ': mục "không dùng" thiếu lý do');
    if (d.point.errors.some(e => !e.wrong || !e.right || !e.why)) nFlaws.push(p.slug + ': lỗi thiếu câu sửa hoặc lý do');
    if (d.point.confuse.some(c => !c.with || !c.tell || !c.pair || c.pair.length !== 2)) {
      nFlaws.push(p.slug + ': cặp phân biệt không đủ hai câu');
    }
    if (d.examples.some(x => !x.en || !x.vi)) nFlaws.push(p.slug + ': ví dụ thiếu song ngữ');
    if (d.practice.some(x => !x.en || !x.vi || !x.answer)) nFlaws.push(p.slug + ': câu luyện thiếu nghĩa Việt hoặc đáp án');
    if (d.examples.some(x => !x.ok && !x.note)) nFlaws.push(p.slug + ': phản ví dụ không có cách sửa');
    if (d.examples.filter(x => !x.ok).length < 2) nFlaws.push(p.slug + ': chưa đủ hai phản ví dụ');

    const gapMismatch = d.practice.filter(x =>
      (x.en.match(/___/g) || []).length !== x.answer.split('…').length);
    if (gapMismatch.length) nFlaws.push(p.slug + ': ' + gapMismatch.length + ' câu luyện lệch chỗ trống/đáp án');
  }
  ok(nExTotal === 168, 'Tổng 168 câu ví dụ (' + nExTotal + ')');
  ok(nPrTotal === 280, 'Tổng 280 câu luyện tập (' + nPrTotal + ')');
  ok(nFlaws.length === 0, 'Mọi điểm đủ lát cắt và dữ liệu sạch' +
    (nFlaws.length ? ' — ' + nFlaws.slice(0, 6).join('; ') : ''));

  /* Kiểm đúng những chỗ người Việt sai nhiều nhất */
  const aAn = await get('/api/learn/grammar/article-a-an');
  ok(aAn.point.formula.note && /âm/i.test(aAn.point.formula.note),
    'Mục a/an nhấn mạnh chọn theo ÂM chứ không theo chữ cái');
  ok(aAn.examples.some(x => /an hour/i.test(x.en)) && aAn.examples.some(x => /a university/i.test(x.en)),
    'Mục a/an có cả hai ca bẫy: "an hour" và "a university"');

  const zero = await get('/api/learn/grammar/article-zero');
  ok(zero.point.confuse.some(c => /school/i.test(c.tell + JSON.stringify(c.pair))),
    'Mục zero article phân biệt "go to school" với "go to the school"');

  const count = await get('/api/learn/grammar/noun-countability');
  ok(count.point.formula.note && /information|advice/i.test(count.point.formula.note),
    'Mục đếm được liệt kê danh từ tiếng Việt đếm được nhưng tiếng Anh thì không');

  const there = await get('/api/learn/grammar/there-is-there-are');
  ok(there.point.errors.some(e => /have/i.test(e.wrong)),
    'Mục There is/are cảnh báo lỗi dịch thẳng "trong phòng có" thành "have"');

  /* Bậc cao: kiểm mấy chỗ chính bậc C1–C2 tồn tại là để dạy */
  const fewLittle = await get('/api/learn/grammar/few-little');
  ok(fewLittle.point.formula.note && /quite a few/i.test(fewLittle.point.formula.note),
    'Mục few/little cảnh báo bẫy ngược nghĩa "quite a few"');
  ok(fewLittle.point.confuse.length >= 2, 'Mục few/little có ít nhất hai cặp phân biệt');

  const agree = await get('/api/learn/grammar/quantifier-agreement');
  const agreeText = JSON.stringify(agree.point);
  ok(/a number of/i.test(agreeText) && /the number of/i.test(agreeText),
    'Mục hoà hợp chủ ngữ đối chiếu "a number of" với "the number of"');
  ok(agree.practice.some(x => /the number of/i.test(x.en) && /^has$/i.test(x.answer)),
    'Có câu luyện chốt "the number of" đi với động từ số ít');

  const acaZero = await get('/api/learn/grammar/article-academic-zero');
  ok(acaZero.point.formula.note && /bổ nghĩa/i.test(acaZero.point.formula.note),
    'Mục zero article học thuật nêu quy tắc "có bổ nghĩa thì phải có the"');

  const nomin = await get('/api/learn/grammar/nominalisation');
  ok(nomin.point.useNot.some(u => /lạm dụng|cả đoạn/i.test(u.what + u.why)),
    'Mục danh từ hoá cảnh báo lạm dụng, không chỉ dạy cách dùng');

  /* ============ 5. Ngữ pháp: động từ khuyết thiếu ============ */
  console.log('\n\x1b[1m== API ngữ pháp (động từ khuyết thiếu) ==\x1b[0m');

  const md = await get('/api/learn/grammar?grp=modal');
  ok(md.count === 29, 'Nhóm khuyết thiếu đủ 29 điểm A1–C2 (' + md.count + ')');
  ok(md.points.every(p => p.grp === 'modal'), 'Lọc theo nhóm trả đúng nhóm');

  /* Hạn mức của nhóm này là A1 ×3, A2 ×5, B1 ×6 */
  const mdLevel = md.points.reduce((a, p) => (a[p.level] = (a[p.level] || 0) + 1, a), {});
  const MD_QUOTA = { A1: 3, A2: 5, B1: 6, B2: 6, C1: 5, C2: 4 };
  const mdLech = Object.keys(MD_QUOTA).filter(l => mdLevel[l] !== MD_QUOTA[l]);
  ok(mdLech.length === 0, 'Đúng hạn mức A1 3, A2 5, B1 6, B2 6, C1 5, C2 4' +
    (mdLech.length ? ' (lệch: ' + mdLech.map(l => l + ' ' + (mdLevel[l] || 0)).join(', ') + ')' : ''));
  const mdBac = { A1: 1, A2: 2, B1: 3, B2: 4, C1: 5, C2: 6 };
  ok(md.points.every((p, i) => i === 0 || mdBac[p.level] >= mdBac[md.points[i - 1].level]),
    'Nhóm khuyết thiếu xếp từ bậc thấp lên bậc cao');
  ok(md.points.every(p => p.counts.example === 6 && p.counts.practice === 10),
    'Mỗi điểm đủ 6 ví dụ và 10 câu luyện');

  let mdFlaws = [];
  for (const p of md.points) {
    const d = await get('/api/learn/grammar/' + p.slug);
    if (!d.point.useNot.length) mdFlaws.push(p.slug + ': thiếu "KHÔNG dùng khi nào"');
    if (!d.point.confuse.length) mdFlaws.push(p.slug + ': thiếu phần phân biệt');
    if (!d.point.errors.length) mdFlaws.push(p.slug + ': thiếu lỗi hay mắc');
    if (d.examples.filter(x => !x.ok).length < 2) mdFlaws.push(p.slug + ': chưa đủ hai phản ví dụ');
    if (d.examples.some(x => !x.ok && !x.note)) mdFlaws.push(p.slug + ': phản ví dụ không có cách sửa');
  }
  ok(mdFlaws.length === 0, 'Mọi điểm đủ lát cắt' +
    (mdFlaws.length ? ' — ' + mdFlaws.slice(0, 6).join('; ') : ''));

  /* Cặp bị nhầm nhiều nhất cả nhóm phải được dạy tử tế */
  const mustHave = await get('/api/learn/grammar/must-vs-have-to');
  const mhText = JSON.stringify(mustHave.point);
  ok(/CẤM/.test(mhText) && /KHÔNG CẦN/.test(mhText),
    'Mục must khác have to nói rõ mustn\'t là CẤM còn don\'t have to là KHÔNG CẦN');

  const deduce = await get('/api/learn/grammar/deduction-present');
  ok(deduce.point.useNot.some(u => /can't|cant/i.test(u.what + u.why)),
    'Mục suy đoán cảnh báo phủ định phải dùng "can\'t" chứ không phải "mustn\'t"');

  const ableTo = await get('/api/learn/grammar/ability-across-tenses');
  ok(/will can/i.test(JSON.stringify(ableTo.point)),
    'Mục be able to cảnh báo lỗi ghép hai động từ khuyết thiếu "will can"');

  const usedTo = await get('/api/learn/grammar/used-to-would');
  ok(usedTo.point.confuse.some(c => /be used to/i.test(c.with + c.tell)),
    'Mục used to phân biệt với "be used to"');

  /* ============ 5b. Ngữ pháp: câu điều kiện ============ */
  console.log('\n\x1b[1m== API ngữ pháp (câu điều kiện) ==\x1b[0m');

  const cd = await get('/api/learn/grammar?grp=conditional');
  ok(cd.count === 20, 'Nhóm điều kiện đủ 20 điểm A2–C2 (' + cd.count + ')');
  const cdLevel = cd.points.reduce((a, p) => (a[p.level] = (a[p.level] || 0) + 1, a), {});
  const CD_QUOTA = { A2: 2, B1: 4, B2: 5, C1: 5, C2: 4 };
  const cdLech = Object.keys(CD_QUOTA).filter(l => cdLevel[l] !== CD_QUOTA[l]);
  ok(cdLech.length === 0, 'Đúng hạn mức A2 2, B1 4, B2 5, C1 5, C2 4' +
    (cdLech.length ? ' (lệch: ' + cdLech.map(l => l + ' ' + (cdLevel[l] || 0)).join(', ') + ')' : ''));
  const cdBac = { A1: 1, A2: 2, B1: 3, B2: 4, C1: 5, C2: 6 };
  ok(cd.points.every((p, i) => i === 0 || cdBac[p.level] >= cdBac[cd.points[i - 1].level]),
    'Nhóm điều kiện xếp từ bậc thấp lên bậc cao');
  ok(cd.points.every(p => p.counts.example === 6 && p.counts.practice === 10),
    'Mỗi điểm đủ 6 ví dụ và 10 câu luyện');

  /* Hai lỗi kinh điển của nhóm này phải được cảnh báo tử tế */
  const loai1 = await get('/api/learn/grammar/conditional-first');
  ok(loai1.point.errors.some(e => /will/i.test(e.wrong)),
    'Loại 1 cảnh báo không đặt "will" vào mệnh đề if');
  const loai3 = await get('/api/learn/grammar/conditional-third');
  ok(loai3.point.errors.some(e => /would have known|would/i.test(e.wrong)),
    'Loại 3 cảnh báo không đặt "would" vào mệnh đề if');

  const unless = await get('/api/learn/grammar/unless-and-conjunctions');
  ok(unless.point.errors.some(e => /do not|not/i.test(e.wrong)),
    'Mục unless cảnh báo lỗi phủ định hai lần');
  ok(unless.point.confuse.some(c => /in case/i.test(c.with)),
    'Mục unless phân biệt "in case" với "if"');

  const honHop = await get('/api/learn/grammar/mixed-conditionals');
  ok(/now|today/i.test(JSON.stringify(honHop.point)),
    'Mục điều kiện hỗn hợp nêu dấu hiệu mốc thời gian "now"');

  /* Bậc cao: điều kiện không còn chữ "if" — chỗ người học hay đọc lướt qua */
  const daoNgu = await get('/api/learn/grammar/conditional-inversion');
  ok(daoNgu.point.useNot.some(u => /if/i.test(u.what + u.why)),
    'Mục đảo ngữ cảnh báo phải bỏ hẳn chữ "if"');
  const giaDinh = await get('/api/learn/grammar/mandative-subjunctive');
  ok(/suggest/i.test(JSON.stringify(giaDinh.point)),
    'Mục thức giả định nêu nhóm động từ dẫn như "suggest"');
  const ngam = await get('/api/learn/grammar/implied-conditionals');
  ok(/would/i.test(JSON.stringify(ngam.point.formula)),
    'Mục điều kiện ngầm chỉ ra "would" là dấu hiệu nhận biết');

  /* ============ 5c. Ngữ pháp: bị động và tường thuật ============ */
  console.log('\n\x1b[1m== API ngữ pháp (bị động, tường thuật) ==\x1b[0m');

  const bd = await get('/api/learn/grammar?grp=passive');
  ok(bd.count === 22, 'Đủ 22 điểm bậc A2–C2 theo hạn mức (' + bd.count + ')');
  const bdLevel = bd.points.reduce((a, p) => (a[p.level] = (a[p.level] || 0) + 1, a), {});
  const BD_QUOTA = { A2: 2, B1: 5, B2: 6, C1: 5, C2: 4 };
  const bdLech = Object.keys(BD_QUOTA).filter(l => bdLevel[l] !== BD_QUOTA[l]);
  ok(bdLech.length === 0, 'Đúng hạn mức A2 2, B1 5, B2 6, C1 5, C2 4' +
    (bdLech.length ? ' (lệch: ' + bdLech.map(l => l + ' ' + (bdLevel[l] || 0) + '/' + BD_QUOTA[l]).join(', ') + ')' : ''));
  ok(bd.points.every(p => p.counts.example === 6 && p.counts.practice === 10),
    'Mỗi điểm đủ 6 ví dụ và 10 câu luyện');

  /* Hai tệp dữ liệu ghép lại phải liền mạch bậc, không cài răng lược */
  const bacBd = { A2: 2, B1: 3, B2: 4, C1: 5, C2: 6 };
  ok(bd.points.every((p, i) => i === 0 || bacBd[p.level] >= bacBd[bd.points[i - 1].level]),
    'Hai tệp A2–B2 và C1–C2 ghép liền mạch, xếp từ bậc thấp lên cao');

  /* Ba lỗi kinh điển của nhóm này phải được cảnh báo */
  const bdCoBan = await get('/api/learn/grammar/passive-basic');
  ok(bdCoBan.point.useNot.some(u => /nội động từ/i.test(u.what + u.why)),
    'Bị động cơ bản cảnh báo nội động từ không có dạng bị động');
  const cauHoi = await get('/api/learn/grammar/reported-questions');
  ok(cauHoi.point.useNot.some(u => /đảo ngữ/i.test(u.what + u.why)),
    'Câu hỏi tường thuật cảnh báo bỏ đảo ngữ');
  const noiTuongThuat = await get('/api/learn/grammar/reported-statements');
  ok(/said me|say/i.test(JSON.stringify(noiTuongThuat.point.errors)),
    'Mục tường thuật cảnh báo lỗi "say me"');
  const nhoLam = await get('/api/learn/grammar/have-get-done');
  ok(nhoLam.point.confuse.some(c => /tự làm/i.test(c.with + c.tell)),
    'Mục have/get done phân biệt tự làm với nhờ người làm');

  /* Bậc C1–C2: những bài học cốt lõi, mất đi thì mục đó thành vô nghĩa */
  const triGiac = await get('/api/learn/grammar/passive-perception-causative');
  ok(/was made to sign|made to sign/i.test(JSON.stringify(triGiac.point.errors)),
    'Động từ tri giác và sai khiến cảnh báo lỗi bỏ "to" khi sang bị động');

  const thereSaid = await get('/api/learn/grammar/there-said-to-be');
  ok(thereSaid.point.useNot.some(u => /There is said that/i.test(u.what + u.why)),
    'Mục "there is said to be" cảnh báo không được viết "There is said that…"');
  ok(/There are believed/i.test(JSON.stringify(thereSaid.point.errors)),
    'Mục "there is said to be" bắt lỗi hoà hợp số nhiều');

  const sacThai = await get('/api/learn/grammar/reporting-verb-stance');
  ok(sacThai.point.confuse.some(c => /point out/i.test(c.with + c.tell) && /claim/i.test(c.with + c.tell)),
    'Động từ tường thuật phân biệt "point out" đồng tình với "claim" nghi ngờ');

  const tuDo = await get('/api/learn/grammar/free-indirect-speech');
  ok(tuDo.point.level === 'C2' && /ngôi thứ ba/i.test(JSON.stringify(tuDo.point)),
    'Tường thuật gián tiếp tự do là bậc C2 và nêu rõ dùng ngôi thứ ba');

  const phapLy = await get('/api/learn/grammar/reported-legal');
  ok(phapLy.point.useNot.some(u => /shall/i.test(u.what + u.why) && /tương lai/i.test(u.what + u.why)),
    'Mục pháp lý cảnh báo "shall" là nghĩa vụ chứ không phải thì tương lai');

  const giauTacNhan = await get('/api/learn/grammar/passive-agent-deletion');
  ok(/by/i.test(giauTacNhan.point.formula.note) && /chính đáng|né/i.test(JSON.stringify(giauTacNhan.point)),
    'Mục giấu tác nhân có phép thử thêm "by…" để tách bị động chính đáng với né tránh');

  const danhTuTT = await get('/api/learn/grammar/reporting-nouns');
  ok(danhTuTT.point.useNot.some(u => /which/i.test(u.what + u.why)),
    'Danh từ tường thuật cảnh báo không thay "that" bằng "which"');

  /* ============ 5d. Ngữ pháp: mệnh đề quan hệ và mệnh đề phụ ============ */
  console.log('\n\x1b[1m== API ngữ pháp (mệnh đề quan hệ, mệnh đề phụ) ==\x1b[0m');

  const mq = await get('/api/learn/grammar?grp=clause');
  ok(mq.count === 29, 'Đủ 29 điểm bậc A2–C2 theo hạn mức (' + mq.count + ')');
  const mqLevel = mq.points.reduce((a, p) => (a[p.level] = (a[p.level] || 0) + 1, a), {});
  const MQ_QUOTA = { A2: 3, B1: 6, B2: 8, C1: 7, C2: 5 };
  const mqLech = Object.keys(MQ_QUOTA).filter(l => mqLevel[l] !== MQ_QUOTA[l]);
  ok(mqLech.length === 0, 'Đúng hạn mức A2 3, B1 6, B2 8, C1 7, C2 5' +
    (mqLech.length ? ' (lệch: ' + mqLech.map(l => l + ' ' + (mqLevel[l] || 0) + '/' + MQ_QUOTA[l]).join(', ') + ')' : ''));
  ok(mq.points.every(p => p.counts.example === 6 && p.counts.practice === 10),
    'Mỗi điểm đủ 6 ví dụ và 10 câu luyện');
  const bacMq = { A2: 2, B1: 3, B2: 4, C1: 5, C2: 6 };
  ok(mq.points.every((p, i) => i === 0 || bacMq[p.level] >= bacMq[mq.points[i - 1].level]),
    'Ba tệp A2–B1, B2 và C1–C2 ghép liền mạch, xếp từ bậc thấp lên cao');

  /* Hai cặp liên từ ghép đôi là lỗi đặc trưng của người Việt — phải cảnh báo cả hai.
     Đây là lý do chính để tách riêng hai điểm này, mất đi là mục đó hụt mất trọng tâm. */
  const nguyenNhan = await get('/api/learn/grammar/adverbial-reason-basic');
  ok(nguyenNhan.point.useNot.some(u => /because/i.test(u.what + u.why) && /\bso\b/i.test(u.what + u.why)),
    'Mệnh đề nguyên nhân cảnh báo lỗi ghép đôi "Because… so…"');
  ok(nguyenNhan.point.confuse.some(c => /because of/i.test(c.with + c.tell)),
    'Mệnh đề nguyên nhân phân biệt "because" với "because of"');

  const nhuongBo = await get('/api/learn/grammar/adverbial-concession');
  ok(nhuongBo.point.useNot.some(u => /although/i.test(u.what + u.why) && /\bbut\b/i.test(u.what + u.why)),
    'Mệnh đề nhượng bộ cảnh báo lỗi ghép đôi "Although… but…"');
  ok(nhuongBo.point.useNot.some(u => /despite/i.test(u.what + u.why)),
    'Mệnh đề nhượng bộ cảnh báo "despite" không đi với mệnh đề');

  const daiTu = await get('/api/learn/grammar/relative-who-which-that');
  ok(/who he lives|he lives next door/i.test(JSON.stringify(daiTu.point.errors)),
    'Đại từ quan hệ cảnh báo lỗi lặp lại đại từ sau "who"');

  const thoiGian = await get('/api/learn/grammar/adverbial-time-basic');
  ok(thoiGian.point.useNot.some(u => /will/i.test(u.what + u.why)),
    'Mệnh đề thời gian cảnh báo không dùng "will" sau when / until');

  const xacDinh = await get('/api/learn/grammar/relative-defining-nondefining');
  ok(xacDinh.point.useNot.some(u => /that/i.test(u.what + u.why)),
    'Mệnh đề không xác định cảnh báo không dùng "that"');
  ok(xacDinh.point.confuse.some(c => c.pair.some(s => /^My sister who/.test(s.en)) &&
                                     c.pair.some(s => /^My sister, who/.test(s.en))),
    'Cặp phân biệt cho thấy dấu phẩy đổi nghĩa cả câu');

  const luocBo = await get('/api/learn/grammar/relative-omit-object');
  ok(luocBo.point.useNot.some(u => /chủ ngữ/i.test(u.what + u.why)),
    'Mục lược bỏ đại từ cảnh báo không bỏ khi nó làm chủ ngữ');

  const mucDich = await get('/api/learn/grammar/adverbial-purpose');
  ok(mucDich.point.useNot.some(u => /for/i.test(u.what + u.why) && /ing/i.test(u.what + u.why)),
    'Mệnh đề mục đích phân biệt "to + V" với "for + V-ing"');

  /* Bậc B2: bốn lỗi đặc trưng, mỗi lỗi có một điểm riêng lo — mất cảnh báo là mục đó hụt trọng tâm */
  const rutGon = await get('/api/learn/grammar/relative-reduced');
  ok(rutGon.point.useNot.some(u => /tân ngữ/i.test(u.what + u.why)),
    'Rút gọn mệnh đề quan hệ cảnh báo không rút khi đại từ làm tân ngữ');

  const gioiTu = await get('/api/learn/grammar/relative-preposition');
  ok(gioiTu.point.useNot.some(u => /that/i.test(u.what + u.why)) &&
     gioiTu.point.useNot.some(u => /whom/i.test(u.what + u.why)),
    'Giới từ + đại từ quan hệ cấm cả "that" lẫn "who" sau giới từ');

  const luongTu = await get('/api/learn/grammar/relative-quantifier');
  ok(luongTu.point.useNot.some(u => /them/i.test(u.what + u.why)),
    'Lượng từ trong mệnh đề quan hệ cảnh báo lỗi dùng "them" thay "whom"');

  const whichCaMenhDe = await get('/api/learn/grammar/relative-which-clause');
  ok(whichCaMenhDe.point.useNot.some(u => /what/i.test(u.what + u.why)),
    'Mục "which thay cả mệnh đề" cảnh báo không dùng "what"');
  ok(whichCaMenhDe.point.confuse.some(c => /phẩy/i.test(c.with + c.tell)),
    'Mục "which thay cả mệnh đề" cho thấy thiếu dấu phẩy là đổi nghĩa');

  const doiChieu = await get('/api/learn/grammar/adverbial-contrast');
  ok(doiChieu.point.confuse.some(c => /whereas/i.test(c.with + c.tell) && /although/i.test(c.with + c.tell)),
    'Mệnh đề đối chiếu phân biệt "whereas" với "although"');

  const cachThuc = await get('/api/learn/grammar/adverbial-manner');
  ok(cachThuc.point.useNot.some(u => /like/i.test(u.what + u.why)),
    'Mệnh đề cách thức cảnh báo "like" không dùng làm liên từ trong văn trang trọng');

  const nhomEver = await get('/api/learn/grammar/adverbial-ever');
  ok(nhomEver.point.useNot.some(u => /however/i.test(u.what + u.why)),
    'Nhóm "-ever" cảnh báo trật tự sai sau "however"');
  ok(/However hard he tried/.test(JSON.stringify(nhomEver.point.errors)),
    'Nhóm "-ever" nêu đúng câu sửa "However hard he tried"');

  const danhNgu = await get('/api/learn/grammar/noun-clause-what-whether');
  ok(danhNgu.point.useNot.some(u => /giới từ/i.test(u.what + u.why) && /whether/i.test(u.what + u.why)),
    'Mệnh đề danh ngữ cảnh báo sau giới từ phải dùng "whether"');
  ok(danhNgu.point.confuse.some(c => /what/i.test(c.with + c.tell) && /that/i.test(c.with + c.tell)),
    'Mệnh đề danh ngữ phân biệt "what" với "that"');

  /* Bậc C1–C2: lỗi phân từ treo là trục chính, phải xuất hiện ở cả ba mục liên quan */
  const phanTu = await get('/api/learn/grammar/participle-clause-adverbial');
  ok(phanTu.point.useNot.some(u => /treo/i.test(u.what + u.why)),
    'Mệnh đề phân từ cảnh báo lỗi phân từ treo');
  ok(/building came into view/i.test(JSON.stringify(phanTu.point.errors)),
    'Mệnh đề phân từ nêu đúng ví dụ phân từ treo kinh điển');

  const luocBoPhu = await get('/api/learn/grammar/ellipsis-subordinate');
  ok(luocBoPhu.point.useNot.some(u => /chủ ngữ/i.test(u.what + u.why)),
    'Lược bỏ trong mệnh đề phụ cảnh báo hai chủ ngữ phải trùng nhau');

  const tuyetDoi = await get('/api/learn/grammar/absolute-construction');
  ok(tuyetDoi.point.confuse.some(c => /chủ ngữ riêng/i.test(c.with + c.tell)),
    'Cấu trúc tuyệt đối phân biệt với mệnh đề phân từ bằng chủ ngữ riêng');

  const ketQua = await get('/api/learn/grammar/result-clause');
  ok(ketQua.point.confuse.some(c => /kết quả/i.test(c.with + c.tell) && /mục đích/i.test(c.with + c.tell)),
    'Mệnh đề kết quả phân biệt "so…that" với "so that" mục đích');

  const chuNguGia = await get('/api/learn/grammar/extraposition-it');
  ok(chuNguGia.point.useNot.some(u => /chủ ngữ/i.test(u.what + u.why)),
    'Chủ ngữ giả "it" cảnh báo không được bỏ "it" ở đầu câu');

  const forTo = await get('/api/learn/grammar/for-to-clause');
  ok(forTo.point.useNot.some(u => /sở hữu/i.test(u.what + u.why)),
    'Mệnh đề "for + to-V" cảnh báo dùng đại từ tân ngữ, không dùng sở hữu');

  const deThuong = await get('/api/learn/grammar/clause-in-case');
  ok(deThuong.point.confuse.some(c => /in case/i.test(c.with + c.tell) && /\bif\b/i.test(c.with + c.tell)),
    'Mục "in case" phân biệt đề phòng với điều kiện "if"');
  ok(deThuong.point.useNot.some(u => /will/i.test(u.what + u.why)),
    'Mục "in case" cảnh báo không dùng "will" sau nó');

  const asHocThuat = await get('/api/learn/grammar/as-clause-academic');
  ok(asHocThuat.point.useNot.some(u => /\bit\b/i.test(u.what + u.why)),
    'Mệnh đề "as" học thuật cảnh báo không chen "it" vào giữa');

  const wherebyC2 = await get('/api/learn/grammar/relative-whereby');
  ok(wherebyC2.point.useNot.some(u => /whereby/i.test(u.what + u.why)),
    'Mục "whereby" cảnh báo nó không mang nghĩa nơi chốn');

  const tachXa = await get('/api/learn/grammar/relative-postponed');
  ok(tachXa.point.useNot.some(u => /danh từ/i.test(u.what + u.why)),
    'Mệnh đề tách xa cảnh báo danh từ khác chen vào gây hiểu nhầm');

  const nhuongBoTrangTrong = await get('/api/learn/grammar/concessive-formal');
  ok(nhuongBoTrangTrong.point.useNot.some(u => /\bbut\b/i.test(u.what + u.why)),
    'Nhượng bộ trang trọng vẫn cấm ghép đôi với "but"');
  ok(/Try as he might/.test(JSON.stringify(nhuongBoTrangTrong.point.errors)),
    'Nhượng bộ trang trọng giữ nguyên cụm cố định "Try as he might"');

  const ganNham = await get('/api/learn/grammar/clause-attachment');
  ok(ganNham.point.confuse.some(c => /hai nghĩa/i.test(c.with + c.tell)),
    'Mục gắn nhầm chỗ nêu rõ vấn đề là câu hiểu hai nghĩa');

  /* ============ 5e. Ngữ pháp: đảo ngữ, nhấn mạnh, câu chẻ ============ */
  console.log('\n\x1b[1m== API ngữ pháp (đảo ngữ, nhấn mạnh, câu chẻ) ==\x1b[0m');

  const nm = await get('/api/learn/grammar?grp=emphasis');
  ok(nm.count === 21, 'Đủ 21 điểm bậc B1–C2 theo hạn mức (' + nm.count + ')');
  const nmLevel = nm.points.reduce((a, p) => (a[p.level] = (a[p.level] || 0) + 1, a), {});
  const NM_QUOTA = { B1: 2, B2: 5, C1: 7, C2: 7 };
  const nmLech = Object.keys(NM_QUOTA).filter(l => nmLevel[l] !== NM_QUOTA[l]);
  ok(nmLech.length === 0, 'Đúng hạn mức B1 2, B2 5, C1 7, C2 7' +
    (nmLech.length ? ' (lệch: ' + nmLech.map(l => l + ' ' + (nmLevel[l] || 0) + '/' + NM_QUOTA[l]).join(', ') + ')' : ''));
  ok(nm.points.every(p => p.counts.example === 6 && p.counts.practice === 10),
    'Mỗi điểm đủ 6 ví dụ và 10 câu luyện');
  const bacNm = { B1: 3, B2: 4, C1: 5, C2: 6 };
  ok(nm.points.every((p, i) => i === 0 || bacNm[p.level] >= bacNm[nm.points[i - 1].level]),
    'Hai tệp B1–C1 và C2 ghép liền mạch, xếp từ bậc thấp lên cao');

  /* Trục chính của nhóm: đảo hay không đảo. Hai mục phải đối chiếu được với nhau,
     mất một trong hai thì người học không có chỗ nào phân biệt được luật ngược nhau. */
  const daoPhuDinh = await get('/api/learn/grammar/negative-inversion-basic');
  ok(/Never have I/.test(JSON.stringify(daoPhuDinh.point.errors)),
    'Đảo ngữ phủ định nêu đúng câu sửa "Never have I…"');
  const khongDao = await get('/api/learn/grammar/fronting-no-inversion');
  ok(khongDao.point.confuse.some(c => /tân ngữ/i.test(c.with + c.tell) && /phủ định/i.test(c.with + c.tell)),
    'Mục đưa lên đầu không đảo đối chiếu thẳng với đảo ngữ phủ định');
  ok(khongDao.point.useNot.some(u => /không đảo/i.test(u.what + u.why)),
    'Mục đưa lên đầu cảnh báo không được đảo khi đưa tân ngữ lên trước');

  /* Cặp từ đi kèm của đảo ngữ nâng cao là bẫy C1 kinh điển */
  const daoNangCao = await get('/api/learn/grammar/negative-inversion-advanced');
  ok(daoNangCao.point.useNot.some(u => /than/i.test(u.what + u.why) && /when/i.test(u.what + u.why)),
    'Đảo ngữ nâng cao cảnh báo cặp "No sooner… than" khác "Hardly… when"');

  const daoOnly = await get('/api/learn/grammar/only-inversion');
  ok(daoOnly.point.useNot.some(u => /chủ ngữ/i.test(u.what + u.why)),
    'Đảo ngữ "Only" nêu ngoại lệ khi only bổ nghĩa cho chủ ngữ');

  const cheIt = await get('/api/learn/grammar/it-cleft');
  ok(cheIt.point.useNot.some(u => /that/i.test(u.what + u.why) && /who/i.test(u.what + u.why)),
    'Câu chẻ "It" cảnh báo không được bỏ "that" hay "who"');
  const cheWhat = await get('/api/learn/grammar/wh-cleft');
  ok(cheWhat.point.confuse.some(c => /cuối/i.test(c.with + c.tell) || /đầu/i.test(c.with + c.tell)),
    'Câu chẻ "What" đối chiếu vị trí phần nhấn với câu chẻ "It"');

  const nhanDo = await get('/api/learn/grammar/do-emphasis');
  ok(/did call/.test(JSON.stringify(nhanDo.point.errors)),
    'Nhấn mạnh bằng "do" bắt lỗi chia động từ chính sau "did"');

  const traTuNhan = await get('/api/learn/grammar/emphasis-adverbs');
  ok(traTuNhan.point.useNot.some(u => /whatsoever/i.test(u.what + u.why)),
    'Trạng từ nhấn mạnh cảnh báo "whatsoever" chỉ dùng trong câu phủ định');

  const bienThe = await get('/api/learn/grammar/cleft-variants');
  ok(/All what/.test(JSON.stringify(bienThe.point.errors)),
    'Biến thể câu chẻ bắt lỗi "All what I want"');

  /* Bậc C2: trục chính là phân biệt hai kiểu đảo, và cặp đảo ngữ / câu chẻ cùng nghĩa */
  const haiKieuDao = await get('/api/learn/grammar/inversion-full-vs-auxiliary');
  ok(haiKieuDao.point.confuse.some(c => /toàn phần/i.test(c.with + c.tell) && /trợ động từ/i.test(c.with + c.tell)),
    'Mục hai kiểu đảo phân biệt đảo toàn phần với đảo trợ động từ');
  ok(haiKieuDao.point.useNot.some(u => /đại từ/i.test(u.what + u.why)),
    'Mục hai kiểu đảo cảnh báo đảo toàn phần không dùng với đại từ');

  const phanTuDauCau = await get('/api/learn/grammar/fronting-participle-adjective');
  ok(phanTuDauCau.point.useNot.some(u => /hợp/i.test(u.what + u.why) || /chia động từ/i.test(u.what + u.why)),
    'Mục phân từ đầu câu cảnh báo bẫy hợp số với chủ ngữ ở cuối');
  ok(/Gone are the days/.test(JSON.stringify(phanTuDauCau.point.errors)),
    'Mục phân từ đầu câu nêu đúng câu sửa "Gone are the days"');

  const daoSoSanh = await get('/api/learn/grammar/inversion-comparative');
  ok(daoSoSanh.point.confuse.some(c => /tuỳ chọn/i.test(c.with + c.tell) && /bắt buộc/i.test(c.with + c.tell)),
    'Đảo ngữ so sánh nêu rõ đây là phép đảo tuỳ chọn, khác đảo bắt buộc');

  /* Hai mục dưới đây phải trỏ sang nhau: cùng một ý, hai cách diễn đạt */
  const cheNotUntil = await get('/api/learn/grammar/cleft-not-until');
  ok(cheNotUntil.point.useNot.some(u => /when/i.test(u.what + u.why) && /that/i.test(u.what + u.why)),
    'Câu chẻ phủ định cảnh báo không dùng "when" thay "that"');
  ok(cheNotUntil.point.confuse.some(c => /đảo ngữ/i.test(c.with + c.tell)),
    'Câu chẻ phủ định đối chiếu với bản đảo ngữ cùng nghĩa');
  const daoNotPhrase = await get('/api/learn/grammar/inversion-not-phrases');
  ok(/Not once did she complain/.test(JSON.stringify(daoNotPhrase.point.errors)),
    'Đảo ngữ cụm "Not" nêu đúng câu sửa "Not once did she complain"');

  const noiMach = await get('/api/learn/grammar/fronting-cohesion');
  ok(noiMach.point.useNot.some(u => /chưa biết/i.test(u.what + u.why) || /thông tin mới/i.test(u.what + u.why)),
    'Mục nối mạch cảnh báo không đưa thông tin mới lên đầu câu');

  const phuDinhGianTiep = await get('/api/learn/grammar/emphasis-far-from');
  ok(phuDinhGianTiep.point.useNot.some(u => /anything but/i.test(u.what + u.why)),
    'Mục phủ định gián tiếp cảnh báo không hiểu "anything but" theo nghĩa đen');
  ok(phuDinhGianTiep.point.confuse.some(c => /nothing but/i.test(c.with + c.tell)),
    'Mục phủ định gián tiếp phân biệt "anything but" với "nothing but"');

  /* ============ 6. Chất lượng câu luyện của TOÀN BỘ ngữ pháp ============
     Dấu ngoặc trong câu luyện có hai kiểu, phải tách bạch trước khi kiểm:

       trắc nghiệm  "___ (much / many) sugar"     → đáp án PHẢI là một lựa chọn
       gợi ý chia   "___ (not / live) in Da Nang" → đáp án là dạng đã chia ("don't live")

     Kiểu thứ hai luôn mở đầu bằng một từ gợi ý (not, already, just…), nên bỏ
     qua. Chỉ soi kiểu trắc nghiệm: ở đó nếu đáp án không nằm trong danh sách
     thì học viên chọn kiểu gì cũng sai. Câu nhiều chỗ trống thì soi từng chỗ
     một, ghép theo thứ tự với các phần đáp án ngăn bởi dấu '…'. */
  console.log('\n\x1b[1m== Chất lượng câu luyện toàn bộ ngữ pháp ==\x1b[0m');

  const CUE = ['not', 'already', 'just', 'never', 'always', 'probably', 'ever', 'still'];
  const allPoints = (await get('/api/learn/grammar')).points;
  let lechDapAn = [], soTracNghiem = 0, tongLuyen = 0;

  for (const p of allPoints) {
    const d = await get('/api/learn/grammar/' + p.slug);
    tongLuyen += d.practice.length;
    for (const x of d.practice) {
      const brackets = [...x.en.matchAll(/\(([^)]*)\)/g)].map(m => m[1]);
      const parts = x.answer.split('…').map(s => s.trim());
      if (brackets.length !== parts.length) continue;   // đã có phép kiểm riêng cho lệch số chỗ trống

      brackets.forEach((b, i) => {
        if (!b.includes('/')) return;                    // ngoặc một từ: gợi ý chia, không phải trắc nghiệm
        const opts = b.split('/').map(s => s.trim());
        if (CUE.includes(opts[0].toLowerCase())) return; // gợi ý chia kèm trạng từ
        soTracNghiem++;
        if (!opts.includes(parts[i])) {
          lechDapAn.push(p.slug + ': ' + x.en + ' → ' + parts[i] + ' (chọn: ' + opts.join(' | ') + ')');
        }
      });
    }
  }

  ok(soTracNghiem > 200, 'Có đủ câu trắc nghiệm để phép kiểm này có ý nghĩa (' + soTracNghiem + ')');

  /* Câu tiếng Anh chỉ được chứa chữ Latin, số và dấu câu quen thuộc. Ký tự của
     hệ chữ khác lọt vào do gõ nhầm bảng mã thì mắt thường rất khó thấy giữa một
     nghìn câu, mà lên trang là hiện ra ngay và TTS đọc thành tiếng lạ. */
  const CHU_LATIN = /^[\x20-\x7E‘’“”–—…→]*$/;
  const viTri = s => [...s].filter(c => !CHU_LATIN.test(c)).join('');
  let kyTuLa = [];
  for (const p of allPoints) {
    const d = await get('/api/learn/grammar/' + p.slug);
    const cauAnh = [
      ...d.examples.map(x => x.en),
      ...d.practice.map(x => x.en),
      ...d.point.confuse.flatMap(c => (c.pair || []).map(s => s.en)),
      ...d.point.errors.flatMap(e => [e.wrong, e.right])
    ];
    for (const s of cauAnh) {
      /* Tên riêng tiếng Việt trong câu ví dụ là cố ý, bỏ qua dấu tiếng Việt */
      const la = viTri(s.normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/đ/gi, 'd'));
      if (la) kyTuLa.push(p.slug + ': ' + JSON.stringify(la) + ' trong "' + s + '"');
    }
  }
  ok(kyTuLa.length === 0, 'Câu tiếng Anh không lẫn ký tự của hệ chữ khác' +
    (kyTuLa.length ? ' (' + kyTuLa.length + ' chỗ, ví dụ: ' + kyTuLa[0] + ')' : ''));
  ok(lechDapAn.length === 0, 'Đáp án luôn nằm trong danh sách lựa chọn của câu trắc nghiệm' +
    (lechDapAn.length ? ' (' + lechDapAn.length + ' sai, ví dụ: ' + lechDapAn[0] + ')' : ''));
  ok(tongLuyen === 12 * 12 + 28 * 10 + 29 * 10 + 20 * 10 + 22 * 10 + 29 * 10 + 21 * 10,
    'Tổng câu luyện toàn khu ngữ pháp là ' + (12 * 12 + 28 * 10 + 29 * 10 + 20 * 10 + 22 * 10 + 29 * 10 + 21 * 10) + ' (' + tongLuyen + ')');

  /* ============ 7. Năm trang tự học ============ */
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

  /* --- Trang 12 thì: mở/đóng, tải chi tiết, hiện đáp án --- */
  await page.goto(BASE + '/prep/hoc/thi/', { waitUntil: 'networkidle' });
  await page.waitForSelector('#list article', { timeout: 10000 });
  ok(await page.locator('#list article').count() === 12, 'Trang 12 thì hiện đủ 12 mục');

  /* Chi tiết chỉ tải khi mở ra, không nạp sẵn 240 câu vào trang */
  ok(await page.locator('#list [data-answer]').count() === 0, 'Chưa mở thì chưa tải chi tiết');

  await page.click('[data-toggle="present-perfect"]');
  // state 'attached': đáp án cố tình ẩn cho tới khi bấm hiện, chờ 'visible' sẽ treo
  await page.waitForSelector('#list article[data-slug="present-perfect"] [data-answer]',
    { state: 'attached', timeout: 10000 });
  const card = page.locator('article[data-slug="present-perfect"]');
  ok(await card.locator('[data-answer]').count() === 12, 'Mở ra thấy đủ 12 câu luyện');
  ok(await card.locator('[data-answer]:not([hidden])').count() === 0, 'Đáp án ẩn cho tới khi bấm hiện');

  const body = await card.innerText();
  ok(/KHÔNG dùng khi nào/.test(body), 'Chi tiết có mục "KHÔNG dùng khi nào"');
  ok(/Phân biệt với thì dễ nhầm/.test(body), 'Chi tiết có mục phân biệt');
  ok(/Lỗi người Việt hay mắc/.test(body), 'Chi tiết có mục lỗi hay mắc');

  await card.locator('[data-reveal]').click();
  await page.waitForTimeout(250);
  ok(await card.locator('[data-answer]:not([hidden])').count() === 12, 'Bấm "Hiện tất cả đáp án" thì hiện đủ 12 đáp án');

  await page.click('[data-toggle="present-perfect"]');
  await page.waitForTimeout(250);
  ok(await page.locator('#list [data-answer]').count() === 0, 'Bấm lần nữa thì thu lại');

  /* Lọc theo bậc */
  await page.selectOption('#f-level', 'A1');
  await page.waitForTimeout(300);
  const a1Count = (await get('/api/learn/grammar?grp=tense&level=A1')).count;
  ok(await page.locator('#list article').count() === a1Count,
    'Lọc bậc A1 còn ' + a1Count + ' thì');

  await page.selectOption('#f-level', 'C2');
  await page.waitForTimeout(300);
  ok(await page.locator('#empty:not([hidden])').count() === 1, 'Bậc chưa có thì nào thì hiện trạng thái rỗng');

  /* --- Trang danh từ dùng chung khối PrepGrammar với trang 12 thì --- */
  await page.goto(BASE + '/prep/hoc/danh-tu/', { waitUntil: 'networkidle' });
  await page.waitForSelector('#list article', { timeout: 10000 });
  ok(await page.locator('#list article').count() === 28, 'Trang danh từ hiện đủ 28 mục');

  await page.click('[data-toggle="article-a-an"]');
  await page.waitForSelector('#list article[data-slug="article-a-an"] [data-answer]',
    { state: 'attached', timeout: 10000 });
  const nCard = page.locator('article[data-slug="article-a-an"]');
  ok(await nCard.locator('[data-answer]').count() === 10, 'Mở ra thấy đủ 10 câu luyện');
  const nBody = await nCard.innerText();
  ok(/Ghi nhớ nhanh/.test(nBody), 'Nhãn khối chip đổi theo nhóm thành "Ghi nhớ nhanh"');
  ok(/Phân biệt với mục dễ nhầm/.test(nBody), 'Nhãn khối phân biệt đổi theo nhóm');
  ok(/KHÔNG dùng khi nào/.test(nBody), 'Vẫn có mục "KHÔNG dùng khi nào"');

  await nCard.locator('[data-reveal]').click();
  await page.waitForTimeout(250);
  ok(await nCard.locator('[data-answer]:not([hidden])').count() === 10, 'Nút hiện đáp án chạy đúng ở trang danh từ');

  await page.selectOption('#f-level', 'A1');
  await page.waitForTimeout(300);
  ok(await page.locator('#list article').count() === 8, 'Lọc bậc A1 còn 8 mục');

  /* --- Trang động từ khuyết thiếu --- */
  await page.goto(BASE + '/prep/hoc/khuyet-thieu/', { waitUntil: 'networkidle' });
  await page.waitForSelector('#list article', { timeout: 10000 });
  ok(await page.locator('#list article').count() === 29, 'Trang khuyết thiếu hiện đủ 29 mục');

  await page.click('[data-toggle="must-vs-have-to"]');
  await page.waitForSelector('#list article[data-slug="must-vs-have-to"] [data-answer]',
    { state: 'attached', timeout: 10000 });
  const mCard = page.locator('article[data-slug="must-vs-have-to"]');
  ok(await mCard.locator('[data-answer]').count() === 10, 'Mở ra thấy đủ 10 câu luyện');
  ok(/CẤM/.test(await mCard.innerText()), 'Chi tiết nêu rõ mustn\'t là CẤM');

  await page.selectOption('#f-level', 'A1');
  await page.waitForTimeout(300);
  ok(await page.locator('#list article').count() === 3, 'Lọc bậc A1 còn 3 mục');

  /* --- Trang câu điều kiện --- */
  await page.goto(BASE + '/prep/hoc/dieu-kien/', { waitUntil: 'networkidle' });
  await page.waitForSelector('#list article', { timeout: 10000 });
  ok(await page.locator('#list article').count() === 20, 'Trang câu điều kiện hiện đủ 20 mục');

  await page.click('[data-toggle="conditional-third"]');
  await page.waitForSelector('#list article[data-slug="conditional-third"] [data-answer]',
    { state: 'attached', timeout: 10000 });
  ok(await page.locator('article[data-slug="conditional-third"] [data-answer]').count() === 10,
    'Mở ra thấy đủ 10 câu luyện');

  await page.selectOption('#f-level', 'A2');
  await page.waitForTimeout(300);
  ok(await page.locator('#list article').count() === 2, 'Lọc bậc A2 còn 2 mục');

  /* --- Trang bị động và tường thuật --- */
  await page.goto(BASE + '/prep/hoc/bi-dong/', { waitUntil: 'networkidle' });
  await page.waitForSelector('#list article', { timeout: 10000 });
  ok(await page.locator('#list article').count() === 22, 'Trang bị động hiện đủ 22 mục');

  await page.click('[data-toggle="passive-basic"]');
  await page.waitForSelector('#list article[data-slug="passive-basic"] [data-answer]',
    { state: 'attached', timeout: 10000 });
  ok(await page.locator('article[data-slug="passive-basic"] [data-answer]').count() === 10,
    'Mở ra thấy đủ 10 câu luyện');

  /* Mục bậc C2 nằm ở cuối danh sách dài, phải mở được như mục đầu */
  await page.click('[data-toggle="free-indirect-speech"]');
  await page.waitForSelector('#list article[data-slug="free-indirect-speech"] [data-answer]',
    { state: 'attached', timeout: 10000 });
  ok(await page.locator('article[data-slug="free-indirect-speech"] [data-answer]').count() === 10,
    'Mục bậc C2 cuối danh sách cũng mở ra đủ 10 câu luyện');

  await page.selectOption('#f-level', 'A2');
  await page.waitForTimeout(300);
  ok(await page.locator('#list article').count() === 2, 'Lọc bậc A2 còn 2 mục');

  await page.selectOption('#f-level', 'C2');
  await page.waitForTimeout(300);
  ok(await page.locator('#list article').count() === 4, 'Lọc bậc C2 còn 4 mục');

  /* --- Trang mệnh đề quan hệ và mệnh đề phụ --- */
  await page.goto(BASE + '/prep/hoc/menh-de/', { waitUntil: 'networkidle' });
  await page.waitForSelector('#list article', { timeout: 10000 });
  ok(await page.locator('#list article').count() === 29, 'Trang mệnh đề hiện đủ 29 mục');

  await page.click('[data-toggle="adverbial-reason-basic"]');
  await page.waitForSelector('#list article[data-slug="adverbial-reason-basic"] [data-answer]',
    { state: 'attached', timeout: 10000 });
  ok(await page.locator('article[data-slug="adverbial-reason-basic"] [data-answer]').count() === 10,
    'Mở ra thấy đủ 10 câu luyện');

  /* Mục bậc B2 nằm cuối danh sách dài, phải mở được như mục đầu */
  await page.click('[data-toggle="noun-clause-what-whether"]');
  await page.waitForSelector('#list article[data-slug="noun-clause-what-whether"] [data-answer]',
    { state: 'attached', timeout: 10000 });
  ok(await page.locator('article[data-slug="noun-clause-what-whether"] [data-answer]').count() === 10,
    'Mục bậc B2 cuối danh sách cũng mở ra đủ 10 câu luyện');

  await page.selectOption('#f-level', 'A2');
  await page.waitForTimeout(300);
  ok(await page.locator('#list article').count() === 3, 'Lọc bậc A2 còn 3 mục');

  await page.selectOption('#f-level', 'B1');
  await page.waitForTimeout(300);
  ok(await page.locator('#list article').count() === 6, 'Lọc bậc B1 còn 6 mục');

  await page.selectOption('#f-level', 'B2');
  await page.waitForTimeout(300);
  ok(await page.locator('#list article').count() === 8, 'Lọc bậc B2 còn 8 mục');

  await page.selectOption('#f-level', 'C1');
  await page.waitForTimeout(300);
  ok(await page.locator('#list article').count() === 7, 'Lọc bậc C1 còn 7 mục');

  await page.selectOption('#f-level', 'C2');
  await page.waitForTimeout(300);
  ok(await page.locator('#list article').count() === 5, 'Lọc bậc C2 còn 5 mục');

  /* Mục bậc C2 cuối danh sách 29 mục phải mở được như mục đầu */
  await page.click('[data-toggle="clause-attachment"]');
  await page.waitForSelector('#list article[data-slug="clause-attachment"] [data-answer]',
    { state: 'attached', timeout: 10000 });
  ok(await page.locator('article[data-slug="clause-attachment"] [data-answer]').count() === 10,
    'Mục bậc C2 cuối danh sách cũng mở ra đủ 10 câu luyện');

  /* --- Trang đảo ngữ, nhấn mạnh và câu chẻ --- */
  await page.goto(BASE + '/prep/hoc/nhan-manh/', { waitUntil: 'networkidle' });
  await page.waitForSelector('#list article', { timeout: 10000 });
  ok(await page.locator('#list article').count() === 21, 'Trang đảo ngữ hiện đủ 21 mục');

  await page.click('[data-toggle="negative-inversion-basic"]');
  await page.waitForSelector('#list article[data-slug="negative-inversion-basic"] [data-answer]',
    { state: 'attached', timeout: 10000 });
  ok(await page.locator('article[data-slug="negative-inversion-basic"] [data-answer]').count() === 10,
    'Mở ra thấy đủ 10 câu luyện');

  await page.selectOption('#f-level', 'B1');
  await page.waitForTimeout(300);
  ok(await page.locator('#list article').count() === 2, 'Lọc bậc B1 còn 2 mục');

  await page.selectOption('#f-level', 'C1');
  await page.waitForTimeout(300);
  ok(await page.locator('#list article').count() === 7, 'Lọc bậc C1 còn 7 mục');

  await page.selectOption('#f-level', 'C2');
  await page.waitForTimeout(300);
  ok(await page.locator('#list article').count() === 7, 'Lọc bậc C2 còn 7 mục');

  /* Mục bậc C2 cuối danh sách 21 mục phải mở được như mục đầu */
  await page.click('[data-toggle="emphasis-far-from"]');
  await page.waitForSelector('#list article[data-slug="emphasis-far-from"] [data-answer]',
    { state: 'attached', timeout: 10000 });
  ok(await page.locator('article[data-slug="emphasis-far-from"] [data-answer]').count() === 10,
    'Mục bậc C2 cuối danh sách cũng mở ra đủ 10 câu luyện');

  ok(errs.length === 0, 'Không có lỗi JavaScript trên chín trang tự học' +
    (errs.length ? ': ' + errs[0] : ''));

  await ctx.close();
} finally {
  await browser.close();
}

console.log(`\n${pass}/${pass + fail} kiểm thử đạt`);
process.exit(fail ? 1 : 0);
