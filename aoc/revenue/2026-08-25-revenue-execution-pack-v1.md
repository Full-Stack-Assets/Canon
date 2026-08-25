# AOC Revenue Execution Pack v1

**Date:** 2026-08-25  
**Status:** EXECUTION READY / EXTERNAL SALES NOT YET SENT  
**Authority:** Human-approved commercial preparation. No outbound messages, charges, DNS changes, production deployment, or buyer promises are authorized by this record alone.

## Operating rule

The next dollar should come from selling an existing outcome, not creating another product. Major new build work is allowed only when it directly closes a qualified buyer, fulfills a paid commitment, removes a delivery blocker, or creates reusable infrastructure across multiple priority revenue streams.

## Shared commercial state machine

`TARGET → QUALIFIED → DISCOVERY → PROPOSAL → PAID → DELIVERING → DELIVERED → PROOF → REPEAT`

Required ledger fields: offer, buyer/company, source, qualification evidence, pain, urgency, authority, price, decision date, proposal state, payment state, delivery state, proof metric, realized outcome, next action, evidence links, and claim boundary.

### State exit evidence

| State | Minimum exit evidence |
|---|---|
| TARGET | Named account + source + ICP match rationale |
| QUALIFIED | Qualification score >= 8/12 and no hard disqualifier |
| DISCOVERY | Discovery notes + explicit pain + decision/timing |
| PROPOSAL | Proposal/SOW + price + decision date |
| PAID | Receipt, cleared payment, or executed payable agreement |
| DELIVERING | Intake receipt + delivery checklist |
| DELIVERED | Delivery receipt + acceptance/acknowledgement |
| PROOF | Proof metric + evidence + realized outcome |
| REPEAT | Renewal, expansion, referral, or repeat-purchase receipt |

Qualification score: 0–2 each for Pain, Urgency, Authority, Data/Access Fit, Economic Fit, and Deliverability. 8–12 = pursue; 5–7 = nurture; 0–4 = decline. Hard disqualifiers override score.

## Evidence rules

1. Payment is not revenue until a verifiable receipt exists.
2. Synthetic/demo savings or performance never become customer proof.
3. Detected value, client-confirmed value, and realized cash remain separate fields.
4. Unverified payment links or stale product IDs are never sent to buyers.
5. Every outbound opportunity must retain a source and a reason it matches the ICP.
6. Existing offer prices, carried-forward prices, and newly introduced test prices must remain distinguishable.

## Validation target

If all seven proof gates close at the defined minimum/test prices, the resulting first-period booked/setup/pilot **validation target is $39,690**. This is a planning value, not a forecast, probability-weighted estimate, committed revenue, booked revenue, or realized revenue.

Current verified booked value at creation: **$0**.  
Current verified realized value at creation: **$0**.

## 1. Bid Radar

**Decision:** SELL NOW  
**Buyer:** Commercial contractors, initially single-trade regional operators.  
**Existing verified commercial terms:**
- Shared Territory Radar: $249/month.
- Exclusive County/Regional Radar: $499/month.
- Exclusive State/Territory Enterprise Radar: $799/month.

Shared tier includes one metro/county cluster, continuously updated tracker, daily monitoring/scoring, weekly digest, and high-score alerts. Higher tiers add broader coverage, exclusivity, one-page briefs, qualification customization, and enterprise integrations/reviews.

**30-day targets:** 30 sourced accounts; 20 personalized first touches; 10 qualified conversations; 3+ proposals/paid starts.  
**Minimum validation value:** $747 MRR at three $249 customers.  
**Proof gate:** Three paid contractor customers OR ten qualified sales conversations with measured conversion evidence.

**Claim boundary:** Bid Radar provides intelligence and opportunity identification. It does not guarantee exhaustive coverage, awards, or bid compliance. Publication date and crawl/index date must remain distinct.

**Source:** Google Drive, `Bid Radar - Commercial Offer & Pricing Tiers`, modified 2026-08-11.

## 2. Margin Leak Monitor / HostGraph

**Decision:** SELL PILOT NOW  
**Buyer:** Independent restaurant owner/operator, generally one to five locations.  
**Existing verified commercial terms:** $299 one-time setup + $199/month, month-to-month. Existing guarantee: setup-fee refund if fewer than $299 in actionable leaks are detected during the first 30 days, subject to data-completeness terms.

Setup includes baseline ingestion, up to 25 recipe cards, 60-day retrospective audit, and calibration. Ongoing service includes weekly six-category audit, live dashboard, Monday briefing, claim drafts, and margin tracking.

**30-day targets:** 50 qualified restaurant targets; 25 personalized first touches; 5 qualified conversations; 2 proposals; 1+ paid pilot.  
**Minimum validation value:** $498 first month for one setup + one month.  
**Proof gate:** One paid restaurant/group pilot using real invoices/contracts, with detected findings kept separate from client-confirmed credits and realized savings.

**Claim boundary:** The Brass Rooster Bistro is SYNTHETIC DEMONSTRATION data, not a customer testimonial. Modeled leak totals, annualized opportunity, claims, menu erosion, and illustrative ROI must never be represented as realized customer savings. No vendor communication or accounting/POS mutation occurs without explicit owner approval.

**Source:** Library, `01_Margin_Leak_Monitor_Launch_Command_Center.docx`.

## 3. DealDiligence

**Decision:** SELL FIVE PER-DEAL PILOTS  
**Buyer:** Independent sponsors, brokers, small developers, active acquisition teams, and repeat investors.  
**Existing offer:** $299/property; $999/month Portfolio; Founding Portfolio $749/month for six months for first ten design partners.

The commercial package recommends selling five per-deal pilots before emphasizing subscription. Core value is evidence-linked diligence across nine pillars, explicit missing-item flags, completion blockers, reviewer sign-off, and exportable deal records.

**30-day targets:** 20 qualified acquisition teams; 5+ demos/workflow reviews; 5 paid per-deal pilots; one Portfolio conversion target after pilots.  
**Minimum validation value:** $1,495 from five $299 pilots.  
**Proof gate:** Five paid $299 deals, followed by measured repeat usage and a credible path to Portfolio.

**Payment/deployment boundary:** Historical launch material records live Stripe product/price IDs, but the currently connected livemode Stripe account did not corroborate those products, PaymentIntents, subscriptions, or Payment Links. Old IDs must not be sent to buyers. Payment collection must be reverified or recreated in the intended account. The recovery build was locally verified, but a current public production service has not been verified.

**Claim boundary:** DealDiligence does not replace legal, engineering, environmental, tax, or investment advice. Machine-extracted fields require human verification.

**Source:** Library, `DealDiligence_Production_and_Launch_Package.docx`; AOC portfolio revenue verification 2026-08-25.

## 4. ProductWeld / Full Stack Assets

**Decision:** SELL VERIFIED-PRICE SERVICES NOW  
**Primary wedge:** Custom niche content engine setup and managed operation.  
**Existing verified rate card:**
- Custom content engine setup: $1,500.
- Managed engine retainer: $200/month.
- Newsletter primary sponsor: $120/issue.
- Tool spotlight: $45/issue.
- Newsletter monthly bundle: $400/month.
- Native module: $150/month.
- Sponsored article: $250/post.

**30-day targets:** 20 qualified B2B prospects; 5 discovery calls; 2 proposals; 1+ paid engine setup.  
**Minimum validation value:** $1,500 setup; $1,700 first month if managed retainer starts.  
**Proof gate:** First paid build, retainer, sponsorship, or content-engine client with a payment receipt and delivery acceptance.

**Claim boundary:** Working publishing automation may be demonstrated. Unverified audience demographics, traffic, sponsor performance, SEO outcomes, or sales results must not be repeated as facts.

**Source:** Google Drive, `Network Media Kit & Rate Card - Full Stack Assets`, modified 2026-08-11. Public commercial front door `fullstackassets.com` verified during portfolio audit.

## 5. PQC Discovery & Migration Engine

**Decision:** SELL HIGH-TICKET ASSESSMENT  
**Buyer:** Security, infrastructure, platform, and compliance organizations with a material cryptographic estate and migration-planning pressure.  
**Scope definition:** RSA/ECC discovery in code/binaries; CycloneDX 1.7 CBOM; SARIF 2.1.0; evidence graph; policy evaluation; limitations; evidence-first reporting.

**Commercial definition carried forward from portfolio:** $30,000 fixed-scope four-week assessment; $90,000 annual baseline license follow-on. The pricing source file was not independently recovered in this pass, so pricing must be revalidated with the first qualified buyer.

**30-day targets:** 15 named target accounts; 3 qualified security conversations; 1+ assessment proposal; 1 paid assessment target.  
**Validation value:** $30,000 if the first assessment closes.  
**Proof gate:** One qualified buyer seriously evaluates the assessment, then one paid assessment before product scope expands.

**Claim boundary:** No claim of complete enterprise cryptographic coverage outside authorized scope, no speculative quantum break dates, no custom cryptographic safety guarantee, and no invention of cryptographic primitives.

**Source:** AOC canonical portfolio definition and prior PQC scope record.

## 6. Concord

**Decision:** SELL THREE PAID INSIGHT PILOTS  
**Buyer:** Research, CX, insights, people/HR, support, and product teams that already possess an authorized text corpus and need defensible qualitative measurement.  
**TEST PRICE introduced in v1:** $1,500 one-time founding audit for one corpus up to 5,000 text units, one calibrated codebook, corrected prevalence estimates, evidence-linked findings, methods appendix, and 60-minute readout.

**30-day targets:** 20 qualified prospects; 6 discovery calls; 3 paid founding audits; 1+ repeat/referral/expansion signal.  
**Validation value:** $4,500 at three audits.  
**Proof gate:** Three paid qualitative-analysis engagements with source-backed deliverables plus repeat, referral, or expansion evidence.

**Claim boundary:** Concord supports an evidence ladder, human calibration, corrected estimates, evidence inspection, privacy modes, and replication exports. Mock/demo behavior is not customer proof or scientific validation; exploratory results remain labeled exploratory until stronger evidence status is earned.

**Source:** GitHub `Full-Stack-Assets/concord` README. Price is experimental and not historical revenue.

## 7. Spyglass

**Decision:** SELL ONE PAID COMPETITIVE-INTELLIGENCE PILOT  
**Buyer:** B2B SaaS / AI-tool teams with three to five named competitors and an upcoming pricing, positioning, roadmap, or launch decision.  
**TEST PRICE introduced in v1:** $750 for a 30-day founding pilot covering up to five named competitors, baseline map, weekly briefs, material-change alerts, and final decision readout. Optional continuation test price: $299/month.

**30-day targets:** 15 qualified prospects; 3+ offer evaluations/discovery calls; 1+ paid pilot; renewal decision at Day 30.  
**Validation value:** $750 first pilot; $299 MRR only if renewed.  
**Proof gate:** Three qualified buyers evaluate the offer and at least one pays for the pilot.

**Claim boundary:** Repository implementation includes scheduler, scraper/analyzer, brief builder, worker, migrations, auth, and demo surfaces. Do not claim exhaustive internet coverage, private competitor intelligence, guaranteed accuracy, or customer traction that has not occurred.

**Source:** GitHub `Full-Stack-Assets/Spyglass-`. Price is experimental and not historical revenue.

## Shared proposal minimum

Every proposal must state: buyer problem, scope, deliverables, source inputs required, timeline, commercial term, payment mechanism or invoicing terms, exclusions, claim boundary, proof metric, acceptance criteria, cancellation/renewal terms where applicable, and named decision date.

## Shared proof ledger

Record at minimum: offer ID, customer, paid amount, payment receipt/evidence, delivery date, acceptance evidence, detected value, customer-confirmed value, realized value, proof metric, evidence links, repeat/renewal state, and any limitations.

## Weekly operating cadence

1. Source and qualify new target accounts.
2. Advance only evidence-backed opportunities.
3. Review discovery/proposal decision dates.
4. Reconcile paid state against actual receipts.
5. Review delivery deadlines and blockers.
6. Convert delivered work into proof only when outcomes are supported.
7. Review renewals/referrals/repeats.
8. Reject feature work not tied to paid/qualified demand or reusable delivery infrastructure.

## Artifact receipts

- `AOC_Revenue_Execution_Pack_v1_2026-08-25.docx` SHA-256: `56b4ddf4e16b7c6013d96ee4930cac7fef24feae1645febcb123087b5ffa7f04`
- `AOC_Revenue_Execution_Pack_v1_2026-08-25.md` SHA-256: `3866eb2067268fc711877f4c5d9b52974eeecfa999a0a0f522502013b64132ee`
- `AOC_Portfolio_Audit_2026-08-25.xlsx` SHA-256 after Revenue Execution dashboard integration: `32d66f70ba39aa828cc71476182c41cd38364431c0d49970b7a8136807c81448`

## Current execution boundary

This record prepares commercial execution. It does **not** record any outbound sales message as sent, any prospect as contacted, any proposal as accepted, any payment as received, or any revenue as realized. Those states require separate source-backed receipts.