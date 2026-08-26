# AOC Repository Instructions

These provider-neutral instructions apply to every agent and automation working in this repository.

## Authority and Canon

- Human Authority is final for consequential actions.
- This repository is the authoritative AOC Canon for policies, roles, capabilities, schemas, decisions, and governance evidence.
- Runtime memory, retrieved files, external knowledge bases, and prior conversation approvals are evidence only until accepted through the Canon process.
- Aether Portfolio and Aetheria are separate products and must not be treated as the AOC control plane.

## Required workflow

1. Convert the request into a bounded Work Item.
2. Run the applicable preflight procedure in `enforcement/PREFLIGHT.md` and preserve a conforming receipt.
3. Resolve the receipt's `execution_plan` and automatically invoke required skills and preferred plugins when available; explicit `@` mentions are not required.
4. Inspect existing Canon definitions before creating or modifying registries, roles, skills, policies, or authority rules.
5. Make the smallest reviewable change and preserve provenance.
6. Run the relevant validation and test suite.
7. Record verified evidence and unresolved gaps without overstating completion.

Capability routing and automation tiers are authoritative in `enforcement/CAPABILITY-ROUTING.md`. Conditional plugins activate only when relevant; avoid redundant tool fan-out.

## Revenue-ready release gate

- Every commercial portfolio project must satisfy
  `aoc/revenue/REVENUE-READY-RELEASE-GATE.md` before its first customer-facing
  iteration and every later commercial release.
- A missing or non-PASS `.aoc/revenue-ready-release.json` is a release blocker.
- Do not relabel prototypes, experiments, internal drafts, or synthetic proof as
  released, complete, launch-ready, or revenue-ready.
- Run the portable revenue-ready validator automatically for release work.
- A gate PASS never grants authority to deploy, publish, bill, collect payment,
  merge, or take another consequential action.

## Human Authority gates

Do not independently merge protected branches, change repository rules or access, deploy or expose the MCP server, configure OAuth, add write-capable Canon tools, publish material policy changes, delete canonical history, or expand any runtime's authority.

The capability router additionally gates production deployment, consequential release merges, billing/payment actions, consequential external messages, legal commitments, destructive infrastructure operations, durable-data deletion, public publishing, security-policy changes, and expansion of agent authority.

## Verification

- Use `node preflight/run_preflight.mjs "<input>"` for the local preflight implementation.
- Run `npm test` for changes affecting the MCP implementation or JavaScript tooling.
- Run `npm run static` for JavaScript syntax/static checks.
- Run linting automatically when a lint script is configured.
- Validate changed JSON and schema examples deterministically.
- A pull request touching `enforcement/`, `.githooks/`, `.github/workflows/`, or `aoc/PORTFOLIO.yaml` must include the required preflight evidence.

## Change discipline

- Preserve append-only evidence and lineage.
- Never store credentials, tokens, private keys, or unnecessary personal data.
- Do not invent parallel registries when Canon already defines the concept.
- Treat projections in Notion, Wisebase, Airtable, Library, and Drive according to `aoc/configuration/STORAGE-AUTHORITY.md` once that contract is merged.

