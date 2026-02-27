import { Mastra } from '@mastra/core';
import { createLogger } from '@mastra/core/logger';
import { PostgresStore, PgVector } from '@mastra/pg';
import { researcher } from './agents/researcher';
import { architect } from './agents/talk-architect';
import { writer } from './agents/writer';
import { slidewreck } from './workflows/slidewreck';

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

if (!process.env.DATABASE_URL) {
  throw new Error('DATABASE_URL environment variable is required. See .env.example for defaults.');
}

const pgVector = new PgVector({
  id: 'pg-vector',
  connectionString: process.env.DATABASE_URL,
});

export const mastra = new Mastra({
  storage: new PostgresStore({
    id: 'slidewreck-storage',
    connectionString: process.env.DATABASE_URL,
  }),
  logger: createLogger({
    name: 'slidewreck',
    level: parseLogLevel(process.env.LOG_LEVEL),
  }),
  agents: { researcher, architect, writer },
  workflows: { slidewreck },
  vectors: { pgVector },
});
