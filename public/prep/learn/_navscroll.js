/**
 * The scroller for the self-study navigation chip rail.
 *
 * The rail is wider than the screen, so the last entries are cut off with nothing
 * to tell anyone there is more. This file adds three things, all progressive
 * enhancement (without JS the rail still scrolls by finger and by Tab as before):
 *
 *   1. An arrow button at each edge, shown only when something really is hidden.
 *   2. A fade at the edge, so the eye reads the rail as scrollable at a glance.
 *   3. A thin visible scrollbar that can be dragged with the mouse.
 *
 * It also scrolls the current entry into view on load - before this, opening the
 * last page in the list left its own chip off screen.
 *
 * No inline styles: everything goes through classes in src/tailwind.css, to stay
 * inside the project's strict CSP.
 */
(function () {
  'use strict';

  var LE = 'http://www.w3.org/2000/svg';

  /** An arrow button; cls must be a class name written out IN FULL, never built
      by concatenation - Tailwind scans the source for class names, and a name it
      cannot see is dropped from the built CSS. */
  function taoNut(cls, nhan, d) {
    var b = document.createElement('button');
    b.type = 'button';
    b.className = 'navscroll-btn ' + cls;
    b.setAttribute('aria-label', nhan);
    var svg = document.createElementNS(LE, 'svg');
    svg.setAttribute('viewBox', '0 0 24 24');
    svg.setAttribute('aria-hidden', 'true');
    svg.setAttribute('focusable', 'false');
    var p = document.createElementNS(LE, 'path');
    p.setAttribute('d', d);
    svg.appendChild(p);
    b.appendChild(svg);
    return b;
  }

  function gan(nav) {
    if (nav.dataset.navscroll) return;
    nav.dataset.navscroll = '1';

    /* Wrap the nav so the buttons and fades can be positioned relative to it */
    var voc = document.createElement('div');
    voc.className = 'navscroll';
    nav.parentNode.insertBefore(voc, nav);
    voc.appendChild(nav);

    /* Swap the fully hidden scrollbar for a thin visible one */
    nav.classList.remove('no-scrollbar');
    nav.classList.add('navscroll-track');

    var truoc = taoNut('navscroll-prev', 'Show earlier topics', 'm15 18-6-6 6-6');
    var sau = taoNut('navscroll-next', 'Show later topics', 'm9 18 6-6-6-6');
    voc.appendChild(truoc);
    voc.appendChild(sau);

    function conLai() {
      return nav.scrollWidth - nav.clientWidth;
    }

    function capNhat() {
      var max = conLai();
      var x = nav.scrollLeft;
      /* A 2px threshold for safety: fractional widths drift a little after zooming */
      var traiCon = x > 2;
      var phaiCon = x < max - 2;
      truoc.hidden = !traiCon;
      sau.hidden = !phaiCon;
      voc.classList.toggle('navscroll-has-l', traiCon);
      voc.classList.toggle('navscroll-has-r', phaiCon);
    }

    function keo(huong) {
      nav.scrollBy({ left: huong * Math.max(120, nav.clientWidth * 0.7), behavior: 'smooth' });
    }

    truoc.addEventListener('click', function () { keo(-1); });
    sau.addEventListener('click', function () { keo(1); });
    nav.addEventListener('scroll', capNhat, { passive: true });
    window.addEventListener('resize', capNhat);
    if (window.ResizeObserver) new ResizeObserver(capNhat).observe(nav);

    /* ---- Drag the rail itself ----
     *
     * The arrows and the thin scrollbar were already here, and on a touch screen
     * a finger has always worked. What was missing is the thing a mouse user
     * reaches for first: grab the rail and pull it. Two buttons 28 pixels wide
     * at either end are easy to miss on a wide screen, and somebody who does not
     * see them concludes the rest of the list is unreachable.
     *
     * The whole difficulty is that these are LINKS. A drag must not open the
     * chip it started on, and a click must still work. So nothing counts as a
     * drag until the pointer has travelled past a threshold; below it the
     * gesture stays a click and the browser does what it always did.
     */
    var keoTay = null;

    nav.addEventListener('pointerdown', function (e) {
      /* Left button only, and never on the arrows - they have their own job. */
      if (e.button !== 0 || e.target.closest('.navscroll-btn')) return;
      keoTay = { x: e.clientX, batDau: nav.scrollLeft, that: false, id: e.pointerId };
    });

    nav.addEventListener('pointermove', function (e) {
      if (!keoTay || e.pointerId !== keoTay.id) return;
      var dx = e.clientX - keoTay.x;
      /* Six pixels: below it a shaky hand on a link is still a click. */
      if (!keoTay.that && Math.abs(dx) < 6) return;
      if (!keoTay.that) {
        keoTay.that = true;
        nav.classList.add('navscroll-dragging');
        /* Capture so the drag survives the pointer leaving the rail, which it
           does constantly - the rail is one chip high. */
        try { nav.setPointerCapture(e.pointerId); } catch (err) { /* not fatal */ }
      }
      nav.scrollLeft = keoTay.batDau - dx;
      /* Only once it IS a drag: preventing default earlier would swallow the
         click that a short movement should still produce. */
      e.preventDefault();
    });

    function thoi(e) {
      if (!keoTay) return;
      var that = keoTay.that;
      keoTay = null;
      nav.classList.remove('navscroll-dragging');
      try { nav.releasePointerCapture(e.pointerId); } catch (err) { /* already gone */ }
      /* Swallow exactly one click, the one this drag is about to produce.
         Without it, letting go over a chip navigates - so every drag that
         happened to end on a link would leave the page. */
      if (that) {
        nav.addEventListener('click', function chan(ev) {
          ev.preventDefault();
          ev.stopPropagation();
          nav.removeEventListener('click', chan, true);
        }, true);
      }
    }

    nav.addEventListener('pointerup', thoi);
    nav.addEventListener('pointercancel', thoi);

    /* Bring the current page's own chip into the middle; no smooth scrolling,
       because this runs while the page is still being built. */
    var dangXem = nav.querySelector('[aria-current="page"]');
    if (dangXem) {
      var giua = dangXem.offsetLeft - (nav.clientWidth - dangXem.offsetWidth) / 2;
      nav.scrollLeft = Math.max(0, giua);
    }
    capNhat();
  }

  function chay() {
    var ds = document.querySelectorAll('nav[aria-label="Self-study topics"]');
    for (var i = 0; i < ds.length; i++) gan(ds[i]);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', chay);
  } else {
    chay();
  }
})();
