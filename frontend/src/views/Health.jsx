import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import Icon from '../components/Icon.jsx'
import { inspectIOSHealthKit, healthCapabilityMessage, isNativeIOS } from '../lib/ios-health.js'

/** Capability-only UI. No permissions requested and no sample data is read here. */
export default function Health() {
  const navigate = useNavigate()
  const [state, setState] = useState({ loading: true, data: null, error: '', ios: false })
  const inspect = async () => {
    setState(s => ({ ...s, loading: true, error: '' }))
    try {
      const ios = await isNativeIOS()
      const data = await inspectIOSHealthKit()
      setState({ loading: false, ios, data, error: '' })
    } catch (error) {
      setState({ loading: false, ios: true, data: null, error: error?.message || 'Unavailable' })
    }
  }
  useEffect(() => { inspect() }, [])

  const unavailable = !state.ios || !state.data?.available
  const supported = !!state.data?.available
  return (
    <div className="narrow">
      <div className="hdr">
        <div>
          <h1>Apple Health</h1>
          <div className="sub">HealthKit device availability · iPhone</div>
        </div>
        <button className="iconbtn" onClick={() => navigate(-1)} aria-label="Go back">
          <Icon name="xmark" />
        </button>
      </div>

      <section className="card ios-health-hero">
        <span className="ios-health-hero-icon"><Icon name="heart" /></span>
        <h2>Connect your training history</h2>
        <p className="muted">
          Your Apple Watch can record workouts in Apple Health. The planned integration
          will import permitted workouts into a separate on-device history, without
          changing workouts or measurements in Apple Health.
        </p>
        <div className="ios-health-status" role="status" aria-live="polite">
          <Icon name={supported ? 'checkCircle' : 'shield'} />
          <span>{state.loading ? 'Checking this app’s signing permissions…' :
            state.error || healthCapabilityMessage(state.data)}</span>
        </div>
        <button className="btn tinted" disabled={state.loading} onClick={inspect}>
          <Icon name="repeat" /> Check Apple Health availability
        </button>
      </section>

      <section className="card ios-health-privacy">
        <h2>Privacy first</h2>
        <div className="ios-health-privacy-row"><Icon name="shield" /><span>No health access requested yet</span></div>
        <div className="ios-health-privacy-row"><Icon name="heart" /><span>Future data flow: Apple Health → openGym only</span></div>
        <div className="ios-health-privacy-row"><Icon name="watch" /><span>Imported records will stay on this iPhone</span></div>
        <p className="muted small">This checks whether the iPhone supports Apple Health. It cannot check signing entitlements or health-reading permissions.
          A certificate that can install an IPA does not necessarily support HealthKit.
          {unavailable ? ' Health importing is not enabled in this build.' : ''}</p>
      </section>
    </div>
  )
}
