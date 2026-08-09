# Security Policy

## Reporting a vulnerability

Please report suspected security issues privately by emailing
**wanut@kku.ac.th** rather than opening a public issue. Include steps to
reproduce and, if possible, the affected file/endpoint. This is a small
self-hosted project maintained on a best-effort basis — there's no formal
SLA, but security reports get priority attention.

## Supported versions

Only the `main` branch is supported. There are no maintained release
branches; always deploy from the latest commit on `main`.

## Security measures already in place

| Area | Measure |
|---|---|
| Transport | HTTPS is always on (nginx redirects HTTP → HTTPS). Ships with a self-signed certificate generated on first boot — replace `nginx/templates/default.conf.template`'s cert paths with a real certificate (e.g. Let's Encrypt) before exposing this beyond a trusted network. |
| Sessions | Short-lived JWT access token + rotating, single-use opaque refresh tokens (hashed with SHA-256 before storage, so a DB leak alone doesn't yield usable tokens). All auth cookies are `httpOnly`, `sameSite=lax`, and `secure` in production. |
| Two-factor auth | TOTP is mandatory for every account (RFC 6238, `otplib`). Secrets are encrypted at rest with AES-256-GCM (`TOTP_ENCRYPTION_KEY`), never stored or logged in plaintext. Backup codes are single-use and bcrypt-hashed. The pre-2FA session uses its own JWT secret (`PRE_AUTH_TOKEN_SECRET`) so a leaked 5-minute pre-auth token can never be replayed as a full session. |
| Brute-force / abuse protection | A general rate limit (600 req / 15 min) applies to every `/api/*` route; `/auth/login` (20 / 15 min) and the 2FA endpoints (10 / 5 min) are additionally limited more tightly. Login responses don't distinguish "wrong password" from "no such account" (constant dummy-hash comparison). |
| CSRF | Double-submit-cookie defense (`X-CSRF-Token` header must match the `ropa_csrf` cookie) required on every mutating (`POST`/`PUT`/`PATCH`/`DELETE`) `/api/*` request, on top of `sameSite=lax` cookies. The token rotates on login/2FA-completion/refresh. |
| Authorization | A DB-backed permission matrix (module × action × own/all scope) checked on every request via `requireAuth` + `requireAnyPermission`. Department-scoped access (`ropa.read_own` vs `..._all`) is enforced in the service layer against the resource's actual department, not just the caller's role. |
| Passwords | Hashed with bcrypt (cost factor 12). Never logged, never returned in API responses. |
| Input validation | Every API route validates its input with `zod` before touching the database. |
| Injection | All database access goes through Prisma's parameterized query builder — no raw/interpolated SQL anywhere in the codebase. |
| Secrets | Required via environment variables with no usable defaults (`docker-compose.yml` uses `${VAR:?...}` to refuse starting if a real secret isn't set). `.env` files are gitignored; see `.env.example` for what to generate (`openssl rand -hex 32`, etc.). |
| Audit trail | Every sensitive action (login, 2FA setup/verify, record approval, permission changes, user/role edits, admin 2FA resets, ROPA/user field edits with a before/after diff, attachment upload/delete, ...) is written to `audit_logs` with the acting user, IP, and metadata. Filterable by entity type, action, and date range on the Audit Log page. |
| File uploads | ROPA attachments are extension-allowlisted (office docs, PDF, CSV/TXT, PNG/JPEG) and size-capped (`MAX_UPLOAD_SIZE_MB`, default 10). The filename used on disk is always a server-generated UUID, never derived from the client-supplied name — the original name is only ever used for display/download headers, never to build a filesystem path. Downloads are always served as `application/octet-stream` with `X-Content-Type-Options: nosniff` and `Content-Disposition: attachment`, so a browser never renders an uploaded file inline regardless of its actual content. Access follows the same department-scoped, status-locked authorization as editing the parent ROPA record. |
| Notifications | Scoped strictly per-user — `markRead`/`markAllRead` filter by the authenticated user's ID in the database query itself, so one user can never mark (or, by extension, infer the existence of) another user's notification by guessing an ID. |
| Backups | Nightly `pg_dump` with daily/weekly/monthly rotation (the `backup` service, `docker-compose.yml`); restore procedures must be tested regularly. |
| Automated scanning | Every push/PR runs secret scanning, dependency (SCA) scanning, static analysis (CodeQL), a Claude-driven code review, and a container image scan — see [`CI-CD.md`](CI-CD.md). |

## Known limitations to address before a public/production deployment

- **Self-signed TLS certificate.** Fine for local/internal use; browsers will
  warn on first visit. Swap in a real certificate for anything public-facing.
- **Bootstrap admin credentials** (`ADMIN_EMAIL` / `ADMIN_PASSWORD`) are
  whatever you set in `.env` — change the password immediately after first
  login (2FA setup is enforced on that first login regardless).
- **Rate limiting is in-memory** (`express-rate-limit`'s default store) —
  fine for a single backend instance; if you ever scale the backend
  horizontally, move to a shared store (e.g. Redis) so limits apply across
  instances.
- **Backups are local-disk only.** The `backup` service writes to
  `./backups` on the same host as everything else — it protects against
  losing the Postgres container/volume, not against losing the whole
  machine. Sync that directory off-box (e.g. `rclone`, a cron `rsync` to
  another host) for real disaster recovery.
- **Uploaded attachments are local-disk only, same caveat as backups.**
  They live in the `uploads` Docker volume, not in `./backups` — a database
  restore does not bring attachment files back. If you need real DR
  coverage for attachments, sync the `uploads` volume off-box the same way.
