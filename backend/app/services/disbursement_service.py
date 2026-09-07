from datetime import datetime
from flask import current_app
from decimal import Decimal
from app.extensions import db
from app.models import Batch, BatchItem, CentralWallet, Company, AuditLog, PayrollHistory, RiskAlert

def record_checker_review(batch_id, checker_id, review_status='APPROVED_BY_CHECKER', review_notes=None):
    """
    Records Checker (Finance Director) review and sign-off on a disbursement batch.
    Enforces Segregation of Duties: Maker cannot review their own batch.
    """
    batch = Batch.query.get(batch_id)
    if not batch:
        return False, "Batch not found"

    if batch.maker_id == checker_id:
        return False, "Maker-Checker Segregation Violation: The Maker who uploaded this batch cannot perform the Checker review."

    if batch.status != 'PENDING_CHECKER_REVIEW':
        return False, f"Batch can only be reviewed from 'PENDING_CHECKER_REVIEW', not '{batch.status}'."

    if review_status in ['APPROVED_BY_CHECKER', 'APPROVED']:
        batch.status = 'CHECKER_REVIEWED'
    elif review_status in ['REJECTED', 'REJECTED_BY_CHECKER']:
        batch.status = 'REJECTED'
    else:
        batch.status = 'CHECKER_REVIEWED'

    batch.checker_id = checker_id
    batch.checker_notes = review_notes or 'Batch reviewed and signed off by Finance Director (Checker).'
    batch.checker_reviewed_at = datetime.utcnow()

    # Record Audit Log
    audit = AuditLog(
        company_id=batch.company_id,
        batch_id=batch.id,
        user_id=checker_id,
        audit_scope='CORPORATE_CLIENT',
        action='BATCH_CHECKER_REVIEW_SIGNOFF',
        details={
            'batch_id': batch.id,
            'review_status': batch.status,
            'notes': batch.checker_notes,
            'total_amount': float(batch.total_amount)
        }
    )
    db.session.add(audit)
    db.session.commit()

    return True, f"Batch review sign-off recorded. Status: {batch.status}"


def execute_batch_disbursement(batch_id, executing_user_id):
    """
    Performs atomic, transactional wallet debit with SELECT FOR UPDATE row locking,
    executes payout disbursement, logs audit trail, and synchronizes central wallet balance.
    """
    batch = Batch.query.filter_by(id=batch_id).with_for_update().first()
    if not batch:
        return False, "Batch not found"

    if batch.status == 'EXECUTED':
        return False, "This payout batch has already been executed."

    if batch.status not in ['CHECKER_REVIEWED', 'PENDING_CHECKER_APPROVAL', 'APPROVED']:
        return False, f"Batch cannot be executed from current status '{batch.status}'. Checker review sign-off is required."

    company = Company.query.get(batch.company_id)
    if not company or company.status != 'ACTIVE':
        return False, 'This corporate client is inactive or suspended. Payroll execution is blocked.'

    items = BatchItem.query.filter_by(batch_id=batch.id).all()
    blocked_items = [item.id for item in items if item.account_validation_status != 'VALID' or item.item_status == 'REJECTED']
    if blocked_items:
        return False, 'Batch contains invalid or rejected payout items. Correct or remove them before execution.'

    open_alerts = RiskAlert.query.join(BatchItem).filter(
        BatchItem.batch_id == batch.id,
        RiskAlert.review_status == 'PENDING_REVIEW'
    ).count()
    if open_alerts:
        return False, 'All risk alerts must be reviewed by the Checker before execution.'

    batch_amount = Decimal(str(batch.total_amount))
    if batch_amount <= 0:
        return False, "Batch disbursement total amount must be greater than zero."

    try:
        # Acquire row-level lock on the company's main central wallet to prevent race conditions
        wallet = CentralWallet.query.filter_by(
            company_id=batch.company_id,
            wallet_type='MAIN'
        ).with_for_update().first()

        if not wallet:
            return False, "Main disbursement wallet for this corporate client not found."

        wallet_balance = Decimal(str(wallet.balance))
        if wallet_balance < batch_amount:
            return False, f"Insufficient central wallet balance. Required: {float(batch_amount):,.2f} BDT, Available: {float(wallet_balance):,.2f} BDT. Please contact Upay Admin to top up disbursement funds."

        # Atomic debit
        wallet.balance = wallet_balance - batch_amount

        # Synchronize Company model balance
        company.sync_balance()

        batch.status = 'EXECUTED'
        batch.executed_at = datetime.utcnow()

        # Update items status to APPROVED
        now = datetime.utcnow()
        forecast_history_date = datetime.combine(batch.payroll_period, datetime.min.time()) if batch.payroll_period else now
        for item in items:
            item.item_status = 'APPROVED'
            # Record Payroll History for AI baseline learning
            phone = item.corrected_phone_number or item.raw_phone_number
            db.session.add(PayrollHistory(
                company_id=batch.company_id,
                phone_number=phone,
                employee_name=item.employee_name,
                department=item.department,
                disbursement_date=forecast_history_date,
                basic_salary=item.basic_salary,
                gross_salary=item.gross_salary
            ))

        # Record Audit Log
        audit = AuditLog(
            company_id=batch.company_id,
            batch_id=batch.id,
            user_id=executing_user_id,
            audit_scope='CORPORATE_CLIENT',
            action='BATCH_DISBURSEMENT_EXECUTED',
            details={
                'batch_id': batch.id,
                'total_amount': float(batch_amount),
                'total_records': batch.total_records,
                'wallet_id': wallet.id,
                'remaining_balance': float(wallet.balance)
            }
        )
        db.session.add(audit)
        db.session.commit()

        # Forecasting runs only after the executed payroll history is committed.
        # It is advisory, so a modelling failure must never reverse a payment.
        try:
            from app.services.forecasting_service import refresh_liquidity_forecast
            refresh_liquidity_forecast(batch.company_id)
        except Exception:
            current_app.logger.exception('Liquidity forecast refresh failed after batch %s execution.', batch.id)

        return True, f"Disbursement executed successfully! BDT {float(batch_amount):,.2f} debited from central wallet."

    except Exception as e:
        db.session.rollback()
        return False, f"Failed to execute disbursement: {str(e)}"
