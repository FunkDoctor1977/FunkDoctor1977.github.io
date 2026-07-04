/* SwiggOS — views/assets.js
   Reusable asset library: prompts, agents, workflows, evals, lessons. */
(function () {
  'use strict';

  const TYPE_BADGE = { prompt: 'b-violet', agent: 'b-info', workflow: 'b-ok', eval: 'b-warn', lesson: 'b-accent' };
  const filter = { type: 'all', tag: null, q: '', sort: 'reused' };

  App.view('assets', {
    title: 'Asset library', navLabel: 'Asset library', icon: '❒',
    count() { return Store.get('assets').length; },
    render(root, params) {
      if (params[0] && params[0] !== 'new') return renderDetail(root, params[0]);
      renderList(root);
    },
  });

  function renderList(root) {
    root.append(App.pageHead('Asset library',
      'Prompts, agents, workflows, evals and lessons from every sprint — reuse before you rebuild.',
      Store.can('manageAssets') ? U.el('button.btn.primary', { onclick: () => addModal() }, '＋ Add asset') : null));

    const assets = Store.get('assets');
    const types = ['all', 'prompt', 'agent', 'workflow', 'eval', 'lesson'];
    const allTags = [...new Set(assets.flatMap(a => a.tags || []))].sort();

    const bar = U.el('div.card');
    const typeRow = U.el('div.chip-row', { style: { marginBottom: '8px' } });
    types.forEach(t => {
      const n = t === 'all' ? assets.length : assets.filter(a => a.type === t).length;
      typeRow.append(U.el('span.chip' + (filter.type === t ? '.sel' : ''), {
        onclick: () => { filter.type = t; App.render(); },
      }, U.title(t) + ' (' + n + ')'));
    });
    const tagRow = U.el('div.chip-row', { style: { marginBottom: '8px' } });
    allTags.forEach(t => tagRow.append(U.el('span.chip' + (filter.tag === t ? '.sel' : ''), {
      onclick: () => { filter.tag = filter.tag === t ? null : t; App.render(); },
    }, '#' + t)));
    const controls = U.el('div.filters', {},
      U.el('input.search-input', {
        type: 'text', placeholder: 'Search assets…', value: filter.q, style: { maxWidth: '260px' },
        oninput: U.debounce(function () { filter.q = this.value; App.render(); }, 250),
      }),
      (() => {
        const s = U.el('select', { onchange: function () { filter.sort = this.value; App.render(); } },
          U.el('option', { value: 'reused' }, 'Most reused'), U.el('option', { value: 'newest' }, 'Newest'));
        s.value = filter.sort; return s;
      })());
    bar.append(typeRow, tagRow, controls);
    root.append(bar);

    let list = assets.filter(a =>
      (filter.type === 'all' || a.type === filter.type) &&
      (!filter.tag || (a.tags || []).includes(filter.tag)) &&
      (!filter.q || (a.name + ' ' + a.description).toLowerCase().includes(filter.q.toLowerCase())));
    list = list.slice().sort((a, b) => filter.sort === 'reused' ? (b.reuses - a.reuses) : (new Date(b.createdAt) - new Date(a.createdAt)));

    if (!list.length) {
      root.append(App.empty('❒', 'No assets match', 'Try clearing the filters.',
        U.el('button.btn', { onclick: () => { filter.type = 'all'; filter.tag = null; filter.q = ''; App.render(); } }, 'Clear filters')));
      return;
    }
    const grid = U.el('div.grid.cols-2');
    list.forEach(a => {
      const card = U.el('div.card', {},
        U.el('h3', {}, U.el('a', { href: '#/assets/' + a.id }, a.name), ' ',
          U.el('span.badge.' + (TYPE_BADGE[a.type] || 'b-muted'), {}, a.type)),
        U.el('div', { style: { fontSize: '13px', marginBottom: '8px' } }, a.description),
        U.el('div.chip-row', {}, (a.tags || []).map(t =>
          U.el('span.chip', { onclick: () => { filter.tag = t; App.render(); } }, '#' + t))),
        U.el('div', { style: { marginTop: '10px', fontSize: '12px', color: 'var(--muted)', display: 'flex', gap: '10px', flexWrap: 'wrap' } },
          a.sourceSprint ? U.el('a', { href: '#/sprints/' + a.sourceSprint }, 'from ' + a.sourceSprint) : U.el('span', {}, 'standalone'),
          U.el('span', {}, '⟲ reused ' + a.reuses + '×'),
          U.el('span', {}, U.timeAgo(a.createdAt))));
      grid.append(card);
    });
    root.append(grid);
  }

  function renderDetail(root, id) {
    const a = Store.byId('assets', id);
    if (!a) {
      root.append(App.empty('❒', 'Asset not found', 'It may have been deleted.',
        U.el('button.btn', { onclick: () => App.go('assets') }, '← Back to library')));
      return;
    }
    root.append(App.pageHead(a.name, null,
      U.el('button.btn', { onclick: () => App.go('assets') }, '← Library'),
      Store.can('manageAssets') ? U.el('button.btn', { onclick: () => editModal(a) }, '✎ Edit') : null,
      Store.can('manageAssets') ? U.el('button.btn.danger', {
        onclick: () => App.confirm('Delete this asset?', '"' + a.name + '" will be removed from the library. The audit trail keeps a record.', () => {
          Store.async(() => {
            const arr = Store.get('assets');
            const i = arr.findIndex(x => x.id === a.id);
            if (i >= 0) arr.splice(i, 1);
            Store.audit('asset.deleted', 'assets', a.id, 'Deleted "' + a.name + '"');
            Store.save(); Store.emit();
          }).then(() => { App.toast('Asset deleted.'); App.go('assets'); })
            .catch(err => App.toast(err.message, 'error'));
        }, 'Delete'),
      }, '🗑 Delete') : null));

    const head = U.el('div.card', {},
      U.el('div', { style: { marginBottom: '8px' } },
        U.el('span.badge.big.' + (TYPE_BADGE[a.type] || 'b-muted'), {}, a.type), ' ',
        (a.tags || []).map(t => U.el('span.chip', { style: { marginRight: '4px' } }, '#' + t))),
      U.el('p', {}, a.description),
      U.el('dl.kv', {},
        U.el('dt', {}, 'Source sprint'), U.el('dd', {}, a.sourceSprint ? U.el('a', { href: '#/sprints/' + a.sourceSprint }, a.sourceSprint) : '— (standalone)'),
        U.el('dt', {}, 'Created'), U.el('dd', {}, U.fmtDate(a.createdAt)),
        U.el('dt', {}, 'Reuse count'), U.el('dd', {}, String(a.reuses) + '× — reuse is how the library earns its keep')));
    root.append(head);

    const copyBtn = U.el('button.btn', {}, '⧉ Copy');
    copyBtn.addEventListener('click', () => U.copy(a.content, copyBtn));
    const reuseBtn = U.el('button.btn.primary', {
      onclick: () => {
        reuseBtn.disabled = true;
        Store.async(() => Store.mutate('assets', a.id, x => { x.reuses++; }, 'asset.reused',
          'Reuse logged by ' + Store.currentUser().name))
          .then(() => { App.toast('Reuse logged — thanks for not rebuilding it.'); App.render(); })
          .catch(err => { reuseBtn.disabled = false; App.toast(err.message, 'error'); });
      },
    }, '⟲ Log a reuse');
    const content = U.el('div.card', {},
      U.el('h3', {}, 'Content'),
      U.el('div.mono', {
        style: {
          whiteSpace: 'pre-wrap', background: '#141413', border: '1px solid var(--grid)',
          borderRadius: '8px', padding: '12px', maxHeight: '420px', overflow: 'auto', marginBottom: '10px',
        },
      }, a.content || '—'),
      U.el('div', { style: { display: 'flex', gap: '8px' } }, copyBtn, reuseBtn));
    root.append(content);
  }

  function assetForm(existing, onSave) {
    const sprints = Store.get('sprints');
    return function (el, close) {
      const f = {};
      const typeSel = U.el('select', {},
        ['prompt', 'agent', 'workflow', 'eval', 'lesson'].map(t => U.el('option', { value: t }, U.title(t))));
      if (existing) typeSel.value = existing.type;
      const name = U.el('input', { type: 'text', value: existing ? existing.name : '' });
      const desc = U.el('textarea', {}, existing ? existing.description : '');
      const tags = U.el('input', { type: 'text', value: existing ? (existing.tags || []).join(', ') : '', placeholder: 'comma, separated, tags' });
      const content = U.el('textarea', { style: { minHeight: '140px' } }, existing ? existing.content : '');
      const src = U.el('select', {}, U.el('option', { value: '' }, '— none —'),
        sprints.map(s => U.el('option', { value: s.id }, s.id + ' · ' + s.name)));
      if (existing && existing.sourceSprint) src.value = existing.sourceSprint;
      const err = U.el('div.err');

      const fields = [
        ['Type', typeSel], ['Name *', name], ['Description *', desc],
        ['Tags', tags], ['Content *', content], ['Source sprint', src],
      ];
      fields.forEach(([lab, input]) => el.append(U.el('div.field', {}, U.el('label', {}, lab), input)));
      el.append(err);

      const save = U.el('button.btn.primary', {
        onclick: () => {
          if (!name.value.trim() || !desc.value.trim() || !content.value.trim()) {
            err.textContent = 'Name, description and content are required.'; return;
          }
          save.disabled = true;
          const patch = {
            type: typeSel.value, name: name.value.trim(), description: desc.value.trim(),
            tags: tags.value.split(',').map(t => t.trim().toLowerCase()).filter(Boolean),
            content: content.value, sourceSprint: src.value || null,
          };
          Store.async(() => onSave(patch))
            .then(() => { close(); App.toast(existing ? 'Asset updated.' : 'Asset added to the library.'); App.render(); })
            .catch(e => { save.disabled = false; err.textContent = e.message; App.toast(e.message, 'error'); });
        },
      }, existing ? 'Save changes' : 'Add asset');
      el.append(U.el('div', { style: { display: 'flex', gap: '8px', justifyContent: 'flex-end', marginTop: '6px' } },
        U.el('button.btn', { onclick: close }, 'Cancel'), save));
    };
  }

  function addModal() {
    App.modal({ title: '＋ Add asset', body: assetForm(null, patch => Store.add('assets', Object.assign({ reuses: 0 }, patch), 'asset.created')) });
  }
  function editModal(a) {
    App.modal({ title: '✎ Edit asset', body: assetForm(a, patch => Store.update('assets', a.id, patch, 'asset.updated', 'Edited "' + patch.name + '"')) });
  }
})();
