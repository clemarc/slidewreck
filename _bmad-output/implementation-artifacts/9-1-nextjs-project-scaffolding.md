# Story 9.1: Next.js Project Scaffolding

Status: done

## Story

As a developer,
I want a Next.js application scaffolded alongside the existing Mastra backend,
So that there is a frontend capable of calling the Mastra API.

## Acceptance Criteria

1. **AC-1: Project structure** — Next.js app initialised in `web/` directory as a pnpm workspace member. Uses Next.js 16 App Router, TypeScript strict mode, and Tailwind CSS. `pnpm dev` at root starts both Mastra (`:4111`) and Next.js (`:3000`).
2. **AC-2: Shared types** — Zod schemas from `src/mastra/schemas/` are importable by the frontend via workspace reference or TypeScript path alias. `WorkflowInputSchema` is importable and usable in `web/`.
3. **AC-3: Dev command** — `pnpm dev` at the monorepo root runs both servers concurrently. `pnpm dev --filter web` starts only the frontend.
4. **AC-4: Build and typecheck** — `pnpm typecheck` still passes. `pnpm --filter web build` produces a successful Next.js build. No regressions in existing `pnpm test` or `pnpm build`.

## Tasks / Subtasks

- [x] Task 1: pnpm workspace setup (AC: 1, 3)
  - [x] 1.1 Create `pnpm-workspace.yaml` with `packages: [".", "web"]`
  - [x] 1.2 Update root `package.json` scripts: `"dev": "concurrently \"mastra dev\" \"pnpm --filter web dev\""` (add `concurrently` as root devDependency)
  - [x] 1.3 Verify `pnpm dev --filter web` starts Next.js independently
- [x] Task 2: Next.js 16 app scaffold in `web/` (AC: 1)
  - [x] 2.1 Create `web/package.json` with Next.js 16, React 19, TypeScript, Tailwind CSS 4, `@tailwindcss/postcss`
  - [x] 2.2 Create `web/next.config.ts` with App Router (default in Next.js 16)
  - [x] 2.3 Create `web/tsconfig.json` extending or aligned with root tsconfig, strict mode
  - [x] 2.4 Create `web/postcss.config.mjs` for Tailwind CSS 4
  - [x] 2.5 Create `web/app/globals.css` with Tailwind directives
  - [x] 2.6 Create `web/app/layout.tsx` — root layout with HTML boilerplate, Tailwind loaded
  - [x] 2.7 Create `web/app/page.tsx` — minimal landing page (title + link placeholder)
  - [x] 2.8 Create `web/app/run/[runId]/page.tsx` — placeholder run status page
- [x] Task 3: Shared schema access (AC: 2)
  - [x] 3.1 Add workspace dependency in `web/package.json`: `"bmad-mastra-presentation": "workspace:*"`
  - [x] 3.2 Verify `WorkflowInputSchema` is importable from `web/` code (test in `web/__tests__/schema-import.test.ts`)
  - [x] 3.3 Ensure `zod` version is consistent across root and `web/` (workspace hoisting)
- [x] Task 4: Validate no regressions (AC: 4)
  - [x] 4.1 `pnpm typecheck` — pre-existing errors only (slidewreck.ts materials undefined), no new errors
  - [x] 4.2 `pnpm test` passes — 420 tests (including 3 new schema-import tests)
  - [x] 4.3 `pnpm --filter web build` — successful Next.js production build
  - [x] 4.4 `pnpm build` (Mastra build) — still works

## Dev Notes

### Architecture Decisions (from spike)

- **Next.js 16** with App Router — this is the version decided in the Epic 9 spike (architecture.md, line 351)
- **Tailwind CSS 4** — use the new CSS-first config (`@import "tailwindcss"` in CSS, `@tailwindcss/postcss` plugin). No `tailwind.config.js` needed.
- **shadcn/ui** — noted in architecture but do NOT install in this story. shadcn components come in Story 9.3+ when UI is needed.
- **No authentication** — local-only, single-user (architecture.md)
- **Ports**: Next.js on `:3000`, Mastra on `:4111`

### Workspace Strategy

The architecture says `pnpm-workspace.yaml` with `packages: [".", "web"]`. The root package remains the Mastra backend. The `web/` package is the Next.js frontend.

For sharing schemas, prefer **workspace dependency** (`"bmad-mastra-presentation": "workspace:*"`) over path aliases. This is cleaner for the Next.js build pipeline. If Next.js has trouble resolving, fall back to TypeScript path aliases.

### Root dev script

Current root `dev` script is `mastra dev`. Change to use `concurrently`:
```json
"dev": "concurrently --names mastra,web --prefix-colors blue,green \"mastra dev\" \"pnpm --filter web dev\"",
"dev:mastra": "mastra dev",
"dev:web": "pnpm --filter web dev"
```
Add `concurrently` as root devDependency.

### Existing Schemas to Share

These files in `src/mastra/schemas/` should be importable by the frontend:
- `workflow-input.ts` — `WorkflowInputSchema`, `TalkFormatEnum` (for form validation)
- `deck-spec.ts` — `DeckSpecSchema` (for future slide viewer, Epic 11)
- `workflow-output.ts` — output types

### File Structure Target

```
bmad-mastra-presentation/
├── package.json              ← updated: concurrently, workspace scripts
├── pnpm-workspace.yaml       ← NEW
├── src/mastra/               ← unchanged
└── web/                      ← NEW
    ├── package.json
    ├── next.config.ts
    ├── tsconfig.json
    ├── postcss.config.mjs
    └── app/
        ├── globals.css
        ├── layout.tsx
        ├── page.tsx
        └── run/
            └── [runId]/
                └── page.tsx
```

### Testing Notes

- **TDD**: Write a test that imports `WorkflowInputSchema` from the shared package in the `web/` context to verify schema sharing works.
- Existing `pnpm test` must continue to pass — the vitest config targets `src/**/__tests__/**/*.test.ts` so `web/` won't interfere.
- For `web/` tests, defer to future stories. This story's validation is build + typecheck success.

### Anti-patterns to Avoid

- Do NOT use `create-next-app` — scaffold manually to control exact dependencies
- Do NOT add `src/` directory inside `web/` — use App Router's `app/` directly at `web/app/`
- Do NOT duplicate Zod schemas — import from the shared workspace package
- Do NOT install shadcn/ui yet — that's for later stories
- Do NOT modify existing `src/mastra/` files — this story only adds `web/` and workspace config
- Do NOT use Tailwind CSS 3 config style — use Tailwind CSS 4's CSS-first approach

### Project Structure Notes

- Root `tsconfig.json` and `web/tsconfig.json` are separate — the frontend has its own TypeScript config for JSX/React
- Root `.gitignore` should already cover `node_modules/` and `.next/` — verify and add `.next` if missing
- `web/.env.local` for `NEXT_PUBLIC_MASTRA_URL=http://localhost:4111` (environment variable for API base URL)

### References

- [Source: _bmad-output/planning-artifacts/architecture.md#Frontend Architecture]
- [Source: _bmad-output/planning-artifacts/epics.md#Epic 9, Story 9.1]
- [Source: _bmad-output/planning-artifacts/architecture.md#Mastra REST API Integration]

## Dev Agent Record

### Agent Model Used

Claude Opus 4.6 (1M context)

### Debug Log References

### Completion Notes List

- pnpm workspace created with `packages: [".", "web"]`
- Root dev script updated to use `concurrently` for parallel Mastra + Next.js dev servers
- Next.js 16.1.6 scaffolded with App Router, TypeScript strict, Tailwind CSS 4.2.1
- Workspace dependency `bmad-mastra-presentation: workspace:*` enables shared schema imports
- Schema import verified via `web/__tests__/schema-import.test.ts` (3 tests)
- All 420 tests pass, Next.js build succeeds, Mastra build succeeds
- Added `.next/` to `.gitignore`
- Added `sharp` to `pnpm.onlyBuiltDependencies` for Next.js image optimization
- Next.js auto-updated `web/tsconfig.json`: jsx → react-jsx, added `.next/dev/types`

### File List

- `pnpm-workspace.yaml` (new)
- `package.json` (modified — scripts, concurrently, sharp)
- `pnpm-lock.yaml` (modified)
- `.gitignore` (modified — added `.next/`)
- `vitest.config.ts` (modified — added `web/__tests__/` include)
- `web/package.json` (new)
- `web/next.config.ts` (new)
- `web/tsconfig.json` (new)
- `web/postcss.config.mjs` (new)
- `web/app/globals.css` (new)
- `web/app/layout.tsx` (new)
- `web/app/page.tsx` (new)
- `web/app/run/[runId]/page.tsx` (new)
- `web/__tests__/schema-import.test.ts` (new)

## Senior Developer Review (AI)

**Date:** 2026-03-16
**Outcome:** Approve (with fixes applied)

### Findings

- [x] [MEDIUM] Removed unnecessary `serverExternalPackages` from `web/next.config.ts` — frontend only imports pure JS schemas, not server-side Node.js deps
- [x] [LOW] `/new` link on landing page points to non-existent route (expected — Story 9.3 will create the form page)
- [x] [LOW] `next-env.d.ts` referenced in tsconfig but generated on first `next dev` run (standard Next.js behavior)
