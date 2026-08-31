/**
 * Main dashboard: quick stats, all your cameras, and the latest alerts.
 */

import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'

import AlertHistory from '../components/AlertHistory'
import DeviceCard from '../components/DeviceCard'
import { fetchDevices, fetchStats } from '../services/api'
import { useAuth } from '../services/AuthContext'

export default function Dashboard({ liveAlert }) {
  const { user } = useAuth()

  const [devices, setDevices] = useState([])
  const [stats, setStats] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  // Bumping this makes the alert list below reload.
  const [refreshKey, setRefreshKey] = useState(0)

  const load = useCallback(async () => {
    setError('')
    try {
      // Ask for both at once rather than waiting for one then the other.
      const [deviceData, statsData] = await Promise.all([fetchDevices(), fetchStats()])
      setDevices(deviceData.devices)
      setStats(statsData)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  // When a live alert arrives, refresh the numbers and the list.
  useEffect(() => {
    if (!liveAlert) return
    load()
    setRefreshKey((key) => key + 1)
  }, [liveAlert, load])

  // Devices go offline quietly - re-check every 30 seconds so the status
  // pills don't go stale while the page is open.
  useEffect(() => {
    const timer = setInterval(load, 30000)
    return () => clearInterval(timer)
  }, [load])

  const firstName = user?.name?.split(' ')[0] || 'there'

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1>Welcome back, {firstName}</h1>
          <p>Here's what your cameras have seen.</p>
        </div>
        <Link to="/settings" className="btn btn-primary">Add camera</Link>
      </div>

      {error && <div className="message error">{error}</div>}

      {/* --- Quick stats --- */}
      <div className="stat-grid">
        <div className="stat">
          <div className="stat-label">Cameras online</div>
          <div className="stat-value accent">
            {stats ? `${stats.devices_online}/${stats.devices_total}` : '-'}
          </div>
        </div>
        <div className="stat">
          <div className="stat-label">Alerts (24h)</div>
          <div className="stat-value">{stats ? stats.alerts_24h : '-'}</div>
        </div>
        <div className="stat">
          <div className="stat-label">Unread</div>
          <div className={`stat-value${stats?.alerts_unacknowledged ? ' danger' : ''}`}>
            {stats ? stats.alerts_unacknowledged : '-'}
          </div>
        </div>
        <div className="stat">
          <div className="stat-label">People (24h)</div>
          <div className="stat-value">{stats ? stats.by_type_24h.person : '-'}</div>
        </div>
      </div>

      {/* --- Cameras --- */}
      <div className="section">
        <div className="section-title">
          <h2>Your cameras</h2>
          {devices.length > 0 && (
            <Link to="/settings" className="small">Manage</Link>
          )}
        </div>

        {loading ? (
          <div className="device-grid">
            <div className="skeleton" style={{ height: 220 }} />
            <div className="skeleton" style={{ height: 220 }} />
          </div>
        ) : devices.length === 0 ? (
          <div className="empty">
            <h3>No cameras yet</h3>
            <p>
              Add your first Raspberry Pi camera to start monitoring.
              You can add it before the hardware arrives.
            </p>
            <Link to="/settings" className="btn btn-primary">Add your first camera</Link>
          </div>
        ) : (
          <div className="device-grid">
            {devices.map((device) => (
              <DeviceCard key={device.id} device={device} />
            ))}
          </div>
        )}
      </div>

      {/* --- Recent alerts --- */}
      <div className="section">
        <div className="section-title">
          <h2>Recent alerts</h2>
          <Link to="/alerts" className="small">View all</Link>
        </div>
        <AlertHistory showFilters={false} limit={8} refreshKey={refreshKey} />
      </div>
    </div>
  )
}
