/** Set a new password from a forgot-password link (?token=...). */

import { useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'

import { ShieldIcon } from '../components/icons'
import { resetPassword } from '../services/api'
import { useAuth } from '../services/AuthContext'

const MIN_PASSWORD_LENGTH = 8

export default function ResetPassword() {
  const [searchParams] = useSearchParams()
  const token = searchParams.get('token') || ''
  const { adoptSession } = useAuth()
  const navigate = useNavigate()

  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  async function handleSubmit(event) {
    event.preventDefault()
    setError('')

    if (password.length < MIN_PASSWORD_LENGTH) {
      setError(`Password must be at least ${MIN_PASSWORD_LENGTH} characters.`)
      return
    }
    if (password !== confirm) {
      setError("Those passwords don't match.")
      return
    }

    setBusy(true)
    try {
      const { token: sessionToken, user } = await resetPassword(token, password)
      adoptSession(sessionToken, user)
      navigate('/', { replace: true })
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
        <p className="auth-tag">Choose a new password</p>

        {!token && (
          <div className="note note-bad">
            This link is missing its reset token. Request a new one from{' '}
            <Link to="/forgot-password">the forgot-password page</Link>.
          </div>
        )}

        {error && <div className="note note-bad">{error}</div>}

        <form onSubmit={handleSubmit}>
          <div className="field">
            <label htmlFor="password">New password</label>
            <input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)}
                   autoComplete="new-password" required autoFocus disabled={!token} />
            <span className="hint">Minimum {MIN_PASSWORD_LENGTH} characters.</span>
          </div>

          <div className="field">
            <label htmlFor="confirm">Confirm</label>
            <input id="confirm" type="password" value={confirm} onChange={(e) => setConfirm(e.target.value)}
                   autoComplete="new-password" required disabled={!token} />
          </div>

          <button type="submit" className="btn btn-go btn-wide" disabled={busy || !token}>
            {busy ? 'Saving…' : 'Set new password'}
          </button>
        </form>

        <p className="auth-alt">
          <Link to="/login">Back to sign in</Link>
        </p>
      </div>
    </div>
  )
}
