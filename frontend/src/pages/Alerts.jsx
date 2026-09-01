/** Full detection history, with filtering. */

import { useEffect, useState } from 'react'

import AlertHistory from '../components/AlertHistory'
import { ShieldIcon } from '../components/icons'
import { fetchDevices, fetchStats } from '../services/api'

export default function Alerts({ liveAlert }) {
  const [devices, setDevices] = useState([])
  const [stats, setStats] = useState(null)
  const [refreshKey, setRefreshKey] = useState(0)

  // Needed to fill the "Camera" filter dropdown.
  useEffect(() => {
    fetchDevices()
      .then((data) => setDevices(data.devices))
      .catch(() => setDevices([]))
  }, [])

  useEffect(() => {
    fetchStats().then(setStats).catch(() => {})
  }, [refreshKey])

  useEffect(() => {
    if (liveAlert) setRefreshKey((key) => key + 1)
  }, [liveAlert])

  return (
    <div className="page">
      <div className="page-head rise rise-1">
        <ShieldIcon className="page-mark" aria-hidden="true" />
        <div>
          <div className="label">Event log</div>
          <h1>Detection history</h1>
          <p>Every detection from every camera, filterable.</p>
        </div>

        {stats && (
          <div className="hero-time">
            <div className="hero-time-n tabular">{stats.alerts_24h}</div>
            <div className="hero-time-sub">Logged in 24h</div>
          </div>
        )}
      </div>

      <div className="rise rise-2">
        <AlertHistory
          devices={devices}
          limit={25}
          refreshKey={refreshKey}
          emptyHint="Nothing matches these filters. Try widening the date range or resetting them."
        />
      </div>
    </div>
  )
}
