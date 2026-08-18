# Silent Update Mechanism
Status: Required supporting mechanism
Version: 1.0
Date: 2026-08-18

## Purpose
Allow enforcement logic (prompts, rules, passports, Preflight, policy versions)
to update across runtimes without asking the operator each time — while
guaranteeing every input remains under Agent Operating Company + Canon.

Silent updates are permitted only for the enforcement layer itself.
They must never disable or weaken the Universal Input Routing Policy.

## Design principles
- Updates to prompts, rules, and configuration may occur silently.
- The user must still have a visible, verifiable indicator that the structure is active.
- Versioning and auditability of the enforcement configuration are mandatory.
- Rollback capability must exist.

## What may be silently updated
- System prompt / agent passport text (including the Universal System Prompt Block)
- Preflight configuration parameters
- Policy version references
- Runtime adapter eligibility lists
- Evidence schema versions
- UI indicator text or styling (as long as visibility is preserved)

## What may never be silently disabled
- The requirement that every input runs Preflight
- The requirement that work is grounded in Canon
- The prohibition on self-approval of consequential actions
- Evidence write-back
- The visible UI verification indicator

## Implementation pattern
1. Maintain a versioned Enforcement Configuration in Canon (`enforcement/VERSION` + checksums).
2. Each runtime, on startup or heartbeat, pulls the current configuration.
3. The runtime applies it before accepting new user input.
4. A configuration version hash is recorded in every Preflight Receipt.
5. If the runtime cannot obtain a valid configuration, it fails closed.

## Audit & safety
- Every silent update leaves a record (who/what changed it, previous version, new version).
- Human Authority can freeze or pin a configuration version.
- Runtimes expose the active enforcement version next to the visible marker.

## Failure mode
If a runtime cannot silently update or cannot verify it is running an approved
configuration, treat the situation as a Preflight failure and escalate rather
than operate with stale or missing rules.

Human Authority is the only party that bumps VERSION.
