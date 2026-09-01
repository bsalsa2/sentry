/**
 * Time and number formatting, shared by several components.
 * Detection labels and colours live in detections.js.
 */

/**
 * Turn a timestamp into something human, e.g. "3 min ago".
 * The backend always sends UTC, and the browser converts to local time.
 */
export function timeAgo(isoString) {
  if (!isoString) return 'never'

  const then = new Date(isoString)
  const seconds = Math.floor((Date.now() - then.getTime()) / 1000)

  if (seconds < 5) return 'just now'
  if (seconds < 60) return `${seconds}s ago`

  const minutes = Math.floor(seconds / 60)
  if (minutes < 60) return `${minutes} min ago`

  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}h ago`

  const days = Math.floor(hours / 24)
  if (days < 7) return `${days}d ago`

  return then.toLocaleDateString()
}

/** "2:47 PM" - the local time an alert happened. */
export function clockTime(isoString) {
  if (!isoString) return ''
  return new Date(isoString).toLocaleTimeString([], {
    hour: 'numeric',
    minute: '2-digit',
  })
}

/** "31 Aug, 2:47 PM" - used when the date matters, not just the time. */
export function fullTime(isoString) {
  if (!isoString) return ''
  return new Date(isoString).toLocaleString([], {
    day: 'numeric',
    month: 'short',
    hour: 'numeric',
    minute: '2-digit',
  })
}

/** 0.912 -> "91%" */
export const confidencePercent = (value) => `${Math.round((value || 0) * 100)}%`

/** "14:07" — 24-hour, which is what a monitoring log wants. */
export function hourLabel(isoString) {
  if (!isoString) return ''
  return new Date(isoString).toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  })
}
