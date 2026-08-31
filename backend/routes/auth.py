"""
Signup / login endpoints.

    POST /api/auth/signup   create an account
    POST /api/auth/login    sign in, get a token
    GET  /api/auth/me       who am I? (used to restore a session on refresh)
"""

import re

from flask import Blueprint, g, jsonify, request

from auth import create_token, login_required
from models import User, db

bp = Blueprint("auth", __name__, url_prefix="/api/auth")

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
