"""
Real-time alert delivery using Server-Sent Events (SSE).

Why SSE instead of WebSockets?
  - It is just a normal HTTP request that stays open, so it works on free
    hosting and through company/school firewalls that block WebSockets.
  - The browser reconnects automatically if the connection drops.
  - No extra Python packages needed.

How it works: every browser tab that opens /api/alerts/stream gets its own
Queue. When a new alert arrives we drop a copy into every queue belonging to
that alert's owner, and each open connection sends it straight to the browser.

Note: the queues live in this server's memory, so alerts only reach browsers
connected to the *same* server process. That is fine on the free tier (one
worker). If you ever scale to several workers, swap this file for Redis pub/sub.
"""

import json
import queue
import threading

# user_id -> list of Queues (one per open browser tab)
_subscribers: dict[int, list[queue.Queue]] = {}
_lock = threading.Lock()


def subscribe(user_id: int) -> queue.Queue:
    """Register a new listener and hand back its queue."""
    q: queue.Queue = queue.Queue(maxsize=50)
    with _lock:
        _subscribers.setdefault(user_id, []).append(q)
    return q


def unsubscribe(user_id: int, q: queue.Queue) -> None:
    """Remove a listener once its browser tab goes away."""
    with _lock:
        listeners = _subscribers.get(user_id, [])
        if q in listeners:
            listeners.remove(q)
        if not listeners:
            _subscribers.pop(user_id, None)


def publish(user_id: int, event: str, data: dict) -> None:
    """Send an event to every open tab belonging to one user."""
    message = {"event": event, "data": data}
    with _lock:
        listeners = list(_subscribers.get(user_id, []))

    for q in listeners:
        try:
            q.put_nowait(message)
        except queue.Full:
            # That tab isn't keeping up (laptop asleep?). Skip it rather than
            # blocking everyone else - it will catch up when it reloads.
            pass


def format_sse(event: str, data: dict) -> str:
    """Turn a message into the text format the browser's EventSource expects."""
    return f"event: {event}\ndata: {json.dumps(data)}\n\n"


def listener_count(user_id: int) -> int:
    """How many tabs this user has open. Handy for debugging."""
    with _lock:
        return len(_subscribers.get(user_id, []))
