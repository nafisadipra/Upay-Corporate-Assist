-- =============================================================================
-- upay Corporate Assist - Verification Queries for DBeaver
-- Database Name: upay_corporate_assist
-- Author: Nafisha Anzum Dipra
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. TEST CORE ACCOUNT VERIFICATION QUERY (Step 2 in pp1.docx)
-- Next.js backend executes this to check which phone numbers exist and are ACTIVE
-- -----------------------------------------------------------------------------
SELECT 
    bi.id AS batch_item_id,
    bi.raw_phone_number,
    bi.employee_name,
    bi.amount,
    COALESCE(a.account_status, 'UNREGISTERED_ACCOUNT') AS verified_status,
    CASE 
        WHEN a.phone_number IS NULL THEN 'RED - Unregistered Phone Number'
        WHEN a.account_status != 'ACTIVE' THEN 'RED - Inactive / Suspended Account'
        ELSE 'GREEN - Valid Account'
    END AS bento_grid_ui_flag
FROM batch_items bi
LEFT JOIN accounts a ON bi.raw_phone_number = a.phone_number
WHERE bi.batch_id = 1;


-- -----------------------------------------------------------------------------
-- 2. TEST AI RISK & ANOMALY FILTER (Step 3 in pp1.docx)
-- Retrieves batch rows flagged by Isolation Forest for Checker review
-- -----------------------------------------------------------------------------
SELECT 
    bi.id AS item_id,
    bi.employee_name,
    bi.department,
    bi.amount AS current_payout_amount,
    ph.six_month_avg_amount,
    bi.anomaly_score,
    bi.anomaly_reason,
    'ORANGE - Executive Verification Required' AS ui_badge
FROM batch_items bi
LEFT JOIN (
    SELECT phone_number, AVG(amount) AS six_month_avg_amount
    FROM payroll_history
    WHERE company_id = 1
    GROUP BY phone_number
) ph ON bi.raw_phone_number = ph.phone_number
WHERE bi.batch_id = 1 AND bi.is_anomaly = TRUE;


-- -----------------------------------------------------------------------------
-- 3. TEST MAKER-CHECKER BATCH SUMMARY & GOVERNANCE STATUS (Step 4 in pp1.docx)
-- Shows batch header status with Maker details, Checker assignment, and summary counts
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
-- 4. TEST AUDIT LOG COMPLIANCE TRAIL (Bangladesh Bank Audit Requirements)
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
