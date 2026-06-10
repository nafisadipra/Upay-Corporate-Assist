-- Adds 28 payroll-ready demo employees to the FMCG test tenant.
-- Together with Tanvir Ahmed (HR-001) and Nafisha Dipra (FIN-001), this makes 30 active employees.
-- This script is idempotent and does not change the company wallet balance.

BEGIN;

WITH demo_employees AS (
    SELECT
        'EMP-' || (100 + employee_number)::TEXT AS employee_code,
        '017900000' || LPAD(employee_number::TEXT, 2, '0') AS phone_number,
        'FMCG Test Employee ' || LPAD(employee_number::TEXT, 2, '0') AS employee_name,
        CASE (employee_number - 1) % 4
            WHEN 0 THEN 'Sales'
            WHEN 1 THEN 'Operations'
            WHEN 2 THEN 'Finance'
            ELSE 'Distribution'
        END AS department,
        CASE (employee_number - 1) % 4
            WHEN 0 THEN 'Sales Executive'
            WHEN 1 THEN 'Operations Executive'
            WHEN 2 THEN 'Accounts Executive'
            ELSE 'Distribution Officer'
        END AS designation
    FROM generate_series(1, 28) AS employee_number
)
INSERT INTO accounts (phone_number, account_holder_name, account_status, wallet_type)
SELECT phone_number, employee_name, 'ACTIVE', 'PERSONAL'
FROM demo_employees
ON CONFLICT (phone_number) DO UPDATE
SET account_holder_name = EXCLUDED.account_holder_name,
    account_status = 'ACTIVE',
    wallet_type = 'PERSONAL';

WITH demo_employees AS (
    SELECT
        'EMP-' || (100 + employee_number)::TEXT AS employee_code,
        '017900000' || LPAD(employee_number::TEXT, 2, '0') AS phone_number,
        'FMCG Test Employee ' || LPAD(employee_number::TEXT, 2, '0') AS employee_name,
        CASE (employee_number - 1) % 4
            WHEN 0 THEN 'Sales'
            WHEN 1 THEN 'Operations'
            WHEN 2 THEN 'Finance'
            ELSE 'Distribution'
        END AS department,
        CASE (employee_number - 1) % 4
            WHEN 0 THEN 'Sales Executive'
            WHEN 1 THEN 'Operations Executive'
            WHEN 2 THEN 'Accounts Executive'
            ELSE 'Distribution Officer'
        END AS designation
    FROM generate_series(1, 28) AS employee_number
)
INSERT INTO employees (company_id, employee_code, phone_number, employee_name, department, designation, status, completed_cycles)
SELECT
    (SELECT id FROM companies WHERE corporate_account_number = 'UPAY-FMCG-0001'),
    employee_code,
    phone_number,
    employee_name,
    department,
    designation,
    'ACTIVE',
    0
FROM demo_employees
ON CONFLICT (company_id, phone_number) DO UPDATE
SET employee_code = EXCLUDED.employee_code,
    employee_name = EXCLUDED.employee_name,
    department = EXCLUDED.department,
    designation = EXCLUDED.designation,
    status = 'ACTIVE';

COMMIT;
-- Optional seed: FMCG payroll-ready employees.
