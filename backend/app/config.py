import os
from dotenv import load_dotenv

BASE_DIR = os.path.abspath(os.path.dirname(os.path.dirname(__file__)))

# Load environment variables from backend/.env
env_path = os.path.join(BASE_DIR, ".env")
if os.path.exists(env_path):
    load_dotenv(env_path)


class Config:
    PORT = int(os.environ.get("PORT", 5000))
    HOST = os.environ.get("HOST", "127.0.0.1")
    FLASK_ENV = os.environ.get("FLASK_ENV", "development")
    SECRET_KEY = os.environ.get("SECRET_KEY")
    JWT_SECRET_KEY = os.environ.get("JWT_SECRET_KEY")
    JWT_EXPIRATION_HOURS = int(os.environ.get("JWT_EXPIRATION_HOURS", 24))
    # Cookies are host-scoped, not port-scoped.  Keep separate sessions for
    # localhost:3000 (corporate) and localhost:3001 (admin).
    CORPORATE_AUTH_COOKIE_NAME = os.environ.get(
        "CORPORATE_AUTH_COOKIE_NAME", "upay_corporate_session"
    )
    ADMIN_AUTH_COOKIE_NAME = os.environ.get("ADMIN_AUTH_COOKIE_NAME", "upay_admin_session")
    AUTH_COOKIE_SECURE = os.environ.get("AUTH_COOKIE_SECURE", "false").lower() in {
        "1",
        "true",
        "yes",
    }
    CORS_ORIGINS = tuple(
        origin.strip()
        for origin in os.environ.get(
            "CORS_ORIGINS",
            "http://localhost:3000,http://localhost:3001,http://127.0.0.1:3000,http://127.0.0.1:3001",
        ).split(",")
        if origin.strip()
    )
    RATELIMIT_STORAGE_URI = os.environ.get("RATELIMIT_STORAGE_URI", "memory://")

    # Mandatory PostgreSQL Database Connection
    # Default connection: postgresql://localhost:5432/upay_corporate_assist
    db_url = os.environ.get("DATABASE_URL", "postgresql://localhost:5432/upay_corporate_assist")
    if db_url.startswith("postgres://"):
        db_url = db_url.replace("postgres://", "postgresql://", 1)

    SQLALCHEMY_DATABASE_URI = db_url
    SQLALCHEMY_TRACK_MODIFICATIONS = False

    # File Upload configuration
    UPLOAD_FOLDER = os.path.join(BASE_DIR, os.environ.get("UPLOAD_FOLDER", "uploads"))
    MAX_CONTENT_LENGTH = 16 * 1024 * 1024  # 16 MB max limit
    MAX_SPREADSHEET_EXPANDED_SIZE = 64 * 1024 * 1024
    ALLOWED_EXTENSIONS = {"xlsx", "xls", "csv"}
