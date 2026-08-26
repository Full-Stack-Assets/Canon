---
name: aoc-capability-router
description: Use after AOC preflight on every Work Item to automatically resolve required skills, plugins, apps, tools, verification, and approval tier. Explicit @mentions are not required.
---

# AOC Capability Router

1. Read the current Preflight Receipt and `enforcement/CAPABILITY-ROUTING.md`.
2. Invoke every `required_skills` entry before implementation.
3. Prefer `preferred_plugins` when installed, connected, and relevant.
4. Invoke `conditional_plugins` only when their evidence domain is relevant.
5. Execute `automatic_no_interaction` actions without requesting approval.
6. Execute `automatic_bounded` actions without a new approval only when scoped, reversible, and within existing authority.
7. Stop before any `human_authority_gate` action and request Human Authority approval.
8. Run the receipt's verification requirements before making completion claims.
9. Record unavailable preferred capabilities and any fallback used.
10. Never require the user to restate the task with plugin `@` mentions when capability intent is already clear.
