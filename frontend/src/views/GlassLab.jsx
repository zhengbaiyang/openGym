import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import Icon from '../components/Icon.jsx'
import { inspectNativeGlassLab, openNativeGlassLab, closeNativeGlassLab, listenNativeGlassLab, NATIVE_GLASS_STAGE } from '../lib/native-glass-lab.js'

// This page intentionally scrolls visibly behind the *native* glass control.
// Touching cards scrolls the WebView; touching the glass buttons notifies JS.
export default function GlassLab() {
  const navigate = useNavigate()
  const [info, setInfo] = useState(null)
  const [error, setError] = useState('')
  const [selected, setSelected] = useState('none')
  const [taps, setTaps] = useState(0)
  const [webTaps, setWebTaps] = useState(0)

  useEffect(() => {
    let dead = false
    let listener
    ;(async () => {
      try {
        const state = await inspectNativeGlassLab()
        if (dead) return
        setInfo(state)
        if (!state.supported) return
        listener = await listenNativeGlassLab(event => {
          if (dead) return
          setSelected(event.item)
          setTaps(t => t + 1)
        })
        if (dead) { listener?.remove(); return }
        await openNativeGlassLab()
        if (dead) await closeNativeGlassLab()
      } catch (err) {
        if (!dead) setError(err?.message || 'Native glass preview is unavailable')
      }
    })()
    return () => {
      dead = true
      listener?.remove()
      // Closing is idempotent and must not leave a UIKit overlay over other routes.
      closeNativeGlassLab().catch(() => {})
    }
  }, [])

  return (
    <div className="narrow ios-glass-lab">
      <div className="hdr">
        <div>
          <h1>Native Liquid Glass</h1>
          <div className="sub">{NATIVE_GLASS_STAGE} · UIKit compositor over WebView</div>
        </div>
        <button className="iconbtn" onClick={() => navigate('/home')} aria-label="Back to Home">
          <Icon name="xmark"/>
        </button>
      </div>
      <section className="card ios-glass-lab-report">
        <h2>Phase 0 · native overlay test</h2>
        <p className="muted small">Build marker: {NATIVE_GLASS_STAGE}</p>
        <p className="muted">The five controls floating over this page are rendered by UIKit, not CSS. They are a test fixture and do not change your workout or navigate the actual tabs.</p>
        <div role="status" aria-live="polite">
          <strong>UIKit material:</strong> {info === null ? 'Checking…' : info.supported ? 'UIGlassEffect (native)' : 'Not available'}
        </div>
        <div><strong>WebKit reply handler:</strong> {info === null ? 'Checking…' : info.webkitHandlerPresent ? 'Detected' : 'Missing'}</div>
        <div><strong>Bridge transport:</strong> {info?.transport || 'Checking…'}</div>
        <div><strong>Bridge registration:</strong> {info === null ? 'Checking…' : info.bridgeRegistered ? 'Detected' : 'Not detected'}</div>
        <div><strong>Inspect stage:</strong> {info?.stage || 'Checking…'}</div>
        <div><strong>Native host:</strong> {info?.hostAttached === undefined ? 'Unknown' : info.hostAttached ? 'Attached' : 'Missing'}</div>
        {info?.diagnostic && <p className="ios-glass-lab-error" role="alert">Native error: {info.diagnostic}</p>}
        {info?.labRoute === false && <p className="ios-glass-lab-error" role="alert">Native shell does not recognize the #/glass-lab route.</p>}
        <div><strong>Last native button:</strong> {selected} · {taps} taps</div>
        <div><strong>WebView content taps:</strong> {webTaps}</div>
        {error && <p className="ios-glass-lab-error" role="alert">Overlay error: {error}</p>}
        {info && !info.supported && <p className="muted">The native overlay cannot be displayed. If your phone runs iOS 26+, this indicates a bridge/installation problem rather than normal compatibility behavior. Send a screenshot of this report.</p>}
      </section>

      <div className="ios-glass-lab-tracks">
        {[
          ['01', 'Under glass', 'Scroll this page; the native glass should refract this changing background.'],
          ['02', 'Tap-through', 'Tap this card; the WebView count above should increase.'],
          ['03', 'Five controls', 'Tap Home, Plan, Start, Stats and Exercises in the native dock.'],
          ['04', 'No ghost touches', 'Swipe any gap outside a native glass button to scroll the web page.'],
          ['05', 'Dark and light', 'Change appearance in Settings and return to check system materials.'],
          ['06', 'Accessibility', 'VoiceOver should label all five native controls.']
        ].map(([num, title, desc], i) => (
          <button key={num} className={'ios-glass-lab-tile ios-glass-lab-tile-' + i}
            onClick={() => setWebTaps(n => n + 1)}>
            <span>{num}</span><strong>{title}</strong><small>{desc}</small>
          </button>
        ))}
      </div>
      <p className="muted small ios-glass-lab-footnote">
        This is the view-compositing and hit-testing experiment only. The production React tab bar is unchanged until the real iPhone test proves the glass overlay works.
      </p>
    </div>
  )
}
