/**
 * Scrollable alert list with filters.
 *
 * Used in two places:
 *   - the Alerts page (filters shown, paged)
 *   - the Dashboard and Device pages (compact, no filters)
 */

import { useCallback, useEffect, useState } from 'react'

import { acknowledgeAlert, fetchAlerts } from '../services/api'
import { clockTime, confidencePercent, detectionLabel, fullTime } from '../utils/format'
import { DETECTION_ICONS, BellIcon } from './icons'

const DETECTION_TYPES = ['motion', 'person', 'vehicle', 'package', 'animal']

/** One row in the list. */
export function AlertRow({ alert, isNew, onAcknowledge, showDate }) {
  const Icon = DETECTION_ICONS[alert.detection_type] || BellIcon

  return (
    <div
      className={[
        'alert-row',
        isNew ? 'is-new' : '',
        alert.acknowledged ? '' : 'unread',
      ].join(' ').trim()}
    >
      <div className={`alert-icon type-${alert.detection_type}`}>
        <Icon />
      </div>

      <div className="alert-body">
        <div className="alert-title">
          {detectionLabel(alert.detection_type)} detected
        </div>
        <div className="alert-meta">
          {alert.device_name || 'Unknown camera'}
          {alert.note ? ` - ${alert.note}` : ''}
        </div>
      </div>

      <div className="alert-side">
        <div className="alert-time" title={fullTime(alert.timestamp)}>
          {showDate ? fullTime(alert.timestamp) : clockTime(alert.timestamp)}
        </div>
        <div className="confidence">{confidencePercent(alert.confidence)} sure</div>
        {!alert.acknowledged && onAcknowledge && (
          <button
            type="button"
            className="btn btn-sm"
            style={{ marginTop: '0.35rem' }}
            onClick={() => onAcknowledge(alert.id)}
          >
            Mark seen
          </button>
        )}
      </div>
    </div>
  )
}

export default function AlertHistory({
  devices = [],
  deviceId = null,     // lock the list to one camera
  showFilters = true,
  limit = 25,
  // Bump this number from the parent to force a refresh (e.g. when a live
  // alert arrives).
  refreshKey = 0,
}) {
  const [alerts, setAlerts] = useState([])
  const [total, setTotal] = useState(0)
  const [offset, setOffset] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const [filters, setFilters] = useState({
    device_id: deviceId || '',
    type: '',
    since: '',
    unacknowledged: '',
  })

  const load = useCallback(
    async (nextOffset = 0, append = false) => {
      setLoading(true)
      setError('')
      try {
        const data = await fetchAlerts({
          ...filters,
          device_id: deviceId || filters.device_id,
          limit,
          offset: nextOffset,
        })
        // "Load more" adds to the list; a filter change replaces it.
        setAlerts((current) => (append ? [...current, ...data.alerts] : data.alerts))
        setTotal(data.total)
        setOffset(nextOffset)
      } catch (err) {
        setError(err.message)
      } finally {
        setLoading(false)
      }
    },
    [filters, deviceId, limit],
  )

  useEffect(() => {
    load(0, false)
  }, [load, refreshKey])

  async function handleAcknowledge(id) {
    // Update the screen straight away, then tell the server. If the request
    // fails we reload to get the truth back.
    setAlerts((current) =>
      current.map((a) => (a.id === id ? { ...a, acknowledged: true } : a)),
    )
    try {
      await acknowledgeAlert(id)
    } catch {
      load(0, false)
    }
  }

  function updateFilter(key, value) {
    setFilters((current) => ({ ...current, [key]: value }))
  }

  const hasMore = alerts.length < total

  return (
    <div>
      {showFilters && (
        <div className="filters">
          <div className="field" style={{ margin: 0 }}>
            <label htmlFor="filter-device">Camera</label>
            <select
              id="filter-device"
              value={filters.device_id}
              onChange={(e) => updateFilter('device_id', e.target.value)}
            >
              <option value="">All cameras</option>
              {devices.map((device) => (
                <option key={device.id} value={device.id}>{device.name}</option>
              ))}
            </select>
          </div>

          <div className="field" style={{ margin: 0 }}>
            <label htmlFor="filter-type">Detection</label>
            <select
              id="filter-type"
              value={filters.type}
              onChange={(e) => updateFilter('type', e.target.value)}
            >
              <option value="">All types</option>
              {DETECTION_TYPES.map((type) => (
                <option key={type} value={type}>{detectionLabel(type)}</option>
              ))}
            </select>
          </div>

          <div className="field" style={{ margin: 0 }}>
            <label htmlFor="filter-since">From date</label>
            <input
              id="filter-since"
              type="date"
              value={filters.since}
              onChange={(e) => updateFilter('since', e.target.value)}
            />
          </div>

          <div className="field" style={{ margin: 0 }}>
            <label htmlFor="filter-unread">Show</label>
            <select
              id="filter-unread"
              value={filters.unacknowledged}
              onChange={(e) => updateFilter('unacknowledged', e.target.value)}
            >
              <option value="">Everything</option>
              <option value="1">Unread only</option>
            </select>
          </div>

          <button
            type="button"
            className="btn"
            onClick={() =>
              setFilters({ device_id: deviceId || '', type: '', since: '', unacknowledged: '' })
            }
          >
            Clear
          </button>
        </div>
      )}

      {error && <div className="message error">{error}</div>}

      {loading && alerts.length === 0 ? (
        <div className="alert-list">
          <div className="skeleton" />
          <div className="skeleton" />
          <div className="skeleton" />
        </div>
      ) : alerts.length === 0 ? (
        <div className="empty">
          <h3>No alerts yet</h3>
          <p>
            When a camera detects something, it will appear here instantly.
          </p>
        </div>
      ) : (
        <>
          <div className="alert-list">
            {alerts.map((alert) => (
              <AlertRow
                key={alert.id}
                alert={alert}
                onAcknowledge={handleAcknowledge}
                showDate={showFilters}
              />
            ))}
          </div>

          {hasMore && (
            <div className="row row-end" style={{ marginTop: '0.85rem' }}>
              <span className="muted small spacer">
                Showing {alerts.length} of {total}
              </span>
              <button
                type="button"
                className="btn"
                disabled={loading}
                onClick={() => load(offset + limit, true)}
              >
                {loading ? 'Loading...' : 'Load more'}
              </button>
            </div>
          )}
        </>
      )}
    </div>
  )
}
