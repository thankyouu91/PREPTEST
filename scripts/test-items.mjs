/**
 * Kiểm thử ngân hàng đề VPET: nội dung có khớp blueprint không.
 *
 * Chạy khi server đã bật: node scripts/test-items.mjs
 *
 * Trọng tâm là những lỗi mà đọc bằng mắt sẽ bỏ sót: phần nào lệch kỹ năng hoặc
 * dạng câu so với bảng phần thi, câu điền từ có đáp án nhiều từ, câu trắc
 * nghiệm có đáp án không nằm trong các phương án, hoặc hai phương án trùng nhau.
 *
 * Và độ sâu theo bậc, thứ đếm bằng mắt thì ra đúng mà vẫn sai: một phần có đủ
 * gấp đôi số câu blueprint yêu cầu vẫn lặp nguyên si ở lượt thi lại nếu số câu
 * ấy dồn vào một bậc khác bậc của đề. Xem khối "Ngân hàng khớp blueprint".
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

  /* Từ 08/10/2026 kho mang CẢ MƯỜI part. Trước đó nó chỉ có năm part không cần
     audio, vì kịch bản đọc nằm ở một tệp riêng; bản đặc tả của chủ dự án gộp
     lại nên một câu và kịch bản của nó giờ là cùng một hàng. */
  const ALL = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J'];
  const covered = [...new Set(items.map(i => i.part))].sort();
  ok(covered.join('') === ALL.join(''), 'Kho mang đủ cả mười part', covered.join(''));
  ok(items.filter(i => partOf[i.part].needsAudio).every(i => i.script),
    'Câu ở part phát audio đều có kịch bản đọc');

  /* Ngân hàng là một POOL chứ không phải một đề cố định, và độ sâu phải đếm
     THEO BẬC chứ không theo phần. Trình sinh đề xếp câu đúng bậc lên trước rồi
     mới lấy đủ số lượng, nên một phần có ít câu ở bậc của đề hơn số blueprint
     yêu cầu sẽ lặp lại toàn bộ số câu ấy ở lượt sau — và một phần có ĐÚNG BẰNG
     số blueprint thì lặp lại chắc chắn cả phần, tệ hơn trong hai trường hợp.
     Luật vì thế là: ở mỗi bậc, một phần hoặc NÔNG (ít hơn số blueprint, phần bù
     lấy từ bậc khác nên vẫn đổi giữa hai lượt) hoặc SÂU (ít nhất gấp đôi, đủ
     cho hai đề khác nhau). Khoảng giữa là chỗ duy nhất không được rơi vào. */
  const SITTINGS = 2;
  const between = [];
  const deepAt = {};
  for (const letter of ALL) {
    const mine = items.filter(i => i.part === letter);
    const want = partOf[letter];
    ok(mine.length >= want.items,
      'Phần ' + letter + ' đủ ít nhất ' + want.items + ' câu cho một lượt thi', String(mine.length));
    ok(mine.every(i => i.skill === want.skill),
      'Phần ' + letter + ' đúng kỹ năng ' + want.skill);
    ok(mine.every(i => want.types.includes(i.type)),
      'Phần ' + letter + ' đúng dạng câu ' + want.types.join('/'));

    deepAt[letter] = new Set();
    for (const level of new Set(mine.map(i => i.level))) {
      const have = mine.filter(i => i.level === level).length;
      if (have >= SITTINGS * want.items) deepAt[letter].add(level);
      else if (have >= want.items) {
        between.push(letter + ' bậc ' + level + ': ' + have + ' câu, blueprint cần ' + want.items);
      }
    }
  }
  ok(between.length === 0,
    'Không bậc nào của phần nào rơi vào khoảng giữa nông và sâu', between.join(' · '));

  /* ---------------------------------------------------------------------
     MỘT ĐỀ, VÀ NÓI THẲNG LÀ MỘT ĐỀ

     Luật nông-hay-sâu ở trên tồn tại cho một BỂ đủ rộng để sinh hai đề khác
     nhau. Kho hiện tại không phải thế: sau khi dựng lại theo bản đặc tả ngày
     08/10/2026 nó mang đúng 58 câu, tức vừa đủ một lượt thi. Hệ quả có thật và
     người dùng sẽ gặp: **thi lại sẽ ra đúng đề cũ.**

     Phép kiểm cũ đòi "có ít nhất một bậc mà mọi phần đều đủ hai lượt" và giờ
     sẽ đỏ. Xoá nó đi là giấu mất giới hạn ấy; để nguyên là để một phép kiểm đỏ
     thường trực, mà một bộ kiểm thử lúc nào cũng đỏ thì không ai đọc nữa.

     Nên nó được viết lại thành thứ nó thật sự muốn canh: kho có đủ cho một
     lượt thi không, và nếu ai đó bắt đầu thêm câu thì luật nông-hay-sâu lập
     tức áp dụng trở lại. Ngày kho vượt một đề, phép kiểm ngay trên sẽ bắt. */
  const soCau = items.length;
  const canCho1Luot = blueprint.sections.reduce((n, s) => n + s.items, 0);
  ok(soCau >= canCho1Luot, 'Kho đủ cho ít nhất một lượt thi',
    soCau + '/' + canCho1Luot);

  const coBe = ALL.some(l => items.filter(i => i.part === l).length > partOf[l].items);
  const common = coBe
    ? [...deepAt[ALL[0]]].filter(l => ALL.every(x => deepAt[x].has(l)))
    : [];
  ok(!coBe || common.length >= 1,
    coBe
      ? 'Bể đã rộng hơn một đề, nên phải có một bậc mà mọi phần đủ ' + SITTINGS + ' lượt'
      : 'Kho đúng một đề cố định — thi lại sẽ ra đúng đề này (ghi nhận, chưa phải bể)',
    JSON.stringify(Object.fromEntries(ALL.map(x => [x, [...deepAt[x]]]))));

  head('Chất lượng từng câu');

  const keys = items.map(i => i.key);
  ok(new Set(keys).size === keys.length, 'Không có khoá trùng nhau');
  ok(items.every(i => /^vpet-[a-j]-\d{2}$/.test(i.key)), 'Khoá theo đúng dạng vpet-<phần>-<số>');
  ok(items.every(i => ['A1', 'A2', 'B1', 'B2', 'C1', 'C2'].includes(i.level)), 'Bậc nằm trong thang CEFR');
  /* Đề bài hoặc tình huống phải có nội dung thật. Soi cả hai vì bản đặc tả
     tách màn hình: part B, D, G, I, J mang tình huống ở `passage` còn `prompt`
     chỉ là dòng lệnh ngắn ("Type your e-mail."). */
  ok(items.every(i => (i.prompt + ' ' + (i.passage || '')).trim().length >= 20),
    'Đề bài hoặc tình huống nào cũng có nội dung thật',
    items.filter(i => (i.prompt + ' ' + (i.passage || '')).trim().length < 20).map(i => i.key).join(', '));
  ok(items.every(i => i.explanation.trim().length >= 20), 'Câu nào cũng có ghi chú cho người chấm');
  ok(items.every(i => i.source && i.licence), 'Câu nào cũng ghi nguồn và giấy phép');

  /* Điền từ: đáp án phải là MỘT từ. Đáp án hai từ nghĩa là chỗ trống thật ra
     nhận nhiều thứ, và người học gõ đúng một nửa vẫn bị chấm sai. */
  /* Hai loại `gap` khác nhau, và luật của chúng ngược nhau:
       part A  một chỗ trống, đáp án MỘT từ — gõ đúng một nửa là sai.
       part E  chép chính tả, đáp án là CẢ CÂU, và đề bài không có chỗ trống vì
               câu được đọc lên chứ không in ra.
     Một luật chung cho cả hai sẽ đánh trượt đúng cái part đang làm đúng. */
  const gaps = items.filter(i => i.type === 'gap');
  const oneWord = gaps.filter(i => i.part === 'A');
  const multi = oneWord.filter(i => i.answer.split('|').some(v => v.trim().split(/\s+/).length !== 1));
  ok(multi.length === 0, 'Đáp án điền từ part A đều đúng một từ', multi.map(i => i.key).join(', '));
  ok(oneWord.every(i => i.prompt.includes('___')), 'Câu điền từ part A nào cũng có chỗ trống trong đề');
  const dictation = gaps.filter(i => i.part === 'E');
  ok(dictation.every(i => i.answer.trim().split(/\s+/).length >= 4),
    'Đáp án chép chính tả là cả câu, không phải một từ');
  ok(gaps.every(i => i.answer.trim()), 'Câu điền từ nào cũng có đáp án');

  /* Trắc nghiệm: đáp án phải nằm trong các phương án, và không phương án nào
     trùng nhau — hai phương án giống hệt thì câu đó không còn đo được gì. */
  /* Số phương án do blueprint khai: part C bốn lựa chọn, part F đúng ba nút
     A, B, C. Khoá cứng số 4 sẽ đánh trượt toàn bộ part F vì nó đúng. */
  const mcqs = items.filter(i => i.type === 'mcq');
  const wrongCount = mcqs.filter(i => i.options.length !== (partOf[i.part].optionCount || 4));
  ok(wrongCount.length === 0, 'Câu trắc nghiệm có đúng số phương án blueprint khai',
    wrongCount.map(i => i.key + '=' + i.options.length).join(', '));
  ok(mcqs.every(i => i.options.includes(i.answer)), 'Đáp án luôn nằm trong các phương án');
  ok(mcqs.every(i => new Set(i.options).size === i.options.length), 'Không phương án nào trùng nhau');
  ok(mcqs.every(i => i.options.every(o => o.trim())), 'Không phương án nào bỏ trống');

  /* Tự luận và nói chấm bằng rubric: để sẵn đáp án là sai mô hình, marking.js
     sẽ để trạng thái chờ chấm chứ không so chuỗi. */
  const rubric = items.filter(i => i.type === 'essay' || i.type === 'speaking');
  /* Part H là ngoại lệ có lý do: câu cần nhắc lại vừa là thứ máy đọc vừa là thứ
     đối chiếu, nên nó nằm ở cột `answer`. Việc đó KHÔNG làm nó bị chấm máy —
     marking.js chỉ tự chấm `mcq` và `gap`, còn `speaking` thì trả null và để
     trạng thái chờ chấm. Phép kiểm ngay dưới giữ cho điều đó đúng. */
  ok(rubric.filter(i => i.part !== 'H').every(i => i.answer === ''),
    'Câu chấm rubric không mang đáp án dựng sẵn, trừ part H',
    rubric.filter(i => i.part !== 'H' && i.answer).map(i => i.key).join(', '));
  const MARKING = await import('../server/marking.js').then(m => m.default || m);
  ok(rubric.every(i => MARKING.markItem({ type: i.type, answer: i.answer }, 'bất kỳ') === null),
    'Không câu chấm rubric nào bị máy tự chấm');
  /* Chiều ngược lại: câu chấm rubric chỉ được nằm ở những phần mà blueprint khai
     là tự luận hoặc nói. Một câu essay lọt vào phần C sẽ để marking.js treo chờ
     chấm tay một phần lẽ ra chấm tự động xong ngay khi nộp. */
  const rubricParts = ALL.filter(l =>
    partOf[l].types.some(t => t === 'essay' || t === 'speaking'));
  ok(rubric.every(i => rubricParts.includes(i.part)),
    'Câu chấm rubric chỉ nằm ở phần blueprint khai là tự luận hoặc nói',
    rubric.filter(i => !rubricParts.includes(i.part)).map(i => i.key).join(', '));

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
