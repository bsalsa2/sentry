/**
 * Terms of service / sale.
 *
 * Same caveat as Privacy.jsx: a real, complete draft written to be
 * structurally correct for a small hardware + software company, not a
 * substitute for a lawyer. The limitation-of-liability, warranty, and
 * dispute-resolution sections in particular are exactly the ones that
 * need a licensed attorney's eyes before they're relied on for anything -
 * consumer protection, warranty, and arbitration law all vary sharply by
 * state and country, and getting them wrong can make the clause
 * unenforceable (or worse, illegal) rather than just ineffective.
 */

import { useEffect, useRef } from 'react'

import { ShieldIcon } from '../../components/icons'
import { LandingFooter, LandingHeader } from './LandingChrome'

const EFFECTIVE_DATE = 'September 2, 2026'

export default function LandingTerms() {
  const rootRef = useRef(null)

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
          <h1>Terms of Service</h1>
        </div>
      </div>

      <section className="section landing-section landing-legal">
        <p className="landing-legal-meta">Effective {EFFECTIVE_DATE}</p>

        <p>
          These terms cover the Sentry app, this website, and reservations or
          purchases of Sentry camera hardware. By creating an account or
          placing a reservation, you're agreeing to them.
        </p>

        <h2>The account</h2>
        <p>
          You need an account to use the app. You're responsible for keeping
          your password secret and for what happens under your account — tell
          us right away if you think someone else has access to it. You must
          be old enough to form a binding contract in your jurisdiction to
          create one.
        </p>

        <h2>Reservations & orders</h2>
        <p>
          The hardware described on this site is currently in testing and not
          yet shipping. A reservation, where offered, is held with a deposit
          that is fully refundable at any time before your order ships —
          reserving a unit is not a final sale. Final pricing, specifications,
          and shipping dates are subject to change before general availability,
          and we'll tell you before charging the balance of any order.
        </p>

        <h2>Returns & warranty</h2>
        <p>
          Once shipping begins, hardware may be returned within 30 days of
          delivery for a full refund, in resalable condition, no restocking
          fee. Beyond that window, the hardware carries the warranty stated on
          its product page at the time of your purchase (currently planned as
          two years against defects in materials and workmanship for the
          original owner). This warranty doesn't cover damage from misuse,
          unauthorized modification, or normal wear.
        </p>

        <h2>Acceptable use</h2>
        <p>You agree not to:</p>
        <ul>
          <li>Use the service to surveil anyone without a lawful basis to do so — you're responsible for complying with wiretapping, surveillance, and recording laws in your own location.</li>
          <li>Attempt to access another user's account, device, or data.</li>
          <li>Reverse-engineer, resell, or attempt to circumvent the device authentication system.</li>
          <li>Use the service in any way that's illegal where you live.</li>
        </ul>

        <h2>Service availability</h2>
        <p>
          We aim to keep the app and detection service reliably available, but
          we don't promise it will never go down, and we're not liable for
          losses caused by an outage. Detection accuracy is not perfect — this
          product is a tool that reduces false alarms and highlights events
          worth your attention, not a guarantee against missed events. Don't
          rely on it as your sole means of security for anything where a
          missed alert would be genuinely dangerous.
        </p>

        <h2>Limitation of liability</h2>
        <p>
          To the maximum extent permitted by law, Sentry is provided "as is,"
          and we disclaim warranties beyond the specific hardware warranty
          above. We aren't liable for indirect, incidental, or consequential
          damages arising from your use of the product or service. Nothing
          here limits liability that can't legally be limited in your
          jurisdiction (for example, liability for gross negligence, fraud, or
          personal injury caused by a defective product, where applicable
          consumer protection law says so).
        </p>

        <h2>Changes to these terms</h2>
        <p>
          We may update these terms as the product and business evolve. We'll
          update the effective date above, and for material changes, tell
          existing account holders directly.
        </p>

        <h2>Governing law</h2>
        <p>
          These terms are governed by the laws of the State of Maryland,
          without regard to its conflict-of-laws rules, and any dispute
          arising from them will be resolved in the state or federal courts
          located in Maryland. If the business later incorporates elsewhere,
          this section will be updated to match.
        </p>

        <h2>Contact</h2>
        <p>
          Questions about these terms:{' '}
          <strong>bradensalcetti@icloud.com</strong>.
        </p>
      </section>

      <LandingFooter />
    </div>
  )
}
