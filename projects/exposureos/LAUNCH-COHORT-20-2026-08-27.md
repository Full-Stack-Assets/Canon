# ExposureOS launch cohort — first 20 accounts

Status: research and qualification only. **No outreach has been sent.**

Purpose: maintain a diverse Massachusetts home-services cohort for scanner validation and eventual Human Authority-approved outreach. A candidate is not an implied customer and a technical observation is not a business-quality judgment.

## Cohort

| # | Candidate | Vertical | Public website / source | Current research role |
|---|---|---|---|---|
| 1 | Lowe Plumbing and Heating, Inc. | Plumbing / HVAC | https://www.loweplumbingma.com/ | High-priority scanner/remediation candidate |
| 2 | EHC Inc Electrical Heating Cooling | Electrical / HVAC | https://www.callehc.com/ | Strong-site comparison; previously audited |
| 3 | Vaughan Plumbing & Heating | Plumbing / heating | https://abostonplumber.com/ | Strong-site comparison; previously audited |
| 4 | CAN Roof Construction | Roofing | https://canroofconstruction.com/ | Negative-control / highly optimized-site benchmark |
| 5 | Drain Flow | Plumbing / drains | https://drain-flow.com/ | Crawl-blocked/403 observability fixture; do not score as bad site |
| 6 | New England Ductless | HVAC / heat pumps | https://newenglandductless.com/ | Medium-priority scanner/remediation candidate |
| 7 | Metro Energy - M & T Oil Co. | Heating / fuel service | https://www.metroenergyboston.com/ | **False-positive control**: external audit conflicted with public page observations; do not contact from that audit |
| 8 | Trust 1 Services | HVAC / plumbing | https://www.trust1services.com/ | Negative-control / sophisticated acquisition-site benchmark |
| 9 | TBros / Trethewey Brothers | Plumbing / heating / cooling | https://www.tbros.com/ | Medium-priority scanner/remediation candidate |
| 10 | FRS Roofing + Gutters | Roofing | https://frsroof.com/ | High-priority scanner/remediation candidate |
| 11 | Pann Home Services | Plumbing / HVAC / home services | https://www.pannhomeservices.com/ | Large-site benchmark; medium-priority remediation candidate |
| 12 | Boston Budget Plumbing, Heating and Cooling | Plumbing / HVAC | https://bostonbudgetplumbing.com/ | Medium-priority scanner/remediation candidate |
| 13 | E/R Electric | Electrical | Structured local-business source identified; official web target still to be independently resolved | Qualification pending URL resolution |
| 14 | Evolved Mechanical | HVAC / plumbing | Structured local-business source identified; official web target still to be independently resolved | Qualification pending URL resolution |
| 15 | EMC General Contracting LLC | Electrical / HVAC / contracting | https://emcboston.com/ | Cross-trade comparison candidate |
| 16 | Howard Construction | Roofing / construction | https://www.howardconstructionma.com/ | Roofing comparison candidate |
| 17 | Pillar Services | Electrical / HVAC / plumbing | https://pillar-service.com/ | Cross-trade comparison candidate |
| 18 | EH Electric & HVAC, LLC | Electrical / HVAC | https://www.ehelectrical.com/ | Cross-trade comparison candidate |
| 19 | Quality Heating and Cooling, LLC | HVAC | Public BBB business profile located; official web target must be resolved independently before scan | Qualification pending URL resolution |
| 20 | A. Hohmann & Company | Plumbing / heating | Public Greater Boston contractor source located; official web target must be resolved independently before scan | Qualification pending URL resolution |

## Fresh audit observations used for cohort triage

### Lowe Plumbing and Heating
External technical audit observed 8 pages and returned 55/100. The homepage title and meta description were observed, while an H1 and JSON-LD structured schema were not observed. This is a higher-confidence technical-remediation candidate because the absence findings were specific and the site was crawlable.

### New England Ductless
External audit observed 63 pages and returned 85/100. H1, schema, robots and sitemap were observed. The meta description was longer than the auditor's target range. This should be treated as a lower-severity optimization case, not a broken-site story.

### Metro Energy
External audit observed 132 pages but returned 25/100 and claimed homepage title/H1 were absent. Separate public search retrieval showed a descriptive page title and a visible homepage heading. Therefore the audit is internally contradicted. **This candidate is retained as a false-positive fixture, not an outreach target.** ExposureOS must reconcile source disagreement before it recommends remediation.

### Trust 1 Services
External audit observed 54 pages and returned 100/100 while separately noting 10 homepage H1 elements. This is another useful test of scoring/report consistency: a recommendation can exist without necessarily reducing a tool's headline score. ExposureOS should expose such scoring logic rather than obscure it.

### TBros
External audit observed 31 pages and returned 85/100. It observed title, meta, schema, robots and sitemap, with two H1 elements. Potential remediation exists but is lower urgency than Lowe/FRS.

### FRS Roofing + Gutters
External audit observed 211 pages and returned 70/100. Schema, robots and sitemap were observed, but no homepage H1 was observed. The combination of a large content footprint plus a specific homepage hierarchy issue makes this a useful high-priority report candidate.

### Pann Home Services
External audit observed 487 pages and returned 85/100 with one H1 and schema present. It is valuable as a large-site benchmark and lower-severity optimization case.

### Boston Budget
External audit observed 102 pages and returned 85/100, with schema, robots and sitemap present and two H1 elements observed. Treat as medium severity.

## Qualification rules before outreach
1. Resolve an official domain from an independent public source for every candidate.
2. Re-run the domain through ExposureOS staging once external scanner execution is verified.
3. Reconcile any material conflict between crawler output and independent page evidence.
4. Do not use FAQ-schema absence alone as a sales hook; current rich-result behavior and business value must be explained accurately.
5. Only retain findings that are high-confidence, observable and economically legible.
6. Human Authority approves the exact first outbound batch before any message is sent.
