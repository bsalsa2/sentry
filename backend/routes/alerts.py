"""
Alerts: storing detections from the Outpost and reading them back in the web app.

    GET   /api/alerts          alert history, with filters
    POST  /api/alerts          store a new alert (called BY THE OUTPOST)
    GET   /api/alerts/stream   live feed of new alerts (Server-Sent Events)
    POST  /api/alerts/<id>/ack mark one alert as seen
    GET   /api/alerts/stats    numbers for the dashboard tiles
"""

import queue
import time
from datetime import datetime, timedelta, timezone

from flask import Blueprint, Response, g, jsonify, request, stream_with_context

import events
from auth import current_user, device_key_required, login_required
from models import DETECTION_TYPES, Alert, Device, db, utcnow

bp = Blueprint("alerts", __name__, url_prefix="/api/alerts")

# Never return more than this many alerts in one request, so a user with
# months of history doesn't accidentally download everything at once.
MAX_LIMIT = 200


def _parse_date(value: str | None) -> datetime | None:
    """Read an ISO date/time from a query string, e.g. 2026-08-31."""
    if not value:
        return None
    try:
        parsed = datetime.fromisoformat(value.replace("Z", "+00:00"))
    except ValueError:
        return None
    if parsed.tzinfo is None:
        parsed = parsed.replace(tzinfo=timezone.utc)
    return parsed


@bp.get("")
@login_required
def list_alerts():
    """
    Alert history for the logged-in user.

    Optional filters (all combine):
        ?device_id=3            only this camera
        ?type=person,vehicle    only these detection types
        ?since=2026-08-01       on or after this date
        ?until=2026-08-31       on or before this date
        ?unacknowledged=1       only alerts not yet ticked off
        ?limit=50&offset=0      paging
    """
    # Start from "alerts belonging to one of my devices".
    query = (
        db.session.query(Alert)
        .join(Device, Alert.device_id == Device.id)
        .filter(Device.user_id == g.user.id)
    )

    device_id = request.args.get("device_id", type=int)
    if device_id:
        query = query.filter(Alert.device_id == device_id)

    types = request.args.get("type")
    if types:
        wanted = [t.strip() for t in types.split(",") if t.strip() in DETECTION_TYPES]
        if wanted:
            query = query.filter(Alert.detection_type.in_(wanted))

    since = _parse_date(request.args.get("since"))
    if since:
        query = query.filter(Alert.timestamp >= since)

    until = _parse_date(request.args.get("until"))
    if until:
        query = query.filter(Alert.timestamp <= until)

    if request.args.get("unacknowledged") in ("1", "true"):
        query = query.filter(Alert.acknowledged.is_(False))

    total = query.count()

    limit = min(request.args.get("limit", 50, type=int) or 50, MAX_LIMIT)
    offset = max(request.args.get("offset", 0, type=int) or 0, 0)

    rows = (
        query.order_by(Alert.timestamp.desc())
        .limit(limit)
        .offset(offset)
        .all()
    )

    return jsonify({
        "alerts": [a.to_dict() for a in rows],
        "total": total,
        "limit": limit,
        "offset": offset,
    })


@bp.post("")
@device_key_required
def create_alert():
    """
    Called by the Outpost when it detects something.

    Headers:  X-Device-Key: <the device's key>
    Body:     {"detection_type": "person", "confidence": 0.91,
               "image_url": "...", "note": "front path"}
    """
    device = g.device
    data = request.get_json(silent=True) or {}

    detection_type = (data.get("detection_type") or "").strip().lower()
    if detection_type not in DETECTION_TYPES:
        return jsonify({
            "error": f"detection_type must be one of: {', '.join(DETECTION_TYPES)}"
        }), 400

    try:
        confidence = float(data.get("confidence", 0))
    except (TypeError, ValueError):
        return jsonify({"error": "confidence must be a number between 0 and 1."}), 400
    confidence = max(0.0, min(1.0, confidence))

    # Seeing a detection also proves the camera is alive.
    device.last_seen = utcnow()

    # A muted camera still counts as online, but we don't record its alerts.
    if not device.enabled:
        db.session.commit()
        return jsonify({"stored": False, "reason": "This camera is currently muted."}), 202

    alert = Alert(
        device_id=device.id,
        detection_type=detection_type,
        confidence=confidence,
        image_url=(data.get("image_url") or None),
        note=(data.get("note") or "")[:255],
    )
    db.session.add(alert)
    db.session.commit()

    # Push it straight to any browser tab the owner has open.
    events.publish(device.user_id, "alert", alert.to_dict())

    return jsonify({"stored": True, "alert": alert.to_dict()}), 201


@bp.post("/<int:alert_id>/ack")
@login_required
def acknowledge(alert_id):
    """Tick an alert off once the user has looked at it."""
    alert = (
        db.session.query(Alert)
        .join(Device, Alert.device_id == Device.id)
        .filter(Alert.id == alert_id, Device.user_id == g.user.id)
        .first()
    )
    if alert is None:
        return jsonify({"error": "Alert not found."}), 404

    alert.acknowledged = True
    db.session.commit()
    return jsonify({"alert": alert.to_dict()})


@bp.get("/stats")
@login_required
def stats():
    """The small summary numbers shown across the top of the dashboard."""
    day_ago = utcnow() - timedelta(hours=24)

    mine = (
        db.session.query(Alert)
        .join(Device, Alert.device_id == Device.id)
        .filter(Device.user_id == g.user.id)
    )

    devices = db.session.query(Device).filter_by(user_id=g.user.id).all()

    by_type = {}
    for detection_type in DETECTION_TYPES:
        by_type[detection_type] = (
            mine.filter(
                Alert.detection_type == detection_type, Alert.timestamp >= day_ago
            ).count()
        )

    return jsonify({
        "devices_total": len(devices),
        "devices_online": sum(1 for d in devices if d.status == "online"),
        "alerts_24h": mine.filter(Alert.timestamp >= day_ago).count(),
        "alerts_unacknowledged": mine.filter(Alert.acknowledged.is_(False)).count(),
        "by_type_24h": by_type,
    })


@bp.get("/timeseries")
@login_required
def timeseries():
    """
    Alert counts per hour, broken down by detection type - the data behind the
    activity chart on the dashboard.

    ?hours=24 (default, max 168) controls how far back to look.

    Every hour in the window is returned, including the quiet ones. A chart
    with gaps where nothing happened would imply missing data rather than a
    quiet night.
    """
    try:
        hours = min(max(int(request.args.get("hours", 24)), 1), 168)
    except (TypeError, ValueError):
        hours = 24

    now = utcnow()
    # Round down to the top of the current hour so buckets line up neatly.
    end = now.replace(minute=0, second=0, microsecond=0) + timedelta(hours=1)
    start = end - timedelta(hours=hours)

    rows = (
        db.session.query(Alert.timestamp, Alert.detection_type)
        .join(Device, Alert.device_id == Device.id)
        .filter(Device.user_id == g.user.id, Alert.timestamp >= start)
        .all()
    )

    # Start every bucket at zero, then count into it. Doing it this way means
    # quiet hours are present as 0 rather than missing.
    buckets = []
    index_of = {}
    for offset in range(hours):
        bucket_start = start + timedelta(hours=offset)
        index_of[bucket_start.strftime("%Y-%m-%dT%H")] = offset
        buckets.append({
            "hour": bucket_start.isoformat(),
            "total": 0,
            **{detection_type: 0 for detection_type in DETECTION_TYPES},
        })

    for timestamp, detection_type in rows:
        if timestamp.tzinfo is None:
            timestamp = timestamp.replace(tzinfo=timezone.utc)
        key = timestamp.strftime("%Y-%m-%dT%H")
        offset = index_of.get(key)
        if offset is None:
            continue  # outside the window (clock skew) - ignore rather than crash
        buckets[offset]["total"] += 1
        if detection_type in DETECTION_TYPES:
            buckets[offset][detection_type] += 1

    return jsonify({
        "hours": hours,
        "start": start.isoformat(),
        "end": end.isoformat(),
        "buckets": buckets,
        "peak": max((b["total"] for b in buckets), default=0),
    })


@bp.get("/stream")
def stream():
    """
    Live alert feed. The browser opens this once and leaves it open; we send
    a line of text down it every time something is detected.

    The browser's EventSource can't send an Authorization header, so the
    frontend passes the token in the URL: /api/alerts/stream?token=...
    """
    user = current_user()
    if user is None:
        return jsonify({"error": "Not logged in."}), 401

    user_id = user.id
    queue_ = events.subscribe(user_id)

    def generate():
        try:
            # Tell the browser we're connected, so the UI can show a green dot.
            yield events.format_sse("connected", {"user_id": user_id})

            while True:
                try:
                    # Wait for an alert, but wake up every 20 seconds anyway...
                    message = queue_.get(timeout=20)
                    yield events.format_sse(message["event"], message["data"])
                except queue.Empty:
                    # ...to send a keep-alive comment. Without this, hosting
                    # platforms close the connection for being idle.
                    yield f": keep-alive {int(time.time())}\n\n"
        finally:
            events.unsubscribe(user_id, queue_)

    return Response(
        stream_with_context(generate()),
        mimetype="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",  # stops nginx-style proxies buffering us
        },
    )
