import { Mastra } from '@mastra/core';
import { createLogger } from '@mastra/core/logger';
import { Observability, DefaultExporter } from '@mastra/observability';
import { OtelExporter } from '@mastra/otel-exporter';
import { OtelBridge } from '@mastra/otel-bridge';
import { PostgresStore } from '@mastra/pg';
import { researcher } from './agents/researcher';
import { architect } from './agents/talk-architect';
import { writer } from './agents/writer';
import { designer } from './agents/designer';
import { slidewreck } from './workflows/slidewreck';
import { pgVector } from './config/database';
import { hookStrengthScorer } from './scorers/hook-strength';
import { narrativeCoherenceScorer } from './scorers/narrative-coherence';
import { pacingDistributionScorer } from './scorers/pacing-distribution';
import { jargonDensityScorer } from './scorers/jargon-density';

type LogLevel = 'debug' | 'info' | 'warn' | 'error' | 'silent';

const LOG_LEVEL_MAP: Record<string, LogLevel> = {
  debug: 'debug',
  info: 'info',
  warn: 'warn',
  error: 'error',
  none: 'silent',
};

export function parseLogLevel(value: string | undefined): LogLevel {
  if (!value) return 'debug';
  return LOG_LEVEL_MAP[value.toLowerCase()] ?? 'debug';
}

export const mastra = new Mastra({
  storage: new PostgresStore({
    id: 'slidewreck-storage',
    connectionString: process.env.DATABASE_URL,
  }),
  logger: createLogger({
    name: 'slidewreck',
    level: parseLogLevel(process.env.LOG_LEVEL),
  }),
  observability: new Observability({
    configs: {
      default: {
        serviceName: 'slidewreck',
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
      },
    },
  }),
  agents: { researcher, architect, writer, designer },
  workflows: { slidewreck },
  vectors: { pgVector },
  scorers: {
    'hook-strength': hookStrengthScorer,
    'narrative-coherence': narrativeCoherenceScorer,
    'pacing-distribution': pacingDistributionScorer,
    'jargon-density': jargonDensityScorer,
  },
});
