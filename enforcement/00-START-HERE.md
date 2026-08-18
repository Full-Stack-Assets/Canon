# Agent Operating Company — Central Enforcement Kit
**Goal:** Reduce tedious file creation. Apply once, reuse everywhere.

1. Copy `SYSTEM-PROMPT.txt` into the main system/instructions field of every major platform.
2. Copy `RULE-SET.md` into rule locations (Cursor rules, Copilot instructions, etc.).
3. Use `AGENT-PASSPORT.yaml` in any platform that supports structured agent definitions.
4. Keep this folder as the single source of truth. Update it here first, then re-copy.

You should not need to create new enforcement files for every new project or agent.

One-line sync: `./enforcement/sync.sh --target cursor`
