"""
Tests for the Outpost agent's logic - everything that doesn't require an
actual camera or a real YOLO model. Run these on a laptop before trusting
new agent code to the Pi; they catch the bugs that are tedious to find by
staring at a live video feed.

    cd outpost
    pip install -r requirements-dev.txt
    python -m pytest -q
"""

import os
import sys
import time

import numpy as np
import pytest

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

import outpost_agent as agent  # noqa: E402


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def make_frame(width=100, height=100, value=0):
    """A solid-colour BGR frame, the simplest thing MotionDetector can eat."""
    return np.full((height, width, 3), value, dtype=np.uint8)


def frame_with_patch(width=100, height=100, base=0, patch_value=255, patch_fraction=0.02):
    """A solid frame with a square patch changed, covering ~patch_fraction
    of the total area - lets a test dial in exactly how much "motion" there is."""
    frame = np.full((height, width, 3), base, dtype=np.uint8)
    patch_pixels = int(width * height * patch_fraction)
    side = max(1, int(patch_pixels ** 0.5))
    frame[0:side, 0:side] = patch_value
    return frame


class FakeScalar:
    """Stands in for a 1-element torch tensor: box.cls / box.conf only ever
    get used through int(...) / float(...) in the real code."""

    def __init__(self, value):
        self.value = value

    def __int__(self):
        return int(self.value)

    def __float__(self):
        return float(self.value)


class FakeBox:
    def __init__(self, cls_idx, conf):
        self.cls = FakeScalar(cls_idx)
        self.conf = FakeScalar(conf)


class FakeResult:
    def __init__(self, boxes, names):
        self.boxes = boxes
        self.names = names


class FakeYoloModel:
    """A model good for exactly one call - real usage only ever checks one
    frame at a time, so that's all these tests need."""

    def __init__(self, results, names):
        self._results = results
        self.names = names

    def __call__(self, _frame, verbose=False, conf=0.25):
        return self._results


def make_yolo_detector(results, names, is_custom=False):
    """Builds a YoloDetector without touching the real `ultralytics` import -
    __init__ is the only thing that needs it, and check() doesn't."""
    detector = agent.YoloDetector.__new__(agent.YoloDetector)
    detector.model = FakeYoloModel(results, names)
    detector.is_custom = is_custom
    return detector


# ---------------------------------------------------------------------------
# MotionDetector
# ---------------------------------------------------------------------------

class TestMotionDetector:
    def test_first_frame_is_never_motion(self):
        # Nothing to compare against yet - this is the baseline, not an event.
        detector = agent.MotionDetector()
        assert detector.check(make_frame(), sensitivity=60) is None

    def test_identical_frames_report_no_motion(self):
        detector = agent.MotionDetector()
        detector.check(make_frame(value=50), sensitivity=60)
        assert detector.check(make_frame(value=50), sensitivity=60) is None

    def test_a_real_change_is_detected(self):
        detector = agent.MotionDetector()
        detector.check(make_frame(value=0), sensitivity=60)
        result = detector.check(frame_with_patch(patch_fraction=0.25), sensitivity=60)

        assert result is not None
        detection_type, confidence, note = result
        assert detection_type == "motion"
        assert 0.0 < confidence <= 0.99
        assert "%" in note

    def test_tiny_flicker_is_ignored(self):
        # A handful of noisy pixels shouldn't read as an event - real footage
        # has sensor noise on every frame, not just when something moves.
        detector = agent.MotionDetector()
        detector.check(make_frame(value=0), sensitivity=60)
        result = detector.check(frame_with_patch(patch_fraction=0.001), sensitivity=60)
        assert result is None

    def test_higher_sensitivity_notices_smaller_changes(self):
        # Same small change (~2% of the frame): too subtle at low sensitivity,
        # clearly a motion event at high sensitivity.
        low = agent.MotionDetector()
        low.check(make_frame(value=0), sensitivity=1)
        assert low.check(frame_with_patch(patch_fraction=0.02), sensitivity=1) is None

        high = agent.MotionDetector()
        high.check(make_frame(value=0), sensitivity=100)
        assert high.check(frame_with_patch(patch_fraction=0.02), sensitivity=100) is not None

    def test_confidence_scales_with_how_much_changed(self):
        small = agent.MotionDetector()
        small.check(make_frame(value=0), sensitivity=80)
        _, small_confidence, _ = small.check(frame_with_patch(patch_fraction=0.05), sensitivity=80)

        large = agent.MotionDetector()
        large.check(make_frame(value=0), sensitivity=80)
        _, large_confidence, _ = large.check(frame_with_patch(patch_fraction=0.6), sensitivity=80)

        assert large_confidence > small_confidence
        assert large_confidence <= 0.99  # confidence is capped, never reads as absolute certainty


# ---------------------------------------------------------------------------
# YoloDetector
# ---------------------------------------------------------------------------

class TestYoloDetector:
    def test_maps_coco_labels_onto_sentry_classes(self):
        names = {0: "car"}
        result = FakeResult(boxes=[FakeBox(0, 0.9)], names=names)
        detector = make_yolo_detector([result], names, is_custom=False)

        detection = detector.check(make_frame(), sensitivity=60)

        assert detection == ("vehicle", pytest.approx(0.9), "detected: car")

    def test_unmapped_coco_class_is_ignored(self):
        # "chair" has no Sentry equivalent - it should vanish, not crash.
        names = {0: "chair"}
        result = FakeResult(boxes=[FakeBox(0, 0.9)], names=names)
        detector = make_yolo_detector([result], names, is_custom=False)

        assert detector.check(make_frame(), sensitivity=60) is None

    def test_picks_the_highest_confidence_box(self):
        names = {0: "person", 1: "dog"}
        boxes = [FakeBox(0, 0.4), FakeBox(1, 0.95)]
        result = FakeResult(boxes=boxes, names=names)
        detector = make_yolo_detector([result], names, is_custom=False)

        detection_type, confidence, _ = detector.check(make_frame(), sensitivity=60)

        assert detection_type == "animal"
        assert confidence == pytest.approx(0.95)

    def test_custom_model_class_names_pass_through_unmapped(self):
        # A model trained on Sentry's own classes shouldn't get COCO
        # translation applied to it - "package" should stay "package".
        names = {0: "package"}
        result = FakeResult(boxes=[FakeBox(0, 0.8)], names=names)
        detector = make_yolo_detector([result], names, is_custom=True)

        detection_type, _, _ = detector.check(make_frame(), sensitivity=60)

        assert detection_type == "package"

    def test_no_boxes_means_no_detection(self):
        names = {0: "person"}
        result = FakeResult(boxes=[], names=names)
        detector = make_yolo_detector([result], names, is_custom=False)

        assert detector.check(make_frame(), sensitivity=60) is None

    def test_init_detects_a_custom_sentry_model(self, monkeypatch):
        # Exercises the real __init__, not the __new__ shortcut above - this
        # is the logic that decides whether COCO translation runs at all.
        fake_module = type(sys)("ultralytics")
        fake_module.YOLO = lambda model_name: FakeYoloModel(
            results=[], names={0: "package", 1: "animal"}
        )
        monkeypatch.setitem(sys.modules, "ultralytics", fake_module)

        detector = agent.YoloDetector("sentry_best.pt")

        assert detector.is_custom is True

    def test_init_detects_a_stock_coco_model(self, monkeypatch):
        fake_module = type(sys)("ultralytics")
        fake_module.YOLO = lambda model_name: FakeYoloModel(
            results=[], names={0: "person", 1: "chair", 2: "car"}
        )
        monkeypatch.setitem(sys.modules, "ultralytics", fake_module)

        detector = agent.YoloDetector("yolov8n.pt")

        assert detector.is_custom is False


# ---------------------------------------------------------------------------
# Backend
# ---------------------------------------------------------------------------

class FakeResponse:
    def __init__(self, status_code=200, payload=None, text=""):
        self.status_code = status_code
        self.ok = 200 <= status_code < 300
        self._payload = payload or {}
        self.text = text

    def json(self):
        return self._payload


class TestBackend:
    def test_heartbeat_ok_applies_new_settings(self, monkeypatch):
        monkeypatch.setattr(
            agent.requests, "post",
            lambda *a, **k: FakeResponse(200, {"settings": {"sensitivity": 90}}),
        )
        agent.settings.update({"sensitivity": 60, "enabled": True})

        backend = agent.Backend("http://example.test", "some-key")
        assert backend.heartbeat() == "ok"
        assert agent.current_settings()["sensitivity"] == 90

    def test_heartbeat_rejected_on_401(self, monkeypatch):
        monkeypatch.setattr(agent.requests, "post", lambda *a, **k: FakeResponse(401))
        backend = agent.Backend("http://example.test", "wrong-key")
        assert backend.heartbeat() == "rejected"

    def test_heartbeat_unreachable_on_network_error(self, monkeypatch):
        def raise_it(*_a, **_k):
            raise agent.requests.RequestException("connection refused")

        monkeypatch.setattr(agent.requests, "post", raise_it)
        backend = agent.Backend("http://example.test", "some-key")
        assert backend.heartbeat() == "unreachable"

    def test_heartbeat_unreachable_on_server_error(self, monkeypatch):
        monkeypatch.setattr(agent.requests, "post", lambda *a, **k: FakeResponse(500))
        backend = agent.Backend("http://example.test", "some-key")
        assert backend.heartbeat() == "unreachable"

    def test_send_alert_posts_expected_payload(self, monkeypatch):
        captured = {}

        def fake_post(url, json=None, headers=None, timeout=None):
            captured["url"] = url
            captured["json"] = json
            captured["headers"] = headers
            return FakeResponse(201)

        monkeypatch.setattr(agent.requests, "post", fake_post)

        backend = agent.Backend("http://example.test/", "device-key-123")
        backend.send_alert("package", 0.876543, note="a box on the porch")

        assert captured["url"] == "http://example.test/api/alerts"
        assert captured["headers"] == {"X-Device-Key": "device-key-123"}
        # Confidence is rounded before it ever hits the wire.
        assert captured["json"] == {
            "detection_type": "package",
            "confidence": 0.877,
            "note": "a box on the porch",
        }

    def test_send_alert_does_not_raise_on_network_error(self, monkeypatch):
        def raise_it(*_a, **_k):
            raise agent.requests.RequestException("timed out")

        monkeypatch.setattr(agent.requests, "post", raise_it)
        backend = agent.Backend("http://example.test", "some-key")

        backend.send_alert("motion", 0.5)  # must not raise


# ---------------------------------------------------------------------------
# Collector
# ---------------------------------------------------------------------------

class TestCollector:
    def test_save_writes_a_real_image_file(self, tmp_path):
        collector = agent.Collector(str(tmp_path))
        collector.save(make_frame(value=128), "package")

        saved = list((tmp_path / "images").iterdir())
        assert len(saved) == 1
        assert saved[0].name.startswith("package_")
        assert saved[0].stat().st_size > 0
        assert collector.saved == 1

    def test_repeated_saves_do_not_collide(self, tmp_path):
        collector = agent.Collector(str(tmp_path))
        for _ in range(3):
            collector.save(make_frame(), "motion")

        saved = list((tmp_path / "images").iterdir())
        assert len(saved) == 3  # distinct filenames even within the same second
        assert collector.saved == 3


# ---------------------------------------------------------------------------
# The video server's /health endpoint
# ---------------------------------------------------------------------------

class TestCameraHealth:
    def test_health_reflects_current_frame_and_settings(self):
        import requests as real_requests

        original_frame = agent.shared_frame.get()
        original_settings = agent.current_settings()
        try:
            agent.shared_frame.set(None)
            agent.settings.clear()
            agent.settings.update({"sensitivity": 42, "enabled": False})

            server = agent.start_video_server(0)  # port 0 -> OS picks a free one
            port = server.server_address[1]
            try:
                time.sleep(0.2)  # give the daemon thread a moment to start accepting
                response = real_requests.get(f"http://127.0.0.1:{port}/health", timeout=5)
                body = response.json()

                assert response.status_code == 200
                assert body["ok"] is True
                assert body["camera"] is False  # no frame published yet
                assert body["settings"] == {"sensitivity": 42, "enabled": False}
            finally:
                server.shutdown()
        finally:
            agent.shared_frame.set(original_frame)
            agent.settings.clear()
            agent.settings.update(original_settings)
