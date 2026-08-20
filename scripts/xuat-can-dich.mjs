/**
 * Xuất mọi nghĩa trong kho từ vựng ra `server/data/vocab-vi.tsv` để dịch.
 *
 * ---------------------------------------------------------------------------
 * KHÔNG BAO GIỜ XOÁ MỘT BẢN DỊCH
 *
 * Lệnh này ghi đè cả tệp, nên nó phải đọc tệp cũ trước và giữ nguyên mọi ô `vi`
 * đã có. Nghĩ kỹ vì sao: cơ sở dữ liệu không nằm trong git, còn tệp này thì có.
 * Nếu ai đó dựng lại CSDL từ đầu rồi chạy lệnh này, CSDL sẽ toàn ô trống — mà
 * tệp thì đang giữ công của người dịch. Lấy CSDL đè lên tệp là xoá sạch.
 *
 * Nên thứ tự ưu tiên là: tệp thắng CSDL. CSDL chỉ đóng góp những dòng mà tệp
 * chưa có.
 *
 * ---------------------------------------------------------------------------
 * THỨ TỰ DÒNG CÓ Ý NGHĨA
 *
 * Sắp theo bậc rồi tới mặt chữ. Hai lý do: người dịch đi từ trên xuống thì dịch
 * B1 trước C2, đúng thứ tự người học cần; và thứ tự cố định thì mỗi lần chạy
 * lại chỉ sinh ra dòng mới ở đúng chỗ của nó, không xáo tung cả tệp.
 *
 *   node scripts/xuat-can-dich.mjs
 *   node scripts/xuat-can-dich.mjs --thu      (chỉ báo, không ghi)
 */
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const { q } = require('../server/db.js');
const store = require('../server/data/vocab-vi.js');

const THU = process.argv.includes('--thu') || process.argv.includes('--dry-run');
const C = { d: '\x1b[2m', b: '\x1b[1m', g: '\x1b[32m', y: '\x1b[33m', x: '\x1b[0m' };

const BAC = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2'];
const hangBac = b => { const i = BAC.indexOf(b); return i < 0 ? BAC.length : i; };

/* Bản dịch đang có trong tệp, tra theo khoá tự nhiên. */
const daDich = store.glosses();
const cu = store.read().length;

const rows = q.all(`
  SELECT e.headword, e.pos, s.level, s.en, s.vi
    FROM vocab_senses s
    JOIN vocab_entries e ON e.id = s.entry_id`)
  .map(r => {
    const headword = store.clean(r.headword);
    const pos = store.clean(r.pos);
    const en = store.clean(r.en);
    return {
      level: store.clean(r.level), headword, pos, en,
      /* Tệp trước, CSDL sau. Xem phần đầu tệp. */
      vi: daDich.get(store.key(headword, pos, en)) || store.clean(r.vi)
    };
  })
  .sort((a, b) =>
    hangBac(a.level) - hangBac(b.level) ||
    a.headword.localeCompare(b.headword) ||
    a.pos.localeCompare(b.pos) ||
    a.en.localeCompare(b.en));

/* Dòng có trong tệp mà CSDL không còn: giữ lại, đừng vứt. Có thể là do lần này
   chạy trên một CSDL nhập chưa đủ, và một bản dịch bị xoá thì không lấy lại
   được. */
const coTrongCsdl = new Set(rows.map(r => store.key(r.headword, r.pos, r.en)));
const moCoi = store.read()
  .filter(r => r.vi && !coTrongCsdl.has(store.key(r.headword, r.pos, r.en)));

const tatCa = rows.concat(moCoi);
const xong = tatCa.filter(r => r.vi).length;

console.log(`\n${C.b}Xuất danh sách cần dịch${C.x}`);
console.log('─'.repeat(70));
console.log(`  ${tatCa.length} nghĩa · ${C.g}${xong} đã dịch${C.x} · ${C.y}${tatCa.length - xong} chờ dịch${C.x}`
  + (cu ? `  ${C.d}(tệp cũ có ${cu} dòng)${C.x}` : ''));
if (moCoi.length) console.log(`  ${C.d}${moCoi.length} bản dịch không còn khớp nghĩa nào trong CSDL — vẫn giữ${C.x}`);

BAC.forEach(b => {
  const n = tatCa.filter(r => r.level === b);
  if (n.length) console.log(`  ${b}  ${String(n.length).padStart(4)} nghĩa` +
    `  ${C.d}${n.filter(r => r.vi).length} đã dịch${C.x}`);
});

if (THU) {
  console.log(`\n  ${C.d}(--thu: chưa ghi gì)${C.x}\n`);
  process.exit(0);
}

store.write(tatCa);
console.log(`\n  Đã ghi ${store.FILE.replace(process.cwd() + '/', '')}`);
console.log('─'.repeat(70) + '\n');
