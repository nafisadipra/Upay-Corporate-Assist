-- Creates the minimum clean tenant needed to test the Maker -> Checker workflow.
-- It preserves the existing user passwords and creates no payroll, employee, or demo data.

BEGIN;

INSERT INTO companies (company_name, corporate_account_number, central_wallet_balance, status)
VALUES ('FMCG Corporate Test Company', 'UPAY-FMCG-0001', 5000000.00, 'ACTIVE')
ON CONFLICT (corporate_account_number) DO NOTHING;

INSERT INTO central_wallets (company_id, wallet_name, account_number, balance, wallet_type, status)
SELECT id, 'Main Payroll Wallet', 'UPAY-FMCG-0001-MAIN', 5000000.00, 'MAIN', 'ACTIVE'
FROM companies
WHERE corporate_account_number = 'UPAY-FMCG-0001'
ON CONFLICT (account_number) DO NOTHING;

UPDATE users
SET company_id = (SELECT id FROM companies WHERE corporate_account_number = 'UPAY-FMCG-0001'),
    full_name = 'Tanvir Ahmed',
    role = 'MAKER',
    status = 'ACTIVE'
WHERE email = 'hr.tanvir@fmcg-corp.com';

UPDATE users
SET company_id = (SELECT id FROM companies WHERE corporate_account_number = 'UPAY-FMCG-0001'),
    full_name = 'Nafisha Dipra',
    role = 'CHECKER',
    status = 'ACTIVE'
WHERE email = 'finance.dipra@fmcg-corp.com';

UPDATE users
SET company_id = NULL,
    full_name = 'Upay Admin',
    role = 'ADMIN',
    status = 'ACTIVE'
WHERE email = 'admin@upay.com.bd';

-- HR and Finance users are also approved company employees with active personal
-- Upay wallet accounts, so they can be included in payroll uploads.
INSERT INTO accounts (phone_number, account_holder_name, account_status, wallet_type)
SELECT phone_number, full_name, 'ACTIVE', 'PERSONAL'
FROM users
WHERE email IN ('hr.tanvir@fmcg-corp.com', 'finance.dipra@fmcg-corp.com')
ON CONFLICT (phone_number) DO UPDATE
SET account_holder_name = EXCLUDED.account_holder_name,
    account_status = 'ACTIVE',
    wallet_type = 'PERSONAL';

INSERT INTO employees (company_id, employee_code, phone_number, employee_name, department, designation, status, completed_cycles)
SELECT
    (SELECT id FROM companies WHERE corporate_account_number = 'UPAY-FMCG-0001'),
    CASE WHEN email = 'hr.tanvir@fmcg-corp.com' THEN 'HR-001' ELSE 'FIN-001' END,
    phone_number,
    full_name,
    CASE WHEN email = 'hr.tanvir@fmcg-corp.com' THEN 'Human Resources' ELSE 'Finance' END,
    CASE WHEN email = 'hr.tanvir@fmcg-corp.com' THEN 'HR Officer' ELSE 'Finance Director' END,
    'ACTIVE',
    0
FROM users
WHERE email IN ('hr.tanvir@fmcg-corp.com', 'finance.dipra@fmcg-corp.com')
ON CONFLICT (company_id, phone_number) DO UPDATE
SET employee_code = EXCLUDED.employee_code,
    employee_name = EXCLUDED.employee_name,
    department = EXCLUDED.department,
    designation = EXCLUDED.designation,
    status = 'ACTIVE';

COMMIT;
-- Optional seed: clean FMCG workflow test tenant.
