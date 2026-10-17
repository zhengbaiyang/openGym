import Foundation
import Capacitor
import UIKit

/// Phase-0 diagnostic, never a replacement for live navigation.
/// Exposes only presentation / event probes; no HealthKit or training writes.
@objc(NativeGlassLabPlugin)
public class NativeGlassLabPlugin: CAPPlugin, CAPBridgedPlugin {
    public let identifier = "NativeGlassLabPlugin"
    public let jsName = "NativeGlassLab"
    public let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "inspect", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "show", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "hide", returnType: CAPPluginReturnPromise)
    ]

    weak var host: AppBridgeViewController?

    @objc func inspect(_ call: CAPPluginCall) {
        if #available(iOS 26.0, *) {
            call.resolve(["supported": true, "platform": "ios", "material": "UIGlassEffect",
                          "stage": "overlay-prototype", "active": host?.glassLabVisible ?? false])
        } else {
            call.resolve(["supported": false, "platform": "ios", "stage": "compatibility-fallback",
                          "active": false])
        }
    }

    @objc func show(_ call: CAPPluginCall) {
        guard let host = host else {
            call.reject("Native glass bridge is not attached to this window")
            return
        }
        guard #available(iOS 26.0, *) else {
            call.reject("Native Liquid Glass requires iOS 26 or later")
            return
        }
        host.showGlassLab { [weak self] item in
            self?.notifyListeners("selection", data: ["item": item])
        }
        call.resolve(["visible": true, "material": "UIGlassEffect"])
    }

    @objc func hide(_ call: CAPPluginCall) {
        host?.hideGlassLab()
        call.resolve(["visible": false])
    }
}
