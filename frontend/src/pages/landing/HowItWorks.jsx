/**
 * How it works: the physical setup, what the AI actually detects, the full
 * spec sheet, and the privacy model — everything about how the product
 * functions, on one page instead of scattered across the home page.
 */

import { useRef } from 'react'
import { Link } from 'react-router-dom'

import { ShieldIcon, iconFor } from '../../components/icons'
import { useLandingReveal } from '../../hooks/useLandingReveal'
import { DETECTION_TYPES, detection } from '../../utils/detections'
import { LandingFooter, LandingHeader } from './LandingChrome'

const STEPS = [
  {
    n: '01',
    title: 'Mount it',
    body: 'Screw the bracket above the door, or set it on a shelf inside — it’s weatherproof either way. There’s no separate hub to drill into drywall for; the camera is the whole system.',
  },
  {
    n: '02',
    title: 'Connect it',
    body: 'It joins your Wi-Fi and pairs with your Sentry account straight from your phone. No bridge box, no third app to install, no hold music with support.',
  },
  {
    n: '03',
    title: 'It watches, quietly',
    body: 'Every motion event runs through on-device AI before it ever reaches your phone. A moth on the lens doesn’t wake you up. A stranger at the door at 2am does.',
  },
]

const DETECTION_DETAIL = {
  person: 'A human-shaped heat signature that isn\'t you, isn\'t a delivery pattern, and stayed long enough to matter.',
  package: 'Something dropped and left, matched against the motion pattern of an actual delivery, not a passing dog.',
  vehicle: 'A car that stopped, not one that drove past — the difference between your driveway and the street.',
  animal: 'Something four-legged, so it doesn\'t get filed under "person" and doesn\'t wake you up like one either.',
  motion: 'Everything else worth a glance but not an alert — logged quietly, never pushed to your phone unless you ask.',
}

const SPECS = [
  ['Sensor', '2K HDR, up to 30 fps'],
  ['Field of view', '155° diagonal'],
  ['Night vision', 'Full-colour low light, IR fallback'],
  ['Connectivity', '2.4 / 5GHz Wi-Fi · PoE adapter optional'],
  ['Power', 'USB-C · weatherproof battery pack optional'],
  ['Storage', 'Local microSD included · cloud backup optional'],
  ['Weather rating', 'IP66 · ‒20°C to 50°C operating range'],
  ['On-device AI', 'Person, vehicle, package, animal, motion'],
  ['App', 'iOS, Android, and the web console shown above'],
  ['Warranty', '2 years, first owner'],
]

const FEATURES = [
  {
    title: 'Your network. Your data.',
    body: 'Detection runs on the camera itself. Nothing about what it sees has to leave your house for it to know a stranger from a delivery.',
  },
  {
    title: 'A key per camera, rotate anytime.',
    body: 'Every camera authenticates with its own key. Sell a house, have a falling-out with a housemate, lose a device — revoke one key without touching the rest.',
  },
  {
    title: 'Tuned, not just triggered.',
    body: 'Sensitivity is a dial, not a switch. Turn it down to a whisper for a mail slot, up to a shout for a driveway.',
  },
]

export default function LandingHowItWorks() {
  const rootRef = useRef(null)
  useLandingReveal(rootRef)

  return (
    <div className="landing" ref={rootRef}>
      <LandingHeader />

      <div className="landing-page-head">
        <ShieldIcon className="page-mark" aria-hidden="true" />
        <div>
          <div className="label">How it works</div>
          <h1>Fifteen minutes, no hub required.</h1>
        </div>
      </div>

      <section className="section landing-section">
        <div className="landing-steps">
          {STEPS.map((s) => (
            <div key={s.n} className="landing-step">
              <div className="landing-step-n">{s.n}</div>
              <h3>{s.title}</h3>
              <p>{s.body}</p>
            </div>
          ))}
        </div>
      </section>

      <section id="detections" className="section landing-section">
        <div className="section-head">
          <span className="label">Detections</span>
          <h2>What it's actually looking for</h2>
        </div>
        <p className="landing-section-lede">
          Each type carries its own colour and its own icon, so colour never has to
          do the job alone — the same validated palette runs through the whole app.
        </p>

        <div className="landing-detect-grid">
          {DETECTION_TYPES.map((type) => {
            const meta = detection(type)
            const Icon = iconFor(type)
            return (
              <div key={type} className="landing-detect-card" style={{ '--tone': meta.color }}>
                <span className="landing-det-ico"><Icon /></span>
                <h3>{meta.label}</h3>
                <p>{DETECTION_DETAIL[type]}</p>
              </div>
            )
          })}
        </div>
      </section>

      <section id="specs" className="section landing-section">
        <div className="section-head">
          <span className="label">Specification</span>
          <h2>What's actually inside</h2>
        </div>
        <p className="landing-section-lede">
          Numbers as they stand today, mid-testing — final specs lock before the
          first units ship.
        </p>

        <div className="landing-specs">
          {SPECS.map(([label, value]) => (
            <div key={label} className="landing-spec-row">
              <span className="landing-spec-label">{label}</span>
              <span className="landing-spec-value">{value}</span>
            </div>
          ))}
        </div>
      </section>

      <section className="section landing-section">
        <div className="section-head">
          <span className="label">Privacy</span>
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

      <section className="section landing-section landing-final">
        <h2 className="landing-final-headline">Now you know how it works.</h2>
        <p className="landing-sub">See what it costs, or join the waitlist now.</p>
        <div className="landing-cta">
          <Link to="/pricing" className="btn">See pricing</Link>
          <Link to="/signup" className="btn btn-go">Join the waitlist</Link>
        </div>
      </section>

      <LandingFooter />
    </div>
  )
}
