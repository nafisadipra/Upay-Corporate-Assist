# Database scripts

The application uses PostgreSQL. The live database stores the records, while these
files provide a reproducible current schema, optional demonstration data, and
maintenance utilities. The current backend defines 18 tables in
`backend/app/models/models.py`.

## Directory structure

```text
database/
├── schema/
│   ├── 01_create_schema.sql
│   └── 02_create_indexes.sql
├── seeds/
│   ├── 03_insert_seed_data.sql
│   ├── 07_create_clean_fmcg_test_tenant.sql
│   └── 08_seed_fmcg_30_test_employees.sql
└── utilities/
    ├── 04_test_queries.sql
    ├── 06_clear_demo_data.sql
    └── 09_reset_fmcg_pending_registration_demo.sql
```

## Fresh database

Warning: `01_create_schema.sql` drops and recreates the application tables. Run it
only for a new database or when intentionally rebuilding one.

```bash
psql "$DATABASE_URL" -f database/schema/01_create_schema.sql
psql "$DATABASE_URL" -f database/schema/02_create_indexes.sql
```

Optionally load demonstration data:

```bash
psql "$DATABASE_URL" -f database/seeds/03_insert_seed_data.sql
```

The fresh-install schema includes all 18 model tables, current forecast tables,
`batches.payroll_period`, salary columns, workflow states, and model constraints.

## Seeds and utilities

Files under `seeds/` insert optional demonstration records. Files under `utilities/`
are manual operational tools. In particular, `06_clear_demo_data.sql` removes all
application records and must never be included in normal application startup.

## Backend models

`backend/app/models/models.py` lets SQLAlchemy query and update tables, and
`db.create_all()` can create tables that do not exist. It does not migrate existing
tables, create a backup, or store PostgreSQL records in Git. The checked-in schema
represents the current database structure.
