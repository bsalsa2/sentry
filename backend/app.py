"""
Sentry backend - main entry point.

Run it locally with:

    cd backend
    pip install -r requirements.txt
    python app.py

Then open http://localhost:5000/api/health to check it's alive.
"""

import os

from flask import Flask, jsonify
from flask_cors import CORS
from flask_migrate import Migrate

from config import Config
from models import DETECTION_TYPES, db

migrate = Migrate()


def create_app(config_object=Config) -> Flask:
    """
    Build and configure the Flask application.

    This is called a "factory". Doing it in a function (instead of at the top
    of the file) means the tests can create their own copy of the app with a
    throwaway database.
    """
    app = Flask(__name__)
    app.config.from_object(config_object)

    # --- Extensions -----------------------------------------------------
    db.init_app(app)
    migrate.init_app(app, db)

    # Allow the React frontend, hosted on a different domain, to call us.
    CORS(
        app,
        resources={r"/api/*": {"origins": app.config["CORS_ORIGINS"]}},
        supports_credentials=False,
    )

    # --- Routes ---------------------------------------------------------
    # Imported here rather than at the top of the file to avoid circular
    # imports (routes need `app`, `app` needs routes).
    from routes.alerts import bp as alerts_bp
    from routes.auth import bp as auth_bp
    from routes.camera import bp as camera_bp
    from routes.devices import bp as devices_bp

    app.register_blueprint(auth_bp)
    app.register_blueprint(devices_bp)
    app.register_blueprint(alerts_bp)
    app.register_blueprint(camera_bp)

    @app.get("/api/health")
    def health():
        """A simple 'is the server up?' check for uptime monitors and deploys."""
        return jsonify({
            "status": "ok",
            "service": "sentry-backend",
            "detection_types": list(DETECTION_TYPES),
        })

    @app.get("/")
    def index():
        """Friendly landing page if someone opens the backend URL directly."""
        return jsonify({
            "service": "Sentry API",
            "docs": "See docs/API.md in the repository",
            "health": "/api/health",
        })

    # --- Error handling -------------------------------------------------
    # Return JSON for errors, never HTML - the frontend always expects JSON.
    @app.errorhandler(404)
    def not_found(_error):
        return jsonify({"error": "That endpoint doesn't exist."}), 404

    @app.errorhandler(405)
    def bad_method(_error):
        return jsonify({"error": "Wrong HTTP method for that endpoint."}), 405

    @app.errorhandler(500)
    def server_error(_error):
        db.session.rollback()
        return jsonify({"error": "Something went wrong on the server."}), 500

    # --- Database -------------------------------------------------------
    with app.app_context():
        # Create any missing tables. For an MVP this is enough; use
        # `flask db migrate` once the schema starts changing in real use.
        db.create_all()

        if app.config.get("SEED_DEMO_DATA"):
            from seed import seed_demo_data

            seed_demo_data()

    return app


# Gunicorn (used in production) looks for a module-level `app` object.
app = create_app()


if __name__ == "__main__":
    # threaded=True matters: the live-alert stream and camera feed hold
    # connections open, and without threads they would block everything else.
    port = int(os.environ.get("PORT", 5000))
    app.run(host="0.0.0.0", port=port, debug=True, threaded=True)
