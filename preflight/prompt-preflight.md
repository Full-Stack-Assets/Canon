# Prompt-level Preflight

On every user input, before any other content:

1. Mentally (or via `run_preflight`) evaluate the input.
2. Output a fenced JSON receipt that validates against
   `enforcement/PREFLIGHT-RECEIPT.schema.json`.
3. Print the matching status marker.
4. If decision is not PASS, stop.

```
PREFLIGHT_RECEIPT
{ ... }
[AOC/Canon • Preflight PASS]
```
