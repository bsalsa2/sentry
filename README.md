# Sentry

AI-powered surveillance monitoring. Point an Outpost — Sentry's camera unit,
runnable on a Raspberry Pi or any similar small Linux box — at your front
door, and get an alert on your phone the moment it sees a person, a vehicle,
a package or an animal.

The Outpost hardware itself hasn't shipped yet; everything here runs today
against the built-in camera simulator, and against real hardware the moment
you have some (see [docs/OUTPOST_SETUP.md](docs/OUTPOST_SETUP.md)).

![Python](https://img.shields.io/badge/backend-Flask-000?logo=flask)
![React](https://img.shields.io/badge/frontend-React-61dafb?logo=react)
![Postgres](https://img.shields.io/badge/database-PostgreSQL-4169e1?logo=postgresql)

---

## What it does

- **Accounts** — sign up, sign in, and only ever see your own cameras
- **Multiple cameras** — add as many Outposts as you like, each with its
  own name, location and sensitivity
- **Live video** — watch any camera in the browser, full-screen on a phone
- **Real-time alerts** — detections appear on screen the instant they happen,
  no refresh, with an optional browser notification and beep
- **Alert history** — filter by camera, detection type, date, or unread
- **Works on a phone** — the whole thing is built mobile-first, and can be
  added to an iPhone home screen

Detection covers five types: **motion, person, vehicle, package, animal**.

---

## Try it in five minutes

You don't need an Outpost to see the whole thing working — there's a
simulator.

**Terminal 1 — the backend:**

```bash
cd backend
python3 -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
python seed.py          # creates a demo account with fake cameras and alerts
python app.py
```

**Terminal 2 — the frontend:**

```bash
cd frontend
npm install
npm run dev
```

Open <http://localhost:3000> and sign in with:

```
demo@sentry.local  /  sentry123
```

**Terminal 3 — pretend to be a camera:**

`seed.py` printed a device key. Use it:

```bash
cd backend
python simulate.py --key <that key>
```

Now watch the dashboard. The camera goes green and alerts arrive live.

---

## How it fits together

```
  Outpost                         Backend (Flask)              Browser (React)
  ───────                         ───────────────              ───────────────
  camera frames
       │
       ├─ detect ──── POST /api/alerts ──────►  save to DB
       │              (X-Device-Key)               │
       │                                           └─ push ──► live alert
       ├─ heartbeat ── POST /api/devices/heartbeat        (Server-Sent Events)
       │               ◄── current settings ──┘
       │
       └─ MJPEG :8000 ◄── GET /api/camera/1/stream ◄──── <img src="...">
```

Three things worth knowing about that diagram:

**The Outpost has its own key, not your password.** Cameras authenticate with
a per-device key (`X-Device-Key`), people authenticate with a login token. A
camera on your porch never holds your account credentials, and a leaked camera
key is rotated on its own.

**Video is proxied, not direct.** The browser asks the backend, and the backend
asks the Outpost. That way the browser never needs the Outpost's home-network
address, and the backend can check you actually own that camera first.

**Live alerts use Server-Sent Events, not WebSockets.** SSE is a normal HTTP
request that stays open. It needs no extra libraries, survives firewalls that
block WebSockets, and the browser reconnects on its own — which matters on a
free hosting tier that occasionally drops connections.

---

## Project layout

```
backend/              Flask API
  app.py                app factory, routes registration, error handling
  models.py             User, Device, Alert
  auth.py               JWT tokens, @login_required, @device_key_required
  events.py             the live-alert pub/sub
  config.py             settings, read from environment variables
  routes/               one file per feature
  tests/                29 pytest tests
  seed.py               demo data
  simulate.py           fake camera, for before the Outpost arrives

frontend/             React app (Vite)
  src/pages/            Login, Signup, Dashboard, DeviceDetail, Alerts, Settings
  src/components/       CameraFeed, AlertHistory, DeviceCard, Navbar
  src/services/         api.js, auth.js, AuthContext, useLiveAlerts
  src/styles/App.css    the whole design system

outpost/outpost_agent.py   the camera agent that runs on the Outpost
docs/                 API reference, deployment guide, Outpost setup guide
```

---

## Running the tests

```bash
cd backend
python -m pytest -q
```

29 tests, covering signup and login, that one user can never see another's
cameras or alerts, input validation, device heartbeats, alert filtering, and
that deleting a camera removes its history.

---

## Deploying

Free tiers all the way: **Supabase** for the database, **Replit** for the
backend, **Vercel** for the frontend.

Step-by-step in **[docs/DEPLOYMENT.md](docs/DEPLOYMENT.md)**.

---

## When the Outpost arrives

**[docs/OUTPOST_SETUP.md](docs/OUTPOST_SETUP.md)** walks through it. Short version:

```bash
sudo apt install -y python3-opencv
pip3 install requests
python3 outpost_agent.py --key YOUR_DEVICE_KEY --server https://your-backend-url
```

It works out of the box with motion detection. Install `ultralytics` and it
upgrades itself to YOLOv8 object detection — telling a person from a car from
a cat — with no code changes.

## Training your own model

The stock YOLOv8 model already handles people, vehicles and animals well. Where
it struggles is **packages** — a parcel on a doorstep isn't one of the 80 objects
it was trained on.

**[docs/TRAINING.md](docs/TRAINING.md)** covers the full path: collect photos
from your own camera (`--collect`), auto-label them with
`outpost/train/autolabel.py`, correct them, train on Colab's free GPU with
`outpost/train/train_sentry_model.ipynb`, then run the Outpost with
`--model best.pt`.

Be warned that it needs a few hundred labelled photos to beat the stock model,
and correcting labels is genuine manual work. The guide is honest about which
parts are worth it.

---

## API

Full reference in **[docs/API.md](docs/API.md)**.

---

## Known limits

Being honest about what this MVP does not do yet:

- **Live alerts need a single server process.** The alert queues live in
  memory, so all browser connections must reach the same worker. The `Procfile`
  pins `--workers 1`. Scaling past that means swapping `events.py` for Redis.
- **The live feed needs the backend to reach the Outpost.** Alerts work from
  anywhere, but video only works when both are on the same network — unless you
  use Tailscale or ngrok. See the end of the deployment guide.
- **No email verification or password reset yet.** Deliberately left out of the
  MVP.
- **Alert snapshots aren't stored.** The `image_url` field exists on every
  alert, but nothing fills it in yet — that needs somewhere to put the images.

---

## Licence

MIT — see [LICENSE](LICENSE).
