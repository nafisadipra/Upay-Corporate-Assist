from flask import Blueprint, request, jsonify, g
from app.extensions import db
from app.models import RiskAlert, BatchItem, Batch, AuditLog
from app.utils.auth import require_auth

risk_alerts_bp = Blueprint("risk_alerts", __name__, url_prefix="/api/risk-alerts")

MANUAL_FLAG_TYPES = {
    "INCORRECT_SALARY",
    "WRONG_EMPLOYEE",
    "INCORRECT_PHONE",
    "DUPLICATE_PAYMENT",
    "OTHER",
}


@risk_alerts_bp.route("", methods=["GET"])
@require_auth()
def get_risk_alerts():
    user = g.current_user
    batch_id = request.args.get("batch_id", type=int)

    query = RiskAlert.query.join(BatchItem).join(Batch)
    if user.role != "ADMIN":
        query = query.filter(Batch.company_id == user.company_id)

    if batch_id:
        query = query.filter(BatchItem.batch_id == batch_id)

    alerts = query.order_by(RiskAlert.created_at.desc()).all()
    return jsonify({"risk_alerts": [a.to_dict() for a in alerts]}), 200


@risk_alerts_bp.route("/manual", methods=["POST"])
@require_auth(roles=["CHECKER", "ADMIN"])
def create_manual_risk_alert():
    data = request.get_json() or {}
    item = BatchItem.query.get(data.get("batch_item_id"))
    if not item:
        return jsonify({"error": "Payroll item not found"}), 404
    batch = Batch.query.get(item.batch_id)
    if not batch:
        return jsonify({"error": "Batch not found"}), 404
    if g.current_user.role != "ADMIN" and batch.company_id != g.current_user.company_id:
        return jsonify({"error": "Tenant isolation: Cannot flag another company payroll"}), 403
    if batch.status not in {"PENDING_CHECKER_REVIEW", "CHECKER_REVIEWED", "RETURNED_TO_HR"}:
        return (
            jsonify(
                {
                    "error": "Issues can only be raised during Finance review or while the batch is returned to HR."
                }
            ),
            400,
        )

    issue_type = str(data.get("issue_type", "")).upper()
    notes = str(data.get("notes", "")).strip()
    if issue_type not in MANUAL_FLAG_TYPES:
        return jsonify({"error": "Select a valid issue type."}), 400
    if not notes:
        return jsonify({"error": "A Finance review note is required."}), 400

    existing_alert = RiskAlert.query.filter_by(
        batch_item_id=item.id,
        flag_type=f"MANUAL_{issue_type}",
        review_status="PENDING_REVIEW",
    ).first()
    if existing_alert:
        return (
            jsonify({"error": "This issue type is already open for the selected payroll row."}),
            409,
        )

    alert = RiskAlert(
        batch_item_id=item.id,
        flag_type=f"MANUAL_{issue_type}",
        severity="HIGH",
        review_status="PENDING_REVIEW",
        reviewed_by=g.current_user.id,
        review_notes=notes,
    )
    confirmed_ai_alerts = RiskAlert.query.filter(
        RiskAlert.batch_item_id == item.id,
        ~RiskAlert.flag_type.like("MANUAL_%"),
        RiskAlert.review_status == "PENDING_REVIEW",
    ).all()
    for ai_alert in confirmed_ai_alerts:
        ai_alert.review_status = "REJECTED_BY_CHECKER"
        ai_alert.reviewed_by = g.current_user.id
        ai_alert.review_notes = notes

    item.item_status = "REJECTED"
    batch.status = "RETURNED_TO_HR"
    db.session.add(alert)
    db.session.add(
        AuditLog(
            company_id=batch.company_id,
            batch_id=batch.id,
            user_id=g.current_user.id,
            audit_scope="CORPORATE_CLIENT",
            action="BATCH_RETURNED_TO_HR",
            details={
                "item_id": item.id,
                "employee_name": item.employee_name,
                "issue_type": issue_type,
                "notes": notes,
                "confirmed_ai_alert_ids": [ai_alert.id for ai_alert in confirmed_ai_alerts],
            },
        )
    )
    db.session.commit()
    return (
        jsonify(
            {
                "message": "Issue raised and batch returned to HR.",
                "risk_alert": alert.to_dict(),
                "batch": batch.to_dict(),
            }
        ),
        201,
    )


@risk_alerts_bp.route("/<int:alert_id>/review", methods=["PUT"])
@require_auth(roles=["CHECKER", "ADMIN"])
def review_risk_alert(alert_id):
    """
    Checker Risk Alert Review Sign-Off:
    Allows Finance Director (Checker) to authorize an exception for an AI alert.
    """
    user = g.current_user
    data = request.get_json() or {}
    action = data.get("action", "OVERRIDDEN_BY_CHECKER").strip()
    notes = data.get("notes", "Exception authorized by Finance Director (Checker)").strip()

    alert = RiskAlert.query.get(alert_id)
    if not alert:
        return jsonify({"error": "Risk alert not found"}), 404

    if action != "OVERRIDDEN_BY_CHECKER":
        return (
            jsonify(
                {
                    "error": "AI alerts can only be overridden here. Raise an issue to return incorrect payroll data to HR."
                }
            ),
            400,
        )

    if alert.flag_type.startswith("MANUAL_"):
        return jsonify({"error": "Finance-raised issues must be corrected by HR."}), 400

    item = BatchItem.query.get(alert.batch_item_id)
    batch = Batch.query.get(item.batch_id) if item else None

    if user.role != "ADMIN" and batch and batch.company_id != user.company_id:
        return (
            jsonify({"error": "Tenant isolation: Cannot review risk alert of another company"}),
            403,
        )

    if not batch or batch.status not in {"PENDING_CHECKER_REVIEW", "CHECKER_REVIEWED"}:
        return (
            jsonify(
                {
                    "error": "Risk alerts can only be reviewed during or immediately after Checker sign-off."
                }
            ),
            400,
        )

    alert.review_status = action
    alert.reviewed_by = user.id
    alert.review_notes = notes

    # Update item status
    if item:
        item.item_status = "OVERRIDDEN"

    audit = AuditLog(
        company_id=batch.company_id if batch else user.company_id,
        batch_id=batch.id if batch else None,
        user_id=user.id,
        audit_scope="CORPORATE_CLIENT",
        action="RISK_ALERT_REVIEWED",
        details={
            "alert_id": alert.id,
            "flag_type": alert.flag_type,
            "review_status": action,
            "notes": notes,
        },
    )
    db.session.add(audit)
    db.session.commit()

    return (
        jsonify({"message": f"Risk alert reviewed: {action}", "risk_alert": alert.to_dict()}),
        200,
    )
