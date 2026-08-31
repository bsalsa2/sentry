/** Create-an-account page. */

import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'

import { useAuth } from '../services/AuthContext'
import { ShieldIcon } from '../components/icons'

const MIN_PASSWORD_LENGTH = 8

export default function Signup() {
  const { signUp } = useAuth()
  const navigate = useNavigate()

  const [form, setForm] = useState({ name: '', email: '', password: '', confirm: '' })
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  const update = (key) => (event) =>
    setForm((current) => ({ ...current, [key]: event.target.value }))

  async function handleSubmit(event) {
    event.preventDefault()
    setError('')

    // Check what we can here, so the user gets an answer without a round trip.
    if (form.password.length < MIN_PASSWORD_LENGTH) {
      setError(`Password must be at least ${MIN_PASSWORD_LENGTH} characters.`)
      return
    }
    if (form.password !== form.confirm) {
      setError("Those passwords don't match.")
      return
    }

    setBusy(true)
    try {
      await signUp(form.name, form.email, form.password)
      navigate('/', { replace: true })
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
        <p className="auth-tagline">Create your monitoring account</p>

        {error && <div className="message error">{error}</div>}

        <form onSubmit={handleSubmit}>
          <div className="field">
            <label htmlFor="name">Name</label>
            <input id="name" type="text" value={form.name} onChange={update('name')}
                   autoComplete="name" required autoFocus />
          </div>

          <div className="field">
            <label htmlFor="email">Email</label>
            <input id="email" type="email" value={form.email} onChange={update('email')}
                   autoComplete="email" required />
          </div>

          <div className="field">
            <label htmlFor="password">Password</label>
            <input id="password" type="password" value={form.password} onChange={update('password')}
                   autoComplete="new-password" required />
            <span className="field-hint">At least {MIN_PASSWORD_LENGTH} characters.</span>
          </div>

          <div className="field">
            <label htmlFor="confirm">Confirm password</label>
            <input id="confirm" type="password" value={form.confirm} onChange={update('confirm')}
                   autoComplete="new-password" required />
          </div>

          <button type="submit" className="btn btn-primary btn-block" disabled={busy}>
            {busy ? 'Creating account...' : 'Create account'}
          </button>
        </form>

        <p className="auth-switch">
          Already have an account? <Link to="/login">Sign in</Link>
        </p>
      </div>
    </div>
  )
}
