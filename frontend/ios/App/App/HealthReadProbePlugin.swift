import Foundation
import Capacitor
import HealthKit

/// Device availability check only. iOS has no supported public API equivalent to the
/// macOS-only SecTask entitlement inspection API. Do NOT claim that a successful result
/// establishes a HealthKit entitlement, authorization, or access to any health records.
///
/// This diagnostic performs no HealthKit authorization requests or data queries.
@objc(HealthReadProbePlugin)
public class HealthReadProbePlugin: CAPPlugin {
    @objc func inspect(_ call: CAPPluginCall) {
        call.resolve([
            "available": HKHealthStore.isHealthDataAvailable(),
            "signingVerified": false,
            "readOnly": true,
            "permissionRequested": false
        ])
    }
}
