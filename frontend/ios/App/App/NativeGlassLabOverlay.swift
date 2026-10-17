import UIKit

/// Stage 0 R4 — a *single* native glass dock, not five separate floating
/// Liquid Glass bubbles. UIKit renders the glass over the scrolling WKWebView.
/// The isolated /glass-lab still owns this prototype: production navigation is
/// unchanged until on-device visual, tap and scroll acceptance.
@available(iOS 26.0, *)
final class NativeGlassLabOverlay: UIView {
    var onSelection: ((String) -> Void)?

    private let glassContainer: UIVisualEffectView
    private let dockSurface: UIVisualEffectView
    private let startButton: UIButton
    private let startLabel = UILabel()

    private var buttons: [UIButton] = []
    private var tabButtons: [String: UIButton] = [:]
    private var tabIcons: [String: UIImageView] = [:]
    private var tabLabels: [String: UILabel] = [:]
    private var selectedKey = "home"

    override init(frame: CGRect) {
        // One full-width glass material anchors the four normal tabs. Only the
        // prominent green Start gets its own glass surface. Both belong to the
        // SAME glass container, so UIKit can blend their shared edges.
        let combined = UIGlassContainerEffect()
        combined.spacing = 8
        glassContainer = UIVisualEffectView(effect: combined)
        dockSurface = UIVisualEffectView(effect: UIGlassEffect())

        var startConfiguration = UIButton.Configuration.prominentGlass()
        startConfiguration.image = UIImage(systemName: "play.fill",
                                           withConfiguration: UIImage.SymbolConfiguration(pointSize: 22, weight: .semibold))
        startConfiguration.baseForegroundColor = .white
        startConfiguration.cornerStyle = .capsule
        startButton = UIButton(configuration: startConfiguration)

        super.init(frame: frame)

        backgroundColor = .clear
        isOpaque = false
        translatesAutoresizingMaskIntoConstraints = false

        glassContainer.translatesAutoresizingMaskIntoConstraints = false
        glassContainer.backgroundColor = .clear
        addSubview(glassContainer)

        dockSurface.translatesAutoresizingMaskIntoConstraints = false
        dockSurface.backgroundColor = .clear
        // The native effect stays at full opacity. Clipping shapes the single
        // wide capsule rather than flattening five circles into the backdrop.
        dockSurface.layer.cornerRadius = 35
        dockSurface.layer.cornerCurve = .continuous
        dockSurface.clipsToBounds = true
        glassContainer.contentView.addSubview(dockSurface)

        let row = UIStackView()
        row.axis = .horizontal
        row.alignment = .fill
        row.distribution = .fillEqually
        row.spacing = 0
        row.translatesAutoresizingMaskIntoConstraints = false
        dockSurface.contentView.addSubview(row)

        // Tab positions remain five equal columns, but ordinary buttons are
        // clear controls *inside the single glass surface*. Their selection
        // is a compact tint highlight, not a new glass bubble.
        let normalItems: [(String, String, String)] = [
            ("home", "house", "Home"),
            ("plan", "calendar", "Plan"),
            ("stats", "chart.bar", "Stats"),
            ("library", "dumbbell", "Exercises")
        ]
        for (index, item) in normalItems.enumerated() {
            if index == 2 {
                let middle = UIView()
                middle.isUserInteractionEnabled = false
                row.addArrangedSubview(middle)

                startLabel.text = "Start"
                startLabel.font = .systemFont(ofSize: 10, weight: .semibold)
                startLabel.textColor = .label
                startLabel.adjustsFontForContentSizeCategory = true
                startLabel.textAlignment = .center
                startLabel.translatesAutoresizingMaskIntoConstraints = false
                middle.addSubview(startLabel)
                NSLayoutConstraint.activate([
                    startLabel.centerXAnchor.constraint(equalTo: middle.centerXAnchor),
                    startLabel.bottomAnchor.constraint(equalTo: middle.bottomAnchor, constant: -9)
                ])
            }

            let button = makeTab(item.0, symbol: item.1, label: item.2)
            tabButtons[item.0] = button
            buttons.append(button)
            row.addArrangedSubview(button)
        }

        startButton.translatesAutoresizingMaskIntoConstraints = false
        startButton.tintColor = .systemGreen
        startButton.accessibilityLabel = "Start"
        startButton.accessibilityIdentifier = "glass-lab-start"
        startButton.accessibilityHint = "Tests the native glass Start control"
        startButton.addAction(UIAction { [weak self] _ in
            self?.select("start")
        }, for: .touchUpInside)
        glassContainer.contentView.addSubview(startButton)
        buttons.append(startButton)

        // Preserve the iPhone-validated left/right alignment and safe-area
        // anchoring of the previous overlay. The actual translucent bar is
        // 70pt tall; the green circle rises only 15pt above its top edge.
        let fit = glassContainer.widthAnchor.constraint(equalTo: widthAnchor, constant: -28)
        fit.priority = .defaultHigh
        NSLayoutConstraint.activate([
            glassContainer.centerXAnchor.constraint(equalTo: centerXAnchor),
            glassContainer.bottomAnchor.constraint(equalTo: safeAreaLayoutGuide.bottomAnchor, constant: -4),
            glassContainer.widthAnchor.constraint(lessThanOrEqualToConstant: 530),
            glassContainer.widthAnchor.constraint(lessThanOrEqualTo: widthAnchor, constant: -28),
            fit,
            glassContainer.heightAnchor.constraint(equalToConstant: 93),

            dockSurface.leadingAnchor.constraint(equalTo: glassContainer.contentView.leadingAnchor),
            dockSurface.trailingAnchor.constraint(equalTo: glassContainer.contentView.trailingAnchor),
            dockSurface.bottomAnchor.constraint(equalTo: glassContainer.contentView.bottomAnchor, constant: -5),
            dockSurface.heightAnchor.constraint(equalToConstant: 70),

            row.leadingAnchor.constraint(equalTo: dockSurface.contentView.leadingAnchor, constant: 5),
            row.trailingAnchor.constraint(equalTo: dockSurface.contentView.trailingAnchor, constant: -5),
            row.topAnchor.constraint(equalTo: dockSurface.contentView.topAnchor, constant: 5),
            row.bottomAnchor.constraint(equalTo: dockSurface.contentView.bottomAnchor, constant: -3),

            startButton.centerXAnchor.constraint(equalTo: glassContainer.contentView.centerXAnchor),
            startButton.topAnchor.constraint(equalTo: glassContainer.contentView.topAnchor, constant: 0),
            startButton.widthAnchor.constraint(equalToConstant: 56),
            startButton.heightAnchor.constraint(equalToConstant: 56)
        ])
        applySelection()
    }

    required init?(coder: NSCoder) { fatalError("init(coder:) is unsupported") }

    private func makeTab(_ key: String, symbol: String, label: String) -> UIButton {
        let button = UIButton(type: .custom)
        button.accessibilityLabel = label
        button.accessibilityIdentifier = "glass-lab-" + key
        button.accessibilityTraits = .button
        button.backgroundColor = .clear
        button.layer.cornerRadius = 18
        button.layer.cornerCurve = .continuous

        let icon = UIImageView(image: UIImage(systemName: symbol,
                    withConfiguration: UIImage.SymbolConfiguration(pointSize: 21, weight: .regular)))
        icon.contentMode = .scaleAspectFit
        icon.tintColor = .secondaryLabel
        icon.translatesAutoresizingMaskIntoConstraints = false

        let caption = UILabel()
        caption.text = label
        caption.textAlignment = .center
        caption.numberOfLines = 1
        caption.lineBreakMode = .byClipping
        caption.adjustsFontSizeToFitWidth = true
        caption.minimumScaleFactor = 0.84
        caption.font = .systemFont(ofSize: 10, weight: .medium)
        caption.textColor = .secondaryLabel
        caption.translatesAutoresizingMaskIntoConstraints = false

        // The native control fills its cell; the image/label are decorative,
        // and never intercept button taps or drag recognizers.
        icon.isUserInteractionEnabled = false
        caption.isUserInteractionEnabled = false
        button.addSubview(icon)
        button.addSubview(caption)

        NSLayoutConstraint.activate([
            icon.centerXAnchor.constraint(equalTo: button.centerXAnchor),
            icon.topAnchor.constraint(equalTo: button.topAnchor, constant: 10),
            icon.heightAnchor.constraint(equalToConstant: 24),
            icon.widthAnchor.constraint(equalToConstant: 27),

            caption.centerXAnchor.constraint(equalTo: button.centerXAnchor),
            caption.topAnchor.constraint(equalTo: icon.bottomAnchor, constant: 3),
            caption.leadingAnchor.constraint(greaterThanOrEqualTo: button.leadingAnchor, constant: 2),
            caption.trailingAnchor.constraint(lessThanOrEqualTo: button.trailingAnchor, constant: -2),
            caption.widthAnchor.constraint(lessThanOrEqualTo: button.widthAnchor, constant: -4)
        ])

        button.addAction(UIAction { [weak self] _ in self?.select(key) }, for: .touchUpInside)
        tabIcons[key] = icon
        tabLabels[key] = caption
        return button
    }

    private func select(_ key: String) {
        selectedKey = key
        // Native feedback is intentionally restrained: the dock itself stays
        // stable while the selected tint moves. Honor Reduce Motion.
        if UIAccessibility.isReduceMotionEnabled {
            applySelection()
        } else {
            UIView.animate(withDuration: 0.18, delay: 0, options: [.allowUserInteraction, .curveEaseOut]) {
                self.applySelection()
            }
        }
        UISelectionFeedbackGenerator().selectionChanged()
        onSelection?(key)
    }

    private func applySelection() {
        for (key, button) in tabButtons {
            let active = key == selectedKey
            button.backgroundColor = active ? UIColor.systemGreen.withAlphaComponent(0.12) : .clear
            tabIcons[key]?.tintColor = active ? .systemGreen : .secondaryLabel
            tabLabels[key]?.textColor = active ? .systemGreen : .secondaryLabel
            if active { button.accessibilityTraits.insert(.selected) }
            else { button.accessibilityTraits.remove(.selected) }
        }
        startLabel.textColor = selectedKey == "start" ? .systemGreen : .label
        if selectedKey == "start" { startButton.accessibilityTraits.insert(.selected) }
        else { startButton.accessibilityTraits.remove(.selected) }
    }

    // The fullscreen, fully transparent host accepts events only in five
    // real touch targets. Dragging the WKWebView outside them still scrolls.
    override func point(inside point: CGPoint, with event: UIEvent?) -> Bool {
        buttons.contains { button in
            !button.isHidden && button.convert(button.bounds, to: self).contains(point)
        }
    }
}
