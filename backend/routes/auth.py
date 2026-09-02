"""
Signup / login endpoints.

    POST /api/auth/signup            create an account
    POST /api/auth/login             sign in, get a token
    GET  /api/auth/me                who am I? (used to restore a session on refresh)
    POST /api/auth/forgot-password   request a reset link
    POST /api/auth/reset-password    use that link to set a new password
"""

import hashlib
import re
import secrets
from datetime import timedelta

from flask import Blueprint, current_app, g, jsonify, request

from auth import create_token, login_required
from models import User, _aware, db, utcnow

bp = Blueprint("auth", __name__, url_prefix="/api/auth")

RESET_TOKEN_LIFETIME = timedelta(hours=1)

# A deliberately loose email check - we only want to catch obvious typos.
EMAIL_RE = re.compile(r"^[^@\s]+@[^@\s]+\.[^@\s]+$")
MIN_PASSWORD_LENGTH = 8


def _clean_email(value: str) -> str:
    """Emails are case-insensitive, so store them lowercase and trimmed."""
    return (value or "").strip().lower()


@bp.post("/signup")
def signup():
    data = request.get_json(silent=True) or {}
    email = _clean_email(data.get("email"))
    password = data.get("password") or ""
    name = (data.get("name") or "").strip()

    # --- validate the input before touching the database ---
    if not name:
        return jsonify({"error": "Please enter your name."}), 400
    if not EMAIL_RE.match(email):
        return jsonify({"error": "That doesn't look like a valid email address."}), 400
    if len(password) < MIN_PASSWORD_LENGTH:
        return jsonify(
            {"error": f"Password must be at least {MIN_PASSWORD_LENGTH} characters."}
        ), 400

    if db.session.query(User).filter_by(email=email).first():
        return jsonify({"error": "An account with that email already exists."}), 409

    user = User(email=email, name=name)
    user.set_password(password)  # hashes it - the raw password is never saved
    db.session.add(user)
    db.session.commit()

    return jsonify({"token": create_token(user), "user": user.to_dict()}), 201


@bp.post("/login")
def login():
    data = request.get_json(silent=True) or {}
    email = _clean_email(data.get("email"))
    password = data.get("password") or ""

    user = db.session.query(User).filter_by(email=email).first()

    # Deliberately vague message: we don't reveal whether the email exists,
    # because that would help someone guess which accounts are real.
    if user is None or not user.check_password(password):
        return jsonify({"error": "Incorrect email or password."}), 401

    return jsonify({"token": create_token(user), "user": user.to_dict()})


@bp.get("/me")
@login_required
def me():
    """Used on page load to check the saved token is still valid."""
    return jsonify({"user": g.user.to_dict()})


@bp.post("/forgot-password")
def forgot_password():
    """
    Start a password reset.

    Always returns the same message whether or not the email is a real
    account - same reasoning as login's vague error, so this can't be used
    to check who has an account here.

    NOTE: there's no email provider wired up yet, so the reset link is only
    written to the server log for now. Before real customers rely on this,
    plug a provider (SendGrid, Postmark, Resend, SES, ...) in here instead
    of the current_app.logger.info() call below.
    """
    data = request.get_json(silent=True) or {}
    email = _clean_email(data.get("email"))
    user = db.session.query(User).filter_by(email=email).first()

    if user is not None:
        raw_token = secrets.token_urlsafe(32)
        user.reset_token_hash = hashlib.sha256(raw_token.encode("utf-8")).hexdigest()
        user.reset_token_expires = utcnow() + RESET_TOKEN_LIFETIME
        db.session.commit()

        reset_link = f"{current_app.config['FRONTEND_URL']}/reset-password?token={raw_token}"
        # .warning(), not .info(): Flask's default logger level is WARNING,
        # so .info() here would be silently swallowed and this link would
        # never appear anywhere - which defeats the entire point until a
        # real email provider replaces this line.
        current_app.logger.warning("PASSWORD RESET requested for %s: %s", email, reset_link)

    return jsonify({
        "message": "If an account exists for that email, we've sent a link to reset the password."
    })


@bp.post("/reset-password")
def reset_password():
    """Use the token from a forgot-password link to set a new password."""
    data = request.get_json(silent=True) or {}
    token = (data.get("token") or "").strip()
    password = data.get("password") or ""

    if not token:
        return jsonify({"error": "Missing reset token."}), 400
    if len(password) < MIN_PASSWORD_LENGTH:
        return jsonify(
            {"error": f"Password must be at least {MIN_PASSWORD_LENGTH} characters."}
        ), 400

    token_hash = hashlib.sha256(token.encode("utf-8")).hexdigest()
    user = db.session.query(User).filter_by(reset_token_hash=token_hash).first()

    expires = _aware(user.reset_token_expires) if user else None
    if user is None or expires is None or expires < utcnow():
        return jsonify({"error": "That reset link is invalid or has expired."}), 400

    user.set_password(password)
    # One-time use: burn the token the moment it's spent.
    user.reset_token_hash = None
    user.reset_token_expires = None
    db.session.commit()

    # Sign them in immediately, same as signup - no reason to make someone
    # who just proved they own the account log in a second time.
    return jsonify({"token": create_token(user), "user": user.to_dict()})
