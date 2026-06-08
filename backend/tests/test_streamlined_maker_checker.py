import json

def test_full_streamlined_maker_checker_workflow(client, maker_auth, checker_auth):
    # Step 1: Maker uploads payroll batch
    upload_payload = {
        'company_id': 1,
        'file_name': 'salary_august.xlsx',
        'items': [
            {'raw_phone_number': '01711112233', 'employee_name': 'Karim Rahman', 'department': 'IT', 'basic_salary': 30000.00, 'gross_salary': 45000.00},
            {'raw_phone_number': '01722223344', 'employee_name': 'Nasrin Akter', 'department': 'Finance', 'basic_salary': 35000.00, 'gross_salary': 55000.00}
        ]
    }
    res_upload = client.post('/api/batches/upload', json=upload_payload, headers=maker_auth)
    assert res_upload.status_code == 201
    batch_data = res_upload.get_json()['batch']
    batch_id = batch_data['id']
    assert batch_data['total_records'] == 2
    assert batch_data['total_amount'] == 100000.00

    # Step 2: Maker submits batch for checker review
    res_submit = client.post(f'/api/batches/{batch_id}/submit', headers=maker_auth)
    assert res_submit.status_code == 200
    assert res_submit.get_json()['batch']['status'] == 'PENDING_CHECKER_REVIEW'

    # Step 3: Segregation of Duties - Maker attempts to do Checker review (MUST FAIL)
    res_maker_review = client.post(f'/api/batches/{batch_id}/checker-review', json={
        'action': 'APPROVED_BY_CHECKER',
        'notes': 'Maker trying to self-approve'
    }, headers=maker_auth)
    assert res_maker_review.status_code == 403  # Blocked by role or SoD check

    # Step 4: Checker performs review and sign-off
    res_checker_review = client.post(f'/api/batches/{batch_id}/checker-review', json={
        'action': 'APPROVED_BY_CHECKER',
        'notes': 'All salaries verified against monthly corporate budget.'
    }, headers=checker_auth)
    assert res_checker_review.status_code == 200
    assert res_checker_review.get_json()['batch']['status'] == 'CHECKER_REVIEWED'
    assert client.get(f'/api/batches/{batch_id}/archive', headers=maker_auth).status_code == 409

    # Step 5: Maker gives final look and executes disbursal
    res_execute = client.post(f'/api/batches/{batch_id}/execute', headers=maker_auth)
    assert res_execute.status_code == 200
    exec_data = res_execute.get_json()['batch']
    assert exec_data['status'] == 'EXECUTED'

    archive = client.get(f'/api/batches/{batch_id}/archive', headers=maker_auth)
    assert archive.status_code == 200
    assert archive.mimetype == 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    assert archive.data.startswith(b'PK')
    assert 'payroll-archive-' in archive.headers['Content-Disposition']

    # Step 6: Verify company central wallet was debited atomically
    res_company = client.get('/api/companies/1', headers=maker_auth)
    # Started at 5,000,000, debited 100,000 -> 4,900,000
    assert res_company.get_json()['company']['central_wallet_balance'] == 4900000.00

    # Step 7: Attempting to execute already executed batch fails
    res_re_execute = client.post(f'/api/batches/{batch_id}/execute', headers=maker_auth)
    assert res_re_execute.status_code == 400
