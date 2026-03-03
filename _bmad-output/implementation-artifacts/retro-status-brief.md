# Retrospective Status Brief

## Completed

**Epic 2 Retrospective** — Done (2026-02-27)
- Saved: `_bmad-output/implementation-artifacts/epic-2-retro-2026-02-27.md`
- Sprint status updated: `epic-2-retrospective: done`
- 6 action items captured

**Epic 3 Retrospective** — Done (2026-03-03)
- Saved: `_bmad-output/implementation-artifacts/epic-3-retro-2026-03-03.md`
- Sprint status updated: `epic-3-retrospective: done`
- 8 new action items captured + 6 carried from Epic 2 = 14 total

**All 14 Action Items — EXECUTED (2026-03-03)**

### Epic 2 Retro Items (6/6 done)

1. ✅ **Suspend/Resume Path Checklist** added to architecture.md
2. ✅ **"No unsafe type coercion" rule** added to architecture.md
3. ✅ **CLAUDE.md pointers** updated with all new checklists and rules
4. ✅ **API Verification Spike process** documented in CLAUDE.md Sprint Process section
5. ✅ **Git flow rule** documented in CLAUDE.md Sprint Process section
6. ✅ **Composite step pattern** updated in architecture.md Workflow Composition Pattern table

### Epic 3 Retro Items (8/8 done)

1. ✅ **One-epic-per-sprint cadence** documented in CLAUDE.md Sprint Process section
2. ✅ **Model tier assertion test** — already existed at researcher.test.ts:100-102
3. ✅ **Embedding provider alternatives** — researched and documented in architecture.md (Voyage AI, @mastra/fastembed, Ollama)
4. ✅ **PDF support implemented** — `unpdf` library added, PDF pre-processing in user-references.ts, 3 new tests (180 total)
5. ✅ **pgvector upsert investigated** — `deleteFilter` parameter enables atomic source-level replacement, documented in architecture.md
6. ✅ **Circular dependency resolved** — PgVector extracted to `src/mastra/config/database.ts`, shared by index.ts and workflow
7. ✅ **Agent class limitation** documented in architecture.md Known Limitations table
8. ✅ **Mastra Evals API Verification Spike** — comprehensive findings saved to `_bmad-output/implementation-artifacts/spike-mastra-evals-api.md`

## Key Spike Findings (Epic 4 Impact)

- `createScorer` from `@mastra/core/evals` with fluent builder pattern (`.generateScore()`, `.generateReason()`)
- Registration: direct `MastraScorer` instances (NOT wrapped in `{ scorer: ... }`) — story specs need correction
- Score storage is **built-in** — Story 4-4 can be dramatically simplified
- `runEvals` function exists for batch evaluation — Story 4-3 can leverage this
- Datasets & Experiments API available for structured testing and trend analysis

## Next Steps

1. **Sprint planning for Epic 4** — scoped to one epic
   - Epic 4: Quality Evaluation & Insights (4 stories, 4-1 at ready-for-dev)
   - Story specs must be updated to reference verified API behavior from evals spike
   - See: `_bmad-output/implementation-artifacts/spike-mastra-evals-api.md`

## Key Decisions Made

- **Scope sprints to one epic at a time** with retro+actions gap between epics
- **API verification spikes happen during sprint planning**, not during dev
- **Encoding review finding patterns into checklists** is the primary quality improvement strategy
- **Composite step pattern** is the real architecture for suspend/resume flows
- **No back-to-back epics** without executing retro action items first
- **PDF support** implemented via `unpdf` pre-processing
- **PgVector upsert** via `deleteFilter` parameter (documented, not yet adopted in code)
- **Embedding provider decision** deferred — alternatives documented, OpenAI retained for now
