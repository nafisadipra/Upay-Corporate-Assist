# Route-file notes

Each Markdown file here explains one Python file in `backend/app/routes/`.

These are Flask **routes**: a route is a named door into the backend. A frontend page calls a URL such as `GET /api/companies/4`; Flask chooses the matching function; that function reads or changes database data and sends JSON (or an Excel file) back.

The line ranges in every note refer to the original Python file. A range covers a single complete statement when Python spreads it over several physical lines. Blank lines only separate ideas, and comment-divider lines only label a section, so they are not repeated as individual explanations.

Shared connections:

- `backend/app/__init__.py` imports each `*_bp` blueprint and registers it. Without that step, none of these URL doors exists.
- `app.models` contains the database table classes. `query`, `db.session.get`, `add`, and `commit` are how these routes read and save those tables.
- `app.utils.auth.require_auth` checks the login token and places the logged-in user in `g.current_user`. `require_tenant` also prevents a company user from reaching another company's data.
- `jsonify(...)` turns Python data into JSON for a frontend. `to_dict()` makes a model safe to send as JSON.

Files:

- [auth.md](auth.md) — login and browser session.
- [companies.md](companies.md) — company, wallets, and employee list.
- [batches.md](batches.md) — payroll upload and the Maker/Checker workflow.
- [risk_alerts.md](risk_alerts.md) — risk issues.
- [analytics.md](analytics.md) — dashboard figures and forecast.
- [audit.md](audit.md) — audit-history list.
- [admin.md](admin.md) — Upay administrator actions.
- [employee_registrations.md](employee_registrations.md) — employee-registration approval.
