from flask import Flask
from flask_cors import CORS
from app.config import Config
from app.extensions import db
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

    # Initialize Extensions
    db.init_app(app)
    CORS(app, resources={r"/api/*": {"origins": "*"}})

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
        return {'status': 'healthy', 'service': 'upay Corporate Assist Backend Engine'}, 200

    return app
