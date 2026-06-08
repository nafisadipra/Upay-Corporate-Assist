def test_maker_can_create_and_update_own_company_wallet(client, maker_auth):
    created = client.post('/api/companies/1/wallets', headers=maker_auth, json={
        'wallet_name': 'Festival Bonus Wallet',
        'wallet_type': 'FESTIVAL_BONUS',
        'opening_balance': 250000,
    })
    assert created.status_code == 201
    wallet = created.get_json()['wallet']
    assert wallet['balance'] == 250000.0

    updated = client.put(f"/api/companies/1/wallets/{wallet['id']}", headers=maker_auth, json={'balance': 300000})
    assert updated.status_code == 200
    assert updated.get_json()['wallet']['balance'] == 300000.0


def test_maker_cannot_manage_another_company_wallet(client, maker_auth):
    response = client.post('/api/companies/2/wallets', headers=maker_auth, json={
        'wallet_name': 'Blocked Wallet',
        'opening_balance': 100,
    })
    assert response.status_code == 403
