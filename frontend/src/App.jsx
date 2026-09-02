/**
 * The app shell: routing, and the single live-alert connection that every
 * page shares.
 */

import { Suspense, lazy, useCallback, useState } from 'react'
import { Navigate, Route, Routes, useLocation } from 'react-router-dom'

import Navbar from './components/Navbar'
import Toasts from './components/Toasts'
import Alerts from './pages/Alerts'
import Dashboard from './pages/Dashboard'
import DeviceDetail from './pages/DeviceDetail'
import ForgotPassword from './pages/ForgotPassword'
import Login from './pages/Login'
import ResetPassword from './pages/ResetPassword'
import Settings from './pages/Settings'
import Signup from './pages/Signup'
import { useAuth } from './services/AuthContext'
import { playAlertSound, showAlertNotification } from './services/notifications'
import { useLiveAlerts } from './services/useLiveAlerts'

// Lazy: GSAP is only ever needed on these public pages, so authenticated
// users signing in to check their cameras never pay for it. One chunk for
// all five - they share components and the reveal hook, so splitting them
// apart individually would just duplicate that shared code across chunks.
const LandingHome = lazy(() => import('./pages/landing/Home'))
const LandingAbout = lazy(() => import('./pages/landing/About'))
const LandingHowItWorks = lazy(() => import('./pages/landing/HowItWorks'))
const LandingPricing = lazy(() => import('./pages/landing/Pricing'))
const LandingPrivacy = lazy(() => import('./pages/landing/Privacy'))
const LandingTerms = lazy(() => import('./pages/landing/Terms'))

/** The routes that are always the public site, logged in or not - visiting
 * one shows that page's own header, never the authenticated app chrome. */
const MARKETING_ONLY_PATHS = ['/about', '/how-it-works', '/pricing', '/privacy', '/terms']

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

/**
 * The root route is two different pages depending on who's looking: the
 * console for a signed-in user, the public pitch for anyone else. Nobody
 * gets bounced to /login just for visiting the site.
 */
function Root({ liveAlert }) {
  const { user, loading } = useAuth()
  if (loading) return null
  if (!user) return <Suspense fallback={null}><LandingHome /></Suspense>
  return <Dashboard liveAlert={liveAlert} />
}

export default function App() {
  const { user } = useAuth()
  const location = useLocation()
  const onMarketingPage = MARKETING_ONLY_PATHS.includes(location.pathname)

  // The most recent live alert. Pages watch this to know when to refresh.
  const [liveAlert, setLiveAlert] = useState(null)

  // On-screen toasts. Kept separate from `liveAlert` because several can be
  // visible at once, and each needs its own identity to be removed later --
  // alert.id is not enough, since the same alert could in principle re-toast.
  const [toasts, setToasts] = useState([])

  const dismissToast = useCallback((toastId) => {
    setToasts((current) => current.filter((t) => t._toastId !== toastId))
  }, [])

  const handleAlert = useCallback((alert) => {
    setLiveAlert(alert)
    // Cap the stack: a camera misbehaving shouldn't bury the screen.
    setToasts((current) => [
      ...current.slice(-2),
      { ...alert, _toastId: `${alert.id}-${Date.now()}` },
    ])
    showAlertNotification(alert)
    playAlertSound()
  }, [])

  // One shared connection for the whole app - not one per page. It opens as
  // soon as someone signs in, and closes again when they sign out.
  const { connected } = useLiveAlerts(user?.id, handleAlert)

  return (
    <>
      {/* Navigation and toasts only make sense on the authenticated app -
          never on a marketing page, which brings its own header even for a
          signed-in visitor who wanders over to /about. */}
      {user && !onMarketingPage && <Navbar liveConnected={connected} />}
      {user && !onMarketingPage && <Toasts toasts={toasts} onClose={dismissToast} />}

      <Routes>
        {/* Old links to /welcome still work; the canonical URL is now "/". */}
        <Route path="/welcome" element={<Navigate to="/" replace />} />
        <Route
          path="/login"
          element={<RedirectIfLoggedIn><Login /></RedirectIfLoggedIn>}
        />
        <Route
          path="/signup"
          element={<RedirectIfLoggedIn><Signup /></RedirectIfLoggedIn>}
        />
        <Route
          path="/forgot-password"
          element={<RedirectIfLoggedIn><ForgotPassword /></RedirectIfLoggedIn>}
        />
        <Route path="/reset-password" element={<ResetPassword />} />
        <Route path="/about" element={<Suspense fallback={null}><LandingAbout /></Suspense>} />
        <Route path="/how-it-works" element={<Suspense fallback={null}><LandingHowItWorks /></Suspense>} />
        <Route path="/pricing" element={<Suspense fallback={null}><LandingPricing /></Suspense>} />
        <Route path="/privacy" element={<Suspense fallback={null}><LandingPrivacy /></Suspense>} />
        <Route path="/terms" element={<Suspense fallback={null}><LandingTerms /></Suspense>} />

        <Route path="/" element={<Root liveAlert={liveAlert} />} />
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
