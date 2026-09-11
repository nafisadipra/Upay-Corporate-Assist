# `backend/app/routes/risk_alerts.py` — beginner line guide

**Job:** Lists payroll risk alerts, lets a Checker raise a manual issue, and lets a Checker override an AI alert. Base URL: `/api/risk-alerts`.

- **1:** Imports request/JSON/current-user helpers.
- **2:** Imports the database session.
- **3:** Imports alert, payroll item/batch, and audit models.
- **4:** Imports the login guard.
- **6:** Creates the route group.
- **8–14:** Defines the only manual issue kinds a Checker may select. Keeping them in a set makes the validation on line 59 fast and clear.

## `GET /` — lines 17–31

- **17–18:** Maps the read URL and requires login.
- **19–21:** Gets current user and optional integer `batch_id` filter.
- **23:** Starts a query that joins `RiskAlert → BatchItem → Batch`. Those joins are needed to know an alert’s company.
- **24–25:** A non-Admin query is restricted to their company.
- **27–28:** Applies the optional batch filter.
- **30–31:** Sorts newest first and returns JSON alert records.

## `POST /manual` — lines 34–121

- **34–35:** Checker/Admin-only URL for raising an issue on one payroll row.
- **36–43:** Reads JSON, finds the item and its batch, and rejects missing data or another company’s batch.
- **44–52:** Allows manual issues only while Finance is reviewing the batch or it is back with HR.
- **54–63:** Cleans issue type/notes and requires both an allowed type and a written note.
- **65–75:** Looks for the same still-open manual alert and returns `409 Conflict` instead of creating a duplicate.
- **77–84:** Builds the new high-severity `RiskAlert`, linked to that item and reviewer.
- **85–94:** Finds still-open AI alerts on the same item and marks them rejected by Checker. The manual issue replaces them with a human decision.
- **96–97:** Marks this item rejected and sends the whole batch back to HR.
- **98–113:** Adds an audit record showing item, issue, note, and affected AI alerts.
- **114:** Saves all state changes.
- **115–121:** Returns the manual alert and updated batch with `201 Created`.

## `PUT /<alert_id>/review` — lines 124–199

- **124–125:** Checker/Admin-only review URL.
- **126–130:** Its docstring says it is an exception sign-off. It reads action and notes, using safe defaults.
- **132–134:** Loads the alert or returns `404`.
- **136–145:** Allows only `OVERRIDDEN_BY_CHECKER`. A Checker must use the manual route for a real payroll error.
- **147–148:** Refuses manual alerts here; HR must correct those.
- **150–151:** Finds the related item and batch.
- **153–166:** Enforces company boundary and only permits review during the allowed batch stages.
- **168–174:** Stores the override action, reviewer, note, and changes the item to `OVERRIDDEN` when available.
- **176–190:** Builds and queues a corporate audit record.
- **191–192:** Saves it.
- **194–199:** Returns success plus updated alert JSON.

## Connections

`batches.py` creates automated alerts through `anomaly_service.py` and reads alert status while the payroll moves through review. This file changes `RiskAlert`, `BatchItem`, `Batch`, and `AuditLog`; the Checker UI reads its JSON to show review work.
