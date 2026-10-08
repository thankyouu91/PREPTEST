/* ============================================================
   Sitting the test — one item at a time, the way the specification describes it.

   ------------------------------------------------------------------
   WHAT CHANGED, AND WHY IT HAD TO

   The previous runner put a whole part on one scrolling page with a single
   clock. The owner's specification (VPET_test.xlsx) describes something else
   entirely: a page per item, a countdown per item, a Next button, and for six
   of the ten parts a stimulus screen that goes away before the answer screen
   arrives. Part B is the clearest case — the passage is shown for 30 seconds
   and then "the paragraph will disappear from the screen". On one scrolling
   page it never disappears, and the part stops being a memory task.

   ------------------------------------------------------------------
   WHERE THE AUTHORITY LIES

   The per-item countdown is client-side pacing. The server still owns the part
   clock and still refuses answers to a closed part, so a candidate who stops
   the page from ticking gains nothing beyond the part's own limit. This is said
   out loud because a reader could otherwise assume the item timer is enforced,
   and build something on that assumption.

   ------------------------------------------------------------------
   GROUPED ITEMS

   Parts C and G hang several questions off one stimulus, which arrives as
   `stimulusKey`. They group differently on purpose:

     C  one screen for the group — passage on the left, both questions on the
        right, three minutes for the pair. Splitting them would show the passage
        twice and give six minutes where the sheet gives three.
     G  the story plays once on its own screen, then one answer screen per
        question with seven seconds each. The questions must not be visible
        while the story plays; that is the comprehension.
   ============================================================ */
'use strict';

const PrepRunner = {
  attempt: null,
  pi: 0,            // which part
  gi: 0,            // which stimulus group inside the part
  qi: 0,            // which question inside the group
  stage: 'brief',   // brief | stimulus | answer
  _dirty: new Map(),

  /* ---------------------------------------------------------------- boot */

  async mount() {
    this.wireSubmitModal();
    PREP.qs('#ex-submit').addEventListener('click', () => this.askSubmit());

    const params = new URLSearchParams(location.search);
    const wantTest = params.get('test');

    let r = await PrepApi.get('/api/attempts/current');
    let att = r.ok && r.data ? r.data.attempt : null;

    if (!att && wantTest) {
      const started = await PrepApi.post('/api/attempts', { testId: wantTest });
      if (started.ok) att = started.data.attempt;
      else return this.showNone(PrepApi.err(started), started.data);
    }
    if (!att) return this.showNone('Pick a test in the library and press Start.');

    this.attempt = att;
    if (att.status === 'submitted') return this.showDone({ attempt: att });

    PREP.qs('#loading').setAttribute('aria-hidden', 'true');
    PREP.qs('#loading').hidden = true;
    PREP.qs('#runner').hidden = false;
    PREP.qs('#ex-title').textContent = att.title || 'VPET';

    /* Resume where the candidate was: the first part that is open, else the
       first that has not been closed. */
    const open = att.parts.findIndex(p => p.open);
    const next = att.parts.findIndex(p => !p.closedAt);
    this.pi = open >= 0 ? open : (next >= 0 ? next : 0);
    this.stage = 'brief';
    this.render();
  },

  showNone(why, data) {
    PREP.qs('#loading').hidden = true;
    PREP.qs('#none').hidden = false;
    PREP.qs('#none-why').textContent = why || '';
    if (data && data.buy) {
      const alt = PREP.qs('#none-alt');
      alt.href = '/prep/mua-code/';
      alt.textContent = 'Buy a code';
    }
  },

  showDone(payload) {
    this.stopClocks();
    PREP.qs('#loading').hidden = true;
    PREP.qs('#runner').hidden = true;
    PREP.qs('#none').hidden = true;
    PREP.qs('#done').hidden = false;
    const att = (payload && payload.attempt) || this.attempt || {};
    const link = PREP.qs('#done-result');
    if (att.id) link.href = '/prep/ket-qua/' + att.id + '/';
  },

  /* ---------------------------------------------------------------- model */

  part() { return this.attempt.parts[this.pi]; },

  /**
   * The part's items, bundled by stimulus.
   *
   * A part with no `stimulusKey` yields one bundle per item, so every part is
   * handled by the same loop and only the bundling differs. Returning a ragged
   * mixture of items and groups is what would force the rest of this file to
   * ask "is this one a group?" at every turn.
   */
  groups(p) {
    const out = [];
    const seen = new Map();
    (p.items || []).forEach(it => {
      if (!it.stimulusKey) { out.push({ key: null, items: [it] }); return; }
      if (seen.has(it.stimulusKey)) { seen.get(it.stimulusKey).items.push(it); return; }
      const g = { key: it.stimulusKey, items: [it] };
      seen.set(it.stimulusKey, g);
      out.push(g);
    });
    return out;
  },

  group() { return this.groups(this.part())[this.gi] || { items: [] }; },
  item() { return this.group().items[this.qi] || null; },

  /** Item number across the whole part, for "3 of 10". */
  itemNumber() {
    const gs = this.groups(this.part());
    let n = 0;
    for (let i = 0; i < this.gi; i++) n += gs[i].items.length;
    return n + this.qi + 1;
  },

  /* ---------------------------------------------------------------- render */

  async render() {
    const p = this.part();
    if (!p) return this.askSubmit();

    this.paintStrip();
    this.stopItemClock();

    if (this.stage === 'brief') return this.renderBrief(p);

    /* The part has to be open on the server before anything is answered. */
    if (!p.startedAt) {
      const r = await PrepApi.post('/api/attempts/' + this.attempt.id + '/parts/' + p.sectionId + '/start');
      if (!r.ok) { PrepChrome.toast(PrepApi.err(r), 'error'); return; }
      await this.refresh();
    }
    this.startPartClock(this.part());

    if (this.stage === 'stimulus') return this.renderStimulus(this.part());
    return this.renderAnswer(this.part());
  },

  /** A line of part letters, so a candidate always knows where they are. */
  paintStrip() {
    const box = PREP.qs('#ex-parts');
    box.innerHTML = this.attempt.parts.map((p, i) => {
      const live = i === this.pi;
      const done = !!p.closedAt;
      /* The live part is the pressed one, a finished part is dimmed — both
         styles already exist for the chip, so nothing new is invented here. */
      return '<span class="chip"' + (live ? ' aria-pressed="true"' : '') +
        (done ? ' data-done' : '') + '>' +
        PREP.esc(p.part ? 'Part ' + p.part : p.name) + '</span>';
    }).join('');
  },

  /* ---- 1 · the instruction page before each part ---- */
  renderBrief(p) {
    const n = (p.items || []).length;
    PREP.qs('#ex-part').innerHTML =
      '<div class="card p-7 max-w-[70ch]">' +
        '<p class="text-[13px] font-extrabold tracking-wide text-brand-strong uppercase">' +
          PREP.esc(p.part ? 'Part ' + p.part : '') + '</p>' +
        '<h2 class="text-2xl font-extrabold tracking-tight mt-1">' +
          PREP.esc(p.name.replace(/^Part [A-J]\s*-\s*/, '')) + '</h2>' +
        '<p class="text-[15.5px] leading-relaxed mt-4">' + PREP.esc(p.brief || '') + '</p>' +
        '<dl class="grid sm:grid-cols-3 gap-3 mt-6">' +
          this.fact('Questions', String(n)) +
          this.fact('Time each', p.seconds ? this.clockText(p.seconds) : '—') +
          this.fact('You answer by', ({ type: 'Typing', click: 'Clicking', speak: 'Speaking' })[p.answerMode] || '—') +
        '</dl>' +
        (p.beep ? '<p class="text-[13.5px] font-semibold text-muted mt-4">' + PREP.esc(p.beep) + '</p>' : '') +
        '<div class="flex flex-wrap items-center gap-3 mt-7">' +
          '<button type="button" class="btn btn-primary btn-md" data-go>Begin this part</button>' +
          '<span class="text-[13.5px] font-semibold text-muted">You can read this for as long as you like. The clock starts when you begin.</span>' +
        '</div>' +
      '</div>';
    PREP.qs('[data-go]').addEventListener('click', () => {
      this.gi = 0; this.qi = 0;
      this.stage = this.part().pages === 2 ? 'stimulus' : 'answer';
      this.render();
    });
  },

  fact(label, value) {
    return '<div class="rounded-xl bg-surface-2 border border-line px-4 py-3">' +
      '<dt class="text-[12.5px] font-bold text-muted uppercase tracking-wide">' + PREP.esc(label) + '</dt>' +
      '<dd class="text-[15px] font-extrabold tracking-tight mt-0.5">' + PREP.esc(value) + '</dd></div>';
  },

  /* ---- 2 · the stimulus screen (two-page parts only) ---- */
  renderStimulus(p) {
    const g = this.group();
    const it = g.items[0];
    const secs = p.readSeconds || 0;

    /* What the candidate is looking at while the stimulus runs. Parts that play
       audio show a headphone mark and nothing else — printing the passage would
       turn a listening item into a reading one. */
    let body;
    if (p.stimulusMode === 'audio') {
      body = '<div class="text-center py-10">' +
        '<span class="w-16 h-16 rounded-full bg-brand-soft text-brand-strong inline-flex items-center justify-center">' +
        PREP.icon('headphones', 'w-8 h-8') + '</span>' +
        '<p class="text-[15px] font-semibold mt-4">Please listen.</p>' +
        '<p class="text-[13.5px] text-muted mt-1" data-play-state>Press play when you are ready.</p>' +
        '</div>';
    } else {
      body = '<div class="rounded-xl bg-surface-2 border border-line px-5 py-4 ' +
        'text-[15.5px] leading-relaxed whitespace-pre-line">' + PREP.esc(it.passage || '') + '</div>' +
        (p.stimulusMode === 'both'
          ? '<p class="text-[13.5px] text-muted mt-3" data-play-state>You will also hear this read aloud.</p>' : '');
    }

    PREP.qs('#ex-part').innerHTML =
      this.frame(p, 'Please read the passage.', body,
        secs ? 'Continue' : 'I have finished reading');

    this.wireFrame(p);
    if (it.hasAudio) this.play(it.questionId, true);
    if (secs) this.startItemClock(secs, () => this.toAnswer());
  },

  /* ---- 3 · the answer screen ---- */
  renderAnswer(p) {
    const g = this.group();
    const it = this.item();
    if (!it) return this.nextItem();

    /* Part C keeps the passage beside the questions; every other part that had a
       stimulus page has already taken it away. */
    const sideBySide = p.split && it.passage;
    const stim = sideBySide
      ? '<div class="rounded-xl bg-surface-2 border border-line px-5 py-4 ' +
        'text-[15px] leading-relaxed whitespace-pre-line max-h-[52vh] overflow-auto">' +
        PREP.esc(it.passage) + '</div>'
      : '';

    /* On a split part C screen both questions of the group are answered
       together, because the sheet gives three minutes to the pair. */
    const asked = (p.split && g.items.length > 1) ? g.items : [it];
    const qs = asked.map((q, k) => this.question(p, q, asked.length > 1 ? k + 1 : 0)).join('');

    const body = sideBySide
      ? '<div class="grid lg:grid-cols-2 gap-5">' + stim + '<div class="grid gap-4">' + qs + '</div></div>'
      : qs;

    PREP.qs('#ex-part').innerHTML = this.frame(p, p.say || '', body, 'Next');
    this.wireFrame(p);
    this.wireAnswers(p);

    /* The beep belongs to the moment the candidate may start. For a speaking
       part that is now; for everything else the screen itself is the cue. */
    if (p.answerMode === 'speak' && p.thinkSeconds) {
      this.startItemClock(p.thinkSeconds, () => { this.beep(); this.openMic(p, it); });
    } else {
      if (p.answerMode === 'speak') this.beep();
      this.startItemClock(p.seconds || 0, () => this.nextItem());
    }
  },

  /** One question: its prompt and the right way to answer it. */
  question(p, it, n) {
    const id = 'q' + it.questionId;
    const head = (n ? '<b class="text-[13px] font-bold text-muted">Question ' + n + '</b><br>' : '') +
      '<span class="text-[15.5px] leading-relaxed">' + PREP.esc(it.prompt) + '</span>';

    let body;
    if (p.spokenOptions) {
      /* Nothing but the letters: the options were spoken and must not be read. */
      const letters = ['A', 'B', 'C', 'D'].slice(0, it.optionCount || 3);
      body = '<div class="flex flex-wrap gap-3 mt-4">' + letters.map(L =>
        '<button type="button" class="btn btn-soft btn-lg w-20" data-pick="' + it.questionId + '" ' +
        'value="' + L + '"' + (it.answer === L ? ' aria-pressed="true"' : '') + '>' + L + '</button>').join('') +
        '</div>';
    } else if (it.type === 'mcq') {
      body = '<div class="grid gap-2 mt-3">' + (it.options || []).map((o, k) =>
        '<label class="flex items-start gap-2.5 rounded-xl border border-line px-3.5 py-2.5 cursor-pointer">' +
          '<input type="radio" name="' + id + '" value="' + PREP.esc(o) + '" ' +
            (o === it.answer ? 'checked ' : '') +
            'class="w-4 h-4 mt-0.5 accent-[color:var(--color-accent)] shrink-0" ' +
            'data-answer="' + it.questionId + '" aria-label="Option ' + (k + 1) + '">' +
          '<span class="text-[14.5px]">' + PREP.esc(o) + '</span>' +
        '</label>').join('') + '</div>';
    } else if (p.answerMode === 'speak') {
      body =
        '<div class="flex flex-wrap items-center gap-2.5 mt-4">' +
          '<button type="button" class="btn btn-soft btn-md" data-rec="' + it.questionId + '">' +
            PREP.icon('mic', 'w-4 h-4') + '<span>Record</span></button>' +
          '<span class="text-[13px] font-semibold text-muted" data-rec-state="' + it.questionId + '">' +
            (it.hasRecording ? 'Recording saved' : 'Not recorded') + '</span>' +
        '</div>';
    } else if (it.type === 'essay') {
      const words = (it.answer || '').trim() ? (it.answer || '').trim().split(/\s+/).length : 0;
      body = '<textarea class="input mt-3" rows="' + (p.minWords ? 12 : 8) + '" ' +
        'data-answer="' + it.questionId + '" aria-label="Your writing">' + PREP.esc(it.answer) + '</textarea>' +
        (p.minWords
          ? '<p class="text-[13px] font-semibold mt-2" data-words="' + it.questionId + '">' +
            words + ' words — at least ' + p.minWords + ' required</p>' : '');
    } else {
      body = '<input class="input mt-3" data-answer="' + it.questionId + '" ' +
        'value="' + PREP.esc(it.answer) + '" aria-label="Your answer" autocomplete="off">';
    }

    /* A part that plays audio, with no recording behind it. The publish gate is
       what stops such a paper going live, so reaching this line means something
       got past it — and a candidate reading "you will hear a story" with nothing
       to press cannot tell a broken exam from a broken browser. */
    const missing = !it.hasAudio && p.needsAudio
      ? '<p class="mt-3 text-[13px] font-semibold text-danger">The recording for this question is ' +
        'missing. Tell your teacher — this item cannot be answered and must not count against you.</p>'
      : '';

    /* Replay control, where the part allows one. */
    const replay = it.hasAudio && it.replaysLeft > 0
      ? '<button type="button" class="btn btn-ghost btn-sm mt-3" data-play="' + it.questionId + '">' +
        PREP.icon('play', 'w-4 h-4') + '<span data-plays="' + it.questionId + '">Play again (' +
        it.replaysLeft + ')</span></button>'
      : '';

    return '<article class="card p-5" data-item="' + it.questionId + '">' +
      '<p>' + head + '</p>' + missing + replay + body + '</article>';
  },

  /* ---- the shell every item screen shares ---- */
  frame(p, lead, body, nextLabel) {
    const total = (p.items || []).length;
    return '<div class="grid gap-4">' +
      '<div class="flex flex-wrap items-center gap-x-4 gap-y-2">' +
        '<b class="text-[13px] font-extrabold tracking-wide text-brand-strong uppercase">' +
          PREP.esc(p.part ? 'Part ' + p.part : '') + '</b>' +
        '<span class="text-[13.5px] font-semibold text-muted">Question ' +
          this.itemNumber() + ' of ' + total + '</span>' +
        '<span id="item-clock" class="clock ms-auto"><span id="item-clock-text">--</span></span>' +
      '</div>' +
      (lead ? '<p class="text-[14.5px] font-semibold">' + PREP.esc(lead) + '</p>' : '') +
      body +
      '<div class="flex justify-end mt-2">' +
        '<button type="button" class="btn btn-primary btn-md" data-next>' + PREP.esc(nextLabel) + '</button>' +
      '</div>' +
    '</div>';
  },

  wireFrame(p) {
    const btn = PREP.qs('[data-next]');
    if (btn) btn.addEventListener('click', () => {
      if (this.stage === 'stimulus') this.toAnswer();
      else this.nextItem();
    });
    PREP.qsa('[data-play]').forEach(b =>
      b.addEventListener('click', () => this.play(+b.getAttribute('data-play'))));
  },

  wireAnswers(p) {
    PREP.qsa('[data-answer]').forEach(el => {
      const qid = +el.getAttribute('data-answer');
      const ev = el.type === 'radio' ? 'change' : 'input';
      el.addEventListener(ev, () => {
        this._dirty.set(qid, el.value);
        const counter = PREP.qs('[data-words="' + qid + '"]');
        if (counter) {
          const n = el.value.trim() ? el.value.trim().split(/\s+/).length : 0;
          counter.textContent = n + ' words — at least ' + p.minWords + ' required';
          counter.classList.toggle('text-danger', n < p.minWords);
          counter.classList.toggle('text-accent-strong', n >= p.minWords);
        }
        this.saveSoon();
      });
      el.addEventListener('blur', () => this.flush());
    });

    /* Part F: three lettered buttons and nothing else. */
    PREP.qsa('[data-pick]').forEach(b => b.addEventListener('click', () => {
      const qid = +b.getAttribute('data-pick');
      PREP.qsa('[data-pick="' + qid + '"]').forEach(o => o.setAttribute('aria-pressed', 'false'));
      b.setAttribute('aria-pressed', 'true');
      this._dirty.set(qid, b.value);
      this.flush();
    }));

    PREP.qsa('[data-rec]').forEach(b =>
      b.addEventListener('click', () => this.toggleRecord(+b.getAttribute('data-rec'), b)));
  },

  /* ---------------------------------------------------------------- moving on */

  toAnswer() { this.stage = 'answer'; this.render(); },

  /** Begin recording without the candidate pressing anything, after the beep. */
  openMic(p, it) {
    const btn = PREP.qs('[data-rec="' + it.questionId + '"]');
    if (btn && !this._rec) this.toggleRecord(it.questionId, btn);
    this.startItemClock(p.seconds || 0, () => {
      if (this._rec) this._rec.recorder.stop();
      this.beep();
      this.nextItem();
    });
  },

  async nextItem() {
    await this.flush();
    if (this._rec) { this._rec.recorder.stop(); this._rec = null; }

    const p = this.part();
    const g = this.group();
    const grouped = p.split && g.items.length > 1;   // part C answered as a pair

    if (!grouped && this.qi + 1 < g.items.length) {
      this.qi++;
      /* Inside a group the stimulus has already been given — go straight on. */
      this.stage = 'answer';
      return this.render();
    }

    const gs = this.groups(p);
    if (this.gi + 1 < gs.length) {
      this.gi++; this.qi = 0;
      this.stage = p.pages === 2 ? 'stimulus' : 'answer';
      return this.render();
    }

    return this.endPart();
  },

  async endPart() {
    const p = this.part();
    await PrepApi.post('/api/attempts/' + this.attempt.id + '/parts/' + p.sectionId + '/close')
      .catch(() => null);
    await this.refresh();
    if (this.pi + 1 < this.attempt.parts.length) {
      this.pi++; this.gi = 0; this.qi = 0; this.stage = 'brief';
      return this.render();
    }
    this.askSubmit();
  },

  /* ---------------------------------------------------------------- clocks */

  clockText(s) {
    const m = Math.floor(s / 60);
    return m ? m + ':' + String(s % 60).padStart(2, '0') : s + 's';
  },

  /** The per-item countdown. Pacing, not enforcement — see the file header. */
  startItemClock(secs, onEnd) {
    this.stopItemClock();
    const box = PREP.qs('#item-clock');
    const txt = PREP.qs('#item-clock-text');
    if (!box || !secs) { if (box) box.hidden = true; return; }
    box.hidden = false;
    let left = secs;
    const paint = () => {
      txt.textContent = this.clockText(left);
      box.classList.toggle('clock-low', left <= 5);
    };
    paint();
    this._itemTick = setInterval(() => {
      left = Math.max(0, left - 1);
      paint();
      if (left === 0) { this.stopItemClock(); onEnd(); }
    }, 1000);
  },

  stopItemClock() { if (this._itemTick) { clearInterval(this._itemTick); this._itemTick = null; } },

  /** The part clock, which the server owns. Shown in the header. */
  startPartClock(p) {
    this.stopPartClock();
    const box = PREP.qs('#ex-clock');
    if (!p.endsAt) { box.setAttribute('hidden', ''); return; }
    box.removeAttribute('hidden');
    let left = p.secondsLeft == null ? 0 : p.secondsLeft;
    const paint = () => {
      PREP.qs('#ex-clock-text').textContent = this.clockText(left);
      box.classList.toggle('clock-low', left <= 60);
    };
    paint();
    this._tick = setInterval(async () => {
      left = Math.max(0, left - 1);
      paint();
      if (left === 0) {
        this.stopPartClock();
        await this.flush();
        PrepChrome.toast('Time is up for this part', 'error');
        this.endPart();
      }
    }, 1000);
  },

  stopPartClock() { if (this._tick) { clearInterval(this._tick); this._tick = null; } },
  stopClocks() { this.stopItemClock(); this.stopPartClock(); },

  /* ---------------------------------------------------------------- the beep */

  /**
   * The tone that tells a candidate to speak.
   *
   * Generated rather than loaded: it must be exact and it must never be the
   * thing that fails. A missing asset would leave a speaking part with no cue at
   * all, and the candidate would sit in silence waiting for a sound that is
   * never coming.
   */
  beep() {
    try {
      const ctx = new (window.AudioContext || window.webkitAudioContext)();
      const osc = ctx.createOscillator(), gain = ctx.createGain();
      osc.frequency.value = 880;
      gain.gain.setValueAtTime(0.0001, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.25, ctx.currentTime + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.35);
      osc.connect(gain).connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.4);
      setTimeout(() => ctx.close(), 600);
    } catch (e) { /* No audio context: the screen still says what to do. */ }
  },

  /* ---------------------------------------------------------------- saving */

  saveSoon() {
    PREP.qs('#ex-saved').textContent = 'Saving…';
    clearTimeout(this._saveTimer);
    this._saveTimer = setTimeout(() => this.flush(), 1200);
  },

  async flush() {
    clearTimeout(this._saveTimer);
    if (!this._dirty.size || !this.attempt) return;
    const answers = [...this._dirty].map(([questionId, answer]) => ({ questionId, answer }));
    this._dirty.clear();
    const r = await PrepApi.patch('/api/attempts/' + this.attempt.id + '/answers', { answers });
    const el = PREP.qs('#ex-saved');
    if (!r.ok) { el.textContent = 'Not saved'; return; }
    const rejected = (r.data.rejected || []).length;
    el.textContent = rejected
      ? rejected + ' answers were too late to save (the part had closed)'
      : 'Saved';
    if (rejected) await this.refresh();
  },

  async refresh() {
    const r = await PrepApi.get('/api/attempts/' + this.attempt.id);
    if (r.ok && r.data.attempt) this.attempt = r.data.attempt;
  },

  /* ---------------------------------------------------------------- audio */

  async play(questionId, auto) {
    const btn = PREP.qs('[data-play="' + questionId + '"]');
    const label = PREP.qs('[data-plays="' + questionId + '"]') || PREP.qs('[data-play-state]');
    if (btn) btn.disabled = true;

    const url = '/api/attempts/' + this.attempt.id + '/items/' + questionId + '/audio';
    let blob;
    try {
      const res = await fetch(url, { credentials: 'same-origin' });
      if (!res.ok) {
        const msg = await res.json().catch(() => ({}));
        if (label) label.textContent = res.status === 429 ? 'No replays left' : (msg.error || 'Cannot play this');
        return;
      }
      if (label) label.textContent = 'Playing…';
      blob = await res.blob();
    } catch (e) {
      if (label) label.textContent = 'Connection lost';
      if (btn) btn.disabled = false;
      return;
    }

    const src = URL.createObjectURL(blob);
    const audio = new Audio(src);
    audio.addEventListener('ended', () => {
      URL.revokeObjectURL(src);
      if (label) label.textContent = 'Finished.';
      if (btn) btn.disabled = false;
      /* On a two-page part the tone sounds the moment the stimulus ends — that
         is exactly what the sheet's beep column describes for G, H and J. */
      if (auto && this.stage === 'stimulus' && !this.part().readSeconds) {
        this.beep();
        this.toAnswer();
      }
    });
    audio.play().catch(() => {
      if (label) label.textContent = 'Press play — the browser blocked autoplay.';
      if (btn) btn.disabled = false;
    });
  },

  /* ---------------------------------------------------------------- recording */

  async toggleRecord(questionId, btn) {
    const state = PREP.qs('[data-rec-state="' + questionId + '"]');

    if (this._rec && this._rec.questionId === questionId) { this._rec.recorder.stop(); return; }
    if (this._rec) { PrepChrome.toast('Already recording another item', 'error'); return; }
    if (!navigator.mediaDevices || !window.MediaRecorder) {
      if (state) state.textContent = 'This browser cannot record';
      return;
    }

    let stream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    } catch (e) {
      if (state) state.textContent = 'This page has not been given microphone access';
      return;
    }

    const chunks = [];
    const recorder = new MediaRecorder(stream);
    /* How long the candidate actually spoke. The browser is the only thing that
       knows this without decoding the file, and `articulationRate` — one of the
       quantities rubrics.js checks fluency against — cannot be computed without
       it. Wall clock rather than media duration, because webm from MediaRecorder
       often carries no duration header at all. */
    const startedAt = Date.now();
    this._rec = { questionId, recorder, stream };
    recorder.addEventListener('dataavailable', e => { if (e.data.size) chunks.push(e.data); });
    recorder.addEventListener('stop', async () => {
      stream.getTracks().forEach(t => t.stop());
      this._rec = null;
      const b = PREP.qs('[data-rec="' + questionId + '"]');
      if (b) { b.querySelector('span').textContent = 'Record'; b.classList.remove('btn-danger'); }
      if (state) state.textContent = 'Uploading…';
      const blob = new Blob(chunks, { type: recorder.mimeType || 'audio/webm' });
      const res = await fetch('/api/attempts/' + this.attempt.id + '/items/' + questionId + '/recording', {
        method: 'POST',
        credentials: 'same-origin',
        headers: {
          'Content-Type': blob.type || 'audio/webm',
          'X-CSRF-Token': PrepApi.csrf(),
          /* A hint, not a fact — the server clamps it. Nothing is scored on the
             number itself; it feeds a cross-check. */
          'X-Recording-Ms': String(Date.now() - startedAt)
        },
        body: blob
      }).catch(() => null);
      if (state) {
        if (res && res.ok) state.textContent = 'Recording saved';
        else {
          const msg = res ? await res.json().catch(() => ({})) : {};
          state.textContent = msg.error || 'Could not upload the recording';
        }
      }
    });
    recorder.start();
    btn.querySelector('span').textContent = 'Stop';
    btn.classList.add('btn-danger');
    if (state) state.textContent = 'Recording…';
  },

  /* ---------------------------------------------------------------- hand in */

  wireSubmitModal() {
    const modal = PREP.qs('#submit-modal');
    PREP.qsa('[data-close]', modal).forEach(b =>
      b.addEventListener('click', () => modal.classList.remove('show')));
    modal.addEventListener('click', e => { if (e.target === modal) modal.classList.remove('show'); });
    PREP.qs('#sm-go').addEventListener('click', () => this.submit());
  },

  askSubmit() {
    const total = this.attempt.parts.reduce((a, p) => a + p.items.length, 0);
    const answered = this.attempt.parts.reduce((a, p) =>
      a + p.items.filter(i => (i.answer && i.answer.trim()) || i.hasRecording).length, 0);
    PREP.qs('#sm-body').textContent = answered < total
      ? 'You answered ' + answered + '/' + total + ' items. Once handed in, nothing can be changed.'
      : 'You answered all ' + total + ' items. Once handed in, nothing can be changed.';
    PREP.qs('#submit-modal').classList.add('show');
  },

  async submit() {
    await this.flush();
    this.stopClocks();
    const r = await PrepApi.post('/api/attempts/' + this.attempt.id + '/submit');
    PREP.qs('#submit-modal').classList.remove('show');
    if (!r.ok) { PrepChrome.toast(PrepApi.err(r), 'error'); return; }
    this.showDone(r.data);
  }
};
