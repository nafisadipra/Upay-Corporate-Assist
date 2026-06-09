from io import BytesIO

from werkzeug.security import generate_password_hash

from app.extensions import db
from app.models import Batch, Company, User


def create_valid_batch(client, maker_auth):
    response = client.post('/api/batches/upload', headers=maker_auth, json={
        'items': [{
            'raw_phone_number': '01711112233',
            'employee_name': 'Karim Rahman',
            'department': 'IT',
            'basic_salary': 30000,
            'gross_salary': 45000,
        }],
    })
    assert response.status_code == 201
    return response.get_json()['batch']['id']


def test_batch_requires_its_original_maker(client, app, maker_auth):
    batch_id = create_valid_batch(client, maker_auth)
    with app.app_context():
        second_maker = User(
            company_id=1,
            full_name='Second Maker',
            email='maker2@pran.com',
            phone_number='01711000006',
            password_hash=generate_password_hash('password123', method='pbkdf2:sha256'),
            role='MAKER',
            status='ACTIVE',
        )
        db.session.add(second_maker)
        db.session.commit()

    login = client.post('/api/auth/login', json={'email': 'maker2@pran.com', 'password': 'password123'})
    second_maker_auth = {'Authorization': f"Bearer {login.get_json()['token']}"}
    response = client.post(f'/api/batches/{batch_id}/submit', headers=second_maker_auth)
    assert response.status_code == 403


def test_checker_can_only_review_submitted_batch(client, maker_auth, checker_auth):
    batch_id = create_valid_batch(client, maker_auth)
    response = client.post(f'/api/batches/{batch_id}/checker-review', headers=checker_auth, json={})
    assert response.status_code == 400


def test_finance_can_return_a_row_to_hr_for_correction(client, maker_auth, checker_auth):
    batch_id = create_valid_batch(client, maker_auth)
    assert client.post(f'/api/batches/{batch_id}/submit', headers=maker_auth).status_code == 200
    item = client.get(f'/api/batches/{batch_id}/items', headers=checker_auth).get_json()['items'][0]

    raised = client.post('/api/risk-alerts/manual', headers=checker_auth, json={
        'batch_item_id': item['id'],
        'issue_type': 'INCORRECT_SALARY',
        'notes': 'Gross salary should be BDT 47,000; confirm the approved adjustment.',
    })
    assert raised.status_code == 201
    assert raised.get_json()['batch']['status'] == 'RETURNED_TO_HR'
    assert raised.get_json()['risk_alert']['anomaly_reason'].startswith('Gross salary should')

    second_issue = client.post('/api/risk-alerts/manual', headers=checker_auth, json={
        'batch_item_id': item['id'],
        'issue_type': 'INCORRECT_PHONE',
        'notes': 'Confirm the employee phone number before resubmitting.',
    })
    assert second_issue.status_code == 201
    assert second_issue.get_json()['batch']['status'] == 'RETURNED_TO_HR'

    blocked_submit = client.post(f'/api/batches/{batch_id}/submit', headers=maker_auth)
    assert blocked_submit.status_code == 400
    assert 'correct every item' in blocked_submit.get_json()['error'].lower()

    corrected = client.put(f"/api/batches/items/{item['id']}/correct", headers=maker_auth, json={
        'corrected_phone_number': item['effective_phone_number'],
        'employee_name': item['employee_name'],
        'department': item['department'],
        'basic_salary': 30000,
        'gross_salary': 47000,
    })
    assert corrected.status_code == 200
    assert corrected.get_json()['batch']['status'] == 'FLAGGED_RISK'
    assert corrected.get_json()['batch']['total_amount'] == 47000
    resolved_alerts = client.get(f'/api/risk-alerts?batch_id={batch_id}', headers=maker_auth).get_json()['risk_alerts']
    manual_alerts = [alert for alert in resolved_alerts if alert['flag_type'].startswith('MANUAL_')]
    assert manual_alerts
    assert all(alert['review_status'] == 'RESOLVED_BY_HR' for alert in manual_alerts)
    assert client.post(f'/api/batches/{batch_id}/submit', headers=maker_auth).status_code == 200


def test_execution_is_blocked_until_invalid_item_is_corrected(client, maker_auth, checker_auth):
    response = client.post('/api/batches/upload', headers=maker_auth, json={
        'items': [{
            'raw_phone_number': '01799998877',
            'employee_name': 'Unknown Payee',
            'department': 'IT',
            'basic_salary': 30000,
            'gross_salary': 45000,
        }],
    })
    batch_id = response.get_json()['batch']['id']
    assert client.post(f'/api/batches/{batch_id}/submit', headers=maker_auth).status_code == 200

    alerts = client.get(f'/api/risk-alerts?batch_id={batch_id}', headers=checker_auth).get_json()['risk_alerts']
    assert client.put(f"/api/risk-alerts/{alerts[0]['id']}/review", headers=checker_auth, json={'action': 'OVERRIDDEN_BY_CHECKER'}).status_code == 200
    assert client.post(f'/api/batches/{batch_id}/checker-review', headers=checker_auth, json={}).status_code == 200

    execution = client.post(f'/api/batches/{batch_id}/execute', headers=maker_auth)
    assert execution.status_code == 400
    assert 'invalid or rejected' in execution.get_json()['error'].lower()


def test_suspended_company_cannot_submit_payroll(client, app, maker_auth):
    batch_id = create_valid_batch(client, maker_auth)
    with app.app_context():
        company = db.session.get(Company, 1)
        company.status = 'SUSPENDED'
        db.session.commit()

    response = client.post(f'/api/batches/{batch_id}/submit', headers=maker_auth)
    assert response.status_code == 403


def test_admin_approval_adds_employee_to_corporate_roster(client, maker_auth, admin_auth):
    template = b'full_name,email,wallet_details,department\nNew Employee,new.employee@example.com,01766667777,Operations\n'
    upload = client.post(
        '/api/employee-registrations/upload',
        headers=maker_auth,
        data={'file': (BytesIO(template), 'employees.csv')},
        content_type='multipart/form-data',
    )
    assert upload.status_code == 201

    pending = client.get('/api/employee-registrations', headers=admin_auth).get_json()['registrations']
    registration = next(row for row in pending if row['email'] == 'new.employee@example.com')
    approval = client.post(f"/api/employee-registrations/{registration['id']}/approve", headers=admin_auth)
    assert approval.status_code == 200

    employees = client.get('/api/companies/1/employees', headers=maker_auth).get_json()['employees']
    assert any(employee['phone_number'] == '01766667777' for employee in employees)
