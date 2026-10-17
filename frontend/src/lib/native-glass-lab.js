// Native UIKit glass Stage 0 R3: independent WebKit reply bridge (primary)
// and Capacitor 7 plugin transport (diagnostic fallback).
// Neither transport changes production navigation, workouts or HealthKit state.
import { MOBILE } from './mobile.js'

export const NATIVE_GLASS_STAGE = 'Stage 0 R3 · 2026-10-17'
const BRIDGE_TIMEOUT_MS = 3500
let activeTransport = 'none'

export async function isNativeIOSShell() {
  if (!MOBILE) return false
  try {
    const { Capacitor } = await import('@capacitor/core')
    return Capacitor.isNativePlatform() && Capacitor.getPlatform() === 'ios'
  } catch {
    return false
  }
}

export async function withGlassBridgeTimeout(promise, label, ms = BRIDGE_TIMEOUT_MS) {
  let timeoutID
  try {
    return await Promise.race([
      Promise.resolve(promise),
      new Promise((_, reject) => {
        timeoutID = setTimeout(() => reject(new Error(label + ' timed out after ' + ms + 'ms')), ms)
      })
    ])
  } finally {
    if (timeoutID !== undefined) clearTimeout(timeoutID)
  }
}

function webkitHandler() {
  return typeof window === 'undefined' ? null :
    window.webkit?.messageHandlers?.openGymGlassLab || null
}

async function webkitMessage(command) {
  const handler = webkitHandler()
  if (!handler || typeof handler.postMessage !== 'function') {
    throw new Error('WebKit reply bridge not installed')
  }
  return withGlassBridgeTimeout(handler.postMessage({ command }), 'WebKit ' + command)
}

async function capacitorPlugin() {
  const { Capacitor, registerPlugin } = await import('@capacitor/core')
  if (!Capacitor.isPluginAvailable('NativeGlassLab')) {
    throw new Error('Capacitor NativeGlassLab plugin not registered')
  }
  return registerPlugin('NativeGlassLab')
}

async function capacitorMessage(command) {
  const plug = await withGlassBridgeTimeout(capacitorPlugin(), 'Capacitor plugin resolution')
  return withGlassBridgeTimeout(plug[command](), 'Capacitor ' + command)
}

export async function inspectNativeGlassLab() {
  if (!await isNativeIOSShell()) {
    activeTransport = 'none'
    return { supported: false, stage: 'not-native-ios', transport: 'none', bridgeRegistered: false }
  }

  const { Capacitor } = await import('@capacitor/core')
  const bridgeRegistered = Capacitor.isPluginAvailable('NativeGlassLab')
  const availableWebKit = !!webkitHandler()
  let firstError = ''

  // On iOS the native WebKit handler does not depend on Capacitor's promise
  // dispatch, which was observed to hang indefinitely on Stage 0 R2.
  if (availableWebKit) {
    try {
      const state = await webkitMessage('inspect')
      activeTransport = 'webkit-reply'
      return { ...state, bridgeRegistered, webkitHandlerPresent: true }
    } catch (e) {
      firstError = 'WebKit: ' + (e?.message || String(e))
    }
  } else {
    firstError = 'WebKit: reply handler absent'
  }

  if (bridgeRegistered) {
    try {
      const state = await capacitorMessage('inspect')
      activeTransport = 'capacitor'
      return { ...state, bridgeRegistered: true, webkitHandlerPresent: availableWebKit, transport: 'capacitor',
        diagnostic: firstError }
    } catch (e) {
      firstError += '; Capacitor: ' + (e?.message || String(e))
    }
  } else {
    firstError += '; Capacitor: plugin not registered'
  }
  activeTransport = 'none'
  return { supported: false, active: false, bridgeRegistered,
    webkitHandlerPresent: availableWebKit, transport: 'none',
    stage: 'all-native-bridges-unavailable', diagnostic: firstError }
}

async function message(command) {
  if (!await isNativeIOSShell()) throw new Error('Native Liquid Glass is iOS only')
  if (activeTransport === 'webkit-reply') return webkitMessage(command)
  if (activeTransport === 'capacitor') return capacitorMessage(command)
  throw new Error('Native glass bridge not ready; inspect the diagnostic first')
}

export const openNativeGlassLab = () => message('show')

export async function closeNativeGlassLab() {
  if (!await isNativeIOSShell()) return
  if (activeTransport === 'none') return
  return message('hide')
}

export async function listenNativeGlassLab(handler) {
  if (activeTransport === 'webkit-reply') {
    const listener = event => handler(event.detail)
    window.addEventListener('openGymGlassSelection', listener)
    return { remove: () => window.removeEventListener('openGymGlassSelection', listener) }
  }
  if (activeTransport === 'capacitor') {
    const plug = await capacitorPlugin()
    return withGlassBridgeTimeout(plug.addListener('selection', handler), 'Capacitor selection listener')
  }
  throw new Error('Native glass transport not ready')
}
