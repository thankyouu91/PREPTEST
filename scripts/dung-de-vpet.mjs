/**
 * Dựng lại đề luyện VPET từ bể câu hỏi, theo đúng blueprint.
 *
 * ---------------------------------------------------------------------------
 * VÌ SAO CẦN MỘT LỆNH RIÊNG
 *
 * Đề mẫu trong `seed()` được dựng từ thời blueprint còn bốn phần. Sau khi dựng
 * lại kho theo bản đặc tả của chủ dự án, nó còn đúng bốn section rỗng và vẫn
 * mang trạng thái `published` — tức một thí sinh bấm vào sẽ mở ra một bài thi
 * không có câu nào. Một đề rỗng mà vẫn "đã phát hành" là thứ tệ hơn không có
 * đề: nó tiêu một lượt thi của người ta để đổi lấy một màn hình trắng.
 *
 * Lệnh này dựng lại từ đầu: mười section A–J đúng tên, đúng kỹ năng, đúng số
 * phút blueprint khai, rồi gắn câu theo thứ tự khoá. Chạy lại được — nó xoá
 * sạch section cũ của đề rồi dựng lại, nên không bao giờ sinh ra đề lai giữa
 * hai lần chạy.
 *
 * ---------------------------------------------------------------------------
 * THỨ TỰ CÂU KHÔNG ĐƯỢC NGẪU NHIÊN
 *
 * Part C và G gắn nhiều câu vào một ngữ liệu. Nếu xáo thứ tự thì hai câu của
 * cùng một bài đọc có thể rơi về hai đầu part, và màn làm bài sẽ in lại đoạn
 * văn hai lần với hai đồng hồ ba phút — khác hẳn thứ đặc tả mô tả. Nên câu xếp
 * theo khoá, và khoá đã mang sẵn thứ tự tác giả định.
 *
 *   node scripts/dung-de-vpet.mjs
 *   node scripts/dung-de-vpet.mjs --de=vpet-b1-01
 */
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const { q, db, tx, nowISO } = require('../server/db.js');
const FORMATS = require('../server/data/exam-formats.js');

const args = process.argv.slice(2);
const val = f => { const a = args.find(x => x.startsWith(f + '=')); return a ? a.slice(f.length + 1) : null; };
const DE = val('--de') || 'vpet-b1-01';
const C = { d: '\x1b[2m', b: '\x1b[1m', g: '\x1b[32m', r: '\x1b[31m', y: '\x1b[33m', x: '\x1b[0m' };

const test = q.get('SELECT * FROM tests WHERE id=?', DE);
if (!test) {
  console.error(`\n  ${C.r}Không có đề nào mang mã ${DE}.${C.x}\n`);
  process.exit(1);
}

const fmt = FORMATS.FORMATS.find(f => f.id === 'vpet-full');
const at = nowISO();

console.log(`\n${C.b}Dựng đề ${DE}${C.x}  ${C.d}${test.title}${C.x}`);
console.log('─'.repeat(72));

let thieu = 0, gan = 0;

tx(() => {
  /* Xoá sạch rồi dựng lại. Gắn thêm vào section cũ sẽ để lại những section của
     blueprint đời trước, và chúng vẫn hiện ra trong lượt thi. */
  db.prepare(`DELETE FROM section_items WHERE section_id IN
              (SELECT id FROM sections WHERE test_id=?)`).run(DE);
  db.prepare('DELETE FROM sections WHERE test_id=?').run(DE);

  fmt.sections.forEach((s, i) => {
    const r = db.prepare(`INSERT INTO sections (test_id, name, skill, type, minutes, sort, part)
                          VALUES (?,?,?,?,?,?,?)`)
      .run(DE, s.name, s.skill, s.type, s.minutes, i, s.part);
    const sectionId = Number(r.lastInsertRowid);

    const cau = q.all(
      `SELECT id, ext_key FROM questions
        WHERE family_id='vpet' AND part=? AND status='active'
        ORDER BY ext_key`, s.part);

    if (cau.length < s.items) thieu += s.items - cau.length;

    cau.slice(0, s.items).forEach((c, k) => {
      db.prepare('INSERT INTO section_items (section_id, question_id, sort) VALUES (?,?,?)')
        .run(sectionId, c.id, k);
      gan++;
    });

    const du = cau.length >= s.items;
    console.log(`  Part ${s.part}  ${String(Math.min(cau.length, s.items)).padStart(2)}/${s.items} câu` +
      `  ${C.d}${s.minutes} phút · ${s.skill}${C.x}` +
      (du ? '' : `  ${C.r}thiếu ${s.items - cau.length}${C.x}`));
  });

  db.prepare('UPDATE tests SET duration_min=?, updated_at=? WHERE id=?')
    .run(FORMATS.totalMinutes(fmt), at, DE);
});

console.log('─'.repeat(72));
console.log(`  ${thieu ? C.r : C.g}${gan} câu đã gắn${C.x}` +
  (thieu ? ` · ${C.r}thiếu ${thieu} câu${C.x}` : '') +
  `  ${C.d}${FORMATS.totalMinutes(fmt)} phút${C.x}`);

/* Trạng thái phát hành KHÔNG đụng vào. Cổng phát hành đòi audio đã có người
   nghe và duyệt, và một lệnh dựng đề tự ý bật `published` sẽ đi vòng qua đúng
   cái cổng ấy. */
const chuaDuyet = q.val(
  `SELECT COUNT(*) c FROM questions WHERE family_id='vpet'
     AND audio_key IS NOT NULL AND audio_key<>'' AND audio_status<>'approved'`);
if (chuaDuyet) {
  console.log(`\n  ${C.y}${chuaDuyet} bản ghi chưa ai nghe và duyệt.${C.x}`);
  console.log(`  ${C.d}Vào Quản trị → Ngân hàng câu hỏi để nghe rồi bấm Duyệt.`);
  console.log(`  Cổng phát hành đòi điều đó, nên lệnh này không tự bật được.${C.x}`);
}
console.log('');
