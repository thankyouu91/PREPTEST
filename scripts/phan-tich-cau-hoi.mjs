/**
 * Phân tích câu hỏi — câu nào giữ, câu nào sửa, câu nào bỏ.
 *
 * Đây là bước docs/ACADEMIC.md §9 mô tả: khi đã có bài làm thật thì tính độ
 * khó, độ phân biệt, hành vi của từng phương án nhiễu, độ tin cậy nội bộ và
 * sai số đo. Trước đó §7 nói thẳng là chưa claim được gì về độ tin cậy — lệnh
 * này là thứ biến câu đó từ lời hứa thành số.
 *
 *   node scripts/phan-tich-cau-hoi.mjs               tính và ghi lại kết quả
 *   node scripts/phan-tich-cau-hoi.mjs --thu         chỉ tính, không ghi
 *   node scripts/phan-tich-cau-hoi.mjs --tu=2026-01-01   chỉ tính từ ngày đó
 *
 * Hai lệnh dùng để xem trước khi có dữ liệu thật:
 *
 *   node scripts/phan-tich-cau-hoi.mjs --gia-lap=300   sinh 300 lượt thi giả
 *   node scripts/phan-tich-cau-hoi.mjs --xoa-gia-lap   xoá sạch dữ liệu giả
 *
 * Lượt thi giả ghi vào chính `attempts` / `attempt_answers` mà phần thi dùng,
 * vì đó là nơi phân tích đọc — một bảng riêng cho dữ liệu giả sẽ chỉ kiểm được
 * cái bảng riêng đó. Chúng gắn với tài khoản `sim-*` và `--xoa-gia-lap` xoá
 * sạch theo dấu đó. Chỉ có ích ở một việc: xem báo cáo trông thế nào và máy có
 * bắt được câu hỏng không, trước khi có thí sinh đầu tiên. Không được dùng để
 * nói bất cứ điều gì về chất lượng đề.
 */
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const { q, nowISO } = require('../server/db.js');
const IS = require('../server/item-stats.js');
const { MIN_N } = require('../server/item-analysis.js');

const args = process.argv.slice(2);
const has = f => args.includes(f);
const val = f => { const a = args.find(x => x.startsWith(f + '=')); return a ? a.slice(f.length + 1) : null; };

const THU = has('--thu') || has('--dry-run');
const TU = val('--tu') || val('--since');

const C = { d: '\x1b[2m', b: '\x1b[1m', r: '\x1b[31m', y: '\x1b[33m', g: '\x1b[32m', x: '\x1b[0m' };
const num = (v, dp = 2) => (v == null ? '—' : v.toFixed(dp));

/* ==================== xoá dữ liệu giả ==================== */
if (has('--xoa-gia-lap')) {
  const ids = q.all("SELECT id FROM users WHERE username LIKE 'sim-%'").map(r => r.id);
  let n = 0;
  for (const id of ids) {
    n += q.run('DELETE FROM attempts WHERE user_id=?', id).changes;   // cascades to answers
    q.run('DELETE FROM users WHERE id=?', id);
  }
  q.run('DELETE FROM item_stats');
  q.run('DELETE FROM section_stats');
  console.log(`\nĐã xoá ${n} lượt thi giả của ${ids.length} tài khoản, và toàn bộ thống kê đã tính.`);
  console.log('Chạy lại lệnh này không có cờ để tính lại trên dữ liệu thật.\n');
  process.exit(0);
}

/* ==================== sinh dữ liệu giả ==================== */
const GIA_LAP = Number(val('--gia-lap') || val('--simulate') || 0);
if (GIA_LAP) {
  if (!Number.isFinite(GIA_LAP) || GIA_LAP < 10 || GIA_LAP > 5000) {
    console.error('--gia-lap cần một số từ 10 đến 5000.');
    process.exit(1);
  }
  simulate(GIA_LAP);
}

/* ==================== báo cáo ==================== */
const cov = IS.coverage();

console.log(`\n${C.b}Phân tích câu hỏi${C.x}`);
console.log('─'.repeat(72));

if (!cov.responses) {
  console.log(`
Chưa có bài làm nào đã nộp và đã chấm, nên chưa tính được gì.

Đây là trạng thái đúng của một nền tảng chưa có thí sinh, không phải lỗi.
docs/ACADEMIC.md §7 và §10 đã nói rõ: mọi con số về độ tin cậy hiện là quyết
định thiết kế chứ chưa phải bằng chứng, và sẽ giữ nguyên như vậy cho tới khi
bảng này có dữ liệu.

Muốn xem trước báo cáo trông thế nào:
    node scripts/phan-tich-cau-hoi.mjs --gia-lap=300
`);
  process.exit(0);
}

console.log(`  ${cov.responses} câu trả lời · ${cov.attempts} lượt thi · ${cov.items} câu hỏi có dữ liệu`);
console.log(`  ${C.d}từ ${(cov.first_at || '').slice(0, 10)} tới ${(cov.last_at || '').slice(0, 10)}${C.x}`);
if (cov.itemsBelowThreshold) {
  console.log(`  ${C.y}${cov.itemsBelowThreshold} câu chưa đủ ${cov.needPerItem} lượt — số của những câu đó chưa dùng được${C.x}`);
}

const rep = IS.computeAll({ since: TU || undefined, dryRun: THU });

/* ---- độ tin cậy từng phần ---- */
console.log(`\n${C.b}Độ tin cậy nội bộ${C.x}  ${C.d}(alpha: các câu trong phần có cùng đo một thứ không)${C.x}`);
console.log('  Phần              Câu   Lượt    Alpha   Sai số đo   Đánh giá');
console.log('  ' + '─'.repeat(66));
for (const s of rep.sections) {
  const c = s.reliable ? (s.alpha >= 0.7 ? C.g : C.r) : C.d;
  console.log('  ' + s.section.padEnd(16) +
    String(s.items).padStart(4) + String(s.n).padStart(7) +
    (c + num(s.alpha, 3) + C.x).padStart(9 + c.length + C.x.length) +
    num(s.sem, 2).padStart(12) + '   ' +
    (s.reliable ? s.verdict : `${C.d}cần ${MIN_N.alpha} lượt${C.x}`));
  if (s.partial) {
    console.log(`  ${C.d}  ↳ ${s.partial} lượt làm thiếu câu, không tính vào alpha${C.x}`);
  }
}

if (!rep.summary.ready) {
  console.log(`\n  ${C.y}Chưa phần nào đủ ${MIN_N.alpha} lượt, nên chưa hiện được khoảng tin cậy${C.x}`);
  console.log(`  ${C.d}trên report của thí sinh (ACADEMIC §9 bước 4).${C.x}`);
} else {
  console.log(`\n  ${C.g}Đã đủ điều kiện hiện khoảng tin cậy trên report${C.x} — ví dụ ` +
    `"55, ±${num(rep.sections.find(s => s.reliable).sem, 0)}".`);
}

/* ---- câu cần xử lý ---- */
const NHAN = {
  'fix-key': { t: 'SAI KHOÁ', c: C.r },
  retire:    { t: 'BỎ',      c: C.r },
  review:    { t: 'XEM LẠI', c: C.y },
  wait:      { t: 'CHỜ',     c: C.d },
  keep:      { t: 'GIỮ',     c: C.g }
};

const canXuLy = rep.items.filter(i => i.recommend !== 'keep' && i.recommend !== 'wait');

console.log(`\n${C.b}Việc cần làm với ngân hàng câu hỏi${C.x}`);
if (!canXuLy.length) {
  console.log(`  ${C.g}Không câu nào cần xử lý.${C.x} ` +
    `${rep.summary.keep} câu đạt, ${rep.summary.wait} câu chưa đủ dữ liệu.`);
} else {
  console.log('  ' + '─'.repeat(66));
  for (const i of canXuLy.sort((a, b) => a.recommend.localeCompare(b.recommend))) {
    const n = NHAN[i.recommend];
    console.log(`  ${n.c}${n.t.padEnd(8)}${C.x}#${String(i.id).padEnd(5)} ${C.d}part ${i.part} · ${i.section}${C.x}`);
    console.log(`           ${C.d}${i.prompt}${C.x}`);
    console.log(`           ${i.why}`);
    console.log(`           ${C.d}độ khó ${num(i.facility.p)} · độ phân biệt ${num(i.discrimination.r)}${C.x}`);
    const kem = (i.distractors ? i.distractors.options : []).filter(o => o.verdict !== 'working');
    for (const o of kem) console.log(`           ${C.d}· "${o.option}" (${Math.round(o.share * 100)}%) ${o.verdict}${C.x}`);
    console.log('');
  }
}

/* ---- tổng kết ---- */
const s = rep.summary;
console.log('─'.repeat(72));
console.log(`  ${C.g}giữ ${s.keep}${C.x} · ${C.y}xem lại ${s.review}${C.x} · ` +
  `${C.r}bỏ ${s.retire}${C.x} · ${C.r}sai khoá ${s['fix-key']}${C.x} · ${C.d}chờ thêm dữ liệu ${s.wait}${C.x}`);
console.log(`  ${s.reliable}/${s.total} câu đã đủ ${MIN_N.facility} lượt để con số có nghĩa.`);
console.log(THU ? `  ${C.d}(--thu: chưa ghi gì vào CSDL)${C.x}`
                : `  ${C.d}Đã ghi vào item_stats và section_stats lúc ${rep.at.slice(0, 16).replace('T', ' ')}.${C.x}`);
console.log('─'.repeat(72) + '\n');

process.exit(0);

/* ==================================================================== */

/**
 * Sinh bài làm giả theo mô hình một tham số.
 *
 * Mỗi thí sinh có một năng lực θ, mỗi câu có một độ khó b, xác suất làm đúng
 * là 1/(1+e^-(θ-b)). Đây là mô hình Rasch — cùng mô hình mà cả ngành khảo thí
 * dùng để mô phỏng — nên số sinh ra có hình dạng giống dữ liệu thật, dù không
 * phải dữ liệu thật.
 *
 * Ba câu bị cố tình làm hỏng theo ba kiểu khác nhau. Nếu báo cáo bên trên
 * không bắt được đủ ba, thì hoặc ngưỡng đang quá lỏng, hoặc phần tính toán
 * đang sai — và đó chính là lý do chúng được cài vào.
 */
function simulate(soLuot) {
  const items = q.all(
    `SELECT id, type, options_json, answer, part FROM questions
      WHERE family_id='vpet' AND part IS NOT NULL ORDER BY id`);
  if (!items.length) {
    console.error('\nNgân hàng chưa có câu VPET nào. Chạy node scripts/nhap-kich-ban.js trước.\n');
    process.exit(1);
  }

  /* Sinh số giả ngẫu nhiên có hạt giống cố định: chạy lại cho cùng kết quả,
     nên khi báo cáo đổi thì đó là do mã đổi chứ không phải do may rủi. */
  let seed = 20260812;
  const rnd = () => {
    seed = (seed + 0x6D2B79F5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  /* Box–Muller: năng lực thí sinh phân bố chuẩn chứ không đều. Dùng phân bố
     đều sẽ cho alpha đẹp hơn thực tế. */
  const gauss = () => Math.sqrt(-2 * Math.log(rnd() || 1e-9)) * Math.cos(2 * Math.PI * rnd());

  const hong = {
    [items[2].id]: 'deLai',        // ai cũng làm đúng
    [items[7].id]: 'saiKhoa',      // khoá sai: người giỏi chọn phương án khác
    [items[11].id]: 'nhieuChet'    // một phương án nhiễu không ai chọn
  };

  const b = new Map(items.map((it, i) => [it.id, ((i * 37) % 41) / 10 - 2]));  // −2.0 … +1.9
  const now = nowISO();
  /* Lượt thi giả đi qua đúng hai bảng mà phần thi dùng — `attempts` và
     `attempt_answers` — vì đó là nơi phân tích đọc. Ghi vào một bảng riêng thì
     chỉ kiểm được cái bảng riêng đó, còn đường thật vẫn chưa ai chạy thử. */
  const test = q.get("SELECT id FROM tests WHERE family_id='vpet' LIMIT 1");
  if (!test) {
    console.error('\nChưa có đề VPET nào để gắn lượt thi vào.\n');
    process.exit(1);
  }
  const section = q.get('SELECT id FROM sections WHERE test_id=? LIMIT 1', test.id);
  if (!section) {
    console.error('\nĐề VPET chưa có phần nào.\n');
    process.exit(1);
  }

  let ghi = 0;
  for (let s = 0; s < soLuot; s++) {
    const theta = gauss();
    const uname = `sim-${String(s).padStart(4, '0')}`;

    let u = q.get('SELECT id FROM users WHERE username=?', uname);
    if (!u) {
      q.run(`INSERT INTO users (username, email, name, status, created_at)
             VALUES (?,?,?,'active',?)`, uname, uname + '@mo-phong.invalid', 'Mô phỏng ' + s, now);
      u = q.get('SELECT id FROM users WHERE username=?', uname);
    }

    q.run(`INSERT INTO attempts (user_id, test_id, status, started_at, submitted_at, updated_at)
           VALUES (?,?,'submitted',?,?,?)`, u.id, test.id, now, now, now);
    const attemptId = q.val('SELECT last_insert_rowid()');

    for (const it of items) {
      const opts = JSON.parse(it.options_json || '[]');
      const kieu = hong[it.id];
      const p = 1 / (1 + Math.exp(-(theta - b.get(it.id))));

      let dung = rnd() < p;
      if (kieu === 'deLai') dung = true;
      /* Khoá sai: người giỏi tin vào phương án của họ, và phương án đó không
         phải phương án được đánh dấu là đúng. Đúng hình dạng của một câu bị
         nhập nhầm đáp án. */
      if (kieu === 'saiKhoa') dung = rnd() < 1 - p;

      let chon = null;
      if (it.type === 'mcq' && opts.length) {
        if (dung) chon = it.answer;
        else {
          const sai = opts.filter(o => o !== it.answer);
          const boQua = kieu === 'nhieuChet' ? sai.slice(0, -1) : sai;
          chon = (boQua.length ? boQua : sai)[Math.floor(rnd() * (boQua.length || sai.length))];
        }
      }

      /* Câu chấm theo rubric cho điểm 0–6 quanh mức 3, không phải đúng/sai. */
      const rubric = it.type === 'essay' || it.type === 'speaking';
      const diem = rubric
        ? Math.max(0, Math.min(6, Math.round(3 + (theta - b.get(it.id)) * 1.2 + gauss() * 0.6)))
        : null;

      q.run(
        `INSERT OR IGNORE INTO attempt_answers
           (attempt_id, question_id, section_id, answer, earned, max_score, marked_at, updated_at)
         VALUES (?,?,?,?,?,?,?,?)`,
        attemptId, it.id, section.id, chon || '',
        rubric ? diem : (dung ? 1 : 0), rubric ? 6 : 1, now, now);
      ghi++;
    }
  }

  console.log(`\n${C.y}Đã sinh ${soLuot} lượt thi giả (${ghi} câu trả lời) trên tài khoản sim-*.${C.x}`);
  console.log(`${C.d}Ba câu được cố tình làm hỏng — dễ quá, sai khoá, và nhiễu chết —`);
  console.log(`để xem báo cáo có bắt được không. Xoá bằng --xoa-gia-lap.${C.x}`);
}
