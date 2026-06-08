import pytest
import jwt
from datetime import datetime, timedelta
from werkzeug.security import generate_password_hash
from app import create_app
from app.extensions import db
from app.models import Company, CompanyBankAccount, CentralWallet, User, Account, Employee, Batch, BatchItem, AuditLog

class TestConfig:
    TESTING = True
    SQLALCHEMY_DATABASE_URI = 'sqlite:///:memory:'
    SQLALCHEMY_TRACK_MODIFICATIONS = False
    SECRET_KEY = 'test-secret-key'
    JWT_SECRET_KEY = 'test-jwt-secret-key-at-least-32-bytes'
    JWT_EXPIRATION_HOURS = 24
    UPLOAD_FOLDER = '/tmp/upay_test_uploads'
    ALLOWED_EXTENSIONS = {'xlsx', 'xls', 'csv'}


@pytest.fixture
def app():
    app = create_app(TestConfig)
    with app.app_context():
        db.create_all()
        seed_test_data()
        yield app
        db.session.remove()
        db.drop_all()


@pytest.fixture
def client(app):
    return app.test_client()


def seed_test_data():
    # 1. Companies
    c1 = Company(id=1, company_name='PRAN FMCG Corp', corporate_account_number='CORP-PRAN-101', central_wallet_balance=5000000.00, status='ACTIVE')
    c2 = Company(id=2, company_name='Apex Footwear Ltd', corporate_account_number='CORP-APEX-102', central_wallet_balance=3000000.00, status='ACTIVE')
    db.session.add_all([c1, c2])
    db.session.flush()

    # 2. Bank Accounts
    ba1 = CompanyBankAccount(id=1, company_id=1, bank_name='United Commercial Bank (UCB)', branch_name='Gulshan', account_name='PRAN Payout', account_number='09511010001', routing_number='245260951', is_primary=True)
    ba2 = CompanyBankAccount(id=2, company_id=2, bank_name='City Bank', branch_name='Principal', account_name='Apex Payout', account_number='11018899221', routing_number='225271101', is_primary=True)
    db.session.add_all([ba1, ba2])

    # 3. Wallets
    w1 = CentralWallet(id=1, company_id=1, wallet_name='Main Disbursement Wallet', account_number='CW-PRAN-01', balance=5000000.00, wallet_type='MAIN', status='ACTIVE')
    w2 = CentralWallet(id=2, company_id=2, wallet_name='Main Disbursement Wallet', account_number='CW-APEX-01', balance=3000000.00, wallet_type='MAIN', status='ACTIVE')
    db.session.add_all([w1, w2])

    # 4. Users
    # Explicit PBKDF2 keeps the test suite compatible with Python builds that
    # do not expose hashlib.scrypt; production authentication accepts either.
    pwd = generate_password_hash('password123', method='pbkdf2:sha256')
    u_maker = User(id=1, company_id=1, full_name='Tanvir Maker', email='maker1@pran.com', phone_number='01711000001', password_hash=pwd, role='MAKER', status='ACTIVE')
    u_checker = User(id=2, company_id=1, full_name='Dipra Checker', email='checker1@pran.com', phone_number='01711000002', password_hash=pwd, role='CHECKER', status='ACTIVE')
    u_maker2 = User(id=3, company_id=2, full_name='Rahim Maker', email='maker2@apex.com', phone_number='01811000003', password_hash=pwd, role='MAKER', status='ACTIVE')
    u_admin = User(id=4, company_id=None, full_name='System Admin', email='admin@upay.com.bd', phone_number='01911000000', password_hash=pwd, role='ADMIN', status='ACTIVE')
    u_inactive = User(id=5, company_id=1, full_name='Inactive User', email='inactive@pran.com', phone_number='01711000005', password_hash=pwd, role='MAKER', status='INACTIVE')
    db.session.add_all([u_maker, u_checker, u_maker2, u_admin, u_inactive])

    # 5. Core Accounts
    accs = [
        Account(phone_number='01711112233', account_holder_name='Karim Rahman', account_status='ACTIVE'),
        Account(phone_number='01722223344', account_holder_name='Nasrin Akter', account_status='ACTIVE'),
        Account(phone_number='01733334455', account_holder_name='Sujon Islam', account_status='ACTIVE'),
        Account(phone_number='01755556677', account_holder_name='Inactive Mobile', account_status='INACTIVE'),
    ]
    db.session.add_all(accs)

    # 6. Approved HR Employees
    emps = [
        Employee(id=1, company_id=1, employee_code='EMP-001', phone_number='01711112233', employee_name='Karim Rahman', department='IT', completed_cycles=5),
        Employee(id=2, company_id=1, employee_code='EMP-002', phone_number='01722223344', employee_name='Nasrin Akter', department='Finance', completed_cycles=5),
        Employee(id=3, company_id=2, employee_code='APEX-001', phone_number='01733334455', employee_name='Sujon Islam', department='Production', completed_cycles=3)
    ]
    db.session.add_all(emps)
    db.session.commit()


def make_token(user_id, company_id, role, email='test@upay.com'):
    payload = {
        'user_id': user_id,
        'company_id': company_id,
        'email': email,
        'role': role,
        'exp': datetime.utcnow() + timedelta(hours=1)
    }
    return jwt.encode(payload, TestConfig.JWT_SECRET_KEY, algorithm='HS256')


@pytest.fixture
def maker_auth():
    token = make_token(1, 1, 'MAKER', 'maker1@pran.com')
    return {'Authorization': f'Bearer {token}'}


@pytest.fixture
def checker_auth():
    token = make_token(2, 1, 'CHECKER', 'checker1@pran.com')
    return {'Authorization': f'Bearer {token}'}


@pytest.fixture
def maker2_auth():
    token = make_token(3, 2, 'MAKER', 'maker2@apex.com')
    return {'Authorization': f'Bearer {token}'}


@pytest.fixture
def admin_auth():
    token = make_token(4, None, 'ADMIN', 'admin@upay.com.bd')
    return {'Authorization': f'Bearer {token}'}
