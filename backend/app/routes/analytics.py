from flask import Blueprint, jsonify, g, request
from decimal import Decimal
from app.models import Company, CentralWallet, Batch, BatchItem, RiskAlert
from app.services.forecasting_service import (
    get_cached_liquidity_forecast,
    refresh_liquidity_forecast,
    update_forecast_settings,
)
from app.utils.auth import require_auth, require_tenant

analytics_bp = Blueprint('analytics', __name__, url_prefix='/api/analytics')

@analytics_bp.route('/disbursement-history/<int:company_id>', methods=['GET'])
@require_auth(roles=['MAKER', 'CHECKER', 'ADMIN'])
@require_tenant()
def get_disbursement_history(company_id):
    """Return actual completed payroll totals grouped by payroll period."""
    if not Company.query.get(company_id):
        return jsonify({'error': 'Company not found'}), 404

    monthly_totals = {}
    for batch in Batch.query.filter_by(company_id=company_id, status='EXECUTED').all():
        period_date = batch.payroll_period or (batch.executed_at.date() if batch.executed_at else None)
        if not period_date:
            continue
        period = period_date.strftime('%Y-%m')
        monthly_totals[period] = monthly_totals.get(period, Decimal('0.00')) + Decimal(str(batch.total_amount))

    return jsonify({
        'company_id': company_id,
        'historical_series': [
            {'period': period, 'amount': float(amount)}
            for period, amount in sorted(monthly_totals.items())
        ],
    }), 200

@analytics_bp.route('/liquidity-forecast/<int:company_id>', methods=['GET'])
@require_auth(roles=['MAKER'])
@require_tenant()
def get_liquidity_forecast(company_id):
    horizon = min(max(request.args.get('horizon', default=3, type=int), 1), 12)
    include_bonus_arg = request.args.get('include_festival_bonus')
    include_bonus = None if include_bonus_arg is None else include_bonus_arg.strip().lower() in {'1', 'true', 'yes'}
    return jsonify(get_cached_liquidity_forecast(company_id, horizon=horizon, include_festival_bonus=include_bonus)), 200


@analytics_bp.route('/liquidity-forecast/<int:company_id>/refresh', methods=['POST'])
@require_auth(roles=['MAKER'])
@require_tenant()
def refresh_liquidity_forecast_endpoint(company_id):
    horizon = min(max((request.get_json(silent=True) or {}).get('horizon', 3), 1), 12)
    try:
        return jsonify(refresh_liquidity_forecast(company_id, horizon=horizon)), 200
    except Exception:
        return jsonify({'error': 'Forecast refresh failed. The last successful forecast remains available.'}), 500


@analytics_bp.route('/liquidity-forecast/<int:company_id>/settings', methods=['PUT'])
@require_auth(roles=['MAKER'])
@require_tenant()
def save_forecast_settings(company_id):
    try:
        settings = update_forecast_settings(company_id, request.get_json(silent=True) or {}, g.current_user.id)
        return jsonify({'settings': settings.to_dict()}), 200
    except ValueError as error:
        return jsonify({'error': str(error)}), 400

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
