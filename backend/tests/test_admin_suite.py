from app.extensions import db
from app.models import EmployeeRegistration


def test_admin_onboard_company(client, admin_auth):
    payload = {
        'company_name': 'Square Pharmaceuticals PLC',
        'corporate_account_number': 'CORP-SQUARE-999',
        'wallet_name': 'Square Main Payroll Wallet',
        'opening_balance': 2500000.00
    }
    res = client.post('/api/admin/companies', json=payload, headers=admin_auth)
    assert res.status_code == 201
    comp = res.get_json()['company']
    assert comp['company_name'] == 'Square Pharmaceuticals PLC'
    assert comp['wallet_balance'] == 2500000.00


def test_admin_topup_company_wallet(client, admin_auth):
    # Top up Company 1 float by 1,500,000 BDT
    res = client.post('/api/admin/companies/1/topup', json={
        'amount': 1500000.00,
        'source_bank': 'UCB Corporate Head Office',
        'reference_note': 'Monthly salary pre-funding top-up'
    }, headers=admin_auth)
    assert res.status_code == 200
    # Original 5,000,000 + 1,500,000 = 6,500,000
    comp = res.get_json()['company']
    assert comp['wallet_balance'] == 6500000.00


def test_admin_bank_accounts_add_and_remove(client, admin_auth):
    # 1. Add new bank account for Company 1
    res_add = client.post('/api/admin/companies/1/bank-accounts', json={
        'bank_name': 'BRAC Bank PLC',
        'branch_name': 'Gulshan 1 Branch',
        'account_name': 'PRAN FMCG Operational A/C',
        'account_number': '1501209988776001',
        'routing_number': '060261501',
        'is_primary': False
    }, headers=admin_auth)
    assert res_add.status_code == 201
    acc_id = res_add.get_json()['bank_account']['id']

    # 2. List bank accounts
    res_list = client.get('/api/admin/companies/1/bank-accounts', headers=admin_auth)
    assert res_list.status_code == 200
    accounts = res_list.get_json()['bank_accounts']
    assert any(a['id'] == acc_id for a in accounts)

    # 3. Delete bank account
    res_del = client.delete(f'/api/admin/companies/1/bank-accounts/{acc_id}', headers=admin_auth)
    assert res_del.status_code == 200

    # 4. Verify deleted
    res_list2 = client.get('/api/admin/companies/1/bank-accounts', headers=admin_auth)
    assert not any(a['id'] == acc_id for a in res_list2.get_json()['bank_accounts'])


def test_admin_single_employee_add_and_remove(client, admin_auth):
    # Add employee
    res_add = client.post('/api/admin/companies/1/employees', json={
        'employee_code': 'EMP-777',
        'employee_name': 'Shakib Al Hasan',
        'phone_number': '01799887766',
        'department': 'Marketing',
        'designation': 'Brand Ambassador'
    }, headers=admin_auth)
    assert res_add.status_code == 201
    emp_id = res_add.get_json()['employee']['id']

    # Delete employee
    res_del = client.delete(f'/api/admin/companies/1/employees/{emp_id}', headers=admin_auth)
    assert res_del.status_code == 200


def test_admin_bulk_approve_employee_registrations(client, app, admin_auth):
    with app.app_context():
        rows = [
            EmployeeRegistration(company_id=1, submitted_by=1, full_name='Bulk Employee One', email='bulk-one@pran.com', employee_code='EMP-BULK-01', department='Finance', designation='Officer', wallet_details='01717770001'),
            EmployeeRegistration(company_id=1, submitted_by=1, full_name='Bulk Employee Two', email='bulk-two@pran.com', employee_code='EMP-BULK-02', department='Sales', designation='Executive', wallet_details='01717770002'),
        ]
        db.session.add_all(rows)
        db.session.commit()
        registration_ids = [row.id for row in rows]

    response = client.post('/api/employee-registrations/bulk-approve', json={'registration_ids': registration_ids}, headers=admin_auth)

    assert response.status_code == 200
    assert response.get_json()['approved_count'] == 2
    with app.app_context():
        approved_rows = EmployeeRegistration.query.filter(EmployeeRegistration.id.in_(registration_ids)).all()
        assert all(row.status == 'APPROVED' for row in approved_rows)


def test_admin_audit_logs_isolation(client, admin_auth, maker_auth):
    # Admin audit trail should return admin events
    res = client.get('/api/admin/audit-logs', headers=admin_auth)
    assert res.status_code == 200
    logs = res.get_json()['audit_logs']
    assert isinstance(logs, list)

    # Maker should be blocked from admin audit logs
    res_maker = client.get('/api/admin/audit-logs', headers=maker_auth)
    assert res_maker.status_code == 403
