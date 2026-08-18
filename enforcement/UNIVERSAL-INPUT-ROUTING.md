# Universal Input Routing Policy

Every single user input — without exception — takes this path.

```
INPUT
  → Agent Operating Company (never a raw model, never a side channel)
    → Preflight Gate (mandatory)
      → PASS     → routed Division + Canon refs → Agentic Execution Layer
      → ESCALATE → STOP. Receipt to Human Authority.
      → FAIL     → STOP. Receipt to Canon evidence. No artifacts.
    → Evidence filed back to Canon (Division 09)
```

## Classification

| Signal in the input | Division |
| --- | --- |
| strategy, portfolio, priority, charter | 01 Strategy & Portfolio Governance |
| research, knowledge, sources, brief | 02 Knowledge & Research |
| architecture, design, spec, unspecified | 03 Solution Architecture & Design |
| code, implement, build, artifact | 04 Code & Artifact Production |
| review, security, quality, test | 05 Quality, Review & Security |
| ops, deploy, factory, site, runbook | 06 Operations & Site Factories |
| identity, credential, access, auth | 07 Identity, Credentials & Access |
| cost, meter, price, billing, spend | 08 Economics, Metering & Monetization |
| verify, audit, evidence, preflight | 09 Verification, Audit & Evidence |
| learn, eval, improve, retro | 10 Learning, Evaluation & Improvement |

Unspecified work defaults to Division 03.

## Grounding

A routed input must cite at least one Canon path (role, skill, policy, or evidence). If none exists, Division 02 files a stub and Division 03 holds production.

## Fail closed

If Preflight cannot complete, treat as FAIL. Missing receipt is FAIL. Ambiguous high-risk is ESCALATE, never PASS.
