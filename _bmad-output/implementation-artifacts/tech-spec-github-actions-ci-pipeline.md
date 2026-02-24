---
title: 'GitHub Actions CI Pipeline'
slug: 'github-actions-ci-pipeline'
created: '2026-02-23'
status: 'completed'
stepsCompleted: [1, 2, 3, 4]
tech_stack: [github-actions, pnpm, vitest, typescript, postgres, pgvector]
files_to_modify: [.github/workflows/ci.yml, package.json]
code_patterns: [corepack-pnpm, github-actions-service-containers]
test_patterns: [vitest-with-explicit-imports, co-located-__tests__-dirs]
---

# Tech-Spec: GitHub Actions CI Pipeline

**Created:** 2026-02-23

## Overview

### Problem Statement

No CI exists — tests, type-checking, and database-dependent checks only run locally. Broken code can be merged to `main` without automated validation.

### Solution

Add a GitHub Actions workflow that runs on PRs to `main` and pushes to `main`, executing TypeScript type-checking (`tsc --noEmit`) and tests (`pnpm test`) with a Postgres+pgvector service container available for database-dependent tests.

### Scope

**In Scope:**
- GitHub Actions workflow file (`.github/workflows/ci.yml`)
- pnpm install with dependency caching
- TypeScript type-checking step (`tsc --noEmit`)
- Vitest test step (`pnpm test`)
- Postgres+pgvector service container (matching `docker-compose.yml` config)
- Triggers on PR to `main` and push to `main`
- Add `typecheck` script to `package.json`

**Out of Scope:**
- Deployment/release workflows
- Linting/formatting (no linter configured yet)
- Code coverage reporting
- Mastra `build` step

## Context for Development

### Codebase Patterns

- Package manager: pnpm 10.30.1, declared via `packageManager: "pnpm@10.30.1"` in `package.json`
- `corepack enable` activates the declared pnpm version automatically
- Node.js >= 22.13.0 required by Mastra; local dev uses v24.13.0; CI should use Node 22 (LTS)
- Test command: `pnpm test` runs vitest (currently 7 unit tests, no DB dependency yet)
- Tests use explicit imports (`import { describe, it, expect } from 'vitest'`), no globals
- Co-located `__tests__/` directories next to source files
- No `typecheck` script exists yet — needs adding to `package.json`
- `.github/` is NOT in `.gitignore`

### Files to Reference

| File | Purpose |
| ---- | ------- |
| `package.json` | Scripts, dependencies, `packageManager` field for corepack |
| `tsconfig.json` | TypeScript config — ES2022 target, bundler resolution, strict mode |
| `docker-compose.yml` | Postgres+pgvector config to mirror in CI service container |
| `.gitignore` | Confirmed `.github/` is not ignored |

### Technical Decisions

- **Service containers over Docker Compose in CI** — GitHub Actions native service containers integrate directly, no Docker-in-Docker overhead, health checks built in
- **`pgvector/pgvector:pg17` image** — matches local dev `docker-compose.yml` exactly
- **`pnpm/action-setup` not needed** — `actions/setup-node` v4 supports corepack natively when `packageManager` is declared in `package.json`
- **`actions/setup-node` with pnpm caching** — uses `cache: 'pnpm'` for automatic `pnpm-lock.yaml`-based dependency caching
- **`DATABASE_URL` as env var** — set at job level so both typecheck and test steps can access it
- **Type-check before tests** — fail fast on type errors before running slower test suite
- **Single job** — typecheck + tests are fast enough to run sequentially in one job; no need for matrix or parallel jobs yet
- **`--run` flag on vitest** — ensures vitest exits after running (no watch mode in CI)

## Implementation Plan

### Tasks

- [x] Task 1: Add `typecheck` script to `package.json`
  - File: `package.json`
  - Action: Add `"typecheck": "tsc --noEmit"` to the `scripts` object
  - Notes: Place after `"test"` for logical grouping. This enables both CI and local usage via `pnpm typecheck`.

- [x] Task 2: Create `.github/workflows/` directory
  - File: `.github/workflows/` (new directory)
  - Action: Create the directory structure
  - Notes: Git will track it once the workflow file is added.

- [x] Task 3: Create CI workflow file
  - File: `.github/workflows/ci.yml` (new file)
  - Action: Create the GitHub Actions workflow with the following structure:
    - **name:** `CI`
    - **triggers:** `push` to `main`, `pull_request` to `main`
    - **jobs.ci:** single job running on `ubuntu-latest`
    - **service container:** `pgvector/pgvector:pg17` on port 5432 with env vars `POSTGRES_USER=postgres`, `POSTGRES_PASSWORD=postgres`, `POSTGRES_DB=talkforge`, and health check using `pg_isready` with 5s interval, 5s timeout, 5 retries
    - **env:** `DATABASE_URL=postgresql://postgres:postgres@localhost:5432/talkforge`
    - **steps:**
      1. `actions/checkout@v4`
      2. `actions/setup-node@v4` with `node-version: 22`, `cache: 'pnpm'`
      3. `corepack enable`
      4. `pnpm install --frozen-lockfile`
      5. `pnpm typecheck`
      6. `pnpm test --run`
  - Notes: `--frozen-lockfile` ensures CI fails if lockfile is out of sync. Health check on Postgres ensures DB is ready before tests run. The `corepack enable` step must come before `pnpm install`.

### Acceptance Criteria

- [ ] AC 1: Given a PR is opened against `main`, when the workflow triggers, then the CI job runs type-checking and tests to completion.
- [ ] AC 2: Given a commit is pushed to `main`, when the workflow triggers, then the CI job runs type-checking and tests to completion.
- [ ] AC 3: Given the CI workflow runs, when the Postgres service container starts, then it is accessible at `localhost:5432` with database `talkforge` and the `pgvector` extension available.
- [ ] AC 4: Given a TypeScript type error is introduced, when `pnpm typecheck` runs in CI, then the job fails and reports the type error.
- [ ] AC 5: Given a failing test is introduced, when `pnpm test --run` runs in CI, then the job fails and reports the test failure.
- [ ] AC 6: Given dependencies haven't changed between runs, when CI runs, then `pnpm install` uses the cached dependencies (visible in `actions/setup-node` cache hit log).
- [ ] AC 7: Given the `typecheck` script is added to `package.json`, when a developer runs `pnpm typecheck` locally, then TypeScript compilation check runs without emitting files.

## Additional Context

### Dependencies

- No new npm packages required
- Depends on GitHub Actions runner environment (`ubuntu-latest`)
- Depends on Docker Hub availability for `pgvector/pgvector:pg17` image
- Depends on `actions/checkout@v4` and `actions/setup-node@v4` actions

### Testing Strategy

- **Manual verification:** Push a branch with the workflow, open a PR to `main`, verify the CI job runs and passes.
- **Negative test:** Introduce a deliberate type error or failing test on a branch, confirm CI catches it.
- **Service container test:** Future stories adding DB-dependent tests will validate the Postgres service container is working. For now, the health check confirms connectivity.

### Notes

- The `pgvector/pgvector:pg17` image includes the `vector` extension but it must be explicitly enabled via `CREATE EXTENSION vector` in application code or migrations. Mastra handles this automatically via `PostgresStore` auto-init.
- When future stories add secrets (e.g., `ANTHROPIC_API_KEY` for integration tests), those will need to be added as GitHub repository secrets and passed via `env` in the workflow. Out of scope for this spec.
- The `pnpm` cache key is derived from `pnpm-lock.yaml` hash. Any dependency change will bust the cache, which is the correct behavior.

## Review Notes

- Adversarial review completed
- Findings: 5 total, 5 fixed, 0 skipped
- Resolution approach: auto-fix
- F1 (High): Moved `corepack enable` before `actions/setup-node` so pnpm is available for cache key computation
- F2 (Medium): Pinned `node-version: '22.13'` to satisfy Mastra >= 22.13.0 requirement
- F3 (Medium): Added `ANTHROPIC_API_KEY: test-placeholder` env var for future agent tests
- F4 (Low): Added explicit `cache-dependency-path: pnpm-lock.yaml`
- F5 (Low): Added `timeout-minutes: 10` to the job
