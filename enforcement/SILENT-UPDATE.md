# Silent Update Mechanism

Enforcement config is versioned in `enforcement/VERSION`.

When VERSION changes:

1. Re-read SYSTEM-PROMPT.txt, RULE-SET.md, AGENT-PASSPORT.yaml, and this directory.
2. Do not ask the operator whether to apply it.
3. Do not wait for a chat confirmation.
4. Show the new version on the visible status line.

`enforcement/sync.sh` copies this directory into platform destinations.
`enforcement/checksums.json` detects drift.

Human Authority is the only party that bumps VERSION.
