from app.extensions import db
from app.models import CentralWallet, Company


def test_maker_can_create_zero_balance_sub_wallet_but_cannot_edit_balance(client, maker_auth):
    created = client.post('/api/companies/1/wallets', headers=maker_auth, json={
        'wallet_name': 'Monthly Payroll Wallet',
        'wallet_type': 'PAYROLL',
        'opening_balance': 0,
    })
    assert created.status_code == 201
    assert created.get_json()['wallet']['balance'] == 0
    assert created.get_json()['wallet']['wallet_type'] == 'PAYROLL'

    updated = client.put('/api/companies/1/wallets/1', headers=maker_auth, json={'balance': 300000})
    assert updated.status_code == 403


def test_new_wallet_cannot_create_unbacked_funds(client, admin_auth):
    response = client.post('/api/companies/1/wallets', headers=admin_auth, json={
        'wallet_name': 'Festival Bonus Wallet',
        'wallet_type': 'FESTIVAL_BONUS',
        'opening_balance': 250000,
    })
    assert response.status_code == 400


def test_maker_transfers_existing_money_between_company_wallets(client, maker_auth):
    created = client.post('/api/companies/1/wallets', headers=maker_auth, json={
        'wallet_name': 'Festival Bonus Wallet',
        'wallet_type': 'FESTIVAL_BONUS',
    })
    destination_id = created.get_json()['wallet']['id']

    transferred = client.post('/api/companies/1/wallets/transfer', headers=maker_auth, json={
        'source_wallet_id': 1,
        'destination_wallet_id': destination_id,
        'amount': 250000,
    })
    assert transferred.status_code == 200
    payload = transferred.get_json()
    assert payload['source_wallet']['balance'] == 4750000.0
    assert payload['destination_wallet']['balance'] == 250000.0
    assert payload['company']['central_wallet_balance'] == 5000000.0


def test_wallet_transfer_rejects_overdraft_without_moving_money(client, maker_auth):
    created = client.post('/api/companies/1/wallets', headers=maker_auth, json={
        'wallet_name': 'Operations Wallet',
        'wallet_type': 'OPERATIONAL',
    })
    destination_id = created.get_json()['wallet']['id']
    response = client.post('/api/companies/1/wallets/transfer', headers=maker_auth, json={
        'source_wallet_id': 1,
        'destination_wallet_id': destination_id,
        'amount': 5000001,
    })
    assert response.status_code == 409

    wallets = client.get('/api/companies/1/wallets', headers=maker_auth).get_json()['wallets']
    balances = {wallet['id']: wallet['balance'] for wallet in wallets}
    assert balances[1] == 5000000.0
    assert balances[destination_id] == 0.0


def test_checker_cannot_transfer_wallet_funds(client, checker_auth):
    response = client.post('/api/companies/1/wallets/transfer', headers=checker_auth, json={
        'source_wallet_id': 1,
        'destination_wallet_id': 2,
        'amount': 100,
    })
    assert response.status_code == 403


def test_maker_cannot_create_a_main_wallet(client, maker_auth):
    response = client.post('/api/companies/1/wallets', headers=maker_auth, json={
        'wallet_name': 'Second Main Wallet',
        'wallet_type': 'MAIN',
    })
    assert response.status_code == 403


def test_admin_cannot_create_duplicate_main_wallet(client, admin_auth):

    duplicate_main = client.post('/api/companies/1/wallets', headers=admin_auth, json={
        'wallet_name': 'Second Main Wallet',
        'wallet_type': 'MAIN',
        'opening_balance': 0,
    })
    assert duplicate_main.status_code == 409


def test_maker_cannot_manage_another_company_wallet(client, maker_auth):
    response = client.post('/api/companies/2/wallets', headers=maker_auth, json={
        'wallet_name': 'Blocked Wallet',
        'opening_balance': 100,
    })
    assert response.status_code == 403


def test_clean_company_gets_main_from_admin_then_hr_creates_payroll_wallet(client, app, admin_auth, maker2_auth):
    with app.app_context():
        db.session.delete(db.session.get(CentralWallet, 2))
        db.session.get(Company, 2).central_wallet_balance = 0
        db.session.commit()

    funded = client.post('/api/admin/companies/2/topup', headers=admin_auth, json={'amount': 100000})
    assert funded.status_code == 200
    main_wallet = next(wallet for wallet in funded.get_json()['company']['wallets'] if wallet['wallet_type'] == 'MAIN')

    created = client.post('/api/companies/2/wallets', headers=maker2_auth, json={
        'wallet_name': 'Monthly Payroll Wallet',
        'wallet_type': 'PAYROLL',
    })
    assert created.status_code == 201
    payroll_wallet = created.get_json()['wallet']

    transferred = client.post('/api/companies/2/wallets/transfer', headers=maker2_auth, json={
        'source_wallet_id': main_wallet['id'],
        'destination_wallet_id': payroll_wallet['id'],
        'amount': 40000,
    })
    assert transferred.status_code == 200
    assert transferred.get_json()['source_wallet']['balance'] == 60000.0
    assert transferred.get_json()['destination_wallet']['balance'] == 40000.0
    assert transferred.get_json()['company']['central_wallet_balance'] == 100000.0
