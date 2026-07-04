/* SwiggOS — views/radar.js
   AI tool & model radar (adopt/trial/assess/hold) + the model & supplier register. */
(function () {
  'use strict';

  const RINGS = [
    { key: 'adopt', label: 'Adopt', sub: 'Default choices, approved for use' },
    { key: 'trial', label: 'Trial', sub: 'In active pilots with guardrails' },
    { key: 'assess', label: 'Assess', sub: 'Watching, not yet reviewed' },
    { key: 'hold', label: 'Hold', sub: 'Do not use — reason recorded' },
  ];
  const CAT_BADGE = { model: 'b-info', tool: 'b-ok', platform: 'b-violet' };
  const DPA_BADGE = d => /^signed/.test(d || '') ? 'b-ok' : /n\/a/.test(d || '') ? 'b-muted' : 'b-crit';
  const REVIEW_BADGE = { approved: 'b-ok', 'in-review': 'b-warn', 'not-started': 'b-muted', rejected: 'b-crit' };

  App.view('radar', {
    title: 'AI tool & model radar', navLabel: 'Tool & model radar', icon: '◎',
    count() { return Store.get('radar').filter(r => r.ring === 'trial' || r.ring === 'assess').length; },
    render(root) {
      root.append(App.pageHead('AI tool & model radar',
        'What we run on, what we’re trialling, and what stays outside the fence — with the supplier register behind it.',
        Store.can('editRadar') ? U.el('button.btn.primary', { onclick: () => addModal() }, '＋ Add entry') : null));

      const rings = U.el('div.radar-rings');
      RINGS.forEach(ring => {
        const col = U.el('div.radar-ring.' + ring.key, {},
          U.el('h3', {}, ring.label),
          U.el('div', { style: { fontSize: '11px', color: 'var(--muted)', marginBottom: '10px' } }, ring.sub));
        const items = Store.get('radar').filter(r => r.ring === ring.key);
        if (!items.length) col.append(U.el('div', { style: { fontSize: '12px', color: 'var(--muted)', padding: '8px 0' } }, 'Nothing here.'));
        items.forEach(r => {
          col.append(U.el('div.radar-item', { onclick: () => detailModal(r.id) },
            U.el('div', { style: { fontWeight: '600', color: 'var(--ink)' } }, r.name),
            U.el('div', { style: { marginTop: '3px' } },
              U.el('span.badge.' + (CAT_BADGE[r.category] || 'b-muted'), {}, r.category), ' ',
              U.el('span', { style: { fontSize: '11.5px', color: 'var(--muted)' } }, r.supplier))));
        });
        rings.append(col);
      });
      root.append(rings);

      const reg = U.el('div.card', { style: { marginTop: '14px' } },
        U.el('h2', {}, '⛁ Model & supplier register'),
        U.el('div.card-sub', {}, 'Every model and supplier we rely on, its data terms and its review status — nothing reaches Adopt without a signed DPA or self-hosting.'));
      const tbl = U.el('table.tbl');
      tbl.innerHTML = '<thead><tr><th>Name</th><th>Supplier</th><th>Category</th><th>Ring</th><th>DPA</th><th>Residency</th><th>Risk</th><th>Security review</th></tr></thead>';
      const tb = U.el('tbody');
      Store.get('radar').slice().sort((a, b) => RINGS.findIndex(x => x.key === a.ring) - RINGS.findIndex(x => x.key === b.ring)).forEach(r => {
        const tr = U.el('tr.rowlink', { onclick: () => detailModal(r.id) });
        tr.append(
          U.el('td', {}, U.el('b', { style: { color: 'var(--ink)' } }, r.name)),
          U.el('td', {}, r.supplier),
          U.el('td', {}, U.el('span.badge.' + (CAT_BADGE[r.category] || 'b-muted'), {}, r.category)),
          U.el('td', {}, U.el('span.badge.' + ({ adopt: 'b-ok', trial: 'b-info', assess: 'b-warn', hold: 'b-crit' }[r.ring]), {}, r.ring)),
          U.el('td', {}, U.el('span.badge.' + DPA_BADGE(r.dpa), {}, r.dpa || '—')),
          U.el('td', {}, r.residency || '—'),
          U.el('td', {}, U.el('span.badge.' + U.sevClass(r.risk), {}, r.risk || '—')),
          U.el('td', {}, U.el('span.badge.' + (REVIEW_BADGE[r.reviewStatus] || 'b-muted'), {}, U.title(r.reviewStatus || 'not-started'))));
        tb.append(tr);
      });
      tbl.append(tb);
      reg.append(U.el('div.tbl-wrap', {}, tbl));
      root.append(reg);
    },
  });

  function detailModal(id) {
    const r = Store.byId('radar', id);
    if (!r) return;
    App.modal({
      title: r.name,
      body(el, close) {
        el.append(U.el('dl.kv', {},
          U.el('dt', {}, 'Supplier'), U.el('dd', {}, r.supplier),
          U.el('dt', {}, 'Category'), U.el('dd', {}, U.el('span.badge.' + (CAT_BADGE[r.category] || 'b-muted'), {}, r.category)),
          U.el('dt', {}, 'Ring'), U.el('dd', {}, U.el('span.badge.' + ({ adopt: 'b-ok', trial: 'b-info', assess: 'b-warn', hold: 'b-crit' }[r.ring]), {}, r.ring), ' since ' + U.fmtDate(r.movedAt)),
          U.el('dt', {}, 'DPA status'), U.el('dd', {}, U.el('span.badge.' + DPA_BADGE(r.dpa), {}, r.dpa || '—')),
          U.el('dt', {}, 'Data residency'), U.el('dd', {}, r.residency || '—'),
          U.el('dt', {}, 'Risk'), U.el('dd', {}, U.el('span.badge.' + U.sevClass(r.risk), {}, r.risk || '—')),
          U.el('dt', {}, 'Security review'), U.el('dd', {}, U.el('span.badge.' + (REVIEW_BADGE[r.reviewStatus] || 'b-muted'), {}, U.title(r.reviewStatus || 'not-started')))));
        el.append(U.el('p', { style: { marginTop: '10px' } }, r.notes || ''));

        if (Store.can('editRadar')) {
          const ringSel = U.el('select', {}, RINGS.map(x => U.el('option', { value: x.key }, x.label)));
          ringSel.value = r.ring;
          const why = U.el('textarea', { placeholder: 'Rationale for the move (required — this lands in the audit trail)' });
          const err = U.el('div.err');
          el.append(U.el('div.card', { style: { marginTop: '12px', background: 'var(--surface-2)' } },
            U.el('h4', {}, 'Move ring'),
            U.el('div.field', {}, ringSel), U.el('div.field', {}, why), err,
            U.el('div', { style: { display: 'flex', gap: '8px', justifyContent: 'flex-end' } },
              U.el('button.btn', { onclick: () => editModal(r, close) }, '✎ Edit details'),
              U.el('button.btn.primary', {
                onclick: () => {
                  if (ringSel.value === r.ring) { err.textContent = 'Pick a different ring.'; return; }
                  if (!why.value.trim()) { err.textContent = 'A rationale is required to move an entry.'; return; }
                  Store.async(() => Store.update('radar', r.id, { ring: ringSel.value, movedAt: new Date().toISOString() },
                    'radar.moved', r.name + ': ' + r.ring + ' → ' + ringSel.value + ' — ' + why.value.trim()))
                    .then(() => { close(); App.toast('Moved to ' + U.title(ringSel.value) + '.'); App.render(); })
                    .catch(e => { err.textContent = e.message; App.toast(e.message, 'error'); });
                },
              }, 'Move'))));
        } else {
          el.append(U.el('div', { style: { fontSize: '12px', color: 'var(--muted)', marginTop: '10px' } },
            'Only the AI Pioneer can move entries or edit the register.'));
        }
      },
    });
  }

  function entryForm(existing, onSave) {
    return function (el, close) {
      const name = U.el('input', { type: 'text', value: existing ? existing.name : '' });
      const cat = U.el('select', {}, ['model', 'tool', 'platform'].map(c => U.el('option', { value: c }, U.title(c))));
      const ring = U.el('select', {}, RINGS.map(x => U.el('option', { value: x.key }, x.label)));
      const supplier = U.el('input', { type: 'text', value: existing ? existing.supplier : '' });
      const notes = U.el('textarea', {}, existing ? existing.notes : '');
      const dpa = U.el('select', {}, ['signed', 'not-signed', 'n/a (self-hosted)', 'declined'].map(d => U.el('option', { value: d }, d)));
      const residency = U.el('input', { type: 'text', value: existing ? (existing.residency || '') : '', placeholder: 'e.g. US/EU (zero retention)' });
      const risk = U.el('select', {}, ['Low', 'Medium', 'High'].map(x => U.el('option', { value: x }, x)));
      const review = U.el('select', {}, ['not-started', 'in-review', 'approved', 'rejected'].map(x => U.el('option', { value: x }, U.title(x))));
      if (existing) { cat.value = existing.category; ring.value = existing.ring; dpa.value = existing.dpa || 'not-signed'; risk.value = existing.risk || 'Medium'; review.value = existing.reviewStatus || 'not-started'; }
      const err = U.el('div.err');
      [['Name *', name], ['Category', cat], ['Ring', ring], ['Supplier *', supplier], ['Notes', notes],
       ['DPA status', dpa], ['Data residency', residency], ['Risk', risk], ['Security review', review]]
        .forEach(([lab, input]) => el.append(U.el('div.field', {}, U.el('label', {}, lab), input)));
      el.append(err);
      const save = U.el('button.btn.primary', {
        onclick: () => {
          if (!name.value.trim() || !supplier.value.trim()) { err.textContent = 'Name and supplier are required.'; return; }
          save.disabled = true;
          Store.async(() => onSave({
            name: name.value.trim(), category: cat.value, ring: ring.value, supplier: supplier.value.trim(),
            notes: notes.value.trim(), dpa: dpa.value, residency: residency.value.trim(), risk: risk.value, reviewStatus: review.value,
          })).then(() => { close(); App.toast(existing ? 'Register entry updated.' : 'Added to the radar.'); App.render(); })
            .catch(e => { save.disabled = false; err.textContent = e.message; App.toast(e.message, 'error'); });
        },
      }, existing ? 'Save changes' : 'Add entry');
      el.append(U.el('div', { style: { display: 'flex', gap: '8px', justifyContent: 'flex-end', marginTop: '6px' } },
        U.el('button.btn', { onclick: close }, 'Cancel'), save));
    };
  }

  function addModal() {
    App.modal({ title: '＋ Add radar entry', body: entryForm(null, patch => Store.add('radar', Object.assign({ movedAt: new Date().toISOString() }, patch), 'radar.added')) });
  }
  function editModal(r, closeOuter) {
    if (closeOuter) closeOuter();
    App.modal({ title: '✎ Edit — ' + r.name, body: entryForm(r, patch => Store.update('radar', r.id, patch, 'radar.updated', 'Edited register entry "' + patch.name + '"')) });
  }
})();
