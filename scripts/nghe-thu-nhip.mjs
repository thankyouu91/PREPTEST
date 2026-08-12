/**
 * Nghe thử NHỊP của một kịch bản, không cần khoá ElevenLabs.
 *
 * ---------------------------------------------------------------------------
 * ĐÂY KHÔNG PHẢI GIỌNG ĐỌC
 *
 * Tệp sinh ra không có lời. Mỗi đoạn nói là một tiếng ngân dài đúng bằng thời
 * gian đoạn đó sẽ được đọc, còn mỗi chỗ nghỉ là im lặng thật. Nghe nó trả lời
 * đúng một câu hỏi: nhịp có đúng không — một giây dẫn vào có đủ dài không, chỗ
 * ngắt sau dấu phẩy và dấu chấm có nghe ra là dấu câu hay nghe như vấp.
 *
 * Nó không nói được gì về chất giọng, về ngữ điệu, hay về việc máy đọc đúng
 * tên riêng chưa. Những thứ đó phải chờ khoá `sk_` và bản dựng thật.
 *
 * Vì sao vẫn đáng làm: nhịp là phần duy nhất nền tảng quyết định. Giọng là của
 * ElevenLabs, còn khoảng lặng là do `server/script-markup.js` đặt ra — và nếu
 * nhịp sai thì mỗi lần dựng lại là một lần trả tiền cho cùng một lỗi.
 * ---------------------------------------------------------------------------
 *
 *   node scripts/nghe-thu-nhip.mjs                      dựng bộ mẫu 4 tệp
 *   node scripts/nghe-thu-nhip.mjs --ref=E1-L1          dựng đúng một câu trong kho
 *   node scripts/nghe-thu-nhip.mjs --text="Hello, world."
 *   node scripts/nghe-thu-nhip.mjs --toc-do=1.0         so sánh tốc độ khác
 *
 * WAV 16-bit mono 22,05 kHz, viết bằng Buffer thuần — không thêm dependency
 * nào cho một việc chỉ dùng để nghe thử.
 */
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const { parseScript, DEFAULTS } = require('../server/script-markup.js');
const SCRIPTS = require('../server/data/vpet-scripts.js');

const args = process.argv.slice(2);
const val = f => { const a = args.find(x => x.startsWith(f + '=')); return a ? a.slice(f.length + 1) : null; };

const RATE = 22050;
const OUT = path.resolve(val('--thu-muc') || 'docs/audio-mau');

/* ------------------------------------------------------------------ */

/** WAV 16-bit mono từ mảng mẫu Float32 trong khoảng −1…1. */
function wav(samples) {
  const data = Buffer.alloc(samples.length * 2);
  for (let i = 0; i < samples.length; i++) {
    const v = Math.max(-1, Math.min(1, samples[i]));
    data.writeInt16LE(Math.round(v * 32767), i * 2);
  }
  const head = Buffer.alloc(44);
  head.write('RIFF', 0);
  head.writeUInt32LE(36 + data.length, 4);
  head.write('WAVE', 8);
  head.write('fmt ', 12);
  head.writeUInt32LE(16, 16);          // PCM chunk size
  head.writeUInt16LE(1, 20);           // PCM
  head.writeUInt16LE(1, 22);           // mono
  head.writeUInt32LE(RATE, 24);
  head.writeUInt32LE(RATE * 2, 28);    // byte rate
  head.writeUInt16LE(2, 32);           // block align
  head.writeUInt16LE(16, 34);          // bits
  head.write('data', 36);
  head.writeUInt32LE(data.length, 40);
  return Buffer.concat([head, data]);
}

const silence = ms => new Float32Array(Math.round(RATE * ms / 1000));

/**
 * Một đoạn nói, thể hiện bằng tiếng ngân.
 *
 * Cao độ đổi nhẹ theo độ dài để hai câu liền nhau không dính vào nhau khi
 * nghe, và biên độ vào/ra mềm để không có tiếng "tạch" ở mép — tiếng tạch sẽ
 * nghe giống một chỗ ngắt, đúng thứ đang cần đánh giá.
 */
function tone(ms, hz) {
  const out = silence(ms);
  const fade = Math.min(out.length / 2, Math.round(RATE * 0.02));
  for (let i = 0; i < out.length; i++) {
    let a = 0.22;
    if (i < fade) a *= i / fade;
    if (i > out.length - fade) a *= (out.length - i) / fade;
    /* Cộng thêm hoạ âm bậc hai cho đỡ chói so với sóng sin trần. */
    out[i] = a * (Math.sin(2 * Math.PI * hz * i / RATE)
                + 0.3 * Math.sin(4 * Math.PI * hz * i / RATE));
  }
  return out;
}

/** Tiếng gõ rất ngắn đánh dấu mốc 0, để nghe rõ một giây dẫn vào dài bao nhiêu. */
function tick() {
  const out = silence(12);
  for (let i = 0; i < out.length; i++) {
    out[i] = 0.5 * Math.exp(-i / (RATE * 0.002)) * Math.sin(2 * Math.PI * 1800 * i / RATE);
  }
  return out;
}

function render(script, speed) {
  const parsed = parseScript(script, { speed });
  const parts = [tick()];
  let hz = 300;

  for (const seg of parsed.segments) {
    if (seg.kind === 'pause') { parts.push(silence(seg.ms)); continue; }
    /* Cùng công thức ước tính mà bảng hoá đơn dùng, nên tệp nghe thử dài đúng
       bằng con số tác giả nhìn thấy trên màn hình. */
    const ms = (seg.text.replace(/\s+/g, ' ').trim().length / 14 / speed) * 1000;
    parts.push(tone(ms, hz));
    hz = hz === 300 ? 340 : 300;
  }

  const total = parts.reduce((n, p) => n + p.length, 0);
  const all = new Float32Array(total);
  let at = 0;
  for (const p of parts) { all.set(p, at); at += p.length; }
  return { buf: wav(all), parsed };
}

/* ------------------------------------------------------------------ */

fs.mkdirSync(OUT, { recursive: true });
const speed = Number(val('--toc-do') || val('--speed') || DEFAULTS.speed);

let jobs;
const ref = val('--ref');
const text = val('--text');

if (text) {
  jobs = [{ name: 'tuy-chinh', label: 'Kịch bản nhập tay', script: text }];
} else if (ref) {
  const it = SCRIPTS.allItems().find(i => i.ref === ref);
  if (!it) { console.error(`Không có câu nào mang ref "${ref}".`); process.exit(1); }
  jobs = [{ name: ref.toLowerCase(), label: `${it.ref} · part ${it.part}`, script: it.script }];
} else {
  /* Bộ mẫu: mỗi tệp để nghe một quyết định nhịp khác nhau. */
  const pick = p => SCRIPTS.allItems().find(i => i.part === p && i.level === 1);
  jobs = [
    { name: '1-dan-vao', label: 'Một giây dẫn vào + ngắt câu',
      script: 'Good morning. The meeting has been moved to Thursday, at two o\'clock.' },
    { name: '2-part-e-chinh-ta', label: 'Part E · đọc chính tả', script: pick('E').script },
    { name: '3-part-g-doan-dai', label: 'Part G · đoạn dài', script: pick('G').script },
    { name: '4-part-j-ke-chuyen', label: 'Part J · kể chuyện', script: pick('J').script }
  ];
}

console.log(`\n\x1b[1mNghe thử nhịp\x1b[0m  \x1b[2m(tốc độ ${speed}× · không có lời)\x1b[0m`);
console.log('─'.repeat(74));

const rows = [];
for (const j of jobs) {
  const { buf, parsed } = render(j.script, speed);
  const file = path.join(OUT, j.name + '.wav');
  fs.writeFileSync(file, buf);
  const secs = (parsed.stats.estimatedMs / 1000);
  rows.push({ file, label: j.label, secs, breaks: parsed.stats.breaks, chars: parsed.stats.billedChars });
  console.log(`  ${j.label.padEnd(34)} ${secs.toFixed(1).padStart(6)}s  ` +
    `${String(parsed.stats.breaks).padStart(3)} chỗ nghỉ  ${String(parsed.stats.chars).padStart(5)} ký tự`);
}

console.log('─'.repeat(74));
console.log(`  Đã ghi ${rows.length} tệp vào ${path.relative(process.cwd(), OUT)}/\n`);
console.log('  \x1b[2mTiếng gõ đầu tiên là mốc 0. Khoảng im lặng ngay sau nó là một giây');
console.log('  dẫn vào. Mỗi tiếng ngân là một đoạn nói, dài đúng bằng thời gian đoạn');
console.log('  đó sẽ được đọc; im lặng giữa các tiếng ngân là chỗ nghỉ thật.\x1b[0m\n');
