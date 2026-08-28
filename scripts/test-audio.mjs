/**
 * Every recording the exam serves must actually be audio.
 *
 * These 146 files are the listening exam. A silent or truncated one is not a
 * cosmetic fault: Part E is "type the sentence exactly as you hear it", so a
 * candidate handed nothing to hear is marked wrong for the platform's mistake,
 * and nobody finds out until somebody sits the paper.
 *
 * The failure mode this guards is specifically the QUIET one. A TTS run breaks
 * far more often by writing a short or empty file than by throwing — a dropped
 * socket, a model that answered with silence, an encoder handed half a WAV —
 * and none of those raise anything. `git status` shows a changed binary either
 * way. So the frames are decoded here rather than the byte count trusted.
 *
 * Three things are checked per file, and the third is the one with teeth:
 *   · it decodes as a chain of MPEG Layer III frames;
 *   · its real duration matches what the manifest recorded, so a file cannot be
 *     replaced without the manifest noticing;
 *   · its words-per-second is plausible for speech. Real reading runs about 2 to
 *     5 words a second. Anything outside 0.4 to 8 is not somebody talking, which
 *     catches both the silent file and the one that came back as a click.
 *
 * Run: node scripts/test-audio.mjs
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const DIR = path.join(ROOT, 'server', 'data', 'audio');
const MANIFEST = path.join(DIR, 'manifest.json');

const out = [];
const check = (n, ok, extra) => out.push({ n, ok: !!ok, extra });

/* MPEG audio frame tables, Layer III. Both MPEG-1 and MPEG-2 are here on
   purpose: lame at 22.05 kHz emits MPEG-2, and a reader that knows only MPEG-1
   finds no real frame, hunts byte by byte, locks onto a false 0xFFE sync inside
   the audio data and reports a 27-second passage as one second. That is not a
   hypothetical — it is what the first version of this did, and it rejected
   eleven good recordings before the fault was found to be in the reader. */
const MPEG = {
  3: { sr: [44100, 48000, 32000], spf: 1152, coef: 144,
       br: [0, 32, 40, 48, 56, 64, 80, 96, 112, 128, 160, 192, 224, 256, 320] },
  2: { sr: [22050, 24000, 16000], spf: 576, coef: 72,
       br: [0, 8, 16, 24, 32, 40, 48, 56, 64, 80, 96, 112, 128, 144, 160] },
  0: { sr: [11025, 12000, 8000], spf: 576, coef: 72,
       br: [0, 8, 16, 24, 32, 40, 48, 56, 64, 80, 96, 112, 128, 144, 160] }
};

function frameAt(d, i) {
  if (i + 4 > d.length) return null;
  if (d[i] !== 0xFF || (d[i + 1] & 0xE0) !== 0xE0) return null;
  const ver = (d[i + 1] >> 3) & 3;
  if (ver === 1 || ((d[i + 1] >> 1) & 3) !== 1) return null;
  const m = MPEG[ver];
  const bi = (d[i + 2] >> 4) & 0xF, si = (d[i + 2] >> 2) & 3, pad = (d[i + 2] >> 1) & 1;
  if (bi === 0 || bi === 15 || si === 3) return null;
  const hz = m.sr[si], kbps = m.br[bi];
  const len = Math.floor(m.coef * kbps * 1000 / hz) + pad;
  return len < 24 ? null : { len, hz, kbps, spf: m.spf };
}

/** Duration and format, or null when the bytes are not a frame chain. */
function readMp3(file) {
  const d = fs.readFileSync(file);
  let i = 0;
  if (d.slice(0, 3).toString() === 'ID3') {
    i = 10 + ((d[6] & 0x7f) << 21 | (d[7] & 0x7f) << 14 | (d[8] & 0x7f) << 7 | (d[9] & 0x7f));
  }
  /* One header can be luck; two in a row at the distance the first one declares
     cannot be. Random bytes do not chain. */
  let start = -1;
  for (let p = i; p < d.length - 4 && start < 0; p++) {
    const f = frameAt(d, p);
    if (f && frameAt(d, p + f.len)) start = p;
  }
  if (start < 0) return null;
  let frames = 0, seconds = 0, kbps = 0, hz = 0;
  for (let p = start; ;) {
    const f = frameAt(d, p);
    if (!f) break;
    frames++; seconds += f.spf / f.hz; kbps = f.kbps; hz = f.hz;
    p += f.len;
  }
  return { frames, seconds, kbps, hz, bytes: d.length };
}

if (!fs.existsSync(MANIFEST)) {
  console.log('· no audio manifest — nothing to check.');
  process.exit(0);
}
const manifest = JSON.parse(fs.readFileSync(MANIFEST, 'utf8'));
const keys = Object.keys(manifest);
check('The manifest lists recordings', keys.length > 0, keys.length + ' entries');

const missing = [], unreadable = [], drifted = [], notSpeech = [], noEngine = [];
const engines = {};
for (const key of keys) {
  const m = manifest[key];
  const file = path.join(DIR, key + '.mp3');
  engines[m.engine || '(unrecorded)'] = (engines[m.engine || '(unrecorded)'] || 0) + 1;
  if (!m.engine) noEngine.push(key);

  if (!fs.existsSync(file)) { missing.push(key); continue; }
  const a = readMp3(file);
  if (!a || !a.frames) { unreadable.push(key); continue; }

  /* `seconds` was added to the manifest after the fact, so a file that predates
     it is not evidence of drift — only a recorded figure that disagrees is. */
  if (typeof m.seconds === 'number' && Math.abs(a.seconds - m.seconds) > 0.1) {
    drifted.push(key + ' (' + a.seconds.toFixed(2) + 's vs ' + m.seconds + 's recorded)');
  }
  const wps = m.words / a.seconds;
  if (!(wps > 0.4 && wps < 8)) {
    notSpeech.push(key + ' (' + m.words + ' words in ' + a.seconds.toFixed(2) + 's)');
  }
}

check('Every recording the manifest names is on disk', missing.length === 0, missing.slice(0, 6).join(', '));
check('and every one of them decodes as audio', unreadable.length === 0, unreadable.slice(0, 6).join(', '));
check('and none has been replaced behind the manifest\'s back', drifted.length === 0, drifted.slice(0, 4).join(' | '));
check('and every one runs at a speaking pace', notSpeech.length === 0, notSpeech.slice(0, 4).join(' | '));
check('and every one records which engine made it', noEngine.length === 0, noEngine.slice(0, 6).join(', '));

/* Files on disk that the manifest does not claim would still be served if
   anything asked for them, and nothing would ever regenerate them. */
const onDisk = fs.readdirSync(DIR).filter(f => f.endsWith('.mp3')).map(f => f.replace(/\.mp3$/, ''));
const orphans = onDisk.filter(k => !manifest[k]);
check('and nothing is left on disk that no item claims', orphans.length === 0, orphans.slice(0, 6).join(', '));

console.log('  engines: ' + Object.entries(engines).map(([k, v]) => k + ' × ' + v).join(', '));

let bad = 0;
for (const r of out) {
  console.log((r.ok ? '✓ ' : '✗ ') + r.n + (r.ok || !r.extra ? '' : '  — ' + r.extra));
  if (!r.ok) bad++;
}
console.log('\n' + (out.length - bad) + '/' + out.length + ' checks passed');
process.exit(bad ? 1 : 0);
