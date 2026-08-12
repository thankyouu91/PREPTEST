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
 * Chín nhóm kiểm, theo thứ tự phụ thuộc:
 *
 *   1. Blueprint      bể đủ câu để dựng trọn một đề, từng part một
 *   2. Mô tả năng lực thang liền mạch, không hở bậc nào
 *   3. Rubric         đủ tiêu chí, trọng số tròn 100, đủ 7 bậc
 *   4. Ôn tập         mỗi tiêu chí có lời khuyên cho cả ba mức
 *   5. Liên kết       mọi đường dẫn trang học đều tồn tại thật
 *   6. Nhất quán      mốc GSE của rubric nằm đúng dải bậc của mô tả
 *   7. Phủ chấm       part nào cần rubric thì có rubric, và ngược lại
 *   8. Cá nhân hoá    mục tiêu phát âm và bộ từ vựng đủ và đúng chỗ
 *   9. Chấm bằng AI   model chỉ trả bậc, không có chỗ nào xuất được thang
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

/* Hai nguồn nội dung, hai hình dạng khác nhau:
     vpet-scripts.js  các part có audio, gắn level VPET 1/2 qua `level`
     vpet-items.js    các part không cần audio, gắn bậc CEFR qua `level`
   Gộp về một hình dạng chung ở đây, và chỉ giữ những trường vòng kiểm cần. */
const allItems = [
  ...SCRIPTS.allItems().map(i => ({ part: i.part, type: i.type, skill: i.skill, cefr: i.cefr })),
  ...ITEMS.rows().map(i => ({ part: i.part, type: i.type, skill: i.skill, cefr: i.level }))
];

/* ================= 1. Blueprint ================= */
nhom('1 · Ngân hàng đủ dựng được đề');

const BLUEPRINT = (() => {
  const fmt = FORMATS.FORMATS.find(f => f.id === 'vpet-full');
  const out = {};
  fmt.sections.forEach(s => {
    const m = /^Part ([A-J])\b/.exec(s.name);
    if (m) out[m[1]] = s.items;
  });
  return out;
})();

/* Ngân hàng là một *bể*, không phải một đề cố định: bộ sinh đề rút số câu
   blueprint yêu cầu từ những gì part đó đang có. Nên câu hỏi đúng không phải
   "có đúng 55 câu chưa" mà "rút được một đề đầy đủ chưa" — và với part nào
   muốn hai lượt thi khác nhau thì cần gấp đôi. Quy tắc nông/sâu theo từng bậc
   do scripts/test-items.mjs giữ; ở đây chỉ kiểm phần học thuật: đủ để dựng. */
const dem = {};
allItems.forEach(i => { dem[i.part] = (dem[i.part] || 0) + 1; });

let thieuBaoNhieu = 0;
for (const [part, can] of Object.entries(BLUEPRINT)) {
  const co = dem[part] || 0;
  ok(co >= can, `Part ${part}: đủ ${can} câu để dựng một đề`,
    co >= can ? null : `đang có ${co}, thiếu ${can - co}`);
  if (co < can) thieuBaoNhieu += can - co;
}

const tongBe = Object.values(dem).reduce((a, b) => a + b, 0);
const canTong = Object.values(BLUEPRINT).reduce((a, b) => a + b, 0);
ok(thieuBaoNhieu === 0, `Dựng được trọn một đề ${canTong} câu`,
  thieuBaoNhieu ? `còn thiếu ${thieuBaoNhieu} câu` : null);
console.log(`  ${'\x1b[2m'}bể hiện có ${tongBe} câu cho blueprint ${canTong} câu${'\x1b[0m'}`);

/* Part nào chỉ vừa đủ thì lượt thi lại sẽ lặp nguyên si — không phải lỗi,
   nhưng là việc còn bỏ ngỏ và đáng nói ra thay vì để người đọc tự phát hiện. */
const vuaDu = Object.entries(BLUEPRINT)
  .filter(([p, can]) => (dem[p] || 0) >= can && (dem[p] || 0) < can * 2)
  .map(([p, can]) => `${p} (${dem[p]}/${can})`);
if (vuaDu.length && !GON) {
  console.log('  \x1b[33m·\x1b[0m Part chưa đủ cho hai lượt thi khác nhau: ' + vuaDu.join(', '));
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

/* ================= 8. Nội dung cá nhân hoá ================= */
nhom('8 · Phát âm và từ vựng cá nhân hoá');

const PRON = require('../server/data/pronunciation.js');
const VOCAB = require('../server/data/vocabulary.js');
const PLAN = require('../server/study-plan.js');

const cacTieuChi = new Set(Object.keys(R.CRITERIA));

for (const t of PRON.TARGETS) {
  const laTieuChi = t.affects.filter(a => !cacTieuChi.has(a));
  ok(laTieuChi.length === 0, `Phát âm ${t.id}: ảnh hưởng tới tiêu chí có thật`, laTieuChi.join(', '));
  ok(!!PRON.COST[t.cost], `Phát âm ${t.id}: mức thiệt hại hợp lệ`, t.cost);
  ok(t.gse[0] < t.gse[1] && t.gse[0] >= 10 && t.gse[1] <= 90,
    `Phát âm ${t.id}: dải GSE hợp lệ`, t.gse.join('–'));
  ok(t.pairs.length >= 2 && !!t.drill && !!t.why,
    `Phát âm ${t.id}: có cặp từ, bài tập và lý do`);
}

/* Mục tiêu bị chấm dưới tên khác phải nói rõ điều đó, nếu không report sẽ đẩy
   người học sang trang ngữ pháp để luyện thứ họ đã biết. */
for (const c of ['grammar', 'accuracy']) {
  ok(PRON.hidesAs(c).length > 0, `Có lỗi phát âm bị chấm thành lỗi ${c}, và đã ghi chú`);
}
ok(PRON.TARGETS.filter(t => t.cost === 'high').length >= 4,
  'Đủ mục tiêu mức thiệt hại cao để xếp trước cho người mới');

for (const s of VOCAB.SETS) {
  ok(s.items.length >= 6, `Từ vựng ${s.id}: đủ số mục`, `đang có ${s.items.length}`);
  ok(s.parts.every(p => R.PART_RUBRICS[p] || /^[A-J]$/.test(p)),
    `Từ vựng ${s.id}: trỏ tới part có thật`, s.parts.join(', '));
  ok(s.items.every(i => i.word && i.gloss), `Từ vựng ${s.id}: mục nào cũng có từ và nghĩa`);

  /* Từ nhiều âm tiết mà không đánh dấu trọng âm là dạy người học nói một từ
     không ai nhận ra — đúng lỗi mà chính pronunciation.js xếp mức cao. */
  const syl = w => { const m = w.toLowerCase().replace(/[^a-z]/g, '').replace(/e$/, '').match(/[aeiouy]+/g); return m ? m.length : 0; };
  const thieuTrongAm = s.items.filter(i =>
    !i.stress && i.word.split(' ').some(t => syl(t) >= 2 && !/ed$/.test(t)));
  ok(thieuTrongAm.length === 0, `Từ vựng ${s.id}: từ nhiều âm tiết đều có trọng âm`,
    thieuTrongAm.map(i => i.word).join(', '));

  /* Trọng âm phải nằm ở trường stress, không nằm lẫn trong trường word. */
  const lanCaps = s.items.filter(i => i.word.split(' ').some((t, k) => {
    if (/^I('[a-z]+)?$/.test(t)) return false;
    const caps = t.split('').filter(c => c >= 'A' && c <= 'Z').length;
    if (!caps) return false;
    return !(k === 0 && caps === 1 && t[0] >= 'A' && t[0] <= 'Z');
  }));
  ok(lanCaps.length === 0, `Từ vựng ${s.id}: trường word không lẫn dấu trọng âm`,
    lanCaps.map(i => i.word).join(', '));
}

ok(VOCAB.SETS.filter(s => s.kind === 'function').length >= VOCAB.SETS.filter(s => s.kind === 'topic').length,
  'Bộ theo chức năng nhiều hơn bộ theo chủ đề', 'chức năng lặp lại ở mọi đề, chủ đề thì không');

/* Kế hoạch phải chạy được ở mọi mức, kể cả hai đầu thang. Người ở mức thấp
   nhất và cao nhất là hai nhóm dễ bị bỏ rơi nhất trong mọi hệ thống gợi ý. */
for (const gse of [15, 30, 50, 70, 88]) {
  let ke = null, loi = '';
  try {
    ke = PLAN.build({
      skill: 'speaking', gse,
      parts: { J: { content: 3, fluency: 3, coherence: 3, pronunciation: 2, vocabulary: 3, grammar: 3 } }
    });
  } catch (e) { loi = e.message; }
  ok(ke && ke.thisWeek.length > 0, `Kế hoạch ở GSE ${gse} luôn có ít nhất một việc làm được`, loi);
  if (ke) {
    ok(ke.thisWeek.every(v => v.do && v.do.length > 15), `Kế hoạch GSE ${gse}: việc nào cũng cụ thể`);
    const dan = ke.thisWeek.map(v => v.study).filter(Boolean);
    ok(dan.every(u => routeCoThat.has(u)), `Kế hoạch GSE ${gse}: đường dẫn học đều tồn tại`, dan.join(', '));
  }
}

/* Người giỏi đều mọi mặt vẫn phải nhận được lời khuyên, không được nhận một
   trang trống — đây là trường hợp hệ thống gợi ý hay im lặng nhất. */
const gioi = PLAN.build({
  skill: 'speaking', gse: 80,
  parts: { J: { content: 6, fluency: 6, coherence: 6, pronunciation: 6, vocabulary: 6, grammar: 6 } }
});
ok(gioi.thisWeek.length > 0, 'Người không yếu chỗ nào vẫn nhận được việc để làm');

/* Kết luận "điểm ngữ pháp có thể không phải lỗi ngữ pháp" chỉ được nói khi cả
   hai tiêu chí cùng yếu — nói bừa sẽ khiến người học bỏ qua lỗi ngữ pháp thật. */
const caiYeu = PLAN.build({
  skill: 'speaking', gse: 45,
  parts: { J: { content: 3, fluency: 3, coherence: 3, pronunciation: 1, vocabulary: 3, grammar: 1 } }
});
ok(caiYeu.hiddenCauses.length > 0, 'Yếu cả phát âm lẫn ngữ pháp thì nêu khả năng nguyên nhân ẩn');

const chiNguPhap = PLAN.build({
  skill: 'speaking', gse: 45,
  parts: { J: { content: 3, fluency: 3, coherence: 3, pronunciation: 6, vocabulary: 3, grammar: 1 } }
});
ok(chiNguPhap.hiddenCauses.length === 0,
  'Phát âm tốt mà ngữ pháp yếu thì không đổ cho phát âm');

/* ================= 9. Hướng dẫn chấm cho AI ================= */
nhom('9 · Hướng dẫn chấm cho AI');

const MG = require('../server/marking-guide.js');

/* Ranh giới quan trọng nhất: model chấm bậc, nền tảng quy ra số. Nếu schema
   hở một trường để model nhét điểm thang vào thì cả lập luận sụp. */
for (const part of MG.MARKED_PARTS) {
  const sch = MG.responseSchema(part);
  const json = JSON.stringify(sch);
  ok(!/\bgse\b/i.test(json) && !/\bcefr\b/i.test(json),
    `Part ${part}: schema không có chỗ cho model xuất thang GSE hay CEFR`);
  ok(sch.additionalProperties === false,
    `Part ${part}: schema đóng, trường lạ làm hỏng validate`);

  const nhac = MG.systemPrompt(part);
  ok(!/\bGSE\b/.test(nhac), `Part ${part}: lời nhắc không nhắc tới thang GSE`);
  ok(/quotation/i.test(nhac), `Part ${part}: lời nhắc đòi trích dẫn bài làm`);

  /* Mọi bậc của mọi tiêu chí phải có mặt trong lời nhắc — thiếu một bậc là
     chỗ giám khảo máy tự nghĩ ra tiêu chuẩn của riêng nó. */
  const rub = R.PART_RUBRICS[part];
  const thieu = Object.keys(rub.criteria).filter(n =>
    R.CRITERIA[n].bands.some(b => !nhac.includes(b.descriptor)));
  ok(thieu.length === 0, `Part ${part}: lời nhắc trải đủ mọi bậc của mọi tiêu chí`, thieu.join(', '));

  const thieuBc = Object.keys(rub.criteria).filter(n =>
    R.CRITERIA[n].bands.some(b => !nhac.includes(b.evidence)));
  ok(thieuBc.length === 0, `Part ${part}: lời nhắc có đủ dấu hiệu quan sát của từng bậc`, thieuBc.join(', '));
}

/* Quy đổi bậc → thang phải đơn điệu và nằm trong thang. Một chỗ lệch ở đây là
   một chỗ hai thí sinh làm khác nhau nhận cùng một điểm, hoặc ngược lại. */
let truoc = -1, donDieu = true;
for (let b = 0.2; b <= 6; b += 0.2) {
  const g = MG.bandToGse(b);
  if (g == null) { donDieu = false; break; }
  if (g < truoc) { donDieu = false; break; }
  if (g < MG.SCALE_MIN || g > MG.SCALE_MAX) { donDieu = false; break; }
  truoc = g;
}
ok(donDieu, 'Quy đổi bậc → thang tăng đơn điệu và luôn nằm trong 10–90');
ok(MG.bandToGse(0) === null, 'Bậc 0 không có vị trí trên thang');

/* Mốc của rubric và bảng bậc của bộ mô tả phải nói cùng một chuyện. */
for (const [bac, gse] of Object.entries(R.BAND_GSE)) {
  if (gse == null) continue;
  const quaDoi = MG.bandToGse(Number(bac));
  ok(quaDoi === gse, `Bậc ${bac} quy đổi đúng về mốc ${gse} đã công bố`, String(quaDoi));
}

/* Điểm lẻ không được rơi lên C2 — chín khe giữa các bậc là chỗ lỗi cũ nằm. */
const kheLe = [21.5, 29.5, 35.5, 42.5, 50.5, 58.2, 66.5, 75.5, 84.5];
ok(kheLe.every(g => D.bandFor(g) !== 'C2'),
  'Điểm lẻ giữa hai bậc không bị xếp nhầm lên C2',
  kheLe.filter(g => D.bandFor(g) === 'C2').join(', '));
ok(kheLe.every(g => D.positionInBand(g) > 0), 'Điểm lẻ vẫn có vị trí trong bậc');

ok(MG.REFUSALS.length >= 5, 'Có đủ điều kiện từ chối chấm');
ok(MG.REFUSALS.every(r => r.code && r.when && r.note), 'Mỗi điều kiện từ chối nói rõ khi nào và vì sao');
ok(MG.NEVER.length >= 5, 'Có đủ danh sách thứ không được ảnh hưởng tới điểm');

/* Part nào có rubric thì AI phải chấm được, và ngược lại. */
ok(MG.MARKED_PARTS.length === Object.keys(R.PART_RUBRICS).length,
  'Danh sách part AI chấm khớp đúng danh sách part có rubric');

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
