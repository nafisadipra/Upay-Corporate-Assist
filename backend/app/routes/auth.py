import jwt
from datetime import datetime, timedelta
from flask import Blueprint, request, jsonify, current_app, g
from werkzeug.security import check_password_hash
from app.extensions import db
from app.models import User
from app.utils.auth import require_auth
from app.extensions import limiter

auth_bp = Blueprint('auth', __name__, url_prefix='/api/auth')

@auth_bp.route('/login', methods=['POST'])
@limiter.limit('5 per minute')
def login():
    data = request.get_json(silent=True) or {}
    email = data.get('email', '').strip().lower()
    password = str(data.get('password', ''))

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

    response = jsonify({
        'message': 'Login successful',
        'token': token,
        'user': user.to_dict()
    })
    response.set_cookie(
        current_app.config['AUTH_COOKIE_NAME'],
        token,
        max_age=current_app.config['JWT_EXPIRATION_HOURS'] * 60 * 60,
        httponly=True,
        secure=current_app.config['AUTH_COOKIE_SECURE'],
        samesite='Lax',
        path='/',
    )
    return response, 200


@auth_bp.route('/me', methods=['GET'])
@require_auth()
def get_me():
    return jsonify({'user': g.current_user.to_dict()}), 200


@auth_bp.route('/session', methods=['GET'])
def get_session():
    """Return the current user when present without treating a logged-out browser as an error."""
    auth_header = request.headers.get('Authorization', '')
    bearer_token = auth_header.split(' ', 1)[1].strip() if auth_header.startswith('Bearer ') else None
    cookie_token = request.cookies.get(current_app.config['AUTH_COOKIE_NAME'])
    token = bearer_token or cookie_token

    if not token:
        return jsonify({'authenticated': False, 'user': None}), 200

    try:
        payload = jwt.decode(token, current_app.config['JWT_SECRET_KEY'], algorithms=['HS256'])
        user_id = payload.get('user_id')
        user = db.session.get(User, user_id) if user_id is not None else None
    except jwt.InvalidTokenError:
        user = None

    if not user or user.status != 'ACTIVE':
        response = jsonify({'authenticated': False, 'user': None})
        if cookie_token:
            response.delete_cookie(
                current_app.config['AUTH_COOKIE_NAME'],
                secure=current_app.config['AUTH_COOKIE_SECURE'],
                samesite='Lax',
                path='/',
            )
        return response, 200

    return jsonify({'authenticated': True, 'user': user.to_dict()}), 200


@auth_bp.route('/logout', methods=['POST'])
def logout():
    response = jsonify({'message': 'Signed out successfully.'})
    response.delete_cookie(
        current_app.config['AUTH_COOKIE_NAME'],
        secure=current_app.config['AUTH_COOKIE_SECURE'],
        samesite='Lax',
        path='/',
    )
    return response, 200
