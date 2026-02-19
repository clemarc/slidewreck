# Configuration

Environment variables and configuration options for customizing Mastra CLI behavior.

## Capabilities

### Analytics and Telemetry

Control analytics tracking and telemetry behavior.

```bash { .api }
# Disable all telemetry tracking
MASTRA_TELEMETRY_DISABLED=1

# Set analytics origin (cloud vs open source)
MASTRA_ANALYTICS_ORIGIN=oss          # or 'mastra-cloud'
```

**Environment Variable Details:**

```typescript { .api }
// MASTRA_TELEMETRY_DISABLED
// Type: string (any value)
// Default: undefined (telemetry enabled)
// Effect: When set (any value), completely disables telemetry tracking
// Affects: All analytics events, PostHog tracking, usage metrics
// Checked at: CLI startup and analytics initialization

// MASTRA_ANALYTICS_ORIGIN
// Type: 'mastra-cloud' | 'oss'
// Default: 'oss'
// Effect: Sets the origin marker for analytics events
// Affects: Tracking data categorization in PostHog
// Used by: PosthogAnalytics class, telemetry tracking
```

**Usage:**

```bash { .api }
# Disable telemetry permanently (add to shell profile)
export MASTRA_TELEMETRY_DISABLED=1
mastra create my-app

# Disable for single command
MASTRA_TELEMETRY_DISABLED=1 mastra create my-app

# Set analytics origin
export MASTRA_ANALYTICS_ORIGIN=mastra-cloud
mastra dev

# Disable and set origin
MASTRA_TELEMETRY_DISABLED=1 MASTRA_ANALYTICS_ORIGIN=oss mastra build
```

**Telemetry Data Collected (when enabled):**

```typescript { .api }
// Data collected by telemetry:
interface TelemetryData {
  // Command information
  command: string;                    // Command name (e.g., 'create', 'dev')
  args: Record<string, unknown>;      // Command arguments (sanitized)
  durationMs: number;                 // Command execution time
  status: 'success' | 'error';        // Execution status
  error?: string;                     // Error message (if failed)
  
  // System information
  version: string;                    // CLI version
  origin: 'mastra-cloud' | 'oss';     // Analytics origin
  platform: string;                   // OS platform (darwin, linux, win32)
  node_version: string;               // Node.js version
  
  // Machine identification (anonymized)
  distinct_id: string;                // Machine ID or random UUID
  
  // Timestamps
  timestamp: string;                  // ISO 8601 timestamp
}

// Data NOT collected:
// - File contents or source code
// - API keys or secrets
// - Personal information
// - Project names or paths
// - Environment variables (except those explicitly tracked)
```

**Verification:**

```typescript { .api }
// Check if telemetry is enabled in code:
function isTelemetryEnabled(): boolean {
  return !process.env.MASTRA_TELEMETRY_DISABLED;
}

// Check analytics origin:
function getAnalyticsOrigin(): 'mastra-cloud' | 'oss' {
  return process.env.MASTRA_ANALYTICS_ORIGIN === 'mastra-cloud' 
    ? 'mastra-cloud' 
    : 'oss';
}
```

### Environment Loading

Control how the CLI loads environment variables.

```bash { .api }
# Skip loading .env files (use system environment only)
MASTRA_SKIP_DOTENV=1
```

**Environment Variable Details:**

```typescript { .api }
// MASTRA_SKIP_DOTENV
// Type: string (any value)
// Default: undefined (.env files loaded)
// Effect: When set, skips loading .env files
// Affects: All commands that load environment (dev, start, studio, migrate)
// Use case: CI/CD environments where env vars are set externally
```

**Environment Loading Order:**

```typescript { .api }
// Environment variable resolution (priority order):
// 1. Process environment (system variables, shell exports)
// 2. Command-line env vars (VAR=value command)
// 3. .env file (unless MASTRA_SKIP_DOTENV=1)
// 4. Custom env file (--env flag)
// 5. Defaults

// Example resolution:
// System: PORT=3000
// .env: PORT=4111
// --env: PORT=5000
// Result: PORT=3000 (system takes precedence)

// With MASTRA_SKIP_DOTENV=1:
// System: PORT=3000
// .env: PORT=4111 (skipped)
// --env: PORT=5000
// Result: PORT=3000 (system takes precedence)
```

**Usage:**

```bash { .api }
# Skip .env loading for dev server
MASTRA_SKIP_DOTENV=1 mastra dev

# Use only system environment
export DATABASE_URL=postgresql://...
MASTRA_SKIP_DOTENV=1 mastra migrate --yes

# Useful in Docker containers
ENV MASTRA_SKIP_DOTENV=1
CMD ["mastra", "start"]
```

**Custom Environment Files:**

```bash { .api }
# Load custom env file (in addition to .env unless skipped)
mastra dev --env .env.development
mastra start --env .env.production
mastra studio --env .env.local
mastra migrate --env .env.staging

# Multiple env files (loaded in order):
# 1. .env (unless MASTRA_SKIP_DOTENV=1)
# 2. Custom env file (--env)
# Later files override earlier ones
```

### Storage and Database

Configure storage initialization and migrations.

```bash { .api }
# Disable automatic storage initialization
MASTRA_DISABLE_STORAGE_INIT=1
```

**Environment Variable Details:**

```typescript { .api }
// MASTRA_DISABLE_STORAGE_INIT
// Type: string (any value)
// Default: undefined (storage initialized)
// Effect: When set, skips automatic storage initialization
// Affects: dev, start commands (database connection and setup)
// Use case: When storage is managed externally or not needed
```

**Storage Initialization Behavior:**

```typescript { .api }
// Default behavior (MASTRA_DISABLE_STORAGE_INIT not set):
// 1. Load storage configuration from Mastra config
// 2. Connect to database (from DATABASE_URL env var)
// 3. Check schema version
// 4. Run pending migrations automatically (dev mode)
// 5. Initialize tables if needed

// With MASTRA_DISABLE_STORAGE_INIT=1:
// 1. Skip all storage initialization
// 2. No database connection attempted
// 3. No migrations run
// 4. Storage-dependent features disabled

// Use cases for disabling:
// - Storage not configured yet
// - External database management
// - Stateless deployments
// - Testing without database
```

**Usage:**

```bash { .api }
# Start server without initializing storage
MASTRA_DISABLE_STORAGE_INIT=1 mastra dev

# Production start without auto-migrations
MASTRA_DISABLE_STORAGE_INIT=1 mastra start

# Testing without database
MASTRA_DISABLE_STORAGE_INIT=1 npm test
```

**Database Configuration:**

```bash { .api }
# Database connection string
DATABASE_URL=postgresql://user:password@host:port/database

# Supported formats:
# PostgreSQL:
DATABASE_URL=postgresql://user:pass@localhost:5432/mastra
DATABASE_URL=postgres://user:pass@localhost:5432/mastra

# MySQL:
DATABASE_URL=mysql://user:pass@localhost:3306/mastra

# SQLite:
DATABASE_URL=sqlite://./mastra.db
DATABASE_URL=sqlite://:memory:

# Connection parameters:
DATABASE_URL=postgresql://user:pass@host:5432/db?sslmode=require&pool_size=10
```

### Build Configuration

Customize build behavior.

```bash { .api }
# Custom path to Mastra Studio for builds
MASTRA_STUDIO_PATH=/path/to/studio
```

**Environment Variable Details:**

```typescript { .api }
// MASTRA_STUDIO_PATH
// Type: string (file path)
// Default: undefined (uses bundled studio)
// Effect: Specifies custom path to Mastra Studio build
// Affects: mastra build --studio command
// Use case: Custom Studio builds, development, testing
```

**Studio Build Customization:**

```typescript { .api }
// Default studio build path:
// node_modules/mastra/dist/studio/

// Custom studio path structure:
// <MASTRA_STUDIO_PATH>/
//   index.html
//   assets/
//     *.js
//     *.css
//     *.woff2
//   favicon.ico

// Build with custom studio:
// 1. Set MASTRA_STUDIO_PATH to custom build directory
// 2. Run mastra build --studio
// 3. Custom studio files copied to .mastra/output/studio/
```

**Usage:**

```bash { .api }
# Build with custom studio path
MASTRA_STUDIO_PATH=./custom-studio mastra build --studio

# Build with local studio development
export MASTRA_STUDIO_PATH=../mastra-studio/dist
mastra build --studio

# Verify custom studio
ls -la $MASTRA_STUDIO_PATH
mastra build --studio --debug
```

### Runtime Configuration

Environment variables that affect runtime behavior of dev and start commands.

```bash { .api }
# Override development server port (default: 4111)
PORT=3000

# Override development server host (default: localhost)
HOST=0.0.0.0

# Enable debug logging for CLI operations
DEBUG=1
MASTRA_DEBUG=1

# Custom templates API URL
MASTRA_TEMPLATES_API_URL=https://custom.templates.api
```

**Environment Variable Details:**

```typescript { .api }
// PORT
// Type: number (string representation)
// Default: 4111
// Effect: Sets the HTTP server port
// Affects: mastra dev, mastra start
// Valid range: 1024-65535 (privileged ports require root)

// HOST
// Type: string (IP address or hostname)
// Default: localhost
// Effect: Sets the HTTP server host binding
// Affects: mastra dev, mastra start
// Common values: 'localhost', '0.0.0.0', '127.0.0.1', specific IP

// DEBUG
// Type: string (any value)
// Default: undefined
// Effect: Enables debug logging for CLI
// Affects: All commands
// Output: Detailed execution logs, timing, decisions

// MASTRA_DEBUG
// Type: string (any value)
// Default: undefined
// Effect: Enables Mastra-specific debug logging
// Affects: All commands
// Output: Internal Mastra operations, bundler details

// MASTRA_TEMPLATES_API_URL
// Type: string (URL)
// Default: https://api.mastra.ai/templates (or similar)
// Effect: Custom templates API endpoint
// Affects: mastra create --template
// Use case: Enterprise templates, private registries
```

**Port and Host Configuration:**

```typescript { .api }
// Server binding behavior:
// HOST=localhost  → Only accessible from local machine
// HOST=0.0.0.0    → Accessible from any network interface
// HOST=127.0.0.1  → Equivalent to localhost
// HOST=192.168.1.100 → Bind to specific IP

// Common scenarios:
// Local development:
PORT=4111 HOST=localhost mastra dev

// Docker container:
PORT=4111 HOST=0.0.0.0 mastra start

// Custom port to avoid conflicts:
PORT=8080 HOST=localhost mastra dev

// Public access (be careful with security):
PORT=80 HOST=0.0.0.0 mastra start
```

**Debug Logging:**

```typescript { .api }
// Debug output levels:
// DEBUG=1        → General CLI debug info
// MASTRA_DEBUG=1 → Mastra internals debug info
// Both           → Full debug output

// Debug log examples:
// [DEBUG] Loading Mastra configuration from src/mastra
// [DEBUG] Package manager detected: pnpm
// [DEBUG] Building with esbuild...
// [DEBUG] Bundle size: 1.2MB
// [DEBUG] Server listening on http://localhost:4111
```

**Usage Examples:**

```bash { .api }
# Run dev server on custom port and host
PORT=8080 HOST=0.0.0.0 mastra dev

# Start production on port 80 (requires root)
sudo PORT=80 HOST=0.0.0.0 mastra start

# Enable debug logging
DEBUG=1 mastra build

# Enable all debug output
DEBUG=1 MASTRA_DEBUG=1 mastra dev

# Use custom templates API
MASTRA_TEMPLATES_API_URL=https://templates.example.com mastra create --template

# Combine multiple settings
PORT=3000 HOST=0.0.0.0 DEBUG=1 mastra dev
```

## Configuration Files

### Package Manager Lock Files

The CLI automatically detects package managers based on lock files:

```typescript { .api }
// Lock file detection:
{
  'package-lock.json': 'npm',
  'pnpm-lock.yaml': 'pnpm',
  'yarn.lock': 'yarn',
  'bun.lockb': 'bun'
}

// Detection logic:
// 1. Search current directory for lock files
// 2. Match lock file to package manager
// 3. Use detected package manager for all operations
// 4. If multiple lock files, use priority order (npm > pnpm > yarn > bun)
// 5. If no lock file, prompt user to select
```

**Lock File Locations:**

```typescript { .api }
// Standard locations:
<project-root>/
  package-lock.json    // npm
  pnpm-lock.yaml       // pnpm
  yarn.lock            // yarn
  bun.lockb            // bun

// Monorepo considerations:
// - Lock file at workspace root
// - Individual packages don't have lock files
// - CLI detects root lock file
```

### Mastra Configuration Files

Created by the CLI in your project:

```typescript { .api }
// .mastra/ - Build output directory
// Structure:
.mastra/
  dev/              // Development build artifacts
    bundle.js       // Bundled dev server
    bundle.js.map   // Source map
  output/           // Production build artifacts (mastra build)
    index.js        // Bundled production server
    index.js.map    // Source map
    package.json    // Runtime dependencies
    node_modules/   // Production dependencies
    studio/         // Studio UI (if --studio)
  config.json       // Runtime configuration (optional)
  cache/            // Build cache (esbuild)

// .mastra/config.json format (optional):
{
  "dir": "src/mastra",
  "root": ".",
  "tools": ["src/tools"],
  "port": 4111,
  "host": "localhost"
}
```

**Configuration File Precedence:**

```typescript { .api }
// Configuration sources (priority order):
// 1. Command-line flags (--dir, --port, etc.)
// 2. Environment variables (PORT, HOST, etc.)
// 3. .mastra/config.json
// 4. Auto-detection (package.json location, src/mastra/)
// 5. Defaults

// Example:
// CLI: mastra dev --port 8080
// Env: PORT=3000
// Config: { "port": 4111 }
// Result: 8080 (CLI flag takes precedence)
```

### MCP Configuration

Model Context Protocol configuration for code editors:

```typescript { .api }
// MCP configuration locations:
{
  'cursor': '<project>/.cursor/config.json',
  'cursor-global': '~/.cursor/config.json',
  'windsurf': '~/.windsurf/config.json',
  'vscode': '~/.vscode/extensions/mcp-server/config.json',
  'antigravity': '<antigravity-specific-path>'
}
```

**MCP Configuration Format:**

```typescript { .api }
// MCP config structure (JSON):
{
  "mcpServers": {
    "mastra": {
      "command": "node",
      "args": [
        "<project-path>/node_modules/mastra/dist/mcp-server.js"
      ],
      "env": {
        "MASTRA_DIR": "<project-path>/src/mastra",
        "NODE_ENV": "development"
      }
    }
  }
}

// Multiple MCP servers:
{
  "mcpServers": {
    "mastra": { /* ... */ },
    "other-tool": { /* ... */ }
  }
}
```

**MCP Configuration Management:**

```typescript { .api }
// Configuration file handling:
// 1. Read existing config (if present)
// 2. Parse JSON
// 3. Merge new MCP server config
// 4. Preserve existing servers
// 5. Write updated config
// 6. Validate JSON structure

// Error handling:
// - Invalid JSON: Report error, don't modify
// - File not writable: Report error
// - Directory doesn't exist: Create it
// - Existing server: Overwrite with warning
```

## Node.js Requirements

```bash { .api }
# Required Node.js version
node >= 22.13.0
```

**Version Checking:**

```typescript { .api }
// Node.js version validation:
// 1. Read process.version (e.g., "v22.13.0")
// 2. Parse version string
// 3. Compare with minimum version (22.13.0)
// 4. If version < minimum, exit with error

// Error message:
/*
Error: Node.js version 22.13.0 or higher is required
Current version: 18.17.0
Please upgrade Node.js: https://nodejs.org/
*/

// Version check performed:
// - At CLI startup
// - Before running any command
// - Cannot be disabled
```

**Check your version:**

```bash { .api }
node --version
# Output: v22.13.0 or higher required

# Upgrade options:
# - nvm (Node Version Manager): nvm install 22 && nvm use 22
# - Official installer: https://nodejs.org/
# - Package manager: brew install node@22 (macOS)
```

**Version Requirements Rationale:**

```typescript { .api }
// Why Node.js 22.13.0+?
// - Native TypeScript support (--experimental-transform-types)
// - Improved performance (V8 updates)
// - Better ESM support
// - Required dependencies compatibility
// - Security updates
// - Modern JavaScript features

// Features used from Node.js 22+:
// - import.meta.resolve
// - Enhanced test runner
// - Watch mode improvements
// - Performance improvements
```

## Common Configuration Scenarios

### Development with HTTPS

```bash { .api }
# Start dev server with HTTPS
mastra dev --https

# HTTPS with custom port
PORT=8443 mastra dev --https

# HTTPS with debug logging
mastra dev --https --debug
```

**HTTPS Configuration:**

```typescript { .api }
// HTTPS server characteristics:
// - Self-signed certificate generated automatically
// - Certificate cached in .mastra/certs/
// - Browser security warning expected (accept to proceed)
// - Certificate valid for localhost only
// - Certificate regenerated if expired

// Certificate details:
// - Algorithm: RSA 2048-bit
// - Valid for: 365 days
// - Subject: CN=localhost
// - SANs: localhost, 127.0.0.1, ::1

// Files created:
.mastra/certs/
  cert.pem          // SSL certificate
  key.pem           // Private key
```

### Production Build with Studio

```bash { .api }
# Build with Mastra Studio UI
mastra build --studio

# Build with custom studio
MASTRA_STUDIO_PATH=./custom-studio mastra build --studio

# Build without studio (smaller output)
mastra build
```

**Build Configuration:**

```typescript { .api }
// Production build characteristics:
// Without --studio:
// - Output size: ~1-2MB
// - No UI included
// - API server only

// With --studio:
// - Output size: ~6-12MB
// - Full UI included
// - API + Studio server

// Studio access:
// - URL: http://<HOST>:<PORT>/studio
// - Default: http://localhost:4111/studio
```

### Custom Project Structure

```bash { .api }
# Create project with custom directory structure
mastra create my-app --dir src/mastra/

# Initialize with custom directory
mastra init --dir lib/

# Dev server with custom directories
mastra dev --dir src/mastra --root . --tools src/tools

# Build with custom structure
mastra build --dir lib/mastra --root . --tools lib/tools
```

**Custom Structure Examples:**

```typescript { .api }
// Example 1: Mastra in lib/
lib/
  mastra/
    index.ts
    agents/
    workflows/

// Example 2: Mastra in app/
app/
  mastra/
    index.ts
    agents/
    workflows/

// Example 3: Monorepo
packages/
  backend/
    src/
      mastra/
        index.ts
```

### Debug Mode

```bash { .api }
# Run commands with debug logging
DEBUG=1 mastra dev
MASTRA_DEBUG=1 mastra build
DEBUG=1 MASTRA_DEBUG=1 mastra dev --debug

# Debug specific operations
DEBUG=1 mastra create my-app
DEBUG=1 mastra migrate --yes
```

**Debug Output Examples:**

```typescript { .api }
// Debug output structure:
[DEBUG] [<timestamp>] <component>: <message>

// Example output:
[DEBUG] [2026-01-29T12:00:00.000Z] CLI: Starting create command
[DEBUG] [2026-01-29T12:00:00.100Z] PackageManager: Detected pnpm from pnpm-lock.yaml
[DEBUG] [2026-01-29T12:00:00.200Z] Template: Loading default template
[DEBUG] [2026-01-29T12:00:01.000Z] Bundler: Building with esbuild
[DEBUG] [2026-01-29T12:00:02.000Z] Bundler: Bundle size: 1.2MB
[DEBUG] [2026-01-29T12:00:02.100Z] Server: Listening on http://localhost:4111
```

### CI/CD Environment

```bash { .api }
# Disable telemetry and interactive prompts
export MASTRA_TELEMETRY_DISABLED=1
export CI=1

# Run migrations without confirmation
mastra migrate --yes

# Build with specific configuration
mastra build --dir src/mastra --root .

# Full CI/CD pipeline
export MASTRA_TELEMETRY_DISABLED=1
export CI=1
npm install
mastra lint
mastra migrate --yes
mastra build --studio
```

**CI/CD Configuration:**

```typescript { .api }
// Environment variables for CI/CD:
{
  CI: '1',                           // Disable interactive prompts
  MASTRA_TELEMETRY_DISABLED: '1',    // Disable telemetry
  NODE_ENV: 'production',            // Production mode
  DATABASE_URL: '<from-secrets>',    // Database connection
  PORT: '4111',                      // Server port
  HOST: '0.0.0.0'                    // Server host (container)
}

// CI/CD best practices:
// 1. Always disable telemetry
// 2. Use --yes flag for migrations
// 3. Set explicit --dir and --root
// 4. Use --debug for troubleshooting
// 5. Cache node_modules/
// 6. Cache .mastra/ for faster builds
```

**GitHub Actions Example:**

```yaml { .api }
# .github/workflows/deploy.yml
name: Deploy Mastra App

on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    
    env:
      MASTRA_TELEMETRY_DISABLED: 1
      CI: 1
      NODE_ENV: production
    
    steps:
      - uses: actions/checkout@v3
      
      - uses: actions/setup-node@v3
        with:
          node-version: '22.13.0'
          cache: 'npm'
      
      - name: Install dependencies
        run: npm ci
      
      - name: Lint
        run: npx mastra lint
      
      - name: Run migrations
        run: npx mastra migrate --yes
        env:
          DATABASE_URL: ${{ secrets.DATABASE_URL }}
      
      - name: Build
        run: npx mastra build --studio --debug
      
      - name: Deploy
        run: |
          # Deploy .mastra/output/ directory
          npm run deploy
        env:
          DEPLOY_TOKEN: ${{ secrets.DEPLOY_TOKEN }}
```

**Docker Configuration:**

```dockerfile { .api }
# Dockerfile
FROM node:22.13.0-alpine

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci --only=production

# Copy application code
COPY . .

# Build application
ENV MASTRA_TELEMETRY_DISABLED=1
RUN npx mastra build --studio

# Set runtime environment
ENV NODE_ENV=production
ENV PORT=4111
ENV HOST=0.0.0.0
ENV MASTRA_SKIP_DOTENV=1

# Expose port
EXPOSE 4111

# Start server
CMD ["npx", "mastra", "start", "-d", ".mastra/output"]
```

## Common Error Messages

```typescript { .api }
// Configuration-related errors:

// "Error: Node.js version >=22.13.0 required. Current: v18.17.0"
// Solution: Upgrade Node.js to 22.13.0 or higher

// "Error: Port 4111 is already in use"
// Solution: Kill process on port or use PORT=8080 mastra dev

// "Error: DATABASE_URL not set"
// Solution: Set DATABASE_URL in .env or environment

// "Error: Failed to load .env file: ENOENT"
// Solution: Create .env file or use MASTRA_SKIP_DOTENV=1

// "Error: Invalid MCP configuration: malformed JSON"
// Solution: Fix JSON syntax in MCP config file

// "Error: Cannot write to ~/.cursor/config.json: Permission denied"
// Solution: Check file permissions for MCP config directory

// "Error: Custom studio path does not exist: /path/to/studio"
// Solution: Verify MASTRA_STUDIO_PATH points to valid directory

// "Error: Failed to bind to 0.0.0.0:80: Permission denied"
// Solution: Use port >1024 or run with elevated permissions
```
