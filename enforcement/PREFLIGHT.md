# Preflight Gate
Version: 1.0
Date: 2026-08-18

Mandatory on every input. First output is a Preflight Receipt.
Missing Preflight is FAIL. Never continue silently on failure.

## Minimal viable implementation (any platform)

ON every new user input:
  1. Create Task Envelope (objective, context, constraints, desired outcome, idempotency key)
  2. Attempt Canon capability / role / skill resolution
  3. Run policy screen (Universal Input + risk-tier + data-handling)
  4. Assign authority ceiling (low | medium | high | escalated | none)
  5. Declare required evidence
  6. Emit Preflight Receipt
  7. Decision:
       PASS     → continue to execution
       ESCALATE → surface to Human Authority
       FAIL     → stop and report

## Three implementation layers

Prompt / instruction (easiest)
  Force a structured Preflight block before real work.
  Reject or re-prompt if the block is missing or status is not PASS.

Tool / function (stronger)
  Expose run_preflight(task_envelope). Downstream tools refuse to run
  unless a valid receipt is supplied.

Platform / agent (strongest)
  Runtime intercepts every input, runs Preflight programmatically,
  then instantiates a temporary agent.

## Fail closed

| Decision | Work | Next |
| --- | --- | --- |
| PASS | Permitted inside routed division | Execute, then file evidence |
| ESCALATE | Stop | Present receipt to Human Authority |
| FAIL | Stop | File receipt. Produce no artifacts |

Unmappable to Canon → ESCALATE.
High-consequence flag → ESCALATE even if other checks pass.
The receipt itself is the first evidence artifact and must be written to Canon.
