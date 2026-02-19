# Edge Cases and Advanced Scenarios

Advanced usage patterns and edge cases for Mastra CLI.

## Edge Case 1: Scoped Package Names

### Creating Projects with Scoped Names

```bash { .api }
# Valid scoped names
mastra create @myorg/ai-agent
mastra create @company/mastra-app

# Project structure
@myorg-ai-agent/              # Directory name (@ replaced with -)
├── package.json
│   {
│     "name": "@myorg/ai-agent",
│     ...
│   }
└── src/
    └── mastra/
```

### Programmatic Creation

```typescript { .api }
import { create } from "mastra/dist/commands/create/create";

await create({
  projectName: "@myorg/ai-agent",
  components: ["agents"],
  llmProvider: "openai"
});
```

## Edge Case 2: Very Long Project Names

### Maximum Length Handling

```bash { .api }
# npm allows up to 214 characters
# Mastra enforces same limit

# This will fail (if > 214 chars)
mastra create very-long-name-that-exceeds-the-maximum-allowed-length-...

# Error message:
# Error: Project name must be 214 characters or less

# Solution: Use shorter name
mastra create my-app
```

## Edge Case 3: Special Characters in Paths

### Windows Path Handling

```bash { .api }
# Windows absolute paths
mastra create C:\Users\username\projects\my-app

# Windows with spaces (must quote)
mastra create "C:\Users\John Doe\projects\my-app"

# Forward slashes work too
mastra create C:/Users/username/projects/my-app
```

### Unix Path Handling

```bash { .api }
# Absolute paths
mastra create /home/user/projects/my-app

# Relative paths with special chars
mastra create ./my-app
mastra create ../other-projects/my-app

# Paths with spaces (must quote)
mastra create "my app"  # This will fail - no spaces allowed in names
mastra create --dir "my dir/"  # Directory can have spaces
```

## Edge Case 4: Concurrent Project Creation

### Multiple Processes

```typescript { .api }
// Creating multiple projects simultaneously
import { create } from "mastra/dist/commands/create/create";

// Disable telemetry to avoid race conditions
process.env.MASTRA_TELEMETRY_DISABLED = "1";

// Create projects in parallel
await Promise.all([
  create({
    projectName: "project-1",
    components: ["agents"],
    llmProvider: "openai",
    analytics: null
  }),
  create({
    projectName: "project-2",
    components: ["workflows"],
    llmProvider: "anthropic",
    analytics: null
  }),
  create({
    projectName: "project-3",
    components: ["tools"],
    llmProvider: "groq",
    analytics: null
  })
]);
```

### Port Conflicts

```bash { .api }
# Run multiple dev servers
# Terminal 1
cd project-1
PORT=4111 mastra dev

# Terminal 2
cd project-2
PORT=4112 mastra dev

# Terminal 3
cd project-3
PORT=4113 mastra dev
```

## Edge Case 5: Extremely Large Projects

### Performance Considerations

```bash { .api }
# Large project with many components
mastra create large-app --components agents,workflows,tools,scorers

# Many files in tools directory
mastra dev --tools src/tools/*.ts  # May be slow

# Solution: Specify only needed tools
mastra dev --tools src/tools/essential-tool.ts,src/tools/core-tool.ts
```

### Build Optimization

```bash { .api }
# Increase Node.js memory for large builds
NODE_OPTIONS="--max-old-space-size=8192" mastra build

# Build without Studio to save time/space
mastra build  # ~1-2MB

# Add Studio only when needed
mastra build --studio  # ~6-12MB
```

## Edge Case 6: Network-Isolated Environments

### Offline Installation

```bash { .api }
# Pre-download dependencies
npm pack mastra
# Creates: mastra-1.0.1.tgz

# Transfer to offline machine
scp mastra-1.0.1.tgz offline-machine:~/

# On offline machine
npm install -g mastra-1.0.1.tgz

# Use with --no-install to skip dependency installation
# (Not supported - dependencies required)
```

### Proxy Configuration

```bash { .api }
# Configure npm proxy
npm config set proxy http://proxy.company.com:8080
npm config set https-proxy http://proxy.company.com:8080

# Or use environment variables
export HTTP_PROXY=http://proxy.company.com:8080
export HTTPS_PROXY=http://proxy.company.com:8080

# Then use Mastra normally
mastra create my-app
```

## Edge Case 7: Symlinked Directories

### Working with Symlinks

```bash { .api }
# Create symlink
ln -s /actual/path/to/mastra /link/to/mastra

# Mastra follows symlinks
cd /link/to/mastra
mastra dev  # Works correctly

# Auto-detection considers real path
# Root detection follows symlinks
```

### Monorepo with Symlinks

```bash { .api }
# Workspace with linked packages
monorepo/
├── packages/
│   ├── shared -> /actual/shared/  # Symlink
│   └── api/
│       └── node_modules/
│           └── shared -> ../../shared/  # Package link

# Mastra handles package links correctly
cd packages/api
mastra dev --tools ../shared/tools
```

## Edge Case 8: Read-Only File Systems

### Handling Read-Only Directories

```bash { .api }
# Build cache in read-only location fails
# Error: EROFS: read-only file system

# Solution 1: Use writable directory
mastra dev --dir /writable/path/mastra

# Solution 2: Override cache location (if supported)
# Not directly supported - need writable workspace
```

### Container Considerations

```dockerfile { .api }
FROM node:22.13.0-alpine

# Create writable cache directory
RUN mkdir -p /tmp/mastra-cache && \
    chmod 777 /tmp/mastra-cache

# Use writable workspace
WORKDIR /app

# Root filesystem can be read-only
# But /app and /tmp must be writable
```

## Edge Case 9: Unicode and International Characters

### Project Names

```bash { .api }
# Unicode in project names
# npm supports unicode, but not recommended

# Recommended: ASCII only
mastra create my-app

# Avoid: Unicode characters
# mastra create 我的应用  # May cause issues

# Avoid: Emoji
# mastra create my-app-🚀  # May cause issues
```

### File Paths

```bash { .api }
# Unicode in file paths generally works
cd /home/用户/projects
mastra create my-app

# But avoid for compatibility
cd /home/user/projects
mastra create my-app
```

## Edge Case 10: High Concurrency

### Many Simultaneous Dev Servers

```bash { .api }
# Spin up multiple servers
for i in {1..10}; do
  cd project-$i
  PORT=$((4111 + i)) mastra dev &
done

# Monitor all
jobs

# Stop all
jobs -p | xargs kill
```

### Load Balancing

```nginx { .api }
# Nginx upstream configuration
upstream mastra_backend {
    least_conn;
    server localhost:4111;
    server localhost:4112;
    server localhost:4113;
    server localhost:4114;
}

server {
    listen 80;
    
    location / {
        proxy_pass http://mastra_backend;
    }
}
```

## Edge Case 11: Extremely Long Build Times

### Timeout Configuration

```bash { .api }
# Very long package installation
mastra create my-app --timeout 300000  # 5 minutes

# For slow connections
mastra create my-app --timeout 600000  # 10 minutes
```

### Build Caching

```bash { .api }
# First build (slow)
time mastra build
# real    0m30.000s

# Subsequent builds (faster - uses cache)
time mastra build
# real    0m10.000s

# Clear cache if needed
rm -rf .mastra/cache
```

## Edge Case 12: Custom Node.js Flags

### Memory Management

```bash { .api }
# Increase heap size
NODE_OPTIONS="--max-old-space-size=8192" mastra dev

# Enable heap profiling
NODE_OPTIONS="--heap-prof" mastra build

# Multiple flags
NODE_OPTIONS="--max-old-space-size=4096 --trace-warnings" mastra dev
```

### Experimental Features

```bash { .api }
# Use experimental TypeScript transform
NODE_OPTIONS="--experimental-transform-types" mastra dev

# Custom flags via dev command
mastra dev --custom-args --experimental-transform-types,--no-warnings
```

## Edge Case 13: Corrupted State Recovery

### Clean State Recovery

```bash { .api }
# When project is in bad state
# 1. Stop all processes
pkill -f mastra

# 2. Remove build artifacts
rm -rf .mastra

# 3. Remove node_modules
rm -rf node_modules

# 4. Clean npm cache
npm cache clean --force

# 5. Reinstall
npm install

# 6. Rebuild
mastra build
```

### Corrupted Package Lock

```bash { .api }
# If package-lock.json is corrupted
rm package-lock.json
npm install

# Or use npm ci for clean install
rm -rf node_modules package-lock.json
npm ci
```

## Edge Case 14: Cross-Platform Development

### Path Separators

```typescript { .api }
import { join } from 'path';

// Always use path.join for cross-platform compatibility
const mastraPath = join(process.cwd(), 'src', 'mastra');

// Don't hardcode separators
// Bad: const path = 'src/mastra';  # Fails on Windows
// Good: const path = join('src', 'mastra');
```

### Line Endings

```bash { .api }
# Configure Git for cross-platform
git config --global core.autocrlf input  # macOS/Linux
git config --global core.autocrlf true   # Windows

# .gitattributes
* text=auto
*.ts text eol=lf
*.js text eol=lf
*.sh text eol=lf
```

## Edge Case 15: Memory Leaks in Long-Running Dev

### Monitoring Memory

```bash { .api }
# Monitor dev server memory
while true; do
  ps aux | grep "mastra dev" | grep -v grep
  sleep 60
done

# If memory grows continuously, restart periodically
```

### Automatic Restart

```bash { .api }
# Using PM2 for automatic restart
pm2 start "mastra dev" \
  --name mastra-dev \
  --max-memory-restart 500M

# Or use nodemon
nodemon --exec "mastra dev" \
  --watch src \
  --ext ts \
  --delay 2
```

## Edge Case 16: Database Migration Conflicts

### Concurrent Migrations

```bash { .api }
# Avoid running migrations concurrently
# Use locks or serialization

# Example: File-based lock
LOCK_FILE=/tmp/mastra-migrate.lock

if [ -e "$LOCK_FILE" ]; then
  echo "Migration already running"
  exit 1
fi

touch "$LOCK_FILE"
mastra migrate --yes
rm "$LOCK_FILE"
```

### Failed Migration Recovery

```bash { .api }
# If migration partially applied
# 1. Check migration state
psql $DATABASE_URL -c "SELECT * FROM migrations"

# 2. Restore from backup
pg_restore -d mastra backup.dump

# 3. Re-run migrations
mastra migrate --yes
```

## Edge Case 17: Template with Private Repository

### Private GitHub Template

```bash { .api }
# Use with authentication
mastra create my-app \
  --template https://username:token@github.com/private/template

# Or use SSH
mastra create my-app \
  --template git@github.com:private/template.git

# Ensure SSH key is configured
ssh -T git@github.com
```

## Edge Case 18: Partial Component Installation

### Adding Components Later

```bash { .api }
# Initial creation with minimal components
mastra create my-app --components agents

# Later, add more components manually
cd my-app/src/mastra
mkdir workflows tools scorers

# Or reinitialize (be careful - may overwrite)
mastra init --components workflows,tools
```

## Edge Case 19: Custom Registry

### Using Private npm Registry

```bash { .api }
# Configure registry
npm config set registry https://registry.company.com

# Or use .npmrc
echo "registry=https://registry.company.com" > .npmrc

# Install Mastra from private registry
npm install -g mastra

# Revert to public registry
npm config set registry https://registry.npmjs.org
```

## Edge Case 20: Emergency Shutdown

### Graceful Shutdown

```bash { .api }
# Send SIGTERM (graceful)
kill $(pgrep -f "mastra dev")

# Or use SIGINT (Ctrl+C equivalent)
kill -INT $(pgrep -f "mastra dev")

# Force kill if unresponsive
kill -9 $(pgrep -f "mastra dev")
```

### Cleanup on Exit

```typescript { .api }
// Ensure cleanup on process exit
process.on('SIGTERM', async () => {
  console.log('SIGTERM received, cleaning up...');
  
  // Close database connections
  await db.close();
  
  // Shutdown analytics
  await analytics?.shutdown();
  
  // Exit cleanly
  process.exit(0);
});

process.on('SIGINT', async () => {
  console.log('SIGINT received, cleaning up...');
  // Same cleanup
  process.exit(0);
});
```

## Next Steps

- **Error Handling**: [Error Handling Guide](./error-handling.md)
- **Scenarios**: [Real-World Scenarios](./real-world-scenarios.md)
- **Guides**: [Quick Start](../guides/quick-start.md)
- **Reference**: [CLI Commands](../reference/cli-commands.md)
