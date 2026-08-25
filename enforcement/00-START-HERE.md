# Agent Operating Company — Central Enforcement Kit
**Goal:** Reduce tedious file creation. Apply once, reuse everywhere.

1. In a Canon clone, run `./enforcement/bootstrap.sh --install` to enable the
   soft Git hooks and synchronize the repository-backed Cursor and Copilot
   entrypoints.
2. Copy `SYSTEM-PROMPT.txt` into the main system/instructions field of every major platform.
3. Copy `RULE-SET.md` into any additional rule locations.
4. Use `AGENT-PASSPORT.yaml` in any platform that supports structured agent definitions.
5. Keep this folder as the single source of truth. Update it here first, then re-copy.

You should not need to create new enforcement files for every new project or agent.

Read-only clone check: `./enforcement/bootstrap.sh --check`

Single-surface sync remains available through
`./enforcement/sync.sh --target <cursor|copilot|chatgpt|gemini|manus|clickup>`.
