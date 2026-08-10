/**
 * PrepGrammar — khối tra cứu ngữ pháp dùng chung cho mọi nhóm điểm ngữ pháp
 * (thì, danh từ – mạo từ – lượng từ, khuyết thiếu, bị động…).
 *
 * Trang gọi PrepGrammar.mount({ grp, unit, signalsLabel, confuseLabel }); phần
 * markup khung (thanh lọc, skeleton, #list, #empty) do trang tự dựng theo đúng
 * các id dưới đây. Nhờ vậy thêm một nhóm ngữ pháp mới chỉ tốn một tệp HTML mỏng
 * chứ không phải chép lại toàn bộ phần vẽ chi tiết.
 *
 * Cần có sẵn: PREP (_mock.js), PrepApi, PrepTTS (_tts.js).
 *
 * Id bắt buộc trong trang: #list #empty #skeleton #f-level #result-count #clear
 */
const PrepGrammar = {
  /**
   * @param {object} o
   * @param {string} o.grp           mã nhóm, ví dụ 'tense' | 'noun'
   * @param {string} o.unit          đơn vị đếm hiện ở góc phải, ví dụ 'thì'
   * @param {string} [o.signalsLabel]  nhãn khối chip gợi nhớ
   * @param {string} [o.confuseLabel]  nhãn khối phân biệt
   * @param {string} [o.emptyTitle]    tiêu đề khi lọc không ra gì
   */
  mount(o) {
    const grp = o.grp;
    const unit = o.unit || 'mục';
    const signalsLabel = o.signalsLabel || 'Dấu hiệu nhận biết';
    const confuseLabel = o.confuseLabel || 'Phân biệt với mục dễ nhầm';

    let all = [];
    const open = new Set();      // slug đang mở
    const detail = new Map();    // slug → chi tiết đã tải
    const state = { level: '' };

    const $ = sel => PREP.qs(sel);

    /* ---------- Khối chi tiết ---------- */

    function formulaBlock(f) {
      if (!f) return '';
      const rows = (f.rows || []).filter(r => r && r[1]);
      if (!rows.length && !f.note) return '';
      return '<div class="rounded-xl bg-brand-soft px-4 py-3.5 grid gap-1.5">' +
        rows.map(([label, val]) =>
          '<div class="flex flex-wrap gap-x-2 gap-y-0.5 text-[14px]">' +
            '<b class="text-ink shrink-0 sm:w-[104px]">' + PREP.esc(label) + '</b>' +
            '<code class="font-mono text-[13px] text-brand-strong">' + PREP.esc(val) + '</code>' +
          '</div>').join('') +
        (f.note ? '<p class="text-[13px] text-muted font-medium mt-1">' + PREP.esc(f.note) + '</p>' : '') +
        '</div>';
    }

    function listBlock(title, items, render) {
      if (!items || !items.length) return '';
      return '<div class="mt-5">' +
        '<h4 class="font-extrabold text-[15px] tracking-tight">' + title + '</h4>' +
        '<ul class="grid gap-2 mt-2.5">' + items.map(render).join('') + '</ul></div>';
    }

    function sentence(en, vi) {
      return '<p class="text-[14px] leading-relaxed">' + PrepTTS.wordify(en) + '</p>' +
        '<p class="text-[13px] text-muted italic mt-0.5">' + PREP.esc(vi) + '</p>';
    }

    function detailHtml(d) {
      const p = d.point;

      const signals = p.signals && p.signals.length
        ? '<div class="mt-5"><h4 class="font-extrabold text-[15px] tracking-tight">' + signalsLabel + '</h4>' +
            '<div class="flex flex-wrap gap-1.5 mt-2.5">' +
              p.signals.map(s => '<span class="badge badge-muted">' + PREP.esc(s) + '</span>').join('') +
            '</div></div>'
        : '';

      const useWhen = listBlock('Dùng khi nào', p.useWhen, u =>
        '<li class="flex gap-2 text-[14px]">' +
          '<span class="text-ok-ink shrink-0" aria-hidden="true">•</span>' +
          '<span>' + PREP.esc(u) + '</span></li>');

      const useNot = listBlock('KHÔNG dùng khi nào', p.useNot, u =>
        '<li class="rounded-xl border border-line px-3.5 py-3">' +
          '<p class="text-[14px] font-semibold">' + PREP.esc(u.what) + '</p>' +
          '<p class="text-[13px] text-muted font-medium mt-1">' + PREP.esc(u.why) + '</p></li>');

      const confuse = listBlock(confuseLabel, p.confuse, c =>
        '<li class="rounded-xl border border-line px-3.5 py-3">' +
          '<p class="text-[14px] font-semibold">Với ' + PREP.esc(c.with) + '</p>' +
          '<p class="text-[13px] text-muted font-medium mt-1">' + PREP.esc(c.tell) + '</p>' +
          '<div class="grid sm:grid-cols-2 gap-2.5 mt-2.5">' +
            c.pair.map(s => '<div class="rounded-lg bg-brand-soft px-3 py-2.5">' +
              sentence(s.en, s.vi) + '</div>').join('') +
          '</div></li>');

      const errors = listBlock('Lỗi người Việt hay mắc', p.errors, e =>
        '<li class="rounded-xl border border-line px-3.5 py-3">' +
          '<p class="text-[14px]"><span class="badge badge-danger">Sai</span> ' +
            '<span class="line-through text-muted">' + PREP.esc(e.wrong) + '</span></p>' +
          '<p class="text-[14px] mt-1.5"><span class="badge badge-ok">Đúng</span> ' +
            PrepTTS.wordify(e.right) + '</p>' +
          '<p class="text-[13px] text-muted font-medium mt-1.5">' + PREP.esc(e.why) + '</p></li>');

      const examples = listBlock('Câu ví dụ', d.examples, x =>
        '<li class="rounded-xl px-3.5 py-3 ' +
            (x.ok ? 'bg-brand-soft' : 'border border-danger-line bg-danger-soft') + '">' +
          '<div class="flex items-start gap-2">' +
            '<span class="badge ' + (x.ok ? 'badge-ok' : 'badge-danger') + ' shrink-0">' +
              (x.ok ? 'Đúng' : 'Sai') + '</span>' +
            '<div class="min-w-0">' + sentence(x.en, x.vi) + '</div></div>' +
          (x.note ? '<p class="text-[13px] text-muted font-medium mt-1.5">' + PREP.esc(x.note) + '</p>' : '') +
        '</li>');

      const practice = d.practice.length
        ? '<div class="mt-5">' +
            '<div class="flex flex-wrap items-center gap-3">' +
              '<h4 class="font-extrabold text-[15px] tracking-tight">Luyện tập</h4>' +
              '<button type="button" class="btn btn-ghost btn-sm" data-reveal="' + PREP.esc(p.slug) + '">' +
                'Hiện tất cả đáp án</button>' +
            '</div>' +
            '<ol class="grid gap-2 mt-2.5">' + d.practice.map((x, i) =>
              '<li class="rounded-xl border border-line px-3.5 py-3">' +
                '<p class="text-[14px]"><span class="text-muted font-semibold me-1.5">' + (i + 1) + '.</span>' +
                  PREP.esc(x.en) + '</p>' +
                '<p class="text-[13px] text-muted italic mt-0.5">' + PREP.esc(x.vi) + '</p>' +
                '<p class="text-[14px] mt-1.5" data-answer hidden>' +
                  '<span class="badge badge-ok">Đáp án</span> ' +
                  '<b class="text-ok-ink">' + PREP.esc(x.answer) + '</b></p>' +
              '</li>').join('') +
            '</ol></div>'
        : '';

      return '<div class="border-t border-line mt-4 pt-4">' +
        formulaBlock(p.formula) + signals + useWhen + useNot + confuse + errors + examples + practice +
        '</div>';
    }

    /* ---------- Danh sách ---------- */

    function card(p) {
      const isOpen = open.has(p.slug);
      const d = detail.get(p.slug);
      return '<article class="card p-5" data-slug="' + PREP.esc(p.slug) + '">' +
        '<button type="button" class="w-full text-start flex items-start gap-3" ' +
            'data-toggle="' + PREP.esc(p.slug) + '" aria-expanded="' + isOpen + '">' +
          '<span class="min-w-0 flex-1">' +
            '<span class="flex flex-wrap items-center gap-2">' +
              '<b class="text-[17px] font-extrabold tracking-tight">' + PREP.esc(p.nameVi) + '</b>' +
              '<span class="badge badge-muted">' + PREP.esc(p.level) + '</span>' +
            '</span>' +
            '<span class="block text-[13px] text-muted font-semibold mt-0.5">' + PREP.esc(p.nameEn) + '</span>' +
            '<span class="block text-[14px] mt-1.5">' + PREP.esc(p.summary) + '</span>' +
            '<span class="block text-[13px] text-muted font-medium mt-1.5">' +
              p.counts.example + ' ví dụ · ' + p.counts.practice + ' câu luyện</span>' +
          '</span>' +
          PREP.icon('chevronDown', 'w-5 h-5 shrink-0 text-muted mt-1 transition-transform' +
            (isOpen ? ' rotate-180' : '')) +
        '</button>' +
        (isOpen
          ? (d ? detailHtml(d) : '<p class="text-[14px] text-muted font-medium mt-4">Đang tải…</p>')
          : '') +
        '</article>';
    }

    function render() {
      const list = all.filter(p => !state.level || p.level === state.level);
      const none = list.length === 0;
      $('#empty').toggleAttribute('hidden', !none);
      $('#list').toggleAttribute('hidden', none);
      $('#result-count').textContent = list.length + '/' + all.length + ' ' + unit;
      $('#list').innerHTML = list.map(card).join('');
    }

    /* ---------- Sự kiện ---------- */

    $('#list').addEventListener('click', e => {
      const reveal = e.target.closest('[data-reveal]');
      if (reveal) {
        const art = reveal.closest('article');
        const hidden = art.querySelectorAll('[data-answer][hidden]').length > 0;
        art.querySelectorAll('[data-answer]').forEach(el => el.toggleAttribute('hidden', !hidden));
        reveal.textContent = hidden ? 'Ẩn đáp án' : 'Hiện tất cả đáp án';
        return;
      }
      const t = e.target.closest('[data-toggle]');
      if (!t) return;
      const slug = t.getAttribute('data-toggle');
      if (open.has(slug)) { open.delete(slug); render(); return; }

      open.add(slug);
      render();
      if (detail.has(slug)) return;
      PrepApi.get('/api/learn/grammar/' + encodeURIComponent(slug)).then(res => {
        if (!res.ok) { open.delete(slug); render(); return; }
        detail.set(slug, res.data);
        if (open.has(slug)) render();
      });
    });

    $('#f-level').addEventListener('change', e => { state.level = e.target.value; render(); });
    $('#clear').addEventListener('click', () => {
      state.level = '';
      $('#f-level').value = '';
      render();
    });

    /* ---------- Nạp ---------- */

    PrepTTS.onUnavailable = () => $('#tts-warn').removeAttribute('hidden');
    PrepTTS.init();
    PrepTTS.mountControls($('#tts-controls'));
    PrepTTS.bindSelection($('#main'));
    // Uỷ quyền một lần trên #list — bên trong vẽ lại bao nhiêu lần cũng không
    // cần gắn thêm listener.
    PrepTTS.bindClicks($('#list'));

    PrepApi.get('/api/learn/grammar?grp=' + encodeURIComponent(grp)).then(res => {
      $('#skeleton').classList.add('hidden');
      if (!PrepTTS.available()) $('#tts-warn').removeAttribute('hidden');
      if (!res.ok) {
        $('#empty').removeAttribute('hidden');
        $('#empty').querySelector('h3').textContent = 'Không tải được danh sách';
        $('#empty').querySelector('p').textContent =
          PrepApi.err(res, 'Thử tải lại trang giúp mình nhé.');
        return;
      }
      all = res.data.points;
      if (!all.length) { $('#empty').removeAttribute('hidden'); return; }
      render();
    });
  }
};
