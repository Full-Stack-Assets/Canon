const READ_ONLY_ANNOTATIONS = {
  readOnlyHint: true,
  destructiveHint: false,
  openWorldHint: false,
};

const IDENTIFIER_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["id"],
  properties: {
    id: {
      type: "string",
      minLength: 1,
      maxLength: 512,
      description: "Canonical record ID, Canon document URI, repository path, or exact record title.",
    },
  },
};

const ENTITY_TOOLS = [
  ["canon_get_project", "project", "Get a canonical project record"],
  ["canon_get_work_item", "work_item", "Get a canonical Work Item record"],
  ["canon_get_decision", "decision", "Get a canonical decision record"],
  ["canon_get_capability", "capability", "Get a canonical capability record"],
];

export function listTools() {
  return [
    {
      name: "search",
      title: "Search Canon",
      description:
        "Use this when the user needs to find source-backed records or documents in AOC Canon. Returns a bounded list of canonical results and never changes state.",
      inputSchema: {
        type: "object",
        additionalProperties: false,
        required: ["query"],
        properties: {
          query: {
            type: "string",
            minLength: 1,
            maxLength: 500,
            description: "Natural-language or identifier query for Canon.",
          },
        },
      },
      outputSchema: {
        type: "object",
        required: ["results"],
        properties: {
          results: { type: "array", items: { type: "object" } },
        },
      },
      annotations: READ_ONLY_ANNOTATIONS,
    },
    {
      name: "fetch",
      title: "Fetch Canon document",
      description:
        "Use this after search when the user needs the complete authoritative content for one Canon result. Accepts only indexed Canon identifiers and never changes state.",
      inputSchema: IDENTIFIER_SCHEMA,
      outputSchema: {
        type: "object",
        required: ["id", "title", "text", "url", "metadata"],
        properties: {
          id: { type: "string" },
          title: { type: "string" },
          text: { type: "string" },
          url: { type: "string" },
          metadata: { type: "object" },
        },
      },
      annotations: READ_ONLY_ANNOTATIONS,
    },
    ...ENTITY_TOOLS.map(([name, kind, title]) => ({
      name,
      title,
      description: `Use this when the user requests one exact ${kind.replaceAll("_", " ")} from Canon. It returns only a canonical typed record; if none exists, it reports the evidence gap and bounded search candidates.`,
      inputSchema: IDENTIFIER_SCHEMA,
      outputSchema: { type: "object" },
      annotations: READ_ONLY_ANNOTATIONS,
    })),
  ];
}

function assertPlainObject(value, label) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new TypeError(`${label} must be an object.`);
  }
  return value;
}

function assertString(value, label, maxLength) {
  if (typeof value !== "string" || !value.trim()) {
    throw new TypeError(`${label} must be a non-empty string.`);
  }
  if (value.length > maxLength) throw new TypeError(`${label} is too long.`);
  return value.trim();
}

function toolResult(payload, { isError = false } = {}) {
  return {
    ...(isError ? { isError: true } : {}),
    structuredContent: payload,
    content: [{ type: "text", text: JSON.stringify(payload) }],
  };
}

export function createToolCaller(index) {
  const entityKinds = new Map(ENTITY_TOOLS.map(([name, kind]) => [name, kind]));
  return async function callTool(name, rawArguments = {}) {
    const args = assertPlainObject(rawArguments, "arguments");
    if (name === "search") {
      const query = assertString(args.query, "query", 500);
      return toolResult({ results: index.search(query, { limit: 10 }) });
    }
    if (name === "fetch") {
      const id = assertString(args.id, "id", 512);
      const record = index.fetch(id);
      return record
        ? toolResult(record)
        : toolResult(
            {
              error: "not_found",
              message: "The requested Canon document is not indexed.",
              id,
            },
            { isError: true },
          );
    }
    if (entityKinds.has(name)) {
      const id = assertString(args.id, "id", 512);
      return toolResult(index.getEntity(entityKinds.get(name), id));
    }
    throw new RangeError(`Unknown tool: ${name}`);
  };
}

export const toolInternals = { READ_ONLY_ANNOTATIONS, ENTITY_TOOLS };
