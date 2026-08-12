/**
 * Dựng audio đề bằng Kokoro — chạy tại chỗ, không khoá, không mạng.
 *
 * ---------------------------------------------------------------------------
 * VÌ SAO KOKORO KHÔNG NẰM TRONG SERVER
 *
 * docs/VOICE.md 4.1 đã chốt: audio dựng lúc soạn đề, phát từ kho lúc thi. Nên
 * bộ dựng không cần có mặt trên Cloud Run — nó là công cụ chạy trên máy, và
 * container triển khai không đổi một dòng nào. Dự án vẫn đúng một dependency.
 *
 * Kokoro là Apache-2.0, chạy CPU, không cần khoá API và không gọi mạng lúc
 * dựng. Đổi lại nó là một model phải tải về (311 MB) chứ không phải một URL.
 * ---------------------------------------------------------------------------
 *
 * KHOẢNG NGHỈ DO TA TỰ GHÉP, KHÔNG NHỜ MODEL
 *
 * Kokoro không hiểu SSML. Đưa `<break time="1.0s" />` vào là nó ĐỌC TO cái thẻ
 * — đo được chứ không phải đoán: riêng cái thẻ dựng ra 2,5 giây tiếng nói,
 * RMS 0,106. Gửi thẳng `parsed.text` là mỗi câu nghe trong ngân hàng có một
 * giọng đọc "break time one point zero s" ở giữa.
 *
 * Nên Node gửi sang `segments` — đúng danh sách mà màn xem trước vẽ — và phía
 * Python đọc từng đoạn nói rồi chèn im lặng số đúng bằng mili-giây yêu cầu.
 *
 * Đây không phải cách lách. Nó tốt hơn: với ElevenLabs, `<break>` là lời đề
 * nghị model tự diễn giải, hai lần dựng cùng một kịch bản có thể lệch nhau.
 * Ở đây 1000 ms là 24000 mẫu số không, lần nào cũng vậy. Với một bài thi mà
 * hai thí sinh phải nghe đúng một thứ, chính xác thắng biểu cảm.
 *
 *   node scripts/dung-audio-kokoro.mjs --thu          xem sẽ dựng gì, không ghi
 *   node scripts/dung-audio-kokoro.mjs                dựng những câu chưa có
 *   node scripts/dung-audio-kokoro.mjs --part=E       chỉ một part
 *   node scripts/dung-audio-kokoro.mjs --lam-lai      dựng lại cả câu đã có
 *   node scripts/dung-audio-kokoro.mjs --giong=am_michael
 *
 * Cài đặt một lần, xem tools/kokoro/README.md.
 *
 * Câu dựng xong vào trạng thái `ready`, KHÔNG phải `approved`. Người vẫn phải
 * nghe rồi mới duyệt — máy đọc sai tên riêng là chuyện xảy ra thật, và cổng
 * duyệt là chỗ chặn (docs/VOICE.md 4.6). Cổng phát hành trong server/api.js
 * đòi `approved`, nên lệnh này một mình không đưa được đề nào lên sàn.
 */
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const { q, nowISO } = require('../server/db.js');
const { parseScript } = require('../server/script-markup.js');
const storage = require('../server/storage.js');

const args = process.argv.slice(2);
const has = f => args.includes(f);
const val = f => { const a = args.find(x => x.startsWith(f + '=')); return a ? a.slice(f.length + 1) : null; };

const THU = has('--thu') || has('--dry-run');
const LAM_LAI = has('--lam-lai') || has('--force');
const PART = (val('--part') || '').toUpperCase();
const GIONG = val('--giong') || val('--voice') || 'bf_emma';
const TOC_DO = Number(val('--toc-do') || val('--speed') || 1.25);
const GIOI_HAN = Number(val('--so-cau') || val('--limit') || 0);

/* Nơi để model. Đặt ngoài repo: 338 MB không thuộc về git, và mỗi máy tải một
   lần rồi dùng mãi. */
const HOME = process.env.KOKORO_HOME || path.join(process.env.HOME || '/root', '.kokoro');
const PY = process.env.KOKORO_PYTHON || path.join(HOME, 'venv', 'bin', 'python');
const MODEL = path.join(HOME, 'kokoro-v1.0.onnx');
const VOICES = path.join(HOME, 'voices-v1.0.bin');
const RENDER = path.resolve('tools/kokoro/render.py');

const C = { d: '\x1b[2m', b: '\x1b[1m', r: '\x1b[31m', y: '\x1b[33m', g: '\x1b[32m', x: '\x1b[0m' };

/* ------------------------------------------------------------------ */

function thieuGi() {
  const missing = [];
  if (!fs.existsSync(PY)) missing.push(`Python của Kokoro: ${PY}`);
  if (!fs.existsSync(MODEL)) missing.push(`model: ${MODEL}`);
  if (!fs.existsSync(VOICES)) missing.push(`bộ giọng: ${VOICES}`);
  if (!fs.existsSync(RENDER)) missing.push(`bộ dựng: ${RENDER}`);
  return missing;
}

/** Gọi Python một lần cho một câu; nhận MP3 trên stdout, thông tin trên stderr. */
function dungMot(segments) {
  return new Promise((resolve, reject) => {
    const child = spawn(PY, [RENDER], { stdio: ['pipe', 'pipe', 'pipe'] });
    const out = [], err = [];
    child.stdout.on('data', d => out.push(d));
    child.stderr.on('data', d => err.push(d));
    child.on('error', reject);
    child.on('close', code => {
      const meta = Buffer.concat(err).toString().trim();
      if (code !== 0) {
        let msg = meta;
        try { msg = JSON.parse(meta).error || meta; } catch (e) { /* để nguyên */ }
        return reject(new Error(msg || `bộ dựng thoát với mã ${code}`));
      }
      let info = {};
      try { info = JSON.parse(meta); } catch (e) { /* không sao */ }
      resolve({ mp3: Buffer.concat(out), info });
    });
    child.stdin.end(JSON.stringify({
      model: MODEL, voices: VOICES, voice: GIONG, speed: TOC_DO, segments
    }));
  });
}

/* Cùng công thức băm với đường dựng ElevenLabs: nội dung + giọng + model +
   tham số. Câu chưa sửa gì thì băm không đổi và bỏ qua được. */
const bam = (text, voice, speed) => crypto.createHash('sha256')
  .update([text, voice, 'kokoro-v1.0', String(speed)].join('\u0000')).digest('hex');

/* ------------------------------------------------------------------ */

const thieu = thieuGi();
if (thieu.length) {
  console.error(`\n${C.r}Chưa cài xong Kokoro.${C.x} Thiếu:\n`);
  thieu.forEach(m => console.error('  · ' + m));
  console.error(`\nXem hướng dẫn cài một lần: tools/kokoro/README.md\n`);
  process.exit(1);
}

const rows = q.all(
  `SELECT id, part, prompt, audio_script, audio_status, audio_hash, audio_key
     FROM questions
    WHERE family_id='vpet' AND audio_script IS NOT NULL AND TRIM(audio_script) <> ''
      ${PART ? 'AND part = ?' : ''}
    ORDER BY part, id`, ...(PART ? [PART] : []));

if (!rows.length) {
  console.error(`\nKhông có câu nào có kịch bản đọc${PART ? ' ở part ' + PART : ''}.\n` +
    `Chạy node scripts/nhap-kich-ban.js trước.\n`);
  process.exit(1);
}

const viec = [];
for (const r of rows) {
  const parsed = parseScript(r.audio_script, { speed: TOC_DO });
  const h = bam(parsed.plain, GIONG, TOC_DO);
  const daCo = r.audio_key && r.audio_hash === h;
  if (daCo && !LAM_LAI) continue;
  viec.push({ row: r, parsed, hash: h });
  if (GIOI_HAN && viec.length >= GIOI_HAN) break;
}

const boQua = rows.length - viec.length;

console.log(`\n${C.b}Dựng audio bằng Kokoro${C.x}  ${C.d}giọng ${GIONG} · tốc độ ${TOC_DO}×${C.x}`);
console.log('─'.repeat(72));
console.log(`  ${rows.length} câu có kịch bản · ${viec.length} câu cần dựng · ${boQua} câu bỏ qua (đã có, băm khớp)`);

const uocTinh = viec.reduce((n, v) => n + v.parsed.stats.estimatedMs, 0) / 1000;
console.log(`  ${C.d}ước tính ${Math.round(uocTinh)} giây audio; Kokoro chạy nhanh hơn thời gian thực trên CPU${C.x}`);

if (THU) {
  console.log(`\n  ${C.d}(--thu: chưa dựng gì)${C.x}\n`);
  const theoPart = {};
  viec.forEach(v => { theoPart[v.row.part] = (theoPart[v.row.part] || 0) + 1; });
  Object.keys(theoPart).sort().forEach(p => console.log(`    part ${p}: ${theoPart[p]} câu`));
  console.log('');
  process.exit(0);
}

if (!viec.length) {
  console.log(`\n  ${C.g}Không có gì để dựng.${C.x}  ${C.d}Thêm --lam-lai để dựng lại từ đầu.${C.x}\n`);
  process.exit(0);
}

console.log('');
let xong = 0, hong = 0, tongGiay = 0, tongByte = 0;
const batDau = Date.now();

for (const v of viec) {
  const nhan = `part ${v.row.part} #${v.row.id}`;
  try {
    const { mp3, info } = await dungMot(v.parsed.segments);
    if (!mp3.length) throw new Error('bộ dựng không trả về byte nào');

    const stored = await storage.put(mp3, 'audio/mpeg');
    const key = stored.key;
    /* Tệp cũ chỉ xoá SAU khi tệp mới đã nằm trong kho: đứt giữa chừng thì thà
       thừa một tệp mồ côi còn hơn mất audio của một câu đang dùng. */
    const cu = v.row.audio_key;

    q.run(
      `UPDATE questions
          SET audio_key=?, audio_bytes=?, audio_at=?, audio_hash=?,
              audio_voice_id=?, audio_status='ready'
        WHERE id=?`,
      key, mp3.length, nowISO(), v.hash, GIONG, v.row.id);

    q.run(
      `INSERT INTO tts_renders
         (question_id, hash, provider, voice_id, model_id, settings_json, script,
          chars, storage_key, bytes, ms, status, created_at)
       VALUES (?,?,'kokoro',?,?,?,?,?,?,?,?, 'ok', ?)`,
      v.row.id, v.hash, GIONG, 'kokoro-v1.0',
      JSON.stringify({ speed: TOC_DO, sampleRate: info.sampleRate || null }),
      v.parsed.plain, v.parsed.plain.length, key, mp3.length,
      Math.round((info.seconds || 0) * 1000), nowISO());

    if (cu && cu !== key) { try { await storage.remove(cu); } catch (e) { /* mồ côi, không chặn */ } }

    xong++;
    tongGiay += info.seconds || 0;
    tongByte += mp3.length;
    console.log(`  ${C.g}✓${C.x} ${nhan.padEnd(18)} ${String(info.seconds || '?').padStart(5)}s  ` +
      `${String(Math.round(mp3.length / 1024)).padStart(4)} KB  ${C.d}${(v.row.prompt || '').slice(0, 34)}${C.x}`);
  } catch (e) {
    hong++;
    console.log(`  ${C.r}✗${C.x} ${nhan.padEnd(18)} ${C.r}${e.message.slice(0, 60)}${C.x}`);
    q.run(
      `INSERT INTO tts_renders
         (question_id, hash, provider, voice_id, model_id, script, chars, status, error, created_at)
       VALUES (?,?,'kokoro',?,?,?,?, 'failed', ?, ?)`,
      v.row.id, v.hash, GIONG, 'kokoro-v1.0', v.parsed.plain,
      v.parsed.plain.length, e.message.slice(0, 300), nowISO());
  }
}

const phut = (Date.now() - batDau) / 60000;
console.log('\n' + '─'.repeat(72));
console.log(`  ${C.g}${xong} câu dựng xong${C.x}` + (hong ? ` · ${C.r}${hong} câu hỏng${C.x}` : '') +
  `  ${C.d}${Math.round(tongGiay)}s audio · ${Math.round(tongByte / 1024)} KB · mất ${phut.toFixed(1)} phút${C.x}`);
console.log(`\n  Các câu này đang ở trạng thái ${C.b}ready${C.x}, chưa phải ${C.b}approved${C.x}.`);
console.log(`  ${C.d}Vào Quản trị → Ngân hàng câu hỏi, nghe, rồi bấm Duyệt. Cổng phát hành`);
console.log(`  đòi audio đã duyệt, nên tới khi có người nghe thì chưa đề nào lên sàn được.${C.x}`);
console.log('─'.repeat(72) + '\n');

process.exit(hong ? 1 : 0);
