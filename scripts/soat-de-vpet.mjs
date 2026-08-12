/**
 * Soát đề VPET theo từng part — A tới J, mỗi part một mục.
 *
 * `kiem-hoc-thuat.mjs` trả lời "khung đo có nhất quán không". Lệnh này trả lời
 * câu khác, và là câu người soạn đề hỏi trước khi phát hành: **part này đã
 * dựng được đề chưa, và nếu chưa thì thiếu đúng cái gì.**
 *
 * Sáu cột cho mỗi part, theo thứ tự một câu hỏi phải qua để tới được bài thi:
 *
 *   Bể      đủ câu để rút một đề chưa, và có đủ cho hai lượt thi khác nhau chưa
 *   Loại    kiểu câu có khớp blueprint không — part C mà có câu tự luận là hỏng
 *   Audio   part cần audio đã dựng và đã DUYỆT chưa (có tệp ≠ đã nghe)
 *   Chấm    part chấm rubric đã có thang chấm chưa
 *   Nhịp    thời lượng audio ước tính có vừa đồng hồ của part không
 *   Dữ liệu đã có bài làm thật để nói được gì về độ khó chưa
 *
 * Cột "Nhịp" là cột hay bị bỏ sót nhất và tốn tiền nhất: một part G dài 6 phút
 * mà kịch bản đọc hết 7 phút thì không phát hiện được cho tới khi có thí sinh
 * ngồi vào, và lúc đó tệp MP3 đã dựng và đã trả tiền rồi.
 *
 *   node scripts/soat-de-vpet.mjs            bảng đầy đủ
 *   node scripts/soat-de-vpet.mjs --gon      chỉ in part chưa đạt
 *   node scripts/soat-de-vpet.mjs --part=G   soi một part
 */
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const { q, jparse } = require('../server/db.js');
const FORMATS = require('../server/data/exam-formats.js');
const RUBRICS = require('../server/data/rubrics.js');
const SCRIPTS = require('../server/data/vpet-scripts.js');
const { parseScript } = require('../server/script-markup.js');

const args = process.argv.slice(2);
const GON = args.includes('--gon');
const CHI = (args.find(a => a.startsWith('--part=')) || '').slice(7).toUpperCase();

const C = { d: '\x1b[2m', b: '\x1b[1m', r: '\x1b[31m', y: '\x1b[33m', g: '\x1b[32m', x: '\x1b[0m' };
const OK = `${C.g}✓${C.x}`, WARN = `${C.y}!${C.x}`, BAD = `${C.r}✗${C.x}`;

/* Blueprint là nguồn sự thật; mọi thứ dưới đây đo ngược lại nó. */
const BLUEPRINT = (() => {
  const fmt = FORMATS.FORMATS.find(f => f.id === 'vpet-full');
  const out = {};
  fmt.sections.forEach(s => {
    const m = /^Part ([A-J])\b/.exec(s.name);
    if (m) out[m[1]] = {
      part: m[1],
      name: s.name.replace(/^Part [A-J]\s*-\s*/, ''),
      items: s.items, minutes: s.minutes, skill: s.skill,
      types: s.types || [], needsAudio: !!s.needsAudio
    };
  });
  return out;
})();

const bank = q.all(
  `SELECT id, part, type, skill, level, status, audio_status, audio_script, tags_json
     FROM questions WHERE family_id='vpet' AND part IS NOT NULL`);

const marked = q.all(
  `SELECT qq.part, COUNT(*) n FROM attempt_answers r
     JOIN attempts a ON a.id = r.attempt_id
     JOIN questions qq ON qq.id = r.question_id
    WHERE a.status='submitted' AND r.marked_at IS NOT NULL AND qq.part IS NOT NULL
    GROUP BY qq.part`);
const marksBy = Object.fromEntries(marked.map(r => [r.part, r.n]));

/* Thời lượng audio ước tính cho một đề: lấy đúng số câu blueprint yêu cầu,
   chọn các kịch bản dài nhất của part — vì đề xấu nhất mới là đề làm vỡ
   đồng hồ, và bộ sinh đề có quyền rút đúng những câu đó. */
function audioSeconds(part, need) {
  const list = SCRIPTS.allItems()
    .filter(i => i.part === part && i.script)
    .map(i => parseScript(i.script).stats.estimatedMs / 1000)
    .sort((a, b) => b - a)
    .slice(0, need);
  return { total: list.reduce((a, b) => a + b, 0), counted: list.length };
}

const rows = [];
let hong = 0, canh = 0;

for (const bp of Object.values(BLUEPRINT)) {
  if (CHI && bp.part !== CHI) continue;

  const mine = bank.filter(i => i.part === bp.part);
  const active = mine.filter(i => i.status === 'active');
  const issues = [];

  /* ---- Bể ---- */
  let be = OK;
  if (mine.length < bp.items) { be = BAD; hong++; issues.push(`thiếu ${bp.items - mine.length} câu để dựng nổi một đề`); }
  else if (mine.length < bp.items * 2) { be = WARN; canh++; issues.push(`chỉ ${mine.length}/${bp.items} — lượt thi lại sẽ lặp lại nguyên si`); }

  /* ---- Loại câu ---- */
  const laLoai = [...new Set(mine.map(i => i.type))].filter(t => !bp.types.includes(t));
  const loai = laLoai.length ? BAD : OK;
  if (laLoai.length) { hong++; issues.push(`có loại câu lạ: ${laLoai.join(', ')} (blueprint: ${bp.types.join('/')})`); }

  const laKyNang = [...new Set(mine.map(i => i.skill))].filter(s => s !== bp.skill);
  if (laKyNang.length) { hong++; issues.push(`gắn sai kỹ năng: ${laKyNang.join(', ')} (phải là ${bp.skill})`); }

  /* ---- Audio ---- */
  let audio = C.d + '—' + C.x;
  if (bp.needsAudio) {
    const duyet = mine.filter(i => i.audio_status === 'approved').length;
    const coScript = mine.filter(i => (i.audio_script || '').trim()).length;
    if (duyet >= bp.items) audio = OK;
    else if (coScript >= bp.items) {
      audio = WARN; canh++;
      issues.push(`${duyet}/${bp.items} câu đã duyệt audio — có kịch bản nhưng chưa dựng/chưa nghe`);
    } else {
      audio = BAD; hong++;
      issues.push(`chỉ ${coScript}/${bp.items} câu có kịch bản đọc`);
    }
  } else {
    /* Chiều ngược lại cũng là lỗi: part không phát audio mà mang kịch bản thì
       sẽ hiện nút Dựng MP3 và tính tiền cho tệp không ai nghe. */
    const thua = mine.filter(i => (i.audio_script || '').trim()).length;
    if (thua) { audio = BAD; hong++; issues.push(`${thua} câu mang kịch bản đọc nhưng part này không phát audio`); }
  }

  /* ---- Chấm ---- */
  const canRubric = mine.some(i => i.type === 'essay' || i.type === 'speaking');
  let cham = C.d + '—' + C.x;
  if (canRubric) {
    const rub = RUBRICS.PART_RUBRICS[bp.part];
    if (!rub) { cham = BAD; hong++; issues.push('có câu chấm tay nhưng chưa có thang chấm'); }
    else {
      const tong = Object.values(rub.criteria).reduce((a, b) => a + b, 0);
      cham = tong === 100 ? OK : BAD;
      if (tong !== 100) { hong++; issues.push(`trọng số rubric cộng ra ${tong}, phải là 100`); }
    }
  }

  /* ---- Nhịp ---- */
  let nhip = C.d + '—' + C.x, nhipTxt = '';
  if (bp.needsAudio) {
    const { total, counted } = audioSeconds(bp.part, bp.items);
    const budget = bp.minutes * 60;
    nhipTxt = `${Math.round(total)}s/${budget}s`;
    if (counted < bp.items) { nhip = C.d + '?' + C.x; }
    else if (total > budget) { nhip = BAD; hong++; issues.push(`audio ${Math.round(total)}s vượt đồng hồ ${budget}s của part`); }
    else if (total > budget * 0.75) {
      nhip = WARN; canh++;
      issues.push(`audio chiếm ${Math.round(total / budget * 100)}% đồng hồ — còn rất ít chỗ cho thí sinh nghĩ và trả lời`);
    } else nhip = OK;
  }

  /* ---- Dữ liệu ---- */
  const n = marksBy[bp.part] || 0;
  const dulieu = n >= 100 ? OK : (n > 0 ? C.d + n + C.x : C.d + '0' + C.x);

  rows.push({ bp, mine, active, be, loai, audio, cham, nhip, nhipTxt, dulieu, n, issues });
}

/* ------------------------------------------------------------------ */

console.log(`\n${C.b}Soát đề VPET theo part${C.x}`);
console.log('─'.repeat(78));
console.log(`  ${'Part'.padEnd(4)} ${'Tên'.padEnd(24)} ${'Bể'.padEnd(9)} Loại Audio Chấm Nhịp  Dữ liệu`);
console.log('  ' + '─'.repeat(74));

for (const r of rows) {
  if (GON && !r.issues.length) continue;
  const be = `${r.mine.length}/${r.bp.items}`.padEnd(7);
  console.log(`  ${r.bp.part.padEnd(4)} ${r.bp.name.slice(0, 24).padEnd(24)} ${be}${r.be}  ` +
    `  ${r.loai}    ${r.audio}    ${r.cham}    ${r.nhip}   ${r.dulieu}`);
}

console.log('  ' + '─'.repeat(74));

const coVanDe = rows.filter(r => r.issues.length);
if (coVanDe.length) {
  console.log(`\n${C.b}Chi tiết${C.x}`);
  for (const r of coVanDe) {
    console.log(`\n  ${C.b}Part ${r.bp.part} · ${r.bp.name}${C.x}  ${C.d}${r.bp.items} câu · ${r.bp.minutes} phút · ${r.bp.skill}${C.x}`);
    for (const i of r.issues) console.log(`    · ${i}`);
    if (r.nhipTxt) console.log(`    ${C.d}audio ước tính ${r.nhipTxt}${C.x}`);
  }
}

console.log('\n' + '─'.repeat(78));
if (!hong && !canh) console.log(`${C.g}✔ Mười part đều sẵn sàng.${C.x}`);
else console.log(`${hong ? C.r + hong + ' lỗi chặn phát hành' + C.x : ''}` +
  `${hong && canh ? ' · ' : ''}${canh ? C.y + canh + ' cảnh báo' + C.x : ''}`);
console.log('─'.repeat(78) + '\n');

process.exit(hong ? 1 : 0);
