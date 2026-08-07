# ROPA — Record of Processing Activities

A self-hosted system for recording and managing an organization's Record of
Processing Activities (GDPR Art. 30 / Thailand PDPA style), with department
scoping, a draft → submit → approve/reject workflow, role-based access via an
editable permission matrix, and a Thai / English / Chinese UI.

## Stack

- **Frontend**: SvelteKit 5 + Tailwind CSS v4 (gray/gold/yellow theme, dark mode)
- **Backend**: Node.js + Express + TypeScript, Prisma ORM
- **Database**: PostgreSQL
- **Reverse proxy**: nginx (routes `/api/*` to the backend, everything else to the frontend)
- Everything runs via `docker compose`

## Quick start

```bash
cp .env.example .env      # adjust ACCESS_TOKEN_SECRET / admin credentials
docker compose up -d --build
```

Then open **http://localhost:8080** (or whatever `PUBLIC_PORT` you set).

Sign in with the bootstrap admin account (from `.env`, defaults to):

- Email: `admin@ropa.local`
- Password: `ChangeMe123!`

**Change the admin password after first login**, and set a real
`ACCESS_TOKEN_SECRET` before deploying anywhere shared.

On first boot, the backend container automatically applies database
migrations and seeds:

- Default **permissions** and **roles**: Super Admin, DPO / Compliance
  Officer, Department Editor, Viewer / Auditor
- Default **departments**: Head Office, IT, HR (edit/add from the
  Departments page)
- The bootstrap admin user

## Architecture

```
                 ┌────────┐
  browser  ───▶  │ nginx  │  :8080
                 └───┬────┘
              /api/*  │  everything else
                 ┌────▼────┐        ┌──────────┐
                 │ backend │  ───▶  │ postgres │
                 │ :4000   │        │  :5432   │
                 └─────────┘        └──────────┘
                 ┌──────────┐
                 │ frontend │  (SvelteKit SSR, Node)
                 │  :3000   │
                 └──────────┘
```

- The **browser** always talks to a single origin (nginx); it never talks to
  the backend directly, so there's no CORS to configure in production.
- **Server-side rendering** (the auth check in the root layout) calls the
  backend directly over the Docker network (`BACKEND_ORIGIN`), forwarding the
  request's cookies manually — see `frontend/src/lib/server/backend.ts`.
- Everything else (CRUD screens) fetches client-side against relative
  `/api/*` paths — see `frontend/src/lib/api/client.ts`, which also handles
  silent access-token refresh on a 401.

## Permission model

Access control is a **permission matrix**: `permissions` (module + action,
e.g. `ropa.read_own`, `ropa.approve`, `users.manage`) are grouped into
`roles` via `role_permissions`, and each `user` has exactly one role plus an
optional `department`. Department-scoped permissions come in `_own` / `_all`
pairs (e.g. `ropa.read_own` vs `ropa.read_all`) so a role can be limited to
its own department or granted organization-wide visibility.

Admins can create new roles and edit the matrix live from **Roles &
Permissions** — no code changes needed to adjust who can do what. See
`backend/src/constants/permissions.ts` for the full permission list and the
default role assignments.

## ROPA workflow

Each record moves through `DRAFT → SUBMITTED → APPROVED` (or `REJECTED`,
which sends it back to a re-editable state). A department editor
creates/edits drafts and submits them; a user with `ropa.approve` (e.g. the
DPO role) approves or rejects with a reason. Every action is written to the
audit log.

## Local development (without Docker)

```bash
# Postgres only, via compose
docker compose up -d postgres

# Backend
cd backend
cp .env.example .env   # point DATABASE_URL at your postgres
npm install
npx prisma migrate deploy
npm run seed
npm run dev             # http://localhost:4000

# Frontend (separate terminal)
cd frontend
cp .env.example .env
npm install
npm run dev              # http://localhost:5173, proxies /api to :4000
```

## Project layout

```
backend/
  prisma/schema.prisma       Data model (users, roles, permissions, departments, ropa_records, audit_logs)
  src/modules/                One folder per resource: auth, users, roles, departments, ropa, audit
  src/middleware/              requireAuth (JWT) + requireAnyPermission (RBAC)
  src/db/seed/                 Default roles/permissions/departments/admin user
frontend/
  src/routes/(app)/            Authenticated app shell (sidebar/topbar) + pages
  src/routes/login/            Public login page
  src/lib/i18n/                th/en/zh dictionaries + locale context
  src/lib/components/          Shared UI (Button, Card, Dialog, TagInput, ...) and the ROPA form
nginx/nginx.conf              Reverse proxy config used by docker-compose
```
