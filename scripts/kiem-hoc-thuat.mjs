/**
 * Vòng kiểm học thuật — nội dung VPET đã đúng, chuẩn và đủ chưa.
 *
 * Đây là vòng lặp: chạy, nó chỉ ra chỗ còn thiếu và chỗ không khớp, sửa xong
 * chạy lại. Thoát khác 0 khi còn lỗi, nên dùng được làm cổng chặn trước khi
 * phát hành đề hay trước khi deploy.
 *
 *   node scripts/kiem-hoc-thuat.mjs           báo cáo đầy đủ
 *   node scripts/kiem-hoc-thuat.mjs --gon     chỉ in phần chưa đạt
 *
 * Vì sao cần một vòng riêng thay vì để trong bộ kiểm thử: bộ kiểm thử trả lời
 * "mã có chạy đúng không". Vòng này trả lời "nội dung học thuật đã đủ chưa" —
 * một câu hỏi có thể trả lời "chưa" mà không có gì hỏng, và cần đo được để
 * biết còn bao xa. Bộ kiểm thử pass/fail; vòng này còn báo phần trăm hoàn tất.
 *
 * Bảy nhóm kiểm, theo thứ tự phụ thuộc:
 *
 *   1. Blueprint      đủ 55 câu mỗi level, đúng số câu từng part
 *   2. Mô tả năng lực thang liền mạch, không hở bậc nào
 *   3. Rubric         đủ tiêu chí, trọng số tròn 100, đủ 7 bậc
 *   4. Ôn tập         mỗi tiêu chí có lời khuyên cho cả ba mức
 *   5. Liên kết       mọi đường dẫn trang học đều tồn tại thật
 *   6. Nhất quán      mốc GSE của rubric nằm đúng dải bậc của mô tả
 *   7. Phủ chấm       part nào cần rubric thì có rubric, và ngược lại
 */
import { createRequire } from 'node:module';
import fs from 'node:fs';
import path from 'node:path';

const require = createRequire(import.meta.url);
const GON = process.argv.includes('--gon') || process.argv.includes('--brief');

const D = require('../server/data/descriptors.js');
const R = require('../server/data/rubrics.js');
const SCRIPTS = require('../server/data/vpet-scripts.js');
const ITEMS = require('../server/data/vpet-items.js');
const FORMATS = require('../server/data/exam-formats.js');

let dat = 0, hong = 0;
const thieu = [];

const nhom = t => console.log(`\n\x1b[1m${t}\x1b[0m`);
const ok = (dieuKien, ten, chiTiet) => {
  if (dieuKien) { dat++; if (!GON) console.log('  ✓ ' + ten); }
  else {
    hong++;
    console.log('  \x1b[31m✗ ' + ten + '\x1b[0m' + (chiTiet ? '\n      → ' + chiTiet : ''));
    thieu.push(ten + (chiTiet ? ' — ' + chiTiet : ''));
  }
};

const allItems = [...SCRIPTS.allItems(), ...ITEMS.allItems()];

/* ================= 1. Blueprint ================= */
nhom('1 · Blueprint 55 câu');

const BLUEPRINT = (() => {
  const fmt = FORMATS.FORMATS.find(f => f.id === 'vpet-full');
  const out = {};
  fmt.sections.forEach(s => {
    const m = /^Part ([A-J])\b/.exec(s.name);
    if (m) out[m[1]] = s.items;
  });
  return out;
})();

for (const level of [1, 2]) {
  const dem = {};
  allItems.filter(i => i.level === level).forEach(i => { dem[i.part] = (dem[i.part] || 0) + 1; });
  for (const [part, can] of Object.entries(BLUEPRINT)) {
    const co = dem[part] || 0;
    ok(co === can, `Level ${level} part ${part}: ${can} câu`,
      co === can ? null : `đang có ${co}, thiếu ${can - co}`);
  }
  const tong = Object.values(dem).reduce((a, b) => a + b, 0);
  ok(tong === 55, `Level ${level} tròn 55 câu`, tong === 55 ? null : `đang có ${tong}`);
}

/* ================= 2. Mô tả năng lực ================= */
nhom('2 · Thang mô tả năng lực');

for (const [skill, list] of Object.entries(D.BY_SKILL)) {
  ok(list.length >= 30, `${skill}: đủ số mô tả`, `đang có ${list.length}`);

  const tangDan = list.every((d, i) => i === 0 || d.gse > list[i - 1].gse);
  ok(tangDan, `${skill}: xếp tăng dần theo GSE`,
    tangDan ? null : 'có mốc đặt sai thứ tự, nextTargets() sẽ trả sai mục tiêu');

  /* Bậc nào không có mô tả nào là bậc mà report không nói được gì cho người
     học rơi vào đó — im lặng đúng lúc cần lời khuyên nhất. */
  const hoBac = D.BANDS
    .filter(b => b.band !== 'below A1')
    .filter(b => !list.some(d => d.gse >= b.min && d.gse <= b.max))
    .map(b => b.band);
  ok(hoBac.length === 0, `${skill}: mọi bậc A1–C2 đều có mô tả`,
    hoBac.length ? 'hở bậc: ' + hoBac.join(', ') : null);

  const motViec = list.filter(d => / and .* and /.test(d.text));
  ok(motViec.length === 0, `${skill}: mỗi mô tả một năng lực`,
    motViec.length ? motViec.length + ' mô tả gộp nhiều việc' : null);
}

/* ================= 3. Rubric ================= */
nhom('3 · Rubric chấm');

for (const [name, c] of Object.entries(R.CRITERIA)) {
  const bacs = c.bands.map(b => b.band).sort((a, b) => a - b);
  ok(bacs.join(',') === '0,1,2,3,4,5,6', `${name}: đủ 7 bậc 0–6`, 'đang có ' + bacs.join(','));
  ok(c.bands.every(b => b.descriptor && b.evidence),
    `${name}: mọi bậc có cả mô tả lẫn dấu hiệu quan sát`,
    'thiếu evidence là rubric hai giám khảo chấm khác nhau mà không ai bảo vệ được');
  ok(!!c.what && !!c.label, `${name}: có nhãn và định nghĩa`);
}

for (const [part, rub] of Object.entries(R.PART_RUBRICS)) {
  const tong = Object.values(rub.criteria).reduce((a, b) => a + b, 0);
  ok(tong === 100, `Part ${part}: trọng số tròn 100`, tong === 100 ? null : `đang là ${tong}`);

  const la = Object.keys(rub.criteria).filter(k => !R.CRITERIA[k]);
  ok(la.length === 0, `Part ${part}: mọi tiêu chí đều tồn tại`, la.join(', '));

  const saiKyNang = Object.keys(rub.criteria)
    .filter(k => R.CRITERIA[k] && !R.CRITERIA[k].skills.includes(rub.skill));
  ok(saiKyNang.length === 0, `Part ${part}: tiêu chí đúng kỹ năng ${rub.skill}`, saiKyNang.join(', '));
}

const tongNoi = Object.values(R.SPEAKING_PART_WEIGHTS).reduce((a, b) => a + b, 0);
ok(tongNoi === 100, 'Trọng số ba part Nói tròn 100', tongNoi === 100 ? null : String(tongNoi));
const tongViet = Object.values(R.WRITING_PART_WEIGHTS).reduce((a, b) => a + b, 0);
ok(tongViet === 100, 'Trọng số part Viết tròn 100', tongViet === 100 ? null : String(tongViet));

/* ================= 4. Nội dung ôn tập ================= */
nhom('4 · Ôn tập cá nhân hoá');

for (const [name, c] of Object.entries(R.CRITERIA)) {
  const mucs = ['struggling', 'developing', 'refining'];
  const thieuMuc = mucs.filter(m => !c.remediation || !c.remediation[m]);
  ok(thieuMuc.length === 0, `${name}: có lời khuyên cho cả ba mức`, thieuMuc.join(', '));

  if (!thieuMuc.length) {
    ok(mucs.every(m => c.remediation[m].diagnosis && c.remediation[m].diagnosis.length > 20),
      `${name}: mức nào cũng có chẩn đoán viết cho người học`);
    ok(mucs.every(m => (c.remediation[m].actions || []).length >= 2),
      `${name}: mức nào cũng có ít nhất 2 việc làm được ngay`,
      '"cải thiện độ trôi chảy" không phải việc ai làm được');
  }
}

/* ================= 5. Liên kết trang học ================= */
nhom('5 · Đường dẫn trang tự học');

/* Đọc thẳng từ server.js: một trang bị đổi tên mà rubric không đổi theo thì
   người học bấm vào đúng lúc họ quyết định hành động, và rơi vào 404. */
const serverSrc = fs.readFileSync(path.resolve('server.js'), 'utf8');
const routeCoThat = new Set([...serverSrc.matchAll(/app\.get\('(\/prep\/hoc\/[^']+)'/g)].map(m => m[1]));

const duocDung = new Set();
Object.values(R.CRITERIA).forEach(c =>
  Object.values(c.remediation || {}).forEach(r => (r.study || []).forEach(u => duocDung.add(u))));

for (const url of [...duocDung].sort()) {
  ok(routeCoThat.has(url), `Trang ${url} tồn tại`, 'rubric trỏ tới một route không có trong server.js');
}
ok(duocDung.size >= 6, 'Ôn tập trỏ tới đủ nhiều trang học', `đang dùng ${duocDung.size} trang`);

/* Chiều ngược lại không phải lỗi, nhưng là việc còn bỏ ngỏ: trang có mà không
   rubric nào dẫn tới thì người học không bao giờ được chỉ tới đó từ report. */
const chuaDung = [...routeCoThat].filter(u => !duocDung.has(u));
if (chuaDung.length && !GON) {
  console.log('  \x1b[33m·\x1b[0m Trang chưa được ôn tập nào trỏ tới: ' + chuaDung.join(', '));
}

/* ================= 6. Nhất quán khung đo ================= */
nhom('6 · Nhất quán giữa rubric và mô tả');

for (const [band, gse] of Object.entries(R.BAND_GSE)) {
  if (gse == null) continue;
  const cefrRubric = R.BAND_CEFR[band];
  const cefrThang = D.bandFor(gse);
  /* Bậc 3 neo ở GSE 47 nằm trong dải B1; bậc 4 ở 63 nằm trong B2. Lệch là hai
     file đang nói hai chuyện về cùng một điểm số. */
  ok(cefrThang === cefrRubric || cefrThang.startsWith(cefrRubric),
    `Bậc ${band} (GSE ${gse}) khớp dải ${cefrRubric}`,
    `thang mô tả xếp ${gse} vào ${cefrThang}, rubric gọi là ${cefrRubric}`);
}

/* ================= 7. Phủ chấm ================= */
nhom('7 · Part nào cần rubric thì có rubric');

const partCanRubric = new Set(
  allItems.filter(i => i.type === 'essay' || i.type === 'speaking').map(i => i.part));
for (const part of [...partCanRubric].sort()) {
  ok(!!R.PART_RUBRICS[part], `Part ${part} có câu chấm rubric và đã có rubric`,
    'có câu tự luận hoặc ghi âm nhưng chưa có thang chấm');
}
for (const part of Object.keys(R.PART_RUBRICS)) {
  ok(partCanRubric.has(part), `Rubric part ${part} có câu để chấm`,
    'có rubric nhưng ngân hàng chưa có câu nào thuộc part này');
}

/* ================= Kết quả ================= */
const tong = dat + hong;
const phanTram = Math.round((dat / tong) * 100);

console.log('\n' + '─'.repeat(60));
if (hong === 0) {
  console.log(`\x1b[32m✔ Học thuật đủ và nhất quán: ${dat}/${tong} mục đạt (100%).\x1b[0m`);
} else {
  console.log(`\x1b[31m✗ ${hong} mục chưa đạt\x1b[0m — hoàn tất ${dat}/${tong} (${phanTram}%).\n`);
  console.log('Cần làm:');
  thieu.forEach(t => console.log('  · ' + t));
}
console.log('─'.repeat(60) + '\n');

process.exit(hong ? 1 : 0);
