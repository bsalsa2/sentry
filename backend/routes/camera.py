"""
Live camera feed.

The Outpost serves an MJPEG stream (a never-ending sequence of JPEG frames)
on http://<outpost-ip>:8000/stream.mjpg. This backend sits in the middle and
passes it through to the browser, so that:

  - the browser never needs to know the Outpost's private home IP address, and
  - we can check the user actually owns that camera first.

    GET /api/camera/<device_id>/stream    live MJPEG video
    GET /api/camera/<device_id>/snapshot  a single still frame
    GET /api/camera/<device_id>/status    is the camera reachable right now?
"""

import requests
from flask import Blueprint, Response, current_app, jsonify, stream_with_context

from auth import current_user
from models import Device, db

bp = Blueprint("camera", __name__, url_prefix="/api/camera")


def _owned_device(device_id: int) -> Device | None:
    """
    Find the camera, but only if the requester owns it.

    This route is used by <img src="..."> tags, which cannot send an
    Authorization header, so the token comes in the URL instead. current_user()
    already understands both.
    """
    user = current_user()
    if user is None:
        return None
    return db.session.query(Device).filter_by(id=device_id, user_id=user.id).first()


def _device_url(device: Device, path: str) -> str:
    port = current_app.config["CAMERA_PORT"]
    return f"http://{device.ip_address}:{port}{path}"


@bp.get("/<int:device_id>/status")
def status(device_id):
    """
    Ask the Outpost if its camera is working. The frontend uses this to
    decide between showing real video and showing the 'no signal' placeholder.
    """
    device = _owned_device(device_id)
    if device is None:
        return jsonify({"error": "Device not found."}), 404

    try:
        response = requests.get(
            _device_url(device, "/health"), timeout=current_app.config["CAMERA_TIMEOUT"]
        )
        online = response.ok
        detail = response.json() if online else {}
    except requests.RequestException:
        online = False
        detail = {}

    return jsonify({
        "device_id": device.id,
        "camera_online": online,
        "detail": detail,
    })


@bp.get("/<int:device_id>/stream")
def stream(device_id):
    """
    Pipe the Outpost's live MJPEG video through to the browser.

    We read the Outpost's response in small chunks and forward each one
    immediately rather than waiting for the whole thing - a live stream
    never "finishes".
    """
    device = _owned_device(device_id)
    if device is None:
        return jsonify({"error": "Device not found."}), 404

    try:
        upstream = requests.get(
            _device_url(device, "/stream.mjpg"),
            stream=True,
            timeout=current_app.config["CAMERA_TIMEOUT"],
        )
        upstream.raise_for_status()
    except requests.RequestException:
        # 503 = "the camera is there in our records, but not answering".
        # The frontend turns this into the placeholder view.
        return jsonify({
            "error": "Camera is not responding.",
            "hint": "Check the Outpost is powered on and running outpost_agent.py.",
        }), 503

    # Keep whatever multipart boundary the Outpost chose, or fall back to the
    # standard one used by our Outpost agent.
    content_type = upstream.headers.get(
        "Content-Type", "multipart/x-mixed-replace; boundary=frame"
    )

    def relay():
        try:
            for chunk in upstream.iter_content(chunk_size=4096):
                if chunk:
                    yield chunk
        except requests.RequestException:
            # The Outpost went away mid-stream; just end the response cleanly.
            return
        finally:
            upstream.close()

    return Response(
        stream_with_context(relay()),
        mimetype=content_type,
        headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"},
    )


@bp.get("/<int:device_id>/snapshot")
def snapshot(device_id):
    """One still JPEG - cheaper than the full stream for thumbnails."""
    device = _owned_device(device_id)
    if device is None:
        return jsonify({"error": "Device not found."}), 404

    try:
        response = requests.get(
            _device_url(device, "/snapshot.jpg"), timeout=current_app.config["CAMERA_TIMEOUT"]
        )
        response.raise_for_status()
    except requests.RequestException:
        return jsonify({"error": "Camera is not responding."}), 503

    return Response(response.content, mimetype="image/jpeg",
                    headers={"Cache-Control": "no-cache"})
