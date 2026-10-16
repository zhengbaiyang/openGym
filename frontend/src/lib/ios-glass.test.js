import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { setIOSGlassPlatform, shouldEnableIOSGlass } from './ios-glass.js'

describe('iOS-only glass theme', () => {
  it('enables only in the Capacitor iOS app', () => {
    expect(shouldEnableIOSGlass({ mobile: true, platform: 'ios' })).toBe(true)
    expect(shouldEnableIOSGlass({ mobile: false, platform: 'ios' })).toBe(false)
    expect(shouldEnableIOSGlass({ mobile: true, platform: 'android' })).toBe(false)
    expect(shouldEnableIOSGlass({ mobile: true, platform: 'web' })).toBe(false)
  })

  it('keeps the iOS floating navigation centered on narrow and wide screens', () => {
    // A regression combined left:50%, logical inset:auto, and translateX(-50%),
    // clipping the left half of the dock on iPhone 17 Pro Max.
    const css = readFileSync(new URL('../ios-glass.css', import.meta.url), 'utf8')
    const rule = css.match(/:root\[data-ios-glass="on"\] #tabbar\s*\{([\s\S]*?)\}/)?.[1]
    expect(rule).toBeDefined()
    const declarations = rule.replace(/\/\*[\s\S]*?\*\//g, '')
    expect(declarations).toMatch(/inset-inline-start:\s*0\s*;/)
    expect(declarations).toMatch(/inset-inline-end:\s*0\s*;/)
    expect(declarations).toMatch(/margin-inline:\s*auto\s*;/)
    expect(declarations).toMatch(/transform:\s*none\s*;/)
    expect(declarations).toMatch(/width:\s*calc\(100%\s*-\s*28px\)/)
    expect(declarations).not.toMatch(/(?:left:\s*50%|translateX\()/)
  })

  it('marks the root and clears a stale marker on other platforms', () => {
    const root = { dataset: {} }
    expect(setIOSGlassPlatform(root, { mobile: true, platform: 'ios' })).toBe(true)
    expect(root.dataset.iosGlass).toBe('on')
    expect(setIOSGlassPlatform(root, { mobile: true, platform: 'android' })).toBe(false)
    expect(root.dataset.iosGlass).toBeUndefined()
  })
})
