# upay Control Room

Internal operations portal for the upay team. It connects to the same Flask API and PostgreSQL database as `frontend/`, while its admin API routes require an `ADMIN` JWT.

## Run

```bash
cd upay-admin
npm install
npm run dev
```

The portal runs at `http://localhost:3001`. Copy `.env.example` to `.env.local` if the Flask API is not at `http://localhost:5000/api`. Sign in with a provisioned administrator account.
