# Error Handling Guide

Comprehensive guide to handling errors and troubleshooting common issues with Mastra CLI.

## Common Errors by Command

### Create Command Errors

#### Error: Directory Already Exists

```bash { .api }
# Error message:
Error: Directory 'my-app' already exists

# Solutions:
# 1. Choose different name
mastra create my-app-2

# 2. Remove existing directory
rm -rf my-app
mastra create my-app

# 3. Initialize in existing directory instead
cd my-app
mastra init
```

#### Error: Invalid Project Name

```bash { .api }
# Error message:
Error: Invalid project name 'my app'. Project names cannot contain spaces

# Solution: Use hyphens or underscores
mastra create my-app
mastra create my_app
```

#### Error: Invalid Component

```bash { .api }
# Error message:
Error: Invalid component: agent. Valid components: agents, workflows, tools, scorers

# Solution: Use plural form
mastra create my-app --components agents,workflows
```

#### Error: Package Installation Timeout

```bash { .api }
# Error message:
Error: Package installation timed out after 60000ms

# Solutions:
# 1. Increase timeout
mastra create my-app --timeout 120000

# 2. Check network connection
ping registry.npmjs.org

# 3. Try different package manager
npm cache clean --force
mastra create my-app
```

### Dev Command Errors

#### Error: Port Already in Use

```bash { .api }
# Error message:
Error: Port 4111 is already in use

# Solutions:
# 1. Use different port
PORT=8080 mastra dev

# 2. Kill process on port
lsof -ti:4111 | xargs kill -9

# 3. Find and stop the process
lsof -i :4111
# Then kill by PID
```

#### Error: No Mastra Configuration Found

```bash { .api }
# Error message:
Error: No mastra configuration found in src/mastra, src/, lib/mastra/, mastra/, or .

# Solutions:
# 1. Initialize Mastra
mastra init

# 2. Specify directory
mastra dev --dir path/to/mastra

# 3. Check if in correct directory
pwd
ls -la
```

#### Error: Build Failed

```bash { .api }
# Error message:
Error: Build failed: Cannot find module './missing-file'

# Solutions:
# 1. Check imports
mastra lint

# 2. Install missing dependencies
npm install

# 3. Enable debug mode
DEBUG=1 mastra dev --debug

# 4. Check file exists
ls src/mastra/missing-file.ts
```

### Build Command Errors

#### Error: TypeScript Compilation Failed

```bash { .api }
# Error message:
Error: Build failed: TypeScript compilation errors
src/mastra/agents/my-agent.ts:10:5 - error TS2322: Type 'string' is not assignable to type 'number'

# Solutions:
# 1. Run linter to see all errors
mastra lint

# 2. Fix TypeScript errors
# Check the file and line number from error message

# 3. Verify dependencies
npm install

# 4. Check TypeScript version
npx tsc --version
```

#### Error: Out of Memory

```bash { .api }
# Error message:
Error: JavaScript heap out of memory

# Solutions:
# 1. Increase Node.js memory
NODE_OPTIONS="--max-old-space-size=4096" mastra build

# 2. Close other applications
# 3. Build without Studio first
mastra build  # Then add --studio if needed
```

### Start Command Errors

#### Error: Build Not Found

```bash { .api }
# Error message:
Error: Build not found at .mastra/output

# Solution: Build first
mastra build --studio
mastra start
```

#### Error: Database Connection Failed

```bash { .api }
# Error message:
Error: Failed to connect to database: Connection refused

# Solutions:
# 1. Check DATABASE_URL
echo $DATABASE_URL

# 2. Verify database is running
psql $DATABASE_URL -c "SELECT 1"

# 3. Check network/firewall
telnet db-host 5432

# 4. Disable storage init if not needed
MASTRA_DISABLE_STORAGE_INIT=1 mastra start
```

### Migrate Command Errors

#### Error: DATABASE_URL Not Set

```bash { .api }
# Error message:
Error: DATABASE_URL environment variable is not set

# Solutions:
# 1. Set in environment
export DATABASE_URL=postgresql://user:pass@localhost:5432/mastra

# 2. Add to .env file
echo "DATABASE_URL=postgresql://..." >> .env

# 3. Use --env flag
mastra migrate --env .env.production
```

#### Error: Migration Failed

```bash { .api }
# Error message:
Error: Migration failed: syntax error at or near 'SELCT'

# Solutions:
# 1. Check migration SQL
# 2. Review migration files
# 3. Enable debug mode
mastra migrate --debug

# 4. Rollback if needed
# Restore database from backup
```

#### Error: Insufficient Permissions

```bash { .api }
# Error message:
Error: permission denied to create table

# Solutions:
# 1. Grant necessary permissions
GRANT ALL PRIVILEGES ON DATABASE mastra TO user;

# 2. Use admin user for migrations
DATABASE_URL=postgresql://admin:pass@host/db mastra migrate
```

### Studio Command Errors

#### Error: Cannot Connect to API Server

```bash { .api }
# Error message:
Error: Failed to connect to API server at http://localhost:4111

# Solutions:
# 1. Start dev or start server
mastra dev  # In another terminal

# 2. Check server is running
curl http://localhost:4111/health

# 3. Use correct server host/port
mastra studio --server-host localhost --server-port 4111
```

## Node.js Version Errors

### Error: Node.js Version Too Old

```bash { .api }
# Error message:
Error: Node.js version >=22.13.0 required. Current: v18.17.0

# Solutions:
# 1. Check current version
node --version

# 2. Install with nvm
nvm install 22
nvm use 22

# 3. Or download from nodejs.org
# https://nodejs.org/

# 4. Verify installation
node --version
```

## Environment Variable Errors

### Error: API Key Not Set

```bash { .api }
# Error message:
Error: OPENAI_API_KEY is not set

# Solutions:
# 1. Add to .env
echo "OPENAI_API_KEY=sk-..." >> .env

# 2. Export in shell
export OPENAI_API_KEY=sk-...

# 3. Check .env is loaded
cat .env | grep OPENAI_API_KEY
```

### Error: .env File Not Found

```bash { .api }
# Error message:
Error: Failed to load .env file: ENOENT: no such file or directory

# Solutions:
# 1. Create .env file
touch .env

# 2. Skip .env loading
MASTRA_SKIP_DOTENV=1 mastra dev

# 3. Use custom env file
mastra dev --env .env.development
```

## Permission Errors

### Error: EACCES Permission Denied

```bash { .api }
# Error message:
Error: EACCES: permission denied, open '/path/to/file'

# Solutions:
# 1. Check file permissions
ls -la /path/to/file

# 2. Fix permissions
chmod 644 /path/to/file

# 3. Check directory permissions
chmod 755 /path/to/directory

# 4. Use correct user
sudo chown -R $USER:$USER /path/to/directory
```

### Error: Cannot Bind to Privileged Port

```bash { .api }
# Error message:
Error: EACCES: permission denied, bind 0.0.0.0:80

# Solutions:
# 1. Use non-privileged port
PORT=8080 mastra dev

# 2. Use sudo (not recommended)
sudo PORT=80 mastra dev

# 3. Use reverse proxy (nginx/apache)
# Run Mastra on 4111, proxy from 80
```

## Network Errors

### Error: Network Timeout

```bash { .api }
# Error message:
Error: Failed to fetch template: ETIMEDOUT

# Solutions:
# 1. Check internet connection
ping registry.npmjs.org

# 2. Increase timeout
mastra create my-app --timeout 120000

# 3. Check proxy settings
echo $HTTP_PROXY
echo $HTTPS_PROXY

# 4. Try different network
```

### Error: Connection Refused

```bash { .api }
# Error message:
Error: connect ECONNREFUSED 127.0.0.1:4111

# Solutions:
# 1. Check server is running
ps aux | grep mastra

# 2. Check correct port
lsof -i :4111

# 3. Check HOST setting
HOST=0.0.0.0 mastra dev
```

## File System Errors

### Error: ENOSPC: No Space Left

```bash { .api }
# Error message:
Error: ENOSPC: no space left on device

# Solutions:
# 1. Check disk space
df -h

# 2. Clean up
npm cache clean --force
rm -rf node_modules/.cache

# 3. Clean build artifacts
rm -rf .mastra

# 4. Free up space
# Remove unnecessary files
```

### Error: EMFILE: Too Many Open Files

```bash { .api }
# Error message:
Error: EMFILE: too many open files

# Solutions:
# 1. Increase limit (macOS)
ulimit -n 4096

# 2. Increase limit (Linux)
sudo sysctl -w fs.file-max=100000

# 3. Close other applications

# 4. Restart and try again
```

## Error Recovery Patterns

### Pattern 1: Clean Build

```bash { .api }
# When things are broken, start fresh
rm -rf node_modules
rm -rf .mastra
npm install
mastra build
```

### Pattern 2: Reset to Known Good State

```bash { .api }
# Git reset
git status
git restore .
git clean -fd

# Reinstall
npm ci
```

### Pattern 3: Debug Mode Investigation

```bash { .api }
# Enable all debug output
DEBUG=1 MASTRA_DEBUG=1 mastra dev --debug

# Check logs
# Look for specific error messages
# Identify root cause
```

### Pattern 4: Incremental Testing

```bash { .api }
# Test each step
mastra lint            # 1. Check configuration
npm test              # 2. Run tests
mastra build          # 3. Try build
mastra start          # 4. Try start
```

## Troubleshooting Checklist

### When Command Fails

- [ ] Check error message carefully
- [ ] Enable debug mode
- [ ] Check Node.js version
- [ ] Verify environment variables
- [ ] Check file permissions
- [ ] Verify network connectivity
- [ ] Check disk space
- [ ] Review recent changes
- [ ] Try clean build
- [ ] Check logs

### Environment Issues

- [ ] `.env` file exists
- [ ] Required variables set
- [ ] Correct variable names
- [ ] No typos in values
- [ ] Proper formatting
- [ ] No trailing spaces

### Build Issues

- [ ] Dependencies installed
- [ ] TypeScript errors resolved
- [ ] Imports correct
- [ ] Files exist
- [ ] Sufficient disk space
- [ ] Sufficient memory

### Runtime Issues

- [ ] Build exists
- [ ] Database accessible
- [ ] API keys valid
- [ ] Port available
- [ ] Permissions correct
- [ ] Network accessible

## Getting More Help

### Enable Debug Logging

```bash { .api }
# Maximum verbosity
DEBUG=* MASTRA_DEBUG=1 mastra <command> --debug 2>&1 | tee debug.log
```

### Check System Info

```bash { .api }
# Node.js version
node --version

# npm version
npm --version

# Mastra version
mastra --version

# System info
uname -a

# Environment
env | grep MASTRA
env | grep NODE
```

### Create Minimal Reproduction

```bash { .api }
# Create minimal project that shows issue
mastra create test-reproduction --default

cd test-reproduction

# Reproduce error
mastra <failing-command>

# Share error output and steps
```

### Collect Diagnostic Info

```bash { .api }
#!/bin/bash
# collect-diagnostics.sh

echo "=== System Info ===" > diagnostics.txt
node --version >> diagnostics.txt
npm --version >> diagnostics.txt
mastra --version >> diagnostics.txt
uname -a >> diagnostics.txt

echo "\n=== Environment ===" >> diagnostics.txt
env | grep MASTRA >> diagnostics.txt
env | grep NODE >> diagnostics.txt

echo "\n=== Directory ===" >> diagnostics.txt
pwd >> diagnostics.txt
ls -la >> diagnostics.txt

echo "\n=== Package ===" >> diagnostics.txt
cat package.json >> diagnostics.txt

echo "\n=== Error ===" >> diagnostics.txt
# Run failing command with debug
DEBUG=* MASTRA_DEBUG=1 mastra <command> --debug 2>&1 >> diagnostics.txt

cat diagnostics.txt
```

## Next Steps

- **Edge Cases**: [Edge Cases Guide](./edge-cases.md)
- **Scenarios**: [Real-World Scenarios](./real-world-scenarios.md)
- **Guides**: [Development Workflow](../guides/development-workflow.md)
- **Reference**: [CLI Commands](../reference/cli-commands.md)
