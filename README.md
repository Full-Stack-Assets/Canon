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
git config core.hooksPath .githooks
```

Required check: [`.github/workflows/aoc-preflight.yml`](.github/workflows/aoc-preflight.yml).

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

## Next human actions

1. Clone this repo and run `git config core.hooksPath .githooks`.
2. Copy enforcement into each operator surface: `./enforcement/sync.sh --target cursor`.
3. Protect `main` and require the `aoc-preflight` check.
4. Keep Aether Portfolio in its own repository.
