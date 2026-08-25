# SubscriptionSweep: Apple Trial Guard — Release 1 Implementation Plan Set

**Status:** Specification approved by Human Authority on 2026-08-24  
**Canonical Work Item:** `WI-2026-08-24-SUBSCRIPTIONSWEEP-APPLE-TRIAL-GUARD`  
**Canonical specification:** `../specs/2026-08-24-apple-trial-guard-design.md`  
**Target implementation repository:** `Full-Stack-Assets/SubscriptionSweep`  
**Repository visibility:** Private until a separate publication decision is approved  
**BuildGraph decision:** `EXTEND_EXISTING`  
**Implementation namespace:** `CREATE_NEW`, because no dedicated SubscriptionSweep or RenewalLens implementation repository exists

## Execution order

| Order | Plan | Independently testable result | Depends on |
| --- | --- | --- | --- |
| 1 | `2026-08-24-subscriptionsweep-core-platform.md` | Reproducible monorepo, typed contracts, database, API, reminder engine, and durable worker | Approved specification |
| 2 | `2026-08-24-subscriptionsweep-receipt-ingestion.md` | Synthetic Apple receipt enters the system, produces evidence, deduplicates, and schedules reminders | Core platform |
| 3 | `2026-08-24-subscriptionsweep-web-saas.md` | Responsive dashboard operates against the real local API | Core platform and receipt ingestion |
| 4 | `2026-08-24-subscriptionsweep-ios.md` | Native iOS app imports, displays, and reminds; Apple management handoff is wired | Core contracts and API |
| 5 | `2026-08-24-subscriptionsweep-integration-release.md` | Cross-platform acceptance suite, security drills, CI, and truthful release verification | Plans 1–4 |

## Required execution method

Use `superpowers:subagent-driven-development` for task-by-task implementation unless Human Authority selects inline execution. Each task receives:

1. A fresh implementation agent.
2. A specification-compliance review.
3. A code-quality and security review.
4. Fresh tests before any completion claim.
5. A separate commit with a receipt.

## Branch and review strategy

- Create `Full-Stack-Assets/SubscriptionSweep` as a private repository.
- Protect `main`.
- Use one feature branch per plan:
  - `feat/release-1-core-platform`
  - `feat/apple-receipt-ingestion`
  - `feat/web-saas`
  - `feat/ios-client`
  - `feat/release-verification`
- Open a draft pull request at the beginning of each plan.
- Keep each pull request unmerged until its plan-specific acceptance suite passes.
- Merge in the execution order above.
- Do not enable live provider credentials, production billing, production deployment, or App Store submission during these plans.

## Locked technical baselines

- Node.js 24 LTS.
- pnpm 10 through Corepack; commit `pnpm-lock.yaml`.
- TypeScript 6.0 for the first implementation baseline.
- Next.js App Router using the current stable Next.js release compatible with Node.js 24.
- Fastify 5.
- PostgreSQL 17.
- Drizzle ORM with generated SQL migrations.
- Swift 6.
- iOS 17.0 minimum deployment target.
- XcodeGen for reproducible Xcode project generation.
- XCTest for Swift tests.
- Vitest for TypeScript unit and integration tests.
- Playwright for web end-to-end tests.
- A PostgreSQL-backed leased job table rather than a second queue service.
- Synthetic or fully redacted receipt fixtures only.

## Cross-plan invariants

1. No code path claims universal visibility into the user’s Apple Account subscriptions.
2. No Apple Account password collection, credential interception, or Settings-screen scraping.
3. Receipt-derived facts are `VERIFIED`, `INFERRED`, or `NEEDS_CONFIRMATION`.
4. AI-generated fields never become verified without user confirmation.
5. Opening Apple’s subscription-management sheet never changes cancellation state.
6. All write operations carry an idempotency key.
7. Every user query is scoped by authenticated user ID.
8. Raw message bodies expire after 24 hours following successful parsing unless the user explicitly retains one.
9. Logs and telemetry contain no email bodies, OAuth tokens, private aliases, or unredacted order identifiers.
10. Live credentials and irreversible release actions fail closed.
11. Every material state transition produces an audit entry.
12. Every completion claim names the command, exit status, and evidence artifact that proves it.

## Shared verification commands

These commands become available as the plans advance:

```bash
corepack enable
pnpm install --frozen-lockfile
pnpm format:check
pnpm lint
pnpm typecheck
pnpm test
pnpm test:integration
pnpm build
pnpm verify:release
```

The iOS client adds:

```bash
xcodegen generate --spec apps/ios/project.yml
swift test --package-path apps/ios/Packages/SubscriptionSweepCore
xcodebuild \
  -project apps/ios/SubscriptionSweep.xcodeproj \
  -scheme SubscriptionSweep \
  -destination 'platform=iOS Simulator,name=iPhone 17 Pro' \
  test
```

The simulator name may be replaced only by a simulator actually installed on the execution host; the receipt must record the exact destination used.

## Stop gates

Stop only the affected action when any of these arise:

- Apple Developer signing credentials or team selection.
- App identifier, App Group, Associated Domains, Push Notifications, or Sign in with Apple registration.
- APNs production key.
- Live inbound-email provider credentials or DNS.
- Gmail or Microsoft OAuth app registration.
- App Store product creation, tax, agreements, banking, review metadata, or submission.
- Live billing activation.
- Production database, encryption-key, or deployment credentials.
- Any request to publish, charge, send externally, or delete production data.

All other reversible, local, fixture-driven work proceeds.
