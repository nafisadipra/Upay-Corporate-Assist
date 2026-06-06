from decimal import Decimal, InvalidOperation
from flask import Blueprint, jsonify, g, request
from app.extensions import db
from app.models import AuditLog, Company, CentralWallet, Employee, CompanyBankAccount
from app.utils.auth import require_auth, require_tenant

companies_bp = Blueprint('companies', __name__, url_prefix='/api/companies')

@companies_bp.route('', methods=['GET'])
@require_auth()
def get_companies():
    user = g.current_user
    if user.role != 'ADMIN':
        companies = Company.query.filter_by(id=user.company_id).all()
    else:
        companies = Company.query.all()
    return jsonify({'companies': [c.to_dict() for c in companies]}), 200


@companies_bp.route('/<int:company_id>', methods=['GET'])
@require_auth()
@require_tenant()
def get_company(company_id):
    company = Company.query.get(company_id)
    if not company:
        return jsonify({'error': 'Company not found'}), 404
    
    wallets = CentralWallet.query.filter_by(company_id=company_id).all()
    bank_accounts = CompanyBankAccount.query.filter_by(company_id=company_id).all()
    res = company.to_dict()
    res['wallets'] = [w.to_dict() for w in wallets]
    res['bank_accounts'] = [ba.to_dict() for ba in bank_accounts]
    return jsonify({'company': res}), 200


@companies_bp.route('/<int:company_id>/wallets', methods=['GET'])
@require_auth()
@require_tenant()
def get_company_wallets(company_id):
    wallets = CentralWallet.query.filter_by(company_id=company_id).all()
    return jsonify({'wallets': [w.to_dict() for w in wallets]}), 200


@companies_bp.route('/<int:company_id>/wallets', methods=['POST'])
@require_auth(roles=['MAKER', 'ADMIN'])
@require_tenant()
def create_company_wallet(company_id):
    """Allow a corporate HR Maker to create a payroll wallet for their own company."""
    company = db.session.get(Company, company_id)
    if not company:
        return jsonify({'error': 'Company not found'}), 404
    if company.status != 'ACTIVE':
        return jsonify({'error': 'Inactive or suspended companies cannot create wallets'}), 403

    data = request.get_json(silent=True) or {}
    wallet_name = str(data.get('wallet_name', '')).strip()
    wallet_type = str(data.get('wallet_type', 'OPERATIONAL')).upper().strip()
    try:
        opening_balance = Decimal(str(data.get('opening_balance', 0)))
    except (InvalidOperation, TypeError, ValueError):
        return jsonify({'error': 'Opening balance must be a valid number'}), 400

    if not wallet_name:
        return jsonify({'error': 'Wallet name is required'}), 400
    if wallet_type not in {'MAIN', 'OPERATIONAL', 'FESTIVAL_BONUS', 'VENDOR'}:
        return jsonify({'error': 'Invalid wallet type'}), 400
    if opening_balance < 0:
        return jsonify({'error': 'Opening balance cannot be negative'}), 400

    account_number = str(data.get('account_number', '')).strip()
    if not account_number:
        wallet_count = CentralWallet.query.filter_by(company_id=company_id).count() + 1
        account_number = f'{company.corporate_account_number}-{wallet_type}-{wallet_count:03d}'
    if CentralWallet.query.filter_by(account_number=account_number).first():
        return jsonify({'error': 'Wallet account number is already in use'}), 409

    wallet = CentralWallet(
        company_id=company_id,
        wallet_name=wallet_name,
        account_number=account_number,
        balance=opening_balance,
        wallet_type=wallet_type,
        status='ACTIVE',
    )
    db.session.add(wallet)
    db.session.flush()
    company.sync_balance()
    db.session.add(AuditLog(
        company_id=company_id,
        user_id=g.current_user.id,
        audit_scope='CORPORATE_CLIENT',
        action='CORPORATE_WALLET_CREATED',
        details={'wallet_id': wallet.id, 'wallet_name': wallet_name, 'account_number': account_number, 'opening_balance': float(opening_balance)},
    ))
    db.session.commit()
    return jsonify({'message': 'Corporate wallet created successfully', 'wallet': wallet.to_dict(), 'company': company.to_dict()}), 201


@companies_bp.route('/<int:company_id>/wallets/<int:wallet_id>', methods=['PUT'])
@require_auth(roles=['MAKER', 'ADMIN'])
@require_tenant()
def update_company_wallet(company_id, wallet_id):
    """Allow the owning HR Maker to update wallet metadata and balance with an audit record."""
    company = db.session.get(Company, company_id)
    wallet = CentralWallet.query.filter_by(id=wallet_id, company_id=company_id).first()
    if not company or not wallet:
        return jsonify({'error': 'Company wallet not found'}), 404
    if company.status != 'ACTIVE':
        return jsonify({'error': 'Inactive or suspended companies cannot update wallets'}), 403

    data = request.get_json(silent=True) or {}
    previous_balance = Decimal(str(wallet.balance))
    if 'wallet_name' in data:
        wallet_name = str(data['wallet_name']).strip()
        if not wallet_name:
            return jsonify({'error': 'Wallet name cannot be empty'}), 400
        wallet.wallet_name = wallet_name
    if 'status' in data:
        status = str(data['status']).upper().strip()
        if status not in {'ACTIVE', 'INACTIVE', 'SUSPENDED'}:
            return jsonify({'error': 'Invalid wallet status'}), 400
        wallet.status = status
    if 'balance' in data:
        try:
            balance = Decimal(str(data['balance']))
        except (InvalidOperation, TypeError, ValueError):
            return jsonify({'error': 'Balance must be a valid number'}), 400
        if balance < 0:
            return jsonify({'error': 'Balance cannot be negative'}), 400
        wallet.balance = balance

    company.sync_balance()
    db.session.add(AuditLog(
        company_id=company_id,
        user_id=g.current_user.id,
        audit_scope='CORPORATE_CLIENT',
        action='CORPORATE_WALLET_UPDATED',
        details={'wallet_id': wallet.id, 'previous_balance': float(previous_balance), 'new_balance': float(wallet.balance), 'wallet_status': wallet.status},
    ))
    db.session.commit()
    return jsonify({'message': 'Corporate wallet updated successfully', 'wallet': wallet.to_dict(), 'company': company.to_dict()}), 200


@companies_bp.route('/<int:company_id>/employees', methods=['GET'])
@require_auth()
@require_tenant()
def get_company_employees(company_id):
    employees = Employee.query.filter_by(company_id=company_id).all()
    return jsonify({'employees': [e.to_dict() for e in employees]}), 200
