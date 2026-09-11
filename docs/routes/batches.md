# `backend/app/routes/batches.py` — beginner line guide

**Job:** This is the payroll-workflow file. A Maker uploads/corrects/submits a batch, a Checker reviews it, then the Maker executes it. Base URL: `/api/batches`.

## Setup and small helpers — lines 1–65

- **1–6:** Import filesystem, counting, in-memory-file, date, exact-money, and unique-ID tools.
- **7–9:** Import Flask helpers for requests, JSON, app settings, current user, and Excel-file downloads; import spreadsheet builder and safe filename helper.
- **10–20:** Import database tables plus the parser, payee validator, anomaly checker, disbursement service, and authentication guard. The important business rules are split into these service files instead of all living here.
- **22:** Creates the `/api/batches` blueprint.
- **25–29:** `allowed_file` checks whether an uploaded filename has an allowed extension from app settings.
- **32–46:** `ensure_active_company` finds a company and returns either it with no error, or an already-built JSON `404`/`403` response. Later handlers can reuse this safety check.
- **49–51:** `maker_owns_batch` returns true for Admins or the Maker who originally uploaded this batch.
- **54–65:** `parse_payroll_period` turns a supplied month/date into a valid payroll period or returns a validation error value used by upload.

## `POST /upload` — lines 70–289

- **70–71:** Makes upload Maker-only.
- **72–89:** Starts the upload, gets the logged-in Maker/company, confirms active company, and requires a file.
- **90–116:** Sanitises/validates filename, saves it under a unique temporary name in `UPLOAD_FOLDER`, parses it with `parse_payroll_file`, and removes the temporary file even if parsing fails.
- **117–142:** Requires parsed rows, validates supplied payroll period, and calculates the uploaded total. Invalid period or malformed salary data returns `400`.
- **143–161:** Creates a `Batch` record in `DRAFT`, adds it, and flushes so it receives an ID for child items.
- **163–205:** Goes through each parsed payroll row. It reads name/phone/department/salaries, rejects invalid salary logic, and calls `validate_payee_row(company_id, phone)`. That service looks in the company employee roster and Upay account data. Then it creates a `BatchItem` with the validation result.
- **207:** Flushes items, making their IDs ready for related risk alerts.
- **210:** Calls `evaluate_batch_items_anomalies`. That service marks suspicious items and writes risk alerts.
- **213–225:** Counts anomalies/invalid items and updates the batch’s summary fields and status (`FLAGGED_RISK` or `VALIDATED`).
- **229–245:** Creates an audit record that records what was uploaded and screened.
- **246:** Commits batch, items, alerts, and audit log.
- **248–289:** Returns the saved batch and all item JSON with `201 Created`.

## Read and Excel-download routes — lines 295–461

- **295–309:** `GET /` reads batches. Non-admin users see only their company; an Admin may pass `?company_id=...`. Results are newest-first.
- **312–328:** `GET /<batch_id>` reads one batch, returns `404` if missing and `403` for another company.
- **331–350:** `GET /<batch_id>/items` does the same boundary checks, then returns child `BatchItem` records.
- **353–404:** `GET /<batch_id>/workbook` allows Maker/Checker/Admin. It checks ownership, creates an OpenPyXL workbook, adds headers and every current item, sets widths/frozen heading row, saves to memory, then returns an `.xlsx` download. This reads database data; it does not send the original upload file.
- **407–461:** `GET /<batch_id>/archive` does the same workbook construction, but only when batch status is `EXECUTED`; it names the output as an executed payroll archive.

## `PUT /items/<item_id>/correct` — lines 467–599

- **467–468:** Maker/Admin-only correction route.
- **469–490:** Gets request JSON, item, and its batch; returns errors for missing records, another tenant, a different Maker, or a batch already at a final stage.
- **492–508:** Reads corrected phone/name/department/salaries with current values as defaults; requires name/phone and sensible salary values.
- **510–520:** Normalises the new phone and checks every other item so one phone cannot appear twice in the same batch.
- **522–530:** Saves corrected fields, calls `validate_payee_row` again, and marks the item `CORRECTED`; batch stays risk-flagged until reviewed.
- **532–548:** Finds outstanding manual and AI alerts for this item and marks them resolved by HR.
- **551:** Runs anomaly checking again for just this changed item.
- **554–566:** Reloads all items and recalculates total amount and valid/invalid/anomaly counters.
- **568–587:** Adds an audit entry explaining what HR corrected and how many issues were resolved.
- **588:** Commits the corrected item, alert statuses, batch totals, and audit log.
- **590–599:** Returns changed item and batch JSON.

## Workflow-state routes — lines 605–716

- **605–656:** `POST /<batch_id>/submit` is Maker/Admin-only. It checks existence, tenant, Maker ownership, active company, allowed pre-review statuses, and that no rejected item is left. It then sets `PENDING_CHECKER_REVIEW`, logs the action, commits, and returns the batch.
- **661–687:** `POST /<batch_id>/checker-review` is Checker/Admin-only. After company checks, it reads optional action/note and calls `record_checker_review` from `disbursement_service.py`. That service enforces the detailed approval rules and changes the batch. The route reloads and returns it.
- **693–716:** `POST /<batch_id>/execute` is Maker/Admin-only. It repeats tenant/ownership/active-company checks, then calls `execute_batch_disbursement`. That service moves money from the company wallet and marks payments/batch as executed. The route returns the reloaded batch.

## Retired routes — lines 721–742

- **721–731:** The old OTP request URL remains only to respond `410 Gone` and tell callers to use Checker review then execute.
- **733–742:** The old direct-authorization URL does the same. Keeping these endpoints avoids a confusing `404` for old frontend clients while preventing unsafe old behaviour.

## Connections

The Maker UI (`frontend/src/app/maker/`) and Checker UI (`frontend/src/app/checker/`) call this file. It receives spreadsheet data via `excel_parser.py`; validates against `Company`, `Employee`, and `Account` through `validation_service.py`; creates `RiskAlert` via `anomaly_service.py`; and hands final payment work to `disbursement_service.py`. It writes `Batch`, `BatchItem`, and `AuditLog` data that the analytics, risk-alert, and audit routes later read.
