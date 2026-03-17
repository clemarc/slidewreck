/**
 * Shared database configuration.
 * Extracted to avoid circular imports between index.ts and workflow files.
 */
import { PgVector } from '@mastra/pg';

if (!process.env.DATABASE_URL) {
  throw new Error('DATABASE_URL environment variable is required. See .env.example for defaults.');
}

export const pgVector = new PgVector({
  id: 'pg-vector',
  connectionString: process.env.DATABASE_URL,
});
