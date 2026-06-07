from functools import wraps
import jwt
from flask import request, jsonify, current_app, g
from app.models import User

def require_auth(roles=None):
    """
    Middleware decorator enforcing JWT authentication, active user status, and role authorization.
    Attaches authenticated User model to flask.g.current_user.
    """
    def decorator(f):
        @wraps(f)
        def decorated_function(*args, **kwargs):
            auth_header = request.headers.get('Authorization', '')
            if not auth_header.startswith('Bearer '):
                return jsonify({'error': 'Authentication token is required (Bearer <token>)'}), 401

            token = auth_header.split(' ', 1)[1].strip()
            try:
                payload = jwt.decode(
                    token,
                    current_app.config['JWT_SECRET_KEY'],
                    algorithms=['HS256']
                )
            except jwt.ExpiredSignatureError:
                return jsonify({'error': 'Authentication token has expired. Please sign in again.'}), 401
            except jwt.InvalidTokenError:
                return jsonify({'error': 'Invalid authentication token.'}), 401

            user_id = payload.get('user_id')
            user = User.query.get(user_id)
            if not user:
                return jsonify({'error': 'User associated with this token no longer exists.'}), 401

            if user.status != 'ACTIVE':
                return jsonify({'error': 'User account is inactive or suspended. Access denied.'}), 403

            if roles:
                allowed_roles = roles if isinstance(roles, (list, set, tuple)) else [roles]
                if user.role not in allowed_roles:
                    return jsonify({'error': f"Access denied. Requires one of roles: {', '.join(allowed_roles)}"}), 403

            g.current_user = user
            return f(*args, **kwargs)
        return decorated_function
    return decorator


def require_tenant(company_id_key='company_id'):
    """
    Ensures that non-admin users can only access data belonging to their own company.
    """
    def decorator(f):
        @wraps(f)
        def decorated_function(*args, **kwargs):
            user = getattr(g, 'current_user', None)
            if not user:
                return jsonify({'error': 'Authentication required'}), 401

            # System ADMIN has global visibility
            if user.role == 'ADMIN':
                return f(*args, **kwargs)

            # Extract company_id from kwargs, query params, form, or json
            req_company_id = kwargs.get(company_id_key)
            if req_company_id is None:
                req_company_id = request.args.get(company_id_key, type=int)
            if req_company_id is None and request.is_json:
                data = request.get_json(silent=True) or {}
                req_company_id = data.get(company_id_key)
            if req_company_id is None and request.form:
                req_company_id = request.form.get(company_id_key, type=int)

            if req_company_id is not None and int(req_company_id) != user.company_id:
                return jsonify({'error': 'Tenant boundary violation: Access to other corporate client data is forbidden.'}), 403

            return f(*args, **kwargs)
        return decorated_function
    return decorator
