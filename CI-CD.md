# CI/CD pipeline

This file documents the pipeline; **the pipeline itself is code**, not
markdown — it lives in [`.github/workflows/ci.yml`](.github/workflows/ci.yml)
and [`.github/workflows/claude-review.yml`](.github/workflows/claude-review.yml).
GitHub Actions only ever runs workflows from `.github/workflows/`, so that is
the one place this automation *can* live; this file is the explanation
sitting next to it, the same way `SECURITY.md` explains the security posture
those workflows help enforce.

Every push and pull request against `main` runs through both workflows. The
pipeline is ordered **cheapest and fastest checks first** so a broken build
or a leaked secret fails in seconds, not after a 5-minute Docker build.

```
Wave 1 (parallel, seconds)        Wave 2 (parallel, ~1 min)         Wave 3 (last, ~2-3 min)
┌────────────────────┐            ┌───────────────────────┐        ┌───────────────────────────┐
│ secret-scan         │            │ dependency-scan       │        │ docker-scan               │
│  (gitleaks)         │            │  (npm audit ×2)       │  ──►   │  build both images,       │
├────────────────────┤   ──►      ├───────────────────────┤        │  Trivy-scan for            │
│ workspace-build     │            │ sast-codeql           │        │  CRITICAL/HIGH CVEs       │
│  (Turborepo)        │            │  (CodeQL JS/TS)       │        └───────────────────────────┘
└────────────────────┘            │ backend-test          │
                                   │  (vitest + supertest, │
                                   │   real Postgres)      │
                                   └───────────────────────┘

(separate workflow, runs on pull_request only)
┌──────────────────────────────────────────────────────────┐
│ claude-review — Claude reads the diff + CLAUDE.md and     │
│ leaves one PR comment on security/correctness findings   │
└──────────────────────────────────────────────────────────┘
```

## What each stage catches

| Stage | Tool | Catches | Blocks merge? |
|---|---|---|---|
| `secret-scan` | [gitleaks](https://github.com/gitleaks/gitleaks) (official Docker image, no license/action needed) | API keys, private keys, tokens accidentally committed | Yes |
| `workspace-build` | [Turborepo](https://turborepo.dev/) orchestrating `tsc`, `svelte-check`, and `vite build` | Type errors, broken builds | Yes |
| `backend-test` | [Vitest](https://vitest.dev/) + [supertest](https://github.com/ladjs/supertest) against a real Postgres service container | Permission-matrix scoping bugs, ROPA status-machine regressions, 2FA login-stage bypasses, cross-department/cross-record attachment access, notification ownership leaks — see `backend/src/__tests__/` | Yes |
| `dependency-scan` | `npm audit --audit-level=high` | Known-vulnerable npm dependencies (backend and frontend, run separately) | Yes |
| `sast-codeql` | [GitHub CodeQL](https://codeql.github.com/) | Injection, XSS, unsafe deserialization, and other JS/TS security patterns | Yes |
| `docker-scan` | [Trivy](https://aquasecurity.github.io/trivy/) | OS package + dependency CVEs *inside the built images* (base image, apk/npm packages) | Yes (image scans); the filesystem/misconfig scan in the same job is informational only |
| `claude-review` | Claude Code Action | Logic bugs, permission-check bypasses, deviations from `CLAUDE.md` conventions — anything a human reviewer would flag but a pattern-matching scanner can't | No — it's an advisory comment, not a required check |

## Setting up the Claude review workflow

It needs a repo secret:

1. GitHub repo → **Settings → Secrets and variables → Actions**
2. Add `ANTHROPIC_API_KEY` (an Anthropic API key) — or `CLAUDE_CODE_OAUTH_TOKEN`
   if you're using a Claude Code subscription token instead; adjust the
   `with:` block in `claude-review.yml` accordingly.

Without that secret the job simply fails (no PR comment posted) — it doesn't
block anything else, since it isn't wired up as a required status check.

Check [`anthropics/claude-code-action`](https://github.com/anthropics/claude-code-action)
for the current input names before relying on this long-term; GitHub Actions
pinned to `@v1` will pick up non-breaking updates, but it's worth pinning to
a specific release/SHA for supply-chain safety once the workflow is stable.

## Human code review

`.github/CODEOWNERS` requires a review from the maintainer on every path.
That file alone doesn't *enforce* anything — turn on **branch protection**
for `main` to make it a hard gate:

1. Repo → **Settings → Branches → Add branch protection rule** for `main`
2. Enable **Require a pull request before merging** → **Require review from
   Code Owners**
3. Enable **Require status checks to pass before merging** and select the
   jobs above (`secret-scan`, `workspace-build`,
   `backend-test`, `dependency-scan`, `sast-codeql`, `docker-scan`)

This has to be done once in the repo settings — GitHub doesn't let a
committed file turn on branch protection by itself.

## Two equally valid ways to run this pipeline

**Path A — automatic, on every push/PR.** GitHub Actions runs the waves
above with no human involved. This is the safety net for changes nobody
personally reviewed before they landed.

**Path B — on demand, by asking Claude Code to run it.** For a repo where
the maintainer already routes every PR through a Claude Code session
anyway, that session running the checks directly *is* the pipeline for
that change — there's no reason to wait for GitHub Actions or duplicate the
work by hand. Just ask, in plain language: *"run the CI checks on this"* or
*"do a security review before I merge this"*. That single ask covers more
than Path A's automated stages, since Claude can also do the adversarial
review pass (find → independently try to refute → keep only what survives)
that a pattern-matching scanner can't — this is exactly how the 2FA/HTTPS
work and the export feature in this repo were checked before being pushed.

What Claude actually runs when asked (the same underlying commands Path A's
`ci.yml` runs, so the result is consistent either way):

```bash
# Install the complete npm workspace from its single lockfile
npm ci

# Type-check and build through the Turborepo task graph
npm run check
npm run build

# Integration tests (needs a Postgres reachable at backend/.env.test's
# DATABASE_URL — docker compose up -d postgres is enough)
npm run test -- --filter=ropa-backend

# Dependency scan
npm audit --audit-level=high --workspace=ropa-backend
npm audit --audit-level=high --workspace=ropa-frontend

# Secret scan (no local install needed)
docker run --rm -v "$PWD:/repo" zricethezav/gitleaks:latest detect \
  --source=/repo --config=/repo/.gitleaks.toml --no-banner -v

# Container scan (after building the images)
docker build -f backend/Dockerfile -t ropa-backend:local .
docker build -f frontend/Dockerfile -t ropa-frontend:local .
docker run --rm -v /var/run/docker.sock:/var/run/docker.sock aquasec/trivy:latest \
  image --severity CRITICAL,HIGH ropa-backend:local
```

Path A and Path B aren't a choice between one or the other — use both. Path
B before merging (thorough, judgment-based, catches what scanners miss),
Path A as the always-on backstop for anything that ships without a Claude
session in the loop.
