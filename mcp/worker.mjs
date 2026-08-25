import { CANON_SNAPSHOT } from "./generated/canon-snapshot.mjs";
import { MemoryCanonIndex } from "./memory-index.mjs";
import { createProtocol, JsonRpcError, SERVER_INFO } from "./protocol.mjs";

const MAX_BODY_BYTES = 1024 * 1024;
const index = new MemoryCanonIndex(CANON_SNAPSHOT.documents);
const protocol = createProtocol(index);

function envBoolean(value) {
  return ["1", "true", "yes", "on"].includes(String(value ?? "").toLowerCase());
}

function allowedOrigins(env) {
  return new Set(
    String(env.CANON_MCP_ALLOWED_ORIGINS ?? "")
      .split(",")
      .map((value) => value.trim())
      .filter(Boolean),
  );
}

function originAllowed(request, env) {
  const origin = request.headers.get("origin");
  return !origin || allowedOrigins(env).has(origin);
}

async function secureTokenEquals(provided, expected) {
  const encoder = new TextEncoder();
  const [left, right] = await Promise.all([
    crypto.subtle.digest("SHA-256", encoder.encode(provided)),
    crypto.subtle.digest("SHA-256", encoder.encode(expected)),
  ]);
  const leftBytes = new Uint8Array(left);
  const rightBytes = new Uint8Array(right);
  let difference = 0;
  for (let index = 0; index < leftBytes.length; index += 1) {
    difference |= leftBytes[index] ^ rightBytes[index];
  }
  return difference === 0;
}

function responseHeaders(request, extra = {}) {
  const origin = request.headers.get("origin");
  return {
    "cache-control": "no-store",
    ...(origin ? { "access-control-allow-origin": origin, vary: "Origin" } : {}),
    ...extra,
  };
}

function jsonResponse(request, status, payload, headers = {}) {
  return new Response(payload === undefined ? undefined : JSON.stringify(payload), {
    status,
    headers: responseHeaders(request, {
      "content-type": "application/json; charset=utf-8",
      ...headers,
    }),
  });
}

function rpcError(id, code, message, data) {
  return {
    jsonrpc: "2.0",
    id: id ?? null,
    error: { code, message, ...(data === undefined ? {} : { data }) },
  };
}

async function authorized(request, env) {
  const expected = String(env.CANON_MCP_BEARER_TOKEN ?? "");
  if (!expected) return envBoolean(env.CANON_MCP_PUBLIC_READ_ONLY);
  const authorization = request.headers.get("authorization") ?? "";
  const provided = authorization.startsWith("Bearer ")
    ? authorization.slice("Bearer ".length)
    : "";
  return secureTokenEquals(provided, expected);
}

async function handleMcp(request, env) {
  if (!originAllowed(request, env)) {
    return jsonResponse(request, 403, { error: "origin_not_allowed" });
  }
  if (request.method === "OPTIONS") {
    return new Response(null, {
      status: 204,
      headers: responseHeaders(request, {
        "access-control-allow-headers":
          "authorization, content-type, mcp-protocol-version",
        "access-control-allow-methods": "POST, OPTIONS",
        "access-control-max-age": "86400",
      }),
    });
  }
  if (!(await authorized(request, env))) {
    return jsonResponse(
      request,
      env.CANON_MCP_BEARER_TOKEN ? 401 : 503,
      {
        error: env.CANON_MCP_BEARER_TOKEN
          ? "unauthorized"
          : "public_read_only_not_enabled",
      },
      env.CANON_MCP_BEARER_TOKEN
        ? { "www-authenticate": 'Bearer realm="canon-mcp"' }
        : {},
    );
  }
  if (request.method === "GET" || request.method === "DELETE") {
    return jsonResponse(request, 405, { error: "method_not_allowed" }, { allow: "POST" });
  }
  if (request.method !== "POST") {
    return jsonResponse(request, 405, { error: "method_not_allowed" });
  }

  const declaredLength = Number(request.headers.get("content-length") ?? 0);
  if (declaredLength > MAX_BODY_BYTES) {
    return jsonResponse(
      request,
      413,
      rpcError(null, -32600, "Request body exceeds 1 MiB."),
    );
  }

  try {
    const text = await request.text();
    if (new TextEncoder().encode(text).byteLength > MAX_BODY_BYTES) {
      return jsonResponse(
        request,
        413,
        rpcError(null, -32600, "Request body exceeds 1 MiB."),
      );
    }
    let body;
    try {
      body = JSON.parse(text);
    } catch {
      throw new JsonRpcError(-32700, "Parse error");
    }
    const messages = Array.isArray(body) ? body : [body];
    if (messages.length === 0) {
      return jsonResponse(request, 400, rpcError(null, -32600, "Invalid Request"));
    }
    const replies = (
      await Promise.all(messages.map((message) => protocol.handle(message)))
    ).filter(Boolean);
    if (replies.length === 0) {
      return new Response(null, { status: 202, headers: responseHeaders(request) });
    }
    return jsonResponse(request, 200, Array.isArray(body) ? replies : replies[0]);
  } catch (cause) {
    const rpcCause =
      cause instanceof JsonRpcError
        ? cause
        : new JsonRpcError(-32603, "Internal error");
    return jsonResponse(
      request,
      rpcCause.code === -32700 ? 400 : 500,
      rpcError(null, rpcCause.code, rpcCause.message, rpcCause.data),
    );
  }
}

export default {
  async fetch(request, env = {}) {
    const url = new URL(request.url);
    if (url.pathname === "/healthz" && request.method === "GET") {
      return jsonResponse(request, 200, {
        status: "ok",
        server: SERVER_INFO,
        runtime: "cloudflare-workers",
        documents: CANON_SNAPSHOT.documentCount,
        snapshot_sha256: CANON_SNAPSHOT.sha256,
        mode: "read_only",
      });
    }
    if (url.pathname !== "/mcp") {
      return jsonResponse(request, 404, { error: "not_found" });
    }
    return handleMcp(request, env);
  },
};
