# SubscriptionSweep: Apple Trial Guard - Design Specification

**Status:** Human-approved design, written specification pending final review  
**Date:** 2026-08-24  
**Work Item:** `WI-2026-08-24-SUBSCRIPTIONSWEEP-APPLE-TRIAL-GUARD`  
**BuildGraph outcome:** `EXTEND_EXISTING`  
**Implementation namespace:** `CREATE_NEW`, justified because no SubscriptionSweep or RenewalLens code repository exists in the connected GitHub estate  
**Authority ceiling:** Medium for reversible design, planning, and local or simulated implementation. Credentials, signing, production deployment, live billing, and App Store submission remain separately gated.

## 1. Product definition

SubscriptionSweep: Apple Trial Guard is a native iPhone application with a companion web SaaS. Its job is to turn a new Apple-billed subscription signup into an evidence-backed subscription record and a set of reminders that fire before a free trial ends or a paid renewal occurs.

The product is not a universal Apple Account monitor. It detects supported subscriptions from permitted receipt or confirmation sources, asks for confirmation when evidence is incomplete, and sends the user to Apple's native subscription-management interface to perform any cancellation.

### Primary outcome

A supported Apple subscription signup produces:

1. One normalized subscription record.
2. A clear evidence state.
3. A trial-end or renewal date, or an explicit request for the user to supply one.
4. A deterministic reminder schedule.
5. A cancellation handoff that remains under the user's control.
6. An audit trail showing what source caused each reminder.

### Target users

- Individuals who frequently start free or discounted trials.
- Apple customers managing multiple recurring App Store subscriptions.
- Households that want a shared renewal calendar in a later phase.

## 2. Product boundary

### In scope for Release 1

- Native SwiftUI iPhone application.
- Sign in with Apple, with a local demo identity until credentials are configured.
- Private email-forwarding address for automatic Apple receipt ingestion.
- Share Extension for forwarding an Apple receipt or confirmation into the app.
- Manual add flow for unsupported or missing receipts.
- Deterministic receipt parser with a versioned synthetic fixture corpus.
- Evidence states: `VERIFIED`, `INFERRED`, and `NEEDS_CONFIRMATION`.
- Configurable trial, monthly, and annual reminder policies.
- Local iOS notifications.
- Optional Apple Reminders synchronization through EventKit.
- Server push and email reminder adapters, initially simulated unless credentials are present.
- Apple's native subscription-management sheet.
- Cancellation outcome tracking.
- Responsive web dashboard.
- Privacy export, disconnect, and deletion controls.
- Audit records and verification reporting.
- StoreKit test-mode subscription for Apple Trial Guard's own premium tier.

### Deferred to Release 1.1

- Direct Gmail OAuth ingestion.
- Direct Microsoft Outlook OAuth ingestion.
- Incremental mailbox synchronization and health monitoring.
- Multi-device push registration and delivery reconciliation.
- Production email delivery and inbound email provider activation.

### Deferred to Release 2

- Non-Apple subscription detection.
- Bank or card transaction adapters.
- Household sharing.
- Duplicate-service detection across Apple and direct-billed subscriptions.
- Usage-based "keep or cancel" recommendations.
- Realized savings analytics.
- Cancellation confirmation through authoritative provider integrations where available.

### Explicitly out of scope

- Collecting an Apple Account password.
- Scraping Apple Account or Settings screens.
- Reading every subscription on a user's Apple Account through StoreKit.
- Canceling a subscription automatically.
- Claiming that opening the management sheet canceled anything.
- Treating inferred savings as realized savings.
- Retaining full mailbox contents by default.
- Using model-generated dates, prices, or merchant identities as verified facts.
- Sending external messages or activating paid services without authorization.

## 3. Apple platform constraint

StoreKit's transaction history is scoped to purchases for the developer's own app. It cannot be used by Apple Trial Guard to enumerate unrelated subscriptions purchased from other App Store developers. Detection therefore comes from user-permitted receipts, confirmations, forwarding, sharing, or manual entry.

The app uses Apple platform APIs only for capabilities they support:

- `Transaction.all` and StoreKit 2 manage Apple Trial Guard's own entitlement.
- `AppStore.showManageSubscriptions(in:)` presents Apple's subscription-management sheet.
- `UNUserNotificationCenter` schedules local notifications.
- `EKEventStore` creates optional Apple Reminders after permission is granted.
- Sign in with Apple authenticates the user once the Apple developer configuration is available.

The system must never blur these boundaries in UI copy, marketing, tests, or verification reports.

## 4. User journeys

### 4.1 First-run setup

1. The user launches the iPhone app.
2. The app explains its limitation: it cannot silently read every Apple Account subscription.
3. The user signs in with Apple or enters demo mode.
4. The user grants or declines notification access.
5. The user optionally grants full access to Reminders.
6. The app offers three ingestion methods:
   - Forward Apple receipts automatically to a private address.
   - Share an Apple receipt into the app.
   - Add a subscription manually.
7. The user reviews default reminder timing.
8. The app displays a setup-completeness screen and an exact next action.

Permission denial does not block the account. The product degrades to available channels and continually shows which channels are active.

### 4.2 Automatic receipt flow

1. An Apple receipt or subscription confirmation reaches the user's private forwarding address.
2. The inbound gateway verifies the destination alias, rate limits the request, parses MIME safely, and stores a content hash.
3. Sender and authentication headers are evaluated as evidence, never as absolute proof.
4. The deterministic parser extracts candidate service, amount, currency, interval, start date, trial end, renewal date, and order reference.
5. The normalizer produces a `SubscriptionEvidence` record and an evidence state.
6. Deduplication checks source hash, order reference, service identity, account, and effective renewal date.
7. The reminder policy engine creates or reconciles reminders.
8. The user receives a confirmation or a `NEEDS_CONFIRMATION` prompt.

### 4.3 Share Extension flow

1. The user opens an Apple email or compatible receipt document.
2. The user shares it to Apple Trial Guard.
3. The extension sends a minimized payload to the main app through an app group container.
4. The same parser, evidence, deduplication, and reminder workflow runs locally or through the API.
5. The user sees the result immediately.

### 4.4 Cancellation reminder flow

1. A local, push, email, or Apple Reminder notification fires.
2. The app opens the corresponding subscription detail.
3. The user sees the service, amount, renewal date, evidence state, and reminder source.
4. The user selects one of:
   - `Manage Apple Subscriptions`
   - `Keep Subscription`
   - `Mark Canceled`
   - `Remind Me Later`
5. `Manage Apple Subscriptions` presents Apple's native sheet.
6. Returning from the sheet does not change the subscription outcome automatically.
7. The app asks the user whether cancellation was completed.
8. Only an explicit answer marks the outcome `USER_REPORTED_CANCELED`.

## 5. System architecture

### 5.1 Repository structure

The implementation should use one monorepo with clear platform boundaries:

```text
apps/
  ios/                         SwiftUI application and Share Extension
  web/                         Next.js user dashboard and account portal
services/
  api/                         TypeScript API
  worker/                      Ingestion, scheduling, push, and email jobs
packages/
  contracts/                   JSON Schema and OpenAPI contracts
  domain/                      Subscription, evidence, reminder, and outcome rules
  parser-apple-receipts/       Deterministic parsing and fixture tests
  reminder-policy/             Pure scheduling functions
  database/                    PostgreSQL schema, migrations, and repositories
  security/                    Encryption envelopes, hashing, redaction, audit helpers
fixtures/
  apple-receipts/              Synthetic and redacted test messages by locale
docs/
  architecture/
  operations/
  privacy/
  verification/
```

The Swift application consumes generated API contracts but does not share runtime code with TypeScript. Domain behavior that must match across platforms is expressed through versioned schemas and contract fixtures.

### 5.2 iOS application

**Stack**

- Swift 6
- SwiftUI
- Swift Concurrency
- StoreKit 2
- UserNotifications
- EventKit
- AuthenticationServices
- App Intents
- Keychain
- Share Extension and App Group container

**Primary modules**

- `AppSession`: identity, entitlement, environment, and synchronization state.
- `SubscriptionRepository`: local cache and API synchronization.
- `ReceiptImportCoordinator`: manual, share, and forwarding-result imports.
- `ReminderCoordinator`: local notification and EventKit reconciliation.
- `SubscriptionManagementPresenter`: Apple's management sheet.
- `PermissionCenter`: notification and Reminders authorization state.
- `AuditTimeline`: user-readable activity and provenance.
- `PrivacyCenter`: export, disconnect, and delete flows.

The iOS app must remain useful offline for viewing subscriptions and already scheduled local reminders. Mutations are queued with idempotency keys and reconciled when connectivity returns.

### 5.3 SaaS control plane

**Stack**

- TypeScript
- Next.js
- PostgreSQL
- Drizzle ORM or an equivalent migration-first typed data layer
- A durable job queue supported by the selected deployment target
- OpenAPI and JSON Schema contracts
- Structured logging with sensitive-field redaction
- Provider adapters for inbound email, APNs, transactional email, Gmail, Outlook, and billing

**Services**

- `identity-service`
- `inbound-receipt-service`
- `receipt-parser-service`
- `subscription-service`
- `reminder-policy-service`
- `notification-delivery-service`
- `entitlement-service`
- `privacy-service`
- `audit-service`

The first deployment must be serverless or managed. No home server or always-on personal computer is part of the architecture.

## 6. Data model

### 6.1 Core entities

#### User

- `id`
- `apple_subject`
- `primary_email`
- `timezone`
- `locale`
- `status`
- `created_at`
- `deleted_at`

#### MailboxConnection

- `id`
- `user_id`
- `provider`
- `status`
- `scopes`
- `encrypted_token_envelope`
- `last_sync_cursor`
- `last_success_at`
- `last_error_code`
- `disconnected_at`

#### InboundAddress

- `id`
- `user_id`
- `alias`
- `status`
- `rotated_at`
- `last_message_at`

#### SourceMessage

- `id`
- `user_id`
- `source_kind`
- `provider_message_id`
- `content_hash`
- `sender_domain`
- `authentication_summary`
- `received_at`
- `retention_state`
- `redacted_excerpt`
- `raw_content_expires_at`

#### ExtractionRun

- `id`
- `source_message_id`
- `parser_version`
- `result`
- `confidence`
- `warnings`
- `created_at`

#### Subscription

- `id`
- `user_id`
- `service_name`
- `normalized_service_key`
- `billing_owner`
- `amount_minor`
- `currency`
- `billing_interval`
- `start_at`
- `trial_end_at`
- `renewal_at`
- `timezone`
- `evidence_state`
- `lifecycle_state`
- `created_at`
- `updated_at`

#### SubscriptionEvidence

- `id`
- `subscription_id`
- `source_message_id`
- `field_name`
- `field_value`
- `evidence_kind`
- `source_excerpt`
- `source_location`
- `confidence`
- `created_at`

#### ReminderPolicy

- `id`
- `user_id`
- `scope`
- `trial_offsets`
- `monthly_offsets`
- `annual_offsets`
- `channels`
- `quiet_hours`
- `version`
- `active`

#### Reminder

- `id`
- `subscription_id`
- `policy_version`
- `kind`
- `scheduled_for`
- `state`
- `idempotency_key`
- `superseded_by`
- `created_at`

#### NotificationDelivery

- `id`
- `reminder_id`
- `channel`
- `provider`
- `attempt`
- `state`
- `provider_reference`
- `error_code`
- `delivered_at`

#### CancellationOutcome

- `id`
- `subscription_id`
- `state`
- `reported_by`
- `reported_at`
- `evidence_reference`
- `notes`

#### AuditEntry

- `id`
- `user_id`
- `actor_kind`
- `action`
- `object_type`
- `object_id`
- `before_hash`
- `after_hash`
- `source_reference`
- `created_at`

### 6.2 Required states and invariants

**Evidence state**

- `VERIFIED`: The source explicitly states the relevant future date or billing fact.
- `INFERRED`: The value is derived only from explicit source facts and a deterministic rule.
- `NEEDS_CONFIRMATION`: Evidence is missing, contradictory, unsupported, or below threshold.

**Subscription lifecycle**

- `CANDIDATE`
- `ACTIVE`
- `KEPT`
- `USER_REPORTED_CANCELED`
- `EXPIRED`
- `UNKNOWN`

**Reminder state**

- `PLANNED`
- `SCHEDULED`
- `DELIVERED`
- `ACKNOWLEDGED`
- `CANCELED`
- `SUPERSEDED`
- `FAILED`

**Invariants**

1. `NEEDS_CONFIRMATION` cannot silently become `VERIFIED`.
2. A reminder cannot exist without a subscription and policy version.
3. Reprocessing the same idempotency key cannot create a second active reminder.
4. Changing a renewal date supersedes obsolete reminders and schedules replacements.
5. Opening Apple's management sheet cannot mutate cancellation state.
6. Savings remain estimated until a canceled outcome and avoided charge are independently supported.
7. Deleting a user revokes tokens, cancels jobs, removes pending notifications on the device at next sync, and deletes or irreversibly anonymizes server records according to the retention policy.

## 7. Receipt ingestion and parsing

### 7.1 Inbound gateway

The gateway must:

- Accept messages only for valid private aliases.
- Limit message size and attachment types.
- Parse MIME with a hardened library.
- Strip active content.
- Treat HTML, links, attachments, and instructions as untrusted.
- Preserve delivery metadata separately from message content.
- Compute a SHA-256 content hash before normalization.
- Apply per-user and per-source rate limits.
- Quarantine unsupported or suspicious messages.
- Expire raw content after parsing unless the user explicitly retains it.

### 7.2 Deterministic parser stages

1. Normalize character encoding and Unicode.
2. Select plain text or safely rendered text.
3. Detect probable Apple billing templates by sender evidence and structural markers.
4. Identify locale, currency, and date format.
5. Extract order reference, service, amount, interval, start date, trial end, and renewal date.
6. Record the exact excerpt supporting each field.
7. Apply deterministic inference rules.
8. Validate internal consistency.
9. Emit a typed parse result with warnings and parser version.
10. Store only minimized evidence and the content hash by default.

An AI parser is not required for Release 1. A future fallback may propose fields for user review, but every AI-derived field must remain `NEEDS_CONFIRMATION` until a human confirms it.

### 7.3 Inference rules

Inference is permitted only when all required inputs are explicit. Examples:

- An explicit start date plus an explicit one-month interval may produce an inferred next renewal date.
- An explicit trial length plus an explicit start date may produce an inferred trial end.
- A billing amount cannot be inferred from a marketing price or prior unrelated receipt.
- A locale-ambiguous date cannot be inferred without corroboration.
- A missing timezone uses the user's account timezone and is labeled inferred.

Every inference stores the rule ID and source inputs.

### 7.4 Deduplication

The deduplication key is composed from the strongest available fields:

1. Provider message ID.
2. Content hash.
3. Apple order or transaction reference.
4. User, normalized service key, amount, interval, and effective date.
5. Fuzzy similarity only as a candidate signal, never as the sole merge authority.

A merge preserves all evidence references and produces an audit entry.

## 8. Reminder policy

### 8.1 Default timing

| Subscription type | Default offsets |
| --- | --- |
| Free or discounted trial | 48 hours and 24 hours before trial end |
| Monthly paid subscription | 7 days and 2 days before renewal |
| Annual paid subscription | 30 days, 7 days, and 2 days before renewal |
| Unknown or contradictory date | Immediate confirmation request |

Apple's support guidance says a free or discounted trial should be canceled at least 24 hours before it ends. The 48-hour reminder provides a buffer and the 24-hour reminder preserves the final Apple-aligned safeguard.

### 8.2 Scheduling rules

- Do not schedule a reminder in the past.
- If the first normal offset has passed, create the nearest safe reminder and an immediate alert.
- Respect the user's timezone and daylight-saving changes.
- Quiet hours shift a reminder earlier, never beyond the renewal deadline.
- Repeating subscriptions generate the next cycle only after the current renewal date is confirmed or advanced.
- Local iOS reminders use stable identifiers so obsolete requests can be removed.
- The server and device reconcile by reminder idempotency key.
- The device schedules the nearest bounded set of local reminders and refreshes on app launch, push, background opportunity, or manual sync.
- A denied notification permission leaves email, in-app, or EventKit channels available and displays a degraded-state banner.

## 9. User interface

### 9.1 iPhone navigation

Four primary tabs:

1. **Today**: urgent confirmations and upcoming reminders.
2. **Subscriptions**: active, kept, canceled, expired, and unknown records.
3. **Add**: share/import instructions and manual entry.
4. **Settings**: sources, permissions, reminder rules, billing, privacy, and support.

### 9.2 Subscription detail

The detail screen shows:

- Service name and icon when rights-cleared.
- Amount and interval.
- Trial end or renewal date.
- Evidence badge.
- Source and parser version.
- Scheduled reminders and active channels.
- `Manage Apple Subscriptions`.
- `Keep Subscription`.
- `Mark Canceled`.
- `Remind Me Later`.
- Audit timeline.

### 9.3 Confirmation queue

Every low-confidence record is presented as a compact field-review task. The user can confirm, edit, reject, or merge it. Editing a source-derived field creates a user assertion beside the source evidence; it never rewrites the original evidence.

### 9.4 Web dashboard

The web SaaS mirrors:

- Upcoming renewals.
- Subscription inventory.
- Confirmation queue.
- Reminder policy.
- Connected sources.
- Delivery history.
- Privacy controls.
- Entitlement and billing state.

The web interface does not attempt to replace the native Apple subscription-management sheet.

## 10. Permissions and failure handling

### Notifications denied

- Record the authorization state.
- Do not repeatedly prompt.
- Offer a settings deep link only after user action.
- Schedule no local requests.
- Continue through email, in-app, and optional Reminders channels.

### Reminders denied

- Do not create EventKit objects.
- Remove the channel from the active policy.
- Preserve other channels.
- Show the exact permission state and recovery action.

### Mailbox disconnected or token expired

- Stop future sync immediately.
- Preserve already extracted subscription records unless the user deletes them.
- Mark source health `AUTHENTICATION_REQUIRED`.
- Never claim the mailbox is still monitored.

### Parser ambiguity

- Create `NEEDS_CONFIRMATION`.
- Include the source excerpt and uncertainty.
- Schedule an immediate confirmation prompt rather than a cancellation date.

### Inbound provider outage

- Queue provider events idempotently.
- Retry with bounded exponential backoff.
- Record delayed state and source health.
- Never fabricate an empty "all clear" result.

### Apple management sheet failure

- Show Apple's returned error in user-safe language.
- Offer the documented Settings path as a manual fallback.
- Do not mark any outcome.

## 11. Security and privacy

### Data minimization

- Store full email bodies only in a short-lived encrypted parsing buffer.
- Default raw-content expiration is 24 hours after successful parsing.
- Retain minimized evidence excerpts, hashes, timestamps, and structured fields.
- Allow the user to preserve a receipt explicitly when desired.
- Do not ingest unrelated mailbox content.

### Credential protection

- Use OAuth with least-privilege scopes.
- Encrypt provider tokens with envelope encryption.
- Keep encryption keys outside the database.
- Store device secrets in Keychain.
- Rotate private inbound aliases.
- Revoke tokens on disconnect and deletion.

### Input safety

- Sanitize HTML.
- Never follow instructions contained in email or attachments.
- Block executable attachments.
- Limit decompression and nested MIME depth.
- Validate all external URLs before presentation.
- Escape user and source content in logs and UI.
- Redact tokens, addresses, order identifiers, and message excerpts from telemetry.

### Authorization and isolation

- Every server query is scoped by authenticated user ID.
- Row-level authorization is enforced in the repository layer and tested.
- Background jobs carry a signed, expiring task envelope.
- Administrative access is audited and disabled by default.
- No support operator can view raw message content without explicit, time-bounded user authorization.

### Deletion

Account deletion must:

1. Revoke mailbox tokens.
2. Disable inbound aliases.
3. Cancel queued jobs.
4. Delete source bodies, excerpts, subscriptions, reminders, and deliveries.
5. Tombstone required security events without retaining message content.
6. Instruct registered devices to remove pending local notifications at next contact.
7. Produce a deletion receipt visible to the user.

## 12. Authentication and monetization

### Authentication

- Sign in with Apple is the primary consumer identity.
- A web session uses the same account through an approved server validation flow.
- Demo mode uses local synthetic data and cannot connect live providers or purchase a plan.
- Account linking requires a verified identity match and explicit user action.

### Premium entitlement

The initial plan is `Auto`, proposed at `$19.99/year`.

For the iOS app, premium digital functionality is sold through StoreKit in-app purchase. A web subscription may also exist, but the same premium tier must be available through in-app purchase, and entitlement synchronization must prevent accidental double subscription. The product must check current entitlements before presenting any purchase action and clearly explain the billing channel.

Release 1 includes:

- StoreKit configuration file for local testing.
- Purchase, restore, renewal-state, expiration, refund, and revocation handling.
- Server entitlement contract.
- Simulated web billing adapter until live commercial activation is approved.

Live pricing, App Store products, and Stripe products are not production-complete until account credentials, product identifiers, tax settings, review metadata, and live verification exist.

## 13. Observability and audit

Metrics must not contain sensitive message content.

Required operational signals:

- Inbound messages accepted, rejected, quarantined, and deduplicated.
- Parser success by template, locale, and parser version.
- `NEEDS_CONFIRMATION` rate.
- Reminder creation and reconciliation failures.
- Delivery attempt, delivered, delayed, and failed counts by channel.
- Permission-state distribution.
- Source connection health.
- Deletion workflow completion.
- Duplicate purchase prevention events.
- Subscription-management sheet presentation success or failure.
- User-reported cancellation outcomes.

Audit entries are append-only at the application layer and include before and after hashes for material state changes.

## 14. Testing strategy

### Unit tests

- Date and currency parsing by locale.
- Trial, monthly, and annual schedule generation.
- Daylight-saving and timezone transitions.
- Inference rule boundaries.
- Idempotency key generation.
- Deduplication ranking.
- Evidence-state transitions.
- Entitlement state transitions.
- Redaction and retention calculations.

### Fixture tests

Use synthetic or fully redacted receipts for:

- Free trial confirmation.
- Discounted trial.
- Monthly subscription.
- Annual subscription.
- Family Sharing wording.
- Refund and revocation notice.
- Renewal price change.
- Ambiguous numeric date.
- Missing renewal date.
- Duplicate forwarded message.
- Malicious HTML and prompt-injection text.
- Unsupported language.
- Attachment-only receipt.

Fixture snapshots must store parser version and expected evidence excerpts.

### API integration tests

- Authentication and tenant isolation.
- Inbound alias verification.
- MIME parsing limits.
- Subscription creation and merge.
- Reminder reconciliation.
- Provider retry and idempotency.
- Disconnect and token revocation.
- Export and deletion.
- Billing webhook replay protection.

### iOS tests

- Onboarding and permission variants.
- Share Extension handoff.
- Local notification scheduling and removal.
- EventKit permission and reminder creation.
- Offline mutation queue.
- AppStore subscription-management sheet presentation.
- StoreKit test purchase and restore.
- Accessibility, Dynamic Type, VoiceOver labels, and reduced motion.

### End-to-end acceptance tests

1. A valid synthetic Apple trial receipt creates one subscription and two trial reminders.
2. An explicit annual renewal creates 30-day, 7-day, and 2-day reminders.
3. An ambiguous receipt creates no date-based reminder and enters `NEEDS_CONFIRMATION`.
4. Reprocessing the same message produces no duplicate subscription or active reminder.
5. Editing a renewal date supersedes old reminders and schedules replacements.
6. Denying notifications preserves the remaining channels.
7. Tapping the management action presents Apple's sheet and does not mark cancellation.
8. Disconnecting a source stops future sync.
9. Deleting the account removes stored data and generates a receipt.
10. Verification output labels local, simulated, credential-blocked, and production-verified capabilities accurately.

## 15. Deployment and release gates

### Local development gate

- Reproducible setup.
- Database migrations.
- Synthetic fixtures only.
- Unit, integration, and iOS tests pass.
- No secrets committed.
- StoreKit local configuration works.

### Staging gate

- Managed PostgreSQL and job queue.
- Test inbound email domain.
- Sandbox APNs.
- Sandbox or test email provider.
- Apple sandbox entitlement flow.
- Source health and audit dashboards.
- Restore and deletion drills.
- Threat model review.

### Production gate

Production is blocked until all of the following exist:

- Apple Developer account and signing configuration.
- App identifier, associated domains, App Groups, push, Sign in with Apple, and StoreKit products.
- Privacy policy and App Privacy disclosures.
- Mailbox OAuth applications and reviewed scopes, when direct connectors are enabled.
- Production inbound email domain and DNS authentication.
- Production database backup and restoration evidence.
- Encryption key management.
- Incident response and support workflow.
- App Store screenshots, metadata, review notes, and reviewer access.
- Verified purchase, restore, notification, reminder, deletion, and cancellation-handoff flows.
- Explicit Human Authority for submission and live billing activation.

## 16. Verification report contract

Every implementation checkpoint reports:

- Repository and commit SHA.
- Files and components changed.
- Commands executed.
- Tests passed, failed, skipped, or blocked.
- Integrations in `SIMULATED`, `CONFIGURED`, `VERIFIED`, or `DEGRADED` state.
- Credentials or human actions still required.
- Known limitations.
- Rollback path.
- Evidence references.

No build, deployment, ingestion, notification, purchase, cancellation, or deletion claim may be marked verified without direct evidence.

## 17. Risks and mitigations

| Risk | Mitigation |
| --- | --- |
| Apple does not expose unrelated App Store subscriptions to the app | Use receipts, sharing, forwarding, and manual entry; state the limitation clearly. |
| Apple email templates or locales change | Version parsers, maintain fixtures, monitor `NEEDS_CONFIRMATION` rate, and fail to review rather than invent. |
| Free trial confirmation lacks a usable date | Prompt immediately for the date and explain how to locate it. |
| Email access creates privacy concern | Make private forwarding the default, direct mailbox access optional, and minimize retained content. |
| Duplicate reminders annoy users | Use idempotency keys, reminder reconciliation, and stable local identifiers. |
| User assumes opening the management sheet cancels the plan | Require explicit outcome confirmation and never auto-mark cancellation. |
| App Store payment rejection | Use StoreKit for iOS premium features and keep the business model explicit in review notes. |
| User buys both web and iOS plans | Resolve entitlements before purchase and block or warn on an active plan from another channel. |
| Notifications are denied or suppressed | Support multiple channels and show delivery health. |
| Sensitive receipt content leaks into logs | Central redaction, allowlisted telemetry fields, and automated leak tests. |

## 18. Definition of done

Release 1 is complete only when:

- The primary receipt-to-reminder workflow works end to end with synthetic fixtures.
- All required evidence states and lifecycle invariants are enforced.
- Parser, scheduler, deduplication, permission, tenant-isolation, and deletion tests pass.
- The iOS app presents Apple's subscription-management sheet.
- StoreKit test entitlement works for Apple Trial Guard's own premium tier.
- The web dashboard and iOS app operate against the same contracts.
- Privacy controls are functional, not decorative.
- A verification report truthfully separates simulated, credential-blocked, staged, and production-verified capabilities.
- Source, tests, documentation, and receipts are committed in the canonical implementation repository.
- App Store submission remains unclaimed until separately authorized and verified.

## 19. Primary references

Accessed 2026-08-24:

- Apple Developer Documentation, `Transaction.all`: https://developer.apple.com/documentation/storekit/transaction/all
- Apple Developer Documentation, `AppStore.showManageSubscriptions`: https://developer.apple.com/documentation/storekit/appstore
- Apple Developer Documentation, scheduling local notifications: https://developer.apple.com/documentation/usernotifications/scheduling-a-notification-locally-from-your-app
- Apple Developer Documentation, `EKEventStore`: https://developer.apple.com/documentation/eventkit/ekeventstore
- Apple Support, canceling a subscription: https://support.apple.com/en-us/118428
- Apple App Review Guidelines: https://developer.apple.com/app-store/review/guidelines/

## 20. Next gate

The next gate is Human Authority review of this committed specification. Once approved, the only next process skill is implementation planning. Code scaffolding and implementation begin after that plan is produced.
