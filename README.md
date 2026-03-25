# O2C Context Graph

Next.js 15 application that turns the provided SAP order-to-cash JSONL exports into:

- a normalized O2C data model
- a graph projection with expandable neighborhoods
- a grounded natural-language query API
- a split-pane graph + chat UI

## What is included

- `src/lib/o2c/dataset.ts`
  Parses the raw JSONL files, normalizes document-item keys, computes flow statuses, and builds graph nodes/edges plus analytical view rows.
- `src/db/schema.ts`
  Drizzle schema for the normalized Postgres tables and graph projection tables.
- `src/db/views.ts`
  SQL for `v_o2c_flow_item`, `v_billing_trace`, and `v_entity_lookup`.
- `src/app/api/*`
  Graph search, graph neighborhood, and grounded query routes.
- `src/components/*`
  Split-pane UI with Cytoscape graph explorer, node inspector, sample prompts, SQL trace, and result preview.
- `scripts/ingest-sap-jsonl.ts`
  One-time seed script for Postgres/Supabase.

## Run locally

1. Install dependencies:

```bash
npm install
```

2. Copy `.env.example` to `.env.local`.

3. Optional but recommended: set a Postgres connection string and Gemini API key:

```env
DATABASE_URL=postgres://...
GOOGLE_GENERATIVE_AI_API_KEY=...
APP_DATASET_ROOT=./sap-o2c-data
```

4. Start the app:

```bash
npm run dev
```

The app works in a fallback in-memory mode when `DATABASE_URL` is not set, using the provided dataset directly. With both `DATABASE_URL` and `GOOGLE_GENERATIVE_AI_API_KEY` configured, the query API upgrades to the full Postgres + Gemini flow from the assignment plan.

## Seed Postgres

Push the schema, then ingest the dataset:

```bash
npm run db:push
npm run ingest
```

This creates the normalized tables, inserts the dataset, and materializes the analytical views.

## Run Postgres with Docker Compose

If you do not have Postgres installed locally, start the included compose stack:

```bash
docker compose up -d
```

Included services:

- `postgres`
  Local Postgres 16 on `localhost:5432`
- `adminer`
  Optional DB UI on [http://localhost:8080](http://localhost:8080)

The default local database settings already match the compose file:

```env
DATABASE_URL=postgres://postgres:postgres@localhost:5432/o2c_context_graph
```

Then initialize the database:

```bash
npm run db:push
npm run ingest
```

Or do both in one step:

```bash
npm run db:init
```

To stop the stack:

```bash
docker compose down
```

## Quality checks

```bash
npm run typecheck
npm run test
npm run lint
npm run build
```

## Tested dataset-backed examples

- top billed products include `S8907367008620` and `S8907367039280`
- billing document `90504248` traces to sales order `740552`, delivery `80738072`, and accounting document `9400000249`
- incomplete sales orders include `740506`, `740507`, and `740508`

## Deployment target

- Frontend/API: Vercel Hobby
- Database: Supabase Free Postgres
- LLM: Gemini 2.5 Flash / Flash-Lite via `@ai-sdk/google`
