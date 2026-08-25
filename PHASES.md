# Implementation log

Shipped 2026-08-18 under Human Authority.

## Created

### Phase 1
- `enforcement/` central directory (prompt, rules, passport, routing, sync)

### Phase 2
- `enforcement/PREFLIGHT.md` + schema
- `preflight/run_preflight.mjs` (fail-closed exit codes)
- `preflight/prompt-preflight.md`

### Phase 3
- `platforms/cursor|chatgpt|gemini|manus|copilot|clickup`

### Phase 4
- `.githooks/{commit-msg,pre-commit,pre-push}` (soft)
- `.github/workflows/aoc-preflight.yml`
- `.github/PULL_REQUEST_TEMPLATE.md`

### Phase 5
- `aoc/PORTFOLIO.yaml`
- ten division manifests
- RoleSpecs including site-factory-operator and cost-controller

### Phase 6
- `enforcement/VISIBLE-VERIFICATION.md`

### Phase 7
- Dependency-free read-only MCP server in `mcp/`
- Bounded `search`, `fetch`, project, Work Item, decision, and capability tools
- HTTP, stdio, security-boundary, indexing, and protocol verification tests
- Persistent Cloudflare Worker target with deterministic Canon snapshot

## Next recommended human action

Review the external MCP hosting and authentication design, then enable hooks
(`git config core.hooksPath .githooks`) and require the `aoc-preflight` GitHub
check on `main`.
