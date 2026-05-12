# Flow-State: Colorado River Flow Forecasting App

## Stack
- **Harper** — database + REST API + static file server (single runtime)
- **React 19 + Vite** — frontend in `app/`, builds to `web/`
- **recharts** — flow charts
- **Node.js test runner** — `node --test test/*.test.js`

## Key conventions
- Import Harper: `import { Resource, tables } from 'harper'`
- All resources go in `resources/*.ts`
- Schemas go in `schemas/*.graphql` using `@table @export @primaryKey @indexed @relationship`
- Composite IDs: use `compositeId()` from `lib/utils.ts`
- Flow status: use `getFlowStatus()` from `lib/utils.ts`
- Seed data arrays live in `lib/seed-data.ts`, loaded by `resources/Seed.ts`
- Data adapters live in `lib/adapters/` (usgs, cdss, snotel, bor, noaa)

## Development
- `npm run dev` — start Harper dev server (port 9926)
- `npm run ui:dev` — start Vite dev server (port 5173, proxies API to 9926)
- `npm run ui:build` — build React app to `web/`
- `npm test` — run tests

## REST API patterns
- Auto-generated: `GET /TableName/`, `GET /TableName/{id}`, `POST /TableName/`, etc.
- Custom resources: `GET /Dashboard`, `GET /RiverDetail/{sectionId}`, `GET /Ingestion`, `POST /Seed`
- Query syntax: `?field=value`, `sort(+field)`, `limit(10)`, `select(field1,field2)`

## Background jobs
- Ingestion worker uses `setInterval` at module load with `globalThis` guard (no duplicate workers on hot-reload)
- Pattern from Business-Agent Scheduler

## Environment variables
- `LLM_PROVIDER`, `LLM_API_KEY`, `LLM_MODEL` — for forecast pipeline (optional, stubbed without them)
- `CLI_TARGET_*` — for Harper Fabric deployment
- Most data source APIs are free/open (USGS, CDSS, SNOTEL, BOR)
