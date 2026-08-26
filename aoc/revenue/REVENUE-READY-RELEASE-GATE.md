---
api_version: aoc/v1
kind: Policy
id: POL-REV-001
title: Revenue-Ready First-Iteration Release Gate
version: 1.0.0
status: active
owner: HUMAN_AUTHORITY
effective_date: 2026-08-25
---

# Revenue-Ready First-Iteration Release Gate

## Mandatory rule

Every AOC commercial portfolio project MUST pass this gate before its first
external or customer-facing iteration and before every later commercial
release. This includes an MVP, v0, v1, beta, paid pilot, launch, production
release, or any artifact described as released, launch-ready, complete, or
revenue-ready.

Missing evidence is a release blocker. A prototype, experiment, research build,
or internal draft may continue without a PASS, but it MUST remain explicitly
pre-release and MUST NOT be represented as a released commercial product.

Infrastructure, governance, security, evidence-only, and emergency remediation
changes may be versioned internally without being mislabeled as commercial
releases. If an infrastructure project is itself offered to buyers, this gate
applies from its first offered iteration.

## Binary decision

- **PASS:** all 20 revenue-chain criteria and all 10 first-dollar checks are
  `PASS`, each has a named owner, and each cites current evidence.
- **BLOCKED:** required evidence is missing, stale, synthetic, inaccessible, or
  not independently checkable.
- **FAIL:** evidence disproves readiness or a required path does not work.

There is no partial, conditional, inferred, or model-attested PASS. Features,
code coverage, design quality, and deployment success do not substitute for a
complete buyer-to-payment-to-delivery path.

## Twenty mandatory revenue-chain criteria

| ID | Requirement | Minimum PASS evidence |
| --- | --- | --- |
| `specific_buyer` | A clearly defined person or company with purchasing authority | ICP plus a named buyer/account or a source-backed buyer cohort |
| `urgent_problem` | A costly, frequent, time-sensitive problem | Discovery evidence, observed loss, mandated deadline, or comparable primary evidence |
| `compelling_offer` | Defined outcome, scope, timeframe, and differentiation | Current offer/SOW or offer page |
| `pricing_model` | Explicit commercial model and price | Approved rate card, quote, product/price record, or invoice terms |
| `proof` | Credible evidence the promised result can be delivered | Demo, sample, benchmark, testimonial, or measured ROI with synthetic material labeled |
| `customer_source` | Repeatable source of qualified prospects | Named-account queue, query, marketplace, partner, or documented referral source |
| `acquisition_channel` | A working route from prospect to offer | Channel evidence plus direct-outreach and follow-up assets |
| `conversion_mechanism` | A defined sales decision path | Landing page, discovery flow, proposal, trial, or checkout evidence |
| `payment_infrastructure` | A verified way to collect payment | Live or approved-to-activate payment link, invoice flow, billing terms, and refund policy |
| `fulfillment_system` | A repeatable delivery process | Runbook, checklist, service workflow, or automated delivery evidence |
| `onboarding` | A working customer intake path | Intake form, setup steps, required inputs, expectations, and timeline |
| `customer_support` | A defined support and recovery path | Support channel, response owner, escalation path, and service-recovery procedure |
| `retention_mechanism` | A reason and mechanism for continued use or purchase | Renewal, monitoring, saved history, ongoing service, or repeat-use design |
| `expansion_path` | A defined route to larger customer value | Higher tier, seats, locations, data, add-on, or service expansion |
| `unit_economics` | Known acquisition and delivery economics | CAC assumption/evidence, delivery cost, gross margin, payback, and churn assumptions |
| `measurement` | Instrumented commercial and delivery metrics | Lead, conversion, payment, revenue, margin, retention, and pipeline definitions |
| `legal_operational_basics` | Required operating and legal foundations | Terms, privacy, contract/ownership, tax, and applicable compliance evidence |
| `automation` | Repeatable automation where it reduces friction | Sourcing, qualification, follow-up, billing, delivery, reporting, or renewal workflow evidence |
| `accountability` | A single accountable owner and next action | Owner, status, next action, deadline, and linked evidence |
| `continuous_demand_validation` | Proof that demand has crossed into payment | A cleared payment receipt or executed payable commitment for the current offer |

## Mandatory first-dollar stack

The release evidence MUST also explicitly pass this compact stack:

1. One painful problem.
2. One defined buyer.
3. One fixed offer.
4. One price.
5. One proof asset.
6. One source of qualified leads.
7. One sales path.
8. One way to collect payment.
9. One reliable fulfillment process.
10. Direct outreach and follow-up.

These are a release summary, not a replacement for the 20 criteria.

## Commercial truth rules

1. Revenue equals qualified opportunities × conversion rate × price × purchase
   frequency. Profit equals revenue minus acquisition, fulfillment, support, and
   operating costs.
2. A forecast, modeled opportunity, waitlist, verbal interest, or synthetic demo
   does not satisfy paying-demand evidence.
3. Payment is not revenue without a verifiable receipt or executed payable
   commitment.
4. Detected value, customer-confirmed value, booked value, and realized value
   remain distinct.
5. A payment path must be verified in the intended account before it is shown to
   a buyer. Activating billing or collecting funds remains Human Authority-gated.
6. Legal, production, public-publishing, and other consequential actions retain
   their existing Human Authority gates. A revenue PASS grants no additional
   authority.

## Required artifact and enforcement

Each commercial project MUST maintain
`.aoc/revenue-ready-release.json` using
`aoc/revenue/revenue-ready-release.schema.json`. The portable validator is
`.github/actions/revenue-ready-release/validate.mjs`.

Release automation MUST run the validator before deployment, publication,
submission, buyer access, or a release tag. A missing manifest or non-PASS
result must stop the release.

## Human Authority exception

Only Human Authority may authorize a specific release despite a blocked gate.
The approval must be explicit, scope-limited, time-bounded, and recorded in
Canon with the unresolved criteria. An exception never converts missing
evidence into PASS and never permits the project to be labeled revenue-ready.

