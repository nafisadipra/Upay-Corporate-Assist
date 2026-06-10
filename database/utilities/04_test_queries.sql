-- =============================================================================
-- upay Corporate Assist - Verification Queries for DBeaver & Terminal Testing
-- Database Name: upay_corporate_assist
-- Engine: PostgreSQL (Version 12+)
-- Author: Nafisha Anzum Dipra
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. TEST CORE ACCOUNT & HR ROSTER RECONCILIATION QUERY (pp2 Section 3.A)
-- Next.js backend executes this to screen raw uploaded phone numbers against:
-- a) Core upay MFS account database (accounts table)
-- b) Corporate HR approved employee roster (employees table)
-- Flags: GREEN (Valid), RED (Unregistered/Inactive), ORANGE/RED (Unrecognized Payee)
-- -----------------------------------------------------------------------------
SELECT 
    bi.id AS batch_item_id,
    bi.raw_phone_number,
    bi.employee_name,
    bi.gross_salary,
    COALESCE(a.account_status, 'UNREGISTERED_ACCOUNT') AS mfs_account_status,
    CASE WHEN e.id IS NOT NULL THEN 'MATCHED' ELSE 'ROSTER_MISMATCH' END AS hr_roster_status,
    CASE 
        WHEN a.phone_number IS NULL THEN 'RED - Unregistered Phone Number'
        WHEN a.account_status != 'ACTIVE' THEN 'RED - Inactive / Suspended Account'
        WHEN e.id IS NULL THEN 'RED/ORANGE - Unrecognized Payee (Not on HR Roster)'
        ELSE 'GREEN - Valid & Roster Verified'
    END AS bento_grid_ui_flag
FROM batch_items bi
LEFT JOIN accounts a ON bi.raw_phone_number = a.phone_number
LEFT JOIN employees e ON bi.raw_phone_number = e.phone_number AND e.company_id = 1
WHERE bi.batch_id = 1;


-- -----------------------------------------------------------------------------
-- 2. TEST AI RISK, ANOMALY FILTER & COLD-START BASELINE SCREENING (pp2 Section 3.B)
-- Retrieves batch rows flagged by Isolation Forest / Pattern Auditor.
-- Demonstrates distinction between individual history baseline vs BASELINE_PENDING (Dept Avg).
-- -----------------------------------------------------------------------------
SELECT 
    bi.id AS item_id,
    bi.employee_name,
    bi.department,
    bi.gross_salary AS current_gross_salary,
    bi.baseline_status,
    ph.six_month_avg_amount AS individual_6mo_avg,
    bi.anomaly_score,
    bi.anomaly_reason,
    CASE 
        WHEN bi.baseline_status = 'BASELINE_PENDING' THEN 'ORANGE - Cold-Start (Dept Avg Fallback)'
        ELSE 'ORANGE - Executive Verification Required (Individual Variance)'
    END AS ui_badge
FROM batch_items bi
LEFT JOIN (
    SELECT phone_number, AVG(gross_salary) AS six_month_avg_amount
    FROM payroll_history
    WHERE company_id = 1
    GROUP BY phone_number
) ph ON bi.raw_phone_number = ph.phone_number
WHERE bi.batch_id = 1 AND bi.is_anomaly = TRUE;


-- -----------------------------------------------------------------------------
-- 3. TEST RISK ALERTS & CHECKER AUDIT LOG REVIEW (ERD Risk Alert Entity)
-- Shows open risk alerts requiring Checker (Finance Director) sign-off/notes
-- -----------------------------------------------------------------------------
SELECT 
    ra.id AS alert_id,
    bi.batch_id,
    bi.employee_name,
    bi.raw_phone_number,
    bi.gross_salary,
    ra.flag_type,
    ra.severity,
    ra.review_status,
    ra.review_notes,
    u.full_name AS reviewed_by_name
FROM risk_alerts ra
JOIN batch_items bi ON ra.batch_item_id = bi.id
LEFT JOIN users u ON ra.reviewed_by = u.id
WHERE bi.batch_id = 1;


-- -----------------------------------------------------------------------------
-- 4. TEST PREDICTIVE LIQUIDITY FORECASTING QUERY (pp2 Section 3.C)
-- Treasury team dashboard query for central wallet capital requirement estimates
-- -----------------------------------------------------------------------------
SELECT 
    lf.id AS forecast_id,
    c.company_name,
    cw.wallet_name,
    cw.balance AS current_wallet_balance,
    lf.forecast_period,
    lf.predicted_amount AS predicted_funding_requirement,
    (lf.predicted_amount - cw.balance) AS estimated_topup_needed,
    lf.confidence_score
FROM liquidity_forecasts lf
JOIN companies c ON lf.company_id = c.id
JOIN central_wallets cw ON cw.company_id = c.id AND cw.wallet_type = 'MAIN'
WHERE c.id = 1
ORDER BY lf.generated_at DESC;


-- -----------------------------------------------------------------------------
-- 5. TEST MAKER-CHECKER BATCH SUMMARY & GOVERNANCE STATUS (pp2 Section 4)
-- Batch header overview for Finance Director before OTP authorization
-- -----------------------------------------------------------------------------
SELECT 
    b.id AS batch_id,
    b.file_name,
    c.company_name,
    m.full_name AS maker_name,
    ch.full_name AS checker_name,
    b.total_records,
    b.valid_records,
    b.invalid_records,
    b.flagged_anomalies,
    b.total_amount,
    b.status AS batch_status
FROM batches b
JOIN companies c ON b.company_id = c.id
JOIN users m ON b.maker_id = m.id
LEFT JOIN users ch ON b.checker_id = ch.id
WHERE b.id = 1;


-- -----------------------------------------------------------------------------
-- 6. TEST AUDIT LOG COMPLIANCE TRAIL (Bangladesh Bank Regulatory Audit Trail)
-- Retrieves complete timeline of events for a batch
-- -----------------------------------------------------------------------------
SELECT 
    al.id AS log_id,
    al.created_at,
    u.full_name AS performed_by,
    u.role,
    al.action,
    al.details
FROM audit_logs al
LEFT JOIN users u ON al.user_id = u.id
WHERE al.batch_id = 1
ORDER BY al.created_at ASC;
-- Manual database verification queries.
