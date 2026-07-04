/* SwiggOS — charts.js
   Inline-SVG chart helpers, single dark theme. Palette follows the validated
   dark-surface categorical set; text stays in ink tokens, marks stay thin.
   All functions return an SVG string; call Charts.bindTips(container) after insert. */
(function () {
  'use strict';

  const C = {
    series: ['#3987e5', '#199e70', '#c98500', '#008300', '#9085e9', '#e66767'],
    status: { good: '#0ca30c', warning: '#fab219', serious: '#ec835a', critical: '#d03b3b' },
    ink: '#ffffff', ink2: '#c3c2b7', muted: '#898781', grid: '#2c2c2a', axis: '#383835', surface: '#1a1a19',
    accent: '#ff6633',
  };

  const esc = U.esc;

  function tipAttrs(text) { return ' class="ch-hit" data-tip="' + esc(text) + '" tabindex="0"'; }

  // ---- Horizontal bar chart -------------------------------------------------
  // items: [{label, value, color?, tip?}] ; opts: {max, format, height}
  C.bars = function (items, opts) {
    opts = opts || {};
    if (!items.length) return C.empty('No data');
    const max = opts.max || Math.max(...items.map(i => i.value), 0.0001);
    const rowH = 30, labelW = opts.labelW || 150, valW = 62;
    const W = opts.width || 460, H = items.length * rowH + 6;
    const barW = W - labelW - valW - 8;
    const fmt = opts.format || (v => U.fmtNum(v));
    let s = '<svg class="chart" viewBox="0 0 ' + W + ' ' + H + '" role="img" aria-label="' + esc(opts.label || 'Bar chart') + '">';
    items.forEach((it, i) => {
      const y = i * rowH + 4, bw = Math.max(2, (it.value / max) * barW);
      const col = it.color || C.series[0];
      const tip = it.tip || (it.label + ': ' + fmt(it.value));
      s += '<g' + tipAttrs(tip) + '>';
      s += '<rect x="0" y="' + y + '" width="' + W + '" height="' + (rowH - 6) + '" fill="transparent"/>';
      s += '<text x="' + (labelW - 8) + '" y="' + (y + 16) + '" text-anchor="end" font-size="12" fill="' + C.ink2 + '">' + esc(String(it.label).slice(0, 24)) + '</text>';
      s += '<rect x="' + labelW + '" y="' + (y + 3) + '" width="' + bw + '" height="16" rx="4" fill="' + col + '"/>';
      s += '<text x="' + (labelW + bw + 8) + '" y="' + (y + 16) + '" font-size="12" fill="' + C.ink + '" font-weight="600">' + esc(fmt(it.value)) + '</text>';
      s += '</g>';
    });
    return s + '</svg>';
  };

  // ---- Line / area chart --------------------------------------------------------
  // series: [{name, values:[..], color?}] ; opts: {labels (x tick labels), height, format, yMax}
  C.line = function (series, opts) {
    opts = opts || {};
    if (!series.length || !series[0].values.length) return C.empty('No data');
    const W = opts.width || 460, H = opts.height || 150, padL = 34, padR = 10, padT = 10, padB = 22;
    const n = series[0].values.length;
    const all = series.flatMap(s => s.values).filter(v => v !== null);
    const yMax = opts.yMax || Math.max(...all, 0.0001) * 1.15;
    const x = i => padL + (i / Math.max(1, n - 1)) * (W - padL - padR);
    const y = v => H - padB - (v / yMax) * (H - padT - padB);
    const fmt = opts.format || (v => U.fmtNum(v));
    let s = '<svg class="chart" viewBox="0 0 ' + W + ' ' + H + '" role="img" aria-label="' + esc(opts.label || 'Line chart') + '">';
    // grid: 3 hairlines + baseline
    for (let g = 1; g <= 3; g++) {
      const gy = padT + ((H - padT - padB) / 3) * (g - 1);
      s += '<line x1="' + padL + '" y1="' + gy + '" x2="' + (W - padR) + '" y2="' + gy + '" stroke="' + C.grid + '" stroke-width="1"/>';
      s += '<text x="' + (padL - 6) + '" y="' + (gy + 4) + '" text-anchor="end" font-size="10" fill="' + C.muted + '">' + esc(fmt(yMax * (1 - (g - 1) / 3))) + '</text>';
    }
    s += '<line x1="' + padL + '" y1="' + (H - padB) + '" x2="' + (W - padR) + '" y2="' + (H - padB) + '" stroke="' + C.axis + '" stroke-width="1"/>';
    if (opts.labels) {
      const step = Math.ceil(opts.labels.length / 6);
      opts.labels.forEach((lb, i) => {
        if (i % step) return;
        s += '<text x="' + x(i) + '" y="' + (H - 6) + '" text-anchor="middle" font-size="10" fill="' + C.muted + '">' + esc(lb) + '</text>';
      });
    }
    series.forEach((ser, si) => {
      const col = ser.color || C.series[si % C.series.length];
      const pts = ser.values.map((v, i) => v === null ? null : [x(i), y(v)]);
      const dd = pts.map((p, i) => p ? (i === 0 || !pts[i - 1] ? 'M' : 'L') + p[0].toFixed(1) + ' ' + p[1].toFixed(1) : '').join(' ');
      if (opts.area && series.length === 1) {
        const first = pts.find(Boolean), last = [...pts].reverse().find(Boolean);
        s += '<path d="' + dd + ' L' + last[0].toFixed(1) + ' ' + (H - padB) + ' L' + first[0].toFixed(1) + ' ' + (H - padB) + ' Z" fill="' + col + '" opacity="0.12"/>';
      }
      s += '<path d="' + dd + '" fill="none" stroke="' + col + '" stroke-width="2" stroke-linejoin="round"/>';
      pts.forEach((p, i) => {
        if (!p) return;
        const tip = (series.length > 1 ? ser.name + ' — ' : '') + (opts.labels ? opts.labels[i] + ': ' : '') + fmt(ser.values[i]);
        s += '<g' + tipAttrs(tip) + '><circle cx="' + p[0].toFixed(1) + '" cy="' + p[1].toFixed(1) + '" r="9" fill="transparent"/>' +
          '<circle cx="' + p[0].toFixed(1) + '" cy="' + p[1].toFixed(1) + '" r="2.5" fill="' + col + '" stroke="' + C.surface + '" stroke-width="1.5"/></g>';
      });
    });
    s += '</svg>';
    if (series.length > 1) {
      s += '<div class="ch-legend">' + series.map((ser, si) =>
        '<span><i style="background:' + (ser.color || C.series[si % C.series.length]) + '"></i>' + esc(ser.name) + '</span>').join('') + '</div>';
    }
    return s;
  };

  // ---- Sparkline (tiny, inline) ---------------------------------------------------
  C.spark = function (values, opts) {
    opts = opts || {};
    if (!values.length) return '';
    const W = opts.width || 90, H = opts.height || 26;
    const max = Math.max(...values, 0.0001), min = Math.min(...values, 0);
    const x = i => 2 + (i / Math.max(1, values.length - 1)) * (W - 4);
    const y = v => H - 3 - ((v - min) / Math.max(0.0001, max - min)) * (H - 6);
    const dd = values.map((v, i) => (i ? 'L' : 'M') + x(i).toFixed(1) + ' ' + y(v).toFixed(1)).join(' ');
    const col = opts.color || C.series[0];
    return '<svg class="spark" viewBox="0 0 ' + W + ' ' + H + '" width="' + W + '" height="' + H + '" aria-hidden="true">' +
      '<path d="' + dd + '" fill="none" stroke="' + col + '" stroke-width="1.5"/>' +
      '<circle cx="' + x(values.length - 1).toFixed(1) + '" cy="' + y(values[values.length - 1]).toFixed(1) + '" r="2.2" fill="' + col + '"/></svg>';
  };

  // ---- Donut ------------------------------------------------------------------------
  // items: [{label, value, color?}]
  C.donut = function (items, opts) {
    opts = opts || {};
    const total = U.sum(items, i => i.value);
    if (!total) return C.empty('No data');
    const R = 52, r = 34, cx = 62, cy = 62;
    let a0 = -Math.PI / 2, s = '<svg class="chart" viewBox="0 0 124 124" width="124" height="124" role="img" aria-label="' + esc(opts.label || 'Breakdown') + '">';
    items.forEach((it, i) => {
      if (!it.value) return;
      const frac = it.value / total;
      const a1 = a0 + frac * Math.PI * 2 - 0.03; // 0.03 rad ≈ 2px surface gap
      const large = frac > 0.5 ? 1 : 0;
      const p = (a, rad) => (cx + rad * Math.cos(a)).toFixed(2) + ' ' + (cy + rad * Math.sin(a)).toFixed(2);
      s += '<path' + tipAttrs(it.label + ': ' + U.fmtNum(it.value, 0) + ' (' + Math.round(frac * 100) + '%)') +
        ' d="M' + p(a0, R) + ' A' + R + ' ' + R + ' 0 ' + large + ' 1 ' + p(a1, R) +
        ' L' + p(a1, r) + ' A' + r + ' ' + r + ' 0 ' + large + ' 0 ' + p(a0, r) + ' Z" fill="' + (it.color || C.series[i % C.series.length]) + '"/>';
      a0 = a1 + 0.03;
    });
    if (opts.center) {
      s += '<text x="' + cx + '" y="' + (cy - 1) + '" text-anchor="middle" font-size="20" font-weight="700" fill="' + C.ink + '">' + esc(opts.center) + '</text>' +
        '<text x="' + cx + '" y="' + (cy + 15) + '" text-anchor="middle" font-size="9" fill="' + C.muted + '">' + esc(opts.centerSub || '') + '</text>';
    }
    s += '</svg><div class="ch-legend ch-legend-col">' + items.filter(i => i.value).map((it, i) =>
      '<span><i style="background:' + (it.color || C.series[i % C.series.length]) + '"></i>' + esc(it.label) + ' <b>' + U.fmtNum(it.value, 0) + '</b></span>').join('') + '</div>';
    return '<div class="donut-wrap">' + s + '</div>';
  };

  C.empty = function (msg) { return '<div class="chart-empty">' + esc(msg) + '</div>'; };

  // ---- Tooltip layer ---------------------------------------------------------------
  let tipEl = null;
  C.bindTips = function (root) {
    if (!tipEl) {
      tipEl = document.createElement('div');
      tipEl.className = 'ch-tip';
      document.body.appendChild(tipEl);
    }
    root.querySelectorAll('.ch-hit').forEach(el => {
      const show = (e) => {
        tipEl.textContent = el.dataset.tip;
        tipEl.style.display = 'block';
        const px = (e.touches ? e.touches[0].clientX : e.clientX) || el.getBoundingClientRect().x;
        const py = (e.touches ? e.touches[0].clientY : e.clientY) || el.getBoundingClientRect().y;
        tipEl.style.left = Math.min(px + 12, window.innerWidth - tipEl.offsetWidth - 8) + 'px';
        tipEl.style.top = (py - 34) + 'px';
      };
      const hide = () => { tipEl.style.display = 'none'; };
      el.addEventListener('mousemove', show); el.addEventListener('mouseenter', show);
      el.addEventListener('mouseleave', hide); el.addEventListener('blur', hide);
      el.addEventListener('focus', show);
    });
  };

  window.Charts = C;
})();
