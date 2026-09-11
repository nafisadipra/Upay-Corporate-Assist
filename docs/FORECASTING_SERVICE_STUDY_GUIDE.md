# Forecasting Service: Teacher-Ready Study Guide

Source: `backend/app/services/forecasting_service.py`.

## One-minute explanation

This service predicts how much money a particular company needs for upcoming payrolls. It reads that company's completed payroll history, totals salaries by month, chooses a model based on how much history exists, produces a forecast and uncertainty range, tests past accuracy, saves an auditable result, and later returns the cached result to the frontend. It never approves a payment: the forecast is advisory only.

The models are selected as follows:

| Months of payroll history | Model | What it can learn |
| --- | --- | --- |
| 0-2 | `BASELINE` | Nothing from data; uses an approved/default planning amount |
| 3-5 | `SES` | A stable level, but no trend or seasonality |
| 6-23 | `HOLT` | Level and trend |
| 24+ | `HOLT_WINTERS_ADDITIVE` | Level, trend, and a 12-month seasonal pattern |

Blank lines only improve readability. The line-by-line notes below cover every line that executes, imports something, declares a constant, or documents a decision.

## Lines 1-30: imports, optional dependency, constants

| Line(s) | Meaning |
| --- | --- |
| 1 | Enables postponed evaluation of type annotations. This lets annotations such as `CompanyForecastSettings | None` work cleanly without eagerly resolving every type. |
| 3 | Imports `date` for month-only dates and `datetime` for timestamps such as when a forecast run finished. |
| 4 | Imports `mean` for accuracy averages and `pstdev` (population standard deviation) for prediction intervals. |
| 5 | Imports `Any`, used when a dictionary can hold several types of values. |
| 7 | Imports NumPy as `np`. It provides numeric arrays and evenly spaced candidate smoothing parameters. |
| 9 | Imports the shared SQLAlchemy database object so this service can add, flush, commit, and roll back records. |
| 10-18 | Imports the database models this service needs: wallet, per-company settings, alert, forecast audit run, immutable run result, current cached forecast, and payroll history. |
| 20 | Starts an optional-library `try` block. The application can still forecast if `statsmodels` is absent. |
| 21 | Imports `ExponentialSmoothing`, the mature library implementation of SES, Holt, and Holt-Winters. |
| 22 | Records that the optional library is available. |
| 23 | If importing fails, catches only `ImportError`; this avoids hiding unrelated programming errors. `pragma: no cover` tells coverage tooling not to require this environment-specific path. |
| 24 | Creates the name `ExponentialSmoothing` with value `None`, so the name still exists safely. |
| 25 | Records that the service must use its built-in fallback algorithms. |
| 28 | Declares the default planning baseline: BDT 5,000,000. It is used only when there is insufficient history and no company-specific setting exists. `_` makes a large number easier to read. |
| 29 | Declares the displayed confidence level, 0.95 (95%). This is metadata; it is not calculated from the model accuracy. |

## Lines 32-43: date helpers

| Line(s) | Meaning |
| --- | --- |
| 32 | Defines `_month_start`; the leading underscore says it is private to this module. It accepts a `datetime` and returns a `date`. |
| 33 | Discards the day/time and returns the first day of the same month, e.g. `2026-04-19` becomes `2026-04-01`. This makes all payrolls in one month share one key. |
| 36 | Defines `_add_months`, accepting a month date and number of months to move forward. |
| 37 | Converts the year/month to a zero-based absolute month number, then adds `count`. This handles year rollover without a long `if` chain. |
| 38 | Converts the absolute month number back to `date(year, month, 1)`. For example, adding 1 to December 2026 returns January 2027. |
| 41 | Defines `_period`, which creates the API/database month representation. |
| 42 | Formats a date as `YYYY-MM`, for example `2026-04`. |

## Lines 45-52: building one company’s monthly training series

| Line(s) | Meaning |
| --- | --- |
| 45 | Defines `build_monthly_series(company_id)`. It returns a list of dictionaries because later code and JSON responses need named fields. |
| 46 | Documents the key security/data rule: use completed payroll records belonging to one company only. |
| 47 | Starts an empty dictionary mapping each month (`date`) to its total payroll (`float`). |
| 48 | Queries `PayrollHistory` only where `company_id` matches, orders records by disbursement date, and loads them. The company filter is the service-level tenant-isolation guard. |
| 49 | Loops through each payroll-history row. |
| 50 | Normalizes that row’s disbursement date to the first day of its month. |
| 51 | Gets the current total for that month (or `0.0` if none), converts salary to a float, and adds it. Multiple employee payments therefore become one monthly company total. |
| 52 | Sorts months chronologically and returns dictionaries containing: API period string, original month date, and a two-decimal amount. |

## Lines 55-62: model selection

| Line(s) | Meaning |
| --- | --- |
| 55 | Defines the strategy selector. It returns `(model_type, status)`. |
| 56-57 | With fewer than three months, returns `BASELINE` and `INSUFFICIENT_HISTORY`; trained time-series models would not be credible. |
| 58-59 | With 3, 4, or 5 months, returns `SES` and `LIMITED_VALIDATION`. SES estimates a level but cannot reliably learn trend/seasonality from this little data. |
| 60-61 | With 6 through 23 months, returns `HOLT` and `READY`; Holt adds a trend. |
| 62 | With 24 or more months, returns additive Holt-Winters and `READY`, allowing one full year of recurring seasonal effects to be compared with another year. |

## Lines 65-80: built-in Simple Exponential Smoothing (SES)

SES formula: `new_level = alpha * actual + (1 - alpha) * old_level`. A larger `alpha` gives more importance to the newest payroll value. SES forecasts every future month as the final level because it has no trend or seasonality.

| Line(s) | Meaning |
| --- | --- |
| 65 | Defines `_ses(values, horizon)`. It returns forecasts, residual errors, and model metadata. |
| 66 | Sets `best` to empty. Eventually it will store `(sum_of_squared_errors, alpha, errors)`. |
| 67 | Tries 19 candidate `alpha` values from 0.05 to 0.95. This is a simple grid search. |
| 68 | For this candidate alpha, initializes `level` with the first historical value and starts an empty error list. |
| 69 | Loops through every actual historical value after the first. |
| 70 | Stores the one-step-ahead residual: actual payroll minus the previous level (the prediction before seeing this actual value). |
| 71 | Updates the level using the SES formula. New values influence it by `alpha`; old information remains by `1 - alpha`. |
| 72 | Builds a candidate result. Squaring errors penalizes large mistakes more heavily; the sum is the score used to choose alpha. NumPy alpha is converted to a normal Python float. |
| 73-74 | Replaces `best` when no candidate exists yet or this candidate’s squared-error score is lower. |
| 75 | Defensive assertion: there must be a winning candidate after the loop. The caller only uses SES with adequate data. |
| 76 | Unpacks the winning result. `_` intentionally ignores its error score; `alpha` and `errors` are needed later. |
| 77 | Resets the level to the first value before applying the selected alpha across all history. |
| 78-79 | Recalculates the final smoothed level using the winning alpha. |
| 80 | Returns the same final `level` for `horizon` future periods, its residuals, and metadata identifying the native grid-search engine and alpha. |

## Lines 83-103: built-in Holt trend model

Holt extends SES with a trend. `alpha` smooths the level; `beta` smooths the rate of change. Its future formula is `level + trend * step`.

| Line(s) | Meaning |
| --- | --- |
| 83 | Defines the native Holt fallback, returning the same three-part result shape as SES. |
| 84 | Prepares an empty best candidate shaped as `(error_score, alpha, beta, errors)`. |
| 85 | Tests nine alpha values from 0.1 to 0.9. |
| 86 | For every alpha, tests nine beta values, producing 81 parameter combinations. |
| 87 | Initializes level from the first value, initial trend from the first difference, and an empty residual list. |
| 88 | Loops through observed values after the first. |
| 89 | Calculates the next prediction (`level + trend`) before observing actual data; saves the old level because the trend update needs it. |
| 90 | Stores actual minus predicted as a residual. |
| 91 | Updates the level by combining actual with the model’s predicted level. |
| 92 | Updates trend by combining the newest level change with the previous trend, weighted by beta. |
| 93 | Creates a scored candidate with squared residuals plus the parameter values and errors. |
| 94-95 | Keeps the candidate if it is the first or has lower total squared error. |
| 96 | Confirms a best candidate exists. |
| 97 | Extracts the winning alpha, beta, and residual list. |
| 98 | Reinitializes level and trend for the final model pass. |
| 99 | Begins the final pass over historical values. |
| 100 | Recreates the predicted value and stores the previous level. |
| 101 | Updates level using the selected alpha. |
| 102 | Updates trend using the selected beta. |
| 103 | Forecasts every requested step, adding one trend unit per future step; returns native-engine metadata including alpha/beta. |

## Lines 106-113: native seasonal fallback

| Line(s) | Meaning |
| --- | --- |
| 106 | Defines the no-`statsmodels` approximation for a seasonal model. It requires at least 24 values, ensured by model selection. |
| 107 | Splits data into the latest 12 months and the 12 months before that. |
| 108 | Calculates average payroll for each year: current `level` and `previous_level`. |
| 109 | Calculates monthly trend as the annual average change divided by 12. |
| 110 | Calculates each latest month’s seasonal effect: its payroll minus the latest-year average. |
| 111 | Creates each future forecast as level + accumulated monthly trend + the matching month-of-year seasonal effect. Modulo (`% 12`) wraps month positions around the yearly pattern. |
| 112 | Calculates residuals for the latest 12 months against level plus their seasonal effect. |
| 113 | Returns forecasts, residuals, and metadata explaining that this is the native seasonal fallback with a 12-month period. |

## Lines 116-132: choosing a fitter

| Line(s) | Meaning |
| --- | --- |
| 116 | Defines one dispatcher that fits any supported strategy and returns `(predictions, residuals, parameters)`. |
| 117 | Starts the SES branch. |
| 118 | Uses the professional library implementation when it is installed. |
| 119 | Fits simple exponential smoothing. No trend/seasonality arguments are supplied. `estimated` lets the library estimate starting state; `optimized=True` fits parameters to minimize error. |
| 120 | Returns library forecasts, residuals (`actual - fitted historical value`), and metadata with the learned smoothing level. NumPy arrays are converted to lists for JSON/database safety. |
| 121 | If library support is absent, delegates SES to the native `_ses` grid-search implementation. |
| 122 | Starts the Holt branch. |
| 123 | Uses the library if available. |
| 124 | Fits additive-trend Holt with a damped trend. Damping prevents a trend from increasing forever unrealistically. |
| 125 | Returns forecasts, residuals, and the learned alpha/beta parameters. |
| 126 | Otherwise calls native `_holt`. |
| 127 | Starts the additive Holt-Winters branch. |
| 128 | Uses the library if available. |
| 129 | Fits additive trend plus additive seasonality with 12 months per seasonal cycle. |
| 130 | Returns forecasts/residuals and learned alpha (level), beta (trend), gamma (seasonality), and seasonal-period metadata. |
| 131 | Otherwise uses the simpler native seasonal fallback. |
| 132 | Rejects an unknown strategy immediately rather than silently creating a wrong forecast. |

## Lines 135-151: walk-forward backtesting

| Line(s) | Meaning |
| --- | --- |
| 135 | Defines a backtest that returns `(MAE or None, MAPE or None, number_of_folds)`. |
| 136 | Requires 3 training values for SES/Holt and 24 for Holt-Winters before holding out a next value. |
| 137 | Creates lists for absolute currency errors and percentage errors. |
| 138 | Walks through historical cutoffs. Each cutoff simulates what the system would have known at that time. |
| 139 | Fits the model to the history before this cutoff and forecasts exactly one next month. The `_` variables intentionally ignore residuals/metadata. |
| 140 | Subtracts the single predicted next-month value from the true held-out amount. |
| 141 | Stores its absolute magnitude for MAE. |
| 142 | Avoids division by zero when calculating MAPE. |
| 143 | Stores absolute percentage error: `abs(error / actual) * 100`. |
| 144 | Starts the three-value return tuple. |
| 145-147 | Comments explain the necessary conversion: NumPy scalar types can be serialized by a database driver incorrectly, so ordinary Python floats are required. |
| 148 | If there are at least three folds, returns mean absolute error rounded to two decimals; otherwise `None`, meaning not enough evidence. |
| 149 | If at least three non-zero actuals exist, returns mean absolute percentage error rounded to four decimals; otherwise `None`. |
| 150 | Returns the total count of folds, even if some had zero actual values and were excluded from MAPE. |
| 151 | Closes the tuple/function. |

## Lines 154-160: intervals and settings lookup

| Line(s) | Meaning |
| --- | --- |
| 154 | Defines prediction-bound generation. It returns one `(lower, upper)` tuple for each forecast. |
| 155 | Uses population standard deviation of residuals as an uncertainty estimate. With zero/one residual, assumes no measurable spread (`0.0`). |
| 156 | Builds approximately 95% bounds: forecast ± `1.96 * deviation`. `max(0.0, ...)` prevents impossible negative payroll estimates/bounds. |
| 159 | Defines a private helper to retrieve one company’s settings. |
| 160 | Filters by company and returns the first matching settings row, or `None` when no settings exist. The model schema enforces at most one settings row per company. |

## Lines 163-186: creating an in-memory base forecast

| Line(s) | Meaning |
| --- | --- |
| 163 | Defines the core orchestrator. It builds the result but does not write to the database yet. |
| 164 | Retrieves the company’s monthly payroll training series. |
| 165 | Extracts only monthly numeric amounts for model fitting. |
| 166 | Chooses model and initial validation status based on amount of history. |
| 167 | Loads optional company forecast settings. |
| 168 | Chooses configured planning baseline when settings exist; otherwise `DEFAULT_BASELINE`. |
| 169 | Uses latest historical month as forecast starting point, or current month’s first day if no history exists. |
| 170 | Records the last source-data month, but uses `None` if no payroll history exists. |
| 171 | Starts the insufficient-history case. |
| 172 | Creates `horizon` copies of baseline, no residuals, and marks the engine as configured baseline. |
| 173 | Records a transparent assumption and no accuracy metrics/folds because no trained model exists. |
| 174 | Starts the trained-model path. |
| 175 | Fits the selected strategy and obtains predictions, residuals, and parameters. |
| 176 | Backtests the same strategy against historical data. |
| 177-178 | If fewer than three backtest folds were possible, downgrades status to `LIMITED_VALIDATION`. |
| 179 | States the key data assumption: only completed payroll history of this company was used. |
| 180-181 | For all non-seasonal models, adds a warning that annual festival seasonality is not learned until 24 observations. |
| 182 | Builds lower/upper prediction bounds from residual spread. |
| 183 | Starts the list that will contain serializable per-month forecast records. |
| 184 | Loops through each prediction paired with its bounds. `start=1` means first forecast is one month after latest history. |
| 185 | Appends one response/persistence record: calculated future period, non-negative rounded prediction, rounded bounds, and assumptions. |
| 186 | Returns the complete internal forecast payload: raw series, strategy/status, data count, accuracy, model parameters, source cutoff, and future records. |

## Lines 189-195: accuracy alert

| Line(s) | Meaning |
| --- | --- |
| 189 | Defines an alert helper receiving company, persisted run, MAPE, and backtest fold count. |
| 190-191 | Returns without alert if MAPE is absent, fewer than six folds exist, or MAPE is 15% or lower. This avoids noisy alerts based on weak evidence. |
| 192 | Checks for an existing pending high-forecast-error alert for this company. |
| 193 | Avoids creating duplicate pending alerts. |
| 194 | Adds a medium-severity alert linked to the run. Its JSON details preserve the actual MAPE, folds, and 15% threshold. |

## Lines 197-221: refresh and persist forecast

| Line(s) | Meaning |
| --- | --- |
| 197 | Public refresh function. Default horizon is three future months. |
| 198 | Documents that cache stores base forecasts; festival adjustments are applied at read time so different request options do not alter the saved base value. |
| 199 | Starts error handling so the database never remains in a broken transaction. |
| 200 | Builds the in-memory forecast result. |
| 201 | Creates an append-only `ForecastRun` audit record with model/status/history/accuracy/parameters/source cutoff and completion time. Dictionary unpacking merges model parameters with backtest-fold count. |
| 202 | Adds the audit run to the current transaction. |
| 203 | Sends pending SQL to the database so `run.id` exists before child results reference it; it does not commit yet. |
| 204 | Loops through each future forecast record. |
| 205 | Looks for the current cached forecast by unique logical key: company + period. |
| 206 | If that cache row does not exist, creates it. |
| 207 | Initializes it with company, period, and predicted amount. |
| 208 | Adds the new cache row to the session. Existing rows are already attached, so no create occurs. |
| 209 | Updates the amount and uncertainty bounds on the current cache row. |
| 210 | Updates model identity/status/history metadata. |
| 211 | Stores accuracy metrics and confidence-level metadata. |
| 212 | Stores assumptions, source cutoff, audit-run foreign key, and UTC generation time. |
| 213 | Adds an immutable `ForecastRunResult` snapshot for this run and period. Therefore later cache overwrites do not erase audit history. |
| 214 | Creates a high-error alert if the alert conditions are met. |
| 215 | Commits all run, cache, result, and alert changes atomically. |
| 216 | Reads and returns the cached API shape, keeping refresh and ordinary read responses consistent. |
| 217 | Catches any exception during generation/persistence. |
| 218 | Rolls back incomplete writes from the failed transaction. |
| 219 | Adds a separate failed `ForecastRun`, including exception text for diagnosis. |
| 220 | Commits this failure audit record. |
| 221 | Re-raises the original error so the route can return HTTP 500. |

## Lines 224-233: optional festival adjustment at read time

| Line(s) | Meaning |
| --- | --- |
| 224 | Defines a pure adjustment function that accepts a serialized forecast row, settings, and a boolean request choice. |
| 225 | Copies the input row and its assumptions, preventing mutation of cached/database data. |
| 226 | Applies bonus only when settings exist, bonus inclusion is enabled, the forecast month is configured, and bonus amount is positive. It extracts month from `YYYY-MM`, e.g. `"2026-06"` becomes `6`. |
| 227 | Converts configured bonus to float once. |
| 228 | Iterates through predicted amount and both interval bounds, keeping the interval aligned with the adjusted forecast. |
| 229 | Skips a field only if it is `None`. |
| 230 | Adds the bonus and rounds each applicable field. |
| 231 | Adds a human-readable disclosure to the assumptions list. |
| 232 | Places the updated assumption list into the copied payload. |
| 233 | Returns the adjusted response-only payload. |

## Lines 236-257: safely reading cached forecasts

| Line(s) | Meaning |
| --- | --- |
| 236 | Defines the normal read path. `include_festival_bonus=None` means use the company’s saved default; explicit true/false overrides it for this response. |
| 237 | Retrieves fresh history (for cutoff/context) and settings. |
| 238 | Determines the latest completed period; with no history, uses the current `YYYY-MM`. |
| 239 | Loads cached forecasts for this company ordered by period. It does not train or write a model. |
| 240 | Starts a filtered list comprehension. |
| 241-244 | Retains only valid seven-character `YYYY-MM` periods that are later than the latest completed payroll period. This excludes malformed and already-completed cache rows. |
| 245 | Limits the result to requested horizon after filtering/sorting. |
| 246 | Resolves bonus choice: saved setting if request did not specify and settings exist; otherwise the caller’s boolean. |
| 247 | Looks up the company’s main central wallet. |
| 248 | Gets wallet balance as a float, or `0.0` if no main wallet exists. |
| 249 | Handles the no-forecast-cache case explicitly. |
| 250 | Returns an `UNAVAILABLE` model response, empty forecasts, actual history, and settings. It never fabricates a forecast merely because someone read the endpoint. |
| 251 | Stores the first cache row as source of common metadata and prepares output list. |
| 252 | Loops through each selected cache row. |
| 253 | Converts a row to a dictionary and applies request-time festival adjustment. |
| 254 | Adds current wallet balance to the response item. |
| 255 | Calculates funding need: `max(0, predicted payroll - current balance)`, rounded to two decimals. |
| 256 | Adds the completed response item. |
| 257 | Returns the full JSON-friendly response: company, generation/source timestamps, model metadata, forecasts under two compatibility names, history, and settings. Numeric database `Decimal` values are converted to floats. |

## Lines 260-277: validating and saving settings

| Line(s) | Meaning |
| --- | --- |
| 260 | Defines public settings update function; it receives company, untrusted JSON payload, and authenticated user ID. |
| 261 | Looks up existing settings. |
| 262-264 | If absent, creates a settings row for the company and adds it to the database session. |
| 265 | Reads a new planning baseline from payload, or keeps existing baseline if omitted. |
| 266 | Reads a new festival-bonus amount or keeps current value. |
| 267 | Reads months list or keeps current list. |
| 268-269 | Rejects negative baseline or bonus values. Negative payroll planning values are not valid. |
| 270-271 | Requires months to be a list of integer values from 1 through 12; rejects strings, out-of-range values, and other types. |
| 272 | Saves baseline and bonus amount. |
| 273 | Removes duplicate months with `set`, sorts them for stable output, and saves them. |
| 274 | Saves whether bonus is included by default, using payload value when present. |
| 275 | Records who made the configuration change for accountability. |
| 276 | Commits the settings update. |
| 277 | Returns the persisted settings object to the API route. |

## Request-to-screen flow

```text
Completed payroll rows
  -> build_monthly_series(company_id)
  -> choose BASELINE / SES / HOLT / HOLT-WINTERS
  -> fit + backtest + prediction bounds
  -> refresh_liquidity_forecast() saves cache + audit history
  -> GET route reads cached rows
  -> festival adjustment and top-up calculation
  -> frontend AnalyticsTab displays history, forecasts, and funding gap
```

Relevant connections:

- API endpoints: `backend/app/routes/analytics.py:37-66`
- Data models: `backend/app/models/models.py:348-501`
- Frontend display: `frontend/src/components/AnalyticsTab.tsx:99-257`
- Tests: `backend/tests/test_forecasting.py:21-162`
- Design rationale and formulas: `docs/architecture/ml_liquidity_forecasting_implementation.md:68-158`

## Short answers for common teacher questions

**Why use different models?** More data supports more complex patterns. SES needs only a level; Holt needs enough observations to estimate a trend; Holt-Winters needs two yearly cycles to learn seasonality credibly.

**What does alpha mean?** Alpha is the smoothing weight for current data. High alpha reacts faster to recent salary changes; low alpha is smoother and more stable.

**What is backtesting?** It repeatedly hides a known historical month, forecasts it using only earlier months, and compares the forecast with the actual amount.

**MAE vs MAPE?** MAE is average absolute error in BDT. MAPE is average absolute error as a percentage, so it is easier to compare between companies of different sizes.

**How is the confidence range calculated?** `forecast ± 1.96 × residual standard deviation`, clipped at zero. It is an approximate 95% interval based on observed model residual spread.

**How is tenant data protected?** Forecast training queries filter `PayrollHistory` by `company_id`; API routes use `require_auth` and `require_tenant`; cached forecasts and wallets are also queried by company ID.

**Why save both `LiquidityForecast` and `ForecastRunResult`?** The first is the current fast UI cache, updated for the same company/period. The second is an immutable snapshot so old forecasts can be audited after cache values change.

**Does it use an LLM/ChatGPT?** No. It uses statistical time-series forecasting inside the Flask backend process.
