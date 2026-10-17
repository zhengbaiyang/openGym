import UIKit

/// Phase 0 proof: the actual iOS 26+ Liquid Glass effect is composited by UIKit
/// OVER Capacitor's scrolling WKWebView. This is not a CSS imitation.
/// The overlay is entirely opt-in on the /glass-lab route, with the original
/// React tab bar untouched until on-device hit-testing / glass pass-through pass.
@available(iOS 26.0, *)
final class NativeGlassLabOverlay: UIView {
    var onSelection: ((String) -> Void)?

    private let glassContainer: UIVisualEffectView
    private var buttons: [UIButton] = []

    override init(frame: CGRect) {
        let glass = UIGlassContainerEffect()
        glass.spacing = 8
        glassContainer = UIVisualEffectView(effect: glass)
        super.init(frame: frame)

        backgroundColor = .clear
        isOpaque = false
        translatesAutoresizingMaskIntoConstraints = false

        glassContainer.translatesAutoresizingMaskIntoConstraints = false
        glassContainer.backgroundColor = .clear
        addSubview(glassContainer)

        let items: [(String, String, String)] = [
            ("home", "house", "Home"),
            ("plan", "calendar", "Plan"),
            ("start", "play.fill", "Start"),
            ("stats", "chart.bar", "Stats"),
            ("library", "dumbbell", "Exercises")
        ]

        let row = UIStackView()
        row.axis = .horizontal
        row.spacing = 4
        row.distribution = .fillEqually
        row.alignment = .fill
        row.translatesAutoresizingMaskIntoConstraints = false
        // The glass buttons must be children of the effect's contentView
        // so UIGlassContainerEffect can blend their constituent glass effects.
        glassContainer.contentView.addSubview(row)

        for (key, symbol, label) in items {
            var configuration: UIButton.Configuration = key == "start" ? .prominentGlass() : .glass()
            configuration.image = UIImage(systemName: symbol)
            configuration.imagePlacement = .top
            configuration.imagePadding = 3
            configuration.title = label
            configuration.buttonSize = .small
            let button = UIButton(configuration: configuration, primaryAction: nil)
            button.accessibilityLabel = label
            button.accessibilityIdentifier = "glass-lab-" + key
            button.titleLabel?.font = .systemFont(ofSize: 11, weight: .medium)
            if key == "start" {
                button.tintColor = .systemGreen
            }
            button.addAction(UIAction { [weak self] _ in
                self?.onSelection?(key)
            }, for: .touchUpInside)
            buttons.append(button)
            row.addArrangedSubview(button)
        }

        // Keep the native layer geometrically independent of WKWebView's CSS
        // safe-area implementation. Never place an opaque backing view here.
        let fit = glassContainer.widthAnchor.constraint(equalTo: widthAnchor, constant: -28)
        fit.priority = .defaultHigh
        NSLayoutConstraint.activate([
            glassContainer.centerXAnchor.constraint(equalTo: centerXAnchor),
            glassContainer.bottomAnchor.constraint(equalTo: safeAreaLayoutGuide.bottomAnchor, constant: -6),
            glassContainer.widthAnchor.constraint(lessThanOrEqualToConstant: 530),
            glassContainer.widthAnchor.constraint(lessThanOrEqualTo: widthAnchor, constant: -28),
            fit,
            glassContainer.heightAnchor.constraint(equalToConstant: 78),

            row.leadingAnchor.constraint(equalTo: glassContainer.contentView.leadingAnchor, constant: 5),
            row.trailingAnchor.constraint(equalTo: glassContainer.contentView.trailingAnchor, constant: -5),
            row.topAnchor.constraint(equalTo: glassContainer.contentView.topAnchor, constant: 5),
            row.bottomAnchor.constraint(equalTo: glassContainer.contentView.bottomAnchor, constant: -5)
        ])
    }

    required init?(coder: NSCoder) { fatalError("init(coder:) is unsupported") }

    /// The transparent fullscreen view must never steal scrolling or touches
    /// OUTSIDE its real controls; the WKWebView beneath remains interactive.
    override func point(inside point: CGPoint, with event: UIEvent?) -> Bool {
        buttons.contains { button in
            !button.isHidden && button.convert(button.bounds, to: self).contains(point)
        }
    }
}
