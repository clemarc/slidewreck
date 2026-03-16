# Story 9.3: Workflow Input Form

Status: done

## Story

As a speaker,
I want a web form to enter my talk details and start generation,
So that I can use the system through a browser instead of the API directly.

## Acceptance Criteria

1. **AC-1: Form fields** — The form includes fields for topic (text), audience level (select: beginner/intermediate/advanced/mixed), talk format (select: lightning/standard/keynote), and optional constraints (textarea). Client-side validation matches the Zod `WorkflowInputSchema`.
2. **AC-2: Form submission** — On valid submission, the form triggers the workflow via `MastraClient.triggerWorkflow` and redirects the speaker to `/run/:runId`.
3. **AC-3: Validation feedback** — Invalid inputs show inline error messages (e.g., empty topic).
4. **AC-4: Route** — The form is accessible at `/new`.

## Tasks / Subtasks

- [x] Task 1: Create form page at `/new` (AC: 1, 4)
  - [x] 1.1 Create `web/app/new/page.tsx` as a client component (`'use client'`)
  - [x] 1.2 Add topic text input with label
  - [x] 1.3 Add audience level select (beginner, intermediate, advanced, mixed)
  - [x] 1.4 Add talk format select (lightning, standard, keynote)
  - [x] 1.5 Add constraints textarea (optional)
  - [x] 1.6 Add submit button
- [x] Task 2: Form validation using Zod (AC: 1, 3)
  - [x] 2.1 Import `WorkflowInputSchema` from shared schemas
  - [x] 2.2 Validate form data on submit using `.safeParse()`
  - [x] 2.3 Display inline error messages for invalid fields
- [x] Task 3: Form submission and redirect (AC: 2)
  - [x] 3.1 On valid submit, call `MastraClient.triggerWorkflow('slidewreck', input)`
  - [x] 3.2 On success, redirect to `/run/:runId` using `useRouter().push()`
  - [x] 3.3 Show loading state during submission (button text changes to "Starting...")
  - [x] 3.4 Show error message if API call fails (red banner with MastraApiError details)
- [x] Task 4: Tests (AC: 1, 2, 3)
  - [x] 4.1 Test form validation: empty topic, missing topic, invalid enum values all rejected
  - [x] 4.2 Test form validation: valid input with and without constraints passes
  - [x] 4.3 Test form renders: verified via Next.js build (route `/new` registered as static page)

## Dev Notes

### Previous Story Intelligence

- `MastraClient` class in `web/lib/mastra-client.ts` — use `triggerWorkflow('slidewreck', inputData)`
- `WorkflowInputSchema` importable from `bmad-mastra-presentation/src/mastra/schemas/workflow-input`
- The `WorkflowInputSchema` expects: `topic` (string), `audienceLevel` (enum), `format` (enum), `constraints` (optional string), `reviewSlides` (boolean, default false)
- `TalkFormatEnum.options` gives `['lightning', 'standard', 'keynote']`

### Implementation Notes

- Use `'use client'` directive — form needs interactivity (state, event handlers)
- Use React `useState` for form state and errors — no form library needed for 4 fields
- Use `useRouter` from `next/navigation` for redirect after submission
- Style with Tailwind CSS utility classes — keep it simple, no shadcn needed yet
- The `reviewSlides` field defaults to `false` — don't show it in the form (can add later)

### File Structure

```
web/app/new/
  └── page.tsx    ← client component with form
```

### Anti-patterns to Avoid

- Do NOT use React Hook Form or Formik — overkill for 4 fields
- Do NOT hardcode validation rules — use `WorkflowInputSchema.safeParse()` from shared schemas
- Do NOT use server actions — this is a client-side form that calls the Mastra API directly
- Do NOT create separate form components — single page component is fine for this scope

### References

- [Source: _bmad-output/planning-artifacts/epics.md#Story 9.3]
- [Source: web/lib/mastra-client.ts — MastraClient.triggerWorkflow]
- [Source: src/mastra/schemas/workflow-input.ts — WorkflowInputSchema]

## Dev Agent Record

### Agent Model Used

Claude Opus 4.6 (1M context)

### Debug Log References

### Completion Notes List

- Form page at `/new` with all 4 fields (topic, audience level, format, constraints)
- Client-side validation using `WorkflowInputSchema.safeParse()` — shared Zod schema
- Inline error messages per field from Zod issue paths
- Submit calls `MastraClient.triggerWorkflow('slidewreck', ...)`, redirects to `/run/:runId`
- Loading state on button, API error banner on failure
- Optional constraints trimmed before validation (empty string → omitted)
- 7 validation tests in `web/__tests__/workflow-form-validation.test.ts`
- 437 total tests pass, Next.js build succeeds

### File List

- `web/app/new/page.tsx` (new)
- `web/__tests__/workflow-form-validation.test.ts` (new)

## Senior Developer Review (AI)

**Date:** 2026-03-16
**Outcome:** Approve

### Findings

- [x] [LOW] MastraClient instantiated per submit — functionally correct, env var baked at build time
- [x] [LOW] Minor type widening from WorkflowInput to Record<string, unknown> — acceptable
- [x] [LOW] No back navigation from form — not in scope for this story
