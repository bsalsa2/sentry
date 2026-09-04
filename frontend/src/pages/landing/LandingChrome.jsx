/**
 * The header and footer every landing page shares — one nav, one set of
 * destinations, so it's a real multi-page site rather than five copies of
 * the same bar. Each item is a real route, not a same-page anchor.
 *
 * Desktop keeps PillNav's hover-expand pills. Phone gets a plain hamburger
 * menu instead — a horizontally-scrolling nav strip was the wrong call
 * there; nobody wants to swipe sideways to find "Pricing".
 */

import { useEffect, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'

import PillNav from '../../components/PillNav'
import {
  ArrowIcon, CameraIcon, CloseIcon, MenuIcon, PersonIcon, ShieldIcon, TagIcon,
} from '../../components/icons'

export const NAV_ITEMS = [
  { label: 'Home', Icon: ShieldIcon, href: '/' },
  { label: 'About', Icon: PersonIcon, href: '/about' },
  { label: 'How it works', Icon: CameraIcon, href: '/how-it-works' },
  { label: 'Pricing', Icon: TagIcon, href: '/pricing' },
  { label: 'Waitlist', Icon: ArrowIcon, href: '/signup' },
]

export function LandingHeader() {
  const [open, setOpen] = useState(false)
  const location = useLocation()

  // A menu left open across a navigation is a bug users file, not a feature.
  useEffect(() => { setOpen(false) }, [location.pathname])

  // Lock the page behind the menu so it can't scroll underneath it.
  useEffect(() => {
    document.body.style.overflow = open ? 'hidden' : ''
    return () => { document.body.style.overflow = '' }
  }, [open])

  return (
    <header className="landing-nav">
      <Link to="/" className="brand">
        <ShieldIcon />
        SENTRY
      </Link>

      <PillNav items={NAV_ITEMS} className="landing-nav-desktop" />

      <button
        type="button"
        className="landing-menu-btn"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        aria-label={open ? 'Close menu' : 'Open menu'}
      >
        {open ? <CloseIcon /> : <MenuIcon />}
      </button>

      {open && (
        <div className="landing-menu">
          {NAV_ITEMS.map(({ label, Icon, href }) => (
            <Link key={label} to={href} className="landing-menu-item">
              <Icon />
              {label}
            </Link>
          ))}
        </div>
      )}
    </header>
  )
}

export function LandingFooter() {
  return (
    <footer className="landing-footer">
      <span className="brand"><ShieldIcon />SENTRY</span>
      <nav className="landing-footer-links">
        <Link to="/about">About</Link>
        <Link to="/how-it-works">How it works</Link>
        <Link to="/pricing">Pricing</Link>
        <Link to="/privacy">Privacy</Link>
        <Link to="/terms">Terms</Link>
      </nav>
      <span className="label">© {new Date().getFullYear()} · Watching, quietly</span>
    </footer>
  )
}
