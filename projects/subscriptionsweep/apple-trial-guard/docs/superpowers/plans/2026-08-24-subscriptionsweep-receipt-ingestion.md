# SubscriptionSweep Apple Receipt Ingestion Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Turn a permitted Apple receipt or subscription-confirmation email into minimized evidence, one deduplicated subscription record, and a deterministic reminder-reconciliation job.

**Architecture:** A provider-neutral inbound envelope enters through a signed webhook or local fixture runner. The system parses MIME under strict limits, classifies probable Apple billing messages, extracts fields with exact source excerpts, applies deterministic inference, and writes source, evidence, subscription, audit, and job records in one database transaction.

**Tech Stack:** TypeScript 6.0, Fastify 5, TypeBox, PostgreSQL 17, Drizzle ORM, `postal-mime`, `sanitize-html`, Node `crypto`, Vitest.

**Spec:** `projects/subscriptionsweep/apple-trial-guard/docs/superpowers/specs/2026-08-24-apple-trial-guard-design.md`

## Global Constraints

- Implement on branch `feat/apple-receipt-ingestion` after the core-platform plan is merged.
- Accept only valid private inbound aliases.
- Maximum raw MIME size is 2 MiB.
- Maximum decoded text size is 512 KiB.
- Maximum attachment count is 10; Release 1 does not parse attachment content.
- Raw content expires 24 hours after successful parsing unless explicitly retained.
- Sender authentication metadata is evidence, not absolute proof.
- AI extraction is absent from Release 1.
- Unsupported, contradictory, or locale-ambiguous data becomes `NEEDS_CONFIRMATION`.
- Deduplication never relies on fuzzy similarity alone.
- Every pipeline stage is idempotent.
- Email instructions, links, HTML, and attachments are untrusted.
- No message body, private alias, token, or full order reference may enter logs.

---

### Task 1: Add synthetic receipt fixtures and parser contracts

**Files:**
- Create: `fixtures/apple-receipts/en-US/trial-confirmation.eml`
- Create: `fixtures/apple-receipts/en-US/trial-confirmation.expected.json`
- Create: `fixtures/apple-receipts/en-US/monthly-renewal.eml`
- Create: `fixtures/apple-receipts/en-US/monthly-renewal.expected.json`
- Create: `fixtures/apple-receipts/en-US/annual-renewal.eml`
- Create: `fixtures/apple-receipts/en-US/annual-renewal.expected.json`
- Create: `fixtures/apple-receipts/en-US/ambiguous-date.eml`
- Create: `fixtures/apple-receipts/en-US/ambiguous-date.expected.json`
- Create: `fixtures/apple-receipts/security/prompt-injection.eml`
- Create: `fixtures/apple-receipts/security/prompt-injection.expected.json`
- Create: `packages/parser-apple-receipts/package.json`
- Create: `packages/parser-apple-receipts/tsconfig.json`
- Create: `packages/parser-apple-receipts/src/types.ts`
- Create: `packages/parser-apple-receipts/src/index.ts`
- Test: `packages/parser-apple-receipts/test/fixture-contract.test.ts`

**Interfaces:**
- Consumes: synthetic raw MIME files.
- Produces:
  - `NormalizedMessage`
  - `AppleReceiptParseResult`
  - `FieldEvidence`
  - fixture snapshots containing expected values, evidence state, warnings, and parser version.

- [ ] **Step 1: Create a synthetic free-trial fixture**

Create `fixtures/apple-receipts/en-US/trial-confirmation.eml`:

```eml
From: Apple <no_reply@apple.com>
To: trialguard+0000000000000001@inbound.example.test
Subject: Your subscription confirmation
Message-ID: <synthetic-trial-0001@example.test>
Date: Mon, 24 Aug 2026 12:00:00 -0400
Authentication-Results: inbound.example.test; dkim=pass header.d=apple.com; spf=pass smtp.mailfrom=apple.com
MIME-Version: 1.0
Content-Type: text/plain; charset=utf-8

This is synthetic test data and is not an Apple receipt.

Example Music
Free for 7 days, then $9.99 per month.
Your free trial ends September 1, 2026.
Renews September 1, 2026 unless canceled.
Order ID: TEST-APPLE-TRIAL-0001
```

Create `fixtures/apple-receipts/en-US/trial-confirmation.expected.json`:

```json
{
  "parserVersion": "apple-receipt-v1",
  "classification": "PROBABLE_APPLE_SUBSCRIPTION",
  "evidenceState": "VERIFIED",
  "serviceName": "Example Music",
  "normalizedServiceKey": "example-music",
  "amountMinor": 999,
  "currency": "USD",
  "billingInterval": "TRIAL",
  "trialEndAt": "2026-09-01T16:00:00.000Z",
  "renewalAt": "2026-09-01T16:00:00.000Z",
  "orderReference": "TEST-APPLE-TRIAL-0001",
  "warnings": []
}
```

All fixtures must state that they are synthetic and must not reproduce a real customer’s order identifier, address, name, or private receipt body.

- [ ] **Step 2: Create the package and define the parser types**

Create `packages/parser-apple-receipts/package.json`:

```json
{
  "name": "@subscriptionsweep/parser-apple-receipts",
  "version": "0.1.0",
  "private": true,
  "type": "module",
  "exports": {
    ".": "./src/index.ts"
  },
  "scripts": {
    "build": "tsc -p tsconfig.json",
    "typecheck": "tsc --noEmit",
    "test": "vitest run"
  },
  "dependencies": {
    "@js-temporal/polyfill": "latest"
  }
}
```

Create `packages/parser-apple-receipts/tsconfig.json`:

```json
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": {
    "outDir": "dist",
    "rootDir": "src"
  },
  "include": ["src", "test"]
}
```

Create `packages/parser-apple-receipts/src/types.ts`:

```ts
export type MessageAuthenticationSummary = {
  dkim: "PASS" | "FAIL" | "UNKNOWN";
  spf: "PASS" | "FAIL" | "UNKNOWN";
  alignedDomain: string | null;
};

export type NormalizedMessage = {
  subject: string;
  fromAddress: string;
  messageId: string | null;
  receivedAt: string;
  plainText: string;
  sanitizedText: string;
  authentication: MessageAuthenticationSummary;
};

export type FieldEvidence = {
  field:
    | "serviceName"
    | "amountMinor"
    | "currency"
    | "billingInterval"
    | "startAt"
    | "trialEndAt"
    | "renewalAt"
    | "orderReference";
  value: string | number | null;
  kind: "EXPLICIT" | "INFERRED" | "USER_ASSERTED";
  excerpt: string;
  startOffset: number;
  endOffset: number;
  confidence: number;
  ruleId: string;
};

export type AppleReceiptParseResult = {
  parserVersion: "apple-receipt-v1";
  classification:
    | "PROBABLE_APPLE_SUBSCRIPTION"
    | "APPLE_BILLING_OTHER"
    | "UNSUPPORTED";
  evidenceState: "VERIFIED" | "INFERRED" | "NEEDS_CONFIRMATION";
  serviceName: string | null;
  normalizedServiceKey: string | null;
  amountMinor: number | null;
  currency: string | null;
  billingInterval:
    | "TRIAL"
    | "MONTHLY"
    | "ANNUAL"
    | "OTHER"
    | "UNKNOWN";
  startAt: string | null;
  trialEndAt: string | null;
  renewalAt: string | null;
  orderReference: string | null;
  evidence: FieldEvidence[];
  warnings: string[];
};
```

- [ ] **Step 3: Write the failing fixture-contract test**

Create `packages/parser-apple-receipts/test/fixture-contract.test.ts`:

```ts
import { readFile } from "node:fs/promises";
import { describe, expect, it } from "vitest";
import { parseAppleReceiptFixture } from "../src/index.js";

describe("Apple receipt fixture contract", () => {
  it("matches the synthetic trial snapshot", async () => {
    const raw = await readFile(
      "fixtures/apple-receipts/en-US/trial-confirmation.eml"
    );
    const expected = JSON.parse(
      await readFile(
        "fixtures/apple-receipts/en-US/trial-confirmation.expected.json",
        "utf8"
      )
    );

    const result = await parseAppleReceiptFixture(raw, {
      userTimezone: "America/New_York"
    });

    expect({
      ...result,
      evidence: undefined
    }).toEqual({
      ...expected,
      evidence: undefined
    });
    expect(result.evidence.every((item) => item.excerpt.length > 0)).toBe(true);
  });
});
```

- [ ] **Step 4: Run the test and verify failure**

Run:

```bash
pnpm --filter @subscriptionsweep/parser-apple-receipts test
```

Expected: FAIL because the parser entry point does not exist.

- [ ] **Step 5: Commit the fixture and contract boundary**

Do not implement parsing in this task. Commit only the synthetic fixture corpus, expected snapshots, package configuration, types, and failing test:

```bash
git add fixtures packages/parser-apple-receipts
git commit -m "test(parser): define synthetic Apple receipt corpus"
```

The commit is intentionally red and must not be merged independently; Task 2 turns it green.

---

### Task 2: Normalize MIME safely and minimize message content

**Files:**
- Create: `packages/parser-apple-receipts/src/limits.ts`
- Create: `packages/parser-apple-receipts/src/mime-normalizer.ts`
- Create: `packages/parser-apple-receipts/src/authentication.ts`
- Create: `packages/parser-apple-receipts/src/redaction.ts`
- Modify: `packages/parser-apple-receipts/src/index.ts`
- Test: `packages/parser-apple-receipts/test/mime-normalizer.test.ts`
- Test: `packages/parser-apple-receipts/test/limits.test.ts`

**Interfaces:**
- Consumes: `rawMime: Uint8Array`.
- Produces: `normalizeMime(rawMime, receivedAt): Promise<NormalizedMessage>`.
- Throws typed errors:
  - `MESSAGE_TOO_LARGE`
  - `TEXT_TOO_LARGE`
  - `TOO_MANY_ATTACHMENTS`
  - `MIME_PARSE_FAILED`
  - `UNSUPPORTED_ENCODING`.

- [ ] **Step 1: Install MIME and sanitization dependencies**

Run:

```bash
pnpm --filter @subscriptionsweep/parser-apple-receipts add postal-mime sanitize-html
pnpm --filter @subscriptionsweep/parser-apple-receipts add -D @types/sanitize-html
```

- [ ] **Step 2: Write failing size-limit tests**

Create `packages/parser-apple-receipts/test/limits.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { normalizeMime, ReceiptParserError } from "../src/index.js";

describe("normalizeMime limits", () => {
  it("rejects raw messages larger than two MiB", async () => {
    const raw = new Uint8Array(2 * 1024 * 1024 + 1);

    await expect(
      normalizeMime(raw, "2026-08-24T16:00:00.000Z")
    ).rejects.toEqual(
      new ReceiptParserError("MESSAGE_TOO_LARGE", "Raw message exceeds 2 MiB")
    );
  });

  it("does not preserve active HTML", async () => {
    const raw = new TextEncoder().encode(
      [
        "From: Apple <no_reply@apple.com>",
        "Subject: Test",
        "MIME-Version: 1.0",
        "Content-Type: text/html; charset=utf-8",
        "",
        '<script>steal()</script><p>Example Music renews September 1, 2026.</p>'
      ].join("\r\n")
    );

    const normalized = await normalizeMime(
      raw,
      "2026-08-24T16:00:00.000Z"
    );

    expect(normalized.sanitizedText).not.toContain("steal()");
    expect(normalized.sanitizedText).toContain(
      "Example Music renews September 1, 2026."
    );
  });
});
```

- [ ] **Step 3: Implement exact limits and errors**

Create `packages/parser-apple-receipts/src/limits.ts`:

```ts
export const RAW_MIME_MAX_BYTES = 2 * 1024 * 1024;
export const DECODED_TEXT_MAX_BYTES = 512 * 1024;
export const ATTACHMENT_MAX_COUNT = 10;
```

Create in `src/index.ts`:

```ts
export class ReceiptParserError extends Error {
  constructor(
    readonly code:
      | "MESSAGE_TOO_LARGE"
      | "TEXT_TOO_LARGE"
      | "TOO_MANY_ATTACHMENTS"
      | "MIME_PARSE_FAILED"
      | "UNSUPPORTED_ENCODING",
    message: string
  ) {
    super(message);
    this.name = "ReceiptParserError";
  }

  override equals(other: unknown) {
    return (
      other instanceof ReceiptParserError &&
      other.code === this.code &&
      other.message === this.message
    );
  }
}
```

Use test matchers that compare `code` and `message`, not object identity.

- [ ] **Step 4: Implement MIME normalization**

Create `packages/parser-apple-receipts/src/mime-normalizer.ts`:

```ts
import PostalMime from "postal-mime";
import sanitizeHtml from "sanitize-html";
import {
  ATTACHMENT_MAX_COUNT,
  DECODED_TEXT_MAX_BYTES,
  RAW_MIME_MAX_BYTES
} from "./limits.js";
import { ReceiptParserError } from "./index.js";
import type { NormalizedMessage } from "./types.js";
import { parseAuthenticationResults } from "./authentication.js";

function bytes(text: string): number {
  return new TextEncoder().encode(text).byteLength;
}

function htmlToText(html: string): string {
  return sanitizeHtml(html, {
    allowedTags: [],
    allowedAttributes: {}
  })
    .replace(/\s+/g, " ")
    .trim();
}

export async function normalizeMime(
  rawMime: Uint8Array,
  receivedAt: string
): Promise<NormalizedMessage> {
  if (rawMime.byteLength > RAW_MIME_MAX_BYTES) {
    throw new ReceiptParserError(
      "MESSAGE_TOO_LARGE",
      "Raw message exceeds 2 MiB"
    );
  }

  let parsed;
  try {
    parsed = await PostalMime.parse(rawMime);
  } catch {
    throw new ReceiptParserError("MIME_PARSE_FAILED", "Unable to parse MIME");
  }

  if ((parsed.attachments?.length ?? 0) > ATTACHMENT_MAX_COUNT) {
    throw new ReceiptParserError(
      "TOO_MANY_ATTACHMENTS",
      "Message contains more than 10 attachments"
    );
  }

  const plainText =
    parsed.text?.trim() ??
    (parsed.html ? htmlToText(parsed.html) : "");

  if (bytes(plainText) > DECODED_TEXT_MAX_BYTES) {
    throw new ReceiptParserError(
      "TEXT_TOO_LARGE",
      "Decoded message text exceeds 512 KiB"
    );
  }

  const fromAddress = parsed.from?.address?.toLowerCase() ?? "";
  const subject = parsed.subject?.trim() ?? "";
  const messageId = parsed.messageId?.trim() || null;
  const sanitizedText = plainText.replace(/\u0000/g, "").trim();

  return {
    subject,
    fromAddress,
    messageId,
    receivedAt,
    plainText: sanitizedText,
    sanitizedText,
    authentication: parseAuthenticationResults(parsed.headers ?? [])
  };
}
```

The normalizer must not expose attachment bytes in its return value.

- [ ] **Step 5: Verify MIME tests and the original fixture test**

Run:

```bash
pnpm --filter @subscriptionsweep/parser-apple-receipts test
```

Expected: limit and normalization tests pass; the fixture-contract test still fails at the field-extraction stage.

Commit:

```bash
git add packages/parser-apple-receipts
git commit -m "feat(parser): normalize MIME under strict limits"
```

---

### Task 3: Classify probable Apple subscription messages

**Files:**
- Create: `packages/parser-apple-receipts/src/classifier.ts`
- Create: `packages/parser-apple-receipts/src/normalization.ts`
- Test: `packages/parser-apple-receipts/test/classifier.test.ts`

**Interfaces:**
- Consumes: `NormalizedMessage`.
- Produces:
  - `classifyAppleMessage(message): ClassificationResult`
  - `normalizeServiceKey(value): string`.

- [ ] **Step 1: Write classifier tests**

Create `packages/parser-apple-receipts/test/classifier.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { classifyAppleMessage } from "../src/classifier.js";

const base = {
  subject: "Your subscription confirmation",
  fromAddress: "no_reply@apple.com",
  messageId: "synthetic@example.test",
  receivedAt: "2026-08-24T16:00:00.000Z",
  plainText: "Example Music\nRenews September 1, 2026.",
  sanitizedText: "Example Music\nRenews September 1, 2026.",
  authentication: {
    dkim: "PASS" as const,
    spf: "PASS" as const,
    alignedDomain: "apple.com"
  }
};

describe("classifyAppleMessage", () => {
  it("recognizes an authenticated Apple subscription confirmation", () => {
    expect(classifyAppleMessage(base)).toEqual({
      classification: "PROBABLE_APPLE_SUBSCRIPTION",
      confidence: 0.98,
      reasons: [
        "ALIGNED_APPLE_DOMAIN",
        "SUBSCRIPTION_SUBJECT",
        "RENEWAL_LANGUAGE"
      ]
    });
  });

  it("refuses a lookalike sender without Apple alignment", () => {
    expect(
      classifyAppleMessage({
        ...base,
        fromAddress: "no_reply@apple-billing.example",
        authentication: {
          dkim: "PASS",
          spf: "PASS",
          alignedDomain: "apple-billing.example"
        }
      }).classification
    ).toBe("UNSUPPORTED");
  });
});
```

- [ ] **Step 2: Implement deterministic classification**

Create `packages/parser-apple-receipts/src/classifier.ts`:

```ts
import type { NormalizedMessage } from "./types.js";

export type ClassificationResult = {
  classification:
    | "PROBABLE_APPLE_SUBSCRIPTION"
    | "APPLE_BILLING_OTHER"
    | "UNSUPPORTED";
  confidence: number;
  reasons: string[];
};

const appleDomains = new Set(["apple.com", "email.apple.com"]);

export function classifyAppleMessage(
  message: NormalizedMessage
): ClassificationResult {
  const reasons: string[] = [];
  const aligned = message.authentication.alignedDomain?.toLowerCase() ?? null;

  if (
    aligned &&
    appleDomains.has(aligned) &&
    message.authentication.dkim === "PASS"
  ) {
    reasons.push("ALIGNED_APPLE_DOMAIN");
  }

  if (/\bsubscription\b/i.test(message.subject)) {
    reasons.push("SUBSCRIPTION_SUBJECT");
  }

  if (/\b(renews?|trial ends?|per month|per year)\b/i.test(message.sanitizedText)) {
    reasons.push("RENEWAL_LANGUAGE");
  }

  if (!reasons.includes("ALIGNED_APPLE_DOMAIN")) {
    return {
      classification: "UNSUPPORTED",
      confidence: 0,
      reasons: ["NO_ALIGNED_APPLE_DOMAIN"]
    };
  }

  if (
    reasons.includes("SUBSCRIPTION_SUBJECT") &&
    reasons.includes("RENEWAL_LANGUAGE")
  ) {
    return {
      classification: "PROBABLE_APPLE_SUBSCRIPTION",
      confidence: 0.98,
      reasons
    };
  }

  return {
    classification: "APPLE_BILLING_OTHER",
    confidence: 0.7,
    reasons
  };
}
```

- [ ] **Step 3: Verify and commit**

Run:

```bash
pnpm --filter @subscriptionsweep/parser-apple-receipts test -- classifier
```

Expected: all classifier tests pass.

Commit:

```bash
git add packages/parser-apple-receipts
git commit -m "feat(parser): classify Apple subscription messages"
```

---

### Task 4: Extract fields with exact evidence excerpts

**Files:**
- Create: `packages/parser-apple-receipts/src/extractors/service.ts`
- Create: `packages/parser-apple-receipts/src/extractors/money.ts`
- Create: `packages/parser-apple-receipts/src/extractors/interval.ts`
- Create: `packages/parser-apple-receipts/src/extractors/dates.ts`
- Create: `packages/parser-apple-receipts/src/extractors/order-reference.ts`
- Create: `packages/parser-apple-receipts/src/evidence.ts`
- Create: `packages/parser-apple-receipts/src/parser.ts`
- Modify: `packages/parser-apple-receipts/src/index.ts`
- Test: `packages/parser-apple-receipts/test/extractors.test.ts`

**Interfaces:**
- Consumes: `NormalizedMessage`, user timezone, and classifier output.
- Produces: `parseAppleReceipt(message, context): AppleReceiptParseResult`.

- [ ] **Step 1: Write failing extractor tests**

Create `packages/parser-apple-receipts/test/extractors.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { extractMoney, extractExplicitDates } from "../src/index.js";

describe("Apple receipt extractors", () => {
  it("extracts USD into integer minor units", () => {
    expect(extractMoney("then $9.99 per month.")).toEqual({
      amountMinor: 999,
      currency: "USD",
      excerpt: "$9.99"
    });
  });

  it("marks an ambiguous numeric date instead of guessing", () => {
    expect(
      extractExplicitDates(
        "Renews 09/01/2026.",
        "en-UNKNOWN",
        "America/New_York"
      )
    ).toEqual({
      trialEndAt: null,
      renewalAt: null,
      warnings: ["AMBIGUOUS_NUMERIC_DATE"]
    });
  });
});
```

- [ ] **Step 2: Implement money extraction**

Create `packages/parser-apple-receipts/src/extractors/money.ts`:

```ts
const symbolCurrency = new Map([
  ["$", "USD"],
  ["£", "GBP"],
  ["€", "EUR"]
]);

export function extractMoney(text: string) {
  const match = text.match(/([$£€])\s?(\d{1,6})(?:[.,](\d{2}))?/);
  if (!match) return null;

  const symbol = match[1]!;
  const whole = Number(match[2]!);
  const fractional = Number(match[3] ?? "00");

  return {
    amountMinor: whole * 100 + fractional,
    currency: symbolCurrency.get(symbol)!,
    excerpt: match[0]
  };
}
```

- [ ] **Step 3: Implement explicit natural-language date extraction**

Release 1 supports these exact English forms:

```text
September 1, 2026
Sep 1, 2026
1 September 2026
1 Sep 2026
```

Numeric-only dates such as `09/01/2026` remain `NEEDS_CONFIRMATION` unless a locale-specific fixture and parser rule explicitly supports them.

Use `Intl.DateTimeFormat` only for formatting; construct calendar dates from named month tokens and convert local noon in the user timezone to UTC through `@js-temporal/polyfill`.

Every extracted date must retain:

- the matching excerpt;
- start and end offsets;
- rule ID;
- timezone source;
- explicit or inferred kind.

- [ ] **Step 4: Implement the parser orchestrator**

Create `packages/parser-apple-receipts/src/parser.ts`:

```ts
import { classifyAppleMessage } from "./classifier.js";
import { extractBillingInterval } from "./extractors/interval.js";
import { extractMoney } from "./extractors/money.js";
import { extractOrderReference } from "./extractors/order-reference.js";
import { extractServiceName } from "./extractors/service.js";
import { extractExplicitDates } from "./extractors/dates.js";
import type {
  AppleReceiptParseResult,
  NormalizedMessage
} from "./types.js";

export function parseAppleReceipt(
  message: NormalizedMessage,
  context: { userTimezone: string }
): AppleReceiptParseResult {
  const classification = classifyAppleMessage(message);

  if (classification.classification !== "PROBABLE_APPLE_SUBSCRIPTION") {
    return {
      parserVersion: "apple-receipt-v1",
      classification: classification.classification,
      evidenceState: "NEEDS_CONFIRMATION",
      serviceName: null,
      normalizedServiceKey: null,
      amountMinor: null,
      currency: null,
      billingInterval: "UNKNOWN",
      startAt: null,
      trialEndAt: null,
      renewalAt: null,
      orderReference: null,
      evidence: [],
      warnings: classification.reasons
    };
  }

  const service = extractServiceName(message.sanitizedText);
  const money = extractMoney(message.sanitizedText);
  const interval = extractBillingInterval(message.sanitizedText);
  const dates = extractExplicitDates(
    message.sanitizedText,
    "en-US",
    context.userTimezone
  );
  const order = extractOrderReference(message.sanitizedText);

  const warnings = [...dates.warnings];
  if (!service) warnings.push("SERVICE_NAME_MISSING");
  if (!dates.trialEndAt && !dates.renewalAt) warnings.push("FUTURE_DATE_MISSING");

  return {
    parserVersion: "apple-receipt-v1",
    classification: classification.classification,
    evidenceState:
      warnings.length === 0 ? "VERIFIED" : "NEEDS_CONFIRMATION",
    serviceName: service?.value ?? null,
    normalizedServiceKey: service?.normalizedKey ?? null,
    amountMinor: money?.amountMinor ?? null,
    currency: money?.currency ?? null,
    billingInterval: interval.value,
    startAt: null,
    trialEndAt: dates.trialEndAt,
    renewalAt: dates.renewalAt,
    orderReference: order?.value ?? null,
    evidence: [
      ...(service?.evidence ?? []),
      ...(money ? [money.evidence] : []),
      ...interval.evidence,
      ...dates.evidence,
      ...(order?.evidence ?? [])
    ],
    warnings
  };
}
```

- [ ] **Step 5: Run the fixture suite and commit**

Run:

```bash
pnpm --filter @subscriptionsweep/parser-apple-receipts test
```

Expected:

- trial, monthly, and annual fixtures match;
- ambiguous date produces `NEEDS_CONFIRMATION`;
- every non-null field has an evidence excerpt.

Commit:

```bash
git add packages/parser-apple-receipts fixtures
git commit -m "feat(parser): extract Apple subscription evidence"
```

---

### Task 5: Add deterministic inference and consistency validation

**Files:**
- Create: `packages/parser-apple-receipts/src/inference.ts`
- Create: `packages/parser-apple-receipts/src/consistency.ts`
- Modify: `packages/parser-apple-receipts/src/parser.ts`
- Test: `packages/parser-apple-receipts/test/inference.test.ts`
- Test: `packages/parser-apple-receipts/test/consistency.test.ts`

**Interfaces:**
- Consumes: explicit parser result.
- Produces: inferred fields only when all required inputs are explicit, with rule IDs:
  - `TRIAL_END_FROM_START_AND_DAYS_V1`
  - `MONTHLY_RENEWAL_FROM_START_V1`
  - `ANNUAL_RENEWAL_FROM_START_V1`
  - `TIMEZONE_FROM_USER_PROFILE_V1`.

- [ ] **Step 1: Write the failing inference test**

```ts
import { describe, expect, it } from "vitest";
import { inferMissingFields } from "../src/inference.js";

describe("inferMissingFields", () => {
  it("infers a seven-day trial end from an explicit start and duration", () => {
    const result = inferMissingFields({
      startAt: "2026-08-24T16:00:00.000Z",
      explicitTrialDays: 7,
      trialEndAt: null,
      renewalAt: null,
      billingInterval: "TRIAL",
      timezone: "America/New_York"
    });

    expect(result.trialEndAt).toBe("2026-08-31T16:00:00.000Z");
    expect(result.evidence[0]?.kind).toBe("INFERRED");
    expect(result.evidence[0]?.ruleId).toBe(
      "TRIAL_END_FROM_START_AND_DAYS_V1"
    );
  });

  it("does not infer a price", () => {
    const result = inferMissingFields({
      startAt: "2026-08-24T16:00:00.000Z",
      explicitTrialDays: 7,
      trialEndAt: null,
      renewalAt: null,
      billingInterval: "TRIAL",
      timezone: "America/New_York"
    });

    expect("amountMinor" in result).toBe(false);
  });
});
```

- [ ] **Step 2: Implement only the approved inference rules**

Use Temporal calendar arithmetic for monthly and annual intervals. Never approximate a month as 30 days or a year as 365 days.

A result is `INFERRED` only when:

- at least one required future date is inferred;
- no contradictory explicit date exists;
- service identity is present;
- all source inputs are explicit and cited.

- [ ] **Step 3: Validate contradictions**

Create `validateConsistency(result)` with exact warnings:

- `TRIAL_END_AFTER_RENEWAL`
- `RENEWAL_BEFORE_RECEIVED_AT`
- `CURRENCY_WITHOUT_AMOUNT`
- `AMOUNT_WITHOUT_CURRENCY`
- `TRIAL_INTERVAL_WITHOUT_TRIAL_END`
- `MONTHLY_INTERVAL_WITH_ANNUAL_LANGUAGE`
- `CONTRADICTORY_EXPLICIT_DATES`.

Any contradiction forces `NEEDS_CONFIRMATION`.

- [ ] **Step 4: Verify and commit**

Run:

```bash
pnpm --filter @subscriptionsweep/parser-apple-receipts test
```

Expected: all explicit, inferred, ambiguous, and contradictory cases pass.

Commit:

```bash
git add packages/parser-apple-receipts
git commit -m "feat(parser): add bounded inference and consistency checks"
```

---

### Task 6: Persist source messages, evidence, and deduplicated subscriptions

**Files:**
- Create: `packages/database/src/schema/source-messages.ts`
- Create: `packages/database/src/schema/extraction-runs.ts`
- Create: `packages/database/src/schema/subscription-evidence.ts`
- Create: `packages/database/src/schema/inbound-addresses.ts`
- Create: `packages/database/src/schema/confirmation-items.ts`
- Create: `packages/database/src/repositories/ingestion-repository.ts`
- Create: `packages/database/src/repositories/confirmation-repository.ts`
- Modify: `packages/database/src/schema/index.ts`
- Create: `packages/database/migrations/*`
- Test: `packages/database/test/ingestion-idempotency.integration.test.ts`
- Test: `packages/database/test/evidence-preservation.integration.test.ts`

**Interfaces:**
- Consumes:
  - normalized source metadata;
  - parse result;
  - `userId`;
  - `idempotencyKey`.
- Produces:
  - `IngestionRepository.persistParse(input): PersistParseResult`
  - one `SourceMessage`;
  - one `ExtractionRun` per parser version;
  - one or more `SubscriptionEvidence` rows;
  - one merged or new `Subscription`;
  - one `ConfirmationItem` when evidence needs review;
  - one `RECONCILE_REMINDERS` job.

- [ ] **Step 1: Add exact unique constraints**

Required database uniqueness:

```text
source_messages(user_id, provider_message_id) WHERE provider_message_id IS NOT NULL
source_messages(user_id, content_hash)
extraction_runs(source_message_id, parser_version)
inbound_addresses(alias)
jobs(idempotency_key)
reminders(idempotency_key)
```

An order reference is stored as:

```text
order_reference_hash = HMAC-SHA256(application_pepper, normalized_order_reference)
order_reference_last4 = final four display-safe characters
```

Do not store the full order reference outside the short-lived parsing buffer.

- [ ] **Step 2: Write the failing idempotency test**

```ts
it("persists one subscription and one active reminder job for duplicate delivery", async () => {
  const first = await repository.persistParse(input);
  const second = await repository.persistParse({
    ...input,
    idempotencyKey: "same-delivery-idempotency-key"
  });

  expect(second.subscriptionId).toBe(first.subscriptionId);
  expect(await count("source_messages")).toBe(1);
  expect(await count("subscriptions")).toBe(1);
  expect(
    await countWhere("jobs", {
      name: "RECONCILE_REMINDERS",
      state: "QUEUED"
    })
  ).toBe(1);
});
```

- [ ] **Step 3: Implement one transactional persistence method**

`persistParse` must run in one transaction:

1. insert or select the source message;
2. insert or select the extraction run;
3. match by provider message ID, content hash, order reference hash, then exact service/effective-date tuple;
4. create or update the subscription;
5. insert every evidence row without overwriting earlier evidence;
6. insert an audit entry;
7. when the result is `NEEDS_CONFIRMATION`, insert one open confirmation item per unresolved or contradictory field;
8. enqueue one reminder-reconciliation job using a stable idempotency key;
9. commit.

If the transaction fails, no partial subscription or job remains.

- [ ] **Step 4: Verify and commit**

Run:

```bash
DATABASE_URL_TEST=postgresql://subscriptionsweep:subscriptionsweep-local@localhost:54329/subscriptionsweep \
  pnpm --filter @subscriptionsweep/database test
```

Expected: duplicate delivery and evidence-preservation tests pass.

Commit:

```bash
git add packages/database
git commit -m "feat(ingestion): persist evidence and deduplicate subscriptions"
```

---

### Task 7: Add a signed inbound-email webhook and alias resolution

**Files:**
- Create: `services/api/src/routes/inbound-email.ts`
- Create: `services/api/src/routes/sources.ts`
- Create: `services/api/src/routes/imports.ts`
- Create: `services/api/src/security/hmac.ts`
- Create: `services/api/src/security/replay-cache.ts`
- Create: `services/api/src/services/inbound-alias-service.ts`
- Modify: `services/api/src/app.ts`
- Test: `services/api/test/inbound-email.test.ts`
- Test: `services/api/test/inbound-replay.test.ts`

**Interfaces:**
- Consumes:
  - provider webhook `POST /v1/inbound/email`;
  - authenticated user endpoints under `/v1/sources` and `/v1/imports`;
  - headers `X-Inbound-Timestamp`, `X-Inbound-Signature`;
  - `InboundEnvelope`.
- Produces:
  - `202 { ingestionId, state: "QUEUED" }`;
  - private inbound alias creation, rotation, and disconnection;
  - Share Extension and manual receipt import;
  - exact failure codes.

- [ ] **Step 1: Define the signature contract**

Canonical signature payload:

```text
${timestamp}.${rawRequestBody}
```

Signature:

```text
hex(HMAC-SHA256(INBOUND_WEBHOOK_SECRET, canonicalPayload))
```

Required rules:

- timestamp window: ±300 seconds;
- constant-time comparison;
- body limit: 2.8 MiB to accommodate Base64 overhead;
- one replay key per signature and timestamp;
- unknown or disabled alias returns `404`;
- malformed body returns `400`;
- invalid signature returns `401`;
- replay returns `409`;
- accepted messages return `202`.

- [ ] **Step 2: Write the failing valid-signature test**

```ts
it("accepts a signed envelope for an active alias", async () => {
  const body = JSON.stringify(validEnvelope);
  const timestamp = "1787587200";
  const signature = signInboundRequest(secret, timestamp, body);

  const response = await app.inject({
    method: "POST",
    url: "/v1/inbound/email",
    headers: {
      "content-type": "application/json",
      "x-inbound-timestamp": timestamp,
      "x-inbound-signature": signature
    },
    payload: body
  });

  expect(response.statusCode).toBe(202);
  expect(response.json()).toMatchObject({ state: "QUEUED" });
});
```

- [ ] **Step 3: Implement the route**

The route must:

1. capture the unparsed raw body for signature verification;
2. verify timestamp and HMAC before Base64 decoding;
3. validate `InboundEnvelopeSchema`;
4. resolve alias to user ID server-side;
5. reject a body `userId` that does not equal the resolved user ID;
6. enqueue `PROCESS_INBOUND_RECEIPT`;
7. log only ingestion ID, byte count, and failure code.

- [ ] **Step 4: Add user-scoped source management**

Implement:

```text
GET  /v1/sources
POST /v1/sources/inbound-address
POST /v1/sources/inbound-address/rotate
POST /v1/sources/inbound-address/disconnect
```

Rules:

- create returns one private alias and forwarding instructions;
- rotate disables the old alias before returning the new alias in the same transaction;
- disconnect disables inbound delivery immediately;
- disabled aliases return `404` to provider webhooks;
- the full alias is returned only to the authenticated owner;
- logs contain only alias ID and state, never the alias string;
- each mutation requires `Idempotency-Key` and writes an audit entry.

- [ ] **Step 5: Add the Share Extension and manual import endpoint**

Implement:

```text
POST /v1/imports/receipt
```

Accepted body union:

```json
{
  "kind": "RAW_MIME",
  "rawMimeBase64": "<base64>",
  "receivedAt": "2026-08-24T16:00:00.000Z"
}
```

or:

```json
{
  "kind": "PLAIN_TEXT",
  "plainText": "Example Music renews September 1, 2026.",
  "receivedAt": "2026-08-24T16:00:00.000Z",
  "sourceLabel": "Shared from Mail"
}
```

The authenticated user comes from the session. The endpoint enforces the same byte limits, creates a source message with source kind `IOS_SHARE` or `MANUAL_IMPORT`, enqueues `PROCESS_INBOUND_RECEIPT`, and returns `202`. Plain text without Apple sender authentication is never classified as authenticated Apple mail; it can still produce a user-review candidate.

- [ ] **Step 6: Verify and commit**

Run:

```bash
pnpm --filter @subscriptionsweep/api test -- inbound
pnpm --filter @subscriptionsweep/api test -- sources
pnpm --filter @subscriptionsweep/api test -- imports
```

Expected: webhook signature, replay, alias lifecycle, source ownership, import size, and plain-text review tests pass.

Commit:

```bash
git add services/api
git commit -m "feat(api): add inbound receipt sources and imports"
```

---

### Task 8: Orchestrate the receipt pipeline in the worker

**Files:**
- Create: `services/worker/src/handlers/process-inbound-receipt.ts`
- Modify: `services/worker/src/index.ts`
- Create: `packages/security/src/content-hash.ts`
- Create: `packages/security/src/order-reference.ts`
- Create: `packages/security/src/log-redaction.ts`
- Test: `services/worker/test/process-inbound-receipt.integration.test.ts`
- Test: `packages/security/test/log-redaction.test.ts`

**Interfaces:**
- Consumes: `PROCESS_INBOUND_RECEIPT` job.
- Produces:
  - parsed and minimized database records;
  - `RECONCILE_REMINDERS` job;
  - quarantine state for suspicious or unsupported messages;
  - no sensitive telemetry.

- [ ] **Step 1: Write the failing end-to-end worker test**

```ts
it("turns the synthetic trial email into one subscription and two reminders", async () => {
  const raw = await readFile(
    "fixtures/apple-receipts/en-US/trial-confirmation.eml"
  );

  const ingestionId = await seedInboundJob({
    alias: activeAlias,
    rawMimeBase64: raw.toString("base64"),
    receivedAt: "2026-08-24T16:00:00.000Z"
  });

  await runUntilIdle();

  const subscription = await findSubscriptionByIngestion(ingestionId);
  expect(subscription).toMatchObject({
    serviceName: "Example Music",
    evidenceState: "VERIFIED",
    lifecycleState: "ACTIVE"
  });

  const reminders = await listReminders(subscription.id);
  expect(reminders.map((item) => item.kind)).toEqual([
    "TRIAL_48H",
    "TRIAL_24H"
  ]);
});
```

- [ ] **Step 2: Implement the handler**

Create `services/worker/src/handlers/process-inbound-receipt.ts`:

```ts
export function createProcessInboundReceiptHandler(dependencies: {
  loadEnvelope(jobPayload: unknown): Promise<{
    userId: string;
    receivedAt: string;
    rawMime: Uint8Array;
    providerMessageId: string | null;
  }>;
  normalizeMime(raw: Uint8Array, receivedAt: string): Promise<any>;
  parseAppleReceipt(message: any, context: { userTimezone: string }): any;
  loadUserTimezone(userId: string): Promise<string>;
  persistParse(input: any): Promise<any>;
  quarantine(input: {
    userId: string;
    reason: string;
    contentHash: string;
  }): Promise<void>;
}) {
  return async (payload: unknown) => {
    const envelope = await dependencies.loadEnvelope(payload);
    const message = await dependencies.normalizeMime(
      envelope.rawMime,
      envelope.receivedAt
    );
    const timezone = await dependencies.loadUserTimezone(envelope.userId);
    const result = dependencies.parseAppleReceipt(message, {
      userTimezone: timezone
    });

    if (result.classification === "UNSUPPORTED") {
      await dependencies.quarantine({
        userId: envelope.userId,
        reason: "UNSUPPORTED_MESSAGE",
        contentHash: hashContent(envelope.rawMime)
      });
      return { state: "QUARANTINED" };
    }

    return dependencies.persistParse({
      userId: envelope.userId,
      providerMessageId: envelope.providerMessageId,
      receivedAt: envelope.receivedAt,
      result
    });
  };
}
```

- [ ] **Step 3: Add sensitive-data log tests**

The redaction test must prove logs do not contain:

```text
trialguard+0000000000000001@inbound.example.test
TEST-APPLE-TRIAL-0001
no_reply@apple.com
rawMimeBase64
Authorization
```

The test captures JSON logs and scans every serialized field.

- [ ] **Step 4: Run the complete ingestion verification**

Run:

```bash
docker compose up -d db
pnpm test
pnpm test:integration
pnpm typecheck
pnpm build
```

Expected: all parser, webhook, persistence, worker, reminder, and redaction tests pass.

- [ ] **Step 5: Record evidence and commit**

Create `docs/verification/apple-receipt-ingestion-verification.md` with:

- commit SHA;
- fixture names;
- parser version;
- test counts;
- raw-content retention state;
- provider state `SIMULATED`;
- known language and template limitations;
- rollback command.

Commit:

```bash
git add .
git commit -m "test: verify Apple receipt to reminder flow"
```

Leave the draft pull request unmerged for independent review.


---

### Task 9: Add the confirmation resolution API and user-assertion lineage

**Files:**
- Create: `services/api/src/routes/confirmations.ts`
- Create: `services/api/src/services/confirmation-service.ts`
- Modify: `services/api/src/app.ts`
- Modify: `packages/database/src/repositories/confirmation-repository.ts`
- Test: `services/api/test/confirmations.test.ts`
- Test: `packages/database/test/confirmation-lineage.integration.test.ts`

**Interfaces:**
- Consumes: open confirmation items and authenticated user actions.
- Produces:
  - `GET /v1/confirmations`;
  - `POST /v1/confirmations/:id/resolve`;
  - `POST /v1/confirmations/:id/reject`;
  - `POST /v1/confirmations/:id/merge`;
  - immutable source evidence plus separate user assertions.

- [ ] **Step 1: Define the confirmation record**

Required fields:

```text
id
user_id
subscription_id
field_name
proposed_value
warning_code
source_excerpt
source_evidence_id
state
resolved_value
resolved_by
resolved_at
created_at
```

States:

```text
OPEN
RESOLVED
REJECTED
MERGED
SUPERSEDED
```

Unique rule: only one `OPEN` item exists for `(subscription_id, field_name, warning_code, source_evidence_id)`.

- [ ] **Step 2: Write the failing lineage test**

```ts
it("resolving a date preserves source evidence and adds a user assertion", async () => {
  const response = await app.inject({
    method: "POST",
    url: `/v1/confirmations/${confirmationId}/resolve`,
    headers: {
      "x-test-user-id": userId,
      "idempotency-key": "resolve-confirmation-0001"
    },
    payload: {
      value: "2026-09-01T16:00:00.000Z",
      acknowledgement: true
    }
  });

  expect(response.statusCode).toBe(200);

  const evidence = await evidenceRepository.listBySubscription(
    userId,
    subscriptionId
  );

  expect(evidence).toEqual(
    expect.arrayContaining([
      expect.objectContaining({ evidenceKind: "EXPLICIT" }),
      expect.objectContaining({
        evidenceKind: "USER_ASSERTED",
        fieldName: "renewalAt",
        fieldValue: "2026-09-01T16:00:00.000Z"
      })
    ])
  );
});
```

- [ ] **Step 3: Implement resolution**

Resolution must:

1. load the confirmation by user ID and confirmation ID;
2. reject terminal confirmations with `CONFIRMATION_ALREADY_RESOLVED`;
3. validate the field-specific value;
4. require acknowledgement for user-supplied dates;
5. insert a `USER_ASSERTED` evidence row;
6. update the normalized subscription field;
7. set evidence state based on remaining open items;
8. close the confirmation;
9. enqueue reminder reconciliation;
10. write one audit entry;
11. commit all changes atomically.

- [ ] **Step 4: Implement reject and merge**

Reject:

- marks the item `REJECTED`;
- never deletes source evidence;
- leaves the subscription in `NEEDS_CONFIRMATION` when the field remains unresolved.

Merge:

- requires a target subscription owned by the same user;
- preserves both subscriptions’ evidence;
- supersedes the source subscription;
- moves open confirmations and reminders through explicit reconciliation;
- writes an audit entry containing both object IDs.

- [ ] **Step 5: Verify and commit**

Run:

```bash
pnpm --filter @subscriptionsweep/api test -- confirmations
DATABASE_URL_TEST=postgresql://subscriptionsweep:subscriptionsweep-local@localhost:54329/subscriptionsweep \
  pnpm --filter @subscriptionsweep/database test -- confirmation
```

Expected: list, resolve, reject, merge, idempotency, cross-user isolation, and evidence-lineage tests pass.

Commit:

```bash
git add services/api packages/database
git commit -m "feat(confirmations): add user-reviewed evidence resolution"
```
