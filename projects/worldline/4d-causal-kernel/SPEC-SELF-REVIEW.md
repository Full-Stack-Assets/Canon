# Worldline 4D Causal Kernel Spec Self-Review

Date: 2026-08-27  
WorldGen spec commit: `2a7eaa93d87ef876dadd96aa0b7ced8f70d19e05`  
WorldGen draft PR: `Full-Stack-Assets/WorldGen#26`

## Result

PASS for Human Authority written-spec review.

## Placeholder scan

The specification contains no `TBD`, `TODO`, unfinished placeholder section, or delegated requirement such as “add appropriate validation later.” Deferred production persistence is explicitly scoped as a separate Human Authority-gated Work Item, while the persistence interface and append-only requirements are defined in the current design.

## Internal consistency

The specification consistently applies one authority path:

`proposal -> validation -> deterministic execution -> invariant checks -> independent replay -> policy gate -> transition receipt -> canonical revision`

No agent, generated harness, projection adapter, renderer, benchmark, or external model receives a bypass around that path.

The state/render boundary is consistent with the existing Worldline runtime contract: session/view changes and renderer changes remain non-canonical, while durable causal transitions are admitted through the kernel.

The epistemic policy is consistent with existing Worldline classes. `OBSERVED` and `RECONSTRUCTED` remain evidence-bound, while general model-generated mechanisms are limited to `SIMULATED`, `GENERATED`, and `SPECULATIVE` consequences.

The authority layering remains explicit: Canon is the governing source for policy, approvals, provenance requirements, and mechanism authority; Worldline implements the governed runtime that materializes and admits world-state revisions. The design does not create a second independent governance authority inside Worldline.

## Scope check

The design is large but cohesive around one subsystem boundary: the causal state-admission kernel. Renderer envelopes, harness provenance, state/session separation, and append-only persistence are dependencies of that same trust boundary rather than independent products.

Production database migration is intentionally excluded from the first implementation and remains a separate gated Work Item. This keeps the implementation plan reviewable and prevents a design approval from silently authorizing production persistence changes.

## Ambiguity check

The following choices are explicit:

- v1 canonical revisions have exactly one parent; merge revisions are excluded;
- v1 executes typed data-only Transition IR, not arbitrary agent-generated code;
- new agent-generated mechanism versions are always human-gated before `APPROVED_EXECUTABLE`;
- approved mechanisms may auto-admit individual low-risk executions only when their policy explicitly permits it and every deterministic gate passes;
- renderer feedback cannot re-enter canonical truth except through a separate evidence or transition proposal;
- benchmark scores remain orthogonal to canonical truth admission;
- wall-clock receipt metadata is excluded from deterministic revision commitments;
- production persistence is not changed by the design PR.

## Repository-change verification

WorldGen review branch `design/worldline-4d-causal-kernel-2026-08-27` is one commit ahead of `main` and changes exactly one file:

`docs/superpowers/specs/2026-08-27-worldline-4d-causal-kernel-design.md`

The design commit adds 619 documentation lines and changes no runtime code, CI, production configuration, database schema, renderer implementation, or deployment surface.

## Exact next gate

Human Authority reviews the committed written specification in WorldGen draft PR #26. No implementation plan or runtime code should be created until that written-spec review is explicitly approved.
