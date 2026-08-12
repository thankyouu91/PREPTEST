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
 * It also scrolls the current entry into view on load — before this, opening the
 * last page in the list left its own chip off screen.
 *
 * No inline styles: everything goes through classes in src/tailwind.css, to stay
 * inside the project's strict CSP.
 */
(function () {
  'use strict';

  var LE = 'http://www.w3.org/2000/svg';

  /** An arrow button; cls must be a class name written out IN FULL, never built
      by concatenation — Tailwind scans the source for class names, and a name it
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
