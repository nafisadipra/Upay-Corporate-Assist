# Upay Corporate Assist: Viva and Coding Questions

These are realistic teacher questions for this project. Each answer includes the exact code location to open while preparing. Line references are one-based.

## Project architecture and workflow

### 1. What problem does this application solve?

It is a corporate bulk-payroll platform: a maker uploads payroll, validation/risk checks run, a checker reviews it, a controlled execution disburses funds, and the system maintains audit data and liquidity forecasts.

**Evidence:** `README.md:9-13`; `backend/README.md:13-26`; `backend/app/routes/batches.py:55-576`.

### 2. What technologies are used?

The backend is Flask with SQLAlchemy; the corporate frontend and administrator frontend are Next.js/TypeScript; PostgreSQL-oriented SQL schema/seeds are in `database/`; the forecasting layer uses NumPy and optionally Statsmodels.

**Evidence:** `backend/app/__init__.py:1-48`; `backend/app/extensions.py:1-5`; `backend/requirements.txt`; `frontend/package.json`; `upay-admin/package.json`; `database/schema/01_create_schema.sql`; `backend/app/services/forecasting_service.py:7-25`.

### 3. Explain the maker-checker workflow.

A maker uploads and submits a payroll batch. A checker reviews it independently. Only then does execution perform the financial action. This separation limits fraud and accidental payouts by ensuring one person cannot normally create and approve the same payment.

**Evidence:** `backend/app/routes/batches.py:460-576`; `backend/app/services/disbursement_service.py:16-156`; `backend/tests/test_streamlined_maker_checker.py`.

### 4. Where is the application assembled and routes registered?

The Flask application factory initializes extensions and registers route blueprints. This keeps setup separate from individual endpoint files.

**Evidence:** `backend/app/__init__.py:16-48`.

### 5. What is a REST API in this project?

It exposes HTTP endpoints such as `GET` to read forecast data, `POST` to refresh a forecast/perform workflow actions, and `PUT` to update settings. Each returns JSON plus an HTTP status.

**Evidence:** `backend/app/routes/analytics.py:37-66`; `backend/app/routes/batches.py:55-576`.

## Authentication, authorization, and tenant isolation

### 6. How does the backend authenticate a user?

The auth routes log a user in and establish session/token state; protected route decorators then load the current user before the endpoint executes.

**Evidence:** `backend/app/routes/auth.py:12-112`; `backend/app/utils/auth.py:6-55`.

### 7. What is RBAC, and where is it used?

RBAC means role-based access control. Endpoints declare allowed roles such as `MAKER`, `CHECKER`, or `ADMIN`; the decorator rejects users outside the allowed role set.

**Evidence:** `backend/app/utils/auth.py:6-55`; `backend/app/routes/analytics.py:13-60`; `backend/app/routes/admin.py:18-45`.

### 8. How does the project stop Company A from reading Company B data?

`require_tenant()` compares requested company scope with the authenticated user’s authorized company. Service/database queries also filter by `company_id`. This is defence in depth.

**Evidence:** `backend/app/utils/auth.py:56-82`; `backend/app/services/forecasting_service.py:45-52`; `backend/tests/test_tenant_isolation.py`; `backend/tests/test_forecasting.py:76-93`.

### 9. Why should authorization be checked on the server even if the frontend hides buttons?

Frontend controls are only user-interface convenience and can be bypassed by manual HTTP requests. Server decorators are the actual security enforcement point.

**Evidence:** `backend/app/routes/analytics.py:37-60`; `backend/app/utils/auth.py:6-82`.

## Data model and database

### 10. Why use SQLAlchemy models instead of handwritten SQL in every route?

Models centralize table mappings, relationships, validation helpers, and serialization. They allow route/service code to query objects consistently and reduce repeated SQL.

**Evidence:** `backend/app/models/models.py:1-514`; `backend/app/extensions.py:1-5`.

### 11. What does `company_id` represent across tables?

It is the tenant key. It associates records such as wallets, payroll history, forecasts, and alerts with exactly one corporate customer.

**Evidence:** `backend/app/models/models.py:73-110`, `348-501`; `database/schema/01_create_schema.sql`.

### 12. Why are financial database columns stored as `Numeric` but converted to `float` for API responses?

`Numeric`/decimal storage avoids common binary floating-point accounting errors in persistent financial data. JSON responses and numeric forecasting libraries often need ordinary Python numbers, so conversion occurs at the service/API boundary.

**Evidence:** `backend/app/models/models.py:11`, `396-404`; `backend/app/routes/analytics.py:27`, `32`; `backend/app/services/forecasting_service.py:51`, `148-149`, `257`.

### 13. What is the difference between `LiquidityForecast`, `ForecastRun`, and `ForecastRunResult`?

`LiquidityForecast` is the current forecast cache for the UI. `ForecastRun` records metadata for each model execution. `ForecastRunResult` saves an immutable result per month for that execution, making historic output auditable.

**Evidence:** `backend/app/models/models.py:390-501`; `backend/app/services/forecasting_service.py:197-215`.

### 14. What is a database transaction and why is it important here?

A transaction groups related writes. On successful refresh the run, cache, audit snapshots, and alerts commit together; if anything fails, the service rolls back incomplete work, records the failure, and re-raises it.

**Evidence:** `backend/app/services/forecasting_service.py:199-221`.

### 15. What does `flush()` do, and why does refresh call it before adding result rows?

`flush()` sends pending inserts to the database without committing. This allocates `ForecastRun.id`, which child `ForecastRunResult` rows need as a foreign key.

**Evidence:** `backend/app/services/forecasting_service.py:201-203`, `213`; `backend/app/models/models.py:478-488`.

## Payroll, validation, risk, and wallet management

### 16. How does a payroll file enter the system?

The batch upload endpoint accepts structured upload data, parses/validates payroll values, creates batch and batch-item records, and records workflow/audit information. Spreadsheet parsing is isolated in a service.

**Evidence:** `backend/app/routes/batches.py:55-237`; `backend/app/services/excel_parser.py:40-100`; `frontend/src/components/UploadTab.tsx`.

### 17. Where are employee phone/payment details validated?

Validation logic is separated into `validation_service.py`; upload and correction routes call it as part of their workflow.

**Evidence:** `backend/app/services/validation_service.py:1-25`; `backend/app/routes/batches.py:55-237`, `345-459`.

### 18. How are anomalies/risk alerts created?

The anomaly service evaluates batch items against expected patterns and marks/analyzes suspicious records. Risk alerts can then be created and later reviewed through risk-alert endpoints.

**Evidence:** `backend/app/services/anomaly_service.py:6-129`; `backend/app/routes/risk_alerts.py:10-116`; `backend/app/models/models.py:313-345`.

### 19. How does the application avoid wallet race conditions?

Wallet and execution code performs controlled balance updates and the test suite includes concurrent-wallet coverage. Explain that this is essential because two executions must not both spend the same balance.

**Evidence:** `backend/app/services/disbursement_service.py:69-156`; `backend/app/routes/companies.py:106-180`; `backend/tests/test_wallet_concurrency.py`.

### 20. What happens after an executed payroll?

Its actual payments are written to `PayrollHistory`, then the company forecast is refreshed. A forecast never treats an unexecuted draft as actual payroll history.

**Evidence:** `backend/app/services/disbursement_service.py:69-156`; `backend/tests/test_forecasting.py:95-120`; `backend/app/services/forecasting_service.py:45-52`.

## Forecasting

### 21. Is this AI/LLM forecasting?

No. It is statistical time-series forecasting. It learns from numerical monthly payroll totals using SES, Holt, and Holt-Winters algorithms. It does not call a chatbot or external generative-AI provider.

**Evidence:** `docs/architecture/forecasting_architecture.md:9-13`, `63-63`; `backend/app/services/forecasting_service.py:65-132`.

### 22. How are individual payroll payments converted into forecasting data?

`build_monthly_series` reads a single company’s payroll history, normalizes each disbursement date to its month, and sums all gross salaries in that month.

**Evidence:** `backend/app/services/forecasting_service.py:32-52`.

### 23. Explain when the system chooses BASELINE, SES, Holt, and Holt-Winters.

0-2 months uses baseline; 3-5 uses SES; 6-23 uses Holt; 24+ uses additive Holt-Winters. More complex models need more observations to estimate their extra components responsibly.

**Evidence:** `backend/app/services/forecasting_service.py:55-62`; `docs/architecture/ml_liquidity_forecasting_implementation.md:132-144`.

### 24. Explain SES with its formula.

SES updates one smoothed level: `level_t = alpha * actual_t + (1-alpha) * level_(t-1)`. It searches candidate alpha values and selects the one with lowest squared historical one-step errors. Future forecasts equal the final level.

**Evidence:** `backend/app/services/forecasting_service.py:65-80`.

### 25. What do alpha, beta, and gamma mean?

Alpha smooths level, beta smooths trend, and gamma smooths seasonal effects. SES uses alpha; Holt uses alpha/beta; Holt-Winters uses all three.

**Evidence:** `backend/app/services/forecasting_service.py:83-103`, `116-131`; `docs/architecture/ml_liquidity_forecasting_implementation.md:93-118`.

### 26. Why is a native fallback implemented if Statsmodels exists?

The service remains functional if the optional package is unavailable. Statsmodels is preferred for mature optimized fitting; the native implementation grid-searches reasonable smoothing values.

**Evidence:** `backend/app/services/forecasting_service.py:20-25`, `65-113`, `116-131`.

### 27. How is model quality measured?

Walk-forward backtesting repeatedly trains on earlier months, forecasts one held-out actual month, and calculates MAE and MAPE. At least three validation folds are required before metrics are shown.

**Evidence:** `backend/app/services/forecasting_service.py:135-151`; `docs/architecture/ml_liquidity_forecasting_implementation.md:287-303`.

### 28. How is forecast uncertainty calculated?

The service takes standard deviation of model residuals and forms an approximate 95% prediction interval: prediction ± `1.96 × residual standard deviation`, with a zero lower limit.

**Evidence:** `backend/app/services/forecasting_service.py:154-156`; `docs/architecture/ml_liquidity_forecasting_implementation.md:123-130`.

### 29. Why is a forecast cache used?

The read endpoint should be fast and repeatable; it should not retrain/write the model every time a dashboard opens. Refresh performs training/persistence, while GET only reads cached rows.

**Evidence:** `backend/app/routes/analytics.py:37-55`; `backend/app/services/forecasting_service.py:197-221`, `236-257`; `backend/tests/test_forecasting.py:42-55`.

### 30. How is top-up requirement calculated?

It is the positive funding gap: `max(0, predicted_amount - current_main_wallet_balance)`. A negative gap becomes zero because no top-up is required.

**Evidence:** `backend/app/services/forecasting_service.py:247-255`; `docs/architecture/forecasting_architecture.md:115-123`.

### 31. How does the festival bonus work without corrupting base model data?

The base forecast is persisted unchanged. When a response is read, a copied payload gets the configured bonus added only to selected months; the response also records the assumption. This enables per-request inclusion without retraining.

**Evidence:** `backend/app/services/forecasting_service.py:224-233`, `236-257`; `backend/tests/test_forecasting.py:57-73`.

### 32. When does a high-forecast-error alert occur?

Only when MAPE is above 15%, at least six backtest folds exist, and no pending duplicate alert already exists for that company. The alert prompts review; it does not block payroll execution.

**Evidence:** `backend/app/services/forecasting_service.py:189-195`; `docs/architecture/forecasting_architecture.md:180-192`.

## API and frontend

### 33. How does the frontend call the forecast API?

The API client wraps HTTP calls. The maker page fetches the current forecast, requests a refresh when the user presses Refresh, and passes the result into `AnalyticsTab`.

**Evidence:** `frontend/src/lib/api.ts`; `frontend/src/app/maker/maker.tsx:84-85`, `186-203`, `366`; `frontend/src/components/AnalyticsTab.tsx:99-257`.

### 34. What does React state do in the analytics component?

It stores editable planning baseline, bonus amount, selected months, inclusion option, UI messages, and the forecast data passed from its parent. When state changes, React re-renders the relevant view.

**Evidence:** `frontend/src/components/AnalyticsTab.tsx:99-140`.

### 35. How does the UI display the funding gap?

For each returned forecast item it uses `topup_required` and `current_balance` supplied by the backend. The progress display and alert state are visual representations of these server-calculated values.

**Evidence:** `frontend/src/components/AnalyticsTab.tsx:244-251`; `backend/app/services/forecasting_service.py:247-257`.

### 36. Why are TypeScript types useful here?

They document expected API object fields and allow the compiler/editor to catch mismatches such as reading a missing forecast property before runtime.

**Evidence:** `frontend/src/types/index.ts`; `frontend/src/lib/api.ts`; `frontend/src/components/AnalyticsTab.tsx:30-36`.

## Testing and code-quality questions

### 37. What does a forecast API test prove?

It inserts known payroll history, calls the real route, and asserts model selection, output count, non-negative values, accuracy fields, and persisted audit records. This tests behavior rather than only isolated functions.

**Evidence:** `backend/tests/test_forecasting.py:7-40`.

### 38. What test proves tenant isolation for forecasts?

The test adds payroll records for a second company, refreshes company 1, and verifies company 1 still reports only its six months of history.

**Evidence:** `backend/tests/test_forecasting.py:76-93`.

### 39. How would you test the 24-month seasonal branch?

Seed at least 24 months (the project uses 27), refresh, and assert `HOLT_WINTERS_ADDITIVE`, `READY`, and a non-null MAPE. The existing test is the answer.

**Evidence:** `backend/tests/test_forecasting.py:135-159`.

### 40. What improvements would you propose?

Good answers: schedule refresh asynchronously after successful execution; add a formal migration history; improve interval methods through calibrated residual/bootstrap approaches; add monitoring for model drift; add unit tests for missing months and malformed cache periods; and make sure role requirements match business policy. Any improvement must preserve tenant isolation, auditability, and advisory-only forecasting.

**Evidence/context:** `docs/architecture/forecasting_architecture.md:131-206`; `backend/app/services/forecasting_service.py:197-257`; `backend/tests/test_forecasting.py`.

## Rapid coding exercises with model answers

### A. Add a maximum forecast horizon of 12 months

**Answer already implemented:** clamp a requested `horizon` using `min(max(value, 1), 12)`.

**Where:** `backend/app/routes/analytics.py:41` for GET and `:51` for refresh.

### B. Reject a negative bonus amount

**Answer already implemented:** convert amounts to floats and raise `ValueError` if baseline or bonus is below zero.

**Where:** `backend/app/services/forecasting_service.py:265-271`.

### C. Remove duplicate festival months and preserve predictable order

**Answer already implemented:** `sorted(set(months))`.

**Where:** `backend/app/services/forecasting_service.py:273`.

### D. Ensure a forecast amount cannot be negative

**Answer already implemented:** clamp predictions/bounds with `max(0.0, value)` before returning/saving.

**Where:** `backend/app/services/forecasting_service.py:156`, `185`, `255`.

### E. Return a correct unavailable state when cache is empty

**Answer already implemented:** return model type/status `UNAVAILABLE`, empty forecast lists, and actual history/settings.

**Where:** `backend/app/services/forecasting_service.py:249-250`.

### F. Prevent duplicate pending accuracy alerts

**Answer already implemented:** query existing pending `HIGH_FORECAST_ERROR` alert before adding a new one.

**Where:** `backend/app/services/forecasting_service.py:189-195`.

### G. Preserve forecast audit history when the current cache is overwritten

**Answer already implemented:** update/create `LiquidityForecast` but also insert a new `ForecastRunResult` attached to each new `ForecastRun`.

**Where:** `backend/app/services/forecasting_service.py:201-215`; `backend/app/models/models.py:390-488`.

### H. Add a new model strategy safely

**Suggested answer:** (1) add a strategy rule in `select_forecast_strategy`; (2) implement a fitter or library configuration; (3) add it to `_fit_values`; (4) set its backtest training minimum; (5) document assumptions; (6) create API-level tests using enough data. Never silently fall through an unsupported strategy.

**Starting locations:** `backend/app/services/forecasting_service.py:55-62`, `116-132`, `135-151`; `backend/tests/test_forecasting.py`.

### I. Write a test proving GET does not retrain the model

**Answer already implemented:** refresh once, count `ForecastRun` records, call GET, and assert the count is unchanged.

**Where:** `backend/tests/test_forecasting.py:42-55`.

### J. Explain how you would fix a refresh failure without losing the last good result

**Answer already implemented:** roll back incomplete writes, record the failed run, re-raise so the client sees failure, and leave old cached rows intact.

**Where:** `backend/app/services/forecasting_service.py:217-221`; `backend/app/routes/analytics.py:50-55`.
