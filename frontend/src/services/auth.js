/**
 * Login state.
 *
 * We keep the JWT token in localStorage so a page refresh doesn't log the
 * user out. Components should use the useAuth() hook (see AuthContext.jsx)
 * rather than calling these directly.
 */

const TOKEN_KEY = 'sentry.token'
const USER_KEY = 'sentry.user'

export function getToken() {
  try {
    return localStorage.getItem(TOKEN_KEY)
  } catch {
    // Private browsing mode can block localStorage entirely.
    return null
  }
}

export function getStoredUser() {
  try {
    const raw = localStorage.getItem(USER_KEY)
    return raw ? JSON.parse(raw) : null
  } catch {
    return null
  }
}

export function saveSession(token, user) {
  try {
    localStorage.setItem(TOKEN_KEY, token)
    localStorage.setItem(USER_KEY, JSON.stringify(user))
  } catch {
    // Nothing we can do - the user just won't stay logged in after a refresh.
  }
}

export function clearSession() {
  try {
    localStorage.removeItem(TOKEN_KEY)
    localStorage.removeItem(USER_KEY)
  } catch {
    /* ignore */
  }
}

/**
 * Log out and go back to the login page.
 *
 * We use a hard redirect rather than React Router because this can be called
 * from api.js, which sits outside the React component tree.
 */
export function logout() {
  clearSession()
  if (window.location.pathname !== '/login') {
    window.location.href = '/login'
  }
}

export const isLoggedIn = () => Boolean(getToken())
