/* SwiggOS — views/adoption.js
   Adoption & Handover: a solution isn't done when it ships — it's done when
   the team runs it without the AI Pioneer. Tracks usage, handover checklists,
   runbooks and health per live solution. */
(function () {
  'use strict';

  App.view('adoption', {
    title: 'Adoption & Handover', navLabel: 'Adoption', icon: '⇄',
    count() {
      return Store.get('solutions').filter(s => s.status === 'live' && (s.handover || []).some(h => !h.done)).length;
    },
    render(root) {
      const canManage = Store.can('manageAdoption');
      root.append(App.pageHead('Adoption & Handover',
        'Shipping is the start. This tracks whether teams actually use each solution — and whether it runs without the AI Pioneer.'));

      // Solutions inherit their sprint's classification — filter to what this role may see.
      const allSols = Store.get('solutions');
      const sols = allSols.filter(s => Store.canSee(s));
      const hiddenN = allSols.length - sols.length;
      if (!sols.length) {
        root.append(App.empty('⇄', 'No solutions ' + (hiddenN ? 'at your access level' : 'yet'),
          hiddenN ? hiddenN + ' solution(s) hidden by your access level.' : 'When a sprint completes, its adoption tracker appears here automatically.',
          Store.can('createSprint') ? U.el('button.btn.primary', { onclick: () => App.go('sprints') }, 'Open sprint workspace') : null));
        return;
      }

      // ---- headline tiles ------------------------------------------------------
      const live = sols.filter(s => s.status === 'live');
      const ratios = live.filter(s => s.users && s.users.eligible > 0)
        .map(s => (s.users.activeWeekly / s.users.eligible) * 100);
      const med = median(ratios);
      const fully = sols.filter(s => (s.handover || []).length > 0 && s.handover.every(h => h.done)).length;
      const attention = sols.filter(s => s.status === 'paused' || /watch/i.test(s.healthNote || '')).length;

      const tiles = U.el('div.grid.cols-4');
      tiles.append(
        stat(String(live.length), 'Live solutions', null, true),
        stat(med === null ? '—' : U.fmtPct(med), 'Median weekly adoption',
          U.el('span', { style: { color: 'var(--muted)' } }, 'active users ÷ eligible, live solutions')),
        stat(fully + ' of ' + sols.length, 'Fully handed over',
          fully === sols.length ? U.el('span.badge.b-ok', {}, 'pioneer-free') : U.el('span', { style: { color: 'var(--muted)' } }, 'handover checklists complete')),
        stat(String(attention), 'Needing attention',
          attention ? U.el('span.badge.b-warn', {}, 'paused or on watch') : U.el('span.badge.b-ok', {}, 'all healthy')));
      root.append(tiles);

      // ---- solution cards --------------------------------------------------------
      const grid = U.el('div.grid.cols-2');
      sols.forEach(sol => grid.append(solutionCard(sol, canManage)));
      root.append(grid);
      if (hiddenN) root.append(U.el('div', { style: { fontSize: '12px', color: 'var(--muted)', margin: '2px 4px' } },
        hiddenN + ' solution(s) hidden by your access level.'));

      root.append(U.el('div', { style: { textAlign: 'center', color: 'var(--muted)', fontSize: '12.5px', fontStyle: 'italic', margin: '4px 0 20px' } },
        '“A solution isn\'t done when it ships — it\'s done when the team runs it without the AI Pioneer.”'));
    },
  });

  // ---- helpers ------------------------------------------------------------------
  function fail(err) { App.toast(err.message, 'error'); }
  function ok(msg) { App.toast(msg); App.render(); }
  function median(arr) {
    if (!arr.length) return null;
    const s = arr.slice().sort((a, b) => a - b);
    const m = Math.floor(s.length / 2);
    return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
  }
  function stat(k, l, extra, accent) {
    return U.el('div.stat' + (accent ? '.accent' : ''), {}, U.el('div.k', {}, k), U.el('div.l', {}, l),
      extra ? U.el('div.d', {}, extra) : null);
  }
  function statusBadge(status) {
    const map = { live: 'b-ok', paused: 'b-warn', retired: 'b-muted' };
    return U.el('span.badge.' + (map[status] || 'b-muted'), {}, U.title(status));
  }
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
  function btnRow(close, saveLabel, onSave) {
    return U.el('div', { style: { display: 'flex', gap: '8px', justifyContent: 'flex-end', marginTop: '14px' } },
      U.el('button.btn', { onclick: close }, 'Cancel'),
      U.el('button.btn.primary', { onclick: onSave }, saveLabel));
  }

  // ---- solution card ---------------------------------------------------------------
  function solutionCard(sol, canManage) {
    const card = U.el('div.card');
    const u = sol.users || { eligible: 0, trained: 0, activeWeekly: 0 };

    // header
    card.append(U.el('h3', {},
      sol.sprintId ? U.el('a', { href: '#/sprints/' + sol.sprintId, title: 'Open source sprint ' + sol.sprintId }, sol.name) : sol.name,
      ' ', statusBadge(sol.status)));
    card.append(U.el('div.card-sub', {},
      sol.dept + ' · owner: ' + Store.userName(sol.owner) + ' · launched ' + U.fmtDate(sol.launchedAt)));

    // adoption block
    const pct = u.eligible ? Math.round((u.activeWeekly / u.eligible) * 100) : 0;
    card.append(U.el('div', { style: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '8px', marginBottom: '5px' } },
      U.el('span', { style: { fontSize: '13px', color: 'var(--ink)' } },
        U.el('b', {}, String(u.activeWeekly)), ' of ' + u.eligible + ' weekly active'),
      (sol.usageWeekly || []).length ? U.el('span', { html: Charts.spark(sol.usageWeekly), title: 'Weekly active users over time' }) : null));
    card.append(U.el('div.progressbar.green', {}, U.el('i', { style: { width: pct + '%' } })));
    card.append(U.el('div', { style: { fontSize: '11.5px', color: 'var(--muted)', margin: '4px 0 12px' } },
      pct + '% adoption · ' + u.trained + ' trained'));

    // handover checklist
    const handover = sol.handover || [];
    const doneN = handover.filter(h => h.done).length;
    const hPct = handover.length ? Math.round((doneN / handover.length) * 100) : 0;
    card.append(U.el('h4', { style: { display: 'flex', gap: '8px', alignItems: 'center' } }, 'Handover checklist',
      hPct === 100 ? U.el('span.badge.b-ok', {}, '✓ fully handed over') : U.el('span', { style: { color: 'var(--muted)', fontWeight: '400', fontSize: '11.5px' } }, doneN + '/' + handover.length)));
    card.append(U.el('div.progressbar', { style: { marginBottom: '6px' } }, U.el('i', { style: { width: hPct + '%' } })));
    const ul = U.el('ul.check-list');
    handover.forEach((h, idx) => {
      const cb = U.el('input', {
        type: 'checkbox', checked: !!h.done, disabled: !canManage,
        title: canManage ? undefined : 'Only the AI Pioneer can update handover items',
        onchange: () => {
          Store.async(() => Store.mutate('solutions', sol.id, x => {
            const item = x.handover[idx];
            if (item) item.done = !item.done;
          }, 'solution.handover', 'Toggled "' + h.text + '"'))
            .then(() => ok('Handover checklist updated'))
            .catch(err => { fail(err); App.render(); });
        },
      });
      ul.append(U.el('li' + (h.done ? '.done' : ''), {}, cb, U.el('span', { style: { flex: '1' } }, h.text)));
    });
    card.append(ul);

    // runbook
    card.append(U.el('h4', { style: { marginTop: '12px' } }, 'Runbook'));
    card.append(U.el('div.formula', { style: { marginTop: '0', whiteSpace: 'pre-wrap' } },
      sol.runbook ? sol.runbook : 'No runbook yet — the team can\'t run what isn\'t written down.'));
    if (canManage) {
      card.append(U.el('div', { style: { marginTop: '6px' } },
        U.el('button.btn.sm', { onclick: () => runbookModal(sol) }, '✎ Edit runbook')));
    }

    // health note
    const watchy = sol.status === 'paused' || /watch/i.test(sol.healthNote || '');
    if (sol.healthNote || watchy) {
      const text = sol.healthNote || 'Paused.';
      card.append(U.el('div', {
        style: {
          marginTop: '10px', fontSize: '12.5px',
          color: watchy ? 'var(--warn)' : 'var(--muted)',
        },
      }, (watchy && text.indexOf('⚠') !== 0 ? '⚠ ' : '') + text));
    }

    // actions
    if (canManage) {
      const actions = U.el('div', { style: { display: 'flex', gap: '8px', flexWrap: 'wrap', marginTop: '12px' } });
      if (sol.status === 'live') {
        actions.append(
          U.el('button.btn.sm.primary', { onclick: () => usageModal(sol) }, '＋ Log this week\'s usage'),
          U.el('button.btn.sm', { onclick: () => pauseModal(sol) }, '⏸ Pause'),
          U.el('button.btn.sm.danger', { onclick: () => retire(sol) }, '⏏ Retire'));
      } else if (sol.status === 'paused') {
        actions.append(
          U.el('button.btn.sm.primary', {
            onclick: () => {
              const note = (sol.healthNote || '').indexOf('⚠ Paused:') === 0 ? '' : sol.healthNote;
              Store.async(() => Store.update('solutions', sol.id, { status: 'live', healthNote: note }, 'solution.resumed', 'Solution resumed'))
                .then(() => ok('Solution resumed')).catch(fail);
            },
          }, '▶ Resume'),
          U.el('button.btn.sm.danger', { onclick: () => retire(sol) }, '⏏ Retire'));
      } else {
        actions.append(U.el('span', { style: { fontSize: '11.5px', color: 'var(--muted)' } }, 'Retired — no longer maintained.'));
      }
      card.append(actions);
    } else {
      card.append(U.el('div', { style: { marginTop: '12px', fontSize: '11.5px', color: 'var(--muted)' } },
        'Read-only — only the AI Pioneer manages adoption and handover.'));
    }
    return card;
  }

  // ---- actions ---------------------------------------------------------------------
  function runbookModal(sol) {
    App.modal({
      title: '✎ Edit runbook — ' + sol.name,
      body(el, close) {
        el.append(U.el('p', { style: { fontSize: '13px', color: 'var(--muted)' } },
          'What the owning team needs to run this without the AI Pioneer: schedule, failure steps, escalation path, re-test cadence.'));
        const ta = U.el('textarea', { style: { minHeight: '160px' } }, sol.runbook || '');
        const f = field('Runbook', ta, 'Plain text. Shown on this card and counted in the handover checklist conversation.');
        el.append(f, btnRow(close, 'Save runbook', () => {
          clearErr(f);
          const text = ta.value.trim();
          if (!text) { fieldErr(f, 'A runbook can\'t be empty — the team can\'t run what isn\'t written down.'); return; }
          Store.async(() => Store.update('solutions', sol.id, { runbook: text }, 'solution.runbook', 'Runbook updated for ' + sol.name))
            .then(() => { close(); ok('Runbook saved'); }).catch(fail);
        }));
      },
    });
  }

  function usageModal(sol) {
    App.modal({
      title: 'Log this week\'s usage',
      body(el, close) {
        el.append(U.el('p', { style: { fontSize: '13px', color: 'var(--muted)' } },
          'How many of the ' + sol.users.eligible + ' eligible people actively used "' + sol.name + '" this week?'));
        const inp = U.el('input', { type: 'number', min: '0', step: '1', value: String(sol.users.activeWeekly || 0) });
        const f = field('Weekly active users', inp, 'Appends a point to the usage trend and updates the adoption bar.');
        el.append(f, btnRow(close, 'Log usage', () => {
          clearErr(f);
          const n = parseInt(inp.value, 10);
          if (isNaN(n) || n < 0) { fieldErr(f, 'Enter a number of users (0 or more).'); return; }
          Store.async(() => Store.mutate('solutions', sol.id, x => {
            x.usageWeekly.push(n);
            x.users.activeWeekly = n;
          }, 'solution.usage-logged', 'Logged weekly usage: ' + n + ' active users'))
            .then(() => { close(); ok('Usage logged'); }).catch(fail);
        }));
      },
    });
  }

  function pauseModal(sol) {
    App.modal({
      title: 'Pause solution',
      body(el, close) {
        el.append(U.el('p', { style: { fontSize: '13px', color: 'var(--muted)' } },
          'Pausing "' + sol.name + '" flags it as not in active use. The reason is recorded in the health note and the audit trail.'));
        const ta = U.el('textarea', { rows: 3, placeholder: 'Why is this solution pausing?' });
        const f = field('Reason', ta, 'Required.');
        el.append(f, btnRow(close, 'Pause solution', () => {
          clearErr(f);
          const reason = ta.value.trim();
          if (!reason) { fieldErr(f, 'A pause needs a reason.'); return; }
          Store.async(() => Store.update('solutions', sol.id,
            { status: 'paused', healthNote: '⚠ Paused: ' + reason },
            'solution.paused', 'Paused: ' + reason.slice(0, 90)))
            .then(() => { close(); ok('Solution paused'); }).catch(fail);
        }));
      },
    });
  }

  function retire(sol) {
    App.confirm('Retire solution?',
      'Retiring "' + sol.name + '" means it stops being maintained: no monitoring, no fixes, no support. Users should be told before this happens. This is recorded in the audit trail.',
      () => {
        Store.async(() => Store.update('solutions', sol.id, { status: 'retired' }, 'solution.retired', 'Solution retired'))
          .then(() => ok('Solution retired')).catch(fail);
      }, 'Retire');
  }
})();
