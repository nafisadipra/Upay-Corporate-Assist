def test_insufficient_wallet_balance_rejection(client, maker_auth, checker_auth):
    # Upload a huge batch exceeding wallet balance (5,000,000)
    upload_payload = {
        'company_id': 1,
        'file_name': 'huge_bonus.xlsx',
        'items': [
            {'raw_phone_number': '01711112233', 'employee_name': 'Karim Rahman', 'department': 'IT', 'basic_salary': 6000000.00, 'gross_salary': 9000000.00}
        ]
    }
    res_upload = client.post('/api/batches/upload', json=upload_payload, headers=maker_auth)
    assert res_upload.status_code == 201
    batch_id = res_upload.get_json()['batch']['id']

    # Submit
    client.post(f'/api/batches/{batch_id}/submit', headers=maker_auth)

    # Resolve the intentional high-value anomaly, then Checker approves the batch.
    alerts = client.get(f'/api/risk-alerts?batch_id={batch_id}', headers=checker_auth).get_json()['risk_alerts']
    for alert in alerts:
        review = client.put(
            f"/api/risk-alerts/{alert['id']}/review",
            json={'action': 'OVERRIDDEN_BY_CHECKER', 'notes': 'Approved after high-value payout review.'},
            headers=checker_auth,
        )
        assert review.status_code == 200
    client.post(f'/api/batches/{batch_id}/checker-review', json={'action': 'APPROVED_BY_CHECKER'}, headers=checker_auth)

    # Maker tries to execute -> MUST FAIL due to insufficient float
    res_exec = client.post(f'/api/batches/{batch_id}/execute', headers=maker_auth)
    assert res_exec.status_code == 400
    assert 'insufficient' in res_exec.get_json()['error'].lower()

    # Verify wallet was not debited
    comp = client.get('/api/companies/1', headers=maker_auth).get_json()['company']
    assert comp['central_wallet_balance'] == 5000000.00
