# Production Deployment Guide

Deploy your Mastra application to production environments.

## Pre-Deployment Checklist

- [ ] All tests passing
- [ ] Linting errors resolved
- [ ] Database migrations applied
- [ ] Environment variables configured
- [ ] API keys secured
- [ ] Telemetry configured
- [ ] Error handling tested

## Build for Production

### Basic Build

```bash { .api }
mastra build
```

**Output:**
- Location: `.mastra/output/`
- Size: ~1-2MB
- Contents: Bundled server, dependencies, source maps

### Build with Studio UI

```bash { .api }
mastra build --studio
```

**Output:**
- Size: ~6-12MB
- Includes: Web UI for managing agents/workflows

### Debug Build Issues

```bash { .api }
DEBUG=1 MASTRA_DEBUG=1 mastra build --debug
```

## Environment Configuration

### Production Environment Variables

```bash { .api }
# .env.production
NODE_ENV=production
PORT=4111
HOST=0.0.0.0

# Database
DATABASE_URL=postgresql://user:pass@prod-host:5432/mastra

# LLM API Keys
OPENAI_API_KEY=sk-prod-...
ANTHROPIC_API_KEY=sk-ant-prod-...

# Disable telemetry (recommended for production)
MASTRA_TELEMETRY_DISABLED=1

# Skip .env loading (use system env vars)
MASTRA_SKIP_DOTENV=1

# Disable auto storage init
MASTRA_DISABLE_STORAGE_INIT=1
```

### Load Production Config

```bash { .api }
mastra start --env .env.production
```

## Deployment Platforms

### Docker

#### Dockerfile

```dockerfile { .api }
FROM node:22.13.0-alpine

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install production dependencies only
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

# Health check
HEALTHCHECK --interval=30s --timeout=3s \
  CMD node -e "require('http').get('http://localhost:4111/health', (r) => process.exit(r.statusCode === 200 ? 0 : 1))"

# Start server
CMD ["npx", "mastra", "start", "-d", ".mastra/output"]
```

#### Docker Compose

```yaml { .api }
version: '3.8'

services:
  mastra:
    build: .
    ports:
      - "4111:4111"
    environment:
      - NODE_ENV=production
      - DATABASE_URL=postgresql://postgres:password@db:5432/mastra
      - OPENAI_API_KEY=${OPENAI_API_KEY}
      - MASTRA_TELEMETRY_DISABLED=1
    depends_on:
      - db
    restart: unless-stopped

  db:
    image: postgres:15-alpine
    environment:
      - POSTGRES_DB=mastra
      - POSTGRES_PASSWORD=password
    volumes:
      - postgres_data:/var/lib/postgresql/data
    restart: unless-stopped

volumes:
  postgres_data:
```

#### Build and Run

```bash { .api }
# Build image
docker build -t mastra-app .

# Run container
docker run -d \
  -p 4111:4111 \
  -e DATABASE_URL=postgresql://... \
  -e OPENAI_API_KEY=sk-... \
  --name mastra-app \
  mastra-app

# View logs
docker logs -f mastra-app

# Run with compose
docker-compose up -d
```

### Kubernetes

#### Deployment

```yaml { .api }
apiVersion: apps/v1
kind: Deployment
metadata:
  name: mastra-app
spec:
  replicas: 3
  selector:
    matchLabels:
      app: mastra-app
  template:
    metadata:
      labels:
        app: mastra-app
    spec:
      containers:
      - name: mastra
        image: your-registry/mastra-app:latest
        ports:
        - containerPort: 4111
        env:
        - name: NODE_ENV
          value: "production"
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
              key: openai-api-key
        - name: MASTRA_TELEMETRY_DISABLED
          value: "1"
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
    app: mastra-app
  ports:
  - port: 80
    targetPort: 4111
  type: LoadBalancer
```

### Traditional VM/VPS

#### Setup Script

```bash { .api }
#!/bin/bash
# deploy.sh

# Install Node.js 22
curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -
sudo apt-get install -y nodejs

# Clone repository
git clone https://github.com/your-org/mastra-app.git
cd mastra-app

# Install dependencies
npm ci --only=production

# Run migrations
export MASTRA_TELEMETRY_DISABLED=1
export DATABASE_URL=postgresql://...
npx mastra migrate --yes

# Build application
npx mastra build --studio

# Create systemd service
sudo tee /etc/systemd/system/mastra.service > /dev/null <<EOF
[Unit]
Description=Mastra Application
After=network.target

[Service]
Type=simple
User=mastra
WorkingDirectory=/home/mastra/mastra-app
Environment="NODE_ENV=production"
Environment="PORT=4111"
Environment="HOST=0.0.0.0"
Environment="DATABASE_URL=postgresql://..."
Environment="OPENAI_API_KEY=sk-..."
Environment="MASTRA_TELEMETRY_DISABLED=1"
ExecStart=/usr/bin/npx mastra start -d .mastra/output
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
EOF

# Start service
sudo systemctl daemon-reload
sudo systemctl enable mastra
sudo systemctl start mastra
```

#### Nginx Reverse Proxy

```nginx { .api }
# /etc/nginx/sites-available/mastra
server {
    listen 80;
    server_name your-domain.com;

    location / {
        proxy_pass http://localhost:4111;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # Studio UI (if built with --studio)
    location /studio {
        proxy_pass http://localhost:4111/studio;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

## CI/CD Integration

### GitHub Actions

```yaml { .api }
name: Deploy to Production

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
      
      - name: Run tests
        run: npm test
      
      - name: Run migrations
        run: npx mastra migrate --yes --debug
        env:
          DATABASE_URL: ${{ secrets.PROD_DATABASE_URL }}
      
      - name: Build
        run: npx mastra build --studio --debug
      
      - name: Deploy to server
        run: |
          # Deploy .mastra/output/ to production server
          rsync -avz --delete .mastra/output/ \
            user@prod-server:/opt/mastra/
          
          # Restart service
          ssh user@prod-server "sudo systemctl restart mastra"
        env:
          SSH_KEY: ${{ secrets.SSH_PRIVATE_KEY }}
```

### GitLab CI

```yaml { .api }
# .gitlab-ci.yml
stages:
  - test
  - build
  - deploy

variables:
  MASTRA_TELEMETRY_DISABLED: "1"
  NODE_ENV: "production"

test:
  stage: test
  image: node:22.13.0-alpine
  script:
    - npm ci
    - npx mastra lint
    - npm test

build:
  stage: build
  image: node:22.13.0-alpine
  script:
    - npm ci
    - npx mastra build --studio --debug
  artifacts:
    paths:
      - .mastra/output/
    expire_in: 1 hour

deploy:
  stage: deploy
  image: alpine:latest
  before_script:
    - apk add --no-cache rsync openssh-client
  script:
    - rsync -avz --delete .mastra/output/ user@prod-server:/opt/mastra/
    - ssh user@prod-server "sudo systemctl restart mastra"
  only:
    - main
```

## Database Migrations

### Pre-Deployment

```bash { .api }
# Check pending migrations
mastra migrate

# Apply with confirmation
mastra migrate --yes

# With custom env
mastra migrate --env .env.production --yes
```

### Zero-Downtime Migration Strategy

1. **Deploy new code** (migrations not run yet)
2. **Run migrations** (old code still compatible)
3. **Switch traffic** to new deployment
4. **Verify** everything works
5. **Rollback** if needed

```bash { .api }
# Step 1: Deploy code
rsync -avz .mastra/output/ server:/opt/mastra-new/

# Step 2: Run migrations
ssh server "cd /opt/mastra-new && \
  DATABASE_URL=... npx mastra migrate --yes"

# Step 3: Switch traffic (update symlink)
ssh server "ln -sfn /opt/mastra-new /opt/mastra-current && \
  sudo systemctl restart mastra"

# Step 4: Verify
curl https://your-domain.com/health

# Step 5: Rollback if needed
ssh server "ln -sfn /opt/mastra-old /opt/mastra-current && \
  sudo systemctl restart mastra"
```

## Monitoring and Logging

### Health Check Endpoint

```typescript { .api }
// Add health check to your Mastra config
export const mastra = new Mastra({
  // ... config
  healthCheck: {
    enabled: true,
    path: '/health'
  }
});
```

### Logging

```bash { .api }
# View logs (systemd)
sudo journalctl -u mastra -f

# View logs (Docker)
docker logs -f mastra-app

# View logs (PM2)
pm2 logs mastra
```

### Monitoring Tools

```bash { .api }
# Install PM2 for process management
npm install -g pm2

# Start with PM2
pm2 start "npx mastra start" --name mastra-app

# Monitor
pm2 monit

# Setup startup script
pm2 startup
pm2 save
```

## Security Best Practices

### 1. Environment Variables

```bash { .api }
# Never commit secrets
# Use secret management tools

# AWS Secrets Manager
aws secretsmanager get-secret-value --secret-id mastra/prod

# HashiCorp Vault
vault kv get secret/mastra/prod
```

### 2. Network Security

- Use HTTPS in production
- Configure firewall rules
- Restrict database access
- Use VPC/private networks

### 3. API Key Rotation

```bash { .api }
# 1. Generate new key
# 2. Update environment variable
# 3. Restart service
# 4. Revoke old key after verification
```

## Performance Optimization

### 1. Enable Caching

```nginx { .api }
# Nginx caching
proxy_cache_path /var/cache/nginx levels=1:2 keys_zone=mastra_cache:10m;

location / {
    proxy_cache mastra_cache;
    proxy_cache_valid 200 60m;
}
```

### 2. Use CDN

- Serve Studio UI assets via CDN
- Cache API responses when appropriate
- Use edge locations

### 3. Scale Horizontally

```bash { .api }
# Run multiple instances
pm2 start "npx mastra start" -i max

# Load balancer
# Use Nginx, HAProxy, or cloud load balancer
```

## Rollback Strategy

### Quick Rollback

```bash { .api }
# Switch to previous version
ln -sfn /opt/mastra-previous /opt/mastra-current
sudo systemctl restart mastra

# Or with Git
git checkout previous-tag
npm ci
mastra build --studio
sudo systemctl restart mastra
```

### Database Rollback

```bash { .api }
# Restore from backup
pg_restore -d mastra < backup.dump

# Or use migration tool to rollback
mastra migrate --rollback
```

## Post-Deployment

### Verification Checklist

- [ ] Health endpoint responding
- [ ] All agents accessible
- [ ] Workflows executing
- [ ] Database connections working
- [ ] API keys valid
- [ ] Logs showing no errors
- [ ] Studio UI accessible (if deployed)
- [ ] Performance acceptable

### Monitoring

```bash { .api }
# Check health
curl https://your-domain.com/health

# Test agent
curl https://your-domain.com/api/agents/my-agent \
  -H "Content-Type: application/json" \
  -d '{"input": "test"}'

# Monitor logs
tail -f /var/log/mastra/app.log
```

## Troubleshooting

### Service Won't Start

```bash { .api }
# Check logs
sudo journalctl -u mastra -n 50

# Check port
sudo lsof -i :4111

# Test build locally
cd /opt/mastra
npx mastra start --env .env.production
```

### Database Connection Issues

```bash { .api }
# Test connection
psql $DATABASE_URL -c "SELECT 1"

# Check firewall
sudo ufw status

# Verify credentials
echo $DATABASE_URL
```

### High Memory Usage

```bash { .api }
# Monitor
top -p $(pgrep -f mastra)

# Adjust Node.js memory
NODE_OPTIONS="--max-old-space-size=512" npx mastra start
```

## Next Steps

- **Testing**: [Testing Strategies](./testing.md)
- **Monitoring**: Set up monitoring and alerting
- **Scaling**: Plan for horizontal scaling
- **Documentation**: Document your deployment process
