"""Tenant-isolated, explainable liquidity forecasting."""

from __future__ import annotations

from datetime import date, datetime
from statistics import mean, pstdev
from typing import Any

import numpy as np

from app.extensions import db
from app.models import (
    CentralWallet,
    CompanyForecastSettings,
    ForecastAlert,
    ForecastRun,
    ForecastRunResult,
    LiquidityForecast,
    PayrollHistory,
)

try:  # Keep local/test environments operational before dependency installation.
    from statsmodels.tsa.holtwinters import ExponentialSmoothing
    HAS_STATSMODELS = True
except ImportError:  # pragma: no cover
    ExponentialSmoothing = None
    HAS_STATSMODELS = False


DEFAULT_BASELINE = 5_000_000.0
CONFIDENCE_LEVEL = 0.95


def _month_start(value: datetime) -> date:
    return date(value.year, value.month, 1)


def _add_months(value: date, count: int) -> date:
    month_index = value.year * 12 + value.month - 1 + count
    return date(month_index // 12, month_index % 12 + 1, 1)


def _period(value: date) -> str:
    return value.strftime('%Y-%m')


def build_monthly_series(company_id: int) -> list[dict[str, Any]]:
    """Aggregate only completed payroll records owned by one company."""
    monthly: dict[date, float] = {}
    rows = PayrollHistory.query.filter_by(company_id=company_id).order_by(PayrollHistory.disbursement_date).all()
    for row in rows:
        month = _month_start(row.disbursement_date)
        monthly[month] = monthly.get(month, 0.0) + float(row.gross_salary)
    return [{'period': _period(month), 'month': month, 'amount': round(amount, 2)} for month, amount in sorted(monthly.items())]


def select_forecast_strategy(history_months: int) -> tuple[str, str]:
    if history_months < 3:
        return 'BASELINE', 'INSUFFICIENT_HISTORY'
    if history_months < 6:
        return 'SES', 'LIMITED_VALIDATION'
    if history_months < 24:
        return 'HOLT', 'READY'
    return 'HOLT_WINTERS_ADDITIVE', 'READY'


def _ses(values: list[float], horizon: int) -> tuple[list[float], list[float], dict[str, Any]]:
    best: tuple[float, float, list[float]] | None = None
    for alpha in np.linspace(0.05, 0.95, 19):
        level, errors = values[0], []
        for actual in values[1:]:
            errors.append(actual - level)
            level = alpha * actual + (1 - alpha) * level
        candidate = (sum(error ** 2 for error in errors), float(alpha), errors)
        if best is None or candidate[0] < best[0]:
            best = candidate
    assert best is not None
    _, alpha, errors = best
    level = values[0]
    for actual in values[1:]:
        level = alpha * actual + (1 - alpha) * level
    return [level] * horizon, errors, {'engine': 'native_grid', 'alpha': alpha}


def _holt(values: list[float], horizon: int) -> tuple[list[float], list[float], dict[str, Any]]:
    best: tuple[float, float, float, list[float]] | None = None
    for alpha in np.linspace(0.1, 0.9, 9):
        for beta in np.linspace(0.1, 0.9, 9):
            level, trend, errors = values[0], values[1] - values[0], []
            for actual in values[1:]:
                predicted, previous_level = level + trend, level
                errors.append(actual - predicted)
                level = alpha * actual + (1 - alpha) * predicted
                trend = beta * (level - previous_level) + (1 - beta) * trend
            candidate = (sum(error ** 2 for error in errors), float(alpha), float(beta), errors)
            if best is None or candidate[0] < best[0]:
                best = candidate
    assert best is not None
    _, alpha, beta, errors = best
    level, trend = values[0], values[1] - values[0]
    for actual in values[1:]:
        predicted, previous_level = level + trend, level
        level = alpha * actual + (1 - alpha) * predicted
        trend = beta * (level - previous_level) + (1 - beta) * trend
    return [level + trend * step for step in range(1, horizon + 1)], errors, {'engine': 'native_grid', 'alpha': alpha, 'beta': beta}


def _seasonal_fallback(values: list[float], horizon: int) -> tuple[list[float], list[float], dict[str, Any]]:
    recent_year, previous_year = values[-12:], values[-24:-12]
    level, previous_level = mean(recent_year), mean(previous_year)
    monthly_trend = (level - previous_level) / 12
    seasonality = [amount - level for amount in recent_year]
    forecast = [level + monthly_trend * step + seasonality[(len(values) + step - 1) % 12] for step in range(1, horizon + 1)]
    residuals = [values[index] - (level + seasonality[index % 12]) for index in range(len(values) - 12, len(values))]
    return forecast, residuals, {'engine': 'native_seasonal_fallback', 'seasonal_periods': 12}


def _fit_values(values: list[float], strategy: str, horizon: int) -> tuple[list[float], list[float], dict[str, Any]]:
    if strategy == 'SES':
        if HAS_STATSMODELS:
            fit = ExponentialSmoothing(values, initialization_method='estimated').fit(optimized=True)
            return list(fit.forecast(horizon)), list(np.asarray(values) - np.asarray(fit.fittedvalues)), {'engine': 'statsmodels', 'alpha': float(fit.params.get('smoothing_level', 0.0))}
        return _ses(values, horizon)
    if strategy == 'HOLT':
        if HAS_STATSMODELS:
            fit = ExponentialSmoothing(values, trend='add', damped_trend=True, initialization_method='estimated').fit(optimized=True)
            return list(fit.forecast(horizon)), list(np.asarray(values) - np.asarray(fit.fittedvalues)), {'engine': 'statsmodels', 'alpha': float(fit.params.get('smoothing_level', 0.0)), 'beta': float(fit.params.get('smoothing_trend', 0.0))}
        return _holt(values, horizon)
    if strategy == 'HOLT_WINTERS_ADDITIVE':
        if HAS_STATSMODELS:
            fit = ExponentialSmoothing(values, trend='add', seasonal='add', seasonal_periods=12, initialization_method='estimated').fit(optimized=True)
            return list(fit.forecast(horizon)), list(np.asarray(values) - np.asarray(fit.fittedvalues)), {'engine': 'statsmodels', 'alpha': float(fit.params.get('smoothing_level', 0.0)), 'beta': float(fit.params.get('smoothing_trend', 0.0)), 'gamma': float(fit.params.get('smoothing_seasonal', 0.0)), 'seasonal_periods': 12}
        return _seasonal_fallback(values, horizon)
    raise ValueError(f'Unsupported forecast strategy: {strategy}')


def _backtest(values: list[float], strategy: str) -> tuple[float | None, float | None, int]:
    minimum_training = 3 if strategy in {'SES', 'HOLT'} else 24
    errors, percentage_errors = [], []
    for cutoff in range(minimum_training, len(values)):
        forecast, _, _ = _fit_values(values[:cutoff], strategy, 1)
        error = values[cutoff] - forecast[0]
        errors.append(abs(error))
        if values[cutoff] != 0:
            percentage_errors.append(abs(error / values[cutoff]) * 100)
    return (
        round(mean(errors), 2) if len(errors) >= 3 else None,
        round(mean(percentage_errors), 4) if len(percentage_errors) >= 3 else None,
        len(errors),
    )


def _prediction_bounds(predictions: list[float], residuals: list[float]) -> list[tuple[float, float]]:
    deviation = pstdev(residuals) if len(residuals) > 1 else 0.0
    return [(max(0.0, amount - 1.96 * deviation), max(0.0, amount + 1.96 * deviation)) for amount in predictions]


def _settings(company_id: int) -> CompanyForecastSettings | None:
    return CompanyForecastSettings.query.filter_by(company_id=company_id).first()


def _base_forecast(company_id: int, horizon: int) -> dict[str, Any]:
    series = build_monthly_series(company_id)
    values = [item['amount'] for item in series]
    strategy, status = select_forecast_strategy(len(values))
    setting = _settings(company_id)
    baseline = float(setting.planning_baseline_amount) if setting else DEFAULT_BASELINE
    latest_month = series[-1]['month'] if series else date.today().replace(day=1)
    source_data_through = latest_month if series else None
    if strategy == 'BASELINE':
        predictions, residuals, parameters = [baseline] * horizon, [], {'engine': 'configured_baseline'}
        assumptions, mae, mape, folds = ['Configured planning baseline; insufficient payroll history for a trained model.'], None, None, 0
    else:
        predictions, residuals, parameters = _fit_values(values, strategy, horizon)
        mae, mape, folds = _backtest(values, strategy)
        if folds < 3:
            status = 'LIMITED_VALIDATION'
        assumptions = ['Forecast uses only this company’s completed payroll history.']
        if strategy != 'HOLT_WINTERS_ADDITIVE':
            assumptions.append('Yearly festival seasonality is not learned until 24 completed monthly observations.')
    bounds = _prediction_bounds(predictions, residuals)
    records = []
    for index, (amount, (lower, upper)) in enumerate(zip(predictions, bounds), start=1):
        records.append({'period': _period(_add_months(latest_month, index)), 'predicted_amount': round(max(0.0, amount), 2), 'lower_bound': round(lower, 2), 'upper_bound': round(upper, 2), 'assumptions': assumptions})
    return {'series': series, 'strategy': strategy, 'status': status, 'history_months': len(values), 'mae': mae, 'mape': mape, 'backtest_folds': folds, 'parameters': parameters, 'source_data_through': source_data_through, 'records': records}


def _create_accuracy_alert(company_id: int, run: ForecastRun, mape: float | None, folds: int) -> None:
    if mape is None or folds < 6 or mape <= 15:
        return
    existing = ForecastAlert.query.filter_by(company_id=company_id, alert_type='HIGH_FORECAST_ERROR', review_status='PENDING_REVIEW').first()
    if existing is None:
        db.session.add(ForecastAlert(company_id=company_id, forecast_run_id=run.id, alert_type='HIGH_FORECAST_ERROR', severity='MEDIUM', details={'mape': mape, 'backtest_folds': folds, 'threshold': 15}))


def refresh_liquidity_forecast(company_id: int, horizon: int = 3) -> dict[str, Any]:
    """Fit and persist a base forecast. Request-time bonus adjustments stay out of the cache."""
    try:
        result = _base_forecast(company_id, horizon)
        run = ForecastRun(company_id=company_id, model_type=result['strategy'], status=result['status'], history_months=result['history_months'], mae=result['mae'], mape=result['mape'], parameters={**result['parameters'], 'backtest_folds': result['backtest_folds']}, source_data_through=result['source_data_through'], completed_at=datetime.utcnow())
        db.session.add(run)
        db.session.flush()
        for record in result['records']:
            row = LiquidityForecast.query.filter_by(company_id=company_id, forecast_period=record['period']).first()
            if row is None:
                row = LiquidityForecast(company_id=company_id, forecast_period=record['period'], predicted_amount=record['predicted_amount'])
                db.session.add(row)
            row.predicted_amount, row.lower_bound, row.upper_bound = record['predicted_amount'], record['lower_bound'], record['upper_bound']
            row.model_type, row.status, row.history_months = result['strategy'], result['status'], result['history_months']
            row.mae, row.mape, row.confidence_score = result['mae'], result['mape'], CONFIDENCE_LEVEL
            row.assumptions, row.source_data_through, row.forecast_run_id, row.generated_at = record['assumptions'], result['source_data_through'], run.id, datetime.utcnow()
            db.session.add(ForecastRunResult(forecast_run_id=run.id, forecast_period=record['period'], predicted_amount=record['predicted_amount'], lower_bound=record['lower_bound'], upper_bound=record['upper_bound'], assumptions=record['assumptions'], source_data_through=result['source_data_through']))
        _create_accuracy_alert(company_id, run, result['mape'], result['backtest_folds'])
        db.session.commit()
        return get_cached_liquidity_forecast(company_id, horizon=horizon)
    except Exception as error:
        db.session.rollback()
        db.session.add(ForecastRun(company_id=company_id, model_type='UNKNOWN', status='FAILED', error_message=str(error), completed_at=datetime.utcnow()))
        db.session.commit()
        raise


def _apply_festival_adjustment(row: dict[str, Any], setting: CompanyForecastSettings | None, include_bonus: bool) -> dict[str, Any]:
    adjusted, assumptions = dict(row), list(row.get('assumptions') or [])
    if setting and include_bonus and int(row['period'].split('-')[1]) in {int(month) for month in (setting.festival_bonus_months or [])} and float(setting.festival_bonus_amount) > 0:
        bonus = float(setting.festival_bonus_amount)
        for key in ('predicted_amount', 'lower_bound', 'upper_bound'):
            if adjusted.get(key) is not None:
                adjusted[key] = round(float(adjusted[key]) + bonus, 2)
        assumptions.append(f'Includes configured festival bonus adjustment of BDT {bonus:,.0f}.')
    adjusted['assumptions'] = assumptions
    return adjusted


def get_cached_liquidity_forecast(company_id: int, horizon: int = 3, include_festival_bonus: bool | None = None) -> dict[str, Any]:
    series, setting = build_monthly_series(company_id), _settings(company_id)
    latest_completed_period = series[-1]['period'] if series else date.today().strftime('%Y-%m')
    rows = LiquidityForecast.query.filter_by(company_id=company_id).order_by(LiquidityForecast.forecast_period).all()
    rows = [
        row for row in rows
        if len(row.forecast_period) == 7
        and row.forecast_period[4] == '-'
        and row.forecast_period > latest_completed_period
    ][:horizon]
    include_bonus = setting.include_festival_bonus if include_festival_bonus is None and setting else bool(include_festival_bonus)
    wallet = CentralWallet.query.filter_by(company_id=company_id, wallet_type='MAIN').first()
    current_balance = float(wallet.balance) if wallet else 0.0
    if not rows:
        return {'company_id': company_id, 'generated_at': None, 'source_data_through': series[-1]['period'] if series else None, 'model': {'type': 'UNAVAILABLE', 'status': 'UNAVAILABLE', 'history_months': len(series), 'mae': None, 'mape': None, 'confidence_level': None}, 'forecasts': [], 'liquidity_forecasts': [], 'historical_series': [{'period': item['period'], 'amount': item['amount']} for item in series], 'settings': setting.to_dict() if setting else None}
    base, forecasts = rows[0], []
    for row in rows:
        payload = _apply_festival_adjustment(row.to_dict(), setting, include_bonus)
        payload['current_balance'] = current_balance
        payload['topup_required'] = round(max(0.0, payload['predicted_amount'] - current_balance), 2)
        forecasts.append(payload)
    return {'company_id': company_id, 'generated_at': base.generated_at.isoformat() if base.generated_at else None, 'source_data_through': base.source_data_through.isoformat() if base.source_data_through else None, 'model': {'type': base.model_type, 'status': base.status, 'history_months': base.history_months, 'mae': float(base.mae) if base.mae is not None else None, 'mape': float(base.mape) if base.mape is not None else None, 'confidence_level': float(base.confidence_score) if base.confidence_score is not None else None}, 'forecasts': forecasts, 'liquidity_forecasts': forecasts, 'historical_series': [{'period': item['period'], 'amount': item['amount']} for item in series], 'settings': setting.to_dict() if setting else None}


def update_forecast_settings(company_id: int, payload: dict[str, Any], configured_by: int) -> CompanyForecastSettings:
    setting = _settings(company_id)
    if setting is None:
        setting = CompanyForecastSettings(company_id=company_id)
        db.session.add(setting)
    baseline = payload.get('planning_baseline_amount', setting.planning_baseline_amount)
    bonus_amount = payload.get('festival_bonus_amount', setting.festival_bonus_amount)
    months = payload.get('festival_bonus_months', setting.festival_bonus_months)
    if float(baseline) < 0 or float(bonus_amount) < 0:
        raise ValueError('Forecast amounts cannot be negative.')
    if not isinstance(months, list) or any(not isinstance(month, int) or month < 1 or month > 12 for month in months):
        raise ValueError('Festival bonus months must be integers from 1 to 12.')
    setting.planning_baseline_amount, setting.festival_bonus_amount = baseline, bonus_amount
    setting.festival_bonus_months = sorted(set(months))
    setting.include_festival_bonus = bool(payload.get('include_festival_bonus', setting.include_festival_bonus))
    setting.configured_by = configured_by
    db.session.commit()
    return setting
