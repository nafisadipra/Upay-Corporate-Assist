import os
from decimal import Decimal
from functools import wraps
from werkzeug.security import generate_password_hash
from werkzeug.utils import secure_filename
from flask import Blueprint, current_app, g, jsonify, request
from app.extensions import db
from app.models import (
    AuditLog, Batch, BatchItem, CentralWallet, Company,
    CompanyBankAccount, Employee, Account, RiskAlert, User
)
from app.services.excel_parser import parse_employee_roster_file
from app.utils.auth import require_auth

admin_bp = Blueprint('admin', __name__, url_prefix='/api/admin')

def require_admin(view):
    """Decorator ensuring current user is an authenticated Upay System Administrator."""
    return require_auth(roles=['ADMIN'])(view)


def company_summary(company):
    wallets = CentralWallet.query.filter_by(company_id=company.id).all()
    bank_accounts = CompanyBankAccount.query.filter_by(company_id=company.id).all()
    users_count = User.query.filter_by(company_id=company.id).count()
    batches_count = Batch.query.filter_by(company_id=company.id).count()
    employees_count = Employee.query.filter_by(company_id=company.id).count()
    total_balance = sum((Decimal(str(w.balance)) for w in wallets if w.status == 'ACTIVE'), Decimal('0.00'))

    return {
        **company.to_dict(),
        'wallets': [wallet.to_dict() for wallet in wallets],
        'bank_accounts': [ba.to_dict() for ba in bank_accounts],
        'wallet_balance': float(total_balance),
        'users_count': users_count,
        'batches_count': batches_count,
        'employees_count': employees_count
    }


# =============================================================================
# 1. OVERVIEW & METRICS
# =============================================================================
@admin_bp.route('/overview', methods=['GET'])
@require_admin
def get_overview():
    companies = Company.query.order_by(Company.created_at.desc()).all()
    batches = Batch.query.all()
    total_employees = Employee.query.count()
    wallet_total = sum(
        (Decimal(str(wallet.balance)) for wallet in CentralWallet.query.filter_by(status='ACTIVE').all()),
        Decimal('0.00')
    )

    return jsonify({
        'metrics': {
            'corporates_count': len(companies),
            'active_corporates_count': sum(1 for c in companies if c.status == 'ACTIVE'),
            'wallet_balance_bdt': float(wallet_total),
            'total_employees_count': total_employees,
            'executed_amount_bdt': float(sum((Decimal(str(b.total_amount)) for b in batches if b.status == 'EXECUTED'), Decimal('0.00'))),
        },
        'companies': [company_summary(c) for c in companies],
    }), 200



# =============================================================================
# 2. COMPANY ONBOARDING & MANAGEMENT
# =============================================================================
@admin_bp.route('/companies', methods=['GET'])
@require_admin
def get_companies():
    companies = Company.query.order_by(Company.created_at.desc()).all()
    return jsonify({'companies': [company_summary(c) for c in companies]}), 200


@admin_bp.route('/companies/<int:company_id>', methods=['GET'])
@require_admin
def get_company(company_id):
    company = Company.query.get(company_id)
    if not company:
        return jsonify({'error': 'Company not found'}), 404
    return jsonify({'company': company_summary(company)}), 200


@admin_bp.route('/companies', methods=['POST'])
@require_admin
def create_company():
    """Onboard a new corporate client with initial central wallet float."""
    data = request.get_json() or {}
    company_name = str(data.get('company_name', '')).strip()
    account_number = str(data.get('corporate_account_number', '')).strip()
    wallet_name = str(data.get('wallet_name', 'Main Disbursement Wallet')).strip()

    try:
        opening_balance = Decimal(str(data.get('opening_balance', 0)))
    except Exception:
        return jsonify({'error': 'Opening balance must be a valid numeric amount'}), 400

    if not company_name or not account_number:
        return jsonify({'error': 'Company name and corporate account number are required'}), 400
    if opening_balance < 0:
        return jsonify({'error': 'Opening balance cannot be negative'}), 400
    if Company.query.filter_by(corporate_account_number=account_number).first():
        return jsonify({'error': 'Corporate account number is already registered'}), 409

    company = Company(
        company_name=company_name,
        corporate_account_number=account_number,
        central_wallet_balance=opening_balance,
        status='ACTIVE',
    )
    db.session.add(company)
    db.session.flush()

    wallet = CentralWallet(
        company_id=company.id,
        wallet_name=wallet_name or 'Main Disbursement Wallet',
        account_number=f'{account_number}-MAIN',
        balance=opening_balance,
        wallet_type='MAIN',
        status='ACTIVE',
    )
    db.session.add(wallet)

    db.session.add(AuditLog(
        company_id=company.id,
        user_id=g.current_user.id,
        audit_scope='UPAY_ADMIN',
        action='UPAY_ADMIN_COMPANY_ONBOARDED',
        details={
            'company_id': company.id,
            'company_name': company_name,
            'corporate_account_number': account_number,
            'opening_balance': float(opening_balance)
        },
    ))
    db.session.commit()
    return jsonify({'company': company_summary(company)}), 201


@admin_bp.route('/companies/<int:company_id>/status', methods=['PUT'])
@require_admin
def update_company_status(company_id):
    company = Company.query.get(company_id)
    if not company:
        return jsonify({'error': 'Corporate client not found'}), 404

    status = str((request.get_json() or {}).get('status', '')).upper()
    if status not in {'ACTIVE', 'INACTIVE', 'SUSPENDED'}:
        return jsonify({'error': 'Status must be ACTIVE, INACTIVE, or SUSPENDED'}), 400

    company.status = status
    db.session.add(AuditLog(
        company_id=company.id,
        user_id=g.current_user.id,
        audit_scope='UPAY_ADMIN',
        action='UPAY_ADMIN_COMPANY_STATUS_UPDATED',
        details={'company_id': company.id, 'company_name': company.company_name, 'status': status},
    ))
    db.session.commit()
    return jsonify({'company': company_summary(company)}), 200


# =============================================================================
# 3. COMPANY-BASED WALLET FLOAT / SALARY DISBURSEMENT MONEY TOP-UP
# =============================================================================
@admin_bp.route('/companies/<int:company_id>/topup', methods=['POST'])
@require_admin
def topup_company_wallet(company_id):
    """Credit salary disbursement money to a corporate client's main central wallet."""
    company = Company.query.get(company_id)
    if not company:
        return jsonify({'error': 'Corporate client not found'}), 404

    data = request.get_json() or {}
    try:
        amount = Decimal(str(data.get('amount', 0)))
    except Exception:
        return jsonify({'error': 'Top-up amount must be a valid positive number'}), 400

    if amount <= 0:
        return jsonify({'error': 'Top-up amount must be greater than zero'}), 400

    source_bank = data.get('source_bank', 'UCB Corporate Settlement')
    reference_note = data.get('reference_note', 'Pre-funded salary disbursement float top-up')

    wallet = CentralWallet.query.filter_by(company_id=company_id, wallet_type='MAIN').first()
    if not wallet:
        wallet = CentralWallet(
            company_id=company.id,
            wallet_name='Main Disbursement Wallet',
            account_number=f'{company.corporate_account_number}-MAIN',
            balance=amount,
            wallet_type='MAIN',
            status='ACTIVE'
        )
        db.session.add(wallet)
    else:
        wallet.balance = Decimal(str(wallet.balance)) + amount

    company.sync_balance()

    db.session.add(AuditLog(
        company_id=company.id,
        user_id=g.current_user.id,
        audit_scope='UPAY_ADMIN',
        action='UPAY_ADMIN_WALLET_TOPUP',
        details={
            'company_id': company.id,
            'company_name': company.company_name,
            'amount_bdt': float(amount),
            'new_balance': float(wallet.balance),
            'source_bank': source_bank,
            'reference_note': reference_note
        }
    ))
    db.session.commit()

    return jsonify({
        'message': f'Successfully credited BDT {float(amount):,.2f} to {company.company_name} central wallet.',
        'company': company_summary(company)
    }), 200


# =============================================================================
# 4. COMPANY-BASED EMPLOYEE EXCEL UPLOAD & ROSTER MANAGEMENT
# =============================================================================
@admin_bp.route('/companies/<int:company_id>/employees', methods=['GET'])
@require_admin
def get_company_employees(company_id):
    company = Company.query.get(company_id)
    if not company:
        return jsonify({'error': 'Corporate client not found'}), 404

    employees = Employee.query.filter_by(company_id=company_id).order_by(Employee.employee_code.asc()).all()
    return jsonify({
        'company_id': company_id,
        'company_name': company.company_name,
        'employees': [emp.to_dict() for emp in employees]
    }), 200


@admin_bp.route('/companies/<int:company_id>/employees/upload', methods=['POST'])
@require_admin
def upload_employee_roster(company_id):
    """
    Upload an Excel/CSV spreadsheet of company employees with Upay phone numbers.
    Populates/upserts the approved corporate HR roster used for disbursement screening.
    """
    company = Company.query.get(company_id)
    if not company:
        return jsonify({'error': 'Corporate client not found'}), 404

    if 'file' not in request.files or request.files['file'].filename == '':
        return jsonify({'error': 'Please attach an Excel (.xlsx/.xls) or CSV employee roster file.'}), 400

    file = request.files['file']
    filename = secure_filename(file.filename)
    os.makedirs(current_app.config['UPLOAD_FOLDER'], exist_ok=True)
    file_path = os.path.join(current_app.config['UPLOAD_FOLDER'], f'roster_{company_id}_{filename}')
    file.save(file_path)

    try:
        parsed_employees = parse_employee_roster_file(file_path)
    except Exception as e:
        return jsonify({'error': f'Failed to parse employee roster spreadsheet: {str(e)}'}), 400

    if not parsed_employees:
        return jsonify({'error': 'No valid employee rows found in spreadsheet.'}), 400

    added_count = 0
    updated_count = 0

    for emp_data in parsed_employees:
        phone = emp_data['phone_number']
        existing = Employee.query.filter_by(company_id=company_id, phone_number=phone).first()

        # Ensure account exists in mock Upay Core MFS database as active
        if not Account.query.filter_by(phone_number=phone).first():
            db.session.add(Account(
                phone_number=phone,
                account_holder_name=emp_data['employee_name'],
                account_status='ACTIVE',
                wallet_type='PERSONAL'
            ))

        if existing:
            existing.employee_code = emp_data['employee_code']
            existing.employee_name = emp_data['employee_name']
            existing.department = emp_data['department']
            existing.designation = emp_data['designation']
            existing.status = 'ACTIVE'
            updated_count += 1
        else:
            db.session.add(Employee(
                company_id=company_id,
                employee_code=emp_data['employee_code'],
                phone_number=phone,
                employee_name=emp_data['employee_name'],
                department=emp_data['department'],
                designation=emp_data['designation'],
                status='ACTIVE',
                completed_cycles=0
            ))
            added_count += 1

    db.session.add(AuditLog(
        company_id=company.id,
        user_id=g.current_user.id,
        audit_scope='UPAY_ADMIN',
        action='UPAY_ADMIN_EMPLOYEE_ROSTER_UPLOADED',
        details={
            'company_id': company.id,
            'file_name': filename,
            'total_rows': len(parsed_employees),
            'added': added_count,
            'updated': updated_count
        }
    ))
    db.session.commit()

    employees = Employee.query.filter_by(company_id=company_id).all()
    return jsonify({
        'message': f'Roster uploaded successfully! {added_count} added, {updated_count} updated.',
        'total_employees': len(employees),
        'employees': [emp.to_dict() for emp in employees]
    }), 200


@admin_bp.route('/companies/<int:company_id>/employees', methods=['POST'])
@require_admin
def add_single_employee(company_id):
    company = Company.query.get(company_id)
    if not company:
        return jsonify({'error': 'Corporate client not found'}), 404

    data = request.get_json() or {}
    phone = str(data.get('phone_number', '')).strip()
    name = str(data.get('employee_name', '')).strip()
    code = str(data.get('employee_code', '')).strip()
    dept = str(data.get('department', 'General')).strip()
    designation = str(data.get('designation', 'Staff')).strip()

    if not phone or not name:
        return jsonify({'error': 'Employee phone number and name are required'}), 400

    # Clean phone
    phone = phone.replace(' ', '').replace('-', '')
    if phone.startswith('+880'):
        phone = phone[3:]
    elif phone.startswith('880'):
        phone = phone[2:]

    existing = Employee.query.filter_by(company_id=company_id, phone_number=phone).first()
    if existing:
        return jsonify({'error': f'Employee with phone number {phone} is already on this company roster'}), 409

    # Add to mock core MFS registry if not present
    if not Account.query.filter_by(phone_number=phone).first():
        db.session.add(Account(
            phone_number=phone,
            account_holder_name=name,
            account_status='ACTIVE',
            wallet_type='PERSONAL'
        ))

    emp = Employee(
        company_id=company_id,
        employee_code=code or f'EMP-{int(Employee.query.filter_by(company_id=company_id).count()) + 1001}',
        phone_number=phone,
        employee_name=name,
        department=dept,
        designation=designation,
        status='ACTIVE',
        completed_cycles=0
    )
    db.session.add(emp)

    db.session.add(AuditLog(
        company_id=company.id,
        user_id=g.current_user.id,
        audit_scope='UPAY_ADMIN',
        action='UPAY_ADMIN_EMPLOYEE_ADDED',
        details={'company_id': company.id, 'employee_name': name, 'phone_number': phone}
    ))
    db.session.commit()

    return jsonify({'message': 'Employee added to approved corporate roster', 'employee': emp.to_dict()}), 201


@admin_bp.route('/companies/<int:company_id>/employees/<int:employee_id>', methods=['DELETE'])
@require_admin
def delete_employee(company_id, employee_id):
    emp = Employee.query.filter_by(id=employee_id, company_id=company_id).first()
    if not emp:
        return jsonify({'error': 'Employee record not found'}), 404

    name = emp.employee_name
    db.session.delete(emp)
    db.session.add(AuditLog(
        company_id=company_id,
        user_id=g.current_user.id,
        audit_scope='UPAY_ADMIN',
        action='UPAY_ADMIN_EMPLOYEE_REMOVED',
        details={'company_id': company_id, 'employee_id': employee_id, 'employee_name': name}
    ))
    db.session.commit()
    return jsonify({'message': f'Employee {name} removed from roster.'}), 200


# =============================================================================
# 5. CORPORATE BANK ACCOUNTS MANAGEMENT (ADD & REMOVE)
# =============================================================================
@admin_bp.route('/companies/<int:company_id>/bank-accounts', methods=['GET'])
@require_admin
def get_company_bank_accounts(company_id):
    company = Company.query.get(company_id)
    if not company:
        return jsonify({'error': 'Corporate client not found'}), 404

    accounts = CompanyBankAccount.query.filter_by(company_id=company_id).order_by(CompanyBankAccount.created_at.desc()).all()
    return jsonify({'bank_accounts': [acc.to_dict() for acc in accounts]}), 200


@admin_bp.route('/companies/<int:company_id>/bank-accounts', methods=['POST'])
@require_admin
def add_company_bank_account(company_id):
    """Add a linked corporate bank account (from which funds originate)."""
    company = Company.query.get(company_id)
    if not company:
        return jsonify({'error': 'Corporate client not found'}), 404

    data = request.get_json() or {}
    bank_name = str(data.get('bank_name', '')).strip()
    branch_name = str(data.get('branch_name', '')).strip()
    account_name = str(data.get('account_name', company.company_name)).strip()
    account_number = str(data.get('account_number', '')).strip()
    routing_number = str(data.get('routing_number', '')).strip()
    account_type = str(data.get('account_type', 'CURRENT')).strip().upper()
    is_primary = bool(data.get('is_primary', False))

    if not bank_name or not account_number or not routing_number:
        return jsonify({'error': 'Bank name, account number, and routing number are required'}), 400

    # If set as primary, unset other primaries for this company
    if is_primary:
        CompanyBankAccount.query.filter_by(company_id=company_id, is_primary=True).update({'is_primary': False})

    # If first account, set primary automatically
    if CompanyBankAccount.query.filter_by(company_id=company_id).count() == 0:
        is_primary = True

    bank_acc = CompanyBankAccount(
        company_id=company_id,
        bank_name=bank_name,
        branch_name=branch_name or 'Main Branch',
        account_name=account_name,
        account_number=account_number,
        routing_number=routing_number,
        account_type=account_type if account_type in ['CURRENT', 'SETTLEMENT', 'ESCROW'] else 'CURRENT',
        status='ACTIVE',
        is_primary=is_primary
    )
    db.session.add(bank_acc)

    db.session.add(AuditLog(
        company_id=company.id,
        user_id=g.current_user.id,
        audit_scope='UPAY_ADMIN',
        action='UPAY_ADMIN_BANK_ACCOUNT_ADDED',
        details={
            'company_id': company.id,
            'bank_name': bank_name,
            'account_number': account_number,
            'routing_number': routing_number
        }
    ))
    db.session.commit()

    return jsonify({
        'message': 'Corporate bank account linked successfully',
        'bank_account': bank_acc.to_dict()
    }), 201


@admin_bp.route('/companies/<int:company_id>/bank-accounts/<int:account_id>', methods=['DELETE'])
@require_admin
def delete_company_bank_account(company_id, account_id):
    """Remove a linked corporate bank account."""
    acc = CompanyBankAccount.query.filter_by(id=account_id, company_id=company_id).first()
    if not acc:
        return jsonify({'error': 'Bank account not found'}), 404

    bank_name = acc.bank_name
    acc_num = acc.account_number
    db.session.delete(acc)

    db.session.add(AuditLog(
        company_id=company_id,
        user_id=g.current_user.id,
        audit_scope='UPAY_ADMIN',
        action='UPAY_ADMIN_BANK_ACCOUNT_REMOVED',
        details={'company_id': company_id, 'bank_name': bank_name, 'account_number': acc_num}
    ))
    db.session.commit()

    return jsonify({'message': f'Bank account {bank_name} ({acc_num}) removed successfully.'}), 200


# =============================================================================
# 6. IDENTITY & USER ACCESS MANAGEMENT
# =============================================================================
@admin_bp.route('/users', methods=['GET'])
@require_admin
def get_users():
    company_id = request.args.get('company_id', type=int)
    query = User.query
    if company_id:
        query = query.filter_by(company_id=company_id)
    users = query.order_by(User.created_at.desc()).all()
    return jsonify({'users': [user.to_dict() for user in users]}), 200


@admin_bp.route('/users', methods=['POST'])
@require_admin
def create_user():
    data = request.get_json() or {}
    full_name = str(data.get('full_name', '')).strip()
    email = str(data.get('email', '')).strip().lower()
    phone_number = str(data.get('phone_number', '')).strip()
    password = str(data.get('password', ''))
    role = str(data.get('role', '')).upper()
    company_id = data.get('company_id')

    if not all([full_name, email, phone_number, password]) or role not in {'MAKER', 'CHECKER', 'ADMIN'}:
        return jsonify({'error': 'Name, email, phone, password, and a valid role are required'}), 400
    if User.query.filter_by(email=email).first():
        return jsonify({'error': 'Email address is already registered'}), 409
    if role != 'ADMIN' and not Company.query.get(company_id):
        return jsonify({'error': 'A valid corporate client is required for maker and checker users'}), 400

    user = User(
        company_id=None if role == 'ADMIN' else company_id,
        full_name=full_name,
        email=email,
        phone_number=phone_number,
        password_hash=generate_password_hash(password),
        role=role,
        status='ACTIVE',
    )
    db.session.add(user)
    db.session.flush()
    db.session.add(AuditLog(
        company_id=user.company_id,
        user_id=g.current_user.id,
        audit_scope='UPAY_ADMIN',
        action='UPAY_ADMIN_USER_CREATED',
        details={'user_id': user.id, 'email': email, 'role': role, 'company_id': user.company_id},
    ))
    db.session.commit()
    return jsonify({'user': user.to_dict()}), 201


# =============================================================================
# 7. DEDICATED UPAY ADMIN AUDIT TRAIL
# =============================================================================
@admin_bp.route('/audit-logs', methods=['GET'])
@require_admin
def get_admin_audit_logs():
    """Returns only Upay Admin operational events (isolated from corporate client batch logs)."""
    company_id = request.args.get('company_id', type=int)
    query = AuditLog.query.filter(
        (AuditLog.audit_scope == 'UPAY_ADMIN') | (AuditLog.action.like('UPAY_ADMIN%'))
    )
    if company_id:
        query = query.filter_by(company_id=company_id)

    logs = query.order_by(AuditLog.created_at.desc()).limit(150).all()
    return jsonify({'audit_logs': [log.to_dict() for log in logs]}), 200


@admin_bp.route('/activity', methods=['GET'])
@require_admin
def get_activity():
    """Admin operations dashboard feed (admin audit events and open risk alerts across network)."""
    logs = AuditLog.query.filter(
        (AuditLog.audit_scope == 'UPAY_ADMIN') | (AuditLog.action.like('UPAY_ADMIN%'))
    ).order_by(AuditLog.created_at.desc()).limit(100).all()

    alerts = RiskAlert.query.filter_by(review_status='PENDING_REVIEW').order_by(RiskAlert.created_at.desc()).all()
    risk_alerts = []
    for alert in alerts:
        item = BatchItem.query.get(alert.batch_item_id)
        batch = Batch.query.get(item.batch_id) if item else None
        company = Company.query.get(batch.company_id) if batch else None
        risk_alerts.append({
            **alert.to_dict(),
            'company_name': company.company_name if company else 'Unknown corporate',
            'batch_id': batch.id if batch else None,
        })
    return jsonify({
        'audit_logs': [log.to_dict() for log in logs],
        'risk_alerts': risk_alerts,
    }), 200
