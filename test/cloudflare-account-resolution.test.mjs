import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const workflow = readFileSync(
  new URL("../.github/workflows/deploy-canon-mcp.yml", import.meta.url),
  "utf8",
);

test("manual Canon deployment lets Wrangler resolve the account from the API token", () => {
  assert.match(workflow, /CLOUDFLARE_API_TOKEN:\s*\$\{\{\s*secrets\.CLOUDFLARE_API_TOKEN\s*\}\}/);
  assert.doesNotMatch(workflow, /CLOUDFLARE_ACCOUNT_ID:/);
});
