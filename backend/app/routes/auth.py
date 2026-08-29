import jwt
from datetime import datetime, timedelta
from flask import Blueprint, request, jsonify, current_app, g
from werkzeug.security import check_password_hash
from app.models import User
from app.utils.auth import require_auth

auth_bp = Blueprint('auth', __name__, url_prefix='/api/auth')

@auth_bp.route('/login', methods=['POST'])
def login():
    data = request.get_json() or {}
    email = data.get('email', '').strip().lower()
    password = data.get('password', '').strip()

    if not email or not password:
        return jsonify({'error': 'Both email and password are required.'}), 400

    # Search for user by email
    user = User.query.filter_by(email=email).first()
    if not user:
        return jsonify({'error': 'Invalid email address or password.'}), 401

    if user.status != 'ACTIVE':
        return jsonify({'error': 'Your user account is suspended or inactive. Contact support.'}), 403

    # Verify password against hash
    is_valid = False
    try:
        if check_password_hash(user.password_hash, password):
            is_valid = True
    except Exception:
        pass

    if not is_valid:
        return jsonify({'error': 'Invalid email address or password.'}), 401

    payload = {
        'user_id': user.id,
        'company_id': user.company_id,
        'full_name': user.full_name,
        'email': user.email,
        'role': user.role,
        'exp': datetime.utcnow() + timedelta(hours=current_app.config['JWT_EXPIRATION_HOURS'])
    }
    
    token = jwt.encode(payload, current_app.config['JWT_SECRET_KEY'], algorithm='HS256')

    return jsonify({
        'message': 'Login successful',
        'token': token,
        'user': user.to_dict()
    }), 200


@auth_bp.route('/me', methods=['GET'])
@require_auth()
def get_me():
    return jsonify({'user': g.current_user.to_dict()}), 200
