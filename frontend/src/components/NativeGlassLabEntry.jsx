import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import Icon from './Icon.jsx'
import { inspectNativeGlassLab } from '../lib/native-glass-lab.js'

// Show the lab only where a real native iOS 26+ glass overlay can run.
// It is a prototype, not a second tab bar and not a HealthKit feature.
export default function NativeGlassLabEntry() {
  const [available, setAvailable] = useState(false)
  const navigate = useNavigate()
  useEffect(() => {
    let live = true
    inspectNativeGlassLab().then(info => {
      if (live) setAvailable(info.supported === true)
    }).catch(() => {})
    return () => { live = false }
  }, [])
  if (!available) return null
  return (
    <button className="card ios-native-glass-entry" onClick={() => navigate('/glass-lab')}>
      <span className="ios-native-glass-entry-icon"><Icon name="layers" /></span>
      <span className="ios-native-glass-entry-copy">
        <strong>Native Liquid Glass preview</strong>
        <span>UIKit over the scrolling app · experimental</span>
      </span>
      <Icon name="chevronRight" />
    </button>
  )
}
