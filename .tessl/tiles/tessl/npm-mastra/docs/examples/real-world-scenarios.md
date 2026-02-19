# Real-World Scenarios

Comprehensive usage examples for common Mastra CLI workflows.

## Scenario 1: Express.js Integration

### Setup

Create Mastra project programmatically from Express endpoint:

```typescript { .api }
import express from "express";
import { create } from "mastra/dist/commands/create/create";

const app = express();
app.use(express.json());

app.post("/api/create-mastra-project", async (req, res) => {
  try {
    const { projectName, components, llmProvider } = req.body;
    
    await create({
      projectName,
      components: components || ["agents", "workflows"],
      llmProvider: llmProvider || "openai",
      llmApiKey: process.env.OPENAI_API_KEY,
      addExample: true,
      analytics: null // Disable analytics
    });
    
    res.json({
      success: true,
      message: `Project ${projectName} created successfully`
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

app.listen(3000, () => {
  console.log("Server running on port 3000");
});
```

## Scenario 2: Multi-Environment Development

### Directory Structure

```
my-mastra-app/
├── .env.development      # Dev configuration
├── .env.staging          # Staging configuration
├── .env.production       # Production configuration
└── scripts/
    ├── dev.sh           # Dev script
    ├── staging.sh       # Staging script
    └── deploy.sh        # Production script
```

### Environment Files

```bash { .api }
# .env.development
NODE_ENV=development
PORT=4111
HOST=localhost
DATABASE_URL=postgresql://localhost:5432/mastra_dev
OPENAI_API_KEY=sk-dev-...
DEBUG=1
MASTRA_DEBUG=1
MASTRA_TELEMETRY_DISABLED=1

# .env.staging
NODE_ENV=staging
PORT=4111
HOST=0.0.0.0
DATABASE_URL=postgresql://staging-db:5432/mastra_staging
OPENAI_API_KEY=sk-staging-...
MASTRA_TELEMETRY_DISABLED=1

# .env.production
NODE_ENV=production
PORT=4111
HOST=0.0.0.0
DATABASE_URL=postgresql://prod-db:5432/mastra_prod
OPENAI_API_KEY=sk-prod-...
MASTRA_TELEMETRY_DISABLED=1
MASTRA_SKIP_DOTENV=1
```

### Scripts

```bash { .api }
#!/bin/bash
# scripts/dev.sh
export MASTRA_TELEMETRY_DISABLED=1
mastra dev --env .env.development --debug

#!/bin/bash
# scripts/staging.sh
export MASTRA_TELEMETRY_DISABLED=1
mastra migrate --env .env.staging --yes
mastra build --studio --debug
mastra start --env .env.staging

#!/bin/bash
# scripts/deploy.sh
export MASTRA_TELEMETRY_DISABLED=1
export CI=1

# Run migrations
mastra migrate --env .env.production --yes --debug

# Build
mastra build --studio

# Deploy to server
rsync -avz .mastra/output/ user@prod-server:/opt/mastra/
ssh user@prod-server "sudo systemctl restart mastra"
```

## Scenario 3: Monorepo Setup

### Structure

```
monorepo/
├── packages/
│   ├── api/                 # API service with Mastra
│   │   ├── src/
│   │   │   └── mastra/
│   │   └── package.json
│   ├── workers/             # Background workers with Mastra
│   │   ├── src/
│   │   │   └── mastra/
│   │   └── package.json
│   └── shared/              # Shared tools and types
│       └── src/
│           └── tools/
├── package.json             # Root package.json
└── pnpm-workspace.yaml      # PNPM workspace config
```

### Workspace Configuration

```yaml { .api }
# pnpm-workspace.yaml
packages:
  - 'packages/*'
```

### Package Setup

```bash { .api }
# Initialize API package
cd packages/api
mastra init --dir src/mastra --components agents,workflows

# Initialize workers package
cd packages/workers
mastra init --dir src/mastra --components workflows,tools

# Share tools across packages
cd packages/shared
# Create shared tools
```

### Development

```bash { .api }
# Run both services
pnpm run --parallel dev

# Or use Turborepo
turbo run dev
```

### Build All

```bash { .api }
#!/bin/bash
# build-all.sh
cd packages/api && mastra build --studio
cd ../workers && mastra build
```

## Scenario 4: Custom Analytics Integration

### Setup

```typescript { .api }
import { PosthogAnalytics, setAnalytics } from "mastra/analytics";
import { create } from "mastra/dist/commands/create/create";

// Create custom analytics instance
const customAnalytics = new PosthogAnalytics({
  version: "1.0.1",
  apiKey: process.env.CUSTOM_POSTHOG_KEY!,
  host: process.env.CUSTOM_POSTHOG_HOST!
});

// Set as global
setAnalytics(customAnalytics);

// Track custom events
customAnalytics.trackEvent("custom_project_creation_started", {
  projectType: "ai-agent",
  userId: getUserId(),
  timestamp: Date.now()
});

// Create project with custom analytics
await create({
  projectName: "my-custom-project",
  analytics: customAnalytics
});

// Track completion
customAnalytics.trackEvent("custom_project_creation_completed", {
  projectName: "my-custom-project",
  duration: getDuration()
});

// Cleanup
await customAnalytics.shutdown();
```

## Scenario 5: Automated Project Setup

### Setup Script

```bash { .api }
#!/bin/bash
# setup-mastra-project.sh

set -e

PROJECT_NAME=$1
COMPONENTS=${2:-"agents,workflows,tools"}
LLM_PROVIDER=${3:-"openai"}

if [ -z "$PROJECT_NAME" ]; then
  echo "Usage: $0 <project-name> [components] [llm-provider]"
  exit 1
fi

echo "Creating project: $PROJECT_NAME"
echo "Components: $COMPONENTS"
echo "LLM: $LLM_PROVIDER"

# Disable telemetry
export MASTRA_TELEMETRY_DISABLED=1

# Create project
mastra create "$PROJECT_NAME" \
  --components "$COMPONENTS" \
  --llm "$LLM_PROVIDER" \
  --example \
  --dir src/

# Setup additional tools
cd "$PROJECT_NAME"

# Install additional dependencies
npm install axios dotenv zod

# Setup Git
git init
git add .
git commit -m "Initial Mastra project setup"

# Create additional directories
mkdir -p tests docs scripts

# Create test script
cat > scripts/test.sh <<'EOF'
#!/bin/bash
export MASTRA_TELEMETRY_DISABLED=1
mastra lint
npm test
EOF
chmod +x scripts/test.sh

# Create dev script
cat > scripts/dev.sh <<'EOF'
#!/bin/bash
export MASTRA_TELEMETRY_DISABLED=1
mastra dev --debug
EOF
chmod +x scripts/dev.sh

echo "Project setup complete!"
echo "Next steps:"
echo "1. cd $PROJECT_NAME"
echo "2. Add API keys to .env"
echo "3. ./scripts/dev.sh"
```

### Usage

```bash { .api }
./setup-mastra-project.sh my-ai-app "agents,workflows" "anthropic"
```

## Scenario 6: Database-Backed Application

### Project Setup

```bash { .api }
# Create project
mastra create db-app --components agents,workflows,tools

cd db-app

# Add database client
npm install pg drizzle-orm
```

### Configuration

```bash { .api }
# .env
DATABASE_URL=postgresql://user:password@localhost:5432/mastra_app
OPENAI_API_KEY=sk-...
```

### Migration Workflow

```bash { .api }
# Terminal 1: Dev server
mastra dev

# Terminal 2: Apply migrations when ready
mastra migrate --yes

# View migration status
mastra migrate
```

### Production Migration

```bash { .api }
# Backup database first
pg_dump -Fc mastra_prod > backup_$(date +%Y%m%d).dump

# Apply migrations
DATABASE_URL=postgresql://prod-host/mastra_prod \
  mastra migrate --yes --debug

# Verify
psql $DATABASE_URL -c "\dt"
```

## Scenario 7: Multi-LLM Support

### Configuration

```typescript { .api }
// src/mastra/index.ts
import { Mastra } from '@mastra/core';

export const mastra = new Mastra({
  llm: {
    // Default provider
    provider: 'openai',
    model: 'gpt-4o',
    apiKey: process.env.OPENAI_API_KEY
  },
  llmProviders: {
    // Additional providers
    anthropic: {
      apiKey: process.env.ANTHROPIC_API_KEY
    },
    groq: {
      apiKey: process.env.GROQ_API_KEY
    }
  }
});

// Create agents with different providers
export const openaiAgent = new Agent({
  name: 'openai-agent',
  llm: { provider: 'openai', model: 'gpt-4o' }
});

export const anthropicAgent = new Agent({
  name: 'anthropic-agent',
  llm: { provider: 'anthropic', model: 'claude-sonnet-4-5' }
});

export const groqAgent = new Agent({
  name: 'groq-agent',
  llm: { provider: 'groq', model: 'llama-3.3-70b-versatile' }
});
```

### Environment

```bash { .api }
# .env
OPENAI_API_KEY=sk-...
ANTHROPIC_API_KEY=sk-ant-...
GROQ_API_KEY=gsk_...
```

## Scenario 8: Template-Based Projects

### Create Custom Template

```bash { .api }
# Create base project
mastra create template-base --default

cd template-base

# Customize project structure
# Add custom components, configurations, etc.

# Push to GitHub
git init
git add .
git commit -m "Custom Mastra template"
git remote add origin https://github.com/user/mastra-template
git push -u origin main
```

### Use Custom Template

```bash { .api }
# Create from URL
mastra create my-project --template https://github.com/user/mastra-template

# Or from GitHub shorthand
mastra create my-project --template user/mastra-template
```

## Scenario 9: Scorer Pipeline

### Setup

```bash { .api }
# Add multiple scorers
mastra scorers add answer-relevancy
mastra scorers add faithfulness
mastra scorers add hallucination
mastra scorers add toxicity
```

### Configuration

```typescript { .api }
// src/mastra/scorers/index.ts
import { answerRelevancy } from './answer-relevancy';
import { faithfulness } from './faithfulness';
import { hallucination } from './hallucination';
import { toxicity } from './toxicity';

export const scorerPipeline = {
  scorers: [
    answerRelevancy,
    faithfulness,
    hallucination,
    toxicity
  ],
  async evaluate(input: string, output: string, context: any) {
    const results = await Promise.all(
      this.scorers.map(scorer => scorer.evaluate(input, output, context))
    );
    
    return {
      scores: results,
      overallScore: results.reduce((sum, r) => sum + r.score, 0) / results.length,
      passed: results.every(r => r.passed)
    };
  }
};
```

## Scenario 10: Kubernetes Deployment

### Configuration

```yaml { .api }
# k8s/deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: mastra-app
spec:
  replicas: 3
  selector:
    matchLabels:
      app: mastra
  template:
    metadata:
      labels:
        app: mastra
    spec:
      containers:
      - name: mastra
        image: your-registry/mastra-app:latest
        ports:
        - containerPort: 4111
        env:
        - name: PORT
          value: "4111"
        - name: HOST
          value: "0.0.0.0"
        - name: DATABASE_URL
          valueFrom:
            secretKeyRef:
              name: mastra-secrets
              key: database-url
        - name: OPENAI_API_KEY
          valueFrom:
            secretKeyRef:
              name: mastra-secrets
              key: openai-key
        resources:
          requests:
            memory: "256Mi"
            cpu: "250m"
          limits:
            memory: "512Mi"
            cpu: "500m"
        livenessProbe:
          httpGet:
            path: /health
            port: 4111
          initialDelaySeconds: 30
          periodSeconds: 10
        readinessProbe:
          httpGet:
            path: /health
            port: 4111
          initialDelaySeconds: 5
          periodSeconds: 5
---
apiVersion: v1
kind: Service
metadata:
  name: mastra-service
spec:
  selector:
    app: mastra
  ports:
  - port: 80
    targetPort: 4111
  type: LoadBalancer
---
apiVersion: v1
kind: Secret
metadata:
  name: mastra-secrets
type: Opaque
stringData:
  database-url: "postgresql://..."
  openai-key: "sk-..."
```

### Deployment

```bash { .api }
# Build and push image
docker build -t your-registry/mastra-app:latest .
docker push your-registry/mastra-app:latest

# Apply configuration
kubectl apply -f k8s/deployment.yaml

# Check status
kubectl get pods -l app=mastra
kubectl logs -f deployment/mastra-app

# Scale
kubectl scale deployment mastra-app --replicas=5
```

## Scenario 11: CI/CD with Multiple Environments

### GitHub Actions

```yaml { .api }
# .github/workflows/deploy.yml
name: Deploy

on:
  push:
    branches: [main, staging, development]

env:
  MASTRA_TELEMETRY_DISABLED: 1

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '22.13.0'
      - run: npm ci
      - run: npm test
      - run: npx mastra lint

  deploy-dev:
    if: github.ref == 'refs/heads/development'
    needs: test
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '22.13.0'
      - run: npm ci
      - run: npx mastra build --studio
        env:
          NODE_ENV: development
      - name: Deploy to dev
        run: |
          rsync -avz .mastra/output/ dev-server:/opt/mastra/
          ssh dev-server "sudo systemctl restart mastra"

  deploy-staging:
    if: github.ref == 'refs/heads/staging'
    needs: test
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '22.13.0'
      - run: npm ci
      - run: npx mastra migrate --yes
        env:
          DATABASE_URL: ${{ secrets.STAGING_DATABASE_URL }}
      - run: npx mastra build --studio
      - name: Deploy to staging
        run: |
          rsync -avz .mastra/output/ staging-server:/opt/mastra/
          ssh staging-server "sudo systemctl restart mastra"

  deploy-prod:
    if: github.ref == 'refs/heads/main'
    needs: test
    runs-on: ubuntu-latest
    environment: production
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '22.13.0'
      - run: npm ci
      - run: npx mastra migrate --yes
        env:
          DATABASE_URL: ${{ secrets.PROD_DATABASE_URL }}
      - run: npx mastra build --studio
      - name: Deploy to production
        run: |
          rsync -avz .mastra/output/ prod-server:/opt/mastra/
          ssh prod-server "sudo systemctl restart mastra"
      - name: Verify deployment
        run: |
          curl -f https://api.example.com/health || exit 1
```

## Next Steps

- **Error Handling**: [Error Handling Guide](./error-handling.md)
- **Edge Cases**: [Edge Cases](./edge-cases.md)
- **Guides**: [Development Workflow](../guides/development-workflow.md)
- **Reference**: [CLI Commands](../reference/cli-commands.md)
