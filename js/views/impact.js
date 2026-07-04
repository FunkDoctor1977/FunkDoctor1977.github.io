/* SwiggOS — views/impact.js
   Evaluation & Impact: the org's numbers story. Visible to every role;
   every figure carries its basis (measured / estimated / projected) and
   all derived money maths comes from Calc — never re-derived here. */
(function () {
  'use strict';

  App.view('impact', {
    title: 'Evaluation & Impact', navLabel: 'Impact', icon: '◔',
    render(root) {
      root.append(App.pageHead('Evaluation & Impact',
        'What the AI portfolio measurably returns — with the basis of every number stated, not implied.'));

      const sprints = Store.get('sprints');
      const withBoth = sprints.filter(s => s.baseline && s.final);
      const annuals = withBoth.map(s => Calc.annualValue(s)).filter(Boolean);
      const totalNet = U.sum(annuals, a => a.value);
      const totalHrs = U.sum(annuals, a => a.hoursPerWeek);
      const allMeasured = annuals.length > 0 && annuals.every(a => a.basis === 'measured');
      const runCost = U.sum(sprints.filter(s => s.final), s => (s.final.costPerMonth || 0));
      const cutoff = Date.now() - 14 * 86400000;
      const logs14 = Store.get('execLogs').filter(l => new Date(l.ts).getTime() >= cutoff);
      const stats = Calc.logStats(logs14);

      // ---- 1) headline tiles ------------------------------------------------
      const tiles = U.el('div.grid.cols-4');
      tiles.append(
        stat(U.fmtGBP(totalNet), 'Net annual value',
          U.el('span.basis.' + (allMeasured ? 'measured' : 'estimated'), {}, allMeasured ? 'measured' : 'mixed basis'), true),
        stat(U.fmtNum(totalHrs, 1) + ' h', 'Hours handed back / week',
          U.el('span', { style: { color: 'var(--muted)' } }, 'across ' + annuals.length + ' shipped sprint' + (annuals.length === 1 ? '' : 's'))),
        stat(U.fmtGBP(runCost), 'Run cost / month', U.el('span.basis.measured', {}, 'measured')),
        stat(stats.avgEval === null ? '—' : U.fmtNum(stats.avgEval, 1) + ' /5', 'Avg eval score, last 14d',
          U.el('span', { style: { color: 'var(--muted)' } }, 'across ' + U.fmtNum(stats.runs, 0) + ' runs')));
      root.append(tiles);

      // ---- 2) basis explainer strip -------------------------------------------
      const strip = U.el('div.card', {}, U.el('div.grid.cols-3', { style: { marginBottom: '0' } },
        basisExplain('measured', 'Observed post-launch data — billing, timesheets, telemetry. These figures never move when assumptions change.'),
        basisExplain('estimated', 'Pre-launch data plus stated assumptions — honest, but not yet observed in production.'),
        basisExplain('projected', 'Forward-looking and adoption-discounted — a forecast, and labelled as one.')));
      root.append(strip);

      // ---- 3) baseline → final comparison table --------------------------------
      root.append(comparisonTable(sprints));

      // ---- 4) charts row ----------------------------------------------------------
      const charts = U.el('div.grid.cols-2');
      charts.append(deptValueChart(withBoth), evalTrendChart());
      root.append(charts);

      // ---- 5) cost card -------------------------------------------------------------
      root.append(costCard(logs14, stats));

      // ---- 6) assumptions card ---------------------------------------------------------
      root.append(assumptionsCard());
    },
  });

  function stat(k, l, extra, accent) {
    return U.el('div.stat' + (accent ? '.accent' : ''), {}, U.el('div.k', {}, k), U.el('div.l', {}, l),
      extra ? U.el('div.d', {}, extra) : null);
  }

  function basisExplain(basis, text) {
    return U.el('div', {},
      U.el('span.basis.' + basis, {}, basis),
      U.el('div', { style: { fontSize: '12px', color: 'var(--muted)', marginTop: '5px' } }, text));
  }

  // ---- comparison table -------------------------------------------------------------
  function comparisonTable(sprints) {
    // Row-level detail respects classification; portfolio totals above stay
    // whole-company aggregates (non-identifying) with a note when rows are hidden.
    const withBaseline = sprints.filter(s => s.baseline);
    const rows = withBaseline.filter(s => Store.canSee(s));
    const hiddenN = withBaseline.length - rows.length;
    const card = U.el('div.card', {}, U.el('h2', {}, '⇉ Baseline → final by sprint'),
      U.el('div.card-sub', {}, 'Time metrics: lower is better, so a negative Δ is an improvement. Rows open the sprint.'));
    if (!rows.length) {
      card.append(App.empty('◌', hiddenN ? 'No sprints at your access level' : 'No baselines recorded',
        hiddenN ? hiddenN + ' sprint(s) hidden by your access level; portfolio totals above still include them.'
          : 'Impact starts with a baseline — record one on a sprint to see it here.'));
      return card;
    }
    const tbl = U.el('table.tbl');
    tbl.append(U.el('thead', {}, U.el('tr', {},
      U.el('th', {}, 'Sprint'), U.el('th', {}, 'Dept'), U.el('th', {}, 'Baseline'), U.el('th', {}, 'Final'),
      U.el('th', {}, 'Δ'), U.el('th.num', {}, 'Hours/wk'), U.el('th.num', {}, 'Net £/yr'))));
    const tb = U.el('tbody');
    rows.forEach(s => {
      const b = s.baseline, f = s.final;
      const tr = U.el('tr.rowlink', { onclick: () => App.go('sprints/' + s.id) });
      tr.append(U.el('td', {},
        U.el('b', { style: { color: 'var(--ink)' } }, s.name),
        U.el('div', { style: { fontSize: '11.5px', color: 'var(--muted)' } }, b.metric)));
      tr.append(U.el('td', {}, s.dept));
      tr.append(resultCell(b));
      if (!f) {
        tr.append(U.el('td', {}, U.el('span.badge.b-info', {}, 'in flight')),
          U.el('td', {}, '—'), U.el('td.num', {}, '—'), U.el('td.num', {}, '—'));
      } else {
        tr.append(resultCell(f));
        if (b.unit !== f.unit) {
          tr.append(U.el('td', {}, U.el('span.badge.b-warn', {}, '⚠ units differ')));
        } else {
          const pct = b.value ? Math.round(((f.value - b.value) / b.value) * 100) : null;
          const improved = f.value < b.value;
          tr.append(U.el('td', {}, pct === null ? '—' : U.el('span', {
            style: { color: improved ? 'var(--good)' : 'var(--red)', fontWeight: '600' },
          }, (pct > 0 ? '+' : '−') + Math.abs(pct) + '%')));
        }
        const hrs = Calc.hoursSavedPerWeek(s);
        tr.append(U.el('td.num', {}, hrs === null ? '—' : U.fmtNum(hrs, 1)));
        const a = Calc.annualValue(s);
        tr.append(U.el('td.num', {}, a
          ? U.el('span', {}, U.el('b', { style: { color: 'var(--ink)' } }, U.fmtGBP(a.value)), ' ', U.el('span.basis.' + a.basis, {}, a.basis))
          : '—'));
      }
      tb.append(tr);
    });
    tbl.append(tb);
    card.append(U.el('div.tbl-wrap', {}, tbl));
    if (hiddenN) card.append(U.el('div', { style: { fontSize: '12px', color: 'var(--muted)', marginTop: '8px' } },
      hiddenN + ' sprint(s) hidden by your access level — portfolio totals above still include them.'));
    return card;
  }

  function resultCell(r) {
    return U.el('td', {},
      U.el('div', {}, U.fmtNum(r.value) + ' ' + r.unit),
      U.el('div', { style: { marginTop: '2px' } }, U.el('span.basis.' + r.basis, {}, r.basis)));
  }

  // ---- charts -------------------------------------------------------------------------
  function deptValueChart(withBoth) {
    const card = U.el('div.card', {}, U.el('h2', {}, '⌥ Net annual value by department'),
      U.el('div.card-sub', {}, 'Sprints with both a baseline and a final result.'));
    const deptMap = {};
    withBoth.forEach(s => {
      const a = Calc.annualValue(s);
      if (a) deptMap[s.dept] = (deptMap[s.dept] || 0) + a.value;
    });
    const items = Object.entries(deptMap).sort((a, b) => b[1] - a[1])
      .map(([label, value], i) => ({ label, value, color: Charts.series[i % Charts.series.length] }));
    card.append(U.el('div', { html: items.length ? Charts.bars(items, { label: 'Net annual value by department', format: v => U.fmtGBP(v), labelW: 140 }) : Charts.empty('No completed sprints yet') }));
    return card;
  }

  function evalTrendChart() {
    const card = U.el('div.card', {}, U.el('h2', {}, '∿ Eval score trend, 14 days'),
      U.el('div.card-sub', {}, 'Daily average evaluation score across all execution logs (failed runs carry no score).'));
    const logs = Store.get('execLogs');
    const labels = [], values = [];
    for (let i = 13; i >= 0; i--) {
      const key = U.daysAgo(i).slice(0, 10);
      const scored = logs.filter(l => l.ts.slice(0, 10) === key && l.evalScore !== null && l.evalScore !== undefined);
      labels.push(new Date(key + 'T00:00:00').toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }));
      values.push(scored.length ? Math.round(U.avg(scored, l => l.evalScore) * 100) / 100 : null);
    }
    card.append(U.el('div', { html: Charts.line([{ name: 'Avg eval score', values }], { labels, yMax: 5, area: true, format: v => U.fmtNum(v, 1), label: 'Eval score trend' }) }));
    return card;
  }

  // ---- cost card ----------------------------------------------------------------------------
  function costCard(logs14, stats) {
    const card = U.el('div.card', {}, U.el('h2', {}, '◍ Model spend, last 14 days'),
      U.el('div.card-sub', {}, 'Provider billing is USD; converted at the finance rate of ' + Store.assumptions().fxUsdGbp + ' USD→GBP.'));
    const byName = {};
    logs14.forEach(l => { byName[l.solutionName] = (byName[l.solutionName] || 0) + l.costUsd; });
    const fx = Store.assumptions().fxUsdGbp;
    const items = Object.entries(byName).sort((a, b) => b[1] - a[1])
      .map(([label, usd], i) => ({ label, value: Math.round(usd * fx * 100) / 100, color: Charts.series[i % Charts.series.length] }));
    card.append(U.el('div', { html: items.length
      ? Charts.donut(items, { label: 'Cost by solution', center: U.fmtGBP(stats.costGbp), centerSub: '14-day spend' })
      : Charts.empty('No execution logs in the last 14 days') }));
    card.append(U.el('div', { style: { marginTop: '10px', fontSize: '12.5px', color: 'var(--muted)' } },
      U.fmtNum(stats.tokens, 0) + ' tokens · avg latency ' + (stats.avgLatency === null ? '—' : U.fmtNum(stats.avgLatency, 0) + ' ms') + ' · ' + U.fmtNum(stats.runs, 0) + ' runs'));
    return card;
  }

  // ---- assumptions: the transparency contract --------------------------------------------------
  function assumptionsCard() {
    const a = Store.assumptions();
    const canEdit = Store.can('editSprint'); // pioneer-only
    const card = U.el('div.card', {}, U.el('h2', {}, '§ Assumptions — the transparency contract'),
      U.el('div.card-sub', {}, 'Every derived figure on this page is built from these inputs.'));

    const kv = U.el('dl.kv');
    const pair = (k, v, note) => {
      kv.append(U.el('dt', {}, k), U.el('dd', {},
        U.el('b', { style: { color: 'var(--ink)' } }, v), ' ',
        U.el('span', { style: { fontSize: '12px', color: 'var(--muted)' } }, '— ' + note)));
    };
    pair('Blended hourly rate', '£' + a.hourlyRate + '/h', a.hourlyRateNote);
    pair('Working weeks / year', String(a.workWeeksPerYear), a.workWeeksNote);
    pair('USD → GBP rate', String(a.fxUsdGbp), a.fxNote);
    pair('Adoption haircut', String(a.adoptionHaircut) + ' (non-measured figures × ' + a.adoptionHaircut + ')', a.adoptionNote);
    card.append(kv);

    card.append(U.el('div.assume', {},
      U.el('h4', {}, 'The formulas'),
      U.el('div.formula', {}, 'net £/yr = hours saved/wk × ' + a.workWeeksPerYear + ' wks × £' + a.hourlyRate + '/h × ' + a.adoptionHaircut + ' adoption haircut (skipped when the final is measured) − run cost × 12'),
      U.el('div.formula', {}, Calc.priorityFormula()),
      U.el('ul', {}, U.el('li', {}, 'Change an assumption and every projected figure recomputes — measured figures never move.'))));

    card.append(U.el('div', { style: { marginTop: '12px' } },
      canEdit
        ? U.el('button.btn.primary', { onclick: editAssumptionsModal }, '✎ Edit assumptions')
        : U.el('button.btn', { disabled: true, title: 'Only the AI Pioneer can edit assumptions' }, '✎ Edit assumptions'),
      !canEdit ? U.el('span', { style: { fontSize: '11.5px', color: 'var(--muted)', marginLeft: '10px' } }, 'Only the AI Pioneer can edit these.') : null));
    return card;
  }

  function editAssumptionsModal() {
    const cur = Store.assumptions();
    App.modal({
      title: 'Edit assumptions',
      body(el, close) {
        el.append(U.el('p', { style: { fontSize: '13px', color: 'var(--muted)' } },
          'These inputs drive every projected figure. Measured figures never move. The change is audited.'));
        const hr = U.el('input', { type: 'number', step: 'any', min: '1', max: '500', value: String(cur.hourlyRate) });
        const ww = U.el('input', { type: 'number', step: '1', min: '1', max: '52', value: String(cur.workWeeksPerYear) });
        const ah = U.el('input', { type: 'number', step: 'any', min: '0.1', max: '1', value: String(cur.adoptionHaircut) });
        const fHr = field('Blended hourly rate (£/h)', hr, '1 – 500');
        const fWw = field('Working weeks / year', ww, '1 – 52');
        const fAh = field('Adoption haircut', ah, '0.1 – 1 · applied to non-measured figures only');
        el.append(U.el('div.form-row', {}, fHr, fWw), fAh,
          U.el('div', { style: { display: 'flex', gap: '8px', justifyContent: 'flex-end', marginTop: '14px' } },
            U.el('button.btn', { onclick: close }, 'Cancel'),
            U.el('button.btn.primary', {
              onclick: () => {
                [fHr, fWw, fAh].forEach(clearErr);
                const vHr = parseFloat(hr.value), vWw = parseInt(ww.value, 10), vAh = parseFloat(ah.value);
                let bad = false;
                if (isNaN(vHr) || vHr < 1 || vHr > 500) { fieldErr(fHr, 'Enter a rate between 1 and 500.'); bad = true; }
                if (isNaN(vWw) || vWw < 1 || vWw > 52) { fieldErr(fWw, 'Enter weeks between 1 and 52.'); bad = true; }
                if (isNaN(vAh) || vAh < 0.1 || vAh > 1) { fieldErr(fAh, 'Enter a haircut between 0.1 and 1.'); bad = true; }
                if (bad) return;
                Store.async(() => {
                  const obj = Store.assumptions();
                  const before = { hourlyRate: obj.hourlyRate, workWeeksPerYear: obj.workWeeksPerYear, adoptionHaircut: obj.adoptionHaircut };
                  obj.hourlyRate = vHr; obj.workWeeksPerYear = vWw; obj.adoptionHaircut = vAh;
                  const after = { hourlyRate: vHr, workWeeksPerYear: vWw, adoptionHaircut: vAh };
                  const changed = Object.keys(after).filter(k => after[k] !== before[k]);
                  const detail = changed.length
                    ? changed.map(k => k + ' → ' + (k === 'hourlyRate' ? '£' + after[k] : after[k])).join(', ')
                    : 'Saved with no changes';
                  Store.audit('assumptions.updated', 'assumptions', 'global', detail, { before, after });
                  Store.save(); Store.emit();
                }).then(() => {
                  close();
                  App.toast('Assumptions updated — projected figures recomputed, measured figures untouched');
                  App.render();
                }).catch(err => App.toast(err.message, 'error'));
              },
            }, 'Save assumptions')));
      },
    });
  }

  // ---- small form helpers (local) -------------------------------------------------------------
  function field(label, input, hint) {
    return U.el('div.field', {}, U.el('label', {}, label), input, hint ? U.el('div.hint', {}, hint) : null);
  }
  function fieldErr(f, msg) {
    f.classList.add('invalid');
    let e = f.querySelector('.err');
    if (!e) { e = U.el('div.err'); f.append(e); }
    e.textContent = msg;
  }
  function clearErr(f) { f.classList.remove('invalid'); const e = f.querySelector('.err'); if (e) e.remove(); }
})();
