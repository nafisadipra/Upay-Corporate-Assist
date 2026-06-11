# Data-Driven Liquidity Forecasting: Implementation Design

## Status and purpose

This document describes how to replace the current fixed-rule liquidity forecast with an explainable, data-driven time-series forecast. It is an implementation plan for the existing Flask backend and Next.js admin application.

The goal is to answer one operational question for each company:

> How much should the company have available in its main wallet for each upcoming payroll cycle?

This is statistical machine learning / time-series forecasting. It does not use a chatbot or an LLM. The model learns patterns from completed payrolls and produces a forecast with an uncertainty range.

## Current implementation

### What works today

- `PayrollHistory` stores one record for every approved batch item after the batch is executed.
- `generate_liquidity_forecast(company_id)` aggregates those records into monthly totals.
- `GET /api/analytics/liquidity-forecast/<company_id>` returns three future values.

### What is not data-driven today

The current code in `backend/app/services/forecasting_service.py` calculates:

```text
monthly_average = mean(monthly payroll totals)

September forecast = monthly_average × 1.05
October forecast   = monthly_average × 1.08
November forecast  = monthly_average × 1.12

top-up required = max(0, forecast − current wallet balance)
```

The three multipliers, three month names, fallback amount of BDT 5,000,000, and 0.95 confidence score are fixed constants. This is a business rule, not a trained model. The current Forecast screen also contains static chart and breakdown values that need to be replaced with API data.

## Decision

Use a per-company, additive Holt-Winters model when enough history exists. It is the first production model because it is:

- easy to explain to finance and audit teams;
- well suited to a monthly payroll series with growth and recurring calendar effects;
- small enough to run in the existing Flask service without separate AI infrastructure;
- more reliable than a neural network for the initially small amount of company data.

The model should never mix one company's payroll data with another company's data. This maintains tenant isolation and prevents one client's salary pattern from influencing another client's forecast.

## Data flow

```text
Executed payroll batch
        ↓
PayrollHistory rows (one per employee payment)
        ↓
Aggregate by company + calendar month
        ↓
Choose model based on available history
        ↓
Fit model and create 3-month forecast + interval
        ↓
Save forecast run/results
        ↓
Analytics API → Admin Forecast screen and Dashboard
```

`backend/app/services/otp_service.py` already writes `PayrollHistory` after a batch reaches `EXECUTED`. No new employee-level collection is needed for the first release.

## Forecasting method

### Input series

For each company, group completed `PayrollHistory` records by the month of `disbursement_date`:

```text
2026-01 → total paid in January
2026-02 → total paid in February
...
```

Months without an executed payroll must be represented explicitly as either `0` or a missing month, according to the business meaning:

- use `0` only when payroll was intentionally not paid that month;
- use a missing month when the data is incomplete or the company was not live yet.

This distinction must be preserved because treating missing data as zero would falsely lower a forecast.

### Exponential smoothing

Simple Exponential Smoothing produces a smoothed estimate of the current monthly level:

```text
level(t) = α × actual(t) + (1 − α) × level(t − 1)
forecast(t + 1) = level(t)
```

`α` is a learned value from 0 to 1. Higher values react quickly to recent payroll changes; lower values are steadier.

### Holt trend model

When there is enough history to establish growth or decline, Holt's method adds a trend:

```text
level(t) = α × actual(t) + (1 − α) × [level(t − 1) + trend(t − 1)]
trend(t) = β × [level(t) − level(t − 1)] + (1 − β) × trend(t − 1)
forecast(t + h) = level(t) + h × trend(t)
```

`β` controls how quickly the estimated trend changes, and `h` is the number of months ahead.

### Holt-Winters seasonal model

With at least two years of monthly data, Holt-Winters adds a yearly seasonal effect. The initial release uses the additive form because payroll bonuses are usually an additional BDT amount rather than a pure percentage.

```text
forecast(t + h) = level(t) + h × trend(t) + season(t + h − 12)
```

The model estimates `α`, `β`, and the seasonal smoothing weight `γ` by minimizing historical forecast error. This parameter fitting is the learning step; no values are hard-coded per month.

### Confidence interval

The API must return a prediction interval, not a fixed confidence score. A simple initial interval is based on the residual error from back-testing:

```text
lower bound = forecast − 1.96 × residual standard deviation
upper bound = forecast + 1.96 × residual standard deviation
```

The value is clipped at zero because a payroll funding requirement cannot be negative. The UI must label this as an estimated 95% prediction interval and show that it is wider when past payroll is volatile.

## Model selection and cold start

| Completed monthly observations | Model | User-facing behavior |
| --- | --- | --- |
| 0–2 | No trained model | Show "Insufficient history" and a manually configured planning baseline. Do not call it AI. |
| 3–5 | Simple Exponential Smoothing (`SES`) | Forecast, marked as limited-history. No estimated trend or yearly seasonality. |
| 6–23 | Holt trend model (`HOLT`) | Forecast with a learned trend, marked as no-yearly-seasonality. |
| 24+ | Additive Holt-Winters with 12-month seasonality | Full seasonal forecast and prediction interval. |

For the first implementation, keep a configurable company-level planning baseline for new companies. The current BDT 5,000,000 fallback must not be silently presented as a learned result. Do not apply a manual calendar-event adjustment until the configuration described below is implemented; a short-history Holt forecast must state that it does not yet learn annual festival effects.

### Festival and calendar-event adjustments

Holt-Winters learns recurring seasonal effects only after at least 24 monthly observations. For a company with less history, an authorized administrator may later add an explicit planning adjustment. Add a `company_forecast_settings` table with these fields:

```text
company_id (unique), planning_baseline_amount, include_festival_bonus,
festival_bonus_amount, festival_bonus_months JSON, configured_by,
updated_at
```

When enabled, the deterministic adjustment is:

```text
adjusted forecast = model forecast + festival_bonus_amount
```

only for a forecast month contained in `festival_bonus_months`. The API must include this as an assumption. The existing "Include Festival Bonuses" control stays disabled or hidden until this configuration exists; once enabled, it must call the API with a real option and re-render the returned forecast.

## Proposed backend changes

### Dependencies

Add `statsmodels` to `backend/requirements.txt`. It provides a tested implementation of exponential smoothing and Holt-Winters. Keep `numpy` for aggregation and interval calculations.

```text
statsmodels>=0.14.0
```

### New forecasting service responsibilities

Refactor `backend/app/services/forecasting_service.py` into testable functions:

```python
build_monthly_series(company_id) -> MonthlySeries
select_forecast_strategy(series) -> Strategy
fit_forecast(series, horizon=3) -> ForecastResult
calculate_prediction_interval(series, forecast) -> Interval
save_forecast_run(company_id, result) -> ForecastRun
```

`fit_forecast` must return the following information for each period:

- `forecast_period` (ISO month, for example `2026-10`);
- `predicted_amount`;
- `lower_bound` and `upper_bound`;
- `model_type` (`BASELINE`, `SES`, `HOLT`, or `HOLT_WINTERS_ADDITIVE`);
- `history_months` used;
- error metrics from the most recent back-test;
- `assumptions`, sourced only from the persisted, audited company forecast configuration.

### Database design

Keep the existing `liquidity_forecasts` table as the cached, user-facing forecast results. Add enough metadata to make every forecast auditable.

```text
liquidity_forecasts (current cached result; one row per company and period)
  id                           INTEGER primary key
  company_id                   INTEGER foreign key
  forecast_period              DATE or YYYY-MM string
  predicted_amount             NUMERIC(15,2)
  lower_bound                  NUMERIC(15,2)
  upper_bound                  NUMERIC(15,2)
  model_type                   VARCHAR(50)
  history_months               INTEGER
  mape                         NUMERIC(8,4), nullable
  confidence_level             NUMERIC(5,2)  -- e.g. 0.95
  assumptions                  JSON
  generated_at                 DATETIME
  source_data_through          DATE
  UNIQUE(company_id, forecast_period)

forecast_runs (new table)
  id, company_id, model_type, history_months, mape,
  started_at, completed_at, status, error_message, parameters JSON

forecast_run_results (new immutable result snapshot)
  id, forecast_run_id, forecast_period, predicted_amount,
  lower_bound, upper_bound, assumptions JSON, source_data_through
```

Update the single current row in `liquidity_forecasts` for each `(company_id, forecast_period)` and store its `forecast_run_id`. Preserve the complete per-period output in immutable `forecast_run_results`, linked to `forecast_runs`, including bounds, assumptions, and source cutoff. This provides one clear current result for the UI and a fully reconstructible audit trail. The migration must preserve existing seeded results but identify them as `LEGACY_RULE_BASED`.

Create this as a numbered SQL migration in `database/`, consistent with the project’s existing schema migrations. The backend maintainer owns applying it. Backfill existing forecast rows with `model_type = 'LEGACY_RULE_BASED'`, `history_months = NULL`, and no prediction bounds; do not manufacture historical confidence values.

### Refresh behavior

1. When a batch executes, commit the new `PayrollHistory` rows first.
2. Mark the company's forecast cache as stale.
3. Recalculate after the transaction succeeds. Initially this runs synchronously because each company has a small monthly series; the refresh must be idempotent and keyed to the latest committed payroll-history cutoff.
4. Return the last known forecast while a future background job is running, once the system grows.

Do not re-fit and write the model on every dashboard page view. The current `GET` route generates and persists forecasts on read; Phase 2 changes it to read a cached result. Phase 2 also adds the post-execution refresh hook. Add `POST /api/analytics/liquidity-forecast/<int:company_id>/refresh` for an on-demand refresh. It requires the same tenant check plus an `ADMIN` role; a corporate user receives the refreshed cached value after the approved refresh process.

## API contract

Keep the existing endpoint and expand its response:

```http
GET /api/analytics/liquidity-forecast/<int:company_id>?horizon=3
```

```json
{
  "company_id": 1,
  "generated_at": "2026-08-31T14:00:00Z",
  "source_data_through": "2026-08-01",
  "model": {
    "type": "HOLT_WINTERS_ADDITIVE",
    "history_months": 28,
    "mape": 4.8,
    "confidence_level": 0.95,
    "status": "READY"
  },
  "forecasts": [
    {
      "period": "2026-09",
      "predicted_amount": 5700000.0,
      "lower_bound": 5250000.0,
      "upper_bound": 6150000.0,
      "current_balance": 4900000.0,
      "topup_required": 800000.0,
      "assumptions": ["Annual festival pattern learned from 2 prior years"]
    }
  ]
}
```

The endpoint must retain the current tenant authorization checks. An admin can request any authorized company; a corporate user can request only their own company.

## Frontend changes

Update `upay-admin/src/app/forecast/Forecast.tsx` so every visual derives from the API response.

- Pass real historical and forecast points into `ForecastComboChart`; remove fixed Jan–Dec arrays.
- Render the model type, data-through date, history length, and MAPE near the chart.
- Replace the static BDT 5.7M card, preload date, and breakdown rows with current company data.
- Draw a shaded confidence band from `lower_bound` to `upper_bound` around future points.
- Make the "Include Festival Bonuses" control a real forecast assumption, stored in the request or company forecast configuration; it must not only change an icon.
- Clearly label baseline and limited-history forecasts so users do not mistake a default for a trained forecast.

The dashboard may continue to aggregate each company's `predicted_amount`, but it must not sum confidence scores. It should display the aggregate funding gap separately from model accuracy.

## Validation and model monitoring

### Back-testing

Before showing a model as ready, use rolling-origin back-testing:

1. Fit using months 1 through `n`.
2. Forecast month `n + 1`.
3. Compare forecast with the actual value.
4. Repeat for every eligible month, with a minimum of three folds before reporting an error metric.

Calculate:

```text
MAE  = mean(abs(actual − forecast))
MAPE = mean(abs((actual − forecast) / actual)) × 100
```

Use MAPE only when actual values are non-zero. Store MAE in all cases. If fewer than three valid non-zero folds exist, return `mape: null` and label the metric as insufficient data instead of substituting a number.

A model may still return a forecast at its selection threshold, but its API status is `LIMITED_VALIDATION` until it has three folds. In particular, Holt-Winters can first fit at 24 monthly observations but needs at least 27 observations to back-test three one-month forecasts from an initial 24-month seasonal training window. The UI must not show an accuracy percentage while status is `LIMITED_VALIDATION`.

### Acceptance criteria

- A forecast uses only completed, tenant-owned payroll history.
- A new forecast is generated after a successful payroll execution.
- The model selection matches the available history thresholds.
- The forecast API provides the actual model type and interval values.
- For a seeded deterministic data set, model output is repeatable.
- The UI contains no hard-coded forecast chart, summary, or table values.
- Back-test metrics are visible to admins and saved for audit.
- Existing rule-based forecasts remain available during migration, clearly labelled as legacy.

### Alerts

Create an admin-visible alert when either condition holds:

- latest actual payroll falls outside the 95% prediction interval; or
- rolling MAPE exceeds an agreed threshold, initially 15% after at least six back-test points.

An alert indicates that the model needs review; it must never block payroll execution automatically.

## Implementation phases

### Phase 1 — Truthful analytics and data readiness

1. Replace hard-coded forecast screen values with the existing API output.
2. Fix dynamic forecast months and remove the fixed 0.95 label.
3. Add tests proving executed payrolls appear in monthly aggregation.
4. Add explicit baseline configuration for companies with little or no history.

### Phase 2 — Statistical model

1. Add the migration and forecast-run audit tables/columns.
2. Implement monthly aggregation and the SES/Holt/Holt-Winters strategy selection.
3. Add back-testing, interval calculation, cached forecast results, and API metadata.
4. Change the GET endpoint to cached reads and refresh forecasts after each committed payroll execution.
5. Unit-test each history threshold, refresh idempotency, and tenant-isolation behavior.

### Phase 3 — Product integration and monitoring

1. Build the dynamic chart, confidence band, forecast breakdown, and model explanation in the admin UI.
2. Add accuracy and out-of-range monitoring for admins.
3. Run both legacy and model forecasts in parallel for at least three payroll cycles; compare error before retiring the legacy formula.

## Non-goals for the first release

- LLMs, chatbots, and generative AI;
- deep learning or neural networks;
- automatically approving, rejecting, or blocking payroll based on a forecast;
- pooling confidential payroll data across companies;
- claiming accuracy before enough actual payroll outcomes exist.

## Open product decisions

The implementation needs these business decisions before Phase 2 is enabled in production:

1. Whether a missing payroll month means no payroll or unavailable data.
2. Who may configure a new company's baseline and festival assumptions.
3. Whether forecast output is required at monthly, biweekly, or exact payroll-cycle granularity.
4. The acceptable forecast error threshold for an admin warning.
5. The production schedule for forecast refreshes and the expected number of companies.
