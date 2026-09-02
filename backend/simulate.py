"""
Fake camera simulator - stands in for the Outpost until it arrives.

It pretends to be a real camera: it sends heartbeats so the device shows as
online, and posts a detection every so often so you can watch alerts appear
live in the browser.

    cd backend
    python simulate.py --key <device api key>

Get the key from the Settings page in the web app (or from `python seed.py`).
"""

import argparse
import random
import sys
import time

import requests

DETECTIONS = [
    ("motion", 0.55, 0.80),
    ("person", 0.75, 0.97),
    ("vehicle", 0.70, 0.95),
    ("animal", 0.60, 0.90),
    ("package", 0.65, 0.92),
]


def main() -> int:
    parser = argparse.ArgumentParser(description="Pretend to be a Sentry camera.")
    parser.add_argument("--key", required=True, help="the device's API key")
    parser.add_argument("--url", default="http://localhost:5000", help="backend URL")
    parser.add_argument(
        "--every", type=float, default=15.0,
        help="average seconds between fake detections (default: 15)",
    )
    args = parser.parse_args()

    headers = {"X-Device-Key": args.key}
    print(f"Simulating a camera against {args.url}. Press Ctrl+C to stop.\n")

    while True:
        # Heartbeat: tells the dashboard this camera is online.
        try:
            beat = requests.post(
                f"{args.url}/api/devices/heartbeat", headers=headers, timeout=5
            )
            if beat.status_code == 401:
                print("That device key was rejected. Check you copied it correctly.")
                return 1
        except requests.RequestException as error:
            print(f"Can't reach the backend ({error}). Retrying in 5s...")
            time.sleep(5)
            continue

        # Every so often, "detect" something.
        detection_type, low, high = random.choice(DETECTIONS)
        payload = {
            "detection_type": detection_type,
            "confidence": round(random.uniform(low, high), 3),
            "note": "simulated detection",
        }

        try:
            response = requests.post(
                f"{args.url}/api/alerts", json=payload, headers=headers, timeout=5
            )
            if response.ok:
                print(f"  sent {detection_type} ({payload['confidence']})")
            else:
                print(f"  rejected: {response.status_code} {response.text[:120]}")
        except requests.RequestException as error:
            print(f"  failed to send: {error}")

        # Wait a random-ish amount so the alert list doesn't look robotic.
        time.sleep(max(2.0, random.uniform(args.every * 0.5, args.every * 1.5)))


if __name__ == "__main__":
    try:
        sys.exit(main())
    except KeyboardInterrupt:
        print("\nStopped.")
