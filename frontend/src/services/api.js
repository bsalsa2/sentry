/**
 * All communication with the Flask backend lives here.
 *
 * Keeping it in one file means that if the API ever changes, there is exactly
 * one place to update - the components never build URLs themselves.
 */

import { getToken, logout } from './auth'

// In development this is empty, and vite.config.js forwards /api to
// localhost:5000. In production Vercel injects our real backend URL.
export const API_URL = (import.meta.env.VITE_API_URL || '').replace(/\/$/, '')

/**
 * True when the app has been deployed but nobody has told it where the backend
 * lives yet. In development an empty API_URL is correct (the dev server
 * proxies /api), so this only ever fires on a real deployment.
 */
export const BACKEND_NOT_CONFIGURED = import.meta.env.PROD && !API_URL

/** Build a full URL for an API path, e.g. '/api/devices'. */
export function apiUrl(path) {
  return `${API_URL}${path}`
}

/**
 * Some browser features (<img src> and EventSource) can't send an
 * Authorization header, so for those we put the token in the URL instead.
 */
export function apiUrlWithToken(path) {
  const token = getToken()
  const separator = path.includes('?') ? '&' : '?'
  return apiUrl(`${path}${separator}token=${encodeURIComponent(token || '')}`)
}

/** An error that carries the HTTP status code, so callers can react to it. */
export class ApiError extends Error {
  constructor(message, status) {
    super(message)
    this.name = 'ApiError'
    this.status = status
  }
}

/**
 * The one function every API call goes through.
 * Adds the login token, parses JSON, and turns failures into ApiError.
 */
async function request(path, options = {}) {
  // Fail with a useful message rather than firing a request at nowhere.
  if (BACKEND_NOT_CONFIGURED) {
    throw new ApiError(
      'This site has no backend connected yet. Set VITE_API_URL in your Vercel '
        + 'project settings to your backend URL, then redeploy.',
      0,
    )
  }

  const token = getToken()

  const headers = { ...(options.headers || {}) }
  if (options.body) headers['Content-Type'] = 'application/json'
  if (token) headers['Authorization'] = `Bearer ${token}`

  let response
  try {
    response = await fetch(apiUrl(path), { ...options, headers })
  } catch {
    // fetch only throws like this when the network itself failed.
    throw new ApiError("Can't reach the server. Is the backend running?", 0)
  }

  // 204 = success with no content to parse.
  const body = response.status === 204 ? {} : await response.json().catch(() => ({}))

  if (!response.ok) {
    // Our token expired or is invalid - send the user back to the login page.
    if (response.status === 401 && token) logout()
    throw new ApiError(body.error || `Request failed (${response.status})`, response.status)
  }

  return body
}

const get = (path) => request(path)
const post = (path, data) => request(path, { method: 'POST', body: JSON.stringify(data ?? {}) })
const put = (path, data) => request(path, { method: 'PUT', body: JSON.stringify(data ?? {}) })
const del = (path) => request(path, { method: 'DELETE' })

// --- Auth -----------------------------------------------------------------

export const signup = (name, email, password) =>
  post('/api/auth/signup', { name, email, password })

export const login = (email, password) => post('/api/auth/login', { email, password })

export const fetchMe = () => get('/api/auth/me')

export const requestPasswordReset = (email) => post('/api/auth/forgot-password', { email })

export const resetPassword = (token, password) =>
  post('/api/auth/reset-password', { token, password })

// --- Devices --------------------------------------------------------------

export const fetchDevices = () => get('/api/devices')

export const fetchDevice = (id) => get(`/api/devices/${id}`)

export const createDevice = (device) => post('/api/devices', device)

export const updateDevice = (id, changes) => put(`/api/devices/${id}`, changes)

export const deleteDevice = (id) => del(`/api/devices/${id}`)

export const rotateDeviceKey = (id) => post(`/api/devices/${id}/rotate-key`)

// --- Alerts ---------------------------------------------------------------

/**
 * Fetch alert history.
 * `filters` may contain: device_id, type, since, until, unacknowledged, limit, offset.
 */
export function fetchAlerts(filters = {}) {
  const params = new URLSearchParams()
  Object.entries(filters).forEach(([key, value]) => {
    // Skip anything empty so we don't send "?type=" with no value.
    if (value !== '' && value !== null && value !== undefined) {
      params.append(key, value)
    }
  })
  const query = params.toString()
  return get(`/api/alerts${query ? `?${query}` : ''}`)
}

export const fetchStats = () => get('/api/alerts/stats')

/** Hourly detection counts for the activity chart. */
export const fetchTimeseries = (hours = 24) => get(`/api/alerts/timeseries?hours=${hours}`)

export const acknowledgeAlert = (id) => post(`/api/alerts/${id}/ack`)

// --- Camera ---------------------------------------------------------------

/** URL for the live MJPEG feed - goes straight into an <img src>. */
export const cameraStreamUrl = (deviceId) =>
  apiUrlWithToken(`/api/camera/${deviceId}/stream`)

export const cameraStatus = (deviceId) => get(`/api/camera/${deviceId}/status`)

/** URL the live-alerts EventSource connects to. */
export const alertStreamUrl = () => apiUrlWithToken('/api/alerts/stream')
