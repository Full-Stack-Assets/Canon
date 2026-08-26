import assert from "node:assert/strict";
import test from "node:test";
import {
  CRITERIA_IDS,
  FIRST_DOLLAR_IDS,
  validateManifest,
} from "../.github/actions/revenue-ready-release/validate.mjs";

const now = "2026-08-25T22:00:00-04:00";

function check(id) {
  return {
    status: "PASS",
    owner: "commercial-owner",
    evidence_refs: [`canon://evidence/${id}`],
    notes: `Verified ${id} against current source evidence.`,
    validated_at: now,
  };
}

function passingManifest() {
  return {
    api_version: "aoc/v1",
    kind: "RevenueReadyReleaseEvidence",
    policy_id: "POL-REV-001",
    policy_version: "1.0.0",
    project_id: "project-alpha",
    release: {
      iteration: 1,
      candidate: "v0.1.0",
      evaluated_at: now,
    },
    decision: "PASS",
    criteria: Object.fromEntries(CRITERIA_IDS.map((id) => [id, check(id)])),
    first_dollar_stack: Object.fromEntries(FIRST_DOLLAR_IDS.map((id) => [id, check(id)])),
    attestations: {
      claims_source_backed: true,
      no_synthetic_customer_proof: true,
      payment_path_verified: true,
      paying_demand_verified: true,
      human_authority_gates_preserved: true,
    },
  };
}

test("passes only a complete first-iteration revenue chain", () => {
  const result = validateManifest(passingManifest());
  assert.equal(result.valid, true);
  assert.equal(result.required_checks, 30);
  assert.deepEqual(result.errors, []);
});

test("blocks when any revenue-chain criterion is not PASS", () => {
  const manifest = passingManifest();
  manifest.criteria.payment_infrastructure.status = "BLOCKED";
  const result = validateManifest(manifest);
  assert.equal(result.valid, false);
  assert.ok(result.errors.includes("payment_infrastructure: status must be PASS"));
});

test("blocks customer-proof claims without evidence", () => {
  const manifest = passingManifest();
  manifest.criteria.continuous_demand_validation.evidence_refs = [];
  const result = validateManifest(manifest);
  assert.equal(result.valid, false);
  assert.ok(
    result.errors.includes("continuous_demand_validation: at least one evidence reference is required"),
  );
});

test("blocks a missing first-dollar execution path", () => {
  const manifest = passingManifest();
  delete manifest.first_dollar_stack.direct_outreach_and_follow_up;
  const result = validateManifest(manifest);
  assert.equal(result.valid, false);
  assert.ok(result.errors.includes("direct_outreach_and_follow_up: missing check object"));
});

test("rejects placeholder evidence and project identity", () => {
  const manifest = passingManifest();
  manifest.project_id = "replace-me";
  manifest.criteria.proof.evidence_refs = ["TODO"];
  const result = validateManifest(manifest);
  assert.equal(result.valid, false);
  assert.ok(result.errors.some((error) => error.startsWith("project_id:")));
  assert.ok(result.errors.some((error) => error.startsWith("proof: evidence references")));
});

