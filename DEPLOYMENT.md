# Deployment Guide (Evaluator-Friendly)

This project deploys as a single Next.js app (UI + API routes) backed by a managed Postgres database. The database is seeded once from the fixed `sap-o2c-data/` dataset.

Recommended stack for a public demo:

- Hosting: Vercel (Hobby)
- Database: Supabase Postgres (Free)
- LLM: Gemini API key (free tier)

## Prerequisites

- Node.js + npm
- A Vercel account
- A managed Postgres database (Supabase recommended)
- A Gemini API key (needed for open-ended NL-to-SQL; templates still work without it)

## 1) Create a managed Postgres database (Supabase)

1. Create a new Supabase project.
2. Grab two Postgres connection strings:
   - Direct connection string (use for migrations/seeding from your laptop)
   - Pooler/connection pooling string (use for Vercel runtime)
3. Ensure TLS is enabled (Supabase strings typically include `sslmode=require`).

You'll use these as `DATABASE_URL` at different times.

## 2) Seed the remote database (one-time)

The seed flow:

- `npm run db:push` creates/updates tables.
- `npm run ingest` loads `sap-o2c-data/` and inserts normalized entities + graph tables.
- `src/db/views.ts` creates semantic views used by the query guardrails.

### 2.1 Configure env locally

Create `.env.local` in the repo root:

```env
DATABASE_URL=postgres://...   # direct connection string while seeding
GOOGLE_GENERATIVE_AI_API_KEY=...
APP_DATASET_ROOT=./sap-o2c-data

# Optional tuning (useful on serverless deploys)
DATABASE_POOL_MAX=1
QUERY_STATEMENT_TIMEOUT_MS=3000
```

Notes:

- `APP_DATASET_ROOT` is optional if `sap-o2c-data/` exists in the repo root.
- `GOOGLE_GENERATIVE_AI_API_KEY` is optional if you only want template-backed queries.

### 2.2 Push schema + seed

```bash
npm install
npm run db:init
```

Important:

- Seeding deletes and recreates dataset tables every run (`src/db/seed.ts`). Use a dedicated demo database.

## 3) Deploy to Vercel

### 3.1 Create the Vercel project

1. Push the repo to GitHub (or GitLab/Bitbucket).
2. Import the repo into Vercel.
3. Use default Next.js settings:
   - Build command: `npm run build`
   - Output: Next.js default

### 3.2 Set environment variables on Vercel

In Vercel Project Settings -> Environment Variables, set:

- `DATABASE_URL`
  - Use the Supabase pooler/connection pooling string for serverless runtime.
- `GOOGLE_GENERATIVE_AI_API_KEY`
  - Required for open-ended NL-to-SQL.
- Optional:
  - `DATABASE_POOL_MAX=1`
  - `QUERY_STATEMENT_TIMEOUT_MS=3000`

Redeploy after saving env vars.

## 4) Post-deploy smoke test

Open the deployed URL and verify:

1. Graph explorer loads and search works.
2. `POST /api/query` works for the sample questions.
3. Responses include `answer`, `sql`, and `rowsPreview`.

## Troubleshooting

### Graph loads but DB queries fail

- Confirm Vercel `DATABASE_URL` points at the seeded database.
- If you changed schema/views, rerun `npm run db:init` against the same database.

### "The query could not be completed safely"

- SQL guardrails rejected the query (unsafe SQL, or non-allowlisted view/column).
- Recreate schema + views: `npm run db:push` and `npm run ingest`.

### Gemini quota / 429 errors

- Free tiers can be low.
- Demo tips:
  - Prefer the sample question chips (templates cover several).
  - Avoid many unique open-ended questions back-to-back.
  - If you need more headroom, use a key/project with higher quota.

### Too many DB connections (serverless)

- Use the pooler connection string on Vercel.
- Set `DATABASE_POOL_MAX=1`.

## Optional hardening (if you keep iterating)

- Cache `/api/query` results (SQL plan + rows) to reduce LLM calls.
- Add rate limiting for `/api/query` to protect LLM quota.
- Add indexes/materialized views for heavier analytics.

