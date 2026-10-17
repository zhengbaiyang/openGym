import Foundation
import Capacitor
import UIKit

/// Local system print sheet plugin for plans and document export.
@objc(PrintPlugin)
public class PrintPlugin: CAPPlugin, CAPBridgedPlugin {
    public let identifier = "PrintPlugin"
    public let jsName = "Print"
    public let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "printHtml", returnType: CAPPluginReturnPromise)
    ]

    @objc func printHtml(_ call: CAPPluginCall) {
        guard let html = call.getString("html"), !html.isEmpty else {
            call.reject("html is required")
            return
        }
        let jobName = call.getString("name") ?? "openGym"

        DispatchQueue.main.async {
            let controller = UIPrintInteractionController.shared

            let info = UIPrintInfo(dictionary: nil)
            info.outputType = .general
            info.jobName = jobName
            controller.printInfo = info

            let formatter = UIMarkupTextPrintFormatter(markupText: html)
            formatter.perPageContentInsets = .zero
            controller.printFormatter = formatter

            controller.present(animated: true) { (_, completed, error) in
                if let error = error {
                    call.reject(error.localizedDescription)
                } else {
                    call.resolve(["completed": completed])
                }
            }
        }
    }
}
