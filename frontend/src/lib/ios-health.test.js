import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { nativeIOS, healthCapabilityMessage, workoutTitle } from './ios-health.js'

describe('read-only iOS Apple Health integration', () => {
  it('runs only in the native iOS app, not Safari or Android', () => {
    expect(nativeIOS({ mobile: true, platform: 'ios', native: true })).toBe(true)
    expect(nativeIOS({ mobile: true, platform: 'ios', native: false })).toBe(false)
    expect(nativeIOS({ mobile: true, platform: 'android', native: true })).toBe(false)
    expect(nativeIOS({ mobile: false, platform: 'ios', native: true })).toBe(false)
  })
  it('distinguishes device availability, UI-only and health-enabled IPA', () => {
    expect(healthCapabilityMessage({ available: true, importBuild: false })).toContain('UI-only')
    expect(healthCapabilityMessage({ available: true, importBuild: true })).toContain('compatible')
    expect(healthCapabilityMessage({ available: false, importBuild: true })).toContain('supported iPhone')
    expect(healthCapabilityMessage(null)).toContain('Could not check')
  })
  it('keeps workout labels separate from the original training model', () => {
    expect(workoutTitle(37)).toBe('Running')
    expect(workoutTitle(50)).toBe('Strength training')
    expect(workoutTitle(1000)).toBe('Apple Health workout')
  })
  it('never exposes HealthKit write or delete methods in the bridge', () => {
    const swift = readFileSync(new URL('../../ios/App/App/HealthReadProbePlugin.swift', import.meta.url), 'utf8')
    expect(swift).toContain('requestAuthorization(toShare: [], read: [HKObjectType.workoutType()])')
    expect(swift).not.toMatch(/health\.(?:save|delete)\s*\(/)
    expect(swift).toContain('#if HEALTHKIT_IMPORT_ENABLED')
    expect(swift).toContain('CAPPluginMethod(name: "syncWorkouts"')
  })
  it('separates Health-enabled and ordinary iOS artifact variants', () => {
    const workflow = readFileSync(new URL('../../../.github/workflows/build-ios-ipa.yml', import.meta.url), 'utf8')
    expect(workflow).toContain('variant: [ui-only, healthkit-read]')
    expect(workflow).toContain('HealthKitRead.entitlements')
    expect(workflow).toContain('HEALTHKIT_IMPORT_ENABLED')
  })
  it('stores imported workouts away from server sync and excludes automatic device backups', () => {
    const swift = readFileSync(new URL('../../ios/App/App/HealthWorkoutStore.swift', import.meta.url), 'utf8')
    expect(swift).toContain('resources.isExcludedFromBackup = true')
    expect(swift).toContain('sqlite3_open_v2')
    expect(swift).toContain('BEGIN IMMEDIATE')
    expect(swift).toContain('workoutAnchor')
    expect(swift).toContain('UPDATE workouts SET deleted=1')
  })
})
