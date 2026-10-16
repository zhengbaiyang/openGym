/* iOS HealthKit access is local and read-only. The UI-only IPA exposes only
 * device availability; the HealthKit-read IPA needs compatible signing and
 * explicit user consent. No imported health data enters the openGym server store.
 */
import { MOBILE } from './mobile.js'

export const nativeIOS = ({ mobile, platform, native }) =>
  mobile === true && platform === 'ios' && native === true

export function healthCapabilityMessage(status) {
  if (!status) return 'Could not check Apple Health availability.'
  if (!status.available) return 'Apple Health is available only on supported iPhone devices.'
  if (!status.importBuild) return 'Apple Health is available on this device. This is the UI-only IPA. Download the separate HealthKit-read test IPA and use a compatible signing profile to import workouts.'
  return 'Apple Health workout import is available in this build. A compatible HealthKit signing profile and your explicit read authorization are still required.'
}

export async function isNativeIOS() {
  if (!MOBILE) return false
  try {
    const { Capacitor } = await import('@capacitor/core')
    return nativeIOS({ mobile: MOBILE, platform: Capacitor.getPlatform(), native: Capacitor.isNativePlatform() })
  } catch (_) {
    return false
  }
}

async function healthPlugin() {
  if (!await isNativeIOS()) throw new Error('Apple Health is available only in the native iOS app')
  const { Capacitor, registerPlugin } = await import('@capacitor/core')
  if (!Capacitor.isPluginAvailable('HealthReadProbe')) {
    throw new Error('The installed iOS app does not contain the Apple Health native bridge. Install the latest IPA.')
  }
  return registerPlugin('HealthReadProbe')
}

export async function inspectIOSHealthKit() {
  if (!await isNativeIOS()) return { available: false, importBuild: false, syncEnabled: false, signingVerified: false }
  const state = await (await healthPlugin()).inspect()
  if (typeof state?.available !== 'boolean') throw new Error('Unexpected Apple Health diagnostic response')
  return { ...state, signingVerified: false }
}
export const authorizeWorkoutRead = async () => (await healthPlugin()).authorizeWorkouts()
export const syncWorkoutHistory = async () => (await healthPlugin()).syncWorkouts()
export const listLocalWorkouts = async () => (await healthPlugin()).listWorkouts()
export const disableHealthSync = async () => (await healthPlugin()).disableSync()
export const clearLocalHealthData = async () => (await healthPlugin()).clearLocalData({ confirmed: true })

export function workoutTitle(activity) {
  const types = { 13: 'Cycling', 16: 'Elliptical', 20: 'Functional strength', 24: 'Hiking', 35: 'Rowing', 37: 'Running', 44: 'Stair climbing', 46: 'Swimming', 50: 'Strength training', 52: 'Walking', 57: 'Yoga', 63: 'Interval training', 78: 'Cool down' }
  return types[activity] || 'Apple Health workout'
}
