"""
A minimal in-memory rate limiter for the auth endpoints.

Login, signup, and password-reset requests are the ones worth throttling —
without this, anyone can hammer /api/auth/login with password guesses, or
spam /api/auth/signup to create junk accounts, at whatever rate they like.

This deliberately doesn't reach for Flask-Limiter + Redis. The rest of the
backend already assumes a single process (see events.py and the note in
docs/DEPLOYMENT.md about keeping Replit at one instance) because the live
alert stream lives in that process's memory. A plain in-process dict fits
that same assumption exactly, and stops mattering the moment this app ever
needs to scale past one instance - at which point events.py needs replacing
with something shared anyway, and this can move alongside it.
"""

import threading
import time
from collections import defaultdict

from flask import current_app, jsonify, request


_lock = threading.Lock()
# key -> list of request timestamps within the current window
_hits: dict[str, list[float]] = defaultdict(list)


def _client_key(prefix: str) -> str:
    # X-Forwarded-For is set by the proxy in front of the real deployment
    # (Replit, Render, etc.); request.remote_addr is right for local dev.
    forwarded = request.headers.get("X-Forwarded-For", "")
    ip = forwarded.split(",")[0].strip() if forwarded else request.remote_addr
    return f"{prefix}:{ip or 'unknown'}"


def rate_limit(max_requests: int, window_seconds: float, prefix: str):
    """
    Decorator: allow at most `max_requests` calls per `window_seconds`,
    per client IP, per endpoint (`prefix` keeps endpoints independent).

    Skipped entirely when app.config["TESTING"] is set, so the test suite
    can call these endpoints back-to-back without tripping it.
    """

    def decorator(view):
        def wrapper(*args, **kwargs):
            if current_app.config.get("TESTING"):
                return view(*args, **kwargs)

            key = _client_key(prefix)
            now = time.monotonic()

            with _lock:
                hits = _hits[key]
                cutoff = now - window_seconds
                # Drop anything outside the window instead of growing forever.
                while hits and hits[0] < cutoff:
                    hits.pop(0)

                if len(hits) >= max_requests:
                    retry_after = max(1, int(window_seconds - (now - hits[0])))
                    response = jsonify({
                        "error": "Too many attempts. Please wait a bit and try again.",
                    })
                    response.status_code = 429
                    response.headers["Retry-After"] = str(retry_after)
                    return response

                hits.append(now)

            return view(*args, **kwargs)

        wrapper.__name__ = view.__name__
        return wrapper

    return decorator
