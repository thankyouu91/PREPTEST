/* ============================================================
   PrepRunner - the sitting screen.

   The rule: this screen holds NO rules of its own. The clock, the replay count
   and whether a write is still accepted are all decided by the server
   (server/exam-api.js); here we only draw what the server said and tell the
   candidate what is happening. So every save pulls fresh state back, and the
   local countdown is resynced from `secondsLeft` after each API call - drift on
   the candidate's machine cannot move the real deadline.
   ============================================================ */

const PrepRunner = {
  attempt: null,
  activeSection: null,
  _tick: null,
  _saveTimer: null,
  _dirty: new Map(),          // questionId -> answer not yet sent
  _rec: null,                 // the MediaRecorder currently running

  /* ---------- Lifecycle ---------- */

  async mount() {
    const params = new URLSearchParams(location.search);
    const wantTest = params.get('test');

    let res = await PrepApi.get('/api/attempts/current');
    let att = res.ok ? res.data.attempt : null;

    /* Arriving to sit test B while test A is unfinished: the server allows one
       open attempt, so silently attaching to A means they press "start" on B
       and get A with no idea why. Say so, and let them choose. */
    if (att && wantTest && att.testId !== wantTest) {
      return this.showBusy(att);
    }

    /* Arrived from a specific test's "Start the test" button: open a new attempt. */
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

    /* Open whichever part is already running, else the first part not yet finished. */
    const open = att.parts.find(p => p.open) ||
                 att.parts.find(p => !p.closedAt) || att.parts[0];
    if (open) this.showPart(open.sectionId, false);

    PREP.qs('#ex-submit').addEventListener('click', () => this.askSubmit());
    this.wireSubmitModal();

    /* Flush on leaving: closing the tab mid-answer must not lose what was just typed. */
    addEventListener('visibilitychange', () => { if (document.hidden) this.flush(); });
    addEventListener('pagehide', () => this.flush());
  },

  showNone(err) {
    PREP.qs('#loading').setAttribute('hidden', '');
    PREP.qs('#none').removeAttribute('hidden');
    const why = PREP.qs('#none-why');
    const alt = PREP.qs('#none-alt');
    /* When the server says why it refused, show exactly that reason and a way
       forward - "no tests" with no reason is a useless answer. */
    if (err.need === 'plan') {
      why.textContent = err.error || 'You have no plan in force.';
      alt.href = '/prep/mua-code/'; alt.textContent = 'See the price list';
    } else if (err.need === 'attempts') {
      why.textContent = err.error || 'You have used every sitting your plan allows.';
      alt.href = '/prep/mua-code/?locked=attempts'; alt.textContent = 'Move up a plan';
    } else if (err.error) {
      why.textContent = err.error;
    }
  },

  /** Another test is unfinished: say so, and offer both ways out. */
  showBusy(att) {
    this.attempt = att;
    PREP.qs('#loading').setAttribute('hidden', '');
    PREP.qs('#none').removeAttribute('hidden');
    PREP.qs('#none').querySelector('h2').textContent = 'You have another test unfinished';
    PREP.qs('#none-why').textContent =
      '"' + att.testTitle + '" has not been handed in. Only one test can be open at a time, so carry on with it or hand it in first.';
    const alt = PREP.qs('#none-alt');
    alt.href = '/prep/lam-bai/';
    alt.textContent = 'Carry on with it';
    /* The primary button becomes "hand in the unfinished one" - that is the
    action that clears the way to the new test, and without it they are
    stuck with nothing to press. */
    const main = PREP.qs('#none a.btn-primary');
    if (main) {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'btn btn-primary btn-md w-full';
      btn.textContent = 'Hand in the unfinished test';
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
      ? 'You answered ' + summary.answered + '/' + summary.total + ' items.'
      : 'This test was handed in earlier.';
    /* Once it is handed in the next thing wanted is the result, so the primary
       button goes straight there instead of dumping them in the library. */
    const link = PREP.qs('#done-result');
    if (link && this.attempt) link.href = '/prep/ket-qua/' + this.attempt.id + '/';
    this.stopClock();
  },

  /* ---------- The list of parts ---------- */

  renderParts() {
    PREP.qs('#ex-parts').innerHTML = this.attempt.parts.map(p => {
      const done = !!p.closedAt;
      const label = (p.part ? 'Part ' + p.part : p.name);
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

  /* ---------- A single part ---------- */

  async showPart(sectionId, skipFlush) {
    if (!skipFlush) await this.flush();
    /* Leaving a paced part abandons its per-item clocks. Coming back starts the
       part again at the first unanswered item, which is the same thing a reload
       does and for the same reason: those clocks only ever lived in this tab. */
    if (this.pace && this.pace.sectionId !== sectionId) this.stopPace();
    this.activeSection = sectionId;
    const p = this.part(sectionId);
    if (!p) return;
    this.renderParts();

    const box = PREP.qs('#ex-part');
    const started = !!p.startedAt;
    const closed = !!p.closedAt || (p.secondsLeft === 0 && p.endsAt);

    /* A part with nothing in it. The blueprint keeps all ten parts on the paper
       even when the bank cannot fill one yet, because a paper missing Part E is
       a different exam from one whose Part E is still being written — and the
       honest version of the second is to say so here. Offering "Start this
       part" would start an unpausable clock over an empty screen. */
    if (!p.items.length) {
      box.innerHTML =
        '<div class="card p-8 text-center">' +
          '<h3 class="font-extrabold text-xl tracking-tight">' + PREP.esc(p.name) + '</h3>' +
          '<p class="text-muted text-[15px] mt-2 max-w-[46ch] mx-auto">' +
            'This part has no questions yet, so there is nothing to sit. It is on the paper ' +
            'because the exam has it - your result will not count it.' +
          '</p>' +
        '</div>';
      this.stopClock();
      PREP.qs('#ex-clock').setAttribute('hidden', '');
      return;
    }

    /* Not in the part yet: show a waiting screen with a start button. Pressing it
    starts a clock that cannot be paused, so say so first rather than
    letting someone trip into it. */
    if (!started) {
      box.innerHTML =
        '<div class="card p-8 text-center">' +
          '<h3 class="font-extrabold text-xl tracking-tight">' + PREP.esc(p.name) + '</h3>' +
          '<p class="text-muted text-[15px] mt-2">' + PREP.esc(p.type) + ' · ' + p.items.length + ' items' +
            (p.minutes ? ' · ' + p.minutes + ' min' : ' · no time limit') + '</p>' +
          /* The rules the exam states for this part, said before the clock starts
             rather than discovered inside it. */
          (p.minWords
            ? '<p class="text-[14px] font-semibold mt-3">Write at least <b>' + p.minWords + '</b> '
              + '<span>words.</span></p>' : '') +
          (p.plays === 1 && p.items.some(x => x.hasAudio)
            ? '<p class="text-[14px] font-semibold mt-1">Each recording plays once.</p>' : '') +
          /* Said here because it cannot be discovered later: by the time a
             candidate learns the passage goes away, it has gone away. */
          (p.pacing
            ? '<p class="text-[14px] font-semibold mt-1">One passage at a time. You get <b>' +
              p.pacing.read + '</b> <span>seconds to read it, then it disappears and you have</span> <b>' +
              p.pacing.answer + '</b> <span>seconds to rewrite it.</span></p>' : '') +
          (p.minutes
            ? '<p class="text-[14px] font-semibold text-muted mt-4 max-w-[44ch] mx-auto">Pressing start begins the clock. When it runs out this part closes, and it cannot be reopened.</p>'
            : '') +
          '<button type="button" id="ex-enter" class="btn btn-primary btn-lg mt-6">Start this part</button>' +
        '</div>';
      PREP.qs('#ex-enter').addEventListener('click', () => this.enter(sectionId));
      this.stopClock();
      PREP.qs('#ex-clock').setAttribute('hidden', '');
      return;
    }

    /* A part the exam paces item by item is a different screen: one item, one
       phase, and no way to look ahead. Only while the part is OPEN - once it is
       finished the whole thing is shown at once, because then it is a record of
       what happened rather than an exam. */
    if (p.pacing && !closed) return this.showPaced(p);
    this.stopPace();

    box.innerHTML =
      '<div class="flex flex-wrap items-baseline gap-x-3 gap-y-1 mb-4">' +
        '<h3 class="font-extrabold text-xl tracking-tight">' + PREP.esc(p.name) + '</h3>' +
        '<span class="text-[13.5px] font-semibold text-muted">' + p.items.length + ' items</span>' +
        (closed ? '<span class="badge badge-muted">Finished</span>' : '') +
      '</div>' +
      '<div class="grid gap-4">' + p.items.map((it, i) => this.itemHTML(p, it, i)).join('') + '</div>' +
      (closed ? '' :
        '<button type="button" id="ex-close" class="btn btn-ghost btn-md mt-6">Finish this part</button>');

    this.wireItems(p, closed);
    if (!closed) {
      const btn = PREP.qs('#ex-close');
      if (btn) btn.addEventListener('click', () => this.closePart(sectionId));
    }
    this.startClock(p);
  },

  /* ---------- Parts the exam paces item by item ---------- */

  /**
   * Part B, as the exam actually runs it.
   *
   *   "You will read a passage on the screen. The passage will disappear after
   *    30 seconds. After the passage disappears, you need to rewrite the meaning
   *    of it in your own words. You have 90 seconds to rewrite the passage."
   *
   * Before this, all three passages were rendered at once and stayed on screen
   * for the whole six minutes. Everything about that was defensible except the
   * one thing the part measures: nobody had to remember anything. Somebody
   * practising on it would have practised copying, and found that out on the day.
   *
   * ## What this does and does not guarantee
   *
   * The passage is REMOVED from the page, not hidden with a class - a hidden
   * element is still there to be read. What it is not is tamper-proof: the text
   * arrived in the sitting payload, and somebody determined enough to open the
   * network tab can still read it. The real test runs in a locked-down browser
   * and this one runs in yours. The honest description is that this makes the
   * practice faithful, not that it makes cheating impossible - and a candidate
   * cheating themselves in practice has only bought a worse result later.
   *
   * The part's own clock, on the server, still decides when the part ends. This
   * paces what happens inside that window.
   */
  pace: null,

  stopPace() {
    if (this.pace && this.pace.timer) clearInterval(this.pace.timer);
    this.pace = null;
  },

  /**
   * Which item to start on after a reload.
   *
   * The phase timers live in this tab and nowhere else, so a refresh cannot be
   * made to resume mid-passage. Starting at the first item with nothing written
   * is the reading that costs a candidate least: it never re-shows a passage
   * somebody has already answered from, and it never skips one they have not.
   */
  firstUnanswered(p) {
    const i = p.items.findIndex(it => !String(it.answer || '').trim());
    return i < 0 ? p.items.length - 1 : i;
  },

  showPaced(p) {
    if (!this.pace || this.pace.sectionId !== p.sectionId) {
      this.stopPace();
      this.pace = { sectionId: p.sectionId, index: this.firstUnanswered(p), phase: 'read', endsAt: 0, timer: null };
    }
    this.renderPaced(p);
  },

  renderPaced(p) {
    const st = this.pace;
    const it = p.items[st.index];
    if (!it) { this.stopPace(); this.closePart(p.sectionId); return; }

    const seconds = st.phase === 'read' ? p.pacing.read : p.pacing.answer;
    if (!st.endsAt) st.endsAt = Date.now() + seconds * 1000;

    const reading = st.phase === 'read';
    PREP.qs('#ex-part').innerHTML =
      '<div class="flex flex-wrap items-baseline gap-x-3 gap-y-1 mb-4">' +
        '<h3 class="font-extrabold text-xl tracking-tight">' + PREP.esc(p.name) + '</h3>' +
        '<span class="text-[13.5px] font-semibold text-muted">' +
          'Passage ' + (st.index + 1) + ' of ' + p.items.length + '</span>' +
      '</div>' +
      '<article class="card p-5">' +
        '<p class="flex flex-wrap items-center gap-2.5 text-[13.5px] font-semibold">' +
          '<span class="badge ' + (reading ? 'badge-ok' : 'badge-muted') + '">' +
            (reading ? 'Read and remember' : 'Write it in your own words') + '</span>' +
          '<span class="ms-auto tabular-nums" data-pace-left>' + seconds + 's</span>' +
        '</p>' +
        (reading
          ? '<p class="text-[16px] leading-relaxed mt-4">' + PREP.esc(it.prompt) + '</p>' +
            '<p class="text-[13px] text-muted font-semibold mt-4">' +
              'The passage disappears when the time runs out. You cannot get it back.</p>'
          : /* The prompt is deliberately absent from here. */
            '<p class="text-[13px] text-muted font-semibold mt-1">' +
              'Include all the details you can - this is not a summary.</p>' +
            '<textarea class="input mt-3" rows="10" data-answer="' + it.questionId + '" ' +
              'aria-label="Rewrite the passage"></textarea>') +
      '</article>' +
      '<button type="button" id="ex-close" class="btn btn-ghost btn-md mt-6">Finish this part</button>';

    const close = PREP.qs('#ex-close');
    if (close) close.addEventListener('click', () => { this.stopPace(); this.closePart(p.sectionId); });
    if (!reading) {
      this.wireItems(p, false);
      const ta = PREP.qs('[data-answer="' + it.questionId + '"]');
      if (ta) ta.focus();
    }

    if (st.timer) clearInterval(st.timer);
    st.timer = setInterval(() => this.paceTick(p), 250);
    this.paceTick(p);
    this.startClock(p);
  },

  /**
   * One tick of the per-item clock.
   *
   * Reading runs out into writing; writing runs out into the next passage. The
   * answer is flushed BEFORE the screen changes - what somebody typed in the
   * last second of a 90-second window is the part of their answer they were
   * most rushed over, and losing it to a re-render would be the platform's
   * fault rather than theirs.
   */
  paceTick(p) {
    const st = this.pace;
    if (!st) return;
    const left = Math.max(0, Math.ceil((st.endsAt - Date.now()) / 1000));
    const el = PREP.qs('[data-pace-left]');
    if (el) el.textContent = left + 's';
    if (left > 0) return;

    clearInterval(st.timer);
    st.timer = null;
    if (st.phase === 'read') {
      st.phase = 'answer';
      st.endsAt = 0;
      this.renderPaced(p);
      return;
    }
    this.flush().then(() => {
      if (!this.pace) return;
      this.pace.index += 1;
      this.pace.phase = 'read';
      this.pace.endsAt = 0;
      if (this.pace.index >= p.items.length) { this.stopPace(); this.closePart(p.sectionId); return; }
      this.renderPaced(p);
    });
  },

  /**
   * What the play button's caption should say.
   *
   * "1 replays left" was both ungrammatical and wrong. On a part that plays once
   * - which on VPET is every audio part - the single play remaining is the FIRST
   * one, and calling it a replay tells the candidate they have already had their
   * turn. What they need to know before clicking is that there is no second
   * chance.
   */
  playLabel(p, left) {
    if (left <= 0) return 'Already played';
    if (p && p.plays === 1) return 'Plays once - no replay';
    return left === 1 ? '1 replay left' : left + ' replays left';
  },

  /** Words written, against the floor the exam sets. */
  countWords(text) {
    const t = String(text || '').trim();
    return t ? t.split(/\s+/).length : 0;
  },

  /* The number and the words around it are separate nodes on purpose. i18n.js
     translates whole text nodes against a dictionary, so "12 of 100 words" can
     never match a key while "of 100 words" can. */
  wordCountSuffix(text, min) {
    return this.countWords(text) >= min ? 'words - the minimum is met' : 'of ' + min + ' words';
  },

  wordCountHTML(qid, text, min) {
    return '<p class="text-[13px] font-semibold mt-2" role="status">' +
      '<b data-wc="' + qid + '">' + this.countWords(text) + '</b> ' +
      '<span data-wc-note="' + qid + '">' + PREP.esc(this.wordCountSuffix(text, min)) + '</span>' +
    '</p>';
  },

  /** One item: the prompt, somewhere to answer, and a play / record button if needed */
  itemHTML(p, it, i) {
    const id = 'q' + it.questionId;
    let body;
    if (it.type === 'mcq') {
      body = '<div class="grid gap-2 mt-3">' + it.options.map((o, k) =>
        '<label class="flex items-start gap-2.5 rounded-xl border border-line px-3.5 py-2.5 cursor-pointer">' +
          '<input type="radio" name="' + id + '" value="' + PREP.esc(o) + '" ' +
            (o === it.answer ? 'checked ' : '') +
            'class="w-4 h-4 mt-0.5 accent-[color:var(--color-accent)] shrink-0" ' +
            'data-answer="' + it.questionId + '" aria-label="Option ' + (k + 1) + '">' +
          '<span class="text-[14.5px]">' + PREP.esc(o) + '</span>' +
        '</label>').join('') + '</div>';
    } else if (it.type === 'speaking') {
      body =
        '<div class="flex flex-wrap items-center gap-2.5 mt-3">' +
          '<button type="button" class="btn btn-soft btn-md" data-rec="' + it.questionId + '">' +
            PREP.icon('mic', 'w-4 h-4') + '<span>Record</span></button>' +
          '<span class="text-[13px] font-semibold text-muted" data-rec-state="' + it.questionId + '">' +
            (it.hasRecording ? 'Recording saved' : 'Not recorded') + '</span>' +
        '</div>';
    } else if (it.type === 'essay') {
      /* Part D is nine minutes and at least a hundred words; six rows made that
         look like a comment box. The floor comes from the blueprint, so a part
         without one simply gets no counter rather than an invented target. */
      const min = p.minWords || 0;
      body = '<textarea class="input mt-3" rows="' + (min ? 14 : 8) + '" data-answer="' + it.questionId + '" ' +
        (min ? 'data-min-words="' + min + '" ' : '') +
        'aria-label="Your writing">' + PREP.esc(it.answer) + '</textarea>' +
        (min ? this.wordCountHTML(it.questionId, it.answer, min) : '');
    } else {
      body = '<input class="input mt-3" data-answer="' + it.questionId + '" ' +
        'value="' + PREP.esc(it.answer) + '" aria-label="Your answer">';
    }

    const audio = it.hasAudio
      ? '<div class="flex flex-wrap items-center gap-2.5 mt-3">' +
          '<button type="button" class="btn btn-soft btn-sm" data-play="' + it.questionId + '"' +
            (it.replaysLeft <= 0 ? ' disabled' : '') + '>' +
            PREP.icon('play', 'w-4 h-4') + '<span>Nghe</span></button>' +
          '<span class="text-[13px] font-semibold text-muted" data-plays="' + it.questionId + '">' +
            PREP.esc(this.playLabel(p, it.replaysLeft)) + '</span>' +
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
        const min = +(el.getAttribute('data-min-words') || 0);
        if (min) {
          const n = PREP.qs('[data-wc="' + qid + '"]');
          const note = PREP.qs('[data-wc-note="' + qid + '"]');
          const met = this.countWords(el.value) >= min;
          if (n) n.textContent = this.countWords(el.value);
          if (note) note.textContent = this.wordCountSuffix(el.value, min);
          if (n && n.parentElement) {
            n.parentElement.classList.toggle('text-muted', !met);
            n.parentElement.classList.toggle('text-accent-strong', met);
          }
        }
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

  /* ---------- The clock ---------- */

  startClock(p) {
    this.stopClock();
    const box = PREP.qs('#ex-clock');
    if (!p.endsAt) { box.setAttribute('hidden', ''); return; }
    box.removeAttribute('hidden');
    let left = p.secondsLeft == null ? 0 : p.secondsLeft;
    const paint = () => {
      const m = Math.floor(left / 60), s = left % 60;
      PREP.qs('#ex-clock-text').textContent = m + ':' + String(s).padStart(2, '0');
      /* Change colour under a minute - the one moment the clock should draw the eye. */
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
        PrepChrome.toast('Time is up for this part', 'error');
        this.showPart(p.sectionId, true);
      }
    }, 1000);
  },

  stopClock() { if (this._tick) { clearInterval(this._tick); this._tick = null; } },

  /* ---------- Saving ---------- */

  saveSoon() {
    PREP.qs('#ex-saved').textContent = 'Saving…';
    clearTimeout(this._saveTimer);
    this._saveTimer = setTimeout(() => this.flush(), 1200);
  },

  /** Send every pending answer. The server reports which it kept and which it did not. */
  async flush() {
    clearTimeout(this._saveTimer);
    if (!this._dirty.size || !this.attempt) return;
    const answers = [...this._dirty].map(([questionId, answer]) => ({ questionId, answer }));
    this._dirty.clear();
    const r = await PrepApi.patch('/api/attempts/' + this.attempt.id + '/answers', { answers });
    const el = PREP.qs('#ex-saved');
    if (!r.ok) { el.textContent = 'Not saved'; return; }
    const rejected = (r.data.rejected || []).length;
    /* Say so when an answer was refused: silence here means someone believes they
    answered while the server kept nothing at all. */
    el.textContent = rejected
      ? rejected + ' answers were too late to save (the part had closed)'
      : 'Saved';
    if (rejected) await this.refresh();
  },

  /** Pull the real state back from the server (clock, replays, stored answers) */
  async refresh() {
    const r = await PrepApi.get('/api/attempts/' + this.attempt.id);
    if (r.ok && r.data.attempt) this.attempt = r.data.attempt;
    this.renderParts();
  },

  /* ---------- Nghe ---------- */

  async play(questionId) {
    const btn = PREP.qs('[data-play="' + questionId + '"]');
    const label = PREP.qs('[data-plays="' + questionId + '"]');
    /* Which part this item belongs to, so the caption can say "plays once"
       rather than counting replays that do not exist. */
    const p = this.part(this.activeSection);
    if (!btn || btn.disabled) return;
    btn.disabled = true;

    /* Fetch first to learn whether the server will allow the replay: assigning
       straight to <audio src> turns a 429 into a bare "cannot play". */
    const url = '/api/attempts/' + this.attempt.id + '/items/' + questionId + '/audio';
    let blob;
    /* Read off the server's header, not off the caption. It used to be recovered
       with label.textContent.match(/\d+/) — so a caption without a digit in it,
       which is every caption on a part that plays once, silently became zero. */
    let left = 0;
    try {
      const res = await fetch(url, { credentials: 'same-origin' });
      if (!res.ok) {
        const msg = await res.json().catch(() => ({}));
        label.textContent = msg.error || 'Cannot play this';
        if (res.status === 429) label.textContent = 'Already played';
        return;
      }
      left = +(res.headers.get('X-Replays-Left') || 0);
      label.textContent = this.playLabel(p, left);
      blob = await res.blob();
    } catch (e) {
      label.textContent = 'Connection lost';
      btn.disabled = false;
      return;
    }

    const src = URL.createObjectURL(blob);
    const audio = new Audio(src);
    audio.addEventListener('ended', () => {
      URL.revokeObjectURL(src);
      btn.disabled = left <= 0;
    });
    audio.play().catch(() => { label.textContent = 'The browser blocked autoplay'; btn.disabled = false; });
  },

  /* ---------- Recording ---------- */

  async toggleRecord(questionId, btn) {
    const state = PREP.qs('[data-rec-state="' + questionId + '"]');

    if (this._rec && this._rec.questionId === questionId) {
      this._rec.recorder.stop();
      return;
    }
    if (this._rec) { PrepChrome.toast('Already recording another item', 'error'); return; }
    if (!navigator.mediaDevices || !window.MediaRecorder) {
      state.textContent = 'This browser cannot record';
      return;
    }

    let stream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    } catch (e) {
      /* Refusing microphone access is the candidate's choice, not a system fault
         - say what is needed instead of reporting a breakage. */
      state.textContent = 'This page has not been given microphone access';
      return;
    }

    const chunks = [];
    const recorder = new MediaRecorder(stream);
    this._rec = { questionId, recorder, stream };
    recorder.addEventListener('dataavailable', e => { if (e.data.size) chunks.push(e.data); });
    recorder.addEventListener('stop', async () => {
      stream.getTracks().forEach(t => t.stop());
      this._rec = null;
      btn.querySelector('span').textContent = 'Record';
      btn.classList.remove('btn-danger');
      state.textContent = 'Uploading…';
      const blob = new Blob(chunks, { type: recorder.mimeType || 'audio/webm' });
      const res = await fetch('/api/attempts/' + this.attempt.id + '/items/' + questionId + '/recording', {
        method: 'POST',
        credentials: 'same-origin',
        headers: { 'Content-Type': blob.type || 'audio/webm', 'X-CSRF-Token': PrepApi.csrf() },
        body: blob
      }).catch(() => null);
      if (res && res.ok) { state.textContent = 'Recording saved'; }
      else {
        const msg = res ? await res.json().catch(() => ({})) : {};
        state.textContent = msg.error || 'Could not upload the recording';
      }
    });
    recorder.start();
    btn.querySelector('span').textContent = 'Stop';
    btn.classList.add('btn-danger');
    state.textContent = 'Recording…';
  },

  /* ---------- Handing in ---------- */

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
      ? 'You answered ' + answered + '/' + total + ' items. Once handed in, nothing can be changed.'
      : 'You answered all ' + total + ' items. Once handed in, nothing can be changed.';
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
