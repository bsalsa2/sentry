/** One camera in the dashboard grid. Tapping it opens that camera's page. */

import { Link } from 'react-router-dom'

import CameraFeed from './CameraFeed'
import { timeAgo } from '../utils/format'

export default function DeviceCard({ device }) {
  // A muted camera is still online, it just isn't recording alerts.
  const statusLabel = !device.enabled ? 'muted' : device.status

  return (
    <Link to={`/devices/${device.id}`} className="card card-hover device-card">
      {/* expandable={false}: tapping the card should open the device page,
          not the fullscreen viewer. */}
      <CameraFeed device={device} expandable={false} />

      <div className="device-card-body">
        <div className="device-card-head">
          <div>
            <div className="device-card-name">{device.name}</div>
            <div className="device-card-meta">
              {device.location || device.ip_address}
            </div>
          </div>
          <span className={`pill ${statusLabel}`}>{statusLabel}</span>
        </div>

        <div className="device-card-footer">
          <span>
            {device.alerts_24h > 0
              ? `${device.alerts_24h} alert${device.alerts_24h === 1 ? '' : 's'} in 24h`
              : 'No alerts in 24h'}
          </span>
          <span className="muted">
            {device.last_seen ? timeAgo(device.last_seen) : 'never seen'}
          </span>
        </div>
      </div>
    </Link>
  )
}
