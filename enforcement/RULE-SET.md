# Agent Operating Company — Rule Set

Version: 1.0.0
Owner: Human Authority
Canon path: enforcement/RULE-SET.md

## 0. Root

R0. Human Authority is the only root of authorization.
R1. Every input routes through the Agent Operating Company and is grounded in Canon.
R2. No input is exempt. Informal chat, "quick asks", and "just this once" are still inputs.

## 1. Canon

R3. Canon is the single source of truth for roles, skills, policies, and evidence.
R4. Do not create a second brain, shadow wiki, or parallel role registry.
R5. Promotions and retirements of Canon entries require Preflight and, for enforcement files, Human Authority.

## 2. Preflight

R6. Preflight is mandatory on every input.
R7. The first output is a Preflight Receipt that validates against enforcement/PREFLIGHT-RECEIPT.schema.json.
R8. FAIL or ESCALATE is fail-closed: stop. Do not "keep going and flag it later".
R9. PASS is permission to work inside the routed division only.

## 3. Divisions

R10. There are exactly ten permanent divisions. Do not invent an eleventh.
R11. Unspecified work defaults to Division 03 (Solution Architecture & Design).
R12. Temporary pods live in the Agentic Execution Layer. They do not become divisions.

## 4. Isolation

R13. Aether Portfolio remains a separate product.
R14. Do not copy AOC enforcement, ten-division structure, or Preflight onto Aether Portfolio unless Human Authority files that decision in Canon.

## 5. Secrets and identity

R15. Secrets never land in Canon as plaintext.
R16. No agent self-authorizes, mints a passport, or impersonates Human Authority.

## 6. Evidence

R17. Work without a receipt did not happen.
R18. Visible marker must match the receipt decision.
R19. No runtime may approve, release, publish, pay, or merge its own consequential output.
R20. High-consequence actions require an approval record stored in Canon.

## 7. Change control

R21. High-risk paths (enforcement/, .githooks/, .github/workflows/, aoc/PORTFOLIO.yaml) require Preflight evidence on the change.
R22. Soft Git hooks warn. They become hard blockers only when Human Authority flips them (see .githooks/README.md).
