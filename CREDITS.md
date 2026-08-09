# Credits

## Idea

**Mahutthawat Raksakiettisak** and **Tunya Toon** (Srinakharinwirot University
/ มศว) sparked the original idea for this project.

## Contributors

**[Sh0ckWaveZero](https://github.com/Sh0ckWaveZero)** contributed a large,
well-tested round of upgrades and hardening across the whole stack, split
into scoped, independently-reviewed pull requests:

- Migrated PostgreSQL 16 → 18 and modernized both container images
  (non-root runtime via `su-exec`, `npm`/`npx` stripped from production
  images, required secrets instead of insecure defaults, health checks on
  every service, Apple Container support).
- Migrated Prisma ORM 6 → 7 (driver adapter, new config file, generated
  client relocation) and upgraded Express 4→5, Zod 3→4, bcryptjs 2→3,
  Helmet 7→8, and otplib 12→13.
- Converted the repo into an npm/Turborepo workspace with a single
  consolidated lockfile and task orchestration.
- Upgraded the GitHub Actions workflows to the Node.js 24 runtime and
  pinned the Trivy scanner version.
- Rewrote `README.md` into a more compact, example-driven structure.
- Added an accessible, localized UI pass: a keyboard-navigable language
  selector, ARIA-correct dialogs/menus with proper focus management,
  self-hosted Thai/Chinese web fonts, and masked/copyable/downloadable
  2FA secret and backup-code displays.
- Added a reusable, animated auto-submit OTP input and fixed a CSRF-token
  staleness bug on immediate re-login after logout.

## Reference code

The mandatory TOTP two-factor authentication flow (pre-auth cookie/stage
machine, encrypted TOTP secrets, single-use backup codes, admin reset) was
ported and adapted from
[`nuttkku/2FA-example-coding`](https://github.com/nuttkku/2FA-example-coding),
which used Express + raw SQL and a Svelte 4 SPA. This project translated
that design onto Prisma/PostgreSQL and SvelteKit — see `CLAUDE.md` for the
specifics of what changed in the port.

## Open-source software

This project is built entirely on open-source libraries and tools,
including (not exhaustive — see `backend/package.json` and
`frontend/package.json` for the full list):

**Backend** — [Express](https://expressjs.com/),
[Prisma](https://www.prisma.io/), [otplib](https://github.com/yeojz/otplib)
(TOTP), [qrcode](https://github.com/soldair/node-qrcode),
[bcryptjs](https://github.com/dcodeIO/bcrypt.js),
[jsonwebtoken](https://github.com/auth0/node-jsonwebtoken),
[zod](https://zod.dev/), [express-rate-limit](https://github.com/express-rate-limit/express-rate-limit),
[helmet](https://helmetjs.github.io/), [ExcelJS](https://github.com/exceljs/exceljs),
[PDFKit](https://pdfkit.org/), [multer](https://github.com/expressjs/multer)
(file uploads), [Vitest](https://vitest.dev/) +
[supertest](https://github.com/ladjs/supertest) (integration tests).

**Frontend** — [SvelteKit](https://kit.svelte.dev/),
[Tailwind CSS](https://tailwindcss.com/), [Vite](https://vitejs.dev/).

**Infrastructure & CI/CD** — [PostgreSQL](https://www.postgresql.org/),
[nginx](https://nginx.org/), [Docker](https://www.docker.com/),
[GitHub Actions](https://github.com/features/actions),
[CodeQL](https://codeql.github.com/), [Trivy](https://aquasecurity.github.io/trivy/),
[gitleaks](https://github.com/gitleaks/gitleaks),
[postgres-backup-local](https://github.com/prodrigestivill/docker-postgres-backup-local)
(automated nightly `pg_dump` with rotation),
[Claude Code](https://claude.com/claude-code).
