# SwiggOS ⚒

**The AI-native operating system for AI delivery at PortSwigger.**

SwiggOS is a purpose-built internal web app for PortSwigger's **AI Pioneer** role. It manages the entire life of an AI opportunity — from the moment an employee says *"I spend every Friday doing this by hand"* to the moment a measured, governed, handed-over AI solution is running without the AI Pioneer on the critical path.

The name says whose it is: **Swigg** — as in Swigger, unmistakably PortSwigger's — plus **OS**, because this isn't a project tracker: it's the agent/AI-native operating system the whole delivery lifecycle runs on, where sharp things get made, proven and shipped.

> **Live demo:** open `index.html` on any static host — no build step, no backend, no dependencies.
> On GitHub Pages this deploys automatically at `/swiggos/` when merged to the default branch.

---

## Why this exists — the value to PortSwigger

An AI Pioneer without an operating system becomes a ticket queue. SwiggOS is designed to prevent that, and to make the role compound in value over time:

1. **Every hour saved is evidenced, not asserted.** Baselines are recorded *before* a sprint starts; finals are measured after launch. Every figure in the app is labelled **measured**, **estimated**, or **projected**, and every calculation exposes its formula and assumptions (blended hourly rate, working weeks, adoption haircut). Leadership never has to wonder whether an ROI number is real.

2. **Two-week sprints keep delivery honest.** Opportunities aren't projects that drift for a quarter — they're converted into fixed two-week sprints with a phase model (discovery → build → evaluation → launch → adoption → handover), pre-registered evaluation thresholds, decision logs with mandatory rationale, and blockers that can't be quietly forgotten.

3. **Reuse compounds the Pioneer's output.** The asset library captures prompts, agents, workflows, eval sets and lessons from every sprint. The second support-team digest costs days, not weeks, because the "monitor → classify → brief" pattern already exists. Reuse is tracked, so the compounding is visible.

4. **Governance is built in, not bolted on — which is the only credible posture for a cybersecurity company.** Role-based access control, data classification (Public → Restricted), automatic approval gates for high-risk work, a secrets register that holds *metadata only* (values stay in Vault), an append-only audit trail on every state change, a model & supplier register with DPA status, and incident tracking with escalation. PortSwigger sells security; its internal AI programme has to model it.

5. **Responsible AI is enforced in-product, not in a policy PDF.** Every AI use case carries a card: intended and prohibited use, data sources, human oversight, known limitations, evaluation evidence, bias and fairness analysis, transparency to affected users, confidence bounds, and explicit pause/retire conditions. Two hard rules are wired into the UI itself: **AI-generated content is always labelled, editable and reviewable**, and **high-impact decisions are never fully automated** — a named human approves.

6. **Every AI solution ships with its telemetry.** Execution logs, model/prompt/version tracking, token usage, latency, cost, success/failure/retry rates, human overrides, evaluation scores, and alerts for failures, unusual behaviour or declining performance. When the DSAR drafter's completeness score drifts after a CRM schema change, SwiggOS is where you see it — and where the pause condition gets invoked.

**The bottom line for leadership:** SwiggOS turns "we're doing some AI stuff" into a prioritised, governed, measured portfolio with a defensible number at the bottom — and it makes the AI Pioneer's judgement (what to build, what to gate, what to decline) legible to the whole company.

## What's inside

| Screen | What it does |
|---|---|
| **Dashboard** | Portfolio health: value shipped, hours handed back, sprints in flight, what needs attention |
| **Requests & Triage** | Anyone submits problems/ideas; the Pioneer clarifies (AI-suggested questions, human-reviewed), scores urgency/value/feasibility/risk/reusability, accepts or declines |
| **Opportunity backlog** | Weighted priority scoring with the formula exposed; approval gates for high-risk work; convert-to-sprint |
| **Sprint workspace** | Two-week delivery: phase stepper, checklists, stakeholders, decisions (rationale required), blockers, files/repos/tools, baseline vs final results |
| **Evaluation & Impact** | Baseline→final comparisons, time/quality/cost/adoption, assumptions editor — measured vs estimated vs projected, always labelled |
| **Adoption & Handover** | Usage trends, training coverage, handover checklists, runbooks — "done" means the team runs it without the Pioneer |
| **Asset library** | Reusable prompts, agents, workflows, evals and lessons — with reuse tracking |
| **Tool & model radar** | Adopt / Trial / Assess / Hold rings + the model & supplier register (DPA, residency, risk, review status) |
| **Leadership reporting** | Period reports, department mini-reports, AI-drafted narrative (labelled, editable, review-gated) |
| **Observability & Governance** | Execution logs, alerts, RBAC matrix, data classification, secrets metadata, retention controls, responsible-AI cards, append-only audit trail, incidents |

## Demo features

- **Role switcher** (top right): experience the app as the AI Pioneer, a Department Lead, an Employee, the Security Reviewer, or Leadership — permissions, data visibility and available actions all change.
- **Failure simulation** toggle: flips the simulated backend into failure mode so you can see error and recovery states.
- **Reset data**: restores the seeded demo dataset (fictional but realistic scenarios across legal, marketing, customer support, recruitment, finance and research).
- All state persists in `localStorage` — it's a self-contained demo with a simulated async backend, deliberately buildable-on: the `Store` API is the seam where a real backend slots in.

## Tech

Zero-dependency vanilla JS/CSS/HTML single-page app. Hash routing, localStorage persistence, inline-SVG charts on a colour-blind-validated palette, single dark theme, responsive to mobile. Runs from any static file host.

```
swiggos/
  index.html          app shell
  css/app.css         design system (single dark theme)
  js/util.js          DOM/date/number helpers
  js/data.js          seeded demo data (fictional)
  js/store.js         state, RBAC, audit trail, simulated async, calc engine
  js/charts.js        inline-SVG charts (bars, line, spark, donut)
  js/app.js           router, shell, toasts, modals, UI states
  js/views/*.js       the ten screens
```

## From demo to production — the go-live path

The demo is deliberately a **thin-client prototype with a clean seam**: every read and write in the app goes through the `Store` API in `js/store.js` (state, permissions, audit, async simulation). Going live means replacing what's behind that seam — not rewriting the product. Fittingly, the plan below is sized as a series of two-week sprints.

**Sprint 1 — Backend & data.**
Replace `localStorage` with a real API + database behind the existing `Store` methods (`get/add/update/mutate` map naturally onto REST or RPC endpoints). PostgreSQL fits the data model as-is (requests, opportunities, sprints, solutions, assets, radar, AI cards, logs, alerts, incidents are already normalised objects with IDs). Two non-negotiables from day one: the **audit trail becomes an append-only server-side table** (insert-only DB role, no update/delete grants — the client currently simulates this), and **execution logs are ingested from the LLM gateway** (e.g. LiteLLM/OpenTelemetry callbacks) rather than seeded, so observability reflects reality, not demo data.

**Sprint 2 — Identity & access.**
Swap the demo role-switcher for **SSO (OIDC/SAML via the company IdP)** with roles and department claims mapped to the existing `PERMS` matrix — the permission checks are already centralised in `Store.can()` / `Store.canSee()`, so enforcement moves server-side (authoritative) while the UI keeps using the same calls for progressive disclosure. Data-classification visibility (Public → Restricted) becomes row-level security in the DB. Secrets stay exactly as designed: **metadata only in the app, values only in Vault** — production changes nothing about that posture.

**Sprint 3 — Hardening & review.**
Security review by the security team (this is PortSwigger — the app should expect to be Burp-scanned by its own users): CSP headers, session handling, dependency audit (the front end is deliberately zero-dependency, which keeps the supply-chain surface near nil), rate limits, backup/retention jobs implementing the retention policy the governance screen already declares. Pen-test findings become sprint checklist items like any other work.

**Sprint 4 — Pilot & adoption (dogfooding the model).**
Run SwiggOS on SwiggOS: pilot with one team's real intake, record the baseline (time spent tracking AI work today), measure after four weeks, and publish the comparison on the app's own Impact screen. Handover criteria are the same as for any solution the app manages: runbook, named owner, alerts wired, Pioneer off the critical path.

**What deliberately doesn't change on go-live:** the calculation engine and its exposed assumptions, the approval-gate rules, the responsible-AI card schema, the measured/estimated/projected discipline, and the UI. Those are the product; the demo backend is just scaffolding around them.

## How this was built — an AI-orchestrated build with independent QA

SwiggOS wasn't just built *for* the AI Pioneer role; it was built *the way an AI Pioneer should work*: one person orchestrating a team of AI agents in parallel, with an independent, adversarial QA loop deciding when it was done. The whole cycle — architecture to QA-verified ship — took an afternoon.

**1. Architecture first, by hand.** The core was designed and written as a single coherent contract before any agent touched a screen: the data model (requests → opportunities → sprints → solutions, with classification and audit at the centre), the `Store` layer (RBAC, append-only audit trail, simulated async backend, impact-calculation engine with exposed assumptions), the chart engine (colour-blind-validated palette), the design system, and one exemplar screen (the dashboard) establishing every pattern.

**2. Four build agents in parallel.** The remaining nine screens were split across four AI build agents, each given the same non-negotiable contract: every write goes through the audited store, every action is permission-checked, every user string is escaped, every impact figure carries its measured/estimated/projected basis, every AI-generated artefact is labelled and review-gated, no placeholders, no dead buttons. One agent stalled mid-build; it was stopped and its scope was rebuilt directly — orchestration includes knowing when to take work back.

**3. An independent QA agent, briefed to break it.** A separate agent that had built nothing ran **255 scripted Playwright checks across 10 suites**: full journeys (submit → triage → score → gate → sprint → results → handover), independent recomputation of every calculation (priority scores, annual value, all nine observability aggregates), direct-URL access-control bypass attempts, XSS payload injection, approval-gate enforcement, failure/recovery simulation, and both desktop and mobile layouts on every screen.

**4. The defect loop — the honest part.** First pass: **9 defects (4 high, 2 medium, 3 low)**. The high ones were the interesting kind: individual screens enforced access control perfectly, but *aggregation surfaces* (dashboard attention list, leadership report roll-ups, the sprint chain) leaked classified titles the viewer couldn't open — the classic way access control fails in real products. The fix was architectural, not cosmetic: classification now *inherits* through the delivery chain (request → opportunity → sprint → solution) and every list filters on it. The re-test came back **230/230 green with zero regressions** — and the QA agent caught two more issues in the fixes themselves, including a genuine product decision (a named owner locked out of her own Restricted solution), which was resolved by extending visibility to an item's named participants — never role-wide. Fixed, re-verified, counter-checked (the roles that *should* be denied still are).

**Why this matters for the role:** this is the operating pattern the AI Pioneer brings to every team at PortSwigger — AI agents for parallel throughput, hard contracts for consistency, independent adversarial verification before anything ships, and a written defect trail instead of vibes. The tool demonstrates the method; the method built the tool.

---

*All people, companies' internal details, and numbers in the demo data are fictional. Built as a working product demo for the PortSwigger AI Pioneer role.*
