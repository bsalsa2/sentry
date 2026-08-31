/**
 * The app shell: routing, and the single live-alert connection that every
 * page shares.
 */

import { useCallback, useState } from 'react'
import { Navigate, Route, Routes, useLocation } from 'react-router-dom'

import Navbar from './components/Navbar'
import Alerts from './pages/Alerts'
import Dashboard from './pages/Dashboard'
import DeviceDetail from './pages/DeviceDetail'
import Login from './pages/Login'
import Settings from './pages/Settings'
import Signup from './pages/Signup'
import { useAuth } from './services/AuthContext'
import { playAlertSound, showAlertNotification } from './services/notifications'
import { useLiveAlerts } from './services/useLiveAlerts'

/**
 * Wraps a page so only logged-in users can see it. Anyone else is sent to
 * the login page, remembering where they were trying to go.
 */
function RequireAuth({ children }) {
  const { user, loading } = useAuth()
  const location = useLocation()

  // Still checking the saved token - don't flash the login page.
  if (loading) return null

  if (!user) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />
  }

  return children
}

/** Redirects logged-in users away from the login/signup pages. */
function RedirectIfLoggedIn({ children }) {
  const { user, loading } = useAuth()
  if (loading) return null
  if (user) return <Navigate to="/" replace />
  return children
}

export default function App() {
  const { user } = useAuth()

  // The most recent live alert. Pages watch this to know when to refresh.
  const [liveAlert, setLiveAlert] = useState(null)

  const handleAlert = useCallback((alert) => {
    setLiveAlert(alert)
    showAlertNotification(alert)
    playAlertSound()
  }, [])

  // One shared connection for the whole app - not one per page. It opens as
  // soon as someone signs in, and closes again when they sign out.
  const { connected } = useLiveAlerts(user?.id, handleAlert)

  return (
    <>
      {/* The navbar only makes sense once you're signed in. */}
      {user && <Navbar liveConnected={connected} />}

      <Routes>
        <Route
          path="/login"
          element={<RedirectIfLoggedIn><Login /></RedirectIfLoggedIn>}
        />
        <Route
          path="/signup"
          element={<RedirectIfLoggedIn><Signup /></RedirectIfLoggedIn>}
        />

        <Route
          path="/"
          element={<RequireAuth><Dashboard liveAlert={liveAlert} /></RequireAuth>}
        />
        <Route
          path="/alerts"
          element={<RequireAuth><Alerts liveAlert={liveAlert} /></RequireAuth>}
        />
        <Route
          path="/devices/:id"
          element={<RequireAuth><DeviceDetail liveAlert={liveAlert} /></RequireAuth>}
        />
        <Route
          path="/settings"
          element={<RequireAuth><Settings /></RequireAuth>}
        />

        {/* Anything else goes back to the dashboard. */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </>
  )
}
