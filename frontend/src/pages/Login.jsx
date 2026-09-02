/** Sign in. */

import { useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'

import { useAuth } from '../services/AuthContext'
import { BACKEND_NOT_CONFIGURED } from '../services/api'
import { ShieldIcon } from '../components/icons'

export default function Login() {
  const { signIn } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  // If they were bounced here from a protected page, go back there after.
  const returnTo = location.state?.from || '/'

  async function handleSubmit(event) {
    event.preventDefault()
    setError('')
    setBusy(true)
    try {
      await signIn(email, password)
      navigate(returnTo, { replace: true })
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
        <p className="auth-tag">Surveillance monitoring</p>

        {/* Deployed, but nobody has pointed it at a backend yet. */}
        {BACKEND_NOT_CONFIGURED && (
          <div className="note note-info">
            <strong>No backend connected.</strong>
            <p style={{ margin: '0.4rem 0 0' }}>
              Deploy the Flask backend, then set <code>VITE_API_URL</code> in this
              project's Vercel settings and redeploy. See{' '}
              <code>docs/DEPLOYMENT.md</code>.
            </p>
          </div>
        )}

        {error && <div className="note note-bad">{error}</div>}

        <form onSubmit={handleSubmit}>
          <div className="field">
            <label htmlFor="email">Email</label>
            <input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)}
                   autoComplete="email" required autoFocus />
          </div>

          <div className="field">
            <div className="row" style={{ justifyContent: 'space-between' }}>
              <label htmlFor="password" style={{ margin: 0 }}>Password</label>
              <Link to="/forgot-password" className="label" style={{ color: 'var(--signal)' }}>Forgot?</Link>
            </div>
            <input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)}
                   autoComplete="current-password" required />
          </div>

          <button type="submit" className="btn btn-go btn-wide" disabled={busy}>
            {busy ? 'Authenticating…' : 'Sign in'}
          </button>
        </form>

        <p className="auth-alt">
          No account? <Link to="/signup">Create one</Link>
        </p>
      </div>
    </div>
  )
}
