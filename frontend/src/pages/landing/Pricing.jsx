/**
 * Pricing + the questions someone has right before they reserve one.
 *
 * NOTE: the price ($249), the deposit ($25), and the cloud add-on price
 * are placeholders written to be structurally correct, not factually
 * correct. Swap them for the real numbers before this ships.
 */

import { useRef } from 'react'
import { Link } from 'react-router-dom'

import { ShieldIcon } from '../../components/icons'
import { useLandingReveal } from '../../hooks/useLandingReveal'
import { LandingFooter, LandingHeader } from './LandingChrome'

const PRICING_INCLUDES = [
  'The camera and weatherproof mounting bracket',
  'The app, free, on iOS, Android and the web',
  'On-device AI detection — included, not a paywall',
  '14 days of local event history',
]

const FAQ = [
  {
    q: 'Do I need a subscription?',
    a: 'No. Detection, alerts, and 14 days of local event history are included with the camera itself. Cloud backup beyond that is optional, never required to get an alert.',
  },
  {
    q: 'When does it ship?',
    a: 'We\'re finishing testing now — this site is here early on purpose. Reserving a spot gets you the ship-date announcement first and holds your place in line.',
  },
  {
    q: 'What if it isn\'t right for my home?',
    a: 'Full refund within 30 days of delivery. No restocking fee, no argument.',
  },
  {
    q: 'Can I run more than one?',
    a: 'Yes — one account covers as many Sentry cameras as your house needs, all in the same app.',
  },
]

export default function LandingPricing() {
  const rootRef = useRef(null)
  useLandingReveal(rootRef)

  return (
    <div className="landing" ref={rootRef}>
      <LandingHeader />

      <div className="landing-page-head">
        <ShieldIcon className="page-mark" aria-hidden="true" />
        <div>
          <div className="label">Pricing</div>
          <h1>One camera. One price.</h1>
        </div>
      </div>

      <section className="section landing-section">
        <div className="landing-price-card">
          <div className="landing-price-top">
            <div>
              <div className="landing-price-n">$249</div>
              <div className="landing-price-sub">one-time · no forced subscription</div>
            </div>
            <Link to="/signup" className="btn btn-go">Reserve with $25 deposit</Link>
          </div>

          <div className="rule" />

          <ul className="landing-price-list">
            {PRICING_INCLUDES.map((item) => <li key={item}>{item}</li>)}
          </ul>

          <p className="hint">
            Optional cloud backup starts at $4/mo if you want 30-day off-site
            history — never required to receive an alert. Deposit is fully
            refundable any time before your camera ships.
          </p>
        </div>
      </section>

      <section className="section landing-section">
        <div className="section-head">
          <span className="label">Questions</span>
          <h2>Before you reserve</h2>
        </div>

        <div className="landing-faq">
          {FAQ.map(({ q, a }) => (
            <div key={q} className="landing-faq-item">
              <h3>{q}</h3>
              <p>{a}</p>
            </div>
          ))}
        </div>
      </section>

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
