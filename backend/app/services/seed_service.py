import os
from datetime import datetime
from decimal import Decimal
from werkzeug.security import generate_password_hash
from app.extensions import db
from app.models import (
    Company, CompanyBankAccount, CentralWallet, User, Account, Employee,
    Batch, BatchItem, RiskAlert, PayrollHistory, LiquidityForecast, AuditLog
)

from sqlalchemy import text

def seed_database():
    """Seeds the database with realistic demo data matching database/seeds/03_insert_seed_data.sql."""
    db.create_all()

    # Automatically synchronize schema for existing databases
    statements = [
        # companies
        'ALTER TABLE companies ADD COLUMN IF NOT EXISTS central_wallet_balance NUMERIC(15, 2) DEFAULT 0.00',
        'ALTER TABLE companies ADD COLUMN IF NOT EXISTS status VARCHAR(20) DEFAULT \'ACTIVE\'',
        
        # employees
        'ALTER TABLE employees ADD COLUMN IF NOT EXISTS employee_code VARCHAR(50)',
        'ALTER TABLE employees ADD COLUMN IF NOT EXISTS designation VARCHAR(100)',
        'ALTER TABLE employees ADD COLUMN IF NOT EXISTS department VARCHAR(50)',
        'ALTER TABLE employees ADD COLUMN IF NOT EXISTS status VARCHAR(20) DEFAULT \'ACTIVE\'',
        'ALTER TABLE employees ADD COLUMN IF NOT EXISTS completed_cycles INTEGER DEFAULT 0',

        # batches
        'ALTER TABLE batches ADD COLUMN IF NOT EXISTS checker_notes VARCHAR(500)',
        'ALTER TABLE batches ADD COLUMN IF NOT EXISTS checker_reviewed_at TIMESTAMP',
        'ALTER TABLE batches ADD COLUMN IF NOT EXISTS executed_at TIMESTAMP',

        # batch_items
        'ALTER TABLE batch_items ADD COLUMN IF NOT EXISTS corrected_phone_number VARCHAR(20)',
        'ALTER TABLE batch_items ADD COLUMN IF NOT EXISTS baseline_status VARCHAR(30) DEFAULT \'VERIFIED\'',
        'ALTER TABLE batch_items ADD COLUMN IF NOT EXISTS anomaly_score NUMERIC(8, 4)',
        'ALTER TABLE batch_items ADD COLUMN IF NOT EXISTS is_anomaly BOOLEAN DEFAULT FALSE',
        'ALTER TABLE batch_items ADD COLUMN IF NOT EXISTS anomaly_reason TEXT',
        'ALTER TABLE batch_items ADD COLUMN IF NOT EXISTS item_status VARCHAR(30) DEFAULT \'PENDING\'',

        # risk_alerts
        'ALTER TABLE risk_alerts ADD COLUMN IF NOT EXISTS review_notes TEXT',
        'ALTER TABLE risk_alerts ADD COLUMN IF NOT EXISTS reviewed_by INTEGER',

        # audit_logs
        'ALTER TABLE audit_logs ADD COLUMN IF NOT EXISTS company_id INTEGER',
        'ALTER TABLE audit_logs ADD COLUMN IF NOT EXISTS audit_scope VARCHAR(30) DEFAULT \'CORPORATE_CLIENT\'',
    ]
    for s in statements:
        try:
            db.session.execute(text(s))
        except Exception:
            pass
    db.session.commit()


    if Company.query.first():
        print("Database already contains data. Skipping seed.")
        return


    seed_password = os.environ.get('DEMO_SEED_PASSWORD')
    if not seed_password:
        raise RuntimeError('DEMO_SEED_PASSWORD must be set to seed local demonstration accounts.')

    print("Seeding database with demonstration data...")

    # 1. Companies
    c1 = Company(id=1, company_name='Leading FMCG Conglomerate (PRAN-RFL Alignment)', corporate_account_number='UPAY-CORP-FMCG-1001', central_wallet_balance=5000000.00, status='ACTIVE')
    c2 = Company(id=2, company_name='Investment Management Firm (UCB Alignment)', corporate_account_number='UPAY-CORP-INVST-1002', central_wallet_balance=12000000.00, status='ACTIVE')
    db.session.add_all([c1, c2])
    db.session.commit()

    # 2. Corporate Bank Accounts (from which companies disburse funds)
    ba1 = CompanyBankAccount(id=1, company_id=1, bank_name='United Commercial Bank PLC (UCB)', branch_name='Corporate Head Office Branch, Dhaka', account_name='PRAN-RFL FMCG Corporate Payout A/C', account_number='0951101000012345', routing_number='245260951', account_type='CURRENT', status='ACTIVE', is_primary=True)
    ba2 = CompanyBankAccount(id=2, company_id=1, bank_name='City Bank PLC', branch_name='Gulshan Avenue Branch', account_name='PRAN FMCG Operational Float', account_number='1101889922001', routing_number='225271101', account_type='SETTLEMENT', status='ACTIVE', is_primary=False)
    ba3 = CompanyBankAccount(id=3, company_id=2, bank_name='United Commercial Bank PLC (UCB)', branch_name='Principal Branch, Motijheel', account_name='UCB Capital Investment Escrow', account_number='0951101000099887', routing_number='245260951', account_type='CURRENT', status='ACTIVE', is_primary=True)
    db.session.add_all([ba1, ba2, ba3])

    # 3. Central Wallets
    w1 = CentralWallet(id=1, company_id=1, wallet_name='Main Payroll Wallet', account_number='CW-FMCG-PAYROLL-01', balance=4500000.00, wallet_type='MAIN')
    w2 = CentralWallet(id=2, company_id=1, wallet_name='Festival Bonus Wallet', account_number='CW-FMCG-BONUS-02', balance=500000.00, wallet_type='FESTIVAL_BONUS')
    w3 = CentralWallet(id=3, company_id=2, wallet_name='Corporate Disbursement Wallet', account_number='CW-INVST-MAIN-01', balance=12000000.00, wallet_type='MAIN')
    db.session.add_all([w1, w2, w3])

    # 4. Users
    pwd = generate_password_hash(seed_password)
    u1 = User(id=1, company_id=1, full_name='Tanvir Ahmed', email='maker.tanvir@fmcg-corp.com', phone_number='01711000001', password_hash=pwd, role='MAKER')
    u2 = User(id=2, company_id=1, full_name='Nafisha Dipra', email='checker.dipra@fmcg-corp.com', phone_number='01711000002', password_hash=pwd, role='CHECKER')
    u3 = User(id=3, company_id=2, full_name='Rahim Chowdhury', email='maker.rahim@invest-corp.com', phone_number='01811000003', password_hash=pwd, role='MAKER')
    u4 = User(id=4, company_id=None, full_name='Corporate Admin', email='admin@upay.com.bd', phone_number='01911000000', password_hash=pwd, role='ADMIN')
    db.session.add_all([u1, u2, u3, u4])

    # 5. Core MFS Accounts
    accs = [
        Account(phone_number='01711112233', account_holder_name='Kazi Anisur Rahman', account_status='ACTIVE'),
        Account(phone_number='01722223344', account_holder_name='Sultana Razia', account_status='ACTIVE'),
        Account(phone_number='01733334455', account_holder_name='Mohammad Ali', account_status='ACTIVE'),
        Account(phone_number='01744445566', account_holder_name='Rahul Roy (New Hire)', account_status='ACTIVE'),
        Account(phone_number='01755556677', account_holder_name='Imtiaz Hossain', account_status='INACTIVE'),
        Account(phone_number='01811112233', account_holder_name='Mahmudul Hasan', account_status='ACTIVE'),
        Account(phone_number='01822223344', account_holder_name='Nusrat Jahan', account_status='ACTIVE'),
        Account(phone_number='01833334455', account_holder_name='External Individual (Abdur Rashid)', account_status='ACTIVE')
    ]
    db.session.add_all(accs)

    # 6. HR Approved Employee Roster
    emps = [
        Employee(id=1, company_id=1, employee_code='EMP-1001', phone_number='01711112233', employee_name='Kazi Anisur Rahman', department='Engineering', designation='Lead Software Engineer', completed_cycles=6),
        Employee(id=2, company_id=1, employee_code='EMP-1002', phone_number='01722223344', employee_name='Sultana Razia', department='Accounts', designation='Senior Accountant', completed_cycles=6),
        Employee(id=3, company_id=1, employee_code='EMP-1003', phone_number='01733334455', employee_name='Mohammad Ali', department='Operations', designation='Operations Manager', completed_cycles=6),
        Employee(id=4, company_id=1, employee_code='EMP-1004', phone_number='01755556677', employee_name='Imtiaz Hossain', department='Logistics', designation='Fleet Supervisor', completed_cycles=6),
        Employee(id=5, company_id=1, employee_code='EMP-1005', phone_number='01744445566', employee_name='Rahul Roy (New Hire)', department='Engineering', designation='Junior QA Engineer', completed_cycles=0)
    ]
    db.session.add_all(emps)

    # 7. Payroll History
    dates = [datetime(2026, 2, 1), datetime(2026, 3, 1), datetime(2026, 4, 1), datetime(2026, 5, 1), datetime(2026, 6, 1), datetime(2026, 7, 1)]
    hist = []
    for d in dates:
        hist.append(PayrollHistory(company_id=1, phone_number='01711112233', employee_name='Kazi Anisur Rahman', department='Engineering', disbursement_date=d, basic_salary=21000.00, gross_salary=35000.00, six_month_avg_amount=35000.00, dept_avg_amount=38000.00))
        hist.append(PayrollHistory(company_id=1, phone_number='01722223344', employee_name='Sultana Razia', department='Accounts', disbursement_date=d, basic_salary=25200.00, gross_salary=42000.00, six_month_avg_amount=42000.00, dept_avg_amount=45000.00))
    db.session.add_all(hist)

    # 8. Sample Batch Header
    b1 = Batch(id=1, company_id=1, maker_id=1, checker_id=2, file_name='FMCG_Payroll_August_2026.xlsx', total_records=6, valid_records=3, invalid_records=3, flagged_anomalies=3, total_amount=498000.00, status='FLAGGED_RISK')
    db.session.add(b1)
    db.session.commit()

    # 9. Batch Items
    items = [
        BatchItem(id=1, batch_id=1, employee_id=1, raw_phone_number='01711112233', employee_name='Kazi Anisur Rahman', department='Engineering', basic_salary=21000.00, gross_salary=35000.00, account_validation_status='VALID', baseline_status='VERIFIED', anomaly_score=0.1250, is_anomaly=False, item_status='PENDING'),
        BatchItem(id=2, batch_id=1, employee_id=2, raw_phone_number='01722223344', employee_name='Sultana Razia', department='Accounts', basic_salary=180000.00, gross_salary=300000.00, account_validation_status='VALID', baseline_status='VERIFIED', anomaly_score=-0.6842, is_anomaly=True, anomaly_reason='Unusual Variance: 300,000 BDT deviates significantly from 6-month individual avg (42,000 BDT)', item_status='PENDING'),
        BatchItem(id=3, batch_id=1, employee_id=None, raw_phone_number='01833334455', employee_name='Abdur Rashid', department='External', basic_salary=15000.00, gross_salary=25000.00, account_validation_status='UNRECOGNIZED_PAYEE', baseline_status='VERIFIED', anomaly_score=-0.4500, is_anomaly=True, anomaly_reason='Roster Mismatch: Active upay phone number is absent from corporate HR roster', item_status='PENDING'),
        BatchItem(id=4, batch_id=1, employee_id=None, raw_phone_number='01799998877', employee_name='New Worker', department='Factory', basic_salary=22200.00, gross_salary=37000.00, account_validation_status='UNREGISTERED_ACCOUNT', baseline_status='VERIFIED', is_anomaly=False, anomaly_reason='Account does not exist on upay MFS platform', item_status='PENDING'),
        BatchItem(id=5, batch_id=1, employee_id=4, raw_phone_number='01755556677', employee_name='Imtiaz Hossain', department='Logistics', basic_salary=21000.00, gross_salary=35000.00, account_validation_status='INACTIVE_ACCOUNT', baseline_status='VERIFIED', is_anomaly=False, anomaly_reason='Account is currently suspended/inactive', item_status='PENDING'),
        BatchItem(id=6, batch_id=1, employee_id=5, raw_phone_number='01744445566', employee_name='Rahul Roy (New Hire)', department='Engineering', basic_salary=39000.00, gross_salary=65000.00, account_validation_status='VALID', baseline_status='BASELINE_PENDING', anomaly_score=-0.3120, is_anomaly=True, anomaly_reason='Baseline Pending: New employee (<3 cycles). Flagged against Engineering Dept avg (38,000 BDT)', item_status='PENDING')
    ]
    db.session.add_all(items)

    # 10. Risk Alerts
    alerts = [
        RiskAlert(id=1, batch_item_id=2, flag_type='UNUSUAL_VARIANCE', severity='HIGH', review_status='PENDING_REVIEW', review_notes='Requires Finance Director sign-off due to high bonus payout amount.'),
        RiskAlert(id=2, batch_item_id=3, flag_type='ROSTER_MISMATCH', severity='CRITICAL', review_status='PENDING_REVIEW', review_notes='Ghost employee prevention: payee phone number is absent from corporate HR roster.'),
        RiskAlert(id=3, batch_item_id=6, flag_type='UNUSUAL_VARIANCE', severity='MEDIUM', review_status='PENDING_REVIEW', review_notes='First-cycle payout baseline pending comparison against department average.')
    ]
    db.session.add_all(alerts)

    # 11. Liquidity Forecasts
    f1 = LiquidityForecast(company_id=1, forecast_period='SEPTEMBER_2026', predicted_amount=5200000.00, confidence_score=0.96)
    f2 = LiquidityForecast(company_id=1, forecast_period='OCTOBER_2026', predicted_amount=4850000.00, confidence_score=0.94)
    db.session.add_all([f1, f2])

    # 12. Audit Logs
    a1 = AuditLog(company_id=1, batch_id=1, user_id=1, audit_scope='CORPORATE_CLIENT', action='BATCH_UPLOADED', details={'file_name': 'FMCG_Payroll_August_2026.xlsx', 'total_records': 6, 'total_amount': 498000.00})
    a2 = AuditLog(company_id=1, batch_id=1, user_id=1, audit_scope='CORPORATE_CLIENT', action='CORE_ACCOUNT_VERIFICATION', details={'valid_records': 3, 'invalid_records': 3})
    a3 = AuditLog(company_id=1, batch_id=1, user_id=1, audit_scope='CORPORATE_CLIENT', action='AI_RISK_SCREENING_COMPLETED', details={'algorithm': 'IsolationForest', 'flagged_anomalies': 3})
    a4 = AuditLog(company_id=1, user_id=4, audit_scope='UPAY_ADMIN', action='UPAY_ADMIN_COMPANY_ONBOARDED', details={'company_name': 'Leading FMCG Conglomerate', 'opening_balance': 5000000.00})
    a5 = AuditLog(company_id=1, user_id=4, audit_scope='UPAY_ADMIN', action='UPAY_ADMIN_BANK_ACCOUNT_ADDED', details={'bank_name': 'United Commercial Bank PLC (UCB)', 'account_number': '0951101000012345'})
    db.session.add_all([a1, a2, a3, a4, a5])

    c1.sync_balance()
    c2.sync_balance()

    db.session.commit()
    print("Database seeding completed successfully!")
