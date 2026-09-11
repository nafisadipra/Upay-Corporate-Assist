# `backend/app/routes/analytics.py` — beginner line guide

**Job:** Builds dashboard totals and payroll forecasts. Base URL: `/api/analytics`.

## Setup — lines 1–11

- **1:** Imports Flask response, request, and logged-in-user helpers.
- **2:** Imports `Decimal`, used for money so totals do not get floating-point rounding errors.
- **3:** Imports the database tables used for company, wallet, payroll, and risk data.
- **4–8:** Imports forecast-service functions. The calculation/caching lives in `app/services/forecasting_service.py`, not in this route file.
- **9:** Imports login and company-boundary guards.
- **11:** Creates the `/api/analytics` blueprint.

## `GET /disbursement-history/<company_id>` — lines 14–45

- **14–16:** Creates the route and requires a Maker, Checker, or Admin plus tenant permission.
- **17–19:** Starts the function, explains its purpose, and returns `404` if the company row is absent.
- **21:** Makes an empty dictionary that will hold one money total per `YYYY-MM` month.
- **22–24:** Reads that company’s executed payroll batches. It uses `payroll_period`, or the execution date if the period is missing.
- **25–26:** Skips a batch that has neither date.
- **27–30:** Turns the date into a month key and adds the batch amount using `Decimal`.
- **32–45:** Sorts the months, changes each total to a JSON-safe float, and returns `company_id` plus `historical_series`.

## Forecast routes — lines 48–97

- **48–50:** `GET /liquidity-forecast/<company_id>` is Maker-only and tenant-protected.
- **51–52:** Reads `horizon` from the URL (default 3), then clamps it to 1–12 months.
- **53–58:** Reads the optional festival-bonus switch. Missing means “use saved/default behaviour”; `1`, `true`, and `yes` mean true.
- **59–66:** Calls `get_cached_liquidity_forecast` and returns its result. The service reads or computes the forecast data.
- **69–71:** `POST .../refresh` is the Maker-only route to recompute a forecast.
- **72–73:** Reads and limits the requested horizon from JSON.
- **74:** Calls the forecast service’s refresh function.
- **75–84:** If any calculation fails, preserves the last successful cached forecast and sends a simple `500` explanation.
- **87–89:** `PUT .../settings` lets the Maker save forecast options.
- **90–94:** Gives the JSON settings and current user ID to `update_forecast_settings`, then returns the saved settings.
- **95–96:** Converts a validation error from the service into `400 Bad Request`.

## `GET /summary/<company_id>` — lines 100–143

- **100–102:** Maps a tenant-protected dashboard-summary URL.
- **103–106:** Gets the company and returns `404` if it does not exist.
- **108:** Calls the model’s `sync_balance()` so the company total agrees with its wallets.
- **109–110:** Gets the company wallets and payroll batches.
- **112–114:** Adds money from only `EXECUTED` batches.
- **115–122:** Adds money from batches still waiting for review/approval.
- **124–129:** Joins risk alerts to their batch items and batches, then counts unresolved alerts for this company.
- **131–143:** Returns the company name, wallet balance, active-wallet count, batch count, disbursed/pending money, and open-alert count.

## Connections

The dashboard components in `frontend/src/components/` use these responses. The summary reads `Company`, `CentralWallet`, `Batch`, `BatchItem`, and `RiskAlert`; it does not save them. Forecast URLs pass control to `forecasting_service.py`, where forecast settings/cache are handled.
