# Trademark Ledger & Case Management System

A production-ready web application for an IP Law Firm to manage trademark cases and financial ledgers.

## Run & Operate

- `pnpm --filter @workspace/tm-app run dev` — run the React frontend (port auto-assigned)
- `pnpm --filter @workspace/api-server run dev` — run the API server (port 8080)
- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from the OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- Required env: `DATABASE_URL` — Postgres connection string

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- Frontend: React + Vite, Wouter routing, TanStack Query, shadcn/ui, Tailwind CSS, Framer Motion
- API: Express 5
- DB: PostgreSQL + Drizzle ORM
- Validation: Zod (`zod/v4`), `drizzle-zod`
- API codegen: Orval (from OpenAPI spec)
- Excel: xlsx (SheetJS) for import/export
- Build: esbuild (CJS bundle)

## Where things live

- `lib/api-spec/openapi.yaml` — single source of truth for API contracts
- `lib/db/src/schema/` — database schema (clients, trademark-cases, case-stages, stage-assignments, ledger-entries, audit-logs)
- `artifacts/api-server/src/routes/` — backend route handlers (clients, cases, stages, assignments, ledger, reports, import-export, search, audit, dashboard)
- `artifacts/tm-app/src/` — React frontend
- `lib/api-client-react/src/generated/` — generated React Query hooks (do not edit)
- `lib/api-zod/src/generated/` — generated Zod schemas for server validation (do not edit)

## Core Modules

- **Clients** — CRUD with search, consolidated ledger view
- **Trademark Cases** — Folder Number (primary ID), TM Number, Applicant, Class, Stage (1–4), Sub-stage, Notes
- **Stages** — 4 stages per case with status, sub-status, timeline events, and change history
- **Stage 2 Assignments** — Multi-person assignment with accepted date tracking
- **Ledger** — Per-case ledger with running balance; consolidated client ledger
- **Reports** — Client Ledger, Case Ledger, Outstanding, Daily Collection, Monthly Collection, Stage Report with PDF (print) and Excel export
- **Import/Export** — Bulk Excel import (client-side SheetJS parsing), Excel export
- **Search** — Global search across clients and cases
- **Audit Log** — Every CREATE/UPDATE/DELETE operation recorded

## Architecture decisions

- Folder Number is the primary string identifier for cases (not a DB integer)
- When a case is created, 4 `case_stages` rows are auto-created (stages 1–4)
- Stage 2 completion is tracked via assignment `status === "Accepted"`
- Ledger running balance is computed as cumulative received − due
- Audit log stores changes as JSON string (not JSONB) to avoid Zod looseObject incompatibility
- Date columns use `mode: "string"` (PgDateString) to preserve YYYY-MM-DD without timezone shift

## User preferences

_Populate as you build — explicit user instructions worth remembering across sessions._

## Gotchas

- Never use `console.log` in server code — use `req.log` in handlers, `logger` elsewhere
- After any OpenAPI spec change, run `pnpm --filter @workspace/api-spec run codegen`
- `format: date` fields in OpenAPI generate `Date` objects in Zod; convert with `.toISOString().split('T')[0]` before passing to PgDateString Drizzle columns
- Avoid bare `type: object` in OpenAPI schemas — Orval generates `zod.looseObject()` which doesn't exist in zod v3; use typed properties or `type: string` instead
- Params collision: endpoints with both path AND query params can cause Orval to emit the same Params type in both `api.ts` and `types/`, causing TS2308. Fix by removing query params from those endpoints or renaming the operation.
