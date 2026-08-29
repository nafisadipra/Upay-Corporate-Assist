from flask import Blueprint, request, jsonify, g
from app.extensions import db
from app.models import RiskAlert, BatchItem, Batch, AuditLog
from app.utils.auth import require_auth

risk_alerts_bp = Blueprint('risk_alerts', __name__, url_prefix='/api/risk-alerts')

@risk_alerts_bp.route('', methods=['GET'])
@require_auth()
def get_risk_alerts():
    user = g.current_user
    batch_id = request.args.get('batch_id', type=int)
    
    query = RiskAlert.query.join(BatchItem).join(Batch)
    if user.role != 'ADMIN':
        query = query.filter(Batch.company_id == user.company_id)

    if batch_id:
        query = query.filter(BatchItem.batch_id == batch_id)

    alerts = query.order_by(RiskAlert.created_at.desc()).all()
    return jsonify({'risk_alerts': [a.to_dict() for a in alerts]}), 200


@risk_alerts_bp.route('/<int:alert_id>/review', methods=['PUT'])
@require_auth(roles=['CHECKER', 'ADMIN'])
def review_risk_alert(alert_id):
    """
    Checker Risk Alert Review Sign-Off:
    Allows Finance Director (Checker) to review, approve, or override flagged anomaly alerts.
    """
    user = g.current_user
    data = request.get_json() or {}
    action = data.get('action', 'APPROVED_BY_CHECKER').strip()
    notes = data.get('notes', 'Reviewed and approved by Finance Director (Checker)').strip()

    alert = RiskAlert.query.get(alert_id)
    if not alert:
        return jsonify({'error': 'Risk alert not found'}), 404

    if action not in {'APPROVED_BY_CHECKER', 'OVERRIDDEN_BY_CHECKER', 'REJECTED_BY_CHECKER'}:
        return jsonify({'error': 'Action must be APPROVED_BY_CHECKER, OVERRIDDEN_BY_CHECKER, or REJECTED_BY_CHECKER.'}), 400

    item = BatchItem.query.get(alert.batch_item_id)
    batch = Batch.query.get(item.batch_id) if item else None

    if user.role != 'ADMIN' and batch and batch.company_id != user.company_id:
        return jsonify({'error': 'Tenant isolation: Cannot review risk alert of another company'}), 403

    if not batch or batch.status != 'PENDING_CHECKER_REVIEW':
        return jsonify({'error': 'Risk alerts can only be reviewed while the batch is pending Checker review.'}), 400

    alert.review_status = action
    alert.reviewed_by = user.id
    alert.review_notes = notes

    # Update item status
    if item:
        item.item_status = 'OVERRIDDEN' if 'OVERRIDDEN' in action else ('APPROVED' if 'APPROVED' in action else 'REJECTED')

    audit = AuditLog(
        company_id=batch.company_id if batch else user.company_id,
        batch_id=batch.id if batch else None,
        user_id=user.id,
        audit_scope='CORPORATE_CLIENT',
        action='RISK_ALERT_REVIEWED',
        details={
            'alert_id': alert.id,
            'flag_type': alert.flag_type,
            'review_status': action,
            'notes': notes
        }
    )
    db.session.add(audit)
    db.session.commit()

    return jsonify({
        'message': f'Risk alert reviewed: {action}',
        'risk_alert': alert.to_dict()
    }), 200
