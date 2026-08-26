#!/usr/bin/env node
import { readFileSync } from "node:fs";
import { pathToFileURL } from "node:url";

export const CRITERIA_IDS = Object.freeze([
  "specific_buyer",
  "urgent_problem",
  "compelling_offer",
  "pricing_model",
  "proof",
  "customer_source",
  "acquisition_channel",
  "conversion_mechanism",
  "payment_infrastructure",
  "fulfillment_system",
  "onboarding",
  "customer_support",
  "retention_mechanism",
  "expansion_path",
  "unit_economics",
  "measurement",
  "legal_operational_basics",
  "automation",
  "accountability",
  "continuous_demand_validation",
]);

export const FIRST_DOLLAR_IDS = Object.freeze([
  "painful_problem",
  "defined_buyer",
  "fixed_offer",
  "price",
  "proof_asset",
  "qualified_lead_source",
  "sales_path",
  "payment_path",
  "fulfillment_path",
  "direct_outreach_and_follow_up",
]);

const ATTESTATION_IDS = Object.freeze([
  "claims_source_backed",
  "no_synthetic_customer_proof",
  "payment_path_verified",
  "paying_demand_verified",
  "human_authority_gates_preserved",
]);

const PLACEHOLDER = /(^|\b)(todo|tbd|replace[-_ ]?me|example|placeholder)(\b|$)/i;

function isRecord(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function validDate(value) {
  return typeof value === "string" && value.trim() !== "" && !Number.isNaN(Date.parse(value));
}

function validateCheck(section, id, errors) {
  const value = section?.[id];
  const prefix = `${id}`;
  if (!isRecord(value)) {
    errors.push(`${prefix}: missing check object`);
    return;
  }
  if (value.status !== "PASS") errors.push(`${prefix}: status must be PASS`);
  if (typeof value.owner !== "string" || !value.owner.trim() || PLACEHOLDER.test(value.owner)) {
    errors.push(`${prefix}: a non-placeholder owner is required`);
  }
  if (!Array.isArray(value.evidence_refs) || value.evidence_refs.length === 0) {
    errors.push(`${prefix}: at least one evidence reference is required`);
  } else {
    for (const reference of value.evidence_refs) {
      if (typeof reference !== "string" || !reference.trim() || PLACEHOLDER.test(reference)) {
        errors.push(`${prefix}: evidence references must be non-placeholder strings`);
        break;
      }
    }
  }
  if (typeof value.notes !== "string" || !value.notes.trim() || PLACEHOLDER.test(value.notes)) {
    errors.push(`${prefix}: current validation notes are required`);
  }
  if (!validDate(value.validated_at)) errors.push(`${prefix}: validated_at must be a valid date-time`);
}

function validateExactKeys(section, expected, sectionName, errors) {
  if (!isRecord(section)) {
    errors.push(`${sectionName}: missing object`);
    return;
  }
  const unknown = Object.keys(section).filter((key) => !expected.includes(key));
  if (unknown.length) errors.push(`${sectionName}: unknown keys: ${unknown.join(", ")}`);
}

export function validateManifest(manifest) {
  const errors = [];
  if (!isRecord(manifest)) return { valid: false, errors: ["manifest: expected a JSON object"] };

  if (manifest.api_version !== "aoc/v1") errors.push("api_version: expected aoc/v1");
  if (manifest.kind !== "RevenueReadyReleaseEvidence") {
    errors.push("kind: expected RevenueReadyReleaseEvidence");
  }
  if (manifest.policy_id !== "POL-REV-001") errors.push("policy_id: expected POL-REV-001");
  if (manifest.policy_version !== "1.0.0") errors.push("policy_version: expected 1.0.0");
  if (typeof manifest.project_id !== "string" || !manifest.project_id.trim() || PLACEHOLDER.test(manifest.project_id)) {
    errors.push("project_id: a non-placeholder project id is required");
  }

  if (!isRecord(manifest.release)) {
    errors.push("release: missing object");
  } else {
    if (!Number.isInteger(manifest.release.iteration) || manifest.release.iteration < 1) {
      errors.push("release.iteration: expected an integer greater than or equal to 1");
    }
    if (typeof manifest.release.candidate !== "string" || !manifest.release.candidate.trim() || PLACEHOLDER.test(manifest.release.candidate)) {
      errors.push("release.candidate: a non-placeholder release candidate is required");
    }
    if (!validDate(manifest.release.evaluated_at)) {
      errors.push("release.evaluated_at: expected a valid date-time");
    }
  }

  if (manifest.decision !== "PASS") errors.push("decision: must be PASS");

  validateExactKeys(manifest.criteria, CRITERIA_IDS, "criteria", errors);
  for (const id of CRITERIA_IDS) validateCheck(manifest.criteria, id, errors);

  validateExactKeys(manifest.first_dollar_stack, FIRST_DOLLAR_IDS, "first_dollar_stack", errors);
  for (const id of FIRST_DOLLAR_IDS) validateCheck(manifest.first_dollar_stack, id, errors);

  validateExactKeys(manifest.attestations, ATTESTATION_IDS, "attestations", errors);
  for (const id of ATTESTATION_IDS) {
    if (manifest.attestations?.[id] !== true) errors.push(`attestations.${id}: must be true`);
  }

  return {
    valid: errors.length === 0,
    errors,
    passed_checks: errors.length === 0 ? CRITERIA_IDS.length + FIRST_DOLLAR_IDS.length : 0,
    required_checks: CRITERIA_IDS.length + FIRST_DOLLAR_IDS.length,
  };
}

function main() {
  const manifestPath = process.argv[2] || ".aoc/revenue-ready-release.json";
  let manifest;
  try {
    manifest = JSON.parse(readFileSync(manifestPath, "utf8"));
  } catch (error) {
    process.stderr.write(`Revenue-Ready Release Gate: cannot read ${manifestPath}: ${error.message}\n`);
    process.exitCode = 1;
    return;
  }

  const result = validateManifest(manifest);
  if (!result.valid) {
    process.stderr.write(
      `Revenue-Ready Release Gate: BLOCKED (${result.errors.length} finding(s))\n${result.errors.map((error) => `- ${error}`).join("\n")}\n`,
    );
    process.exitCode = 1;
    return;
  }

  process.stdout.write(
    `Revenue-Ready Release Gate: PASS (${result.required_checks}/${result.required_checks} evidence-backed checks)\n`,
  );
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) main();

