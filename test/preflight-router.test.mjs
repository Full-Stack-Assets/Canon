import test from "node:test";
import assert from "node:assert/strict";
import { runPreflight } from "../preflight/run_preflight.mjs";

test("routes a generic fix request through the debugging quality bundle automatically", () => {
  const receipt = runPreflight("Fix this problem.");
  assert.equal(receipt.decision, "PASS");
  assert.ok(receipt.execution_plan);
  assert.ok(receipt.execution_plan.capability_bundles.includes("DEBUG_RUNTIME"));
  assert.ok(receipt.execution_plan.required_skills.includes("superpowers:systematic-debugging"));
  assert.ok(receipt.execution_plan.required_skills.includes("superpowers:verification-before-completion"));
  assert.ok(receipt.execution_plan.preferred_plugins.includes("GitHub"));
  assert.ok(receipt.execution_plan.preferred_plugins.includes("Context7"));
  assert.equal(receipt.execution_plan.automation_level, "automatic_no_interaction");
});

test("routes implementation work through the code quality bundle", () => {
  const receipt = runPreflight("Implement the API integration and tests.");
  assert.ok(receipt.execution_plan.capability_bundles.includes("CODE_QUALITY"));
  assert.ok(receipt.execution_plan.required_skills.includes("superpowers:test-driven-development"));
  assert.ok(receipt.execution_plan.verification.includes("tests"));
  assert.ok(receipt.execution_plan.verification.includes("lint_when_configured"));
  assert.ok(receipt.execution_plan.verification.includes("static_analysis_when_configured"));
});

test("keeps consequential production deployment behind Human Authority", () => {
  const receipt = runPreflight("Deploy this release to production.");
  assert.equal(receipt.decision, "ESCALATE");
  assert.ok(receipt.execution_plan.human_authority_gates.includes("production_deployment"));
  assert.equal(receipt.execution_plan.action_policy.production_deployment, "human_authority_gate");
});


test("routes first commercial iterations through the mandatory revenue gate", () => {
  const receipt = runPreflight("Prepare the first customer-facing iteration for commercial release.");
  assert.ok(receipt.execution_plan.capability_bundles.includes("REVENUE_RELEASE"));
  assert.ok(receipt.execution_plan.verification.includes("revenue_ready_release_gate"));
  assert.equal(
    receipt.execution_plan.action_policy.revenue_ready_release_validation,
    "automatic_no_interaction",
  );
});

