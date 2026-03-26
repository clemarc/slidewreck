---
title: 'History Page — Show Talk Topic & Date Instead of UUID'
slug: 'history-page-topic-display'
created: '2026-03-25'
status: 'dev-complete'
stepsCompleted: [1, 2, 3, 4, 5, 6]
tech_stack: ['Next.js 16', 'React', 'TypeScript', 'Tailwind CSS', 'Vitest']
files_to_modify: ['web/app/history/page.tsx', 'web/lib/mastra-client.ts', 'web/lib/format.ts', 'web/lib/__tests__/mastra-client.test.ts', 'web/lib/__tests__/format.test.ts']
code_patterns: ['client-side data fetching with useEffect', 'MastraClient class for API calls', 'listRuns returns raw snapshots vs getRunStatus returns normalized data', 'runtime type narrowing — no as-any casts']
test_patterns: ['Vitest unit tests for pure functions, co-located in __tests__/ dirs']
---

# Tech-Spec: History Page — Show Talk Topic & Date Instead of UUID

**Created:** 2026-03-25

## Overview

### Problem Statement

The history page (`web/app/history/page.tsx`) displays raw UUIDs as the primary identifier for each run. Users cannot tell which talk is which without clicking into each one. The page needs human-readable identifiers — talk title/topic and formatted dates.

### Solution

Replace the UUID display with the talk's polished title (from `snapshot.result.deckSpec.title` for completed runs) or the raw input topic (from `snapshot.result.metadata.input.topic` or step context for in-progress runs). Show format badge (lightning/standard/keynote), relative date, and status. Keep the existing status dot and link to `/run/{runId}`.

### Scope

**In Scope:**
- Extract topic/title from the `snapshot` data returned by `listRuns`
- Display polished title for completed runs, raw topic for in-progress/failed runs
- Show talk format as a badge (lightning, standard, keynote)
- Use relative date formatting (e.g., "3 days ago") with full date on hover
- Fix status extraction — status lives at `snapshot.status`, not top-level

**Out of Scope:**
- Pagination or lazy loading (7.6MB payload is a separate concern)
- Changing link targets (keep `/run/{runId}`)
- Backend API changes
- Search or filtering

## Context for Development

### Codebase Patterns

- Next.js 16 app router with `'use client'` pages
- Tailwind CSS for styling, no component library
- `MastraClient` class in `web/lib/mastra-client.ts` handles all API calls
- `WorkflowRun` interface defines the run shape — currently missing `snapshot` typing
- **Two different response shapes from Mastra API:**
  - `GET /runs` (listRuns) → returns raw `snapshot` object: `{ workflowName, runId, snapshot: { status, result?, context }, resourceId, createdAt, updatedAt }`
  - `GET /runs/{runId}` (getRunStatus) → returns normalized: `{ runId, status, result?, steps, ... }` (no `snapshot` wrapper)
- History page uses `listRuns` → must handle the raw snapshot shape

### Files to Reference

| File | Purpose |
| ---- | ------- |
| `web/app/history/page.tsx` | History page — display logic, main file to modify |
| `web/lib/mastra-client.ts` | API client + types — normalize `listRuns` response |
| `web/lib/format.ts` | New shared formatting utilities (relativeTime) |
| `web/lib/__tests__/mastra-client.test.ts` | Unit tests for `extractRunDisplayInfo` |
| `web/lib/__tests__/format.test.ts` | Unit tests for `relativeTime` |
| `web/app/run/[runId]/page.tsx` | Run detail page — reference for status display patterns |
| `web/lib/use-run-status.ts` | Run status hook — uses normalized `getRunStatus` shape |

### Technical Decisions

- **Data source:** `listRuns` returns full snapshots (7.6MB for 13 runs). No additional API calls needed — all display data is already in the response.
- **Normalization in `listRuns`:** The `listRuns` method normalizes the raw snapshot into `WorkflowRun` shape. However, we do NOT need to map `snapshot.context` into full `StepState` records — we only need the `input` context entry for topic extraction. The normalization extracts: `status` from `snapshot.status`, `result` from `snapshot.result`, and preserves `snapshot.context` as an opaque bag on a new `rawContext` field for downstream extraction. Add JSDoc to `listRuns` noting that it normalizes the raw Mastra API response.
- **Raw `listRuns` API response shape (confirmed):**
  ```
  { runs: Array<{ workflowName, runId, snapshot: { status, result?, context? }, resourceId, createdAt, updatedAt }>, total: number }
  ```
  - `snapshot.context` is a `Record<string, unknown>` where each key is a step ID
  - The `input` context entry is special: it IS the workflow input directly (keys: `topic`, `format`, `audienceLevel`, `reviewSlides`, optionally `constraints`) — NOT a `StepState` wrapper
  - Other context entries (e.g., `architect-structure`) are `StepState`-shaped objects with `status`, `output`, `payload`, etc.
- **Title extraction priority (runtime type-narrowed, no `as any`):**
  1. `result.deckSpec.title` — polished title (completed runs with full result)
  2. `result.metadata.input.topic` — raw topic (completed runs where deckSpec.title is missing, e.g. partial results)
  3. `rawContext.input.topic` — raw topic directly from input step context (in-progress/failed runs that got past the input step)
  4. `"Untitled"` — fallback for pending runs with no input step yet
  - All access uses runtime `typeof`/`in` checks or `isRecord()` type guard — no `as any` or `as unknown as` casts per project rules.
- **Format extraction:** Same priority chain as topic, accessing `format` field instead. Known values: `"lightning"`, `"standard"`, `"keynote"`. Unknown/missing values → badge not rendered (graceful hide, not raw display).
- **Status field:** Top-level `status` is `undefined` in listRuns response. Actual status is at `snapshot.status`. Normalization in `listRuns` fixes this.
- **Date format:** Relative dates ("3 days ago") using a simple helper with injectable `now` for testability. Thresholds with singular/plural: < 60s → "just now", 1 min/X min ago, 1 hour/X hours ago, 1 day/X days ago, else → `toLocaleDateString('en-US')` (pinned locale). Future/negative timestamps clamped to "just now" (defensive against clock skew). Full date shown in `title` attribute on hover. No external deps.
- **Pre-existing gaps (out of scope):** `StatusDot` and `statusLabel` only handle 6 of 10 `RunStatus` values (`waiting`, `paused`, `bailed`, `tripwire` fall through to defaults). This is pre-existing and not addressed in this spec.
- **Performance note:** The `listRuns` response is ~7.6MB parsed on the main thread. This may cause noticeable jank on slower devices. Acknowledged as a known limitation — optimization (pagination, streaming, field selection) is a follow-up concern.

## Implementation Plan

### Tasks

- [x] Task 1: Add `isRecord` type guard and `WorkflowRun.rawContext` field
  - File: `web/lib/mastra-client.ts`
  - Action:
    1. Add a non-exported module-level function `isRecord(v: unknown): v is Record<string, unknown>` that returns `typeof v === 'object' && v !== null && !Array.isArray(v)`.
    2. Add a non-exported module-level function `getString(obj: unknown, ...path: string[]): string | undefined` that traverses a nested object using `isRecord` at each level and returns the terminal value if it's a string (see Task 3 for implementation).
    3. Add optional `rawContext?: Record<string, unknown>` field to the `WorkflowRun` interface, with JSDoc: `/** Raw snapshot.context from listRuns API. Only populated by listRuns, not by getRunStatus. */`
  - Notes: Both `isRecord` and `getString` are non-exported helpers used by `extractRunDisplayInfo` (Task 3) and the normalization (Task 2). They are module-scoped (not nested inside another function) so they are reachable from both. This complies with the project's "No Unsafe Type Coercion Rule".

- [x] Task 2: Normalize `listRuns` response in `MastraClient`
  - File: `web/lib/mastra-client.ts`
  - Action: In the `listRuns` method, map each raw run from the API response to `WorkflowRun`:
    ```
    For each raw run in response.runs:
      - status: raw.snapshot?.status ?? 'pending'
      - result: raw.snapshot?.result ?? undefined
      - rawContext: raw.snapshot?.context ?? undefined
      - runId, workflowName, resourceId, createdAt, updatedAt: pass through as-is
    ```
    Wrap the per-run mapping in a try/catch — if a single run fails to normalize, log a `console.warn` and skip it (do not crash the entire page). After mapping, return `{ runs: normalizedRuns, total: normalizedRuns.length }` — use the post-filter length as `total`, not the original API `total`, so the count displayed in the UI matches the runs actually rendered. Add JSDoc: `/** Fetches all runs and normalizes the raw Mastra snapshot response into WorkflowRun shape. */`
  - Notes: The raw API response is confirmed as `{ runs: Array<RawRun>, total: number }`. Use `isRecord()` guard to verify `snapshot` exists and is an object before accessing sub-fields. Do NOT map `snapshot.context` entries to `StepState` — just pass the whole context bag as `rawContext`.

- [x] Task 3: Add `extractRunDisplayInfo` helper function
  - File: `web/lib/mastra-client.ts`
  - Action: Add an exported function with typed return:
    ```typescript
    type TalkFormat = 'lightning' | 'standard' | 'keynote';
    extractRunDisplayInfo(run: WorkflowRun): { title: string; format: TalkFormat | null }
    ```
    Extracts display-friendly title and format using runtime type narrowing:
    ```typescript
    function getString(obj: unknown, ...path: string[]): string | undefined {
      let cur: unknown = obj;
      for (const key of path) {
        if (!isRecord(cur)) return undefined;
        cur = cur[key];
      }
      return typeof cur === 'string' ? cur : undefined;
    }

    // Title priority:
    // 1. result.deckSpec.title (polished, completed runs)
    // 2. result.metadata.input.topic (raw, completed runs with partial/missing deckSpec)
    // 3. rawContext.input.topic (raw, in-progress/failed runs — context.input IS the input data directly)
    // 4. "Untitled" (pending runs with no input step)
    const title = getString(run.result, 'deckSpec', 'title')
      ?? getString(run.result, 'metadata', 'input', 'topic')
      ?? getString(run.rawContext, 'input', 'topic')
      ?? 'Untitled';

    // Format priority (same chain):
    const KNOWN_FORMATS: Set<string> = new Set(['lightning', 'standard', 'keynote']);
    const rawFormat = getString(run.result, 'metadata', 'input', 'format')
      ?? getString(run.rawContext, 'input', 'format');
    const format = (rawFormat && KNOWN_FORMATS.has(rawFormat) ? rawFormat : null) as TalkFormat | null;
    ```
  - Notes: Zero `as any` casts except the final narrowing `as TalkFormat | null` which is safe because `KNOWN_FORMATS` is the source of truth. The `getString` helper is defined in Task 1 as a module-level non-exported function. Unknown format values are silently dropped (badge not shown).

- [x] Task 4: Add `relativeTime` helper function in shared utility
  - File: `web/lib/format.ts` (new file)
  - Action: Create a new shared utility file with an exported `relativeTime(dateStr: string, now?: number): string` function:
    - Accept optional `now` parameter (defaults to `Date.now()`) for testability — tests pass a fixed timestamp instead of mocking globals
    - Parse `dateStr` to a `Date`, compute `diffMs = now - date.getTime()`
    - If `diffMs < 0` (future timestamp / clock skew), clamp to `0` and return `"just now"`
    - Thresholds with singular/plural handling:
      - < 60s → "just now"
      - < 2 min → "1 min ago", else < 1 hour → "X min ago"
      - < 2 hours → "1 hour ago", else < 1 day → "X hours ago"
      - < 2 days → "1 day ago", else < 30 days → "X days ago"
      - else → `date.toLocaleDateString('en-US')` (pinned locale for deterministic output)
    - If `dateStr` is unparseable (`isNaN`), return `dateStr` as-is (graceful fallback)
  - Notes: Placed in `web/lib/format.ts` (not in the page file) so it can be reused by the run detail page or other components later. The `now` parameter avoids `vi.useFakeTimers()` or `Date.now` mocking in tests — simpler and more explicit.

- [x] Task 5: Write unit tests for `extractRunDisplayInfo` and `relativeTime`
  - Files: `web/lib/__tests__/mastra-client.test.ts`, `web/lib/__tests__/format.test.ts`
  - Action:
    - **`mastra-client.test.ts`**: Test `extractRunDisplayInfo` with:
      - Completed run with `deckSpec.title` → returns polished title
      - Completed run with `result.metadata.input.topic` but no `deckSpec` → returns raw topic
      - In-progress run with `rawContext.input.topic` but no `result` → returns raw topic
      - Pending run with no `result` and no `rawContext` → returns "Untitled"
      - Run with known format → returns format string
      - Run with unknown format → returns `null`
    - **`format.test.ts`**: Test `relativeTime` with a fixed `now` timestamp (e.g., `new Date('2026-03-26T12:00:00Z').getTime()`):
      - 30 seconds ago → "just now"
      - 90 seconds ago → "1 min ago" (singular)
      - 5 minutes ago → "5 min ago" (plural)
      - 90 minutes ago → "1 hour ago" (singular)
      - 3 hours ago → "3 hours ago" (plural)
      - 36 hours ago → "1 day ago" (singular)
      - 6 days ago → "6 days ago" (plural)
      - 60 days ago → "1/25/2026" (pinned `en-US` locale, deterministic)
      - Future date (1 hour ahead) → "just now" (clamped)
      - Invalid date string "not-a-date" → returns "not-a-date" as-is
  - Notes: TDD — write tests first per project rules. Use Vitest (already configured in workspace). All tests pass a fixed `now` value — no mocking of `Date.now()` needed.

- [x] Task 6: Update history page run list display
  - File: `web/app/history/page.tsx`
  - Action: Replace the current run list item content (UUID + date) with:
    - **Line 1:** Talk title (from `extractRunDisplayInfo`) — CSS `truncate` class with container constrained by parent flex layout (the `min-w-0 flex-1` wrapper already handles overflow)
    - **Line 2:** Format badge (if `format` is not null) + relative date (from `relativeTime`) with `title` attribute showing full ISO timestamp
    - **Right side:** Status label (keep existing `statusLabel` function)
    - Keep existing `StatusDot` component and `Link` wrapper unchanged
    - Import `extractRunDisplayInfo` from `@/lib/mastra-client` and `relativeTime` from `@/lib/format`
    - Remove the old `formatDate` function (replaced by `relativeTime`)
  - Notes: Format badge uses small pill-style Tailwind classes: `rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-600`. Only render badge when `format` is not null. Title uses `text-sm font-medium text-gray-900 truncate` (not mono, not xs).

### Acceptance Criteria

- [ ] AC 1: Given a completed run with `deckSpec.title`, when the history page loads, then the polished title is displayed (e.g., "A World Transformed by El Niño") instead of the UUID.
- [ ] AC 2: Given a failed/in-progress run with an `input` step context but no `result`, when the history page loads, then the raw topic from the input step context is displayed as the title.
- [ ] AC 3: Given a pending run with no steps at all, when the history page loads, then "Untitled" is displayed as the title.
- [ ] AC 4: Given any run, when the history page loads, then a relative date is displayed (e.g., "6 days ago") and hovering the date shows the full ISO timestamp.
- [ ] AC 5: Given a completed run with a known format field (`lightning`, `standard`, `keynote`), when the history page loads, then a format badge is displayed next to the date. Given an unknown or missing format, then no badge is rendered.
- [ ] AC 6: Given any run, when the history page loads, then the status dot and status label are correctly displayed (using normalized `status` from `snapshot.status`).
- [ ] AC 7: Given the history page, when it loads with 13 existing runs, then all runs render without errors and no UUID is shown as the primary identifier.
- [ ] AC 8: Given a single malformed run in the API response (missing or corrupt `snapshot`), when the history page loads, then the malformed run is skipped and all other runs render normally (no page crash).
- [ ] AC 9: Given `extractRunDisplayInfo` and `relativeTime` functions, when unit tests run (`pnpm test`), then all test cases pass covering the title priority chain, format allowlist, relative time thresholds, future-date clamping, and invalid-date fallback.

## Additional Context

### Dependencies

None — pure frontend changes using data already returned by the API.

### Testing Strategy

- **Unit tests (TDD, written first):**
  - `web/lib/__tests__/mastra-client.test.ts` — `extractRunDisplayInfo` with fixtures for all 4 title priority levels + format allowlist
  - `web/lib/__tests__/format.test.ts` — `relativeTime` with all threshold boundaries + edge cases (future dates, invalid dates)
- **Manual verification** against the running Mastra server with 13 existing runs:
  - 8 completed (should show polished `deckSpec.title`)
  - 1 suspended (should show raw topic from input step context)
  - 2 failed (should show raw topic from input step context)
  - 1 pending with no steps (should show "Untitled")
  - 1 canceled/other non-terminal (verify graceful fallback — should show topic if input step exists, "Untitled" otherwise)
- Verify status dots and labels render correctly for all statuses
- Verify relative dates display and hover shows full timestamps
- Verify format badges appear for runs with known format values, hidden for unknown

### Notes

- The `listRuns` response is ~7.6MB because it includes full snapshots with all step outputs. Parsing this on the main thread may cause noticeable jank on slower devices. Pagination/field selection/streaming optimization is a follow-up concern.
- The normalization in Task 2 is defensive — if the API shape changes in a future Mastra version, the normalization is the single place to update. Per-run try/catch ensures one bad entry doesn't crash the page.
- No risk of breaking the run detail page — it uses `getRunStatus` which already returns normalized data.
- Pre-existing gap: `StatusDot` and `statusLabel` only handle 6 of 10 `RunStatus` values. Runs with `waiting`, `paused`, `bailed`, or `tripwire` status fall through to gray dot / raw status string. Not addressed in this spec — separate concern.
