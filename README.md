# upay Corporate Assist

upay Corporate Assist is a multi-tenant corporate payroll-disbursement platform. It combines a corporate HR/Finance maker-checker workspace, an internal upay administration portal, a Flask API, and PostgreSQL.

## What is in this repository

| Directory | Purpose | Default URL |
| --- | --- | --- |
| `backend/` | Flask REST API, authentication, business rules, forecasting, and database models | `http://localhost:5000` |
| `frontend/` | Corporate HR Maker and Finance Checker dashboard | `http://localhost:3000` |
| `upay-admin/` | Internal upay operations portal | `http://localhost:3001` |
| `database/` | PostgreSQL schema, indexes, demo data, and maintenance SQL | N/A |
| `docs/architecture/` | ERD and forecasting architecture notes | N/A |
| `scripts/` | Payroll workbook/template generation utilities | N/A |

All three applications use the same Flask API. Both web applications read `NEXT_PUBLIC_API_URL`; they do not connect to PostgreSQL directly.

## Roles and user creation

The application has three roles:

| Business user | Stored role | Application | Main responsibility |
| --- | --- | --- | --- |
| Corporate HR | `MAKER` | `frontend` | Register employees, upload/correct payroll, submit batches, and execute an approved batch |
| Corporate Finance | `CHECKER` | `frontend` | Review exceptions and approve or reject submitted payroll batches |
| upay operations user | `ADMIN` | `upay-admin` | Onboard companies, fund wallets, approve employee registrations, and provision users |

There is currently no self-registration or corporate-user creation screen in `frontend/`. The `upay-admin` UI also does not currently expose its existing user-provisioning API. Therefore:

1. Bootstrap the first `ADMIN` with `backend/scripts/create_superuser.py`.
2. Sign in as that administrator.
3. Create each HR (`MAKER`), Finance (`CHECKER`), or additional upay (`ADMIN`) account through `POST /api/admin/users`, as shown below.

## Prerequisites

- PostgreSQL 12 or newer, with `createdb` and `psql` available
- Python 3.11 or newer
- Node.js 20.9 or newer and npm
- Three terminal windows for running the API and two Next.js applications

## Complete local setup

### 1. Create the PostgreSQL database

Start PostgreSQL, then create a new database from the repository root:

```bash
createdb upay_corporate_assist
```

If your local PostgreSQL server requires a username or password, use the matching connection URL in every command below, for example:

```text
postgresql://postgres:your-password@localhost:5432/upay_corporate_assist
```

### 2. Configure and install the backend

```bash
cd backend
python3 -m venv .venv
source .venv/bin/activate
python -m pip install --upgrade pip
python -m pip install -r requirements.txt
cp .env.example .env
```

Edit `backend/.env`:

```dotenv
PORT=5000
HOST=127.0.0.1
FLASK_ENV=development
SECRET_KEY=replace-with-a-long-random-secret
JWT_SECRET_KEY=replace-with-a-different-long-random-secret
JWT_EXPIRATION_HOURS=24
CORPORATE_AUTH_COOKIE_NAME=upay_corporate_session
ADMIN_AUTH_COOKIE_NAME=upay_admin_session
AUTH_COOKIE_SECURE=false
CORS_ORIGINS=http://localhost:3000,http://localhost:3001,http://127.0.0.1:3000,http://127.0.0.1:3001
RATELIMIT_STORAGE_URI=memory://
DATABASE_URL=postgresql://localhost:5432/upay_corporate_assist
UPLOAD_FOLDER=uploads
DEMO_SEED_PASSWORD=choose-a-local-demo-password
```

Generate and safely write different local secrets without displaying them:

```bash
cd backend
python3 scripts/rotate_secrets.py
```

Use passwords containing at least 12 characters. For a deployed environment, set `FLASK_ENV=production`, enable `AUTH_COOKIE_SECURE=true`, configure only the deployed frontend origins, and use shared rate-limit storage such as Redis instead of `memory://`.

`backend/.env` is the file the Flask application loads. The root `.env.example` is only a combined reference and is not loaded by the applications.

### 3. Create the schema and indexes

Return to the repository root and run:

```bash
cd ..
psql postgresql://localhost:5432/upay_corporate_assist -f database/schema/01_create_schema.sql
psql postgresql://localhost:5432/upay_corporate_assist -f database/schema/02_create_indexes.sql
```

Warning: `database/schema/01_create_schema.sql` drops and recreates all application tables. Use it only for a new database or an intentional full rebuild. `db.create_all()` in `backend/run.py` can create missing tables, but it is not a migration system and does not create all of the checked-in performance indexes.

### 4. Choose clean setup or demo setup

#### Option A: clean setup

Create the first upay administrator before starting the applications:

1. Open `backend/scripts/create_superuser.py`.
2. Replace every value in the `SUPERUSER` block with local values. Use an 11-digit Bangladesh mobile number beginning with `01`.
3. Do not commit a real password to Git.
4. Run:

```bash
cd backend
source .venv/bin/activate
python3 scripts/create_superuser.py
```

The script creates an active `ADMIN` with `company_id = NULL`. If a user with the same email or phone already exists, it updates that user and resets the account to an active administrator.

Continue with company onboarding and corporate user creation after starting the services.

#### Option B: login-ready demonstration setup

From `backend/`, run:

```bash
source .venv/bin/activate
python3 run.py --seed
```

This command seeds the empty database and then keeps the Flask API running. Leave it running as the API terminal, or stop it with `Ctrl+C` and start it again in step 6.

The seed uses `DEMO_SEED_PASSWORD` from `backend/.env` for all four demonstration accounts:

| Email | Role | Company |
| --- | --- | --- |
| `maker.tanvir@fmcg-corp.com` | `MAKER` (HR) | Company 1 |
| `checker.dipra@fmcg-corp.com` | `CHECKER` (Finance) | Company 1 |
| `maker.rahim@invest-corp.com` | `MAKER` (HR) | Company 2 |
| `admin@upay.com.bd` | `ADMIN` | Global/upay |

The Python seed only runs when the database contains no company records. If companies already exist, it prints a skip message.

Do not use `database/seeds/03_insert_seed_data.sql` when you need working demo logins: its user rows intentionally contain placeholder password hashes. Use `python3 run.py --seed` instead.

### 5. Configure and install both frontends

From the repository root (run `cd ..` first if the current shell is still in `backend/`), configure the corporate portal:

```bash
cd frontend
npm ci
cp .env.example .env.local
```

`frontend/.env.local` should contain:

```dotenv
NEXT_PUBLIC_API_URL=http://localhost:5000/api
NEXT_PUBLIC_APP_NAME=upay Corporate Assist
```

upay admin portal:

```bash
cd ../upay-admin
npm ci
cp .env.example .env.local
```

`upay-admin/.env.local` should contain:

```dotenv
NEXT_PUBLIC_API_URL=http://localhost:5000/api
```

Restart a Next.js development server after changing an `.env.local` file.

### 6. Start all services

If `python3 run.py --seed` is still running, it is already Terminal 1; do not start a second API process.

Terminal 1 — Flask API:

```bash
cd backend
source .venv/bin/activate
python3 run.py
```

Terminal 2 — corporate HR/Finance portal:

```bash
cd frontend
npm run dev
```

Terminal 3 — upay admin portal:

```bash
cd upay-admin
npm run dev
```

Verify the API:

```bash
curl http://localhost:5000/health
```

Then open:

- Corporate HR/Finance portal: <http://localhost:3000>
- upay admin portal: <http://localhost:3001>

## Clean-install onboarding and user provisioning

Follow this section after completing the clean setup.

### 1. Sign in as the bootstrapped upay administrator

Use the email and password configured in `backend/scripts/create_superuser.py` at <http://localhost:3001>.

You can onboard a company from **Companies → Onboard company**. That action also creates the company's main disbursement wallet. User creation is not yet available in the UI, so use the authenticated API steps below.

### 2. Obtain an admin token

```bash
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@your-upay-domain.com",
    "password": "your-admin-password"
  }'
```

Copy the returned `token` value and set it in the same terminal:

```bash
export ADMIN_TOKEN='paste-the-returned-token-here'
```

### 3. Find or create the company

If the company was created in the admin portal, list companies and note its numeric `id`:

```bash
curl http://localhost:5000/api/admin/companies \
  -H "Authorization: Bearer $ADMIN_TOKEN"
```

Alternatively, create it through the API:

```bash
curl -X POST http://localhost:5000/api/admin/companies \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "company_name": "Example Company Limited",
    "corporate_account_number": "CORP-EXAMPLE-001",
    "wallet_name": "Main Payroll Wallet",
    "opening_balance": 0
  }'
```

The response contains the new company `id`. Use that value as `company_id` for both corporate users. A Maker and Checker must belong to the same company to participate in the same payroll workflow.

### 4. Create the HR user (`MAKER`)

```bash
curl -X POST http://localhost:5000/api/admin/users \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "company_id": 1,
    "full_name": "HR Manager",
    "email": "hr@example-company.com",
    "phone_number": "01700000001",
    "password": "choose-a-strong-password",
    "role": "MAKER"
  }'
```

This user signs in at <http://localhost:3000> and is routed to the Maker workspace.

### 5. Create the Finance user (`CHECKER`)

```bash
curl -X POST http://localhost:5000/api/admin/users \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "company_id": 1,
    "full_name": "Finance Director",
    "email": "finance@example-company.com",
    "phone_number": "01700000002",
    "password": "choose-a-different-strong-password",
    "role": "CHECKER"
  }'
```

This user signs in at <http://localhost:3000> and is routed to the Checker workspace.

### 6. Create another upay admin user

An existing `ADMIN` can create another account for `upay-admin` with the same endpoint. Omit `company_id`; admin users are global:

```bash
curl -X POST http://localhost:5000/api/admin/users \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "full_name": "upay Operations Admin",
    "email": "operations.admin@upay.com.bd",
    "phone_number": "01900000001",
    "password": "choose-another-strong-password",
    "role": "ADMIN"
  }'
```

The new administrator signs in at <http://localhost:3001>. The API lowercases emails, requires a unique email, creates accounts as `ACTIVE`, and rejects `MAKER` or `CHECKER` users without a valid company.

To confirm the accounts for one company:

```bash
curl "http://localhost:5000/api/admin/users?company_id=1" \
  -H "Authorization: Bearer $ADMIN_TOKEN"
```

## First payroll workflow

1. The HR Maker signs in to the corporate portal.
2. An upay Admin funds the company's Main central wallet through the admin portal.
3. HR may create zero-balance sub-wallets and allocate existing Main-wallet funds to them. Transfers debit one wallet and credit the other atomically, so they never create additional company money.
4. HR submits employee registrations from the registration CSV template in `frontend/public/employee_registration_template.csv`.
5. An upay Admin approves those registrations in the admin portal. Approval creates approved employee-roster records and mock upay account records used by this project.
6. HR uploads an `.xlsx`, `.xls`, or `.csv` payroll file. A blank workbook is available at `frontend/public/templates/payroll-upload-template.xlsx`.
7. The API validates phone/account status, reconciles the company roster, and flags salary anomalies.
8. HR corrects blocking issues and submits the batch for Finance review.
9. The Finance Checker reviews alerts and approves or rejects the batch.
10. After approval, the HR Maker executes the disbursement. The API verifies and deducts the company's wallet balance and records audit history.

The supported payout path is upload → correct/review → submit → checker review → maker execution. The legacy OTP request/authorize endpoints return `410 Gone`.

## Verification

Backend tests use an in-memory SQLite database and do not modify the local PostgreSQL database:

```bash
cd backend
source .venv/bin/activate
python -m pip install pytest
pytest tests -v
```

Check both web applications:

```bash
cd frontend
npm run lint
npm run build

cd ../upay-admin
npm run lint
npm run build
```

## Common setup problems

- **`SECRET_KEY and JWT_SECRET_KEY must be configured`** — create `backend/.env` and set both values.
- **PostgreSQL connection refused** — start PostgreSQL and verify `DATABASE_URL`, the port, database name, and credentials.
- **`relation ... does not exist`** — initialize the fresh database with the schema scripts or start `backend/run.py` once so SQLAlchemy can create missing tables.
- **Login fails after loading `03_insert_seed_data.sql`** — those SQL users have placeholder hashes. Rebuild an empty local database and use `python3 run.py --seed`, or create an admin with `create_superuser.py` and provision users through the API.
- **Demo seed says it is skipping** — the seed intentionally stops when any company already exists.
- **A corporate user receives `403`** — verify the account is `ACTIVE`, has the correct `MAKER`/`CHECKER` role, and has the correct `company_id`.
- **The admin portal rejects a valid corporate login** — `upay-admin` accepts only `ADMIN`; HR and Finance must use port 3000.
- **Frontend requests reach the wrong API** — check each app's `.env.local` and restart its Next.js server.
- **Port already in use** — keep the defaults aligned (`5000`, `3000`, `3001`) or update the API URL and start command consistently.

## Production notes

- Replace all development secrets and passwords; never commit `.env`, `.env.local`, or real credentials.
- Serve the Flask API and Next.js applications behind production servers/reverse proxies; do not use Flask debug mode.
- Keep `CORS_ORIGINS` limited to the exact deployed corporate and admin portal origins.
- Use a migration tool and backups for existing databases. The checked-in schema is destructive and `db.create_all()` is not a migration strategy.
- Use HTTPS, a managed secret store, least-privilege PostgreSQL credentials, and a controlled admin-provisioning process.
- The mock `accounts` table represents the upay core account registry for this project and must be replaced/integrated appropriately in a real deployment.

## Additional documentation

- [Backend guide](backend/README.md)
- [Database guide](database/README.md)
- [Architecture documents](docs/architecture/)
- [Corporate frontend notes](frontend/README.md)
- [upay admin notes](upay-admin/README.md)
