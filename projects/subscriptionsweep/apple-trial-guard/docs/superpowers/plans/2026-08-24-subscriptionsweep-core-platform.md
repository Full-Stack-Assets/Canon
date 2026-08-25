# SubscriptionSweep Core Platform Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Create the private SubscriptionSweep monorepo and deliver a typed, tenant-scoped core platform with deterministic reminder scheduling, PostgreSQL persistence, a Fastify API, and a durable PostgreSQL worker.

**Architecture:** A pnpm workspace contains independently testable packages for contracts, domain rules, reminder policy, database access, and security. Fastify exposes the user-scoped API. A separate worker leases jobs from PostgreSQL with `FOR UPDATE SKIP LOCKED`; no Redis or always-on personal server is required.

**Tech Stack:** Node.js 24 LTS, pnpm 10, TypeScript 6.0, Fastify 5, TypeBox, PostgreSQL 17, Drizzle ORM, Vitest, Docker Compose.

**Spec:** `projects/subscriptionsweep/apple-trial-guard/docs/superpowers/specs/2026-08-24-apple-trial-guard-design.md`

## Global Constraints

- Target repository: `Full-Stack-Assets/SubscriptionSweep`, private.
- Default branch: `main`; implementation branch: `feat/release-1-core-platform`.
- Node.js must be 24.x LTS.
- TypeScript baseline is 6.0; do not adopt TypeScript 7 during Release 1.
- All timestamps are ISO 8601 UTC at system boundaries.
- Monetary values use integer minor units plus a three-letter currency code.
- Every write accepts an idempotency key.
- Every user-owned query receives an explicit `userId`.
- No live provider credentials or production deployment in this plan.
- Synthetic data only.
- Opening Apple’s subscription-management UI is outside this server plan and cannot mutate cancellation state.

---

### Task 1: Create the private repository and reproducible workspace

**Files:**
- Create: `package.json`
- Create: `pnpm-workspace.yaml`
- Create: `.nvmrc`
- Create: `.npmrc`
- Create: `tsconfig.base.json`
- Create: `eslint.config.mjs`
- Create: `.prettierrc.json`
- Create: `.gitignore`
- Create: `.env.example`
- Create: `docker-compose.yml`
- Create: `scripts/verify-workspace.mjs`
- Create: `tests/workspace.test.ts`
- Create: `docs/canon/CANON-REF.json`
- Create: `.github/workflows/ci.yml`

**Interfaces:**
- Consumes: Approved Canon specification and Work Item.
- Produces: A private repository with root commands `format:check`, `lint`, `typecheck`, `test`, `test:integration`, `build`, and `verify:release`.

- [ ] **Step 1: Create the repository and branch**

Run with an authenticated GitHub operator:

```bash
gh repo create Full-Stack-Assets/SubscriptionSweep \
  --private \
  --description "Evidence-backed Apple subscription trial and renewal reminders" \
  --clone
cd SubscriptionSweep
git checkout -b feat/release-1-core-platform
```

Expected: the repository exists privately and `git branch --show-current` prints `feat/release-1-core-platform`.

- [ ] **Step 2: Pin the runtime and workspace**

Create `.nvmrc`:

```text
24
```

Create `.npmrc`:

```ini
engine-strict=true
save-exact=true
strict-peer-dependencies=true
```

Create `pnpm-workspace.yaml`:

```yaml
packages:
  - apps/*
  - services/*
  - packages/*
```

Create `package.json`:

```json
{
  "name": "subscriptionsweep",
  "version": "0.1.0",
  "private": true,
  "packageManager": "pnpm@10.17.1",
  "engines": {
    "node": ">=24 <25"
  },
  "scripts": {
    "format": "prettier --write .",
    "format:check": "prettier --check .",
    "lint": "eslint .",
    "typecheck": "pnpm -r --if-present typecheck",
    "test": "vitest run",
    "test:integration": "vitest run --config vitest.integration.config.ts",
    "build": "pnpm -r --if-present build",
    "verify:workspace": "node scripts/verify-workspace.mjs",
    "verify:release": "node scripts/verify-release.mjs"
  },
  "devDependencies": {
    "@eslint/js": "latest",
    "@types/node": "latest",
    "eslint": "latest",
    "eslint-config-prettier": "latest",
    "globals": "latest",
    "prettier": "latest",
    "tsx": "latest",
    "typescript": "6.0.0",
    "typescript-eslint": "latest",
    "vitest": "latest"
  }
}
```

Run:

```bash
corepack enable
corepack prepare pnpm@10.17.1 --activate
pnpm install
```

Expected: `pnpm-lock.yaml` is created and `node --version` starts with `v24.`.

- [ ] **Step 3: Write the failing workspace test**

Create `tests/workspace.test.ts`:

```ts
import { readFile } from "node:fs/promises";
import { describe, expect, it } from "vitest";

describe("workspace contract", () => {
  it("pins Node 24 and the private package boundary", async () => {
    const packageJson = JSON.parse(await readFile("package.json", "utf8"));
    const nvmrc = (await readFile(".nvmrc", "utf8")).trim();

    expect(nvmrc).toBe("24");
    expect(packageJson.private).toBe(true);
    expect(packageJson.engines.node).toBe(">=24 <25");
    expect(packageJson.packageManager).toBe("pnpm@10.17.1");
  });
});
```

- [ ] **Step 4: Run the test and verify the expected failure**

Run:

```bash
pnpm vitest run tests/workspace.test.ts
```

Expected before the files are complete: FAIL because one or more required fields or files are missing.

- [ ] **Step 5: Add the local PostgreSQL service**

Create `docker-compose.yml`:

```yaml
services:
  db:
    image: postgres:17-alpine
    environment:
      POSTGRES_DB: subscriptionsweep
      POSTGRES_USER: subscriptionsweep
      POSTGRES_PASSWORD: subscriptionsweep-local
    ports:
      - "54329:5432"
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U subscriptionsweep -d subscriptionsweep"]
      interval: 2s
      timeout: 2s
      retries: 20
    volumes:
      - subscriptionsweep-postgres:/var/lib/postgresql/data

volumes:
  subscriptionsweep-postgres:
```

Create `.env.example`:

```dotenv
NODE_ENV=development
PORT=4100
DATABASE_URL=postgresql://subscriptionsweep:subscriptionsweep-local@localhost:54329/subscriptionsweep
DEMO_AUTH_ENABLED=true
DEMO_AUTH_USER_ID=00000000-0000-4000-8000-000000000001
INBOUND_WEBHOOK_SECRET=local-only-change-me
RAW_MESSAGE_RETENTION_HOURS=24
```

- [ ] **Step 6: Implement the workspace verifier**

Create `scripts/verify-workspace.mjs`:

```js
import { readFile, access } from "node:fs/promises";

const required = [
  "package.json",
  "pnpm-lock.yaml",
  "pnpm-workspace.yaml",
  "tsconfig.base.json",
  ".env.example",
  "docker-compose.yml",
  "docs/canon/CANON-REF.json"
];

for (const path of required) {
  await access(path);
}

const packageJson = JSON.parse(await readFile("package.json", "utf8"));
if (!packageJson.private) throw new Error("root package must remain private");
if (!process.version.startsWith("v24.")) {
  throw new Error(`Node 24 required; received ${process.version}`);
}

console.log(JSON.stringify({ status: "PASS", checked: required }, null, 2));
```

Create `docs/canon/CANON-REF.json`:

```json
{
  "work_item": "WI-2026-08-24-SUBSCRIPTIONSWEEP-APPLE-TRIAL-GUARD",
  "canon_repository": "Full-Stack-Assets/Canon",
  "spec_path": "projects/subscriptionsweep/apple-trial-guard/docs/superpowers/specs/2026-08-24-apple-trial-guard-design.md",
  "buildgraph_decision": "EXTEND_EXISTING",
  "implementation_namespace": "CREATE_NEW"
}
```

- [ ] **Step 7: Verify and commit**

Run:

```bash
pnpm verify:workspace
pnpm vitest run tests/workspace.test.ts
pnpm format:check
git status --short
```

Expected: all commands exit 0 and only intended repository files are present.

Commit:

```bash
git add .
git commit -m "chore: initialize SubscriptionSweep workspace"
```

---

### Task 2: Define versioned contracts and domain states

**Files:**
- Create: `packages/contracts/package.json`
- Create: `packages/contracts/tsconfig.json`
- Create: `packages/contracts/src/common.ts`
- Create: `packages/contracts/src/subscription.ts`
- Create: `packages/contracts/src/reminder.ts`
- Create: `packages/contracts/src/ingestion.ts`
- Create: `packages/contracts/src/audit.ts`
- Create: `packages/contracts/src/index.ts`
- Test: `packages/contracts/test/contracts.test.ts`

**Interfaces:**
- Consumes: ISO timestamps, integer minor units, and user-scoping constraints.
- Produces:
  - `SubscriptionSchema` and `Subscription`
  - `ReminderSchema` and `Reminder`
  - `InboundEnvelopeSchema` and `InboundEnvelope`
  - `AuditEntrySchema` and `AuditEntry`
  - stable enums for evidence, lifecycle, reminder, and delivery states.

- [ ] **Step 1: Create the package and install schema dependencies**

Create `packages/contracts/package.json`:

```json
{
  "name": "@subscriptionsweep/contracts",
  "version": "0.1.0",
  "private": true,
  "type": "module",
  "exports": {
    ".": "./src/index.ts"
  },
  "scripts": {
    "typecheck": "tsc --noEmit",
    "test": "vitest run"
  },
  "dependencies": {
    "typebox": "latest"
  }
}
```

Run:

```bash
pnpm install
```

- [ ] **Step 2: Write the failing contract test**

Create `packages/contracts/test/contracts.test.ts`:

```ts
import { Value } from "typebox/value";
import {
  EvidenceStateSchema,
  SubscriptionSchema,
  type Subscription
} from "../src/index.js";
import { describe, expect, it } from "vitest";

describe("Subscription contract", () => {
  it("accepts integer money and a supported evidence state", () => {
    const subscription: Subscription = {
      id: "6d1bcb2d-0c21-4b4f-8f4e-2642af8fa376",
      userId: "00000000-0000-4000-8000-000000000001",
      serviceName: "Example Music",
      normalizedServiceKey: "example-music",
      billingOwner: "APPLE",
      amountMinor: 999,
      currency: "USD",
      billingInterval: "MONTHLY",
      startAt: "2026-08-24T12:00:00.000Z",
      trialEndAt: null,
      renewalAt: "2026-09-24T12:00:00.000Z",
      timezone: "America/New_York",
      evidenceState: "VERIFIED",
      lifecycleState: "ACTIVE",
      createdAt: "2026-08-24T12:00:00.000Z",
      updatedAt: "2026-08-24T12:00:00.000Z"
    };

    expect(Value.Check(SubscriptionSchema, subscription)).toBe(true);
    expect(Value.Check(EvidenceStateSchema, "UNVERIFIED")).toBe(false);
  });

  it("rejects fractional minor units", () => {
    const invalid = {
      id: "6d1bcb2d-0c21-4b4f-8f4e-2642af8fa376",
      userId: "00000000-0000-4000-8000-000000000001",
      serviceName: "Example Music",
      normalizedServiceKey: "example-music",
      billingOwner: "APPLE",
      amountMinor: 9.99,
      currency: "USD",
      billingInterval: "MONTHLY",
      startAt: "2026-08-24T12:00:00.000Z",
      trialEndAt: null,
      renewalAt: "2026-09-24T12:00:00.000Z",
      timezone: "America/New_York",
      evidenceState: "VERIFIED",
      lifecycleState: "ACTIVE",
      createdAt: "2026-08-24T12:00:00.000Z",
      updatedAt: "2026-08-24T12:00:00.000Z"
    };

    expect(Value.Check(SubscriptionSchema, invalid)).toBe(false);
  });
});
```

- [ ] **Step 3: Run the test to verify it fails**

Run:

```bash
pnpm --filter @subscriptionsweep/contracts test
```

Expected: FAIL because the schemas do not exist.

- [ ] **Step 4: Implement exact shared contracts**

Create `packages/contracts/src/common.ts`:

```ts
import { Type } from "typebox";

export const UuidSchema = Type.String({ format: "uuid" });
export const IsoTimestampSchema = Type.String({ format: "date-time" });
export const CurrencySchema = Type.String({
  pattern: "^[A-Z]{3}$",
  minLength: 3,
  maxLength: 3
});

export const EvidenceStateSchema = Type.Union([
  Type.Literal("VERIFIED"),
  Type.Literal("INFERRED"),
  Type.Literal("NEEDS_CONFIRMATION")
]);

export const SubscriptionLifecycleSchema = Type.Union([
  Type.Literal("CANDIDATE"),
  Type.Literal("ACTIVE"),
  Type.Literal("KEPT"),
  Type.Literal("USER_REPORTED_CANCELED"),
  Type.Literal("EXPIRED"),
  Type.Literal("UNKNOWN")
]);

export const BillingIntervalSchema = Type.Union([
  Type.Literal("TRIAL"),
  Type.Literal("MONTHLY"),
  Type.Literal("ANNUAL"),
  Type.Literal("OTHER"),
  Type.Literal("UNKNOWN")
]);
```

Create `packages/contracts/src/subscription.ts`:

```ts
import { Static, Type } from "typebox";
import {
  BillingIntervalSchema,
  CurrencySchema,
  EvidenceStateSchema,
  IsoTimestampSchema,
  SubscriptionLifecycleSchema,
  UuidSchema
} from "./common.js";

export const SubscriptionSchema = Type.Object(
  {
    id: UuidSchema,
    userId: UuidSchema,
    serviceName: Type.String({ minLength: 1, maxLength: 160 }),
    normalizedServiceKey: Type.String({
      pattern: "^[a-z0-9]+(?:-[a-z0-9]+)*$"
    }),
    billingOwner: Type.Union([Type.Literal("APPLE"), Type.Literal("UNKNOWN")]),
    amountMinor: Type.Union([Type.Integer({ minimum: 0 }), Type.Null()]),
    currency: Type.Union([CurrencySchema, Type.Null()]),
    billingInterval: BillingIntervalSchema,
    startAt: Type.Union([IsoTimestampSchema, Type.Null()]),
    trialEndAt: Type.Union([IsoTimestampSchema, Type.Null()]),
    renewalAt: Type.Union([IsoTimestampSchema, Type.Null()]),
    timezone: Type.String({ minLength: 1, maxLength: 80 }),
    evidenceState: EvidenceStateSchema,
    lifecycleState: SubscriptionLifecycleSchema,
    createdAt: IsoTimestampSchema,
    updatedAt: IsoTimestampSchema
  },
  { additionalProperties: false }
);

export type Subscription = Static<typeof SubscriptionSchema>;
```

Create `packages/contracts/src/reminder.ts`:

```ts
import { Static, Type } from "typebox";
import { IsoTimestampSchema, UuidSchema } from "./common.js";

export const ReminderKindSchema = Type.Union([
  Type.Literal("TRIAL_48H"),
  Type.Literal("TRIAL_24H"),
  Type.Literal("MONTHLY_7D"),
  Type.Literal("MONTHLY_2D"),
  Type.Literal("ANNUAL_30D"),
  Type.Literal("ANNUAL_7D"),
  Type.Literal("ANNUAL_2D"),
  Type.Literal("CONFIRM_DATE"),
  Type.Literal("IMMEDIATE")
]);

export const ReminderStateSchema = Type.Union([
  Type.Literal("PLANNED"),
  Type.Literal("SCHEDULED"),
  Type.Literal("DELIVERED"),
  Type.Literal("ACKNOWLEDGED"),
  Type.Literal("CANCELED"),
  Type.Literal("SUPERSEDED"),
  Type.Literal("FAILED")
]);

export const ReminderSchema = Type.Object(
  {
    id: UuidSchema,
    subscriptionId: UuidSchema,
    policyVersion: Type.Integer({ minimum: 1 }),
    kind: ReminderKindSchema,
    scheduledFor: IsoTimestampSchema,
    state: ReminderStateSchema,
    idempotencyKey: Type.String({ minLength: 16, maxLength: 200 }),
    supersededBy: Type.Union([UuidSchema, Type.Null()]),
    createdAt: IsoTimestampSchema
  },
  { additionalProperties: false }
);

export type Reminder = Static<typeof ReminderSchema>;
```

Create `packages/contracts/src/ingestion.ts`:

```ts
import { Static, Type } from "typebox";
import { IsoTimestampSchema, UuidSchema } from "./common.js";

export const InboundEnvelopeSchema = Type.Object(
  {
    userId: UuidSchema,
    inboundAlias: Type.String({ minLength: 12, maxLength: 160 }),
    providerMessageId: Type.Union([Type.String({ maxLength: 255 }), Type.Null()]),
    receivedAt: IsoTimestampSchema,
    rawMimeBase64: Type.String({ minLength: 4, maxLength: 2_800_000 }),
    idempotencyKey: Type.String({ minLength: 16, maxLength: 200 })
  },
  { additionalProperties: false }
);

export type InboundEnvelope = Static<typeof InboundEnvelopeSchema>;
```

Create `packages/contracts/src/audit.ts`:

```ts
import { Static, Type } from "typebox";
import { IsoTimestampSchema, UuidSchema } from "./common.js";

export const AuditEntrySchema = Type.Object(
  {
    id: UuidSchema,
    userId: UuidSchema,
    actorKind: Type.Union([
      Type.Literal("USER"),
      Type.Literal("SYSTEM"),
      Type.Literal("WORKER"),
      Type.Literal("PROVIDER")
    ]),
    action: Type.String({ minLength: 1, maxLength: 120 }),
    objectType: Type.String({ minLength: 1, maxLength: 80 }),
    objectId: UuidSchema,
    beforeHash: Type.Union([Type.String({ minLength: 64, maxLength: 64 }), Type.Null()]),
    afterHash: Type.Union([Type.String({ minLength: 64, maxLength: 64 }), Type.Null()]),
    sourceReference: Type.Union([Type.String({ maxLength: 255 }), Type.Null()]),
    createdAt: IsoTimestampSchema
  },
  { additionalProperties: false }
);

export type AuditEntry = Static<typeof AuditEntrySchema>;
```

Create `packages/contracts/src/index.ts`:

```ts
export * from "./common.js";
export * from "./subscription.js";
export * from "./reminder.js";
export * from "./ingestion.js";
export * from "./audit.js";
```

- [ ] **Step 5: Verify and commit**

Run:

```bash
pnpm --filter @subscriptionsweep/contracts typecheck
pnpm --filter @subscriptionsweep/contracts test
```

Expected: both commands exit 0.

Commit:

```bash
git add packages/contracts pnpm-lock.yaml
git commit -m "feat(contracts): define SubscriptionSweep domain schemas"
```

---

### Task 3: Implement the deterministic reminder-policy engine

**Files:**
- Create: `packages/reminder-policy/package.json`
- Create: `packages/reminder-policy/tsconfig.json`
- Create: `packages/reminder-policy/src/types.ts`
- Create: `packages/reminder-policy/src/default-policy.ts`
- Create: `packages/reminder-policy/src/schedule.ts`
- Create: `packages/reminder-policy/src/index.ts`
- Test: `packages/reminder-policy/test/schedule.test.ts`
- Test: `packages/reminder-policy/test/dst.test.ts`

**Interfaces:**
- Consumes:
  - `Subscription`
  - `ReminderPolicy`
  - `now: string`
- Produces:
  - `buildReminderDrafts(input: BuildReminderDraftsInput): ReminderDraft[]`
  - stable `idempotencyKey` values derived from subscription, policy version, kind, and scheduled time.

- [ ] **Step 1: Write the failing trial and annual tests**

Create `packages/reminder-policy/test/schedule.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { buildReminderDrafts, defaultReminderPolicy } from "../src/index.js";

describe("buildReminderDrafts", () => {
  it("creates 48-hour and 24-hour trial reminders", () => {
    const drafts = buildReminderDrafts({
      subscription: {
        id: "b5682770-dd80-48d7-a4db-16db86515df5",
        billingInterval: "TRIAL",
        trialEndAt: "2026-09-01T16:00:00.000Z",
        renewalAt: null,
        timezone: "America/New_York",
        evidenceState: "VERIFIED"
      },
      policy: defaultReminderPolicy,
      now: "2026-08-24T16:00:00.000Z"
    });

    expect(drafts.map((draft) => draft.kind)).toEqual([
      "TRIAL_48H",
      "TRIAL_24H"
    ]);
    expect(drafts.map((draft) => draft.scheduledFor)).toEqual([
      "2026-08-30T16:00:00.000Z",
      "2026-08-31T16:00:00.000Z"
    ]);
  });

  it("creates a confirmation reminder instead of guessing a missing date", () => {
    const drafts = buildReminderDrafts({
      subscription: {
        id: "b5682770-dd80-48d7-a4db-16db86515df5",
        billingInterval: "MONTHLY",
        trialEndAt: null,
        renewalAt: null,
        timezone: "America/New_York",
        evidenceState: "NEEDS_CONFIRMATION"
      },
      policy: defaultReminderPolicy,
      now: "2026-08-24T16:00:00.000Z"
    });

    expect(drafts).toHaveLength(1);
    expect(drafts[0]?.kind).toBe("CONFIRM_DATE");
    expect(drafts[0]?.scheduledFor).toBe("2026-08-24T16:00:00.000Z");
  });
});
```

- [ ] **Step 2: Run tests to verify failure**

Run:

```bash
pnpm --filter @subscriptionsweep/reminder-policy test
```

Expected: FAIL because `buildReminderDrafts` and the default policy do not exist.

- [ ] **Step 3: Create the package and implement the policy types and defaults**

Create `packages/reminder-policy/package.json`:

```json
{
  "name": "@subscriptionsweep/reminder-policy",
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
    "@subscriptionsweep/contracts": "workspace:*"
  }
}
```

Create `packages/reminder-policy/tsconfig.json`:

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

Create `packages/reminder-policy/src/types.ts`:

```ts
export type ReminderOffset = {
  kind:
    | "TRIAL_48H"
    | "TRIAL_24H"
    | "MONTHLY_7D"
    | "MONTHLY_2D"
    | "ANNUAL_30D"
    | "ANNUAL_7D"
    | "ANNUAL_2D";
  secondsBefore: number;
};

export type ReminderPolicy = {
  version: number;
  trialOffsets: ReminderOffset[];
  monthlyOffsets: ReminderOffset[];
  annualOffsets: ReminderOffset[];
};

export type ReminderSource = {
  id: string;
  billingInterval: "TRIAL" | "MONTHLY" | "ANNUAL" | "OTHER" | "UNKNOWN";
  trialEndAt: string | null;
  renewalAt: string | null;
  timezone: string;
  evidenceState: "VERIFIED" | "INFERRED" | "NEEDS_CONFIRMATION";
};

export type ReminderDraft = {
  kind: ReminderOffset["kind"] | "CONFIRM_DATE" | "IMMEDIATE";
  scheduledFor: string;
  idempotencyKey: string;
};
```

Create `packages/reminder-policy/src/default-policy.ts`:

```ts
import type { ReminderPolicy } from "./types.js";

export const defaultReminderPolicy: ReminderPolicy = {
  version: 1,
  trialOffsets: [
    { kind: "TRIAL_48H", secondsBefore: 48 * 60 * 60 },
    { kind: "TRIAL_24H", secondsBefore: 24 * 60 * 60 }
  ],
  monthlyOffsets: [
    { kind: "MONTHLY_7D", secondsBefore: 7 * 24 * 60 * 60 },
    { kind: "MONTHLY_2D", secondsBefore: 2 * 24 * 60 * 60 }
  ],
  annualOffsets: [
    { kind: "ANNUAL_30D", secondsBefore: 30 * 24 * 60 * 60 },
    { kind: "ANNUAL_7D", secondsBefore: 7 * 24 * 60 * 60 },
    { kind: "ANNUAL_2D", secondsBefore: 2 * 24 * 60 * 60 }
  ]
};
```

- [ ] **Step 4: Implement scheduling and stable idempotency**

Create `packages/reminder-policy/src/schedule.ts`:

```ts
import { createHash } from "node:crypto";
import type {
  ReminderDraft,
  ReminderOffset,
  ReminderPolicy,
  ReminderSource
} from "./types.js";

export type BuildReminderDraftsInput = {
  subscription: ReminderSource;
  policy: ReminderPolicy;
  now: string;
};

function keyFor(
  subscriptionId: string,
  policyVersion: number,
  kind: string,
  scheduledFor: string
): string {
  return createHash("sha256")
    .update([subscriptionId, policyVersion, kind, scheduledFor].join(":"))
    .digest("hex");
}

function draftFor(
  subscriptionId: string,
  policyVersion: number,
  kind: ReminderDraft["kind"],
  scheduledFor: string
): ReminderDraft {
  return {
    kind,
    scheduledFor,
    idempotencyKey: keyFor(
      subscriptionId,
      policyVersion,
      kind,
      scheduledFor
    )
  };
}

function selectDate(subscription: ReminderSource): string | null {
  if (subscription.billingInterval === "TRIAL") {
    return subscription.trialEndAt;
  }
  return subscription.renewalAt;
}

function selectOffsets(
  interval: ReminderSource["billingInterval"],
  policy: ReminderPolicy
): ReminderOffset[] {
  if (interval === "TRIAL") return policy.trialOffsets;
  if (interval === "MONTHLY") return policy.monthlyOffsets;
  if (interval === "ANNUAL") return policy.annualOffsets;
  return [];
}

export function buildReminderDrafts({
  subscription,
  policy,
  now
}: BuildReminderDraftsInput): ReminderDraft[] {
  if (subscription.evidenceState === "NEEDS_CONFIRMATION") {
    return [
      draftFor(
        subscription.id,
        policy.version,
        "CONFIRM_DATE",
        new Date(now).toISOString()
      )
    ];
  }

  const target = selectDate(subscription);
  if (!target) {
    return [
      draftFor(
        subscription.id,
        policy.version,
        "CONFIRM_DATE",
        new Date(now).toISOString()
      )
    ];
  }

  const nowMs = Date.parse(now);
  const targetMs = Date.parse(target);
  const offsets = selectOffsets(subscription.billingInterval, policy);
  const future = offsets
    .map((offset) => ({
      kind: offset.kind,
      scheduledForMs: targetMs - offset.secondsBefore * 1000
    }))
    .filter((item) => item.scheduledForMs > nowMs)
    .map((item) =>
      draftFor(
        subscription.id,
        policy.version,
        item.kind,
        new Date(item.scheduledForMs).toISOString()
      )
    );

  if (future.length > 0) return future;

  if (targetMs > nowMs) {
    return [
      draftFor(
        subscription.id,
        policy.version,
        "IMMEDIATE",
        new Date(nowMs).toISOString()
      )
    ];
  }

  return [];
}
```

Create `packages/reminder-policy/src/index.ts`:

```ts
export * from "./types.js";
export * from "./default-policy.js";
export * from "./schedule.js";
```

- [ ] **Step 5: Add the timezone-transition test**

Create `packages/reminder-policy/test/dst.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { buildReminderDrafts, defaultReminderPolicy } from "../src/index.js";

describe("timezone-safe UTC scheduling", () => {
  it("uses the authoritative UTC target across a daylight-saving transition", () => {
    const drafts = buildReminderDrafts({
      subscription: {
        id: "28d274a6-ab6c-4ae4-82b7-75f3011c3859",
        billingInterval: "MONTHLY",
        trialEndAt: null,
        renewalAt: "2026-11-08T17:00:00.000Z",
        timezone: "America/New_York",
        evidenceState: "VERIFIED"
      },
      policy: defaultReminderPolicy,
      now: "2026-10-01T12:00:00.000Z"
    });

    expect(drafts[0]?.scheduledFor).toBe("2026-11-01T17:00:00.000Z");
  });
});
```

- [ ] **Step 6: Verify and commit**

Run:

```bash
pnpm --filter @subscriptionsweep/reminder-policy typecheck
pnpm --filter @subscriptionsweep/reminder-policy test
```

Expected: all tests pass.

Commit:

```bash
git add packages/reminder-policy
git commit -m "feat(reminders): add deterministic policy engine"
```

---

### Task 4: Add PostgreSQL schema, migrations, and tenant-scoped repositories

**Files:**
- Create: `packages/database/package.json`
- Create: `packages/database/tsconfig.json`
- Create: `packages/database/drizzle.config.ts`
- Create: `packages/database/src/client.ts`
- Create: `packages/database/src/schema/users.ts`
- Create: `packages/database/src/schema/subscriptions.ts`
- Create: `packages/database/src/schema/reminders.ts`
- Create: `packages/database/src/schema/reminder-policies.ts`
- Create: `packages/database/src/schema/jobs.ts`
- Create: `packages/database/src/schema/audit.ts`
- Create: `packages/database/src/schema/index.ts`
- Create: `packages/database/src/repositories/subscription-repository.ts`
- Create: `packages/database/src/repositories/reminder-repository.ts`
- Create: `packages/database/src/repositories/reminder-policy-repository.ts`
- Create: `packages/database/src/repositories/job-repository.ts`
- Create: `packages/database/src/index.ts`
- Create: `packages/database/migrations/*`
- Test: `packages/database/test/tenant-isolation.integration.test.ts`
- Test: `packages/database/test/reminder-idempotency.integration.test.ts`

**Interfaces:**
- Consumes: contract types and reminder drafts.
- Produces:
  - `SubscriptionRepository.listByUser(userId)`
  - `SubscriptionRepository.findById(userId, subscriptionId)`
  - `ReminderRepository.reconcile(userId, subscriptionId, drafts)`
  - `ReminderPolicyRepository.getActive(userId)`
  - `ReminderPolicyRepository.replace(userId, policy, idempotencyKey)`
  - `JobRepository.enqueue(name, payload, runAt, idempotencyKey)`
  - `JobRepository.leaseNext(workerId, now, leaseSeconds)`.

- [ ] **Step 1: Write the failing tenant-isolation test**

Create `packages/database/test/tenant-isolation.integration.test.ts`:

```ts
import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createDatabase, SubscriptionRepository } from "../src/index.js";

const databaseUrl = process.env.DATABASE_URL_TEST!;

describe("SubscriptionRepository tenant isolation", () => {
  const db = createDatabase(databaseUrl);
  const repository = new SubscriptionRepository(db);

  beforeAll(async () => {
    await db.execute(`TRUNCATE TABLE subscriptions, users CASCADE`);
  });

  afterAll(async () => {
    await db.end();
  });

  it("never returns another user's subscription", async () => {
    const userA = randomUUID();
    const userB = randomUUID();
    const subscriptionId = randomUUID();

    await db.execute(
      `INSERT INTO users (id, timezone, locale, status)
       VALUES ($1, 'America/New_York', 'en-US', 'ACTIVE'),
              ($2, 'America/New_York', 'en-US', 'ACTIVE')`,
      [userA, userB]
    );

    await db.execute(
      `INSERT INTO subscriptions
       (id, user_id, service_name, normalized_service_key, billing_owner,
        billing_interval, timezone, evidence_state, lifecycle_state)
       VALUES ($1, $2, 'Example Music', 'example-music', 'APPLE',
               'MONTHLY', 'America/New_York', 'VERIFIED', 'ACTIVE')`,
      [subscriptionId, userA]
    );

    await expect(repository.findById(userB, subscriptionId)).resolves.toBeNull();
    await expect(repository.findById(userA, subscriptionId)).resolves.toMatchObject({
      id: subscriptionId,
      userId: userA
    });
  });
});
```

- [ ] **Step 2: Run the integration test to verify failure**

Run:

```bash
docker compose up -d db
DATABASE_URL_TEST=postgresql://subscriptionsweep:subscriptionsweep-local@localhost:54329/subscriptionsweep \
  pnpm vitest run packages/database/test/tenant-isolation.integration.test.ts
```

Expected: FAIL because the database package and tables do not exist.

- [ ] **Step 3: Create the database package and define the schema**

Create `packages/database/package.json`:

```json
{
  "name": "@subscriptionsweep/database",
  "version": "0.1.0",
  "private": true,
  "type": "module",
  "exports": {
    ".": "./src/index.ts"
  },
  "scripts": {
    "build": "tsc -p tsconfig.json",
    "typecheck": "tsc --noEmit",
    "test": "vitest run",
    "drizzle-kit": "drizzle-kit"
  },
  "dependencies": {
    "@subscriptionsweep/contracts": "workspace:*",
    "drizzle-orm": "latest",
    "pg": "latest"
  },
  "devDependencies": {
    "@types/pg": "latest",
    "drizzle-kit": "latest"
  }
}
```

Create `packages/database/drizzle.config.ts`:

```ts
import "dotenv/config";
import { defineConfig } from "drizzle-kit";

export default defineConfig({
  out: "./migrations",
  schema: "./src/schema/index.ts",
  dialect: "postgresql",
  dbCredentials: {
    url: process.env.DATABASE_URL!
  },
  strict: true,
  verbose: true
});
```

Create `packages/database/src/schema/subscriptions.ts`:

```ts
import {
  integer,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid
} from "drizzle-orm/pg-core";
import { users } from "./users.js";

export const evidenceState = pgEnum("evidence_state", [
  "VERIFIED",
  "INFERRED",
  "NEEDS_CONFIRMATION"
]);

export const subscriptionLifecycle = pgEnum("subscription_lifecycle", [
  "CANDIDATE",
  "ACTIVE",
  "KEPT",
  "USER_REPORTED_CANCELED",
  "EXPIRED",
  "UNKNOWN"
]);

export const billingInterval = pgEnum("billing_interval", [
  "TRIAL",
  "MONTHLY",
  "ANNUAL",
  "OTHER",
  "UNKNOWN"
]);

export const subscriptions = pgTable(
  "subscriptions",
  {
    id: uuid("id").primaryKey(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    serviceName: text("service_name").notNull(),
    normalizedServiceKey: text("normalized_service_key").notNull(),
    billingOwner: text("billing_owner").notNull(),
    amountMinor: integer("amount_minor"),
    currency: text("currency"),
    billingInterval: billingInterval("billing_interval").notNull(),
    startAt: timestamp("start_at", { withTimezone: true }),
    trialEndAt: timestamp("trial_end_at", { withTimezone: true }),
    renewalAt: timestamp("renewal_at", { withTimezone: true }),
    timezone: text("timezone").notNull(),
    evidenceState: evidenceState("evidence_state").notNull(),
    lifecycleState: subscriptionLifecycle("lifecycle_state").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull()
  },
  (table) => [
    uniqueIndex("subscriptions_user_service_effective_unique").on(
      table.userId,
      table.normalizedServiceKey,
      table.renewalAt
    )
  ]
);
```

Create `packages/database/src/schema/reminders.ts` with:

```ts
import {
  integer,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid
} from "drizzle-orm/pg-core";
import { subscriptions } from "./subscriptions.js";

export const reminderState = pgEnum("reminder_state", [
  "PLANNED",
  "SCHEDULED",
  "DELIVERED",
  "ACKNOWLEDGED",
  "CANCELED",
  "SUPERSEDED",
  "FAILED"
]);

export const reminders = pgTable(
  "reminders",
  {
    id: uuid("id").primaryKey(),
    subscriptionId: uuid("subscription_id")
      .notNull()
      .references(() => subscriptions.id, { onDelete: "cascade" }),
    policyVersion: integer("policy_version").notNull(),
    kind: text("kind").notNull(),
    scheduledFor: timestamp("scheduled_for", { withTimezone: true }).notNull(),
    state: reminderState("state").notNull(),
    idempotencyKey: text("idempotency_key").notNull(),
    supersededBy: uuid("superseded_by"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull()
  },
  (table) => [
    uniqueIndex("reminders_idempotency_unique").on(table.idempotencyKey)
  ]
);
```

Create `packages/database/src/schema/reminder-policies.ts`:

```ts
import {
  boolean,
  integer,
  jsonb,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid
} from "drizzle-orm/pg-core";
import { users } from "./users.js";

export const reminderPolicies = pgTable(
  "reminder_policies",
  {
    id: uuid("id").primaryKey(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    scope: text("scope").default("GLOBAL").notNull(),
    trialOffsetsSeconds: jsonb("trial_offsets_seconds")
      .$type<number[]>()
      .notNull(),
    monthlyOffsetsSeconds: jsonb("monthly_offsets_seconds")
      .$type<number[]>()
      .notNull(),
    annualOffsetsSeconds: jsonb("annual_offsets_seconds")
      .$type<number[]>()
      .notNull(),
    channels: jsonb("channels").$type<string[]>().notNull(),
    quietHoursStart: integer("quiet_hours_start"),
    quietHoursEnd: integer("quiet_hours_end"),
    version: integer("version").notNull(),
    active: boolean("active").default(true).notNull(),
    idempotencyKey: text("idempotency_key").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull()
  },
  (table) => [
    uniqueIndex("reminder_policies_user_version_unique").on(
      table.userId,
      table.version
    ),
    uniqueIndex("reminder_policies_idempotency_unique").on(
      table.idempotencyKey
    )
  ]
);
```

The repository replaces a policy by inserting a new version and marking the prior version inactive inside one transaction. It never updates historical policy rows in place.

Create `packages/database/src/schema/jobs.ts` with fields:

```ts
import {
  integer,
  jsonb,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid
} from "drizzle-orm/pg-core";

export const jobState = pgEnum("job_state", [
  "QUEUED",
  "LEASED",
  "COMPLETED",
  "FAILED",
  "CANCELED"
]);

export const jobs = pgTable(
  "jobs",
  {
    id: uuid("id").primaryKey(),
    name: text("name").notNull(),
    payload: jsonb("payload").notNull(),
    state: jobState("state").default("QUEUED").notNull(),
    runAt: timestamp("run_at", { withTimezone: true }).notNull(),
    leaseOwner: text("lease_owner"),
    leaseUntil: timestamp("lease_until", { withTimezone: true }),
    attempts: integer("attempts").default(0).notNull(),
    maxAttempts: integer("max_attempts").default(5).notNull(),
    idempotencyKey: text("idempotency_key").notNull(),
    lastErrorCode: text("last_error_code"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    completedAt: timestamp("completed_at", { withTimezone: true })
  },
  (table) => [uniqueIndex("jobs_idempotency_unique").on(table.idempotencyKey)]
);
```

Define `users`, `audit_entries`, exports, client creation, and Drizzle configuration using the exact columns from the approved spec.

- [ ] **Step 4: Generate and apply migrations**

Run:

```bash
pnpm --filter @subscriptionsweep/database drizzle-kit generate
pnpm --filter @subscriptionsweep/database drizzle-kit migrate
```

Expected: SQL migrations create the enums, tables, foreign keys, and unique indexes.

- [ ] **Step 5: Implement tenant-scoped repository methods**

Create `packages/database/src/repositories/subscription-repository.ts`:

```ts
import { and, eq } from "drizzle-orm";
import type { Database } from "../client.js";
import { subscriptions } from "../schema/index.js";

export class SubscriptionRepository {
  constructor(private readonly db: Database) {}

  async findById(userId: string, subscriptionId: string) {
    const rows = await this.db
      .select()
      .from(subscriptions)
      .where(
        and(
          eq(subscriptions.userId, userId),
          eq(subscriptions.id, subscriptionId)
        )
      )
      .limit(1);

    const row = rows[0];
    if (!row) return null;

    return {
      ...row,
      startAt: row.startAt?.toISOString() ?? null,
      trialEndAt: row.trialEndAt?.toISOString() ?? null,
      renewalAt: row.renewalAt?.toISOString() ?? null,
      createdAt: row.createdAt.toISOString(),
      updatedAt: row.updatedAt.toISOString()
    };
  }

  async listByUser(userId: string) {
    return this.db
      .select()
      .from(subscriptions)
      .where(eq(subscriptions.userId, userId));
  }
}
```

- [ ] **Step 6: Implement reminder reconciliation transactionally**

`ReminderRepository.reconcile` must:

1. Lock all active reminders for the subscription.
2. Insert drafts using `ON CONFLICT DO NOTHING`.
3. Mark active reminders not present in the new draft set `SUPERSEDED`.
4. Return inserted, preserved, and superseded identifiers.
5. Write one audit entry in the same transaction.

Test with two consecutive identical calls and one changed renewal date.

- [ ] **Step 7: Verify and commit**

Run:

```bash
pnpm --filter @subscriptionsweep/database typecheck
DATABASE_URL_TEST=postgresql://subscriptionsweep:subscriptionsweep-local@localhost:54329/subscriptionsweep \
  pnpm --filter @subscriptionsweep/database test
```

Expected: tenant isolation and reminder idempotency tests pass.

Commit:

```bash
git add packages/database pnpm-lock.yaml
git commit -m "feat(database): add tenant-scoped persistence and durable jobs"
```

---

### Task 5: Expose the core Fastify API with fail-closed demo authentication

**Files:**
- Create: `services/api/package.json`
- Create: `services/api/tsconfig.json`
- Create: `services/api/src/config.ts`
- Create: `services/api/src/app.ts`
- Create: `services/api/src/server.ts`
- Create: `services/api/src/plugins/auth.ts`
- Create: `services/api/src/routes/health.ts`
- Create: `services/api/src/routes/subscriptions.ts`
- Create: `services/api/src/routes/manual-subscriptions.ts`
- Create: `services/api/src/routes/reminders.ts`
- Create: `services/api/src/routes/reminder-policy.ts`
- Create: `services/api/src/routes/subscription-evidence.ts`
- Create: `services/api/src/routes/audit.ts`
- Create: `services/api/src/errors.ts`
- Test: `services/api/test/auth.test.ts`
- Test: `services/api/test/subscriptions.test.ts`

**Interfaces:**
- Consumes: repositories and TypeBox contracts.
- Produces:
  - `GET /health`
  - `GET /v1/subscriptions`
  - `GET /v1/subscriptions/:id`
  - `POST /v1/subscriptions/manual`
  - `GET /v1/subscriptions/:id/evidence`
  - `GET /v1/subscriptions/:id/audit`
  - `GET /v1/reminder-policy`
  - `PUT /v1/reminder-policy`
  - `POST /v1/subscriptions/:id/actions/keep`
  - `POST /v1/subscriptions/:id/actions/mark-canceled`
  - `POST /v1/subscriptions/:id/actions/remind-later`
  - `GET /v1/subscriptions/:id/reminders`.

- [ ] **Step 1: Write the failing cross-user API test**

Create `services/api/test/subscriptions.test.ts`:

```ts
import { randomUUID } from "node:crypto";
import { describe, expect, it } from "vitest";
import { buildApp } from "../src/app.js";

describe("GET /v1/subscriptions/:id", () => {
  it("returns 404 instead of leaking another user's record", async () => {
    const ownerId = randomUUID();
    const requesterId = randomUUID();
    const subscriptionId = randomUUID();

    const app = await buildApp({
      auth: { mode: "test" },
      repositories: {
        subscriptions: {
          findById: async (userId: string, id: string) =>
            userId === ownerId && id === subscriptionId
              ? { id: subscriptionId, userId: ownerId }
              : null
        }
      }
    });

    const response = await app.inject({
      method: "GET",
      url: `/v1/subscriptions/${subscriptionId}`,
      headers: { "x-test-user-id": requesterId }
    });

    expect(response.statusCode).toBe(404);
    expect(response.json()).toEqual({
      code: "SUBSCRIPTION_NOT_FOUND",
      message: "Subscription not found"
    });
  });
});
```

- [ ] **Step 2: Run the test to verify failure**

Run:

```bash
pnpm --filter @subscriptionsweep/api test
```

Expected: FAIL because the app does not exist.

- [ ] **Step 3: Create the API package and implement configuration and authentication**

Create `services/api/package.json`:

```json
{
  "name": "@subscriptionsweep/api",
  "version": "0.1.0",
  "private": true,
  "type": "module",
  "scripts": {
    "dev": "tsx watch src/server.ts",
    "build": "tsc -p tsconfig.json",
    "start": "node dist/server.js",
    "typecheck": "tsc --noEmit",
    "test": "vitest run"
  },
  "dependencies": {
    "@fastify/type-provider-typebox": "latest",
    "@subscriptionsweep/contracts": "workspace:*",
    "@subscriptionsweep/database": "workspace:*",
    "fastify": "5",
    "fastify-plugin": "latest",
    "typebox": "latest"
  }
}
```

Create `services/api/src/plugins/auth.ts`:

```ts
import fp from "fastify-plugin";
import type { FastifyPluginAsync } from "fastify";

declare module "fastify" {
  interface FastifyRequest {
    auth: { userId: string };
  }
}

export type AuthMode = "demo" | "test" | "apple";

export const authPlugin: FastifyPluginAsync<{ mode: AuthMode }> = fp(
  async (app, options) => {
    app.decorateRequest("auth", null);

    app.addHook("preHandler", async (request, reply) => {
      if (request.url === "/health") return;

      if (options.mode === "test") {
        const userId = request.headers["x-test-user-id"];
        if (typeof userId !== "string") {
          return reply.code(401).send({
            code: "AUTH_REQUIRED",
            message: "Test user identity is required"
          });
        }
        request.auth = { userId };
        return;
      }

      if (options.mode === "demo") {
        const userId = process.env.DEMO_AUTH_USER_ID;
        if (!userId || process.env.NODE_ENV === "production") {
          return reply.code(503).send({
            code: "DEMO_AUTH_DISABLED",
            message: "Demo authentication is unavailable"
          });
        }
        request.auth = { userId };
        return;
      }

      return reply.code(503).send({
        code: "APPLE_AUTH_NOT_CONFIGURED",
        message: "Sign in with Apple is not configured"
      });
    });
  }
);
```

The `apple` mode intentionally fails closed until a later plan configures and verifies token validation.

- [ ] **Step 4: Implement the app and subscription routes**

Create `services/api/src/app.ts`:

```ts
import Fastify from "fastify";
import { authPlugin, type AuthMode } from "./plugins/auth.js";
import { registerHealthRoutes } from "./routes/health.js";
import { registerSubscriptionRoutes } from "./routes/subscriptions.js";

export type AppDependencies = {
  auth: { mode: AuthMode };
  repositories: {
    subscriptions: {
      findById(userId: string, id: string): Promise<unknown | null>;
      listByUser?(userId: string): Promise<unknown[]>;
    };
  };
};

export async function buildApp(dependencies: AppDependencies) {
  const app = Fastify({
    logger: {
      redact: [
        "req.headers.authorization",
        "req.headers.cookie",
        "req.headers.x-inbound-signature"
      ]
    }
  });

  await app.register(authPlugin, dependencies.auth);
  await registerHealthRoutes(app);
  await registerSubscriptionRoutes(app, dependencies.repositories);

  return app;
}
```

Every mutation route must:

- read `request.auth.userId`;
- load the subscription with both user ID and subscription ID when a subscription exists;
- require an `Idempotency-Key` header;
- write an audit entry;
- never accept a user ID from the request body.

`POST /v1/subscriptions/manual` accepts:

```json
{
  "serviceName": "Example Music",
  "amountMinor": 999,
  "currency": "USD",
  "billingInterval": "MONTHLY",
  "trialEndAt": null,
  "renewalAt": "2026-09-24T16:00:00.000Z",
  "timezone": "America/New_York"
}
```

It stores every supplied fact as `USER_ASSERTED`, sets overall evidence state to `INFERRED` only when a deterministic date rule is applied, otherwise uses `VERIFIED` for explicit user assertions, and enqueues reminder reconciliation.

`PUT /v1/reminder-policy` validates the exact offset and quiet-hour rules from the approved specification, inserts a new immutable policy version, audits the change, and reconciles every active subscription in bounded batches.

Evidence and audit endpoints return minimized structured records only. They never return raw MIME or full order references.

- [ ] **Step 5: Verify and commit**

Run:

```bash
pnpm --filter @subscriptionsweep/api typecheck
pnpm --filter @subscriptionsweep/api test
```

Expected: API tests pass, including missing auth and cross-user access.

Commit:

```bash
git add services/api
git commit -m "feat(api): add tenant-scoped core endpoints"
```

---

### Task 6: Implement the PostgreSQL leased-job worker

**Files:**
- Create: `services/worker/package.json`
- Create: `services/worker/tsconfig.json`
- Create: `services/worker/src/config.ts`
- Create: `services/worker/src/runner.ts`
- Create: `services/worker/src/job-handler.ts`
- Create: `services/worker/src/handlers/reconcile-reminders.ts`
- Create: `services/worker/src/index.ts`
- Test: `services/worker/test/lease.integration.test.ts`
- Test: `services/worker/test/retry.integration.test.ts`

**Interfaces:**
- Consumes: `JobRepository` and `ReminderRepository`.
- Produces:
  - one lease owner per process;
  - bounded exponential retry;
  - `RECONCILE_REMINDERS` handler;
  - structured terminal job states.

- [ ] **Step 1: Write the failing concurrency test**

Create `services/worker/test/lease.integration.test.ts`:

```ts
import { randomUUID } from "node:crypto";
import { describe, expect, it } from "vitest";
import { JobRepository } from "@subscriptionsweep/database";

describe("job leasing", () => {
  it("leases one due job to only one worker", async () => {
    const jobId = await repository.enqueue(
      "RECONCILE_REMINDERS",
      { userId: randomUUID(), subscriptionId: randomUUID() },
      new Date("2026-08-24T12:00:00.000Z"),
      "lease-test-00000001"
    );

    const [workerA, workerB] = await Promise.all([
      repository.leaseNext(
        "worker-a",
        new Date("2026-08-24T12:00:01.000Z"),
        30
      ),
      repository.leaseNext(
        "worker-b",
        new Date("2026-08-24T12:00:01.000Z"),
        30
      )
    ]);

    expect([workerA?.id, workerB?.id].filter(Boolean)).toEqual([jobId]);
  });
});
```

- [ ] **Step 2: Create the worker package and implement the atomic lease query**

Create `services/worker/package.json`:

```json
{
  "name": "@subscriptionsweep/worker",
  "version": "0.1.0",
  "private": true,
  "type": "module",
  "scripts": {
    "dev": "tsx watch src/index.ts",
    "build": "tsc -p tsconfig.json",
    "start": "node dist/index.js",
    "typecheck": "tsc --noEmit",
    "test": "vitest run"
  },
  "dependencies": {
    "@subscriptionsweep/database": "workspace:*",
    "@subscriptionsweep/reminder-policy": "workspace:*"
  }
}
```

`JobRepository.leaseNext` must execute this shape inside one transaction:

```sql
WITH candidate AS (
  SELECT id
  FROM jobs
  WHERE state = 'QUEUED'
    AND run_at <= $1
    AND (lease_until IS NULL OR lease_until < $1)
  ORDER BY run_at ASC, created_at ASC
  FOR UPDATE SKIP LOCKED
  LIMIT 1
)
UPDATE jobs
SET state = 'LEASED',
    lease_owner = $2,
    lease_until = $1 + ($3 || ' seconds')::interval,
    attempts = attempts + 1
WHERE id = (SELECT id FROM candidate)
RETURNING *;
```

- [ ] **Step 3: Implement the runner**

Create `services/worker/src/runner.ts`:

```ts
import { setTimeout as sleep } from "node:timers/promises";
import type { JobHandler } from "./job-handler.js";

export class WorkerRunner {
  private stopped = false;

  constructor(
    private readonly repository: {
      leaseNext(
        workerId: string,
        now: Date,
        leaseSeconds: number
      ): Promise<{ id: string; name: string; payload: unknown } | null>;
      complete(id: string, workerId: string): Promise<void>;
      fail(
        id: string,
        workerId: string,
        errorCode: string,
        retryAt: Date | null
      ): Promise<void>;
    },
    private readonly handlers: Record<string, JobHandler>,
    private readonly workerId: string
  ) {}

  stop() {
    this.stopped = true;
  }

  async run() {
    while (!this.stopped) {
      const job = await this.repository.leaseNext(
        this.workerId,
        new Date(),
        60
      );

      if (!job) {
        await sleep(500);
        continue;
      }

      const handler = this.handlers[job.name];
      if (!handler) {
        await this.repository.fail(
          job.id,
          this.workerId,
          "UNKNOWN_JOB_TYPE",
          null
        );
        continue;
      }

      try {
        await handler(job.payload);
        await this.repository.complete(job.id, this.workerId);
      } catch (error) {
        const retryAt = new Date(Date.now() + 30_000);
        await this.repository.fail(
          job.id,
          this.workerId,
          "HANDLER_FAILED",
          retryAt
        );
      }
    }
  }
}
```

The repository must cap retries at `max_attempts` and use `FAILED` after the cap.

- [ ] **Step 4: Implement reminder reconciliation handler**

Create `services/worker/src/handlers/reconcile-reminders.ts`:

```ts
import {
  buildReminderDrafts,
  defaultReminderPolicy
} from "@subscriptionsweep/reminder-policy";

export function createReconcileRemindersHandler(dependencies: {
  subscriptions: {
    findById(userId: string, subscriptionId: string): Promise<any | null>;
  };
  reminders: {
    reconcile(
      userId: string,
      subscriptionId: string,
      drafts: unknown[]
    ): Promise<unknown>;
  };
  clock: { now(): string };
}) {
  return async function reconcileReminders(payload: unknown) {
    const { userId, subscriptionId } = payload as {
      userId: string;
      subscriptionId: string;
    };

    const subscription = await dependencies.subscriptions.findById(
      userId,
      subscriptionId
    );

    if (!subscription) {
      throw new Error("SUBSCRIPTION_NOT_FOUND");
    }

    const drafts = buildReminderDrafts({
      subscription,
      policy: defaultReminderPolicy,
      now: dependencies.clock.now()
    });

    return dependencies.reminders.reconcile(
      userId,
      subscriptionId,
      drafts
    );
  };
}
```

- [ ] **Step 5: Verify and commit**

Run:

```bash
DATABASE_URL_TEST=postgresql://subscriptionsweep:subscriptionsweep-local@localhost:54329/subscriptionsweep \
  pnpm --filter @subscriptionsweep/worker test
pnpm --filter @subscriptionsweep/worker typecheck
```

Expected: lease exclusivity and retry tests pass.

Commit:

```bash
git add services/worker
git commit -m "feat(worker): add durable PostgreSQL job execution"
```

---

### Task 7: Add root verification and continuous integration

**Files:**
- Create: `vitest.config.ts`
- Create: `vitest.integration.config.ts`
- Create: `scripts/verify-release.mjs`
- Modify: `.github/workflows/ci.yml`
- Create: `docs/verification/core-platform-verification.md`

**Interfaces:**
- Consumes: all core packages and services.
- Produces: one command, `pnpm verify:release`, that fails if formatting, lint, type checking, tests, migrations, or builds fail.

- [ ] **Step 1: Write the release verifier before claiming completion**

Create `scripts/verify-release.mjs`:

```js
import { spawnSync } from "node:child_process";
import { writeFile } from "node:fs/promises";

const commands = [
  ["pnpm", ["format:check"]],
  ["pnpm", ["lint"]],
  ["pnpm", ["typecheck"]],
  ["pnpm", ["test"]],
  ["pnpm", ["test:integration"]],
  ["pnpm", ["build"]]
];

const receipt = {
  generatedAt: new Date().toISOString(),
  status: "PASS",
  commands: []
};

for (const [command, args] of commands) {
  const result = spawnSync(command, args, {
    stdio: "inherit",
    shell: process.platform === "win32"
  });

  receipt.commands.push({
    command: [command, ...args].join(" "),
    exitCode: result.status
  });

  if (result.status !== 0) {
    receipt.status = "FAIL";
    await writeFile(
      "verification-receipt.json",
      JSON.stringify(receipt, null, 2)
    );
    process.exit(result.status ?? 1);
  }
}

await writeFile(
  "verification-receipt.json",
  JSON.stringify(receipt, null, 2)
);
console.log("Release verification PASS");
```

- [ ] **Step 2: Configure CI with PostgreSQL**

The CI workflow must:

1. use Node 24;
2. activate pnpm 10.17.1;
3. start PostgreSQL 17;
4. run migrations;
5. run `pnpm verify:release`;
6. upload `verification-receipt.json` even when verification fails.

- [ ] **Step 3: Run fresh verification**

Run:

```bash
docker compose up -d db
cp .env.example .env
pnpm install --frozen-lockfile
pnpm verify:release
cat verification-receipt.json
```

Expected:

```json
{
  "status": "PASS"
}
```

with every command reporting exit code `0`.

- [ ] **Step 4: Record evidence and commit**

Document the exact local commit SHA, Node version, pnpm version, PostgreSQL image, commands, test counts, and limitations in `docs/verification/core-platform-verification.md`.

Commit:

```bash
git add .
git commit -m "test: verify core platform release gate"
```

Open or update the draft pull request and leave it unmerged for review.
