---
title: 'Replace boolean gate approval with enum decision field for Mastra Studio UI'
slug: 'gate-decision-enum'
created: '2026-03-12'
status: 'done'
stepsCompleted: [1, 2, 3, 4, 5, 6]
tech_stack: ['zod', '@mastra/core', 'vitest']
files_to_modify:
  - 'src/mastra/schemas/gate-payloads.ts'
  - 'src/mastra/schemas/__tests__/gate-payloads.test.ts'
  - 'src/mastra/workflows/slidewreck.ts'
  - 'src/mastra/workflows/gates/review-gate.ts'
  - 'src/mastra/workflows/gates/__tests__/review-gate.test.ts'
  - 'src/mastra/workflows/__tests__/slidewreck.integration.test.ts'
code_patterns: ['GateResumeSchema', 'ArchitectStructureOutputSchema', 'createReviewGateStep', 'z.enum']
test_patterns: ['mock createStep', 'resume paths', 'vi.fn() mocks', 'safeParse validation']
---

# Tech-Spec: Replace boolean gate approval with enum decision field for Mastra Studio UI

**Created:** 2026-03-12

## Overview

### Problem Statement

Mastra Studio renders `z.boolean()` fields as mandatory checkboxes in suspend/resume forms. When a workflow suspends at a review gate, the user can only check the `approved` checkbox (true) — there is no way to uncheck it and submit with `approved: false` plus feedback. This blocks the reject-with-feedback workflow path that the backend already supports.

### Solution

Replace `approved: z.boolean()` with `decision: z.enum(["approve", "reject"])` in `GateResumeSchema` and all downstream consumers. Mastra Studio renders enum fields as dropdowns/radios, allowing explicit selection of either value before submission.

### Scope

**In Scope:**
- `GateResumeSchema` field rename: `approved: z.boolean()` → `decision: z.enum(["approve", "reject"])`
- `ArchitectStructureOutputSchema` field rename to match
- All workflow code consuming `resumeData.approved` / `inputData.approved`
- All integration tests using `approved: true/false` in resume payloads

**Out of Scope:**
- Custom review UI (sticking with Studio auto-rendered forms)
- Suspend payload schema changes (no issue there)
- `CollectReferencesResumeSchema` (different pattern, no approve/reject)
- New features or additional form fields

## Context for Development

### Codebase Patterns

- Gate schemas live in `src/mastra/schemas/gate-payloads.ts` — single source of truth for all review gates
- `createReviewGateStep()` factory in `gates/review-gate.ts` passes `resumeData` through unchanged
- `architectStructureStep` is a composite step that checks `resumeData?.approved` for branching (approve vs reject loopback)
- `.map()` callbacks after gates read `inputData.approved` / `inputData.feedback`
- Integration tests use real `createReviewGateStep` + mock agent steps with `InMemoryStore`

### Files to Reference

| File | Purpose |
| ---- | ------- |
| `src/mastra/schemas/gate-payloads.ts` | `GateResumeSchema` definition — the root change |
| `src/mastra/workflows/gates/review-gate.ts` | Factory that wires `resumeSchema: GateResumeSchema` |
| `src/mastra/workflows/slidewreck.ts` | Production workflow — `architectStructureStep` + `ArchitectStructureOutputSchema` |
| `src/mastra/schemas/__tests__/gate-payloads.test.ts` | Unit tests for `GateResumeSchema` — validates `approved` field directly |
| `src/mastra/workflows/gates/__tests__/review-gate.test.ts` | Unit tests for `createReviewGateStep` — uses `approved` in mock payloads |
| `src/mastra/workflows/__tests__/slidewreck.integration.test.ts` | All resume path tests |

### Technical Decisions

- **Enum over boolean:** `z.enum(["approve", "reject"])` renders as a selectable control in Studio. Boolean renders as a checkbox that can only be checked.
- **String literal comparison:** `resumeData.decision === 'approve'` is equally readable to `resumeData.approved === true` and avoids truthy/falsy ambiguity.
- **No migration needed:** There are no persisted workflow runs that need schema migration — this is a dev-time schema change.

## Implementation Plan

### Tasks

#### Task 1: Update `GateResumeSchema` (`src/mastra/schemas/gate-payloads.ts`)

1. Replace `approved: z.boolean().describe(...)` with `decision: z.enum(["approve", "reject"]).describe('Whether the speaker approved or rejected the output')`
2. Update `GateResumePayload` type export (auto-inferred, no manual change needed)

#### Task 2: Update `ArchitectStructureOutputSchema` (`src/mastra/workflows/slidewreck.ts`)

1. Replace `approved: z.boolean().describe(...)` with `decision: z.enum(["approve", "reject"]).describe('Whether the speaker approved or rejected the structure')`
2. Update `architectStructureStep.execute()`:
   - Line 93: `if (resumeData?.approved)` → `if (resumeData?.decision === 'approve')`
   - Line 99: `approved: true` → `decision: 'approve' as const`
   - Line 107: `if (resumeData && !resumeData.approved)` → `if (resumeData?.decision === 'reject')`
3. Update lightning skip return (line 72): `approved: true` → `decision: 'approve' as const`

#### Task 3: Update `.map()` callbacks in `slidewreck.ts`

1. The `.map()` after `reviewResearchGate` (line 230): reads `gateResult.feedback` only — no `approved` field usage. **No change needed.**
2. The `.map()` after `architectStructureStep` (line 257): reads `structureResult.feedback` and `structureResult.architectOutput` — no direct `approved` check. **No change needed.**

#### Task 4: Update `review-gate.ts` (no code change expected)

1. Verify `createReviewGateStep` — it passes `resumeData` through as-is. Schema reference via `GateResumeSchema` import automatically picks up the new field. **No code change needed**, just verify.

#### Task 5: Update schema unit tests (`src/mastra/schemas/__tests__/gate-payloads.test.ts`)

1. `'should accept a valid resume payload with all fields'` (line 94): `approved: true` → `decision: 'approve'`
2. `'should accept resume with only approved'` (line 103): `approved: false` → `decision: 'reject'`
3. `'should accept resume with approved and feedback only'` (line 110): `approved: true` → `decision: 'approve'`
4. `'should reject missing approved field'` (line 117): rename to `'should reject missing decision field'` — test body stays same (omits `decision`)
5. `'should reject non-boolean approved'` (line 124): rename to `'should reject invalid decision value'` — change `approved: 'yes'` to `decision: 'maybe'`
6. Update test descriptions to reference `decision` instead of `approved`

#### Task 6: Update review-gate unit tests (`src/mastra/workflows/gates/__tests__/review-gate.test.ts`)

1. `'should call suspend with correct payload on first execution'` (line 51): `suspendSentinel` uses `{ approved: false }` — change to `{ decision: 'reject' }`
2. `'should return resumeData when present'` (line 71): `resumePayload` uses `{ approved: true, feedback: ... }` — change to `{ decision: 'approve', feedback: ... }`

#### Task 7: Update integration tests (`src/mastra/workflows/__tests__/slidewreck.integration.test.ts`)

1. **All `resumeData` objects** for review gates: replace `approved: true` → `decision: 'approve' as const` and `approved: false` → `decision: 'reject' as const`
2. **Mock `architectStructureStep`**: update all `resumeData?.approved` checks to `resumeData?.decision === 'approve'` / `=== 'reject'`
3. **Mock `errorArchitectStructureStep`**: same pattern
4. **`ArchitectStructureOutputSchema` import** is used for type checking — picks up new field automatically

Affected test locations (by line reference):
- `mockArchitectStructureStep` execute: lines 126, 152, 160
- `errorArchitectStructureStep` execute: line 405
- `startAndSkipCollectReferences` helper: no change (doesn't use gates)
- Every `run.resume({ step: 'review-*', resumeData: ... })` call: ~20 occurrences

### Acceptance Criteria

- **AC-1:** `GateResumeSchema` has `decision: z.enum(["approve", "reject"])` field; no `approved` field exists
- **AC-2:** `ArchitectStructureOutputSchema` has `decision: z.enum(["approve", "reject"])` field; no `approved` field exists
- **AC-3:** `pnpm typecheck` passes with zero errors
- **AC-4:** `pnpm test` passes — all existing integration tests pass with updated resume payloads
- **AC-5:** Mastra Studio renders the review gate form with a selectable approve/reject control (manual verification)
- **AC-6:** Reject + feedback path works end-to-end: select "reject", type feedback, submit → workflow re-suspends with feedback applied

Given/When/Then for key paths:

**AC-4a: Approve path**
- Given a workflow suspended at a review gate
- When the user resumes with `{ decision: "approve" }`
- Then the workflow proceeds to the next step

**AC-4b: Reject + feedback path**
- Given a workflow suspended at Gate 2 (architect-structure)
- When the user resumes with `{ decision: "reject", feedback: "try again" }`
- Then the workflow re-suspends at Gate 2 with re-generated options

**AC-4c: Reject without feedback path**
- Given a workflow suspended at Gate 2
- When the user resumes with `{ decision: "reject" }`
- Then the workflow re-suspends at Gate 2 with generic retry prompt

## Additional Context

### Dependencies

- None — pure schema + code refactor, no new packages

### Testing Strategy

- **Automated:** All existing integration tests updated to use new field name — same coverage, same paths
- **Manual:** Start `pnpm dev`, trigger slidewreck workflow, verify Studio shows dropdown/radio for decision field at each gate

### Notes

- The `edits` field on `GateResumeSchema` remains unchanged (`z.unknown().optional()`)
- The `feedback` field remains unchanged (`z.string().optional()`)
- If Mastra Studio renders `z.enum()` differently than expected, fallback option is `z.string().refine()` with explicit values
