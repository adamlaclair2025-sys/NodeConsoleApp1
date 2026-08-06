# Deployment Guide

## Prerequisites

- Node.js 18 or higher
- PostgreSQL 14 or higher
- npm or yarn
- Docker and Docker Compose (for containerized deployment)

## Database Setup

### Local Development

```bash
# Start PostgreSQL (using Docker)
docker run --name mental-health-db \
  -e POSTGRES_PASSWORD=postgres \
  -p 5432:5432 \
  -d postgres:15

# Or using Docker Compose
docker-compose up -d
```

Create `.env` file:
```env
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/mental_health_db"
```

### Create Database

```bash
# Connect to PostgreSQL
psql -U postgres -h localhost

# Inside psql
CREATE DATABASE mental_health_db;
\c mental_health_db
```

## Application Setup

### Install Dependencies

```bash
npm install
```

###  Generate Prisma Client

```bash
npm run db:generate
```

### Run Migrations

```bash
# Development
npm run db:migrate

# Production
npm run db:deploy
```

### Seed Database (Optional)

```bash
npm run db:seed
```

## Running Locally

```bash
# Development server (with hot reload)
npm run dev

# Server starts on http://localhost:3000
```

### Test Local Setup

```bash
# Register
curl -X POST http://localhost:3000/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{
	"email": "test@example.com",
	"password": "TestPassword123!",
	"confirmPassword": "TestPassword123!",
	"displayName": "Test User"
  }'

# Login
curl -X POST http://localhost:3000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{
	"email": "test@example.com",
	"password": "TestPassword123!"
  }'

# Get current user (with token)
curl -X GET http://localhost:3000/api/v1/users/me \
  -H "Authorization: Bearer <your-token>"
```

## Docker Deployment

### Build Docker Image

```dockerfile
# Dockerfile
FROM node:18-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci --only=production

COPY . .

RUN npm run build

EXPOSE 3000

CMD ["npm", "start"]
```

Build:
```bash
docker build -t mental-health-api:latest .
```

Run:
```bash
docker run -p 3000:3000 \
  -e DATABASE_URL="postgresql://..." \
  -e JWT_SECRET="your-secret" \
  mental-health-api:latest
```

### Docker Compose

```yaml
# docker-compose.yml
version: '3.8'

services:
  db:
	image: postgres:15
	environment:
	  POSTGRES_PASSWORD: postgres
	ports:
	  - "5432:5432"
	volumes:
	  - db_data:/var/lib/postgresql/data

  api:
	build: .
	ports:
	  - "3000:3000"
	environment:
	  DATABASE_URL: postgresql://postgres:postgres@db:5432/mental_health_db
	  JWT_SECRET: your-secret-key
	  NODE_ENV: development
	depends_on:
	  - db
	volumes:
	  - .:/app

volumes:
  db_data:
```

Start:
```bash
docker-compose up -d
```

## Building for Production

### Build TypeScript

```bash
npm run build
```

This creates `dist/` directory with compiled JavaScript.

### Production Environment Variables

Create `.env.production`:

```env
NODE_ENV=production
PORT=3000
DATABASE_URL="postgresql://user:password@prod-db.example.com:5432/mental_health_db"
JWT_SECRET="long-random-string-at-least-32-chars"
JWT_EXPIRES_IN="7d"
REFRESH_TOKEN_EXPIRES_IN="30d"
LOG_LEVEL="info"
CORS_ORIGIN="https://app.example.com,https://www.example.com"
```

### Database Migration

```bash
npm run db:deploy
```

### Start Server

```bash
npm start
```

## Kubernetes Deployment

### Docker Push

```bash
# Tag image
docker tag mental-health-api:latest your-registry/mental-health-api:1.0.0

# Push to registry
docker push your-registry/mental-health-api:1.0.0
```

### Kubernetes Manifests

```yaml
# deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: mental-health-api
spec:
  replicas: 3
  selector:
	matchLabels:
	  app: mental-health-api
  template:
	metadata:
	  labels:
		app: mental-health-api
	spec:
	  containers:
	  - name: api
		image: your-registry/mental-health-api:1.0.0
		ports:
		- containerPort: 3000
		env:
		- name: DATABASE_URL
		  valueFrom:
			secretKeyRef:
			  name: api-secrets
			  key: database-url
		- name: JWT_SECRET
		  valueFrom:
			secretKeyRef:
			  name: api-secrets
			  key: jwt-secret
		livenessProbe:
		  httpGet:
			path: /api/v1/health
			port: 3000
		  initialDelaySeconds: 30
		  periodSeconds: 10
		readinessProbe:
		  httpGet:
			path: /api/v1/health
			port: 3000
		  initialDelaySeconds: 5
		  periodSeconds: 5

---
apiVersion: v1
kind: Service
metadata:
  name: mental-health-api
spec:
  selector:
	app: mental-health-api
  ports:
  - protocol: TCP
	port: 80
	targetPort: 3000
  type: LoadBalancer
```

Deploy:
```bash
# Create secrets
kubectl create secret generic api-secrets \
  --from-literal=database-url="postgresql://..." \
  --from-literal=jwt-secret="your-secret"

# Deploy
kubectl apply -f deployment.yaml
```

## Monitoring & Logging

### Application Logs

```bash
# View logs locally
npm run dev 2>&1 | tee app.log

# In production, redirect to logging service
docker logs <container-id>
```

### Database Backup

```bash
# Backup
pg_dump -U postgres -h localhost mental_health_db > backup.sql

# Restore
psql -U postgres -h localhost < backup.sql
```

### Health Checks

The API exposes health check endpoints:

```bash
# Simple health check
curl http://localhost:3000/api/v1/health

# Status with auth info
curl http://localhost:3000/api/v1/status
```

## Troubleshooting

### Database Connection Issues

```bash
# Check PostgreSQL is running
docker ps | grep postgres

# Test connection
psql -U postgres -h localhost -d mental_health_db
```

### Migration Errors

```bash
# Check migration status
npm run db:studio  # Open Prisma Studio

# Reset database (DANGEROUS - only dev!)
npx prisma migrate reset
```

### Memory Issues

```bash
# Check Node memory usage
top -p $(pgrep -f "node")

# Set memory limit
NODE_OPTIONS="--max-old-space-size=2048" npm start
```

## Performance Tuning

### Database Query Optimization

```bash
# Enable query logging
LOG='DEBUG' npm start

# Analyze slow queries
psql -U postgres -c \
  "SELECT query, calls, mean_time FROM pg_stat_statements \
  WHERE mean_time > 100 \
  ORDER BY mean_time DESC;"
```

### Connection Pool Tuning

In `.env`:
```env
DATABASE_URL="postgresql://user:pass@host/db?schema=public&pool_min=2&pool_max=20"
```

### Node.js Optimization

```bash
# Enable clustering
NODE_CLUSTER=true npm start

# Use native modules
npm install node-gyp
```

## Rollback Procedures

### Revert Code

```bash
git revert HEAD
npm run build
docker build -t api:rollback .
docker run -p 3000:3000 api:rollback
```

### Revert Database

```bash
# Down one migration
npx prisma migrate resolve --rolled-back

# Or restore from backup
psql -U postgres < backup.sql
```

## Health Checks & Monitoring

###  Uptime Monitoring

```bash
# Ping endpoint every 5 minutes
* * * * * curl -f http://localhost:3000/api/v1/health || alert
```

### Error Tracking

Set up error tracking service:
```bash
# With Sentry
npm install @sentry/node

# Configure in index.ts
Sentry.init({ dsn: process.env.SENTRY_DSN });
```

### Performance Monitoring

```bash
# With New Relic
npm install newrelic

# Add to top of index.ts
require('newrelic');
```

## Scaling Strategies

### Horizontal Scaling

1. Deploy multiple instances behind load balancer
2. Use managed database with auto-scaling
3. Enable connection pooling
4. Use CDN for static assets

### Vertical Scaling

1. Increase node memory: `--max-old-space-size`
2. Increase database resources
3. Optimize database indexes
4. Cache frequently accessed data

## Security Checklist

- [ ] Change default passwords
- [ ] Set strong JWT_SECRET (32+ chars)
- [ ] Enable HTTPS/TLS
- [ ] Configure CORS properly
- [ ] Set up firewall rules
- [ ] Enable database encryption
- [ ] Set up VPN for internal services
- [ ] Enable audit logging
- [ ] Run security scanning
- [ ] Set up intrusion detection
- [ ] Regular backups verified
- [ ] Disaster recovery tested

## Support

For deployment issues, check:
1. `.env` configuration
2. Database connectivity
3. Disk space availability
4. Node version compatibility
5. Port availability
6. Log files for errors

Email support@example.com for assistance.
