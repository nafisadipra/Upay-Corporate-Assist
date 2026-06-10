-- =============================================================================
-- upay Corporate Assist - PostgreSQL Performance Indexes Script
-- Database Name: upay_corporate_assist
-- Engine: PostgreSQL (Version 12+)
-- Author: Nafisha Anzum Dipra
-- =============================================================================

-- 1. Indexes for Core MFS Account Lookups (Sub-millisecond validation queries)
CREATE INDEX IF NOT EXISTS idx_accounts_phone ON accounts(phone_number);
CREATE INDEX IF NOT EXISTS idx_accounts_status ON accounts(account_status);

-- 2. Indexes for HR Employee Roster Reconciliation (Ghost Employee Prevention)
CREATE INDEX IF NOT EXISTS idx_employees_company_phone ON employees(company_id, phone_number);
CREATE INDEX IF NOT EXISTS idx_employees_status ON employees(company_id, status);

-- 3. Indexes for Central Wallet Balance & Funding Queries
CREATE INDEX IF NOT EXISTS idx_central_wallets_company ON central_wallets(company_id);
CREATE INDEX IF NOT EXISTS idx_company_bank_accounts_company ON company_bank_accounts(company_id);

-- 4. Indexes for Batch Header Workflow & Dashboard Filters
CREATE INDEX IF NOT EXISTS idx_batches_company ON batches(company_id);
CREATE INDEX IF NOT EXISTS idx_batches_maker ON batches(maker_id);
CREATE INDEX IF NOT EXISTS idx_batches_checker ON batches(checker_id);
CREATE INDEX IF NOT EXISTS idx_batches_status ON batches(status);
CREATE INDEX IF NOT EXISTS idx_batches_company_payroll_period ON batches(company_id, payroll_period);

-- 5. Indexes for Batch Items Validation Grid & Anomaly Filters
CREATE INDEX IF NOT EXISTS idx_batch_items_batch ON batch_items(batch_id);
CREATE INDEX IF NOT EXISTS idx_batch_items_employee ON batch_items(employee_id);
CREATE INDEX IF NOT EXISTS idx_batch_items_validation ON batch_items(account_validation_status);
CREATE INDEX IF NOT EXISTS idx_batch_items_anomaly ON batch_items(is_anomaly);
CREATE INDEX IF NOT EXISTS idx_batch_items_baseline ON batch_items(baseline_status);

-- 6. Indexes for Risk Alerts & Checker Review Audits
CREATE INDEX IF NOT EXISTS idx_risk_alerts_item ON risk_alerts(batch_item_id);
CREATE INDEX IF NOT EXISTS idx_risk_alerts_status ON risk_alerts(review_status);

-- 7. Indexes for AI Feature Extraction (Isolation Forest 6-Month Baseline Lookups)
CREATE INDEX IF NOT EXISTS idx_payroll_history_lookup ON payroll_history(company_id, phone_number, disbursement_date);
CREATE INDEX IF NOT EXISTS idx_payroll_history_dept ON payroll_history(company_id, department);

-- 8. Indexes for Predictive Liquidity Forecasts
CREATE INDEX IF NOT EXISTS idx_liquidity_forecasts_company ON liquidity_forecasts(company_id, forecast_period);
CREATE INDEX IF NOT EXISTS idx_forecast_runs_company_created ON forecast_runs(company_id, completed_at DESC);
CREATE INDEX IF NOT EXISTS idx_forecast_run_results_run ON forecast_run_results(forecast_run_id);
CREATE INDEX IF NOT EXISTS idx_forecast_alerts_company_status ON forecast_alerts(company_id, review_status);

-- 9. Indexes for Audit Logs & Regulatory Compliance Queries
CREATE INDEX IF NOT EXISTS idx_audit_logs_batch ON audit_logs(batch_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_user ON audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created ON audit_logs(created_at);
-- PostgreSQL indexes for fresh database installations.
