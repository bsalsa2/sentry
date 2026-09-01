/**
 * Transient pop-ups for alerts arriving live.
 *
 * Before this, a detection that happened while you were looking at the screen
 * just quietly appeared somewhere in a list. A camera seeing a person is worth
 * interrupting for, so it gets a toast that slides in and then leaves on its
 * own — no dismissal required, and no permanent clutter either.
 */

import { useEffect } from 'react'

import { detection } from '../utils/detections'
import { hourLabel } from '../utils/format'
import { iconFor } from './icons'

const LIFETIME_MS = 6000

function Toast({ alert, onClose }) {
  const meta = detection(alert.detection_type)
  const Icon = iconFor(alert.detection_type)

  // Each toast removes itself. The timer is cleared on unmount so a toast
  // dismissed by hand doesn't fire a second removal later.
  useEffect(() => {
    const timer = setTimeout(() => onClose(alert._toastId), LIFETIME_MS)
    return () => clearTimeout(timer)
  }, [alert._toastId, onClose])

  return (
    <div className="toast" style={{ '--tone': meta.color }} role="status">
      <div className="alert-ico" style={{ '--tone': meta.color }}>
        <Icon />
      </div>

      <div style={{ minWidth: 0 }}>
        <div className="toast-what">{meta.label} detected</div>
        <div className="toast-where">
          {alert.device_name || 'Camera'} · {hourLabel(alert.timestamp)}
        </div>
      </div>

      <button
        type="button"
        className="toast-x"
        onClick={() => onClose(alert._toastId)}
        aria-label="Dismiss"
      >
        ×
      </button>
    </div>
  )
}

export default function Toasts({ toasts, onClose }) {
  if (toasts.length === 0) return null

  return (
    <div className="toasts" aria-live="polite">
      {toasts.map((alert) => (
        <Toast key={alert._toastId} alert={alert} onClose={onClose} />
      ))}
    </div>
  )
}
