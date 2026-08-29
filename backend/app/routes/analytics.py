from flask import Blueprint, jsonify, g
from decimal import Decimal
from app.models import Company, CentralWallet, Batch, BatchItem, RiskAlert
from app.services.forecasting_service import generate_liquidity_forecast
from app.utils.auth import require_auth, require_tenant

analytics_bp = Blueprint('analytics', __name__, url_prefix='/api/analytics')

@analytics_bp.route('/liquidity-forecast/<int:company_id>', methods=['GET'])
@require_auth()
@require_tenant()
def get_liquidity_forecast(company_id):
    forecasts = generate_liquidity_forecast(company_id)
    return jsonify({'liquidity_forecasts': forecasts}), 200

@analytics_bp.route('/summary/<int:company_id>', methods=['GET'])
@require_auth()
@require_tenant()
def get_dashboard_summary(company_id):
    company = Company.query.get(company_id)
    if not company:
        return jsonify({'error': 'Company not found'}), 404

    company.sync_balance()
    wallets = CentralWallet.query.filter_by(company_id=company_id).all()
    batches = Batch.query.filter_by(company_id=company_id).all()
    
    total_disbursed = sum((Decimal(str(b.total_amount)) for b in batches if b.status == 'EXECUTED'), Decimal('0.00'))
    pending_approval = sum((Decimal(str(b.total_amount)) for b in batches if b.status in ['FLAGGED_RISK', 'PENDING_CHECKER_REVIEW', 'CHECKER_REVIEWED']), Decimal('0.00'))
    
    open_alerts_count = RiskAlert.query.join(BatchItem).join(Batch).filter(
        Batch.company_id == company_id,
        RiskAlert.review_status == 'PENDING_REVIEW'
    ).count()

    return jsonify({
        'company_name': company.company_name,
        'central_wallet_balance': float(company.central_wallet_balance),
        'active_wallets_count': len([w for w in wallets if w.status == 'ACTIVE']),
        'total_batches_count': len(batches),
        'total_disbursed_bdt': float(total_disbursed),
        'pending_approval_bdt': float(pending_approval),
        'open_risk_alerts_count': open_alerts_count
    }), 200
