# Testing Strategies Guide

Comprehensive testing approaches for Mastra applications.

## Testing Programmatic Usage

### Unit Testing the Create Function

```typescript { .api }
import { create } from "mastra/dist/commands/create/create";
import { describe, it, beforeEach, afterEach } from "node:test";
import assert from "node:assert";
import { existsSync, rmSync } from "fs";

describe("Mastra Project Creation", () => {
  const testProjectName = "test-project";

  beforeEach(() => {
    // Disable telemetry for tests
    process.env.MASTRA_TELEMETRY_DISABLED = "1";
  });

  afterEach(() => {
    // Cleanup created project
    if (existsSync(testProjectName)) {
      rmSync(testProjectName, { recursive: true, force: true });
    }
  });

  it("should create project with defaults", async () => {
    await create({
      projectName: testProjectName,
      components: ["agents"],
      llmProvider: "openai",
      addExample: false
    });

    // Assert project structure
    assert.ok(existsSync(`${testProjectName}/package.json`));
    assert.ok(existsSync(`${testProjectName}/src/mastra`));
    assert.ok(existsSync(`${testProjectName}/src/mastra/agents`));
  });

  it("should create multiple components", async () => {
    await create({
      projectName: testProjectName,
      components: ["agents", "workflows", "tools"],
      llmProvider: "openai",
      addExample: true
    });

    assert.ok(existsSync(`${testProjectName}/src/mastra/agents`));
    assert.ok(existsSync(`${testProjectName}/src/mastra/workflows`));
    assert.ok(existsSync(`${testProjectName}/src/mastra/tools`));
  });

  it("should fail if directory exists", async () => {
    // Create directory first
    await create({
      projectName: testProjectName,
      components: ["agents"],
      llmProvider: "openai"
    });

    // Try to create again
    await assert.rejects(
      async () => {
        await create({
          projectName: testProjectName,
          components: ["agents"],
          llmProvider: "openai"
        });
      },
      {
        message: /already exists/
      }
    );
  });
});
```

### Testing Analytics

```typescript { .api }
import { PosthogAnalytics, setAnalytics, getAnalytics } from "mastra/analytics";
import { describe, it, beforeEach, afterEach } from "node:test";
import assert from "node:assert";

describe("Analytics Module", () => {
  let analytics: PosthogAnalytics;

  beforeEach(() => {
    analytics = new PosthogAnalytics({
      version: "1.0.1",
      apiKey: "test-key",
      host: "https://test.posthog.com"
    });
    setAnalytics(analytics);
  });

  afterEach(async () => {
    await analytics.shutdown();
  });

  it("should track events", () => {
    // This is fire-and-forget, so just verify it doesn't throw
    assert.doesNotThrow(() => {
      analytics.trackEvent("test_event", { prop: "value" });
    });
  });

  it("should track commands", () => {
    assert.doesNotThrow(() => {
      analytics.trackCommand({
        command: "test",
        args: { flag: true },
        status: "success"
      });
    });
  });

  it("should get global analytics instance", () => {
    const instance = getAnalytics();
    assert.ok(instance instanceof PosthogAnalytics);
  });

  it("should track command execution", async () => {
    const result = await analytics.trackCommandExecution({
      command: "test",
      args: {},
      execution: async () => {
        return "success";
      }
    });

    assert.strictEqual(result, "success");
  });
});
```

## Testing CLI Commands

### Integration Testing with Shell Scripts

```bash { .api }
#!/bin/bash
# test-cli.sh

set -e

export MASTRA_TELEMETRY_DISABLED=1
TEST_DIR="/tmp/mastra-test-$$"

# Cleanup function
cleanup() {
  rm -rf "$TEST_DIR"
}
trap cleanup EXIT

# Test: Create command
echo "Testing mastra create..."
mastra create test-app \
  --dir "$TEST_DIR" \
  --components agents \
  --llm openai \
  --no-example

# Verify structure
test -f "$TEST_DIR/package.json" || exit 1
test -d "$TEST_DIR/src/mastra" || exit 1

# Test: Lint command
echo "Testing mastra lint..."
cd "$TEST_DIR"
mastra lint || exit 1

# Test: Build command
echo "Testing mastra build..."
mastra build --debug || exit 1
test -f ".mastra/output/index.js" || exit 1

echo "All tests passed!"
```

### Testing with Docker

```dockerfile { .api }
# Dockerfile.test
FROM node:22.13.0-alpine

WORKDIR /app

# Install mastra
RUN npm install -g mastra

# Copy test script
COPY test-cli.sh .
RUN chmod +x test-cli.sh

# Run tests
CMD ["./test-cli.sh"]
```

```bash { .api }
# Run tests in Docker
docker build -f Dockerfile.test -t mastra-test .
docker run --rm mastra-test
```

## Testing Agents and Workflows

### Mock Testing

```typescript { .api }
import { Agent } from '@mastra/core';
import { describe, it, mock } from "node:test";
import assert from "node:assert";

describe("Agent Testing", () => {
  it("should execute agent with mock LLM", async () => {
    // Mock LLM response
    const mockLLM = {
      generate: mock.fn(async (prompt) => {
        return "Mock response";
      })
    };

    const agent = new Agent({
      name: "test-agent",
      llm: mockLLM as any,
      description: "Test agent"
    });

    const result = await agent.run("test input");
    
    assert.ok(mockLLM.generate.mock.calls.length > 0);
    assert.strictEqual(result, "Mock response");
  });
});
```

### Integration Testing with Studio

1. Start dev server:
   ```bash { .api }
   mastra dev
   ```

2. Open Studio:
   ```bash { .api }
   mastra studio
   ```

3. Test agents interactively:
   - Input test data
   - Verify outputs
   - Check tool calls
   - Review logs

### End-to-End Testing

```typescript { .api }
import { describe, it, before, after } from "node:test";
import assert from "node:assert";
import { spawn } from "child_process";
import fetch from "node-fetch";

describe("E2E: Mastra Server", () => {
  let serverProcess: any;
  const PORT = 4111;

  before(async () => {
    // Start server
    serverProcess = spawn("npx", ["mastra", "dev"], {
      env: {
        ...process.env,
        PORT: String(PORT),
        MASTRA_TELEMETRY_DISABLED: "1"
      }
    });

    // Wait for server to start
    await new Promise(resolve => setTimeout(resolve, 5000));
  });

  after(() => {
    // Stop server
    serverProcess.kill();
  });

  it("should respond to health check", async () => {
    const response = await fetch(`http://localhost:${PORT}/health`);
    assert.strictEqual(response.status, 200);
  });

  it("should execute agent", async () => {
    const response = await fetch(`http://localhost:${PORT}/api/agents/test-agent`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ input: "test" })
    });

    assert.strictEqual(response.status, 200);
    const data = await response.json();
    assert.ok(data.output);
  });
});
```

## Testing Scorers

### Unit Testing Code-Based Scorers

```typescript { .api }
import { Scorer } from '@mastra/core';
import { describe, it } from "node:test";
import assert from "node:assert";

describe("Keyword Coverage Scorer", () => {
  const scorer = new Scorer({
    name: "keyword-coverage",
    type: "code",
    evaluate: async (input, output, context) => {
      const keywords = context.requiredKeywords || [];
      const outputLower = output.toLowerCase();
      
      const covered = keywords.filter(k => 
        outputLower.includes(k.toLowerCase())
      );
      
      const score = keywords.length > 0 
        ? covered.length / keywords.length 
        : 1;
      
      return {
        score,
        passed: score >= 0.8,
        details: {
          total: keywords.length,
          covered: covered.length,
          missing: keywords.filter(k => !covered.includes(k))
        }
      };
    }
  });

  it("should score full coverage as 1.0", async () => {
    const result = await scorer.evaluate(
      "input",
      "output contains foo and bar",
      { requiredKeywords: ["foo", "bar"] }
    );

    assert.strictEqual(result.score, 1.0);
    assert.strictEqual(result.passed, true);
  });

  it("should score partial coverage correctly", async () => {
    const result = await scorer.evaluate(
      "input",
      "output contains foo only",
      { requiredKeywords: ["foo", "bar", "baz"] }
    );

    assert.strictEqual(result.score, 1/3);
    assert.strictEqual(result.passed, false);
    assert.strictEqual(result.details.missing.length, 2);
  });
});
```

### Testing LLM-Based Scorers

```typescript { .api }
import { describe, it, mock } from "node:test";
import assert from "node:assert";

describe("LLM Scorer", () => {
  it("should evaluate with mock LLM", async () => {
    const mockLLM = {
      generate: mock.fn(async () => {
        return JSON.stringify({
          score: 0.9,
          reasoning: "High quality response"
        });
      })
    };

    // Test scorer implementation with mock
    const result = await evaluateWithLLM(mockLLM, "input", "output");
    
    assert.ok(result.score >= 0 && result.score <= 1);
    assert.ok(result.reasoning);
  });
});
```

## Performance Testing

### Load Testing with k6

```javascript { .api }
// load-test.js
import http from 'k6/http';
import { check, sleep } from 'k6';

export let options = {
  stages: [
    { duration: '30s', target: 20 },  // Ramp up
    { duration: '1m', target: 50 },   // Stay at peak
    { duration: '30s', target: 0 },   // Ramp down
  ],
};

export default function () {
  const payload = JSON.stringify({
    input: 'test input'
  });

  const params = {
    headers: {
      'Content-Type': 'application/json',
    },
  };

  const res = http.post('http://localhost:4111/api/agents/my-agent', payload, params);
  
  check(res, {
    'status is 200': (r) => r.status === 200,
    'response time < 500ms': (r) => r.timings.duration < 500,
  });

  sleep(1);
}
```

```bash { .api }
# Run load test
k6 run load-test.js
```

### Memory Profiling

```bash { .api }
# Start with heap profiler
node --inspect --heap-prof npx mastra start

# Or use clinic.js
npm install -g clinic
clinic doctor -- npx mastra start
```

## CI/CD Testing

### GitHub Actions

```yaml { .api }
name: Test

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    
    steps:
      - uses: actions/checkout@v3
      
      - uses: actions/setup-node@v3
        with:
          node-version: '22.13.0'
      
      - name: Install dependencies
        run: npm ci
      
      - name: Run linter
        run: npx mastra lint
      
      - name: Run unit tests
        run: npm test
      
      - name: Build
        run: npx mastra build --debug
        env:
          MASTRA_TELEMETRY_DISABLED: 1
      
      - name: Run E2E tests
        run: npm run test:e2e
        env:
          MASTRA_TELEMETRY_DISABLED: 1
```

## Test Coverage

### Istanbul/NYC

```bash { .api }
# Install
npm install --save-dev nyc

# Run with coverage
nyc npm test

# Generate report
nyc report --reporter=html
```

### Coverage Configuration

```json { .api }
// package.json
{
  "nyc": {
    "include": ["src/**/*.ts"],
    "exclude": ["**/*.test.ts", "**/*.spec.ts"],
    "extension": [".ts"],
    "require": ["ts-node/register"],
    "reporter": ["text", "html"],
    "all": true
  }
}
```

## Debugging Tests

### Node.js Inspector

```bash { .api }
# Run tests with inspector
node --inspect-brk node_modules/.bin/mocha test/**/*.test.ts
```

### VSCode Debug Configuration

```json { .api }
// .vscode/launch.json
{
  "version": "0.2.0",
  "configurations": [
    {
      "type": "node",
      "request": "launch",
      "name": "Run Tests",
      "program": "${workspaceFolder}/node_modules/.bin/mocha",
      "args": ["--require", "ts-node/register", "test/**/*.test.ts"],
      "console": "integratedTerminal",
      "internalConsoleOptions": "neverOpen"
    }
  ]
}
```

## Best Practices

### 1. Disable Telemetry in Tests

```typescript { .api }
beforeEach(() => {
  process.env.MASTRA_TELEMETRY_DISABLED = "1";
});
```

### 2. Clean Up Resources

```typescript { .api }
afterEach(async () => {
  // Close connections
  await db.close();
  
  // Remove test files
  rmSync(testDir, { recursive: true, force: true });
  
  // Shutdown analytics
  await analytics?.shutdown();
});
```

### 3. Use Fixtures

```typescript { .api }
// fixtures/sample-data.ts
export const testAgent = {
  name: "test-agent",
  description: "Test agent for unit tests",
  llm: { provider: "openai", model: "gpt-4o" }
};

// In tests
import { testAgent } from "./fixtures/sample-data";
```

### 4. Mock External Dependencies

```typescript { .api }
import { mock } from "node:test";

const mockFetch = mock.fn(async () => ({
  ok: true,
  json: async () => ({ result: "success" })
}));

global.fetch = mockFetch as any;
```

### 5. Test Error Cases

```typescript { .api }
it("should handle missing API key", async () => {
  delete process.env.OPENAI_API_KEY;
  
  await assert.rejects(
    async () => await agent.run("input"),
    { message: /API key not set/ }
  );
});
```

## Continuous Testing

### Watch Mode

```bash { .api }
# Run tests in watch mode
npm test -- --watch

# Or with nodemon
nodemon --exec "npm test" --watch src --watch test
```

### Pre-commit Hooks

```bash { .api }
# .husky/pre-commit
#!/bin/sh
npm test || exit 1
mastra lint || exit 1
```

## Next Steps

- **Development**: [Development Workflow](./development-workflow.md)
- **Production**: [Production Deployment](./production-deployment.md)
- **Examples**: [Real-World Scenarios](../examples/real-world-scenarios.md)
- **Reference**: [CLI Commands](../reference/cli-commands.md)
