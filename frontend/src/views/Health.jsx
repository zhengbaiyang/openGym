import { useCallback, useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import Icon from '../components/Icon.jsx'
import {
  inspectIOSHealthKit, healthCapabilityMessage, isNativeIOS, authorizeWorkoutRead,
  syncWorkoutHistory, listLocalWorkouts, disableHealthSync, clearLocalHealthData, workoutTitle
} from '../lib/ios-health.js'

/** A separate iOS-only local timeline: never pushes external workouts into S.workouts. */
export default function Health() {
  const navigate = useNavigate()
  const busyRef = useRef(false)
  const [state, setState] = useState({ loading: true, info: null, error: '', workouts: [], notice: '' })
  const inspect = useCallback(async () => {
    try {
      const info = await inspectIOSHealthKit()
      const stored = info.importBuild ? await listLocalWorkouts() : { workouts: [] }
      setState(s => ({ ...s, loading: false, info, workouts: stored.workouts || [], error: '' }))
    } catch (error) {
      setState(s => ({ ...s, loading: false, error: error?.message || 'Unavailable' }))
    }
  }, [])
  useEffect(() => { inspect() }, [inspect])

  const sync = useCallback(async () => {
    if (busyRef.current) return
    busyRef.current = true
    setState(s => ({ ...s, loading: true, error: '' }))
    try {
      const response = await syncWorkoutHistory()
      const info = await inspectIOSHealthKit()
      setState(s => ({ ...s, loading: false, workouts: response.workouts || [], info,
        notice: 'Updated ' + response.addedOrUpdated + ' records. ' + response.markedDeleted + ' source deletions marked.' }))
    } catch (error) {
      setState(s => ({ ...s, loading: false, error: error?.message || 'Sync failed' }))
    } finally { busyRef.current = false }
  }, [])

  const connect = async () => {
    if (busyRef.current) return
    busyRef.current = true
    setState(s => ({ ...s, loading: true, error: '' }))
    try {
      await authorizeWorkoutRead() // User action: ONLY workout read type, never write.
      const info = await inspectIOSHealthKit()
      setState(s => ({ ...s, loading: false, info,
        notice: 'The read-permission dialog was processed. An empty result may mean no records or that access was declined.' }))
    } catch (error) {
      setState(s => ({ ...s, loading: false, error: error?.message || 'Authorization failed' }))
    } finally { busyRef.current = false }
  }

  const disconnect = async () => {
    try {
      await disableHealthSync()
      setState(s => ({ ...s, info: { ...s.info, syncEnabled: false },
        notice: 'Automatic reading stopped. Imported workouts remain stored locally.' }))
    } catch (error) { setState(s => ({ ...s, error: error.message })) }
  }

  const clear = async () => {
    if (!window.confirm('Permanently delete all locally imported Apple Health workouts? Your Apple Health originals will not be changed.')) return
    try {
      await clearLocalHealthData()
      setState(s => ({ ...s, workouts: [], notice: 'Local import cleared; Apple Health was not changed.' }))
    } catch (error) { setState(s => ({ ...s, error: error.message })) }
  }

  // Foreground incremental import is opt-in. Never prompt automatically.
  useEffect(() => {
    if (!state.info?.syncEnabled) return
    const onForeground = () => { if (document.visibilityState === 'visible') sync() }
    document.addEventListener('visibilitychange', onForeground)
    return () => document.removeEventListener('visibilitychange', onForeground)
  }, [state.info?.syncEnabled, sync])

  const info = state.info
  const ready = !!info?.importBuild && !!info.available
  const canSync = ready && !!info?.syncEnabled
  return (
    <div className="narrow ios-health-page">
      <div className="hdr">
        <div><h1>Apple Health</h1><div className="sub">Private, read-only Apple Watch workout history</div></div>
        <button className="iconbtn" onClick={() => navigate(-1)} aria-label="Go back"><Icon name="xmark" /></button>
      </div>

      <section className="card ios-health-hero">
        <span className="ios-health-hero-icon"><Icon name="heart" /></span>
        <h2>Workout history</h2>
        <p className="muted">With your permission, openGym can read workouts recorded by Apple Watch and other Apple Health sources. The original records are never modified.</p>
        <div className="ios-health-status" role="status" aria-live="polite">
          <Icon name={info?.available ? 'checkCircle' : 'shield'} />
          <span>{state.loading ? 'Working on this iPhone…' : state.error || healthCapabilityMessage(info)}</span>
        </div>
        {state.notice && <p className="muted small" role="status">{state.notice}</p>}
        {ready ? (
          <div className="ios-health-actions">
            {!canSync ? <button className="btn acc" onClick={connect} disabled={state.loading}>
              <Icon name="heart" /> Request workout read access
            </button> : <>
              <button className="btn acc" onClick={sync} disabled={state.loading}>
                <Icon name="repeat" /> Import / sync workouts
              </button>
              <button className="btn tinted" onClick={disconnect} disabled={state.loading}>Stop reading</button>
            </>}
          </div>
        ) : <button className="btn tinted" onClick={inspect} disabled={state.loading}>
          <Icon name="repeat" /> Check Apple Health availability
        </button>}
        <p className="muted small">HealthKit does not reveal whether reading was denied. No workouts may mean you have no records or denied access. To review permissions, open iPhone Settings or Apple Health.</p>
      </section>

      {ready && <section className="card ios-health-history">
        <div className="row between"><h2>Imported workouts</h2><span className="muted small">{state.workouts.length} shown</span></div>
        {!state.workouts.length ? <p className="muted">No imported workouts yet. Authorize reading, then tap Import / sync workouts.</p> :
          state.workouts.map(workout => (
            <div className="ios-health-workout" key={workout.id}>
              <div><strong>{workoutTitle(workout.activity)}</strong>
                <div className="muted small">{new Date(workout.start).toLocaleString()} · {workout.source}</div>
                {workout.sourceDeleted && <div className="muted small">Original deleted in Apple Health — local copy retained</div>}
              </div>
              <div className="ios-health-workout-meta">
                <strong>{Math.round(workout.duration / 60)} min</strong>
                {Number.isFinite(workout.energyKcal) && <span>{Math.round(workout.energyKcal)} kcal</span>}
              </div>
            </div>
          ))
        }
        <p className="muted small">The first import covers the previous 12 months. Data is stored only on this iPhone, in a separate backup-excluded database. Heart rate, sleep and body metrics are not imported by this initial workout-only milestone.</p>
        {!!state.workouts.length && <button className="btn tinted" onClick={clear}>Delete only local imports</button>}
      </section>}

      <section className="card ios-health-privacy">
        <h2>Privacy first</h2>
        <div className="ios-health-privacy-row"><Icon name="shield" /><span>Workout read only; no Apple Health writes</span></div>
        <div className="ios-health-privacy-row"><Icon name="heart" /><span>Apple Health → openGym, never the reverse</span></div>
        <div className="ios-health-privacy-row"><Icon name="watch" /><span>Imports remain on this iPhone; no server sync</span></div>
        <p className="muted small">A certificate that installs an IPA may still lack HealthKit permissions. The UI-only build does not request HealthKit authorization; the separately signed HealthKit-read build is required to test importing.</p>
      </section>
    </div>
  )
}
