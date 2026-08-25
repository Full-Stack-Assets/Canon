import { createToolCaller, listTools } from "./tools.mjs";

export const SERVER_INFO = { name: "canon-read-only", version: "0.1.0" };
export const SUPPORTED_PROTOCOL_VERSIONS = [
  "2025-11-25",
  "2025-06-18",
  "2025-03-26",
];

export class JsonRpcError extends Error {
  constructor(code, message, data) {
    super(message);
    this.code = code;
    this.data = data;
  }
}

function success(id, result) {
  return { jsonrpc: "2.0", id, result };
}

function error(id, rpcError) {
  return {
    jsonrpc: "2.0",
    id: id ?? null,
    error: {
      code: rpcError.code ?? -32603,
      message: rpcError.message || "Internal error",
      ...(rpcError.data === undefined ? {} : { data: rpcError.data }),
    },
  };
}

function negotiateVersion(requested) {
  return SUPPORTED_PROTOCOL_VERSIONS.includes(requested)
    ? requested
    : SUPPORTED_PROTOCOL_VERSIONS[0];
}

export function createProtocol(index) {
  const callTool = createToolCaller(index);

  async function dispatch(message) {
    if (!message || typeof message !== "object" || Array.isArray(message)) {
      throw new JsonRpcError(-32600, "Invalid Request");
    }
    if (message.jsonrpc !== "2.0" || typeof message.method !== "string") {
      throw new JsonRpcError(-32600, "Invalid Request");
    }

    switch (message.method) {
      case "initialize":
        return {
          protocolVersion: negotiateVersion(message.params?.protocolVersion),
          capabilities: { tools: { listChanged: false } },
          serverInfo: SERVER_INFO,
          instructions:
            "Canon is authoritative, read-only, and evidence-first. Search before fetch. Typed getters return only canonical typed records and identify evidence gaps instead of inventing records.",
        };
      case "ping":
        return {};
      case "tools/list":
        return { tools: listTools() };
      case "tools/call": {
        const name = message.params?.name;
        if (typeof name !== "string" || !name) {
          throw new JsonRpcError(-32602, "tools/call requires a tool name.");
        }
        try {
          return await callTool(name, message.params?.arguments ?? {});
        } catch (cause) {
          if (cause instanceof RangeError) {
            throw new JsonRpcError(-32602, cause.message);
          }
          if (cause instanceof TypeError) {
            throw new JsonRpcError(-32602, cause.message);
          }
          throw cause;
        }
      }
      case "resources/list":
        return { resources: [] };
      case "notifications/initialized":
      case "notifications/cancelled":
        return undefined;
      default:
        throw new JsonRpcError(-32601, `Method not found: ${message.method}`);
    }
  }

  async function handle(message) {
    const isNotification =
      message && typeof message === "object" && !("id" in message);
    try {
      const result = await dispatch(message);
      if (isNotification || result === undefined) return undefined;
      return success(message.id, result);
    } catch (cause) {
      if (isNotification) return undefined;
      return error(
        message?.id,
        cause instanceof JsonRpcError
          ? cause
          : new JsonRpcError(-32603, "Internal error"),
      );
    }
  }

  return { dispatch, handle };
}
