/* SwiggOS — data.js
   Seed data: realistic *fictional* examples for the PortSwigger AI Pioneer role.
   All people, numbers and scenarios are invented for demo purposes.
   Dates are computed relative to "today" so the demo always reads fresh. */
(function () {
  'use strict';
  const d = U.daysAgo, f = U.daysFromNow;

  const SEED_VERSION = 8; // bump to force a reseed on deployed demos

  // ---- People & roles -------------------------------------------------------
  const users = [
    { id: 'u-asim', name: 'Asim Shahzad', role: 'pioneer', dept: 'AI Office', title: 'AI Pioneer' },
    { id: 'u-fran', name: 'Fran Delgado', role: 'security', dept: 'Security & Governance', title: 'Security Reviewer' },
    { id: 'u-ines', name: 'Inés Kowalczyk', role: 'exec', dept: 'Leadership', title: 'COO' },
    { id: 'u-rosa', name: 'Rosa Whitfield', role: 'lead', dept: 'Customer Support', title: 'Head of Support' },
    { id: 'u-dev', name: 'Dev Aranha', role: 'employee', dept: 'Marketing', title: 'Content Manager' },
    { id: 'u-lena', name: 'Lena Brookes', role: 'employee', dept: 'Legal', title: 'Legal Counsel' },
    { id: 'u-tomo', name: 'Tomo Hayashi', role: 'employee', dept: 'Finance', title: 'Finance Analyst' },
    { id: 'u-gugu', name: 'Gugu Ndlovu', role: 'employee', dept: 'People', title: 'Talent Partner' },
    { id: 'u-marek', name: 'Marek Sowa', role: 'employee', dept: 'Research', title: 'Security Researcher' },
  ];

  const ROLES = {
    pioneer: { label: 'AI Pioneer', desc: 'Full control: triage, score, prioritise, run sprints, manage governance.' },
    lead: { label: 'Department Lead', desc: 'Sees own department in depth, all Internal items, and reports.' },
    employee: { label: 'Employee', desc: 'Submits requests, tracks own submissions, browses the asset library.' },
    security: { label: 'Security Reviewer', desc: 'Approves risk gates, owns incidents, sees all governance data.' },
    exec: { label: 'Leadership', desc: 'Read-only portfolio, impact and leadership reporting views.' },
  };

  const DEPTS = ['Customer Support', 'Marketing', 'Legal', 'Finance', 'People', 'Research', 'Engineering'];

  // ---- Requests (intake) ------------------------------------------------------
  // status: new | clarifying | assessed | accepted | declined
  const requests = [
    {
      id: 'REQ-014', title: 'Summarise weekly community forum themes', type: 'Repetitive process',
      dept: 'Customer Support', submitter: 'u-rosa', createdAt: d(1), status: 'new',
      description: 'Every Friday someone reads ~300 forum threads about Burp Suite and writes a themes digest for the product team. Takes most of a day and often misses emerging issues.',
      frequency: 'Weekly', hoursPerWeek: 6, peopleAffected: 2,
      dataSources: 'Public community forum posts', sensitivity: 'Public', clarifications: [], scores: null,
    },
    {
      id: 'REQ-013', title: 'First-draft social posts for research publications', type: 'AI idea',
      dept: 'Marketing', submitter: 'u-dev', createdAt: d(2), status: 'new',
      description: 'When the research team publishes (e.g. a new web vuln class), marketing scrambles to draft accurate social copy. An assistant that drafts from the paper, flagged for researcher review, would cut turnaround from days to hours.',
      frequency: 'Ad hoc (~2/month)', hoursPerWeek: 2, peopleAffected: 3,
      dataSources: 'Published research posts (public)', sensitivity: 'Public', clarifications: [], scores: null,
    },
    {
      id: 'REQ-012', title: 'Meeting-notes summariser for hiring debriefs', type: 'Request for support',
      dept: 'People', submitter: 'u-gugu', createdAt: d(3), status: 'new',
      description: 'Interview debrief notes are inconsistent. Want help structuring notes into our scorecard format. Notes contain candidate personal data.',
      frequency: 'Daily during hiring rounds', hoursPerWeek: 4, peopleAffected: 8,
      dataSources: 'Interview notes (candidate PII)', sensitivity: 'Confidential', clarifications: [], scores: null,
    },
    {
      id: 'REQ-011', title: 'Auto-tag inbound sales-tax exemption certificates', type: 'Repetitive process',
      dept: 'Finance', submitter: 'u-tomo', createdAt: d(5), status: 'clarifying',
      description: 'US customers email exemption certificates; we manually validate fields and file them. ~40/week, error-prone.',
      frequency: 'Weekly', hoursPerWeek: 5, peopleAffected: 2,
      dataSources: 'Customer tax documents', sensitivity: 'Confidential',
      clarifications: [
        { q: 'Which fields must be validated for a certificate to be accepted, and is there an authoritative checklist?', a: null, by: 'u-asim', at: d(4), aiGenerated: true, reviewed: true },
        { q: 'What happens today when a certificate fails validation — who follows up?', a: 'AR team emails the customer manually with a template.', by: 'u-asim', at: d(4), aiGenerated: true, reviewed: true },
      ], scores: null,
    },
    {
      id: 'REQ-010', title: 'Localise onboarding emails into 5 languages', type: 'Business problem',
      dept: 'Marketing', submitter: 'u-dev', createdAt: d(7), status: 'clarifying',
      description: 'Onboarding email sequences are English-only. Agencies quoted 6 weeks per revision cycle. Could we draft translations in-house with AI + native-speaker review?',
      frequency: 'Quarterly refresh', hoursPerWeek: 1.5, peopleAffected: 2,
      dataSources: 'Marketing email templates', sensitivity: 'Internal',
      clarifications: [
        { q: 'Which languages, and do we have native speakers internally for review?', a: 'DE, FR, JA, PT-BR, ES. Native reviewers for DE/FR/ES internally; JA and PT-BR would need freelance review.', by: 'u-asim', at: d(6), aiGenerated: false, reviewed: true },
      ], scores: null,
    },
    {
      id: 'REQ-009', title: 'Extract clause deviations from customer MSA redlines', type: 'Repetitive process',
      dept: 'Legal', submitter: 'u-lena', createdAt: d(12), status: 'assessed',
      description: 'Enterprise customers send redlined MSAs. Counsel manually diffs each against our standard positions playbook. 3–5 hours per contract, ~6 contracts/month.',
      frequency: 'Weekly', hoursPerWeek: 5, peopleAffected: 2,
      dataSources: 'Customer contracts (commercially sensitive)', sensitivity: 'Restricted',
      clarifications: [
        { q: 'Can contracts be processed by an external model under our DPA, or must this stay on approved infrastructure?', a: 'Must stay on the approved gateway with zero-retention terms. No training on our data.', by: 'u-asim', at: d(10), aiGenerated: false, reviewed: true },
      ],
      scores: { urgency: 3, value: 5, feasibility: 4, risk: 4, reusability: 4 },
      assessment: 'Strong value, but Restricted data → needs security + legal gate before any sprint. Playbook exists and is well-structured, which makes evaluation tractable.',
    },
    {
      id: 'REQ-008', title: 'Weekly research-paper sweep for web security topics', type: 'AI idea',
      dept: 'Research', submitter: 'u-marek', createdAt: d(16), status: 'assessed',
      description: 'Researchers each skim arXiv/conference feeds separately. A shared weekly digest with relevance ranking against our research themes would save duplicated reading.',
      frequency: 'Weekly', hoursPerWeek: 4, peopleAffected: 6,
      dataSources: 'Public papers and abstracts', sensitivity: 'Public', clarifications: [],
      scores: { urgency: 2, value: 3, feasibility: 5, risk: 1, reusability: 5 },
      assessment: 'Low risk, high reusability (same pattern as forum digest). Queue behind higher-value items.',
    },
    {
      id: 'REQ-007', title: 'Draft first responses to support tickets', type: 'Business problem',
      dept: 'Customer Support', submitter: 'u-rosa', createdAt: d(35), status: 'accepted', opportunityId: 'OPP-007',
      description: 'Median first-response time is 9h. Many tickets are known issues answerable from docs and past tickets. Drafting suggested replies for agent review could halve response time.',
      frequency: 'Continuous', hoursPerWeek: 30, peopleAffected: 9,
      dataSources: 'Ticket bodies (customer data), product docs', sensitivity: 'Confidential',
      clarifications: [
        { q: 'Are agents comfortable editing AI drafts rather than writing from scratch?', a: 'Yes — trialled snippets before; the ask is quality + provenance.', by: 'u-asim', at: d(33), aiGenerated: true, reviewed: true },
      ],
      scores: { urgency: 5, value: 5, feasibility: 4, risk: 3, reusability: 4 },
      assessment: 'Highest-traffic workflow in the company. Human-in-the-loop by design; agents always send.',
    },
    {
      id: 'REQ-006', title: 'Screen inbound CVs for researcher roles', type: 'Repetitive process',
      dept: 'People', submitter: 'u-gugu', createdAt: d(40), status: 'accepted', opportunityId: 'OPP-006',
      description: 'AppSec researcher roles get 400+ applications. First-pass screening against the rubric takes ~2 full days per role. Want a consistency aid, not an auto-rejector.',
      frequency: 'Per role (~1/month)', hoursPerWeek: 4, peopleAffected: 3,
      dataSources: 'CVs (candidate PII)', sensitivity: 'Confidential',
      clarifications: [
        { q: 'Confirm: no automated rejection — every candidate is seen by a human?', a: 'Confirmed. The tool orders and annotates; humans decide.', by: 'u-fran', at: d(38), aiGenerated: false, reviewed: true },
      ],
      scores: { urgency: 3, value: 4, feasibility: 3, risk: 5, reusability: 3 },
      assessment: 'High-risk (bias, PII, employment decisions). Gated: security + legal approval, bias evaluation mandatory, human decision on every candidate.',
    },
    {
      id: 'REQ-005', title: 'Draft DSAR responses', type: 'Business problem',
      dept: 'Legal', submitter: 'u-lena', createdAt: d(55), status: 'accepted', opportunityId: 'OPP-005',
      description: 'Data subject access requests take ~6 hours each to compile and draft. Volume is growing. Statutory deadlines make this urgent when requests cluster.',
      frequency: '~3/month', hoursPerWeek: 4.5, peopleAffected: 2,
      dataSources: 'CRM records, support history (personal data)', sensitivity: 'Restricted',
      clarifications: [],
      scores: { urgency: 4, value: 4, feasibility: 4, risk: 4, reusability: 2 },
      assessment: 'Statutory risk if late; drafts always reviewed by counsel before release.',
    },
    {
      id: 'REQ-004', title: 'Auto-generate release notes from commit history', type: 'AI idea',
      dept: 'Engineering', submitter: 'u-marek', createdAt: d(60), status: 'declined',
      description: 'Generate customer-facing release notes from internal commit logs.',
      frequency: 'Monthly', hoursPerWeek: 1, peopleAffected: 2,
      dataSources: 'Internal commit messages', sensitivity: 'Internal', clarifications: [],
      scores: { urgency: 1, value: 2, feasibility: 3, risk: 3, reusability: 2 },
      assessment: 'Declined: commit logs reference unreleased security research; low value vs leak risk. Revisit if scoped to public changelog only.',
      declineReason: 'Value too low relative to information-leak risk from internal commit content.',
    },
    {
      id: 'REQ-003', title: 'Monitor competitor content and feature announcements', type: 'Repetitive process',
      dept: 'Marketing', submitter: 'u-dev', createdAt: d(70), status: 'accepted', opportunityId: 'OPP-003',
      description: 'Weekly manual sweep of competitor blogs, release notes and social. Slow and inconsistent.',
      frequency: 'Weekly', hoursPerWeek: 3, peopleAffected: 2,
      dataSources: 'Public competitor websites', sensitivity: 'Public', clarifications: [],
      scores: { urgency: 3, value: 3, feasibility: 5, risk: 1, reusability: 4 },
      assessment: 'Low risk, quick win, reusable monitoring pattern.',
    },
    {
      id: 'REQ-002', title: 'Code invoices to the right cost centres', type: 'Repetitive process',
      dept: 'Finance', submitter: 'u-tomo', createdAt: d(80), status: 'accepted', opportunityId: 'OPP-002',
      description: 'AP clerk manually assigns ~250 invoices/month to cost centres. Rules are mostly consistent; exceptions need judgement.',
      frequency: 'Daily', hoursPerWeek: 8, peopleAffected: 2,
      dataSources: 'Supplier invoices', sensitivity: 'Confidential', clarifications: [],
      scores: { urgency: 3, value: 4, feasibility: 4, risk: 2, reusability: 3 },
      assessment: 'Good candidate: high volume, clear ground truth from historical codings.',
    },
    {
      id: 'REQ-001', title: 'Weekly digest of security research papers', type: 'AI idea',
      dept: 'Research', submitter: 'u-marek', createdAt: d(120), status: 'accepted', opportunityId: 'OPP-001',
      description: 'The original pilot: rank and summarise new papers against our research themes.',
      frequency: 'Weekly', hoursPerWeek: 4, peopleAffected: 6,
      dataSources: 'Public papers', sensitivity: 'Public', clarifications: [],
      scores: { urgency: 2, value: 3, feasibility: 5, risk: 1, reusability: 5 },
      assessment: 'Chosen as the pilot sprint: low risk, visible output, teaches the delivery pattern.',
    },
  ];

  // ---- Opportunities (prioritised backlog) -----------------------------------
  // status: backlog | gated | ready | in-sprint | done | declined
  const opportunities = [
    {
      id: 'OPP-007', requestId: 'REQ-007', title: 'Support reply drafting assistant', dept: 'Customer Support',
      scores: { urgency: 5, value: 5, feasibility: 4, risk: 3, reusability: 4 }, effort: 'M',
      classification: 'Confidential', status: 'in-sprint', sprintId: 'SPR-004', createdAt: d(33),
      approvals: { security: { status: 'approved', by: 'u-fran', at: d(30), note: 'Zero-retention gateway only; customer identifiers pseudonymised in prompts.' }, legal: { status: 'approved', by: 'u-lena', at: d(29), note: 'Covered by existing customer terms; no new consent needed for internal drafting.' } },
      owner: 'u-asim', sponsor: 'u-rosa',
    },
    {
      id: 'OPP-006', requestId: 'REQ-006', title: 'CV screening consistency aid', dept: 'People',
      scores: { urgency: 3, value: 4, feasibility: 3, risk: 5, reusability: 3 }, effort: 'L',
      classification: 'Confidential', status: 'in-sprint', sprintId: 'SPR-005', createdAt: d(38),
      approvals: { security: { status: 'approved', by: 'u-fran', at: d(24), note: 'PII redaction in logs verified; approved with mandatory bias eval before launch.' }, legal: { status: 'approved', by: 'u-lena', at: d(22), note: 'Not automated decision-making under UK GDPR Art 22 — human decides every candidate. Candidate privacy notice updated.' } },
      owner: 'u-asim', sponsor: 'u-gugu',
    },
    {
      id: 'OPP-009', requestId: 'REQ-009', title: 'MSA redline clause extraction', dept: 'Legal',
      scores: { urgency: 3, value: 5, feasibility: 4, risk: 4, reusability: 4 }, effort: 'M',
      classification: 'Restricted', status: 'gated', createdAt: d(10),
      approvals: { security: { status: 'approved', by: 'u-fran', at: d(6), note: 'Approved: gateway-only, no document persistence beyond 30 days.' }, legal: { status: 'pending', by: null, at: null, note: null } },
      owner: 'u-asim', sponsor: 'u-lena',
    },
    {
      id: 'OPP-011', requestId: 'REQ-011', title: 'Tax exemption certificate validation', dept: 'Finance',
      scores: { urgency: 2, value: 3, feasibility: 4, risk: 3, reusability: 3 }, effort: 'S',
      classification: 'Confidential', status: 'backlog', createdAt: d(4),
      approvals: { security: { status: 'not-requested' }, legal: { status: 'not-requested' } },
      owner: 'u-asim', sponsor: 'u-tomo',
    },
    {
      id: 'OPP-010', requestId: 'REQ-010', title: 'Onboarding email localisation', dept: 'Marketing',
      scores: { urgency: 2, value: 3, feasibility: 4, risk: 2, reusability: 4 }, effort: 'S',
      classification: 'Internal', status: 'backlog', createdAt: d(6),
      approvals: { security: { status: 'not-requested' }, legal: { status: 'not-requested' } },
      owner: 'u-asim', sponsor: 'u-dev',
    },
    {
      id: 'OPP-008', requestId: 'REQ-008', title: 'Research paper sweep v2 (themes + ranking)', dept: 'Research',
      scores: { urgency: 2, value: 3, feasibility: 5, risk: 1, reusability: 5 }, effort: 'S',
      classification: 'Public', status: 'backlog', createdAt: d(15),
      approvals: { security: { status: 'not-required' }, legal: { status: 'not-required' } },
      owner: 'u-asim', sponsor: 'u-marek',
    },
    {
      id: 'OPP-005', requestId: 'REQ-005', title: 'DSAR response drafting', dept: 'Legal',
      scores: { urgency: 4, value: 4, feasibility: 4, risk: 4, reusability: 2 }, effort: 'M',
      classification: 'Restricted', status: 'done', sprintId: 'SPR-003', createdAt: d(53),
      approvals: { security: { status: 'approved', by: 'u-fran', at: d(50), note: 'Data minimisation reviewed; access limited to Legal.' }, legal: { status: 'approved', by: 'u-lena', at: d(50), note: 'Counsel signs every outgoing response.' } },
      owner: 'u-asim', sponsor: 'u-lena',
    },
    {
      id: 'OPP-003', requestId: 'REQ-003', title: 'Competitor content radar', dept: 'Marketing',
      scores: { urgency: 3, value: 3, feasibility: 5, risk: 1, reusability: 4 }, effort: 'S',
      classification: 'Public', status: 'done', sprintId: 'SPR-002', createdAt: d(68),
      approvals: { security: { status: 'not-required' }, legal: { status: 'not-required' } },
      owner: 'u-asim', sponsor: 'u-dev',
    },
    {
      id: 'OPP-002', requestId: 'REQ-002', title: 'Invoice cost-centre coding copilot', dept: 'Finance',
      scores: { urgency: 3, value: 4, feasibility: 4, risk: 2, reusability: 3 }, effort: 'M',
      classification: 'Confidential', status: 'ready', createdAt: d(78),
      approvals: { security: { status: 'approved', by: 'u-fran', at: d(20), note: 'Supplier data OK on gateway; no card data present.' }, legal: { status: 'approved', by: 'u-lena', at: d(19), note: 'No personal data concerns beyond supplier contacts.' } },
      owner: 'u-asim', sponsor: 'u-tomo',
    },
    {
      id: 'OPP-001', requestId: 'REQ-001', title: 'Research paper weekly digest', dept: 'Research',
      scores: { urgency: 2, value: 3, feasibility: 5, risk: 1, reusability: 5 }, effort: 'S',
      classification: 'Public', status: 'done', sprintId: 'SPR-001', createdAt: d(118),
      approvals: { security: { status: 'not-required' }, legal: { status: 'not-required' } },
      owner: 'u-asim', sponsor: 'u-marek',
    },
  ];

  // ---- Sprints ---------------------------------------------------------------
  const PHASES = ['discovery', 'build', 'evaluation', 'launch', 'adoption', 'handover'];
  const ck = (t, done) => ({ text: t, done: !!done });

  const sprints = [
    {
      id: 'SPR-001', oppId: 'OPP-001', name: 'Research paper weekly digest', dept: 'Research', classification: 'Public',
      startDate: d(110), endDate: d(96), status: 'complete', phase: 'handover', createdAt: d(112),
      goal: 'Ship a weekly ranked digest of new web-security papers, reviewed by a researcher before send.',
      stakeholders: [{ user: 'u-marek', role: 'Product owner' }, { user: 'u-asim', role: 'Builder' }],
      phases: {
        discovery: { items: [ck('Interview 3 researchers on current reading workflow', 1), ck('Collect 8 example "good digest" entries as ground truth', 1), ck('Define relevance rubric with research leads', 1)] },
        build: { items: [ck('Feed pipeline: arXiv + 4 conference feeds', 1), ck('Ranking prompt v3 against theme list', 1), ck('Summary prompt with citation links', 1), ck('Weekly send with review step', 1)] },
        evaluation: { items: [ck('Blind eval: model ranking vs researcher ranking on 60 papers', 1), ck('Summary factuality spot-check (20 samples)', 1)] },
        launch: { items: [ck('First live digest sent', 1), ck('Feedback thumbs added', 1)] },
        adoption: { items: [ck('All 6 researchers subscribed', 1), ck('4-week usage review', 1)] },
        handover: { items: [ck('Runbook written', 1), ck('Owner: Marek (Research)', 1), ck('Alerting on failed weekly run', 1)] },
      },
      decisions: [
        { text: 'Use Haiku for ranking, Sonnet for summaries', rationale: 'Ranking is high-volume/low-stakes; summaries need quality. Cuts cost ~70%.', by: 'u-asim', at: d(105) },
        { text: 'Researcher review before send, indefinitely', rationale: 'Digest carries the team\'s credibility; a wrong summary erodes trust fast.', by: 'u-marek', at: d(103) },
      ],
      blockers: [],
      links: { repos: ['github.com/portswigger-internal/paper-digest'], files: ['Relevance rubric v2 (Notion)', 'Eval set: 60 ranked papers (CSV)'], tools: ['Claude API via gateway', 'RSS collector'] },
      baseline: { metric: 'Researcher hours on paper triage / week', value: 4, unit: 'h/wk per person', people: 6, quality: 'Ad-hoc coverage, duplicated reading', costPerMonth: 0, basis: 'measured', basisNote: 'Timesheet sample, 3 weeks before sprint.' },
      final: { metric: 'Researcher hours on paper triage / week', value: 1, unit: 'h/wk per person', people: 6, quality: '92% ranking agreement with researcher judgement (n=60)', costPerMonth: 14, basis: 'measured', basisNote: 'Measured over 4 weeks post-launch; cost from gateway billing.' },
      retro: 'The eval set was the highest-leverage artefact — reused for every regression since. Review-before-send cost 20 min/week and bought total trust.',
    },
    {
      id: 'SPR-002', oppId: 'OPP-003', name: 'Competitor content radar', dept: 'Marketing', classification: 'Public',
      startDate: d(66), endDate: d(52), status: 'complete', phase: 'handover', createdAt: d(68),
      goal: 'Weekly structured brief of competitor product/content moves with links, replacing the manual sweep.',
      stakeholders: [{ user: 'u-dev', role: 'Product owner' }, { user: 'u-asim', role: 'Builder' }],
      phases: {
        discovery: { items: [ck('List 14 competitor sources with selectors', 1), ck('Agree brief format with marketing lead', 1)] },
        build: { items: [ck('Scraper + change detection', 1), ck('Classification prompt (product / content / pricing / hiring)', 1), ck('Weekly brief generator', 1)] },
        evaluation: { items: [ck('Precision check on 40 classified items', 1), ck('Missed-item audit vs manual sweep, 2 weeks parallel run', 1)] },
        launch: { items: [ck('Live brief to #marketing', 1)] },
        adoption: { items: [ck('Manual sweep retired', 1)] },
        handover: { items: [ck('Runbook + source list handover to Dev', 1), ck('Failure alert to #ai-ops', 1)] },
      },
      decisions: [
        { text: 'Classify with small model; no summarisation of paywalled content', rationale: 'Respect paywalls/ToS; links suffice.', by: 'u-asim', at: d(60) },
      ],
      blockers: [{ text: 'Two competitor sites block scraping', severity: 'medium', status: 'resolved', raisedAt: d(62), resolvedAt: d(58), resolution: 'Switched to their public RSS + newsletter parsing.' }],
      links: { repos: ['github.com/portswigger-internal/content-radar'], files: ['Source list v3'], tools: ['Claude Haiku via gateway', 'n8n schedule'] },
      baseline: { metric: 'Hours on competitor sweep / week', value: 3, unit: 'h/wk', people: 2, quality: 'Inconsistent coverage, ~1 week lag', costPerMonth: 0, basis: 'measured', basisNote: 'Self-reported over 4 weeks.' },
      final: { metric: 'Hours on competitor sweep / week', value: 0.5, unit: 'h/wk', people: 2, quality: '95% precision on classification (n=40); same-day detection', costPerMonth: 9, basis: 'measured', basisNote: 'Measured 3 weeks post-launch.' },
      retro: 'Change-detection dedupe mattered more than model quality. Pattern extracted to asset library as "monitor → classify → brief".',
    },
    {
      id: 'SPR-003', oppId: 'OPP-005', name: 'DSAR response drafting', dept: 'Legal', classification: 'Restricted',
      startDate: d(48), endDate: d(34), status: 'complete', phase: 'adoption', createdAt: d(50),
      goal: 'Cut DSAR compilation and drafting from ~6h to <2h with counsel review on every response.',
      stakeholders: [{ user: 'u-lena', role: 'Product owner + reviewer' }, { user: 'u-asim', role: 'Builder' }, { user: 'u-fran', role: 'Security reviewer' }],
      phases: {
        discovery: { items: [ck('Map data sources per DSAR (CRM, support, billing)', 1), ck('Template + redaction rules with counsel', 1)] },
        build: { items: [ck('Retrieval across systems with per-source citations', 1), ck('Draft generator with mandatory redaction pass', 1), ck('Counsel review UI with diff-on-edit', 1)] },
        evaluation: { items: [ck('Completeness check vs 6 historical DSARs', 1), ck('Redaction failure test: 0 leaks on 40 adversarial samples', 1)] },
        launch: { items: [ck('First live DSAR drafted', 1)] },
        adoption: { items: [ck('3 DSARs processed', 1), ck('Second counsel trained', 0)] },
        handover: { items: [ck('Runbook', 1), ck('Quarterly redaction re-test scheduled', 0)] },
      },
      decisions: [
        { text: 'Redaction is deterministic code, not the model', rationale: 'Regex + entity list is auditable; model-only redaction failed 2/40 adversarial cases.', by: 'u-fran', at: d(42) },
        { text: 'Retention: drafts deleted 30 days after response sent', rationale: 'Minimise personal-data footprint.', by: 'u-lena', at: d(40) },
      ],
      blockers: [{ text: 'Eval score drift on completeness after CRM schema change', severity: 'high', status: 'open', raisedAt: d(3), resolvedAt: null, resolution: null }],
      links: { repos: ['github.com/portswigger-internal/dsar-drafter'], files: ['Redaction rules v4', 'Adversarial redaction test set'], tools: ['Claude Sonnet via gateway', 'CRM API (read-only service account)'] },
      baseline: { metric: 'Hours per DSAR', value: 6, unit: 'h/request', people: 2, quality: '2 of last 12 needed follow-up corrections', costPerMonth: 0, basis: 'measured', basisNote: 'Time logs on last 12 DSARs.' },
      final: { metric: 'Hours per DSAR', value: 1.8, unit: 'h/request', people: 2, quality: '0 redaction failures in eval (n=40); counsel edits ~15% of draft text', costPerMonth: 22, basis: 'measured', basisNote: 'First 3 live DSARs, timed.' },
      retro: null,
    },
    {
      id: 'SPR-004', oppId: 'OPP-007', name: 'Support reply drafting assistant', dept: 'Customer Support', classification: 'Confidential',
      startDate: d(4), endDate: f(10), status: 'active', phase: 'build', createdAt: d(6),
      goal: 'Suggested replies (with doc citations) inside the ticket view; agents edit and send. Target: first-response time 9h → 4h.',
      stakeholders: [{ user: 'u-rosa', role: 'Sponsor' }, { user: 'u-asim', role: 'Builder' }, { user: 'u-fran', role: 'Security reviewer' }],
      phases: {
        discovery: { items: [ck('Shadow 4 agents for a day', 1), ck('Cluster last 90 days of tickets into intents', 1), ck('Baseline: FRT 9.1h median, 34% tickets doc-answerable', 1)] },
        build: { items: [ck('Retrieval over docs + resolved tickets', 1), ck('Draft prompt v2 with citation requirement', 1), ck('Pseudonymisation layer for customer identifiers', 1), ck('Zendesk sidebar integration', 0), ck('Feedback capture (accept / edit-heavily / discard)', 0)] },
        evaluation: { items: [ck('Blind agent rating on 100 drafted replies', 0), ck('Hallucination check: every claim must cite a doc', 0)] },
        launch: { items: [ck('Pilot with 3 volunteer agents', 0)] },
        adoption: { items: [ck('Roll out to full team if pilot CSAT holds', 0)] },
        handover: { items: [ck('Runbook + dashboard to Support ops', 0)] },
      },
      decisions: [
        { text: 'Drafts never auto-send — agent must click send', rationale: 'Customer-facing content; responsible-AI policy requires human approval.', by: 'u-asim', at: d(4) },
        { text: 'Uncited claims are stripped from drafts', rationale: 'Hallucination containment: if it can\'t cite a doc or past ticket, it doesn\'t appear.', by: 'u-asim', at: d(2) },
      ],
      blockers: [{ text: 'Zendesk sandbox access waiting on IT ticket', severity: 'medium', status: 'open', raisedAt: d(2), resolvedAt: null, resolution: null }],
      links: { repos: ['github.com/portswigger-internal/support-drafts'], files: ['Intent clusters (90d)', 'Baseline FRT analysis'], tools: ['Claude Sonnet via gateway', 'Zendesk API', 'Embeddings index'] },
      baseline: { metric: 'Median first-response time', value: 9.1, unit: 'hours', people: 9, quality: 'CSAT 4.31/5', costPerMonth: 0, basis: 'measured', basisNote: '90-day Zendesk export before sprint.' },
      final: null,
      retro: null,
    },
    {
      id: 'SPR-005', oppId: 'OPP-006', name: 'CV screening consistency aid', dept: 'People', classification: 'Confidential',
      startDate: d(18), endDate: f(3), status: 'active', phase: 'evaluation', createdAt: d(20),
      goal: 'Rubric-scored annotations on every application; humans review 100% of candidates. Mandatory bias evaluation before any launch.',
      stakeholders: [{ user: 'u-gugu', role: 'Product owner' }, { user: 'u-asim', role: 'Builder' }, { user: 'u-fran', role: 'Security reviewer' }, { user: 'u-lena', role: 'Legal reviewer' }],
      phases: {
        discovery: { items: [ck('Rubric formalised with hiring managers', 1), ck('Historical set: 300 anonymised CVs with human scores', 1)] },
        build: { items: [ck('Scoring prompt with rubric citations', 1), ck('PII redaction before logging', 1), ck('Reviewer UI: model notes are clearly labelled AI-generated', 1)] },
        evaluation: { items: [ck('Agreement with human scores (target ≥85% within ±1)', 1), ck('Bias eval: name/gender/university swap tests', 0), ck('Adverse-impact ratio across protected groups', 0)] },
        launch: { items: [ck('Gate: security + legal sign-off on eval evidence', 0)] },
        adoption: { items: [ck('Pilot on one live role with dual (human+AI) screening', 0)] },
        handover: { items: [ck('Quarterly bias re-test in runbook', 0)] },
      },
      decisions: [
        { text: 'Names, photos, addresses stripped before model sees CV', rationale: 'Reduce bias surface and PII exposure in one step.', by: 'u-fran', at: d(14) },
        { text: 'Launch blocked until bias eval passes', rationale: 'Employment decisions: adverse-impact ratio must exceed 0.8 on swap tests.', by: 'u-asim', at: d(12) },
      ],
      blockers: [{ text: 'Swap-test generation slower than planned — synthetic CV pairs need manual QA', severity: 'high', status: 'open', raisedAt: d(5), resolvedAt: null, resolution: null }],
      links: { repos: ['github.com/portswigger-internal/cv-screen'], files: ['Screening rubric v3', 'Bias eval design doc'], tools: ['Claude Sonnet via gateway', 'Greenhouse export'] },
      baseline: { metric: 'Screening hours per role', value: 16, unit: 'h/role', people: 3, quality: 'Inter-screener agreement 71%', costPerMonth: 0, basis: 'measured', basisNote: 'Last 4 researcher roles, timed.' },
      final: null,
      retro: null,
    },
  ];

  // ---- Adoption / handover tracker (live solutions) ---------------------------
  const rng = U.lcg(20260703);
  const solutions = [
    {
      id: 'SOL-001', sprintId: 'SPR-001', name: 'Research paper weekly digest', dept: 'Research', classification: 'Public',
      owner: 'u-marek', status: 'live', launchedAt: d(96),
      users: { eligible: 6, trained: 6, activeWeekly: 6 },
      usageWeekly: [4, 5, 6, 6, 5, 6, 6, 6, 6, 6, 5, 6],
      handover: [ck('Runbook complete', 1), ck('Named owner accepted', 1), ck('Alerts wired to #ai-ops', 1), ck('AI Pioneer off the critical path', 1)],
      runbook: 'Weekly cron Friday 07:00. On failure: rerun collector, check gateway status page. Escalate to #ai-ops after 2 failures.',
      healthNote: 'Stable. Cost £14/mo, ranking agreement re-checked monthly.',
    },
    {
      id: 'SOL-002', sprintId: 'SPR-002', name: 'Competitor content radar', dept: 'Marketing', classification: 'Public',
      owner: 'u-dev', status: 'live', launchedAt: d(52),
      users: { eligible: 5, trained: 4, activeWeekly: 4 },
      usageWeekly: [2, 3, 4, 4, 5, 4, 4, 4],
      handover: [ck('Runbook complete', 1), ck('Named owner accepted', 1), ck('Alerts wired', 1), ck('AI Pioneer off the critical path', 1)],
      runbook: 'n8n schedule Mon 06:00. Source list reviewed monthly by owner.',
      healthNote: 'One source flaky (site redesign) — alert raised, low impact.',
    },
    {
      id: 'SOL-003', sprintId: 'SPR-003', name: 'DSAR response drafting', dept: 'Legal', classification: 'Restricted',
      owner: 'u-lena', status: 'live', launchedAt: d(34),
      users: { eligible: 2, trained: 1, activeWeekly: 1 },
      usageWeekly: [1, 1, 2, 1, 1],
      handover: [ck('Runbook complete', 1), ck('Named owner accepted', 1), ck('Alerts wired', 1), ck('Second counsel trained', 0), ck('Quarterly redaction re-test scheduled', 0)],
      runbook: 'On-demand. Drafts auto-delete 30 days post-response. Redaction test set rerun quarterly (owner: Fran).',
      healthNote: 'Watch: completeness eval declined after CRM schema change — open alert and blocker.',
    },
  ];

  // ---- Responsible-AI use-case cards ------------------------------------------
  const aiCards = [
    {
      id: 'AIC-001', solutionId: 'SOL-001', name: 'Research paper weekly digest', dept: 'Research', owner: 'u-marek', reviewer: 'u-fran',
      classification: 'Public', riskTier: 'Low',
      intendedUse: 'Rank and summarise public research papers for internal researchers.',
      prohibitedUse: 'Publishing summaries externally without researcher review; any use on non-public documents.',
      dataSources: 'Public paper feeds (arXiv, conference sites). No personal or customer data.',
      oversight: 'Researcher reviews every digest before send.',
      limitations: 'Summaries can miss nuance in novel attack classes; ranking degrades on off-theme papers.',
      evalEvidence: '92% ranking agreement (n=60); factuality spot-checks monthly.',
      bias: 'Low stakes; theme list reviewed quarterly to avoid topic blind spots.',
      transparency: 'Digest footer states AI-assisted with reviewer name.',
      confidence: 'High confidence within security-paper domain; uncertainty flagged when relevance score < 0.6.',
      pauseConditions: 'Two consecutive digests with factual errors → pause and re-evaluate prompts.',
      reviews: { security: 'approved', privacy: 'not-required', legal: 'not-required' }, status: 'approved',
    },
    {
      id: 'AIC-002', solutionId: 'SOL-002', name: 'Competitor content radar', dept: 'Marketing', owner: 'u-dev', reviewer: 'u-fran',
      classification: 'Public', riskTier: 'Low',
      intendedUse: 'Detect and classify public competitor announcements into a weekly brief.',
      prohibitedUse: 'Scraping paywalled/ToS-restricted content; sentiment claims about competitors in external comms.',
      dataSources: 'Public competitor sites, RSS, newsletters.',
      oversight: 'Marketing reviews the brief; nothing is externally published.',
      limitations: 'Misses announcements made only on closed channels; classification ~95% precision.',
      bias: 'N/A — no people-related decisions.',
      evalEvidence: 'Precision 95% (n=40); parallel-run missed-item audit passed.',
      transparency: 'Brief labelled auto-generated with source links.',
      confidence: 'High for tracked sources; unknown-unknowns outside source list.',
      pauseConditions: 'Owner leaves or source list unreviewed > 2 months.',
      reviews: { security: 'approved', privacy: 'not-required', legal: 'approved' }, status: 'approved',
    },
    {
      id: 'AIC-003', solutionId: 'SOL-003', name: 'DSAR response drafting', dept: 'Legal', owner: 'u-lena', reviewer: 'u-fran',
      classification: 'Restricted', riskTier: 'High',
      intendedUse: 'Compile and draft responses to data subject access requests for counsel review.',
      prohibitedUse: 'Sending any response without counsel sign-off; use for non-DSAR data lookups about individuals.',
      dataSources: 'CRM, support and billing records for the named data subject only (scoped service account).',
      oversight: 'Counsel reviews and signs every response; edits are diffed and logged.',
      limitations: 'Completeness depends on system coverage — new data stores must be registered; drafts may over-include, redaction pass is mandatory.',
      bias: 'Consistency across requesters monitored; identical process regardless of requester.',
      evalEvidence: '0/40 redaction failures (adversarial set); completeness vs 6 historical DSARs. ⚠ Completeness score declined after CRM schema change — re-test open.',
      transparency: 'Responses state that automated tooling assisted compilation, per ICO guidance.',
      confidence: 'Medium — flag any DSAR touching systems added in the last quarter for manual compilation.',
      pauseConditions: 'Any redaction failure in production → immediate pause + incident. Completeness eval < 90% → pause.',
      reviews: { security: 'approved', privacy: 'approved', legal: 'approved' }, status: 'approved',
    },
    {
      id: 'AIC-004', solutionId: null, sprintId: 'SPR-005', name: 'CV screening consistency aid', dept: 'People', owner: 'u-gugu', reviewer: 'u-fran',
      classification: 'Confidential', riskTier: 'High',
      intendedUse: 'Annotate and rubric-score applications to support (not replace) human screening. Humans review 100% of candidates.',
      prohibitedUse: 'Automated rejection; ranking used as sole ordering for interview decisions; processing without candidate privacy notice.',
      dataSources: 'Applicant CVs (PII stripped of name/photo/address before model input).',
      oversight: 'Talent partner reviews every application; model notes labelled AI-generated in the UI.',
      limitations: 'Rubric agreement 87% within ±1 but unverified on non-traditional backgrounds; bias eval incomplete.',
      bias: 'MANDATORY GATE: name/gender/university swap tests + adverse-impact ratio ≥ 0.8 before launch. In progress.',
      evalEvidence: 'Human-agreement eval done (87%, n=300). Bias eval: in progress — launch blocked until complete.',
      transparency: 'Candidate privacy notice updated to disclose AI-assisted screening with human decision-making.',
      confidence: 'Not yet launch-ready. Confidence bounded by pending bias evidence.',
      pauseConditions: 'Adverse-impact ratio < 0.8 at any re-test → immediate pause. Any complaint → pause + review.',
      reviews: { security: 'pending', privacy: 'approved', legal: 'approved' }, status: 'launch-gated',
    },
    {
      id: 'AIC-005', solutionId: null, sprintId: 'SPR-004', name: 'Support reply drafting assistant', dept: 'Customer Support', owner: 'u-rosa', reviewer: 'u-fran',
      classification: 'Confidential', riskTier: 'Medium',
      intendedUse: 'Draft suggested replies with doc citations for agent review inside the ticket view.',
      prohibitedUse: 'Auto-sending replies; drafting on security-incident tickets (routed to humans only).',
      dataSources: 'Ticket text (customer identifiers pseudonymised), product docs, resolved tickets.',
      oversight: 'Agent edits and sends every reply; accept/edit/discard telemetry captured.',
      limitations: 'Weak on brand-new product features until docs land; uncited claims are stripped, which can leave gaps.',
      bias: 'Reply quality monitored across customer segments and languages.',
      evalEvidence: 'In build — blind agent rating (n=100) planned before pilot.',
      transparency: 'Internal only during pilot; policy decision pending on customer-facing disclosure.',
      confidence: 'Pre-evaluation. No production use yet.',
      pauseConditions: 'Pilot CSAT drops below baseline 4.31 → pause; any leaked identifier in a draft → incident + pause.',
      reviews: { security: 'pending', privacy: 'approved', legal: 'pending' }, status: 'in-review',
    },
  ];

  // ---- Asset library -----------------------------------------------------------
  const assets = [
    { id: 'AST-001', type: 'prompt', name: 'Ranked digest prompt (rank → summarise → cite)', tags: ['digest', 'ranking', 'citations'], sourceSprint: 'SPR-001', reuses: 3, createdAt: d(100), description: 'Two-stage prompt: cheap model ranks against a theme list, strong model summarises top-N with mandatory source links.', content: 'SYSTEM: You rank items against the THEMES list. Output JSON: [{id, score 0-1, reason}].\nRules: score < 0.6 = below the interest line; never invent items; reasons cite the theme matched.\n--- stage 2 ---\nSYSTEM: Summarise each top item in ≤80 words for a security researcher. Every claim must carry its source link. If unsure, say "unclear from abstract".' },
    { id: 'AST-002', type: 'workflow', name: 'Monitor → classify → weekly brief', tags: ['monitoring', 'n8n', 'brief'], sourceSprint: 'SPR-002', reuses: 2, createdAt: d(55), description: 'Reusable pipeline: source collector with change-detection dedupe, small-model classifier, templated weekly brief with links.', content: '1) Collect (RSS/scrape) → hash-dedupe vs last 90d\n2) Classify with Haiku (categories configurable)\n3) Render brief template, post to channel\n4) Failure → alert #ai-ops, retry x2 with backoff' },
    { id: 'AST-003', type: 'eval', name: 'Adversarial redaction test set (40 cases)', tags: ['redaction', 'privacy', 'safety'], sourceSprint: 'SPR-003', reuses: 1, createdAt: d(40), description: 'Hand-built adversarial samples that try to smuggle personal data past redaction: nicknames, initials, addresses in free text, base64 fragments. Pass = 0 leaks.', content: 'Categories: direct identifiers (10), indirect combos (10), obfuscated (10), third-party data (10). Score: leak count. Gate: must be 0.' },
    { id: 'AST-004', type: 'prompt', name: 'Cited-reply drafting prompt', tags: ['support', 'citations', 'hallucination-control'], sourceSprint: 'SPR-004', reuses: 1, createdAt: d(3), description: 'Reply drafter where any sentence without a retrievable citation is deleted before display.', content: 'SYSTEM: Draft a reply using ONLY the provided doc extracts and past tickets. Tag each sentence with its source id. Untagged sentences are removed by post-processing — do not rely on general knowledge.' },
    { id: 'AST-005', type: 'agent', name: 'Clarifier — intake question generator', tags: ['triage', 'intake'], sourceSprint: null, reuses: 6, createdAt: d(90), description: 'Given a raw request, proposes 2–3 clarifying questions (data sensitivity, current process, success measure). Output is labelled AI-generated and must be reviewed before sending.', content: 'Ask only what changes the assessment: data classification, volume/frequency, who decides today, what "good" looks like. Never ask more than 3 questions.' },
    { id: 'AST-006', type: 'eval', name: 'Human-agreement eval harness', tags: ['agreement', 'rubric'], sourceSprint: 'SPR-005', reuses: 2, createdAt: d(15), description: 'Compares model rubric scores to historical human scores; reports % within ±1 and largest disagreements for review.', content: 'Input: {item, human_score, model_score}. Output: agreement %, confusion buckets, top-10 disagreements with rationale for human review.' },
    { id: 'AST-007', type: 'lesson', name: 'Deterministic beats model for redaction', tags: ['privacy', 'architecture'], sourceSprint: 'SPR-003', reuses: 0, createdAt: d(36), description: 'Model-only redaction failed 2/40 adversarial cases. Regex + entity lists are auditable and testable — use the model to propose, code to enforce.', content: 'Rule of thumb: anything with a compliance gate needs a deterministic, testable enforcement layer. The model can assist upstream but must not be the last line of defence.' },
    { id: 'AST-008', type: 'lesson', name: 'The eval set is the product', tags: ['evaluation', 'process'], sourceSprint: 'SPR-001', reuses: 0, createdAt: d(95), description: 'Every regression since launch was caught by the 60-paper eval set, not by users. Budget eval-set building into discovery, not evaluation week.', content: 'Build the ground-truth set in week 1 with the domain expert. It de-risks the build and becomes the regression suite forever.' },
    { id: 'AST-009', type: 'workflow', name: 'Two-week AI sprint template', tags: ['process', 'template'], sourceSprint: null, reuses: 5, createdAt: d(110), description: 'Default checklist skeleton: discovery (days 1–3), build (4–8), evaluation (9–10), launch/adoption/handover tracked post-sprint.', content: 'D1-3 discovery: shadow users, ground truth, baseline metrics. D4-8 build: thin slice first, observability from day one. D9-10 eval: pre-registered thresholds. Launch only through the risk gate.' },
    { id: 'AST-010', type: 'prompt', name: 'PII strip pre-processor spec', tags: ['privacy', 'preprocessing'], sourceSprint: 'SPR-005', reuses: 1, createdAt: d(14), description: 'Spec for stripping name/photo/address/contact fields before model input; pairs with logging redaction.', content: 'Strip: names (NER + list), emails, phones, addresses, photos, links to profiles. Replace with typed placeholders {CANDIDATE}, {EMAIL}. Log only the placeholder form.' },
    { id: 'AST-011', type: 'agent', name: 'Report drafter (leadership summary)', tags: ['reporting'], sourceSprint: null, reuses: 4, createdAt: d(70), description: 'Drafts the monthly leadership narrative from portfolio data. Output is always labelled AI-generated and requires Pioneer review before sharing.', content: 'Structure: shipped / in flight / gated / impact (measured vs projected, state assumptions) / risks / asks. Never present projected numbers as measured.' },
    { id: 'AST-012', type: 'lesson', name: 'Pseudonymise before prompt, not after', tags: ['privacy', 'support'], sourceSprint: 'SPR-004', reuses: 0, createdAt: d(2), description: 'Customer identifiers swapped for tokens before the model call keeps the entire downstream trace (logs, evals, replays) clean by construction.', content: 'Do privacy transforms at the boundary. Everything inside the boundary is then safe to log, replay and evaluate.' },
  ];

  // ---- Tool & model radar --------------------------------------------------------
  const radar = [
    { id: 'RAD-001', name: 'Claude Sonnet (via gateway)', category: 'model', ring: 'adopt', supplier: 'Anthropic', movedAt: d(90), notes: 'Default for drafting/summarisation quality tiers.', dpa: 'signed', residency: 'US/EU (zero retention)', risk: 'Low', reviewStatus: 'approved' },
    { id: 'RAD-002', name: 'Claude Haiku (via gateway)', category: 'model', ring: 'adopt', supplier: 'Anthropic', movedAt: d(90), notes: 'High-volume classification and ranking. ~10x cheaper.', dpa: 'signed', residency: 'US/EU (zero retention)', risk: 'Low', reviewStatus: 'approved' },
    { id: 'RAD-003', name: 'LiteLLM gateway (self-hosted)', category: 'platform', ring: 'adopt', supplier: 'Self-hosted (OSS)', movedAt: d(85), notes: 'Single egress point: keys, logging, budgets, model routing. All AI traffic goes through it.', dpa: 'n/a (self-hosted)', residency: 'On-prem', risk: 'Low', reviewStatus: 'approved' },
    { id: 'RAD-004', name: 'n8n (self-hosted)', category: 'tool', ring: 'adopt', supplier: 'Self-hosted (OSS)', movedAt: d(60), notes: 'Scheduling and glue for monitor/digest workflows.', dpa: 'n/a (self-hosted)', residency: 'On-prem', risk: 'Low', reviewStatus: 'approved' },
    { id: 'RAD-005', name: 'Promptfoo', category: 'tool', ring: 'adopt', supplier: 'OSS', movedAt: d(50), notes: 'Eval harness for regression suites; wired into CI for prompt changes.', dpa: 'n/a', residency: 'Local', risk: 'Low', reviewStatus: 'approved' },
    { id: 'RAD-006', name: 'GPT-5.x (via gateway)', category: 'model', ring: 'trial', supplier: 'OpenAI', movedAt: d(30), notes: 'Second-opinion model for eval cross-checks; not yet approved for Restricted data.', dpa: 'signed', residency: 'US', risk: 'Medium', reviewStatus: 'in-review' },
    { id: 'RAD-007', name: 'Local Llama (Ollama)', category: 'model', ring: 'trial', supplier: 'Self-hosted (Meta OSS)', movedAt: d(25), notes: 'Trialling for Restricted-data workloads that must never leave the network.', dpa: 'n/a (self-hosted)', residency: 'On-prem', risk: 'Low', reviewStatus: 'in-review' },
    { id: 'RAD-008', name: 'Whisper transcription (self-hosted)', category: 'model', ring: 'trial', supplier: 'Self-hosted (OpenAI OSS)', movedAt: d(20), notes: 'Meeting/debrief transcription behind consent controls.', dpa: 'n/a (self-hosted)', residency: 'On-prem', risk: 'Medium', reviewStatus: 'in-review' },
    { id: 'RAD-009', name: 'Embeddings service (voyage-class)', category: 'model', ring: 'assess', supplier: 'TBD', movedAt: d(15), notes: 'Comparing retrieval quality vs current index for support drafting.', dpa: 'not-signed', residency: 'TBD', risk: 'Medium', reviewStatus: 'not-started' },
    { id: 'RAD-010', name: 'Agent framework (LangGraph-class)', category: 'platform', ring: 'assess', supplier: 'OSS', movedAt: d(12), notes: 'Assessing for multi-step workflows; current needs met by simpler pipelines.', dpa: 'n/a', residency: 'Local', risk: 'Low', reviewStatus: 'not-started' },
    { id: 'RAD-011', name: 'Vendor "AI addon" in Zendesk', category: 'tool', ring: 'hold', supplier: 'Zendesk', movedAt: d(40), notes: 'Hold: data-sharing terms route ticket content to third-party training by default. Revisit if terms change.', dpa: 'declined', residency: 'US', risk: 'High', reviewStatus: 'rejected' },
    { id: 'RAD-012', name: 'Notion AI for company wiki', category: 'tool', ring: 'hold', supplier: 'Notion', movedAt: d(45), notes: 'Hold: wiki contains Restricted research content; supplier review not passed for that classification.', dpa: 'signed (general)', residency: 'US', risk: 'High', reviewStatus: 'rejected' },
    { id: 'RAD-013', name: 'Browser-agent tooling', category: 'platform', ring: 'assess', supplier: 'Various', movedAt: d(8), notes: 'Watching for QA/testing automation use cases; security review of agent egress needed first.', dpa: 'n/a', residency: 'Local', risk: 'Medium', reviewStatus: 'not-started' },
  ];

  // ---- Observability: execution logs (generated, deterministic) -------------------
  const MODELS = { 'SOL-001': ['haiku-4.5', 'sonnet-5'], 'SOL-002': ['haiku-4.5'], 'SOL-003': ['sonnet-5'], 'SPR-004': ['sonnet-5'], 'SPR-005': ['sonnet-5'] };
  const PROMPTVER = { 'SOL-001': 'digest-v3.2', 'SOL-002': 'radar-v2.1', 'SOL-003': 'dsar-v4.0', 'SPR-004': 'draft-v2.3', 'SPR-005': 'screen-v1.8' };
  const SOLNAMES = { 'SOL-001': 'Paper digest', 'SOL-002': 'Content radar', 'SOL-003': 'DSAR drafter', 'SPR-004': 'Support drafts (pilot)', 'SPR-005': 'CV screen (eval)' };
  const execLogs = [];
  let logSeq = 1;
  const solKeys = Object.keys(MODELS);
  for (let day = 13; day >= 0; day--) {
    for (const sk of solKeys) {
      const runs = sk === 'SOL-001' ? (day % 7 === 4 ? 2 : 0) : sk === 'SOL-002' ? (day % 7 === 0 ? 2 : 0) : sk === 'SOL-003' ? (rng() < 0.25 ? 1 : 0) : Math.floor(rng() * 7) + 3;
      for (let i = 0; i < runs; i++) {
        const models = MODELS[sk];
        const model = models[Math.floor(rng() * models.length)];
        const fail = rng() < (sk === 'SOL-003' ? 0.11 : 0.05);
        const retried = fail && rng() < 0.7;
        const tin = Math.round(800 + rng() * (model === 'sonnet-5' ? 9000 : 3000));
        const tout = Math.round(150 + rng() * (model === 'sonnet-5' ? 1800 : 500));
        const price = model === 'sonnet-5' ? { i: 3, o: 15 } : { i: 0.8, o: 4 };
        const cost = (tin / 1e6) * price.i + (tout / 1e6) * price.o;
        const override = !fail && rng() < (sk === 'SPR-005' ? 0.18 : 0.07);
        execLogs.push({
          id: 'LOG-' + String(logSeq++).padStart(4, '0'),
          ts: d(day).slice(0, 11) + String(8 + Math.floor(rng() * 10)).padStart(2, '0') + ':' + String(Math.floor(rng() * 60)).padStart(2, '0') + ':00.000Z',
          solution: sk, solutionName: SOLNAMES[sk], model: model, promptVersion: PROMPTVER[sk],
          tokensIn: tin, tokensOut: tout, latencyMs: Math.round(400 + rng() * (model === 'sonnet-5' ? 5200 : 1400)),
          costUsd: Math.round(cost * 10000) / 10000,
          status: fail ? (retried ? 'retried' : 'failure') : 'success',
          retries: retried ? 1 + Math.floor(rng() * 2) : 0,
          override: override,
          overrideNote: override ? (sk === 'SPR-005' ? 'Reviewer adjusted rubric score with rationale' : 'Human edited output before use') : null,
          evalScore: fail ? null : Math.round((3.4 + rng() * 1.6 - (sk === 'SOL-003' && day < 4 ? 0.9 : 0)) * 10) / 10,
          actor: fail ? 'system' : ['u-marek', 'u-dev', 'u-lena', 'u-rosa', 'u-gugu'][Math.floor(rng() * 5)],
        });
      }
    }
  }
  execLogs.reverse(); // newest first

  // ---- Alerts, incidents, secrets ----------------------------------------------
  const alerts = [
    { id: 'ALR-001', ts: d(2), severity: 'high', solution: 'SOL-003', solutionName: 'DSAR drafter', message: 'Completeness eval score declined below 4.0 threshold (3.6 rolling avg) after CRM schema change.', status: 'open', kind: 'declining-performance' },
    { id: 'ALR-002', ts: d(1), severity: 'medium', solution: 'SOL-002', solutionName: 'Content radar', message: 'Source "competitor-blog-7" failing to parse for 6 days (site redesign).', status: 'acknowledged', kind: 'failure' },
    { id: 'ALR-003', ts: d(4), severity: 'medium', solution: 'SPR-004', solutionName: 'Support drafts (pilot)', message: 'Retry rate 9% over 24h — above 5% budget. Gateway timeouts suspected.', status: 'resolved', kind: 'failure', resolvedAt: d(3) },
    { id: 'ALR-004', ts: d(6), severity: 'low', solution: 'SPR-005', solutionName: 'CV screen (eval)', message: 'Human override rate 18% — expected during evaluation phase, tracking for post-launch baseline.', status: 'acknowledged', kind: 'unusual-behaviour' },
    { id: 'ALR-005', ts: d(9), severity: 'critical', solution: 'SOL-003', solutionName: 'DSAR drafter', message: 'Single run attempted to include an unregistered data source (new billing table). Blocked by allowlist.', status: 'resolved', kind: 'unusual-behaviour', resolvedAt: d(8) },
  ];

  const incidents = [
    {
      id: 'INC-001', ts: d(9), title: 'DSAR drafter reached for unregistered billing table', severity: 'high', solution: 'SOL-003',
      status: 'closed', owner: 'u-fran', closedAt: d(7),
      summary: 'Retrieval layer attempted to query a newly-created billing table not on the DSAR source allowlist. The allowlist denied it (fail-closed) and alerted. No data accessed.',
      timeline: [
        { at: d(9), text: 'Allowlist denial alert fired (ALR-005).', by: 'system' },
        { at: d(9), text: 'Confirmed fail-closed behaviour; no data exposure.', by: 'u-fran' },
        { at: d(8), text: 'Decision: new data stores require registration review before DSAR inclusion.', by: 'u-lena' },
        { at: d(7), text: 'Closed. Action: schema-change webhook now notifies #ai-ops.', by: 'u-fran' },
      ],
    },
    {
      id: 'INC-002', ts: d(21), title: 'Support draft contained stale pricing from outdated doc', severity: 'medium', solution: 'SPR-004',
      status: 'closed', owner: 'u-asim', closedAt: d(19),
      summary: 'During internal testing, a draft cited a deprecated pricing page. Agent caught it in review (control worked). Root cause: retrieval index included archived docs.',
      timeline: [
        { at: d(21), text: 'Tester flagged stale pricing in a draft.', by: 'u-rosa' },
        { at: d(20), text: 'Archived docs excluded from index; freshness metadata added to citations.', by: 'u-asim' },
        { at: d(19), text: 'Closed. Eval case added to regression set.', by: 'u-asim' },
      ],
    },
    {
      id: 'INC-003', ts: d(1), title: 'Investigating: completeness drift on DSAR drafter', severity: 'high', solution: 'SOL-003',
      status: 'open', owner: 'u-fran', closedAt: null,
      summary: 'Rolling completeness eval fell from 4.4 to 3.6 after a CRM schema migration renamed two fields. DSAR processing moved to manual compilation while retrieval mapping is fixed (pause condition applied).',
      timeline: [
        { at: d(2), text: 'ALR-001 fired on eval decline.', by: 'system' },
        { at: d(1), text: 'Pause condition invoked: DSARs manual until eval ≥ 4.2 again.', by: 'u-lena' },
      ],
    },
  ];

  const secrets = [
    { id: 'SEC-001', name: 'gateway-admin-token', scope: 'LiteLLM gateway admin', ownerRole: 'AI Pioneer', storedIn: 'Vault: kv/ai/gateway', lastRotated: d(28), rotationDays: 90 },
    { id: 'SEC-002', name: 'anthropic-api-key-prod', scope: 'Gateway → Anthropic (prod budget)', ownerRole: 'AI Pioneer', storedIn: 'Vault: kv/ai/providers', lastRotated: d(28), rotationDays: 90 },
    { id: 'SEC-003', name: 'zendesk-service-account', scope: 'Support drafts: read tickets, write draft field only', ownerRole: 'Head of Support', storedIn: 'Vault: kv/ai/zendesk', lastRotated: d(95), rotationDays: 90 },
    { id: 'SEC-004', name: 'crm-readonly-dsar', scope: 'DSAR drafter: scoped read-only CRM access', ownerRole: 'Security Reviewer', storedIn: 'Vault: kv/ai/crm', lastRotated: d(12), rotationDays: 60 },
    { id: 'SEC-005', name: 'greenhouse-export-key', scope: 'CV screening: application export (eval only)', ownerRole: 'Talent Partner', storedIn: 'Vault: kv/ai/greenhouse', lastRotated: d(18), rotationDays: 60 },
    { id: 'SEC-006', name: 'n8n-webhook-signing', scope: 'Workflow webhook signatures', ownerRole: 'AI Pioneer', storedIn: 'Vault: kv/ai/n8n', lastRotated: d(50), rotationDays: 180 },
  ];

  // ---- Assumptions used by impact calculations (exposed in UI) --------------------
  const assumptions = {
    hourlyRate: 38, hourlyRateNote: 'Blended fully-loaded cost per employee-hour (finance-agreed, reviewed quarterly).',
    workWeeksPerYear: 46, workWeeksNote: '52 minus holiday/leave allowance.',
    fxUsdGbp: 0.79, fxNote: 'Provider billing is USD; converted at finance month-end rate.',
    adoptionHaircut: 0.8, adoptionNote: 'Projected savings are discounted 20% for partial adoption unless measured adoption says otherwise.',
  };

  // ---- Seed audit trail ------------------------------------------------------------
  const audit = [
    { id: 'AUD-0001', ts: d(30), actor: 'u-fran', role: 'security', action: 'approval.granted', entity: 'opportunities', entityId: 'OPP-007', detail: 'Security gate approved: zero-retention gateway only.' },
    { id: 'AUD-0002', ts: d(29), actor: 'u-lena', role: 'employee', action: 'approval.granted', entity: 'opportunities', entityId: 'OPP-007', detail: 'Legal gate approved.' },
    { id: 'AUD-0003', ts: d(6), actor: 'u-fran', role: 'security', action: 'approval.granted', entity: 'opportunities', entityId: 'OPP-009', detail: 'Security gate approved: gateway-only, 30-day retention cap.' },
    { id: 'AUD-0004', ts: d(4), actor: 'u-asim', role: 'pioneer', action: 'sprint.decision', entity: 'sprints', entityId: 'SPR-004', detail: 'Decision recorded: drafts never auto-send.' },
    { id: 'AUD-0005', ts: d(2), actor: 'system', role: 'system', action: 'alert.raised', entity: 'alerts', entityId: 'ALR-001', detail: 'Eval decline on DSAR drafter.' },
    { id: 'AUD-0006', ts: d(1), actor: 'u-lena', role: 'employee', action: 'solution.paused', entity: 'solutions', entityId: 'SOL-003', detail: 'Pause condition invoked — DSARs manual until eval recovers.' },
  ];

  window.SEED = {
    version: SEED_VERSION,
    users, requests, opportunities, sprints, solutions, aiCards, assets, radar,
    execLogs, alerts, incidents, secrets, assumptions, audit,
  };
  window.ROLES = ROLES;
  window.DEPTS = DEPTS;
  window.PHASES = PHASES;
})();
