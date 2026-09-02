/**
 * Privacy policy.
 *
 * IMPORTANT — read before shipping this for real: this is a genuine,
 * structurally complete privacy policy, not filler text, but it was
 * written by an AI, not a lawyer licensed in your jurisdiction. It makes
 * reasonable, honest claims about what this specific codebase actually
 * does (see the comments through routes/auth.py, models.py, etc.) rather
 * than generic boilerplate. Before this is legally relied upon, it needs:
 *   1. Review by an actual lawyer, especially for consumer hardware sales
 *      (warranty law, right-to-repair, and return/refund rules vary by
 *      state and country) and for where your customers actually live
 *      (GDPR if you have EU customers, CCPA/CPRA if California, etc.).
 *   2. Real contact details in place of the placeholders below.
 *   3. A pass to confirm every claim still matches reality once payments,
 *      cloud storage, or any other new data flow actually gets built.
 */

import { useEffect, useRef } from 'react'

import { ShieldIcon } from '../../components/icons'
import { LandingFooter, LandingHeader } from './LandingChrome'

const EFFECTIVE_DATE = 'September 2, 2026'

export default function LandingPrivacy() {
  const rootRef = useRef(null)

  // A light entrance only - a legal document someone is trying to actually
  // read shouldn't have its paragraphs staggering in as they scroll.
  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
    rootRef.current?.classList.add('rise')
  }, [])

  return (
    <div className="landing" ref={rootRef}>
      <LandingHeader />

      <div className="landing-page-head">
        <ShieldIcon className="page-mark" aria-hidden="true" />
        <div>
          <div className="label">Legal</div>
          <h1>Privacy Policy</h1>
        </div>
      </div>

      <section className="section landing-section landing-legal">
        <p className="landing-legal-meta">Effective {EFFECTIVE_DATE}</p>

        <p>
          This policy covers Sentry's app, this website, and the Sentry camera
          hardware. It explains what we collect, why, and what say you have over
          it. We've tried to write it in plain language rather than the usual
          legal fog — if anything below is unclear, that's a bug in the writing,
          not a trick.
        </p>

        <h2>What we collect</h2>
        <p><strong>Account information.</strong> Your name, email address, and a
          password — stored as a bcrypt hash, never in plain text, so we
          couldn't read it even if we wanted to.</p>
        <p><strong>Device information.</strong> Each camera you register: its
          name, location label, local IP address, sensitivity setting, and a
          per-device authentication key.</p>
        <p><strong>Detection data.</strong> When a camera detects something,
          we store the detection type (person, vehicle, package, animal, or
          motion), a confidence score, a timestamp, and — if you've enabled
          it — a snapshot image. This is the core of what the product does,
          and it's tied to your account so only you can see it.</p>
        <p><strong>Usage information.</strong> Standard server logs (IP
          address, request timing, error reports) that help us keep the
          service running and catch problems.</p>
        <p><strong>Payment information.</strong> If and when direct purchases
          go live on this site, payment details will be handled by a
          third-party payment processor — we don't store full card numbers
          ourselves. This section will be updated with the specific
          processor's name once that's live.</p>

        <h2>What we don't collect</h2>
        <p>
          Detection runs on the camera itself, on-device. Continuous video isn't
          streamed to a server by default and isn't something we watch — the
          camera doesn't send us footage of your home just because it exists.
          What reaches our servers is the detection event and, if you choose to
          keep one, the specific snapshot tied to it.
        </p>

        <h2>How we use it</h2>
        <ul>
          <li>To run the account and camera features you're actually using — showing your alerts, keeping your devices in sync, sending the notifications you asked for.</li>
          <li>To secure your account — detecting suspicious logins, rotating device keys, investigating abuse.</li>
          <li>To fix things that break and improve detection accuracy over time.</li>
          <li>To contact you about your order, your account, or a material change to this policy — never for marketing you didn't ask for.</li>
        </ul>

        <h2>Who we share it with</h2>
        <p>
          We don't sell personal information. Full stop. Data is shared only
          with the infrastructure providers that make the service run —
          currently a database host and a hosting/CDN provider — under
          agreements that restrict them to processing it on our behalf, not
          using it for their own purposes. We'll disclose information if
          legally required to (a valid subpoena or court order), and we'll
          tell you when we can if that happens to your account.
        </p>

        <h2>How long we keep it</h2>
        <p>
          Account data persists until you delete your account. Detection
          history is retained locally on the device for a limited window
          (currently 14 days) and, in your account, until you delete it or
          close your account. Deleting a camera deletes its alert history
          with it — that's not a soft delete, it's gone.
        </p>

        <h2>Your choices</h2>
        <ul>
          <li><strong>Access & export.</strong> You can see everything tied to your account from inside the app. A full data export on request is on the roadmap.</li>
          <li><strong>Deletion.</strong> Delete a camera, an alert, or your whole account at any time. Account deletion is permanent.</li>
          <li><strong>Notifications.</strong> Browser notifications and alert sounds are opt-in and can be turned off in Settings.</li>
          <li><strong>Device keys.</strong> Rotate any camera's authentication key at any time, instantly revoking the old one.</li>
        </ul>

        <h2>Security</h2>
        <p>
          Passwords are hashed with bcrypt. Sessions use signed tokens with an
          expiry. Each camera authenticates with its own unique key rather
          than a shared credential, so one compromised device doesn't expose
          the rest. No system is unbreakable, and we don't claim this one is —
          but this is the actual, current design, not a marketing gloss on
          top of something weaker.
        </p>

        <h2>Children's privacy</h2>
        <p>
          Sentry isn't directed at children, and we don't knowingly collect
          information from anyone under 13 (or the relevant age in your
          country). If you believe a child has created an account, contact us
          and we'll remove it.
        </p>

        <h2>Cookies & tracking</h2>
        <p>
          The app stores your login token in your browser's local storage so
          you don't have to sign in every visit. There's no third-party
          analytics or advertising tracking on this site at the time of
          writing. If that changes, this section will say so.
        </p>

        <h2>Changes to this policy</h2>
        <p>
          If this policy changes in a way that matters, we'll update the
          effective date above and, for material changes, tell you directly
          rather than leaving it to be noticed.
        </p>

        <h2>Contact</h2>
        <p>
          Questions about this policy or your data: <strong>privacy@example.com</strong> (placeholder —
          replace with a real address before this goes live).
        </p>
      </section>

      <LandingFooter />
    </div>
  )
}
