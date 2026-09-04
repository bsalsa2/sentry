/**
 * About us. New content — there was nothing here before. Written to be
 * honest about an early-stage hardware company rather than pretending to
 * be bigger than it is.
 *
 * NOTE: this is placeholder company-story copy, written to be structurally
 * right, not factually right. Swap it for the real story before this ships.
 */

import { useRef } from 'react'
import { Link } from 'react-router-dom'

import { ShieldIcon } from '../../components/icons'
import { useLandingReveal } from '../../hooks/useLandingReveal'
import { LandingFooter, LandingHeader } from './LandingChrome'

const VALUES = [
  {
    title: 'On-device first',
    body: 'Detection runs on the camera itself, not a server we own. Faster alerts, and a lot less of your footage in the cloud for us to think about.',
  },
  {
    title: 'No surprise subscriptions',
    body: 'The core of the product — detection, alerts, local history — is included with the hardware, permanently. We\'ll never hold that hostage behind a monthly fee.',
  },
  {
    title: 'Built to be repaired, not replaced',
    body: 'Two-year warranty, and parts designed to be serviced rather than thrown out the moment something fails.',
  },
]

export default function LandingAbout() {
  const rootRef = useRef(null)
  useLandingReveal(rootRef)

  return (
    <div className="landing" ref={rootRef}>
      <LandingHeader />

      <div className="landing-page-head">
        <ShieldIcon className="page-mark" aria-hidden="true" />
        <div>
          <div className="label">About us</div>
          <h1>We got tired of doorbell clips that show everything and tell you nothing.</h1>
        </div>
      </div>

      <section className="section landing-section landing-story">
        <p>
          Sentry started as a frustration, not a business plan. Every camera we tried
          buried the one thing we actually cared about — a person at the door — under
          hundreds of clips of shifting shadows, passing cars, and a curious cat. We'd
          check the app after a long day and find forty notifications and zero answers.
        </p>
        <p>
          So we built the thing we actually wanted: a camera that does the looking for
          you, and only interrupts you when something's actually worth interrupting
          you for. On-device AI, not a cloud queue. One sentence, not a scroll of
          thumbnails.
        </p>
        <p>
          We're a small team, and we're saying that plainly rather than pretending
          otherwise. The hardware is still in testing — this site exists early on
          purpose, because reserving a spot now is how you get a say in what ships.
        </p>
      </section>

      <section className="section landing-section">
        <div className="section-head">
          <span className="label">What we won't compromise on</span>
          <h2>Three things that don't change</h2>
        </div>

        <div className="landing-features">
          {VALUES.map((v) => (
            <div key={v.title} className="landing-feature">
              <h3>{v.title}</h3>
              <p>{v.body}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="section landing-section landing-final">
        <h2 className="landing-final-headline">Come along early.</h2>
        <p className="landing-sub">Join the waitlist — no payment due now.</p>
        <div className="landing-cta">
          <Link to="/signup" className="btn btn-go">Join the waitlist</Link>
          <Link to="/pricing" className="btn">See pricing</Link>
        </div>
      </section>

      <LandingFooter />
    </div>
  )
}
