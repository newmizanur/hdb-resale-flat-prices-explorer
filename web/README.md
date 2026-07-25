# HDB Resale Flat Prices Explorer — Web

Vue 3 + PrimeVue (Sakai layout) frontend: a filterable/sortable/paginated transactions table and an insights view with three charts, calling the API over HTTP. See the [root README](../README.md) for the full project (API + infra) and [ARCHITECTURE.md](../ARCHITECTURE.md) for design decisions — including [§3.11/§3.12](../ARCHITECTURE.md) for why this frontend is on plain JS (not TS) and has no Pinia store.

## Setup

```bash
npm install
cp .env.example .env   # VITE_API_URL, if the API isn't at the default localhost:3000
```

## Running

```bash
npm run dev       # http://localhost:5173, requires the API running (see ../api/README.md)
npm run build     # outputs to dist/
npm run preview   # serve the production build locally
```

## Tests

```bash
npm test   # Vitest + Vue Test Utils, mounts real PrimeVue components under jsdom
```

Covers `TransactionFilters.vue` and `TransactionsTable.vue` (6 tests). No tests yet for the views (`TransactionsView.vue`, `InsightsView.vue`) or `services/api.ts`.

## Project structure

```
src/
├── components/{TransactionFilters,TransactionsTable}.vue (+ __tests__/)
├── views/{TransactionsView,InsightsView}.vue, pages/NotFound.vue
├── services/api.ts       # typed Axios client — the only place that knows API routes/params
├── layout/                # Sakai shell: AppLayout, AppTopbar, AppSidebar, AppMenu, ...
├── router/index.js
└── main.js
```
