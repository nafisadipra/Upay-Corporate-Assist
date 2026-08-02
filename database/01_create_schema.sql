-- =============================================================================
-- upay Corporate Assist - PostgreSQL Schema Setup Script
-- Database Name: upay_corporate_assist
-- Engine: PostgreSQL
-- Author: Nafisha Anzum Dipra
-- =============================================================================

-- Enable UUID extension if needed
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. COMPANIES TABLE (Corporate Clients e.g., PRAN-RFL Group, UCB Investment)
DROP TABLE IF EXISTS audit_logs CASCADE;
DROP TABLE IF EXISTS checker_otps CASCADE;
DROP TABLE IF EXISTS batch_items CASCADE;
DROP TABLE IF EXISTS batches CASCADE;
DROP TABLE IF EXISTS payroll_history CASCADE;
DROP TABLE IF EXISTS accounts CASCADE;
DROP TABLE IF EXISTS users CASCADE;
DROP TABLE IF EXISTS companies CASCADE;

CREATE TABLE companies (
    id SERIAL PRIMARY KEY,
    company_name VARCHAR(255) NOT NULL,
    corporate_account_number VARCHAR(50) UNIQUE NOT NULL,
    central_wallet_balance NUMERIC(15, 2) NOT NULL DEFAULT 0.00,
    status VARCHAR(20) NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'INACTIVE', 'SUSPENDED')),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 2. USERS TABLE (System Users & Roles: MAKER, CHECKER, ADMIN)
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

-- 3. ACCOUNTS TABLE (Mock MFS Core Database for Account Validation)
CREATE TABLE accounts (
    id SERIAL PRIMARY KEY,
    phone_number VARCHAR(20) UNIQUE NOT NULL,
    account_holder_name VARCHAR(100) NOT NULL,
    account_status VARCHAR(20) NOT NULL DEFAULT 'ACTIVE' CHECK (account_status IN ('ACTIVE', 'INACTIVE', 'SUSPENDED')),
    wallet_type VARCHAR(30) NOT NULL DEFAULT 'PERSONAL' CHECK (wallet_type IN ('PERSONAL', 'AGENT', 'MERCHANT')),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 4. BATCHES TABLE (Bulk Disbursement Spreadsheet Uploads)
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
        CHECK (status IN ('DRAFT', 'VALIDATED', 'FLAGGED_RISK', 'PENDING_CHECKER_APPROVAL', 'APPROVED', 'REJECTED', 'EXECUTED', 'CANCELLED')),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 5. BATCH_ITEMS TABLE (Individual Bulk Payout Entries & AI Risk Scores)
CREATE TABLE batch_items (
    id SERIAL PRIMARY KEY,
    batch_id INT NOT NULL REFERENCES batches(id) ON DELETE CASCADE,
    raw_phone_number VARCHAR(20) NOT NULL,
    corrected_phone_number VARCHAR(20),
    employee_name VARCHAR(100) NOT NULL,
    department VARCHAR(50),
    amount NUMERIC(15, 2) NOT NULL,
    wallet_type VARCHAR(30) NOT NULL DEFAULT 'SALARY' CHECK (wallet_type IN ('SALARY', 'BONUS', 'VENDOR', 'EXPENSE')),
    account_validation_status VARCHAR(30) NOT NULL DEFAULT 'VALID' 
        CHECK (account_validation_status IN ('VALID', 'INVALID_LENGTH', 'UNREGISTERED_ACCOUNT', 'INACTIVE_ACCOUNT')),
    anomaly_score NUMERIC(8, 4),
    is_anomaly BOOLEAN NOT NULL DEFAULT FALSE,
    anomaly_reason TEXT,
    item_status VARCHAR(30) NOT NULL DEFAULT 'PENDING' 
        CHECK (item_status IN ('PENDING', 'CORRECTED', 'APPROVED', 'OVERRIDDEN', 'REJECTED')),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 6. PAYROLL_HISTORY TABLE (Historical Data for AI Isolation Forest & Cash Flow Forecasting)
CREATE TABLE payroll_history (
    id SERIAL PRIMARY KEY,
    company_id INT NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    phone_number VARCHAR(20) NOT NULL,
    employee_name VARCHAR(100) NOT NULL,
    department VARCHAR(50),
    disbursement_date TIMESTAMP NOT NULL,
    amount NUMERIC(15, 2) NOT NULL,
    six_month_avg_amount NUMERIC(15, 2),
    dept_avg_amount NUMERIC(15, 2),
    wallet_type VARCHAR(30) NOT NULL DEFAULT 'SALARY',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 7. CHECKER_OTPS TABLE (Maker-Checker Authorization OTP Tokens)
CREATE TABLE checker_otps (
    id SERIAL PRIMARY KEY,
    batch_id INT NOT NULL REFERENCES batches(id) ON DELETE CASCADE,
    checker_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    otp_code_hash VARCHAR(255) NOT NULL,
    expires_at TIMESTAMP NOT NULL,
    is_used BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 8. AUDIT_LOGS TABLE (Bangladesh Bank Compliant Immutable Audit Log)
CREATE TABLE audit_logs (
    id SERIAL PRIMARY KEY,
    batch_id INT REFERENCES batches(id) ON DELETE SET NULL,
    user_id INT REFERENCES users(id) ON DELETE SET NULL,
    action VARCHAR(100) NOT NULL,
    details JSONB,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

