# Copilot — Agent Operating Company

This is the repository entrypoint for GitHub Copilot. The authoritative policy
remains in `enforcement/`; this file routes Copilot to it without duplicating
Canon.

Before substantive work, read `enforcement/SYSTEM-PROMPT.txt`,
`enforcement/PREFLIGHT.md`, and `enforcement/VERSION`, then resolve the relevant
records in `aoc/`.

- Treat every user input as an AOC Work Item under Human Authority.
- Run Preflight before acting. Stop on ESCALATE or FAIL.
- Do not invent files that duplicate `enforcement/` or `aoc/`.
- High-risk paths require a Preflight receipt in the pull-request body.
- Prefer Canon RoleSpecs over new ad-hoc agents.
- Write evidence and receipts back to Canon.
- Before any commercial release, require a PASS under
  `aoc/revenue/REVENUE-READY-RELEASE-GATE.md`; this applies from the first
  customer-facing iteration.
- No runtime may approve, release, publish, pay, merge, or change access controls
  for its own consequential output.

Show exactly one visible marker in substantive responses or review comments:
`[AOC/Canon • Preflight PASS]`, `[AOC/Canon • Preflight ESCALATE]`, or
`[AOC/Canon • Preflight FAIL]`.

