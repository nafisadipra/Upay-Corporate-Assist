# `backend/app/routes/audit.py` — beginner line guide

**Job:** Returns a list of actions already recorded by other routes. Base URL: `/api/audit-logs`.

- **1:** Imports Flask helpers. `request` reads optional URL filters; `g` holds the logged-in user.
- **2:** Imports `AuditLog` (the history table) and `Batch` (not used directly in the current code; it may be a leftover import).
- **3:** Imports the login guard.
- **5:** Creates the route group and gives it its base URL.
- **8:** Maps `GET /api/audit-logs`.
- **9:** Requires a logged-in user. It also fills `g.current_user`.
- **10:** Starts the handler.
- **11:** Saves the current user in a short local name.
- **12:** Reads an optional `batch_id` query string and converts it to an integer when possible.
- **14:** Starts a database query limited to corporate-client audit entries. Admin-only entries are not included here.
- **15–20:** A non-admin can only see their own company. An admin can optionally add `?company_id=...` to narrow the list.
- **22–23:** If `batch_id` was supplied, narrows the query to that payroll batch.
- **25:** Sorts newest-first and actually fetches all matching `AuditLog` rows.
- **26:** Changes every row with `to_dict()` and returns the JSON array with `200 OK`.

## Connections

`batches.py`, `companies.py`, `risk_alerts.py`, and `employee_registrations.py` create most of these `AuditLog` rows. The corporate frontend’s audit screen can call this route to display them. This route only reads; it never changes audit history.
