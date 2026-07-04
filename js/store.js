/* SwiggOS — store.js
   State, persistence (localStorage), RBAC, audit trail, simulated async,
   and the impact-calculation engine (every figure carries its basis + assumptions). */
(function () {
  'use strict';

  const LS_KEY = 'swiggos-state-v1';
  let state = null;
  const listeners = [];

  // ---- Permissions ------------------------------------------------------------
  // Single source of truth for role-based access. Views must check Store.can().
  const PERMS = {
    submitRequest: ['pioneer', 'lead', 'employee', 'security', 'exec'],
    triage: ['pioneer'],
    score: ['pioneer'],
    prioritise: ['pioneer'],
    createSprint: ['pioneer'],
    editSprint: ['pioneer'],
    approveGate: ['security'],
    legalApprove: ['pioneer', 'security'], // in demo, legal approval is recorded by pioneer/security on counsel's behalf
    manageAssets: ['pioneer'],
    editRadar: ['pioneer'],
    viewGovernance: ['pioneer', 'security', 'exec', 'lead'],
    manageGovernance: ['pioneer', 'security'],
    manageIncidents: ['pioneer', 'security'],
    viewSecrets: ['pioneer', 'security'],
    viewReports: ['pioneer', 'exec', 'lead', 'security'],
    generateNarrative: ['pioneer'],
    manageAdoption: ['pioneer'],
    ackAlert: ['pioneer', 'security'],
    editAiCard: ['pioneer', 'security'],
  };

  // Data classification visibility by role.
  // Restricted → pioneer + security + the item's NAMED participants (owner /
  // submitter / sponsor / sprint stakeholders) — an accountable owner must be
  // able to run their own solution. Confidential → those + lead (own dept) + exec.
  function isNamedParticipant(item, u) {
    if (!item) return false;
    if (item.submitter === u.id || item.owner === u.id || item.sponsor === u.id) return true;
    if (Array.isArray(item.stakeholders) && item.stakeholders.some(st => st && st.user === u.id)) return true;
    return false;
  }
  function canSeeClassified(classification, item) {
    const u = Store.currentUser();
    if (!u) return false;
    const c = classification || 'Internal';
    if (c === 'Public' || c === 'Internal') return true;
    if (u.role === 'pioneer' || u.role === 'security') return true;
    if (c === 'Confidential') {
      if (u.role === 'exec') return true;
      if (u.role === 'lead') return !item || !item.dept || item.dept === u.dept;
      return isNamedParticipant(item, u);
    }
    // Restricted: only named participants beyond pioneer/security — never role-wide.
    return isNamedParticipant(item, u);
  }

  const Store = {
    // ---- lifecycle -----------------------------------------------------------
    init() {
      let raw = null;
      try { raw = localStorage.getItem(LS_KEY); } catch (e) { /* private mode */ }
      if (raw) {
        try {
          const parsed = JSON.parse(raw);
          if (parsed && parsed.seedVersion === SEED.version) state = parsed;
        } catch (e) { /* corrupted -> reseed */ }
      }
      if (!state) this.reset(false);
      return state;
    },

    reset(notify) {
      state = JSON.parse(JSON.stringify({
        seedVersion: SEED.version,
        currentUserId: 'u-asim',
        failureSim: false,
        counters: {},
        users: SEED.users, requests: SEED.requests, opportunities: SEED.opportunities,
        sprints: SEED.sprints, solutions: SEED.solutions, aiCards: SEED.aiCards,
        assets: SEED.assets, radar: SEED.radar, execLogs: SEED.execLogs,
        alerts: SEED.alerts, incidents: SEED.incidents, secrets: SEED.secrets,
        assumptions: SEED.assumptions, audit: SEED.audit,
      }));
      this.save();
      if (notify !== false) this.emit();
    },

    save() {
      try { localStorage.setItem(LS_KEY, JSON.stringify(state)); } catch (e) { /* quota/private */ }
    },

    emit() { listeners.forEach(fn => { try { fn(); } catch (e) { console.error(e); } }); },
    onChange(fn) { listeners.push(fn); },

    // ---- access -----------------------------------------------------------------
    get(coll) { return state[coll] || []; },
    byId(coll, id) { return (state[coll] || []).find(x => x.id === id) || null; },
    assumptions() { return state.assumptions; },

    currentUser() { return state.users.find(u => u.id === state.currentUserId) || state.users[0]; },
    setUser(id) {
      const prev = this.currentUser();
      state.currentUserId = id;
      this.audit('session.role-switch', 'users', id, 'Switched active user from ' + prev.name + ' to ' + this.currentUser().name);
      this.save(); this.emit();
    },
    userName(id) { const u = this.byId('users', id); return u ? u.name : (id === 'system' ? 'System' : id || '—'); },

    can(perm) {
      const u = this.currentUser();
      return !!u && (PERMS[perm] || []).includes(u.role);
    },
    canSee(item, classification) { return canSeeClassified(classification || (item && (item.classification || item.sensitivity)), item); },

    // Filter a collection down to what the current role may see.
    visible(coll) {
      return this.get(coll).filter(item => this.canSee(item));
    },

    // ---- mutation (all writes audited) ---------------------------------------------
    uid(prefix) {
      state.counters[prefix] = (state.counters[prefix] || 100) + 1;
      return prefix + '-' + state.counters[prefix];
    },

    add(coll, obj, action) {
      if (!obj.id) obj.id = this.uid(coll.slice(0, 3).toUpperCase());
      if (!obj.createdAt) obj.createdAt = new Date().toISOString();
      state[coll].unshift(obj);
      this.audit(action || (coll + '.created'), coll, obj.id, 'Created "' + (obj.title || obj.name || obj.id) + '"');
      this.save(); this.emit();
      return obj;
    },

    update(coll, id, patch, action, detail) {
      const item = this.byId(coll, id);
      if (!item) return null;
      const before = {};
      Object.keys(patch).forEach(k => { before[k] = item[k]; });
      Object.assign(item, patch);
      this.audit(action || (coll + '.updated'), coll, id,
        detail || ('Updated ' + Object.keys(patch).join(', ')), { before, after: patch });
      this.save(); this.emit();
      return item;
    },

    // Mutate nested structures via a function, with an explicit audit line.
    mutate(coll, id, fn, action, detail) {
      const item = this.byId(coll, id);
      if (!item) return null;
      fn(item);
      this.audit(action, coll, id, detail);
      this.save(); this.emit();
      return item;
    },

    audit(action, entity, entityId, detail, changes) {
      const u = this.currentUser();
      state.audit.unshift({
        id: this.uid('AUD'), ts: new Date().toISOString(),
        actor: u ? u.id : 'system', role: u ? u.role : 'system',
        action, entity, entityId, detail: detail || '', changes: changes || null,
      });
      if (state.audit.length > 800) state.audit.length = 800;
    },

    // ---- simulated async (loading / failure / recovery states) ----------------------
    failureSim() { return !!state.failureSim; },
    setFailureSim(on) { state.failureSim = !!on; this.save(); this.emit(); },
    async(work, opts) {
      const delay = (opts && opts.delay) || (250 + Math.random() * 450);
      return new Promise((resolve, reject) => {
        setTimeout(() => {
          if (state.failureSim) {
            reject(new Error('Simulated backend failure — retry, or turn off failure simulation in Demo controls.'));
            return;
          }
          try { resolve(typeof work === 'function' ? work() : work); }
          catch (e) { reject(e); }
        }, delay);
      });
    },
  };

  // ---- Impact calculation engine --------------------------------------------------
  // Every result: { value, unit, basis: 'measured'|'estimated'|'projected', formula, assumptions[] }
  const Calc = {
    // Weighted priority score for the backlog. Weights are exposed, not hidden.
    WEIGHTS: { value: 0.35, urgency: 0.2, feasibility: 0.2, reusability: 0.1, risk: 0.15 },
    priorityScore(scores) {
      if (!scores) return null;
      const w = this.WEIGHTS;
      const raw = scores.value * w.value + scores.urgency * w.urgency +
        scores.feasibility * w.feasibility + scores.reusability * w.reusability +
        (6 - scores.risk) * w.risk; // risk inverts: high risk drags the score down
      return Math.round(raw * 20) / 10; // 0–10 scale, 1dp
    },
    priorityFormula() {
      const w = this.WEIGHTS;
      return `score = 2 × (value×${w.value} + urgency×${w.urgency} + feasibility×${w.feasibility} + reusability×${w.reusability} + (6−risk)×${w.risk}) — each input 1–5, result 0–10`;
    },

    // Weekly hours saved for a sprint with baseline+final on a per-week metric.
    hoursSavedPerWeek(sprint) {
      const b = sprint.baseline, fi = sprint.final;
      if (!b || !fi) return null;
      let perWeek;
      if (/h\/wk per person/.test(b.unit)) perWeek = (b.value - fi.value) * (fi.people || b.people || 1);
      else if (/h\/wk/.test(b.unit)) perWeek = (b.value - fi.value);
      else if (/h\/request/.test(b.unit)) perWeek = (b.value - fi.value) * 0.75; // ~3 requests/month
      else if (/h\/role/.test(b.unit)) perWeek = (b.value - fi.value) / 4.33; // ~1 role/month
      else return null;
      return Math.round(perWeek * 10) / 10;
    },

    annualValue(sprint, basisOverride) {
      const hrs = this.hoursSavedPerWeek(sprint);
      if (hrs === null) return null;
      const a = Store.assumptions();
      const measured = sprint.final && sprint.final.basis === 'measured';
      const haircut = measured ? 1 : a.adoptionHaircut;
      const value = hrs * a.workWeeksPerYear * a.hourlyRate * haircut;
      const runCost = ((sprint.final && sprint.final.costPerMonth) || 0) * 12;
      return {
        value: Math.round(value - runCost),
        gross: Math.round(value),
        runCost: Math.round(runCost),
        hoursPerWeek: hrs,
        basis: basisOverride || (measured ? 'measured' : 'projected'),
        formula: `${hrs} h/wk × ${a.workWeeksPerYear} wks × £${a.hourlyRate}/h${measured ? '' : ' × ' + a.adoptionHaircut + ' adoption haircut'} − £${Math.round(runCost)} run cost`,
        assumptions: [
          `£${a.hourlyRate}/h blended rate — ${a.hourlyRateNote}`,
          `${a.workWeeksPerYear} working weeks/year — ${a.workWeeksNote}`,
        ].concat(measured ? [] : [`${Math.round((1 - a.adoptionHaircut) * 100)}% adoption haircut on non-measured figures — ${a.adoptionNote}`]),
      };
    },

    // Observability aggregates over execution logs.
    logStats(logs) {
      const n = logs.length;
      const ok = logs.filter(l => l.status === 'success').length;
      const retried = logs.filter(l => l.status === 'retried').length;
      const failed = logs.filter(l => l.status === 'failure').length;
      const cost = U.sum(logs, l => l.costUsd);
      const scored = logs.filter(l => l.evalScore !== null && l.evalScore !== undefined);
      return {
        runs: n, ok, retried, failed,
        successRate: n ? Math.round(((ok + retried) / n) * 1000) / 10 : null,
        retryRate: n ? Math.round((retried / n) * 1000) / 10 : null,
        failureRate: n ? Math.round((failed / n) * 1000) / 10 : null,
        overrides: logs.filter(l => l.override).length,
        overrideRate: n ? Math.round((logs.filter(l => l.override).length / n) * 1000) / 10 : null,
        tokens: U.sum(logs, l => l.tokensIn + l.tokensOut),
        costUsd: Math.round(cost * 100) / 100,
        costGbp: Math.round(cost * Store.assumptions().fxUsdGbp * 100) / 100,
        avgLatency: n ? Math.round(U.avg(logs, l => l.latencyMs)) : null,
        avgEval: scored.length ? Math.round(U.avg(scored, l => l.evalScore) * 10) / 10 : null,
      };
    },
  };

  window.Store = Store;
  window.Calc = Calc;
})();
