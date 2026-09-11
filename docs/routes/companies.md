# `backend/app/routes/companies.py` — beginner line guide

**Job:** Lets corporate users/admins read company data and manage separate company wallets. Base URL: `/api/companies`.

## Setup — lines 1–8

- **1:** Imports exact-money types and the error raised for invalid money text.
- **2:** Imports Flask request/response/login helpers.
- **3:** Imports database-error handling for transfers.
- **4:** Imports the SQLAlchemy database session.
- **5:** Imports the tables this file reads or writes: company, wallets, employees, bank accounts, and audit history.
- **6:** Imports authentication and tenant-boundary checks.
- **8:** Creates the `/api/companies` route group.

## Read routes — lines 11–44 and 295–300

- **11–20:** `GET /api/companies` requires login. A normal user receives only their `company_id`; an Admin receives every company. Each model is converted by `to_dict()` before JSON is returned.
- **22–36:** `GET /api/companies/<company_id>` requires login and tenant access. It finds the company, then its `CentralWallet` and `CompanyBankAccount` rows, adds those lists to the company JSON, and returns `404` if absent.
- **38–44:** `GET .../<company_id>/wallets` reads and returns just that company’s wallet records.
- **295–300:** `GET .../<company_id>/employees` reads and returns that company’s `Employee` records.

## `POST /<company_id>/wallets` — lines 46–133

- **46–48:** Creates the wallet URL. Only Maker/Admin users with tenant access may call it.
- **49–55:** Gets the company and blocks a missing/inactive/suspended one.
- **57–63:** Reads JSON, cleans the wallet name/type, and safely converts opening money to `Decimal`; bad money gets `400`.
- **65–78:** Requires a name, accepts only known wallet types, refuses negative/non-finite money, and forces a new wallet to begin at zero. Existing money must be moved later through an audited route.
- **79–89:** Only an Admin can create `MAIN`; there may be only one `MAIN` wallet per company.
- **91–96:** Uses supplied account number or builds one from the company account/type/count, then refuses a duplicate number.
- **98–106:** Builds the new `CentralWallet` object and puts it into the pending database session.
- **107–108:** `flush()` gives the new wallet an ID without final saving; `sync_balance()` refreshes the company aggregate.
- **109–123:** Creates an `AuditLog` record explaining who created which wallet.
- **124:** `commit()` permanently saves the wallet and audit record together.
- **125–133:** Returns the new wallet and updated company with `201 Created`.

## `POST /<company_id>/wallets/transfer` — lines 136–231

- **136–138:** Maker-only, tenant-protected transfer endpoint.
- **139–147:** Finds the company and blocks transfers for inactive companies.
- **149–159:** Reads source/destination IDs and money. Invalid input gives `400`.
- **161–167:** Refuses the same wallet, non-positive money, and money with more than two decimal places.
- **169–177:** Fetches both wallets for this company with `with_for_update()`. That database lock prevents two transfers from spending the same balance at once.
- **178–184:** Maps results by ID and refuses missing/inactive wallets.
- **186–189:** Reads balances exactly and stops if the source lacks money.
- **191–193:** Subtracts from source, adds to destination, and refreshes the company total. No new company money is created.
- **194–211:** Adds an audit record with before/after details.
- **212–219:** Commits; if the database reports an error, rolls back, meaning no partial transfer remains.
- **221–231:** Returns success plus both wallet JSON records and company data.

## `PUT /<company_id>/wallets/<wallet_id>` — lines 234–292

- **234–236:** Admin-only, tenant-protected wallet update route.
- **237–244:** Finds both company and its wallet; blocks missing/inactive records.
- **246–256:** Reads JSON, remembers the old balance, and explicitly rejects a direct `balance` field. This protects the audit trail.
- **257–266:** Allows only a non-empty new name and an allowed status value.
- **267–280:** Refreshes the company balance and creates an audit record describing the update.
- **281:** Saves the change.
- **282–292:** Returns the saved wallet/company data.

## Connections

The corporate frontend’s Maker/Checker pages call these endpoints. They read/write `Company`, `CentralWallet`, `Employee`, and `CompanyBankAccount`; write actions also create `AuditLog` rows, later displayed by `audit.py`. `batches.py` uses company wallets when executing payroll.
