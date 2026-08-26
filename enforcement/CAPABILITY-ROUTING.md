# AOC Capability Routing and Automation Policy

Version: 1.0
Owner: Human Authority

Every PASSing Work Item MUST resolve capabilities before substantive execution. Explicit `@Plugin` or `@Skill` mentions are optional hints, never prerequisites. The runtime should automatically invoke required skills and the best available plugin/app/tool for the capability.

## Routing sequence

```
Work Item
  → Preflight
  → Capability bundle resolution
  → Skill/plugin/app selection
  → Action-policy tier
  → Execution
  → Verification
  → Evidence/receipt
```

## Automation tiers

### Automatic, no interaction

- skill selection
- Canon lookup
- repository reading
- documentation retrieval
- knowledge retrieval
- source verification
- tests
- linting
- static analysis
- analytics queries
- runtime inspection
- draft generation
- work-item classification
- capability routing

### Automatic within bounded policy

- issue creation
- branch creation
- private drafts
- staging deployments
- updating internal task state
- agent-to-agent communication
- reversible workflow operations

These actions may proceed without a new approval when they are scoped to the current Work Item, reversible, and within existing credentials and policy.

### Human Authority gate

- production deployment
- merging consequential releases
- billing/payment actions
- sending consequential external messages
- legal commitments
- destructive infrastructure operations
- deleting durable data
- publishing publicly
- changing security policy
- expanding agent authority

The runtime MUST stop before the gated action. Analysis and reversible preparation may be preserved as evidence, but the gated action itself cannot execute until Human Authority approves it.

## Capability bundles

- `DEBUG_RUNTIME`: systematic debugging + verification; GitHub and Context7 preferred; Replay.io, Honeycomb, and PostHog conditional on runtime evidence.
- `CODE_QUALITY`: TDD + verification; GitHub and Context7 preferred; tests, lint, and static analysis required when configured.
- `SECURE_BUILD`: Codex Security + repository/docs grounding; ArmorCodex and Neura Relay conditional.
- `OPENAI_BUILD`: OpenAI Developers + Context7 + GitHub for OpenAI/Codex/Agents/App SDK work.
- `AUTOMATE`: Make preferred; Tallyfy, AgentMail, Airbyte Agent Engine, and Brainbase conditional.
- `PRODUCT_BUILD`: Product Design + Figma + GitHub; PostHog conditional.
- `RESEARCH_GROUNDED`: source verification first; specialist research plugins activate only when relevant.

## Invocation rules

1. Do not require the user to type `@GitHub`, `@Context7`, `@Superpowers`, `@PostHog`, or similar mentions when the task already implies the capability.
2. Required skills are invoked before implementation.
3. Preferred plugins are invoked when installed, connected, and relevant.
4. Conditional plugins activate only when their evidence domain is relevant.
5. Do not invoke redundant plugins when one authoritative source is sufficient.
6. If the preferred capability is unavailable, use the highest-confidence available fallback and record the fallback.
7. Never silently replace authoritative evidence with model inference.
8. Claims of completion require fresh verification evidence.
