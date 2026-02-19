# Development Workflow Guide

Best practices for day-to-day development with Mastra CLI.

## Development Environment Setup

### 1. Start Development Server

```bash { .api }
mastra dev
```

**Features:**
- Hot reload on file changes
- Automatic restart on config changes
- Source map support
- Incremental compilation

### 2. Enable Debug Mode

```bash { .api }
DEBUG=1 MASTRA_DEBUG=1 mastra dev --debug
```

**Debug Outputs:**
- Configuration loading
- File watching events
- Build timing
- Bundle size
- Server lifecycle

### 3. Use HTTPS Locally

```bash { .api }
mastra dev --https
```

**Behavior:**
- Generates self-signed certificate
- Cached in `.mastra/certs/`
- Valid for 365 days
- Browser will show security warning (accept it)

### 4. Node.js Inspector

```bash { .api }
# Start with inspector
mastra dev --inspect

# Start and break at beginning
mastra dev --inspect-brk

# Custom port
mastra dev --inspect 0.0.0.0:9229
```

**Debug in:**
- Chrome DevTools: `chrome://inspect`
- VSCode: Attach to Node Process

## Working with Components

### Adding Agents

Create new agent in `src/mastra/agents/`:

```typescript { .api }
// src/mastra/agents/my-agent.ts
import { Agent } from '@mastra/core';

export const myAgent = new Agent({
  name: 'my-agent',
  description: 'Custom agent for specific task',
  llm: {
    provider: 'openai',
    model: 'gpt-4o'
  },
  tools: [/* your tools */]
});
```

**Auto-reload:** Dev server detects change and restarts.

### Adding Workflows

Create workflow in `src/mastra/workflows/`:

```typescript { .api }
// src/mastra/workflows/my-workflow.ts
import { Workflow } from '@mastra/core';

export const myWorkflow = new Workflow({
  name: 'my-workflow',
  steps: [
    // Define workflow steps
  ]
});
```

### Adding Tools

Create tool in `src/mastra/tools/` or external directory:

```typescript { .api }
// src/tools/custom-tool.ts
import { Tool } from '@mastra/core';

export const customTool = new Tool({
  name: 'custom-tool',
  description: 'Performs specific operation',
  schema: {
    /* input schema */
  },
  execute: async (input) => {
    // Tool logic
  }
});
```

**Include external tools:**

```bash { .api }
mastra dev --tools src/tools
```

### Adding Scorers

```bash { .api }
# List available scorers
mastra scorers list

# Add scorer
mastra scorers add answer-relevancy

# Creates: src/mastra/scorers/answer-relevancy.ts
```

## Testing During Development

### Using Mastra Studio

```bash { .api }
# Terminal 1: Dev server
mastra dev

# Terminal 2: Studio UI
mastra studio
```

**Studio Features:**
- Test agents with live input
- Visualize workflow execution
- Debug tool calls
- View logs in real-time
- Test scorers

### Manual Testing with curl

```bash { .api }
# Test agent endpoint
curl http://localhost:4111/api/agents/my-agent \
  -H "Content-Type: application/json" \
  -d '{"input": "test input"}'

# Test workflow
curl http://localhost:4111/api/workflows/my-workflow \
  -H "Content-Type: application/json" \
  -d '{"data": {}}'
```

## Configuration Management

### Environment Files

Use different env files for different contexts:

```bash { .api }
# Development
mastra dev --env .env.development

# Local testing
mastra dev --env .env.local

# Staging
mastra dev --env .env.staging
```

### Environment Variables

```bash { .api }
# .env.development
DATABASE_URL=postgresql://localhost:5432/mastra_dev
OPENAI_API_KEY=sk-...
DEBUG=1
MASTRA_DEBUG=1

# .env.local
DATABASE_URL=postgresql://localhost:5432/mastra_local
OPENAI_API_KEY=sk-test-...
MASTRA_TELEMETRY_DISABLED=1
```

### Custom Directory Structure

```bash { .api }
mastra dev \
  --dir src/mastra \
  --root . \
  --tools src/tools,lib/tools
```

## Linting and Validation

### Run Linter Regularly

```bash { .api }
mastra lint
```

**Checks:**
- Valid Mastra configuration
- TypeScript syntax errors
- Missing dependencies
- Invalid imports
- File references

### Pre-commit Hook

```bash { .api }
# .husky/pre-commit
#!/bin/sh
mastra lint || exit 1
```

### CI/CD Validation

```yaml { .api }
# .github/workflows/validate.yml
- name: Lint
  run: npx mastra lint
```

## Database Migrations

### During Development

```bash { .api }
# Check pending migrations
mastra migrate

# Apply without confirmation
mastra migrate --yes

# With debug
mastra migrate --debug
```

### Migration Workflow

1. Modify storage schema in code
2. Run `mastra migrate`
3. Review pending migrations
4. Apply migrations
5. Dev server auto-restarts with new schema

## Hot Reload Behavior

### What Triggers Reload

- `.ts` file changes in Mastra directory
- Tool file changes (if `--tools` specified)
- `package.json` changes
- Configuration file changes

### What Doesn't Trigger Reload

- `.env` file changes (restart manually)
- `node_modules/` changes
- `.mastra/` build cache

### Reload Performance

```typescript { .api }
// Typical reload times:
// - Simple change: < 500ms
// - Complex change: 1-2 seconds
// - Full rebuild: 3-5 seconds
```

## Working with Multiple Projects

### Use Project-Specific Config

```bash { .api }
# Project A
cd project-a
mastra dev --dir src/mastra --port 4111

# Project B (different terminal)
cd project-b
mastra dev --dir lib/mastra --port 4112
```

### MCP Configuration

```bash { .api }
# Project-specific
mastra create project-a --mcp cursor

# Global (affects all projects)
mastra create project-b --mcp cursor-global
```

## Debugging Techniques

### Log Debugging

```typescript { .api }
// Add logging to agents/workflows/tools
console.log('[DEBUG]', 'Agent input:', input);
console.error('[ERROR]', 'Tool failed:', error);
```

**View logs:** Watch dev server terminal.

### Breakpoint Debugging

1. Start with inspector:
   ```bash { .api }
   mastra dev --inspect-brk
   ```

2. Open Chrome DevTools (`chrome://inspect`)

3. Set breakpoints in source

4. Step through execution

### Network Debugging

```bash { .api }
# Monitor all requests
curl -v http://localhost:4111/api/agents/my-agent \
  -H "Content-Type: application/json" \
  -d '{"input": "test"}'
```

## Performance Optimization

### Build Performance

```bash { .api }
# Profile build time
time mastra build --debug
```

### Bundle Size Analysis

```bash { .api }
# Check output size
du -sh .mastra/output
ls -lh .mastra/output/index.js
```

### Hot Reload Optimization

```bash { .api }
# Include only necessary tools
mastra dev --tools src/tools/essential.ts
```

## Troubleshooting Common Issues

### Dev Server Won't Start

```bash { .api }
# Check if port is in use
lsof -i :4111

# Try different port
PORT=8080 mastra dev

# Enable debug to see issue
DEBUG=1 mastra dev --debug
```

### Changes Not Reloading

1. Check file is in watched directory
2. Verify no syntax errors
3. Check dev server terminal for errors
4. Try manual restart

### Build Errors

```bash { .api }
# Run lint to see specific errors
mastra lint

# Check with debug
mastra build --debug
```

### Type Errors

```bash { .api }
# Ensure dependencies installed
npm install

# Check TypeScript version
npx tsc --version

# Run lint
mastra lint
```

## Best Practices

### 1. Use Version Control

```bash { .api }
# .gitignore
node_modules/
.env
.env.*
.mastra/
dist/
```

### 2. Separate Configuration

- Development: `.env.development`
- Testing: `.env.test`
- Production: `.env.production`

### 3. Regular Linting

```bash { .api }
# Before commits
mastra lint

# Before pushes
mastra lint && npm test
```

### 4. Component Organization

```
src/mastra/
├── agents/
│   ├── customer-support.ts
│   └── data-analysis.ts
├── workflows/
│   ├── onboarding.ts
│   └── processing.ts
├── tools/
│   ├── api-tools.ts
│   └── data-tools.ts
└── scorers/
    ├── quality-scorers.ts
    └── accuracy-scorers.ts
```

### 5. Use Studio for Testing

- Test agents interactively
- Visualize workflow execution
- Debug tool calls
- Monitor performance

## Next Steps

- **Production**: [Production Deployment Guide](./production-deployment.md)
- **Testing**: [Testing Strategies](./testing.md)
- **Examples**: [Real-World Scenarios](../examples/real-world-scenarios.md)
- **Reference**: [CLI Commands](../reference/cli-commands.md)
