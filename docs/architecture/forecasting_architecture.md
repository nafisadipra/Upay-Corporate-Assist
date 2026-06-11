# Forecasting Architecture

## Purpose

This document describes the target architecture for reliable, tenant-isolated liquidity forecasting in Upay Corporate Assist. It complements the detailed implementation plan in [ML Liquidity Forecasting Implementation](ml_liquidity_forecasting_implementation.md).

The architecture supports three outcomes:

1. forecast upcoming payroll funding requirements for a single company;
2. explain the source, model, and uncertainty of every result;
3. preserve auditability and strict separation between companies.

The initial model is statistical time-series forecasting (SES, Holt, and Holt-Winters), not an LLM or generative AI service.

## Current and target state

### Current state

```text
PayrollHistory → fixed monthly average → fixed month multiplier → Forecast API
```

The service currently creates a new forecast whenever the API is read. It uses hard-coded future periods and seasonal multipliers.

### Target state

```text
Completed payroll batch
        ↓
Payroll history store ─────────────→ Forecast refresh service
        ↓                                      ↓
Company wallet balance                     Model selection + fit
        ↓                                      ↓
            Forecast cache + immutable run audit
                              ↓
                 Analytics API / Admin UI
```

The target changes the forecast from a fixed formula to a model fitted only from the selected company's completed payroll history. The API reads a cached forecast; it does not train a model during every page load.

## System context

```text
┌──────────────────────┐        ┌───────────────────────────┐
│ Corporate maker /    │        │ Upay administrator        │
│ checker              │        │                           │
└─────────┬────────────┘        └─────────────┬─────────────┘
          │ completed payroll / forecast view │ forecast view / refresh
          └────────────────┬──────────────────┘
                           ↓
              ┌─────────────────────────┐
              │ Upay Corporate Assist    │
              │ Next.js + Flask          │
              └────────────┬────────────┘
                           ↓
              ┌─────────────────────────┐
              │ Application database     │
              │ tenant-scoped payroll,   │
              │ wallet, and forecast data│
              └─────────────────────────┘
```

There is no external AI provider in this architecture. The forecasting library runs inside the backend process and accesses only database data authorized for the requested company.

## Container architecture

| Container | Existing / new | Responsibility |
| --- | --- | --- |
| Next.js admin UI | Existing | Presents forecast chart, model explanation, interval, and funding recommendation. |
| Flask analytics API | Existing, extended | Authorizes requests and returns cached forecast data. |
| Forecast refresh service | Existing service, refactored | Aggregates payroll history, selects and fits the model, back-tests it, and saves results. |
| Relational database | Existing, extended | Stores payroll history, wallet balances, current forecast cache, configuration, and immutable forecast-run audits. |
| Background job runner | Future scaling option | Runs refreshes outside the API request when company volume or history grows. Not needed for the first release. |

## Component architecture

```text
                           ┌─────────────────────┐
                           │ Forecast screen      │
                           │ Dashboard             │
                           └──────────┬───────────┘
                                      │ GET cached forecast
                                      ↓
┌──────────────────────────────────────────────────────────────────┐
│ Analytics route                                                    │
│ - authentication and tenant authorization                          │
│ - reads cached current forecast                                    │
│ - returns data, interval, model metadata and assumptions           │
└─────────────────────────────┬────────────────────────────────────┘
                              │
              ┌───────────────┴────────────────┐
              ↓                                ↓
┌─────────────────────────┐      ┌──────────────────────────┐
│ Forecast result store    │      │ Refresh route / event     │
│ liquidity_forecasts      │      │ after payroll execution   │
└─────────────────────────┘      └────────────┬─────────────┘
                                                ↓
                                  ┌──────────────────────────┐
                                  │ Forecasting service       │
                                  │ - aggregate months        │
                                  │ - select model            │
                                  │ - fit and back-test       │
                                  │ - create interval         │
                                  └───────┬──────────┬───────┘
                                          ↓          ↓
                             ┌────────────────┐  ┌────────────────┐
                             │ PayrollHistory │  │ CentralWallet  │
                             └────────────────┘  └────────────────┘
```

## Core data model

### Source data

`PayrollHistory` is the source of truth for a model. It is written only after a payroll batch has reached `EXECUTED`. The forecasting service aggregates employee payments into a company-month total.

`CentralWallet` provides the main-wallet balance used to calculate a funding recommendation:

```text
top-up required = max(0, forecast − available main-wallet balance)
```

### Forecast data

`liquidity_forecasts` stores the current forecast for every company and future month. It includes the predicted amount, lower and upper bounds, model type, source-data cutoff, accuracy metrics, and assumptions.

`forecast_runs` is append-only audit history. It records when a model ran, which strategy and parameters it used, how much history it saw, its error metrics, and any failure. `forecast_run_results` stores an immutable snapshot of each period’s amount, bounds, assumptions, and source-data cutoff for that run. The UI reads the current cache; audit and support workflows can reconstruct any prior displayed result from the run and its results.

`company_forecast_settings` stores approved planning inputs for companies with insufficient data, including the optional festival-bonus amount and the months in which it applies.

## Forecast generation lifecycle

```text
1. Batch is approved and executed.
2. Transaction writes payroll-history rows and updates wallet balance.
3. Transaction commits successfully.
4. Forecast cache is marked stale.
5. Refresh service loads only that company’s history.
6. Service aggregates totals by calendar month.
7. Service selects baseline, SES, Holt, or Holt-Winters from data length.
8. Service back-tests the selected model and calculates an interval. If fewer than three valid test folds exist, it labels the result `LIMITED_VALIDATION`.
9. Service updates the current forecast cache and appends a forecast-run audit record.
10. UI reads the cached result and displays its data-through date.
```

The write to `PayrollHistory` must finish before a forecast refresh begins. A failed batch execution must never refresh a forecast as if a payroll had happened.

## Model selection boundary

| History available | Strategy | Meaning |
| --- | --- | --- |
| 0–2 completed months | Configured baseline | Planning estimate only; never labelled trained or AI. |
| 3–5 months | Simple Exponential Smoothing | Learns the current level. |
| 6–23 months | Holt trend | Learns level and payroll growth/decline. |
| 24+ months | Additive Holt-Winters | Learns level, trend, and a 12-month seasonal pattern; remains `LIMITED_VALIDATION` until 27 months allow three back-test folds. |

Model fitting is limited to the selected company's monthly totals. It produces a forecast and a prediction interval; it never approves or blocks a payment.

## API boundaries

| Endpoint | Caller | Responsibility |
| --- | --- | --- |
| `GET /api/analytics/liquidity-forecast/<int:company_id>?horizon=3` | Authorized UI | Return cached forecasts, model metadata, bounds, and funding gap. |
| `POST /api/analytics/liquidity-forecast/<int:company_id>/refresh` | Authorized admin process | Run an on-demand forecast refresh. |
| Payroll execution flow | Checker-approved payment workflow | Records actual payroll history and marks forecast cache stale after success. |

The `GET` endpoint is read-only. The refresh endpoint is explicitly privileged and is the only API-triggered path that runs a model outside the normal post-execution refresh.

Phase 2 changes the `GET` endpoint to cached reads and adds the synchronous, idempotent post-execution refresh hook. The hook keys each result to the latest committed payroll-history cutoff, so a concurrent older refresh cannot overwrite a newer result. A queue worker replaces only the execution mechanism at scale; it does not change this contract.

## Security, privacy, and audit

- All queries include `company_id`; a model is fitted one company at a time.
- Existing `require_auth` and tenant authorization remain mandatory for every forecast endpoint.
- Corporate users can only view their own company. An Upay admin can refresh a selected authorized company.
- Do not send payroll data to a third-party AI service in the first release.
- Save model type, data cutoff, history count, assumptions, accuracy, and generated time with each result.
- Never make an automated payout decision from a forecast. A forecast is advisory only.

### Forecast monitoring component

The forecast refresh service creates a `forecast_alerts` record when a completed payroll is outside its prior interval or model error crosses the agreed threshold. The analytics API exposes these alerts to the admin UI. Alerts are review prompts only and have no connection to the batch approval or execution path.

## Availability and failure behavior

| Situation | System behavior |
| --- | --- |
| Insufficient payroll history | Return a clearly labelled configured baseline and a `LIMITED_HISTORY` status. |
| Model fitting fails | Keep and return the last successful cached forecast with a stale indicator; save failure details in `forecast_runs`. |
| No cached forecast exists | Return an explicit unavailable state, not fabricated values. |
| New completed payroll exists | Mark cache stale and refresh after the transaction commits. |
| Forecast is materially inaccurate | Write a `forecast_alerts` review record for the admin UI; do not block payroll. |

## Deployment and scalability

The first release runs the refresh service within Flask because the input is a compact monthly series per company. It should be called after payroll execution or by the privileged refresh endpoint, never on normal page reads.

When refresh work becomes slow or the number of companies increases, move step 5–9 of the lifecycle to a queue worker. The API, data schema, model interface, and cached-result contract remain the same, so this is an operational change rather than a frontend rewrite.

## Architecture decisions

1. **Statistical time-series model first.** It is auditable and fits the amount of data better than deep learning.
2. **Per-company model.** It protects tenant separation and keeps results explainable.
3. **Cached reads, explicit refresh.** It prevents a dashboard view from changing data or creating repeated write load.
4. **Current result plus immutable runs.** The UI stays simple while support and audit teams retain history.
5. **Advisory-only forecast.** Human financial approval and existing maker-checker controls remain the decision system.

## Approval gate

No application code is changed by this architecture document. Once approved, implement the phases and acceptance criteria in [ML Liquidity Forecasting Implementation](ml_liquidity_forecasting_implementation.md), starting with Phase 1: replacing hard-coded Forecast page values with the current API response.
