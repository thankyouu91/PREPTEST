/**
 * Bộ tài liệu VPET - sinh hai bản PDF (Level 1, Level 2) từ một nguồn duy nhất.
 *
 * Chạy: npm run docs:vpet
 *
 * Dùng đúng Chromium đã có sẵn cho ảnh chụp và bộ icon, nên KHÔNG thêm phụ thuộc
 * nào: nội dung ở dưới -> HTML tạm trong public/tai-lieu/ -> page.pdf() -> xoá
 * HTML tạm. PDF sinh ra được commit, vì máy chủ chỉ phục vụ tệp tĩnh chứ không
 * dựng PDF lúc chạy.
 *
 * Số liệu kỳ thi lấy thẳng từ server/data/exam-formats.js, nên tài liệu không
 * bao giờ lệch với blueprint. Sửa blueprint rồi chạy lại là tài liệu tự đúng.
 * Phần mô tả, mẹo làm bài và lộ trình là nội dung tự viết cho nền tảng này.
 */
import fs from 'node:fs/promises';
import path from 'node:path';
import { createRequire } from 'node:module';
import { launchChromium } from './_browser.mjs';

const require_ = createRequire(import.meta.url);
const { FORMATS } = require_('../server/data/exam-formats.js');

const ROOT = path.join(import.meta.dirname, '..');
const OUT = path.join(ROOT, 'public', 'tai-lieu');
const BP = FORMATS.find(f => f.id === 'vpet-full');
const TOTAL_ITEMS = BP.sections.reduce((a, s) => a + s.items, 0);
const TOTAL_MIN = BP.sections.reduce((a, s) => a + s.minutes, 0);

/* Tên phần và mô tả bằng tiếng Việt, khoá theo chữ cái của blueprint. */
const VI = {
  A: { ten: 'Hoàn thành câu', lam: 'Một câu thiếu đúng một từ. Bạn gõ từ còn thiếu vào.' },
  B: { ten: 'Dựng lại đoạn văn', lam: 'Đọc một đoạn ngắn, đoạn văn biến mất, rồi viết lại bằng lời của mình.' },
  C: { ten: 'Đọc hiểu', lam: 'Đọc đoạn ngắn rồi chọn một trong bốn phương án.' },
  D: { ten: 'Viết email', lam: 'Viết email trả lời một tình huống, đúng văn phong đề yêu cầu.' },
  E: { ten: 'Chính tả (nghe - viết)', lam: 'Nghe một câu rồi gõ lại nguyên văn.' },
  F: { ten: 'Chọn câu đáp lại', lam: 'Nghe một lời thoại, chọn câu đáp lại tự nhiên nhất.' },
  G: { ten: 'Nghe hiểu đoạn dài', lam: 'Nghe một đoạn nói dài hơn rồi trả lời câu hỏi.' },
  H: { ten: 'Nhắc lại câu', lam: 'Nghe một câu rồi nhắc lại thật chính xác.' },
  I: { ten: 'Nói theo tình huống', lam: 'Đọc một tình huống rồi nói tối đa một phút.' },
  J: { ten: 'Kể lại câu chuyện', lam: 'Nghe một mẩu chuyện ngắn rồi kể lại bằng lời của mình.' }
};

/* Mẹo làm bài và lỗi thường gặp, tách riêng cho hai cấp độ. Level 1 nhắm vào
   người còn đang xây nền; Level 2 nhắm vào người đã qua ngưỡng B1. */
const MEO = {
  1: {
    A: ['Đọc hết cả câu trước khi điền - từ cần điền thường phụ thuộc vào vế sau.',
        'Chú ý giới từ đi kèm động từ (depend **on**, good **at**, afraid **of**).',
        'Chỉ điền MỘT từ. Nếu nghĩ ra hai từ, gần như chắc chắn bạn đang hiểu sai câu.'],
    B: ['Khi đọc, nhớ Ý chứ đừng cố nhớ CHỮ. Ghi nhanh 3 ý chính trong đầu.',
        'Viết lại bằng câu đơn giản của mình vẫn được điểm; chép sai nguyên văn thì không.',
        'Viết đủ ý quan trọng hơn viết câu dài.'],
    C: ['Đọc câu hỏi trước, rồi mới đọc đoạn - bạn sẽ biết cần tìm gì.',
        'Đáp án đúng thường diễn đạt lại ý, không lặp nguyên chữ trong đoạn.',
        'Phương án nào dùng lại y hệt chữ trong đoạn thường là bẫy.'],
    D: ['Bám đúng ba việc đề yêu cầu. Thiếu một việc là mất điểm nhiệm vụ.',
        'Câu ngắn, đúng ngữ pháp tốt hơn câu dài mà sai.',
        'Có lời chào và lời kết. Email thiếu hai thứ này bị trừ điểm văn phong.'],
    E: ['Nghe trọn câu rồi mới gõ, đừng gõ đuổi theo từng từ.',
        'Chú ý đuôi -s, -ed và mạo từ a/the - đây là chỗ mất điểm nhiều nhất.',
        'Không nghe rõ một từ thì cứ đoán và viết tiếp; bỏ trống chắc chắn không có điểm.'],
    F: ['Nghe kỹ TỪ ĐỂ HỎI (what, where, when, why) - nó quyết định câu trả lời.',
        'Cả bốn phương án đều đúng ngữ pháp, nên đừng loại bằng ngữ pháp.',
        'Chọn câu đáp tự nhiên như người bản xứ nói, không phải câu đúng nhất về nghĩa đen.'],
    G: ['Nghe lấy ý chính ở câu đầu và câu cuối - đó thường là nơi đặt ý.',
        'Đừng hoảng khi nghe sót một từ; mạch chung mới là thứ được hỏi.'],
    H: ['Nghe hết câu rồi mới nói, đừng nói đuổi.',
        'Nói to, rõ, đều. Đọc nhỏ và ngập ngừng bị trừ điểm trôi chảy.',
        'Quên một từ thì vẫn nói tiếp phần còn lại; dừng hẳn là mất nhiều điểm hơn.'],
    I: ['Trả lời đủ ba việc đề yêu cầu, theo đúng thứ tự đó.',
        'Xưng hô đúng với người nghe: bạn bè khác, nhân viên khách sạn khác.',
        'Nói chậm mà rõ hơn là nói nhanh mà vấp.'],
    J: ['Kể theo đúng trình tự: mở đầu - chuyện xảy ra - kết thúc.',
        'Dùng từ nối đơn giản: first, then, after that, finally.',
        'Không nhớ chi tiết thì kể ý chính; bỏ trắng mới là mất điểm.']
  },
  2: {
    A: ['Nhận diện cấu trúc cố định: "no choice but to", "it is high time", "on the grounds that".',
        'Đảo ngữ sau trạng ngữ đứng đầu (Hardly had I..., Not only did he...) là dạng ra thường xuyên ở B2+.',
        'Phân biệt cặp dễ lẫn: by/until, for/since, in force/into force.'],
    B: ['Giữ đủ quan hệ logic giữa các ý (nguyên nhân, tương phản), không chỉ giữ sự kiện.',
        'Diễn đạt lại bằng cấu trúc của mình được đánh giá cao hơn là chép gần nguyên văn.',
        'Một đoạn 3-5 ý: mất một ý là mất một phần điểm, nên rà lại trước khi nộp.'],
    C: ['Câu hỏi ở mức này hỏi ý SUY RA, không phải ý có sẵn trên mặt chữ.',
        'Nhiễu hay gặp: đảo quan hệ nhân - quả, biến một phần thành toàn bộ, biến điều "được nêu" thành điều "bị phê phán".',
        'Câu cuối đoạn thường chứa kết luận - và cũng thường là chỗ ra đáp án.'],
    D: ['Ba trục chấm điểm: hoàn thành nhiệm vụ, văn phong, độ chính xác. Thiếu trục nào mất trục đó.',
        'Nêu vấn đề mà không đề nghị gì cụ thể là lỗi phổ biến nhất - người đọc không có gì để hành động.',
        'Formal nghĩa là không viết tắt, không tiếng lóng, và câu có chủ ngữ đầy đủ.'],
    E: ['Câu dài hơn ở mức này: chia câu thành cụm khi nghe, đừng nhớ từng từ rời.',
        'Giữ đúng dấu câu và chữ hoa - có tính điểm.'],
    F: ['Nhiễu ở mức này sai về CHỨC NĂNG (lệch mục đích, sai mức lịch sự), không sai ngữ pháp.',
        'Chú ý sắc thái: một lời từ chối lịch sự khác hẳn một lời từ chối thẳng.'],
    G: ['Đoạn dài hơn và có lập luận: theo dõi quan điểm của người nói, không chỉ sự kiện.',
        'Câu hỏi thường nhắm vào thái độ hoặc hàm ý, không vào chi tiết.'],
    H: ['Câu dài dần qua từng item - đó chính là cơ chế phân loại của phần này.',
        'Giữ đúng trọng âm và ngữ điệu; đọc đều đều như máy vẫn bị trừ.'],
    I: ['Đề luôn có một khó khăn (từ chối, phàn nàn, thương lượng). Xử lý được khó khăn đó mới có điểm cao.',
        'Vừa cứng rắn vừa lịch sự là yêu cầu khó nhất - dùng "I understand..., however..." để giữ cả hai.',
        'Nói hết một phút; dừng ở giây thứ 20 là tự bỏ điểm.'],
    J: ['Giữ mạch truyện VÀ quan hệ nhân quả giữa các sự kiện.',
        'Dùng từ vựng chủ động của mình thay vì lặp lại nguyên văn - phần này chấm cả vốn từ.',
        'Kể ở thì quá khứ nhất quán từ đầu đến cuối.']
  }
};

const LEVELS = {
  1: {
    ma: 'Level 1', cefr: 'A1-B1+', gse: 'GSE 10-58',
    aiCho: 'Người mới bắt đầu đến trung cấp, cần chứng minh khả năng tiếng Anh giao tiếp cơ bản trong công việc.',
    lotrinh: [
      ['Tuần 1-2', 'Nắm cấu trúc 10 phần. Làm quen phần A và C - hai phần dễ lấy điểm nhất.'],
      ['Tuần 3-4', 'Luyện nghe mỗi ngày 20 phút với phần E và F. Bắt đầu viết email ngắn (phần D).'],
      ['Tuần 5-6', 'Luyện nói: phần H nhắc lại câu mỗi ngày 10 câu, phần I nói một tình huống mỗi ngày.'],
      ['Tuần 7-8', 'Thi thử trọn đề 60 phút, ít nhất 3 lần. Xem lại phần nào điểm thấp nhất rồi tập trung vào đó.']
    ]
  },
  2: {
    ma: 'Level 2', cefr: 'B1-C2', gse: 'GSE 51-90',
    aiCho: 'Người đã vững tiếng Anh, cần chứng chỉ cho vị trí chuyên môn hoặc môi trường làm việc quốc tế.',
    lotrinh: [
      ['Tuần 1-2', 'Thi thử một đề đầy đủ để biết điểm xuất phát. Ghi lại điểm từng kỹ năng.'],
      ['Tuần 3-4', 'Tập trung vào hai kỹ năng yếu nhất. Phần B và D là nơi lấy lại điểm nhanh nhất ở mức này.'],
      ['Tuần 5-6', 'Luyện phần J và I với đồng hồ bấm giờ - nói đủ thời lượng là một phần của điểm.'],
      ['Tuần 7-8', 'Thi thử hằng tuần. Ở mức này, giữ ổn định quan trọng hơn cải thiện thêm.']
    ]
  }
};

const esc = s => String(s).replace(/[&<>]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c]));
/* **đậm** trong nội dung ở trên -> <b>, để mẹo làm bài nhấn được chỗ cần nhấn. */
const md = s => esc(s).replace(/\*\*(.+?)\*\*/g, '<b>$1</b>');

function trang(lv) {
  const L = LEVELS[lv];
  const meo = MEO[lv];
  const hang = BP.sections.map(s => {
    const v = VI[s.part];
    return `<tr>
      <td class="p">${s.part}</td>
      <td><b>${esc(v.ten)}</b><span class="en">${esc(s.name.replace(/^Part . - /, ''))}</span></td>
      <td class="n">${s.items}</td>
      <td class="n">${s.minutes}′</td>
      <td>${s.needsAudio ? '<span class="tag">có audio</span>' : '<span class="tag off">không audio</span>'}</td>
    </tr>`;
  }).join('');

  const chiTiet = BP.sections.map(s => {
    const v = VI[s.part];
    return `<section class="part">
      <h3><span class="letter">${s.part}</span>${esc(v.ten)}
        <span class="meta">${s.items} câu · ${s.minutes} phút</span></h3>
      <p class="lam">${esc(v.lam)}</p>
      <ul>${(meo[s.part] || []).map(m => `<li>${md(m)}</li>`).join('')}</ul>
    </section>`;
  }).join('');

  return `<!doctype html><html lang="vi"><head><meta charset="utf-8">
<title>Tài liệu VPET ${esc(L.ma)}</title>
<style>
  @font-face{font-family:PJS;font-weight:400;src:url(../fonts/pjs-400-vietnamese.woff2) format('woff2');}
  @font-face{font-family:PJS;font-weight:600;src:url(../fonts/pjs-600-vietnamese.woff2) format('woff2');}
  @font-face{font-family:PJS;font-weight:800;src:url(../fonts/pjs-800-vietnamese.woff2) format('woff2');}
  *{box-sizing:border-box;margin:0;padding:0}
  body{font-family:PJS,system-ui,sans-serif;color:#111a33;font-size:10.5pt;line-height:1.55}
  .cover{background:#1c3d8f;color:#fff;padding:26mm 18mm;margin:-16mm -14mm 10mm;}
  .cover .kicker{font-size:9pt;letter-spacing:.16em;text-transform:uppercase;opacity:.75}
  .cover h1{font-size:27pt;font-weight:800;line-height:1.12;margin:7mm 0 4mm;letter-spacing:-.4pt}
  .cover .sub{font-size:11pt;opacity:.9;max-width:120mm}
  .chips{margin-top:8mm;display:flex;gap:5mm;flex-wrap:wrap}
  .chip{border:1px solid rgba(255,255,255,.42);border-radius:99px;padding:1.6mm 4.5mm;font-size:9pt;font-weight:600}
  h2{font-size:14pt;font-weight:800;color:#1c3d8f;margin:9mm 0 3.5mm;letter-spacing:-.2pt}
  h2:first-of-type{margin-top:2mm}
  p{margin-bottom:2.5mm}
  .lead{color:#57627a}
  table{width:100%;border-collapse:collapse;font-size:9.5pt;margin-top:2mm}
  th{text-align:left;font-weight:600;font-size:8pt;text-transform:uppercase;letter-spacing:.07em;
     color:#57627a;border-bottom:1.2px solid #1c3d8f;padding:0 2mm 1.8mm}
  td{padding:2.1mm 2mm;border-bottom:.7px solid #e4e8f1;vertical-align:top}
  td.p{font-weight:800;color:#0e8577;width:8mm}
  td.n{text-align:right;width:13mm;font-variant-numeric:tabular-nums}
  .en{display:block;font-size:8pt;color:#57627a}
  .tag{font-size:7.6pt;font-weight:600;color:#0e8577;background:#e6f4f1;border-radius:99px;padding:.9mm 2.6mm;white-space:nowrap}
  .tag.off{color:#57627a;background:#f1f3f8}
  .sum{display:flex;gap:4mm;margin:4mm 0 0}
  .sum div{flex:1;border:1px solid #e4e8f1;border-radius:3mm;padding:3.5mm}
  .sum b{display:block;font-size:17pt;font-weight:800;color:#1c3d8f;line-height:1}
  .sum span{font-size:8.5pt;color:#57627a}
  .part{break-inside:avoid;border:1px solid #e4e8f1;border-radius:3mm;padding:4mm 4.5mm;margin-bottom:3.5mm}
  .part h3{font-size:11pt;font-weight:800;display:flex;align-items:center;gap:2.5mm;margin-bottom:1.5mm}
  .letter{background:#1c3d8f;color:#fff;width:6.5mm;height:6.5mm;border-radius:1.8mm;
          display:inline-flex;align-items:center;justify-content:center;font-size:9pt;flex:none}
  .meta{margin-left:auto;font-size:8.5pt;font-weight:600;color:#57627a}
  .lam{color:#57627a;font-size:9.5pt;margin-bottom:2mm}
  ul{margin-left:4.5mm}
  li{margin-bottom:1.3mm;font-size:9.5pt}
  .road td:first-child{font-weight:600;color:#0e8577;width:24mm;white-space:nowrap}
  .check{columns:2;column-gap:8mm;font-size:9.5pt;margin-left:4.5mm}
  .note{background:#f6f7fb;border-left:2.5mm solid #0e8577;border-radius:0 2mm 2mm 0;
        padding:3.5mm 4mm;font-size:9pt;color:#57627a;margin-top:4mm}
  footer{margin-top:9mm;padding-top:3mm;border-top:.7px solid #e4e8f1;
         font-size:8pt;color:#57627a;display:flex;justify-content:space-between}
</style></head><body>

<div class="cover">
  <div class="kicker">VPET · Versant Professional English Test</div>
  <h1>Bộ tài liệu luyện thi<br>${esc(L.ma)}</h1>
  <div class="sub">${esc(L.aiCho)}</div>
  <div class="chips"><span class="chip">${esc(L.cefr)}</span><span class="chip">${esc(L.gse)}</span>
    <span class="chip">${TOTAL_ITEMS} câu · ${TOTAL_MIN} phút</span></div>
</div>

<h2>1. Kỳ thi này là gì</h2>
<p class="lead">VPET (Versant Professional English Test) là bài thi tiếng Anh nghề nghiệp của Pearson,
chấm hoàn toàn tự động. Bài thi gồm <b>${BP.sections.length} phần</b>, đánh chữ cái từ A đến J,
tổng <b>${TOTAL_ITEMS} câu</b> làm trong <b>${TOTAL_MIN} phút</b>. Mỗi phần có đồng hồ riêng: hết giờ
là hệ thống tự chuyển, không quay lại được.</p>
<div class="sum">
  <div><b>${TOTAL_ITEMS}</b><span>câu hỏi</span></div>
  <div><b>${TOTAL_MIN}′</b><span>tổng thời gian</span></div>
  <div><b>${BP.sections.length}</b><span>phần A → J</span></div>
  <div><b>4</b><span>kỹ năng chấm riêng</span></div>
</div>

<h2>2. Toàn cảnh 10 phần</h2>
<table><thead><tr><th></th><th>Phần thi</th><th class="n">Câu</th><th class="n">Phút</th><th>Audio</th></tr></thead>
<tbody>${hang}</tbody></table>
<div class="note">Bốn kỹ năng Nghe · Đọc · Viết · Nói được chấm <b>riêng từng kỹ năng</b> theo khung
CEFR. Phần Nói (H, I, J) chấm bằng AI, sau đó có người rà lại.</div>

<h2>3. Từng phần: làm gì và làm thế nào</h2>
${chiTiet}

<h2>4. Lộ trình ôn 8 tuần</h2>
<table class="road"><tbody>${L.lotrinh.map(([t, v]) => `<tr><td>${esc(t)}</td><td>${esc(v)}</td></tr>`).join('')}</tbody></table>

<h2>5. Trước ngày thi</h2>
<ul class="check">
  <li>Thử tai nghe và micro trước, không đợi đến lúc vào thi.</li>
  <li>Chọn phòng yên tĩnh - phần Nói ghi âm cả tiếng ồn xung quanh.</li>
  <li>Kiểm tra đường truyền mạng.</li>
  <li>Nhớ mỗi phần có đồng hồ riêng, không quay lại được.</li>
  <li>Phần Nói: chờ hết tiếng bíp rồi mới nói.</li>
  <li>Không bỏ trống câu nào - sai không bị trừ điểm.</li>
</ul>

<footer><span>VPET Prep · Tài liệu luyện thi ${esc(L.ma)}</span>
<span>Tài liệu tự biên soạn, không sao chép đề thi thật</span></footer>
</body></html>`;
}

/* Cùng nội dung đó, xuất thêm ra JSON cho trang đọc trực tiếp /prep/tai-lieu/.
   Một nguồn duy nhất: bản PDF tải về và bản đọc trên web không thể lệch nhau,
   vì cả hai đều dựng từ các hằng ở trên. */
function duLieu() {
  return {
    tong: { cau: TOTAL_ITEMS, phut: TOTAL_MIN, phan: BP.sections.length },
    phan: BP.sections.map(s => ({
      ma: s.part,
      ten: VI[s.part].ten,
      tenEn: s.name.replace(/^Part . - /, ''),
      lam: VI[s.part].lam,
      cau: s.items,
      phut: s.minutes,
      audio: !!s.needsAudio,
      meo: { 1: MEO[1][s.part] || [], 2: MEO[2][s.part] || [] }
    })),
    capDo: Object.fromEntries(Object.entries(LEVELS).map(([k, v]) => [k, {
      ma: v.ma, cefr: v.cefr, gse: v.gse, aiCho: v.aiCho, lotrinh: v.lotrinh
    }]))
  };
}

/* ------------------------------------------------------------------ */
await fs.mkdir(OUT, { recursive: true });

const json = path.join(OUT, 'guide.json');
await fs.writeFile(json, JSON.stringify(duLieu(), null, 1));
console.log(`✓ ${path.relative(ROOT, json)}  (${Math.round((await fs.stat(json)).size / 1024)} KB)`);

const browser = await launchChromium();
try {
  for (const lv of [1, 2]) {
    const src = path.join(OUT, `_src-level-${lv}.html`);
    /* Ghi cạnh public/fonts để đường dẫn font tương đối chạy được qua file:// */
    await fs.writeFile(src, trang(lv));
    const page = await browser.newPage();
    await page.goto('file://' + src, { waitUntil: 'networkidle' });
    const pdf = path.join(OUT, `vpet-level-${lv}.pdf`);
    await page.pdf({
      path: pdf, format: 'A4', printBackground: true,
      margin: { top: '16mm', bottom: '14mm', left: '14mm', right: '14mm' }
    });
    await page.close();
    if (!process.env.KEEP_SRC) await fs.unlink(src);
    const { size } = await fs.stat(pdf);
    console.log(`✓ ${path.relative(ROOT, pdf)}  (${Math.round(size / 1024)} KB)`);
  }
} finally {
  await browser.close();
}
