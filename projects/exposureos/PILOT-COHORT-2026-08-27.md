# ExposureOS pilot cohort research — 2026-08-27

Status: research-only prospect cohort. No outreach has been sent and no customer relationship is implied.

## Selection logic
Initial cohort candidates are Massachusetts home-service operators in the ExposureOS beachhead verticals. The purpose is to test the free Exposure Scan against real public websites and identify which businesses have actionable, evidence-backed exposure gaps. Public website observations are not treated as private customer data.

## Observed candidates

### EHC Inc. — electrical and HVAC
Website: https://www.callehc.com/
Observed crawl: 9 pages. Homepage title, meta description, H1, JSON-LD schema, robots.txt, and sitemap were observable. FAQ schema was not observed. External audit score: 85/100.
Interpretation: relatively strong technical foundation; useful pilot for proving whether ExposureOS can go beyond basic hygiene into conversion, reputation, AI-readiness, and lead-recovery value.

### Vaughan Plumbing & Heating
Website: https://abostonplumber.com/
Observed crawl: 47 pages. Homepage title, meta description, H1, JSON-LD schema, robots.txt, and sitemap were observable. FAQ schema was not observed. External audit score: 85/100.
Interpretation: stronger-than-average web foundation, so a useful test of whether the product finds higher-value gaps rather than merely missing tags.

### CAN Roof Construction
Website: https://canroofconstruction.com/
Observed crawl: 913 pages, extensive service/location coverage, JSON-LD and FAQ schema, robots.txt and sitemap. External audit score: 100/100.
Interpretation: not a strong first prospect for basic technical remediation. Use as a competitive benchmark and stress case for large-site crawling, duplicate-content controls, prioritization, and lead/revenue workflows.

### Drain Flow
Website: https://drain-flow.com/
The external audit attempt received HTTP 403 and could not reliably inspect homepage signals.
Interpretation: **not scored as a low-quality website**. This is an acceptance fixture for ExposureOS: crawl denial, network failures, robots denial, timeouts, and similar observability failures must be represented as `Not observed` / `Crawl blocked`, with evidence, rather than converted into false negative findings or a zero quality score.

## Pilot prioritization
1. Prefer companies with a technically functional site but clear missing trust/conversion/structured-data/reputation signals. This makes the product's incremental value measurable.
2. Include one highly optimized website as a negative-control benchmark: ExposureOS should avoid manufacturing low-value recommendations merely to fill a report.
3. Include one crawl-restricted target as an observability/error-semantic fixture.
4. Do not send outreach until Human Authority approves the specific outbound batch and the generated reports have been manually verified for factual accuracy.

## Cohort success conditions
- At least 20 source-qualified businesses across HVAC, plumbing, roofing, and electrical.
- Every prospect report separates observed facts, inferred opportunities, unobserved signals, and scanner errors.
- Zero fabricated rankings, review counts, revenue estimates, customer behavior, or business defects.
- First outreach batch targets only high-confidence findings whose business value can be explained in under 60 seconds.
- Any claimed result after onboarding must distinguish detected, pipeline, booked, and realized value.
