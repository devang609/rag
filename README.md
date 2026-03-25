# O2C Context Graph

A deployable Order-to-Cash context graph built with Next.js 15, PostgreSQL, and a guarded LLM query layer.

The app ingests the provided SAP-style JSONL exports, normalizes them into business entities, projects them into a graph, visualizes the graph in a split-pane UI, and answers natural-language questions with dataset-backed results.

## Overview

This repository implements four main capabilities:

1. Graph construction from fragmented O2C source files
2. Graph exploration with searchable, inspectable entity neighborhoods
3. Natural-language querying over a constrained semantic layer
4. Guardrails that keep answers grounded in the provided dataset only

The project supports two runtime modes:

- In-memory mode:
  - no Postgres required
  - graph explorer works
  - deterministic assignment queries work
- Full mode:
  - Postgres + Gemini configured
  - semantic SQL executes against the database
  - broader NL-to-SQL fallback is enabled

## What This Solves

The raw dataset is spread across multiple business documents and master-data files:

- Sales Orders
- Deliveries
- Billing Documents / Invoices
- Journal Entries
- Payments
- Customers
- Products
- Addresses
- Plants

This app unifies those pieces into a connected business graph and exposes both:

- a visual relationship explorer
- a conversational interface that translates natural language into structured reads

## Tech Stack

### Core stack

| Technology | Role in this project |
| --- | --- |
| Next.js 15 | Full-stack application framework, routing, API endpoints, production build |
| React 19 | Frontend UI rendering |
| TypeScript | Type safety across UI, API, and data/modeling layers |
| PostgreSQL | Primary persistent database for normalized data, graph projection, and semantic views |
| Drizzle ORM | Database schema definition, seeding, and DB access |
| `pg` | PostgreSQL connection pool and query execution |
| Cytoscape.js | Graph visualization and interaction |
| AI SDK (`ai`) | Structured LLM integration layer |
| `@ai-sdk/google` | Gemini provider for SQL planning and grounded answer synthesis |
| Zod | Validation for request bodies and LLM structured outputs |
| `pgsql-ast-parser` | SQL AST parsing and query guardrails |

### Dev and quality stack

| Technology | Role |
| --- | --- |
| Vitest | Unit/service tests |
| React Testing Library | Component testing |
| Playwright | End-to-end browser tests |
| ESLint | Static linting |
| Docker Compose | Local Postgres + Adminer runtime |

## Architecture

```mermaid
flowchart LR
  A["Raw JSONL dataset"] --> B["Normalization layer"]
  B --> C["Normalized business tables"]
  C --> D["Graph projection"]
  C --> E["Semantic SQL views"]
  D --> F["Graph APIs"]
  E --> G["NL query service"]
  F --> H["Graph explorer UI"]
  G --> I["Chat UI"]
```

### Major layers

| Layer | Main files | Responsibility |
| --- | --- | --- |
| Dataset normalization | `src/lib/o2c/dataset.ts` | Parse JSONL, normalize IDs, derive flow states, build graph data |
| Database schema | `src/db/schema.ts` | Define normalized tables and graph projection tables |
| Semantic SQL layer | `src/db/views.ts` | Create read-only analytical views for safe querying |
| Graph services | `src/lib/graph/service.ts` | Search nodes and fetch node neighborhoods |
| Query services | `src/lib/query/service.ts`, `src/lib/query/templates.ts`, `src/lib/query/guardrails.ts` | Translate NL -> safe query -> grounded answer |
| UI | `src/components/O2CWorkspace.tsx`, `src/components/GraphCanvas.tsx` | Graph explorer, inspector, chat, SQL preview, rows preview |
| API routes | `src/app/api/*` | Expose graph and query endpoints |

## Data Model

### Normalized tables

The project models the O2C flow as normalized business entities:

- `customers`
- `addresses`
- `products`
- `plants`
- `sales_orders`
- `sales_order_items`
- `deliveries`
- `delivery_items`
- `billing_documents`
- `billing_items`
- `journal_entries`
- `payments`

Supporting lookup tables retained in v1:

- `customer_company_assignments`
- `customer_sales_area_assignments`
- `product_plants`
- `product_storage_locations`

Graph projection tables:

- `graph_nodes`
- `graph_edges`

### Important normalization rules

- Item IDs are canonicalized:
  - `000010` becomes `10`
- Billing headers and billing cancellations are merged into one billing-document layer
- Dates are converted into typed timestamps when inserted into Postgres
- Flow status is computed explicitly per item

### Flow statuses

- `ordered_not_delivered`
- `delivered_not_billed`
- `billed_not_posted`
- `posted_not_cleared`
- `complete`

## Graph Model

### Node types

- customer
- address
- product
- plant
- sales_order
- sales_order_item
- delivery
- delivery_item
- billing_document
- billing_item
- journal_entry
- payment

### Relationship types

- `HAS_ADDRESS`
- `PLACED_BY`
- `HAS_ITEM`
- `FOR_PRODUCT`
- `REQUESTS_FROM`
- `FULFILLED_BY`
- `SHIPPED_FROM`
- `BILLED_TO`
- `BILLED_AS`
- `POSTED_TO`
- `CLEARED_BY`

### Stable graph IDs

Examples:

- `sales_order:740552`
- `sales_order_item:740552:10`
- `delivery:80738072`
- `billing_document:90504248`
- `customer:320000083`

## Semantic Query Layer

The LLM never queries raw operational tables directly by default.

Instead, the app exposes a smaller semantic layer of allowlisted views:

- `v_o2c_flow_item`
  - sales-order-item grain
  - used for flow completeness analysis
- `v_billing_trace`
  - billing-item grain
  - used for billing trace and top-product billing analysis
- `v_entity_lookup`
  - graph node search layer
- `v_customer_growth`
  - customer/date level growth analysis
- `v_customer_status`
  - customer block status analysis

This design reduces hallucinated joins and makes the query surface safer and easier to audit.

## Query Translation Pipeline

The natural-language query logic is a guarded hybrid pipeline.

### Pipeline steps

1. Validate request shape at `POST /api/query`
2. Load the normalized dataset
3. Classify whether the prompt is in-domain
4. Try deterministic query templates first
5. If a template matches:
   - produce known SQL over allowlisted semantic views
   - or execute equivalent logic in memory when DB is absent
6. If no template matches and both Postgres + Gemini are configured:
   - ask Gemini to generate SQL over allowlisted views only
7. Parse and validate generated SQL with AST guardrails
8. Execute read-only SQL with a short statement timeout
9. Build the final answer only from the returned rows
10. Return:
   - answer
   - SQL
   - rows preview
   - related node IDs
   - diagnostics

### Deterministic query templates currently implemented

- Top products by billing-document count
- Trace the full flow of a billing document
- Incomplete or broken sales orders
- Customer growth over time
- Percentage of customers currently blocked

### Why this approach

This design is stronger than unrestricted NL-to-SQL over raw tables because it combines:

- deterministic templates for high-value assignment queries
- semantic views for safety and simplicity
- AST validation for query guardrails
- grounded answer generation from returned rows only

## Guardrails

The guardrails are implemented in `src/lib/query/guardrails.ts`.

### Enforced restrictions

- only read-only `SELECT` / CTE-backed `SELECT`
- exactly one statement
- no `INSERT`, `UPDATE`, `DELETE`, `DROP`, `ALTER`, `TRUNCATE`, `CREATE`, `GRANT`, `REVOKE`, `COMMENT`
- no wildcard `*`
- only allowlisted views
- only allowlisted columns
- `LIMIT` is mandatory

### Domain refusal behavior

If the user asks something unrelated, the system refuses with:

`This system is designed to answer questions related to the provided dataset only.`

Examples of refused prompts:

- general knowledge
- creative writing
- unrelated entertainment or sports prompts

## LLM Strategy

### What the LLM is used for

- Domain classification fallback when heuristics are insufficient
- SQL planning for open-ended in-domain questions
- Grounded answer synthesis from returned result rows

### What the LLM is not used for

- It is not used to seed the database
- It is not used to invent answers without data
- It is not allowed to generate arbitrary unrestricted SQL
- It does not query raw tables freely

### Models used

- `gemini-2.5-flash`
  - SQL planning
- `gemini-2.5-flash-lite`
  - lightweight classification
  - grounded response synthesis

## Data Seeding Strategy

Data seeding is deterministic and does not depend on the LLM.

### Seed flow

1. Read JSONL files from `sap-o2c-data/`
2. Normalize the raw records
3. Build normalized entity collections
4. Build graph nodes and graph edges
5. Insert normalized tables into Postgres
6. Insert graph projection tables
7. Create or replace analytical views

### Why this seeding strategy is good

- reproducible
- deterministic
- no LLM cost
- safe for fixed assignment datasets
- same source of truth feeds both graph and query layers

### Main seed files

- `scripts/ingest-sap-jsonl.ts`
- `src/db/seed.ts`
- `src/lib/o2c/dataset.ts`

## API Endpoints

### `GET /api/graph/search`

Search graph nodes by label, ID, subtitle, and metadata-derived text.

### `GET /api/graph/neighborhood`

Fetch a focused neighborhood for a given node ID.

### `POST /api/query`

Accepts:

```json
{
  "message": "Trace the full flow of billing document 90504248.",
  "focusNodeIds": ["billing_document:90504248"]
}
```

Returns:

```json
{
  "answer": "Billing document 90504248 traces back to sales order 740552...",
  "sql": "select ...",
  "rowsPreview": [{ "...": "..." }],
  "relatedNodeIds": ["billing_document:90504248"],
  "diagnostics": {
    "mode": "template"
  }
}
```

## UI Features

### Graph Explorer

- Cytoscape-based graph canvas
- search box for entity lookup
- expandable/focused node neighborhoods
- metadata inspector for selected nodes
- `Reset view` button to recenter the graph viewport

### Conversational Query Panel

- natural-language prompt entry
- sample question chips
- grounded answer rendering
- generated SQL trace
- returned rows preview table
- graph highlighting for entities mentioned in query results

## Local Development

### Prerequisites

- Node.js
- npm
- Docker Desktop or a local Postgres instance

### Install

```bash
npm install
```

### Environment

Copy `.env.example` to `.env.local` and set values as needed:

```env
DATABASE_URL=postgres://postgres:postgres@localhost:5432/o2c_context_graph
GOOGLE_GENERATIVE_AI_API_KEY=
APP_DATASET_ROOT=./sap-o2c-data
```

### Run with Dockerized Postgres

```bash
docker compose up -d
npm run db:init
npm run dev
```

### Included Docker services

- `postgres`
  - Postgres 16 on `localhost:5432`
- `adminer`
  - optional database UI at [http://localhost:8080](http://localhost:8080)

Adminer defaults:

- Server: `postgres`
- Username: `postgres`
- Password: `postgres`
- Database: `o2c_context_graph`

### Run without Postgres

```bash
npm run dev
```

In that mode:

- graph exploration still works
- deterministic queries still work
- open-ended LLM SQL planning does not run

## Database Commands

```bash
npm run db:push
npm run ingest
```

Or in one step:

```bash
npm run db:init
```

## Production Notes

Recommended deployment shape:

- Frontend/API:
  - Vercel Hobby
- Database:
  - Supabase Free Postgres
- LLM:
  - Gemini 2.5 Flash family

### Production behavior

- build with `next build`
- run with `next start`
- use a real `DATABASE_URL`
- optionally use a real `GOOGLE_GENERATIVE_AI_API_KEY` for open-ended NL-to-SQL fallback

## Example Dataset-Backed Queries

### 1. Highest billed products

Prompt:

`Which products are associated with the highest number of billing documents?`

Known expected leaders:

- `S8907367008620`
- `S8907367039280`

Both have `22` distinct billing documents in the dataset.

### 2. Billing-document trace

Prompt:

`Trace the full flow of billing document 90504248.`

Known fixture:

- Sales Order: `740552`
- Delivery: `80738072`
- Billing: `90504248`
- Accounting Document: `9400000249`

### 3. Incomplete sales orders

Prompt:

`Identify sales orders that have broken or incomplete flows.`

Known fixture examples:

- `740506`
- `740507`
- `740508`

### 4. Customer block percentage

Prompt:

`What percentage of customers are currently blocked?`

Known expected answer:

- `75.00%`
- `6 of 8` customers blocked

## Repository Structure

```text
src/
  app/
    api/
  components/
  db/
  lib/
scripts/
sap-o2c-data/
e2e/
```

High-signal files:

- `src/lib/o2c/dataset.ts`
- `src/db/schema.ts`
- `src/db/views.ts`
- `src/db/seed.ts`
- `src/lib/query/service.ts`
- `src/lib/query/templates.ts`
- `src/lib/query/guardrails.ts`
- `src/lib/graph/service.ts`
- `src/components/O2CWorkspace.tsx`
- `src/components/GraphCanvas.tsx`

## Quality Checks

```bash
npm run typecheck
npm run lint
npm run test
npm run test:e2e
npm run build
```

## Tests Included

### Unit and service tests

- dataset normalization fixtures
- graph search and neighborhood lookup
- query templates and guardrails
- UI sample-query flow

### End-to-end tests

- main app loads
- graph search renders a large neighborhood
- reset-view interaction works

## Final Notes

This repository is designed to be evaluator-friendly:

- the graph is inspectable
- the query layer is auditable
- the answers are grounded
- the SQL is exposed
- the guardrails are explicit

This README is intended to be the single source of truth for the repository, the production shape of the app, and the main demo talking points.
