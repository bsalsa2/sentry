#!/usr/bin/env python3
"""
Sentry - Raspberry Pi camera agent.

Run this on the Raspberry Pi. It does three jobs at once:

  1. Watches the camera and decides when something interesting happened.
  2. Posts those detections to the Sentry backend, so they appear in the web app.
  3. Serves the live video on port 8000, so the web app can show the feed.

Quick start on the Pi:

    sudo apt install -y python3-opencv
    pip install requests
    python3 sentry_pi.py --key YOUR_DEVICE_KEY --server https://your-backend-url

Get YOUR_DEVICE_KEY from the Settings page after adding the camera.

Detection:
  Out of the box this uses motion detection, which needs no extra downloads
  and runs fine on a Pi. If you install ultralytics ("pip install ultralytics")
  it will also identify people, vehicles, packages and animals with YOLOv8.
  Pass --no-yolo to force plain motion detection.
"""

import argparse
import os
import socketserver
import sys
import threading
import time
from http.server import BaseHTTPRequestHandler, HTTPServer

try:
    import cv2
except ImportError:
    print("OpenCV is missing. Install it with:  sudo apt install -y python3-opencv")
    sys.exit(1)

try:
    import requests
except ImportError:
    print("The requests library is missing. Install it with:  pip install requests")
    sys.exit(1)


# The five things Sentry reports. A model you train yourself should use
# exactly these names, in this order, so the Pi and the backend agree.
SENTRY_CLASSES = ["motion", "person", "vehicle", "package", "animal"]


# --- Shared state ---------------------------------------------------------
# The camera loop writes the newest frame here; the web server reads it.
# A Lock stops one thread reading a half-written frame.
class SharedFrame:
    def __init__(self):
        self.jpeg = None
        self.lock = threading.Lock()

    def set(self, jpeg_bytes):
        with self.lock:
            self.jpeg = jpeg_bytes

    def get(self):
        with self.lock:
            return self.jpeg


shared_frame = SharedFrame()

# Settings the backend sends us on each heartbeat. Changing sensitivity in the
# web app therefore reaches the camera within ~30 seconds, with no restart.
settings = {"sensitivity": 60, "enabled": True}
settings_lock = threading.Lock()


def current_settings():
    with settings_lock:
        return dict(settings)


# --- The video server the web app connects to -----------------------------

class ThreadedHTTPServer(socketserver.ThreadingMixIn, HTTPServer):
    """One thread per viewer, so a slow browser can't freeze the others."""

    daemon_threads = True
    allow_reuse_address = True


class CameraHandler(BaseHTTPRequestHandler):
    def log_message(self, *_args):
        pass  # silence the default per-request logging - it's very noisy

    def do_GET(self):
        if self.path.startswith("/stream.mjpg"):
            self.serve_stream()
        elif self.path.startswith("/snapshot.jpg"):
            self.serve_snapshot()
        elif self.path.startswith("/health"):
            self.serve_health()
        else:
            self.send_error(404)

    def serve_health(self):
        import json

        body = json.dumps({
            "ok": True,
            "camera": shared_frame.get() is not None,
            "settings": current_settings(),
        }).encode()

        self.send_response(200)
        self.send_header("Content-Type", "application/json")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def serve_snapshot(self):
        jpeg = shared_frame.get()
        if jpeg is None:
            self.send_error(503, "No frame yet")
            return

        self.send_response(200)
        self.send_header("Content-Type", "image/jpeg")
        self.send_header("Content-Length", str(len(jpeg)))
        self.send_header("Cache-Control", "no-cache")
        self.end_headers()
        self.wfile.write(jpeg)

    def serve_stream(self):
        """
        MJPEG: send JPEG after JPEG down one long-lived response, each
        separated by a marker line. Browsers show this in a plain <img>.
        """
        self.send_response(200)
        self.send_header("Age", "0")
        self.send_header("Cache-Control", "no-cache, private")
        self.send_header("Content-Type", "multipart/x-mixed-replace; boundary=frame")
        self.end_headers()

        try:
            while True:
                jpeg = shared_frame.get()
                if jpeg is None:
                    time.sleep(0.1)
                    continue

                self.wfile.write(b"--frame\r\n")
                self.wfile.write(b"Content-Type: image/jpeg\r\n")
                self.wfile.write(f"Content-Length: {len(jpeg)}\r\n\r\n".encode())
                self.wfile.write(jpeg)
                self.wfile.write(b"\r\n")

                time.sleep(0.1)  # roughly 10 frames per second
        except (BrokenPipeError, ConnectionResetError):
            pass  # the viewer closed the tab - completely normal


def start_video_server(port):
    server = ThreadedHTTPServer(("0.0.0.0", port), CameraHandler)
    thread = threading.Thread(target=server.serve_forever, daemon=True)
    thread.start()
    print(f"[camera] Live video on http://0.0.0.0:{port}/stream.mjpg")
    return server


# --- Talking to the backend -----------------------------------------------

class Backend:
    def __init__(self, url, key):
        self.url = url.rstrip("/")
        self.headers = {"X-Device-Key": key}

    def heartbeat(self):
        """
        Say "I'm alive" and pick up any settings changes made in the web app.

        Returns one of:
            "ok"          - the backend answered and accepted our key
            "unreachable" - couldn't reach the backend (WiFi down, server asleep)
            "rejected"    - the backend says our device key is wrong
        """
        try:
            response = requests.post(
                f"{self.url}/api/devices/heartbeat", headers=self.headers, timeout=10
            )
        except requests.RequestException as error:
            print(f"[backend] heartbeat failed: {error}")
            return "unreachable"

        if response.status_code == 401:
            print("[backend] Device key rejected. Check the key on the Settings page.")
            return "rejected"

        if not response.ok:
            print(f"[backend] heartbeat error {response.status_code}")
            return "unreachable"

        new_settings = response.json().get("settings", {})
        with settings_lock:
            settings.update(new_settings)

        return "ok"

    def send_alert(self, detection_type, confidence, note=""):
        try:
            response = requests.post(
                f"{self.url}/api/alerts",
                json={
                    "detection_type": detection_type,
                    "confidence": round(float(confidence), 3),
                    "note": note,
                },
                headers=self.headers,
                timeout=10,
            )
            if response.ok:
                print(f"[alert] {detection_type} ({confidence:.0%}) sent")
            else:
                print(f"[alert] rejected: {response.status_code} {response.text[:120]}")
        except requests.RequestException as error:
            print(f"[alert] failed to send: {error}")


def heartbeat_loop(backend, interval=30):
    """
    Runs in the background, checking in every `interval` seconds.

    A network blip is not a reason to give up - we keep retrying. Only a
    rejected key means something a human has to fix, so we stop there.
    """
    while True:
        if backend.heartbeat() == "rejected":
            return
        time.sleep(interval)


# --- Detection ------------------------------------------------------------

class MotionDetector:
    """
    Detects movement by comparing each frame to the one before it.

    Cheap enough to run on a Pi with no extra libraries: blur both frames to
    ignore video noise, subtract them, and see how much actually changed.
    """

    def __init__(self):
        self.previous = None

    def check(self, frame, sensitivity):
        grey = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)
        grey = cv2.GaussianBlur(grey, (21, 21), 0)

        if self.previous is None:
            self.previous = grey
            return None

        difference = cv2.absdiff(self.previous, grey)
        self.previous = grey

        # Anything that changed by more than `threshold` counts as movement.
        # Higher sensitivity -> lower threshold -> notices smaller changes.
        threshold = max(8, 60 - int(sensitivity * 0.5))
        _, mask = cv2.threshold(difference, threshold, 255, cv2.THRESH_BINARY)

        changed_fraction = float(mask.sum()) / 255.0 / mask.size

        # Ignore tiny flickers (a leaf, a shadow); require a real patch to move.
        min_fraction = max(0.002, 0.05 - sensitivity * 0.0004)
        if changed_fraction < min_fraction:
            return None

        # Report how sure we are. Scaled so that a person-sized movement
        # (a few percent of the frame) reads around 60-70%, and only something
        # filling the view approaches certainty.
        confidence = min(0.99, 0.5 + changed_fraction * 1.6)
        return ("motion", confidence, f"{changed_fraction:.1%} of the frame moved")


class YoloDetector:
    """
    Optional: identifies *what* moved using YOLOv8.

    Only used if the `ultralytics` package is installed. The model file
    downloads itself the first time it runs (about 6 MB).
    """

    # YOLO knows 80 object names; these are the ones a security camera cares
    # about, mapped onto Sentry's five detection types.
    CLASS_MAP = {
        "person": "person",
        "car": "vehicle", "truck": "vehicle", "bus": "vehicle",
        "motorcycle": "vehicle", "bicycle": "vehicle",
        "dog": "animal", "cat": "animal", "bird": "animal", "horse": "animal",
        "suitcase": "package", "backpack": "package", "handbag": "package",
    }

    def __init__(self, model_name="yolov8n.pt"):
        from ultralytics import YOLO

        print(f"[detect] Loading {model_name} (first run downloads it)...")
        self.model = YOLO(model_name)

        # A model you trained yourself already uses Sentry's own class names
        # (person/vehicle/package/animal), so the COCO translation below would
        # only get in the way. Detect that and skip it.
        names = set(self.model.names.values())
        self.is_custom = names.issubset(set(SENTRY_CLASSES))
        if self.is_custom:
            print(f"[detect] Custom Sentry model, classes: {sorted(names)}")

    def check(self, frame, sensitivity):
        # Sensitivity 1-100 becomes a confidence floor of 0.75 down to 0.26.
        min_confidence = max(0.25, 1.0 - sensitivity / 100.0 * 0.75)

        results = self.model(frame, verbose=False, conf=min_confidence)

        best = None
        for result in results:
            for box in result.boxes:
                label = result.names[int(box.cls)]

                if self.is_custom:
                    detection_type = label  # already a Sentry class name
                else:
                    detection_type = self.CLASS_MAP.get(label)

                if detection_type is None:
                    continue

                confidence = float(box.conf)
                if best is None or confidence > best[1]:
                    best = (detection_type, confidence, f"detected: {label}")

        return best


# --- Collecting training data --------------------------------------------

class Collector:
    """
    Saves a copy of every frame that triggered a detection.

    This is how you build a dataset to train your own model on. The images come
    from your actual camera, pointed at your actual front door, which is what
    makes a custom model better than the generic one - it has seen your
    driveway, your lighting, your neighbour's cat.

    Files land in:  <dir>/images/<type>_<timestamp>.jpg

    See docs/TRAINING.md for what to do with them afterwards.
    """

    def __init__(self, directory):
        self.directory = os.path.join(directory, "images")
        os.makedirs(self.directory, exist_ok=True)
        self.saved = 0
        print(f"[collect] Saving detection frames to {self.directory}")

    def save(self, frame, detection_type):
        stamp = time.strftime("%Y%m%d-%H%M%S")
        # Include the count so two detections in the same second don't collide.
        name = f"{detection_type}_{stamp}_{self.saved:05d}.jpg"
        path = os.path.join(self.directory, name)

        if cv2.imwrite(path, frame):
            self.saved += 1
            if self.saved % 25 == 0:
                print(f"[collect] {self.saved} images saved so far")


# --- Main loop ------------------------------------------------------------

def main():
    parser = argparse.ArgumentParser(description="Sentry Raspberry Pi camera agent.")
    parser.add_argument("--key", required=True, help="device key from the Settings page")
    parser.add_argument("--server", default="http://localhost:5000", help="backend URL")
    parser.add_argument("--camera", type=int, default=0, help="which camera (usually 0)")
    parser.add_argument("--port", type=int, default=8000, help="port to serve video on")
    parser.add_argument("--width", type=int, default=640)
    parser.add_argument("--height", type=int, default=480)
    parser.add_argument(
        "--cooldown", type=float, default=20.0,
        help="minimum seconds between alerts, so one event isn't reported 50 times",
    )
    parser.add_argument("--no-yolo", action="store_true", help="use motion detection only")
    parser.add_argument(
        "--model", default="yolov8n.pt",
        help="which YOLO weights to use - point this at your own trained "
             "model (e.g. sentry_best.pt) once you have one",
    )
    parser.add_argument(
        "--collect", metavar="DIR", default=None,
        help="also save every detection as an image in DIR, to build a "
             "training dataset (see docs/TRAINING.md)",
    )
    args = parser.parse_args()

    # --- Open the camera ---
    capture = cv2.VideoCapture(args.camera)
    capture.set(cv2.CAP_PROP_FRAME_WIDTH, args.width)
    capture.set(cv2.CAP_PROP_FRAME_HEIGHT, args.height)

    if not capture.isOpened():
        print(f"Could not open camera {args.camera}. Is it plugged in?")
        return 1

    print(f"[camera] Opened camera {args.camera} at {args.width}x{args.height}")

    # --- Pick a detector ---
    detector = MotionDetector()
    if not args.no_yolo:
        try:
            detector = YoloDetector(args.model)
            print("[detect] Using YOLOv8 (people, vehicles, animals, packages)")
        except Exception as error:
            print(f"[detect] YOLO unavailable ({error}); using motion detection")
    else:
        print("[detect] Using motion detection")

    collector = Collector(args.collect) if args.collect else None

    # --- Connect to the backend ---
    backend = Backend(args.server, args.key)
    first_beat = backend.heartbeat()

    if first_beat == "rejected":
        return 1
    if first_beat == "unreachable":
        # Keep going: the Pi may boot before the home WiFi is ready, and the
        # heartbeat thread below will keep trying.
        print(f"[backend] {args.server} isn't answering yet - will keep retrying.")
    else:
        print(f"[backend] Connected to {args.server}")

    threading.Thread(target=heartbeat_loop, args=(backend,), daemon=True).start()
    start_video_server(args.port)

    last_alert_at = 0.0

    print("\nWatching. Press Ctrl+C to stop.\n")

    try:
        while True:
            ok, frame = capture.read()
            if not ok:
                print("[camera] Dropped a frame; retrying...")
                time.sleep(0.5)
                continue

            # Publish the frame for anyone watching the live feed.
            encoded, buffer = cv2.imencode(".jpg", frame, [cv2.IMWRITE_JPEG_QUALITY, 70])
            if encoded:
                shared_frame.set(buffer.tobytes())

            live = current_settings()
            if not live.get("enabled", True):
                # Camera is muted in the web app: keep streaming video, but
                # don't bother running detection.
                time.sleep(0.2)
                continue

            # Don't re-report the same event over and over.
            if time.time() - last_alert_at < args.cooldown:
                time.sleep(0.05)
                continue

            result = detector.check(frame, live.get("sensitivity", 60))
            if result:
                detection_type, confidence, note = result
                backend.send_alert(detection_type, confidence, note)
                if collector:
                    collector.save(frame, detection_type)
                last_alert_at = time.time()

            time.sleep(0.05)  # roughly 20 checks a second - plenty, and easy on the CPU

    except KeyboardInterrupt:
        print("\nStopping.")
    finally:
        capture.release()

    return 0


if __name__ == "__main__":
    sys.exit(main())
