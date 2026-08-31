/**
 * Browser notifications and the alert sound.
 *
 * Browsers only allow these after the user has given permission, and the
 * permission prompt only works if it was triggered by a click - which is why
 * requestNotificationPermission() is called from a button, not on page load.
 */

const SOUND_KEY = 'sentry.soundEnabled'

/** Ask the browser for permission to show notifications. */
export async function requestNotificationPermission() {
  if (!('Notification' in window)) return 'unsupported'
  if (Notification.permission === 'granted') return 'granted'
  try {
    return await Notification.requestPermission()
  } catch {
    return 'denied'
  }
}

export function notificationPermission() {
  if (!('Notification' in window)) return 'unsupported'
  return Notification.permission
}

const LABELS = {
  motion: 'Motion detected',
  person: 'Person detected',
  vehicle: 'Vehicle detected',
  package: 'Package detected',
  animal: 'Animal detected',
}

/** Pop up a desktop/phone notification for one alert. */
export function showAlertNotification(alert) {
  if (!('Notification' in window) || Notification.permission !== 'granted') return

  const title = LABELS[alert.detection_type] || 'Detection'
  const confidence = Math.round((alert.confidence || 0) * 100)

  try {
    new Notification(`Sentry: ${title}`, {
      body: `${alert.device_name || 'Camera'} - ${confidence}% confident`,
      icon: '/favicon.svg',
      // Alerts from the same camera replace each other instead of stacking
      // up into a wall of notifications.
      tag: `sentry-${alert.device_id}`,
    })
  } catch {
    /* some browsers block this on mobile - not worth crashing over */
  }
}

// --- Alert sound ----------------------------------------------------------

export function soundEnabled() {
  try {
    return localStorage.getItem(SOUND_KEY) === '1'
  } catch {
    return false
  }
}

export function setSoundEnabled(enabled) {
  try {
    localStorage.setItem(SOUND_KEY, enabled ? '1' : '0')
  } catch {
    /* ignore */
  }
}

/**
 * Play a short two-tone beep.
 *
 * We generate it with the Web Audio API rather than shipping an MP3, so there
 * is no extra file to download and nothing to go missing.
 */
export function playAlertSound() {
  if (!soundEnabled()) return

  try {
    const AudioContextClass = window.AudioContext || window.webkitAudioContext
    if (!AudioContextClass) return

    const context = new AudioContextClass()
    const now = context.currentTime

    // Two quick beeps: 880Hz then 1175Hz.
    ;[
      [880, 0],
      [1175, 0.18],
    ].forEach(([frequency, offset]) => {
      const oscillator = context.createOscillator()
      const gain = context.createGain()

      oscillator.type = 'sine'
      oscillator.frequency.value = frequency

      // Fade in and out so it doesn't click.
      gain.gain.setValueAtTime(0.0001, now + offset)
      gain.gain.exponentialRampToValueAtTime(0.25, now + offset + 0.02)
      gain.gain.exponentialRampToValueAtTime(0.0001, now + offset + 0.15)

      oscillator.connect(gain).connect(context.destination)
      oscillator.start(now + offset)
      oscillator.stop(now + offset + 0.16)
    })

    // Free the audio hardware once we're done.
    setTimeout(() => context.close().catch(() => {}), 600)
  } catch {
    /* audio is a nice-to-have, never break the app for it */
  }
}
