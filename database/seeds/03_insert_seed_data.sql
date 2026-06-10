-- =============================================================================
-- upay Corporate Assist - Seed Data Script
-- Database Name: upay_corporate_assist
-- Engine: PostgreSQL (Version 12+)
-- Author: Nafisha Anzum Dipra
-- Description: Comprehensive seed data populating all 12 schema tables, demonstrating
--              Bento Grid validation errors (red), AI anomaly alerts (orange),
--              HR roster reconciliation (UNRECOGNIZED_PAYEE), cold-start handling
--              (BASELINE_PENDING), and predictive liquidity forecasting.
-- =============================================================================

-- 1. Insert Corporate Clients (Companies - Anonymized per pp2 Section 5)
INSERT INTO companies (company_name, corporate_account_number, central_wallet_balance, status) VALUES
('Leading FMCG Conglomerate (PRAN-RFL Alignment)', 'UPAY-CORP-FMCG-1001', 5000000.00, 'ACTIVE'),
('Investment Management Firm (UCB Alignment)', 'UPAY-CORP-INVST-1002', 12000000.00, 'ACTIVE');

-- 2. Insert Central Wallets (Per ERD Entity Model)
INSERT INTO central_wallets (company_id, wallet_name, account_number, balance, wallet_type, status) VALUES
(1, 'Main Payroll Wallet', 'CW-FMCG-PAYROLL-01', 4500000.00, 'MAIN', 'ACTIVE'),
(1, 'Festival Bonus Wallet', 'CW-FMCG-BONUS-02', 500000.00, 'FESTIVAL_BONUS', 'ACTIVE'),
(2, 'Corporate Disbursement Wallet', 'CW-INVST-MAIN-01', 12000000.00, 'MAIN', 'ACTIVE');

-- 3. Insert Users (System Roles: MAKER, CHECKER, ADMIN)
-- Password Hash mock value: $2b$12$MockHashForDemoPurposesOnly
INSERT INTO users (company_id, full_name, email, phone_number, password_hash, role, status) VALUES
(1, 'Tanvir Ahmed', 'maker.tanvir@fmcg-corp.com', '01711000001', '$2b$12$MockHashForDemoPurposesOnly', 'MAKER', 'ACTIVE'),
(1, 'Nafisha Dipra', 'checker.dipra@fmcg-corp.com', '01711000002', '$2b$12$MockHashForDemoPurposesOnly', 'CHECKER', 'ACTIVE'),
(2, 'Rahim Chowdhury', 'maker.rahim@invest-corp.com', '01811000003', '$2b$12$MockHashForDemoPurposesOnly', 'MAKER', 'ACTIVE'),
(2, 'Corporate Admin', 'admin@upay.com.bd', '01911000000', '$2b$12$MockHashForDemoPurposesOnly', 'ADMIN', 'ACTIVE');

-- 4. Insert Core upay MFS Accounts (Mock MFS Core Database to test phone verification)
INSERT INTO accounts (phone_number, account_holder_name, account_status, wallet_type) VALUES
('01711112233', 'Kazi Anisur Rahman', 'ACTIVE', 'PERSONAL'),
('01722223344', 'Sultana Razia', 'ACTIVE', 'PERSONAL'),
('01733334455', 'Mohammad Ali', 'ACTIVE', 'PERSONAL'),
('01744445566', 'Rahul Roy (New Hire)', 'ACTIVE', 'PERSONAL'),
('01755556677', 'Imtiaz Hossain', 'INACTIVE', 'PERSONAL'), -- Test inactive account
('01811112233', 'Mahmudul Hasan', 'ACTIVE', 'PERSONAL'),
('01822223344', 'Nusrat Jahan', 'ACTIVE', 'PERSONAL'),
('01833334455', 'External Individual (Abdur Rashid)', 'ACTIVE', 'PERSONAL'); -- Valid MFS account NOT on HR Roster

-- Note: '01799998877' is intentionally left out of accounts to test 'UNREGISTERED_ACCOUNT'

-- 5. Insert Corporate HR Approved Roster (Per pp2 Section 3.A for Roster Reconciliation)
INSERT INTO employees (company_id, employee_code, phone_number, employee_name, department, status, completed_cycles) VALUES
(1, 'EMP-1001', '01711112233', 'Kazi Anisur Rahman', 'Engineering', 'ACTIVE', 6),
(1, 'EMP-1002', '01722223344', 'Sultana Razia', 'Accounts', 'ACTIVE', 6),
(1, 'EMP-1003', '01733334455', 'Mohammad Ali', 'Operations', 'ACTIVE', 6),
(1, 'EMP-1004', '01755556677', 'Imtiaz Hossain', 'Logistics', 'ACTIVE', 6),
(1, 'EMP-1005', '01744445566', 'Rahul Roy (New Hire)', 'Engineering', 'ACTIVE', 0); -- New Hire: 0 completed cycles (Tests BASELINE_PENDING)

-- Note: '01833334455' is intentionally missing from HR roster to test 'UNRECOGNIZED_PAYEE'

-- 6. Insert 6-Month Historical Payout Data for Company 1
-- Used by AI engine for Isolation Forest anomaly baseline calculation
INSERT INTO payroll_history (company_id, phone_number, employee_name, department, disbursement_date, basic_salary, gross_salary, six_month_avg_amount, dept_avg_amount) VALUES
(1, '01711112233', 'Kazi Anisur Rahman', 'Engineering', '2026-02-01', 21000.00, 35000.00, 35000.00, 38000.00),
(1, '01711112233', 'Kazi Anisur Rahman', 'Engineering', '2026-03-01', 21000.00, 35000.00, 35000.00, 38000.00),
(1, '01711112233', 'Kazi Anisur Rahman', 'Engineering', '2026-04-01', 21000.00, 35000.00, 35000.00, 38000.00),
(1, '01711112233', 'Kazi Anisur Rahman', 'Engineering', '2026-05-01', 21000.00, 35000.00, 35000.00, 38000.00),
(1, '01711112233', 'Kazi Anisur Rahman', 'Engineering', '2026-06-01', 21000.00, 35000.00, 35000.00, 38000.00),
(1, '01711112233', 'Kazi Anisur Rahman', 'Engineering', '2026-07-01', 21000.00, 35000.00, 35000.00, 38000.00),

(1, '01722223344', 'Sultana Razia', 'Accounts', '2026-02-01', 25200.00, 42000.00, 42000.00, 45000.00),
(1, '01722223344', 'Sultana Razia', 'Accounts', '2026-03-01', 25200.00, 42000.00, 42000.00, 45000.00),
(1, '01722223344', 'Sultana Razia', 'Accounts', '2026-04-01', 25200.00, 42000.00, 42000.00, 45000.00),
(1, '01722223344', 'Sultana Razia', 'Accounts', '2026-05-01', 25200.00, 42000.00, 42000.00, 45000.00),
(1, '01722223344', 'Sultana Razia', 'Accounts', '2026-06-01', 25200.00, 42000.00, 42000.00, 45000.00),
(1, '01722223344', 'Sultana Razia', 'Accounts', '2026-07-01', 25200.00, 42000.00, 42000.00, 45000.00);

-- 7. Insert Sample Batch Upload (Uploaded by Maker Tanvir)
INSERT INTO batches (company_id, maker_id, checker_id, file_name, total_records, valid_records, invalid_records, flagged_anomalies, total_amount, status) VALUES
(1, 1, 2, 'FMCG_Payroll_August_2026.xlsx', 6, 3, 3, 2, 498000.00, 'FLAGGED_RISK');

-- 8. Insert Batch Items (Demonstrating red grid errors, orange AI alerts, roster check, and cold-start)
INSERT INTO batch_items (batch_id, employee_id, raw_phone_number, corrected_phone_number, employee_name, department, basic_salary, gross_salary, account_validation_status, baseline_status, anomaly_score, is_anomaly, anomaly_reason, item_status) VALUES
-- Item 1: Valid Normal Record
(1, 1, '01711112233', NULL, 'Kazi Anisur Rahman', 'Engineering', 21000.00, 35000.00, 'VALID', 'VERIFIED', 0.1250, FALSE, NULL, 'PENDING'),

-- Item 2: Valid Phone but AI Anomaly Detected! (Normal is 42k, uploaded as 300,000 BDT)
(1, 2, '01722223344', NULL, 'Sultana Razia', 'Accounts', 180000.00, 300000.00, 'VALID', 'VERIFIED', -0.6842, TRUE, 'Unusual Variance: gross salary 300,000 BDT deviates significantly from 6-month individual avg (42,000 BDT)', 'PENDING'),

-- Item 3: Ghost Employee / Unrecognized Payee (Valid MFS account, but NOT on company HR Roster -> RED/ORANGE FLAG)
(1, NULL, '01833334455', NULL, 'Abdur Rashid', 'External', 15000.00, 25000.00, 'UNRECOGNIZED_PAYEE', 'VERIFIED', -0.4500, TRUE, 'Roster Mismatch: Active upay phone number is not listed on company HR employee roster', 'PENDING'),

-- Item 4: Account Typo / Unregistered Number (Triggers RED highlight in Bento Grid)
(1, NULL, '01799998877', NULL, 'New Worker', 'Factory', 22200.00, 37000.00, 'UNREGISTERED_ACCOUNT', 'VERIFIED', NULL, FALSE, 'Account does not exist on upay MFS platform', 'PENDING'),

-- Item 5: Inactive Account (Triggers RED highlight in Bento Grid)
(1, 4, '01755556677', NULL, 'Imtiaz Hossain', 'Logistics', 21000.00, 35000.00, 'INACTIVE_ACCOUNT', 'VERIFIED', NULL, FALSE, 'Account is currently suspended/inactive', 'PENDING'),

-- Item 6: New Employee Cold-Start (0 completed cycles -> BASELINE_PENDING, evaluated against Dept Avg)
(1, 5, '01744445566', NULL, 'Rahul Roy (New Hire)', 'Engineering', 39000.00, 65000.00, 'VALID', 'BASELINE_PENDING', -0.3120, TRUE, 'Baseline Pending: New employee (<3 cycles). Flagged against Engineering Dept avg (38,000 BDT)', 'PENDING');

-- 9. Insert Risk Alerts (Checker Review Audit Log Entities per ERD)
INSERT INTO risk_alerts (batch_item_id, flag_type, severity, review_status, reviewed_by, review_notes) VALUES
(2, 'UNUSUAL_VARIANCE', 'HIGH', 'PENDING_REVIEW', NULL, 'Requires Finance Director sign-off due to high bonus payout amount.'),
(3, 'ROSTER_MISMATCH', 'CRITICAL', 'PENDING_REVIEW', NULL, 'Ghost employee prevention: payee phone number is absent from corporate HR roster.'),
(6, 'UNUSUAL_VARIANCE', 'MEDIUM', 'PENDING_REVIEW', NULL, 'First-cycle payout baseline pending comparison against department average.');

-- 10. Insert Predictive Liquidity Forecasts (Per ERD & pp2 Section 3.C)
INSERT INTO liquidity_forecasts (company_id, forecast_period, predicted_amount, confidence_score) VALUES
(1, 'SEPTEMBER_2026', 5200000.00, 0.96),
(1, 'OCTOBER_2026', 4850000.00, 0.94),
(2, 'SEPTEMBER_2026', 11500000.00, 0.98);

-- 11. Insert Audit Log Entries (Bangladesh Bank Compliance Audit Trail)
INSERT INTO audit_logs (batch_id, user_id, action, details) VALUES
(1, 1, 'BATCH_UPLOADED', '{"file_name": "FMCG_Payroll_August_2026.xlsx", "total_records": 6, "total_amount": 498000.00}'),
(1, 1, 'CORE_ACCOUNT_VERIFICATION', '{"valid_records": 3, "invalid_records": 3, "unregistered": ["01799998877"], "inactive": ["01755556677"], "unrecognized_roster": ["01833334455"]}'),
(1, 1, 'HR_ROSTER_RECONCILIATION', '{"roster_matched": 4, "roster_mismatched": 1}'),
(1, 1, 'AI_RISK_SCREENING_COMPLETED', '{"algorithm": "IsolationForest", "flagged_anomalies": 3, "anomaly_item_ids": [2, 3, 6]}');
-- Optional baseline demonstration data.
