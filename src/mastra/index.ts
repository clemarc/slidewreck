import { Mastra } from '@mastra/core';
import { PostgresStore } from '@mastra/pg';

if (!process.env.DATABASE_URL) {
  throw new Error('DATABASE_URL environment variable is required. See .env.example for defaults.');
}

export const mastra = new Mastra({
  storage: new PostgresStore({
    id: 'talkforge-storage',
    connectionString: process.env.DATABASE_URL,
  }),
  // agents and workflows registered here as they're built in later stories
});
