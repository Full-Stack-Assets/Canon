# Visible UI Verification

Every surface that can accept work must show a single status marker.

Format (exact):

`[AOC/Canon • Preflight PASS]`
`[AOC/Canon • Preflight ESCALATE]`
`[AOC/Canon • Preflight FAIL]`

Rules:

- One marker. Do not invent colors-only status.
- Marker must match the latest receipt decision.
- Chat, IDE, PR, and the command center all use the same string.
- If no receipt exists yet, show `[AOC/Canon • Preflight REQUIRED]`.
