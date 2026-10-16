# iOS 26 / Apple Health customization — implementation tracker

This branch contains **work in progress**, not a release IPA. `main` must remain untouched until staged review.

## Decisions
- Design: iOS-only, high-fidelity Liquid Glass-like visual appearance, both color modes, iOS 15.5+ fallback.
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
