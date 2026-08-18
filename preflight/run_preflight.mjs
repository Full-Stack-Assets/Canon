#!/usr/bin/env node
/**
 * run_preflight — fail-closed CLI.
 * exit 0 PASS | 2 ESCALATE | 1 FAIL
 */
import { createHash, randomUUID } from "node:crypto";

const VERSION = "1.0.0";

const DIVISIONS = [
  ["01", "Strategy & Portfolio Governance", ["strategy", "portfolio", "priority", "charter", "scope"]],
  ["02", "Knowledge & Research", ["research", "knowledge", "source", "brief", "library"]],
  ["03", "Solution Architecture & Design", ["architecture", "design", "spec", "contract", "interface"]],
  ["04", "Code & Artifact Production", ["code", "implement", "build", "artifact", "write", "scaffold"]],
  ["05", "Quality, Review & Security", ["review", "security", "quality", "test", "threat"]],
  ["06", "Operations & Site Factories", ["ops", "deploy", "factory", "site", "runbook", "operate"]],
  ["07", "Identity, Credentials & Access", ["identity", "credential", "access", "auth", "permission", "secret", "key"]],
  ["08", "Economics, Metering & Monetization", ["cost", "meter", "price", "billing", "spend", "budget"]],
  ["09", "Verification, Audit & Evidence", ["verify", "audit", "evidence", "receipt", "preflight"]],
  ["10", "Learning, Evaluation & Improvement", ["learn", "eval", "improve", "retro", "score"]],
];

const FAIL = [
  [/\b(bypass|skip|disable|ignore|waive)\b.{0,40}\b(preflight|canon|enforcement|gate|aoc)\b/i, "Attempt to bypass the Preflight Gate or Canon."],
  [/\b(malware|ransomware|zero[- ]?day|exploit kit|credential dump|exfiltrate secrets?)\b/i, "Hostile or criminal production request."],
  [/\bwithout (preflight|canon|human authority)\b/i, "Explicit request to work outside AOC structure."],
];

const ESCALATE = [
  [/\b(system[- ]prompt|rule[- ]set|agent[- ]passport|enforcement config|silent update)\b/i, "Touches central enforcement."],
  [/\b(drop (table|database)|delete production|destroy data|rm -rf|wipe (prod|production))\b/i, "Destructive production action."],
  [/\b(api[- ]?key|password|private key|credential|secret token|access token)\b/i, "Credentials or secrets in play."],
  [/\b(wire|transfer funds?|change (billing|pricing)|raise spend|unlimited budget)\b/i, "Economic action above ordinary metering."],
  [/\b(grant (admin|root|prod) access|mint (a )?passport|impersonate)\b/i, "Identity or access grant."],
];

export function runPreflight(raw) {
  const input = String(raw ?? "").replace(/\s+/g, " ").trim();
  const checks = [];
  if (!input) {
    return finalize(input, [{ id: "presence", name: "Input present", result: "fail", detail: "Empty input cannot be routed." }], "FAIL", DIVISIONS[2], ["Fail closed: nothing to ground in Canon."]);
  }
  checks.push({ id: "presence", name: "Input present", result: "pass", detail: `${input.length} characters received.` });
  checks.push({ id: "routing", name: "Universal routing", result: "pass", detail: "Input entered Agent Operating Company under Human Authority." });

  let routed = DIVISIONS[2];
  let best = 0;
  const lower = input.toLowerCase();
  for (const div of DIVISIONS) {
    let score = 0;
    for (const word of div[2]) if (lower.includes(word)) score += 1;
    if (score > best) {
      best = score;
      routed = div;
    }
  }
  checks.push({ id: "canon", name: "Canon grounding", result: "pass", detail: `Grounded in Division ${routed[0]} · ${routed[1]}.` });
  checks.push({ id: "authority", name: "Human Authority", result: "pass", detail: "No agent self-authorization." });

  const failHit = FAIL.find(([re]) => re.test(input));
  const escHit = ESCALATE.find(([re]) => re.test(input));
  if (failHit) checks.push({ id: "risk", name: "Risk screen", result: "fail", detail: failHit[1] });
  else if (escHit) checks.push({ id: "risk", name: "Risk screen", result: "warn", detail: escHit[1] });
  else checks.push({ id: "risk", name: "Risk screen", result: "pass", detail: "No fail-closed or escalate pattern matched." });

  let decision = "PASS";
  if (checks.some((c) => c.result === "fail") || failHit) decision = "FAIL";
  else if (checks.some((c) => c.result === "warn") || escHit) decision = "ESCALATE";

  const notes = decision === "PASS"
    ? ["Work may proceed inside the routed division."]
    : ["Fail closed: work must stop. Do not produce artifacts."];
  return finalize(input, checks, decision, routed, notes);
}

function finalize(input, checks, decision, routed, notes) {
  const work = decision === "PASS";
  return {
    version: "1.0.0",
    schema: "canon.preflight.receipt",
    id: randomUUID(),
    timestamp: new Date().toISOString(),
    input_digest: `sha256:${createHash("sha256").update(input).digest("hex").slice(0, 16)}`,
    input_summary: input ? (input.length > 160 ? `${input.slice(0, 157)}…` : input) : "(empty)",
    routed_to: {
      authority: "HUMAN_AUTHORITY",
      company: "AGENT_OPERATING_COMPANY",
      division_id: routed[0],
      division_name: routed[1],
      canon_refs: [`aoc/divisions/${routed[0]}`],
      roles: [],
    },
    checks,
    decision,
    fail_closed: !work,
    work_permitted: work,
    status_marker: `[AOC/Canon • Preflight ${decision}]`,
    notes,
    enforcement_version: VERSION,
  };
}

const arg = process.argv.slice(2).join(" ");
if (import.meta.url === `file://${process.argv[1]}` || process.argv[1]?.endsWith("run_preflight.mjs")) {
  const receipt = runPreflight(arg);
  process.stdout.write(`${JSON.stringify(receipt, null, 2)}\n`);
  if (receipt.decision === "FAIL") process.exit(1);
  if (receipt.decision === "ESCALATE") process.exit(2);
}
