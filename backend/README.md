# upay Corporate Assist - Flask Backend Engine

**Project Name:** upay Corporate Assist (Next-Gen B2B Bulk Payout Platform with Intelligent Risk & Liquidity Analytics)  
**Author:** Nafisha Anzum Dipra  
**Framework:** Flask 3.x (Python 3.13)  
**ORM:** SQLAlchemy (PostgreSQL / SQLite)  
**Machine Learning:** Scikit-Learn (Isolation Forest) & Pandas  

---

## 1. Overview & Architecture

The **upay Corporate Assist Backend Engine** is a high-performance RESTful web application built with Flask and SQLAlchemy. It powers corporate bulk payroll disbursements, implementing multi-stage validation, automated risk auditing, Maker-Checker governance, and predictive capital forecasting.

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           Flask REST API Engine                             │
│                                                                             │
│  ┌───────────────────┐    ┌────────────────────────┐    ┌────────────────┐  │
│  │   Auth & JWT      │    │  HR Bulk Excel Parsing │    │ AI Risk Shield │  │
│  │  (Maker/Checker)  │    │  & Multi-Stage Grid    │    │ (Isolation     │  │
│  └─────────┬─────────┘    └───────────┬────────────┘    │  Forest)       │  │
│            │                          │                 └───────┬────────┘  │
│  ┌─────────┴─────────┐    ┌───────────┴────────────┐    ┌───────┴────────┐  │
│  │ Maker-Checker OTP │    │  Predictive Liquidity  │    │  BB Audit      │  │
│  │ Authorization     │    │  Forecasting Engine    │    │  Compliance    │  │
│  └───────────────────┘    └────────────────────────┘    └────────────────┘  │
└──────────────────────────────────────┬──────────────────────────────────────┘
                                       │ SQLAlchemy ORM
                                       ▼
                        ┌──────────────────────────────┐
                        │  PostgreSQL / SQLite DB      │
                        │  (12 Relational Tables)      │
                        └──────────────────────────────┘
```

---

## 2. Key Business Workflows Implemented

### A. Multi-Stage Account & HR Roster Verification Grid (pp2 Section 3.A)
1. **Excel Parsing**: Parses `.xlsx`, `.xls`, or `.csv` payroll spreadsheets uploaded by HR Makers.
2. **Core MFS Account Check**: Screens raw phone numbers against `accounts` (mock upay core database) to detect:
   - `INVALID_LENGTH`: Format error (not 11 digits starting with '01').
   - `UNREGISTERED_ACCOUNT`: Mobile number missing from core upay DB (Red Flag).
   - `INACTIVE_ACCOUNT`: Account suspended/inactive (Red Flag).
3. **Corporate HR Roster Reconciliation**: Cross-references every payee mobile number against `employees` (company's approved HR roster). If a valid active mobile number is missing from HR roster, it is flagged as **`UNRECOGNIZED_PAYEE`** (Ghost Employee Prevention).
4. **Inline Typo Correction**: Enables HR Makers to edit phone typos directly inside the Bento Grid before sending (`PUT /api/batches/items/<id>/correct`), re-triggering verification dynamically.

### B. Intelligent Pattern Auditor & Cold-Start Handling (pp2 Section 3.B)
1. **Established Employees (>= 3 Cycles)**: Evaluates amount against individual 6-month historical average (`six_month_avg_amount`). Flags deviations > 80% as `UNUSUAL_VARIANCE` (Orange Badge).
2. **Cold-Start Employees (< 3 Cycles)**: Falls back to department-level averages (`dept_avg_amount`) and marks baseline status as **`BASELINE_PENDING`** (non-blocking).

### C. Maker-Checker OTP Authorization & Audit Trail (pp2 Section 4)
1. Segregation of duties: `MAKER` uploads, `CHECKER` authorizes.
2. Generates time-limited OTP tokens hashed via SHA-256.
3. Verifies central wallet balance, deducts balance, and records immutable audit logs in JSONB format compliant with Bangladesh Bank regulations.

### D. Predictive Capital Forecasting (pp2 Section 3.C)
Projects 3, 6, and 12-month central wallet pre-funding requirements based on historical disbursement trends.

---

## 3. Directory Structure

```
backend/
├── app/
│   ├── __init__.py           # Flask Application Factory
│   ├── config.py             # App Configuration
│   ├── extensions.py         # Extensions (SQLAlchemy)
│   ├── models/               # SQLAlchemy ORM Models (12 tables)
│   │   ├── __init__.py
│   │   └── models.py
│   ├── services/             # Core Business Logic & AI Engines
│   │   ├── excel_parser.py   # Spreadsheet upload parser
│   │   ├── validation_service.py # Core account & HR roster check
│   │   ├── anomaly_service.py    # Isolation Forest & cold-start logic
│   │   ├── otp_service.py        # Maker-Checker OTP authorization
│   │   ├── forecasting_service.py # Predictive liquidity calculator
│   │   └── seed_service.py       # DB Seeding utility
│   └── routes/               # API Blueprints (Controllers)
│       ├── auth.py           # Login & JWT auth
│       ├── companies.py      # Company & wallet profiles
│       ├── batches.py        # Batch upload, grid & OTP authorization
│       ├── risk_alerts.py    # Checker risk review sign-offs
│       ├── analytics.py      # Liquidity forecasts & dashboard KPIs
│       └── audit.py          # Bangladesh Bank audit trail
├── uploads/                  # Uploaded spreadsheet storage
├── run.py                    # Server Entry Point
├── requirements.txt          # Dependencies
└── README.md                 # Backend Documentation
```

---

## 4. Setup & Running Instructions

### Step 1: Install Dependencies
```bash
cd /Users/user/Documents/Upay-Corporate-Assist/backend
python3 -m pip install -r requirements.txt
```

### Step 2: Seed Local Demonstration Data & Start Flask Server
```bash
# DEMO_SEED_PASSWORD is required only for this local seeding command.
export DEMO_SEED_PASSWORD='choose-a-unique-local-password'
# Runs DB creation and seeds local demonstration data matching database/seeds/03_insert_seed_data.sql
python3 run.py --seed
```

Server will run on `http://127.0.0.1:5000`.

### Create a local superuser

After clearing data with `database/utilities/06_clear_demo_data.sql`, edit the `SUPERUSER`
block in `scripts/create_superuser.py`, then run:

```bash
python3 scripts/create_superuser.py
```

The script creates one active `ADMIN` account, or updates the existing account with
the same email or phone number. Keep real credentials out of version control.

---

## 5. API Endpoint Reference

### Authentication (`/api/auth`)
| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `POST` | `/api/auth/login` | Authenticate user & receive JWT token |
| `GET` | `/api/auth/me` | Retrieve current authenticated user profile |

### Corporate Clients & Wallets (`/api/companies`)
| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `GET` | `/api/companies` | List corporate clients |
| `GET` | `/api/companies/<id>` | Get company profile & wallet balance |
| `GET` | `/api/companies/<id>/wallets` | List pre-funded central wallets |
| `GET` | `/api/companies/<id>/employees` | Retrieve approved corporate HR roster |

### Batches & Bento Grid Validation (`/api/batches`)
| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `POST` | `/api/batches/upload` | **HR Bulk Excel/CSV upload & screening** |
| `GET` | `/api/batches` | List company payout batches |
| `GET` | `/api/batches/<id>` | Get batch header summary metrics |
| `GET` | `/api/batches/<id>/items` | Get batch payee items with Bento Grid UI flags |
| `PUT` | `/api/batches/items/<id>/correct` | **Inline phone typo correction & re-verify** |
| `POST` | `/api/batches/<id>/submit` | Submit batch for Checker approval |
| `POST` | `/api/batches/<id>/checker-review` | Checker review and sign-off |
| `POST` | `/api/batches/<id>/execute` | Execute a batch after checker sign-off |

### Risk Alerts & Checker Review (`/api/risk-alerts`)
| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `GET` | `/api/risk-alerts` | List open risk alerts |
| `PUT` | `/api/risk-alerts/<id>/review` | Checker review sign-off (approve/override alert) |

### Predictive Analytics (`/api/analytics`)
| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `GET` | `/api/analytics/liquidity-forecast/<company_id>` | Predictive central wallet capital forecast |
| `GET` | `/api/analytics/summary/<company_id>` | Dashboard KPI metrics |

### Regulatory Audits (`/api/audit-logs`)
| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `GET` | `/api/audit-logs` | Retrieve Bangladesh Bank compliance audit logs |

---

## 6. Workflow verification (`curl`)

```bash
# 1. Login with a provisioned HR Maker account
curl -X POST http://127.0.0.1:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email": "maker@example.com", "password": "your-password"}'

# 2. Get Batch Payee Items (Demonstrates Bento Grid UI Flags)
curl -X GET http://127.0.0.1:5000/api/batches/1/items

# 3. Correct Phone Typo Inline
curl -X PUT http://127.0.0.1:5000/api/batches/items/4/correct \
  -H "Content-Type: application/json" \
  -d '{"corrected_phone_number": "01711112233"}'

# 4. Checker reviews and signs off on the submitted batch
curl -X POST http://127.0.0.1:5000/api/batches/1/checker-review \
  -H "Authorization: Bearer <checker-token>" \
  -H "Content-Type: application/json" \
  -d '{"action":"APPROVED_BY_CHECKER", "notes":"Verified"}'

# 5. Get Predictive Liquidity Forecast
curl -X GET http://127.0.0.1:5000/api/analytics/liquidity-forecast/1
```

The legacy `/request-otp` and `/authorize` routes are retired. The only supported payout path is upload, submit, checker review, then maker execution.
