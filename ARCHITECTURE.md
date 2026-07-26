# Architecture & Design Decisions

## 1. Overview

This application retrieves HDB resale flat transaction data from data.gov.sg, stores it in PostgreSQL, and exposes it through a NestJS REST API consumed by a Vue/PrimeVue frontend. It is read-only (no create/update/delete) by design — the assessment requires presenting and exploring existing public data, not managing user-generated records.

## 2. High-Level Architecture

![High-level architecture: ALB path-based routing to ECS NestJS API and ECS Nginx+Vue, API backed by RDS Postgres](https://raw.githubusercontent.com/newmizanur/hdb-resale-flat-prices-explorer/master/images/high_level_arch.png)

- **Frontend (Vue + PrimeVue)**: pure presentation layer. Calls the API directly over HTTP; owns no data logic.
- **Backend (NestJS)**: owns all data access, filtering, sorting, pagination, and aggregation logic.
- **Database (PostgreSQL)**: stores ingested transaction data with indexes tuned for the API's common query patterns.
- **Ingestion**: a one-shot script (`npm run ingest`) pages through the data.gov.sg datastore API and bulk-inserts records, using an idempotent `ON CONFLICT DO NOTHING` upsert.

### Backend Module Structure (`/api/src`)

Domain-first, matching standard NestJS `nest g resource` conventions — each feature module owns its own dto/entities/service/controller; only genuinely cross-cutting code lives in `common/`:

![api/src directory structure: transactions/, ingestion/, common/ (filters, middleware, utils), app.module.ts, main.ts, run-ingestion.ts](https://raw.githubusercontent.com/newmizanur/hdb-resale-flat-prices-explorer/master/images/api_structure.png)

`main.ts` and `run-ingestion.ts` are siblings at `src/` root, not nested in a feature folder — both are application entry points (two ways to boot the app: HTTP server vs. one-off script), not domain logic. `ingestion` depends on `transactions`' entity via the normal cross-module `TypeOrmModule.forFeature()` path (see §3.9); it does not import `transactions`' controller or DTO.

## 3. Design Decisions & Trade-offs

### 3.1 Backend: NestJS over Go

The JD lists Node.js explicitly as a backend option (alongside C#/Java) and describes a legacy-modernization context (IIS/Apache, SQL databases, compliance-heavy enterprise environment) rather than a high-throughput/low-latency domain where Go's strengths would be decisive. NestJS/TypeScript was chosen to match the team's stated stack. Go remains a strength for high-QPS/concurrency-heavy systems, which isn't the shape of this assessment.

### 3.2 Frontend: Vue (PrimeVue/Sakai) over React

No frontend framework preference was stated in the JD ("React, Vue, jQuery, CSS or similar"). The task is fundamentally a data-exploration/dashboard UI — tables, filters, charts — which PrimeVue's component set (DataTable with built-in sort/filter/pagination, Chart wrapper) directly supports out of the box, reducing custom-build time within the assessment window.

### 3.3 Pure Vue (Vite) over Nuxt

Nuxt's primary value (SSR/SSG) targets SEO and public content performance, which is irrelevant for an internal data-exploration tool. Nuxt's server layer (Nitro) would also blur the frontend/backend separation intentionally established for this project. Plain Vue (Vite) keeps the architecture as a clean two-box system: presentation and API, calling over HTTP.

### 3.4 Separate applications, single repository (monorepo)

Two independently deployable applications (`/api`, `/web`) in one Git repo. This satisfies the JD's emphasis on RESTful API design and microservices architecture, allows independent testing per application, and maps cleanly to separate Terraform modules/deploy units, while keeping submission and review straightforward as a single repository.

### 3.5 PostgreSQL-backed ingestion over in-memory or live-proxy data access

Three data-serving strategies were considered:
1. Load CSV/API data into Postgres, query via TypeORM (**chosen**)
2. Hold data in memory, filter in application code
3. Proxy each request live to the data.gov.sg datastore API

Option 1 was chosen because the JD explicitly lists SQL database experience as a requirement, it demonstrates real query/aggregation design (`GROUP BY`, indexed filtering), and it avoids the latency and rate-limit exposure of live-proxying on every request.

### 3.6 Read-only API (no CRUD)

The assessment requires retrieving, presenting, and exploring existing public data — not managing user-created records. Building unnecessary CRUD would add complexity without addressing any graded requirement, at the cost of time better spent on filtering, insights, IaC, and testing.

### 3.7 One-shot ingestion vs. scheduled incremental sync

The source dataset is append-only in practice (each row is a completed transaction; the dataset grows by new months being added, with rare retroactive corrections). For this assessment, a one-shot ingestion script seeds the database. In Docker Compose it runs as its own `ingest` service — same image as `api`, `command` overridden to `node dist/run-ingestion.js` (see `docker-compose.yml`) — started concurrently with `api` rather than as a step before it: both only `depends_on: postgres`, not on each other, so `docker compose up` alone is enough for a reviewer, and the API is queryable immediately instead of blocking for the several minutes ingestion takes. `IngestionService.run()` checks the row count first and returns immediately if data already exists, so `ingest` is a one-time cost — a no-op on every restart after the first, not a re-fetch of all ~236K rows. `npm run ingest` remains available to run the same script standalone (outside Docker, or to force a re-run against a database seeded some other way).

**In production**, this would evolve into a scheduled job (e.g. EventBridge Scheduler → ECS Scheduled Task) that re-checks the last 1–2 months of data (to catch late registrations and corrections) and upserts on a composite natural key, since the source has no unique transaction ID. This is documented rather than implemented, to stay within the assessment's time constraints.

### 3.8 Frontend hosting: ECS (Nginx) over S3 + CloudFront

The Vue build output is static and would, in an idealized production setup, be best served via S3 + CloudFront — cheaper (no compute cost for static assets), more scalable, and the idiomatic AWS-native pattern for an SPA.

For this assessment, both applications are deployed via ECS Fargate instead, for two reasons:
- **Consistency**: one deployment pattern (containerized, one reusable Terraform module) for both services, rather than maintaining two different infra paradigms.
- **Local/prod parity**: `docker-compose up` runs both apps identically to how they run in ECS. S3 + CloudFront has no equivalent local development story, and the assessment requires the app to run successfully in a local environment.

This is a conscious trade-off: ECS-for-both optimizes for deployment consistency and time within the assessment window, at the cost of paying for compute to serve what is, at runtime, static content. In a real production deployment, the frontend would move to S3 + CloudFront.

### 3.9 Single NestJS monolith, not distributed microservices

The JD references "microservices architecture" under general architecture literacy, not as a mandate for a distributed system. This application has exactly one bounded context (resale flat transactions), so splitting it into separate deployable services would add inter-service communication, duplicated infrastructure, and testing overhead with no functional benefit — over-engineering for the scope of this assessment.

The microservices-relevant pattern that *is* applied here is the frontend/backend split: two independently deployable services (Vue frontend, NestJS API), each with its own container and ECS service, communicating over a clean REST boundary — the same decoupling principle at the granularity the problem actually calls for.

Within the API, the `transactions` and `ingestion` modules are kept deliberately decoupled — `ingestion` depends only on the shared `ResaleFlatTransaction` entity, not on `transactions`' controllers or DTOs. If a second bounded context emerged in the future (e.g. a separate analytics/insights service consuming the same data), this boundary would allow it to be extracted into its own service without a rewrite.

### 3.10 Remaining lease stored as both raw text and parsed months

The source data provides `remaining_lease` as free text (e.g. `"61 years 04 months"`). This is stored both as-is (`remaining_lease_raw`, for display fidelity) and parsed into total months (`remaining_lease_months`, indexed, for filtering/sorting/aggregation) — a small denormalization that avoids parsing on every read.

### 3.11 Frontend base: sakai-vue-minimal (free PrimeVue), plain JS build with no type-check gate

The original `/web` scaffold resolved PrimeVue ^5.0.0 + `@primevue/themes`, which surfaced an "Invalid PrimeUI License" warning at runtime. It was replaced with a base derived from [sakai-vue-minimal](https://github.com/newmizanur/sakai-vue-minimal) (a minimal fork of PrimeTek's free, MIT-licensed `sakai-vue` template), pinned to PrimeVue `^4.5.2` + `@primeuix/themes` (the free theme distribution) — confirmed license-warning-free by scanning the production bundle.

That base ships as plain JavaScript with a bare `vite build` (no `vue-tsc`/tsconfig type-check gate), unlike the TypeScript setup the original scaffold used. `services/api.ts` was kept in TypeScript (Vite transpiles `.ts` files per-file without needing a project tsconfig), but the four feature components were rewritten in plain JS with runtime prop declarations to match the boilerplate's own conventions rather than fighting them. This is a deliberate trade-off — no build-time type-checking of components against `api.ts`'s interfaces — accepted for a small, two-view read-only app; a real production frontend of larger scope would likely restore a `tsconfig.json` + `vue-tsc --noEmit` check (run in CI, not gating the Docker build) rather than living without one indefinitely.

### 3.12 No global state store, a dedicated filter panel over column-header filters, and two top-level views

**No Pinia (or any global store).** The `sakai-vue-minimal` base ships with Pinia, but only to back its demo auth/users/CRUD scaffolding — all removed as irrelevant to a read-only, no-auth app (§3.6, §3.11). This app has exactly two independent views (Transactions, Insights) with no state shared *between* them or persisted across navigation: each view's filters/pagination/chart data live as local component state (`ref`/`reactive`), scoped to that view alone. Reintroducing Pinia would mean an unused dependency and an extra layer of indirection with no actual consumer — the trigger to add it back would be a real cross-view/persisted-state requirement, not before.

**A dedicated filter panel (`TransactionFilters.vue`), not PrimeVue `DataTable`'s built-in column-header filters.** PrimeVue's column filters are designed primarily for client-side filtering of already-loaded data; our filtering must be server-side (the dataset is ~236K rows), which would need the column-filter model rewired to a lazy/server-driven mode for equivalent behavior. More fundamentally, several required filters don't map onto a single column at all: `minPrice`/`maxPrice` is a *range* over one column (`resalePrice`), and `search` spans three columns at once (street name, block, town) — a global-search pattern, not a per-column filter. A single always-visible panel, populated from `GET /api/resale-flats/metadata`, is also more discoverable for a data-*exploration* tool than filter icons hidden inside header cells — better suited to this project's actual purpose than the dense-admin-CRUD-table use case PrimeVue's column filters are built for.

**Two top-level views/menu items (Transactions, Insights).** This maps directly to the two functional requirements in the assessment brief — a filterable/sortable/paginated data table, and three aggregate charts — with no additional pages needed. `AppMenu` accordingly has exactly two entries; the boilerplate's demo Users/Auth pages and their menu entries were removed (§3.11).

## 4. Data Model

```sql
resale_flat_transactions
├── id                      BIGSERIAL PK
├── month                   DATE
├── town                    VARCHAR(50)
├── flat_type               VARCHAR(20)
├── block                   VARCHAR(10)
├── street_name             VARCHAR(100)
├── storey_range            VARCHAR(20)
├── floor_area_sqm          NUMERIC(6,2)
├── flat_model              VARCHAR(50)
├── lease_commence_date     SMALLINT
├── remaining_lease_raw     VARCHAR(30)
├── remaining_lease_months  INTEGER
├── resale_price            NUMERIC(12,2)
└── created_at              TIMESTAMPTZ

UNIQUE (month, town, block, street_name, storey_range, floor_area_sqm, resale_price)
```

Indexes on `town`, `flat_type`, `month`, `resale_price`, `remaining_lease_months`, and a composite `(town, flat_type, resale_price)` index for the most common combined filter/sort pattern.

## 5. Testing Strategy

| Layer | Approach | Tooling |
|---|---|---|
| Backend unit | Query-building logic (filter composition, sort mapping, pagination), pure parsing functions | Jest |
| Backend e2e | HTTP contract (status codes, response shape, validation) against a seeded fixture DB | Jest + Supertest |
| Frontend | Component behavior (table, filters) | Vitest + Vue Test Utils |

**Deliberately out of scope** (stated trade-off, not an oversight):
- Full browser E2E (Playwright/Cypress)
- Ingestion service e2e (would require mocking the external data.gov.sg API)
- Scheduled sync job (documented in §3.7, not implemented)

E2e tests run against a small deterministic fixture dataset (~10–15 rows) seeded into a dedicated test Postgres instance (`docker-compose.test.yml`), rather than the full ~236K-row ingested dataset — this keeps tests fast and deterministic, standard practice for CI.

## 6. Infrastructure as Code

Terraform (`/infra`) provisions:
- VPC, subnets, security groups, one Application Load Balancer
- Path-based routing: `/api/*` → NestJS target group, `/*` → Vue target group
- Two ECS Fargate services, sharing a reusable `ecs-service` module
- RDS PostgreSQL instance

Deployment to AWS is not required for this assessment (per the brief); the app runs fully via Docker Compose locally. Terraform is included to demonstrate the IaC approach and infra design reasoning.

### Terraform Structure (`/infra`)

One resource area per file at the root; the only reusable module is `ecs-service`, instantiated twice (§3.9's "single reusable module" decision):

```
infra/
├── providers.tf              # terraform block, AWS provider (~> 5.0)
├── variables.tf              # region, project_name, CIDRs, db_*, api_image/web_image
├── vpc.tf                    # VPC, IGW, public/private subnets, NAT gateway, route tables
├── security_groups.tf        # alb (0.0.0.0/0:80) -> ecs_service -> rds, each scoped to the prior SG
├── alb.tf                    # ALB, api/web target groups, listener + path-based rule
├── rds.tf                    # DB subnet group, aws_db_instance (private, publicly_accessible=false)
├── ecs.tf                    # ECS cluster, IAM execution role, api_service + web_service module calls
├── outputs.tf                # alb_dns_name, rds_endpoint (sensitive)
├── modules/ecs-service/      # reusable: task definition, service, CloudWatch log group
│   ├── variables.tf
│   ├── main.tf
│   └── outputs.tf
├── terraform.tfvars.example  # template for db_password + optional overrides (never commit the real file)
└── .terraform.lock.hcl       # provider version lock, committed per standard Terraform practice
```

`.terraform/` (the downloaded provider plugin cache, ~650MB) and `*.tfstate*` are gitignored — this project is never `terraform apply`'d, so no state file exists to worry about, but the gitignore stays in place as a guard for anyone who does run `init`/`plan` locally.
