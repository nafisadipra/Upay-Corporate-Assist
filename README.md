# upay Corporate Assist

Corporate payroll-disbursement platform with a maker/checker workflow, payroll validation, risk review, wallet management, and audit logging.

## Project layout

```text
.
├── backend/                  # Flask API, business services, ORM models, and tests
├── frontend/                 # Corporate maker/checker dashboard (Next.js)
├── upay-admin/               # Internal upay operations portal (Next.js)
├── database/                 # PostgreSQL schema, indexes, seed data, and SQL checks
├── docs/
│   └── architecture/          # ERD and architecture diagrams
├── .github/workflows/         # CI configuration
└── .env.example               # Cross-application environment reference
```

## Applications

| Application | Purpose | Default URL |
| --- | --- | --- |
| `backend` | Flask REST API and database workflow engine | `http://127.0.0.1:5000` |
| `frontend` | Corporate HR maker and finance checker dashboard | `http://localhost:3000` |
| `upay-admin` | Internal operations and corporate-management portal | `http://localhost:3001` |

## Local development

1. Configure `backend/.env` from `backend/.env.example` with a local database URL and secure secrets.
2. For local demonstration data only, set `DEMO_SEED_PASSWORD` and start the API: `cd backend && python3 run.py --seed`.
3. Start the corporate dashboard: `cd frontend && npm run dev`.
4. Start the operations portal when needed: `cd upay-admin && npm run dev`.

## Useful resources

- [Database setup](database/README.md)
- [Backend API guide](backend/README.md)
- [Architecture documents](docs/architecture/)

## Repository conventions

- Keep application code within its application directory; do not add feature code to the repository root.
- Keep diagrams and implementation documentation in `docs/`.
- Keep local secrets out of version control. `credentials.txt` is ignored for future changes, but any credentials already shared elsewhere should be rotated.
