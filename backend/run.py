import sys
from app import create_app
from app.config import Config
from app.extensions import db
from app.services.seed_service import seed_database

app = create_app()

if __name__ == '__main__':
    with app.app_context():
        db.create_all()
        if '--seed' in sys.argv or '-s' in sys.argv:
            seed_database()

    print(f"Starting upay Corporate Assist Flask Backend Server on http://127.0.0.1:{Config.PORT}")
    app.run(host='0.0.0.0', port=Config.PORT, debug=(Config.FLASK_ENV == 'development'))
