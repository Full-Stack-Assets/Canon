# Canon read-only MCP server

This package exposes the public, repository-backed AOC Canon through a bounded,
read-only Model Context Protocol interface. It does not write to Canon, execute
workflows, change authority, grant access, or deploy itself.

## Tools

| Tool | Purpose |
| --- | --- |
| `search` | Company-knowledge-compatible search returning at most 10 Canon results. |
| `fetch` | Fetch one indexed Canon document by URI, repository path, or canonical URL. |
| `canon_get_project` | Return one typed `project` record or an explicit evidence gap. |
| `canon_get_work_item` | Return one typed `work_item` record or an explicit evidence gap. |
| `canon_get_decision` | Return one typed `decision` record or an explicit evidence gap. |
| `canon_get_capability` | Return one typed `capability` record or an explicit evidence gap. |

Every tool advertises `readOnlyHint: true`, `destructiveHint: false`, and
`openWorldHint: false`. Results include `structuredContent` plus equivalent JSON
text content. `search` and `fetch` use absolute GitHub URLs suitable for source
inspection and citation.

Typed getters do not promote mentions in prose into canonical records. If the
repository lacks a typed record, the tool reports `not_found` and returns a
bounded candidate list. This preserves the evidence-first posture.

## Run locally

Requirements: Node.js 24 or newer. There are no runtime dependencies.

```sh
npm test
npm run mcp
```

The HTTP server binds to `127.0.0.1:8787` and exposes:

- `POST /mcp` — MCP JSON-RPC endpoint
- `GET /healthz` — non-sensitive health status

For a local stdio client:

```sh
npm run mcp:stdio
```

## Configuration

| Variable | Default | Meaning |
| --- | --- | --- |
| `CANON_ROOT` | repository root | Canon filesystem root. |
| `CANON_PUBLIC_BASE_URL` | GitHub `main` blob URL | Base URL used in source links. |
| `CANON_MCP_TRANSPORT` | `http` | `http` or `stdio`. |
| `CANON_MCP_HOST` | `127.0.0.1` | HTTP bind address. |
| `CANON_MCP_PORT` | `8787` | HTTP port. |
| `CANON_MCP_ALLOWED_ORIGINS` | empty | Comma-separated exact browser origins. |
| `CANON_MCP_BEARER_TOKEN` | empty | Optional bearer token for non-ChatGPT clients. |
| `CANON_MCP_PUBLIC_READ_ONLY` | `false` | Explicitly allow non-loopback no-auth serving of public Canon content. |

Non-loopback startup fails unless a bearer token is configured or public
read-only serving is explicitly enabled. Incoming browser `Origin` values are
rejected unless allowlisted; server-to-server requests without `Origin` are
accepted.

## ChatGPT development path

Keep the default loopback binding and use Secure MCP Tunnel, or place the
endpoint behind an approved HTTPS service. Register the resulting URL ending in
`/mcp` in ChatGPT Developer mode. The current package contains no OAuth server
and no write tools. Public deployment, OAuth configuration, and ChatGPT
registration remain Human Authority gates.

## Persistent Cloudflare Worker

The Worker entry point embeds a deterministic, repository-built Canon snapshot,
so it needs no filesystem, database, tunnel, or continuously running personal
device. The snapshot excludes `mcp/generated/` to prevent recursive inclusion.

```sh
npm install
npm run snapshot
npm run worker:dev
npm run worker:deploy
```

[`wrangler.jsonc`](../wrangler.jsonc) explicitly enables public read-only mode
for the public Canon repository. To require a shared bearer token instead, remove
that variable and store `CANON_MCP_BEARER_TOKEN` as a Worker secret. OAuth is not
included. After deployment, verify `GET /healthz`, inspect `POST /mcp`, and add
the resulting HTTPS URL ending in `/mcp` to ChatGPT Developer mode.

Every Wrangler development or deployment build runs the snapshot generator from
`wrangler.jsonc`, ensuring the bundled content matches the deploying Canon
checkout. `npm run snapshot` remains available for deterministic local testing.

## Indexed boundary

Only bounded UTF-8 source files under the known Canon directories are indexed.
Symlinks, dot-directories, dependencies, unknown extensions, files larger than
512 KiB, and paths outside the repository root are excluded.
