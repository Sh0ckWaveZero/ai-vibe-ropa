# Credits

## Idea

**Mahutthawat Raksakiettisak** and **Tunya Toon** (Srinakharinwirot University
/ มศว) sparked the original idea for this project.

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
