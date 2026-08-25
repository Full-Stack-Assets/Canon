import assert from "node:assert/strict";
import { mkdtemp, mkdir, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { createCanonHttpServer } from "../mcp/server.mjs";

async function startFixtureServer(options = {}) {
  const root = await mkdtemp(path.join(os.tmpdir(), "canon-http-test-"));
  await mkdir(path.join(root, "aoc"), { recursive: true });
  await writeFile(path.join(root, "README.md"), "# Canon HTTP Fixture\nSearchable content.\n");
  const { server } = await createCanonHttpServer({ canonRoot: root, ...options });
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  const address = server.address();
  return {
    server,
    url: `http://127.0.0.1:${address.port}`,
  };
}

test("HTTP endpoint initializes and lists tools", async (t) => {
  const fixture = await startFixtureServer();
  t.after(() => new Promise((resolve) => fixture.server.close(resolve)));
  const response = await fetch(`${fixture.url}/mcp`, {
    method: "POST",
    headers: {
      accept: "application/json, text/event-stream",
      "content-type": "application/json",
    },
    body: JSON.stringify({ jsonrpc: "2.0", id: 1, method: "tools/list" }),
  });
  assert.equal(response.status, 200);
  const payload = await response.json();
  assert.ok(payload.result.tools.some((tool) => tool.name === "search"));
});

test("HTTP endpoint rejects unapproved browser origins", async (t) => {
  const fixture = await startFixtureServer();
  t.after(() => new Promise((resolve) => fixture.server.close(resolve)));
  const response = await fetch(`${fixture.url}/mcp`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      origin: "https://untrusted.example",
    },
    body: JSON.stringify({ jsonrpc: "2.0", id: 1, method: "ping" }),
  });
  assert.equal(response.status, 403);
});

test("HTTP endpoint enforces an optional bearer token", async (t) => {
  const fixture = await startFixtureServer({ bearerToken: "fixture-token" });
  t.after(() => new Promise((resolve) => fixture.server.close(resolve)));
  const request = {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ jsonrpc: "2.0", id: 1, method: "ping" }),
  };

  const unauthorized = await fetch(`${fixture.url}/mcp`, request);
  assert.equal(unauthorized.status, 401);
  assert.match(unauthorized.headers.get("www-authenticate"), /^Bearer /);

  const authorized = await fetch(`${fixture.url}/mcp`, {
    ...request,
    headers: {
      ...request.headers,
      authorization: "Bearer fixture-token",
    },
  });
  assert.equal(authorized.status, 200);
  assert.deepEqual(await authorized.json(), { jsonrpc: "2.0", id: 1, result: {} });
});

test("non-loopback serving fails closed without an explicit exposure mode", async () => {
  await assert.rejects(
    () => createCanonHttpServer({ canonRoot: process.cwd(), host: "0.0.0.0" }),
    /requires CANON_MCP_BEARER_TOKEN or explicit CANON_MCP_PUBLIC_READ_ONLY/,
  );
});
