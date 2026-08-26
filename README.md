# Canon

Second brain and Global Library of the **Agent Operating Company**.

Canon is the single source of truth for roles, skills, policies, and evidence.
Every input — without exception — routes through the Agent Operating Company
and is grounded here.

```
HUMAN AUTHORITY
└── AGENT OPERATING COMPANY
    ├── 10 PERMANENT DIVISIONS
    ├── CANON (this repository)
    └── AGENTIC EXECUTION LAYER
```

Repository: https://github.com/Full-Stack-Assets/Canon

Aether Portfolio is a **separate** product. Do not force this architecture onto it.

## Phase 1 — Central enforcement

Exact files live in [`enforcement/`](enforcement/):

| File | Purpose |
| --- | --- |
| `SYSTEM-PROMPT.txt` | Paste-ready system prompt |
| `RULE-SET.md` | Operating rules |
| `AGENT-PASSPORT.yaml` | Default operator passport |
| `UNIVERSAL-INPUT-ROUTING.md` | Routing policy |
| `PREFLIGHT.md` | Gate + fail-closed |
| `PREFLIGHT-RECEIPT.schema.json` | Receipt schema |
| `SILENT-UPDATE.md` | VERSION-driven reload |
| `VISIBLE-VERIFICATION.md` | Status marker contract |
| `sync.sh` | One-command platform copy |

```sh
./enforcement/sync.sh --target cursor
./enforcement/sync.sh --list
```

## Phase 2 — Preflight

- Prompt-level: emit a receipt first. See `enforcement/PREFLIGHT.md`.
- Tool: `node preflight/run_preflight.mjs "<input>"`
- Exit `2` on ESCALATE, `1` on FAIL, `0` on PASS.

## Phase 3 — Platform wiring

Ready-to-paste packs in [`platforms/`](platforms/) for Cursor, ChatGPT, Gemini,
Manus, Copilot, ClickUp, plus the Actions workflow.

## Phase 4 — Git + CI

Soft hooks in [`.githooks/`](.githooks/). Enable with:

```sh
./enforcement/bootstrap.sh --install
```

The bootstrap enables `core.hooksPath` for the current clone, synchronizes the
repository-backed Cursor and Copilot entrypoints, and verifies executable modes,
file parity, and the central checksum manifest. Re-run the read-only check with
`./enforcement/bootstrap.sh --check`.

PR check workflow: [`.github/workflows/aoc-preflight.yml`](.github/workflows/aoc-preflight.yml).
It is eligible to become a required check only after separate approval of
`main` protection.

To make `commit-msg` a **hard** blocker later, set `AOC_HOOKS_HARD=1` (documented
in `.githooks/README.md`).

## Phase 5 — Divisions and roles

- [`aoc/PORTFOLIO.yaml`](aoc/PORTFOLIO.yaml) — top-level AOC portfolio
- [`aoc/divisions/`](aoc/divisions/) — ten permanent division manifests
- [`aoc/roles/`](aoc/roles/) — RoleSpecs including `site-factory-operator` and `cost-controller`

Do not invent a parallel registry.

## Phase 6 — Visible verification

Surfaces must show exactly one of:

`[AOC/Canon • Preflight PASS]`
`[AOC/Canon • Preflight ESCALATE]`
`[AOC/Canon • Preflight FAIL]`

or, if no receipt yet, `[AOC/Canon • Preflight REQUIRED]`.

## Phase 7 — Read-only MCP access

The dependency-free server in [`mcp/`](mcp/) exposes bounded `search`, `fetch`,
and typed canonical lookup tools over Streamable HTTP at `POST /mcp` or stdio.
All tools are declared read-only, return source links, and preserve evidence gaps.
It also includes a persistent Cloudflare Worker target with a deterministic
build-time Canon snapshot, avoiding tunnels and always-on personal infrastructure.

```sh
npm test
npm run mcp
npm run worker:deploy
```

Deployment, OAuth, ChatGPT registration, and any future write tools remain
Human Authority gates. See [`mcp/README.md`](mcp/README.md) for the operating
boundary and configuration.

## Revenue-ready release gate

Every commercial portfolio project must pass the evidence-backed
[Revenue-Ready First-Iteration Release Gate](aoc/revenue/REVENUE-READY-RELEASE-GATE.md)
before its first customer-facing iteration and every later commercial release.
A missing or non-PASS `.aoc/revenue-ready-release.json` blocks release.
The repository includes a schema, failing-by-default template, portable GitHub
Action, and automated validator tests.

## Central enforcement status

| Control | Current evidence | Status |
| --- | --- | --- |
| Hook implementation | Three soft hooks are committed with executable modes; bootstrap verifies them | Ready per clone |
| Hook activation | `bootstrap.sh --install` writes clone-local `core.hooksPath` | Must run once in each clone |
| Cursor | `.cursor/SYSTEM.md` and always-applied `.cursor/rules/aoc.mdc` are synchronized | Active in this repository |
| Copilot | `.github/copilot-instructions.md` is synchronized | Active in this repository |
| GitHub Actions | `aoc-preflight` exists, runs on pull requests, and verifies bootstrap drift | Active |
| `main` protection | Balanced policy approved; exact payload recorded in `aoc/configuration/GITHUB-MAIN-PROTECTION.json` | **Activation blocked: GitHub administration write access required** |
| ChatGPT, Gemini, Manus, ClickUp | Canon contains prepared packs only | External activation not claimed |

## Next human actions

1. Run `./enforcement/bootstrap.sh --install` once in every new Canon clone.
2. Apply the approved payload in
   `aoc/configuration/GITHUB-MAIN-PROTECTION.json` using an authenticated GitHub
   principal with repository administration write access, then run its listed
   post-activation verification. Bootstrap does not change repository settings.
3. Activate the prepared non-repository operator packs only in their respective
   external settings surfaces.
4. Review and approve the MCP deployment/authentication path before external exposure.
5. Keep Aether Portfolio in its own repository.

