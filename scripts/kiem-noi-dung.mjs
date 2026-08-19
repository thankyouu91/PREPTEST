/**
 * Kiểm nội dung từng câu theo blueprint — cổng chặn khi nhân rộng bộ đề.
 *
 * `soat-de-vpet.mjs` hỏi "part này đã đủ để dựng đề chưa" — đếm và đo.
 * Lệnh này hỏi câu khác, ở mức từng câu một: **câu này có đúng hình dạng mà
 * part của nó đòi hỏi không.**
 *
 * ---------------------------------------------------------------------------
 * VÌ SAO CẦN, ĐÚNG LÚC NÀY
 *
 * Bộ đề hiện có 130 câu do một người viết trong một mạch. Nhân lên 500 câu
 * nghĩa là nhiều người viết, hoặc AI viết, ở nhiều thời điểm — và lúc đó thứ
 * duy nhất giữ cho part C luôn có bốn phương án, part B luôn có ý chính để
 * chấm, part A luôn chỉ điền một từ, là một bộ kiểm chạy được chứ không phải
 * một tài liệu ai cũng gật đầu rồi quên.
 *
 * Quy tắc ở đây suy ra từ chính nền tảng, không phải từ ý thích:
 *   · loại câu và kỹ năng lấy từ blueprint trong server/data/exam-formats.js
 *   · phần nào cần audio cũng lấy từ đó
 *   · ý chính là bắt buộc ở đâu thì lấy từ rubrics.js — tiêu chí `content`
 *     tự nó nói "Checked against the item's key points"
 * ---------------------------------------------------------------------------
 *
 *   node scripts/kiem-noi-dung.mjs            báo cáo đầy đủ
 *   node scripts/kiem-noi-dung.mjs --gon      chỉ in câu chưa đạt
 *   node scripts/kiem-noi-dung.mjs --part=B   soi một part
 *
 * Thoát khác 0 khi còn lỗi, nên dùng được làm cổng chặn trước khi nhập kho.
 */
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const FORMATS = require('../server/data/exam-formats.js');
const RUBRICS = require('../server/data/rubrics.js');
const ITEMS = require('../server/data/vpet-items.js');
const SCRIPTS = require('../server/data/vpet-scripts.js');
const FORMS = require('../server/data/vpet-forms.js');

const args = process.argv.slice(2);
const GON = args.includes('--gon');
const CHI = (args.find(a => a.startsWith('--part=')) || '').slice(7).toUpperCase();

const C = { d: '\x1b[2m', b: '\x1b[1m', r: '\x1b[31m', y: '\x1b[33m', g: '\x1b[32m', x: '\x1b[0m' };

/* Blueprint là nguồn sự thật về loại câu, kỹ năng và audio. */
const BP = {};
FORMATS.FORMATS.find(f => f.id === 'vpet-full').sections.forEach(s => {
  const m = /^Part ([A-J])\b/.exec(s.name);
  if (m) BP[m[1]] = { part: m[1], skill: s.skill, types: s.types || [], needsAudio: !!s.needsAudio, items: s.items };
});

/* Ý chính là bắt buộc ở part nào, và cần bao nhiêu ý.
 *
 * Hai tiêu chí dùng tới ý chính, và chúng đòi hỏi khác nhau:
 *
 *   `content` (part B, J) — thang điểm viết thẳng bằng phần trăm số ý bao phủ:
 *     dưới 20%, 20–35%, 35–55%, 55–75%, 75–90%, trên 90%. Phần trăm thì phải có
 *     mẫu số, và mẫu số chính là số ý chính. Chọn SO_Y_CONTENT = 6 không phải
 *     cho tròn: đó là số nhỏ nhất mà cả bảy bậc đều với tới được. Với 6 ý, mỗi
 *     số ý bao phủ rơi đúng vào một bậc và không bậc nào bị bỏ trống —
 *       0/6 → bậc 0   1/6 → bậc 1   2/6 → bậc 2   3/6 → bậc 3
 *       4/6 → bậc 4   5/6 → bậc 5   6/6 → bậc 6
 *     Với 5 ý, bậc 1 ("dưới 20%") không ai đạt được: bao phủ 1 ý đã là 20%, rơi
 *     sang bậc 2. Người viết được một chi tiết sẽ được chấm cao hơn một bậc so
 *     với thang điểm định, mọi lần, ở đúng chỗ thí sinh yếu nhất.
 *
 *   `task` (part D, I) — bậc 4 là "có đủ mọi thành phần đề bài yêu cầu". Không
 *     tính phần trăm, nên không cần con số đẹp; cái cần là danh sách thành phần
 *     được ghi sẵn vào câu hỏi. Nếu để máy chấm tự suy ra từ đề bài mỗi lần
 *     chấm thì hai lần chấm cùng một bài có thể đếm ra hai danh sách khác nhau,
 *     và "đủ mọi thành phần" thành ra nghĩa khác nhau cho hai thí sinh viết
 *     giống hệt nhau. Ngưỡng 4 = ba việc đề bài liệt kê + yêu cầu văn phong,
 *     thứ mà chính tiêu chí này nói là nó chấm. */
const SO_Y_CONTENT = 6;
const SO_Y_TASK = 4;

const CAN_Y_CHINH = {};
for (const [part, rub] of Object.entries(RUBRICS.PART_RUBRICS)) {
  if (rub.criteria.content) {
    CAN_Y_CHINH[part] = { toiThieu: SO_Y_CONTENT, trongSo: rub.criteria.content, tieuChi: 'content' };
  } else if (rub.criteria.task) {
    CAN_Y_CHINH[part] = { toiThieu: SO_Y_TASK, trongSo: rub.criteria.task, tieuChi: 'task' };
  }
}

const norm = s => String(s || '').toLowerCase().replace(/[^a-z0-9\s']/g, '').replace(/\s+/g, ' ').trim();

/* Tên riêng không phải tiếng Anh: Kokoro là model tiếng Anh và sẽ đọc sai.
   Ở part E nó là lỗi mất điểm oan, vì cả câu hỏi là câu đọc chính tả.
   ---------------------------------------------------------------------------
   Chỉ là danh sách TÊN, không phải từ điển. Phép kiểm bên dưới chỉ soi chữ hoa
   NẰM GIỮA CÂU, nên nó không cần biết "Excuse" hay "Nobody" là từ thường —
   những chữ ấy đứng đầu câu và không bao giờ tới đây.

   Nuôi một danh sách từ tiếng Anh thường dùng là cuộc chiến không thắng được:
   bản trước có hơn trăm từ và vẫn báo nhầm 37 câu ngay lần đầu gặp nội dung
   mới, vì mọi câu đều bắt đầu bằng một chữ hoa nào đó. */
const TEN_ANH = new Set(('sarah daniel helen grace james thomas emma peter laura martin alice simon clare robert julia '
  + 'andrew kate michael rachel david london oxford brighton norwich bristol leeds york bath cambridge newcastle dover '
  + 'england europe norway swedish paris berlin union hall '
  + 'monday tuesday wednesday thursday friday saturday sunday mondays tuesdays wednesdays thursdays fridays saturdays '
  + 'sundays january february march april may june july august september october november december '
  + 'english spanish french german italian christmas easter ms mr mrs dr').split(' '));

/* ------------------------------------------------------------------ */

const cau = [
  ...ITEMS.rows().map(r => ({
    ref: r.key, part: r.part, type: r.type, skill: r.skill, level: r.level,
    prompt: r.prompt, options: r.options || [], answer: r.answer,
    keyPoints: r.keyPoints || [], script: '', nguon: 'vpet-items.js'
  })),
  ...SCRIPTS.allItems().map(i => ({
    ref: i.ref, part: i.part, type: i.type, skill: i.skill, level: i.cefr,
    prompt: i.prompt, options: i.options || [], answer: i.answer,
    keyPoints: i.keyPoints || [], script: i.script || '', nguon: 'vpet-scripts.js'
  })),
  /* Năm bộ đề đầy đủ. Chúng đi qua đúng bộ luật này chứ không có luật riêng —
     một cổng chặn mà nội dung mới được miễn thì không phải là cổng chặn. */
  ...FORMS.allItems().map(i => ({
    ref: i.ref, part: i.part, type: i.type, skill: i.skill, level: i.level,
    prompt: i.prompt, options: i.options || [], answer: i.answer,
    keyPoints: i.keyPoints || [], script: i.script || '', nguon: 'vpet-forms.js'
  }))
];

const loi = [];
let dat = 0;

for (const c of cau) {
  if (CHI && c.part !== CHI) continue;
  const bp = BP[c.part];
  const e = [];

  if (!bp) { loi.push({ c, e: ['part không có trong blueprint'] }); continue; }

  /* ---- Khớp blueprint ---- */
  if (!bp.types.includes(c.type)) e.push(`loại "${c.type}" không hợp part ${c.part} (blueprint: ${bp.types.join('/')})`);
  if (c.skill !== bp.skill) e.push(`kỹ năng "${c.skill}" sai, part ${c.part} là ${bp.skill}`);
  if (!['A2', 'B1', 'B2', 'C1'].includes(c.level)) e.push(`bậc "${c.level}" không hợp lệ`);

  /* ---- Audio: có kịch bản đúng chỗ cần, và không có ở chỗ không cần ---- */
  const coScript = !!c.script.trim();
  if (bp.needsAudio && !coScript) e.push('part phát audio nhưng câu không có kịch bản đọc');
  if (!bp.needsAudio && coScript) e.push('part không phát audio nhưng câu lại mang kịch bản — sẽ hiện nút Dựng MP3 ở chỗ không phát gì');

  /* ---- Đề bài ---- */
  if (!String(c.prompt || '').trim()) e.push('không có đề bài hiển thị');

  /* ---- Theo loại ---- */
  if (c.type === 'mcq') {
    if (c.options.length !== 4) e.push(`có ${c.options.length} phương án, blueprint đòi 4`);
    if (!c.options.includes(c.answer)) e.push('đáp án không nằm trong các phương án của chính nó');
    if (new Set(c.options).size !== c.options.length) e.push('có phương án trùng nhau');
    if (c.options.some(o => !String(o).trim())) e.push('có phương án rỗng');
  }

  if (c.type === 'gap') {
    if (!c.answer) e.push('câu điền từ không có đáp án');
    /* Part A chừa đúng một chỗ trống, nên mỗi biến thể đáp án phải là một từ.
       Part E là chép chính tả: đáp án là cả câu. */
    if (c.part === 'A') {
      if (!/_{2,}/.test(c.prompt)) e.push('không thấy chỗ trống nhìn được trong đề bài');
      String(c.answer).split('|').forEach(v => {
        if (v.trim().split(/\s+/).length > 1) e.push(`đáp án nhiều từ: "${v.trim()}"`);
      });
    }
  }

  /* ---- Part D phải gọi tên văn phong ngay trong đề bài ----
     Tiêu chí `task` chấm cả "đúng văn phong tình huống đòi hỏi", nên nếu đề bài
     không nói thì thí sinh bị trừ điểm vì một yêu cầu chưa ai nói với họ. Part I
     không cần dòng này: nó nêu quan hệ (đồng nghiệp thân, quản lý, quán nhỏ) và
     ở lời nói thì chính quan hệ ấy quy định văn phong. */
  if (c.part === 'D' && !/\b(tone|register|formal|informal|friendly|civil|polite)\b/i.test(c.prompt)) {
    e.push('đề bài không nói rõ văn phong, nhưng part D lại chấm văn phong');
  }

  /* ---- Đáp án của E và H chính là câu đọc ---- */
  if (['E', 'H'].includes(c.part)) {
    if (!c.answer) e.push('không có đáp án');
    else if (norm(c.answer) !== norm(c.script)) e.push('đáp án không khớp kịch bản đọc');
  }

  /* ---- Ý chính cho các part chấm content / task ---- */
  const yc = CAN_Y_CHINH[c.part];
  if (yc) {
    const n = c.keyPoints.length;
    if (n < yc.toiThieu) {
      e.push(`chỉ ${n} ý chính, cần ${yc.toiThieu} — part ${c.part} chấm ${yc.trongSo}% bằng tiêu chí ` +
        `\`${yc.tieuChi}\`, và tiêu chí đó đối chiếu với danh sách ý chính của chính câu hỏi` +
        (yc.tieuChi === 'content' ? ', vốn là mẫu số của thang phần trăm' : ''));
    }
    if (c.keyPoints.some(k => String(k).trim().length < 10)) e.push('có ý chính quá ngắn để đối chiếu');
    if (new Set(c.keyPoints.map(norm)).size !== c.keyPoints.length) e.push('có hai ý chính trùng nhau');
  }

  /* ---- Tên riêng không phải tiếng Anh trong kịch bản ----
     Chỉ soi chữ hoa GIỮA CÂU. Chữ hoa đầu câu gần như luôn là từ thường, nên
     bắt chúng chỉ tạo ra báo động giả — và một cổng chặn kêu nhầm là một cổng
     chặn người ta bắt đầu bỏ qua, kể cả lúc nó kêu đúng.

     Tên đứng đầu câu vì thế lọt qua phép kiểm này. Đó là đánh đổi có chủ ý: đổi
     lại là mọi lần kêu đều đáng xem. Một tên chỉ xuất hiện đúng một lần và đúng
     ở đầu câu là hiếm — nhân vật nào cũng được nhắc lại. */
  if (coScript) {
    const giuaCau = c.script
      .replace(/_/g, ' ')
      .split(/(?<=[.!?])\s+/)
      .flatMap(cau => cau.trim().split(/\s+/).slice(1))
      .map(w => (w.match(/^[A-Z][a-z]+/) || [])[0])
      .filter(Boolean)
      .filter(w => !TEN_ANH.has(w.toLowerCase()));
    const la = [...new Set(giuaCau)];
    if (la.length) e.push(`tên riêng máy đọc có thể sai: ${la.join(', ')}`);
  }

  if (e.length) loi.push({ c, e }); else dat++;
}

/* ------------------------------------------------------------------ */

console.log(`\n${C.b}Kiểm nội dung theo blueprint${C.x}`);
console.log('─'.repeat(76));

const theoPart = {};
cau.filter(c => !CHI || c.part === CHI).forEach(c => {
  theoPart[c.part] = theoPart[c.part] || { n: 0, hong: 0 };
  theoPart[c.part].n++;
});
loi.forEach(({ c }) => { if (theoPart[c.part]) theoPart[c.part].hong++; });

console.log('  Part   Câu   Đạt   Hỏng');
Object.keys(theoPart).sort().forEach(p => {
  const t = theoPart[p];
  const mau = t.hong ? C.r : C.g;
  console.log(`   ${p}    ${String(t.n).padStart(4)}  ${String(t.n - t.hong).padStart(4)}   ${mau}${String(t.hong).padStart(4)}${C.x}`);
});

if (loi.length && !GON) {
  console.log(`\n${C.b}Chi tiết${C.x}`);
  const nhom = {};
  loi.forEach(({ c, e }) => { (nhom[c.part] = nhom[c.part] || []).push({ c, e }); });
  Object.keys(nhom).sort().forEach(p => {
    console.log(`\n  ${C.b}Part ${p}${C.x}  ${C.d}${nhom[p].length} câu${C.x}`);
    /* Gộp theo thông điệp: 8 câu cùng một lỗi là MỘT việc phải làm, không
       phải tám — in ra tám dòng giống nhau chỉ làm người đọc bỏ qua. */
    const theoLoi = {};
    nhom[p].forEach(({ c, e }) => e.forEach(m => (theoLoi[m] = theoLoi[m] || []).push(c.ref)));
    Object.entries(theoLoi).forEach(([m, refs]) => {
      console.log(`    · ${m}`);
      console.log(`      ${C.d}${refs.length} câu: ${refs.slice(0, 6).join(', ')}${refs.length > 6 ? ` … +${refs.length - 6}` : ''}${C.x}`);
    });
  });
}

console.log('\n' + '─'.repeat(76));
const tong = dat + loi.length;
if (!loi.length) console.log(`${C.g}✔ Cả ${tong} câu đúng hình dạng blueprint.${C.x}`);
else console.log(`${C.r}✗ ${loi.length}/${tong} câu chưa đúng hình dạng${C.x} — đạt ${dat}/${tong} (${Math.round(dat / tong * 100)}%).`);
console.log('─'.repeat(76) + '\n');

process.exit(loi.length ? 1 : 0);
