import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'

const file = name => readFileSync(new URL(name, import.meta.url), 'utf8')
const swift = name => readFileSync(new URL('../../ios/App/App/' + name, import.meta.url), 'utf8')

describe('iOS 27 native Liquid Glass Phase 0 compositor', () => {
  it('uses real UIKit glass materials, never a CSS-only fake', () => {
    const overlay = swift('NativeGlassLabOverlay.swift')
    expect(overlay).toContain('@available(iOS 26.0, *)')
    expect(overlay).toContain('UIGlassContainerEffect()')
    expect(overlay).toContain('UIVisualEffectView(effect: glass)')
    expect(overlay).toContain('UIButton.Configuration')
    expect(overlay).toContain('.prominentGlass()')
    expect(overlay).toContain('.glass()')
    expect(overlay).toContain('glassContainer.contentView.addSubview(row)')
  })

  it('keeps the fullscreen overlay transparent with touch pass-through', () => {
    const overlay = swift('NativeGlassLabOverlay.swift')
    expect(overlay).toContain('backgroundColor = .clear')
    expect(overlay).toContain('isOpaque = false')
    expect(overlay).toContain('override func point(inside point: CGPoint, with event: UIEvent?) -> Bool')
    expect(overlay).toContain('button.convert(button.bounds, to: self).contains(point)')
  })

  it('exposes a gated Capacitor 7 bridge with a reversible lifecycle', () => {
    const plug = swift('NativeGlassLabPlugin.swift')
    const host = swift('AppBridgeViewController.swift')
    expect(plug).toContain('CAPPlugin, CAPBridgedPlugin')
    expect(plug).toContain('public let jsName = "NativeGlassLab"')
    for (const method of ['inspect', 'show', 'hide']) {
      expect(plug).toContain('CAPPluginMethod(name: "' + method + '"')
    }
    expect(plug).toContain('if #available(iOS 26.0, *)')
    expect(host).toContain('bridge?.registerPluginInstance(glassLab)')
    expect(host).toContain('view.addSubview(overlay)')
    expect(host).toContain('view.bringSubviewToFront(overlay)')
    expect(host).toContain('hideGlassLab()')
    const pbx = readFileSync(new URL('../../ios/App/App.xcodeproj/project.pbxproj', import.meta.url), 'utf8')
    expect(pbx).toContain('NativeGlassLabOverlay.swift in Sources')
    expect(pbx).toContain('NativeGlassLabPlugin.swift in Sources')
  })

  it('never allows the proof to create duplicate production tab bars', () => {
    const app = file('../App.jsx')
    const lab = file('../views/GlassLab.jsx')
    const home = file('../views/Home.jsx')
    const js = file('./native-glass-lab.js')
    expect(app).toContain("loc.pathname === '/glass-lab'")
    expect(app).toContain('<Route path="/glass-lab" element={<GlassLab />} />')
    expect(lab).toContain('closeNativeGlassLab().catch(() => {})')
    expect(lab).toContain('listenNativeGlassLab(event =>')
    expect(js).toContain("Capacitor.getPlatform() === 'ios'")
    expect(js).toContain("Capacitor.isPluginAvailable('NativeGlassLab')")
    expect(home).toContain('<NativeGlassLabEntry />')
  })

  it('does not change the HealthKit or legacy HTML tabbar integration', () => {
    const app = file('../App.jsx')
    expect(app).toContain('<TabBar onStart={startFlow} />')
    const entry = file('../components/NativeGlassLabEntry.jsx')
    // The previous build hid the entire test entry if plugin inspection failed,
    // making a valid new IPA appear identical to the old user interface.
    expect(entry).toContain('if (!ios) return null')
    expect(entry).not.toContain('if (!available) return null')
    expect(entry).toContain('NATIVE_GLASS_STAGE')
    expect(entry).toContain('Native bridge unavailable')
    expect(entry).toContain("navigate('/glass-lab')")
    const js = file('./native-glass-lab.js')
    expect(js).toContain('bridge-inspect-failed')
    expect(js).toContain('const status = await (await bridge()).inspect()')
    const lab = file('../views/GlassLab.jsx')
    expect(lab).toContain('Bridge registration:')
    expect(lab).toContain('Native error:')
    expect(lab).toContain('Build marker:')
  })
})
