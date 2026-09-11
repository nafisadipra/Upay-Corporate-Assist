import sys
from app import create_app
from app.config import Config
from app.extensions import db
from app.services.seed_service import seed_database

app = create_app()

if __name__ == "__main__":
    with app.app_context():
        db.create_all()
        if "--seed" in sys.argv or "-s" in sys.argv:
            seed_database()

    print(
        f"Starting upay Corporate Assist Flask Backend Server on http://{Config.HOST}:{Config.PORT}"
    )
    app.run(
        host=Config.HOST,
        port=Config.PORT,
        debug=False,
        use_reloader=Config.FLASK_ENV == "development",
    )
