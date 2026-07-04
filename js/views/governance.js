/* SwiggOS — views/governance.js
   Observability & Governance hub: telemetry, security & access, responsible AI,
   audit trail and incidents. Read gate: viewGovernance. Mutations per PERMS. */
(function () {
  'use strict';

  const TABS = [
    ['observability', '⌗ Observability'],
    ['security', '⛨ Security & access'],
    ['rai', '✦ Responsible AI'],
    ['audit', '≡ Audit trail'],
    ['incidents', '⚠ Incidents'],
  ];
  const TAB_KEYS = TABS.map(t => t[0]);

  // Expanded-state that survives App.render() re-draws.
  const expandedCards = {};

  App.view('governance', {
    title: 'Observability & Governance',
    navLabel: 'Observability & Governance',
    icon: '⛨',
    count() {
      return Store.get('alerts').filter(a => a.status === 'open').length +
        Store.get('incidents').filter(i => i.status === 'open').length;
    },
    render(root, params) {
      const tab = TAB_KEYS.includes(params && params[0]) ? params[0] : 'observability';

      const actions = [];
      if (tab === 'incidents' && Store.can('manageIncidents')) {
        actions.push(U.el('button.btn.primary', { onclick: raiseIncidentModal }, '⊕ Raise incident'));
      }
      root.append(App.pageHead('Observability & Governance',
        'Telemetry, access control, responsible-AI cards, the audit trail and incident management — in one place.',
        ...actions));

      if (!Store.can('viewGovernance')) {
        root.append(App.denied('view governance data'));
        return;
      }

      const bar = U.el('div.tabs');
      TABS.forEach(([key, label]) => {
        bar.append(U.el('button' + (key === tab ? '.active' : ''), {
          onclick: () => { location.hash = '#/governance/' + key; },
        }, label));
      });
      root.append(bar);

      if (tab === 'observability') renderObservability(root);
      else if (tab === 'security') renderSecurity(root);
      else if (tab === 'rai') renderRai(root);
      else if (tab === 'audit') renderAudit(root);
      else renderIncidents(root);
    },
  });

  // ---- shared bits -----------------------------------------------------------
  function stat(k, l, extra, accent) {
    return U.el('div.stat' + (accent ? '.accent' : ''), {},
      U.el('div.k', {}, k), U.el('div.l', {}, l),
      extra ? U.el('div.d', {}, extra) : null);
  }
  function badge(text, cls) { return U.el('span.badge.' + (cls || 'b-muted'), {}, text); }
  function intro(text) {
    return U.el('div', { style: { color: 'var(--muted)', fontSize: '13px', margin: '-4px 0 14px' } }, text);
  }
  function field(label, input, hint) {
    return U.el('div.field', {}, U.el('label', {}, label), input, hint ? U.el('div.hint', {}, hint) : null);
  }
  function modalButtons(close, okLabel, onOk) {
    return U.el('div', { style: { display: 'flex', gap: '8px', justifyContent: 'flex-end', marginTop: '14px' } },
      U.el('button.btn', { onclick: close }, 'Cancel'),
      U.el('button.btn.primary', { onclick: onOk }, okLabel));
  }
  function markInvalid(inputEl, on) {
    const f = inputEl.closest('.field');
    if (f) f.classList.toggle('invalid', !!on);
  }
  const SEV_RANK = { critical: 0, high: 1, medium: 2, low: 3 };
  function alertStatusBadge(s) {
    return badge(U.title(s), { open: 'b-crit', acknowledged: 'b-warn', resolved: 'b-ok' }[s] || 'b-muted');
  }
  function solutionOrSprintName(id) {
    if (!id) return null;
    const s = Store.byId('solutions', id) || Store.byId('sprints', id);
    return s ? s.name : id;
  }
  function fmtTokens(n) {
    return n >= 1000 ? U.fmtNum(n / 1000, 0) + 'k tokens' : U.fmtNum(n, 0) + ' tokens';
  }

  /* =========================================================================
     TAB 1 — OBSERVABILITY
     ========================================================================= */
  function renderObservability(root) {
    root.append(intro('Every AI solution ships with its telemetry — no black boxes.'));

    const cutoff = U.daysAgo(14);
    const allLogs = Store.get('execLogs');
    const logs14 = allLogs.filter(l => l.ts >= cutoff);
    const st = Calc.logStats(logs14);
    const openAlerts = Store.get('alerts').filter(a => a.status === 'open').length;

    // ---- tiles ---------------------------------------------------------------
    const t1 = U.el('div.grid.cols-4');
    t1.append(
      stat(U.fmtNum(st.runs, 0), 'Runs (14 days)', null, true),
      stat(U.fmtPct(st.successRate, 1), 'Success rate', 'retry rate ' + U.fmtPct(st.retryRate, 1)),
      stat(U.fmtGBP(st.costGbp), 'Cost (14 days)', fmtTokens(st.tokens)),
      stat(U.fmtNum(st.avgLatency, 0) + ' ms', 'Avg latency', null));
    const t2 = U.el('div.grid.cols-4');
    t2.append(
      stat(U.fmtNum(st.overrides, 0), 'Human overrides', U.fmtPct(st.overrideRate, 1) + ' of runs'),
      stat(st.avgEval === null ? '—' : U.fmtNum(st.avgEval, 1) + ' /5', 'Avg eval score', null),
      stat(U.fmtNum(st.failed, 0), 'Failures (14 days)', st.failed ? badge('investigate', 'b-crit') : badge('healthy', 'b-ok')),
      stat(String(openAlerts), 'Active alerts', openAlerts ? badge('needs attention', 'b-crit') : badge('all quiet', 'b-ok')));
    root.append(t1, t2);

    // ---- charts ---------------------------------------------------------------
    const days = [];
    for (let i = 13; i >= 0; i--) {
      const iso = U.daysAgo(i);
      days.push({
        key: iso.slice(0, 10),
        label: new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }),
      });
    }
    const byDay = {};
    days.forEach(dy => { byDay[dy.key] = []; });
    logs14.forEach(l => { const k = l.ts.slice(0, 10); if (byDay[k]) byDay[k].push(l); });

    const runVals = days.map(dy => byDay[dy.key].length);
    const failVals = days.map(dy => byDay[dy.key].filter(l => l.status === 'failure').length);
    const evalVals = days.map(dy => {
      const scored = byDay[dy.key].filter(l => l.evalScore !== null && l.evalScore !== undefined);
      return scored.length ? Math.round(U.avg(scored, l => l.evalScore) * 100) / 100 : null;
    });
    const labels = days.map(dy => dy.label);

    const chartGrid = U.el('div.grid.cols-2');
    chartGrid.append(
      U.el('div.card', {}, U.el('h2', {}, '⇅ Runs per day'),
        U.el('div.card-sub', {}, 'All executions across live solutions and pilots, last 14 days.'),
        U.el('div', {
          html: Charts.line([
            { name: 'Runs', values: runVals },
            { name: 'Failures', values: failVals, color: '#e66767' },
          ], { labels, label: 'Runs per day', format: v => U.fmtNum(v, 0) }),
        })),
      U.el('div.card', {}, U.el('h2', {}, '◔ Eval score trend'),
        U.el('div.card-sub', {}, 'Daily average evaluation score (0–5). Declines fire alerts automatically.'),
        U.el('div', {
          html: Charts.line([{ name: 'Avg eval', values: evalVals, color: '#199e70' }],
            { labels, yMax: 5, label: 'Eval score trend', format: v => U.fmtNum(v, 1) }),
        })));
    root.append(chartGrid);

    // ---- alerts ---------------------------------------------------------------
    root.append(alertsCard());

    // ---- per-solution table -----------------------------------------------------
    root.append(perSolutionCard(logs14));

    // ---- execution log ---------------------------------------------------------
    root.append(execLogCard(allLogs));
  }

  function alertsCard() {
    const canAct = Store.can('ackAlert');
    const alerts = Store.get('alerts').slice().sort((a, b) => {
      const so = (a.status === 'open' ? 0 : 1) - (b.status === 'open' ? 0 : 1);
      if (so) return so;
      return (SEV_RANK[a.severity] ?? 4) - (SEV_RANK[b.severity] ?? 4);
    });
    const card = U.el('div.card', {},
      U.el('h2', {}, '⚠ Alerts', ' ', badge(String(alerts.filter(a => a.status === 'open').length) + ' open', 'b-muted')),
      U.el('div.card-sub', {}, 'Alerts — failures, unusual behaviour, declining performance.' +
        (canAct ? '' : ' Read-only for your role: acknowledging and resolving requires the AI Pioneer or Security Reviewer.')));
    if (!alerts.length) {
      card.append(App.empty('✓', 'No alerts', 'Nothing has fired. Telemetry keeps watching.'));
      return card;
    }
    alerts.forEach(a => {
      const row = U.el('div', { style: { display: 'flex', gap: '9px', padding: '9px 0', borderBottom: '1px solid var(--grid)', alignItems: 'baseline', flexWrap: 'wrap' } },
        badge(a.severity, U.sevClass(a.severity)),
        U.el('span', { style: { flex: '1', minWidth: '220px' } },
          U.el('b', { style: { color: 'var(--ink)' } }, a.solutionName), ' — ', a.message,
          a.resolutionNote ? U.el('div', { style: { fontSize: '11.5px', color: 'var(--muted)' } }, 'Resolution: ' + a.resolutionNote) : null),
        U.el('span.chip', {}, a.kind),
        U.el('span', { style: { fontSize: '11.5px', color: 'var(--muted)', whiteSpace: 'nowrap' } }, U.timeAgo(a.ts)),
        alertStatusBadge(a.status));
      if (canAct) {
        const btns = U.el('span', { style: { display: 'inline-flex', gap: '6px' } });
        if (a.status === 'open') {
          btns.append(U.el('button.btn.sm', {
            onclick: () => Store.async(() =>
              Store.update('alerts', a.id, { status: 'acknowledged' }, 'alert.acknowledged',
                'Acknowledged alert on ' + a.solutionName)
            ).then(() => { App.toast('Alert acknowledged.'); App.render(); })
              .catch(err => App.toast(err.message, 'error')),
          }, 'Acknowledge'));
        }
        if (a.status === 'open' || a.status === 'acknowledged') {
          btns.append(U.el('button.btn.sm', { onclick: () => resolveAlertModal(a) }, 'Resolve'));
        }
        if (btns.childNodes.length) row.append(btns);
      }
      card.append(row);
    });
    return card;
  }

  function resolveAlertModal(a) {
    App.modal({
      title: 'Resolve alert — ' + a.solutionName,
      body(el, close) {
        const ta = U.el('textarea', { placeholder: 'What was done and why the alert can be closed…' });
        el.append(
          U.el('p', { style: { fontSize: '13px' } }, a.message),
          field('Resolution note *', ta, 'Required — the note lands in the audit trail with the alert.'));
        el.append(modalButtons(close, 'Resolve alert', () => {
          const note = ta.value.trim();
          if (!note) { markInvalid(ta, true); return; }
          close();
          Store.async(() =>
            Store.update('alerts', a.id, {
              status: 'resolved', resolvedAt: new Date().toISOString(), resolutionNote: note,
            }, 'alert.resolved', 'Resolved alert on ' + a.solutionName + ': ' + note)
          ).then(() => { App.toast('Alert resolved.'); App.render(); })
            .catch(err => App.toast(err.message, 'error'));
        }));
      },
    });
  }

  function perSolutionCard(logs14) {
    const card = U.el('div.card', {}, U.el('h2', {}, '⊞ Per-solution telemetry'),
      U.el('div.card-sub', {}, 'Aggregates over the last 14 days, grouped by solution.'));
    const groups = {};
    logs14.forEach(l => { (groups[l.solutionName] = groups[l.solutionName] || []).push(l); });
    const names = Object.keys(groups).sort();
    if (!names.length) {
      card.append(App.empty('⊞', 'No executions in the last 14 days', 'Telemetry will populate as solutions run.'));
      return card;
    }
    const tbl = U.el('table.tbl');
    tbl.innerHTML = '<thead><tr><th>Solution</th><th>Model(s)</th><th>Prompt ver</th>' +
      '<th class="num">Runs</th><th class="num">Success %</th><th class="num">Retry %</th>' +
      '<th class="num">Overrides</th><th class="num">Avg eval</th><th class="num">Cost £ (14d)</th></tr></thead>';
    const tb = U.el('tbody');
    names.forEach(name => {
      const gl = groups[name]; // newest first (source order)
      const gs = Calc.logStats(gl);
      const models = [...new Set(gl.map(l => l.model))].sort().join(', ');
      const tr = U.el('tr');
      tr.innerHTML =
        '<td><b>' + U.esc(name) + '</b></td>' +
        '<td class="mono">' + U.esc(models) + '</td>' +
        '<td class="mono">' + U.esc(gl[0].promptVersion) + '</td>' +
        '<td class="num">' + U.esc(U.fmtNum(gs.runs, 0)) + '</td>' +
        '<td class="num">' + U.esc(U.fmtPct(gs.successRate, 1)) + '</td>' +
        '<td class="num">' + U.esc(U.fmtPct(gs.retryRate, 1)) + '</td>' +
        '<td class="num">' + U.esc(U.fmtNum(gs.overrides, 0)) + '</td>' +
        '<td class="num">' + (gs.avgEval === null ? '—' : U.esc(U.fmtNum(gs.avgEval, 1))) + '</td>' +
        '<td class="num">' + U.esc(U.fmtGBP(gs.costGbp)) + '</td>';
      tb.append(tr);
    });
    tbl.append(tb);
    card.append(U.el('div.tbl-wrap', {}, tbl));
    return card;
  }

  function execLogCard(allLogs) {
    const card = U.el('div.card', {}, U.el('h2', {}, '≣ Execution log'),
      U.el('div.card-sub', {}, 'The audit-grade trail: every run with model, prompt version, tokens, cost, outcome and human overrides.'));

    const solutions = [...new Set(allLogs.map(l => l.solutionName))].sort();
    const models = [...new Set(allLogs.map(l => l.model))].sort();
    const f = { solution: 'all', status: 'all', model: 'all', overridesOnly: false, shown: 25 };

    const selSol = U.el('select', { onchange: e => { f.solution = e.target.value; f.shown = 25; redraw(); } },
      U.el('option', { value: 'all' }, 'All solutions'),
      ...solutions.map(s => U.el('option', { value: s }, s)));
    const selStatus = U.el('select', { onchange: e => { f.status = e.target.value; f.shown = 25; redraw(); } },
      U.el('option', { value: 'all' }, 'All statuses'),
      U.el('option', { value: 'success' }, 'Success'),
      U.el('option', { value: 'retried' }, 'Retried'),
      U.el('option', { value: 'failure' }, 'Failure'));
    const selModel = U.el('select', { onchange: e => { f.model = e.target.value; f.shown = 25; redraw(); } },
      U.el('option', { value: 'all' }, 'All models'),
      ...models.map(m => U.el('option', { value: m }, m)));
    const cb = U.el('input', { type: 'checkbox', onchange: e => { f.overridesOnly = e.target.checked; f.shown = 25; redraw(); } });
    card.append(U.el('div.filters', {}, selSol, selStatus, selModel,
      U.el('label', { style: { display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '12.5px', color: 'var(--ink-2)' } },
        cb, 'Overrides only')));

    const body = U.el('div');
    card.append(body);

    function filtered() {
      return allLogs.filter(l =>
        (f.solution === 'all' || l.solutionName === f.solution) &&
        (f.status === 'all' || l.status === f.status) &&
        (f.model === 'all' || l.model === f.model) &&
        (!f.overridesOnly || l.override));
    }

    function redraw() {
      body.innerHTML = '';
      const rows = filtered();
      if (!rows.length) {
        body.append(App.empty('≣', 'No matching runs', 'Nothing in the execution log matches the current filters.'));
        return;
      }
      const tbl = U.el('table.tbl');
      tbl.innerHTML = '<thead><tr><th>Time</th><th>Solution</th><th>Model</th><th>Prompt ver</th>' +
        '<th class="num">Tokens</th><th class="num">Latency ms</th><th class="num">Cost $</th>' +
        '<th>Status</th><th>Override</th><th class="num">Eval</th><th>Actor</th></tr></thead>';
      const tb = U.el('tbody');
      rows.slice(0, f.shown).forEach(l => {
        const stBadge = { success: 'b-ok', retried: 'b-warn', failure: 'b-crit' }[l.status] || 'b-muted';
        const tr = U.el('tr');
        tr.innerHTML =
          '<td style="white-space:nowrap">' + U.esc(U.fmtDateTime(l.ts)) + '</td>' +
          '<td>' + U.esc(l.solutionName) + '</td>' +
          '<td class="mono">' + U.esc(l.model) + '</td>' +
          '<td class="mono">' + U.esc(l.promptVersion) + '</td>' +
          '<td class="num">' + U.esc(U.fmtNum(l.tokensIn, 0)) + ' → ' + U.esc(U.fmtNum(l.tokensOut, 0)) + '</td>' +
          '<td class="num">' + U.esc(U.fmtNum(l.latencyMs, 0)) + '</td>' +
          '<td class="num">$' + U.esc(Number(l.costUsd).toFixed(4)) + '</td>' +
          '<td><span class="badge ' + stBadge + '">' + U.esc(l.status) + '</span>' +
          (l.retries > 0 ? ' <span class="badge b-muted">×' + U.esc(l.retries) + ' retry</span>' : '') + '</td>' +
          '<td>' + (l.override ? '<span title="' + U.esc(l.overrideNote || 'Human override') + '" style="cursor:help">⚑</span>' : '—') + '</td>' +
          '<td class="num">' + (l.evalScore === null || l.evalScore === undefined ? '—' : U.esc(U.fmtNum(l.evalScore, 1))) + '</td>' +
          '<td>' + U.esc(Store.userName(l.actor)) + '</td>';
        tb.append(tr);
      });
      tbl.append(tb);
      body.append(U.el('div.tbl-wrap', {}, tbl));
      body.append(U.el('div', { style: { display: 'flex', alignItems: 'center', gap: '10px', marginTop: '10px' } },
        U.el('span', { style: { fontSize: '12px', color: 'var(--muted)' } },
          'Showing ' + Math.min(f.shown, rows.length) + ' of ' + U.fmtNum(rows.length, 0) + ' runs'),
        rows.length > f.shown
          ? U.el('button.btn.sm', { onclick: () => { f.shown += 25; redraw(); } }, 'Load 25 more')
          : null));
    }

    redraw();
    return card;
  }

  /* =========================================================================
     TAB 2 — SECURITY & ACCESS
     ========================================================================= */
  function renderSecurity(root) {
    root.append(rbacCard());
    root.append(classificationCard());
    root.append(secretsCard());
    root.append(retentionCard());
    root.append(changeHistoryCard());
  }

  function rbacCard() {
    // Human-readable mirror of the PERMS map in store.js — enforcement lives in code.
    const CAPS = [
      ['Submit requests', ['pioneer', 'lead', 'employee', 'security', 'exec']],
      ['Triage & score', ['pioneer']],
      ['Prioritise backlog', ['pioneer']],
      ['Convert & run sprints', ['pioneer']],
      ['Approve risk gates', ['security']],
      ['Manage assets & radar', ['pioneer']],
      ['View governance', ['pioneer', 'security', 'exec', 'lead']],
      ['Manage incidents', ['pioneer', 'security']],
      ['View secrets metadata', ['pioneer', 'security']],
      ['View leadership reports', ['pioneer', 'exec', 'lead', 'security']],
    ];
    const roleKeys = Object.keys(ROLES);
    const card = U.el('div.card', {}, U.el('h2', {}, '⛨ RBAC matrix'),
      U.el('div.card-sub', {}, 'Access is role-based and enforced in every view — this matrix is the single source of truth.'));
    const tbl = U.el('table.tbl');
    tbl.innerHTML = '<thead><tr><th>Capability</th>' +
      roleKeys.map(r => '<th>' + U.esc(ROLES[r].label) + '</th>').join('') + '</tr></thead>';
    const tb = U.el('tbody');
    CAPS.forEach(([cap, roles]) => {
      const tr = U.el('tr');
      tr.innerHTML = '<td><b>' + U.esc(cap) + '</b></td>' + roleKeys.map(r =>
        '<td>' + (roles.includes(r) ? '<span class="badge b-ok">✓</span>' : '<span style="color:var(--muted)">—</span>') + '</td>').join('');
      tb.append(tr);
    });
    tbl.append(tb);
    card.append(U.el('div.tbl-wrap', {}, tbl));
    card.append(U.el('div', { style: { fontSize: '11.5px', color: 'var(--muted)', marginTop: '8px' } },
      'Enforcement lives in code (the PERMS map checked by Store.can in every view); this table is the human-readable view of the same rules. Every denied attempt is recorded in the audit trail.'));
    return card;
  }

  function classificationCard() {
    const LEVELS = [
      ['Public', 'Freely shareable outside the company — published research, public web content.',
        'Everyone, all roles.'],
      ['Internal', 'Default for day-to-day company information — templates, process docs, plans.',
        'All staff, every role.'],
      ['Confidential', 'Customer data, personal data, commercially sensitive material.',
        'AI Pioneer, Security Reviewer, Leadership; Department Leads for their own department; named participants see their own items.'],
      ['Restricted', 'Highest sensitivity — contracts, DSAR personal data, unreleased research.',
        'AI Pioneer, Security Reviewer, and the item\'s named participants only (owner, submitter, sponsor, sprint stakeholders) — never role-wide.'],
    ];
    const reqs = Store.get('requests');
    const opps = Store.get('opportunities');
    const card = U.el('div.card', {}, U.el('h2', {}, '◈ Data classification'),
      U.el('div.card-sub', {}, 'Every request and opportunity carries a classification; visibility follows it automatically.'));
    const grid = U.el('div.grid.cols-2');
    LEVELS.forEach(([level, def, who]) => {
      const n = reqs.filter(r => (r.sensitivity || 'Internal') === level).length +
        opps.filter(o => (o.classification || 'Internal') === level).length;
      grid.append(U.el('div', { style: { border: '1px solid var(--border)', borderRadius: '8px', padding: '12px' } },
        U.el('div', { style: { display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' } },
          badge(level, U.classClass(level)),
          U.el('span', { style: { fontSize: '11.5px', color: 'var(--muted)', marginLeft: 'auto' } },
            n + ' item' + (n === 1 ? '' : 's') + ' in flight')),
        U.el('div', { style: { fontSize: '12.5px' } }, def),
        U.el('div', { style: { fontSize: '11.5px', color: 'var(--muted)', marginTop: '5px' } }, 'Who can see it: ' + who)));
    });
    card.append(grid);
    card.append(U.el('div.assume', {},
      U.el('h4', {}, 'Gates are automatic'),
      U.el('div', {}, 'Confidential and Restricted items trigger security (and, where personal data is involved, legal) approval gates automatically before any sprint can start.')));
    return card;
  }

  function secretsCard() {
    const card = U.el('div.card', {}, U.el('h2', {}, '⚿ Secrets & credentials'),
      U.el('div.card-sub', {}, 'SwiggOS stores metadata only. Secret values live in Vault; nothing sensitive ever reaches this app or its logs.'));
    if (!Store.can('viewSecrets')) {
      card.append(App.denied('view the secrets register'));
      return card;
    }
    const canRotate = Store.can('manageGovernance');
    const now = Date.now();
    const tbl = U.el('table.tbl');
    tbl.innerHTML = '<thead><tr><th>Name</th><th>Scope</th><th>Owner role</th><th>Stored in</th>' +
      '<th>Last rotated</th><th>Rotation due</th>' + (canRotate ? '<th></th>' : '') + '</tr></thead>';
    const tb = U.el('tbody');
    Store.get('secrets').forEach(sec => {
      const due = new Date(sec.lastRotated).getTime() + sec.rotationDays * 86400000;
      const daysLeft = Math.ceil((due - now) / 86400000);
      const state = daysLeft < 0 ? ['overdue', 'b-crit'] : daysLeft <= 14 ? ['due soon', 'b-warn'] : ['ok', 'b-ok'];
      const tr = U.el('tr',
        {},
        U.el('td.mono', {}, sec.name),
        U.el('td', {}, sec.scope),
        U.el('td', {}, sec.ownerRole),
        U.el('td.mono', {}, sec.storedIn),
        U.el('td', {}, U.fmtDate(sec.lastRotated)),
        U.el('td', {}, U.fmtDate(new Date(due).toISOString()), ' ', badge(state[0], state[1])));
      if (canRotate) {
        tr.append(U.el('td', {}, U.el('button.btn.sm', {
          onclick: () => Store.async(() =>
            Store.update('secrets', sec.id, { lastRotated: new Date().toISOString() }, 'secret.rotated',
              'Marked "' + sec.name + '" as rotated')
          ).then(() => { App.toast('Rotation recorded for ' + sec.name + '.'); App.render(); })
            .catch(err => App.toast(err.message, 'error')),
        }, 'Mark rotated')));
      }
      tb.append(tr);
    });
    tbl.append(tb);
    card.append(U.el('div.tbl-wrap', {}, tbl));
    if (!canRotate) {
      card.append(U.el('div', { style: { fontSize: '11.5px', color: 'var(--muted)', marginTop: '8px' } },
        'Rotation is recorded by the AI Pioneer or Security Reviewer.'));
    }
    return card;
  }

  function retentionCard() {
    const logs = Store.get('execLogs');
    const cutoff = U.daysAgo(30);
    const purgeable = logs.filter(l => l.ts < cutoff).length;
    const card = U.el('div.card', {}, U.el('h2', {}, '⌛ Retention & deletion'),
      U.el('div.card-sub', {}, 'Live policy — what is kept, for how long, and what gets deleted.'));
    card.append(U.el('ul', { style: { margin: '0 0 10px', paddingLeft: '18px', fontSize: '13px' } },
      U.el('li', {}, 'Execution logs are retained for 90 days, then purged.'),
      U.el('li', {}, 'DSAR drafts are deleted 30 days after the response is sent.'),
      U.el('li', {}, 'Candidate data is purged when the role closes.'),
      U.el('li', {}, 'The audit trail is append-only (capped at 800 entries in this demo).')));
    card.append(U.el('div', { style: { fontSize: '12.5px', color: 'var(--muted)', marginBottom: '10px' } },
      'Current execution-log row count: ' + U.fmtNum(logs.length, 0) + ' · ' + U.fmtNum(purgeable, 0) + ' older than 30 days.'));
    if (Store.can('manageGovernance')) {
      card.append(U.el('button.btn', {
        onclick: () => {
          App.confirm('Purge old execution logs?',
            'This will permanently remove ' + U.fmtNum(purgeable, 0) + ' execution-log row' + (purgeable === 1 ? '' : 's') +
            ' older than 30 days. The purge itself is recorded in the audit trail.', () => {
              Store.async(() => {
                const arr = Store.get('execLogs');
                let removed = 0;
                for (let i = arr.length - 1; i >= 0; i--) {
                  if (arr[i].ts < cutoff) { arr.splice(i, 1); removed++; }
                }
                Store.audit('retention.purged', 'execLogs', 'execLogs',
                  'Purged ' + removed + ' execution-log rows older than 30 days.');
                Store.save(); Store.emit();
                return removed;
              }).then(removed => {
                App.toast('Purged ' + removed + ' execution-log row' + (removed === 1 ? '' : 's') + '.');
                App.render();
              }).catch(err => App.toast(err.message, 'error'));
            }, 'Purge');
        },
      }, '⌫ Purge execution logs older than 30 days'));
    } else {
      card.append(U.el('div', { style: { fontSize: '11.5px', color: 'var(--muted)' } },
        'Purging requires the AI Pioneer or Security Reviewer role.'));
    }
    return card;
  }

  function changeHistoryCard() {
    const card = U.el('div.card', {}, U.el('h2', {}, '≡ Change & decision history'),
      U.el('div.card-sub', {}, 'Every mutation in SwiggOS lands in the append-only audit trail with actor, role and before/after values.'));
    card.append(U.el('p', { style: { fontSize: '13px' } },
      'Approvals, edits, pauses, rotations and purges are all recorded automatically — there is no unaudited write path. ',
      U.el('a', { href: '#/governance/audit' }, 'Open the full audit trail →')));
    const sols = Store.get('solutions');
    if (sols.length) {
      card.append(U.el('h3', { style: { marginTop: '10px' } }, 'Named owners'));
      const tbl = U.el('table.tbl');
      tbl.innerHTML = '<thead><tr><th>Solution</th><th>Status</th><th>Owner</th><th>Accountable reviewer</th></tr></thead>';
      const tb = U.el('tbody');
      sols.forEach(s => {
        const cardMatch = Store.get('aiCards').find(c => c.solutionId === s.id);
        const tr = U.el('tr', {},
          U.el('td', {}, U.el('b', {}, s.name)),
          U.el('td', {}, badge(U.title(s.status), s.status === 'live' ? 'b-ok' : s.status === 'paused' ? 'b-crit' : 'b-muted')),
          U.el('td', {}, Store.userName(s.owner)),
          U.el('td', {}, cardMatch ? Store.userName(cardMatch.reviewer) : '—'));
        tb.append(tr);
      });
      tbl.append(tb);
      card.append(U.el('div.tbl-wrap', {}, tbl));
    }
    return card;
  }

  /* =========================================================================
     TAB 3 — RESPONSIBLE AI
     ========================================================================= */
  const RAI_FIELDS = [
    ['intendedUse', 'Intended use'],
    ['prohibitedUse', 'Prohibited use'],
    ['dataSources', 'Data sources & permissions'],
    ['oversight', 'Human oversight'],
    ['limitations', 'Known limitations & failure modes'],
    ['evalEvidence', 'Accuracy & evaluation evidence'],
    ['bias', 'Bias / fairness / harmful output'],
    ['transparency', 'Transparency to affected users'],
    ['confidence', 'Confidence & uncertainty'],
    ['pauseConditions', 'Pause / retire conditions'],
  ];
  const REVIEW_KEYS = ['security', 'privacy', 'legal'];
  const REVIEW_BADGE = { approved: 'b-ok', pending: 'b-warn', rejected: 'b-crit', 'not-required': 'b-muted' };

  function cardStatusBadge(status) {
    const map = { approved: 'b-ok', 'launch-gated': 'b-warn', 'in-review': 'b-info', paused: 'b-crit' };
    return badge(U.title(status), map[status] || 'b-muted');
  }
  function evalIncomplete(card) {
    return /in progress|in build/i.test(card.evalEvidence || '');
  }

  function renderRai(root) {
    root.append(U.el('div.card', { style: { borderLeft: '3px solid var(--accent)', background: 'rgba(255,102,51,.05)' } },
      U.el('h2', {}, '✦ Two hard rules'),
      U.el('p', { style: { margin: '0 0 6px', fontSize: '13.5px' } },
        'AI-generated content is always labelled, editable and reviewable. High-impact decisions are never fully automated — a named human approves.'),
      U.el('div', { style: { fontSize: '12px', color: 'var(--muted)' } },
        'Both rules are enforced in-product: the ', App.aiFlag(true),
        ' component marks every AI output, and approval gates block launch until named reviewers sign off.')));

    Store.get('aiCards').forEach(card => root.append(raiCard(card)));

    root.append(U.el('div', { style: { fontSize: '12px', color: 'var(--muted)', margin: '2px 0 8px' } },
      'Cards without complete evaluation evidence cannot reach “approved” — the security review is locked until the eval evidence is in.'));
  }

  function raiCard(card) {
    const canEdit = Store.can('editAiCard');
    const canPause = Store.can('manageGovernance');
    const riskCls = { High: 'b-crit', Medium: 'b-warn', Low: 'b-ok' }[card.riskTier] || 'b-muted';
    const expanded = !!expandedCards[card.id];

    const box = U.el('div.card');
    const head = U.el('div', { style: { display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' } },
      U.el('h3', { style: { margin: 0, flex: '1', minWidth: '180px' } }, card.name),
      U.el('span', { style: { fontSize: '12px', color: 'var(--muted)' } }, card.dept),
      badge(card.riskTier + ' risk', riskCls),
      badge(card.classification, U.classClass(card.classification)),
      cardStatusBadge(card.status));
    box.append(head);
    box.append(U.el('div', { style: { fontSize: '12px', color: 'var(--muted)', margin: '4px 0 8px' } },
      'Owner: ' + Store.userName(card.owner) + ' · Reviewer: ' + Store.userName(card.reviewer)));

    // reviews strip
    const strip = U.el('div', { style: { display: 'flex', gap: '14px', flexWrap: 'wrap', alignItems: 'center', padding: '8px 0', borderTop: '1px solid var(--grid)', borderBottom: '1px solid var(--grid)' } });
    REVIEW_KEYS.forEach(key => {
      const val = (card.reviews && card.reviews[key]) || 'pending';
      const cell = U.el('span', { style: { display: 'inline-flex', gap: '6px', alignItems: 'center', fontSize: '12px' } },
        U.el('span', { style: { color: 'var(--muted)' } }, U.title(key) + ' review:'),
        badge(U.title(val), REVIEW_BADGE[val] || 'b-muted'));
      const mayChange = key === 'security' ? Store.can('approveGate') : canEdit;
      if (mayChange) {
        const lockApproved = key === 'security' && evalIncomplete(card);
        const sel = U.el('select', {
          style: { background: '#141413', color: 'var(--ink)', border: '1px solid var(--border)', borderRadius: '6px', padding: '2px 6px', font: '11.5px var(--font)' },
          onchange: e => {
            const v = e.target.value;
            Store.async(() =>
              Store.mutate('aiCards', card.id, c => { c.reviews[key] = v; }, 'aicard.review-changed',
                U.title(key) + ' review on "' + card.name + '" set to ' + v)
            ).then(() => { App.toast(U.title(key) + ' review updated.'); App.render(); })
              .catch(err => App.toast(err.message, 'error'));
          },
        }, ...['approved', 'pending', 'rejected', 'not-required'].map(o =>
          U.el('option', {
            value: o, selected: o === val ? 'selected' : null,
            disabled: (o === 'approved' && lockApproved) ? 'disabled' : null,
            title: (o === 'approved' && lockApproved) ? 'Blocked: evaluation evidence is incomplete — approval requires finished evals.' : null,
          }, U.title(o))));
        if (lockApproved) sel.title = 'The “approved” option is locked until evaluation evidence is complete.';
        cell.append(sel);
      }
      strip.append(cell);
    });
    box.append(strip);

    // expandable body
    const bodyWrap = U.el('div', { style: { display: expanded ? 'block' : 'none', marginTop: '10px' } });
    const kv = U.el('dl.kv');
    RAI_FIELDS.forEach(([key, label]) => {
      kv.append(U.el('dt', {}, label), U.el('dd', {}, card[key] || '—'));
    });
    bodyWrap.append(kv);
    box.append(bodyWrap);

    // actions row
    const actions = U.el('div', { style: { display: 'flex', gap: '8px', marginTop: '10px', flexWrap: 'wrap' } });
    const toggle = U.el('button.btn.sm', {
      onclick: () => {
        expandedCards[card.id] = !expandedCards[card.id];
        bodyWrap.style.display = expandedCards[card.id] ? 'block' : 'none';
        toggle.textContent = expandedCards[card.id] ? '▾ Collapse' : '▸ Expand';
      },
    }, expanded ? '▾ Collapse' : '▸ Expand');
    actions.append(toggle);
    if (canEdit) actions.append(U.el('button.btn.sm', { onclick: () => editRaiModal(card) }, '✎ Edit'));
    if (canPause && card.solutionId) {
      if (card.status === 'paused') {
        actions.append(U.el('button.btn.sm', { onclick: () => resumeModal(card) }, '▶ Resume'));
      } else {
        actions.append(U.el('button.btn.sm', { onclick: () => pauseModal(card) }, '⏸ Invoke pause condition'));
      }
    }
    box.append(actions);
    return box;
  }

  function editRaiModal(card) {
    App.modal({
      title: 'Edit use-case card — ' + card.name,
      body(el, close) {
        const inputs = {};
        RAI_FIELDS.forEach(([key, label]) => {
          inputs[key] = U.el('textarea', { style: { minHeight: '58px' } });
          inputs[key].value = card[key] || '';
          el.append(field(label, inputs[key]));
        });
        el.append(U.el('div.hint', { style: { marginBottom: '8px' } },
          'Review statuses are not changed by edits — evidence changes still require a manual review decision.'));
        el.append(modalButtons(close, 'Save card', () => {
          const patch = {};
          RAI_FIELDS.forEach(([key]) => {
            const v = inputs[key].value.trim();
            if (v !== (card[key] || '')) patch[key] = v;
          });
          close();
          if (!Object.keys(patch).length) { App.toast('No changes made.'); return; }
          Store.async(() =>
            Store.update('aiCards', card.id, patch, 'aicard.updated',
              'Edited "' + card.name + '": ' + Object.keys(patch).join(', '))
          ).then(() => { App.toast('Use-case card updated.'); App.render(); })
            .catch(err => App.toast(err.message, 'error'));
        }));
      },
    });
  }

  function pauseModal(card) {
    const sol = Store.byId('solutions', card.solutionId);
    App.modal({
      title: '⏸ Invoke pause condition — ' + card.name,
      body(el, close) {
        const ta = U.el('textarea', { placeholder: 'e.g. Completeness eval < 90% after CRM schema change' });
        el.append(
          U.el('p', { style: { fontSize: '12.5px', color: 'var(--muted)' } },
            'Documented pause conditions for this card: ' + (card.pauseConditions || '—')),
          field('Which pause condition triggered? *', ta, 'Required. The linked solution is paused immediately; the pause is audited.'));
        el.append(modalButtons(close, 'Pause solution', () => {
          const reason = ta.value.trim();
          if (!reason) { markInvalid(ta, true); return; }
          close();
          Store.async(() => {
            Store.update('solutions', card.solutionId, {
              status: 'paused', healthNote: '⚠ Paused: ' + reason,
            }, 'solution.paused', 'Pause condition invoked on ' + (sol ? sol.name : card.solutionId) + ': ' + reason);
            Store.mutate('aiCards', card.id, c => { c.prevStatus = c.status; c.status = 'paused'; },
              'aicard.updated', 'Card status set to paused: ' + reason);
          }).then(() => { App.toast('Solution paused — pause condition recorded.', 'warn'); App.render(); })
            .catch(err => App.toast(err.message, 'error'));
        }));
      },
    });
  }

  function resumeModal(card) {
    const sol = Store.byId('solutions', card.solutionId);
    App.modal({
      title: '▶ Resume — ' + card.name,
      body(el, close) {
        const ta = U.el('textarea', { placeholder: 'What was fixed / why it is safe to resume' });
        el.append(field('Resumption note *', ta, 'Required. Restores the solution to live and the card to its previous status.'));
        el.append(modalButtons(close, 'Resume solution', () => {
          const note = ta.value.trim();
          if (!note) { markInvalid(ta, true); return; }
          close();
          Store.async(() => {
            Store.update('solutions', card.solutionId, {
              status: 'live', healthNote: 'Resumed after pause: ' + note,
            }, 'solution.resumed', 'Resumed ' + (sol ? sol.name : card.solutionId) + ': ' + note);
            Store.mutate('aiCards', card.id, c => { c.status = c.prevStatus || 'approved'; delete c.prevStatus; },
              'aicard.updated', 'Card resumed: ' + note);
          }).then(() => { App.toast('Solution resumed.'); App.render(); })
            .catch(err => App.toast(err.message, 'error'));
        }));
      },
    });
  }

  /* =========================================================================
     TAB 4 — AUDIT TRAIL
     ========================================================================= */
  function renderAudit(root) {
    root.append(intro('Append-only. Every state change in SwiggOS is recorded with actor, role and before/after.'));

    const all = Store.get('audit');
    const actors = [...new Set(all.map(a => a.actor))];
    const entities = [...new Set(all.map(a => a.entity))].sort();
    const f = { actor: 'all', entity: 'all', q: '', shown: 50 };

    const card = U.el('div.card', {}, U.el('h2', {}, '≡ Audit trail', ' ',
      badge(U.fmtNum(all.length, 0) + ' entries', 'b-muted')));

    const selActor = U.el('select', { onchange: e => { f.actor = e.target.value; f.shown = 50; redraw(); } },
      U.el('option', { value: 'all' }, 'All actors'),
      ...actors.map(a => U.el('option', { value: a }, Store.userName(a))));
    const selEntity = U.el('select', { onchange: e => { f.entity = e.target.value; f.shown = 50; redraw(); } },
      U.el('option', { value: 'all' }, 'All entities'),
      ...entities.map(en => U.el('option', { value: en }, en)));
    const search = U.el('input.search-input', {
      type: 'text', placeholder: 'Search action or detail…', style: { maxWidth: '260px' },
      oninput: U.debounce(e => { f.q = e.target.value.trim().toLowerCase(); f.shown = 50; redraw(); }, 200),
    });
    card.append(U.el('div.filters', {}, selActor, selEntity, search));

    const body = U.el('div');
    card.append(body);

    function filtered() {
      return all.filter(a =>
        (f.actor === 'all' || a.actor === f.actor) &&
        (f.entity === 'all' || a.entity === f.entity) &&
        (!f.q || (a.action + ' ' + (a.detail || '')).toLowerCase().includes(f.q)));
    }

    function redraw() {
      body.innerHTML = '';
      const rows = filtered();
      if (!rows.length) {
        body.append(App.empty('≡', 'No matching entries', 'Nothing in the audit trail matches the current filters.'));
        return;
      }
      const tbl = U.el('table.tbl');
      tbl.innerHTML = '<thead><tr><th></th><th>Time</th><th>Actor</th><th>Action</th><th>Entity</th><th>Detail</th></tr></thead>';
      const tb = U.el('tbody');
      rows.slice(0, f.shown).forEach(a => {
        const tr = U.el('tr');
        const toggleTd = U.el('td', { style: { width: '20px' } });
        tr.append(
          toggleTd,
          U.el('td', { style: { whiteSpace: 'nowrap' } }, U.fmtDateTime(a.ts)),
          U.el('td', {}, U.el('b', { style: { color: 'var(--ink)' } }, Store.userName(a.actor)), ' ',
            U.el('span.badge.b-muted', {}, a.role)),
          U.el('td', {}, U.el('span.mono', { style: { color: 'var(--violet)' } }, a.action)),
          U.el('td', {}, a.entity + ' → ', U.el('span.mono', {}, a.entityId || '—')),
          U.el('td', { style: { fontSize: '12.5px' } }, a.detail || '—'));
        tb.append(tr);
        if (a.changes) {
          let open = false, detailTr = null;
          const btn = U.el('button', {
            style: { background: 'none', border: 'none', color: 'var(--muted)', cursor: 'pointer', fontSize: '13px', padding: '0' },
            'aria-label': 'Show before/after',
            onclick: () => {
              open = !open;
              btn.textContent = open ? '▾' : '▸';
              if (open) {
                const pre = U.el('pre.mono', { style: { margin: 0, padding: '10px 12px', background: '#141413', borderRadius: '7px', fontSize: '11.5px', overflowX: 'auto', whiteSpace: 'pre' } });
                pre.textContent = JSON.stringify({ before: a.changes.before, after: a.changes.after }, null, 2);
                detailTr = U.el('tr', {}, U.el('td', { colSpan: 6 }, pre));
                tr.after(detailTr);
              } else if (detailTr) {
                detailTr.remove(); detailTr = null;
              }
            },
          }, '▸');
          toggleTd.append(btn);
        }
      });
      tbl.append(tb);
      body.append(U.el('div.tbl-wrap', {}, tbl));
      body.append(U.el('div', { style: { display: 'flex', alignItems: 'center', gap: '10px', marginTop: '10px' } },
        U.el('span', { style: { fontSize: '12px', color: 'var(--muted)' } },
          'Showing ' + Math.min(f.shown, rows.length) + ' of ' + U.fmtNum(rows.length, 0) + ' entries'),
        rows.length > f.shown
          ? U.el('button.btn.sm', { onclick: () => { f.shown += 50; redraw(); } }, 'Load more')
          : null));
    }

    redraw();
    root.append(card);
  }

  /* =========================================================================
     TAB 5 — INCIDENTS
     ========================================================================= */
  function renderIncidents(root) {
    const incidents = Store.get('incidents');
    const open = incidents.filter(i => i.status === 'open');
    const closed = incidents.filter(i => i.status === 'closed' && i.closedAt);
    const mttc = closed.length
      ? Math.round(U.avg(closed, i => (new Date(i.closedAt) - new Date(i.ts)) / 86400000) * 10) / 10
      : null;
    const closedQuarter = closed.filter(i => i.closedAt >= U.daysAgo(90)).length;

    const tiles = U.el('div.grid.cols-3');
    tiles.append(
      stat(String(open.length), 'Open incidents',
        open.length ? badge('active response', 'b-crit') : badge('all clear', 'b-ok'), true),
      stat(mttc === null ? '—' : U.fmtNum(mttc, 1) + ' days', 'Mean time to close',
        U.el('span.basis.measured', {}, 'measured — closed incidents only')),
      stat(String(closedQuarter), 'Closed this quarter', null));
    root.append(tiles);

    root.append(U.el('div.assume', { style: { marginBottom: '14px' } },
      U.el('h4', {}, 'Escalation'),
      U.el('div', {}, 'Critical incidents page the Security Reviewer and pause the linked solution pending review — the pause and alert are raised automatically when a critical incident is created.')));

    const canManage = Store.can('manageIncidents');
    if (!canManage) {
      root.append(U.el('div', { style: { fontSize: '12px', color: 'var(--muted)', margin: '-6px 0 12px' } },
        'Read-only for your role — raising, updating and closing incidents requires the AI Pioneer or Security Reviewer.'));
    }

    if (!incidents.length) {
      root.append(U.el('div.card', {}, App.empty('⚠', 'No incidents recorded',
        'When something goes wrong, it is raised here with a timeline and a named owner.')));
      return;
    }
    incidents.forEach(inc => root.append(incidentCard(inc, canManage)));
  }

  function incidentCard(inc, canManage) {
    const box = U.el('div.card');
    box.append(U.el('div', { style: { display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' } },
      badge(inc.severity, U.sevClass(inc.severity)),
      U.el('h3', { style: { margin: 0, flex: '1', minWidth: '200px' } }, inc.title),
      inc.solution ? U.el('span.chip', {}, solutionOrSprintName(inc.solution)) : null,
      badge(U.title(inc.status), inc.status === 'open' ? 'b-crit' : 'b-ok')));
    box.append(U.el('div', { style: { fontSize: '12px', color: 'var(--muted)', margin: '4px 0 8px' } },
      'Owner: ' + Store.userName(inc.owner) + ' · Raised ' + U.timeAgo(inc.ts) +
      (inc.closedAt ? ' · Closed ' + U.timeAgo(inc.closedAt) : '')));
    if (inc.summary) box.append(U.el('p', { style: { fontSize: '13px', margin: '0 0 10px' } }, inc.summary));

    const tl = U.el('ul.timeline');
    (inc.timeline || []).forEach((t, i) => {
      tl.append(U.el('li' + (i === (inc.timeline.length - 1) && inc.status === 'open' ? '.hot' : ''), {},
        U.el('div', { style: { fontSize: '13px' } }, t.text),
        U.el('div.t-meta', {}, Store.userName(t.by) + ' · ' + U.fmtDateTime(t.at))));
    });
    box.append(tl);

    if (canManage) {
      const input = U.el('input', {
        type: 'text', placeholder: 'Add timeline entry…',
        style: { flex: '1', minWidth: '180px', background: '#141413', color: 'var(--ink)', border: '1px solid var(--border)', borderRadius: '7px', padding: '7px 10px', font: '13px var(--font)' },
      });
      const addEntry = () => {
        const text = input.value.trim();
        if (!text) { App.toast('Type a timeline update first.', 'warn'); input.focus(); return; }
        Store.async(() =>
          Store.mutate('incidents', inc.id, it => {
            it.timeline.push({ at: new Date().toISOString(), text, by: Store.currentUser().id });
          }, 'incident.updated', 'Timeline entry added to ' + inc.id + ': ' + text)
        ).then(() => { App.toast('Timeline entry added.'); App.render(); })
          .catch(err => App.toast(err.message, 'error'));
      };
      input.addEventListener('keydown', e => { if (e.key === 'Enter') addEntry(); });
      const row = U.el('div', { style: { display: 'flex', gap: '8px', marginTop: '8px', flexWrap: 'wrap' } },
        input,
        U.el('button.btn.sm', { onclick: addEntry }, 'Add entry'));
      if (inc.status === 'open') {
        row.append(U.el('button.btn.sm.danger', { onclick: () => closeIncidentModal(inc) }, 'Close incident'));
      }
      box.append(row);
    }
    return box;
  }

  function closeIncidentModal(inc) {
    App.modal({
      title: 'Close incident — ' + inc.id,
      body(el, close) {
        const ta = U.el('textarea', { placeholder: 'Root cause, what was done, and any follow-up actions…' });
        el.append(field('Resolution summary *', ta,
          'Required. Added to the timeline as the closing entry and recorded in the audit trail.'));
        el.append(modalButtons(close, 'Close incident', () => {
          const summary = ta.value.trim();
          if (!summary) { markInvalid(ta, true); return; }
          close();
          Store.async(() =>
            Store.mutate('incidents', inc.id, it => {
              it.status = 'closed';
              it.closedAt = new Date().toISOString();
              it.timeline.push({ at: new Date().toISOString(), text: 'Closed. ' + summary, by: Store.currentUser().id });
            }, 'incident.closed', 'Closed ' + inc.id + ': ' + summary)
          ).then(() => { App.toast('Incident closed.'); App.render(); })
            .catch(err => App.toast(err.message, 'error'));
        }));
      },
    });
  }

  function raiseIncidentModal() {
    App.modal({
      title: '⊕ Raise incident',
      body(el, close) {
        const title = U.el('input', { type: 'text', placeholder: 'What happened, in one line' });
        const sev = U.el('select', {},
          ...['low', 'medium', 'high', 'critical'].map(s => U.el('option', { value: s, selected: s === 'medium' ? 'selected' : null }, U.title(s))));
        const linked = U.el('select', {}, U.el('option', { value: '' }, 'None / not linked'),
          ...Store.get('solutions').map(s => U.el('option', { value: s.id }, s.name + ' (' + s.id + ')')),
          ...Store.get('sprints').map(s => U.el('option', { value: s.id }, s.name + ' (' + s.id + ')')));
        const summary = U.el('textarea', { placeholder: 'What is known so far, impact, and immediate containment…' });
        el.append(
          field('Title *', title),
          field('Severity', sev, 'Critical severity automatically pauses the linked solution and raises an alert.'),
          field('Linked solution', linked),
          field('Summary *', summary));
        el.append(modalButtons(close, 'Raise incident', () => {
          const t = title.value.trim(), sm = summary.value.trim();
          let bad = false;
          markInvalid(title, !t); if (!t) bad = true;
          markInvalid(summary, !sm); if (!sm) bad = true;
          if (bad) return;
          close();
          const linkedId = linked.value || null;
          const severity = sev.value;
          const now = new Date().toISOString();
          const uid = Store.currentUser().id;
          Store.async(() => {
            const inc = Store.add('incidents', {
              title: t, severity, solution: linkedId, status: 'open', owner: uid,
              ts: now, closedAt: null, summary: sm,
              timeline: [{ at: now, text: 'Incident raised.', by: uid }],
            }, 'incident.raised');
            if (severity === 'critical' && linkedId) {
              const name = solutionOrSprintName(linkedId);
              const sol = Store.byId('solutions', linkedId);
              if (sol) {
                Store.update('solutions', linkedId, {
                  status: 'paused', healthNote: '⚠ Paused pending incident ' + inc.id,
                }, 'solution.paused', 'Auto-paused: critical incident ' + inc.id + ' raised.');
              }
              Store.add('alerts', {
                severity: 'critical', solution: linkedId, solutionName: name,
                message: 'Paused pending incident ' + inc.id, status: 'open', kind: 'incident', ts: now,
              }, 'alert.raised');
            }
            return inc;
          }).then(inc => {
            App.toast('Incident ' + inc.id + ' raised.' +
              (severity === 'critical' && linkedId ? ' Linked solution paused and Security Reviewer alerted.' : ''),
              severity === 'critical' ? 'warn' : '');
            App.render();
          }).catch(err => App.toast(err.message, 'error'));
        }));
      },
    });
  }
})();
