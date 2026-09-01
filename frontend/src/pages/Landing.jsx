/**
 * The public landing page — what a visitor sees before they ever sign in.
 * Static and illustrative throughout; nothing here calls the API.
 */

import { Link } from 'react-router-dom'

import PillNav from '../components/PillNav'
import {
  ArrowIcon, CameraIcon, EyeIcon, LockIcon, ShieldIcon, iconFor,
} from '../components/icons'
import { DETECTION_TYPES, detection } from '../utils/detections'

const NAV_ITEMS = [
  { label: 'Overview', Icon: ShieldIcon, href: '#top' },
  { label: 'Live demo', Icon: EyeIcon, href: '#demo' },
  { label: 'Security', Icon: LockIcon, href: '#security' },
  { label: 'Detections', Icon: CameraIcon, href: '#detections' },
  { label: 'Get started', Icon: ArrowIcon, href: '/signup' },
]

const FEATURES = [
  {
    title: 'Your network. Your data.',
    body: 'The camera talks to your own backend, on your own account. Nothing is sold, nothing is shared, nothing leaves the house except the alert you asked for.',
  },
  {
    title: 'A key per camera, rotate anytime.',
    body: 'Every device authenticates with its own key. Lose a Pi, sell a house, have a falling-out with a housemate — revoke one key without touching the rest.',
  },
  {
    title: 'Tuned, not just triggered.',
    body: 'Sensitivity is a dial, not a switch. Turn it down to a whisper for a mail slot, up to a shout for a driveway.',
  },
]

export default function Landing() {
  const PackageIcon = iconFor('package')

  return (
    <div id="top" className="landing">
      <header className="landing-nav">
        <a href="#top" className="brand">
          <ShieldIcon />
          SENTRY
        </a>
        <PillNav items={NAV_ITEMS} />
      </header>

      {/* --- Hero ------------------------------------------------------- */}
      <section className="landing-hero">
        <ShieldIcon className="hero-mark" aria-hidden="true" />
        <div className="label">Home surveillance, watched quietly</div>
        <h1 className="landing-headline">
          A camera that tells you<br />what happened, not everything.
        </h1>
        <p className="landing-sub">
          Sentry turns a Raspberry Pi and a camera into a surveillance system that
          knows the difference between a delivery and a stranger — and says so in
          a sentence, not a siren.
        </p>
        <div className="landing-cta">
          <Link to="/signup" className="btn btn-go">Get started</Link>
          <Link to="/login" className="btn">Sign in</Link>
        </div>
      </section>

      {/* --- Illustrative preview ---------------------------------------- */}
      <section id="demo" className="section landing-section">
        <div className="section-head">
          <span className="label">Live demo</span>
          <h2>What it looks like at 2am</h2>
        </div>
        <p className="landing-section-lede">
          An illustrative preview — not live data, just the shape of the real console.
        </p>

        <div className="stats">
          <div className="stat">
            <div className="label">Cameras online</div>
            <div className="stat-value tabular">3/3</div>
            <div className="stat-sub">all reporting</div>
          </div>
          <div className="stat">
            <div className="label">Detections 24h</div>
            <div className="stat-value tabular">21</div>
            <div className="stat-sub">across all cameras</div>
          </div>
          <div className="stat">
            <div className="label">Unreviewed</div>
            <div className="stat-value tabular" style={{ '--stat-ink': 'var(--ok)' }}>0</div>
            <div className="stat-sub">all clear</div>
          </div>
          <div className="stat">
            <div className="label">People 24h</div>
            <div className="stat-value tabular">6</div>
            <div className="stat-sub">person detections</div>
          </div>
        </div>

        <div className="feed" style={{ marginTop: '1px' }}>
          <div className="alert" style={{ '--tone': 'var(--d-package)' }}>
            <span className="alert-ico"><PackageIcon /></span>
            <div className="alert-main">
              <div className="alert-what">A parcel arrived at Front Door</div>
              <div className="alert-where">Front Door · 88% confident</div>
            </div>
            <div className="alert-side"><div className="alert-when tabular">2:13 PM</div></div>
          </div>
        </div>
      </section>

      {/* --- Security ------------------------------------------------------ */}
      <section id="security" className="section landing-section">
        <div className="section-head">
          <span className="label">Security</span>
          <h2>Built to stay out of the way</h2>
        </div>

        <div className="landing-features">
          {FEATURES.map((f) => (
            <div key={f.title} className="landing-feature">
              <h3>{f.title}</h3>
              <p>{f.body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* --- Detections ------------------------------------------------------ */}
      <section id="detections" className="section landing-section">
        <div className="section-head">
          <span className="label">Detections</span>
          <h2>Five things worth knowing about</h2>
        </div>
        <p className="landing-section-lede">
          Each type carries its own colour and its own icon — colour never has to
          do the job alone. This is the same palette used throughout the app.
        </p>

        <div className="landing-detections">
          {DETECTION_TYPES.map((type) => {
            const meta = detection(type)
            const Icon = iconFor(type)
            return (
              <div key={type} className="landing-det" style={{ '--tone': meta.color }}>
                <span className="landing-det-ico"><Icon /></span>
                <span className="landing-det-label">{meta.label}</span>
              </div>
            )
          })}
        </div>
      </section>

      {/* --- Final CTA ------------------------------------------------------ */}
      <section className="section landing-section landing-final">
        <h2 className="landing-final-headline">Set it up in an afternoon.</h2>
        <p className="landing-sub">Free to run on your own hardware. No subscription, no cloud middleman.</p>
        <div className="landing-cta">
          <Link to="/signup" className="btn btn-go">Create an account</Link>
          <Link to="/login" className="btn">Sign in</Link>
        </div>
      </section>

      <footer className="landing-footer">
        <span className="brand"><ShieldIcon />SENTRY</span>
        <span className="label">© {new Date().getFullYear()} · Watching, quietly</span>
      </footer>
    </div>
  )
}
