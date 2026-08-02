-- =============================================================================
-- upay Corporate Assist - Seed Data Script
-- Database Name: upay_corporate_assist
-- Author: Nafisha Anzum Dipra
-- =============================================================================

-- 1. Insert Corporate Clients (Companies)
INSERT INTO companies (company_name, corporate_account_number, central_wallet_balance, status) VALUES
('PRAN-RFL Group', 'UPAY-CORP-PRAN-1001', 5000000.00, 'ACTIVE'),
('UCB Investment Limited', 'UPAY-CORP-UCBI-1002', 12000000.00, 'ACTIVE');

-- 2. Insert Users (Makers, Checkers, Admins)
-- Password Hash mock value: $2b$12$MockHashForDemoPurposesOnly
INSERT INTO users (company_id, full_name, email, phone_number, password_hash, role, status) VALUES
(1, 'Tanvir Ahmed', 'maker.tanvir@pran.com', '01711000001', '$2b$12$MockHashForDemoPurposesOnly', 'MAKER', 'ACTIVE'),
(1, 'Nafisha Dipra', 'checker.dipra@pran.com', '01711000002', '$2b$12$MockHashForDemoPurposesOnly', 'CHECKER', 'ACTIVE'),
(2, 'Rahim Chowdhury', 'maker.rahim@ucbi.com', '01811000003', '$2b$12$MockHashForDemoPurposesOnly', 'MAKER', 'ACTIVE'),
(2, 'Corporate Admin', 'admin@upay.com.bd', '01911000000', '$2b$12$MockHashForDemoPurposesOnly', 'ADMIN', 'ACTIVE');

-- 3. Insert Core upay Accounts (Mock MFS Core Database to test validation)
INSERT INTO accounts (phone_number, account_holder_name, account_status, wallet_type) VALUES
('01711112233', 'Kazi Anisur Rahman', 'ACTIVE', 'PERSONAL'),
('01722223344', 'Sultana Razia', 'ACTIVE', 'PERSONAL'),
('01733334455', 'Mohammad Ali', 'ACTIVE', 'PERSONAL'),
('01744445566', 'Farhana Yasmin', 'ACTIVE', 'PERSONAL'),
('01755556677', 'Imtiaz Hossain', 'INACTIVE', 'PERSONAL'), -- Test inactive account
('01811112233', 'Mahmudul Hasan', 'ACTIVE', 'PERSONAL'),
('01822223344', 'Nusrat Jahan', 'ACTIVE', 'PERSONAL'),
('01833334455', 'Abdur Rashid', 'ACTIVE', 'PERSONAL');

-- Note: '01799998877' is intentionally left out of accounts to test 'UNREGISTERED_ACCOUNT'
-- Note: '0171111' is intentionally short to test 'INVALID_LENGTH'

-- 4. Insert 6-Month Historical Payout Data for PRAN-RFL Group
-- Used by AI engine for Isolation Forest anomaly baseline calculation
INSERT INTO payroll_history (company_id, phone_number, employee_name, department, disbursement_date, amount, six_month_avg_amount, dept_avg_amount, wallet_type) VALUES
(1, '01711112233', 'Kazi Anisur Rahman', 'Engineering', '2026-02-01', 35000.00, 35000.00, 38000.00, 'SALARY'),
(1, '01711112233', 'Kazi Anisur Rahman', 'Engineering', '2026-03-01', 35000.00, 35000.00, 38000.00, 'SALARY'),
(1, '01711112233', 'Kazi Anisur Rahman', 'Engineering', '2026-04-01', 35000.00, 35000.00, 38000.00, 'SALARY'),
(1, '01711112233', 'Kazi Anisur Rahman', 'Engineering', '2026-05-01', 35000.00, 35000.00, 38000.00, 'SALARY'),
(1, '01711112233', 'Kazi Anisur Rahman', 'Engineering', '2026-06-01', 35000.00, 35000.00, 38000.00, 'SALARY'),
(1, '01711112233', 'Kazi Anisur Rahman', 'Engineering', '2026-07-01', 35000.00, 35000.00, 38000.00, 'SALARY'),

(1, '01722223344', 'Sultana Razia', 'Accounts', '2026-02-01', 42000.00, 42000.00, 45000.00, 'SALARY'),
(1, '01722223344', 'Sultana Razia', 'Accounts', '2026-03-01', 42000.00, 42000.00, 45000.00, 'SALARY'),
(1, '01722223344', 'Sultana Razia', 'Accounts', '2026-04-01', 42000.00, 42000.00, 45000.00, 'SALARY'),
(1, '01722223344', 'Sultana Razia', 'Accounts', '2026-05-01', 42000.00, 42000.00, 45000.00, 'SALARY'),
(1, '01722223344', 'Sultana Razia', 'Accounts', '2026-06-01', 42000.00, 42000.00, 45000.00, 'SALARY'),
(1, '01722223344', 'Sultana Razia', 'Accounts', '2026-07-01', 42000.00, 42000.00, 45000.00, 'SALARY');

-- 5. Insert Sample Batch Upload (Uploaded by Maker Tanvir)
INSERT INTO batches (company_id, maker_id, checker_id, file_name, total_records, valid_records, invalid_records, flagged_anomalies, total_amount, status) VALUES
(1, 1, 2, 'PRAN_Payroll_August_2026.xlsx', 5, 3, 2, 1, 447000.00, 'FLAGGED_RISK');

-- 6. Insert Batch Items (Demonstrating red grid typos and orange AI anomaly alerts)
INSERT INTO batch_items (batch_id, raw_phone_number, corrected_phone_number, employee_name, department, amount, wallet_type, account_validation_status, anomaly_score, is_anomaly, anomaly_reason, item_status) VALUES
-- Item 1: Valid Normal Record
(1, '01711112233', NULL, 'Kazi Anisur Rahman', 'Engineering', 35000.00, 'SALARY', 'VALID', 0.1250, FALSE, NULL, 'PENDING'),

-- Item 2: Valid Phone but AI Anomaly Detected! (Normal is 35k, uploaded as 300,000 BDT out of season)
(1, '01722223344', NULL, 'Sultana Razia', 'Accounts', 300000.00, 'BONUS', 'VALID', -0.6842, TRUE, 'High variance: 300,000 BDT deviates significantly from 6-month avg (42,000 BDT)', 'PENDING'),

-- Item 3: Valid Normal Record
(1, '01733334455', NULL, 'Mohammad Ali', 'Operations', 40000.00, 'SALARY', 'VALID', 0.0820, FALSE, NULL, 'PENDING'),

-- Item 4: Account Typo / Unregistered Number (Triggers RED highlight in Bento Grid)
(1, '01799998877', NULL, 'New Worker', 'Factory', 37000.00, 'SALARY', 'UNREGISTERED_ACCOUNT', NULL, FALSE, 'Account does not exist on upay MFS platform', 'PENDING'),

-- Item 5: Inactive Account (Triggers RED highlight in Bento Grid)
(1, '01755556677', NULL, 'Imtiaz Hossain', 'Logistics', 35000.00, 'SALARY', 'INACTIVE_ACCOUNT', NULL, FALSE, 'Account is currently suspended/inactive', 'PENDING');

-- 7. Insert Audit Log Entries (Bangladesh Bank Compliance Audit Trail)
INSERT INTO audit_logs (batch_id, user_id, action, details) VALUES
(1, 1, 'BATCH_UPLOADED', '{"file_name": "PRAN_Payroll_August_2026.xlsx", "total_records": 5, "total_amount": 447000.00}'),
(1, 1, 'CORE_ACCOUNT_VERIFICATION', '{"valid_records": 3, "invalid_records": 2, "invalid_phones": ["01799998877", "01755556677"]}'),
(1, 1, 'AI_RISK_SCREENING_COMPLETED', '{"algorithm": "IsolationForest", "flagged_anomalies": 1, "anomaly_item_ids": [2]}');
