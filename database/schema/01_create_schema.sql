-- =============================================================================
-- upay Corporate Assist - PostgreSQL Schema Setup Script
-- Database Name: upay_corporate_assist
-- Engine: PostgreSQL (Version 12+)
-- Author: Nafisha Anzum Dipra
-- Description: Complete 18-table relational schema supporting bulk payout batching,
--              account validation, HR roster reconciliation, Isolation Forest AI risk 
--              screening, cold-start handling, liquidity forecasting, and BB audit compliance.
-- =============================================================================

-- Enable UUID extension if needed
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Drop existing tables in reverse dependency order
DROP TABLE IF EXISTS audit_logs CASCADE;
DROP TABLE IF EXISTS liquidity_forecasts CASCADE;
DROP TABLE IF EXISTS forecast_alerts CASCADE;
DROP TABLE IF EXISTS forecast_run_results CASCADE;
DROP TABLE IF EXISTS forecast_runs CASCADE;
DROP TABLE IF EXISTS company_forecast_settings CASCADE;
DROP TABLE IF EXISTS checker_otps CASCADE;
DROP TABLE IF EXISTS payroll_history CASCADE;
DROP TABLE IF EXISTS risk_alerts CASCADE;
DROP TABLE IF EXISTS batch_items CASCADE;
DROP TABLE IF EXISTS batches CASCADE;
DROP TABLE IF EXISTS employee_registrations CASCADE;
DROP TABLE IF EXISTS employees CASCADE;
DROP TABLE IF EXISTS accounts CASCADE;
DROP TABLE IF EXISTS users CASCADE;
DROP TABLE IF EXISTS company_bank_accounts CASCADE;
DROP TABLE IF EXISTS central_wallets CASCADE;
DROP TABLE IF EXISTS companies CASCADE;

-- 1. COMPANIES TABLE (Corporate Clients e.g., Enterprise Conglomerates)
CREATE TABLE companies (
    id SERIAL PRIMARY KEY,
    company_name VARCHAR(255) NOT NULL,
    corporate_account_number VARCHAR(50) UNIQUE NOT NULL,
    central_wallet_balance NUMERIC(15, 2) NOT NULL DEFAULT 0.00,
    status VARCHAR(20) NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'INACTIVE', 'SUSPENDED')),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 2. CENTRAL_WALLETS TABLE (Corporate Pre-funded Disbursement Accounts per ERD)
CREATE TABLE central_wallets (
    id SERIAL PRIMARY KEY,
    company_id INT NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    wallet_name VARCHAR(100) NOT NULL DEFAULT 'Main Disbursement Wallet',
    account_number VARCHAR(50) UNIQUE NOT NULL,
    balance NUMERIC(15, 2) NOT NULL DEFAULT 0.00,
    wallet_type VARCHAR(30) NOT NULL DEFAULT 'MAIN' CHECK (wallet_type IN ('MAIN', 'OPERATIONAL', 'FESTIVAL_BONUS', 'VENDOR')),
    status VARCHAR(20) NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'INACTIVE', 'SUSPENDED')),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 3. COMPANY_BANK_ACCOUNTS TABLE (Corporate Funding Sources)
CREATE TABLE company_bank_accounts (
    id SERIAL PRIMARY KEY,
    company_id INT NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    bank_name VARCHAR(150) NOT NULL,
    branch_name VARCHAR(100) NOT NULL,
    account_name VARCHAR(150) NOT NULL,
    account_number VARCHAR(50) NOT NULL,
    routing_number VARCHAR(30) NOT NULL,
    account_type VARCHAR(30) NOT NULL DEFAULT 'CURRENT',
    status VARCHAR(20) NOT NULL DEFAULT 'ACTIVE',
    is_primary BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 4. USERS TABLE (System Users & Governance Roles: MAKER, CHECKER, ADMIN)
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    company_id INT REFERENCES companies(id) ON DELETE SET NULL,
    full_name VARCHAR(100) NOT NULL,
    email VARCHAR(150) UNIQUE NOT NULL,
    phone_number VARCHAR(20) NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    role VARCHAR(20) NOT NULL CHECK (role IN ('MAKER', 'CHECKER', 'ADMIN')),
    status VARCHAR(20) NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'INACTIVE', 'SUSPENDED')),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 5. ACCOUNTS TABLE (Mock MFS Core Database for Phone Number & Account Status Verification)
CREATE TABLE accounts (
    id SERIAL PRIMARY KEY,
    phone_number VARCHAR(20) UNIQUE NOT NULL,
    account_holder_name VARCHAR(100) NOT NULL,
    account_status VARCHAR(20) NOT NULL DEFAULT 'ACTIVE' CHECK (account_status IN ('ACTIVE', 'INACTIVE', 'SUSPENDED')),
    wallet_type VARCHAR(30) NOT NULL DEFAULT 'PERSONAL' CHECK (wallet_type IN ('PERSONAL', 'AGENT', 'MERCHANT')),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 6. EMPLOYEES TABLE (Approved Corporate HR Roster per Client Company per pp2 Section 3.A)
CREATE TABLE employees (
    id SERIAL PRIMARY KEY,
    company_id INT NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    employee_code VARCHAR(50),
    phone_number VARCHAR(20) NOT NULL,
    employee_name VARCHAR(100) NOT NULL,
    department VARCHAR(50),
    designation VARCHAR(100),
    status VARCHAR(20) NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'INACTIVE', 'TERMINATED')),
    completed_cycles INT NOT NULL DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uk_company_phone UNIQUE (company_id, phone_number)
);

CREATE TABLE employee_registrations (
    id SERIAL PRIMARY KEY, company_id INT NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    submitted_by INT NOT NULL REFERENCES users(id) ON DELETE RESTRICT, email VARCHAR(255) NOT NULL,
    full_name VARCHAR(100) NOT NULL, employee_code VARCHAR(50), division VARCHAR(100), region VARCHAR(100),
    department VARCHAR(100), designation VARCHAR(100), employment_status VARCHAR(30), exit_date VARCHAR(30),
    wallet_details VARCHAR(20) NOT NULL, status VARCHAR(30) NOT NULL DEFAULT 'PENDING_ADMIN_APPROVAL',
    reviewed_by INT REFERENCES users(id) ON DELETE SET NULL, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP, reviewed_at TIMESTAMP
);

-- 8. BATCHES TABLE (Bulk Disbursement Spreadsheet Upload Headers)
CREATE TABLE batches (
    id SERIAL PRIMARY KEY,
    company_id INT NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    maker_id INT NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    checker_id INT REFERENCES users(id) ON DELETE SET NULL,
    file_name VARCHAR(255) NOT NULL,
    total_records INT NOT NULL DEFAULT 0,
    valid_records INT NOT NULL DEFAULT 0,
    invalid_records INT NOT NULL DEFAULT 0,
    flagged_anomalies INT NOT NULL DEFAULT 0,
    total_amount NUMERIC(15, 2) NOT NULL DEFAULT 0.00,
    status VARCHAR(30) NOT NULL DEFAULT 'DRAFT' 
        CHECK (status IN ('DRAFT', 'VALIDATED', 'FLAGGED_RISK', 'PENDING_CHECKER_REVIEW', 'RETURNED_TO_HR', 'CHECKER_REVIEWED', 'REJECTED', 'EXECUTED', 'CANCELLED')),
    checker_notes TEXT,
    checker_reviewed_at TIMESTAMP,
    payroll_period DATE,
    executed_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 9. BATCH_ITEMS TABLE (Individual Payout Rows, Validation Grid Status, & AI Anomaly Scores)
CREATE TABLE batch_items (
    id SERIAL PRIMARY KEY,
    batch_id INT NOT NULL REFERENCES batches(id) ON DELETE CASCADE,
    employee_id INT REFERENCES employees(id) ON DELETE SET NULL,
    raw_phone_number VARCHAR(20) NOT NULL,
    corrected_phone_number VARCHAR(20),
    employee_name VARCHAR(100) NOT NULL,
    department VARCHAR(50),
    basic_salary NUMERIC(15, 2) NOT NULL,
    gross_salary NUMERIC(15, 2) NOT NULL,
    account_validation_status VARCHAR(30) NOT NULL DEFAULT 'VALID' 
        CHECK (account_validation_status IN ('VALID', 'INVALID_LENGTH', 'UNREGISTERED_ACCOUNT', 'INACTIVE_ACCOUNT', 'UNRECOGNIZED_PAYEE')),
    baseline_status VARCHAR(30) NOT NULL DEFAULT 'VERIFIED'
        CHECK (baseline_status IN ('VERIFIED', 'BASELINE_PENDING')),
    anomaly_score NUMERIC(8, 4),
    is_anomaly BOOLEAN NOT NULL DEFAULT FALSE,
    anomaly_reason TEXT,
    item_status VARCHAR(30) NOT NULL DEFAULT 'PENDING' 
        CHECK (item_status IN ('PENDING', 'CORRECTED', 'APPROVED', 'OVERRIDDEN', 'REJECTED')),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 10. RISK_ALERTS TABLE (Detailed Anomaly Audit Trail & Checker Sign-off per ERD)
CREATE TABLE risk_alerts (
    id SERIAL PRIMARY KEY,
    batch_item_id INT NOT NULL REFERENCES batch_items(id) ON DELETE CASCADE,
    flag_type VARCHAR(50) NOT NULL CHECK (flag_type IN ('UNUSUAL_VARIANCE', 'ROSTER_MISMATCH', 'ACCOUNT_INACTIVE', 'UNREGISTERED_PHONE', 'MANUAL_INCORRECT_SALARY', 'MANUAL_WRONG_EMPLOYEE', 'MANUAL_INCORRECT_PHONE', 'MANUAL_DUPLICATE_PAYMENT', 'MANUAL_OTHER')),
    severity VARCHAR(20) NOT NULL DEFAULT 'MEDIUM' CHECK (severity IN ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL')),
    review_status VARCHAR(30) NOT NULL DEFAULT 'PENDING_REVIEW' 
        CHECK (review_status IN ('PENDING_REVIEW', 'RESOLVED_BY_HR', 'APPROVED_BY_CHECKER', 'OVERRIDDEN_BY_CHECKER', 'REJECTED_BY_CHECKER')),
    reviewed_by INT REFERENCES users(id) ON DELETE SET NULL,
    review_notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 11. PAYROLL_HISTORY TABLE (Historical Data for AI Isolation Forest & Cash Flow Forecasting)
CREATE TABLE payroll_history (
    id SERIAL PRIMARY KEY,
    company_id INT NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    phone_number VARCHAR(20) NOT NULL,
    employee_name VARCHAR(100) NOT NULL,
    department VARCHAR(50),
    disbursement_date TIMESTAMP NOT NULL,
    basic_salary NUMERIC(15, 2) NOT NULL,
    gross_salary NUMERIC(15, 2) NOT NULL,
    six_month_avg_amount NUMERIC(15, 2),
    dept_avg_amount NUMERIC(15, 2),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 12. CHECKER_OTPS TABLE (Maker-Checker Authorization OTP Tokens)
CREATE TABLE checker_otps (
    id SERIAL PRIMARY KEY,
    batch_id INT NOT NULL REFERENCES batches(id) ON DELETE CASCADE,
    checker_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    otp_code_hash VARCHAR(255) NOT NULL,
    expires_at TIMESTAMP NOT NULL,
    is_used BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 13. FORECAST_RUNS TABLE (Immutable Forecast Execution Snapshots)
CREATE TABLE forecast_runs (
    id SERIAL PRIMARY KEY,
    company_id INT NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    model_type VARCHAR(50) NOT NULL,
    status VARCHAR(30) NOT NULL DEFAULT 'READY',
    history_months INT NOT NULL DEFAULT 0,
    mae NUMERIC(15, 2),
    mape NUMERIC(8, 4),
    parameters JSONB,
    source_data_through DATE,
    error_message TEXT,
    started_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    completed_at TIMESTAMP
);

-- 14. FORECAST_RUN_RESULTS TABLE (Per-period Forecast Results)
CREATE TABLE forecast_run_results (
    id SERIAL PRIMARY KEY,
    forecast_run_id INT NOT NULL REFERENCES forecast_runs(id) ON DELETE CASCADE,
    forecast_period VARCHAR(30) NOT NULL,
    predicted_amount NUMERIC(15, 2) NOT NULL,
    lower_bound NUMERIC(15, 2),
    upper_bound NUMERIC(15, 2),
    assumptions JSONB,
    source_data_through DATE
);

-- 15. LIQUIDITY_FORECASTS TABLE (Current Cached Forecasts)
CREATE TABLE liquidity_forecasts (
    id SERIAL PRIMARY KEY,
    company_id INT NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    forecast_period VARCHAR(30) NOT NULL,
    predicted_amount NUMERIC(15, 2) NOT NULL,
    lower_bound NUMERIC(15, 2),
    upper_bound NUMERIC(15, 2),
    model_type VARCHAR(50) NOT NULL DEFAULT 'LEGACY_RULE_BASED',
    status VARCHAR(30) NOT NULL DEFAULT 'READY',
    history_months INT,
    mae NUMERIC(15, 2),
    mape NUMERIC(8, 4),
    confidence_score NUMERIC(5, 2) DEFAULT 0.95,
    assumptions JSONB,
    source_data_through DATE,
    forecast_run_id INT REFERENCES forecast_runs(id) ON DELETE SET NULL,
    generated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uk_liquidity_forecast_company_period UNIQUE (company_id, forecast_period)
);

-- 16. COMPANY_FORECAST_SETTINGS TABLE (Company Planning Controls)
CREATE TABLE company_forecast_settings (
    id SERIAL PRIMARY KEY,
    company_id INT NOT NULL UNIQUE REFERENCES companies(id) ON DELETE CASCADE,
    planning_baseline_amount NUMERIC(15, 2) NOT NULL DEFAULT 5000000.00,
    include_festival_bonus BOOLEAN NOT NULL DEFAULT FALSE,
    festival_bonus_amount NUMERIC(15, 2) NOT NULL DEFAULT 0.00,
    festival_bonus_months JSONB NOT NULL DEFAULT '[]'::jsonb,
    configured_by INT REFERENCES users(id) ON DELETE SET NULL,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 17. FORECAST_ALERTS TABLE (Review-only Forecast Warnings)
CREATE TABLE forecast_alerts (
    id SERIAL PRIMARY KEY,
    company_id INT NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    forecast_run_id INT REFERENCES forecast_runs(id) ON DELETE SET NULL,
    alert_type VARCHAR(50) NOT NULL,
    severity VARCHAR(20) NOT NULL DEFAULT 'MEDIUM',
    review_status VARCHAR(30) NOT NULL DEFAULT 'PENDING_REVIEW',
    details JSONB,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 18. AUDIT_LOGS TABLE (Bangladesh Bank Compliant Immutable Audit Trail)
CREATE TABLE audit_logs (
    id SERIAL PRIMARY KEY,
    company_id INT REFERENCES companies(id) ON DELETE CASCADE,
    batch_id INT REFERENCES batches(id) ON DELETE SET NULL,
    user_id INT REFERENCES users(id) ON DELETE SET NULL,
    audit_scope VARCHAR(30) NOT NULL DEFAULT 'CORPORATE_CLIENT',
    action VARCHAR(100) NOT NULL,
    details JSONB,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
-- PostgreSQL schema for fresh database installations.
