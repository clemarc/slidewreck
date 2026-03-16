/**
 * Truncate Mastra database tables and/or vector indexes.
 *
 * Usage:
 *   pnpm db:reset          — truncate everything (tables + vectors)
 *   pnpm db:reset:tables   — truncate only Mastra storage tables
 *   pnpm db:reset:vectors  — truncate only PgVector indexes
 */
import pg from 'pg';

const DATABASE_URL =
  process.env.DATABASE_URL ??
  'postgresql://postgres:postgres@localhost:5432/slidewreck';

const MASTRA_TABLES = [
  'mastra_workflow_snapshot',
  'mastra_evals',
  'mastra_threads',
  'mastra_messages',
  'mastra_traces',
  'mastra_scorers',
  'mastra_resources',
];

const VECTOR_INDEXES = ['best_practices', 'user_references'];

type Mode = 'all' | 'tables' | 'vectors';

function getMode(): Mode {
  const arg = process.argv[2];
  if (arg === '--tables') return 'tables';
  if (arg === '--vectors') return 'vectors';
  return 'all';
}

async function run() {
  const mode = getMode();
  const client = new pg.Client({ connectionString: DATABASE_URL });
  await client.connect();

  try {
    const allTargets = [
      ...(mode === 'all' || mode === 'tables' ? MASTRA_TABLES : []),
      ...(mode === 'all' || mode === 'vectors' ? VECTOR_INDEXES : []),
    ];

    for (const table of allTargets) {
      const exists = await client.query(
        `SELECT to_regclass($1) AS oid`,
        [table],
      );
      if (!exists.rows[0]?.oid) {
        console.log(`  ${table} does not exist, skipping`);
        continue;
      }
      const { rowCount } = await client.query(
        `DELETE FROM "${table}" WHERE true`,
      );
      console.log(`  truncated ${table} (${rowCount ?? 0} rows)`);
    }

    console.log('done');
  } finally {
    await client.end();
  }
}

run().catch((err) => {
  console.error('db-reset failed:', err);
  process.exit(1);
});
