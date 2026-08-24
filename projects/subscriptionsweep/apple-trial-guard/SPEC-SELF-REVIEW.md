# SubscriptionSweep: Apple Trial Guard - Specification Self-Review

**Date:** 2026-08-24  
**Specification:** `docs/superpowers/specs/2026-08-24-apple-trial-guard-design.md`  
**Branch:** `spec/subscriptionsweep-apple-trial-guard-2026-08-24`  
**Result:** PASS

## Placeholder scan

- No `TBD`, `TODO`, unfinished section, or unresolved product decision remains.
- External credentials are explicitly identified as release gates rather than placeholders.

## Internal consistency

- The product does not claim universal Apple Account subscription visibility.
- Detection is consistently limited to user-permitted receipts, forwarding, sharing, or manual entry.
- Cancellation remains a user-controlled handoff to Apple's native subscription-management interface.
- `VERIFIED`, `INFERRED`, and `NEEDS_CONFIRMATION` states remain distinct throughout ingestion, UI, testing, and verification.
- Opening the management sheet never changes cancellation state.
- Release 1 supports a provider-neutral forwarding contract and local or staging adapter. Production inbound-email provider activation remains credential-gated and is scheduled with the Release 1.1 connector work.
- `MailboxConnection` is included in the canonical schema for forward compatibility but remains inactive until direct Gmail or Outlook connectors are enabled.

## Scope check

- Release 1 is a coherent vertical slice: receipt ingestion, deterministic parsing, evidence state, deduplication, reminder scheduling, iOS delivery, Apple management handoff, web visibility, privacy controls, and verification.
- Gmail, Outlook, bank data, household sharing, usage recommendations, and authoritative cancellation confirmation are deferred.
- One monorepo is appropriate because the iOS app, web surface, API, parser, contracts, and worker share one product lifecycle while preserving module boundaries.

## Ambiguity check

- Automatic means automatic after the user configures a permitted receipt source. It does not mean silent Apple Account access.
- `USER_REPORTED_CANCELED` is explicitly different from provider-verified cancellation.
- Proposed pricing is not represented as live or approved App Store pricing.
- Production deployment and App Store submission require separate Human Authority and external credentials.

## Review conclusion

The specification is internally consistent, bounded enough for one implementation plan, and ready for Human Authority review. No implementation code has been authorized by this review record alone.
