# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

A self-hosted Record of Processing Activities (GDPR Art. 30 / Thai PDPA)
system: `backend/` (Express + TypeScript + Prisma/PostgreSQL) and
`frontend/` (SvelteKit 5 + Tailwind v4), reverse-proxied by nginx in
`docker-compose.yml`. These are two independent npm projects — no shared
workspace/package. See `README.md` for the product-level overview
(architecture diagram, permission model, ROPA workflow, default roles).

## Commands

### Backend (run from `backend/`)

- `npm run dev` — tsx watch, hot reload. Needs a local `.env` (copy from
  `.env.example`) with `DATABASE_URL` pointing at a reachable Postgres.
- `npm run build` — `tsc` compile to `dist/`.
- `npm start` — run the compiled `dist/index.js`.
- `npm run prisma:migrate:dev` — create *and* apply a new migration from
  schema changes (run this locally against a dev Postgres, then commit the
  generated `prisma/migrations/*` folder).
- `npm run prisma:migrate` — `prisma migrate deploy` (applies existing
  migrations only, no generation; this is what runs in Docker).
- `npm run seed` — `src/db/seed/index.ts`; idempotent (upserts), safe to
  re-run.
- No test suite exists yet.

### Frontend (run from `frontend/`)

- `npm run dev` — Vite dev server; proxies `/api/*` to `BACKEND_ORIGIN`
  (`vite.config.ts`, defaults to `http://localhost:4000`).
- `npm run build` — production build via `adapter-node` into `build/`.
- `npm start` — `node build/index.js` (what the Docker image runs).
- `npm run check` — `svelte-kit sync && svelte-check`. This is the
  type-checker; there is no ESLint/Prettier configured in this repo, so
  there is no separate lint command.
- No test suite exists yet.

### Whole stack

```bash
cp .env.example .env            # repo root
docker compose up -d --build    # postgres + backend + frontend + nginx
docker compose logs -f backend  # or frontend / nginx / postgres
docker compose down              # add -v to also wipe the postgres volume
```

The app is served at `http://localhost:8080` (or `$PUBLIC_PORT`).

## Architecture notes that span multiple files

**Backend module layout.** Each resource under `backend/src/modules/<name>/`
is exactly two files: `<name>.routes.ts` (Express router — request
validation via `zod`, permission guards, calls the service, writes an audit
log entry) and `<name>.service.ts` (Prisma queries and business rules). There
is no separate controller layer. Follow this pattern for new resources.

**Permission matrix is DB-backed but seeded from one source of truth.**
`backend/src/constants/permissions.ts` defines `PERMISSIONS` (module +
action + tri-lingual descriptions), `DEFAULT_ROLES` (role → permission codes)
and `DEFAULT_DEPARTMENTS`. The seed script (`src/db/seed/index.ts`) upserts
these into `permissions` / `roles` / `role_permissions` on every container
start. After seeding, roles and their permission assignments are fully
editable at runtime from the Roles & Permissions page — the constants file
only controls what ships by default. Adding a new permission means: add it
to `PERMISSIONS`, assign it to the relevant role(s) in `DEFAULT_ROLES`, and
re-seed (or add it manually via the UI in an existing deployment).

**Auth.** JWT access token (`ropa_at` cookie, short-lived) +  rotating opaque
refresh token (`ropa_rt` cookie, hashed before storing in `refresh_tokens`).
`requireAuth` middleware (`src/middleware/auth.ts`) re-loads the user and
their current permissions from the DB on *every* request (so deactivating a
user or editing a role takes effect immediately, not on token expiry).
`requireAnyPermission(...codes)` (`src/middleware/authorize.ts`) is a
route-level OR check against `req.user.permissions`.

**Department scoping is not middleware.** `ropa.read_own`/`ropa.update_own`
vs `..._all` distinguishes "my department only" from "every department", but
that comparison needs the *resource's* `departmentId`, not just the caller's
permissions — so it's checked inline in `ropa.service.ts`
(`assertDepartmentAccess` / `hasScope`), not in a generic middleware.

**Express route-ordering gotcha.** In `users.routes.ts`, `/me` and
`/me/change-password` are registered *before* the `/:id` routes — otherwise
Express would match `/me` as `:id = "me"`. Keep any new static sub-routes
above param routes on the same router.

**Frontend uses Svelte 5 runes throughout** (`$props()`, `$state()`,
`$bindable()`, `$derived`, snippets via `{#snippet}`/`{@render}`) — not the
Svelte 4 `export let` / slot API.

**i18n is context-based, not a module store — on purpose.** A module-level
`writable` for the current locale would leak across concurrent SSR requests
on the Node server (one request's language could bleed into another's
render). `frontend/src/lib/i18n/index.ts` instead exposes
`createLocaleContext()` (called once, in the root `+layout.svelte`, seeded
from a cookie read server-side) and `getLocaleContext()` (called by any
component that needs `$t(...)`), using Svelte context so each request/mount
gets its own store. The `Dictionary` interface in `dictionary.ts` is the
contract `en`/`th`/`zh` under `locales/` must all satisfy — a missing key in
any language is a TypeScript error, not a silent runtime fallback.
Dark-mode theme (`lib/stores/theme.ts`), by contrast, *is* a plain module
store — safe because it only ever mutates the DOM (`classList` on
`<html>`) client-side and never affects SSR output.

**Two different paths for talking to the backend, by design:**
- Server-side (only the root `+layout.server.ts`, to fetch the current user)
  calls the backend directly over the Docker network at `BACKEND_ORIGIN`
  (`$env/dynamic/private`, so it's read at runtime, not baked in at build
  time) via `lib/server/backend.ts::serverFetch`, which manually copies the
  incoming request's `cookie` header onto the outgoing fetch — SvelteKit's
  `load` fetch does *not* forward cookies automatically to a cross-origin
  absolute URL.
- Everywhere else (all CRUD pages), the browser calls relative `/api/*`
  paths through `lib/api/client.ts::apiFetch`, which nginx proxies to the
  backend, and which transparently retries once via `/api/auth/refresh` on a
  401 before surfacing an error.

This split means the browser never talks to the backend origin directly —
only nginx and the frontend's own Node server do — so there is no CORS
configuration in production.

**Docker entrypoint.** `backend/docker-entrypoint.sh` runs `prisma migrate
deploy` then the seed script then starts the server, on *every* container
start (both steps are idempotent). `prisma` is a regular `dependency` (not a
`devDependency`) specifically so the CLI is present in the production image
for this.

**Migrations.** Only one exists
(`backend/prisma/migrations/20260807033125_init`), generated with `prisma
migrate dev --name init` against a disposable local Postgres. Follow the
same flow for schema changes: run `prisma migrate dev` locally against a
running Postgres, commit the generated migration folder, and `migrate
deploy` (used by the Docker entrypoint) will apply it.

**ROPA status machine.** `DRAFT` and `REJECTED` are the only editable /
deletable / submittable states for a `ropa.update_own`/`ropa.submit` holder.
`SUBMITTED` is locked pending a reviewer (`ropa.approve`) decision.
`APPROVED` is locked except for `ropa.update_all` holders (e.g. to correct a
record after the fact). See `ropa.service.ts` for the exact transitions.
