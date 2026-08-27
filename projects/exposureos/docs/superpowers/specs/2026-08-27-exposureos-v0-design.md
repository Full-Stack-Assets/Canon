# ExposureOS v0 Design

## Objective
Build a mobile-first, multi-tenant pre-release SaaS for HVAC, plumbing, roofing, and electrical businesses that turns public website signals and first-party lead/customer records into prioritized exposure fixes, governed follow-up, legitimate review workflows, and a revenue ledger.

## Product promise
Increase discovery, reduce lead leakage, improve review operations, and make commercial outcomes measurable without inventing attribution.

## Irreducible surfaces
1. **Exposure Scan**: accepts business name, website URL, and location; inspects only permitted public website signals such as title/meta, structured data, robots/sitemap discoverability, contact paths, service/location language, and basic technical signals. Every finding records evidence and confidence. No Google scraping and no invented external-business facts.
2. **Business Intelligence Profile**: tenant-owned canonical record for services, locations, business hours, approved claims, contact methods, differentiators, FAQs, brand voice, and compliance settings.
3. **Lead Inbox**: first-party lead records with source, status, value estimate, response time, owner, and next action. Initial ingestion supports manual/demo creation plus adapter-ready interfaces.
4. **Governed Follow-up**: generates drafts and schedules from approved templates/rules. Sending remains disabled until account policy and provider credentials allow it. State model: generated -> reviewed -> approved -> executed -> verified.
5. **Reputation Engine**: creates review-request actions only for legitimate customer records. No fake reviews, review suppression, or sentiment-gated solicitation.
6. **Exposure Action Queue**: converts scanner/profile gaps into proposed actions with expected effect, evidence, approval state, execution receipt, and verification state.
7. **Revenue Ledger**: tracks detected opportunity, pipeline, booked, and realized revenue separately. Attribution confidence is explicit.

## Users and tenancy
A user belongs to one or more organizations. Every business profile, scan, lead, customer, action, review request, revenue event, and audit record is organization-scoped. The application must never fetch tenant data by unscoped primary key.

## Core data entities
- Organization
- User / Membership
- BusinessProfile
- ExposureScan / ExposureFinding / EvidenceRecord
- Lead / Customer
- FollowUpAction
- ReviewRequest
- ExposureAction
- RevenueEvent
- AuditReceipt
- IntegrationConnection

## State machines
### Follow-up and exposure actions
`PROPOSED -> APPROVED -> EXECUTING -> EXECUTED -> VERIFIED`
Alternative terminal states: `REJECTED`, `FAILED`, `CANCELLED`.
No transition may skip approval when the action has external side effects.

### Revenue events
`DETECTED -> PIPELINE -> BOOKED -> REALIZED` with corrections represented as new events rather than destructive rewriting of historical receipts.

## Experience
### Public scanner
The landing page leads with a free Exposure Scan. The report shows an overall score plus Visibility, Trust, Conversion, Review Readiness, and AI/Structured-Data Readiness dimensions. Where data is not available, the UI says `Not observed` rather than estimating silently.

### Workspace
The authenticated workspace opens on a prioritized operator dashboard: biggest exposure leak, unanswered/aging leads, pending approvals, review actions, attributable pipeline, and realized revenue.

### Mobile
All core workflows must work in iPhone Safari. Primary actions remain reachable without horizontal scrolling or desktop-only hover interactions.

## Revenue surface
Show target pricing for pre-release validation:
- Core: $299/location/month
- Growth: $599/location/month
- Agency: from $1,499/month, quote based

Until Human Authority approves billing activation, checkout buttons must use a non-charging `Request activation` or equivalent path and clearly identify the product as private beta/pre-release.

## Marketing product loop
The scanner is also the acquisition engine. Reports must be shareable without exposing private tenant data. The architecture should support future benchmark aggregation only from explicitly non-sensitive, eligible data with minimum cohort thresholds.

## Security and governance
- Organization scoping on every database query.
- Server-side authorization for mutations.
- Secret values never returned to the browser after storage.
- Audit receipts for consequential mutations.
- Demo/synthetic records are tagged and visually labeled.
- No fabricated reviews, testimonials, revenue, customers, or external actions.
- External side effects remain fail-closed when provider credentials are absent.

## Error handling
Website scan failures return a partial report with per-check error evidence rather than a fabricated score. Invalid/unsafe URLs are rejected. External adapters expose retryable vs terminal failures. State transitions are idempotent.

## Verification
Automated tests must cover scanner scoring determinism, URL validation, tenant isolation, state-transition guards, demo-data labeling, review-request eligibility, and revenue-stage separation. A seeded demo workspace demonstrates the full workflow without pretending the events are real.

## Release posture
The staging build may be runnable and shareable for internal review, but must remain explicitly pre-release. Canon policy POL-REV-001 remains authoritative for any commercial release claim; a cleared payment or executed payable commitment is required for `continuous_demand_validation` PASS.
