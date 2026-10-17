// Phase 0 only: native UIKit glass over a real scrolling WKWebView.
// Keep this isolated from production navigation / workout / Apple Health state.
import { MOBILE } from './mobile.js'

const isNativeIOS = async () => {
  if (!MOBILE) return false
  try {
    const { Capacitor } = await import('@capacitor/core')
    return Capacitor.isNativePlatform() && Capacitor.getPlatform() === 'ios' &&
      Capacitor.isPluginAvailable('NativeGlassLab')
  } catch {
    return false
  }
}

async function bridge() {
  const { registerPlugin } = await import('@capacitor/core')
  return registerPlugin('NativeGlassLab')
}

export async function inspectNativeGlassLab() {
  if (!await isNativeIOS()) return { supported: false, active: false, stage: 'unavailable' }
  return (await bridge()).inspect()
}
export async function openNativeGlassLab() { return (await bridge()).show() }
export async function closeNativeGlassLab() { return (await bridge()).hide() }
export async function listenNativeGlassLab(handler) {
  return (await bridge()).addListener('selection', handler)
}
