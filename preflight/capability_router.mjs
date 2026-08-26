const BUNDLES = [
  {
    id: "DEBUG_RUNTIME",
    match: /\b(fix|debug|bug|error|broken|failing|failure|regression|crash|incident)\b/i,
    required_skills: [
      "superpowers:systematic-debugging",
      "superpowers:verification-before-completion",
    ],
    preferred_plugins: ["GitHub", "Context7"],
    conditional_plugins: ["Replay.io", "Honeycomb", "PostHog"],
    verification: ["tests", "runtime_inspection_when_relevant"],
  },
  {
    id: "CODE_QUALITY",
    match: /\b(implement|build|code|scaffold|refactor|feature|endpoint|integration|migration|patch)\b/i,
    required_skills: [
      "superpowers:test-driven-development",
      "superpowers:verification-before-completion",
    ],
    preferred_plugins: ["GitHub", "Context7"],
    conditional_plugins: ["Codex Security", "Replay.io", "Honeycomb", "PostHog"],
    verification: ["tests", "lint_when_configured", "static_analysis_when_configured"],
  },
  {
    id: "SECURE_BUILD",
    match: /\b(security|secure|auth|authentication|authorization|credential|secret|permission|vulnerability|threat|crypto|cryptography)\b/i,
    required_skills: ["superpowers:verification-before-completion"],
    preferred_plugins: ["Codex Security", "GitHub", "Context7"],
    conditional_plugins: ["ArmorCodex", "Neura Relay MCP"],
    verification: ["security_analysis", "tests"],
  },
  {
    id: "OPENAI_BUILD",
    match: /\b(openai|chatgpt|codex|agents sdk|apps sdk|responses api|mcp)\b/i,
    required_skills: ["superpowers:verification-before-completion"],
    preferred_plugins: ["OpenAI Developers", "Context7", "GitHub"],
    conditional_plugins: ["Codex Replay"],
    verification: ["official_documentation", "tests_when_code_changes"],
  },
  {
    id: "AUTOMATE",
    match: /\b(automate|automation|workflow|schedule|trigger|orchestrat|recurring|agent-to-agent|integration)\b/i,
    required_skills: ["superpowers:verification-before-completion"],
    preferred_plugins: ["Make"],
    conditional_plugins: ["Tallyfy Workflow Automation", "AgentMail", "Airbyte Agent Engine", "Brainbase MCP"],
    verification: ["workflow_dry_run_when_supported", "receipt_or_run_evidence"],
  },
  {
    id: "PRODUCT_BUILD",
    match: /\b(ui|ux|frontend|figma|prototype|design system|user flow|interface)\b/i,
    required_skills: ["superpowers:verification-before-completion"],
    preferred_plugins: ["Product Design", "Figma", "GitHub"],
    conditional_plugins: ["PostHog"],
    verification: ["design_source_check", "tests_when_code_changes"],
  },
  {
    id: "REVENUE_RELEASE",
    match: /\b(revenue[- ]ready|commercial release|first iteration|customer-facing iteration|mvp|launch|paid pilot)\b/i,
    required_skills: ["superpowers:verification-before-completion"],
    preferred_plugins: ["GitHub", "Stripe", "Data Analytics"],
    conditional_plugins: ["Pipedrive", "Airtable"],
    verification: [
      "revenue_ready_release_gate",
      "payment_path_verification",
      "fulfillment_path_verification",
    ],
  },
  {
    id: "RESEARCH_GROUNDED",
    match: /\b(research|source|paper|literature|fact-check|verify claim|evidence review)\b/i,
    required_skills: [],
    preferred_plugins: [],
    conditional_plugins: ["Consensus", "Scite", "SciSpace", "alphaXiv", "Exa"],
    verification: ["source_verification", "primary_sources_preferred"],
  },
];

export const ACTION_POLICY = Object.freeze({
  skill_selection: "automatic_no_interaction",
  canon_lookup: "automatic_no_interaction",
  repository_reading: "automatic_no_interaction",
  documentation_retrieval: "automatic_no_interaction",
  knowledge_retrieval: "automatic_no_interaction",
  source_verification: "automatic_no_interaction",
  tests: "automatic_no_interaction",
  linting: "automatic_no_interaction",
  static_analysis: "automatic_no_interaction",
  analytics_queries: "automatic_no_interaction",
  runtime_inspection: "automatic_no_interaction",
  draft_generation: "automatic_no_interaction",
  work_item_classification: "automatic_no_interaction",
  capability_routing: "automatic_no_interaction",
  revenue_ready_release_validation: "automatic_no_interaction",

  issue_creation: "automatic_bounded",
  branch_creation: "automatic_bounded",
  private_drafts: "automatic_bounded",
  staging_deployments: "automatic_bounded",
  internal_task_state_updates: "automatic_bounded",
  agent_to_agent_communication: "automatic_bounded",
  reversible_workflow_operations: "automatic_bounded",

  production_deployment: "human_authority_gate",
  consequential_release_merge: "human_authority_gate",
  billing_payment_actions: "human_authority_gate",
  consequential_external_messages: "human_authority_gate",
  legal_commitments: "human_authority_gate",
  destructive_infrastructure_operations: "human_authority_gate",
  durable_data_deletion: "human_authority_gate",
  public_publishing: "human_authority_gate",
  security_policy_changes: "human_authority_gate",
  agent_authority_expansion: "human_authority_gate",
});

const BOUNDED_MATCHERS = [
  ["issue_creation", /\b(create|open|file)\b.{0,30}\b(issue|ticket)\b/i],
  ["branch_creation", /\b(create|open|start)\b.{0,30}\b(branch|worktree)\b/i],
  ["private_drafts", /\b(create|write|draft)\b.{0,30}\b(private draft|draft)\b/i],
  ["staging_deployments", /\b(deploy|release)\b.{0,30}\b(staging|preview|sandbox|dev)\b/i],
  ["internal_task_state_updates", /\b(update|change|set)\b.{0,30}\b(task|issue|status|state)\b/i],
  ["agent_to_agent_communication", /\b(agent[- ]to[- ]agent|a2a|message another agent)\b/i],
  ["reversible_workflow_operations", /\b(run|trigger|execute)\b.{0,30}\b(workflow|automation)\b/i],
];

const HUMAN_GATE_MATCHERS = [
  ["production_deployment", /\b(deploy|release|promote)\b.{0,40}\b(prod|production)\b/i],
  ["consequential_release_merge", /\bmerge\b.{0,40}\b(main|master|release|production|protected)\b/i],
  ["billing_payment_actions", /\b(pay|charge|refund|transfer funds?|wire|billing action|change pricing)\b/i],
  ["consequential_external_messages", /\b(send|publish|post)\b.{0,50}\b(legal notice|press release|public statement|customer notice|client notice)\b/i],
  ["legal_commitments", /\b(sign|accept|execute|agree to)\b.{0,40}\b(contract|agreement|nda|terms|legal)\b/i],
  ["destructive_infrastructure_operations", /\b(drop|destroy|wipe|delete|terminate)\b.{0,50}\b(database|production|cluster|service|infrastructure|environment)\b/i],
  ["durable_data_deletion", /\b(delete|purge|erase)\b.{0,40}\b(durable|canonical|history|records?|data)\b/i],
  ["public_publishing", /\b(publish|post|release)\b.{0,40}\b(public|publicly|website|app store)\b/i],
  ["security_policy_changes", /\b(change|modify|disable|relax|expand)\b.{0,50}\b(security policy|access policy|branch protection|ruleset|enforcement)\b/i],
  ["agent_authority_expansion", /\b(grant|expand|increase|elevate)\b.{0,50}\b(agent authority|agent access|permissions?|admin|root|production access)\b/i],
];

function unique(values) {
  return [...new Set(values)];
}

export function resolveExecutionPlan(raw) {
  const input = String(raw ?? "").replace(/\s+/g, " ").trim();
  const bundles = BUNDLES.filter((bundle) => bundle.match.test(input));
  const bounded_actions = BOUNDED_MATCHERS.filter(([, regex]) => regex.test(input)).map(([id]) => id);
  const human_authority_gates = HUMAN_GATE_MATCHERS.filter(([, regex]) => regex.test(input)).map(([id]) => id);

  const automation_level = human_authority_gates.length
    ? "human_authority_gate"
    : bounded_actions.length
      ? "automatic_bounded"
      : "automatic_no_interaction";

  return {
    capability_bundles: bundles.map((bundle) => bundle.id),
    required_skills: unique(bundles.flatMap((bundle) => bundle.required_skills)),
    preferred_plugins: unique(bundles.flatMap((bundle) => bundle.preferred_plugins)),
    conditional_plugins: unique(bundles.flatMap((bundle) => bundle.conditional_plugins)),
    verification: unique(bundles.flatMap((bundle) => bundle.verification)),
    automation_level,
    bounded_actions,
    human_authority_gates,
    action_policy: ACTION_POLICY,
    invocation_rule: "Automatically engage required skills and preferred plugins when available; do not require explicit @mentions. Conditional plugins engage only when their evidence domain is relevant.",
    fallback_rule: "If a preferred capability is unavailable, use the highest-confidence available adapter and record the fallback; never silently replace authoritative evidence with model inference.",
  };
}

