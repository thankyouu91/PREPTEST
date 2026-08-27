/**
 * Choosing an answer must LOOK chosen, in both themes.
 *
 * The placement's answer buttons leaned on four custom properties —
 * `--color-brand`, `--color-brand-soft`, `--color-brand-strong`, `--color-line` —
 * that were used thirteen times and defined nowhere. A `var()` with no value and
 * no fallback makes the whole declaration invalid at computed-value time, so the
 * property silently falls back to its inherited or initial value. No console
 * error, nothing in the audit, nothing to see in the source.
 *
 * What the learner saw:
 *
 *   LIGHT  `.pick-on .pick-key` says `background: var(--color-brand); color:#fff`.
 *          The background died and `color:#fff` did not, so choosing an answer
 *          turned the number white on white and it vanished.
 *   DARK   `.pick-on` lost both its background and its border, so choosing
 *          changed nothing at all on screen.
 *
 * Neither is catchable by reading the CSS — both need the computed colours off a
 * real element. So this reads them, in both themes, and applies the WCAG
 * contrast formula rather than eyeballing hexes.
 *
 * Run: node scripts/test-pick-contrast.mjs   (needs the server up)
 */
import { launchChromium } from './_browser.mjs';
import { DEMO_PASSWORD } from './_demo.mjs';

const BASE = process.env.BASE_URL || 'http://localhost:3000';
const out = [];
const check = (n, ok, extra) => out.push({ n, ok: !!ok, extra });

/* sRGB relative luminance and the WCAG 2.x ratio, so "can you see it" is a
   number rather than an opinion. */
const lum = ([r, g, b]) => {
  const f = v => { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); };
  return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b);
};
const ratio = (a, b) => {
  const [x, y] = [lum(a), lum(b)].sort((m, n) => n - m);
  return (x + 0.05) / (y + 0.05);
};
/**
 * Computed colours come back in two shapes and only one is 0–255.
 *
 * Anything that went through `color-mix()` — which is most of this palette now —
 * computes as `color(srgb 0.0878 0.1914 0.4486)`, on 0–1. Read that as 0–255 and
 * every mixed colour reads as near-black, every ratio comes out 1.00:1, and the
 * test reports a contrast failure that is entirely its own. It did exactly that
 * on the first run.
 */
const rgb = s => {
  const n = (String(s).match(/[\d.]+/g) || []).slice(0, 3).map(Number);
  return /^color\(/.test(String(s).trim()) ? n.map(v => v * 255) : n;
};

const browser = await launchChromium();
const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
const page = await ctx.newPage();

try {
  await page.goto(BASE + '/prep/dang-nhap/?lang=en', { waitUntil: 'networkidle' });
  await page.fill('#email', 'student');
  await page.fill('#password', DEMO_PASSWORD);
  await page.click('#submit');
  await page.waitForURL(u => !u.pathname.includes('dang-nhap'), { timeout: 10000 });

  /* A pair of .pick buttons built the way the placement builds them, so this
     needs no live sitting and cannot be skipped by a placed demo account. */
  const build = () => {
    const host = document.createElement('div');
    host.id = 'contrast-probe';
    host.innerHTML =
      '<button type="button" class="pick"><span class="pick-key">1</span><span>Idle option</span></button>' +
      '<button type="button" class="pick pick-on"><span class="pick-key">2</span><span>Chosen option</span></button>';
    document.body.appendChild(host);
  };

  const measure = () => {
    const [idle, on] = [...document.querySelectorAll('#contrast-probe .pick')];
    const page = getComputedStyle(document.body).backgroundColor;
    const g = el => getComputedStyle(el);
    return {
      page,
      idleBg: g(idle).backgroundColor, idleBorder: g(idle).borderTopColor,
      onBg: g(on).backgroundColor, onBorder: g(on).borderTopColor,
      keyIdleBg: g(idle.querySelector('.pick-key')).backgroundColor,
      keyIdleFg: g(idle.querySelector('.pick-key')).color,
      keyOnBg: g(on.querySelector('.pick-key')).backgroundColor,
      keyOnFg: g(on.querySelector('.pick-key')).color,
      onText: g(on.querySelector('span:last-child')).color
    };
  };

  for (const theme of ['light', 'dark']) {
    await page.goto(BASE + '/prep/tai-khoan/?lang=en', { waitUntil: 'networkidle' });
    await page.evaluate(t => {
      document.documentElement.classList.toggle('dark', t === 'dark');
      try { localStorage.setItem('prep.theme', t); } catch (e) {}
    }, theme);
    await page.evaluate(build);
    await page.waitForTimeout(150);
    const m = await page.evaluate(measure);
    const T = theme.toUpperCase().padEnd(5);

    /* 1. The number on a chosen option has to be readable against its own
          badge. This is the light-mode disappearance, measured. */
    const keyOn = ratio(rgb(m.keyOnFg), rgb(m.keyOnBg));
    check(T + ' the number on a chosen answer is readable', keyOn >= 4.5,
      keyOn.toFixed(2) + ':1  ' + m.keyOnFg + ' on ' + m.keyOnBg);

    /* 2. And so is the number on an unchosen one. */
    const keyIdle = ratio(rgb(m.keyIdleFg), rgb(m.keyIdleBg));
    check(T + ' and on an unchosen one', keyIdle >= 4.5,
      keyIdle.toFixed(2) + ':1  ' + m.keyIdleFg + ' on ' + m.keyIdleBg);

    /* 3. Chosen must differ from unchosen by something the eye can find — this
          is the dark-mode "nothing happens", measured. Either the fill or the
          border has to move, and by more than a rounding error. */
    const bgMoved = ratio(rgb(m.onBg), rgb(m.idleBg));
    const borderMoved = ratio(rgb(m.onBorder), rgb(m.idleBorder));
    check(T + ' a chosen answer looks different from an unchosen one',
      bgMoved >= 1.08 || borderMoved >= 1.5,
      'fill ' + bgMoved.toFixed(3) + '×, border ' + borderMoved.toFixed(2) + '×  ('
        + m.idleBg + ' → ' + m.onBg + ')');

    /* 4. The option's own words stay readable on the chosen fill. */
    const words = ratio(rgb(m.onText), rgb(m.onBg));
    check(T + ' and its text is still readable on the chosen fill', words >= 4.5,
      words.toFixed(2) + ':1');

    /* 5. No declaration in the block may still resolve to nothing. A dead var()
          leaves the property transparent, which is how this hid for so long. */
    check(T + ' nothing in the button resolves to transparent',
      ![m.onBg, m.keyOnBg, m.keyIdleBg].some(c => /rgba\(0, 0, 0, 0\)/.test(c)),
      JSON.stringify({ onBg: m.onBg, keyOnBg: m.keyOnBg, keyIdleBg: m.keyIdleBg }));
  }
} finally {
  await browser.close();
}

let bad = 0;
for (const r of out) {
  console.log((r.ok ? '✓ ' : '✗ ') + r.n + (r.ok || !r.extra ? '' : '  — ' + r.extra));
  if (!r.ok) bad++;
}
console.log('\n' + (out.length - bad) + '/' + out.length + ' checks passed');
process.exit(bad ? 1 : 0);
