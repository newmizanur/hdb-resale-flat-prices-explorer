# HDB Resale Flat Prices Explorer

A full-stack application that ingests, presents, and analyses HDB resale flat transaction data from [data.gov.sg](https://data.gov.sg/datasets/d_8b84c4ee58e3cfc0ece0d773c8ca6abc/view), built as a take-home assessment for MSF.

See [ARCHITECTURE.md](./ARCHITECTURE.md) for design decisions, trade-offs, and diagrams.

## Stack

- **API**: NestJS + TypeScript, TypeORM, PostgreSQL
- **Frontend**: Vue 3 (Vite) + PrimeVue (Sakai template)
- **Infra**: Docker Compose (local), Terraform + AWS ECS Fargate (IaC)
- **Testing**: Jest (unit + e2e, backend), Vitest + Vue Test Utils (frontend)

## Project Structure

```
/api        NestJS backend (REST API, ingestion, entities)
/web        Vue frontend
/infra      Terraform (ECS, RDS, ALB, networking)
/images     Architecture diagrams (referenced from ARCHITECTURE.md)
docker-compose.yml        Local dev: api + web + postgres
docker-compose.test.yml   Throwaway Postgres for e2e tests
```

## Prerequisites

- Docker & Docker Compose
- Node.js 24+ (if running services outside Docker — matches the `node:24-alpine` base image used in both Dockerfiles)

## Getting Started

```bash
# 1. Clone and start all services
docker compose up -d

# 2. Open the app immediately — the api serves right away (empty/partial
#    results at first); a separate `ingest` container fills in all ~236K
#    rows from data.gov.sg concurrently over the next few minutes
# Frontend: http://localhost:5173
# API:      http://localhost:3000/api/resale-flats
```

A dedicated `ingest` service (same image as `api`, different command — see `docker-compose.yml`) runs the one-shot ingestion. It starts at the same time as `api` (both only depend on `postgres`, not on each other), so the API is queryable immediately rather than the reviewer waiting minutes for the first byte. It's idempotent — it checks the row count first and exits instantly if the table is already seeded, so it's a no-op on every restart after the first. To force a re-run manually — e.g. against a database seeded some other way — `docker compose run --rm ingest` or `cd api && npm run ingest` still works standalone.

## Running Tests

```bash
# Backend unit tests (no DB needed)
cd api && npm test
cd api && npm run test:cov   # same, with a coverage report (Jest --coverage)

# Backend e2e tests — spin up the throwaway test DB, then run against it
docker compose -f docker-compose.test.yml up -d
cd api && DB_HOST=localhost DB_PORT=5433 DB_USER=postgres DB_PASSWORD=postgres \
  DB_NAME=hdb_resale_test DB_SYNCHRONIZE=true npm run test:e2e
docker compose -f docker-compose.test.yml down

# Frontend component tests (no DB needed)
cd web && npm test
cd web && npm run test:cov   # same, with a v8 coverage report
```

E2e tests run against `docker-compose.test.yml`'s throwaway Postgres (port `5433`, separate from the main dev Postgres on `5432`), not the full `docker-compose.yml` stack — that keeps every test run isolated from your real dev data and avoids rebuilding/running the `web` image, which the backend e2e suite never touches. The e2e suite also refuses to run (and clears no data) against any database whose name doesn't contain `test`, as a safety guard against accidentally pointing it at a real dev/prod database.

## API Overview

| Endpoint | Description |
|---|---|
| `GET /api/resale-flats` | Filter, sort, search, paginate transactions |
| `GET /api/resale-flats/metadata` | Filter inputs: distinct values for dropdowns (towns, flat types, storey ranges) plus min/max bounds (`priceRange`, `leaseMonthsRange`) for the price-range and min-remaining-lease filter controls |
| `GET /api/resale-flats/insights/avg-price-by-town` | Average resale price grouped by town |
| `GET /api/resale-flats/insights/price-trend` | Average price over time (optional `town`, `flatType` filters) |
| `GET /api/resale-flats/insights/price-vs-lease` | Average price bucketed by remaining lease (5-year bands) |

Query params for `GET /api/resale-flats`: `town`, `flatType`, `storeyRange`, `minPrice`, `maxPrice`, `minLeaseMonths`, `search`, `sort` (e.g. `resalePrice:desc`), `page`, `limit`.

## Frontend Overview

Two top-level views, reachable from the left-side menu (`AppMenu`):

| View | Description |
|---|---|
| **Transactions** (`/`) | Filterable/sortable/paginated table of resale transactions, with a dedicated filter panel (town, flat type, storey range, price range, min remaining lease, free-text search) |
| **Insights** (`/insights`) | Three aggregate charts: average price by town, price trend over time (filterable by town/flat type), and average price vs. remaining lease |

No other pages or menu entries exist — see [ARCHITECTURE.md §3.12](./ARCHITECTURE.md) for why (maps directly to the two functional requirements in the assessment brief, no global state store needed since the views share no state).

## Data Source

[Resale flat prices based on registration date from Jan-2017 onwards](https://data.gov.sg/datasets/d_8b84c4ee58e3cfc0ece0d773c8ca6abc/view) — HDB, ~236K rows, updated regularly. Ingested via the [data.gov.sg datastore API](https://guide.data.gov.sg/developer-guide/api-overview) into PostgreSQL on startup (see `api/src/ingestion`).

## Infrastructure (IaC)

Terraform in `/infra` provisions:
- VPC, subnets, security groups
- One ALB with path-based routing (`/api/*` → NestJS, `/*` → Vue)
- Two ECS Fargate services (API, frontend)
- RDS PostgreSQL instance

Deployment to AWS is not required for this assessment; the app runs fully locally via Docker Compose. Terraform is provided to demonstrate the IaC approach — see ARCHITECTURE.md for the reasoning behind specific infra choices.

## Known Trade-offs (summary — full detail in ARCHITECTURE.md)

- Frontend served via ECS (Nginx) rather than S3 + CloudFront, for deployment/local-dev consistency within the assessment timeframe.
- One-shot data ingestion rather than a scheduled incremental sync job.
- E2e tests run against a small deterministic fixture dataset rather than the full ingested dataset.
