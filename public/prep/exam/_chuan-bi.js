/* ============================================================
   Before you begin — the three screens the specification puts in front of a
   sitting: the hardware check, the speaking tips, and the overview.

   ------------------------------------------------------------------
   WHY THIS IS NOT PART OF THE RUNNER

   The clock must not be running while somebody is adjusting their volume. The
   runner opens an attempt, and an attempt starts timing; so these screens live
   on their own page and only hand over once the candidate presses Start Test.

   ------------------------------------------------------------------
   WHAT THE CHECKS ACTUALLY MEASURE

   Each check does the real thing or says it did not. There is no green light
   here that is painted on a timer:

     headphones  plays a tone through WebAudio and asks the candidate to confirm.
                 A machine cannot hear its own output, so confirmation is the
                 only honest signal and the button says so.
     microphone  asks for the microphone, records, and reads the live level. It
                 goes green on sound actually arriving above the floor — not on
                 permission being granted, which is what a candidate with a muted
                 mic would otherwise sail through.
     room        reads the level across five seconds of requested silence and
                 compares the peak against the same floor.
     connection  times a real request to the server.

   The webcam row is shown because the specification lists it, and it is marked
   as not used rather than faked. Practice does not proctor, and a dot that went
   green without a camera ever opening would be a lie on a screen whose whole
   job is to tell a candidate the truth about their equipment.
   ============================================================ */
'use strict';

const PrepPrecheck = {
  need: ['audio', 'mic', 'room', 'net'],
  done: new Set(),

  mount() {
    this.paintOverview();

    PREP.qsa('[data-act]').forEach(btn =>
      btn.addEventListener('click', () => this.run(btn.getAttribute('data-act'), btn)));

    PREP.qs('#hw-next').addEventListener('click', () => this.show('tips'));
    PREP.qs('#tips-next').addEventListener('click', () => this.show('over'));
    PREP.qs('#over-start').addEventListener('click', () => this.start());

    this.gate();
  },

  /* ---------------------------------------------------------------- screens */
  show(which) {
    ['hw', 'tips', 'over'].forEach(k =>
      PREP.qs('#scr-' + k).hidden = (k !== which));
    window.scrollTo({ top: 0, behavior: 'smooth' });
  },

  /* ---------------------------------------------------------------- state */
  mark(key, ok, label) {
    const card = PREP.qs('[data-check="' + key + '"]');
    if (!card) return;
    const dot = card.querySelector('[data-dot]');
    const state = card.querySelector('[data-state]');
    dot.className = 'dot ' + (ok ? 'dot-ok' : 'dot-bad');
    state.textContent = label;
    state.className = 'text-[13px] font-semibold ' + (ok ? 'text-accent-strong' : 'text-danger-strong');
    if (ok) this.done.add(key); else this.done.delete(key);
    this.gate();
  },

  /* The button opens only when every measurable check is green. The count is
     spelt out beside it so a candidate who cannot continue knows what is left
     rather than staring at a dead button. */
  gate() {
    const left = this.need.filter(k => !this.done.has(k));
    PREP.qs('#hw-next').disabled = left.length > 0;
    PREP.qs('#hw-left').textContent = left.length
      ? left.length + (left.length === 1 ? ' check still to do' : ' checks still to do')
      : 'All checks passed.';
  },

  /* ---------------------------------------------------------------- checks */
  async run(kind, btn) {
    btn.disabled = true;
    try {
      if (kind === 'audio') await this.checkAudio();
      if (kind === 'mic') await this.checkMic();
      if (kind === 'room') await this.checkRoom();
      if (kind === 'net') await this.checkNet();
    } catch (e) {
      this.mark(kind, false, (e && e.message) || 'Could not check');
    }
    btn.disabled = false;
  },

  /* A short tone, then the candidate says whether they heard it. */
  async checkAudio() {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const osc = ctx.createOscillator(), gain = ctx.createGain();
    osc.frequency.value = 440;
    gain.gain.setValueAtTime(0.0001, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.2, ctx.currentTime + 0.05);
    gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 1.1);
    osc.connect(gain).connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 1.2);
    await new Promise(r => setTimeout(r, 1300));
    ctx.close();
    const heard = window.confirm('Did you hear the tone clearly?');
    this.mark('audio', heard, heard ? 'You heard it' : 'Not heard — check your headphones');
  },

  /* Permission is not the test; sound arriving is. */
  async checkMic() {
    const { peak } = await this.listen('mic', 4000);
    const ok = peak > 0.04;
    this.mark('mic', ok, ok
      ? 'Picking you up'
      : 'Nothing came through — is the microphone muted?');
  },

  async checkRoom() {
    const { peak } = await this.listen('room', 5000);
    const quiet = peak < 0.08;
    this.mark('room', quiet, quiet ? 'Quiet enough' : 'Too loud — try a quieter room');
  },

  /**
   * Open the microphone and watch the level for a while.
   *
   * Returns the peak, because a peak is what both callers need and they need it
   * in opposite directions: speech has to get above the floor, silence has to
   * stay below it. An average would hide a door slamming once, which is exactly
   * the thing that ruins a recording.
   */
  async listen(key, ms) {
    const card = PREP.qs('[data-check="' + key + '"]');
    const meter = card.querySelector('[data-meter]');
    const bar = card.querySelector('[data-bar]');
    meter.hidden = false;

    let stream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    } catch (e) {
      meter.hidden = true;
      throw new Error('Microphone permission was refused');
    }

    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const src = ctx.createMediaStreamSource(stream);
    const node = ctx.createAnalyser();
    node.fftSize = 1024;
    src.connect(node);
    const buf = new Uint8Array(node.fftSize);

    let peak = 0;
    const until = Date.now() + ms;
    while (Date.now() < until) {
      node.getByteTimeDomainData(buf);
      let hi = 0;
      for (let i = 0; i < buf.length; i++) hi = Math.max(hi, Math.abs(buf[i] - 128) / 128);
      peak = Math.max(peak, hi);
      bar.style.width = Math.min(100, Math.round(hi * 260)) + '%';
      await new Promise(r => setTimeout(r, 60));
    }

    stream.getTracks().forEach(t => t.stop());
    ctx.close();
    meter.hidden = true;
    return { peak };
  },

  async checkNet() {
    const t0 = performance.now();
    const res = await fetch('/healthz', { cache: 'no-store' });
    const ms = Math.round(performance.now() - t0);
    const ok = res.ok && ms < 2500;
    this.mark('net', ok, ok ? 'Steady (' + ms + ' ms)' : 'Slow or unreachable (' + ms + ' ms)');
  },

  /* ---------------------------------------------------------------- overview */
  /** Built from the blueprint the server publishes, never typed out here. */
  async paintOverview() {
    const sub = PREP.qs('#over-sub');
    const body = PREP.qs('#over-rows');
    try {
      const r = await PrepApi.get('/api/formats/vpet-full');
      const fmt = r.data && (r.data.format || r.data);
      const parts = (fmt && fmt.sections) || [];
      const total = parts.reduce((n, s) => n + (s.items || 0), 0);
      sub.textContent = 'The test has ' + parts.length + ' parts and ' + total +
        ' questions. Each part is explained again just before it begins.';
      body.innerHTML = parts.map((s, i) => {
        const letter = (/^Part ([A-J])/.exec(s.name) || [])[1] || '';
        const task = s.name.replace(/^Part [A-J]\s*-\s*/, '');
        return '<tr class="' + (i % 2 ? '' : 'bg-[color:var(--color-surface-2)]') + '">' +
          '<td class="py-2.5 px-4 font-extrabold">' + PREP.esc(letter) + '</td>' +
          '<td class="py-2.5 px-4">' + PREP.esc(task) + '</td>' +
          '<td class="py-2.5 px-4 text-end tabular-nums font-semibold">' + (s.items || 0) + '</td>' +
          '</tr>';
      }).join('');
    } catch (e) {
      /* The overview is informative, not a gate. If it cannot be fetched the
         candidate should still be able to sit the test. */
      sub.textContent = 'The list of parts could not be loaded, but you can still begin.';
      body.innerHTML = '';
    }
  },

  start() {
    const params = new URLSearchParams(location.search);
    const test = params.get('test');
    location.href = '/prep/lam-bai/' + (test ? '?test=' + encodeURIComponent(test) : '');
  }
};
