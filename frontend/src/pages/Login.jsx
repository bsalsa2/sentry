/** Sign-in page. */

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

  // If the user was sent here from a protected page, go back there after login.
  const returnTo = location.state?.from || '/'

  async function handleSubmit(event) {
    event.preventDefault()   // stops the browser reloading the page
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
    <div className="auth-wrap">
      <div className="auth-card">
        <div className="auth-logo">
          <ShieldIcon style={{ color: 'var(--accent)' }} />
          SENTRY
        </div>
        <p className="auth-tagline">AI-powered surveillance monitoring</p>

        {/* Deployed, but nobody has pointed it at a backend yet. Say so
            plainly instead of letting every login fail mysteriously. */}
        {BACKEND_NOT_CONFIGURED && (
          <div className="message info">
            <strong>Almost there - no backend connected.</strong>
            <p style={{ margin: '0.4rem 0 0' }}>
              Deploy the Flask backend, then set <code>VITE_API_URL</code> in
              this project's Vercel settings to its URL and redeploy. See
              <code> docs/DEPLOYMENT.md</code> in the repository.
            </p>
          </div>
        )}

        {error && <div className="message error">{error}</div>}

        <form onSubmit={handleSubmit}>
          <div className="field">
            <label htmlFor="email">Email</label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="email"
              required
              autoFocus
            />
          </div>

          <div className="field">
            <label htmlFor="password">Password</label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
              required
            />
          </div>

          <button type="submit" className="btn btn-primary btn-block" disabled={busy}>
            {busy ? 'Signing in...' : 'Sign in'}
          </button>
        </form>

        <p className="auth-switch">
          No account yet? <Link to="/signup">Create one</Link>
        </p>
      </div>
    </div>
  )
}
