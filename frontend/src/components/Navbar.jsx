/**
 * Navigation. Two shapes for two screens:
 *   - a sticky top bar with the brand, live-link status and tabs (desktop)
 *   - a fixed bottom tab bar (phones), where thumbs actually reach
 */

import { NavLink, useNavigate } from 'react-router-dom'

import { useAuth } from '../services/AuthContext'
import { BellIcon, GridIcon, LogoutIcon, ShieldIcon, SlidersIcon } from './icons'

const TABS = [
  { to: '/', label: 'Grid', Icon: GridIcon, end: true },
  { to: '/alerts', label: 'Alerts', Icon: BellIcon },
  { to: '/settings', label: 'Config', Icon: SlidersIcon },
]

export default function Navbar({ liveConnected }) {
  const { user, signOut } = useAuth()
  const navigate = useNavigate()

  function handleSignOut() {
    signOut()
    navigate('/login')
  }

  return (
    <>
      <nav className="topbar">
        <NavLink to="/" className="brand">
          <ShieldIcon />
          SENTRY
        </NavLink>

        {/* Green only while the live alert stream is actually connected. */}
        <span
          className={`led${liveConnected ? ' on' : ''}`}
          title={liveConnected ? 'Receiving live alerts' : 'Reconnecting to the alert stream'}
        >
          {liveConnected ? 'Live' : 'Offline'}
        </span>

        <div className="topbar-links">
          {TABS.map(({ to, label, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              className={({ isActive }) => `navlink${isActive ? ' active' : ''}`}
            >
              {label}
            </NavLink>
          ))}
          <button
            type="button"
            className="navlink"
            onClick={handleSignOut}
            title={user ? `Signed in as ${user.email}` : undefined}
          >
            Sign out
          </button>
        </div>
      </nav>

      <nav className="tabbar">
        {TABS.map(({ to, label, Icon, end }) => (
          <NavLink key={to} to={to} end={end} className={({ isActive }) => `tab${isActive ? ' active' : ''}`}>
            <span className="tab-badge"><Icon /></span>
            {label}
          </NavLink>
        ))}
        <button type="button" className="tab" onClick={handleSignOut}>
          <span className="tab-badge"><LogoutIcon /></span>
          Exit
        </button>
      </nav>
    </>
  )
}
