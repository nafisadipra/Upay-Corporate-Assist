from io import BytesIO

from openpyxl import load_workbook

from app.extensions import db
from app.models import Batch, BatchItem


def test_company_isolation_companies_endpoint(client, maker_auth, maker2_auth, admin_auth):
    # Maker 1 should only see Company 1
    res1 = client.get('/api/companies', headers=maker_auth)
    assert res1.status_code == 200
    companies1 = res1.get_json()['companies']
    assert len(companies1) == 1
    assert companies1[0]['id'] == 1

    # Maker 2 should only see Company 2
    res2 = client.get('/api/companies', headers=maker2_auth)
    assert res2.status_code == 200
    companies2 = res2.get_json()['companies']
    assert len(companies2) == 1
    assert companies2[0]['id'] == 2

    # Admin sees all companies
    res_admin = client.get('/api/companies', headers=admin_auth)
    assert res_admin.status_code == 200
    assert len(res_admin.get_json()['companies']) == 2

def test_cross_tenant_company_details_blocked(client, maker_auth):
    # Maker 1 trying to access Company 2 details
    res = client.get('/api/companies/2', headers=maker_auth)
    assert res.status_code == 403


def test_cross_tenant_employees_blocked(client, maker_auth):
    # Maker 1 trying to access Company 2 employees
    res = client.get('/api/companies/2/employees', headers=maker_auth)
    assert res.status_code == 403


def test_cross_tenant_batch_upload_is_blocked(client, maker_auth):
    response = client.post('/api/batches/upload', headers=maker_auth, json={
        'company_id': 2,
        'file_name': 'cross-tenant-payroll.xlsx',
        'items': [{
            'raw_phone_number': '01733334455',
            'employee_name': 'Sujon Islam',
            'department': 'Production',
            'basic_salary': 800,
            'gross_salary': 1000,
        }],
    })

    assert response.status_code == 403
    assert Batch.query.count() == 0


def test_retired_direct_authorization_cannot_execute_another_tenant_batch(client, maker_auth, maker2_auth):
    batch = Batch(
        company_id=2,
        maker_id=3,
        checker_id=2,
        file_name='reviewed-payroll.xlsx',
        total_records=1,
        total_amount=1000,
        status='CHECKER_REVIEWED',
    )
    db.session.add(batch)
    db.session.commit()

    before = client.get('/api/companies/2', headers=maker2_auth).get_json()['company']['central_wallet_balance']
    response = client.post(
        f'/api/batches/{batch.id}/authorize',
        headers=maker_auth,
        json={'otp_code': 'not-a-valid-otp'},
    )
    after = client.get('/api/companies/2', headers=maker2_auth).get_json()['company']['central_wallet_balance']

    assert response.status_code == 410
    assert 'retired' in response.get_json()['error'].lower()
    assert after == before
    assert db.session.get(Batch, batch.id).status == 'CHECKER_REVIEWED'


def test_retired_otp_endpoint_cannot_record_a_checker_review(client, checker_auth):
    batch = Batch(
        company_id=1,
        maker_id=1,
        file_name='pending-payroll.xlsx',
        total_records=1,
        total_amount=1000,
        status='PENDING_CHECKER_REVIEW',
    )
    db.session.add(batch)
    db.session.commit()

    response = client.post(f'/api/batches/{batch.id}/request-otp', headers=checker_auth)

    assert response.status_code == 410
    assert db.session.get(Batch, batch.id).status == 'PENDING_CHECKER_REVIEW'


def test_checker_downloads_selected_batch_from_database(client, checker_auth):
    batch = Batch(
        company_id=1,
        maker_id=1,
        file_name='fmcg-payroll-2026-05.xlsx',
        total_records=1,
        total_amount=1250,
        status='PENDING_CHECKER_REVIEW',
    )
    db.session.add(batch)
    db.session.flush()
    db.session.add(BatchItem(
        batch_id=batch.id,
        raw_phone_number='01711112233',
        employee_name='Karim Rahman',
        department='IT',
        basic_salary=1000,
        gross_salary=1250,
        account_validation_status='VALID',
        item_status='PENDING',
    ))
    db.session.commit()

    response = client.get(f'/api/batches/{batch.id}/workbook', headers=checker_auth)

    assert response.status_code == 200
    assert 'fmcg-payroll-2026-05.xlsx' in response.headers['Content-Disposition']
    sheet = load_workbook(BytesIO(response.data)).active
    assert sheet['A2'].value == 'Karim Rahman'
    assert sheet['B2'].value == '01711112233'
    assert sheet['E2'].value == 1250


def test_checker_cannot_download_another_tenant_batch(client, checker_auth):
    batch = Batch(
        company_id=2,
        maker_id=3,
        file_name='another-company.xlsx',
        total_records=0,
        total_amount=0,
        status='PENDING_CHECKER_REVIEW',
    )
    db.session.add(batch)
    db.session.commit()

    response = client.get(f'/api/batches/{batch.id}/workbook', headers=checker_auth)

    assert response.status_code == 403
