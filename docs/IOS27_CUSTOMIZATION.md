# iOS 27-first / Apple Health customization — implementation tracker

This branch contains **work in progress**, not a release IPA. `main` must remain untouched until staged review.

## Decisions
- Design: iOS 27-first, iOS-only high-fidelity Liquid Glass-like visual appearance; both color modes, iOS 15.5+ fallback (including iOS 26).
- Keep five existing tabs; add the future Health screen from Home and Stats.
- HealthKit: **READ ONLY**. No HealthKit writing or deleting, no server uploads, no unsolicited permission prompt.
- First import: trailing 12 months, incremental change queries, source identity and deduplication.
- Imported records: local, separate from `S.workouts`, locally retained when original is deleted, excluded from automatic iCloud device backup.
- Optional AES-256-GCM password-encrypted full backup.
- Build: unsigned iOS IPA for separately provisioning/signing; the profile must authorize HealthKit when the feature is enabled.

## First implementation slice
- `frontend/src/ios-glass.css`: iOS-only, dark/light glass styling, high-contrast overlays and accessibility fallbacks.
- `frontend/src/lib/ios-glass.js`: activate the design only for native Capacitor iOS, never for Android or Safari.
- `frontend/src/lib/ios-glass.test.js`: platform-isolation tests.
- `frontend/src/main.jsx`: activate platform-gated CSS.
- `frontend/ios/App/App.xcodeproj/project.pbxproj`: personal iOS bundle ID `com.zhengbaiyang.opengym`.
- Shared `frontend/capacitor.config.json` intentionally keeps the original ID to avoid changing Android.

## Verified target device and toolchain
- Primary on-device target (user reported): **iPhone 17 Pro Max / iOS 27.0.1**.
- Keep the existing minimum deployment target **iOS 15.5**, rather than raising it to 27. Legacy devices receive visual fallbacks.
- Prefer **Xcode 27 / iOS 27 SDK** for the native IPA build. GitHub Actions `xcode-27` runner is in public preview; runner availability and successful compilation still need confirmation.
- iOS 27 adds better glass text diffusion, edge highlights and a system transparency control. The first CSS-only WebView implementation **cannot automatically inherit all native system glass controls**, including the native transparency slider. Native adaptation can be evaluated later, but never describe CSS glass as UIKit Liquid Glass.
- Validate both light and dark appearances and the iOS 27 accessibility options for reduced transparency and increased contrast.
- The user may still use a third-party signing app; **HealthKit entitlement support must be verified on device**. If unsupported, the UI-only IPA releases without any HealthKit prompt, while the health implementation remains gated.

## HealthKit signing probe slice (October 2026)
- Added `HealthReadProbePlugin.swift` and its Capacitor Objective-C registration; these use public `HKHealthStore.isHealthDataAvailable()` only. iOS does **not** expose the macOS `SecTask` entitlement inspector, so the app cannot infer signing permission from device availability. No permission prompt or health sample query is implemented in this slice.
- Added the iOS-only Apple Health entry on Home and Stats plus a dedicated readiness screen. Android and browser navigation remain unchanged. The five bottom tabs remain as before.
- This diagnostic is allowed in the **UI-only fallback IPA** and reports **signing not verified** for every result. A true device-availability result does not prove a compatible HealthKit provisioning profile; that must be validated in a separately enabled, user-initiated read-authorization and signed-device test.
- Do NOT add `CODE_SIGN_ENTITLEMENTS` or request HealthKit read authorization in the default unsigned IPA workflow until a compatible provisioning profile and signed-device test have been verified.
- Next approved slices: permission-category opt-in, anchored incremental reads, independent backup-excluded local database, secure storage, historical import, timeline dedupe and tests. A successful probe/build does not mean any of those functions are complete.
- Test on iPhone 17 Pro Max / iOS 27.0.1: open the new Apple Health card, tap **Check Apple Health availability** and capture the status text (no private health data is exposed). Keep all legacy workout features intact.

## Acceptance gates / pending work
1. **Visual baseline:** build on a Mac and review on a physical iPhone in both themes, including small screens and accessibility modes.
2. **Signing spike:** request HealthKit read entitlements only; verify the eventual provisioning profile contains required entitlements. A buildable unsigned IPA alone proves no HealthKit authorization.
3. **Native bridge:** read-only HealthKit plugin, observer/anchored incremental queries, user-granted scopes, protected local persistence.
4. **Data handling:** external workouts displayed separately and linked to local manual workouts without altering the current workout model; no accidental cloud sync.
5. **Backup:** opt-in, password-encrypted full local backup, tested import and excluded auto-iCloud database.
6. **Health UI:** new Health screen accessed from Home and Stats; retain existing five main tabs.
7. **Release:** if third-party signing does not authorize HealthKit, release a separately verified **UI-only** IPA with health functionality explicitly disabled.

## Checks
- `cd frontend && npm ci && npm test -- src/lib/ios-glass.test.js`
- `cd frontend && npm run build:mobile` (on Mac for CocoaPods sync)
- `xcodebuild ... archive` through repository Actions workflow; verify signed build on-device.

## Notes
This first slice is a **CSS-based WebView glass approximation**, not Apple's UIKit/SwiftUI native Liquid Glass. Health data functionality is not yet implemented. Do not merge until CI and real-device verification.
