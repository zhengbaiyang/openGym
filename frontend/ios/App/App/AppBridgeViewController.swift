import UIKit
import Capacitor

/// App-target Capacitor 7 plugins and the opt-in UIKit glass proof-of-concept.
/// This controller deliberately does not replace the React navigation bar.
class AppBridgeViewController: CAPBridgeViewController {
    private var labOverlay: UIView?
    var glassLabVisible: Bool { labOverlay != nil }

    override open func capacitorDidLoad() {
        super.capacitorDidLoad()
        bridge?.registerPluginInstance(PrintPlugin())
        bridge?.registerPluginInstance(HealthReadProbePlugin())

        let glassLab = NativeGlassLabPlugin()
        glassLab.host = self
        bridge?.registerPluginInstance(glassLab)
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
