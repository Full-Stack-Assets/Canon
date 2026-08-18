# ClickUp fields

- aoc_division          drop-down  01–10
- preflight_decision    drop-down  REQUIRED | PASS | ESCALATE | FAIL
- preflight_receipt_id  text
- canon_refs            text
- status_marker         text
- canon_routed          drop-down  Yes | No

AI instructions: every task description is an AOC input. Refuse to generate
subtasks unless preflight_decision is PASS. Visible field Canon Routed must
be Yes before work starts.
