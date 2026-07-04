/* SwiggOS — views/reports.js
   Leadership reporting: period summaries, department mini-reports and an
   AI-drafted narrative that is always labelled, editable and review-gated. */
(function () {
  'use strict';

  const state = { period: 'all', dept: 'all', narrative: null, narrativeReviewed: false };

  App.view('reports', {
    title: 'Leadership reporting', navLabel: 'Leadership reporting', icon: '⎙',
    count() { return null; },
    render(root) {
      if (!Store.can('viewReports')) {
        root.append(App.pageHead('Leadership reporting'));
        root.append(App.denied('view leadership reporting'));
        return;
      }
      const u = Store.currentUser();
      root.append(App.pageHead('Leadership reporting',
        'The portfolio story for leadership — every figure computed live from the data behind it.',
        U.el('button.btn', { onclick: () => window.print() }, '⎙ Print view')));

      // period filter
      const periods = [{ k: '30', l: 'Last 30 days' }, { k: '90', l: 'This quarter' }, { k: 'all', l: 'All time' }];
      const chips = U.el('div.chip-row', { style: { marginBottom: '14px' } });
      periods.forEach(p => chips.append(U.el('span.chip' + (state.period === p.k ? '.sel' : ''), {
        onclick: () => { state.period = p.k; App.render(); },
      }, p.l)));
      root.append(chips);

      const inPeriod = iso => {
        if (state.period === 'all' || !iso) return state.period === 'all';
        return (Date.now() - new Date(iso).getTime()) / 86400000 <= Number(state.period);
      };
      const reqs = Store.get('requests').filter(r => state.period === 'all' || inPeriod(r.createdAt));
      const completed = Store.get('sprints').filter(s => s.status === 'complete' && (state.period === 'all' || inPeriod(s.endDate)));
      const annuals = completed.filter(s => s.baseline && s.final).map(s => ({ s, a: Calc.annualValue(s) })).filter(x => x.a);
      const totalValue = U.sum(annuals, x => x.a.value);
      const allMeasured = annuals.length && annuals.every(x => x.a.basis === 'measured');
      const live = Store.get('solutions').filter(s => s.status === 'live');
      // Item-level rows respect classification; headline counts stay portfolio aggregates.
      const annualsVisible = annuals.filter(x => Store.canSee(x.s));
      const hiddenDelivered = annuals.length - annualsVisible.length;

      const tiles = U.el('div.grid.cols-4');
      tiles.append(
        tile(String(reqs.length), 'Requests received'),
        tile(String(completed.length), 'Sprints delivered'),
        tile(U.fmtGBP(totalValue), 'Net annual value shipped',
          U.el('span.basis.' + (allMeasured ? 'measured' : 'estimated'), {}, annuals.length ? (allMeasured ? 'measured' : 'mixed basis') : 'n/a')),
        tile(String(live.length), 'Live solutions'));
      root.append(tiles);

      // delivered table
      const del = U.el('div.card', {}, U.el('h2', {}, '✓ Delivered'),
        U.el('div.card-sub', {}, 'Completed sprints with baseline → final evidence in the selected period.'));
      if (!annualsVisible.length) del.append(App.empty('✓', hiddenDelivered ? 'Delivered items are outside your access level' : 'Nothing delivered in this period', hiddenDelivered ? hiddenDelivered + ' delivered sprint(s) hidden by your access level; the value tile above still counts them.' : 'Widen the period to see the full history.'));
      else {
        const tbl = U.el('table.tbl');
        tbl.innerHTML = '<thead><tr><th>Sprint</th><th>Dept</th><th>Sponsor</th><th>What changed</th><th class="num">Net £/yr</th><th></th></tr></thead>';
        const tb = U.el('tbody');
        annualsVisible.forEach(({ s, a }) => {
          const sponsor = (s.stakeholders || []).find(x => /sponsor|owner/i.test(x.role));
          const tr = U.el('tr.rowlink', { onclick: () => App.go('sprints/' + s.id) });
          tr.append(
            U.el('td', {}, U.el('b', { style: { color: 'var(--ink)' } }, s.name)),
            U.el('td', {}, s.dept),
            U.el('td', {}, sponsor ? Store.userName(sponsor.user) : '—'),
            U.el('td', {}, s.baseline.value + ' → ' + s.final.value + ' ' + s.baseline.unit),
            U.el('td.num', {}, U.el('b', { style: { color: 'var(--ink)' } }, U.fmtGBP(a.value))),
            U.el('td', {}, U.el('span.basis.' + a.basis, {}, a.basis)));
          tb.append(tr);
        });
        tbl.append(tb);
        del.append(U.el('div.tbl-wrap', {}, tbl));
        if (hiddenDelivered) del.append(U.el('div', { style: { fontSize: '12px', color: 'var(--muted)', marginTop: '8px' } },
          hiddenDelivered + ' delivered sprint(s) hidden by your access level — the value tile above still counts them.'));
      }
      root.append(del);

      // in flight & next / risk & governance
      const grid = U.el('div.grid.cols-2');
      const flight = U.el('div.card', {}, U.el('h2', {}, '⚒ In flight & next'));
      const active = Store.get('sprints').filter(s => s.status === 'active');
      flight.append(U.el('h4', {}, 'In flight'));
      const activeVis = active.filter(s => Store.canSee(s));
      if (!activeVis.length) flight.append(U.el('div', { style: { color: 'var(--muted)', fontSize: '13px' } }, 'No active sprints' + (active.length ? ' at your access level.' : '.')));
      if (active.length - activeVis.length) flight.append(U.el('div', { style: { color: 'var(--muted)', fontSize: '12px', padding: '2px 0' } }, (active.length - activeVis.length) + ' sprint(s) hidden by your access level.'));
      activeVis.forEach(s => flight.append(U.el('div', { style: { padding: '5px 0', borderBottom: '1px solid var(--grid)' } },
        U.el('a', { href: '#/sprints/' + s.id }, s.name), ' ', U.el('span.badge.b-accent', {}, U.title(s.phase)),
        U.el('span', { style: { color: 'var(--muted)', fontSize: '12px' } }, ' · ' + s.dept))));
      flight.append(U.el('h4', { style: { marginTop: '12px' } }, 'Next up (top of backlog)'));
      Store.get('opportunities')
        .filter(o => ['backlog', 'ready', 'gated'].includes(o.status))
        .filter(o => Store.canSee(o))
        .sort((a, b) => (Calc.priorityScore(b.scores) || 0) - (Calc.priorityScore(a.scores) || 0))
        .slice(0, 3)
        .forEach(o => flight.append(U.el('div', { style: { padding: '5px 0', borderBottom: '1px solid var(--grid)' } },
          U.el('a', { href: '#/backlog/' + o.id }, o.title),
          U.el('span', { style: { color: 'var(--muted)', fontSize: '12px' } }, ' · score ' + (Calc.priorityScore(o.scores) || '—')),
          o.status === 'gated' ? U.el('span.badge.b-warn', { style: { marginLeft: '6px' } }, 'gated') : null)));
      grid.append(flight);

      const cards = Store.get('aiCards');
      const risk = U.el('div.card', {}, U.el('h2', {}, '⛨ Risk & governance'));
      const riskRows = [
        ['Open alerts', Store.get('alerts').filter(a => a.status === 'open').length, '#/governance/observability'],
        ['Open incidents', Store.get('incidents').filter(i => i.status === 'open').length, '#/governance/incidents'],
        ['Opportunities at approval gates', Store.get('opportunities').filter(o => o.status === 'gated').length, '#/backlog'],
        ['AI use cases approved', cards.filter(c => c.status === 'approved').length, '#/governance/rai'],
        ['AI use cases launch-gated', cards.filter(c => c.status === 'launch-gated').length, '#/governance/rai'],
        ['AI use cases in review', cards.filter(c => c.status === 'in-review').length, '#/governance/rai'],
      ];
      riskRows.forEach(([label, n, href]) => risk.append(U.el('div', {
        style: { display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid var(--grid)' },
      }, U.el('a', { href, style: { color: 'var(--ink-2)' } }, label), U.el('b', { style: { color: 'var(--ink)' } }, String(n)))));
      grid.append(risk);
      root.append(grid);

      // department mini-report
      const deptCard = U.el('div.card', {}, U.el('h2', {}, '⌂ Department mini-report'));
      const deptSel = U.el('select', { onchange: function () { state.dept = this.value; App.render(); } },
        U.el('option', { value: 'all' }, 'Choose a department…'),
        DEPTS.map(d => U.el('option', { value: d }, d)));
      deptSel.value = state.dept;
      deptCard.append(U.el('div.filters', {}, deptSel));
      if (state.dept !== 'all') {
        const dReqs = Store.get('requests').filter(r => r.dept === state.dept);
        const dSpr = Store.get('sprints').filter(s => s.dept === state.dept);
        const dAnn = dSpr.filter(s => s.baseline && s.final).map(s => Calc.annualValue(s)).filter(Boolean);
        deptCard.append(U.el('div.grid.cols-3', {},
          tile(String(dReqs.length), 'Requests from ' + state.dept),
          tile(String(dSpr.length), 'Sprints (all states)'),
          tile(U.fmtGBP(U.sum(dAnn, a => a.value)), 'Net annual value')));
        const dLive = Store.get('solutions').filter(s => s.dept === state.dept).filter(s => Store.canSee(s));
        if (dLive.length) {
          deptCard.append(U.el('h4', {}, 'Live solutions'));
          dLive.forEach(s => deptCard.append(U.el('div', { style: { padding: '4px 0' } },
            '• ', s.name, ' — owner ', Store.userName(s.owner))));
        }
      }
      root.append(deptCard);

      // AI narrative
      const narr = U.el('div.card', {}, U.el('h2', {}, '✦ Narrative for leadership'),
        U.el('div.card-sub', {}, 'Drafted by AI from the live portfolio data. Always labelled, always editable, never shared without human review.'));
      const canDraft = Store.can('generateNarrative'); // drafting + review is the Pioneer's job, not the reader's
      const genBtn = U.el('button.btn.primary', {
        onclick: () => {
          genBtn.disabled = true; genBtn.textContent = 'Drafting…';
          Store.async(() => {
            state.narrative = buildNarrative(annuals, active, completed, reqs);
            state.narrativeReviewed = false;
            Store.audit('report.generated', 'report', 'narrative', 'Leadership narrative drafted (AI-assisted) for period: ' + state.period);
            Store.save();
          }).then(() => App.render())
            .catch(e => { genBtn.disabled = false; genBtn.textContent = '✦ Generate narrative (AI)'; App.toast(e.message, 'error'); });
        },
      }, state.narrative ? '✦ Regenerate' : '✦ Generate narrative (AI)');
      if (!state.narrative) {
        narr.append(App.empty('✦', 'No narrative drafted yet',
          canDraft ? 'Generate a draft from the live data, then edit and review it before sharing.'
            : 'The AI Pioneer drafts, edits and reviews the narrative; leadership receives the reviewed version.',
          canDraft ? genBtn : null));
      } else {
        const ta = U.el('textarea', {
          readOnly: !canDraft,
          style: { minHeight: '300px', width: '100%', fontFamily: 'var(--mono)', fontSize: '12.5px' },
          oninput: function () { state.narrative = this.value; state.narrativeReviewed = false; },
        }, state.narrative);
        const copyBtn = U.el('button.btn', {}, '⧉ Copy');
        copyBtn.addEventListener('click', () => U.copy(state.narrative, copyBtn));
        narr.append(
          U.el('div', { style: { marginBottom: '8px' } }, App.aiFlag(state.narrativeReviewed)),
          U.el('div.field', {}, ta),
          U.el('div', { style: { display: 'flex', gap: '8px', flexWrap: 'wrap' } },
            canDraft ? genBtn : null, copyBtn,
            canDraft ? U.el('button.btn' + (state.narrativeReviewed ? '' : '.primary'), {
              onclick: () => {
                state.narrativeReviewed = true;
                Store.audit('report.reviewed', 'report', 'narrative', 'Narrative reviewed and approved by ' + Store.currentUser().name);
                Store.save();
                App.toast('Narrative marked as reviewed.');
                App.render();
              },
            }, state.narrativeReviewed ? '✓ Reviewed' : 'Mark reviewed') : null),
          U.el('div', { style: { fontSize: '11.5px', color: 'var(--muted)', marginTop: '8px' } },
            canDraft ? 'Session-only draft — copy it out to share. Generation and review are recorded in the audit trail.'
              : 'Read-only: drafting and review are restricted to the AI Pioneer.'));
      }
      root.append(narr);
    },
  });

  function tile(k, l, extra) {
    return U.el('div.stat', {}, U.el('div.k', {}, k), U.el('div.l', {}, l), extra ? U.el('div.d', {}, extra) : null);
  }

  function buildNarrative(annuals, active, completed, reqs) {
    const a = Store.assumptions();
    // The narrative is written to be shared — it only ever includes items the
    // drafting user can see, and says when items were excluded.
    const visAnnuals = annuals.filter(x => Store.canSee(x.s));
    const excludedShipped = annuals.length - visAnnuals.length;
    const measured = visAnnuals.filter(x => x.a.basis === 'measured');
    const projected = visAnnuals.filter(x => x.a.basis !== 'measured');
    const gatedAll = Store.get('opportunities').filter(o => o.status === 'gated');
    const gated = gatedAll.filter(o => Store.canSee(o));
    const excludedGated = gatedAll.length - gated.length;
    const openAlerts = Store.get('alerts').filter(x => x.status === 'open');
    const openIncidents = Store.get('incidents').filter(i => i.status === 'open');
    const periodLabel = { 30: 'the last 30 days', 90: 'this quarter', all: 'the programme to date' }[state.period] || 'the period';
    const L = [];
    L.push('AI DELIVERY UPDATE — ' + periodLabel.toUpperCase());
    L.push('');
    L.push('SHIPPED');
    if (!visAnnuals.length) L.push('- No sprints completed in this period.');
    visAnnuals.forEach(({ s, a: av }) => L.push('- ' + s.name + ' (' + s.dept + '): ' + s.baseline.value + ' → ' + s.final.value + ' ' + s.baseline.unit +
      '; net ' + U.fmtGBP(av.value) + '/yr [' + av.basis + ']'));
    if (excludedShipped) L.push('- (' + excludedShipped + ' delivered item(s) excluded — outside your access level; totals in Impact include them.)');
    L.push('');
    L.push('IN FLIGHT');
    const visActive = active.filter(s => Store.canSee(s));
    if (!visActive.length) L.push('- Nothing in flight.');
    visActive.forEach(s => L.push('- ' + s.name + ' (' + s.dept + '), phase: ' + s.phase +
      ((s.blockers || []).some(b => b.status === 'open') ? ' — has open blockers' : '')));
    if (active.length - visActive.length) L.push('- (' + (active.length - visActive.length) + ' sprint(s) excluded — outside your access level.)');
    L.push('');
    L.push('GATED / WAITING');
    if (!gated.length) L.push('- No opportunities waiting at approval gates' + (excludedGated ? ' visible at your access level.' : '.'));
    gated.forEach(o => L.push('- ' + o.title + ' (' + o.dept + '): waiting on ' +
      ['security', 'legal'].filter(k => o.approvals && o.approvals[k] && o.approvals[k].status === 'pending').join(' + ') + ' review'));
    if (excludedGated && gated.length) L.push('- (' + excludedGated + ' gated item(s) excluded — outside your access level.)');
    L.push('');
    L.push('IMPACT — measured vs projected (never blended silently)');
    L.push('- Measured (post-launch, observed): ' + U.fmtGBP(U.sum(measured, x => x.a.value)) + '/yr across ' + measured.length + ' solution(s)');
    L.push('- Projected (adoption-discounted): ' + U.fmtGBP(U.sum(projected, x => x.a.value)) + '/yr across ' + projected.length + ' solution(s)');
    L.push('- Assumptions: £' + a.hourlyRate + '/h blended rate; ' + a.workWeeksPerYear + ' working weeks/yr; ' +
      Math.round((1 - a.adoptionHaircut) * 100) + '% adoption haircut on non-measured figures. Full basis on the Impact dashboard.');
    L.push('');
    L.push('RISKS');
    if (!openAlerts.length && !openIncidents.length) L.push('- No open alerts or incidents.');
    openAlerts.forEach(x => L.push('- Alert (' + x.severity + '): ' + x.solutionName + ' — ' + x.message));
    openIncidents.forEach(i => L.push('- Incident (' + i.severity + ', open): ' + i.title));
    L.push('');
    L.push('ASKS');
    L.push('- ' + (gated.length ? 'Reviewer time to clear ' + gated.length + ' gated item(s).' : 'None blocking.'));
    L.push('- Intake is live: ' + reqs.filter(r => ['new', 'clarifying'].includes(r.status)).length + ' request(s) in triage.');
    L.push('');
    L.push('[Drafted with AI assistance from live SwiggOS data; reviewed by a human before sharing.]');
    return L.join('\n');
  }
})();
