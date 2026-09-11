# `backend/app/routes/admin.py` — beginner line guide

**Job:** Provides system-wide Upay administration: companies, wallet money, employee rosters, bank accounts, users, and admin activity. Every endpoint is Admin-only. Base URL: `/api/admin`.

## Setup and helpers — lines 1–52

- **1–7:** Import file/date/money/password helpers and Flask request/response/current-user tools.
- **8–20:** Import the database session and all tables managed here: company, wallet, payroll, employee/account, bank account, user, alert, and audit history.
- **21–22:** Import roster-file parsing and the shared login guard.
- **24:** Creates the `/api/admin` blueprint.
- **27–29:** `require_admin` is a small wrapper around `require_auth(roles=["ADMIN"])`. All routes below use it, so a corporate Maker/Checker cannot access them.
- **32–50:** `company_summary` reads one company’s wallets, bank accounts, user/batch/employee counts, and active-wallet total, then returns one combined dictionary. Many responses reuse it.
- **53–55 and later divider comments:** These only label sections for humans; they do not run.

## Overview and companies — lines 56–269

- **56–94:** `GET /overview` loads all companies/batches, counts employees and active wallet money, calculates executed payroll total, and returns both headline metrics and `company_summary` records.
- **99–103:** `GET /companies` returns each company summary newest-first.
- **106–112:** `GET /companies/<company_id>` gets one company or returns `404`.
- **115–170:** `POST /companies` reads company/wallet details, validates exact non-negative opening balance and unique corporate account, creates `Company` then its `MAIN` `CentralWallet`, logs onboarding, commits, and returns both saved records (`201`). `flush()` is used between company and wallet so the wallet can use the new company ID.
- **173–199:** `PUT /companies/<company_id>/status` validates an allowed company status, changes it, logs the before/after status, commits, and returns the company summary.
- **205–267:** `POST /companies/<company_id>/topup` validates a positive two-decimal amount and active company/main wallet, locks the wallet while adding money, updates the company total, logs who topped it up and why, commits (or rolls back on a database error), and returns updated money data.

## Employee roster management — lines 273–496

- **273–292:** `GET /companies/<company_id>/employees` confirms company exists, loads its employees, and returns them.
- **295–398:** `POST .../employees/upload` accepts an Excel/CSV roster file for an active company. It sanitises and temporarily stores the file, parses it with `parse_employee_roster_file`, cleans it up, validates each parsed row, then creates or updates `Employee` and personal `Account` records. It writes an audit log, commits, and returns counts/results. The parser is the connection to `app/services/excel_parser.py`.
- **401–474:** `POST .../employees` performs the same kind of validation for one JSON employee: required employee fields, a valid unique mobile/account relationship, then employee/account creation, audit logging, commit, and a `201` response.
- **477–496:** `DELETE .../employees/<employee_id>` finds an employee belonging to the selected company, deletes it, logs the deletion, commits, and returns success. It does not delete a personal `Account`, which may be used elsewhere.

## Company bank accounts — lines 502–612

- **502–514:** `GET .../bank-accounts` checks company existence and returns `CompanyBankAccount` JSON rows.
- **517–586:** `POST .../bank-accounts` validates company state and JSON bank details, rejects duplicate account numbers, creates a bank-account row, logs it, commits, and returns the new record (`201`).
- **589–612:** `DELETE .../bank-accounts/<account_id>` confirms the account belongs to the company, deletes it, writes an audit entry, commits, and returns success.

## User and history routes — lines 618–742

- **618–626:** `GET /users` lists users, optionally filtered by `company_id`, and sends `to_dict()` data.
- **629–685:** `POST /users` validates a company, name/email/password/role, prevents duplicate email, hashes the password with `generate_password_hash`, creates the `User`, writes an Admin audit log, commits, and returns the safe user JSON. The plain password is never stored.
- **691–703:** `GET /audit-logs` lists Admin-scope audit records, optionally for a company, newest first.
- **706–742:** `GET /activity` builds the activity feed. It reads recent audit rows, enriches them with actor/company/batch context where available, and returns the JSON records used by the admin activity page.

## Connections

`upay-admin/src/app/` calls these endpoints. This file is the writer for much of the starting data that other routes depend on: `Company` and `CentralWallet` for payroll, `Employee`/`Account` for payee validation, `User` for `auth.py`, and `CompanyBankAccount` for company details. Its changes are recorded in `AuditLog`, which `audit.py` and the activity route expose.
