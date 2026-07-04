/* SwiggOS — views/dashboard.js
   AI Pioneer dashboard: portfolio health at a glance.
   Adapts by role: employees get a personal intake-focused view. */
(function () {
  'use strict';

  App.view('dashboard', {
    title: 'Dashboard', navLabel: 'Dashboard', icon: '⌂',
    render(root) {
      const u = Store.currentUser();
      if (u.role === 'employee') return renderEmployee(root, u);
      renderPioneer(root, u);
    },
  });

  function renderEmployee(root, u) {
    root.append(App.pageHead('Welcome, ' + u.name.split(' ')[0],
      'Got a repetitive process, a business problem or an AI idea? Submit it and the AI Pioneer will triage it.',
      U.el('button.btn.primary', { onclick: () => App.go('requests/new') }, '+ Submit a request')));

    const mine = Store.get('requests').filter(r => r.submitter === u.id);
    const wrap = U.el('div.card', {}, U.el('h2', {}, 'Your submissions'));
    if (!mine.length) {
      wrap.append(App.empty('✎', 'Nothing submitted yet', 'Your requests and their triage status will appear here.',
        U.el('button.btn.primary', { onclick: () => App.go('requests/new') }, 'Submit your first request')));
    } else {
      const tbl = U.el('table.tbl');
      tbl.innerHTML = '<thead><tr><th>Request</th><th>Status</th><th>Submitted</th></tr></thead>';
      const tb = U.el('tbody');
      mine.forEach(r => {
        const tr = U.el('tr.rowlink', { onclick: () => App.go('requests/' + r.id) });
        tr.innerHTML = '<td><b>' + U.esc(r.title) + '</b><br><span style="color:var(--muted);font-size:12px">' + U.esc(r.type) + ' · ' + U.esc(r.dept) + '</span></td>' +
          '<td>' + statusBadge(r.status) + '</td><td>' + U.timeAgo(r.createdAt) + '</td>';
        tb.append(tr);
      });
      tbl.append(tb);
      wrap.append(U.el('div.tbl-wrap', {}, tbl));
    }
    root.append(wrap);

    const assets = Store.get('assets').slice(0, 4);
    const lib = U.el('div.card', {}, U.el('h2', {}, 'From the asset library'),
      U.el('div.card-sub', {}, 'Reusable prompts, workflows and lessons from previous sprints — browse before you build.'));
    assets.forEach(a => lib.append(U.el('div', { style: { padding: '7px 0', borderBottom: '1px solid var(--grid)' } },
      U.el('a', { href: '#/assets/' + a.id }, a.name), ' ', U.el('span.badge.b-violet', {}, a.type))));
    root.append(lib);
  }

  function renderPioneer(root, u) {
    const readonly = !Store.can('prioritise');
    root.append(App.pageHead('AI Pioneer dashboard',
      readonly ? 'Read-only portfolio view for ' + ROLES[u.role].label + '.' : 'The forge floor: intake, delivery, impact and risk in one sweep.',
      U.el('button.btn', { onclick: () => App.go('reports') }, '⎙ Leadership report'),
      Store.can('triage') ? U.el('button.btn.primary', { onclick: () => App.go('requests') }, '⚑ Triage queue') : null));

    // ---- headline tiles -----------------------------------------------------
    const done = Store.get('sprints').filter(s => s.baseline && s.final);
    const annuals = done.map(s => Calc.annualValue(s)).filter(Boolean);
    const totalAnnual = U.sum(annuals, a => a.value);
    const totalHrs = U.sum(annuals, a => a.hoursPerWeek);
    const active = Store.get('sprints').filter(s => s.status === 'active');
    const newReqs = Store.get('requests').filter(r => r.status === 'new' || r.status === 'clarifying').length;
    const openAlerts = Store.get('alerts').filter(a => a.status === 'open').length;
    const allMeasured = annuals.length && annuals.every(a => a.basis === 'measured');

    const tiles = U.el('div.grid.cols-4');
    tiles.append(
      stat(U.fmtGBP(totalAnnual), 'Annualised net value shipped',
        U.el('span.basis.' + (allMeasured ? 'measured' : 'estimated'), {}, allMeasured ? 'measured' : 'mixed basis'), true),
      stat(U.fmtNum(totalHrs, 1) + ' h', 'Hours handed back per week', null),
      stat(String(active.length), 'Sprints in flight', U.el('a', { href: '#/sprints', style: { fontSize: '11.5px' } }, 'open workspace')),
      stat(String(openAlerts), 'Open alerts', openAlerts ? U.el('span.badge.b-crit', {}, 'needs attention') : U.el('span.badge.b-ok', {}, 'all quiet')),
    );
    root.append(tiles);

    // ---- needs attention -------------------------------------------------------
    // Everything in this list is classification-filtered: aggregation must not
    // leak titles/links the viewer's role can't open (see Store.canSee).
    const attention = [];
    Store.get('alerts').filter(a => a.status === 'open')
      .filter(a => Store.canSee(Store.byId('solutions', a.solution) || Store.byId('sprints', a.solution) || {}))
      .forEach(a =>
        attention.push({ sev: a.severity, text: a.solutionName + ': ' + a.message, href: '#/governance/observability', kind: 'Alert' }));
    Store.get('sprints').filter(s => Store.canSee(s)).forEach(s => (s.blockers || []).filter(b => b.status === 'open').forEach(b =>
      attention.push({ sev: b.severity, text: s.name + ' — blocker: ' + b.text, href: '#/sprints/' + s.id, kind: 'Blocker' })));
    Store.get('opportunities').filter(o => o.status === 'gated').filter(o => Store.canSee(o)).forEach(o =>
      attention.push({ sev: 'medium', text: o.title + ' waiting on ' + pendingGates(o).join(' + ') + ' approval', href: '#/backlog/' + o.id, kind: 'Gate' }));
    Store.get('requests').filter(r => r.status === 'new').filter(r => Store.canSee(r)).forEach(r =>
      attention.push({ sev: 'low', text: 'New request from ' + Store.userName(r.submitter) + ': ' + r.title, href: '#/requests/' + r.id, kind: 'Intake' }));

    const sevRank = { critical: 0, high: 1, medium: 2, low: 3 };
    attention.sort((a, b) => (sevRank[a.sev] ?? 4) - (sevRank[b.sev] ?? 4));

    const grid = U.el('div.grid.cols-2');
    const att = U.el('div.card', {}, U.el('h2', {}, '⚠ Needs attention', ' ', U.el('span.pill.badge.b-muted', {}, String(attention.length))));
    if (!attention.length) att.append(App.empty('✓', 'Nothing on fire', 'No open alerts, blockers or waiting gates.'));
    else attention.slice(0, 7).forEach(a => {
      att.append(U.el('div', { style: { display: 'flex', gap: '9px', padding: '7px 0', borderBottom: '1px solid var(--grid)', alignItems: 'baseline' } },
        U.el('span.badge.' + U.sevClass(a.sev), {}, a.sev),
        U.el('a', { href: a.href, style: { color: 'var(--ink-2)', flex: '1' } }, a.text),
        U.el('span', { style: { fontSize: '11px', color: 'var(--muted)' } }, a.kind)));
    });
    grid.append(att);

    // ---- pipeline funnel ---------------------------------------------------------
    const reqs = Store.get('requests');
    const opps = Store.get('opportunities');
    const pipe = U.el('div.card', {}, U.el('h2', {}, '⇶ Pipeline'),
      U.el('div.card-sub', {}, 'From raw request to handed-over solution.'));
    const stages = [
      { label: 'Intake (new/clarifying)', value: reqs.filter(r => ['new', 'clarifying'].includes(r.status)).length, color: '#3987e5' },
      { label: 'Assessed', value: reqs.filter(r => r.status === 'assessed').length, color: '#3987e5' },
      { label: 'Backlog', value: opps.filter(o => ['backlog', 'ready'].includes(o.status)).length, color: '#199e70' },
      { label: 'Gated (approvals)', value: opps.filter(o => o.status === 'gated').length, color: '#c98500' },
      { label: 'In sprint', value: opps.filter(o => o.status === 'in-sprint').length, color: '#ff6633' },
      { label: 'Live & handed over', value: Store.get('solutions').filter(s => s.status === 'live').length, color: '#008300' },
    ];
    pipe.append(U.el('div', { html: Charts.bars(stages, { label: 'Pipeline stages', format: v => U.fmtNum(v, 0), labelW: 170 }) }));
    grid.append(pipe);
    root.append(grid);

    // ---- sprints in flight ----------------------------------------------------------
    const sprintCard = U.el('div.card', {}, U.el('h2', {}, '⚒ Sprints in flight'));
    const activeVisible = active.filter(s => Store.canSee(s));
    const hiddenSprints = active.length - activeVisible.length;
    if (!activeVisible.length) sprintCard.append(App.empty('⚒', 'No active sprints' + (hiddenSprints ? ' at your access level' : ''), hiddenSprints ? hiddenSprints + ' sprint(s) hidden by your access level.' : 'Convert a backlog opportunity to start one.',
      Store.can('createSprint') ? U.el('button.btn.primary', { onclick: () => App.go('backlog') }, 'Open backlog') : null));
    const sGrid = U.el('div.grid.cols-2');
    activeVisible.forEach(s => {
      const total = PHASES.reduce((t, p) => t + s.phases[p].items.length, 0);
      const doneN = PHASES.reduce((t, p) => t + s.phases[p].items.filter(i => i.done).length, 0);
      const dayN = U.clamp(U.workingDaysBetween(s.startDate, new Date().toISOString()), 1, 10);
      const openBlockers = (s.blockers || []).filter(b => b.status === 'open').length;
      const c = U.el('div.card', { style: { cursor: 'pointer' }, onclick: () => App.go('sprints/' + s.id) },
        U.el('h3', {}, s.name, ' ', U.el('span.badge.b-accent', {}, 'day ' + dayN + ' of 10')),
        U.el('div.card-sub', {}, s.dept + ' · phase: ' + U.title(s.phase)),
        U.el('div.progressbar', {}, U.el('i', { style: { width: Math.round((doneN / Math.max(1, total)) * 100) + '%' } })),
        U.el('div', { style: { display: 'flex', justifyContent: 'space-between', marginTop: '7px', fontSize: '12px', color: 'var(--muted)' } },
          U.el('span', {}, doneN + '/' + total + ' checklist items'),
          openBlockers ? U.el('span.badge.b-serious', {}, openBlockers + ' blocker' + (openBlockers > 1 ? 's' : '')) : U.el('span.badge.b-ok', {}, 'no blockers')));
      sGrid.append(c);
    });
    if (activeVisible.length) sprintCard.append(sGrid);
    if (activeVisible.length && hiddenSprints) sprintCard.append(U.el('div', { style: { fontSize: '12px', color: 'var(--muted)', marginTop: '8px' } }, hiddenSprints + ' sprint(s) hidden by your access level.'));
    root.append(sprintCard);

    // ---- value by department + activity ----------------------------------------------
    const grid2 = U.el('div.grid.cols-2');
    const deptMap = {};
    done.forEach(s => {
      const a = Calc.annualValue(s);
      if (a) deptMap[s.dept] = (deptMap[s.dept] || 0) + a.value;
    });
    const deptCard = U.el('div.card', {}, U.el('h2', {}, '⌥ Net annual value by department'),
      U.el('div.card-sub', {}, 'Completed sprints with measured baselines and finals.'));
    const deptItems = Object.entries(deptMap).sort((a, b) => b[1] - a[1]).map(([k, v], i) => ({ label: k, value: v, color: Charts.series[i % 6] }));
    deptCard.append(U.el('div', { html: deptItems.length ? Charts.bars(deptItems, { format: v => U.fmtGBP(v), labelW: 140 }) : Charts.empty('No completed sprints yet') }));
    deptCard.append(U.el('div.assume', {},
      U.el('h4', {}, 'How this is calculated'),
      U.el('div.formula', {}, 'net = h/wk saved × ' + Store.assumptions().workWeeksPerYear + ' wks × £' + Store.assumptions().hourlyRate + '/h − run cost'),
      U.el('ul', {}, U.el('li', {}, Store.assumptions().hourlyRateNote), U.el('li', {}, 'Full assumptions on the ', U.el('a', { href: '#/impact' }, 'Impact dashboard'), '.'))));
    grid2.append(deptCard);

    const act = U.el('div.card', {}, U.el('h2', {}, '≡ Recent activity'),
      U.el('div.card-sub', {}, 'From the audit trail — every change is recorded.'));
    Store.get('audit').slice(0, 8).forEach(a => {
      act.append(U.el('div', { style: { padding: '6px 0', borderBottom: '1px solid var(--grid)', fontSize: '12.5px' } },
        U.el('div', {}, U.el('b', { style: { color: 'var(--ink)' } }, Store.userName(a.actor)), ' · ', U.el('span.mono', { style: { color: 'var(--violet)' } }, a.action), ' ', U.el('span', { style: { color: 'var(--muted)' } }, '→ ' + a.entityId)),
        U.el('div', { style: { color: 'var(--muted)', fontSize: '11.5px' } }, a.detail + ' · ' + U.timeAgo(a.ts))));
    });
    act.append(U.el('div', { style: { marginTop: '8px' } }, U.el('a', { href: '#/governance/audit' }, 'Full audit trail →')));
    grid2.append(act);
    root.append(grid2);
  }

  function stat(k, l, extra, accent) {
    return U.el('div.stat' + (accent ? '.accent' : ''), {}, U.el('div.k', {}, k), U.el('div.l', {}, l),
      extra ? U.el('div.d', {}, extra) : null);
  }

  function pendingGates(o) {
    const out = [];
    if (o.approvals && o.approvals.security && o.approvals.security.status === 'pending') out.push('security');
    if (o.approvals && o.approvals.legal && o.approvals.legal.status === 'pending') out.push('legal');
    return out.length ? out : ['approval'];
  }

  function statusBadge(s) {
    const map = { new: 'b-info', clarifying: 'b-warn', assessed: 'b-violet', accepted: 'b-ok', declined: 'b-crit' };
    return '<span class="badge ' + (map[s] || 'b-muted') + '">' + U.esc(U.title(s)) + '</span>';
  }

  // Shared status badge helpers for other views.
  window.VBits = { statusBadge, stat, pendingGates };
})();
