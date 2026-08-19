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
 *   Nhịp    nghe + LÀM BÀI có vừa đồng hồ của part không (không chỉ audio)
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
const { parseScript, BUILD_SPEED } = require('../server/script-markup.js');

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
  `SELECT id, part, type, skill, level, status, audio_status, audio_script, audio_key, tags_json
     FROM questions WHERE family_id='vpet' AND part IS NOT NULL`);

const marked = q.all(
  `SELECT qq.part, COUNT(*) n FROM attempt_answers r
     JOIN attempts a ON a.id = r.attempt_id
     JOIN questions qq ON qq.id = r.question_id
    WHERE a.status='submitted' AND r.marked_at IS NOT NULL AND qq.part IS NOT NULL
    GROUP BY qq.part`);
const marksBy = Object.fromEntries(marked.map(r => [r.part, r.n]));

/* Thời lượng audio cho một đề: lấy đúng số câu blueprint yêu cầu, chọn các
   câu DÀI NHẤT của part — vì đề xấu nhất mới là đề làm vỡ đồng hồ, và bộ sinh
   đề có quyền rút đúng những câu đó. */
function audioSeconds(part, need) {
  /* Thời lượng THẬT nếu đã dựng, ước tính nếu chưa. Một khi tệp đã tồn tại thì
     ước tính chỉ còn là phỏng đoán về một con số đang nằm sẵn trong CSDL. */
  const thuc = q.all(
    `SELECT MAX(r.ms) ms FROM tts_renders r
       JOIN questions qq ON qq.id = r.question_id
      WHERE qq.part = ? AND r.status='ok' AND r.ms > 0
      GROUP BY r.question_id`, part).map(r => r.ms / 1000);

  /* Ước tính ở đúng tốc độ Kokoro dựng thật, không phải tốc độ mặc định của
     ElevenLabs — hai con số lệch nhau 4%, và chênh ấy chỉ hiện ra ở kịch bản
     chưa ai dựng, tức đúng lúc tác giả đang cân xem đoạn mới có vừa đồng hồ. */
  const list = (thuc.length >= need ? thuc : SCRIPTS.allItems()
    .filter(i => i.part === part && i.script)
    .map(i => parseScript(i.script, { speed: BUILD_SPEED }).stats.estimatedMs / 1000))
    .sort((a, b) => b - a)
    .slice(0, need);

  return { list, total: list.reduce((a, b) => a + b, 0), counted: list.length, real: thuc.length >= need };
}

/* Bao nhiêu lần thí sinh được nghe lại. Nghe lại là một phần của đồng hồ chứ
   không phải ngoài nó: cho phép 2 lần nghe lại nghĩa là part E có thể phát
   mỗi câu ba lần, và ba lần thì gấp ba thời lượng.

   Lấy theo từng part từ blueprint, không dùng một hằng số chung. Dùng chung một
   con số chính là thứ đẩy part G lên 193%: đoạn văn không dài quá, mà là được
   phát ba lần trong khi thiết kế của nó là phát một lần. */
const ngheLai = part => {
  const sec = FORMATS.sectionOfPart('vpet', part);
  return sec && Number.isFinite(sec.replays) ? sec.replays : 2;
};

/**
 * Thời gian một part THẬT SỰ cần, không phải chỉ thời lượng audio.
 *
 * ---------------------------------------------------------------------------
 * VÌ SAO PHÉP KIỂM CŨ QUÁ YẾU
 *
 * Nó chỉ hỏi "audio có ngắn hơn đồng hồ không". Nhưng nghe xong thí sinh còn
 * phải gõ lại cả câu, đọc bốn phương án, hoặc nói lại chín mươi giây. Một part
 * E có 45 giây audio trong đồng hồ 360 giây trông rất thoải mái, cho tới khi
 * cộng thời gian gõ tám câu vào thì gần chạm trần.
 *
 * Các hệ số dưới đây là ƯỚC LƯỢNG THIẾT KẾ, không phải số đo từ thí sinh thật.
 * Chúng cố tình thiên về phía chậm — người gõ chậm và người nghĩ lâu mới là
 * người bị đồng hồ cắt, và họ là người phép kiểm này tồn tại để bảo vệ. Khi có
 * bài làm thật thì thay bằng số đo (docs/ACADEMIC.md §9).
 * ---------------------------------------------------------------------------
 */
function thoiGianCanThuc(part, audio) {
  const n = audio.list.length;
  const tongAudio = audio.total;

  switch (part) {
    case 'E': {
      /* Chép chính tả: nghe, rồi GÕ LẠI CẢ CÂU. Phần gõ mới là phần dài, và
         nó tỉ lệ với độ dài câu chứ không với thời lượng audio. Người học
         Việt gõ tiếng Anh khoảng 25 từ/phút, tức ~2 ký tự/giây. */
      const chuTB = 60;                       // ký tự một câu, đo từ kho
      const go = (chuTB / 2) * n;
      /* Nghe lại là quyền của thí sinh, và part chép chính tả thì hầu như ai
         cũng dùng hết. Tính cả. */
      const r = ngheLai('E');
      return { can: tongAudio * (1 + r) + go, giaiThich: `nghe ${Math.round(tongAudio)}s ×${1 + r} + gõ ${Math.round(go)}s` };
    }
    case 'F': {
      const chon = 12 * n;                    // đọc 4 phương án rồi chọn
      const r = ngheLai('F');
      return { can: tongAudio * (1 + r) + chon, giaiThich: `nghe ${Math.round(tongAudio)}s ×${1 + r} + chọn ${chon}s` };
    }
    case 'G': {
      const chon = 20 * n;                    // đoạn dài hơn, câu hỏi dài hơn
      const r = ngheLai('G');
      return { can: tongAudio * (1 + r) + chon, giaiThich: `nghe ${Math.round(tongAudio)}s ×${1 + r} + đọc/chọn ${chon}s` };
    }
    case 'H': {
      /* Nhắc lại: nói lại dài bằng câu vừa nghe, cộng một nhịp lấy hơi. */
      const noi = tongAudio + 1.5 * n;
      return { can: tongAudio + noi, giaiThich: `nghe ${Math.round(tongAudio)}s + nói lại ${Math.round(noi)}s` };
    }
    case 'J': {
      /* Chủ dự án chốt 3 phút mỗi bài: nghe + 20 giây nghĩ + 90 giây nói. */
      const nghi = 20 * n, noi = 90 * n;
      return { can: tongAudio + nghi + noi, giaiThich: `nghe ${Math.round(tongAudio)}s + nghĩ ${nghi}s + nói ${noi}s` };
    }
    default:
      return { can: tongAudio, giaiThich: `nghe ${Math.round(tongAudio)}s` };
  }
}

const rows = [];
let hong = 0, canh = 0;

for (const bp of Object.values(BLUEPRINT)) {
  if (CHI && bp.part !== CHI) continue;

  const mine = bank.filter(i => i.part === bp.part);
  const active = mine.filter(i => i.status === 'active');
  const issues = [];

  /* ---- Bể ----
     Đếm THEO BẬC chứ không cộng gộp, vì bộ sinh đề chọn theo bậc: nó xếp câu
     đúng bậc của đề lên trước rồi mới cắt đủ số lượng. Cộng gộp là chỗ lỗi này
     từng trốn được — part E có 16 câu, gấp đôi số blueprint đòi, nên cột này
     xanh; nhưng 16 ấy là 8 ở B1 và 8 ở B2, mà một đề B1 chỉ rút từ 8 câu B1 và
     rút hết cả 8. Hai lượt thi B1 nhận đúng một bộ câu, chỉ khác thứ tự.

     Đúng bằng số blueprint là trường hợp xấu nhất, xấu hơn cả thiếu: thiếu thì
     phần bù lấy từ bậc khác nên hai lượt còn khác nhau. */
  let be = OK;
  if (mine.length < bp.items) { be = BAD; hong++; issues.push(`thiếu ${bp.items - mine.length} câu để dựng nổi một đề`); }
  else {
    const theoBac = {};
    mine.forEach(i => { theoBac[i.level] = (theoBac[i.level] || 0) + 1; });
    /* Bậc "đúng bằng" hoặc "trên số blueprint nhưng chưa gấp đôi": lượt thi lại
       ở bậc ấy sẽ trùng toàn bộ hoặc gần toàn bộ. */
    const ket = Object.entries(theoBac)
      .filter(([, n]) => n >= bp.items && n < bp.items * 2)
      .map(([bac, n]) => `${bac} ${n}/${bp.items}`);
    if (ket.length) {
      be = WARN; canh++;
      issues.push(`bể đủ tổng cộng nhưng kẹt ở bậc ${ket.join(', ')} — lượt thi lại ở bậc đó rút đúng cùng bộ câu`);
    }
  }

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
    const daDung = mine.filter(i => i.audio_key).length;
    const coScript = mine.filter(i => (i.audio_script || '').trim()).length;
    if (duyet >= bp.items) audio = OK;
    else if (daDung >= bp.items) {
      /* Đã có tệp nhưng chưa ai nghe. Khác hẳn với chưa dựng, và trộn hai
         trạng thái vào một dòng khiến người đọc không biết việc tiếp theo là
         chạy bộ dựng hay là ngồi nghe. */
      audio = WARN; canh++;
      issues.push(`${daDung}/${bp.items} câu đã dựng xong nhưng mới ${duyet} câu được duyệt — cần người nghe`);
    } else if (coScript >= bp.items) {
      audio = WARN; canh++;
      issues.push(`${daDung}/${bp.items} câu đã dựng — chạy node scripts/dung-audio-kokoro.mjs`);
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
    const audio = audioSeconds(bp.part, bp.items);
    const budget = bp.minutes * 60;
    const { can, giaiThich } = thoiGianCanThuc(bp.part, audio);
    nhipTxt = `${audio.real ? 'đo thật' : 'ước tính'}: ${giaiThich} = ${Math.round(can)}s / đồng hồ ${budget}s ` +
      `(${Math.round(can / budget * 100)}%)`;

    if (audio.counted < bp.items) { nhip = C.d + '?' + C.x; }
    else if (can > budget) {
      nhip = BAD; hong++;
      issues.push(`part cần ~${Math.round(can)}s nhưng đồng hồ chỉ ${budget}s — thí sinh chậm sẽ bị cắt giữa chừng`);
    } else if (can > budget * 0.85) {
      nhip = WARN; canh++;
      issues.push(`chiếm ${Math.round(can / budget * 100)}% đồng hồ — người gõ chậm hoặc nghe lại nhiều sẽ không kịp`);
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
    if (r.nhipTxt) console.log(`    ${C.d}audio ${r.nhipTxt}${C.x}`);
  }
}

console.log('\n' + '─'.repeat(78));
if (!hong && !canh) console.log(`${C.g}✔ Mười part đều sẵn sàng.${C.x}`);
else console.log(`${hong ? C.r + hong + ' lỗi chặn phát hành' + C.x : ''}` +
  `${hong && canh ? ' · ' : ''}${canh ? C.y + canh + ' cảnh báo' + C.x : ''}`);
console.log('─'.repeat(78) + '\n');

process.exit(hong ? 1 : 0);
