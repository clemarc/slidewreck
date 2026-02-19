# Quick Start Guide

Get up and running with Mastra CLI in minutes.

## Prerequisites

- **Node.js**: >=22.13.0
- **Package Manager**: npm, pnpm, yarn, or bun
- **LLM API Key**: OpenAI, Anthropic, Groq, Google, Cerebras, or Mistral

## Installation

### Option 1: Global Installation

```bash { .api }
npm install -g mastra
mastra --version
```

### Option 2: Use with npx (No Installation)

```bash { .api }
npx mastra create my-app
```

## Create Your First Project

### Interactive Mode (Recommended)

```bash { .api }
mastra create my-app
```

You'll be prompted for:
1. **Package Manager**: npm, pnpm, yarn, or bun
2. **Components**: agents, workflows, tools, scorers
3. **LLM Provider**: openai, anthropic, groq, google, cerebras, mistral
4. **API Key**: Your LLM provider API key
5. **Include Examples**: Yes/No

### Quick Start with Defaults

```bash { .api }
mastra create my-app --default
```

This creates a project with:
- Directory: `src/`
- Components: agents, workflows, tools
- LLM: OpenAI
- Examples: Included

### Custom Configuration

```bash { .api }
mastra create my-app \
  --components agents,workflows \
  --llm openai \
  --llm-api-key sk-... \
  --example \
  --dir src/
```

## Project Structure

After creation, you'll have:

```
my-app/
├── package.json              # Mastra dependency included
├── .env                      # API keys (git-ignored)
├── .gitignore               # Standard Node.js ignores
├── node_modules/            # Dependencies
└── src/
    └── mastra/
        ├── index.ts          # Main Mastra configuration
        ├── agents/           # AI agents
        │   └── example-agent.ts
        ├── workflows/        # Workflows
        │   └── example-workflow.ts
        └── tools/            # Tools
            └── example-tool.ts
```

## Start Development Server

```bash { .api }
cd my-app
npm install  # If not already installed
mastra dev
```

The development server starts on `http://localhost:4111` by default.

### Development Server Features

- **Hot Reload**: Automatic restart on file changes
- **TypeScript Support**: Native TypeScript compilation
- **Debug Mode**: Run with `--debug` flag for detailed logs
- **HTTPS**: Use `--https` flag for local HTTPS

### Custom Port/Host

```bash { .api }
PORT=8080 mastra dev
HOST=0.0.0.0 mastra dev  # Allow external connections
```

## Open Mastra Studio

In a separate terminal:

```bash { .api }
cd my-app
mastra studio
```

Studio opens on `http://localhost:3000` and provides:
- Agent testing interface
- Workflow visualization
- Tool debugging
- Log monitoring

## Verify Your Setup

### Run Linter

```bash { .api }
mastra lint
```

This checks:
- Valid Mastra configuration
- All files referenced exist
- TypeScript syntax
- Missing dependencies

### Test Your First Agent

1. Open `src/mastra/agents/example-agent.ts`
2. Modify the agent configuration
3. Save the file (dev server auto-reloads)
4. Test in Studio UI

## Add Components

### Add a Scorer

```bash { .api }
mastra scorers list           # See available scorers
mastra scorers add answer-relevancy
```

### Initialize in Existing Project

If you have an existing Node.js project:

```bash { .api }
cd existing-project
mastra init
```

Follow the same prompts as `create`.

## Environment Variables

Create or update `.env`:

```bash { .api }
# LLM API Keys
OPENAI_API_KEY=sk-...
ANTHROPIC_API_KEY=sk-ant-...
GROQ_API_KEY=gsk_...

# Optional: Database
DATABASE_URL=postgresql://user:pass@localhost:5432/mastra

# Optional: Disable telemetry
MASTRA_TELEMETRY_DISABLED=1
```

## Build for Production

```bash { .api }
mastra build
```

Build output in `.mastra/output/`:
- `index.js`: Bundled server (~1-2MB)
- `package.json`: Runtime dependencies
- Source maps included

### Build with Studio UI

```bash { .api }
mastra build --studio
```

Adds Studio UI to build (~6-12MB total).

## Run Production Server

```bash { .api }
mastra start
```

Or with custom environment:

```bash { .api }
mastra start --env .env.production
```

## Common Issues

### Port Already in Use

```bash { .api }
# Solution 1: Use different port
PORT=8080 mastra dev

# Solution 2: Kill process
lsof -ti:4111 | xargs kill -9
```

### Node.js Version Too Old

```bash { .api }
# Check version
node --version

# Upgrade with nvm
nvm install 22
nvm use 22
```

### Missing API Key

```bash { .api }
# Add to .env file
echo "OPENAI_API_KEY=sk-..." >> .env
```

### Package Installation Timeout

```bash { .api }
# Increase timeout (milliseconds)
mastra create my-app --timeout 120000
```

## Next Steps

1. **Explore Examples**: Check the example code in your project
2. **Read Guides**: 
   - [Development Workflow](./development-workflow.md)
   - [Production Deployment](./production-deployment.md)
3. **Check Reference**: [CLI Commands](../reference/cli-commands.md)
4. **Try Examples**: [Real-World Scenarios](../examples/real-world-scenarios.md)

## Quick Reference

```bash { .api }
# Create
mastra create my-app
mastra create my-app --default
mastra init

# Develop
mastra dev
mastra dev --https
mastra dev --debug
mastra studio

# Validate
mastra lint

# Build
mastra build
mastra build --studio

# Run
mastra start

# Scorers
mastra scorers list
mastra scorers add <name>

# Help
mastra --help
mastra <command> --help
```

## Telemetry

Mastra collects optional usage analytics via PostHog.

**Disable:**

```bash { .api }
export MASTRA_TELEMETRY_DISABLED=1
```

Or add to `.env`:

```bash { .api }
MASTRA_TELEMETRY_DISABLED=1
```

## Getting Help

- Run `mastra --help` for command overview
- Run `mastra <command> --help` for command-specific help
- Check [error handling guide](../examples/error-handling.md) for common issues
- Review [examples](../examples/real-world-scenarios.md) for usage patterns
