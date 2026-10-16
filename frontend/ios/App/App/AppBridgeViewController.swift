import UIKit
import Capacitor

/// Capacitor 7 does not discover standalone app-target Swift plugins via legacy
/// CAP_PLUGIN Objective-C registrations. Register instances once the bridge exists.
class AppBridgeViewController: CAPBridgeViewController {
    override open func capacitorDidLoad() {
        super.capacitorDidLoad()
        bridge?.registerPluginInstance(PrintPlugin())
        bridge?.registerPluginInstance(HealthReadProbePlugin())
    }
}
