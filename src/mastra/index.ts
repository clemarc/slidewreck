import { Mastra } from '@mastra/core';
import { PostgresStore } from '@mastra/pg';

export const mastra = new Mastra({
  storage: new PostgresStore({
    id: 'talkforge-storage',
    connectionString: process.env.DATABASE_URL!,
  }),
  // agents and workflows registered here as they're built in later stories
});
