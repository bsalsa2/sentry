"""
Device (camera) management.

    GET    /api/devices              list my cameras
    POST   /api/devices              add a camera
    GET    /api/devices/<id>         one camera + its recent alerts
    PUT    /api/devices/<id>         rename / move / change sensitivity
    DELETE /api/devices/<id>         remove a camera (and its alerts)
    POST   /api/devices/<id>/rotate-key   issue a fresh key for the Pi
    POST   /api/devices/heartbeat    called BY THE PI to say "I'm alive"
"""

import ipaddress
import re
import socket
from datetime import timedelta

from flask import Blueprint, current_app, g, jsonify, request
from sqlalchemy import func

from auth import device_key_required, login_required
from models import Alert, Device, db, utcnow

bp = Blueprint("devices", __name__, url_prefix="/api/devices")


# A hostname label: letters, digits and dashes, not starting or ending with a
# dash. e.g. the "raspberrypi" and "local" in "raspberrypi.local".
HOSTNAME_LABEL_RE = re.compile(r"^[a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?$")


def _valid_host(value: str) -> bool:
    """
    Accept either an IP address (192.168.1.100) or a hostname
    (raspberrypi.local). Anything with spaces or punctuation is rejected.
    """
    if not value or len(value) > 253:
        return False

    try:
        ipaddress.ip_address(value)
        return True
    except ValueError:
        pass  # not an IP address - try it as a hostname instead

    labels = value.rstrip(".").split(".")
    return all(HOSTNAME_LABEL_RE.match(label) for label in labels)


def _can_reach(host: str, port: int, timeout: float) -> bool:
    """
    Try to open a TCP connection to the Pi. Returns True if something is
    listening. We only warn on failure - the Pi may simply not be plugged
    in yet, and we still want the user to be able to add it.
    """
    if current_app.config.get("TESTING"):
        return False  # never make real network calls during tests

    try:
        with socket.create_connection((host, port), timeout=timeout):
            return True
    except OSError:
        return False


def _my_device_or_404(device_id: int) -> Device | None:
    """Look up a device, but only if it belongs to the logged-in user."""
    return (
        db.session.query(Device)
        .filter_by(id=device_id, user_id=g.user.id)
        .first()
    )


@bp.get("")
@login_required
def list_devices():
    devices = (
        db.session.query(Device)
        .filter_by(user_id=g.user.id)
        .order_by(Device.created_at.asc())
        .all()
    )

    # How many alerts each camera raised in the last 24 hours. Counted in one
    # grouped query rather than one query per camera, so the dashboard stays
    # fast as the user adds more cameras.
    day_ago = utcnow() - timedelta(hours=24)
    counts = dict(
        db.session.query(Alert.device_id, func.count(Alert.id))
        .join(Device, Alert.device_id == Device.id)
        .filter(Device.user_id == g.user.id, Alert.timestamp >= day_ago)
        .group_by(Alert.device_id)
        .all()
    )

    payload = []
    for device in devices:
        data = device.to_dict()
        data["alerts_24h"] = counts.get(device.id, 0)
        payload.append(data)

    return jsonify({"devices": payload})


@bp.post("")
@login_required
def add_device():
    data = request.get_json(silent=True) or {}
    name = (data.get("name") or "").strip()
    ip_address = (data.get("ip_address") or "").strip()
    location = (data.get("location") or "").strip()
    sensitivity = data.get("sensitivity", 60)

    if not name:
        return jsonify({"error": "Give the camera a name, e.g. 'Front Door'."}), 400
    if not _valid_host(ip_address):
        return jsonify({"error": "Enter a valid IP address, e.g. 192.168.1.100."}), 400

    try:
        sensitivity = max(1, min(100, int(sensitivity)))
    except (TypeError, ValueError):
        sensitivity = 60

    if db.session.query(Device).filter_by(user_id=g.user.id, ip_address=ip_address).first():
        return jsonify({"error": "You already have a camera at that address."}), 409

    device = Device(
        user_id=g.user.id,
        name=name,
        location=location,
        ip_address=ip_address,
        sensitivity=sensitivity,
        api_key=Device.new_api_key(),
    )
    db.session.add(device)
    db.session.commit()

    # Friendly heads-up if the Pi isn't answering yet. Not an error: the user
    # may be setting this up before the hardware is plugged in.
    # Keep this probe short - the device is already saved, so a slow answer
    # here would just make the "Add device" button feel broken.
    reachable = _can_reach(
        ip_address,
        current_app.config["PI_CAMERA_PORT"],
        min(current_app.config["PI_TIMEOUT"], 1.5),
    )

    return jsonify({
        "device": device.to_dict(include_key=True),  # key shown once, right now
        "reachable": reachable,
        "message": (
            "Camera added and responding."
            if reachable
            else "Camera saved, but nothing answered at that address yet. "
                 "That's normal if the Pi isn't set up - run the Pi script and it "
                 "will come online automatically."
        ),
    }), 201


@bp.get("/<int:device_id>")
@login_required
def get_device(device_id):
    device = _my_device_or_404(device_id)
    if device is None:
        return jsonify({"error": "Device not found."}), 404

    recent = (
        db.session.query(Alert)
        .filter_by(device_id=device.id)
        .order_by(Alert.timestamp.desc())
        .limit(25)
        .all()
    )
    return jsonify({
        "device": device.to_dict(),
        "recent_alerts": [a.to_dict() for a in recent],
    })


@bp.put("/<int:device_id>")
@login_required
def update_device(device_id):
    device = _my_device_or_404(device_id)
    if device is None:
        return jsonify({"error": "Device not found."}), 404

    data = request.get_json(silent=True) or {}

    if "name" in data:
        name = (data["name"] or "").strip()
        if not name:
            return jsonify({"error": "Name can't be empty."}), 400
        device.name = name

    if "location" in data:
        device.location = (data["location"] or "").strip()

    if "ip_address" in data:
        ip_address = (data["ip_address"] or "").strip()
        if not _valid_host(ip_address):
            return jsonify({"error": "Enter a valid IP address."}), 400
        device.ip_address = ip_address

    if "sensitivity" in data:
        try:
            device.sensitivity = max(1, min(100, int(data["sensitivity"])))
        except (TypeError, ValueError):
            return jsonify({"error": "Sensitivity must be a number from 1 to 100."}), 400

    if "enabled" in data:
        device.enabled = bool(data["enabled"])

    db.session.commit()
    return jsonify({"device": device.to_dict()})


@bp.delete("/<int:device_id>")
@login_required
def delete_device(device_id):
    device = _my_device_or_404(device_id)
    if device is None:
        return jsonify({"error": "Device not found."}), 404

    db.session.delete(device)  # cascade also removes this device's alerts
    db.session.commit()
    return jsonify({"deleted": device_id})


@bp.post("/<int:device_id>/rotate-key")
@login_required
def rotate_key(device_id):
    """Issue a new key, e.g. if the old one leaked. The Pi must be updated too."""
    device = _my_device_or_404(device_id)
    if device is None:
        return jsonify({"error": "Device not found."}), 404

    device.api_key = Device.new_api_key()
    db.session.commit()
    return jsonify({"device": device.to_dict(include_key=True)})


@bp.post("/heartbeat")
@device_key_required
def heartbeat():
    """
    The Pi calls this every ~30 seconds so the dashboard can show it as online.
    It also returns the device's settings, so changing sensitivity in the web
    app automatically reaches the camera without restarting it.
    """
    device = g.device
    device.last_seen = utcnow()
    db.session.commit()

    return jsonify({
        "ok": True,
        "settings": {
            "name": device.name,
            "sensitivity": device.sensitivity,
            "enabled": device.enabled,
        },
    })
