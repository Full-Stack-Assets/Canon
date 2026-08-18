# Preflight Gate — Implementation Guide
Version: 1.0
Date: 2026-08-18

## Goal
Turn the Preflight Gate Logic into concrete, enforceable behavior in every runtime.

## Minimal Viable Implementation (Any Platform)

```text
ON every new user input:
  1. Create Task Envelope (objective, context, constraints, desired outcome, idempotency key)
  2. Attempt Canon capability/role/skill resolution
  3. Run policy screen (Universal Input + risk-tier + data-handling)
  4. Assign authority ceiling
  5. Declare required evidence
  6. Emit Preflight Receipt
  7. Decision:
       PASS     → continue to execution
       ESCALATE → surface to Human Authority
       FAIL     → stop and report
```

## Recommended Data Shape (Preflight Receipt)

```json
{
  "task_id": "uuid-or-idempotency-key",
  "timestamp": "ISO-8601",
  "status": "PASS | ESCALATE | FAIL",
  "objective_summary": "string",
  "resolved_capabilities": ["capability-id", "..."],
  "authority_ceiling": "low | medium | high | escalated | none",
  "policy_flags": ["high-consequence", "..."],
  "required_evidence": ["receipt", "quality-score", "..."],
  "enforcement_config_version": "string",
  "notes": "string"
}
```

Canon also records input_digest, routed_to, checks[], status_marker,
work_permitted, fail_closed, and config_hash.

## Implementation Notes by Layer

### Prompt / Instruction Level (easiest starting point)
- Force the model to output a structured Preflight block before doing real work.
- Reject or re-prompt if the block is missing or status is not PASS.

### Tool / Function Level (stronger)
- Expose a `run_preflight(task_envelope)` tool that must be called first.
- Downstream tools refuse to run unless a valid Preflight Receipt is supplied.

### Platform / Agent Level (strongest)
- Runtime intercepts every input, runs Preflight programmatically, and only then instantiates the agent.

## Failure Handling
- Missing Preflight → treat as FAIL
- Unmappable to Canon → ESCALATE
- High-consequence flag → ESCALATE (even if other checks pass)
- Never continue silently on failure

## Evidence Write-Back
The Preflight Receipt itself is the first evidence artifact and must be recorded toward Canon.
