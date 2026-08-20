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
             candidate learns the passage goes away, it has gone away - and by
             the time they learn the microphone opened by itself, it has been
             open for several of their fifteen seconds. */
          (p.pacing && p.pacing.read
            ? '<p class="text-[14px] font-semibold mt-1">One passage at a time. You get <b>' +
              p.pacing.read + '</b> <span>seconds to read it, then it disappears and you have</span> <b>' +
              p.pacing.answer + '</b> <span>seconds to rewrite it.</span></p>' : '') +
          (p.pacing && p.pacing.spoken
            ? '<p class="text-[14px] font-semibold mt-1">One item at a time. ' +
              (p.pacing.think
                ? '<b>' + p.pacing.think + '</b> <span>seconds to think, a beep, then</span> '
                : '<span>You get</span> ') +
              '<b>' + p.pacing.answer + '</b> <span>seconds to speak. The microphone opens by ' +
              'itself and your answer is saved when the time runs out.</span></p>' +
              (p.pacing.startWithin
                ? '<p class="text-[14px] font-semibold mt-1">Start speaking within <b>' +
                  p.pacing.startWithin + '</b> <span>seconds.</span></p>' : '')
            : '') +
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
   * The parts the exam runs one item at a time.
   *
   * Two shapes, for two reasons.
   *
   * Part B takes its stimulus away:
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
   * Parts H, I and J are spoken, and a spoken answer has a beginning and an end
   * that somebody has to be told about. Fifteen seconds to repeat a sentence,
   * sixty to answer a situation, thirty to retell a story - none of which a
   * candidate can see on a clock that only counts the whole part. So each item
   * gets its own countdown, the microphone opens by itself, and the answer is
   * saved when the time runs out rather than when somebody remembers to press
   * stop.
   *
   * ## What this does and does not guarantee
   *
   * The Part B passage is REMOVED from the page, not hidden with a class - a
   * hidden element is still there to be read. What it is not is tamper-proof:
   * the text arrived in the sitting payload, and somebody determined enough to
   * open the network tab can still read it. The real test runs in a locked-down
   * browser and this one runs in yours. The honest description is that this
   * makes the practice faithful, not that it makes cheating impossible - and a
   * candidate cheating themselves in practice has only bought a worse result
   * later.
   *
   * "Start speaking within 6 seconds, or the test will move on" is SHOWN, not
   * enforced. Enforcing it means deciding when somebody has started speaking,
   * and a voice-activity detector that is wrong cuts a candidate off mid-answer
   * - a worse failure than the one it prevents. The countdown is there and the
   * rule is stated; the platform does not pretend to hear.
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
   * A spoken part counts a saved recording as an answer, for the same reason.
   */
  firstUnanswered(p) {
    const done = it => String(it.answer || '').trim() || it.hasRecording;
    const i = p.items.findIndex(it => !done(it));
    return i < 0 ? p.items.length - 1 : i;
  },

  /** The phase an item opens in: read it, hear it, think about it, or answer. */
  firstPhase(p, it) {
    if (p.pacing.read) return 'read';
    if (it && it.hasAudio) return 'listen';
    if (p.pacing.think) return 'think';
    return 'answer';
  },

  /** What comes after `phase`, or null when the item is over. */
  nextPhase(p, it, phase) {
    if (phase === 'read') return 'answer';
    if (phase === 'listen') return p.pacing.think ? 'think' : 'answer';
    if (phase === 'think') return 'answer';
    return null;
  },

  /** How many seconds this phase gets. */
  phaseSeconds(p, phase) {
    if (phase === 'read') return p.pacing.read;
    if (phase === 'think') return p.pacing.think;
    if (phase === 'listen') return 0;      /* as long as the recording lasts */
    return p.pacing.answer;
  },

  /**
   * The beep.
   *
   *   Part I  "After the beep you have 60 seconds to respond."
   *   Part J  "After 30 seconds you will hear another beep and your answer will
   *            be saved."
   *
   * Made rather than fetched: an oscillator is four lines, and an audio file
   * would be one more asset to ship, cache and get wrong on a slow connection at
   * the exact moment it is needed. Wrapped because a browser that refuses to
   * make sound before the page is interacted with must not take the exam down
   * with it - a missing beep is a smaller failure than a missing part.
   */
  beep(hz) {
    try {
      const Ctx = window.AudioContext || window.webkitAudioContext;
      if (!Ctx) return;
      this._audio = this._audio || new Ctx();
      const o = this._audio.createOscillator();
      const g = this._audio.createGain();
      o.frequency.value = hz || 880;
      g.gain.value = 0.08;
      o.connect(g); g.connect(this._audio.destination);
      o.start();
      o.stop(this._audio.currentTime + 0.18);
    } catch (e) { /* no sound is not a reason to stop the exam */ }
  },

  showPaced(p) {
    if (!this.pace || this.pace.sectionId !== p.sectionId) {
      this.stopPace();
      const index = this.firstUnanswered(p);
      this.pace = {
        sectionId: p.sectionId, index,
        phase: this.firstPhase(p, p.items[index]),
        endsAt: 0, timer: null
      };
    }
    this.renderPaced(p);
  },

  renderPaced(p) {
    const st = this.pace;
    const it = p.items[st.index];
    if (!it) { this.stopPace(); this.closePart(p.sectionId); return; }

    const seconds = this.phaseSeconds(p, st.phase);
    if (!st.endsAt && seconds) st.endsAt = Date.now() + seconds * 1000;

    const noun = p.pacing.read ? 'Passage' : 'Item';
    PREP.qs('#ex-part').innerHTML =
      '<div class="flex flex-wrap items-baseline gap-x-3 gap-y-1 mb-4">' +
        '<h3 class="font-extrabold text-xl tracking-tight">' + PREP.esc(p.name) + '</h3>' +
        '<span class="text-[13.5px] font-semibold text-muted">' +
          noun + ' ' + (st.index + 1) + ' of ' + p.items.length + '</span>' +
      '</div>' +
      '<article class="card p-5">' +
        '<p class="flex flex-wrap items-center gap-2.5 text-[13.5px] font-semibold">' +
          '<span class="badge ' + (st.phase === 'answer' ? 'badge-muted' : 'badge-ok') + '">' +
            this.phaseLabel(p, st.phase) + '</span>' +
          (seconds ? '<span class="ms-auto tabular-nums" data-pace-left>' + seconds + 's</span>' : '') +
        '</p>' +
        this.phaseBody(p, it, st.phase) +
      '</article>' +
      '<button type="button" id="ex-close" class="btn btn-ghost btn-md mt-6">Finish this part</button>';

    const close = PREP.qs('#ex-close');
    if (close) close.addEventListener('click', () => { this.stopPace(); this.closePart(p.sectionId); });
    /* Before any phase returns early. The part clock is the one a candidate
       checks to know how much of the whole thing is left, and a listening phase
       that stopped painting it would look like a stopped exam. */
    this.startClock(p);

    if (st.phase === 'answer' && !p.pacing.spoken) {
      this.wireItems(p, false);
      const ta = PREP.qs('[data-answer="' + it.questionId + '"]');
      if (ta) ta.focus();
    }

    /* Hearing it is a phase of its own, and it ends when the recording does
       rather than after a number of seconds. Started here, not on a click:
       "You will hear one sentence at a time" is not an invitation to press
       play. */
    if (st.phase === 'listen') {
      this.playPaced(p, it);
      return;
    }

    /* The microphone opens by itself, because the exam does not ask twice. The
       beep is what tells the candidate the window has started - Part I says so
       explicitly, and Part H is the same shape without the sentence. */
    if (st.phase === 'answer' && p.pacing.spoken) {
      this.beep(880);
      this.startPacedRecording(it);
    }

    if (st.timer) clearInterval(st.timer);
    st.timer = setInterval(() => this.paceTick(p), 250);
    this.paceTick(p);
  },

  phaseLabel(p, phase) {
    if (phase === 'read') return 'Read and remember';
    if (phase === 'listen') return 'Listen';
    if (phase === 'think') return 'Think about your answer';
    if (p.pacing.spoken) return 'Speak now';
    return 'Write it in your own words';
  },

  phaseBody(p, it, phase) {
    if (phase === 'read') {
      return '<p class="text-[16px] leading-relaxed mt-4">' + PREP.esc(it.prompt) + '</p>' +
        '<p class="text-[13px] text-muted font-semibold mt-4">' +
          'The passage disappears when the time runs out. You cannot get it back.</p>';
    }
    if (phase === 'listen') {
      return '<p class="text-[15px] leading-relaxed mt-4">' + PREP.esc(it.prompt) + '</p>' +
        '<p class="text-[13px] text-muted font-semibold mt-3">Playing once. There is no replay.</p>';
    }
    if (phase === 'think') {
      return '<p class="text-[15px] leading-relaxed mt-4">' + PREP.esc(it.prompt) + '</p>' +
        '<p class="text-[13px] text-muted font-semibold mt-3">' +
          'You will hear a beep, and then your time to answer begins.</p>';
    }
    if (p.pacing.spoken) {
      /* The prompt stays up for a spoken answer. Part B hides its passage because
         remembering it IS the task; nothing about repeating a sentence or
         retelling a story is helped by taking the question away. */
      return '<p class="text-[15px] leading-relaxed mt-4">' + PREP.esc(it.prompt) + '</p>' +
        '<p class="flex flex-wrap items-center gap-2.5 mt-4">' +
          '<span class="badge badge-danger" data-rec-live>Recording</span>' +
          '<span class="text-[13px] font-semibold text-muted" data-rec-state="' + it.questionId + '">' +
            'The microphone is open</span>' +
        '</p>' +
        (p.pacing.startWithin
          ? '<p class="text-[13px] text-muted font-semibold mt-3">Start speaking within <b>' +
            p.pacing.startWithin + '</b> <span>seconds. Your answer is saved when the time runs out.</span></p>'
          : '<p class="text-[13px] text-muted font-semibold mt-3">' +
            'Your answer is saved when the time runs out.</p>');
    }
    /* The prompt is deliberately absent here: this is Part B's writing phase. */
    return '<p class="text-[13px] text-muted font-semibold mt-1">' +
        'Include all the details you can - this is not a summary.</p>' +
      '<textarea class="input mt-3" rows="10" data-answer="' + it.questionId + '" ' +
        'aria-label="Rewrite the passage"></textarea>';
  },

  /**
   * Play this item's recording, and move on when it ends.
   *
   * No button and no clock: the phase lasts exactly as long as the audio. An
   * error - a missing file, a store that will not answer - moves on rather than
   * stopping, because a candidate stuck on a silent screen with a part clock
   * running is the worst of the available outcomes.
   */
  playPaced(p, it) {
    const done = () => {
      if (!this.pace || this.pace.phase !== 'listen') return;
      this.pace.phase = this.nextPhase(p, it, 'listen');
      this.pace.endsAt = 0;
      this.renderPaced(p);
    };
    const url = '/api/attempts/' + this.attempt.id + '/items/' + it.questionId + '/audio';
    const audio = new Audio(url);
    audio.addEventListener('ended', done);
    audio.addEventListener('error', done);
    audio.play().catch(() => done());
  },

  /**
   * Open the microphone for this item, with no button pressed.
   *
   * Reuses toggleRecord so there is one recorder, one upload path and one set of
   * failure messages. It expects a button to relabel; a spoken phase has none,
   * so it is handed a detached one. That is deliberately cheap - the alternative
   * is a second copy of the recording code, and two recorders is how a platform
   * ends up uploading somebody's answer twice.
   */
  startPacedRecording(it, attempt) {
    /* The previous item's recorder clears itself on its `stop` event, which is
       asynchronous. Usually the upload in between is long enough; when it is
       not, toggleRecord sees a recorder still in flight and refuses with
       "Already recording another item" - and the candidate's window opens with
       a dead microphone. So: wait for it, briefly, rather than assume. */
    const tries = attempt || 0;
    if (this._rec && tries < 20) {
      setTimeout(() => this.startPacedRecording(it, tries + 1), 50);
      return;
    }
    const ghost = document.createElement('button');
    ghost.innerHTML = '<span></span>';
    this.toggleRecord(it.questionId, ghost);
  },

  /**
   * One tick of the per-item clock.
   *
   * Reading runs out into writing; a spoken window runs out into the next item,
   * stopping the recorder on the way - which is what saves the answer, and is
   * why the beep comes before the upload rather than after it.
   *
   * The written answer is flushed BEFORE the screen changes. What somebody typed
   * in the last second of a 90-second window is the part they were most rushed
   * over, and losing it to a re-render would be the platform's fault rather than
   * theirs.
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

    const it = p.items[st.index];
    const next = this.nextPhase(p, it, st.phase);
    if (next) {
      st.phase = next;
      st.endsAt = 0;
      this.renderPaced(p);
      return;
    }

    /* The item is over. A recording in progress is stopped first: that is what
       uploads it. "After 30 seconds you will hear another beep and your answer
       will be saved" - the beep, then the saving. */
    if (p.pacing.spoken) {
      this.beep(660);
      if (this._rec) { try { this._rec.recorder.stop(); } catch (e) { /* already stopped */ } }
    }
    this.flush().then(() => {
      if (!this.pace) return;
      this.pace.index += 1;
      if (this.pace.index >= p.items.length) { this.stopPace(); this.closePart(p.sectionId); return; }
      this.pace.phase = this.firstPhase(p, p.items[this.pace.index]);
      this.pace.endsAt = 0;
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
