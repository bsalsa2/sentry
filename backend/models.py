"""
Database models for Sentry.

Each class below becomes a table in the database. SQLAlchemy turns Python
objects into rows for us, so we rarely have to write raw SQL.

    User   -> a person with an account
    Device -> one Outpost camera belonging to a user
    Alert  -> one detection ("person seen at 2:47 PM") from a device
"""

import secrets
from datetime import datetime, timezone

import bcrypt
from flask_sqlalchemy import SQLAlchemy

# The single database object, shared by the whole app.
db = SQLAlchemy()

# The kinds of things our detection model can spot. Kept here so the API,
# the frontend and the Outpost agent all agree on the same spelling.
DETECTION_TYPES = ("motion", "person", "vehicle", "package", "animal")

# A device is considered offline if it hasn't checked in for this long.
OFFLINE_AFTER_SECONDS = 90


def utcnow() -> datetime:
    """Current time in UTC. Always store UTC; convert to local time in the UI."""
    return datetime.now(timezone.utc)


def _aware(value: datetime | None) -> datetime | None:
    """
    SQLite forgets timezones, so a datetime read back from it has no tzinfo.
    This re-attaches UTC so date maths never crashes.
    """
    if value is None:
        return None
    if value.tzinfo is None:
        return value.replace(tzinfo=timezone.utc)
    return value


class User(db.Model):
    __tablename__ = "users"

    id = db.Column(db.Integer, primary_key=True)
    email = db.Column(db.String(255), unique=True, nullable=False, index=True)
    # We store a bcrypt *hash*, never the real password.
    password_hash = db.Column(db.String(255), nullable=False)
    name = db.Column(db.String(120), nullable=False)
    created_at = db.Column(db.DateTime, default=utcnow, nullable=False)

    # "Forgot password" support. We store a *hash* of the reset token, same
    # reasoning as the password itself: if the database ever leaked, a raw
    # token would let someone reset the account straight away. sha256 (not
    # bcrypt) is fine here - the token is already 32 random bytes, so it
    # doesn't need slow hashing to resist guessing.
    reset_token_hash = db.Column(db.String(64), nullable=True, index=True)
    reset_token_expires = db.Column(db.DateTime, nullable=True)

    # If a user is deleted, delete their devices too.
    devices = db.relationship(
        "Device", back_populates="owner", cascade="all, delete-orphan", lazy="selectin"
    )

    # --- password helpers ----------------------------------------------
    def set_password(self, raw_password: str) -> None:
        """Hash the password with bcrypt and store the hash."""
        hashed = bcrypt.hashpw(raw_password.encode("utf-8"), bcrypt.gensalt())
        self.password_hash = hashed.decode("utf-8")

    def check_password(self, raw_password: str) -> bool:
        """Return True if this password matches the stored hash."""
        try:
            return bcrypt.checkpw(
                raw_password.encode("utf-8"), self.password_hash.encode("utf-8")
            )
        except (ValueError, AttributeError):
            # Malformed hash in the database - treat as a failed login.
            return False

    def to_dict(self) -> dict:
        """The shape the frontend receives. Note: never includes the hash."""
        return {
            "id": self.id,
            "email": self.email,
            "name": self.name,
            "created_at": _aware(self.created_at).isoformat(),
        }


class Device(db.Model):
    __tablename__ = "devices"

    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(
        db.Integer, db.ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True
    )

    name = db.Column(db.String(120), nullable=False)
    location = db.Column(db.String(120), default="", nullable=False)
    ip_address = db.Column(db.String(64), nullable=False)

    # How twitchy the detector is: 1 = only very confident detections,
    # 100 = report almost everything. Stored as a percentage.
    sensitivity = db.Column(db.Integer, default=60, nullable=False)
    # A user can mute a camera without deleting it.
    enabled = db.Column(db.Boolean, default=True, nullable=False)

    # The Outpost authenticates with this key instead of a user password, so
    # we never have to put a human login on the camera hardware.
    api_key = db.Column(db.String(64), unique=True, nullable=False, index=True)

    # Updated every time the Outpost checks in. Used to decide online/offline.
    last_seen = db.Column(db.DateTime, nullable=True)
    created_at = db.Column(db.DateTime, default=utcnow, nullable=False)

    owner = db.relationship("User", back_populates="devices")
    alerts = db.relationship(
        "Alert", back_populates="device", cascade="all, delete-orphan", lazy="selectin"
    )

    @staticmethod
    def new_api_key() -> str:
        """A random, hard-to-guess key for a camera."""
        return secrets.token_hex(24)

    @property
    def status(self) -> str:
        """'online' if the Outpost checked in recently, otherwise 'offline'."""
        last = _aware(self.last_seen)
        if last is None:
            return "offline"
        age = (utcnow() - last).total_seconds()
        return "online" if age <= OFFLINE_AFTER_SECONDS else "offline"

    def to_dict(self, include_key: bool = False) -> dict:
        last = _aware(self.last_seen)
        data = {
            "id": self.id,
            "name": self.name,
            "location": self.location,
            "ip_address": self.ip_address,
            "sensitivity": self.sensitivity,
            "enabled": self.enabled,
            "status": self.status,
            "last_seen": last.isoformat() if last else None,
            "created_at": _aware(self.created_at).isoformat(),
        }
        # The API key is only shown once, right after the device is created.
        if include_key:
            data["api_key"] = self.api_key
        return data


class Alert(db.Model):
    __tablename__ = "alerts"

    id = db.Column(db.Integer, primary_key=True)
    device_id = db.Column(
        db.Integer, db.ForeignKey("devices.id", ondelete="CASCADE"), nullable=False, index=True
    )

    detection_type = db.Column(db.String(32), nullable=False, index=True)
    # 0.0 - 1.0, how sure the model was.
    confidence = db.Column(db.Float, default=0.0, nullable=False)
    # Optional snapshot of what triggered the alert.
    image_url = db.Column(db.String(512), nullable=True)
    # Free-text note, e.g. "2 people near the front door".
    note = db.Column(db.String(255), default="", nullable=False)
    # Users can tick alerts off once they've looked at them.
    acknowledged = db.Column(db.Boolean, default=False, nullable=False)

    timestamp = db.Column(db.DateTime, default=utcnow, nullable=False, index=True)

    device = db.relationship("Device", back_populates="alerts")

    def to_dict(self) -> dict:
        return {
            "id": self.id,
            "device_id": self.device_id,
            "device_name": self.device.name if self.device else None,
            "detection_type": self.detection_type,
            "confidence": round(self.confidence, 3),
            "image_url": self.image_url,
            "note": self.note,
            "acknowledged": self.acknowledged,
            "timestamp": _aware(self.timestamp).isoformat(),
        }
