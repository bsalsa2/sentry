/**
 * Landing / home. Short on purpose — the hero, proof it works, and a
 * doorway into the rest of the site. Detail lives on its own pages now
 * (About, How it works, Pricing) instead of all being stacked here.
 */

import { useCallback, useRef } from 'react'
import { Link } from 'react-router-dom'

import {
  CameraIcon, ChipIcon, DropIcon, EyeIcon, OutpostGlyph, iconFor,
} from '../../components/icons'
import { useLandingReveal } from '../../hooks/useLandingReveal'
import { DETECTION_TYPES, detection } from '../../utils/detections'
import { LandingFooter, LandingHeader } from './LandingChrome'

const FACTS = [
  { label: '2K HDR sensor', Icon: CameraIcon },
  { label: 'Color night vision', Icon: EyeIcon },
  { label: 'IP66 weatherproof', Icon: DropIcon },
  { label: 'On-device AI', Icon: ChipIcon },
]

export default function LandingHome() {
  const PackageIcon = iconFor('package')
  const rootRef = useRef(null)
  const visualRef = useRef(null)
  useLandingReveal(rootRef, { hero: true })

  // A quiet spotlight that follows the pointer behind the glyph, like a
  // flashlight finding it in the dark. Desktop-only in spirit: on a phone
  // there's no hover, so the CSS variables just sit at their centred default.
  const handlePointerMove = useCallback((event) => {
    const el = visualRef.current
    if (!el) return
    const rect = el.getBoundingClientRect()
    el.style.setProperty('--mx', `${((event.clientX - rect.left) / rect.width) * 100}%`)
    el.style.setProperty('--my', `${((event.clientY - rect.top) / rect.height) * 100}%`)
  }, [])

  return (
    <div id="top" className="landing" ref={rootRef}>
      <LandingHeader />

      {/* --- Hero --- */}
      <section className="landing-hero">
        <div className="landing-hero-body">
          <div className="landing-hero-copy">
            <div className="label">Sentry Outpost — reserving now</div>
            <h1 className="landing-headline">
              A camera that watches your door<br />and just tells you what happened.
            </h1>
            <p className="landing-sub">
              Sentry is a standalone security camera with the thinking built in — not a
              subscription you rent. It knows the difference between a delivery and a
              stranger, and says so in one sentence instead of a folder of clips you'll
              never watch.
            </p>
            <p className="landing-price-line">
              <strong>$249</strong> one-time <span className="dim">·</span> reserve with a
              fully refundable $25 deposit
            </p>
            <div className="landing-cta">
              <Link to="/signup" className="btn btn-go">Reserve yours</Link>
              <Link to="/how-it-works" className="btn">See how it works</Link>
            </div>
          </div>

          <div
            className="landing-hero-visual"
            ref={visualRef}
            onMouseMove={handlePointerMove}
          >
            <OutpostGlyph className="landing-hero-glyph" aria-hidden="true" />
            <span className="landing-hero-visual-tag">Outpost — reference unit</span>
          </div>
        </div>

        <div className="landing-facts">
          {FACTS.map(({ label, Icon }) => (
            <div key={label} className="landing-fact">
              <Icon />
              <span>{label}</span>
            </div>
          ))}
        </div>
      </section>

      {/* --- Proof: an illustrative preview --- */}
      <section className="section landing-section">
        <div className="section-head">
          <span className="label">The app it comes with</span>
          <h2>What it looks like at 2am</h2>
        </div>
        <p className="landing-section-lede">
          Every Sentry camera includes this app, free, on every platform. What's
          below is an illustrative preview, not live data.
        </p>

        <div className="stats">
          <div className="stat">
            <div className="label">Cameras online</div>
            <div className="stat-value tabular">3/3</div>
            <div className="stat-sub">all reporting</div>
          </div>
          <div className="stat">
            <div className="label">Detections 24h</div>
            <div className="stat-value tabular landing-stat-count" data-count="21">0</div>
            <div className="stat-sub">across all cameras</div>
          </div>
          <div className="stat">
            <div className="label">Unreviewed</div>
            <div className="stat-value tabular landing-stat-count" data-count="0" style={{ '--stat-ink': 'var(--ok)' }}>0</div>
            <div className="stat-sub">all clear</div>
          </div>
          <div className="stat">
            <div className="label">People 24h</div>
            <div className="stat-value tabular landing-stat-count" data-count="6">0</div>
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

      {/* --- Teaser: detections, full detail lives on /how-it-works --- */}
      <section className="section landing-section">
        <div className="section-head">
          <span className="label">Detections</span>
          <h2>Five things worth knowing about</h2>
        </div>

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

        <p className="landing-section-lede" style={{ marginTop: '1.6rem', marginBottom: 0 }}>
          <Link to="/how-it-works">See how detection actually works →</Link>
        </p>
      </section>

      {/* --- Final CTA --- */}
      <section className="section landing-section landing-final">
        <h2 className="landing-final-headline">Be one of the first through the door.</h2>
        <p className="landing-sub">Reserve now for $249, refundable anytime before it ships.</p>
        <div className="landing-cta">
          <Link to="/signup" className="btn btn-go">Reserve yours</Link>
          <Link to="/login" className="btn">Sign in</Link>
        </div>
      </section>

      <LandingFooter />
    </div>
  )
}
