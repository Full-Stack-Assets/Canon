# Implementation Checklist — Universal Input Enforcement
Goal: every listed platform enforces Agent Operating Company + Canon on every
single user input. Updates may be silent, but a visible and verifiable UI
indicator must exist across applications.

## Universal requirements
- [ ] System prompt / rules / agent passport includes the mandatory “every single user input” language
- [ ] Preflight Gate is invoked on every new input
- [ ] Capabilities / roles / skills resolve from Canon
- [ ] Evidence and receipts are written back to Canon
- [ ] Visible UI indicator confirms the structure is active for the current input
- [ ] Bypass attempts are blocked or escalated (never silent success)

## Platform-specific

### Cursor
- [ ] Update `.cursor/rules` with Universal System Prompt Block
- [ ] Add Preflight step in agent workflow
- [ ] Visible status indicator
- [ ] Evidence write-back path defined

### GPT (Custom GPTs / ChatGPT)
- [ ] Update GPT instructions with mandatory rule
- [ ] Add Preflight reasoning step
- [ ] Persistent memory or actions to record evidence
- [ ] Visible confirmation in responses

### Gemini
- [ ] Update Gem / system instructions
- [ ] Enforce Preflight in the instruction chain
- [ ] Visible status in output
- [ ] Evidence logging path

### GitHub Copilot
- [ ] Update `.github/copilot-instructions.md`
- [ ] Preflight-style reasoning for non-trivial completions
- [ ] Visible comment or annotation indicating Canon grounding

### Manus
- [ ] Update agent passport / system configuration
- [ ] Mandatory Preflight before tool use
- [ ] Evidence receipt generation
- [ ] Visible status in interface

### ClickUp
- [ ] Custom fields for Task Envelope + Preflight status
- [ ] Automation that forces Canon routing
- [ ] Visible status field (“Canon Routed: Yes/No”)
- [ ] Evidence attachment or comment requirement

### GitHub (Actions, Issues, PR agents)
- [ ] Workflow preflight job
- [ ] Required status checks that validate Canon grounding
- [ ] Visible check run or PR comment
- [ ] Evidence artifacts uploaded on completion

### Other / future runtimes
- [ ] Apply the Universal System Prompt Block
- [ ] Implement Preflight Gate
- [ ] Provide visible verification UI element
- [ ] Write evidence back to Canon

## Verification standard
A platform is compliant only when:
1. The mandatory language is present and active.
2. Preflight runs on every input.
3. A visible, user-verifiable indicator exists.
4. Evidence reaches Canon.
5. Bypass is not possible without escalation.
