/** One camera in the grid. Tapping it opens that camera's page. */

import { Link } from 'react-router-dom'

import CameraFeed from './CameraFeed'
import { timeAgo } from '../utils/format'

export default function DeviceCard({ device }) {
  // A muted camera is still online — it just isn't recording alerts.
  const status = !device.enabled ? 'muted' : device.status

  return (
    <Link to={`/devices/${device.id}`} className="panel panel-hover brackets device">
      {/* expandable={false}: tapping the tile should open the camera's page,
          not the fullscreen viewer. */}
      <CameraFeed device={device} expandable={false} />

      <div className="device-body">
        <div className="device-top">
          <div style={{ minWidth: 0 }}>
            <div className="device-name">{device.name}</div>
            <div className="device-where">{device.location || device.ip_address}</div>
          </div>
          <span className={`pill ${status}`}>{status}</span>
        </div>

        <div className="device-foot">
          <span>
            {device.alerts_24h > 0
              ? `${device.alerts_24h} in 24h`
              : 'clear'}
          </span>
          <span className="dim">{device.last_seen ? timeAgo(device.last_seen) : 'never seen'}</span>
        </div>
      </div>
    </Link>
  )
}
