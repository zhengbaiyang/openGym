import { describe, expect, it } from 'vitest'
import { nativeIOS, healthCapabilityMessage } from './ios-health.js'

describe('iOS Apple Health availability diagnostic', () => {
  it('runs only in the native iOS app, not Safari or Android', () => {
    expect(nativeIOS({ mobile: true, platform: 'ios', native: true })).toBe(true)
    expect(nativeIOS({ mobile: true, platform: 'ios', native: false })).toBe(false)
    expect(nativeIOS({ mobile: true, platform: 'android', native: true })).toBe(false)
    expect(nativeIOS({ mobile: false, platform: 'ios', native: true })).toBe(false)
  })

  it('never mistakes availability for signing or user permission', () => {
    expect(healthCapabilityMessage({ available: true })).toContain('NOT verified')
    expect(healthCapabilityMessage({ available: false })).toContain('supported iPhone')
    expect(healthCapabilityMessage(null)).toContain('Could not check')
  })
})
