/**
 * The alert feed, with optional filters.
 *
 * Used in three places: the dashboard (compact), a camera's own page (locked
 * to that camera), and the Alerts page (full filters and paging).
 */

import { useCallback, useEffect, useState } from 'react'

import { acknowledgeAlert, fetchAlerts } from '../services/api'
import { DETECTION_TYPES, detection } from '../utils/detections'
import { clockTime, confidencePercent, fullTime } from '../utils/format'
import { iconFor } from './icons'

/** One row. `fresh` plays the arrival flash for alerts that just came in live. */
export function AlertRow({ alert, fresh, onAcknowledge, showDate }) {
  const meta = detection(alert.detection_type)
  const Icon = iconFor(alert.detection_type)
  const confidence = Math.round((alert.confidence || 0) * 100)

  return (
    <div
      className={['alert', fresh ? 'fresh' : '', alert.acknowledged ? '' : 'unread'].join(' ').trim()}
      style={{ '--tone': meta.color }}
    >
      <div className="alert-ico">
        <Icon />
      </div>

      <div className="alert-main">
        <div className="alert-what">{meta.label} detected</div>
        <div className="alert-where">
          {alert.device_name || 'Unknown camera'}
          {alert.note ? ` · ${alert.note}` : ''}
        </div>
      </div>

      <div className="alert-side">
        <div className="alert-when" title={fullTime(alert.timestamp)}>
          {showDate ? fullTime(alert.timestamp) : clockTime(alert.timestamp)}
        </div>

        {/* Confidence as a small gauge — the number alone is easy to skim past. */}
        <div className="conf" title={`${confidence}% confident`}>
          <span className="conf-n">{confidencePercent(alert.confidence)}</span>
          <span className="conf-bar">
            <span className="conf-fill" style={{ width: `${confidence}%` }} />
          </span>
        </div>

        {!alert.acknowledged && onAcknowledge && (
          <button
            type="button"
            className="btn btn-sm"
            style={{ marginTop: '0.2rem' }}
            onClick={() => onAcknowledge(alert.id)}
          >
            Ack
          </button>
        )}
      </div>
    </div>
  )
}

export default function AlertHistory({
  devices = [],
  deviceId = null,
  showFilters = true,
  limit = 25,
  // Bump from the parent to force a reload (e.g. a live alert arrived).
  refreshKey = 0,
  emptyHint,
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
    // Update the screen first, then tell the server; reload if it disagrees.
    setAlerts((current) => current.map((a) => (a.id === id ? { ...a, acknowledged: true } : a)))
    try {
      await acknowledgeAlert(id)
    } catch {
      load(0, false)
    }
  }

  const setFilter = (key, value) => setFilters((current) => ({ ...current, [key]: value }))
  const hasMore = alerts.length < total

  return (
    <div>
      {showFilters && (
        <div className="filters">
          <div className="field" style={{ margin: 0 }}>
            <label htmlFor="f-device">Camera</label>
            <select id="f-device" value={filters.device_id} onChange={(e) => setFilter('device_id', e.target.value)}>
              <option value="">All cameras</option>
              {devices.map((device) => (
                <option key={device.id} value={device.id}>{device.name}</option>
              ))}
            </select>
          </div>

          <div className="field" style={{ margin: 0 }}>
            <label htmlFor="f-type">Detection</label>
            <select id="f-type" value={filters.type} onChange={(e) => setFilter('type', e.target.value)}>
              <option value="">All types</option>
              {DETECTION_TYPES.map((type) => (
                <option key={type} value={type}>{detection(type).label}</option>
              ))}
            </select>
          </div>

          <div className="field" style={{ margin: 0 }}>
            <label htmlFor="f-since">From</label>
            <input id="f-since" type="date" value={filters.since} onChange={(e) => setFilter('since', e.target.value)} />
          </div>

          <div className="field" style={{ margin: 0 }}>
            <label htmlFor="f-read">Show</label>
            <select id="f-read" value={filters.unacknowledged} onChange={(e) => setFilter('unacknowledged', e.target.value)}>
              <option value="">Everything</option>
              <option value="1">Unread only</option>
            </select>
          </div>

          <button
            type="button"
            className="btn"
            onClick={() => setFilters({ device_id: deviceId || '', type: '', since: '', unacknowledged: '' })}
          >
            Reset
          </button>
        </div>
      )}

      {error && <div className="note note-bad">{error}</div>}

      {loading && alerts.length === 0 ? (
        <div className="feed">
          <div className="skel" />
          <div className="skel" style={{ opacity: 0.7 }} />
          <div className="skel" style={{ opacity: 0.4 }} />
        </div>
      ) : alerts.length === 0 ? (
        <div className="empty">
          <h3>Nothing detected</h3>
          <p>{emptyHint || 'When a camera sees something, it appears here the moment it happens.'}</p>
        </div>
      ) : (
        <>
          <div className="feed">
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
            <div className="row" style={{ marginTop: '0.9rem' }}>
              <span className="dim sm grow" style={{ fontFamily: 'var(--mono)' }}>
                {alerts.length} of {total}
              </span>
              <button type="button" className="btn" disabled={loading} onClick={() => load(offset + limit, true)}>
                {loading ? 'Loading' : 'Load more'}
              </button>
            </div>
          )}
        </>
      )}
    </div>
  )
}
