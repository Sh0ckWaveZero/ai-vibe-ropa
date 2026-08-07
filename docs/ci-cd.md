# CI/CD pipeline

Every push and pull request against `main` runs through
[`.github/workflows/ci.yml`](../.github/workflows/ci.yml) and
[`.github/workflows/claude-review.yml`](../.github/workflows/claude-review.yml).
The pipeline is ordered **cheapest and fastest checks first** so a broken
build or a leaked secret fails in seconds, not after a 5-minute Docker build.

```
Wave 1 (parallel, seconds)        Wave 2 (parallel, ~1 min)         Wave 3 (last, ~2-3 min)
┌────────────────────┐            ┌───────────────────────┐        ┌───────────────────────────┐
│ secret-scan         │            │ dependency-scan       │        │ docker-scan               │
│  (gitleaks)         │            │  (npm audit ×2)       │  ──►   │  build both images,       │
├────────────────────┤   ──►      ├───────────────────────┤        │  Trivy-scan for            │
│ backend-build       │            │ sast-codeql           │        │  CRITICAL/HIGH CVEs       │
│ frontend-build      │            │  (CodeQL JS/TS)       │        └───────────────────────────┘
└────────────────────┘            └───────────────────────┘

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
| `backend-build` / `frontend-build` | `tsc` / `svelte-check` + `vite build` | Type errors, broken builds | Yes |
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
   jobs above (`secret-scan`, `backend-build`, `frontend-build`,
   `dependency-scan`, `sast-codeql`, `docker-scan`)

This has to be done once in the repo settings — GitHub doesn't let a
committed file turn on branch protection by itself.

## Running the same checks locally before pushing

```bash
# Type-check
(cd backend && npm run build)
(cd frontend && npm run check && npm run build)

# Dependency scan
(cd backend && npm audit --audit-level=high)
(cd frontend && npm audit --audit-level=high)

# Secret scan (no local install needed)
docker run --rm -v "$PWD:/repo" zricethezav/gitleaks:latest detect --source=/repo --no-banner -v

# Container scan (after building the images)
docker build -t ropa-backend:local ./backend
docker build -t ropa-frontend:local ./frontend
docker run --rm -v /var/run/docker.sock:/var/run/docker.sock aquasec/trivy:latest \
  image --severity CRITICAL,HIGH ropa-backend:local
```
