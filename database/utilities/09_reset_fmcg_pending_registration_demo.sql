-- Reverts the 28 pre-approved demo employees created by script 08.
-- Use this when testing the intended Maker registration -> Upay Admin approval flow.
-- Tanvir (HR-001) and Dipra (FIN-001) are deliberately retained.

BEGIN;

DELETE FROM employees
WHERE company_id = (SELECT id FROM companies WHERE corporate_account_number = 'UPAY-FMCG-0001')
  AND employee_code ~ '^EMP-1(0[1-9]|1[0-9]|2[0-8])$';

DELETE FROM accounts
WHERE phone_number ~ '^017900000(0[1-9]|1[0-9]|2[0-8])$';

COMMIT;
-- Demo reset utility: returns FMCG employees to pending registration.
