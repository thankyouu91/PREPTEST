/* ============================================================
   PrepTTS — phát âm bằng Web Speech API có sẵn trong trình duyệt
   ------------------------------------------------------------
   Miễn phí hoàn toàn, không khoá API, không gọi mạng ngoài nên
   không đụng CSP nghiêm ngặt của nền tảng.

   Ba cách kích hoạt:
     1. Nhấn vào một từ  → đọc riêng từ đó
     2. Bôi đen đoạn chữ → hiện nút phát nổi cạnh vùng bôi đen
     3. Nút loa          → đọc trọn câu

   Giọng Anh (en-GB) / Mỹ (en-US) chọn được, lưu vào localStorage.

   Giới hạn: giọng do hệ điều hành cung cấp. Máy không cài giọng tiếng
   Anh sẽ không phát được — khi đó gọi onUnavailable() để giao diện hiện
   IPA thay vì im lặng.
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

  /* Trình duyệt nạp danh sách giọng bất đồng bộ; Chrome trả mảng rỗng ở lần
     gọi đầu rồi mới bắn voiceschanged. */
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
      // Một số trình duyệt không bao giờ bắn voiceschanged
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

  /** Giọng khớp giọng đang chọn; null nếu máy không có giọng tiếng Anh nào */
  voiceFor(accent) {
    const want = (accent || this.accent()) === 'uk' ? 'en-GB' : 'en-US';
    const vs = this._voices;
    if (!vs.length) return null;
    return vs.find(v => v.lang === want)
        || vs.find(v => v.lang && v.lang.replace('_', '-') === want)
        || vs.find(v => v.lang && v.lang.toLowerCase().startsWith('en'))
        || null;
  },

  /** Có phát được tiếng Anh không */
  available() {
    return this.supported() && !!this.voiceFor();
  },

  /** Đọc một đoạn chữ. Trả true nếu phát được. */
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

    window.speechSynthesis.cancel();          // cắt câu đang đọc dở
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

  /* ---------- Tách câu thành từng từ bấm được ----------
     Trả HTML: mỗi từ bọc trong <button data-say>, dấu câu để nguyên.
     Dùng cho câu ví dụ — học viên nhấn từ nào nghe từ đó. */
  wordify(sentence, cls) {
    const esc = s => String(s).replace(/[&<>"']/g, c =>
      ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
    return String(sentence || '').split(/(\s+)/).map(chunk => {
      if (/^\s+$/.test(chunk)) return chunk;
      // Tách dấu câu ở hai đầu để không đọc cả dấu chấm
      const m = chunk.match(/^([^\wÀ-ỹ]*)([\wÀ-ỹ'’-]+)([^\wÀ-ỹ]*)$/);
      if (!m) return esc(chunk);
      const [, before, word, after] = m;
      return esc(before) +
        '<button type="button" class="tts-word ' + (cls || '') + '" data-say="' + esc(word) + '">' +
          esc(word) +
        '</button>' + esc(after);
    }).join('');
  },

  /* ---------- Gắn các cách kích hoạt vào một vùng ---------- */

  /** Uỷ quyền: mọi phần tử [data-say] bên trong root, nhấn là đọc */
  bindClicks(root) {
    (root || document).addEventListener('click', e => {
      const b = e.target.closest('[data-say]');
      if (!b) return;
      e.preventDefault();
      this.speak(b.getAttribute('data-say'));
    });
  },

  /** Bôi đen chữ trong root → hiện nút phát nổi ngay cạnh vùng bôi đen */
  bindSelection(root) {
    if (!this.supported()) return;
    const host = root || document.body;

    const bubble = document.createElement('button');
    bubble.type = 'button';
    bubble.id = 'tts-bubble';
    bubble.hidden = true;
    bubble.className = 'tts-bubble';
    bubble.setAttribute('aria-label', 'Phát âm đoạn đã chọn');
    bubble.innerHTML = PREP.icon('headphones', 'w-4 h-4') + '<span>Nghe</span>';
    document.body.appendChild(bubble);

    let picked = '';
    const hide = () => { bubble.hidden = true; picked = ''; };

    document.addEventListener('selectionchange', () => {
      const sel = document.getSelection();
      const text = sel ? String(sel).trim() : '';
      // Chỉ hiện khi bôi đen chữ Latin nằm trong vùng cho phép
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

    bubble.addEventListener('mousedown', e => e.preventDefault());  // giữ vùng bôi đen
    bubble.addEventListener('click', () => { if (picked) this.speak(picked); });
    document.addEventListener('scroll', hide, { passive: true });
  },

  /** Dựng cụm nút chọn giọng Anh/Mỹ + tốc độ vào một phần tử */
  mountControls(el, onChange) {
    if (!el) return;
    const render = () => {
      const a = this.accent();
      el.innerHTML =
        '<div class="flex flex-wrap items-center gap-2">' +
          '<span class="text-[13px] font-semibold text-muted">Giọng</span>' +
          '<div class="seg" role="group" aria-label="Chọn giọng phát âm">' +
            '<button type="button" class="seg-btn" data-accent="us" aria-pressed="' + (a === 'us') + '">Mỹ</button>' +
            '<button type="button" class="seg-btn" data-accent="uk" aria-pressed="' + (a === 'uk') + '">Anh</button>' +
          '</div>' +
          '<label class="flex items-center gap-2 text-[13px] font-semibold text-muted ms-1">' +
            'Tốc độ' +
            '<input type="range" id="tts-rate" min="0.5" max="1.2" step="0.05" value="' + this.rate() + '" ' +
              'class="w-24 accent-[color:var(--color-accent)]" aria-label="Tốc độ đọc">' +
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
