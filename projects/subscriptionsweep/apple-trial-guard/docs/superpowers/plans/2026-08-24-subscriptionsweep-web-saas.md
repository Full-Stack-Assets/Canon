# SubscriptionSweep Web SaaS Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Deliver a responsive web dashboard that exposes upcoming renewals, subscription evidence, confirmations, reminder settings, source health, privacy controls, and simulated entitlement state against the real local API.

**Architecture:** A Next.js App Router application renders server-first pages and uses a small typed API client. Mutating interactions use route handlers or server actions that forward the authenticated session, idempotency key, and exact user intent to the Fastify API. No web path pretends to cancel an Apple subscription.

**Tech Stack:** Node.js 24 LTS, pnpm 10, TypeScript 6.0, current stable Next.js App Router, React, Tailwind CSS, Vitest, Testing Library, MSW, Playwright.

**Spec:** `projects/subscriptionsweep/apple-trial-guard/docs/superpowers/specs/2026-08-24-apple-trial-guard-design.md`

## Global Constraints

- Implement on branch `feat/web-saas` after the core and ingestion plans are merged.
- Use Next.js App Router.
- Server-render read-heavy pages when possible.
- Demo identity is permitted only outside production.
- No page or action accepts `userId` from the browser.
- Every mutation sends an `Idempotency-Key`.
- The web app never claims to manage or cancel Apple subscriptions directly.
- Raw email bodies are never rendered.
- Evidence excerpts are escaped, truncated to 240 characters, and labeled by source.
- Empty, loading, degraded, authentication-required, and error states are first-class.
- WCAG 2.2 AA is the target.
- Live Stripe or App Store billing is outside this plan; entitlement is simulated.
- No third-party analytics script is enabled in Release 1.

---

### Task 1: Scaffold the Next.js application and accessible shell

**Files:**
- Create: `apps/web/package.json`
- Create: `apps/web/next.config.ts`
- Create: `apps/web/tsconfig.json`
- Create: `apps/web/src/app/layout.tsx`
- Create: `apps/web/src/app/page.tsx`
- Create: `apps/web/src/app/globals.css`
- Create: `apps/web/src/components/app-shell.tsx`
- Create: `apps/web/src/components/nav-link.tsx`
- Create: `apps/web/src/components/status-badge.tsx`
- Create: `apps/web/src/lib/routes.ts`
- Test: `apps/web/src/components/app-shell.test.tsx`

**Interfaces:**
- Consumes: root workspace and Next.js defaults.
- Produces:
  - tabs `/today`, `/subscriptions`, `/confirmations`, `/settings`;
  - reusable `StatusBadge`;
  - responsive shell with keyboard-visible focus.

- [ ] **Step 1: Scaffold with the current stable Next.js App Router**

Run from repository root:

```bash
pnpm create next-app@latest apps/web \
  --typescript \
  --eslint \
  --tailwind \
  --app \
  --src-dir \
  --import-alias "@/*" \
  --use-pnpm
```

Remove the generated demo copy and preserve the generated lockfile changes.

- [ ] **Step 2: Add component-test dependencies**

Run:

```bash
pnpm --filter web add -D \
  @testing-library/jest-dom \
  @testing-library/react \
  @testing-library/user-event \
  jsdom \
  msw \
  vitest
```

- [ ] **Step 3: Write the failing navigation test**

Create `apps/web/src/components/app-shell.test.tsx`:

```tsx
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { AppShell } from "./app-shell";

describe("AppShell", () => {
  it("exposes the four primary destinations with an accessible label", () => {
    render(
      <AppShell>
        <p>Content</p>
      </AppShell>
    );

    const nav = screen.getByRole("navigation", {
      name: "Primary"
    });

    expect(nav).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Today" })).toHaveAttribute(
      "href",
      "/today"
    );
    expect(
      screen.getByRole("link", { name: "Subscriptions" })
    ).toHaveAttribute("href", "/subscriptions");
    expect(
      screen.getByRole("link", { name: "Confirmations" })
    ).toHaveAttribute("href", "/confirmations");
    expect(screen.getByRole("link", { name: "Settings" })).toHaveAttribute(
      "href",
      "/settings"
    );
  });
});
```

- [ ] **Step 4: Run the test to verify failure**

Run:

```bash
pnpm --filter web vitest run src/components/app-shell.test.tsx
```

Expected: FAIL because `AppShell` does not exist.

- [ ] **Step 5: Implement the shell**

Create `apps/web/src/lib/routes.ts`:

```ts
export const primaryRoutes = [
  { href: "/today", label: "Today" },
  { href: "/subscriptions", label: "Subscriptions" },
  { href: "/confirmations", label: "Confirmations" },
  { href: "/settings", label: "Settings" }
] as const;
```

Create `apps/web/src/components/app-shell.tsx`:

```tsx
import Link from "next/link";
import type { ReactNode } from "react";
import { primaryRoutes } from "@/lib/routes";

export function AppShell({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-dvh bg-zinc-50 text-zinc-950">
      <header className="border-b border-zinc-200 bg-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4">
          <Link href="/today" className="font-semibold tracking-tight">
            SubscriptionSweep
          </Link>
          <span className="text-sm text-zinc-600">Apple Trial Guard</span>
        </div>
      </header>
      <div className="mx-auto grid max-w-6xl gap-6 px-4 py-6 md:grid-cols-[220px_1fr]">
        <nav aria-label="Primary" className="flex gap-2 overflow-x-auto md:flex-col">
          {primaryRoutes.map((route) => (
            <Link
              key={route.href}
              href={route.href}
              className="rounded-lg px-3 py-2 text-sm font-medium hover:bg-zinc-200 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2"
            >
              {route.label}
            </Link>
          ))}
        </nav>
        <main id="main-content">{children}</main>
      </div>
    </div>
  );
}
```

- [ ] **Step 6: Verify and commit**

Run:

```bash
pnpm --filter web lint
pnpm --filter web typecheck
pnpm --filter web vitest run
pnpm --filter web build
```

Expected: all commands exit 0.

Commit:

```bash
git add apps/web pnpm-lock.yaml
git commit -m "feat(web): add accessible dashboard shell"
```

---

### Task 2: Add a typed API client and fail-closed web session

**Files:**
- Create: `apps/web/src/lib/config.ts`
- Create: `apps/web/src/lib/session.ts`
- Create: `apps/web/src/lib/api-client.ts`
- Create: `apps/web/src/lib/idempotency.ts`
- Create: `apps/web/src/app/api/session/route.ts`
- Create: `apps/web/src/app/sign-in/page.tsx`
- Create: `apps/web/src/components/sign-in-with-apple-link.tsx`
- Test: `apps/web/src/lib/api-client.test.ts`
- Test: `apps/web/src/lib/session.test.ts`

**Interfaces:**
- Consumes:
  - `API_BASE_URL`;
  - HTTP-only session cookie;
  - core TypeBox contracts.
- Produces:
  - `getSession(): Promise<WebSession>`;
  - `apiGet<T>(path, schema): Promise<T>`;
  - `apiMutation<T>(path, input, schema, idempotencyKey): Promise<T>`.

- [ ] **Step 1: Define environment validation**

Create `apps/web/src/lib/config.ts`:

```ts
const apiBaseUrl = process.env.API_BASE_URL;
const demoAuthEnabled = process.env.DEMO_AUTH_ENABLED === "true";

if (!apiBaseUrl) {
  throw new Error("API_BASE_URL is required");
}

if (process.env.NODE_ENV === "production" && demoAuthEnabled) {
  throw new Error("DEMO_AUTH_ENABLED cannot be true in production");
}

export const config = {
  apiBaseUrl,
  demoAuthEnabled
};
```

Add to `.env.example`:

```dotenv
API_BASE_URL=http://localhost:4100
WEB_BASE_URL=http://localhost:3000
```

- [ ] **Step 2: Write the failing client test**

Create `apps/web/src/lib/api-client.test.ts`:

```ts
import { http, HttpResponse } from "msw";
import { setupServer } from "msw/node";
import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";
import { Type } from "typebox";
import { apiGet } from "./api-client";

const server = setupServer(
  http.get("http://api.test/v1/subscriptions", () =>
    HttpResponse.json([{ id: "s1", serviceName: "Example Music" }])
  )
);

describe("apiGet", () => {
  beforeAll(() => server.listen());
  afterEach(() => server.resetHandlers());
  afterAll(() => server.close());

  it("validates server responses against the supplied schema", async () => {
    const schema = Type.Array(
      Type.Object({
        id: Type.String(),
        serviceName: Type.String()
      })
    );

    await expect(
      apiGet("/v1/subscriptions", schema, {
        apiBaseUrl: "http://api.test",
        authorization: "Demo test"
      })
    ).resolves.toEqual([{ id: "s1", serviceName: "Example Music" }]);
  });

  it("throws API_RESPONSE_INVALID for a malformed response", async () => {
    server.use(
      http.get("http://api.test/v1/subscriptions", () =>
        HttpResponse.json([{ id: 7 }])
      )
    );

    await expect(
      apiGet(
        "/v1/subscriptions",
        Type.Array(
          Type.Object({ id: Type.String(), serviceName: Type.String() })
        ),
        {
          apiBaseUrl: "http://api.test",
          authorization: "Demo test"
        }
      )
    ).rejects.toMatchObject({ code: "API_RESPONSE_INVALID" });
  });
});
```

- [ ] **Step 3: Implement response validation and safe errors**

Create `apps/web/src/lib/api-client.ts`:

```ts
import type { TSchema, Static } from "typebox";
import { Value } from "typebox/value";

export class ApiClientError extends Error {
  constructor(
    readonly code: string,
    message: string,
    readonly status: number
  ) {
    super(message);
  }
}

type RequestContext = {
  apiBaseUrl: string;
  authorization: string;
};

export async function apiGet<T extends TSchema>(
  path: string,
  schema: T,
  context: RequestContext
): Promise<Static<T>> {
  const response = await fetch(`${context.apiBaseUrl}${path}`, {
    headers: {
      authorization: context.authorization,
      accept: "application/json"
    },
    cache: "no-store"
  });

  const body = await response.json();

  if (!response.ok) {
    throw new ApiClientError(
      body.code ?? "API_REQUEST_FAILED",
      body.message ?? "Request failed",
      response.status
    );
  }

  if (!Value.Check(schema, body)) {
    throw new ApiClientError(
      "API_RESPONSE_INVALID",
      "The server returned an invalid response",
      502
    );
  }

  return body;
}
```

Mutation requests must forward a server-generated UUID as `Idempotency-Key`.

- [ ] **Step 4: Implement demo session only outside production**

`getSession()` returns:

```ts
export type WebSession =
  | {
      state: "AUTHENTICATED";
      accessToken: string;
      displayName: string;
    }
  | {
      state: "AUTHENTICATION_REQUIRED";
    };
```

When demo mode is enabled, use a signed, HTTP-only, same-site cookie created server-side. Never expose `DEMO_AUTH_USER_ID` to client JavaScript. Production without Sign in with Apple configuration returns `AUTHENTICATION_REQUIRED`.

Create `/sign-in` with one `Continue with Apple` control that navigates to:

```text
${API_BASE_URL}/v1/auth/apple/web/start
```

When the API reports `APPLE_WEB_AUTH_NOT_CONFIGURED`, render a configuration-required state. Do not display a demo sign-in control in production. The session callback is server-only and stores the resulting application session in an HTTP-only cookie.

- [ ] **Step 5: Verify and commit**

Run:

```bash
pnpm --filter web vitest run
pnpm --filter web typecheck
```

Expected: client validation and fail-closed session tests pass.

Commit:

```bash
git add apps/web
git commit -m "feat(web): add typed API and session boundary"
```

---

### Task 3: Build Today and Subscriptions pages

**Files:**
- Create: `apps/web/src/app/today/page.tsx`
- Create: `apps/web/src/app/today/loading.tsx`
- Create: `apps/web/src/app/today/error.tsx`
- Create: `apps/web/src/app/subscriptions/page.tsx`
- Create: `apps/web/src/app/subscriptions/loading.tsx`
- Create: `apps/web/src/components/subscription-card.tsx`
- Create: `apps/web/src/components/renewal-timeline.tsx`
- Create: `apps/web/src/components/empty-state.tsx`
- Create: `apps/web/src/components/error-state.tsx`
- Test: `apps/web/src/components/subscription-card.test.tsx`

**Interfaces:**
- Consumes:
  - `GET /v1/subscriptions`;
  - `GET /v1/reminders?window=...`.
- Produces:
  - sorted urgent confirmations;
  - upcoming reminders;
  - active, kept, canceled, expired, and unknown subscription views.

- [ ] **Step 1: Write the failing evidence-label test**

```tsx
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { SubscriptionCard } from "./subscription-card";

it("labels inferred dates instead of presenting them as verified", () => {
  render(
    <SubscriptionCard
      subscription={{
        id: "s1",
        serviceName: "Example Music",
        amountMinor: 999,
        currency: "USD",
        billingInterval: "MONTHLY",
        renewalAt: "2026-09-24T16:00:00.000Z",
        evidenceState: "INFERRED",
        lifecycleState: "ACTIVE"
      }}
    />
  );

  expect(screen.getByText("Inferred")).toBeInTheDocument();
  expect(screen.getByText("$9.99 / month")).toBeInTheDocument();
});
```

- [ ] **Step 2: Implement safe money and date formatting**

Create pure helpers:

```ts
export function formatMoney(
  amountMinor: number | null,
  currency: string | null,
  locale = "en-US"
): string {
  if (amountMinor === null || currency === null) return "Amount unknown";
  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency
  }).format(amountMinor / 100);
}

export function formatRenewal(
  iso: string | null,
  timezone: string,
  locale = "en-US"
): string {
  if (!iso) return "Date needs confirmation";
  return new Intl.DateTimeFormat(locale, {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: timezone
  }).format(new Date(iso));
}
```

Do not infer a billing label from price text; use the normalized interval.

- [ ] **Step 3: Implement Today sorting**

Order items as:

1. `NEEDS_CONFIRMATION`;
2. reminder within 48 hours;
3. reminder within 7 days;
4. later reminders.

Each card must state the exact date, evidence state, active channels, and next action.

- [ ] **Step 4: Implement subscription filters**

Use URL search parameters:

```text
/subscriptions?state=active
/subscriptions?state=kept
/subscriptions?state=canceled
/subscriptions?state=expired
/subscriptions?state=unknown
```

Invalid states fall back to `active` and do not reach the API.

- [ ] **Step 5: Verify and commit**

Run:

```bash
pnpm --filter web vitest run
pnpm --filter web lint
pnpm --filter web typecheck
pnpm --filter web build
```

Expected: page, formatting, empty-state, and evidence-label tests pass.

Commit:

```bash
git add apps/web
git commit -m "feat(web): show upcoming renewals and subscriptions"
```

---

### Task 4: Build subscription detail and explicit outcome actions

**Files:**
- Create: `apps/web/src/app/subscriptions/[id]/page.tsx`
- Create: `apps/web/src/app/subscriptions/[id]/not-found.tsx`
- Create: `apps/web/src/app/subscriptions/[id]/actions.ts`
- Create: `apps/web/src/components/evidence-list.tsx`
- Create: `apps/web/src/components/reminder-list.tsx`
- Create: `apps/web/src/components/audit-timeline.tsx`
- Create: `apps/web/src/components/outcome-actions.tsx`
- Test: `apps/web/src/components/outcome-actions.test.tsx`
- Test: `apps/web/src/app/subscriptions/[id]/actions.test.ts`

**Interfaces:**
- Consumes:
  - subscription detail;
  - evidence;
  - reminders;
  - audit;
  - mutation endpoints.
- Produces:
  - `Keep Subscription`;
  - `Mark Canceled`;
  - `Remind Me Later`;
  - a non-actionable explanation for Apple subscription management on web.

- [ ] **Step 1: Write the failing cancellation-copy test**

```tsx
it("never implies the web action cancels through Apple", () => {
  render(<OutcomeActions subscriptionId="s1" lifecycleState="ACTIVE" />);

  expect(
    screen.getByRole("button", { name: "Mark canceled" })
  ).toBeInTheDocument();
  expect(
    screen.getByText(
      "This records your report only. Cancel the subscription in Apple’s subscription settings first."
    )
  ).toBeInTheDocument();
  expect(screen.queryByText("Cancel with Apple")).not.toBeInTheDocument();
});
```

- [ ] **Step 2: Implement server actions with idempotency**

Each action:

```ts
"use server";

import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";

export async function markCanceled(subscriptionId: string) {
  const session = await requireAuthenticatedSession();

  await apiMutation(
    `/v1/subscriptions/${subscriptionId}/actions/mark-canceled`,
    {},
    ActionResultSchema,
    {
      authorization: session.accessToken,
      idempotencyKey: randomUUID()
    }
  );

  revalidatePath(`/subscriptions/${subscriptionId}`);
  revalidatePath("/today");
  revalidatePath("/subscriptions");
}
```

The server action validates the subscription ID as UUID before making the request.

- [ ] **Step 3: Render evidence without raw content**

For each field, show:

- field label;
- value;
- `Explicit`, `Inferred`, or `User asserted`;
- escaped excerpt truncated to 240 characters;
- parser version;
- source received time.

Never render HTML from the message.

- [ ] **Step 4: Verify and commit**

Run:

```bash
pnpm --filter web vitest run
pnpm --filter web build
```

Expected: action copy, idempotency forwarding, 404, and evidence rendering tests pass.

Commit:

```bash
git add apps/web
git commit -m "feat(web): add subscription evidence and outcome actions"
```

---

### Task 5: Build the confirmation queue

**Files:**
- Create: `apps/web/src/app/confirmations/page.tsx`
- Create: `apps/web/src/app/confirmations/actions.ts`
- Create: `apps/web/src/components/confirmation-card.tsx`
- Create: `apps/web/src/components/field-review-form.tsx`
- Test: `apps/web/src/components/field-review-form.test.tsx`
- Test: `apps/web/src/app/confirmations/actions.test.ts`

**Interfaces:**
- Consumes:
  - `GET /v1/confirmations`;
  - `POST /v1/confirmations/:id/resolve`;
  - `POST /v1/confirmations/:id/reject`;
  - `POST /v1/confirmations/:id/merge`.
- Produces:
  - confirm;
  - edit;
  - reject;
  - merge candidate;
  - preserved source evidence and separate user assertion.

- [ ] **Step 1: Write the failing ambiguous-date test**

```tsx
it("requires the user to choose an unambiguous date", async () => {
  const user = userEvent.setup();

  render(
    <FieldReviewForm
      confirmation={{
        id: "c1",
        fieldName: "renewalAt",
        proposedValue: null,
        warning: "AMBIGUOUS_NUMERIC_DATE",
        excerpt: "Renews 09/01/2026."
      }}
    />
  );

  expect(
    screen.getByText("The receipt’s numeric date is ambiguous.")
  ).toBeInTheDocument();

  await user.click(screen.getByRole("button", { name: "Confirm date" }));

  expect(
    screen.getByText("Choose a renewal date before continuing.")
  ).toBeInTheDocument();
});
```

- [ ] **Step 2: Implement explicit form validation**

Renewal date resolution requires:

- valid calendar date;
- user timezone;
- local time default of 12:00 only when no time is provided;
- user acknowledgement that the value is their assertion;
- no date earlier than the source received time.

A corrected field is stored as `USER_ASSERTED`; the original source evidence remains unchanged.

- [ ] **Step 3: Reconcile reminders after resolution**

Successful resolution must enqueue one `RECONCILE_REMINDERS` job. The page displays the newly scheduled reminders returned by the API.

- [ ] **Step 4: Verify and commit**

Run:

```bash
pnpm --filter web vitest run -- confirmations
pnpm --filter web build
```

Expected: confirm, reject, merge, validation, and reminder-reconciliation tests pass.

Commit:

```bash
git add apps/web
git commit -m "feat(web): add evidence confirmation workflow"
```

---

### Task 6: Build source health, reminder settings, and privacy controls

**Files:**
- Create: `apps/web/src/app/settings/page.tsx`
- Create: `apps/web/src/app/settings/sources/page.tsx`
- Create: `apps/web/src/app/settings/reminders/page.tsx`
- Create: `apps/web/src/app/settings/privacy/page.tsx`
- Create: `apps/web/src/app/settings/actions.ts`
- Create: `apps/web/src/components/source-health-card.tsx`
- Create: `apps/web/src/components/reminder-policy-form.tsx`
- Create: `apps/web/src/components/delete-account-dialog.tsx`
- Test: `apps/web/src/components/source-health-card.test.tsx`
- Test: `apps/web/src/components/delete-account-dialog.test.tsx`

**Interfaces:**
- Consumes:
  - source health;
  - reminder policy;
  - export request;
  - deletion challenge.
- Produces:
  - active, authentication-required, degraded, and disconnected states;
  - policy changes;
  - export request;
  - deliberate account deletion.

- [ ] **Step 1: Render exact source states**

Supported UI states:

```text
NOT_CONNECTED
CONNECTED
AUTHENTICATION_REQUIRED
SCOPE_ERROR
LIMITED
VERIFIED
DEGRADED
DISCONNECTED
```

Never show `Connected` when the API reports an authentication or scope error.

- [ ] **Step 2: Implement reminder policy validation**

The form accepts positive whole-number offsets in hours or days and converts them to seconds. Enforce:

- trial final reminder is at least 24 hours before the end;
- no duplicate offset for one subscription class;
- no offset longer than 365 days;
- quiet hours use local whole hours `0...23`;
- shifting for quiet hours moves earlier, not later.

- [ ] **Step 3: Implement deletion confirmation**

The delete dialog requires the exact phrase:

```text
DELETE MY SUBSCRIPTIONSWEEP ACCOUNT
```

The server action requests a short-lived deletion challenge from the API, submits it with a fresh idempotency key, clears the session cookie after success, and redirects to `/account-deleted`.

- [ ] **Step 4: Verify and commit**

Run:

```bash
pnpm --filter web vitest run -- settings
pnpm --filter web build
```

Expected: source truthfulness, policy validation, export, and deletion-confirmation tests pass.

Commit:

```bash
git add apps/web
git commit -m "feat(web): add settings and privacy center"
```

---

### Task 7: Add simulated entitlement and self-renewal reminder

**Files:**
- Create: `apps/web/src/app/settings/billing/page.tsx`
- Create: `apps/web/src/components/entitlement-card.tsx`
- Create: `apps/web/src/lib/entitlement.ts`
- Test: `apps/web/src/components/entitlement-card.test.tsx`

**Interfaces:**
- Consumes: entitlement state from the API.
- Produces:
  - `FREE`;
  - `AUTO_SIMULATED`;
  - `APP_STORE_ACTIVE`;
  - `WEB_ACTIVE`;
  - `EXPIRED`;
  - `REVOKED`;
  - duplicate-purchase warning.

- [ ] **Step 1: Write the duplicate-purchase warning test**

```tsx
it("blocks a second purchase when another billing channel is active", () => {
  render(
    <EntitlementCard
      entitlement={{
        state: "APP_STORE_ACTIVE",
        renewalAt: "2027-08-24T16:00:00.000Z"
      }}
    />
  );

  expect(
    screen.getByText("Your Auto plan is already billed through Apple.")
  ).toBeInTheDocument();
  expect(
    screen.queryByRole("button", { name: "Subscribe on the web" })
  ).not.toBeInTheDocument();
});
```

- [ ] **Step 2: Implement truthful simulated billing**

Local demo mode may toggle `FREE` and `AUTO_SIMULATED`. The interface must display:

```text
Simulation only. No payment was taken and no live subscription was created.
```

No Stripe library, checkout URL, or live purchase button is added in this plan.

- [ ] **Step 3: Create Apple Trial Guard’s own reminder record**

When a simulated annual entitlement is activated, the API creates a subscription record named `SubscriptionSweep Auto` and schedules the annual 30-day, 7-day, and 2-day reminders. It is labeled `SIMULATED` and excluded from realized-savings metrics.

- [ ] **Step 4: Verify and commit**

Run:

```bash
pnpm --filter web vitest run -- entitlement
pnpm --filter web build
```

Expected: simulated-state and duplicate-purchase tests pass.

Commit:

```bash
git add apps/web
git commit -m "feat(web): add simulated entitlement visibility"
```

---

### Task 8: Add Playwright acceptance and accessibility tests

**Files:**
- Create: `apps/web/playwright.config.ts`
- Create: `apps/web/e2e/today.spec.ts`
- Create: `apps/web/e2e/confirmations.spec.ts`
- Create: `apps/web/e2e/privacy.spec.ts`
- Create: `apps/web/e2e/accessibility.spec.ts`
- Modify: `apps/web/package.json`
- Modify: `.github/workflows/ci.yml`
- Create: `docs/verification/web-saas-verification.md`

**Interfaces:**
- Consumes: running local API, worker, PostgreSQL, and web application.
- Produces: browser-level evidence for primary workflows.

- [ ] **Step 1: Configure deterministic E2E setup**

Use a test seed endpoint available only when:

```text
NODE_ENV=test
E2E_SEED_ENABLED=true
```

The endpoint rejects requests in every other environment.

- [ ] **Step 2: Implement primary journey tests**

`today.spec.ts` must:

1. seed the synthetic trial fixture;
2. wait for the worker to become idle;
3. open `/today`;
4. confirm Example Music appears once;
5. confirm 48-hour and 24-hour reminders;
6. open the detail page;
7. confirm evidence state `Verified`.

`confirmations.spec.ts` must:

1. seed the ambiguous-date fixture;
2. open `/confirmations`;
3. verify no date-based reminder exists;
4. resolve the date;
5. verify replacement reminders appear.

`privacy.spec.ts` must:

1. request export;
2. verify an export receipt;
3. delete the account through the exact phrase;
4. verify the authenticated pages are no longer accessible.

- [ ] **Step 3: Add automated accessibility checks**

Install:

```bash
pnpm --filter web add -D @axe-core/playwright
```

Run axe against:

```text
/today
/subscriptions
/subscriptions/<seeded-id>
/confirmations
/settings/sources
/settings/reminders
/settings/privacy
/settings/billing
```

Fail on critical or serious violations.

- [ ] **Step 4: Run fresh verification**

Run:

```bash
pnpm --filter web test
pnpm --filter web exec playwright test
pnpm --filter web lint
pnpm --filter web typecheck
pnpm --filter web build
```

Expected: all unit, integration, browser, and accessibility tests pass.

- [ ] **Step 5: Record evidence and commit**

Record exact browser versions, test counts, screenshots of failed states only, API/worker commit SHAs, and limitations in `docs/verification/web-saas-verification.md`.

Commit:

```bash
git add .
git commit -m "test(web): verify dashboard acceptance flows"
```

Leave the draft pull request unmerged for independent review.
