# Deploying Sentry

Three free services, in this order: **database → backend → frontend**. Each one
needs a value from the step before it, so doing them out of order means going
back.

Budget about 30 minutes the first time.

---

## 1. Database — Supabase (free)

1. Sign up at [supabase.com](https://supabase.com) and create a new project.
   Save the database password it asks you to invent — you need it in a moment
   and it is not shown again.
2. Wait for the project to finish setting up (about two minutes).
3. Press the **Connect** button at the top of the project page.
4. Pick **Session pooler**, not "Direct connection". Copy that string. It looks
   like:
   ```
   postgresql://postgres.abcdefgh:[YOUR-PASSWORD]@aws-0-us-west-1.pooler.supabase.com:5432/postgres
   ```
5. Replace `[YOUR-PASSWORD]` with the password from step 1.

> **Take the Session pooler string, not the other two.** This trips people up
> and the error you get is confusing.
>
> - **Direct connection** (`db.<project>.supabase.co`) only answers on IPv6.
>   Replit is IPv4-only, so it cannot reach it at all — you get a connection
>   timeout that looks like the database is down when it is fine.
> - **Transaction pooler** (port `6543`) is IPv4, but it does not support
>   prepared statements, which SQLAlchemy uses by default. It connects, then
>   throws errors on real queries.
> - **Session pooler** (port `5432`, `...pooler.supabase.com`) is IPv4 *and*
>   keeps a normal session, which is what a long-running Flask server wants.
>   This is the one.

Keep this string somewhere safe for the next step. **Never commit it** — anyone
who has it has your whole database.

> You don't need to create any tables. The backend creates them itself the
> first time it starts.

---

## 2. Backend — Replit (free)

1. Sign up at [replit.com](https://replit.com).
2. **Create Repl → Import from GitHub →** pick your `sentry` repository.
3. Replit reads `.replit` in this repo and knows to run the backend.
4. Open the **Secrets** tab (the padlock) and add:

   | Key | Value |
   |---|---|
   | `DATABASE_URL` | the Supabase URI from step 1 |
   | `JWT_SECRET` | a long random string — see below |
   | `CORS_ORIGINS` | `*` for now; tighten it in step 4 |

   Generate a real `JWT_SECRET` by running this in the Replit shell:
   ```bash
   python -c "import secrets; print(secrets.token_hex(32))"
   ```
   This one matters. It signs every login token, so anyone who knows it can
   log in as anyone. Never reuse the development value.

5. Press **Run**. Replit installs the dependencies and starts the server.
6. Copy the URL it gives you, e.g. `https://sentry-backend.yourname.repl.co`.
7. Check it works — open `<your-url>/api/health` in a browser. You should see:
   ```json
   { "status": "ok", "service": "sentry-backend", "detection_types": [...] }
   ```

> **Set the deployment to a maximum of one instance.** This is the one Replit
> setting that matters for correctness rather than cost, and getting it wrong
> fails silently.
>
> Replit's default "Autoscale" deployment runs more copies of your server as
> traffic grows. Sentry cannot survive that. When a camera reports a detection,
> the server hands that alert straight to the browser connections held open in
> *that process's* memory (see `backend/events.py`). There is no shared message
> broker behind it. With two instances running, your Outpost's alert can land on
> instance A while your browser's live connection is held by instance B — and
> the alert is simply never delivered. Nothing errors. Nothing appears in the
> logs. The alert just vanishes.
>
> So in the deployment settings, set **max instances / max machines to 1**.
> Everything works correctly after that. If you ever genuinely need more than
> one instance, that is the point to replace `events.py` with Redis pub/sub —
> not before.

> **Free-tier note:** Replit puts a free Repl to sleep after a period of
> inactivity. The first request afterwards takes a few seconds to wake it, and
> live alerts stop arriving while it sleeps. That is fine for testing. When you
> want cameras running around the clock, either upgrade Replit or deploy the
> same code to [Render](https://render.com) or [Fly.io](https://fly.io), both
> of which have free tiers that stay awake longer. The `Procfile` in `backend/`
> works on all of them unchanged.

---

## 3. Frontend — Vercel (free)

1. Sign up at [vercel.com](https://vercel.com) with your GitHub account.
2. **Add New → Project →** import the `sentry` repository.
3. Set **Root Directory** to `frontend`. This is the one setting people miss —
   without it Vercel looks for the app in the repository root and the build
   fails.
4. Vercel detects Vite automatically. Leave the build settings alone.
5. Add an environment variable:

   | Key | Value |
   |---|---|
   | `VITE_API_URL` | your Replit URL from step 2, **with no trailing slash** |

6. **Deploy.** You get a URL like `https://sentry-braden.vercel.app`.

From now on, every push to GitHub redeploys the frontend automatically.

---

## 4. Lock down CORS

Go back to Replit's Secrets and change `CORS_ORIGINS` from `*` to your actual
Vercel URL:

```
CORS_ORIGINS=https://sentry-braden.vercel.app
```

Restart the Repl. This stops any other website from making requests to your API
using a signed-in user's browser.

---

## 5. Check it end to end

1. Open your Vercel URL.
2. Create an account.
3. Add a camera (any IP address — it doesn't need to exist yet).
4. Copy the device key it shows you.
5. Simulate a camera from your own laptop:
   ```bash
   cd backend
   python simulate.py --key <the device key> --url https://your-backend-url
   ```
6. Watch the dashboard. The camera should turn green, and alerts should appear
   within a few seconds **without refreshing the page**.

If that works, the whole system works — the only thing left is swapping the
simulator for a real Outpost. See [OUTPOST_SETUP.md](OUTPOST_SETUP.md).

---

## Adding a camera on your home network

The Outpost lives on your home WiFi, but the backend is on the internet. The
two directions work differently:

- **Outpost → backend** (heartbeats and alerts): always works. The Outpost
  makes outgoing requests, and home routers allow those.
- **Backend → Outpost** (the live video feed): only works when the backend
  can reach the Outpost's address. From the public internet it cannot,
  because your router blocks incoming connections.

So alerts work everywhere straight away, but the live feed only works when
the backend and the Outpost are on the same network — that is, when you run
the backend locally.

To get the live feed working from anywhere, pick one:

- **[Tailscale](https://tailscale.com)** (free, recommended) — puts the
  Outpost and the backend on the same private network. Install it on both,
  then use the Outpost's Tailscale IP as the camera's address in Sentry.
- **[ngrok](https://ngrok.com)** (free tier) — run `ngrok http 8000` on the
  Outpost and use the URL it gives you.
- **Port forwarding** on your router — works, but exposes the Outpost to the
  whole internet. Ask whoever owns the router first, and prefer one of the
  options above.

---

## Common problems

**"Can't reach the server" in the browser**
`VITE_API_URL` is wrong, or has a trailing slash. Check it in Vercel's settings,
then redeploy (changing a variable does not redeploy on its own).

**CORS error in the browser console**
`CORS_ORIGINS` on the backend doesn't match your Vercel URL exactly. It must
include `https://` and no trailing slash.

**Login works, then everything says "Not logged in"**
`JWT_SECRET` changed between requests. Every restart with a different secret
invalidates all existing tokens. Set it as a Secret so it stays the same.

**Live alerts never arrive, but refreshing shows them**
The backend is running with more than one worker. The alert queues live in one
process's memory (see `backend/events.py`), so all connections must land on the
same worker. Keep `--workers 1` in the `Procfile`.

**Backend starts, but database errors**
Check `DATABASE_URL` still has your real password in it, not the literal text
`[YOUR-PASSWORD]`.
