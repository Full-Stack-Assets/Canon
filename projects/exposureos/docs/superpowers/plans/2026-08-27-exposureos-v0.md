# ExposureOS v0 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Deliver a verified, mobile-first, multi-tenant ExposureOS pre-release with a public website Exposure Scan, operator workspace, governed actions, review workflows, Revenue Ledger, demo environment, and payment-ready pricing surface.

**Architecture:** A TypeScript React web application backed by a server API and PostgreSQL. Domain services own scanner scoring, tenant authorization, state transitions, review eligibility, and revenue-event semantics. Side-effect adapters are fail-closed and disabled without explicit credentials/policy.

**Tech Stack:** TypeScript, React, Node.js server/API, PostgreSQL, schema-validated API contracts, Vitest or equivalent TypeScript test runner, responsive CSS, npm scripts for test/build.

**Spec:** `projects/exposureos/docs/superpowers/specs/2026-08-27-exposureos-v0-design.md`

## Global Constraints
- Initial verticals: HVAC, plumbing, roofing, electrical.
- Core target price: $299/location/month; Growth: $599/location/month; Agency: from $1,499/month.
- Billing is non-charging until Human Authority explicitly activates it.
- Demo/synthetic records must be tagged and visibly labeled.
- No fabricated reviews, testimonials, customers, revenue, or attribution.
- Review requests may only be created for legitimate customer records and may not use sentiment gating.
- External side effects use `PROPOSED -> APPROVED -> EXECUTING -> EXECUTED -> VERIFIED`; no approval skipping.
- All tenant data access is organization-scoped server-side.
- Revenue stages remain distinct: `DETECTED`, `PIPELINE`, `BOOKED`, `REALIZED`.
- Mobile workflows must function in iPhone Safari.
- The build remains pre-release until Canon POL-REV-001 passes or a specific Human Authority exception is recorded.

---

### Task 1: Application shell, persistence, and tenancy

**Files:**
- Create: `src/shared/domain.ts`
- Create: `src/server/db/schema.ts`
- Create: `src/server/auth/authorize.ts`
- Create: `src/server/audit/receipts.ts`
- Create: `src/client/app/*`
- Test: `src/server/auth/authorize.test.ts`

**Interfaces:**
- Produces organization-scoped repositories and `requireOrgAccess(userId, organizationId)`.
- Produces append-only `recordAuditReceipt(input)`.

- [ ] Write a failing tenant-isolation test proving a user cannot read or mutate records outside membership scope.
- [ ] Run the focused test and confirm it fails.
- [ ] Implement schema, membership authorization, app shell, and audit receipt primitive.
- [ ] Run focused tests, then `npm test`.
- [ ] Commit the independently working tenant shell.

### Task 2: Business Intelligence Profile

**Files:**
- Create: `src/server/business-profile/service.ts`
- Create: `src/client/business-profile/*`
- Test: `src/server/business-profile/service.test.ts`

**Interfaces:**
- Consumes organization authorization.
- Produces canonical profile fields: business name, website, locations, services, hours, approved claims, FAQs, differentiators, brand voice, contact methods.

- [ ] Write failing create/update/read tests including organization scoping.
- [ ] Run focused tests and confirm failure.
- [ ] Implement validated profile service and mobile editing UI.
- [ ] Verify audit receipts are created for mutations.
- [ ] Run `npm test` and commit.

### Task 3: Public Exposure Scanner

**Files:**
- Create: `src/server/scanner/url-policy.ts`
- Create: `src/server/scanner/fetch-site.ts`
- Create: `src/server/scanner/checks.ts`
- Create: `src/server/scanner/score.ts`
- Create: `src/client/scanner/*`
- Test: `src/server/scanner/score.test.ts`
- Test: `src/server/scanner/url-policy.test.ts`

**Interfaces:**
- Produces `ExposureScan` with evidence-linked findings and dimension scores.
- Consumes only permitted website/public-page signals; does not scrape Google or invent unavailable business facts.

- [ ] Write failing tests for deterministic scoring and rejection of localhost/private-network/unsafe targets.
- [ ] Run focused tests and confirm failure.
- [ ] Implement normalized URL validation, safe server-side fetch with time/size limits, HTML signal extraction, finding evidence, and scoring.
- [ ] Build public scan form/report UI with `Not observed` for unavailable signals and partial-report handling for failed checks.
- [ ] Run scanner tests, full tests, and commit.

### Task 4: Lead Inbox and pipeline

**Files:**
- Create: `src/server/leads/service.ts`
- Create: `src/client/leads/*`
- Test: `src/server/leads/service.test.ts`

**Interfaces:**
- Produces lead CRUD plus statuses, owner, source, estimated value, response timestamp, next action, and demo flag.

- [ ] Write failing tests for organization scoping, lead status transitions, and demo labeling.
- [ ] Implement lead service and mobile inbox.
- [ ] Add aging/unanswered prioritization without inventing outcomes.
- [ ] Run tests and commit.

### Task 5: Governed follow-up actions

**Files:**
- Create: `src/server/actions/state-machine.ts`
- Create: `src/server/follow-up/service.ts`
- Create: `src/client/approvals/*`
- Test: `src/server/actions/state-machine.test.ts`

**Interfaces:**
- Produces guarded transitions `PROPOSED -> APPROVED -> EXECUTING -> EXECUTED -> VERIFIED` plus `REJECTED`, `FAILED`, `CANCELLED`.
- External sending adapter is disabled by default and fails closed when credentials/policy are absent.

- [ ] Write failing tests showing `PROPOSED -> EXECUTED` and unapproved side effects are rejected.
- [ ] Implement transition guard and draft follow-up generation.
- [ ] Add approval queue UI and explicit non-sending pre-release state.
- [ ] Verify idempotent transitions and audit receipts.
- [ ] Run tests and commit.

### Task 6: Reputation Engine

**Files:**
- Create: `src/server/reputation/service.ts`
- Create: `src/client/reputation/*`
- Test: `src/server/reputation/service.test.ts`

**Interfaces:**
- Creates review-request actions only for eligible legitimate customer records.

- [ ] Write failing tests that reject demo-only/non-customer records and any sentiment-gated branch.
- [ ] Implement customer completion record, neutral review-request draft, approval state, and audit receipt.
- [ ] Add mobile reputation queue showing eligibility evidence.
- [ ] Run tests and commit.

### Task 7: Exposure Action Queue

**Files:**
- Create: `src/server/exposure-actions/service.ts`
- Create: `src/client/exposure-actions/*`
- Test: `src/server/exposure-actions/service.test.ts`

**Interfaces:**
- Converts scanner/profile gaps into proposed actions with evidence, expected effect, confidence, state, and receipt references.

- [ ] Write failing tests for finding-to-action conversion and transition guards.
- [ ] Implement action generation and approval workflow.
- [ ] Add `verify` step requiring new evidence rather than self-attestation.
- [ ] Run tests and commit.

### Task 8: Revenue Ledger and operator dashboard

**Files:**
- Create: `src/server/revenue/ledger.ts`
- Create: `src/client/revenue/*`
- Create: `src/client/dashboard/*`
- Test: `src/server/revenue/ledger.test.ts`

**Interfaces:**
- Produces append-oriented revenue events whose stages are distinct and whose attribution carries source and confidence.

- [ ] Write failing tests preventing a `PIPELINE` event from being counted as `REALIZED` revenue.
- [ ] Implement ledger aggregation by stage, source, and confidence.
- [ ] Build dashboard cards for largest exposure leak, aging leads, pending approvals, review actions, pipeline, and realized revenue.
- [ ] Keep demo totals labeled `Demo` and excluded from real totals.
- [ ] Run tests and commit.

### Task 9: Pricing, activation request, seeded demo, and legal/operational basics

**Files:**
- Create: `src/client/pricing/*`
- Create: `src/server/activation/service.ts`
- Create: `src/server/demo/seed.ts`
- Create: `src/client/legal/*`
- Test: `src/server/demo/seed.test.ts`

**Interfaces:**
- Shows target plans but does not charge.
- Produces a non-charging activation request record.

- [ ] Write failing test proving activation requests do not produce payment state.
- [ ] Implement Core $299, Growth $599, Agency from $1,499 pricing display and `Request activation` flow.
- [ ] Seed a fully labeled demo HVAC workspace exercising scanner, lead, action, review, and ledger paths.
- [ ] Add privacy/terms/support placeholders clearly marked for legal review rather than represented as legal approval.
- [ ] Run tests and commit.

### Task 10: Verification and staging deployment

**Files:**
- Create: `docs/verification-v0.md`
- Create: `.aoc/revenue-ready-release.json`
- Modify: package scripts as required for deterministic `test` and `build`.

**Interfaces:**
- Produces reproducible test/build evidence and a truthful revenue-readiness result.

- [ ] Run `npm test` and capture exact pass/fail counts.
- [ ] Run `npm run build` and confirm production bundle succeeds.
- [ ] Verify public scanner, demo workspace, mobile viewport, tenant boundary, approval guard, review eligibility, and revenue-stage separation.
- [ ] Deploy only to private/staging preview under the authority recorded in `WORK-ITEM.yaml`.
- [ ] Populate `.aoc/revenue-ready-release.json`; mark unmet real-payment and other evidence criteria `BLOCKED`, never inferred PASS.
- [ ] Record staging URL, verification evidence, known blockers, and next release gate in Canon.

## Self-review
- Spec coverage: all seven irreducible product surfaces, tenancy, governance, revenue surface, mobile, and staging are mapped to tasks.
- Placeholder scan: there are no implementation TODO/TBD requirements; legal text is intentionally identified as requiring legal review and therefore cannot be mistaken for approved legal work.
- Type/state consistency: action and revenue state names match the design spec and Work Item.
