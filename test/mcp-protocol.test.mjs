import assert from "node:assert/strict";
import { mkdtemp, mkdir, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { createCanonIndex } from "../mcp/canon-index.mjs";
import { createProtocol } from "../mcp/protocol.mjs";

async function protocolFixture() {
  const root = await mkdtemp(path.join(os.tmpdir(), "canon-protocol-test-"));
  await mkdir(path.join(root, "aoc"), { recursive: true });
  await writeFile(path.join(root, "README.md"), "# Canon Fixture\nNeedle content.\n");
  return createProtocol(await createCanonIndex({ root }));
}

test("initialize and tools/list expose a read-only contract", async () => {
  const protocol = await protocolFixture();
  const initialized = await protocol.handle({
    jsonrpc: "2.0",
    id: 1,
    method: "initialize",
    params: { protocolVersion: "2025-11-25", capabilities: {} },
  });
  assert.equal(initialized.result.protocolVersion, "2025-11-25");
  assert.equal(initialized.result.serverInfo.name, "canon-read-only");

  const listed = await protocol.handle({ jsonrpc: "2.0", id: 2, method: "tools/list" });
  assert.deepEqual(
    listed.result.tools.map((tool) => tool.name),
    [
      "search",
      "fetch",
      "canon_get_project",
      "canon_get_work_item",
      "canon_get_decision",
      "canon_get_capability",
    ],
  );
  for (const tool of listed.result.tools) {
    assert.equal(tool.annotations.readOnlyHint, true);
    assert.equal(tool.annotations.destructiveHint, false);
    assert.equal(tool.annotations.openWorldHint, false);
  }
});

test("tools/call searches and fetches model-readable results", async () => {
  const protocol = await protocolFixture();
  const searched = await protocol.handle({
    jsonrpc: "2.0",
    id: 1,
    method: "tools/call",
    params: { name: "search", arguments: { query: "Needle" } },
  });
  const [result] = searched.result.structuredContent.results;
  assert.ok(result.id.startsWith("canon://document/"));
  assert.equal(searched.result.content[0].type, "text");

  const fetched = await protocol.handle({
    jsonrpc: "2.0",
    id: 2,
    method: "tools/call",
    params: { name: "fetch", arguments: { id: result.id } },
  });
  assert.match(fetched.result.structuredContent.text, /Needle content/);
});

test("invalid tool arguments fail with JSON-RPC Invalid Params", async () => {
  const protocol = await protocolFixture();
  const response = await protocol.handle({
    jsonrpc: "2.0",
    id: 1,
    method: "tools/call",
    params: { name: "search", arguments: {} },
  });
  assert.equal(response.error.code, -32602);
});
