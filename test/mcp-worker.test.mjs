import assert from "node:assert/strict";
import test from "node:test";
import worker from "../mcp/worker.mjs";

const publicEnv = { CANON_MCP_PUBLIC_READ_ONLY: "true" };

function rpcRequest(method, params, { headers = {}, env = publicEnv } = {}) {
  const request = new Request("https://canon.example/mcp", {
    method: "POST",
    headers: { "content-type": "application/json", ...headers },
    body: JSON.stringify({ jsonrpc: "2.0", id: 1, method, ...(params ? { params } : {}) }),
  });
  return worker.fetch(request, env);
}

test("Worker health exposes a non-sensitive snapshot receipt", async () => {
  const response = await worker.fetch(
    new Request("https://canon.example/healthz"),
    publicEnv,
  );
  assert.equal(response.status, 200);
  const payload = await response.json();
  assert.equal(payload.status, "ok");
  assert.equal(payload.runtime, "cloudflare-workers");
  assert.ok(payload.documents > 0);
  assert.match(payload.snapshot_sha256, /^[a-f0-9]{64}$/);
});

test("Worker initializes and returns the six read-only tools", async () => {
  const response = await rpcRequest("tools/list");
  assert.equal(response.status, 200);
  const payload = await response.json();
  assert.equal(payload.result.tools.length, 6);
  assert.ok(
    payload.result.tools.every(
      (tool) =>
        tool.annotations.readOnlyHint === true &&
        tool.annotations.destructiveHint === false &&
        tool.annotations.openWorldHint === false,
    ),
  );
});

test("Worker fails closed unless public read-only mode or a token is configured", async () => {
  const unavailable = await rpcRequest("ping", undefined, { env: {} });
  assert.equal(unavailable.status, 503);

  const unauthorized = await rpcRequest("ping", undefined, {
    env: { CANON_MCP_BEARER_TOKEN: "expected" },
  });
  assert.equal(unauthorized.status, 401);
  assert.match(unauthorized.headers.get("www-authenticate"), /^Bearer /);

  const authorized = await rpcRequest("ping", undefined, {
    env: { CANON_MCP_BEARER_TOKEN: "expected" },
    headers: { authorization: "Bearer expected" },
  });
  assert.equal(authorized.status, 200);
});

test("Worker rejects unapproved browser origins", async () => {
  const response = await rpcRequest("ping", undefined, {
    headers: { origin: "https://untrusted.example" },
  });
  assert.equal(response.status, 403);
});

test("Worker search and fetch use the embedded Canon snapshot", async () => {
  const search = await rpcRequest("tools/call", {
    name: "search",
    arguments: { query: "Canon" },
  });
  const searchPayload = await search.json();
  const result = searchPayload.result.structuredContent.results[0];
  assert.match(result.id, /^canon:\/\/document\//);

  const fetch = await rpcRequest("tools/call", {
    name: "fetch",
    arguments: { id: result.id },
  });
  const fetchPayload = await fetch.json();
  assert.equal(fetchPayload.result.structuredContent.id, result.id);
});
