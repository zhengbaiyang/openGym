import UIKit
import WebKit
import Capacitor

/// Stage 0 WKScriptMessageHandlerWithReply diagnostic transport.
/// A weak host avoids retaining the WKWebView / controller in a cycle.
private final class NativeGlassLabMessageHandler: NSObject, WKScriptMessageHandlerWithReply {
    weak var host: AppBridgeViewController?

    init(host: AppBridgeViewController) {
        self.host = host
        super.init()
    }

    func userContentController(_ userContentController: WKUserContentController,
                               didReceive message: WKScriptMessage,
                               replyHandler: @escaping (Any?, String?) -> Void) {
        // Only our top-level bundled app view can request the experimental overlay.
        guard message.frameInfo.isMainFrame else {
            replyHandler(nil, "Native glass lab requires the main application frame")
            return
        }
        guard let host else {
            replyHandler(nil, "Native glass host has been released")
            return
        }
        guard let body = message.body as? [String: Any],
              let command = body["command"] as? String else {
            replyHandler(nil, "Missing native glass command")
            return
        }
        host.handleGlassLabMessage(command, replyHandler: replyHandler)
    }
}

/// App-target Capacitor 7 plugins and a separately testable WebKit glass bridge.
/// Only the /glass-lab route uses this experimental native layer.
class AppBridgeViewController: CAPBridgeViewController {
    private var labOverlay: UIView?
    private var glassScriptHandler: NativeGlassLabMessageHandler?
    var glassLabVisible: Bool { labOverlay != nil }

    override open func capacitorDidLoad() {
        super.capacitorDidLoad()
        bridge?.registerPluginInstance(PrintPlugin())
        bridge?.registerPluginInstance(HealthReadProbePlugin())

        let glassLab = NativeGlassLabPlugin()
        glassLab.host = self
        bridge?.registerPluginInstance(glassLab)

        // Independent of Capacitor's plugin dispatch. The previous Stage 0 R2
        // bridged inspect promise never completed on a physical iPhone; use
        // WebKit's reply-capable handler for deterministic diagnosis / rendering.
        if let webView {
            let handler = NativeGlassLabMessageHandler(host: self)
            glassScriptHandler = handler
            webView.configuration.userContentController.addScriptMessageHandler(
                handler, contentWorld: .page, name: "openGymGlassLab")
        }
    }

    /// The direct bridge is intentionally restricted to the local test route.
    func handleGlassLabMessage(_ command: String,
                               replyHandler: @escaping (Any?, String?) -> Void) {
        let isLab = webView?.url?.fragment?.hasPrefix("/glass-lab") == true
        switch command {
        case "inspect":
            let supported: Bool
            if #available(iOS 26.0, *) { supported = true }
            else { supported = false }
            replyHandler([
                "supported": supported,
                "platform": "ios",
                "bridgeRegistered": true,
                "transport": "webkit-reply",
                "stage": "stage0-r3-direct-webkit",
                "active": glassLabVisible,
                "hostAttached": true,
                "systemVersion": UIDevice.current.systemVersion,
                "labRoute": isLab
            ], nil)
        case "show":
            guard isLab else {
                replyHandler(nil, "Native overlay may only be opened on /glass-lab")
                return
            }
            guard #available(iOS 26.0, *) else {
                replyHandler(nil, "UIKit glass requires iOS 26 or later")
                return
            }
            showGlassLab { [weak self] item in
                // Item keys are selected from five hardcoded buttons, not
                // untrusted input. Dispatch a DOM event to the diagnostic page.
                self?.webView?.evaluateJavaScript(
                    "window.dispatchEvent(new CustomEvent('openGymGlassSelection', { detail: { item: '\(item)' } }))",
                    completionHandler: nil)
            }
            replyHandler(["visible": true, "transport": "webkit-reply"], nil)
        case "hide":
            hideGlassLab()
            replyHandler(["visible": false, "transport": "webkit-reply"], nil)
        default:
            replyHandler(nil, "Unknown native glass command")
        }
    }

    /// Real iOS glass is drawn above the WKWebView in the same UIKit window.
    /// Only the buttons handle touches; all other points pass through the host.
    func showGlassLab(onSelection: @escaping (String) -> Void) {
        guard #available(iOS 26.0, *) else { return }
        hideGlassLab()
        let overlay = NativeGlassLabOverlay(frame: .zero)
        overlay.onSelection = onSelection
        view.addSubview(overlay)
        NSLayoutConstraint.activate([
            overlay.topAnchor.constraint(equalTo: view.topAnchor),
            overlay.bottomAnchor.constraint(equalTo: view.bottomAnchor),
            overlay.leadingAnchor.constraint(equalTo: view.leadingAnchor),
            overlay.trailingAnchor.constraint(equalTo: view.trailingAnchor)
        ])
        view.bringSubviewToFront(overlay)
        labOverlay = overlay
    }

    func hideGlassLab() {
        labOverlay?.removeFromSuperview()
        labOverlay = nil
    }

    override func viewDidDisappear(_ animated: Bool) {
        super.viewDidDisappear(animated)
        hideGlassLab()
    }
}
