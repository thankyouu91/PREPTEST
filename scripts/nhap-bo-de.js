/**
 * Nhập năm bộ đề đầy đủ (server/data/vpet-forms.js) vào ngân hàng câu hỏi,
 * và dựng mỗi bộ thành một đề thi ngồi được.
 *
 * ---------------------------------------------------------------------------
 * KHÁC GÌ HAI LỆNH NHẬP CŨ
 *
 * `seedVpetItems()` và `nhap-kich-ban.js` chia đôi theo "part này có audio
 * không", vì đó là thứ quyết định chúng đi đường nào. Ở đây không cần chia:
 * một bộ đề là một đơn vị người ta ngồi làm, và lệnh này tự phân ra câu nào
 * cần dựng MP3 dựa vào blueprint chứ không dựa vào tệp nào chứa nó.
 *
 * Chạy lại được nhiều lần. Mỗi câu mang `ext_key` bằng chính ref của nó
 * (`f1-E3`), nên nhập lại sau khi sửa nội dung là cập nhật chứ không nhân đôi.
 *
 * ---------------------------------------------------------------------------
 * SỬA KỊCH BẢN THÌ HUỶ DUYỆT AUDIO
 *
 * Nếu kịch bản đọc đổi mà tệp MP3 cũ vẫn còn, câu hỏi đang khai nó đọc một
 * đằng còn tệp đọc một nẻo — và không ai phát hiện cho tới khi có thí sinh
 * nghe. Nên câu nào đổi kịch bản thì `audio_status` bị kéo về `none`, buộc
 * dựng lại và duyệt lại.
 *
 *   node scripts/nhap-bo-de.js            nhập thật
 *   node scripts/nhap-bo-de.js --thu      chỉ xem sẽ nhập gì
 *   node scripts/nhap-bo-de.js --bo=f3    chỉ một bộ
 */
'use strict';

const { q, tx, nowISO } = require('../server/db');
const FORMS = require('../server/data/vpet-forms');
const FORMATS = require('../server/data/exam-formats');

const args = process.argv.slice(2);
const THU = args.includes('--thu') || args.includes('--dry-run');
const CHI = (args.find(a => a.startsWith('--bo=')) || '').slice(5);

const C = { d: '\x1b[2m', b: '\x1b[1m', r: '\x1b[31m', g: '\x1b[32m', y: '\x1b[33m', x: '\x1b[0m' };

const SECTIONS = FORMATS.FORMATS.find(f => f.id === 'vpet-full').sections;
const PART_OF = {};
SECTIONS.forEach(s => {
  const m = /^Part ([A-J])\b/.exec(s.name);
  if (m) PART_OF[m[1]] = s;
});

const forms = FORMS.FORMS.filter(f => !CHI || f.id === CHI);
if (!forms.length) {
  console.error(`\nKhông có bộ đề nào tên "${CHI}". Có: ${FORMS.FORMS.map(f => f.id).join(', ')}\n`);
  process.exit(1);
}

/* Người tạo. Đề và câu hỏi đều ghi ai đưa vào, nên cần một tài khoản quản trị
   tồn tại — chạy trên CSDL chưa khởi tạo thì dừng ở đây chứ không ghi nửa vời. */
const admin = q.get('SELECT id FROM admins ORDER BY id LIMIT 1');
if (!admin) {
  console.error('\nChưa có tài khoản quản trị nào. Chạy server một lần để khởi tạo CSDL.\n');
  process.exit(1);
}

const at = nowISO();
let them = 0, capNhat = 0, doiKichBan = 0;
const theoPart = {};

console.log(`\n${C.b}Nhập bộ đề VPET${C.x}  ${C.d}${forms.length} bộ · ${forms.length * 55} câu${C.x}`);
console.log('─'.repeat(72));

if (THU) {
  for (const form of forms) {
    const items = FORMS.itemsOf(form.id);
    const audio = items.filter(i => i.script).length;
    console.log(`  ${form.id}  ${form.level}  ${String(items.length).padStart(3)} câu · ${audio} câu cần audio  ${C.d}${form.name}${C.x}`);
  }
  console.log(`\n  ${C.d}(--thu: chưa ghi gì)${C.x}\n`);
  process.exit(0);
}

tx(() => {
  for (const form of forms) {
    const items = FORMS.itemsOf(form.id);

    for (const it of items) {
      theoPart[it.part] = (theoPart[it.part] || 0) + 1;
      const tags = JSON.stringify(['vpet', 'part-' + it.part.toLowerCase(), 'form:' + form.id, 'level-' + it.level]);
      const daCo = q.get('SELECT id, audio_script FROM questions WHERE ext_key=?', it.ref);

      if (daCo) {
        /* Kịch bản đổi thì tệp MP3 cũ không còn khớp với chữ câu hỏi khai là
           nó đọc. Kéo về `none` để buộc dựng lại, và đếm ra để người chạy biết
           phải dựng lại bao nhiêu câu. */
        const doi = (daCo.audio_script || '') !== (it.script || '');
        if (doi && daCo.audio_script) doiKichBan++;
        q.run(
          `UPDATE questions SET skill=?, level=?, type=?, part=?, prompt=?, options_json=?,
             answer=?, explanation=?, tags_json=?, audio_script=?, key_points_json=?,
             status='active',
             audio_status = CASE WHEN ? THEN 'none' ELSE audio_status END
           WHERE id=?`,
          it.skill, it.level, it.type, it.part, it.prompt, JSON.stringify(it.options),
          it.answer, it.explanation, tags, it.script || null, JSON.stringify(it.keyPoints),
          doi ? 1 : 0, daCo.id);
        capNhat++;
      } else {
        q.run(
          `INSERT INTO questions
             (ext_key, family_id, skill, level, type, part, prompt, options_json, answer,
              explanation, tags_json, audio_script, key_points_json, audio_status, status,
              source, licence, created_at, created_by)
           VALUES (?, 'vpet', ?,?,?,?,?,?,?,?,?,?,?, 'none', 'active', ?, ?, ?, ?)`,
          it.ref, it.skill, it.level, it.type, it.part, it.prompt,
          JSON.stringify(it.options), it.answer, it.explanation, tags,
          it.script || null, JSON.stringify(it.keyPoints),
          'written for this platform', 'proprietary', at, admin.id);
        them++;
      }
    }

    /* ---- Đề thi: mỗi bộ một đề, các part đúng thứ tự blueprint ----
       Dựng lại phần section mỗi lần chạy. Câu hỏi thì cập nhật tại chỗ vì lượt
       thi cũ trỏ vào id của chúng; section thì không ai trỏ tới ngoài chính đề
       này, nên xoá và dựng lại là cách chắc chắn nhất để thứ tự part và danh
       sách câu khớp đúng nội dung tệp. */
    const testId = 'vpet-' + form.id;
    const tong = SECTIONS.reduce((n, s) => n + (s.minutes || 0), 0);
    const daCoTest = q.get('SELECT id FROM tests WHERE id=?', testId);

    if (daCoTest) {
      q.run(`UPDATE tests SET title=?, level=?, duration_min=?, updated_at=? WHERE id=?`,
        form.name, form.level, tong, at, testId);
      q.run('DELETE FROM section_items WHERE section_id IN (SELECT id FROM sections WHERE test_id=?)', testId);
      q.run('DELETE FROM sections WHERE test_id=?', testId);
    } else {
      q.run(
        `INSERT INTO tests (id, family_id, title, level, duration_min, scoring, guide_json,
           status, build_mode, created_at, updated_at, created_by)
         VALUES (?, 'vpet', ?, ?, ?, ?, ?, 'draft', 'manual', ?, ?, ?)`,
        testId, form.name, form.level, tong,
        FORMATS.FORMATS.find(f => f.id === 'vpet-full').scoring,
        JSON.stringify(FORMATS.FORMATS.find(f => f.id === 'vpet-full').guide || []),
        at, at, admin.id);
    }

    SECTIONS.forEach((sec, i) => {
      const p = (/^Part ([A-J])\b/.exec(sec.name) || [])[1];
      if (!p) return;
      q.run('INSERT INTO sections (test_id, name, skill, type, minutes, sort, part) VALUES (?,?,?,?,?,?,?)',
        testId, sec.name, sec.skill, sec.type, sec.minutes, i, p);
      const sid = q.val('SELECT id FROM sections WHERE test_id=? ORDER BY id DESC LIMIT 1', testId);
      FORMS.itemsOf(form.id).filter(x => x.part === p).forEach((x, j) => {
        const qid = q.val('SELECT id FROM questions WHERE ext_key=?', x.ref);
        if (qid) q.run('INSERT OR IGNORE INTO section_items (section_id, question_id, sort) VALUES (?,?,?)', sid, qid, j);
      });
    });
  }
});

for (const form of forms) {
  const n = q.val(
    `SELECT COUNT(*) FROM section_items si JOIN sections s ON s.id=si.section_id WHERE s.test_id=?`,
    'vpet-' + form.id);
  const audio = q.val(
    `SELECT COUNT(*) FROM questions WHERE ext_key LIKE ? AND audio_script IS NOT NULL`, form.id + '-%');
  const mau = n === 55 ? C.g : C.r;
  console.log(`  ${form.id}  ${form.level}  ${mau}${String(n).padStart(2)}/55 câu trong đề${C.x} · ${audio} câu có kịch bản  ${C.d}${form.name}${C.x}`);
}

console.log('\n' + '─'.repeat(72));
console.log(`  ${C.g}${them} câu thêm mới${C.x} · ${capNhat} câu cập nhật`
  + (doiKichBan ? ` · ${C.y}${doiKichBan} câu đổi kịch bản, phải dựng lại MP3${C.x}` : ''));
console.log('  theo part: ' + Object.keys(theoPart).sort().map(p => p + ' ' + theoPart[p]).join(' · '));
console.log(`\n  Các đề đang ở trạng thái ${C.b}draft${C.x}. Bước tiếp theo:`);
console.log(`  ${C.d}node scripts/dung-audio-kokoro.mjs   dựng MP3 cho các part E F G H J`);
console.log(`  rồi vào Quản trị → Ngân hàng câu hỏi để nghe và duyệt.${C.x}`);
console.log('─'.repeat(72) + '\n');
