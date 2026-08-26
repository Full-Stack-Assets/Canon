import assert from "node:assert/strict";
import test from "node:test";

import { resolveCloudflareAccount } from "../scripts/resolve-cloudflare-account.mjs";

test("uses the configured Cloudflare account when it is accessible", () => {
  const result = resolveCloudflareAccount(
    [
      { id: "acct-a", name: "Primary" },
      { id: "acct-b", name: "Secondary" },
    ],
    "acct-b",
  );

  assert.deepEqual(result, {
    accountId: "acct-b",
    source: "configured",
    warning: null,
  });
});

test("repairs a stale configured account when the token exposes exactly one account", () => {
  const result = resolveCloudflareAccount(
    [{ id: "acct-live", name: "Primary" }],
    "acct-stale",
  );

  assert.deepEqual(result, {
    accountId: "acct-live",
    source: "sole-accessible-account",
    warning: "Configured Cloudflare account is not accessible; using the only account exposed by the API token.",
  });
});

test("fails closed when account selection is ambiguous", () => {
  assert.throws(
    () => resolveCloudflareAccount(
      [
        { id: "acct-a", name: "Primary" },
        { id: "acct-b", name: "Secondary" },
      ],
      "acct-stale",
    ),
    /Cloudflare account selection is ambiguous/,
  );
});
