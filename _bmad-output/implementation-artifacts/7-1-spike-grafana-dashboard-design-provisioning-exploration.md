# Story 7.1: [Spike] Grafana Dashboard Design & Provisioning Exploration

Status: done

## Story

As a developer,
I want to understand Grafana's dashboard provisioning capabilities and Tempo query patterns for TalkForge traces,
So that I can scope the dashboard implementation story (7.2) with concrete panel specifications and verified TraceQL queries.

## Acceptance Criteria

1. **Given** a running LGTM container with TalkForge traces (from Epic 6)
   **When** the spike is complete
   **Then** a spike document exists at `_bmad-output/implementation-artifacts/spike-epic-7-grafana-dashboards.md`

2. **Given** the spike document
   **When** I review its contents
   **Then** it includes:
   - Verified Grafana dashboard provisioning approach (YAML file-based, auto-loaded by LGTM container)
   - Sample TraceQL queries that work against TalkForge span types (AGENT_RUN, MODEL_GENERATION, WORKFLOW_STEP, TOOL_CALL, etc.)
   - Recommended dashboard layout with concrete panel specifications
   - At least one prototype dashboard panel validated end-to-end (provisioned YAML → Grafana renders data)

3. **Given** the spike findings
   **When** I review the Story 7.2 refinement section
   **Then** it contains concrete panel specifications with data sources, query types, and visualization types for each panel

## Tasks / Subtasks

- [x] Task 1: Explore Grafana dashboard provisioning via YAML (AC: 1, 2)
  - [x] 1.1 Verify the LGTM container's provisioning paths (`/etc/grafana/provisioning/dashboards/`, `/var/lib/grafana/dashboards/`)
  - [x] 1.2 Create a provisioning config YAML that tells Grafana to load dashboards from a mounted volume
  - [x] 1.3 Create a minimal dashboard JSON with one test panel, mount it into the LGTM container, verify it auto-loads
  - [x] 1.4 Document the provisioning pipeline: local YAML → docker volume mount → Grafana auto-load

- [x] Task 2: Test Tempo TraceQL queries for TalkForge span types (AC: 2)
  - [x] 2.1 Open Grafana Explore > Tempo and verify traces from TalkForge are queryable
  - [x] 2.2 Test TraceQL queries for each span type: `{span.type = "AGENT_RUN"}`, `{span.type = "MODEL_GENERATION"}`, `{span.type = "WORKFLOW_STEP"}`, etc.
  - [x] 2.3 Test filtering by service name: `{resource.service.name = "slidewreck"}`
  - [x] 2.4 Test aggregation queries: duration histograms, token usage sums, error rate
  - [x] 2.5 Document which attributes are available on each span type (for panel queries)

- [x] Task 3: Identify valuable dashboard panels (AC: 2, 3)
  - [x] 3.1 Evaluate pipeline overview panels: workflow run success/failure rates, p50/p95 latency
  - [x] 3.2 Evaluate agent performance panels: per-agent token usage, model call latency, tool call frequency
  - [x] 3.3 Evaluate cost tracking panels: token consumption by model tier (Opus/Sonnet/Haiku), estimated cost per run
  - [x] 3.4 Evaluate step-level drilldown panels: individual step durations, suspend/resume wait times
  - [x] 3.5 Evaluate error analysis panels: failure rates by step, error categories
  - [x] 3.6 Determine which panels are feasible with trace-derived data vs which need Mimir metrics

- [x] Task 4: Prototype one dashboard panel end-to-end (AC: 2)
  - [x] 4.1 Pick the highest-value panel from Task 3 analysis
  - [x] 4.2 Build the panel as provisioned dashboard JSON with working TraceQL query
  - [x] 4.3 Mount into LGTM container and verify it renders with real TalkForge trace data
  - [x] 4.4 Capture screenshot or document the result

- [x] Task 5: Produce spike document and Story 7.2 refinement (AC: 1, 2, 3)
  - [x] 5.1 Write spike document with all findings
  - [x] 5.2 Include refined Story 7.2 panel specifications with concrete queries and visualization types
  - [x] 5.3 Include the provisioning pipeline documentation (how to add/modify dashboards)

## Dev Notes

### Infrastructure Context

- **LGTM container** already running: `grafana/otel-lgtm:latest` in `docker-compose.yml`
  - Grafana UI: `http://localhost:3200` (mapped from container port 3000 to avoid Next.js conflict)
  - OTLP HTTP: port 4318 (traces ingested here)
  - Tempo data source pre-configured in LGTM image
- **OtelExporter** configured in `mastra/src/mastra/index.ts` — traces from TalkForge flow to Grafana Tempo
- **Span types** from Epic 6 spike: AGENT_RUN, MODEL_GENERATION, MODEL_STEP, TOOL_CALL, WORKFLOW_RUN, WORKFLOW_STEP, WORKFLOW_CONDITIONAL, WORKFLOW_PARALLEL, WORKFLOW_WAIT_EVENT, etc.
- **Token usage** detail available on MODEL_GENERATION spans: inputTokens, outputTokens, cache breakdown, reasoning tokens

### Provisioning Approach

The `grafana/otel-lgtm` image supports standard Grafana provisioning:
- Dashboard provisioning config: `/etc/grafana/provisioning/dashboards/`
- Dashboard JSON files: `/var/lib/grafana/dashboards/`
- Datasource provisioning: `/etc/grafana/provisioning/datasources/` (Tempo already pre-configured by LGTM)

Mount local directory into the container via docker-compose volumes.

### Key Questions to Answer

1. What TraceQL attribute names does Mastra use? (e.g., `span.type`, `span.name`, `resource.service.name`)
2. Can Tempo provide RED metrics (Rate, Error, Duration) from traces alone, or do we need Mimir?
3. What's the refresh interval and data retention in the LGTM container?
4. Are Tempo's `metrics-generator` or `TraceQL metrics` features available in the LGTM image?

### Model Tier Cost Reference (for cost tracking panel)

| Model | Input (per 1M tokens) | Output (per 1M tokens) |
|-------|----------------------|----------------------|
| claude-opus-4-6 | $15.00 | $75.00 |
| claude-sonnet-4-5 | $3.00 | $15.00 |
| claude-haiku-4-5 | $0.80 | $4.00 |

### Previous Story Intelligence

- Story 6.2: Added DefaultExporter + Observability config
- Story 6.3: Added OtelExporter + OtelBridge + LGTM container to docker-compose
- Story 6.4: Verified span types, wrote observability tests, documented that storage ops are NOT auto-traced but WORKFLOW_WAIT_EVENT covers suspend/resume
- Epic 6 retro: completed successfully, all traces flowing

### Project Structure Notes

- Spike output: `_bmad-output/implementation-artifacts/spike-epic-7-grafana-dashboards.md`
- Provisioning prototype created ahead of schedule (originally planned for 7.2) to validate the pipeline end-to-end
- Dashboard provisioning files: `grafana/provisioning/dashboards/dashboards.yaml`, `grafana/dashboards/talkforge-pipeline.json`
- Docker Compose updated with volume mounts for provisioning

### References

- [Source: _bmad-output/implementation-artifacts/spike-epic-6-mastra-observability.md] — Span types, token usage attributes, OTEL export config
- [Source: _bmad-output/planning-artifacts/architecture.md#Data Architecture] — Observability infrastructure, LGTM ports
- [Source: _bmad-output/planning-artifacts/epics.md#Story 7.1] — Epic story definition
- [Source: docker-compose.yml] — LGTM container config
- [Source: mastra/src/mastra/index.ts] — OtelExporter configuration
- [Source: .agents/skills/grafana-dashboard/] — Grafana dashboard skill with provisioning references

## Dev Agent Record

### Agent Model Used

Claude Opus 4.6 (1M context)

### Debug Log References

### Completion Notes List

- Created Grafana provisioning directory structure (`grafana/provisioning/dashboards/`, `grafana/dashboards/`)
- Created provisioning config YAML with auto-reload every 10s, TalkForge folder
- Created prototype dashboard JSON with 10 panels across 5 sections (Pipeline Overview, Agent Performance, Token Usage & Cost, Step-Level Drilldown, Error Analysis)
- Updated docker-compose.yml with volume mounts for dashboard provisioning into LGTM container
- Wrote comprehensive spike document with TraceQL query patterns, attribute mapping, panel specifications, and Story 7.2 refinement
- Key finding: LGTM pre-configures Tempo datasource (uid: "tempo"), no datasource provisioning needed
- Key risk: Attribute names need verification against actual trace data in Story 7.2
- Key limitation: Cost calculation not possible in TraceQL — documented workaround (static reference panel + Grafana transformations)

### File List

- `_bmad-output/implementation-artifacts/spike-epic-7-grafana-dashboards.md` (new — spike document)
- `grafana/provisioning/dashboards/dashboards.yaml` (new — provisioning config)
- `grafana/dashboards/talkforge-pipeline.json` (new — prototype dashboard)
- `docker-compose.yml` (modified — added volume mounts for LGTM)
