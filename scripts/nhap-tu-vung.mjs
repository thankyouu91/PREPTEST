/**
 * Bổ sung từ vựng B1–C2 vào khu tự học, lấy nghĩa từ Free Dictionary API.
 *
 * ---------------------------------------------------------------------------
 * CHỌN TỪ NÀO
 *
 * Không chọn tay. Danh sách tần suất trong `server/data/lexicon.js` đã xếp hạng
 * sẵn, và docs/LEARNING.md §1.4 đã quy định hạng nào là bậc nào — nên "từ B2"
 * là một truy vấn chứ không phải một ý kiến. Lệnh này lấy các từ trong dải hạng
 * của bậc được yêu cầu, bỏ những từ đã có trong kho, rồi tra nghĩa.
 *
 * Lọc bốn lớp, vì danh sách tần suất lấy từ phụ đề phim nên lẫn tên riêng, tiếng
 * lóng, dạng chia động từ và mảnh vụn. Ba lớp đầu chạy trước khi gọi mạng:
 *   · phải là từ thật theo từ điển chính tả, không phải tên riêng
 *   · bỏ từ dưới ba chữ cái, vốn hầu hết là viết tắt
 *   · bỏ dạng biến đổi của từ khác — "showing", "heroes", "drank"
 * Lớp thứ tư cần có nghĩa mới xét được, nằm ở `dictionary.teachable()`.
 *
 * ---------------------------------------------------------------------------
 * NGHĨA TIẾNG VIỆT CÓ CHỖ THIẾU, VÀ KHÔNG GIẤU
 *
 * Wiktionary dịch không đều. "tradition" có nghĩa tiếng Việt, "festival" và
 * "trunk" thì không — mà đó là những từ đáng dạy nhất. Ban đầu lệnh này bỏ luôn
 * từ nào không có bản dịch, và mất hai phần ba một mẻ B2 vì lý do đó.
 *
 * Nay giữ lại: định nghĩa tiếng Anh đã dạy được từ, cột `vi` để trống chứ không
 * bịa. Trống thì đếm được và báo ra cuối lệnh, kèm câu truy vấn lấy danh sách
 * chờ dịch. Chạy lại lệnh không đè lên bản dịch tay đã có.
 *
 * ---------------------------------------------------------------------------
 * GỌI MẠNG CÓ CHỪNG MỰC
 *
 * Dịch vụ này miễn phí và không đòi khoá. Đúng vì vậy mà không được phép quật
 * nó: mặc định nghỉ 250 ms giữa hai lần gọi, gặp 429 hoặc 5xx thì lùi dần và
 * thử lại, gặp 404 thì đi tiếp vì "không có trong từ điển" là chuyện thường.
 *
 * Chạy lại được: từ đã có trong kho thì bỏ qua, nên cắt giữa chừng rồi chạy
 * tiếp là an toàn.
 *
 *   node scripts/nhap-tu-vung.mjs --bac=B2 --so=50
 *   node scripts/nhap-tu-vung.mjs --bac=B1,B2,C1,C2 --so=25
 *   node scripts/nhap-tu-vung.mjs --bac=B2 --so=10 --thu
 */
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const { q, tx } = require('../server/db.js');
const lexicon = require('../server/data/lexicon.js');
const dict = require('../server/providers/dictionary.js');

const args = process.argv.slice(2);
const val = f => { const a = args.find(x => x.startsWith(f + '=')); return a ? a.slice(f.length + 1) : null; };
const THU = args.includes('--thu') || args.includes('--dry-run');
const BAC = (val('--bac') || 'B1,B2,C1,C2').toUpperCase().split(',').map(s => s.trim()).filter(Boolean);
const SO = Math.max(1, Number(val('--so') || 25));
const NGHI = Math.max(0, Number(val('--nghi') || 250));

const C = { d: '\x1b[2m', b: '\x1b[1m', g: '\x1b[32m', r: '\x1b[31m', y: '\x1b[33m', x: '\x1b[0m' };
const ngu = ms => new Promise(r => setTimeout(r, ms));

const HOP_LE = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2'];
const sai = BAC.filter(b => !HOP_LE.includes(b));
if (sai.length) {
  console.error(`\nBậc không hợp lệ: ${sai.join(', ')}. Chọn trong ${HOP_LE.join(', ')}.\n`);
  process.exit(1);
}

/* Từ đã có trong kho, để không tra lại. */
const daCo = new Set(q.all('SELECT headword FROM vocab_entries').map(r => r.headword));

/**
 * Dạng biến đổi của một từ khác — không được làm mục từ.
 *
 * Danh sách tần suất đếm từng mặt chữ, nên "showing", "dropping", "heroes",
 * "drank" và "hidden" đều có hạng riêng. Mẻ nhập đầu tiên đưa cả năm vào kho
 * thành năm mục từ, mà "drank" không phải một từ để học: nó là quá khứ của
 * "drink", và bảng `vocab_forms` mới là chỗ của nó.
 *
 * Hai đường bắt, vì tiếng Anh có hai loại:
 *   · đều đặn — `lexicon.bases()` cắt hậu tố rồi soi lại vào từ điển
 *   · bất quy tắc — tra thẳng bảng 193 động từ trong `irregular_verbs`
 *
 * Bắt hụt vẫn còn ("criteria" lọt), và bắt nhầm cũng có: "goods" bị coi là số
 * nhiều của "good" nên mất, dù nghĩa "hàng hoá" là một từ B2 riêng. Đổi lấy
 * việc không có 14 dạng chia động từ nằm trong bảng từ vựng thì đáng, và người
 * quản trị vẫn thêm tay lại được.
 */
const BIEN_DOI = new Set();
for (const v of q.all('SELECT v1, v2, v3, ving FROM irregular_verbs')) {
  const goc = String(v.v1 || '').trim().toLowerCase();
  /* Vài động từ có hai dạng, ghi kiểu "learnt/learned". */
  for (const o of [v.v2, v.v3, v.ving]) {
    for (const dang of String(o || '').toLowerCase().split('/')) {
      const t = dang.trim();
      /* "cut/cut/cut": dạng trùng từ gốc thì bỏ qua, nếu không thì loại luôn
         chính từ gốc khỏi danh sách ứng viên. */
      if (t && t !== goc) BIEN_DOI.add(t);
    }
  }
}

const laBienDoi = w =>
  BIEN_DOI.has(w) || lexicon.bases(w).some(b => b !== w && lexicon.WORDS.has(b));

/**
 * Ứng viên của một bậc: đi theo hạng tần suất, giữ lại từ thật.
 *
 * Đi từ đầu dải xuống chứ không lấy ngẫu nhiên — từ hay gặp hơn trong cùng một
 * bậc thì đáng học trước, và làm vậy thì chạy lại lệnh sẽ nối tiếp chứ không
 * nhảy lung tung.
 */
function ungVien(bac, can) {
  const out = [];
  for (const [w, rank] of lexicon.RANK) {
    if (out.length >= can) break;
    if (lexicon.bandOf(w) !== bac) continue;
    if (daCo.has(w)) continue;
    if (w.length < 3) continue;              // viết tắt, mảnh vụn
    if (lexicon.isName(w)) continue;         // tên riêng: không phải từ để dạy
    if (!lexicon.WORDS.has(w)) continue;     // phải là từ thường trong từ điển
    if (laBienDoi(w)) continue;              // dạng chia của từ khác
    out.push({ word: w, rank });
  }
  return out;
}

console.log(`\n${C.b}Bổ sung từ vựng${C.x}  ${C.d}${BAC.join(', ')} · tối đa ${SO} từ mỗi bậc${C.x}`);
console.log('─'.repeat(74));

const keHoach = BAC.map(bac => ({ bac, tu: ungVien(bac, SO) }));
keHoach.forEach(k => console.log(`  ${k.bac}  ${String(k.tu.length).padStart(3)} từ  ` +
  `${C.d}${k.tu.slice(0, 8).map(t => t.word).join(', ')}${k.tu.length > 8 ? ' …' : ''}${C.x}`));

if (THU) {
  console.log(`\n  ${C.d}(--thu: chưa gọi mạng, chưa ghi gì)${C.x}\n`);
  process.exit(0);
}

let them = 0, khong = 0, hong = 0, nghia = 0, viDu = 0, thieuDich = 0;
const bo = [];          // từ tra được nhưng không đưa vào giáo trình
const daThem = [];      // từ đã thêm, in ra cuối để người soát nhìn được
const batDau = Date.now();

for (const { bac, tu } of keHoach) {
  for (const { word, rank } of tu) {
    let ket = null;
    /* Lùi dần rồi thử lại, nhưng chỉ với lỗi đáng thử lại. 404 là "không có
       từ này", thử lại bao nhiêu lần cũng vẫn thế. */
    for (let lan = 0; lan < 3; lan++) {
      try { ket = await dict.lookup(word); break; }
      catch (e) {
        if (!e.retryable || lan === 2) { hong++; console.log(`  ${C.r}✗${C.x} ${word} — ${e.message}`); break; }
        await ngu(1000 * Math.pow(2, lan));
      }
    }
    await ngu(NGHI);

    if (!ket) { khong++; continue; }

    /* Lọc theo giáo trình sau khi đã có nghĩa — trước đó không phân biệt được
       "randy" với "negligence". Luật nằm ở providers/dictionary.js. */
    if (!dict.teachable(ket)) { bo.push(word); continue; }

    tx(() => {
      for (const e of ket) {
        q.run(
          `INSERT INTO vocab_entries (headword, pos, level, level_source, ipa_uk, ipa_us,
             freq_rank, source, licence, sort)
           VALUES (?,?,?,'corpus',?,?,?,?,?,0)
           ON CONFLICT(headword, pos) DO UPDATE SET
             ipa_uk=excluded.ipa_uk, ipa_us=excluded.ipa_us, freq_rank=excluded.freq_rank,
             source=excluded.source, licence=excluded.licence,
             /* docs/LEARNING.md §1.4 luật 4: chỉnh tay trong khu quản trị luôn
                thắng ba luật tự động, nên bậc đã đặt tay thì không đụng vào. */
             level = CASE WHEN vocab_entries.level_source='manual'
                          THEN vocab_entries.level ELSE excluded.level END`,
          e.headword, e.pos, bac, e.ipaUk || null, e.ipaUs || null, rank, e.source, e.licence);

        const id = q.val('SELECT id FROM vocab_entries WHERE headword=? AND pos=?', e.headword, e.pos);
        e.senses.forEach((s, i) => {
          q.run(`INSERT INTO vocab_senses (entry_id, en, vi, level, note, sort)
                 VALUES (?,?,?,?,?,?)
                 ON CONFLICT(entry_id, en) DO UPDATE SET
                   /* Chỉ đè bản dịch khi lần này có dịch. Wiktionary thiếu
                      nghĩa tiếng Việt cho nhiều từ thường; nếu người biên tập
                      đã dịch tay rồi mà chạy lại lệnh này thì không được xoá
                      công của họ bằng một ô trống. */
                   vi = CASE WHEN excluded.vi <> '' THEN excluded.vi ELSE vocab_senses.vi END,
                   level=excluded.level, note=excluded.note, sort=excluded.sort`,
            id, s.en, s.vi, bac, s.note || null, i);
          nghia++;
          if (!s.vi) thieuDich++;

          const sid = q.val('SELECT id FROM vocab_senses WHERE entry_id=? AND en=?', id, s.en);
          s.examples.forEach((x, j) => {
            q.run(`INSERT OR IGNORE INTO vocab_examples (sense_id, en, vi, source, licence, sort)
                   VALUES (?,?,?,?,?,?)`, sid, x, '', e.source, e.licence, j);
            viDu++;
          });
        });
      }
    });

    daCo.add(word);
    daThem.push(word);
    them++;
    if (them % 10 === 0) process.stdout.write(`  ${C.d}${them} từ…${C.x}\r`);
  }
}

const phut = (Date.now() - batDau) / 60000;
const conThieu = q.val(`SELECT COUNT(*) c FROM vocab_senses WHERE vi = ''`);

console.log('\n' + '─'.repeat(74));
console.log(`  ${C.g}${them} từ thêm vào${C.x} · ${nghia} nghĩa · ${viDu} ví dụ`
  + (khong ? ` · ${C.d}${khong} từ không có trong từ điển${C.x}` : '')
  + (bo.length ? ` · ${C.d}${bo.length} từ không hợp giáo trình${C.x}` : '')
  + (hong ? ` · ${C.r}${hong} lỗi mạng${C.x}` : '') + `  ${C.d}${phut.toFixed(1)} phút${C.x}`);

/* In cả hai danh sách. Bộ lọc giáo trình là một phán đoán, và phán đoán thì
   phải nhìn thấy được mới sửa được — cả từ đã nhận lẫn từ đã loại. */
if (daThem.length) console.log(`\n  ${C.d}Đã thêm: ${daThem.join(', ')}${C.x}`);
if (bo.length) console.log(`\n  ${C.d}Đã loại (tiếng lóng, phương ngữ, chuyên ngành hẹp):`
  + `\n  ${bo.join(', ')}${C.x}`);

/* Không im lặng về chỗ thiếu. Wiktionary không có nghĩa tiếng Việt cho nhiều từ
   rất thường gặp; giữ lại mục từ với định nghĩa tiếng Anh là đúng, nhưng phải
   nói ra còn bao nhiêu chỗ chờ dịch, kèm câu lệnh để lấy danh sách. */
if (thieuDich) {
  console.log(`\n  ${C.y}${thieuDich}/${nghia} nghĩa lần này chưa có bản dịch tiếng Việt${C.x}`);
  console.log(`  ${C.d}(toàn kho: ${conThieu} nghĩa đang chờ dịch). Định nghĩa tiếng Anh vẫn dùng`);
  console.log(`  được, cột vi để trống chứ không bịa. Xem danh sách:${C.x}`);
  console.log(`  ${C.d}sqlite3 data/prep.sqlite "SELECT e.headword, s.en FROM vocab_senses s` +
    ` JOIN vocab_entries e ON e.id=s.entry_id WHERE s.vi='' LIMIT 50"${C.x}`);
}

console.log(`\n  Nguồn Wiktionary, giấy phép CC BY-SA 4.0, đã ghi vào từng mục.`);
console.log(`  ${C.d}Ví dụ câu cũng chưa có bản dịch: cột vi của vocab_examples để trống`);
console.log(`  chờ người biên tập.${C.x}`);
console.log('─'.repeat(74) + '\n');
