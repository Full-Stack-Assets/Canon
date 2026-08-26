import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

test("production Canon MCP deployment requires explicit workflow dispatch", () => {
  const workflow = readFileSync(
    new URL("../.github/workflows/deploy-canon-mcp.yml", import.meta.url),
    "utf8",
  );

  assert.match(workflow, /workflow_dispatch:/, "manual dispatch must remain available");
  assert.doesNotMatch(
    workflow,
    /^\s{2}push:\s*$/m,
    "push to main must not trigger production deployment",
  );
});
