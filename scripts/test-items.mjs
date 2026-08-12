/**
 * Kiểm thử ngân hàng đề VPET: nội dung có khớp blueprint không.
 *
 * Chạy khi server đã bật: node scripts/test-items.mjs
 *
 * Trọng tâm là những lỗi mà đọc bằng mắt sẽ bỏ sót: phần nào lệch kỹ năng hoặc
 * dạng câu so với bảng phần thi, câu điền từ có đáp án nhiều từ, câu trắc
 * nghiệm có đáp án không nằm trong các phương án, hoặc hai phương án trùng nhau.
 */
import { readFileSync } from 'node:fs';

const BASE = process.env.BASE || 'http://127.0.0.1:3000';
let pass = 0, fail = 0;
const ok = (c, name, detail) => {
  if (c) { pass++; console.log('✓ ' + name); return; }
  fail++;
  console.log('✗ ' + name + (detail === undefined ? '' : '  → ' + detail));
};
const head = t => console.log('\n\x1b[1m== ' + t + ' ==\x1b[0m');

/* Bảng phần thi là nguồn sự thật: đọc thẳng từ blueprint chứ không chép lại số
   liệu vào đây, để bài test không thể "đúng" khi blueprint đã đổi. */
const { FORMATS } = await import('../server/data/exam-formats.js').then(m => m.default || m);
const blueprint = FORMATS.find(f => f.id === 'vpet-full');
const partOf = {};
for (const s of blueprint.sections) partOf[s.part] = s;

const items = (await import('../server/data/vpet-items.js').then(m => m.default || m)).rows();

try {
  head('Ngân hàng khớp blueprint');

  const AUDIO_FREE = ['A', 'B', 'C', 'D', 'I'];
  const covered = [...new Set(items.map(i => i.part))].sort();
  ok(covered.join('') === AUDIO_FREE.join(''),
    'Chỉ có các phần không cần audio, đủ cả năm phần', covered.join(''));

  /* Ngân hàng là một POOL chứ không phải một đề cố định: trình sinh đề bốc đúng
     số câu blueprint yêu cầu từ những gì phần đó đang có. Nên phép kiểm không
     phải "đúng bằng" mà là "đủ, và chia hết" — pool bằng đúng k lần số câu mỗi
     đề thì phần đó cho được k lượt thi khác nhau. */
  const sittings = {};
  for (const letter of AUDIO_FREE) {
    const mine = items.filter(i => i.part === letter);
    const want = partOf[letter];
    sittings[letter] = mine.length / want.items;
    ok(mine.length >= want.items,
      'Phần ' + letter + ' đủ ít nhất ' + want.items + ' câu cho một lượt thi', String(mine.length));
    ok(Number.isInteger(sittings[letter]),
      'Phần ' + letter + ' có số câu chia hết cho ' + want.items,
      mine.length + '/' + want.items);
    ok(mine.every(i => i.skill === want.skill),
      'Phần ' + letter + ' đúng kỹ năng ' + want.skill);
    ok(mine.every(i => want.types.includes(i.type)),
      'Phần ' + letter + ' đúng dạng câu ' + want.types.join('/'));
  }

  /* Mọi phần phải cho cùng một số lượt thi. Nếu phần A đủ hai đề mà phần B chỉ
     đủ một thì lần thi lại khác ở A và lặp nguyên ở B — tệ hơn là chỉ có một đề,
     vì nhìn thì tưởng đề mới. */
  const counts = [...new Set(Object.values(sittings))];
  ok(counts.length === 1, 'Các phần cho cùng số lượt thi khác nhau', JSON.stringify(sittings));
  ok(counts[0] >= 1, 'Đủ ít nhất một lượt thi trọn vẹn', String(counts[0]));

  head('Chất lượng từng câu');

  const keys = items.map(i => i.key);
  ok(new Set(keys).size === keys.length, 'Không có khoá trùng nhau');
  ok(items.every(i => /^vpet-[a-j]-\d{2}$/.test(i.key)), 'Khoá theo đúng dạng vpet-<phần>-<số>');
  ok(items.every(i => ['A1', 'A2', 'B1', 'B2', 'C1', 'C2'].includes(i.level)), 'Bậc nằm trong thang CEFR');
  ok(items.every(i => i.prompt.trim().length >= 20), 'Đề bài nào cũng có nội dung thật');
  ok(items.every(i => i.explanation.trim().length >= 20), 'Câu nào cũng có ghi chú cho người chấm');
  ok(items.every(i => i.source && i.licence), 'Câu nào cũng ghi nguồn và giấy phép');

  /* Điền từ: đáp án phải là MỘT từ. Đáp án hai từ nghĩa là chỗ trống thật ra
     nhận nhiều thứ, và người học gõ đúng một nửa vẫn bị chấm sai. */
  const gaps = items.filter(i => i.type === 'gap');
  const multi = gaps.filter(i => i.answer.split('|').some(v => v.trim().split(/\s+/).length !== 1));
  ok(multi.length === 0, 'Đáp án điền từ đều đúng một từ', multi.map(i => i.key).join(', '));
  ok(gaps.every(i => i.prompt.includes('___')), 'Câu điền từ nào cũng có chỗ trống trong đề');
  ok(gaps.every(i => i.answer.trim()), 'Câu điền từ nào cũng có đáp án');

  /* Trắc nghiệm: đáp án phải nằm trong các phương án, và không phương án nào
     trùng nhau — hai phương án giống hệt thì câu đó không còn đo được gì. */
  const mcqs = items.filter(i => i.type === 'mcq');
  ok(mcqs.every(i => i.options.length === 4), 'Câu trắc nghiệm nào cũng có đúng 4 phương án');
  ok(mcqs.every(i => i.options.includes(i.answer)), 'Đáp án luôn nằm trong các phương án');
  ok(mcqs.every(i => new Set(i.options).size === i.options.length), 'Không phương án nào trùng nhau');
  ok(mcqs.every(i => i.options.every(o => o.trim())), 'Không phương án nào bỏ trống');

  /* Tự luận và nói chấm bằng rubric: để sẵn đáp án là sai mô hình, marking.js
     sẽ để trạng thái chờ chấm chứ không so chuỗi. */
  const rubric = items.filter(i => i.type === 'essay' || i.type === 'speaking');
  ok(rubric.every(i => i.answer === ''), 'Câu chấm rubric không mang đáp án dựng sẵn');
  const rubricWant = (partOf.B.items + partOf.D.items + partOf.I.items) * counts[0];
  ok(rubric.length === rubricWant,
    'Số câu chấm rubric khớp blueprint (B + D + I, nhân số lượt thi)',
    rubric.length + ' ≠ ' + rubricWant);

  head('Đã vào cơ sở dữ liệu');

  const r = await fetch(BASE + '/api/catalog');
  ok(r.status === 200, 'Đọc được danh mục', 'status ' + r.status);

  /* Nguồn và giấy phép là dữ liệu nội bộ: không được đi ra danh mục công khai. */
  const raw = JSON.stringify(await r.json());
  ok(!raw.includes('written for this platform'), 'Nguồn nội bộ không lọt ra danh mục công khai');

  head('Tệp dữ liệu');

  const src = readFileSync(new URL('../server/data/vpet-items.js', import.meta.url), 'utf8');
  /* Không thể chứng minh "chưa từng chép" bằng một phép kiểm chuỗi. Cái kiểm
     được là xuất xứ có được khai báo hay không: tệp phải nói rõ lấy gì làm mốc
     xếp bậc, phải nêu tên hai danh sách bị cấm để khẳng định không dùng, và
     ô nguồn của từng câu không được trỏ tới chúng. */
  ok(/NGSL/.test(src) && /NAWL/.test(src), 'Có ghi nguồn tham chiếu mở đã dùng để xếp bậc');
  ok(/Oxford 3000 \/\s*\n?\s*\* 5000 and the English Vocabulary Profile were not used/.test(src)
    || /Oxford[\s\S]{0,80}English Vocabulary Profile were not used/.test(src),
    'Khai báo rõ là không dùng Oxford 3000/5000 và EVP');
  ok(items.every(i => !/oxford|vocabulary profile/i.test(i.source + i.licence)),
    'Ô nguồn của từng câu không trỏ tới danh sách có bản quyền');
} catch (e) {
  fail++;
  console.log('✗ Lỗi khi chạy: ' + (e && e.stack ? e.stack : e));
}

console.log('\n' + (fail ? '\x1b[31m' : '\x1b[32m') + (pass) + '/' + (pass + fail) + ' kiểm thử đạt\x1b[0m');
process.exit(fail ? 1 : 0);
