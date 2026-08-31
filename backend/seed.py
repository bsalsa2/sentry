"""
Demo data.

The real Raspberry Pi isn't here yet, so this fills the database with a
believable-looking account, two cameras and a couple of days of alerts. That
way the dashboard has something to show while we build the frontend.

Run it directly:

    cd backend
    python seed.py

Or set SEED_DEMO_DATA=1 and it runs automatically the first time the app boots.
"""

import random
from datetime import timedelta

from models import Alert, Device, User, db, utcnow

DEMO_EMAIL = "demo@sentry.local"
DEMO_PASSWORD = "sentry123"

# Rough guide to how often each thing actually happens at a front door, so
# the fake history doesn't look uniformly random.
DETECTION_WEIGHTS = {
    "motion": 45,
    "person": 25,
    "vehicle": 15,
    "animal": 10,
    "package": 5,
}

NOTES = {
    "motion": ["movement near the gate", "movement on the driveway", "movement in frame"],
    "person": ["1 person at the door", "person walking past", "2 people on the path"],
    "vehicle": ["car pulled into driveway", "van passing", "car door opened"],
    "animal": ["cat on the wall", "dog in the garden", "bird in frame"],
    "package": ["parcel left at door", "package on step"],
}


def seed_demo_data(force: bool = False) -> User | None:
    """
    Create the demo account if it doesn't exist yet.

    Returns the demo user, or None if it already existed (so running this
    twice never creates duplicates).
    """
    existing = db.session.query(User).filter_by(email=DEMO_EMAIL).first()
    if existing and not force:
        return None

    if existing:
        # force=True means "wipe and rebuild the demo account".
        db.session.delete(existing)
        db.session.commit()

    user = User(email=DEMO_EMAIL, name="Demo User")
    user.set_password(DEMO_PASSWORD)
    db.session.add(user)
    db.session.flush()  # gives `user` its id without committing yet

    devices = [
        Device(
            user_id=user.id,
            name="Front Door",
            location="Porch",
            ip_address="192.168.1.100",
            sensitivity=70,
            api_key=Device.new_api_key(),
            # Recent last_seen, so this one shows as ONLINE.
            last_seen=utcnow() - timedelta(seconds=20),
        ),
        Device(
            user_id=user.id,
            name="Back Garden",
            location="Shed wall",
            ip_address="192.168.1.101",
            sensitivity=45,
            api_key=Device.new_api_key(),
            # Stale last_seen, so this one shows as OFFLINE - useful for
            # checking the dashboard renders both states.
            last_seen=utcnow() - timedelta(hours=6),
        ),
    ]
    db.session.add_all(devices)
    db.session.flush()

    # Spread ~40 alerts over the last two days.
    types = list(DETECTION_WEIGHTS.keys())
    weights = list(DETECTION_WEIGHTS.values())

    for _ in range(40):
        device = random.choice(devices)
        detection_type = random.choices(types, weights=weights, k=1)[0]
        minutes_ago = random.randint(2, 60 * 48)

        db.session.add(
            Alert(
                device_id=device.id,
                detection_type=detection_type,
                # People/vehicles are detected confidently; plain motion less so.
                confidence=round(random.uniform(0.55, 0.98), 3),
                note=random.choice(NOTES[detection_type]),
                acknowledged=minutes_ago > 240,  # older ones are "already seen"
                timestamp=utcnow() - timedelta(minutes=minutes_ago),
            )
        )

    db.session.commit()
    return user


if __name__ == "__main__":
    from app import create_app

    app = create_app()
    with app.app_context():
        created = seed_demo_data(force=True)
        print("Demo data created.")
        print(f"  Login with:  {DEMO_EMAIL}  /  {DEMO_PASSWORD}")
        for device in created.devices:
            print(f"  Device '{device.name}' key: {device.api_key}")
