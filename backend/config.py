"""
Configuration for the Sentry backend.

Everything that changes between "my laptop" and "the real server" lives here.
Values come from environment variables so we never commit secrets to GitHub.
"""

import os
from datetime import timedelta

from dotenv import load_dotenv

# Load a local .env file if one exists (ignored in production, where the
# hosting platform sets real environment variables for us).
load_dotenv()

# Where this file lives on disk - used to build the local SQLite path.
BASE_DIR = os.path.abspath(os.path.dirname(__file__))


def _database_url() -> str:
    """
    Work out which database to use.

    - In production we set DATABASE_URL to the Supabase PostgreSQL connection string.
    - On a laptop with nothing configured we fall back to a SQLite file, so the
      project runs with zero setup.
    """
    url = os.environ.get("DATABASE_URL", "").strip()

    if not url:
        return "sqlite:///" + os.path.join(BASE_DIR, "sentry.db")

    # Supabase/Heroku hand out URLs starting with "postgres://" but SQLAlchemy
    # wants "postgresql://". Fix it automatically so nobody has to remember.
    if url.startswith("postgres://"):
        url = url.replace("postgres://", "postgresql://", 1)

    return url


class Config:
    # --- Security -------------------------------------------------------
    # JWT_SECRET signs the login tokens. If someone knows it they can forge
    # logins, so in production this MUST be set to a long random string.
    JWT_SECRET = os.environ.get("JWT_SECRET", "dev-secret-change-me")
    JWT_ALGORITHM = "HS256"
    # How long a login lasts before the user has to sign in again.
    JWT_EXPIRES = timedelta(days=int(os.environ.get("JWT_EXPIRES_DAYS", "7")))

    # --- Database -------------------------------------------------------
    SQLALCHEMY_DATABASE_URI = _database_url()
    SQLALCHEMY_TRACK_MODIFICATIONS = False
    SQLALCHEMY_ENGINE_OPTIONS = {
        # Reconnect if the database dropped an idle connection (Supabase does this).
        "pool_pre_ping": True,
        "pool_recycle": 280,
    }

    # --- Frontend -------------------------------------------------------
    # Which websites are allowed to call this API. "*" is fine for an MVP;
    # tighten it to your Vercel URL once you deploy.
    CORS_ORIGINS = os.environ.get("CORS_ORIGINS", "*")
    # Used to build the link inside a password-reset email, e.g.
    # "https://sentry-tau-jade.vercel.app". Set this in production.
    FRONTEND_URL = os.environ.get("FRONTEND_URL", "http://localhost:5173").rstrip("/")

    # --- Camera ---------------------------------------------------------
    # The Pi serves its camera on this port (see pi/sentry_pi.py).
    PI_CAMERA_PORT = int(os.environ.get("PI_CAMERA_PORT", "8000"))
    # Give up talking to a Pi after this many seconds.
    PI_TIMEOUT = float(os.environ.get("PI_TIMEOUT", "4"))

    # Set to "1" to load fake devices/alerts on first boot, so the dashboard
    # has something to show before the real Raspberry Pi arrives.
    SEED_DEMO_DATA = os.environ.get("SEED_DEMO_DATA", "0") == "1"
