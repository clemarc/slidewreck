# CLI Commands

Complete reference for all Mastra CLI commands. All commands are invoked using the `mastra` binary.

## Capabilities

### Create Command

Creates a new Mastra project from scratch with optional template support.

```bash { .api }
/**
 * Create a new Mastra project
 * @command mastra create [project-name]
 * @exits 0 on success, 1 on error, 130 on SIGINT
 */
mastra create [project-name] [options]
```

**Options:**

```bash { .api }
--default
  # Quick start with defaults (src, OpenAI, examples)
  # Equivalent to: --dir src/ --llm openai --example --components agents,workflows,tools

-c, --components <components>
  # Comma-separated list of components
  # Valid values: agents, workflows, tools, scorers
  # Example: --components agents,workflows,tools

-l, --llm <model-provider>
  # Default model provider
  # Valid values: openai, anthropic, groq, google, cerebras, mistral
  # Example: --llm openai

-k, --llm-api-key <api-key>
  # API key for the model provider
  # Stored in .env file with appropriate variable name
  # Example: --llm-api-key sk-...

-e, --example
  # Include example code for selected components

-n, --no-example
  # Do not include example code (empty component directories)

-t, --timeout [timeout]
  # Configurable timeout for package installation in milliseconds
  # Default: 60000 (60 seconds)
  # Example: --timeout 120000

-d, --dir <directory>
  # Target directory for Mastra source code
  # Default: src/
  # Example: --dir lib/mastra/

-p, --project-name <string>
  # Project name that will be used in package.json
  # Overrides positional [project-name] argument
  # Example: --project-name my-custom-name

-m, --mcp <editor>
  # MCP Server for code editor integration
  # Valid values: cursor, cursor-global, windsurf, vscode, antigravity
  # Example: --mcp cursor

--template [template-name]
  # Create from a template
  # - No value: Show interactive template list
  # - Name: Use named template (e.g., --template starter)
  # - URL: Use GitHub template (e.g., --template https://github.com/user/repo)
```

**Usage Examples:**

```bash { .api }
# Create with interactive prompts
mastra create my-project

# Create with defaults
mastra create my-project --default

# Create with specific components and LLM
mastra create my-project -c agents,workflows -l openai -k sk-...

# Create from template
mastra create my-project --template starter

# Create from GitHub template
mastra create my-project --template https://github.com/user/template

# Create without examples, specific directory
mastra create my-project --no-example -d lib/

# Create with extended timeout for slow connections
mastra create my-project --timeout 120000

# Create with all components and MCP integration
mastra create my-project -c agents,workflows,tools,scorers -m cursor-global
```

**Exit Codes:**

```typescript { .api }
0   // Success - project created and dependencies installed
1   // Error - directory exists, invalid options, or installation failed
130 // SIGINT - user cancelled with Ctrl+C
```

**File System Changes:**

```typescript { .api }
// Creates directory structure:
<project-name>/
  package.json              // With mastra dependency
  .env                      // If --llm-api-key provided
  .gitignore               // Standard Node.js gitignore
  <directory>/             // Default: src/
    mastra/
      index.ts             // Main entry point
      agents/              // If --components includes 'agents'
        *.ts               // Example agents if --example
      workflows/           // If --components includes 'workflows'
        *.ts               // Example workflows if --example
      tools/               // If --components includes 'tools'
        *.ts               // Example tools if --example
      scorers/             // If --components includes 'scorers'
        *.ts               // Example scorers if --example
  node_modules/            // After installation
  package-lock.json        // Or pnpm-lock.yaml, yarn.lock, bun.lockb

// Modifies (if --mcp specified):
~/.cursor/config.json      // If --mcp cursor-global
// Or project-specific MCP config
```

**Validation Rules:**

```typescript { .api }
// Project name validation
// - Must be valid npm package name
// - Cannot contain spaces or special chars (except - _ @)
// - Cannot start with . or _
// - Cannot be: node_modules, favicon.ico
// - Max length: 214 characters

// Directory validation
// - Must not already exist
// - Parent directory must be writable
// - Path can be relative or absolute

// Component validation
// - Must be one of: agents, workflows, tools, scorers
// - Can specify multiple comma-separated
// - Duplicates are ignored

// LLM provider validation
// - Must be one of: openai, anthropic, groq, google, cerebras, mistral

// Editor validation
// - Must be one of: cursor, cursor-global, windsurf, vscode, antigravity
```

**Common Error Messages:**

```typescript { .api }
// "Error: Directory 'my-app' already exists"
// Solution: Choose different name or remove directory

// "Error: Invalid project name 'my app'. Project names cannot contain spaces"
// Solution: Use hyphens or underscores instead of spaces

// "Error: Invalid component: agent. Valid components: agents, workflows, tools, scorers"
// Solution: Use plural form (agents not agent)

// "Error: Invalid LLM provider: gpt4. Valid providers: openai, anthropic, groq, google, cerebras, mistral"
// Solution: Use provider name not model name

// "Error: Package installation timed out after 60000ms"
// Solution: Use --timeout flag to increase timeout

// "Error: Node.js version >=22.13.0 required. Current: v18.17.0"
// Solution: Upgrade Node.js to 22.13.0 or higher
```

### Init Command

Initialize Mastra in an existing project.

```bash { .api }
/**
 * Initialize Mastra in existing project
 * @command mastra init
 * @exits 0 on success, 1 on error, 130 on SIGINT
 */
mastra init [options]
```

**Options:**

```bash { .api }
--default
  # Quick start with defaults (src, OpenAI, examples)

-d, --dir <directory>
  # Directory for Mastra files
  # Default: src/
  # Example: --dir lib/mastra/

-c, --components <components>
  # Comma-separated list of components
  # Valid values: agents, workflows, tools, scorers
  # Example: --components agents,workflows

-l, --llm <model-provider>
  # Default model provider
  # Valid values: openai, anthropic, groq, google, cerebras, mistral

-k, --llm-api-key <api-key>
  # API key for the model provider

-e, --example
  # Include example code

-n, --no-example
  # Do not include example code

-m, --mcp <editor>
  # MCP Server for code editor
  # Valid values: cursor, cursor-global, windsurf, vscode, antigravity
```

**Usage Examples:**

```bash { .api }
# Initialize with interactive prompts
mastra init

# Initialize with defaults
mastra init --default

# Initialize with specific components
mastra init -c agents,tools -l anthropic

# Initialize with MCP server for Cursor
mastra init -m cursor

# Initialize in custom directory without examples
mastra init -d lib/mastra --no-example
```

**Exit Codes:**

```typescript { .api }
0   // Success - Mastra initialized
1   // Error - no package.json found, invalid options, or directory creation failed
130 // SIGINT - user cancelled with Ctrl+C
```

**File System Changes:**

```typescript { .api }
// Modifies existing project:
package.json              // Adds mastra dependency
.env                      // Creates or updates with API key
<directory>/mastra/       // Creates mastra directory structure
  index.ts
  agents/                 // If selected
  workflows/              // If selected
  tools/                  // If selected
  scorers/                // If selected

// Creates if not exists:
node_modules/             // After installing dependencies
package-lock.json         // Or equivalent lock file
```

**Validation Rules:**

```typescript { .api }
// Requires package.json in current directory or parent
// Directory must not already contain mastra/ folder
// Same component, LLM, and editor validation as create command
```

**Common Error Messages:**

```typescript { .api }
// "Error: No package.json found in current directory or parent"
// Solution: Run 'npm init' first or navigate to project root

// "Error: Mastra directory already exists at src/mastra"
// Solution: Remove existing directory or use different --dir

// "Error: Invalid component: workflow. Valid components: agents, workflows, tools, scorers"
// Solution: Use plural form (workflows not workflow)
```

### Dev Command

Start the Mastra development server with hot reload capabilities.

```bash { .api }
/**
 * Start Mastra development server
 * @command mastra dev
 * @exits 0 on clean shutdown, 1 on error, 130 on SIGINT
 */
mastra dev [options]
```

**Options:**

```bash { .api }
-d, --dir <dir>
  # Path to your mastra folder
  # Auto-detected if not specified
  # Example: --dir src/mastra

-r, --root <root>
  # Path to your root folder
  # Default: directory containing package.json
  # Example: --root /path/to/project

-t, --tools <toolsDirs>
  # Comma-separated list of paths to tool files to include
  # Example: --tools src/tools/api.ts,src/tools/db.ts

-e, --env <env>
  # Custom env file to include in the dev server
  # Default: .env
  # Example: --env .env.development

-i, --inspect [host:port]
  # Start the dev server in inspect mode
  # Optional: [host:]port format
  # Default: localhost:9229
  # Example: --inspect 0.0.0.0:9229

-b, --inspect-brk [host:port]
  # Start in inspect mode and break at beginning of script
  # Useful for debugging startup issues
  # Example: --inspect-brk

-c, --custom-args <args>
  # Comma-separated list of custom arguments to pass to Node.js
  # Example: --custom-args --experimental-transform-types,--no-warnings

-s, --https
  # Enable local HTTPS
  # Generates self-signed certificate
  # Server will run on https://localhost:<port>

--debug
  # Enable debug logs
  # Shows detailed build and reload information
```

**Usage Examples:**

```bash { .api }
# Start dev server with defaults
mastra dev

# Start with custom directory
mastra dev -d src/mastra

# Start with HTTPS enabled
mastra dev --https

# Start with Node.js inspector
mastra dev --inspect

# Start with inspector on specific port
mastra dev --inspect 0.0.0.0:9229

# Start with inspector and break at startup
mastra dev --inspect-brk

# Start with custom env file
mastra dev -e .env.development

# Start with custom Node.js flags
mastra dev -c --experimental-transform-types,--no-warnings

# Start with debug logging
mastra dev --debug

# Start with specific tools
mastra dev -t src/tools/api.ts,src/tools/database.ts

# Combine options
mastra dev -d src/mastra --https --inspect --debug
```

**Exit Codes:**

```typescript { .api }
0   // Clean shutdown (Ctrl+C or process killed)
1   // Error - invalid configuration, build failure, or port in use
130 // SIGINT - user pressed Ctrl+C
```

**File System Changes:**

```typescript { .api }
// Creates:
.mastra/                  // Build cache directory
.mastra/dev/              // Development build artifacts
.mastra/dev/bundle.js     // Bundled development server

// Watches for changes in:
<dir>/**/*.ts             // Mastra directory files
<tools>/**/*.ts           // Tool files if specified
<root>/package.json       // Package dependencies
```

**Runtime Behavior:**

```typescript { .api }
// Server characteristics:
// - Default port: 4111 (configurable via PORT env var)
// - Default host: localhost (configurable via HOST env var)
// - Hot reload on file changes
// - Automatic restart on configuration changes
// - WebSocket connection for live updates (if using Studio)

// Environment variables loaded (in order):
// 1. System environment
// 2. .env file (unless MASTRA_SKIP_DOTENV=1)
// 3. Custom env file (--env flag)

// File watching:
// - Debounced: 100ms delay after last change
// - Incremental: Only rebuilds changed files
// - Excludes: node_modules/, .git/, .mastra/
```

**Inspector Mode:**

```typescript { .api }
// Inspector protocol details:
// Default: ws://localhost:9229
// Chrome DevTools URL: chrome://inspect
// VSCode: Attach to Node Process

// Inspect mode:
// - Server starts immediately
// - Debugger can attach at any time

// Inspect-brk mode:
// - Server pauses before executing code
// - Waits for debugger to attach
// - Useful for debugging initialization
```

**HTTPS Mode:**

```typescript { .api }
// HTTPS characteristics:
// - Self-signed certificate generated automatically
// - Certificate cached in .mastra/certs/
// - Browser will show security warning (expected)
// - Accept certificate to proceed

// HTTPS URL: https://localhost:4111 (default port)

// Certificate files created:
// .mastra/certs/cert.pem  // SSL certificate
// .mastra/certs/key.pem   // Private key
```

**Common Error Messages:**

```typescript { .api }
// "Error: Port 4111 is already in use"
// Solution: Kill process on port or use PORT=8080 mastra dev

// "Error: No mastra configuration found"
// Solution: Run 'mastra init' or use --dir flag

// "Error: Build failed: Cannot find module './missing-file'"
// Solution: Check import paths and ensure all files exist

// "Error: EACCES: permission denied, bind 0.0.0.0:80"
// Solution: Use port >1024 or run with sudo (not recommended)

// "Error: Failed to generate SSL certificate"
// Solution: Check write permissions for .mastra/certs/ directory
```

### Build Command

Build your Mastra project for production deployment.

```bash { .api }
/**
 * Build Mastra project for production
 * @command mastra build
 * @exits 0 on success, 1 on error
 */
mastra build [options]
```

**Options:**

```bash { .api }
-d, --dir <path>
  # Path to your Mastra Folder
  # Auto-detected if not specified
  # Example: --dir src/mastra

-r, --root <path>
  # Path to your root folder
  # Default: directory containing package.json
  # Example: --root /path/to/project

-t, --tools <toolsDirs>
  # Comma-separated list of paths to tool files to include
  # Example: --tools src/tools/api.ts,src/tools/db.ts

-s, --studio
  # Bundle the studio UI with the build
  # Adds ~5-10MB to output size
  # Enables web UI at runtime

--debug
  # Enable debug logs
  # Shows detailed build information
```

**Usage Examples:**

```bash { .api }
# Build with defaults
mastra build

# Build with custom directory
mastra build -d src/mastra

# Build with Studio UI included
mastra build --studio

# Build with custom tool directories
mastra build -t src/tools,lib/tools

# Build with debug logging
mastra build --debug

# Build with all options
mastra build -d src/mastra -r . -t src/tools --studio --debug
```

**Exit Codes:**

```typescript { .api }
0   // Success - build completed
1   // Error - TypeScript errors, missing files, or build failure
```

**File System Changes:**

```typescript { .api }
// Creates:
.mastra/                     // Build directory
.mastra/output/              // Production build artifacts
  index.js                   // Bundled server (minified)
  index.js.map               // Source map
  package.json               // Runtime dependencies only
  node_modules/              // Production dependencies (if any)
  studio/                    // Studio UI files (if --studio)
    index.html
    assets/
    *.js
    *.css

// Output size:
// Without --studio: ~1-2MB
// With --studio: ~6-12MB
```

**Build Characteristics:**

```typescript { .api }
// Bundler: esbuild
// Target: Node.js 22.13.0+
// Format: CommonJS
// Minification: Enabled
// Source maps: Enabled
// Tree shaking: Enabled
// External packages: Listed in package.json dependencies
// Bundle splitting: Disabled (single bundle)

// Build includes:
// - All Mastra configuration files
// - All component implementations (agents, workflows, tools, scorers)
// - Tool files specified with --tools
// - Runtime dependencies
// - Studio UI (if --studio)

// Build excludes:
// - Development dependencies
// - Test files
// - .env files (must be provided at runtime)
// - node_modules (re-installed from package.json)
```

**TypeScript Compilation:**

```typescript { .api }
// TypeScript is transpiled during build
// Errors cause build to fail
// No separate tsc step required
// Type checking performed automatically

// Common build errors:
// - Missing dependencies
// - TypeScript type errors
// - Invalid imports
// - Missing tool files specified in --tools
```

**Common Error Messages:**

```typescript { .api }
// "Error: Build failed: Cannot find module 'missing-package'"
// Solution: Add missing package to package.json dependencies

// "Error: Build failed: TypeScript compilation errors"
// Solution: Run 'mastra lint' to see specific errors

// "Error: Tool file not found: src/tools/missing.ts"
// Solution: Check path and ensure file exists

// "Error: Failed to bundle Studio UI"
// Solution: Check MASTRA_STUDIO_PATH or omit --studio flag

// "Error: Insufficient disk space for build"
// Solution: Free up disk space or build to different directory
```

### Start Command

Start your built Mastra application in production mode.

```bash { .api }
/**
 * Start built Mastra application
 * @command mastra start
 * @exits 0 on clean shutdown, 1 on error
 */
mastra start [options]
```

**Options:**

```bash { .api }
-d, --dir <path>
  # Path to your built Mastra output directory
  # Default: .mastra/output
  # Example: --dir dist/mastra

-e, --env <env>
  # Custom env file to include in the start
  # Default: .env
  # Example: --env .env.production
```

**Usage Examples:**

```bash { .api }
# Start with defaults (.mastra/output)
mastra start

# Start with custom output directory
mastra start -d dist/mastra

# Start with custom env file
mastra start -e .env.production

# Start with both options
mastra start -d dist/mastra -e .env.production
```

**Exit Codes:**

```typescript { .api }
0   // Clean shutdown (SIGINT or SIGTERM)
1   // Error - build not found, invalid configuration, or runtime error
130 // SIGINT - user pressed Ctrl+C
```

**Runtime Behavior:**

```typescript { .api }
// Server characteristics:
// - Default port: 4111 (configurable via PORT env var)
// - Default host: localhost (configurable via HOST env var)
// - No hot reload (production mode)
// - Optimized for performance

// Environment variables loaded (in order):
// 1. System environment
// 2. .env file (unless MASTRA_SKIP_DOTENV=1)
// 3. Custom env file (--env flag)

// Required files:
// - <dir>/index.js (built server)
// - <dir>/package.json (if external dependencies)
// - <dir>/node_modules/ (if external dependencies)

// Optional files:
// - <dir>/studio/ (if built with --studio)
```

**Environment Variables:**

```bash { .api }
PORT=4111                        # Server port
HOST=localhost                   # Server host
MASTRA_SKIP_DOTENV=1             # Skip .env loading
MASTRA_DISABLE_STORAGE_INIT=1    # Skip storage initialization
```

**Studio Access (if built with --studio):**

```typescript { .api }
// Studio UI available at:
// http://<HOST>:<PORT>/studio
// Default: http://localhost:4111/studio

// Studio requires:
// - Build with --studio flag
// - studio/ directory in output
```

**Common Error Messages:**

```typescript { .api }
// "Error: Build not found at .mastra/output"
// Solution: Run 'mastra build' first

// "Error: Port 4111 is already in use"
// Solution: Kill process on port or use PORT=8080 mastra start

// "Error: Cannot find module 'some-package'"
// Solution: Install dependencies in output directory

// "Error: DATABASE_URL not set"
// Solution: Set DATABASE_URL in .env or environment

// "Error: Failed to initialize storage"
// Solution: Check database connection or use MASTRA_DISABLE_STORAGE_INIT=1
```

### Studio Command

Start the Mastra Studio UI for interactive development and testing.

```bash { .api }
/**
 * Start Mastra Studio UI
 * @command mastra studio
 * @exits 0 on clean shutdown, 1 on error
 */
mastra studio [options]
```

**Options:**

```bash { .api }
-p, --port <port>
  # Port to run the studio on
  # Default: 3000
  # Example: --port 8080

-e, --env <env>
  # Custom env file to include in the studio
  # Default: .env
  # Example: --env .env.local

-h, --server-host <serverHost>
  # Host of the Mastra API server
  # Default: localhost
  # Example: --server-host api.example.com

-s, --server-port <serverPort>
  # Port of the Mastra API server
  # Default: 4111
  # Example: --server-port 5000

-x, --server-protocol <serverProtocol>
  # Protocol of the Mastra API server
  # Default: http
  # Valid values: http, https
  # Example: --server-protocol https
```

**Usage Examples:**

```bash { .api }
# Start Studio with defaults (port 3000, connects to localhost:4111)
mastra studio

# Start on custom port
mastra studio -p 8080

# Connect to remote API server
mastra studio -h api.example.com -s 443 -x https

# Connect to remote API with different port
mastra studio -h 192.168.1.100 -s 5000

# Start with custom env file
mastra studio -e .env.local

# Full custom configuration
mastra studio -p 8080 -h api.example.com -s 443 -x https -e .env.production
```

**Exit Codes:**

```typescript { .api }
0   // Clean shutdown
1   // Error - port in use, cannot connect to API server
130 // SIGINT - user pressed Ctrl+C
```

**Runtime Behavior:**

```typescript { .api }
// Studio UI characteristics:
// - React-based web application
// - Connects to Mastra API server via WebSocket and HTTP
// - Real-time updates for agents, workflows, and tools
// - Interactive testing interface

// Default URLs:
// Studio UI: http://localhost:3000
// API Server: http://localhost:4111 (must be running)

// Requires:
// - Mastra dev server running (mastra dev)
// - Or built server running (mastra start)
// - API server must be accessible from Studio
```

**Studio Features:**

```typescript { .api }
// Available in Studio UI:
// - Agent management and testing
// - Workflow visualization and execution
// - Tool testing and debugging
// - Scorer evaluation
// - Logs and monitoring
// - Configuration management
```

**API Connection:**

```typescript { .api }
// Studio connects to API server at:
// <server-protocol>://<server-host>:<server-port>

// Connection requirements:
// - API server must be running
// - Server must accept connections from Studio host
// - CORS must allow Studio origin (if different host)
// - WebSocket connection must be allowed
```

**Common Error Messages:**

```typescript { .api }
// "Error: Port 3000 is already in use"
// Solution: Kill process on port or use --port flag

// "Error: Failed to connect to API server at http://localhost:4111"
// Solution: Start API server with 'mastra dev' or 'mastra start'

// "Error: CORS error: Origin http://localhost:3000 not allowed"
// Solution: Configure CORS on API server to allow Studio origin

// "Error: WebSocket connection failed"
// Solution: Check API server WebSocket support and firewall rules
```

### Lint Command

Lint your Mastra project configuration for common issues and best practices.

```bash { .api }
/**
 * Lint Mastra project configuration
 * @command mastra lint
 * @exits 0 if no issues, 1 if issues found or error
 */
mastra lint [options]
```

**Options:**

```bash { .api }
-d, --dir <path>
  # Path to your Mastra folder
  # Auto-detected if not specified
  # Example: --dir src/mastra

-r, --root <path>
  # Path to your root folder
  # Default: directory containing package.json
  # Example: --root /path/to/project

-t, --tools <toolsDirs>
  # Comma-separated list of paths to tool files to include
  # Example: --tools src/tools
```

**Usage Examples:**

```bash { .api }
# Lint with defaults
mastra lint

# Lint with custom directory
mastra lint -d src/mastra

# Lint with custom root and tool directories
mastra lint -r . -d src/mastra -t src/tools

# Lint in CI/CD (exit code indicates pass/fail)
mastra lint && echo "Lint passed" || echo "Lint failed"
```

**Exit Codes:**

```typescript { .api }
0   // No issues found
1   // Issues found or linting error
```

**Linting Rules:**

```typescript { .api }
// Checks performed:
// - Valid Mastra configuration structure
// - All referenced files exist
// - TypeScript syntax errors
// - Missing dependencies in package.json
// - Invalid component configurations
// - Tool file imports are valid
// - Agent definitions are valid
// - Workflow definitions are valid
// - Scorer definitions are valid
// - Environment variable references

// Output format:
// ✓ <check-name> passed
// ✗ <check-name> failed: <reason>
//   at <file>:<line>:<column>

// Summary:
// Found X issues in Y files
```

**Common Error Messages:**

```typescript { .api }
// "✗ TypeScript compilation failed: Cannot find module '@mastra/core'"
// Solution: Run 'npm install' to install dependencies

// "✗ Missing file: src/mastra/agents/missing-agent.ts"
// Solution: Create file or remove reference

// "✗ Invalid agent configuration: Missing 'name' field"
// Solution: Add required 'name' field to agent definition

// "✗ Unused environment variable: UNUSED_VAR"
// Solution: Remove variable from .env or add to code

// "✗ Invalid import: Cannot resolve '../missing/path'"
// Solution: Fix import path to point to existing file
```

### Migrate Command

Run database migrations to update storage schema.

```bash { .api }
/**
 * Run database migrations
 * @command mastra migrate
 * @exits 0 on success, 1 on error
 */
mastra migrate [options]
```

**Options:**

```bash { .api }
-d, --dir <path>
  # Path to your Mastra folder
  # Auto-detected if not specified
  # Example: --dir src/mastra

-r, --root <path>
  # Path to your root folder
  # Default: directory containing package.json
  # Example: --root /path/to/project

-e, --env <env>
  # Custom env file to include
  # Default: .env
  # Example: --env .env.production

--debug
  # Enable debug logs
  # Shows detailed migration information

-y, --yes
  # Skip confirmation prompt (for CI/automation)
  # Automatically applies migrations
```

**Usage Examples:**

```bash { .api }
# Run migrations with interactive confirmation
mastra migrate

# Run migrations without confirmation (CI mode)
mastra migrate --yes

# Run migrations with custom directory
mastra migrate -d src/mastra

# Run migrations with custom env file
mastra migrate -e .env.production

# Run migrations with debug logging
mastra migrate --debug

# Run in CI/CD pipeline
mastra migrate --yes --debug -e .env.production
```

**Exit Codes:**

```typescript { .api }
0   // Success - migrations applied
1   // Error - migration failed or database connection error
130 // SIGINT - user cancelled at confirmation prompt
```

**Migration Behavior:**

```typescript { .api }
// Migration process:
// 1. Load Mastra configuration
// 2. Connect to database (from DATABASE_URL env var)
// 3. Check current schema version
// 4. Show pending migrations
// 5. Prompt for confirmation (unless --yes)
// 6. Apply migrations in order
// 7. Update schema version
// 8. Show summary

// Confirmation prompt:
// The following migrations will be applied:
//   - migration_001_initial_schema
//   - migration_002_add_index
// Continue? (y/N)

// With --yes flag:
// Confirmation skipped, migrations applied automatically
```

**Database Configuration:**

```bash { .api }
# Required environment variable:
DATABASE_URL=postgresql://user:pass@host:port/database

# Supported databases:
# - PostgreSQL: postgresql://user:pass@localhost:5432/mastra
# - MySQL: mysql://user:pass@localhost:3306/mastra
# - SQLite: sqlite://./mastra.db

# Connection pooling:
# - Managed by storage backend
# - Connection closed after migrations
```

**Migration Failure Handling:**

```typescript { .api }
// If migration fails:
// - Transaction rolled back (if supported by database)
// - Schema version not updated
// - Error details displayed
// - Exit code 1

// Common failure reasons:
// - Database connection error
// - Invalid SQL in migration
// - Insufficient permissions
// - Schema conflict
// - Missing required columns/tables
```

**Common Error Messages:**

```typescript { .api }
// "Error: DATABASE_URL not set"
// Solution: Set DATABASE_URL in .env or environment

// "Error: Failed to connect to database: Connection refused"
// Solution: Check database is running and connection string

// "Error: Migration failed: syntax error at or near 'SELCT'"
// Solution: Fix SQL syntax error in migration

// "Error: Insufficient permissions to create table"
// Solution: Grant necessary database permissions

// "Error: Migration '001_initial' already applied"
// Solution: This is normal, migration was previously applied
```

### Scorers Add Command

Add a new scorer to your project for evaluating AI outputs.

```bash { .api }
/**
 * Add scorer to project
 * @command mastra scorers add [scorer-name]
 * @exits 0 on success, 1 on error
 */
mastra scorers add [scorer-name] [options]
```

**Options:**

```bash { .api }
-d, --dir <path>
  # Path to your Mastra directory
  # Auto-detected if not specified
  # Example: --dir src/mastra
```

**Available Scorers:**

**Output Quality:**

```typescript { .api }
answer-relevancy       // Evaluates how relevant the answer is to the question (LLM)
toxicity               // Detects toxic or harmful content in responses (LLM)
prompt-alignment       // Evaluates how well responses align with prompt instructions (LLM)
completeness           // Evaluates completeness of output based on requirements (Code)
keyword-coverage       // Checks coverage of required keywords in output (Code)
tone                   // Analyzes tone and style of generated text (Code)
```

**Accuracy & Reliability:**

```typescript { .api }
bias                   // Detects potential bias in generated responses (LLM)
faithfulness           // Measures how faithful the answer is to the given context (LLM)
hallucination          // Detects hallucinated content in responses (LLM)
llm-tool-call-accuracy // Evaluates accuracy of tool/function calls by LLM (LLM)
noise-sensitivity      // Evaluates how sensitive the model is to noise in inputs (LLM)
content-similarity     // Measures similarity between generated and expected content (Code)
textual-difference     // Measures textual differences between outputs (Code)
code-tool-call-accuracy // Evaluates accuracy of code-based tool calls (Code)
```

**Context Quality:**

```typescript { .api }
context-precision      // Measures how precisely context is used in responses (LLM)
context-relevance      // Evaluates relevance of retrieved context to the query (LLM)
```

**Usage Examples:**

```bash { .api }
# Add scorer with interactive selection
mastra scorers add

# Add specific scorer by name
mastra scorers add answer-relevancy

# Add scorer to custom directory
mastra scorers add bias -d src/mastra

# Add multiple scorers (separate commands)
mastra scorers add answer-relevancy
mastra scorers add faithfulness
mastra scorers add hallucination
```

**Exit Codes:**

```typescript { .api }
0   // Success - scorer added
1   // Error - scorer already exists, invalid name, or file creation failed
130 // SIGINT - user cancelled interactive selection
```

**File System Changes:**

```typescript { .api }
// Creates:
<dir>/scorers/<scorer-name>.ts  // Scorer implementation

// File contents (example for LLM-based scorer):
import { Scorer } from '@mastra/core';

export const answerRelevancy = new Scorer({
  name: 'answer-relevancy',
  description: 'Evaluates how relevant the answer is to the question',
  type: 'llm',
  config: {
    // Scorer-specific configuration
  }
});

// File contents (example for code-based scorer):
import { Scorer } from '@mastra/core';

export const keywordCoverage = new Scorer({
  name: 'keyword-coverage',
  description: 'Checks coverage of required keywords',
  type: 'code',
  evaluate: async (input, output, context) => {
    // Custom evaluation logic
    return {
      score: 0.85,
      passed: true,
      details: { coverage: 17/20 }
    };
  }
});
```

**Scorer Types:**

```typescript { .api }
// LLM-based scorers:
// - Use LLM to evaluate outputs
// - Configured via LLM prompts
// - Flexible but slower and more expensive

// Code-based scorers:
// - Use custom TypeScript code to evaluate
// - Deterministic and fast
// - More rigid but efficient
```

**Common Error Messages:**

```typescript { .api }
// "Error: Scorer 'answer-relevancy' already exists"
// Solution: Remove existing scorer or use different name

// "Error: Invalid scorer name: 'invalid'. Use 'mastra scorers list' to see available scorers"
// Solution: Check spelling and use exact scorer name from list

// "Error: No Mastra configuration found"
// Solution: Run 'mastra init' or use --dir flag

// "Error: Failed to write scorer file: Permission denied"
// Solution: Check write permissions for scorers directory
```

### Scorers List Command

List all available scorer templates with their descriptions.

```bash { .api }
/**
 * List available scorer templates
 * @command mastra scorers list
 * @exits 0 always
 */
mastra scorers list
```

**Usage Example:**

```bash { .api }
# List all available scorers
mastra scorers list
```

**Exit Codes:**

```typescript { .api }
0   // Always successful
```

**Output Format:**

```typescript { .api }
// Console output:
Output Quality Scorers (6):
  • answer-relevancy: Evaluates how relevant the answer is to the question (LLM)
  • toxicity: Detects toxic or harmful content in responses (LLM)
  • prompt-alignment: Evaluates alignment with prompt instructions (LLM)
  • completeness: Evaluates completeness of output (Code)
  • keyword-coverage: Checks keyword coverage (Code)
  • tone: Analyzes tone and style (Code)

Accuracy and Reliability Scorers (8):
  • bias: Detects potential bias (LLM)
  • faithfulness: Measures faithfulness to context (LLM)
  • hallucination: Detects hallucinated content (LLM)
  • llm-tool-call-accuracy: Evaluates LLM tool call accuracy (LLM)
  • noise-sensitivity: Evaluates noise sensitivity (LLM)
  • content-similarity: Measures content similarity (Code)
  • textual-difference: Measures textual differences (Code)
  • code-tool-call-accuracy: Evaluates code tool calls (Code)

Context Quality Scorers (2):
  • context-precision: Measures context precision (LLM)
  • context-relevance: Evaluates context relevance (LLM)

Total: 16 scorers available
```

### Version Command

Display the CLI version.

```bash { .api }
/**
 * Display CLI version
 * @command mastra --version
 * @alias mastra -v
 * @exits 0 always
 */
mastra --version
mastra -v
```

**Usage Examples:**

```bash { .api }
# Show version
mastra --version
mastra -v
```

**Exit Codes:**

```typescript { .api }
0   // Always successful
```

**Output Format:**

```typescript { .api }
// Console output:
1.0.1

// Version format: semver (major.minor.patch)
```

### Help Command

Display help information for commands.

```bash { .api }
/**
 * Display help information
 * @command mastra --help
 * @alias mastra -h
 * @exits 0 always
 */
mastra --help
mastra -h

# Get help for specific command
mastra create --help
mastra dev --help
mastra build --help
mastra start --help
mastra studio --help
mastra lint --help
mastra migrate --help
mastra scorers --help
mastra scorers add --help
mastra scorers list --help
```

**Usage Examples:**

```bash { .api }
# Show general help
mastra --help
mastra -h

# Show help for specific command
mastra create --help
mastra dev --help
mastra build --help
mastra scorers add --help
```

**Exit Codes:**

```typescript { .api }
0   // Always successful
```

**Output Format:**

```typescript { .api }
// General help output:
Usage: mastra [options] [command]

Mastra CLI - Build AI-powered applications

Options:
  -V, --version   output the version number
  -h, --help      display help for command

Commands:
  create [options] [project-name]  Create a new Mastra project
  init [options]                   Initialize Mastra in existing project
  dev [options]                    Start development server
  build [options]                  Build for production
  start [options]                  Start production server
  studio [options]                 Start Mastra Studio
  lint [options]                   Lint project configuration
  migrate [options]                Run database migrations
  scorers <command>                Manage evaluation scorers
  help [command]                   Display help for command

// Command-specific help shows all options and usage examples
```

## Types

```typescript { .api }
type CommandOptions = {
  // Common options across commands
  dir?: string;        // Mastra directory path
  root?: string;       // Project root path
  tools?: string[];    // Tool directories
  env?: string;        // Custom env file
  debug?: boolean;     // Enable debug logs
};

type CreateOptions = {
  default?: boolean;           // Use defaults
  components?: Component[];    // Components: agents, workflows, tools, scorers
  llm?: LLMProvider;          // LLM: openai, anthropic, groq, google, cerebras, mistral
  llmApiKey?: string;         // API key
  example?: boolean;          // Include examples
  timeout?: number;           // Install timeout (ms)
  dir?: string;               // Source directory
  projectName?: string;       // Project name
  mcp?: Editor;               // MCP server: cursor, cursor-global, windsurf, vscode, antigravity
  template?: string | boolean; // Template name or URL
};

type InitOptions = {
  default?: boolean;       // Use defaults
  dir?: string;           // Mastra directory
  components?: Component[]; // Components to include
  llm?: LLMProvider;      // LLM provider
  llmApiKey?: string;     // API key
  example?: boolean;      // Include examples
  mcp?: Editor;           // MCP server
};

type DevOptions = {
  dir?: string;              // Mastra directory
  root?: string;             // Project root
  tools?: string[];          // Tool directories
  env?: string;              // Custom env file
  inspect?: string | boolean; // Inspector mode ([host:]port or true)
  inspectBrk?: string | boolean; // Inspector break mode
  customArgs?: string[];     // Custom Node.js args
  https?: boolean;           // Enable HTTPS
  debug?: boolean;           // Debug logs
};

type BuildOptions = {
  dir?: string;     // Mastra directory
  root?: string;    // Project root
  tools?: string[]; // Tool directories
  studio?: boolean; // Bundle Studio UI
  debug?: boolean;  // Debug logs
};

type StartOptions = {
  dir?: string; // Output directory (default: .mastra/output)
  env?: string; // Custom env file
};

type StudioOptions = {
  port?: string | number;         // Studio port (default: 3000)
  env?: string;                   // Custom env file
  serverHost?: string;            // API host (default: localhost)
  serverPort?: string | number;   // API port (default: 4111)
  serverProtocol?: string;        // API protocol (default: http, valid: http|https)
};

type LintOptions = {
  dir?: string;    // Mastra directory
  root?: string;   // Project root
  tools?: string[]; // Tool directories
};

type MigrateOptions = {
  dir?: string;    // Mastra directory
  root?: string;   // Project root
  env?: string;    // Custom env file
  debug?: boolean; // Debug logs
  yes?: boolean;   // Skip confirmation
};

type ScorerAddOptions = {
  dir?: string; // Mastra directory (auto-detect)
};

type Component = 'agents' | 'workflows' | 'tools' | 'scorers';
type LLMProvider = 'openai' | 'anthropic' | 'groq' | 'google' | 'cerebras' | 'mistral';
type Editor = 'cursor' | 'cursor-global' | 'windsurf' | 'vscode' | 'antigravity';
```
