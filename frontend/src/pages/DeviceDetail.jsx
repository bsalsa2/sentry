/**
 * One camera: live feed, its settings, and its own alert history.
 */

import { useCallback, useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'

import AlertHistory from '../components/AlertHistory'
import CameraFeed from '../components/CameraFeed'
import { deleteDevice, fetchDevice, updateDevice } from '../services/api'
import { timeAgo } from '../utils/format'

export default function DeviceDetail({ liveAlert }) {
  const { id } = useParams()
  const navigate = useNavigate()

  const [device, setDevice] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [saved, setSaved] = useState('')
  const [refreshKey, setRefreshKey] = useState(0)

  // Local copy of the settings form, so typing doesn't fight with the server.
  const [form, setForm] = useState({ name: '', location: '', ip_address: '', sensitivity: 60 })

  const load = useCallback(async () => {
    try {
      const data = await fetchDevice(id)
      setDevice(data.device)
      setForm({
        name: data.device.name,
        location: data.device.location,
        ip_address: data.device.ip_address,
        sensitivity: data.device.sensitivity,
      })
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [id])

  useEffect(() => {
    load()
  }, [load])

  // Keep the online/offline pill fresh while the page is open.
  useEffect(() => {
    const timer = setInterval(load, 30000)
    return () => clearInterval(timer)
  }, [load])

  // If an alert arrives for *this* camera, reload its list.
  useEffect(() => {
    if (liveAlert && String(liveAlert.device_id) === String(id)) {
      setRefreshKey((key) => key + 1)
    }
  }, [liveAlert, id])

  async function handleSave(event) {
    event.preventDefault()
    setError('')
    setSaved('')
    try {
      const data = await updateDevice(id, form)
      setDevice(data.device)
      setSaved('Settings saved.')
      // Hide the confirmation after a few seconds.
      setTimeout(() => setSaved(''), 3000)
    } catch (err) {
      setError(err.message)
    }
  }

  async function handleToggleMute() {
    try {
      const data = await updateDevice(id, { enabled: !device.enabled })
      setDevice(data.device)
    } catch (err) {
      setError(err.message)
    }
  }

  async function handleDelete() {
    if (!window.confirm(`Delete "${device.name}"? Its alert history will be removed too.`)) {
      return
    }
    try {
      await deleteDevice(id)
      navigate('/')
    } catch (err) {
      setError(err.message)
    }
  }

  if (loading) {
    return <div className="page"><div className="skel" style={{ height: 260 }} /></div>
  }

  if (!device) {
    return (
      <div className="page">
        <div className="note note-bad">{error || 'Camera not found.'}</div>
      </div>
    )
  }

  const statusLabel = !device.enabled ? 'muted' : device.status

  return (
    <div className="page">
      <div className="page-head rise rise-1">
        <div>
          <div className="label">Camera</div>
          <h1>{device.name}</h1>
          <p>
            {device.location ? `${device.location} - ` : ''}
            {device.ip_address} - last seen {timeAgo(device.last_seen)}
          </p>
        </div>
        <div className="row">
          <span className={`pill ${statusLabel}`}>{statusLabel}</span>
          <button type="button" className="btn btn-sm" onClick={handleToggleMute}>
            {device.enabled ? 'Mute alerts' : 'Unmute'}
          </button>
        </div>
      </div>

      {error && <div className="note note-bad">{error}</div>}
      {saved && <div className="note note-good">{saved}</div>}

      {/* --- Live feed --- */}
      <div className="panel brackets" style={{ padding: 0, overflow: 'hidden' }}>
        <CameraFeed device={device} />
      </div>

      {/* --- Settings --- */}
      <div className="section rise rise-2">
        <h2>Camera settings</h2>
        <form className="panel panel-pad brackets" onSubmit={handleSave}>
          <div className="field">
            <label htmlFor="name">Name</label>
            <input id="name" type="text" value={form.name}
                   onChange={(e) => setForm({ ...form, name: e.target.value })} required />
          </div>

          <div className="field">
            <label htmlFor="location">Location</label>
            <input id="location" type="text" value={form.location}
                   placeholder="e.g. Front porch"
                   onChange={(e) => setForm({ ...form, location: e.target.value })} />
          </div>

          <div className="field">
            <label htmlFor="ip">IP address</label>
            <input id="ip" type="text" value={form.ip_address}
                   onChange={(e) => setForm({ ...form, ip_address: e.target.value })} required />
            <span className="hint">
              The Raspberry Pi's address on your home network, e.g. 192.168.1.100
            </span>
          </div>

          <div className="field">
            <label htmlFor="sensitivity">
              Detection sensitivity: <span className="tabular">{form.sensitivity}</span>
            </label>
            <input
              id="sensitivity"
              type="range"
              min="1"
              max="100"
              value={form.sensitivity}
              style={{ '--pct': `${form.sensitivity}%` }}
              onChange={(e) => setForm({ ...form, sensitivity: Number(e.target.value) })}
            />
            <span className="hint">
              Lower = only very confident detections (fewer false alarms).
              Higher = report almost everything.
            </span>
          </div>

          <div className="row">
            <button type="submit" className="btn btn-go">Save changes</button>
            <span className="grow" />
            <button type="button" className="btn btn-bad" onClick={handleDelete}>
              Delete camera
            </button>
          </div>
        </form>
      </div>

      {/* --- This camera's alerts --- */}
      <div className="section rise rise-2">
        <h2>Alerts from this camera</h2>
        <AlertHistory
          deviceId={device.id}
          showFilters={false}
          limit={20}
          refreshKey={refreshKey}
        />
      </div>
    </div>
  )
}
