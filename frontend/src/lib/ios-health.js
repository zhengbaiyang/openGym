/* iOS HealthKit device availability diagnostic, not health-data synchronization.
 * iOS does not expose the signed process's HealthKit entitlements through a
 * supported public inspection API. Never interpret health availability as signing
 * compatibility. No authorization request, sample read or write occurs here.
 */
import { MOBILE } from './mobile.js'

export const nativeIOS = ({ mobile, platform, native }) =>
  mobile === true && platform === 'ios' && native === true

export function healthCapabilityMessage(status) {
  if (!status) return 'Could not check Apple Health availability.'
  if (!status.available) return 'Apple Health is available only on supported iPhone devices.'
  return 'Apple Health is available on this device. HealthKit signing permissions are NOT verified. Importing workouts will require an appropriate provisioning profile and your read authorization.'
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

export async function inspectIOSHealthKit() {
  if (!await isNativeIOS()) return { available: false, signingVerified: false, readOnly: true, permissionRequested: false }
  const { Capacitor, registerPlugin } = await import('@capacitor/core')
  if (!Capacitor.isPluginAvailable('HealthReadProbe')) {
    throw new Error('The installed iOS app does not contain the Apple Health native bridge. Update to the latest IPA.')
  }
  const native = registerPlugin('HealthReadProbe')
  const state = await native.inspect()
  if (typeof state?.available !== 'boolean') throw new Error('Unexpected Apple Health diagnostic response')
  return { available: state.available, signingVerified: false, readOnly: true, permissionRequested: false }
}
