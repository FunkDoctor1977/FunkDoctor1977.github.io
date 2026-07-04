/* SwiggOS — views/backlog.js
   Opportunity backlog: evidence-led prioritisation, approval gates, sprint conversion.
   Route: #/backlog (list) · #/backlog/OPP-x (detail). */
(function () {
  'use strict';

  const F = { dept: 'all', status: 'all' };
  const SORT = { key: 'score', dir: -1 };
  const OPP_BADGE = { backlog: 'b-info', gated: 'b-warn', ready: 'b-ok', 'in-sprint': 'b-accent', done: 'b-muted', declined: 'b-crit' };
  const GATE_BADGE = { approved: 'b-ok', pending: 'b-warn', rejected: 'b-crit', 'not-required': 'b-muted', 'not-requested': 'b-muted' };
  const EFFORT_BADGE = { S: 'b-ok', M: 'b-warn', L: 'b-serious' };
  const SCORE_DEFS = [
    { k: 'urgency', label: 'Urgency', hint: '5 = blocking work today · 1 = nice-to-have someday' },
    { k: 'value', label: 'Value', hint: '5 = large recurring time/cost saving · 1 = marginal' },
    { k: 'feasibility', label: 'Feasibility', hint: '5 = proven pattern, data available · 1 = research project' },
    { k: 'risk', label: 'Risk', hint: '5 = personal data / regulated / customer-facing · 1 = public data, internal audience' },
    { k: 'reusability', label: 'Reusability', hint: '5 = pattern reusable across many teams · 1 = one-off' },
  ];

  App.view('backlog', {
    title: 'Opportunity backlog', navLabel: 'Backlog', icon: '≣',
    count() {
      return Store.get('opportunities').filter(o => ['backlog', 'ready', 'gated'].includes(o.status)).length;
    },
    render(root, params) {
      if (params.length) renderDetail(root, params[0]);
      else renderList(root);
    },
  });

  // ---- helpers -------------------------------------------------------------
  function busy(btn, on, label) {
    if (on) { btn.dataset.label = btn.textContent; btn.disabled = true; btn.textContent = label || 'Saving…'; }
    else { btn.disabled = false; if (btn.dataset.label) btn.textContent = btn.dataset.label; }
  }

  function gateStatus(o, k) {
    return (o.approvals && o.approvals[k] && o.approvals[k].status) || 'not-requested';
  }
  function gateSatisfied(o, k) { return ['approved', 'not-required'].includes(gateStatus(o, k)); }
  function gatesFree(o) {
    return ['not-required', 'not-requested'].includes(gateStatus(o, 'security')) &&
      ['not-required', 'not-requested'].includes(gateStatus(o, 'legal'));
  }
  function wouldNeedGate(o) {
    return (o.scores && o.scores.risk >= 4) || ['Confidential', 'Restricted'].includes(o.classification);
  }

  function miniScores(s) {
    if (!s) return '—';
    return 'U' + s.urgency + ' V' + s.value + ' F' + s.feasibility + ' R' + s.risk + ' Re' + s.reusability;
  }
  function scoreTip(s) {
    if (!s) return 'Not scored yet';
    return 'urgency ' + s.urgency + ' · value ' + s.value + ' · feasibility ' + s.feasibility +
      ' · risk ' + s.risk + ' · reusability ' + s.reusability;
  }

  function scorePicker(current, onPick) {
    const wrap = U.el('div.score-pick');
    for (let n = 1; n <= 5; n++) {
      wrap.append(U.el('button' + (current === n ? '.sel' : ''), {
        type: 'button', 'aria-label': 'Score ' + n,
        onclick: () => {
          onPick(n);
          wrap.querySelectorAll('button').forEach((b, i) => b.classList.toggle('sel', i + 1 === n));
        },
      }, String(n)));
    }
    return wrap;
  }

  function howScoredCard() {
    const box = U.el('details.card');
    box.append(
      U.el('summary', { style: { cursor: 'pointer', fontWeight: '650', color: 'var(--ink)', fontSize: '14.5px' } }, '≟ How priority is scored'),
      U.el('div.assume', {},
        U.el('h4', {}, 'Priority formula'),
        U.el('div.formula', {}, Calc.priorityFormula()),
        U.el('p', { style: { margin: '8px 0 0' } },
          'Risk is inverted — riskier work drags the score down rather than up. The weights are public by design and reviewed with leadership, so every ranking can be challenged with evidence rather than opinion.')));
    return box;
  }

  // ---- LIST ------------------------------------------------------------------
  function renderList(root) {
    root.append(App.pageHead('Opportunity backlog',
      'Accepted requests, ranked by an evidence-led priority score — weights on the table, gates before risk, sprints only when ready.'));
    root.append(howScoredCard());

    const results = U.el('div');
    const mkSel = (options, value, onchange, aria) => {
      const s = U.el('select', { 'aria-label': aria, onchange: e => onchange(e.target.value) });
      options.forEach(o => s.append(U.el('option', { value: o.v }, o.label)));
      s.value = value;
      return s;
    };
    const filters = U.el('div.filters', {},
      mkSel([{ v: 'all', label: 'All departments' }].concat(DEPTS.map(d => ({ v: d, label: d }))),
        F.dept, v => { F.dept = v; redraw(); }, 'Filter by department'),
      mkSel([{ v: 'all', label: 'All statuses' }, { v: 'backlog', label: 'Backlog' }, { v: 'gated', label: 'Gated' },
        { v: 'ready', label: 'Ready' }, { v: 'in-sprint', label: 'In sprint' }, { v: 'done', label: 'Done' },
        { v: 'declined', label: 'Declined' }],
        F.status, v => { F.status = v; redraw(); }, 'Filter by status'));

    function sortVal(o) {
      if (SORT.key === 'score') { const p = Calc.priorityScore(o.scores); return p === null ? -1 : p; }
      if (SORT.key === 'dept') return o.dept || '';
      return o.status || '';
    }

    function redraw() {
      const all = Store.get('opportunities');
      const visible = all.filter(o => Store.canSee(o));
      const hidden = all.length - visible.length;
      const rows = visible.filter(o =>
        (F.dept === 'all' || o.dept === F.dept) &&
        (F.status === 'all' || o.status === F.status));

      // Rank is always by priority score, whatever the current sort.
      const ranked = visible.slice().sort((a, b) =>
        (Calc.priorityScore(b.scores) || -1) - (Calc.priorityScore(a.scores) || -1));
      const rankOf = {};
      ranked.forEach((o, i) => { rankOf[o.id] = i + 1; });

      rows.sort((a, b) => {
        const va = sortVal(a), vb = sortVal(b);
        return (typeof va === 'string' ? va.localeCompare(vb) : va - vb) * SORT.dir;
      });

      results.innerHTML = '';
      const card = U.el('div.card');
      if (!rows.length) {
        card.append(App.empty('≣', 'No matching opportunities',
          visible.length ? 'Nothing matches the current filters.' : 'Accept a request in triage to create the first opportunity.',
          U.el('button.btn.primary', { onclick: () => App.go('requests') }, 'Open triage')));
      } else {
        const tbl = U.el('table.tbl');
        const thead = U.el('thead');
        const hrow = U.el('tr');
        const cols = [
          { label: '#' },
          { label: 'Opportunity', key: 'dept', title: 'Sort by department' },
          { label: 'Effort' },
          { label: 'U / V / F / R / Re' },
          { label: 'Priority', key: 'score', num: true, title: 'Sort by priority score' },
          { label: 'Classification' },
          { label: 'Gate' },
          { label: 'Status', key: 'status', title: 'Sort by status' },
        ];
        cols.forEach(c => {
          const th = U.el('th' + (c.key ? '.sortable' : '') + (c.num ? '.num' : ''), c.key ? {
            title: c.title,
            onclick: () => {
              if (SORT.key === c.key) SORT.dir = -SORT.dir; else { SORT.key = c.key; SORT.dir = c.key === 'score' ? -1 : 1; }
              redraw();
            },
          } : {}, c.label + (SORT.key === c.key ? (SORT.dir === 1 ? ' ▲' : ' ▼') : ''));
          hrow.append(th);
        });
        thead.append(hrow);
        tbl.append(thead);

        const tb = U.el('tbody');
        rows.forEach(o => {
          const p = Calc.priorityScore(o.scores);
          const sec = gateStatus(o, 'security'), leg = gateStatus(o, 'legal');
          let gate;
          if (sec === 'rejected' || leg === 'rejected') gate = '<span style="color:var(--crit)">✗ rejected</span>';
          else if (sec === 'pending' || leg === 'pending') gate = '<span style="color:var(--warn)">⏳ pending</span>';
          else if (sec === 'approved' || leg === 'approved') gate = '<span style="color:#4ec94e">✓ approved</span>';
          else if (wouldNeedGate(o) && gatesFree(o)) gate = '<span style="color:var(--warn)">◌ not requested</span>';
          else gate = '<span style="color:var(--muted)">— not required</span>';

          const tr = U.el('tr.rowlink', { onclick: () => App.go('backlog/' + o.id) });
          tr.innerHTML = '<td class="num">' + rankOf[o.id] + '</td>' +
            '<td><b>' + U.esc(o.title) + '</b><br><span style="color:var(--muted);font-size:12px">' + U.esc(o.dept) + ' · ' + U.esc(o.id) + '</span></td>' +
            '<td>' + U.badge(o.effort || '—', EFFORT_BADGE[o.effort] || 'b-muted') + '</td>' +
            '<td class="mono" title="' + U.esc(scoreTip(o.scores)) + '" style="white-space:nowrap">' + U.esc(miniScores(o.scores)) + '</td>' +
            '<td class="num"><b style="color:var(--ink)">' + (p === null ? '—' : U.esc(p.toFixed(1))) + '</b></td>' +
            '<td>' + U.badge(o.classification || 'Internal', U.classClass(o.classification)) + '</td>' +
            '<td style="font-size:12px;white-space:nowrap">' + gate + '</td>' +
            '<td>' + U.badge(U.title(o.status), OPP_BADGE[o.status] || 'b-muted') + '</td>';
          tb.append(tr);
        });
        tbl.append(tb);
        card.append(U.el('div.tbl-wrap', {}, tbl));
      }
      if (hidden) card.append(U.el('div', { style: { color: 'var(--muted)', fontSize: '12px', marginTop: '8px' } },
        hidden + ' item' + (hidden === 1 ? '' : 's') + ' hidden by your access level'));
      results.append(card);
    }

    redraw();
    root.append(filters, results);
  }

  // ---- DETAIL -----------------------------------------------------------------
  function renderDetail(root, id) {
    const o = Store.byId('opportunities', id);
    if (!o) {
      root.append(App.empty('≣', 'Opportunity not found', 'No opportunity exists with ID "' + id + '".',
        U.el('button.btn.primary', { onclick: () => App.go('backlog') }, '← Back to backlog')));
      return;
    }
    if (!Store.canSee(o)) { root.append(App.denied('view this opportunity (classified ' + (o.classification || 'Internal') + ')')); return; }

    const p = Calc.priorityScore(o.scores);
    root.append(App.pageHead(o.title, o.id + ' · ' + o.dept,
      U.el('button.btn', { onclick: () => App.go('backlog') }, '← Backlog')));

    const rejGate = ['security', 'legal'].filter(k => gateStatus(o, k) === 'rejected');
    if (rejGate.length) {
      root.append(U.el('div.card', { style: { borderColor: 'rgba(208,59,59,.5)', background: 'rgba(208,59,59,.07)' } },
        U.el('h3', { style: { color: '#e66767' } }, '⚠ Approval rejected'),
        U.el('p', { style: { margin: 0 } },
          'The ' + rejGate.join(' and ') + ' gate' + (rejGate.length > 1 ? 's were' : ' was') +
          ' rejected — this opportunity is back in the backlog until the concerns below are addressed and approval is re-granted.')));
    }

    const top = U.el('div.grid.cols-3');
    top.append(VBits.stat(p === null ? '—' : p.toFixed(1), 'Priority score (0–10)', null, true));
    top.append(U.el('div.card', {}, U.el('h3', {}, 'Status'),
      U.el('div.chip-row', {},
        U.el('span.badge.big.' + (OPP_BADGE[o.status] || 'b-muted'), {}, U.title(o.status)),
        U.el('span.badge.big.' + U.classClass(o.classification), {}, o.classification || 'Internal'),
        U.el('span.badge.big.' + (EFFORT_BADGE[o.effort] || 'b-muted'), {}, 'Effort ' + (o.effort || '—')))));
    const src = U.el('div.card', {}, U.el('h3', {}, 'Source & people'),
      U.el('dl.kv', {},
        U.el('dt', {}, 'Request'), U.el('dd', {}, o.requestId ? U.el('a', { href: '#/requests/' + o.requestId }, o.requestId) : '—'),
        U.el('dt', {}, 'Owner'), U.el('dd', {}, Store.userName(o.owner)),
        U.el('dt', {}, 'Sponsor'), U.el('dd', {}, Store.userName(o.sponsor)),
        U.el('dt', {}, 'Created'), U.el('dd', {}, U.fmtDate(o.createdAt))));
    top.append(src);
    root.append(top);

    const grid = U.el('div.grid.cols-2');
    grid.append(scoresCard(o), gatesCard(o));
    root.append(grid);

    // Sprint link or conversion.
    if ((o.status === 'in-sprint' || o.status === 'done') && o.sprintId) {
      const sprint = Store.byId('sprints', o.sprintId);
      root.append(U.el('div.card', {}, U.el('h2', {}, '⚒ Sprint'),
        U.el('div.card-sub', {}, o.status === 'done' ? 'Delivered through a two-week sprint.' : 'Currently being built in a two-week sprint.'),
        U.el('div.chip-row', {},
          U.el('a.chip.sel', { href: '#/sprints/' + o.sprintId, style: { textDecoration: 'none' } },
            '⚒ ' + (sprint ? sprint.name : o.sprintId) + ' →'))));
    } else if (Store.can('createSprint')) {
      root.append(convertCard(o));
    }
  }

  // ---- scores card --------------------------------------------------------------
  function scoresCard(o) {
    const canScore = Store.can('score');
    const locked = ['in-sprint', 'done', 'declined'].includes(o.status);
    const card = U.el('div.card', {}, U.el('h2', {}, '⚖ Scores'),
      U.el('div.card-sub', {}, 'Each dimension 1–5. The priority score recomputes live as you change them.'));

    if (!canScore || locked) {
      if (!o.scores) card.append(U.el('div.card-sub', {}, 'Not scored yet.'));
      else SCORE_DEFS.forEach(def => {
        const v = o.scores[def.k];
        card.append(U.el('div', { style: { display: 'flex', justifyContent: 'space-between', gap: '10px', padding: '4px 0', borderBottom: '1px solid var(--grid)' } },
          U.el('span', {}, def.label),
          U.el('span.mono', { style: { color: 'var(--ink)' }, title: def.hint }, '●'.repeat(v) + '○'.repeat(5 - v) + '  ' + v + '/5')));
      });
      card.append(U.el('div', { style: { marginTop: '8px', fontSize: '12.5px' } },
        'Effort: ', U.el('span.badge.' + ({ S: 'b-ok', M: 'b-warn', L: 'b-serious' }[o.effort] || 'b-muted'), {}, o.effort || '—')));
      if (!canScore) card.append(U.el('div.hint', { style: { marginTop: '8px', fontSize: '11.5px', color: 'var(--muted)' } },
        'Only the AI Pioneer can rescore opportunities.'));
      card.append(U.el('div.assume', {}, U.el('h4', {}, 'Priority formula'), U.el('div.formula', {}, Calc.priorityFormula())));
      return card;
    }

    const draft = Object.assign({ urgency: 0, value: 0, feasibility: 0, risk: 0, reusability: 0 }, o.scores || {});
    const live = U.el('b', { style: { color: 'var(--accent)', fontSize: '18px' } },
      Calc.priorityScore(o.scores) === null ? '—' : Calc.priorityScore(o.scores).toFixed(1));
    const refreshLive = () => {
      const full = SCORE_DEFS.every(d => draft[d.k]);
      const v = full ? Calc.priorityScore(draft) : null;
      live.textContent = v === null ? '—' : v.toFixed(1);
    };

    SCORE_DEFS.forEach(def => {
      card.append(U.el('div', { style: { marginBottom: '10px' } },
        U.el('div', { style: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '10px', flexWrap: 'wrap' } },
          U.el('span', { style: { fontWeight: '600', color: 'var(--ink-2)' } }, def.label),
          scorePicker(draft[def.k], n => { draft[def.k] = n; refreshLive(); })),
        U.el('div', { style: { fontSize: '11.5px', color: 'var(--muted)', marginTop: '2px' } }, def.hint)));
    });

    const effortSel = U.el('select', { 'aria-label': 'Effort' });
    [['S', 'S — days'], ['M', 'M — one sprint'], ['L', 'L — sprint + follow-up']].forEach(x =>
      effortSel.append(U.el('option', { value: x[0] }, x[1])));
    effortSel.value = o.effort || 'M';
    card.append(U.el('div.form-row', {},
      U.el('div.field', {}, U.el('label', {}, 'Effort'), effortSel),
      U.el('div.field', {}, U.el('label', {}, 'Live priority score'),
        U.el('div', { style: { padding: '8px 2px' } }, live, U.el('span', { style: { color: 'var(--muted)', fontSize: '12px' } }, ' / 10')))));

    const saveBtn = U.el('button.btn.primary', {
      onclick() {
        if (SCORE_DEFS.some(d => !draft[d.k])) { App.toast('Set all five scores before saving.', 'error'); return; }
        const changes = [];
        SCORE_DEFS.forEach(d => {
          const before = o.scores ? o.scores[d.k] : null;
          if (before !== draft[d.k]) changes.push(d.k + ' ' + (before === null ? '—' : before) + '→' + draft[d.k]);
        });
        if ((o.effort || 'M') !== effortSel.value) changes.push('effort ' + (o.effort || 'M') + '→' + effortSel.value);
        if (!changes.length) { App.toast('No changes to save.'); return; }
        busy(saveBtn, true);
        Store.async(() => Store.update('opportunities', o.id,
          { scores: Object.assign({}, draft), effort: effortSel.value },
          'opportunity.rescored', 'Rescored ' + o.id + ': ' + changes.join(', ')))
          .then(() => { App.toast('Scores saved — priority recalculated.'); App.render(); })
          .catch(err => { App.toast(err.message, 'error'); busy(saveBtn, false); });
      },
    }, '⇩ Save scores');
    card.append(saveBtn);
    card.append(U.el('div.assume', {}, U.el('h4', {}, 'Priority formula'), U.el('div.formula', {}, Calc.priorityFormula())));
    return card;
  }

  // ---- approval gates card ---------------------------------------------------------
  function gatesCard(o) {
    const card = U.el('div.card', {}, U.el('h2', {}, '⛨ Approval gates'),
      U.el('div.card-sub', {}, 'High-risk or classified work needs security and legal sign-off before any sprint. Every decision carries a written rationale.'));

    const rows = [
      { k: 'security', label: 'Security review', perm: 'approveGate', hint: 'Security Reviewer role approves this gate.' },
      { k: 'legal', label: 'Legal review', perm: 'legalApprove', hint: 'Legal approval is recorded by the Pioneer or Security Reviewer on counsel’s behalf.' },
    ];
    rows.forEach(g => {
      const a = (o.approvals && o.approvals[g.k]) || { status: 'not-requested' };
      const st = a.status || 'not-requested';
      const row = U.el('div', { style: { padding: '10px 0', borderBottom: '1px solid var(--grid)' } },
        U.el('div', { style: { display: 'flex', alignItems: 'center', gap: '9px', flexWrap: 'wrap' } },
          U.el('b', { style: { color: 'var(--ink)' } }, g.label),
          U.el('span.badge.' + (GATE_BADGE[st] || 'b-muted'), {}, U.title(st))));
      if (a.by || a.at || a.note) {
        row.append(U.el('div', { style: { fontSize: '12px', color: 'var(--muted)', marginTop: '3px' } },
          (a.by ? Store.userName(a.by) : '—') + ' · ' + U.fmtDate(a.at)));
        if (a.note) row.append(U.el('div', { style: { fontSize: '12.5px', color: 'var(--ink-2)', marginTop: '3px' } }, '“' + a.note + '”'));
      }
      if (!['in-sprint', 'done'].includes(o.status) && st !== 'not-required') {
        if (Store.can(g.perm)) {
          const btns = U.el('div', { style: { display: 'flex', gap: '6px', marginTop: '7px' } });
          if (st !== 'approved') btns.append(U.el('button.btn.sm', { onclick: () => gateModal(o, g.k, g.label, 'approved') }, '✓ Approve'));
          if (st !== 'rejected') btns.append(U.el('button.btn.sm.danger', { onclick: () => gateModal(o, g.k, g.label, 'rejected') }, '✕ Reject'));
          row.append(btns);
        } else {
          row.append(U.el('div', { style: { fontSize: '11.5px', color: 'var(--muted)', marginTop: '5px' } }, g.hint));
        }
      }
      card.append(row);
    });

    if (gateSatisfied(o, 'security') && gateSatisfied(o, 'legal')) {
      card.append(U.el('div', { style: { marginTop: '10px', fontSize: '12.5px', color: '#4ec94e' } },
        '✓ All gates satisfied' + (gatesFree(o) && !wouldNeedGate(o) ? ' — no approvals required for this classification and risk level.' : '.')));
    }
    return card;
  }

  function gateModal(o, gateKey, gateLabel, decision) {
    const approving = decision === 'approved';
    App.modal({
      title: (approving ? 'Approve' : 'Reject') + ' — ' + gateLabel,
      body(el, close) {
        el.append(U.el('p', { style: { fontSize: '12.5px', color: 'var(--muted)' } },
          'A written rationale is required. It is shown on the opportunity and recorded permanently in the audit trail.'));
        const box = U.el('textarea', {
          placeholder: approving
            ? 'e.g. Approved: gateway-only, zero retention, identifiers pseudonymised before any model call.'
            : 'e.g. Rejected: no data-minimisation plan for the source documents — resubmit with redaction controls.',
        });
        const f = U.el('div.field', {}, U.el('label', {}, 'Rationale', U.el('span.req', {}, ' *')), box);
        const go = U.el('button.btn' + (approving ? '.primary' : '.danger'), {
          onclick() {
            const note = box.value.trim();
            if (!note) {
              f.classList.add('invalid');
              if (!f.querySelector('.err')) f.append(U.el('div.err', {}, 'A written rationale is required.'));
              return;
            }
            busy(go, true, 'Recording…');
            Store.async(() => {
              Store.mutate('opportunities', o.id, it => {
                if (!it.approvals) it.approvals = {};
                it.approvals[gateKey] = { status: decision, by: Store.currentUser().id, at: new Date().toISOString(), note };
              }, approving ? 'approval.granted' : 'approval.rejected',
                U.title(gateKey) + ' gate ' + decision + ' for ' + o.id + ': ' + note);
              const fresh = Store.byId('opportunities', o.id);
              if (!approving) {
                if (['gated', 'ready'].includes(fresh.status)) {
                  Store.update('opportunities', o.id, { status: 'backlog' }, 'opportunity.gate-rejected',
                    'Returned to backlog after ' + gateKey + ' rejection');
                }
              } else if (gateSatisfied(fresh, 'security') && gateSatisfied(fresh, 'legal') && ['gated', 'backlog'].includes(fresh.status)) {
                Store.update('opportunities', o.id, { status: 'ready' }, 'opportunity.gate-cleared',
                  'All approval gates cleared — ready for sprint');
              }
            }).then(() => {
              close();
              App.toast(approving ? gateLabel + ' approved.' : gateLabel + ' rejected — opportunity returned to backlog.', approving ? '' : 'warn');
              App.render();
            }).catch(err => { App.toast(err.message, 'error'); busy(go, false); });
          },
        }, approving ? '✓ Approve gate' : '✕ Reject gate');
        el.append(f, U.el('div', { style: { display: 'flex', gap: '8px', justifyContent: 'flex-end' } },
          U.el('button.btn', { onclick: close }, 'Cancel'), go));
      },
    });
  }

  // ---- convert to sprint -------------------------------------------------------------
  function convertBlockReason(o) {
    if (o.status === 'ready') return null;
    if (o.status === 'declined') return 'This opportunity was declined and cannot be converted.';
    const pend = ['security', 'legal'].filter(k => gateStatus(o, k) === 'pending');
    const rej = ['security', 'legal'].filter(k => gateStatus(o, k) === 'rejected');
    if (pend.length || rej.length) {
      return 'Blocked by approval gate: ' +
        pend.map(k => k + ' review pending').concat(rej.map(k => k + ' review rejected')).join(', ') + '.';
    }
    if (o.status !== 'backlog') return 'Status “' + U.title(o.status) + '” cannot be converted.';
    if (!o.scores) return 'No scores recorded — save scores before converting.';
    if (['Confidential', 'Restricted'].includes(o.classification)) {
      return 'Blocked: ' + o.classification + ' data requires security + legal sign-off before a sprint.';
    }
    if (o.scores.risk >= 4) {
      return 'Blocked: risk score ' + o.scores.risk + '/5 requires security + legal sign-off before a sprint.';
    }
    return null;
  }

  function convertCard(o) {
    const card = U.el('div.card', {}, U.el('h2', {}, '⚒ Convert to sprint'),
      U.el('div.card-sub', {}, 'One builder, two weeks, six phases — discovery to handover — with an evidence gate before launch.'));

    const reason = convertBlockReason(o);
    const btn = U.el('button.btn.primary', {
      disabled: reason ? true : null,
      title: reason || 'Creates a two-week sprint workspace from this opportunity',
      onclick: () => { if (!reason) convertModal(o); },
    }, '⚒ Convert to two-week sprint');
    card.append(btn);
    if (reason) {
      card.append(U.el('div', { style: { marginTop: '8px', fontSize: '12.5px', color: 'var(--warn)' } }, '⏳ ' + reason));
      const bothUnrequested = gateStatus(o, 'security') === 'not-requested' && gateStatus(o, 'legal') === 'not-requested';
      if (wouldNeedGate(o) && bothUnrequested && Store.can('prioritise')) {
        const reqBtn = U.el('button.btn', {
          style: { marginTop: '10px' },
          onclick() {
            busy(reqBtn, true, 'Requesting…');
            Store.async(() => Store.mutate('opportunities', o.id, it => {
              if (!it.approvals) it.approvals = {};
              ['security', 'legal'].forEach(k => {
                if (!it.approvals[k] || it.approvals[k].status === 'not-requested') it.approvals[k] = { status: 'pending' };
              });
              it.status = 'gated';
            }, 'approval.requested', 'Security + legal approvals requested for ' + o.id))
              .then(() => { App.toast('Approvals requested — security and legal reviews are now pending.'); App.render(); })
              .catch(err => { App.toast(err.message, 'error'); busy(reqBtn, false); });
          },
        }, '⛨ Request approvals');
        card.append(U.el('div', {}, reqBtn));
      }
    }
    return card;
  }

  function convertModal(o) {
    App.modal({
      title: 'Convert ' + o.id + ' to a two-week sprint',
      body(el, close) {
        const iName = U.el('input', { type: 'text' });
        iName.value = o.title;
        const iDate = U.el('input', { type: 'date' });
        iDate.value = new Date().toISOString().slice(0, 10);
        const fName = U.el('div.field', {}, U.el('label', {}, 'Sprint name', U.el('span.req', {}, ' *')), iName);
        const fDate = U.el('div.field', {}, U.el('label', {}, 'Start date', U.el('span.req', {}, ' *')), iDate,
          U.el('div.hint', {}, 'End date is set automatically 14 days later.'));
        el.append(U.el('p', { style: { fontSize: '12.5px', color: 'var(--muted)' } },
          'Creates a sprint workspace with the six-phase checklist (discovery → handover), you as Builder and ' +
          Store.userName(o.sponsor) + ' as Sponsor.'));
        const go = U.el('button.btn.primary', {
          onclick() {
            const name = iName.value.trim();
            let ok = true;
            fName.classList.toggle('invalid', !name); if (!name) ok = false;
            const start = iDate.value ? new Date(iDate.value + 'T09:00:00') : null;
            const badDate = !start || isNaN(start.getTime());
            fDate.classList.toggle('invalid', badDate); if (badDate) ok = false;
            if (!ok) return;
            busy(go, true, 'Creating…');
            Store.async(() => {
              const end = new Date(start); end.setDate(end.getDate() + 14);
              const sprint = Store.add('sprints', sprintSkeleton(o, name, start.toISOString(), end.toISOString()), 'sprint.created');
              Store.update('opportunities', o.id, { status: 'in-sprint', sprintId: sprint.id },
                'opportunity.converted', 'Converted to sprint ' + sprint.id);
              return sprint;
            }).then(s => {
              close();
              App.toast('Sprint “' + s.name + '” created — two weeks on the clock.');
              App.go('sprints/' + s.id);
            }).catch(err => { App.toast(err.message, 'error'); busy(go, false); });
          },
        }, '⚒ Create sprint');
        el.append(fName, fDate, U.el('div', { style: { display: 'flex', gap: '8px', justifyContent: 'flex-end' } },
          U.el('button.btn', { onclick: close }, 'Cancel'), go));
      },
    });
  }

  function sprintSkeleton(o, name, startISO, endISO) {
    const me = Store.currentUser().id;
    const stakeholders = [{ user: me, role: 'Builder' }];
    if (o.sponsor && o.sponsor !== me) stakeholders.push({ user: o.sponsor, role: 'Sponsor' });
    const it = t => ({ text: t, done: false });
    return {
      oppId: o.id, name, dept: o.dept,
      classification: o.classification || 'Internal', // sprints inherit their opportunity's classification
      startDate: startISO, endDate: endISO,
      status: 'active', phase: 'discovery', goal: '',
      stakeholders,
      phases: {
        discovery: { items: [it('Shadow the people doing the work today'), it('Collect ground-truth examples with the domain expert'), it('Record baseline metrics (time, quality, cost)')] },
        build: { items: [it('Thin end-to-end slice first'), it('Observability wired from day one (logs, cost, evals)'), it('Privacy/redaction controls where data is sensitive')] },
        evaluation: { items: [it('Pre-registered eval thresholds agreed with sponsor'), it('Run evaluation and record evidence')] },
        launch: { items: [it('Risk gate re-checked before go-live'), it('Pilot with named users')] },
        adoption: { items: [it('Training / walkthrough for the team'), it('Usage reviewed after 2 weeks')] },
        handover: { items: [it('Runbook written and owner named'), it('Alerts wired to #ai-ops')] },
      },
      decisions: [], blockers: [],
      links: { repos: [], files: [], tools: [] },
      baseline: null, final: null, retro: null,
    };
  }
})();
