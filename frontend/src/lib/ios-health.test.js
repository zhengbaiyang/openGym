import { describe, expect, it } from 'vitest'
import { nativeIOS, healthCapabilityMessage } from './ios-health.js'

describe('opt-in iOS HealthKit signature probe', () => {
  it('is exclusive to a real native iOS shell, not Safari and Android', () => {
    expect(nativeIOS({ mobile: true, platform: 'ios', native: true })).toBe(true)
    expect(nativeIOS({ mobile: true, platform: 'ios', native: false })).toBe(false)
    expect(nativeIOS({ mobile: true, platform: 'android', native: true })).toBe(false)
    expect(nativeIOS({ mobile: false, platform: 'ios', native: true })).toBe(false)
  })

  it('does not mistake system availability for entitlement support', () => {
    expect(healthCapabilityMessage({ available: true, entitled: false })).toContain('does not have')
    expect(healthCapabilityMessage({ available: true, entitled: true })).toContain('no health data')
    expect(healthCapabilityMessage({ available: false, entitled: true })).toContain('supported iPhone')
  })
})
