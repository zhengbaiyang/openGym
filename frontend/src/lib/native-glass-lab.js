// UIKit Liquid Glass Stage 0 diagnostic bridge. Never changes production tabs.
import { MOBILE } from './mobile.js'

export const NATIVE_GLASS_STAGE = 'Stage 0 R2 · 2026-10-17'

export async function isNativeIOSShell() {
  if (!MOBILE) return false
  try {
    const { Capacitor } = await import('@capacitor/core')
    return Capacitor.isNativePlatform() && Capacitor.getPlatform() === 'ios'
  } catch {
    return false
  }
}

async function bridge() {
  const { registerPlugin } = await import('@capacitor/core')
  return registerPlugin('NativeGlassLab')
}

export async function inspectNativeGlassLab() {
  if (!await isNativeIOSShell()) {
    return { supported: false, active: false, stage: 'not-native-ios', bridgeRegistered: false }
  }
  let bridgeRegistered = false
  try {
    const { Capacitor } = await import('@capacitor/core')
    bridgeRegistered = Capacitor.isPluginAvailable('NativeGlassLab')
    // Do not return early if availability reports false: invoke inspect as well,
    // so a registration/discovery discrepancy produces a useful diagnostic.
    const status = await (await bridge()).inspect()
    return { ...status, bridgeRegistered }
  } catch (error) {
    return { supported: false, active: false, bridgeRegistered,
      stage: 'bridge-inspect-failed',
      diagnostic: error?.message || String(error) || 'Unknown native bridge error' }
  }
}
export async function openNativeGlassLab() {
  if (!await isNativeIOSShell()) throw new Error('Native Liquid Glass is iOS only')
  return (await bridge()).show()
}
export async function closeNativeGlassLab() {
  if (!await isNativeIOSShell()) return
  return (await bridge()).hide()
}
export async function listenNativeGlassLab(handler) {
  return (await bridge()).addListener('selection', handler)
}
