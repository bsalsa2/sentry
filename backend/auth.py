"""
Authentication helpers.

We use JWT ("JSON Web Token"). The flow is:

  1. User logs in with email + password.
  2. We check the password and hand back a signed token.
  3. The frontend stores that token and sends it on every later request
     in a header:  Authorization: Bearer <token>
  4. Here we verify the signature and look up which user it belongs to.

Nobody can fake a token without knowing JWT_SECRET.
"""

import functools
from datetime import datetime, timezone

import jwt
from flask import current_app, g, jsonify, request

from models import Device, User


# ---------------------------------------------------------------------------
# Creating and reading tokens
# ---------------------------------------------------------------------------

def create_token(user: User) -> str:
    """Make a signed login token for this user."""
    now = datetime.now(timezone.utc)
    payload = {
        "sub": str(user.id),          # "subject" = who this token is for
        "email": user.email,
        "iat": now,                   # issued at
        "exp": now + current_app.config["JWT_EXPIRES"],  # expires at
    }
    return jwt.encode(
        payload,
        current_app.config["JWT_SECRET"],
        algorithm=current_app.config["JWT_ALGORITHM"],
    )


def decode_token(token: str) -> dict | None:
    """Verify a token. Returns its contents, or None if it's bad/expired."""
    try:
        return jwt.decode(
            token,
            current_app.config["JWT_SECRET"],
            algorithms=[current_app.config["JWT_ALGORITHM"]],
        )
    except jwt.PyJWTError:
        return None


def _token_from_request() -> str | None:
    """
    Pull the token out of the request.

    Normally it arrives in the Authorization header. But browser <img> tags
    and EventSource (used for the camera feed and live alerts) cannot send
    custom headers, so we also accept ?token=... in the URL for those.
    """
    header = request.headers.get("Authorization", "")
    if header.startswith("Bearer "):
        return header[7:].strip()
    return request.args.get("token")


def current_user() -> User | None:
    """Return the logged-in User for this request, or None."""
    token = _token_from_request()
    if not token:
        return None

    payload = decode_token(token)
    if not payload:
        return None

    user_id = payload.get("sub")
    if user_id is None:
        return None

    # "sub" is a string in the token; the database id is an integer.
    try:
        user_id = int(user_id)
    except (TypeError, ValueError):
        return None

    return db_session_get(User, user_id)


def db_session_get(model, pk):
    """Small wrapper so we only import the db object in one place."""
    from models import db

    return db.session.get(model, pk)


# ---------------------------------------------------------------------------
# Decorators used by the route files
# ---------------------------------------------------------------------------

def login_required(view):
    """
    Put @login_required on a route to make it members-only.

    On success it stores the user in `g.user` so the route can use it.
    """

    @functools.wraps(view)
    def wrapper(*args, **kwargs):
        user = current_user()
        if user is None:
            return jsonify({"error": "Not logged in. Please sign in again."}), 401
        g.user = user
        return view(*args, **kwargs)

    return wrapper


def device_key_required(view):
    """
    Put @device_key_required on routes the Raspberry Pi calls.

    The Pi sends its own key instead of a user login:
        X-Device-Key: <the key shown when the device was added>

    The matching Device ends up in `g.device`.
    """

    @functools.wraps(view)
    def wrapper(*args, **kwargs):
        from models import db

        key = request.headers.get("X-Device-Key") or request.args.get("device_key")
        if not key:
            return jsonify({"error": "Missing device key."}), 401

        device = db.session.query(Device).filter_by(api_key=key).first()
        if device is None:
            return jsonify({"error": "Unknown device key."}), 401

        g.device = device
        return view(*args, **kwargs)

    return wrapper
