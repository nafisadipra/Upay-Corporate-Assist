# Liquidity Forecasting Mathematics: Hand Calculation Worksheet

Use this document to explain the project’s forecasting math on paper. All money examples are in BDT. The real service code is in `backend/app/services/forecasting_service.py`.

## The big idea

Each month has one value:

```text
monthly payroll = sum of all employees' gross salaries paid in that month
```

Example:

```text
Employee A = 30,000
Employee B = 45,000
Employee C = 25,000
April payroll = 30,000 + 45,000 + 25,000 = 100,000
```

The program makes this monthly series in `build_monthly_series` at `backend/app/services/forecasting_service.py:45-52`.

## Which model is used?

| History available | Model | Simple explanation |
| --- | --- | --- |
| 0-2 months | Baseline | Not enough data, so use a configured planning amount. |
| 3-5 months | SES | Learn one stable payroll level. |
| 6-23 months | Holt | Learn level and whether payroll is rising/falling. |
| 24+ months | Holt-Winters | Also learn repeating yearly effects, such as a festival month. |

**Answer if asked:** “We do not use the most complex model immediately. Every extra component—trend and seasonality—needs enough historical observations to estimate it reliably.”

Code: `backend/app/services/forecasting_service.py:55-62`.

---

## Four model-choice STEM questions: full calculations

These are four separate questions. First count the months of history; that determines the model. Then use the mathematics appropriate to that model.

### Choice 1 — 0-2 months: Baseline

#### Question

Green Textiles has only these two completed payroll months:

| Month | Total gross payroll |
| --- | ---: |
| January | 420,000 |
| February | 435,000 |

The finance manager configured a planning baseline of BDT 450,000. Forecast March, April, and May. Current main-wallet balance is BDT 390,000. How much must be added for March?

#### Step 1: choose the model

```text
History count = 2 months
2 is in the 0-2 range
Selected model = BASELINE
```

Why not SES? SES starts at three completed monthly observations. Two values are not enough validation evidence for a data-trained forecast.

#### Step 2: calculate each forecast

Baseline has no fitted equation from the two payroll values. It repeats the approved planning value:

```text
March forecast = 450,000
April forecast = 450,000
May forecast   = 450,000
```

#### Step 3: calculate required wallet top-up

```text
top-up = max(0, forecast - wallet balance)
       = max(0, 450,000 - 390,000)
       = max(0, 60,000)
       = 60,000 BDT
```

#### Final answer to say

> “The company has only two months of data, so the system correctly chooses Baseline. It forecasts BDT 450,000 for each future month. For March, the wallet is short by BDT 60,000.”

---

### Choice 2 — 3-5 months: SES

#### Question

Delta Foods has four months of completed payroll history:

| Month | Actual payroll `Y` |
| --- | ---: |
| January | 100,000 |
| February | 110,000 |
| March | 105,000 |
| April | 115,000 |

Use smoothing weight `alpha = 0.30`. Forecast May, June, and July. The main wallet currently holds BDT 90,000.

#### Step 1: choose the model

```text
History count = 4 months
4 is in the 3-5 range
Selected model = SES
```

#### Step 2: write the SES formula

```text
new level = alpha × actual payroll + (1 - alpha) × previous level
L_t = alpha × Y_t + (1 - alpha) × L_(t-1)
```

Here `alpha = 0.30`, so the new actual payroll has 30% weight and old level has 70% weight.

#### Step 3: calculate the smoothed level month by month

Start from January:

```text
L_January = 100,000
```

After February:

```text
L_February = 0.30 × 110,000 + 0.70 × 100,000
           = 33,000 + 70,000
           = 103,000
```

After March:

```text
L_March = 0.30 × 105,000 + 0.70 × 103,000
        = 31,500 + 72,100
        = 103,600
```

After April:

```text
L_April = 0.30 × 115,000 + 0.70 × 103,600
        = 34,500 + 72,520
        = 107,020
```

#### Step 4: produce future forecasts

SES has level only. No trend means it repeats the final level:

```text
May forecast   = 107,020
June forecast  = 107,020
July forecast  = 107,020
```

#### Step 5: calculate May top-up

```text
top-up = max(0, 107,020 - 90,000)
       = 17,020 BDT
```

#### Final answer to say

> “With four months, I choose SES. I smooth each actual payroll using alpha 0.30. The final level is BDT 107,020, so SES predicts that same amount for May, June, and July. The May wallet shortfall is BDT 17,020.”

---

### Choice 3 — 6-23 months: Holt trend model

#### Question

Metro Services has six monthly payroll totals:

| Month | Actual payroll |
| --- | ---: |
| January | 100,000 |
| February | 105,000 |
| March | 111,000 |
| April | 116,000 |
| May | 122,000 |
| June | 128,000 |

Use `alpha = 0.40` and `beta = 0.30`. Start with:

```text
Initial level L_January = 100,000
Initial trend T_January = 105,000 - 100,000 = 5,000
```

Forecast July, August, and September. Current wallet balance is BDT 130,000.

#### Step 1: choose the model

```text
History count = 6 months
6 is in the 6-23 range
Selected model = HOLT
```

#### Step 2: write Holt’s equations

```text
prediction before actual: P_t = L_(t-1) + T_(t-1)
new level:                L_t = alpha × Y_t + (1-alpha) × P_t
new trend:                T_t = beta × (L_t - L_(t-1)) + (1-beta) × T_(t-1)
future forecast:          F_(t+h) = L_t + h × T_t
```

#### Step 3: calculate every historical update

| Actual month | Actual `Y_t` | Prediction `P_t` | Updated level `L_t` | Updated trend `T_t` |
| --- | ---: | ---: | ---: | ---: |
| February | 105,000 | `100,000 + 5,000 = 105,000` | `0.4(105,000)+0.6(105,000)=105,000` | `0.3(105,000-100,000)+0.7(5,000)=5,000` |
| March | 111,000 | `105,000 + 5,000 = 110,000` | `0.4(111,000)+0.6(110,000)=110,400` | `0.3(110,400-105,000)+0.7(5,000)=5,120` |
| April | 116,000 | `110,400 + 5,120 = 115,520` | `0.4(116,000)+0.6(115,520)=115,712` | `0.3(115,712-110,400)+0.7(5,120)=5,177.60` |
| May | 122,000 | `115,712 + 5,177.60 = 120,889.60` | `0.4(122,000)+0.6(120,889.60)=121,333.76` | `0.3(121,333.76-115,712)+0.7(5,177.60)=5,310.85` |
| June | 128,000 | `121,333.76 + 5,310.85 = 126,644.61` | `0.4(128,000)+0.6(126,644.61)=127,186.76` | `0.3(127,186.76-121,333.76)+0.7(5,310.85)=5,473.49` |

For June, the final row calculation in full is:

```text
P_June = 121,333.76 + 5,310.85 = 126,644.61

L_June = 0.40(128,000) + 0.60(126,644.61)
       = 51,200 + 75,986.76
       = 127,186.76

T_June = 0.30(127,186.76 - 121,333.76) + 0.70(5,310.85)
       = 0.30(5,853.00) + 3,717.60
       = 1,755.90 + 3,717.60
       = 5,473.49
```

#### Step 4: calculate future forecasts

```text
July forecast      = L_June + 1 × T_June
                   = 127,186.76 + 5,473.49
                   = 132,660.25

August forecast    = L_June + 2 × T_June
                   = 127,186.76 + 10,946.98
                   = 138,133.74

September forecast = L_June + 3 × T_June
                   = 127,186.76 + 16,420.47
                   = 143,607.23
```

#### Step 5: calculate July top-up

```text
top-up = max(0, 132,660.25 - 130,000)
       = 2,660.25 BDT
```

#### Final answer to say

> “With six months, I choose Holt because the payroll is rising. Holt keeps both a smoothed level and a smoothed monthly trend. After June, level is BDT 127,186.76 and trend is BDT 5,473.49 per month. Therefore July, August, and September forecasts are BDT 132,660.25, BDT 138,133.74, and BDT 143,607.23.”

---

### Choice 4 — 24+ months: Holt-Winters additive seasonality

#### Question

Sunrise Manufacturing has 24 completed months. Its average monthly payroll for the first year was BDT 500,000 and for the most recent year was BDT 620,000. The most recent June payroll was BDT 720,000. Forecast the next June, which is one month ahead of the latest data. Use the project fallback's hand-calculation approach.

#### Step 1: choose the model

```text
History count = 24 months
24 is in the 24+ range
Selected model = HOLT-WINTERS ADDITIVE
```

Why additive? The seasonal effect is added as a BDT amount. A June bonus of BDT 100,000 is treated as approximately BDT 100,000 extra, rather than a percentage multiplier.

#### Step 2: calculate level and monthly trend

The fallback represents level using the most recent year’s average:

```text
level = latest-year average = 620,000
```

Annual growth is:

```text
annual change = 620,000 - 500,000 = 120,000
```

Convert annual growth to monthly trend:

```text
monthly trend = annual change / 12
              = 120,000 / 12
              = 10,000 per month
```

#### Step 3: calculate the June seasonal effect

```text
June seasonal effect = recent June actual - latest-year average
                      = 720,000 - 620,000
                      = +100,000
```

This says June tends to be BDT 100,000 above a normal recent-year month, perhaps because of a recurring festival payment.

#### Step 4: calculate next June forecast

The additive seasonal forecast is:

```text
forecast = level + (step × monthly trend) + seasonal effect
```

Here `step = 1` because the forecasted June is one month after the latest observed month:

```text
next June forecast = 620,000 + 1(10,000) + 100,000
                   = 730,000 BDT
```

#### Step 5: calculate required top-up

If current wallet balance is BDT 650,000:

```text
top-up = max(0, 730,000 - 650,000)
       = 80,000 BDT
```

#### Final answer to say

> “With 24 months, I choose additive Holt-Winters because I can model a repeating annual pattern. The newest year’s level is BDT 620,000, trend is BDT 10,000 per month, and June’s seasonal effect is plus BDT 100,000. The next June forecast is BDT 730,000, so a BDT 80,000 top-up is needed from a BDT 650,000 wallet.”

The production service normally uses `statsmodels` to optimize the smoothing parameters; this manual calculation illustrates the built-in fallback in `backend/app/services/forecasting_service.py:106-113`.

---

## Four-choice comparison: answer in one table

| If teacher gives you... | You answer... | Main calculation |
| --- | --- | --- |
| 0-2 monthly observations | Baseline | Repeat configured planning amount. |
| 3-5 monthly observations | SES | `L_t = alpha Y_t + (1-alpha)L_(t-1)`; future values repeat final level. |
| 6-23 monthly observations | Holt | Update level and trend; `F_(t+h)=L_t+hT_t`. |
| 24+ monthly observations | Holt-Winters | Level + trend + matching calendar month’s seasonal effect. |

---

## 1. Baseline forecast

### Formula

```text
forecast for every future month = configured baseline
```

### Question

A new company has only two monthly payroll records. Its approved planning baseline is BDT 5,000,000. What are the next three forecasts?

### Answer

```text
Month 1 forecast = 5,000,000
Month 2 forecast = 5,000,000
Month 3 forecast = 5,000,000
```

This is not a trained prediction. The system labels it `BASELINE` and `INSUFFICIENT_HISTORY` so users do not confuse it with a learned result.

Code: `backend/app/services/forecasting_service.py:171-173`.

---

## 2. Simple Exponential Smoothing (SES)

SES is used when the monthly payroll is reasonably stable but there is too little history to trust a trend or yearly seasonal pattern.

### Formula

```text
L_t = alpha × Y_t + (1 - alpha) × L_(t-1)
Forecast for next month = L_t
```

Where:

- `Y_t` = actual payroll this month
- `L_t` = smoothed level after seeing this month
- `alpha` = smoothing weight, between 0 and 1

### How to explain alpha

```text
alpha close to 1  -> react strongly to the newest payroll
alpha close to 0  -> keep the forecast smoother and trust older level more
```

For `alpha = 0.30`, the new payroll contributes 30% and the old level contributes 70%.

### Worked question: calculate SES by hand

Historical monthly payroll:

| Month | Actual payroll `Y_t` |
| --- | ---: |
| January | 100,000 |
| February | 110,000 |
| March | 105,000 |

Use `alpha = 0.30`. Forecast April, May, and June.

### Worked answer

Start with the first actual value:

```text
L_January = 100,000
```

Update after February:

```text
L_February = 0.30 × 110,000 + (1 - 0.30) × 100,000
           = 33,000 + 0.70 × 100,000
           = 33,000 + 70,000
           = 103,000
```

Update after March:

```text
L_March = 0.30 × 105,000 + 0.70 × 103,000
        = 31,500 + 72,100
        = 103,600
```

SES has no trend, so every future value is the final level:

```text
Forecast April = 103,600
Forecast May   = 103,600
Forecast June  = 103,600
```

### Whiteboard version

| Step | Calculation | New level / forecast |
| --- | --- | ---: |
| Start | `L_Jan = 100,000` | 100,000 |
| February | `0.3(110,000) + 0.7(100,000)` | 103,000 |
| March | `0.3(105,000) + 0.7(103,000)` | 103,600 |
| April forecast | `L_March` | 103,600 |

### What the code does differently

For the native fallback, the program tries 19 alpha values from 0.05 to 0.95 and selects the alpha with lowest squared historical error. The formula is exactly the same.

Code: `backend/app/services/forecasting_service.py:65-80`.

---

## 3. Choosing alpha using squared error

The system compares candidate alpha values using:

```text
error = actual - forecast
squared error = error²
total squared error (SSE) = sum of every squared error
```

The alpha with the smallest SSE wins.

### Question

Two candidate alpha values produce these one-step errors:

```text
alpha = 0.20: errors = [10,000, -5,000]
alpha = 0.80: errors = [3,000, -8,000]
```

Which alpha is selected?

### Answer

```text
SSE for alpha 0.20 = 10,000² + (-5,000)²
                   = 100,000,000 + 25,000,000
                   = 125,000,000

SSE for alpha 0.80 = 3,000² + (-8,000)²
                   = 9,000,000 + 64,000,000
                   = 73,000,000
```

`alpha = 0.80` wins because `73,000,000` is smaller than `125,000,000`.

**Why square the error?** It makes large misses count much more strongly than small misses and prevents positive and negative errors cancelling each other out.

Code: `backend/app/services/forecasting_service.py:67-76`.

---

## 4. Holt’s trend method

Holt is used when payroll is not just stable—it appears to be increasing or decreasing.

### Formulas

```text
Forecast before seeing actual: P_t = L_(t-1) + T_(t-1)

New level: L_t = alpha × Y_t + (1 - alpha) × P_t

New trend: T_t = beta × (L_t - L_(t-1)) + (1 - beta) × T_(t-1)

h-month forecast: F_(t+h) = L_t + h × T_t
```

Where:

- `L` = level, the current base payroll amount
- `T` = trend, expected amount of monthly increase/decrease
- `P` = prediction before actual payroll is known
- `alpha` = level smoothing weight
- `beta` = trend smoothing weight

### Worked question: calculate one Holt update

Suppose we already have:

```text
Previous level L_(t-1) = 100,000
Previous trend T_(t-1) = 5,000
Actual current payroll Y_t = 112,000
alpha = 0.40
beta = 0.30
```

Find the next one-month and two-month forecasts.

### Worked answer

First predict before seeing the actual amount:

```text
P_t = L_(t-1) + T_(t-1)
    = 100,000 + 5,000
    = 105,000
```

Update the level:

```text
L_t = 0.40 × 112,000 + 0.60 × 105,000
    = 44,800 + 63,000
    = 107,800
```

Update trend:

```text
T_t = 0.30 × (107,800 - 100,000) + 0.70 × 5,000
    = 0.30 × 7,800 + 3,500
    = 2,340 + 3,500
    = 5,840
```

Forecast one month ahead:

```text
F_(t+1) = 107,800 + 1 × 5,840
        = 113,640
```

Forecast two months ahead:

```text
F_(t+2) = 107,800 + 2 × 5,840
        = 119,480
```

### Whiteboard version

| Quantity | Result |
| --- | ---: |
| Prediction before actual `P_t` | 105,000 |
| Updated level `L_t` | 107,800 |
| Updated trend `T_t` | 5,840 |
| Next-month forecast | 113,640 |
| Two-month forecast | 119,480 |

Code: `backend/app/services/forecasting_service.py:83-103`.

---

## 5. Holt-Winters additive seasonality

Use Holt-Winters when there are at least 24 months of history and the same months tend to repeat a pattern. For example, June may repeatedly have a festival bonus, while other months do not.

### Intuitive formula used for explanation

```text
forecast = level + future trend + seasonal effect for that calendar month
```

The Statsmodels implementation fits level, trend, and seasonality together. If the library is unavailable, the project fallback uses the latest 12 months to calculate seasonal effects.

### Worked question: add trend and seasonality

Suppose after fitting the model:

```text
Current level = 500,000
Monthly trend = 10,000
Seasonal effect for June = +80,000
We are forecasting June one month ahead.
```

What is the forecast?

### Worked answer

```text
forecast = level + 1 × trend + June seasonal effect
         = 500,000 + 1 × 10,000 + 80,000
         = 590,000
```

If the seasonal effect had been `-20,000`, the forecast would instead be:

```text
500,000 + 10,000 - 20,000 = 490,000
```

### How the fallback finds a seasonal effect

Question: latest-year average payroll is 500,000. June payroll is 580,000. What is June's seasonal effect?

Answer:

```text
June seasonal effect = June actual - latest-year average
                      = 580,000 - 500,000
                      = +80,000
```

Code: `backend/app/services/forecasting_service.py:106-113`, `127-131`.

---

## 6. Residuals, MAE, and MAPE

### Definitions

```text
residual/error = actual - forecast
absolute error = |actual - forecast|

MAE  = mean of absolute errors
MAPE = mean of absolute percentage errors × 100
     = mean(|actual - forecast| / actual) × 100
```

MAE answers: “On average, how many BDT was the model wrong?”

MAPE answers: “On average, how wrong was it as a percentage?”

### Worked question

The following historical months were hidden one by one during backtesting:

| Month | Actual | Forecast |
| --- | ---: | ---: |
| 1 | 100,000 | 90,000 |
| 2 | 120,000 | 126,000 |
| 3 | 80,000 | 76,000 |

Calculate MAE and MAPE.

### Worked answer

| Month | Error `actual - forecast` | Absolute error | Absolute percentage error |
| --- | ---: | ---: | ---: |
| 1 | `100,000 - 90,000 = 10,000` | 10,000 | `10,000 / 100,000 × 100 = 10%` |
| 2 | `120,000 - 126,000 = -6,000` | 6,000 | `6,000 / 120,000 × 100 = 5%` |
| 3 | `80,000 - 76,000 = 4,000` | 4,000 | `4,000 / 80,000 × 100 = 5%` |

```text
MAE = (10,000 + 6,000 + 4,000) / 3
    = 20,000 / 3
    = 6,666.67 BDT

MAPE = (10% + 5% + 5%) / 3
     = 20% / 3
     = 6.6667%
```

**Answer if asked why absolute values are used:** “An over-forecast and under-forecast should both count as errors. Without absolute values, `+10,000` and `-10,000` would incorrectly cancel to zero.”

**Answer if asked about actual zero:** MAPE cannot divide by zero, so the code skips percentage error for an actual value of zero.

Code: `backend/app/services/forecasting_service.py:135-151`.

---

## 7. Walk-forward backtesting

The model does not test by peeking into the future. It acts as if each old month were still unknown.

### Question

With monthly values `[100, 110, 105, 120, 125]` and a minimum training length of 3, what are the backtest folds?

### Answer

```text
Fold 1: train on [100, 110, 105], predict 120, compare with actual 120
Fold 2: train on [100, 110, 105, 120], predict 125, compare with actual 125
```

There are two folds. The project only reports MAE/MAPE after at least three folds because two results are too little validation evidence.

Code: `backend/app/services/forecasting_service.py:135-151`.

---

## 8. Prediction interval (lower and upper bounds)

The project estimates uncertainty from residual spread.

### Formula

```text
lower bound = forecast - 1.96 × residual standard deviation
upper bound = forecast + 1.96 × residual standard deviation
```

The lower bound is never allowed below zero.

### Worked question

Forecast next month’s payroll as BDT 500,000. Residual standard deviation is BDT 20,000. Calculate the approximate 95% interval.

### Worked answer

```text
margin = 1.96 × 20,000
       = 39,200

lower = 500,000 - 39,200
      = 460,800

upper = 500,000 + 39,200
      = 539,200
```

So the displayed range is:

```text
BDT 460,800 to BDT 539,200
```

### Negative-lower-bound question

If forecast is BDT 20,000 and margin is BDT 39,200:

```text
raw lower = 20,000 - 39,200 = -19,200
stored lower = max(0, -19,200) = 0
upper = 20,000 + 39,200 = 59,200
```

This avoids an impossible negative payroll amount.

Code: `backend/app/services/forecasting_service.py:154-156`.

> Important: this is an approximate statistical interval based on the spread of past residuals. It is not a guarantee that future payroll will lie in the range.

---

## 9. Festival-bonus adjustment

The core model may not yet have 24 months to learn yearly bonuses. An authorized configuration can transparently add a known bonus to selected forecast months.

### Formula

```text
adjusted forecast = base forecast + configured festival bonus
```

### Worked question

The model predicts BDT 500,000 for June. June is configured as a festival month and the bonus is BDT 75,000. What is the adjusted forecast and adjusted interval if base bounds are BDT 460,000–540,000?

### Worked answer

```text
adjusted forecast = 500,000 + 75,000 = 575,000
adjusted lower    = 460,000 + 75,000 = 535,000
adjusted upper    = 540,000 + 75,000 = 615,000
```

The API also adds an assumption message explaining that the bonus was included. It copies the cached base row first, so this option does not change the saved trained result.

Code: `backend/app/services/forecasting_service.py:224-233`.

---

## 10. Top-up required

This is the business calculation a finance user acts upon.

### Formula

```text
top-up required = max(0, predicted payroll - current main-wallet balance)
```

### Worked question A

```text
Predicted payroll = 575,000
Wallet balance    = 400,000
```

### Answer A

```text
top-up = max(0, 575,000 - 400,000)
       = max(0, 175,000)
       = 175,000
```

### Worked question B

```text
Predicted payroll = 500,000
Wallet balance    = 650,000
```

### Answer B

```text
top-up = max(0, 500,000 - 650,000)
       = max(0, -150,000)
       = 0
```

The wallet has enough funds, so no top-up is recommended.

Code: `backend/app/services/forecasting_service.py:247-255`.

---

## 11. Full teacher-style example

### Question

A company has four months of payroll history:

```text
January  = 100,000
February = 110,000
March    = 105,000
April    = 115,000
```

1. Which model is selected?
2. Use `alpha = 0.30` to calculate the May forecast.
3. If the current wallet contains BDT 90,000, calculate the top-up.
4. If residual standard deviation is BDT 8,000, calculate the interval.

### Complete answer

**1. Model**

There are four months, so the project selects SES with limited validation.

```text
3 <= history months < 6 -> SES
```

**2. SES forecast**

```text
L_Jan = 100,000

L_Feb = 0.30(110,000) + 0.70(100,000)
      = 103,000

L_Mar = 0.30(105,000) + 0.70(103,000)
      = 103,600

L_Apr = 0.30(115,000) + 0.70(103,600)
      = 34,500 + 72,520
      = 107,020

May forecast = 107,020
```

**3. Top-up**

```text
top-up = max(0, 107,020 - 90,000)
       = 17,020
```

**4. Approximate interval**

```text
margin = 1.96 × 8,000 = 15,680

lower = 107,020 - 15,680 = 91,340
upper = 107,020 + 15,680 = 122,700
```

Final explanation:

> “The system selected SES because only four months exist. It smoothed the payroll values with alpha 0.30 and predicted BDT 107,020 for May. Based on past error spread, the approximate range is BDT 91,340 to BDT 122,700. Since the wallet has BDT 90,000, the recommended funding gap is BDT 17,020.”

---

## Quick oral-exam answers

**Why not use the average only?** An ordinary average weights every old month equally. SES gives more controlled importance to recent payrolls, which is useful when payroll changes over time.

**Why does SES repeat the same future value?** SES models level only. It has no trend component, so its best forecast is the final smoothed level for each future month.

**Why use Holt after six months?** Six observations provide more evidence to estimate whether payroll is moving upward or downward. Holt includes a trend component.

**Why need 24 months for seasonal forecasting?** The model needs at least two yearly cycles to compare the same calendar months and distinguish true repetition from a one-time change.

**Does MAPE of 10% mean the forecast is always exactly 10% wrong?** No. It means the average absolute percentage error across backtest folds is 10%; individual months can be better or worse.

**Can a prediction interval guarantee the actual result?** No. It is an uncertainty estimate based on past residual variability, not a promise.

**Does the forecast automatically disburse money?** No. It is advisory. The maker-checker payment workflow remains responsible for approval and execution.

## Practice questions: do these yourself first

### Practice 1: SES

Actual payroll is `[200,000, 220,000, 210,000]`; `alpha = 0.50`.

Find the final level and the next-month forecast.

**Answer:**

```text
L_1 = 200,000
L_2 = 0.5(220,000) + 0.5(200,000) = 210,000
L_3 = 0.5(210,000) + 0.5(210,000) = 210,000
Next forecast = 210,000
```

### Practice 2: MAE and MAPE

Actual values are `[100,000, 200,000, 100,000]`; forecasts are `[110,000, 180,000, 95,000]`.

Find MAE and MAPE.

**Answer:**

```text
absolute errors = [10,000, 20,000, 5,000]
MAE = 35,000 / 3 = 11,666.67 BDT

percentage errors = [10%, 10%, 5%]
MAPE = 25% / 3 = 8.3333%
```

### Practice 3: prediction interval

Forecast is BDT 800,000; residual standard deviation is BDT 25,000.

**Answer:**

```text
margin = 1.96 × 25,000 = 49,000
interval = [751,000, 849,000]
```

### Practice 4: top-up

Forecast is BDT 751,000; current main-wallet balance is BDT 720,000.

**Answer:**

```text
top-up = max(0, 751,000 - 720,000) = 31,000 BDT
```
