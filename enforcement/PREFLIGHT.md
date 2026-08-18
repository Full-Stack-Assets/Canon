# Preflight Gate

Mandatory on every input. First output is a Preflight Receipt.

## Prompt-level form

Before any other content, emit a fenced JSON receipt that validates against
`enforcement/PREFLIGHT-RECEIPT.schema.json`. Then stop if decision is not PASS.

Recommended first-token contract:

```
PREFLIGHT_RECEIPT
{ ...json... }
```

If `decision` is `ESCALATE` or `FAIL`, the remainder of the response must be
the receipt plus a one-line halt. No patches, no files, no "while we wait".

## Tool form

```
run_preflight({ input: string }) → PreflightReceipt
```

Reference implementation: `preflight/run_preflight.mjs`.

```sh
node preflight/run_preflight.mjs "Implement the site-factory-operator RoleSpec"
```

Non-zero exit on ESCALATE or FAIL so scripts fail closed.

## Fail closed

| Decision | Work | Next |
| --- | --- | --- |
| PASS | Permitted inside routed division | Execute, then file evidence |
| ESCALATE | Stop | Present receipt to Human Authority |
| FAIL | Stop | File receipt. Produce no artifacts |

An agent that continues after ESCALATE or FAIL is out of passport.
