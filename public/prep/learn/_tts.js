/* ============================================================
   PrepTTS — pronunciation through the browser's built-in Web Speech API
   ------------------------------------------------------------
   Free, no API key, no outbound request — so it never touches the platform's
   strict CSP.

   Three ways to trigger it:
     1. Tap a word        → reads that word alone
     2. Select some text  → a floating play button appears beside the selection
     3. The speaker button → reads the whole sentence

   British (en-GB) / American (en-US) is selectable and remembered in localStorage.

   Limit: the voices come from the operating system. A machine with no English
   voice installed cannot speak — onUnavailable() fires then, so the interface can
   show IPA rather than saying nothing.
   ============================================================ */
const PrepTTS = {
  KEY_ACCENT: 'prep.tts.accent',
  KEY_RATE: 'prep.tts.rate',

  _voices: [],
  _ready: false,
  _warned: false,

  supported() {
    return typeof window !== 'undefined' && 'speechSynthesis' in window;
  },

  /* Browsers load the voice list asynchronously; Chrome returns an empty array on
     the first call and only then fires voiceschanged. */
  init() {
    if (!this.supported() || this._ready) return Promise.resolve(this._voices);
    return new Promise(resolve => {
      const load = () => {
        this._voices = window.speechSynthesis.getVoices() || [];
        if (this._voices.length) {
          this._ready = true;
          resolve(this._voices);
          return true;
        }
        return false;
      };
      if (load()) return;
      window.speechSynthesis.addEventListener('voiceschanged', function once() {
        window.speechSynthesis.removeEventListener('voiceschanged', once);
        load();
        resolve(PrepTTS._voices);
      });
      // Some browsers never fire voiceschanged at all
      setTimeout(() => { load(); resolve(this._voices); }, 1200);
    });
  },

  accent() {
    try { return localStorage.getItem(this.KEY_ACCENT) === 'uk' ? 'uk' : 'us'; }
    catch (e) { return 'us'; }
  },
  setAccent(a) {
    try { localStorage.setItem(this.KEY_ACCENT, a === 'uk' ? 'uk' : 'us'); } catch (e) {}
    document.dispatchEvent(new CustomEvent('prep:tts-accent', { detail: this.accent() }));
  },

  rate() {
    try { return Math.min(1.2, Math.max(0.5, parseFloat(localStorage.getItem(this.KEY_RATE)) || 0.95)); }
    catch (e) { return 0.95; }
  },
  setRate(r) {
    try { localStorage.setItem(this.KEY_RATE, String(r)); } catch (e) {}
  },

  /** The voice matching the current choice; null if the machine has no English voice */
  voiceFor(accent) {
    const want = (accent || this.accent()) === 'uk' ? 'en-GB' : 'en-US';
    const vs = this._voices;
    if (!vs.length) return null;
    return vs.find(v => v.lang === want)
        || vs.find(v => v.lang && v.lang.replace('_', '-') === want)
        || vs.find(v => v.lang && v.lang.toLowerCase().startsWith('en'))
        || null;
  },

  /** Whether English can be spoken at all */
  available() {
    return this.supported() && !!this.voiceFor();
  },

  /** Speak a piece of text. Returns true if it could be spoken. */
  speak(text, opts) {
    opts = opts || {};
    const t = String(text || '').trim();
    if (!t || !this.supported()) return false;

    const voice = this.voiceFor(opts.accent);
    if (!voice) {
      if (!this._warned && typeof this.onUnavailable === 'function') {
        this._warned = true;
        this.onUnavailable();
      }
      return false;
    }

    window.speechSynthesis.cancel();          // cut off whatever is mid-sentence
    const u = new SpeechSynthesisUtterance(t);
    u.voice = voice;
    u.lang = voice.lang;
    u.rate = opts.rate || this.rate();
    u.pitch = 1;
    if (typeof opts.onend === 'function') u.addEventListener('end', opts.onend);
    window.speechSynthesis.speak(u);
    return true;
  },

  stop() { if (this.supported()) window.speechSynthesis.cancel(); },

  /* ---------- Split a sentence into tappable words ----------
     Returns HTML: each word wrapped in <button data-say>, punctuation left alone.
     Used on example sentences — tap a word, hear that word. */
  wordify(sentence, cls) {
    const esc = s => String(s).replace(/[&<>"']/g, c =>
      ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
    return String(sentence || '').split(/(\s+)/).map(chunk => {
      if (/^\s+$/.test(chunk)) return chunk;
      // Peel punctuation off both ends so the full stop is not read aloud
      const m = chunk.match(/^([^\wÀ-ỹ]*)([\wÀ-ỹ'’-]+)([^\wÀ-ỹ]*)$/);
      if (!m) return esc(chunk);
      const [, before, word, after] = m;
      return esc(before) +
        '<button type="button" class="tts-word ' + (cls || '') + '" data-say="' + esc(word) + '">' +
          esc(word) +
        '</button>' + esc(after);
    }).join('');
  },

  /* ---------- Wire the triggers into a region ---------- */

  /** Delegated: any [data-say] inside root speaks when tapped */
  bindClicks(root) {
    (root || document).addEventListener('click', e => {
      const b = e.target.closest('[data-say]');
      if (!b) return;
      e.preventDefault();
      this.speak(b.getAttribute('data-say'));
    });
  },

  /** Select text inside root → a floating play button appears beside the selection */
  bindSelection(root) {
    if (!this.supported()) return;
    const host = root || document.body;

    const bubble = document.createElement('button');
    bubble.type = 'button';
    bubble.id = 'tts-bubble';
    bubble.hidden = true;
    bubble.className = 'tts-bubble';
    bubble.setAttribute('aria-label', 'Speak the selected text');
    bubble.innerHTML = PREP.icon('headphones', 'w-4 h-4') + '<span>Nghe</span>';
    document.body.appendChild(bubble);

    let picked = '';
    const hide = () => { bubble.hidden = true; picked = ''; };

    document.addEventListener('selectionchange', () => {
      const sel = document.getSelection();
      const text = sel ? String(sel).trim() : '';
      // Only shown for a Latin-script selection inside the permitted region
      if (!text || text.length > 300 || !/[A-Za-z]/.test(text)) return hide();
      const node = sel.anchorNode;
      if (!node || !host.contains(node.nodeType === 1 ? node : node.parentNode)) return hide();

      const rect = sel.getRangeAt(0).getBoundingClientRect();
      if (!rect.width && !rect.height) return hide();
      picked = text;
      bubble.hidden = false;
      bubble.style.top = (rect.top + window.scrollY - 44) + 'px';
      bubble.style.left = (rect.left + window.scrollX + rect.width / 2) + 'px';
    });

    bubble.addEventListener('mousedown', e => e.preventDefault());  // keep the selection
    bubble.addEventListener('click', () => { if (picked) this.speak(picked); });
    document.addEventListener('scroll', hide, { passive: true });
  },

  /** Build the British/American voice picker and speed control into an element */
  mountControls(el, onChange) {
    if (!el) return;
    const render = () => {
      const a = this.accent();
      el.innerHTML =
        '<div class="flex flex-wrap items-center gap-2">' +
          '<span class="text-[13px] font-semibold text-muted">Voice</span>' +
          '<div class="seg" role="group" aria-label="Choose the pronunciation voice">' +
            '<button type="button" class="seg-btn" data-accent="us" aria-pressed="' + (a === 'us') + '">US</button>' +
            '<button type="button" class="seg-btn" data-accent="uk" aria-pressed="' + (a === 'uk') + '">Anh</button>' +
          '</div>' +
          '<label class="flex items-center gap-2 text-[13px] font-semibold text-muted ms-1">' +
            'Speed' +
            '<input type="range" id="tts-rate" min="0.5" max="1.2" step="0.05" value="' + this.rate() + '" ' +
              'class="w-24 accent-[color:var(--color-accent)]" aria-label="Reading speed">' +
          '</label>' +
        '</div>';
      PREP.qsa('[data-accent]', el).forEach(b => b.addEventListener('click', () => {
        this.setAccent(b.getAttribute('data-accent'));
        render();
        if (typeof onChange === 'function') onChange();
      }));
      PREP.qs('#tts-rate', el).addEventListener('change', e => this.setRate(parseFloat(e.target.value)));
    };
    render();
  }
};
