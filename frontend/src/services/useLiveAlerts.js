/**
 * Listens for live alerts from the backend.
 *
 * The backend keeps an HTTP connection open and pushes a message down it every
 * time a camera detects something (Server-Sent Events). The browser's built-in
 * EventSource handles reconnecting for us if the WiFi drops.
 *
 * Usage:
 *   const { connected, latest } = useLiveAlerts(userId, (alert) => { ... })
 *
 * Pass the logged-in user's id: when it changes (sign in, sign out, switch
 * account) we tear the old connection down and open a fresh one.
 */

import { useEffect, useRef, useState } from 'react'

import { alertStreamUrl } from './api'
import { isLoggedIn } from './auth'

export function useLiveAlerts(userId, onAlert) {
  const [connected, setConnected] = useState(false)
  const [latest, setLatest] = useState(null)

  // Keep the callback in a ref so changing it doesn't tear down and rebuild
  // the connection on every render.
  const handlerRef = useRef(onAlert)
  useEffect(() => {
    handlerRef.current = onAlert
  }, [onAlert])

  useEffect(() => {
    // No user signed in yet - nothing to listen to.
    if (!userId || !isLoggedIn()) {
      setConnected(false)
      return undefined
    }

    const source = new EventSource(alertStreamUrl())

    source.addEventListener('connected', () => setConnected(true))

    source.addEventListener('alert', (event) => {
      let alert
      try {
        alert = JSON.parse(event.data)
      } catch {
        return // ignore anything we can't read
      }
      setLatest(alert)
      handlerRef.current?.(alert)
    })

    source.onerror = () => {
      // EventSource retries automatically; we just grey out the "Live" dot.
      setConnected(false)
    }

    // Close the connection when the component goes away, or React will leak
    // one open connection per page visit.
    return () => {
      setConnected(false)
      source.close()
    }
  }, [userId])

  return { connected, latest }
}
