// The visual redesign must never affect the PWA or Android build.
// Keep platform detection explicit: a Safari PWA on iPhone is not the Capacitor app.
export const shouldEnableIOSGlass = ({ mobile, platform }) => mobile === true && platform === 'ios'

export function setIOSGlassPlatform(root, { mobile, platform }) {
  const enabled = shouldEnableIOSGlass({ mobile, platform })
  if (enabled) root.dataset.iosGlass = 'on'
  else delete root.dataset.iosGlass
  return enabled
}
