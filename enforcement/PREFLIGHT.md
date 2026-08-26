# Preflight Gate
Version: 1.1
Date: 2026-08-25

Mandatory on every input. First output is a Preflight Receipt.
Missing Preflight is FAIL. Never continue silently on failure.

## Minimal viable implementation (any platform)

ON every new user input:
  1. Create Task Envelope (objective, context, constraints, desired outcome, idempotency key)
  2. Attempt Canon capability / role / skill resolution
  3. Resolve the execution plan using `enforcement/CAPABILITY-ROUTING.md`
  4. Run policy screen (Universal Input + risk-tier + data-handling + action-policy tier)
  5. Assign authority ceiling (low | medium | high | escalated | none)
  6. Declare required evidence and verification
  7. Emit Preflight Receipt including `execution_plan` for new receipts
  8. Decision:
       PASS     → automatically execute ungated capabilities inside the routed division
       ESCALATE → STOP before gated action. Receipt to Human Authority.
       FAIL     → STOP. Receipt to Canon evidence. No artifacts.

Explicit plugin or skill mentions are not required. Capability resolution decides which skills/plugins/apps/tools to invoke.

## Three implementation layers

Prompt / instruction (easiest)
  Force a structured Preflight block and capability resolution before real work.
  Reject or re-prompt if the block is missing or status is not PASS.

Tool / function (stronger)
  Expose run_preflight(task_envelope). Downstream tools consume `execution_plan`; gated actions refuse to run without Human Authority.

Platform / agent (strongest)
  Runtime intercepts every input, runs Preflight programmatically, resolves the capability bundle, then instantiates a temporary agent.

## Fail closed

| Decision | Work | Next |
| --- | --- | --- |
| PASS | Permitted inside routed division and automation policy | Execute, verify, then file evidence |
| ESCALATE | Stop before gated action | Present receipt to Human Authority |
| FAIL | Stop | File receipt. Produce no artifacts |

Unmappable to Canon → ESCALATE.
High-consequence flag → ESCALATE even if other checks pass.
The receipt itself is the first evidence artifact and must be written to Canon.
