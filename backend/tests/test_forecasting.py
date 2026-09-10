from datetime import datetime

from app.extensions import db
from app.models import ForecastRun, ForecastRunResult, PayrollHistory


def add_company_one_monthly_history():
    for month, amount in enumerate([4_100_000, 4_200_000, 4_350_000, 4_300_000, 4_500_000, 4_650_000], start=1):
        db.session.add(PayrollHistory(
            company_id=1,
            phone_number='01711112233',
            employee_name='Karim Rahman',
            department='IT',
            disbursement_date=datetime(2026, month, 1),
            basic_salary=amount * 0.6,
            gross_salary=amount,
        ))
    db.session.commit()


def test_company_maker_refreshes_a_tenant_scoped_holt_forecast(client, app, maker_auth):
    with app.app_context():
        add_company_one_monthly_history()
    response = client.post('/api/analytics/liquidity-forecast/1/refresh', headers=maker_auth)

    assert response.status_code == 200
    payload = response.get_json()
    assert payload['model']['type'] == 'HOLT'
    assert payload['model']['history_months'] == 6
    assert len(payload['forecasts']) == 3
    assert all(item['predicted_amount'] >= 0 for item in payload['forecasts'])
    assert all(item['topup_required'] >= 0 for item in payload['forecasts'])
    assert isinstance(payload['model']['mae'], float)
    assert isinstance(payload['model']['mape'], float)

    with app.app_context():
        run = ForecastRun.query.filter_by(company_id=1).one()
        assert run.status == 'READY'
        assert len(ForecastRunResult.query.filter_by(forecast_run_id=run.id).all()) == 3


def test_cached_forecast_read_does_not_create_another_model_run(client, app, maker_auth):
    with app.app_context():
        add_company_one_monthly_history()
    assert client.post('/api/analytics/liquidity-forecast/1/refresh', headers=maker_auth).status_code == 200
    with app.app_context():
        before = ForecastRun.query.filter_by(company_id=1).count()

    response = client.get('/api/analytics/liquidity-forecast/1', headers=maker_auth)

    assert response.status_code == 200
    assert response.get_json()['model']['type'] == 'HOLT'
    with app.app_context():
        assert ForecastRun.query.filter_by(company_id=1).count() == before


def test_company_maker_configures_a_real_festival_bonus_adjustment(client, app, maker_auth):
    with app.app_context():
        add_company_one_monthly_history()
    assert client.post('/api/analytics/liquidity-forecast/1/refresh', headers=maker_auth).status_code == 200
    base = client.get('/api/analytics/liquidity-forecast/1?include_festival_bonus=false', headers=maker_auth).get_json()['forecasts'][0]
    forecast_month = int(base['period'].split('-')[1])
    settings = client.put('/api/analytics/liquidity-forecast/1/settings', headers=maker_auth, json={
        'planning_baseline_amount': 5000000,
        'include_festival_bonus': True,
        'festival_bonus_amount': 125000,
        'festival_bonus_months': [forecast_month],
    })

    assert settings.status_code == 200
    adjusted = client.get('/api/analytics/liquidity-forecast/1?include_festival_bonus=true', headers=maker_auth).get_json()['forecasts'][0]
    assert adjusted['predicted_amount'] == base['predicted_amount'] + 125000
    assert 'festival bonus adjustment' in ' '.join(adjusted['assumptions']).lower()


def test_forecast_uses_only_requested_company_history(client, app, maker_auth):
    with app.app_context():
        add_company_one_monthly_history()
        db.session.add(PayrollHistory(
            company_id=2,
            phone_number='01811000003',
            employee_name='Apex Only',
            department='Production',
            disbursement_date=datetime(2026, 1, 1),
            basic_salary=5_400_000,
            gross_salary=9_000_000,
        ))
        db.session.commit()

    response = client.post('/api/analytics/liquidity-forecast/1/refresh', headers=maker_auth)
    assert response.status_code == 200
    assert response.get_json()['model']['history_months'] == 6


def test_executed_payroll_refreshes_the_company_forecast(client, app, maker_auth, checker_auth):
    upload = client.post('/api/batches/upload', headers=maker_auth, json={'payroll_period': '2026-04', 'items': [{
        'raw_phone_number': '01711112233',
        'employee_name': 'Karim Rahman',
        'department': 'IT',
        'basic_salary': 30_000,
        'gross_salary': 45_000,
    }]})
    batch_id = upload.get_json()['batch']['id']
    assert client.post(f'/api/batches/{batch_id}/submit', headers=maker_auth).status_code == 200
    assert client.post(f'/api/batches/{batch_id}/checker-review', headers=checker_auth, json={}).status_code == 200
    before_execution = client.get('/api/analytics/disbursement-history/1', headers=checker_auth)
    assert before_execution.status_code == 200
    assert before_execution.get_json()['historical_series'] == []
    assert client.post(f'/api/batches/{batch_id}/execute', headers=maker_auth).status_code == 200

    after_execution = client.get('/api/analytics/disbursement-history/1', headers=checker_auth)
    assert after_execution.status_code == 200
    assert after_execution.get_json()['historical_series'] == [{'period': '2026-04', 'amount': 45000.0}]

    with app.app_context():
        run = ForecastRun.query.filter_by(company_id=1).one()
        assert run.model_type == 'BASELINE'
        assert run.history_months == 1
        assert PayrollHistory.query.filter_by(company_id=1).one().disbursement_date.date().isoformat() == '2026-04-01'


def test_upload_rejects_an_invalid_payroll_month_and_allows_future_months(client, maker_auth):
    salary_row = {'raw_phone_number': '01711112233', 'employee_name': 'Karim Rahman', 'department': 'IT', 'basic_salary': 30_000, 'gross_salary': 45_000}
    invalid = client.post('/api/batches/upload', headers=maker_auth, json={'payroll_period': 'April 2026', 'items': [salary_row]})
    future = client.post('/api/batches/upload', headers=maker_auth, json={'payroll_period': '2099-01', 'items': [salary_row]})
    assert invalid.status_code == 400
    assert future.status_code == 201
    assert future.get_json()['batch']['payroll_period'] == '2099-01-01'
    batch_id = future.get_json()['batch']['id']
    audit_logs = client.get(f'/api/audit-logs?batch_id={batch_id}', headers=maker_auth).get_json()['audit_logs']
    assert audit_logs
    assert all(log['payroll_period'] == '2099-01-01' for log in audit_logs)


def test_two_years_of_history_uses_holt_winters_with_validation(client, app, maker2_auth):
    with app.app_context():
        for index in range(27):
            year, month_offset = divmod(index, 12)
            month = month_offset + 1
            seasonal_bonus = 400_000 if month in {6, 12} else 0
            db.session.add(PayrollHistory(
                company_id=2,
                phone_number='01811000003',
                employee_name='Apex Seasonal Payroll',
                department='Production',
                disbursement_date=datetime(2024 + year, month, 1),
                basic_salary=(3_000_000 + index * 25_000 + seasonal_bonus) * 0.6,
                gross_salary=3_000_000 + index * 25_000 + seasonal_bonus,
            ))
        db.session.commit()

    response = client.post('/api/analytics/liquidity-forecast/2/refresh', headers=maker2_auth)

    assert response.status_code == 200
    payload = response.get_json()
    assert payload['model']['type'] == 'HOLT_WINTERS_ADDITIVE'
    assert payload['model']['status'] == 'READY'
    assert payload['model']['mape'] is not None


def test_upay_admin_cannot_read_or_refresh_a_company_forecast(client, admin_auth):
    assert client.get('/api/analytics/liquidity-forecast/1', headers=admin_auth).status_code == 403
    assert client.post('/api/analytics/liquidity-forecast/1/refresh', headers=admin_auth).status_code == 403
