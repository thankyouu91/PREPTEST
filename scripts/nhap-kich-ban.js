/**
 * Nhập kịch bản audio VPET vào ngân hàng câu hỏi.
 *
 * Đọc server/data/vpet-scripts.js, dựng câu hỏi tương ứng và gắn sẵn kịch bản
 * đọc vào từng câu. Sau bước này, vào Quản trị → Ngân hàng câu hỏi, mở một câu
 * bất kỳ có audio, chọn giọng rồi bấm Dựng MP3.
 *
 * Chạy được nhiều lần: mỗi câu mang một tag `ref:E1-L1`, câu đã có thì bỏ qua,
 * nên nhập lại sau khi sửa nội dung chỉ thêm phần mới chứ không nhân đôi kho.
 *
 *   node scripts/nhap-kich-ban.js            nhập thật
 *   node scripts/nhap-kich-ban.js --thu      chỉ xem sẽ nhập gì, không ghi
 *   node scripts/nhap-kich-ban.js --lam-moi  ghi đè kịch bản của câu đã có
 *
 * `--lam-moi` huỷ trạng thái đã duyệt của những câu bị sửa kịch bản: tệp MP3
 * cũ không còn khớp với chữ mà câu hỏi khai là nó đọc.
 */
'use strict';

const { q, nowISO, jparse } = require('../server/db');
const { allItems } = require('../server/data/vpet-scripts');
const { parseScript } = require('../server/script-markup');

const args = process.argv.slice(2);
const THU = args.includes('--thu') || args.includes('--dry-run');
const LAM_MOI = args.includes('--lam-moi') || args.includes('--refresh');

const items = allItems();

/* Kiểm tra trước khi ghi: một kịch bản hỏng ký hiệu ngắt nghỉ mà lọt vào kho
   thì phải tới lúc dựng MP3 mới lộ, và lúc đó đã tốn tiền rồi. */
const loi = [];
let tongKyTu = 0, tongGiay = 0;
const theoPart = {};

for (const it of items) {
  if (!it.script || !it.script.trim()) loi.push(`${it.ref}: kịch bản rỗng`);
  if (it.type === 'mcq') {
    if (it.options.length < 2) loi.push(`${it.ref}: câu trắc nghiệm cần ít nhất 2 phương án`);
    else if (!it.options.includes(it.answer)) loi.push(`${it.ref}: đáp án không nằm trong các phương án`);
    else if (new Set(it.options).size !== it.options.length) loi.push(`${it.ref}: có phương án trùng nhau`);
  }
  if (it.type === 'gap' && !it.answer) loi.push(`${it.ref}: câu điền từ chưa có đáp án`);

  const p = parseScript(it.script);
  if (p.stats.capped) loi.push(`${it.ref}: quá nhiều chỗ nghỉ, nên tách thành nhiều câu`);

  tongKyTu += p.stats.billedChars;
  tongGiay += p.stats.estimatedMs / 1000;
  const k = `${it.part}-L${it.level}`;
  theoPart[k] = theoPart[k] || { n: 0, chars: 0, secs: 0 };
  theoPart[k].n++;
  theoPart[k].chars += p.stats.billedChars;
  theoPart[k].secs += p.stats.estimatedMs / 1000;
}

if (loi.length) {
  console.error('\n✗ Nội dung có lỗi, chưa nhập gì cả:\n');
  loi.forEach(l => console.error('  · ' + l));
  process.exit(1);
}

console.log(`\n${items.length} kịch bản, không có lỗi nội dung.\n`);
console.log('  Part      Số câu   Ký tự tính tiền   Thời lượng ước tính');
console.log('  ' + '─'.repeat(56));
for (const k of Object.keys(theoPart).sort()) {
  const t = theoPart[k];
  console.log('  ' + k.padEnd(10) + String(t.n).padStart(5) +
    String(Math.round(t.chars)).padStart(17) +
    (Math.round(t.secs) + ' giây').padStart(22));
}
console.log('  ' + '─'.repeat(56));
console.log('  ' + 'Tổng'.padEnd(10) + String(items.length).padStart(5) +
  String(Math.round(tongKyTu)).padStart(17) +
  (Math.round(tongGiay / 60) + ' phút').padStart(22));
console.log('\n  Số ký tự trên là hoá đơn ElevenLabs cho một lần dựng toàn bộ,');
console.log('  đã cộng cả thẻ ngắt nghỉ. Sửa kịch bản rồi dựng lại chỉ tính');
console.log('  riêng câu bị sửa — băm nội dung lo phần đó.\n');

if (THU) {
  console.log('(--thu: không ghi gì vào CSDL)\n');
  process.exit(0);
}

const admin = q.get("SELECT id FROM admins ORDER BY id LIMIT 1");
if (!admin) {
  console.error('Chưa có tài khoản quản trị nào. Chạy server một lần rồi nhập lại.');
  process.exit(1);
}

let them = 0, capNhat = 0, boQua = 0;

for (const it of items) {
  const tag = 'ref:' + it.ref;
  /* Tìm theo tag chứ không theo nội dung: nội dung sửa được, tag thì không. */
  const daCo = q.get(
    "SELECT id, audio_script, audio_status FROM questions WHERE family_id='vpet' AND tags_json LIKE ?",
    '%"' + tag + '"%');

  if (daCo && !LAM_MOI) { boQua++; continue; }

  const tags = JSON.stringify([tag, 'part-' + it.part, 'level-' + it.level, 'seed']);

  if (daCo) {
    const doi = daCo.audio_script !== it.script;
    q.run(
      `UPDATE questions SET skill=?, level=?, type=?, part=?, prompt=?, options_json=?, answer=?,
         explanation=?, tags_json=?, audio_script=?, key_points_json=?,
         audio_status = CASE WHEN ? AND audio_status='approved' THEN 'none' ELSE audio_status END
       WHERE id=?`,
      it.skill, it.cefr, it.type, it.part, it.prompt, JSON.stringify(it.options), it.answer,
      it.explanation, tags, it.script, JSON.stringify(it.keyPoints), doi ? 1 : 0, daCo.id);
    capNhat++;
  } else {
    q.run(
      `INSERT INTO questions
         (family_id, skill, level, type, part, prompt, options_json, answer, explanation,
          tags_json, audio_script, key_points_json, audio_status, status, created_at, created_by)
       VALUES ('vpet',?,?,?,?,?,?,?,?,?,?,?,'none','draft',?,?)`,
      it.skill, it.cefr, it.type, it.part, it.prompt, JSON.stringify(it.options), it.answer,
      it.explanation, tags, it.script, JSON.stringify(it.keyPoints), nowISO(), admin.id);
    them++;
  }
}

console.log(`Đã thêm ${them} câu, cập nhật ${capNhat}, bỏ qua ${boQua} câu đã có.`);
console.log('\nTất cả vào kho ở trạng thái "draft" — duyệt nội dung trước khi phát hành.');
console.log('Bước tiếp: Quản trị → Ngân hàng câu hỏi → lọc kỹ năng Nghe hoặc Nói');
console.log('           → mở một câu → chọn giọng → Dựng MP3 → nghe → Duyệt.\n');
