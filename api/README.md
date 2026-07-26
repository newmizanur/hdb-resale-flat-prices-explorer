# HDB Resale Flat Prices Explorer — API

NestJS + TypeORM + PostgreSQL REST API serving HDB resale flat transaction data. Read-only, no auth. See the [root README](../README.md) for the full project (frontend + infra) and [ARCHITECTURE.md](../ARCHITECTURE.md) for design decisions.

## Setup

```bash
npm install
cp .env.example .env   # adjust DB_* / DATASTORE_* as needed
```

## Running

```bash
npm run start:dev   # watch mode, http://localhost:3000/api/resale-flats
npm run build        # compiles to dist/
npm run start:prod   # runs the compiled build (node dist/main.js)
```

Requires a running Postgres matching the `DB_*` env vars — see the root `docker-compose.yml`, or run one directly:

```bash
docker run --rm -d --name hdb-postgres -e POSTGRES_PASSWORD=postgres -e POSTGRES_DB=hdb_resale -p 5432:5432 postgres:16-alpine
```

## Seeding data

One-shot ingestion from data.gov.sg (~236K rows). Idempotent and safe to re-run — it checks the row count first and skips entirely if the table is already populated:

```bash
npm run build && npm run ingest
```

Under Docker Compose this runs automatically via a dedicated `ingest` service (same image as `api`, different command — see root `docker-compose.yml`), started concurrently alongside `api` rather than blocking it, so the API is queryable immediately instead of waiting on ingestion to finish. The command above is for running it standalone (e.g. outside Docker, or to force a re-run against a database seeded some other way).

## Endpoints

| Endpoint | Description |
|---|---|
| `GET /api/resale-flats` | Filter, sort, search, paginate transactions |
| `GET /api/resale-flats/metadata` | Filter inputs: distinct values (towns, flat types, storey ranges) + min/max bounds (price, remaining lease) |
| `GET /api/resale-flats/insights/avg-price-by-town` | Average resale price grouped by town |
| `GET /api/resale-flats/insights/price-trend` | Average price over time (optional `town`, `flatType`) |
| `GET /api/resale-flats/insights/price-vs-lease` | Average price bucketed by remaining lease (5-year bands) |

Query params for `GET /api/resale-flats`: `town`, `flatType`, `storeyRange`, `minPrice`, `maxPrice`, `minLeaseMonths`, `search`, `sort` (`field:asc|desc`, e.g. `resalePrice:desc`), `page`, `limit`.

## Tests

```bash
npm test          # unit tests, no DB needed
npm run test:cov  # unit tests with coverage
```

E2e tests need a throwaway Postgres — from the repo root:

```bash
docker compose -f ../docker-compose.test.yml up -d
DB_HOST=localhost DB_PORT=5433 DB_USER=postgres DB_PASSWORD=postgres \
  DB_NAME=hdb_resale_test DB_SYNCHRONIZE=true npm run test:e2e
docker compose -f ../docker-compose.test.yml down
```

(The e2e suite refuses to run against any database whose name doesn't contain `test`, as a guard against accidentally pointing it at real data.)

## Project structure

See [ARCHITECTURE.md](../ARCHITECTURE.md#backend-module-structure-apisrc) for the `src/` layout and module boundaries (`transactions/`, `ingestion/`, `common/`).
