import Foundation
import Capacitor
import HealthKit

/// Device availability only. No authorization request, HealthKit reads or writes.
/// A true availability result does NOT verify HealthKit signing entitlements.
@objc(HealthReadProbePlugin)
public class HealthReadProbePlugin: CAPPlugin, CAPBridgedPlugin {
    public let identifier = "HealthReadProbePlugin"
    public let jsName = "HealthReadProbe"
    public let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "inspect", returnType: CAPPluginReturnPromise)
    ]

    @objc func inspect(_ call: CAPPluginCall) {
        call.resolve([
            "available": HKHealthStore.isHealthDataAvailable(),
            "signingVerified": false,
            "readOnly": true,
            "permissionRequested": false
        ])
    }
}
