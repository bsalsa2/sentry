/** Top navigation bar, shown on every page once you're logged in. */

import { NavLink, useNavigate } from 'react-router-dom'

import { useAuth } from '../services/AuthContext'
import { ShieldIcon } from './icons'

export default function Navbar({ liveConnected }) {
  const { user, signOut } = useAuth()
  const navigate = useNavigate()

  function handleSignOut() {
    signOut()
    navigate('/login')
  }

  // NavLink gives us `isActive`, so the current page's link is highlighted.
  const linkClass = ({ isActive }) => `navbar-link${isActive ? ' active' : ''}`

  return (
    <nav className="navbar">
      <NavLink to="/" className="navbar-brand">
        <ShieldIcon style={{ color: 'var(--accent)' }} />
        <span>SENTRY</span>
      </NavLink>

      {/* Green when the live alert connection is open. */}
      <span
        className={`live-dot${liveConnected ? ' on' : ''}`}
        title={liveConnected ? 'Receiving live alerts' : 'Reconnecting...'}
      >
        {liveConnected ? 'Live' : 'Offline'}
      </span>

      <div className="navbar-links">
        <NavLink to="/" end className={linkClass}>Dashboard</NavLink>
        <NavLink to="/alerts" className={linkClass}>Alerts</NavLink>
        <NavLink to="/settings" className={linkClass}>Settings</NavLink>
        <button
          type="button"
          className="navbar-link"
          onClick={handleSignOut}
          style={{ background: 'none', border: 'none', cursor: 'pointer' }}
          title={user ? `Signed in as ${user.email}` : undefined}
        >
          Sign out
        </button>
      </div>
    </nav>
  )
}
