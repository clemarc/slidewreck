#!/usr/bin/env node
import { readFileSync } from 'fs';
import { runEvalSuite } from './mastra/scorers/eval-suite';

const scriptPath = process.argv[2];
if (!scriptPath) {
  console.error('Usage: pnpm eval <path-to-script.md>');
  process.exit(1);
}

const script = readFileSync(scriptPath, 'utf-8');

async function main() {
  const scorecard = await runEvalSuite(script);
  console.log(JSON.stringify(scorecard, null, 2));
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
