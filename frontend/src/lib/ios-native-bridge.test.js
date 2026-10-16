import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'

// Native plugins are not automatically discovered from a standalone app target in
// Capacitor 7. A successful Xcode archive does not prove JS can call the plugin.
// Keep the storyboard, bridge registration and JS name in sync.
const nativeFile = name =>
  readFileSync(new URL('../../ios/App/App/' + name, import.meta.url), 'utf8')

describe('Capacitor 7 app-target plugin registration', () => {
  it('boots the bridge subclass from the actual storyboard', () => {
    const storyboard = nativeFile('Base.lproj/Main.storyboard')
    const controller = nativeFile('AppBridgeViewController.swift')
    expect(storyboard).toContain('customClass="AppBridgeViewController" customModule="App"')
    expect(controller).toContain('class AppBridgeViewController: CAPBridgeViewController')
    expect(controller).toContain('override open func capacitorDidLoad()')
    expect(controller).toContain('bridge?.registerPluginInstance(HealthReadProbePlugin())')
    expect(controller).toContain('bridge?.registerPluginInstance(PrintPlugin())')
  })

  it('declares method metadata with names matching registerPlugin', () => {
    const swift = nativeFile('HealthReadProbePlugin.swift')
    const js = readFileSync(new URL('./ios-health.js', import.meta.url), 'utf8')
    expect(swift).toContain('CAPPlugin, CAPBridgedPlugin')
    expect(swift).toContain('public let identifier = "HealthReadProbePlugin"')
    expect(swift).toContain('public let jsName = "HealthReadProbe"')
    expect(swift).toContain('CAPPluginMethod(name: "inspect", returnType: CAPPluginReturnPromise)')
    expect(js).toContain("registerPlugin('HealthReadProbe')")
  })

  it('compiles the custom bridge controller in the Xcode app target', () => {
    const project = readFileSync(new URL('../../ios/App/App.xcodeproj/project.pbxproj', import.meta.url), 'utf8')
    expect(project).toContain('AppBridgeViewController.swift in Sources')
    expect(project).toContain('HealthReadProbePlugin.swift in Sources')
    expect(project).not.toContain('HealthReadProbePlugin.m in Sources')
  })

  it('preserves the print plugin using the same bridge mechanism', () => {
    const swift = nativeFile('PrintPlugin.swift')
    expect(swift).toContain('CAPPlugin, CAPBridgedPlugin')
    expect(swift).toContain('public let jsName = "Print"')
    expect(swift).toContain('CAPPluginMethod(name: "printHtml", returnType: CAPPluginReturnPromise)')
  })
})
