/**
 * The exam's audio queue must ask for each recording exactly once.
 *
 * Part G is a passage and three spoken questions, so an item can carry two
 * recordings and `playPaced()` plays them in order. That turned a one-line
 * player into a queue, and a queue has a failure the single play never had.
 *
 * ## The bug this exists to stop coming back
 *
 * When a media resource fails to load, the HTML spec's media-source-failure
 * steps do TWO things: fire `error` at the element, and reject every pending
 * `play()` promise. Both were wired to the same "move to the next recording"
 * callback, and it was not idempotent — so one failed recording advanced the
 * queue twice.
 *
 * On a Part G item that is not a cosmetic fault. An ordinary page reload
 * mid-part is enough to trigger it: the passage has already been played, so
 * asking again returns 429 — "this recording plays once" — which is a load
 * failure, which double-fires. The spoken question is then fetched twice; the
 * first fetch plays, the second meets its own 429, and the queue runs off the
 * end into the answer window while the first is still sounding. The
 * microphone opens, and the candidate's recorded answer contains the question
 * being read to them.
 *
 * Nothing downstream could tell that apart from a candidate who talked over
 * the question. It is the kind of fault that reaches a real sitting.
 *
 * Run: node scripts/test-exam-audio-queue.mjs
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const RUNNER = path.join(ROOT, 'public', 'prep', 'exam', '_runner.js');

let pass = 0, fail = 0;
const ok = (c, name, detail) => {
  if (c) { pass++; console.log('✓ ' + name); return; }
  fail++; console.log('✗ ' + name + (detail === undefined ? '' : '  → ' + detail));
};

/* The method is lifted out of the browser file rather than duplicated here: a
   copy of the logic would pass this test for ever while the real player broke. */
const src = fs.readFileSync(RUNNER, 'utf8');
const start = src.indexOf('  playPaced(p, it) {');
const end = src.indexOf('\n  },', start);
ok(start > 0 && end > start, 'playPaced() is where this test expects to find it');
if (start < 0) { console.log('\n0/1 checks passed'); process.exit(1); }
const method = src.slice(start, end + 4);

/**
 * A stand-in for the browser's Audio, faithful on the one point that matters:
 * a URL listed in `failing` fires `error` AND rejects play(), the way a real
 * 404 or 429 does.
 */
function harness(failing) {
  const asked = [];
  const made = [];
  class FakeAudio {
    constructor(url) {
      this.url = url; this.paused = false; this.handlers = {};
      asked.push(url); made.push(this);
    }
    addEventListener(kind, fn) { (this.handlers[kind] = this.handlers[kind] || []).push(fn); }
    pause() { this.paused = true; }
    play() {
      if (failing.some(f => this.url.endsWith(f))) {
        queueMicrotask(() => (this.handlers.error || []).forEach(f => f()));
        return Promise.reject(new Error('load failed'));
      }
      /* A recording that plays reaches its end, which is what advances the
         queue. Without this the harness would report a working item as never
         reaching its second recording — and that is a fault in the test, not
         in the player. */
      queueMicrotask(() => (this.handlers.ended || []).forEach(f => f()));
      return Promise.resolve();
    }
  }
  const player = eval('({' + method + '})');
  player.attempt = { id: 1 };
  player.pace = { phase: 'listen', playing: null };
  player.nextPhase = () => 'answer';
  player.renderPaced = () => {};
  return { player, asked, made, FakeAudio };
}

async function run(failing, item) {
  const h = harness(failing);
  globalThis.Audio = h.FakeAudio;
  h.player.playPaced({ pacing: {} }, item);
  /* Long enough for every queued microtask and its follow-on to settle. */
  for (let i = 0; i < 20; i++) await new Promise(r => setTimeout(r, 1));
  return h;
}

const G_ITEM = { questionId: 9, hasAudio: true, hasQuestionAudio: true };
const count = (asked, suffix) => asked.filter(u => u.endsWith(suffix)).length;

/* The reported case: the passage 429s on a reload, and the question must still
   be asked for exactly once. */
{
  const h = await run(['/audio'], G_ITEM);
  ok(count(h.asked, 'question-audio') === 1,
    'A passage that fails asks for the spoken question ONCE, not twice',
    h.asked.map(u => u.split('/').pop()).join(', '));
  ok(h.player.pace === null || h.player.pace.phase === 'answer',
    'and the phase still moves on afterwards');
}

/* Both fail: the queue must not run away, and must still end the phase. */
{
  const h = await run(['/audio', 'question-audio'], G_ITEM);
  ok(count(h.asked, '/audio') === 1 && count(h.asked, 'question-audio') === 1,
    'Two failing recordings are each asked for once',
    h.asked.map(u => u.split('/').pop()).join(', '));
}

/* Nothing fails: passage then question, in that order, once each. */
{
  const h = await run([], G_ITEM);
  ok(h.asked.length === 2
     && h.asked[0].endsWith('/audio') && h.asked[1].endsWith('question-audio'),
    'A working item plays the passage and then the question, in that order',
    h.asked.map(u => u.split('/').pop()).join(', '));
}

/* Every other part has one recording, and must behave exactly as it always did. */
{
  const h = await run(['/audio'], { questionId: 4, hasAudio: true, hasQuestionAudio: false });
  ok(h.asked.length === 1, 'A one-recording item is unaffected, failing or not',
    h.asked.length + ' request(s)');
}

/* Part G's second and third items carry no passage — only a question. */
{
  const h = await run([], { questionId: 5, hasAudio: false, hasQuestionAudio: true });
  ok(h.asked.length === 1 && h.asked[0].endsWith('question-audio'),
    'An item with only a spoken question plays just that',
    h.asked.map(u => u.split('/').pop()).join(', '));
}

/* An item with neither must not hang the phase waiting for a recording. */
{
  const h = await run([], { questionId: 6, hasAudio: false, hasQuestionAudio: false });
  ok(h.asked.length === 0, 'An item with no recording asks for nothing');
}

/* And the phase ending must silence what is still sounding, or a question keeps
   being read into the microphone the next item opens. */
{
  const src2 = fs.readFileSync(RUNNER, 'utf8');
  ok(/stopPace\(\)[\s\S]{0,400}?playing[\s\S]{0,120}?pause\(\)/.test(src2),
    'stopPace() pauses whatever is still playing');
}

console.log('\n' + pass + '/' + (pass + fail) + ' checks passed');
process.exit(fail ? 1 : 0);
