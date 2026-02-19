# Alternate Entry Points

⚠️ **Important Limitation**: The main entry point (`mastra`) executes `program.parse(process.argv)` at module level, which triggers CLI initialization on import. However, the main entry point does export select functionality that can be used programmatically.

For programmatic access without triggering CLI execution, use the specific alternate entry points documented below.

## Capabilities

### Main Entry Point Exports

The main entry point (`mastra`) exports the following for programmatic use:

**Import Path:**

```typescript { .api }
import { version, analytics, origin, PosthogAnalytics, create } from "mastra";
```

⚠️ **Note**: Importing from "mastra" will trigger CLI initialization. For safer programmatic usage, import specific modules directly:

```typescript { .api }
// Safer alternatives that don't trigger CLI
import { PosthogAnalytics, getAnalytics, setAnalytics, CLI_ORIGIN } from "mastra/analytics";
import { create } from "mastra/dist/commands/create/create";
```

**Exported Values:**

```typescript { .api }
/** CLI version string from package.json */
export const version: string;

/** Global PosthogAnalytics instance (pre-configured) */
export const analytics: PosthogAnalytics;

/** Analytics origin marker from MASTRA_ANALYTICS_ORIGIN env var */
export const origin: CLI_ORIGIN;

/** PosthogAnalytics class (also exported from mastra/analytics) */
export { PosthogAnalytics } from './analytics/index';

/** Programmatic create function (safer to import from create/create.ts) */
export { create } from './commands/create/create';
```

**Type Definitions:**

```typescript { .api }
type CLI_ORIGIN = 'mastra-cloud' | 'oss';

// Version format: semver string
// Example: "1.0.1", "1.2.3-beta.4"
const version: string;

// Pre-configured analytics instance (null if telemetry disabled)
const analytics: PosthogAnalytics | null;

// Origin determined by MASTRA_ANALYTICS_ORIGIN env var
// Defaults to 'oss' if not set
const origin: CLI_ORIGIN;
```

### Programmatic Create Function

The `create` function allows programmatic project creation without using the CLI.

**Import Path:**

```typescript { .api }
// Recommended: Direct import to avoid CLI execution
import { create } from "mastra/dist/commands/create/create";

// Alternative: From main entry (triggers CLI)
import { create } from "mastra";
```

**Function Signature:**

```typescript { .api }
/**
 * Programmatically create a new Mastra project
 * @param args - Configuration options for project creation
 * @returns Promise that resolves when project is created
 * @throws Error if project directory already exists
 * @throws Error if Node.js version is < 22.13.0
 * @throws Error if invalid component, LLM provider, or editor specified
 * @throws Error if package installation fails or times out
 */
export const create = async (args: CreateArgs): Promise<void>;

interface CreateArgs {
  /** 
   * Name of the project to create (defaults to prompted value)
   * - Must be valid npm package name
   * - Directory must not already exist
   * - Cannot be 'node_modules', 'favicon.ico', or start with '.' or '_'
   */
  projectName?: string;

  /** 
   * Components to include in the project 
   * Valid values: 'agents' | 'workflows' | 'tools' | 'scorers'
   * Defaults to interactive prompt if not specified
   */
  components?: Component[];

  /** 
   * LLM provider to configure 
   * Valid values: 'openai' | 'anthropic' | 'groq' | 'google' | 'cerebras' | 'mistral'
   * Defaults to interactive prompt if not specified
   * Sets up default model mapping:
   * - openai → openai/gpt-4o
   * - anthropic → anthropic/claude-sonnet-4-5
   * - groq → groq/llama-3.3-70b-versatile
   * - google → google/gemini-2.5-pro
   * - cerebras → cerebras/llama-3.3-70b
   * - mistral → mistral/mistral-medium-2508
   */
  llmProvider?: LLMProvider;

  /** 
   * Whether to include example code 
   * - true: Include example implementations for selected components
   * - false: Create empty component directories only
   * - undefined: Prompt user
   */
  addExample?: boolean;

  /** 
   * API key for the LLM provider 
   * - Stored in .env file with appropriate variable name
   * - Not validated during creation (validation happens at runtime)
   * - Format varies by provider (e.g., sk-... for OpenAI)
   */
  llmApiKey?: string;

  /** 
   * Version tag for template selection 
   * Used internally for selecting template version from GitHub
   * Defaults to 'latest' if not specified
   */
  createVersionTag?: string;

  /** 
   * Timeout for package installation in milliseconds (default: 60000)
   * Applies to npm/pnpm/yarn/bun install command
   * Recommended values:
   * - Fast connection: 30000 (30s)
   * - Normal connection: 60000 (60s)
   * - Slow connection: 120000 (120s)
   */
  timeout?: number;

  /** 
   * Target directory for Mastra source code (default: 'src/')
   * - Created relative to project root
   * - Must end with / for directory (though not enforced)
   * - Common values: 'src/', 'lib/', 'app/'
   */
  directory?: string;

  /** 
   * MCP server to install for code editor integration 
   * Valid values: 'cursor' | 'cursor-global' | 'windsurf' | 'vscode' | 'antigravity'
   * - cursor: Install to project-specific Cursor config
   * - cursor-global: Install to global Cursor config (~/.cursor/)
   * - windsurf: Install to Windsurf config (~/.windsurf/)
   * - vscode: Install to VSCode config
   * - antigravity: Install to Antigravity config
   */
  mcpServer?: Editor;

  /** 
   * Template to use for project creation
   * - string: Template name or GitHub URL
   *   - Name: 'starter', 'minimal', etc. (fetched from templates API)
   *   - URL: 'https://github.com/user/template' (cloned directly)
   * - true: Show interactive template selection
   * - undefined: Use default Mastra template
   */
  template?: string | boolean;

  /** 
   * Custom PosthogAnalytics instance for tracking 
   * If not provided, uses global analytics instance
   * Set to null to disable analytics for this operation
   */
  analytics?: PosthogAnalytics | null;
}
```

**Type Definitions:**

```typescript { .api }
type Component = 'agents' | 'workflows' | 'tools' | 'scorers';
type LLMProvider = 'openai' | 'anthropic' | 'groq' | 'google' | 'cerebras' | 'mistral';
type Editor = 'cursor' | 'cursor-global' | 'windsurf' | 'vscode' | 'antigravity';
```

**Usage Example:**

```typescript { .api }
import { create } from "mastra/dist/commands/create/create";
import { PosthogAnalytics } from "mastra/analytics";

// Create custom analytics instance (optional)
const analytics = new PosthogAnalytics({
  version: "1.0.1",
  apiKey: "your-api-key",
  host: "https://us.posthog.com"
});

// Create project programmatically with all options
await create({
  projectName: "my-ai-app",
  components: ["agents", "workflows", "tools"],
  llmProvider: "openai",
  llmApiKey: process.env.OPENAI_API_KEY,
  addExample: true,
  directory: "src/",
  mcpServer: "cursor",
  timeout: 90000, // 90 seconds for slower connections
  analytics: analytics
});

// Create from template (GitHub URL)
await create({
  projectName: "my-template-app",
  template: "https://github.com/user/mastra-template"
});

// Create from named template with interactive selection
await create({
  projectName: "my-starter",
  template: true // Will show template picker
});

// Interactive mode (will prompt for missing options)
await create({
  projectName: "my-interactive-app"
  // Will prompt for components, llmProvider, etc.
});

// Minimal configuration
await create({
  projectName: "minimal-app",
  components: ["agents"],
  llmProvider: "openai",
  addExample: false
});
```

**Error Handling:**

```typescript { .api }
import { create } from "mastra/dist/commands/create/create";

try {
  await create({
    projectName: "my-app",
    components: ["agents"],
    llmProvider: "openai"
  });
  console.log("Project created successfully");
} catch (error) {
  // Specific error checking
  if (error.message.includes("already exists")) {
    // Error message: "Error: Directory 'my-app' already exists"
    console.error("Project directory already exists. Choose a different name.");
  } else if (error.message.includes("timeout")) {
    // Error message: "Error: Package installation timed out after 60000ms"
    console.error("Package installation timed out. Try increasing timeout.");
  } else if (error.message.includes("Invalid component")) {
    // Error message: "Error: Invalid component: agent. Valid components: agents, workflows, tools, scorers"
    console.error("Invalid component. Must be: agents, workflows, tools, or scorers.");
  } else if (error.message.includes("Node.js version")) {
    // Error message: "Error: Node.js version >=22.13.0 required. Current: v18.17.0"
    console.error("Node.js 22.13.0 or higher required.");
  } else if (error.message.includes("Invalid LLM provider")) {
    // Error message: "Error: Invalid LLM provider: gpt4. Valid providers: openai, anthropic, groq, google, cerebras, mistral"
    console.error("Invalid LLM provider specified.");
  } else {
    // Other errors
    console.error("Failed to create project:", error.message);
  }
}
```

**Return Value and Side Effects:**

```typescript { .api }
// Returns: Promise<void>
// - Resolves when project is fully created and dependencies installed
// - Rejects with Error if any step fails

// Side effects (file system changes):
// Creates:
// - <projectName>/                    (project directory)
// - <projectName>/package.json        (with mastra dependency)
// - <projectName>/.env                (if llmApiKey provided)
// - <projectName>/<directory>/        (e.g., src/)
// - <projectName>/<directory>/mastra/ (mastra configuration)
// - <projectName>/<directory>/mastra/index.ts
// - <projectName>/<directory>/mastra/agents/    (if 'agents' in components)
// - <projectName>/<directory>/mastra/workflows/ (if 'workflows' in components)
// - <projectName>/<directory>/mastra/tools/     (if 'tools' in components)
// - <projectName>/<directory>/mastra/scorers/   (if 'scorers' in components)
// - <projectName>/node_modules/       (after install)
// - <projectName>/package-lock.json   (or equivalent)

// Modifies (if mcpServer specified):
// - ~/.cursor/config.json             (if mcpServer === 'cursor-global')
// - Or project-specific config

// Console output:
// - Progress indicators during installation
// - Success message with next steps
// - Error messages if failures occur
```

**Interactive Prompts:**

```typescript { .api }
// When arguments are omitted, create() will prompt interactively:
// 1. Project name (if not provided)
// 2. Package manager selection (npm, pnpm, yarn, bun)
// 3. Components to include (multi-select)
// 4. LLM provider selection
// 5. API key input (masked)
// 6. Include examples? (yes/no)
// 7. MCP server selection (optional)

// Disable prompts by providing all required arguments
// Or run in non-interactive environment (CI=true)
```

### Analytics Module

The analytics module provides PostHog-based telemetry tracking for custom integrations.

**Import Path:**

```typescript { .api }
import { 
  PosthogAnalytics, 
  getAnalytics, 
  setAnalytics, 
  CLI_ORIGIN 
} from "mastra/analytics";
```

#### PosthogAnalytics Class

Main analytics class for tracking events and commands.

```typescript { .api }
export class PosthogAnalytics {
  /**
   * Create a new PostHog analytics instance
   * @param options - Configuration options
   * @param options.version - CLI version string (from package.json)
   * @param options.apiKey - PostHog API key
   * @param options.host - PostHog host URL (e.g., https://us.posthog.com)
   * @throws Error if PostHog client initialization fails
   */
  constructor(options: {
    version: string;
    apiKey: string;
    host: string;
  });

  /**
   * Track a custom event
   * @param eventName - Name of the event to track
   * @param properties - Optional event properties (any JSON-serializable object)
   * @returns void - Events are queued and sent asynchronously
   * @example
   * analytics.trackEvent('project_created', { 
   *   components: ['agents', 'workflows'],
   *   llmProvider: 'openai'
   * });
   */
  trackEvent(eventName: string, properties?: Record<string, any>): void;

  /**
   * Track a CLI command execution
   * @param options - Command tracking options
   * @param options.command - Command name (e.g., 'create', 'dev', 'build')
   * @param options.args - Command arguments as key-value pairs
   * @param options.durationMs - Execution duration in milliseconds
   * @param options.status - Execution status ('success' | 'error')
   * @param options.error - Error message if status is 'error'
   * @param options.origin - CLI origin ('mastra-cloud' | 'oss')
   * @returns void - Event is queued for async sending
   */
  trackCommand(options: {
    command: string;
    args?: Record<string, unknown>;
    durationMs?: number;
    status?: 'success' | 'error';
    error?: string;
    origin?: CLI_ORIGIN;
  }): void;

  /**
   * Wrap command execution with automatic timing and tracking
   * @param options - Execution tracking options
   * @param options.command - Command name
   * @param options.args - Command arguments
   * @param options.execution - Async function to execute and track
   * @param options.origin - CLI origin
   * @returns Promise<T> - Result from execution function
   * @throws Error - Re-throws any error from execution function after tracking
   * @example
   * const result = await analytics.trackCommandExecution({
   *   command: 'build',
   *   args: { studio: true },
   *   execution: async () => {
   *     return await buildProject();
   *   }
   * });
   */
  trackCommandExecution<T>(options: {
    command: string;
    args: Record<string, unknown>;
    execution: () => Promise<T>;
    origin?: CLI_ORIGIN;
  }): Promise<T>;

  /**
   * Shutdown the PostHog client and flush pending events
   * @returns Promise<void> - Resolves when all events are flushed
   * @throws Error if flush operation fails
   * @example
   * await analytics.shutdown(); // Ensure all events are sent before exit
   */
  shutdown(): Promise<void>;
}
```

**Type Definitions:**

```typescript { .api }
interface PosthogAnalyticsOptions {
  version: string;
  apiKey: string;
  host: string;
}

interface TrackCommandOptions {
  command: string;
  args?: Record<string, unknown>;
  durationMs?: number;
  status?: 'success' | 'error';
  error?: string;
  origin?: CLI_ORIGIN;
}

interface TrackExecutionOptions<T> {
  command: string;
  args: Record<string, unknown>;
  execution: () => Promise<T>;
  origin?: CLI_ORIGIN;
}

type CLI_ORIGIN = 'mastra-cloud' | 'oss';
```

#### Analytics Helper Functions

```typescript { .api }
/**
 * Get the current global analytics instance
 * @returns Current PosthogAnalytics instance or null if not set
 * @example
 * const analytics = getAnalytics();
 * if (analytics) {
 *   analytics.trackEvent('custom_event');
 * }
 */
export function getAnalytics(): PosthogAnalytics | null;

/**
 * Set the global analytics instance
 * @param instance - PosthogAnalytics instance to set as global
 * @returns void
 * @example
 * const analytics = new PosthogAnalytics({...});
 * setAnalytics(analytics);
 */
export function setAnalytics(instance: PosthogAnalytics): void;
```

#### CLI_ORIGIN Type

```typescript { .api }
/**
 * Origin of CLI execution (cloud vs open source)
 * Determined by MASTRA_ANALYTICS_ORIGIN environment variable
 * Defaults to 'oss' if not set
 */
export type CLI_ORIGIN = 'mastra-cloud' | 'oss';
```

**Usage Example:**

```typescript { .api }
import { PosthogAnalytics, setAnalytics, getAnalytics } from "mastra/analytics";

// Create custom analytics instance
const analytics = new PosthogAnalytics({
  version: "1.0.1",
  apiKey: process.env.POSTHOG_API_KEY!,
  host: "https://us.posthog.com"
});

// Set as global instance
setAnalytics(analytics);

// Track custom events
analytics.trackEvent("custom_action", {
  userId: "user-123",
  action: "feature_used",
  timestamp: Date.now()
});

// Track command execution manually
analytics.trackCommand({
  command: "custom_command",
  args: { option: "value", flag: true },
  durationMs: 1500,
  status: "success",
  origin: "oss"
});

// Track command execution with automatic timing
try {
  const result = await analytics.trackCommandExecution({
    command: "complex_operation",
    args: { input: "data" },
    execution: async () => {
      // Your command logic here
      const data = await performComplexOperation();
      return data;
    },
    origin: "oss"
  });
  console.log("Operation succeeded:", result);
} catch (error) {
  // Error is automatically tracked with error status
  console.error("Operation failed:", error);
}

// Retrieve global instance
const globalAnalytics = getAnalytics();
if (globalAnalytics) {
  await globalAnalytics.shutdown();
}
```

**Analytics Event Schema:**

```typescript { .api }
// Event structure sent to PostHog
interface AnalyticsEvent {
  // Automatically added by PosthogAnalytics
  distinct_id: string;        // Machine ID or random UUID
  timestamp: string;          // ISO 8601 timestamp
  properties: {
    version: string;          // CLI version
    origin: CLI_ORIGIN;       // 'mastra-cloud' | 'oss'
    platform: string;         // process.platform (e.g., 'darwin', 'linux')
    node_version: string;     // Node.js version
    // User-provided properties merged here
    [key: string]: any;
  };
}

// Command event properties
interface CommandEventProperties {
  command: string;
  args?: Record<string, unknown>;
  durationMs?: number;
  status?: 'success' | 'error';
  error?: string;
  // Standard properties
  version: string;
  origin: CLI_ORIGIN;
  platform: string;
  node_version: string;
}
```

**Disabling Telemetry:**

```typescript { .api }
// Environment variable to disable telemetry
// When set (any value), analytics tracking is completely disabled
MASTRA_TELEMETRY_DISABLED=1

// In code:
process.env.MASTRA_TELEMETRY_DISABLED = "1";

// Or when running commands:
MASTRA_TELEMETRY_DISABLED=1 mastra create my-app

// Check if telemetry is disabled:
const telemetryDisabled = !!process.env.MASTRA_TELEMETRY_DISABLED;
```

**Error Handling:**

```typescript { .api }
import { PosthogAnalytics } from "mastra/analytics";

try {
  const analytics = new PosthogAnalytics({
    version: "1.0.1",
    apiKey: "invalid-key",
    host: "https://us.posthog.com"
  });
} catch (error) {
  // Error message: "Error: Failed to initialize PostHog client: Invalid API key"
  console.error("Failed to initialize analytics:", error);
  // Analytics is optional, continue without it
}

// Track events safely
const analytics = getAnalytics();
try {
  analytics?.trackEvent("event_name", { data: "value" });
} catch (error) {
  // Tracking failures should not break application
  console.warn("Failed to track event:", error);
}

// Ensure shutdown completes
try {
  await analytics?.shutdown();
} catch (error) {
  // Error message: "Error: Failed to flush events: network timeout"
  console.warn("Failed to flush analytics:", error);
  // Continue shutdown anyway
}
```

### Telemetry Loader Module

Internal module used by the dev server for telemetry integration.

**Import Path:**

```typescript { .api }
import { ... } from "mastra/telemetry-loader";
```

⚠️ **Note**: This is an internal module primarily used by the dev server bundler. It is not intended for direct external use and its API may change without notice.

**Purpose:**

- Loads telemetry configuration into dev server bundles
- Injects analytics tracking into development builds
- Not part of public API surface
- Subject to breaking changes

## Deep Imports (Advanced)

The package also exposes its dist/ directory for deep imports, though this is not officially documented and may change between versions.

**Example (use with caution):**

```typescript { .api }
// Import create function directly (documented path)
import { create } from "mastra/dist/commands/create/create";

// Import other utilities (undocumented, may break)
import { loadTemplates } from "mastra/dist/utils/template-utils";
import { detectPackageManager } from "mastra/dist/utils/package-manager";
import { findMastraDir } from "mastra/dist/utils/file-utils";
```

⚠️ **Warning**: Deep imports bypass the package's public API and may break without notice in future versions. Use at your own risk.

**Potentially Useful Deep Imports:**

```typescript { .api }
// Template utilities
import { loadTemplates, fetchTemplate } from "mastra/dist/utils/template-utils";

// Package manager detection
import { detectPackageManager, installDependencies } from "mastra/dist/utils/package-manager";

// File system utilities
import { findMastraDir, findProjectRoot } from "mastra/dist/utils/file-utils";

// Validation utilities
import { validateProjectName, validateComponent } from "mastra/dist/utils/validation";

// Note: These are inferred from typical CLI structure
// Actual exports may differ and are not guaranteed
```

## Module Resolution

```typescript { .api }
// Package exports (from package.json "exports" field)
{
  ".": "./dist/index.js",              // Main entry (triggers CLI)
  "./analytics": "./dist/analytics/index.js",  // Analytics module
  "./telemetry-loader": "./dist/telemetry-loader/index.js",  // Internal
  "./dist/*": "./dist/*",              // Deep imports
  "./package.json": "./package.json"   // Package metadata
}

// TypeScript type definitions
{
  ".": "./dist/index.d.ts",
  "./analytics": "./dist/analytics/index.d.ts",
  // ... corresponding .d.ts files
}
```

## Disabling Telemetry

To disable telemetry when using analytics programmatically or via CLI:

**Environment Variable:**

```bash { .api }
export MASTRA_TELEMETRY_DISABLED=1
```

**In Node.js:**

```typescript { .api }
process.env.MASTRA_TELEMETRY_DISABLED = "1";
```

**Before Importing:**

```typescript { .api }
// Disable before any imports
process.env.MASTRA_TELEMETRY_DISABLED = "1";

import { create } from "mastra/dist/commands/create/create";
import { PosthogAnalytics, getAnalytics } from "mastra/analytics";

// getAnalytics() will return null when telemetry disabled
const analytics = getAnalytics(); // null
```

**Verification:**

```typescript { .api }
// Check if telemetry is enabled
function isTelemetryEnabled(): boolean {
  return !process.env.MASTRA_TELEMETRY_DISABLED;
}

// Use in code
if (isTelemetryEnabled()) {
  const analytics = getAnalytics();
  analytics?.trackEvent("event_name");
}
```

## Common Error Messages

```typescript { .api }
// PosthogAnalytics constructor errors
// "Error: Failed to initialize PostHog client: Invalid API key"
// Solution: Check POSTHOG_API_KEY is valid

// "Error: Failed to initialize PostHog client: Invalid host URL"
// Solution: Verify host URL format (e.g., https://us.posthog.com)

// create function errors
// "Error: Directory 'my-app' already exists"
// Solution: Choose different project name or remove existing directory

// "Error: Node.js version >=22.13.0 required. Current: v18.17.0"
// Solution: Upgrade Node.js to 22.13.0 or higher

// "Error: Invalid component: agent. Valid components: agents, workflows, tools, scorers"
// Solution: Use plural form of component name

// "Error: Invalid LLM provider: gpt4. Valid providers: openai, anthropic, groq, google, cerebras, mistral"
// Solution: Use one of the supported provider names

// "Error: Package installation timed out after 60000ms"
// Solution: Increase timeout with timeout option

// "Error: Failed to write MCP configuration: Permission denied"
// Solution: Check file permissions for MCP config file

// Analytics errors
// "Error: Failed to track event: Network timeout"
// "Error: Failed to flush events: Connection refused"
// These are non-fatal warnings, application continues
```
