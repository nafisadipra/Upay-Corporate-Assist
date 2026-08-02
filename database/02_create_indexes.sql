-- =============================================================================
-- upay Corporate Assist - PostgreSQL Performance Indexes Script
-- Database Name: upay_corporate_assist
-- Author: Nafisha Anzum Dipra
-- =============================================================================

-- Index for instant bulk phone number validation query (Core Database Verification)
CREATE INDEX idx_accounts_phone ON accounts(phone_number);
CREATE INDEX idx_accounts_status ON accounts(account_status);

-- Indexes for Batch Processing and UI Filters
CREATE INDEX idx_batches_company ON batches(company_id);
CREATE INDEX idx_batches_maker ON batches(maker_id);
CREATE INDEX idx_batches_checker ON batches(checker_id);
CREATE INDEX idx_batches_status ON batches(status);

-- Indexes for Batch Items Validation and Risk Filtering
CREATE INDEX idx_batch_items_batch ON batch_items(batch_id);
CREATE INDEX idx_batch_items_validation ON batch_items(account_validation_status);
CREATE INDEX idx_batch_items_anomaly ON batch_items(is_anomaly);

-- Index for AI Feature Extraction (Isolation Forest 6-Month History Lookups)
CREATE INDEX idx_payroll_history_lookup ON payroll_history(company_id, phone_number, disbursement_date);
CREATE INDEX idx_payroll_history_dept ON payroll_history(company_id, department);

-- Index for Audit Logs & Regulatory Compliance Queries
CREATE INDEX idx_audit_logs_batch ON audit_logs(batch_id);
CREATE INDEX idx_audit_logs_user ON audit_logs(user_id);
CREATE INDEX idx_audit_logs_created ON audit_logs(created_at);
