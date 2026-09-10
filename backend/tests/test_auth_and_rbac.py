import json
import pytest

from app import create_app
from tests.conftest import TestConfig


def test_app_requires_configured_signing_secrets():
    class MissingSecretsConfig:
        SECRET_KEY = None
        JWT_SECRET_KEY = None

    with pytest.raises(RuntimeError, match='SECRET_KEY and JWT_SECRET_KEY'):
        create_app(MissingSecretsConfig)


def test_production_rejects_weak_jwt_secret():
    class WeakProductionConfig(TestConfig):
        TESTING = False
        FLASK_ENV = 'production'
        JWT_SECRET_KEY = 'weak-secret'

    with pytest.raises(RuntimeError, match='at least 32 bytes'):
        create_app(WeakProductionConfig)


def test_production_rejects_weak_flask_secret():
    class WeakProductionConfig(TestConfig):
        TESTING = False
        FLASK_ENV = 'production'
        SECRET_KEY = 'weak-secret'

    with pytest.raises(RuntimeError, match='at least 32 bytes'):
        create_app(WeakProductionConfig)

def test_login_success(client):
    res = client.post('/api/auth/login', json={
        'email': 'maker1@pran.com',
        'password': 'password123'
    })
    assert res.status_code == 200
    data = res.get_json()
    assert 'token' in data
    assert data['user']['role'] == 'MAKER'
    assert data['user']['company_id'] == 1
    assert 'upay_test_session=' in res.headers['Set-Cookie']
    assert 'HttpOnly' in res.headers['Set-Cookie']

    me = client.get('/api/auth/me')
    assert me.status_code == 200
    assert me.get_json()['user']['id'] == data['user']['id']


def test_logout_clears_cookie_session(client):
    client.post('/api/auth/login', json={'email': 'maker1@pran.com', 'password': 'password123'})
    assert client.get('/api/auth/me').status_code == 200
    response = client.post('/api/auth/logout')
    assert response.status_code == 200
    assert client.get('/api/auth/me').status_code == 401


def test_cookie_authenticated_mutation_rejects_unknown_origin(client):
    client.post('/api/auth/login', json={'email': 'maker1@pran.com', 'password': 'password123'})
    response = client.post(
        '/api/batches/upload',
        headers={'Origin': 'https://attacker.example'},
        json={'company_id': 1, 'items': []},
    )
    assert response.status_code == 403


def test_login_invalid_password(client):
    res = client.post('/api/auth/login', json={
        'email': 'maker1@pran.com',
        'password': 'wrongpassword'
    })
    assert res.status_code == 401


def test_login_inactive_user_blocked(client):
    res = client.post('/api/auth/login', json={
        'email': 'inactive@pran.com',
        'password': 'password123'
    })
    assert res.status_code == 403
    assert 'suspended' in res.get_json()['error'].lower() or 'inactive' in res.get_json()['error'].lower()


def test_me_endpoint_with_valid_token(client, maker_auth):
    res = client.get('/api/auth/me', headers=maker_auth)
    assert res.status_code == 200
    assert res.get_json()['user']['email'] == 'maker1@pran.com'


def test_me_endpoint_without_token(client):
    res = client.get('/api/auth/me')
    assert res.status_code == 401


def test_optional_session_endpoint_for_logged_out_browser(client):
    res = client.get('/api/auth/session')
    assert res.status_code == 200
    assert res.get_json() == {'authenticated': False, 'user': None}


def test_optional_session_endpoint_restores_login_cookie(client):
    client.post('/api/auth/login', json={
        'email': 'maker1@pran.com',
        'password': 'password123',
    })
    res = client.get('/api/auth/session')
    assert res.status_code == 200
    assert res.get_json()['authenticated'] is True
    assert res.get_json()['user']['id'] == 1


def test_rbac_admin_endpoint_blocked_for_maker(client, maker_auth):
    res = client.get('/api/admin/overview', headers=maker_auth)
    assert res.status_code == 403
