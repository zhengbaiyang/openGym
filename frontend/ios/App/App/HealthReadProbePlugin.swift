import Foundation
import Capacitor
import HealthKit
import Security

/// Signed-app HealthKit capability probe. This intentionally has NO requestAuthorization,
/// HKSampleQuery, save or delete methods: an ordinary third-party-signed UI build must
/// remain installable without accidentally presenting a health-data permission prompt.
///
/// Entitlements belong to the App ID + provisioning profile, not to an unsigned IPA.
/// Checking the CURRENT PROCESS entitlement is useful only after signing on a real iPhone.
@objc(HealthReadProbePlugin)
public class HealthReadProbePlugin: CAPPlugin {
    @objc func inspect(_ call: CAPPluginCall) {
        let available = HKHealthStore.isHealthDataAvailable()
        let entitled = Self.hasHealthKitEntitlement()
        call.resolve([
            "available": available,
            "entitled": entitled,
            "readOnly": true,
            "permissionRequested": false
        ])
    }

    private static func hasHealthKitEntitlement() -> Bool {
        guard let task = SecTaskCreateFromSelf(kCFAllocatorDefault),
              let value = SecTaskCopyValueForEntitlement(
                task, "com.apple.developer.healthkit" as CFString, nil
              ) else {
            return false
        }
        return (value as? Bool) == true
    }
}
