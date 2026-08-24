# SubscriptionSweep iOS Application Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Deliver a native SwiftUI iPhone app that imports supported subscription evidence, synchronizes with the SaaS API, schedules local and optional Apple Reminders, presents Apple’s subscription-management sheet, and manages Apple Trial Guard’s own StoreKit test entitlement.

**Architecture:** A Swift package contains models, API contracts, synchronization, and pure scheduling logic. The generated Xcode project contains the SwiftUI app and Share Extension. Apple-framework adapters are protocol-bound so pure logic is testable without permissions or live Apple services.

**Tech Stack:** Swift 6, SwiftUI, Swift Concurrency, Observation, StoreKit 2, UserNotifications, EventKit, AuthenticationServices, App Intents, Keychain, XcodeGen, XCTest, iOS 17.0 minimum.

**Spec:** `projects/subscriptionsweep/apple-trial-guard/docs/superpowers/specs/2026-08-24-apple-trial-guard-design.md`

## Global Constraints

- Implement on branch `feat/ios-client` after core contracts and API are stable.
- Bundle identifier proposal: `com.productweld.subscriptionsweep`.
- Share Extension identifier proposal: `com.productweld.subscriptionsweep.share`.
- App Group proposal: `group.com.productweld.subscriptionsweep`.
- StoreKit product proposal: `com.productweld.subscriptionsweep.auto.yearly`.
- Minimum deployment target: iOS 17.0.
- Swift language mode: Swift 6.
- No Apple Developer registration, signing, production APNs, or App Store submission in this plan.
- Demo mode uses synthetic local data and cannot purchase, connect providers, or claim live monitoring.
- Notifications and Reminders permissions are optional and requested only after explanatory UI.
- The app never reads unrelated App Store transaction history.
- Opening Apple’s subscription-management sheet never marks cancellation.
- User-reported cancellation is explicit and separately labeled.
- No private alias, access token, order reference, or receipt body is logged.
- Pending local notification identifiers are stable and removable.
- Offline mutations are idempotent and replay-safe.
- All UI supports Dynamic Type, VoiceOver labels, reduced motion, and keyboard navigation where applicable.

---

### Task 1: Create the reproducible Xcode project and Swift core package

**Files:**
- Create: `apps/ios/project.yml`
- Create: `apps/ios/Config/Base.xcconfig`
- Create: `apps/ios/Config/Debug.xcconfig`
- Create: `apps/ios/Config/Release.xcconfig`
- Create: `apps/ios/SubscriptionSweepApp/App/SubscriptionSweepApp.swift`
- Create: `apps/ios/SubscriptionSweepApp/Resources/Info.plist`
- Create: `apps/ios/SubscriptionSweepShare/Info.plist`
- Create: `apps/ios/SubscriptionSweepShare/ShareViewController.swift`
- Create: `apps/ios/Packages/SubscriptionSweepCore/Package.swift`
- Create: `apps/ios/Packages/SubscriptionSweepCore/Sources/SubscriptionSweepCore/SubscriptionSweepCore.swift`
- Create: `apps/ios/Packages/SubscriptionSweepCore/Tests/SubscriptionSweepCoreTests/SmokeTests.swift`
- Create: `apps/ios/README.md`
- Modify: `.gitignore`
- Modify: `.github/workflows/ci.yml`

**Interfaces:**
- Consumes: approved bundle and App Group proposals.
- Produces:
  - generated `SubscriptionSweep.xcodeproj`;
  - app target;
  - share target;
  - `SubscriptionSweepCore` package;
  - simulator-test command.

- [ ] **Step 1: Install and pin XcodeGen on a macOS execution host**

Run:

```bash
brew install xcodegen
xcodegen version
```

Record the exact version in `apps/ios/README.md`.

- [ ] **Step 2: Define the Swift package**

Create `apps/ios/Packages/SubscriptionSweepCore/Package.swift`:

```swift
// swift-tools-version: 6.0

import PackageDescription

let package = Package(
    name: "SubscriptionSweepCore",
    platforms: [
        .iOS(.v17),
        .macOS(.v14)
    ],
    products: [
        .library(
            name: "SubscriptionSweepCore",
            targets: ["SubscriptionSweepCore"]
        )
    ],
    targets: [
        .target(
            name: "SubscriptionSweepCore"
        ),
        .testTarget(
            name: "SubscriptionSweepCoreTests",
            dependencies: ["SubscriptionSweepCore"]
        )
    ]
)
```

Create `SmokeTests.swift`:

```swift
import XCTest
@testable import SubscriptionSweepCore

final class SmokeTests: XCTestCase {
    func testPackageLoads() {
        XCTAssertEqual(SubscriptionSweepCore.version, "0.1.0")
    }
}
```

Create `SubscriptionSweepCore.swift`:

```swift
public enum SubscriptionSweepCore {
    public static let version = "0.1.0"
}
```

- [ ] **Step 3: Run the package test**

Run:

```bash
swift test --package-path apps/ios/Packages/SubscriptionSweepCore
```

Expected: one test passes.

- [ ] **Step 4: Define exact build settings**

Create `apps/ios/Config/Base.xcconfig`:

```xcconfig
IPHONEOS_DEPLOYMENT_TARGET = 17.0
SWIFT_VERSION = 6.0
PRODUCT_BUNDLE_IDENTIFIER = com.productweld.subscriptionsweep
CODE_SIGN_STYLE = Automatic
DEVELOPMENT_TEAM =
CURRENT_PROJECT_VERSION = 1
MARKETING_VERSION = 0.1.0
ENABLE_USER_SCRIPT_SANDBOXING = YES
SWIFT_STRICT_CONCURRENCY = complete
```

Create `Debug.xcconfig`:

```xcconfig
#include "Base.xcconfig"
SWIFT_ACTIVE_COMPILATION_CONDITIONS = DEBUG DEMO_MODE
API_BASE_URL = http:/$()/localhost:4100
```

Create `Release.xcconfig`:

```xcconfig
#include "Base.xcconfig"
SWIFT_ACTIVE_COMPILATION_CONDITIONS = RELEASE
API_BASE_URL =
```

A blank release API URL must make release startup fail with a visible configuration error rather than silently using localhost.

- [ ] **Step 5: Define the XcodeGen project**

Create `apps/ios/project.yml`:

```yaml
name: SubscriptionSweep
options:
  bundleIdPrefix: com.productweld
  deploymentTarget:
    iOS: "17.0"
configs:
  Debug: debug
  Release: release
packages:
  SubscriptionSweepCore:
    path: Packages/SubscriptionSweepCore
targets:
  SubscriptionSweep:
    type: application
    platform: iOS
    sources:
      - path: SubscriptionSweepApp
    configFiles:
      Debug: Config/Debug.xcconfig
      Release: Config/Release.xcconfig
    settings:
      base:
        PRODUCT_BUNDLE_IDENTIFIER: com.productweld.subscriptionsweep
        INFOPLIST_FILE: SubscriptionSweepApp/Resources/Info.plist
        CODE_SIGN_ENTITLEMENTS: SubscriptionSweepApp/Resources/SubscriptionSweep.entitlements
    dependencies:
      - package: SubscriptionSweepCore
      - target: SubscriptionSweepShare
    scheme:
      testTargets:
        - SubscriptionSweepTests
  SubscriptionSweepShare:
    type: app-extension
    platform: iOS
    sources:
      - path: SubscriptionSweepShare
    settings:
      base:
        PRODUCT_BUNDLE_IDENTIFIER: com.productweld.subscriptionsweep.share
        INFOPLIST_FILE: SubscriptionSweepShare/Info.plist
        CODE_SIGN_ENTITLEMENTS: SubscriptionSweepShare/SubscriptionSweepShare.entitlements
    dependencies:
      - package: SubscriptionSweepCore
  SubscriptionSweepTests:
    type: bundle.unit-test
    platform: iOS
    sources:
      - path: SubscriptionSweepTests
    dependencies:
      - target: SubscriptionSweep
```

- [ ] **Step 6: Create the app entry point**

Create `SubscriptionSweepApp.swift`:

```swift
import SwiftUI
import SubscriptionSweepCore

@main
struct SubscriptionSweepApp: App {
    var body: some Scene {
        WindowGroup {
            Text("SubscriptionSweep")
                .accessibilityAddTraits(.isHeader)
        }
    }
}
```

- [ ] **Step 7: Generate, build, and commit**

Run:

```bash
xcodegen generate --spec apps/ios/project.yml
xcodebuild \
  -project apps/ios/SubscriptionSweep.xcodeproj \
  -scheme SubscriptionSweep \
  -destination 'generic/platform=iOS Simulator' \
  build
```

Expected: build exits 0 without requiring a development team for simulator build.

Commit:

```bash
git add apps/ios .github/workflows/ci.yml .gitignore
git commit -m "chore(ios): create SwiftUI project and core package"
```

---

### Task 2: Mirror server contracts in Swift with fixture conformance tests

**Files:**
- Create: `apps/ios/Packages/SubscriptionSweepCore/Sources/SubscriptionSweepCore/Models/EvidenceState.swift`
- Create: `apps/ios/Packages/SubscriptionSweepCore/Sources/SubscriptionSweepCore/Models/Subscription.swift`
- Create: `apps/ios/Packages/SubscriptionSweepCore/Sources/SubscriptionSweepCore/Models/Reminder.swift`
- Create: `apps/ios/Packages/SubscriptionSweepCore/Sources/SubscriptionSweepCore/Models/AuditEntry.swift`
- Create: `apps/ios/Packages/SubscriptionSweepCore/Sources/SubscriptionSweepCore/Models/APIError.swift`
- Create: `apps/ios/Packages/SubscriptionSweepCore/Sources/SubscriptionSweepCore/JSON/ISO8601Coding.swift`
- Create: `apps/ios/Packages/SubscriptionSweepCore/Tests/SubscriptionSweepCoreTests/ContractFixtureTests.swift`
- Create: `fixtures/contracts/subscription.json`
- Create: `fixtures/contracts/reminder.json`
- Create: `apps/ios/Packages/SubscriptionSweepCore/Tests/SubscriptionSweepCoreTests/Resources/contracts/subscription.json`
- Create: `apps/ios/Packages/SubscriptionSweepCore/Tests/SubscriptionSweepCoreTests/Resources/contracts/reminder.json`
- Create: `scripts/verify-contract-fixture-copies.mjs`

**Interfaces:**
- Consumes: canonical TypeBox contracts.
- Produces:
  - `Subscription: Codable, Sendable, Identifiable, Equatable`;
  - `Reminder: Codable, Sendable, Identifiable, Equatable`;
  - shared JSON fixture compatibility.

- [ ] **Step 1: Create a cross-platform subscription fixture**

Create `fixtures/contracts/subscription.json`:

```json
{
  "id": "6d1bcb2d-0c21-4b4f-8f4e-2642af8fa376",
  "userId": "00000000-0000-4000-8000-000000000001",
  "serviceName": "Example Music",
  "normalizedServiceKey": "example-music",
  "billingOwner": "APPLE",
  "amountMinor": 999,
  "currency": "USD",
  "billingInterval": "MONTHLY",
  "startAt": "2026-08-24T16:00:00.000Z",
  "trialEndAt": null,
  "renewalAt": "2026-09-24T16:00:00.000Z",
  "timezone": "America/New_York",
  "evidenceState": "VERIFIED",
  "lifecycleState": "ACTIVE",
  "createdAt": "2026-08-24T16:00:00.000Z",
  "updatedAt": "2026-08-24T16:00:00.000Z"
}
```

- [ ] **Step 2: Write the failing Swift decoding test**

Create `ContractFixtureTests.swift`:

```swift
import XCTest
@testable import SubscriptionSweepCore

final class ContractFixtureTests: XCTestCase {
    func testSubscriptionFixtureDecodesAndReencodes() throws {
        let url = try XCTUnwrap(
            Bundle.module.url(
                forResource: "subscription",
                withExtension: "json",
                subdirectory: "contracts"
            )
        )
        let data = try Data(contentsOf: url)
        let subscription = try ISO8601Coding.decoder.decode(
            Subscription.self,
            from: data
        )

        XCTAssertEqual(subscription.serviceName, "Example Music")
        XCTAssertEqual(subscription.amountMinor, 999)
        XCTAssertEqual(subscription.evidenceState, .verified)

        let encoded = try ISO8601Coding.encoder.encode(subscription)
        let roundTrip = try ISO8601Coding.decoder.decode(
            Subscription.self,
            from: encoded
        )
        XCTAssertEqual(roundTrip, subscription)
    }
}
```

Configure fixture resources in `Package.swift`:

```swift
.testTarget(
    name: "SubscriptionSweepCoreTests",
    dependencies: ["SubscriptionSweepCore"],
    resources: [
        .copy("Resources")
    ]
)
```

Copy the canonical root fixtures into the Swift test resource directory. `scripts/verify-contract-fixture-copies.mjs` computes SHA-256 for each pair and fails when a Swift copy differs from its root fixture. The root `fixtures/contracts` directory remains canonical.

- [ ] **Step 3: Implement exact enums**

Create `EvidenceState.swift`:

```swift
public enum EvidenceState: String, Codable, Sendable {
    case verified = "VERIFIED"
    case inferred = "INFERRED"
    case needsConfirmation = "NEEDS_CONFIRMATION"
}

public enum SubscriptionLifecycle: String, Codable, Sendable {
    case candidate = "CANDIDATE"
    case active = "ACTIVE"
    case kept = "KEPT"
    case userReportedCanceled = "USER_REPORTED_CANCELED"
    case expired = "EXPIRED"
    case unknown = "UNKNOWN"
}

public enum BillingInterval: String, Codable, Sendable {
    case trial = "TRIAL"
    case monthly = "MONTHLY"
    case annual = "ANNUAL"
    case other = "OTHER"
    case unknown = "UNKNOWN"
}
```

- [ ] **Step 4: Implement `Subscription`**

```swift
public struct Subscription: Codable, Sendable, Identifiable, Equatable {
    public let id: UUID
    public let userId: UUID
    public let serviceName: String
    public let normalizedServiceKey: String
    public let billingOwner: String
    public let amountMinor: Int?
    public let currency: String?
    public let billingInterval: BillingInterval
    public let startAt: Date?
    public let trialEndAt: Date?
    public let renewalAt: Date?
    public let timezone: String
    public let evidenceState: EvidenceState
    public let lifecycleState: SubscriptionLifecycle
    public let createdAt: Date
    public let updatedAt: Date
}
```

- [ ] **Step 5: Verify both languages against the same fixture**

Run:

```bash
node scripts/verify-contract-fixture-copies.mjs
pnpm --filter @subscriptionsweep/contracts test
swift test --package-path apps/ios/Packages/SubscriptionSweepCore
```

Expected: TypeScript and Swift fixture tests pass.

Commit:

```bash
git add apps/ios fixtures/contracts
git commit -m "feat(ios): add cross-platform domain contracts"
```

---

### Task 3: Add the API client, Keychain token store, and offline mutation queue

**Files:**
- Create: `apps/ios/Packages/SubscriptionSweepCore/Sources/SubscriptionSweepCore/API/APIClient.swift`
- Create: `apps/ios/Packages/SubscriptionSweepCore/Sources/SubscriptionSweepCore/API/URLSessionAPIClient.swift`
- Create: `apps/ios/Packages/SubscriptionSweepCore/Sources/SubscriptionSweepCore/API/APIRequest.swift`
- Create: `apps/ios/Packages/SubscriptionSweepCore/Sources/SubscriptionSweepCore/Security/TokenStore.swift`
- Create: `apps/ios/Packages/SubscriptionSweepCore/Sources/SubscriptionSweepCore/Security/KeychainTokenStore.swift`
- Create: `apps/ios/Packages/SubscriptionSweepCore/Sources/SubscriptionSweepCore/Sync/PendingMutation.swift`
- Create: `apps/ios/Packages/SubscriptionSweepCore/Sources/SubscriptionSweepCore/Sync/MutationQueue.swift`
- Test: `apps/ios/Packages/SubscriptionSweepCore/Tests/SubscriptionSweepCoreTests/APIClientTests.swift`
- Test: `apps/ios/Packages/SubscriptionSweepCore/Tests/SubscriptionSweepCoreTests/MutationQueueTests.swift`

**Interfaces:**
- Consumes: base URL and access token.
- Produces:
  - `APIClient.send<Response: Decodable>(_ request: APIRequest<Response>)`;
  - `TokenStore`;
  - FIFO idempotent mutation queue persisted in the App Group container.

- [ ] **Step 1: Write the failing API-error test**

```swift
func testClientMapsStructuredAPIError() async throws {
    let transport = StubTransport(
        statusCode: 404,
        body: #"{"code":"SUBSCRIPTION_NOT_FOUND","message":"Subscription not found"}"#
    )
    let client = URLSessionAPIClient(
        baseURL: URL(string: "https://api.example.test")!,
        tokenProvider: { "test-token" },
        transport: transport
    )

    do {
        let _: Subscription = try await client.send(
            .get("/v1/subscriptions/00000000-0000-4000-8000-000000000099")
        )
        XCTFail("Expected APIError")
    } catch let error as APIError {
        XCTAssertEqual(error.code, "SUBSCRIPTION_NOT_FOUND")
        XCTAssertEqual(error.status, 404)
    }
}
```

- [ ] **Step 2: Define requests and idempotency**

```swift
public struct APIRequest<Response: Decodable>: Sendable {
    public let method: String
    public let path: String
    public let body: Data?
    public let idempotencyKey: UUID?

    public static func get(_ path: String) -> Self {
        .init(method: "GET", path: path, body: nil, idempotencyKey: nil)
    }

    public static func mutation(
        _ path: String,
        body: Data = Data("{}".utf8),
        idempotencyKey: UUID = UUID()
    ) -> Self {
        .init(
            method: "POST",
            path: path,
            body: body,
            idempotencyKey: idempotencyKey
        )
    }
}
```

The client always sets:

```text
Accept: application/json
Authorization: Bearer <token>
Content-Type: application/json
Idempotency-Key: <uuid>   only for mutations
X-Client-Version: <marketing-version>
```

- [ ] **Step 3: Implement safe URLSession transport**

Reject:

- non-HTTPS URLs outside `DEBUG`;
- redirects to another host;
- responses larger than 2 MiB;
- non-JSON success responses;
- invalid JSON;
- missing structured error bodies.

Never log request or response bodies.

- [ ] **Step 4: Implement the offline mutation queue**

`PendingMutation` contains:

```swift
public struct PendingMutation: Codable, Sendable, Identifiable, Equatable {
    public let id: UUID
    public let method: String
    public let path: String
    public let body: Data
    public let idempotencyKey: UUID
    public let createdAt: Date
    public var attemptCount: Int
}
```

Queue rules:

- persist atomically to `pending-mutations.json`;
- preserve order;
- retry network and 5xx failures;
- do not retry 4xx failures except `408` and `429`;
- remove only after a 2xx response;
- retain the original idempotency key across retries;
- cap at 100 pending mutations;
- expose a visible degraded state if full.

- [ ] **Step 5: Verify and commit**

Run:

```bash
swift test --package-path apps/ios/Packages/SubscriptionSweepCore
```

Expected: API mapping, redirect rejection, response-size, queue ordering, retry, and idempotency tests pass.

Commit:

```bash
git add apps/ios/Packages/SubscriptionSweepCore
git commit -m "feat(ios): add API and offline mutation boundary"
```

---

### Task 4: Implement app session, demo identity, and Sign in with Apple boundary

**Files:**
- Create: `apps/ios/SubscriptionSweepApp/Session/AppSession.swift`
- Create: `apps/ios/SubscriptionSweepApp/Session/AuthenticationState.swift`
- Create: `apps/ios/SubscriptionSweepApp/Session/AppleSignInController.swift`
- Create: `apps/ios/SubscriptionSweepApp/Session/DemoSessionProvider.swift`
- Create: `apps/ios/SubscriptionSweepApp/Views/Authentication/SignInView.swift`
- Modify: `apps/ios/SubscriptionSweepApp/App/SubscriptionSweepApp.swift`
- Test: `apps/ios/SubscriptionSweepTests/AppSessionTests.swift`

**Interfaces:**
- Consumes: token store, API client, build configuration.
- Produces:
  - `AuthenticationState`;
  - `AppSession.start()`;
  - demo-only session;
  - a separately gated Apple credential validation adapter.

- [ ] **Step 1: Write the failing production-demo test**

```swift
@MainActor
func testDemoModeCannotStartInReleaseConfiguration() async {
    let session = AppSession(
        environment: .release,
        authentication: DemoSessionProvider()
    )

    await session.start()

    XCTAssertEqual(
        session.authenticationState,
        .configurationError("Demo mode is unavailable in release builds.")
    )
}
```

- [ ] **Step 2: Implement session state**

```swift
public enum AuthenticationState: Equatable {
    case starting
    case demo
    case authenticated(displayName: String)
    case authenticationRequired
    case configurationError(String)
}
```

`AppSession` is `@MainActor @Observable` and contains:

- authentication state;
- source health;
- notification permission;
- reminders permission;
- entitlement state;
- synchronization state;
- last successful sync.

- [ ] **Step 3: Add the Sign in with Apple UI boundary**

Use `SignInWithAppleButton` and request:

```swift
request.requestedScopes = [.fullName, .email]
request.nonce = nonce
```

The credential handler sends the identity token and nonce to:

```text
POST /v1/auth/apple/exchange
```

Until the server verifier is configured, the API returns `APPLE_AUTH_NOT_CONFIGURED` and the app displays the exact state. It must not fall back to demo mode in a release build.

- [ ] **Step 4: Verify and commit**

Run:

```bash
xcodebuild \
  -project apps/ios/SubscriptionSweep.xcodeproj \
  -scheme SubscriptionSweep \
  -destination 'platform=iOS Simulator,name=iPhone 17 Pro' \
  test
```

Expected: session configuration, demo, missing credential, and API error tests pass.

Commit:

```bash
git add apps/ios
git commit -m "feat(ios): add fail-closed authentication session"
```

---

### Task 5: Build onboarding, permission center, and setup completeness

**Files:**
- Create: `apps/ios/SubscriptionSweepApp/Permissions/PermissionCenter.swift`
- Create: `apps/ios/SubscriptionSweepApp/Permissions/NotificationAuthorizationClient.swift`
- Create: `apps/ios/SubscriptionSweepApp/Permissions/ReminderAuthorizationClient.swift`
- Create: `apps/ios/SubscriptionSweepApp/Views/Onboarding/OnboardingFlow.swift`
- Create: `apps/ios/SubscriptionSweepApp/Views/Onboarding/AppleLimitationPage.swift`
- Create: `apps/ios/SubscriptionSweepApp/Views/Onboarding/NotificationPermissionPage.swift`
- Create: `apps/ios/SubscriptionSweepApp/Views/Onboarding/ReminderPermissionPage.swift`
- Create: `apps/ios/SubscriptionSweepApp/Views/Onboarding/IngestionMethodPage.swift`
- Create: `apps/ios/SubscriptionSweepApp/Views/Onboarding/SetupSummaryPage.swift`
- Test: `apps/ios/SubscriptionSweepTests/PermissionCenterTests.swift`
- Test: `apps/ios/SubscriptionSweepTests/OnboardingFlowTests.swift`

**Interfaces:**
- Consumes: `UNUserNotificationCenter`, `EKEventStore`, setup choices.
- Produces:
  - permission states;
  - one-time explanatory prompts;
  - exact next action.

- [ ] **Step 1: Define permission states**

```swift
public enum PermissionState: Equatable {
    case notDetermined
    case authorized
    case denied
    case restricted
    case unavailable
    case error(String)
}
```

- [ ] **Step 2: Write the denial-degradation test**

```swift
@MainActor
func testNotificationDenialKeepsOtherChannelsAvailable() async {
    let center = PermissionCenter(
        notifications: StubNotifications(granted: false),
        reminders: StubReminders(granted: true)
    )

    await center.requestNotifications()
    await center.requestReminders()

    XCTAssertEqual(center.notificationState, .denied)
    XCTAssertEqual(center.reminderState, .authorized)
    XCTAssertEqual(center.availableChannels, [.inApp, .appleReminders])
}
```

- [ ] **Step 3: Implement notification permission**

Use:

```swift
let granted = try await UNUserNotificationCenter.current()
    .requestAuthorization(options: [.alert, .sound, .badge])
```

Query current settings before requesting and never prompt automatically on first launch. The prompt occurs only after the user taps `Enable notifications`.

- [ ] **Step 4: Implement Reminders permission**

Use:

```swift
let granted = try await EKEventStore()
    .requestFullAccessToReminders()
```

Include in `Info.plist`:

```xml
<key>NSRemindersFullAccessUsageDescription</key>
<string>SubscriptionSweep can create optional reminders before a trial or subscription renews.</string>
```

- [ ] **Step 5: Implement the Apple limitation page**

Required copy:

```text
SubscriptionSweep cannot silently read every subscription on your Apple Account. It creates reminders from receipts you forward, share, or enter manually.
```

The user must acknowledge this page before selecting an ingestion method.

- [ ] **Step 6: Verify and commit**

Run simulator tests for all permission combinations.

Commit:

```bash
git add apps/ios
git commit -m "feat(ios): add transparent onboarding and permissions"
```

---

### Task 6: Build Today, Subscriptions, Add, and Settings navigation

**Files:**
- Create: `apps/ios/SubscriptionSweepApp/Views/Root/RootTabView.swift`
- Create: `apps/ios/SubscriptionSweepApp/Views/Today/TodayView.swift`
- Create: `apps/ios/SubscriptionSweepApp/Views/Subscriptions/SubscriptionsView.swift`
- Create: `apps/ios/SubscriptionSweepApp/Views/Subscriptions/SubscriptionRow.swift`
- Create: `apps/ios/SubscriptionSweepApp/Views/Subscriptions/SubscriptionDetailView.swift`
- Create: `apps/ios/SubscriptionSweepApp/Views/Add/AddSubscriptionView.swift`
- Create: `apps/ios/SubscriptionSweepApp/Views/Settings/SettingsView.swift`
- Create: `apps/ios/SubscriptionSweepApp/Formatting/SubscriptionFormatters.swift`
- Test: `apps/ios/SubscriptionSweepTests/TodayViewModelTests.swift`
- Test: `apps/ios/SubscriptionSweepTests/SubscriptionFormattersTests.swift`

**Interfaces:**
- Consumes: cached subscriptions, reminders, and confirmations.
- Produces: four primary tabs and evidence-aware detail.

- [ ] **Step 1: Implement exact tab labels**

```swift
TabView {
    TodayView()
        .tabItem { Label("Today", systemImage: "clock.badge.exclamationmark") }

    SubscriptionsView()
        .tabItem { Label("Subscriptions", systemImage: "rectangle.stack") }

    AddSubscriptionView()
        .tabItem { Label("Add", systemImage: "plus.circle") }

    SettingsView()
        .tabItem { Label("Settings", systemImage: "gearshape") }
}
```

- [ ] **Step 2: Write the evidence badge test**

```swift
func testEvidenceLabelsAreDistinct() {
    XCTAssertEqual(EvidenceState.verified.displayName, "Verified")
    XCTAssertEqual(EvidenceState.inferred.displayName, "Inferred")
    XCTAssertEqual(
        EvidenceState.needsConfirmation.displayName,
        "Needs confirmation"
    )
}
```

- [ ] **Step 3: Implement Today ordering**

The view model sorts:

1. needs-confirmation records;
2. reminders within 48 hours;
3. reminders within 7 days;
4. later reminders.

The card shows:

- service;
- amount and interval;
- local date;
- evidence badge;
- active channel icons;
- exact next action.


- [ ] **Step 4: Implement manual subscription entry**

`AddSubscriptionView` collects:

```text
Service name                required
Amount                      optional, localized decimal input
Currency                    required when amount exists
Billing interval            Trial, Monthly, Annual, Other, Unknown
Trial end                   optional
Renewal date                optional
Timezone                    defaults to account timezone
Reminder channels           defaults from active policy
```

Validation:

- service name is 1–160 trimmed characters;
- amount converts to integer minor units without floating-point storage;
- amount and currency appear together;
- at least one trial-end or renewal date is required unless the user explicitly chooses `I do not know the date`;
- a past date requires explicit acknowledgement;
- `I do not know the date` creates `NEEDS_CONFIRMATION` and an immediate confirmation reminder.

Submit to `POST /v1/subscriptions/manual` with a stable idempotency key. User-entered facts remain labeled `User asserted`.

- [ ] **Step 5: Implement subscription detail actions**

Detail buttons:

```text
Manage Apple Subscriptions
Keep Subscription
Mark Canceled
Remind Me Later
```

`Mark Canceled` first displays:

```text
This records your report only. Confirm that you completed cancellation in Apple’s subscription settings.
```

- [ ] **Step 6: Verify and commit**

Run Swift package and simulator tests.

Commit:

```bash
git add apps/ios
git commit -m "feat(ios): add core subscription interface"
```

---

### Task 7: Reconcile local notifications with stable identifiers

**Files:**
- Create: `apps/ios/Packages/SubscriptionSweepCore/Sources/SubscriptionSweepCore/Reminders/LocalReminderPlan.swift`
- Create: `apps/ios/SubscriptionSweepApp/Notifications/NotificationCenterClient.swift`
- Create: `apps/ios/SubscriptionSweepApp/Notifications/LocalNotificationCoordinator.swift`
- Create: `apps/ios/SubscriptionSweepApp/Notifications/NotificationCategories.swift`
- Test: `apps/ios/Packages/SubscriptionSweepCore/Tests/SubscriptionSweepCoreTests/LocalReminderPlanTests.swift`
- Test: `apps/ios/SubscriptionSweepTests/LocalNotificationCoordinatorTests.swift`

**Interfaces:**
- Consumes: server reminders and current permission state.
- Produces:
  - scheduled `UNNotificationRequest`s;
  - removal of obsolete identifiers;
  - categories `SUBSCRIPTION_REMINDER` and `DATE_CONFIRMATION`.

- [ ] **Step 1: Define stable identifiers**

```swift
public extension Reminder {
    var localNotificationIdentifier: String {
        "reminder.\(id.uuidString.lowercased()).\(policyVersion)"
    }
}
```

- [ ] **Step 2: Write the reconciliation test**

```swift
func testReconciliationRemovesObsoleteAndAddsMissing() async throws {
    let center = StubNotificationCenter(
        pendingIdentifiers: ["reminder.old.1"]
    )
    let coordinator = LocalNotificationCoordinator(center: center)

    try await coordinator.reconcile(
        desired: [sampleReminder],
        now: Date(timeIntervalSince1970: 1_787_587_200)
    )

    XCTAssertEqual(center.removedIdentifiers, ["reminder.old.1"])
    XCTAssertEqual(
        center.addedRequests.map(\.identifier),
        [sampleReminder.localNotificationIdentifier]
    )
}
```

- [ ] **Step 3: Implement scheduling**

Use:

```swift
let components = Calendar(identifier: .gregorian)
    .dateComponents(
        [.year, .month, .day, .hour, .minute, .second],
        from: reminder.scheduledFor
    )

let trigger = UNCalendarNotificationTrigger(
    dateMatching: components,
    repeats: false
)
```

Notification `userInfo` contains only:

```swift
[
    "subscriptionId": subscription.id.uuidString,
    "reminderId": reminder.id.uuidString
]
```

Do not include receipt excerpts, price, private alias, or order reference.

- [ ] **Step 4: Add actions**

Actions:

- `OPEN_SUBSCRIPTION`
- `REMIND_LATER_24H`
- `MARK_KEPT`

No notification action marks cancellation.

- [ ] **Step 5: Verify and commit**

Run notification unit tests and a simulator scheduling smoke test that inspects pending requests.

Commit:

```bash
git add apps/ios
git commit -m "feat(ios): reconcile local subscription notifications"
```

---

### Task 8: Create and reconcile optional Apple Reminders

**Files:**
- Create: `apps/ios/SubscriptionSweepApp/Reminders/EventKitClient.swift`
- Create: `apps/ios/SubscriptionSweepApp/Reminders/EventKitReminderCoordinator.swift`
- Test: `apps/ios/SubscriptionSweepTests/EventKitReminderCoordinatorTests.swift`

**Interfaces:**
- Consumes: authorized `EKEventStore` and desired reminders.
- Produces: one `EKReminder` per opted-in SubscriptionSweep reminder.

- [ ] **Step 1: Define the external identifier**

Store this in `EKReminder.url`:

```text
subscriptionsweep://reminders/<reminder-uuid>
```

Title:

```text
Review <service-name> before renewal
```

Notes:

```text
SubscriptionSweep reminder. Open the app to review evidence and manage the subscription through Apple.
```

Do not place price or evidence excerpts in notes.

- [ ] **Step 2: Write the idempotency test**

```swift
func testExistingEventKitReminderIsUpdatedNotDuplicated() async throws {
    let store = StubEventKitStore(
        reminders: [existingReminder(for: sampleReminder.id)]
    )
    let coordinator = EventKitReminderCoordinator(store: store)

    try await coordinator.reconcile(
        desired: [sampleReminder],
        subscriptions: [sampleSubscription]
    )

    XCTAssertEqual(store.created.count, 0)
    XCTAssertEqual(store.updated.count, 1)
}
```

- [ ] **Step 3: Implement authorization and reconciliation**

Only run when `authorizationStatus(for: .reminder) == .fullAccess`.

Reconciliation:

1. fetch reminders with URL prefix `subscriptionsweep://reminders/`;
2. map by reminder UUID;
3. update due date and title when changed;
4. create missing reminders;
5. remove only obsolete reminders created by SubscriptionSweep;
6. preserve unrelated reminders.

- [ ] **Step 4: Verify and commit**

Run unit tests. On a simulator or test device, verify permission denial and creation manually; record manual evidence separately from automated test evidence.

Commit:

```bash
git add apps/ios
git commit -m "feat(ios): synchronize optional Apple Reminders"
```

---

### Task 9: Implement the Share Extension handoff

**Files:**
- Create: `apps/ios/Packages/SubscriptionSweepCore/Sources/SubscriptionSweepCore/Import/SharedImportEnvelope.swift`
- Create: `apps/ios/Packages/SubscriptionSweepCore/Sources/SubscriptionSweepCore/Import/SharedImportStore.swift`
- Modify: `apps/ios/SubscriptionSweepShare/ShareViewController.swift`
- Create: `apps/ios/SubscriptionSweepApp/Import/SharedImportCoordinator.swift`
- Create: `apps/ios/SubscriptionSweepApp/Resources/SubscriptionSweep.entitlements`
- Create: `apps/ios/SubscriptionSweepShare/SubscriptionSweepShare.entitlements`
- Test: `apps/ios/Packages/SubscriptionSweepCore/Tests/SubscriptionSweepCoreTests/SharedImportStoreTests.swift`
- Test: `apps/ios/SubscriptionSweepTests/SharedImportCoordinatorTests.swift`

**Interfaces:**
- Consumes: shared text, URL, or file provided through `NSItemProvider`.
- Produces: minimized `SharedImportEnvelope` in the App Group container.

- [ ] **Step 1: Define the envelope**

```swift
public struct SharedImportEnvelope: Codable, Sendable, Identifiable {
    public enum Kind: String, Codable, Sendable {
        case plainText
        case file
        case url
    }

    public let id: UUID
    public let kind: Kind
    public let createdAt: Date
    public let content: Data
    public let contentType: String
    public let contentHash: String
}
```

Limits:

- text: 512 KiB;
- file: 2 MiB;
- URL length: 2,048 characters;
- queue: 20 imports.

- [ ] **Step 2: Configure the App Group**

Both entitlements contain:

```xml
<key>com.apple.security.application-groups</key>
<array>
    <string>group.com.productweld.subscriptionsweep</string>
</array>
```

Signing remains unverified until the App Group is registered in the Apple Developer account.

- [ ] **Step 3: Implement extension loading**

Accept these uniform types:

```text
public.plain-text
public.url
public.email-message
public.data
```

Reject executable, archive, or oversized content. Strip security-scoped access immediately after copying the data into the App Group container.

- [ ] **Step 4: Implement main-app import processing**

On foreground:

1. atomically claim queued imports;
2. submit to the API using an idempotency key equal to the envelope UUID;
3. remove after API acceptance;
4. retain and surface recoverable errors;
5. never parse receipt data solely in extension memory.

- [ ] **Step 5: Verify and commit**

Run core tests and simulator extension tests for text, URL, file, oversized file, duplicate import, and API failure.

Commit:

```bash
git add apps/ios
git commit -m "feat(ios): add receipt Share Extension handoff"
```

---

### Task 10: Present Apple’s subscription-management sheet without mutating outcome

**Files:**
- Create: `apps/ios/SubscriptionSweepApp/StoreKit/SubscriptionManagementPresenter.swift`
- Create: `apps/ios/SubscriptionSweepApp/StoreKit/WindowSceneProvider.swift`
- Modify: `apps/ios/SubscriptionSweepApp/Views/Subscriptions/SubscriptionDetailView.swift`
- Create: `apps/ios/SubscriptionSweepApp/Views/Subscriptions/CancellationOutcomePrompt.swift`
- Test: `apps/ios/SubscriptionSweepTests/SubscriptionManagementPresenterTests.swift`
- Test: `apps/ios/SubscriptionSweepTests/CancellationOutcomePromptTests.swift`

**Interfaces:**
- Consumes: current foreground `UIWindowScene`.
- Produces:
  - Apple management-sheet presentation;
  - post-return user prompt;
  - no automatic cancellation state.

- [ ] **Step 1: Define the presenter protocol**

```swift
@MainActor
protocol SubscriptionManagementPresenting {
    func present() async throws
}
```

- [ ] **Step 2: Implement the StoreKit presenter**

```swift
import StoreKit
import UIKit

@MainActor
final class SubscriptionManagementPresenter:
    SubscriptionManagementPresenting
{
    private let sceneProvider: WindowSceneProviding

    init(sceneProvider: WindowSceneProviding) {
        self.sceneProvider = sceneProvider
    }

    func present() async throws {
        guard let scene = sceneProvider.foregroundActiveScene() else {
            throw PresentationError.noForegroundScene
        }

        try await AppStore.showManageSubscriptions(in: scene)
    }
}
```

- [ ] **Step 3: Write the no-automatic-outcome test**

```swift
@MainActor
func testReturningFromManagementSheetDoesNotMarkCanceled() async throws {
    let store = StubSubscriptionStore(
        lifecycle: .active
    )
    let presenter = StubManagementPresenter(result: .success(()))
    let model = SubscriptionDetailModel(
        store: store,
        presenter: presenter
    )

    await model.manageWithApple()

    XCTAssertEqual(store.lifecycle, .active)
    XCTAssertTrue(model.isShowingOutcomePrompt)
}
```

- [ ] **Step 4: Implement explicit post-return options**

Prompt actions:

```text
I canceled it
I kept it
Remind me later
Not sure
```

`I canceled it` calls the API’s user-reported cancellation endpoint and displays `User reported canceled`, never `Verified canceled`.

- [ ] **Step 5: Verify and commit**

Run simulator tests. A StoreKit sheet presentation smoke test requires an Apple sandbox-capable environment and remains `CONFIGURED`, not `VERIFIED`, until observed.

Commit:

```bash
git add apps/ios
git commit -m "feat(ios): add Apple subscription management handoff"
```

---

### Task 11: Add StoreKit test entitlement for SubscriptionSweep Auto

**Files:**
- Create: `apps/ios/SubscriptionSweepApp/StoreKit/EntitlementStore.swift`
- Create: `apps/ios/SubscriptionSweepApp/StoreKit/StoreKitClient.swift`
- Create: `apps/ios/SubscriptionSweepApp/Views/Billing/BillingView.swift`
- Create: `apps/ios/SubscriptionSweepApp/Resources/AppleTrialGuard.storekit`
- Modify: `apps/ios/project.yml`
- Test: `apps/ios/SubscriptionSweepTests/EntitlementStoreTests.swift`
- Test: StoreKit configuration test target.

**Interfaces:**
- Consumes:
  - product ID `com.productweld.subscriptionsweep.auto.yearly`;
  - `Product.products(for:)`;
  - `Transaction.currentEntitlements`;
  - `Transaction.updates`.
- Produces:
  - free, active, expired, revoked, and pending states;
  - purchase and restore;
  - server entitlement sync;
  - duplicate-purchase prevention.

- [ ] **Step 1: Define entitlement states**

```swift
public enum EntitlementState: Equatable {
    case free
    case loading
    case active(
        productID: String,
        expirationDate: Date?,
        environment: String
    )
    case pending
    case expired
    case revoked
    case configurationError(String)
}
```

- [ ] **Step 2: Implement verified transaction handling**

```swift
func verified<T>(
    _ result: VerificationResult<T>
) throws -> T {
    switch result {
    case .unverified:
        throw StoreKitError.failedVerification
    case .verified(let safe):
        return safe
    }
}
```

Only verified transactions grant entitlement.

- [ ] **Step 3: Implement purchase guard**

Before showing purchase:

1. check local current entitlements;
2. query server entitlement;
3. if either reports an active App Store or web plan, suppress purchase;
4. explain the active billing channel;
5. offer `Restore purchases` for an uncertain App Store state.

- [ ] **Step 4: Create StoreKit configuration values**

Configure exactly:

```text
Reference name: SubscriptionSweep Auto Annual
Product ID: com.productweld.subscriptionsweep.auto.yearly
Type: Auto-Renewable Subscription
Subscription group: SubscriptionSweep Auto
Duration: 1 Year
Local test price: USD 19.99
Introductory offer: None
```

This configuration is for local StoreKit testing only.

- [ ] **Step 5: Schedule the product’s own renewal reminder**

After a verified local test entitlement, call the API entitlement endpoint. The server creates or updates `SubscriptionSweep Auto` with billing owner `APPLE` and schedules annual reminders. The record must carry a source kind `STOREKIT_OWN_APP`.

- [ ] **Step 6: Verify and commit**

Run StoreKit test scenarios:

- purchase;
- restore;
- renewal;
- expiration;
- refund;
- revocation;
- pending approval;
- duplicate-purchase suppression.

Commit:

```bash
git add apps/ios
git commit -m "feat(ios): add StoreKit test entitlement"
```

---

### Task 12: Implement privacy, deletion, sync health, and final iOS verification

**Files:**
- Create: `apps/ios/SubscriptionSweepApp/Views/Privacy/PrivacyCenterView.swift`
- Create: `apps/ios/SubscriptionSweepApp/Views/Privacy/DeleteAccountView.swift`
- Create: `apps/ios/SubscriptionSweepApp/Privacy/PrivacyCoordinator.swift`
- Create: `apps/ios/SubscriptionSweepApp/Sync/SyncHealthView.swift`
- Create: `apps/ios/SubscriptionSweepApp/Logging/PrivacyLogger.swift`
- Create: `apps/ios/SubscriptionSweepTests/DeletionFlowTests.swift`
- Create: `apps/ios/SubscriptionSweepTests/PrivacyLoggerTests.swift`
- Create: `apps/ios/SubscriptionSweepUITests/PrimaryFlowUITests.swift`
- Create: `apps/ios/SubscriptionSweepUITests/AccessibilityUITests.swift`
- Modify: `apps/ios/project.yml`
- Modify: `.github/workflows/ci.yml`
- Create: `docs/verification/ios-verification.md`

**Interfaces:**
- Consumes: export, deletion, source health, and notification cleanup endpoints.
- Produces:
  - export request receipt;
  - deliberate deletion;
  - local notification removal;
  - token removal;
  - truthful sync health.

- [ ] **Step 1: Implement privacy-safe logging**

`PrivacyLogger` accepts an allowlisted metadata dictionary. Reject keys matching:

```text
token
authorization
cookie
email
alias
order
receipt
message
body
excerpt
```

The test serializes captured logs and confirms none of the synthetic private values appear.

- [ ] **Step 2: Implement exact deletion flow**

Require the phrase:

```text
DELETE MY SUBSCRIPTIONSWEEP ACCOUNT
```

On successful API deletion receipt:

1. remove all pending local notifications whose identifier starts with `reminder.`;
2. remove all SubscriptionSweep-created EventKit reminders;
3. delete Keychain token;
4. delete cached subscriptions;
5. delete pending mutations;
6. delete App Group imports;
7. replace root UI with account-deleted confirmation;
8. retain only the non-sensitive deletion receipt ID.

- [ ] **Step 3: Add UI tests**

Primary UI test:

1. launch in demo mode;
2. complete limitation acknowledgement;
3. deny notifications;
4. authorize simulated Reminders adapter;
5. import the trial fixture;
6. verify Example Music appears;
7. open detail;
8. invoke stubbed Apple management presenter;
9. select `Not sure`;
10. confirm lifecycle remains active.

Accessibility test:

- run with extra-extra-extra-large Dynamic Type;
- assert no clipped primary actions;
- assert all buttons have labels;
- assert Reduce Motion disables nonessential transitions;
- verify VoiceOver order through accessibility identifiers.

- [ ] **Step 4: Run fresh iOS verification**

Run:

```bash
swift test --package-path apps/ios/Packages/SubscriptionSweepCore

xcodegen generate --spec apps/ios/project.yml

xcodebuild \
  -project apps/ios/SubscriptionSweep.xcodeproj \
  -scheme SubscriptionSweep \
  -destination 'platform=iOS Simulator,name=iPhone 17 Pro' \
  test
```

Expected: package, unit, StoreKit configuration, UI, and accessibility tests pass on the recorded simulator.

- [ ] **Step 5: Record evidence and commit**

`docs/verification/ios-verification.md` must state:

- macOS and Xcode versions;
- XcodeGen version;
- simulator model and runtime;
- Swift version;
- test counts;
- signing state;
- App Group state;
- StoreKit state;
- Apple management-sheet state;
- APNs state;
- exact credential blockers.

Commit:

```bash
git add .
git commit -m "test(ios): verify native reminder and privacy flows"
```

Leave the draft pull request unmerged for independent review.
