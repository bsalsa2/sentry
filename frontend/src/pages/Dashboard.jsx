/**
 * The console: system status, 24h activity, the camera grid, latest alerts.
 */

import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'

import ActivityChart from '../components/ActivityChart'
import AlertHistory from '../components/AlertHistory'
import DeviceCard from '../components/DeviceCard'
import StatTile from '../components/StatTile'
import { fetchDevices, fetchStats, fetchTimeseries } from '../services/api'
import { useAuth } from '../services/AuthContext'

export default function Dashboard({ liveAlert }) {
  const { user } = useAuth()

  const [devices, setDevices] = useState([])
  const [stats, setStats] = useState(null)
  const [series, setSeries] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [refreshKey, setRefreshKey] = useState(0)

  const load = useCallback(async () => {
    setError('')
    try {
      // All three at once rather than one after another.
      const [deviceData, statsData, seriesData] = await Promise.all([
        fetchDevices(),
        fetchStats(),
        fetchTimeseries(24),
      ])
      setDevices(deviceData.devices)
      setStats(statsData)
      setSeries(seriesData)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  // A live alert changes the numbers and the chart, so pull them again.
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
  const allOnline = stats && stats.devices_total > 0 && stats.devices_online === stats.devices_total
  const anyDown = stats && stats.devices_online < stats.devices_total

  return (
    <div className="page">
      <div className="page-head rise rise-1">
        <div>
          <div className="label">Surveillance console</div>
          <h1>Good to see you, {firstName}</h1>
          <p>
            {stats?.devices_total === 0
              ? 'No cameras are connected yet.'
              : allOnline
                ? 'All cameras reporting. System nominal.'
                : `${stats?.devices_online ?? 0} of ${stats?.devices_total ?? 0} cameras reporting.`}
          </p>
        </div>
        <Link to="/settings" className="btn btn-go">+ Add camera</Link>
      </div>

      {error && <div className="note note-bad">{error}</div>}

      {/* --- Readouts --- */}
      <div className="stats rise rise-2">
        <StatTile
          label="Cameras online"
          value={stats ? `${stats.devices_online}/${stats.devices_total}` : '—'}
          sub={anyDown ? 'attention needed' : 'all reporting'}
          tone={anyDown ? 'var(--warn)' : 'var(--ok)'}
          glow={allOnline}
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
              Add your first Raspberry Pi camera to start monitoring. You can set it
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
