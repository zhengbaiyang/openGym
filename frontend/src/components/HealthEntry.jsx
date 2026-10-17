import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import Icon from './Icon.jsx'
import { isNativeIOS } from '../lib/ios-health.js'

/** Home and Stats entry, invisible in all web/Android builds. */
export default function HealthEntry() {
  const [ios, setIOS] = useState(false)
  const navigate = useNavigate()
  useEffect(() => {
    let mounted = true
    isNativeIOS().then(yes => { if (mounted) setIOS(yes) })
    return () => { mounted = false }
  }, [])
  if (!ios) return null
  return (
    <button className="card ios-health-entry" onClick={() => navigate('/health')}
      aria-label="Apple Health — integration readiness">
      <span className="ios-health-entry-icon"><Icon name="heart" /></span>
      <span className="ios-health-entry-copy">
        <strong>Apple Health</strong>
        <span>Integration readiness</span>
      </span>
      <Icon name="chevronRight" />
    </button>
  )
}
