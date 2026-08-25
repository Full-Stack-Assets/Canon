import assert from "node:assert/strict";
import { mkdtemp, mkdir, symlink, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { createCanonIndex } from "../mcp/canon-index.mjs";

async function fixture() {
  const root = await mkdtemp(path.join(os.tmpdir(), "canon-index-test-"));
  await mkdir(path.join(root, "aoc", "projects"), { recursive: true });
  await mkdir(path.join(root, "aoc", "decisions"), { recursive: true });
  await mkdir(path.join(root, "evidence", "receipts"), { recursive: true });
  await mkdir(path.join(root, "mcp", "generated"), { recursive: true });
  await mkdir(path.join(root, "aoc", ".private"), { recursive: true });
  await writeFile(path.join(root, "README.md"), "# Test Canon\nAuthoritative records.\n");
  await writeFile(
    path.join(root, "aoc", "projects", "alpha.yaml"),
    'api_version: aoc/v1\nkind: Project\nid: alpha\nname: Alpha Project\nstatus: draft\n',
  );
  await writeFile(
    path.join(root, "aoc", "decisions", "read-only.md"),
    "---\nkind: Decision\nid: decision-read-only\ntitle: Read-only first\n---\n\n# Read-only first\nNo writes.\n",
  );
  await writeFile(
    path.join(root, "evidence", "receipts", "receipt.json"),
    JSON.stringify({ schema: "canon.preflight.receipt", id: "receipt-1" }),
  );
  await writeFile(path.join(root, "aoc", ".private", "secret.md"), "# Excluded\n");
  await writeFile(
    path.join(root, "mcp", "generated", "canon-snapshot.mjs"),
    "export const SHOULD_NOT_BE_INDEXED = true;\n",
  );
  await writeFile(path.join(root, "aoc", "projects", "unknown.bin"), "excluded");
  await writeFile(path.join(root, "aoc", "projects", "oversized.md"), "x".repeat(513 * 1024));
  await symlink(
    path.join(root, "aoc", "projects", "alpha.yaml"),
    path.join(root, "aoc", "projects", "linked.yaml"),
  );
  return root;
}

test("indexes allowed Canon files and returns source-backed search results", async () => {
  const root = await fixture();
  const index = await createCanonIndex({
    root,
    publicBaseUrl: "https://example.test/canon/",
  });
  const results = index.search("Alpha Project");
  assert.equal(results[0].title, "Alpha Project");
  assert.equal(results[0].kind, "project");
  assert.match(results[0].url, /^https:\/\/example\.test\/canon\//);
  assert.ok(results.length <= 10);
  assert.equal(index.documents.some((document) => document.path.includes(".private")), false);
  assert.equal(index.documents.some((document) => document.path.startsWith("mcp/generated/")), false);
  assert.equal(index.documents.some((document) => document.path.endsWith("linked.yaml")), false);
  assert.equal(index.documents.some((document) => document.path.endsWith("unknown.bin")), false);
  assert.equal(index.documents.some((document) => document.path.endsWith("oversized.md")), false);
  assert.equal(index.fetch("evidence/receipts/receipt.json").metadata.record_kind, "receipt");
});

test("fetch resolves a search ID and rejects traversal", async () => {
  const root = await fixture();
  const index = await createCanonIndex({ root });
  const [result] = index.search("Alpha");
  const fetched = index.fetch(result.id);
  assert.equal(fetched.metadata.record_id, "alpha");
  assert.match(fetched.text, /status: draft/);
  assert.equal(index.fetch("../../etc/passwd"), null);
  assert.equal(index.fetch("/etc/passwd"), null);
});

test("typed getters return only typed canonical records", async () => {
  const root = await fixture();
  const index = await createCanonIndex({ root });
  const project = index.getEntity("project", "alpha");
  assert.equal(project.status, "found");
  assert.equal(project.record.metadata.record_kind, "project");

  const missing = index.getEntity("capability", "alpha");
  assert.equal(missing.status, "not_found");
  assert.equal(missing.requested_kind, "capability");
  assert.ok(Array.isArray(missing.candidates));
});
