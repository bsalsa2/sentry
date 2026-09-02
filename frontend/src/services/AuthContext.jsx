/**
 * Shares "who is logged in" with the whole app.
 *
 * React Context is how you avoid passing the same prop through ten layers of
 * components. Any component can call useAuth() to get the current user.
 */

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'

import * as api from './api'
import { clearSession, getStoredUser, getToken, saveSession } from './auth'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  // Start with whatever was in localStorage so the UI doesn't flash the login
  // page for a moment on every refresh.
  const [user, setUser] = useState(getStoredUser)
  const [loading, setLoading] = useState(Boolean(getToken()))

  // On first load, check the saved token is actually still valid.
  useEffect(() => {
    if (!getToken()) {
      setLoading(false)
      return
    }

    let cancelled = false
    api
      .fetchMe()
      .then(({ user: fresh }) => {
        if (cancelled) return
        setUser(fresh)
        saveSession(getToken(), fresh)
      })
      .catch(() => {
        // Token expired or the server rejected it.
        if (!cancelled) {
          clearSession()
          setUser(null)
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [])

  const signIn = useCallback(async (email, password) => {
    const { token, user: signedIn } = await api.login(email, password)
    saveSession(token, signedIn)
    setUser(signedIn)
    return signedIn
  }, [])

  const signUp = useCallback(async (name, email, password) => {
    const { token, user: created } = await api.signup(name, email, password)
    saveSession(token, created)
    setUser(created)
    return created
  }, [])

  const signOut = useCallback(() => {
    clearSession()
    setUser(null)
  }, [])

  // Used after a password reset: the reset endpoint already hands back a
  // fresh token + user (same shape as signIn/signUp), it just didn't come
  // from api.login().
  const adoptSession = useCallback((token, signedIn) => {
    saveSession(token, signedIn)
    setUser(signedIn)
  }, [])

  // useMemo stops every component re-rendering whenever this file re-runs.
  const value = useMemo(
    () => ({ user, loading, signIn, signUp, signOut, adoptSession }),
    [user, loading, signIn, signUp, signOut, adoptSession],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth() must be used inside <AuthProvider>')
  }
  return context
}
