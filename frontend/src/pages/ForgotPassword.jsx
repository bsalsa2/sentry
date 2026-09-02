/** Request a password reset link. */

import { useState } from 'react'
import { Link } from 'react-router-dom'

import { ShieldIcon } from '../components/icons'
import { requestPasswordReset } from '../services/api'

export default function ForgotPassword() {
  const [email, setEmail] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const [sent, setSent] = useState(false)

  async function handleSubmit(event) {
    event.preventDefault()
    setError('')
    setBusy(true)
    try {
      await requestPasswordReset(email)
      // Same message whether or not the account exists - the request
      // itself already keeps that private, so the UI does too.
      setSent(true)
    } catch (err) {
      setError(err.message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="auth">
      <div className="auth-card rise rise-1">
        <ShieldIcon className="auth-watermark" aria-hidden="true" />
        <div className="auth-mark">
          <ShieldIcon />
          <span className="auth-name">SENTRY</span>
        </div>
        <p className="auth-tag">Reset your password</p>

        {sent ? (
          <div className="note note-good">
            If an account exists for that email, a reset link is on its way.
            It's valid for one hour.
          </div>
        ) : (
          <>
            {error && <div className="note note-bad">{error}</div>}
            <form onSubmit={handleSubmit}>
              <div className="field">
                <label htmlFor="email">Email</label>
                <input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)}
                       autoComplete="email" required autoFocus />
                <span className="hint">We'll send a link to reset your password.</span>
              </div>

              <button type="submit" className="btn btn-go btn-wide" disabled={busy}>
                {busy ? 'Sending…' : 'Send reset link'}
              </button>
            </form>
          </>
        )}

        <p className="auth-alt">
          <Link to="/login">Back to sign in</Link>
        </p>
      </div>
    </div>
  )
}
