# Setting up your Outpost

The Outpost is the little box that watches — whatever hardware it's running
on. Do this once it arrives. About 20 minutes.

Sentry isn't locked to one board. The reference build is a Raspberry Pi, but
the agent is plain Python + OpenCV, so a mini PC, an old laptop, or any other
Linux single-board computer with a camera works exactly the same way. The
notes below call out the couple of steps that are Pi-specific.

## What you need

- A Linux machine to run the Outpost agent on (Raspberry Pi Zero 2 W, 3, 4,
  5, or any similar small PC/SBC)
- A USB webcam, or (on a Raspberry Pi) the official Pi Camera Module
- Power, and WiFi or Ethernet

## 1. Get the Outpost on your network

Boot it, connect it to WiFi, then open a terminal on it and find its address:

```bash
hostname -I
```

You'll get something like `192.168.1.100`. Write it down — Sentry needs it.

That address can change on reboot. To stop that, either reserve it in your
router's settings ("DHCP reservation"), or use its mDNS hostname instead of
the number if it has one (a stock Raspberry Pi OS install answers to
`raspberrypi.local`) — Sentry accepts either.

## 2. Install what the camera agent needs

```bash
sudo apt update
sudo apt install -y python3-opencv python3-pip
pip3 install requests
```

`python3-opencv` from apt is much faster to install on small hardware than
`pip install opencv-python`, which compiles from source and can take an hour.

## 3. Copy the agent onto the Outpost

```bash
git clone https://github.com/bsalsa2/sentry.git
cd sentry/outpost
```

## 4. Register the camera in the web app

1. Open Sentry and go to **Settings**.
2. Under **Add a camera**, enter a name (e.g. "Front Door") and the IP address
   from step 1.
3. Press **Add camera**.
4. **Copy the device key it shows you.** It is displayed once and never again.
   If you lose it, press **New key** on that camera to issue another.

## 5. Start the agent

```bash
python3 outpost_agent.py --key YOUR_DEVICE_KEY --server https://your-backend-url
```

You should see:

```
[camera] Opened camera 0 at 640x480
[detect] Using motion detection
[backend] Connected to https://your-backend-url
[camera] Live video on http://0.0.0.0:8000/stream.mjpg

Watching. Press Ctrl+C to stop.
```

Within 30 seconds the camera turns green in the dashboard. Wave at it, and an
alert should appear.

## 6. Turn on object detection (optional)

By default the agent detects *movement*. To have it identify *what* moved —
people, vehicles, animals, packages — install YOLOv8:

```bash
pip3 install ultralytics
```

Restart the agent. It picks YOLO up automatically and prints:

```
[detect] Using YOLOv8 (people, vehicles, animals, packages)
```

The model file (about 6 MB) downloads itself on first run.

On the smallest boards (e.g. a Pi Zero) this is slow — a second or two per
frame. On a Pi 4/5, or any small PC, it's comfortable. If it struggles, run
with `--no-yolo` to go back to motion detection, which is fast on anything.

## 7. Start it automatically on boot

So it comes back after a power cut. Create the service file:

```bash
sudo nano /etc/systemd/system/sentry.service
```

Paste this, replacing the user, key and URL (`USER` is whatever account you're
logged in as — `pi` on a stock Raspberry Pi OS install, run `whoami` if
you're not sure):

```ini
[Unit]
Description=Sentry Outpost camera agent
After=network-online.target
Wants=network-online.target

[Service]
Type=simple
User=USER
WorkingDirectory=/home/USER/sentry/outpost
ExecStart=/usr/bin/python3 /home/USER/sentry/outpost/outpost_agent.py --key YOUR_DEVICE_KEY --server https://your-backend-url
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
```

Then turn it on:

```bash
sudo systemctl daemon-reload
sudo systemctl enable sentry
sudo systemctl start sentry
sudo systemctl status sentry     # check it's running
```

To watch what it's doing later:

```bash
journalctl -u sentry -f
```

## Options

```
--key KEY          the device key from the Settings page (required)
--server URL       your backend URL (default: http://localhost:5000)
--camera N         which camera to use, usually 0 (default: 0)
--port N           port to serve video on (default: 8000)
--width / --height frame size (default: 640x480)
--cooldown SECS    minimum gap between alerts (default: 20)
--no-yolo          force plain motion detection
--model PATH       use your own trained weights (see docs/TRAINING.md)
--collect DIR      also save each detection frame to DIR, to build a dataset
```

## Problems

**"Could not open camera 0"**
The Outpost can't see the webcam. Check `ls /dev/video*` — if it's empty,
replug the camera. If you're on a Raspberry Pi using the Pi Camera Module
rather than USB, enable it with `sudo raspi-config` → Interface Options →
Camera, then reboot.

**"Device key rejected"**
The key is wrong or was rotated. Get a fresh one with **New key** on the
Settings page.

**Camera shows online, but no video in the browser**
The backend can reach the Outpost for heartbeats (those are outgoing from
the Outpost) but not for video (that's incoming to the Outpost). This is the
usual case when the backend is hosted online and the Outpost is at home. See
the "Adding a camera on your home network" section in
[DEPLOYMENT.md](DEPLOYMENT.md).

**Far too many alerts**
Lower the sensitivity slider on the camera's page, or raise `--cooldown`.
Motion detection triggers on anything that moves, including shadows and trees —
YOLOv8 is much better at ignoring those.

**No alerts at all**
Check the camera isn't muted in the web app (the pill would say "muted"), and
raise the sensitivity.
