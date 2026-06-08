import json
import pytest

from app import create_app


def test_app_requires_configured_signing_secrets():
    class MissingSecretsConfig:
        SECRET_KEY = None
        JWT_SECRET_KEY = None

    with pytest.raises(RuntimeError, match='SECRET_KEY and JWT_SECRET_KEY'):
        create_app(MissingSecretsConfig)

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


def test_rbac_admin_endpoint_blocked_for_maker(client, maker_auth):
    res = client.get('/api/admin/overview', headers=maker_auth)
    assert res.status_code == 403
