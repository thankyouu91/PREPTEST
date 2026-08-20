/**
 * Lấy một lô cần dịch ra, và trộn bản dịch xong trở lại kho.
 *
 * Đây là mặt tiếp xúc giữa người (hoặc tác nhân) dịch và tệp
 * `server/data/vocab-vi.tsv`. Tách ra làm hai bước có chủ đích: người dịch làm
 * việc trên một tệp lô nhỏ, còn kho chung chỉ bị sửa bởi bước trộn — bước này
 * đối chiếu từng khoá, nên một tệp lô hỏng cũng không thể làm xáo kho.
 *
 *   node scripts/lo-dich.mjs --lay=40 --ra=/tmp/lo1.tsv
 *   node scripts/lo-dich.mjs --lay=40 --bo=40 --ra=/tmp/lo2.tsv   (lô rời nhau)
 *   node scripts/lo-dich.mjs --nap=/tmp/lo1.tsv
 *   node scripts/lo-dich.mjs --laysoat=100 --ra=/tmp/s1.tsv       (lô chờ soát)
 *   node scripts/lo-dich.mjs --napsoat=/tmp/s1.tsv
 *   node scripts/lo-dich.mjs --dem
 *   node scripts/lo-dich.mjs --kiem
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
const LAY_SOAT = val('--laysoat');
const NAP_SOAT = val('--napsoat');

/* ---------------------------------------------------------------- kiểm ---- */
/* Chạy được mà không cần server và không cần CSDL, vì chỗ gọi nó là một tác vụ
   tự động sắp commit — nó phải trả lời được "tệp này có hỏng không" bằng đúng
   một lệnh. `scripts/test-vocab.mjs` kiểm cùng những điều này, nhưng chỉ chạy
   khi có server, mà lúc sắp commit thì chưa chắc đã có. */
if (args.includes('--kiem')) {
  const fs2 = fs.readFileSync(store.FILE, 'utf8').split('\n');
  const than = fs2.filter((l, i) => l.trim() && i > 0);
  const loi = [];

  const lech = than.filter(l => l.split('\t').length !== store.COLUMNS.length);
  if (lech.length) loi.push(`${lech.length} dòng lệch cột: ${lech[0].slice(0, 60)}`);

  const dem = new Map();
  store.read().forEach(r => {
    const k = store.key(r.headword, r.pos, r.en);
    dem.set(k, (dem.get(k) || 0) + 1);
    if (!r.level || !r.headword || !r.pos || !r.en) loi.push('dòng thiếu cột khoá: ' + k.slice(0, 50));
  });
  const trung = [...dem.entries()].filter(([, n]) => n > 1);
  if (trung.length) loi.push(`${trung.length} khoá trùng: ${trung[0][0].slice(0, 50)}`);

  const CO_DAU_K = /[àáảãạăằắẳẵặâầấẩẫậèéẻẽẹêềếểễệìíỉĩịòóỏõọôồốổỗộơờớởỡợùúủũụưừứửữựỳýỷỹỵđ]/i;
  const anh = store.read().filter(r => r.vi && r.vi.length > 24 && !CO_DAU_K.test(r.vi));
  if (anh.length) loi.push(`${anh.length} ô dịch vẫn là tiếng Anh: ${anh[0].vi.slice(0, 50)}`);

  if (loi.length) {
    console.log(`\n  ${C.r}Tệp bản dịch có vấn đề:${C.x}`);
    loi.slice(0, 6).forEach(l => console.log(`    · ${l}`));
    console.log('');
    process.exit(1);
  }
  const p0 = store.progress();
  console.log(`  Tệp bản dịch sạch: ${p0.total} dòng, ${p0.done} đã dịch, ${p0.todo} chờ dịch.`);
  process.exit(0);
}

/* ------------------------------------------------------- lấy lô soát ---- */
/* Lấy những dòng ĐÃ dịch mà chưa ai đọc lại. Cột `soat` để trống sẵn cho người
   soát điền: 'ok' nếu đứng sau bản dịch, hoặc một câu nói rõ nghi ngờ gì. */
if (LAY_SOAT) {
  const n = Math.max(1, Number(LAY_SOAT));
  const bo = Math.max(0, Number(val('--bo') || 0));
  const lo = store.read().filter(r => r.vi && !r.soat).slice(bo, bo + n);
  if (!lo.length) {
    console.log(`\n  ${C.g}Không còn dòng nào chờ soát.${C.x}\n`);
    process.exit(0);
  }
  const out = store.COLUMNS.join('\t') + '\n'
    + lo.map(r => [r.level, r.headword, r.pos, r.en, r.vi, ''].join('\t')).join('\n') + '\n';
  if (RA) { fs.writeFileSync(RA, out, 'utf8'); console.log(`  ${lo.length} dòng chờ soát → ${RA}`); }
  else process.stdout.write(out);
  process.exit(0);
}

/* --------------------------------------------------------- trộn soát ---- */
/* Chỉ ghi cột `soat`. Không đụng vào `vi` — xem phần đầu server/data/vocab-vi.js:
   người soát được phép nghi ngờ, không được phép sửa đè. Một người soát sai mà
   sửa đè thì bản dịch đúng biến mất và không còn dấu vết nào là đã có bất đồng. */
if (NAP_SOAT) {
  const dong = fs.readFileSync(NAP_SOAT, 'utf8').split('\n');
  const kho = store.read();
  const chiSo = new Map();
  kho.forEach((r, i) => chiSo.set(store.key(r.headword, r.pos, r.en), i));

  let ghi = 0, dat = 0, ngo = 0, laKhoa = 0, trong = 0, doiVi = 0;
  const viDuNgo = [];

  dong.forEach((line, i) => {
    if (!line.trim() || i === 0) return;
    const c = line.split('\t');
    if (c.length < 6) return;
    const [, headword, pos, en, vi, soatTho] = c;
    const soat = store.clean(soatTho);
    const at = chiSo.get(store.key(store.clean(headword), store.clean(pos), store.clean(en)));

    if (at === undefined) { laKhoa++; return; }
    if (!soat) { trong++; return; }
    /* Người soát trả về bản dịch khác với bản trong kho: bỏ qua phần đó, chỉ
       nhận lời nhận xét. Đếm riêng để biết chuyện này có hay xảy ra không. */
    if (store.clean(vi) !== kho[at].vi) doiVi++;

    kho[at].soat = soat;
    ghi++;
    if (soat === 'ok') dat++;
    else { ngo++; if (viDuNgo.length < 6) viDuNgo.push(`${kho[at].headword} (${kho[at].pos}): ${soat.slice(0, 70)}`); }
  });

  if (ghi) store.write(kho);
  const p1 = store.progress();

  console.log(`\n${C.b}Trộn kết quả soát${C.x}`);
  console.log('─'.repeat(64));
  console.log(`  ${C.g}${dat} dòng được xác nhận${C.x}`
    + (ngo ? ` · ${C.y}${ngo} dòng bị nghi ngờ${C.x}` : '')
    + (trong ? ` · ${C.d}${trong} ô soát trống${C.x}` : '')
    + (laKhoa ? ` · ${C.r}${laKhoa} khoá không có trong kho${C.x}` : '')
    + (doiVi ? ` · ${C.r}${doiVi} dòng người soát tự sửa bản dịch (đã bỏ qua)${C.x}` : ''));
  viDuNgo.forEach(v => console.log(`    ${C.y}?${C.x} ${C.d}${v}${C.x}`));
  console.log(`  Đã soát ${C.g}${p1.soat}${C.x}/${p1.done} bản dịch`
    + ` · ${C.y}${p1.ngo} dòng cần người xem${C.x} · còn ${p1.choSoat} chờ soát`);
  console.log('─'.repeat(64) + '\n');

  process.exit(ghi ? 0 : 1);
}

/* ---------------------------------------------------------------- đếm ---- */
if (args.includes('--dem') || (!LAY && !NAP)) {
  const p = store.progress();
  const rows = store.read();
  console.log(`\n${C.b}Tiến độ dịch${C.x}`);
  console.log('─'.repeat(56));
  console.log(`  ${C.g}${p.done}${C.x} / ${p.total} nghĩa đã có bản dịch tiếng Việt`
    + `  ${C.d}(${(p.done / p.total * 100).toFixed(1)}%)${C.x}`);
  console.log(`  ${C.g}${p.soat}${C.x} / ${p.done} bản dịch đã được đọc lại`
    + (p.ngo ? `  ${C.y}· ${p.ngo} dòng bị nghi ngờ, cần người xem${C.x}` : '')
    + (p.choSoat ? `  ${C.d}· ${p.choSoat} chờ soát${C.x}` : ''));
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
  /* Bỏ qua bao nhiêu dòng chưa dịch trước khi lấy.
     Lý do có tham số này: không có nó thì `--lay` luôn trả về đúng N dòng đầu,
     nên hai lô chỉ rời nhau sau khi lô trước đã được trộn — tức là các lô phải
     chạy nối tiếp. Lần chạy đầu tiên vì thế chỉ làm được một lô rồi hết lượt,
     37 nghĩa thay vì 160. Với `--bo` thì lấy được bốn lô rời nhau ngay từ đầu
     và giao cho bốn người dịch cùng lúc. */
  const bo = Math.max(0, Number(val('--bo') || 0));
  const lo = store.read().filter(r => !r.vi).slice(bo, bo + n);
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
