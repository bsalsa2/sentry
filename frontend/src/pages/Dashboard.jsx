/**
 * The console: system status, 24h activity, the camera grid, latest alerts.
 */

import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'

import ActivityChart from '../components/ActivityChart'
import AlertHistory from '../components/AlertHistory'
import DeviceCard from '../components/DeviceCard'
import { ShieldIcon } from '../components/icons'
import StatTile from '../components/StatTile'
import { fetchAlerts, fetchDevices, fetchStats, fetchTimeseries } from '../services/api'
import { useAuth } from '../services/AuthContext'
import { detection } from '../utils/detections'
import { clockTime, confidencePercent, timeAgo } from '../utils/format'

/** The hero reads as a sentence, not a log line — one narrative verb per type. */
const NARRATIVE = {
  person: (where) => `Someone was seen at ${where}.`,
  package: (where) => `A parcel arrived at ${where}.`,
  vehicle: (where) => `A vehicle showed up at ${where}.`,
  animal: (where) => `Something moved through ${where}.`,
  motion: (where) => `Motion was caught at ${where}.`,
}

function heroStatement(devicesTotal, latestAlert) {
  if (devicesTotal === 0) return 'No cameras are connected yet.'
  if (!latestAlert) return 'All quiet. Nothing to report.'
  const where = latestAlert.device_name || 'a camera'
  const say = NARRATIVE[latestAlert.detection_type]
  return say ? say(where) : `${detection(latestAlert.detection_type).label} detected at ${where}.`
}

export default function Dashboard({ liveAlert }) {
  const { user } = useAuth()

  const [devices, setDevices] = useState([])
  const [stats, setStats] = useState(null)
  const [series, setSeries] = useState(null)
  const [latestAlert, setLatestAlert] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [refreshKey, setRefreshKey] = useState(0)

  const load = useCallback(async () => {
    setError('')
    try {
      // All four at once rather than one after another.
      const [deviceData, statsData, seriesData, alertData] = await Promise.all([
        fetchDevices(),
        fetchStats(),
        fetchTimeseries(24),
        fetchAlerts({ limit: 1 }),
      ])
      setDevices(deviceData.devices)
      setStats(statsData)
      setSeries(seriesData)
      setLatestAlert(alertData.alerts?.[0] || null)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  // A live alert changes the numbers, the chart and the hero, so pull them again.
  useEffect(() => {
    if (!liveAlert) return
    load()
    setRefreshKey((key) => key + 1)
  }, [liveAlert, load])

  // Cameras go offline silently — re-check so the pills don't go stale.
  useEffect(() => {
    const timer = setInterval(load, 30000)
    return () => clearInterval(timer)
  }, [load])

  const firstName = user?.name?.split(' ')[0] || 'there'
  const anyDown = stats && stats.devices_online < stats.devices_total
  const tone = latestAlert ? detection(latestAlert.detection_type).color : undefined
  const todayLabel = new Date().toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' })

  return (
    <div className="page">
      {/* --- Hero: the day, stated as a sentence --- */}
      <div className="hero rise rise-1">
        <ShieldIcon className="hero-mark" aria-hidden="true" />

        <div className="hero-top">
          <div className="label">Surveillance console</div>
          <span className="label">{todayLabel}</span>
        </div>

        <div className="hero-grid">
          <div className="hero-statement" style={{ '--tone': tone }}>
            {heroStatement(stats?.devices_total, latestAlert)}
          </div>

          {latestAlert && (
            <div className="hero-time">
              <div className="hero-time-n tabular">{clockTime(latestAlert.timestamp)}</div>
              <div className="hero-time-sub">
                Confidence {confidencePercent(latestAlert.confidence)} · {timeAgo(latestAlert.timestamp)}
              </div>
            </div>
          )}
        </div>

        <div className="hero-foot">
          <p>Good to see you, {firstName}. {anyDown ? `${stats?.devices_online ?? 0} of ${stats?.devices_total ?? 0} cameras reporting.` : ''}</p>
          <Link to="/settings" className="btn btn-go">+ Add camera</Link>
        </div>
      </div>

      {error && <div className="note note-bad">{error}</div>}

      {/* --- Readouts --- */}
      <div className="stats rise rise-2">
        <StatTile
          label="Cameras online"
          value={stats ? `${stats.devices_online}/${stats.devices_total}` : '—'}
          sub={anyDown ? 'attention needed' : 'all reporting'}
          tone={anyDown ? 'var(--warn)' : 'var(--ok)'}
        />
        <StatTile
          label="Detections 24h"
          value={stats ? stats.alerts_24h : '—'}
          sub="across all cameras"
        />
        <StatTile
          label="Unreviewed"
          value={stats ? stats.alerts_unacknowledged : '—'}
          sub={stats?.alerts_unacknowledged ? 'awaiting review' : 'all clear'}
          tone={stats?.alerts_unacknowledged ? 'var(--crit)' : undefined}
        />
        <StatTile
          label="People 24h"
          value={stats ? stats.by_type_24h.person : '—'}
          sub="person detections"
        />
      </div>

      {/* --- Activity --- */}
      <div className="section rise rise-3">
        <ActivityChart data={series} loading={loading && !series} />
      </div>

      {/* --- Cameras --- */}
      <div className="section rise rise-3">
        <div className="section-head">
          <h2>Cameras</h2>
          <span className="label">{devices.length} configured</span>
        </div>

        {loading && devices.length === 0 ? (
          <div className="devices">
            <div className="skel" style={{ height: 232 }} />
            <div className="skel" style={{ height: 232, opacity: 0.6 }} />
          </div>
        ) : devices.length === 0 ? (
          <div className="empty">
            <h3>No cameras connected</h3>
            <p>
              Add your first Outpost camera to start monitoring. You can set it
              up now and plug the hardware in later — it will come online by itself.
            </p>
            <Link to="/settings" className="btn btn-go">Add your first camera</Link>
          </div>
        ) : (
          <div className="devices">
            {devices.map((device) => <DeviceCard key={device.id} device={device} />)}
          </div>
        )}
      </div>

      {/* --- Latest --- */}
      <div className="section rise rise-4">
        <div className="section-head">
          <h2>Latest detections</h2>
          <Link to="/alerts" className="label" style={{ color: 'var(--signal)' }}>View all →</Link>
        </div>
        <AlertHistory showFilters={false} limit={8} refreshKey={refreshKey} />
      </div>
    </div>
  )
}
