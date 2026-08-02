# Database Documentation - upay Corporate Assist

**Project Name:** upay Corporate Assist (Next-Gen B2B Bulk Payout Platform with Intelligent Risk & Liquidity Analytics)  
**Author:** Nafisha Anzum Dipra  
**Database Engine:** PostgreSQL (Version 12+)  
**Database Name:** `upay_corporate_assist`  
**Database Username:** `upay_corporate`  
**GUI Client:** DBeaver  

---

## 1. Quick Execution Guide (How to Run the SQL Scripts)

### Option A: Running via DBeaver (Recommended)

1. **Connect to Database:**
   - In DBeaver, ensure your connection `upay_corporate_assist` is active (indicated by a green checkmark icon).

2. **Run `01_create_schema.sql` (Creates all 8 Tables & Constraints):**
   - Click the tab **`01_create_schema.sql`** in DBeaver.
   - Press **`Option + X`** (Mac) or **`Alt + X`** (Windows) to execute the entire script.
   - *Alternative:* Click the **Execute SQL Script** icon on the top toolbar.

3. **Run `02_create_indexes.sql` (Adds Performance Indexes):**
   - Click the tab **`02_create_indexes.sql`**.
   - Press **`Option + X`**.

4. **Run `03_insert_seed_data.sql` (Inserts Realistic Mock Data):**
   - Click the tab **`03_insert_seed_data.sql`**.
   - Press **`Option + X`**.

5. **Verify and Run Queries (`04_test_queries.sql`):**
   - Open **`04_test_queries.sql`**.
   - Highlight any specific query and press **`Cmd + Enter`** / **`Ctrl + Enter`** to execute it individually.

---

### Option B: Running via macOS Terminal (`psql`)

If you prefer running commands directly from your terminal:

```bash
cd /Users/user/Documents/Upay-Corporate-Assist/database

# Run Schema Script
psql -U upay_corporate -d upay_corporate_assist -f 01_create_schema.sql

# Run Indexes Script
psql -U upay_corporate -d upay_corporate_assist -f 02_create_indexes.sql

# Run Seed Data Script
psql -U upay_corporate -d upay_corporate_assist -f 03_insert_seed_data.sql

# Run Test Queries
psql -U upay_corporate -d upay_corporate_assist -f 04_test_queries.sql
```

---

## 2. Complete Database Architecture & Schema Reference

The database consists of **8 relational tables** designed to handle bulk corporate payouts, account verification, AI risk screening, and regulatory audit compliance.

```
                          ┌──────────────────────┐
                          │      companies       │
                          └──────────┬───────────┘
                                     │ 1:N
                        ┌────────────┴────────────┐
                        ▼                         ▼
            ┌──────────────────────┐    ┌──────────────────────┐
            │        users         │    │   payroll_history    │
            │ (MAKER / CHECKER)    │    │ (AI Baseline Data)   │
            └──────────┬───────────┘    └──────────────────────┘
                       │ 1:N
                       ▼
            ┌──────────────────────┐
            │       batches        │
            └──────────┬───────────┘
                       │ 1:N
         ┌─────────────┼─────────────────────────┐
         ▼             ▼                         ▼
┌────────────────┐ ┌────────────────┐ ┌────────────────┐
│  batch_items   │ │  checker_otps  │ │   audit_logs   │
│ (AI Risk Flags)│ └────────────────┘ └────────────────┘
└───────┬────────┘
        │ LEFT JOIN
        ▼
┌────────────────┐
│    accounts    │ (Core MFS DB)
└────────────────┘
```

---

### Table 1: `companies` (Corporate Clients)
Stores corporate client details, enterprise account numbers, and central wallet balances.

| Column | Data Type | Constraints | Description |
| :--- | :--- | :--- | :--- |
| `id` | `SERIAL` | `PRIMARY KEY` | Unique company ID |
| `company_name` | `VARCHAR(255)` | `NOT NULL` | Name of enterprise (e.g. PRAN-RFL Group) |
| `corporate_account_number` | `VARCHAR(50)` | `UNIQUE, NOT NULL` | Unique corporate wallet identifier |
| `central_wallet_balance` | `NUMERIC(15,2)` | `NOT NULL, DEFAULT 0.00` | Pre-funded central disbursement balance |
| `status` | `VARCHAR(20)` | `CHECK ('ACTIVE','INACTIVE','SUSPENDED')` | Operational status of company |
| `created_at` | `TIMESTAMP` | `DEFAULT CURRENT_TIMESTAMP` | Record creation timestamp |
| `updated_at` | `TIMESTAMP` | `DEFAULT CURRENT_TIMESTAMP` | Record update timestamp |

---

### Table 2: `users` (System Users & Roles)
Enforces Maker-Checker segregation of duties compliant with Bangladesh Bank internal control regulations.

| Column | Data Type | Constraints | Description |
| :--- | :--- | :--- | :--- |
| `id` | `SERIAL` | `PRIMARY KEY` | Unique user ID |
| `company_id` | `INT` | `FOREIGN KEY -> companies(id)` | Company the user belongs to |
| `full_name` | `VARCHAR(100)` | `NOT NULL` | Full name of corporate user |
| `email` | `VARCHAR(150)` | `UNIQUE, NOT NULL` | Login email address |
| `phone_number` | `VARCHAR(20)` | `NOT NULL` | Contact mobile number |
| `password_hash` | `VARCHAR(255)` | `NOT NULL` | Encrypted password string |
| `role` | `VARCHAR(20)` | `CHECK ('MAKER','CHECKER','ADMIN')` | Governance role (`MAKER` = HR, `CHECKER` = Finance Director) |
| `status` | `VARCHAR(20)` | `DEFAULT 'ACTIVE'` | Account status |

---

### Table 3: `accounts` (Mock MFS Core Database)
Acts as a mock of upay's core Mobile Financial Services (MFS) user database for instant phone number and status verification.

| Column | Data Type | Constraints | Description |
| :--- | :--- | :--- | :--- |
| `id` | `SERIAL` | `PRIMARY KEY` | Unique account ID |
| `phone_number` | `VARCHAR(20)` | `UNIQUE, NOT NULL` | Customer wallet phone number |
| `account_holder_name` | `VARCHAR(100)` | `NOT NULL` | Registered customer name |
| `account_status` | `VARCHAR(20)` | `CHECK ('ACTIVE','INACTIVE','SUSPENDED')` | Current MFS account status |
| `wallet_type` | `VARCHAR(30)` | `CHECK ('PERSONAL','AGENT','MERCHANT')` | Core wallet classification |

---

### Table 4: `batches` (Bulk Payout Upload Headers)
Represents a single uploaded payout spreadsheet (e.g. `PRAN_Payroll_August_2026.xlsx`) and tracks its processing state.

| Column | Data Type | Constraints | Description |
| :--- | :--- | :--- | :--- |
| `id` | `SERIAL` | `PRIMARY KEY` | Unique batch ID |
| `company_id` | `INT` | `FOREIGN KEY -> companies(id)` | Company owning this batch |
| `maker_id` | `INT` | `FOREIGN KEY -> users(id)` | HR user who uploaded the file |
| `checker_id` | `INT` | `FOREIGN KEY -> users(id)` | Finance Director who approved the batch |
| `file_name` | `VARCHAR(255)` | `NOT NULL` | Original uploaded spreadsheet file name |
| `total_records` | `INT` | `DEFAULT 0` | Total rows in file |
| `valid_records` | `INT` | `DEFAULT 0` | Rows passing account verification |
| `invalid_records` | `INT` | `DEFAULT 0` | Rows failing account verification (typos/unregistered) |
| `flagged_anomalies` | `INT` | `DEFAULT 0` | Rows flagged by AI Isolation Forest engine |
| `total_amount` | `NUMERIC(15,2)` | `DEFAULT 0.00` | Sum total payout amount in BDT |
| `status` | `VARCHAR(30)` | `CHECK (...)` | Workflow state (`DRAFT`, `VALIDATED`, `FLAGGED_RISK`, `PENDING_CHECKER_APPROVAL`, `APPROVED`, `EXECUTED`) |

---

### Table 5: `batch_items` (Individual Payroll Rows & AI Risk Scores)
Contains individual payment rows, typo corrections, validation statuses, and Scikit-Learn Isolation Forest anomaly scores.

| Column | Data Type | Constraints | Description |
| :--- | :--- | :--- | :--- |
| `id` | `SERIAL` | `PRIMARY KEY` | Unique row item ID |
| `batch_id` | `INT` | `FOREIGN KEY -> batches(id) CASCADE` | Parent batch ID |
| `raw_phone_number` | `VARCHAR(20)` | `NOT NULL` | Original phone number uploaded |
| `corrected_phone_number` | `VARCHAR(20)` | `NULLABLE` | Phone number after Maker inline correction |
| `employee_name` | `VARCHAR(100)` | `NOT NULL` | Recipient employee name |
| `department` | `VARCHAR(50)` | `NULLABLE` | Recipient department |
| `amount` | `NUMERIC(15,2)` | `NOT NULL` | Payout amount in BDT |
| `wallet_type` | `VARCHAR(30)` | `CHECK ('SALARY','BONUS','VENDOR','EXPENSE')` | Disbursement category |
| `account_validation_status` | `VARCHAR(30)` | `CHECK ('VALID','INVALID_LENGTH','UNREGISTERED_ACCOUNT','INACTIVE_ACCOUNT')` | Phone verification status |
| `anomaly_score` | `NUMERIC(8,4)` | `NULLABLE` | Machine learning anomaly score (from Isolation Forest) |
| `is_anomaly` | `BOOLEAN` | `DEFAULT FALSE` | `TRUE` if flagged as unusual variance |
| `anomaly_reason` | `TEXT` | `NULLABLE` | Human-readable explanation of risk flag |
| `item_status` | `VARCHAR(30)` | `CHECK ('PENDING','CORRECTED','APPROVED','OVERRIDDEN','REJECTED')` | Row status |

---

### Table 6: `payroll_history` (Historical Data for AI & Liquidity Analytics)
Stores 6 to 12 months of historical payouts per employee/department. Used by the Python backend for AI anomaly baseline extraction and time-series cash flow liquidity forecasting.

| Column | Data Type | Constraints | Description |
| :--- | :--- | :--- | :--- |
| `id` | `SERIAL` | `PRIMARY KEY` | Unique history record ID |
| `company_id` | `INT` | `FOREIGN KEY -> companies(id)` | Enterprise client ID |
| `phone_number` | `VARCHAR(20)` | `NOT NULL` | Employee phone number |
| `employee_name` | `VARCHAR(100)` | `NOT NULL` | Employee name |
| `department` | `VARCHAR(50)` | `NULLABLE` | Employee department |
| `disbursement_date` | `TIMESTAMP` | `NOT NULL` | Date of historical payment |
| `amount` | `NUMERIC(15,2)` | `NOT NULL` | Historical payment amount |
| `six_month_avg_amount` | `NUMERIC(15,2)` | `NULLABLE` | Pre-calculated 6-month average |
| `dept_avg_amount` | `NUMERIC(15,2)` | `NULLABLE` | Department average payout |
| `wallet_type` | `VARCHAR(30)` | `DEFAULT 'SALARY'` | Payout type |

---

### Table 7: `checker_otps` (Maker-Checker Authorization OTPs)
Stores time-limited OTP tokens required for the Checker (Finance Director) to authorize payout execution.

| Column | Data Type | Constraints | Description |
| :--- | :--- | :--- | :--- |
| `id` | `SERIAL` | `PRIMARY KEY` | Unique OTP record ID |
| `batch_id` | `INT` | `FOREIGN KEY -> batches(id)` | Associated payout batch |
| `checker_id` | `INT` | `FOREIGN KEY -> users(id)` | Finance Director receiving OTP |
| `otp_code_hash` | `VARCHAR(255)` | `NOT NULL` | Hashed OTP code |
| `expires_at` | `TIMESTAMP` | `NOT NULL` | Token expiration timestamp |
| `is_used` | `BOOLEAN` | `DEFAULT FALSE` | Usage flag |

---

### Table 8: `audit_logs` (Regulatory Audit Trail)
Stores an immutable log of all actions taken in the platform, storing full context and diffs inside a `JSONB` column to satisfy Bangladesh Bank audit requirements.

| Column | Data Type | Constraints | Description |
| :--- | :--- | :--- | :--- |
| `id` | `SERIAL` | `PRIMARY KEY` | Unique log entry ID |
| `batch_id` | `INT` | `FOREIGN KEY -> batches(id)` | Associated batch ID |
| `user_id` | `INT` | `FOREIGN KEY -> users(id)` | User performing action |
| `action` | `VARCHAR(100)` | `NOT NULL` | Event action name (e.g. `BATCH_UPLOADED`, `TYPO_CORRECTED`) |
| `details` | `JSONB` | `NULLABLE` | Dynamic JSON object containing old/new values, IP address, metadata |
| `created_at` | `TIMESTAMP` | `DEFAULT CURRENT_TIMESTAMP` | Event timestamp |

---

## 3. High-Performance Database Indexes

To guarantee fast UI response times even with 100,000+ row bulk files, the database utilizes optimized PostgreSQL indexes (`02_create_indexes.sql`):

1. **`idx_accounts_phone`** on `accounts(phone_number)`: Enables sub-millisecond execution for `SELECT ... WHERE phone_number IN (...)` core account lookup queries.
2. **`idx_batch_items_validation`** on `batch_items(account_validation_status)`: Accelerates red-flagged bento grid UI queries.
3. **`idx_batch_items_anomaly`** on `batch_items(is_anomaly)`: Accelerates orange-flagged AI risk report filtering for Checkers.
4. **`idx_payroll_history_lookup`** on `payroll_history(company_id, phone_number, disbursement_date)`: Provides instant 6-month historical baseline calculation for Scikit-Learn Isolation Forest model input.
5. **`idx_audit_logs_batch`** on `audit_logs(batch_id)`: Enables instant compliance audit reporting for Bangladesh Bank regulators.
