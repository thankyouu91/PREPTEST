/* =============================================================================
   Small charts, drawn as SVG, with no library.

   There is no charting dependency here and there is not going to be: this
   platform ships with one runtime dependency and a 60kB chart library to draw
   four panels would be a poor trade. What is actually needed is three shapes,
   and each is about thirty lines of arithmetic.

   ## Why SVG rather than canvas or divs

   The content security policy on this platform forbids inline `style`
   attributes. SVG is the one drawing surface where that costs nothing: `x`,
   `y`, `width`, `height` and `fill` are real attributes, not style, so a chart
   built this way needs no exception and no nonce. A div-based bar chart would
   need an inline height on every bar.

   Colour never appears in this file. Every shape carries a class and the
   classes are defined next to the rest of the design tokens in
   src/tailwind.css, so the charts follow the theme into dark mode and follow a
   white-label tenant into its own palette without knowing either exists.

   ## What is drawn, and what is deliberately not

   No gridlines, no axis furniture, no legends drawn inside the picture. Labels
   are HTML underneath, where they stay selectable, translatable by
   public/i18n.js like everything else, and readable at 360px. An SVG full of
   <text> that shrinks with the viewBox is the usual way these end up
   unreadable on a phone.

   Every chart is `role="img"` with a written-out label, because a shape is not
   information to somebody using a screen reader.
   ============================================================================= */
(function () {
  'use strict';

  var NS = 'http://www.w3.org/2000/svg';

  function el(name, attrs) {
    var n = document.createElementNS(NS, name);
    for (var k in attrs) if (attrs[k] !== null && attrs[k] !== undefined) n.setAttribute(k, attrs[k]);
    return n;
  }

  /** A fresh <svg> sized by viewBox, stretched to its container by CSS. */
  function surface(w, h, label) {
    var s = el('svg', {
      viewBox: '0 0 ' + w + ' ' + h,
      class: 'chart',
      role: 'img',
      'aria-label': label || ''
    });
    /* Belt and braces for the label: aria-label is ignored by a couple of
       older screen readers on inline SVG, <title> is not. */
    if (label) { var t = el('title'); t.textContent = label; s.appendChild(t); }
    return s;
  }

  function clear(host) { while (host.firstChild) host.removeChild(host.firstChild); }

  /* ------------------------------------------------------------------ bars */

  /**
   * Stacked bars, one column per day.
   *
   * `rows` is the report's `days` array. `keys` names the series bottom-up and
   * each gets the class `ch-<key>`.
   *
   * Two decisions worth stating:
   *
   * A day with no study draws a flat one-pixel tick rather than nothing. An
   * empty column and a missing column look identical, and the difference
   * between "did not study" and "no data" is the whole point of showing the
   * empty days at all.
   *
   * The tallest bar sets the scale, with a floor, so a first week of ten-minute
   * sessions does not render as four full-height columns and read as though
   * the learner had done a great deal.
   */
  function bars(host, rows, keys, opts) {
    var o = opts || {};
    var W = 720, H = o.height || 132, GAP = 1.5;
    clear(host);
    if (!rows || !rows.length) return;

    var total = function (r) {
      var s = 0;
      for (var i = 0; i < keys.length; i++) s += Number(r[keys[i]]) || 0;
      return s;
    };
    var peak = 0;
    for (var i = 0; i < rows.length; i++) peak = Math.max(peak, total(rows[i]));
    /* A floor on the scale. Without it the axis is whatever the best day
       happened to be, and every chart looks equally full. */
    peak = Math.max(peak, o.floor || 30);

    var bw = (W - GAP * (rows.length - 1)) / rows.length;
    var svg = surface(W, H, o.label);

    for (var d = 0; d < rows.length; d++) {
      var x = d * (bw + GAP);
      var y = H;
      var any = false;
      for (var k = 0; k < keys.length; k++) {
        var v = Number(rows[d][keys[k]]) || 0;
        if (v <= 0) continue;
        any = true;
        var h = Math.max(1.5, v / peak * (H - 3));
        y -= h;
        svg.appendChild(el('rect', {
          x: x.toFixed(2), y: y.toFixed(2), width: bw.toFixed(2), height: h.toFixed(2),
          rx: Math.min(1.6, bw / 2).toFixed(2), class: 'ch-' + keys[k]
        }));
      }
      if (!any) {
        /* Tall enough to see. At one pixel these vanished and a learner with
           two active days out of fifty-six was shown what looked like a blank
           panel with a bug in it. The row of ticks IS the information: it says
           "fifty-six days, and here is which ones you studied". */
        svg.appendChild(el('rect', {
          x: x.toFixed(2), y: H - 3, width: bw.toFixed(2), height: 3,
          rx: Math.min(1.4, bw / 2).toFixed(2), class: 'ch-empty'
        }));
      }
    }
    host.appendChild(svg);
  }

  /* ------------------------------------------------------------------ line */

  /**
   * A trajectory: one point per sitting, in order.
   *
   * Points are evenly spaced by INDEX, not by date. The question is "are my
   * marks moving", and spacing by date turns a three-month gap into a flat
   * stretch of nothing that dominates the picture. The dates are printed
   * underneath, so the spacing is not pretending to be a time axis.
   *
   * A single point still draws: one sitting is a real thing to have done and
   * an empty panel would suggest otherwise.
   */
  function line(host, points, opts) {
    var o = opts || {};
    var W = 720, H = o.height || 132, PAD = 8;
    clear(host);
    if (!points || !points.length) return;

    var max = o.max || 10;
    var xs = points.length === 1
      ? [W / 2]
      : points.map(function (_, i) { return PAD + i * (W - PAD * 2) / (points.length - 1); });
    var ys = points.map(function (p) {
      return PAD + (1 - Math.max(0, Math.min(max, p.v)) / max) * (H - PAD * 2);
    });

    var svg = surface(W, H, o.label);

    /* The target line, when there is one. Drawn first so the data sits over
       it, and dashed so it never reads as another series. */
    if (o.target) {
      var ty = PAD + (1 - o.target / max) * (H - PAD * 2);
      svg.appendChild(el('line', {
        x1: 0, y1: ty.toFixed(2), x2: W, y2: ty.toFixed(2),
        class: 'ch-target', 'stroke-dasharray': '4 5'
      }));
    }

    if (points.length > 1) {
      var d = '';
      for (var i = 0; i < xs.length; i++) d += (i ? ' L' : 'M') + xs[i].toFixed(2) + ' ' + ys[i].toFixed(2);
      /* The fill under the line is the same path closed along the baseline. */
      svg.appendChild(el('path', {
        d: d + ' L' + xs[xs.length - 1].toFixed(2) + ' ' + H + ' L' + xs[0].toFixed(2) + ' ' + H + ' Z',
        class: 'ch-area'
      }));
      svg.appendChild(el('path', { d: d, class: 'ch-line', fill: 'none' }));
    }
    for (var j = 0; j < xs.length; j++) {
      svg.appendChild(el('circle', {
        cx: xs[j].toFixed(2), cy: ys[j].toFixed(2), r: points.length > 14 ? 2.4 : 3.6,
        class: points[j].pending ? 'ch-dot-pending' : 'ch-dot'
      }));
    }
    host.appendChild(svg);
  }

  /* --------------------------------------------------------------- meters */

  /**
   * A row of labelled horizontal bars: skills, parts, accuracy by source.
   *
   * Built from HTML rather than SVG, because these carry a label and a number
   * per row and text in HTML beats text in SVG at every width. The bar width
   * is the one thing that has to be computed, and it goes through a custom
   * property so no inline style is needed: see the note on .funnel-bar in
   * src/tailwind.css, which is the same trick.
   *
   * `null` is drawn as an empty track with "not measured", never as zero. A
   * zero-length bar and an unmeasured one look the same and mean opposite
   * things.
   */
  function meters(host, rows, opts) {
    var o = opts || {};
    var max = o.max || 10;
    clear(host);
    for (var i = 0; i < rows.length; i++) {
      var r = rows[i];
      var wrap = document.createElement('div');
      wrap.className = 'mtr';

      var name = document.createElement('span');
      name.className = 'mtr-name';
      name.textContent = r.label;

      var track = document.createElement('span');
      track.className = 'mtr-track';
      var fill = document.createElement('i');
      fill.className = 'mtr-fill' + (r.dim ? ' mtr-dim' : '');
      if (r.value !== null && r.value !== undefined) {
        fill.style.setProperty('--w', Math.max(0, Math.min(100, r.value / max * 100)) + '%');
      } else {
        fill.style.setProperty('--w', '0%');
      }
      track.appendChild(fill);

      var val = document.createElement('b');
      val.className = 'mtr-val';
      val.textContent = r.text !== undefined ? r.text
        : (r.value === null || r.value === undefined ? '–' : r.value);

      wrap.appendChild(name);
      wrap.appendChild(track);
      wrap.appendChild(val);
      if (r.note) {
        var n = document.createElement('span');
        n.className = 'mtr-note';
        n.textContent = r.note;
        wrap.appendChild(n);
      }
      host.appendChild(wrap);
    }
  }

  window.PrepChart = { bars: bars, line: line, meters: meters };
})();
