# Sprint Change Proposal — Gate-Specific Review Controls

**Date:** 2026-03-17
**Author:** Workflow (correct-course)
**Approved by:** Clement
**Change Scope:** Minor

---

## 1. Issue Summary

During post-implementation testing of Epic 10 (Workflow Status & Review Gates), it was discovered that the review controls UI (`review-controls.tsx`) sends a generic `{decision, feedback?}` payload for every gate, regardless of the gate's actual resume schema. Three of five gates have resume schemas that differ from this generic shape:

- **collect-references** expects `{materials: ReferenceMaterial[]}` — no `decision` field at all. The UI cannot provide file paths or URLs, making this gate non-functional.
- **architect-structure** expects `{decision, feedback?, edits?}` but presents three structure options with no way to select one — the user can only type into a textarea.
- **review-slides** expects `{decision, feedback?, deckSpec?}` but cannot send back an edited DeckSpec.

The gate content _display_ components (Story 10.2) are correctly customized per step. The gap is in the _input/control_ layer (Story 10.3).

**Root cause:** Story 10.3 acceptance criteria did not require per-gate form customization. The resume schemas were defined in the backend but the frontend was built against a single generic shape.

---

## 2. Impact Analysis

### Epic Impact

| Epic | Impact | Details |
|------|--------|---------|
| **Epic 10** | Direct | Story 10.3 is functionally incomplete for 3 of 5 gates |
| **Epic 11** | Blocked dependency | Visual slide preview extends the slides gate — needs working gate controls first |
| **Epics 6-9, 12-14** | None | Backend/infra or unrelated frontend work |

### Story Impact

- **Story 10.3 (Review Controls):** Incomplete — works only for simple approve/reject gates (review-research, review-script)
- **Stories 10.1, 10.2, 10.4:** Unaffected — status display, gate content rendering, and run history work correctly

### Artifact Conflicts

- **PRD:** No conflict. FR-8 (suspend/resume) and FR-9 (structured feedback passthrough) are correct — the frontend doesn't implement them fully.
- **Architecture:** No conflict. Resume schemas (`CollectReferencesResumeSchema`, `GateResumeSchema`, `ReviewSlidesResumeSchema`) are correctly defined.
- **Epics.md:** Needs new Story 10.5 added.
- **sprint-status.yaml:** Epic 10 needs reopening.

### Technical Impact

Frontend only. No backend, API, or infrastructure changes required. The Mastra resume endpoint already validates against the correct Zod schemas — the fix is making the frontend send the right payload shape per gate.

---

## 3. Recommended Approach

**Direct Adjustment** — Add Story 10.5 to Epic 10 covering gate-specific review controls.

### Rationale

- Backend resume schemas are correct and tested
- Gate content display components already demonstrate per-gate customization pattern
- This is a frontend-only fix scoped to one new story
- Must be completed before Epic 11 (which extends the slides gate)
- No rollback needed — existing generic controls still work for simple gates

### Estimates

- **Effort:** Medium (5 gate-specific control components)
- **Risk:** Low (backend is solid, clear schema contracts)
- **Timeline impact:** Adds ~1 story to the Epic 10 sprint before proceeding to Epic 11

---

## 4. Detailed Change Proposals

### 4.1 — Epics.md: Add Story 10.5

**Location:** Epic 10 section in `_bmad-output/planning-artifacts/epics.md`

**NEW — Story 10.5: Gate-Specific Review Controls**

Each workflow gate gets a tailored review form matching its resume schema:

| Gate | Current State | Required Controls |
|------|--------------|-------------------|
| `collect-references` | Approve/skip (broken — sends wrong schema) | File path / URL input list with add/remove rows. "Skip" sends empty materials array. No approve/reject — just "Submit" and "Skip" |
| `review-research` | Approve/reject + feedback (works) | No change needed, minor polish only |
| `architect-structure` | Approve/reject + feedback (poor UX) | Radio/card selector for the 3 structure options + feedback textarea. Selected option communicated via feedback field |
| `review-script` | Approve/reject + feedback (works) | No change needed |
| `review-slides` | Approve/reject + feedback (missing deckSpec) | Approve/reject + feedback textarea + optional JSON/structured editor for DeckSpec edits |

**Acceptance Criteria:**
- Each gate renders a form matching its resume schema
- `collect-references` sends `{materials: ReferenceMaterial[]}` on resume
- `architect-structure` sends selected option identifier in feedback
- `review-slides` can optionally send modified `deckSpec`
- All resume payloads pass Zod validation on the backend
- Existing gates that already work (research, script) are not broken
- Tests cover each gate's resume payload shape

### 4.2 — sprint-status.yaml: Reopen Epic 10

```
OLD:
  epic-10:
    status: done

NEW:
  epic-10:
    status: in-progress
    stories:
      10-5:
        title: Gate-Specific Review Controls
        status: ready
```

### 4.3 — web/components/review-controls.tsx: Refactor to Gate-Aware

Replace single generic form with a dispatcher that renders per-gate control components:

- `ReferencesControls` — material list builder (add/remove file paths and URLs) + "Skip" button
- `StructureControls` — option card/radio selector + feedback textarea
- `SlidesControls` — approve/reject + feedback + optional DeckSpec editor
- Keep current approve/reject + feedback form as default for `review-research` and `review-script`

### 4.4 — web/lib/mastra-client.ts: Widen Resume Payload Type

Change `resumeData` parameter type from `{decision: string, feedback?: string}` to `Record<string, unknown>` so gate-specific payloads can pass through without type errors.

---

## 5. Implementation Handoff

### Change Scope: Minor

Direct implementation by development team. No backlog reorganization or strategic replan needed.

### Handoff Plan

1. **Update epics.md** — Add Story 10.5 as specified in 4.1
2. **Update sprint-status.yaml** — Reopen Epic 10 as specified in 4.2
3. **Implement Story 10.5** — via normal dev-story workflow
4. **Code review** — via normal PR flow
5. **Proceed to Epic 11** — once Story 10.5 is complete and Epic 10 re-closed

### Success Criteria

- All 5 gates send resume payloads matching their backend Zod schemas
- `collect-references` gate allows entering file paths and URLs
- `architect-structure` gate allows selecting one of the presented options
- `review-slides` gate allows optional DeckSpec modifications
- No regressions in gates that already worked (research, script)
