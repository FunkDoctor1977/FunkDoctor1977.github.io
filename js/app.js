/* SwiggOS — app.js
   Router, shell, view registry, toasts, modals, loading/empty/denied states.
   Views register with App.view(route, def) where def = {
     title, icon, section, navLabel?, count?() -> number|null, render(container, params[]) }
   Routes are hash-based: #/sprints/SPR-004 → render(container, ['SPR-004']). */
(function () {
  'use strict';

  const views = {};
  const NAV_ORDER = [
    { section: 'Overview', routes: ['dashboard'] },
    { section: 'Intake', routes: ['requests'] },
    { section: 'Delivery', routes: ['backlog', 'sprints'] },
    { section: 'Impact', routes: ['impact', 'adoption'] },
    { section: 'Enablement', routes: ['assets', 'radar'] },
    { section: 'Govern', routes: ['reports', 'governance'] },
  ];

  const App = {
    view(route, def) { views[route] = def; },
    views, // exposed for search

    go(path) { location.hash = '#/' + path; },

    // ---- toasts ---------------------------------------------------------------
    toast(msg, type) {
      const box = document.getElementById('toasts');
      const t = U.el('div.toast' + (type ? '.' + type : ''), { role: 'status' }, msg);
      box.appendChild(t);
      setTimeout(() => { t.style.opacity = '0'; t.style.transition = 'opacity .3s'; setTimeout(() => t.remove(), 320); }, 3800);
    },

    // ---- modal ----------------------------------------------------------------
    modal(opts) {
      const back = U.el('div.modal-back');
      const close = () => back.remove();
      const head = U.el('h2', {}, opts.title || '', U.el('button.x', { onclick: close, 'aria-label': 'Close' }, '✕'));
      const body = U.el('div.modal-body');
      const m = U.el('div.modal', { role: 'dialog', 'aria-modal': 'true' }, head, body);
      back.addEventListener('click', e => { if (e.target === back) close(); });
      back.appendChild(m);
      document.body.appendChild(back);
      if (typeof opts.body === 'function') opts.body(body, close); else if (opts.body) body.append(opts.body);
      return { close, el: m };
    },

    confirm(title, message, onYes, yesLabel) {
      App.modal({
        title,
        body(el, close) {
          el.append(U.el('p', {}, message));
          el.append(U.el('div', { style: { display: 'flex', gap: '8px', justifyContent: 'flex-end', marginTop: '14px' } },
            U.el('button.btn', { onclick: close }, 'Cancel'),
            U.el('button.btn.primary', { onclick: () => { close(); onYes(); } }, yesLabel || 'Confirm')));
        },
      });
    },

    // ---- shared UI states -------------------------------------------------------
    empty(icon, title, sub, action) {
      const box = U.el('div.state-box', {},
        U.el('div.big', {}, icon || '◇'),
        U.el('h3', {}, title),
        U.el('div', {}, sub || ''));
      if (action) box.append(U.el('div', { style: { marginTop: '14px' } }, action));
      return box;
    },

    denied(what) {
      // Record the denial in the audit trail (the screen says we do — so we do).
      // Dedupe consecutive identical denials so re-renders don't spam the trail.
      const detail = 'Denied: ' + (what || 'view') + ' at ' + (location.hash || '#/');
      const u = Store.currentUser();
      const last = Store.get('audit')[0];
      if (!last || last.action !== 'access.denied' || last.detail !== detail || last.actor !== u.id) {
        Store.audit('access.denied', 'access', u.id, detail);
        Store.save();
      }
      return U.el('div.denied', {},
        U.el('h3', {}, '🔒 Access restricted'),
        U.el('p', {}, 'Your current role (' + ROLES[Store.currentUser().role].label + ') does not have permission to ' + (what || 'view this') + '.'),
        U.el('p', { style: { fontSize: '12px', color: 'var(--muted)' } }, 'This restriction is enforced by role-based access control and this access attempt has been recorded in the audit trail.'));
    },

    errorState(err, retry) {
      return U.el('div.state-box.error', {},
        U.el('div.big', {}, '⚠'),
        U.el('h3', {}, 'Something went wrong'),
        U.el('div', {}, err && err.message ? err.message : 'Unexpected error.'),
        U.el('div', { style: { marginTop: '14px' } }, U.el('button.btn.primary', { onclick: retry }, 'Retry')));
    },

    // Async wrapper: skeleton → content, or error + retry. Used for the simulated backend.
    load(container, promiseFactory, renderFn) {
      container.innerHTML = '';
      container.append(U.el('div.skeleton', { style: { minHeight: '120px' }, 'data-state': 'loading' }));
      const attempt = () => {
        promiseFactory().then(data => {
          container.innerHTML = '';
          renderFn(data, container);
        }).catch(err => {
          container.innerHTML = '';
          container.append(App.errorState(err, () => App.load(container, promiseFactory, renderFn)));
        });
      };
      attempt();
    },

    pageHead(title, sub, ...actions) {
      const h = U.el('div.page-head', {},
        U.el('div', {}, U.el('h1', {}, title), sub ? U.el('div.sub', {}, sub) : null));
      if (actions.length) h.append(U.el('div.actions', {}, ...actions));
      return h;
    },

    aiFlag(reviewed) {
      return U.el('span.ai-flag', { title: 'This content was AI-generated. It is editable and must be reviewed by a human.' },
        '✦ AI-generated' + (reviewed ? ' · reviewed' : ' · needs review'));
    },

    // ---- routing -------------------------------------------------------------------
    route() {
      const hash = location.hash.replace(/^#\/?/, '') || 'dashboard';
      const parts = hash.split('/').filter(Boolean);
      return { name: parts[0], params: parts.slice(1).map(decodeURIComponent) };
    },

    render() {
      const { name, params } = this.route();
      const def = views[name] || views.dashboard;
      const container = document.getElementById('view');
      document.getElementById('crumb').textContent = def.title + (params.length ? ' / ' + params.join(' / ') : '');
      document.title = def.title + ' — SwiggOS';
      container.innerHTML = '';
      try {
        def.render(container, params);
      } catch (err) {
        console.error(err);
        container.innerHTML = '';
        container.append(App.errorState(err, () => App.render()));
      }
      Charts.bindTips(container);
      this.renderNav();
      this.renderTopbar();
      document.getElementById('sidebar').classList.remove('open');
      document.getElementById('scrim').classList.remove('show');
      window.scrollTo(0, 0);
    },

    renderNav() {
      const nav = document.getElementById('nav');
      const current = this.route().name;
      nav.innerHTML = '';
      for (const sec of NAV_ORDER) {
        const routes = sec.routes.filter(r => views[r]);
        if (!routes.length) continue;
        nav.append(U.el('div.nav-sec', {}, sec.section));
        for (const r of routes) {
          const v = views[r];
          const cnt = v.count ? v.count() : null;
          const a = U.el('a' + (r === current ? '.active' : ''), { href: '#/' + r },
            U.el('span.ico', { html: v.icon || '▪' }),
            v.navLabel || v.title,
            (cnt !== null && cnt !== undefined && cnt > 0) ? U.el('span.pill', {}, String(cnt)) : null);
          nav.append(a);
        }
      }
    },

    renderTopbar() {
      const u = Store.currentUser();
      document.getElementById('avatar').textContent = U.initials(u.name);
      const sel = document.getElementById('user-switch');
      sel.innerHTML = Store.get('users').map(x =>
        '<option value="' + x.id + '"' + (x.id === u.id ? ' selected' : '') + '>' +
        U.esc(x.name) + ' — ' + U.esc(ROLES[x.role].label) + '</option>').join('');
      const sim = document.getElementById('failure-sim');
      sim.checked = Store.failureSim();
      document.getElementById('failure-sim-label').textContent = Store.failureSim() ? 'Failure sim ON' : 'Failure sim';
    },

    start() {
      Store.init();
      window.addEventListener('hashchange', () => this.render());
      document.getElementById('user-switch').addEventListener('change', e => {
        Store.setUser(e.target.value);
        App.toast('Now viewing as ' + Store.currentUser().name + ' (' + ROLES[Store.currentUser().role].label + ')');
        App.render();
      });
      document.getElementById('failure-sim').addEventListener('change', e => {
        Store.setFailureSim(e.target.checked);
        App.toast(e.target.checked ? 'Failure simulation ON — writes will fail until turned off.' : 'Failure simulation off.', e.target.checked ? 'warn' : '');
        App.renderTopbar();
      });
      document.getElementById('reset-demo').addEventListener('click', () => {
        App.confirm('Reset demo data?', 'This restores the seeded demo dataset and discards every change you have made in this browser.', () => {
          Store.reset();
          App.toast('Demo data reset to seed.');
          App.render();
        }, 'Reset');
      });
      const sidebar = document.getElementById('sidebar'), scrim = document.getElementById('scrim');
      document.getElementById('hamburger').addEventListener('click', () => {
        sidebar.classList.toggle('open');
        scrim.classList.toggle('show', sidebar.classList.contains('open'));
      });
      scrim.addEventListener('click', () => { sidebar.classList.remove('open'); scrim.classList.remove('show'); });
      this.render();
    },
  };

  window.App = App;
})();
