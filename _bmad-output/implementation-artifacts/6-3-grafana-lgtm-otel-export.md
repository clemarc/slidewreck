# Story 6.3: Grafana LGTM & OTEL Export

Status: done

## Story

As a developer,
I want TalkForge traces to flow into Grafana via OpenTelemetry,
So that I can visualise and query traces in Grafana Tempo alongside the Mastra Studio view.

## Acceptance Criteria

1. **Given** `docker compose up -d` starts both Postgres and LGTM containers
   **When** I navigate to `http://localhost:3000` (Grafana)
   **Then** the Grafana UI loads with Tempo as a pre-configured data source

2. **Given** the Mastra constructor has both `DefaultExporter` and `OtelExporter` configured
   **When** a full TalkForge workflow run completes
   **Then** the same trace is visible in both Mastra Studio and Grafana Tempo (Explore > Tempo)

3. **Given** a trace in Grafana Tempo
   **When** I expand the trace view
   **Then** spans show the same hierarchy as Studio: workflow run → steps → agent runs → model generations → tool calls

4. **Given** `OtelBridge` is configured
   **When** OTEL-instrumented code (e.g., HTTP requests, DB queries) executes inside a Mastra agent
   **Then** those spans are nested under the correct parent Mastra span in Grafana

## Tasks / Subtasks

- [x] Task 1: Add Grafana LGTM container to docker-compose.yml (AC: 1)
  - [x] 1.1 Add `grafana/otel-lgtm:latest` service with ports: 3100 (Loki), 4317 (OTLP gRPC), 4318 (OTLP HTTP), 3000 (Grafana UI)
  - [x] 1.2 Verify container starts alongside existing Postgres service

- [x] Task 2: Wire OtelExporter and OtelBridge in Mastra constructor (AC: 2, 3, 4)
  - [x] 2.1 Import `OtelExporter` from `@mastra/otel-exporter` and `OtelBridge` from `@mastra/otel-bridge` in `index.ts`
  - [x] 2.2 Add `OtelExporter` with custom endpoint (`OTEL_EXPORTER_OTLP_ENDPOINT` env var, default `http://localhost:4318`) and `http/protobuf` protocol to the exporters array alongside `DefaultExporter`
  - [x] 2.3 Add `OtelBridge` to the observability config for bidirectional context propagation
  - [x] 2.4 Add `OTEL_EXPORTER_OTLP_ENDPOINT` to `.env.example` with default value

- [x] Task 3: Add unit tests for OTEL export configuration (AC: 2, 3, 4)
  - [x] 3.1 Add `@mastra/otel-exporter` and `@mastra/otel-bridge` mocks to `index.test.ts`
  - [x] 3.2 Test `OtelExporter` is instantiated with correct endpoint and protocol config
  - [x] 3.3 Test `OtelBridge` is instantiated
  - [x] 3.4 Test both `DefaultExporter` and `OtelExporter` are in the exporters array
  - [x] 3.5 Test `OtelBridge` is passed as `bridge` in the observability config

## Dev Notes

### Architecture Context

- **OtelExporter** (`@mastra/otel-exporter`): Converts Mastra spans to OTEL spans, exports via OTLP HTTP/protobuf. Supports provider presets and custom endpoints.
- **OtelBridge** (`@mastra/otel-bridge`): Creates real OTEL spans in parallel with Mastra spans. Enables bidirectional context — OTEL-instrumented code inside Mastra agents gets properly nested.
- **Grafana LGTM** (`grafana/otel-lgtm`): Loki + Grafana + Tempo + Mimir all-in-one. Zero config, full OTEL collector built in.
- **Packages already installed:** `@mastra/otel-exporter` (^1.0.7) and `@mastra/otel-bridge` (^1.0.7) are in `mastra/package.json`.

### Spike-Verified Configuration

```typescript
import { OtelExporter } from '@mastra/otel-exporter';
import { OtelBridge } from '@mastra/otel-bridge';

// In Observability config:
exporters: [
  new DefaultExporter(),
  new OtelExporter({
    provider: {
      custom: {
        endpoint: process.env.OTEL_EXPORTER_OTLP_ENDPOINT || 'http://localhost:4318',
        protocol: 'http/protobuf',
      },
    },
  }),
],
bridge: new OtelBridge(),
```

### Docker Compose Addition

```yaml
lgtm:
  image: grafana/otel-lgtm:latest
  ports:
    - "3100:3100"   # Loki
    - "4317:4317"   # OTLP gRPC
    - "4318:4318"   # OTLP HTTP
    - "3000:3000"   # Grafana UI
```

### Previous Story Intelligence

- Story 6-2 added observability mock and test pattern to `index.test.ts` — extend this pattern for OTEL mocks.
- The `@mastra/observability` mock is already in place.

### Testing Strategy

- Mock `@mastra/otel-exporter` and `@mastra/otel-bridge` in `index.test.ts`
- Verify constructor args for `OtelExporter` (endpoint, protocol) and `OtelBridge`
- Verify both exporters appear in the Observability config
- Docker/Grafana verification is manual (AC 1) — not automatable in unit tests

### Project Structure Notes

- `mastra/src/mastra/index.ts` — Add OtelExporter + OtelBridge imports and wiring
- `mastra/src/mastra/__tests__/index.test.ts` — Extend with OTEL config tests
- `docker-compose.yml` — Add LGTM service
- `.env.example` — Add OTEL endpoint variable

### References

- [Source: _bmad-output/implementation-artifacts/spike-epic-6-mastra-observability.md#5] — OTEL Export section
- [Source: _bmad-output/planning-artifacts/epics.md#Story 6.3] — Epic story definition

## Dev Agent Record

### Agent Model Used

Claude Opus 4.6 (1M context)

### Debug Log References

### Completion Notes List

- Added `grafana/otel-lgtm:latest` container to docker-compose.yml with 4 port mappings
- Imported and wired `OtelExporter` (custom endpoint, http/protobuf) and `OtelBridge` in index.ts observability config
- Added `OTEL_EXPORTER_OTLP_ENDPOINT` to .env.example with default `http://localhost:4318`
- Added mocks for `@mastra/otel-exporter` and `@mastra/otel-bridge` in index.test.ts
- Added 3 new tests: OtelExporter config, OtelBridge instantiation, env var override
- Updated existing Observability test to verify both exporters + bridge in config
- All 18 tests pass, 425 total across suite (0 regressions)
- Typecheck passes cleanly

### Change Log

- 2026-03-17: Added LGTM container, OTEL exporter/bridge wiring, unit tests
- 2026-03-17: [Code Review Fix] Remapped Grafana UI port from 3000 to 3200 to avoid conflict with Next.js dev server

### File List

- `docker-compose.yml` (modified — added lgtm service)
- `mastra/src/mastra/index.ts` (modified — added OtelExporter + OtelBridge imports and config)
- `mastra/src/mastra/__tests__/index.test.ts` (modified — added OTEL mocks and tests)
- `.env.example` (modified — added OTEL_EXPORTER_OTLP_ENDPOINT)

