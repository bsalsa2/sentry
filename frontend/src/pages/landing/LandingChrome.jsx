/**
 * The header and footer every landing page shares — one nav, one set of
 * destinations, so it's a real multi-page site rather than five copies of
 * the same bar. Each item is now a real route, not a same-page anchor.
 */

import { Link } from 'react-router-dom'

import PillNav from '../../components/PillNav'
import {
  ArrowIcon, CameraIcon, PersonIcon, ShieldIcon, TagIcon,
} from '../../components/icons'

export const NAV_ITEMS = [
  { label: 'Home', Icon: ShieldIcon, href: '/' },
  { label: 'About', Icon: PersonIcon, href: '/about' },
  { label: 'How it works', Icon: CameraIcon, href: '/how-it-works' },
  { label: 'Pricing', Icon: TagIcon, href: '/pricing' },
  { label: 'Reserve', Icon: ArrowIcon, href: '/signup' },
]

export function LandingHeader() {
  return (
    <header className="landing-nav">
      <Link to="/" className="brand">
        <ShieldIcon />
        SENTRY
      </Link>
      <PillNav items={NAV_ITEMS} />
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
      </nav>
      <span className="label">© {new Date().getFullYear()} · Watching, quietly</span>
    </footer>
  )
}
