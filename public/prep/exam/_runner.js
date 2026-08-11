/* ============================================================
   PrepRunner — màn làm bài.

   Nguyên tắc: màn này KHÔNG giữ luật nào cả. Đồng hồ, số lần nghe, việc còn
   được ghi hay không đều do máy chủ quyết (server/exam-api.js); ở đây chỉ vẽ
   lại câu trả lời của máy chủ và nói cho người làm bài biết chuyện gì đang xảy
   ra. Vì thế mọi lần lưu đều lấy trạng thái mới về, và đồng hồ đếm ngược cục bộ
   được đồng bộ lại theo `secondsLeft` sau mỗi lần gọi API — trôi giờ ở máy
   người dùng không đổi được thời điểm hết giờ thật.
   ============================================================ */

const PrepRunner = {
  attempt: null,
  activeSection: null,
  _tick: null,
  _saveTimer: null,
  _dirty: new Map(),          // questionId -> answer chưa gửi
  _rec: null,                 // MediaRecorder đang chạy

  /* ---------- Vòng đời ---------- */

  async mount() {
    const params = new URLSearchParams(location.search);
    const wantTest = params.get('test');

    let res = await PrepApi.get('/api/attempts/current');
    let att = res.ok ? res.data.attempt : null;

    /* Đến đây để làm bài B trong khi bài A còn dở: máy chủ chỉ cho một lượt
       đang mở, nên nếu cứ thế nối vào bài A thì người dùng bấm "bắt đầu" bài B
       và nhận được bài A mà không hiểu vì sao. Nói ra và cho chọn. */
    if (att && wantTest && att.testId !== wantTest) {
      return this.showBusy(att);
    }

    /* Đến từ nút "Bắt đầu làm bài" của một đề cụ thể: mở lượt mới. */
    if (!att && wantTest) {
      const started = await PrepApi.post('/api/attempts', { testId: wantTest });
      if (!started.ok) return this.showNone(started.data || {});
      att = started.data.attempt;
    }
    if (!att) return this.showNone({});

    this.attempt = att;
    PREP.qs('#loading').setAttribute('hidden', '');
    if (att.status === 'submitted') return this.showDone(null);

    PREP.qs('#runner').removeAttribute('hidden');
    PREP.qs('#ex-title').textContent = att.testTitle;
    this.renderParts();

    /* Mở sẵn phần đang chạy dở, nếu không thì phần đầu chưa kết thúc. */
    const open = att.parts.find(p => p.open) ||
                 att.parts.find(p => !p.closedAt) || att.parts[0];
    if (open) this.showPart(open.sectionId, false);

    PREP.qs('#ex-submit').addEventListener('click', () => this.askSubmit());
    this.wireSubmitModal();

    /* Lưu nốt khi rời trang: đóng tab giữa chừng không được mất câu vừa gõ. */
    addEventListener('visibilitychange', () => { if (document.hidden) this.flush(); });
    addEventListener('pagehide', () => this.flush());
  },

  showNone(err) {
    PREP.qs('#loading').setAttribute('hidden', '');
    PREP.qs('#none').removeAttribute('hidden');
    const why = PREP.qs('#none-why');
    const alt = PREP.qs('#none-alt');
    /* Máy chủ nói rõ vì sao không mở được thì hiện đúng lý do đó, kèm đường đi
       tiếp — "không có bài nào" mà không nói vì sao là câu trả lời vô dụng. */
    if (err.need === 'plan') {
      why.textContent = err.error || 'Bạn chưa có gói còn hiệu lực.';
      alt.href = '/prep/mua-code/'; alt.textContent = 'Xem bảng giá';
    } else if (err.need === 'attempts') {
      why.textContent = err.error || 'Bạn đã dùng hết số lượt thi của gói.';
      alt.href = '/prep/mua-code/?locked=attempts'; alt.textContent = 'Nâng gói';
    } else if (err.error) {
      why.textContent = err.error;
    }
  },

  /** Còn một bài khác đang làm dở: nói rõ và cho hai đường đi. */
  showBusy(att) {
    this.attempt = att;
    PREP.qs('#loading').setAttribute('hidden', '');
    PREP.qs('#none').removeAttribute('hidden');
    PREP.qs('#none').querySelector('h2').textContent = 'Bạn đang làm dở một bài khác';
    PREP.qs('#none-why').textContent =
      'Bài "' + att.testTitle + '" chưa nộp. Mỗi lúc chỉ làm được một bài, nên hãy làm tiếp hoặc nộp bài đó trước.';
    const alt = PREP.qs('#none-alt');
    alt.href = '/prep/lam-bai/';
    alt.textContent = 'Làm tiếp bài đang dở';
    /* Nút chính đổi thành "nộp bài đang dở" — đó mới là việc mở đường sang bài
       mới, và không có nó thì người dùng kẹt lại không biết làm gì. */
    const main = PREP.qs('#none a.btn-primary');
    if (main) {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'btn btn-primary btn-md w-full';
      btn.textContent = 'Nộp bài đang dở';
      btn.addEventListener('click', async () => {
        btn.disabled = true;
        await PrepApi.post('/api/attempts/' + att.id + '/submit');
        location.href = '/prep/lam-bai/' + location.search;
      });
      main.replaceWith(btn);
    }
  },

  showDone(summary) {
    PREP.qs('#runner').setAttribute('hidden', '');
    PREP.qs('#loading').setAttribute('hidden', '');
    PREP.qs('#done').removeAttribute('hidden');
    PREP.qs('#done-count').textContent = summary
      ? 'Bạn đã trả lời ' + summary.answered + '/' + summary.total + ' câu.'
      : 'Bài này đã nộp trước đó.';
    this.stopClock();
  },

  /* ---------- Danh sách phần ---------- */

  renderParts() {
    PREP.qs('#ex-parts').innerHTML = this.attempt.parts.map(p => {
      const done = !!p.closedAt;
      const label = (p.part ? 'Phần ' + p.part : p.name);
      return '<button type="button" class="chip shrink-0" data-sec="' + p.sectionId + '"' +
        (p.sectionId === this.activeSection ? ' aria-pressed="true"' : ' aria-pressed="false"') +
        (done ? ' data-done="1"' : '') + '>' +
        PREP.esc(label) +
        (done ? ' ✓' : '') +
      '</button>';
    }).join('');
    PREP.qsa('[data-sec]').forEach(b => b.addEventListener('click', () =>
      this.showPart(+b.getAttribute('data-sec'), false)));
  },

  part(sectionId) {
    return this.attempt.parts.find(p => p.sectionId === sectionId);
  },

  /* ---------- Một phần ---------- */

  async showPart(sectionId, skipFlush) {
    if (!skipFlush) await this.flush();
    this.activeSection = sectionId;
    const p = this.part(sectionId);
    if (!p) return;
    this.renderParts();

    const box = PREP.qs('#ex-part');
    const started = !!p.startedAt;
    const closed = !!p.closedAt || (p.secondsLeft === 0 && p.endsAt);

    /* Chưa vào phần: hiện màn chờ có nút bắt đầu. Bấm là đồng hồ chạy và không
       dừng lại được, nên phải nói trước chứ không để người ta lỡ tay. */
    if (!started) {
      box.innerHTML =
        '<div class="card p-8 text-center">' +
          '<h3 class="font-extrabold text-xl tracking-tight">' + PREP.esc(p.name) + '</h3>' +
          '<p class="text-muted text-[15px] mt-2">' + PREP.esc(p.type) + ' · ' + p.items.length + ' câu' +
            (p.minutes ? ' · ' + p.minutes + ' phút' : ' · không giới hạn giờ') + '</p>' +
          (p.minutes
            ? '<p class="text-[14px] font-semibold text-muted mt-4 max-w-[44ch] mx-auto">Bấm bắt đầu là đồng hồ chạy. Hết giờ thì phần này đóng lại và không quay lại được.</p>'
            : '') +
          '<button type="button" id="ex-enter" class="btn btn-primary btn-lg mt-6">Bắt đầu phần này</button>' +
        '</div>';
      PREP.qs('#ex-enter').addEventListener('click', () => this.enter(sectionId));
      this.stopClock();
      PREP.qs('#ex-clock').setAttribute('hidden', '');
      return;
    }

    box.innerHTML =
      '<div class="flex flex-wrap items-baseline gap-x-3 gap-y-1 mb-4">' +
        '<h3 class="font-extrabold text-xl tracking-tight">' + PREP.esc(p.name) + '</h3>' +
        '<span class="text-[13.5px] font-semibold text-muted">' + p.items.length + ' câu</span>' +
        (closed ? '<span class="badge badge-muted">Đã kết thúc</span>' : '') +
      '</div>' +
      '<div class="grid gap-4">' + p.items.map((it, i) => this.itemHTML(p, it, i)).join('') + '</div>' +
      (closed ? '' :
        '<button type="button" id="ex-close" class="btn btn-ghost btn-md mt-6">Kết thúc phần này</button>');

    this.wireItems(p, closed);
    if (!closed) {
      const btn = PREP.qs('#ex-close');
      if (btn) btn.addEventListener('click', () => this.closePart(sectionId));
    }
    this.startClock(p);
  },

  /** Một câu: đề bài, chỗ trả lời, và nút nghe / ghi âm nếu có */
  itemHTML(p, it, i) {
    const id = 'q' + it.questionId;
    let body;
    if (it.type === 'mcq') {
      body = '<div class="grid gap-2 mt-3">' + it.options.map((o, k) =>
        '<label class="flex items-start gap-2.5 rounded-xl border border-line px-3.5 py-2.5 cursor-pointer">' +
          '<input type="radio" name="' + id + '" value="' + PREP.esc(o) + '" ' +
            (o === it.answer ? 'checked ' : '') +
            'class="w-4 h-4 mt-0.5 accent-[color:var(--color-accent)] shrink-0" ' +
            'data-answer="' + it.questionId + '" aria-label="Phương án ' + (k + 1) + '">' +
          '<span class="text-[14.5px]">' + PREP.esc(o) + '</span>' +
        '</label>').join('') + '</div>';
    } else if (it.type === 'speaking') {
      body =
        '<div class="flex flex-wrap items-center gap-2.5 mt-3">' +
          '<button type="button" class="btn btn-soft btn-md" data-rec="' + it.questionId + '">' +
            PREP.icon('mic', 'w-4 h-4') + '<span>Ghi âm</span></button>' +
          '<span class="text-[13px] font-semibold text-muted" data-rec-state="' + it.questionId + '">' +
            (it.hasRecording ? 'Đã có bản ghi' : 'Chưa ghi') + '</span>' +
        '</div>';
    } else if (it.type === 'essay') {
      body = '<textarea class="input mt-3" rows="6" data-answer="' + it.questionId + '" ' +
        'aria-label="Bài viết của bạn">' + PREP.esc(it.answer) + '</textarea>';
    } else {
      body = '<input class="input mt-3" data-answer="' + it.questionId + '" ' +
        'value="' + PREP.esc(it.answer) + '" aria-label="Câu trả lời">';
    }

    const audio = it.hasAudio
      ? '<div class="flex flex-wrap items-center gap-2.5 mt-3">' +
          '<button type="button" class="btn btn-soft btn-sm" data-play="' + it.questionId + '"' +
            (it.replaysLeft <= 0 ? ' disabled' : '') + '>' +
            PREP.icon('play', 'w-4 h-4') + '<span>Nghe</span></button>' +
          '<span class="text-[13px] font-semibold text-muted" data-plays="' + it.questionId + '">' +
            (it.replaysLeft > 0 ? 'Còn ' + it.replaysLeft + ' lượt nghe' : 'Hết lượt nghe') + '</span>' +
        '</div>'
      : '';

    return '<article class="card p-5" data-item="' + it.questionId + '">' +
      '<p class="flex gap-2.5">' +
        '<span class="w-6 shrink-0 text-[13px] font-bold text-muted">' + (i + 1) + '</span>' +
        '<span class="text-[15px] leading-relaxed">' + PREP.esc(it.prompt) + '</span>' +
      '</p>' + audio + body +
    '</article>';
  },

  wireItems(p, closed) {
    PREP.qsa('[data-answer]').forEach(el => {
      if (closed) { el.disabled = true; return; }
      const qid = +el.getAttribute('data-answer');
      const ev = el.type === 'radio' ? 'change' : 'input';
      el.addEventListener(ev, () => {
        this._dirty.set(qid, el.type === 'radio' ? el.value : el.value);
        this.saveSoon();
      });
      el.addEventListener('blur', () => this.flush());
    });
    PREP.qsa('[data-play]').forEach(b => b.addEventListener('click', () => this.play(+b.getAttribute('data-play'))));
    PREP.qsa('[data-rec]').forEach(b => {
      if (closed) { b.disabled = true; return; }
      b.addEventListener('click', () => this.toggleRecord(+b.getAttribute('data-rec'), b));
    });
  },

  async enter(sectionId) {
    const r = await PrepApi.post('/api/attempts/' + this.attempt.id + '/parts/' + sectionId + '/start');
    if (!r.ok) { PrepChrome.toast(PrepApi.err(r), 'error'); return; }
    await this.refresh();
    this.showPart(sectionId, true);
  },

  async closePart(sectionId) {
    await this.flush();
    const r = await PrepApi.post('/api/attempts/' + this.attempt.id + '/parts/' + sectionId + '/close');
    if (!r.ok) { PrepChrome.toast(PrepApi.err(r), 'error'); return; }
    await this.refresh();
    this.showPart(sectionId, true);
  },

  /* ---------- Đồng hồ ---------- */

  startClock(p) {
    this.stopClock();
    const box = PREP.qs('#ex-clock');
    if (!p.endsAt) { box.setAttribute('hidden', ''); return; }
    box.removeAttribute('hidden');
    let left = p.secondsLeft == null ? 0 : p.secondsLeft;
    const paint = () => {
      const m = Math.floor(left / 60), s = left % 60;
      PREP.qs('#ex-clock-text').textContent = m + ':' + String(s).padStart(2, '0');
      /* Dưới một phút thì đổi màu — thời điểm duy nhất đồng hồ cần gây chú ý. */
      box.classList.toggle('clock-low', left <= 60);
    };
    paint();
    this._tick = setInterval(async () => {
      left = Math.max(0, left - 1);
      paint();
      if (left === 0) {
        this.stopClock();
        await this.flush();
        await this.refresh();
        PrepChrome.toast('Hết giờ phần này', 'error');
        this.showPart(p.sectionId, true);
      }
    }, 1000);
  },

  stopClock() { if (this._tick) { clearInterval(this._tick); this._tick = null; } },

  /* ---------- Lưu ---------- */

  saveSoon() {
    PREP.qs('#ex-saved').textContent = 'Đang lưu…';
    clearTimeout(this._saveTimer);
    this._saveTimer = setTimeout(() => this.flush(), 1200);
  },

  /** Gửi hết câu đang chờ. Máy chủ trả về câu nào giữ, câu nào không. */
  async flush() {
    clearTimeout(this._saveTimer);
    if (!this._dirty.size || !this.attempt) return;
    const answers = [...this._dirty].map(([questionId, answer]) => ({ questionId, answer }));
    this._dirty.clear();
    const r = await PrepApi.patch('/api/attempts/' + this.attempt.id + '/answers', { answers });
    const el = PREP.qs('#ex-saved');
    if (!r.ok) { el.textContent = 'Chưa lưu được'; return; }
    const rejected = (r.data.rejected || []).length;
    /* Nói thật khi có câu không được nhận: im lặng ở đây nghĩa là người ta tin
       mình đã trả lời trong khi máy chủ không giữ gì cả. */
    el.textContent = rejected
      ? 'Có ' + rejected + ' câu không kịp lưu (phần đã đóng)'
      : 'Đã lưu';
    if (rejected) await this.refresh();
  },

  /** Lấy lại trạng thái thật từ máy chủ (đồng hồ, lượt nghe, đáp án đã lưu) */
  async refresh() {
    const r = await PrepApi.get('/api/attempts/' + this.attempt.id);
    if (r.ok && r.data.attempt) this.attempt = r.data.attempt;
    this.renderParts();
  },

  /* ---------- Nghe ---------- */

  async play(questionId) {
    const btn = PREP.qs('[data-play="' + questionId + '"]');
    const label = PREP.qs('[data-plays="' + questionId + '"]');
    if (!btn || btn.disabled) return;
    btn.disabled = true;

    /* Gọi qua fetch trước để biết máy chủ có cho nghe không: gán thẳng vào
       <audio src> thì lỗi 429 chỉ hiện ra dưới dạng "không phát được". */
    const url = '/api/attempts/' + this.attempt.id + '/items/' + questionId + '/audio';
    let blob;
    try {
      const res = await fetch(url, { credentials: 'same-origin' });
      if (!res.ok) {
        const msg = await res.json().catch(() => ({}));
        label.textContent = msg.error || 'Không nghe được';
        if (res.status === 429) label.textContent = 'Hết lượt nghe';
        return;
      }
      label.textContent = 'Còn ' + (res.headers.get('X-Replays-Left') || 0) + ' lượt nghe';
      blob = await res.blob();
    } catch (e) {
      label.textContent = 'Mất kết nối';
      btn.disabled = false;
      return;
    }

    const src = URL.createObjectURL(blob);
    const audio = new Audio(src);
    audio.addEventListener('ended', () => {
      URL.revokeObjectURL(src);
      const left = parseInt((label.textContent.match(/\d+/) || [0])[0], 10);
      btn.disabled = left <= 0;
    });
    audio.play().catch(() => { label.textContent = 'Trình duyệt chặn phát tự động'; btn.disabled = false; });
  },

  /* ---------- Ghi âm ---------- */

  async toggleRecord(questionId, btn) {
    const state = PREP.qs('[data-rec-state="' + questionId + '"]');

    if (this._rec && this._rec.questionId === questionId) {
      this._rec.recorder.stop();
      return;
    }
    if (this._rec) { PrepChrome.toast('Đang ghi âm một câu khác', 'error'); return; }
    if (!navigator.mediaDevices || !window.MediaRecorder) {
      state.textContent = 'Trình duyệt này không ghi âm được';
      return;
    }

    let stream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    } catch (e) {
      /* Từ chối quyền micro là lựa chọn của người dùng, không phải lỗi hệ thống
         — nói rõ cần làm gì thay vì báo hỏng. */
      state.textContent = 'Chưa cấp quyền micro cho trang này';
      return;
    }

    const chunks = [];
    const recorder = new MediaRecorder(stream);
    this._rec = { questionId, recorder, stream };
    recorder.addEventListener('dataavailable', e => { if (e.data.size) chunks.push(e.data); });
    recorder.addEventListener('stop', async () => {
      stream.getTracks().forEach(t => t.stop());
      this._rec = null;
      btn.querySelector('span').textContent = 'Ghi âm';
      btn.classList.remove('btn-danger');
      state.textContent = 'Đang gửi…';
      const blob = new Blob(chunks, { type: recorder.mimeType || 'audio/webm' });
      const res = await fetch('/api/attempts/' + this.attempt.id + '/items/' + questionId + '/recording', {
        method: 'POST',
        credentials: 'same-origin',
        headers: { 'Content-Type': blob.type || 'audio/webm', 'X-CSRF-Token': PrepApi.csrf() },
        body: blob
      }).catch(() => null);
      if (res && res.ok) { state.textContent = 'Đã lưu bản ghi'; }
      else {
        const msg = res ? await res.json().catch(() => ({})) : {};
        state.textContent = msg.error || 'Không gửi được bản ghi';
      }
    });
    recorder.start();
    btn.querySelector('span').textContent = 'Dừng ghi';
    btn.classList.add('btn-danger');
    state.textContent = 'Đang ghi…';
  },

  /* ---------- Nộp bài ---------- */

  wireSubmitModal() {
    const modal = PREP.qs('#submit-modal');
    PREP.qsa('[data-close]', modal).forEach(b => b.addEventListener('click', () => modal.classList.remove('show')));
    modal.addEventListener('click', e => { if (e.target === modal) modal.classList.remove('show'); });
    PREP.qs('#sm-go').addEventListener('click', () => this.submit());
  },

  askSubmit() {
    const total = this.attempt.parts.reduce((a, p) => a + p.items.length, 0);
    const answered = this.attempt.parts.reduce((a, p) =>
      a + p.items.filter(i => (i.answer && i.answer.trim()) || i.hasRecording).length, 0);
    PREP.qs('#sm-body').textContent = answered < total
      ? 'Bạn đã trả lời ' + answered + '/' + total + ' câu. Nộp rồi thì không sửa được nữa.'
      : 'Bạn đã trả lời hết ' + total + ' câu. Nộp rồi thì không sửa được nữa.';
    PREP.qs('#submit-modal').classList.add('show');
  },

  async submit() {
    await this.flush();
    const r = await PrepApi.post('/api/attempts/' + this.attempt.id + '/submit');
    PREP.qs('#submit-modal').classList.remove('show');
    if (!r.ok) { PrepChrome.toast(PrepApi.err(r), 'error'); return; }
    this.showDone(r.data);
  }
};
