#!/usr/bin/env node
import { createServer } from "node:http";
import { createInterface } from "node:readline";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { timingSafeEqual } from "node:crypto";
import { createCanonIndex } from "./canon-index.mjs";
import { createProtocol, JsonRpcError, SERVER_INFO } from "./protocol.mjs";

const MODULE_DIRECTORY = path.dirname(fileURLToPath(import.meta.url));
const DEFAULT_CANON_ROOT = path.resolve(MODULE_DIRECTORY, "..");
const MAX_BODY_BYTES = 1024 * 1024;

function isLoopback(host) {
  return ["127.0.0.1", "::1", "localhost"].includes(host);
}

function envBoolean(name, fallback = false) {
  const value = process.env[name];
  if (value === undefined) return fallback;
  return ["1", "true", "yes", "on"].includes(value.toLowerCase());
}

function safeTokenEquals(provided, expected) {
  const left = Buffer.from(String(provided));
  const right = Buffer.from(String(expected));
  return left.length === right.length && timingSafeEqual(left, right);
}

function jsonResponse(response, statusCode, payload, headers = {}) {
  response.writeHead(statusCode, {
    "content-type": "application/json; charset=utf-8",
    "cache-control": "no-store",
    ...headers,
  });
  response.end(payload === undefined ? undefined : JSON.stringify(payload));
}

function rpcError(id, code, message, data) {
  return {
    jsonrpc: "2.0",
    id: id ?? null,
    error: { code, message, ...(data === undefined ? {} : { data }) },
  };
}

async function readJsonBody(request) {
  const chunks = [];
  let bytes = 0;
  for await (const chunk of request) {
    bytes += chunk.length;
    if (bytes > MAX_BODY_BYTES) {
      throw new JsonRpcError(-32600, "Request body exceeds 1 MiB.");
    }
    chunks.push(chunk);
  }
  try {
    return JSON.parse(Buffer.concat(chunks).toString("utf8"));
  } catch {
    throw new JsonRpcError(-32700, "Parse error");
  }
}

function originAllowed(origin, allowedOrigins, host) {
  if (!origin) return true;
  if (allowedOrigins.has(origin)) return true;
  try {
    const parsed = new URL(origin);
    return isLoopback(host) && isLoopback(parsed.hostname);
  } catch {
    return false;
  }
}

export async function createCanonHttpServer({
  canonRoot = process.env.CANON_ROOT || DEFAULT_CANON_ROOT,
  publicBaseUrl = process.env.CANON_PUBLIC_BASE_URL,
  host = process.env.CANON_MCP_HOST || "127.0.0.1",
  bearerToken = process.env.CANON_MCP_BEARER_TOKEN || "",
  allowPublicReadOnly = envBoolean("CANON_MCP_PUBLIC_READ_ONLY"),
  allowedOrigins = new Set(
    (process.env.CANON_MCP_ALLOWED_ORIGINS || "")
      .split(",")
      .map((value) => value.trim())
      .filter(Boolean),
  ),
} = {}) {
  if (!isLoopback(host) && !bearerToken && !allowPublicReadOnly) {
    throw new Error(
      "Non-loopback binding requires CANON_MCP_BEARER_TOKEN or explicit CANON_MCP_PUBLIC_READ_ONLY=true.",
    );
  }

  const index = await createCanonIndex({
    root: canonRoot,
    ...(publicBaseUrl ? { publicBaseUrl } : {}),
  });
  const protocol = createProtocol(index);

  const server = createServer(async (request, response) => {
    const requestUrl = new URL(request.url || "/", `http://${request.headers.host || host}`);
    if (requestUrl.pathname === "/healthz" && request.method === "GET") {
      return jsonResponse(response, 200, {
        status: "ok",
        server: SERVER_INFO,
        documents: index.documents.length,
        mode: "read_only",
      });
    }
    if (requestUrl.pathname !== "/mcp") {
      return jsonResponse(response, 404, { error: "not_found" });
    }
    if (!originAllowed(request.headers.origin, allowedOrigins, host)) {
      return jsonResponse(response, 403, { error: "origin_not_allowed" });
    }
    if (bearerToken) {
      const authorization = request.headers.authorization || "";
      const provided = authorization.startsWith("Bearer ")
        ? authorization.slice("Bearer ".length)
        : "";
      if (!safeTokenEquals(provided, bearerToken)) {
        return jsonResponse(
          response,
          401,
          { error: "unauthorized" },
          { "www-authenticate": 'Bearer realm="canon-mcp"' },
        );
      }
    }
    if (request.method === "GET" || request.method === "DELETE") {
      response.setHeader("allow", "POST");
      return jsonResponse(response, 405, { error: "method_not_allowed" });
    }
    if (request.method !== "POST") {
      return jsonResponse(response, 405, { error: "method_not_allowed" });
    }

    try {
      const body = await readJsonBody(request);
      const messages = Array.isArray(body) ? body : [body];
      if (messages.length === 0) {
        return jsonResponse(response, 400, rpcError(null, -32600, "Invalid Request"));
      }
      const replies = (await Promise.all(messages.map((message) => protocol.handle(message)))).filter(
        Boolean,
      );
      if (replies.length === 0) {
        response.writeHead(202, { "cache-control": "no-store" });
        return response.end();
      }
      return jsonResponse(response, 200, Array.isArray(body) ? replies : replies[0]);
    } catch (cause) {
      const rpcCause =
        cause instanceof JsonRpcError
          ? cause
          : new JsonRpcError(-32603, "Internal error");
      return jsonResponse(
        response,
        rpcCause.code === -32700 ? 400 : 500,
        rpcError(null, rpcCause.code, rpcCause.message, rpcCause.data),
      );
    }
  });

  return { server, index, protocol };
}

export async function runStdio({
  canonRoot = process.env.CANON_ROOT || DEFAULT_CANON_ROOT,
  publicBaseUrl = process.env.CANON_PUBLIC_BASE_URL,
} = {}) {
  const index = await createCanonIndex({
    root: canonRoot,
    ...(publicBaseUrl ? { publicBaseUrl } : {}),
  });
  const protocol = createProtocol(index);
  const input = createInterface({ input: process.stdin, crlfDelay: Infinity });
  for await (const line of input) {
    if (!line.trim()) continue;
    let message;
    try {
      message = JSON.parse(line);
    } catch {
      process.stdout.write(`${JSON.stringify(rpcError(null, -32700, "Parse error"))}\n`);
      continue;
    }
    const reply = await protocol.handle(message);
    if (reply) process.stdout.write(`${JSON.stringify(reply)}\n`);
  }
}

async function main() {
  const transport = (process.env.CANON_MCP_TRANSPORT || "http").toLowerCase();
  if (transport === "stdio") return runStdio();
  if (transport !== "http") throw new Error(`Unsupported transport: ${transport}`);
  const host = process.env.CANON_MCP_HOST || "127.0.0.1";
  const port = Number.parseInt(process.env.CANON_MCP_PORT || "8787", 10);
  const { server, index } = await createCanonHttpServer({ host });
  server.listen(port, host, () => {
    process.stderr.write(
      `Canon MCP ${SERVER_INFO.version} listening on http://${host}:${port}/mcp (${index.documents.length} documents, read-only)\n`,
    );
  });
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch((error) => {
    process.stderr.write(`${error.stack || error.message}\n`);
    process.exitCode = 1;
  });
}
