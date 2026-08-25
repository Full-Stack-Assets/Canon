# SubscriptionSweep Integration and Release Verification Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Prove the Release 1 system as one coherent product, package all services reproducibly, exercise security and deletion drills, generate a truthful verification bundle, and stop before live credentials, production billing, or App Store submission.

**Architecture:** OCI containers package the web, API, and worker services. Docker Compose provides a production-shaped local environment with PostgreSQL. Cross-platform fixtures prove TypeScript and Swift contract compatibility. A release verifier aggregates Node, browser, database, security, and iOS evidence into signed manifests and human-readable reports.

**Tech Stack:** Docker, PostgreSQL 17, Node.js 24 LTS, pnpm 10, TypeScript 6.0, Playwright, Vitest, Xcode 18-compatible Swift 6 toolchain, XCTest, GitHub Actions, CycloneDX SBOM.

**Spec:** `projects/subscriptionsweep/apple-trial-guard/docs/superpowers/specs/2026-08-24-apple-trial-guard-design.md`

## Global Constraints

- Implement on branch `feat/release-verification` after plans 1–4 are merged.
- No production provider activation.
- No user data.
- No real Apple receipts.
- No production APNs.
- No live transactional email.
- No live Gmail or Outlook connection.
- No StoreKit product in App Store Connect.
- No Stripe checkout.
- No App Store submission.
- No deployment success claim without a provider receipt and independent health check.
- Container images run as non-root.
- Secrets enter only through environment or managed secret references.
- Verification artifacts contain no secrets or receipt contents.
- Every integration state is exactly one of `SIMULATED`, `CONFIGURED`, `VERIFIED`, or `DEGRADED`.
- Failure of one optional notification channel must not erase a successfully scheduled local reminder.
- Deletion must be proven across database, job queue, local notifications, EventKit artifacts, cache, and tokens.

---

### Task 1: Package web, API, and worker services as reproducible containers

**Files:**
- Create: `deploy/docker/Dockerfile.api`
- Create: `deploy/docker/Dockerfile.worker`
- Create: `deploy/docker/Dockerfile.web`
- Create: `deploy/docker/entrypoint-api.sh`
- Create: `deploy/docker/entrypoint-worker.sh`
- Create: `docker-compose.release.yml`
- Create: `.dockerignore`
- Create: `scripts/container-smoke.mjs`
- Test: `tests/container-smoke.test.ts`

**Interfaces:**
- Consumes: built workspace packages.
- Produces:
  - `subscriptionsweep-api:<git-sha>`;
  - `subscriptionsweep-worker:<git-sha>`;
  - `subscriptionsweep-web:<git-sha>`;
  - local release-shaped compose stack.

- [ ] **Step 1: Write the failing image-policy test**

Create `tests/container-smoke.test.ts`:

```ts
import { execFileSync } from "node:child_process";
import { describe, expect, it } from "vitest";

describe("container policy", () => {
  it.each([
    "subscriptionsweep-api:test",
    "subscriptionsweep-worker:test",
    "subscriptionsweep-web:test"
  ])("%s runs as a non-root user", (image) => {
    const user = execFileSync(
      "docker",
      ["image", "inspect", image, "--format", "{{.Config.User}}"],
      { encoding: "utf8" }
    ).trim();

    expect(user).not.toBe("");
    expect(user).not.toBe("0");
    expect(user).not.toBe("root");
  });
});
```

- [ ] **Step 2: Create a multi-stage API image**

Create `deploy/docker/Dockerfile.api`:

```dockerfile
FROM node:24-alpine AS build
WORKDIR /workspace
RUN corepack enable && corepack prepare pnpm@10.17.1 --activate
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY services/api/package.json services/api/package.json
COPY packages ./packages
RUN pnpm install --frozen-lockfile
COPY services/api ./services/api
COPY tsconfig.base.json ./
RUN pnpm --filter @subscriptionsweep/api build

FROM node:24-alpine AS runtime
ENV NODE_ENV=production
WORKDIR /app
RUN addgroup -S subscriptionsweep && adduser -S subscriptionsweep -G subscriptionsweep
COPY --from=build /workspace/services/api/dist ./dist
COPY --from=build /workspace/services/api/package.json ./package.json
COPY --from=build /workspace/node_modules ./node_modules
USER subscriptionsweep
EXPOSE 4100
CMD ["node", "dist/server.js"]
```

Worker and web images follow the same non-root, immutable-runtime pattern. The web image uses Next.js standalone output.

- [ ] **Step 3: Add release-shaped Compose**

`docker-compose.release.yml` includes:

```yaml
services:
  db:
    image: postgres:17-alpine
    environment:
      POSTGRES_DB: subscriptionsweep
      POSTGRES_USER: subscriptionsweep
      POSTGRES_PASSWORD_FILE: /run/secrets/db_password
    secrets:
      - db_password
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U subscriptionsweep -d subscriptionsweep"]
      interval: 3s
      timeout: 3s
      retries: 30

  api:
    image: subscriptionsweep-api:${IMAGE_TAG:-local}
    environment:
      NODE_ENV: production
      PORT: "4100"
      DATABASE_URL_FILE: /run/secrets/database_url
      DEMO_AUTH_ENABLED: "false"
    depends_on:
      db:
        condition: service_healthy
    read_only: true
    tmpfs:
      - /tmp
    ports:
      - "4100:4100"
    secrets:
      - database_url

  worker:
    image: subscriptionsweep-worker:${IMAGE_TAG:-local}
    environment:
      NODE_ENV: production
      DATABASE_URL_FILE: /run/secrets/database_url
    depends_on:
      db:
        condition: service_healthy
    read_only: true
    tmpfs:
      - /tmp
    secrets:
      - database_url

  web:
    image: subscriptionsweep-web:${IMAGE_TAG:-local}
    environment:
      NODE_ENV: production
      API_BASE_URL: http://api:4100
      DEMO_AUTH_ENABLED: "false"
    depends_on:
      - api
    read_only: true
    tmpfs:
      - /tmp
    ports:
      - "3000:3000"

secrets:
  db_password:
    file: .secrets/db_password
  database_url:
    file: .secrets/database_url
```

Release-shaped mode intentionally cannot authenticate until a configured identity adapter exists. A separate test override enables test identity only during automated E2E.

- [ ] **Step 4: Build and smoke-test images**

Run:

```bash
export IMAGE_TAG=test
docker build -f deploy/docker/Dockerfile.api -t subscriptionsweep-api:test .
docker build -f deploy/docker/Dockerfile.worker -t subscriptionsweep-worker:test .
docker build -f deploy/docker/Dockerfile.web -t subscriptionsweep-web:test .
pnpm vitest run tests/container-smoke.test.ts
```

Expected: every image builds, runs as non-root, and exposes no secret in `docker history`.

- [ ] **Step 5: Commit**

```bash
git add deploy docker-compose.release.yml .dockerignore scripts tests
git commit -m "build: package SubscriptionSweep release containers"
```

---

### Task 2: Prove the full receipt-to-reminder-to-dashboard flow

**Files:**
- Create: `tests/e2e/helpers/stack.ts`
- Create: `tests/e2e/helpers/fixtures.ts`
- Create: `tests/e2e/receipt-to-reminder.spec.ts`
- Create: `tests/e2e/ambiguous-receipt.spec.ts`
- Create: `tests/e2e/duplicate-delivery.spec.ts`
- Create: `scripts/wait-for-idle.mjs`
- Modify: `package.json`

**Interfaces:**
- Consumes: release-shaped local stack and synthetic fixtures.
- Produces: product-level acceptance evidence.

- [ ] **Step 1: Add a test-only identity and fixture endpoint**

The API may enable E2E helpers only when all are true:

```text
NODE_ENV=test
E2E_SEED_ENABLED=true
E2E_SEED_TOKEN matches request
```

The route is not registered in production or development.

- [ ] **Step 2: Write the valid-trial acceptance test**

Create `tests/e2e/receipt-to-reminder.spec.ts`:

```ts
import { expect, test } from "@playwright/test";
import { seedReceipt, waitForWorkerIdle } from "./helpers/fixtures";

test("synthetic trial receipt produces two reminders", async ({ page }) => {
  const result = await seedReceipt("en-US/trial-confirmation.eml");
  await waitForWorkerIdle();

  await page.goto("/today");
  await expect(page.getByText("Example Music")).toHaveCount(1);
  await expect(page.getByText("48 hours before")).toBeVisible();
  await expect(page.getByText("24 hours before")).toBeVisible();

  await page.getByRole("link", { name: "Example Music" }).click();
  await expect(page.getByText("Verified")).toBeVisible();
  await expect(page.getByText("TEST-APPLE-TRIAL-0001")).toHaveCount(0);
  expect(result.subscriptionCount).toBe(1);
});
```

- [ ] **Step 3: Write ambiguity and duplicate tests**

Ambiguous test proves:

- `NEEDS_CONFIRMATION`;
- no trial or renewal date-based reminder;
- one immediate confirmation reminder;
- after resolution, obsolete reminder is superseded and date-based reminders exist.

Duplicate test delivers the same MIME three times with:

- same provider message ID;
- missing provider message ID but same content hash;
- new provider message ID but same order-reference hash.

Expected: one subscription, one source record per genuinely distinct delivery rule, one active reminder set, preserved evidence lineage.

- [ ] **Step 4: Run the acceptance suite**

Run:

```bash
pnpm stack:test:up
pnpm exec playwright test tests/e2e
pnpm stack:test:down
```

Expected: all product acceptance tests pass and the stack shuts down cleanly even after failure.

- [ ] **Step 5: Commit**

```bash
git add tests/e2e scripts package.json
git commit -m "test: prove receipt to reminder acceptance path"
```

---

### Task 3: Add credential-ready Sign in with Apple and entitlement services

**Files:**
- Create: `services/api/src/auth/apple-token-verifier.ts`
- Create: `services/api/src/auth/apple-jwks-client.ts`
- Create: `services/api/src/auth/nonce-store.ts`
- Create: `services/api/src/routes/auth-apple.ts`
- Create: `services/api/src/auth/apple-client-secret.ts`
- Create: `services/api/src/routes/auth-apple-web.ts`
- Create: `services/api/src/routes/entitlements.ts`
- Create: `packages/database/src/schema/apple-identities.ts`
- Create: `packages/database/src/schema/entitlements.ts`
- Create: `packages/database/src/repositories/identity-repository.ts`
- Create: `packages/database/src/repositories/entitlement-repository.ts`
- Create: `packages/database/migrations/*`
- Modify: `services/api/src/app.ts`
- Test: `services/api/test/apple-auth.test.ts`
- Test: `services/api/test/entitlements.test.ts`
- Test: `packages/database/test/identity-linking.integration.test.ts`

**Interfaces:**
- Consumes:
  - `POST /v1/auth/apple/nonce`;
  - `POST /v1/auth/apple/exchange`;
  - `GET /v1/auth/apple/web/start`;
  - `POST /v1/auth/apple/web/callback`;
  - Apple identity token;
  - expected client ID;
  - one-time nonce.
- Produces:
  - verified local account session;
  - stable Apple subject linkage;
  - entitlement read and synchronization contracts;
  - fail-closed behavior when Apple configuration is absent.

- [ ] **Step 1: Install the JOSE dependency and define claims**

Run:

```bash
pnpm --filter @subscriptionsweep/api add jose
```

Accepted identity-token claims:

```ts
export type AppleIdentityClaims = {
  iss: "https://appleid.apple.com";
  aud: string | string[];
  exp: number;
  iat: number;
  sub: string;
  nonce?: string;
  email?: string;
  email_verified?: "true" | "false" | boolean;
  is_private_email?: "true" | "false" | boolean;
};
```

Validation rules:

- algorithm `RS256`;
- issuer exactly `https://appleid.apple.com`;
- audience contains configured `APPLE_CLIENT_ID`;
- token is unexpired;
- issued-at is not more than five minutes in the future;
- nonce hash matches one unconsumed server nonce;
- subject is nonempty;
- JWKS key ID exists in Apple’s key set.

- [ ] **Step 2: Write a failing local-JWKS test**

Create a test RSA key pair and local JWKS. Sign a test token with:

```json
{
  "iss": "https://appleid.apple.com",
  "aud": "com.productweld.subscriptionsweep",
  "sub": "synthetic-apple-subject-0001",
  "nonce": "<expected-nonce-hash>",
  "email": "private-relay@example.test",
  "email_verified": true
}
```

Test:

```ts
it("exchanges a valid Apple identity token for a local session", async () => {
  const nonce = await issueNonce();
  const token = await signAppleFixtureToken({
    audience: "com.productweld.subscriptionsweep",
    subject: "synthetic-apple-subject-0001",
    nonceHash: hashNonce(nonce.raw)
  });

  const response = await app.inject({
    method: "POST",
    url: "/v1/auth/apple/exchange",
    payload: {
      identityToken: token,
      nonce: nonce.raw
    }
  });

  expect(response.statusCode).toBe(200);
  expect(response.json()).toMatchObject({
    state: "AUTHENTICATED",
    provider: "APPLE"
  });
});
```

Add rejection tests for wrong audience, wrong issuer, expired token, unknown key ID, nonce replay, and missing configuration.

- [ ] **Step 3: Implement bounded JWKS caching**

`AppleJwksClient`:

- fetches `https://appleid.apple.com/auth/keys`;
- caches successful responses for at most six hours;
- honors a shorter `Cache-Control` max age;
- retains the last valid key set for at most 24 hours only when Apple is temporarily unavailable;
- never accepts a token whose `kid` is absent;
- records source health `VERIFIED`, `DEGRADED`, or `AUTHENTICATION_REQUIRED`;
- injects a local JWKS provider in tests.

No Apple private key is required to validate an app-delivered identity token. The private key remains a later gate for any server-to-server flow that requires a client secret.

- [ ] **Step 4: Implement identity linking**

Database rules:

```text
apple_identities(apple_subject) unique
apple_identities(user_id) unique
```

On first verified token, create one user and identity row in a transaction. On later tokens, resolve the same local user. Never link by email alone. A different Apple subject with the same relay email creates a separate account until the user explicitly completes an account-linking flow.


- [ ] **Step 5: Add the credential-gated web OAuth flow**

The web flow uses a separate Apple Services ID and these exact routes:

```text
GET  /v1/auth/apple/web/start
POST /v1/auth/apple/web/callback
```

`web/start`:

1. requires `APPLE_SERVICE_ID`, `APPLE_TEAM_ID`, `APPLE_KEY_ID`, `APPLE_PRIVATE_KEY`, and `APPLE_WEB_REDIRECT_URI`;
2. creates single-use `state` and nonce records that expire after ten minutes;
3. redirects to Apple’s authorization endpoint with `response_type=code id_token`, `response_mode=form_post`, and scopes `name email`;
4. stores no Apple credential in browser storage.

`web/callback`:

1. validates state, nonce, identity token, and authorization code response;
2. exchanges the code using a client secret signed with ES256 from the configured Apple private key;
3. links only by Apple subject;
4. creates an HTTP-only, Secure, SameSite=Lax application session cookie;
5. rejects replayed state or nonce;
6. redirects to `/today`.

When any required credential is absent, `web/start` returns `APPLE_WEB_AUTH_NOT_CONFIGURED`; it never falls back to demo identity in production.

- [ ] **Step 6: Implement entitlement contracts**

Required endpoints:

```text
GET  /v1/entitlement
POST /v1/entitlement/storekit-local
POST /v1/entitlement/simulated
```

`POST /v1/entitlement/simulated` is registered only in demo or test mode.

Entitlement states:

```text
FREE
AUTO_SIMULATED
APP_STORE_ACTIVE
WEB_ACTIVE
EXPIRED
REVOKED
PENDING
UNKNOWN
```

`storekit-local` accepts local StoreKit-test evidence only when `STOREKIT_LOCAL_TEST_ENABLED=true`; it never runs in production. The production StoreKit server-validation adapter is present as an interface and returns `STOREKIT_SERVER_VALIDATION_NOT_CONFIGURED` until App Store configuration is supplied and verified.

When an annual Auto entitlement becomes active, upsert the user’s `SubscriptionSweep Auto` subscription record, set source kind `STOREKIT_OWN_APP`, and enqueue reminder reconciliation.

- [ ] **Step 7: Verify and commit**

Run:

```bash
pnpm --filter @subscriptionsweep/api test -- apple-auth
pnpm --filter @subscriptionsweep/api test -- entitlements
DATABASE_URL_TEST=postgresql://subscriptionsweep:subscriptionsweep-local@localhost:54329/subscriptionsweep \
  pnpm --filter @subscriptionsweep/database test -- identity
```

Expected: token validation, nonce single-use, identity stability, demo gating, duplicate-purchase prevention, and own-subscription reminder tests pass.

Commit:

```bash
git add services/api packages/database pnpm-lock.yaml
git commit -m "feat(identity): add Apple sign-in and entitlement boundaries"
```

---

### Task 4: Add simulated APNs and email provider contracts

**Files:**
- Create: `packages/notifications/package.json`
- Create: `packages/notifications/tsconfig.json`
- Create: `packages/notifications/src/types.ts`
- Create: `packages/notifications/src/simulated-push-provider.ts`
- Create: `packages/notifications/src/simulated-email-provider.ts`
- Create: `packages/notifications/src/delivery-service.ts`
- Create: `packages/notifications/src/index.ts`
- Create: `packages/database/src/schema/notification-deliveries.ts`
- Create: `packages/database/migrations/*`
- Test: `packages/notifications/test/delivery-service.test.ts`
- Test: `packages/notifications/test/sensitive-content.test.ts`

**Interfaces:**
- Consumes: due reminder, user delivery preferences, and minimized subscription summary.
- Produces:
  - delivery attempt;
  - delivery state;
  - provider reference;
  - retryable or terminal error code.

- [ ] **Step 1: Create the package and define the provider-neutral message**

Create `packages/notifications/package.json`:

```json
{
  "name": "@subscriptionsweep/notifications",
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
    "@subscriptionsweep/contracts": "workspace:*",
    "@subscriptionsweep/database": "workspace:*"
  }
}
```

```ts
export type NotificationMessage = {
  reminderId: string;
  subscriptionId: string;
  channel: "PUSH" | "EMAIL";
  title: string;
  body: string;
  deepLink: string;
  scheduledFor: string;
};

export type DeliveryResult =
  | {
      state: "DELIVERED";
      providerReference: string;
    }
  | {
      state: "RETRY";
      errorCode: string;
      retryAfterSeconds: number;
    }
  | {
      state: "FAILED";
      errorCode: string;
    };
```

The body may contain service name and renewal date. It may not contain evidence excerpts, order references, private aliases, raw receipt content, or access tokens.

- [ ] **Step 2: Implement deterministic simulated providers**

The simulated push provider returns:

```ts
{
  state: "DELIVERED",
  providerReference: `sim-push-${message.reminderId}`
}
```

The simulated email provider returns:

```ts
{
  state: "DELIVERED",
  providerReference: `sim-email-${message.reminderId}`
}
```

Both write delivery records labeled `SIMULATED`.

- [ ] **Step 3: Prove channel independence**

Test:

1. local notification is already scheduled on the iOS fixture state;
2. simulated email fails terminally;
3. reminder remains active;
4. local channel state remains scheduled;
5. delivery history records the email failure;
6. no reminder is canceled because one channel failed.

- [ ] **Step 4: Verify and commit**

Run:

```bash
pnpm --filter @subscriptionsweep/notifications test
pnpm typecheck
```

Expected: contract, retry, channel-independence, and sensitive-content tests pass.

Commit:

```bash
git add packages/notifications packages/database
git commit -m "feat(notifications): add simulated delivery adapters"
```

---

### Task 5: Add observability, audit-chain verification, and leak detection

**Files:**
- Create: `packages/observability/package.json`
- Create: `packages/observability/tsconfig.json`
- Create: `packages/observability/src/logger.ts`
- Create: `packages/observability/src/metrics.ts`
- Create: `packages/observability/src/audit-chain.ts`
- Create: `packages/observability/src/index.ts`
- Create: `scripts/scan-artifacts-for-secrets.mjs`
- Create: `tests/security/log-leak.test.ts`
- Create: `tests/security/audit-chain.integration.test.ts`
- Create: `tests/security/artifact-scan.test.ts`

**Interfaces:**
- Consumes: structured event metadata and audit rows.
- Produces:
  - allowlisted metrics;
  - tamper-evident audit chain;
  - artifact scan.

- [ ] **Step 1: Create the package and define allowed metric labels**

Create `packages/observability/package.json`:

```json
{
  "name": "@subscriptionsweep/observability",
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
  }
}
```

Allowed labels:

```text
environment
service
operation
state
error_code
parser_version
template
locale
channel
permission_state
source_health
```

Forbidden labels include:

```text
user_id
email
alias
service_name
order_reference
message_id
subscription_id
receipt_excerpt
token
```

IDs may appear in restricted audit storage, not metrics.

- [ ] **Step 2: Implement the audit chain**

For each audit entry:

```text
entry_hash = SHA256(
  canonical_json({
    id,
    user_id,
    action,
    object_type,
    object_id,
    before_hash,
    after_hash,
    source_reference,
    created_at,
    previous_entry_hash
  })
)
```

Store `previous_entry_hash` and `entry_hash`. `verifyAuditChain(userId)` walks entries in sequence order and returns the first broken entry or `PASS`.

- [ ] **Step 3: Implement repository-wide secret scanning**

`scan-artifacts-for-secrets.mjs` scans:

```text
logs/
test-results/
playwright-report/
coverage/
dist/
verification/
```

Patterns include:

- `Bearer `;
- `trialguard+`;
- Apple order reference fixture prefix;
- private-key headers;
- `client_secret`;
- `refresh_token`;
- raw MIME header blocks.

Synthetic fixture source files are excluded only by exact path, not broad extension.

- [ ] **Step 4: Run security tests**

Run:

```bash
pnpm vitest run tests/security
node scripts/scan-artifacts-for-secrets.mjs
```

Expected: no leak and an intact audit chain.

- [ ] **Step 5: Commit**

```bash
git add packages/observability scripts tests/security
git commit -m "feat(security): verify logs and audit integrity"
```

---

### Task 6: Execute export, disconnect, and deletion drills

**Files:**
- Create: `services/api/src/routes/privacy.ts`
- Create: `services/worker/src/handlers/build-export.ts`
- Create: `services/worker/src/handlers/delete-account.ts`
- Create: `packages/database/src/repositories/privacy-repository.ts`
- Create: `tests/privacy/export.integration.test.ts`
- Create: `tests/privacy/disconnect.integration.test.ts`
- Create: `tests/privacy/delete-account.integration.test.ts`
- Create: `scripts/verify-deletion.mjs`
- Create: `docs/operations/deletion-runbook.md`

**Interfaces:**
- Consumes: authenticated user and short-lived deletion challenge.
- Produces:
  - data export artifact;
  - source disconnection receipt;
  - deletion receipt;
  - database and job absence proof.

- [ ] **Step 1: Define export contents**

Export includes:

```text
profile.json
subscriptions.json
subscription-evidence.json
reminders.json
notification-deliveries.json
source-health.json
audit.json
manifest.json
```

Export excludes:

- OAuth access and refresh tokens;
- raw receipt bodies that already expired;
- encryption keys;
- provider secrets;
- internal rate-limit state.

`manifest.json` lists every file, SHA-256, row count, generated time, and schema version.

- [ ] **Step 2: Define deletion challenge**

Flow:

1. `POST /v1/privacy/deletion-challenge`;
2. API returns challenge ID and expiration in 10 minutes;
3. user supplies exact phrase;
4. `DELETE /v1/privacy/account` includes challenge ID and idempotency key;
5. worker executes deletion;
6. status endpoint returns terminal receipt.

Challenge is single-use and user-bound.

- [ ] **Step 3: Implement database deletion transaction**

Delete in dependency order or by verified cascade:

```text
notification_deliveries
reminders
subscription_evidence
extraction_runs
source_messages
subscriptions
mailbox_connections
inbound_addresses
pending provider tokens
user-scoped queued jobs
user profile
```

Retain only a non-reversible security tombstone:

```text
deletion_receipt_id
completed_at
schema_version
aggregate_deleted_counts
```

It must not contain user ID, email, service name, or source reference.

- [ ] **Step 4: Write the deletion proof**

`verify-deletion.mjs` receives the test user ID and asserts zero rows in every user-owned table, zero queued jobs, disabled inbound alias, revoked simulated token, and a tombstone with aggregate counts.

- [ ] **Step 5: Run the drill**

Run:

```bash
pnpm vitest run tests/privacy
node scripts/verify-deletion.mjs --user-id 00000000-0000-4000-8000-000000000001
```

Expected: export checksums pass, disconnected sources stop ingestion, deletion removes all scoped data, and the tombstone contains no user identifier.

- [ ] **Step 6: Commit**

```bash
git add services packages tests/privacy scripts docs/operations
git commit -m "feat(privacy): prove export disconnect and deletion"
```

---

### Task 7: Add CI matrices, dependency evidence, and SBOMs

**Files:**
- Modify: `.github/workflows/ci.yml`
- Create: `.github/workflows/ios-ci.yml`
- Create: `.github/workflows/security.yml`
- Create: `.github/dependabot.yml`
- Create: `scripts/generate-sbom.sh`
- Create: `docs/operations/dependency-policy.md`

**Interfaces:**
- Consumes: all build and test commands.
- Produces:
  - Node/Linux CI;
  - macOS/iOS CI;
  - security scan;
  - CycloneDX SBOMs.

- [ ] **Step 1: Define required Node CI jobs**

Required jobs:

```text
format-lint-typecheck
unit-tests
postgres-integration
web-build
playwright
container-build
security-tests
release-verifier
```

Use Node 24 and PostgreSQL 17. Upload test and verification artifacts on failure and success.

- [ ] **Step 2: Define macOS iOS CI**

The workflow:

```yaml
jobs:
  ios-tests:
    runs-on: macos-15
    steps:
      - uses: actions/checkout@v4
      - run: brew install xcodegen
      - run: xcodegen generate --spec apps/ios/project.yml
      - run: swift test --package-path apps/ios/Packages/SubscriptionSweepCore
      - run: |
          xcodebuild \
            -project apps/ios/SubscriptionSweep.xcodeproj \
            -scheme SubscriptionSweep \
            -destination 'platform=iOS Simulator,name=iPhone 17 Pro' \
            test
```

Before finalizing, query installed simulators and select an exact available iPhone 17-class simulator. Record the selected runtime in the receipt.

- [ ] **Step 3: Generate SBOMs**

Use CycloneDX tools to generate:

```text
verification/sbom-node.cdx.json
verification/sbom-containers.cdx.json
verification/sbom-ios-spm.cdx.json
```

Each file is hashed and listed in the release manifest.

- [ ] **Step 4: Add dependency policy**

Policy:

- no unreviewed install scripts;
- exact package versions through lockfiles;
- no dependency with known critical vulnerability at release;
- high vulnerabilities require a documented exploitability decision;
- licenses must be compatible with private commercial distribution;
- package changes require lockfile diff review.

- [ ] **Step 5: Verify and commit**

Run all CI-equivalent commands locally where supported. Trigger GitHub Actions and record workflow run IDs and conclusions.

Commit:

```bash
git add .github scripts docs/operations
git commit -m "ci: add cross-platform release evidence"
```

---

### Task 8: Generate the canonical release-verification bundle

**Files:**
- Create: `scripts/verify-release.mjs`
- Create: `scripts/build-release-manifest.mjs`
- Create: `verification/schema/release-manifest.schema.json`
- Create: `verification/schema/integration-state.schema.json`
- Create: `docs/verification/RELEASE-1-VERIFICATION.md`
- Create: `docs/verification/KNOWN-LIMITATIONS.md`
- Create: `docs/verification/ROLLBACK.md`
- Create: `docs/verification/CREDENTIAL-GATES.md`

**Interfaces:**
- Consumes: test reports, workflow runs, image digests, SBOMs, migration hashes, and iOS evidence.
- Produces:
  - `verification/release-manifest.json`;
  - `verification/verification-receipt.json`;
  - human-readable report.

- [ ] **Step 1: Define integration states**

The manifest includes:

```json
{
  "inbound_email": "SIMULATED",
  "gmail": "SIMULATED",
  "outlook": "SIMULATED",
  "apns": "CONFIGURED",
  "transactional_email": "SIMULATED",
  "sign_in_with_apple": "CONFIGURED",
  "storekit_local": "VERIFIED",
  "app_store_connect": "CONFIGURED",
  "web_billing": "SIMULATED",
  "production_deployment": "CONFIGURED"
}
```

A state may be promoted to `VERIFIED` only with direct external evidence. Release 1.1 connectors that have no implemented adapter remain `SIMULATED`. Use `CONFIGURED` only when code, configuration validation, and a credential contract exist; use `DEGRADED` when a previously working integration loses health.

- [ ] **Step 2: Build the release manifest**

Required fields:

```text
version
git_sha
created_at
spec_reference
work_item
node_version
pnpm_version
typescript_version
swift_version
xcode_version
postgres_version
migration_hashes
container_digests
test_suites
workflow_runs
integration_states
sbom_hashes
known_limitations_hash
rollback_hash
credential_gates_hash
overall_decision
```

`overall_decision` is:

- `PASS_LOCAL_RELEASE_1` when all fixture-driven gates pass;
- `FAIL` when any required local gate fails;
- never `PRODUCTION_READY` in this plan.

- [ ] **Step 3: Make verification fail closed**

`pnpm verify:release` runs:

```text
format
lint
typecheck
unit tests
PostgreSQL integration
receipt E2E
web E2E
security scans
privacy drills
container smoke
manifest schema validation
artifact leak scan
```

The iOS verification receipt is imported from the macOS workflow and must reference a successful commit-identical run.

- [ ] **Step 4: Run fresh release verification**

Run:

```bash
git status --short
pnpm install --frozen-lockfile
pnpm verify:release
node scripts/build-release-manifest.mjs
node scripts/scan-artifacts-for-secrets.mjs
sha256sum verification/*
```

Expected:

```text
overall_decision: PASS_LOCAL_RELEASE_1
production_deployment: CONFIGURED
app_store_submission: BLOCKED_HUMAN_AUTHORITY
live_billing: BLOCKED_HUMAN_AUTHORITY
```

- [ ] **Step 5: Commit the evidence**

```bash
git add verification docs/verification
git commit -m "docs: record Release 1 verification bundle"
```

Do not merge until an independent reviewer validates the manifest against the raw command and workflow evidence.

---

### Task 9: Prepare managed deployment and App Store handoff without activation

**Files:**
- Create: `docs/deployment/MANAGED-DEPLOYMENT-REQUIREMENTS.md`
- Create: `docs/deployment/ENVIRONMENT-CONTRACT.md`
- Create: `docs/deployment/DATABASE-BACKUP-RESTORE.md`
- Create: `docs/app-store/APP-STORE-HANDOFF.md`
- Create: `docs/app-store/APP-PRIVACY-DATA-MAP.md`
- Create: `docs/app-store/REVIEW-NOTES.md`
- Create: `docs/security/THREAT-MODEL.md`
- Create: `docs/security/INCIDENT-RESPONSE.md`
- Create: `docs/support/SUPPORT-RUNBOOK.md`

**Interfaces:**
- Consumes: verified local release bundle.
- Produces: complete credential and human-action handoff.

- [ ] **Step 1: Define managed runtime requirements**

The selected platform must support:

- managed HTTPS;
- separate web, API, and worker processes;
- managed PostgreSQL 17 or newer;
- encrypted secrets;
- outbound HTTPS to Apple and email providers;
- scheduled or continuously leased worker execution;
- health checks;
- logs with retention controls;
- backups and point-in-time recovery;
- custom domains;
- no always-on personal device.

Do not name a deployment successful until the chosen provider returns a deployment receipt and independent health checks pass.

- [ ] **Step 2: Define exact environment variables**

Document every variable with:

```text
name
service
required state
sensitivity
source
rotation owner
validation rule
failure behavior
```

Include:

```text
DATABASE_URL
API_BASE_URL
WEB_BASE_URL
APPLE_CLIENT_ID
APPLE_TEAM_ID
APPLE_KEY_ID
APPLE_PRIVATE_KEY
APNS_KEY_ID
APNS_TEAM_ID
APNS_PRIVATE_KEY
INBOUND_WEBHOOK_SECRET
ORDER_REFERENCE_HMAC_PEPPER
TOKEN_ENCRYPTION_KEY
EMAIL_PROVIDER_API_KEY
EMAIL_FROM_ADDRESS
RAW_MESSAGE_RETENTION_HOURS
```

No real value appears in the document.

- [ ] **Step 3: Prepare App Store handoff**

`APP-STORE-HANDOFF.md` lists exact human actions:

1. register app ID;
2. register Share Extension ID;
3. register App Group;
4. enable Sign in with Apple;
5. enable Push Notifications;
6. create StoreKit subscription group and annual product;
7. complete agreements, tax, and banking;
8. create sandbox tester;
9. configure privacy disclosures;
10. upload screenshots and metadata;
11. provide reviewer notes explaining receipt-based detection limits;
12. run sandbox purchase, restore, management-sheet, notification, Reminders, and deletion tests;
13. approve submission.

- [ ] **Step 4: Prepare truthful review notes**

Required statement:

```text
SubscriptionSweep does not enumerate unrelated subscriptions from the user’s Apple Account. It creates reminders from subscription receipts the user forwards, shares, or enters. The “Manage Apple Subscriptions” action presents Apple’s system subscription-management sheet. Returning from that sheet does not automatically mark a subscription canceled.
```

- [ ] **Step 5: Complete handoff receipt and commit**

Create a final handoff receipt listing:

- implemented and verified;
- implemented but simulated;
- configured but credential-blocked;
- human actions required;
- exact next production gate;
- rollback path.

Commit:

```bash
git add docs
git commit -m "docs: prepare managed deployment and App Store handoff"
```

Leave the release pull request unmerged until Human Authority reviews the verification bundle and handoff.
