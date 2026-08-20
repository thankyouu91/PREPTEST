/**
 * Nạp bản dịch tiếng Việt từ `server/data/vocab-vi.tsv` vào `vocab_senses`.
 *
 * Chạy sau `nhap-tu-vung.mjs`, vì tệp thắng API: Wiktionary sau này có mọc thêm
 * nghĩa tiếng Việt cho một từ đã có người dịch thì vẫn giữ bản của người —
 * bản ấy viết cho người học Việt ở đúng bậc đó, còn bản của wiki mới hơn thì
 * chưa chắc đã hợp hơn.
 *
 * ---------------------------------------------------------------------------
 * DÒNG MỒ CÔI THÌ GỌI TÊN RA
 *
 * Khoá là (mặt chữ, từ loại, định nghĩa tiếng Anh). Wiktionary sửa một định
 * nghĩa là bản dịch của dòng đó mất chỗ bám. Lệnh này đếm và in ra chứ không
 * lặng lẽ bỏ qua — mất một bản dịch mà không ai biết thì lần sau lại dịch lại
 * từ đầu.
 *
 *   node scripts/nap-ban-dich.mjs
 *   node scripts/nap-ban-dich.mjs --thu      (chỉ báo, không ghi)
 */
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const { q, tx } = require('../server/db.js');
const store = require('../server/data/vocab-vi.js');

const THU = process.argv.includes('--thu') || process.argv.includes('--dry-run');
const C = { d: '\x1b[2m', b: '\x1b[1m', g: '\x1b[32m', y: '\x1b[33m', x: '\x1b[0m' };

const rows = store.read().filter(r => r.vi);

/* Nghĩa đang có trong CSDL, tra theo cùng khoá tự nhiên. */
const trongCsdl = new Map();
q.all(`SELECT s.id, s.vi, e.headword, e.pos, s.en
         FROM vocab_senses s JOIN vocab_entries e ON e.id = s.entry_id`)
  .forEach(r => trongCsdl.set(store.key(r.headword, r.pos, r.en), r));

let doi = 0, giongCu = 0;
const moCoi = [];

for (const r of rows) {
  const co = trongCsdl.get(store.key(r.headword, r.pos, r.en));
  if (!co) { moCoi.push(r); continue; }
  if (co.vi === r.vi) { giongCu++; continue; }
  doi++;
  if (!THU) tx(() => q.run('UPDATE vocab_senses SET vi=? WHERE id=?', r.vi, co.id));
}

const conThieu = q.val(`SELECT COUNT(*) c FROM vocab_senses WHERE vi = ''`);

console.log(`\n${C.b}Nạp bản dịch${C.x}${THU ? `  ${C.d}(--thu)${C.x}` : ''}`);
console.log('─'.repeat(70));
console.log(`  ${rows.length} bản dịch trong tệp · ${C.g}${doi} nghĩa được cập nhật${C.x}`
  + (giongCu ? ` · ${C.d}${giongCu} đã giống sẵn${C.x}` : ''));
if (moCoi.length) {
  console.log(`  ${C.y}${moCoi.length} bản dịch mồ côi${C.x} ${C.d}— không còn nghĩa nào khớp:${C.x}`);
  moCoi.slice(0, 8).forEach(r => console.log(`    ${C.d}${r.headword} (${r.pos}) — ${r.en.slice(0, 56)}${C.x}`));
  if (moCoi.length > 8) console.log(`    ${C.d}… và ${moCoi.length - 8} dòng nữa${C.x}`);
}
console.log(`  Còn ${THU ? conThieu : q.val(`SELECT COUNT(*) c FROM vocab_senses WHERE vi = ''`)} nghĩa chưa có bản dịch trong CSDL.`);
console.log('─'.repeat(70) + '\n');
