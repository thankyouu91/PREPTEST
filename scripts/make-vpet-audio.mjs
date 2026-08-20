/**
 * Render the recordings for VPET Parts E, F, G, H and J.
 *
 * Run: npm run audio:vpet          (add --force to rebuild everything)
 *
 * Input is the `say` field of every row in server/data/vpet-items-audio.js.
 * Output is server/data/audio/<key>.mp3 plus a manifest, and BOTH are committed:
 * the deploy runs `npm ci --omit=dev`, so the box has neither espeak-ng nor lame
 * and cannot make these itself. Same arrangement as the Tailwind build and the
 * study-pack PDFs.
 *
 * The manifest records the hash of the words each file was made from, so a
 * changed `say` regenerates exactly that file and an unchanged one is skipped.
 * Without it every run would rewrite forty-four binaries and every commit would
 * carry forty-four meaningless diffs.
 *
 * REQUIRES, on the machine that runs it only:
 *   espeak-ng   the synthesiser
 *   lame        WAV to MP3, because server/storage.js accepts audio/mpeg alone
 * On Debian or Ubuntu: sudo apt-get install -y espeak-ng lame
 *
 * The voices are synthetic and that is a stopgap, not a decision anybody is
 * pleased with - see the header of server/data/vpet-items-audio.js. Replacing a
 * file with a human recording of the same words needs no code change: keep the
 * name, run this script once so the manifest catches up, and commit.
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
 * Dictation is slowed down because the candidate is transcribing rather than
 * following; the real exam reads it deliberately for the same reason. The two
 * voices are not decoration - Part F is one side of a conversation and Part G a
 * narration, and a paper read end to end in a single voice loses the difference.
 */
const VOICE = {
  E: { voice: 'en-us+f3', speed: 132, gap: 3 },
  F: { voice: 'en-us+m3', speed: 152, gap: 0 },
  G: { voice: 'en-us+f3', speed: 150, gap: 2 },
  H: { voice: 'en-us+m3', speed: 145, gap: 1 },
  J: { voice: 'en-us+f3', speed: 148, gap: 2 }
};

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

function render(say, cfg, dest) {
  execFileSync('espeak-ng', [
    '-v', cfg.voice,
    '-s', String(cfg.speed),
    '-g', String(cfg.gap),          // pause between words, in 10 ms units
    '-w', TMP,
    say
  ], { stdio: 'pipe' });
  /* Mono, 32 kbit/s, 22.05 kHz: speech, not music. A dictation sentence lands
     around 15 KB, and the whole set under two megabytes in the repository. */
  execFileSync('lame', [
    '--quiet', '-m', 'm', '--resample', '22.05', '-b', '32', '-h',
    TMP, dest
  ], { stdio: 'pipe' });
  fs.rmSync(TMP, { force: true });
}

need('espeak-ng');
need('lame');

const { rows } = await import('../server/data/vpet-items-audio.js').then(m => m.default || m);
const items = rows().filter(r => r.say);

fs.mkdirSync(OUT_DIR, { recursive: true });
fs.mkdirSync(path.dirname(TMP), { recursive: true });

const manifest = fs.existsSync(MANIFEST)
  ? JSON.parse(fs.readFileSync(MANIFEST, 'utf8'))
  : {};

let made = 0, skipped = 0;
const next = {};

for (const it of items) {
  const file = path.join(OUT_DIR, it.key + '.mp3');
  const hash = sha(it.say);
  const known = manifest[it.key];

  if (!force && known && known.hash === hash && fs.existsSync(file)) {
    next[it.key] = known;
    skipped++;
    continue;
  }
  render(it.say, VOICE[it.part] || VOICE.F, file);
  const bytes = fs.statSync(file).size;
  next[it.key] = { hash, bytes, part: it.part, words: it.say.split(/\s+/).length };
  made++;
  process.stdout.write(`  ${it.key}  ${String(bytes).padStart(6)} bytes  ${it.say.slice(0, 52)}\n`);
}

/* A file left behind by an item that has since been deleted would still be
   served if anything ever asked for it, and would sit in the repository for
   ever otherwise. Say so rather than deleting silently. */
const orphans = fs.readdirSync(OUT_DIR)
  .filter(f => f.endsWith('.mp3'))
  .map(f => f.replace(/\.mp3$/, ''))
  .filter(k => !next[k]);
for (const k of orphans) {
  fs.rmSync(path.join(OUT_DIR, k + '.mp3'));
  console.log(`  removed ${k}.mp3 — no item claims it any more`);
}

fs.writeFileSync(MANIFEST, JSON.stringify(next, null, 2) + '\n');

const total = Object.values(next).reduce((a, m) => a + m.bytes, 0);
console.log(`\n✓ ${items.length} recordings — ${made} built, ${skipped} unchanged`
  + `${orphans.length ? `, ${orphans.length} removed` : ''}`);
console.log(`  ${OUT_DIR.replace(ROOT + '/', '')}  ${(total / 1024).toFixed(0)} KB total`);
