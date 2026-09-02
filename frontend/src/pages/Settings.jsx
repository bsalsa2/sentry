/**
 * Settings: your profile, adding cameras, notification preferences.
 */

import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'

import { ShieldIcon } from '../components/icons'
import { createDevice, fetchDevices, rotateDeviceKey } from '../services/api'
import { useAuth } from '../services/AuthContext'
import {
  notificationPermission,
  playAlertSound,
  requestNotificationPermission,
  setSoundEnabled,
  soundEnabled,
} from '../services/notifications'
import { timeAgo } from '../utils/format'

export default function Settings() {
  const { user } = useAuth()

  const [devices, setDevices] = useState([])
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  // After adding a camera we show its API key ONCE - it isn't retrievable later.
  const [newKey, setNewKey] = useState(null)

  const [form, setForm] = useState({ name: '', location: '', ip_address: '', sensitivity: 60 })

  const [permission, setPermission] = useState(notificationPermission())
  const [sound, setSound] = useState(soundEnabled())

  async function loadDevices() {
    try {
      const data = await fetchDevices()
      setDevices(data.devices)
    } catch (err) {
      setError(err.message)
    }
  }

  useEffect(() => {
    loadDevices()
  }, [])

  async function handleAddDevice(event) {
    event.preventDefault()
    setError('')
    setNewKey(null)
    setBusy(true)

    try {
      const data = await createDevice(form)
      setNewKey({
        device: data.device,
        message: data.message,
        reachable: data.reachable,
      })
      setForm({ name: '', location: '', ip_address: '', sensitivity: 60 })
      loadDevices()
    } catch (err) {
      setError(err.message)
    } finally {
      setBusy(false)
    }
  }

  async function handleRotate(deviceId, deviceName) {
    if (!window.confirm(
      `Issue a new key for "${deviceName}"? You'll need to update the Outpost with the new key.`,
    )) return

    try {
      const data = await rotateDeviceKey(deviceId)
      setNewKey({ device: data.device, message: 'New key issued. Update the Outpost with it.' })
    } catch (err) {
      setError(err.message)
    }
  }

  async function handleEnableNotifications() {
    const result = await requestNotificationPermission()
    setPermission(result)
  }

  function handleToggleSound() {
    const next = !sound
    setSound(next)
    setSoundEnabled(next)
    if (next) playAlertSound()  // let them hear what it sounds like
  }

  return (
    <div className="page">
      <div className="page-head rise rise-1">
        <ShieldIcon className="page-mark" aria-hidden="true" />
        <div>
          <div className="label">Configuration</div>
          <h1>Settings</h1>
          <p>Your account, cameras and alert preferences.</p>
        </div>
      </div>

      {error && <div className="note note-bad">{error}</div>}

      {/* --- Profile --- */}
      <div className="section rise rise-2">
        <h2>Account</h2>
        <div className="panel panel-pad">
          <div className="row">
            <div>
              <div className="label">Name</div>
              <div>{user?.name}</div>
            </div>
            <span className="grow" />
            <div>
              <div className="label">Email</div>
              <div>{user?.email}</div>
            </div>
          </div>
        </div>
      </div>

      {/* --- Notifications --- */}
      <div className="section rise rise-2">
        <h2>Alerts</h2>
        <div className="panel panel-pad">
          <div className="row">
            <div style={{ flex: 1, minWidth: '200px' }}>
              <strong>Browser notifications</strong>
              <div className="label">
                {permission === 'granted'
                  ? 'On - you\'ll get a popup when something is detected.'
                  : permission === 'denied'
                    ? 'Blocked. Re-enable them in your browser\'s site settings.'
                    : permission === 'unsupported'
                      ? 'This browser doesn\'t support notifications.'
                      : 'Get a popup even when this tab is in the background.'}
              </div>
            </div>
            <button
              type="button"
              className="btn"
              onClick={handleEnableNotifications}
              disabled={permission === 'granted' || permission === 'unsupported'}
            >
              {permission === 'granted' ? 'Enabled' : 'Enable'}
            </button>
          </div>

          <div className="rule" />

          <div className="row">
            <div style={{ flex: 1, minWidth: '200px' }}>
              <strong>Alert sound</strong>
              <div className="label">Play a short beep when an alert arrives.</div>
            </div>
            <button type="button" className="btn" onClick={handleToggleSound}>
              {sound ? 'On' : 'Off'}
            </button>
          </div>
        </div>
      </div>

      {/* --- Add a camera --- */}
      <div className="section rise rise-2">
        <h2>Add a camera</h2>

        {newKey && (
          <div className="note note-good rise rise-1">
            <strong>{newKey.message}</strong>
            <p style={{ margin: '0.5rem 0 0.35rem' }}>
              Copy this device key into the Outpost's setup - it is only shown now:
            </p>
            <div className="key">{newKey.device.api_key}</div>
            <p className="hint" style={{ margin: '0.5rem 0 0' }}>
              On the Outpost, run:{' '}
              <span className="key" style={{ display: 'inline-block', padding: '0.15rem 0.35rem' }}>
                python outpost_agent.py --key {newKey.device.api_key.slice(0, 8)}...
              </span>
            </p>
          </div>
        )}

        <form className="panel panel-pad" onSubmit={handleAddDevice}>
          <div className="field">
            <label htmlFor="device-name">Camera name</label>
            <input id="device-name" type="text" value={form.name} placeholder="Front Door"
                   onChange={(e) => setForm({ ...form, name: e.target.value })} required />
          </div>

          <div className="field">
            <label htmlFor="device-location">Location (optional)</label>
            <input id="device-location" type="text" value={form.location} placeholder="Porch"
                   onChange={(e) => setForm({ ...form, location: e.target.value })} />
          </div>

          <div className="field">
            <label htmlFor="device-ip">IP address</label>
            <input id="device-ip" type="text" value={form.ip_address} placeholder="192.168.1.100"
                   onChange={(e) => setForm({ ...form, ip_address: e.target.value })} required />
            <span className="hint">
              Find this on the Outpost by running <code>hostname -I</code>. You can add
              the camera now and plug the Outpost in later.
            </span>
          </div>

          <div className="field">
            <label htmlFor="device-sensitivity">
              Sensitivity: <span className="tabular">{form.sensitivity}</span>
            </label>
            {/* --pct tells the CSS where the green fill stops. */}
            <input id="device-sensitivity" type="range" min="1" max="100" value={form.sensitivity}
                   style={{ '--pct': `${form.sensitivity}%` }}
                   onChange={(e) => setForm({ ...form, sensitivity: Number(e.target.value) })} />
          </div>

          <button type="submit" className="btn btn-go" disabled={busy}>
            {busy ? 'Adding...' : 'Add camera'}
          </button>
        </form>
      </div>

      {/* --- Existing cameras --- */}
      <div className="section rise rise-2">
        <h2>Your cameras ({devices.length})</h2>

        {devices.length === 0 ? (
          <div className="empty">
            <p>No cameras added yet.</p>
          </div>
        ) : (
          <div className="feed">
            {devices.map((device) => (
              <div className="alert" key={device.id}>
                <div className="alert-main">
                  <div className="alert-what">
                    <Link to={`/devices/${device.id}`}>{device.name}</Link>
                  </div>
                  <div className="alert-where">
                    {device.ip_address}
                    {device.location ? ` - ${device.location}` : ''}
                    {' - '}last seen {timeAgo(device.last_seen)}
                  </div>
                </div>
                <div className="row">
                  <span className={`pill ${device.enabled ? device.status : 'muted'}`}>
                    {device.enabled ? device.status : 'muted'}
                  </span>
                  <button
                    type="button"
                    className="btn btn-sm"
                    onClick={() => handleRotate(device.id, device.name)}
                  >
                    New key
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
