/* iOS HealthKit capability probe, not health-data synchronization.
 * In this first gated slice there is NO read permission prompt, sample query,
 * local import, server sync or HealthKit write method.
 */
import { MOBILE } from './mobile.js'

export const nativeIOS = ({ mobile, platform, native }) =>
  mobile === true && platform === 'ios' && native === true

export function healthCapabilityMessage(status) {
  if (!status) return 'Could not check the HealthKit configuration.'
  if (!status.available) return 'Apple Health is available only on supported iPhone devices.'
  if (!status.entitled) return 'This signed build does not have the required HealthKit entitlement. Use the UI-only version until a compatible signing profile is available.'
  return 'HealthKit entitlement detected. Read-only workout import is being implemented; no health data has been accessed yet.'
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
  if (!await isNativeIOS()) return { available: false, entitled: false, readOnly: true, permissionRequested: false }
  const { registerPlugin } = await import('@capacitor/core')
  const native = registerPlugin('HealthReadProbe')
  const state = await native.inspect()
  if (typeof state?.available !== 'boolean' || typeof state?.entitled !== 'boolean') {
    throw new Error('Unexpected HealthKit capability response')
  }
  return { available: state.available, entitled: state.entitled, readOnly: true, permissionRequested: false }
}
