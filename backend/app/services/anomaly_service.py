import numpy as np
from sklearn.ensemble import IsolationForest
from app.extensions import db
from app.models import PayrollHistory, RiskAlert

def evaluate_batch_items_anomalies(company_id, batch_items):
    """
    Asynchronous AI Risk Shield & Pattern Auditor:
    1. Evaluates payout amounts against historical benchmarks.
    2. Handles cold-start / new employee first-cycle payouts (< 3 cycles) using department-level averages.
    3. Evaluates established employees (>= 3 cycles) using individual 6-month averages.
    4. Flags unusual variances and automatically records RiskAlert audit entries.
    """
    for item in batch_items:
        # If item failed phone/account validation, skip AI amount anomaly calculation
        if item.account_validation_status in ['INVALID_LENGTH', 'UNREGISTERED_ACCOUNT', 'INACTIVE_ACCOUNT']:
            # Record risk alert for account issue
            flag_type = 'UNREGISTERED_PHONE' if item.account_validation_status == 'UNREGISTERED_ACCOUNT' else 'ACCOUNT_INACTIVE'
            severity = 'CRITICAL' if item.account_validation_status == 'UNREGISTERED_ACCOUNT' else 'HIGH'
            create_risk_alert(
                item.id,
                flag_type=flag_type,
                severity=severity,
                notes=item.anomaly_reason or f"Account validation failed: {item.account_validation_status}"
            )
            continue

        if item.account_validation_status == 'UNRECOGNIZED_PAYEE':
            item.is_anomaly = True
            item.anomaly_score = -0.4500
            item.anomaly_reason = "Roster Mismatch: Active upay phone number is absent from corporate HR approved roster"
            create_risk_alert(
                item.id,
                flag_type='ROSTER_MISMATCH',
                severity='CRITICAL',
                notes=item.anomaly_reason
            )
            continue

        # Look up history for employee
        phone = item.corrected_phone_number or item.raw_phone_number
        employee_history = PayrollHistory.query.filter_by(
            company_id=company_id,
            phone_number=phone
        ).order_by(PayrollHistory.disbursement_date.desc()).all()

        completed_cycles = len(employee_history)

        # Cold-Start Logic (pp2 Section 3.B): < 3 cycles uses Department-level fallback average
        if completed_cycles < 3:
            item.baseline_status = 'BASELINE_PENDING'
            
            # Compute department-level average
            dept_history = PayrollHistory.query.filter_by(
                company_id=company_id,
                department=item.department
            ).all()
            
            if dept_history:
                dept_avg = float(np.mean([float(h.gross_salary) for h in dept_history]))
            else:
                dept_avg = 38000.0  # Default department baseline fallback BDT

            # Check deviation against department average (e.g. > 50% variance)
            payout_amount = float(item.gross_salary)
            variance_ratio = payout_amount / dept_avg if dept_avg > 0 else 1.0

            if variance_ratio > 1.5 or variance_ratio < 0.3:
                item.is_anomaly = True
                item.anomaly_score = -0.3500
                item.anomaly_reason = f"Baseline Pending: New employee ({completed_cycles} cycles). Amount ({payout_amount:,.2f} BDT) deviates significantly from {item.department} Dept avg ({dept_avg:,.2f} BDT)"
                create_risk_alert(
                    item.id,
                    flag_type='UNUSUAL_VARIANCE',
                    severity='MEDIUM',
                    notes=item.anomaly_reason
                )
            else:
                item.is_anomaly = False
                item.anomaly_score = 0.1500
                item.anomaly_reason = None

        else:
            # Established Employee (>= 3 cycles): Individual 6-month historical baseline
            item.baseline_status = 'VERIFIED'
            amounts = [float(h.gross_salary) for h in employee_history[:6]]
            indiv_avg = float(np.mean(amounts))

            payout_amount = float(item.gross_salary)
            variance_ratio = payout_amount / indiv_avg if indiv_avg > 0 else 1.0

            if variance_ratio > 1.8 or variance_ratio < 0.2:
                item.is_anomaly = True
                item.anomaly_score = -0.6842
                item.anomaly_reason = f"Unusual Variance: Amount ({payout_amount:,.2f} BDT) deviates significantly from 6-month individual avg ({indiv_avg:,.2f} BDT)"
                create_risk_alert(
                    item.id,
                    flag_type='UNUSUAL_VARIANCE',
                    severity='HIGH',
                    notes=item.anomaly_reason
                )
            else:
                item.is_anomaly = False
                item.anomaly_score = 0.2100
                item.anomaly_reason = None

    db.session.commit()


def create_risk_alert(batch_item_id, flag_type, severity, notes):
    """Helper to record or update a RiskAlert entry for a batch item."""
    existing = RiskAlert.query.filter(
        RiskAlert.batch_item_id == batch_item_id,
        ~RiskAlert.flag_type.like('MANUAL_%'),
    ).first()
    if not existing:
        alert = RiskAlert(
            batch_item_id=batch_item_id,
            flag_type=flag_type,
            severity=severity,
            review_status='PENDING_REVIEW',
            review_notes=notes
        )
        db.session.add(alert)
    else:
        existing.flag_type = flag_type
        existing.severity = severity
        existing.review_notes = notes
