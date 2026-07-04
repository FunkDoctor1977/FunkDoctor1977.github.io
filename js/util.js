/* SwiggOS — util.js
   Shared helpers. Everything hangs off window.U. No modules (runs from static hosting). */
(function () {
  'use strict';

  const U = {};

  // ---- DOM ----------------------------------------------------------------
  U.esc = function (s) {
    if (s === null || s === undefined) return '';
    return String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  };

  // el('div.card', {onclick: fn, dataset:{id:1}}, child1, child2 | htmlString via U.raw)
  U.el = function (spec, attrs, ...children) {
    const parts = spec.split('.');
    const node = document.createElement(parts[0] || 'div');
    if (parts.length > 1) node.className = parts.slice(1).join(' ');
    if (attrs) {
      for (const k of Object.keys(attrs)) {
        const v = attrs[k];
        if (v === null || v === undefined) continue;
        if (k === 'dataset') Object.assign(node.dataset, v);
        else if (k === 'style' && typeof v === 'object') Object.assign(node.style, v);
        else if (k.startsWith('on') && typeof v === 'function') node.addEventListener(k.slice(2), v);
        else if (k === 'html') node.innerHTML = v;
        else if (k === 'text') node.textContent = v;
        else if (k in node && k !== 'list' && typeof v !== 'string') node[k] = v;
        else node.setAttribute(k, v);
      }
    }
    for (const c of children.flat()) {
      if (c === null || c === undefined || c === false) continue;
      node.append(c.nodeType ? c : document.createTextNode(String(c)));
    }
    return node;
  };

  // ---- dates ----------------------------------------------------------------
  U.now = () => new Date();
  U.daysFromNow = function (n) { const d = new Date(); d.setDate(d.getDate() + n); return d.toISOString(); };
  U.daysAgo = (n) => U.daysFromNow(-n);
  U.fmtDate = function (iso) {
    if (!iso) return '—';
    const d = new Date(iso);
    return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
  };
  U.fmtDateTime = function (iso) {
    if (!iso) return '—';
    const d = new Date(iso);
    return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }) + ' ' +
      d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
  };
  U.timeAgo = function (iso) {
    if (!iso) return '—';
    const s = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
    if (s < 60) return 'just now';
    if (s < 3600) return Math.floor(s / 60) + 'm ago';
    if (s < 86400) return Math.floor(s / 3600) + 'h ago';
    if (s < 86400 * 30) return Math.floor(s / 86400) + 'd ago';
    return U.fmtDate(iso);
  };
  U.workingDaysBetween = function (a, b) {
    let d = new Date(a); const end = new Date(b); let n = 0;
    d.setHours(0, 0, 0, 0); end.setHours(0, 0, 0, 0);
    while (d <= end) { const wd = d.getDay(); if (wd !== 0 && wd !== 6) n++; d.setDate(d.getDate() + 1); }
    return n;
  };

  // ---- numbers ----------------------------------------------------------------
  U.fmtNum = function (n, dp) {
    if (n === null || n === undefined || isNaN(n)) return '—';
    return Number(n).toLocaleString('en-GB', { maximumFractionDigits: dp === undefined ? 1 : dp, minimumFractionDigits: 0 });
  };
  U.fmtGBP = function (n, dp) {
    if (n === null || n === undefined || isNaN(n)) return '—';
    if (Math.abs(n) >= 1000) return '£' + Number(n).toLocaleString('en-GB', { maximumFractionDigits: 0 });
    return '£' + Number(n).toLocaleString('en-GB', { maximumFractionDigits: dp === undefined ? 2 : dp });
  };
  U.fmtPct = (n, dp) => (n === null || n === undefined || isNaN(n)) ? '—' : U.fmtNum(n, dp === undefined ? 0 : dp) + '%';
  U.clamp = (n, a, b) => Math.max(a, Math.min(b, n));
  U.sum = (arr, fn) => arr.reduce((t, x) => t + (fn ? fn(x) : x), 0);
  U.avg = (arr, fn) => arr.length ? U.sum(arr, fn) / arr.length : 0;

  // ---- misc ----------------------------------------------------------------
  U.badge = function (text, cls) { return '<span class="badge ' + (cls || '') + '">' + U.esc(text) + '</span>'; };
  U.sevClass = function (sev) {
    return { low: 'b-ok', minor: 'b-ok', medium: 'b-warn', moderate: 'b-warn', high: 'b-serious', major: 'b-serious', critical: 'b-crit' }[String(sev).toLowerCase()] || 'b-muted';
  };
  U.classClass = function (c) {
    return { 'Public': 'b-ok', 'Internal': 'b-info', 'Confidential': 'b-serious', 'Restricted': 'b-crit' }[c] || 'b-muted';
  };
  U.initials = function (name) { return String(name || '?').split(/\s+/).map(w => w[0]).slice(0, 2).join('').toUpperCase(); };
  U.title = (s) => String(s || '').replace(/[-_]/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
  U.debounce = function (fn, ms) { let t; return function (...a) { clearTimeout(t); t = setTimeout(() => fn.apply(this, a), ms); }; };
  U.copy = function (text, btn) {
    const done = () => { if (btn) { const old = btn.textContent; btn.textContent = 'Copied ✓'; setTimeout(() => { btn.textContent = old; }, 1200); } };
    if (navigator.clipboard && navigator.clipboard.writeText) { navigator.clipboard.writeText(text).then(done, done); }
    else { const ta = document.createElement('textarea'); ta.value = text; document.body.appendChild(ta); ta.select(); try { document.execCommand('copy'); } catch (e) { } ta.remove(); done(); }
  };

  // Deterministic PRNG for seed-data generation (stable demo numbers for QA).
  U.lcg = function (seed) {
    let s = seed >>> 0;
    return function () { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; };
  };

  window.U = U;
})();
