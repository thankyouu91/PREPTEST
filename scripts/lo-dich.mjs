/**
 * Lấy một lô cần dịch ra, và trộn bản dịch xong trở lại kho.
 *
 * Đây là mặt tiếp xúc giữa người (hoặc tác nhân) dịch và tệp
 * `server/data/vocab-vi.tsv`. Tách ra làm hai bước có chủ đích: người dịch làm
 * việc trên một tệp lô nhỏ, còn kho chung chỉ bị sửa bởi bước trộn — bước này
 * đối chiếu từng khoá, nên một tệp lô hỏng cũng không thể làm xáo kho.
 *
 *   node scripts/lo-dich.mjs --lay=150 --ra=/tmp/lo.tsv
 *   node scripts/lo-dich.mjs --nap=/tmp/lo.tsv
 *   node scripts/lo-dich.mjs --dem
 *
 * ---------------------------------------------------------------------------
 * BƯỚC TRỘN TỪ CHỐI NHỮNG GÌ
 *
 * Một tác nhân dịch chạy không ai ngồi cạnh thì phải giả định là nó có lúc sẽ
 * trả về rác. Bước trộn từ chối bốn thứ, và đếm từng loại chứ không gộp:
 *
 *   · khoá không có trong kho          → dịch nhầm dòng, hoặc bịa ra dòng
 *   · ô dịch trống                     → không dịch được thì đừng ghi gì
 *   · ô dịch vẫn là tiếng Anh          → chép lại định nghĩa chứ không dịch
 *   · dòng đã có bản dịch rồi          → không đè, kho là nơi giữ công cũ
 *
 * Chỉ đếm "đã ghi" cho những dòng qua được cả bốn. Số ấy mới là số đáng báo.
 */
import { createRequire } from 'node:module';
import fs from 'node:fs';

const require = createRequire(import.meta.url);
const store = require('../server/data/vocab-vi.js');

const args = process.argv.slice(2);
const val = f => { const a = args.find(x => x.startsWith(f + '=')); return a ? a.slice(f.length + 1) : null; };
const C = { d: '\x1b[2m', b: '\x1b[1m', g: '\x1b[32m', r: '\x1b[31m', y: '\x1b[33m', x: '\x1b[0m' };

const LAY = val('--lay');
const RA = val('--ra');
const NAP = val('--nap');

/* ---------------------------------------------------------------- đếm ---- */
if (args.includes('--dem') || (!LAY && !NAP)) {
  const p = store.progress();
  const rows = store.read();
  console.log(`\n${C.b}Tiến độ dịch${C.x}`);
  console.log('─'.repeat(56));
  console.log(`  ${C.g}${p.done}${C.x} / ${p.total} nghĩa đã có bản dịch tiếng Việt`
    + `  ${C.d}(${(p.done / p.total * 100).toFixed(1)}%)${C.x}`);
  ['A1', 'A2', 'B1', 'B2', 'C1', 'C2'].forEach(b => {
    const n = rows.filter(r => r.level === b);
    if (!n.length) return;
    const d = n.filter(r => r.vi).length;
    const day = Math.round(d / n.length * 28);
    console.log(`  ${b}  ${'█'.repeat(day)}${'░'.repeat(28 - day)}  ${String(d).padStart(4)}/${n.length}`);
  });
  console.log('─'.repeat(56) + '\n');
  process.exit(0);
}

/* ------------------------------------------------------------ lấy lô ---- */
if (LAY) {
  const n = Math.max(1, Number(LAY));
  const lo = store.read().filter(r => !r.vi).slice(0, n);
  if (!lo.length) {
    console.log(`\n  ${C.g}Không còn nghĩa nào chờ dịch.${C.x}\n`);
    process.exit(0);
  }
  /* Cột `vi` để trống sẵn trong tệp lô — người dịch điền vào đúng cột ấy, tệp
     trả về cùng hình dạng với tệp nhận, không phải nhớ định dạng mới. */
  const out = store.COLUMNS.join('\t') + '\n'
    + lo.map(r => [r.level, r.headword, r.pos, r.en, ''].join('\t')).join('\n') + '\n';

  if (RA) { fs.writeFileSync(RA, out, 'utf8'); console.log(`  ${lo.length} dòng → ${RA}`); }
  else process.stdout.write(out);
  process.exit(0);
}

/* -------------------------------------------------------------- trộn ---- */
const noiDung = fs.readFileSync(NAP, 'utf8').split('\n');
const kho = store.read();
const chiSo = new Map();
kho.forEach((r, i) => chiSo.set(store.key(r.headword, r.pos, r.en), i));

let ghi = 0, laKhoa = 0, trong = 0, conAnh = 0, daCo = 0;
const viDuLoi = [];

/* Vẫn là tiếng Anh: không có chữ nào mang dấu tiếng Việt, mà lại dài hơn vài
   ký tự. Vài từ Việt không dấu là có thật ("hai", "ba"), nên chỉ bắt khi câu đủ
   dài để chắc chắn là một câu tiếng Anh chép lại. */
const CO_DAU = /[àáảãạăằắẳẵặâầấẩẫậèéẻẽẹêềếểễệìíỉĩịòóỏõọôồốổỗộơờớởỡợùúủũụưừứửữựỳýỷỹỵđ]/i;
const vanLaAnh = vi => vi.length > 24 && !CO_DAU.test(vi);

noiDung.forEach((line, i) => {
  if (!line.trim() || i === 0) return;
  const c = line.split('\t');
  if (c.length < 5) return;
  const [, headword, pos, en, viTho] = c;
  const vi = store.clean(viTho);
  const k = store.key(store.clean(headword), store.clean(pos), store.clean(en));
  const at = chiSo.get(k);

  if (at === undefined) { laKhoa++; if (viDuLoi.length < 5) viDuLoi.push('lạ khoá: ' + k.slice(0, 64)); return; }
  if (!vi) { trong++; return; }
  if (vanLaAnh(vi)) { conAnh++; if (viDuLoi.length < 5) viDuLoi.push('chưa dịch: ' + vi.slice(0, 64)); return; }
  if (kho[at].vi) { daCo++; return; }

  kho[at].vi = vi;
  ghi++;
});

if (ghi) store.write(kho);

const p = store.progress();
console.log(`\n${C.b}Trộn bản dịch${C.x}`);
console.log('─'.repeat(64));
console.log(`  ${C.g}${ghi} bản dịch được ghi${C.x}`
  + (daCo ? ` · ${C.d}${daCo} dòng đã có sẵn, không đè${C.x}` : '')
  + (trong ? ` · ${C.y}${trong} ô trống${C.x}` : '')
  + (conAnh ? ` · ${C.r}${conAnh} vẫn là tiếng Anh${C.x}` : '')
  + (laKhoa ? ` · ${C.r}${laKhoa} khoá không có trong kho${C.x}` : ''));
viDuLoi.forEach(v => console.log(`    ${C.d}${v}${C.x}`));
console.log(`  Tổng: ${C.g}${p.done}${C.x}/${p.total} ${C.d}(${(p.done / p.total * 100).toFixed(1)}%)${C.x}`
  + ` · còn ${p.todo} chờ dịch`);
console.log('─'.repeat(64) + '\n');

/* Mã thoát khác 0 khi lô về mà không ghi được gì — để routine biết là hỏng
   chứ không tưởng là đã xong. */
process.exit(ghi ? 0 : 1);
