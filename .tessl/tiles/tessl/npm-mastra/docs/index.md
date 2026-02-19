# Mastra CLI

Mastra CLI is a command-line tool for creating, developing, and deploying AI-powered applications built with the Mastra framework.

## Package Information

- **Package Name**: mastra
- **Package Type**: npm
- **Language**: TypeScript
- **Installation**: `npm install -g mastra` or use with `npx mastra`
- **Binary**: `mastra`
- **Node.js Requirement**: >=22.13.0

## Quick Start

```bash { .api }
# Install globally
npm install -g mastra

# Create new project
mastra create my-app

# Start development
cd my-app
mastra dev
```

**→ [Complete Quick Start Guide](./guides/quick-start.md)**

## Core Commands

| Command | Purpose | Key Options |
|---------|---------|-------------|
| `create [name]` | Create new project | `--default`, `--components`, `--llm` |
| `init` | Initialize in existing project | `--components`, `--llm` |
| `dev` | Start development server | `--https`, `--inspect`, `--debug` |
| `build` | Build for production | `--studio`, `--debug` |
| `start` | Run production server | `--env` |
| `studio` | Launch Mastra Studio UI | `--port`, `--server-host` |
| `lint` | Validate configuration | `--dir` |
| `migrate` | Run database migrations | `--yes`, `--env` |
| `scorers add` | Add evaluation scorer | `[scorer-name]` |
| `scorers list` | List available scorers | - |

**→ [Complete CLI Commands Reference](./reference/cli-commands.md)**

## Component Types

```typescript { .api }
type Component = 'agents' | 'workflows' | 'tools' | 'scorers';
type LLMProvider = 'openai' | 'anthropic' | 'groq' | 'google' | 'cerebras' | 'mistral';
```

- **agents**: Autonomous AI agents with tool calling
- **workflows**: Multi-step orchestration with branching
- **tools**: Utility functions for agents/workflows
- **scorers**: Evaluation metrics for AI outputs

**→ [Complete Type Definitions](./reference/cli-option-types.md)**

## Key Features

- **Project Scaffolding**: Interactive project creation with templates
- **Hot Reload Development**: Fast development with automatic restart
- **Production Builds**: Optimized bundling with optional Studio UI
- **Configuration Linting**: Validate setup and catch issues
- **Database Migrations**: Automated schema management
- **Scorer Management**: Built-in evaluation metrics
- **Package Manager Agnostic**: Auto-detection for npm/pnpm/yarn/bun
- **MCP Integration**: Model Context Protocol for code editors
- **Optional Telemetry**: PostHog analytics (can be disabled)

## Programmatic Usage

⚠️ **Important**: Main entry point triggers CLI. Use alternate entry points:

```typescript { .api }
// Safe imports - don't trigger CLI
import { PosthogAnalytics, getAnalytics, setAnalytics } from "mastra/analytics";
import { create } from "mastra/dist/commands/create/create";

// Create project programmatically
await create({
  projectName: "my-app",
  components: ["agents", "workflows"],
  llmProvider: "openai",
  addExample: true
});
```

**→ [Programmatic API Reference](./reference/alternate-entry-points.md)**

## Configuration

### Essential Environment Variables

```bash { .api }
# Disable telemetry
MASTRA_TELEMETRY_DISABLED=1

# Server configuration
PORT=4111                    # Default server port
HOST=localhost               # Default server host

# Database
DATABASE_URL=postgresql://user:pass@host:port/db

# Debug logging
DEBUG=1                      # Enable CLI debug logs
MASTRA_DEBUG=1              # Enable Mastra debug logs
```

**→ [Complete Configuration Reference](./reference/configuration.md)**

## Common Workflows

### Create New Project

```bash { .api }
# Interactive (recommended)
mastra create

# With options
mastra create my-app --default
mastra create my-app --components agents,workflows --llm openai
```

### Development Loop

```bash { .api }
cd my-app
npm install
mastra dev              # Start dev server
mastra studio           # Open Studio UI (different terminal)
mastra lint             # Check configuration
```

### Production Deployment

```bash { .api }
mastra build --studio   # Build with UI
mastra start            # Run production server
```

### Add Scorers

```bash { .api }
mastra scorers list     # See available scorers
mastra scorers add answer-relevancy
```

## Exit Codes

```typescript { .api }
0   // Success
1   // Error (validation failure, runtime error)
130 // Interrupted (Ctrl+C)
```

## Quick Error Reference

| Error | Solution |
|-------|----------|
| "Port already in use" | `PORT=8080 mastra dev` or kill process |
| "Node.js version required" | Upgrade to Node.js >=22.13.0 |
| "Directory already exists" | Choose different name or remove directory |
| "Invalid component" | Use plural: agents, workflows, tools, scorers |
| "No mastra configuration" | Run `mastra init` or use `--dir` flag |
| "DATABASE_URL not set" | Set in .env or environment |

**→ [Complete Error Reference & Troubleshooting](./examples/error-handling.md)**

## File Structure

### Created by `mastra create`

```typescript { .api }
my-app/
  ├── package.json              # With mastra dependency
  ├── .env                      # LLM API keys (if provided)
  ├── .gitignore               # Standard Node.js ignores
  └── src/                      # Source directory (configurable)
      └── mastra/               # Mastra configuration
          ├── index.ts          # Main entry point
          ├── agents/           # AI agents (if selected)
          ├── workflows/        # Workflows (if selected)
          ├── tools/            # Tools (if selected)
          └── scorers/          # Scorers (if selected)
```

### Created by `mastra build`

```typescript { .api }
.mastra/
  └── output/                   # Production build
      ├── index.js              # Bundled server
      ├── package.json          # Runtime dependencies
      └── studio/               # Studio UI (if --studio flag)
```

## Validation Rules

### Project Names

```typescript { .api }
// Valid
"my-app"
"my_app"
"@scope/my-app"

// Invalid
"my app"         // No spaces
".hidden"        // Can't start with .
"node_modules"   // Reserved name
```

### Components

```typescript { .api }
// Valid
"agents,workflows,tools"
"scorers"

// Invalid
"agent"          // Must be plural
"workflow"       // Must be plural
```

## Integration Patterns

### CI/CD Pipeline

```bash { .api }
export MASTRA_TELEMETRY_DISABLED=1
export CI=1
npm install
mastra lint
mastra migrate --yes
mastra build --studio
```

### Docker Container

```dockerfile { .api }
FROM node:22.13.0-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
ENV MASTRA_TELEMETRY_DISABLED=1
RUN npx mastra build --studio
ENV PORT=4111
ENV HOST=0.0.0.0
CMD ["npx", "mastra", "start"]
```

**→ [Complete Integration Examples](./examples/real-world-scenarios.md)**

## Auto-Detection

### Package Manager

```typescript { .api }
// Detection priority
package-lock.json → npm
pnpm-lock.yaml → pnpm
yarn.lock → yarn
bun.lockb → bun
```

### Mastra Directory

```typescript { .api }
// Search order
src/mastra/ → src/ → lib/mastra/ → mastra/ → .
```

## Performance Characteristics

- **Build Time**: ~10-30 seconds (typical project)
- **Bundle Size**: 1-2MB (without Studio), 6-12MB (with Studio)
- **Hot Reload**: < 1 second for typical changes
- **Installation Timeout**: 60 seconds (configurable with `--timeout`)

## Resources

### Guides
- [Quick Start Guide](./guides/quick-start.md) - Get started in minutes
- [Development Workflow](./guides/development-workflow.md) - Day-to-day development
- [Production Deployment](./guides/production-deployment.md) - Deploy to production
- [Testing Strategies](./guides/testing.md) - Test your Mastra applications

### Examples
- [Real-World Scenarios](./examples/real-world-scenarios.md) - Complete usage examples
- [Error Handling](./examples/error-handling.md) - Common errors and solutions
- [Edge Cases](./examples/edge-cases.md) - Advanced scenarios

### Reference
- [CLI Commands](./reference/cli-commands.md) - Complete command reference
- [Programmatic API](./reference/alternate-entry-points.md) - Use Mastra programmatically
- [Type Definitions](./reference/cli-option-types.md) - TypeScript types
- [Configuration](./reference/configuration.md) - Environment variables and config files

## Version Information

**Current Version**: 1.0.1

**Node.js Compatibility**: >=22.13.0

**Package Manager Compatibility**:
- npm >=7.0.0
- pnpm >=8.0.0
- yarn >=1.22.0
- bun >=1.0.0

## Support

- **Issues**: Report via GitHub issues
- **Telemetry**: Optional PostHog analytics (disable with `MASTRA_TELEMETRY_DISABLED=1`)
- **License**: Check package.json for license information

---

**Quick Links**:
- [Quick Start](./guides/quick-start.md) | [CLI Reference](./reference/cli-commands.md) | [Examples](./examples/real-world-scenarios.md) | [Configuration](./reference/configuration.md)
