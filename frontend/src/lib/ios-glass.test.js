import { describe, expect, it } from 'vitest'
import { setIOSGlassPlatform, shouldEnableIOSGlass } from './ios-glass.js'

describe('iOS-only glass theme', () => {
  it('enables only in the Capacitor iOS app', () => {
    expect(shouldEnableIOSGlass({ mobile: true, platform: 'ios' })).toBe(true)
    expect(shouldEnableIOSGlass({ mobile: false, platform: 'ios' })).toBe(false)
    expect(shouldEnableIOSGlass({ mobile: true, platform: 'android' })).toBe(false)
    expect(shouldEnableIOSGlass({ mobile: true, platform: 'web' })).toBe(false)
  })
  it('marks the root and clears a stale marker on other platforms', () => {
    const root = { dataset: {} }
    expect(setIOSGlassPlatform(root, { mobile: true, platform: 'ios' })).toBe(true)
    expect(root.dataset.iosGlass).toBe('on')
    expect(setIOSGlassPlatform(root, { mobile: true, platform: 'android' })).toBe(false)
    expect(root.dataset.iosGlass).toBeUndefined()
  })
})
