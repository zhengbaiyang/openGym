# iOS 27 UIKit Liquid Glass v2 — implementation tracker

**Status: Stage 0 / technical feasibility prototype. Not a native tab-bar release.**
**Main remains untouched. HealthKit data-import issue remains explicitly deferred.**

## Approved decisions

- iOS 26+ true UIKit Liquid Glass, with compatibility UI on iOS 15.5–25.
- Custom five-action native glass dock retaining the prominent green Start.
- Browse screens: gentle scroll-triggered compression; active workout: original fullscreen UI and timer. When a workout is running in another section, no automatic dock compression.
- Preserve React Router, startFlow, workout timer/recording state as the source of truth.
- Native glass for primary top-level actions only. Content cards use legible standard materials.
- Real scrolling WebView content underneath the UIKit visual effect; native touch handling on controls only.
- High-contrast, reduced transparency, reduced motion and VoiceOver compliance are release gates.
- One full UI signoff, not repeated demands to install partially complete IPAs.

## Phase 0 — current changes

The first experiment is isolated at `/glass-lab` and intentionally **does not replace the production HTML `TabBar`**.

- `NativeGlassLabOverlay.swift` implements a real iOS 26+ `UIGlassContainerEffect` hosting five `UIButton.Configuration.glass()` / `.prominentGlass()` controls. It overlays the existing WKWebView with **no opaque background**.
- Its fullscreen hit-testing only accepts touches inside actual native buttons. Outside touches should pass through to the scrollable React page.
- `NativeGlassLabPlugin.swift` declares a Capacitor 7 bridged plugin with inspect/show/hide methods and selection events.
- The existing `AppBridgeViewController` registers the plugin and owns the overlay lifecycle, including guaranteed removal when the controller disappears.
- `GlassLab.jsx` shows scrolling high-contrast colored cards and labels tapped native buttons separately from WebView taps, making glass/backdrop compositing and touch pass-through observable.
- The entry is offered only if an actual native iOS 26+ shell reports supported; Safari, Android and iOS 15.5–25 retain existing UI.
- Existing HealthKit code, workout data, Start routing, bottom dock CSS and original HTML tab bar remain unchanged.

A successful Xcode build and unit tests prove code wiring only; **they do not establish genuine background refraction, touch pass-through, native animation or accessibility on-device**. An actual iPhone 17 Pro Max / iOS 27.0.1 video is required at the appropriate later milestone.

## Stage 0 acceptance

1. GitHub Tests: frontend, API, MCP, Docker all success on latest commit.
2. Xcode 27: UI-only unsigned IPA archives and uploads; old iOS deployment target remains unchanged.
3. On iOS 27.0.1: the five native glass buttons appear above the live colored WebView panels; underlying scrolling changes their native backdrop material. No opaque fake backing.
4. Tap each of five native buttons 10 times; selection counter increments exactly once per tap. Tapping a colored WebView panel increments only the WebView counter.
5. Scrolling beside the five native buttons works; navigating away removes the entire overlay. Reloading the page does not create a second layer.
6. Disabling reduced motion or transparency in OS Settings respects accessibility. Unsupported iOS <26 has a working HTML tab bar and no native preview entry.

## Subsequent milestones after signed-device Stage 0 signoff

1. Native production five-tab bar with React Router event exchange, Start/Resume and workout timing, with a single visible navigation source.
2. Scroll compression (80 pt direction threshold, 12–18 pt height change) with full-width touch regions, no jitter.
3. Top-level native utility/return/close tools; safe areas, keyboard and modals coordinated with WebView.
4. UI tuning for dark/light, accessibility and performance; complete real-device acceptance; merge only when requested.

Do not claim those milestones complete until implemented and verified. Real HealthKit import, encryption/backup and signing diagnosis remain a **separate, postponed workstream**.
