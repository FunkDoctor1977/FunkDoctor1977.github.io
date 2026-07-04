/* SwiggOS — views/requests.js
   Intake & triage: submit requests, clarify them, score them, accept or decline.
   Route: #/requests (list) · #/requests/new (submit) · #/requests/REQ-x (detail). */
(function () {
  'use strict';

  const TYPES = ['Business problem', 'Repetitive process', 'AI idea', 'Request for support'];
  const SENS = [
    { v: 'Public', hint: 'Already public, or harmless if disclosed.' },
    { v: 'Internal', hint: 'Everyday company information, no personal or customer data.' },
    { v: 'Confidential', hint: 'Personal data, customer data or commercial terms — triggers security + legal approval gates.' },
    { v: 'Restricted', hint: 'Contracts, regulated or high-impact data — triggers security + legal approval gates.' },
  ];
  const SCORE_DEFS = [
    { k: 'urgency', label: 'Urgency', hint: '5 = blocking work today · 1 = nice-to-have someday' },
    { k: 'value', label: 'Value', hint: '5 = large recurring time/cost saving · 1 = marginal' },
    { k: 'feasibility', label: 'Feasibility', hint: '5 = proven pattern, data available · 1 = research project' },
    { k: 'risk', label: 'Risk', hint: '5 = personal data / regulated / customer-facing · 1 = public data, internal audience' },
    { k: 'reusability', label: 'Reusability', hint: '5 = pattern reusable across many teams · 1 = one-off' },
  ];

  // List filter state persists for the session.
  const F = { status: 'all', dept: 'all', type: 'all', q: '' };

  App.view('requests', {
    title: 'Requests & Triage', navLabel: 'Requests & Triage', icon: '⚑',
    count() {
      if (!Store.can('triage')) return null;
      return Store.get('requests').filter(r => r.status === 'new' || r.status === 'clarifying').length;
    },
    render(root, params) {
      if (!params.length) return renderList(root);
      if (params[0] === 'new') return renderSubmit(root);
      renderDetail(root, params[0]);
    },
  });

  // ---- helpers -------------------------------------------------------------
  function busy(btn, on, label) {
    if (on) { btn.dataset.label = btn.textContent; btn.disabled = true; btn.textContent = label || 'Saving…'; }
    else { btn.disabled = false; if (btn.dataset.label) btn.textContent = btn.dataset.label; }
  }

  function selEl(options, value, onchange, aria) {
    const s = U.el('select', { 'aria-label': aria, onchange: e => onchange(e.target.value) });
    options.forEach(o => s.append(U.el('option', { value: o.v }, o.label)));
    s.value = value;
    return s;
  }

  function mkField(label, control, opts) {
    opts = opts || {};
    return U.el('div.field', {},
      U.el('label', {}, label, opts.req ? U.el('span.req', {}, ' *') : null),
      control,
      opts.hint ? U.el('div.hint', {}, opts.hint) : null);
  }

  function setErr(fieldEl, msg) {
    fieldEl.classList.toggle('invalid', !!msg);
    let e = fieldEl.querySelector('.err');
    if (msg) { if (!e) { e = U.el('div.err'); fieldEl.append(e); } e.textContent = msg; }
    else if (e) e.remove();
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

  function mutedNote(hidden) {
    if (!hidden) return null;
    return U.el('div', { style: { color: 'var(--muted)', fontSize: '12px', marginTop: '8px' } },
      hidden + ' item' + (hidden === 1 ? '' : 's') + ' hidden by your access level');
  }

  // ---- LIST ------------------------------------------------------------------
  function renderList(root) {
    root.append(App.pageHead('Requests & Triage',
      'Every idea, repetitive process and business problem lands here. The AI Pioneer clarifies, scores and decides — with the reasoning on record.',
      U.el('button.btn.primary', { onclick: () => App.go('requests/new') }, '+ Submit request')));

    const results = U.el('div');
    const filters = U.el('div.filters', {},
      selEl([{ v: 'all', label: 'All statuses' }, { v: 'new', label: 'New' }, { v: 'clarifying', label: 'Clarifying' },
        { v: 'assessed', label: 'Assessed' }, { v: 'accepted', label: 'Accepted' }, { v: 'declined', label: 'Declined' }],
        F.status, v => { F.status = v; redraw(); }, 'Filter by status'),
      selEl([{ v: 'all', label: 'All departments' }].concat(DEPTS.map(d => ({ v: d, label: d }))),
        F.dept, v => { F.dept = v; redraw(); }, 'Filter by department'),
      selEl([{ v: 'all', label: 'All types' }].concat(TYPES.map(t => ({ v: t, label: t }))),
        F.type, v => { F.type = v; redraw(); }, 'Filter by type'),
      U.el('input', {
        type: 'text', placeholder: 'Search title or description…', value: F.q,
        style: { flex: '1', minWidth: '180px' }, 'aria-label': 'Search requests',
        oninput: U.debounce(e => { F.q = e.target.value.trim().toLowerCase(); redraw(); }, 220),
      }));

    function redraw() {
      const all = Store.get('requests');
      const visible = all.filter(r => Store.canSee(r));
      const hidden = all.length - visible.length;
      const rows = visible.filter(r =>
        (F.status === 'all' || r.status === F.status) &&
        (F.dept === 'all' || r.dept === F.dept) &&
        (F.type === 'all' || r.type === F.type) &&
        (!F.q || (r.title + ' ' + r.description).toLowerCase().includes(F.q)));

      results.innerHTML = '';
      const card = U.el('div.card');
      if (!rows.length) {
        card.append(App.empty('⚑', 'No matching requests',
          visible.length ? 'No requests match the current filters — try widening them.' : 'Nothing has been submitted yet.',
          U.el('button.btn.primary', { onclick: () => App.go('requests/new') }, '+ Submit request')));
      } else {
        const tbl = U.el('table.tbl');
        tbl.innerHTML = '<thead><tr><th>Request</th><th>Submitter</th><th>Sensitivity</th><th>Status</th><th>Age</th></tr></thead>';
        const tb = U.el('tbody');
        rows.forEach(r => {
          const tr = U.el('tr.rowlink', { onclick: () => App.go('requests/' + r.id) });
          tr.innerHTML = '<td><b>' + U.esc(r.title) + '</b><br><span style="color:var(--muted);font-size:12px">' +
            U.esc(r.type) + ' · ' + U.esc(r.dept) + '</span></td>' +
            '<td>' + U.esc(Store.userName(r.submitter)) + '</td>' +
            '<td>' + U.badge(r.sensitivity || 'Internal', U.classClass(r.sensitivity)) + '</td>' +
            '<td>' + VBits.statusBadge(r.status) + '</td>' +
            '<td>' + U.esc(U.timeAgo(r.createdAt)) + '</td>';
          tb.append(tr);
        });
        tbl.append(tb);
        card.append(U.el('div.tbl-wrap', {}, tbl));
      }
      const note = mutedNote(hidden);
      if (note) card.append(note);
      results.append(card);
    }

    redraw();
    root.append(filters, results);
  }

  // ---- SUBMIT ---------------------------------------------------------------
  function renderSubmit(root) {
    if (!Store.can('submitRequest')) { root.append(App.denied('submit requests')); return; }
    root.append(App.pageHead('Submit a request',
      'Describe the problem, not the solution. The AI Pioneer triages every submission and will come back with clarifying questions.',
      U.el('button.btn', { onclick: () => App.go('requests') }, '← All requests')));

    const iTitle = U.el('input', { type: 'text', placeholder: 'e.g. Summarise weekly community forum themes' });
    const iType = selEl([{ v: '', label: 'Select type…' }].concat(TYPES.map(t => ({ v: t, label: t }))), '', () => {}, 'Request type');
    const iDept = selEl([{ v: '', label: 'Select department…' }].concat(DEPTS.map(d => ({ v: d, label: d }))), '', () => {}, 'Department');
    const iDesc = U.el('textarea', { placeholder: 'What happens today, who does it, and why it hurts. Minimum 30 characters.' });
    const iFreq = U.el('input', { type: 'text', placeholder: 'e.g. Weekly' });
    const iHours = U.el('input', { type: 'number', min: '0', step: '0.5', placeholder: 'e.g. 4' });
    const iPeople = U.el('input', { type: 'number', min: '1', step: '1', placeholder: 'e.g. 3' });
    const iData = U.el('input', { type: 'text', placeholder: 'e.g. Support tickets, product docs' });
    const sensHint = U.el('div.hint', {}, 'Choose a level to see what it means.');
    const iSens = selEl([{ v: '', label: 'Select sensitivity…' }].concat(SENS.map(s => ({ v: s.v, label: s.v }))), '',
      v => { const d = SENS.find(s => s.v === v); sensHint.textContent = d ? d.hint : 'Choose a level to see what it means.'; }, 'Data sensitivity');

    const fTitle = mkField('Title', iTitle, { req: true });
    const fType = mkField('Type', iType, { req: true });
    const fDept = mkField('Department', iDept, { req: true });
    const fDesc = mkField('Description', iDesc, { req: true, hint: 'At least 30 characters — enough for someone outside your team to understand the problem.' });
    const fFreq = mkField('Frequency', iFreq, { hint: 'How often the work happens.' });
    const fHours = mkField('Hours per week', iHours, { hint: 'Rough total across everyone involved.' });
    const fPeople = mkField('People affected', iPeople);
    const fData = mkField('Data sources involved', iData);
    const fSens = U.el('div.field', {},
      U.el('label', {}, 'Data sensitivity', U.el('span.req', {}, ' *')), iSens, sensHint,
      U.el('div.hint', {}, 'Public = openly available · Internal = everyday company info · Confidential / Restricted = personal, customer or regulated data, and will trigger security + legal approval gates before anything is built.'));

    function validate() {
      let ok = true;
      const title = iTitle.value.trim();
      setErr(fTitle, title ? '' : 'Title is required.'); if (!title) ok = false;
      setErr(fType, iType.value ? '' : 'Choose a request type.'); if (!iType.value) ok = false;
      setErr(fDept, iDept.value ? '' : 'Choose a department.'); if (!iDept.value) ok = false;
      const desc = iDesc.value.trim();
      const descErr = desc.length >= 30 ? '' : 'Describe the problem in at least 30 characters (' + desc.length + ' so far).';
      setErr(fDesc, descErr); if (descErr) ok = false;
      const hours = iHours.value === '' ? null : parseFloat(iHours.value);
      const hoursErr = (hours !== null && (isNaN(hours) || hours < 0)) ? 'Must be 0 or more.' : '';
      setErr(fHours, hoursErr); if (hoursErr) ok = false;
      const people = iPeople.value === '' ? null : parseInt(iPeople.value, 10);
      const peopleErr = (people !== null && (isNaN(people) || people < 1)) ? 'Must be at least 1.' : '';
      setErr(fPeople, peopleErr); if (peopleErr) ok = false;
      setErr(fSens, iSens.value ? '' : 'Choose a data sensitivity.'); if (!iSens.value) ok = false;
      if (!ok) return null;
      return {
        title, type: iType.value, dept: iDept.value, submitter: Store.currentUser().id,
        description: desc, frequency: iFreq.value.trim(), hoursPerWeek: hours, peopleAffected: people,
        dataSources: iData.value.trim(), sensitivity: iSens.value,
        status: 'new', clarifications: [], scores: null,
      };
    }

    const submitBtn = U.el('button.btn.primary', { type: 'submit' }, 'Submit for triage');
    const form = U.el('form', {
      onsubmit(e) {
        e.preventDefault();
        const payload = validate();
        if (!payload) { App.toast('Fix the highlighted fields before submitting.', 'error'); return; }
        busy(submitBtn, true, 'Submitting…');
        Store.async(() => Store.add('requests', payload, 'request.submitted'))
          .then(obj => { App.toast('Request submitted for triage'); App.go('requests/' + obj.id); })
          .catch(err => { App.toast(err.message, 'error'); busy(submitBtn, false); });
      },
    },
      fTitle,
      U.el('div.form-row', {}, fType, fDept),
      fDesc,
      U.el('div.form-row', {}, fFreq, fHours, fPeople),
      fData, fSens,
      U.el('div', { style: { display: 'flex', gap: '8px', justifyContent: 'flex-end', marginTop: '6px' } },
        U.el('button.btn', { type: 'button', onclick: () => App.go('requests') }, 'Cancel'),
        submitBtn));

    root.append(U.el('div.card', { style: { maxWidth: '760px' } }, U.el('h2', {}, '✎ New request'), form));
  }

  // ---- DETAIL -----------------------------------------------------------------
  function renderDetail(root, id) {
    const r = Store.byId('requests', id);
    if (!r) {
      root.append(App.empty('⚑', 'Request not found', 'No request exists with ID "' + id + '".',
        U.el('button.btn.primary', { onclick: () => App.go('requests') }, '← Back to requests')));
      return;
    }
    if (!Store.canSee(r)) { root.append(App.denied('view this request (classified ' + (r.sensitivity || 'Internal') + ')')); return; }

    root.append(App.pageHead(r.title,
      r.id + ' · submitted by ' + Store.userName(r.submitter) + ' · ' + U.timeAgo(r.createdAt),
      U.el('button.btn', { onclick: () => App.go('requests') }, '← All requests')));

    root.append(U.el('div.chip-row', { style: { marginBottom: '14px' } },
      U.el('span', { html: VBits.statusBadge(r.status) }),
      U.el('span.badge.b-violet', {}, r.type),
      U.el('span.badge.' + U.classClass(r.sensitivity), {}, r.sensitivity || 'Internal')));

    if (r.status === 'declined') {
      root.append(U.el('div.card', { style: { borderColor: 'rgba(208,59,59,.5)', background: 'rgba(208,59,59,.07)' } },
        U.el('h3', { style: { color: '#e66767' } }, '✕ Declined'),
        U.el('p', { style: { margin: 0 } }, r.declineReason || 'No reason recorded.')));
    }
    if (r.status === 'accepted' && r.opportunityId) {
      root.append(U.el('div.card', { style: { borderColor: 'rgba(12,163,12,.45)', background: 'rgba(12,163,12,.06)' } },
        U.el('h3', { style: { color: '#4ec94e' } }, '✓ Accepted into the backlog'),
        U.el('p', { style: { margin: 0 } }, 'Tracked as opportunity ',
          U.el('a', { href: '#/backlog/' + r.opportunityId }, r.opportunityId), ' — scores, gates and sprint conversion live there.')));
    }

    // ---- facts ----------------------------------------------------------------
    const facts = U.el('div.card', {}, U.el('h2', {}, '☰ Request details'),
      U.el('p', { style: { color: 'var(--ink-2)' } }, r.description),
      U.el('dl.kv', {},
        U.el('dt', {}, 'Submitter'), U.el('dd', {}, Store.userName(r.submitter)),
        U.el('dt', {}, 'Department'), U.el('dd', {}, r.dept),
        U.el('dt', {}, 'Frequency'), U.el('dd', {}, r.frequency || '—'),
        U.el('dt', {}, 'Hours per week'), U.el('dd', {}, r.hoursPerWeek !== null && r.hoursPerWeek !== undefined ? U.fmtNum(r.hoursPerWeek, 1) + ' h' : '—'),
        U.el('dt', {}, 'People affected'), U.el('dd', {}, r.peopleAffected !== null && r.peopleAffected !== undefined ? String(r.peopleAffected) : '—'),
        U.el('dt', {}, 'Data sources'), U.el('dd', {}, r.dataSources || '—'),
        U.el('dt', {}, 'Submitted'), U.el('dd', {}, U.fmtDate(r.createdAt))));
    root.append(facts);

    const grid = U.el('div.grid.cols-2');
    grid.append(clarificationsCard(r), assessmentCard(r));
    root.append(grid);
  }

  // ---- clarifications ---------------------------------------------------------
  function clarificationsCard(r) {
    const u = Store.currentUser();
    const canTriage = Store.can('triage');
    const canAnswer = canTriage || u.id === r.submitter;
    const open = (r.clarifications || []).filter(c => !c.a).length;
    const card = U.el('div.card', {}, U.el('h2', {}, '？ Clarifications',
      open ? U.el('span.badge.b-warn', {}, open + ' awaiting answer') : null));

    if (!(r.clarifications || []).length) {
      card.append(U.el('div.card-sub', {}, 'No clarifying questions yet.'));
    }

    (r.clarifications || []).forEach((c, idx) => {
      const item = U.el('div', { style: { padding: '10px 0', borderBottom: '1px solid var(--grid)' } });
      const meta = U.el('div', { style: { fontSize: '11.5px', color: 'var(--muted)', marginBottom: '3px' } },
        'Asked by ' + Store.userName(c.by) + ' · ' + U.timeAgo(c.at), ' ');
      if (c.aiGenerated) meta.append(App.aiFlag(c.reviewed));
      item.append(meta);

      // Question: editable inline while it is AI-generated and unreviewed.
      if (canTriage && c.aiGenerated && !c.reviewed && !['accepted', 'declined'].includes(r.status)) {
        const qEdit = U.el('textarea', { style: { width: '100%', minHeight: '56px' }, 'aria-label': 'Edit AI question' });
        qEdit.value = c.q;
        const saveBtn = U.el('button.btn.sm', {
          onclick() {
            const txt = qEdit.value.trim();
            if (!txt) { App.toast('The question cannot be empty.', 'error'); return; }
            busy(saveBtn, true);
            Store.async(() => Store.mutate('requests', r.id, it => { it.clarifications[idx].q = txt; },
              'clarification.edited', 'Edited AI-suggested question on ' + r.id))
              .then(() => { App.toast('Question updated'); App.render(); })
              .catch(err => { App.toast(err.message, 'error'); busy(saveBtn, false); });
          },
        }, 'Save edit');
        const reviewBtn = U.el('button.btn.sm', {
          onclick() {
            const txt = qEdit.value.trim();
            if (!txt) { App.toast('The question cannot be empty.', 'error'); return; }
            busy(reviewBtn, true);
            Store.async(() => Store.mutate('requests', r.id, it => {
              it.clarifications[idx].q = txt;
              it.clarifications[idx].reviewed = true;
            }, 'clarification.reviewed', 'AI-suggested question reviewed on ' + r.id))
              .then(() => { App.toast('Marked reviewed'); App.render(); })
              .catch(err => { App.toast(err.message, 'error'); busy(reviewBtn, false); });
          },
        }, '✓ Mark reviewed');
        item.append(U.el('div.field', { style: { marginBottom: '6px' } }, qEdit),
          U.el('div', { style: { display: 'flex', gap: '6px', marginBottom: '6px' } }, saveBtn, reviewBtn));
      } else {
        item.append(U.el('div', { style: { color: 'var(--ink)', fontWeight: '600' } }, 'Q: ' + c.q));
      }

      // Answer, or an inline answer form for open questions.
      if (c.a) {
        item.append(U.el('div', { style: { marginTop: '5px', color: 'var(--ink-2)' } }, 'A: ' + c.a));
      } else {
        item.append(U.el('div', { style: { marginTop: '5px', fontSize: '12px', color: 'var(--warn)' } }, '⏳ Awaiting answer'));
        if (canAnswer && !['accepted', 'declined'].includes(r.status)) {
          const aBox = U.el('textarea', { placeholder: 'Write an answer…', style: { width: '100%', minHeight: '48px', marginTop: '6px' }, 'aria-label': 'Answer question' });
          const aBtn = U.el('button.btn.sm.primary', {
            style: { marginTop: '6px' },
            onclick() {
              const txt = aBox.value.trim();
              if (!txt) { App.toast('Write an answer first.', 'error'); return; }
              busy(aBtn, true, 'Posting…');
              Store.async(() => Store.mutate('requests', r.id, it => {
                it.clarifications[idx].a = txt;
                it.clarifications[idx].answeredBy = u.id;
                it.clarifications[idx].answeredAt = new Date().toISOString();
              }, 'clarification.answered', 'Question answered on ' + r.id))
                .then(() => { App.toast('Answer posted'); App.render(); })
                .catch(err => { App.toast(err.message, 'error'); busy(aBtn, false); });
            },
          }, 'Post answer');
          item.append(U.el('div.field', { style: { marginBottom: 0 } }, aBox), aBtn);
        }
      }
      card.append(item);
    });

    // Pioneer actions.
    if (canTriage && !['accepted', 'declined'].includes(r.status)) {
      const actions = U.el('div', { style: { display: 'flex', gap: '8px', flexWrap: 'wrap', marginTop: '12px' } });

      const askWrap = U.el('div', { style: { display: 'none', width: '100%', marginTop: '8px' } });
      const askBox = U.el('textarea', { placeholder: 'What do you need to know to assess this?', style: { width: '100%', minHeight: '56px' }, 'aria-label': 'New question' });
      const askSend = U.el('button.btn.sm.primary', {
        style: { marginTop: '6px' },
        onclick() {
          const txt = askBox.value.trim();
          if (!txt) { App.toast('Write a question first.', 'error'); return; }
          busy(askSend, true, 'Sending…');
          Store.async(() => Store.mutate('requests', r.id, it => {
            it.clarifications.push({ q: txt, a: null, by: Store.currentUser().id, at: new Date().toISOString(), aiGenerated: false, reviewed: true });
          }, 'clarification.asked', 'Clarifying question asked on ' + r.id))
            .then(() => { App.toast('Question sent to ' + Store.userName(r.submitter)); App.render(); })
            .catch(err => { App.toast(err.message, 'error'); busy(askSend, false); });
        },
      }, 'Send question');
      askWrap.append(U.el('div.field', { style: { marginBottom: 0 } }, askBox), askSend);

      actions.append(U.el('button.btn.sm', {
        onclick: () => { askWrap.style.display = askWrap.style.display === 'none' ? 'block' : 'none'; askBox.focus(); },
      }, '＋ Ask a question'));

      const aiBtn = U.el('button.btn.sm', {
        title: 'Uses the Clarifier intake agent — output is labelled AI-generated and must be reviewed.',
        onclick() {
          const fresh = aiQuestions(r).filter(q => !(r.clarifications || []).some(c => c.q === q)).slice(0, 3);
          if (!fresh.length) { App.toast('No new questions to suggest — the obvious gaps are already covered.'); return; }
          busy(aiBtn, true, 'Thinking…');
          Store.async(() => Store.mutate('requests', r.id, it => {
            fresh.forEach(q => it.clarifications.push({ q, a: null, by: Store.currentUser().id, at: new Date().toISOString(), aiGenerated: true, reviewed: false }));
          }, 'clarification.ai-suggested', fresh.length + ' AI-suggested question(s) added to ' + r.id))
            .then(() => { App.toast(fresh.length + ' AI-suggested question' + (fresh.length > 1 ? 's' : '') + ' added — review before relying on them.'); App.render(); })
            .catch(err => { App.toast(err.message, 'error'); busy(aiBtn, false); });
        },
      }, '✦ Suggest questions (AI)');
      actions.append(aiBtn);

      if (r.status === 'new' && (r.clarifications || []).some(c => !c.a)) {
        const clarBtn = U.el('button.btn.sm', {
          onclick() {
            busy(clarBtn, true);
            Store.async(() => Store.update('requests', r.id, { status: 'clarifying' }, 'request.clarifying', 'Moved to clarifying — open questions outstanding'))
              .then(() => { App.toast('Status set to clarifying'); App.render(); })
              .catch(err => { App.toast(err.message, 'error'); busy(clarBtn, false); });
          },
        }, '⇢ Mark clarifying');
        actions.append(clarBtn);
      }

      card.append(actions, askWrap);
    }
    return card;
  }

  // Template questions derived from the request itself.
  function aiQuestions(r) {
    const qs = [];
    if (!r.sensitivity || r.sensitivity === 'Public' || r.sensitivity === 'Internal') {
      qs.push('Does "' + (r.dataSources || 'the data involved') + '" include any personal, customer or commercially sensitive data that would change the ' + (r.sensitivity || 'current') + ' classification?');
    } else {
      qs.push('This is marked ' + r.sensitivity + ' — which specific fields or records are sensitive, and could they be redacted or pseudonymised before any model sees them?');
    }
    qs.push('Who owns this process day-to-day, and what would "good" look like — how would we measure success against the current baseline?');
    if (r.hoursPerWeek || r.peopleAffected) {
      qs.push('You estimate ~' + (r.hoursPerWeek || '?') + ' h/week across ' + (r.peopleAffected || '?') + ' people — is that volume steady through the year, or does it spike (and when)?');
    } else {
      qs.push('Roughly how often does this happen, how long does each occurrence take, and how many people does it touch?');
    }
    return qs;
  }

  // ---- assessment ---------------------------------------------------------------
  function assessmentCard(r) {
    const canScore = Store.can('score');
    const closed = ['accepted', 'declined'].includes(r.status);
    const card = U.el('div.card', {}, U.el('h2', {}, '⚖ Assessment'),
      U.el('div.card-sub', {}, 'Five 1–5 scores feed the backlog priority formula. High risk or Confidential/Restricted data adds an approval gate.'));

    if (!canScore || closed) {
      // Read-only view.
      if (!r.scores) {
        card.append(U.el('div.card-sub', {}, 'Not yet assessed.'));
      } else {
        SCORE_DEFS.forEach(def => {
          const v = r.scores[def.k];
          card.append(U.el('div', { style: { display: 'flex', justifyContent: 'space-between', gap: '10px', padding: '4px 0', borderBottom: '1px solid var(--grid)' } },
            U.el('span', {}, def.label),
            U.el('span.mono', { style: { color: 'var(--ink)' }, title: def.hint }, '●'.repeat(v) + '○'.repeat(5 - v) + '  ' + v + '/5')));
        });
        if (r.assessment) card.append(U.el('p', { style: { marginTop: '10px', fontSize: '12.5px' } },
          U.el('b', { style: { color: 'var(--ink)' } }, 'Notes: '), r.assessment));
      }
      if (!canScore && !closed) {
        card.append(U.el('div.hint', { style: { marginTop: '10px', fontSize: '11.5px', color: 'var(--muted)' } },
          'Only the AI Pioneer can score and triage requests.'));
      }
      return card;
    }

    // Editable (pioneer, request still open).
    const draft = Object.assign({ urgency: 0, value: 0, feasibility: 0, risk: 0, reusability: 0 }, r.scores || {});
    SCORE_DEFS.forEach(def => {
      card.append(U.el('div', { style: { marginBottom: '10px' } },
        U.el('div', { style: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '10px', flexWrap: 'wrap' } },
          U.el('span', { style: { fontWeight: '600', color: 'var(--ink-2)' } }, def.label),
          scorePicker(draft[def.k], n => { draft[def.k] = n; })),
        U.el('div', { style: { fontSize: '11.5px', color: 'var(--muted)', marginTop: '2px' } }, def.hint)));
    });

    const notes = U.el('textarea', { placeholder: 'Assessment notes — the reasoning behind the scores.', 'aria-label': 'Assessment notes' });
    notes.value = r.assessment || '';
    card.append(U.el('div.field', {}, U.el('label', {}, 'Assessment notes'), notes));

    const saveBtn = U.el('button.btn', {
      onclick() {
        if (SCORE_DEFS.some(d => !draft[d.k])) { App.toast('Set all five scores before saving.', 'error'); return; }
        busy(saveBtn, true);
        const summary = SCORE_DEFS.map(d => d.label.slice(0, 1) + draft[d.k]).join(' ');
        Store.async(() => Store.update('requests', r.id, {
          scores: Object.assign({}, draft),
          assessment: notes.value.trim(),
          status: (r.status === 'new' || r.status === 'clarifying') ? 'assessed' : r.status,
        }, 'request.assessed', 'Assessment saved for ' + r.id + ' — ' + summary))
          .then(() => { App.toast('Assessment saved'); App.render(); })
          .catch(err => { App.toast(err.message, 'error'); busy(saveBtn, false); });
      },
    }, '⇩ Save assessment');

    const acceptBtn = U.el('button.btn.primary', {
      disabled: r.scores ? null : true,
      title: r.scores ? 'Creates a backlog opportunity from the saved scores' : 'Save an assessment first',
      onclick() {
        if (!r.scores) return;
        busy(acceptBtn, true, 'Creating…');
        acceptRequest(r).catch(err => { App.toast(err.message, 'error'); busy(acceptBtn, false); });
      },
    }, '✓ Accept → create opportunity');

    const declineBtn = U.el('button.btn.danger', { onclick: () => declineModal(r) }, '✕ Decline');

    card.append(U.el('div', { style: { display: 'flex', gap: '8px', flexWrap: 'wrap', marginTop: '4px' } },
      saveBtn, acceptBtn, declineBtn));
    if (!r.scores) card.append(U.el('div.hint', { style: { fontSize: '11.5px', color: 'var(--muted)', marginTop: '6px' } },
      'Accept is enabled once an assessment has been saved.'));
    return card;
  }

  function acceptRequest(r) {
    const s = r.scores;
    const needsGate = s.risk >= 4 || ['Confidential', 'Restricted'].includes(r.sensitivity);
    return Store.async(() => {
      const opp = Store.add('opportunities', {
        requestId: r.id, title: r.title, dept: r.dept,
        scores: { urgency: s.urgency, value: s.value, feasibility: s.feasibility, risk: s.risk, reusability: s.reusability },
        effort: 'M', classification: r.sensitivity,
        status: needsGate ? 'gated' : 'backlog',
        approvals: {
          security: { status: needsGate ? 'pending' : 'not-required' },
          legal: { status: needsGate ? 'pending' : 'not-required' },
        },
        owner: Store.currentUser().id, sponsor: r.submitter,
      }, 'opportunity.created');
      Store.update('requests', r.id, { status: 'accepted', opportunityId: opp.id }, 'request.accepted', 'Accepted into backlog as ' + opp.id);
      return opp;
    }).then(opp => {
      App.toast(needsGate
        ? 'Opportunity ' + opp.id + ' created. Approval gate required: security + legal sign-off before sprint.'
        : 'Opportunity ' + opp.id + ' created and added to the backlog.', needsGate ? 'warn' : '');
      App.go('backlog/' + opp.id);
    });
  }

  function declineModal(r) {
    App.modal({
      title: 'Decline ' + r.id,
      body(el, close) {
        const box = U.el('textarea', { placeholder: 'e.g. Value too low relative to the information-leak risk. Revisit if scoped to public data only.' });
        const f = U.el('div.field', {}, U.el('label', {}, 'Reason', U.el('span.req', {}, ' *')), box,
          U.el('div.hint', {}, 'The reason is shown to the submitter and recorded in the audit trail.'));
        const go = U.el('button.btn.danger', {
          onclick() {
            const reason = box.value.trim();
            if (!reason) { setErr(f, 'A written reason is required to decline.'); return; }
            busy(go, true, 'Declining…');
            Store.async(() => Store.update('requests', r.id, { status: 'declined', declineReason: reason }, 'request.declined', 'Declined: ' + reason))
              .then(() => { close(); App.toast('Request declined — reason recorded.'); App.render(); })
              .catch(err => { App.toast(err.message, 'error'); busy(go, false); });
          },
        }, 'Decline request');
        el.append(f, U.el('div', { style: { display: 'flex', gap: '8px', justifyContent: 'flex-end' } },
          U.el('button.btn', { onclick: close }, 'Cancel'), go));
      },
    });
  }
})();
