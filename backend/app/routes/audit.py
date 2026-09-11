from flask import Blueprint, request, jsonify, g
from app.models import AuditLog, Batch
from app.utils.auth import require_auth

audit_bp = Blueprint("audit", __name__, url_prefix="/api/audit-logs")


@audit_bp.route("", methods=["GET"])
@require_auth()
def get_audit_logs():
    user = g.current_user
    batch_id = request.args.get("batch_id", type=int)

    query = AuditLog.query.filter_by(audit_scope="CORPORATE_CLIENT")
    if user.role != "ADMIN":
        query = query.filter_by(company_id=user.company_id)
    else:
        comp_id = request.args.get("company_id", type=int)
        if comp_id:
            query = query.filter_by(company_id=comp_id)

    if batch_id:
        query = query.filter_by(batch_id=batch_id)

    logs = query.order_by(AuditLog.created_at.desc()).all()
    return jsonify({"audit_logs": [l.to_dict() for l in logs]}), 200
