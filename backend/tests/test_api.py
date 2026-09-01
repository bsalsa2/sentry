"""
Tests for the Sentry API.

Run them with:

    cd backend
    .venv/bin/python -m pytest -q

Each test gets a brand-new, empty database, so they can't affect each other
or your real data.
"""

import os
import sys

import pytest

# Make the backend package importable when pytest runs from any directory.
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app import create_app  # noqa: E402
from config import Config  # noqa: E402
from models import db  # noqa: E402


class TestConfig(Config):
    """Same settings as normal, but with a throwaway in-memory database."""

    SQLALCHEMY_DATABASE_URI = "sqlite://"  # lives in RAM, vanishes after the test
    SQLALCHEMY_ENGINE_OPTIONS = {}
    JWT_SECRET = "test-secret"
    SEED_DEMO_DATA = False
    TESTING = True


@pytest.fixture
def client():
    app = create_app(TestConfig)
    with app.app_context():
        with app.test_client() as test_client:
            yield test_client
        db.session.remove()


def signup(client, email="braden@example.com", password="password123", name="Braden"):
    """Helper: make an account and return the auth header for it."""
    response = client.post(
        "/api/auth/signup", json={"email": email, "password": password, "name": name}
    )
    assert response.status_code == 201, response.get_json()
    return {"Authorization": "Bearer " + response.get_json()["token"]}


def add_device(client, headers, name="Front Door", ip="192.168.1.100"):
    """Helper: add a camera and return its full record (including its key)."""
    response = client.post(
        "/api/devices", json={"name": name, "ip_address": ip}, headers=headers
    )
    assert response.status_code == 201, response.get_json()
    return response.get_json()["device"]


# --- health ---------------------------------------------------------------

def test_health_endpoint(client):
    response = client.get("/api/health")
    assert response.status_code == 200
    assert response.get_json()["status"] == "ok"


# --- signup / login -------------------------------------------------------

def test_signup_then_login(client):
    signup(client)
    response = client.post(
        "/api/auth/login",
        json={"email": "braden@example.com", "password": "password123"},
    )
    assert response.status_code == 200
    assert "token" in response.get_json()


def test_signup_rejects_short_password(client):
    response = client.post(
        "/api/auth/signup",
        json={"email": "x@example.com", "password": "short", "name": "X"},
    )
    assert response.status_code == 400


def test_signup_rejects_duplicate_email(client):
    signup(client)
    response = client.post(
        "/api/auth/signup",
        json={"email": "braden@example.com", "password": "password123", "name": "Again"},
    )
    assert response.status_code == 409


def test_login_with_wrong_password_fails(client):
    signup(client)
    response = client.post(
        "/api/auth/login",
        json={"email": "braden@example.com", "password": "not-the-password"},
    )
    assert response.status_code == 401


def test_password_is_never_returned(client):
    headers = signup(client)
    body = client.get("/api/auth/me", headers=headers).get_json()
    assert "password_hash" not in body["user"]
    assert "password" not in body["user"]


# --- authentication guard -------------------------------------------------

def test_devices_require_login(client):
    assert client.get("/api/devices").status_code == 401


def test_bad_token_is_rejected(client):
    response = client.get("/api/devices", headers={"Authorization": "Bearer nonsense"})
    assert response.status_code == 401


# --- devices --------------------------------------------------------------

def test_add_and_list_device(client):
    headers = signup(client)
    add_device(client, headers)

    devices = client.get("/api/devices", headers=headers).get_json()["devices"]
    assert len(devices) == 1
    assert devices[0]["name"] == "Front Door"
    # The API key is only revealed at creation time, never in the list.
    assert "api_key" not in devices[0]


@pytest.mark.parametrize("bad_ip", ["not an ip!!", "", "192.168.1.100 ; rm -rf", "a b c"])
def test_add_device_rejects_bad_address(client, bad_ip):
    headers = signup(client)
    response = client.post(
        "/api/devices", json={"name": "Bad", "ip_address": bad_ip}, headers=headers
    )
    assert response.status_code == 400


def test_device_list_includes_24h_alert_count(client):
    headers = signup(client)
    device = add_device(client, headers)
    for _ in range(3):
        client.post(
            "/api/alerts",
            json={"detection_type": "motion", "confidence": 0.7},
            headers={"X-Device-Key": device["api_key"]},
        )

    devices = client.get("/api/devices", headers=headers).get_json()["devices"]
    assert devices[0]["alerts_24h"] == 3


def test_add_device_accepts_a_hostname(client):
    headers = signup(client)
    response = client.post(
        "/api/devices",
        json={"name": "Pi", "ip_address": "raspberrypi.local"},
        headers=headers,
    )
    assert response.status_code == 201


def test_update_device_settings(client):
    headers = signup(client)
    device = add_device(client, headers)

    response = client.put(
        f"/api/devices/{device['id']}",
        json={"name": "Side Gate", "sensitivity": 90},
        headers=headers,
    )
    assert response.status_code == 200
    updated = response.get_json()["device"]
    assert updated["name"] == "Side Gate"
    assert updated["sensitivity"] == 90


def test_sensitivity_is_clamped_to_1_100(client):
    headers = signup(client)
    device = add_device(client, headers)
    response = client.put(
        f"/api/devices/{device['id']}", json={"sensitivity": 5000}, headers=headers
    )
    assert response.get_json()["device"]["sensitivity"] == 100


def test_cannot_see_another_users_device(client):
    alice = signup(client, email="alice@example.com")
    device = add_device(client, alice)

    bob = signup(client, email="bob@example.com")
    assert client.get(f"/api/devices/{device['id']}", headers=bob).status_code == 404
    assert client.delete(f"/api/devices/{device['id']}", headers=bob).status_code == 404


def test_heartbeat_brings_device_online(client):
    headers = signup(client)
    device = add_device(client, headers)
    assert device["status"] == "offline"

    response = client.post(
        "/api/devices/heartbeat", headers={"X-Device-Key": device["api_key"]}
    )
    assert response.status_code == 200
    # The Pi is told the current settings so it can apply them immediately.
    assert response.get_json()["settings"]["sensitivity"] == 60

    devices = client.get("/api/devices", headers=headers).get_json()["devices"]
    assert devices[0]["status"] == "online"


def test_heartbeat_rejects_unknown_key(client):
    response = client.post("/api/devices/heartbeat", headers={"X-Device-Key": "fake"})
    assert response.status_code == 401


# --- alerts ---------------------------------------------------------------

def test_pi_can_post_an_alert(client):
    headers = signup(client)
    device = add_device(client, headers)

    response = client.post(
        "/api/alerts",
        json={"detection_type": "person", "confidence": 0.91, "note": "at the door"},
        headers={"X-Device-Key": device["api_key"]},
    )
    assert response.status_code == 201

    alerts = client.get("/api/alerts", headers=headers).get_json()["alerts"]
    assert len(alerts) == 1
    assert alerts[0]["detection_type"] == "person"
    assert alerts[0]["device_name"] == "Front Door"


def test_alert_rejects_unknown_detection_type(client):
    headers = signup(client)
    device = add_device(client, headers)
    response = client.post(
        "/api/alerts",
        json={"detection_type": "dragon", "confidence": 0.9},
        headers={"X-Device-Key": device["api_key"]},
    )
    assert response.status_code == 400


def test_muted_device_does_not_record_alerts(client):
    headers = signup(client)
    device = add_device(client, headers)
    client.put(f"/api/devices/{device['id']}", json={"enabled": False}, headers=headers)

    response = client.post(
        "/api/alerts",
        json={"detection_type": "motion", "confidence": 0.6},
        headers={"X-Device-Key": device["api_key"]},
    )
    assert response.status_code == 202
    assert response.get_json()["stored"] is False
    assert client.get("/api/alerts", headers=headers).get_json()["total"] == 0


def test_alerts_can_be_filtered_by_type(client):
    headers = signup(client)
    device = add_device(client, headers)
    key = {"X-Device-Key": device["api_key"]}

    for detection_type in ("person", "person", "vehicle"):
        client.post(
            "/api/alerts",
            json={"detection_type": detection_type, "confidence": 0.8},
            headers=key,
        )

    body = client.get("/api/alerts?type=vehicle", headers=headers).get_json()
    assert body["total"] == 1
    assert body["alerts"][0]["detection_type"] == "vehicle"


def test_alerts_are_scoped_to_their_owner(client):
    alice = signup(client, email="alice@example.com")
    device = add_device(client, alice)
    client.post(
        "/api/alerts",
        json={"detection_type": "person", "confidence": 0.9},
        headers={"X-Device-Key": device["api_key"]},
    )

    bob = signup(client, email="bob@example.com")
    assert client.get("/api/alerts", headers=bob).get_json()["total"] == 0


def test_acknowledge_alert(client):
    headers = signup(client)
    device = add_device(client, headers)
    created = client.post(
        "/api/alerts",
        json={"detection_type": "motion", "confidence": 0.7},
        headers={"X-Device-Key": device["api_key"]},
    ).get_json()["alert"]

    response = client.post(f"/api/alerts/{created['id']}/ack", headers=headers)
    assert response.status_code == 200
    assert response.get_json()["alert"]["acknowledged"] is True


def test_stats_counts_devices_and_alerts(client):
    headers = signup(client)
    device = add_device(client, headers)
    client.post(
        "/api/alerts",
        json={"detection_type": "package", "confidence": 0.88},
        headers={"X-Device-Key": device["api_key"]},
    )

    stats = client.get("/api/alerts/stats", headers=headers).get_json()
    assert stats["devices_total"] == 1
    assert stats["alerts_24h"] == 1
    assert stats["by_type_24h"]["package"] == 1


def test_timeseries_returns_a_bucket_per_hour(client):
    headers = signup(client)
    device = add_device(client, headers)
    for _ in range(3):
        client.post(
            "/api/alerts",
            json={"detection_type": "person", "confidence": 0.9},
            headers={"X-Device-Key": device["api_key"]},
        )

    body = client.get("/api/alerts/timeseries?hours=24", headers=headers).get_json()

    # Every hour is present, including the quiet ones - a gap in the chart
    # would read as missing data rather than a quiet night.
    assert len(body["buckets"]) == 24
    assert body["peak"] == 3
    assert sum(b["total"] for b in body["buckets"]) == 3
    assert sum(b["person"] for b in body["buckets"]) == 3
    assert body["buckets"][-1]["person"] == 3   # just-created alerts land in the last hour


def test_timeseries_hours_is_clamped(client):
    headers = signup(client)
    assert len(client.get("/api/alerts/timeseries?hours=9999",
                          headers=headers).get_json()["buckets"]) == 168
    assert len(client.get("/api/alerts/timeseries?hours=0",
                          headers=headers).get_json()["buckets"]) == 1
    # Garbage should fall back to the default rather than 500.
    assert len(client.get("/api/alerts/timeseries?hours=abc",
                          headers=headers).get_json()["buckets"]) == 24


def test_timeseries_is_scoped_to_owner(client):
    alice = signup(client, email="alice@example.com")
    device = add_device(client, alice)
    client.post(
        "/api/alerts",
        json={"detection_type": "person", "confidence": 0.9},
        headers={"X-Device-Key": device["api_key"]},
    )

    bob = signup(client, email="bob@example.com")
    body = client.get("/api/alerts/timeseries", headers=bob).get_json()
    assert sum(b["total"] for b in body["buckets"]) == 0


def test_deleting_a_device_removes_its_alerts(client):
    headers = signup(client)
    device = add_device(client, headers)
    client.post(
        "/api/alerts",
        json={"detection_type": "animal", "confidence": 0.7},
        headers={"X-Device-Key": device["api_key"]},
    )

    assert client.delete(f"/api/devices/{device['id']}", headers=headers).status_code == 200
    assert client.get("/api/alerts", headers=headers).get_json()["total"] == 0


# --- camera ---------------------------------------------------------------

def test_camera_stream_requires_ownership(client):
    alice = signup(client, email="alice@example.com")
    device = add_device(client, alice)

    bob = signup(client, email="bob@example.com")

    # No credentials at all, and someone else's credentials, both look the
    # same from outside: 404. We never confirm the device even exists.
    assert client.get(f"/api/camera/{device['id']}/stream").status_code == 404
    assert client.get(f"/api/camera/{device['id']}/stream", headers=bob).status_code == 404
