import os
from io import BytesIO
from datetime import datetime, date
from decimal import Decimal
from flask import Blueprint, request, jsonify, current_app, g, send_file
from openpyxl import Workbook
from werkzeug.utils import secure_filename
from app.extensions import db
from app.models import Batch, BatchItem, Company, AuditLog, RiskAlert
from app.services.excel_parser import parse_payroll_file
from app.services.validation_service import validate_payee_row
from app.services.anomaly_service import evaluate_batch_items_anomalies
from app.services.disbursement_service import record_checker_review, execute_batch_disbursement
from app.utils.auth import require_auth

batches_bp = Blueprint('batches', __name__, url_prefix='/api/batches')

def allowed_file(filename):
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in current_app.config['ALLOWED_EXTENSIONS']


def ensure_active_company(company_id):
    """Return the active company, or a JSON error response for a blocked tenant."""
    company = db.session.get(Company, company_id)
    if not company:
        return None, (jsonify({'error': 'Company not found.'}), 404)
    if company.status != 'ACTIVE':
        return None, (jsonify({'error': 'This corporate client is inactive or suspended. Payroll actions are blocked.'}), 403)
    return company, None


def maker_owns_batch(batch):
    """Administrators may assist; corporate Makers can only act on their own batches."""
    return g.current_user.role == 'ADMIN' or batch.maker_id == g.current_user.id


def parse_payroll_period(value):
    """Validate a calendar-month value submitted by the corporate payroll user."""
    if not value:
        # Retain compatibility for existing API and test clients; the frontend always
        # submits an explicit month through its calendar control.
        return date.today().replace(day=1), None
    try:
        period = datetime.strptime(str(value), '%Y-%m').date().replace(day=1)
    except ValueError:
        return None, 'Payroll month must use the YYYY-MM format.'
    if period > date.today().replace(day=1):
        return None, 'A payroll month cannot be later than the current month.'
    return period, None


# =============================================================================
# 1. BATCH UPLOAD (MAKER ROLE)
# =============================================================================
@batches_bp.route('/upload', methods=['POST'])
@require_auth(roles=['MAKER', 'ADMIN'])
def upload_batch():
    """
    HR Bulk Excel/CSV Upload Endpoint:
    1. Uploads spreadsheet (.xlsx, .xls, .csv).
    2. Screens numbers against core upay MFS DB (accounts).
    3. Reconciles against corporate client HR roster (employees).
    4. Evaluates AI Risk Shield & cold-start baseline (anomaly_service).
    5. Saves batch & items with Decimal precision.
    """
    user = g.current_user
    maker_id = user.id
    file_name = "bulk_payroll.xlsx"
    parsed_rows = []
    requested_company_id = request.form.get('company_id', type=int)
    requested_payroll_period = request.form.get('payroll_period')

    if 'file' in request.files and request.files['file'].filename != '':
        file = request.files['file']
        if file and allowed_file(file.filename):
            filename = secure_filename(file.filename)
            os.makedirs(current_app.config['UPLOAD_FOLDER'], exist_ok=True)
            file_path = os.path.join(current_app.config['UPLOAD_FOLDER'], filename)
            file.save(file_path)
            file_name = filename
            try:
                parsed_rows = parse_payroll_file(file_path)
            except Exception as e:
                return jsonify({'error': f"Failed to parse spreadsheet: {str(e)}"}), 400
        else:
            return jsonify({'error': 'Invalid file format. Allowed formats: .xlsx, .xls, .csv'}), 400
    else:
        # Fallback to JSON payload if test / direct API
        data = request.get_json(silent=True) or {}
        requested_company_id = data.get('company_id')
        requested_payroll_period = data.get('payroll_period')
        file_name = data.get('file_name', 'manual_batch_upload.xlsx')
        parsed_rows = data.get('items', [])

    if user.role == 'ADMIN':
        if requested_company_id is None:
            return jsonify({'error': 'company_id is required when an administrator uploads a batch.'}), 400
        try:
            company_id = int(requested_company_id)
        except (TypeError, ValueError):
            return jsonify({'error': 'company_id must be a valid integer.'}), 400
    else:
        if user.company_id is None:
            return jsonify({'error': 'Corporate users must be assigned to a company before uploading batches.'}), 403
        if requested_company_id is not None:
            try:
                requested_company_id = int(requested_company_id)
            except (TypeError, ValueError):
                return jsonify({'error': 'company_id must be a valid integer.'}), 400
            if requested_company_id != user.company_id:
                return jsonify({'error': 'Tenant boundary violation: Cannot upload a batch for another corporate client.'}), 403
        company_id = user.company_id

    _, company_error = ensure_active_company(company_id)
    if company_error:
        return company_error

    payroll_period, payroll_period_error = parse_payroll_period(requested_payroll_period)
    if payroll_period_error:
        return jsonify({'error': payroll_period_error}), 400

    if not parsed_rows:
        return jsonify({'error': 'No payout items found in upload payload'}), 400

    total_amount = sum(Decimal(str(r.get('gross_salary', 0))) for r in parsed_rows)

    # Create Batch Header
    batch = Batch(
        company_id=company_id,
        maker_id=maker_id,
        file_name=file_name,
        total_records=len(parsed_rows),
        total_amount=total_amount,
        payroll_period=payroll_period,
        status='DRAFT'
    )
    db.session.add(batch)
    db.session.flush()

    valid_count = 0
    invalid_count = 0
    batch_items = []

    # Perform Multi-Stage Validation (Core MFS DB + Corporate HR Roster Reconciliation)
    for row in parsed_rows:
        raw_phone = str(row.get('raw_phone_number', '')).strip()
        name = str(row.get('employee_name', 'Employee')).strip()
        dept = str(row.get('department', 'General')).strip()
        try:
            basic_salary = Decimal(str(row['basic_salary']))
            gross_salary = Decimal(str(row['gross_salary']))
        except (KeyError, TypeError, ValueError, ArithmeticError):
            return jsonify({
                'error': 'Each payroll row must include valid basic_salary and gross_salary values.'
            }), 400

        if basic_salary < 0 or gross_salary < 0 or gross_salary < basic_salary:
            return jsonify({
                'error': 'Gross salary must be greater than or equal to basic salary.'
            }), 400

        val_status, employee_obj, account_obj = validate_payee_row(company_id, raw_phone)

        if val_status in ['VALID', 'UNRECOGNIZED_PAYEE']:
            valid_count += 1
        else:
            invalid_count += 1

        item = BatchItem(
            batch_id=batch.id,
            employee_id=employee_obj.id if employee_obj else None,
            raw_phone_number=raw_phone,
            employee_name=name,
            department=dept,
            basic_salary=basic_salary,
            gross_salary=gross_salary,
            account_validation_status=val_status,
            item_status='PENDING'
        )
        db.session.add(item)
        batch_items.append(item)

    db.session.flush()

    # Trigger Asynchronous AI Risk Shield & Pattern Auditor
    evaluate_batch_items_anomalies(company_id, batch_items)

    # Count anomalies
    flagged_anomalies = sum(1 for item in batch_items if item.is_anomaly or item.account_validation_status != 'VALID')

    # Update Batch summary metrics
    batch.valid_records = valid_count
    batch.invalid_records = invalid_count
    batch.flagged_anomalies = flagged_anomalies
    batch.status = 'FLAGGED_RISK' if flagged_anomalies > 0 else 'VALIDATED'

    # Audit Log
    audit = AuditLog(
        company_id=company_id,
        batch_id=batch.id,
        user_id=maker_id,
        audit_scope='CORPORATE_CLIENT',
        action='BATCH_UPLOADED_AND_SCREENED',
        details={
            'file_name': file_name,
            'total_records': batch.total_records,
            'payroll_period': payroll_period.isoformat(),
            'valid_records': valid_count,
            'invalid_records': invalid_count,
            'flagged_anomalies': flagged_anomalies,
            'total_amount': float(batch.total_amount)
        }
    )
    db.session.add(audit)
    db.session.commit()

    return jsonify({
        'message': 'Batch uploaded and screened successfully',
        'batch': batch.to_dict(),
        'items': [item.to_dict() for item in batch_items]
    }), 201


# =============================================================================
# 2. BATCH RETRIEVAL
# =============================================================================
@batches_bp.route('', methods=['GET'])
@require_auth()
def get_batches():
    user = g.current_user
    query = Batch.query

    if user.role != 'ADMIN':
        query = query.filter_by(company_id=user.company_id)
    else:
        req_comp_id = request.args.get('company_id', type=int)
        if req_comp_id:
            query = query.filter_by(company_id=req_comp_id)

    batches = query.order_by(Batch.created_at.desc()).all()
    return jsonify({'batches': [b.to_dict() for b in batches]}), 200


@batches_bp.route('/<int:batch_id>', methods=['GET'])
@require_auth()
def get_batch(batch_id):
    user = g.current_user
    batch = Batch.query.get(batch_id)
    if not batch:
        return jsonify({'error': 'Batch not found'}), 404

    if user.role != 'ADMIN' and batch.company_id != user.company_id:
        return jsonify({'error': 'Tenant isolation: Access to other corporate client batch is forbidden'}), 403

    return jsonify({'batch': batch.to_dict()}), 200


@batches_bp.route('/<int:batch_id>/items', methods=['GET'])
@require_auth()
def get_batch_items(batch_id):
    user = g.current_user
    batch = Batch.query.get(batch_id)
    if not batch:
        return jsonify({'error': 'Batch not found'}), 404

    if user.role != 'ADMIN' and batch.company_id != user.company_id:
        return jsonify({'error': 'Tenant isolation: Access to other corporate client batch items is forbidden'}), 403

    items = BatchItem.query.filter_by(batch_id=batch_id).all()
    return jsonify({'items': [i.to_dict() for i in items]}), 200


@batches_bp.route('/<int:batch_id>/workbook', methods=['GET'])
@require_auth(roles=['MAKER', 'CHECKER', 'ADMIN'])
def download_batch_workbook(batch_id):
    """Export the selected payroll batch using its current database rows."""
    batch = Batch.query.get(batch_id)
    if not batch:
        return jsonify({'error': 'Batch not found'}), 404
    if g.current_user.role != 'ADMIN' and batch.company_id != g.current_user.company_id:
        return jsonify({'error': 'Tenant isolation violation'}), 403

    workbook = Workbook()
    sheet = workbook.active
    sheet.title = 'Payroll Batch'
    sheet.append(['Employee', 'Mobile Number', 'Department', 'Basic Salary (BDT)', 'Gross Salary (BDT)', 'Account Status', 'Payout Status'])
    for item in BatchItem.query.filter_by(batch_id=batch.id).order_by(BatchItem.id.asc()).all():
        sheet.append([item.employee_name, item.corrected_phone_number or item.raw_phone_number, item.department or '', float(item.basic_salary), float(item.gross_salary), item.account_validation_status, item.item_status])
    sheet.freeze_panes = 'A2'
    for column, width in {'A': 24, 'B': 18, 'C': 20, 'D': 20, 'E': 20, 'F': 22, 'G': 18}.items():
        sheet.column_dimensions[column].width = width

    output = BytesIO()
    workbook.save(output)
    output.seek(0)
    download_name = secure_filename(batch.file_name) or f'payroll-batch-{batch.id}.xlsx'
    if not download_name.lower().endswith('.xlsx'):
        download_name = f'{os.path.splitext(download_name)[0]}.xlsx'
    return send_file(output, as_attachment=True, download_name=download_name, mimetype='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')


@batches_bp.route('/<int:batch_id>/archive', methods=['GET'])
@require_auth(roles=['MAKER', 'ADMIN'])
def download_executed_batch_archive(batch_id):
    """Build an Excel archive from the database rows that were actually disbursed."""
    batch = Batch.query.get(batch_id)
    if not batch:
        return jsonify({'error': 'Batch not found'}), 404
    if g.current_user.role != 'ADMIN' and batch.company_id != g.current_user.company_id:
        return jsonify({'error': 'Tenant isolation violation'}), 403
    if batch.status != 'EXECUTED':
        return jsonify({'error': 'A payroll archive is available only after final disbursement.'}), 409

    workbook = Workbook()
    sheet = workbook.active
    sheet.title = 'Executed Payroll'
    sheet.append(['Employee', 'Mobile Number', 'Department', 'Basic Salary (BDT)', 'Gross Salary (BDT)', 'Account Status', 'Payout Status'])
    for item in BatchItem.query.filter_by(batch_id=batch.id).order_by(BatchItem.id.asc()).all():
        sheet.append([item.employee_name, item.corrected_phone_number or item.raw_phone_number, item.department or '', float(item.basic_salary), float(item.gross_salary), item.account_validation_status, item.item_status])
    sheet.freeze_panes = 'A2'
    for column, width in {'A': 24, 'B': 18, 'C': 20, 'D': 20, 'E': 20, 'F': 22, 'G': 18}.items():
        sheet.column_dimensions[column].width = width

    output = BytesIO()
    workbook.save(output)
    output.seek(0)
    period = batch.payroll_period.strftime('%Y-%m') if batch.payroll_period else 'payroll'
    return send_file(output, as_attachment=True, download_name=f'payroll-archive-{period}-batch-{batch.id}.xlsx', mimetype='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')


# =============================================================================
# 3. INLINE TYPO CORRECTION (MAKER ROLE)
# =============================================================================
@batches_bp.route('/items/<int:item_id>/correct', methods=['PUT'])
@require_auth(roles=['MAKER', 'ADMIN'])
def correct_item_phone(item_id):
    data = request.get_json() or {}

    item = BatchItem.query.get(item_id)
    if not item:
        return jsonify({'error': 'Batch item not found'}), 404

    batch = Batch.query.get(item.batch_id)
    if not batch:
        return jsonify({'error': 'Associated batch not found'}), 404

    if g.current_user.role != 'ADMIN' and batch.company_id != g.current_user.company_id:
        return jsonify({'error': 'Tenant isolation: Cannot edit item of another corporate client'}), 403

    if not maker_owns_batch(batch):
        return jsonify({'error': 'Only the Maker who created this batch may edit it.'}), 403

    if batch.status not in ['DRAFT', 'VALIDATED', 'FLAGGED_RISK', 'RETURNED_TO_HR']:
        return jsonify({'error': f'Cannot edit items in terminal status {batch.status}'}), 400

    new_phone = str(data.get('corrected_phone_number', item.corrected_phone_number or item.raw_phone_number)).strip()
    employee_name = str(data.get('employee_name', item.employee_name)).strip()
    department = str(data.get('department', item.department or '')).strip()
    try:
        basic_salary = Decimal(str(data.get('basic_salary', item.basic_salary)))
        gross_salary = Decimal(str(data.get('gross_salary', item.gross_salary)))
    except (TypeError, ValueError, ArithmeticError):
        return jsonify({'error': 'Salary values must be valid numbers.'}), 400
    if not new_phone or not employee_name:
        return jsonify({'error': 'Employee name and phone number are required.'}), 400
    if basic_salary < 0 or gross_salary < basic_salary:
        return jsonify({'error': 'Gross salary must be greater than or equal to basic salary.'}), 400

    item.corrected_phone_number = new_phone
    item.employee_name = employee_name
    item.department = department
    item.basic_salary = basic_salary
    item.gross_salary = gross_salary
    val_status, employee_obj, account_obj = validate_payee_row(batch.company_id, new_phone)
    
    item.account_validation_status = val_status
    if employee_obj:
        item.employee_id = employee_obj.id
    item.item_status = 'CORRECTED'
    batch.status = 'FLAGGED_RISK'

    resolved_manual_alerts = RiskAlert.query.filter(
        RiskAlert.batch_item_id == item.id,
        RiskAlert.flag_type.like('MANUAL_%'),
        RiskAlert.review_status == 'PENDING_REVIEW',
    ).all()
    for alert in resolved_manual_alerts:
        alert.review_status = 'RESOLVED_BY_HR'
        alert.reviewed_by = g.current_user.id

    # Re-run AI Risk Shield for this item
    evaluate_batch_items_anomalies(batch.company_id, [item])

    # Re-calculate batch counters
    items = BatchItem.query.filter_by(batch_id=batch.id).all()
    batch.total_amount = sum((Decimal(str(i.gross_salary)) for i in items), Decimal('0.00'))
    batch.valid_records = sum(1 for i in items if i.account_validation_status in ['VALID', 'UNRECOGNIZED_PAYEE'])
    batch.invalid_records = sum(1 for i in items if i.account_validation_status not in ['VALID', 'UNRECOGNIZED_PAYEE'])
    batch.flagged_anomalies = sum(1 for i in items if i.is_anomaly or i.account_validation_status != 'VALID')

    audit = AuditLog(
        company_id=batch.company_id,
        batch_id=batch.id,
        user_id=g.current_user.id,
        audit_scope='CORPORATE_CLIENT',
        action='PAYROLL_ITEM_CORRECTED',
        details={
            'item_id': item.id,
            'raw_phone': item.raw_phone_number,
            'corrected_phone': new_phone,
            'new_validation_status': val_status,
            'employee_name': employee_name,
            'department': department,
            'basic_salary': float(basic_salary),
            'gross_salary': float(gross_salary),
            'finance_issues_resolved': len(resolved_manual_alerts),
        }
    )
    db.session.add(audit)
    db.session.commit()

    return jsonify({
        'message': 'Payroll item corrected and re-verified successfully',
        'item': item.to_dict(),
        'batch': batch.to_dict()
    }), 200


# =============================================================================
# 4. SUBMIT BATCH FOR CHECKER REVIEW (MAKER ROLE)
# =============================================================================
@batches_bp.route('/<int:batch_id>/submit', methods=['POST'])
@require_auth(roles=['MAKER', 'ADMIN'])
def submit_batch(batch_id):
    batch = Batch.query.get(batch_id)
    if not batch:
        return jsonify({'error': 'Batch not found'}), 404

    if g.current_user.role != 'ADMIN' and batch.company_id != g.current_user.company_id:
        return jsonify({'error': 'Tenant isolation violation'}), 403

    if not maker_owns_batch(batch):
        return jsonify({'error': 'Only the Maker who created this batch may submit it.'}), 403

    _, company_error = ensure_active_company(batch.company_id)
    if company_error:
        return company_error

    if batch.status not in ['DRAFT', 'VALIDATED', 'FLAGGED_RISK', 'RETURNED_TO_HR']:
        return jsonify({'error': f'Batch cannot be submitted from current status {batch.status}'}), 400

    if BatchItem.query.filter_by(batch_id=batch.id, item_status='REJECTED').count():
        return jsonify({'error': 'Correct every item returned by Finance before resubmitting.'}), 400

    batch.status = 'PENDING_CHECKER_REVIEW'
    
    audit = AuditLog(
        company_id=batch.company_id,
        batch_id=batch.id,
        user_id=g.current_user.id,
        audit_scope='CORPORATE_CLIENT',
        action='BATCH_SUBMITTED_FOR_CHECKER_REVIEW',
        details={'total_amount': float(batch.total_amount), 'total_records': batch.total_records}
    )
    db.session.add(audit)
    db.session.commit()

    return jsonify({
        'message': 'Batch submitted for Finance Director (Checker) review and sign-off.',
        'batch': batch.to_dict()
    }), 200


# =============================================================================
# 5. CHECKER REVIEW SIGN-OFF (CHECKER ROLE)
# =============================================================================
@batches_bp.route('/<int:batch_id>/checker-review', methods=['POST'])
@require_auth(roles=['CHECKER', 'ADMIN'])
def checker_review(batch_id):
    batch = Batch.query.get(batch_id)
    if not batch:
        return jsonify({'error': 'Batch not found'}), 404

    if g.current_user.role != 'ADMIN' and batch.company_id != g.current_user.company_id:
        return jsonify({'error': 'Tenant isolation: Cannot review other corporate client batch'}), 403

    _, company_error = ensure_active_company(batch.company_id)
    if company_error:
        return company_error

    data = request.get_json(silent=True) or {}
    action = data.get('action', 'APPROVED_BY_CHECKER').strip()
    notes = data.get('notes', 'Batch reviewed and signed off by Finance Director (Checker)').strip()

    success, msg = record_checker_review(batch_id, g.current_user.id, action, notes)
    if not success:
        return jsonify({'error': msg}), 400

    batch = Batch.query.get(batch_id)
    return jsonify({
        'message': msg,
        'batch': batch.to_dict()
    }), 200


# =============================================================================
# 6. MAKER FINAL LOOK & EXECUTE DISBURSAL (MAKER ROLE)
# =============================================================================
@batches_bp.route('/<int:batch_id>/execute', methods=['POST'])
@require_auth(roles=['MAKER', 'ADMIN'])
def execute_batch(batch_id):
    batch = Batch.query.get(batch_id)
    if not batch:
        return jsonify({'error': 'Batch not found'}), 404

    if g.current_user.role != 'ADMIN' and batch.company_id != g.current_user.company_id:
        return jsonify({'error': 'Tenant isolation violation'}), 403

    if not maker_owns_batch(batch):
        return jsonify({'error': 'Only the Maker who created this batch may execute it.'}), 403

    _, company_error = ensure_active_company(batch.company_id)
    if company_error:
        return company_error

    success, msg = execute_batch_disbursement(batch_id, g.current_user.id)
    if not success:
        return jsonify({'error': msg}), 400

    batch = Batch.query.get(batch_id)
    return jsonify({
        'message': msg,
        'batch': batch.to_dict()
    }), 200


# =============================================================================
# 7. RETIRED LEGACY OTP / DIRECT-AUTHORIZATION ROUTES
# =============================================================================
@batches_bp.route('/<int:batch_id>/request-otp', methods=['POST'])
def request_otp(batch_id):
    return jsonify({
        'error': 'This legacy endpoint has been retired. Use /checker-review followed by /execute.'
    }), 410


@batches_bp.route('/<int:batch_id>/authorize', methods=['POST'])
def authorize_batch(batch_id):
    return jsonify({
        'error': 'This legacy endpoint has been retired. Use /checker-review followed by /execute.'
    }), 410
