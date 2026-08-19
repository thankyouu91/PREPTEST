/**
 * Tải hai danh sách từ mở về `server/data/lexicon/`, một lần, rồi commit.
 *
 * ---------------------------------------------------------------------------
 * VÌ SAO CẦN HAI DANH SÁCH CHỨ KHÔNG PHẢI MỘT
 *
 * Chúng trả lời hai câu khác nhau:
 *
 *   từ này có phải tiếng Anh không   → cần một danh sách RỘNG
 *   từ này khó tới đâu               → cần một danh sách XẾP HẠNG
 *
 * Một danh sách 50 nghìn từ xếp theo tần suất không nói được "supercilious có
 * phải từ thật không" (nó không nằm trong 50 nghìn từ hay gặp nhất). Một danh
 * sách chính tả 49 nghìn từ không nói được "the" dễ hơn "nevertheless".
 *
 * ---------------------------------------------------------------------------
 * VÌ SAO LẤY CẢ ANH-ANH LẪN ANH-MỸ
 *
 * Nền tảng viết bằng tiếng Anh Anh: giọng đọc là en-gb, kho đề viết "realise",
 * "colour", "centre". Chỉ lấy danh sách Anh-Mỹ thì mọi từ ấy bị chấm sai chính
 * tả — nền tảng tự biến giọng chuẩn của chính mình thành lỗi của thí sinh.
 *
 * Nhưng chỉ lấy Anh-Anh thì hỏng theo chiều ngược lại, và chiều ấy rơi vào thí
 * sinh. Người học Việt Nam học cả hai biến thể, và "color" không phải lỗi chính
 * tả — nó là tiếng Anh Mỹ. Chấm nó là lỗi thì cũng giống hệt việc trừ điểm vì
 * giọng, thứ mà docs/MARKING.md §6 cấm thẳng.
 *
 * Nên từ điển tra chính tả là HỢP của hai danh sách. Kho đề vẫn viết Anh-Anh —
 * `kiem-noi-dung.mjs` gác chỗ đó — còn bài làm của thí sinh thì được chấp nhận
 * ở cả hai biến thể.
 *
 * ---------------------------------------------------------------------------
 * GIẤY PHÉP
 *
 * Cả hai đều dùng lại được, và cả hai đều đòi giữ lại thông báo bản quyền —
 * nên script ghi luôn tệp giấy phép xuống cạnh dữ liệu chứ không chỉ chép chữ.
 *
 *   node scripts/tai-tu-dien.mjs
 */
import fs from 'node:fs';
import path from 'node:path';

const OUT = path.join(process.cwd(), 'server', 'data', 'lexicon');
const C = { d: '\x1b[2m', b: '\x1b[1m', g: '\x1b[32m', r: '\x1b[31m', x: '\x1b[0m' };

const NGUON = {
  /* SCOWL, qua bản đóng gói hunspell của wooorm. en_GB-ise = Anh-Anh, viết
     "ise". Định dạng hunspell: `word/FLAGS`, cờ là luật biến đổi đuôi. */
  chinhTa: {
    urls: [
      'https://raw.githubusercontent.com/wooorm/dictionaries/main/dictionaries/en-GB/index.dic',
      'https://raw.githubusercontent.com/wooorm/dictionaries/main/dictionaries/en/index.dic'
    ],
    licenceUrl: 'https://raw.githubusercontent.com/wooorm/dictionaries/main/dictionaries/en-GB/license',
    file: 'en-words.txt',
    names: 'en-names.txt',
    licence: 'en-words.LICENCE.txt'
  },
  /* Tần suất tiếng Anh nói, từ OpenSubtitles (MIT). Dùng để xếp bậc theo hạng
     — đúng luật docs/LEARNING.md §1.4 quy định, vì chính tài liệu ấy đã nói
     "không có nguồn nào gán sẵn CEFR miễn phí". */
  tanSuat: {
    url: 'https://raw.githubusercontent.com/hermitdave/FrequencyWords/master/content/2018/en/en_50k.txt',
    licenceUrl: 'https://raw.githubusercontent.com/hermitdave/FrequencyWords/master/LICENSE',
    file: 'en-frequency.txt',
    licence: 'en-frequency.LICENCE.txt'
  }
};

async function tai(url) {
  const r = await fetch(url);
  if (!r.ok) throw new Error(`${r.status} ${url}`);
  return r.text();
}

fs.mkdirSync(OUT, { recursive: true });
console.log(`\n${C.b}Tải từ điển mở${C.x}`);
console.log('─'.repeat(70));

/* ---- Danh sách chính tả ---- */
{
  /* Tách tên riêng ra tệp khác, theo chữ hoa TRONG NGUỒN.
     ------------------------------------------------------------------
     Hai chỗ dùng cần hai thứ khác nhau. Tra chính tả thì tên riêng phải
     được chấp nhận — "Pete" không phải lỗi chính tả. Nhưng chọn từ để
     dạy thì không: bản đầu gộp chung và danh sách ứng viên B1–C2 hiện ra
     "pete", "belgrade", "cedric" nằm cạnh "reasonable" và "negligence". */
  const tu = new Set(), ten = new Set();
  for (const url of NGUON.chinhTa.urls) {
    const raw = await tai(url);
    const dong = raw.split('\n').slice(1);        // dòng đầu là số lượng
    for (const d of dong) {
      /* Bỏ cờ biến đổi đuôi. Giữ dạng gốc thôi: `server/data/lexicon.js` tự rút
         gọn đuôi lúc tra, nên không cần bung hết biến thể ra tệp. */
      const goc = d.split('/')[0].trim();
      const w = goc.toLowerCase();
      if (!w || /[^a-z'-]/.test(w)) continue;
      (/^[A-Z]/.test(goc) ? ten : tu).add(w);
    }
  }
  /* Từ vừa là tên vừa là từ thường ("mark", "bill", "rose") thì thuộc cả hai;
     danh sách từ thường thắng, vì dạy "rose" là hợp lý. */
  ten.forEach(t => { if (tu.has(t)) ten.delete(t); });

  const sorted = [...tu].sort(), sortedTen = [...ten].sort();
  fs.writeFileSync(path.join(OUT, NGUON.chinhTa.file), sorted.join('\n') + '\n');
  fs.writeFileSync(path.join(OUT, NGUON.chinhTa.names), sortedTen.join('\n') + '\n');
  fs.writeFileSync(path.join(OUT, NGUON.chinhTa.licence), await tai(NGUON.chinhTa.licenceUrl));
  console.log(`  ${C.g}✓${C.x} ${NGUON.chinhTa.file}  ${sorted.length.toLocaleString('en-US')} từ thường  ` +
    `${C.d}${Math.round(fs.statSync(path.join(OUT, NGUON.chinhTa.file)).size / 1024)} KB${C.x}`);
  console.log(`  ${C.g}✓${C.x} ${NGUON.chinhTa.names}  ${sortedTen.length.toLocaleString('en-US')} tên riêng  ` +
    `${C.d}${Math.round(fs.statSync(path.join(OUT, NGUON.chinhTa.names)).size / 1024)} KB${C.x}`);
}

/* ---- Danh sách tần suất ---- */
{
  const raw = await tai(NGUON.tanSuat.url);
  const tu = [];
  for (const d of raw.split('\n')) {
    const w = d.split(' ')[0].trim().toLowerCase();
    if (!w || /[^a-z'-]/.test(w)) continue;
    tu.push(w);
  }
  /* Chỉ giữ thứ tự, bỏ số đếm: hạng là thứ duy nhất luật xếp bậc dùng tới, và
     bỏ số đếm làm tệp nhỏ đi một nửa. */
  fs.writeFileSync(path.join(OUT, NGUON.tanSuat.file), tu.join('\n') + '\n');
  fs.writeFileSync(path.join(OUT, NGUON.tanSuat.licence), await tai(NGUON.tanSuat.licenceUrl));
  console.log(`  ${C.g}✓${C.x} ${NGUON.tanSuat.file}  ${tu.length.toLocaleString('en-US')} từ theo hạng  ` +
    `${C.d}${Math.round(fs.statSync(path.join(OUT, NGUON.tanSuat.file)).size / 1024)} KB${C.x}`);
}

console.log('─'.repeat(70));
console.log(`  Giấy phép đã ghi cạnh dữ liệu. Cả hai đòi giữ thông báo bản quyền,`);
console.log(`  ${C.d}nên đừng tách tệp .LICENCE.txt ra khỏi tệp dữ liệu.${C.x}\n`);
