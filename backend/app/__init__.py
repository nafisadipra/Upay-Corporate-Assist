from flask import Flask
from flask_cors import CORS
from sqlalchemy import text
from sqlalchemy.exc import SQLAlchemyError
from app.config import Config
from app.extensions import db, limiter
from app.routes.auth import auth_bp
from app.routes.companies import companies_bp
from app.routes.batches import batches_bp
from app.routes.risk_alerts import risk_alerts_bp
from app.routes.analytics import analytics_bp
from app.routes.audit import audit_bp
from app.routes.admin import admin_bp
from app.routes.employee_registrations import registrations_bp

def create_app(config_class=Config):
    app = Flask(__name__)
    app.config.from_object(config_class)

    if not app.config.get('SECRET_KEY') or not app.config.get('JWT_SECRET_KEY'):
        raise RuntimeError('SECRET_KEY and JWT_SECRET_KEY must be configured.')
    signing_secrets = (app.config['SECRET_KEY'], app.config['JWT_SECRET_KEY'])
    weak_signing_secret = any(
        len(secret.encode('utf-8')) < 32
        or any(marker in secret.lower() for marker in ('replace', 'change-in', 'example', 'development-secret'))
        for secret in signing_secrets
    )
    if not app.config.get('TESTING') and app.config.get('FLASK_ENV') != 'development' and weak_signing_secret:
        raise RuntimeError('SECRET_KEY and JWT_SECRET_KEY must each be random secrets of at least 32 bytes.')

    # Initialize Extensions
    db.init_app(app)
    limiter.init_app(app)
    CORS(
        app,
        resources={r"/api/*": {"origins": app.config['CORS_ORIGINS']}},
        supports_credentials=True,
    )

    # Register Blueprints
    app.register_blueprint(auth_bp)
    app.register_blueprint(companies_bp)
    app.register_blueprint(batches_bp)
    app.register_blueprint(risk_alerts_bp)
    app.register_blueprint(analytics_bp)
    app.register_blueprint(audit_bp)
    app.register_blueprint(admin_bp)
    app.register_blueprint(registrations_bp)

    @app.route('/health', methods=['GET'])
    def health_check():
        try:
            db.session.execute(text('SELECT 1'))
        except SQLAlchemyError:
            db.session.rollback()
            app.logger.exception('Database health check failed.')
            return {
                'status': 'unhealthy',
                'service': 'upay Corporate Assist Backend Engine',
                'database': 'unavailable',
            }, 503
        return {
            'status': 'healthy',
            'service': 'upay Corporate Assist Backend Engine',
            'database': 'connected',
        }, 200

    return app
