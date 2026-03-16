# Epic 6 — Winston Discussion Agenda

**Purpose:** Align on Mastra observability scope before running the Epic 6 spike (Story 6.1).
**Participants:** Clement, Winston (BMAD Architect)
**Suggested format:** 30-minute working session with `mastra dev` running and Studio open. Trigger a TalkForge workflow and look at what shows up in the traces tab live.
**Output:** Findings feed directly into Story 6.1 spike document, which refines placeholder stories 6.2–6.N.

---

## 1. What Mastra traces automatically

The biggest unknown. Need to inventory what's captured out of the box:

- **Agent calls** — does `agent.generate()` produce traces with input/output/tokens/latency?
- **Tool invocations** — are tool calls within agent runs captured as child spans?
- **Workflow step transitions** — does the workflow engine emit step-level traces (start/end/status)?
- **Suspend/resume** — are gate interactions traced (suspend payload, resume payload, wait duration)?

**Key question:** If most of this is automatic, Epic 6 becomes verification + gap-filling rather than heavy instrumentation — very different scope.

## 2. Studio Observability tab capabilities

- What does the UI actually show today? Flat trace list or nested spans with parent-child relationships?
- Can you filter/search traces by workflow run, agent name, time range?
- Does it show token counts and costs, or just timing?
- Is the UI sufficient for dev debugging, or do we need custom views (which would expand scope)?

## 3. `mastra_traces` table schema

- What's the schema? Is it OTEL-compatible (trace_id, span_id, parent_span_id)?
- Can we query it directly for custom reports?
- Is there a Mastra API to query traces programmatically, or is direct SQL the only option?

## 4. Instrumentation conventions & API

- Are there conventions agents/tools must follow for traces to appear correctly? (e.g., specific metadata fields, naming patterns)
- If manual instrumentation is needed, what's the API? `mastra.telemetry.span()`, OTEL SDK directly, or something else?
- Does Mastra expose an OTEL `TracerProvider` we can hook into?

## 5. NFR gap analysis

Walk through specific requirements and assess coverage:

| NFR | Requirement | Auto-captured? |
|-----|------------|----------------|
| NFR-9 | Step name, input tokens, output tokens, latency, model used | ? |
| NFR-10 | Step name, status (pending/running/paused/complete/failed), duration | ? |
| NFR-12 | Persistence operation logging (key, operation, payload size) | ? |

## 6. Epic 7 early signal (OTEL export)

Quick temperature check — may affect whether Epic 7 is a full epic or a single story:

- Does Mastra have built-in OTEL export (e.g., config flag to point at a collector)?
- If export is trivial, Epic 7 might collapse significantly.
- Any recommended external backends (Grafana Tempo, Jaeger, Datadog)?

---

## Decisions needed

1. **Scope sizing** — Is Epic 6 mostly "turn on what's there" or "build instrumentation from scratch"?
2. **Story count** — How many implementation stories after the spike? Current placeholders: 3 (instrumentation, enrichment, querying).
3. **Epic 7 viability** — Is OTEL export worth a separate epic, or should it fold into Epic 6 as a bonus story?
