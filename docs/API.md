# Sentry API reference

Base URL:
- Local development: `http://localhost:5000`
- Production: your Replit/Render URL, e.g. `https://sentry-backend.replit.dev`

All request and response bodies are JSON.

## Two kinds of authentication

Sentry has two sorts of caller, so there are two ways to prove who you are:

| Caller | Header | Where it comes from |
|---|---|---|
| A person using the web app | `Authorization: Bearer <jwt>` | `/api/auth/login` |
| An Outpost camera | `X-Device-Key: <key>` | shown once when the device is added |

This split matters: a camera sitting on your porch should never hold your
account password. If a camera key leaks, you rotate that one key and nothing
else is affected.

Two endpoints also accept `?token=<jwt>` in the URL instead of the header —
the camera stream and the live alert stream. That is not laziness: browser
`<img>` tags and `EventSource` cannot send custom headers.

---

## Auth

### `POST /api/auth/signup`
```json
{ "name": "Braden", "email": "braden@example.com", "password": "at-least-8-chars" }
```
→ `201` `{ "token": "...", "user": { "id": 1, "email": "...", "name": "..." } }`

Errors: `400` bad input · `409` email already registered

### `POST /api/auth/login`
```json
{ "email": "braden@example.com", "password": "..." }
```
→ `200` `{ "token": "...", "user": {...} }` · `401` if wrong

### `GET /api/auth/me`  *(requires login)*
→ `200` `{ "user": {...} }` — used on page load to check a saved token still works.

---

## Devices

### `GET /api/devices`  *(requires login)*
→ `{ "devices": [ { "id": 1, "name": "Front Door", "location": "Porch",
     "ip_address": "192.168.1.100", "sensitivity": 70, "enabled": true,
     "status": "online", "last_seen": "...", "alerts_24h": 6 } ] }`

`status` is worked out from `last_seen`: a camera that hasn't checked in for
90 seconds is reported as `offline`.

### `POST /api/devices`  *(requires login)*
```json
{ "name": "Front Door", "location": "Porch",
  "ip_address": "192.168.1.100", "sensitivity": 70 }
```
→ `201` `{ "device": { ..., "api_key": "..." }, "reachable": false, "message": "..." }`

**`api_key` is only ever returned here** (and from `/rotate-key`). Copy it into
the Outpost. `reachable` reports whether anything answered at that address —
a `false` is not an error, it just means the Outpost isn't running yet.

### `PUT /api/devices/{id}`  *(requires login)*
Any subset of `name`, `location`, `ip_address`, `sensitivity` (1–100), `enabled`.

### `DELETE /api/devices/{id}`  *(requires login)*
Deletes the camera **and its alert history**.

### `POST /api/devices/{id}/rotate-key`  *(requires login)*
Issues a fresh key. The old one stops working immediately, so update the Outpost.

### `POST /api/devices/heartbeat`  *(device key)*
Called by the Outpost every ~30 seconds.
→ `{ "ok": true, "settings": { "name": "...", "sensitivity": 70, "enabled": true } }`

The response carries the current settings, which is how a sensitivity change
made in the web app reaches the camera without restarting it.

---

## Alerts

### `GET /api/alerts`  *(requires login)*
Query parameters, all optional and combinable:

| Parameter | Example | Meaning |
|---|---|---|
| `device_id` | `3` | only this camera |
| `type` | `person,vehicle` | only these detection types |
| `since` / `until` | `2026-08-01` | date range |
| `unacknowledged` | `1` | only alerts not yet ticked off |
| `limit` / `offset` | `50` / `0` | paging (limit caps at 200) |

→ `{ "alerts": [...], "total": 128, "limit": 50, "offset": 0 }`

### `POST /api/alerts`  *(device key)*
```json
{ "detection_type": "person", "confidence": 0.91,
  "note": "front path", "image_url": null }
```
`detection_type` must be one of `motion`, `person`, `vehicle`, `package`, `animal`.

→ `201` stored, and pushed live to the owner's open browser tabs
→ `202` `{ "stored": false }` if the camera is muted (this is a success, not an error)
→ `400` unknown detection type · `401` bad device key

### `POST /api/alerts/{id}/ack`  *(requires login)*
Marks one alert as seen.

### `GET /api/alerts/stats`  *(requires login)*
→ `{ "devices_total": 2, "devices_online": 1, "alerts_24h": 18,
     "alerts_unacknowledged": 7, "by_type_24h": { "person": 5, ... } }`

### `GET /api/alerts/stream?token=<jwt>`
Server-Sent Events. Open it once and leave it open; the server writes a line
whenever one of your cameras detects something.

```js
const source = new EventSource(`${API}/api/alerts/stream?token=${token}`)
source.addEventListener('alert', (e) => console.log(JSON.parse(e.data)))
```

Events: `connected` (once, on open) and `alert` (one per detection). A comment
line is sent every 20 seconds to stop hosting platforms closing an idle
connection.

---

## Camera

### `GET /api/camera/{id}/stream?token=<jwt>`
Relays the Outpost's MJPEG video. Drop it straight into an `<img src="...">`.
The backend sits in the middle so the browser never needs to know — or be able
to reach — the Outpost's address on your home network.

→ `503` if the camera isn't answering · `404` if it isn't your camera

### `GET /api/camera/{id}/snapshot?token=<jwt>`
One still JPEG. Cheaper than the full stream.

### `GET /api/camera/{id}/status?token=<jwt>`
→ `{ "device_id": 1, "camera_online": true, "detail": {...} }`

---

## Errors

Every error is JSON with the same shape, so the frontend can always show
something useful:

```json
{ "error": "Incorrect email or password." }
```

| Code | Meaning |
|---|---|
| `400` | something in the request was wrong |
| `401` | not signed in, or bad device key |
| `404` | doesn't exist, **or isn't yours** |
| `409` | already exists (duplicate email or camera address) |
| `503` | the camera isn't responding |

Note the `404`: asking for someone else's device gives exactly the same answer
as asking for a device that doesn't exist. Otherwise the difference between the
two would let someone probe for which cameras exist.
