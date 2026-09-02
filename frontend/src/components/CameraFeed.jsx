/**
 * Live camera view.
 *
 * The Outpost produces MJPEG - basically a JPEG image that keeps replacing itself.
 * Browsers can show that in a plain <img> tag, so there's no video player to
 * set up. If the camera isn't reachable the <img> fires onError and we swap in
 * a "no signal" placeholder instead.
 */

import { useEffect, useState } from 'react'

import { cameraStreamUrl } from '../services/api'
import { CameraIcon, ExpandIcon } from './icons'

function Placeholder({ device, connecting }) {
  // While we're still waiting to hear back from the camera, say so rather
  // than claiming there's no signal - we don't know that yet.
  if (connecting) {
    return (
      <div className="cam-blank">
        <CameraIcon />
        <div className="cam-blank-title">Connecting</div>
        <p className="cam-blank-note">
          Contacting {device?.name || 'the camera'}...
        </p>
      </div>
    )
  }

  return (
    <div className="cam-blank">
      <CameraIcon />
      <div className="cam-blank-title">No signal</div>
      <p className="cam-blank-note">
        {device?.enabled === false
          ? 'Alerts are muted for this camera.'
          : device?.status === 'online'
            ? 'The device is online but its camera stream is not responding.'
            : `Waiting for ${device?.name || 'the camera'} at ${device?.ip_address || 'its address'}. Start the Outpost agent to connect.`}
      </p>
    </div>
  )
}

/**
 * `fullscreen`/`onToggleFullscreen` let a parent drive the viewer from its
 * own controls (e.g. a "View" action elsewhere on the page). Omit both and
 * the component manages the state itself, as it always has.
 */
export default function CameraFeed({ device, expandable = true, fullscreen: fullscreenProp, onToggleFullscreen }) {
  const [failed, setFailed] = useState(false)
  const [loaded, setLoaded] = useState(false)
  const [clock, setClock] = useState(() => new Date())
  const [internalFullscreen, setInternalFullscreen] = useState(false)
  const controlled = fullscreenProp !== undefined
  const fullscreen = controlled ? fullscreenProp : internalFullscreen
  const setFullscreen = controlled ? onToggleFullscreen : setInternalFullscreen

  // A ticking timestamp overlay, like a real CCTV system.
  useEffect(() => {
    const timer = setInterval(() => setClock(new Date()), 1000)
    return () => clearInterval(timer)
  }, [])

  // If the device changes (or comes back online), try the stream again.
  useEffect(() => {
    setFailed(false)
    setLoaded(false)
  }, [device?.id, device?.status])

  // Let the Escape key close the fullscreen view.
  useEffect(() => {
    if (!fullscreen) return undefined
    const onKey = (event) => {
      if (event.key === 'Escape') setFullscreen(false)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [fullscreen])

  if (!device) return null

  const showStream = !failed && device.status === 'online' && device.enabled

  const view = (
    <div className="cam">
      {/* Always drawn, so there is never a blank black box while we wait to
          find out whether the camera answers. The video covers it once it
          starts arriving. */}
      <Placeholder device={device} connecting={showStream && !loaded} />

      {showStream && (
        <img
          // Adding the device id to the key forces the browser to restart the
          // stream rather than reusing a stale, dead connection.
          key={`stream-${device.id}`}
          className={`cam-video${loaded ? ' on' : ''}`}
          src={cameraStreamUrl(device.id)}
          alt={`Live view from ${device.name}`}
          onLoad={() => setLoaded(true)}
          onError={() => setFailed(true)}
        />
      )}

      <div className="cam-bar">
        <span>{device.name}{device.location ? ` - ${device.location}` : ''}</span>
        <span className="row" style={{ gap: '0.6rem' }}>
          {loaded && <span className="cam-rec">LIVE</span>}
          <span>{clock.toLocaleTimeString()}</span>
        </span>
      </div>

      {expandable && (
        <button
          type="button"
          className="cam-btn"
          onClick={() => setFullscreen((open) => !open)}
          aria-label={fullscreen ? 'Exit full screen' : 'View full screen'}
        >
          <ExpandIcon style={{ width: 14, height: 14 }} />
        </button>
      )}
    </div>
  )

  if (fullscreen) {
    return (
      <div
        className="cam-full"
        onClick={() => setFullscreen(false)}
        role="button"
        tabIndex={0}
        aria-label="Close full screen"
        onKeyDown={(event) => event.key === 'Enter' && setFullscreen(false)}
      >
        {view}
      </div>
    )
  }

  return view
}
