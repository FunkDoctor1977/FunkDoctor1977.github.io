/* SwiggOS — views/sprints.js
   Sprint workspace: two-week delivery sprints from discovery to handover.
   List = in-flight cards + completed/paused table. Detail = phase stepper,
   checklists, stakeholders, decisions, blockers, links, results, retro. */
(function () {
  'use strict';

  App.view('sprints', {
    title: 'Sprint workspace', navLabel: 'Sprints', icon: '⚒',
    count() { return Store.get('sprints').filter(s => s.status === 'active').length; },
    render(root, params) {
      if (params.length) renderDetail(root, params[0]);
      else renderList(root);
    },
  });

  // ---- shared helpers -------------------------------------------------------
  function fail(err) { App.toast(err.message, 'error'); }
  function ok(msg) { App.toast(msg); App.render(); }

  function statusBadge(status) {
    const map = { active: 'b-accent', complete: 'b-ok', paused: 'b-warn' };
    return U.el('span.badge.' + (map[status] || 'b-muted'), {}, U.title(status));
  }
  function dayOf(s) { return U.clamp(U.workingDaysBetween(s.startDate, new Date().toISOString()), 1, 10); }
  function phaseItems(s, p) { return (s.phases && s.phases[p] && s.phases[p].items) || []; }
  function progress(s) {
    let total = 0, done = 0;
    PHASES.forEach(p => { const items = phaseItems(s, p); total += items.length; done += items.filter(i => i.done).length; });
    return { done, total, pct: Math.round((done / Math.max(1, total)) * 100) };
  }
  function openBlockers(s) { return (s.blockers || []).filter(b => b.status === 'open'); }

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
  function select(options, value) {
    const s = U.el('select');
    options.forEach(o => {
      const v = (o && o.value !== undefined) ? o.value : o;
      const lb = (o && o.label !== undefined) ? o.label : o;
      s.append(U.el('option', { value: v }, lb));
    });
    if (value !== undefined && value !== null) s.value = value;
    return s;
  }
  function btnRow(close, saveLabel, onSave) {
    return U.el('div', { style: { display: 'flex', gap: '8px', justifyContent: 'flex-end', marginTop: '14px' } },
      U.el('button.btn', { onclick: close }, 'Cancel'),
      U.el('button.btn.primary', { onclick: onSave }, saveLabel));
  }

  // ---- list -------------------------------------------------------------------
  function renderList(root) {
    root.append(App.pageHead('Sprint workspace', 'Two-week delivery sprints — discovery to handover.'));
    // Sprints inherit the classification of their source opportunity; filter accordingly.
    const all = Store.get('sprints');
    const sprints = all.filter(s => Store.canSee(s));
    const hiddenN = all.length - sprints.length;
    const active = sprints.filter(s => s.status === 'active');
    const rest = sprints.filter(s => s.status !== 'active');

    const flight = U.el('div.card', {}, U.el('h2', {}, '⚒ In flight', ' ', U.el('span.pill.badge.b-muted', {}, String(active.length))));
    if (!active.length) {
      flight.append(App.empty('⚒', 'No active sprints', 'Convert a prioritised backlog opportunity into a sprint to start delivering.',
        U.el('button.btn.primary', { onclick: () => App.go('backlog') }, 'Open backlog')));
    } else {
      const g = U.el('div.grid.cols-2');
      active.forEach(s => {
        const pr = progress(s);
        const blk = openBlockers(s).length;
        g.append(U.el('div.card', { style: { cursor: 'pointer' }, onclick: () => App.go('sprints/' + s.id) },
          U.el('h3', {}, s.name, ' ', U.el('span.badge.b-accent', {}, 'day ' + dayOf(s) + ' of 10')),
          U.el('div.card-sub', {}, s.dept + ' · phase: ' + U.title(s.phase)),
          U.el('div.progressbar', {}, U.el('i', { style: { width: pr.pct + '%' } })),
          U.el('div', { style: { display: 'flex', justifyContent: 'space-between', marginTop: '7px', fontSize: '12px', color: 'var(--muted)' } },
            U.el('span', {}, pr.done + '/' + pr.total + ' checklist items'),
            blk ? U.el('span.badge.b-serious', {}, blk + ' open blocker' + (blk > 1 ? 's' : ''))
              : U.el('span.badge.b-ok', {}, 'no blockers'))));
      });
      flight.append(g);
    }
    root.append(flight);

    const doneCard = U.el('div.card', {}, U.el('h2', {}, '☑ Completed & paused'));
    if (!rest.length) {
      doneCard.append(App.empty('◌', 'Nothing here yet', 'Completed and paused sprints will appear here with their outcomes.'));
    } else {
      const tbl = U.el('table.tbl');
      tbl.append(U.el('thead', {}, U.el('tr', {},
        U.el('th', {}, 'Sprint'), U.el('th', {}, 'Dept'), U.el('th', {}, 'Dates'), U.el('th', {}, 'Status'), U.el('th', {}, 'Outcome'))));
      const tb = U.el('tbody');
      rest.forEach(s => {
        const outcome = U.el('td');
        if (s.baseline && s.final) {
          outcome.append(U.el('div', {}, U.fmtNum(s.baseline.value) + ' → ' + U.fmtNum(s.final.value) + ' ' + s.baseline.unit + ' · ' + s.baseline.metric));
          const a = Calc.annualValue(s);
          if (a) outcome.append(U.el('div', { style: { marginTop: '3px' } },
            U.el('b', { style: { color: 'var(--ink)' } }, U.fmtGBP(a.value) + '/yr net'), ' ',
            U.el('span.basis.' + a.basis, {}, a.basis)));
        } else outcome.append('—');
        tb.append(U.el('tr.rowlink', { onclick: () => App.go('sprints/' + s.id) },
          U.el('td', {}, U.el('b', { style: { color: 'var(--ink)' } }, s.name)),
          U.el('td', {}, s.dept),
          U.el('td', {}, U.fmtDate(s.startDate) + ' → ' + U.fmtDate(s.endDate)),
          U.el('td', {}, statusBadge(s.status)),
          outcome));
      });
      tbl.append(tb);
      doneCard.append(U.el('div.tbl-wrap', {}, tbl));
    }
    root.append(doneCard);
    if (hiddenN) root.append(U.el('div', { style: { fontSize: '12px', color: 'var(--muted)', margin: '2px 4px' } },
      hiddenN + ' sprint(s) hidden by your access level.'));
  }

  // ---- detail --------------------------------------------------------------------
  function renderDetail(root, id) {
    const s = Store.byId('sprints', id);
    if (!s) {
      root.append(App.empty('⚒', 'Sprint not found', 'No sprint exists with ID "' + id + '". It may have been removed or the link is stale.',
        U.el('button.btn.primary', { onclick: () => App.go('sprints') }, '← Back to sprints')));
      return;
    }
    if (!Store.canSee(s)) {
      root.append(App.pageHead('Sprint workspace'));
      root.append(App.denied('view this sprint (' + (s.classification || 'classified') + ')'));
      return;
    }
    const canEdit = Store.can('editSprint');

    // header ------------------------------------------------------------------
    const actions = [];
    if (canEdit && s.status === 'active') {
      actions.push(U.el('button.btn', { onclick: () => pauseModal(s) }, '⏸ Pause'));
      const complete = U.el('button.btn.primary', {
        disabled: !s.final,
        title: s.final ? 'Mark this sprint complete and create its adoption tracker' : 'Record final results first — a sprint completes on evidence, not on time.',
        onclick: () => completeSprint(s),
      }, '✓ Complete sprint');
      actions.push(complete);
    }
    root.append(App.pageHead(s.name, s.goal, ...actions));
    root.append(U.el('div', { style: { display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap', margin: '-6px 0 14px' } },
      statusBadge(s.status),
      s.status === 'active' ? U.el('span.badge.b-accent', {}, 'day ' + dayOf(s) + ' of 10') : null,
      U.el('span', { style: { color: 'var(--muted)', fontSize: '12.5px' } }, s.dept),
      s.oppId ? U.el('a.chip', { href: '#/backlog/' + s.oppId }, '⇱ Source opportunity: ' + s.oppId) : null,
      !canEdit ? U.el('span', { style: { color: 'var(--muted)', fontSize: '11.5px' } }, 'Read-only — only the AI Pioneer can edit sprints.') : null));

    if (s.status === 'paused') {
      root.append(U.el('div.card', { style: { borderColor: 'rgba(250,178,25,.5)', background: 'rgba(250,178,25,.05)' } },
        U.el('h3', {}, U.el('span.badge.b-warn', {}, 'Paused'), ' Sprint is paused'),
        U.el('p', { style: { margin: '4px 0 10px' } }, s.pauseReason ? 'Reason: ' + s.pauseReason : 'No pause reason recorded.'),
        canEdit
          ? U.el('button.btn.primary', {
              onclick: () => Store.async(() => Store.update('sprints', s.id, { status: 'active', pauseReason: null }, 'sprint.resumed', 'Sprint resumed'))
                .then(() => ok('Sprint resumed')).catch(fail),
            }, '▶ Resume sprint')
          : U.el('div', { style: { fontSize: '11.5px', color: 'var(--muted)' } }, 'Only the AI Pioneer can resume a paused sprint.')));
    }

    root.append(stepperCard(s, canEdit));
    root.append(checklistCard(s, canEdit));

    const grid = U.el('div.grid.cols-2');
    grid.append(stakeholderCard(s, canEdit));
    grid.append(decisionsCard(s, canEdit));
    root.append(grid);

    const grid2 = U.el('div.grid.cols-2');
    grid2.append(blockersCard(s, canEdit));
    grid2.append(linksCard(s, canEdit));
    root.append(grid2);

    root.append(resultsCard(s, canEdit));
    root.append(retroCard(s, canEdit));
  }

  // ---- 1) phase stepper ---------------------------------------------------------
  function stepperCard(s, canEdit) {
    const card = U.el('div.card', {}, U.el('h2', {}, '⇶ Phase'),
      U.el('div.card-sub', {}, canEdit && s.status === 'active'
        ? 'Click a phase to move the sprint. A step lights green when every checklist item in it is done.'
        : 'A step lights green when every checklist item in it is done.'));
    const stepper = U.el('div.stepper');
    PHASES.forEach(p => {
      const items = phaseItems(s, p);
      const allDone = items.length > 0 && items.every(i => i.done);
      let cls = 'div.step';
      if (p === s.phase) cls += '.current'; else if (allDone) cls += '.done';
      const attrs = {};
      if (canEdit && s.status === 'active' && p !== s.phase) {
        attrs.onclick = () => App.confirm('Move phase?', 'Move "' + s.name + '" from ' + U.title(s.phase) + ' to ' + U.title(p) + '?', () => {
          Store.async(() => Store.update('sprints', s.id, { phase: p }, 'sprint.phase-changed', 'Moved to ' + p))
            .then(() => ok('Phase moved to ' + U.title(p))).catch(fail);
        }, 'Move');
        attrs.title = 'Move sprint to ' + U.title(p);
      } else {
        attrs.style = { cursor: 'default' };
      }
      stepper.append(U.el(cls, attrs, U.title(p)));
    });
    card.append(stepper);
    return card;
  }

  // ---- 2) phase checklists ---------------------------------------------------------
  function checklistCard(s, canEdit) {
    const card = U.el('div.card', {}, U.el('h2', {}, '☑ Phase checklists'),
      U.el('div.card-sub', {}, 'The current phase is expanded; the rest stay collapsed to keep this scannable.'));
    PHASES.forEach(p => {
      const items = phaseItems(s, p);
      const doneN = items.filter(i => i.done).length;
      const det = U.el('details', p === s.phase ? { open: true } : {},
        U.el('summary', { style: { cursor: 'pointer', fontWeight: '600', padding: '7px 0', color: p === s.phase ? 'var(--accent)' : 'var(--ink-2)' } },
          U.title(p) + ' — ' + doneN + '/' + items.length + (p === s.phase ? ' (current)' : '')));
      const ul = U.el('ul.check-list');
      if (!items.length) ul.append(U.el('li', {}, U.el('span', { style: { color: 'var(--muted)' } }, 'No items yet.')));
      items.forEach((it, idx) => {
        const cb = U.el('input', {
          type: 'checkbox', checked: !!it.done, disabled: !canEdit,
          title: canEdit ? undefined : 'Only the AI Pioneer can update checklists',
          onchange: () => {
            Store.async(() => Store.mutate('sprints', s.id, x => {
              const item = phaseItems(x, p)[idx];
              if (item) item.done = !item.done;
            }, 'sprint.checklist', 'Toggled "' + it.text + '"'))
              .then(() => ok('Checklist updated'))
              .catch(err => { fail(err); App.render(); });
          },
        });
        ul.append(U.el('li' + (it.done ? '.done' : ''), {}, cb,
          U.el('span', { style: { flex: '1' } }, it.text),
          canEdit ? U.el('button.btn.sm.ghost', {
            'aria-label': 'Remove item', title: 'Remove this item',
            onclick: () => Store.async(() => Store.mutate('sprints', s.id, x => {
              phaseItems(x, p).splice(idx, 1);
            }, 'sprint.checklist', 'Removed "' + it.text + '" from ' + p))
              .then(() => ok('Item removed')).catch(fail),
          }, '✕') : null));
      });
      det.append(ul);
      if (canEdit) {
        const inp = U.el('input.search-input', { type: 'text', placeholder: 'Add an item to ' + U.title(p) + '…', style: { flex: '1', width: 'auto' } });
        const add = () => {
          const t = inp.value.trim();
          if (!t) { App.toast('Type an item first.', 'warn'); return; }
          Store.async(() => Store.mutate('sprints', s.id, x => {
            if (!x.phases[p]) x.phases[p] = { items: [] };
            x.phases[p].items.push({ text: t, done: false });
          }, 'sprint.checklist', 'Added "' + t + '" to ' + p))
            .then(() => ok('Item added')).catch(fail);
        };
        inp.addEventListener('keydown', e => { if (e.key === 'Enter') add(); });
        det.append(U.el('div', { style: { display: 'flex', gap: '8px', margin: '8px 0 4px' } }, inp,
          U.el('button.btn.sm', { onclick: add }, '+ Add')));
      }
      card.append(det);
    });
    return card;
  }

  // ---- 3) stakeholders ---------------------------------------------------------------
  function stakeholderCard(s, canEdit) {
    const card = U.el('div.card', {}, U.el('h2', {}, '◎ Stakeholders'));
    const list = s.stakeholders || [];
    if (!list.length) card.append(U.el('div.card-sub', {}, 'No stakeholders recorded.'));
    list.forEach((st, idx) => {
      const name = Store.userName(st.user);
      card.append(U.el('div', { style: { display: 'flex', alignItems: 'center', gap: '10px', padding: '6px 0', borderBottom: '1px solid var(--grid)' } },
        U.el('span.avatar', {}, U.initials(name)),
        U.el('div', { style: { flex: '1' } },
          U.el('div', { style: { color: 'var(--ink)', fontWeight: '600', fontSize: '13px' } }, name),
          U.el('div', { style: { fontSize: '11.5px', color: 'var(--muted)' } }, st.role)),
        canEdit ? U.el('button.btn.sm.ghost', {
          'aria-label': 'Remove stakeholder', title: 'Remove ' + name,
          onclick: () => Store.async(() => Store.mutate('sprints', s.id, x => {
            x.stakeholders.splice(idx, 1);
          }, 'sprint.stakeholders', 'Removed stakeholder ' + name))
            .then(() => ok('Stakeholder removed')).catch(fail),
        }, '✕') : null));
    });
    if (canEdit) {
      const userSel = select(Store.get('users').map(u => ({ value: u.id, label: u.name + ' — ' + u.title })));
      const roleInp = U.el('input', { type: 'text', placeholder: 'Role on this sprint…' });
      const add = () => {
        const role = roleInp.value.trim();
        if (!role) { App.toast('Give the stakeholder a role, e.g. "Product owner".', 'warn'); return; }
        const name = Store.userName(userSel.value);
        Store.async(() => Store.mutate('sprints', s.id, x => {
          x.stakeholders.push({ user: userSel.value, role });
        }, 'sprint.stakeholders', 'Added stakeholder ' + name + ' (' + role + ')'))
          .then(() => ok('Stakeholder added')).catch(fail);
      };
      card.append(U.el('div.filters', { style: { marginTop: '10px', marginBottom: '0' } },
        userSel, roleInp, U.el('button.btn.sm', { onclick: add }, '+ Add')));
    }
    return card;
  }

  // ---- 4) decisions log ---------------------------------------------------------------
  function decisionsCard(s, canEdit) {
    const card = U.el('div.card', {}, U.el('h2', {}, '⚖ Decisions'),
      U.el('div.card-sub', {}, 'Every decision carries its rationale — no decision without a why.'));
    const decisions = (s.decisions || []).slice().reverse();
    if (!decisions.length) card.append(U.el('div.card-sub', {}, 'No decisions recorded yet.'));
    else {
      const tl = U.el('ul.timeline');
      decisions.forEach((d, i) => {
        tl.append(U.el('li' + (i === 0 ? '.hot' : ''), {},
          U.el('div', { style: { color: 'var(--ink)', fontWeight: '600' } }, d.text),
          U.el('div', { style: { fontSize: '12.5px', margin: '2px 0' } }, 'Why: ' + d.rationale),
          U.el('div.t-meta', {}, Store.userName(d.by) + ' · ' + U.fmtDateTime(d.at))));
      });
      card.append(tl);
    }
    if (canEdit) {
      const dTa = U.el('textarea', { rows: 2, placeholder: 'What was decided?' });
      const rTa = U.el('textarea', { rows: 2, placeholder: 'Why? What was traded off?' });
      const fD = field('Decision', dTa), fR = field('Rationale', rTa, 'Required.');
      const save = () => {
        clearErr(fD); clearErr(fR);
        const text = dTa.value.trim(), rationale = rTa.value.trim();
        let bad = false;
        if (!text) { fieldErr(fD, 'Describe the decision.'); bad = true; }
        if (!rationale) { fieldErr(fR, 'No decision without a why.'); bad = true; }
        if (bad) return;
        Store.async(() => Store.mutate('sprints', s.id, x => {
          x.decisions.push({ text, rationale, by: Store.currentUser().id, at: new Date().toISOString() });
        }, 'sprint.decision', 'Decision recorded: ' + text.slice(0, 90)))
          .then(() => ok('Decision recorded')).catch(fail);
      };
      card.append(U.el('div', { style: { marginTop: '10px' } }, fD, fR,
        U.el('button.btn.primary.sm', { onclick: save }, '+ Record decision')));
    }
    return card;
  }

  // ---- 5) blockers --------------------------------------------------------------------
  function blockersCard(s, canEdit) {
    const open = openBlockers(s);
    const card = U.el('div.card', {}, U.el('h2', {}, '⚠ Blockers', ' ',
      open.length ? U.el('span.badge.b-serious', {}, open.length + ' open') : U.el('span.badge.b-ok', {}, 'none open')));
    const blockers = s.blockers || [];
    if (!blockers.length) card.append(U.el('div.card-sub', {}, 'Nothing blocking this sprint.'));
    blockers.forEach((b, idx) => {
      const isOpen = b.status === 'open';
      const row = U.el('div', {
        style: {
          padding: '8px 10px', margin: '6px 0', borderRadius: '7px',
          background: isOpen ? 'rgba(236,131,90,.07)' : 'var(--surface-2)',
          borderLeft: isOpen ? '3px solid var(--serious)' : '3px solid var(--grid)',
        },
      },
        U.el('div', { style: { display: 'flex', gap: '8px', alignItems: 'baseline', flexWrap: 'wrap' } },
          U.el('span.badge.' + U.sevClass(b.severity), {}, b.severity),
          U.el('span', { style: { flex: '1', color: isOpen ? 'var(--ink)' : 'var(--ink-2)' } }, b.text),
          isOpen ? U.el('span.badge.b-serious', {}, 'open') : U.el('span.badge.b-ok', {}, 'resolved')),
        U.el('div', { style: { fontSize: '11.5px', color: 'var(--muted)', marginTop: '3px' } },
          'Raised ' + U.fmtDate(b.raisedAt) + (b.resolvedAt ? ' · resolved ' + U.fmtDate(b.resolvedAt) : '')));
      if (b.resolution) row.append(U.el('div', { style: { fontSize: '12px', marginTop: '3px' } }, 'Resolution: ' + b.resolution));
      if (isOpen && canEdit) {
        row.append(U.el('div', { style: { marginTop: '6px' } },
          U.el('button.btn.sm', { onclick: () => resolveBlockerModal(s, idx, b) }, '✓ Resolve')));
      }
      card.append(row);
    });
    if (canEdit) {
      const inp = U.el('input', { type: 'text', placeholder: 'What is blocking progress?', style: { flex: '1' } });
      const sevSel = select(['low', 'medium', 'high', 'critical'], 'medium');
      const raise = () => {
        const t = inp.value.trim();
        if (!t) { App.toast('Describe the blocker first.', 'warn'); return; }
        Store.async(() => Store.mutate('sprints', s.id, x => {
          x.blockers.push({ text: t, severity: sevSel.value, status: 'open', raisedAt: new Date().toISOString(), resolvedAt: null, resolution: null });
        }, 'sprint.blocker-raised', 'Blocker raised (' + sevSel.value + '): ' + t.slice(0, 90)))
          .then(() => ok('Blocker raised')).catch(fail);
      };
      card.append(U.el('div.filters', { style: { marginTop: '10px', marginBottom: '0' } },
        inp, sevSel, U.el('button.btn.sm', { onclick: raise }, '⚑ Raise')));
    }
    return card;
  }

  function resolveBlockerModal(s, idx, b) {
    App.modal({
      title: 'Resolve blocker',
      body(el, close) {
        el.append(U.el('p', { style: { fontSize: '13px' } }, U.el('span.badge.' + U.sevClass(b.severity), {}, b.severity), ' ', b.text));
        const ta = U.el('textarea', { rows: 3, placeholder: 'How was it resolved?' });
        const f = field('Resolution', ta, 'Required — the resolution becomes part of the sprint record.');
        el.append(f, btnRow(close, 'Mark resolved', () => {
          clearErr(f);
          const res = ta.value.trim();
          if (!res) { fieldErr(f, 'Say how the blocker was resolved.'); return; }
          Store.async(() => Store.mutate('sprints', s.id, x => {
            const blk = x.blockers[idx];
            if (blk) { blk.status = 'resolved'; blk.resolvedAt = new Date().toISOString(); blk.resolution = res; }
          }, 'sprint.blocker-resolved', 'Blocker resolved: ' + b.text.slice(0, 90)))
            .then(() => { close(); ok('Blocker resolved'); }).catch(fail);
        }));
      },
    });
  }

  // ---- 6) links --------------------------------------------------------------------------
  const LINK_GROUPS = [['repos', 'Repositories'], ['files', 'Files'], ['tools', 'Tools']];
  function linksCard(s, canEdit) {
    const card = U.el('div.card', {}, U.el('h2', {}, '⧉ Links'));
    const links = s.links || {};
    LINK_GROUPS.forEach(([key, label]) => {
      const arr = links[key] || [];
      const row = U.el('div.chip-row', { style: { marginBottom: '10px' } });
      if (!arr.length) row.append(U.el('span', { style: { fontSize: '12px', color: 'var(--muted)' } }, 'None.'));
      arr.forEach((t, idx) => {
        const chip = U.el('span.chip', { style: { cursor: 'default' } }, t);
        if (canEdit) chip.append(U.el('button', {
          'aria-label': 'Remove link', title: 'Remove',
          style: { background: 'none', border: 'none', color: 'var(--muted)', cursor: 'pointer', padding: '0 0 0 6px', font: 'inherit' },
          onclick: () => Store.async(() => Store.mutate('sprints', s.id, x => {
            x.links[key].splice(idx, 1);
          }, 'sprint.links', 'Removed "' + t + '" from ' + key))
            .then(() => ok('Link removed')).catch(fail),
        }, '✕'));
        row.append(chip);
      });
      card.append(U.el('h4', { style: { marginBottom: '4px' } }, label), row);
    });
    if (canEdit) {
      const inp = U.el('input', { type: 'text', placeholder: 'repo URL, file name or tool…', style: { flex: '1' } });
      const grpSel = select(LINK_GROUPS.map(([key, label]) => ({ value: key, label })));
      const add = () => {
        const t = inp.value.trim();
        if (!t) { App.toast('Type a link or name first.', 'warn'); return; }
        Store.async(() => Store.mutate('sprints', s.id, x => {
          if (!x.links) x.links = {};
          if (!x.links[grpSel.value]) x.links[grpSel.value] = [];
          x.links[grpSel.value].push(t);
        }, 'sprint.links', 'Added "' + t + '" to ' + grpSel.value))
          .then(() => ok('Link added')).catch(fail);
      };
      card.append(U.el('div.filters', { style: { marginBottom: '0' } },
        inp, grpSel, U.el('button.btn.sm', { onclick: add }, '+ Add')));
    }
    return card;
  }

  // ---- 7) results — the evidence heart -------------------------------------------------------
  const UNITS = ['h/wk per person', 'h/wk', 'h/request', 'h/role', 'hours'];
  function resultsCard(s, canEdit) {
    const card = U.el('div.card', {}, U.el('h2', {}, '◔ Results'),
      U.el('div.card-sub', {}, 'Baseline before the sprint, final after launch. Every number states where it came from.'));
    const grid = U.el('div.grid.cols-2');
    grid.append(resultCol(s, 'baseline', canEdit), resultCol(s, 'final', canEdit));
    card.append(grid);

    if (s.baseline && s.final) {
      const b = s.baseline, f = s.final;
      const comp = U.el('div', { style: { marginTop: '14px' } }, U.el('h3', {}, 'Baseline → final'));
      if (b.unit !== f.unit) {
        comp.append(U.el('span.badge.b-warn.big', {}, '⚠ Units differ (' + b.unit + ' vs ' + f.unit + ') — no like-for-like delta'));
      } else {
        const pct = b.value ? Math.round(((f.value - b.value) / b.value) * 100) : null;
        const improved = f.value < b.value; // lower is better for time metrics
        const hrs = Calc.hoursSavedPerWeek(s);
        const a = Calc.annualValue(s);
        const tiles = U.el('div.grid.cols-3');
        tiles.append(U.el('div.stat', {},
          U.el('div.k', {}, U.fmtNum(b.value) + ' → ' + U.fmtNum(f.value)),
          U.el('div.l', {}, b.unit + ' · ' + b.metric),
          pct !== null ? U.el('div.d' + (improved ? '.up' : '.down'), {}, (pct > 0 ? '+' : '−') + Math.abs(pct) + '%' + (improved ? ' — improved' : ' — worse')) : null));
        tiles.append(U.el('div.stat', {},
          U.el('div.k', {}, hrs === null ? '—' : U.fmtNum(hrs, 1) + ' h'),
          U.el('div.l', {}, 'hours handed back / week'),
          hrs === null ? U.el('div.d', {}, 'no per-week conversion for unit "' + b.unit + '"') : null));
        const valTile = U.el('div.stat.accent', {},
          U.el('div.k', {}, a ? U.fmtGBP(a.value) : '—'),
          U.el('div.l', {}, 'net annual value'),
          a ? U.el('div.d', {}, U.el('span.basis.' + a.basis, {}, a.basis)) : U.el('div.d', {}, 'not computable for this unit'));
        tiles.append(valTile);
        comp.append(tiles);
        if (a) {
          comp.append(U.el('div.assume', {},
            U.el('h4', {}, 'How the annual value is calculated'),
            U.el('div.formula', {}, a.formula),
            U.el('ul', {}, a.assumptions.map(t => U.el('li', {}, t)))));
        }
      }
      card.append(comp);
    }
    return card;
  }

  function resultCol(s, which, canEdit) {
    const r = s[which];
    const label = which === 'baseline' ? 'Baseline' : 'Final';
    const col = U.el('div.card', {}, U.el('h3', {}, label));
    if (!r) {
      col.append(App.empty('◌', 'No ' + which + ' yet',
        which === 'final' ? 'Record final results after launch to prove the impact.' : 'Record the pre-sprint baseline so the delta means something.',
        canEdit ? U.el('button.btn.primary', { onclick: () => recordModal(s, which) }, 'Record ' + which)
          : U.el('span', { style: { fontSize: '11.5px', color: 'var(--muted)' } }, 'Only the AI Pioneer can record results.')));
      return col;
    }
    const kv = U.el('dl.kv');
    const pair = (k, v) => { kv.append(U.el('dt', {}, k), U.el('dd', {}, v)); };
    pair('Metric', r.metric);
    pair('Value', U.fmtNum(r.value) + ' ' + r.unit);
    pair('People', U.fmtNum(r.people, 0));
    pair('Quality', r.quality || '—');
    pair('Run cost / month', U.fmtGBP(r.costPerMonth || 0));
    kv.append(U.el('dt', {}, 'Basis'), U.el('dd', {}, U.el('span.basis.' + r.basis, {}, r.basis), ' ',
      U.el('span', { style: { fontSize: '12px', color: 'var(--muted)' } }, r.basisNote || '')));
    col.append(kv);
    if (canEdit) col.append(U.el('div', { style: { marginTop: '10px' } },
      U.el('button.btn.sm', { onclick: () => recordModal(s, which) }, '✎ Update ' + which)));
    return col;
  }

  function recordModal(s, which) {
    const existing = s[which];
    const fallback = which === 'final' ? s.baseline : null;
    App.modal({
      title: which === 'baseline' ? 'Record baseline' : 'Record final results',
      body(el, close) {
        const metric = U.el('input', { type: 'text', value: existing ? existing.metric : (fallback ? fallback.metric : '') });
        const value = U.el('input', { type: 'number', step: 'any', value: existing ? String(existing.value) : '' });
        const unit = select(UNITS, existing ? existing.unit : (fallback ? fallback.unit : 'h/wk'));
        const people = U.el('input', { type: 'number', min: '0', step: '1', value: existing ? String(existing.people) : (fallback ? String(fallback.people) : '1') });
        const quality = U.el('input', { type: 'text', value: existing ? existing.quality : '', placeholder: 'e.g. CSAT, agreement %, error rate…' });
        const cost = U.el('input', { type: 'number', min: '0', step: 'any', value: existing ? String(existing.costPerMonth || 0) : '0' });
        const basis = select([
          { value: 'measured', label: 'measured — observed post-launch data' },
          { value: 'estimated', label: 'estimated — pre-launch data + stated assumptions' },
          { value: 'projected', label: 'projected — forward-looking, adoption-discounted' },
        ], existing ? existing.basis : (which === 'final' ? 'measured' : 'estimated'));
        const basisNote = U.el('input', { type: 'text', value: existing ? existing.basisNote : '', placeholder: 'e.g. "4 weeks of gateway billing + timesheets"' });
        const fMetric = field('Metric', metric), fValue = field('Value', value);
        const fNote = field('Basis note', basisNote, 'Required — where does this number come from?');
        el.append(fMetric,
          U.el('div.form-row', {}, fValue, field('Unit', unit)),
          U.el('div.form-row', {}, field('People affected', people), field('Run cost / month (£)', cost)),
          field('Quality note', quality),
          field('Basis', basis),
          fNote,
          btnRow(close, 'Save ' + which, () => {
            [fMetric, fValue, fNote].forEach(clearErr);
            const v = parseFloat(value.value);
            let bad = false;
            if (!metric.value.trim()) { fieldErr(fMetric, 'Name the metric being measured.'); bad = true; }
            if (isNaN(v)) { fieldErr(fValue, 'Enter a numeric value.'); bad = true; }
            if (!basisNote.value.trim()) { fieldErr(fNote, 'Where does this number come from?'); bad = true; }
            if (bad) return;
            const patch = {};
            patch[which] = {
              metric: metric.value.trim(), value: v, unit: unit.value,
              people: parseInt(people.value, 10) || 0, quality: quality.value.trim(),
              costPerMonth: parseFloat(cost.value) || 0, basis: basis.value, basisNote: basisNote.value.trim(),
            };
            Store.async(() => Store.update('sprints', s.id, patch, 'sprint.' + which + '-recorded',
              U.title(which) + ' recorded: ' + v + ' ' + unit.value + ' (' + basis.value + ')'))
              .then(() => { close(); ok(U.title(which) + ' recorded'); }).catch(fail);
          }));
      },
    });
  }

  // ---- 8) retro ---------------------------------------------------------------------
  function retroCard(s, canEdit) {
    const card = U.el('div.card', {}, U.el('h2', {}, '↺ Retro'));
    if (canEdit) {
      const ta = U.el('textarea', { rows: 4, placeholder: 'What worked, what didn\'t, what gets reused…' }, s.retro || '');
      card.append(field('Retro notes', ta),
        U.el('button.btn.sm', {
          onclick: () => Store.async(() => Store.update('sprints', s.id, { retro: ta.value.trim() || null }, 'sprint.retro', 'Retro updated'))
            .then(() => ok('Retro saved')).catch(fail),
        }, 'Save retro'));
    } else {
      card.append(s.retro ? U.el('p', { style: { margin: '0' } }, s.retro)
        : U.el('div.card-sub', {}, 'No retro recorded yet.'));
    }
    return card;
  }

  // ---- 9) pause / complete ----------------------------------------------------------------
  function pauseModal(s) {
    App.modal({
      title: 'Pause sprint',
      body(el, close) {
        el.append(U.el('p', { style: { fontSize: '13px' } }, 'Pausing stops the working-day clock in spirit — record why so the portfolio stays honest.'));
        const ta = U.el('textarea', { rows: 3, placeholder: 'Why is this sprint pausing?' });
        const f = field('Reason', ta, 'Required.');
        el.append(f, btnRow(close, 'Pause sprint', () => {
          clearErr(f);
          const reason = ta.value.trim();
          if (!reason) { fieldErr(f, 'A pause needs a reason.'); return; }
          Store.async(() => Store.update('sprints', s.id, { status: 'paused', pauseReason: reason }, 'sprint.paused', 'Paused: ' + reason.slice(0, 90)))
            .then(() => { close(); ok('Sprint paused'); }).catch(fail);
        }));
      },
    });
  }

  function completeSprint(s) {
    App.confirm('Complete sprint?',
      'This marks "' + s.name + '" complete, moves it to handover, and creates an adoption tracker so the solution is run by the team — not by the AI Pioneer.',
      () => {
        Store.async(() => {
          Store.update('sprints', s.id, { status: 'complete', phase: 'handover' }, 'sprint.completed', 'Sprint completed');
          if (!Store.get('solutions').some(x => x.sprintId === s.id)) {
            const sponsor = (s.stakeholders || []).find(st => /sponsor/i.test(st.role || ''));
            Store.add('solutions', {
              sprintId: s.id, name: s.name, dept: s.dept,
              classification: s.classification || 'Internal',
              owner: sponsor ? sponsor.user : Store.currentUser().id,
              status: 'live', launchedAt: new Date().toISOString(),
              users: { eligible: (s.baseline && s.baseline.people) || 1, trained: 0, activeWeekly: 0 },
              usageWeekly: [],
              handover: [
                { text: 'Runbook complete', done: false },
                { text: 'Named owner accepted', done: false },
                { text: 'Alerts wired to #ai-ops', done: false },
                { text: 'AI Pioneer off the critical path', done: false },
              ],
              runbook: '', healthNote: '',
            }, 'solution.created');
          }
        }).then(() => {
          App.toast('Sprint complete — adoption tracker created');
          App.go('adoption');
        }).catch(fail);
      }, 'Complete');
  }
})();
