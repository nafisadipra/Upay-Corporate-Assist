import os
from uuid import uuid4
from datetime import datetime
from flask import Blueprint, current_app, g, jsonify, request
from werkzeug.utils import secure_filename
from app.extensions import db
from app.models import Account, AuditLog, Company, Employee, EmployeeRegistration
from app.services.excel_parser import parse_employee_registration_file
from app.utils.auth import require_auth

registrations_bp = Blueprint('registrations', __name__, url_prefix='/api/employee-registrations')

@registrations_bp.route('/upload', methods=['POST'])
@require_auth(roles=['MAKER'])
def upload_registrations():
    company = db.session.get(Company, g.current_user.company_id)
    if not company or company.status != 'ACTIVE':
        return jsonify({'error': 'Your corporate client is inactive or suspended. Employee registrations are blocked.'}), 403
    if 'file' not in request.files or not request.files['file'].filename:
        return jsonify({'error': 'Attach the employee registration template.'}), 400
    file = request.files['file']
    filename = secure_filename(file.filename)
    if not filename or '.' not in filename or filename.rsplit('.', 1)[1].lower() not in current_app.config['ALLOWED_EXTENSIONS']:
        return jsonify({'error': 'Attach a valid .xlsx, .xls, or .csv registration template.'}), 400
    os.makedirs(current_app.config['UPLOAD_FOLDER'], exist_ok=True)
    path = os.path.join(current_app.config['UPLOAD_FOLDER'], f'registration_{g.current_user.id}_{uuid4().hex}_{filename}')
    file.save(path)
    try:
        rows = parse_employee_registration_file(path)
    except Exception as error:
        return jsonify({'error': str(error)}), 400
    finally:
        if os.path.exists(path):
            os.remove(path)
    if not rows: return jsonify({'error': 'No valid registration rows found.'}), 400
    for row in rows:
        existing = EmployeeRegistration.query.filter_by(company_id=g.current_user.company_id, email=row['email'], status='PENDING_ADMIN_APPROVAL').first()
        if existing:
            for key, value in row.items(): setattr(existing, key, value)
        else: db.session.add(EmployeeRegistration(company_id=g.current_user.company_id, submitted_by=g.current_user.id, **row))
    db.session.add(AuditLog(company_id=g.current_user.company_id, user_id=g.current_user.id, audit_scope='CORPORATE_CLIENT', action='EMPLOYEE_REGISTRATION_SUBMITTED', details={'file_name': filename, 'rows': len(rows)}))
    db.session.commit()
    return jsonify({'message': f'{len(rows)} employee registrations sent to Upay Admin for approval.', 'rows': len(rows)}), 201

@registrations_bp.route('', methods=['GET'])
@require_auth(roles=['ADMIN'])
def list_registrations():
    company_id = request.args.get('company_id', type=int)
    status = request.args.get('status', 'PENDING_ADMIN_APPROVAL').strip().upper()
    query = EmployeeRegistration.query.filter_by(status=status)
    if company_id:
        query = query.filter_by(company_id=company_id)
    rows = query.order_by(EmployeeRegistration.created_at.desc()).all()
    return jsonify({'registrations': [row.to_dict() for row in rows]}), 200

@registrations_bp.route('/<int:registration_id>/approve', methods=['POST'])
@require_auth(roles=['ADMIN'])
def approve_registration(registration_id):
    row = EmployeeRegistration.query.get(registration_id)
    if not row or row.status != 'PENDING_ADMIN_APPROVAL': return jsonify({'error': 'Pending registration not found.'}), 404
    company = db.session.get(Company, row.company_id)
    if not company or company.status != 'ACTIVE':
        return jsonify({'error': 'This corporate client is inactive or suspended. Registration approval is blocked.'}), 403
    employee = Employee.query.filter_by(company_id=row.company_id, phone_number=row.wallet_details).first()
    if employee is None:
        employee = Employee(company_id=row.company_id, employee_code=row.employee_code, phone_number=row.wallet_details, employee_name=row.full_name, department=row.department, designation=row.designation, status='ACTIVE')
        db.session.add(employee)
    else:
        employee.employee_code, employee.employee_name, employee.department, employee.designation, employee.status = row.employee_code, row.full_name, row.department, row.designation, 'ACTIVE'
    if not Account.query.filter_by(phone_number=row.wallet_details).first():
        db.session.add(Account(phone_number=row.wallet_details, account_holder_name=row.full_name, account_status='ACTIVE', wallet_type='PERSONAL'))
    row.status, row.reviewed_by, row.reviewed_at = 'APPROVED', g.current_user.id, datetime.utcnow()
    db.session.add(AuditLog(company_id=row.company_id, user_id=g.current_user.id, audit_scope='UPAY_ADMIN', action='EMPLOYEE_REGISTRATION_APPROVED', details={'registration_id': row.id, 'email': row.email, 'wallet_details': row.wallet_details}))
    db.session.commit()
    return jsonify({'message': 'Employee registered in the Upay roster and account database.', 'employee': employee.to_dict()})

@registrations_bp.route('/bulk-approve', methods=['POST'])
@require_auth(roles=['ADMIN'])
def bulk_approve_registrations():
    registration_ids = request.get_json(silent=True) or {}
    registration_ids = registration_ids.get('registration_ids')
    if not isinstance(registration_ids, list) or not registration_ids or not all(isinstance(item, int) for item in registration_ids):
        return jsonify({'error': 'Provide one or more registration IDs to approve.'}), 400
    if len(registration_ids) != len(set(registration_ids)):
        return jsonify({'error': 'Registration IDs must be unique.'}), 400

    rows = EmployeeRegistration.query.filter(EmployeeRegistration.id.in_(registration_ids)).all()
    if len(rows) != len(registration_ids) or any(row.status != 'PENDING_ADMIN_APPROVAL' for row in rows):
        return jsonify({'error': 'One or more selected registrations are no longer pending.'}), 400
    companies = {row.company_id: db.session.get(Company, row.company_id) for row in rows}
    if any(not company or company.status != 'ACTIVE' for company in companies.values()):
        return jsonify({'error': 'A selected corporate client is inactive or suspended. Registration approval is blocked.'}), 403

    for row in rows:
        employee = Employee.query.filter_by(company_id=row.company_id, phone_number=row.wallet_details).first()
        if employee is None:
            employee = Employee(company_id=row.company_id, employee_code=row.employee_code, phone_number=row.wallet_details, employee_name=row.full_name, department=row.department, designation=row.designation, status='ACTIVE')
            db.session.add(employee)
        else:
            employee.employee_code, employee.employee_name, employee.department, employee.designation, employee.status = row.employee_code, row.full_name, row.department, row.designation, 'ACTIVE'
        if not Account.query.filter_by(phone_number=row.wallet_details).first():
            db.session.add(Account(phone_number=row.wallet_details, account_holder_name=row.full_name, account_status='ACTIVE', wallet_type='PERSONAL'))
        row.status, row.reviewed_by, row.reviewed_at = 'APPROVED', g.current_user.id, datetime.utcnow()
        db.session.add(AuditLog(company_id=row.company_id, user_id=g.current_user.id, audit_scope='UPAY_ADMIN', action='EMPLOYEE_REGISTRATION_APPROVED', details={'registration_id': row.id, 'email': row.email, 'wallet_details': row.wallet_details}))
    db.session.commit()
    return jsonify({'message': f'{len(rows)} employee registrations approved.', 'approved_count': len(rows)}), 200
