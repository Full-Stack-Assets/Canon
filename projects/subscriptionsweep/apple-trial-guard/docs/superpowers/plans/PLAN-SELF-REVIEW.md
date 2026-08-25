# SubscriptionSweep Release 1 Plan Self-Review

**Date:** 2026-08-24  
**Work Item:** `WI-2026-08-24-SUBSCRIPTIONSWEEP-APPLE-TRIAL-GUARD`  
**Review result:** PASS  
**Review scope:** The implementation plan set was checked against the approved written specification before any implementation code was authorized.

## 1. Scope and decomposition

The specification contains five independently reviewable subsystems. The plan set separates them as follows:

1. Core platform and durable domain foundation.
2. Receipt ingestion, evidence, confirmation, and deduplication.
3. Web SaaS.
4. Native iOS application.
5. Cross-platform integration, security, and release verification.

Each plan produces a testable result and names its dependencies. Release 1.1 Gmail and Outlook ingestion and Release 2 bank, household, usage, and realized-savings capabilities remain deferred.

## 2. Specification coverage

| Approved specification area | Implemented by plan tasks | Coverage |
| --- | --- | --- |
| Product definition and Apple visibility boundary | Index constraints; receipt plan Tasks 1–9; iOS Task 10 | Complete |
| First-run setup and limitation acknowledgement | iOS Tasks 4–5 | Complete |
| Private forwarding address | Receipt plan Tasks 6–8 | Complete |
| Share Extension | iOS Task 9; receipt plan Task 7 | Complete |
| Manual entry | Core Task 5; iOS Task 6 | Complete |
| MIME safety and source minimization | Receipt plan Tasks 2 and 8 | Complete |
| Deterministic Apple receipt parser | Receipt plan Tasks 1–5 | Complete |
| `VERIFIED`, `INFERRED`, `NEEDS_CONFIRMATION` | Core Task 2; receipt plan Tasks 4–5 and 9 | Complete |
| Field-level evidence and source excerpts | Receipt plan Tasks 4, 6, and 9; web Task 4 | Complete |
| Deduplication and lineage | Receipt plan Tasks 6 and 8 | Complete |
| Trial, monthly, and annual reminder policy | Core Task 3 | Complete |
| Reminder reconciliation and idempotency | Core Tasks 4 and 6; iOS Task 7 | Complete |
| Optional Apple Reminders | iOS Tasks 5 and 8 | Complete |
| Local notifications | iOS Task 7 | Complete |
| Push and email provider boundaries | Integration Task 4 | Complete as simulated adapters |
| Apple subscription-management sheet | iOS Task 10 | Complete |
| Explicit keep, canceled, and remind-later outcomes | Core Task 5; web Task 4; iOS Tasks 6 and 10 | Complete |
| SwiftUI iPhone navigation and UI | iOS Tasks 5–12 | Complete |
| Responsive web dashboard | Web Tasks 1–8 | Complete |
| Sign in with Apple for app and web | iOS Task 4; web Task 2; integration Task 3 | Complete, credential-gated |
| StoreKit test entitlement | iOS Task 11; integration Task 3 | Complete |
| Duplicate billing prevention | Web Task 7; iOS Task 11; integration Task 3 | Complete |
| PostgreSQL data model and migrations | Core Task 4; receipt Task 6; integration Tasks 3–6 | Complete |
| Durable background work | Core Task 6 | Complete |
| Audit trail and tamper detection | Core Tasks 4–5; integration Task 5 | Complete |
| Source health | Receipt Task 7; web Task 6; integration Task 3 | Complete |
| Privacy export and deletion | Web Task 6; iOS Task 12; integration Task 6 | Complete |
| Token and secret protection | iOS Task 3; integration Tasks 3, 5, 9 | Complete |
| Observability without sensitive labels | Integration Task 5 | Complete |
| Fixture, unit, integration, browser, and iOS tests | All plans | Complete |
| Container packaging and managed deployment readiness | Integration Tasks 1 and 9 | Complete without deployment claim |
| Release manifest and truthful verification report | Core Task 7; integration Task 8 | Complete |
| App Store handoff and hard gates | Integration Task 9 | Complete |
| Release 1.1 and Release 2 deferrals | Plan index | Complete |

## 3. Placeholder scan

The plan set contains no unresolved markers, deferred implementation instructions, vague error-handling directions, generic test directives, or references that tell an executor to copy an unspecified neighboring task. Every task names exact files, interfaces, commands, expected behavior, and a commit boundary.

## 4. Type and interface consistency

Verified shared names:

| Concept | Canonical name |
| --- | --- |
| Evidence states | `VERIFIED`, `INFERRED`, `NEEDS_CONFIRMATION` |
| Subscription lifecycle | `CANDIDATE`, `ACTIVE`, `KEPT`, `USER_REPORTED_CANCELED`, `EXPIRED`, `UNKNOWN` |
| Reminder lifecycle | `PLANNED`, `SCHEDULED`, `DELIVERED`, `ACKNOWLEDGED`, `CANCELED`, `SUPERSEDED`, `FAILED` |
| Parser version | `apple-receipt-v1` |
| Core reminder function | `buildReminderDrafts` |
| Subscription repository lookup | `findById(userId, subscriptionId)` |
| Reminder reconciliation | `reconcile(userId, subscriptionId, drafts)` |
| Receipt worker job | `PROCESS_INBOUND_RECEIPT` |
| Reminder worker job | `RECONCILE_REMINDERS` |
| Apple annual product ID | `com.productweld.subscriptionsweep.auto.yearly` |
| App bundle ID | `com.productweld.subscriptionsweep` |
| Share Extension bundle ID | `com.productweld.subscriptionsweep.share` |
| App Group | `group.com.productweld.subscriptionsweep` |

The Swift contract fixtures are checked against canonical root JSON fixtures by hash. API and worker payloads use the same names throughout the plan set.

## 5. Authority and evidence review

Permitted without another approval:

- private repository creation;
- fixture-driven local implementation;
- local containers and databases;
- simulated providers;
- tests, documentation, and draft pull requests;
- StoreKit configuration testing;
- unsigned simulator builds.

Still gated:

- Apple Developer registration and team selection;
- App Group, Associated Domains, APNs, and Sign in with Apple production configuration;
- production inbound email and DNS;
- production database and encryption keys;
- live billing;
- managed production deployment;
- App Store Connect product activation;
- App Store submission;
- any external communication or charge.

## 6. Remaining technical limitations

These are deliberate product boundaries, not plan omissions:

- A third-party app cannot enumerate unrelated subscriptions across the user’s Apple Account.
- Free trials without a usable receipt date require confirmation.
- Release 1 parser fixtures are initially English and synthetic.
- Gmail and Outlook direct connectors remain Release 1.1.
- Authoritative confirmation of cancellation is unavailable in Release 1; the state is user-reported.
- Local iOS framework verification requires a macOS/Xcode execution host.
- Production integration states cannot be promoted to `VERIFIED` without credentials and external receipts.

## 7. Review conclusion

The plan set is internally consistent, covers every Release 1 specification requirement, preserves all Apple and privacy boundaries, and is sufficiently decomposed for task-by-task test-driven execution. Implementation remains blocked only on selection of the execution mode, not on missing design decisions.
