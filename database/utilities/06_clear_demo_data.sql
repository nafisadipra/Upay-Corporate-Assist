-- Clears all application data while preserving every table, constraint, and index.
-- Intended for a fresh test run. The operation is transactional and resets IDs.

BEGIN;

TRUNCATE TABLE
    audit_logs,
    liquidity_forecasts,
    checker_otps,
    payroll_history,
    risk_alerts,
    batch_items,
    batches,
    employee_registrations,
    employees,
    accounts,
    users,
    central_wallets,
    company_bank_accounts,
    companies
RESTART IDENTITY CASCADE;

COMMIT;
-- Destructive utility: clears application data but preserves the schema.
