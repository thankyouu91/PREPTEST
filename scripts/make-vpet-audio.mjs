/**
 * Render the recordings for VPET Parts E, F, G, H and J.
 *
 * Run: npm run audio:vpet          (add --force to rebuild everything)
 *
 * Input is the `say` field of every row in server/data/vpet-items-audio.js.
 * Output is server/data/audio/<key>.mp3 plus a manifest, and BOTH are committed:
 * the deploy runs `npm ci --omit=dev`, so the box cannot make these itself. Same
 * arrangement as the Tailwind build and the study-pack PDFs.
 *
 * The manifest records a hash of everything that decides how a file sounds — the
 * words, the engine, the voice, the delivery note — so changing any of them
 * regenerates exactly the affected files and leaves the rest alone. Without it
 * every run would rewrite a hundred and seventy binaries and every commit would
 * carry a hundred and seventy meaningless diffs.
 *
 * ## Why this stopped using espeak-ng
 *
 * It used to synthesise with espeak-ng and then squeeze the result through lame
 * at 32 kbit/s, 22.05 kHz. Both halves were wrong for what these files are.
 *
 * espeak-ng is a FORMANT synthesiser: it models the vocal tract with filters
 * rather than reproducing a recorded voice, which is why it is 4 MB and runs on
 * anything, and why it sounds like a machine reading. For a page of UI copy that
 * is a curiosity. For Parts E and F it is the exam itself — Part E is "type the
 * sentence exactly as you hear it", so a candidate who mishears a formant
 * artefact is marked wrong for the synthesiser's diction, and Part F asks them
 * to choose a reply to a line that never sounded like speech. It was reported as
 * "chất lượng âm thanh bị lỗi rất nhiều", which is a fair description.
 *
 * The encoding compounded it. 32 kbit/s at 22.05 kHz throws away everything
 * above about 10 kHz, and that band is where /s/, /f/, /θ/ and /ʃ/ live — the
 * exact contrasts a dictation turns on. Cheap for the repository, expensive for
 * the candidate.
 *
 * So the default is a neural voice from a real provider, and the mp3 it returns
 * is written as it arrives rather than re-encoded downwards. espeak stays behind
 * `--provider=espeak` because it needs no key and no network, which is worth
 * keeping for a contributor who only wants to see the pipeline run.
 *
 * ## Providers
 *
 *   openai   (default)  OPENAI_API_KEY, model gpt-4o-mini-tts. About $0.015 per
 *                       1000 characters; the whole set is ~24k characters, so a
 *                       full rebuild costs well under a dollar. This is the same
 *                       provider the platform already holds a key for, to
 *                       transcribe spoken answers — see server/ai-marking.js.
 *   espeak              espeak-ng + lame, no key, no network, robot voice.
 *                       Debian/Ubuntu: sudo apt-get install -y espeak-ng lame
 *
 * A human recording still beats both and needs no code change: keep the file
 * name, run this once so the manifest catches up, and commit.
 */
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(HERE, '..');
const OUT_DIR = path.join(ROOT, 'server', 'data', 'audio');
const MANIFEST = path.join(OUT_DIR, 'manifest.json');
const TMP = path.join(ROOT, 'data', '.tts.wav');

const force = process.argv.includes('--force');

/**
 * How each part is read.
 *
 * The voices are not decoration. Part F is one side of a conversation and Part G
 * a narration, and a paper read end to end in a single voice loses the
 * difference — a candidate should be able to tell "somebody is speaking to me"
 * from "somebody is telling me about something" before a word is parsed.
 *
 * Dictation is slower than the rest, because the candidate is transcribing
 * rather than following, and a real invigilator reads it deliberately for that
 * reason. On the neural voices that is asked for in words rather than set as a
 * number: `speed` is a blunt resample that makes a voice sound wrong, whereas
 * the instruction changes the delivery the way a direction to a reader does.
 *
 * `alloy` and `nova` are the two clearest of the OpenAI set at the sentence
 * lengths here; the assignment mirrors the old espeak one so the parts keep the
 * same female/male pattern a returning candidate will have got used to.
 */
const VOICE = {
  E: {
    espeak: { voice: 'en-us+f3', speed: 132, gap: 3 },
    piper: { model: 'en_US-amy-medium', length: 1.18 },
    openai: { voice: 'nova', say: 'Read this dictation for a language exam: clearly and '
      + 'unhurriedly, a little slower than conversation, with even stress and a full stop at '
      + 'the end. Neutral, professional, no warmth or performance.' }
  },
  F: {
    espeak: { voice: 'en-us+m3', speed: 152, gap: 0 },
    piper: { model: 'en_US-ryan-high', length: 1.0 },
    openai: { voice: 'alloy', say: 'One side of an ordinary conversation, spoken to the '
      + 'listener at a natural pace. Friendly and plain, as a colleague would say it.' }
  },
  G: {
    espeak: { voice: 'en-us+f3', speed: 150, gap: 2 },
    piper: { model: 'en_US-amy-medium', length: 1.05 },
    openai: { voice: 'nova', say: 'Narrate this short passage at an even, measured pace, as '
      + 'a broadcaster reading a bulletin. Clear sentence breaks, no dramatisation.' }
  },
  H: {
    espeak: { voice: 'en-us+m3', speed: 145, gap: 1 },
    piper: { model: 'en_US-ryan-high', length: 1.08 },
    openai: { voice: 'alloy', say: 'A single sentence the listener must repeat back exactly. '
      + 'Every word distinct and unhurried, ordinary intonation, no emphasis on any one word.' }
  },
  J: {
    espeak: { voice: 'en-us+f3', speed: 148, gap: 2 },
    piper: { model: 'en_US-amy-medium', length: 1.05 },
    openai: { voice: 'nova', say: 'Tell this short story plainly and steadily, as if reading '
      + 'it aloud once for someone who will retell it. Clear, unhurried, no acting.' }
  }
};

/** Which engine, and the one place that decides it. */
const PROVIDER = (() => {
  const flag = (process.argv.find(a => a.startsWith('--provider=')) || '').split('=')[1];
  if (flag) return flag;
  if (process.env.OPENAI_API_KEY) return 'openai';
  try { execFileSync('which', ['piper'], { stdio: 'pipe' }); return 'piper'; } catch { /* not installed */ }
  return 'espeak';
})();
const OPENAI_MODEL = process.env.TTS_MODEL || 'gpt-4o-mini-tts';

/**
 * How many files one run may build.
 *
 * Default five. Not a throughput knob — a blast radius. Every engine here can
 * produce a truncated or empty file when something goes wrong mid-run (a
 * provider rate-limits, a socket drops, a model is still loading), and a run
 * that writes a hundred and seventy of those has replaced a whole exam's audio
 * with silence in one go. Five at a time, each one checked before the manifest
 * records it, means a bad batch costs five files and is obvious immediately.
 *
 * `--limit=0` lifts it for anybody who has watched a few batches go through and
 * wants the rest in one pass.
 */
const LIMIT = (() => {
  const flag = (process.argv.find(a => a.startsWith('--limit=')) || '').split('=')[1];
  const n = flag === undefined ? 5 : parseInt(flag, 10);
  return Number.isFinite(n) && n >= 0 ? n : 5;
})();

/** Where the Piper voice models live. */
const PIPER_DIR = process.env.PIPER_VOICES || path.join(ROOT, '.piper-voices');

function need(bin) {
  try {
    execFileSync('which', [bin], { stdio: 'pipe' });
  } catch {
    console.error(`\n✗ ${bin} is not installed, and this script cannot run without it.`);
    console.error('  Debian / Ubuntu:  sudo apt-get install -y espeak-ng lame');
    console.error('  macOS:            brew install espeak-ng lame\n');
    process.exit(1);
  }
}

const sha = s => createHash('sha256').update(s, 'utf8').digest('hex').slice(0, 16);

/**
 * Which voice, at which settings, will read this part — as one readable string.
 *
 * Two fields decide whether a file is re-recorded, not one, and they are kept
 * apart because two different questions are being asked of it:
 *
 *   `hash`  — do these bytes match the WORDS they are supposed to say? That is
 *             scripts/test-items.mjs's question, and it asks it about an item
 *             bank while knowing nothing about voices. One combined fingerprint
 *             made that check impossible to write without a second copy of
 *             everything below, and a second copy is the thing that goes stale.
 *             It duly did: `hash` stopped being a hash of the words, the check
 *             kept computing one, and all 146 recordings were reported out of
 *             date on a set that had just been made.
 *   `voice` — and do they match the voice we would use today? Kept as the
 *             configuration itself rather than a hash of it, so manifest.json
 *             now says "piper en_US-amy-medium x1.18" where it carried sixteen
 *             hex characters nobody could act on.
 *
 * The engine belongs in the second one, and its absence was a real fault: this
 * had no `piper` branch at all and fell through to the espeak string, so every
 * Piper recording was fingerprinted as though espeak had made it. A re-run
 * under espeak would have found all 146 unchanged, skipped them, left the
 * neural voices in place and reported success — the exact failure a fingerprint
 * exists to prevent, in the exact place meant to prevent it.
 */
const voiceOf = it => {
  const cfg = VOICE[it.part] || VOICE.F;
  if (PROVIDER === 'openai') return ['openai', OPENAI_MODEL, cfg.openai.voice, cfg.openai.say].join(' ');
  if (PROVIDER === 'piper') return ['piper', cfg.piper.model, 'x' + cfg.piper.length].join(' ');
  return ['espeak', cfg.espeak.voice, 's' + cfg.espeak.speed, 'g' + cfg.espeak.gap].join(' ');
};

function renderEspeak(say, cfg, dest) {
  execFileSync('espeak-ng', [
    '-v', cfg.voice,
    '-s', String(cfg.speed),
    '-g', String(cfg.gap),          // pause between words, in 10 ms units
    '-w', TMP,
    say
  ], { stdio: 'pipe' });
  /* Mono, 32 kbit/s, 22.05 kHz. Thin, and deliberately so: this path exists to
     let the pipeline run without a key, and espeak's output has nothing above
     10 kHz to preserve anyway. */
  execFileSync('lame', [
    '--quiet', '-m', 'm', '--resample', '22.05', '-b', '32', '-h',
    TMP, dest
  ], { stdio: 'pipe' });
  fs.rmSync(TMP, { force: true });
}

/**
 * One neural voice line.
 *
 * The mp3 the provider returns is written exactly as it arrives. Re-encoding it
 * through lame at 32 kbit/s — which is what the old pipeline did to everything —
 * would spend money on a good voice and then throw away the sibilance a
 * dictation is scored on.
 */
async function renderOpenAI(say, cfg, dest) {
  const key = process.env.OPENAI_API_KEY;
  if (!key) {
    console.error('\n✗ OPENAI_API_KEY is not set.');
    console.error('  Either export it, or run the keyless fallback:');
    console.error('      node scripts/make-vpet-audio.mjs --provider=espeak\n');
    process.exit(1);
  }
  const res = await fetch((process.env.OPENAI_BASE_URL || 'https://api.openai.com') + '/v1/audio/speech', {
    method: 'POST',
    headers: { 'Authorization': 'Bearer ' + key, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: OPENAI_MODEL,
      voice: cfg.voice,
      instructions: cfg.say,
      input: say,
      response_format: 'mp3'
    })
  });
  if (!res.ok) {
    const body = (await res.text()).slice(0, 400);
    throw new Error('TTS ' + res.status + ': ' + body.replace(/sk-[A-Za-z0-9_-]+/g, '***'));
  }
  fs.writeFileSync(dest, Buffer.from(await res.arrayBuffer()));
}

/**
 * Piper: a neural voice that runs on this machine, for nothing.
 *
 * The reason it is here rather than only the paid path: it needs no key, no
 * account and no network once the model is on disk, its licence is permissive,
 * and it is reproducible — the same text and model give the same bytes for ever.
 * For a commercial exam that last property matters more than the last few per
 * cent of naturalness, and it is the one thing an unofficial free endpoint
 * cannot promise.
 *
 * It emits 22.05 kHz mono WAV, which lame turns into mp3 WITHOUT resampling.
 * 64 kbit/s rather than the old 32: at 32 the encoder lowpasses hard, and the
 * band it takes first is where /s/, /f/ and /ʃ/ live — the contrasts a
 * dictation is scored on.
 */
function renderPiper(say, cfg, dest) {
  const model = path.join(PIPER_DIR, cfg.model + '.onnx');
  if (!fs.existsSync(model)) {
    console.error('\n✗ Piper voice missing: ' + model);
    console.error('  Fetch the voices first:  node scripts/make-vpet-audio.mjs --voices\n');
    process.exit(1);
  }
  execFileSync('piper', ['--model', model, '--output_file', TMP, '--length_scale', String(cfg.length)],
    { input: say, stdio: ['pipe', 'ignore', 'pipe'] });
  execFileSync('lame', ['--quiet', '-m', 'm', '-b', '64', '-h', TMP, dest], { stdio: 'pipe' });
  fs.rmSync(TMP, { force: true });
}

/**
 * Is this actually an mp3 with sound in it?
 *
 * Called on every file before the manifest is allowed to record it. A TTS run
 * fails in the shape of a short or empty file far more often than it fails with
 * an exception — a dropped socket, a model that answered with silence, an
 * encoder that got half a WAV — and none of those throw. Without this the run
 * reports success and the exam plays nothing.
 *
 * Walks the frame headers rather than trusting the byte count, and checks the
 * duration against the word count: real speech runs about 2 to 5 words a
 * second, so a sentence that comes back at ten times the speed, or at a
 * hundredth of it, is not the sentence.
 */
/* MPEG audio frame tables, Layer III only.
   The first version of this understood MPEG-1 alone, and lame at 22.05 kHz
   emits MPEG-2 — so it matched no real frame, went on hunting byte by byte,
   locked onto a false 0xFFE sync inside the audio data, and reported a 27-second
   passage as 1.08 seconds of "not speech". It rejected eleven perfectly good
   recordings before the fault turned out to be in the check rather than in them.
   Hence the strict walk below: find one frame, then require the NEXT header to
   sit exactly where this frame's length says it will. Random bytes do not chain. */
const MPEG = {
  3: { sr: [44100, 48000, 32000], spf: 1152, coef: 144,
       br: [0, 32, 40, 48, 56, 64, 80, 96, 112, 128, 160, 192, 224, 256, 320] },   // MPEG-1
  2: { sr: [22050, 24000, 16000], spf: 576, coef: 72,
       br: [0, 8, 16, 24, 32, 40, 48, 56, 64, 80, 96, 112, 128, 144, 160] },       // MPEG-2
  0: { sr: [11025, 12000, 8000], spf: 576, coef: 72,
       br: [0, 8, 16, 24, 32, 40, 48, 56, 64, 80, 96, 112, 128, 144, 160] }        // MPEG-2.5
};

function frameAt(d, i) {
  if (i + 4 > d.length) return null;
  if (d[i] !== 0xFF || (d[i + 1] & 0xE0) !== 0xE0) return null;
  const ver = (d[i + 1] >> 3) & 3;
  if (ver === 1 || ((d[i + 1] >> 1) & 3) !== 1) return null;      // reserved version, or not Layer III
  const m = MPEG[ver];
  const bi = (d[i + 2] >> 4) & 0xF, si = (d[i + 2] >> 2) & 3, pad = (d[i + 2] >> 1) & 1;
  if (bi === 0 || bi === 15 || si === 3) return null;
  const hz = m.sr[si], kbps = m.br[bi];
  const len = Math.floor(m.coef * kbps * 1000 / hz) + pad;
  if (len < 24) return null;
  return { len, hz, kbps, spf: m.spf };
}

function verifyMp3(file, words) {
  const d = fs.readFileSync(file);
  if (d.length < 512) throw new Error('only ' + d.length + ' bytes');
  let i = 0;
  /* ID3v2 at the front, if lame put one there. */
  if (d.slice(0, 3).toString() === 'ID3') {
    i = 10 + ((d[6] & 0x7f) << 21 | (d[7] & 0x7f) << 14 | (d[8] & 0x7f) << 7 | (d[9] & 0x7f));
  }
  /* Find the first header whose successor is also a header — one lone match can
     be luck, two in a row at the right distance cannot. */
  let start = -1;
  for (let p = i; p < d.length - 4 && start < 0; p++) {
    const f = frameAt(d, p);
    if (f && frameAt(d, p + f.len)) start = p;
  }
  if (start < 0) throw new Error('no mp3 frame chain — not audio');

  let frames = 0, seconds = 0, kbps = 0, hz = 0;
  for (let p = start; ;) {
    const f = frameAt(d, p);
    if (!f) break;
    frames++; seconds += f.spf / f.hz; kbps = f.kbps; hz = f.hz;
    p += f.len;
  }
  if (!frames) throw new Error('no mp3 frames — not audio');
  if (seconds < 0.35) throw new Error('only ' + seconds.toFixed(2) + 's of audio');
  const wps = words / seconds;
  if (wps > 8 || wps < 0.4) {
    throw new Error(words + ' words in ' + seconds.toFixed(2) + 's (' + wps.toFixed(1) + ' words/s) — not speech');
  }
  return { seconds: Math.round(seconds * 100) / 100, kbps, hz };
}

const render = (it, dest) => {
  const cfg = VOICE[it.part] || VOICE.F;
  if (PROVIDER === 'openai') return renderOpenAI(it.say, cfg.openai, dest);
  if (PROVIDER === 'piper') return Promise.resolve(renderPiper(it.say, cfg.piper, dest));
  return Promise.resolve(renderEspeak(it.say, cfg.espeak, dest));
};

if (PROVIDER === 'espeak') { need('espeak-ng'); need('lame'); }
else if (PROVIDER === 'piper') { need('piper'); need('lame'); }
else if (PROVIDER !== 'openai') {
  console.error('\n✗ Unknown provider "' + PROVIDER + '".'
    + ' Use --provider=openai, --provider=piper or --provider=espeak.\n');
  process.exit(1);
}
console.log('  engine: ' + PROVIDER
  + (PROVIDER === 'openai' ? ' · ' + OPENAI_MODEL
   : PROVIDER === 'piper' ? ' · local neural voices, no key'
   : ' (robot voice — keyless fallback)')
  + (LIMIT ? '  ·  at most ' + LIMIT + ' this run' : '  ·  no limit'));

const { rows } = await import('../server/data/vpet-items-audio.js').then(m => m.default || m);

/* One recording per GROUP, not per item.
 *
 * Part G's three questions share a passage, and each carries a copy of it so
 * the marker can see what the candidate was answering about. Rendering all
 * three would put three byte-identical MP3s in the repository per group -
 * about 2.4 MB of duplication across eight groups - and only the first is ever
 * fetched, because the runner plays the passage once at the top of the group.
 *
 * The items that get no file also get no audio_key, which is what stops the
 * browser offering a second and third play of something the exam plays once. */
const seenGroup = new Set();
const items = rows().filter(r => {
  if (!r.say) return false;
  if (!r.group) return true;
  if (seenGroup.has(r.group)) return false;
  seenGroup.add(r.group);
  return true;
});

fs.mkdirSync(OUT_DIR, { recursive: true });
fs.mkdirSync(path.dirname(TMP), { recursive: true });

const manifest = fs.existsSync(MANIFEST)
  ? JSON.parse(fs.readFileSync(MANIFEST, 'utf8'))
  : {};

let made = 0, skipped = 0, held = 0, tried = 0;
const broken = [];
const next = {};

/* The bytes of every file that already exists, so a batch that produces a bad
   recording can put the previous one back rather than leaving a gap. Cheap:
   the whole set is under five megabytes. */
const backup = {};
for (const f of fs.existsSync(OUT_DIR) ? fs.readdirSync(OUT_DIR) : []) {
  if (f.endsWith('.mp3')) backup[f.replace(/\.mp3$/, '')] = fs.readFileSync(path.join(OUT_DIR, f));
}

for (const it of items) {
  const file = path.join(OUT_DIR, it.key + '.mp3');
  const hash = sha(it.say);
  const voice = voiceOf(it);
  const known = manifest[it.key];

  /* Both have to match. The words alone would leave an engine change invisible;
     the voice alone would leave an edited sentence being read by the right
     voice saying the wrong thing. */
  if (!force && known && known.hash === hash && known.voice === voice && fs.existsSync(file)) {
    next[it.key] = known;
    skipped++;
    continue;
  }
  /* Counted on ATTEMPTS, not successes. Counting successes means a batch that
     keeps failing keeps going — which is precisely the run you want to stop
     early, not the one you want to let carry on until five happen to work. */
  if (LIMIT && tried >= LIMIT) { if (known) next[it.key] = known; held++; continue; }
  tried++;

  const words = it.say.split(/\s+/).length;
  await render(it, file);

  /* Checked before the manifest is allowed to record it, and the OLD file is
     kept if the new one is bad. Recording a hash for a broken file is the worst
     outcome available: the next run sees the hash matching, skips it, and the
     silence is permanent. */
  let sound;
  try {
    sound = verifyMp3(file, words);
  } catch (e) {
    fs.rmSync(file, { force: true });
    if (known && backup[it.key]) fs.writeFileSync(file, backup[it.key]);
    broken.push(it.key + ': ' + e.message);
    if (known) next[it.key] = known;
    continue;
  }

  const bytes = fs.statSync(file).size;
  /* `engine` is recorded per file, not per run, because a set can legitimately
     be mixed: one line re-cut with a human recording, the rest neural. Reading
     it back is how anybody can tell which is which without listening to 170
     files. */
  next[it.key] = {
    hash, voice, bytes, part: it.part, words,
    seconds: sound.seconds,
    engine: PROVIDER === 'openai' ? OPENAI_MODEL + '/' + (VOICE[it.part] || VOICE.F).openai.voice
      : PROVIDER === 'piper' ? 'piper/' + (VOICE[it.part] || VOICE.F).piper.model
      : 'espeak-ng'
  };
  made++;
  process.stdout.write(`  ${it.key}  ${String(bytes).padStart(6)}b  ${String(sound.seconds).padStart(5)}s  `
    + `${sound.kbps}k/${sound.hz}Hz  ${it.say.slice(0, 44)}\n`);
}

/* Orphan removal is skipped while a batch limit is in force: with a limit the
   run has deliberately not looked at every item, so "no item claims it" is not
   something this run is in a position to know. */
const orphans = (LIMIT && held) ? [] : fs.readdirSync(OUT_DIR)
  .filter(f => f.endsWith('.mp3'))
  .map(f => f.replace(/\.mp3$/, ''))
  .filter(k => !next[k]);
for (const k of orphans) {
  fs.rmSync(path.join(OUT_DIR, k + '.mp3'));
  console.log(`  removed ${k}.mp3 — no item claims it any more`);
}

fs.writeFileSync(MANIFEST, JSON.stringify(next, null, 2) + '\n');

const total = Object.values(next).reduce((a, m) => a + m.bytes, 0);
console.log(`\n${broken.length ? '✗' : '✓'} ${items.length} recordings — ${made} built, ${skipped} unchanged`
  + `${held ? `, ${held} left for the next run` : ''}`
  + `${orphans.length ? `, ${orphans.length} removed` : ''}`
  + `${broken.length ? `, ${broken.length} REFUSED` : ''}`);
for (const b of broken) console.log('  ✗ ' + b + '  (previous file kept)');
if (held) console.log(`  run again for the next ${LIMIT}, or --limit=0 for all of them`);
console.log(`  ${OUT_DIR.replace(ROOT + '/', '')}  ${(total / 1024).toFixed(0)} KB total`);
