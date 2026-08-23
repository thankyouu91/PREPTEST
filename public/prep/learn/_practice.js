/* =============================================================================
   Active recall for the two reference pages.

   The nine grammar pages carry practice sentences. The verb table and the
   linking-word table carried nothing: you could read them and that was all.
   Reading a conjugation table feels like learning and mostly is not, which is
   the same argument server/revision.js makes about its own exercises, so this
   asks for the form rather than showing it.

   ## Why it does not mark itself

   The obvious build marks in the browser and posts the score. That is an
   invitation to post ten correct answers without typing any. The browser posts
   what was typed and server/learn-practice.js decides, exactly as the drill and
   revision paths do.

   ## What it costs the learner if they cheat anyway

   Nothing worth having. These go in under `grammar` and `vocabulary`, which
   ability.abilityOf() keeps out of the overall band on purpose, so the worst a
   determined self-deceiver can do is spoil their own self-study picture.

   Mounted by both pages with PrepLearnPractice.mount(host, kind).
   ============================================================================= */
(function () {
  'use strict';

  /* Read from PREP_I18N, not from PREP.t.
     PREP.t is the obvious thing to reach for and it is WRONG here: it lives in
     public/prep/_mock.js, which the self-study pages do not load, so on these
     two pages window.PREP exists without it. The first build of this file used
     PREP.t with a fallback to English, which meant the whole panel rendered in
     English on a Vietnamese page and nothing threw to say so. PREP_I18N is set
     by public/i18n.js in the <head> of every page that has any translation at
     all, which is the right thing to depend on. */
  var T = function (en, vi) {
    return (window.PREP_I18N && window.PREP_I18N.lang === 'vi') ? vi : en;
  };

  function el(tag, cls, text) {
    var n = document.createElement(tag);
    if (cls) n.className = cls;
    if (text !== undefined) n.textContent = text;
    return n;
  }

  function mount(host, kind) {
    if (!host || host.dataset.practice) return;
    host.dataset.practice = '1';

    var items = [], at = 0, answers = [], roundId = null;

    var head = el('div', 'flex flex-wrap items-baseline gap-x-3 gap-y-1');
    head.appendChild(el('h3', 'font-extrabold tracking-tight',
      T('Practise, do not just read', 'Luyện thật, đừng chỉ đọc')));
    var sub = el('span', 'text-[13px] text-muted',
      kind === 'verb'
        ? T('Ten forms, typed from memory. The table is right above if you get stuck.',
            'Mười dạng, gõ từ trí nhớ. Bí thì bảng ngay bên trên.')
        : T('Ten gaps, one linking word each.', 'Mười chỗ trống, mỗi chỗ một từ nối.'));
    head.appendChild(sub);

    var body = el('div', 'mt-4');
    host.append(head, body);

    /* ---------------------------------------------------------------- idle */
    function idle(summary) {
      body.innerHTML = '';
      if (summary) {
        var s = el('p', 'text-[15px] font-semibold');
        s.textContent = T(
          'You got ' + summary.right + ' of ' + summary.asked + '.',
          'Bạn đúng ' + summary.right + '/' + summary.asked + '.');
        body.appendChild(s);
        if (summary.detail && summary.detail.length) {
          var list = el('ul', 'grid gap-1.5 mt-3');
          summary.detail.forEach(function (d) {
            var li = el('li', 'flex items-baseline gap-2 text-[13.5px]');
            li.appendChild(el('span', 'badge shrink-0 ' + (d.right ? 'badge-ok' : 'badge-danger'),
              d.right ? T('Correct', 'Đúng') : T('Wrong', 'Sai')));
            var txt = el('span', '');
            /* The right answer, always, and what they typed when it was not.
               Withholding it after the round is the difference between practice
               and a score. */
            txt.textContent = d.right
              ? d.answer
              : T('You put "' + (d.given || '-') + '", the answer is "' + d.answer + '"',
                  'Bạn gõ "' + (d.given || '-') + '", đáp án là "' + d.answer + '"');
            li.appendChild(txt);
            list.appendChild(li);
          });
          body.appendChild(list);
        }
      }
      var go = el('button', 'btn btn-primary btn-md mt-4');
      go.type = 'button';
      go.textContent = summary ? T('Another round', 'Làm lượt nữa') : T('Start a round', 'Bắt đầu một lượt');
      go.addEventListener('click', start);
      body.appendChild(go);
    }

    /* --------------------------------------------------------------- round */
    async function start() {
      body.innerHTML = '';
      body.appendChild(el('p', 'text-[14px] text-muted', T('Drawing a round…', 'Đang bốc câu…')));
      var res = await PrepApi.get('/api/learn/practice?kind=' + encodeURIComponent(kind));
      if (!res.ok || !(res.data.items || []).length) {
        body.innerHTML = '';
        body.appendChild(el('p', 'text-[14px] text-muted',
          T('Nothing to practise here yet.', 'Chưa có gì để luyện ở đây.')));
        return;
      }
      items = res.data.items;
      at = 0;
      answers = [];
      /* Namespaces this round so a re-post of it cannot count twice, while a
         genuinely new round still does. See ability.record()'s unique key. */
      roundId = String(Date.now()) + '-' + Math.random().toString(36).slice(2, 8);
      ask();
    }

    function ask() {
      var it = items[at];
      body.innerHTML = '';

      var count = el('p', 'text-[12.5px] font-bold uppercase tracking-wide text-muted',
        T('Question ', 'Câu ') + (at + 1) + ' / ' + items.length);

      var prompt = el('p', 'text-[17px] font-semibold leading-relaxed mt-2');
      prompt.textContent = it.prompt;

      var meta = el('p', 'text-[13px] text-muted mt-1');
      meta.textContent = [it.vi, it.hint].filter(Boolean).join(' · ');

      var input = document.createElement('input');
      input.className = 'input mt-4';
      input.autocomplete = 'off';
      input.autocapitalize = 'off';
      input.spellcheck = false;
      input.setAttribute('aria-label', T('Your answer', 'Câu trả lời của bạn'));
      input.placeholder = kind === 'verb'
        ? T('Type the ' + String(it.hint || '').toLowerCase() + ' form', 'Gõ dạng ' + (it.hint || ''))
        : T('Type the linking word', 'Gõ từ nối');

      var row = el('div', 'flex flex-wrap gap-2.5 mt-4');
      var next = el('button', 'btn btn-primary btn-md');
      next.type = 'button';
      next.textContent = at === items.length - 1
        ? T('Finish and check', 'Xong và chấm') : T('Next', 'Tiếp');
      var skip = el('button', 'btn btn-ghost btn-md');
      skip.type = 'button';
      skip.textContent = T('I do not know', 'Chưa biết');

      function advance(value) {
        answers.push({ id: it.id, field: it.field, answer: value });
        at++;
        if (at < items.length) return ask();
        finish();
      }
      next.addEventListener('click', function () { advance(input.value); });
      skip.addEventListener('click', function () { advance(''); });
      input.addEventListener('keydown', function (e) {
        if (e.key === 'Enter') { e.preventDefault(); advance(input.value); }
      });

      row.append(next, skip);
      body.append(count, prompt, meta, input, row);
      input.focus();
    }

    async function finish() {
      body.innerHTML = '';
      body.appendChild(el('p', 'text-[14px] text-muted', T('Marking…', 'Đang chấm…')));
      var res = await PrepApi.post('/api/learn/practice',
        { kind: kind, roundId: roundId, answers: answers });
      if (!res.ok) {
        body.innerHTML = '';
        body.appendChild(el('p', 'text-[14px] text-muted',
          T('That could not be marked. Try the round again.',
            'Chưa chấm được. Thử lại lượt này nhé.')));
        var again = el('button', 'btn btn-soft btn-md mt-4');
        again.type = 'button';
        again.textContent = T('Try again', 'Thử lại');
        again.addEventListener('click', start);
        body.appendChild(again);
        return;
      }
      idle(res.data);
    }

    idle(null);
  }

  window.PrepLearnPractice = { mount: mount };
})();
