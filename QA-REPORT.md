# SwiggOS — Independent QA Report

> **UPDATE 2026-07-03 (fix commit `ae53457`, seed v8):** all 9 defects re-tested — 8 FIXED, QA-002 fixed-as-reported with two missed sibling surfaces (new **QA-010, HIGH**), plus one new LOW finding (**QA-011**). Full t1–t8 regression re-run: **230/230 green**. See the **"Re-test after fixes"** section at the end. The sections below document the original (pre-fix, seed v7) findings.

- **Date:** 2026-07-03 · **App:** http://localhost:8123/swiggos/index.html (seed v7)
- **Tooling:** Playwright / chromium-1194, headless. Console errors + pageerrors captured in every script; any occurrence fails the suite.
- **Test scripts** (repeatable, run with `NODE_PATH=/opt/node22/lib/node_modules node <script>` from this directory):
  `t1-journey.js`, `t2-calc.js` (+ `calc-expected.js` → `expected.json`), `t3-observability.js`, `t4-access.js`, `t5-rai.js`, `t6-failure.js`, `t7-layout.js`, `t8-sweep.js`, `v1-verify-defects.js`, `v2-verify-more.js`. Per-suite results in `results-*.json`.

## Summary

| | |
|---|---|
| Scripted checks run | **255** (10 suites) |
| Passed | **229** |
| Failing observations | **26** |
| Unique defects | **9** (QA-001 … QA-009) — every defect reproduced **twice** on fresh state; 0 unconfirmed |
| False alarms triaged out | 3 (see "Sweep triage" at the bottom — not defects) |

Charter coverage: 1 core journeys ✅ · 2 calculations ✅ (all UI figures match independent recomputation) · 3 observability & audit ✅ · 4 access control ⚠ (4 defects) · 5 responsible-AI ⚠ (1 defect) · 6 failure/empty/recovery ✅ · 7 layout ✅ (0 issues at 1440×900 and 390×844, incl. 9 extra detail pages) · 8 placeholder/dead-button sweep ⚠ (2 defects; static grep clean).

---

## DEFECTS

### QA-001 · HIGH · Dashboard "Needs attention" leaks classified items to unauthorized roles
**Affected file:** `js/views/dashboard.js` (~lines 77–85: `attention` list built from `Store.get('opportunities')` / `Store.get('requests')` with **no `Store.canSee` filter**).
**Repro (Restricted leak to exec):**
1. Reset data. Switch user to `u-ines` (Leadership).
2. Open `#/dashboard`.
3. Look at the "⚠ Needs attention" card.
**Expected:** OPP-009 "MSA redline clause extraction" is **Restricted** (pioneer + security only; `Store.canSee` returns `false` for exec) — it must not appear.
**Actual:** Row "MSA redline clause extraction waiting on legal approval" is rendered with a live link to `#/backlog/OPP-009`.
**Repro (Confidential leak to other-dept lead):**
1. Reset data. As `u-fran`, governance → observability → Acknowledge alert ALR-001 (frees a slot in the 7-item cap).
2. Switch to `u-rosa` (Head of Support, dept Customer Support). Open `#/dashboard`.
**Expected:** REQ-012 "Meeting-notes summariser for hiring debriefs" (Confidential, dept **People**) is not visible to a Customer-Support lead.
**Actual:** "New request from Gugu Ndlovu: Meeting-notes summariser for hiring debriefs" renders with link to `#/requests/REQ-012`. (Out of the box this row is masked only by the `slice(0, 7)` cap — the leak is one resolved alert away.)
Note: the same role also sees Restricted OPP-009 in this card. Clicking the links correctly lands on the denied screen — the leak is titles + submitter + existence, not the full record.

### QA-002 · HIGH · Reports "Next up" and the AI narrative include Restricted items for exec/lead
**Affected file:** `js/views/reports.js` (~lines 86–93 "Next up (top of backlog)" and `buildNarrative()` ~line 189 `gated = Store.get('opportunities')…` — both unfiltered by `canSee`).
**Repro:**
1. Reset data. Switch to `u-ines` (or `u-rosa`). Open `#/reports`.
2. Read "In flight & next" → "Next up (top of backlog)".
3. Click "✦ Generate narrative (AI)" and read the "GATED / WAITING" section.
**Expected:** Restricted OPP-009 excluded from both for these roles.
**Actual:** "MSA redline clause extraction · score 7.7" is listed with a link to `#/backlog/OPP-009`, and the narrative contains "- MSA redline clause extraction (Legal): waiting on legal review" — text explicitly designed to be copied out and shared. (Minor, same root: the "Requests received" tile counts requests the viewer cannot see.)

### QA-003 · HIGH · Classification stops at the opportunity — full Restricted-derived sprint/solution content is readable by any employee
**Affected files:** `js/views/sprints.js` (`renderDetail` has no `canSee`/classification gate), `js/views/impact.js` (comparison table), `js/views/adoption.js` (solution cards), `js/views/reports.js` (Delivered table); root cause: sprints/solutions carry no `classification` and `store.js` visibility rules are never applied to them.
**Repro:**
1. Reset data. Switch to `u-dev` (Employee, Marketing).
2. Open `#/requests/REQ-005` or `#/backlog/OPP-005` → correctly **denied** (Restricted).
3. Now open `#/sprints` → "DSAR response drafting" is listed; open `#/sprints/SPR-003` (also reachable from the list).
4. Also open `#/impact` and `#/adoption`.
**Expected:** Content derived from a Restricted opportunity (OPP-005 / REQ-005) is hidden from employees, consistent with steps 2's denial.
**Actual:** SPR-003 renders in full: goal ("Cut DSAR compilation…"), baseline/final ("Hours per DSAR 6 → 1.8"), decisions (redaction architecture, retention), links ("Redaction rules v4", "Adversarial redaction test set"), stakeholders. Impact and Adoption repeat the metrics, runbook and health notes; Reports' Delivered table shows it to leads/exec. The denial on OPP-005 is therefore trivially bypassed by following the delivery chain.

### QA-004 · HIGH · "✎ Edit runbook" is broken — `ReferenceError: runbookModal is not defined`
**Affected file:** `js/views/adoption.js:141` calls `runbookModal(sol)`; the function is not defined anywhere in the codebase (grep confirms the single reference).
**Repro:**
1. Reset data. As `u-asim`, open `#/adoption`.
2. Click "✎ Edit runbook" on any solution card.
**Expected:** An edit-runbook modal opens.
**Actual:** Nothing visible happens; the console logs `Uncaught ReferenceError: runbookModal is not defined`. Runbooks can never be created/edited via the UI — note that solutions auto-created on sprint completion start with an **empty** runbook, so the "no runbook yet" state is permanent for every newly delivered solution, despite adoption view's own copy ("the team can't run what isn't written down").

### QA-005 · MEDIUM · RAI review lock contradicts seed data and is a one-way ratchet
**Affected files:** `js/data.js` (AIC-004 and AIC-005 ship `reviews.security: 'approved'` while their eval evidence says "in progress"/"In build"), `js/views/governance.js` (`evalIncomplete()` + `lockApproved` disable only the `approved` option).
**Repro:**
1. Reset data. Open `#/governance/rai` as any viewer.
2. Read the banner "Cards without complete evaluation evidence cannot reach 'approved' — the security review is locked until the eval evidence is in", then look at AIC-004 (CV screening): Security review shows **Approved** while the card itself says "Bias eval: in progress — launch blocked".
3. As `u-fran`, change AIC-004's security review to `pending` (allowed), then try to set it back to `approved`.
**Expected:** Either the seed state respects the stated rule, or the reviewer can restore the previous value.
**Actual:** Seed state violates the on-screen rule out of the box (two cards), and after step 3 the `approved` option is permanently disabled — the previous value cannot be restored (one-way ratchet). The positive control itself works: the UI select genuinely refuses `approved` while evals are incomplete (verified), and card *status* remains `launch-gated`. May be partly intentional storytelling ("approved with mandatory bias eval before launch"), but the visible contradiction + ratchet is a state/UX defect.

### QA-008 · MEDIUM · Denied screens claim the access attempt "has been recorded in the audit trail" — it never is
**Affected files:** `js/app.js` (`App.denied()` prints the claim; no `Store.audit` call), `js/views/governance.js` RBAC card repeats "Every denied attempt is recorded in the audit trail".
**Repro (done twice with reset between):**
1. Reset data. Note `Store.get('audit').length`.
2. As `u-dev`, open `#/requests/REQ-009` (denied screen shown, containing the claim), then `#/governance` (denied again).
3. Inspect the audit trail (as pioneer or via `Store.get('audit')`).
**Expected:** Denial entries (actor `u-dev`, some `access.denied`-style action) exist, per the app's own claim.
**Actual:** No audit entry of any kind is written on denial (audit length unchanged; no action matching /denied|access/). For a governance-first app this is a false compliance statement in-product.

### QA-006 · LOW · Incident "Add entry" with empty input gives no feedback
**Affected file:** `js/views/governance.js` (`incidentCard` → `addEntry`: `if (!text) { input.focus(); return; }`).
**Repro:** Reset data → as `u-asim` open `#/governance/incidents` → click "Add entry" next to an empty timeline input.
**Expected:** A validation toast/warning, consistent with every other empty-input add in the app (checklist "Type an item first", blockers, links, stakeholders all toast).
**Actual:** No toast, no DOM change, no modal — the input is silently focused; the button reads as dead.

### QA-007 · LOW · Audit "entity" naming is inconsistent, splitting the entity filter
**Affected files:** `js/data.js` seed audit uses singular entities (`alert`, `opportunity`, `sprint`, `solution`); runtime writes via `store.js` `update/mutate` use collection names (`alerts`, `opportunities`, `sprints`, `solutions`, `requests`, `aiCards`…).
**Repro:** Reset data → acknowledge alert ALR-001 → open `#/governance/audit` → open the entity filter dropdown.
**Expected:** One option per entity type.
**Actual:** Both `alert` and `alerts` (etc.) appear; filtering by either shows only half the history for that entity type.

### QA-009 · LOW · Any report viewer (incl. read-only exec/lead) can generate, edit and "review" the AI leadership narrative
**Affected file:** `js/views/reports.js` — generate/mark-reviewed have no permission check beyond `viewReports`; `PERMS` has no narrative/report-write entry.
**Repro:** Reset data → switch to `u-ines` → `#/reports` → "✦ Generate narrative (AI)" → "Mark reviewed".
**Expected (per read-only expectation for exec):** Mutation-style actions absent/disabled for Leadership; generation restricted to pioneer (the seed asset AST-011 says drafts "require Pioneer review before sharing").
**Actual:** Exec generates the narrative (audit entries `report.generated` / `report.reviewed` written with actor `u-ines`) and can mark it reviewed. Low because the draft is session-only and correctly attributed — but it is a write path with no PERMS entry.

---

## PASSED (regression checklist)

### T1 — core journeys (51)
- 1a.validation-blocks-empty-title · 1a.lands-on-detail · 1a.status-new · 1a.appears-in-list
- 1b.accept-disabled-before-scores · 1b.five-score-pickers · 1b.status-assessed · 1b.opportunity-created · 1b.gated-with-pending-approvals (Confidential + risk 4 → `gated`, security+legal `pending`)
- 1c.convert-blocked-while-gated (button disabled) · 1c.block-reason-shown · 1c.empty-gate-note-rejected · 1c.still-gated-after-one-gate · 1c.ready-after-both-gates
- 1d.convert-enabled-when-ready · 1d.sprint-created · 1d.six-phases · 1d.checklist-toggles · 1d.empty-rationale-rejected · 1d.decision-recorded · 1d.empty-resolution-rejected · 1d.blocker-resolved · 1d.basis-note-required · 1d.comparison-panel-appears · 1d.comparison-net-value (4 h/wk → £6,992 net measured) · 1d.goes-to-adoption · 1d.adoption-entry-created · 1d.adoption-card-visible · 1d.handover-toggles · 1d.usage-logged
- 1e.audit entries with correct actor for: request-submitted, request-assessed, opportunity-created, request-accepted, approval-granted ×2 (u-fran), gate-cleared, sprint-created, converted, checklist, decision, blocker-raised, blocker-resolved, baseline, final, completed, solution-created, handover, usage, role-switches · 1e.audit-view-shows-entries · console clean

### T2 — calculations (24)
- 2a.OPP-007 priority = **8.8** in backlog table · 2a.all 10 backlog priorities match independent recomputation
- 2b.SPR-001 net **£31,296**, hours/wk **18** · impact tiles £40,888 / 23.7 h · dashboard tiles agree · basis "measured"
- 2c.observability tiles vs recomputed seed logs: runs 187 · success 98.4% · retry 2.7% · cost £4.47 · latency 3,039 ms · overrides 23 @ 12.3% · avg eval 4.2 · failures 3 · open alerts 1
- 2d.rate 38→50: total recomputes to **£53,970** · measured baseline/final values unchanged · change audited · reset restores £40,888 · console clean

### T3 — observability & audit (16)
- exec-log filters: total 187 · solution filter (Paper digest = 4) · combined filter → proper empty-state box · overrides-only = 23 with all rows flagged
- alert acknowledge works · resolve with empty note rejected · resolve with note works · both audited with actor
- audit before/after expander escapes HTML (`<img onerror>` payload inert, rendered as text) · expander collapses · actor filter · entity filter · search empty-state · role-switch audited · console clean

### T4 — access control (37)
- employee: governance denied · reports denied · REQ-009/REQ-005 absent from list · other-dept Confidential absent · "hidden by your access level" note (requests + backlog) · **direct-URL denied with no content leak** for REQ-009, REQ-005, OPP-009, OPP-005 · no score/accept/decline/AI-clarifier controls · "Only the AI Pioneer can score" note · backlog detail shows zero mutation buttons · employee dashboard is personal view
- exec: reports visible · governance visible · no ack/resolve buttons · **no secret rows** (denied box inside card; no rotate/purge buttons) · RAI read-only (no edit/pause/selects) · incidents read-only · sees Confidential · Restricted hidden in list and via direct URL
- lead: sees own-dept Confidential REQ-007 · other-dept Confidential REQ-012/REQ-006 hidden in list **and** denied via direct URL · Restricted hidden
- security: sees all 6 secret rows · can resolve alerts · sees gate Approve buttons · console clean

### T5 — responsible AI (22)
- all 5 RAI cards render · AIC-001 expands with all 10 field labels + values · AIC-004 `approved` option disabled while bias eval incomplete · UI select refuses `approved` (verified again in V2: store stays `pending`) · other values settable
- pause-condition: empty reason rejected · pauses SOL-003 + card status `paused` · visible in adoption · audited · resume restores live/approved
- clarifier AI suggestions: ✦ AI-generated · needs review flag · editable textarea · Mark reviewed flips to "· reviewed" · edit persisted
- narrative: ✦ flag · measured total matches tile (£40,888 across 3) · SPR-001 line matches (net £31,296 [measured]) · editable · Mark reviewed flips · generation+review audited · console clean

### T6 — failure / recovery / empty (17)
- failure-sim toggle + label · ack fails with error toast, state unchanged · submit fails, no request persisted, stays on form, button re-enabled · checklist failure rolls UI back to store state
- recovery: same ack + submit succeed after toggle off · Reset restores seed (14 requests, ALR-001 open, QA rows gone)
- empty states: requests filter combo · backlog filter · assets search (+ clear-filters restore) · brand-new employee dashboard ("Nothing submitted yet" + CTA) · requests list for them · sprints view with zero sprints (both sections) · console clean

### T7 — layout (45)
- 10 screens × desktop 1440×900: no horizontal document scroll; every table inside `.tbl-wrap` with `overflow-x:auto`, none escaping the viewport
- 10 screens × mobile 390×844: same, all pass · hamburger opens sidebar + scrim · nav click closes · scrim click closes · topbar controls fit · console clean

### T8 — sweep (10 passed checks)
- static grep for TODO / lorem / coming soon / not implemented / FIXME / placeholder-as-content: **clean**
- 9 mobile detail pages (request detail, submit form, gated backlog detail, sprint detail, asset detail, all governance tabs): no horizontal scroll
- every unique button on 21 screens produced a visible effect (toast/modal/nav/DOM) **except** the defects logged above · V1/V2: XSS probe via submitted request title/description inert across list, dashboard and detail (all escaped)

### Sweep triage — false positives, NOT defects
- `backlog/OPP-002 "3"`, `backlog/OPP-011 "2"`: clicking the already-selected score in a score-picker is a legitimate no-op.
- Governance tab buttons flagged "dead" only when clicking the **already-active** tab (hash unchanged) — no-op by design.
- t5's original `aic-004-cannot-set-approved` failure was a test artifact (the store value read back was the *seed* value `approved`, not a bypass); superseded by V2, which confirms the UI lock holds — the seed value itself is defect QA-005.

---
---

# Re-test after fixes — 2026-07-03, commit `ae53457`, seed v8

**Verification scripts:** `rv-refix.js` (original repro of each defect + regression watch, 47 checks) and `rv2-precise.js` (controlled-navigation recheck of QA-008 + second observations, 12 checks). **Full regression re-run of t1–t8: 230 checks, 230 passed, 0 failed** (t3 updated for the intentional plural entity names; t8 harness improved — see harness notes). Calc totals unchanged: impact/dashboard **£40,888 / 23.7 h**, OPP-007 priority **8.8**. Console clean everywhere.

## Per-defect verdicts

| ID | Verdict | Evidence |
|---|---|---|
| QA-001 | **FIXED** | Exec dashboard: no OPP-009 row/link. Lead dashboard (with ALR-001 acked to free the top-7 cap): no REQ-012, no OPP-009. Regression-safe: pioneer still sees the OPP-009 gate row; lead still sees SPR-004 blocker + sprint card. |
| QA-002 | **FIXED as reported** | "Next up" clean for exec and lead (repopulated with items they can see); narrative GATED section clean and pioneer-drafted narrative carries full visibility with no exclusion notes; Delivered table filtered for lead with note "1 delivered sprint(s) hidden by your access level — the value tile above still counts them"; headline tile stays £40,888 aggregate **with the explanatory note, as designed**. ⚠ Two sibling surfaces in the same file were missed → **new QA-010**. |
| QA-003 | **FIXED** | Employee: Restricted+Confidential sprints gone from list ("3 sprint(s) hidden by your access level"), `#/sprints/SPR-003` shows denied screen with no content leak, impact rows + adoption cards filtered with notes. Inheritance works: convert flow stamps `classification: 'Confidential'` from OPP-002; complete-sprint stamps solutions. Regression-safe: pioneer + security see all 5 sprints (no hidden note); exec sees Confidential but not Restricted; lead u-rosa sees SPR-004; employee still sees Public; Public solutions still in adoption. Side-effect finding → **QA-011**. |
| QA-004 | **FIXED** | "✎ Edit runbook" opens a modal (no console error), empty runbook rejected inline, save persists, audited as `solution.runbook` (actor u-asim, entity SOL-001), card shows the new text. |
| QA-005 | **FIXED** | Seed AIC-004 + AIC-005 security reviews now `pending` (consistent with incomplete evals). Lock still holds: `approved` option disabled, UI selection refused, store stays `pending`. The one-way-ratchet trap is gone because no locked `approved` seed value remains to lose. |
| QA-006 | **FIXED** | Empty incident timeline entry toasts "Type a timeline update first." |
| QA-007 | **FIXED** | Audit entity dropdown: `alerts, opportunities, solutions, sprints, users` — no singular duplicates; role-switch writes entity `users`. Entity filter now returns the full history per type (3/3 rows on `alerts`). |
| QA-008 | **FIXED** | Denial writes `access.denied` (actor `u-dev`, role `employee`, detail "Denied: view this request (classified Restricted) at #/requests/REQ-009"). Reload/re-render of the same denial dedupes (still 1 entry); distinct and non-consecutive repeat denials each recorded (3 entries for REQ-009 → governance → REQ-009); searchable in the audit view. *rv-refix's three QA-008 "fails" were test artifacts*: switching to u-dev while parked on `#/reports` legitimately wrote a denial for reports first — the controlled sequence in `rv2-precise.js` passes 5/5. |
| QA-009 | **FIXED** | Exec: no Generate/Regenerate/Mark-reviewed buttons, explanatory copy ("The AI Pioneer drafts…"), textarea `readOnly=true`; pioneer can generate; `report.generated` audit actor is only ever `u-asim`. **Note (not a defect):** the exec's read-only copy is the pioneer's session draft verbatim — including Restricted lines the pioneer chose to draft. That is the deliberate share-by-pioneer flow; flagged for awareness. |

## NEW defects found during re-test

### QA-010 · HIGH · Two reports surfaces were missed by the QA-002/003 fix and still leak classified names
**Affected file:** `js/views/reports.js` — (a) the **"In flight"** list (~line 84): `Store.get('sprints').filter(s => s.status === 'active')` with no `canSee` filter (the *narrative's* IN FLIGHT section was fixed, the on-page card list was not); (b) the **department mini-report "Live solutions"** list (~line 134): `Store.get('solutions').filter(s => s.dept === state.dept)` unfiltered.
**Repro (a):** Reset → switch to `u-rosa` (Support lead) → `#/reports` → "In flight & next" card.
**Expected:** SPR-005 "CV screening consistency aid" (Confidential, People — `Store.canSee` = false for her) not listed.
**Actual:** Title + phase + dept rendered with a live link to `#/sprints/SPR-005` (which then correctly denies). Reproduced twice (rv + rv2).
**Repro (b):** Reset → switch to `u-ines` (exec) → `#/reports` → Department mini-report → choose "Legal".
**Expected:** Restricted SOL-003 not listed for exec.
**Actual:** "• DSAR response drafting — owner Lena Brookes" renders (Restricted solution name + owner). Reproduced twice. (The three mini-report count tiles are aggregates and arguably fine — the named list is the leak.)

### QA-011 · LOW (intent unclear — product decision needed) · Restricted enforcement locks the named owner out of her own solution
**Affected files:** `js/store.js` `canSeeClassified` (owner/submitter exception exists for Confidential only, none for Restricted) + `js/data.js` (SOL-003 owner = `u-lena`, an employee).
**Repro:** Reset → switch to `u-lena` (Legal Counsel, employee; owner of SOL-003 and "Product owner + reviewer" of SPR-003) → `#/adoption` and `#/sprints/SPR-003`.
**Expected (persona):** The named owner who operates the DSAR drafter can see its adoption card and runbook.
**Actual:** Adoption shows "1 solution(s) hidden by your access level" (her own), and SPR-003 is denied. Reproduced twice. This is *consistent* with the classification model ("Restricted → pioneer + security only" — she has never been able to see REQ-005, which she submitted), so it may be intended; but post-fix the seeded owner has no working surface for the solution she owns. Options: add an owner/stakeholder exception for Restricted, or reassign seed ownership/reviewer.

## Regression pass detail (post-fix)

- **t1 journeys 51/51** — submit → triage → gated accept → gates (fran) → ready → convert → checklist/decisions/blockers/results → complete → adoption → audit actors all intact with the new classification-stamping convert/complete flows.
- **t2 calc 24/24** — every figure identical to pre-fix (£31,296 / £40,888 / £53,970 at rate 50 / log tiles / reset restore).
- **t3 observability 16/16** — updated for intentional plural entities; filters, alert ack/resolve + audit, HTML-escaping expander all green.
- **t4 access 42/42** — including the five checks that previously caught QA-001/002/003; exec secrets denial, lead dept scoping, direct-URL denials all hold.
- **t5 RAI 23/23** — seed change (reviews → pending) is intentional; lock, pause/resume, AI flags, narrative numbers green.
- **t6 failure/empty 17/17**, **t7 layout 45/45** (new "hidden by your access level" notes don't break any viewport), **t8 sweep 12/12** — "Edit runbook" and incidents "Add entry" now produce visible effects; no console errors from any button.

### Harness notes (test-side changes, not app defects)
- `t3`: entity filter assertions updated `alert` → `alerts` (QA-007's intentional rename).
- `t8`: sweep now skips designed no-ops (already-active tab, currently-selected score) and compares a DJB2 hash of `#view` innerHTML instead of its length — the pre-fix "dead" flags for score buttons "3"/"2" were equal-length DOM changes (7.4→7.0 + `sel` class moving), a detector blind spot, not app bugs.

## Post-fix status

**8 of 9 defects FIXED · QA-002 fixed-as-reported with 1 new HIGH follow-up (QA-010: two missed reports surfaces) · 1 new LOW finding (QA-011: Restricted owner lockout, intent unclear) · 0 regressions in 230 re-run checks.**

---

# Final round — 2026-07-03, commit `648f959` (QA-010 / QA-011)

**Verification:** `rv3-final.js` (18/18 passed) + full `t4-access.js` regression (42/42 passed). Console clean.

| ID | Verdict | Evidence |
|---|---|---|
| QA-010a | **FIXED** | Reports "In flight" for lead u-rosa: SPR-005 gone (no title, no link), note "1 sprint(s) hidden by your access level" shown; SPR-004 still listed for her. |
| QA-010b | **FIXED** | Legal dept mini-report for exec: SOL-003 name+owner gone (aggregate tiles remain); pioneer still sees the full mini-report entry. |
| QA-011 | **FIXED** | `canSeeClassified` now extends Restricted (and the Confidential employee case) to NAMED participants (owner/submitter/sponsor/sprint stakeholders). u-lena sees SOL-003 adoption card + runbook, SPR-003 detail, and her own REQ-005/OPP-005/REQ-009. Governance classification copy updated to say "named participants only … never role-wide". |

**Regression sweep on the new participant semantics — all correct:**
- Employee u-dev: still denied on REQ-009/REQ-005/OPP-009/OPP-005/SPR-003/SPR-004/SPR-005/SOL-003 (canSee all false; SPR-003 direct URL shows denied screen).
- Exec u-ines: Restricted still hidden (REQ-009/SPR-003/SOL-003 false), Confidential still visible (SPR-004 true).
- Lead u-rosa: other-dept scoping intact (REQ-012/SPR-005/SPR-003 false), own-dept SPR-004 true.
- Pioneer + security: all 5 sprints visible, no hidden-note anywhere.
- Intended new grant is participant-scoped, not role-wide: u-gugu (SPR-005 product owner) gains exactly SPR-005 and nothing else.
- t4 access suite: 42/42 (all original denial/visibility checks, secrets, RBAC-gated buttons, direct-URL bypass attempts).

## FINAL STATUS — all 11 items closed

**QA-001…QA-009 FIXED (commit `ae53457`) · QA-010, QA-011 FIXED (commit `648f959`) · 0 open defects · 0 regressions across t1–t8 (230 checks) + rv/rv2/rv3 verification suites.**
