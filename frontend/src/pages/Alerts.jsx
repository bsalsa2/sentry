/** Full alert history, with filtering. */

import { useEffect, useState } from 'react'

import AlertHistory from '../components/AlertHistory'
import { fetchDevices } from '../services/api'

export default function Alerts({ liveAlert }) {
  const [devices, setDevices] = useState([])
  const [refreshKey, setRefreshKey] = useState(0)

  // We need the device list to populate the "Camera" filter dropdown.
  useEffect(() => {
    fetchDevices()
      .then((data) => setDevices(data.devices))
      .catch(() => setDevices([]))
  }, [])

  // Refresh the list whenever a new alert arrives live.
  useEffect(() => {
    if (liveAlert) setRefreshKey((key) => key + 1)
  }, [liveAlert])

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1>Alert history</h1>
          <p>Every detection from all of your cameras.</p>
        </div>
      </div>

      <AlertHistory devices={devices} limit={25} refreshKey={refreshKey} />
    </div>
  )
}
