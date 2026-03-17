# Epic 6 API Verification Spike: Mastra-Native Observability

**Date:** 2026-03-17
**Purpose:** Verify Mastra's built-in observability surface — what's auto-traced, what needs manual instrumentation, and what packages are required — before Epic 6 sprint planning. Includes Winston discussion findings and scope decisions.
**Participants:** Clement, Winston (BMAD Architect)

---

## 1. Observability Architecture

### Package Landscape

| Package | Version | Role |
|---------|---------|------|
| `@mastra/core` | ^1.13.2 | Defines all observability interfaces, span types, no-op defaults |
| `@mastra/observability` | ^1.5.0 | `Observability` entrypoint class, `DefaultExporter` (Postgres-backed), `ConsoleExporter` |
| `@mastra/otel-exporter` | ^1.0.7 | `OtelExporter` — OTLP/Zipkin export with provider presets (Dash0, SignOz, NewRelic, custom) |
| `@mastra/otel-bridge` | ^1.0.7 | `OtelBridge` — bidirectional OTEL context propagation |

### Key Finding: Observability is Opt-In

Without an `observability` option in the `Mastra` constructor, all tracing uses `NoOpObservability` — spans are silently discarded. This is why no traces appeared before the spike.

**Minimal activation:**

```typescript
import { Observability, DefaultExporter } from '@mastra/observability';

new Mastra({
  // ...existing config
  observability: new Observability({
    configs: {
      default: {
        serviceName: 'slidewreck',
        exporters: [new DefaultExporter()],
      },
    },
  }),
});
```

The `DefaultExporter` batches spans and persists them to Postgres via the existing `PostgresStore`. Studio reads from that storage — no extra DB setup needed.

**Verified:** After adding this config and restarting `mastra dev`, traces appeared in Studio for a full workflow run.

---

## 2. What Mastra Auto-Traces

### Span Types (from `SpanType` enum in `@mastra/core`)

| Span Type | What It Captures |
|-----------|-----------------|
| `AGENT_RUN` | Root span for agent execution — instructions, prompt, available tools, max steps |
| `MODEL_GENERATION` | LLM call — model name, provider, token usage (with cache/reasoning breakdown), streaming flag, finish reason, TTFT |
| `MODEL_STEP` | Individual model execution step within a generation (multi-step agents) |
| `MODEL_CHUNK` | Streaming chunk events (chunk type, sequence number) |
| `TOOL_CALL` | Tool invocation — tool type, description, success/failure |
| `MCP_TOOL_CALL` | MCP tool execution — server ID, version, success/failure |
| `WORKFLOW_RUN` | Root span for workflow — status (pending/running/completed/failed) |
| `WORKFLOW_STEP` | Individual step — status tracking |
| `WORKFLOW_CONDITIONAL` | Condition evaluation — count, truthy indexes, selected steps |
| `WORKFLOW_PARALLEL` | Parallel branches — branch count, step IDs |
| `WORKFLOW_LOOP` | Loop execution — type (foreach/dowhile/dountil), iteration count |
| `WORKFLOW_SLEEP` | Sleep operations — duration, type |
| `WORKFLOW_WAIT_EVENT` | Suspend/resume — event name, timeout, whether event was received, wait duration |
| `PROCESSOR_RUN` | Input/output processor execution |
| `GENERIC` | Custom operations |

### Token Usage Detail

`ModelGenerationAttributes.usage` provides:

```typescript
interface UsageStats {
  inputTokens?: number;       // total input
  outputTokens?: number;      // total output
  inputDetails?: {
    text?: number;             // non-cached text tokens
    cacheRead?: number;        // cache hit tokens
    cacheWrite?: number;       // cache creation (Anthropic)
    audio?: number;
    image?: number;
  };
  outputDetails?: {
    text?: number;
    reasoning?: number;        // thinking tokens (Claude, o1)
    audio?: number;
    image?: number;
  };
}
```

### Span Hierarchy

All spans are hierarchical with `parent`/`parentSpanId`. Each span has:
- `traceId` (32 hex chars, OTEL-compatible)
- `spanId` (16 hex chars)
- `parentSpanId` (for parent-child relationships)
- `startTime` / `endTime` (duration derived)
- `input` / `output` payloads
- `entityType` / `entityId` / `entityName`
- `tags` (root spans only, for filtering)
- `errorInfo` (on failure)

### Context Propagation

`wrapMastra()` proxy auto-injects `TracingContext` into all agent and workflow calls. No manual context threading required. The `ObservabilityContext` mixin provides `tracing`, `loggerVNext`, and `metrics` to all execution contexts (tools, steps, processors).

---

## 3. NFR Gap Analysis

| NFR | Requirement | Coverage | Notes |
|-----|------------|----------|-------|
| NFR-9 | Step name, input tokens, output tokens, latency, model used | **Fully auto-captured** | `ModelGenerationAttributes` includes all of this plus cache/reasoning token breakdown, provider, finish reason |
| NFR-10 | Step name, status (pending/running/paused/complete/failed), duration | **Fully auto-captured** | `WorkflowStepAttributes.status` + `startTime`/`endTime` on every span |
| NFR-12 | Persistence operation logging (key, operation, payload size) | **Needs verification** | Storage operations go through `PostgresStore` — unclear if auto-traced. Spike did not verify. May need manual spans for storage reads/writes. |

---

## 4. Programmatic Trace Querying

`mastra.getTrace(traceId)` returns a `RecordedTrace`:

```typescript
interface RecordedTrace {
  readonly traceId: string;
  readonly rootSpan: AnyRecordedSpan;          // tree traversal entry point
  readonly spans: ReadonlyArray<AnyRecordedSpan>;  // flat array for iteration
  getSpan(spanId: string): AnyRecordedSpan | null;
  addScore(score: ScoreInput): void;           // post-hoc annotation
  addFeedback(feedback: FeedbackInput): void;
}
```

`RecordedSpan` has `parent`, `children`, `addScore()`, `addFeedback()` — full tree navigation and annotation. No raw SQL needed for trace querying.

---

## 5. OTEL Export (Former Epic 7)

### Architecture

The `ObservabilityInstanceConfig` supports both exporters and a bridge:

- **`OtelExporter`** (`@mastra/otel-exporter`): Converts Mastra spans to OTEL spans, exports via OTLP HTTP/protobuf/gRPC or Zipkin. Supports provider presets and custom endpoints.
- **`OtelBridge`** (`@mastra/otel-bridge`): Creates real OTEL spans in parallel with Mastra spans. Enables bidirectional context — OTEL-instrumented code (HTTP clients, DB queries) inside Mastra agents gets properly nested in the trace tree.

### Target: Grafana LGTM Stack

Decision: Use `grafana/otel-lgtm` Docker image (Loki + Grafana + Tempo + Mimir) as the external observability backend. Single container, zero config, full OTEL collector built in.

**Configuration needed:**

```typescript
import { OtelExporter } from '@mastra/otel-exporter';
import { OtelBridge } from '@mastra/otel-bridge';

// In Observability config:
exporters: [
  new DefaultExporter(),   // Studio traces (Postgres)
  new OtelExporter({       // Grafana traces (OTLP)
    provider: {
      custom: {
        endpoint: process.env.OTEL_EXPORTER_OTLP_ENDPOINT || 'http://localhost:4318',
        protocol: 'http/protobuf',
      },
    },
  }),
],
bridge: new OtelBridge(),  // bidirectional context propagation
```

**Docker Compose addition:**

```yaml
lgtm:
  image: grafana/otel-lgtm:latest
  ports:
    - "3100:3100"   # Loki
    - "4317:4317"   # OTLP gRPC
    - "4318:4318"   # OTLP HTTP
    - "3000:3000"   # Grafana UI
```

Grafana UI at `http://localhost:3000`, traces in Explore > Tempo.

---

## 6. Scope Decisions

### Epic 6 Scope: "Turn on + verify + Grafana"

Epic 6 is verification and configuration, not instrumentation from scratch. The observability engine is fully built into Mastra — we just need to activate it, verify NFR coverage, and wire up the Grafana stack.

### Epic 7 Absorbed Into Epic 6

OTEL export is config-level work, not a separate epic. The `@mastra/otel-exporter` and `@mastra/otel-bridge` packages exist and are straightforward to configure. This becomes a single story within Epic 6.

### Proposed Story Breakdown

| Story | Title | Scope |
|-------|-------|-------|
| 6.1 | ~~[Spike] Observability Surface Exploration~~ | **DONE** — this document |
| 6.2 | Mastra-Native Observability Setup | Install `@mastra/observability`, wire `DefaultExporter`, verify Studio traces cover NFR-9 and NFR-10 with tests |
| 6.3 | Grafana LGTM + OTEL Export | Add `grafana/otel-lgtm` to Docker Compose, wire `OtelExporter` + `OtelBridge`, verify spans flow to Grafana Tempo |
| 6.4 | NFR-12 Gap-Fill & Trace Verification | Verify persistence operation tracing, add manual spans if needed, write integration tests for trace querying via `mastra.getTrace()` |

### Packages to Install

- `@mastra/observability` (^1.5.0) — already verified working
- `@mastra/otel-exporter` (^1.0.7) — for Story 6.3
- `@mastra/otel-bridge` (^1.0.7) — for Story 6.3

---

## 7. Risks & Open Questions

1. **NFR-12 coverage unknown** — persistence operations may not be auto-traced. Story 6.4 handles this.
2. **Studio UI capabilities** — data model supports filtering by trace/time/tags, but Studio UI quality is unverified. Not a blocker — Grafana covers advanced querying.
3. **Span volume in dev** — full tracing with `MODEL_CHUNK` spans could be noisy. May want `includeInternalSpans: false` (default) and consider `SamplingStrategy` for production.
