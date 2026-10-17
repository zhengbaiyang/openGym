import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import Icon from './Icon.jsx'
import { inspectNativeGlassLab, isNativeIOSShell, NATIVE_GLASS_STAGE } from '../lib/native-glass-lab.js'

// The test entry must never silently disappear when the UIKit bridge is
// unavailable. A missing bridge is the very failure Stage 0 needs to diagnose.
export default function NativeGlassLabEntry() {
  const [ios, setIOS] = useState(false)
  const [info, setInfo] = useState(null)
  const navigate = useNavigate()
  useEffect(() => {
    let live = true
    ;(async () => {
      const native = await isNativeIOSShell()
      if (!live) return
      setIOS(native)
      if (!native) return
      const result = await inspectNativeGlassLab()
      if (live) setInfo(result)
    })().catch(error => {
      if (live) setInfo({ supported: false, stage: 'entry-error', diagnostic: error?.message })
    })
    return () => { live = false }
  }, [])
  if (!ios) return null
  return (
    <button type="button" className="card ios-native-glass-entry" onClick={() => navigate('/glass-lab')}>
      <span className="ios-native-glass-entry-icon"><Icon name="sparkles" /></span>
      <span className="ios-native-glass-entry-copy">
        <strong>Native Liquid Glass · Test</strong>
        <span>{NATIVE_GLASS_STAGE}</span>
        <span>{!info ? 'Checking native UIKit bridge…' :
          info.supported ? 'UIKit glass ready · tap to test' :
            'Native bridge unavailable · tap for diagnostics'}</span>
      </span>
      <Icon name="chevronRight" />
    </button>
  )
}
