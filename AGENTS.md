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
3. Inspect existing Canon definitions before creating or modifying registries, roles, skills, policies, or authority rules.
4. Make the smallest reviewable change and preserve provenance.
5. Run the relevant validation and test suite.
6. Record verified evidence and unresolved gaps without overstating completion.

## Human Authority gates

Do not independently merge protected branches, change repository rules or access, deploy or expose the MCP server, configure OAuth, add write-capable Canon tools, publish material policy changes, delete canonical history, or expand any runtime's authority.

## Verification

- Use `node preflight/run_preflight.mjs "<input>"` for the local preflight implementation.
- Run `npm test` for changes affecting the MCP implementation or JavaScript tooling.
- Validate changed JSON and schema examples deterministically.
- A pull request touching `enforcement/`, `.githooks/`, `.github/workflows/`, or `aoc/PORTFOLIO.yaml` must include the required preflight evidence.

## Change discipline

- Preserve append-only evidence and lineage.
- Never store credentials, tokens, private keys, or unnecessary personal data.
- Do not invent parallel registries when Canon already defines the concept.
- Treat projections in Notion, Wisebase, Airtable, Library, and Drive according to `aoc/configuration/STORAGE-AUTHORITY.md` once that contract is merged.
