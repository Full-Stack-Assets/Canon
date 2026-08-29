# ProductWeld.tech v2 Design Specification

**Status:** Design approved by Human Authority; implementation not yet authorized by this document alone  
**Date:** 2026-08-27  
**Project:** ProductWeld.tech v2  
**Canonical role:** Public institutional presentation and intake surface for ProductWeld  
**Primary positioning:** Technology holding company  
**Primary operating model:** Build · Operate · Acquire  

## 1. Purpose

ProductWeld.tech v2 will replace the current portfolio-style experience with the institutional front door of a technology holding company that builds software and operating systems, operates digital ventures, and acquires durable technology-enabled businesses.

The public site must establish credibility with four audiences without becoming a generic agency site:

1. brokers, sellers, and capital partners;
2. customers and commercial partners;
3. technical partners and collaborators;
4. visitors evaluating ProductWeld's operating and execution capability.

The central public statement is:

> ProductWeld builds, operates, and acquires technology-enabled businesses.

The site must communicate ownership, operation, underwriting discipline, and execution evidence rather than generic AI-service claims.

## 2. Product principles

1. **Evidence before assertion.** Public claims must be backed by approved evidence such as live deployments, screenshots, verified workflows, operating receipts, benchmarks, or validated product state.
2. **Institutional over promotional.** ProductWeld should look like an owner-operator and holding company, not a lead-hungry digital agency.
3. **Balanced front door.** Build, Operate, and Acquire receive equal first-order prominence.
4. **Acquisition sophistication without undercapitalization signaling.** Public copy must use transaction-specific, institutional capital language and must not advertise a "$0 personal cash" acquisition strategy.
5. **Public site is not Canon.** ProductWeld.tech is a presentation and intake surface. Canon remains authoritative for policy, authority, approved project state, evidence, and receipts.
6. **Fail closed on unsupported claims.** Experimental or aspirational projects may not appear as production assets unless evidence supports the status shown.
7. **Mobile-first, accessible, fast.** iPhone Safari is a critical verification surface.

## 3. Information architecture

Primary navigation:

- Home
- Build
- Operate
- Acquire
- Ventures
- Financeability
- About
- Contact

Additional required public routes:

- Privacy
- Terms
- selected Venture detail routes
- public sample Acquisition Financeability Report

### 3.1 Home

Purpose: institutional overview and intent routing.

Required section order:

1. Hero
2. Build / Operate / Acquire lanes
3. Selected Systems / Ventures
4. Operating Infrastructure
5. Acquisition Financeability proof block
6. Acquisition Mandate
7. Proof of Execution
8. Segmented contact pathways

Hero statement:

> We build, operate, and acquire technology-enabled businesses.

Primary CTA: Explore ProductWeld  
Secondary CTA: Acquisition Criteria

### 3.2 Build

Purpose: demonstrate repeatable product-development and systems capability through concrete outcomes rather than a services catalogue.

Content should emphasize:

- AI-native operational software
- workflow automation
- data products
- agentic systems
- vertical software
- control planes
- integration and deployment systems
- commercialization infrastructure

The page should present evidence-backed case studies and selected systems. It may offer selective partnership or development intake, but must not read as a conventional consultancy page.

### 3.3 Operate

Purpose: explain the operating layer that continues after software release.

Content should show:

- persistent state and workflows
- product and operating analytics
- release governance
- automation
- monitoring
- customer operations
- revenue systems
- evidence-backed decisioning
- maintenance and iterative improvement

Core message:

> Building software is only the first state transition.

### 3.4 Acquire

Purpose: establish ProductWeld as a disciplined buyer of remote or remotely operable technology-enabled businesses.

Public positioning:

> ProductWeld acquires durable, technology-enabled businesses that can be operated remotely and strengthened through software, automation, data, and disciplined operations.

Primary fit:

- SaaS and software
- technology-enabled services
- digital agencies
- recurring-revenue businesses
- distributed teams
- home-based businesses
- businesses whose physical operations are independently managed or outsourced

Primary exclusion unless a credible transition is established:

- businesses requiring owner presence at a store, warehouse, plant, office, clinic, restaurant, route, territory, or jobsite
- inventory-heavy businesses whose physical operations cannot be independently managed
- acquisitions dependent on unverifiable remote-operability assumptions

Public capital language:

> Transaction structures are evaluated case by case and may include senior acquisition debt, seller financing, deferred consideration, earnouts, outside equity, rollover equity, and working-capital facilities.

The Acquire page must include seller/broker intake and separate pathways for capital and strategic partners.

### 3.5 Financeability

Purpose: make acquisition underwriting discipline visible as a first-class ProductWeld capability.

Launch version: public methodology plus a polished anonymized/synthetic sample Acquisition Financeability Report.

Future version: interactive preliminary financeability diagnostic using the same route and compatible data model.

Opening proposition:

> What can the business actually support?

The public report must distinguish ProductWeld underwriting standards from lender approval rules and must never represent that a visitor or company is approved, eligible, or qualified for financing.

### 3.6 Ventures

Purpose: curate ProductWeld's strongest operating and technical evidence.

The Ventures page must not be a repository dump.

Each published venture needs:

- state
- commercial path
- evidence
- current function
- relationship to ProductWeld

Allowed states:

- Concept
- Prototype
- Pilot
- Live
- Operating
- Archived

Allowed relationship labels include:

- Built by ProductWeld
- Operated by ProductWeld
- Owned by ProductWeld
- Incubated by ProductWeld
- Infrastructure used by ProductWeld

A venture may be featured prominently only if it demonstrates at least one of:

- live product
- real user workflow
- verified deployment
- substantive technical capability
- operating evidence
- active revenue path
- strategic importance to ProductWeld

### 3.7 About

Purpose: explain ProductWeld's operating philosophy, company structure, and founder/operator context.

The company must remain primary. Founder context supports institutional credibility but must not turn the page into a personal résumé.

### 3.8 Contact

Purpose: segmented routing, not one universal form.

Required intent paths:

- Product
- Partnership
- System Development
- Seller / Broker
- Capital Partner
- Strategic Partner

## 4. Visual system

Design direction: editorial-industrial institutional technology company.

### 4.1 Palette

- Background: `#0B0D0F`
- Primary surface: `#131619`
- Primary text: `#F3F1EA`
- Secondary text: `#A5ABB0`
- Primary accent: `#4B7BFF`
- Secondary accent: `#E06B36`, used sparingly
- Borders: `rgba(255,255,255,.10)`

### 4.2 Typography

- Headings: Geist or comparable geometric grotesk
- Body: Inter or system sans
- Technical labels: IBM Plex Mono

### 4.3 Composition

Use:

- generous negative space
- large typography
- precise grids
- thin structural rules
- product screenshots
- operating metrics
- restrained technical diagrams
- subtle line intersections and connected modules as the ProductWeld visual metaphor

Avoid:

- stock photography unless documenting a real operation
- generic AI gradients
- decorative glassmorphism
- fake terminals
- floating 3D ornament
- literal welding imagery
- oversized pill-heavy interfaces
- excessive animation

Motion should be purposeful, mostly 150-250 ms transitions using transforms and opacity.

## 5. Venture evidence model

Every public venture record should expose these fields or equivalent derived presentation values:

```text
venture_id
name
slug
summary
state
commercial_path
relationship_to_productweld
current_function
evidence[]
public_demo_url?
public_repo_url?
public_metrics[]
hero_asset
featured
last_verified_at
```

Evidence records should preserve provenance internally even if the public presentation is simplified.

Unsupported or stale evidence must downgrade or remove the public status rather than leaving an optimistic label in place.

## 6. Acquisition Financeability methodology

The launch sample report must demonstrate the following analytical sequence:

1. reported earnings / SDE / EBITDA;
2. quality-of-earnings and normalization adjustments;
3. owner-replacement compensation;
4. normalized EBITDA;
5. maintenance capex where relevant;
6. working-capital needs;
7. normalized CFADS;
8. recurring-revenue durability;
9. customer concentration;
10. owner/key-person dependence;
11. remote-operability evidence;
12. purchase-price financing capacity;
13. post-close working-capital needs;
14. base, downside, and stress scenarios;
15. capital-stack scenarios;
16. post-close liquidity requirements;
17. legal, tax, collateral, change-of-control, solvency, guarantee, and control risks;
18. evidence confidence and unresolved diligence items.

### 6.1 ProductWeld stressed DSCR standard

The internal underwriting hurdle displayed in the sample methodology may use a 1.50x stressed DSCR floor, but the report must explicitly label that as a ProductWeld underwriting standard, not a universal lender rule.

### 6.2 Purchase-price financing vs working capital

The report must explicitly separate:

**Purchase-price financing**
- senior acquisition debt
- seller note
- deferred consideration
- earnout
- outside equity
- rollover equity

**Post-close working-capital financing**
- revolver
- A/R or invoice facility
- payroll funding
- inventory or asset-backed facility when relevant
- operating liquidity reserve

The report must not treat a working-capital facility as purchase consideration unless the actual financing documents permit that use.

### 6.3 Public classifications

Allowed non-binding outputs:

- Financeability: Strong / Conditional / Weak
- Remote Operability: Verified / Conditional / Unverified
- Evidence Confidence: High / Medium / Low
- Primary Constraint: Debt Capacity / Working Capital / Concentration / Owner Dependence / Transaction Structure / Evidence Quality

Disallowed outputs:

- Approved
- Qualified
- Eligible
- Guaranteed financing amount
- lender commitment language

### 6.4 Sample report

Launch with at least one synthetic or anonymized remote SaaS-enabled service company example.

Illustrative capital-stack table should include:

- senior acquisition debt
- seller note
- deferred consideration / earnout
- outside equity
- buyer cash, scenario dependent
- revolver / A/R facility
- liquidity reserve

The sample must state that it is illustrative and non-binding.

## 7. Future interactive Financeability tool

The v2 architecture must support a later interactive tool without requiring a route or conceptual rebuild.

The future model should separate:

- company economics
- revenue quality
- ownership dependence
- operations and remote operability
- transaction assumptions
- debt assumptions
- working capital
- evidence
- calculated scenarios

Every field should preserve whether it is:

- user supplied
- document sourced
- externally verified
- inferred
- calculated

Every output should carry confidence and provenance.

The public tool may produce a **Preliminary Financeability Assessment** but must not present a lender approval or committed financing result.

## 8. Acquisition funnel

### 8.1 Seller / Broker intake

First-stage fields should include:

- business type
- asking price
- approximate revenue
- EBITDA / SDE
- recurring-revenue percentage
- owner involvement
- employee / contractor structure
- physical-location requirements
- inventory dependency
- remote-operability summary
- seller-financing willingness
- contact information

Submission creates an acquisition-review intake record. It does not constitute interest, an offer, or a financing representation.

### 8.2 Capital and strategic partners

Separate forms or intent routing should collect only the minimum information necessary to route the inquiry.

Clay enrichment, broker-network enrichment, automated outbound, and CALL-E workflows are not launch-critical and belong to v2.1 or later after qualification and governance rules are validated.

## 9. Commercial funnel

Commercial users must choose among Product, Partnership, or System Development.

Build-side inquiries must remain logically separate from acquisition submissions for analytics, workflow routing, and data governance.

## 10. Analytics

Analytics must correspond to business decisions, not vanity traffic.

Core events:

- `homepage_lane_selected`
- `venture_viewed`
- `financeability_sample_opened`
- `financeability_sample_downloaded`
- `acquisition_criteria_viewed`
- `acquisition_intake_started`
- `acquisition_intake_submitted`
- `commercial_intake_started`
- `commercial_intake_submitted`
- `external_demo_clicked`
- `qualified_contact_action`

Recommended common parameters:

- `portfolio_site=productweld`
- `visitor_intent`
- `source_route`
- `audience_segment`
- `venture_id` when applicable

Analytics failures must never block navigation or form submission.

Do not claim GA4, Search Console, CMP, or other provider activation until the relevant provider dashboard is verified.

## 11. SEO and machine readability

Required launch elements:

- canonical domain configuration
- `sitemap.xml`
- `robots.txt`
- unique route metadata
- OpenGraph metadata
- Organization structured data
- SoftwareApplication / Product structured data where appropriate
- indexable Acquire route
- indexable Financeability route and sample report
- non-indexable confidential acquisition and underwriting materials

## 12. Technical architecture

ProductWeld.tech v2 should be a mostly static institutional application with small dynamic surfaces for lead intake, analytics, and controlled downloads.

Public content must render without authentication.

The current infrastructure state indicates that `productweld.tech` is served through Cloudflare and is not controlled by the known GitHub Pages host. Therefore the first implementation work item is **source-of-truth reconciliation**:

1. identify the actual Cloudflare production source and deployment mechanism;
2. determine whether that source has recoverable Git provenance;
3. if recoverable, establish the authoritative ProductWeld repository;
4. if not recoverable, create a new canonical ProductWeld source repository and coordinate a controlled Cloudflare cutover;
5. keep GitHub as the authoritative application source and Cloudflare as the delivery layer unless implementation evidence justifies a change.

No visual redesign should be considered complete until deployment provenance is resolved.

## 13. Public / private data boundary

Public site:

- approved venture summaries
- approved evidence
- acquisition criteria
- synthetic/anonymized Financeability sample
- public methodology
- public contact and intake data

Private systems:

- actual CIMs
- tax returns
- detailed target financials
- broker-confidential data
- proof-of-funds materials
- lender packages
- internal underwriting workbooks
- acquisition workflow state
- Canon authority and policy records

Public pages may create intake records but may not mutate canonical acquisition truth or Human Authority.

## 14. Forms, security, and privacy

Public forms require:

- server-side validation
- rate limiting
- bot protection
- origin controls
- clear privacy disclosure
- minimum-necessary data collection
- graceful retry behavior

Do not accept confidential diligence documents through a generic unauthenticated upload flow in v2.

Do not request net worth, bank statements, proof of funds, tax returns, or similarly sensitive financial information through public homepage forms.

Submission failures must preserve user-entered data long enough for retry without misrepresenting the failed submission as received.

Public errors must never expose stack traces, secret names, provider internals, or acquisition workflow state.

## 15. Accessibility

WCAG AA is a release criterion for critical paths.

Required checks:

- keyboard navigation
- visible focus states
- reduced-motion support
- semantic headings
- form labels and validation announcements
- meaningful link text
- contrast
- screen-reader-friendly status labels
- iPhone Safari verification

## 16. Performance

Goals:

- useful content rendered without a large client-side shell
- minimal homepage JavaScript
- optimized responsive media
- no autoplay video above the fold
- constrained font loading
- motion implemented primarily with transform and opacity
- strong mobile Core Web Vitals

## 17. Launch scope

v2 release includes:

- Home
- Build
- Operate
- Acquire
- Ventures
- selected venture detail pages
- Financeability
- public sample Financeability Report
- About
- Contact
- Privacy
- Terms
- seller/broker intake
- commercial intake
- analytics instrumentation
- sitemap / robots / metadata / structured data
- accessibility validation
- mobile QA
- performance verification
- deployment provenance reconciliation

## 18. Explicit v2.1+ deferrals

Not required for v2 launch:

- interactive Financeability calculator
- automated document ingestion
- confidential diligence room
- automated lender matching
- automated broker enrichment
- automated Clay-based relationship workflows
- automated CALL-E outreach
- capital-partner marketplace
- public authenticated user accounts
- automatic acquisition decisions

These features require separate design and authority review.

## 19. Release gates

| Gate | Acceptance requirement |
|---|---|
| Identity | ProductWeld clearly reads as a technology holding company |
| Positioning | Build · Operate · Acquire are equally understandable |
| Credibility | At least 4 strong evidence-backed venture/system pages |
| Acquisition | Remote-business acquisition mandate is explicit |
| Financeability | Public sample report is complete, realistic, and clearly non-binding |
| Revenue | At least one functional commercial conversion path |
| Deal flow | Seller/broker intake works end-to-end |
| Analytics | Core conversion events are verified in the real provider environment |
| SEO | Canonical domain, sitemap, metadata, structured data, Search Console readiness |
| Performance | Strong mobile performance with no critical Core Web Vitals regression |
| Accessibility | WCAG AA critical-path checks pass |
| Mobile | iPhone Safari critical journeys pass |
| Security | Forms validate, rate-limit, and fail safely |
| Deployment | Actual Cloudflare source and Git provenance are resolved |
| Evidence | No unsupported product or operating claims |
| Governance | Public site cannot mutate Canon or acquisition truth |

## 20. Verification strategy

Verification should include:

1. route-level content checks;
2. accessibility tests for navigation and forms;
3. mobile viewport and iPhone Safari QA;
4. form success/failure/retry tests;
5. analytics event verification in provider dashboards;
6. metadata, canonical, sitemap, and robots checks;
7. structured-data validation;
8. performance audit;
9. broken-link and external-demo checks;
10. evidence review for every featured venture;
11. Cloudflare production-source and deployment-receipt verification;
12. confirmation that confidential acquisition data cannot leak into public routes or indexing.

## 21. Success criteria

A broker arriving from acquisition outreach should understand within roughly 30 seconds that ProductWeld is a credible operator with a defined acquisition mandate, underwriting discipline, and real technical operating capability.

A seller should understand whether the business broadly fits ProductWeld and be able to submit it without financing jargon.

A customer should find real systems and products rather than a collection of experiments.

A capital partner should see operating discipline, underwriting sophistication, and evidence of execution.

A technical visitor should be able to trace important claims to real product evidence.

## 22. Governance and authority

This specification authorizes design intent only. It does not independently authorize:

- production deployment
- domain or DNS cutover
- publication of unverified claims
- billing or payment activation
- collection of sensitive acquisition documents
- external financing representations
- public release of confidential target data
- merge to protected canonical branches where Human Authority approval is required

Implementation must preserve ProductWeld.tech as a presentation and intake surface, Canon as authoritative governance and knowledge source, and Human Authority as the final gate for consequential actions.
